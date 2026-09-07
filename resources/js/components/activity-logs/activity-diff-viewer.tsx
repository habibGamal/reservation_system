import React from 'react';
import { Tag } from 'antd';
import { ArrowLeft, Check, Minus, Plus } from 'lucide-react';
import type { ActivityChange } from '@/types/activity-log';

interface ActivityDiffViewerProps {
    changes: ActivityChange[];
    compact?: boolean;
}

// Map known reservation statuses to badge colors
const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    'انتظار': { bg: 'bg-amber-500/10 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-800' },
    'مؤكد': { bg: 'bg-blue-500/10 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-800' },
    'تم التسكين': { bg: 'bg-emerald-500/10 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-800' },
    'غادر': { bg: 'bg-red-500/10 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-300', border: 'border-red-300 dark:border-red-800' },
    'ملغي': { bg: 'bg-rose-500/10 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-300 dark:border-rose-800' },
    'ثابت': { bg: 'bg-cyan-500/10 dark:bg-cyan-950/40', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-300 dark:border-cyan-800' },
};

export function ActivityDiffViewer({ changes, compact = false }: ActivityDiffViewerProps) {
    if (!changes || changes.length === 0) {
        return (
            <div className="py-2 text-xs text-muted-foreground italic">
                لم يتم تسجيل أي تعديلات تفصيلية على الحقول.
            </div>
        );
    }

    const renderValue = (field: string, val: unknown, label: string, isNew = false) => {
        if (val === null || val === undefined || val === '' || label === '—') {
            return <span className="text-muted-foreground/60 italic text-xs">فارغ</span>;
        }

        // Status badge
        if (field === 'status' && typeof label === 'string' && STATUS_COLORS[label]) {
            const colors = STATUS_COLORS[label];
            return (
                <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}
                >
                    {label}
                </span>
            );
        }

        return (
            <span
                className={`font-medium text-xs break-all ${
                    isNew
                        ? 'text-emerald-800 dark:text-emerald-200'
                        : 'text-slate-700 dark:text-slate-300'
                }`}
            >
                {label}
            </span>
        );
    };

    if (compact) {
        return (
            <div className="flex flex-wrap gap-1.5">
                {changes.map((change, idx) => (
                    <Tag
                        key={idx}
                        className="m-0 text-[11px] border border-border/80 bg-background/80"
                    >
                        <span className="font-semibold text-muted-foreground">
                            {change.field_label}:
                        </span>{' '}
                        <span className="text-rose-600 line-through mr-1 dark:text-rose-400">
                            {change.old_label}
                        </span>{' '}
                        <ArrowLeft className="inline-block h-2.5 w-2.5 mx-0.5 text-muted-foreground" />{' '}
                        <span className="text-emerald-600 font-bold dark:text-emerald-400">
                            {change.new_label}
                        </span>
                    </Tag>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {changes.map((change, index) => (
                    <div
                        key={index}
                        className="rounded-lg border border-border/70 bg-card p-3 shadow-2xs transition-all hover:border-primary/40"
                    >
                        <div className="mb-2 flex items-center justify-between border-b border-border/40 pb-1.5">
                            <span className="text-xs font-bold text-foreground">
                                {change.field_label}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                                {change.field}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                            {/* Old Value */}
                            <div className="flex-1 rounded-md bg-rose-500/8 border border-rose-500/20 p-2 dark:bg-rose-950/20">
                                <span className="mb-1 flex items-center gap-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                                    <Minus className="h-2.5 w-2.5" /> القيمة السابقة:
                                </span>
                                <div className="line-through decoration-rose-500/50">
                                    {renderValue(change.field, change.old, change.old_label, false)}
                                </div>
                            </div>

                            <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground" />

                            {/* New Value */}
                            <div className="flex-1 rounded-md bg-emerald-500/8 border border-emerald-500/20 p-2 dark:bg-emerald-950/20">
                                <span className="mb-1 flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    <Plus className="h-2.5 w-2.5" /> القيمة الجديدة:
                                </span>
                                <div>
                                    {renderValue(change.field, change.new, change.new_label, true)}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
