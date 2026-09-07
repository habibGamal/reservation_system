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
use App\Services\PricingService;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PricingServiceTest extends TestCase
{
    use RefreshDatabase;

    protected User $receptionist;

    protected User $admin;

    protected Unit $unitWithPricing;

    protected PriceRule $priceRule;

    protected Guest $guest;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleAndPermissionSeeder::class);

        $this->receptionist = User::factory()->create();
        $this->receptionist->assignRole('Receptionist');

        $this->admin = User::factory()->create();
        $this->admin->assignRole('Admin');

        $sector = Sector::create(['name' => 'لوسيال']);

        $this->priceRule = PriceRule::create([
            'name' => 'تسعير صيف 2026',
            'rules' => [
                'عضو' => 400,
                'غير عضو' => 700,
                'مرافق' => 550,
                'مدني' => 850,
            ],
        ]);

        $this->unitWithPricing = Unit::create([
            'sector_id' => $sector->id,
            'price_rule_id' => $this->priceRule->id,
            'name' => 'شاليه 12',
            'rooms_count' => 2,
        ]);

        $this->guest = Guest::create([
            'name' => 'سامي علي',
            'phone' => '01009988776',
            'mil_code' => 'MIL-456',
        ]);
    }

    public function test_pricing_service_computes_correct_totals_for_different_memberships(): void
    {
        $service = app(PricingService::class);

        // 3 nights stay: 2026-10-01 to 2026-10-04
        $memberResult = $service->calculate(
            $this->unitWithPricing,
            MembershipType::MEMBER->value,
            '2026-10-01',
            '2026-10-04'
        );

        $this->assertEquals(3, $memberResult['nights']);
        $this->assertEquals(400.00, $memberResult['rate_per_night']);
        $this->assertEquals(1200.00, $memberResult['total_price']);
        $this->assertEquals('تسعير صيف 2026', $memberResult['price_rule_name']);

        // Non-Member
        $nonMemberResult = $service->calculate(
            $this->unitWithPricing,
            MembershipType::NON_MEMBER->value,
            '2026-10-01',
            '2026-10-04'
        );

        $this->assertEquals(3, $nonMemberResult['nights']);
        $this->assertEquals(700.00, $nonMemberResult['rate_per_night']);
        $this->assertEquals(2100.00, $nonMemberResult['total_price']);

        // Companion
        $companionResult = $service->calculate(
            $this->unitWithPricing,
            MembershipType::COMPANION->value,
            '2026-10-01',
            '2026-10-04'
        );
        $this->assertEquals(1650.00, $companionResult['total_price']);

        // Civilian
        $civilianResult = $service->calculate(
            $this->unitWithPricing,
            MembershipType::CIVILIAN->value,
            '2026-10-01',
            '2026-10-04'
        );
        $this->assertEquals(2550.00, $civilianResult['total_price']);
    }

    public function test_calculate_price_endpoint_returns_json_preview(): void
    {
        $response = $this->actingAs($this->receptionist)->postJson(
            route('reservations.calculate-price'),
            [
                'unit_id' => $this->unitWithPricing->id,
                'membership' => MembershipType::MEMBER->value,
                'check_in' => '2026-10-01',
                'check_out' => '2026-10-05', // 4 nights
            ]
        );

        $response->assertOk();
        $response->assertJson([
            'nights' => 4,
            'rate_per_night' => 400.0,
            'total_price' => 1600.0,
            'price_rule_name' => 'تسعير صيف 2026',
        ]);
    }

    public function test_receptionist_can_create_reservation_with_matching_calculated_price(): void
    {
        // 3 nights * 400 = 1200 EGP
        $response = $this->actingAs($this->receptionist)->post(
            route('reservations.store'),
            [
                'guest_id' => $this->guest->id,
                'unit_id' => $this->unitWithPricing->id,
                'check_in' => '2026-10-01',
                'check_out' => '2026-10-04',
                'status' => ReservationStatus::CONFIRMED->value,
                'type' => ReservationType::BRANCH->value,
                'membership' => MembershipType::MEMBER->value,
                'total_price' => 1200.00,
            ]
        );

        $response->assertRedirect(route('reservations.index'));
        $this->assertDatabaseHas('reservations', [
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unitWithPricing->id,
            'total_price' => 1200.00,
        ]);
    }

    public function test_receptionist_cannot_override_calculated_price_without_permission(): void
    {
        // Expected price is 1200 EGP, but receptionist tries to enter 900 EGP
        $response = $this->actingAs($this->receptionist)->post(
            route('reservations.store'),
            [
                'guest_id' => $this->guest->id,
                'unit_id' => $this->unitWithPricing->id,
                'check_in' => '2026-10-01',
                'check_out' => '2026-10-04',
                'status' => ReservationStatus::CONFIRMED->value,
                'type' => ReservationType::BRANCH->value,
                'membership' => MembershipType::MEMBER->value,
                'total_price' => 900.00,
            ]
        );

        $response->assertSessionHasErrors(['total_price']);
        $this->assertEquals(0, Reservation::count());
    }

    public function test_admin_with_override_permission_can_override_price_with_notes(): void
    {
        // Calculated price is 2100 (3 nights * 700 for Non-Member), Admin overrides to 1800 with justification
        $response = $this->actingAs($this->admin)->post(
            route('reservations.store'),
            [
                'guest_id' => $this->guest->id,
                'unit_id' => $this->unitWithPricing->id,
                'check_in' => '2026-10-01',
                'check_out' => '2026-10-04',
                'status' => ReservationStatus::CONFIRMED->value,
                'type' => ReservationType::BRANCH->value,
                'membership' => MembershipType::NON_MEMBER->value,
                'total_price' => 1800.00,
                'notes' => 'خصم معتمد بقرار من مدير المنتجع',
            ]
        );

        $response->assertRedirect(route('reservations.index'));
        $this->assertDatabaseHas('reservations', [
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unitWithPricing->id,
            'total_price' => 1800.00,
            'notes' => 'خصم معتمد بقرار من مدير المنتجع',
        ]);
    }

    public function test_admin_can_manage_price_rules(): void
    {
        // Create a new price rule
        $response = $this->actingAs($this->admin)->post(route('price-rules.store'), [
            'name' => 'تسعير الشتاء 2026',
            'rules' => [
                'عضو' => 300,
                'غير عضو' => 500,
                'مرافق' => 400,
                'مدني' => 600,
            ],
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('price_rules', [
            'name' => 'تسعير الشتاء 2026',
        ]);
    }
}
