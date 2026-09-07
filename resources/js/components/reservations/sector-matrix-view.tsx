import React, { useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { Button, Dropdown, Input, Segmented, Tag } from 'antd';
import type { MenuProps } from 'antd';
import {
    Reservation,
    ReservationStatus,
    Sector,
    SharedProps,
    Unit,
} from '@/types/reservation';
import {
    BedDouble,
    Building2,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    Clock,
    LogOut,
    MoreHorizontal,
    Plus,
    Search,
    User,
} from 'lucide-react';

interface SectorMatrixViewProps {
    sectors: Sector[];
    reservations?: Reservation[];
    isDateFiltered?: boolean;
    onBookUnit: (unit: Unit) => void;
    onEditReservation: (reservation: Reservation) => void;
}

type OccupancyFilter = 'all' | 'vacant' | 'occupied' | 'departed';

export function SectorMatrixView({
    sectors,
    reservations = [],
    isDateFiltered = false,
    onBookUnit,
    onEditReservation,
}: SectorMatrixViewProps) {
    const { auth } = usePage<SharedProps>().props;
    const user = auth?.user;

    const canEditSector = (sectorId: number) => {
        if (user?.has_full_sector_access) return true;
        return user?.editable_sector_ids?.includes(sectorId) ?? false;
    };

    const allowedSectors = useMemo(() => {
        if (user?.has_full_sector_access) return sectors;
        const allowed = user?.allowed_sector_ids ?? [];
        return sectors.filter((s) => allowed.includes(s.id));
    }, [sectors, user?.has_full_sector_access, user?.allowed_sector_ids]);

    const [searchTerm, setSearchTerm] = useState('');
    const [occupancyFilter, setOccupancyFilter] =
        useState<OccupancyFilter>('all');
    const [collapsedSectors, setCollapsedSectors] = useState<
        Record<number, boolean>
    >({});

    const toggleSector = (sectorId: number) => {
        setCollapsedSectors((prev) => ({
            ...prev,
            [sectorId]: !prev[sectorId],
        }));
    };

    const expandAll = () => setCollapsedSectors({});
    const collapseAll = () => {
        const collapsed: Record<number, boolean> = {};
        allowedSectors.forEach((s) => {
            collapsed[s.id] = true;
        });
        setCollapsedSectors(collapsed);
    };

function getResStatusTag(status: ReservationStatus | string) {
    switch (status) {
        case 'تم التسكين':
            return (
                <Tag
                    color="success"
                    className="m-0 shrink-0 px-1 py-0 text-[9px] sm:text-[10px] leading-tight"
                >
                    تم التسكين
                </Tag>
            );
        case 'ثابت':
            return (
                <Tag
                    color="processing"
                    className="m-0 shrink-0 px-1 py-0 text-[9px] sm:text-[10px] leading-tight"
                >
                    ثابت
                </Tag>
            );
        case 'انتظار':
            return (
                <Tag
                    color="warning"
                    className="m-0 shrink-0 px-1 py-0 text-[9px] sm:text-[10px] leading-tight"
                >
                    انتظار
                </Tag>
            );
        case 'غادر':
            return (
                <Tag
                    color="error"
                    className="m-0 shrink-0 px-1 py-0 text-[9px] sm:text-[10px] leading-tight"
                >
                    غادر
                </Tag>
            );
        default:
            return (
                <Tag className="m-0 shrink-0 px-1 py-0 text-[9px] sm:text-[10px] leading-tight">
                    {status}
                </Tag>
            );
    }
}

    // Map all reservations to their units, ordered by check_in ascending
    const unitReservationsMap = useMemo(() => {
        const map = new Map<number, Reservation[]>();

        reservations.forEach((res) => {
            if (!res.unit_id) return;
            const list = map.get(res.unit_id) || [];
            list.push(res);
            map.set(res.unit_id, list);
        });

        // Ensure reservations within each unit are sorted by check_in date ascending
        map.forEach((list) => {
            list.sort((a, b) =>
                (a.check_in ?? '').localeCompare(b.check_in ?? ''),
            );
        });

        return map;
    }, [reservations]);

    const getUnitReservations = (unit: Unit): Reservation[] => {
        return unitReservationsMap.get(unit.id) || [];
    };

    // Aggregated stats for the entire resort
    const resortStats = useMemo(() => {
        let totalUnits = 0;
        let checkedIn = 0;
        let confirmed = 0;
        let waiting = 0;
        let departed = 0;
        let vacant = 0;
        let multiBooking = 0;

        allowedSectors.forEach((sec) => {
            (sec.units || []).forEach((u) => {
                totalUnits++;
                const resList = unitReservationsMap.get(u.id) || [];
                if (resList.length === 0) {
                    vacant++;
                } else {
                    if (resList.length > 1) {
                        multiBooking++;
                    }
                    resList.forEach((r) => {
                        if (r.status === 'تم التسكين') checkedIn++;
                        else if (r.status === 'ثابت') confirmed++;
                        else if (r.status === 'انتظار') waiting++;
                        else if (r.status === 'غادر') departed++;
                    });
                }
            });
        });

        const occupiedTotal = checkedIn + confirmed + waiting;
        const occupancyRate =
            totalUnits > 0 ? Math.round((occupiedTotal / totalUnits) * 100) : 0;

        return {
            totalUnits,
            checkedIn,
            confirmed,
            waiting,
            departed,
            vacant,
            multiBooking,
            occupiedTotal,
            occupancyRate,
        };
    }, [allowedSectors, unitReservationsMap]);

    // Determine state of unit
    const getUnitStatusDetails = (unit: Unit) => {
        const resList = getUnitReservations(unit);
        if (resList.length === 0) {
            return {
                status: 'vacant' as const,
                label: 'شاغر',
                tagColor: 'default',
                cardBg: 'bg-card hover:bg-primary/5 border-border hover:border-primary/50',
                textColor: 'text-muted-foreground',
            };
        }

        if (resList.length >= 2) {
            return {
                status: 'multi' as const,
                label: resList.length === 2 ? 'حجزان' : `${resList.length} حجوزات`,
                tagColor: 'purple',
                cardBg: 'bg-purple-50/25 dark:bg-purple-950/20 border-purple-300 dark:border-purple-800 hover:border-purple-500',
                textColor: 'text-purple-700 dark:text-purple-300',
            };
        }

        const res = resList[0];
        switch (res.status) {
            case 'تم التسكين':
                return {
                    status: 'checked_in' as const,
                    label: 'تم التسكين',
                    tagColor: 'success',
                    cardBg: 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 hover:border-emerald-500',
                    textColor: 'text-emerald-700 dark:text-emerald-300',
                };
            case 'ثابت':
                return {
                    status: 'confirmed' as const,
                    label: 'ثابت',
                    tagColor: 'processing',
                    cardBg: 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800 hover:border-blue-500',
                    textColor: 'text-blue-700 dark:text-blue-300',
                };
            case 'انتظار':
                return {
                    status: 'waiting' as const,
                    label: 'انتظار',
                    tagColor: 'warning',
                    cardBg: 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 hover:border-amber-500',
                    textColor: 'text-amber-700 dark:text-amber-300',
                };
            case 'غادر':
                return {
                    status: 'departed' as const,
                    label: 'غادر',
                    tagColor: 'error',
                    cardBg: 'bg-red-50/50 dark:bg-red-950/20 border-red-300 dark:border-red-800 hover:border-red-500',
                    textColor: 'text-red-700 dark:text-red-300',
                };
            default:
                return {
                    status: 'vacant' as const,
                    label: 'شاغر',
                    tagColor: 'default',
                    cardBg: 'bg-card hover:bg-muted/40 border-border',
                    textColor: 'text-muted-foreground',
                };
        }
    };

    // Filter sectors and units
    const filteredSectors = useMemo(() => {
        return allowedSectors
            .map((sector) => {
                const units = (sector.units || []).filter((unit) => {
                    const resList = getUnitReservations(unit);

                    if (searchTerm) {
                        const term = searchTerm.toLowerCase();
                        const matchesName = (unit.name || '')
                            .toLowerCase()
                            .includes(term);
                        const matchesAnyGuest = resList.some(
                            (r) =>
                                (r.guest?.name || '')
                                    .toLowerCase()
                                    .includes(term) ||
                                (r.guest?.phone || '').includes(term) ||
                                (r.guest?.mil_code || '')
                                    .toLowerCase()
                                    .includes(term),
                        );
                        if (!matchesName && !matchesAnyGuest) return false;
                    }

                    if (occupancyFilter === 'vacant') {
                        if (resList.length > 0) return false;
                    } else if (occupancyFilter === 'occupied') {
                        if (
                            resList.length === 0 ||
                            resList.every((r) => r.status === 'غادر')
                        )
                            return false;
                    } else if (occupancyFilter === 'departed') {
                        if (
                            resList.length === 0 ||
                            !resList.some((r) => r.status === 'غادر')
                        )
                            return false;
                    }

                    return true;
                });

                return {
                    ...sector,
                    filteredUnits: units,
                };
            })
            .filter((sector) => sector.filteredUnits.length > 0 || !searchTerm);
    }, [allowedSectors, searchTerm, occupancyFilter, unitReservationsMap]);

    return (
        <div className="space-y-4" dir="rtl">
            {/* Top Toolbar & Legend Bar */}
            <div className="bg-card border-border/70 space-y-3 rounded-xl border p-4 shadow-xs">
                <div className="flex flex-col items-center justify-between gap-3 md:flex-row">
                    {/* Search within matrix */}
                    <Input
                        placeholder="تصفية بالوحدة أو اسم النزيل..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        prefix={
                            <Search className="text-muted-foreground h-4 w-4" />
                        }
                        allowClear
                        className="w-full md:w-80"
                    />

                    {/* Occupancy Filter Buttons */}
                    <div className="flex w-full items-center justify-start gap-1.5 md:w-auto">
                        <span className="text-muted-foreground ml-1 text-xs">
                            عرض:
                        </span>
                        <Segmented<OccupancyFilter>
                            value={occupancyFilter}
                            onChange={(val) => setOccupancyFilter(val)}
                            options={[
                                {
                                    value: 'all',
                                    label: `الكل (${resortStats.totalUnits})`,
                                },
                                {
                                    value: 'occupied',
                                    label: `المشغول (${resortStats.occupiedTotal})`,
                                },
                                {
                                    value: 'departed',
                                    label: `غادر (${resortStats.departed})`,
                                },
                                {
                                    value: 'vacant',
                                    label: `الشواغر (${resortStats.vacant})`,
                                },
                            ]}
                        />
                    </div>

                    {/* Expand / Collapse Controls */}
                    <div className="flex items-center gap-1">
                        <Button type="link" size="small" onClick={expandAll}>
                            فتح الكل
                        </Button>
                        <span className="text-muted-foreground/40">•</span>
                        <Button type="link" size="small" onClick={collapseAll}>
                            طي الكل
                        </Button>
                    </div>
                </div>

                {/* Legend Indicators */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-xs">
                    <div className="flex flex-wrap items-center gap-4">
                        <span className="text-muted-foreground font-semibold">
                            دليل الألوان:
                        </span>
                        <div className="flex items-center gap-1.5">
                            <span className="inline-block h-3 w-3 rounded-full bg-emerald-600 shadow-2xs" />
                            <span className="text-foreground font-medium">
                                تم التسكين ({resortStats.checkedIn})
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="inline-block h-3 w-3 rounded-full bg-blue-600 shadow-2xs" />
                            <span className="text-foreground font-medium">
                                ثابت ({resortStats.confirmed})
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="inline-block h-3 w-3 rounded-full bg-amber-500 shadow-2xs" />
                            <span className="text-foreground font-medium">
                                انتظار ({resortStats.waiting})
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="inline-block h-3 w-3 rounded-full bg-red-500 shadow-2xs" />
                            <span className="text-foreground font-medium">
                                غادر ({resortStats.departed})
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="bg-muted-foreground/30 inline-block h-3 w-3 rounded-full border" />
                            <span className="text-muted-foreground font-medium">
                                شاغر ({resortStats.vacant})
                            </span>
                        </div>
                        {resortStats.multiBooking > 0 && (
                            <div className="flex items-center gap-1.5">
                                <span className="inline-block h-3 w-3 rounded-full bg-purple-600 shadow-2xs" />
                                <span className="text-foreground font-medium">
                                    حجز متعدد ({resortStats.multiBooking})
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                            نسبة الإشغال العام:
                        </span>
                        <Tag color="blue" className="font-mono font-bold">
                            {resortStats.occupancyRate}%
                        </Tag>
                    </div>
                </div>
            </div>

            {/* Sectors Accordion List */}
            <div className="space-y-4">
                {filteredSectors.length === 0 ? (
                    <div className="bg-card text-muted-foreground rounded-xl border p-12 text-center">
                        لا توجد وحدات مطابقة لمعايير البحث في المصفوفة
                    </div>
                ) : (
                    filteredSectors.map((sector) => {
                        const isCollapsed = Boolean(
                            collapsedSectors[sector.id],
                        );
                        const allSectorUnits = sector.units || [];
                        const occupiedSectorUnits = allSectorUnits.filter(
                            (u) => {
                                const list = getUnitReservations(u);
                                return list.some((r) => r.status !== 'غادر');
                            },
                        ).length;
                        const departedSectorUnits = allSectorUnits.filter(
                            (u) => {
                                const list = getUnitReservations(u);
                                return (
                                    list.length > 0 &&
                                    list.every((r) => r.status === 'غادر')
                                );
                            },
                        ).length;
                        const vacantSectorUnits =
                            allSectorUnits.length -
                            occupiedSectorUnits -
                            departedSectorUnits;
                        const sectorRate =
                            allSectorUnits.length > 0
                                ? Math.round(
                                      (occupiedSectorUnits /
                                          allSectorUnits.length) *
                                          100,
                                  )
                                : 0;

                        return (
                            <div
                                key={sector.id}
                                className="bg-card border-border/80 shadow-xs overflow-hidden rounded-xl border transition-all duration-200"
                            >
                                {/* Sector Header */}
                                <div
                                    onClick={() => toggleSector(sector.id)}
                                    className="bg-muted/20 hover:bg-muted/40 flex cursor-pointer select-none items-center justify-between border-b p-3.5"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Building2 className="text-primary h-5 w-5" />
                                        <div>
                                            <h3 className="text-foreground flex items-center gap-2 font-bold text-sm">
                                                <span>{sector.name}</span>
                                                <span className="text-muted-foreground font-normal text-xs">
                                                    ({allSectorUnits.length}{' '}
                                                    وحدة)
                                                </span>
                                            </h3>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="text-muted-foreground hidden items-center gap-2 text-xs sm:flex">
                                            <span>
                                                مشغول:{' '}
                                                <strong className="text-foreground">
                                                    {occupiedSectorUnits}
                                                </strong>
                                            </span>
                                            {departedSectorUnits > 0 && (
                                                <>
                                                    <span className="text-muted-foreground/50">
                                                        •
                                                    </span>
                                                    <span>
                                                        غادر:{' '}
                                                        <strong className="text-red-600 dark:text-red-400">
                                                            {departedSectorUnits}
                                                        </strong>
                                                    </span>
                                                </>
                                            )}
                                            <span className="text-muted-foreground/50">
                                                •
                                            </span>
                                            <span>
                                                شاغر:{' '}
                                                <strong className="text-emerald-600 dark:text-emerald-400">
                                                    {vacantSectorUnits}
                                                </strong>
                                            </span>
                                        </div>

                                        <Tag
                                            color={
                                                sectorRate > 75
                                                    ? 'error'
                                                    : sectorRate > 40
                                                      ? 'processing'
                                                      : 'success'
                                            }
                                        >
                                            إشغال {sectorRate}%
                                        </Tag>

                                        <Button
                                            type="text"
                                            size="small"
                                            icon={
                                                isCollapsed ? (
                                                    <ChevronDown className="h-4 w-4" />
                                                ) : (
                                                    <ChevronUp className="h-4 w-4" />
                                                )
                                            }
                                        />
                                    </div>
                                </div>

                                {/* Units Matrix Grid */}
                                {!isCollapsed && (
                                    <div className="p-4">
                                        {(() => {
                                            const isSectorEditable = canEditSector(sector.id);

                                            return (
                                                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                                                    {sector.filteredUnits.map(
                                                        (unit) => {
                                                            const statusDetails =
                                                                getUnitStatusDetails(
                                                                    unit,
                                                                );
                                                            const resList =
                                                                getUnitReservations(
                                                                    unit,
                                                                );
                                                            const isVacant =
                                                                statusDetails.status ===
                                                                    'vacant' ||
                                                                resList.length === 0;
                                                            const isMulti =
                                                                resList.length >= 2;

                                                            if (isVacant) {
                                                                return (
                                                                    <div
                                                                        key={unit.id}
                                                                        onClick={() => {
                                                                            if (isSectorEditable) {
                                                                                onBookUnit(
                                                                                    unit,
                                                                                );
                                                                            }
                                                                        }}
                                                                        className={`shadow-2xs flex flex-col justify-between rounded-lg border p-2.5 transition-all duration-150 ${statusDetails.cardBg} ${isSectorEditable ? 'cursor-pointer' : 'cursor-default opacity-85'}`}
                                                                    >
                                                                        {/* Unit Name & Rooms */}
                                                                        <div className="flex items-start justify-between gap-1">
                                                                            <div>
                                                                                <span className="text-foreground font-bold text-sm">
                                                                                    {
                                                                                        unit.name
                                                                                    }
                                                                                </span>
                                                                                <span className="text-muted-foreground block text-[10px]">
                                                                                    {unit.rooms_count
                                                                                        ? `${unit.rooms_count} غرف`
                                                                                        : 'غرفة'}
                                                                                </span>
                                                                            </div>
                                                                            <Tag
                                                                                color={
                                                                                    statusDetails.tagColor
                                                                                }
                                                                                className="mr-0 px-1.5 py-0 text-[10px] inline-flex items-center gap-0.5"
                                                                            >
                                                                                {
                                                                                    statusDetails.label
                                                                                }
                                                                            </Tag>
                                                                        </div>

                                                                        {/* Quick book button or view-only note */}
                                                                        <div className="mt-2.5 flex min-h-[46px] flex-col justify-center">
                                                                            {isSectorEditable ? (
                                                                                <div className="bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center gap-1 rounded py-1.5 font-medium text-[11px] transition-colors">
                                                                                    <Plus className="h-3 w-3" />
                                                                                    <span>
                                                                                        حجز
                                                                                        فوري
                                                                                    </span>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="bg-muted/40 text-muted-foreground flex items-center justify-center gap-1 rounded py-1.5 font-medium text-[11px]">
                                                                                    <span>
                                                                                        عرض فقط
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }

                                                    if (isMulti) {
                                                        const r1 = resList[0];
                                                        const r2 = resList[1];
                                                        const extraReservations =
                                                            resList.slice(2);

                                                        const extraMenu:
                                                            | MenuProps
                                                            | undefined =
                                                            extraReservations.length >
                                                            0
                                                                ? {
                                                                      items: extraReservations.map(
                                                                          (
                                                                              extraRes,
                                                                          ) => ({
                                                                              key: String(
                                                                                  extraRes.id,
                                                                              ),
                                                                              label: (
                                                                                  <div
                                                                                      onClick={(
                                                                                          e,
                                                                                      ) => {
                                                                                          e.stopPropagation();
                                                                                          onEditReservation(
                                                                                              extraRes,
                                                                                          );
                                                                                      }}
                                                                                      className="flex items-center justify-between gap-3 py-1 text-xs"
                                                                                  >
                                                                                      <span className="font-semibold">
                                                                                          {extraRes
                                                                                              .guest
                                                                                              ?.name ||
                                                                                              `حجز #${extraRes.id}`}
                                                                                      </span>
                                                                                      <span className="text-muted-foreground font-mono text-[11px]">
                                                                                          {
                                                                                              extraRes.check_in
                                                                                          }{' '}
                                                                                          ←{' '}
                                                                                          {
                                                                                              extraRes.check_out
                                                                                          }
                                                                                      </span>
                                                                                      {getResStatusTag(
                                                                                          extraRes.status,
                                                                                      )}
                                                                                  </div>
                                                                              ),
                                                                          }),
                                                                      ),
                                                                  }
                                                                : undefined;

                                                        return (
                                                            <div
                                                                key={unit.id}
                                                                className={`shadow-2xs flex flex-col justify-between rounded-lg border p-2.5 transition-all duration-150 ${statusDetails.cardBg}`}
                                                            >
                                                                {/* Header: Unit Name, Room Count & Multi Tag */}
                                                                <div className="flex items-start justify-between gap-1 border-b border-purple-200/60 dark:border-purple-800/60 pb-1.5 mb-1.5">
                                                                    <div>
                                                                        <span className="text-foreground font-bold text-sm">
                                                                            {
                                                                                unit.name
                                                                            }
                                                                        </span>
                                                                        <span className="text-muted-foreground block text-[10px]">
                                                                            {unit.rooms_count
                                                                                ? `${unit.rooms_count} غرف`
                                                                                : 'غرفة'}
                                                                        </span>
                                                                    </div>

                                                                    <div className="flex items-center gap-1">
                                                                        <Tag
                                                                            color="purple"
                                                                            className="mr-0 px-1.5 py-0 text-[10px] font-medium"
                                                                        >
                                                                            {
                                                                                statusDetails.label
                                                                            }
                                                                        </Tag>
                                                                        {extraMenu && (
                                                                            <Dropdown
                                                                                menu={
                                                                                    extraMenu
                                                                                }
                                                                                trigger={[
                                                                                    'click',
                                                                                ]}
                                                                            >
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(
                                                                                        e,
                                                                                    ) =>
                                                                                        e.stopPropagation()
                                                                                    }
                                                                                    className="text-purple-600 hover:text-purple-800 dark:text-purple-400 p-0.5 rounded cursor-pointer hover:bg-purple-100/50 dark:hover:bg-purple-900/50"
                                                                                    title="عرض باقي الحجوزات"
                                                                                >
                                                                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                                                                </button>
                                                                            </Dropdown>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Divided Multi-Reservation Body */}
                                                                <div className="space-y-1">
                                                                    {/* Reservation 1 Tier */}
                                                                    <div
                                                                        onClick={(
                                                                            e,
                                                                        ) => {
                                                                            e.stopPropagation();
                                                                            onEditReservation(
                                                                                r1,
                                                                            );
                                                                        }}
                                                                        className="group/r1 hover:bg-background/90 dark:hover:bg-background/70 hover:shadow-2xs cursor-pointer rounded-md p-1.5 transition-all border border-transparent hover:border-purple-300/60 dark:hover:border-purple-700/60"
                                                                        title={`تعديل حجز: ${r1.guest?.name ?? 'النزيل الأول'}`}
                                                                    >
                                                                        <div className="flex items-start justify-between gap-1">
                                                                            <div className="flex items-start gap-1 min-w-0 flex-1">
                                                                                <User className="text-muted-foreground h-3 w-3 shrink-0 mt-0.5" />
                                                                                <span
                                                                                    className="break-words whitespace-normal font-bold sm:font-semibold text-foreground text-[10px] sm:text-[11px] leading-tight line-clamp-2"
                                                                                    title={r1.guest?.name}
                                                                                >
                                                                                    {r1
                                                                                        .guest
                                                                                        ?.name ||
                                                                                        'نزيل'}
                                                                                </span>
                                                                            </div>
                                                                            <div className="shrink-0 self-start">
                                                                                {getResStatusTag(
                                                                                    r1.status,
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-muted-foreground flex items-center gap-1 mt-0.5 text-[9px] sm:text-[10px] tracking-tight">
                                                                            <Clock className="h-2.5 w-2.5 shrink-0 opacity-70" />
                                                                            <span className="font-mono text-[9px] sm:text-[10px] whitespace-nowrap overflow-hidden text-ellipsis">
                                                                                {
                                                                                    r1.check_in
                                                                                }{' '}
                                                                                ←{' '}
                                                                                {
                                                                                    r1.check_out
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Subtle Clean Divider (NO text badge) */}
                                                                    <div className="border-t border-dashed border-purple-300/60 dark:border-purple-800/60 my-0.5" />

                                                                    {/* Reservation 2 Tier */}
                                                                    <div
                                                                        onClick={(
                                                                            e,
                                                                        ) => {
                                                                            e.stopPropagation();
                                                                            onEditReservation(
                                                                                r2,
                                                                            );
                                                                        }}
                                                                        className="group/r2 hover:bg-background/90 dark:hover:bg-background/70 hover:shadow-2xs cursor-pointer rounded-md p-1.5 transition-all border border-transparent hover:border-purple-300/60 dark:hover:border-purple-700/60"
                                                                        title={`تعديل حجز: ${r2.guest?.name ?? 'النزيل الثاني'}`}
                                                                    >
                                                                        <div className="flex items-start justify-between gap-1">
                                                                            <div className="flex items-start gap-1 min-w-0 flex-1">
                                                                                <User className="text-muted-foreground h-3 w-3 shrink-0 mt-0.5" />
                                                                                <span
                                                                                    className="break-words whitespace-normal font-bold sm:font-semibold text-foreground text-[10px] sm:text-[11px] leading-tight line-clamp-2"
                                                                                    title={r2.guest?.name}
                                                                                >
                                                                                    {r2
                                                                                        .guest
                                                                                        ?.name ||
                                                                                        'نزيل'}
                                                                                </span>
                                                                            </div>
                                                                            <div className="shrink-0 self-start">
                                                                                {getResStatusTag(
                                                                                    r2.status,
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-muted-foreground flex items-center gap-1 mt-0.5 text-[9px] sm:text-[10px] tracking-tight">
                                                                            <Clock className="h-2.5 w-2.5 shrink-0 opacity-70" />
                                                                            <span className="font-mono text-[9px] sm:text-[10px] whitespace-nowrap overflow-hidden text-ellipsis">
                                                                                {
                                                                                    r2.check_in
                                                                                }{' '}
                                                                                ←{' '}
                                                                                {
                                                                                    r2.check_out
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    // Single Reservation Card
                                                    const res = resList[0];
                                                    return (
                                                        <div
                                                            key={unit.id}
                                                            onClick={() =>
                                                                onEditReservation(
                                                                    res,
                                                                )
                                                            }
                                                            className={`shadow-2xs flex cursor-pointer flex-col justify-between rounded-lg border p-2.5 transition-all duration-150 ${statusDetails.cardBg}`}
                                                        >
                                                            {/* Unit Name & Rooms */}
                                                            <div className="flex items-start justify-between gap-1">
                                                                <div>
                                                                    <span className="text-foreground font-bold text-sm">
                                                                        {
                                                                            unit.name
                                                                        }
                                                                    </span>
                                                                    <span className="text-muted-foreground block text-[10px]">
                                                                        {unit.rooms_count
                                                                            ? `${unit.rooms_count} غرف`
                                                                            : 'غرفة'}
                                                                    </span>
                                                                </div>

                                                                <Tag
                                                                    color={
                                                                        statusDetails.tagColor
                                                                    }
                                                                    className="mr-0 px-1.5 py-0 text-[10px] inline-flex items-center gap-0.5"
                                                                >
                                                                    {statusDetails.status ===
                                                                        'departed' && (
                                                                        <LogOut className="h-2.5 w-2.5 shrink-0" />
                                                                    )}
                                                                    {
                                                                        statusDetails.label
                                                                    }
                                                                </Tag>
                                                            </div>

                                                            {/* Middle / Guest & Dates */}
                                                            <div className="mt-2.5 flex min-h-[46px] flex-col justify-center">
                                                                <div className="space-y-1 text-right">
                                                                    <div className="text-foreground flex items-start gap-1 font-semibold text-[11px] leading-snug">
                                                                        <User className="text-muted-foreground h-3.5 w-3.5 shrink-0 mt-0.5" />
                                                                        <span
                                                                            className="break-words whitespace-normal font-bold text-foreground"
                                                                            title={
                                                                                res
                                                                                    ?.guest
                                                                                    ?.name
                                                                            }
                                                                        >
                                                                            {res
                                                                                ?.guest
                                                                                ?.name ||
                                                                                'نزيل'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-muted-foreground flex items-center gap-1 text-[10px]">
                                                                        <Clock className="h-2.5 w-2.5 shrink-0 text-muted-foreground/70" />
                                                                        <span className="font-mono text-[10px]">
                                                                            {
                                                                                res?.check_in
                                                                            }{' '}
                                                                            ←{' '}
                                                                            {
                                                                                res?.check_out
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                );
            })
        )}
            </div>
        </div>
    );
}

