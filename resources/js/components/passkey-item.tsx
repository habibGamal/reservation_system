import { KeyRound, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import type { Passkey } from '@/types/auth';

type Props = {
    passkey: Passkey;
    onDelete: (id: number, onError: () => void) => void;
};

export default function PasskeyItem({ passkey, onDelete }: Props) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = () => {
        setIsDeleting(true);
        onDelete(passkey.id, () => setIsDeleting(false));
    };

    return (
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 p-4 last:border-b-0 text-right" dir="rtl">
            <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
                    <KeyRound className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">
                            {passkey.name}
                        </span>
                        {passkey.authenticator && (
                            <span className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold">
                                {passkey.authenticator}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground m-0">
                        أُضيف {passkey.created_at_diff}
                        {passkey.last_used_at_diff && (
                            <>
                                <span className="mx-1.5 opacity-40">•</span>
                                آخر استخدام {passkey.last_used_at_diff}
                            </>
                        )}
                    </p>
                </div>
            </div>

            <Dialog>
                <DialogTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive h-9 w-9 p-0"
                    >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">إزالة مفتاح المرور</span>
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md text-right" dir="rtl">
                    <DialogHeader className="text-right sm:text-right space-y-2">
                        <div className="mx-auto sm:mx-0 flex h-11 w-11 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                            <Trash2 className="h-5 w-5" />
                        </div>
                        <DialogTitle className="text-base font-bold text-foreground">
                            حذف مفتاح المرور
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                            هل أنت متأكد من رغبتك في حذف مفتاح المرور "{passkey.name}"؟ لن تتمكن من استخدامه بعد ذلك لتسجيل الدخول السريع إلى النظام من هذا الجهاز.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0 pt-2 flex-col sm:flex-row-reverse sm:justify-start">
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="font-bold bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isDeleting ? 'جارٍ الحذف...' : 'تأكيد الحذف'}
                        </Button>
                        <DialogClose asChild>
                            <Button variant="secondary" className="font-medium">
                                إلغاء الأمر
                            </Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
