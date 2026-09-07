import { Form, Head } from '@inertiajs/react';
import { MailOutlined, SendOutlined } from '@ant-design/icons';
import { Button, Input } from 'antd';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { login } from '@/routes';
import { email } from '@/routes/password';

export default function ForgotPassword({ status }: { status?: string }) {
    return (
        <>
            <Head title="استعادة كلمة المرور - منتجع النسور" />

            {status && (
                <div className="mb-5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-center text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                    {status}
                </div>
            )}

            <Form {...email.form()} className="space-y-4 text-right" dir="rtl">
                {({ processing, errors }) => (
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label
                                htmlFor="email"
                                className="block text-xs font-bold text-foreground"
                            >
                                البريد الإلكتروني المسجل
                            </label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                autoComplete="email"
                                autoFocus
                                placeholder="name@eagles-resort.com"
                                prefix={<MailOutlined className="text-stone-400 ml-1.5" />}
                                status={errors.email ? 'error' : undefined}
                                size="large"
                                className="w-full text-left rounded-xl"
                                dir="ltr"
                            />
                            <InputError message={errors.email} className="mt-1" />
                        </div>

                        <div className="pt-2">
                            <Button
                                type="primary"
                                htmlType="submit"
                                size="large"
                                block
                                loading={processing}
                                icon={<SendOutlined />}
                                data-test="email-password-reset-link-button"
                                className="h-11 rounded-xl font-bold bg-gradient-to-r from-[#053f89] to-[#0284c7] hover:!from-[#04336f] hover:!to-[#0275b0] text-white border-0 shadow-md shadow-blue-900/20 transition-all duration-200"
                            >
                                إرسال رابط إعادة التعيين
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

ForgotPassword.layout = {
    title: 'استعادة كلمة المرور',
    description: 'أدخل بريدك الإلكتروني المسجل لإرسال رابط إعادة تعيين كلمة المرور',
};
