<?php

namespace Tests\Feature;

use App\Enums\MembershipType;
use App\Enums\ReservationStatus;
use App\Enums\ReservationType;
use App\Models\Reservation;
use App\Models\Sector;
use App\Models\Unit;
use App\Models\User;
use Database\Seeders\PriceRuleSeeder;
use Database\Seeders\RoleAndPermissionSeeder;
use Database\Seeders\SectorAndUnitSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class MilitaryExportImportTest extends TestCase
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

    public function test_can_import_real_4_9_xls_file_with_concatenated_guest_name(): void
    {
        $realPath = base_path('4-9.xls');
        $this->assertFileExists($realPath);

        $uploadedFile = new UploadedFile(
            $realPath,
            '4-9.xls',
            'application/vnd.ms-excel',
            null,
            true
        );

        $response = $this->actingAs($this->admin)->post(route('reservations.import'), [
            'file' => $uploadedFile,
            'check_in' => '2026-09-04',
            'check_out' => '2026-09-10',
        ]);

        $response->assertRedirect(route('reservations.index'));
        $response->assertSessionHas('success', "تم استيراد 178 حجز بنجاح وحفظها بحالة 'انتظار'.");

        // Verify 178 reservations created
        $this->assertDatabaseCount('reservations', 178);

        // 1. Verify Row 2: Room 85 in Hotel 4 (غرفتين فندق 4)
        $hotel4 = Sector::where('name', 'فندق 4')->firstOrFail();
        $unit85 = Unit::where('sector_id', $hotel4->id)->where('name', '85')->firstOrFail();
        $res85 = Reservation::where('unit_id', $unit85->id)->firstOrFail();

        $this->assertEquals(ReservationStatus::WAITING, $res85->status);
        $this->assertEquals(ReservationType::BRANCH, $res85->type);
        $this->assertEquals(MembershipType::MEMBER, $res85->membership);
        $this->assertEquals(0.00, $res85->total_price);
        $this->assertEquals('عميد محارب اسامه جمعه سليمان عقيله', $res85->guest->name);
        $this->assertEquals('39155', $res85->guest->mil_code);
        $this->assertStringContainsString('الرتبة: عميد محارب', $res85->notes);
        $this->assertStringContainsString('كود الحجز: 36703', $res85->notes);
        $this->assertStringContainsString('حالة الخدمة: بالمعاش', $res85->notes);

        // 2. Verify Row 3: Villa Old 5 (فيلا 5)
        $villaOld = Sector::where('name', 'فيلا قديم')->firstOrFail();
        $unit5 = Unit::where('sector_id', $villaOld->id)->where('name', '5')->firstOrFail();
        $res5 = Reservation::where('unit_id', $unit5->id)->firstOrFail();

        $this->assertEquals('لواء طيار أح مجدالدين رفعت محمد احمد رفعت', $res5->guest->name);
        $this->assertEquals('24332', $res5->guest->mil_code);
        $this->assertEquals('01006013666', $res5->guest->phone); // Phone 2
        $this->assertEquals(MembershipType::MEMBER, $res5->membership);
        $this->assertStringContainsString('كود الحجز: 36682', $res5->notes);

        // 3. Verify Row 11: Civilian row with empty rank and empty military ID
        $unit82 = Unit::where('sector_id', $hotel4->id)->where('name', '82')->firstOrFail();
        $res82 = Reservation::where('unit_id', $unit82->id)->firstOrFail();

        $this->assertEquals('احمد سيد احمد عبدالديم', $res82->guest->name);
        $this->assertNull($res82->guest->mil_code);
        $this->assertEquals(MembershipType::NON_MEMBER, $res82->membership);

        // 4. Verify Hotel 5 unit with trailing 'B' stripped (e.g. 15B -> 15)
        $hotel5 = Sector::where('name', 'فندق 5')->firstOrFail();
        $unit15B = Unit::where('sector_id', $hotel5->id)->where('name', '15')->firstOrFail();
        $res15B = Reservation::where('unit_id', $unit15B->id)->firstOrFail();

        $this->assertNotNull($res15B);
        $this->assertStringContainsString('وليد طلعت محمد المرسى عيسى', $res15B->guest->name);

        // 5. Verify that sheet dates are ignored and all reservations strictly receive the dialog dates
        $hotel6 = Sector::where('name', 'فندق 6')->firstOrFail();
        $unit303 = Unit::where('sector_id', $hotel6->id)->where('name', '303')->firstOrFail();
        $res303 = Reservation::where('unit_id', $unit303->id)->firstOrFail();
        // Row 166 had 2026-09-04 to 2026-09-08 in the spreadsheet, but must have dialog dates (2026-09-04 to 2026-09-10)
        $this->assertEquals('2026-09-04', $res303->check_in->toDateString());
        $this->assertEquals('2026-09-10', $res303->check_out->toDateString());

        // Assert all 178 reservations strictly match the upload dialog dates
        $this->assertEquals(
            178,
            Reservation::where('check_in', '2026-09-04')->where('check_out', '2026-09-10')->count()
        );
    }

    public function test_preview_endpoint_works_for_4_9_xls(): void
    {
        $realPath = base_path('4-9.xls');
        $uploadedFile = new UploadedFile(
            $realPath,
            '4-9.xls',
            'application/vnd.ms-excel',
            null,
            true
        );

        $response = $this->actingAs($this->admin)->postJson(route('reservations.import.preview'), [
            'file' => $uploadedFile,
            'check_in' => '2026-09-04',
            'check_out' => '2026-09-10',
        ]);

        $response->assertOk();
        $response->assertJson([
            'success' => true,
            'data' => [
                'total_rows' => 178,
                'valid_count' => 178,
                'errors_count' => 0,
            ],
        ]);

        $this->assertDatabaseCount('reservations', 0);
    }
}
