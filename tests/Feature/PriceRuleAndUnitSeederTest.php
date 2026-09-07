<?php

namespace Tests\Feature;

use App\Models\PriceRule;
use App\Models\Sector;
use App\Models\Unit;
use Database\Seeders\PriceRuleSeeder;
use Database\Seeders\SectorAndUnitSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PriceRuleAndUnitSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_price_rules_seeder_creates_all_ten_rules_with_exact_prices(): void
    {
        $this->seed(PriceRuleSeeder::class);

        $expectedRules = [
            PriceRuleSeeder::RULE_VILLAS => [
                'عضو' => 1200,
                'غير عضو' => 2400,
                'مرافق' => 3600,
                'مدني' => 5900,
            ],
            PriceRuleSeeder::RULE_LUSIAL_VILLAS => [
                'عضو' => 1300,
                'غير عضو' => 2600,
                'مرافق' => 3900,
                'مدني' => 6400,
            ],
            PriceRuleSeeder::RULE_CHALET_3_BEDROOMS => [
                'عضو' => 800,
                'غير عضو' => 1500,
                'مرافق' => 1900,
                'مدني' => 2400,
            ],
            PriceRuleSeeder::RULE_CHALET_2_BEDROOMS => [
                'عضو' => 650,
                'غير عضو' => 1300,
                'مرافق' => 1500,
                'مدني' => 1900,
            ],
            PriceRuleSeeder::RULE_HOTEL_5_2_BEDROOMS => [
                'عضو' => 550,
                'غير عضو' => 1100,
                'مرافق' => 1300,
                'مدني' => 1600,
            ],
            PriceRuleSeeder::RULE_HOTEL_5_1_BEDROOM => [
                'عضو' => 365,
                'غير عضو' => 550,
                'مرافق' => 650,
                'مدني' => 800,
            ],
            PriceRuleSeeder::RULE_HOTEL_4_2_BEDROOMS => [
                'عضو' => 400,
                'غير عضو' => 850,
                'مرافق' => 1000,
                'مدني' => 1200,
            ],
            PriceRuleSeeder::RULE_HOTEL_1_2_2_BEDROOMS => [
                'عضو' => 450,
                'غير عضو' => 900,
                'مرافق' => 1100,
                'مدني' => 1300,
            ],
            PriceRuleSeeder::RULE_HOTEL_1_2_3_4_1_BEDROOM => [
                'عضو' => 350,
                'غير عضو' => 700,
                'مرافق' => 800,
                'مدني' => 950,
            ],
            PriceRuleSeeder::RULE_HOTEL_6_MEALS => [
                'عضو' => 800,
                'غير عضو' => 1400,
                'مرافق' => 2200,
                'مدني' => 8000,
            ],
        ];

        $this->assertEquals(11, PriceRule::count());
        $this->assertEquals(10, PriceRule::where('type', PriceRule::TYPE_UNIT)->count());

        $mealRule = PriceRule::where('type', PriceRule::TYPE_MEAL)->first();
        $this->assertNotNull($mealRule);
        $this->assertEquals(450, $mealRule->rules['price_per_night']);

        foreach ($expectedRules as $ruleName => $rates) {
            $rule = PriceRule::where('name', $ruleName)->first();
            $this->assertNotNull($rule, "Price rule {$ruleName} should exist.");
            $this->assertEquals($rates, $rule->rules, "Rates for {$ruleName} do not match.");
        }
    }

    public function test_sector_and_unit_seeder_assigns_correct_price_rules_to_all_units(): void
    {
        $this->seed([
            PriceRuleSeeder::class,
            SectorAndUnitSeeder::class,
        ]);

        $this->assertEquals(11, Sector::count());
        $this->assertEquals(259, Unit::count());
        $this->assertEquals(0, Unit::whereNull('price_rule_id')->count());

        $hotel1Sector = Sector::where('name', 'فندق 1')->firstOrFail();
        $hotel1Unit1 = Unit::where('sector_id', $hotel1Sector->id)->where('name', '1')->firstOrFail();
        $this->assertEquals(PriceRuleSeeder::RULE_HOTEL_1_2_2_BEDROOMS, $hotel1Unit1->priceRule->name);

        $hotel1Unit3 = Unit::where('sector_id', $hotel1Sector->id)->where('name', '3')->firstOrFail();
        $this->assertEquals(PriceRuleSeeder::RULE_HOTEL_1_2_3_4_1_BEDROOM, $hotel1Unit3->priceRule->name);

        $hotel4Sector = Sector::where('name', 'فندق 4')->firstOrFail();
        $hotel4Unit83 = Unit::where('sector_id', $hotel4Sector->id)->where('name', '83')->firstOrFail();
        $this->assertEquals(PriceRuleSeeder::RULE_HOTEL_1_2_3_4_1_BEDROOM, $hotel4Unit83->priceRule->name);

        $hotel4Unit79 = Unit::where('sector_id', $hotel4Sector->id)->where('name', '79')->firstOrFail();
        $this->assertEquals(PriceRuleSeeder::RULE_HOTEL_4_2_BEDROOMS, $hotel4Unit79->priceRule->name);

        $hotel5Sector = Sector::where('name', 'فندق 5')->firstOrFail();
        $hotel5Unit2 = Unit::where('sector_id', $hotel5Sector->id)->where('name', '2')->firstOrFail();
        $this->assertEquals(PriceRuleSeeder::RULE_HOTEL_5_1_BEDROOM, $hotel5Unit2->priceRule->name);

        $hotel5Unit1 = Unit::where('sector_id', $hotel5Sector->id)->where('name', '1')->firstOrFail();
        $this->assertEquals(PriceRuleSeeder::RULE_HOTEL_5_2_BEDROOMS, $hotel5Unit1->priceRule->name);

        $hotel6Sector = Sector::where('name', 'فندق 6')->firstOrFail();
        $this->assertTrue($hotel6Sector->has_meals);
        $hotel6Unit101 = Unit::where('sector_id', $hotel6Sector->id)->where('name', '101')->firstOrFail();
        $this->assertEquals(PriceRuleSeeder::RULE_HOTEL_6_MEALS, $hotel6Unit101->priceRule->name);

        $duplexSector = Sector::where('name', 'دورين')->firstOrFail();
        $duplexUnit1 = Unit::where('sector_id', $duplexSector->id)->where('name', '1')->firstOrFail();
        $this->assertEquals(PriceRuleSeeder::RULE_CHALET_3_BEDROOMS, $duplexUnit1->priceRule->name);

        $momayazSector = Sector::where('name', 'مميز')->firstOrFail();
        $momayazUnit1001 = Unit::where('sector_id', $momayazSector->id)->where('name', '1001')->firstOrFail();
        $this->assertEquals(PriceRuleSeeder::RULE_CHALET_2_BEDROOMS, $momayazUnit1001->priceRule->name);

        $lucielSector = Sector::where('name', 'لوسيال')->firstOrFail();
        $lucielUnit1 = Unit::where('sector_id', $lucielSector->id)->where('name', '1')->firstOrFail();
        $this->assertEquals(PriceRuleSeeder::RULE_LUSIAL_VILLAS, $lucielUnit1->priceRule->name);

        $oldVillaSector = Sector::where('name', 'فيلا قديم')->firstOrFail();
        $oldVillaUnit1 = Unit::where('sector_id', $oldVillaSector->id)->where('name', '1')->firstOrFail();
        $this->assertEquals(PriceRuleSeeder::RULE_VILLAS, $oldVillaUnit1->priceRule->name);
    }
}
