import React from 'react';
import { router } from '@inertiajs/react';
import { App, Button, Form, Input, Modal } from 'antd';
import { KeyRound, Lock } from 'lucide-react';
import { updatePassword } from '@/routes/users';
import type { ManagedUser } from '@/types/user-management';

interface UserPasswordModalProps {
    open: boolean;
    onClose: () => void;
    user: ManagedUser | null;
}

interface PasswordFormValues {
    password: string;
    password_confirmation: string;
}

export const UserPasswordModal: React.FC<UserPasswordModalProps> = ({
    open,
    onClose,
    user,
}) => {
    const [form] = Form.useForm<PasswordFormValues>();
    const { message } = App.useApp();
    const [submitting, setSubmitting] = React.useState(false);

    const handleSubmit = async (values: PasswordFormValues) => {
        if (!user) return;
        setSubmitting(true);

        router.patch(updatePassword.url({ user: user.id }), values as any, {
            preserveScroll: true,
            onSuccess: () => {
                message.success('تم تغيير كلمة المرور بنجاح');
                form.resetFields();
                onClose();
            },
            onError: (errors) => {
                const formErrors = Object.entries(errors).map(([name, err]) => ({
                    name: name as keyof PasswordFormValues,
                    errors: [err as string],
                }));
                form.setFields(formErrors);
            },
            onFinish: () => setSubmitting(false),
        });
    };

    return (
        <Modal
            title={
                <div className="flex items-center gap-2 text-base font-semibold">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                        <Lock className="h-4 w-4" />
                    </div>
                    <span>تعيين كلمة مرور جديدة: {user?.name}</span>
                </div>
            }
            open={open}
            onCancel={onClose}
            footer={null}
            destroyOnClose
            width={480}
            style={{ maxWidth: 'calc(100vw - 32px)' }}
            centered
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                className="mt-4 space-y-4"
            >
                <p className="text-xs text-muted-foreground">
                    سيتم تحديث كلمة المرور للحساب ({user?.email}) فوراً وسيتمكن المستخدم من تسجيل الدخول بها.
                </p>

                <Form.Item
                    name="password"
                    label="كلمة المرور الجديدة"
                    rules={[
                        { required: true, message: 'يرجى إدخال كلمة المرور' },
                        { min: 8, message: 'يجب ألا تقل كلمة المرور عن 8 أحرف' },
                    ]}
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
                        { required: true, message: 'يرجى تأكيد كلمة المرور' },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || getFieldValue('password') === value) {
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

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                    <Button onClick={onClose} disabled={submitting}>
                        إلغاء
                    </Button>
                    <Button type="primary" htmlType="submit" loading={submitting}>
                        تحديث كلمة المرور
                    </Button>
                </div>
            </Form>
        </Modal>
    );
};
