import React from 'react';
import { Card, Col, Row, Statistic } from 'antd';
import { KPIStats, ReservationStatus } from '@/types/reservation';
import {
    BedDouble,
    CheckCircle2,
    Clock,
    Layers,
    LogOut,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';

interface KpiDashboardProps {
    stats: KPIStats;
    currentStatusFilter?: ReservationStatus | null;
    currentStatusFilters?: (ReservationStatus | string)[];
    onSelectStatusFilter?: (status: ReservationStatus | null) => void;
}

export function KpiDashboard({
    stats,
    currentStatusFilter,
    currentStatusFilters,
    onSelectStatusFilter,
}: KpiDashboardProps) {
    const activeStatuses = React.useMemo(() => {
        if (currentStatusFilters !== undefined) {
            return currentStatusFilters.filter((s) => s && s !== 'all');
        }
        if (currentStatusFilter && currentStatusFilter !== 'all') {
            return [currentStatusFilter];
        }
        return [];
    }, [currentStatusFilters, currentStatusFilter]);

    const isTotalActive = activeStatuses.length === 0;
    const isCheckedInActive = activeStatuses.includes('تم التسكين');
    const isConfirmedActive = activeStatuses.includes('ثابت');
    const isWaitingActive = activeStatuses.includes('انتظار');
    const isDepartedActive = activeStatuses.includes('غادر');

    const handleCardClick = (status: ReservationStatus | null) => {
        if (!onSelectStatusFilter) return;
        onSelectStatusFilter(status);
    };

    return (
        <div dir="rtl" className="w-full">
            <Row gutter={[12, 12]}>
                {/* 1. Total Reservations */}
                <Col xs={12} sm={6} lg={4} xl={3} className="flex-1">
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

                {/* 2. Checked-in */}
                <Col xs={12} sm={6} lg={4} xl={3} className="flex-1">
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

                {/* 3. Confirmed */}
                <Col xs={12} sm={6} lg={4} xl={3} className="flex-1">
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
                            جاهز للتسكين
                        </span>
                    </Card>
                </Col>

                {/* 4. Waiting */}
                <Col xs={12} sm={6} lg={4} xl={3} className="flex-1">
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

                {/* 5. Departed */}
                <Col xs={12} sm={6} lg={4} xl={3} className="flex-1">
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

                {/* 6. Collected Revenue */}
                <Col xs={12} sm={6} lg={4} xl={3} className="flex-1">
                    <Card
                        size="small"
                        styles={{ body: { padding: '12px 14px' } }}
                        className="bg-card"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground text-xs font-medium">
                                المتحصلات
                            </span>
                            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <Statistic
                            value={Number(stats.total_collected_revenue)}
                            precision={0}
                            suffix={
                                <span className="text-muted-foreground text-xs font-normal">
                                    ج.م
                                </span>
                            }
                            styles={{
                                content: {
                                    fontSize: '1.25rem',
                                    fontWeight: 700,
                                    color: '#10b981',
                                    lineHeight: 1.2,
                                    marginTop: 4,
                                },
                            }}
                        />
                        <span className="text-muted-foreground mt-1 block text-[11px]">
                            المحصل بالخزينة
                        </span>
                    </Card>
                </Col>

                {/* 7. Outstanding Balance */}
                <Col xs={12} sm={6} lg={4} xl={3} className="flex-1">
                    <Card
                        size="small"
                        styles={{ body: { padding: '12px 14px' } }}
                        className="bg-card"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground text-xs font-medium">
                                المتبقي
                            </span>
                            <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                        </div>
                        <Statistic
                            value={Number(stats.total_outstanding_balance)}
                            precision={0}
                            suffix={
                                <span className="text-muted-foreground text-xs font-normal">
                                    ج.م
                                </span>
                            }
                            styles={{
                                content: {
                                    fontSize: '1.25rem',
                                    fontWeight: 700,
                                    color: '#ef4444',
                                    lineHeight: 1.2,
                                    marginTop: 4,
                                },
                            }}
                        />
                        <span className="text-muted-foreground mt-1 block text-[11px]">
                            مستحقات معلقة
                        </span>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}

export default KpiDashboard;
