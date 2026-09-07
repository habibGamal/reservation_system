import React, { useEffect } from 'react';
import { router } from '@inertiajs/react';
import {
    App,
    Button,
    Checkbox,
    Form,
    Input,
    Modal,
    Tag,
} from 'antd';
import { CheckCheck, Shield } from 'lucide-react';
import { store as storeRole, update as updateRole } from '@/routes/roles';
import type { PermissionGroup, RoleItem } from '@/types/user-management';

interface RoleFormModalProps {
    open: boolean;
    onClose: () => void;
    role: RoleItem | null;
    permissionGroups: PermissionGroup[];
}

interface RoleFormValues {
    name: string;
    permissions: string[];
}

export const RoleFormModal: React.FC<RoleFormModalProps> = ({
    open,
    onClose,
    role,
    permissionGroups,
}) => {
    const [form] = Form.useForm<RoleFormValues>();
    const { message } = App.useApp();
    const [submitting, setSubmitting] = React.useState(false);

    const isEditing = Boolean(role);
    const isSystemRole = role?.is_system ?? false;

    useEffect(() => {
        if (open) {
            if (role) {
                form.setFieldsValue({
                    name: role.name,
                    permissions: role.permissions,
                });
            } else {
                form.resetFields();
                form.setFieldsValue({
                    name: '',
                    permissions: [],
                });
            }
        }
    }, [open, role, form]);

    const handleSubmit = async (values: RoleFormValues) => {
        setSubmitting(true);

        const payload = {
            name: values.name,
            permissions: values.permissions ?? [],
        };

        if (isEditing && role) {
            router.put(updateRole.url({ role: role.id }), payload, {
                preserveScroll: true,
                onSuccess: () => {
                    message.success('تم تحديث الدور والصلاحيات بنجاح');
                    onClose();
                },
                onError: (errors) => {
                    const formErrors = Object.entries(errors).map(([name, err]) => ({
                        name: name as keyof RoleFormValues,
                        errors: [err as string],
                    }));
                    form.setFields(formErrors);
                },
                onFinish: () => setSubmitting(false),
            });
        } else {
            router.post(storeRole.url(), payload, {
                preserveScroll: true,
                onSuccess: () => {
                    message.success('تم إنشاء الدور بنجاح');
                    onClose();
                },
                onError: (errors) => {
                    const formErrors = Object.entries(errors).map(([name, err]) => ({
                        name: name as keyof RoleFormValues,
                        errors: [err as string],
                    }));
                    form.setFields(formErrors);
                },
                onFinish: () => setSubmitting(false),
            });
        }
    };

    const handleSelectAllGroup = (groupPermissions: string[], select: boolean) => {
        const current = form.getFieldValue('permissions') || [];
        let updated: string[];
        if (select) {
            updated = Array.from(new Set([...current, ...groupPermissions]));
        } else {
            updated = current.filter((p: string) => !groupPermissions.includes(p));
        }
        form.setFieldValue('permissions', updated);
    };

    return (
        <Modal
            title={
                <div className="flex items-center gap-2 text-base font-semibold">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
                        <Shield className="h-4 w-4" />
                    </div>
                    <span>{isEditing ? `تعديل الدور: ${role?.name}` : 'إضافة دور وصلاحيات وظيفية جديدة'}</span>
                </div>
            }
            open={open}
            onCancel={onClose}
            footer={null}
            destroyOnClose
            width={720}
            style={{ maxWidth: 'calc(100vw - 32px)' }}
            centered
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                className="mt-4 space-y-4"
            >
                <Form.Item
                    name="name"
                    label="اسم الدور الوظيفي"
                    rules={[{ required: true, message: 'يرجى إدخال اسم الدور' }]}
                    tooltip={isSystemRole ? 'أدوار النظام الأساسية لا يمكن تغيير اسمها' : undefined}
                >
                    <Input
                        placeholder="مثال: مشرف قطاع أو محاسب فرعي"
                        size="large"
                        disabled={isSystemRole}
                    />
                </Form.Item>

                {isSystemRole && (
                    <div className="rounded-md bg-blue-50/50 p-2.5 text-xs text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                        هذا الدور من أدوار النظام المعتمدة. يمكنك ضبط الصلاحيات الممنوحة له لحسابات المستخدمين التابعين له.
                    </div>
                )}

                <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between border-b pb-2">
                        <span className="text-sm font-semibold">الصلاحيات المخصصة لهذا الدور</span>
                        <span className="text-xs text-muted-foreground">حدد الصلاحيات المطلوبة بدقة</span>
                    </div>

                    <Form.Item name="permissions" className="mb-0">
                        <Checkbox.Group className="w-full">
                            <div className="space-y-4 max-h-[420px] overflow-y-auto px-1">
                                {permissionGroups.map((group) => {
                                    const groupPermNames = group.permissions.map((p) => p.name);
                                    return (
                                        <div
                                            key={group.key}
                                            className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2.5"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-foreground">
                                                        {group.label}
                                                    </span>
                                                    <Tag className="text-[11px] font-mono">
                                                        {group.permissions.length}
                                                    </Tag>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectAllGroup(groupPermNames, true)}
                                                        className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
                                                    >
                                                        <CheckCheck className="h-3 w-3" />
                                                        تحديد الكل
                                                    </button>
                                                    <span className="text-muted-foreground">•</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectAllGroup(groupPermNames, false)}
                                                        className="text-[11px] text-muted-foreground hover:underline"
                                                    >
                                                        إلغاء التحديد
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pt-1 border-t border-border/40">
                                                {group.permissions.map((p) => (
                                                    <Checkbox key={p.name} value={p.name} className="text-xs">
                                                        {p.label}
                                                    </Checkbox>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Checkbox.Group>
                    </Form.Item>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                    <Button onClick={onClose} disabled={submitting}>
                        إلغاء
                    </Button>
                    <Button type="primary" htmlType="submit" loading={submitting}>
                        {isEditing ? 'حفظ الصلاحيات' : 'إنشاء الدور'}
                    </Button>
                </div>
            </Form>
        </Modal>
    );
};
