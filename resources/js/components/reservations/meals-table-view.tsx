import React, { useMemo, useState } from 'react';
import {
    Badge,
    Button,
    Card,
    Empty,
    Input,
    Space,
    Table,
    Tag,
    Tooltip,
    Typography,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
    Building2,
    Calendar,
    DoorOpen,
    Edit2,
    Eye,
    Phone,
    Printer,
    Search,
    Shield,
    Sparkles,
    User,
    UtensilsCrossed,
} from 'lucide-react';
import dayjs from 'dayjs';
import { Guest, Reservation, Sector, Unit } from '@/types/reservation';
import { compareReservationsBySectorAndUnit } from './reservation-antd-table-view';
import { MealsPrintDialog } from './meals-print-dialog';

const { Text } = Typography;

interface MealsTableViewProps {
    reservations: Reservation[];
    units?: Unit[];
    sectors?: Sector[];
    sectorId?: string;
    sectorIds?: string[];
    search?: string;
    startDate?: string;
    endDate?: string;
    datePreset?: string;
    loading?: boolean;
    onEdit?: (reservation: Reservation) => void;
    onViewGuestDetails?: (guest: Guest) => void;
}

export function MealsTableView({
    reservations,
    units = [],
    sectors = [],
    sectorId,
    sectorIds = [],
    search: initialSearch = '',
    startDate,
    endDate,
    datePreset,
    loading = false,
    onEdit,
    onViewGuestDetails,
}: MealsTableViewProps) {
    const [localSearch, setLocalSearch] = useState('');
    const [isPrintOpen, setIsPrintOpen] = useState(false);
    const [todayOnlyFilter, setTodayOnlyFilter] = useState(false);

    const todayStr = dayjs().format('YYYY-MM-DD');

    // Filter only reservations with meals
    const mealsReservations = useMemo(() => {
        let list = reservations.filter((r) => Boolean(r.has_meals));

        // Filter by sector if specified
        if (sectorIds.length > 0) {
            const numericIds = sectorIds.map(Number);
            list = list.filter((r) => {
                const sId = r.unit?.sector_id ?? r.unit?.sector?.id;
                return sId && numericIds.includes(sId);
            });
        } else if (sectorId && sectorId !== 'all') {
            const numId = Number(sectorId);
            list = list.filter((r) => {
                const sId = r.unit?.sector_id ?? r.unit?.sector?.id;
                return sId === numId;
            });
        }

        // Local search filter
        const q = (localSearch || initialSearch).trim().toLowerCase();
        if (q) {
            list = list.filter((r) => {
                const guestName = r.guest?.name?.toLowerCase() || '';
                const phone = r.guest?.phone || '';
                const milCode = r.guest?.mil_code?.toLowerCase() || '';
                const unitName = r.unit?.name?.toLowerCase() || '';
                const sectorName = r.unit?.sector?.name?.toLowerCase() || '';
                return (
                    guestName.includes(q) ||
                    phone.includes(q) ||
                    milCode.includes(q) ||
                    unitName.includes(q) ||
                    sectorName.includes(q)
                );
            });
        }

        // Today only toggle filter
        if (todayOnlyFilter) {
            list = list.filter((r) => {
                const s = r.meals_start_date ? dayjs(r.meals_start_date).format('YYYY-MM-DD') : r.check_in;
                const e = r.meals_end_date ? dayjs(r.meals_end_date).format('YYYY-MM-DD') : r.check_out;
                return todayStr >= s && todayStr < e;
            });
        }

        return list.sort(compareReservationsBySectorAndUnit);
    }, [reservations, sectorIds, sectorId, localSearch, initialSearch, todayOnlyFilter, todayStr]);

    // KPI Metrics calculation
    const metrics = useMemo(() => {
        let todayMealsCount = 0;
        let todayUnitsCount = 0;
        let totalMealsCount = 0;
        let totalMealsPrice = 0;

        for (const r of mealsReservations) {
            const persons = Number(r.meals_persons_count) || 4;
            const s = r.meals_start_date ? dayjs(r.meals_start_date).format('YYYY-MM-DD') : r.check_in;
            const e = r.meals_end_date ? dayjs(r.meals_end_date).format('YYYY-MM-DD') : r.check_out;

            const isToday = todayStr >= s && todayStr < e;
            if (isToday) {
                todayMealsCount += persons;
                todayUnitsCount++;
            }

            const nights = r.meals_nights_count ?? (r.meals_start_date && r.meals_end_date ? Math.max(0, dayjs(r.meals_end_date).diff(dayjs(r.meals_start_date), 'day')) : 0);
            totalMealsCount += persons * nights;
            totalMealsPrice += Number(r.meals_total_price) || 0;
        }

        return {
            todayMealsCount,
            todayUnitsCount,
            totalMealsCount,
            totalMealsPrice,
            reservationsCount: mealsReservations.length,
        };
    }, [mealsReservations, todayStr]);

    const columns: TableColumnsType<Reservation> = [
        {
            title: '#',
            key: 'index',
            width: 55,
            align: 'center',
            render: (_, __, index) => (
                <span className="text-xs font-semibold text-muted-foreground">{index + 1}</span>
            ),
        },
        {
            title: 'القطاع والوحدة',
            key: 'sector_unit',
            width: 170,
            render: (_, record) => {
                const sectorName = record.unit?.sector?.name || 'قطاع عام';
                const unitName = record.unit?.name || 'غير محدد';
                return (
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 font-bold text-foreground text-xs">
                            <DoorOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>{unitName}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Building2 className="h-3 w-3 shrink-0" />
                            <span>{sectorName}</span>
                        </div>
                    </div>
                );
            },
        },
        {
            title: 'بيانات النزيل',
            key: 'guest_details',
            width: 230,
            render: (_, record) => {
                const guest = record.guest;
                if (!guest) return <span className="text-muted-foreground text-xs">—</span>;

                return (
                    <div className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-foreground">
                            <User className="h-3.5 w-3.5 text-stone-500 shrink-0" />
                            <span
                                className="hover:text-primary cursor-pointer transition-colors"
                                onClick={() => onViewGuestDetails?.(guest)}
                            >
                                {guest.name}
                            </span>
                            {record.membership && (
                                <Tag color="blue" className="mr-1 text-[10px] px-1.5 py-0 rounded-full font-normal">
                                    {record.membership}
                                </Tag>
                            )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            {guest.phone && (
                                <span className="flex items-center gap-1 font-mono" dir="ltr">
                                    <Phone className="h-3 w-3" />
                                    <span>{guest.phone}</span>
                                </span>
                            )}
                            {guest.mil_code && (
                                <span className="flex items-center gap-1 font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">
                                    <Shield className="h-3 w-3 text-emerald-600" />
                                    <span>{guest.mil_code}</span>
                                </span>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            title: 'عدد الأفراد (الوجبات)',
            key: 'meals_count',
            width: 140,
            align: 'center',
            sorter: (a, b) => (a.meals_persons_count || 4) - (b.meals_persons_count || 4),
            render: (_, record) => {
                const count = record.meals_persons_count || 4;
                return (
                    <div className="inline-flex items-center gap-1 font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg px-2.5 py-1">
                        <UtensilsCrossed className="h-3.5 w-3.5" />
                        <span>{count} أفراد</span>
                    </div>
                );
            },
        },
        {
            title: 'تاريخ بداية الوجبات',
            key: 'meals_start_date',
            width: 130,
            align: 'center',
            render: (_, record) => {
                const s = record.meals_start_date || record.check_in;
                return (
                    <div className="flex items-center justify-center gap-1 text-xs font-mono">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span>{s}</span>
                    </div>
                );
            },
        },
        {
            title: 'تاريخ نهاية الوجبات',
            key: 'meals_end_date',
            width: 130,
            align: 'center',
            render: (_, record) => {
                const e = record.meals_end_date || record.check_out;
                return (
                    <div className="flex items-center justify-center gap-1 text-xs font-mono">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span>{e}</span>
                    </div>
                );
            },
        },
        {
            title: 'وجبات اليوم',
            key: 'todays_meals',
            width: 150,
            align: 'center',
            sorter: (a, b) => {
                const sA = a.meals_start_date || a.check_in;
                const eA = a.meals_end_date || a.check_out;
                const isA = todayStr >= sA && todayStr < eA ? (a.meals_persons_count || 4) : 0;

                const sB = b.meals_start_date || b.check_in;
                const eB = b.meals_end_date || b.check_out;
                const isB = todayStr >= sB && todayStr < eB ? (b.meals_persons_count || 4) : 0;

                return isA - isB;
            },
            render: (_, record) => {
                const s = record.meals_start_date ? dayjs(record.meals_start_date).format('YYYY-MM-DD') : record.check_in;
                const e = record.meals_end_date ? dayjs(record.meals_end_date).format('YYYY-MM-DD') : record.check_out;
                const count = record.meals_persons_count || 4;

                const isToday = todayStr >= s && todayStr < e;
                if (isToday) {
                    return (
                        <Tag
                            color="success"
                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-bold text-xs"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>{count} وجبات اليوم</span>
                        </Tag>
                    );
                }

                if (todayStr < s) {
                    return (
                        <Tag color="processing" className="rounded-full px-2.5 py-0.5 text-xs">
                            تبدأ في {s}
                        </Tag>
                    );
                }

                return (
                    <Tag color="default" className="rounded-full px-2.5 py-0.5 text-xs text-muted-foreground">
                        منتهية
                    </Tag>
                );
            },
        },
        {
            title: 'إجمالي وجبات الإقامة',
            key: 'total_meals',
            width: 150,
            align: 'center',
            render: (_, record) => {
                const persons = record.meals_persons_count || 4;
                const s = record.meals_start_date || record.check_in;
                const e = record.meals_end_date || record.check_out;
                const nights = record.meals_nights_count ?? Math.max(0, dayjs(e).diff(dayjs(s), 'day'));
                const total = persons * nights;
                return (
                    <div className="flex flex-col items-center text-xs">
                        <span className="font-bold text-foreground">{total} وجبة</span>
                        <span className="text-[10px] text-muted-foreground">({persons} أفراد × {nights} ليالٍ)</span>
                    </div>
                );
            },
        },
        {
            title: 'إجمالي التكلفة',
            dataIndex: 'meals_total_price',
            key: 'meals_total_price',
            width: 130,
            align: 'center',
            render: (price: number) => {
                const val = Number(price) || 0;
                return (
                    <div className="font-mono font-bold text-xs text-foreground">
                        {val.toLocaleString()} <span className="text-[10px] text-muted-foreground">ج.م</span>
                    </div>
                );
            },
        },
        {
            title: 'الإجراءات',
            key: 'actions',
            width: 100,
            align: 'center',
            render: (_, record) => (
                <Space size="small">
                    {onEdit && (
                        <Tooltip title="تعديل الحجز والوجبات">
                            <Button
                                type="text"
                                size="small"
                                icon={<Edit2 className="h-4 w-4 text-blue-500" />}
                                onClick={() => onEdit(record)}
                            />
                        </Tooltip>
                    )}
                    {record.guest && onViewGuestDetails && (
                        <Tooltip title="عرض ملف النزيل">
                            <Button
                                type="text"
                                size="small"
                                icon={<Eye className="h-4 w-4 text-stone-500" />}
                                onClick={() => onViewGuestDetails(record.guest!)}
                            />
                        </Tooltip>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div className="space-y-4" dir="rtl">
            {/* Top KPI Metrics Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Card
                    size="small"
                    className="border-amber-200 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/70 to-amber-100/30 dark:from-amber-950/30 dark:to-amber-900/10 shadow-xs"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                                وجبات اليوم المستحقة
                            </div>
                            <div className="text-2xl font-black text-amber-900 dark:text-amber-200 mt-0.5">
                                {metrics.todayMealsCount}{' '}
                                <span className="text-xs font-semibold text-amber-700/80">وجبة</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                                تاريخ اليوم: {todayStr}
                            </div>
                        </div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <UtensilsCrossed className="h-6 w-6" />
                        </div>
                    </div>
                </Card>

                <Card
                    size="small"
                    className="border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/70 to-emerald-100/30 dark:from-emerald-950/30 dark:to-emerald-900/10 shadow-xs"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                                الغرف المستفيدة اليوم
                            </div>
                            <div className="text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-0.5">
                                {metrics.todayUnitsCount}{' '}
                                <span className="text-xs font-semibold text-emerald-700/80">وحدة</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                                من إجمالي {metrics.reservationsCount} حجز بالوجبات
                            </div>
                        </div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <DoorOpen className="h-6 w-6" />
                        </div>
                    </div>
                </Card>

                <Card
                    size="small"
                    className="border-sky-200 dark:border-sky-900/60 bg-gradient-to-br from-sky-50/70 to-sky-100/30 dark:from-sky-950/30 dark:to-sky-900/10 shadow-xs"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-[11px] font-medium text-sky-700 dark:text-sky-400">
                                إجمالي وجبات الفترة
                            </div>
                            <div className="text-2xl font-black text-sky-900 dark:text-sky-200 mt-0.5">
                                {metrics.totalMealsCount}{' '}
                                <span className="text-xs font-semibold text-sky-700/80">وجبة</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                                كامل أيام الإقامة للحجوزات
                            </div>
                        </div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                            <Calendar className="h-6 w-6" />
                        </div>
                    </div>
                </Card>

                <Card
                    size="small"
                    className="border-purple-200 dark:border-purple-900/60 bg-gradient-to-br from-purple-50/70 to-purple-100/30 dark:from-purple-950/30 dark:to-purple-900/10 shadow-xs"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-[11px] font-medium text-purple-700 dark:text-purple-400">
                                إجمالي تكلفة الوجبات
                            </div>
                            <div className="text-2xl font-black text-purple-900 dark:text-purple-200 mt-0.5 font-mono">
                                {metrics.totalMealsPrice.toLocaleString()}{' '}
                                <span className="text-xs font-semibold text-purple-700/80 font-sans">ج.م</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                                بسعر 450 ج.م للفرد / ليلة
                            </div>
                        </div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            <Sparkles className="h-6 w-6" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Table Card with Action Header */}
            <Card size="small" className="shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Input
                            placeholder="بحث في كشف الوجبات (اسم، هاتف، وحدة)..."
                            prefix={<Search className="h-4 w-4 text-muted-foreground" />}
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            allowClear
                            className="w-full sm:w-64 text-xs"
                        />
                        <Button
                            type={todayOnlyFilter ? 'primary' : 'default'}
                            onClick={() => setTodayOnlyFilter((prev) => !prev)}
                            className={todayOnlyFilter ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : ''}
                        >
                            <span>وجبات اليوم فقط ({metrics.todayMealsCount})</span>
                        </Button>
                        <Tag color="blue" className="text-xs font-semibold px-2.5 py-0.5 rounded-full m-0">
                            عرض كافة النتائج ({mealsReservations.length})
                        </Tag>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button
                            type="primary"
                            icon={<Printer className="h-4 w-4" />}
                            onClick={() => setIsPrintOpen(true)}
                            className="bg-amber-600 hover:bg-amber-500"
                        >
                            طباعة كشف الوجبات
                        </Button>
                    </div>
                </div>

                <Table<Reservation>
                    dataSource={mealsReservations}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    bordered
                    size="middle"
                    pagination={false}
                    scroll={{ x: 1200 }}
                    locale={{
                        emptyText: (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={
                                    <div className="space-y-1">
                                        <div className="font-semibold text-stone-600 dark:text-stone-400">
                                            لا توجد حجوزات متضمنة وجبات غذائية في هذه الفترة أو التصفية
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            يمكنك تفعيل الوجبات عند إنشاء أو تعديل الحجز في أي قطاع
                                        </div>
                                    </div>
                                }
                            />
                        ),
                    }}
                    className="overflow-hidden rounded-lg"
                />
            </Card>

            {/* Meals Dedicated Print Dialog */}
            <MealsPrintDialog
                open={isPrintOpen}
                onOpenChange={setIsPrintOpen}
                reservations={mealsReservations}
                units={units}
                datePreset={datePreset}
                startDate={startDate}
                endDate={endDate}
                search={localSearch || initialSearch}
            />
        </div>
    );
}
