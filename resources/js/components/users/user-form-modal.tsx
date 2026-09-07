import React, { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import {
    App,
    Button,
    Checkbox,
    Collapse,
    Form,
    Input,
    Modal,
    Radio,
    Select,
    Switch,
    Tag,
} from 'antd';
import { Building2, KeyRound, Mail, Shield, User as UserIcon } from 'lucide-react';
import { store as storeUser, update as updateUser } from '@/routes/users';
import type {
    ManagedUser,
    PermissionGroup,
    RoleItem,
} from '@/types/user-management';

interface UserFormModalProps {
    open: boolean;
    onClose: () => void;
    user: ManagedUser | null;
    roles: RoleItem[];
    permissionGroups: PermissionGroup[];
    allSectors?: { id: number; name: string }[];
}

interface FormValues {
    name: string;
    email: string;
    password?: string;
    password_confirmation?: string;
    roles: string[];
    permissions: string[];
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
    open,
    onClose,
    user,
    roles,
    permissionGroups,
    allSectors = [],
}) => {
    const [form] = Form.useForm<FormValues>();
    const { message } = App.useApp();
    const [submitting, setSubmitting] = React.useState(false);
    const [hasSectorRestrictions, setHasSectorRestrictions] = useState<boolean>(false);
    const [sectorPermissions, setSectorPermissions] = useState<Record<number, 'view' | 'edit'>>({});

    const isEditing = Boolean(user);
    const selectedRoles = Form.useWatch('roles', form) || [];
    const isAdminRole = selectedRoles.includes('Super Admin') || selectedRoles.includes('Admin');

    useEffect(() => {
        if (open) {
            if (user) {
                form.setFieldsValue({
                    name: user.name,
                    email: user.email,
                    password: '',
                    password_confirmation: '',
                    roles: user.roles,
                    permissions: user.direct_permissions,
                });
                setHasSectorRestrictions(Boolean(user.has_sector_restrictions));
                const initialSectors: Record<number, 'view' | 'edit'> = {};
                (user.assigned_sectors || []).forEach((s) => {
                    initialSectors[s.sector_id] = s.permission;
                });
                setSectorPermissions(initialSectors);
            } else {
                form.resetFields();
                form.setFieldsValue({
                    roles: ['Receptionist'],
                    permissions: [],
                });
                setHasSectorRestrictions(false);
                setSectorPermissions({});
            }
        }
    }, [open, user, form]);

    const handleSubmit = async (values: FormValues) => {
        setSubmitting(true);

        const sectorsPayload = !hasSectorRestrictions
            ? []
            : Object.entries(sectorPermissions)
                .filter(([_, perm]) => perm === 'view' || perm === 'edit')
                .map(([sectorId, perm]) => ({
                    sector_id: Number(sectorId),
                    permission: perm,
                }));

        const payload: Record<string, any> = {
            name: values.name,
            email: values.email,
            roles: values.roles ?? [],
            permissions: values.permissions ?? [],
            has_sector_restrictions: hasSectorRestrictions,
            sectors: sectorsPayload,
        };

        if (values.password) {
            payload.password = values.password;
            payload.password_confirmation = values.password_confirmation;
        }

        if (isEditing && user) {
            router.put(updateUser.url({ user: user.id }), payload, {
                preserveScroll: true,
                onSuccess: () => {
                    message.success('تم تحديث بيانات المستخدم بنجاح');
                    onClose();
                },
                onError: (errors) => {
                    const formErrors = Object.entries(errors).map(([name, err]) => ({
                        name: name as keyof FormValues,
                        errors: [err as string],
                    }));
                    form.setFields(formErrors);
                },
                onFinish: () => setSubmitting(false),
            });
        } else {
            router.post(storeUser.url(), payload, {
                preserveScroll: true,
                onSuccess: () => {
                    message.success('تم إضافة المستخدم بنجاح');
                    onClose();
                },
                onError: (errors) => {
                    const formErrors = Object.entries(errors).map(([name, err]) => ({
                        name: name as keyof FormValues,
                        errors: [err as string],
                    }));
                    form.setFields(formErrors);
                },
                onFinish: () => setSubmitting(false),
            });
        }
    };

    return (
        <Modal
            title={
                <div className="flex items-center gap-2 text-base font-semibold">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {isEditing ? <UserIcon className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                    </div>
                    <span>{isEditing ? `تعديل المستخدم: ${user?.name}` : 'إضافة مستخدم جديد للنظام'}</span>
                </div>
            }
            open={open}
            onCancel={onClose}
            footer={null}
            destroyOnClose
            width={680}
            style={{ maxWidth: 'calc(100vw - 32px)' }}
            centered
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                className="mt-4 space-y-4"
                requiredMark="optional"
            >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Form.Item
                        name="name"
                        label="اسم المستخدم الكامل"
                        rules={[{ required: true, message: 'يرجى إدخال اسم المستخدم' }]}
                    >
                        <Input
                            prefix={<UserIcon className="h-4 w-4 text-muted-foreground" />}
                            placeholder="مثال: نقيب / أحمد محمد"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item
                        name="email"
                        label="البريد الإلكتروني"
                        rules={[
                            { required: true, message: 'يرجى إدخال البريد الإلكتروني' },
                            { type: 'email', message: 'صيغة البريد الإلكتروني غير صحيحة' },
                        ]}
                    >
                        <Input
                            prefix={<Mail className="h-4 w-4 text-muted-foreground" />}
                            placeholder="user@eaglesresort.com"
                            size="large"
                            dir="ltr"
                            className="text-left"
                        />
                    </Form.Item>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Form.Item
                        name="password"
                        label={isEditing ? 'كلمة المرور الجديدة (اختياري)' : 'كلمة المرور'}
                        rules={[
                            { required: !isEditing, message: 'يرجى إدخال كلمة المرور' },
                            { min: 8, message: 'يجب ألا تقل كلمة المرور عن 8 أحرف' },
                        ]}
                        tooltip={isEditing ? 'اترك الحقل فارغاً إذا كنت لا ترغب في تغيير كلمة المرور' : undefined}
                    >
                        <Input.Password
                            prefix={<KeyRound className="h-4 w-4 text-muted-foreground" />}
                            placeholder="••••••••"
                            size="large"
                            dir="ltr"
                        />
                    </Form.Item>

                    <Form.Item
                        name="password_confirmation"
                        label="تأكيد كلمة المرور"
                        dependencies={['password']}
                        rules={[
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('password') === value) {
                                        return Promise.resolve();
                                    }
                                    if (!getFieldValue('password') && isEditing) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('كلمة المرور غير متطابقة'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password
                            prefix={<KeyRound className="h-4 w-4 text-muted-foreground" />}
                            placeholder="••••••••"
                            size="large"
                            dir="ltr"
                        />
                    </Form.Item>
                </div>

                <Form.Item
                    name="roles"
                    label="الأدوار والصلاحيات الوظيفية"
                    rules={[{ required: true, message: 'يرجى اختيار دور واحد على الأقل' }]}
                >
                    <Select
                        mode="multiple"
                        placeholder="اختر دور أو أكثر للمستخدم"
                        size="large"
                        options={roles.map((r) => ({
                            value: r.name,
                            label: (
                                <div className="flex items-center justify-between">
                                    <span>{r.name}</span>
                                    {r.is_system && (
                                        <Tag color="blue" className="mr-1 text-[11px]">نظام</Tag>
                                    )}
                                </div>
                            ),
                        }))}
                    />
                </Form.Item>

                {/* Sector Assignments & Permissions */}
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            <span className="text-xs font-semibold text-foreground">
                                نطاق صلاحيات وإدارة القطاعات
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">تقييد بقطاعات محددة:</span>
                            <Switch
                                checked={hasSectorRestrictions}
                                onChange={(checked) => setHasSectorRestrictions(checked)}
                                size="small"
                            />
                        </div>
                    </div>

                    {!hasSectorRestrictions ? (
                        <div className="rounded-md bg-sky-50/60 p-2.5 text-xs text-sky-800 dark:bg-sky-950/40 dark:text-sky-300">
                            {isAdminRole
                                ? 'أدوار الإدارة (Super Admin / Admin) يمتلكون وصولاً لكافة القطاعات تلقائياً. لتخصيص قطاعات معينة، فعّل خيار التقييد أعلاه.'
                                : 'هذا المستخدم يمتلك وصولاً كاملاً لكافة قطاعات المنتجع حسب صلاحيات دوره الوظيفي (غير مقيد بقطاعات معينة).'}
                        </div>
                    ) : allSectors.length === 0 ? (
                        <div className="text-xs text-muted-foreground">لا توجد قطاعات مسجلة حالياً</div>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs text-muted-foreground pb-1 border-b border-border/40">
                                <span>حدد مستوى الوصول لكل قطاع:</span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="link"
                                        size="small"
                                        className="p-0 text-[11px]"
                                        onClick={() => {
                                            const allEdit: Record<number, 'view' | 'edit'> = {};
                                            allSectors.forEach((s) => { allEdit[s.id] = 'edit'; });
                                            setSectorPermissions(allEdit);
                                        }}
                                    >
                                        تعديل للكل
                                    </Button>
                                    <span>•</span>
                                    <Button
                                        type="link"
                                        size="small"
                                        className="p-0 text-[11px]"
                                        onClick={() => {
                                            const allView: Record<number, 'view' | 'edit'> = {};
                                            allSectors.forEach((s) => { allView[s.id] = 'view'; });
                                            setSectorPermissions(allView);
                                        }}
                                    >
                                        عرض للكل
                                    </Button>
                                    <span>•</span>
                                    <Button
                                        type="link"
                                        size="small"
                                        danger
                                        className="p-0 text-[11px]"
                                        onClick={() => setSectorPermissions({})}
                                    >
                                        إلغاء الكل
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                {allSectors.map((sector) => {
                                    const currentPerm = sectorPermissions[sector.id] || 'none';
                                    return (
                                        <div
                                            key={sector.id}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border border-border/40 bg-card p-2 text-xs"
                                        >
                                            <div className="flex items-center gap-2 font-medium text-foreground">
                                                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span>{sector.name}</span>
                                            </div>
                                            <Radio.Group
                                                size="small"
                                                value={currentPerm}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setSectorPermissions((prev) => {
                                                        const next = { ...prev };
                                                        if (val === 'none') {
                                                            delete next[sector.id];
                                                        } else {
                                                            next[sector.id] = val;
                                                        }
                                                        return next;
                                                    });
                                                }}
                                            >
                                                <Radio.Button value="none">لا وصول</Radio.Button>
                                                <Radio.Button value="view">عرض فقط</Radio.Button>
                                                <Radio.Button value="edit">عرض وتعديل</Radio.Button>
                                            </Radio.Group>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                    <Collapse
                        ghost
                        size="small"
                        items={[
                            {
                                key: 'direct-permissions',
                                label: (
                                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                                        <span>صلاحيات مباشرة إضافية خاصة بالمستخدم (اختياري)</span>
                                        <Tag color="default" className="text-[11px]">متقدم</Tag>
                                    </div>
                                ),
                                children: (
                                    <Form.Item name="permissions" className="mb-0">
                                        <Checkbox.Group className="w-full">
                                            <div className="space-y-4 pt-2">
                                                {permissionGroups.map((group) => (
                                                    <div key={group.key} className="space-y-2 rounded-md border border-border/40 p-2.5">
                                                        <div className="text-xs font-semibold text-foreground">
                                                            {group.label}
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                            {group.permissions.map((p) => (
                                                                <Checkbox key={p.name} value={p.name} className="text-xs">
                                                                    {p.label}
                                                                </Checkbox>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </Checkbox.Group>
                                    </Form.Item>
                                ),
                            },
                        ]}
                    />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                    <Button onClick={onClose} disabled={submitting}>
                        إلغاء
                    </Button>
                    <Button type="primary" htmlType="submit" loading={submitting}>
                        {isEditing ? 'حفظ التعديلات' : 'إنشاء المستخدم'}
                    </Button>
                </div>
            </Form>
        </Modal>
    );
};
