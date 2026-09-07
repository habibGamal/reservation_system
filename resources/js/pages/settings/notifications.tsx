import { Head } from '@inertiajs/react';
import {
    Alert,
    Button,
    Card,
    Space,
    Switch,
    Tag,
    Typography,
} from 'antd';
import {
    BellOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    ExclamationCircleOutlined,
    InfoCircleOutlined,
    SendOutlined,
    StopOutlined,
    SyncOutlined,
} from '@ant-design/icons';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { edit } from '@/routes/profile';

const { Text } = Typography;

type NotificationsProps = {
    vapidPublicKey?: string;
};

export default function Notifications({
    vapidPublicKey = '',
}: NotificationsProps) {
    const {
        isSupported,
        permission,
        isSubscribed,
        isLoading,
        subscribe,
        unsubscribe,
        sendTest,
        resync,
        isSendingTest,
    } = usePushNotifications(vapidPublicKey);

    const handleToggle = async (checked: boolean) => {
        if (checked) {
            await subscribe();
        } else {
            await unsubscribe();
        }
    };

    return (
        <>
            <Head title="إشعارات المتصفح - إعدادات الحساب" />

            <div className="space-y-6 text-right" dir="rtl">
                {/* Browser Support Check Alert */}
                {!isSupported && (
                    <Alert
                        message="المتصفح الحالي غير مدعوم"
                        description="متصفحك الحالي لا يدعم تقنية إشعارات الويب (Web Push). يرجى التحديث أو استخدام متصفح حديث مثل Google Chrome أو Microsoft Edge أو Mozilla Firefox."
                        type="error"
                        showIcon
                        icon={<StopOutlined />}
                        className="rounded-2xl"
                    />
                )}

                {/* Permission Denied Warning Alert */}
                {isSupported && permission === 'denied' && (
                    <Alert
                        message="تم حظر الإشعارات في إعدادات المتصفح"
                        description="لقد قمت بحظر إشعارات الموقع في متصفحك. لإعادة تفعيلها، انقر على رمز القفل أو الأذونات بجانب شريط العنوان في المتصفح، ثم اختر 'السماح بالإشعارات' وأعد تحميل الصفحة."
                        type="warning"
                        showIcon
                        icon={<ExclamationCircleOutlined />}
                        className="rounded-2xl"
                    />
                )}

                {/* Main Notification Card */}
                <Card
                    className="border border-stone-200/80 dark:border-stone-800 shadow-2xs rounded-2xl bg-card overflow-hidden"
                    styles={{ body: { padding: '24px' } }}
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-stone-100 dark:border-stone-800">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 text-lg">
                                <BellOutlined />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-bold text-foreground m-0">
                                        إشعارات المتصفح الفورية (Web Push)
                                    </h3>
                                    <Tag color={isSubscribed ? 'success' : 'default'} className="font-semibold text-xs border-0 m-0">
                                        {isSubscribed ? 'الاشتراك مفعل' : 'الاشتراك متوقف'}
                                    </Tag>
                                </div>
                                <p className="text-xs text-muted-foreground m-0 mt-0.5">
                                    استقبال تنبيهات فورية عن الحجوزات والعمليات حتى عند عدم تواجدك داخل صفحة النظام
                                </p>
                            </div>
                        </div>

                        {/* Master Push Toggle Switch */}
                        <div className="flex items-center gap-3 bg-stone-50 dark:bg-stone-900/60 px-4 py-2.5 rounded-xl border border-stone-100 dark:border-stone-800 self-start sm:self-center">
                            <span className="text-xs font-bold text-foreground">
                                {isSubscribed ? 'مفعل' : 'معطل'}
                            </span>
                            <Switch
                                checked={isSubscribed}
                                loading={isLoading}
                                onChange={handleToggle}
                                disabled={!isSupported || permission === 'denied'}
                                data-test="push-notification-toggle"
                            />
                        </div>
                    </div>

                    {/* Status Badges KPI Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                        {/* Browser Compatibility */}
                        <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/40 border border-stone-100 dark:border-stone-800 text-right">
                            <div className="text-[11px] text-muted-foreground mb-1">دعم المتصفح</div>
                            <div className="flex items-center gap-1.5">
                                {isSupported ? (
                                    <>
                                        <CheckCircleOutlined className="text-emerald-500 text-sm" />
                                        <span className="text-xs font-bold text-foreground">متوافق ومعتمد</span>
                                    </>
                                ) : (
                                    <>
                                        <CloseCircleOutlined className="text-red-500 text-sm" />
                                        <span className="text-xs font-bold text-red-600">غير مدعوم</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Permission Status */}
                        <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/40 border border-stone-100 dark:border-stone-800 text-right">
                            <div className="text-[11px] text-muted-foreground mb-1">إذن المتصفح</div>
                            <div className="flex items-center gap-1.5">
                                {permission === 'granted' ? (
                                    <>
                                        <CheckCircleOutlined className="text-emerald-500 text-sm" />
                                        <span className="text-xs font-bold text-foreground">ممنوح ومصرح به</span>
                                    </>
                                ) : permission === 'denied' ? (
                                    <>
                                        <CloseCircleOutlined className="text-red-500 text-sm" />
                                        <span className="text-xs font-bold text-red-600">محظور في الإعدادات</span>
                                    </>
                                ) : (
                                    <>
                                        <ExclamationCircleOutlined className="text-amber-500 text-sm" />
                                        <span className="text-xs font-bold text-amber-600">في انتظار الإذن</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Subscription Status */}
                        <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/40 border border-stone-100 dark:border-stone-800 text-right">
                            <div className="text-[11px] text-muted-foreground mb-1">حالة الخدمة</div>
                            <div className="flex items-center gap-1.5">
                                {isSubscribed ? (
                                    <>
                                        <CheckCircleOutlined className="text-emerald-500 text-sm" />
                                        <span className="text-xs font-bold text-foreground">مشترك ومتصل</span>
                                    </>
                                ) : (
                                    <>
                                        <CloseCircleOutlined className="text-stone-400 text-sm" />
                                        <span className="text-xs font-bold text-muted-foreground">غير مشترك</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Test and Actions Area */}
                    {isSubscribed && (
                        <div className="pt-4 border-t border-stone-100 dark:border-stone-800 space-y-3">
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                <Button
                                    type="primary"
                                    icon={<SendOutlined />}
                                    loading={isSendingTest}
                                    onClick={sendTest}
                                    size="middle"
                                    className="w-full sm:w-auto justify-center font-bold bg-sky-600 hover:!bg-sky-500 rounded-xl px-4 shadow-xs border-0"
                                    data-test="send-test-notification"
                                >
                                    إرسال إشعار تجريبي الآن
                                </Button>

                                <Button
                                    icon={<SyncOutlined />}
                                    loading={isLoading}
                                    onClick={resync}
                                    size="middle"
                                    className="w-full sm:w-auto justify-center rounded-xl font-medium border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800"
                                >
                                    تحديث ومزامنة الاشتراك
                                </Button>
                            </div>
                            <p className="text-[11px] text-muted-foreground m-0 leading-relaxed">
                                سيتم إرسال إشعار تجريبي للتأكد من وصول التنبيهات في الخلفية. إذا قمت بتغيير أذونات المتصفح أو واجهت انقطاعاً في التنبيهات، استخدم زر "تحديث ومزامنة الاشتراك".
                            </p>
                        </div>
                    )}
                </Card>

                {/* Educational / Helpful Information Card */}
                <Card
                    className="border border-stone-200/80 dark:border-stone-800 shadow-2xs rounded-2xl bg-card overflow-hidden"
                    styles={{ body: { padding: '20px' } }}
                >
                    <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 text-base mt-0.5">
                            <InfoCircleOutlined />
                        </div>
                        <div className="space-y-1 text-right">
                            <span className="font-bold text-sm text-foreground block">
                                كيف تعمل إشعارات الويب في منتجع النسور؟
                            </span>
                            <p className="text-xs text-muted-foreground leading-relaxed m-0">
                                تتيح لك هذه الخدمة متابعة مستجدات النظام الهامة بصورة فورية، مثل تسجيل حجز جديد، تأكيد الحجوزات، تسجيل وصول أو مغادرة النزلاء، وتنبيهات الصيانة. يتم تشفير الرسائل بتقنية VAPID وفق أعلى المعايير الأمنية لضمان الخصوصية والسرعة.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </>
    );
}

Notifications.layout = {
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
            title: 'إشعارات المتصفح',
            href: '/settings/notifications',
        },
    ],
};
