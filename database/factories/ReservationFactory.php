<?php

namespace Database\Factories;

use App\Enums\MembershipType;
use App\Enums\ReservationStatus;
use App\Enums\ReservationType;
use App\Models\Guest;
use App\Models\Reservation;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Reservation>
 */
class ReservationFactory extends Factory
{
    protected $model = Reservation::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $checkIn = fake()->dateTimeBetween('now', '+1 month');
        $nights = fake()->numberBetween(1, 7);
        $checkOut = (clone $checkIn)->modify("+{$nights} days");

        return [
            'guest_id' => Guest::factory(),
            'unit_id' => Unit::factory(),
            'check_in' => $checkIn->format('Y-m-d'),
            'check_out' => $checkOut->format('Y-m-d'),
            'status' => ReservationStatus::CONFIRMED,
            'type' => ReservationType::BRANCH,
            'membership' => MembershipType::MEMBER,
            'enter_from_gates' => false,
            'total_price' => $nights * 450.00,
            'notes' => fake()->optional()->sentence(),
        ];
    }
}
