<?php

namespace Database\Seeders;

use App\Models\Sector;
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
            ['email' => 'receptionist@eaglesresort.com'],
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

        // 5. Sector-restricted Viewer Accounts:
        // 1- شاليهات => has only view access for sectors: دورين و مميز و فندق 5
        // 2- فنادق => has only view access for sectors: فندق 1 و 2 و 3 و 4
        // 3- فيلات => has only view access for sectors: لوسيال و فيلات قديم و فيلات جديد
        // 4- فندق 6 => has only view access for sector: فندق 6
        $sectorAccounts = [
            [
                'name' => 'شاليهات',
                'email' => 'chalets@eaglesresort.com',
                'sectors' => ['دورين', 'مميز', 'فندق 5'],
            ],
            [
                'name' => 'فنادق',
                'email' => 'hotels@eaglesresort.com',
                'sectors' => ['فندق 1', 'فندق 2', 'فندق 3', 'فندق 4'],
            ],
            [
                'name' => 'فيلات',
                'email' => 'villas@eaglesresort.com',
                'sectors' => ['لوسيال', 'فيلا قديم', 'فيلات قديم', 'فيلا جديد', 'فيلات جديد'],
            ],
            [
                'name' => 'فندق 6',
                'email' => 'hotel6@eaglesresort.com',
                'sectors' => ['فندق 6'],
            ],
        ];

        foreach ($sectorAccounts as $account) {
            $user = User::updateOrCreate(
                ['email' => $account['email']],
                [
                    'name' => $account['name'],
                    'password' => Hash::make('password'),
                    'email_verified_at' => now(),
                    'has_sector_restrictions' => true,
                ]
            );

            $user->syncRoles(['Viewer']);

            $sectorIds = Sector::whereIn('name', $account['sectors'])->pluck('id');
            $syncData = [];
            foreach ($sectorIds as $sectorId) {
                $syncData[$sectorId] = ['permission' => 'view'];
            }
            $user->sectors()->sync($syncData);
        }
    }
}
