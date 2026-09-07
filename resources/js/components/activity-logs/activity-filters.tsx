import React, { useMemo } from 'react';
import { Button, Card, DatePicker, Input, Select, Tag } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {
    Building2,
    Calendar,
    CheckCircle,
    Clock,
    FileEdit,
    Filter,
    Layers,
    PlusCircle,
    RotateCcw,
    Search,
    Shield,
    Trash2,
    User,
    X,
} from 'lucide-react';
import type {
    ActivityFilterOptions,
    ActivityFilterState,
} from '@/types/activity-log';

const { RangePicker } = DatePicker;

interface ActivityFiltersProps {
    filters: ActivityFilterState;
    filterOptions: ActivityFilterOptions;
    onChange: (newFilters: Partial<ActivityFilterState>) => void;
    onReset: () => void;
    loading?: boolean;
}

export function ActivityFilters({
    filters,
    filterOptions,
    onChange,
    onReset,
    loading = false,
}: ActivityFiltersProps) {
    // Filter units based on currently selected sector
    const filteredUnits = useMemo(() => {
        if (!filters.sector_id) {
            return filterOptions.units;
        }
        return filterOptions.units.filter((u) => u.sector_id === filters.sector_id);
    }, [filters.sector_id, filterOptions.units]);

    // Handle sector change with cascading unit reset if necessary
    const handleSectorChange = (sectorId: number | null) => {
        const updates: Partial<ActivityFilterState> = { sector_id: sectorId };
        // If the currently selected unit does not belong to the new sector, reset it
        if (sectorId && filters.unit_id) {
            const unitBelongsToSector = filterOptions.units.some(
                (u) => u.id === filters.unit_id && u.sector_id === sectorId
            );
            if (!unitBelongsToSector) {
                updates.unit_id = null;
            }
        }
        onChange(updates);
    };

    // Calculate active filter count
    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.search) count++;
        if (filters.user_id) count++;
        if (filters.sector_id) count++;
        if (filters.unit_id) count++;
        if (filters.event) count++;
        if (filters.subject_type) count++;
        if (filters.start_date || filters.end_date) count++;
        return count;
    }, [filters]);

    // Date range value for Antd DatePicker
    const dateRangeValue: [Dayjs | null, Dayjs | null] | null = useMemo(() => {
        if (!filters.start_date && !filters.end_date) return null;
        return [
            filters.start_date ? dayjs(filters.start_date) : null,
            filters.end_date ? dayjs(filters.end_date) : null,
        ];
    }, [filters.start_date, filters.end_date]);

    // Date Presets Handler
    const handleDatePreset = (preset: 'today' | 'week' | 'month' | 'all') => {
        if (preset === 'all') {
            onChange({ start_date: '', end_date: '' });
            return;
        }
        const now = dayjs();
        if (preset === 'today') {
            const todayStr = now.format('YYYY-MM-DD');
            onChange({ start_date: todayStr, end_date: todayStr });
        } else if (preset === 'week') {
            onChange({
                start_date: now.subtract(7, 'day').format('YYYY-MM-DD'),
                end_date: now.format('YYYY-MM-DD'),
            });
        } else if (preset === 'month') {
            onChange({
                start_date: now.startOf('month').format('YYYY-MM-DD'),
                end_date: now.endOf('month').format('YYYY-MM-DD'),
            });
        }
    };

    return (
        <Card
            size="small"
            className="border border-border/70 shadow-xs bg-card"
        >
            <div className="space-y-3.5">
                {/* Top Row: Search, Presets, and Reset */}
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                    {/* Search Input */}
                    <div className="relative flex-1 max-w-md">
                        <Input
                            placeholder="بحث بالوصف، اسم النزيل، أو البريد..."
                            allowClear
                            prefix={<Search className="h-4 w-4 text-muted-foreground mr-1" />}
                            value={filters.search}
                            onChange={(e) => onChange({ search: e.target.value })}
                            className="w-full"
                        />
                    </div>

                    {/* Quick Date Presets & Reset */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-muted-foreground ml-1 font-medium hidden sm:inline">
                            فترة النشاط:
                        </span>
                        <Button
                            size="small"
                            type={!filters.start_date && !filters.end_date ? 'primary' : 'default'}
                            onClick={() => handleDatePreset('all')}
                            className="text-xs"
                        >
                            الكل
                        </Button>
                        <Button
                            size="small"
                            type={
                                filters.start_date === dayjs().format('YYYY-MM-DD') &&
                                filters.end_date === dayjs().format('YYYY-MM-DD')
                                    ? 'primary'
                                    : 'default'
                            }
                            onClick={() => handleDatePreset('today')}
                            className="text-xs"
                        >
                            اليوم
                        </Button>
                        <Button
                            size="small"
                            onClick={() => handleDatePreset('week')}
                            className="text-xs"
                        >
                            آخر 7 أيام
                        </Button>
                        <Button
                            size="small"
                            onClick={() => handleDatePreset('month')}
                            className="text-xs"
                        >
                            هذا الشهر
                        </Button>

                        {activeFiltersCount > 0 && (
                            <Button
                                size="small"
                                danger
                                icon={<RotateCcw className="h-3.5 w-3.5" />}
                                onClick={onReset}
                                className="text-xs mr-2"
                            >
                                مسح التصفية ({activeFiltersCount})
                            </Button>
                        )}
                    </div>
                </div>

                {/* Second Row: Deep Filters (User, Sector, Unit, Event, Subject, Range) */}
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 pt-1 border-t border-border/40">
                    {/* 1. User Filter */}
                    <div>
                        <label className="mb-1 block text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3 text-primary" />
                            المستخدم المنفذ
                        </label>
                        <Select
                            showSearch={{
                                filterOption: (input, option) =>
                                    String(option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
                            }}
                            allowClear
                            placeholder="جميع المستخدمين"
                            className="w-full text-xs"
                            value={filters.user_id || undefined}
                            onChange={(val) => onChange({ user_id: val ?? null })}
                            options={filterOptions.users.map((u) => ({
                                value: u.id,
                                label: `${u.name} (${u.email})`,
                            }))}
                        />
                    </div>

                    {/* 2. Sector Filter */}
                    <div>
                        <label className="mb-1 block text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-emerald-500" />
                            القطاع
                        </label>
                        <Select
                            showSearch={{
                                filterOption: (input, option) =>
                                    String(option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
                            }}
                            allowClear
                            placeholder="جميع القطاعات"
                            className="w-full text-xs"
                            value={filters.sector_id || undefined}
                            onChange={(val) => handleSectorChange(val ?? null)}
                            options={filterOptions.sectors.map((s) => ({
                                value: s.id,
                                label: s.name,
                            }))}
                        />
                    </div>

                    {/* 3. Unit Filter */}
                    <div>
                        <label className="mb-1 block text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                            <Layers className="h-3 w-3 text-blue-500" />
                            الوحدة السكنية
                        </label>
                        <Select
                            showSearch={{
                                filterOption: (input, option) =>
                                    String(option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
                            }}
                            allowClear
                            placeholder={filters.sector_id ? 'وحدات القطاع المحدد' : 'جميع الوحدات'}
                            className="w-full text-xs"
                            value={filters.unit_id || undefined}
                            onChange={(val) => onChange({ unit_id: val ?? null })}
                            options={filteredUnits.map((u) => ({
                                value: u.id,
                                label: u.name,
                            }))}
                        />
                    </div>

                    {/* 4. Action / Event Type */}
                    <div>
                        <label className="mb-1 block text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                            <FileEdit className="h-3 w-3 text-amber-500" />
                            نوع العملية
                        </label>
                        <Select
                            allowClear
                            placeholder="جميع العمليات"
                            className="w-full text-xs"
                            value={filters.event || undefined}
                            onChange={(val) => onChange({ event: val ?? '' })}
                            options={[
                                { value: 'created', label: 'إنشاء جديد (Created)' },
                                { value: 'updated', label: 'تعديل وتحديث (Updated)' },
                                { value: 'deleted', label: 'حذف (Deleted)' },
                            ]}
                        />
                    </div>

                    {/* 5. Subject Entity Type */}
                    <div>
                        <label className="mb-1 block text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                            <Shield className="h-3 w-3 text-purple-500" />
                            نوع العنصر المستهدف
                        </label>
                        <Select
                            allowClear
                            placeholder="جميع الكيانات"
                            className="w-full text-xs"
                            value={filters.subject_type || undefined}
                            onChange={(val) => onChange({ subject_type: val ?? '' })}
                            options={[
                                { value: 'reservation', label: 'حجوزات (Reservations)' },
                                { value: 'payment', label: 'مدفوعات مالية (Payments)' },
                                { value: 'unit', label: 'وحدات وغرف (Units)' },
                                { value: 'sector', label: 'قطاعات (Sectors)' },
                                { value: 'user', label: 'مستخدمين وصلاحيات (Users)' },
                                { value: 'guest', label: 'بيانات نزلاء (Guests)' },
                            ]}
                        />
                    </div>

                    {/* 6. Custom Date Range */}
                    <div>
                        <label className="mb-1 block text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-rose-500" />
                            نطاق التاريخ
                        </label>
                        <RangePicker
                            className="w-full text-xs"
                            placeholder={['من', 'إلى']}
                            value={dateRangeValue}
                            onChange={(dates) => {
                                if (!dates || !dates[0] || !dates[1]) {
                                    onChange({ start_date: '', end_date: '' });
                                } else {
                                    onChange({
                                        start_date: dates[0].format('YYYY-MM-DD'),
                                        end_date: dates[1].format('YYYY-MM-DD'),
                                    });
                                }
                            }}
                        />
                    </div>
                </div>
            </div>
        </Card>
    );
}
