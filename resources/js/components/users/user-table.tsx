import React, { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import {
    App,
    Avatar,
    Button,
    Input,
    Popconfirm,
    Popover,
    Select,
    Table,
    Tag,
    Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    Building2,
    Edit,
    KeyRound,
    Mail,
    Plus,
    Search,
    Shield,
    Trash2,
    User as UserIcon,
} from 'lucide-react';
import { destroy as destroyUser } from '@/routes/users';
import type { ManagedUser, RoleItem } from '@/types/user-management';

interface UserTableProps {
    users: ManagedUser[];
    roles: RoleItem[];
    currentUserId?: number;
    onEditUser: (user: ManagedUser) => void;
    onPasswordChange: (user: ManagedUser) => void;
    onCreateUser: () => void;
}

export const UserTable: React.FC<UserTableProps> = ({
    users,
    roles,
    currentUserId,
    onEditUser,
    onPasswordChange,
    onCreateUser,
}) => {
    const { message } = App.useApp();
    const [searchText, setSearchText] = useState('');
    const [selectedRole, setSelectedRole] = useState<string>('ALL');

    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
            const matchesSearch =
                searchText.trim() === '' ||
                user.name.toLowerCase().includes(searchText.toLowerCase()) ||
                user.email.toLowerCase().includes(searchText.toLowerCase());

            const matchesRole =
                selectedRole === 'ALL' || user.roles.includes(selectedRole);

            return matchesSearch && matchesRole;
        });
    }, [users, searchText, selectedRole]);

    const handleDelete = (user: ManagedUser) => {
        router.delete(destroyUser.url({ user: user.id }), {
            preserveScroll: true,
            onSuccess: () => message.success('تم حذف المستخدم بنجاح'),
            onError: (err) => message.error(err.user || 'تعذر حذف المستخدم'),
        });
    };

    const getRoleTagColor = (roleName: string) => {
        switch (roleName) {
            case 'Super Admin':
                return 'gold';
            case 'Admin':
                return 'blue';
            case 'Receptionist':
                return 'green';
            case 'Viewer':
                return 'purple';
            default:
                return 'cyan';
        }
    };

    const columns: ColumnsType<ManagedUser> = [
        {
            title: 'المستخدم',
            key: 'user',
            width: 280,
            render: (_, record) => {
                const initials = record.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('');

                const isCurrentUser = record.id === currentUserId;

                return (
                    <div className="flex items-center gap-3">
                        <Avatar
                            style={{ backgroundColor: isCurrentUser ? '#0284c7' : '#64748b' }}
                            size={40}
                            className="shrink-0 font-bold"
                        >
                            {initials || <UserIcon className="h-4 w-4" />}
                        </Avatar>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 font-semibold text-sm text-foreground">
                                <span className="truncate">{record.name}</span>
                                {isCurrentUser && (
                                    <Tag color="cyan" className="m-0 text-[10px]">
                                        أنت
                                    </Tag>
                                )}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground truncate" dir="ltr">
                                <Mail className="h-3 w-3 shrink-0" />
                                <span className="truncate">{record.email}</span>
                            </div>
                        </div>
                    </div>
                );
            },
        },
        {
            title: 'الأدوار المعينة',
            key: 'roles',
            width: 200,
            render: (_, record) => (
                <div className="flex flex-wrap gap-1">
                    {record.roles.length > 0 ? (
                        record.roles.map((role) => (
                            <Tag
                                key={role}
                                color={getRoleTagColor(role)}
                                className="flex items-center gap-1 text-xs font-normal"
                            >
                                <Shield className="h-3 w-3" />
                                {role}
                            </Tag>
                        ))
                    ) : (
                        <span className="text-xs text-muted-foreground">بدون أدوار</span>
                    )}
                </div>
            ),
        },
        {
            title: 'القطاعات المخصصة',
            key: 'assigned_sectors',
            width: 240,
            render: (_, record) => {
                const isSuperAdmin = record.roles.includes('Super Admin');
                const isAdmin = record.roles.includes('Admin');
                if (isSuperAdmin || isAdmin) {
                    return (
                        <Tag color="cyan" className="inline-flex items-center gap-1 text-xs">
                            <Building2 className="h-3 w-3" />
                            جميع القطاعات (إشراف كامل)
                        </Tag>
                    );
                }

                if (!record.has_sector_restrictions) {
                    return (
                        <Tag color="blue" className="inline-flex items-center gap-1 text-xs">
                            <Building2 className="h-3 w-3" />
                            جميع القطاعات (وصول كامل)
                        </Tag>
                    );
                }

                const assigned = record.assigned_sectors ?? [];
                if (assigned.length === 0) {
                    return (
                        <Tag color="default" className="text-xs text-muted-foreground">
                            محظور من كافة القطاعات (لا وصول)
                        </Tag>
                    );
                }

                return (
                    <div className="flex flex-wrap gap-1">
                        {assigned.map((sec) => (
                            <Tag
                                key={sec.sector_id}
                                color={sec.permission === 'edit' ? 'green' : 'blue'}
                                className="inline-flex items-center gap-1 text-[11px]"
                            >
                                <span>{sec.sector_name}</span>
                                <span className="text-[10px] opacity-80">
                                    ({sec.permission === 'edit' ? 'تعديل' : 'عرض'})
                                </span>
                            </Tag>
                        ))}
                    </div>
                );
            },
        },
        {
            title: 'الصلاحيات المباشرة',
            key: 'direct_permissions',
            width: 180,
            render: (_, record) => {
                const count = record.direct_permissions.length;
                if (count === 0) {
                    return <span className="text-xs text-muted-foreground">تتبع الأدوار فقط</span>;
                }

                return (
                    <Popover
                        content={
                            <div className="max-w-xs space-y-1 p-1">
                                <div className="text-xs font-bold mb-2">صلاحيات مباشرة مخصصة:</div>
                                <div className="flex flex-wrap gap-1">
                                    {record.direct_permissions.map((p) => (
                                        <Tag key={p} color="default" className="text-[11px] font-mono" dir="ltr">
                                            {p}
                                        </Tag>
                                    ))}
                                </div>
                            </div>
                        }
                        title={null}
                    >
                        <Tag color="geekblue" className="cursor-pointer text-xs">
                            +{count} صلاحيات إضافية
                        </Tag>
                    </Popover>
                );
            },
        },
        {
            title: 'تاريخ الإنشاء',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 140,
            render: (date) => (
                <span className="text-xs text-muted-foreground" dir="ltr">
                    {date ? new Date(date).toLocaleDateString('ar-EG') : '—'}
                </span>
            ),
        },
        {
            title: 'الإجراءات',
            key: 'actions',
            width: 150,
            align: 'center',
            render: (_, record) => {
                const isCurrentUser = record.id === currentUserId;
                return (
                    <div className="flex items-center justify-center gap-1">
                        <Tooltip title="تعديل المستخدم">
                            <Button
                                type="text"
                                size="small"
                                icon={<Edit className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />}
                                onClick={() => onEditUser(record)}
                            />
                        </Tooltip>

                        <Tooltip title="تغيير كلمة المرور">
                            <Button
                                type="text"
                                size="small"
                                icon={<KeyRound className="h-3.5 w-3.5 text-muted-foreground hover:text-amber-500" />}
                                onClick={() => onPasswordChange(record)}
                            />
                        </Tooltip>

                        <Popconfirm
                            title="حذف المستخدم"
                            description={`هل أنت متأكد من حذف الحساب "${record.name}"؟`}
                            onConfirm={() => handleDelete(record)}
                            okText="نعم، حذف"
                            cancelText="إلغاء"
                            disabled={isCurrentUser}
                            okButtonProps={{ danger: true }}
                        >
                            <Tooltip title={isCurrentUser ? 'لا يمكنك حذف حسابك الشخصي' : 'حذف المستخدم'}>
                                <Button
                                    type="text"
                                    size="small"
                                    danger
                                    disabled={isCurrentUser}
                                    icon={<Trash2 className="h-3.5 w-3.5" />}
                                />
                            </Tooltip>
                        </Popconfirm>
                    </div>
                );
            },
        },
    ];

    return (
        <div className="space-y-4">
            {/* Filter and Action Bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 flex-wrap items-center gap-2">
                    <Input
                        placeholder="البحث بالاسم أو البريد الإلكتروني..."
                        prefix={<Search className="h-4 w-4 text-muted-foreground" />}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-full sm:w-64"
                        allowClear
                    />

                    <Select
                        value={selectedRole}
                        onChange={setSelectedRole}
                        className="w-full sm:w-44"
                        options={[
                            { value: 'ALL', label: 'جميع الأدوار' },
                            ...roles.map((r) => ({ value: r.name, label: r.name })),
                        ]}
                    />
                </div>

                <Button
                    type="primary"
                    icon={<Plus className="h-4 w-4" />}
                    onClick={onCreateUser}
                    className="flex items-center gap-1.5 w-full sm:w-auto justify-center"
                >
                    إضافة مستخدم جديد
                </Button>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border/60 bg-card shadow-xs overflow-hidden">
                <Table
                    columns={columns}
                    dataSource={filteredUsers}
                    rowKey="id"
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50'],
                    }}
                    size="middle"
                    scroll={{ x: 750 }}
                />
            </div>
        </div>
    );
};
