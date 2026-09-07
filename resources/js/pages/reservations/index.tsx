import React, { useMemo } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import { App, Button, Tooltip } from "antd";
import { Building2, FileSpreadsheet, Plus, Printer } from "lucide-react";
import {
    DashboardFilterState,
    Guest,
    KPIStats,
    Reservation,
    ReservationStatus,
    Sector,
    SharedProps,
    Unit,
} from "@/types/reservation";

// Wayfinder routes
import {
    destroy as destroyReservation,
    quickUpdate as quickUpdateReservation,
    updateStatus as updateReservationStatus,
} from "@/routes/reservations";
import { update as updateGuest } from "@/routes/guests";

// Subcomponents & dialogs
import { KpiDashboard } from "@/components/reservations/kpi-dashboard";
import { ReservationFilterToolbar } from "@/components/reservations/reservation-filter-toolbar";
import {
    ReservationAntdTableView,
    compareReservationsBySectorAndUnit,
} from "@/components/reservations/reservation-antd-table-view";
import { SectorMatrixView } from "@/components/reservations/sector-matrix-view";
import { MealsTableView } from "@/components/reservations/meals-table-view";
import { ReservationFormDialog } from "@/components/reservations/reservation-form-dialog";
import { PaymentDialog } from "@/components/reservations/payment-dialog";
import { GuestDetailsDrawer } from "@/components/reservations/guest-details-drawer";
import { ExcelImportDialog } from "@/components/reservations/excel-import-dialog";
import { ReservationPrintDialog } from "@/components/reservations/reservation-print-dialog";

// Custom hooks and utilities
import { useReservationFilters } from "@/components/reservations/hooks/use-reservation-filters";
import { useReservationModals } from "@/components/reservations/hooks/use-reservation-modals";
import { StatusCounts } from "@/types/reservation";

interface IndexProps {
    reservations: Reservation[];
    sectors: Sector[];
    units: Unit[];
    guests: Guest[];
    stats: KPIStats;
    status_counts: Record<string, number>;
    filters: DashboardFilterState;
}

export default function ReservationsIndex({
    reservations,
    sectors,
    units,
    guests,
    stats,
    status_counts,
    filters,
}: IndexProps) {
    const { modal } = App.useApp();
    const { auth } = usePage<SharedProps>().props;
    const user = auth?.user;

    const canCreateReservation = Boolean(
        user?.has_full_sector_access ||
            (user?.editable_sector_ids && user.editable_sector_ids.length > 0),
    );

    // Strictly scope sectors and units by user sector permissions (Option B)
    const scopedSectors = useMemo(() => {
        if (user?.has_full_sector_access) return sectors;
        const allowed = user?.allowed_sector_ids ?? [];
        return sectors.filter((s) => allowed.includes(s.id));
    }, [sectors, user?.has_full_sector_access, user?.allowed_sector_ids]);

    const scopedUnits = useMemo(() => {
        if (user?.has_full_sector_access) return units;
        const allowed = user?.allowed_sector_ids ?? [];
        return units.filter((u) => allowed.includes(u.sector_id));
    }, [units, user?.has_full_sector_access, user?.allowed_sector_ids]);

    // Encapsulated filter state & resort period navigation (triggers backend Inertia partial reloads)
    const filtersHook = useReservationFilters({
        initialFilters: filters,
        statusCounts: status_counts as unknown as StatusCounts,
    });

    // Encapsulated dialog & drawer modals state
    const modals = useReservationModals();

    // Keep active editing reservation synchronized with live reservations prop from backend
    const activeEditingReservation = useMemo(() => {
        if (!modals.editingReservation) return null;
        return reservations.find((r) => r.id === modals.editingReservation?.id) ?? modals.editingReservation;
    }, [reservations, modals.editingReservation]);

    // Reservations are filtered on the backend; maintain permanent display sort by sector and unit
    const sortedReservations = useMemo(() => {
        return [...reservations].sort(compareReservationsBySectorAndUnit);
    }, [reservations]);

    // Server actions via Wayfinder typed endpoints
    const handleStatusUpdate = (id: number, newStatus: ReservationStatus) => {
        router.patch(
            updateReservationStatus.url({ reservation: id }),
            { status: newStatus },
            { preserveScroll: true },
        );
    };

    const handleReservationUpdate = (
        id: number,
        data: Partial<Reservation>,
    ) => {
        router.patch(
            quickUpdateReservation.url({ reservation: id }),
            data as any,
            { preserveScroll: true },
        );
    };

    const handleGuestUpdate = (
        guestId: number,
        data: { name?: string; phone?: string; mil_code?: string | null },
    ) => {
        router.patch(updateGuest.url({ guest: guestId }), data, {
            preserveScroll: true,
        });
    };

    const handleDelete = (id: number) => {
        const targetRes = reservations.find((r) => r.id === id);
        const sectorId =
            targetRes?.unit?.sector_id ?? targetRes?.unit?.sector?.id;
        const canDelete =
            user?.has_full_sector_access ||
            (sectorId && user?.editable_sector_ids?.includes(sectorId));

        if (!canDelete) {
            modal.error({
                title: "غير مصرح",
                content:
                    "لا تملك صلاحية حذف الحجوزات في هذا القطاع (صلاحية عرض فقط).",
            });
            return;
        }

        modal.confirm({
            title: "حذف الحجز نهائياً",
            content:
                "هل أنت متأكد من رغبتك في حذف هذا الحجز نهائياً؟ لا يمكن التراجع عن هذا الإجراء.",
            okText: "نعم، احذف",
            cancelText: "إلغاء",
            okButtonProps: { danger: true },
            onOk: () => {
                router.delete(destroyReservation.url({ reservation: id }), {
                    preserveScroll: true,
                });
            },
        });
    };

    return (
        <>
            <Head title="إدارة الحجوزات والإقامة - منتجع النسور" />

            <div className="flex flex-col gap-5 p-4 md:p-6" dir="rtl">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Building2 className="h-7 w-7 text-primary" />
                            منظومة إدارة الحجوزات والإقامة
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            متابعة تسكين النزلاء، منع التعارض، تحصيل الدفعات،
                            ومراقبة الإشغال عبر كافة أرجاء المنتجع
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            onClick={modals.openPrintDialog}
                            icon={<Printer className="h-4 w-4 text-primary" />}
                        >
                            طباعة الكشف
                        </Button>
                        <Button
                            onClick={modals.openImportDialog}
                            icon={
                                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                            }
                        >
                            استيراد كشف إكسيل
                        </Button>
                        <Tooltip
                            title={
                                !canCreateReservation
                                    ? "لا تملك صلاحية حجز أو تعديل في أي قطاع (صلاحية عرض فقط)"
                                    : undefined
                            }
                        >
                            <Button
                                type="primary"
                                onClick={modals.openCreateDialog}
                                disabled={!canCreateReservation}
                                icon={<Plus className="h-4 w-4" />}
                            >
                                تسجيل حجز جديد
                            </Button>
                        </Tooltip>
                    </div>
                </div>

                {/* Live KPI Dashboard Cards with 1-Click Status Filter (calculated on backend) */}
                <KpiDashboard
                    stats={stats}
                    currentStatusFilter={
                        filtersHook.statusFilters.length === 1
                            ? (filtersHook.statusFilters[0] as ReservationStatus)
                            : null
                    }
                    currentStatusFilters={filtersHook.statusFilters as ReservationStatus[]}
                    onSelectStatusFilter={filtersHook.handleKpiStatusFilter}
                />

                {/* View Switcher Bar & Filters Toolbar */}
                <ReservationFilterToolbar
                    activeView={filtersHook.activeView}
                    onSwitchView={filtersHook.handleSwitchView}
                    search={filtersHook.search}
                    onSearchChange={filtersHook.setSearch}
                    onSearchSubmit={filtersHook.handleSearchSubmit}
                    isLoading={filtersHook.isLoading}
                    statusFilter={filtersHook.statusFilter}
                    statusFilters={filtersHook.statusFilters}
                    onStatusFilterChange={filtersHook.setStatusFilter}
                    onStatusFiltersChange={filtersHook.setStatusFilters}
                    onToggleStatus={filtersHook.handleToggleStatus}
                    statusCounts={filtersHook.statusCounts}
                    sectorId={filtersHook.sectorId}
                    sectorIds={filtersHook.sectorIds}
                    onSectorIdChange={filtersHook.setSectorId}
                    onSectorIdsChange={filtersHook.setSectorIds}
                    onToggleSector={filtersHook.handleToggleSector}
                    sectors={scopedSectors}
                    units={scopedUnits}
                    paymentStatus={filtersHook.paymentStatus}
                    onPaymentStatusChange={
                        filtersHook.handlePaymentStatusChange
                    }
                    datePreset={filtersHook.datePreset}
                    datePresetSelectValue={filtersHook.datePresetSelectValue}
                    onDatePresetSelectChange={
                        filtersHook.handleDatePresetSelectChange
                    }
                    currentPeriod={filtersHook.currentPeriod}
                    nextPeriod={filtersHook.nextPeriod}
                    prevPeriod={filtersHook.prevPeriod}
                    periodsList={filtersHook.periodsList}
                    activePeriod={filtersHook.activePeriod}
                    onStepPrevPeriod={filtersHook.handleStepPrevPeriod}
                    onStepNextPeriod={filtersHook.handleStepNextPeriod}
                    onJumpToCurrentPeriod={
                        filtersHook.handleJumpToCurrentPeriod
                    }
                    startDate={filtersHook.startDate}
                    endDate={filtersHook.endDate}
                    onStartDateChange={filtersHook.setStartDate}
                    onEndDateChange={filtersHook.setEndDate}
                    onApplyCustomDates={filtersHook.handleApplyCustomDates}
                    isFilterActive={filtersHook.isFilterActive}
                    onResetFilters={filtersHook.handleResetFilters}
                />

                {/* Dynamic View Rendering: Table & Sector Matrix */}
                {filtersHook.activeView === "table" && (
                    <ReservationAntdTableView
                        reservations={sortedReservations}
                        units={scopedUnits}
                        sectorId={filtersHook.sectorId}
                        sectorIds={filtersHook.sectorIds}
                        search={filtersHook.search}
                        statusFilter={filtersHook.statusFilter}
                        statusFilters={filtersHook.statusFilters}
                        paymentStatusFilter={filtersHook.paymentStatus}
                        onEdit={modals.openEditDialog}
                        onDelete={handleDelete}
                        onRecordPayment={modals.openPaymentDialog}
                        onViewGuestDetails={modals.openGuestDetailsDrawer}
                        onBookUnit={(unit) =>
                            modals.openForUnit(unit, filtersHook.startDate)
                        }
                        onPrint={modals.openPrintDialog}
                        loading={filtersHook.isLoading}
                    />
                )}

                {filtersHook.activeView === "matrix" && (
                    <SectorMatrixView
                        sectors={
                            filtersHook.sectorIds.length === 0
                                ? scopedSectors
                                : scopedSectors.filter((s) =>
                                    filtersHook.sectorIds.includes(String(s.id)),
                                )
                        }
                        reservations={sortedReservations}
                        isDateFiltered={
                            Boolean(
                                filtersHook.startDate && filtersHook.endDate,
                            ) || filtersHook.isFilterActive
                        }
                        onBookUnit={(unit) =>
                            modals.openForUnit(unit, filtersHook.startDate)
                        }
                        onEditReservation={modals.openEditDialog}
                    />
                )}

                {filtersHook.activeView === "meals" && (
                    <MealsTableView
                        reservations={sortedReservations}
                        units={scopedUnits}
                        sectors={scopedSectors}
                        sectorId={filtersHook.sectorId}
                        sectorIds={filtersHook.sectorIds}
                        search={filtersHook.search}
                        startDate={filtersHook.startDate}
                        endDate={filtersHook.endDate}
                        datePreset={filtersHook.datePreset}
                        loading={filtersHook.isLoading}
                        onEdit={modals.openEditDialog}
                        onViewGuestDetails={(guest) =>
                            modals.openGuestDetailsDrawer(guest.id)
                        }
                    />
                )}
            </div>

            {/* Reservation Form Dialog */}
            <ReservationFormDialog
                key={activeEditingReservation ? `edit-${activeEditingReservation.id}-${activeEditingReservation.updated_at ?? ''}` : 'new-reservation'}
                open={modals.dialogOpen}
                onOpenChange={modals.setDialogOpen}
                reservation={activeEditingReservation}
                defaultUnitId={modals.defaultUnitId}
                defaultCheckIn={modals.defaultCheckIn}
                units={scopedUnits}
                guests={guests}
                sectors={scopedSectors}
                existingReservations={reservations}
                onViewGuestDetails={(guest) =>
                    modals.openGuestDetailsDrawer(guest.id)
                }
            />

            {/* Guest Details Drawer */}
            <GuestDetailsDrawer
                open={modals.guestDetailsOpen}
                onOpenChange={modals.setGuestDetailsOpen}
                guestId={modals.selectedGuestIdForDrawer}
            />

            {/* Payment Dialog */}
            <PaymentDialog
                open={modals.paymentDialogOpen}
                onOpenChange={modals.setPaymentDialogOpen}
                reservation={modals.paymentReservation}
            />

            {/* Excel Import Dialog */}
            <ExcelImportDialog
                open={modals.importDialogOpen}
                onOpenChange={modals.setImportDialogOpen}
            />

            {/* Reservation Print Dialog */}
            <ReservationPrintDialog
                open={modals.printDialogOpen}
                onOpenChange={modals.setPrintDialogOpen}
                reservations={sortedReservations}
                units={scopedUnits}
                datePreset={filtersHook.datePreset}
                startDate={filtersHook.startDate}
                endDate={filtersHook.endDate}
                search={filtersHook.search}
                statusFilterLabel={
                    filtersHook.statusFilters.length > 0 && !filtersHook.statusFilters.includes('all')
                        ? filtersHook.statusFilters.join(', ')
                        : filtersHook.statusFilter !== 'all'
                        ? filtersHook.statusFilter
                        : undefined
                }
                sectorFilterLabel={
                    filtersHook.sectorIds.length > 0 && !filtersHook.sectorIds.includes('all')
                        ? scopedSectors
                              .filter((s) => filtersHook.sectorIds.includes(String(s.id)))
                              .map((s) => s.name)
                              .join(', ')
                        : filtersHook.sectorId !== 'all'
                        ? scopedSectors.find((s) => String(s.id) === String(filtersHook.sectorId))?.name
                        : undefined
                }
            />
        </>
    );
}

ReservationsIndex.layout = {
    breadcrumbs: [
        {
            title: "إدارة الحجوزات والإقامة",
            href: "/reservations?date_preset=current_period",
        },
    ],
};
