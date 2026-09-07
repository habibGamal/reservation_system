<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class TestPushNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, class-string>
     */
    public function via(object $notifiable): array
    {
        return [WebPushChannel::class];
    }

    /**
     * Get the web push representation of the notification.
     */
    public function toWebPush(object $notifiable, self $notification): WebPushMessage
    {

        logger()->info('test');

        return (new WebPushMessage)
            ->title('🔔 إشعار تجريبي — منتجع النسور')
            ->icon('/logo.jpg')
            ->body('تم تفعيل إشعارات المتصفح بنجاح! ستصلك التنبيهات الفورية من نظام إدارة الحجوزات.')
            ->action('فتح لوحة التحكم', 'open_dashboard')
            ->options([
                'TTL' => 300,
                'urgency' => 'normal',
            ])
            ->data([
                'url' => '/dashboard',
                'notification_id' => $notification->id,
            ]);
    }
}
