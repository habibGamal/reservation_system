<?php

namespace App\Services\Excel;

use App\Enums\MembershipType;
use App\Enums\ReservationStatus;
use App\Enums\ReservationType;
use App\Models\Guest;
use App\Models\Reservation;
use App\Models\Sector;
use App\Models\Unit;
use App\Services\AvailabilityService;
use App\Services\Excel\Contracts\ReservationSpreadsheetStrategyInterface;
use App\Services\Excel\DTOs\ImportedReservationRow;
use App\Services\Excel\Strategies\MilitaryBranchSpreadsheetStrategy;
use App\Services\Excel\Strategies\MilitaryExportSpreadsheetStrategy;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;

class ExcelReservationService
{
    /**
     * @var array<int, ReservationSpreadsheetStrategyInterface>
     */
    protected array $strategies = [];

    public function __construct(
        protected AvailabilityService $availabilityService
    ) {
        $this->registerStrategy(new MilitaryExportSpreadsheetStrategy);
        $this->registerStrategy(new MilitaryBranchSpreadsheetStrategy);
    }

    /**
     * Register a new spreadsheet parsing strategy.
     */
    public function registerStrategy(ReservationSpreadsheetStrategyInterface $strategy): void
    {
        $this->strategies[] = $strategy;
    }

    /**
     * Load spreadsheet instance safely.
     */
    public function loadSpreadsheet(string|UploadedFile $file): Spreadsheet
    {
        $path = $file instanceof UploadedFile ? $file->getRealPath() : $file;

        if (! file_exists($path)) {
            throw new \InvalidArgumentException("الملف غير موجود: {$path}");
        }

        $reader = IOFactory::createReaderForFile($path);

        return $reader->load($path);
    }

    /**
     * Resolve the appropriate strategy based on spreadsheet header row.
     */
    public function resolveStrategy(Spreadsheet $spreadsheet): ReservationSpreadsheetStrategyInterface
    {
        $sheet = $spreadsheet->getActiveSheet();
        $highestCol = $sheet->getHighestColumn();
        $highestColIndex = Coordinate::columnIndexFromString($highestCol);

        $headers = [];
        for ($col = 1; $col <= $highestColIndex; $col++) {
            $val = (string) $sheet->getCell([$col, 1])->getValue();
            $headers[] = trim($val);
        }

        foreach ($this->strategies as $strategy) {
            if ($strategy->canHandle($headers)) {
                return $strategy;
            }
        }

        throw ValidationException::withMessages([
            'file' => ['صيغة أو هيكل ملف الإكسيل غير مدعومة. يرجى التأكد من تطابق عناوين الأعمدة مع النماذج المعتمدة.'],
        ]);
    }

    /**
     * Preview extracted data and validate against database rules without saving.
     *
     * @param  array<string, mixed>  $context
     * @return array{
     *     total_rows: int,
     *     valid_count: int,
     *     errors_count: int,
     *     errors: list<string>,
     *     preview: list<array<string, mixed>>
     * }
     */
    public function preview(string|UploadedFile $file, array $context): array
    {
        $spreadsheet = $this->loadSpreadsheet($file);
        $strategy = $this->resolveStrategy($spreadsheet);

        $rows = $strategy->extract($spreadsheet, $context);

        $checkIn = (string) ($context['check_in'] ?? '');
        $checkOut = (string) ($context['check_out'] ?? '');

        [$unitMap, $errors, $analyzedRows] = $this->analyzeRows($rows, $checkIn, $checkOut);

        return [
            'total_rows' => count($rows),
            'valid_count' => count($rows) - count($errors),
            'errors_count' => count($errors),
            'errors' => $errors,
            'preview' => array_slice($analyzedRows, 0, 50),
        ];
    }

    /**
     * Import reservations transactionally.
     * Strict rollback on any conflict or data issue.
     *
     * @param  array<string, mixed>  $context
     * @return array{
     *     total: int,
     *     imported: int,
     *     message: string
     * }
     *
     * @throws ValidationException
     */
    public function import(string|UploadedFile $file, array $context): array
    {
        $spreadsheet = $this->loadSpreadsheet($file);
        $strategy = $this->resolveStrategy($spreadsheet);

        $rows = $strategy->extract($spreadsheet, $context);

        if (empty($rows)) {
            throw ValidationException::withMessages([
                'file' => ['الملف فارغ أو لا يحتوي على أي صفوف بيانات صالحة للاستيراد.'],
            ]);
        }

        $checkIn = (string) $context['check_in'];
        $checkOut = (string) $context['check_out'];

        [$unitMap, $errors, $analyzedRows] = $this->analyzeRows($rows, $checkIn, $checkOut);

        // Strict rollback on ANY error
        if (! empty($errors)) {
            throw ValidationException::withMessages([
                'import_errors' => $errors,
            ]);
        }

        $createdCount = 0;

        DB::transaction(function () use ($analyzedRows, $checkIn, $checkOut, &$createdCount) {
            foreach ($analyzedRows as $item) {
                /** @var ImportedReservationRow $row */
                $row = $item['row'];
                /** @var Unit $unit */
                $unit = $item['unit'];

                $guest = $this->resolveOrCreateGuest($row);

                $rowCheckIn = $row->checkIn ?? $checkIn;
                $rowCheckOut = $row->checkOut ?? $checkOut;

                $membership = null;
                if ($row->membership) {
                    $membership = MembershipType::tryFrom($row->membership)?->value ?? $row->membership;
                }

                Reservation::create([
                    'guest_id' => $guest->id,
                    'unit_id' => $unit->id,
                    'check_in' => $rowCheckIn,
                    'check_out' => $rowCheckOut,
                    'status' => ReservationStatus::WAITING->value,
                    'type' => ReservationType::BRANCH->value,
                    'membership' => $membership,
                    'total_price' => 0.00,
                    'notes' => $row->getFormattedNotes(),
                ]);

                $createdCount++;
            }
        });

        return [
            'total' => count($rows),
            'imported' => $createdCount,
            'message' => "تم استيراد {$createdCount} حجز بنجاح وحفظها بحالة 'انتظار'.",
        ];
    }

    /**
     * Pre-analyze rows against sectors, units, and availability.
     *
     * @param  array<int, ImportedReservationRow>  $rows
     * @return array{0: array<string, Unit>, 1: list<string>, 2: list<array{row: ImportedReservationRow, unit: Unit}>}
     */
    protected function analyzeRows(array $rows, string $checkIn, string $checkOut): array
    {
        /** @var Collection<int, Sector> $sectors */
        $sectors = Sector::with('units.sector')->get();

        $errors = [];
        $analyzedRows = [];
        $batchAssignedUnits = [];

        foreach ($rows as $row) {
            // Find Sector
            $sector = $sectors->first(function (Sector $s) use ($row) {
                return trim($s->name) === trim($row->targetSector);
            });

            if (! $sector) {
                $errors[] = "الصف {$row->rowIndex}: لم يتم العثور على القطاع '{$row->targetSector}' للنظام.";

                continue;
            }

            // Find Unit
            $unit = $sector->units->first(function (Unit $u) use ($row) {
                return trim($u->name) === trim($row->roomNumber);
            });

            if (! $unit) {
                $errors[] = "الصف {$row->rowIndex}: لم يتم العثور على الوحدة رقم '{$row->roomNumber}' في قطاع '{$sector->name}'.";

                continue;
            }

            // Intra-batch conflict check
            if (isset($batchAssignedUnits[$unit->id])) {
                $firstRow = $batchAssignedUnits[$unit->id];
                $errors[] = "الصف {$row->rowIndex}: تكرار حجز الوحدة '{$unit->name}' ({$sector->name}) أكثر من مرة داخل نفس الملف (سبق حجزها بالصف {$firstRow}).";

                continue;
            }
            $batchAssignedUnits[$unit->id] = $row->rowIndex;

            // Database availability check
            $rowCheckIn = $row->checkIn ?? $checkIn;
            $rowCheckOut = $row->checkOut ?? $checkOut;
            if ($rowCheckIn && $rowCheckOut) {
                $conflict = $this->availabilityService->findConflictingReservation($unit->id, $rowCheckIn, $rowCheckOut);
                if ($conflict) {
                    $conflictGuestName = $conflict->guest?->name ?? 'نزيل آخر';
                    $conflictIn = is_string($conflict->check_in) ? $conflict->check_in : $conflict->check_in->format('Y-m-d');
                    $conflictOut = is_string($conflict->check_out) ? $conflict->check_out : $conflict->check_out->format('Y-m-d');

                    $errors[] = "الصف {$row->rowIndex}: تعارض حجز للوحدة '{$unit->name}' ({$sector->name}) المحجوزة للنزيل '{$conflictGuestName}' من {$conflictIn} إلى {$conflictOut}.";

                    continue;
                }
            }

            $analyzedRows[] = [
                'row' => $row,
                'unit' => $unit,
            ];
        }

        return [$batchAssignedUnits, $errors, $analyzedRows];
    }

    /**
     * Resolve existing guest or create a new guest record.
     */
    protected function resolveOrCreateGuest(ImportedReservationRow $row): Guest
    {
        if ($row->militaryId) {
            $guest = Guest::where('mil_code', $row->militaryId)->first();
            if ($guest) {
                $updates = [];
                // Update name or phone if changed or empty
                if ($row->guestName && $guest->name !== $row->guestName) {
                    $updates['name'] = $row->guestName;
                }
                if ($row->phone && $row->phone !== '-' && (! $guest->phone || $guest->phone === '-')) {
                    $updates['phone'] = $row->phone;
                }
                if (! empty($updates)) {
                    $guest->update($updates);
                }

                return $guest;
            }

            return Guest::create([
                'name' => $row->guestName,
                'phone' => $row->phone,
                'mil_code' => $row->militaryId,
            ]);
        }

        if ($row->phone && $row->phone !== '-') {
            $guest = Guest::where('phone', $row->phone)->first();
            if ($guest) {
                return $guest;
            }
        }

        $guest = Guest::where('name', $row->guestName)->first();
        if ($guest) {
            return $guest;
        }

        return Guest::create([
            'name' => $row->guestName,
            'phone' => $row->phone,
            'mil_code' => null,
        ]);
    }
}
