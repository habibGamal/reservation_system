<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use NotificationChannels\WebPush\HasPushSubscriptions;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'email', 'password', 'has_sector_restrictions'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasPushSubscriptions, HasRoles, LogsActivity, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'has_sector_restrictions' => 'boolean',
        ];
    }

    /**
     * Options for activity logging.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'email'])
            ->logOnlyDirty()
            ->dontLogEmptyChanges();
    }

    /**
     * @return BelongsToMany<Sector, $this>
     */
    public function sectors(): BelongsToMany
    {
        return $this->belongsToMany(Sector::class, 'sector_user')
            ->withPivot('permission')
            ->withTimestamps();
    }

    /**
     * Check if the user has full unrestricted access to all sectors.
     * Super Admin, Admin, or users without sector restrictions have full access.
     */
    public function hasFullSectorAccess(): bool
    {
        if ($this->has_sector_restrictions) {
            return false;
        }

        if ($this->relationLoaded('sectors') ? $this->sectors->isNotEmpty() : $this->sectors()->exists()) {
            return false;
        }

        if ($this->hasRole(['Super Admin', 'Admin'])) {
            return true;
        }

        return true;
    }

    /**
     * Get the list of sector IDs the user is allowed to access (view or edit).
     * Returns null if the user has unrestricted access (all sectors).
     *
     * @return list<int>|null
     */
    public function getAllowedSectorIds(): ?array
    {
        if ($this->hasFullSectorAccess()) {
            return null;
        }

        if ($this->relationLoaded('sectors')) {
            return $this->sectors->pluck('id')->map(fn ($id) => (int) $id)->values()->all();
        }

        return $this->sectors()->pluck('sectors.id')->map(fn ($id) => (int) $id)->values()->all();
    }

    /**
     * Get the list of sector IDs the user is allowed to edit/manage.
     * Returns null if the user has unrestricted access (all sectors).
     *
     * @return list<int>|null
     */
    public function getEditableSectorIds(): ?array
    {
        if ($this->hasFullSectorAccess()) {
            return null;
        }

        if ($this->relationLoaded('sectors')) {
            return $this->sectors
                ->filter(fn ($s) => ($s->pivot->permission ?? null) === 'edit')
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->values()
                ->all();
        }

        return $this->sectors()
            ->wherePivot('permission', 'edit')
            ->pluck('sectors.id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    /**
     * Determine if the user can view the given sector.
     */
    public function canViewSector(Sector|int $sector): bool
    {
        if ($this->hasFullSectorAccess()) {
            return true;
        }

        $sectorId = $sector instanceof Sector ? $sector->id : (int) $sector;
        $allowed = $this->getAllowedSectorIds() ?? [];

        return in_array($sectorId, $allowed, true);
    }

    /**
     * Determine if the user can edit/manage the given sector.
     */
    public function canEditSector(Sector|int $sector): bool
    {
        if ($this->hasRole(['Super Admin', 'Admin'])) {
            return true;
        }

        if ($this->hasFullSectorAccess()) {
            return $this->can('reservations.edit');
        }

        $sectorId = $sector instanceof Sector ? $sector->id : (int) $sector;
        $editable = $this->getEditableSectorIds() ?? [];

        return in_array($sectorId, $editable, true);
    }
}
