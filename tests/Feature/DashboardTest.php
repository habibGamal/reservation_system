<?php

namespace Tests\Feature;

use App\Enums\ReservationStatus;
use App\Enums\ReservationType;
use App\Models\Guest;
use App\Models\Reservation;
use App\Models\Sector;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $response = $this->get(route('dashboard'));
        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_visit_the_dashboard()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('dashboard'));
        $response->assertOk();
    }

    public function test_dashboard_renders_occupancy_statistics_props()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('dashboard'));
        $response->assertOk();

        $response->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->has('referenceStats', 10)
            ->where('referenceSummary.checked_in', 165)
            ->where('referenceSummary.waiting', 7)
            ->where('referenceSummary.total_booked', 172)
            ->where('referenceSummary.vacant', 38)
            ->where('referenceSummary.confirmed', 12)
            ->where('referenceSummary.grand_total', 222)
            ->where('referenceSummary.percentages.checked_in', 63.71)
            ->where('referenceSummary.percentages.waiting', 2.70)
            ->where('referenceSummary.percentages.total_booked', 66.41)
            ->where('referenceSummary.percentages.vacant', 14.67)
            ->where('referenceSummary.percentages.confirmed', 4.63)
            ->has('stats')
            ->has('summary')
            ->has('periodStats')
            ->has('periodSummary')
            ->has('availablePeriods')
            ->has('currentPeriod')
        );
    }

    public function test_dashboard_accurately_counts_period_reservations()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $sector = Sector::create(['name' => 'فندق 1']);
        $unit1 = Unit::create(['sector_id' => $sector->id, 'name' => '101', 'rooms_count' => 1]);
        $unit2 = Unit::create(['sector_id' => $sector->id, 'name' => '102', 'rooms_count' => 1]);
        $guest = Guest::create(['name' => 'نزيل تجريبي', 'phone' => '01000000000']);

        Reservation::create([
            'guest_id' => $guest->id,
            'unit_id' => $unit1->id,
            'check_in' => '2026-09-04',
            'check_out' => '2026-09-10',
            'status' => ReservationStatus::CHECKED_IN,
            'type' => ReservationType::BRANCH,
            'total_price' => 1000,
        ]);

        Reservation::create([
            'guest_id' => $guest->id,
            'unit_id' => $unit2->id,
            'check_in' => '2026-09-04',
            'check_out' => '2026-09-10',
            'status' => ReservationStatus::WAITING,
            'type' => ReservationType::BRANCH,
            'total_price' => 1000,
        ]);

        $response = $this->get(route('dashboard', [
            'start_date' => '2026-09-04',
            'end_date' => '2026-09-10',
        ]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('summary.checked_in', 1)
            ->where('summary.waiting', 1)
            ->where('summary.total_booked', 2)
        );
    }
}
