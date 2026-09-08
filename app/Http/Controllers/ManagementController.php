<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;

class ManagementController extends Controller
{
    /**
     * Validate management key before processing request
     */
    private function validateManagementKey(Request $request): ?JsonResponse
    {
        $secretKey = $request->query('key') ?? $request->header('X-Management-Key');

        if ($secretKey !== config('app.management_secret_key')) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access',
            ], 401);
        }

        return null;
    }

    /**
     * Deploy the application
     */
    public function deploy(Request $request): JsonResponse
    {
        if ($error = $this->validateManagementKey($request)) {
            return $error;
        }

        try {
            Log::info('Deployment started via management API');

            // Execute the deploy command
            Artisan::call('app:deploy');
            $output = Artisan::output();

            Log::info('Deployment completed successfully', ['output' => $output]);

            return response()->json([
                'success' => true,
                'message' => 'Deployment completed successfully',
                'output' => $output,
            ]);
        } catch (Exception $e) {
            Log::error('Deployment failed', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Deployment failed: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Stop the application (enable maintenance mode)
     */
    public function stop(Request $request): JsonResponse
    {
        if ($error = $this->validateManagementKey($request)) {
            return $error;
        }

        try {
            Log::info('Stopping application via management API');

            // Enable maintenance mode
            Artisan::call('down');
            $output = Artisan::output();

            Log::info('Application stopped successfully', ['output' => $output]);

            return response()->json([
                'success' => true,
                'message' => 'Application stopped successfully',
                'output' => $output,
            ]);
        } catch (Exception $e) {
            Log::error('Failed to stop application', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to stop application: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Start the application (disable maintenance mode)
     */
    public function start(Request $request): JsonResponse
    {
        if ($error = $this->validateManagementKey($request)) {
            return $error;
        }

        try {
            Log::info('Starting application via management API');

            // Disable maintenance mode
            Artisan::call('up');
            $output = Artisan::output();

            Log::info('Application started successfully', ['output' => $output]);

            return response()->json([
                'success' => true,
                'message' => 'Application started successfully',
                'output' => $output,
            ]);
        } catch (Exception $e) {
            Log::error('Failed to start application', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to start application: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Execute custom script
     */
    public function customScript(Request $request): JsonResponse
    {
        if ($error = $this->validateManagementKey($request)) {
            return $error;
        }

        $request->validate([
            'command' => 'required|string',
            'description' => 'nullable|string',
        ]);

        try {
            $command = $request->input('command');
            $description = $request->input('description', 'Custom script execution');

            Log::info('Executing custom script via management API', [
                'command' => $command,
                'description' => $description,
            ]);

            // Security check - only allow specific artisan commands
            if (! str_starts_with($command, 'php artisan ')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only artisan commands are allowed',
                ], 400);
            }

            // Extract artisan command
            $artisanCommand = str_replace('php artisan ', '', $command);

            // Execute the artisan command
            Artisan::call($artisanCommand);
            $output = Artisan::output();

            Log::info('Custom script executed successfully', [
                'command' => $command,
                'output' => $output,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Custom script executed successfully',
                'command' => $command,
                'output' => $output,
            ]);
        } catch (Exception $e) {
            Log::error('Custom script execution failed', [
                'command' => $request->input('command'),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Custom script execution failed: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get application status
     */
    public function status(Request $request): JsonResponse
    {
        if ($error = $this->validateManagementKey($request)) {
            return $error;
        }

        try {
            $isDown = app()->isDownForMaintenance();

            return response()->json([
                'success' => true,
                'app_id' => config('app.id'),
                'app_name' => config('app.name'),
                'app_url' => config('app.url'),
                'external_url' => config('app.external_url'),
                'is_maintenance' => $isDown,
                'status' => $isDown ? 'maintenance' : 'running',
                'timestamp' => now()->toISOString(),
            ]);
        } catch (Exception $e) {
            Log::error('Failed to get application status', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get application status: '.$e->getMessage(),
            ], 500);
        }
    }
}
