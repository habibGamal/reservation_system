<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Ensure roles and permissions are seeded first
        $this->call(RoleAndPermissionSeeder::class);

        // 1. Admin user (Full Access)
        $admin = User::firstOrCreate(
            ['email' => 'admin@eaglesresort.com'],
            [
                'name' => 'مدير النظام',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );
        $admin->syncRoles(['Admin']);

        // 2. Viewer user (Read-only)
        $viewer = User::firstOrCreate(
            ['email' => 'viewer@eaglesresort.com'],
            [
                'name' => 'مشاهد النظام',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );
        $viewer->syncRoles(['Viewer']);

        // 3. Receptionist user (Front desk operations)
        $receptionist = User::firstOrCreate(
            ['email' => ' '],
            [
                'name' => 'موظف الاستقبال',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );
        $receptionist->syncRoles(['Receptionist']);

        // 4. Default test user
        $testUser = User::firstOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );
        $testUser->syncRoles(['Admin']);
    }
}
