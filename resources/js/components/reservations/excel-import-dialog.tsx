import React, { useMemo } from 'react';
import { useForm } from '@inertiajs/react';
import dayjs, { Dayjs } from 'dayjs';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Modal,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  Upload,
} from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  FileExcelOutlined,
  InboxOutlined,
  LeftOutlined,
  RightOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  ResortPeriod,
  buildPeriodFromFriday,
  generatePeriodsList,
  getCurrentPeriod,
  getNextPeriod,
  getPreviousPeriod,
  isFridayToThursdayPeriod,
  parseYMD,
} from '@/lib/period-utils';

const { Text, Paragraph } = Typography;

interface ExcelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExcelImportDialog({ open, onOpenChange }: ExcelImportDialogProps) {
  const { message } = App.useApp();

  const { data, setData, post, processing, errors, reset, clearErrors } = useForm<{
    file: File | null;
    check_in: string;
    check_out: string;
  }>({
    file: null,
    check_in: '',
    check_out: '',
  });

  // Memoized resort periods calculated dynamically on the frontend (Friday to Thursday, 6 nights)
  const currentPeriod = useMemo(() => getCurrentPeriod(), []);
  const nextPeriod = useMemo(() => getNextPeriod(currentPeriod), [currentPeriod]);
  const prevPeriod = useMemo(() => getPreviousPeriod(currentPeriod), [currentPeriod]);
  const periodsList = useMemo(() => generatePeriodsList(8, 16), []);

  // Detect active period if dates match a Friday-to-Thursday period
  const activePeriod = useMemo<ResortPeriod | null>(() => {
    if (!data.check_in || !data.check_out) return null;
    if (isFridayToThursdayPeriod(data.check_in, data.check_out)) {
      return buildPeriodFromFriday(parseYMD(data.check_in));
    }
    return null;
  }, [data.check_in, data.check_out]);

  // Derive select value for period dropdown
  const periodSelectValue = useMemo(() => {
    if (!data.check_in || !data.check_out) return 'none';
    if (data.check_in === currentPeriod.startStr && data.check_out === currentPeriod.endStr) {
      return 'current_period';
    }
    if (data.check_in === nextPeriod.startStr && data.check_out === nextPeriod.endStr) {
      return 'next_period';
    }
    if (data.check_in === prevPeriod.startStr && data.check_out === prevPeriod.endStr) {
      return 'prev_period';
    }
    if (isFridayToThursdayPeriod(data.check_in, data.check_out)) {
      return `period_${data.check_in}`;
    }
    return 'custom';
  }, [data.check_in, data.check_out, currentPeriod, nextPeriod, prevPeriod]);

  const handleSelectPeriod = (val: string) => {
    clearErrors('check_in');
    clearErrors('check_out');

    if (val === 'current_period') {
      setData((prev) => ({
        ...prev,
        check_in: currentPeriod.startStr,
        check_out: currentPeriod.endStr,
      }));
    } else if (val === 'next_period') {
      setData((prev) => ({
        ...prev,
        check_in: nextPeriod.startStr,
        check_out: nextPeriod.endStr,
      }));
    } else if (val === 'prev_period') {
      setData((prev) => ({
        ...prev,
        check_in: prevPeriod.startStr,
        check_out: prevPeriod.endStr,
      }));
    } else if (val.startsWith('period_')) {
      const pStart = val.replace('period_', '');
      const periodObj = periodsList.find((p) => p.startStr === pStart) || buildPeriodFromFriday(parseYMD(pStart));
      setData((prev) => ({
        ...prev,
        check_in: periodObj.startStr,
        check_out: periodObj.endStr,
      }));
    }
  };

  const handleStepPrevPeriod = () => {
    clearErrors('check_in');
    clearErrors('check_out');
    const base = activePeriod || currentPeriod;
    const prev = getPreviousPeriod(base);
    setData((d) => ({
      ...d,
      check_in: prev.startStr,
      check_out: prev.endStr,
    }));
  };

  const handleStepNextPeriod = () => {
    clearErrors('check_in');
    clearErrors('check_out');
    const base = activePeriod || currentPeriod;
    const next = getNextPeriod(base);
    setData((d) => ({
      ...d,
      check_in: next.startStr,
      check_out: next.endStr,
    }));
  };

  const handleSetCurrentPeriod = () => {
    clearErrors('check_in');
    clearErrors('check_out');
    setData((d) => ({
      ...d,
      check_in: currentPeriod.startStr,
      check_out: currentPeriod.endStr,
    }));
  };

  const nightsCount = useMemo(() => {
    if (!data.check_in || !data.check_out) return null;
    const d1 = new Date(data.check_in);
    const d2 = new Date(data.check_out);
    const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : null;
  }, [data.check_in, data.check_out]);

  const handleFileChange = (file: File | null) => {
    clearErrors();
    setData((prev) => {
      let checkIn = prev.check_in;
      let checkOut = prev.check_out;

      if (file && !checkIn) {
        const name = file.name;
        const match = name.match(/(\d{1,2})[-_](\d{1,2})/);
        if (match) {
          const day = match[1].padStart(2, '0');
          const month = match[2].padStart(2, '0');
          const year = new Date().getFullYear();
          checkIn = `${year}-${month}-${day}`;

          const inDate = new Date(`${year}-${month}-${day}`);
          if (!isNaN(inDate.getTime())) {
            inDate.setDate(inDate.getDate() + 6);
            const outDay = String(inDate.getDate()).padStart(2, '0');
            const outMonth = String(inDate.getMonth() + 1).padStart(2, '0');
            checkOut = `${inDate.getFullYear()}-${outMonth}-${outDay}`;
          }
        }
      }

      return {
        ...prev,
        file,
        check_in: checkIn,
        check_out: checkOut,
      };
    });
  };

  const handleClose = () => {
    reset();
    clearErrors();
    onOpenChange(false);
  };

  const handleSubmit = () => {
    if (!data.file) {
      message.error('يرجى اختيار ملف الإكسيل أولاً');
      return;
    }

    if (!data.check_in || !data.check_out) {
      message.error('يرجى تحديد تاريخ الوصول وتاريخ المغادرة');
      return;
    }

    post('/reservations/import', {
      forceFormData: true,
      onSuccess: () => {
        message.success('تم استيراد كشف الحجوزات بنجاح وحفظها بحالة انتظار');
        handleClose();
      },
      onError: (errs) => {
        if ((errs as Record<string, any>).import_errors) {
          message.error('تعذر استيراد الملف لوجود أخطاء أو تعارضات. تم التراجع عن العملية.');
        } else {
          message.error('يرجى تصحيح الأخطاء والمحاولة مرة أخرى');
        }
      },
    });
  };

  // Format import errors if present
  const rawImportErrors = (errors as Record<string, any>).import_errors;
  const importErrorList: string[] = Array.isArray(rawImportErrors)
    ? rawImportErrors
    : typeof rawImportErrors === 'string'
      ? [rawImportErrors]
      : [];

  const periodOptions = [
    {
      label: 'فترات المنتجع (جمعة - خميس)',
      options: [
        { value: 'current_period', label: `الفترة الحالية (${currentPeriod.shortLabel})` },
        { value: 'next_period', label: `الفترة القادمة (${nextPeriod.shortLabel})` },
        { value: 'prev_period', label: `الفترة السابقة (${prevPeriod.shortLabel})` },
      ],
    },
    {
      label: 'أفواج محددة',
      options: periodsList.map((p) => ({
        value: `period_${p.startStr}`,
        label: p.label,
      })),
    },
    {
      label: 'أخرى',
      options: [{ value: 'custom', label: 'فترة مخصصة (إدخال يدوي)...' }],
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title={
        <Space className="text-base">
          <FileExcelOutlined className="text-emerald-600 text-lg" />
          <span>استيراد كشف حجوزات من ملف إكسيل</span>
        </Space>
      }
      onOk={handleSubmit}
      confirmLoading={processing}
      okButtonProps={{
        disabled: !data.file || !data.check_in || !data.check_out,
        icon: <UploadOutlined />,
      }}
      okText={processing ? 'جاري الاستيراد...' : 'تأكيد واستيراد'}
      cancelText="إلغاء"
      destroyOnHidden
      centered
      width="min(640px, calc(100vw - 24px))"
      style={{ maxWidth: 'calc(100vw - 24px)', margin: '16px auto' }}
    >
      <div className="space-y-4 pt-1" dir="rtl">
        <Text type="secondary" className="text-xs block">
          رفع كشوفات الحجوزات المجمعة لإنشاء حجوزات النزلاء تلقائياً مع التحقق الكامل من منع التعارض
        </Text>

        {/* File Upload Zone */}
        <div>
          <Text strong className="text-xs mb-1.5 block">ملف الإكسيل (.xls, .xlsx, .csv)</Text>

          {data.file ? (
            <Card
              size="small"
              className="bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800"
              styles={{
                body: {
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                },
              }}
            >
              <div className="flex items-center gap-3">
                <FileExcelOutlined className="text-2xl text-emerald-600" />
                <div>
                  <Text strong className="text-xs block truncate max-w-[320px]">
                    {data.file.name}
                  </Text>
                  <Text type="secondary" className="text-[11px]">
                    {(data.file.size / 1024).toFixed(1)} كيلوبايت
                  </Text>
                </div>
              </div>
              <Button
                type="text"
                danger
                size="small"
                icon={<CloseOutlined />}
                onClick={() => handleFileChange(null)}
              />
            </Card>
          ) : (
            <Upload.Dragger
              accept=".xls,.xlsx,.csv,.xml"
              maxCount={1}
              showUploadList={false}
              beforeUpload={(file) => {
                handleFileChange(file);
                return false;
              }}
              className="p-3"
            >
              <p className="ant-upload-drag-icon my-2">
                <InboxOutlined className="text-sky-600 text-3xl" />
              </p>
              <p className="ant-upload-text text-sm font-semibold">
                اسحب وأفلت ملف الإكسيل هنا أو اضغط للاختيار
              </p>
              <p className="ant-upload-hint text-xs text-stone-400">
                يدعم صيغة كشف فرع القوات الجوية (مثل 21-8.xls) وكافة ملفات Excel/XML
              </p>
            </Upload.Dragger>
          )}

          {errors.file && (
            <Text type="danger" className="text-xs mt-1 block">
              {errors.file}
            </Text>
          )}
        </div>

        {/* Dates Selection Section with Resort Periods */}
        <Card
          size="small"
          className="bg-stone-50/50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800"
          styles={{ body: { padding: 14 } }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 dark:border-stone-800 pb-3 mb-3">
            <div>
              <Text strong className="text-xs flex items-center gap-1.5">
                <CalendarOutlined className="text-sky-600" />
                <span>تحديد فترة الحجز أو الفوج</span>
              </Text>
              <Text type="secondary" className="text-[11px] block mt-0.5">
                اختر فوجاً معتمداً (جمعة إلى خميس) أو حدد تواريخ مخصصة
              </Text>
            </div>

            <Select
              value={periodSelectValue}
              onChange={handleSelectPeriod}
              options={periodOptions}
              className="w-full sm:w-56"
              size="small"
              placeholder="اختر الفوج أو الفترة..."
            />
          </div>

          {/* Active Period Quick Stepper & Information */}
          {activePeriod && (
            <div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-2 rounded-lg text-xs mb-3">
              <Space size="small">
                <Tag color="success" icon={<CheckCircleOutlined />} className="m-0 text-[11px]">
                  فوج أسبوعي معتمد (6 ليالٍ)
                </Tag>
                <Text strong className="text-xs">
                  {activePeriod.label}
                </Text>
              </Space>

              <Space size="small">
                <Button
                  type="text"
                  size="small"
                  icon={<RightOutlined />}
                  onClick={handleStepPrevPeriod}
                  title="الفوج السابق"
                  className="text-xs h-6 px-1.5"
                >
                  السابق
                </Button>
                <Button
                  type="text"
                  size="small"
                  onClick={handleStepNextPeriod}
                  title="الفوج القادم"
                  className="text-xs h-6 px-1.5"
                >
                  التالي
                  <LeftOutlined />
                </Button>
                {activePeriod.id !== currentPeriod.id && (
                  <Button
                    type="link"
                    size="small"
                    onClick={handleSetCurrentPeriod}
                    className="text-[11px] h-6 px-1 text-sky-600 font-bold"
                  >
                    (الحالية)
                  </Button>
                )}
              </Space>
            </div>
          )}

          {/* Inputs: Check-in & Check-out */}
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="تاريخ الوصول (Check-in)"
                required
                validateStatus={errors.check_in ? 'error' : ''}
                help={errors.check_in}
                className="mb-1"
              >
                <DatePicker
                  value={data.check_in ? dayjs(data.check_in) : null}
                  onChange={(_date, dateString) => {
                    setData('check_in', (dateString as string) || '');
                  }}
                  format="YYYY-MM-DD"
                  className="w-full"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="تاريخ المغادرة (Check-out)"
                required
                validateStatus={errors.check_out ? 'error' : ''}
                help={errors.check_out}
                className="mb-1"
              >
                <DatePicker
                  value={data.check_out ? dayjs(data.check_out) : null}
                  onChange={(_date, dateString) => {
                    setData('check_out', (dateString as string) || '');
                  }}
                  format="YYYY-MM-DD"
                  className="w-full"
                />
              </Form.Item>
            </Col>
          </Row>

          {nightsCount !== null && (
            <div className="text-left text-[11px] text-stone-500 mt-1">
              <span>مدة الإقامة: <strong className="text-stone-800 dark:text-stone-200">{nightsCount}</strong> {nightsCount === 1 ? 'ليلة' : 'ليالٍ'}</span>
            </div>
          )}
        </Card>

        {/* Fixed Import Parameters Info */}
        <Card
          size="small"
          className="bg-stone-50 dark:bg-stone-900/40 border border-stone-200 dark:border-stone-800"
          styles={{ body: { padding: 10 } }}
        >
          <Text strong className="text-xs block mb-1.5">
            الإعدادات التلقائية لكشف الحجز المستورد:
          </Text>
          <Space wrap size={[4, 6]}>
            <Tag color="gold">الحالة: انتظار</Tag>
            <Tag color="blue">النوع: فرع</Tag>
            <Tag color="default">السعر الإجمالي: 0.00 ج.م</Tag>
            <Tag color="default">الفئة: فارغة (حسب الكشف)</Tag>
          </Space>
          <Paragraph type="secondary" className="text-[11px] mt-2 mb-0">
            يتم تسجيل بيانات الرتبة العسكرية وحالة الخدمة في ملاحظات الحجز، مع إنشاء أو تحديث سجل النزيل برقم الهاتف والرقم العسكري تلقائياً.
          </Paragraph>
        </Card>

        {/* Detailed Rollback Errors Alert */}
        {importErrorList.length > 0 && (
          <Alert
            type="error"
            showIcon
            title={`تم إلغاء الاستيراد بالكامل والتراجع عن التغييرات (${importErrorList.length} ملاحظة/تعارض)`}
            description={
              <div className="mt-2 text-xs">
                <p className="mb-2 font-medium">
                  لم يتم حفظ أي حجز حرصاً على سلامة البيانات. يرجى مراجعة وتصحيح الصفوف التالية في الملف:
                </p>
                <div className="max-h-36 overflow-y-auto space-y-1 rounded border border-red-200 dark:border-red-900 bg-white/60 dark:bg-black/30 p-2 text-right font-mono text-[11px]">
                  {importErrorList.map((err, idx) => (
                    <div key={idx} className="text-red-600 dark:text-red-400 border-b border-red-100 dark:border-red-950 last:border-b-0 pb-1 pt-1">
                      {err}
                    </div>
                  ))}
                </div>
              </div>
            }
          />
        )}
      </div>
    </Modal>
  );
}
