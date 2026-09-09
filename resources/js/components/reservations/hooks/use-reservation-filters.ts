import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router } from "@inertiajs/react";
import { index as reservationsIndex } from "@/routes/reservations";
import {
    ActiveView,
    DashboardFilterState,
    ReservationStatus,
    StatusCounts,
} from "@/types/reservation";
import {
    ResortPeriod,
    buildPeriodFromFriday,
    generatePeriodsList,
    getCurrentPeriod,
    getNextPeriod,
    getPreviousPeriod,
    isFridayToThursdayPeriod,
    parseYMD,
} from "@/lib/period-utils";

export interface UseReservationFiltersProps {
    initialFilters: DashboardFilterState;
    statusCounts?: StatusCounts;
}

export function useReservationFilters({
    initialFilters,
    statusCounts: backendStatusCounts,
}: UseReservationFiltersProps) {
    // Memoized resort periods (Friday to Thursday, 6 nights)
    const currentPeriod = useMemo(() => getCurrentPeriod(), []);
    const nextPeriod = useMemo(
        () => getNextPeriod(currentPeriod),
        [currentPeriod],
    );
    const prevPeriod = useMemo(
        () => getPreviousPeriod(currentPeriod),
        [currentPeriod],
    );
    const periodsList = useMemo(() => generatePeriodsList(8, 16), []);

    // Helper to parse initial multi-filter arrays
    const parseInitialStatuses = (filters: DashboardFilterState): string[] => {
        if (Array.isArray(filters.statuses)) {
            return filters.statuses.map(String).filter((s) => s && s !== "all");
        }
        if (filters.status && (filters.status as string) !== "all") {
            return [filters.status];
        }
        return [];
    };

    const parseInitialSectorIds = (filters: DashboardFilterState): string[] => {
        if (Array.isArray(filters.sector_ids)) {
            return filters.sector_ids.map(String).filter((id) => id && id !== "all");
        }
        if (filters.sector_id && String(filters.sector_id) !== "all") {
            return [String(filters.sector_id)];
        }
        return [];
    };

    // Filter states initialized from server props
    const [activeView, setActiveView] = useState<ActiveView>(
        initialFilters.view === "table" ? "table" : (initialFilters.view === "meals" ? "meals" : "matrix"),
    );
    const [search, setSearch] = useState(initialFilters.search || "");
    const [sectorIds, setSectorIds] = useState<string[]>(() =>
        parseInitialSectorIds(initialFilters),
    );
    const [statusFilters, setStatusFilters] = useState<string[]>(() =>
        parseInitialStatuses(initialFilters),
    );
    const [paymentStatus, setPaymentStatus] = useState<string>(
        initialFilters.payment_status || "all",
    );
    const [datePreset, setDatePreset] = useState<string>(
        initialFilters.date_preset !== undefined && initialFilters.date_preset !== null
            ? initialFilters.date_preset
            : "current_period",
    );
    const [startDate, setStartDate] = useState(
        initialFilters.date_preset === "all"
            ? ""
            : (initialFilters.start_date || currentPeriod.startStr),
    );
    const [endDate, setEndDate] = useState(
        initialFilters.date_preset === "all"
            ? ""
            : (initialFilters.end_date || currentPeriod.endStr),
    );
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Track the last search value committed to backend to prevent race-condition overwrite loops
    const lastCommittedSearchRef = useRef<string>(initialFilters.search || "");

    // Keep ref to latest states for immediate invocations
    const stateRef = useRef({
        activeView,
        search,
        sectorIds,
        statusFilters,
        paymentStatus,
        datePreset,
        startDate,
        endDate,
    });

    useEffect(() => {
        stateRef.current = {
            activeView,
            search,
            sectorIds,
            statusFilters,
            paymentStatus,
            datePreset,
            startDate,
            endDate,
        };
    }, [
        activeView,
        search,
        sectorIds,
        statusFilters,
        paymentStatus,
        datePreset,
        startDate,
        endDate,
    ]);

    // Synchronize local states if server props change (e.g., browser back/forward or external navigation)
    useEffect(() => {
        const targetView: ActiveView =
            initialFilters.view === "table" ? "table" : (initialFilters.view === "meals" ? "meals" : "matrix");
        if (initialFilters.view && targetView !== stateRef.current.activeView) {
            setActiveView(targetView);
        }
        const serverSearch = initialFilters.search || "";
        if (serverSearch !== lastCommittedSearchRef.current) {
            lastCommittedSearchRef.current = serverSearch;
            setSearch(serverSearch);
        }
        const newSectorIds = parseInitialSectorIds(initialFilters);
        if (
            newSectorIds.length !== stateRef.current.sectorIds.length ||
            newSectorIds.some((id, i) => id !== stateRef.current.sectorIds[i])
        ) {
            setSectorIds(newSectorIds);
        }
        const newStatuses = parseInitialStatuses(initialFilters);
        if (
            newStatuses.length !== stateRef.current.statusFilters.length ||
            newStatuses.some((st, i) => st !== stateRef.current.statusFilters[i])
        ) {
            setStatusFilters(newStatuses);
        }
        const newPayment = initialFilters.payment_status || "all";
        if (newPayment !== stateRef.current.paymentStatus) {
            setPaymentStatus(newPayment);
        }
        if (initialFilters.date_preset !== undefined && initialFilters.date_preset !== null && initialFilters.date_preset !== stateRef.current.datePreset) {
            setDatePreset(initialFilters.date_preset);
        }
        const effectiveServerStartDate =
            initialFilters.date_preset === "all"
                ? ""
                : (initialFilters.start_date || (initialFilters.date_preset === "current_period" || !initialFilters.date_preset ? currentPeriod.startStr : ""));
        if (effectiveServerStartDate !== stateRef.current.startDate) {
            setStartDate(effectiveServerStartDate);
        }
        const effectiveServerEndDate =
            initialFilters.date_preset === "all"
                ? ""
                : (initialFilters.end_date || (initialFilters.date_preset === "current_period" || !initialFilters.date_preset ? currentPeriod.endStr : ""));
        if (effectiveServerEndDate !== stateRef.current.endDate) {
            setEndDate(effectiveServerEndDate);
        }
    }, [initialFilters, currentPeriod]);

    // Centralized Inertia partial reload fetcher
    const applyBackendFilters = useCallback(
        (overrides: {
            view?: ActiveView;
            search?: string;
            sector_id?: string | null;
            sector_ids?: string[] | null;
            status?: string | null;
            statuses?: string[] | null;
            payment_status?: string | null;
            date_preset?: string | null;
            start_date?: string | null;
            end_date?: string | null;
        }) => {
            const current = stateRef.current;
            const effectiveView = overrides.view !== undefined ? overrides.view : current.activeView;
            const effectiveSearch = overrides.search !== undefined ? overrides.search : current.search;
            const effectiveSectorIds =
                overrides.sector_ids !== undefined
                    ? (overrides.sector_ids || [])
                    : overrides.sector_id !== undefined
                    ? (overrides.sector_id && overrides.sector_id !== "all" ? [overrides.sector_id] : [])
                    : current.sectorIds;
            const effectiveStatuses =
                overrides.statuses !== undefined
                    ? (overrides.statuses || [])
                    : overrides.status !== undefined
                    ? (overrides.status && overrides.status !== "all" ? [overrides.status] : [])
                    : current.statusFilters;
            const effectivePaymentStatus = overrides.payment_status !== undefined ? overrides.payment_status : current.paymentStatus;
            const effectiveDatePreset = overrides.date_preset !== undefined ? overrides.date_preset : current.datePreset;
            const effectiveStartDate = overrides.start_date !== undefined ? overrides.start_date : current.startDate;
            const effectiveEndDate = overrides.end_date !== undefined ? overrides.end_date : current.endDate;

            const query: Record<string, string> = {};

            if (effectiveView && effectiveView !== "matrix") {
                query.view = effectiveView;
            }
            if (effectiveSearch && effectiveSearch.trim() !== "") {
                query.search = effectiveSearch.trim();
            }
            if (effectiveSectorIds.length > 0) {
                query.sector_id = effectiveSectorIds.join(",");
            }
            if (effectiveStatuses.length > 0) {
                query.status = effectiveStatuses.join(",");
            }
            if (effectivePaymentStatus && effectivePaymentStatus !== "all") {
                query.payment_status = effectivePaymentStatus;
            }
            if (effectiveDatePreset) {
                query.date_preset = effectiveDatePreset;
            }
            const omitDates =
                effectiveDatePreset === "current_period" ||
                effectiveDatePreset === "next_period" ||
                effectiveDatePreset === "prev_period" ||
                effectiveDatePreset === "all";

            if (!omitDates) {
                if (effectiveStartDate) {
                    query.start_date = effectiveStartDate;
                }
                if (effectiveEndDate) {
                    query.end_date = effectiveEndDate;
                }
            }

            if (overrides.search !== undefined) {
                lastCommittedSearchRef.current = overrides.search;
            }

            setIsLoading(true);

            router.get(reservationsIndex.url(), query, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ["reservations", "stats", "status_counts", "filters"],
                onFinish: () => {
                    setIsLoading(false);
                },
            });
        },
        [],
    );

    // On initial mount: if reservations page was opened without any date filter / preset,
    // automatically select and do ?date_preset=current_period
    const hasAutoSelectedPeriodRef = useRef(false);

    useEffect(() => {
        if (hasAutoSelectedPeriodRef.current) return;
        hasAutoSelectedPeriodRef.current = true;

        const isDateFilterSpecified =
            Boolean(initialFilters.date_preset) ||
            Boolean(initialFilters.start_date) ||
            Boolean(initialFilters.end_date);

        if (!isDateFilterSpecified) {
            router.get(
                reservationsIndex.url(),
                { date_preset: "current_period" },
                {
                    replace: true,
                    preserveState: true,
                    preserveScroll: true,
                },
            );
        }
    }, [initialFilters.date_preset]);

    // Dedicated search update handler (used by debounced inputs or direct updates)
    const handleSearchChange = useCallback(
        (val: string) => {
            setSearch(val);
            lastCommittedSearchRef.current = val;
            applyBackendFilters({ search: val });
        },
        [applyBackendFilters],
    );

    // Check if any filter is active
    const isFilterActive =
        search !== "" ||
        sectorIds.length > 0 ||
        statusFilters.length > 0 ||
        paymentStatus !== "all" ||
        datePreset !== "current_period" ||
        startDate !== currentPeriod.startStr ||
        endDate !== currentPeriod.endStr;

    // Detect active period if dates match a Friday-to-Thursday period
    const activePeriod = useMemo<ResortPeriod | null>(() => {
        if (!startDate || !endDate) return null;
        if (isFridayToThursdayPeriod(startDate, endDate)) {
            return buildPeriodFromFriday(parseYMD(startDate));
        }
        return null;
    }, [startDate, endDate]);

    // Derive current select dropdown value
    const datePresetSelectValue = useMemo(() => {
        if (datePreset === "all") return "all";
        if (datePreset === "custom") return "custom";
        if (startDate && endDate) {
            if (
                startDate === currentPeriod.startStr &&
                endDate === currentPeriod.endStr
            ) {
                return "current_period";
            }
            if (
                startDate === nextPeriod.startStr &&
                endDate === nextPeriod.endStr
            ) {
                return "next_period";
            }
            if (
                startDate === prevPeriod.startStr &&
                endDate === prevPeriod.endStr
            ) {
                return "prev_period";
            }
            return `period_${startDate}`;
        }
        return datePreset || "current_period";
    }, [datePreset, startDate, endDate, currentPeriod, nextPeriod, prevPeriod]);

    // Backend-provided status counts
    const statusCounts = useMemo<Record<string, number>>(() => {
        const defaults: Record<string, number> = {
            all: 0,
            "تم التسكين": 0,
            ثابت: 0,
            انتظار: 0,
            غادر: 0,
        };
        return backendStatusCounts ? { ...defaults, ...backendStatusCounts } : defaults;
    }, [backendStatusCounts]);

    // Handlers
    const handleSwitchView = (newView: ActiveView) => {
        setActiveView(newView);
        applyBackendFilters({ view: newView });
    };

    const handleSearchSubmit = (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }
        const currentSearch = stateRef.current.search;
        lastCommittedSearchRef.current = currentSearch;
        applyBackendFilters({ search: currentSearch });
    };

    const handleClearSearch = () => {
        setSearch("");
        lastCommittedSearchRef.current = "";
        applyBackendFilters({ search: "" });
    };

    const handleSectorIdsChange = (newSectorIds: string[]) => {
        const clean = (newSectorIds || []).filter((id) => id && id !== "all");
        setSectorIds(clean);
        applyBackendFilters({ sector_ids: clean });
    };

    const handleToggleSector = (id: string) => {
        if (id === "all") {
            setSectorIds([]);
            applyBackendFilters({ sector_ids: [] });
            return;
        }
        const exists = sectorIds.includes(id);
        const next = exists
            ? sectorIds.filter((item) => item !== id)
            : [...sectorIds, id];
        setSectorIds(next);
        applyBackendFilters({ sector_ids: next });
    };

    const handleStatusFiltersChange = (newStatuses: string[]) => {
        const clean = (newStatuses || []).filter((s) => s && s !== "all");
        setStatusFilters(clean);
        applyBackendFilters({ statuses: clean });
    };

    const handleToggleStatus = (status: string) => {
        if (status === "all") {
            setStatusFilters([]);
            applyBackendFilters({ statuses: [] });
            return;
        }
        const exists = statusFilters.includes(status);
        const next = exists
            ? statusFilters.filter((item) => item !== status)
            : [...statusFilters, status];
        setStatusFilters(next);
        applyBackendFilters({ statuses: next });
    };

    // Backward-compatible single-value setters
    const handleSectorChange = (newSectorId: string | string[]) => {
        if (Array.isArray(newSectorId)) {
            handleSectorIdsChange(newSectorId);
        } else if (newSectorId === "all" || !newSectorId) {
            handleSectorIdsChange([]);
        } else {
            handleSectorIdsChange([newSectorId]);
        }
    };

    const handleStatusFilterChange = (newStatus: string | string[]) => {
        if (Array.isArray(newStatus)) {
            handleStatusFiltersChange(newStatus);
        } else if (newStatus === "all" || !newStatus) {
            handleStatusFiltersChange([]);
        } else {
            handleStatusFiltersChange([newStatus]);
        }
    };

    const handlePaymentStatusChange = (val: string) => {
        setPaymentStatus(val);
        applyBackendFilters({ payment_status: val });
    };

    const handleDatePresetSelectChange = (val: string) => {
        if (val === "all") {
            setDatePreset("all");
            setStartDate("");
            setEndDate("");
            applyBackendFilters({
                date_preset: "all",
                start_date: "",
                end_date: "",
            });
        } else if (val === "current_period") {
            setDatePreset("current_period");
            setStartDate(currentPeriod.startStr);
            setEndDate(currentPeriod.endStr);
            applyBackendFilters({
                date_preset: "current_period",
                start_date: currentPeriod.startStr,
                end_date: currentPeriod.endStr,
            });
        } else if (val === "next_period") {
            setDatePreset("next_period");
            setStartDate(nextPeriod.startStr);
            setEndDate(nextPeriod.endStr);
            applyBackendFilters({
                date_preset: "next_period",
                start_date: nextPeriod.startStr,
                end_date: nextPeriod.endStr,
            });
        } else if (val === "prev_period") {
            setDatePreset("prev_period");
            setStartDate(prevPeriod.startStr);
            setEndDate(prevPeriod.endStr);
            applyBackendFilters({
                date_preset: "prev_period",
                start_date: prevPeriod.startStr,
                end_date: prevPeriod.endStr,
            });
        } else if (val.startsWith("period_")) {
            const pStart = val.replace("period_", "");
            const periodObj =
                periodsList.find((p) => p.startStr === pStart) ||
                buildPeriodFromFriday(parseYMD(pStart));
            setDatePreset("period");
            setStartDate(periodObj.startStr);
            setEndDate(periodObj.endStr);
            applyBackendFilters({
                date_preset: "period",
                start_date: periodObj.startStr,
                end_date: periodObj.endStr,
            });
        } else if (val === "custom") {
            setDatePreset("custom");
        }
    };

    const handleStepPrevPeriod = () => {
        const base = activePeriod || currentPeriod;
        const prev = getPreviousPeriod(base);
        setDatePreset("period");
        setStartDate(prev.startStr);
        setEndDate(prev.endStr);
        applyBackendFilters({
            date_preset: "period",
            start_date: prev.startStr,
            end_date: prev.endStr,
        });
    };

    const handleStepNextPeriod = () => {
        const base = activePeriod || currentPeriod;
        const next = getNextPeriod(base);
        setDatePreset("period");
        setStartDate(next.startStr);
        setEndDate(next.endStr);
        applyBackendFilters({
            date_preset: "period",
            start_date: next.startStr,
            end_date: next.endStr,
        });
    };

    const handleJumpToCurrentPeriod = () => {
        setDatePreset("current_period");
        setStartDate(currentPeriod.startStr);
        setEndDate(currentPeriod.endStr);
        applyBackendFilters({
            date_preset: "current_period",
            start_date: currentPeriod.startStr,
            end_date: currentPeriod.endStr,
        });
    };

    const handleApplyCustomDates = () => {
        if (startDate && endDate) {
            applyBackendFilters({
                date_preset: "custom",
                start_date: startDate,
                end_date: endDate,
            });
        }
    };

    const handleResetFilters = () => {
        setSearch("");
        lastCommittedSearchRef.current = "";
        setSectorIds([]);
        setStatusFilters([]);
        setPaymentStatus("all");
        setDatePreset("current_period");
        setStartDate(currentPeriod.startStr);
        setEndDate(currentPeriod.endStr);

        applyBackendFilters({
            search: "",
            sector_ids: [],
            statuses: [],
            payment_status: "all",
            date_preset: "current_period",
            start_date: currentPeriod.startStr,
            end_date: currentPeriod.endStr,
        });
    };

    // KPI card status toggle (multi-select friendly: clicking a card toggles it, null clears all)
    const handleKpiStatusFilter = (status: ReservationStatus | null) => {
        if (status === null) {
            setStatusFilters([]);
            applyBackendFilters({ statuses: [] });
        } else {
            handleToggleStatus(status);
        }
    };

    // Derived single-value aliases for backward compatibility
    const sectorId =
        sectorIds.length === 1
            ? sectorIds[0]
            : sectorIds.length === 0
            ? "all"
            : sectorIds.join(",");
    const statusFilter =
        statusFilters.length === 1
            ? statusFilters[0]
            : statusFilters.length === 0
            ? "all"
            : statusFilters.join(",");

    return {
        // States
        activeView,
        search,
        sectorId,
        sectorIds,
        statusFilter,
        statusFilters,
        paymentStatus,
        datePreset,
        startDate,
        endDate,
        isFilterActive,
        isLoading,

        // Period info
        currentPeriod,
        nextPeriod,
        prevPeriod,
        periodsList,
        activePeriod,
        datePresetSelectValue,
        statusCounts,

        // State setters
        setActiveView,
        setSearch: handleSearchChange,
        handleSearchChange,
        setSectorId: handleSectorChange,
        setSectorIds: handleSectorIdsChange,
        handleToggleSector,
        setStatusFilter: handleStatusFilterChange,
        setStatusFilters: handleStatusFiltersChange,
        handleToggleStatus,
        setPaymentStatus,
        setStartDate,
        setEndDate,

        // Handlers
        handleSwitchView,
        handleSearchSubmit,
        handleClearSearch,
        handlePaymentStatusChange,
        handleDatePresetSelectChange,
        handleStepPrevPeriod,
        handleStepNextPeriod,
        handleJumpToCurrentPeriod,
        handleApplyCustomDates,
        handleResetFilters,
        handleKpiStatusFilter,
    };
}

