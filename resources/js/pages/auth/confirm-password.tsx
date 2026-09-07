import { Form, Head, Link } from '@inertiajs/react';
import { LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Button, Input } from 'antd';
import InputError from '@/components/input-error';
import { store } from '@/routes/password/confirm';
import { dashboard } from '@/routes';

export default function ConfirmPassword() {
    return (
        <>
            <Head title="تأكيد كلمة المرور - منتجع النسور" />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="space-y-4 text-right"
                dir="rtl"
            >
                {({ processing, errors }) => (
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label
                                htmlFor="password"
                                className="block text-xs font-bold text-foreground"
                            >
                                كلمة المرور
                            </label>
                            <Input.Password
                                id="password"
                                name="password"
                                placeholder="أدخل كلمة المرور الحالية للتأكيد"
                                autoComplete="current-password"
                                autoFocus
                                prefix={<LockOutlined className="text-stone-400 ml-1.5" />}
                                status={errors.password ? 'error' : undefined}
                                size="large"
                                className="w-full text-left rounded-xl"
                                dir="ltr"
                            />
                            <InputError message={errors.password} className="mt-1" />
                        </div>

                        <div className="pt-2">
                            <Button
                                type="primary"
                                htmlType="submit"
                                size="large"
                                block
                                loading={processing}
                                icon={<SafetyCertificateOutlined />}
                                data-test="confirm-password-button"
                                className="h-11 rounded-xl font-bold bg-gradient-to-r from-[#053f89] to-[#0284c7] hover:!from-[#04336f] hover:!to-[#0275b0] text-white border-0 shadow-md shadow-blue-900/20 transition-all duration-200"
                            >
                                تأكيد ومتابعة
                            </Button>
                        </div>

                        <div className="text-center text-xs text-muted-foreground pt-4 border-t border-stone-200/70 dark:border-stone-800">
                            <Link
                                href={dashboard()}
                                className="font-semibold text-[#053f89] dark:text-sky-400 hover:underline inline-flex items-center gap-1"
                            >
                                إلغاء والعودة إلى لوحة التحكم
                            </Link>
                        </div>
                    </div>
                )}
            </Form>
        </>
    );
}

ConfirmPassword.layout = {
    title: 'تأكيد كلمة المرور',
    description: 'هذه منطقة آمنة ومحمية في النظام. يُرجى تأكيد كلمة المرور الخاصة بك للمتابعة.',
};
