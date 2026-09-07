<?php

namespace Database\Seeders;

use App\Models\Guest;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RoleAndPermissionSeeder::class,
            UserSeeder::class,
            PriceRuleSeeder::class,
            SectorAndUnitSeeder::class,
        ]);

        // Create Sample Guests
        Guest::firstOrCreate(
            ['phone' => '01012345678'],
            [
                'name' => 'أحمد منصور',
                'mil_code' => 'MIL-10492',
            ]
        );

        Guest::firstOrCreate(
            ['phone' => '01198765432'],
            [
                'name' => 'محمود السيد',
                'mil_code' => 'MIL-87311',
            ]
        );

        Guest::firstOrCreate(
            ['phone' => '01234567890'],
            [
                'name' => 'طارق عبد العزيز',
                'mil_code' => null,
            ]
        );
    }
}
