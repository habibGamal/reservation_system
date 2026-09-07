<?php

namespace Tests\Feature;

use App\Models\Sector;
use App\Models\User;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(UserSeeder::class);
    }

    public function test_unauthenticated_users_are_redirected_to_login(): void
    {
        $response = $this->get(route('users.index'));
        $response->assertRedirect(route('login'));
    }

    public function test_unauthorized_users_cannot_access_user_management(): void
    {
        $viewer = User::where('email', 'viewer@eaglesresort.com')->first();
        $this->assertNotNull($viewer);

        $response = $this->actingAs($viewer)->get(route('users.index'));
        $response->assertForbidden();

        $receptionist = User::where('email', 'receptionist@eaglesresort.com')->first();
        $this->assertNotNull($receptionist);

        $response = $this->actingAs($receptionist)->get(route('users.index'));
        $response->assertForbidden();
    }

    public function test_admin_can_view_users_index_page_and_inertia_props(): void
    {
        $admin = User::where('email', 'admin@eaglesresort.com')->first();
        $this->assertNotNull($admin);

        $response = $this->actingAs($admin)->get(route('users.index'));
        $response->assertOk();

        $response->assertInertia(fn ($page) => $page
            ->component('users/index')
            ->has('users')
            ->has('roles')
            ->has('permissionGroups')
            ->has('stats')
        );
    }

    public function test_admin_can_create_new_user_with_roles_and_permissions(): void
    {
        $admin = User::where('email', 'admin@eaglesresort.com')->first();

        $response = $this->actingAs($admin)->post(route('users.store'), [
            'name' => 'ضابط استقبال جديد',
            'email' => 'new.receptionist@eaglesresort.com',
            'password' => 'secret1234',
            'password_confirmation' => 'secret1234',
            'roles' => ['Receptionist'],
            'permissions' => ['reports.export'],
        ]);

        $response->assertSessionHas('success');

        $newUser = User::where('email', 'new.receptionist@eaglesresort.com')->first();
        $this->assertNotNull($newUser);
        $this->assertEquals('ضابط استقبال جديد', $newUser->name);
        $this->assertTrue(Hash::check('secret1234', $newUser->password));
        $this->assertTrue($newUser->hasRole('Receptionist'));
        $this->assertTrue($newUser->hasDirectPermission('reports.export'));
    }

    public function test_admin_can_update_user_profile_and_roles(): void
    {
        $admin = User::where('email', 'admin@eaglesresort.com')->first();
        $viewer = User::where('email', 'viewer@eaglesresort.com')->first();

        $response = $this->actingAs($admin)->put(route('users.update', $viewer), [
            'name' => 'مشاهد النظام المعدل',
            'email' => 'updated.viewer@eaglesresort.com',
            'roles' => ['Receptionist'],
            'permissions' => [],
        ]);

        $response->assertSessionHas('success');

        $viewer->refresh();
        $this->assertEquals('مشاهد النظام المعدل', $viewer->name);
        $this->assertEquals('updated.viewer@eaglesresort.com', $viewer->email);
        $this->assertTrue($viewer->hasRole('Receptionist'));
        $this->assertFalse($viewer->hasRole('Viewer'));
    }

    public function test_admin_can_update_user_password(): void
    {
        $admin = User::where('email', 'admin@eaglesresort.com')->first();
        $receptionist = User::where('email', 'receptionist@eaglesresort.com')->first();

        $response = $this->actingAs($admin)->patch(route('users.update-password', $receptionist), [
            'password' => 'new_secure_password',
            'password_confirmation' => 'new_secure_password',
        ]);

        $response->assertSessionHas('success');

        $receptionist->refresh();
        $this->assertTrue(Hash::check('new_secure_password', $receptionist->password));
    }

    public function test_admin_cannot_delete_their_own_account(): void
    {
        $admin = User::where('email', 'admin@eaglesresort.com')->first();

        $response = $this->actingAs($admin)->delete(route('users.destroy', $admin));

        $response->assertSessionHasErrors('user');
        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }

    public function test_admin_cannot_delete_the_last_admin(): void
    {
        // Remove other admins except $admin
        User::where('email', '!=', 'admin@eaglesresort.com')
            ->whereHas('roles', fn ($q) => $q->whereIn('name', ['Admin', 'Super Admin']))
            ->get()
            ->each(fn ($u) => $u->syncRoles([]));

        $admin = User::where('email', 'admin@eaglesresort.com')->first();

        // Create a temporary super admin who attempts to delete $admin (the sole admin)
        $superAdmin = User::factory()->create([
            'email' => 'temp.super@eaglesresort.com',
        ]);
        $superAdmin->assignRole('Super Admin');

        // Now remove Super Admin from $superAdmin so $admin is the sole admin
        $superAdmin->syncRoles([]);
        $superAdmin->givePermissionTo('users.manage');

        $response = $this->actingAs($superAdmin)->delete(route('users.destroy', $admin));

        $response->assertSessionHasErrors('user');
        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }

    public function test_admin_can_delete_other_user(): void
    {
        $admin = User::where('email', 'admin@eaglesresort.com')->first();
        $viewer = User::where('email', 'viewer@eaglesresort.com')->first();

        $response = $this->actingAs($admin)->delete(route('users.destroy', $viewer));

        $response->assertSessionHas('success');
        $this->assertDatabaseMissing('users', ['id' => $viewer->id]);
    }

    public function test_admin_can_create_update_and_delete_custom_role(): void
    {
        $admin = User::where('email', 'admin@eaglesresort.com')->first();

        // 1. Create custom role
        $createResponse = $this->actingAs($admin)->post(route('roles.store'), [
            'name' => 'Night Supervisor',
            'permissions' => ['reservations.view', 'reservations.update_status'],
        ]);
        $createResponse->assertSessionHas('success');

        $role = Role::findByName('Night Supervisor');
        $this->assertNotNull($role);
        $this->assertTrue($role->hasPermissionTo('reservations.view'));
        $this->assertTrue($role->hasPermissionTo('reservations.update_status'));

        // 2. Update custom role
        $updateResponse = $this->actingAs($admin)->put(route('roles.update', $role), [
            'name' => 'Senior Night Supervisor',
            'permissions' => ['reservations.view', 'reservations.edit'],
        ]);
        $updateResponse->assertSessionHas('success');

        $role->refresh();
        $this->assertEquals('Senior Night Supervisor', $role->name);
        $this->assertTrue($role->hasPermissionTo('reservations.edit'));
        $this->assertFalse($role->hasPermissionTo('reservations.update_status'));

        // 3. Delete custom role
        $deleteResponse = $this->actingAs($admin)->delete(route('roles.destroy', $role));
        $deleteResponse->assertSessionHas('success');

        $this->assertDatabaseMissing('roles', ['name' => 'Senior Night Supervisor']);
    }

    public function test_system_roles_cannot_be_deleted(): void
    {
        $admin = User::where('email', 'admin@eaglesresort.com')->first();
        $receptionistRole = Role::findByName('Receptionist');

        $response = $this->actingAs($admin)->delete(route('roles.destroy', $receptionistRole));

        $response->assertSessionHasErrors('role');
        $this->assertDatabaseHas('roles', ['name' => 'Receptionist']);
    }

    public function test_role_with_assigned_users_cannot_be_deleted(): void
    {
        $admin = User::where('email', 'admin@eaglesresort.com')->first();

        // Create custom role and assign user to it
        $customRole = Role::create(['name' => 'Temporary Operator', 'guard_name' => 'web']);
        $user = User::factory()->create();
        $user->assignRole($customRole);

        $response = $this->actingAs($admin)->delete(route('roles.destroy', $customRole));

        $response->assertSessionHasErrors('role');
        $this->assertDatabaseHas('roles', ['name' => 'Temporary Operator']);
    }

    public function test_admin_can_create_user_with_assigned_sectors(): void
    {
        $admin = User::where('email', 'admin@eaglesresort.com')->first();
        $sector1 = Sector::create(['name' => 'فندق 1']);
        $sector2 = Sector::create(['name' => 'فندق 2']);

        $response = $this->actingAs($admin)->post(route('users.store'), [
            'name' => 'مشرف قطاع محدد',
            'email' => 'sector.supervisor@eaglesresort.com',
            'password' => 'secret1234',
            'password_confirmation' => 'secret1234',
            'roles' => ['Receptionist'],
            'permissions' => [],
            'sectors' => [
                ['sector_id' => $sector1->id, 'permission' => 'view'],
                ['sector_id' => $sector2->id, 'permission' => 'edit'],
            ],
        ]);

        $response->assertSessionHas('success');

        $user = User::where('email', 'sector.supervisor@eaglesresort.com')->first();
        $this->assertNotNull($user);
        $this->assertDatabaseHas('sector_user', [
            'user_id' => $user->id,
            'sector_id' => $sector1->id,
            'permission' => 'view',
        ]);
        $this->assertDatabaseHas('sector_user', [
            'user_id' => $user->id,
            'sector_id' => $sector2->id,
            'permission' => 'edit',
        ]);

        $this->assertTrue($user->canViewSector($sector1));
        $this->assertFalse($user->canEditSector($sector1));
        $this->assertTrue($user->canViewSector($sector2));
        $this->assertTrue($user->canEditSector($sector2));
    }

    public function test_admin_can_update_user_assigned_sectors(): void
    {
        $admin = User::where('email', 'admin@eaglesresort.com')->first();
        $sector1 = Sector::create(['name' => 'فندق 1']);
        $sector2 = Sector::create(['name' => 'فندق 2']);

        $user = User::factory()->create();
        $user->assignRole('Receptionist');
        $user->sectors()->attach($sector1->id, ['permission' => 'view']);

        $response = $this->actingAs($admin)->put(route('users.update', $user), [
            'name' => $user->name,
            'email' => $user->email,
            'roles' => ['Receptionist'],
            'permissions' => [],
            'sectors' => [
                ['sector_id' => $sector1->id, 'permission' => 'edit'],
                ['sector_id' => $sector2->id, 'permission' => 'view'],
            ],
        ]);

        $response->assertSessionHas('success');

        $this->assertDatabaseHas('sector_user', [
            'user_id' => $user->id,
            'sector_id' => $sector1->id,
            'permission' => 'edit',
        ]);
        $this->assertDatabaseHas('sector_user', [
            'user_id' => $user->id,
            'sector_id' => $sector2->id,
            'permission' => 'view',
        ]);

        $this->assertTrue($user->fresh()->canEditSector($sector1));
    }
}
