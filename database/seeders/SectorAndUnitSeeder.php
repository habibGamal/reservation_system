<?php

namespace Database\Seeders;

use App\Models\PriceRule;
use App\Models\Sector;
use App\Models\Unit;
use Illuminate\Database\Seeder;

class SectorAndUnitSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        if (PriceRule::where('name', PriceRuleSeeder::RULE_VILLAS)->doesntExist()) {
            $this->call(PriceRuleSeeder::class);
        }

        $priceRules = PriceRule::pluck('id', 'name');

        $sectors = $this->getSectorsDefinition();

        foreach ($sectors as $sectorData) {
            $hasMeals = ($sectorData['name'] === 'فندق 6');
            $sector = Sector::updateOrCreate(
                ['name' => $sectorData['name']],
                ['has_meals' => $hasMeals]
            );

            foreach ($sectorData['units'] as $unitInfo) {
                $priceRuleName = $unitInfo['price_rule'];
                $priceRuleId = $priceRules[$priceRuleName] ?? null;

                Unit::updateOrCreate(
                    [
                        'sector_id' => $sector->id,
                        'name' => (string) $unitInfo['name'],
                    ],
                    [
                        'price_rule_id' => $priceRuleId,
                        'rooms_count' => $unitInfo['rooms_count'],
                    ]
                );
            }
        }

        PriceRule::whereIn('name', [
            'تسعير شاليهات لوسيال',
            'تسعير الفنادق القياسي',
            'تسعير الفيلات والدوبلكس',
        ])->doesntHave('units')->delete();
    }

    /**
     * Build the resort sectors and units data structure internally without external file dependencies.
     *
     * @return array<int, array{name: string, units: array<int, array{name: string, rooms_count: int, price_rule: string}>}>
     */
    private function getSectorsDefinition(): array
    {
        // 1. لوسيال (8 units: 1 to 8, 2 rooms each)
        $lucielUnits = [];
        for ($i = 1; $i <= 8; $i++) {
            $lucielUnits[] = [
                'name' => (string) $i,
                'rooms_count' => 5,
                'price_rule' => PriceRuleSeeder::RULE_LUSIAL_VILLAS,
            ];
        }

        // 2. فيلا قديم (10 units: 1 to 10, 4 rooms each)
        $oldVillaUnits = [];
        for ($i = 1; $i <= 10; $i++) {
            $oldVillaUnits[] = [
                'name' => (string) $i,
                'rooms_count' => 5,
                'price_rule' => PriceRuleSeeder::RULE_VILLAS,
            ];
        }

        // 3. فيلا جديد (12 units: 11 to 22, 5 rooms each)
        $newVillaUnits = [];
        for ($i = 11; $i <= 22; $i++) {
            $newVillaUnits[] = [
                'name' => (string) $i,
                'rooms_count' => 5,
                'price_rule' => PriceRuleSeeder::RULE_VILLAS,
            ];
        }

        // 4. فندق 1 (24 units: 1 to 24, double rooms 'ز' have 2 rooms, single rooms have 1 room)
        $hotel1Doubles = [1, 2, 7, 8, 9, 10, 15, 16, 17, 18, 23, 24];
        $hotel1Units = [];
        for ($i = 1; $i <= 24; $i++) {
            $isDouble = in_array($i, $hotel1Doubles, true);
            $hotel1Units[] = [
                'name' => (string) $i,
                'rooms_count' => $isDouble ? 2 : 1,
                'price_rule' => $isDouble
                    ? PriceRuleSeeder::RULE_HOTEL_1_2_2_BEDROOMS
                    : PriceRuleSeeder::RULE_HOTEL_1_2_3_4_1_BEDROOM,
            ];
        }

        // 5. فندق 2 (24 units: 25 to 48, double rooms 'ز' have 2 rooms, single rooms have 1 room)
        $hotel2Doubles = [25, 26, 31, 32, 33, 34, 39, 40, 41, 42, 47, 48];
        $hotel2Units = [];
        for ($i = 25; $i <= 48; $i++) {
            $isDouble = in_array($i, $hotel2Doubles, true);
            $hotel2Units[] = [
                'name' => (string) $i,
                'rooms_count' => $isDouble ? 2 : 1,
                'price_rule' => $isDouble
                    ? PriceRuleSeeder::RULE_HOTEL_1_2_2_BEDROOMS
                    : PriceRuleSeeder::RULE_HOTEL_1_2_3_4_1_BEDROOM,
            ];
        }

        // 6. فندق 3 (30 units: 49 to 78, 1 room each)
        $hotel3Units = [];
        for ($i = 49; $i <= 78; $i++) {
            $hotel3Units[] = [
                'name' => (string) $i,
                'rooms_count' => 1,
                'price_rule' => PriceRuleSeeder::RULE_HOTEL_1_2_3_4_1_BEDROOM,
            ];
        }

        // 7. فندق 4 (30 units: 79 to 108, 2 room each)
        $hotel4SingleRoom = [83, 84];
        $hotel4Units = [];
        for ($i = 79; $i <= 108; $i++) {
            $isSingle = in_array($i, $hotel4SingleRoom, true);
            $hotel4Units[] = [
                'name' => (string) $i,
                'rooms_count' => $isSingle ? 1 : 2,
                'price_rule' => $isSingle
                    ? PriceRuleSeeder::RULE_HOTEL_1_2_3_4_1_BEDROOM
                    : PriceRuleSeeder::RULE_HOTEL_4_2_BEDROOMS,
            ];
        }

        // 8. فندق 5 (18 units: 1 to 18, 1 room each)
        $hotel5SingleRoom = [2, 5];
        $hotel5Units = [];
        for ($i = 1; $i <= 18; $i++) {
            $isSingle = in_array($i, $hotel5SingleRoom, true);
            $hotel5Units[] = [
                'name' => (string) $i,
                'rooms_count' => $isSingle ? 1 : 2,
                'price_rule' => $isSingle
                    ? PriceRuleSeeder::RULE_HOTEL_5_1_BEDROOM
                    : PriceRuleSeeder::RULE_HOTEL_5_2_BEDROOMS,
            ];
        }

        // 9. مميز (16 units: 1001 to 1016, 2 rooms each)
        $specialUnits = [];
        for ($i = 1001; $i <= 1016; $i++) {
            $specialUnits[] = [
                'name' => (string) $i,
                'rooms_count' => 2,
                'price_rule' => PriceRuleSeeder::RULE_CHALET_2_BEDROOMS,
            ];
        }

        // 10. دورين (50 units: 1 to 50, 3 rooms each)
        $duplexUnits = [];
        for ($i = 1; $i <= 50; $i++) {
            $duplexUnits[] = [
                'name' => (string) $i,
                'rooms_count' => 3,
                'price_rule' => PriceRuleSeeder::RULE_CHALET_3_BEDROOMS,
            ];
        }

        // 11. فندق 6 (37 units: 101-109, 201-214, 301-314, 1 room each)
        $hotel6Numbers = array_merge(
            range(101, 109),
            range(201, 214),
            range(301, 314)
        );
        $hotel6Units = [];
        foreach ($hotel6Numbers as $num) {
            $hotel6Units[] = [
                'name' => (string) $num,
                'rooms_count' => 1,
                'price_rule' => PriceRuleSeeder::RULE_HOTEL_6_MEALS,
            ];
        }

        return [
            ['name' => 'لوسيال', 'units' => $lucielUnits],
            ['name' => 'فيلا قديم', 'units' => $oldVillaUnits],
            ['name' => 'فيلا جديد', 'units' => $newVillaUnits],
            ['name' => 'فندق 1', 'units' => $hotel1Units],
            ['name' => 'فندق 2', 'units' => $hotel2Units],
            ['name' => 'فندق 3', 'units' => $hotel3Units],
            ['name' => 'فندق 4', 'units' => $hotel4Units],
            ['name' => 'فندق 5', 'units' => $hotel5Units],
            ['name' => 'مميز', 'units' => $specialUnits],
            ['name' => 'دورين', 'units' => $duplexUnits],
            ['name' => 'فندق 6', 'units' => $hotel6Units],
        ];
    }
}
