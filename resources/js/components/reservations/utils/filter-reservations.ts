import { Reservation } from "@/types/reservation";

export interface ReservationFilterCriteria {
    search?: string;
    sectorId?: string;
    sectorIds?: string[];
    statusFilter?: string;
    statusFilters?: string[];
    paymentStatus?: string;
    startDate?: string;
    endDate?: string;
}

/**
 * Pure predicate/filtering function for reservations.
 * Evaluates status, sector, payment status, multi-field text search, and date range.
 */
export function filterReservations(
    reservations: Reservation[],
    criteria: ReservationFilterCriteria,
): Reservation[] {
    const {
        search = "",
        sectorId = "all",
        sectorIds,
        statusFilter = "all",
        statusFilters,
        paymentStatus = "all",
        startDate,
        endDate,
    } = criteria;

    const q = search.trim().toLowerCase();

    return reservations.filter((res) => {
        // 1. Status Filter (multi-status support)
        if (statusFilters && statusFilters.length > 0 && !statusFilters.includes("all")) {
            if (!statusFilters.includes(res.status)) {
                return false;
            }
        } else if (statusFilter !== "all" && res.status !== statusFilter) {
            return false;
        }

        // 2. Sector Filter (multi-sector support)
        const resSectorId = res.unit?.sector_id ?? res.unit?.sector?.id;
        if (sectorIds && sectorIds.length > 0 && !sectorIds.includes("all")) {
            if (!sectorIds.includes(String(resSectorId))) {
                return false;
            }
        } else if (sectorId !== "all") {
            if (String(resSectorId) !== sectorId) {
                return false;
            }
        }

        // 3. Payment Status Filter
        if (paymentStatus !== "all") {
            if (paymentStatus === "paid") {
                const isPaid =
                    res.payment_status === "Fully Paid" ||
                    (res.total_price > 0 && res.paid_amount >= res.total_price);
                if (!isPaid) return false;
            } else if (paymentStatus === "partial") {
                const isPartial =
                    res.payment_status === "Partially Paid" ||
                    (res.paid_amount > 0 && res.paid_amount < res.total_price);
                if (!isPartial) return false;
            } else if (paymentStatus === "unpaid") {
                const isUnpaid =
                    res.payment_status === "Unpaid" ||
                    !res.paid_amount ||
                    res.paid_amount === 0;
                if (!isUnpaid) return false;
            }
        }

        // 4. Search Filter
        if (q) {
            const guestName = res.guest?.name?.toLowerCase() || "";
            const guestPhone = res.guest?.phone?.toLowerCase() || "";
            const guestMilCode = res.guest?.mil_code?.toLowerCase() || "";
            const unitName = res.unit?.name?.toLowerCase() || "";
            const sectorName = res.unit?.sector?.name?.toLowerCase() || "";
            const notes = res.notes?.toLowerCase() || "";
            const resId = String(res.id);

            const matches =
                guestName.includes(q) ||
                guestPhone.includes(q) ||
                guestMilCode.includes(q) ||
                unitName.includes(q) ||
                sectorName.includes(q) ||
                notes.includes(q) ||
                resId.includes(q);

            if (!matches) {
                return false;
            }
        }

        // 5. Date Range Filter
        if (startDate && endDate) {
            if (res.check_in > endDate || res.check_out < startDate) {
                return false;
            }
        } else if (startDate) {
            if (res.check_out < startDate) {
                return false;
            }
        } else if (endDate) {
            if (res.check_in > endDate) {
                return false;
            }
        }

        return true;
    });
}
