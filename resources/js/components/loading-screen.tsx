import { useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';

/**
 * Trigger and replay the SVG animation on the loading screen
 */
export function triggerLoadingScreen() {
    const el = document.getElementById('app-loading-screen');
    if (!el) return;

    // Restart SVG fill animation from beginning
    const svg = el.querySelector('#app-loading-svg') as HTMLElement | null;
    if (svg) {
        svg.classList.remove('svg-elem-loop');
        void svg.offsetWidth; // Force DOM reflow to restart keyframe animation
        svg.classList.add('svg-elem-loop');
    }

    el.classList.remove('app-loading-hidden');
}

/**
 * Fade out and hide the loading screen
 */
export function hideLoadingScreen() {
    const el = document.getElementById('app-loading-screen');
    if (el) {
        el.classList.add('app-loading-hidden');
    }
}

/**
 * Normalizes URL path (removes trailing slash, lowercases)
 */
function getNormalizedPath(url: string | URL): string {
    try {
        const parsed = typeof url === 'string' ? new URL(url, window.location.origin) : url;
        const pathname = parsed.pathname.replace(/\/+$/, '') || '/';
        return pathname.toLowerCase();
    } catch {
        return '';
    }
}

/**
 * Global Inertia route-change listener that controls the #app-loading-screen in app.blade.php.
 * Only activates when the route/page itself changes (pathname change), NOT on query param updates!
 */
export default function LoadingScreen() {
    const activeRequestsRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // Initial page load has completed and React is mounted: hide initial loading screen smoothly
        hideLoadingScreen();

        const removeStart = router.on('start', (event) => {
            const visit = event.detail.visit;
            const method = (visit.method || 'get').toLowerCase();
            const isPrefetch = Boolean(visit.prefetch);
            const showProgress = visit.showProgress !== false;

            // Only for GET requests, not prefetching, and progress not disabled
            if (method !== 'get' || isPrefetch || !showProgress) {
                return;
            }

            const currentPath = getNormalizedPath(window.location.pathname);
            const targetPath = getNormalizedPath(visit.url);

            // ONLY trigger when the route or page itself changes!
            // If targetPath === currentPath, it means only query parameters (filters, pagination) or hash changed.
            if (targetPath === currentPath) {
                return;
            }

            activeRequestsRef.current += 1;

            if (activeRequestsRef.current === 1) {
                if (timerRef.current) {
                    clearTimeout(timerRef.current);
                }
                // Small buffer (e.g. 60ms) so instant local/cached navigations don't cause a visual flash
                timerRef.current = setTimeout(() => {
                    triggerLoadingScreen();
                }, 60);
            }
        });

        const removeFinish = router.on('finish', (event) => {
            const visit = event.detail.visit;
            const method = (visit.method || 'get').toLowerCase();
            const isPrefetch = Boolean(visit.prefetch);

            if (method === 'get' && !isPrefetch) {
                activeRequestsRef.current = Math.max(0, activeRequestsRef.current - 1);

                if (activeRequestsRef.current === 0) {
                    if (timerRef.current) {
                        clearTimeout(timerRef.current);
                        timerRef.current = null;
                    }
                    hideLoadingScreen();
                }
            }
        });

        const removeCancel = router.on('cancel', () => {
            activeRequestsRef.current = 0;
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            hideLoadingScreen();
        });

        return () => {
            removeStart();
            removeFinish();
            removeCancel();
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    return null;
}
