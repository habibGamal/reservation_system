import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, useHttp, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import {
    App,
    Badge as AntBadge,
    Button as AntButton,
    Checkbox,
    Dropdown,
    Input as AntInput,
    Modal,
    Select as AntSelect,
    Table,
    Tag,
    Tooltip,
    theme,
} from 'antd';
import type { InputRef, MenuProps, TableColumnsType } from 'antd';
import type { FilterDropdownProps, FilterValue } from 'antd/es/table/interface';
import {
    MembershipType,
    Payment,
    Reservation,
    ReservationStatus,
    ReservationType,
    SharedProps,
    Unit,
} from '@/types/reservation';
import {
    Banknote,
    BedDouble,
    Building2,
    Calendar,
    Check,
    CheckCircle,
    Clock,
    CreditCard,
    Edit,
    Filter,
    History,
    Loader2,
    LogOut,
    Pencil,
    Phone,
    Plus,
    Printer,
    QrCode,
    Receipt,
    RotateCcw,
    Search,
    Shield,
    Trash2,
    User,
    X,
} from 'lucide-react';

/**
 * Custom permanent sector ordering specified by Eagles Resort:
 * 1. لوسيال
 * 2. فيلا قديم
 * 3. فيلا جديد
 * 4. فندق 1
 * 5. فندق 2
 * 6. فندق 3
 * 7. فندق 4
 * 8. فندق 5
 * 9. مميز
 * 10. دورين
 * 11. فندق 6
 */
export const SECTOR_ORDER: Record<string, number> = {
    'لوسيال': 1,
    'فيلا قديم': 2,
    'فيلا جديد': 3,
    'فندق 1': 4,
    'فندق 2': 5,
    'فندق 3': 6,
    'فندق 4': 7,
    'فندق 5': 8,
    'مميز': 9,
    'دورين': 10,
    'فندق 6': 11,
};

export function getSectorOrder(
    sectorName?: string | null,
    sectorId?: number | null,
): number {
    if (sectorName) {
        const trimmed = sectorName.trim();
        if (SECTOR_ORDER[trimmed] !== undefined) {
            return SECTOR_ORDER[trimmed];
        }
    }
    if (sectorId !== undefined && sectorId !== null) {
        return sectorId;
    }
    return 999;
}

/**
 * Permanent comparator:
 * 1. Primary sort: Sector custom arrangement
 * 2. Secondary sort: Unit number/name (natural numeric comparison)
 * 3. Tertiary sort: Check-in date ascending
 */
export function compareReservationsBySectorAndUnit(
    a: Reservation,
    b: Reservation,
): number {
    const aSectorOrder = getSectorOrder(
        a.unit?.sector?.name,
        a.unit?.sector_id ?? a.unit?.sector?.id,
    );
    const bSectorOrder = getSectorOrder(
        b.unit?.sector?.name,
        b.unit?.sector_id ?? b.unit?.sector?.id,
    );

    if (aSectorOrder !== bSectorOrder) {
        return aSectorOrder - bSectorOrder;
    }

    const aUnitName = (a.unit?.name ?? '').trim();
    const bUnitName = (b.unit?.name ?? '').trim();

    const unitComparison = aUnitName.localeCompare(bUnitName, undefined, {
        numeric: true,
        sensitivity: 'base',
    });

    if (unitComparison !== 0) {
        return unitComparison;
    }

    const aCheckIn = a.check_in ?? '';
    const bCheckIn = b.check_in ?? '';
    return aCheckIn.localeCompare(bCheckIn);
}

export interface ReservationTableViewProps {
    reservations: Reservation[];
    units?: Unit[];
    sectorId?: string | number;
    sectorIds?: string[];
    search?: string;
    statusFilter?: string;
    statusFilters?: string[];
    paymentStatusFilter?: string;
    onEdit: (reservation: Reservation) => void;
    onStatusUpdate?: (id: number, newStatus: ReservationStatus) => void;
    onReservationUpdate?: (id: number, data: Partial<Reservation>) => void;
    onGuestUpdate?: (
        guestId: number,
        data: { name?: string; phone?: string; mil_code?: string | null },
    ) => void;
    onDelete: (id: number) => void;
    onRecordPayment: (reservation: Reservation) => void;
    onViewGuestDetails?: (guestId: number) => void;
    onBookUnit?: (unit: Unit) => void;
    onPrint?: () => void;
    loading?: boolean;
}

interface InlineTextEditProps {
    value: string;
    placeholder?: string;
    emptyLabel?: string;
    icon?: React.ReactNode;
    canEdit?: boolean;
    onSave: (val: string) => Promise<void> | void;
    className?: string;
    inputClassName?: string;
}

/**
 * Inline editable text component with double-click activation,
 * Enter to save, Escape to cancel, and clean visual hover cues.
 * Wrapped in React.memo to prevent re-renders when parent state changes
 * but this cell's props haven't.
 */
const InlineTextEdit = React.memo(function InlineTextEdit({
    value,
    placeholder,
    emptyLabel = 'غير محدد',
    icon,
    canEdit = true,
    onSave,
    className = '',
    inputClassName = '',
}: InlineTextEditProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(value);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    const handleStartEditing = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (!canEdit || isSaving) return;
        setIsEditing(true);
    }, [canEdit, isSaving]);

    // Guard ref to prevent double-invocation (Enter/click + onBlur race)
    const savingRef = useRef(false);

    const handleSave = useCallback(async () => {
        if (savingRef.current) return;
        const trimmed = currentValue.trim();
        if (trimmed === (value || '').trim()) {
            setIsEditing(false);
            return;
        }
        try {
            savingRef.current = true;
            setIsSaving(true);
            await onSave(trimmed);
            setIsEditing(false);
        } catch {
            // Error handled by parent handler
        } finally {
            savingRef.current = false;
            setIsSaving(false);
        }
    }, [currentValue, value, onSave]);

    const handleCancel = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentValue(value);
        setIsEditing(false);
    }, [value]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            void handleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    }, [handleSave, handleCancel]);

    if (isEditing) {
        return (
            <div
                className="z-20 inline-flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
            >
                <AntInput
                    size="small"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSave}
                    autoFocus
                    disabled={isSaving}
                    placeholder={placeholder}
                    className={`h-6 rounded px-2 py-0.5 text-xs ${inputClassName}`}
                />
                {isSaving ? (
                    <Loader2 className="text-muted-foreground h-3.5 w-3.5 shrink-0 animate-spin" />
                ) : (
                    <div className="flex shrink-0 items-center gap-0.5">
                        <button
                            type="button"
                            onClick={handleSave}
                            className="cursor-pointer rounded p-1 text-emerald-600 transition-colors hover:bg-emerald-500/15"
                            title="حفظ (Enter)"
                        >
                            <Check className="h-3 w-3" />
                        </button>
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="hover:bg-destructive/15 text-destructive cursor-pointer rounded p-1 transition-colors"
                            title="إلغاء (Esc)"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                )}
            </div>
        );
    }

    const displayVal = value ? value : emptyLabel;
    const isPlaceholder = !value;

    return (
        <div
            onClick={isPlaceholder ? handleStartEditing : undefined}
            onDoubleClick={handleStartEditing}
            className={`group relative -mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 transition-all select-none ${canEdit
                ? 'hover:bg-muted/80 hover:ring-border/80 cursor-pointer hover:ring-1'
                : ''
                } ${className}`}
            title={
                canEdit
                    ? isPlaceholder
                        ? 'انقر للإضافة'
                        : 'انقر مرتين للتعديل السريع'
                    : undefined
            }
        >
            {icon}
            <span
                className={`truncate ${isPlaceholder
                    ? 'text-muted-foreground/60 text-[11px] italic'
                    : ''
                    }`}
            >
                {displayVal}
            </span>
            {canEdit && (
                <button
                    type="button"
                    onClick={handleStartEditing}
                    className="inline-flex cursor-pointer items-center"
                    title="تعديل"
                >
                    <Pencil className="text-muted-foreground h-2.5 w-2.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60 hover:opacity-100" />
                </button>
            )}
        </div>
    );
});

// ── Lazy Select: shows lightweight display text, mounts AntSelect only on click ──

interface LazySelectProps<T extends string = string> {
    value: T;
    options: { value: T; label: React.ReactNode }[];
    onChange: (val: T) => void;
    disabled?: boolean;
    displayRender?: (value: T) => React.ReactNode;
}

/**
 * Lightweight select cell that renders plain text / badge by default.
 * AntSelect is only mounted when the user clicks to edit — dramatically
 * reducing the per-row DOM weight during virtual scroll.
 */
const LazySelect = React.memo(function LazySelect<T extends string = string>({
    value,
    options,
    onChange,
    disabled = false,
    displayRender,
}: LazySelectProps<T>) {
    const [isOpen, setIsOpen] = useState(false);

    const handleChange = useCallback((val: T) => {
        onChange(val);
        setIsOpen(false);
    }, [onChange]);

    if (isOpen && !disabled) {
        return (
            <AntSelect
                value={value}
                onChange={handleChange}
                onBlur={() => setIsOpen(false)}
                size="small"
                className="w-full"
                options={options}
                autoFocus
                open
            />
        );
    }

    const matchedOption = options.find((o) => o.value === value);
    const display = displayRender
        ? displayRender(value)
        : matchedOption?.label ?? value;

    return (
        <div
            onClick={disabled ? undefined : () => setIsOpen(true)}
            className={`inline-flex min-h-[24px] w-full items-center rounded border border-transparent px-1.5 text-xs select-none ${disabled
                ? 'cursor-default opacity-70'
                : 'hover:border-border/60 hover:bg-muted/50 cursor-pointer'
                }`}
            title={disabled ? undefined : 'انقر للتغيير'}
        >
            {display}
        </div>
    );
}) as <T extends string = string>(props: LazySelectProps<T>) => React.ReactElement;

// ── Status & payment badge helpers (stable module-level functions) ──

const STATUS_OPTIONS = [
    {
        value: 'تم التسكين' as ReservationStatus,
        label: (
            <span className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle className="h-3 w-3 text-emerald-600" />
                <span>تم التسكين</span>
            </span>
        ),
    },
    {
        value: 'ثابت' as ReservationStatus,
        label: (
            <span className="flex items-center gap-1.5 font-medium text-blue-700 dark:text-blue-400">
                <BedDouble className="h-3 w-3 text-blue-600" />
                <span>ثابت</span>
            </span>
        ),
    },
    {
        value: 'انتظار' as ReservationStatus,
        label: (
            <span className="flex items-center gap-1.5 font-medium text-amber-800 dark:text-amber-400">
                <Clock className="h-3 w-3 text-amber-600" />
                <span>انتظار</span>
            </span>
        ),
    },
    {
        value: 'غادر' as ReservationStatus,
        label: (
            <span className="flex items-center gap-1.5 font-medium text-red-700 dark:text-red-400">
                <LogOut className="h-3 w-3 text-red-600 dark:text-red-400" />
                <span>غادر</span>
            </span>
        ),
    },
];

const MEMBERSHIP_OPTIONS = [
    { value: 'عضو', label: 'عضو' },
    { value: 'غير عضو', label: 'غير عضو' },
    { value: 'مرافق', label: 'مرافق' },
    { value: 'مدني', label: 'مدني' },
];

const TYPE_OPTIONS = [
    { value: 'فرع', label: 'فرع' },
    { value: 'ادارة', label: 'ادارة' },
    { value: 'منتجع', label: 'منتجع' },
];

const GATE_OPTIONS = [
    {
        value: 'false',
        label: (
            <span className="flex items-center gap-1.5 font-medium text-stone-600 dark:text-stone-400">
                <X className="h-3 w-3 text-stone-400" />
                <span>لا</span>
            </span>
        ),
    },
    {
        value: 'true',
        label: (
            <span className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle className="h-3 w-3 text-emerald-600" />
                <span>نعم</span>
            </span>
        ),
    },
];

function getGateBadge(enterFromGates?: boolean | null) {
    if (enterFromGates) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>نعم</span>
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-100 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
            <X className="h-3 w-3 shrink-0 text-stone-400" />
            <span>لا</span>
        </span>
    );
}

function getStatusBadge(status: ReservationStatus | string) {
    switch (status) {
        case 'تم التسكين':
            return (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <CheckCircle className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>تم التسكين</span>
                </span>
            );
        case 'ثابت':
            return (
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                    <BedDouble className="h-3 w-3 shrink-0 text-blue-600 dark:text-blue-400" />
                    <span>ثابت</span>
                </span>
            );
        case 'انتظار':
            return (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                    <Clock className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>انتظار</span>
                </span>
            );
        case 'غادر':
            return (
                <span className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                    <LogOut className="h-3 w-3 shrink-0 text-red-600 dark:text-red-400" />
                    <span>غادر</span>
                </span>
            );
        case 'شاغر':
            return (
                <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border bg-muted/40 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-muted-foreground">
                    <span>شاغر</span>
                </span>
            );
        default:
            return <span>{status}</span>;
    }
}

function getPaymentBadge(status: string, balance: number) {
    switch (status) {
        case 'Fully Paid':
            return (
                <Tag
                    color="success"
                    className="m-0 inline-flex items-center gap-1 text-[11px] whitespace-nowrap"
                >
                    <CheckCircle className="h-3 w-3" />
                    <span>مسدد بالكامل</span>
                </Tag>
            );
        case 'Partially Paid':
            return (
                <Tag
                    color="warning"
                    className="m-0 inline-flex items-center gap-1 text-[11px] whitespace-nowrap"
                >
                    <Clock className="h-3 w-3" />
                    <span>
                        متبقي {Number(balance).toLocaleString()} ج.م
                    </span>
                </Tag>
            );
        default:
            return (
                <Tag
                    color="error"
                    className="m-0 inline-flex items-center gap-1 text-[11px] whitespace-nowrap"
                >
                    <span>
                        غير مسدد ({Number(balance).toLocaleString()} ج.م)
                    </span>
                </Tag>
            );
    }
}

function getPaymentMethodTag(method: string) {
    switch (method) {
        case 'Cash':
            return (
                <Tag
                    color="success"
                    className="inline-flex items-center gap-1 text-xs"
                >
                    <Banknote className="h-3 w-3" /> نقداً
                </Tag>
            );
        case 'visa':
            return (
                <Tag
                    color="processing"
                    className="inline-flex items-center gap-1 text-xs"
                >
                    <CreditCard className="h-3 w-3" /> فيزا
                </Tag>
            );
        case 'instapay':
            return (
                <Tag
                    color="purple"
                    className="inline-flex items-center gap-1 text-xs"
                >
                    <QrCode className="h-3 w-3" /> إنستاباي
                </Tag>
            );
        default:
            return <Tag>{method}</Tag>;
    }
}

// ── Column Filter Options Constants ──

const STATUS_FILTER_OPTIONS = [
    { text: 'شاغر', value: 'شاغر' },
    { text: 'تم التسكين', value: 'تم التسكين' },
    { text: 'ثابت', value: 'ثابت' },
    { text: 'انتظار', value: 'انتظار' },
    { text: 'غادر', value: 'غادر' },
];

const GATE_FILTER_OPTIONS = [
    { text: 'تم الدخول (نعم)', value: '1' },
    { text: 'لم يدخل بعد (لا)', value: '0' },
];

const MEMBERSHIP_FILTER_OPTIONS = [
    { text: 'عضو', value: 'عضو' },
    { text: 'غير عضو', value: 'غير عضو' },
    { text: 'مرافق', value: 'مرافق' },
    { text: 'مدني', value: 'مدني' },
];

const TYPE_FILTER_OPTIONS = [
    { text: 'فرع', value: 'فرع' },
    { text: 'ادارة', value: 'ادارة' },
    { text: 'منتجع', value: 'منتجع' },
];
const RESERVATION_TYPE_FILTER_OPTIONS = TYPE_FILTER_OPTIONS;

const ACCOMMODATION_FILTER_OPTIONS = [
    { text: 'مجاني (0 ج.م)', value: 'zero' },
    { text: 'أقل من 1,000 ج.م', value: 'under_1000' },
    { text: '1,000 إلى 3,000 ج.م', value: '1000_3000' },
    { text: 'أكثر من 3,000 ج.م', value: 'over_3000' },
];

const MEALS_FILTER_OPTIONS = [
    { text: 'مشترك بالوجبات', value: 'has_meals' },
    { text: 'بدون وجبات', value: 'no_meals' },
    { text: '4 أفراد (الافتراضي)', value: '4_persons' },
    { text: 'أكثر من 4 أفراد', value: 'more_than_4' },
];

const FINANCIALS_FILTER_OPTIONS = [
    { text: 'مسدد بالكامل (خالص)', value: 'Fully Paid' },
    { text: 'مسدد جزئياً', value: 'Partially Paid' },
    { text: 'غير مسدد', value: 'Unpaid' },
    { text: 'يوجد متبقي مستحق (> 0 ج.م)', value: 'has_balance' },
    { text: 'خالص (المتبقي 0 ج.م)', value: 'zero_balance' },
];
const FINANCIAL_FILTER_OPTIONS = FINANCIALS_FILTER_OPTIONS;

// ── Custom Filter Dropdowns ──

const UnitFilterDropdown = ({
    selectedKeys,
    setSelectedKeys,
    confirm,
    clearFilters,
    availableSectors,
}: FilterDropdownProps & { availableSectors: string[] }) => {
    const inputRef = useRef<InputRef>(null);

    const currentKeys = (selectedKeys as string[]) || [];
    let queryVal = '';
    let occVal: string | null = null;
    const selectedSectors = new Set<string>();

    for (const k of currentKeys) {
        if (k.startsWith('q:')) queryVal = k.slice(2);
        else if (k.startsWith('occ:')) occVal = k.slice(4);
        else if (k.startsWith('sec:')) selectedSectors.add(k.slice(4));
    }

    const [tempQuery, setTempQuery] = useState(queryVal);
    const [tempOcc, setTempOcc] = useState<string | null>(occVal);
    const [tempSectors, setTempSectors] = useState<Set<string>>(new Set(selectedSectors));

    useEffect(() => {
        let q = '';
        let o: string | null = null;
        const s = new Set<string>();
        for (const k of currentKeys) {
            if (k.startsWith('q:')) q = k.slice(2);
            else if (k.startsWith('occ:')) o = k.slice(4);
            else if (k.startsWith('sec:')) s.add(k.slice(4));
        }
        setTempQuery(q);
        setTempOcc(o);
        setTempSectors(s);
    }, [selectedKeys]);

    const handleApply = () => {
        const nextKeys: string[] = [];
        if (tempQuery.trim()) nextKeys.push(`q:${tempQuery.trim()}`);
        if (tempOcc) nextKeys.push(`occ:${tempOcc}`);
        tempSectors.forEach((sec) => nextKeys.push(`sec:${sec}`));
        setSelectedKeys(nextKeys);
        confirm();
    };

    const handleReset = () => {
        setTempQuery('');
        setTempOcc(null);
        setTempSectors(new Set());
        clearFilters?.({ confirm: true });
    };

    const toggleSector = (sec: string) => {
        setTempSectors((prev) => {
            const next = new Set(prev);
            if (next.has(sec)) next.delete(sec);
            else next.add(sec);
            return next;
        });
    };

    return (
        <div
            className="p-3 w-[275px] space-y-2.5 text-xs bg-popover text-popover-foreground rounded-xl border shadow-md"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
        >
            <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    بحث برقم أو اسم الوحدة
                </label>
                <AntInput
                    ref={inputRef}
                    size="small"
                    placeholder="مثال: 101 أو فيلا 3..."
                    value={tempQuery}
                    onChange={(e) => setTempQuery(e.target.value)}
                    onPressEnter={handleApply}
                    allowClear
                    className="text-xs"
                />
            </div>

            <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    حالة الإشغال
                </label>
                <div className="flex flex-wrap gap-1">
                    {[
                        { label: 'الكل', val: null },
                        { label: 'شاغر فقط', val: 'vacant' },
                        { label: 'محجوز فقط', val: 'reserved' },
                        { label: 'حجوزات متعددة', val: 'multi' },
                    ].map((item) => {
                        const isSelected = tempOcc === item.val;
                        return (
                            <button
                                key={item.label}
                                type="button"
                                onClick={() => setTempOcc(isSelected ? null : item.val)}
                                className={`cursor-pointer px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                                    isSelected
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-muted/40 hover:bg-muted text-foreground border-border'
                                }`}
                            >
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {availableSectors.length > 0 && (
                <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                        تصفية حسب القطاع
                    </label>
                    <div className="max-h-32 overflow-y-auto space-y-1 p-1 bg-muted/20 rounded-lg border border-border/50">
                        {availableSectors.map((sec) => {
                            const checked = tempSectors.has(sec);
                            return (
                                <label
                                    key={sec}
                                    className="flex items-center gap-2 px-1.5 py-0.5 rounded hover:bg-muted/50 cursor-pointer text-xs"
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleSector(sec)}
                                        className="rounded border-border accent-primary cursor-pointer"
                                    />
                                    <span className="truncate">{sec}</span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
                <AntButton
                    type="primary"
                    size="small"
                    onClick={handleApply}
                    className="text-xs flex-1"
                >
                    تطبيق
                </AntButton>
                <AntButton
                    size="small"
                    onClick={handleReset}
                    className="text-xs"
                >
                    إعادة تعيين
                </AntButton>
            </div>
        </div>
    );
};

const GuestSearchDropdown = ({
    selectedKeys,
    setSelectedKeys,
    confirm,
    clearFilters,
}: FilterDropdownProps) => {
    const inputRef = useRef<InputRef>(null);

    const currentKeys = (selectedKeys as string[]) || [];
    let queryVal = '';
    let tagVal: string | null = null;

    for (const k of currentKeys) {
        if (k.startsWith('q:')) queryVal = k.slice(2);
        else if (k.startsWith('tag:')) tagVal = k.slice(4);
    }

    const [tempQuery, setTempQuery] = useState(queryVal);
    const [tempTag, setTempTag] = useState<string | null>(tagVal);

    useEffect(() => {
        let q = '';
        let t: string | null = null;
        for (const k of currentKeys) {
            if (k.startsWith('q:')) q = k.slice(2);
            else if (k.startsWith('tag:')) t = k.slice(4);
        }
        setTempQuery(q);
        setTempTag(t);
    }, [selectedKeys]);

    const handleApply = () => {
        const nextKeys: string[] = [];
        if (tempQuery.trim()) nextKeys.push(`q:${tempQuery.trim()}`);
        if (tempTag) nextKeys.push(`tag:${tempTag}`);
        setSelectedKeys(nextKeys);
        confirm();
    };

    const handleReset = () => {
        setTempQuery('');
        setTempTag(null);
        clearFilters?.({ confirm: true });
    };

    return (
        <div
            className="p-3 w-[265px] space-y-2.5 text-xs bg-popover text-popover-foreground rounded-xl border shadow-md"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
        >
            <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    بحث باسم أو هاتف أو كود النزيل
                </label>
                <AntInput
                    ref={inputRef}
                    size="small"
                    placeholder="ابحث..."
                    value={tempQuery}
                    onChange={(e) => setTempQuery(e.target.value)}
                    onPressEnter={handleApply}
                    allowClear
                    className="text-xs"
                />
            </div>

            <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    فلاتر سريعة
                </label>
                <div className="flex flex-wrap gap-1">
                    {[
                        { label: 'كود عسكري فقط', val: 'mil_code' },
                        { label: 'برقم هاتف', val: 'phone' },
                        { label: 'بدون هاتف', val: 'no_phone' },
                    ].map((item) => {
                        const isSelected = tempTag === item.val;
                        return (
                            <button
                                key={item.val}
                                type="button"
                                onClick={() => setTempTag(isSelected ? null : item.val)}
                                className={`cursor-pointer px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                                    isSelected
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-muted/40 hover:bg-muted text-foreground border-border'
                                }`}
                            >
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
                <AntButton
                    type="primary"
                    size="small"
                    onClick={handleApply}
                    icon={<Search className="h-3 w-3" />}
                    className="text-xs flex-1"
                >
                    بحث
                </AntButton>
                <AntButton
                    size="small"
                    onClick={handleReset}
                    className="text-xs"
                >
                    إعادة تعيين
                </AntButton>
            </div>
        </div>
    );
};

const PeriodFilterDropdown = ({
    selectedKeys,
    setSelectedKeys,
    confirm,
    clearFilters,
}: FilterDropdownProps) => {
    const currentKeys = (selectedKeys as string[]) || [];
    let dateVal = '';
    let nightsVal: string | null = null;

    for (const k of currentKeys) {
        if (k.startsWith('date:')) dateVal = k.slice(5);
        else if (k.startsWith('nights:')) nightsVal = k.slice(7);
    }

    const [tempDate, setTempDate] = useState(dateVal);
    const [tempNights, setTempNights] = useState<string | null>(nightsVal);

    useEffect(() => {
        let d = '';
        let n: string | null = null;
        for (const k of currentKeys) {
            if (k.startsWith('date:')) d = k.slice(5);
            else if (k.startsWith('nights:')) n = k.slice(7);
        }
        setTempDate(d);
        setTempNights(n);
    }, [selectedKeys]);

    const handleApply = () => {
        const nextKeys: string[] = [];
        if (tempDate.trim()) nextKeys.push(`date:${tempDate.trim()}`);
        if (tempNights) nextKeys.push(`nights:${tempNights}`);
        setSelectedKeys(nextKeys);
        confirm();
    };

    const handleReset = () => {
        setTempDate('');
        setTempNights(null);
        clearFilters?.({ confirm: true });
    };

    return (
        <div
            className="p-3 w-[265px] space-y-2.5 text-xs bg-popover text-popover-foreground rounded-xl border shadow-md"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
        >
            <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    بحث بتاريخ الوصول أو المغادرة
                </label>
                <AntInput
                    size="small"
                    placeholder="مثال: 2026-09 أو 09-08..."
                    value={tempDate}
                    onChange={(e) => setTempDate(e.target.value)}
                    onPressEnter={handleApply}
                    allowClear
                    className="text-xs"
                />
            </div>

            <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    عدد الليالي
                </label>
                <div className="flex flex-wrap gap-1">
                    {[
                        { label: 'ليلة واحدة (1)', val: '1' },
                        { label: 'ليلتان (2)', val: '2' },
                        { label: '3 إلى 5 ليالٍ', val: '3_5' },
                        { label: 'أكثر من 5 ليالٍ', val: '6_plus' },
                    ].map((item) => {
                        const isSelected = tempNights === item.val;
                        return (
                            <button
                                key={item.val}
                                type="button"
                                onClick={() => setTempNights(isSelected ? null : item.val)}
                                className={`cursor-pointer px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                                    isSelected
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-muted/40 hover:bg-muted text-foreground border-border'
                                }`}
                            >
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
                <AntButton
                    type="primary"
                    size="small"
                    onClick={handleApply}
                    className="text-xs flex-1"
                >
                    تطبيق
                </AntButton>
                <AntButton
                    size="small"
                    onClick={handleReset}
                    className="text-xs"
                >
                    إعادة تعيين
                </AntButton>
            </div>
        </div>
    );
};

const ExtraFeesFilterDropdown = ({
    selectedKeys,
    setSelectedKeys,
    confirm,
    clearFilters,
}: FilterDropdownProps) => {
    const currentKeys = (selectedKeys as string[]) || [];
    let queryVal = '';
    let tagVal: string | null = null;

    for (const k of currentKeys) {
        if (k.startsWith('q:')) queryVal = k.slice(2);
        else if (k.startsWith('tag:')) tagVal = k.slice(4);
    }

    const [tempQuery, setTempQuery] = useState(queryVal);
    const [tempTag, setTempTag] = useState<string | null>(tagVal);

    useEffect(() => {
        let q = '';
        let t: string | null = null;
        for (const k of currentKeys) {
            if (k.startsWith('q:')) q = k.slice(2);
            else if (k.startsWith('tag:')) t = k.slice(4);
        }
        setTempQuery(q);
        setTempTag(t);
    }, [selectedKeys]);

    const handleApply = () => {
        const nextKeys: string[] = [];
        if (tempQuery.trim()) nextKeys.push(`q:${tempQuery.trim()}`);
        if (tempTag) nextKeys.push(`tag:${tempTag}`);
        setSelectedKeys(nextKeys);
        confirm();
    };

    const handleReset = () => {
        setTempQuery('');
        setTempTag(null);
        clearFilters?.({ confirm: true });
    };

    return (
        <div
            className="p-3 w-[265px] space-y-2.5 text-xs bg-popover text-popover-foreground rounded-xl border shadow-md"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
        >
            <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    بحث في بيان الرسوم الإضافية
                </label>
                <AntInput
                    size="small"
                    placeholder="مثال: تلفيات، مرافقين..."
                    value={tempQuery}
                    onChange={(e) => setTempQuery(e.target.value)}
                    onPressEnter={handleApply}
                    allowClear
                    className="text-xs"
                />
            </div>

            <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    حالة الرسوم
                </label>
                <div className="flex flex-wrap gap-1">
                    {[
                        { label: 'يوجد رسوم إضافية', val: 'has_fees' },
                        { label: 'بدون رسوم إضافية', val: 'no_fees' },
                    ].map((item) => {
                        const isSelected = tempTag === item.val;
                        return (
                            <button
                                key={item.val}
                                type="button"
                                onClick={() => setTempTag(isSelected ? null : item.val)}
                                className={`cursor-pointer px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                                    isSelected
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-muted/40 hover:bg-muted text-foreground border-border'
                                }`}
                            >
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
                <AntButton
                    type="primary"
                    size="small"
                    onClick={handleApply}
                    className="text-xs flex-1"
                >
                    تطبيق
                </AntButton>
                <AntButton
                    size="small"
                    onClick={handleReset}
                    className="text-xs"
                >
                    إعادة تعيين
                </AntButton>
            </div>
        </div>
    );
};

const NotesFilterDropdown = ({
    selectedKeys,
    setSelectedKeys,
    confirm,
    clearFilters,
}: FilterDropdownProps) => {
    const currentKeys = (selectedKeys as string[]) || [];
    let queryVal = '';
    let tagVal: string | null = null;

    for (const k of currentKeys) {
        if (k.startsWith('q:')) queryVal = k.slice(2);
        else if (k.startsWith('tag:')) tagVal = k.slice(4);
    }

    const [tempQuery, setTempQuery] = useState(queryVal);
    const [tempTag, setTempTag] = useState<string | null>(tagVal);

    useEffect(() => {
        let q = '';
        let t: string | null = null;
        for (const k of currentKeys) {
            if (k.startsWith('q:')) q = k.slice(2);
            else if (k.startsWith('tag:')) t = k.slice(4);
        }
        setTempQuery(q);
        setTempTag(t);
    }, [selectedKeys]);

    const handleApply = () => {
        const nextKeys: string[] = [];
        if (tempQuery.trim()) nextKeys.push(`q:${tempQuery.trim()}`);
        if (tempTag) nextKeys.push(`tag:${tempTag}`);
        setSelectedKeys(nextKeys);
        confirm();
    };

    const handleReset = () => {
        setTempQuery('');
        setTempTag(null);
        clearFilters?.({ confirm: true });
    };

    return (
        <div
            className="p-3 w-[265px] space-y-2.5 text-xs bg-popover text-popover-foreground rounded-xl border shadow-md"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
        >
            <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    بحث في الملاحظات
                </label>
                <AntInput
                    size="small"
                    placeholder="ابحث في نص الملاحظات..."
                    value={tempQuery}
                    onChange={(e) => setTempQuery(e.target.value)}
                    onPressEnter={handleApply}
                    allowClear
                    className="text-xs"
                />
            </div>

            <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    حالة الملاحظات
                </label>
                <div className="flex flex-wrap gap-1">
                    {[
                        { label: 'يوجد ملاحظات', val: 'has_notes' },
                        { label: 'بدون ملاحظات', val: 'no_notes' },
                    ].map((item) => {
                        const isSelected = tempTag === item.val;
                        return (
                            <button
                                key={item.val}
                                type="button"
                                onClick={() => setTempTag(isSelected ? null : item.val)}
                                className={`cursor-pointer px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                                    isSelected
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-muted/40 hover:bg-muted text-foreground border-border'
                                }`}
                            >
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
                <AntButton
                    type="primary"
                    size="small"
                    onClick={handleApply}
                    className="text-xs flex-1"
                >
                    تطبيق
                </AntButton>
                <AntButton
                    size="small"
                    onClick={handleReset}
                    className="text-xs"
                >
                    إعادة تعيين
                </AntButton>
            </div>
        </div>
    );
};

// ── Master Table Filter Function ──

function filterReservations(
    reservations: Reservation[],
    filteredInfo: Record<string, FilterValue | null>,
    unitCountMap?: Map<number, number>,
): Reservation[] {
    const keys = Object.keys(filteredInfo);
    if (keys.length === 0) return reservations;

    return reservations.filter((res) => {
        // 1. unit filter
        const unitKeys = filteredInfo.unit;
        if (unitKeys && unitKeys.length > 0) {
            const secKeys: string[] = [];
            let occFilter: 'vacant' | 'reserved' | 'multi' | null = null;
            let queryText = '';

            for (const k of unitKeys) {
                const s = String(k);
                if (s.startsWith('sec:')) secKeys.push(s.slice(4));
                else if (s.startsWith('occ:')) occFilter = s.slice(4) as any;
                else if (s.startsWith('q:')) queryText = s.slice(2).trim().toLowerCase();
            }

            if (secKeys.length > 0) {
                const resSector = (res.unit?.sector?.name ?? '').trim();
                if (!secKeys.includes(resSector)) return false;
            }

            if (occFilter === 'vacant' && res.id > 0) return false;
            if (occFilter === 'reserved' && res.id <= 0) return false;
            if (occFilter === 'multi') {
                const uid = res.unit_id || res.unit?.id;
                const count = uid ? (unitCountMap?.get(uid) ?? 0) : 0;
                if (count <= 1) return false;
            }

            if (queryText) {
                const unitName = (res.unit?.name ?? '').toLowerCase();
                const sectorName = (res.unit?.sector?.name ?? '').toLowerCase();
                if (!unitName.includes(queryText) && !sectorName.includes(queryText)) {
                    return false;
                }
            }
        }

        // 2. guest filter
        const guestKeys = filteredInfo.guest;
        if (guestKeys && guestKeys.length > 0) {
            if (res.id <= 0) return false;

            let queryText = '';
            let tagFilter: 'mil_code' | 'phone' | 'no_phone' | null = null;

            for (const k of guestKeys) {
                const s = String(k);
                if (s.startsWith('q:')) queryText = s.slice(2).trim().toLowerCase();
                else if (s.startsWith('tag:')) tagFilter = s.slice(4) as any;
            }

            if (tagFilter === 'mil_code' && !res.guest?.mil_code) return false;
            if (tagFilter === 'phone' && !res.guest?.phone) return false;
            if (tagFilter === 'no_phone' && res.guest?.phone) return false;

            if (queryText) {
                const name = (res.guest?.name ?? '').toLowerCase();
                const phone = (res.guest?.phone ?? '').toLowerCase();
                const mil = (res.guest?.mil_code ?? '').toLowerCase();
                if (!name.includes(queryText) && !phone.includes(queryText) && !mil.includes(queryText)) {
                    return false;
                }
            }
        }

        // 3. period filter
        const periodKeys = filteredInfo.period;
        if (periodKeys && periodKeys.length > 0) {
            if (res.id <= 0 || !res.check_in) return false;

            let queryText = '';
            let nightsFilter: '1' | '2' | '3_5' | '6_plus' | null = null;

            for (const k of periodKeys) {
                const s = String(k);
                if (s.startsWith('date:')) queryText = s.slice(5).trim().toLowerCase();
                else if (s.startsWith('nights:')) nightsFilter = s.slice(7) as any;
            }

            const n = res.nights_count ?? 0;
            if (nightsFilter === '1' && n !== 1) return false;
            if (nightsFilter === '2' && n !== 2) return false;
            if (nightsFilter === '3_5' && (n < 3 || n > 5)) return false;
            if (nightsFilter === '6_plus' && n <= 5) return false;

            if (queryText) {
                const inDate = (res.check_in ?? '').toLowerCase();
                const outDate = (res.check_out ?? '').toLowerCase();
                if (!inDate.includes(queryText) && !outDate.includes(queryText)) {
                    return false;
                }
            }
        }

        // 4. status filter
        const statusKeys = filteredInfo.status;
        if (statusKeys && statusKeys.length > 0) {
            const hasVacantMatch = statusKeys.includes('شاغر') && (res.id <= 0 || (res.status as string) === 'شاغر');
            const hasStatusMatch = res.id > 0 && statusKeys.includes(res.status);
            if (!hasVacantMatch && !hasStatusMatch) return false;
        }

        // 5. enter_from_gates filter
        const gateKeys = filteredInfo.enter_from_gates;
        if (gateKeys && gateKeys.length > 0) {
            if (res.id <= 0) return false;
            const entered = Boolean(res.enter_from_gates);
            const matches1 = gateKeys.includes('1') && entered;
            const matches0 = gateKeys.includes('0') && !entered;
            if (!matches1 && !matches0) return false;
        }

        // 6. membership filter
        const memberKeys = filteredInfo.membership;
        if (memberKeys && memberKeys.length > 0) {
            if (res.id <= 0) return false;
            const mem = res.membership ?? 'عضو';
            if (!memberKeys.includes(mem)) return false;
        }

        // 7. type filter
        const typeKeys = filteredInfo.type;
        if (typeKeys && typeKeys.length > 0) {
            if (res.id <= 0) return false;
            if (!typeKeys.includes(res.type)) return false;
        }

        // 8. accommodation_price filter
        const accKeys = filteredInfo.accommodation_price;
        if (accKeys && accKeys.length > 0) {
            if (res.id <= 0) return false;
            const meals = Number(res.meals_total_price || 0);
            const fees = Number(res.extra_fees_total ?? (res.extra_fees || []).reduce((sum, f) => sum + Number(f.amount || 0), 0));
            const acc = Math.max(0, Math.round((Number(res.total_price || 0) - meals - fees) * 100) / 100);

            const match = accKeys.some((k) => {
                if (k === 'zero') return acc === 0;
                if (k === 'under_1000') return acc > 0 && acc < 1000;
                if (k === '1000_3000') return acc >= 1000 && acc <= 3000;
                if (k === 'over_3000') return acc > 3000;
                return false;
            });
            if (!match) return false;
        }

        // 9. meals_price filter
        const mealsKeys = filteredInfo.meals_price;
        if (mealsKeys && mealsKeys.length > 0) {
            if (res.id <= 0) return false;
            const meals = Number(res.meals_total_price || 0);
            const hasMeals = Boolean(res.has_meals && meals > 0);
            const persons = res.meals_persons_count || 4;

            const match = mealsKeys.some((k) => {
                if (k === 'has_meals') return hasMeals;
                if (k === 'no_meals') return !hasMeals;
                if (k === '4_persons') return hasMeals && persons === 4;
                if (k === 'more_than_4') return hasMeals && persons > 4;
                return false;
            });
            if (!match) return false;
        }

        // 10. extra_fees_price filter
        const feesKeys = filteredInfo.extra_fees_price;
        if (feesKeys && feesKeys.length > 0) {
            if (res.id <= 0) return false;
            const fees = Number(res.extra_fees_total ?? (res.extra_fees || []).reduce((sum, f) => sum + Number(f.amount || 0), 0));
            let queryText = '';
            let tagFilter: 'has_fees' | 'no_fees' | null = null;

            for (const k of feesKeys) {
                const s = String(k);
                if (s.startsWith('q:')) queryText = s.slice(2).trim().toLowerCase();
                else if (s.startsWith('tag:')) tagFilter = s.slice(4) as any;
            }

            if (tagFilter === 'has_fees' && fees <= 0) return false;
            if (tagFilter === 'no_fees' && fees > 0) return false;

            if (queryText) {
                const hasDescMatch = (res.extra_fees || []).some((f) =>
                    (f.description ?? '').toLowerCase().includes(queryText),
                );
                if (!hasDescMatch) return false;
            }
        }

        // 11. financials_total filter
        const totalKeys = filteredInfo.financials_total;
        if (totalKeys && totalKeys.length > 0) {
            if (res.id <= 0) return false;
            const balance = Number(res.balance || 0);
            const status = res.payment_status;

            const match = totalKeys.some((k) => {
                if (k === 'Fully Paid') return status === 'Fully Paid' || balance <= 0;
                if (k === 'Partially Paid') return status === 'Partially Paid';
                if (k === 'Unpaid') return status === 'Unpaid';
                if (k === 'has_balance') return balance > 0;
                if (k === 'zero_balance') return balance <= 0;
                return false;
            });
            if (!match) return false;
        }

        // 12. notes filter
        const notesKeys = filteredInfo.notes;
        if (notesKeys && notesKeys.length > 0) {
            if (res.id <= 0) return false;
            const noteText = (res.notes ?? '').trim();
            let queryText = '';
            let tagFilter: 'has_notes' | 'no_notes' | null = null;

            for (const k of notesKeys) {
                const s = String(k);
                if (s.startsWith('q:')) queryText = s.slice(2).trim().toLowerCase();
                else if (s.startsWith('tag:')) tagFilter = s.slice(4) as any;
            }

            if (tagFilter === 'has_notes' && noteText.length === 0) return false;
            if (tagFilter === 'no_notes' && noteText.length > 0) return false;

            if (queryText) {
                if (!noteText.toLowerCase().includes(queryText)) return false;
            }
        }

        return true;
    });
}

// ── Scoped CSS (extracted to module level to avoid re-creation) ──

const TABLE_STYLES = `
    .antd-reservations-table .ant-table-cell {
        padding: 6px 10px !important;
        white-space: nowrap !important;
        vertical-align: middle !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
    }
    /* Guarantee that all sticky/fixed columns have 100% solid, opaque backgrounds */
    .antd-reservations-table .ant-table-cell-fix-left,
    .antd-reservations-table .ant-table-cell-fix-right {
        background-color: #ffffff !important;
        z-index: 2 !important;
    }
    .dark .antd-reservations-table .ant-table-cell-fix-left,
    .dark .antd-reservations-table .ant-table-cell-fix-right {
        background-color: #141414 !important;
        z-index: 2 !important;
    }
    .antd-reservations-table .ant-table-row:hover > .ant-table-cell-fix-left,
    .antd-reservations-table .ant-table-row:hover > .ant-table-cell-fix-right {
        background-color: #f8fafc !important;
    }
    .dark .antd-reservations-table .ant-table-row:hover > .ant-table-cell-fix-left,
    .dark .antd-reservations-table .ant-table-row:hover > .ant-table-cell-fix-right {
        background-color: #1f1f23 !important;
    }

    /* Merged multi-reservation unit cell: 100% solid opaque background to prevent bleed-through on horizontal scroll */
    .antd-reservations-table .ant-table-cell.antd-merged-unit-cell {
        background-color: #faf5ff !important;
        border-right: 3px solid #9333ea !important;
        z-index: 3 !important;
    }
    .dark .antd-reservations-table .ant-table-cell.antd-merged-unit-cell {
        background-color: #1a1025 !important;
        border-right: 3px solid #a855f7 !important;
        z-index: 3 !important;
    }
    .antd-reservations-table .ant-table-row:hover > .ant-table-cell.antd-merged-unit-cell {
        background-color: #f3e8ff !important;
    }
    .dark .antd-reservations-table .ant-table-row:hover > .ant-table-cell.antd-merged-unit-cell {
        background-color: #241436 !important;
    }

    /* Multi-reservation non-fixed rows subtle tint */
    .antd-reservations-table tr.antd-multi-res-row > td:not(.ant-table-cell-fix-left):not(.ant-table-cell-fix-right) {
        background-color: rgba(147, 51, 234, 0.015);
    }
    .dark .antd-reservations-table tr.antd-multi-res-row > td:not(.ant-table-cell-fix-left):not(.ant-table-cell-fix-right) {
        background-color: rgba(147, 51, 234, 0.03);
    }

    /* Vacant row solid fixed cell styling */
    .antd-reservations-table .ant-table-row.antd-vacant-row > td.ant-table-cell-fix-left,
    .antd-reservations-table .ant-table-row.antd-vacant-row > td.ant-table-cell-fix-right {
        background-color: #fafafa !important;
    }
    .dark .antd-reservations-table .ant-table-row.antd-vacant-row > td.ant-table-cell-fix-left,
    .dark .antd-reservations-table .ant-table-row.antd-vacant-row > td.ant-table-cell-fix-right {
        background-color: #18181b !important;
    }
    .antd-reservations-table .ant-table-thead > tr > th {
        padding: 8px 10px !important;
        white-space: nowrap !important;
        font-size: 12px !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
    }
    .antd-reservations-table .ant-table-filter-column {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 4px !important;
        width: 100% !important;
    }
    .antd-reservations-table .ant-table-filter-trigger {
        color: #94a3b8;
        transition: all 0.2s ease;
        border-radius: 4px;
        padding: 2px 3px;
        margin: 0 -2px;
    }
    .antd-reservations-table .ant-table-filter-trigger:hover {
        color: #0284c7;
        background-color: rgba(2, 132, 199, 0.12);
    }
    .antd-reservations-table .ant-table-filter-trigger.active {
        color: #0284c7 !important;
        background-color: rgba(2, 132, 199, 0.2) !important;
    }
    .dark .antd-reservations-table .ant-table-filter-trigger {
        color: #64748b;
    }
    .dark .antd-reservations-table .ant-table-filter-trigger:hover {
        color: #38bdf8;
        background-color: rgba(56, 189, 248, 0.15);
    }
    .dark .antd-reservations-table .ant-table-filter-trigger.active {
        color: #38bdf8 !important;
        background-color: rgba(56, 189, 248, 0.25) !important;
    }
    .antd-reservations-table .ant-table-body,
    .antd-reservations-table .rc-virtual-list-holder {
        overflow-x: auto !important;
        will-change: transform;
    }
    .antd-reservations-table .rc-virtual-list-holder-inner {
        will-change: transform;
    }
    .antd-reservations-table .ant-table-body::-webkit-scrollbar,
    .antd-reservations-table .rc-virtual-list-holder::-webkit-scrollbar {
        height: 8px;
    }
    .antd-reservations-table .ant-table-body::-webkit-scrollbar-thumb,
    .antd-reservations-table .rc-virtual-list-holder::-webkit-scrollbar-thumb {
        background: rgba(150, 150, 150, 0.35);
        border-radius: 4px;
    }
    .antd-reservations-table .ant-table-body::-webkit-scrollbar-thumb:hover,
    .antd-reservations-table .rc-virtual-list-holder::-webkit-scrollbar-thumb:hover {
        background: rgba(150, 150, 150, 0.6);
    }
    .antd-reservations-table .ant-table-row.antd-vacant-row > td:not(.ant-table-cell-fix-left):not(.ant-table-cell-fix-right) {
        background-color: rgba(0, 0, 0, 0.015) !important;
    }
    .dark .antd-reservations-table .ant-table-row.antd-vacant-row > td:not(.ant-table-cell-fix-left):not(.ant-table-cell-fix-right) {
        background-color: rgba(255, 255, 255, 0.02) !important;
    }
    .antd-reservations-table .ant-table-row.antd-vacant-row:hover > td:not(.ant-table-cell-fix-left):not(.ant-table-cell-fix-right) {
        background-color: rgba(16, 185, 129, 0.04) !important;
    }
`;

// ── Empty state locale (stable reference) ──

const TABLE_LOCALE = {
    emptyText: (
        <div className="flex flex-col items-center justify-center gap-2 py-8">
            <div className="bg-muted/60 rounded-full p-3">
                <Calendar className="text-muted-foreground/60 h-6 w-6" />
            </div>
            <p className="text-foreground font-medium">
                لا توجد حجوزات مسجلة
            </p>
            <p className="text-muted-foreground text-xs">
                لا توجد بيانات مطابقة لمعايير البحث والفلترة
                المحددة.
            </p>
        </div>
    ),
};

// ── Phone icon (stable reference to avoid re-creating on every render) ──
const PHONE_ICON = <Phone className="h-2.5 w-2.5 shrink-0 opacity-70" />;
const SHIELD_ICON = <Shield className="h-2.5 w-2.5 shrink-0 opacity-70" />;

/**
 * Rebuilt Reservation Table View using Ant Design Table with RTL,
 * expandable payment histories, in-cell inline edits, sorting, and summary metrics.
 *
 * Performance optimizations:
 * - InlineTextEdit wrapped in React.memo
 * - All handlers stabilized with useCallback
 * - Column definitions memoized with minimal dependencies
 * - Badge/option helpers extracted to module level
 * - Static JSX (locale, styles, icons) hoisted outside render
 */
export function ReservationAntdTableView({
    reservations,
    units,
    sectorId,
    sectorIds,
    search,
    statusFilter,
    statusFilters,
    paymentStatusFilter,
    onEdit,
    onStatusUpdate,
    onReservationUpdate,
    onGuestUpdate,
    onDelete,
    onRecordPayment,
    onViewGuestDetails,
    onBookUnit,
    onPrint,
    loading = false,
}: ReservationTableViewProps) {
    const { auth } = usePage<SharedProps>().props;
    const user = auth?.user;
    const userPermissions = user?.permissions ?? [];
    const userRoles = user?.roles ?? [];

    // Memoize permission checks so they only recompute when auth changes
    const { canEditReservation, canUpdateStatus, canEditGuest, canDeletePayment, canCreatePayment } = useMemo(() => {
        const isSuperAdmin = userRoles.includes('Super Admin');
        const isAdmin = userRoles.includes('Admin');
        const isReceptionist = userRoles.includes('Receptionist');

        const _canEditReservation =
            isSuperAdmin ||
            isAdmin ||
            isReceptionist ||
            userPermissions.includes('reservations.edit');

        const _canUpdateStatus =
            _canEditReservation ||
            userPermissions.includes('reservations.update_status');

        const _canEditGuest =
            isSuperAdmin ||
            isAdmin ||
            isReceptionist ||
            userPermissions.includes('guests.manage') ||
            _canEditReservation;

        const _canDeletePayment =
            isSuperAdmin ||
            isAdmin ||
            userPermissions.includes('payments.delete');

        const _canCreatePayment =
            isSuperAdmin ||
            isAdmin ||
            isReceptionist ||
            userPermissions.includes('payments.create');

        return {
            canEditReservation: _canEditReservation,
            canUpdateStatus: _canUpdateStatus,
            canEditGuest: _canEditGuest,
            canDeletePayment: _canDeletePayment,
            canCreatePayment: _canCreatePayment,
        };
    }, [userRoles, userPermissions]);

    // Check if the current user has edit permission for a specific reservation's sector
    const hasSectorEditAccess = useCallback(
        (res: Reservation) => {
            if (user?.has_full_sector_access) return true;
            const sectorId = res.unit?.sector_id ?? res.unit?.sector?.id;
            if (!sectorId) return false;
            return user?.editable_sector_ids?.includes(sectorId) ?? false;
        },
        [user?.has_full_sector_access, user?.editable_sector_ids],
    );

    // Local state for optimistic updates
    const [localReservations, setLocalReservations] =
        useState<Reservation[]>(reservations);

    useEffect(() => {
        setLocalReservations(reservations);
    }, [reservations]);

    // Permanently sort all resort units (with reservations or vacant) by sector arrangement, then unit
    const sortedReservations = useMemo(() => {
        if (!units || units.length === 0) {
            return [...localReservations].sort(compareReservationsBySectorAndUnit);
        }

        const reservedUnitIds = new Set<number>();
        for (let i = 0; i < localReservations.length; i++) {
            const uid = localReservations[i].unit_id;
            if (uid) {
                reservedUnitIds.add(uid);
            }
        }

        let candidateUnits = units;

        // Apply sector filter to vacant units if specified
        if (sectorIds && sectorIds.length > 0 && !sectorIds.includes('all')) {
            candidateUnits = candidateUnits.filter(
                (u) => sectorIds.includes(String(u.sector_id)),
            );
        } else if (sectorId && sectorId !== 'all') {
            candidateUnits = candidateUnits.filter(
                (u) => String(u.sector_id) === String(sectorId),
            );
        }

        // Apply search filter to vacant units if specified (matches unit name or sector name)
        const trimmedSearch = (search || '').trim().toLowerCase();
        if (trimmedSearch) {
            candidateUnits = candidateUnits.filter((u) => {
                const unitName = (u.name || '').toLowerCase();
                const sectorName = (u.sector?.name || '').toLowerCase();
                return (
                    unitName.includes(trimmedSearch) ||
                    sectorName.includes(trimmedSearch)
                );
            });
        }

        // Include vacant units unless an exclusive status or payment filter is active
        const isStatusFilterActive =
            (statusFilters && statusFilters.length > 0 && !statusFilters.includes('all')) ||
            (statusFilter && statusFilter !== 'all');
        const isPaymentFilterActive =
            paymentStatusFilter && paymentStatusFilter !== 'all';

        const vacantRows: Reservation[] = [];

        if (!isStatusFilterActive && !isPaymentFilterActive) {
            for (let i = 0; i < candidateUnits.length; i++) {
                const unit = candidateUnits[i];
                if (!reservedUnitIds.has(unit.id)) {
                    vacantRows.push({
                        id: -unit.id,
                        guest_id: 0,
                        unit_id: unit.id,
                        check_in: '',
                        check_out: '',
                        status: 'شاغر' as any,
                        type: 'منتجع' as any,
                        total_price: 0,
                        paid_amount: 0,
                        balance: 0,
                        nights_count: 0,
                        payment_status: 'Unpaid',
                        notes: null,
                        unit: unit,
                        payments: [],
                        created_at: unit.created_at || '',
                        updated_at: unit.updated_at || '',
                    });
                }
            }
        }

        return [...localReservations, ...vacantRows].sort(
            compareReservationsBySectorAndUnit,
        );
    }, [
        localReservations,
        units,
        sectorId,
        sectorIds,
        search,
        statusFilter,
        statusFilters,
        paymentStatusFilter,
    ]);

    // State for Ant Design column header filters
    const [filteredInfo, setFilteredInfo] = useState<Record<string, FilterValue | null>>({});

    // Available sectors for the Unit/Sector filter dropdown
    const availableSectors = useMemo(() => {
        const set = new Set<string>();
        (units || []).forEach((u) => {
            if (u.sector?.name) {
                set.add(u.sector.name);
            }
        });
        localReservations.forEach((r) => {
            const secName = r.unit?.sector?.name;
            if (secName) {
                set.add(secName);
            }
        });
        return Array.from(set);
    }, [units, localReservations]);

    // Base unit reservation count map before client-side header filtering (for multi-res tag filter)
    const baseUnitCountMap = useMemo(() => {
        const map = new Map<number, number>();
        for (let i = 0; i < sortedReservations.length; i++) {
            const r = sortedReservations[i];
            if (r.id > 0) {
                const uid = r.unit_id || r.unit?.id || 0;
                if (uid) {
                    map.set(uid, (map.get(uid) || 0) + 1);
                }
            }
        }
        return map;
    }, [sortedReservations]);

    // Filtered reservations displayed in the table
    const displayReservations = useMemo(() => {
        return filterReservations(sortedReservations, filteredInfo, baseUnitCountMap);
    }, [sortedReservations, filteredInfo, baseUnitCountMap]);

    // Count active column filters for pill badge in toolbar
    const activeFilterCount = useMemo(() => {
        return Object.values(filteredInfo).filter((val) => val && val.length > 0).length;
    }, [filteredInfo]);

    // Reset all column header filters
    const handleClearAllFilters = useCallback(() => {
        setFilteredInfo({});
    }, []);

    // Handle Ant Design Table onChange for filter updates
    const handleTableChange = useCallback(
        (_pagination: any, filters: Record<string, FilterValue | null>) => {
            setFilteredInfo(filters);
        },
        [],
    );

    // Precalculate rowSpan for grouping reservations of the same unit based on displayReservations
    const unitSpanMap = useMemo(() => {
        const map = new Map<
            number,
            { rowSpan: number; totalCount: number; isFirst: boolean; unitId: number }
        >();
        let i = 0;
        while (i < displayReservations.length) {
            const cur = displayReservations[i];
            const unitId =
                cur.unit_id || cur.unit?.id || (cur.unit ? cur.unit.id : 0);
            let count = 1;
            while (
                i + count < displayReservations.length &&
                unitId !== 0 &&
                (displayReservations[i + count].unit_id ||
                    displayReservations[i + count].unit?.id) === unitId
            ) {
                count++;
            }

            // The first row of the unit gets rowSpan = count
            map.set(cur.id, {
                rowSpan: count,
                totalCount: count,
                isFirst: true,
                unitId,
            });

            // Subsequent rows get rowSpan = 0 (merged into the first row's unit cell)
            for (let j = 1; j < count; j++) {
                map.set(displayReservations[i + j].id, {
                    rowSpan: 0,
                    totalCount: count,
                    isFirst: false,
                    unitId,
                });
            }

            i += count;
        }
        return map;
    }, [displayReservations]);

    // Inertia standalone HTTP client for lightweight background updates
    type QuickUpdateData = {
        name?: string | null;
        phone?: string | null;
        mil_code?: string | null;
        status?: ReservationStatus | null;
        membership?: MembershipType | null;
        type?: ReservationType | null;
        notes?: string | null;
        [key: string]: string | number | boolean | null | undefined;
    };
    const http = useHttp<QuickUpdateData>({});

    // Track expanded rows (keys are reservation IDs)
    const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);

    // ── Stabilized handlers with useCallback ──
    // IMPORTANT: All HTTP side effects are kept OUTSIDE setLocalReservations
    // updater functions. React Strict Mode invokes updaters twice in dev,
    // which would fire duplicate network requests if side effects lived inside.

    const handleSaveGuestField = useCallback((
        guestId: number,
        field: 'name' | 'phone' | 'mil_code',
        value: string,
    ) => {
        const updatedValue = value || null;
        const fieldLabel =
            field === 'name'
                ? 'اسم النزيل'
                : field === 'phone'
                    ? 'رقم الهاتف'
                    : 'الكود العسكري';

        // Snapshot previous state for rollback before optimistic update
        const previous = [...localReservations];

        // Optimistic update (pure state transformation only)
        setLocalReservations((prev) =>
            prev.map((r) => {
                if (r.guest_id === guestId && r.guest) {
                    return {
                        ...r,
                        guest: {
                            ...r.guest,
                            [field]: updatedValue,
                        },
                    };
                }
                return r;
            }),
        );

        // Fire HTTP request outside the updater
        http.setData({ [field]: updatedValue });
        http.patch(`/guests/${guestId}`, {
            onSuccess: (response: any) => {
                toast.success(`تم تحديث ${fieldLabel} بنجاح`);
                if (response?.guest) {
                    setLocalReservations((prev2) =>
                        prev2.map((r) =>
                            r.guest_id === guestId
                                ? {
                                    ...r,
                                    guest: { ...r.guest, ...response.guest },
                                }
                                : r,
                        ),
                    );
                }
            },
            onError: (errors) => {
                setLocalReservations(previous);
                const firstError =
                    Object.values(errors)[0] || 'فشل تحديث بيانات النزيل';
                toast.error(String(firstError));
            },
            onHttpException: (res) => {
                setLocalReservations(previous);
                let message = 'فشل تحديث بيانات النزيل';
                try {
                    const parsed = JSON.parse(res.data);
                    if (parsed.message) message = parsed.message;
                } catch { }
                toast.error(message);
            },
        });
    }, [http, localReservations]);

    const handleStatusChange = useCallback((
        reservationId: number,
        newStatus: ReservationStatus,
    ) => {
        const previous = [...localReservations];

        setLocalReservations((prev) =>
            prev.map((r) =>
                r.id === reservationId ? { ...r, status: newStatus } : r,
            ),
        );

        http.setData({ status: newStatus });
        http.patch(`/reservations/${reservationId}/status`, {
            onSuccess: (response: any) => {
                toast.success(`تم تغيير حالة الحجز إلى "${newStatus}"`);
                if (response?.reservation) {
                    setLocalReservations((prev2) =>
                        prev2.map((r) =>
                            r.id === reservationId
                                ? { ...r, ...response.reservation }
                                : r,
                        ),
                    );
                }
            },
            onError: (errors) => {
                setLocalReservations(previous);
                const firstError =
                    Object.values(errors)[0] || 'فشل تحديث حالة الحجز';
                toast.error(String(firstError));
            },
            onHttpException: (res) => {
                setLocalReservations(previous);
                let message = 'فشل تحديث حالة الحجز';
                try {
                    const parsed = JSON.parse(res.data);
                    if (parsed.message) message = parsed.message;
                } catch { }
                toast.error(message);
            },
        });
    }, [http, localReservations]);

    const handleMembershipChange = useCallback((
        reservationId: number,
        newMembership: MembershipType,
    ) => {
        const previous = [...localReservations];

        setLocalReservations((prev) =>
            prev.map((r) =>
                r.id === reservationId
                    ? { ...r, membership: newMembership }
                    : r,
            ),
        );

        http.setData({ membership: newMembership });
        http.patch(`/reservations/${reservationId}/quick-update`, {
            onSuccess: (response: any) => {
                toast.success(`تم تحديث فئة الحجز إلى "${newMembership}"`);
                if (response?.reservation) {
                    setLocalReservations((prev2) =>
                        prev2.map((r) =>
                            r.id === reservationId
                                ? { ...r, ...response.reservation }
                                : r,
                        ),
                    );
                }
            },
            onError: (errors) => {
                setLocalReservations(previous);
                const firstError =
                    Object.values(errors)[0] || 'فشل تحديث فئة الحجز';
                toast.error(String(firstError));
            },
            onHttpException: (res) => {
                setLocalReservations(previous);
                let message = 'فشل تحديث فئة الحجز';
                try {
                    const parsed = JSON.parse(res.data);
                    if (parsed.message) message = parsed.message;
                } catch { }
                toast.error(message);
            },
        });
    }, [http, localReservations]);

    const handleTypeChange = useCallback((
        reservationId: number,
        newType: ReservationType,
    ) => {
        const previous = [...localReservations];

        setLocalReservations((prev) =>
            prev.map((r) =>
                r.id === reservationId ? { ...r, type: newType } : r,
            ),
        );

        http.setData({ type: newType });
        http.patch(`/reservations/${reservationId}/quick-update`, {
            onSuccess: (response: any) => {
                toast.success(`تم تحديث جهة الحجز إلى "${newType}"`);
                if (response?.reservation) {
                    setLocalReservations((prev2) =>
                        prev2.map((r) =>
                            r.id === reservationId
                                ? { ...r, ...response.reservation }
                                : r,
                        ),
                    );
                }
            },
            onError: (errors) => {
                setLocalReservations(previous);
                const firstError =
                    Object.values(errors)[0] || 'فشل تحديث جهة الحجز';
                toast.error(String(firstError));
            },
            onHttpException: (res) => {
                setLocalReservations(previous);
                let message = 'فشل تحديث جهة الحجز';
                try {
                    const parsed = JSON.parse(res.data);
                    if (parsed.message) message = parsed.message;
                } catch { }
                toast.error(message);
            },
        });
    }, [http, localReservations]);

    const handleGateChange = useCallback((
        reservationId: number,
        newGateValue: boolean,
    ) => {
        const previous = [...localReservations];

        setLocalReservations((prev) =>
            prev.map((r) =>
                r.id === reservationId ? { ...r, enter_from_gates: newGateValue } : r,
            ),
        );

        http.setData({ enter_from_gates: newGateValue });
        http.patch(`/reservations/${reservationId}/quick-update`, {
            onSuccess: (response: any) => {
                toast.success(
                    `تم تحديث دخول البوابة إلى "${newGateValue ? 'نعم' : 'لا'}"`,
                );
                if (response?.reservation) {
                    setLocalReservations((prev2) =>
                        prev2.map((r) =>
                            r.id === reservationId
                                ? { ...r, ...response.reservation }
                                : r,
                        ),
                    );
                }
                onReservationUpdate?.(reservationId, { enter_from_gates: newGateValue });
            },
            onError: (errors) => {
                setLocalReservations(previous);
                const firstError =
                    Object.values(errors)[0] || 'فشل تحديث حالة دخول البوابة';
                toast.error(String(firstError));
            },
            onHttpException: (res) => {
                setLocalReservations(previous);
                let message = 'فشل تحديث حالة دخول البوابة';
                try {
                    const parsed = JSON.parse(res.data);
                    if (parsed.message) message = parsed.message;
                } catch { }
                toast.error(message);
            },
        });
    }, [http, localReservations, onReservationUpdate]);

    const handleSaveNotes = useCallback((reservationId: number, newNotes: string) => {
        const updatedNotes = newNotes.trim() || null;
        const previous = [...localReservations];

        setLocalReservations((prev) =>
            prev.map((r) =>
                r.id === reservationId ? { ...r, notes: updatedNotes } : r,
            ),
        );

        http.setData({ notes: updatedNotes });
        http.patch(`/reservations/${reservationId}/quick-update`, {
            onSuccess: (response: any) => {
                toast.success('تم تحديث ملاحظات الحجز بنجاح');
                if (response?.reservation) {
                    setLocalReservations((prev2) =>
                        prev2.map((r) =>
                            r.id === reservationId
                                ? { ...r, ...response.reservation }
                                : r,
                        ),
                    );
                }
                onReservationUpdate?.(reservationId, { notes: updatedNotes });
            },
            onError: (errors) => {
                setLocalReservations(previous);
                const firstError =
                    Object.values(errors)[0] || 'فشل تحديث ملاحظات الحجز';
                toast.error(String(firstError));
            },
            onHttpException: (res) => {
                setLocalReservations(previous);
                let message = 'فشل تحديث ملاحظات الحجز';
                try {
                    const parsed = JSON.parse(res.data);
                    if (parsed.message) message = parsed.message;
                } catch { }
                toast.error(message);
            },
        });
    }, [http, localReservations, onReservationUpdate]);

    const { modal } = App.useApp();

    // Delete payment with modal confirmation
    const handleDeletePayment = useCallback((payment: Payment) => {
        modal.confirm({
            title: 'حذف الدفعة المالية',
            content: `هل أنت متأكد من رغبتك في حذف دفعة بقيمة ${Number(payment.amount).toLocaleString()} ج.م؟`,
            okText: 'نعم، احذف',
            cancelText: 'إلغاء',
            okButtonProps: { danger: true },
            onOk: () => {
                router.delete(`/payments/${payment.id}`, {
                    preserveScroll: true,
                });
            },
        });
    }, [modal]);

    // Columns for Ant Design Table with client-side header filters and search
    const columns: TableColumnsType<Reservation> = useMemo(
        () => [{
            title: 'الوحدة / القطاع',
            key: 'unit',
            fixed: 'left',
            width: 215,
            filteredValue: filteredInfo.unit || null,
            filterDropdown: (props) => (
                <UnitFilterDropdown {...props} availableSectors={availableSectors} />
            ),
            filterIcon: (filtered: boolean) => (
                <Search
                    className={`h-3.5 w-3.5 transition-colors ${
                        filtered ? 'text-primary font-bold' : 'text-muted-foreground/60'
                    }`}
                />
            ),
            sorter: compareReservationsBySectorAndUnit,
            defaultSortOrder: 'ascend',
            onCell: (record) => {
                const spanInfo = unitSpanMap.get(record.id);
                return {
                    rowSpan: spanInfo ? spanInfo.rowSpan : 1,
                    className:
                        (spanInfo?.totalCount ?? 1) > 1
                            ? 'antd-merged-unit-cell'
                            : undefined,
                };
            },
            shouldCellUpdate: (record, prevRecord) =>
                record.unit?.name !== prevRecord.unit?.name ||
                record.unit?.sector?.name !== prevRecord.unit?.sector?.name ||
                record.id !== prevRecord.id,
            render: (_, res) => {
                const spanInfo = unitSpanMap.get(res.id);
                const totalCount = spanInfo?.totalCount ?? 1;

                return (
                    <div className="flex min-w-0 items-center gap-1.5 text-xs whitespace-nowrap">
                        <span
                            className="text-foreground truncate font-semibold"
                            title={`${res.unit?.sector?.name ?? 'قطاع'} - ${res.unit?.name ?? 'غرفة'}`}
                        >
                            {res.unit?.sector?.name ?? 'قطاع'} -{' '}
                            {res.unit?.name ?? 'غرفة'}
                        </span>
                        <span className="text-muted-foreground shrink-0 text-[11px]">
                            (
                            {res.unit?.rooms_count
                                ? `${res.unit.rooms_count} ${res.unit.rooms_count === 1 ? 'غرفة' : 'غرف'}`
                                : 'غرفة واحدة'}
                            )
                        </span>
                        {totalCount > 1 && (
                            <Tag
                                color="purple"
                                className="m-0 shrink-0 px-1.5 py-0 text-[10px] font-medium"
                            >
                                {totalCount === 2
                                    ? 'حجزان'
                                    : `${totalCount} حجوزات`}
                            </Tag>
                        )}
                    </div>
                );
            },
        },
        {
            title: 'النزيل',
            key: 'guest',
            width: 490,
            filteredValue: filteredInfo.guest || null,
            filterDropdown: (props) => <GuestSearchDropdown {...props} />,
            filterIcon: (filtered: boolean) => (
                <Search
                    className={`h-3.5 w-3.5 transition-colors ${
                        filtered ? 'text-primary font-bold' : 'text-muted-foreground/60'
                    }`}
                />
            ),
            shouldCellUpdate: (record, prevRecord) =>
                record.guest?.name !== prevRecord.guest?.name ||
                record.guest?.phone !== prevRecord.guest?.phone ||
                record.guest?.mil_code !== prevRecord.guest?.mil_code ||
                record.guest_id !== prevRecord.guest_id ||
                record.id !== prevRecord.id,
            sorter: (a, b) => {
                const aName = a.guest?.name ?? '';
                const bName = b.guest?.name ?? '';
                return aName.localeCompare(bName, 'ar');
            },
            render: (_, res) => {
                if (res.id <= 0) {
                    return (
                        <div className="flex min-w-0 items-center gap-2 text-xs whitespace-nowrap">
                            <span className="text-muted-foreground/60 italic text-xs">
                                شاغرة — لا يوجد حجز
                            </span>
                        </div>
                    );
                }

                const canEditThisGuest = canEditGuest && hasSectorEditAccess(res);

                return (
                    <div className="flex min-w-0 items-center gap-2 text-xs whitespace-nowrap">
                        {/* Guest Name with optional profile view link */}
                        {res.guest_id && onViewGuestDetails ? (
                            <button
                                type="button"
                                onClick={() => onViewGuestDetails(res.guest_id)}
                                className="hover:bg-primary/10 hover:text-primary text-muted-foreground -m-0.5 shrink-0 cursor-pointer rounded p-1 transition-colors"
                                title="عرض ملف وسجل النزيل"
                            >
                                <User className="h-3.5 w-3.5" />
                            </button>
                        ) : (
                            <User className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                        )}

                        {res.guest_id ? (
                            <div className="max-w-[190px] shrink-0 truncate">
                                <InlineTextEdit
                                    value={res.guest?.name ?? ''}
                                    placeholder="اسم النزيل..."
                                    emptyLabel="غير محدد"
                                    canEdit={canEditThisGuest}
                                    onSave={(val) =>
                                        handleSaveGuestField(
                                            res.guest_id,
                                            'name',
                                            val,
                                        )
                                    }
                                    className="text-foreground font-semibold"
                                    inputClassName="w-42 font-semibold"
                                />
                            </div>
                        ) : (
                            <span className="text-muted-foreground shrink-0 text-xs">
                                غير محدد
                            </span>
                        )}

                        {res.guest_id && (
                            <>
                                <span className="text-muted-foreground/40 shrink-0 text-xs">
                                    •
                                </span>

                                {/* Guest Phone */}
                                <div className="shrink-0">
                                    <InlineTextEdit
                                        value={res.guest?.phone ?? ''}
                                        placeholder="الهاتف..."
                                        emptyLabel="بدون هاتف"
                                        icon={PHONE_ICON}
                                        canEdit={canEditThisGuest}
                                        onSave={(val) =>
                                            handleSaveGuestField(
                                                res.guest_id,
                                                'phone',
                                                val,
                                            )
                                        }
                                        className="text-muted-foreground text-xs"
                                        inputClassName="w-26"
                                    />
                                </div>

                                {(res.guest?.mil_code || canEditThisGuest) && (
                                    <>
                                        <span className="text-muted-foreground/40 shrink-0 text-xs">
                                            •
                                        </span>

                                        {/* Military Code */}
                                        <div className="shrink-0">
                                            <InlineTextEdit
                                                value={
                                                    res.guest?.mil_code ?? ''
                                                }
                                                placeholder="كود عسكري..."
                                                emptyLabel="+ كود"
                                                icon={SHIELD_ICON}
                                                canEdit={canEditThisGuest}
                                                onSave={(val) =>
                                                    handleSaveGuestField(
                                                        res.guest_id,
                                                        'mil_code',
                                                        val,
                                                    )
                                                }
                                                className="text-muted-foreground text-xs"
                                                inputClassName="w-22"
                                            />
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                );
            },
        },

        {
            title: 'الفترة (الوصول - المغادرة)',
            key: 'period',
            width: 255,
            filteredValue: filteredInfo.period || null,
            filterDropdown: (props) => <PeriodFilterDropdown {...props} />,
            filterIcon: (filtered: boolean) => (
                <Calendar
                    className={`h-3.5 w-3.5 transition-colors ${
                        filtered ? 'text-primary font-bold' : 'text-muted-foreground/60'
                    }`}
                />
            ),
            shouldCellUpdate: (record, prevRecord) =>
                record.check_in !== prevRecord.check_in ||
                record.check_out !== prevRecord.check_out ||
                record.nights_count !== prevRecord.nights_count ||
                record.id !== prevRecord.id,
            sorter: (a, b) => {
                const aTime = a.check_in ? new Date(a.check_in).getTime() : 0;
                const bTime = b.check_in ? new Date(b.check_in).getTime() : 0;
                return aTime - bTime;
            },
            render: (_, res) => {
                if (res.id <= 0 || !res.check_in) {
                    return <span className="text-muted-foreground/40 text-xs">—</span>;
                }

                return (
                    <div className="flex min-w-0 items-center gap-1.5 text-xs whitespace-nowrap">
                        <Calendar className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                        <span className="shrink-0 font-medium">
                            {res.check_in}
                        </span>
                        <span className="text-muted-foreground shrink-0">
                            ←
                        </span>
                        <span className="shrink-0 font-medium">
                            {res.check_out}
                        </span>
                        <Tag className="bg-muted/70 text-muted-foreground m-0 inline-flex shrink-0 items-center gap-0.5 border-0 px-1.5 py-0 text-[11px] font-medium">
                            <Clock className="h-2.5 w-2.5 opacity-70" />
                            <span>
                                {res.nights_count}{' '}
                                {res.nights_count === 1 ? 'ليلة' : 'ليالي'}
                            </span>
                        </Tag>
                    </div>
                );
            },
        },
        {
            title: 'الحالة',
            key: 'status',
            width: 145,
            filteredValue: filteredInfo.status || null,
            filters: STATUS_FILTER_OPTIONS,
            filterMultiple: true,
            filterSearch: false,
            filterIcon: (filtered: boolean) => (
                <Filter
                    className={`h-3.5 w-3.5 transition-colors ${
                        filtered ? 'text-primary font-bold' : 'text-muted-foreground/60'
                    }`}
                />
            ),
            shouldCellUpdate: (record, prevRecord) =>
                record.status !== prevRecord.status ||
                record.id !== prevRecord.id,
            sorter: (a, b) =>
                (a.status ?? '').localeCompare(b.status ?? '', 'ar'),
            render: (_, res) => {
                if (res.id <= 0) {
                    return (
                        <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border bg-muted/40 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-muted-foreground">
                            شاغر
                        </span>
                    );
                }

                if (!canUpdateStatus || !hasSectorEditAccess(res)) {
                    return getStatusBadge(res.status);
                }

                return (
                    <LazySelect<ReservationStatus>
                        value={res.status}
                        onChange={(val) => handleStatusChange(res.id, val)}
                        options={STATUS_OPTIONS}
                        displayRender={getStatusBadge}
                    />
                );
            },
        },
        {
            title: 'دخول البوابة',
            key: 'enter_from_gates',
            width: 120,
            filteredValue: filteredInfo.enter_from_gates || null,
            filters: GATE_FILTER_OPTIONS,
            filterMultiple: true,
            filterSearch: false,
            filterIcon: (filtered: boolean) => (
                <Filter
                    className={`h-3.5 w-3.5 transition-colors ${
                        filtered ? 'text-primary font-bold' : 'text-muted-foreground/60'
                    }`}
                />
            ),
            shouldCellUpdate: (record, prevRecord) =>
                record.enter_from_gates !== prevRecord.enter_from_gates ||
                record.id !== prevRecord.id,
            sorter: (a, b) => {
                const aVal = a.enter_from_gates ? 1 : 0;
                const bVal = b.enter_from_gates ? 1 : 0;
                return bVal - aVal;
            },
            render: (_, res) => {
                if (res.id <= 0) {
                    return <span className="text-muted-foreground/40 text-xs">—</span>;
                }

                if ((!canEditReservation && !canUpdateStatus) || !hasSectorEditAccess(res)) {
                    return getGateBadge(res.enter_from_gates);
                }

                return (
                    <LazySelect<string>
                        value={res.enter_from_gates ? 'true' : 'false'}
                        onChange={(val) => handleGateChange(res.id, val === 'true')}
                        options={GATE_OPTIONS}
                        displayRender={() => getGateBadge(res.enter_from_gates)}
                    />
                );
            },
        },
        {
            title: 'فئة الحجز',
            key: 'membership',
            width: 125,
            filteredValue: filteredInfo.membership || null,
            filters: MEMBERSHIP_FILTER_OPTIONS,
            filterMultiple: true,
            filterSearch: false,
            filterIcon: (filtered: boolean) => (
                <Filter
                    className={`h-3.5 w-3.5 transition-colors ${
                        filtered ? 'text-primary font-bold' : 'text-muted-foreground/60'
                    }`}
                />
            ),
            shouldCellUpdate: (record, prevRecord) =>
                record.membership !== prevRecord.membership ||
                record.id !== prevRecord.id,
            sorter: (a, b) =>
                (a.membership ?? '').localeCompare(
                    b.membership ?? '',
                    'ar',
                ),
            render: (_, res) => {
                if (res.id <= 0) {
                    return <span className="text-muted-foreground/40 text-xs">—</span>;
                }

                return (
                    <LazySelect<MembershipType>
                        value={(res.membership ?? 'عضو') as MembershipType}
                        onChange={(val) => handleMembershipChange(res.id, val)}
                        disabled={!canEditReservation || !hasSectorEditAccess(res)}
                        options={MEMBERSHIP_OPTIONS as { value: MembershipType; label: React.ReactNode }[]}
                    />
                );
            },
        },
        {
            title: 'جهة الحجز',
            key: 'type',
            width: 115,
            filteredValue: filteredInfo.type || null,
            filters: TYPE_FILTER_OPTIONS,
            filterMultiple: true,
            filterSearch: false,
            filterIcon: (filtered: boolean) => (
                <Filter
                    className={`h-3.5 w-3.5 transition-colors ${
                        filtered ? 'text-primary font-bold' : 'text-muted-foreground/60'
                    }`}
                />
            ),
            shouldCellUpdate: (record, prevRecord) =>
                record.type !== prevRecord.type ||
                record.id !== prevRecord.id,
            sorter: (a, b) =>
                (a.type ?? '').localeCompare(b.type ?? '', 'ar'),
            render: (_, res) => {
                if (res.id <= 0) {
                    return <span className="text-muted-foreground/40 text-xs">—</span>;
                }

                return (
                    <LazySelect<ReservationType>
                        value={res.type}
                        onChange={(val) => handleTypeChange(res.id, val)}
                        disabled={!canEditReservation || !hasSectorEditAccess(res)}
                        options={TYPE_OPTIONS as { value: ReservationType; label: React.ReactNode }[]}
                    />
                );
            },
        },
        {
            title: 'إقامة',
            key: 'accommodation_price',
            width: 120,
            filteredValue: filteredInfo.accommodation_price || null,
            filters: ACCOMMODATION_FILTER_OPTIONS,
            filterMultiple: true,
            filterSearch: false,
            filterIcon: (filtered: boolean) => (
                <Filter
                    className={`h-3.5 w-3.5 transition-colors ${
                        filtered ? 'text-primary font-bold' : 'text-muted-foreground/60'
                    }`}
                />
            ),
            shouldCellUpdate: (record, prevRecord) =>
                record.total_price !== prevRecord.total_price ||
                record.meals_total_price !== prevRecord.meals_total_price ||
                record.extra_fees_total !== prevRecord.extra_fees_total ||
                record.id !== prevRecord.id,
            sorter: (a, b) => {
                const getAcc = (r: Reservation) => {
                    const meals = Number(r.meals_total_price || 0);
                    const fees = Number(r.extra_fees_total ?? (r.extra_fees || []).reduce((sum, f) => sum + Number(f.amount || 0), 0));
                    return Math.max(0, Number(r.total_price || 0) - meals - fees);
                };
                return getAcc(a) - getAcc(b);
            },
            render: (_, res) => {
                if (res.id <= 0) {
                    return <span className="text-muted-foreground/40 text-xs">—</span>;
                }
                const meals = Number(res.meals_total_price || 0);
                const fees = Number(res.extra_fees_total ?? (res.extra_fees || []).reduce((sum, f) => sum + Number(f.amount || 0), 0));
                const acc = Math.max(0, Math.round((Number(res.total_price || 0) - meals - fees) * 100) / 100);

                return (
                    <span className="text-foreground text-xs font-semibold whitespace-nowrap">
                        {acc > 0 ? `${acc.toLocaleString()} ج.م` : '0 ج.م'}
                    </span>
                );
            },
        },
        {
            title: 'وجبات',
            key: 'meals_price',
            width: 120,
            filteredValue: filteredInfo.meals_price || null,
            filters: MEALS_FILTER_OPTIONS,
            filterMultiple: true,
            filterSearch: false,
            filterIcon: (filtered: boolean) => (
                <Filter
                    className={`h-3.5 w-3.5 transition-colors ${
                        filtered ? 'text-primary font-bold' : 'text-muted-foreground/60'
                    }`}
                />
            ),
            shouldCellUpdate: (record, prevRecord) =>
                record.has_meals !== prevRecord.has_meals ||
                record.meals_total_price !== prevRecord.meals_total_price ||
                record.meals_persons_count !== prevRecord.meals_persons_count ||
                record.id !== prevRecord.id,
            sorter: (a, b) =>
                (Number(a.meals_total_price) || 0) - (Number(b.meals_total_price) || 0),
            render: (_, res) => {
                if (res.id <= 0) {
                    return <span className="text-muted-foreground/40 text-xs">—</span>;
                }
                const meals = Number(res.meals_total_price || 0);
                if (!res.has_meals || meals <= 0) {
                    return <span className="text-muted-foreground/40 text-xs">—</span>;
                }

                const persons = res.meals_persons_count || 4;
                const nights = res.meals_nights_count || res.nights_count || 0;
                const tooltipText = nights > 0 ? `${persons} أفراد • ${nights} ليلة` : `${persons} أفراد`;

                return (
                    <Tooltip title={tooltipText}>
                        <span className="text-amber-700 dark:text-amber-400 text-xs font-semibold whitespace-nowrap">
                            {meals.toLocaleString()} ج.م
                        </span>
                    </Tooltip>
                );
            },
        },
        {
            title: 'رسوم إضافية',
            key: 'extra_fees_price',
            width: 130,
            filteredValue: filteredInfo.extra_fees_price || null,
            filterDropdown: (props) => <ExtraFeesFilterDropdown {...props} />,
            filterIcon: (filtered: boolean) => (
                <Filter
                    className={`h-3.5 w-3.5 transition-colors ${
                        filtered ? 'text-primary font-bold' : 'text-muted-foreground/60'
                    }`}
                />
            ),
            shouldCellUpdate: (record, prevRecord) =>
                record.extra_fees_total !== prevRecord.extra_fees_total ||
                record.extra_fees !== prevRecord.extra_fees ||
                record.id !== prevRecord.id,
            sorter: (a, b) => {
                const getFees = (r: Reservation) =>
                    Number(r.extra_fees_total ?? (r.extra_fees || []).reduce((sum, f) => sum + Number(f.amount || 0), 0));
                return getFees(a) - getFees(b);
            },
            render: (_, res) => {
                if (res.id <= 0) {
                    return <span className="text-muted-foreground/40 text-xs">—</span>;
                }
                const fees = Number(res.extra_fees_total ?? (res.extra_fees || []).reduce((sum, f) => sum + Number(f.amount || 0), 0));
                if (fees <= 0) {
                    return <span className="text-muted-foreground/40 text-xs">—</span>;
                }

                const feeDetails = (res.extra_fees || [])
                    .map((f) => `${f.description}: ${Number(f.amount).toLocaleString()} ج.م`)
                    .join(' • ');

                return (
                    <Tooltip title={feeDetails || undefined}>
                        <span className="text-purple-700 dark:text-purple-400 text-xs font-semibold whitespace-nowrap">
                            {fees.toLocaleString()} ج.م
                        </span>
                    </Tooltip>
                );
            },
        },
        {
            title: 'الإجمالي',
            key: 'financials_total',
            width: 180,
            filteredValue: filteredInfo.financials_total || null,
            filters: FINANCIALS_FILTER_OPTIONS,
            filterMultiple: true,
            filterSearch: false,
            filterIcon: (filtered: boolean) => (
                <Filter
                    className={`h-3.5 w-3.5 transition-colors ${
                        filtered ? 'text-primary font-bold' : 'text-muted-foreground/60'
                    }`}
                />
            ),
            shouldCellUpdate: (record, prevRecord) =>
                record.total_price !== prevRecord.total_price ||
                record.payment_status !== prevRecord.payment_status ||
                record.balance !== prevRecord.balance ||
                record.id !== prevRecord.id,
            sorter: (a, b) =>
                (Number(a.total_price) || 0) - (Number(b.total_price) || 0),
            render: (_, res) => {
                if (res.id <= 0) {
                    return <span className="text-muted-foreground/40 text-xs">—</span>;
                }

                return (
                    <div className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
                        <span className="text-foreground shrink-0 text-xs font-bold">
                            {Number(res.total_price).toLocaleString()} ج.م
                        </span>
                        {getPaymentBadge(res.payment_status, res.balance)}
                    </div>
                );
            },
        },
        {
            title: 'ملاحظات',
            key: 'notes',
            width: 240,
            filteredValue: filteredInfo.notes || null,
            filterDropdown: (props) => <NotesFilterDropdown {...props} />,
            filterIcon: (filtered: boolean) => (
                <Search
                    className={`h-3.5 w-3.5 transition-colors ${
                        filtered ? 'text-primary font-bold' : 'text-muted-foreground/60'
                    }`}
                />
            ),
            shouldCellUpdate: (record, prevRecord) =>
                record.notes !== prevRecord.notes ||
                record.id !== prevRecord.id,
            render: (_, res) => {
                if (res.id <= 0) {
                    return <span className="text-muted-foreground/40 text-xs">—</span>;
                }

                const canEditThisRow = canEditReservation && hasSectorEditAccess(res);

                return (
                    <div className="flex min-w-0 items-center whitespace-nowrap">
                        <Tooltip title={res.notes || undefined} placement="top">
                            <div className="max-w-[220px] truncate">
                                <InlineTextEdit
                                    value={res.notes ?? ''}
                                    placeholder="اكتب ملاحظة..."
                                    emptyLabel="+ إضافة ملاحظة"
                                    canEdit={canEditThisRow}
                                    onSave={(val) =>
                                        handleSaveNotes(res.id, val)
                                    }
                                    className="text-xs"
                                    inputClassName="w-44"
                                />
                            </div>
                        </Tooltip>
                    </div>
                );
            },
        },
        {
            title: 'الإجراءات',
            key: 'actions',
            width: 95,
            align: 'center',
            render: (_, res) => {
                const canEditRow = canEditReservation && hasSectorEditAccess(res);

                if (res.id <= 0) {
                    return (
                        <Tooltip title={canEditRow ? `تسجيل حجز جديد للوحدة ${res.unit?.name ?? ''}` : 'لا تملك صلاحية حجز أو تعديل في هذا القطاع (عرض فقط)'}>
                            <AntButton
                                type="primary"
                                size="small"
                                icon={<Plus className="h-3 w-3" />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (res.unit && onBookUnit) {
                                        onBookUnit(res.unit);
                                    }
                                }}
                                disabled={!canEditRow}
                                className="h-7 cursor-pointer px-2.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 border-emerald-600 shadow-2xs"
                            >
                                حجز
                            </AntButton>
                        </Tooltip>
                    );
                }

                return (
                    <Tooltip title={canEditRow ? "تعديل بيانات الحجز" : "لا تملك صلاحية تعديل في هذا القطاع (عرض فقط)"}>
                        <AntButton
                            type="default"
                            size="small"
                            icon={<Edit className="text-primary h-3 w-3" />}
                            onClick={() => onEdit(res)}
                            disabled={!canEditRow}
                            className="hover:border-primary hover:text-primary h-7 cursor-pointer px-2 text-xs font-medium"
                        >
                            تعديل
                        </AntButton>
                    </Tooltip>
                );
            },
        },
        ],
        [
            availableSectors,
            canEditGuest,
            canEditReservation,
            canUpdateStatus,
            filteredInfo,
            handleGateChange,
            handleMembershipChange,
            handleSaveGuestField,
            handleSaveNotes,
            handleStatusChange,
            handleTypeChange,
            hasSectorEditAccess,
            onBookUnit,
            onEdit,
            onViewGuestDetails,
            unitSpanMap,
        ],
    );

    // Expandable payment history section
    const renderExpandedPaymentHistory = useCallback((res: Reservation) => {
        const payments = res.payments ?? [];

        return (
            <div className="bg-background space-y-3 rounded-xl border p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Receipt className="text-primary h-4 w-4" />
                        <span className="text-foreground text-xs font-bold">
                            سجل دفعات الحجز (#{res.id} - النزيل:{' '}
                            {res.guest?.name ?? 'غير محدد'})
                        </span>
                        <Tag className="text-[11px]">
                            {payments.length}{' '}
                            {payments.length === 1 ? 'دفعة مسجلة' : 'دفعات'}
                        </Tag>
                    </div>

                    {canCreatePayment && res.balance > 0 && hasSectorEditAccess(res) && (
                        <AntButton
                            size="small"
                            onClick={() => onRecordPayment(res)}
                            icon={<Plus className="h-3 w-3" />}
                            className="text-xs"
                        >
                            إضافة دفعة
                        </AntButton>
                    )}
                </div>

                {payments.length === 0 ? (
                    <div className="text-muted-foreground bg-muted/10 rounded-lg border py-3 text-center text-xs">
                        لم يتم تسجيل أي مدفوعات نقدية أو إلكترونية لهذا الحجز
                        حتى الآن.
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-lg border">
                        <table className="w-full caption-bottom border-collapse text-sm">
                            <thead>
                                <tr className="bg-muted/50 text-[11px]">
                                    <th className="px-3 py-2 text-right">
                                        تاريخ الدفعة
                                    </th>
                                    <th className="px-3 py-2 text-right">
                                        المبلغ المسدد
                                    </th>
                                    <th className="px-3 py-2 text-right">
                                        طريقة الدفع
                                    </th>
                                    <th className="px-3 py-2 text-right">
                                        رقم الحوالة / الإيصال
                                    </th>
                                    {canDeletePayment && hasSectorEditAccess(res) && (
                                        <th className="w-[80px] px-3 py-2 text-center">
                                            إجراء
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((p) => (
                                    <tr
                                        key={p.id}
                                        className="hover:bg-muted/20 border-t text-xs"
                                    >
                                        <td className="text-muted-foreground px-3 py-2">
                                            {p.created_at
                                                ? new Date(
                                                    p.created_at,
                                                ).toLocaleString('ar-EG', {
                                                    dateStyle: 'medium',
                                                    timeStyle: 'short',
                                                })
                                                : '—'}
                                        </td>
                                        <td className="px-3 py-2 font-bold text-emerald-600 dark:text-emerald-400">
                                            {Number(p.amount).toLocaleString()}{' '}
                                            ج.م
                                        </td>
                                        <td className="px-3 py-2">
                                            {getPaymentMethodTag(p.method)}
                                        </td>
                                        <td className="text-muted-foreground px-3 py-2">
                                            {p.reference_number ? (
                                                <code className="bg-muted rounded px-1.5 py-0.5 text-[11px]">
                                                    {p.reference_number}
                                                </code>
                                            ) : (
                                                'بدون رقم إيصال'
                                            )}
                                        </td>
                                        {canDeletePayment && hasSectorEditAccess(res) && (
                                            <td className="px-3 py-2 text-center">
                                                <AntButton
                                                    type="text"
                                                    danger
                                                    size="small"
                                                    onClick={() =>
                                                        handleDeletePayment(p)
                                                    }
                                                    className="h-7 w-7 cursor-pointer"
                                                    title="حذف الدفعة"
                                                    icon={
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    }
                                                />
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Sub-summary */}
                <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 border-t pt-2.5 text-xs">
                    <div>
                        إجمالي المطلوب:{' '}
                        <span className="text-foreground font-bold">
                            {Number(res.total_price).toLocaleString()} ج.م
                        </span>
                    </div>
                    <div>
                        إجمالي المسدد:{' '}
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {Number(res.paid_amount).toLocaleString()} ج.م
                        </span>
                    </div>
                    <div>
                        المتبقي:{' '}
                        <span className="text-destructive font-bold">
                            {Number(res.balance).toLocaleString()} ج.م
                        </span>
                    </div>
                </div>
            </div>
        );
    }, [canCreatePayment, canDeletePayment, handleDeletePayment, hasSectorEditAccess, onRecordPayment]);

    // Stable expandable config to avoid re-creating object on every render
    const expandableConfig = useMemo(() => ({
        expandedRowRender: renderExpandedPaymentHistory,
        expandedRowKeys,
        onExpandedRowsChange: (newKeys: readonly React.Key[]) =>
            setExpandedRowKeys([...newKeys]),
        columnWidth: 48,
        rowExpandable: (record: Reservation) => record.id > 0,
    }), [renderExpandedPaymentHistory, expandedRowKeys]);

    // Calculate aggregated summary statistics based on filtered displayReservations
    const summary = useMemo(() => {
        let totalAmount = 0;
        let totalPaid = 0;
        let totalBalance = 0;
        let reservedCount = 0;
        let vacantCount = 0;

        for (let i = 0; i < displayReservations.length; i++) {
            const r = displayReservations[i];
            if (r.id > 0) {
                reservedCount++;
                totalAmount += Number(r.total_price) || 0;
                totalPaid += Number(r.paid_amount) || 0;
                totalBalance += Number(r.balance) || 0;
            } else {
                vacantCount++;
            }
        }

        return {
            totalRows: displayReservations.length,
            reservedCount,
            vacantCount,
            totalAmount,
            totalPaid,
            totalBalance,
        };
    }, [displayReservations]);

    // Stable scroll config
    const scrollConfig = useMemo(() => ({ x: 2200, y: 500 }), []);

    return (
        <div
            className="border-border/70 bg-card overflow-hidden rounded-2xl border shadow-xs"
            dir="rtl"
        >
            {/* Top Table Toolbar */}
            <div className="bg-muted/20 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-foreground font-semibold">
                        قائمة الحجوزات والوحدات (Ant Design)
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                        {summary.vacantCount > 0 ? (
                            <>
                                ({summary.reservedCount} حجز • {summary.vacantCount} شاغر • إجمالي {summary.totalRows} وحدة)
                            </>
                        ) : (
                            <>
                                ({summary.totalRows}{' '}
                                {summary.totalRows === 1 ? 'حجز' : 'حجوزات'})
                            </>
                        )}
                    </span>
                    {activeFilterCount > 0 && (
                        <div className="flex items-center gap-1.5 mr-1 border-r pr-2">
                            <Tag color="processing" className="m-0 flex items-center gap-1 px-1.5 py-0 text-[11px] font-medium">
                                <Filter className="h-3 w-3" />
                                {activeFilterCount} {activeFilterCount === 1 ? 'فلتر مفعل' : 'فلاتر مفعلة'}
                            </Tag>
                            <AntButton
                                size="small"
                                type="link"
                                danger
                                icon={<RotateCcw className="h-3 w-3" />}
                                onClick={handleClearAllFilters}
                                className="h-6 px-1.5 text-xs cursor-pointer"
                            >
                                إلغاء الفلاتر
                            </AntButton>
                        </div>
                    )}
                    <span className="text-muted-foreground/80 mr-1 hidden border-r pr-2 text-[11px] lg:inline-block">
                        💡 انقر نقراً مزدوجاً على (الاسم / الهاتف / الكود /
                        الملاحظات) للتعديل السريع، أو انقر "حجز" للوحدات الشاغرة
                    </span>
                </div>

                {onPrint && (
                    <AntButton
                        size="small"
                        icon={<Printer className="h-3.5 w-3.5" />}
                        onClick={onPrint}
                        className="text-xs"
                    >
                        طباعة الكشف
                    </AntButton>
                )}
            </div>

            {/* Scoped CSS for ultra-compact, single-line table rows with robust clipping & horizontal scroll */}
            <style>{TABLE_STYLES}</style>

            {/* Ant Design Table */}
            <Table<Reservation>
                rowKey="id"
                size="small"
                loading={loading}
                columns={columns}
                dataSource={displayReservations}
                onChange={handleTableChange}
                scroll={scrollConfig}
                pagination={false}
                // virtual
                // expandable={expandableConfig}
                locale={TABLE_LOCALE}
                className="antd-reservations-table"
                rowClassName={(record) => {
                    const classes: string[] = [];
                    if (record.id <= 0) {
                        classes.push('antd-vacant-row');
                    }
                    const spanInfo = unitSpanMap.get(record.id);
                    if (spanInfo && spanInfo.totalCount > 1) {
                        classes.push('antd-multi-res-row');
                    }
                    return classes.join(' ');
                }}
                onRow={(record) => ({
                    onDoubleClick: (e) => {
                        if (
                            record.id <= 0 &&
                            record.unit &&
                            onBookUnit &&
                            canEditReservation
                        ) {
                            e.stopPropagation();
                            onBookUnit(record.unit);
                        }
                    },
                })}
            />

            {/* Table Summary Footer */}
            {displayReservations.length > 0 && (
                <div className="bg-muted/20 flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs">
                    <div className="text-muted-foreground flex flex-wrap items-center gap-2">
                        <span>إجمالي المعروض:</span>
                        <Tag color="blue" className="font-bold">
                            {summary.totalRows} وحدة
                        </Tag>
                        <Tag color="green" className="font-medium">
                            {summary.reservedCount} حجز مسجل
                        </Tag>
                        {summary.vacantCount > 0 && (
                            <Tag color="default" className="font-medium">
                                {summary.vacantCount} شاغر
                            </Tag>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs sm:gap-6">
                        <div>
                            <span className="text-muted-foreground">
                                إجمالي المطلوب:{' '}
                            </span>
                            <span className="text-foreground font-bold">
                                {summary.totalAmount.toLocaleString()} ج.م
                            </span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">
                                إجمالي المحصل:{' '}
                            </span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {summary.totalPaid.toLocaleString()} ج.م
                            </span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">
                                إجمالي المتبقي:{' '}
                            </span>
                            <span className="text-destructive font-bold">
                                {summary.totalBalance.toLocaleString()} ج.م
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export { ReservationAntdTableView as ReservationTableView };
export default ReservationAntdTableView;
