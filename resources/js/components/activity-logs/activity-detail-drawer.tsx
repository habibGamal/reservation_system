import React from 'react';
import { Badge, Button, Descriptions, Divider, Drawer, Empty, Tabs, Tag } from 'antd';
import {
    Activity,
    Calendar,
    CheckCircle,
    Clock,
    Code2,
    FileEdit,
    FileText,
    History,
    Layers,
    PlusCircle,
    Trash2,
    User,
    X,
} from 'lucide-react';
import { ActivityDiffViewer } from './activity-diff-viewer';
import type { ActivityLogItem } from '@/types/activity-log';

interface ActivityDetailDrawerProps {
    activity: ActivityLogItem | null;
    open: boolean;
    onClose: () => void;
}

export function ActivityDetailDrawer({ activity, open, onClose }: ActivityDetailDrawerProps) {
    if (!activity) return null;

    const renderEventBadge = (event: string) => {
        switch (event) {
            case 'created':
                return (
                    <Tag color="success" className="flex items-center gap-1 font-semibold text-xs py-0.5 px-2">
                        <PlusCircle className="h-3.5 w-3.5" />
                        إنشاء جديد
                    </Tag>
                );
            case 'deleted':
                return (
                    <Tag color="error" className="flex items-center gap-1 font-semibold text-xs py-0.5 px-2">
                        <Trash2 className="h-3.5 w-3.5" />
                        حذف
                    </Tag>
                );
            case 'updated':
            default:
                return (
                    <Tag color="processing" className="flex items-center gap-1 font-semibold text-xs py-0.5 px-2">
                        <FileEdit className="h-3.5 w-3.5" />
                        تعديل وتحديث
                    </Tag>
                );
        }
    };

    return (
        <Drawer
            title={
                <div className="flex items-center justify-between pl-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <History className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-foreground">
                                    تفاصيل العملية #{activity.id}
                                </span>
                                {renderEventBadge(activity.event)}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 font-normal">
                                {activity.created_at_human} ({activity.created_at_formatted})
                            </p>
                        </div>
                    </div>
                </div>
            }
            placement="left"
            width="min(600px, 100vw)"
            style={{ maxWidth: '100vw' }}
            onClose={onClose}
            open={open}
            extra={
                <Button size="small" onClick={onClose} type="text" icon={<X className="h-4 w-4" />} />
            }
        >
            <div className="space-y-5">
                {/* Headline Banner */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5">
                    <h4 className="font-bold text-sm text-foreground">
                        {activity.headline}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                        قام بها: <strong className="text-foreground">{activity.causer.name}</strong> ({activity.causer.role})
                        {activity.causer.email && ` • ${activity.causer.email}`}
                    </p>
                </div>

                <Tabs
                    defaultActiveKey="changes"
                    items={[
                        {
                            key: 'changes',
                            label: (
                                <span className="flex items-center gap-1.5 text-xs font-semibold">
                                    <FileEdit className="h-3.5 w-3.5" />
                                    التعديلات والتغييرات ({activity.changes.length})
                                </span>
                            ),
                            children: (
                                <div className="space-y-4 pt-2">
                                    <ActivityDiffViewer changes={activity.changes} />
                                </div>
                            ),
                        },
                        {
                            key: 'info',
                            label: (
                                <span className="flex items-center gap-1.5 text-xs font-semibold">
                                    <Layers className="h-3.5 w-3.5" />
                                    بيانات الهدف والسياق
                                </span>
                            ),
                            children: (
                                <div className="space-y-4 pt-2">
                                    <Descriptions
                                        size="small"
                                        bordered
                                        column={1}
                                        styles={{ label: { width: '130px', fontWeight: 'bold' } }}
                                    >
                                        <Descriptions.Item label="نوع العنصر">
                                            <Tag color="blue">{activity.subject.type_label}</Tag>
                                        </Descriptions.Item>
                                        <Descriptions.Item label="معرف العنصر (ID)">
                                            #{activity.subject.id}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="عنوان العنصر">
                                            {activity.subject.title}
                                        </Descriptions.Item>
                                        {activity.subject.guest_name && (
                                            <Descriptions.Item label="اسم النزيل">
                                                {activity.subject.guest_name}
                                            </Descriptions.Item>
                                        )}
                                        {activity.subject.unit_name && (
                                            <Descriptions.Item label="الوحدة السكنية">
                                                {activity.subject.unit_name}
                                            </Descriptions.Item>
                                        )}
                                        {activity.subject.sector_name && (
                                            <Descriptions.Item label="القطاع">
                                                {activity.subject.sector_name}
                                            </Descriptions.Item>
                                        )}
                                        <Descriptions.Item label="المستخدم المنفذ">
                                            {activity.causer.name} ({activity.causer.role})
                                        </Descriptions.Item>
                                        <Descriptions.Item label="تاريخ ووقت العملية">
                                            {activity.created_at_formatted}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="سجل المراقبة">
                                            {activity.log_name}
                                        </Descriptions.Item>
                                    </Descriptions>
                                </div>
                            ),
                        },
                        {
                            key: 'raw',
                            label: (
                                <span className="flex items-center gap-1.5 text-xs font-semibold">
                                    <Code2 className="h-3.5 w-3.5" />
                                    البيانات الخام (JSON)
                                </span>
                            ),
                            children: (
                                <div className="space-y-3 pt-2">
                                    <div>
                                        <h5 className="text-xs font-bold text-muted-foreground mb-1.5">
                                            التغييرات المسجلة (Attribute Changes):
                                        </h5>
                                        <pre className="rounded-lg bg-muted/60 p-3 text-[11px] font-mono text-foreground overflow-x-auto max-h-60 border border-border/50" dir="ltr">
                                            {activity.raw_changes
                                                ? JSON.stringify(activity.raw_changes, null, 2)
                                                : 'لا توجد خصائص خام'}
                                        </pre>
                                    </div>

                                    {Boolean(activity.raw_properties) ? (
                                        <div>
                                            <h5 className="text-xs font-bold text-muted-foreground mb-1.5">
                                                خصائص إضافية (Properties):
                                            </h5>
                                            <pre className="rounded-lg bg-muted/60 p-3 text-[11px] font-mono text-foreground overflow-x-auto max-h-48 border border-border/50" dir="ltr">
                                                {JSON.stringify(activity.raw_properties, null, 2)}
                                            </pre>
                                        </div>
                                    ) : null}
                                </div>
                            ),
                        },
                    ]}
                />
            </div>
        </Drawer>
    );
}
