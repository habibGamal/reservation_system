<?php

namespace Tests\Feature;

use App\Enums\MembershipType;
use App\Enums\ReservationStatus;
use App\Enums\ReservationType;
use App\Models\Guest;
use App\Models\Reservation;
use App\Models\Sector;
use App\Models\Unit;
use App\Models\User;
use App\Services\PricingService;
use Database\Seeders\PriceRuleSeeder;
use Database\Seeders\RoleAndPermissionSeeder;
use Database\Seeders\SectorAndUnitSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Hotel6ReservationPersonsPricingTest extends TestCase
{
    use RefreshDatabase;

    protected User $receptionist;

    protected Unit $hotel6Unit;

    protected Unit $regularUnit;

    protected Guest $guest;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleAndPermissionSeeder::class);
        $this->seed(PriceRuleSeeder::class);
        $this->seed(SectorAndUnitSeeder::class);

        $this->receptionist = User::factory()->create();
        $this->receptionist->assignRole('Receptionist');

        $this->guest = Guest::create([
            'name' => 'نزيل فندق 6 التجريبي',
            'phone' => '01011112222',
            'mil_code' => 'MIL-6600',
        ]);

        $hotel6 = Sector::where('name', 'فندق 6')->firstOrFail();
        $this->hotel6Unit = Unit::where('sector_id', $hotel6->id)->firstOrFail();

        $lusialSector = Sector::where('name', 'لوسيال')->firstOrFail();
        $this->regularUnit = Unit::where('sector_id', $lusialSector->id)->firstOrFail();
    }

    public function test_pricing_service_calculates_hotel6_proportional_rates_for_various_persons_counts(): void
    {
        $service = app(PricingService::class);

        // Hotel 6 member rate is 800 for 4 persons -> 200 per person per night
        // Test 4 persons (default): 3 nights * (200 * 4) = 2400
        $result4 = $service->calculate(
            $this->hotel6Unit,
            MembershipType::MEMBER->value,
            '2026-10-01',
            '2026-10-04',
            false,
            null,
            null,
            [],
            null,
            4
        );
        $this->assertTrue($result4['is_hotel6']);
        $this->assertEquals(4, $result4['unit_persons_count']);
        $this->assertEquals(200.0, $result4['person_rate_per_night']);
        $this->assertEquals(800.0, $result4['effective_rate_per_night']);
        $this->assertEquals(2400.0, $result4['room_price']);
        $this->assertEquals(2400.0, $result4['total_price']);

        // Test 5 persons (increased): 3 nights * (200 * 5) = 3000
        $result5 = $service->calculate(
            $this->hotel6Unit,
            MembershipType::MEMBER->value,
            '2026-10-01',
            '2026-10-04',
            false,
            null,
            null,
            [],
            null,
            5
        );
        $this->assertEquals(5, $result5['unit_persons_count']);
        $this->assertEquals(200.0, $result5['person_rate_per_night']);
        $this->assertEquals(1000.0, $result5['effective_rate_per_night']);
        $this->assertEquals(3000.0, $result5['room_price']);
        $this->assertEquals(3000.0, $result5['total_price']);

        // Test 2 persons (decreased): 3 nights * (200 * 2) = 1200
        $result2 = $service->calculate(
            $this->hotel6Unit,
            MembershipType::MEMBER->value,
            '2026-10-01',
            '2026-10-04',
            false,
            null,
            null,
            [],
            null,
            2
        );
        $this->assertEquals(2, $result2['unit_persons_count']);
        $this->assertEquals(200.0, $result2['person_rate_per_night']);
        $this->assertEquals(400.0, $result2['effective_rate_per_night']);
        $this->assertEquals(1200.0, $result2['room_price']);
        $this->assertEquals(1200.0, $result2['total_price']);

        // Test 1 person (minimum): 3 nights * (200 * 1) = 600
        $result1 = $service->calculate(
            $this->hotel6Unit,
            MembershipType::MEMBER->value,
            '2026-10-01',
            '2026-10-04',
            false,
            null,
            null,
            [],
            null,
            1
        );
        $this->assertEquals(1, $result1['unit_persons_count']);
        $this->assertEquals(200.0, $result1['person_rate_per_night']);
        $this->assertEquals(200.0, $result1['effective_rate_per_night']);
        $this->assertEquals(600.0, $result1['room_price']);

        // Test Non-Member (base 1400 -> 350 per person per night)
        // 2 nights * (350 * 3 persons) = 2100
        $resultNonMember = $service->calculate(
            $this->hotel6Unit,
            MembershipType::NON_MEMBER->value,
            '2026-10-01',
            '2026-10-03',
            false,
            null,
            null,
            [],
            null,
            3
        );
        $this->assertEquals(3, $resultNonMember['unit_persons_count']);
        $this->assertEquals(350.0, $resultNonMember['person_rate_per_night']);
        $this->assertEquals(1050.0, $resultNonMember['effective_rate_per_night']);
        $this->assertEquals(2100.0, $resultNonMember['room_price']);
    }

    public function test_receptionist_can_create_hotel6_reservation_with_custom_unit_persons(): void
    {
        // 2 nights stay for member in Hotel 6 with 5 persons:
        // 2 nights * (200 * 5) = 2000.00
        $response = $this->actingAs($this->receptionist)->post(
            route('reservations.store'),
            [
                'guest_id' => $this->guest->id,
                'unit_id' => $this->hotel6Unit->id,
                'check_in' => '2026-10-01',
                'check_out' => '2026-10-03',
                'status' => ReservationStatus::CONFIRMED->value,
                'type' => ReservationType::BRANCH->value,
                'membership' => MembershipType::MEMBER->value,
                'unit_persons_count' => 5,
                'total_price' => 2000.00,
            ]
        );

        $response->assertRedirect(route('reservations.index'));
        $this->assertDatabaseHas('reservations', [
            'guest_id' => $this->guest->id,
            'unit_id' => $this->hotel6Unit->id,
            'unit_persons_count' => 5,
            'total_price' => 2000.00,
        ]);
    }

    public function test_receptionist_can_create_hotel6_reservation_with_both_custom_unit_persons_and_meals(): void
    {
        // 2 nights stay for member in Hotel 6 with 3 persons:
        // Room: 2 nights * (200 * 3) = 1200
        // Meals: 3 persons * 450 * 2 nights = 2700
        // Total = 1200 + 2700 = 3900
        $response = $this->actingAs($this->receptionist)->post(
            route('reservations.store'),
            [
                'guest_id' => $this->guest->id,
                'unit_id' => $this->hotel6Unit->id,
                'check_in' => '2026-10-01',
                'check_out' => '2026-10-03',
                'status' => ReservationStatus::CONFIRMED->value,
                'type' => ReservationType::BRANCH->value,
                'membership' => MembershipType::MEMBER->value,
                'unit_persons_count' => 3,
                'has_meals' => true,
                'meals_persons_count' => 3,
                'meals_start_date' => '2026-10-01',
                'meals_end_date' => '2026-10-03',
                'total_price' => 3900.00,
            ]
        );

        $response->assertRedirect(route('reservations.index'));
        $this->assertDatabaseHas('reservations', [
            'guest_id' => $this->guest->id,
            'unit_id' => $this->hotel6Unit->id,
            'unit_persons_count' => 3,
            'has_meals' => 1,
            'meals_persons_count' => 3,
            'meals_total_price' => 2700.00,
            'total_price' => 3900.00,
        ]);
    }

    public function test_price_validation_fails_if_hotel6_custom_persons_total_tampered(): void
    {
        // Expected total for 5 persons (2 nights) is 2000, but receptionist sends 1200 without override permission
        $response = $this->actingAs($this->receptionist)->post(
            route('reservations.store'),
            [
                'guest_id' => $this->guest->id,
                'unit_id' => $this->hotel6Unit->id,
                'check_in' => '2026-10-01',
                'check_out' => '2026-10-03',
                'status' => ReservationStatus::CONFIRMED->value,
                'type' => ReservationType::BRANCH->value,
                'membership' => MembershipType::MEMBER->value,
                'unit_persons_count' => 5,
                'total_price' => 1200.00,
            ]
        );

        $response->assertSessionHasErrors(['total_price']);
        $this->assertEquals(0, Reservation::count());
    }

    public function test_receptionist_can_update_hotel6_unit_persons_count(): void
    {
        // Initially 4 persons: 2 nights * 800 = 1600
        $reservation = Reservation::create([
            'guest_id' => $this->guest->id,
            'unit_id' => $this->hotel6Unit->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-03',
            'status' => ReservationStatus::CONFIRMED,
            'type' => ReservationType::BRANCH,
            'membership' => MembershipType::MEMBER,
            'unit_persons_count' => 4,
            'has_meals' => false,
            'total_price' => 1600.00,
            'created_by' => $this->receptionist->id,
        ]);

        // Update to 2 persons: 2 nights * (200 * 2) = 800
        $response = $this->actingAs($this->receptionist)->put(
            route('reservations.update', $reservation),
            [
                'guest_id' => $this->guest->id,
                'unit_id' => $this->hotel6Unit->id,
                'check_in' => '2026-10-01',
                'check_out' => '2026-10-03',
                'status' => ReservationStatus::CONFIRMED->value,
                'type' => ReservationType::BRANCH->value,
                'membership' => MembershipType::MEMBER->value,
                'unit_persons_count' => 2,
                'total_price' => 800.00,
            ]
        );

        $response->assertRedirect();
        $reservation->refresh();
        $this->assertEquals(2, $reservation->unit_persons_count);
        $this->assertEquals(800.00, (float) $reservation->total_price);
    }

    public function test_non_hotel6_unit_ignores_unit_persons_scaling(): void
    {
        // Lusial villa for member: 1300/night
        // 2 nights * 1300 = 2600. Even if unit_persons_count is 2, it is not scaled.
        $service = app(PricingService::class);
        $result = $service->calculate(
            $this->regularUnit,
            MembershipType::MEMBER->value,
            '2026-10-01',
            '2026-10-03',
            false,
            null,
            null,
            [],
            null,
            2
        );

        $this->assertFalse($result['is_hotel6']);
        $this->assertNull($result['unit_persons_count']);
        $this->assertEquals(1300.0, $result['rate_per_night']);
        $this->assertEquals(2600.0, $result['total_price']);

        // In store request, non-hotel6 resets unit_persons_count to null
        $response = $this->actingAs($this->receptionist)->post(
            route('reservations.store'),
            [
                'guest_id' => $this->guest->id,
                'unit_id' => $this->regularUnit->id,
                'check_in' => '2026-10-01',
                'check_out' => '2026-10-03',
                'status' => ReservationStatus::CONFIRMED->value,
                'type' => ReservationType::BRANCH->value,
                'membership' => MembershipType::MEMBER->value,
                'unit_persons_count' => 2,
                'total_price' => 2600.00,
            ]
        );

        $response->assertRedirect(route('reservations.index'));
        $this->assertDatabaseHas('reservations', [
            'guest_id' => $this->guest->id,
            'unit_id' => $this->regularUnit->id,
            'unit_persons_count' => null,
            'total_price' => 2600.00,
        ]);
    }
}
