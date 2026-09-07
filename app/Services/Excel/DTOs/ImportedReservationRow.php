<?php

namespace App\Services\Excel\DTOs;

class ImportedReservationRow
{
    public function __construct(
        public int $rowIndex,
        public ?string $militaryId,
        public string $guestName,
        public string $phone,
        public string $rawUnitType,
        public string $targetSector,
        public string $roomNumber,
        public ?string $rank = null,
        public ?string $serviceStatus = null,
        public ?string $notes = null,
        public ?string $membership = null,
        public ?string $checkIn = null,
        public ?string $checkOut = null,
    ) {}

    /**
     * Compose notes preserving military credentials and service status.
     */
    public function getFormattedNotes(): string
    {
        $parts = [];

        if (! empty($this->rank)) {
            $parts[] = "الرتبة: {$this->rank}";
        }

        if (! empty($this->serviceStatus)) {
            $parts[] = "حالة الخدمة: {$this->serviceStatus}";
        }

        if (! empty($this->notes)) {
            $parts[] = $this->notes;
        }

        return implode(' | ', $parts);
    }
}
