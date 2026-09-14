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
use Carbon\Carbon;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ReservationCheckoutTodayFilterTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected Sector $sector;

    protected Unit $unit;

    protected Guest $guest;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleAndPermissionSeeder::class);

        $this->admin = User::factory()->create(['name' => 'ادمن']);
        $this->admin->assignRole('Admin');

        $this->sector = Sector::create(['name' => 'قطاع الاختبار']);

        $priceRule = PriceRule::create([
            'name' => 'قاعدة السعر',
            'rules' => ['عضو' => 500.0],
        ]);

        $this->unit = Unit::create([
            'name' => '101',
            'sector_id' => $this->sector->id,
            'rooms_count' => 1,
            'price_rule_id' => $priceRule->id,
        ]);

        $this->guest = Guest::create([
            'name' => 'علي حسن',
            'phone' => '01011111111',
        ]);
    }

    public function test_filter_returns_only_reservations_due_for_checkout_today(): void
    {
        $today = Carbon::today()->toDateString();
        $inDate = Carbon::today()->subDays(2)->toDateString();
        $futureDate = Carbon::today()->addDays(2)->toDateString();

        // Res 1: Due today, status Checked In -> SHOULD MATCH
        $res1 = Reservation::create([
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => $inDate,
            'check_out' => $today,
            'status' => ReservationStatus::CHECKED_IN->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1000,
        ]);

        // Res 2: Due today, but ALREADY DEPARTED -> SHOULD NOT MATCH
        Reservation::create([
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => $inDate,
            'check_out' => $today,
            'status' => ReservationStatus::DEPARTED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1000,
        ]);

        // Res 3: Check-out in the future -> SHOULD NOT MATCH
        Reservation::create([
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => $today,
            'check_out' => $futureDate,
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1000,
        ]);

        $response = $this->actingAs($this->admin)
            ->get(route('reservations.index', ['checkout_today' => '1', 'date_preset' => 'all']));

        $response->assertOk();

        $response->assertInertia(fn (Assert $page) => $page
            ->component('reservations/index')
            ->has('reservations', 1)
            ->where('reservations.0.id', $res1->id)
            ->where('reservations.0.is_checkout_today', true)
            ->where('stats.checkout_today', 1)
            ->where('filters.checkout_today', true)
        );
    }

    public function test_reservation_model_attributes(): void
    {
        $today = Carbon::today()->toDateString();
        $pastDate = Carbon::today()->subDays(1)->toDateString();
        $inDate = Carbon::today()->subDays(3)->toDateString();

        $resToday = Reservation::create([
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => $inDate,
            'check_out' => $today,
            'status' => ReservationStatus::CHECKED_IN->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1000,
        ]);

        $this->assertTrue($resToday->is_checkout_today);
        $this->assertFalse($resToday->is_checkout_overdue);

        $resOverdue = Reservation::create([
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => $inDate,
            'check_out' => $pastDate,
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1000,
        ]);

        $this->assertFalse($resOverdue->is_checkout_today);
        $this->assertTrue($resOverdue->is_checkout_overdue);
    }

    public function test_checkout_today_filter_works_with_default_period_dates(): void
    {
        $today = Carbon::today()->toDateString();
        $inDate = Carbon::today()->subDays(10)->toDateString();

        // Res due today that started 10 days ago (outside current Friday-to-Thursday range)
        $res = Reservation::create([
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => $inDate,
            'check_out' => $today,
            'status' => ReservationStatus::CHECKED_IN->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 2000,
        ]);

        $response = $this->actingAs($this->admin)
            ->get(route('reservations.index', ['checkout_today' => '1']));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('reservations/index')
            ->has('reservations', 1)
            ->where('reservations.0.id', $res->id)
            ->where('filters.checkout_today', true)
        );
    }
}
