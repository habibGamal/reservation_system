import React, { useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import { PaymentMethod, Reservation } from '@/types/reservation';
import {
  App,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import {
  AuditOutlined,
  BankOutlined,
  CalendarOutlined,
  CreditCardOutlined,
  HomeOutlined,
  QrcodeOutlined,
  UserOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: Reservation | null;
}

export function PaymentDialog({
  open,
  onOpenChange,
  reservation,
}: PaymentDialogProps) {
  const { message } = App.useApp();
  const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
    amount: '',
    method: 'Cash' as PaymentMethod,
    reference_number: '',
  });

  useEffect(() => {
    if (reservation && open) {
      clearErrors();
      setData({
        amount: reservation.balance > 0 ? String(reservation.balance) : '',
        method: 'Cash',
        reference_number: '',
      });
    }
  }, [reservation, open]);

  if (!reservation) {
    return null;
  }

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    post(`/reservations/${reservation.id}/payments`, {
      preserveScroll: true,
      onSuccess: () => {
        reset();
        onOpenChange(false);
        message.success('تم تسجيل الدفعة المالية وتحديث رصيد الحجز بنجاح');
      },
      onError: () => {
        message.error('تعذر تسجيل الدفعة، يرجى مراجعة الحقول والمحاولة ثانية');
      },
    });
  };

  const handleSetFullBalance = () => {
    if (reservation.balance > 0) {
      setData('amount', String(reservation.balance));
    }
  };

  const methodOptions = [
    {
      value: 'Cash',
      label: (
        <Space>
          <BankOutlined className="text-emerald-600" />
          <span>نقداً (خزينة الاستقبال)</span>
        </Space>
      ),
    },
    {
      value: 'visa',
      label: (
        <Space>
          <CreditCardOutlined className="text-sky-600" />
          <span>فيزا / بطاقة بنكية (POS)</span>
        </Space>
      ),
    },
    {
      value: 'instapay',
      label: (
        <Space>
          <QrcodeOutlined className="text-purple-600" />
          <span>إنستاباي / تحويل بنكي لحظي</span>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={() => onOpenChange(false)}
      title={
        <Space className="text-base">
          <AuditOutlined className="text-sky-600" />
          <span>تسجيل دفعة جديدة لحجز النزيل</span>
        </Space>
      }
      onOk={handleSubmit}
      confirmLoading={processing}
      okButtonProps={{
        disabled: !data.amount || Number(data.amount) <= 0,
        icon: <AuditOutlined />,
      }}
      okText={processing ? 'جاري التسجيل...' : 'تأكيد تسجيل الدفعة'}
      cancelText="إلغاء"
      destroyOnHidden
      centered
      width="min(520px, calc(100vw - 16px))"
      style={{ maxWidth: 'calc(100vw - 16px)', margin: '8px auto' }}
      styles={{
        body: {
          padding: '8px 12px 16px',
        },
      }}
    >
      <div className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-0.5" dir="rtl">
        <Text type="secondary" className="text-xs block">
          تسجيل دفعة نقدية أو إلكترونية (فيزا / إنستاباي) مع إعادة احتساب الرصيد المتبقي آلياً
        </Text>

        {/* Reservation Financial Overview */}
        <Card
          size="small"
          className="bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800"
          styles={{ body: { padding: '10px 12px' } }}
        >
          <div className="flex items-center justify-between text-xs mb-2 flex-wrap gap-1">
            <span className="font-semibold flex items-center gap-1.5">
              <UserOutlined className="text-stone-400" />
              {reservation.guest?.name ?? 'نزيل غير محدد'}
            </span>
            <Tag color="blue" className="m-0">{reservation.status}</Tag>
          </div>

          <div className="flex items-center justify-between text-xs text-stone-500 mb-3 flex-wrap gap-1">
            <span className="flex items-center gap-1">
              <HomeOutlined />
              {reservation.unit?.sector?.name ?? 'قطاع'} - وحدة {reservation.unit?.name ?? 'وحدة'}
            </span>
            <span className="flex items-center gap-1">
              <CalendarOutlined />
              {reservation.check_in} إلى {reservation.check_out} ({reservation.nights_count} ليلة)
            </span>
          </div>

          <Row gutter={[6, 6]}>
            <Col xs={8} sm={8}>
              <div className="p-1.5 sm:p-2 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-center">
                <Statistic
                  title={<span className="text-[10px] sm:text-[11px] text-stone-500">إجمالي الحجز</span>}
                  value={Number(reservation.total_price)}
                  suffix={<span className="text-[9px] sm:text-[10px]">ج.م</span>}
                  styles={{ content: { fontSize: 12, fontWeight: 'bold' } }}
                />
              </div>
            </Col>
            <Col xs={8} sm={8}>
              <div className="p-1.5 sm:p-2 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-center">
                <Statistic
                  title={<span className="text-[10px] sm:text-[11px] text-stone-500">المسدد مسبقاً</span>}
                  value={Number(reservation.paid_amount)}
                  suffix={<span className="text-[9px] sm:text-[10px]">ج.م</span>}
                  styles={{ content: { fontSize: 12, fontWeight: 'bold', color: '#059669' } }}
                />
              </div>
            </Col>
            <Col xs={8} sm={8}>
              <div className="p-1.5 sm:p-2 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-center">
                <Statistic
                  title={<span className="text-[10px] sm:text-[11px] text-stone-500">المتبقي للتحصيل</span>}
                  value={Number(reservation.balance)}
                  suffix={<span className="text-[9px] sm:text-[10px]">ج.م</span>}
                  styles={{ content: { fontSize: 12, fontWeight: 'bold', color: reservation.balance > 0 ? '#dc2626' : '#059669' } }}
                />
              </div>
            </Col>
          </Row>
        </Card>

        {/* Form Fields */}
        <Form layout="vertical">
          {/* Amount Field */}
          <Form.Item
            label={
              <div className="flex items-center justify-between w-full">
                <span>قيمة الدفعة (ج.م)</span>
                {reservation.balance > 0 && (
                  <Button
                    type="link"
                    size="small"
                    onClick={handleSetFullBalance}
                    className="text-[11px] text-sky-600 p-0 h-auto"
                  >
                    تسديد كامل المتبقي ({Number(reservation.balance).toLocaleString()} ج.م)
                  </Button>
                )}
              </div>
            }
            required
            validateStatus={errors.amount ? 'error' : ''}
            help={errors.amount}
          >
            <InputNumber
              value={data.amount ? Number(data.amount) : null}
              onChange={(val) => setData('amount', val !== null ? String(val) : '')}
              min={0.01}
              step={0.01}
              placeholder="مثال: 1000"
              className="w-full text-right"
              autoFocus
            />
          </Form.Item>

          {/* Payment Method Selector */}
          <Form.Item
            label="طريقة الدفع"
            required
            validateStatus={errors.method ? 'error' : ''}
            help={errors.method}
          >
            <Select
              value={data.method}
              onChange={(val) => setData('method', val as PaymentMethod)}
              options={methodOptions}
              className="w-full"
            />
          </Form.Item>

          {/* Reference Number Field */}
          <Form.Item
            label="رقم العملية / الحوالة / الإيصال (اختياري)"
            validateStatus={errors.reference_number ? 'error' : ''}
            help={errors.reference_number}
          >
            <Input
              value={data.reference_number}
              onChange={(e) => setData('reference_number', e.target.value)}
              placeholder={
                data.method === 'instapay'
                  ? 'مثال: TXN-998823'
                  : 'رقم إيصال ماكينة الفيزا أو الدفتر...'
              }
            />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
}
