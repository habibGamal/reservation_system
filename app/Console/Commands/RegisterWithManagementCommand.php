<?php

namespace App\Console\Commands;

use Exception;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RegisterWithManagementCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:register-with-management';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Register this application instance with the management operations system';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('🔗 Registering with management operations system...');

        try {
            $managementUrl = config('app.manage_operations_url');
            if (! $managementUrl) {
                $this->error('❌ MANAGE_OPERATIONS_URL is not configured');

                return Command::FAILURE;
            }

            // Ask for user input
            $appId = $this->ask('Enter App ID', config('app.id'));
            $externalUrl = $this->ask('Enter External URL', config('app.external_url'));

            // Generate management secret key
            $managementSecretKey = base64_encode(random_bytes(32));

            // Update .env file
            $this->updateEnvFile($appId, $externalUrl, $managementSecretKey);

            // Clear config cache to reload updated values
            $this->call('config:clear');

            $this->info('✅ Updated .env file with new configuration');

            $registrationData = [
                'app_id' => $appId,
                'app_name' => config('app.name'),
                'external_url' => $externalUrl,
                'management_secret_key' => $managementSecretKey,
                'server_info' => [
                    'php_version' => PHP_VERSION,
                    'laravel_version' => app()->version(),
                    'environment' => config('app.env'),
                    'timezone' => config('app.timezone'),
                    'registered_at' => now()->toISOString(),
                ],
            ];

            $response = Http::timeout(30)
                ->post(rtrim($managementUrl, '/').'/api/app-instances/register', $registrationData);

            if ($response->successful()) {
                $this->info('✅ Successfully registered with management operations system');
                $this->line('Instance ID: '.config('app.id'));
                $this->line('Management URL: '.$managementUrl);
                Log::info('Successfully registered with management operations system', [
                    'app_id' => config('app.id'),
                    'management_url' => $managementUrl,
                ]);

                return Command::SUCCESS;
            } else {
                $this->error('❌ Failed to register with management operations system');
                $this->line('Response: '.$response->body());
                Log::error('Failed to register with management operations system', [
                    'status' => $response->status(),
                    'response' => $response->body(),
                ]);

                return Command::FAILURE;
            }

        } catch (Exception $e) {
            $this->error('❌ Registration failed: '.$e->getMessage());
            Log::error('Registration with management operations failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return Command::FAILURE;
        }
    }

    /**
     * Update the .env file with new configuration values
     */
    private function updateEnvFile(string $appId, string $externalUrl, string $managementSecretKey): void
    {
        $envPath = base_path('.env');

        if (! file_exists($envPath)) {
            throw new Exception('.env file not found');
        }

        $envContent = file_get_contents($envPath);

        // Update APP_ID
        if (preg_match('/^APP_ID=.*/m', $envContent)) {
            $envContent = preg_replace('/^APP_ID=.*/m', "APP_ID={$appId}", $envContent);
        } else {
            $envContent .= "\nAPP_ID={$appId}";
        }

        // Update APP_EXTERNAL_URL
        if (preg_match('/^APP_EXTERNAL_URL=.*/m', $envContent)) {
            $envContent = preg_replace('/^APP_EXTERNAL_URL=.*/m', "APP_EXTERNAL_URL={$externalUrl}", $envContent);
        } else {
            $envContent .= "\nAPP_EXTERNAL_URL={$externalUrl}";
        }

        // Update MANAGEMENT_SECRET_KEY
        if (preg_match('/^MANAGEMENT_SECRET_KEY=.*/m', $envContent)) {
            $envContent = preg_replace('/^MANAGEMENT_SECRET_KEY=.*/m', "MANAGEMENT_SECRET_KEY={$managementSecretKey}", $envContent);
        } else {
            $envContent .= "\nMANAGEMENT_SECRET_KEY={$managementSecretKey}";
        }

        file_put_contents($envPath, $envContent);
    }
}
