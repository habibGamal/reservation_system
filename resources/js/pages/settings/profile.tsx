import { Form, Head, Link, usePage } from '@inertiajs/react';
import {
    CheckCircleOutlined,
    ClockCircleOutlined,
    IdcardOutlined,
    MailOutlined,
    SaveOutlined,
    SafetyCertificateOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { Alert, Avatar, Button, Card, Divider, Input, Tag } from 'antd';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import InputError from '@/components/input-error';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';
import type { Auth } from '@/types';

type PageProps = {
    auth: Auth;
};

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    return (
        <>
            <Head title="الملف الشخصي - إعدادات الحساب" />

            <div className="space-y-6 text-right" dir="rtl">
                {/* User Identity Overview Card */}
                <Card
                    className="border border-stone-200/80 dark:border-stone-800 shadow-2xs rounded-2xl bg-card overflow-hidden"
                    styles={{ body: { padding: '24px' } }}
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <Avatar
                                    size={64}
                                    className="bg-gradient-to-tr from-sky-600 to-indigo-600 text-white font-bold text-2xl shadow-md border-2 border-white dark:border-stone-900"
                                >
                                    {user.name ? user.name.charAt(0).toUpperCase() : <UserOutlined />}
                                </Avatar>
                                <span className="absolute -bottom-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] ring-2 ring-white dark:ring-stone-900">
                                    <CheckCircleOutlined />
                                </span>
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-lg font-bold text-foreground m-0">
                                        {user.name}
                                    </h2>
                                    <Tag color="cyan" className="font-semibold text-xs border-0 m-0">
                                        مستخدم معتمد
                                    </Tag>
                                </div>
                                <p className="text-xs text-muted-foreground m-0" dir="ltr">
                                    {user.email}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-stone-50 dark:bg-stone-900/60 p-2.5 rounded-xl border border-stone-100 dark:border-stone-800 self-start sm:self-center">
                            <SafetyCertificateOutlined className="text-sky-600 text-sm" />
                            <span>نظام الحجوزات الفندقية • منتجع النسور</span>
                        </div>
                    </div>
                </Card>

                {/* Profile Edit Form Card */}
                <Card
                    className="border border-stone-200/80 dark:border-stone-800 shadow-2xs rounded-2xl bg-card overflow-hidden"
                    styles={{ body: { padding: '24px' } }}
                >
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-stone-100 dark:border-stone-800">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 text-lg">
                            <IdcardOutlined />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-foreground m-0">
                                البيانات الأساسية للحساب
                            </h3>
                            <p className="text-xs text-muted-foreground m-0 mt-0.5">
                                يمكنك تحديث اسمك الكامل وعنوان بريدك الإلكتروني المعتمد في السجلات
                            </p>
                        </div>
                    </div>

                    <Form
                        {...ProfileController.update.form()}
                        options={{
                            preserveScroll: true,
                        }}
                        className="space-y-5 max-w-2xl"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="space-y-1.5">
                                    <label
                                        htmlFor="name"
                                        className="block text-xs font-bold text-foreground"
                                    >
                                        الاسم الكامل
                                    </label>
                                    <Input
                                        id="name"
                                        defaultValue={user.name}
                                        name="name"
                                        required
                                        autoComplete="name"
                                        placeholder="مثال: أحمد محمد عبد الله"
                                        prefix={<UserOutlined className="text-stone-400 ml-1.5" />}
                                        status={errors.name ? 'error' : undefined}
                                        size="large"
                                        className="rounded-xl"
                                    />
                                    <InputError className="mt-1" message={errors.name} />
                                    <p className="text-[11px] text-muted-foreground m-0">
                                        يظهر هذا الاسم في ترويسة النظام وسجلات العمليات والحجوزات.
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <label
                                        htmlFor="email"
                                        className="block text-xs font-bold text-foreground"
                                    >
                                        عنوان البريد الإلكتروني
                                    </label>
                                    <Input
                                        id="email"
                                        type="email"
                                        defaultValue={user.email}
                                        name="email"
                                        required
                                        autoComplete="username"
                                        placeholder="name@example.com"
                                        prefix={<MailOutlined className="text-stone-400 ml-1.5" />}
                                        status={errors.email ? 'error' : undefined}
                                        size="large"
                                        className="rounded-xl text-left"
                                        dir="ltr"
                                    />
                                    <InputError className="mt-1" message={errors.email} />
                                    <p className="text-[11px] text-muted-foreground m-0">
                                        يُستخدم البريد الإلكتروني لتسجيل الدخول واستقبال تنبيهات الحجوزات وإعادة تعيين كلمة المرور.
                                    </p>
                                </div>

                                {mustVerifyEmail && user.email_verified_at === null && (
                                    <Alert
                                        type="warning"
                                        showIcon
                                        className="rounded-xl border-amber-200 dark:border-amber-900/60"
                                        message="تأكيد البريد الإلكتروني مطلوب"
                                        description={
                                            <div className="space-y-2 mt-1">
                                                <p className="text-xs text-amber-800 dark:text-amber-300 m-0">
                                                    عنوان بريدك الإلكتروني غير مؤكد بعد في النظام.
                                                </p>
                                                <Link
                                                    href={send()}
                                                    as="button"
                                                    className="inline-block text-xs font-bold text-sky-700 dark:text-sky-400 underline hover:opacity-80 cursor-pointer"
                                                >
                                                    اضغط هنا لإرسال رابط التحقق إلى بريدك الإلكتروني
                                                </Link>
                                                {status === 'verification-link-sent' && (
                                                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs border border-emerald-200 dark:border-emerald-800">
                                                        تم إرسال رابط التحقق الجديد إلى بريدك الإلكتروني بنجاح.
                                                    </div>
                                                )}
                                            </div>
                                        }
                                    />
                                )}

                                <div className="pt-2">
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        loading={processing}
                                        icon={<SaveOutlined />}
                                        size="large"
                                        data-test="update-profile-button"
                                        className="font-bold bg-sky-600 hover:!bg-sky-500 rounded-xl px-6 shadow-sm border-0 w-full sm:w-auto justify-center"
                                    >
                                        حفظ التعديلات
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </Card>

                {/* Danger Zone Section */}
                <Card
                    className="border border-stone-200/80 dark:border-stone-800 shadow-2xs rounded-2xl bg-card overflow-hidden"
                    styles={{ body: { padding: '24px' } }}
                >
                    <DeleteUser />
                </Card>
            </div>
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'لوحة التحكم',
            href: '/dashboard',
        },
        {
            title: 'إعدادات الحساب',
            href: edit(),
        },
        {
            title: 'الملف الشخصي',
            href: edit(),
        },
    ],
};
