<?php

namespace App\Services\Excel\Contracts;

use App\Services\Excel\DTOs\ImportedReservationRow;
use PhpOffice\PhpSpreadsheet\Spreadsheet;

interface ReservationSpreadsheetStrategyInterface
{
    /**
     * Determine if this strategy can process the given spreadsheet headers.
     *
     * @param  array<int, string>  $headers
     */
    public function canHandle(array $headers): bool;

    /**
     * Parse spreadsheet and extract normalized reservation rows.
     *
     * @param  array<string, mixed>  $context
     * @return array<int, ImportedReservationRow>
     */
    public function extract(Spreadsheet $spreadsheet, array $context = []): array;
}
