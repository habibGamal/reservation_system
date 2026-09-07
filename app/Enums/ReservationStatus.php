<?php

namespace App\Enums;

enum ReservationStatus: string
{
    case CHECKED_IN = 'تم التسكين';
    case WAITING = 'انتظار';
    case CONFIRMED = 'ثابت';
    case DEPARTED = 'غادر';

    public function label(): string
    {
        return match ($this) {
            self::CHECKED_IN => 'تم التسكين',
            self::WAITING => 'انتظار',
            self::CONFIRMED => 'ثابت',
            self::DEPARTED => 'غادر',
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
