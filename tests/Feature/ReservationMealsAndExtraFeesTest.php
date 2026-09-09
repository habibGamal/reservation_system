<?php

namespace Tests\Feature;

use App\Enums\MembershipType;
use App\Enums\ReservationStatus;
use App\Enums\ReservationType;
use App\Models\Guest;
use App\Models\PriceRule;
use App\Models\Reservation;
use App\Models\ReservationExtraFee;
use App\Models\Sector;
use App\Models\Unit;
use App\Models\User;
use App\Services\PricingService;
use Carbon\Carbon;
use Database\Seeders\PriceRuleSeeder;
use Database\Seeders\RoleAndPermissionSeeder;
use Database\Seeders\SectorAndUnitSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReservationMealsAndExtraFeesTest extends TestCase
{
    use RefreshDatabase;

    protected User $receptionist;

    protected User $admin;

    protected Unit $hotel6Unit;

    protected Unit $regularUnit;

    protected PriceRule $unitPriceRule;

    protected Guest $guest;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleAndPermissionSeeder::class);
        $this->seed(PriceRuleSeeder::class);
        $this->seed(SectorAndUnitSeeder::class);

        $this->receptionist = User::factory()->create();
        $this->receptionist->assignRole('Receptionist');

        $this->admin = User::factory()->create();
        $this->admin->assignRole('Admin');

        $this->guest = Guest::create([
            'name' => 'محمد أحمد إبراهيم',
            'phone' => '01012345678',
            'mil_code' => 'MIL-8899',
        ]);

        $hotel6 = Sector::where('name', 'فندق 6')->first();
        $this->hotel6Unit = Unit::where('sector_id', $hotel6->id)->first();

        $lusialSector = Sector::where('name', 'لوسيال')->first();
        $this->regularUnit = Unit::where('sector_id', $lusialSector->id)->first();
    }

    public function test_pricing_service_calculates_meals_and_extra_fees_correctly(): void
    {
        $service = app(PricingService::class);

        // 3 nights stay: 2026-10-01 to 2026-10-04 (Rate for member in hotel 6 is 800)
        // 3 nights * 800 = 2400 room price
        // Meals for 2 nights for 4 persons: 4 persons * 450 * 2 nights = 3600
        // Extra fees: 200 + 150 = 350
        // Total expected = 2400 + 3600 + 350 = 6350
        $result = $service->calculate(
            $this->hotel6Unit,
            MembershipType::MEMBER->value,
            '2026-10-01',
            '2026-10-04',
            true,
            '2026-10-01',
            '2026-10-03',
            [
                ['amount' => 200, 'description' => 'رسوم زائر إضافي'],
                ['amount' => 150, 'description' => 'تلف كاسة زجاجية'],
            ],
            4
        );

        $this->assertEquals(3, $result['nights']);
        $this->assertEquals(800.0, $result['rate_per_night']);
        $this->assertEquals(2400.0, $result['room_price']);
        $this->assertTrue($result['has_meals']);
        $this->assertEquals(4, $result['meals_persons_count']);
        $this->assertEquals(2, $result['meals_nights']);
        $this->assertEquals(450.0, $result['meals_rate_per_night']);
        $this->assertEquals(3600.0, $result['meals_total_price']);
        $this->assertEquals(350.0, $result['extra_fees_total']);
        $this->assertEquals(6350.0, $result['total_price']);
    }

    public function test_receptionist_can_create_reservation_with_meals_default_persons(): void
    {
        // 3 nights stay for member: 3 * 800 = 2400
        // Meals: 4 persons * 450 * 3 nights = 5400
        // Total: 7800
        $response = $this->actingAs($this->receptionist)->post(
            route('reservations.store'),
            [
                'guest_id' => $this->guest->id,
                'unit_id' => $this->hotel6Unit->id,
                'check_in' => '2026-10-01',
                'check_out' => '2026-10-04',
                'status' => ReservationStatus::CONFIRMED->value,
                'type' => ReservationType::BRANCH->value,
                'membership' => MembershipType::MEMBER->value,
                'has_meals' => true,
                'meals_persons_count' => 4,
                'meals_start_date' => '2026-10-01',
                'meals_end_date' => '2026-10-04',
                'total_price' => 7800.00,
            ]
        );

        $response->assertRedirect(route('reservations.index'));
        $this->assertDatabaseHas('reservations', [
            'guest_id' => $this->guest->id,
            'unit_id' => $this->hotel6Unit->id,
            'has_meals' => 1,
            'meals_persons_count' => 4,
            'meals_start_date' => '2026-10-01',
            'meals_end_date' => '2026-10-04',
            'meals_rate_per_night' => 450.00,
            'meals_total_price' => 5400.00,
            'total_price' => 7800.00,
        ]);
    }

    public function test_receptionist_can_create_reservation_with_custom_meals_persons(): void
    {
        // 2 nights stay: 2 * 800 = 1600
        // Meals: 5 persons * 450 * 2 nights = 4500
        // Total = 1600 + 4500 = 6100
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
                'has_meals' => true,
                'meals_persons_count' => 5,
                'meals_start_date' => '2026-10-01',
                'meals_end_date' => '2026-10-03',
                'total_price' => 6100.00,
            ]
        );

        $response->assertRedirect(route('reservations.index'));
        $this->assertDatabaseHas('reservations', [
            'guest_id' => $this->guest->id,
            'meals_persons_count' => 5,
            'meals_total_price' => 4500.00,
            'total_price' => 6100.00,
        ]);
    }

    public function test_receptionist_can_create_reservation_with_extra_fees(): void
    {
        // 3 nights stay for member: 3 * 800 = 2400
        // Extra fees: 250 + 100 = 350
        // Total = 2750
        $response = $this->actingAs($this->receptionist)->post(
            route('reservations.store'),
            [
                'guest_id' => $this->guest->id,
                'unit_id' => $this->hotel6Unit->id,
                'check_in' => '2026-10-01',
                'check_out' => '2026-10-04',
                'status' => ReservationStatus::CONFIRMED->value,
                'type' => ReservationType::BRANCH->value,
                'membership' => MembershipType::MEMBER->value,
                'has_meals' => false,
                'extra_fees' => [
                    ['description' => 'تلفيات باب الحمام', 'amount' => 250.00],
                    ['description' => 'زيارة ضيف إضافي', 'amount' => 100.00],
                ],
                'total_price' => 2750.00,
            ]
        );

        $response->assertRedirect(route('reservations.index'));

        $reservation = Reservation::where('guest_id', $this->guest->id)->first();
        $this->assertNotNull($reservation);
        $this->assertEquals(2750.00, $reservation->total_price);
        $this->assertCount(2, $reservation->extraFees);
        $this->assertEquals(350.00, $reservation->extra_fees_total);

        $this->assertDatabaseHas('reservation_extra_fees', [
            'reservation_id' => $reservation->id,
            'description' => 'تلفيات باب الحمام',
            'amount' => 250.00,
            'created_by' => $this->receptionist->id,
        ]);
    }

    public function test_receptionist_can_create_reservation_with_both_meals_and_extra_fees(): void
    {
        // 3 nights for member: 3 * 800 = 2400
        // Meals 2 nights for 4 persons: 4 * 450 * 2 = 3600
        // Extra fee: 150
        // Total = 6150
        $response = $this->actingAs($this->receptionist)->post(
            route('reservations.store'),
            [
                'guest_id' => $this->guest->id,
                'unit_id' => $this->hotel6Unit->id,
                'check_in' => '2026-10-01',
                'check_out' => '2026-10-04',
                'status' => ReservationStatus::CONFIRMED->value,
                'type' => ReservationType::BRANCH->value,
                'membership' => MembershipType::MEMBER->value,
                'has_meals' => true,
                'meals_persons_count' => 4,
                'meals_start_date' => '2026-10-01',
                'meals_end_date' => '2026-10-03',
                'extra_fees' => [
                    ['description' => 'كسر مفتاح الغرفة', 'amount' => 150.00],
                ],
                'total_price' => 6150.00,
            ]
        );

        $response->assertRedirect(route('reservations.index'));

        $reservation = Reservation::where('guest_id', $this->guest->id)->first();
        $this->assertNotNull($reservation);
        $this->assertEquals(6150.00, $reservation->total_price);
        $this->assertEquals(3600.00, $reservation->meals_total_price);
        $this->assertEquals(150.00, $reservation->extra_fees_total);
    }

    public function test_price_validation_fails_if_total_tampered_without_permission(): void
    {
        // Expected total is 6150, but receptionist sends 4000 without override permission
        $response = $this->actingAs($this->receptionist)->post(
            route('reservations.store'),
            [
                'guest_id' => $this->guest->id,
                'unit_id' => $this->hotel6Unit->id,
                'check_in' => '2026-10-01',
                'check_out' => '2026-10-04',
                'status' => ReservationStatus::CONFIRMED->value,
                'type' => ReservationType::BRANCH->value,
                'membership' => MembershipType::MEMBER->value,
                'has_meals' => true,
                'meals_persons_count' => 4,
                'meals_start_date' => '2026-10-01',
                'meals_end_date' => '2026-10-03',
                'extra_fees' => [
                    ['description' => 'كسر مفتاح الغرفة', 'amount' => 150.00],
                ],
                'total_price' => 4000.00,
            ]
        );

        $response->assertSessionHasErrors(['total_price']);
        $this->assertEquals(0, Reservation::count());
    }

    public function test_receptionist_can_update_reservation_meals_and_sync_extra_fees(): void
    {
        // First create reservation with 1 fee: room (2400) + fee (150) = 2550
        $reservation = Reservation::create([
            'guest_id' => $this->guest->id,
            'unit_id' => $this->hotel6Unit->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-04',
            'status' => ReservationStatus::CONFIRMED,
            'type' => ReservationType::BRANCH,
            'membership' => MembershipType::MEMBER,
            'has_meals' => false,
            'total_price' => 2550.00,
            'created_by' => $this->receptionist->id,
        ]);

        $initialFee = ReservationExtraFee::create([
            'reservation_id' => $reservation->id,
            'description' => 'رسوم قديمة',
            'amount' => 150.00,
            'created_by' => $this->receptionist->id,
        ]);

        // Now update: enable meals (4 persons * 450 * 1 night = 1800), replace fee with 300
        // New expected total: 2400 (room) + 1800 (meals) + 300 (fee) = 4500
        $response = $this->actingAs($this->receptionist)->put(
            route('reservations.update', $reservation),
            [
                'guest_id' => $this->guest->id,
                'unit_id' => $this->hotel6Unit->id,
                'check_in' => '2026-10-01',
                'check_out' => '2026-10-04',
                'status' => ReservationStatus::CONFIRMED->value,
                'type' => ReservationType::BRANCH->value,
                'membership' => MembershipType::MEMBER->value,
                'has_meals' => true,
                'meals_persons_count' => 4,
                'meals_start_date' => '2026-10-01',
                'meals_end_date' => '2026-10-02',
                'extra_fees' => [
                    ['description' => 'رسوم جديدة محدثة', 'amount' => 300.00],
                ],
                'total_price' => 4500.00,
            ]
        );

        $response->assertRedirect();

        $reservation->refresh();
        $this->assertTrue($reservation->has_meals);
        $this->assertEquals(4, $reservation->meals_persons_count);
        $this->assertEquals(1800.00, $reservation->meals_total_price);
        $this->assertEquals(4500.00, $reservation->total_price);

        // Verify old fee replaced with new fee
        $this->assertDatabaseMissing('reservation_extra_fees', [
            'id' => $initialFee->id,
        ]);
        $this->assertDatabaseHas('reservation_extra_fees', [
            'reservation_id' => $reservation->id,
            'description' => 'رسوم جديدة محدثة',
            'amount' => 300.00,
        ]);
    }

    public function test_todays_meals_count_accessor(): void
    {
        $today = Carbon::today()->format('Y-m-d');
        $tomorrow = Carbon::tomorrow()->format('Y-m-d');
        $yesterday = Carbon::yesterday()->format('Y-m-d');

        // Active today: start today, end tomorrow
        $activeRes = new Reservation([
            'has_meals' => true,
            'meals_persons_count' => 6,
            'meals_start_date' => $today,
            'meals_end_date' => $tomorrow,
        ]);
        $this->assertEquals(6, $activeRes->todays_meals_count);

        // Ended yesterday
        $pastRes = new Reservation([
            'has_meals' => true,
            'meals_persons_count' => 4,
            'meals_start_date' => Carbon::today()->subDays(5)->format('Y-m-d'),
            'meals_end_date' => $yesterday,
        ]);
        $this->assertEquals(0, $pastRes->todays_meals_count);

        // Future start
        $futureRes = new Reservation([
            'has_meals' => true,
            'meals_persons_count' => 4,
            'meals_start_date' => $tomorrow,
            'meals_end_date' => Carbon::today()->addDays(4)->format('Y-m-d'),
        ]);
        $this->assertEquals(0, $futureRes->todays_meals_count);

        // No meals
        $noMealsRes = new Reservation([
            'has_meals' => false,
            'meals_persons_count' => 4,
            'meals_start_date' => $today,
            'meals_end_date' => $tomorrow,
        ]);
        $this->assertEquals(0, $noMealsRes->todays_meals_count);
    }

    public function test_meal_rate_can_be_configured_in_price_rules(): void
    {
        $mealRule = PriceRule::where('type', PriceRule::TYPE_MEAL)->first();
        $this->assertNotNull($mealRule);
        $this->assertEquals(450.0, PriceRule::getMealRate());

        // Update rate to 550
        $response = $this->actingAs($this->admin)->put(
            route('price-rules.update', $mealRule),
            [
                'name' => 'وجبات غذائية',
                'type' => 'meal',
                'rules' => [
                    'price_per_night' => 550,
                ],
            ]
        );

        $response->assertRedirect();
        $this->assertEquals(550.0, PriceRule::getMealRate());
    }

    public function test_sector_has_meals_can_be_toggled(): void
    {
        $sector = Sector::where('name', 'فندق 6')->first();
        $this->assertTrue($sector->has_meals);

        // Update to disable meals
        $response = $this->actingAs($this->admin)->put(
            route('sectors.update', $sector),
            [
                'name' => 'فندق 6',
                'has_meals' => false,
            ]
        );

        $response->assertRedirect();
        $sector->refresh();
        $this->assertFalse($sector->has_meals);
    }

    public function test_receptionist_can_create_reservation_when_meals_fields_are_omitted(): void
    {
        // 2 nights for member in hotel6: 2 * 800 = 1600. No meals sent in payload.
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
                'total_price' => 1600.00,
            ]
        );

        $response->assertRedirect(route('reservations.index'));

        $reservation = Reservation::where('guest_id', $this->guest->id)->latest('id')->first();
        $this->assertNotNull($reservation);
        $this->assertFalse($reservation->has_meals);
        $this->assertNull($reservation->meals_persons_count);
        $this->assertNull($reservation->meals_start_date);
        $this->assertNull($reservation->meals_end_date);
        $this->assertEquals(0.00, (float) $reservation->meals_total_price);
        $this->assertEquals(1600.00, (float) $reservation->total_price);
    }

    public function test_receptionist_can_update_reservation_and_remove_meals_when_meals_fields_are_omitted(): void
    {
        // Initially has meals: room (2400) + meals (4 * 450 * 1 = 1800) = 4200
        $reservation = Reservation::create([
            'guest_id' => $this->guest->id,
            'unit_id' => $this->hotel6Unit->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-04',
            'status' => ReservationStatus::CONFIRMED,
            'type' => ReservationType::BRANCH,
            'membership' => MembershipType::MEMBER,
            'has_meals' => true,
            'meals_persons_count' => 4,
            'meals_start_date' => '2026-10-01',
            'meals_end_date' => '2026-10-02',
            'meals_rate_per_night' => 450.00,
            'meals_total_price' => 1800.00,
            'total_price' => 4200.00,
            'created_by' => $this->receptionist->id,
        ]);

        // Update with NO meals fields in payload (meals toggled off)
        // New price should be just room (3 nights * 800 = 2400)
        $response = $this->actingAs($this->receptionist)->put(
            route('reservations.update', $reservation),
            [
                'guest_id' => $this->guest->id,
                'unit_id' => $this->hotel6Unit->id,
                'check_in' => '2026-10-01',
                'check_out' => '2026-10-04',
                'status' => ReservationStatus::CONFIRMED->value,
                'type' => ReservationType::BRANCH->value,
                'membership' => MembershipType::MEMBER->value,
                'total_price' => 2400.00,
            ]
        );

        $response->assertRedirect();

        $reservation->refresh();
        $this->assertFalse($reservation->has_meals);
        $this->assertNull($reservation->meals_persons_count);
        $this->assertNull($reservation->meals_start_date);
        $this->assertNull($reservation->meals_end_date);
        $this->assertEquals(0.00, (float) $reservation->meals_total_price);
        $this->assertEquals(2400.00, (float) $reservation->total_price);
    }
}
