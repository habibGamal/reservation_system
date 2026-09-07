<?php

namespace App\Services;

use App\Enums\MembershipType;
use App\Models\PriceRule;
use App\Models\Unit;
use Carbon\Carbon;

class PricingService
{
    /**
     * Calculate stay duration, nightly rate, meals, extra fees, and total price for a reservation.
     *
     * @param  array<int, array{amount?: float|int|string, value?: float|int|string, description?: string}>  $extraFees
     * @return array{
     *     nights: int,
     *     rate_per_night: float,
     *     room_price: float,
     *     has_meals: bool,
     *     meals_nights: int,
     *     meals_rate_per_night: float,
     *     meals_total_price: float,
     *     extra_fees_total: float,
     *     total_price: float,
     *     price_rule_name: string,
     *     price_rule_id: int|null
     * }
     */
    public function calculate(
        Unit|int $unit,
        MembershipType|string|null $membership,
        string $checkIn,
        string $checkOut,
        bool $hasMeals = false,
        ?string $mealsStartDate = null,
        ?string $mealsEndDate = null,
        array $extraFees = [],
        ?int $mealsPersonsCount = null
    ): array {
        if (is_int($unit)) {
            $unit = Unit::with('priceRule')->findOrFail($unit);
        } else {
            $unit->loadMissing('priceRule');
        }

        $in = Carbon::parse($checkIn);
        $out = Carbon::parse($checkOut);
        $diff = $in->diffInDays($out);
        $nights = max(1, (int) $diff);

        $membershipVal = $membership instanceof MembershipType ? $membership->value : (string) $membership;
        $priceRule = $unit->priceRule;
        $ratePerNight = 0.0;
        $priceRuleName = $priceRule?->name ?? 'تسعير غير محدد';
        $priceRuleId = $priceRule?->id;

        if ($priceRule && is_array($priceRule->rules) && $membershipVal !== '' && isset($priceRule->rules[$membershipVal])) {
            $ratePerNight = (float) $priceRule->rules[$membershipVal];
        }

        $roomPrice = round($ratePerNight * $nights, 2);

        // Meals calculation (persons * rate * nights)
        $mealsNights = 0;
        $mealsRatePerNight = 0.0;
        $mealsTotalPrice = 0.0;
        $mealsPersons = ($mealsPersonsCount !== null && $mealsPersonsCount > 0) ? (int) $mealsPersonsCount : 4;

        if ($hasMeals) {
            $mealsRatePerNight = PriceRule::getMealRate();
            $mStartStr = $mealsStartDate ?: $checkIn;
            $mEndStr = $mealsEndDate ?: $checkOut;
            $mStart = Carbon::parse($mStartStr);
            $mEnd = Carbon::parse($mEndStr);
            $mDiff = $mStart->diffInDays($mEnd);
            $mealsNights = max(0, (int) $mDiff);
            $mealsTotalPrice = round($mealsPersons * $mealsRatePerNight * $mealsNights, 2);
        }

        // Extra fees calculation
        $extraFeesTotal = 0.0;
        foreach ($extraFees as $fee) {
            $amt = $fee['amount'] ?? $fee['value'] ?? 0;
            if (is_numeric($amt) && $amt > 0) {
                $extraFeesTotal += (float) $amt;
            }
        }
        $extraFeesTotal = round($extraFeesTotal, 2);

        $totalPrice = round($roomPrice + $mealsTotalPrice + $extraFeesTotal, 2);

        return [
            'nights' => $nights,
            'rate_per_night' => $ratePerNight,
            'room_price' => $roomPrice,
            'has_meals' => $hasMeals,
            'meals_persons_count' => $hasMeals ? $mealsPersons : 0,
            'meals_nights' => $mealsNights,
            'meals_rate_per_night' => $mealsRatePerNight,
            'meals_total_price' => $mealsTotalPrice,
            'extra_fees_total' => $extraFeesTotal,
            'total_price' => $totalPrice,
            'price_rule_name' => $priceRuleName,
            'price_rule_id' => $priceRuleId,
        ];
    }
}
