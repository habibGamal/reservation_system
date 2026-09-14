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
use Carbon\Carbon;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class NotifyDueCheckoutsCommandTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;

    protected User $admin;

    protected User $sector1User;

    protected User $sector2User;

    protected Sector $sector1;

    protected Sector $sector2;

    protected Unit $unit1;

    protected Unit $unit2;

    protected Guest $guest;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleAndPermissionSeeder::class);

        $this->superAdmin = User::factory()->create(['name' => 'سوبر ادمن']);
        $this->superAdmin->assignRole('Super Admin');

        $this->admin = User::factory()->create(['name' => 'ادمن']);
        $this->admin->assignRole('Admin');

        $this->sector1 = Sector::create(['name' => 'قطاع 1']);
        $this->sector2 = Sector::create(['name' => 'قطاع 2']);

        $this->sector1User = User::factory()->create(['name' => 'موظف قطاع 1']);
        $this->sector1User->assignRole('Receptionist');
        $this->sector1User->sectors()->attach($this->sector1->id, ['permission' => 'edit']);

        $this->sector2User = User::factory()->create(['name' => 'موظف قطاع 2']);
        $this->sector2User->assignRole('Receptionist');
        $this->sector2User->sectors()->attach($this->sector2->id, ['permission' => 'edit']);

        $priceRule = PriceRule::create([
            'name' => 'أسعار الموسم',
            'rules' => ['عضو' => 500.0],
        ]);

        $this->unit1 = Unit::create([
            'name' => '101',
            'sector_id' => $this->sector1->id,
            'rooms_count' => 1,
            'price_rule_id' => $priceRule->id,
        ]);

        $this->unit2 = Unit::create([
            'name' => '201',
            'sector_id' => $this->sector2->id,
            'rooms_count' => 1,
            'price_rule_id' => $priceRule->id,
        ]);

        $this->guest = Guest::create([
            'name' => 'النزيل محمد',
            'phone' => '01000000000',
        ]);
    }

    public function test_command_notifies_admins_and_sector_users_for_checkout_today(): void
    {
        Notification::fake();

        $today = Carbon::today()->toDateString();
        $inDate = Carbon::today()->subDays(3)->toDateString();

        $reservation = Reservation::create([
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit1->id,
            'check_in' => $inDate,
            'check_out' => $today,
            'status' => ReservationStatus::CHECKED_IN->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1500,
        ]);

        $this->artisan('reservations:notify-due-checkouts')
            ->assertSuccessful();

        Notification::assertSentTo($this->superAdmin, ReservationNotification::class, function ($notification) use ($reservation) {
            return $notification->action === 'checkout_due'
                && $notification->reservationId === $reservation->id
                && str_contains($notification->getBody(), 'موعد مغادرة');
        });

        Notification::assertSentTo($this->admin, ReservationNotification::class);
        Notification::assertSentTo($this->sector1User, ReservationNotification::class);
        Notification::assertNotSentTo($this->sector2User, ReservationNotification::class);
    }

    public function test_command_skips_departed_reservations(): void
    {
        Notification::fake();

        $today = Carbon::today()->toDateString();
        $inDate = Carbon::today()->subDays(2)->toDateString();

        Reservation::create([
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit1->id,
            'check_in' => $inDate,
            'check_out' => $today,
            'status' => ReservationStatus::DEPARTED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1000,
        ]);

        $this->artisan('reservations:notify-due-checkouts')
            ->assertSuccessful();

        Notification::assertNothingSent();
    }

    public function test_command_prevents_duplicate_notifications_on_same_day_unless_forced(): void
    {
        $today = Carbon::today()->toDateString();
        $inDate = Carbon::today()->subDays(2)->toDateString();

        $reservation = Reservation::create([
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit1->id,
            'check_in' => $inDate,
            'check_out' => $today,
            'status' => ReservationStatus::CHECKED_IN->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1000,
        ]);

        // First run: dispatches notification (saved in database notifications table)
        $this->artisan('reservations:notify-due-checkouts')
            ->expectsOutputToContain('1 notified')
            ->assertSuccessful();

        // Second run without force: skips reservation
        $this->artisan('reservations:notify-due-checkouts')
            ->expectsOutputToContain('1 skipped')
            ->assertSuccessful();

        // Third run with --force: re-notifies
        $this->artisan('reservations:notify-due-checkouts', ['--force' => true])
            ->expectsOutputToContain('1 notified')
            ->assertSuccessful();
    }

    public function test_command_supports_custom_date_option(): void
    {
        Notification::fake();

        $customDate = '2026-11-20';
        $inDate = '2026-11-15';

        $reservation = Reservation::create([
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit1->id,
            'check_in' => $inDate,
            'check_out' => $customDate,
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 2500,
        ]);

        $this->artisan('reservations:notify-due-checkouts', ['--date' => $customDate])
            ->assertSuccessful();

        Notification::assertSentTo($this->sector1User, ReservationNotification::class, function ($notification) use ($reservation) {
            return $notification->reservationId === $reservation->id;
        });
    }
}
