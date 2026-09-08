<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ManagementController;

// Health check endpoints
Route::get('/check', [ApiController::class, 'check']);
Route::post('/check', [ApiController::class, 'check']);

// Management endpoints
Route::prefix('management')->name('management.')->group(function () {
    Route::post('/deploy', [ManagementController::class, 'deploy'])->name('deploy');
    Route::post('/stop', [ManagementController::class, 'stop'])->name('stop');
    Route::post('/start', [ManagementController::class, 'start'])->name('start');
    Route::post('/custom-script', [ManagementController::class, 'customScript'])->name('custom-script');
    Route::get('/status', [ManagementController::class, 'status'])->name('status');
});