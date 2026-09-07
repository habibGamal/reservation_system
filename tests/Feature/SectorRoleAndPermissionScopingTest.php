<?php

namespace Tests\Feature;

use App\Models\Guest;
use App\Models\Reservation;
use App\Models\Sector;
use App\Models\Unit;
use App\Models\User;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SectorRoleAndPermissionScopingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(UserSeeder::class);
    }

    public function test_user_with_view_permission_in_sector_1_only_sees_sector_1_reservations(): void
    {
        $sector1 = Sector::create(['name' => 'فندق 1']);
        $sector2 = Sector::create(['name' => 'لوسيال']);

        $unit1 = Unit::create(['name' => 'غرفة 101', 'sector_id' => $sector1->id, 'rooms_count' => 1]);
        $unit2 = Unit::create(['name' => 'فيلا 201', 'sector_id' => $sector2->id, 'rooms_count' => 3]);

        $guest1 = Guest::create(['name' => 'نزيل فندق 1', 'phone' => '01000000001']);
        $guest2 = Guest::create(['name' => 'نزيل لوسيال', 'phone' => '01000000002']);

        $res1 = Reservation::create([
            'guest_id' => $guest1->id,
            'unit_id' => $unit1->id,
            'check_in' => now()->toDateString(),
            'check_out' => now()->addDays(3)->toDateString(),
            'status' => 'ثابت',
            'type' => 'منتجع',
            'membership' => 'عضو',
            'total_price' => 1500,
            'paid_amount' => 1500,
            'balance' => 0,
            'nights_count' => 3,
            'payment_status' => 'Fully Paid',
        ]);

        $res2 = Reservation::create([
            'guest_id' => $guest2->id,
            'unit_id' => $unit2->id,
            'check_in' => now()->toDateString(),
            'check_out' => now()->addDays(3)->toDateString(),
            'status' => 'ثابت',
            'type' => 'منتجع',
            'membership' => 'عضو',
            'total_price' => 3000,
            'paid_amount' => 3000,
            'balance' => 0,
            'nights_count' => 3,
            'payment_status' => 'Fully Paid',
        ]);

        // Create User A with view permission ONLY for Sector 1
        $userA = User::factory()->create(['name' => 'مستخدم فندق 1']);
        $userA->assignRole('Receptionist');
        $userA->sectors()->attach($sector1->id, ['permission' => 'view']);

        $response = $this->actingAs($userA)->get(route('reservations.index'));
        $response->assertOk();

        $response->assertInertia(function ($page) use ($res1, $res2, $sector1, $sector2) {
            $reservations = collect($page->toArray()['props']['reservations']);
            $sectors = collect($page->toArray()['props']['sectors']);

            // Must include res1 from sector 1
            $this->assertTrue($reservations->contains('id', $res1->id));
            // Must NOT include res2 from sector 2
            $this->assertFalse($reservations->contains('id', $res2->id));

            // Scoped sectors prop must only contain sector 1
            $this->assertTrue($sectors->contains('id', $sector1->id));
            $this->assertFalse($sectors->contains('id', $sector2->id));

            // Auth user props
            $auth = $page->toArray()['props']['auth']['user'];
            $this->assertFalse($auth['has_full_sector_access']);
            $this->assertEquals([$sector1->id], $auth['allowed_sector_ids']);
            $this->assertEquals([], $auth['editable_sector_ids']);
        });
    }

    public function test_user_with_view_permission_cannot_create_or_update_or_delete_reservations(): void
    {
        $sector1 = Sector::create(['name' => 'فندق 1']);
        $unit1 = Unit::create(['name' => 'غرفة 101', 'sector_id' => $sector1->id, 'rooms_count' => 1]);
        $guest1 = Guest::create(['name' => 'نزيل تجريبي', 'phone' => '01000000003']);

        $res1 = Reservation::create([
            'guest_id' => $guest1->id,
            'unit_id' => $unit1->id,
            'check_in' => now()->toDateString(),
            'check_out' => now()->addDays(2)->toDateString(),
            'status' => 'ثابت',
            'type' => 'منتجع',
            'membership' => 'عضو',
            'total_price' => 1000,
            'paid_amount' => 1000,
            'balance' => 0,
            'nights_count' => 2,
            'payment_status' => 'Fully Paid',
        ]);

        $userA = User::factory()->create();
        $userA->assignRole('Receptionist');
        $userA->sectors()->attach($sector1->id, ['permission' => 'view']);

        // Cannot create reservation in sector 1 (view-only)
        $storeResponse = $this->actingAs($userA)->post(route('reservations.store'), [
            'guest_id' => $guest1->id,
            'unit_id' => $unit1->id,
            'check_in' => now()->addDays(5)->toDateString(),
            'check_out' => now()->addDays(7)->toDateString(),
            'status' => 'ثابت',
            'type' => 'منتجع',
            'membership' => 'عضو',
            'total_price' => 1000,
        ]);
        $storeResponse->assertForbidden();

        // Cannot update reservation in sector 1
        $updateResponse = $this->actingAs($userA)->put(route('reservations.update', $res1), [
            'guest_id' => $guest1->id,
            'unit_id' => $unit1->id,
            'check_in' => $res1->check_in->toDateString(),
            'check_out' => $res1->check_out->toDateString(),
            'status' => 'تم التسكين',
            'type' => 'منتجع',
            'membership' => 'عضو',
            'total_price' => 1200,
        ]);
        $updateResponse->assertForbidden();

        // Cannot quick-update reservation
        $quickResponse = $this->actingAs($userA)->patch(route('reservations.quick-update', $res1), [
            'notes' => 'ملاحظة غير مصرح بها',
        ]);
        $quickResponse->assertForbidden();

        // Cannot update status
        $statusResponse = $this->actingAs($userA)->patch(route('reservations.update-status', $res1), [
            'status' => 'غادر',
        ]);
        $statusResponse->assertForbidden();

        // Cannot delete reservation
        $deleteResponse = $this->actingAs($userA)->delete(route('reservations.destroy', $res1));
        $deleteResponse->assertForbidden();
    }

    public function test_user_with_edit_permission_can_create_and_update_reservations_in_assigned_sector(): void
    {
        $sector1 = Sector::create(['name' => 'فندق 1']);
        $sector2 = Sector::create(['name' => 'فندق 2']);

        $unit1 = Unit::create(['name' => 'غرفة 101', 'sector_id' => $sector1->id, 'rooms_count' => 1]);
        $unit2 = Unit::create(['name' => 'غرفة 201', 'sector_id' => $sector2->id, 'rooms_count' => 1]);

        $guest = Guest::create(['name' => 'نزيل مميز', 'phone' => '01000000004']);

        $userB = User::factory()->create();
        $userB->assignRole('Receptionist');
        $userB->sectors()->attach($sector1->id, ['permission' => 'edit']);

        // Can create reservation in sector 1
        $createResponse = $this->actingAs($userB)->post(route('reservations.store'), [
            'guest_id' => $guest->id,
            'unit_id' => $unit1->id,
            'check_in' => now()->toDateString(),
            'check_out' => now()->addDays(2)->toDateString(),
            'status' => 'ثابت',
            'type' => 'منتجع',
            'membership' => 'عضو',
            'total_price' => 1000,
        ]);
        $createResponse->assertSessionHas('success');

        $createdReservation = Reservation::where('guest_id', $guest->id)->first();
        $this->assertNotNull($createdReservation);

        // Can update status in sector 1
        $statusResponse = $this->actingAs($userB)->patch(route('reservations.update-status', $createdReservation), [
            'status' => 'تم التسكين',
        ]);
        $statusResponse->assertSessionHas('success');
        $this->assertEquals('تم التسكين', $createdReservation->fresh()->status->value);

        // Cannot create reservation in sector 2 (not assigned)
        $unauthorizedCreate = $this->actingAs($userB)->post(route('reservations.store'), [
            'guest_id' => $guest->id,
            'unit_id' => $unit2->id,
            'check_in' => now()->toDateString(),
            'check_out' => now()->addDays(2)->toDateString(),
            'status' => 'ثابت',
            'type' => 'منتجع',
            'membership' => 'عضو',
            'total_price' => 1000,
        ]);
        $unauthorizedCreate->assertForbidden();
    }

    public function test_admin_has_unrestricted_full_access_to_all_sectors(): void
    {
        $admin = User::where('email', 'admin@eaglesresort.com')->first();
        $this->assertNotNull($admin);

        $sector1 = Sector::create(['name' => 'فندق 1']);
        $sector2 = Sector::create(['name' => 'فندق 2']);

        $unit1 = Unit::create(['name' => 'غرفة 101', 'sector_id' => $sector1->id, 'rooms_count' => 1]);
        $unit2 = Unit::create(['name' => 'غرفة 201', 'sector_id' => $sector2->id, 'rooms_count' => 1]);

        $guest = Guest::create(['name' => 'نزيل عام', 'phone' => '01000000005']);

        $res1 = Reservation::create([
            'guest_id' => $guest->id,
            'unit_id' => $unit1->id,
            'check_in' => now()->toDateString(),
            'check_out' => now()->addDays(2)->toDateString(),
            'status' => 'ثابت',
            'type' => 'منتجع',
            'membership' => 'عضو',
            'total_price' => 1000,
            'paid_amount' => 1000,
            'balance' => 0,
            'nights_count' => 2,
            'payment_status' => 'Fully Paid',
        ]);

        $res2 = Reservation::create([
            'guest_id' => $guest->id,
            'unit_id' => $unit2->id,
            'check_in' => now()->toDateString(),
            'check_out' => now()->addDays(2)->toDateString(),
            'status' => 'ثابت',
            'type' => 'منتجع',
            'membership' => 'عضو',
            'total_price' => 1000,
            'paid_amount' => 1000,
            'balance' => 0,
            'nights_count' => 2,
            'payment_status' => 'Fully Paid',
        ]);

        $response = $this->actingAs($admin)->get(route('reservations.index'));
        $response->assertOk();

        $response->assertInertia(function ($page) use ($res1, $res2) {
            $reservations = collect($page->toArray()['props']['reservations']);
            $this->assertTrue($reservations->contains('id', $res1->id));
            $this->assertTrue($reservations->contains('id', $res2->id));

            $auth = $page->toArray()['props']['auth']['user'];
            $this->assertTrue($auth['has_full_sector_access']);
            $this->assertNull($auth['allowed_sector_ids']);
            $this->assertNull($auth['editable_sector_ids']);
        });
    }
}
