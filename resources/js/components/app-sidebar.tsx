import { Link } from '@inertiajs/react';
import {
    Building2,
    CalendarDays,
    History,
    LayoutDashboard,
    ShieldCheck,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'لوحة التحكم',
        href: dashboard(),
        icon: LayoutDashboard,
    },
    {
        title: 'إدارة الحجوزات',
        href: '/reservations?date_preset=current_period',
        icon: CalendarDays,
    },
    {
        title: 'إدارة المنتجع والوحدات',
        href: '/resort-management',
        icon: Building2,
    },
    {
        title: 'المستخدمين والصلاحيات',
        href: '/users',
        icon: Users,
    },
    {
        title: 'سجل النشاط والمراقبة',
        href: '/activity-logs',
        icon: History,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset" side="right" className="border-l border-stone-200/80 dark:border-stone-800/80 bg-white/95 dark:bg-[#070e17]/95">
            <SidebarHeader className="border-b border-sidebar-border/40 py-3 px-3">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild className="h-auto p-1.5 rounded-2xl hover:bg-stone-100/80 dark:hover:bg-stone-800/60 transition-colors">
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="py-2 flex flex-col justify-between">
                <div>
                    <NavMain items={mainNavItems} />
                </div>

            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border/40 p-2 space-y-2">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
