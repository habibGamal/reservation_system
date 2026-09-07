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
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GuestManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $receptionist;

    protected User $viewer;

    protected Guest $guest1;

    protected Guest $guest2;

    protected Guest $guest3;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleAndPermissionSeeder::class);

        $this->receptionist = User::factory()->create();
        $this->receptionist->assignRole('Receptionist');

        $this->viewer = User::factory()->create();
        $this->viewer->assignRole('Viewer');

        $this->guest1 = Guest::create([
            'name' => 'أحمد منصور',
            'phone' => '01012345678',
            'mil_code' => 'M-9842',
        ]);

        $this->guest2 = Guest::create([
            'name' => 'محمود كمال',
            'phone' => '01123456789',
            'mil_code' => 'M-5555',
        ]);

        $this->guest3 = Guest::create([
            'name' => 'سارة خليل',
            'phone' => '01234567890',
            'mil_code' => null,
        ]);
    }

    public function test_receptionist_can_search_guests_by_name(): void
    {
        $response = $this->actingAs($this->receptionist)->getJson(route('guests.index', ['search' => 'منصور']));

        $response->assertOk();
        $response->assertJsonCount(1);
        $response->assertJsonFragment(['name' => 'أحمد منصور']);
        $response->assertJsonMissing(['name' => 'محمود كمال']);
    }

    public function test_receptionist_can_search_guests_by_phone(): void
    {
        $response = $this->actingAs($this->receptionist)->getJson(route('guests.index', ['search' => '0101234']));

        $response->assertOk();
        $response->assertJsonCount(1);
        $response->assertJsonFragment(['name' => 'أحمد منصور']);
    }

    public function test_receptionist_can_search_guests_by_military_code(): void
    {
        $response = $this->actingAs($this->receptionist)->getJson(route('guests.index', ['search' => '9842']));

        $response->assertOk();
        $response->assertJsonCount(1);
        $response->assertJsonFragment(['name' => 'أحمد منصور', 'mil_code' => 'M-9842']);
    }

    public function test_receptionist_can_create_guest_inline(): void
    {
        $payload = [
            'name' => 'ياسين أحمد',
            'phone' => '01500000000',
            'mil_code' => 'M-7777',
        ];

        $response = $this->actingAs($this->receptionist)->postJson(route('guests.store'), $payload);

        $response->assertCreated();
        $response->assertJsonFragment([
            'name' => 'ياسين أحمد',
            'phone' => '01500000000',
            'mil_code' => 'M-7777',
        ]);

        $this->assertDatabaseHas('guests', [
            'name' => 'ياسين أحمد',
            'phone' => '01500000000',
            'mil_code' => 'M-7777',
        ]);
    }

    public function test_guest_creation_requires_name_and_phone(): void
    {
        $response = $this->actingAs($this->receptionist)->postJson(route('guests.store'), [
            'mil_code' => 'M-1234',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['name', 'phone']);
    }

    public function test_viewer_cannot_create_guest(): void
    {
        $payload = [
            'name' => 'ضيف جديد',
            'phone' => '01511111111',
            'mil_code' => null,
        ];

        $response = $this->actingAs($this->viewer)->postJson(route('guests.store'), $payload);

        $response->assertForbidden();
        $this->assertDatabaseMissing('guests', ['name' => 'ضيف جديد']);
    }

    public function test_receptionist_can_view_guest_profile_with_reservation_history(): void
    {
        $sector = Sector::create(['name' => 'الفيلا القديمة']);
        $unit = Unit::create([
            'sector_id' => $sector->id,
            'name' => 'شاليه 12',
        ]);

        $reservation = Reservation::create([
            'guest_id' => $this->guest1->id,
            'unit_id' => $unit->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 2000.00,
            'notes' => 'حجز تجريبي للملف الشخصي',
        ]);

        Payment::create([
            'reservation_id' => $reservation->id,
            'amount' => 1000.00,
            'method' => PaymentMethod::CASH->value,
        ]);

        $response = $this->actingAs($this->receptionist)->getJson(route('guests.show', $this->guest1));

        $response->assertOk();
        $response->assertJsonPath('guest.id', $this->guest1->id);
        $response->assertJsonPath('guest.name', 'أحمد منصور');
        $response->assertJsonPath('guest.phone', '01012345678');
        $response->assertJsonCount(1, 'guest.reservations');
        $response->assertJsonPath('guest.reservations.0.id', $reservation->id);
        $response->assertJsonPath('guest.reservations.0.unit.name', 'شاليه 12');
        $response->assertJsonPath('guest.reservations.0.total_price', 2000);
        $response->assertJsonPath('guest.reservations.0.paid_amount', 1000);
        $response->assertJsonPath('guest.reservations.0.balance', 1000);
    }

    public function test_receptionist_can_update_guest_name_phone_and_mil_code(): void
    {
        $response = $this->actingAs($this->receptionist)->patchJson(route('guests.update', $this->guest1), [
            'name' => 'أحمد منصور المعدل',
            'phone' => '01099998888',
            'mil_code' => 'M-1111',
        ]);

        $response->assertOk();
        $response->assertJsonPath('guest.name', 'أحمد منصور المعدل');
        $response->assertJsonPath('guest.phone', '01099998888');
        $response->assertJsonPath('guest.mil_code', 'M-1111');

        $this->assertDatabaseHas('guests', [
            'id' => $this->guest1->id,
            'name' => 'أحمد منصور المعدل',
            'phone' => '01099998888',
            'mil_code' => 'M-1111',
        ]);
    }

    public function test_guest_update_validates_required_fields(): void
    {
        $response = $this->actingAs($this->receptionist)->patchJson(route('guests.update', $this->guest1), [
            'name' => '',
            'phone' => '',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['name', 'phone']);
    }

    public function test_unauthorized_user_cannot_update_guest(): void
    {
        $response = $this->actingAs($this->viewer)->patchJson(route('guests.update', $this->guest1), [
            'name' => 'اسم غير مصرح',
        ]);

        $response->assertForbidden();
    }

    public function test_unauthenticated_user_cannot_access_guests(): void
    {
        $this->getJson(route('guests.index'))->assertUnauthorized();
        $this->postJson(route('guests.store'), ['name' => 'Test', 'phone' => '123'])->assertUnauthorized();
        $this->getJson(route('guests.show', $this->guest1))->assertUnauthorized();
    }
}
