import { Link } from '@inertiajs/react';
import {
    Building2,
    CalendarDays,
    History,
    LayoutDashboard,
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
    useSidebar,
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
    const { isMobile, setOpenMobile } = useSidebar();

    return (
        <Sidebar
            collapsible="icon"
            variant="inset"
            side="right"
            className="border-l border-stone-200/80 bg-white/95 dark:border-stone-800/80 dark:bg-[#070e17]/95"
        >
            <SidebarHeader className="border-sidebar-border/40 border-b px-3 py-3">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            className="h-auto rounded-2xl p-1.5 transition-colors hover:bg-stone-100/80 dark:hover:bg-stone-800/60"
                        >
                            <Link
                                href={dashboard()}
                                prefetch
                                onClick={() => {
                                    if (isMobile) {
                                        setOpenMobile(false);
                                    }
                                }}
                            >
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="flex flex-col justify-between py-2">
                <div>
                    <NavMain items={mainNavItems} />
                </div>
            </SidebarContent>

            <SidebarFooter className="border-sidebar-border/40 space-y-2 border-t p-2">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
