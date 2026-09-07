import { router } from '@inertiajs/react';
import { Fingerprint, KeyRound, ShieldCheck } from 'lucide-react';
import { Tag } from 'antd';
import { destroy } from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyRegistrationController';
import PasskeyItem from '@/components/passkey-item';
import PasskeyRegistration from '@/components/passkey-register';
import type { Passkey } from '@/types/auth';

export type Props = {
    canManagePasskeys?: boolean;
    passkeys?: Passkey[];
};

const EmptyState = () => {
    return (
        <div className="p-8 text-center">
            <div className="bg-sky-50 dark:bg-sky-950/60 mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-sky-600 dark:text-sky-400">
                <Fingerprint className="h-7 w-7" />
            </div>
            <p className="font-bold text-sm text-foreground m-0">
                لا توجد مفاتيح مرور مسجلة بعد
            </p>
            <p className="text-muted-foreground mt-1 text-xs max-w-sm mx-auto leading-relaxed">
                أضف مفتاح مرور لتسجيل الدخول الفوري والآمن باستخدام البصمة أو الوجه أو قفل الشاشة دون الحاجة لكتابة كلمة المرور.
            </p>
        </div>
    );
};

export default function ManagePasskeys(props: Props) {
    const passkeys = props.passkeys ?? [];

    const handleDelete = (id: number, onError: () => void) => {
        router.delete(destroy.url(id), {
            preserveScroll: true,
            onError,
        });
    };

    const handleRegisterSuccess = () => {
        router.reload();
    };

    if (!(props.canManagePasskeys ?? false)) {
        return null;
    }

    return (
        <div className="space-y-4 text-right" dir="rtl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
                        <Fingerprint className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-foreground m-0">
                                مفاتيح المرور البيومترية (Passkeys)
                            </h3>
                            <Tag color="blue" className="font-semibold text-xs border-0 m-0">
                                تسجيل سريع
                            </Tag>
                        </div>
                        <p className="text-xs text-muted-foreground m-0 mt-0.5">
                            سجّل الدخول فوراً باستخدام بصمة الإصبع أو الوجه أو قفل شاشة جهازك
                        </p>
                    </div>
                </div>
            </div>

            <div className="border border-stone-200/80 dark:border-stone-800 rounded-2xl overflow-hidden bg-card shadow-2xs">
                {passkeys.length > 0 ? (
                    passkeys.map((passkey) => (
                        <PasskeyItem
                            key={passkey.id}
                            passkey={passkey}
                            onDelete={handleDelete}
                        />
                    ))
                ) : (
                    <EmptyState />
                )}
            </div>

            <PasskeyRegistration onSuccess={handleRegisterSuccess} />
        </div>
    );
}
