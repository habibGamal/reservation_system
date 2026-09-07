<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleAndPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            'reservations.view',
            'reservations.create',
            'reservations.edit',
            'reservations.update_status',
            'reservations.delete',
            'reservations.override_price',
            'payments.create',
            'payments.delete',
            'guests.manage',
            'units.manage',
            'price_rules.manage',
            'excel.import',
            'reports.export',
            'users.manage',
            'activity_logs.view',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // Super Admin gets all permissions
        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin']);
        $superAdmin->syncPermissions(Permission::all());

        // Admin (Full access per requirements)
        $admin = Role::firstOrCreate(['name' => 'Admin']);
        $admin->syncPermissions(Permission::all());

        // Receptionist
        $receptionist = Role::firstOrCreate(['name' => 'Receptionist']);
        $receptionist->syncPermissions([
            'reservations.view',
            'reservations.create',
            'reservations.edit',
            'reservations.update_status',
            'payments.create',
            'guests.manage',
            'reports.export',
        ]);

        // Viewer (Read-only access)
        $viewer = Role::firstOrCreate(['name' => 'Viewer']);
        $viewer->syncPermissions([
            'reservations.view',
            'reports.export',
        ]);
    }
}
