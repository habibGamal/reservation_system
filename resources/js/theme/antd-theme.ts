import { ThemeConfig, theme } from 'antd';

export function getAntdTheme(isDark: boolean): ThemeConfig {
    return {
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
            colorPrimary: '#0284c7',
            colorSuccess: '#10b981',
            colorWarning: '#f59e0b',
            colorError: '#ef4444',
            colorInfo: '#0284c7',
            borderRadius: 8,
            fontFamily:
                "'Cairo', 'IBM Plex Sans Arabic', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            colorBgContainer: isDark ? '#141414' : '#ffffff',
            colorBgElevated: isDark ? '#1f1f1f' : '#ffffff',
            colorBgLayout: isDark ? '#0a0a0a' : '#f8fafc',
            colorBorder: isDark ? '#2e2e2e' : '#e2e8f0',
            colorBorderSecondary: isDark ? '#262626' : '#f1f5f9',
        },
        components: {
            Button: {
                borderRadius: 8,
                controlHeight: 38,
                fontWeight: 500,
            },
            Table: {
                borderRadius: 12,
                headerBg: isDark ? '#1a1a1a' : '#f8fafc',
                headerColor: isDark ? '#cbd5e1' : '#475569',
                rowHoverBg: isDark ? '#262626' : '#f1f5f9',
            },
            Card: {
                borderRadiusLG: 12,
                headerHeight: 48,
            },
            Modal: {
                borderRadiusLG: 16,
                contentBg: isDark ? '#1a1a1a' : '#ffffff',
                headerBg: isDark ? '#1a1a1a' : '#ffffff',
            },
            Drawer: {
                colorBgElevated: isDark ? '#18181b' : '#ffffff',
            },
            Input: {
                controlHeight: 38,
                borderRadius: 8,
            },
            Select: {
                controlHeight: 38,
                borderRadius: 8,
            },
            DatePicker: {
                controlHeight: 38,
                borderRadius: 8,
            },
            Tag: {
                borderRadiusSM: 6,
            },
        },
    };
}
