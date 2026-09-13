import React from 'react';
import { Card, Col, Row, Statistic, Tooltip } from 'antd';
import { KPIStats, ReservationStatus } from '@/types/reservation';
import {
    BedDouble,
    CheckCircle2,
    Clock,
    Layers,
    LogOut,
    TrendingUp,
} from 'lucide-react';

interface KpiDashboardProps {
    stats: KPIStats;
    totalUnits?: number;
    currentStatusFilter?: ReservationStatus | null;
    currentStatusFilters?: (ReservationStatus | string)[];
    onSelectStatusFilter?: (status: ReservationStatus | null) => void;
    onSelectStatusesFilter?: (statuses: ReservationStatus[]) => void;
}

export function KpiDashboard({
    stats,
    totalUnits,
    currentStatusFilter,
    currentStatusFilters,
    onSelectStatusFilter,
    onSelectStatusesFilter,
}: KpiDashboardProps) {
    const activeStatuses = React.useMemo(() => {
        if (currentStatusFilters !== undefined) {
            return currentStatusFilters.filter((s) => s && (s as string) !== 'all');
        }
        if (currentStatusFilter && (currentStatusFilter as string) !== 'all') {
            return [currentStatusFilter];
        }
        return [];
    }, [currentStatusFilters, currentStatusFilter]);

    const actualCount = (stats.checked_in || 0) + (stats.waiting || 0);

    const occupancyRate = React.useMemo(() => {
        if (totalUnits && totalUnits > 0 && actualCount <= totalUnits) {
            return Math.round((actualCount / totalUnits) * 100);
        }
        if (stats.total > 0) {
            return Math.round((actualCount / stats.total) * 100);
        }
        return 0;
    }, [actualCount, totalUnits, stats.total]);

    const isActualActive =
        activeStatuses.length === 2 &&
        activeStatuses.includes('تم التسكين') &&
        activeStatuses.includes('انتظار');

    const isTotalActive = activeStatuses.length === 0;
    const isCheckedInActive =
        !isActualActive && activeStatuses.length === 1 && activeStatuses.includes('تم التسكين');
    const isConfirmedActive = activeStatuses.includes('ثابت');
    const isWaitingActive =
        !isActualActive && activeStatuses.length === 1 && activeStatuses.includes('انتظار');
    const isDepartedActive = activeStatuses.includes('غادر');

    const handleCardClick = (status: ReservationStatus | null) => {
        if (!onSelectStatusFilter) return;
        onSelectStatusFilter(status);
    };

    const handleActualOccupancyClick = () => {
        if (onSelectStatusesFilter) {
            if (isActualActive) {
                onSelectStatusesFilter([]);
            } else {
                onSelectStatusesFilter(['تم التسكين', 'انتظار']);
            }
        } else if (onSelectStatusFilter) {
            onSelectStatusFilter(isActualActive ? null : 'تم التسكين');
        }
    };

    return (
        <div dir="rtl" className="w-full">
            <Row gutter={[12, 12]}>
                {/* 1. Total Reservations */}
                <Col xs={12} sm={8} lg={4} className="flex-1">
                    <Card
                        hoverable
                        size="small"
                        onClick={() => handleCardClick(null)}
                        className={`cursor-pointer transition-all ${isTotalActive
                            ? 'border-primary shadow-xs ring-2 ring-primary/20'
                            : 'opacity-90 hover:opacity-100'
                            }`}
                        styles={{ body: { padding: '12px 14px' } }}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground text-xs font-medium">
                                إجمالي الحجوزات
                            </span>
                            <Layers className="text-muted-foreground/70 h-4 w-4" />
                        </div>
                        <Statistic
                            value={stats.total}
                            styles={{
                                content: {
                                    fontSize: '1.5rem',
                                    fontWeight: 700,
                                    lineHeight: 1.2,
                                    marginTop: 4,
                                },
                            }}
                        />
                        <span className="text-muted-foreground mt-1 block text-[11px]">
                            للفترة المحددة
                        </span>
                    </Card>
                </Col>

                {/* 2. Actual Occupancy Rate (نسبة الإسكان الفعلي) */}
                <Col xs={12} sm={8} lg={4} className="flex-1">
                    <Tooltip
                        title={`الإسكان الفعلي: ${actualCount} وحدة (${occupancyRate}% من الطاقة الاستيعابية) - يشمل النزلاء المسكنين (${stats.checked_in}) وقائمة الانتظار (${stats.waiting})`}
                    >
                        <Card
                            hoverable
                            size="small"
                            onClick={handleActualOccupancyClick}
                            className={`cursor-pointer transition-all ${isActualActive
                                ? 'border-indigo-600 bg-indigo-50/80 shadow-xs ring-2 ring-indigo-500/30 dark:bg-indigo-950/50'
                                : 'border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-white opacity-90 hover:opacity-100 dark:border-indigo-900/40 dark:from-indigo-950/20 dark:via-stone-900 dark:to-stone-900'
                                }`}
                            styles={{ body: { padding: '12px 14px' } }}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                                    نسبة الإسكان الفعلي
                                </span>
                                <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="flex items-baseline justify-between gap-1">
                                <Statistic
                                    value={occupancyRate}
                                    suffix="%"
                                    styles={{
                                        content: {
                                            fontSize: '1.5rem',
                                            fontWeight: 700,
                                            color: '#6366f1',
                                            lineHeight: 1.2,
                                            marginTop: 4,
                                        },
                                    }}
                                />
                                <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-900/60 px-1.5 py-0.5 rounded">
                                    {actualCount} فعلي
                                </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[11px] border-t border-indigo-100 dark:border-indigo-900/40 pt-1">
                                <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                    تسكين: <strong className="font-bold">{stats.checked_in}</strong>
                                </span>
                                <span className="text-stone-300 dark:text-stone-600">•</span>
                                <span className="text-amber-700 dark:text-amber-400 font-medium">
                                    انتظار: <strong className="font-bold">{stats.waiting}</strong>
                                </span>
                            </div>
                        </Card>
                    </Tooltip>
                </Col>

                {/* 3. Checked-in */}
                <Col xs={12} sm={8} lg={4} className="flex-1">
                    <Card
                        hoverable
                        size="small"
                        onClick={() => handleCardClick('تم التسكين')}
                        className={`cursor-pointer transition-all ${isCheckedInActive
                            ? 'border-emerald-500 bg-emerald-50/50 shadow-xs ring-2 ring-emerald-500/20 dark:bg-emerald-950/30'
                            : 'opacity-90 hover:opacity-100'
                            }`}
                        styles={{ body: { padding: '12px 14px' } }}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                تم التسكين
                            </span>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <Statistic
                            value={stats.checked_in}
                            styles={{
                                content: {
                                    fontSize: '1.5rem',
                                    fontWeight: 700,
                                    color: '#10b981',
                                    lineHeight: 1.2,
                                    marginTop: 4,
                                },
                            }}
                        />
                        <span className="mt-1 block text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
                            نزلاء حاليون
                        </span>
                    </Card>
                </Col>

                {/* 4. Confirmed */}
                <Col xs={12} sm={8} lg={4} className="flex-1">
                    <Card
                        hoverable
                        size="small"
                        onClick={() => handleCardClick('ثابت')}
                        className={`cursor-pointer transition-all ${isConfirmedActive
                            ? 'border-blue-500 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20 dark:bg-blue-950/30'
                            : 'opacity-90 hover:opacity-100'
                            }`}
                        styles={{ body: { padding: '12px 14px' } }}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                ثابت
                            </span>
                            <BedDouble className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <Statistic
                            value={stats.confirmed}
                            styles={{
                                content: {
                                    fontSize: '1.5rem',
                                    fontWeight: 700,
                                    color: '#3b82f6',
                                    lineHeight: 1.2,
                                    marginTop: 4,
                                },
                            }}
                        />
                        <span className="mt-1 block text-[11px] text-blue-600/80 dark:text-blue-400/80">
                            مخصصة
                        </span>
                    </Card>
                </Col>

                {/* 5. Waiting */}
                <Col xs={12} sm={8} lg={4} className="flex-1">
                    <Card
                        hoverable
                        size="small"
                        onClick={() => handleCardClick('انتظار')}
                        className={`cursor-pointer transition-all ${isWaitingActive
                            ? 'border-amber-500 bg-amber-50/50 shadow-xs ring-2 ring-amber-500/20 dark:bg-amber-950/30'
                            : 'opacity-90 hover:opacity-100'
                            }`}
                        styles={{ body: { padding: '12px 14px' } }}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                                قائمة الانتظار
                            </span>
                            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <Statistic
                            value={stats.waiting}
                            styles={{
                                content: {
                                    fontSize: '1.5rem',
                                    fontWeight: 700,
                                    color: '#f59e0b',
                                    lineHeight: 1.2,
                                    marginTop: 4,
                                },
                            }}
                        />
                        <span className="mt-1 block text-[11px] text-amber-600/80 dark:text-amber-400/80">
                            بانتظار التأكيد
                        </span>
                    </Card>
                </Col>

                {/* 6. Departed */}
                <Col xs={12} sm={8} lg={4} className="flex-1">
                    <Card
                        hoverable
                        size="small"
                        onClick={() => handleCardClick('غادر')}
                        className={`cursor-pointer transition-all ${isDepartedActive
                            ? 'border-red-500 bg-red-50/50 shadow-xs ring-2 ring-red-500/20 dark:bg-red-950/30'
                            : 'opacity-90 hover:opacity-100'
                            }`}
                        styles={{ body: { padding: '12px 14px' } }}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-red-700 dark:text-red-300">
                                المغادرون
                            </span>
                            <LogOut className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </div>
                        <Statistic
                            value={stats.departed}
                            styles={{
                                content: {
                                    fontSize: '1.5rem',
                                    fontWeight: 700,
                                    color: '#ef4444',
                                    lineHeight: 1.2,
                                    marginTop: 4,
                                },
                            }}
                        />
                        <span className="mt-1 block text-[11px] text-red-600/80 dark:text-red-400/80">
                            انتهت إقامتهم
                        </span>
                    </Card>
                </Col>

            </Row>
        </div>
    );
}

export default KpiDashboard;
