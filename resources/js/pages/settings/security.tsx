import { Form, Head } from '@inertiajs/react';
import { useRef } from 'react';
import {
    CheckCircleOutlined,
    KeyOutlined,
    LockOutlined,
    SafetyCertificateOutlined,
    SaveOutlined,
} from '@ant-design/icons';
import { Button, Card, Input, Tag } from 'antd';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import InputError from '@/components/input-error';
import { edit } from '@/routes/security';
import type { Props as ManagePasskeysProps } from '@/components/manage-passkeys';
import ManagePasskeys from '@/components/manage-passkeys';
import type { Props as ManageTwoFactorProps } from '@/components/manage-two-factor';
import ManageTwoFactor from '@/components/manage-two-factor';

type Props = {
    passwordRules: string;
} & ManagePasskeysProps &
    ManageTwoFactorProps;

export default function Security(props: Props) {
    const passwordInput = useRef<any>(null);
    const currentPasswordInput = useRef<any>(null);

    return (
        <>
            <Head title="الأمان والحماية - إعدادات الحساب" />

            <div className="space-y-6 text-right" dir="rtl">
                {/* Update Password Card */}
                <Card
                    className="border border-stone-200/80 dark:border-stone-800 shadow-2xs rounded-2xl bg-card overflow-hidden"
                    styles={{ body: { padding: '24px' } }}
                >
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-stone-100 dark:border-stone-800">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#053f89]/10 dark:bg-sky-950/60 text-[#053f89] dark:text-sky-400 text-lg">
                            <LockOutlined />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-foreground m-0">
                                    تحديث كلمة المرور
                                </h3>
                                <Tag color="green" className="font-semibold text-xs border-0 m-0">
                                    حماية معتمدة
                                </Tag>
                            </div>
                            <p className="text-xs text-muted-foreground m-0 mt-0.5">
                                احرص على استخدام كلمة مرور قوية ومعقدة تحتوي على مزيج من الحروف والأرقام والرموز
                            </p>
                        </div>
                    </div>

                    <Form
                        {...SecurityController.update.form()}
                        options={{
                            preserveScroll: true,
                        }}
                        resetOnError={[
                            'password',
                            'password_confirmation',
                            'current_password',
                        ]}
                        resetOnSuccess
                        onError={(errors) => {
                            if (errors.password) {
                                passwordInput.current?.focus();
                            }

                            if (errors.current_password) {
                                currentPasswordInput.current?.focus();
                            }
                        }}
                        className="space-y-4 max-w-2xl"
                    >
                        {({ errors, processing }) => (
                            <>
                                <div className="space-y-1.5">
                                    <label
                                        htmlFor="current_password"
                                        className="block text-xs font-bold text-foreground"
                                    >
                                        كلمة المرور الحالية
                                    </label>
                                    <Input.Password
                                        id="current_password"
                                        ref={currentPasswordInput}
                                        name="current_password"
                                        autoComplete="current-password"
                                        placeholder="أدخل كلمة المرور الحالية لحسابك"
                                        prefix={<LockOutlined className="text-stone-400 ml-1.5" />}
                                        status={errors.current_password ? 'error' : undefined}
                                        size="large"
                                        className="rounded-xl text-left"
                                        dir="ltr"
                                    />
                                    <InputError className="mt-1" message={errors.current_password} />
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
                                        ref={passwordInput}
                                        name="password"
                                        autoComplete="new-password"
                                        placeholder="أدخل كلمة المرور الجديدة"
                                        prefix={<KeyOutlined className="text-stone-400 ml-1.5" />}
                                        status={errors.password ? 'error' : undefined}
                                        size="large"
                                        className="rounded-xl text-left"
                                        dir="ltr"
                                    />
                                    <InputError className="mt-1" message={errors.password} />
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
                                        placeholder="أعد كتابة كلمة المرور الجديدة للتأكيد"
                                        prefix={<KeyOutlined className="text-stone-400 ml-1.5" />}
                                        status={errors.password_confirmation ? 'error' : undefined}
                                        size="large"
                                        className="rounded-xl text-left"
                                        dir="ltr"
                                    />
                                    <InputError className="mt-1" message={errors.password_confirmation} />
                                </div>

                                {/* Password criteria guidance */}
                                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/40 border border-stone-100 dark:border-stone-800 text-[11px] text-muted-foreground space-y-1.5">
                                    <div className="font-semibold text-foreground">متطلبات الأمان لكلمة المرور:</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <CheckCircleOutlined className="text-[#053f89] dark:text-sky-400 text-xs" />
                                            <span>8 أحرف على الأقل</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <CheckCircleOutlined className="text-[#053f89] dark:text-sky-400 text-xs" />
                                            <span>حروف إنجليزية كبيرة وصغيرة</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <CheckCircleOutlined className="text-[#053f89] dark:text-sky-400 text-xs" />
                                            <span>رقم واحد (0-9) على الأقل</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <CheckCircleOutlined className="text-[#053f89] dark:text-sky-400 text-xs" />
                                            <span>رمز خاص واحد على الأقل (!@#$%)</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        loading={processing}
                                        icon={<SaveOutlined />}
                                        size="large"
                                        data-test="update-password-button"
                                        className="w-full sm:w-auto justify-center h-11 font-bold bg-gradient-to-r from-[#053f89] to-[#0284c7] hover:!from-[#04336f] hover:!to-[#0275b0] text-white rounded-xl px-6 shadow-md shadow-blue-900/20 border-0"
                                    >
                                        حفظ كلمة المرور الجديدة
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </Card>

                {/* Two-Factor Authentication Card */}
                <Card
                    className="border border-stone-200/80 dark:border-stone-800 shadow-2xs rounded-2xl bg-card overflow-hidden"
                    styles={{ body: { padding: '24px' } }}
                >
                    <ManageTwoFactor
                        canManageTwoFactor={props.canManageTwoFactor}
                        requiresConfirmation={props.requiresConfirmation}
                        twoFactorEnabled={props.twoFactorEnabled}
                    />
                </Card>

                {/* Passkeys Card */}
                <Card
                    className="border border-stone-200/80 dark:border-stone-800 shadow-2xs rounded-2xl bg-card overflow-hidden"
                    styles={{ body: { padding: '24px' } }}
                >
                    <ManagePasskeys
                        canManagePasskeys={props.canManagePasskeys}
                        passkeys={props.passkeys}
                    />
                </Card>
            </div>
        </>
    );
}

Security.layout = {
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
            title: 'الأمان وكلمة المرور',
            href: edit(),
        },
    ],
};
