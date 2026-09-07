// Eagles Resort Push Notification Service Worker
const SW_VERSION = '1.0.6';

// Skip waiting during installation so the new service worker activates immediately
self.addEventListener('install', function (event) {
    self.skipWaiting();
});

// Claim clients on activation so all open tabs are controlled immediately, and purge old caches
self.addEventListener('activate', function (event) {
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then(function (cacheNames) {
                return Promise.all(
                    cacheNames.map(function (cacheName) {
                        return caches.delete(cacheName);
                    })
                );
            }),
        ])
    );
});

// Allow the client to explicitly request skipWaiting
self.addEventListener('message', function (event) {
    if (event.data && (event.data.action === 'skipWaiting' || event.data.type === 'SKIP_WAITING')) {
        self.skipWaiting();
    }
});

self.addEventListener('push', function (event) {
    if (!event.data) {
        return;
    }

    let data;
    try {
        data = event.data.json();
    } catch (e) {
        data = {
            title: 'منتجع النسور',
            body: event.data.text(),
        };
    }
    console.log(data);

    const title = data.title || 'منتجع النسور';
    const tag = data.tag || data.data?.tag || undefined;
    const newBody = data.body || '';

    event.waitUntil(
        (async function () {
            let finalBody = newBody;

            // Merge notifications of the same change tag if one is already displayed
            if (tag) {
                try {
                    const existingNotifications = await self.registration.getNotifications({ tag: tag });
                    if (existingNotifications.length > 0) {
                        const prevNotification = existingNotifications[0];
                        const prevBody = prevNotification.body || '';
                        if (prevBody && !prevBody.includes(newBody)) {
                            const lines = prevBody.split('\n').filter(Boolean);
                            lines.push(newBody);
                            // Keep the most recent 4 lines so it remains readable
                            if (lines.length > 4) {
                                lines.shift();
                            }
                            finalBody = lines.join('\n');
                        }
                    }
                } catch (err) {
                    console.error('Error merging notifications:', err);
                }
            }

            const options = {
                body: finalBody,
                icon: data.icon || '/192.png',
                badge: data.badge || '/favicon.svg',
                image: data.image || undefined,
                dir: 'rtl',
                lang: 'ar',
                vibrate: [200, 100, 200],
                tag: tag || (data.data?.notification_id ? `msg-${data.data.notification_id}` : `msg-${Date.now()}`),
                renotify: true,
                requireInteraction: false,
                data: data.data || {},
                actions: data.actions || [],
            };
            console.log(options, "options")

            return self.registration.showNotification(title, options);
        })()
    );
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const url = event.notification.data?.url || '/dashboard';

    // If an action was clicked, handle it
    if (event.action === 'open_dashboard') {
        event.waitUntil(clients.openWindow('/dashboard'));
        return;
    }

    // Default: open or focus the target URL
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            // Try to focus an existing window
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            // Otherwise open a new window
            return clients.openWindow(url);
        })
    );
});

self.addEventListener('notificationclose', function (event) {
    // Notification dismissed — no action needed
});
