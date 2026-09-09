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
        $admin = User::updateOrCreate(
            ['email' => 'admin@eaglesresort.com'],
            [
                'name' => 'مدير النظام',
                'password' => Hash::make('Admin#Eagle!2026'),
                'email_verified_at' => now(),
            ]
        );
        $admin->syncRoles(['Admin']);

        // 2. Viewer user (Read-only)
        $viewer = User::updateOrCreate(
            ['email' => 'viewer@eaglesresort.com'],
            [
                'name' => 'مشاهد النظام',
                'password' => Hash::make('View#Eagle!3914'),
                'email_verified_at' => now(),
            ]
        );
        $viewer->syncRoles(['Viewer']);

        // 3. Receptionist user (Front desk operations)
        $receptionist = User::updateOrCreate(
            ['email' => 'receptionist@eaglesresort.com'],
            [
                'name' => 'موظف الاستقبال',
                'password' => Hash::make('Recep#Eagle!7825'),
                'email_verified_at' => now(),
            ]
        );
        $receptionist->syncRoles(['Receptionist']);

        // 4. Default test user
        $testUser = User::updateOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => Hash::make('Test#Eagle!5640'),
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
                'password' => 'Chalet#Eagle!4198',
                'sectors' => ['دورين', 'مميز', 'فندق 5'],
            ],
            [
                'name' => 'فنادق',
                'email' => 'hotels@eaglesresort.com',
                'password' => 'Hotel#Eagle!6372',
                'sectors' => ['فندق 1', 'فندق 2', 'فندق 3', 'فندق 4'],
            ],
            [
                'name' => 'فيلات',
                'email' => 'villas@eaglesresort.com',
                'password' => 'Villa#Eagle!8521',
                'sectors' => ['لوسيال', 'فيلا قديم', 'فيلات قديم', 'فيلا جديد', 'فيلات جديد'],
            ],
            [
                'name' => 'فندق 6',
                'email' => 'hotel6@eaglesresort.com',
                'password' => 'Hotel6#Eagle!9034',
                'sectors' => ['فندق 6'],
            ],
        ];

        foreach ($sectorAccounts as $account) {
            $user = User::updateOrCreate(
                ['email' => $account['email']],
                [
                    'name' => $account['name'],
                    'password' => Hash::make($account['password']),
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

/**
 * user notes
 * MANAGE_OPERATIONS_URL=https://slategrey-spider-145914.hostingersite.com
 */
