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

class PaymentTrackingTest extends TestCase
{
    use RefreshDatabase;

    protected User $receptionist;

    protected User $admin;

    protected User $viewer;

    protected Reservation $reservation;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleAndPermissionSeeder::class);

        $this->receptionist = User::factory()->create();
        $this->receptionist->assignRole('Receptionist');

        $this->admin = User::factory()->create();
        $this->admin->assignRole('Admin');

        $this->viewer = User::factory()->create();
        $this->viewer->assignRole('Viewer');

        $sector = Sector::create(['name' => 'لوسيال']);
        $unit = Unit::create([
            'sector_id' => $sector->id,
            'name' => '201',
        ]);

        $guest = Guest::create([
            'name' => 'خالد عبد الله',
            'phone' => '01234567890',
            'mil_code' => 'MIL-300',
        ]);

        $this->reservation = Reservation::create([
            'guest_id' => $guest->id,
            'unit_id' => $unit->id,
            'check_in' => '2026-10-10',
            'check_out' => '2026-10-15',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 3000.00,
            'notes' => 'حجز تجريبي للمدفوعات',
        ]);
    }

    public function test_new_reservation_without_payments_is_unpaid(): void
    {
        $this->assertEquals(0.00, $this->reservation->paid_amount);
        $this->assertEquals(3000.00, $this->reservation->balance);
        $this->assertEquals('Unpaid', $this->reservation->payment_status);
    }

    public function test_receptionist_can_record_cash_installment_payment(): void
    {
        $response = $this->actingAs($this->receptionist)->post(
            route('reservations.payments.store', $this->reservation),
            [
                'amount' => 1000.00,
                'method' => PaymentMethod::CASH->value,
            ]
        );

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('payments', [
            'reservation_id' => $this->reservation->id,
            'amount' => 1000.00,
            'method' => PaymentMethod::CASH->value,
        ]);

        $this->reservation->refresh();
        $this->assertEquals(1000.00, $this->reservation->paid_amount);
        $this->assertEquals(2000.00, $this->reservation->balance);
        $this->assertEquals('Partially Paid', $this->reservation->payment_status);
    }

    public function test_multi_payment_recording_reconciles_balance_to_fully_paid(): void
    {
        // 1st payment: 1000 EGP Cash
        $this->actingAs($this->receptionist)->post(
            route('reservations.payments.store', $this->reservation),
            [
                'amount' => 1000.00,
                'method' => PaymentMethod::CASH->value,
            ]
        );

        // 2nd payment: 2000 EGP InstaPay with reference number
        $response = $this->actingAs($this->receptionist)->post(
            route('reservations.payments.store', $this->reservation),
            [
                'amount' => 2000.00,
                'method' => PaymentMethod::INSTAPAY->value,
                'reference_number' => 'TXN-INSTA-9988',
            ]
        );

        $response->assertRedirect();

        $this->assertDatabaseHas('payments', [
            'reservation_id' => $this->reservation->id,
            'amount' => 2000.00,
            'method' => PaymentMethod::INSTAPAY->value,
            'reference_number' => 'TXN-INSTA-9988',
        ]);

        $this->reservation->refresh();
        $this->assertCount(2, $this->reservation->payments);
        $this->assertEquals(3000.00, $this->reservation->paid_amount);
        $this->assertEquals(0.00, $this->reservation->balance);
        $this->assertEquals('Fully Paid', $this->reservation->payment_status);
    }

    public function test_payment_validation_rejects_zero_or_negative_amount(): void
    {
        $response = $this->actingAs($this->receptionist)->post(
            route('reservations.payments.store', $this->reservation),
            [
                'amount' => 0,
                'method' => PaymentMethod::CASH->value,
            ]
        );

        $response->assertSessionHasErrors(['amount']);
        $this->assertEquals(0, Payment::count());

        $negativeResponse = $this->actingAs($this->receptionist)->post(
            route('reservations.payments.store', $this->reservation),
            [
                'amount' => -150.00,
                'method' => PaymentMethod::VISA->value,
            ]
        );

        $negativeResponse->assertSessionHasErrors(['amount']);
        $this->assertEquals(0, Payment::count());
    }

    public function test_payment_validation_rejects_invalid_method(): void
    {
        $response = $this->actingAs($this->receptionist)->post(
            route('reservations.payments.store', $this->reservation),
            [
                'amount' => 500.00,
                'method' => 'bitcoin',
            ]
        );

        $response->assertSessionHasErrors(['method']);
        $this->assertEquals(0, Payment::count());
    }

    public function test_authorized_user_can_delete_payment_and_balance_reconciles_back(): void
    {
        $payment1 = Payment::create([
            'reservation_id' => $this->reservation->id,
            'amount' => 1000.00,
            'method' => PaymentMethod::CASH->value,
        ]);

        $payment2 = Payment::create([
            'reservation_id' => $this->reservation->id,
            'amount' => 2000.00,
            'method' => PaymentMethod::VISA->value,
        ]);

        $this->reservation->refresh();
        $this->assertEquals(3000.00, $this->reservation->paid_amount);
        $this->assertEquals(0.00, $this->reservation->balance);
        $this->assertEquals('Fully Paid', $this->reservation->payment_status);

        // Super Admin or Admin can delete
        $response = $this->actingAs($this->admin)->delete(route('payments.destroy', $payment2));

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseMissing('payments', ['id' => $payment2->id]);
        $this->assertDatabaseHas('payments', ['id' => $payment1->id]);

        $this->reservation->refresh();
        $this->assertEquals(1000.00, $this->reservation->paid_amount);
        $this->assertEquals(2000.00, $this->reservation->balance);
        $this->assertEquals('Partially Paid', $this->reservation->payment_status);
    }

    public function test_user_without_permission_cannot_record_payment(): void
    {
        $response = $this->actingAs($this->viewer)->post(
            route('reservations.payments.store', $this->reservation),
            [
                'amount' => 500.00,
                'method' => PaymentMethod::CASH->value,
            ]
        );

        $response->assertForbidden();
        $this->assertEquals(0, Payment::count());
    }
}
