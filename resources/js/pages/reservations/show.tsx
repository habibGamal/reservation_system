import React, { useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import {
    App,
    Button,
    Card,
    Descriptions,
    Dropdown,
    Empty,
    Image,
    Progress,
    Table,
    Tabs,
    Tag,
    Timeline,
} from "antd";
import type { MenuProps } from "antd";
import {
    ArrowRight,
    Building2,
    Calendar,
    CheckCircle2,
    CreditCard,
    DollarSign,
    Download,
    FileText,
    History,
    Home,
    Paperclip,
    Pencil,
    Plus,
    Printer,
    Trash2,
    User,
    Utensils,
} from "lucide-react";
import {
    Guest,
    Payment,
    Reservation,
    ReservationStatus,
    Sector,
    Unit,
} from "@/types/reservation";

// Wayfinder routes
import {
    destroy as destroyReservation,
    index as reservationsIndex,
    updateStatus as updateReservationStatus,
} from "@/routes/reservations";
import { destroy as destroyPayment } from "@/routes/payments";

// Dialogs & drawers
import { ReservationFormDialog } from "@/components/reservations/reservation-form-dialog";
import { PaymentDialog } from "@/components/reservations/payment-dialog";
import { GuestDetailsDrawer } from "@/components/reservations/guest-details-drawer";

interface ActivityChange {
    field: string;
    label: string;
    old: unknown;
    new: unknown;
    old_label: string;
    new_label: string;
}

interface ActivityLogItem {
    id: number;
    description: string;
    event: string;
    causer_name: string;
    causer_email?: string | null;
    created_at: string;
    created_at_human?: string;
    changes: ActivityChange[];
}

interface ShowProps {
    reservation: Reservation;
    activityLogs: ActivityLogItem[];
    canEdit: boolean;
    canDelete: boolean;
    canUpdateStatus: boolean;
    canManagePayments: boolean;
    sectors: Sector[];
    units: Unit[];
    guests: Guest[];
}

const STATUS_TAG_CONFIG: Record<
    ReservationStatus,
    { color: string; bg: string; border: string; text: string }
> = {
    "تم التسكين": {
        color: "success",
        bg: "bg-emerald-50 dark:bg-emerald-950/30",
        border: "border-emerald-200 dark:border-emerald-800",
        text: "text-emerald-700 dark:text-emerald-300",
    },
    انتظار: {
        color: "warning",
        bg: "bg-amber-50 dark:bg-amber-950/30",
        border: "border-amber-200 dark:border-amber-800",
        text: "text-amber-700 dark:text-amber-300",
    },
    ثابت: {
        color: "processing",
        bg: "bg-sky-50 dark:bg-sky-950/30",
        border: "border-sky-200 dark:border-sky-800",
        text: "text-sky-700 dark:text-sky-300",
    },
    غادر: {
        color: "default",
        bg: "bg-stone-100 dark:bg-stone-800/40",
        border: "border-stone-300 dark:border-stone-700",
        text: "text-stone-600 dark:text-stone-400",
    },
};

const ALL_STATUSES: ReservationStatus[] = [
    "تم التسكين",
    "انتظار",
    "ثابت",
    "غادر",
];

export default function ReservationShow({
    reservation,
    activityLogs = [],
    canEdit,
    canDelete,
    canUpdateStatus,
    canManagePayments,
    sectors = [],
    units = [],
    guests = [],
}: ShowProps) {
    const { modal, message } = App.useApp();

    // Dialog & Drawer States
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [guestDrawerOpen, setGuestDrawerOpen] = useState(false);
    const [statusLoading, setStatusLoading] = useState(false);

    // Format currency helper
    const formatCurrency = (amount: number | string | undefined | null) => {
        const num = Number(amount) || 0;
        return `${num.toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;
    };

    // Calculate payment percentage
    const paidPercentage =
        reservation.total_price > 0
            ? Math.min(
                100,
                Math.round(
                    (reservation.paid_amount / reservation.total_price) * 100,
                ),
            )
            : 100;

    // Handle Quick Status Change
    const handleStatusChange = (newStatus: ReservationStatus) => {
        if (newStatus === reservation.status) return;

        modal.confirm({
            title: "تغيير حالة الحجز",
            content: `هل أنت متأكد من تغيير حالة الحجز إلى "${newStatus}"؟`,
            okText: "تأكيد التغيير",
            cancelText: "إلغاء",
            onOk: () => {
                setStatusLoading(true);
                router.patch(
                    updateReservationStatus.url({ reservation: reservation.id }),
                    { status: newStatus },
                    {
                        preserveScroll: true,
                        onSuccess: () => {
                            message.success("تم تحديث حالة الحجز بنجاح");
                        },
                        onFinish: () => setStatusLoading(false),
                    },
                );
            },
        });
    };

    // Handle Delete Reservation
    const handleDeleteReservation = () => {
        modal.confirm({
            title: "حذف الحجز نهائياً",
            content:
                "هل أنت متأكد من رغبتك في حذف هذا الحجز نهائياً؟ لا يمكن التراجع عن هذا الإجراء.",
            okText: "نعم، احذف الحجز",
            cancelText: "إلغاء",
            okButtonProps: { danger: true },
            onOk: () => {
                router.delete(
                    destroyReservation.url({ reservation: reservation.id }),
                    {
                        onSuccess: () => {
                            message.success("تم حذف الحجز بنجاح");
                        },
                    },
                );
            },
        });
    };

    // Handle Delete Payment
    const handleDeletePayment = (paymentId: number) => {
        modal.confirm({
            title: "حذف دفعة السداد",
            content:
                "هل أنت متأكد من حذف هذه الدفعة المالية؟ سيتم تحديث رصيد الحجز تلقائياً.",
            okText: "نعم، احذف الدفعة",
            cancelText: "إلغاء",
            okButtonProps: { danger: true },
            onOk: () => {
                router.delete(destroyPayment.url({ payment: paymentId }), {
                    preserveScroll: true,
                    onSuccess: () => {
                        message.success("تم حذف الدفعة المالية بنجاح");
                    },
                });
            },
        });
    };

    // Status menu items for dropdown
    const statusMenuItems: MenuProps["items"] = ALL_STATUSES.map((status) => ({
        key: status,
        label: (
            <div className="flex items-center justify-between gap-3 py-0.5">
                <span>{status}</span>
                {status === reservation.status && (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                )}
            </div>
        ),
        disabled: status === reservation.status,
        onClick: () => handleStatusChange(status),
    }));

    // Status styling
    const statusStyle =
        STATUS_TAG_CONFIG[reservation.status] || STATUS_TAG_CONFIG["ثابت"];

    return (
        <>
            <Head
                title={`حجز #${reservation.id} - ${reservation.guest?.name ?? "تفاصيل الحجز"}`}
            />

            {/* Printable Voucher - visible only in print */}
            <div className="hidden print:block p-6 font-sans text-stone-900" dir="rtl">
                <div className="border-b-2 border-stone-800 pb-4 mb-6 flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-black text-stone-900">منتجع النسور - بطاقة إقامة وحجز</h1>
                        <p className="text-sm text-stone-600 mt-1">إدارة الحجوزات والتشغيل الفندقي</p>
                    </div>
                    <div className="text-left">
                        <div className="text-lg font-bold font-mono">#{reservation.id}</div>
                        <div className="text-xs text-stone-500">{new Date().toLocaleDateString("ar-EG")}</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                    <div className="border p-3 rounded">
                        <h3 className="font-bold border-b pb-1 mb-2">بيانات النزيل</h3>
                        <p><span className="text-stone-500">الاسم:</span> {reservation.guest?.name}</p>
                        <p><span className="text-stone-500">الهاتف:</span> {reservation.guest?.phone}</p>
                        {reservation.guest?.mil_code && (
                            <p><span className="text-stone-500">الرقم العسكري:</span> {reservation.guest.mil_code}</p>
                        )}
                        <p><span className="text-stone-500">العضوية:</span> {reservation.membership ?? "غير محدد"}</p>
                    </div>
                    <div className="border p-3 rounded">
                        <h3 className="font-bold border-b pb-1 mb-2">بيانات الإقامة</h3>
                        <p><span className="text-stone-500">القطاع:</span> {reservation.unit?.sector?.name}</p>
                        <p><span className="text-stone-500">الوحدة:</span> {reservation.unit?.name}</p>
                        <p><span className="text-stone-500">الوصول:</span> {reservation.check_in}</p>
                        <p><span className="text-stone-500">المغادرة:</span> {reservation.check_out} ({reservation.nights_count} ليالٍ)</p>
                    </div>
                </div>

                <div className="border p-3 rounded mb-6 text-sm">
                    <h3 className="font-bold border-b pb-1 mb-2">البيانات المالية</h3>
                    <div className="flex justify-between py-1 border-b">
                        <span>إجمالي تكلفة الإقامة:</span>
                        <span className="font-bold">{formatCurrency(reservation.total_price)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b">
                        <span>المبلغ المسدد:</span>
                        <span className="font-bold text-emerald-700">{formatCurrency(reservation.paid_amount)}</span>
                    </div>
                    <div className="flex justify-between py-1 text-base font-bold">
                        <span>المبلغ المتبقي:</span>
                        <span>{formatCurrency(reservation.balance)}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mt-12 text-center text-sm pt-8 border-t">
                    <div>
                        <p className="font-bold mb-8">توقيع المستلم / النزيل</p>
                        <p>.......................................</p>
                    </div>
                    <div>
                        <p className="font-bold mb-8">توقيع موظف الاستقبال والخزينة</p>
                        <p>.......................................</p>
                    </div>
                </div>
            </div>

            {/* Screen Content - hidden in print */}
            <div className="print:hidden flex flex-col gap-3.5 sm:gap-5 p-2 sm:p-4 md:p-6 max-w-7xl mx-auto w-full" dir="rtl">
                {/* Back Link */}
                <div className="flex items-center justify-between">
                    <Link
                        href={reservationsIndex.url()}
                        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-0.5"
                    >
                        <ArrowRight className="h-4 w-4 shrink-0" />
                        <span>العودة إلى منظومة الحجوزات</span>
                    </Link>
                </div>

                {/* Main Header & Actions Card */}
                <div className="bg-card border rounded-xl p-3 sm:p-5 flex flex-col gap-3 shadow-xs">
                    <div className="flex items-start gap-2.5 sm:gap-3.5">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                            <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                <h1 className="text-base sm:text-2xl font-bold tracking-tight text-foreground font-mono">
                                    حجز #{reservation.id}
                                </h1>
                                <Tag
                                    color={statusStyle.color}
                                    className="text-xs sm:text-sm px-2 py-0.5 rounded-full font-semibold mr-0"
                                >
                                    {reservation.status}
                                </Tag>
                                <Tag className="text-[11px] sm:text-xs font-normal mr-0">
                                    {reservation.unit?.sector?.name ?? "القطاع"} - وحدة {reservation.unit?.name ?? "—"}
                                </Tag>
                            </div>

                            <div className="text-xs sm:text-sm text-foreground font-semibold mt-1 truncate">
                                النزيل: {reservation.guest?.name ?? "—"}
                            </div>

                            <div className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <span className="font-mono">
                                    {reservation.check_in} إلى {reservation.check_out}
                                </span>
                                <span>•</span>
                                <span className="font-medium text-primary">
                                    {reservation.nights_count} {reservation.nights_count === 1 ? "ليلة" : "ليالٍ"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Action Toolbar on Mobile & Desktop */}
                    <div className="pt-2.5 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                        {canEdit && (
                            <Button
                                type="primary"
                                onClick={() => setEditDialogOpen(true)}
                                icon={<Pencil className="h-4 w-4" />}
                                className="w-full sm:w-auto font-medium"
                            >
                                تعديل بيانات الحجز
                            </Button>
                        )}

                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 w-full sm:w-auto">
                            {canUpdateStatus && (
                                <Dropdown menu={{ items: statusMenuItems }} trigger={["click"]} disabled={statusLoading}>
                                    <Button loading={statusLoading} className="w-full sm:w-auto text-xs sm:text-sm px-2 sm:px-3">
                                        تغيير الحالة
                                    </Button>
                                </Dropdown>
                            )}

                            {canManagePayments && reservation.balance > 0 && (
                                <Button
                                    onClick={() => setPaymentDialogOpen(true)}
                                    icon={<CreditCard className="h-3.5 w-3.5 text-emerald-600" />}
                                    className="w-full sm:w-auto text-xs sm:text-sm px-2 sm:px-3"
                                >
                                    تسجيل دفعة
                                </Button>
                            )}

                            <Button
                                onClick={() => window.print()}
                                icon={<Printer className="h-3.5 w-3.5 text-stone-600 dark:text-stone-300" />}
                                className="w-full sm:w-auto text-xs sm:text-sm px-2 sm:px-3"
                            >
                                طباعة
                            </Button>

                            {canDelete && (
                                <Button
                                    danger
                                    onClick={handleDeleteReservation}
                                    icon={<Trash2 className="h-3.5 w-3.5" />}
                                    className="w-full sm:w-auto text-xs sm:text-sm px-2 sm:px-3"
                                >
                                    حذف
                                </Button>
                            )}
                        </div>
                    </div>
                </div>


                {/* Main Detailed Content Tabs */}
                <Card className="shadow-xs border rounded-xl overflow-hidden p-0">
                    <Tabs
                        defaultActiveKey="details"
                        className="px-2 sm:px-4"
                        items={[
                            {
                                key: "details",
                                label: (
                                    <span className="flex items-center gap-1.5 py-1 text-xs sm:text-sm">
                                        <Home className="h-3.5 w-3.5" />
                                        <span>بيانات الإقامة</span>
                                    </span>
                                ),
                                children: (
                                    <div className="flex flex-col gap-4 sm:gap-6 py-2 sm:py-4">
                                        {/* Guest & Room Grid */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
                                            {/* Guest Card */}
                                            <Card
                                                size="small"
                                                title={
                                                    <div className="flex items-center gap-2 font-bold text-sm sm:text-base">
                                                        <User className="h-4 w-4 text-primary" />
                                                        <span>بيانات النزيل</span>
                                                    </div>
                                                }
                                                extra={
                                                    reservation.guest_id ? (
                                                        <Button
                                                            type="link"
                                                            size="small"
                                                            onClick={() => setGuestDrawerOpen(true)}
                                                            className="text-xs px-1"
                                                        >
                                                            السجل
                                                        </Button>
                                                    ) : null
                                                }
                                                className="rounded-xl border bg-card"
                                            >
                                                <Descriptions
                                                    column={1}
                                                    size="small"
                                                    bordered
                                                    className="mt-1"
                                                    labelStyle={{ width: "110px", fontSize: "12px", whiteSpace: "nowrap" }}
                                                    contentStyle={{ fontSize: "12px" }}
                                                >
                                                    <Descriptions.Item label="اسم النزيل">
                                                        <strong className="text-foreground text-xs sm:text-sm">
                                                            {reservation.guest?.name ?? "—"}
                                                        </strong>
                                                    </Descriptions.Item>
                                                    <Descriptions.Item label="رقم الهاتف">
                                                        {reservation.guest?.phone ? (
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <a
                                                                    href={`tel:${reservation.guest.phone}`}
                                                                    className="text-primary hover:underline font-mono text-xs"
                                                                    dir="ltr"
                                                                >
                                                                    {reservation.guest.phone}
                                                                </a>
                                                                <a
                                                                    href={`https://wa.me/${reservation.guest.phone.replace(/[^0-9]/g, "")}`}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="text-emerald-600 hover:text-emerald-700 text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40"
                                                                >
                                                                    واتساب
                                                                </a>
                                                            </div>
                                                        ) : (
                                                            "—"
                                                        )}
                                                    </Descriptions.Item>
                                                    <Descriptions.Item label="الرقم العسكري / القومي">
                                                        <span className="font-mono text-xs">
                                                            {reservation.guest?.mil_code || "—"}
                                                        </span>
                                                    </Descriptions.Item>
                                                    <Descriptions.Item label="نوع العضوية">
                                                        <Tag color="blue" className="text-xs mr-0">
                                                            {reservation.membership || "غير محدد"}
                                                        </Tag>
                                                    </Descriptions.Item>
                                                </Descriptions>
                                            </Card>

                                            {/* Unit & Booking Attributes Card */}
                                            <Card
                                                size="small"
                                                title={
                                                    <div className="flex items-center gap-2 font-bold text-sm sm:text-base">
                                                        <Building2 className="h-4 w-4 text-primary" />
                                                        <span>بيانات الوحدة</span>
                                                    </div>
                                                }
                                                className="rounded-xl border bg-card"
                                            >
                                                <Descriptions
                                                    column={1}
                                                    size="small"
                                                    bordered
                                                    className="mt-1"
                                                    labelStyle={{ width: "110px", fontSize: "12px", whiteSpace: "nowrap" }}
                                                    contentStyle={{ fontSize: "12px" }}
                                                >
                                                    <Descriptions.Item label="القطاع السكني">
                                                        <strong>{reservation.unit?.sector?.name ?? "—"}</strong>
                                                    </Descriptions.Item>
                                                    <Descriptions.Item label="الوحدة السكنية">
                                                        <span className="font-bold text-primary">
                                                            وحدة {reservation.unit?.name ?? "—"}
                                                        </span>
                                                        {reservation.unit?.rooms_count ? (
                                                            <span className="text-[11px] text-muted-foreground mr-1">
                                                                ({reservation.unit.rooms_count} غرف)
                                                            </span>
                                                        ) : null}
                                                    </Descriptions.Item>
                                                    <Descriptions.Item label="نوع الحجز">
                                                        <Tag color="purple" className="text-xs mr-0">
                                                            {reservation.type || "منتجع"}
                                                        </Tag>
                                                    </Descriptions.Item>
                                                    <Descriptions.Item label="دخل من البوابة">
                                                        {reservation.enter_from_gates ? (
                                                            <Tag color="success" className="text-xs mr-0">تم الدخول</Tag>
                                                        ) : (
                                                            <Tag color="default" className="text-xs mr-0">لم يتم الدخول</Tag>
                                                        )}
                                                    </Descriptions.Item>
                                                </Descriptions>
                                            </Card>
                                        </div>

                                        {/* Meals Service Information */}
                                        <Card
                                            size="small"
                                            title={
                                                <div className="flex items-center gap-2 font-bold text-sm sm:text-base">
                                                    <Utensils className="h-4 w-4 text-primary" />
                                                    <span>الوجبات</span>
                                                </div>
                                            }
                                            className="rounded-xl border bg-card"
                                        >
                                            {reservation.has_meals ? (
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-1">
                                                    <div>
                                                        <span className="text-[11px] text-muted-foreground">عدد الأفراد:</span>
                                                        <p className="text-sm sm:text-base font-bold text-foreground">
                                                            {reservation.meals_persons_count || 4} أفراد
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[11px] text-muted-foreground">فترة الوجبات:</span>
                                                        <p className="text-xs font-mono text-foreground">
                                                            {reservation.meals_start_date} إلى {reservation.meals_end_date}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[11px] text-muted-foreground">سعر الفرد لليلة:</span>
                                                        <p className="text-xs sm:text-sm font-mono text-foreground">
                                                            {formatCurrency(reservation.meals_rate_per_night)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[11px] text-muted-foreground">إجمالي الوجبات:</span>
                                                        <p className="text-sm sm:text-base font-bold text-emerald-600 font-mono">
                                                            {formatCurrency(reservation.meals_total_price)}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center py-3 text-muted-foreground text-xs sm:text-sm">
                                                    لا توجد وجبات إعاشة مضافة لهذا الحجز
                                                </div>
                                            )}
                                        </Card>

                                        {/* Extra Fees Table */}
                                        {reservation.extra_fees && reservation.extra_fees.length > 0 && (
                                            <Card
                                                size="small"
                                                title={
                                                    <div className="flex items-center gap-2 font-bold text-sm sm:text-base">
                                                        <DollarSign className="h-4 w-4 text-primary" />
                                                        <span>الرسوم والمصاريف الإضافية</span>
                                                    </div>
                                                }
                                                className="rounded-xl border bg-card overflow-hidden"
                                            >
                                                <Table
                                                    dataSource={reservation.extra_fees}
                                                    rowKey="id"
                                                    pagination={false}
                                                    size="small"
                                                    scroll={{ x: 280 }}
                                                    columns={[
                                                        {
                                                            title: "البيان / الوصف",
                                                            dataIndex: "description",
                                                            key: "description",
                                                        },
                                                        {
                                                            title: "المبلغ",
                                                            dataIndex: "amount",
                                                            key: "amount",
                                                            render: (amount: number) => (
                                                                <span className="font-bold font-mono text-xs sm:text-sm">
                                                                    {formatCurrency(amount)}
                                                                </span>
                                                            ),
                                                        },
                                                    ]}
                                                />
                                            </Card>
                                        )}

                                        {/* Notes Section */}
                                        {reservation.notes && (
                                            <Card
                                                size="small"
                                                title={
                                                    <div className="flex items-center gap-2 font-bold text-sm sm:text-base">
                                                        <FileText className="h-4 w-4 text-primary" />
                                                        <span>الملاحظات والتعليمات</span>
                                                    </div>
                                                }
                                                className="rounded-xl border bg-card"
                                            >
                                                <p className="text-xs sm:text-sm whitespace-pre-wrap text-foreground leading-relaxed p-1">
                                                    {reservation.notes}
                                                </p>
                                            </Card>
                                        )}

                                        {/* Attachments & Photos */}
                                        {reservation.attachments && reservation.attachments.length > 0 && (
                                            <Card
                                                size="small"
                                                title={
                                                    <div className="flex items-center gap-2 font-bold text-sm sm:text-base">
                                                        <Paperclip className="h-4 w-4 text-primary" />
                                                        <span>المرفقات والوثائق ({reservation.attachments.length})</span>
                                                    </div>
                                                }
                                                className="rounded-xl border bg-card"
                                            >
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 p-1">
                                                    <Image.PreviewGroup>
                                                        {reservation.attachments.map((att) => (
                                                            <div
                                                                key={att.id}
                                                                className="flex flex-col border rounded-lg p-1.5 sm:p-2 bg-muted/30 text-center gap-1.5 hover:bg-muted/60 transition-colors"
                                                            >
                                                                {att.is_image ? (
                                                                    <div className="h-24 sm:h-28 w-full rounded overflow-hidden flex items-center justify-center bg-stone-100 dark:bg-stone-800">
                                                                        <Image
                                                                            src={att.url}
                                                                            alt={att.file_name}
                                                                            className="object-cover h-full w-full"
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <div className="h-24 sm:h-28 w-full rounded flex flex-col items-center justify-center bg-stone-100 dark:bg-stone-800 text-muted-foreground">
                                                                        <FileText className="h-8 w-8 mb-1" />
                                                                        <span className="text-[10px] font-mono">
                                                                            {att.mime_type?.split("/")[1]?.toUpperCase() ?? "FILE"}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                <div className="text-[11px] sm:text-xs truncate font-medium text-foreground" title={att.file_name}>
                                                                    {att.file_name}
                                                                </div>
                                                                <div className="text-[10px] text-muted-foreground">
                                                                    {att.human_size}
                                                                </div>
                                                                {att.url && (
                                                                    <a
                                                                        href={att.url}
                                                                        download
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="text-[11px] text-primary hover:underline flex items-center justify-center gap-1 mt-auto py-0.5"
                                                                    >
                                                                        <Download className="h-3 w-3" />
                                                                        <span>تحميل</span>
                                                                    </a>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </Image.PreviewGroup>
                                                </div>
                                            </Card>
                                        )}
                                    </div>
                                ),
                            },
                            {
                                key: "activity",
                                label: (
                                    <span className="flex items-center gap-1.5 py-1 text-xs sm:text-sm">
                                        <History className="h-3.5 w-3.5" />
                                        <span>سجل التعديلات ({activityLogs.length})</span>
                                    </span>
                                ),
                                children: (
                                    <div className="flex flex-col gap-3 sm:gap-4 py-2 sm:py-4">
                                        <div>
                                            <h3 className="text-sm sm:text-base font-bold text-foreground">
                                                السجل التاريخي للأنشطة والتعديلات
                                            </h3>
                                            <p className="text-[11px] sm:text-xs text-muted-foreground">
                                                سجل تفصيلي دقيق يوضح من قام بتعديل هذا الحجز وماذا تغير
                                            </p>
                                        </div>

                                        {activityLogs.length > 0 ? (
                                            <div className="p-1 sm:p-3">
                                                <Timeline
                                                    items={activityLogs.map((log) => ({
                                                        color: log.event === "created" ? "green" : "blue",
                                                        children: (
                                                            <div className="flex flex-col gap-1.5 pb-3">
                                                                <div className="flex flex-wrap items-center justify-between gap-1">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <strong className="text-xs sm:text-sm text-foreground">
                                                                            {log.causer_name}
                                                                        </strong>
                                                                        <Tag color={log.event === "created" ? "success" : "processing"} className="text-[10px] sm:text-xs mr-0">
                                                                            {log.event === "created" ? "إنشاء حجز" : "تعديل حجز"}
                                                                        </Tag>
                                                                    </div>
                                                                    <span className="text-[10px] sm:text-xs text-muted-foreground font-mono">
                                                                        {log.created_at_human || log.created_at}
                                                                    </span>
                                                                </div>

                                                                {log.changes && log.changes.length > 0 ? (
                                                                    <div className="mt-1 flex flex-col gap-1.5 bg-muted/40 dark:bg-muted/20 rounded-lg p-2 sm:p-2.5 text-[11px] sm:text-xs border border-border/40">
                                                                        {log.description && log.description !== "updated" && log.description !== "created" && (
                                                                            <div className="text-[11px] text-muted-foreground font-medium mb-0.5">
                                                                                {log.description}
                                                                            </div>
                                                                        )}
                                                                        <div className="flex flex-col gap-1.5">
                                                                            {log.changes.map((ch, idx) => (
                                                                                <div
                                                                                    key={idx}
                                                                                    className="flex flex-wrap items-center gap-1.5 bg-background/70 dark:bg-background/40 px-2 py-1 rounded border border-border/30"
                                                                                >
                                                                                    <span className="font-semibold text-foreground min-w-[85px]">
                                                                                        {ch.label}:
                                                                                    </span>
                                                                                    <span className="text-[10px] text-muted-foreground">من</span>
                                                                                    <span className="line-through text-rose-500/80 dark:text-rose-400/80 bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded text-[11px]">
                                                                                        {ch.old_label}
                                                                                    </span>
                                                                                    <span className="text-[10px] text-muted-foreground">إلى</span>
                                                                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-200/40 dark:border-emerald-800/40 text-[11px]">
                                                                                        {ch.new_label}
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                                        {log.description}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ),
                                                    }))}
                                                />
                                            </div>
                                        ) : (
                                            <Empty
                                                description="لا توجد أنشطة مسجلة لهذا الحجز حتى الآن"
                                                className="py-6"
                                            />
                                        )}
                                    </div>
                                ),
                            },
                        ]}
                    />
                </Card>
            </div>

            {/* Dialogs & Drawers */}
            {canEdit && (
                <ReservationFormDialog
                    open={editDialogOpen}
                    onOpenChange={setEditDialogOpen}
                    reservation={reservation}
                    units={units}
                    guests={guests}
                    sectors={sectors}
                    existingReservations={[]}
                    onViewGuestDetails={(g) => setGuestDrawerOpen(true)}
                />
            )}

            {canManagePayments && (
                <PaymentDialog
                    open={paymentDialogOpen}
                    onOpenChange={setPaymentDialogOpen}
                    reservation={reservation}
                />
            )}

            <GuestDetailsDrawer
                open={guestDrawerOpen}
                onOpenChange={setGuestDrawerOpen}
                guestId={reservation.guest_id}
            />
        </>
    );
}

ReservationShow.layout = {
    breadcrumbs: [
        {
            title: "إدارة الحجوزات والإقامة",
            href: "/reservations",
        },
        {
            title: "تفاصيل الحجز",
            href: "#",
        },
    ],
};
