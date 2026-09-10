<?php

namespace App\Notifications;

use App\Enums\ReservationStatus;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Notification as NotificationFacade;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class ReservationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public string $unitDisplay;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public string $action,
        public int $reservationId,
        public string $guestName,
        public string $unitName,
        public ?string $sectorName = null,
        public ?string $actorName = null,
        public ?string $status = null,
        public ?string $checkIn = null,
        public ?string $checkOut = null,
        public ?float $totalPrice = null,
        public ?string $summary = null,
        public ?string $changeType = null, // 'status', 'type', 'membership', 'created', 'deleted', 'updated'
        public ?string $fromValue = null,
        public ?string $toValue = null,
        public ?string $tag = null,
        public ?int $sectorId = null,
        public array $changes = [],
        public array $additionalSectorIds = [],
    ) {
        $this->unitDisplay = self::formatUnitDisplay($this->unitName, $this->sectorName);
        $this->tag = $this->tag ?? self::resolveTag($this->action, $this->changeType);
        $this->afterCommit();
    }

    /**
     * Resolve the merge tag for browser notifications.
     */
    public static function resolveTag(string $action, ?string $changeType): string
    {
        return (string) now()->valueOf();
    }

    /**
     * Format unit display with sector prefix (e.g. "فندق 1 - 22" or "دورين - 44").
     */
    public static function formatUnitDisplay(?string $unitName, ?string $sectorName): string
    {
        $unit = trim($unitName ?? '');
        $sector = trim($sectorName ?? '');

        if ($sector !== '' && $unit !== '') {
            if (str_starts_with($unit, $sector)) {
                return $unit;
            }

            return "{$sector} - {$unit}";
        }

        if ($sector !== '') {
            return $sector;
        }

        return $unit !== '' ? $unit : 'وحدة غير محددة';
    }

    /**
     * Create a notification instance for a newly created reservation.
     */
    public static function created(Reservation $reservation, ?User $actor = null): self
    {
        $reservation->loadMissing(['guest', 'unit.sector']);

        return new self(
            action: 'created',
            reservationId: $reservation->id,
            guestName: $reservation->guest?->name ?? 'غير محدد',
            unitName: $reservation->unit?->name ?? 'غير محدد',
            sectorName: $reservation->unit?->sector?->name,
            actorName: $actor?->name ?? auth()->user()?->name,
            status: $reservation->status instanceof ReservationStatus ? $reservation->status->label() : ($reservation->status ?? null),
            checkIn: is_string($reservation->check_in) ? $reservation->check_in : $reservation->check_in?->format('Y-m-d'),
            checkOut: is_string($reservation->check_out) ? $reservation->check_out : $reservation->check_out?->format('Y-m-d'),
            totalPrice: (float) $reservation->total_price,
            changeType: 'created',
            tag: (string) now()->valueOf(),
            sectorId: $reservation->unit?->sector_id ?? $reservation->unit?->sector?->id,
        );
    }

    /**
     * Create a notification instance for status changes (e.g. checked in, departed, confirmed).
     */
    public static function statusUpdated(
        Reservation $reservation,
        ?User $actor = null,
        ?string $fromStatus = null,
        ?string $toStatus = null,
        ?int $sectorId = null,
        array $changes = [],
    ): self {
        $reservation->loadMissing(['guest', 'unit.sector']);

        $toStatusValue = $toStatus ?? ($reservation->status instanceof ReservationStatus ? $reservation->status->label() : ($reservation->status ?? null));

        if (empty($changes) && ($fromStatus !== null || $toStatusValue !== null)) {
            $changes['status'] = [
                'label' => 'الحالة',
                'from' => $fromStatus ?? 'غير محدد',
                'to' => $toStatusValue ?? 'غير محدد',
            ];
        }

        return new self(
            action: 'updated',
            reservationId: $reservation->id,
            guestName: $reservation->guest?->name ?? 'غير محدد',
            unitName: $reservation->unit?->name ?? 'غير محدد',
            sectorName: $reservation->unit?->sector?->name,
            actorName: $actor?->name ?? auth()->user()?->name,
            status: $toStatusValue,
            checkIn: is_string($reservation->check_in) ? $reservation->check_in : $reservation->check_in?->format('Y-m-d'),
            checkOut: is_string($reservation->check_out) ? $reservation->check_out : $reservation->check_out?->format('Y-m-d'),
            totalPrice: (float) $reservation->total_price,
            changeType: 'status',
            fromValue: $fromStatus,
            toValue: $toStatusValue,
            tag: (string) now()->valueOf(),
            sectorId: $sectorId ?? $reservation->unit?->sector_id ?? $reservation->unit?->sector?->id,
            changes: $changes,
        );
    }

    /**
     * Create a notification instance for membership changes (e.g. from member to non-member).
     */
    public static function membershipUpdated(
        Reservation $reservation,
        ?User $actor = null,
        ?string $from = null,
        ?string $to = null,
        ?int $sectorId = null,
        array $changes = [],
    ): self {
        $reservation->loadMissing(['guest', 'unit.sector']);

        if (empty($changes) && ($from !== null || $to !== null)) {
            $changes['membership'] = [
                'label' => 'نوع النزيل',
                'from' => $from ?? 'غير محدد',
                'to' => $to ?? 'غير محدد',
            ];
        }

        return new self(
            action: 'updated',
            reservationId: $reservation->id,
            guestName: $reservation->guest?->name ?? 'غير محدد',
            unitName: $reservation->unit?->name ?? 'غير محدد',
            sectorName: $reservation->unit?->sector?->name,
            actorName: $actor?->name ?? auth()->user()?->name,
            status: $reservation->status instanceof ReservationStatus ? $reservation->status->label() : ($reservation->status ?? null),
            checkIn: is_string($reservation->check_in) ? $reservation->check_in : $reservation->check_in?->format('Y-m-d'),
            checkOut: is_string($reservation->check_out) ? $reservation->check_out : $reservation->check_out?->format('Y-m-d'),
            totalPrice: (float) $reservation->total_price,
            changeType: 'membership',
            fromValue: $from,
            toValue: $to,
            tag: (string) now()->valueOf(),
            sectorId: $sectorId ?? $reservation->unit?->sector_id ?? $reservation->unit?->sector?->id,
            changes: $changes,
        );
    }

    /**
     * Create a notification instance for reservation type changes (e.g. from branch to management).
     */
    public static function typeUpdated(
        Reservation $reservation,
        ?User $actor = null,
        ?string $from = null,
        ?string $to = null,
        ?int $sectorId = null,
        array $changes = [],
    ): self {
        $reservation->loadMissing(['guest', 'unit.sector']);

        if (empty($changes) && ($from !== null || $to !== null)) {
            $changes['type'] = [
                'label' => 'نوع الحجز',
                'from' => $from ?? 'غير محدد',
                'to' => $to ?? 'غير محدد',
            ];
        }

        return new self(
            action: 'updated',
            reservationId: $reservation->id,
            guestName: $reservation->guest?->name ?? 'غير محدد',
            unitName: $reservation->unit?->name ?? 'غير محدد',
            sectorName: $reservation->unit?->sector?->name,
            actorName: $actor?->name ?? auth()->user()?->name,
            status: $reservation->status instanceof ReservationStatus ? $reservation->status->label() : ($reservation->status ?? null),
            checkIn: is_string($reservation->check_in) ? $reservation->check_in : $reservation->check_in?->format('Y-m-d'),
            checkOut: is_string($reservation->check_out) ? $reservation->check_out : $reservation->check_out?->format('Y-m-d'),
            totalPrice: (float) $reservation->total_price,
            changeType: 'type',
            fromValue: $from,
            toValue: $to,
            tag: (string) now()->valueOf(),
            sectorId: $sectorId ?? $reservation->unit?->sector_id ?? $reservation->unit?->sector?->id,
            changes: $changes,
        );
    }

    /**
     * Create a notification instance for an updated reservation.
     */
    public static function updated(
        Reservation $reservation,
        ?User $actor = null,
        ?string $summary = null,
        ?string $changeType = null,
        ?string $fromValue = null,
        ?string $toValue = null,
        ?int $sectorId = null,
        array $changes = [],
        array $additionalSectorIds = [],
    ): self {
        $reservation->loadMissing(['guest', 'unit.sector']);

        return new self(
            action: 'updated',
            reservationId: $reservation->id,
            guestName: $reservation->guest?->name ?? 'غير محدد',
            unitName: $reservation->unit?->name ?? 'غير محدد',
            sectorName: $reservation->unit?->sector?->name,
            actorName: $actor?->name ?? auth()->user()?->name,
            status: $reservation->status instanceof ReservationStatus ? $reservation->status->label() : ($reservation->status ?? null),
            checkIn: is_string($reservation->check_in) ? $reservation->check_in : $reservation->check_in?->format('Y-m-d'),
            checkOut: is_string($reservation->check_out) ? $reservation->check_out : $reservation->check_out?->format('Y-m-d'),
            totalPrice: (float) $reservation->total_price,
            summary: $summary,
            changeType: $changeType,
            fromValue: $fromValue,
            toValue: $toValue,
            tag: (string) now()->valueOf(),
            sectorId: $sectorId ?? $reservation->unit?->sector_id ?? $reservation->unit?->sector?->id,
            changes: $changes,
            additionalSectorIds: $additionalSectorIds,
        );
    }

    /**
     * Create a notification instance for a deleted reservation.
     */
    public static function deleted(Reservation $reservation, ?User $actor = null): self
    {
        $reservation->loadMissing(['guest', 'unit.sector']);

        return new self(
            action: 'deleted',
            reservationId: $reservation->id,
            guestName: $reservation->guest?->name ?? 'غير محدد',
            unitName: $reservation->unit?->name ?? 'غير محدد',
            sectorName: $reservation->unit?->sector?->name,
            actorName: $actor?->name ?? auth()->user()?->name,
            status: $reservation->status instanceof ReservationStatus ? $reservation->status->label() : ($reservation->status ?? null),
            checkIn: is_string($reservation->check_in) ? $reservation->check_in : $reservation->check_in?->format('Y-m-d'),
            checkOut: is_string($reservation->check_out) ? $reservation->check_out : $reservation->check_out?->format('Y-m-d'),
            totalPrice: (float) $reservation->total_price,
            changeType: 'deleted',
            tag: (string) now()->valueOf(),
            sectorId: $reservation->unit?->sector_id ?? $reservation->unit?->sector?->id,
        );
    }

    /**
     * Get all relevant sector IDs for this notification.
     *
     * @return list<int>
     */
    public function getRelevantSectorIds(): array
    {
        $ids = [];
        if ($this->sectorId !== null) {
            $ids[] = (int) $this->sectorId;
        }

        foreach ($this->additionalSectorIds as $id) {
            if ($id !== null) {
                $ids[] = (int) $id;
            }
        }

        return array_values(array_unique($ids));
    }

    /**
     * Get all recipients for the notification:
     * - All Super Admins & Admins
     * - Any users assigned to the sector(s) of the reservation
     *
     * @return Collection<int, User>
     */
    public static function getRecipients(?self $notification = null, ?int $sectorId = null): Collection
    {
        $recipients = User::role(['Super Admin', 'Admin'])->get();

        $sectorIds = [];
        if ($notification !== null) {
            $sectorIds = $notification->getRelevantSectorIds();
        }
        if ($sectorId !== null && ! in_array((int) $sectorId, $sectorIds, true)) {
            $sectorIds[] = (int) $sectorId;
        }

        if (! empty($sectorIds)) {
            $sectorUsers = User::whereHas('sectors', function ($q) use ($sectorIds) {
                $q->whereIn('sectors.id', $sectorIds);
            })->get();

            $recipients = $recipients->concat($sectorUsers)->unique('id')->values();
        }

        return $recipients;
    }

    /**
     * Safely notify all Super Admins, Admins, and sector-assigned users.
     */
    public static function notifySuperAdmins(self $notification): void
    {
        try {
            $recipients = self::getRecipients($notification);

            if ($recipients->isNotEmpty()) {
                logger()->info('send notification to recipients', [
                    'count' => $recipients->count(),
                    'users' => $recipients->pluck('name', 'id')->toArray(),
                    'sector_ids' => $notification->getRelevantSectorIds(),
                ]);
                NotificationFacade::sendNow($recipients, $notification);
            }
        } catch (\Throwable $e) {
            logger()->error('ReservationNotification error: '.$e->getMessage());
            report($e);
        }
    }

    /**
     * Alias for notifySuperAdmins to reflect that sector-assigned users are also notified.
     */
    public static function notifyRecipients(self $notification): void
    {
        self::notifySuperAdmins($notification);
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, class-string|string>
     */
    public function via(object $notifiable): array
    {
        return [WebPushChannel::class, 'database'];
    }

    /**
     * Get notification title.
     */
    public function getTitle(): string
    {
        return match ($this->changeType ?? $this->action) {
            'status' => 'تحديث حالة — منتجع النسور',
            'membership' => 'تحديث عضوية — منتجع النسور',
            'type' => 'تحديث نوع الحجز — منتجع النسور',
            'created' => 'حجز جديد — منتجع النسور',
            'deleted' => 'إلغاء حجز — منتجع النسور',
            default => 'تحديث حجز — منتجع النسور',
        };
    }

    /**
     * Get humanized, minimal, and useful notification body text.
     */
    public function getBody(): string
    {
        $byActor = $this->actorName ? " بواسطة {$this->actorName}" : '';
        $unit = $this->unitDisplay;
        $guest = trim($this->guestName);

        // 1. Status changes (Checked-in, departed, confirmed, waiting)
        if ($this->changeType === 'status') {
            $statusValue = $this->toValue ?? $this->status;

            return match ($statusValue) {
                ReservationStatus::CHECKED_IN->value, 'تم التسكين' => "تم تسكين {$unit} {$guest}{$byActor}",
                ReservationStatus::DEPARTED->value, 'غادر', 'مغادرة' => "مغادرة {$unit} {$guest}{$byActor}",
                ReservationStatus::CONFIRMED->value, 'ثابت' => "تأكيد حجز {$unit} {$guest}{$byActor}",
                ReservationStatus::WAITING->value, 'انتظار' => "حجز انتظار {$unit} {$guest}{$byActor}",
                default => "تغيير حالة {$unit} {$guest} إلى {$statusValue}{$byActor}",
            };
        }

        // 2. Membership changes (e.g. from member to non-member)
        if ($this->changeType === 'membership') {
            $from = $this->fromValue ?? 'غير محدد';
            $to = $this->toValue ?? 'غير محدد';

            return "تغيير حجز {$unit} من {$from} الى {$to}{$byActor}";
        }

        // 3. Type changes (e.g. from branch to management)
        if ($this->changeType === 'type') {
            $from = $this->fromValue ?? 'غير محدد';
            $to = $this->toValue ?? 'غير محدد';

            return "تغيير حجز {$unit} من {$from} الى {$to}{$byActor}";
        }

        // 4. Creation
        if ($this->action === 'created') {
            return "حجز جديد {$unit} {$guest}{$byActor}";
        }

        // 5. Deletion
        if ($this->action === 'deleted') {
            return "حذف حجز {$unit} {$guest}{$byActor}";
        }

        // 6. Custom summary
        if ($this->summary) {
            return "{$this->summary}{$byActor}";
        }

        // 7. Auto-formatted summary from changes if available
        if (! empty($this->changes)) {
            $parts = [];
            foreach ($this->changes as $change) {
                if (isset($change['label'])) {
                    if (isset($change['to'])) {
                        $parts[] = "{$change['label']} ({$change['to']})";
                    } else {
                        $parts[] = $change['label'];
                    }
                }
            }
            if (! empty($parts)) {
                $details = implode('، ', $parts);

                return "تعديل حجز {$unit} {$guest}: {$details}{$byActor}";
            }
        }

        return "تعديل حجز {$unit} {$guest}{$byActor}";
    }

    /**
     * Get target URL for notification click.
     */
    public function getUrl(): string
    {
        if ($this->action === 'deleted') {
            return '/reservations';
        }

        return "/reservations/{$this->reservationId}";
    }

    /**
     * Get the web push representation of the notification.
     */
    public function toWebPush(object $notifiable, self $notification): WebPushMessage
    {
        return (new WebPushMessage)
            ->title($this->getTitle())
            ->icon('/192.png')
            ->badge('/favicon.svg')
            ->body($this->getBody())
            ->tag($this->tag ?? (string) now()->valueOf())
            ->renotify()
            ->action('عرض الحجز', 'view_reservation')
            ->options([
                'TTL' => 86400,
                'urgency' => 'high',
            ])
            ->data([
                'url' => $this->getUrl(),
                'notification_id' => $notification->id,
                'reservation_id' => $this->reservationId,
                'sector_id' => $this->sectorId,
                'changes' => $this->changes,
                'action' => $this->action,
                'change_type' => $this->changeType,
                'tag' => $this->tag,
            ]);
    }

    /**
     * Get the array representation of the notification for database storage.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'action' => $this->action,
            'change_type' => $this->changeType,
            'tag' => $this->tag,
            'reservation_id' => $this->reservationId,
            'sector_id' => $this->sectorId,
            'changes' => $this->changes,
            'title' => $this->getTitle(),
            'message' => $this->getBody(),
            'unit_display' => $this->unitDisplay,
            'guest_name' => $this->guestName,
            'unit_name' => $this->unitName,
            'sector_name' => $this->sectorName,
            'actor_name' => $this->actorName,
            'from_value' => $this->fromValue,
            'to_value' => $this->toValue,
            'status' => $this->status,
            'check_in' => $this->checkIn,
            'check_out' => $this->checkOut,
            'total_price' => $this->totalPrice,
            'summary' => $this->summary,
            'url' => $this->getUrl(),
        ];
    }
}
