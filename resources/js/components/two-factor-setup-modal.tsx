import { Form } from '@inertiajs/react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Check, Copy, QrCode, ScanLine, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AlertError from '@/components/alert-error';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { Spinner } from '@/components/ui/spinner';
import { useAppearance } from '@/hooks/use-appearance';
import { useClipboard } from '@/hooks/use-clipboard';
import { OTP_MAX_LENGTH } from '@/hooks/use-two-factor-auth';
import { confirm } from '@/routes/two-factor';

function GridScanIcon() {
    return (
        <div className="border-border bg-card mb-2 rounded-2xl border p-1 shadow-sm">
            <div className="border-border bg-sky-50 dark:bg-sky-950/60 relative overflow-hidden rounded-xl border p-3">
                <ShieldCheck className="text-sky-600 dark:text-sky-400 relative z-20 size-7" />
            </div>
        </div>
    );
}

function TwoFactorSetupStep({
    qrCodeSvg,
    manualSetupKey,
    buttonText,
    onNextStep,
    errors,
}: {
    qrCodeSvg: string | null;
    manualSetupKey: string | null;
    buttonText: string;
    onNextStep: () => void;
    errors: string[];
}) {
    const { resolvedAppearance } = useAppearance();
    const [copiedText, copy] = useClipboard();
    const isCopied = copiedText === manualSetupKey;
    const IconComponent = isCopied ? Check : Copy;

    return (
        <div className="w-full space-y-4 text-right" dir="rtl">
            {errors?.length ? (
                <AlertError errors={errors} />
            ) : (
                <>
                    <div className="mx-auto flex max-w-xs overflow-hidden">
                        <div className="border border-stone-200 dark:border-stone-800 mx-auto aspect-square w-56 rounded-2xl p-3 bg-white shadow-xs">
                            <div className="flex h-full w-full items-center justify-center">
                                {qrCodeSvg ? (
                                    <div
                                        className="aspect-square w-full rounded-lg bg-white p-1 [&_svg]:size-full"
                                        dangerouslySetInnerHTML={{
                                            __html: qrCodeSvg,
                                        }}
                                        style={{
                                            filter:
                                                resolvedAppearance === 'dark'
                                                    ? 'invert(1) brightness(1.2)'
                                                    : undefined,
                                        }}
                                    />
                                ) : (
                                    <Spinner />
                                )}
                            </div>
                        </div>
                    </div>

                    <p className="text-xs text-center text-muted-foreground leading-relaxed px-4">
                        افتح تطبيق المصادقة (مثل Google Authenticator أو Microsoft Authenticator) وامسح رمز الاستجابة السريعة أعلاه.
                    </p>

                    <div className="relative flex w-full items-center justify-center">
                        <div className="bg-border absolute inset-0 top-1/2 h-px w-full" />
                        <span className="bg-card text-muted-foreground relative px-3 text-[11px] font-medium">
                            أو أدخل مفتاح التهيئة يدوياً
                        </span>
                    </div>

                    <div className="flex w-full items-stretch overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/40">
                        {!manualSetupKey ? (
                            <div className="flex h-full w-full items-center justify-center p-3">
                                <Spinner />
                            </div>
                        ) : (
                            <>
                                <input
                                    type="text"
                                    readOnly
                                    value={manualSetupKey}
                                    className="bg-transparent text-foreground h-full w-full p-2.5 font-mono text-xs outline-none text-left"
                                    dir="ltr"
                                />
                                <button
                                    type="button"
                                    onClick={() => copy(manualSetupKey)}
                                    className="border-stone-200 dark:border-stone-800 hover:bg-stone-200/50 dark:hover:bg-stone-800 border-r px-3 flex items-center gap-1 text-xs font-semibold text-sky-600 transition-colors cursor-pointer"
                                >
                                    <IconComponent className="size-3.5" />
                                    <span>{isCopied ? 'تم النسخ' : 'نسخ'}</span>
                                </button>
                            </>
                        )}
                    </div>

                    <div className="pt-2">
                        <Button
                            className="w-full font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl h-10 shadow-xs"
                            onClick={onNextStep}
                        >
                            {buttonText}
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}

function TwoFactorVerificationStep({
    onClose,
    onBack,
}: {
    onClose: () => void;
    onBack: () => void;
}) {
    const [code, setCode] = useState<string>('');
    const pinInputContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setTimeout(() => {
            pinInputContainerRef.current?.querySelector('input')?.focus();
        }, 0);
    }, []);

    return (
        <Form
            {...confirm.form()}
            onSuccess={() => onClose()}
            resetOnError
            resetOnSuccess
            className="w-full text-right"
            dir="rtl"
        >
            {({
                processing,
                errors,
            }: {
                processing: boolean;
                errors?: { confirmTwoFactorAuthentication?: { code?: string } };
            }) => (
                <div
                    ref={pinInputContainerRef}
                    className="relative w-full space-y-4"
                >
                    <p className="text-xs text-center text-muted-foreground leading-relaxed">
                        أدخل رمز الأمان المكون من 6 أرقام الظاهر الآن في تطبيق المصادقة لديك لتأكيد الربط:
                    </p>

                    <div className="flex w-full flex-col items-center space-y-3 py-2" dir="ltr">
                        <InputOTP
                            id="otp"
                            name="code"
                            maxLength={OTP_MAX_LENGTH}
                            onChange={setCode}
                            disabled={processing}
                            pattern={REGEXP_ONLY_DIGITS}
                            autoFocus
                        >
                            <InputOTPGroup className="gap-1.5">
                                {Array.from(
                                    { length: OTP_MAX_LENGTH },
                                    (_, index) => (
                                        <InputOTPSlot
                                            key={index}
                                            index={index}
                                            className="rounded-lg h-12 w-10 text-base font-bold border-stone-300 dark:border-stone-700"
                                        />
                                    ),
                                )}
                            </InputOTPGroup>
                        </InputOTP>
                        <InputError
                            message={
                                errors?.confirmTwoFactorAuthentication?.code
                            }
                        />
                    </div>

                    <div className="flex w-full gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1 rounded-xl font-medium"
                            onClick={onBack}
                            disabled={processing}
                        >
                            الرجوع للسابق
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 rounded-xl font-bold bg-sky-600 hover:bg-sky-700 text-white"
                            disabled={
                                processing || code.length < OTP_MAX_LENGTH
                            }
                        >
                            {processing ? 'جارٍ التأكيد...' : 'تأكيد التفعيل'}
                        </Button>
                    </div>
                </div>
            )}
        </Form>
    );
}

type Props = {
    isOpen: boolean;
    onClose: () => void;
    requiresConfirmation: boolean;
    twoFactorEnabled: boolean;
    qrCodeSvg: string | null;
    manualSetupKey: string | null;
    clearSetupData: () => void;
    fetchSetupData: () => Promise<void>;
    errors: string[];
};

export default function TwoFactorSetupModal({
    isOpen,
    onClose,
    requiresConfirmation,
    twoFactorEnabled,
    qrCodeSvg,
    manualSetupKey,
    clearSetupData,
    fetchSetupData,
    errors,
}: Props) {
    const [showVerificationStep, setShowVerificationStep] =
        useState<boolean>(false);

    const modalConfig = useMemo<{
        title: string;
        description: string;
        buttonText: string;
    }>(() => {
        if (twoFactorEnabled) {
            return {
                title: 'تم تفعيل المصادقة الثنائية بنجاح',
                description:
                    'حسابك الآن محمي بالمصادقة الثنائية (2FA). يمكنك مسح الرمز أو حفظ مفتاح التهيئة في تطبيق المصادقة المعتمد لديك.',
                buttonText: 'إغلاق النافذة',
            };
        }

        if (showVerificationStep) {
            return {
                title: 'تأكيد رمز المصادقة',
                description:
                    'يرجى إدخال الرمز المكون من 6 أرقام للتحقق من سلامة التهيئة',
                buttonText: 'متابعة',
            };
        }

        return {
            title: 'إعداد وتفعيل المصادقة الثنائية',
            description:
                'لإتمام التفعيل، قم بمسح رمز QR أو إدخال مفتاح التهيئة في تطبيق المصادقة',
            buttonText: 'متابعة لإدخال رمز التأكيد',
        };
    }, [twoFactorEnabled, showVerificationStep]);

    const resetModalState = useCallback(() => {
        if (twoFactorEnabled) {
            clearSetupData();
        }

        setShowVerificationStep(false);
    }, [clearSetupData, twoFactorEnabled]);

    const handleClose = useCallback(() => {
        resetModalState();
        onClose();
    }, [onClose, resetModalState]);

    const handleModalNextStep = useCallback(() => {
        if (requiresConfirmation) {
            setShowVerificationStep(true);

            return;
        }

        clearSetupData();
        handleClose();
    }, [requiresConfirmation, clearSetupData, handleClose]);

    const fetchSetupDataRef = useRef(fetchSetupData);

    useEffect(() => {
        fetchSetupDataRef.current = fetchSetupData;
    }, [fetchSetupData]);

    useEffect(() => {
        if (isOpen && !qrCodeSvg) {
            void fetchSetupDataRef.current();
        }
    }, [isOpen, qrCodeSvg]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-md text-right" dir="rtl">
                <DialogHeader className="flex flex-col items-center justify-center text-center space-y-2">
                    <GridScanIcon />
                    <DialogTitle className="text-lg font-bold text-foreground">
                        {modalConfig.title}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground text-center max-w-sm">
                        {modalConfig.description}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center space-y-4 pt-2">
                    {showVerificationStep ? (
                        <TwoFactorVerificationStep
                            onClose={handleClose}
                            onBack={() => setShowVerificationStep(false)}
                        />
                    ) : (
                        <TwoFactorSetupStep
                            qrCodeSvg={qrCodeSvg}
                            manualSetupKey={manualSetupKey}
                            buttonText={modalConfig.buttonText}
                            onNextStep={handleModalNextStep}
                            errors={errors}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
