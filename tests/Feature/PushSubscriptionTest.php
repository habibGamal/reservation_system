<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\TestPushNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PushSubscriptionTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_cannot_access_push_subscription_routes(): void
    {
        $this->post(route('push-subscriptions.store'))->assertRedirect(route('login'));
        $this->delete(route('push-subscriptions.destroy'))->assertRedirect(route('login'));
        $this->post(route('push-subscriptions.test'))->assertRedirect(route('login'));
    }

    public function test_authenticated_user_can_store_push_subscription(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->postJson(route('push-subscriptions.store'), [
            'endpoint' => 'https://fcm.googleapis.com/fcm/send/test-endpoint-123',
            'keys' => [
                'auth' => 'test-auth-key',
                'p256dh' => 'test-p256dh-key',
            ],
            'content_encoding' => 'aesgcm',
        ]);

        $response->assertOk()
            ->assertJson(['message' => 'Push subscription saved.']);

        $this->assertDatabaseHas('push_subscriptions', [
            'subscribable_id' => $user->id,
            'subscribable_type' => User::class,
            'endpoint' => 'https://fcm.googleapis.com/fcm/send/test-endpoint-123',
        ]);
    }

    public function test_store_push_subscription_validates_required_fields(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->postJson(route('push-subscriptions.store'), []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['endpoint', 'keys.auth', 'keys.p256dh']);
    }

    public function test_authenticated_user_can_delete_push_subscription(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $endpoint = 'https://fcm.googleapis.com/fcm/send/test-endpoint-456';

        // First store a subscription
        $user->updatePushSubscription($endpoint, 'p256dh-key', 'auth-key', 'aesgcm');

        $this->assertDatabaseHas('push_subscriptions', [
            'subscribable_id' => $user->id,
            'endpoint' => $endpoint,
        ]);

        // Now delete it
        $response = $this->deleteJson(route('push-subscriptions.destroy'), [
            'endpoint' => $endpoint,
        ]);

        $response->assertOk()
            ->assertJson(['message' => 'Push subscription removed.']);

        $this->assertDatabaseMissing('push_subscriptions', [
            'subscribable_id' => $user->id,
            'endpoint' => $endpoint,
        ]);
    }

    public function test_authenticated_user_can_get_vapid_key(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->getJson(route('push-subscriptions.vapid-key'));

        $response->assertOk()
            ->assertJson(['publicKey' => config('webpush.vapid.public_key')]);
    }

    public function test_authenticated_user_can_send_test_notification(): void
    {
        Notification::fake();

        $user = User::factory()->create();
        $user->updatePushSubscription('https://fcm.googleapis.com/fcm/send/test-endpoint', 'p256dh', 'auth');
        $this->actingAs($user);

        $response = $this->postJson(route('push-subscriptions.test'));

        $response->assertOk()
            ->assertJson(['message' => 'تم إرسال الإشعار التجريبي بنجاح!']);

        Notification::assertSentTo($user, TestPushNotification::class);
    }

    public function test_send_test_notification_returns_error_when_no_subscriptions(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->postJson(route('push-subscriptions.test'));

        $response->assertOk()
            ->assertJson(['success' => false, 'needs_resubscribe' => true]);
    }

    public function test_notifications_settings_page_is_accessible(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('notifications.edit'));

        $response->assertOk();
    }
}
