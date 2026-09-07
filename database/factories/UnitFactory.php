<?php

namespace Database\Factories;

use App\Models\PriceRule;
use App\Models\Sector;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Unit>
 */
class UnitFactory extends Factory
{
    protected $model = Unit::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'sector_id' => Sector::factory(),
            'price_rule_id' => PriceRule::factory(),
            'name' => (string) fake()->numberBetween(100, 999),
            'rooms_count' => fake()->numberBetween(1, 4),
        ];
    }
}
