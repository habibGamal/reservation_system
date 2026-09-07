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
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReservationQuickUpdateTest extends TestCase
{
    use RefreshDatabase;

    protected User $receptionist;

    protected User $viewer;

    protected Reservation $reservation;

    protected Unit $unit;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleAndPermissionSeeder::class);

        $this->receptionist = User::factory()->create();
        $this->receptionist->assignRole('Receptionist');

        $this->viewer = User::factory()->create();
        $this->viewer->assignRole('Viewer');

        $guest = Guest::create([
            'name' => 'محمد سعيد',
            'phone' => '01012345678',
            'mil_code' => 'M-1234',
        ]);

        $sector = Sector::create(['name' => 'قطاع أ']);
        $this->receptionist->sectors()->attach($sector->id, ['permission' => 'edit']);

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
            'sector_id' => $sector->id,
            'price_rule_id' => $priceRule->id,
            'name' => 'فيلا 101',
        ]);

        $this->reservation = Reservation::create([
            'guest_id' => $guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-04', // 3 nights
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1500.0, // 3 nights * 500
        ]);
    }

    public function test_receptionist_can_quick_update_status(): void
    {
        $response = $this->actingAs($this->receptionist)->patchJson(
            route('reservations.quick-update', $this->reservation),
            ['status' => ReservationStatus::CHECKED_IN->value]
        );

        $response->assertOk();
        $response->assertJsonPath('reservation.status', ReservationStatus::CHECKED_IN->value);

        $this->assertDatabaseHas('reservations', [
            'id' => $this->reservation->id,
            'status' => ReservationStatus::CHECKED_IN->value,
        ]);
    }

    public function test_receptionist_can_quick_update_type(): void
    {
        $response = $this->actingAs($this->receptionist)->patchJson(
            route('reservations.quick-update', $this->reservation),
            ['type' => ReservationType::MANAGEMENT->value]
        );

        $response->assertOk();
        $response->assertJsonPath('reservation.type', ReservationType::MANAGEMENT->value);

        $this->assertDatabaseHas('reservations', [
            'id' => $this->reservation->id,
            'type' => ReservationType::MANAGEMENT->value,
        ]);
    }

    public function test_receptionist_can_quick_update_membership_and_recalculate_price(): void
    {
        // Changing from عضو (500/night) to غير عضو (800/night) for 3 nights = 2400
        $response = $this->actingAs($this->receptionist)->patchJson(
            route('reservations.quick-update', $this->reservation),
            ['membership' => MembershipType::NON_MEMBER->value]
        );

        $response->assertOk();
        $response->assertJsonPath('reservation.membership', MembershipType::NON_MEMBER->value);
        $response->assertJsonPath('reservation.total_price', 2400);

        $this->assertDatabaseHas('reservations', [
            'id' => $this->reservation->id,
            'membership' => MembershipType::NON_MEMBER->value,
            'total_price' => 2400.0,
        ]);
    }

    public function test_receptionist_can_quick_update_notes(): void
    {
        $response = $this->actingAs($this->receptionist)->patchJson(
            route('reservations.quick-update', $this->reservation),
            ['notes' => 'ملاحظة خاصة بالنزيل والوصول المتأخر']
        );

        $response->assertOk();
        $response->assertJsonPath('reservation.notes', 'ملاحظة خاصة بالنزيل والوصول المتأخر');

        $this->assertDatabaseHas('reservations', [
            'id' => $this->reservation->id,
            'notes' => 'ملاحظة خاصة بالنزيل والوصول المتأخر',
        ]);
    }

    public function test_receptionist_can_clear_notes(): void
    {
        $this->reservation->update(['notes' => 'ملاحظة موجودة مسبقاً']);

        $response = $this->actingAs($this->receptionist)->patchJson(
            route('reservations.quick-update', $this->reservation),
            ['notes' => null]
        );

        $response->assertOk();
        $response->assertJsonPath('reservation.notes', null);

        $this->assertDatabaseHas('reservations', [
            'id' => $this->reservation->id,
            'notes' => null,
        ]);
    }

    public function test_receptionist_can_quick_update_enter_from_gates(): void
    {
        $this->assertFalse($this->reservation->enter_from_gates);

        $response = $this->actingAs($this->receptionist)->patchJson(
            route('reservations.quick-update', $this->reservation),
            ['enter_from_gates' => true]
        );

        $response->assertOk();
        $response->assertJsonPath('reservation.enter_from_gates', true);

        $this->assertDatabaseHas('reservations', [
            'id' => $this->reservation->id,
            'enter_from_gates' => true,
        ]);
    }

    public function test_viewer_cannot_quick_update_reservation(): void
    {
        $response = $this->actingAs($this->viewer)->patchJson(
            route('reservations.quick-update', $this->reservation),
            ['status' => ReservationStatus::CHECKED_IN->value]
        );

        $response->assertForbidden();
    }
}
