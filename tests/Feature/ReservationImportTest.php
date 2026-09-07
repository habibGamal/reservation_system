<?php

namespace Tests\Feature;

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
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

class ReservationImportTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            RoleAndPermissionSeeder::class,
            PriceRuleSeeder::class,
            SectorAndUnitSeeder::class,
        ]);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('Admin');
    }

    public function test_can_import_real_21_8_xls_file_with_waiting_status_and_branch_type(): void
    {
        $realPath = base_path('21-8.xls');
        $this->assertFileExists($realPath);

        $uploadedFile = new UploadedFile(
            $realPath,
            '21-8.xls',
            'application/vnd.ms-excel',
            null,
            true
        );

        $response = $this->actingAs($this->admin)->post(route('reservations.import'), [
            'file' => $uploadedFile,
            'check_in' => '2026-08-21',
            'check_out' => '2026-08-24',
        ]);

        $response->assertRedirect(route('reservations.index'));
        $response->assertSessionHas('success', 'تم استيراد 182 حجز بنجاح وحفظها بحالة \'انتظار\'.');

        // Verify 182 reservations were created
        $this->assertDatabaseCount('reservations', 182);

        // Verify sample reservation details (Row 2 in file: Villa Luciel 6)
        $lucielSector = Sector::where('name', 'لوسيال')->firstOrFail();
        $unit6 = Unit::where('sector_id', $lucielSector->id)->where('name', '6')->firstOrFail();

        $reservation = Reservation::where('unit_id', $unit6->id)->first();
        $this->assertNotNull($reservation);
        $this->assertEquals('2026-08-21', $reservation->check_in->toDateString());
        $this->assertEquals('2026-08-24', $reservation->check_out->toDateString());
        $this->assertEquals(ReservationStatus::WAITING, $reservation->status);
        $this->assertEquals(ReservationType::BRANCH, $reservation->type);
        $this->assertNull($reservation->membership);
        $this->assertEquals(0.00, $reservation->total_price);
        $this->assertStringContainsString('لواء جوى', $reservation->notes);
        $this->assertStringContainsString('بالمعاش', $reservation->notes);

        // Verify guest record
        $this->assertEquals('90296', $reservation->guest->mil_code);
        $this->assertEquals('01141114170', $reservation->guest->phone);
        $this->assertStringContainsString('احمد', $reservation->guest->name);
    }

    public function test_import_rolls_back_completely_when_unit_conflict_exists(): void
    {
        // Seed conflicting active reservation on unit 6
        $lucielSector = Sector::where('name', 'لوسيال')->firstOrFail();
        $unit6 = Unit::where('sector_id', $lucielSector->id)->where('name', '6')->firstOrFail();

        $existingGuest = Guest::create([
            'name' => 'نزيل سابق',
            'phone' => '01000000000',
        ]);

        Reservation::create([
            'guest_id' => $existingGuest->id,
            'unit_id' => $unit6->id,
            'check_in' => '2026-08-20',
            'check_out' => '2026-08-23',
            'status' => ReservationStatus::CONFIRMED->value,
            'type' => ReservationType::BRANCH->value,
            'total_price' => 500,
        ]);

        $this->assertDatabaseCount('reservations', 1);

        $realPath = base_path('21-8.xls');
        $uploadedFile = new UploadedFile(
            $realPath,
            '21-8.xls',
            'application/vnd.ms-excel',
            null,
            true
        );

        $response = $this->actingAs($this->admin)->post(route('reservations.import'), [
            'file' => $uploadedFile,
            'check_in' => '2026-08-21',
            'check_out' => '2026-08-24',
        ]);

        $response->assertSessionHasErrors('import_errors');

        // Assert 100% rollback: only original reservation exists
        $this->assertDatabaseCount('reservations', 1);
    }

    public function test_import_validates_dates(): void
    {
        $realPath = base_path('21-8.xls');
        $uploadedFile = new UploadedFile(
            $realPath,
            '21-8.xls',
            'application/vnd.ms-excel',
            null,
            true
        );

        // Check out before check in
        $response = $this->actingAs($this->admin)->post(route('reservations.import'), [
            'file' => $uploadedFile,
            'check_in' => '2026-08-24',
            'check_out' => '2026-08-21',
        ]);

        $response->assertSessionHasErrors(['check_in', 'check_out']);
        $this->assertDatabaseCount('reservations', 0);
    }

    public function test_import_detects_intra_batch_duplicate_unit_and_rolls_back(): void
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();

        // Write headers matching MilitaryBranchSpreadsheetStrategy
        $sheet->fromArray([
            ['الرقم العسكرى', 'نوع الوحدة السكنية', 'الرتبــــــة', 'حالة الخدمة', 'اسم النزيل', 'رقم الغرفة', 'رقم التليفون 2'],
            ['11111', 'لوسيال', 'عقيد', 'بالخدمة', 'نزيل أول', '1', '01011111111'],
            ['22222', 'لوسيال', 'مقدم', 'بالخدمة', 'نزيل ثان مكرر', '1', '01022222222'],
        ]);

        $tmpFile = tempnam(sys_get_temp_dir(), 'test_dup').'.xlsx';
        $writer = new Xlsx($spreadsheet);
        $writer->save($tmpFile);

        $uploadedFile = new UploadedFile(
            $tmpFile,
            'duplicate_unit.xlsx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            null,
            true
        );

        $response = $this->actingAs($this->admin)->post(route('reservations.import'), [
            'file' => $uploadedFile,
            'check_in' => '2026-08-21',
            'check_out' => '2026-08-24',
        ]);

        $response->assertSessionHasErrors('import_errors');
        $this->assertDatabaseCount('reservations', 0);

        @unlink($tmpFile);
    }

    public function test_rejects_unsupported_file_format(): void
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->fromArray([
            ['Col A', 'Col B', 'Col C'],
            ['Val 1', 'Val 2', 'Val 3'],
        ]);

        $tmpFile = tempnam(sys_get_temp_dir(), 'unsupported').'.xlsx';
        $writer = new Xlsx($spreadsheet);
        $writer->save($tmpFile);

        $uploadedFile = new UploadedFile(
            $tmpFile,
            'unsupported.xlsx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            null,
            true
        );

        $response = $this->actingAs($this->admin)->post(route('reservations.import'), [
            'file' => $uploadedFile,
            'check_in' => '2026-08-21',
            'check_out' => '2026-08-24',
        ]);

        $response->assertSessionHasErrors('file');
        $this->assertDatabaseCount('reservations', 0);

        @unlink($tmpFile);
    }

    public function test_preview_endpoint_returns_accurate_analysis_without_persisting(): void
    {
        $realPath = base_path('21-8.xls');
        $uploadedFile = new UploadedFile(
            $realPath,
            '21-8.xls',
            'application/vnd.ms-excel',
            null,
            true
        );

        $response = $this->actingAs($this->admin)->postJson(route('reservations.import.preview'), [
            'file' => $uploadedFile,
            'check_in' => '2026-08-21',
            'check_out' => '2026-08-24',
        ]);

        $response->assertOk();
        $response->assertJson([
            'success' => true,
            'data' => [
                'total_rows' => 182,
                'valid_count' => 182,
                'errors_count' => 0,
            ],
        ]);

        // Verify zero reservations created in preview
        $this->assertDatabaseCount('reservations', 0);
    }
}
