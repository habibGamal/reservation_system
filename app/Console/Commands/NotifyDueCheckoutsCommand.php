<?php

namespace App\Console\Commands;

use App\Enums\ReservationStatus;
use App\Models\Reservation;
use App\Notifications\ReservationNotification;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class NotifyDueCheckoutsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'reservations:notify-due-checkouts
                            {--date= : Target check-out date (format YYYY-MM-DD, defaults to today)}
                            {--force : Force sending notifications even if already sent today}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Notify Admins and sector-assigned users of reservations due for checkout today that have not yet checked out';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $targetDate = $this->option('date') ?: Carbon::today()->toDateString();
        $isForce = (bool) $this->option('force');

        $this->info("Checking reservations due for checkout on: {$targetDate}");

        $reservations = Reservation::query()
            ->with(['guest', 'unit.sector'])
            ->whereDate('check_out', $targetDate)
            ->where('status', '!=', ReservationStatus::DEPARTED->value)
            ->get();

        if ($reservations->isEmpty()) {
            $this->info("No reservations found due for checkout on {$targetDate}.");

            return Command::SUCCESS;
        }

        $alreadyNotifiedIds = [];
        if (! $isForce) {
            $alreadyNotifiedIds = DB::table('notifications')
                ->where('type', ReservationNotification::class)
                ->whereDate('created_at', Carbon::today()->toDateString())
                ->where('data', 'like', '%"action":"checkout_due"%')
                ->get(['data'])
                ->map(function ($row) {
                    $decoded = json_decode($row->data, true);

                    return $decoded['reservation_id'] ?? null;
                })
                ->filter()
                ->unique()
                ->all();
        }

        $sentCount = 0;
        $skippedCount = 0;

        foreach ($reservations as $reservation) {
            if (in_array($reservation->id, $alreadyNotifiedIds, true)) {
                $skippedCount++;

                continue;
            }

            $notification = ReservationNotification::checkoutDue($reservation);
            ReservationNotification::notifySuperAdmins($notification);
            $sentCount++;
        }

        $this->info("Found {$reservations->count()} reservation(s): {$sentCount} notified, {$skippedCount} skipped (already notified today).");

        return Command::SUCCESS;
    }
}
