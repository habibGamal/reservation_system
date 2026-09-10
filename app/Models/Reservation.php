<?php

namespace App\Models;

use App\Enums\MembershipType;
use App\Enums\ReservationStatus;
use App\Enums\ReservationType;
use App\Services\AttachmentCompressionService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * @property int $id
 * @property int $guest_id
 * @property int $unit_id
 * @property \Illuminate\Support\Carbon $check_in
 * @property \Illuminate\Support\Carbon $check_out
 * @property ReservationStatus $status
 * @property ReservationType $type
 * @property MembershipType|null $membership
 * @property bool $enter_from_gates
 * @property bool $has_meals
 * @property \Illuminate\Support\Carbon|null $meals_start_date
 * @property \Illuminate\Support\Carbon|null $meals_end_date
 * @property float $meals_rate_per_night
 * @property float $meals_total_price
 * @property float $total_price
 * @property string|null $notes
 * @property array|null $attachments
 * @property-read float $paid_amount
 * @property-read float $balance
 * @property-read int $nights_count
 * @property-read int $meals_nights_count
 * @property-read float $extra_fees_total
 * @property-read string $payment_status
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read Collection<int, ReservationExtraFee> $extraFees
 */
class Reservation extends Model
{
    use HasFactory, LogsActivity;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'guest_id',
        'unit_id',
        'check_in',
        'check_out',
        'status',
        'type',
        'membership',
        'enter_from_gates',
        'has_meals',
        'meals_persons_count',
        'meals_start_date',
        'meals_end_date',
        'meals_rate_per_night',
        'meals_total_price',
        'total_price',
        'notes',
        'attachments',
    ];

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'enter_from_gates' => false,
        'has_meals' => false,
        'meals_persons_count' => 4,
        'meals_rate_per_night' => 0.00,
        'meals_total_price' => 0.00,
    ];

    /**
     * @var list<string>
     */
    protected $appends = [
        'paid_amount',
        'balance',
        'nights_count',
        'meals_nights_count',
        'todays_meals_count',
        'extra_fees_total',
        'payment_status',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'check_in' => 'date:Y-m-d',
            'check_out' => 'date:Y-m-d',
            'status' => ReservationStatus::class,
            'type' => ReservationType::class,
            'membership' => MembershipType::class,
            'enter_from_gates' => 'boolean',
            'has_meals' => 'boolean',
            'meals_persons_count' => 'integer',
            'meals_start_date' => 'date:Y-m-d',
            'meals_end_date' => 'date:Y-m-d',
            'meals_rate_per_night' => 'float',
            'meals_total_price' => 'float',
            'total_price' => 'float',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->logOnlyDirty()
            ->dontLogEmptyChanges();
    }

    /**
     * @return BelongsTo<Guest, $this>
     */
    public function guest(): BelongsTo
    {
        return $this->belongsTo(Guest::class);
    }

    /**
     * @return BelongsTo<Unit, $this>
     */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    /**
     * @return HasMany<Payment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * @return HasMany<ReservationExtraFee, $this>
     */
    public function extraFees(): HasMany
    {
        return $this->hasMany(ReservationExtraFee::class);
    }

    /**
     * Get the total extra fees amount.
     */
    protected function extraFeesTotal(): Attribute
    {
        return Attribute::make(
            get: function (): float {
                if (isset($this->attributes['extra_fees_total'])) {
                    return round((float) $this->attributes['extra_fees_total'], 2);
                }

                if (isset($this->attributes['extra_fees_sum_amount'])) {
                    return round((float) $this->attributes['extra_fees_sum_amount'], 2);
                }

                if ($this->relationLoaded('extraFees')) {
                    return round((float) $this->extraFees->sum('amount'), 2);
                }

                return round((float) $this->extraFees()->sum('amount'), 2);
            }
        );
    }

    /**
     * Get total meals nights count.
     */
    protected function mealsNightsCount(): Attribute
    {
        return Attribute::make(
            get: function (): int {
                if (! $this->has_meals || ! $this->meals_start_date || ! $this->meals_end_date) {
                    return 0;
                }

                $in = Carbon::parse($this->meals_start_date);
                $out = Carbon::parse($this->meals_end_date);

                return max(0, $in->diffInDays($out));
            }
        );
    }

    /**
     * Get today's active meals count for this reservation.
     * If today >= meals_start_date && today < meals_end_date, returns meals_persons_count.
     * Otherwise returns 0.
     */
    protected function todaysMealsCount(): Attribute
    {
        return Attribute::make(
            get: function (): int {
                if (! $this->has_meals || ! $this->meals_start_date || ! $this->meals_end_date) {
                    return 0;
                }

                $today = Carbon::today()->format('Y-m-d');
                $start = Carbon::parse($this->meals_start_date)->format('Y-m-d');
                $end = Carbon::parse($this->meals_end_date)->format('Y-m-d');

                if ($today >= $start && $today < $end) {
                    return (int) ($this->meals_persons_count ?: 4);
                }

                return 0;
            }
        );
    }

    /**
     * Get the total paid amount.
     */
    protected function paidAmount(): Attribute
    {
        return Attribute::make(
            get: function (): float {
                if (isset($this->attributes['paid_amount'])) {
                    return round((float) $this->attributes['paid_amount'], 2);
                }

                if (isset($this->attributes['payments_sum_amount'])) {
                    return round((float) $this->attributes['payments_sum_amount'], 2);
                }

                if ($this->relationLoaded('payments')) {
                    return round((float) $this->payments->sum('amount'), 2);
                }

                return round((float) $this->payments()->sum('amount'), 2);
            }
        );
    }

    /**
     * Get remaining balance.
     */
    protected function balance(): Attribute
    {
        return Attribute::make(
            get: fn (): float => max(0.0, round((float) $this->total_price - (float) $this->paid_amount, 2))
        );
    }

    /**
     * Get total nights count.
     */
    protected function nightsCount(): Attribute
    {
        return Attribute::make(
            get: function (): int {
                if (! $this->check_in || ! $this->check_out) {
                    return 0;
                }

                $in = Carbon::parse($this->check_in);
                $out = Carbon::parse($this->check_out);

                return max(0, $in->diffInDays($out));
            }
        );
    }

    /**
     * Get payment status string.
     */
    protected function paymentStatus(): Attribute
    {
        return Attribute::make(
            get: function (): string {
                $paid = (float) $this->paid_amount;
                $total = (float) $this->total_price;

                if ($paid >= $total && $total > 0) {
                    return 'Fully Paid';
                }

                if ($paid > 0) {
                    return 'Partially Paid';
                }

                return 'Unpaid';
            }
        );
    }

    /**
     * Get or set the attachments array attribute with computed metadata (url, human_size, is_image).
     */
    protected function attachments(): Attribute
    {
        return Attribute::make(
            get: function ($value): array {
                if (empty($value)) {
                    return [];
                }

                $raw = is_string($value) ? json_decode($value, true) : $value;
                if (! is_array($raw)) {
                    return [];
                }

                return array_values(array_map(
                    fn (array $item) => AttachmentCompressionService::formatWithMeta($item),
                    $raw
                ));
            },
            set: function ($value): ?string {
                if ($value === null) {
                    return json_encode([]);
                }

                $arr = is_string($value) ? json_decode($value, true) : $value;
                if (! is_array($arr)) {
                    return json_encode([]);
                }

                $clean = array_map(function (array $item) {
                    return [
                        'id' => $item['id'] ?? '',
                        'file_name' => $item['file_name'] ?? '',
                        'file_path' => $item['file_path'] ?? '',
                        'mime_type' => $item['mime_type'] ?? '',
                        'file_size' => (int) ($item['file_size'] ?? 0),
                        'created_at' => $item['created_at'] ?? now()->toDateTimeString(),
                    ];
                }, $arr);

                return json_encode(array_values($clean));
            }
        );
    }

    /**
     * The "booted" method of the model.
     * Cleans up physical attachment files from disk when a reservation is deleted.
     */
    protected static function booted(): void
    {
        static::deleting(function (Reservation $reservation) {
            $attachments = $reservation->attachments;
            if (is_array($attachments)) {
                $compressionService = app(AttachmentCompressionService::class);
                foreach ($attachments as $att) {
                    if (! empty($att['file_path'])) {
                        $compressionService->deleteFile($att['file_path']);
                    }
                }
            }
        });
    }
}
