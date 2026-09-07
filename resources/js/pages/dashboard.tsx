import React, { useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
  Button,
  Card,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  AppstoreOutlined,
  CalendarOutlined,
  HomeOutlined,
  PrinterOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  TableOutlined,
} from '@ant-design/icons';
import { dashboard } from '@/routes';

const { Text } = Typography;

export interface SectorStatItem {
  key: string;
  name: string;
  checked_in: number;
  waiting: number;
  total_booked: number;
  vacant: number;
  confirmed: number;
  grand_total: number;
  occupancy_rate: number;
  notes?: string;
}

export interface SummaryData {
  checked_in: number;
  waiting: number;
  total_booked: number;
  vacant: number;
  confirmed: number;
  grand_total: number;
  percentages: {
    checked_in: number;
    waiting: number;
    total_booked: number;
    vacant: number;
    confirmed: number;
    operational_capacity: number;
  };
}

export interface PeriodOption {
  start_date: string;
  end_date: string;
  label: string;
  is_current: boolean;
}

interface DashboardProps {
  stats: SectorStatItem[];
  summary: SummaryData;
  referenceStats?: SectorStatItem[];
  referenceSummary?: SummaryData;
  availablePeriods: PeriodOption[];
  currentPeriod: {
    start_date: string;
    end_date: string;
    formatted: string;
    is_current: boolean;
  };
  preset?: string | null;
}

export default function Dashboard({
  stats = [],
  summary = {
    checked_in: 0,
    waiting: 0,
    total_booked: 0,
    vacant: 0,
    confirmed: 0,
    grand_total: 0,
    percentages: {
      checked_in: 0,
      waiting: 0,
      total_booked: 0,
      vacant: 0,
      confirmed: 0,
      operational_capacity: 0,
    },
  },
  availablePeriods = [],
  currentPeriod,
  preset,
}: DashboardProps) {
  const [searchText, setSearchText] = useState('');

  // Handle switching period / preset
  const handlePeriodChange = (val: string) => {
    if (val === 'reference') {
      router.get('/dashboard', { preset: 'reference' }, { preserveState: true });
      return;
    }

    const [start, end] = val.split('_');
    router.get(
      '/dashboard',
      { start_date: start, end_date: end },
      { preserveState: true }
    );
  };

  // Filter sectors by search text
  const filteredStats = useMemo(() => {
    if (!searchText.trim()) return stats;
    return stats.filter((s) =>
      s.name.toLowerCase().includes(searchText.trim().toLowerCase())
    );
  }, [stats, searchText]);

  const activePeriodValue = preset === 'reference'
    ? 'reference'
    : `${currentPeriod?.start_date}_${currentPeriod?.end_date}`;

  // Print report
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // Table columns matching the reference sheet
  const columns: ColumnsType<SectorStatItem> = [
    {
      title: 'نوع الوحدة',
      dataIndex: 'name',
      key: 'name',
      width: 140,
      render: (name: string, record) => (
        <div className="py-0.5">
          <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">
            {name}
          </span>
          {record.grand_total === 0 && (
            <Tag className="mr-2 text-[10px] m-0">غير مشغل</Tag>
          )}
        </div>
      ),
    },
    {
      title: 'اسكان',
      dataIndex: 'checked_in',
      key: 'checked_in',
      align: 'center',
      width: 90,
      render: (val: number) => (
        <span className={`text-sm font-bold ${val > 0 ? 'text-emerald-600' : 'text-stone-400'}`}>
          {val}
        </span>
      ),
    },
    {
      title: 'انتظار',
      dataIndex: 'waiting',
      key: 'waiting',
      align: 'center',
      width: 90,
      render: (val: number) => (
        <span className={`text-sm font-bold ${val > 0 ? 'text-amber-600' : 'text-stone-400'}`}>
          {val}
        </span>
      ),
    },
    {
      title: 'اجمالي',
      dataIndex: 'total_booked',
      key: 'total_booked',
      align: 'center',
      width: 95,
      render: (val: number) => (
        <span className="text-sm font-extrabold text-sky-700 dark:text-sky-400">
          {val}
        </span>
      ),
    },
    {
      title: 'فارغ',
      dataIndex: 'vacant',
      key: 'vacant',
      align: 'center',
      width: 90,
      render: (val: number) => (
        <span className={`text-sm font-medium ${val > 0 ? 'text-stone-700 dark:text-stone-300' : 'text-stone-400'}`}>
          {val}
        </span>
      ),
    },
    {
      title: 'ثابت',
      dataIndex: 'confirmed',
      key: 'confirmed',
      align: 'center',
      width: 90,
      render: (val: number) => (
        <span className={`text-sm font-medium ${val > 0 ? 'text-purple-700 dark:text-purple-400 font-bold' : 'text-stone-400'}`}>
          {val}
        </span>
      ),
    },
    {
      title: 'اجمالي2',
      dataIndex: 'grand_total',
      key: 'grand_total',
      align: 'center',
      width: 95,
      render: (val: number) => (
        <span className="text-sm font-bold text-stone-800 dark:text-stone-200">
          {val}
        </span>
      ),
    },
    {
      title: 'نسبة الإشغال',
      dataIndex: 'occupancy_rate',
      key: 'occupancy_rate',
      align: 'center',
      width: 110,
      render: (rate: number, record) => {
        if (record.grand_total === 0) {
          return <span className="text-stone-400 text-xs">—</span>;
        }
        return (
          <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
            {rate}%
          </span>
        );
      },
    },
  ];

  return (
    <>
      <Head title="لوحة التحكم - منتجع النسور" />

      <div className="w-full max-w-7xl mx-auto min-w-0 p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5" dir="rtl">
        {/* Simple & Clean Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-3 border-b border-stone-200 dark:border-stone-800">
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-stone-900 dark:text-stone-100 m-0">
              إحصائيات إشغال الوحدات
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 m-0 leading-relaxed">
              منتجع النسور للقوات الجوية •{' '}
              {preset === 'reference'
                ? 'كشف الإشغال المعتمد (النموذج)'
                : `الفترة المحددة: ${currentPeriod?.formatted || ''}`}
            </p>
          </div>

          {/* Controls: Period Selector & Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
            <Select
              value={activePeriodValue}
              onChange={handlePeriodChange}
              className="w-full sm:w-64 text-xs"
              options={[
                ...availablePeriods.map((p) => ({
                  value: `${p.start_date}_${p.end_date}`,
                  label: p.label,
                })),
                {
                  value: 'reference',
                  label: 'كشف الإشغال المعتمد (نموذج الإكسيل)',
                },
              ]}
            />

            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
              <Link href="/reservations?date_preset=current_period" className="col-span-2 sm:col-auto w-full sm:w-auto">
                <Button type="primary" icon={<CalendarOutlined />} className="text-xs w-full sm:w-auto h-9 sm:h-8 flex items-center justify-center font-medium">
                  إدارة الحجوزات
                </Button>
              </Link>

              <Link href="/reservations?view=matrix&date_preset=current_period" className="w-full sm:w-auto">
                <Button icon={<TableOutlined />} className="text-xs w-full sm:w-auto h-9 sm:h-8 flex items-center justify-center">
                  مصفوفة التسكين
                </Button>
              </Link>

              <Button
                icon={<PrinterOutlined />}
                onClick={handlePrint}
                className="text-xs w-full sm:w-auto h-9 sm:h-8 flex items-center justify-center"
              >
                طباعة
              </Button>
            </div>
          </div>
        </div>

        {/* Clean Neutral KPI Metric Cards (Responsive CSS Grid) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 w-full">
          <Card
            className="border border-stone-200 dark:border-stone-800 rounded-xl bg-white dark:bg-stone-900 shadow-2xs h-full"
            styles={{ body: { padding: '10px 12px' } }}
          >
            <Text type="secondary" className="text-[11px] sm:text-xs block mb-1 truncate">
              اسكان (مسكن)
            </Text>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {summary.checked_in}
              </span>
              <span className="text-[10px] sm:text-[11px] text-stone-400">وحدة</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-stone-500 font-medium block mt-1 truncate">
              {summary.percentages.checked_in}% من الإجمالي
            </span>
          </Card>

          <Card
            className="border border-stone-200 dark:border-stone-800 rounded-xl bg-white dark:bg-stone-900 shadow-2xs h-full"
            styles={{ body: { padding: '10px 12px' } }}
          >
            <Text type="secondary" className="text-[11px] sm:text-xs block mb-1 truncate">
              انتظار (قيد الوصول)
            </Text>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                {summary.waiting}
              </span>
              <span className="text-[10px] sm:text-[11px] text-stone-400">وحدة</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-stone-500 font-medium block mt-1 truncate">
              {summary.percentages.waiting}% من الإجمالي
            </span>
          </Card>

          <Card
            className="border border-stone-200 dark:border-stone-800 rounded-xl bg-white dark:bg-stone-900 shadow-2xs h-full"
            styles={{ body: { padding: '10px 12px' } }}
          >
            <Text type="secondary" className="text-[11px] sm:text-xs block mb-1 truncate">
              اجمالي (المحجوز)
            </Text>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-bold text-sky-700 dark:text-sky-400">
                {summary.total_booked}
              </span>
              <span className="text-[10px] sm:text-[11px] text-stone-400">وحدة</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-stone-500 font-medium block mt-1 truncate">
              {summary.percentages.total_booked}% إشغال
            </span>
          </Card>

          <Card
            className="border border-stone-200 dark:border-stone-800 rounded-xl bg-white dark:bg-stone-900 shadow-2xs h-full"
            styles={{ body: { padding: '10px 12px' } }}
          >
            <Text type="secondary" className="text-[11px] sm:text-xs block mb-1 truncate">
              فارغ (شاغر)
            </Text>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-bold text-stone-800 dark:text-stone-200">
                {summary.vacant}
              </span>
              <span className="text-[10px] sm:text-[11px] text-stone-400">وحدة</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-stone-500 font-medium block mt-1 truncate">
              {summary.percentages.vacant}% متاح
            </span>
          </Card>

          <Card
            className="border border-stone-200 dark:border-stone-800 rounded-xl bg-white dark:bg-stone-900 shadow-2xs h-full"
            styles={{ body: { padding: '10px 12px' } }}
          >
            <Text type="secondary" className="text-[11px] sm:text-xs block mb-1 truncate">
              ثابت (مخصص)
            </Text>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-bold text-purple-700 dark:text-purple-400">
                {summary.confirmed}
              </span>
              <span className="text-[10px] sm:text-[11px] text-stone-400">وحدة</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-stone-500 font-medium block mt-1 truncate">
              {summary.percentages.confirmed}% مخصص
            </span>
          </Card>

          <Card
            className="border border-stone-200 dark:border-stone-800 rounded-xl bg-white dark:bg-stone-900 shadow-2xs h-full"
            styles={{ body: { padding: '10px 12px' } }}
          >
            <Text type="secondary" className="text-[11px] sm:text-xs block mb-1 truncate">
              اجمالي2 (الطاقة)
            </Text>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
                {summary.grand_total}
              </span>
              <span className="text-[10px] sm:text-[11px] text-stone-400">وحدة</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-stone-500 font-medium block mt-1 truncate">
              إجمالي سعة القطاعات
            </span>
          </Card>
        </div>

        {/* Search Input and Table */}
        <Card
          className="w-full max-w-full min-w-0 border border-stone-200 dark:border-stone-800 rounded-xl shadow-2xs overflow-hidden"
          title={
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-stone-800 dark:text-stone-200">
                  بيان إشغال الوحدات حسب القطاع
                </span>
                <span className="text-[11px] text-stone-400 font-normal sm:hidden">
                  (اسحب أفقياً ←)
                </span>
              </div>
              <Input
                prefix={<SearchOutlined className="text-stone-400 ml-1 text-xs" />}
                placeholder="بحث عن قطاع..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                className="w-full sm:w-48 text-xs"
                size="middle"
              />
            </div>
          }
          styles={{ body: { padding: 0 } }}
        >
          <div className="w-full max-w-full min-w-0 overflow-x-auto">
            <Table
              columns={columns}
              dataSource={filteredStats}
              pagination={false}
              rowKey="key"
              size="middle"
              scroll={{ x: 720 }}
              rowClassName="hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition-colors"
              summary={() => (
                <Table.Summary>
                  {/* Total Row (اجمالي) */}
                  <Table.Summary.Row className="bg-stone-100 dark:bg-stone-800 font-bold border-t border-stone-300 dark:border-stone-700">
                    <Table.Summary.Cell index={0}>
                      <span className="font-extrabold text-stone-900 dark:text-stone-100">
                        اجمالي
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="center">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {summary.checked_in}
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="center">
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        {summary.waiting}
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="center">
                      <span className="font-extrabold text-sky-700 dark:text-sky-400">
                        {summary.total_booked}
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="center">
                      <span className="font-bold text-stone-700 dark:text-stone-300">
                        {summary.vacant}
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="center">
                      <span className="font-bold text-purple-700 dark:text-purple-400">
                        {summary.confirmed}
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={6} align="center">
                      <span className="font-extrabold text-stone-900 dark:text-stone-100">
                        {summary.grand_total}
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={7} align="center">
                      <span className="text-xs text-stone-500 font-bold">
                        {summary.percentages.total_booked}% إشغال
                      </span>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>

                  {/* Percentage Row (النسبة) */}
                  <Table.Summary.Row className="bg-stone-50 dark:bg-stone-800/50 font-bold border-t border-stone-200 dark:border-stone-700">
                    <Table.Summary.Cell index={0}>
                      <span className="font-bold text-stone-700 dark:text-stone-300">
                        النسبة
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="center">
                      <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                        {summary.percentages.checked_in}
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="center">
                      <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                        {summary.percentages.waiting}
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="center">
                      <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                        {summary.percentages.total_booked}
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="center">
                      <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                        {summary.percentages.vacant}
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="center">
                      <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                        {summary.percentages.confirmed}
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={6} align="center">
                      <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                        {summary.percentages.operational_capacity}
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={7} align="center">
                      <span className="text-stone-400 text-xs">—</span>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </div>
        </Card>

        {/* Quick Operations Shortcuts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 w-full">
          <Link href="/reservations?date_preset=current_period" className="block h-full">
            <Card
              hoverable
              className="h-full border border-stone-200 dark:border-stone-800 shadow-2xs rounded-xl"
              styles={{ body: { padding: '14px 16px' } }}
            >
              <Space align="start" size={12}>
                <div className="h-10 w-10 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center text-lg shrink-0">
                  <CalendarOutlined />
                </div>
                <div>
                  <Text strong className="text-sm block">
                    إدارة الحجوزات
                  </Text>
                  <Text type="secondary" className="text-xs block mt-0.5">
                    استعراض الحجوزات والدفعات
                  </Text>
                </div>
              </Space>
            </Card>
          </Link>

          <Link href="/reservations?view=matrix" className="block h-full">
            <Card
              hoverable
              className="h-full border border-stone-200 dark:border-stone-800 shadow-2xs rounded-xl"
              styles={{ body: { padding: '14px 16px' } }}
            >
              <Space align="start" size={12}>
                <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center text-lg shrink-0">
                  <AppstoreOutlined />
                </div>
                <div>
                  <Text strong className="text-sm block">
                    مصفوفة التسكين
                  </Text>
                  <Text type="secondary" className="text-xs block mt-0.5">
                    توزيع الوحدات والغرف الفورية
                  </Text>
                </div>
              </Space>
            </Card>
          </Link>

          <Link href="/resort-management" className="block h-full">
            <Card
              hoverable
              className="h-full border border-stone-200 dark:border-stone-800 shadow-2xs rounded-xl"
              styles={{ body: { padding: '14px 16px' } }}
            >
              <Space align="start" size={12}>
                <div className="h-10 w-10 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center text-lg shrink-0">
                  <HomeOutlined />
                </div>
                <div>
                  <Text strong className="text-sm block">
                    إدارة المنتجع والوحدات
                  </Text>
                  <Text type="secondary" className="text-xs block mt-0.5">
                    إدارة القطاعات وقواعد الأسعار
                  </Text>
                </div>
              </Space>
            </Card>
          </Link>

          <Link href="/users" className="block h-full">
            <Card
              hoverable
              className="h-full border border-stone-200 dark:border-stone-800 shadow-2xs rounded-xl"
              styles={{ body: { padding: '14px 16px' } }}
            >
              <Space align="start" size={12}>
                <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center text-lg shrink-0">
                  <SafetyCertificateOutlined />
                </div>
                <div>
                  <Text strong className="text-sm block">
                    المستخدمين والصلاحيات
                  </Text>
                  <Text type="secondary" className="text-xs block mt-0.5">
                    إدارة حسابات المشرفين والأدوار
                  </Text>
                </div>
              </Space>
            </Card>
          </Link>
        </div>
      </div>
    </>
  );
}

Dashboard.layout = {
  breadcrumbs: [
    {
      title: 'لوحة التحكم',
      href: dashboard(),
    },
  ],
};
