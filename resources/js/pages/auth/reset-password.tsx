import { Form, Head } from '@inertiajs/react';
import {
    CheckCircleOutlined,
    KeyOutlined,
    LockOutlined,
    MailOutlined,
    SaveOutlined,
} from '@ant-design/icons';
import { Button, Input } from 'antd';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { login } from '@/routes';
import { update } from '@/routes/password';

type Props = {
    token: string;
    email: string;
    passwordRules: string;
};

export default function ResetPassword({ token, email, passwordRules }: Props) {
    return (
        <>
            <Head title="تعيين كلمة المرور - منتجع النسور" />

            <Form
                {...update.form()}
                transform={(data) => ({ ...data, token, email })}
                resetOnSuccess={['password', 'password_confirmation']}
                className="space-y-4 text-right"
                dir="rtl"
            >
                {({ processing, errors }) => (
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label
                                htmlFor="email"
                                className="block text-xs font-bold text-foreground"
                            >
                                البريد الإلكتروني
                            </label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                autoComplete="email"
                                value={email}
                                readOnly
                                disabled
                                prefix={<MailOutlined className="text-stone-400 ml-1.5" />}
                                size="large"
                                className="w-full text-left rounded-xl bg-stone-100/70 dark:bg-stone-800/60 opacity-85"
                                dir="ltr"
                            />
                            <InputError
                                message={errors.email}
                                className="mt-1"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label
                                htmlFor="password"
                                className="block text-xs font-bold text-foreground"
                            >
                                كلمة المرور الجديدة
                            </label>
                            <Input.Password
                                id="password"
                                name="password"
                                autoComplete="new-password"
                                autoFocus
                                placeholder="أدخل كلمة المرور الجديدة"
                                prefix={<LockOutlined className="text-stone-400 ml-1.5" />}
                                status={errors.password ? 'error' : undefined}
                                size="large"
                                className="w-full text-left rounded-xl"
                                dir="ltr"
                            />
                            <InputError message={errors.password} className="mt-1" />
                        </div>

                        <div className="space-y-1.5">
                            <label
                                htmlFor="password_confirmation"
                                className="block text-xs font-bold text-foreground"
                            >
                                تأكيد كلمة المرور الجديدة
                            </label>
                            <Input.Password
                                id="password_confirmation"
                                name="password_confirmation"
                                autoComplete="new-password"
                                placeholder="أعد كتابة كلمة المرور للتأكيد"
                                prefix={<KeyOutlined className="text-stone-400 ml-1.5" />}
                                status={errors.password_confirmation ? 'error' : undefined}
                                size="large"
                                className="w-full text-left rounded-xl"
                                dir="ltr"
                            />
                            <InputError
                                message={errors.password_confirmation}
                                className="mt-1"
                            />
                        </div>

                        {/* Security Requirements Note */}
                        <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/40 border border-stone-200/60 dark:border-stone-800 text-[11px] text-muted-foreground space-y-1.5">
                            <div className="font-semibold text-foreground">
                                متطلبات كلمة المرور الآمنة:
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                                <div className="flex items-center gap-1.5">
                                    <CheckCircleOutlined className="text-[#053f89] dark:text-sky-400 text-xs" />
                                    <span>8 أحرف كحد أدنى</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <CheckCircleOutlined className="text-[#053f89] dark:text-sky-400 text-xs" />
                                    <span>أحرف كبيرة وصغيرة (A-Z)</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <CheckCircleOutlined className="text-[#053f89] dark:text-sky-400 text-xs" />
                                    <span>أرقام (0-9)</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <CheckCircleOutlined className="text-[#053f89] dark:text-sky-400 text-xs" />
                                    <span>رموز خاصة (!@#$%)</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button
                                type="primary"
                                htmlType="submit"
                                size="large"
                                block
                                loading={processing}
                                icon={<SaveOutlined />}
                                data-test="reset-password-button"
                                className="h-11 rounded-xl font-bold bg-gradient-to-r from-[#053f89] to-[#0284c7] hover:!from-[#04336f] hover:!to-[#0275b0] text-white border-0 shadow-md shadow-blue-900/20 transition-all duration-200"
                            >
                                حفظ كلمة المرور الجديدة والدخول
                            </Button>
                        </div>

                        <div className="text-center text-xs text-muted-foreground pt-4 border-t border-stone-200/70 dark:border-stone-800">
                            تذكرت كلمة المرور؟{' '}
                            <TextLink
                                href={login()}
                                className="font-bold text-[#053f89] dark:text-sky-400 hover:underline inline-flex items-center gap-1"
                            >
                                العودة إلى تسجيل الدخول
                            </TextLink>
                        </div>
                    </div>
                )}
            </Form>
        </>
    );
}

ResetPassword.layout = {
    title: 'تعيين كلمة المرور الجديدة',
    description: 'أدخل بريدك الإلكتروني وكلمة المرور الجديدة لتحديث بيانات الحساب',
};
