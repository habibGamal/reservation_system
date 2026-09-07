import React, { useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { Card, Tabs } from 'antd';
import {
    KeyRound,
    Shield,
    ShieldAlert,
    ShieldCheck,
    UserCheck,
    Users,
} from 'lucide-react';
import { UserFormModal } from '@/components/users/user-form-modal';
import { UserPasswordModal } from '@/components/users/user-password-modal';
import { RoleFormModal } from '@/components/users/role-form-modal';
import { PermissionsMatrix } from '@/components/users/permissions-matrix';
import { UserTable } from '@/components/users/user-table';
import type {
    ManagedUser,
    RoleItem,
    UserManagementProps,
} from '@/types/user-management';
import type { Auth } from '@/types/auth';

export default function UsersIndex({
    users,
    roles,
    permissionGroups,
    stats,
    allSectors = [],
}: UserManagementProps) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const currentUserId = auth?.user?.id;

    // Modals state
    const [userModalOpen, setUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);

    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [passwordUser, setPasswordUser] = useState<ManagedUser | null>(null);

    const [roleModalOpen, setRoleModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<RoleItem | null>(null);

    const handleCreateUser = () => {
        setEditingUser(null);
        setUserModalOpen(true);
    };

    const handleEditUser = (user: ManagedUser) => {
        setEditingUser(user);
        setUserModalOpen(true);
    };

    const handlePasswordChange = (user: ManagedUser) => {
        setPasswordUser(user);
        setPasswordModalOpen(true);
    };

    const handleCreateRole = () => {
        setEditingRole(null);
        setRoleModalOpen(true);
    };

    const handleEditRole = (role: RoleItem) => {
        setEditingRole(role);
        setRoleModalOpen(true);
    };

    return (
        <>
            <Head title="إدارة المستخدمين والصلاحيات" />

            <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8 ">
                {/* Page Header */}
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                                إدارة المستخدمين والصلاحيات
                            </h1>
                        </div>
                        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                            إدارة حسابات موظفي منتجع النسور وتعيين الأدوار وضبط مصفوفة الصلاحيات
                        </p>
                    </div>
                </div>

                {/* KPI Overview Metrics */}
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Card size="small" className="border-border/60 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[11px] sm:text-xs text-muted-foreground">إجمالي المستخدمين</p>
                                <p className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                                    {stats.total_users}
                                </p>
                            </div>
                            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                            </div>
                        </div>
                    </Card>

                    <Card size="small" className="border-border/60 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[11px] sm:text-xs text-muted-foreground">مدراء النظام</p>
                                <p className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                                    {stats.admin_users}
                                </p>
                            </div>
                            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                                <ShieldAlert className="h-4 w-4 sm:h-5 sm:w-5" />
                            </div>
                        </div>
                    </Card>

                    <Card size="small" className="border-border/60 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[11px] sm:text-xs text-muted-foreground">موظفي الاستقبال</p>
                                <p className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                                    {stats.receptionist_users}
                                </p>
                            </div>
                            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                                <UserCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                            </div>
                        </div>
                    </Card>

                    <Card size="small" className="border-border/60 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[11px] sm:text-xs text-muted-foreground">الأدوار والصلاحيات</p>
                                <p className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                                    {stats.total_roles} / {stats.total_permissions}
                                </p>
                            </div>
                            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                                <KeyRound className="h-4 w-4 sm:h-5 sm:w-5" />
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Main Content Tabs */}
                <div className="rounded-xl border border-border/60 bg-card p-3 sm:p-6 shadow-xs">
                    <Tabs
                        defaultActiveKey="users"
                        items={[
                            {
                                key: 'users',
                                label: (
                                    <div className="flex items-center gap-2 text-sm font-semibold">
                                        <Users className="h-4 w-4" />
                                        <span>قائمة المستخدمين ({users.length})</span>
                                    </div>
                                ),
                                children: (
                                    <div className="pt-2">
                                        <UserTable
                                            users={users}
                                            roles={roles}
                                            currentUserId={currentUserId}
                                            onEditUser={handleEditUser}
                                            onPasswordChange={handlePasswordChange}
                                            onCreateUser={handleCreateUser}
                                        />
                                    </div>
                                ),
                            },
                            {
                                key: 'roles',
                                label: (
                                    <div className="flex items-center gap-2 text-sm font-semibold">
                                        <Shield className="h-4 w-4" />
                                        <span>الأدوار ومصفوفة الصلاحيات ({roles.length})</span>
                                    </div>
                                ),
                                children: (
                                    <div className="pt-2">
                                        <PermissionsMatrix
                                            roles={roles}
                                            permissionGroups={permissionGroups}
                                            onEditRole={handleEditRole}
                                            onCreateRole={handleCreateRole}
                                        />
                                    </div>
                                ),
                            },
                        ]}
                    />
                </div>
            </div>

            {/* Modals */}
            <UserFormModal
                open={userModalOpen}
                onClose={() => {
                    setUserModalOpen(false);
                    setEditingUser(null);
                }}
                user={editingUser}
                roles={roles}
                permissionGroups={permissionGroups}
                allSectors={allSectors}
            />

            <UserPasswordModal
                open={passwordModalOpen}
                onClose={() => {
                    setPasswordModalOpen(false);
                    setPasswordUser(null);
                }}
                user={passwordUser}
            />

            <RoleFormModal
                open={roleModalOpen}
                onClose={() => {
                    setRoleModalOpen(false);
                    setEditingRole(null);
                }}
                role={editingRole}
                permissionGroups={permissionGroups}
            />
        </>
    );
}

UsersIndex.layout = {
    breadcrumbs: [
        {
            title: 'المستخدمين والصلاحيات',
            href: '/users',
        },
    ],
};
