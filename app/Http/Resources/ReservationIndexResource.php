<?php

namespace App\Http\Resources;

use App\Enums\MembershipType;
use App\Enums\ReservationStatus;
use App\Enums\ReservationType;
use App\Models\Reservation;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Reservation
 */
class ReservationIndexResource extends JsonResource
{
    /**
     * Transform the resource into an array containing only the fields
     * directly displayed in sector matrix cards and table columns.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $statusVal = $this->status instanceof ReservationStatus ? $this->status->value : (string) $this->status;
        $typeVal = $this->type instanceof ReservationType ? $this->type->value : (string) $this->type;
        $membershipVal = $this->membership instanceof MembershipType ? $this->membership->value : ($this->membership ? (string) $this->membership : 'عضو');

        $checkInStr = $this->check_in instanceof CarbonInterface ? $this->check_in->format('Y-m-d') : ($this->check_in ? (string) $this->check_in : '');
        $checkOutStr = $this->check_out instanceof CarbonInterface ? $this->check_out->format('Y-m-d') : ($this->check_out ? (string) $this->check_out : '');

        $mealsStartStr = $this->meals_start_date instanceof CarbonInterface ? $this->meals_start_date->format('Y-m-d') : ($this->meals_start_date ? (string) $this->meals_start_date : null);
        $mealsEndStr = $this->meals_end_date instanceof CarbonInterface ? $this->meals_end_date->format('Y-m-d') : ($this->meals_end_date ? (string) $this->meals_end_date : null);

        $attachmentsCount = is_array($this->attachments) ? count($this->attachments) : 0;

        return [
            'id' => $this->id,
            'guest_id' => $this->guest_id,
            'unit_id' => $this->unit_id,
            'check_in' => $checkInStr,
            'check_out' => $checkOutStr,
            'status' => $statusVal,
            'type' => $typeVal,
            'membership' => $membershipVal,
            'enter_from_gates' => (bool) $this->enter_from_gates,
            'total_price' => (float) $this->total_price,
            'paid_amount' => (float) $this->paid_amount,
            'balance' => (float) $this->balance,
            'payment_status' => (string) $this->payment_status,
            'nights_count' => (int) $this->nights_count,
            'notes' => $this->notes,
            'updated_at' => $this->updated_at?->toIso8601String(),

            // Meals data for meals table and table columns
            'has_meals' => (bool) $this->has_meals,
            'meals_start_date' => $mealsStartStr,
            'meals_end_date' => $mealsEndStr,
            'meals_rate_per_night' => (float) $this->meals_rate_per_night,
            'meals_total_price' => (float) $this->meals_total_price,
            'meals_persons_count' => (int) ($this->meals_persons_count ?: 4),
            'meals_nights_count' => (int) $this->meals_nights_count,
            'todays_meals_count' => (int) $this->todays_meals_count,

            // Financial breakdown
            'extra_fees_total' => (float) $this->extra_fees_total,

            // Attachment indicator count
            'attachments_count' => $attachmentsCount,

            // Lightweight Guest
            'guest' => $this->guest ? [
                'id' => $this->guest->id,
                'name' => $this->guest->name,
                'phone' => $this->guest->phone,
                'mil_code' => $this->guest->mil_code,
            ] : null,

            // Lightweight Unit & Sector
            'unit' => $this->unit ? [
                'id' => $this->unit->id,
                'sector_id' => $this->unit->sector_id,
                'name' => $this->unit->name,
                'rooms_count' => $this->unit->rooms_count,
                'sector' => $this->unit->sector ? [
                    'id' => $this->unit->sector->id,
                    'name' => $this->unit->sector->name,
                    'has_meals' => (bool) $this->unit->sector->has_meals,
                ] : null,
            ] : null,
        ];
    }
}
