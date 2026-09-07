<?php

namespace Database\Seeders;

use App\Models\PriceRule;
use Illuminate\Database\Seeder;

class PriceRuleSeeder extends Seeder
{
    public const RULE_VILLAS = 'فيلات';

    public const RULE_LUSIAL_VILLAS = 'فيلات لوسيال';

    public const RULE_CHALET_3_BEDROOMS = 'شاليه 3 غرف';

    public const RULE_CHALET_2_BEDROOMS = 'شاليه غرفتين';

    public const RULE_HOTEL_5_2_BEDROOMS = 'فندق 5 - غرفتين';

    public const RULE_HOTEL_5_1_BEDROOM = 'فندق 5 - غرفة';

    public const RULE_HOTEL_4_2_BEDROOMS = 'فندق 4 - غرفتين';

    public const RULE_HOTEL_1_2_2_BEDROOMS = 'فندق 1، 2 - غرفتين';

    public const RULE_HOTEL_1_2_3_4_1_BEDROOM = 'فندق 1، 2، 3 , 4 - غرفة';

    public const RULE_HOTEL_6_MEALS = 'فندق 6 - 4 أفراد';

    public const RULE_MEALS = 'وجبات غذائية';

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        foreach (self::getDefaultRules() as $ruleData) {
            PriceRule::updateOrCreate(
                ['name' => $ruleData['name']],
                [
                    'type' => PriceRule::TYPE_UNIT,
                    'rules' => $ruleData['rules'],
                ]
            );
        }

        PriceRule::updateOrCreate(
            ['name' => self::RULE_MEALS],
            [
                'type' => PriceRule::TYPE_MEAL,
                'rules' => [
                    'price_per_night' => 450,
                ],
            ]
        );
    }

    /**
     * Get the default price rules definition for 2026 season.
     *
     * @return array<int, array{name: string, rules: array<string, int>}>
     */
    public static function getDefaultRules(): array
    {
        return [
            [
                'name' => self::RULE_VILLAS,
                'rules' => [
                    'عضو' => 1200,
                    'غير عضو' => 2400,
                    'مرافق' => 3600,
                    'مدني' => 5900,
                ],
            ],
            [
                'name' => self::RULE_LUSIAL_VILLAS,
                'rules' => [
                    'عضو' => 1300,
                    'غير عضو' => 2600,
                    'مرافق' => 3900,
                    'مدني' => 6400,
                ],
            ],
            [
                'name' => self::RULE_CHALET_3_BEDROOMS,
                'rules' => [
                    'عضو' => 800,
                    'غير عضو' => 1500,
                    'مرافق' => 1900,
                    'مدني' => 2400,
                ],
            ],
            [
                'name' => self::RULE_CHALET_2_BEDROOMS,
                'rules' => [
                    'عضو' => 650,
                    'غير عضو' => 1300,
                    'مرافق' => 1500,
                    'مدني' => 1900,
                ],
            ],
            [
                'name' => self::RULE_HOTEL_5_2_BEDROOMS,
                'rules' => [
                    'عضو' => 550,
                    'غير عضو' => 1100,
                    'مرافق' => 1300,
                    'مدني' => 1600,
                ],
            ],
            [
                'name' => self::RULE_HOTEL_5_1_BEDROOM,
                'rules' => [
                    'عضو' => 365,
                    'غير عضو' => 550,
                    'مرافق' => 650,
                    'مدني' => 800,
                ],
            ],
            [
                'name' => self::RULE_HOTEL_4_2_BEDROOMS,
                'rules' => [
                    'عضو' => 400,
                    'غير عضو' => 850,
                    'مرافق' => 1000,
                    'مدني' => 1200,
                ],
            ],
            [
                'name' => self::RULE_HOTEL_1_2_2_BEDROOMS,
                'rules' => [
                    'عضو' => 450,
                    'غير عضو' => 900,
                    'مرافق' => 1100,
                    'مدني' => 1300,
                ],
            ],
            [
                'name' => self::RULE_HOTEL_1_2_3_4_1_BEDROOM,
                'rules' => [
                    'عضو' => 350,
                    'غير عضو' => 700,
                    'مرافق' => 800,
                    'مدني' => 950,
                ],
            ],
            [
                'name' => self::RULE_HOTEL_6_MEALS,
                'rules' => [
                    'عضو' => 800,
                    'غير عضو' => 1400,
                    'مرافق' => 2200,
                    'مدني' => 8000,
                ],
            ],
        ];
    }
}
