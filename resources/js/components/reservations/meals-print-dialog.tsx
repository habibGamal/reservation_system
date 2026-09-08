import React, { useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { Button, Checkbox, Modal, Radio, Space, Tag, Tooltip } from 'antd';
import { CheckSquare, Printer, Square, UtensilsCrossed } from 'lucide-react';
import dayjs from 'dayjs';
import { Reservation, SharedProps, Unit } from '@/types/reservation';
import { compareReservationsBySectorAndUnit } from './reservation-antd-table-view';

export type MealsPrintableColumnKey =
    | 'sector_unit'
    | 'guest_name'
    | 'phone'
    | 'mil_code'
    | 'membership'
    | 'persons'
    | 'start_date'
    | 'end_date'
    | 'today_status'
    | 'total_meals'
    | 'total_price'
    | 'signature';

interface MealsColumnConfig {
    key: MealsPrintableColumnKey;
    label: string;
    description: string;
    align: 'right' | 'center' | 'left';
    defaultSelected: boolean;
    printWidth?: string;
}

const AVAILABLE_MEALS_COLUMNS: MealsColumnConfig[] = [
    {
        key: 'sector_unit',
        label: 'القطاع والوحدة',
        description: 'اسم القطاع ورقم الوحدة',
        align: 'right',
        defaultSelected: true,
        printWidth: '130px',
    },
    {
        key: 'guest_name',
        label: 'اسم النزيل',
        description: 'الاسم الكامل للنزيل المقيم',
        align: 'right',
        defaultSelected: true,
        printWidth: '160px',
    },
    {
        key: 'phone',
        label: 'رقم الهاتف',
        description: 'رقم هاتف النزيل',
        align: 'center',
        defaultSelected: true,
        printWidth: '95px',
    },
    {
        key: 'mil_code',
        label: 'الكود العسكري',
        description: 'الكود العسكري للنزيل',
        align: 'center',
        defaultSelected: true,
        printWidth: '85px',
    },
    {
        key: 'membership',
        label: 'فئة النزيل',
        description: 'عضو / غير عضو / مرافق / مدني',
        align: 'center',
        defaultSelected: false,
        printWidth: '70px',
    },
    {
        key: 'persons',
        label: 'عدد الأفراد (الوجبات)',
        description: 'عدد الوجبات اليومية للغرفة',
        align: 'center',
        defaultSelected: true,
        printWidth: '75px',
    },
    {
        key: 'start_date',
        label: 'تاريخ بداية الوجبات',
        description: 'أول يوم استحقاق للوجبات',
        align: 'center',
        defaultSelected: true,
        printWidth: '85px',
    },
    {
        key: 'end_date',
        label: 'تاريخ نهاية الوجبات',
        description: 'آخر يوم استحقاق للوجبات',
        align: 'center',
        defaultSelected: true,
        printWidth: '85px',
    },
    {
        key: 'today_status',
        label: 'استحقاق اليوم',
        description: 'وجبات اليوم المستحقة أو حالتها',
        align: 'center',
        defaultSelected: true,
        printWidth: '115px',
    },
    {
        key: 'total_meals',
        label: 'إجمالي الوجبات',
        description: 'إجمالي الوجبات طوال مدة الإقامة',
        align: 'center',
        defaultSelected: true,
        printWidth: '95px',
    },
    {
        key: 'total_price',
        label: 'إجمالي التكلفة',
        description: 'القيمة المالية الإجمالية للوجبات',
        align: 'center',
        defaultSelected: false,
        printWidth: '85px',
    },
    {
        key: 'signature',
        label: 'توقيع الاستلام',
        description: 'خانة توقيع النزيل أو استلام المطبخ',
        align: 'center',
        defaultSelected: true,
        printWidth: '100px',
    },
];

interface MealsPrintDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    reservations: Reservation[];
    units?: Unit[];
    datePreset?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    sectorFilterLabel?: string;
}

export function MealsPrintDialog({
    open,
    onOpenChange,
    reservations,
    units = [],
    datePreset,
    startDate,
    endDate,
    search,
    sectorFilterLabel,
}: MealsPrintDialogProps) {
    const { auth } = usePage<SharedProps>().props;
    const currentUserName = auth?.user?.name || 'مستخدم النظام';

    // Columns selection state
    const [selectedColumns, setSelectedColumns] = useState<Record<MealsPrintableColumnKey, boolean>>(() => {
        const initial: Partial<Record<MealsPrintableColumnKey, boolean>> = {};
        for (const col of AVAILABLE_MEALS_COLUMNS) {
            initial[col.key] = col.defaultSelected;
        }
        return initial as Record<MealsPrintableColumnKey, boolean>;
    });

    const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
    const [onlyActiveToday, setOnlyActiveToday] = useState<boolean>(false);
    const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);

    const todayStr = dayjs().format('YYYY-MM-DD');

    const handleToggleColumn = (key: MealsPrintableColumnKey) => {
        setSelectedColumns((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const handleSelectAll = () => {
        const all: Partial<Record<MealsPrintableColumnKey, boolean>> = {};
        for (const col of AVAILABLE_MEALS_COLUMNS) {
            all[col.key] = true;
        }
        setSelectedColumns(all as Record<MealsPrintableColumnKey, boolean>);
    };

    const handleDeselectAll = () => {
        const none: Partial<Record<MealsPrintableColumnKey, boolean>> = {};
        for (const col of AVAILABLE_MEALS_COLUMNS) {
            none[col.key] = false;
        }
        setSelectedColumns(none as Record<MealsPrintableColumnKey, boolean>);
    };

    const activeSelectedCount = useMemo(() => {
        return Object.values(selectedColumns).filter(Boolean).length;
    }, [selectedColumns]);

    // Filter rows that have meals enabled
    const mealsReservations = useMemo(() => {
        let rows = reservations.filter((r) => Boolean(r.has_meals));

        if (onlyActiveToday) {
            rows = rows.filter((r) => {
                const s = r.meals_start_date ? dayjs(r.meals_start_date).format('YYYY-MM-DD') : r.check_in;
                const e = r.meals_end_date ? dayjs(r.meals_end_date).format('YYYY-MM-DD') : r.check_out;
                return todayStr >= s && todayStr < e;
            });
        }

        return rows.sort(compareReservationsBySectorAndUnit);
    }, [reservations, onlyActiveToday, todayStr]);

    // KPI summaries for print
    const stats = useMemo(() => {
        let todayMealsTotal = 0;
        let todayUnitsCount = 0;
        let periodTotalMeals = 0;
        let periodTotalPrice = 0;

        for (const r of mealsReservations) {
            const persons = Number(r.meals_persons_count) || 4;
            const s = r.meals_start_date ? dayjs(r.meals_start_date).format('YYYY-MM-DD') : r.check_in;
            const e = r.meals_end_date ? dayjs(r.meals_end_date).format('YYYY-MM-DD') : r.check_out;

            const isToday = todayStr >= s && todayStr < e;
            if (isToday) {
                todayMealsTotal += persons;
                todayUnitsCount++;
            }

            const nights = r.meals_nights_count ?? (r.meals_start_date && r.meals_end_date ? Math.max(0, dayjs(r.meals_end_date).diff(dayjs(r.meals_start_date), 'day')) : 0);
            periodTotalMeals += persons * nights;
            periodTotalPrice += Number(r.meals_total_price) || 0;
        }

        return {
            todayMealsTotal,
            todayUnitsCount,
            periodTotalMeals,
            periodTotalPrice,
            count: mealsReservations.length,
        };
    }, [mealsReservations, todayStr]);

    const activeColumnsConfig = useMemo(() => {
        return AVAILABLE_MEALS_COLUMNS.filter((col) => selectedColumns[col.key]);
    }, [selectedColumns]);

    const getCellValue = (r: Reservation, key: MealsPrintableColumnKey): string => {
        const unitName = r.unit?.name || 'غ/م';
        const sectorName = r.unit?.sector?.name || 'عام';
        const persons = Number(r.meals_persons_count) || 4;
        const startDateStr = r.meals_start_date || r.check_in;
        const endDateStr = r.meals_end_date || r.check_out;
        const nights = r.meals_nights_count ?? Math.max(0, dayjs(endDateStr).diff(dayjs(startDateStr), 'day'));
        const totalMeals = persons * nights;
        const totalPrice = (Number(r.meals_total_price) || 0).toLocaleString('ar-EG');
        const isTodayActive = todayStr >= startDateStr && todayStr < endDateStr;

        switch (key) {
            case 'sector_unit':
                return `${sectorName} - ${unitName}`;
            case 'guest_name':
                return r.guest?.name || 'غير محدد';
            case 'phone':
                return r.guest?.phone ? `<span style="font-family: monospace;">${r.guest.phone}</span>` : '—';
            case 'mil_code':
                return r.guest?.mil_code ? `<span style="font-family: monospace;">${r.guest.mil_code}</span>` : '—';
            case 'membership':
                return r.membership || 'عضو';
            case 'persons':
                return `<strong>${persons}</strong>`;
            case 'start_date':
                return `<span style="font-family: monospace;">${startDateStr}</span>`;
            case 'end_date':
                return `<span style="font-family: monospace;">${endDateStr}</span>`;
            case 'today_status':
                return isTodayActive
                    ? `<strong style="color: #047857;">${persons} وجبة (مستحق)</strong>`
                    : todayStr < startDateStr
                        ? '<span style="color: #64748b;">تبدأ لاحقاً</span>'
                        : '<span style="color: #94a3b8;">منتهية</span>';
            case 'total_meals':
                return `<strong>${totalMeals}</strong> (${nights} ليلة)`;
            case 'total_price':
                return `${totalPrice} ج.م`;
            case 'signature':
                return '';
            default:
                return '';
        }
    };

    const handlePrint = () => {
        if (activeColumnsConfig.length === 0) {
            return;
        }

        const theadCellsHtml = [
            '<th style="width: 35px; border: 1px solid #000; background-color: #e2e8f0; color: #000; padding: 6px 4px; text-align: center;">م</th>',
            ...activeColumnsConfig.map((col) => {
                const widthStyle = col.printWidth ? `width: ${col.printWidth};` : '';
                return `<th style="border: 1px solid #000; background-color: #e2e8f0; color: #000; padding: 6px 4px; text-align: ${col.align}; ${widthStyle}">${col.label}</th>`;
            }),
        ].join('');

        const tableRowsHtml = mealsReservations
            .map((r, idx) => {
                const rowBg = idx % 2 === 1 ? 'background-color: #f8fafc;' : '';
                const cells = [
                    `<td style="border: 1px solid #000; padding: 6px 4px; text-align: center; font-weight: bold;">${idx + 1}</td>`,
                    ...activeColumnsConfig.map((col) => {
                        const val = getCellValue(r, col.key);
                        const isSignature = col.key === 'signature';
                        const extraStyle = isSignature ? 'min-height: 28px;' : '';
                        return `<td style="border: 1px solid #000; padding: 6px 6px; text-align: ${col.align}; font-size: 10pt; ${extraStyle}">${val}</td>`;
                    }),
                ].join('');

                return `
                <tr style="${rowBg} page-break-inside: avoid;">
                    ${cells}
                </tr>
                `;
            })
            .join('');

        const signatureBlockHtml = includeSignatures
            ? `
            <div style="margin-top: 25px; page-break-inside: avoid; border-top: 1.5px solid #000; padding-top: 15px;">
                <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 11pt; font-weight: bold;">
                    <tr>
                        <td style="width: 25%; padding: 6px;">مشرف الأغذية والمشروبات<br/><br/><span style="display:inline-block; margin-top:28px; border-bottom: 1px dotted #000; width: 140px;"></span></td>
                        <td style="width: 25%; padding: 6px;">رئيس قسم التعيينات والمطبخ<br/><br/><span style="display:inline-block; margin-top:28px; border-bottom: 1px dotted #000; width: 140px;"></span></td>
                        <td style="width: 25%; padding: 6px;">مسؤول الاستقبال والإسكان<br/><br/><span style="display:inline-block; margin-top:28px; border-bottom: 1px dotted #000; width: 140px;"></span></td>
                        <td style="width: 25%; padding: 6px;">يعتمد،، مدير المنتجع<br/><br/><span style="display:inline-block; margin-top:28px; border-bottom: 1px dotted #000; width: 140px;"></span></td>
                    </tr>
                </table>
            </div>
            `
            : '';

        const htmlContent = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="utf-8" />
    <title>كشف استحقاق وتوزيع الوجبات الغذائية - منتجع النسور</title>
    <style>
        @page {
            size: A4 ${orientation};
            margin: 10mm 10mm 12mm 10mm;
        }
        @media print {
            body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            .no-print { display: none !important; }
        }
        * { box-sizing: border-box; }
        body {
            font-family: "Cairo", "Traditional Arabic", "Tahoma", Arial, sans-serif;
            background-color: #fff;
            color: #000;
            margin: 0;
            padding: 0;
            direction: rtl;
            font-size: 10pt;
            line-height: 1.3;
        }
        .report-header {
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
            margin-bottom: 10px;
        }
        .stats-box {
            display: table;
            width: 100%;
            margin-bottom: 10px;
            border: 1px solid #334155;
            background-color: #f1f5f9;
        }
        .stats-cell {
            display: table-cell;
            padding: 6px 10px;
            text-align: center;
            border-left: 1px solid #cbd5e1;
        }
        .stats-cell:last-child {
            border-left: none;
        }
        .stats-val {
            font-size: 13pt;
            font-weight: 800;
            color: #0f172a;
        }
        .stats-lbl {
            font-size: 9pt;
            color: #475569;
            font-weight: bold;
        }
        table.data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5pt;
        }
    </style>
</head>
<body>
    <div class="report-header">
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="width: 30%; text-align: right; vertical-align: middle;">
                    <div style="font-size: 11pt; font-weight: bold;">القوات الجوية</div>
                    <div style="font-size: 10pt; font-weight: bold;">دار القوات الجوية • منتجع النسور</div>
                    <div style="font-size: 9pt; color: #475569;">إدارة الأغذية والمشروبات والمطبخ</div>
                </td>
                <td style="width: 40%; text-align: center; vertical-align: middle;">
                    <div style="font-size: 15pt; font-weight: 900; margin-bottom: 2px;">كشف بيان واستحقاق الوجبات الغذائية</div>
                    <div style="font-size: 10pt; font-weight: bold; color: #1e293b;">
                        ${onlyActiveToday ? `وجبات اليوم: ${todayStr}` : `الفترة: ${startDate || 'كافة التواريخ'} إلى ${endDate || 'كافة التواريخ'}`}
                        ${sectorFilterLabel ? ` • قطاع: ${sectorFilterLabel}` : ''}
                    </div>
                </td>
                <td style="width: 30%; text-align: left; vertical-align: middle; font-size: 9pt;">
                    <div>تاريخ الطباعة: <strong>${dayjs().format('YYYY-MM-DD HH:mm')}</strong></div>
                    <div>المسؤول: <strong>${currentUserName}</strong></div>
                    <div>عدد الحجوزات: <strong>${mealsReservations.length}</strong></div>
                </td>
            </tr>
        </table>
    </div>

    <div class="stats-box">
        <div class="stats-cell" style="background-color: #ecfdf5;">
            <div class="stats-val" style="color: #047857;">${stats.todayMealsTotal} وجبة</div>
            <div class="stats-lbl">إجمالي وجبات اليوم المستحقة</div>
        </div>
        <div class="stats-cell">
            <div class="stats-val">${stats.todayUnitsCount} وحدة</div>
            <div class="stats-lbl">الغرف المستفيدة اليوم</div>
        </div>
        <div class="stats-cell">
            <div class="stats-val">${stats.periodTotalMeals} وجبة</div>
            <div class="stats-lbl">إجمالي وجبات الفترة المسجلة</div>
        </div>
        <div class="stats-cell">
            <div class="stats-val">${stats.periodTotalPrice.toLocaleString('ar-EG')} ج.م</div>
            <div class="stats-lbl">إجمالي القيمة المالية</div>
        </div>
    </div>

    <table class="data-table">
        <thead>
            <tr>
                ${theadCellsHtml}
            </tr>
        </thead>
        <tbody>
            ${tableRowsHtml || `<tr><td colspan="${activeColumnsConfig.length + 1}" style="text-align: center; padding: 20px; font-weight: bold;">لا توجد وجبات غذائية مسجلة في هذا النطاق</td></tr>`}
        </tbody>
    </table>

    ${signatureBlockHtml}

</body>
</html>`;

        // Create or reuse hidden iframe for printing on the same page without opening a new window
        let iframe = document.getElementById('meals-print-iframe') as HTMLIFrameElement;
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'meals-print-iframe';
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
        doc.write(htmlContent);
        doc.close();

        setTimeout(() => {
            try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
            } catch (err) {
                console.error('Print failed', err);
            }
        }, 250);
    };

    return (
        <Modal
            title={
                <div className="flex items-center gap-2 text-base font-bold">
                    <UtensilsCrossed className="h-5 w-5 text-amber-600" />
                    <span>طباعة كشف الوجبات الغذائية للمطبخ والإسكان</span>
                </div>
            }
            open={open}
            onCancel={() => onOpenChange(false)}
            footer={[
                <Button key="cancel" onClick={() => onOpenChange(false)}>
                    إلغاء
                </Button>,
                <Button
                    key="print"
                    type="primary"
                    icon={<Printer className="h-4 w-4" />}
                    onClick={handlePrint}
                    disabled={activeSelectedCount === 0}
                    className="bg-amber-600 hover:bg-amber-500"
                >
                    بدء الطباعة ({mealsReservations.length} حجز • {activeSelectedCount} أعمدة)
                </Button>,
            ]}
            width="min(640px, calc(100vw - 24px))"
            style={{ maxWidth: 'calc(100vw - 24px)', margin: '16px auto' }}
            centered
            destroyOnClose
        >
            <div className="space-y-4 py-2 text-xs" dir="rtl">
                {/* Stats Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200">
                        <div className="text-base font-bold text-amber-700 dark:text-amber-400">
                            {stats.todayMealsTotal}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-medium">وجبات اليوم المستحقة</div>
                    </div>
                    <div className="p-2 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200">
                        <div className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                            {stats.todayUnitsCount}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-medium">غرف مستفيدة اليوم</div>
                    </div>
                    <div className="p-2 rounded-lg border bg-sky-50/50 dark:bg-sky-950/20 border-sky-200">
                        <div className="text-base font-bold text-sky-700 dark:text-sky-400">
                            {stats.periodTotalMeals}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-medium">إجمالي وجبات الفترة</div>
                    </div>
                    <div className="p-2 rounded-lg border bg-muted/40">
                        <div className="text-base font-bold text-foreground">
                            {mealsReservations.length}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-medium">حجوزات بوجبات</div>
                    </div>
                </div>

                {/* Column Selection Card */}
                <div className="p-3 rounded-lg border bg-card space-y-2.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">تحديد الأعمدة والحقول المطلوب طباعتها:</span>
                            <Tag color="blue" className="m-0 text-[10px] font-semibold">
                                {activeSelectedCount} من {AVAILABLE_MEALS_COLUMNS.length} محدد
                            </Tag>
                        </div>
                        <Space size="small">
                            <Button
                                size="small"
                                type="text"
                                icon={<CheckSquare className="h-3.5 w-3.5 text-primary" />}
                                onClick={handleSelectAll}
                                className="text-xs text-primary"
                            >
                                تحديد الكل
                            </Button>
                            <Button
                                size="small"
                                type="text"
                                icon={<Square className="h-3.5 w-3.5 text-muted-foreground" />}
                                onClick={handleDeselectAll}
                                className="text-xs text-muted-foreground"
                            >
                                إلغاء التحديد
                            </Button>
                        </Space>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t">
                        {AVAILABLE_MEALS_COLUMNS.map((col) => (
                            <div
                                key={col.key}
                                onClick={() => handleToggleColumn(col.key)}
                                className={`flex items-start gap-2 p-2 rounded-md border cursor-pointer select-none transition-colors ${
                                    selectedColumns[col.key]
                                        ? 'bg-primary/5 border-primary/40 text-foreground'
                                        : 'bg-muted/10 border-border/50 text-muted-foreground hover:bg-muted/30'
                                }`}
                            >
                                <Checkbox
                                    checked={selectedColumns[col.key]}
                                    onChange={() => handleToggleColumn(col.key)}
                                    className="mt-0.5"
                                />
                                <div className="flex flex-col">
                                    <span className="font-semibold text-xs leading-snug">{col.label}</span>
                                    <span className="text-[10px] text-muted-foreground leading-tight">{col.description}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Print Options */}
                <div className="p-3 rounded-lg border space-y-3 bg-muted/20">
                    <div className="font-semibold text-foreground">خيارات كشف الطباعة:</div>

                    <div className="flex flex-col gap-2">
                        <Checkbox
                            checked={onlyActiveToday}
                            onChange={(e) => setOnlyActiveToday(e.target.checked)}
                            className="font-medium"
                        >
                            <span>طباعة وجبات اليوم فقط ({todayStr})</span>
                            <Tag color="green" className="mr-2 text-[10px]">موصى به للمطبخ</Tag>
                        </Checkbox>

                        <Checkbox
                            checked={includeSignatures}
                            onChange={(e) => setIncludeSignatures(e.target.checked)}
                            className="font-medium"
                        >
                            <span>تضمين خانات توقيع اللجان واعتماد مدير المنتجع</span>
                        </Checkbox>
                    </div>

                    <div className="pt-2 border-t flex items-center justify-between">
                        <span className="text-muted-foreground">اتجاه الورقة:</span>
                        <Radio.Group
                            value={orientation}
                            onChange={(e) => setOrientation(e.target.value)}
                            size="small"
                        >
                            <Radio.Button value="landscape">أفقي (Landscape)</Radio.Button>
                            <Radio.Button value="portrait">عمودي (Portrait)</Radio.Button>
                        </Radio.Group>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
