<?php

namespace App\Models;

use App\Enums\ReservationStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * @property int $id
 * @property int $sector_id
 * @property int|null $price_rule_id
 * @property string $name
 * @property int $rooms_count
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Unit extends Model
{
    use HasFactory, LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->logOnlyDirty()
            ->dontLogEmptyChanges();
    }

    /**
     * @var list<string>
     */
    protected $fillable = [
        'sector_id',
        'price_rule_id',
        'name',
        'rooms_count',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'rooms_count' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Sector, $this>
     */
    public function sector(): BelongsTo
    {
        return $this->belongsTo(Sector::class);
    }

    /**
     * @return BelongsTo<PriceRule, $this>
     */
    public function priceRule(): BelongsTo
    {
        return $this->belongsTo(PriceRule::class);
    }

    /**
     * @return HasMany<Reservation, $this>
     */
    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    /**
     * @return HasOne<Reservation, $this>
     */
    public function currentReservation(): HasOne
    {
        return $this->hasOne(Reservation::class)
            ->where('status', '!=', ReservationStatus::DEPARTED->value)
            ->where(function ($query) {
                $today = now()->toDateString();
                $query->where('status', ReservationStatus::CHECKED_IN->value)
                    ->orWhere(function ($q) use ($today) {
                        $q->where('check_in', '<=', $today)
                            ->where('check_out', '>=', $today);
                    });
            })
            ->latestOfMany();
    }
}
