<?php

namespace Tests\Feature;

use App\Enums\MembershipType;
use App\Enums\PaymentMethod;
use App\Enums\ReservationStatus;
use App\Enums\ReservationType;
use App\Models\Guest;
use App\Models\Reservation;
use App\Models\Sector;
use App\Models\Unit;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReservationConflictTest extends TestCase
{
    use RefreshDatabase;

    protected User $receptionist;

    protected Unit $unit;

    protected Guest $guest1;

    protected Guest $guest2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleAndPermissionSeeder::class);

        $this->receptionist = User::factory()->create();
        $this->receptionist->assignRole('Receptionist');

        $sector = Sector::create(['name' => 'لوسيال']);
        $this->unit = Unit::create([
            'sector_id' => $sector->id,
            'name' => '101',
        ]);

        $this->guest1 = Guest::create([
            'name' => 'أحمد منصور',
            'phone' => '01012345678',
            'mil_code' => 'MIL-100',
        ]);

        $this->guest2 = Guest::create([
            'name' => 'محمود السيد',
            'phone' => '01198765432',
            'mil_code' => 'MIL-200',
        ]);
    }

    public function test_receptionist_can_book_available_unit(): void
    {
        $response = $this->actingAs($this->receptionist)->post(route('reservations.store'), [
            'guest_id' => $this->guest1->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1800.00,
            'notes' => 'حجز عائلي دور أرضي',
            'initial_payment' => [
                'amount' => 500.00,
                'method' => PaymentMethod::CASH->value,
            ],
        ]);

        $response->assertRedirect(route('reservations.index'));
        $this->assertDatabaseHas('reservations', [
            'unit_id' => $this->unit->id,
            'guest_id' => $this->guest1->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'total_price' => 1800.00,
        ]);

        $reservation = Reservation::first();
        $this->assertNotNull($reservation);
        $this->assertCount(1, $reservation->payments);
        $this->assertEquals(500.00, $reservation->paid_amount);
        $this->assertEquals(1300.00, $reservation->balance);
        $this->assertEquals('Partially Paid', $reservation->payment_status);
    }

    public function test_overlapping_booking_is_rejected_with_conflict_error(): void
    {
        // Existing booking: 2026-10-01 to 2026-10-05
        Reservation::create([
            'unit_id' => $this->unit->id,
            'guest_id' => $this->guest1->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1800.00,
        ]);

        // Attempt overlapping booking: 2026-10-02 to 2026-10-06
        $response = $this->actingAs($this->receptionist)->postJson(route('reservations.store'), [
            'guest_id' => $this->guest2->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-10-02',
            'check_out' => '2026-10-06',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1800.00,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['unit_id']);
    }

    public function test_same_day_turnover_is_allowed(): void
    {
        // Existing booking: 2026-10-01 to 2026-10-05
        Reservation::create([
            'unit_id' => $this->unit->id,
            'guest_id' => $this->guest1->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1800.00,
        ]);

        // Same-day check-in after departure: 2026-10-05 to 2026-10-10
        $response = $this->actingAs($this->receptionist)->post(route('reservations.store'), [
            'guest_id' => $this->guest2->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-10-05',
            'check_out' => '2026-10-10',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::MANAGEMENT->value,
            'membership' => MembershipType::NON_MEMBER->value,
            'total_price' => 3500.00,
        ]);

        $response->assertRedirect(route('reservations.index'));
        $this->assertDatabaseHas('reservations', [
            'unit_id' => $this->unit->id,
            'guest_id' => $this->guest2->id,
            'check_in' => '2026-10-05',
            'check_out' => '2026-10-10',
        ]);
    }

    public function test_departed_reservation_does_not_block_new_booking(): void
    {
        // Past / Departed reservation with same dates
        Reservation::create([
            'unit_id' => $this->unit->id,
            'guest_id' => $this->guest1->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::DEPARTED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1800.00,
        ]);

        $response = $this->actingAs($this->receptionist)->post(route('reservations.store'), [
            'guest_id' => $this->guest2->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1800.00,
        ]);

        $response->assertRedirect(route('reservations.index'));
    }

    public function test_updating_reservation_to_conflicting_date_is_rejected(): void
    {
        $res1 = Reservation::create([
            'unit_id' => $this->unit->id,
            'guest_id' => $this->guest1->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1800.00,
        ]);

        $res2 = Reservation::create([
            'unit_id' => $this->unit->id,
            'guest_id' => $this->guest2->id,
            'check_in' => '2026-10-10',
            'check_out' => '2026-10-15',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1800.00,
        ]);

        // Attempt to move res2 into res1 dates
        $response = $this->actingAs($this->receptionist)->putJson(route('reservations.update', $res2->id), [
            'guest_id' => $this->guest2->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-10-03',
            'check_out' => '2026-10-08',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1800.00,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['unit_id']);
    }

    public function test_receptionist_can_update_status(): void
    {
        $reservation = Reservation::create([
            'unit_id' => $this->unit->id,
            'guest_id' => $this->guest1->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1800.00,
        ]);

        $response = $this->actingAs($this->receptionist)->patch(route('reservations.update-status', $reservation->id), [
            'status' => ReservationStatus::CHECKED_IN->value,
        ]);

        $response->assertRedirect();
        $this->assertEquals(ReservationStatus::CHECKED_IN, $reservation->fresh()->status);
    }
}
