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
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ReservationBackendFilterTest extends TestCase
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
            'name' => 'خالد إبراهيم',
            'phone' => '01055556666',
            'mil_code' => 'MIL-5566',
        ]);

        $this->guest2 = Guest::create([
            'name' => 'سعيد عبد الرحمن',
            'phone' => '01177778888',
            'mil_code' => 'MIL-7788',
        ]);
    }

    public function test_backend_calculates_accurate_status_counts(): void
    {
        // Res 1: checked in in sector A
        Reservation::create([
            'guest_id' => $this->guest1->id,
            'unit_id' => $this->unitA->id,
            'check_in' => '2026-11-01',
            'check_out' => '2026-11-05',
            'status' => ReservationStatus::CHECKED_IN->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1000.00,
        ]);

        // Res 2: confirmed in sector A
        Reservation::create([
            'guest_id' => $this->guest1->id,
            'unit_id' => $this->unitA->id,
            'check_in' => '2026-11-01',
            'check_out' => '2026-11-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1200.00,
        ]);

        // Res 3: waiting in sector B
        Reservation::create([
            'guest_id' => $this->guest2->id,
            'unit_id' => $this->unitB->id,
            'check_in' => '2026-11-01',
            'check_out' => '2026-11-05',
            'status' => ReservationStatus::WAITING->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 800.00,
        ]);

        // Global query
        $responseAll = $this->actingAs($this->user)->get(route('reservations.index'));
        $responseAll->assertOk();
        $responseAll->assertInertia(fn (Assert $page) => $page
            ->where('status_counts.all', 3)
            ->where('status_counts.'.ReservationStatus::CHECKED_IN->value, 1)
            ->where('status_counts.'.ReservationStatus::CONFIRMED->value, 1)
            ->where('status_counts.'.ReservationStatus::WAITING->value, 1)
            ->where('status_counts.'.ReservationStatus::DEPARTED->value, 0)
        );

        // Scoped to Sector A
        $responseSector = $this->actingAs($this->user)->get(route('reservations.index', [
            'sector_id' => $this->sectorA->id,
        ]));
        $responseSector->assertOk();
        $responseSector->assertInertia(fn (Assert $page) => $page
            ->where('status_counts.all', 2)
            ->where('status_counts.'.ReservationStatus::CHECKED_IN->value, 1)
            ->where('status_counts.'.ReservationStatus::CONFIRMED->value, 1)
            ->where('status_counts.'.ReservationStatus::WAITING->value, 0)
        );
    }

    public function test_partial_reload_only_returns_requested_props(): void
    {
        Reservation::create([
            'guest_id' => $this->guest1->id,
            'unit_id' => $this->unitA->id,
            'check_in' => '2026-11-01',
            'check_out' => '2026-11-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1000.00,
        ]);

        $response = $this->actingAs($this->user)->get(route('reservations.index'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->has('reservations')
            ->has('sectors')
            ->reloadOnly(['reservations', 'stats', 'status_counts', 'filters'], fn (Assert $reload) => $reload
                ->has('reservations')
                ->has('stats')
                ->has('status_counts')
                ->has('filters')
                ->missing('sectors')
                ->missing('units')
                ->missing('guests')
            )
        );
    }

    public function test_all_value_parameters_are_treated_as_unfiltered(): void
    {
        $res = Reservation::create([
            'guest_id' => $this->guest1->id,
            'unit_id' => $this->unitA->id,
            'check_in' => '2026-11-01',
            'check_out' => '2026-11-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1000.00,
        ]);

        $response = $this->actingAs($this->user)->get(route('reservations.index', [
            'sector_id' => 'all',
            'status' => 'all',
            'payment_status' => 'all',
        ]));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->has('reservations', 1)
            ->where('reservations.0.id', $res->id)
        );
    }

    public function test_combined_search_and_sector_filtering(): void
    {
        // Res in Sector A
        $resA = Reservation::create([
            'guest_id' => $this->guest1->id,
            'unit_id' => $this->unitA->id,
            'check_in' => '2026-11-01',
            'check_out' => '2026-11-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1000.00,
        ]);

        // Res in Sector B with same guest
        Reservation::create([
            'guest_id' => $this->guest1->id,
            'unit_id' => $this->unitB->id,
            'check_in' => '2026-11-01',
            'check_out' => '2026-11-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1000.00,
        ]);

        $response = $this->actingAs($this->user)->get(route('reservations.index', [
            'search' => 'خالد',
            'sector_id' => $this->sectorA->id,
        ]));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->has('reservations', 1)
            ->where('reservations.0.id', $resA->id)
            ->where('reservations.0.unit.sector_id', $this->sectorA->id)
        );
    }

    public function test_search_by_sector_name_and_reservation_id(): void
    {
        $res = Reservation::create([
            'guest_id' => $this->guest1->id,
            'unit_id' => $this->unitA->id, // sector name 'لوسيال'
            'check_in' => '2026-11-01',
            'check_out' => '2026-11-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1000.00,
        ]);

        // Search by sector name 'لوسيال'
        $responseSector = $this->actingAs($this->user)->get(route('reservations.index', ['search' => 'لوسيال']));
        $responseSector->assertOk();
        $responseSector->assertInertia(fn (Assert $page) => $page->has('reservations', 1)->where('reservations.0.id', $res->id));

        // Search by reservation ID
        $responseId = $this->actingAs($this->user)->get(route('reservations.index', ['search' => (string) $res->id]));
        $responseId->assertOk();
        $responseId->assertInertia(fn (Assert $page) => $page->has('reservations', 1)->where('reservations.0.id', $res->id));
    }

    public function test_search_by_reservation_notes(): void
    {
        $resWithNote = Reservation::create([
            'guest_id' => $this->guest1->id,
            'unit_id' => $this->unitA->id,
            'check_in' => '2026-11-01',
            'check_out' => '2026-11-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1000.00,
            'notes' => 'طلب سرير أطفال إضافي مع إطلالة على الحديقة',
        ]);

        $resWithoutNote = Reservation::create([
            'guest_id' => $this->guest2->id,
            'unit_id' => $this->unitB->id,
            'check_in' => '2026-11-01',
            'check_out' => '2026-11-05',
            'status' => ReservationStatus::CHECKED_IN->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 800.00,
            'notes' => 'حجز عادي بدون متطلبات',
        ]);

        // Search for notes keyword 'سرير أطفال'
        $response = $this->actingAs($this->user)->get(route('reservations.index', ['search' => 'سرير أطفال']));
        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->has('reservations', 1)
            ->where('reservations.0.id', $resWithNote->id)
            ->where('status_counts.all', 1)
            ->where('status_counts.'.ReservationStatus::CONFIRMED->value, 1)
            ->where('status_counts.'.ReservationStatus::CHECKED_IN->value, 0)
        );

        // Search for note keyword 'إطلالة'
        $responseView = $this->actingAs($this->user)->get(route('reservations.index', ['search' => 'إطلالة']));
        $responseView->assertOk();
        $responseView->assertInertia(fn (Assert $page) => $page
            ->has('reservations', 1)
            ->where('reservations.0.id', $resWithNote->id)
        );

        // Search for notes keyword belonging to second reservation
        $responseSecond = $this->actingAs($this->user)->get(route('reservations.index', ['search' => 'بدون متطلبات']));
        $responseSecond->assertOk();
        $responseSecond->assertInertia(fn (Assert $page) => $page
            ->has('reservations', 1)
            ->where('reservations.0.id', $resWithoutNote->id)
            ->where('status_counts.all', 1)
            ->where('status_counts.'.ReservationStatus::CHECKED_IN->value, 1)
        );
    }

    public function test_multi_select_status_filtering(): void
    {
        $resCheckedIn = Reservation::create([
            'guest_id' => $this->guest1->id,
            'unit_id' => $this->unitA->id,
            'check_in' => '2026-11-01',
            'check_out' => '2026-11-05',
            'status' => ReservationStatus::CHECKED_IN->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1000.00,
        ]);

        $resConfirmed = Reservation::create([
            'guest_id' => $this->guest1->id,
            'unit_id' => $this->unitA->id,
            'check_in' => '2026-11-01',
            'check_out' => '2026-11-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1200.00,
        ]);

        $resWaiting = Reservation::create([
            'guest_id' => $this->guest2->id,
            'unit_id' => $this->unitB->id,
            'check_in' => '2026-11-01',
            'check_out' => '2026-11-05',
            'status' => ReservationStatus::WAITING->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 800.00,
        ]);

        // Filter by array of statuses: CHECKED_IN and WAITING
        $responseArray = $this->actingAs($this->user)->get(route('reservations.index', [
            'status' => [ReservationStatus::CHECKED_IN->value, ReservationStatus::WAITING->value],
        ]));
        $responseArray->assertOk();
        $responseArray->assertInertia(fn (Assert $page) => $page
            ->has('reservations', 2)
            ->where('filters.statuses', [ReservationStatus::CHECKED_IN->value, ReservationStatus::WAITING->value])
        );

        // Filter by comma-separated string of statuses
        $commaStatus = ReservationStatus::CHECKED_IN->value.','.ReservationStatus::CONFIRMED->value;
        $responseComma = $this->actingAs($this->user)->get(route('reservations.index', [
            'status' => $commaStatus,
        ]));
        $responseComma->assertOk();
        $responseComma->assertInertia(fn (Assert $page) => $page
            ->has('reservations', 2)
            ->where('filters.statuses', [ReservationStatus::CHECKED_IN->value, ReservationStatus::CONFIRMED->value])
        );
    }

    public function test_multi_select_sector_filtering(): void
    {
        $sectorC = Sector::create(['name' => 'فيلا جديد']);
        $unitC = Unit::create([
            'sector_id' => $sectorC->id,
            'name' => 'C-301',
            'rooms_count' => 3,
        ]);

        $resA = Reservation::create([
            'guest_id' => $this->guest1->id,
            'unit_id' => $this->unitA->id,
            'check_in' => '2026-11-01',
            'check_out' => '2026-11-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1000.00,
        ]);

        $resB = Reservation::create([
            'guest_id' => $this->guest2->id,
            'unit_id' => $this->unitB->id,
            'check_in' => '2026-11-01',
            'check_out' => '2026-11-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 800.00,
        ]);

        $resC = Reservation::create([
            'guest_id' => $this->guest2->id,
            'unit_id' => $unitC->id,
            'check_in' => '2026-11-01',
            'check_out' => '2026-11-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1500.00,
        ]);

        // Filter by comma-separated sector IDs: sectorA and sectorB (excluding sectorC)
        $responseComma = $this->actingAs($this->user)->get(route('reservations.index', [
            'sector_id' => "{$this->sectorA->id},{$this->sectorB->id}",
        ]));
        $responseComma->assertOk();
        $responseComma->assertInertia(fn (Assert $page) => $page
            ->has('reservations', 2)
            ->where('filters.sector_ids', [$this->sectorA->id, $this->sectorB->id])
        );

        // Filter by array of sector IDs
        $responseArray = $this->actingAs($this->user)->get(route('reservations.index', [
            'sector_ids' => [$this->sectorA->id, $sectorC->id],
        ]));
        $responseArray->assertOk();
        $responseArray->assertInertia(fn (Assert $page) => $page
            ->has('reservations', 2)
            ->where('filters.sector_ids', [$this->sectorA->id, $sectorC->id])
        );
    }
}
