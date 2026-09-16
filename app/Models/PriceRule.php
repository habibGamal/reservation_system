<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $type
 * @property array<string, float|int> $rules
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class PriceRule extends Model
{
    use HasFactory;

    public const TYPE_UNIT = 'unit';

    public const TYPE_MEAL = 'meal';

    public const STANDARD_CATEGORIES = [
        'عضو',
        'غير عضو',
        'مرافق',
        'مدني',
    ];

    /**
     * Get all known pricing categories across standard membership types and existing unit rules.
     *
     * @return array<string>
     */
    public static function getAllCategories(): array
    {
        $categories = self::STANDARD_CATEGORIES;

        try {
            $rules = self::where('type', self::TYPE_UNIT)->pluck('rules');
            foreach ($rules as $rule) {
                if (is_array($rule)) {
                    foreach (array_keys($rule) as $key) {
                        if ($key !== 'price_per_night' && $key !== 'rate' && trim((string) $key) !== '') {
                            $categories[] = (string) $key;
                        }
                    }
                }
            }
        } catch (\Throwable) {
            // Fallback if DB table is inaccessible
        }

        return array_values(array_unique($categories));
    }

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'type',
        'rules',
    ];

    /**
     * Get the active meal price rate per night.
     */
    public static function getMealRate(): float
    {
        $mealRule = self::where('type', self::TYPE_MEAL)->first();
        if ($mealRule && is_array($mealRule->rules)) {
            if (isset($mealRule->rules['price_per_night'])) {
                return (float) $mealRule->rules['price_per_night'];
            }
            if (isset($mealRule->rules['rate'])) {
                return (float) $mealRule->rules['rate'];
            }
            if (isset($mealRule->rules['عضو'])) {
                return (float) $mealRule->rules['عضو'];
            }
            $first = reset($mealRule->rules);
            if (is_numeric($first)) {
                return (float) $first;
            }
        }

        return 450.0;
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'rules' => 'array',
        ];
    }

    /**
     * @return HasMany<Unit, $this>
     */
    public function units(): HasMany
    {
        return $this->hasMany(Unit::class);
    }
}
