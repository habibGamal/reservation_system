import { createInertiaApp } from '@inertiajs/react';
import { DirectionProvider } from '@radix-ui/react-direction';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import { AntdProvider } from '@/components/antd-provider';
import LoadingScreen from '@/components/loading-screen';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'منتجع النسور';

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <AntdProvider>
                <DirectionProvider dir="rtl">
                    <TooltipProvider delayDuration={0}>
                        {app}
                        <LoadingScreen />
                        <Toaster dir="rtl" />
                    </TooltipProvider>
                </DirectionProvider>
            </AntdProvider>
        );
    },
    progress: false,
});

// This will set light / dark mode on load...
initializeTheme();
