import { usePage } from '@inertiajs/react';

export default function AppLogo() {
    const { name } = usePage().props;

    return (
        <div className="flex items-center gap-3 w-full text-right" dir="rtl">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-white dark:bg-stone-800 p-1.5 shadow-sm border border-[#053f89]/20 dark:border-sky-800/30 flex items-center justify-center ring-2 ring-[#053f89]/10">
                <img
                    src="/logo.png"
                    alt="شعار منتجع النسور"
                    className="w-full h-full object-contain"
                />
            </div>
            <div className="grid flex-1 text-right leading-tight group-data-[collapsible=icon]:hidden min-w-0">
                <span className="font-extrabold text-sm text-foreground tracking-tight truncate">
                    منتجع النسور
                </span>
                <span className="text-[10px] text-muted-foreground font-sans flex items-center gap-1 font-bold -mt-0.5">
                    <span className="text-[#053f89] dark:text-sky-400 font-extrabold tracking-wider">EAGLES RESORT</span>
                </span>
            </div>
        </div>
    );
}
