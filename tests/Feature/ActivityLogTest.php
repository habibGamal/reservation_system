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
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ActivityLogTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected Sector $sector1;

    protected Sector $sector2;

    protected Unit $unit1;

    protected Unit $unit2;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(UserSeeder::class);

        $this->admin = User::where('email', 'admin@eaglesresort.com')->firstOrFail();

        $this->sector1 = Sector::create(['name' => 'لوسيال']);
        $this->sector2 = Sector::create(['name' => 'فيلا قديم']);

        $this->unit1 = Unit::create([
            'sector_id' => $this->sector1->id,
            'name' => 'وحدة 101',
            'rooms_count' => 2,
        ]);

        $this->unit2 = Unit::create([
            'sector_id' => $this->sector2->id,
            'name' => 'وحدة 201',
            'rooms_count' => 3,
        ]);
    }

    public function test_unauthenticated_users_are_redirected_to_login(): void
    {
        $response = $this->get(route('activity-logs.index'));
        $response->assertRedirect(route('login'));
    }

    public function test_unauthorized_users_cannot_access_activity_logs(): void
    {
        $viewer = User::where('email', 'viewer@eaglesresort.com')->firstOrFail();
        $response = $this->actingAs($viewer)->get(route('activity-logs.index'));
        $response->assertForbidden();
    }

    public function test_admin_can_access_activity_logs_and_receive_inertia_props(): void
    {
        $response = $this->actingAs($this->admin)->get(route('activity-logs.index'));
        $response->assertOk();

        $response->assertInertia(fn ($page) => $page
            ->component('activity-logs/index')
            ->has('activities')
            ->has('filters')
            ->has('stats')
            ->has('filterOptions')
        );
    }

    public function test_can_filter_activity_logs_by_user(): void
    {
        $otherUser = User::create([
            'name' => 'موظف خاص',
            'email' => 'special@eaglesresort.com',
            'password' => bcrypt('secret'),
        ]);

        activity()
            ->causedBy($otherUser)
            ->performedOn($this->unit2)
            ->event('updated')
            ->log('تعديل وحدة خاصة');

        $response = $this->actingAs($this->admin)
            ->get(route('activity-logs.index', ['user_id' => $otherUser->id]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('activity-logs/index')
            ->where('filters.user_id', $otherUser->id)
            ->has('activities.data')
        );

        $activities = $response->viewData('page')['props']['activities']['data'];
        $this->assertNotEmpty($activities);
        foreach ($activities as $act) {
            $this->assertTrue(
                $act['causer']['id'] === $otherUser->id ||
                ($act['subject']['type'] === 'user' && $act['subject']['id'] === $otherUser->id)
            );
        }
    }

    public function test_can_filter_activity_logs_by_sector(): void
    {
        $guest = Guest::create(['name' => 'محمد سمير', 'phone' => '01022223333']);

        Reservation::create([
            'guest_id' => $guest->id,
            'unit_id' => $this->unit1->id, // in sector1
            'check_in' => '2026-09-10',
            'check_out' => '2026-09-15',
            'status' => ReservationStatus::WAITING,
            'type' => ReservationType::BRANCH,
            'membership' => MembershipType::MEMBER,
            'total_price' => 2000,
        ]);

        Reservation::create([
            'guest_id' => $guest->id,
            'unit_id' => $this->unit2->id, // in sector2
            'check_in' => '2026-09-10',
            'check_out' => '2026-09-15',
            'status' => ReservationStatus::WAITING,
            'type' => ReservationType::BRANCH,
            'membership' => MembershipType::MEMBER,
            'total_price' => 3000,
        ]);

        // Filter by sector1
        $response = $this->actingAs($this->admin)
            ->get(route('activity-logs.index', ['sector_id' => $this->sector1->id]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('activity-logs/index')
            ->where('filters.sector_id', $this->sector1->id)
            ->has('activities.data')
        );

        $activities = $response->viewData('page')['props']['activities']['data'];
        $this->assertNotEmpty($activities);
        foreach ($activities as $act) {
            $this->assertEquals($this->sector1->name, $act['subject']['sector_name']);
        }
    }

    public function test_can_filter_activity_logs_by_unit(): void
    {
        $guest = Guest::create(['name' => 'محمود كمال', 'phone' => '01033334444']);

        Reservation::create([
            'guest_id' => $guest->id,
            'unit_id' => $this->unit1->id,
            'check_in' => '2026-09-10',
            'check_out' => '2026-09-15',
            'status' => ReservationStatus::WAITING,
            'type' => ReservationType::BRANCH,
            'membership' => MembershipType::MEMBER,
            'total_price' => 2500,
        ]);

        // Filter by unit1
        $response = $this->actingAs($this->admin)
            ->get(route('activity-logs.index', ['unit_id' => $this->unit1->id]));

        $response->assertOk();
        $activities = $response->viewData('page')['props']['activities']['data'];
        $this->assertNotEmpty($activities);
        foreach ($activities as $act) {
            $this->assertEquals($this->unit1->name, $act['subject']['unit_name']);
        }
    }

    public function test_can_filter_by_search_keyword(): void
    {
        $guest = Guest::create(['name' => 'طارق فريد', 'phone' => '01099998888', 'mil_code' => '998877']);

        Reservation::create([
            'guest_id' => $guest->id,
            'unit_id' => $this->unit1->id,
            'check_in' => '2026-09-10',
            'check_out' => '2026-09-15',
            'status' => ReservationStatus::WAITING,
            'type' => ReservationType::BRANCH,
            'membership' => MembershipType::MEMBER,
            'total_price' => 1500,
        ]);

        $response = $this->actingAs($this->admin)
            ->get(route('activity-logs.index', ['search' => 'طارق فريد']));

        $response->assertOk();
        $activities = $response->viewData('page')['props']['activities']['data'];
        $this->assertNotEmpty($activities);
        $this->assertEquals('طارق فريد', $activities[0]['subject']['guest_name']);
    }
}
