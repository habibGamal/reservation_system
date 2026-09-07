import { Form } from '@inertiajs/react';
import { Eye, EyeOff, Key, RefreshCw, ShieldAlert } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import AlertError from '@/components/alert-error';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { regenerateRecoveryCodes } from '@/routes/two-factor';

type Props = {
    recoveryCodesList: string[];
    fetchRecoveryCodes: () => Promise<void>;
    errors: string[];
};

export default function TwoFactorRecoveryCodes({
    recoveryCodesList,
    fetchRecoveryCodes,
    errors,
}: Props) {
    const [codesAreVisible, setCodesAreVisible] = useState<boolean>(false);
    const codesSectionRef = useRef<HTMLDivElement | null>(null);
    const canRegenerateCodes = recoveryCodesList.length > 0 && codesAreVisible;

    const toggleCodesVisibility = useCallback(async () => {
        if (!codesAreVisible && !recoveryCodesList.length) {
            await fetchRecoveryCodes();
        }

        setCodesAreVisible(!codesAreVisible);

        if (!codesAreVisible) {
            setTimeout(() => {
                codesSectionRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                });
            });
        }
    }, [codesAreVisible, recoveryCodesList.length, fetchRecoveryCodes]);

    useEffect(() => {
        if (!recoveryCodesList.length) {
            void fetchRecoveryCodes();
        }
    }, [recoveryCodesList.length, fetchRecoveryCodes]);

    const RecoveryCodeIconComponent = codesAreVisible ? EyeOff : Eye;

    return (
        <Card className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30 overflow-hidden w-full text-right" dir="rtl">
            <CardHeader className="pb-3 text-right">
                <CardTitle className="flex items-center gap-2.5 text-sm font-bold text-foreground">
                    <Key className="size-4 text-sky-600" aria-hidden="true" />
                    <span>رموز الاسترداد الاحتياطية للطوارئ</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                    تتيح لك هذه الرموز استعادة الدخول إلى حسابك في حال فقدت هاتفك أو تعذر الوصول إلى تطبيق المصادقة. احرص على حفظها في مكان آمن.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={toggleCodesVisibility}
                        className="rounded-xl font-semibold gap-2 border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800"
                        aria-expanded={codesAreVisible}
                        aria-controls="recovery-codes-section"
                    >
                        <RecoveryCodeIconComponent
                            className="size-4 text-sky-600"
                            aria-hidden="true"
                        />
                        {codesAreVisible ? 'إخفاء رموز الاسترداد' : 'عرض رموز الاسترداد'}
                    </Button>

                    {canRegenerateCodes && (
                        <Form
                            {...regenerateRecoveryCodes.form()}
                            options={{ preserveScroll: true }}
                            onSuccess={fetchRecoveryCodes}
                        >
                            {({ processing }) => (
                                <Button
                                    variant="secondary"
                                    type="submit"
                                    disabled={processing}
                                    className="rounded-xl font-semibold gap-2"
                                    aria-describedby="regenerate-warning"
                                >
                                    <RefreshCw className={`size-3.5 ${processing ? 'animate-spin' : ''}`} />
                                    <span>{processing ? 'جارٍ التوليد...' : 'إعادة توليد رموز جديدة'}</span>
                                </Button>
                            )}
                        </Form>
                    )}
                </div>

                <div
                    id="recovery-codes-section"
                    className={`relative overflow-hidden transition-all duration-300 ${
                        codesAreVisible ? 'h-auto opacity-100' : 'h-0 opacity-0'
                    }`}
                    aria-hidden={!codesAreVisible}
                >
                    <div className="space-y-3 pt-2">
                        {errors?.length ? (
                            <AlertError errors={errors} />
                        ) : (
                            <>
                                <div
                                    ref={codesSectionRef}
                                    className="bg-card border border-stone-200 dark:border-stone-800 grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl p-4 font-mono text-xs text-center"
                                    role="list"
                                    aria-label="رموز الاسترداد"
                                    dir="ltr"
                                >
                                    {recoveryCodesList.length ? (
                                        recoveryCodesList.map((code, index) => (
                                            <div
                                                key={index}
                                                role="listitem"
                                                className="select-all p-2 rounded-lg bg-stone-100 dark:bg-stone-800 font-semibold tracking-wider text-foreground"
                                            >
                                                {code}
                                            </div>
                                        ))
                                    ) : (
                                        <div
                                            className="col-span-2 space-y-2 py-2"
                                            aria-label="جارٍ تحميل رموز الاسترداد"
                                        >
                                            {Array.from(
                                                { length: 8 },
                                                (_, index) => (
                                                    <div
                                                        key={index}
                                                        className="bg-muted-foreground/15 h-5 animate-pulse rounded-lg"
                                                        aria-hidden="true"
                                                    />
                                                ),
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="text-[11px] text-muted-foreground select-none flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-900/40 text-amber-900 dark:text-amber-300">
                                    <ShieldAlert className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                                    <p id="regenerate-warning" className="m-0 leading-relaxed">
                                        يُستخدم كل رمز مرة واحدة فقط كبديل مؤقت لتطبيق المصادقة. بعد استخدام الرمز يتم إتلافه تلقائياً. يمكنك الضغط على <strong>إعادة توليد رموز جديدة</strong> في أي وقت لإنشاء قائمة جديدة وإبطال القديمة.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
