import type { LucideIcon } from 'lucide-react';
import { Monitor, Moon, Sun } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import type { Appearance } from '@/hooks/use-appearance';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

export default function AppearanceToggleTab({
    className = '',
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    const { appearance, updateAppearance } = useAppearance();

    const tabs: { value: Appearance; icon: LucideIcon; label: string }[] = [
        { value: 'light', icon: Sun, label: 'الوضع الفاتح' },
        { value: 'dark', icon: Moon, label: 'الوضع الداكن' },
        { value: 'system', icon: Monitor, label: 'تلقائي (حسب النظام)' },
    ];

    return (
        <div
            className={cn(
                'inline-flex gap-1.5 rounded-2xl bg-stone-100 p-1.5 dark:bg-stone-800/80 border border-stone-200/60 dark:border-stone-700/60',
                className,
            )}
            dir="rtl"
            {...props}
        >
            {tabs.map(({ value, icon: Icon, label }) => {
                const isSelected = appearance === value;

                return (
                    <button
                        key={value}
                        type="button"
                        onClick={() => updateAppearance(value)}
                        className={cn(
                            'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 cursor-pointer',
                            isSelected
                                ? 'bg-white text-sky-700 shadow-xs dark:bg-stone-900 dark:text-sky-400'
                                : 'text-stone-500 hover:bg-stone-200/60 hover:text-foreground dark:text-stone-400 dark:hover:bg-stone-700/40',
                        )}
                    >
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                    </button>
                );
            })}
        </div>
    );
}
