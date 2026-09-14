<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('reservations:notify-due-checkouts')
    ->dailyAt('11:55')->timezone('Africa/Cairo')
    ->description('Notify admins and sector users of reservations due for checkout today');

/**
 * crontab -e
 * then * * * * * cd /path-to-your-project && php artisan schedule:run >> /dev/null 2>&1
 */
