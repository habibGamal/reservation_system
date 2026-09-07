<?php

namespace Tests\Feature;

use App\Enums\MembershipType;
use App\Enums\ReservationStatus;
use App\Enums\ReservationType;
use App\Models\Guest;
use App\Models\PriceRule;
use App\Models\Reservation;
use App\Models\Sector;
use App\Models\Unit;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReservationGateEntryTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $receptionist;

    protected Sector $sector;

    protected Unit $unit;

    protected Guest $guest;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleAndPermissionSeeder::class);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('Admin');

        $this->receptionist = User::factory()->create();
        $this->receptionist->assignRole('Receptionist');

        $this->guest = Guest::create([
            'name' => 'نزيل تجريبي للبوابات',
            'phone' => '01099998888',
        ]);

        $this->sector = Sector::create(['name' => 'قطاع البوابة']);
        $this->receptionist->sectors()->attach($this->sector->id, ['permission' => 'edit']);

        $priceRule = PriceRule::create([
            'name' => 'سعر البوابة',
            'rules' => [
                'عضو' => 500.0,
                'غير عضو' => 800.0,
                'مرافق' => 600.0,
                'مدني' => 1000.0,
            ],
        ]);

        $this->unit = Unit::create([
            'sector_id' => $this->sector->id,
            'price_rule_id' => $priceRule->id,
            'name' => 'غرفة 201',
        ]);
    }

    public function test_can_create_reservation_with_enter_from_gates_true(): void
    {
        $response = $this->actingAs($this->receptionist)->post(route('reservations.store'), [
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-11-01',
            'check_out' => '2026-11-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'enter_from_gates' => true,
            'total_price' => 2000.0,
        ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('reservations', [
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'enter_from_gates' => true,
        ]);
    }

    public function test_create_reservation_defaults_enter_from_gates_to_false_when_omitted(): void
    {
        $response = $this->actingAs($this->receptionist)->post(route('reservations.store'), [
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-11-10',
            'check_out' => '2026-11-12',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1000.0,
        ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('reservations', [
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'enter_from_gates' => false,
        ]);
    }

    public function test_can_update_reservation_enter_from_gates(): void
    {
        $reservation = Reservation::create([
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-11-15',
            'check_out' => '2026-11-18',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'enter_from_gates' => false,
            'total_price' => 1500.0,
        ]);

        $response = $this->actingAs($this->receptionist)->put(route('reservations.update', $reservation), [
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-11-15',
            'check_out' => '2026-11-18',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'enter_from_gates' => true,
            'total_price' => 1500.0,
        ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('reservations', [
            'id' => $reservation->id,
            'enter_from_gates' => true,
        ]);
    }

    public function test_can_quick_update_enter_from_gates_via_json(): void
    {
        $reservation = Reservation::create([
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-11-20',
            'check_out' => '2026-11-23',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'enter_from_gates' => false,
            'total_price' => 1500.0,
        ]);

        $response = $this->actingAs($this->receptionist)->patchJson(
            route('reservations.quick-update', $reservation),
            ['enter_from_gates' => true]
        );

        $response->assertOk();
        $response->assertJsonPath('reservation.enter_from_gates', true);

        $this->assertDatabaseHas('reservations', [
            'id' => $reservation->id,
            'enter_from_gates' => true,
        ]);

        // Toggle back to false
        $responseToggle = $this->actingAs($this->receptionist)->patchJson(
            route('reservations.quick-update', $reservation),
            ['enter_from_gates' => false]
        );

        $responseToggle->assertOk();
        $responseToggle->assertJsonPath('reservation.enter_from_gates', false);

        $this->assertDatabaseHas('reservations', [
            'id' => $reservation->id,
            'enter_from_gates' => false,
        ]);
    }
}
