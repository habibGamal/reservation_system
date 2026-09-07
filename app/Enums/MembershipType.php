<?php

namespace App\Enums;

enum MembershipType: string
{
    case MEMBER = 'عضو';
    case NON_MEMBER = 'غير عضو';
    case COMPANION = 'مرافق';
    case CIVILIAN = 'مدني';

    public function label(): string
    {
        return match ($this) {
            self::MEMBER => 'عضو',
            self::NON_MEMBER => 'غير عضو',
            self::COMPANION => 'مرافق',
            self::CIVILIAN => 'مدني',
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
