import { Link, usePage } from '@inertiajs/react';
import type { InertiaLinkProps } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import {
    BellOutlined,
    BgColorsOutlined,
    CheckCircleOutlined,
    IdcardOutlined,
    LockOutlined,
    RightOutlined,
    SafetyCertificateOutlined,
    SettingOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { Avatar, Badge, Card, Tag } from 'antd';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { Auth } from '@/types';

interface SettingsNavItem {
    title: string;
    description: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
}

const settingsNavItems: SettingsNavItem[] = [
    {
        title: 'الملف الشخصي',
        description: 'البيانات الشخصية وعنوان البريد',
        href: edit(),
        icon: IdcardOutlined,
    },
    {
        title: 'الأمان وكلمة المرور',
        description: 'كلمة السر والمصادقة الثنائية ومفاتيح المرور',
        href: editSecurity(),
        icon: SafetyCertificateOutlined,
    },
    {
        title: 'المظهر والسمة',
        description: 'الوضع الليلي والنهاري وتفضيلات العرض',
        href: editAppearance(),
        icon: BgColorsOutlined,
    },
    {
        title: 'إشعارات المتصفح',
        description: 'تنبيهات النظام الفورية وإذن الويب',
        href: '/settings/notifications',
        icon: BellOutlined,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const { auth } = usePage<{ auth?: Auth }>().props;
    const user = auth?.user;

    return (
        <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8  space-y-6" dir="rtl">
            {/* Executive Header Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-sky-700 via-sky-800 to-slate-900 p-6 sm:p-8 text-white shadow-sm">
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Tag className="border-0 bg-white/15 text-white text-xs font-semibold px-2.5 py-0.5 rounded-md m-0">
                                <SettingOutlined className="ml-1" />
                                إعدادات النظام
                            </Tag>
                            <Tag className="border-0 bg-amber-400/20 text-amber-300 text-xs font-medium px-2.5 py-0.5 rounded-md m-0">
                                منتجع النسور للقوات الجوية
                            </Tag>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white m-0">
                            إعدادات الحساب والنظام
                        </h1>
                        <p className="text-white/80 text-xs sm:text-sm max-w-2xl leading-relaxed m-0">
                            تخصيص بياناتك الشخصية، تعزيز أمان حسابك بكلمات المرور والمصادقة، وضبط مظهر واجهة النظام وتنبيهات المتصفح الفورية.
                        </p>
                    </div>

                    {user && (
                        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xs border border-white/15 rounded-xl p-3 sm:self-center shrink-0">
                            <Avatar
                                size={44}
                                className="bg-sky-500 text-white font-bold border-2 border-white/30 text-base"
                            >
                                {user.name ? user.name.charAt(0).toUpperCase() : <UserOutlined />}
                            </Avatar>
                            <div className="text-right">
                                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                                    <span>{user.name}</span>
                                    <CheckCircleOutlined className="text-emerald-400 text-xs" />
                                </div>
                                <div className="text-xs text-white/70 truncate max-w-[180px]" dir="ltr">
                                    {user.email}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Subtle Background Pattern Elements */}
                <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute right-1/3 -top-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            </div>

            {/* Mobile Navigation Pills (Horizontal Scroll) */}
            <div className="block lg:hidden overflow-x-auto pb-1 -mx-2 px-2 scrollbar-none">
                <div className="flex items-center gap-2 min-w-max py-1">
                    {settingsNavItems.map((item, index) => {
                        const isActive = isCurrentOrParentUrl(item.href);
                        const Icon = item.icon;

                        return (
                            <Link
                                key={`mobile-${toUrl(item.href)}-${index}`}
                                href={item.href}
                                className={cn(
                                    'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all shrink-0',
                                    isActive
                                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                                        : 'bg-card text-stone-700 dark:text-stone-300 border-stone-200/80 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800'
                                )}
                            >
                                <Icon className="text-sm" />
                                <span>{item.title}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Main Content Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Desktop Navigation Sidebar */}
                <aside className="hidden lg:block lg:col-span-4 xl:col-span-3">
                    <Card
                        className="border border-stone-200/80 dark:border-stone-800 shadow-2xs rounded-2xl overflow-hidden bg-card"
                        styles={{ body: { padding: '12px' } }}
                    >
                        <div className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                            أقسام الإعدادات
                        </div>

                        <nav className="flex flex-col gap-1.5" aria-label="أقسام الإعدادات">
                            {settingsNavItems.map((item, index) => {
                                const isActive = isCurrentOrParentUrl(item.href);
                                const Icon = item.icon;

                                return (
                                    <Link
                                        key={`${toUrl(item.href)}-${index}`}
                                        href={item.href}
                                        className={cn(
                                            'group relative flex items-start gap-3 p-3 rounded-xl transition-all duration-200 border text-right',
                                            isActive
                                                ? 'bg-sky-50/80 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/80 text-sky-900 dark:text-sky-100 shadow-2xs'
                                                : 'border-transparent hover:bg-stone-100/70 dark:hover:bg-stone-800/50 text-stone-700 dark:text-stone-300'
                                        )}
                                    >
                                        {/* Active Indicator Bar */}
                                        {isActive && (
                                            <div className="absolute right-0 top-3 bottom-3 w-1 bg-sky-600 dark:bg-sky-400 rounded-l-full" />
                                        )}

                                        <div
                                            className={cn(
                                                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors text-base',
                                                isActive
                                                    ? 'bg-sky-600 text-white shadow-2xs'
                                                    : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 group-hover:bg-sky-100 dark:group-hover:bg-sky-900/40 group-hover:text-sky-600 dark:group-hover:text-sky-400'
                                            )}
                                        >
                                            <Icon />
                                        </div>

                                        <div className="flex-1 min-w-0 pr-1">
                                            <div className="flex items-center justify-between gap-1">
                                                <span
                                                    className={cn(
                                                        'text-sm font-semibold truncate',
                                                        isActive
                                                            ? 'text-sky-700 dark:text-sky-300 font-bold'
                                                            : 'text-foreground'
                                                    )}
                                                >
                                                    {item.title}
                                                </span>
                                                <RightOutlined
                                                    className={cn(
                                                        'text-[10px] transition-transform duration-200 rotate-180',
                                                        isActive
                                                            ? 'text-sky-600 dark:text-sky-400 -translate-x-0.5'
                                                            : 'text-stone-300 dark:text-stone-600 opacity-0 group-hover:opacity-100'
                                                    )}
                                                />
                                            </div>
                                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                                {item.description}
                                            </p>
                                        </div>
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Security notice footer in sidebar */}
                        <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800/80 px-2 pb-1">
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                <LockOutlined className="text-sky-600 shrink-0 text-xs" />
                                <span>جلسة العمل مشفرة ومحمية بنظام أمني عسكري</span>
                            </div>
                        </div>
                    </Card>
                </aside>

                {/* Content Body */}
                <main className="lg:col-span-8 xl:col-span-9 space-y-6 w-full min-w-0">
                    {children}
                </main>
            </div>
        </div>
    );
}
