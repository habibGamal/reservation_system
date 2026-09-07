import React from 'react';
import { Card } from 'antd';
import {
    Activity,
    Calendar,
    CheckCircle2,
    Clock,
    FileEdit,
    PlusCircle,
    Trash2,
    Users,
} from 'lucide-react';
import type { ActivityStats } from '@/types/activity-log';

interface ActivityStatsProps {
    stats: ActivityStats;
}

export function ActivityStatsSection({ stats }: ActivityStatsProps) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Operations */}
            <Card
                size="small"
                className="overflow-hidden border border-border/60 shadow-sm transition-all hover:shadow-md"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">
                            إجمالي العمليات
                        </p>
                        <h3 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                            {stats.total_count.toLocaleString()}
                        </h3>
                        <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                            سجل تدقيق كامل منذ البدء
                        </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Activity className="h-6 w-6" />
                    </div>
                </div>
            </Card>

            {/* Today's Operations */}
            <Card
                size="small"
                className="overflow-hidden border border-border/60 shadow-sm transition-all hover:shadow-md"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">
                            عمليات اليوم
                        </p>
                        <h3 className="mt-1 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                            {stats.today_count.toLocaleString()}
                        </h3>
                        <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                            نشاط المستخدمين المسجل اليوم
                        </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <Clock className="h-6 w-6" />
                    </div>
                </div>
            </Card>

            {/* Active Users */}
            <Card
                size="small"
                className="overflow-hidden border border-border/60 shadow-sm transition-all hover:shadow-md"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">
                            المستخدمين المسجلين
                        </p>
                        <h3 className="mt-1 text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                            {stats.active_users_count.toLocaleString()}
                        </h3>
                        <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                            موظفين قاموا بإجراءات بالنظام
                        </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <Users className="h-6 w-6" />
                    </div>
                </div>
            </Card>

            {/* Breakdown */}
            <Card
                size="small"
                className="overflow-hidden border border-border/60 shadow-sm transition-all hover:shadow-md"
            >
                <div className="flex flex-col justify-between h-full">
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">
                        نوع الإجراءات المسجلة
                    </p>
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                        <div className="rounded-lg bg-emerald-500/10 p-1.5 dark:bg-emerald-950/30">
                            <span className="flex items-center justify-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                                <PlusCircle className="h-3 w-3" />
                                إنشاء
                            </span>
                            <span className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                                {stats.events_breakdown.created}
                            </span>
                        </div>
                        <div className="rounded-lg bg-blue-500/10 p-1.5 dark:bg-blue-950/30">
                            <span className="flex items-center justify-center gap-1 text-[11px] font-medium text-blue-700 dark:text-blue-300">
                                <FileEdit className="h-3 w-3" />
                                تعديل
                            </span>
                            <span className="text-sm font-bold text-blue-800 dark:text-blue-200">
                                {stats.events_breakdown.updated}
                            </span>
                        </div>
                        <div className="rounded-lg bg-rose-500/10 p-1.5 dark:bg-rose-950/30">
                            <span className="flex items-center justify-center gap-1 text-[11px] font-medium text-rose-700 dark:text-rose-300">
                                <Trash2 className="h-3 w-3" />
                                حذف
                            </span>
                            <span className="text-sm font-bold text-rose-800 dark:text-rose-200">
                                {stats.events_breakdown.deleted}
                            </span>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
