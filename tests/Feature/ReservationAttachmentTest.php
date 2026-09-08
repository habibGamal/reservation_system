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
use Database\Seeders\PriceRuleSeeder;
use Database\Seeders\RoleAndPermissionSeeder;
use Database\Seeders\SectorAndUnitSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ReservationAttachmentTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected Unit $unit;

    protected Guest $guest;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        $this->seed(RoleAndPermissionSeeder::class);
        $this->seed(PriceRuleSeeder::class);
        $this->seed(SectorAndUnitSeeder::class);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('Super Admin');

        $this->guest = Guest::create([
            'name' => 'محمد أحمد إبراهيم',
            'phone' => '01012345678',
            'mil_code' => 'MIL-8899',
        ]);

        $this->unit = Unit::firstOrFail();
    }

    public function test_user_can_create_reservation_with_image_attachment_and_it_is_compressed(): void
    {
        $file = UploadedFile::fake()->image('national_id.jpg', 2400, 1600);

        $response = $this->actingAs($this->admin)->post(route('reservations.store'), [
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1500.00,
            'attachments' => [$file],
        ]);

        $response->assertRedirect();

        $reservation = Reservation::latest('id')->firstOrFail();
        $this->assertNotEmpty($reservation->attachments);
        $this->assertCount(1, $reservation->attachments);

        $att = $reservation->attachments[0];
        $this->assertEquals('national_id.jpg', $att['file_name']);
        $this->assertEquals('image/webp', $att['mime_type']);
        $this->assertStringEndsWith('.webp', $att['file_path']);
        $this->assertNotEmpty($att['url']);
        $this->assertNotEmpty($att['human_size']);

        Storage::disk('public')->assertExists($att['file_path']);
    }

    public function test_user_can_upload_pdf_attachment(): void
    {
        $pdfFile = UploadedFile::fake()->create('contract.pdf', 350, 'application/pdf');

        $response = $this->actingAs($this->admin)->post(route('reservations.store'), [
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1500.00,
            'attachments' => [$pdfFile],
        ]);

        $response->assertRedirect();

        $reservation = Reservation::latest('id')->firstOrFail();
        $this->assertCount(1, $reservation->attachments);

        $att = $reservation->attachments[0];
        $this->assertEquals('contract.pdf', $att['file_name']);
        $this->assertEquals('application/pdf', $att['mime_type']);
        $this->assertStringEndsWith('.pdf', $att['file_path']);

        Storage::disk('public')->assertExists($att['file_path']);
    }

    public function test_user_can_add_attachments_when_updating_reservation(): void
    {
        $initialFile = UploadedFile::fake()->image('first.jpg', 600, 400);

        $this->actingAs($this->admin)->post(route('reservations.store'), [
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1500.00,
            'attachments' => [$initialFile],
        ]);

        $reservation = Reservation::latest('id')->firstOrFail();
        $this->assertCount(1, $reservation->attachments);

        $newFile = UploadedFile::fake()->image('second.png', 800, 600);

        $updateResponse = $this->actingAs($this->admin)->put(route('reservations.update', $reservation), [
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1500.00,
            'attachments' => [$newFile],
        ]);

        $updateResponse->assertRedirect();

        $reservation->refresh();
        $this->assertCount(2, $reservation->attachments);

        Storage::disk('public')->assertExists($reservation->attachments[0]['file_path']);
        Storage::disk('public')->assertExists($reservation->attachments[1]['file_path']);
    }

    public function test_user_can_delete_attachment_when_updating_reservation(): void
    {
        $file1 = UploadedFile::fake()->image('photo1.jpg', 600, 400);
        $file2 = UploadedFile::fake()->image('photo2.jpg', 600, 400);

        $this->actingAs($this->admin)->post(route('reservations.store'), [
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1500.00,
            'attachments' => [$file1, $file2],
        ]);

        $reservation = Reservation::latest('id')->firstOrFail();
        $this->assertCount(2, $reservation->attachments);

        $idToDelete = $reservation->attachments[0]['id'];
        $pathToDelete = $reservation->attachments[0]['file_path'];
        $pathToKeep = $reservation->attachments[1]['file_path'];

        Storage::disk('public')->assertExists($pathToDelete);
        Storage::disk('public')->assertExists($pathToKeep);

        $updateResponse = $this->actingAs($this->admin)->put(route('reservations.update', $reservation), [
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1500.00,
            'deleted_attachment_ids' => [$idToDelete],
        ]);

        $updateResponse->assertRedirect();

        $reservation->refresh();
        $this->assertCount(1, $reservation->attachments);
        $this->assertNotEquals($idToDelete, $reservation->attachments[0]['id']);

        // Assert deleted file is purged from disk, and other remains
        Storage::disk('public')->assertMissing($pathToDelete);
        Storage::disk('public')->assertExists($pathToKeep);
    }

    public function test_deleting_reservation_purges_all_attachment_files_from_storage(): void
    {
        $file1 = UploadedFile::fake()->image('p1.jpg', 600, 400);
        $file2 = UploadedFile::fake()->image('p2.jpg', 600, 400);

        $this->actingAs($this->admin)->post(route('reservations.store'), [
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1500.00,
            'attachments' => [$file1, $file2],
        ]);

        $reservation = Reservation::latest('id')->firstOrFail();
        $paths = array_column($reservation->attachments, 'file_path');

        foreach ($paths as $path) {
            Storage::disk('public')->assertExists($path);
        }

        $this->actingAs($this->admin)->delete(route('reservations.destroy', $reservation));

        foreach ($paths as $path) {
            Storage::disk('public')->assertMissing($path);
        }
    }

    public function test_user_can_view_and_download_attachment_with_permission(): void
    {
        $file = UploadedFile::fake()->image('receipt.jpg', 800, 600);

        $this->actingAs($this->admin)->post(route('reservations.store'), [
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1500.00,
            'attachments' => [$file],
        ]);

        $reservation = Reservation::latest('id')->firstOrFail();
        $attachmentId = $reservation->attachments[0]['id'];

        // Test view inline
        $viewResponse = $this->actingAs($this->admin)->get(
            route('reservations.attachments.show', [$reservation, $attachmentId])
        );
        $viewResponse->assertOk();
        $this->assertStringContainsString('inline', (string) $viewResponse->headers->get('content-disposition'));

        // Test download
        $downloadResponse = $this->actingAs($this->admin)->get(
            route('reservations.attachments.show', [$reservation, $attachmentId]).'?download=1'
        );
        $downloadResponse->assertOk();
        $this->assertStringContainsString('attachment', (string) $downloadResponse->headers->get('content-disposition'));
    }

    public function test_user_cannot_access_attachment_of_unauthorized_sector(): void
    {
        $file = UploadedFile::fake()->image('id.jpg', 600, 400);

        $this->actingAs($this->admin)->post(route('reservations.store'), [
            'guest_id' => $this->guest->id,
            'unit_id' => $this->unit->id,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'membership' => MembershipType::MEMBER->value,
            'total_price' => 1500.00,
            'attachments' => [$file],
        ]);

        $reservation = Reservation::latest('id')->firstOrFail();
        $attachmentId = $reservation->attachments[0]['id'];

        // Create restricted user with access only to another sector (not this unit's sector)
        $otherSector = Sector::where('id', '!=', $this->unit->sector_id)->first();
        if (! $otherSector) {
            $otherSector = Sector::create(['name' => 'قطاع آخر جديد']);
        }

        $restrictedUser = User::factory()->create([
            'has_sector_restrictions' => true,
        ]);
        $restrictedUser->assignRole('Receptionist');
        $restrictedUser->sectors()->attach($otherSector->id, ['permission' => 'view']);

        $response = $this->actingAs($restrictedUser)->get(
            route('reservations.attachments.show', [$reservation, $attachmentId])
        );

        $response->assertForbidden();
    }
}
