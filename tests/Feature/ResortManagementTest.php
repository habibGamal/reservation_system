<?php

namespace Tests\Feature;

use App\Models\Guest;
use App\Models\PriceRule;
use App\Models\Reservation;
use App\Models\Sector;
use App\Models\Unit;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ResortManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleAndPermissionSeeder::class);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('Admin');
    }

    public function test_guest_is_redirected_from_resort_management(): void
    {
        $response = $this->get(route('resort-management.index'));

        $response->assertRedirect(route('login'));
    }

    public function test_admin_can_view_resort_management_page(): void
    {
        $sector = Sector::create(['name' => 'قطاع الاختبار']);
        $priceRule = PriceRule::create([
            'name' => 'قاعدة تجريبية',
            'rules' => ['عضو' => 500, 'غير عضو' => 800, 'مرافق' => 600, 'مدني' => 1000],
        ]);
        Unit::create([
            'sector_id' => $sector->id,
            'price_rule_id' => $priceRule->id,
            'name' => 'وحدة 1',
            'rooms_count' => 2,
        ]);

        $response = $this->actingAs($this->admin)->get(route('resort-management.index'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('resort-management/index')
            ->has('sectors')
            ->has('units')
            ->has('priceRules')
        );
    }

    // ── Sector CRUD ──

    public function test_can_create_sector(): void
    {
        $response = $this->actingAs($this->admin)->post(route('sectors.store'), [
            'name' => 'شاليهات البحر',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('sectors', ['name' => 'شاليهات البحر']);
    }

    public function test_cannot_create_sector_with_duplicate_name(): void
    {
        Sector::create(['name' => 'قطاع مكرر']);

        $response = $this->actingAs($this->admin)->post(route('sectors.store'), [
            'name' => 'قطاع مكرر',
        ]);

        $response->assertSessionHasErrors(['name']);
    }

    public function test_can_update_sector(): void
    {
        $sector = Sector::create(['name' => 'الاسم القديم']);

        $response = $this->actingAs($this->admin)->put(route('sectors.update', $sector), [
            'name' => 'الاسم الجديد',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('sectors', [
            'id' => $sector->id,
            'name' => 'الاسم الجديد',
        ]);
    }

    public function test_cannot_delete_sector_with_units(): void
    {
        $sector = Sector::create(['name' => 'قطاع به وحدات']);
        Unit::create([
            'sector_id' => $sector->id,
            'name' => 'وحدة 101',
            'rooms_count' => 1,
        ]);

        $response = $this->actingAs($this->admin)->delete(route('sectors.destroy', $sector));

        $response->assertRedirect();
        $response->assertSessionHas('error');
        $this->assertDatabaseHas('sectors', ['id' => $sector->id]);
    }

    public function test_can_delete_empty_sector(): void
    {
        $sector = Sector::create(['name' => 'قطاع فارغ']);

        $response = $this->actingAs($this->admin)->delete(route('sectors.destroy', $sector));

        $response->assertRedirect();
        $response->assertSessionHas('success');
        $this->assertDatabaseMissing('sectors', ['id' => $sector->id]);
    }

    // ── Unit CRUD ──

    public function test_can_create_unit(): void
    {
        $sector = Sector::create(['name' => 'قطاع الوحدات']);
        $rule = PriceRule::create([
            'name' => 'تسعير قياسي',
            'rules' => ['عضو' => 300, 'غير عضو' => 500, 'مرافق' => 400, 'مدني' => 600],
        ]);

        $response = $this->actingAs($this->admin)->post(route('units.store'), [
            'sector_id' => $sector->id,
            'name' => '205',
            'rooms_count' => 3,
            'price_rule_id' => $rule->id,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('units', [
            'sector_id' => $sector->id,
            'name' => '205',
            'rooms_count' => 3,
            'price_rule_id' => $rule->id,
        ]);
    }

    public function test_cannot_create_duplicate_unit_in_same_sector(): void
    {
        $sector = Sector::create(['name' => 'قطاع تجربة']);
        Unit::create([
            'sector_id' => $sector->id,
            'name' => '101',
            'rooms_count' => 1,
        ]);

        $response = $this->actingAs($this->admin)->post(route('units.store'), [
            'sector_id' => $sector->id,
            'name' => '101',
            'rooms_count' => 2,
        ]);

        $response->assertSessionHasErrors(['name']);
    }

    public function test_can_update_unit(): void
    {
        $sector = Sector::create(['name' => 'قطاع أ']);
        $unit = Unit::create([
            'sector_id' => $sector->id,
            'name' => '101',
            'rooms_count' => 1,
        ]);

        $response = $this->actingAs($this->admin)->put(route('units.update', $unit), [
            'sector_id' => $sector->id,
            'name' => '101-معدلة',
            'rooms_count' => 2,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('units', [
            'id' => $unit->id,
            'name' => '101-معدلة',
            'rooms_count' => 2,
        ]);
    }

    public function test_can_bulk_assign_price_rule_to_units(): void
    {
        $sector = Sector::create(['name' => 'قطاع مجمع']);
        $unit1 = Unit::create(['sector_id' => $sector->id, 'name' => '1', 'rooms_count' => 1]);
        $unit2 = Unit::create(['sector_id' => $sector->id, 'name' => '2', 'rooms_count' => 1]);
        $rule = PriceRule::create([
            'name' => 'تسعير مجمع',
            'rules' => ['عضو' => 400, 'غير عضو' => 600, 'مرافق' => 500, 'مدني' => 700],
        ]);

        $response = $this->actingAs($this->admin)->post(route('units.bulk-price-rule'), [
            'unit_ids' => [$unit1->id, $unit2->id],
            'price_rule_id' => $rule->id,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('units', ['id' => $unit1->id, 'price_rule_id' => $rule->id]);
        $this->assertDatabaseHas('units', ['id' => $unit2->id, 'price_rule_id' => $rule->id]);
    }

    public function test_cannot_delete_unit_with_reservations(): void
    {
        $sector = Sector::create(['name' => 'قطاع الحجز']);
        $unit = Unit::create(['sector_id' => $sector->id, 'name' => '1', 'rooms_count' => 1]);
        $guest = Guest::create(['name' => 'نزيل تجريبي', 'phone' => '01000000000']);

        Reservation::create([
            'guest_id' => $guest->id,
            'unit_id' => $unit->id,
            'check_in' => '2026-09-10',
            'check_out' => '2026-09-12',
            'status' => 'ثابت',
            'type' => 'منتجع',
            'membership' => 'عضو',
            'total_price' => 1000,
        ]);

        $response = $this->actingAs($this->admin)->delete(route('units.destroy', $unit));

        $response->assertRedirect();
        $response->assertSessionHas('error');
        $this->assertDatabaseHas('units', ['id' => $unit->id]);
    }

    public function test_can_delete_unit_without_reservations(): void
    {
        $sector = Sector::create(['name' => 'قطاع']);
        $unit = Unit::create(['sector_id' => $sector->id, 'name' => 'قابل_للحذف', 'rooms_count' => 1]);

        $response = $this->actingAs($this->admin)->delete(route('units.destroy', $unit));

        $response->assertRedirect();
        $response->assertSessionHas('success');
        $this->assertDatabaseMissing('units', ['id' => $unit->id]);
    }

    // ── PriceRule CRUD ──

    public function test_can_create_price_rule(): void
    {
        $response = $this->actingAs($this->admin)->post(route('price-rules.store'), [
            'name' => 'تسعير الفيلات الملكية',
            'rules' => [
                'عضو' => 1200,
                'غير عضو' => 2000,
                'مرافق' => 1600,
                'مدني' => 2500,
            ],
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('price_rules', ['name' => 'تسعير الفيلات الملكية']);
    }

    public function test_can_update_price_rule(): void
    {
        $rule = PriceRule::create([
            'name' => 'تسعير قديم',
            'rules' => ['عضو' => 500, 'غير عضو' => 800, 'مرافق' => 600, 'مدني' => 1000],
        ]);

        $response = $this->actingAs($this->admin)->put(route('price-rules.update', $rule), [
            'name' => 'تسعير محدث',
            'rules' => ['عضو' => 550, 'غير عضو' => 850, 'مرافق' => 650, 'مدني' => 1100],
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('price_rules', [
            'id' => $rule->id,
            'name' => 'تسعير محدث',
        ]);
    }

    public function test_can_delete_price_rule(): void
    {
        $rule = PriceRule::create([
            'name' => 'تسعير مؤقت',
            'rules' => ['عضو' => 500, 'غير عضو' => 800, 'مرافق' => 600, 'مدني' => 1000],
        ]);

        $response = $this->actingAs($this->admin)->delete(route('price-rules.destroy', $rule));

        $response->assertRedirect();
        $this->assertDatabaseMissing('price_rules', ['id' => $rule->id]);
    }
}
