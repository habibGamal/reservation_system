import { usePasskeyRegister } from '@laravel/passkeys/react';
import { Fingerprint, Plus } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
    onSuccess: () => void;
};

export default function PasskeyRegistration({ onSuccess }: Props) {
    const [name, setName] = useState(() => {
        const ua = navigator.userAgent;

        const browser = [
            { pattern: /Edg|Edge/, name: 'Edge' },
            { pattern: /OPR|Opera|OPiOS/, name: 'Opera' },
            { pattern: /Firefox|FxiOS/, name: 'Firefox' },
            { pattern: /Chrome|CriOS/, name: 'Chrome' },
            { pattern: /Safari/, name: 'Safari' },
        ].find(({ pattern }) => pattern.test(ua))?.name;

        const os = [
            { pattern: /iPhone/, name: 'iPhone' },
            { pattern: /iPad|Macintosh(?=.*Mobile)/, name: 'iPad' },
            { pattern: /Android/, name: 'Android' },
            { pattern: /Mac/, name: 'Mac' },
            { pattern: /Windows/, name: 'Windows' },
        ].find(({ pattern }) => pattern.test(ua))?.name;

        return [browser, os].filter(Boolean).join(' على ') || '';
    });

    const [showForm, setShowForm] = useState(false);
    const { register, isLoading, error, isSupported } = usePasskeyRegister({
        onSuccess: () => {
            setName('');
            setShowForm(false);
            onSuccess();
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            return;
        }

        await register(name);
    };

    const handleCancel = () => {
        setShowForm(false);
        setName('');
    };

    if (!isSupported) {
        return (
            <div className="text-xs text-muted-foreground p-3 rounded-xl bg-stone-50 dark:bg-stone-900/40 border border-stone-100 dark:border-stone-800">
                مفاتيح المرور البيومترية غير مدعومة في هذا المتصفح حالياً.
            </div>
        );
    }

    if (!showForm) {
        return (
            <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(true)}
                className="rounded-xl font-bold gap-2 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-950/40"
            >
                <Plus className="size-4" />
                <span>إضافة مفتاح مرور جديد</span>
            </Button>
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/40 space-y-3.5 rounded-2xl p-4 text-right"
            dir="rtl"
        >
            <div className="space-y-1.5">
                <Label htmlFor="passkey-name" className="text-xs font-bold text-foreground">
                    اسم مفتاح المرور / الجهاز
                </Label>
                <Input
                    id="passkey-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: لابتوب الإدارة، هاتف iPhone الشخصي"
                    className="mt-1 block w-full rounded-xl"
                    autoFocus
                />
                <p className="text-[11px] text-muted-foreground m-0">
                    تسمية هذا المفتاح تساعدك في التعرف على الأجهزة المصرح لها وإدارتها مستقبلاً.
                </p>
            </div>

            {error && <InputError message={error} />}

            <div className="flex items-center gap-2 pt-1">
                <Button
                    type="submit"
                    disabled={isLoading || !name.trim()}
                    className="font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl gap-2 shadow-xs"
                >
                    <Fingerprint className="size-4" />
                    <span>{isLoading ? 'جارٍ التسجيل البيومتري...' : 'تسجيل وتفعيل المفتاح'}</span>
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    onClick={handleCancel}
                    className="rounded-xl font-medium"
                >
                    إلغاء
                </Button>
            </div>
        </form>
    );
}
