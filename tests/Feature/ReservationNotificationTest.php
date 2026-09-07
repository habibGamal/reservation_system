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
use Illuminate\Support\Facades\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use Tests\TestCase;

class ReservationNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;

    protected User $admin;

    protected User $receptionist;

    protected Sector $sector;

    protected Unit $unit;

    protected Guest $guest;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleAndPermissionSeeder::class);

        $this->superAdmin = User::factory()->create(['name' => 'سوبر ادمن']);
        $this->superAdmin->assignRole('Super Admin');

        $this->admin = User::factory()->create(['name' => 'ادمن']);
        $this->admin->assignRole('Admin');

        $this->receptionist = User::factory()->create(['name' => 'حبيب جمال']);
        $this->receptionist->assignRole('Receptionist');

        $this->guest = Guest::create([
            'name' => 'اللواء علي',
            'phone' => '01012345678',
            'mil_code' => 'M-5555',
        ]);

        $this->sector = Sector::create(['name' => 'فندق 1']);

        $priceRule = PriceRule::create([
            'name' => 'أسعار الموسم',
            'rules' => [
                'عضو' => 500.0,
                'غير عضو' => 800.0,
                'مرافق' => 600.0,
                'مدني' => 1000.0,
            ],
        ]);

        $this->unit = Unit::create([
            'name' => '22',
            'sector_id' => $this->sector->id,
            'rooms_count' => 2,
            'price_rule_id' => $priceRule->id,
        ]);
    }

    public function test_super_admins_receive_notification_when_reservation_is_created(): void
    {
        Notification::fake();

        $this->actingAs($this->receptionist);

        $response = $this->post(route('reservations.store'), [
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 2000,
        ]);

        $response->assertRedirect(route('reservations.index'));

        Notification::assertSentTo($this->superAdmin, ReservationNotification::class, function ($notification) {
            return $notification->action === 'created'
                && $notification->tag === 'reservation-created'
                && str_contains($notification->getBody(), 'حجز جديد فندق 1 - 22 اللواء علي بواسطة حبيب جمال');
        });

        Notification::assertSentTo($this->admin, ReservationNotification::class);
        Notification::assertNotSentTo($this->receptionist, ReservationNotification::class);
    }

    public function test_super_admins_receive_checked_in_notification_on_status_update(): void
    {
        Notification::fake();

        $reservation = Reservation::create([
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 2000,
        ]);

        $this->actingAs($this->receptionist);

        $response = $this->patchJson(route('reservations.update-status', $reservation), [
            'status' => ReservationStatus::CHECKED_IN->value,
        ]);

        $response->assertOk();

        Notification::assertSentTo($this->superAdmin, ReservationNotification::class, function ($notification) use ($reservation) {
            return $notification->action === 'updated'
                && $notification->changeType === 'status'
                && $notification->tag === 'reservation-status'
                && $notification->reservationId === $reservation->id
                && $notification->getBody() === 'تم تسكين فندق 1 - 22 اللواء علي بواسطة حبيب جمال';
        });
    }

    public function test_super_admins_receive_departed_notification_on_status_update(): void
    {
        Notification::fake();

        $reservation = Reservation::create([
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CHECKED_IN->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 2000,
        ]);

        $seif = User::factory()->create(['name' => 'سيف']);
        $seif->assignRole('Receptionist');
        $this->actingAs($seif);

        $response = $this->patchJson(route('reservations.update-status', $reservation), [
            'status' => ReservationStatus::DEPARTED->value,
        ]);

        $response->assertOk();

        Notification::assertSentTo($this->superAdmin, ReservationNotification::class, function ($notification) {
            return $notification->action === 'updated'
                && $notification->changeType === 'status'
                && $notification->tag === 'reservation-status'
                && $notification->getBody() === 'مغادرة فندق 1 - 22 اللواء علي بواسطة سيف';
        });
    }

    public function test_super_admins_receive_membership_change_notification(): void
    {
        Notification::fake();

        $reservation = Reservation::create([
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 2000,
        ]);

        $ali = User::factory()->create(['name' => 'علي']);
        $ali->assignRole('Receptionist');
        $this->actingAs($ali);

        $response = $this->patchJson(route('reservations.quick-update', $reservation), [
            'membership' => MembershipType::NON_MEMBER->value,
        ]);

        $response->assertOk();

        Notification::assertSentTo($this->superAdmin, ReservationNotification::class, function ($notification) {
            return $notification->action === 'updated'
                && $notification->changeType === 'membership'
                && $notification->tag === 'reservation-membership'
                && $notification->getBody() === 'تغيير حجز فندق 1 - 22 من عضو الى غير عضو بواسطة علي';
        });
    }

    public function test_super_admins_receive_type_change_notification(): void
    {
        Notification::fake();

        $reservation = Reservation::create([
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 2000,
        ]);

        $seif = User::factory()->create(['name' => 'سيف']);
        $seif->assignRole('Receptionist');
        $this->actingAs($seif);

        $response = $this->patchJson(route('reservations.quick-update', $reservation), [
            'type' => ReservationType::MANAGEMENT->value,
        ]);

        $response->assertOk();

        Notification::assertSentTo($this->superAdmin, ReservationNotification::class, function ($notification) {
            return $notification->action === 'updated'
                && $notification->changeType === 'type'
                && $notification->tag === 'reservation-type'
                && $notification->getBody() === 'تغيير حجز فندق 1 - 22 من فرع الى ادارة بواسطة سيف';
        });
    }

    public function test_super_admins_receive_notification_when_reservation_is_deleted(): void
    {
        Notification::fake();

        $reservation = Reservation::create([
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 2000,
        ]);

        $this->actingAs($this->superAdmin);

        $response = $this->delete(route('reservations.destroy', $reservation));

        $response->assertRedirect(route('reservations.index'));

        Notification::assertSentTo($this->superAdmin, ReservationNotification::class, function ($notification) use ($reservation) {
            return $notification->action === 'deleted'
                && $notification->tag === 'reservation-deleted'
                && $notification->reservationId === $reservation->id
                && $notification->getBody() === 'حذف حجز فندق 1 - 22 اللواء علي بواسطة سوبر ادمن';
        });

        $this->assertDatabaseMissing('reservations', ['id' => $reservation->id]);
    }

    public function test_reservation_notification_payload_and_channels(): void
    {
        $reservation = Reservation::create([
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 2000,
        ]);

        $notification = ReservationNotification::statusUpdated($reservation, $this->receptionist, 'انتظار', 'تم التسكين');

        $this->assertEquals([WebPushChannel::class, 'database'], $notification->via($this->superAdmin));

        $arrayData = $notification->toArray($this->superAdmin);
        $this->assertEquals('updated', $arrayData['action']);
        $this->assertEquals('status', $arrayData['change_type']);
        $this->assertEquals('reservation-status', $arrayData['tag']);
        $this->assertEquals('تم تسكين فندق 1 - 22 اللواء علي بواسطة حبيب جمال', $arrayData['message']);

        $webPush = $notification->toWebPush($this->superAdmin, $notification);
        $payload = $webPush->toArray();
        $this->assertEquals('reservation-status', $payload['tag']);
        $this->assertEquals('تم تسكين فندق 1 - 22 اللواء علي بواسطة حبيب جمال', $payload['body']);
        $this->assertEquals('/reservations?search='.$reservation->id, $payload['data']['url']);
        $this->assertEquals($this->sector->id, $payload['data']['sector_id']);
        $this->assertArrayHasKey('status', $payload['data']['changes']);
    }

    public function test_user_assigned_to_sector_receives_notification_when_reservation_is_updated(): void
    {
        Notification::fake();

        // Create User assigned to this->sector
        $sector1User = User::factory()->create(['name' => 'موظف قطاع 1']);
        $sector1User->assignRole('Receptionist');
        $sector1User->sectors()->attach($this->sector->id, ['permission' => 'edit']);

        // Create User assigned to another sector
        $otherSector = Sector::create(['name' => 'فندق 2']);
        $sector2User = User::factory()->create(['name' => 'موظف قطاع 2']);
        $sector2User->assignRole('Receptionist');
        $sector2User->sectors()->attach($otherSector->id, ['permission' => 'edit']);

        $reservation = Reservation::create([
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 2000,
        ]);

        $this->actingAs($this->superAdmin);

        $response = $this->put(route('reservations.update', $reservation), [
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-10-02',
            'check_out' => '2026-10-06',
            'status' => ReservationStatus::CHECKED_IN->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 2000,
        ]);

        $response->assertRedirect();

        // Super Admin and Admin should receive it
        Notification::assertSentTo($this->superAdmin, ReservationNotification::class);
        Notification::assertSentTo($this->admin, ReservationNotification::class);

        // User assigned to this sector MUST receive it
        Notification::assertSentTo($sector1User, ReservationNotification::class, function ($notification) use ($reservation) {
            return $notification->reservationId === $reservation->id
                && $notification->sectorId === $this->sector->id
                && ! empty($notification->changes);
        });

        // User assigned to another sector must NOT receive it
        Notification::assertNotSentTo($sector2User, ReservationNotification::class);
    }

    public function test_notification_contains_detailed_changes_when_reservation_is_updated(): void
    {
        Notification::fake();

        $sectorUser = User::factory()->create(['name' => 'مشرف القطاع']);
        $sectorUser->assignRole('Receptionist');
        $sectorUser->sectors()->attach($this->sector->id, ['permission' => 'edit']);

        $reservation = Reservation::create([
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 2000,
        ]);

        $this->actingAs($this->superAdmin);

        // Update dates and status together
        $response = $this->put(route('reservations.update', $reservation), [
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-10-03',
            'check_out' => '2026-10-07',
            'status' => ReservationStatus::CHECKED_IN->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 2000,
        ]);

        $response->assertRedirect();

        Notification::assertSentTo($sectorUser, ReservationNotification::class, function ($notification) {
            $changes = $notification->changes;

            $hasStatusChange = isset($changes['status'])
                && $changes['status']['from'] === 'ثابت'
                && $changes['status']['to'] === 'تم التسكين';

            $hasDatesChange = isset($changes['dates'])
                && str_contains($changes['dates']['from'], '2026-10-01')
                && str_contains($changes['dates']['to'], '2026-10-03');

            $arrayData = $notification->toArray($this->superAdmin);

            return $hasStatusChange
                && $hasDatesChange
                && $notification->sectorId === $this->sector->id
                && isset($arrayData['changes']['status'])
                && isset($arrayData['changes']['dates']);
        });
    }

    public function test_quick_update_notifies_sector_assigned_users_with_changes(): void
    {
        Notification::fake();

        $sectorUser = User::factory()->create(['name' => 'موظف استقبال']);
        $sectorUser->assignRole('Receptionist');
        $sectorUser->sectors()->attach($this->sector->id, ['permission' => 'edit']);

        $reservation = Reservation::create([
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 2000,
        ]);

        $this->actingAs($sectorUser);

        $response = $this->patchJson(route('reservations.quick-update', $reservation), [
            'status' => ReservationStatus::CHECKED_IN->value,
        ]);

        $response->assertOk();

        Notification::assertSentTo($sectorUser, ReservationNotification::class, function ($notification) {
            return $notification->action === 'updated'
                && $notification->changeType === 'status'
                && isset($notification->changes['status']);
        });
    }

    public function test_transferring_reservation_between_sectors_notifies_both_sector_users(): void
    {
        Notification::fake();

        $sector2 = Sector::create(['name' => 'فندق 2']);
        $unit2 = Unit::create([
            'name' => '50',
            'sector_id' => $sector2->id,
            'rooms_count' => 1,
        ]);

        $userSector1 = User::factory()->create(['name' => 'مشرف فندق 1']);
        $userSector1->assignRole('Receptionist');
        $userSector1->sectors()->attach($this->sector->id, ['permission' => 'edit']);

        $userSector2 = User::factory()->create(['name' => 'مشرف فندق 2']);
        $userSector2->assignRole('Receptionist');
        $userSector2->sectors()->attach($sector2->id, ['permission' => 'edit']);

        $reservation = Reservation::create([
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 2000,
        ]);

        $this->actingAs($this->superAdmin);

        // Move unit from sector 1 to sector 2
        $response = $this->put(route('reservations.update', $reservation), [
            'guest_id' => $this->guest->id,
            'unit_id' => $unit2->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 2000,
        ]);

        $response->assertRedirect();

        // Both sector users should receive the notification
        Notification::assertSentTo($userSector1, ReservationNotification::class, function ($notification) {
            return isset($notification->changes['unit']);
        });

        Notification::assertSentTo($userSector2, ReservationNotification::class, function ($notification) {
            return isset($notification->changes['unit']);
        });
    }
}
