import React, { useEffect } from 'react';
import { App, ConfigProvider } from 'antd';
import arEG from 'antd/locale/ar_EG';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import { useAppearance } from '@/hooks/use-appearance';
import { getAntdTheme } from '@/theme/antd-theme';

dayjs.locale('ar');

export function AntdProvider({ children }: { children: React.ReactNode }) {
    const { resolvedAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';

    useEffect(() => {
        dayjs.locale('ar');
    }, []);

    return (
        <ConfigProvider
            direction="rtl"
            locale={arEG}
            theme={getAntdTheme(isDark)}
        >
            <App>{children}</App>
        </ConfigProvider>
    );
}
