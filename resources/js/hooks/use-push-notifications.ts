import { useCallback, useEffect, useRef, useState } from 'react';
import { useHttp, usePage } from '@inertiajs/react';
import { message } from 'antd';
import {
    destroy,
    sendTest as sendTestNotification,
    store,
    vapidKey as getVapidKey,
} from '@/actions/App/Http/Controllers/PushSubscriptionController';

/**
 * Convert a VAPID URL-safe base64 string to a Uint8Array
 * for use with PushManager.subscribe().
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
}

/**
 * Compare an ArrayBuffer from subscription.options.applicationServerKey
 * against a base64url VAPID public key.
 */
function isKeyMatching(
    buffer: ArrayBuffer | null | undefined,
    base64Key: string,
): boolean {
    if (!buffer || !base64Key) return false;
    try {
        const targetBytes = urlBase64ToUint8Array(base64Key);
        const currentBytes = new Uint8Array(buffer);
        if (targetBytes.length !== currentBytes.length) return false;
        for (let i = 0; i < targetBytes.length; i++) {
            if (targetBytes[i] !== currentBytes[i]) return false;
        }
        return true;
    } catch {
        return false;
    }
}

/**
 * Register or update the service worker with HTTP cache bypass.
 */
async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
    const registration = await navigator.serviceWorker.register('/sw.js?v=7', {
        scope: '/',
        updateViaCache: 'none',
    });

    // Request an immediate check for updates on the network
    try {
        await registration.update();
    } catch {
        // Ignore network update errors if offline
    }

    // If an updated worker is already waiting, tell it to activate immediately
    if (registration.waiting) {
        registration.waiting.postMessage({ action: 'skipWaiting' });
    }

    // Monitor for a new worker being installed and skip waiting once installed
    registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
                if (
                    installingWorker.state === 'installed' &&
                    navigator.serviceWorker.controller
                ) {
                    installingWorker.postMessage({ action: 'skipWaiting' });
                }
            });
        }
    });

    return registration;
}

/**
 * Completely unregister all service worker registrations, push subscriptions, and caches.
 */
async function unregisterAllServiceWorkers(): Promise<void> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
            try {
                const sub = await reg.pushManager.getSubscription();
                if (sub) {
                    await sub.unsubscribe();
                }
            } catch (e) {
                console.warn('[Push] Error unsubscribing previous subscription:', e);
            }
            await reg.unregister();
        }
    } catch (e) {
        console.warn('[Push] Error unregistering service workers:', e);
    }

    // Clear CacheStorage caches
    if ('caches' in window) {
        try {
            const keys = await window.caches.keys();
            await Promise.all(keys.map((key) => window.caches.delete(key)));
        } catch (e) {
            console.warn('[Push] Error clearing cache storage:', e);
        }
    }
}

type PushNotificationState = {
    isSupported: boolean;
    permission: NotificationPermission | 'unsupported';
    isSubscribed: boolean;
    isLoading: boolean;
    isSendingTest: boolean;
    subscribe: () => Promise<void>;
    unsubscribe: () => Promise<void>;
    sendTest: () => Promise<void>;
    resync: () => Promise<void>;
};

type ServerTestResponse = {
    success?: boolean;
    message?: string;
    needs_resubscribe?: boolean;
};

export function usePushNotifications(
    vapidPublicKeyProp?: string,
): PushNotificationState {
    const pageProps = usePage<{ vapidPublicKey?: string }>().props;

    const [activeVapidKey, setActiveVapidKey] = useState<string>(
        () => vapidPublicKeyProp || pageProps.vapidPublicKey || '',
    );

    const [isSupported] = useState(
        () =>
            typeof window !== 'undefined' &&
            'serviceWorker' in navigator &&
            'PushManager' in window &&
            'Notification' in window,
    );

    const [permission, setPermission] = useState<
        NotificationPermission | 'unsupported'
    >(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            return Notification.permission;
        }
        return 'unsupported';
    });

    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSendingTest, setIsSendingTest] = useState(false);

    const subscribeHttp = useHttp<{
        endpoint: string;
        keys: { auth: string; p256dh: string };
        content_encoding: string;
    }>({
        endpoint: '',
        keys: { auth: '', p256dh: '' },
        content_encoding: 'aes128gcm',
    });

    const unsubscribeHttp = useHttp<{
        endpoint: string;
    }>({
        endpoint: '',
    });

    const testHttp = useHttp<{}, ServerTestResponse>({});

    // Fetch public key if not yet available
    const keyRef = useRef(activeVapidKey);
    keyRef.current = activeVapidKey;

    const fetchKeyIfNeeded = useCallback(async (): Promise<string> => {
        if (keyRef.current) return keyRef.current;
        try {
            const res = await fetch(getVapidKey.url(), {
                headers: { Accept: 'application/json' },
            });
            if (res.ok) {
                const data = (await res.json()) as { publicKey?: string };
                if (data.publicKey) {
                    setActiveVapidKey(data.publicKey);
                    keyRef.current = data.publicKey;
                    return data.publicKey;
                }
            }
        } catch {
            // failed to fetch key
        }
        return '';
    }, []);

    // Perform browser + server subscription with a given key
    const doSubscribe = useCallback(
        async (key: string): Promise<boolean> => {
            if (!key || !isSupported) return false;

            const registration = await registerServiceWorker();
            await navigator.serviceWorker.ready;

            // Unsubscribe existing stale subscription from PushManager if any
            const existing = await registration.pushManager.getSubscription();
            if (existing) {
                await existing.unsubscribe();
            }

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
            });

            const subscriptionJson = subscription.toJSON();

            return new Promise<boolean>((resolve) => {
                subscribeHttp.transform(() => ({
                    endpoint: subscriptionJson.endpoint ?? '',
                    keys: {
                        auth: subscriptionJson.keys?.auth ?? '',
                        p256dh: subscriptionJson.keys?.p256dh ?? '',
                    },
                    content_encoding: 'aes128gcm',
                }));

                subscribeHttp.post(store.url(), {
                    onSuccess: () => {
                        setIsSubscribed(true);
                        resolve(true);
                    },
                    onError: () => {
                        resolve(false);
                    },
                });
            });
        },
        [isSupported, subscribeHttp],
    );

    // Initial check on mount: verify subscription status & key freshness
    useEffect(() => {
        if (!isSupported) return;

        let cancelled = false;

        const checkStatus = async () => {
            try {
                const currentKey = await fetchKeyIfNeeded();

                const registration =
                    (await navigator.serviceWorker.getRegistration('/')) ||
                    (await navigator.serviceWorker.getRegistration());
                if (!registration) {
                    if (!cancelled) setIsSubscribed(false);
                    return;
                }

                // Check for updates to sw.js in the background without blocking
                registration.update().catch(() => { });

                const subscription =
                    await registration.pushManager.getSubscription();

                if (!subscription) {
                    if (!cancelled) setIsSubscribed(false);
                    return;
                }

                // Check whether the subscription key matches current server key
                if (
                    currentKey &&
                    !isKeyMatching(
                        subscription.options?.applicationServerKey,
                        currentKey,
                    )
                ) {
                    // Stale subscription from older key: unsubscribe and self-heal!
                    await subscription.unsubscribe();

                    // If permission was already granted, auto-resubscribe with valid key
                    if (Notification.permission === 'granted') {
                        const success = await doSubscribe(currentKey);
                        if (!cancelled && success) {
                            message.info('تم تحديث بيانات اشتراك الإشعارات بالمفتاح الجديد تلقائياً.');
                            return;
                        }
                    }

                    if (!cancelled) setIsSubscribed(false);
                    return;
                }

                if (!cancelled) setIsSubscribed(true);
            } catch {
                // Ignore background check errors
            }
        };

        void checkStatus();

        return () => {
            cancelled = true;
        };
    }, [isSupported, fetchKeyIfNeeded, doSubscribe]);

    // Listen for controller changes when a new SW takes over
    useEffect(() => {
        if (!isSupported) return;

        const onControllerChange = () => {
            console.log('[SW] Service worker controller changed to new version.');
        };

        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
        return () => {
            navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        };
    }, [isSupported]);

    // Public subscribe handler
    const subscribe = useCallback(async () => {
        if (!isSupported) return;
        setIsLoading(true);

        try {
            const result = await Notification.requestPermission();
            setPermission(result);

            if (result !== 'granted') {
                message.warning('لم يتم منح إذن الإشعارات من المتصفح.');
                setIsLoading(false);
                return;
            }

            const currentKey = await fetchKeyIfNeeded();
            if (!currentKey) {
                message.error('تعذر الحصول على مفتاح التشفير العام (VAPID) من الخادم.');
                setIsLoading(false);
                return;
            }
            message.info('جاري تفعيل الإشعارات...');
            const success = await doSubscribe(currentKey);
            if (success) {
                message.success('تم تفعيل إشعارات المتصفح بنجاح!');
            } else {
                message.error('حدث خطأ أثناء حفظ الاشتراك على الخادم.');
            }
        } catch (err) {
            message.error('حدث خطأ أثناء تفعيل الإشعارات.');
        } finally {
            setIsLoading(false);
        }
    }, [isSupported, fetchKeyIfNeeded, doSubscribe]);

    // Public unsubscribe handler
    const unsubscribe = useCallback(async () => {
        if (!isSupported) return;
        setIsLoading(true);

        try {
            const registration =
                (await navigator.serviceWorker.getRegistration('/')) ||
                (await navigator.serviceWorker.getRegistration());
            if (!registration) {
                setIsSubscribed(false);
                setIsLoading(false);
                return;
            }

            const subscription =
                await registration.pushManager.getSubscription();
            if (!subscription) {
                setIsSubscribed(false);
                setIsLoading(false);
                return;
            }

            const endpoint = subscription.endpoint;
            await subscription.unsubscribe();

            unsubscribeHttp.transform(() => ({ endpoint }));

            unsubscribeHttp.delete(destroy.url(), {
                onSuccess: () => {
                    setIsSubscribed(false);
                    message.success('تم إلغاء تفعيل إشعارات المتصفح بنجاح.');
                },
                onError: () => {
                    message.warning('تم إلغاء الاشتراك محلياً ولكن تعذر حذفه من الخادم.');
                },
                onFinish: () => {
                    setIsLoading(false);
                },
            });
        } catch {
            message.error('حدث خطأ أثناء إلغاء الاشتراك.');
            setIsLoading(false);
        }
    }, [isSupported, unsubscribeHttp]);

    // Force re-sync subscription: completely remove SW registrations, clear caches, register SW fresh, and re-subscribe
    const resync = useCallback(async () => {
        if (!isSupported) {
            message.warning('المتصفح الحالي لا يدعم خدمة الإشعارات.');
            return;
        }

        setIsLoading(true);
        message.loading({
            content: 'جاري حذف Service Worker بالكامل وإعادة تسجيله وتحديث الاشتراك...',
            key: 'resync',
            duration: 0,
        });

        try {
            const currentKey = await fetchKeyIfNeeded();
            if (!currentKey) {
                message.error({
                    content: 'تعذر الحصول على مفتاح VAPID من الخادم.',
                    key: 'resync',
                });
                return;
            }

            // 1. Completely remove all service worker registrations, active push subscriptions & browser caches
            await unregisterAllServiceWorkers();

            // Give the browser's worker thread a brief moment to settle
            await new Promise((resolve) => setTimeout(resolve, 150));

            // 2. Re-register service worker fresh with updateViaCache: 'none'
            const registration = await registerServiceWorker();
            await navigator.serviceWorker.ready;

            // 3. Create fresh push subscription
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(currentKey) as BufferSource,
            });

            const subscriptionJson = subscription.toJSON();

            // 4. Save subscription to server
            await new Promise<boolean>((resolve) => {
                subscribeHttp.transform(() => ({
                    endpoint: subscriptionJson.endpoint ?? '',
                    keys: {
                        auth: subscriptionJson.keys?.auth ?? '',
                        p256dh: subscriptionJson.keys?.p256dh ?? '',
                    },
                    content_encoding: 'aes128gcm',
                }));

                subscribeHttp.post(store.url(), {
                    onSuccess: () => {
                        setIsSubscribed(true);
                        message.success({
                            content: 'تم حذف Service Worker وإعادة تسجيله ومزامنة الاشتراك بنجاح!',
                            key: 'resync',
                            duration: 4,
                        });
                        resolve(true);
                    },
                    onError: () => {
                        message.error({
                            content: 'تم إعادة تسجيل Service Worker ولكن تعذر حفظ الاشتراك في الخادم.',
                            key: 'resync',
                            duration: 4,
                        });
                        resolve(false);
                    },
                });
            });
        } catch (err) {
            console.error('[Push] Resync failed:', err);
            message.error({
                content: 'فشل تحديث اشتراك الإشعارات وإعادة تسجيل Service Worker.',
                key: 'resync',
            });
        } finally {
            setIsLoading(false);
        }
    }, [isSupported, fetchKeyIfNeeded, subscribeHttp]);

    // Send test notification with live status reporting
    const sendTest = useCallback(async () => {
        setIsSendingTest(true);
        message.loading({ content: 'جاري إرسال الإشعار التجريبي...', key: 'test-push' });

        testHttp.post(sendTestNotification.url(), {
            onSuccess: async (response) => {
                const res = response as ServerTestResponse;
                if (res.success) {
                    message.success({
                        content: res.message || 'تم إرسال الإشعار التجريبي بنجاح!',
                        key: 'test-push',
                    });
                } else {
                    message.error({
                        content: res.message || 'فشل إرسال الإشعار التجريبي.',
                        key: 'test-push',
                        duration: 5,
                    });

                    if (res.needs_resubscribe) {
                        message.info('جاري إعادة تهيئة الاشتراك بمفاتيح حديثة تلقائياً...');
                        await resync();
                    }
                }
            },
            onError: (errors) => {
                message.error({
                    content: 'تعذر إرسال الإشعار التجريبي من الخادم.',
                    key: 'test-push',
                });
            },
            onFinish: () => {
                setIsSendingTest(false);
            },
        });
    }, [testHttp, resync]);

    return {
        isSupported,
        permission,
        isSubscribed,
        isLoading,
        isSendingTest,
        subscribe,
        unsubscribe,
        sendTest,
        resync,
    };
}
