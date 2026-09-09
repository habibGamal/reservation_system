<?php

namespace Tests\Feature;

use App\Enums\MembershipType;
use App\Enums\PaymentMethod;
use App\Enums\ReservationStatus;
use App\Enums\ReservationType;
use App\Models\Guest;
use App\Models\Payment;
use App\Models\Reservation;
use App\Models\Sector;
use App\Models\Unit;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ReservationDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected Sector $sectorA;

    protected Sector $sectorB;

    protected Unit $unitA;

    protected Unit $unitB;

    protected Guest $guest1;

    protected Guest $guest2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleAndPermissionSeeder::class);

        $this->user = User::factory()->create();
        $this->user->assignRole('Receptionist');

        $this->sectorA = Sector::create(['name' => 'لوسيال']);
        $this->sectorB = Sector::create(['name' => 'الفندق 1']);

        $this->unitA = Unit::create([
            'sector_id' => $this->sectorA->id,
            'name' => 'A-101',
            'rooms_count' => 2,
        ]);

        $this->unitB = Unit::create([
            'sector_id' => $this->sectorB->id,
            'name' => 'B-201',
            'rooms_count' => 1,
        ]);

        $this->guest1 = Guest::create([
            'name' => 'أحمد منصور',
            'phone' => '01011112222',
            'mil_code' => 'MIL-9988',
        ]);

        $this->guest2 = Guest::create([
            'name' => 'محمود مصطفى',
            'phone' => '01233334444',
            'mil_code' => 'MIL-7766',
        ]);
    }

    public function test_receptionist_can_view_dashboard_with_kpis(): void
    {
        // Res 1: Checked-in, Total 2000, Paid 2000 (Fully Paid)
        $res1 = Reservation::create([
            'guest_id' => $this->guest1->id,
            'unit_id' => $this->unitA->id,
            'check_in' => Carbon::today()->subDay()->toDateString(),
            'check_out' => Carbon::today()->addDays(3)->toDateString(),
            'status' => ReservationStatus::CHECKED_IN->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 2000.00,
        ]);
        Payment::create([
            'reservation_id' => $res1->id,
            'amount' => 2000.00,
            'method' => PaymentMethod::CASH->value,
        ]);

        // Res 2: Confirmed, Total 1500, Paid 500 (Partially Paid)
        $res2 = Reservation::create([
            'guest_id' => $this->guest2->id,
            'unit_id' => $this->unitB->id,
            'check_in' => Carbon::today()->addDays(5)->toDateString(),
            'check_out' => Carbon::today()->addDays(8)->toDateString(),
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::MANAGEMENT->value,
            'membership' => MembershipType::NON_MEMBER->value,
            'total_price' => 1500.00,
        ]);
        Payment::create([
            'reservation_id' => $res2->id,
            'amount' => 500.00,
            'method' => PaymentMethod::VISA->value,
        ]);

        // Res 3: Waiting, Total 1000, Paid 0 (Unpaid)
        Reservation::create([
            'guest_id' => $this->guest1->id,
            'unit_id' => $this->unitA->id,
            'check_in' => Carbon::today()->addDays(10)->toDateString(),
            'check_out' => Carbon::today()->addDays(12)->toDateString(),
            'status' => ReservationStatus::WAITING->value,
            'type' => ReservationType::RESORT->value,
            'membership' => MembershipType::CIVILIAN->value,
            'total_price' => 1000.00,
        ]);

        // Res 4: Departed, Total 800
        Reservation::create([
            'guest_id' => $this->guest2->id,
            'unit_id' => $this->unitB->id,
            'check_in' => Carbon::today()->subDays(10)->toDateString(),
            'check_out' => Carbon::today()->subDays(7)->toDateString(),
            'status' => ReservationStatus::DEPARTED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::COMPANION->value,
            'total_price' => 800.00,
        ]);

        $response = $this->actingAs($this->user)->get(route('reservations.index'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('reservations/index')
            ->has('reservations', 4)
            ->where('stats.total', 4)
            ->where('stats.checked_in', 1)
            ->where('stats.confirmed', 1)
            ->where('stats.waiting', 1)
            ->where('stats.departed', 1)
            ->where('stats.total_expected_revenue', 5300)
            ->where('stats.total_collected_revenue', 2500)
            ->where('stats.total_outstanding_balance', 2800)
        );
    }

    public function test_dashboard_filters_by_search_query(): void
    {
        Reservation::create([
            'guest_id' => $this->guest1->id,
            'unit_id' => $this->unitA->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1000.00,
        ]);

        Reservation::create([
            'guest_id' => $this->guest2->id,
            'unit_id' => $this->unitB->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1000.00,
        ]);

        // Search by guest name
        $responseName = $this->actingAs($this->user)->get(route('reservations.index', ['search' => 'أحمد']));
        $responseName->assertOk();
        $responseName->assertInertia(fn (Assert $page) => $page
            ->has('reservations', 1)
            ->where('reservations.0.guest.name', 'أحمد منصور')
        );

        // Search by phone
        $responsePhone = $this->actingAs($this->user)->get(route('reservations.index', ['search' => '01233334444']));
        $responsePhone->assertOk();
        $responsePhone->assertInertia(fn (Assert $page) => $page
            ->has('reservations', 1)
            ->where('reservations.0.guest.name', 'محمود مصطفى')
        );

        // Search by mil_code
        $responseMil = $this->actingAs($this->user)->get(route('reservations.index', ['search' => '9988']));
        $responseMil->assertOk();
        $responseMil->assertInertia(fn (Assert $page) => $page
            ->has('reservations', 1)
            ->where('reservations.0.guest.name', 'أحمد منصور')
        );

        // Search by unit name
        $responseUnit = $this->actingAs($this->user)->get(route('reservations.index', ['search' => 'B-201']));
        $responseUnit->assertOk();
        $responseUnit->assertInertia(fn (Assert $page) => $page
            ->has('reservations', 1)
            ->where('reservations.0.unit.name', 'B-201')
        );
    }

    public function test_dashboard_filters_by_sector(): void
    {
        Reservation::create([
            'guest_id' => $this->guest1->id,
            'unit_id' => $this->unitA->id, // sectorA
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1000.00,
        ]);

        Reservation::create([
            'guest_id' => $this->guest2->id,
            'unit_id' => $this->unitB->id, // sectorB
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1000.00,
        ]);

        $response = $this->actingAs($this->user)->get(route('reservations.index', ['sector_id' => $this->sectorA->id]));
        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->has('reservations', 1)
            ->where('reservations.0.unit.sector_id', $this->sectorA->id)
        );
    }

    public function test_dashboard_filters_by_status(): void
    {
        Reservation::create([
            'guest_id' => $this->guest1->id,
            'unit_id' => $this->unitA->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CHECKED_IN->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1000.00,
        ]);

        Reservation::create([
            'guest_id' => $this->guest2->id,
            'unit_id' => $this->unitB->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::WAITING->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1000.00,
        ]);

        $response = $this->actingAs($this->user)->get(route('reservations.index', ['status' => ReservationStatus::CHECKED_IN->value]));
        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->has('reservations', 1)
            ->where('reservations.0.status', ReservationStatus::CHECKED_IN->value)
        );
    }

    public function test_dashboard_filters_by_payment_status(): void
    {
        // Fully paid
        $resPaid = Reservation::create([
            'guest_id' => $this->guest1->id,
            'unit_id' => $this->unitA->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1000.00,
        ]);
        Payment::create(['reservation_id' => $resPaid->id, 'amount' => 1000.00, 'method' => PaymentMethod::CASH->value]);

        // Partially paid
        $resPartial = Reservation::create([
            'guest_id' => $this->guest2->id,
            'unit_id' => $this->unitB->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1000.00,
        ]);
        Payment::create(['reservation_id' => $resPartial->id, 'amount' => 400.00, 'method' => PaymentMethod::VISA->value]);

        // Unpaid
        Reservation::create([
            'guest_id' => $this->guest1->id,
            'unit_id' => $this->unitA->id,
            'check_in' => '2026-10-10',
            'check_out' => '2026-10-15',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1000.00,
        ]);

        // Filter Paid
        $resFilterPaid = $this->actingAs($this->user)->get(route('reservations.index', ['payment_status' => 'paid']));
        $resFilterPaid->assertOk();
        $resFilterPaid->assertInertia(fn (Assert $page) => $page->has('reservations', 1)->where('reservations.0.id', $resPaid->id));

        // Filter Partial
        $resFilterPartial = $this->actingAs($this->user)->get(route('reservations.index', ['payment_status' => 'partial']));
        $resFilterPartial->assertOk();
        $resFilterPartial->assertInertia(fn (Assert $page) => $page->has('reservations', 1)->where('reservations.0.id', $resPartial->id));

        // Filter Unpaid
        $resFilterUnpaid = $this->actingAs($this->user)->get(route('reservations.index', ['payment_status' => 'unpaid']));
        $resFilterUnpaid->assertOk();
        $resFilterUnpaid->assertInertia(fn (Assert $page) => $page->has('reservations', 1));
    }

    public function test_dashboard_filters_by_date_presets(): void
    {
        $today = Carbon::today()->toDateString();
        $tomorrow = Carbon::tomorrow()->toDateString();
        $nextMonth = Carbon::today()->addMonths(2)->toDateString();
        $nextMonthEnd = Carbon::today()->addMonths(2)->addDays(4)->toDateString();

        // Active today
        $resToday = Reservation::create([
            'guest_id' => $this->guest1->id,
            'unit_id' => $this->unitA->id,
            'check_in' => $today,
            'check_out' => $tomorrow,
            'status' => ReservationStatus::CHECKED_IN->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 500.00,
        ]);

        // Far future
        $resFuture = Reservation::create([
            'guest_id' => $this->guest2->id,
            'unit_id' => $this->unitB->id,
            'check_in' => $nextMonth,
            'check_out' => $nextMonthEnd,
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1200.00,
        ]);

        // Preset today
        $resDateToday = $this->actingAs($this->user)->get(route('reservations.index', ['date_preset' => 'today']));
        $resDateToday->assertOk();
        $resDateToday->assertInertia(fn (Assert $page) => $page->has('reservations', 1)->where('reservations.0.id', $resToday->id));

        // Preset custom
        $resDateCustom = $this->actingAs($this->user)->get(route('reservations.index', [
            'date_preset' => 'custom',
            'start_date' => $nextMonth,
            'end_date' => $nextMonthEnd,
        ]));
        $resDateCustom->assertOk();
        $resDateCustom->assertInertia(fn (Assert $page) => $page->has('reservations', 1)->where('reservations.0.id', $resFuture->id));
    }

    public function test_dashboard_filters_by_friday_to_thursday_resort_period(): void
    {
        // Find next Friday
        $friday = Carbon::now()->next(Carbon::FRIDAY);
        $thursday = (clone $friday)->addDays(6); // Thursday end

        $resPeriod = Reservation::create([
            'guest_id' => $this->guest1->id,
            'unit_id' => $this->unitA->id,
            'check_in' => $friday->toDateString(),
            'check_out' => $thursday->toDateString(),
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1500.00,
        ]);

        // Another reservation 4 weeks later
        Reservation::create([
            'guest_id' => $this->guest2->id,
            'unit_id' => $this->unitB->id,
            'check_in' => (clone $friday)->addWeeks(4)->toDateString(),
            'check_out' => (clone $thursday)->addWeeks(4)->toDateString(),
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1500.00,
        ]);

        $response = $this->actingAs($this->user)->get(route('reservations.index', [
            'date_preset' => 'current_period',
            'start_date' => $friday->toDateString(),
            'end_date' => $thursday->toDateString(),
        ]));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->has('reservations', 1)
            ->where('reservations.0.id', $resPeriod->id)
            ->where('filters.start_date', $friday->toDateString())
            ->where('filters.end_date', $thursday->toDateString())
            ->where('filters.date_preset', 'current_period')
        );
    }

    public function test_dashboard_defaults_to_matrix_view(): void
    {
        $response = $this->actingAs($this->user)->get(route('reservations.index'));
        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('reservations/index')
            ->where('filters.view', 'matrix')
        );
    }

    public function test_dashboard_switches_active_view_mode(): void
    {
        $views = ['table', 'cards', 'matrix'];

        foreach ($views as $view) {
            $response = $this->actingAs($this->user)->get(route('reservations.index', ['view' => $view]));
            $response->assertOk();
            $response->assertInertia(fn (Assert $page) => $page
                ->component('reservations/index')
                ->where('filters.view', $view)
            );
        }
    }

    public function test_unit_current_reservation_includes_checked_in_guest_even_if_checkout_date_passed(): void
    {
        $res = Reservation::create([
            'guest_id' => $this->guest1->id,
            'unit_id' => $this->unitA->id,
            'check_in' => Carbon::today()->subDays(5)->toDateString(),
            'check_out' => Carbon::today()->subDays(1)->toDateString(),
            'status' => ReservationStatus::CHECKED_IN->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1000.00,
        ]);

        $this->unitA->refresh();
        $this->assertNotNull($this->unitA->currentReservation);
        $this->assertEquals($res->id, $this->unitA->currentReservation->id);

        $response = $this->actingAs($this->user)->get(route('reservations.index', ['view' => 'matrix']));
        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('reservations/index')
            ->has('reservations', 1)
            ->has('sectors')
        );
    }
}
