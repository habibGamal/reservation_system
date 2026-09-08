import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePage } from "@inertiajs/react";
import { Button, Checkbox, Input, Segmented, Select, Tag } from "antd";
import { ActiveView, Reservation, Sector, SharedProps, Unit } from "@/types/reservation";
import { ResortPeriod } from "@/lib/period-utils";
import {
    BedDouble,
    Building2,
    Calendar,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Grid,
    Layers,
    LayoutList,
    Loader2,
    LogOut,
    RotateCcw,
    Search,
    UtensilsCrossed,
} from "lucide-react";

export interface ReservationFilterToolbarProps {
    // View mode
    activeView: ActiveView;
    onSwitchView: (view: ActiveView) => void;

    // Search
    search: string;
    onSearchChange: (val: string) => void;
    onSearchSubmit?: (e: React.FormEvent) => void;
    isLoading?: boolean;

    // Status (supports both multi-select array and legacy single string)
    statusFilter?: string;
    statusFilters?: string[];
    onStatusFilterChange?: (status: string) => void;
    onStatusFiltersChange?: (statuses: string[]) => void;
    onToggleStatus?: (status: string) => void;
    statusCounts: Record<string, number>;
    reservations?: Reservation[];

    // Sector (supports both multi-select array and legacy single string)
    sectorId?: string;
    sectorIds?: string[];
    onSectorIdChange?: (sectorId: string) => void;
    onSectorIdsChange?: (sectorIds: string[]) => void;
    onToggleSector?: (sectorId: string) => void;
    sectors: Sector[];
    units: Unit[];

    // Payment
    paymentStatus: string;
    onPaymentStatusChange: (val: string) => void;

    // Date & Periods
    datePreset: string;
    datePresetSelectValue: string;
    onDatePresetSelectChange: (val: string) => void;
    currentPeriod: ResortPeriod;
    nextPeriod: ResortPeriod;
    prevPeriod: ResortPeriod;
    periodsList: ResortPeriod[];
    activePeriod: ResortPeriod | null;
    onStepPrevPeriod: () => void;
    onStepNextPeriod: () => void;
    onJumpToCurrentPeriod: () => void;

    // Custom date range
    startDate: string;
    endDate: string;
    onStartDateChange: (val: string) => void;
    onEndDateChange: (val: string) => void;
    onApplyCustomDates: () => void;

    // Reset
    isFilterActive: boolean;
    onResetFilters: () => void;
}

export function ReservationFilterToolbar({
    activeView,
    onSwitchView,
    search,
    onSearchChange,
    onSearchSubmit,
    statusFilter,
    statusFilters,
    onStatusFilterChange,
    onStatusFiltersChange,
    onToggleStatus,
    statusCounts,
    sectorId,
    sectorIds,
    onSectorIdChange,
    onSectorIdsChange,
    onToggleSector,
    sectors,
    units,
    paymentStatus,
    onPaymentStatusChange,
    datePreset,
    datePresetSelectValue,
    onDatePresetSelectChange,
    currentPeriod,
    nextPeriod,
    prevPeriod,
    periodsList,
    activePeriod,
    onStepPrevPeriod,
    onStepNextPeriod,
    onJumpToCurrentPeriod,
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    onApplyCustomDates,
    isFilterActive,
    onResetFilters,
    isLoading = false,
}: ReservationFilterToolbarProps) {
    const { auth } = usePage<SharedProps>().props;
    const user = auth?.user;

    const allowedSectors = useMemo(() => {
        if (user?.has_full_sector_access) return sectors;
        const allowed = user?.allowed_sector_ids ?? [];
        return sectors.filter((s) => allowed.includes(s.id));
    }, [sectors, user?.has_full_sector_access, user?.allowed_sector_ids]);

    const allowedUnits = useMemo(() => {
        if (user?.has_full_sector_access) return units;
        const allowed = user?.allowed_sector_ids ?? [];
        return units.filter((u) => allowed.includes(u.sector_id));
    }, [units, user?.has_full_sector_access, user?.allowed_sector_ids]);

    // Search input debouncer (wait for the user to write, then search)
    const [inputValue, setInputValue] = useState(search);
    const [isDebouncing, setIsDebouncing] = useState(false);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Synchronize local input state when external search changes (e.g., reset filters)
    useEffect(() => {
        setInputValue(search);
        setIsDebouncing(false);
    }, [search]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    const handleSearchInputChange = (newVal: string) => {
        setInputValue(newVal);

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // If completely cleared via clear button, trigger search immediately
        if (newVal.trim() === "") {
            setIsDebouncing(false);
            onSearchChange("");
            return;
        }

        setIsDebouncing(true);
        debounceTimerRef.current = setTimeout(() => {
            setIsDebouncing(false);
            onSearchChange(newVal);
        }, 400); // 400ms debounce wait time
    };

    const handleSearchFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        setIsDebouncing(false);
        onSearchChange(inputValue);
        if (onSearchSubmit) {
            onSearchSubmit(e);
        }
    };

    // Multi-select status and sector state derivation
    const effectiveStatuses = useMemo<string[]>(() => {
        if (statusFilters !== undefined) {
            return statusFilters.filter((s) => s && s !== "all");
        }
        if (statusFilter && statusFilter !== "all") {
            return statusFilter.split(",").map((s) => s.trim()).filter(Boolean);
        }
        return [];
    }, [statusFilters, statusFilter]);

    const effectiveSectorIds = useMemo<string[]>(() => {
        if (sectorIds !== undefined) {
            return sectorIds.map(String).filter((id) => id && id !== "all");
        }
        if (sectorId && sectorId !== "all") {
            return sectorId.split(",").map((id) => id.trim()).filter(Boolean);
        }
        return [];
    }, [sectorIds, sectorId]);

    // Status items configuration with semantic styling
    const statusItems = useMemo(
        () => [
            {
                key: "تم التسكين",
                label: "تم التسكين",
                icon: <CheckCircle2 className="h-3.5 w-3.5" />,
                count: statusCounts["تم التسكين"] ?? 0,
                activeClass:
                    "bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30 font-semibold shadow-xs",
                inactiveHover:
                    "hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-700 dark:hover:text-emerald-300",
                badgeActive:
                    "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200",
            },
            {
                key: "ثابت",
                label: "ثابت",
                icon: <BedDouble className="h-3.5 w-3.5" />,
                count: statusCounts["ثابت"] ?? 0,
                activeClass:
                    "bg-blue-500/15 border-blue-500/50 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/30 font-semibold shadow-xs",
                inactiveHover:
                    "hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-700 dark:hover:text-blue-300",
                badgeActive:
                    "bg-blue-500/20 text-blue-800 dark:text-blue-200",
            },
            {
                key: "انتظار",
                label: "قائمة الانتظار",
                icon: <Clock className="h-3.5 w-3.5" />,
                count: statusCounts["انتظار"] ?? 0,
                activeClass:
                    "bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30 font-semibold shadow-xs",
                inactiveHover:
                    "hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-700 dark:hover:text-amber-300",
                badgeActive:
                    "bg-amber-500/20 text-amber-800 dark:text-amber-200",
            },
            {
                key: "غادر",
                label: "غادر",
                icon: <LogOut className="h-3.5 w-3.5" />,
                count: statusCounts["غادر"] ?? 0,
                activeClass:
                    "bg-red-500/15 border-red-500/50 text-red-700 dark:text-red-300 ring-1 ring-red-500/30 font-semibold shadow-xs",
                inactiveHover:
                    "hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-700 dark:hover:text-red-300",
                badgeActive: "bg-red-500/20 text-red-800 dark:text-red-200",
            },
        ],
        [statusCounts],
    );

    const handleToggleStatusItem = (statusKey: string) => {
        if (onToggleStatus) {
            onToggleStatus(statusKey);
            return;
        }
        if (statusKey === "all") {
            if (onStatusFiltersChange) onStatusFiltersChange([]);
            else if (onStatusFilterChange) onStatusFilterChange("all");
            return;
        }
        const exists = effectiveStatuses.includes(statusKey);
        const next = exists
            ? effectiveStatuses.filter((s) => s !== statusKey)
            : [...effectiveStatuses, statusKey];
        if (onStatusFiltersChange) {
            onStatusFiltersChange(next);
        } else if (onStatusFilterChange) {
            onStatusFilterChange(next.length > 0 ? next.join(",") : "all");
        }
    };

    const handleToggleSectorItem = (secId: string) => {
        if (onToggleSector) {
            onToggleSector(secId);
            return;
        }
        if (secId === "all") {
            if (onSectorIdsChange) onSectorIdsChange([]);
            else if (onSectorIdChange) onSectorIdChange("all");
            return;
        }
        const exists = effectiveSectorIds.includes(secId);
        const next = exists
            ? effectiveSectorIds.filter((id) => id !== secId)
            : [...effectiveSectorIds, secId];
        if (onSectorIdsChange) {
            onSectorIdsChange(next);
        } else if (onSectorIdChange) {
            onSectorIdChange(next.length > 0 ? next.join(",") : "all");
        }
    };

    const handleStatusGroupChange = (checkedValues: any[]) => {
        const clean = (checkedValues || []).map(String).filter((s) => s && s !== "all");
        if (onStatusFiltersChange) {
            onStatusFiltersChange(clean);
        } else if (onStatusFilterChange) {
            onStatusFilterChange(clean.length > 0 ? clean.join(",") : "all");
        }
    };

    const handleSectorGroupChange = (checkedValues: any[]) => {
        const clean = (checkedValues || []).map(String).filter((id) => id && id !== "all");
        if (onSectorIdsChange) {
            onSectorIdsChange(clean);
        } else if (onSectorIdChange) {
            onSectorIdChange(clean.length > 0 ? clean.join(",") : "all");
        }
    };

    const handleSectorDropdownChange = (vals: string[]) => {
        const clean = (vals || []).filter((id) => id && id !== "all");
        if (onSectorIdsChange) {
            onSectorIdsChange(clean);
        } else if (onSectorIdChange) {
            onSectorIdChange(clean.length > 0 ? clean.join(",") : "all");
        }
    };

    const handleSelectAllSectors = () => {
        const allIds = allowedSectors.map((s) => String(s.id));
        if (onSectorIdsChange) {
            onSectorIdsChange(allIds);
        } else if (onSectorIdChange) {
            onSectorIdChange(allIds.join(","));
        }
    };

    return (
        <div className="p-3 sm:p-4 rounded-xl border bg-card shadow-xs space-y-3 sm:space-y-3.5">
            {/* Row 1: 3-View Switcher Tabs + Search Input */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                {/* 3 View Modes Switcher via Ant Design Segmented */}
                <div className="w-full lg:w-auto overflow-x-auto max-w-full pb-1 scrollbar-none">
                    <Segmented<ActiveView>
                        value={activeView}
                        onChange={(val) => onSwitchView(val)}
                        className="min-w-max"
                        options={[
                            {
                                value: "table",
                                icon: <LayoutList className="h-4 w-4" />,
                                label: "جدول الحجوزات",
                            },
                            {
                                value: "matrix",
                                icon: <Grid className="h-4 w-4" />,
                                label: "مصفوفة القطاعات",
                            },
                            {
                                value: "meals",
                                icon: <UtensilsCrossed className="h-4 w-4" />,
                                label: "كشف الوجبات",
                            },
                        ]}
                    />
                </div>

                {/* Quick Search via Ant Design Input with debounce bouncer */}
                <form
                    onSubmit={handleSearchFormSubmit}
                    className="flex items-center gap-2 w-full lg:w-auto flex-1 max-w-md"
                >
                    <Input
                        placeholder="بحث باسم النزيل، الهاتف، الكود العسكري، الوحدة، أو الملاحظات..."
                        value={inputValue}
                        onChange={(e) => handleSearchInputChange(e.target.value)}
                        prefix={
                            isDebouncing || isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            ) : (
                                <Search className="h-4 w-4 text-muted-foreground" />
                            )
                        }
                        allowClear
                        className="w-full text-xs"
                    />
                    <Button
                        htmlType="submit"
                        loading={isLoading || isDebouncing}
                    >
                        بحث
                    </Button>
                </form>
            </div>

            {/* Row 2: Status Filter via Ant Design Checkbox */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2.5 border-t text-xs">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground shrink-0 ml-1">
                        <Layers className="h-3.5 w-3.5 text-primary" />
                        <span>الحالة:</span>
                    </div>

                    {/* All Statuses Checkbox */}
                    <Checkbox
                        checked={effectiveStatuses.length === 0}
                        indeterminate={
                            effectiveStatuses.length > 0 &&
                            effectiveStatuses.length < statusItems.length
                        }
                        onChange={() => handleToggleStatusItem("all")}
                        className="text-xs select-none font-semibold"
                    >
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                            <span>كافة الحالات</span>
                            <span className="text-[11px] text-muted-foreground font-semibold">
                                ({statusCounts.all ?? 0})
                            </span>
                        </span>
                    </Checkbox>

                    <div className="h-3.5 w-px bg-border/60 hidden sm:block" />

                    {/* Status Checkbox Group */}
                    <Checkbox.Group
                        value={effectiveStatuses}
                        onChange={handleStatusGroupChange}
                        className="flex flex-wrap items-center gap-3 text-xs"
                    >
                        {statusItems.map((st) => (
                            <Checkbox
                                key={st.key}
                                value={st.key}
                                className="text-xs select-none"
                            >
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                                    {st.icon}
                                    <span>{st.label}</span>
                                    <span className="text-[11px] text-muted-foreground font-semibold">
                                        ({st.count})
                                    </span>
                                </span>
                            </Checkbox>
                        ))}
                    </Checkbox.Group>
                </div>

                {/* Status Multi-Select Summary / Clear */}
                {effectiveStatuses.length > 0 && (
                    <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                        <Tag
                            color="processing"
                            className="text-[11px] rounded-full px-2 py-0 m-0"
                        >
                            تم تحديد {effectiveStatuses.length}
                        </Tag>
                        <Button
                            type="text"
                            size="small"
                            onClick={() => handleToggleStatusItem("all")}
                            className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                        >
                            إلغاء التحديد
                        </Button>
                    </div>
                )}
            </div>

            {/* Row 3: Sector Filter via Ant Design Checkbox */}
            <div className="flex flex-col gap-2.5 pt-2.5 border-t text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground shrink-0 ml-1">
                            <Building2 className="h-3.5 w-3.5 text-primary" />
                            <span>القطاع:</span>
                        </div>

                        {/* All Sectors Checkbox */}
                        <Checkbox
                            checked={effectiveSectorIds.length === 0}
                            indeterminate={
                                effectiveSectorIds.length > 0 &&
                                effectiveSectorIds.length < allowedSectors.length
                            }
                            onChange={() => handleToggleSectorItem("all")}
                            className="text-xs select-none font-semibold"
                        >
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                                <span>جميع القطاعات</span>
                                {allowedUnits && allowedUnits.length > 0 && (
                                    <span className="text-[11px] text-muted-foreground font-semibold">
                                        ({allowedUnits.length})
                                    </span>
                                )}
                            </span>
                        </Checkbox>

                        {/* Searchable Select for Quick Search among Sectors */}
                        <Select
                            mode="multiple"
                            size="small"
                            allowClear
                            placeholder="بحث واختيار قطاعات محددة..."
                            value={effectiveSectorIds}
                            onChange={handleSectorDropdownChange}
                            maxTagCount="responsive"
                            className="w-full sm:w-auto min-w-[200px] max-w-xs text-xs"
                            options={allowedSectors.map((sec) => ({
                                value: String(sec.id),
                                label: `${sec.name} (${sec.units?.length ?? 0} وحدة)`,
                            }))}
                        />
                    </div>

                    {/* Quick Action Indicators / Clear */}
                    <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                        {effectiveSectorIds.length > 0 ? (
                            <>
                                <Tag
                                    color="blue"
                                    className="text-[11px] rounded-full px-2 py-0 m-0"
                                >
                                    محدد {effectiveSectorIds.length} من {allowedSectors.length}
                                </Tag>
                                <Button
                                    type="text"
                                    size="small"
                                    onClick={() => handleToggleSectorItem("all")}
                                    className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                                >
                                    عرض الكل
                                </Button>
                            </>
                        ) : (
                            <Button
                                type="text"
                                size="small"
                                onClick={handleSelectAllSectors}
                                className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-primary"
                            >
                                تحديد كل القطاعات
                            </Button>
                        )}
                    </div>
                </div>

                {/* Individual Sector Checkbox Group */}
                <div className="overflow-x-auto pb-1 max-w-full">
                    <Checkbox.Group
                        value={effectiveSectorIds}
                        onChange={handleSectorGroupChange}
                        className="flex flex-wrap items-center gap-x-3.5 gap-y-2 text-xs"
                    >
                        {allowedSectors.map((sec) => (
                            <Checkbox
                                key={sec.id}
                                value={String(sec.id)}
                                className="text-xs select-none"
                            >
                                <span className="inline-flex items-center gap-1 text-xs font-medium">
                                    <span>{sec.name}</span>
                                    {sec.units && sec.units.length > 0 && (
                                        <span className="text-[11px] text-muted-foreground font-semibold">
                                            ({sec.units.length})
                                        </span>
                                    )}
                                </span>
                            </Checkbox>
                        ))}
                    </Checkbox.Group>
                </div>
            </div>

            {/* Row 4: Dates & Financial Filter Controls via Ant Design Select & Date Inputs */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t text-xs">
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    {/* Payment Status Filter */}
                    <Select
                        value={paymentStatus}
                        onChange={onPaymentStatusChange}
                        className="w-full sm:w-[130px] flex-1 sm:flex-none min-w-[110px]"
                        options={[
                            { value: "all", label: "كافة الحسابات" },
                            { value: "paid", label: "مسدد بالكامل" },
                            { value: "partial", label: "مسدد جزئياً" },
                            { value: "unpaid", label: "غير مسدد" },
                        ]}
                    />

                    {/* Date Preset Filter */}
                    <Select
                        value={datePresetSelectValue}
                        onChange={onDatePresetSelectChange}
                        className="w-full sm:w-[210px] flex-1 sm:flex-none min-w-[160px]"
                        options={[
                            { value: "all", label: "كافة الحجوزات (الكل)" },
                            {
                                label: "فترات المنتجع (جمعة - خميس)",
                                options: [
                                    {
                                        value: "current_period",
                                        label: `الفترة الحالية (${currentPeriod.shortLabel})`,
                                    },
                                    {
                                        value: "next_period",
                                        label: `الفترة القادمة (${nextPeriod.shortLabel})`,
                                    },
                                    {
                                        value: "prev_period",
                                        label: `الفترة السابقة (${prevPeriod.shortLabel})`,
                                    },
                                ],
                            },
                            {
                                label: "أفواج محددة",
                                options: periodsList.map((p) => ({
                                    value: `period_${p.startStr}`,
                                    label: p.label,
                                })),
                            },
                            {
                                value: "custom",
                                label: "فترة مخصصة (تاريخ حر)...",
                            },
                        ]}
                    />

                    {/* Active Period Quick Stepper & Indicator */}
                    {activePeriod && (
                        <div className="flex items-center justify-between sm:justify-start gap-1 bg-primary/5 border border-primary/20 px-1.5 py-0.5 rounded-lg text-xs w-full sm:w-auto max-w-full overflow-x-auto scrollbar-none">
                            <Button
                                type="text"
                                size="small"
                                onClick={onStepPrevPeriod}
                                title="الفوج السابق (الجمعة السابقة)"
                                icon={<ChevronRight className="h-3.5 w-3.5" />}
                                className="h-6 px-1.5 text-[11px] shrink-0"
                            >
                                السابق
                            </Button>

                            <div className="flex items-center gap-1 px-1 sm:px-1.5 border-x border-primary/20 text-[10px] sm:text-[11px] font-medium text-foreground shrink-0">
                                <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span className="whitespace-nowrap">
                                    {activePeriod.label}
                                </span>
                                <Tag
                                    color="blue"
                                    className="text-[10px] px-1 py-0 mr-1"
                                >
                                    6 ليالٍ
                                </Tag>
                            </div>

                            <Button
                                type="text"
                                size="small"
                                onClick={onStepNextPeriod}
                                title="الفوج القادم (الجمعة التالية)"
                                className="h-6 px-1.5 text-[11px] shrink-0"
                            >
                                <span>التالي</span>
                                <ChevronLeft className="h-3.5 w-3.5 inline-block mr-0.5" />
                            </Button>

                            {activePeriod.id !== currentPeriod.id && (
                                <Button
                                    type="link"
                                    size="small"
                                    onClick={onJumpToCurrentPeriod}
                                    title="العودة إلى الفترة الحالية"
                                    className="h-6 px-1 text-[10px] font-semibold shrink-0"
                                >
                                    (الحالية)
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Custom Date Inputs if 'custom' is selected */}
                    {datePreset === "custom" && (
                        <div className="flex flex-wrap items-center gap-1.5 bg-muted/40 p-1.5 rounded-md border text-xs w-full sm:w-auto">
                            <div className="flex items-center gap-1">
                                <span className="text-muted-foreground px-0.5">
                                    من:
                                </span>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) =>
                                        onStartDateChange(e.target.value)
                                    }
                                    className="h-7 text-xs w-28 sm:w-32"
                                />
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-muted-foreground px-0.5">
                                    إلى:
                                </span>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) =>
                                        onEndDateChange(e.target.value)
                                    }
                                    className="h-7 text-xs w-28 sm:w-32"
                                />
                            </div>
                            <Button
                                size="small"
                                onClick={onApplyCustomDates}
                                disabled={!startDate || !endDate}
                                className="h-7 text-xs px-2.5 font-medium flex-1 sm:flex-none"
                            >
                                تطبيق
                            </Button>
                        </div>
                    )}
                </div>

                {/* Reset Filters Action */}
                {isFilterActive && (
                    <Button
                        type="text"
                        danger
                        size="small"
                        onClick={onResetFilters}
                        icon={<RotateCcw className="h-3.5 w-3.5" />}
                        className="h-8 text-xs gap-1"
                    >
                        إعادة ضبط الفلاتر
                    </Button>
                )}
            </div>
        </div>
    );
}
