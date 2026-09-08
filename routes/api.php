<?php

use App\Http\Controllers\Api\ManagementController;
use App\Http\Controllers\ApiController;
use Illuminate\Support\Facades\Route;

// Health check endpoints
Route::match(['get', 'post'], '/check', [ApiController::class, 'check'])->name('api.check');

// Management endpoints
Route::prefix('management')->name('management.')->group(function () {
    Route::post('/deploy', [ManagementController::class, 'deploy'])->name('deploy');
    Route::post('/stop', [ManagementController::class, 'stop'])->name('stop');
    Route::post('/start', [ManagementController::class, 'start'])->name('start');
    Route::post('/custom-script', [ManagementController::class, 'customScript'])->name('custom-script');
    Route::get('/status', [ManagementController::class, 'status'])->name('status');
});
