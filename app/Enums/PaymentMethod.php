<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case CASH = 'Cash';
    case VISA = 'visa';
    case INSTAPAY = 'instapay';

    public function label(): string
    {
        return match ($this) {
            self::CASH => 'كاش',
            self::VISA => 'فيزا',
            self::INSTAPAY => 'انستاباي',
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
