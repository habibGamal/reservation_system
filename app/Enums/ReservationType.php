<?php

namespace App\Enums;

enum ReservationType: string
{
    case BRANCH = 'فرع';
    case MANAGEMENT = 'ادارة';
    case RESORT = 'منتجع';

    public function label(): string
    {
        return match ($this) {
            self::BRANCH => 'فرع',
            self::MANAGEMENT => 'ادارة',
            self::RESORT => 'منتجع',
        };
    }

    /**
     * @return array<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
