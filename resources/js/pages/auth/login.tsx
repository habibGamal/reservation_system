import { Form, Head } from '@inertiajs/react';
import { LockOutlined, LoginOutlined, MailOutlined } from '@ant-design/icons';
import { Button, Checkbox, Input } from 'antd';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

export default function Login({ status, canResetPassword }: Props) {
    return (
        <>
            <Head title="تسجيل الدخول - منتجع النسور" />

            {status && (
                <div className="mb-5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-center text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                    {status}
                </div>
            )}

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
                                htmlFor="email"
                                className="block text-xs font-bold text-foreground"
                            >
                                البريد الإلكتروني
                            </label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                required
                                autoFocus
                                tabIndex={1}
                                autoComplete="email"
                                placeholder="name@eagles-resort.com"
                                prefix={<MailOutlined className="text-stone-400 ml-1.5" />}
                                status={errors.email ? 'error' : undefined}
                                size="large"
                                className="w-full text-left rounded-xl"
                                dir="ltr"
                            />
                            <InputError message={errors.email} className="mt-1" />
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label
                                    htmlFor="password"
                                    className="text-xs font-bold text-foreground"
                                >
                                    كلمة المرور
                                </label>
                                {canResetPassword && (
                                    <TextLink
                                        href={request()}
                                        className="text-xs font-semibold text-[#053f89] dark:text-sky-400 hover:text-sky-600 transition-colors"
                                        tabIndex={5}
                                    >
                                        نسيت كلمة المرور؟
                                    </TextLink>
                                )}
                            </div>
                            <Input.Password
                                id="password"
                                name="password"
                                required
                                tabIndex={2}
                                autoComplete="current-password"
                                placeholder="••••••••"
                                prefix={<LockOutlined className="text-stone-400 ml-1.5" />}
                                status={errors.password ? 'error' : undefined}
                                size="large"
                                className="w-full text-left rounded-xl"
                                dir="ltr"
                            />
                            <InputError message={errors.password} className="mt-1" />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <Checkbox
                                id="remember"
                                name="remember"
                                tabIndex={3}
                            >
                                <span className="text-xs font-medium text-stone-600 dark:text-stone-400 select-none">
                                    تذكرني على هذا الجهاز
                                </span>
                            </Checkbox>
                        </div>

                        <div className="pt-2">
                            <Button
                                type="primary"
                                htmlType="submit"
                                size="large"
                                block
                                loading={processing}
                                tabIndex={4}
                                icon={<LoginOutlined />}
                                data-test="login-button"
                                className="h-11 rounded-xl font-bold bg-gradient-to-r from-[#053f89] to-[#0284c7] hover:!from-[#04336f] hover:!to-[#0275b0] text-white border-0 shadow-md shadow-blue-900/20 transition-all duration-200"
                            >
                                تسجيل الدخول إلى النظام
                            </Button>
                        </div>

                        <div className="text-center text-xs text-muted-foreground pt-4 border-t border-stone-200/70 dark:border-stone-800">
                            ليس لديك حساب بعد؟{' '}
                            <TextLink
                                href={register()}
                                tabIndex={6}
                                className="font-bold text-[#053f89] dark:text-sky-400 hover:underline inline-flex items-center gap-1"
                            >
                                إنشاء حساب جديد
                            </TextLink>
                        </div>
                    </div>
                )}
            </Form>
        </>
    );
}

Login.layout = {
    title: 'تسجيل الدخول',
    description: 'أدخل بيانات حسابك للوصول إلى منظومة منتجع النسور',
};
