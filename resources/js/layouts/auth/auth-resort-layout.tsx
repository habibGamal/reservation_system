import { Link } from '@inertiajs/react';
import { Building2, CalendarCheck, Moon, ShieldCheck, Sun } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { useAppearance } from '@/hooks/use-appearance';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthResortLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';

    const toggleTheme = () => {
        updateAppearance(isDark ? 'light' : 'dark');
    };

    return (
        <div className="min-h-svh w-full flex flex-col lg:flex-row bg-background text-foreground selection:bg-[#053f89]/20 selection:text-[#053f89]" dir="rtl">
            {/* Desktop Brand Showcase (Right side in RTL) */}
            <div className="relative hidden lg:flex lg:w-[48%] xl:w-[45%] flex-col justify-between overflow-hidden bg-gradient-to-br from-[#021833] via-[#053f89] to-[#01142a] text-white p-10 xl:p-14">
                {/* Background Ambient Glows & Vector Watermark */}
                <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-sky-500/15 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full flex items-center justify-center opacity-5 pointer-events-none select-none">
                    <AppLogoIcon className="w-[600px] h-[600px] text-white" />
                </div>

                {/* Top Brand Header */}
                <div className="relative z-10">
                    <Link href={home()} className="inline-flex items-center gap-4 group">
                        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md p-2.5 border border-white/20 shadow-xl group-hover:scale-105 transition-transform duration-300 flex items-center justify-center">
                            <img
                                src="/logo.png"
                                alt="شعار منتجع النسور"
                                className="w-full h-full object-contain filter drop-shadow-sm brightness-105 contrast-125"
                            />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xl xl:text-2xl font-black tracking-wide text-white font-sans">
                                    منتجع النسور
                                </span>
                                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                    EAGLES RESORT
                                </span>
                            </div>
                            <p className="text-xs text-sky-200/80 font-medium m-0 mt-0.5">
                                إدارة الضيافة والحجوزات الفندقية • القوات الجوية
                            </p>
                        </div>
                    </Link>
                </div>

                {/* Center Hero Features */}
                <div className="relative z-10 my-auto py-10 space-y-8">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-xs text-sky-100">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            بوابة الإدارة المركزية المعتمدة
                        </div>
                        <h2 className="text-2xl xl:text-3xl font-extrabold text-white leading-tight">
                            تجربة ضيافة استثنائية وإدارة إلكترونية متطورة
                        </h2>
                        <p className="text-sm text-sky-100/85 leading-relaxed max-w-lg">
                            نظام متكامل لإدارة الشاليهات، الفيلات الفندقية، الحجوزات السريعة وخدمات النزلاء وفق أعلى معايير الجودة والراحة.
                        </p>
                    </div>

                    {/* Feature Pills */}
                    <div className="space-y-3.5 max-w-md">
                        <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-colors">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-400/20 text-sky-200">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div className="text-right">
                                <h4 className="text-sm font-bold text-white m-0">
                                    إدارة الفيلات والوحدات الفندقية
                                </h4>
                                <p className="text-xs text-sky-100/70 m-0">
                                    متابعة الإشغال والجاهزية الفورية لجميع القطاعات
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-colors">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-400/20 text-emerald-200">
                                <CalendarCheck className="h-5 w-5" />
                            </div>
                            <div className="text-right">
                                <h4 className="text-sm font-bold text-white m-0">
                                    حجوزات إلكترونية فورية
                                </h4>
                                <p className="text-xs text-sky-100/70 m-0">
                                    تأكيد آلي وتنظيم مرن للخدمات ومواعيد الوصول والمغادرة
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-colors">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-400/20 text-amber-200">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <div className="text-right">
                                <h4 className="text-sm font-bold text-white m-0">
                                    أمان وخصوصية مشددة
                                </h4>
                                <p className="text-xs text-sky-100/70 m-0">
                                    صلاحيات مدققة وسجلات نشاط مؤمنة لمنظومة المنتجع
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Assurance */}
                <div className="relative z-10 pt-6 border-t border-white/15 flex items-center justify-between text-xs text-sky-200/70">
                    <span>منتجع النسور © {new Date().getFullYear()}</span>
                    <span className="font-mono text-[11px] text-sky-300/80">EAGLES RESORT v2.0</span>
                </div>
            </div>

            {/* Interactive Form Canvas (Left side in RTL) */}
            <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 relative overflow-y-auto bg-gradient-to-b from-stone-50/70 via-white to-sky-50/30 dark:from-[#060d17] dark:via-[#091322] dark:to-[#050c14]">
                {/* Top Controls: Mobile Logo & Theme Toggle */}
                <div className="w-full flex items-center justify-between pb-6">
                    {/* Mobile Logo Branding */}
                    <Link href={home()} className="flex lg:hidden items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-stone-800 p-1.5 shadow-md border border-stone-200 dark:border-stone-700 flex items-center justify-center">
                            <img
                                src="/logo.png"
                                alt="منتجع النسور"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <div>
                            <span className="text-base font-extrabold text-foreground block">منتجع النسور</span>
                            <span className="text-[10px] text-muted-foreground block -mt-1 font-mono">EAGLES RESORT</span>
                        </div>
                    </Link>

                    <div className="hidden lg:block">
                        {/* Placeholder for desktop balance */}
                    </div>

                    {/* Appearance Toggle */}
                    <button
                        type="button"
                        onClick={toggleTheme}
                        aria-label="تبديل المظهر"
                        className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-stone-200 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 text-foreground hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors shadow-2xs cursor-pointer"
                        title={isDark ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
                    >
                        {isDark ? (
                            <Sun className="h-4 w-4 text-amber-400" />
                        ) : (
                            <Moon className="h-4 w-4 text-stone-600" />
                        )}
                    </button>
                </div>

                {/* Center Form Card */}
                <div className="w-full max-w-md mx-auto my-auto py-4">
                    <div className="bg-card/95 backdrop-blur-xl border border-stone-200/90 dark:border-stone-800/90 rounded-3xl shadow-xl shadow-stone-900/5 dark:shadow-black/40 p-6 sm:p-8 md:p-9 transition-all">
                        {/* Crest Icon & Heading */}
                        <div className="text-center mb-6">
                            <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#053f89] to-[#0284c7] text-white shadow-lg shadow-blue-900/25 ring-4 ring-[#053f89]/10">
                                <AppLogoIcon className="h-9 w-9 text-white" />
                            </div>

                            {title && (
                                <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight m-0">
                                    {title}
                                </h1>
                            )}

                            {description && (
                                <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto leading-relaxed">
                                    {description}
                                </p>
                            )}
                        </div>

                        {/* Page Content / Form */}
                        {children}
                    </div>
                </div>

                {/* Footer Note */}
                <div className="w-full text-center pt-6 text-[11px] text-muted-foreground">
                    <span>منظومة الحجوزات والخدمات الفندقية • منتجع النسور للقوات الجوية</span>
                </div>
            </div>
        </div>
    );
}
