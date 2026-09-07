import React from 'react';
import { router } from '@inertiajs/react';
import {
    App,
    Badge,
    Button,
    Card,
    Popconfirm,
    Table,
    Tag,
    Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    Check,
    Edit,
    Plus,
    Shield,
    Trash2,
    Users,
    X,
} from 'lucide-react';
import { destroy as destroyRole } from '@/routes/roles';
import type {
    PermissionDefinition,
    PermissionGroup,
    RoleItem,
} from '@/types/user-management';

interface PermissionsMatrixProps {
    roles: RoleItem[];
    permissionGroups: PermissionGroup[];
    onEditRole: (role: RoleItem) => void;
    onCreateRole: () => void;
}

interface MatrixRowItem {
    key: string;
    groupLabel: string;
    permission: PermissionDefinition;
}

export const PermissionsMatrix: React.FC<PermissionsMatrixProps> = ({
    roles,
    permissionGroups,
    onEditRole,
    onCreateRole,
}) => {
    const { message } = App.useApp();

    const handleDeleteRole = (role: RoleItem) => {
        router.delete(destroyRole.url({ role: role.id }), {
            preserveScroll: true,
            onSuccess: () => message.success('تم حذف الدور بنجاح'),
            onError: (err) => message.error(err.role || 'تعذر حذف الدور'),
        });
    };

    // Flatten permission groups into matrix table rows
    const matrixData: MatrixRowItem[] = React.useMemo(() => {
        const rows: MatrixRowItem[] = [];
        permissionGroups.forEach((group) => {
            group.permissions.forEach((perm) => {
                rows.push({
                    key: perm.name,
                    groupLabel: group.label,
                    permission: perm,
                });
            });
        });
        return rows;
    }, [permissionGroups]);

    // Antd columns: Permission name, category, and one column per role
    const columns: ColumnsType<MatrixRowItem> = [
        {
            title: 'الوحدة / التصنيف',
            dataIndex: 'groupLabel',
            key: 'groupLabel',
            width: 170,
            onCell: (_, index) => {
                // Grouping cells visually if needed, or simple badge
                return {};
            },
            render: (text) => (
                <Tag color="cyan" className="text-xs font-normal">
                    {text}
                </Tag>
            ),
        },
        {
            title: 'اسم الصلاحية والإجراء',
            key: 'permission',
            width: 280,
            render: (_, record) => (
                <div>
                    <div className="text-xs font-semibold text-foreground">
                        {record.permission.label}
                    </div>
                    <div className="text-[11px] font-mono text-muted-foreground" dir="ltr">
                        {record.permission.name}
                    </div>
                </div>
            ),
        },
        ...roles.map((role) => ({
            title: (
                <div className="text-center py-1">
                    <div className="flex items-center justify-center gap-1 font-bold text-xs">
                        <Shield className="h-3.5 w-3.5 text-primary" />
                        <span>{role.name}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-center gap-1">
                        <Tag color={role.is_system ? 'blue' : 'purple'} className="m-0 text-[10px]">
                            {role.users_count} مستخدم
                        </Tag>
                    </div>
                </div>
            ),
            key: `role_${role.id}`,
            align: 'center' as const,
            width: 140,
            render: (_: unknown, record: MatrixRowItem) => {
                const hasPerm = role.name === 'Super Admin' || role.permissions.includes(record.permission.name);
                return hasPerm ? (
                    <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                    </div>
                ) : (
                    <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted/60 text-muted-foreground/40">
                        <X className="h-3.5 w-3.5 stroke-[1.5]" />
                    </div>
                );
            },
        })),
    ];

    return (
        <div className="space-y-6">
            {/* Roles Summary Cards */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h3 className="text-sm font-bold text-foreground">الأدوار الوظيفية المعتمدة</h3>
                    <p className="text-xs text-muted-foreground">
                        نظرة عامة على أدوار النظام وتوزيع الصلاحيات على المستخدمين
                    </p>
                </div>
                <Button
                    type="primary"
                    icon={<Plus className="h-3.5 w-3.5" />}
                    onClick={onCreateRole}
                    className="flex items-center gap-1 w-full sm:w-auto justify-center"
                >
                    إنشاء دور جديد
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {roles.map((role) => (
                    <Card
                        key={role.id}
                        size="small"
                        className="transition-all hover:shadow-md border-border/70"
                        title={
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-primary" />
                                    <span className="font-semibold text-sm">{role.name}</span>
                                </div>
                                {role.is_system ? (
                                    <Tag color="blue" className="text-[10px]">نظام</Tag>
                                ) : (
                                    <Tag color="purple" className="text-[10px]">مخصص</Tag>
                                )}
                            </div>
                        }
                        extra={
                            <div className="flex items-center gap-1">
                                <Tooltip title="تعديل الصلاحيات">
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<Edit className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />}
                                        onClick={() => onEditRole(role)}
                                    />
                                </Tooltip>
                                {!role.is_system && (
                                    <Popconfirm
                                        title="حذف الدور"
                                        description="هل أنت متأكد من رغبتك في حذف هذا الدور؟"
                                        onConfirm={() => handleDeleteRole(role)}
                                        okText="نعم، حذف"
                                        cancelText="إلغاء"
                                        okButtonProps={{ danger: true }}
                                    >
                                        <Tooltip title="حذف الدور">
                                            <Button
                                                type="text"
                                                size="small"
                                                danger
                                                icon={<Trash2 className="h-3.5 w-3.5" />}
                                            />
                                        </Tooltip>
                                    </Popconfirm>
                                )}
                            </div>
                        }
                    >
                        <div className="space-y-2 pt-1">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Users className="h-3.5 w-3.5" />
                                    المستخدمين المرتبطين:
                                </span>
                                <span className="font-bold text-foreground">{role.users_count}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>عدد الصلاحيات الممنوحة:</span>
                                <span className="font-bold text-foreground">
                                    {role.name === 'Super Admin' ? 'الكل (شامل)' : `${role.permissions.length} صلاحية`}
                                </span>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Permissions Matrix Table */}
            <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-bold text-foreground">مصفوفة مطابقة الصلاحيات للأدوار</h4>
                        <p className="text-xs text-muted-foreground">
                            جدول تفصيلي يوضح الصلاحيات الممنوحة لكل دور داخل نظام منتجع النسور
                        </p>
                    </div>
                </div>

                <Table
                    columns={columns}
                    dataSource={matrixData}
                    pagination={false}
                    bordered
                    size="small"
                    scroll={{ x: 800 }}
                    rowClassName={(_, index) => (index % 2 === 0 ? 'bg-muted/10' : '')}
                />
            </div>
        </div>
    );
};
