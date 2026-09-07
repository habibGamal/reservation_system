import React from 'react';
import { Avatar, Badge, Button, Empty, Table, Tag, Tooltip } from 'antd';
import type { TableColumnsType } from 'antd';
import {
    Calendar,
    ChevronDown,
    Clock,
    Eye,
    FileEdit,
    PlusCircle,
    Trash2,
    User as UserIcon,
} from 'lucide-react';
import { ActivityDiffViewer } from './activity-diff-viewer';
import type { ActivityLogItem, PaginatedActivities } from '@/types/activity-log';

interface ActivityTableProps {
    activities: PaginatedActivities;
    loading: boolean;
    onPageChange: (page: number, perPage: number) => void;
    onViewDetails: (activity: ActivityLogItem) => void;
}

export function ActivityTable({
    activities,
    loading,
    onPageChange,
    onViewDetails,
}: ActivityTableProps) {
    // Subject entity type badge colors
    const renderSubjectBadge = (subject: ActivityLogItem['subject']) => {
        let color = 'default';
        switch (subject.type) {
            case 'reservation':
                color = 'blue';
                break;
            case 'payment':
                color = 'green';
                break;
            case 'unit':
                color = 'cyan';
                break;
            case 'sector':
                color = 'purple';
                break;
            case 'user':
                color = 'orange';
                break;
            case 'guest':
                color = 'magenta';
                break;
        }
        return (
            <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                    <Tag color={color} className="m-0 text-[11px] font-semibold py-0.5 px-1.5">
                        {subject.type_label}
                    </Tag>
                    <span className="font-semibold text-xs text-foreground truncate max-w-[200px]">
                        {subject.title}
                    </span>
                </div>
                {subject.subtitle && (
                    <span className="text-[11px] text-muted-foreground truncate">
                        {subject.subtitle}
                    </span>
                )}
            </div>
        );
    };

    // Action event badge
    const renderEventBadge = (event: string) => {
        switch (event) {
            case 'created':
                return (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <PlusCircle className="h-3 w-3" />
                        إنشاء
                    </span>
                );
            case 'deleted':
                return (
                    <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-700 border border-rose-500/20 dark:bg-rose-950/40 dark:text-rose-300">
                        <Trash2 className="h-3 w-3" />
                        حذف
                    </span>
                );
            case 'updated':
            default:
                return (
                    <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-500/20 dark:bg-blue-950/40 dark:text-blue-300">
                        <FileEdit className="h-3 w-3" />
                        تعديل
                    </span>
                );
        }
    };

    const columns: TableColumnsType<ActivityLogItem> = [
        {
            title: 'التوقيت',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 140,
            render: (_, record) => (
                <Tooltip title={record.created_at_formatted}>
                    <div className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium text-foreground">
                            {record.created_at_human}
                        </span>
                    </div>
                </Tooltip>
            ),
        },
        {
            title: 'المستخدم',
            dataIndex: 'causer',
            key: 'causer',
            width: 170,
            render: (_, record) => {
                const initials = record.causer.name
                    ? record.causer.name
                          .split(' ')
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join('')
                    : 'ن';
                return (
                    <div className="flex items-center gap-2">
                        <Avatar
                            size={28}
                            className="bg-primary/10 text-primary font-bold text-[11px] shrink-0 border border-primary/20"
                        >
                            {initials}
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-xs text-foreground truncate">
                                {record.causer.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground truncate">
                                {record.causer.role}
                            </span>
                        </div>
                    </div>
                );
            },
        },
        {
            title: 'العملية',
            dataIndex: 'event',
            key: 'event',
            width: 95,
            render: (event) => renderEventBadge(event),
        },
        {
            title: 'العنصر المستهدف',
            dataIndex: 'subject',
            key: 'subject',
            width: 250,
            render: (_, record) => renderSubjectBadge(record.subject),
        },
        {
            title: 'ملخص التعديلات',
            dataIndex: 'changes',
            key: 'changes',
            render: (_, record) => {
                if (!record.changes || record.changes.length === 0) {
                    return (
                        <span className="text-xs text-muted-foreground italic">
                            {record.headline}
                        </span>
                    );
                }
                return <ActivityDiffViewer changes={record.changes} compact />;
            },
        },
        {
            title: '',
            key: 'actions',
            width: 85,
            align: 'center',
            render: (_, record) => (
                <Button
                    size="small"
                    type="text"
                    icon={<Eye className="h-3.5 w-3.5" />}
                    onClick={() => onViewDetails(record)}
                    className="text-xs text-primary font-semibold hover:bg-primary/10"
                >
                    عرض
                </Button>
            ),
        },
    ];

    return (
        <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs">
            <Table
                rowKey="id"
                columns={columns}
                dataSource={activities.data}
                loading={loading}
                scroll={{ x: 900 }}
                expandable={{
                    expandedRowRender: (record) => (
                        <div className="bg-muted/30 p-3.5 rounded-lg border border-border/50">
                            <h5 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                                <FileEdit className="h-3.5 w-3.5 text-primary" />
                                تفاصيل التعديلات الكاملة على الحقول:
                            </h5>
                            <ActivityDiffViewer changes={record.changes} />
                        </div>
                    ),
                    rowExpandable: (record) => record.changes && record.changes.length > 0,
                }}
                pagination={{
                    current: activities.current_page,
                    pageSize: activities.per_page,
                    total: activities.total,
                    showSizeChanger: true,
                    pageSizeOptions: ['15', '20', '30', '50', '100'],
                    showTotal: (total, range) => (
                        <span className="text-xs text-muted-foreground font-medium">
                            عرض {range[0]} - {range[1]} من إجمالي {total.toLocaleString()} عملية
                        </span>
                    ),
                    onChange: (page, pageSize) => onPageChange(page, pageSize),
                }}
                locale={{
                    emptyText: (
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                                <span className="text-xs text-muted-foreground">
                                    لا توجد سجلات تطابق معايير التصفية الحالية.
                                </span>
                            }
                        />
                    ),
                }}
            />
        </div>
    );
}
