<?php

namespace App\Services;

use App\Enums\ReservationStatus;
use App\Models\Reservation;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Collection;

class AvailabilityService
{
    /**
     * Check if a unit has an overlapping active reservation for the specified date range.
     *
     * Mathematical overlap condition:
     * (new_check_in < existing_check_out) AND (new_check_out > existing_check_in)
     */
    public function hasConflict(int $unitId, string $checkIn, string $checkOut, ?int $ignoreReservationId = null): bool
    {
        return $this->findConflictingReservation($unitId, $checkIn, $checkOut, $ignoreReservationId) !== null;
    }

    /**
     * Find the first active reservation that conflicts with the requested unit and dates.
     */
    public function findConflictingReservation(int $unitId, string $checkIn, string $checkOut, ?int $ignoreReservationId = null): ?Reservation
    {
        $query = Reservation::query()
            ->with(['guest', 'unit'])
            ->where('unit_id', $unitId)
            ->where('status', '!=', ReservationStatus::DEPARTED->value)
            ->where('check_in', '<', $checkOut)
            ->where('check_out', '>', $checkIn);

        if ($ignoreReservationId) {
            $query->where('id', '!=', $ignoreReservationId);
        }

        return $query->first();
    }

    /**
     * Get all units available in a date range, optionally filtered by sector.
     *
     * @return Collection<int, Unit>
     */
    public function getAvailableUnits(string $checkIn, string $checkOut, ?int $sectorId = null): Collection
    {
        $query = Unit::query()->with(['sector', 'priceRule']);

        if ($sectorId) {
            $query->where('sector_id', $sectorId);
        }

        $query->whereDoesntHave('reservations', function ($q) use ($checkIn, $checkOut) {
            $q->where('status', '!=', ReservationStatus::DEPARTED->value)
                ->where('check_in', '<', $checkOut)
                ->where('check_out', '>', $checkIn);
        });

        return $query->get();
    }
}
