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

class PriceRuleCustomOptionsTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleAndPermissionSeeder::class);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('Super Admin');
    }

    public function test_can_create_price_rule_with_additional_custom_options(): void
    {
        $response = $this->actingAs($this->admin)->post(route('price-rules.store'), [
            'name' => 'تسعير كبار الزوار',
            'rules' => [
                'عضو' => 500,
                'غير عضو' => 800,
                'مرافق' => 600,
                'مدني' => 1000,
                'رتبة خاصة' => 400,
                'VIP' => 1500,
            ],
        ]);

        $response->assertRedirect();
        $rule = PriceRule::where('name', 'تسعير كبار الزوار')->first();
        $this->assertNotNull($rule);
        $this->assertEquals(400, $rule->rules['رتبة خاصة']);
        $this->assertEquals(1500, $rule->rules['VIP']);
        $this->assertEquals(500, $rule->rules['عضو']);
    }

    public function test_rejects_negative_price_in_custom_options(): void
    {
        $response = $this->actingAs($this->admin)->post(route('price-rules.store'), [
            'name' => 'تسعير غير صالح',
            'rules' => [
                'عضو' => 500,
                'غير عضو' => 800,
                'مرافق' => 600,
                'مدني' => 1000,
                'رتبة خاصة' => -50,
            ],
        ]);

        $response->assertSessionHasErrors(['rules.رتبة خاصة']);
    }

    public function test_can_update_price_rule_to_add_and_modify_custom_options(): void
    {
        $rule = PriceRule::create([
            'name' => 'تسعير أساسي',
            'rules' => [
                'عضو' => 300,
                'غير عضو' => 500,
                'مرافق' => 400,
                'مدني' => 600,
            ],
        ]);

        $response = $this->actingAs($this->admin)->put(route('price-rules.update', $rule), [
            'name' => 'تسعير أساسي معدل',
            'rules' => [
                'عضو' => 350,
                'غير عضو' => 550,
                'مرافق' => 450,
                'مدني' => 650,
                'جهة خارجية' => 750,
            ],
        ]);

        $response->assertRedirect();
        $rule->refresh();
        $this->assertEquals('تسعير أساسي معدل', $rule->name);
        $this->assertEquals(750, $rule->rules['جهة خارجية']);
        $this->assertEquals(350, $rule->rules['عضو']);
    }

    public function test_pricing_service_calculates_correctly_with_custom_membership_option(): void
    {
        $sector = Sector::create(['name' => 'قطاع الفيلات']);
        $rule = PriceRule::create([
            'name' => 'تسعير الفيلات',
            'rules' => [
                'عضو' => 400,
                'غير عضو' => 700,
                'مرافق' => 500,
                'مدني' => 900,
                'سياحة' => 1200,
            ],
        ]);
        $unit = Unit::create([
            'sector_id' => $sector->id,
            'price_rule_id' => $rule->id,
            'name' => 'فيلا 1',
            'rooms_count' => 3,
        ]);

        $pricingService = new PricingService();
        $calc = $pricingService->calculate(
            $unit,
            'سياحة',
            '2026-10-01',
            '2026-10-04' // 3 nights
        );

        $this->assertEquals(3, $calc['nights']);
        $this->assertEquals(1200.0, $calc['rate_per_night']);
        $this->assertEquals(3600.0, $calc['total_price']);
    }

    public function test_can_create_reservation_with_custom_membership_option(): void
    {
        $sector = Sector::create(['name' => 'قطاع شاليهات']);
        $rule = PriceRule::create([
            'name' => 'تسعير شاليهات',
            'rules' => [
                'عضو' => 300,
                'غير عضو' => 500,
                'مرافق' => 400,
                'مدني' => 600,
                'دبلوماسي' => 1000,
            ],
        ]);
        $unit = Unit::create([
            'sector_id' => $sector->id,
            'price_rule_id' => $rule->id,
            'name' => 'شاليه 10',
            'rooms_count' => 2,
        ]);
        $guest = Guest::create([
            'name' => 'جون دو',
            'phone' => '01099999999',
        ]);

        $response = $this->actingAs($this->admin)->post(route('reservations.store'), [
            'guest_id' => $guest->id,
            'unit_id' => $unit->id,
            'check_in' => '2026-11-01',
            'check_out' => '2026-11-03',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => 'دبلوماسي',
            'total_price' => 2000,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('reservations', [
            'guest_id' => $guest->id,
            'unit_id' => $unit->id,
            'membership' => 'دبلوماسي',
        ]);

        $reservation = Reservation::where('guest_id', $guest->id)->first();
        $this->assertEquals('دبلوماسي', $reservation->membership);
    }

    public function test_standard_membership_still_casts_properly(): void
    {
        $sector = Sector::create(['name' => 'قطاع شاليهات 2']);
        $unit = Unit::create([
            'sector_id' => $sector->id,
            'name' => 'شاليه 11',
            'rooms_count' => 2,
        ]);
        $guest = Guest::create([
            'name' => 'أحمد علي',
            'phone' => '01088888888',
        ]);

        $reservation = Reservation::create([
            'guest_id' => $guest->id,
            'unit_id' => $unit->id,
            'check_in' => '2026-11-01',
            'check_out' => '2026-11-03',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER,
            'total_price' => 600,
        ]);

        $this->assertEquals(MembershipType::MEMBER, $reservation->membership);
        $this->assertEquals('عضو', $reservation->membership->value);
    }

    public function test_cannot_create_reservation_with_custom_option_not_assigned_to_unit_rule(): void
    {
        $sector = Sector::create(['name' => 'قطاع شاليهات 3']);
        $rule = PriceRule::create([
            'name' => 'تسعير قياسي بدون خيارات إضافية',
            'rules' => [
                'عضو' => 300,
                'غير عضو' => 500,
                'مرافق' => 400,
                'مدني' => 600,
            ],
        ]);
        $unit = Unit::create([
            'sector_id' => $sector->id,
            'price_rule_id' => $rule->id,
            'name' => 'شاليه 12',
            'rooms_count' => 2,
        ]);
        $guest = Guest::create([
            'name' => 'علي حسن',
            'phone' => '01077777777',
        ]);

        $response = $this->actingAs($this->admin)->post(route('reservations.store'), [
            'guest_id' => $guest->id,
            'unit_id' => $unit->id,
            'check_in' => '2026-11-01',
            'check_out' => '2026-11-03',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => 'VIP', // VIP is not assigned to this unit's rule
            'total_price' => 1000,
        ]);

        $response->assertSessionHasErrors(['membership']);
    }
}
