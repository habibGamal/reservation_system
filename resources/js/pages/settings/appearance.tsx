import { Head } from '@inertiajs/react';
import {
    CheckCircleFilled,
    CheckOutlined,
    LaptopOutlined,
    MoonOutlined,
    SunOutlined,
    BgColorsOutlined,
} from '@ant-design/icons';
import { Card, Tag } from 'antd';
import AppearanceTabs from '@/components/appearance-tabs';
import { useAppearance } from '@/hooks/use-appearance';
import type { Appearance as AppearanceType } from '@/hooks/use-appearance';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { cn } from '@/lib/utils';

interface ThemeOption {
    value: AppearanceType;
    title: string;
    subtitle: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    preview: 'light' | 'dark' | 'system';
}

const themeOptions: ThemeOption[] = [
    {
        value: 'light',
        title: 'الوضع الفاتح (نهار)',
        subtitle: 'Light Mode',
        description:
            'مظهر ناصع وعالي الوضوح، مثالي لأجواء العمل النهارية والبيئات المضيئة مع تباين واضح للنصوص والجداول.',
        icon: SunOutlined,
        accentColor: 'border-amber-400 text-amber-500 bg-amber-500/10',
        preview: 'light',
    },
    {
        value: 'dark',
        title: 'الوضع الداكن (ليل)',
        subtitle: 'Dark Mode',
        description:
            'مظهر داكن فاخر يخفف إجهاد العين أثناء العمل الليلي، مع ألوان عميقة وتأثيرات بصرية مريحة للنظر.',
        icon: MoonOutlined,
        accentColor: 'border-indigo-400 text-indigo-400 bg-indigo-500/10',
        preview: 'dark',
    },
    {
        value: 'system',
        title: 'تلقائي (حسب النظام)',
        subtitle: 'System Default',
        description:
            'مزامنة ذكية تتكيف تلقائياً وفورياً مع تفضيلات مظهر نظام التشغيل بجهازك دون الحاجة لتغييرها يدوياً.',
        icon: LaptopOutlined,
        accentColor: 'border-sky-400 text-sky-500 bg-sky-500/10',
        preview: 'system',
    },
];

export default function Appearance() {
    const { appearance, resolvedAppearance, updateAppearance } = useAppearance();

    return (
        <>
            <Head title="المظهر والسمة - إعدادات الحساب" />

            <div className="space-y-6 text-right" dir="rtl">
                {/* Main Appearance Selector Card */}
                <Card
                    className="border border-stone-200/80 dark:border-stone-800 shadow-2xs rounded-2xl bg-card overflow-hidden"
                    styles={{ body: { padding: '24px' } }}
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-stone-100 dark:border-stone-800">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 text-lg">
                                <BgColorsOutlined />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-bold text-foreground m-0">
                                        مظهر الواجهة والسمة البصرية
                                    </h3>
                                    <Tag color="cyan" className="font-semibold text-xs border-0 m-0">
                                        {resolvedAppearance === 'dark' ? 'السمة الداكنة نشطة' : 'السمة الفاتحة نشطة'}
                                    </Tag>
                                </div>
                                <p className="text-xs text-muted-foreground m-0 mt-0.5">
                                    اختر السمة التي تفضلها لعرض لوحة تحكم منتجع النسور
                                </p>
                            </div>
                        </div>

                        {/* Inline quick toggle */}
                        <AppearanceTabs />
                    </div>

                    {/* Interactive Visual Theme Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {themeOptions.map((option) => {
                            const isSelected = appearance === option.value;
                            const Icon = option.icon;

                            return (
                                <div
                                    key={option.value}
                                    onClick={() => updateAppearance(option.value)}
                                    className={cn(
                                        'group relative flex flex-col justify-between rounded-2xl border-2 p-5 cursor-pointer transition-all duration-300',
                                        isSelected
                                            ? 'border-sky-600 bg-sky-50/40 dark:bg-sky-950/30 shadow-md ring-2 ring-sky-500/20'
                                            : 'border-stone-200/80 dark:border-stone-800 bg-card hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-sm'
                                    )}
                                >
                                    {/* Selection Badge */}
                                    <div className="flex items-center justify-between gap-2 mb-4">
                                        <div className={cn(
                                            'flex h-9 w-9 items-center justify-center rounded-xl text-base transition-colors',
                                            isSelected
                                                ? 'bg-sky-600 text-white shadow-xs'
                                                : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 group-hover:bg-sky-100 dark:group-hover:bg-sky-900/40 group-hover:text-sky-600'
                                        )}>
                                            <Icon />
                                        </div>

                                        {isSelected ? (
                                            <Tag color="success" icon={<CheckOutlined />} className="font-bold text-xs border-0 m-0 px-2.5 py-0.5 rounded-full">
                                                المظهر المختار
                                            </Tag>
                                        ) : (
                                            <span className="text-[11px] text-muted-foreground font-mono">
                                                {option.subtitle}
                                            </span>
                                        )}
                                    </div>

                                    {/* Miniature Visual Mockup */}
                                    <div className="mb-4 rounded-xl overflow-hidden border border-stone-200/80 dark:border-stone-700/80 shadow-xs h-28 relative">
                                        {option.preview === 'light' && (
                                            <div className="h-full bg-slate-50 p-2.5 flex flex-col justify-between" dir="rtl">
                                                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                                                    <div className="h-2 w-16 bg-sky-600 rounded-sm" />
                                                    <div className="flex gap-1">
                                                        <div className="h-2 w-2 rounded-full bg-slate-300" />
                                                        <div className="h-2 w-2 rounded-full bg-slate-300" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 my-auto">
                                                    <div className="h-8 bg-white rounded-md border border-slate-200 shadow-2xs p-1">
                                                        <div className="h-1.5 w-10 bg-slate-300 rounded-sm mb-1" />
                                                        <div className="h-2 w-6 bg-sky-500 rounded-sm" />
                                                    </div>
                                                    <div className="h-8 bg-white rounded-md border border-slate-200 shadow-2xs p-1">
                                                        <div className="h-1.5 w-8 bg-slate-300 rounded-sm mb-1" />
                                                        <div className="h-2 w-5 bg-emerald-500 rounded-sm" />
                                                    </div>
                                                </div>
                                                <div className="h-3 w-full bg-white rounded-sm border border-slate-200" />
                                            </div>
                                        )}

                                        {option.preview === 'dark' && (
                                            <div className="h-full bg-zinc-950 p-2.5 flex flex-col justify-between" dir="rtl">
                                                <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
                                                    <div className="h-2 w-16 bg-sky-400 rounded-sm" />
                                                    <div className="flex gap-1">
                                                        <div className="h-2 w-2 rounded-full bg-zinc-700" />
                                                        <div className="h-2 w-2 rounded-full bg-zinc-700" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 my-auto">
                                                    <div className="h-8 bg-zinc-900 rounded-md border border-zinc-800 p-1">
                                                        <div className="h-1.5 w-10 bg-zinc-700 rounded-sm mb-1" />
                                                        <div className="h-2 w-6 bg-sky-400 rounded-sm" />
                                                    </div>
                                                    <div className="h-8 bg-zinc-900 rounded-md border border-zinc-800 p-1">
                                                        <div className="h-1.5 w-8 bg-zinc-700 rounded-sm mb-1" />
                                                        <div className="h-2 w-5 bg-emerald-400 rounded-sm" />
                                                    </div>
                                                </div>
                                                <div className="h-3 w-full bg-zinc-900 rounded-sm border border-zinc-800" />
                                            </div>
                                        )}

                                        {option.preview === 'system' && (
                                            <div className="h-full flex relative">
                                                {/* Left half Dark */}
                                                <div className="w-1/2 h-full bg-zinc-950 p-2 flex flex-col justify-between border-l border-zinc-800">
                                                    <div className="h-2 w-8 bg-sky-400 rounded-sm" />
                                                    <div className="h-8 bg-zinc-900 rounded border border-zinc-800 p-1">
                                                        <div className="h-1.5 w-6 bg-zinc-700 rounded-sm mb-1" />
                                                        <div className="h-2 w-4 bg-sky-400 rounded-sm" />
                                                    </div>
                                                    <div className="h-2.5 w-full bg-zinc-900 rounded" />
                                                </div>
                                                {/* Right half Light */}
                                                <div className="w-1/2 h-full bg-slate-50 p-2 flex flex-col justify-between">
                                                    <div className="h-2 w-8 bg-sky-600 rounded-sm" />
                                                    <div className="h-8 bg-white rounded border border-slate-200 p-1">
                                                        <div className="h-1.5 w-6 bg-slate-300 rounded-sm mb-1" />
                                                        <div className="h-2 w-4 bg-emerald-500 rounded-sm" />
                                                    </div>
                                                    <div className="h-2.5 w-full bg-white rounded" />
                                                </div>
                                                <div className="absolute inset-y-0 left-1/2 w-0.5 bg-sky-500 -translate-x-1/2" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Text Content */}
                                    <div className="space-y-1.5 text-right">
                                        <h4 className="text-sm font-bold text-foreground m-0">
                                            {option.title}
                                        </h4>
                                        <p className="text-xs text-muted-foreground m-0 leading-relaxed">
                                            {option.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Additional Theme Tip Card */}
                <Card
                    className="border border-stone-200/80 dark:border-stone-800 shadow-2xs rounded-2xl bg-card overflow-hidden"
                    styles={{ body: { padding: '20px' } }}
                >
                    <div className="flex items-start gap-3 text-xs text-muted-foreground leading-relaxed">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-sm">
                            💡
                        </div>
                        <div className="space-y-1">
                            <span className="font-bold text-foreground block">
                                ملاحظة حول حفظ السمة المفضلة
                            </span>
                            <p className="m-0">
                                يتم حفظ تفضيل السمة تلقائياً في متصفحك وسيبقى مفعلاً في جميع زياراتك القادمة للنظام حتى بعد تسجيل الخروج وإعادة الدخول.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </>
    );
}

Appearance.layout = {
    breadcrumbs: [
        {
            title: 'لوحة التحكم',
            href: '/dashboard',
        },
        {
            title: 'إعدادات الحساب',
            href: edit(),
        },
        {
            title: 'المظهر والسمة',
            href: editAppearance(),
        },
    ],
};
