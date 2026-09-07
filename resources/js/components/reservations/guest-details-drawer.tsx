import React, { useEffect, useState } from 'react';
import { Guest, Reservation } from '@/types/reservation';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Divider,
  Drawer,
  Empty,
  Row,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import {
  CalendarOutlined,
  HistoryOutlined,
  HomeOutlined,
  MessageOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';

const { Text, Title, Paragraph } = Typography;

interface GuestWithReservations extends Guest {
  reservations?: Reservation[];
}

interface GuestDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guestId: number | null | undefined;
}

export function GuestDetailsDrawer({
  open,
  onOpenChange,
  guestId,
}: GuestDetailsDrawerProps) {
  const [guestData, setGuestData] = useState<GuestWithReservations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !guestId) {
      setGuestData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetch(`/guests/${guestId}`, {
      headers: {
        Accept: 'application/json',
      },
      credentials: 'same-origin',
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('فشل في تحميل بيانات النزيل');
        }
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setGuestData(data.guest ?? data);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'تعذر جلب ملف النزيل');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [open, guestId]);

  // Aggregate statistics
  const reservations = guestData?.reservations ?? [];
  const totalBookings = reservations.length;
  const totalSpent = reservations.reduce((sum, r) => sum + Number(r.total_price || 0), 0);
  const totalPaid = reservations.reduce((sum, r) => sum + Number(r.paid_amount || 0), 0);
  const totalBalance = reservations.reduce((sum, r) => sum + Number(r.balance || 0), 0);

  // Clean phone number for WhatsApp link
  const cleanPhone = guestData?.phone
    ? guestData.phone.replace(/[^\d+]/g, '').replace(/^0/, '20')
    : '';

  const getStatusTagColor = (status: string) => {
    switch (status) {
      case 'تم التسكين':
        return 'success';
      case 'ثابت':
        return 'processing';
      case 'انتظار':
        return 'warning';
      case 'غادر':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Drawer
      open={open}
      onClose={() => onOpenChange(false)}
      placement="left"
      size={480}
      title={
        <Space>
          <Avatar
            icon={<UserOutlined />}
            className="bg-sky-500 text-white"
            size={32}
          />
          <div>
            <Text strong className="text-base block">
              {isLoading ? 'جاري التحميل...' : guestData?.name ?? 'ملف النزيل'}
            </Text>
            <Text type="secondary" className="text-[11px] font-normal block">
              السجل الفندقي وتفاصيل الحجوزات السابقة والماليات
            </Text>
          </div>
        </Space>
      }
      styles={{
        body: { padding: 16 },
      }}
      destroyOnHidden
    >
      <div className="space-y-4 text-right" dir="rtl">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton active avatar paragraph={{ rows: 3 }} />
            <Skeleton active paragraph={{ rows: 4 }} />
            <Skeleton active paragraph={{ rows: 4 }} />
          </div>
        ) : error ? (
          <Alert type="error" title={error} showIcon />
        ) : guestData ? (
          <div className="space-y-4">
            {/* Contact & Identification Card */}
            <Card
              size="small"
              className="bg-stone-50/70 dark:bg-stone-900/40 border border-stone-200 dark:border-stone-800"
              styles={{ body: { padding: 14 } }}
            >
              <div className="flex items-center justify-between mb-2">
                <Space>
                  <PhoneOutlined className="text-stone-400" />
                  <span dir="ltr" className="font-mono font-semibold text-sm">
                    {guestData.phone}
                  </span>
                </Space>

                {cleanPhone && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<MessageOutlined />}
                    href={`https://wa.me/${cleanPhone}`}
                    target="_blank"
                    className="bg-emerald-600 hover:bg-emerald-500 text-xs"
                  >
                    واتساب
                  </Button>
                )}
              </div>

              {guestData.mil_code && (
                <div className="flex items-center gap-2 text-xs mb-2">
                  <SafetyCertificateOutlined className="text-sky-600" />
                  <Text type="secondary">الرقم العسكري / القومي:</Text>
                  <Tag color="blue" className="font-mono text-xs m-0">
                    {guestData.mil_code}
                  </Tag>
                </div>
              )}

              <Divider className="my-2" />

              <Text type="secondary" className="text-[11px] block">
                تاريخ التسجيل بالمنتجع: {new Date(guestData.created_at).toLocaleDateString('ar-EG')}
              </Text>
            </Card>

            {/* Financial & Stay Statistics */}
            <Row gutter={8}>
              <Col span={8}>
                <Card
                  size="small"
                  className="text-center bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800"
                  styles={{ body: { padding: 10 } }}
                >
                  <Statistic
                    title={<span className="text-[11px] text-stone-500">عدد الحجوزات</span>}
                    value={totalBookings}
                    styles={{ content: { fontSize: 18, fontWeight: 'bold' } }}
                  />
                </Card>
              </Col>

              <Col span={8}>
                <Card
                  size="small"
                  className="text-center bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800"
                  styles={{ body: { padding: 10 } }}
                >
                  <Statistic
                    title={<span className="text-[11px] text-stone-500">إجمالي المبالغ</span>}
                    value={totalSpent}
                    suffix={<span className="text-[10px]">ج.م</span>}
                    styles={{ content: { fontSize: 14, fontWeight: 'bold' } }}
                  />
                </Card>
              </Col>

              <Col span={8}>
                <Card
                  size="small"
                  className="text-center bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800"
                  styles={{ body: { padding: 10 } }}
                >
                  <Statistic
                    title={<span className="text-[11px] text-stone-500">المتبقي المطلوب</span>}
                    value={totalBalance}
                    suffix={<span className="text-[10px]">ج.م</span>}
                    styles={{
                      content: {
                        fontSize: 14,
                        fontWeight: 'bold',
                        color: totalBalance > 0 ? '#dc2626' : '#059669',
                      },
                    }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Reservations History Section */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <Text strong className="text-sm flex items-center gap-1.5">
                  <HistoryOutlined className="text-sky-600" />
                  <span>سجل الحجوزات ({reservations.length})</span>
                </Text>
              </div>

              {reservations.length === 0 ? (
                <Empty
                  description="لا توجد حجوزات مسجلة سابقة لهذا النزيل"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  className="my-6"
                />
              ) : (
                <div className="space-y-3">
                  {reservations.map((res) => {
                    const payments = res.payments ?? [];

                    return (
                      <Card
                        key={res.id}
                        size="small"
                        className="bg-stone-50/50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800"
                        styles={{ body: { padding: 12 } }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <Text strong className="text-xs flex items-center gap-1.5">
                              <HomeOutlined className="text-sky-600" />
                              <span>{res.unit?.name ?? 'وحدة غير محددة'}</span>
                              {res.unit?.sector && (
                                <span className="text-[11px] text-stone-400 font-normal">
                                  ({res.unit.sector.name})
                                </span>
                              )}
                            </Text>
                            <Text type="secondary" className="text-[11px] mt-0.5 flex items-center gap-1">
                              <CalendarOutlined />
                              <span>
                                {res.check_in} إلى {res.check_out}
                              </span>
                            </Text>
                          </div>

                          <Tag color={getStatusTagColor(res.status)} className="m-0 text-xs">
                            {res.status}
                          </Tag>
                        </div>

                        <Row gutter={6} className="bg-white dark:bg-stone-800/80 p-2 rounded border border-stone-200 dark:border-stone-700/80 text-[11px] text-center mb-2">
                          <Col span={8}>
                            <span className="text-stone-400 block text-[10px]">الإجمالي:</span>
                            <span className="font-semibold">
                              {Number(res.total_price).toLocaleString('ar-EG')} ج.م
                            </span>
                          </Col>
                          <Col span={8}>
                            <span className="text-stone-400 block text-[10px]">المسدد:</span>
                            <span className="font-semibold text-emerald-600">
                              {Number(res.paid_amount || 0).toLocaleString('ar-EG')} ج.م
                            </span>
                          </Col>
                          <Col span={8}>
                            <span className="text-stone-400 block text-[10px]">المتبقي:</span>
                            <span className={`font-semibold ${Number(res.balance || 0) > 0 ? 'text-red-600' : 'text-stone-700 dark:text-stone-300'}`}>
                              {Number(res.balance || 0).toLocaleString('ar-EG')} ج.م
                            </span>
                          </Col>
                        </Row>

                        {(res.has_meals || (res.extra_fees && res.extra_fees.length > 0)) && (
                          <div className="flex items-center gap-1.5 flex-wrap mb-2">
                            {res.has_meals && (
                              <Tag color="gold" className="text-[10px] m-0">
                                وجبات ({res.meals_nights_count || 0} ليلة): {Number(res.meals_total_price || 0).toLocaleString('ar-EG')} ج.م
                              </Tag>
                            )}
                            {res.extra_fees && res.extra_fees.length > 0 && (
                              <Tag color="purple" className="text-[10px] m-0">
                                رسوم إضافية: {res.extra_fees.reduce((s, f) => s + Number(f.amount), 0).toLocaleString('ar-EG')} ج.م
                              </Tag>
                            )}
                          </div>
                        )}

                        {payments.length > 0 && (
                          <div className="space-y-1 pt-1 border-t border-stone-200 dark:border-stone-800 text-[11px]">
                            <Text type="secondary" className="text-[10px] block font-medium">
                              سجل الدفعات المسجلة:
                            </Text>
                            {payments.map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between text-stone-500 text-[10px]"
                              >
                                <span>
                                  {p.method} • {new Date(p.created_at).toLocaleDateString('ar-EG')}
                                </span>
                                <span className="font-semibold font-mono text-stone-700 dark:text-stone-300">
                                  {Number(p.amount).toLocaleString('ar-EG')} ج.م
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {res.notes && (
                          <Paragraph type="secondary" className="text-[11px] italic bg-stone-100 dark:bg-stone-800/50 p-1.5 rounded mt-2 mb-0">
                            ملاحظات: {res.notes}
                          </Paragraph>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}
