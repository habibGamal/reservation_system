<?php

namespace App\Http\Controllers;

use App\Notifications\TestPushNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Inertia\Inertia;
use Inertia\Response;
use NotificationChannels\WebPush\Events\NotificationFailed;
use NotificationChannels\WebPush\Events\NotificationSent;

class PushSubscriptionController extends Controller
{
    /**
     * Show the push notification settings page.
     */
    public function edit(): Response
    {
        return Inertia::render('settings/notifications', [
            'vapidPublicKey' => config('webpush.vapid.public_key'),
        ]);
    }

    /**
     * Return the active VAPID public key for client-side subscription.
     */
    public function vapidKey(): JsonResponse
    {
        return response()->json([
            'publicKey' => config('webpush.vapid.public_key'),
        ]);
    }

    /**
     * Store a push subscription for the authenticated user.
     */
    public function store(Request $request): JsonResponse
    {

        $validated = $request->validate([
            'endpoint' => ['required', 'url', 'max:1024'],
            'keys.auth' => ['required', 'string'],
            'keys.p256dh' => ['required', 'string'],
            'content_encoding' => ['nullable', 'string'],
        ]);
        $request->user()->updatePushSubscription(
            $validated['endpoint'],
            $validated['keys']['p256dh'],
            $validated['keys']['auth'],
            $validated['content_encoding'] ?? 'aes128gcm',
        );

        return response()->json(['message' => 'Push subscription saved.']);
    }

    /**
     * Remove a push subscription for the authenticated user.
     */
    public function destroy(Request $request): JsonResponse
    {
        $request->validate([
            'endpoint' => ['required', 'url', 'max:1024'],
        ]);

        $request->user()->deletePushSubscription($request->input('endpoint'));

        return response()->json(['message' => 'Push subscription removed.']);
    }

    /**
     * Send a test push notification to the authenticated user.
     */
    public function sendTest(Request $request): JsonResponse
    {
        $subscriptions = $request->user()->pushSubscriptions;

        if ($subscriptions->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'لا يوجد اشتراك إشعارات مسجل لهذا الحساب. يرجى تفعيل الإشعارات أولاً.',
                'needs_resubscribe' => true,
            ]);
        }

        $sent = false;
        $failedReason = null;
        $failedStatus = null;

        $sentHandler = function () use (&$sent) {
            $sent = true;
        };

        $failedHandler = function (NotificationFailed $event) use (&$failedReason, &$failedStatus) {
            $failedStatus = $event->report->getResponse()?->getStatusCode();
            $failedReason = (string) $event->report->getResponse()?->getBody();
            if (empty($failedReason)) {
                $failedReason = $event->report->getReason();
            }
        };

        Event::listen(NotificationSent::class, $sentHandler);
        Event::listen(NotificationFailed::class, $failedHandler);

        try {
            $request->user()->notifyNow(new TestPushNotification);
        } finally {
            Event::forget(NotificationSent::class);
            Event::forget(NotificationFailed::class);
        }

        if (! $sent && $failedReason) {
            // Delete expired or mismatched credentials so they don't block subsequent tries
            if (in_array($failedStatus, [403, 404, 410])) {
                $request->user()->pushSubscriptions()->delete();
            }
            logger()->error($failedReason);

            return response()->json([
                'success' => false,
                'message' => 'تعذر تسليم الإشعار من مزود الخدمة: '.($failedStatus ? "($failedStatus) " : '').$failedReason,
                'needs_resubscribe' => in_array($failedStatus, [403, 404, 410]),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'تم إرسال الإشعار التجريبي بنجاح!',
        ]);
    }
}
