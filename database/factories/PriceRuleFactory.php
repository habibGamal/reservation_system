<?php

namespace Database\Factories;

use App\Models\PriceRule;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PriceRule>
 */
class PriceRuleFactory extends Factory
{
    protected $model = PriceRule::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => 'قاعدة تسعير '.fake()->word(),
            'rules' => [
                'عضو' => 450,
                'غير عضو' => 750,
                'مرافق' => 600,
                'مدني' => 900,
            ],
        ];
    }
}
