<?php

namespace App\Services\Excel\Strategies;

use App\Services\Excel\Contracts\ReservationSpreadsheetStrategyInterface;
use App\Services\Excel\DTOs\ImportedReservationRow;
use PhpOffice\PhpSpreadsheet\Spreadsheet;

class MilitaryBranchSpreadsheetStrategy implements ReservationSpreadsheetStrategyInterface
{
    /**
     * Determine if this strategy can process the given spreadsheet headers.
     *
     * @param  array<int, string>  $headers
     */
    public function canHandle(array $headers): bool
    {
        $normalizedHeaders = array_map(fn ($h) => $this->normalizeArabicString((string) $h), $headers);

        $hasMilitaryId = false;
        $hasUnitType = false;
        $hasGuestName = false;
        $hasRoomNumber = false;

        // Exclude system export spreadsheets handled by MilitaryExportSpreadsheetStrategy
        foreach ($normalizedHeaders as $header) {
            if (
                str_contains($header, 'ReservationCODE') ||
                str_contains($header, 'ReservDate') ||
                str_contains($header, 'المصيف') ||
                str_contains($header, 'تسجيل نزيل')
            ) {
                return false;
            }
        }

        foreach ($normalizedHeaders as $header) {
            if (str_contains($header, 'الرقم العسكر') || str_contains($header, 'كود عسكر')) {
                $hasMilitaryId = true;
            }
            if (str_contains($header, 'نوع الوحدة') || str_contains($header, 'الوحدة السكنية')) {
                $hasUnitType = true;
            }
            if (str_contains($header, 'اسم النزيل') || str_contains($header, 'النزيل')) {
                $hasGuestName = true;
            }
            if (str_contains($header, 'رقم الغرفة') || str_contains($header, 'الغرفة')) {
                $hasRoomNumber = true;
            }
        }

        return $hasMilitaryId && $hasUnitType && $hasGuestName && $hasRoomNumber;
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

        $rows = [];

        for ($r = 2; $r <= $highestRow; $r++) {
            $militaryId = trim((string) $sheet->getCell([1, $r])->getValue());
            $rawUnitType = (string) $sheet->getCell([2, $r])->getValue();
            $rank = (string) $sheet->getCell([3, $r])->getValue();
            $serviceStatus = (string) $sheet->getCell([4, $r])->getValue();
            $guestName = (string) $sheet->getCell([5, $r])->getValue();
            $roomNumber = trim((string) $sheet->getCell([6, $r])->getValue());
            $phone = (string) $sheet->getCell([7, $r])->getValue();

            // Skip completely empty rows
            if ($militaryId === '' && trim($guestName) === '' && $roomNumber === '') {
                continue;
            }

            $cleanGuestName = $this->normalizeArabicString($guestName);
            $cleanRawUnitType = $this->normalizeArabicString($rawUnitType);
            $cleanRank = $this->normalizeArabicString($rank);
            $cleanServiceStatus = $this->normalizeArabicString($serviceStatus);
            $cleanPhone = $this->sanitizePhoneNumber($phone);

            $targetSector = $this->resolveSector($cleanRawUnitType, $roomNumber);

            $rows[] = new ImportedReservationRow(
                rowIndex: $r,
                militaryId: $militaryId !== '' ? $militaryId : null,
                guestName: $cleanGuestName,
                phone: $cleanPhone,
                rawUnitType: $cleanRawUnitType,
                targetSector: $targetSector,
                roomNumber: $roomNumber,
                rank: $cleanRank !== '' ? $cleanRank : null,
                serviceStatus: $cleanServiceStatus !== '' ? $cleanServiceStatus : null,
                notes: null,
            );
        }

        return $rows;
    }

    /**
     * Resolve destination sector based on unit type and room number conventions.
     */
    public function resolveSector(string $cleanUnitType, string $roomNumber): string
    {
        $roomInt = is_numeric($roomNumber) ? (int) $roomNumber : null;

        if ($cleanUnitType === 'فيلا لوسيال' || $cleanUnitType === 'لوسيال') {
            return 'لوسيال';
        }

        if ($cleanUnitType === 'فيلا') {
            if ($roomInt !== null && $roomInt <= 10) {
                return 'فيلا قديم';
            }

            return 'فيلا جديد';
        }

        if ($cleanUnitType === 'غرفة فندق 5' || $cleanUnitType === 'فندق 5') {
            return 'فندق 5';
        }

        if ($cleanUnitType === 'دورين' && $roomInt !== null && $roomInt >= 1000) {
            return 'مميز';
        }

        if ($cleanUnitType === 'دورين') {
            return 'دورين';
        }

        return $cleanUnitType;
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
