<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\RoleAndPermissionSeeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UserAndRoleSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_roles_and_permissions_are_seeded_properly(): void
    {
        $this->seed(RoleAndPermissionSeeder::class);

        $adminRole = Role::findByName('Admin');
        $viewerRole = Role::findByName('Viewer');

        $this->assertNotNull($adminRole);
        $this->assertNotNull($viewerRole);

        // Admin has full access (all registered permissions)
        $allPermissionsCount = Permission::count();
        $this->assertGreaterThan(0, $allPermissionsCount);
        $this->assertEquals($allPermissionsCount, $adminRole->permissions()->count());
        $this->assertTrue($adminRole->hasPermissionTo('reservations.view'));
        $this->assertTrue($adminRole->hasPermissionTo('reservations.create'));
        $this->assertTrue($adminRole->hasPermissionTo('reservations.delete'));
        $this->assertTrue($adminRole->hasPermissionTo('payments.create'));
        $this->assertTrue($adminRole->hasPermissionTo('payments.delete'));
        $this->assertTrue($adminRole->hasPermissionTo('users.manage'));

        // Viewer has read-only access
        $this->assertTrue($viewerRole->hasPermissionTo('reservations.view'));
        $this->assertTrue($viewerRole->hasPermissionTo('reports.export'));

        // Viewer must NOT have write/mutation permissions
        $this->assertFalse($viewerRole->hasPermissionTo('reservations.create'));
        $this->assertFalse($viewerRole->hasPermissionTo('reservations.edit'));
        $this->assertFalse($viewerRole->hasPermissionTo('reservations.delete'));
        $this->assertFalse($viewerRole->hasPermissionTo('reservations.update_status'));
        $this->assertFalse($viewerRole->hasPermissionTo('reservations.override_price'));
        $this->assertFalse($viewerRole->hasPermissionTo('payments.create'));
        $this->assertFalse($viewerRole->hasPermissionTo('payments.delete'));
        $this->assertFalse($viewerRole->hasPermissionTo('guests.manage'));
        $this->assertFalse($viewerRole->hasPermissionTo('units.manage'));
        $this->assertFalse($viewerRole->hasPermissionTo('price_rules.manage'));
        $this->assertFalse($viewerRole->hasPermissionTo('excel.import'));
        $this->assertFalse($viewerRole->hasPermissionTo('users.manage'));
    }

    public function test_role_seeder_delegates_to_role_and_permission_seeder(): void
    {
        $this->seed(RoleSeeder::class);

        $this->assertDatabaseHas('roles', ['name' => 'Admin']);
        $this->assertDatabaseHas('roles', ['name' => 'Viewer']);
    }

    public function test_user_seeder_creates_admin_and_viewer_users_with_proper_roles(): void
    {
        $this->seed(UserSeeder::class);

        // Verify Admin user
        $admin = User::where('email', 'admin@eaglesresort.com')->first();
        $this->assertNotNull($admin);
        $this->assertTrue($admin->hasRole('Admin'));
        $this->assertTrue($admin->can('reservations.view'));
        $this->assertTrue($admin->can('reservations.create'));
        $this->assertTrue($admin->can('reservations.delete'));
        $this->assertTrue($admin->can('payments.create'));
        $this->assertTrue($admin->can('payments.delete'));
        $this->assertTrue($admin->can('users.manage'));

        // Verify Viewer user
        $viewer = User::where('email', 'viewer@eaglesresort.com')->first();
        $this->assertNotNull($viewer);
        $this->assertTrue($viewer->hasRole('Viewer'));
        $this->assertTrue($viewer->can('reservations.view'));
        $this->assertTrue($viewer->can('reports.export'));

        // Verify Viewer cannot perform mutations
        $this->assertFalse($viewer->can('reservations.create'));
        $this->assertFalse($viewer->can('reservations.delete'));
        $this->assertFalse($viewer->can('payments.create'));
        $this->assertFalse($viewer->can('payments.delete'));
        $this->assertFalse($viewer->can('users.manage'));
    }

    public function test_database_seeder_seeds_users_and_roles_end_to_end(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->assertDatabaseHas('users', ['email' => 'admin@eaglesresort.com']);
        $this->assertDatabaseHas('users', ['email' => 'viewer@eaglesresort.com']);

        $admin = User::where('email', 'admin@eaglesresort.com')->first();
        $viewer = User::where('email', 'viewer@eaglesresort.com')->first();

        $this->assertTrue($admin->hasRole('Admin'));
        $this->assertTrue($viewer->hasRole('Viewer'));
    }

    public function test_seeded_users_can_authenticate_with_default_credentials(): void
    {
        $this->seed(UserSeeder::class);

        // Admin login
        $adminResponse = $this->post(route('login.store'), [
            'email' => 'admin@eaglesresort.com',
            'password' => 'password',
        ]);
        $adminResponse->assertRedirect(route('dashboard', absolute: false));
        $this->assertAuthenticated();

        $this->post(route('logout'));
        $this->assertGuest();

        // Viewer login
        $viewerResponse = $this->post(route('login.store'), [
            'email' => 'viewer@eaglesresort.com',
            'password' => 'password',
        ]);
        $viewerResponse->assertRedirect(route('dashboard', absolute: false));
        $this->assertAuthenticated();
    }

    public function test_viewer_shares_read_only_authorization_props_via_inertia(): void
    {
        $this->seed(UserSeeder::class);

        $viewer = User::where('email', 'viewer@eaglesresort.com')->first();

        $response = $this->actingAs($viewer)->get(route('reservations.index'));
        $response->assertOk();

        $response->assertInertia(fn ($page) => $page
            ->component('reservations/index')
            ->where('auth.user.roles', ['Viewer'])
            ->where('auth.user.permissions', fn ($perms) => $perms->contains('reservations.view') &&
                ! $perms->contains('reservations.create') &&
                ! $perms->contains('payments.create')
            )
        );
    }

    public function test_viewer_is_forbidden_from_creating_reservations(): void
    {
        $this->seed(UserSeeder::class);

        $viewer = User::where('email', 'viewer@eaglesresort.com')->first();

        $response = $this->actingAs($viewer)->post(route('reservations.store'), [
            'guest_id' => 1,
            'unit_id' => 1,
            'check_in' => '2026-10-01',
            'check_out' => '2026-10-05',
        ]);

        $response->assertForbidden();
    }
}
