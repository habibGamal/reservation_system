import { useState } from "react";
import { Reservation, Unit } from "@/types/reservation";

export function useReservationModals() {
    // Reservation Form Dialog State
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingReservation, setEditingReservation] =
        useState<Reservation | null>(null);
    const [defaultUnitId, setDefaultUnitId] = useState<number | null>(null);
    const [defaultCheckIn, setDefaultCheckIn] = useState<string | null>(null);

    // Payment Dialog State
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [paymentReservation, setPaymentReservation] =
        useState<Reservation | null>(null);

    // Guest Details Drawer State
    const [guestDetailsOpen, setGuestDetailsOpen] = useState(false);
    const [selectedGuestIdForDrawer, setSelectedGuestIdForDrawer] = useState<
        number | null
    >(null);

    // Excel Import Dialog State
    const [importDialogOpen, setImportDialogOpen] = useState(false);

    // Print Dialog State
    const [printDialogOpen, setPrintDialogOpen] = useState(false);

    const openCreateDialog = () => {
        setEditingReservation(null);
        setDefaultUnitId(null);
        setDefaultCheckIn(null);
        setDialogOpen(true);
    };

    const openEditDialog = (res: Reservation) => {
        setEditingReservation(res);
        setDefaultUnitId(null);
        setDefaultCheckIn(null);
        setDialogOpen(true);
    };

    const openForUnit = (unit: Unit, checkInDate?: string | null) => {
        setEditingReservation(null);
        setDefaultUnitId(unit.id);
        setDefaultCheckIn(checkInDate || null);
        setDialogOpen(true);
    };

    const openForUnitDate = (unit: Unit, date: string) => {
        setEditingReservation(null);
        setDefaultUnitId(unit.id);
        setDefaultCheckIn(date);
        setDialogOpen(true);
    };

    const openPaymentDialog = (res: Reservation) => {
        setPaymentReservation(res);
        setPaymentDialogOpen(true);
    };

    const openGuestDetailsDrawer = (guestId: number) => {
        setSelectedGuestIdForDrawer(guestId);
        setGuestDetailsOpen(true);
    };

    const openImportDialog = () => {
        setImportDialogOpen(true);
    };

    const openPrintDialog = () => {
        setPrintDialogOpen(true);
    };

    const setDialogOpenWithReset = (open: boolean) => {
        setDialogOpen(open);
        if (!open) {
            setEditingReservation(null);
            setDefaultUnitId(null);
            setDefaultCheckIn(null);
        }
    };

    return {
        // Form dialog
        dialogOpen,
        setDialogOpen: setDialogOpenWithReset,
        editingReservation,
        defaultUnitId,
        defaultCheckIn,
        openCreateDialog,
        openEditDialog,
        openForUnit,
        openForUnitDate,

        // Payment dialog
        paymentDialogOpen,
        setPaymentDialogOpen,
        paymentReservation,
        openPaymentDialog,

        // Guest details drawer
        guestDetailsOpen,
        setGuestDetailsOpen,
        selectedGuestIdForDrawer,
        openGuestDetailsDrawer,

        // Import dialog
        importDialogOpen,
        setImportDialogOpen,
        openImportDialog,

        // Print dialog
        printDialogOpen,
        setPrintDialogOpen,
        openPrintDialog,
    };
}
