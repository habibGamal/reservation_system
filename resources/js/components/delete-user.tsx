import { Form } from '@inertiajs/react';
import { useRef } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
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
import { Label } from '@/components/ui/label';

export default function DeleteUser() {
    const passwordInput = useRef<HTMLInputElement>(null);

    return (
        <div className="space-y-4" dir="rtl">
            <div className="rounded-2xl border border-red-200/80 bg-red-50/40 p-5 dark:border-red-900/40 dark:bg-red-950/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div className="space-y-1 text-right">
                            <h3 className="text-base font-bold text-red-950 dark:text-red-200">
                                حذف الحساب نهائياً
                            </h3>
                            <p className="text-xs text-red-700/80 dark:text-red-300/70 max-w-xl leading-relaxed">
                                حذف حسابك وكافة الصلاحيات والبيانات المرتبطة به بشكل كامل. لا يمكن التراجع عن هذا الإجراء أو استعادة الحساب بعد الحذف.
                            </p>
                        </div>
                    </div>

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button
                                variant="destructive"
                                data-test="delete-user-button"
                                className="font-bold shrink-0 self-start sm:self-center bg-red-600 hover:bg-red-700 text-white shadow-xs"
                            >
                                <Trash2 className="ml-1.5 h-4 w-4" />
                                حذف الحساب
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md text-right" dir="rtl">
                            <DialogHeader className="text-right sm:text-right space-y-2">
                                <div className="mx-auto sm:mx-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
                                    <Trash2 className="h-6 w-6" />
                                </div>
                                <DialogTitle className="text-lg font-bold text-foreground">
                                    هل أنت متأكد تماماً من رغبتك في حذف الحساب؟
                                </DialogTitle>
                                <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                    بمجرد حذف الحساب، سيتم إزالة جميع الصلاحيات والموارد والبيانات المرتبطة به نهائياً. يرجى إدخال كلمة المرور الحالية لتأكيد تنفيذ أمر الحذف.
                                </DialogDescription>
                            </DialogHeader>

                            <Form
                                {...ProfileController.destroy.form()}
                                options={{
                                    preserveScroll: true,
                                }}
                                onError={() => passwordInput.current?.focus()}
                                resetOnSuccess
                                className="space-y-4 pt-2"
                            >
                                {({ resetAndClearErrors, processing, errors }) => (
                                    <>
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="password"
                                                className="text-xs font-semibold text-foreground"
                                            >
                                                كلمة المرور الحالية للتأكيد
                                            </Label>

                                            <PasswordInput
                                                id="password"
                                                name="password"
                                                ref={passwordInput}
                                                placeholder="أدخل كلمة المرور لتأكيد الحذف"
                                                autoComplete="current-password"
                                                className="w-full text-left"
                                                dir="ltr"
                                            />

                                            <InputError message={errors.password} />
                                        </div>

                                        <DialogFooter className="gap-2 sm:gap-0 pt-2 flex-col sm:flex-row-reverse sm:justify-start">
                                            <Button
                                                variant="destructive"
                                                disabled={processing}
                                                asChild
                                                className="font-bold bg-red-600 hover:bg-red-700 text-white"
                                            >
                                                <button
                                                    type="submit"
                                                    data-test="confirm-delete-user-button"
                                                >
                                                    {processing ? 'جارٍ الحذف...' : 'تأكيد حذف الحساب'}
                                                </button>
                                            </Button>

                                            <DialogClose asChild>
                                                <Button
                                                    variant="secondary"
                                                    type="button"
                                                    onClick={() => resetAndClearErrors()}
                                                    className="font-medium"
                                                >
                                                    إلغاء الأمر
                                                </Button>
                                            </DialogClose>
                                        </DialogFooter>
                                    </>
                                )}
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </div>
    );
}
