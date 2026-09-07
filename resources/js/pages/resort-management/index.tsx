import React, { useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { Badge, Card, Col, Row, Statistic, Tabs } from 'antd';
import type { TabsProps } from 'antd';
import {
    Banknote,
    BedDouble,
    Building2,
    DoorOpen,
    Layers,
    Shield,
} from 'lucide-react';
import type { BreadcrumbItem } from '@/types';
import type { PriceRule, Sector, Unit } from '@/types/reservation';

// Components for each tab
import { SectorManagementTab } from '@/components/resort/sector-management-tab';
import { UnitManagementTab } from '@/components/resort/unit-management-tab';
import { PriceRuleManagementTab } from '@/components/resort/price-rule-management-tab';

interface SectorWithStats extends Sector {
    units_sum_rooms_count?: number | null;
}

interface UnitWithStats extends Unit {
    reservations_count?: number;
}

interface PriceRuleWithUnitsCount extends PriceRule {
    units_count?: number;
}

interface ResortManagementProps {
    sectors: SectorWithStats[];
    units: UnitWithStats[];
    priceRules: PriceRuleWithUnitsCount[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'لوحة التحكم',
        href: '/dashboard',
    },
    {
        title: 'إدارة المنتجع والوحدات',
        href: '/resort-management',
    },
];

export default function ResortManagementIndex({
    sectors = [],
    units = [],
    priceRules = [],
}: ResortManagementProps) {
    // Read initial tab from URL if present
    const urlParams = new URLSearchParams(
        typeof window !== 'undefined' ? window.location.search : ''
    );
    const initialTab = urlParams.get('tab') || 'units';
    const [activeTab, setActiveTab] = useState(initialTab);

    const handleTabChange = (key: string) => {
        setActiveTab(key);
        const url = new URL(window.location.href);
        url.searchParams.set('tab', key);
        window.history.replaceState({}, '', url.toString());
    };

    // Calculate aggregated statistics
    const totalRooms = useMemo(() => {
        return units.reduce((sum, u) => sum + (u.rooms_count || 1), 0);
    }, [units]);

    const unitsWithPriceRule = useMemo(() => {
        return units.filter((u) => Boolean(u.price_rule_id)).length;
    }, [units]);

    const tabItems: TabsProps['items'] = [
        {
            key: 'units',
            label: (
                <div className="flex items-center gap-2 py-1">
                    <DoorOpen className="h-4 w-4" />
                    <span className="font-semibold">الوحدات السكنية</span>
                    <Badge
                        count={units.length}
                        overflowCount={999}
                        className="ms-1"
                        color={activeTab === 'units' ? '#1677ff' : '#8c8c8c'}
                    />
                </div>
            ),
            children: (
                <UnitManagementTab
                    units={units}
                    sectors={sectors}
                    priceRules={priceRules}
                />
            ),
        },
        {
            key: 'sectors',
            label: (
                <div className="flex items-center gap-2 py-1">
                    <Building2 className="h-4 w-4" />
                    <span className="font-semibold">القطاعات</span>
                    <Badge
                        count={sectors.length}
                        className="ms-1"
                        color={activeTab === 'sectors' ? '#1677ff' : '#8c8c8c'}
                    />
                </div>
            ),
            children: <SectorManagementTab sectors={sectors} />,
        },
        {
            key: 'price-rules',
            label: (
                <div className="flex items-center gap-2 py-1">
                    <Banknote className="h-4 w-4" />
                    <span className="font-semibold">قواعد التسعير</span>
                    <Badge
                        count={priceRules.length}
                        className="ms-1"
                        color={activeTab === 'price-rules' ? '#1677ff' : '#8c8c8c'}
                    />
                </div>
            ),
            children: <PriceRuleManagementTab priceRules={priceRules} />,
        },
    ];

    return (
        <>
            <Head title="إدارة المنتجع والوحدات والأسعار" />

            <div className="space-y-6 p-4 md:p-6">
                {/* Header Banner */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-5 shadow-xs">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                                <Shield className="me-1 h-3.5 w-3.5" />
                                إعدادات المنتجع
                            </span>
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                            إدارة الوحدات السكنية والقطاعات والأسعار
                        </h1>
                        <p className="text-xs text-muted-foreground md:text-sm">
                            التحكم الكامل في قطاعات المنتجع، إضافة وتحديث الوحدات، وتعيين قواعد التسعير الرسمية لفئات العضوية المختلفة
                        </p>
                    </div>
                </div>

                {/* KPI Overview Cards */}
                <Row gutter={[10, 10]}>
                    <Col xs={12} sm={6}>
                        <Card size="small" className="shadow-xs border-blue-500/20 bg-blue-50/20 dark:bg-blue-950/10">
                            <Statistic
                                title={
                                    <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-blue-600 dark:text-blue-400">
                                        <DoorOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                        <span>إجمالي الوحدات</span>
                                    </div>
                                }
                                value={units.length}
                                suffix={<span className="text-[11px] sm:text-xs text-muted-foreground">وحدة</span>}
                                valueStyle={{ fontWeight: 700, fontSize: '1.25rem' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Card size="small" className="shadow-xs border-cyan-500/20 bg-cyan-50/20 dark:bg-cyan-950/10">
                            <Statistic
                                title={
                                    <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-cyan-600 dark:text-cyan-400">
                                        <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                        <span>إجمالي القطاعات</span>
                                    </div>
                                }
                                value={sectors.length}
                                suffix={<span className="text-[11px] sm:text-xs text-muted-foreground">قطاع</span>}
                                valueStyle={{ fontWeight: 700, fontSize: '1.25rem' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Card size="small" className="shadow-xs border-purple-500/20 bg-purple-50/20 dark:bg-purple-950/10">
                            <Statistic
                                title={
                                    <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-purple-600 dark:text-purple-400">
                                        <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                        <span>إجمالي الغرف</span>
                                    </div>
                                }
                                value={totalRooms}
                                suffix={<span className="text-[11px] sm:text-xs text-muted-foreground">غرفة</span>}
                                valueStyle={{ fontWeight: 700, fontSize: '1.25rem' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Card size="small" className="shadow-xs border-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/10">
                            <Statistic
                                title={
                                    <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                        <Banknote className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                        <span>قواعد التسعير</span>
                                    </div>
                                }
                                value={priceRules.length}
                                suffix={
                                    <span className="text-[10px] sm:text-xs text-muted-foreground">
                                        ({unitsWithPriceRule} مسعرة)
                                    </span>
                                }
                                valueStyle={{ fontWeight: 700, fontSize: '1.25rem' }}
                            />
                        </Card>
                    </Col>
                </Row>

                {/* Main Management Tabs */}
                <Card className="shadow-xs overflow-hidden" styles={{ body: { padding: '12px' } }}>
                    <div className="overflow-x-auto">
                        <Tabs
                            activeKey={activeTab}
                            onChange={handleTabChange}
                            items={tabItems}
                            type="card"
                            size="large"
                            className="resort-management-tabs"
                        />
                    </div>
                </Card>
            </div>
        </>
    );
}
