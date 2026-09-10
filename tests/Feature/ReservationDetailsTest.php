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
use App\Notifications\ReservationNotification;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Activitylog\Models\Activity;
use Tests\TestCase;

class ReservationDetailsTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;

    protected User $sectorUser;

    protected User $unauthorizedUser;

    protected Sector $sector1;

    protected Sector $sector2;

    protected Unit $unit1;

    protected Guest $guest;

    protected Reservation $reservation;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleAndPermissionSeeder::class);

        $this->superAdmin = User::factory()->create(['name' => 'سوبر ادمن']);
        $this->superAdmin->assignRole('Super Admin');

        $this->sector1 = Sector::create(['name' => 'فندق 1']);
        $this->sector2 = Sector::create(['name' => 'فندق 2']);

        $priceRule = PriceRule::create([
            'name' => 'أسعار الموسم',
            'rules' => [
                'عضو' => 500.0,
                'غير عضو' => 800.0,
                'مرافق' => 600.0,
                'مدني' => 1000.0,
            ],
        ]);

        $this->unit1 = Unit::create([
            'name' => '101',
            'sector_id' => $this->sector1->id,
            'rooms_count' => 2,
            'price_rule_id' => $priceRule->id,
        ]);

        $this->guest = Guest::create([
            'name' => 'محمد أحمد',
            'phone' => '01000000000',
            'mil_code' => 'M-1234',
        ]);

        $this->reservation = Reservation::create([
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit1->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 2000,
        ]);

        // Receptionist with permission only in sector 1
        $this->sectorUser = User::factory()->create(['name' => 'موظف قطاع 1']);
        $this->sectorUser->assignRole('Receptionist');
        $this->sectorUser->sectors()->attach($this->sector1->id, ['permission' => 'edit']);

        // Receptionist with permission only in sector 2
        $this->unauthorizedUser = User::factory()->create(['name' => 'موظف قطاع 2']);
        $this->unauthorizedUser->assignRole('Receptionist');
        $this->unauthorizedUser->sectors()->attach($this->sector2->id, ['permission' => 'edit']);
    }

    public function test_reservation_notification_url_points_to_reservation_details_page(): void
    {
        // Notification on reservation update
        $notification = ReservationNotification::updated(
            $this->reservation,
            $this->superAdmin,
            'تعديل حالة الحجز',
            'status',
            'انتظار',
            'تم التسكين',
            null,
            ['status' => ['label' => 'حالة الحجز', 'from' => 'انتظار', 'to' => 'تم التسكين']]
        );

        $this->assertEquals("/reservations/{$this->reservation->id}", $notification->getUrl());

        // Check database array representation
        $arrayData = $notification->toArray($this->superAdmin);
        $this->assertEquals("/reservations/{$this->reservation->id}", $arrayData['url']);

        // Check WebPush structure
        $webPush = $notification->toWebPush($this->superAdmin, $notification);
        $webPushData = $webPush->toArray();
        $this->assertEquals("/reservations/{$this->reservation->id}", $webPushData['data']['url']);
        $this->assertNotEmpty($webPushData['actions']);
        $this->assertEquals('view_reservation', $webPushData['actions'][0]['action']);

        // Notification on reservation delete should fall back to /reservations
        $deleteNotification = ReservationNotification::deleted(
            $this->reservation,
            $this->superAdmin
        );
        $this->assertEquals('/reservations', $deleteNotification->getUrl());
    }

    public function test_super_admin_can_view_reservation_details_page(): void
    {
        $response = $this->actingAs($this->superAdmin)->get(route('reservations.show', $this->reservation));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('reservations/show')
            ->has('reservation')
            ->where('reservation.id', $this->reservation->id)
            ->where('canEdit', true)
            ->where('canDelete', true)
            ->has('activityLogs')
        );
    }

    public function test_user_with_sector_permission_can_view_reservation_details(): void
    {
        $response = $this->actingAs($this->sectorUser)->get(route('reservations.show', $this->reservation));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('reservations/show')
            ->has('reservation')
            ->where('reservation.id', $this->reservation->id)
        );
    }

    public function test_user_without_sector_permission_cannot_view_reservation_details(): void
    {
        $response = $this->actingAs($this->unauthorizedUser)->get(route('reservations.show', $this->reservation));

        $response->assertForbidden();
    }

    public function test_guest_is_redirected_to_login(): void
    {
        $response = $this->get(route('reservations.show', $this->reservation));

        $response->assertRedirect(route('login'));
    }

    public function test_json_request_returns_reservation_data(): void
    {
        $response = $this->actingAs($this->superAdmin)
            ->getJson(route('reservations.show', $this->reservation));

        $response->assertOk();
        $response->assertJsonPath('reservation.id', $this->reservation->id);
    }

    public function test_activity_log_formats_changes_and_diffs_correctly(): void
    {
        Activity::create([
            'log_name' => 'default',
            'description' => 'updated',
            'subject_type' => Reservation::class,
            'subject_id' => $this->reservation->id,
            'causer_type' => User::class,
            'causer_id' => $this->superAdmin->id,
            'event' => 'updated',
            'attribute_changes' => [
                'attributes' => [
                    'status' => 'تم التسكين',
                    'total_price' => 7200,
                ],
                'old' => [
                    'status' => 'انتظار',
                    'total_price' => 0,
                ],
            ],
            'properties' => [],
        ]);

        $response = $this->actingAs($this->superAdmin)->get(route('reservations.show', $this->reservation));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('reservations/show')
            ->has('activityLogs', 2)
            ->where('activityLogs.0.event', 'updated')
            ->has('activityLogs.0.changes', 2)
            ->where('activityLogs.0.changes.0.field', 'status')
            ->where('activityLogs.0.changes.0.label', 'حالة الحجز')
            ->where('activityLogs.0.changes.0.old_label', 'انتظار')
            ->where('activityLogs.0.changes.0.new_label', 'تم التسكين')
            ->where('activityLogs.0.changes.1.field', 'total_price')
            ->where('activityLogs.0.changes.1.label', 'إجمالي المبلغ')
            ->where('activityLogs.0.changes.1.new_label', '7,200.00 ج.م')
            ->where('activityLogs.1.event', 'created')
            ->where('activityLogs.1.description', 'تم إنشاء وتسجيل الحجز')
        );
    }
}
