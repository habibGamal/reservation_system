import { Form } from '@inertiajs/react';
import { CheckCircle2, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Tag } from 'antd';
import TwoFactorRecoveryCodes from '@/components/two-factor-recovery-codes';
import TwoFactorSetupModal from '@/components/two-factor-setup-modal';
import { Button } from '@/components/ui/button';
import { useTwoFactorAuth } from '@/hooks/use-two-factor-auth';
import { disable, enable } from '@/routes/two-factor';

export type Props = {
    canManageTwoFactor?: boolean;
    requiresConfirmation?: boolean;
    twoFactorEnabled?: boolean;
};

export default function ManageTwoFactor(props: Props) {
    const requiresConfirmation = props.requiresConfirmation ?? false;
    const twoFactorEnabled = props.twoFactorEnabled ?? false;

    const {
        qrCodeSvg,
        hasSetupData,
        manualSetupKey,
        clearSetupData,
        clearTwoFactorAuthData,
        fetchSetupData,
        recoveryCodesList,
        fetchRecoveryCodes,
        errors,
    } = useTwoFactorAuth();
    const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
    const prevTwoFactorEnabled = useRef(twoFactorEnabled);

    useEffect(() => {
        if (prevTwoFactorEnabled.current && !twoFactorEnabled) {
            clearTwoFactorAuthData();
        }

        prevTwoFactorEnabled.current = twoFactorEnabled;
    }, [twoFactorEnabled, clearTwoFactorAuthData]);

    if (!(props.canManageTwoFactor ?? false)) {
        return null;
    }

    return (
        <div className="space-y-4 text-right" dir="rtl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-foreground m-0">
                                المصادقة الثنائية (2FA)
                            </h3>
                            {twoFactorEnabled ? (
                                <Tag color="success" className="font-semibold text-xs border-0 m-0">
                                    مفعلة وتعمل بنجاح
                                </Tag>
                            ) : (
                                <Tag color="warning" className="font-semibold text-xs border-0 m-0">
                                    غير مفعلة
                                </Tag>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground m-0 mt-0.5">
                            حماية إضافية تطلب رمزاً عشوائياً مؤقتاً من تطبيق المصادقة بهاتفك عند تسجيل الدخول
                        </p>
                    </div>
                </div>
            </div>

            {twoFactorEnabled ? (
                <div className="space-y-4 pt-1">
                    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300 text-xs leading-relaxed">
                        <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                            حسابك محمي بنجاح بالمصادقة الثنائية. عند تسجيل الدخول من أي جهاز جديد، سيُطلب منك إدخال رمز التحقق المتجدد من تطبيق المصادقة.
                        </div>
                    </div>

                    <div className="flex items-center justify-start">
                        <Form {...disable.form()}>
                            {({ processing }) => (
                                <Button
                                    variant="outline"
                                    type="submit"
                                    disabled={processing}
                                    className="rounded-xl font-bold text-destructive hover:bg-destructive/10 border-destructive/30"
                                >
                                    {processing ? 'جارٍ التعطيل...' : 'تعطيل المصادقة الثنائية'}
                                </Button>
                            )}
                        </Form>
                    </div>

                    <TwoFactorRecoveryCodes
                        recoveryCodesList={recoveryCodesList}
                        fetchRecoveryCodes={fetchRecoveryCodes}
                        errors={errors}
                    />
                </div>
            ) : (
                <div className="space-y-4 pt-1">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        نوصي بشدة بتفعيل المصادقة الثنائية لمنع الوصول غير المصرح به حتى في حال تم تسريب كلمة المرور. يمكنك استخدام تطبيقات مجانية مثل Google Authenticator أو Microsoft Authenticator.
                    </p>

                    <div>
                        {hasSetupData ? (
                            <Button
                                onClick={() => setShowSetupModal(true)}
                                className="rounded-xl font-bold bg-sky-600 hover:bg-sky-700 text-white gap-2 shadow-xs"
                            >
                                <ShieldCheck className="size-4" />
                                <span>استكمال خطوات الإعداد</span>
                            </Button>
                        ) : (
                            <Form
                                {...enable.form()}
                                onSuccess={() => setShowSetupModal(true)}
                            >
                                {({ processing }) => (
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        className="rounded-xl font-bold bg-sky-600 hover:bg-sky-700 text-white gap-2 shadow-xs"
                                    >
                                        <Shield className="size-4" />
                                        <span>{processing ? 'جارٍ التهيئة...' : 'تفعيل المصادقة الثنائية'}</span>
                                    </Button>
                                )}
                            </Form>
                        )}
                    </div>
                </div>
            )}

            <TwoFactorSetupModal
                isOpen={showSetupModal}
                onClose={() => setShowSetupModal(false)}
                requiresConfirmation={requiresConfirmation}
                twoFactorEnabled={twoFactorEnabled}
                qrCodeSvg={qrCodeSvg}
                manualSetupKey={manualSetupKey}
                clearSetupData={clearSetupData}
                fetchSetupData={fetchSetupData}
                errors={errors}
            />
        </div>
    );
}
