<?php

use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\GuestController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\PriceRuleController;
use App\Http\Controllers\PushSubscriptionController;
use App\Http\Controllers\ReservationController;
use App\Http\Controllers\ReservationImportController;
use App\Http\Controllers\ReservationPriceController;
use App\Http\Controllers\ResortManagementController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SectorController;
use App\Http\Controllers\UnitController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Reservations
    Route::get('/reservations', [ReservationController::class, 'index'])->name('reservations.index');
    Route::post('/reservations', [ReservationController::class, 'store'])->name('reservations.store');
    Route::post('/reservations/calculate-price', [ReservationPriceController::class, 'calculate'])->name('reservations.calculate-price');
    Route::post('/reservations/import', [ReservationImportController::class, 'import'])->name('reservations.import');
    Route::post('/reservations/import/preview', [ReservationImportController::class, 'preview'])->name('reservations.import.preview');
    Route::put('/reservations/{reservation}', [ReservationController::class, 'update'])->name('reservations.update');
    Route::patch('/reservations/{reservation}/status', [ReservationController::class, 'updateStatus'])->name('reservations.update-status');
    Route::patch('/reservations/{reservation}/quick-update', [ReservationController::class, 'quickUpdate'])->name('reservations.quick-update');
    Route::delete('/reservations/{reservation}', [ReservationController::class, 'destroy'])->name('reservations.destroy');

    // Guests
    Route::get('/guests', [GuestController::class, 'index'])->name('guests.index');
    Route::post('/guests', [GuestController::class, 'store'])->name('guests.store');
    Route::get('/guests/{guest}', [GuestController::class, 'show'])->name('guests.show');
    Route::patch('/guests/{guest}', [GuestController::class, 'update'])->name('guests.update');

    // Payments
    Route::post('/reservations/{reservation}/payments', [PaymentController::class, 'store'])->name('reservations.payments.store');
    Route::delete('/payments/{payment}', [PaymentController::class, 'destroy'])->name('payments.destroy');

    // Resort Management (Sectors, Units, Price Rules)
    Route::get('/resort-management', [ResortManagementController::class, 'index'])->name('resort-management.index');

    // Sectors
    Route::post('/sectors', [SectorController::class, 'store'])->name('sectors.store');
    Route::put('/sectors/{sector}', [SectorController::class, 'update'])->name('sectors.update');
    Route::delete('/sectors/{sector}', [SectorController::class, 'destroy'])->name('sectors.destroy');

    // Price Rules
    Route::get('/price-rules', [PriceRuleController::class, 'index'])->name('price-rules.index');
    Route::post('/price-rules', [PriceRuleController::class, 'store'])->name('price-rules.store');
    Route::put('/price-rules/{priceRule}', [PriceRuleController::class, 'update'])->name('price-rules.update');
    Route::delete('/price-rules/{priceRule}', [PriceRuleController::class, 'destroy'])->name('price-rules.destroy');

    // Units
    Route::get('/units', [UnitController::class, 'index'])->name('units.index');
    Route::post('/units', [UnitController::class, 'store'])->name('units.store');
    Route::post('/units/bulk-price-rule', [UnitController::class, 'bulkAssignPriceRule'])->name('units.bulk-price-rule');
    Route::put('/units/{unit}', [UnitController::class, 'update'])->name('units.update');
    Route::delete('/units/{unit}', [UnitController::class, 'destroy'])->name('units.destroy');

    // Users, Roles & Permissions Management
    Route::get('/users', [UserController::class, 'index'])->name('users.index');
    Route::post('/users', [UserController::class, 'store'])->name('users.store');
    Route::put('/users/{user}', [UserController::class, 'update'])->name('users.update');
    Route::patch('/users/{user}/password', [UserController::class, 'updatePassword'])->name('users.update-password');
    Route::delete('/users/{user}', [UserController::class, 'destroy'])->name('users.destroy');

    Route::post('/roles', [RoleController::class, 'store'])->name('roles.store');
    Route::put('/roles/{role}', [RoleController::class, 'update'])->name('roles.update');
    Route::delete('/roles/{role}', [RoleController::class, 'destroy'])->name('roles.destroy');

    // Activity Logs & Audit Trail
    Route::get('/activity-logs', [ActivityLogController::class, 'index'])->name('activity-logs.index');

    // Push Notifications
    Route::get('/push-subscriptions/vapid-key', [PushSubscriptionController::class, 'vapidKey'])->name('push-subscriptions.vapid-key');
    Route::post('/push-subscriptions', [PushSubscriptionController::class, 'store'])->name('push-subscriptions.store');
    Route::delete('/push-subscriptions', [PushSubscriptionController::class, 'destroy'])->name('push-subscriptions.destroy');
    Route::post('/push-subscriptions/test', [PushSubscriptionController::class, 'sendTest'])->name('push-subscriptions.test');
});

require __DIR__.'/settings.php';
