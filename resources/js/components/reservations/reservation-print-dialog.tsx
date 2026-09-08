import React, { useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';
import {
    Modal,
    Checkbox,
    Button,
    Radio,
    Tag,
} from 'antd';
import {
    Printer,
    CheckSquare,
    Building2,
    FileSpreadsheet,
    Eye,
    Shield,
} from 'lucide-react';
import {
    Reservation,
    SharedProps,
    Unit,
} from '@/types/reservation';
import { compareReservationsBySectorAndUnit } from './reservation-antd-table-view';

export type PrintableColumnKey =
    | 'sector_unit'
    | 'guest_name'
    | 'phone'
    | 'mil_code'
    | 'check_in'
    | 'check_out'
    | 'status'
    | 'membership'
    | 'type'
    | 'meals'
    | 'extra_fees'
    | 'notes';

interface ColumnConfig {
    key: PrintableColumnKey;
    label: string;
    description: string;
    align: 'right' | 'center' | 'left';
    defaultSelected: boolean;
    printWidth?: string;
}

const AVAILABLE_COLUMNS: ColumnConfig[] = [
    {
        key: 'sector_unit',
        label: 'القطاع - الوحدة',
        description: 'اسم القطاع ورقم الغرفة أو الشاليه',
        align: 'center',
        defaultSelected: true,
        printWidth: '13%',
    },
    {
        key: 'guest_name',
        label: 'اسم النزيل',
        description: 'الاسم الثلاثي أو الرباعي للنزيل',
        align: 'right',
        defaultSelected: true,
        printWidth: '18%',
    },
    {
        key: 'phone',
        label: 'رقم الهاتف',
        description: 'رقم المحمول للتواصل',
        align: 'center',
        defaultSelected: true,
        printWidth: '11%',
    },
    {
        key: 'mil_code',
        label: 'الكود العسكري',
        description: 'الرقم العسكري أو كود العضوية',
        align: 'center',
        defaultSelected: true,
        printWidth: '10%',
    },
    {
        key: 'check_in',
        label: 'تاريخ الوصول',
        description: 'تاريخ الدخول المحجوز',
        align: 'center',
        defaultSelected: true,
        printWidth: '10%',
    },
    {
        key: 'check_out',
        label: 'تاريخ المغادرة',
        description: 'تاريخ الخروج المحجوز',
        align: 'center',
        defaultSelected: true,
        printWidth: '10%',
    },
    {
        key: 'status',
        label: 'حالة الحجز',
        description: 'تم التسكين، انتظار، ثابت، غادر',
        align: 'center',
        defaultSelected: true,
        printWidth: '9%',
    },
    {
        key: 'membership',
        label: 'فئة الحجز',
        description: 'عضو، غير عضو، مرافق، مدني',
        align: 'center',
        defaultSelected: true,
        printWidth: '9%',
    },
    {
        key: 'type',
        label: 'نوع / جهة الحجز',
        description: 'فرع، إدارة، منتجع',
        align: 'center',
        defaultSelected: true,
        printWidth: '9%',
    },
    {
        key: 'meals',
        label: 'الوجبات',
        description: 'خطة وتواريخ وجبات النزيل',
        align: 'center',
        defaultSelected: false,
        printWidth: '12%',
    },
    {
        key: 'extra_fees',
        label: 'الرسوم الإضافية',
        description: 'رسوم التلفيات والزيارات المسجلة',
        align: 'right',
        defaultSelected: false,
        printWidth: '14%',
    },
    {
        key: 'notes',
        label: 'الملاحظات',
        description: 'ملاحظات وتوجيهات الحجز',
        align: 'right',
        defaultSelected: true,
        printWidth: '16%',
    },
];

export interface ReservationPrintDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    reservations: Reservation[];
    units?: Unit[];
    datePreset?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    sectorFilterLabel?: string;
    statusFilterLabel?: string;
}

export function ReservationPrintDialog({
    open,
    onOpenChange,
    reservations,
    units = [],
    datePreset,
    startDate,
    endDate,
    search,
    sectorFilterLabel,
    statusFilterLabel,
}: ReservationPrintDialogProps) {
    const { auth } = usePage<SharedProps>().props;
    const currentUserName = auth?.user?.name || 'مستخدم النظام';

    // Selected columns state (default: all 10 columns enabled)
    const [selectedColumns, setSelectedColumns] = useState<Record<PrintableColumnKey, boolean>>(() => {
        const initial: Partial<Record<PrintableColumnKey, boolean>> = {};
        for (const col of AVAILABLE_COLUMNS) {
            initial[col.key] = col.defaultSelected;
        }
        return initial as Record<PrintableColumnKey, boolean>;
    });

    // Print configuration settings
    const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
    const [includeVacant, setIncludeVacant] = useState<boolean>(false);
    const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);

    // Toggle individual column
    const handleToggleColumn = (key: PrintableColumnKey) => {
        setSelectedColumns((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    // Select all columns
    const handleSelectAll = () => {
        const all: Partial<Record<PrintableColumnKey, boolean>> = {};
        for (const col of AVAILABLE_COLUMNS) {
            all[col.key] = true;
        }
        setSelectedColumns(all as Record<PrintableColumnKey, boolean>);
    };

    // Deselect all columns
    const handleDeselectAll = () => {
        const none: Partial<Record<PrintableColumnKey, boolean>> = {};
        for (const col of AVAILABLE_COLUMNS) {
            none[col.key] = false;
        }
        setSelectedColumns(none as Record<PrintableColumnKey, boolean>);
    };

    // Filtered rows to print
    const rowsToPrint = useMemo(() => {
        let baseRows = [...reservations];

        if (includeVacant && units.length > 0) {
            const reservedUnitIds = new Set<number>();
            for (let i = 0; i < reservations.length; i++) {
                const uid = reservations[i].unit_id;
                if (uid) reservedUnitIds.add(uid);
            }

            const vacantRows: Reservation[] = [];
            for (let i = 0; i < units.length; i++) {
                const u = units[i];
                if (!reservedUnitIds.has(u.id)) {
                    vacantRows.push({
                        id: -u.id,
                        guest_id: 0,
                        unit_id: u.id,
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
                        unit: u,
                        payments: [],
                        created_at: u.created_at || '',
                        updated_at: u.updated_at || '',
                    });
                }
            }

            baseRows = [...baseRows, ...vacantRows];
        }

        return baseRows.sort(compareReservationsBySectorAndUnit);
    }, [reservations, units, includeVacant]);

    // Active column definitions
    const activeColumns = useMemo(() => {
        return AVAILABLE_COLUMNS.filter((col) => selectedColumns[col.key]);
    }, [selectedColumns]);

    // Format current date and time in Arabic format
    const formattedPrintTime = useMemo(() => {
        const now = new Date();
        return now.toLocaleString('ar-EG', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    }, []);

    // Active period / date string
    const periodDisplay = useMemo(() => {
        if (startDate && endDate) {
            return `الفترة من: ${startDate}  إلى: ${endDate}`;
        }
        if (startDate) {
            return `من تاريخ: ${startDate}`;
        }
        if (datePreset === 'current_period') {
            return 'الفترة الحالية (الجمعة - الخميس)';
        }
        if (datePreset === 'next_period') {
            return 'الفترة القادمة (الجمعة - الخميس)';
        }
        if (datePreset === 'prev_period') {
            return 'الفترة السابقة (الجمعة - الخميس)';
        }
        return 'كافة الفترات المسجلة';
    }, [startDate, endDate, datePreset]);

    // Helper to get formatted cell value
    const getCellValue = (res: Reservation, key: PrintableColumnKey): string => {
        const isVacant = res.id <= 0;

        switch (key) {
            case 'sector_unit': {
                const sector = res.unit?.sector?.name || 'قطاع';
                const unit = res.unit?.name || 'غرفة';
                return `${sector} - ${unit}`;
            }
            case 'guest_name':
                return isVacant ? 'شاغر' : res.guest?.name || '—';
            case 'phone':
                return isVacant ? '—' : res.guest?.phone || '—';
            case 'mil_code':
                return isVacant ? '—' : res.guest?.mil_code || '—';
            case 'check_in':
                return isVacant ? '—' : res.check_in || '—';
            case 'check_out':
                return isVacant ? '—' : res.check_out || '—';
            case 'status':
                return isVacant ? 'شاغر' : res.status || '—';
            case 'membership':
                return isVacant ? '—' : res.membership || '—';
            case 'type':
                return isVacant ? '—' : res.type || '—';
            case 'meals': {
                if (isVacant || !res.has_meals) return '—';
                const nights = res.meals_nights_count ?? 0;
                const price = res.meals_total_price ? ` (${Number(res.meals_total_price).toLocaleString('ar-EG')} ج.م)` : '';
                if (res.meals_start_date && res.meals_end_date) {
                    return `نعم (${res.meals_start_date} إلى ${res.meals_end_date})${price}`;
                }
                return `نعم${price}`;
            }
            case 'extra_fees': {
                if (isVacant || !res.extra_fees || res.extra_fees.length === 0) return '—';
                return res.extra_fees
                    .map((fee) => `${fee.description}: ${Number(fee.amount).toLocaleString('ar-EG')} ج.م`)
                    .join('، ');
            }
            case 'notes':
                return isVacant ? '—' : res.notes || '—';
            default:
                return '—';
        }
    };

    // Construct the complete printable HTML string for the formal administrative document
    const generateFormalPrintHtml = (): string => {
        const tableHeaderCols = activeColumns
            .map(
                (col) =>
                    `<th style="border: 1px solid #000; padding: 6px 4px; background-color: #f1f5f9; color: #000; font-weight: bold; text-align: center; font-size: 11pt; white-space: nowrap; ${col.printWidth ? `width: ${col.printWidth};` : ''
                    }">${col.label}</th>`,
            )
            .join('');

        const tableBodyRows = rowsToPrint
            .map((res, index) => {
                const isVacant = res.id <= 0;
                const rowBg = isVacant
                    ? 'background-color: #fcfcfc;'
                    : index % 2 === 1
                        ? 'background-color: #f8fafc;'
                        : 'background-color: #ffffff;';

                const cells = activeColumns
                    .map((col) => {
                        const val = getCellValue(res, col.key);
                        const isNotes = col.key === 'notes';
                        const isName = col.key === 'guest_name';
                        const textAlign = col.align;

                        return `<td style="border: 1px solid #000; padding: 5px 6px; text-align: ${textAlign}; font-size: 10.5pt; color: ${isVacant ? '#64748b' : '#000'
                            }; ${isNotes ? 'word-break: break-word; line-height: 1.3;' : 'white-space: nowrap;'} ${isName ? 'font-weight: 600;' : ''
                            }">${val}</td>`;
                    })
                    .join('');

                return `<tr style="${rowBg} page-break-inside: avoid;">
                    ${cells}
                </tr>`;
            })
            .join('');

        const signatureBlockHtml = includeSignatures
            ? `
            <div style="margin-top: 25px; page-break-inside: avoid; border-top: 1.5px solid #000; padding-top: 15px;">
                <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 11pt; font-weight: bold;">
                    <tr>
                        <td style="width: 25%; padding: 6px;">مسؤول الاستقبال<br/><br/><span style="display:inline-block; margin-top:28px; border-bottom: 1px dotted #000; width: 140px;"></span></td>
                        <td style="width: 25%; padding: 6px;">مراجع الإسكان والتشغيل<br/><br/><span style="display:inline-block; margin-top:28px; border-bottom: 1px dotted #000; width: 140px;"></span></td>
                        <td style="width: 25%; padding: 6px;">المشرف المالي والإداري<br/><br/><span style="display:inline-block; margin-top:28px; border-bottom: 1px dotted #000; width: 140px;"></span></td>
                        <td style="width: 25%; padding: 6px;">يعتمد،، مدير المنتجع<br/><br/><span style="display:inline-block; margin-top:28px; border-bottom: 1px dotted #000; width: 140px;"></span></td>
                    </tr>
                </table>
            </div>
            `
            : '';

        return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="utf-8" />
    <title>كشف حصر وتسكين الحجوزات - منتجع النسور</title>
    <style>
        @page {
            size: A4 ${orientation};
            margin: 12mm 10mm 12mm 10mm;
        }
        @media print {
            body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            .no-print {
                display: none !important;
            }
        }
        * {
            box-sizing: border-box;
        }
        body {
            font-family: "Cairo", "Traditional Arabic", "Tahoma", "Segoe UI", Arial, sans-serif;
            background-color: #fff;
            color: #000;
            margin: 0;
            padding: 0;
            direction: rtl;
            font-size: 11pt;
            line-height: 1.3;
        }
        .report-container {
            width: 100%;
            margin: 0 auto;
        }
        .report-header {
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 12px;
        }
        .header-table {
            width: 100%;
            border-collapse: collapse;
        }
        .header-table td {
            vertical-align: middle;
        }
        .main-title {
            font-size: 15pt;
            font-weight: 800;
            margin: 2px 0;
            text-align: center;
        }
        .sub-title {
            font-size: 11pt;
            font-weight: bold;
            color: #1e293b;
            text-align: center;
            margin: 2px 0;
        }
        .filter-badges {
            font-size: 9.5pt;
            color: #334155;
            text-align: center;
            margin-top: 3px;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            page-break-inside: auto;
        }
        .data-table thead {
            display: table-header-group;
        }
        .data-table tr {
            page-break-inside: avoid;
            page-break-after: auto;
        }
        .data-table th, .data-table td {
            border: 1px solid #000;
        }
        .summary-bar {
            margin-top: 10px;
            display: flex;
            justify-content: space-between;
            font-size: 10pt;
            font-weight: bold;
            border: 1px solid #000;
            padding: 6px 12px;
            background-color: #f8fafc;
        }
    </style>
</head>
<body>
    <div class="report-container">

        <!-- Formal Report Table -->
        <table class="data-table">
            <thead>
                <tr>
                    ${tableHeaderCols}
                </tr>
            </thead>
            <tbody>
                ${tableBodyRows ||
            `<tr><td colspan="${activeColumns.length}" style="text-align: center; padding: 25px; font-size: 12pt; color: #64748b;">لا توجد أي حجوزات تطابق معايير البحث والفلترة المحددة</td></tr>`
            }
            </tbody>
        </table>

        <!-- Formal Summary Bar -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10pt; font-weight: bold; border: 1px solid #000;">
            <tr style="background-color: #f8fafc;">
                <td style="padding: 6px 10px; text-align: right; border-left: 1px solid #000;">
                    إجمالي السجلات بالكشف: <strong>${rowsToPrint.length}</strong>
                </td>
                <td style="padding: 6px 10px; text-align: center; border-left: 1px solid #000;">
                    الحجوزات الفعلية: <strong>${rowsToPrint.filter((r) => r.id > 0).length}</strong>
                </td>
                ${includeVacant
                ? `<td style="padding: 6px 10px; text-align: center; border-left: 1px solid #000;">
                            الوحدات الشاغرة: <strong>${rowsToPrint.filter((r) => r.id <= 0).length}</strong>
                        </td>`
                : ''
            }
                <td style="padding: 6px 10px; text-align: left;">
                    الأعمدة المطبوعة: <strong>${activeColumns.length} من ${AVAILABLE_COLUMNS.length}</strong>
                </td>
            </tr>
        </table>

        <!-- Official Signatures Block -->
        ${signatureBlockHtml}
    </div>
</body>
</html>`;
    };

    // Print execution via an isolated hidden iframe
    const handlePrint = () => {
        const printHtml = generateFormalPrintHtml();

        // Create or reuse hidden iframe
        let iframe = document.getElementById('formal-print-iframe') as HTMLIFrameElement;
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'formal-print-iframe';
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = 'none';
            iframe.style.zIndex = '-9999';
            iframe.style.visibility = 'hidden';
            document.body.appendChild(iframe);
        }

        const doc = iframe.contentWindow?.document;
        if (!doc) return;

        doc.open();
        doc.write(printHtml);
        doc.close();

        // Give the iframe document a moment to finish rendering before triggering print
        setTimeout(() => {
            try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
            } catch (err) {
                console.error('Print failed', err);
            }
        }, 250);
    };

    const selectedCount = activeColumns.length;

    return (
        <Modal
            open={open}
            onCancel={() => onOpenChange(false)}
            width="min(940px, calc(100vw - 24px))"
            style={{ maxWidth: 'calc(100vw - 24px)', margin: '16px auto' }}
            centered
            destroyOnClose
            title={
                <div className="flex items-center gap-2 text-foreground pr-1" dir="rtl">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                        <Printer className="h-4 w-4" />
                    </div>
                    <div>
                        <div className="font-bold text-base leading-tight">
                            طباعة كشف الحجوزات الرسمي
                        </div>
                        <div className="text-xs text-muted-foreground font-normal">
                            تخصيص الأعمدة وتنسيق الكشف الإداري المعتمد لمنتجع النسور
                        </div>
                    </div>
                </div>
            }
            footer={
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full" dir="rtl">
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>
                            عدد السجلات المطابقة: <strong>{rowsToPrint.length}</strong>
                        </span>
                        <span>•</span>
                        <span>
                            الأعمدة المحددة: <strong>{selectedCount}</strong> من {AVAILABLE_COLUMNS.length}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button onClick={() => onOpenChange(false)}>
                            إلغاء
                        </Button>
                        <Button
                            type="primary"
                            icon={<Printer className="h-4 w-4" />}
                            onClick={handlePrint}
                            disabled={selectedCount === 0 || rowsToPrint.length === 0}
                            className="bg-primary hover:bg-primary/90 font-medium"
                        >
                            طباعة الكشف ({rowsToPrint.length} سجل)
                        </Button>
                    </div>
                </div>
            }
        >
            <div className="flex flex-col gap-4 py-2" dir="rtl">
                {/* Notice & Context Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
                    <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-semibold text-foreground">
                            منتجع النسور - كشف الحجوزات الرسمي:
                        </span>
                        <Tag color="blue" className="m-0 font-medium">
                            {periodDisplay}
                        </Tag>
                    </div>

                    <div className="flex items-center gap-2">
                        {statusFilterLabel && (
                            <Tag color="purple" className="m-0">
                                الحالة: {statusFilterLabel}
                            </Tag>
                        )}
                        {sectorFilterLabel && (
                            <Tag color="cyan" className="m-0">
                                القطاع: {sectorFilterLabel}
                            </Tag>
                        )}
                        {search && (
                            <Tag color="orange" className="m-0">
                                بحث: "{search}"
                            </Tag>
                        )}
                    </div>
                </div>

                {/* Section 1: Column Selection */}
                <div className="rounded-xl border bg-card p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b">
                        <div className="flex items-center gap-2">
                            <CheckSquare className="h-4 w-4 text-primary" />
                            <span className="font-bold text-sm text-foreground">
                                تحديد الأعمدة المراد طباعتها في الكشف:
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <Button
                                size="small"
                                type="link"
                                onClick={handleSelectAll}
                                className="text-xs px-1.5 h-auto text-primary"
                            >
                                تحديد الكل
                            </Button>
                            <span className="text-muted-foreground/40 text-xs">|</span>
                            <Button
                                size="small"
                                type="link"
                                onClick={handleDeselectAll}
                                className="text-xs px-1.5 h-auto text-destructive"
                            >
                                إلغاء التحديد
                            </Button>
                        </div>
                    </div>

                    {/* Column Checkboxes Grid (10 requested columns) */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                        {AVAILABLE_COLUMNS.map((col) => {
                            const isChecked = selectedColumns[col.key];
                            return (
                                <label
                                    key={col.key}
                                    onClick={() => handleToggleColumn(col.key)}
                                    className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer select-none transition-all ${isChecked
                                        ? 'border-primary/50 bg-primary/5 text-foreground'
                                        : 'border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40'
                                        }`}
                                >
                                    <Checkbox
                                        checked={isChecked}
                                        onChange={() => handleToggleColumn(col.key)}
                                        className="mt-0.5"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="font-semibold text-xs leading-tight">
                                            {col.label}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground/80 truncate mt-0.5">
                                            {col.description}
                                        </div>
                                    </div>
                                </label>
                            );
                        })}
                    </div>

                    {selectedCount === 0 && (
                        <div className="mt-2 text-center text-xs font-semibold text-destructive py-1">
                            ⚠️ يجب اختيار عمود واحد على الأقل لإجراء الطباعة
                        </div>
                    )}
                </div>

                {/* Section 2: Print Settings */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Orientation */}
                    <div className="rounded-xl border bg-card p-3 shadow-2xs">
                        <div className="font-bold text-xs text-foreground mb-2 flex items-center gap-1.5">
                            <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                            <span>اتجاه الصفحة:</span>
                        </div>
                        <Radio.Group
                            value={orientation}
                            onChange={(e) => setOrientation(e.target.value)}
                            size="small"
                            className="w-full flex gap-2"
                        >
                            <Radio.Button value="landscape" className="flex-1 text-center text-xs">
                                أفقي (Landscape)
                            </Radio.Button>
                            <Radio.Button value="portrait" className="flex-1 text-center text-xs">
                                عمودي (Portrait)
                            </Radio.Button>
                        </Radio.Group>
                        <div className="text-[10px] text-muted-foreground mt-1.5">
                            {orientation === 'landscape'
                                ? 'مستحسن ومناسب للجداول التي تحتوي على أكثر من 5 أعمدة.'
                                : 'مناسب للقوائم الرأسية المختصرة ذات الأعمدة المحدودة.'}
                        </div>
                    </div>

                    {/* Data Scope */}
                    <div className="rounded-xl border bg-card p-3 shadow-2xs">
                        <div className="font-bold text-xs text-foreground mb-2 flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-primary" />
                            <span>نطاق البيانات:</span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
                            <Checkbox
                                checked={includeVacant}
                                onChange={(e) => setIncludeVacant(e.target.checked)}
                            />
                            <span className="font-medium text-foreground">
                                تضمين الوحدات الشاغرة
                            </span>
                        </label>
                        <div className="text-[10px] text-muted-foreground mt-1.5">
                            {includeVacant
                                ? 'سيتم إدراج الوحدات التي ليس لها حجز كسطور شاغرة.'
                                : 'طباعة الحجوزات المسجلة فقط واستبعاد الوحدات الخالية.'}
                        </div>
                    </div>

                    {/* Official Signatures */}
                    <div className="rounded-xl border bg-card p-3 shadow-2xs">
                        <div className="font-bold text-xs text-foreground mb-2 flex items-center gap-1.5">
                            <Shield className="h-3.5 w-3.5 text-primary" />
                            <span>التذييل الإداري:</span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
                            <Checkbox
                                checked={includeSignatures}
                                onChange={(e) => setIncludeSignatures(e.target.checked)}
                            />
                            <span className="font-medium text-foreground">
                                إدراج خانات التوقيعات والاعتماد
                            </span>
                        </label>
                        <div className="text-[10px] text-muted-foreground mt-1.5">
                            إضافة أختام وتوقيعات (الاستقبال - الإسكان - المدير) رسمياً.
                        </div>
                    </div>
                </div>

                {/* Section 3: Live Formal Preview */}
                <div className="rounded-xl border bg-muted/10 p-3 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                            <Eye className="h-3.5 w-3.5 text-primary" />
                            <span>معاينة مظهر الجدول الرسمي المعتمد (Formal Style):</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                            يتم إخراج الكشف وفق المعايير الإدارية المعتمدة لمنتجع النسور
                        </span>
                    </div>

                    <div className="rounded-lg border border-border/80 bg-white text-black p-3.5 max-h-[220px] overflow-auto shadow-inner text-xs">
                        {/* Preview Header */}
                        <div className="border-b pb-2 mb-2">
                            <div className="flex items-center justify-between text-[11px] text-slate-800 font-semibold">
                                <div className="text-right">
                                    <div>جمهورية مصر العربية - القوات الجوية</div>
                                    <div>منتجع النسور - إدارة الإسكان والتشغيل</div>
                                </div>
                                <div className="text-center font-bold text-xs text-black">
                                    كشف حصر وتسكين الحجوزات والوحدات
                                    <div className="text-[10px] font-normal text-slate-600">
                                        {periodDisplay}
                                    </div>
                                </div>
                                <div className="text-left text-[10px] text-slate-600 font-normal">
                                    <div>طُبع: {formattedPrintTime}</div>
                                    <div>السجلات: {rowsToPrint.length}</div>
                                </div>
                            </div>
                        </div>

                        {/* Formal Preview Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-[11px] text-black border border-black">
                                <thead>
                                    <tr className="bg-slate-100 font-bold border-b border-black">
                                        {activeColumns.map((col) => (
                                            <th
                                                key={col.key}
                                                className="border border-black px-2 py-1 text-center whitespace-nowrap"
                                            >
                                                {col.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rowsToPrint.slice(0, 5).map((res, i) => (
                                        <tr
                                            key={res.id || `preview-${i}`}
                                            className={i % 2 === 1 ? 'bg-slate-50' : 'bg-white'}
                                        >
                                            {activeColumns.map((col) => (
                                                <td
                                                    key={col.key}
                                                    className={`border border-black px-2 py-1 text-${col.align} whitespace-nowrap`}
                                                >
                                                    {getCellValue(res, col.key)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    {rowsToPrint.length > 5 && (
                                        <tr className="bg-slate-50 italic text-slate-500 text-center">
                                            <td
                                                colSpan={activeColumns.length}
                                                className="border border-black py-1 text-[10px]"
                                            >
                                                ... بالإضافة إلى {rowsToPrint.length - 5} سجل آخر سيتم تضمينها بالكامل في الطباعة ...
                                            </td>
                                        </tr>
                                    )}
                                    {rowsToPrint.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={activeColumns.length}
                                                className="border border-black py-4 text-center text-slate-400"
                                            >
                                                لا توجد سجلات مطابقة للفلترة الحالية
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Signatures Preview */}
                        {includeSignatures && (
                            <div className="mt-3 pt-2 border-t border-dashed border-slate-300 grid grid-cols-4 gap-2 text-center text-[10px] text-slate-700 font-bold">
                                <div>مسؤول الاستقبال</div>
                                <div>مراجع الإسكان</div>
                                <div>المشرف المالي</div>
                                <div>يعتمد،، مدير المنتجع</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
}
