import { Link } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/types';

export function NavMain({ items }: { items: NavItem[] }) {
    const { isCurrentUrl } = useCurrentUrl();
    const { isMobile, setOpenMobile } = useSidebar();

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel className="mb-1 flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-stone-500 uppercase dark:text-stone-400">
                <span className="h-1.5 w-1.5 rounded-full bg-[#053f89] dark:bg-sky-400" />
                منظومة الإدارة الفندقية
            </SidebarGroupLabel>
            <SidebarMenu className="space-y-1">
                {items.map((item) => {
                    const active = isCurrentUrl(item.href);

                    return (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                isActive={active}
                                tooltip={{ children: item.title }}
                                className={cn(
                                    'flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition-all duration-200',
                                    active
                                        ? '!bg-gradient-to-r !from-[#053f89] !to-[#0284c7] !font-bold !text-white shadow-md shadow-blue-900/20 hover:!from-[#04336f] hover:!to-[#0275b0]'
                                        : 'font-medium text-stone-700 hover:bg-[#053f89]/8 hover:text-[#053f89] dark:text-stone-300 dark:hover:bg-sky-950/40 dark:hover:text-sky-300',
                                )}
                            >
                                <Link
                                    href={item.href}
                                    prefetch
                                    className="flex w-full items-center gap-3"
                                    onClick={() => {
                                        if (isMobile) {
                                            setOpenMobile(false);
                                        }
                                    }}
                                >
                                    {item.icon && (
                                        <item.icon
                                            className={cn(
                                                'h-4.5 w-4.5 shrink-0 transition-colors',
                                                active
                                                    ? 'text-white'
                                                    : 'text-[#053f89] dark:text-sky-400',
                                            )}
                                        />
                                    )}
                                    <span className="truncate">
                                        {item.title}
                                    </span>
                                    {active && (
                                        <span className="mr-auto h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300 shadow-xs group-data-[collapsible=icon]:hidden" />
                                    )}
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
