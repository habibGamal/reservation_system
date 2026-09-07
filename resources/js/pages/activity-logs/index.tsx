import React, { useCallback, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { Button } from 'antd';
import { History, RefreshCw, ShieldCheck } from 'lucide-react';
import { ActivityDetailDrawer } from '@/components/activity-logs/activity-detail-drawer';
import { ActivityFilters } from '@/components/activity-logs/activity-filters';
import { ActivityStatsSection } from '@/components/activity-logs/activity-stats';
import { ActivityTable } from '@/components/activity-logs/activity-table';
import type {
    ActivityFilterState,
    ActivityLogItem,
    ActivityLogPageProps,
} from '@/types/activity-log';

export default function ActivityLogsIndex({
    activities,
    filters,
    stats,
    filterOptions,
}: ActivityLogPageProps) {
    const [loading, setLoading] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState<ActivityLogItem | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Filter Change Handler
    const handleFilterChange = useCallback(
        (updatedFields: Partial<ActivityFilterState>) => {
            const nextFilters: ActivityFilterState = {
                ...filters,
                ...updatedFields,
            };

            // Clean empty filter params
            const queryParams: Record<string, string | number> = {};
            if (nextFilters.search) queryParams.search = nextFilters.search;
            if (nextFilters.user_id) queryParams.user_id = nextFilters.user_id;
            if (nextFilters.sector_id) queryParams.sector_id = nextFilters.sector_id;
            if (nextFilters.unit_id) queryParams.unit_id = nextFilters.unit_id;
            if (nextFilters.event) queryParams.event = nextFilters.event;
            if (nextFilters.subject_type) queryParams.subject_type = nextFilters.subject_type;
            if (nextFilters.start_date) queryParams.start_date = nextFilters.start_date;
            if (nextFilters.end_date) queryParams.end_date = nextFilters.end_date;
            if (nextFilters.per_page && nextFilters.per_page !== 20) {
                queryParams.per_page = nextFilters.per_page;
            }

            setLoading(true);
            router.get('/activity-logs', queryParams, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onFinish: () => setLoading(false),
            });
        },
        [filters]
    );

    // Reset Filters
    const handleResetFilters = useCallback(() => {
        setLoading(true);
        router.get(
            '/activity-logs',
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onFinish: () => setLoading(false),
            }
        );
    }, []);

    // Pagination Handler
    const handlePageChange = useCallback(
        (page: number, perPage: number) => {
            const queryParams: Record<string, string | number> = {
                page,
                per_page: perPage,
            };
            if (filters.search) queryParams.search = filters.search;
            if (filters.user_id) queryParams.user_id = filters.user_id;
            if (filters.sector_id) queryParams.sector_id = filters.sector_id;
            if (filters.unit_id) queryParams.unit_id = filters.unit_id;
            if (filters.event) queryParams.event = filters.event;
            if (filters.subject_type) queryParams.subject_type = filters.subject_type;
            if (filters.start_date) queryParams.start_date = filters.start_date;
            if (filters.end_date) queryParams.end_date = filters.end_date;

            setLoading(true);
            router.get('/activity-logs', queryParams, {
                preserveState: true,
                preserveScroll: true,
                onFinish: () => setLoading(false),
            });
        },
        [filters]
    );

    // View Details Drawer
    const handleViewDetails = (activity: ActivityLogItem) => {
        setSelectedActivity(activity);
        setDrawerOpen(true);
    };

    // Manual Refresh
    const handleRefresh = () => {
        setLoading(true);
        router.reload({
            onFinish: () => setLoading(false),
        });
    };

    return (
        <>
            <Head title="سجل النشاط والمراقبة" />

            <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8 ">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <History className="h-5 w-5" />
                            </div>
                            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                                سجل النشاط والمراقبة
                            </h1>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                            متابعة وتدقيق كافة التعديلات والعمليات على الحجوزات والوحدات والمدفوعات والمستخدمين
                        </p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                            icon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
                            onClick={handleRefresh}
                            loading={loading}
                            className="font-medium text-xs sm:text-sm w-full sm:w-auto justify-center"
                        >
                            تحديث السجل
                        </Button>
                    </div>
                </div>

                {/* Statistics Cards */}
                <ActivityStatsSection stats={stats} />

                {/* Filters Toolbar */}
                <ActivityFilters
                    filters={filters}
                    filterOptions={filterOptions}
                    onChange={handleFilterChange}
                    onReset={handleResetFilters}
                    loading={loading}
                />

                {/* Main Activity Table */}
                <ActivityTable
                    activities={activities}
                    loading={loading}
                    onPageChange={handlePageChange}
                    onViewDetails={handleViewDetails}
                />
            </div>

            {/* Detailed Inspection Drawer */}
            <ActivityDetailDrawer
                activity={selectedActivity}
                open={drawerOpen}
                onClose={() => {
                    setDrawerOpen(false);
                    setSelectedActivity(null);
                }}
            />
        </>
    );
}

ActivityLogsIndex.layout = {
    breadcrumbs: [
        {
            title: 'سجل النشاط والمراقبة',
            href: '/activity-logs',
        },
    ],
};
