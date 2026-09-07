<?php

namespace App\Services\Excel\Strategies;

use App\Services\Excel\Contracts\ReservationSpreadsheetStrategyInterface;
use App\Services\Excel\DTOs\ImportedReservationRow;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class MilitaryExportSpreadsheetStrategy implements ReservationSpreadsheetStrategyInterface
{
    /**
     * Determine if this strategy can process the given spreadsheet headers.
     *
     * @param  array<int, string>  $headers
     */
    public function canHandle(array $headers): bool
    {
        $normalizedHeaders = array_map(fn ($h) => $this->normalizeArabicString((string) $h), $headers);

        $hasReservationCodeOrDate = false;
        $hasGuestName = false;
        $hasRoomNumber = false;

        foreach ($normalizedHeaders as $header) {
            if (
                str_contains($header, 'ReservationCODE') ||
                str_contains($header, 'ReservDate') ||
                str_contains($header, 'ROOM_NUMBER_CODE') ||
                str_contains($header, 'المصيف') ||
                str_contains($header, 'تسجيل نزيل')
            ) {
                $hasReservationCodeOrDate = true;
            }

            if (str_contains($header, 'اسم النزيل') || str_contains($header, 'النزيل')) {
                $hasGuestName = true;
            }

            if (str_contains($header, 'رقم الغرفة') || str_contains($header, 'الغرفة')) {
                $hasRoomNumber = true;
            }
        }

        return $hasReservationCodeOrDate && $hasGuestName && $hasRoomNumber;
    }

    /**
     * Parse spreadsheet and extract normalized reservation rows.
     *
     * @param  array<string, mixed>  $context
     * @return array<int, ImportedReservationRow>
     */
    public function extract(Spreadsheet $spreadsheet, array $context = []): array
    {
        $sheet = $spreadsheet->getActiveSheet();
        $highestRow = $sheet->getHighestRow();
        $highestCol = $sheet->getHighestColumn();
        $highestColIndex = Coordinate::columnIndexFromString($highestCol);

        // Build header mapping dynamically
        $colMap = $this->buildColumnMap($sheet, $highestColIndex);

        // Dates are taken strictly from the upload dialog context, ignoring any sheet dates
        $checkIn = isset($context['check_in']) && is_string($context['check_in']) ? $context['check_in'] : null;
        $checkOut = isset($context['check_out']) && is_string($context['check_out']) ? $context['check_out'] : null;

        $rows = [];

        for ($r = 2; $r <= $highestRow; $r++) {
            $militaryId = trim((string) $sheet->getCell([$colMap['military_id'] ?? 1, $r])->getValue());
            $rank = (string) $sheet->getCell([$colMap['rank'] ?? 2, $r])->getValue();
            $guestName = (string) $sheet->getCell([$colMap['guest_name'] ?? 3, $r])->getValue();
            $rawUnitType = (string) $sheet->getCell([$colMap['unit_type'] ?? 5, $r])->getValue();
            $rawRoomNumber = (string) $sheet->getCell([$colMap['room_number'] ?? 6, $r])->getValue();
            $reservationCode = trim((string) $sheet->getCell([$colMap['reservation_code'] ?? 12, $r])->getValue());
            $membership = (string) $sheet->getCell([$colMap['membership'] ?? 14, $r])->getValue();
            // Phone 2 only per user specification
            $phone2 = (string) $sheet->getCell([$colMap['phone2'] ?? 16, $r])->getValue();
            $serviceStatus = (string) $sheet->getCell([$colMap['service_status'] ?? 17, $r])->getValue();

            // Skip completely empty rows
            if ($militaryId === '' && trim($guestName) === '' && trim($rawRoomNumber) === '') {
                continue;
            }

            $cleanRank = $this->normalizeArabicString($rank);
            $cleanGuestName = $this->normalizeArabicString($guestName);
            $cleanRawUnitType = $this->normalizeArabicString($rawUnitType);
            $cleanServiceStatus = $this->normalizeArabicString($serviceStatus);
            $cleanMembership = $this->normalizeArabicString($membership);
            $cleanPhone = $this->sanitizePhoneNumber($phone2);

            // Concatenate rank and guest name
            $fullGuestName = $cleanRank !== ''
                ? trim($cleanRank.' '.$cleanGuestName)
                : $cleanGuestName;

            [$targetSector, $cleanRoomNumber] = $this->resolveSectorAndRoom($cleanRawUnitType, $rawRoomNumber);

            // Optional notes
            $noteParts = [];
            if ($reservationCode !== '') {
                $noteParts[] = "كود الحجز: {$reservationCode}";
            }

            $rows[] = new ImportedReservationRow(
                rowIndex: $r,
                militaryId: $militaryId !== '' ? $militaryId : null,
                guestName: $fullGuestName,
                phone: $cleanPhone,
                rawUnitType: $cleanRawUnitType,
                targetSector: $targetSector,
                roomNumber: $cleanRoomNumber,
                rank: $cleanRank !== '' ? $cleanRank : null,
                serviceStatus: $cleanServiceStatus !== '' ? $cleanServiceStatus : null,
                notes: implode(' | ', $noteParts),
                membership: $cleanMembership !== '' ? $cleanMembership : null,
                checkIn: $checkIn,
                checkOut: $checkOut,
            );
        }

        return $rows;
    }

    /**
     * Build column index mapping from spreadsheet headers.
     *
     * @return array<string, int>
     */
    protected function buildColumnMap(Worksheet $sheet, int $highestColIndex): array
    {
        $map = [
            'military_id' => 1,
            'rank' => 2,
            'guest_name' => 3,
            'unit_type' => 5,
            'room_number' => 6,
            'reservation_code' => 12,
            'membership' => 14,
            'phone2' => 16,
            'service_status' => 17,
        ];

        for ($col = 1; $col <= $highestColIndex; $col++) {
            $header = $this->normalizeArabicString((string) $sheet->getCell([$col, 1])->getValue());

            if (str_contains($header, 'الرقم العسكر') || str_contains($header, 'كود عسكر')) {
                $map['military_id'] = $col;
            } elseif (str_contains($header, 'الرتب')) {
                $map['rank'] = $col;
            } elseif (str_contains($header, 'اسم النزيل')) {
                $map['guest_name'] = $col;
            } elseif (str_contains($header, 'نوع الوحدة')) {
                $map['unit_type'] = $col;
            } elseif (str_contains($header, 'رقم الغرفة')) {
                $map['room_number'] = $col;
            } elseif (str_contains($header, 'ReservationCODE')) {
                $map['reservation_code'] = $col;
            } elseif (str_contains($header, 'العضوية')) {
                $map['membership'] = $col;
            } elseif (str_contains($header, 'التليفون 2') || str_contains($header, 'الهاتف 2')) {
                $map['phone2'] = $col;
            } elseif (str_contains($header, 'حالة الخدمة')) {
                $map['service_status'] = $col;
            }
        }

        return $map;
    }

    /**
     * Resolve destination sector and normalized room number.
     *
     * @return array{0: string, 1: string}
     */
    public function resolveSectorAndRoom(string $cleanUnitType, string $rawRoom): array
    {
        // Clean room number: remove 'B' or other non-numeric chars (e.g. 15B -> 15)
        $cleanRoom = trim((string) preg_replace('/[^0-9]/', '', $rawRoom));
        if ($cleanRoom === '') {
            $cleanRoom = trim($rawRoom);
        }

        $roomInt = is_numeric($cleanRoom) ? (int) $cleanRoom : null;

        // 1. لوسيال
        if (str_contains($cleanUnitType, 'لوسيال')) {
            return ['لوسيال', $cleanRoom];
        }

        // 2. فيلا
        if ($cleanUnitType === 'فيلا') {
            if ($roomInt !== null && $roomInt <= 10) {
                return ['فيلا قديم', $cleanRoom];
            }

            return ['فيلا جديد', $cleanRoom];
        }

        // 3. دورين (شاليه 3 غرفة)
        if (str_contains($cleanUnitType, 'دورين') || str_contains($cleanUnitType, '3 غرفة')) {
            return ['دورين', $cleanRoom];
        }

        // 4. مميز (شالية 2 غرفة)
        if (str_contains($cleanUnitType, 'مميز') || (str_contains($cleanUnitType, '2 غرفة') && ! str_contains($cleanUnitType, 'فندق'))) {
            return ['مميز', $cleanRoom];
        }

        // 5. فنادق 1..6
        if (str_contains($cleanUnitType, 'فندق 1')) {
            return ['فندق 1', $cleanRoom];
        }
        if (str_contains($cleanUnitType, 'فندق 2')) {
            return ['فندق 2', $cleanRoom];
        }
        if (str_contains($cleanUnitType, 'فندق 3')) {
            return ['فندق 3', $cleanRoom];
        }
        if (str_contains($cleanUnitType, 'فندق 4')) {
            return ['فندق 4', $cleanRoom];
        }
        if (str_contains($cleanUnitType, 'فندق 5')) {
            return ['فندق 5', $cleanRoom];
        }
        if (str_contains($cleanUnitType, 'فندق 6')) {
            return ['فندق 6', $cleanRoom];
        }

        return [$cleanUnitType, $cleanRoom];
    }

    /**
     * Strip tatweel/kashida, non-breaking spaces, and extra whitespace.
     */
    public function normalizeArabicString(string $value): string
    {
        // Replace non-breaking spaces (\u00A0) with standard space
        $value = str_replace("\xc2\xa0", ' ', $value);
        // Remove Arabic tatweel / kashida (U+0640)
        $value = preg_replace('/\x{0640}/u', '', $value) ?? $value;
        // Normalize multiple spaces into a single space and trim
        $value = preg_replace('/\s+/u', ' ', $value) ?? $value;

        return trim($value);
    }

    /**
     * Sanitize phone number (strip slashes, backslashes, spaces, dashes).
     */
    public function sanitizePhoneNumber(string $phone): string
    {
        $sanitized = str_replace(['\\', '/', ' ', '-', '(', ')', '+'], '', $phone);
        $sanitized = trim($sanitized);

        return $sanitized !== '' ? $sanitized : '-';
    }
}
