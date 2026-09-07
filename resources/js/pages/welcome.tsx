import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { Button, Card, Col, Row, Space, Tag, Typography } from 'antd';
import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  FileExcelOutlined,
  HomeOutlined,
  LockOutlined,
  LoginOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { dashboard, login, register } from '@/routes';

const { Title, Text, Paragraph } = Typography;

export default function Welcome() {
  const { auth } = usePage().props as { auth?: { user?: any } };

  return (
    <>
      <Head title="منتجع النسور - منظومة الحجوزات الفندقية" />

      <div
        className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col justify-between p-4 md:p-8"
        dir="rtl"
      >
        {/* Navigation Header */}
        <header className="max-w-6xl mx-auto w-full flex items-center justify-between py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <HomeOutlined />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight block">منتجع النسور</span>
              <span className="text-[11px] text-stone-500 block">نظام الحجوزات والتسكين</span>
            </div>
          </div>

          <Space size="middle">
            {auth?.user ? (
              <Link href={dashboard()}>
                <Button
                  type="primary"
                  icon={<AppstoreOutlined />}
                  className="bg-sky-600 hover:bg-sky-500 font-semibold text-xs"
                >
                  لوحة التحكم
                </Button>
              </Link>
            ) : (
              <>
                <Link href={login()}>
                  <Button
                    type="text"
                    icon={<LoginOutlined />}
                    className="text-xs font-semibold"
                  >
                    تسجيل الدخول
                  </Button>
                </Link>
                <Link href={register()}>
                  <Button
                    type="primary"
                    className="bg-sky-600 hover:bg-sky-500 text-xs font-semibold"
                  >
                    حساب جديد
                  </Button>
                </Link>
              </>
            )}
          </Space>
        </header>

        {/* Hero Section */}
        <main className="max-w-5xl mx-auto w-full my-auto py-12 md:py-20 text-center space-y-8">
          <div className="space-y-4 max-w-3xl mx-auto">
            <Space size={8} wrap orientation="horizontal" className="justify-center">
              <Tag color="blue" icon={<SafetyCertificateOutlined />} className="px-3 py-1 text-xs font-semibold m-0">
                القوات الجوية • فرع المصايف والمنتجعات
              </Tag>
              <Tag color="cyan" className="px-3 py-1 text-xs font-semibold m-0">
                إصدار Ant Design 6.x المتطور
              </Tag>
            </Space>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight text-stone-900 dark:text-white">
              منظومة الحجوزات الفندقية والتسكين الذكي بمنتجع النسور
            </h1>

            <p className="text-sm md:text-base text-stone-600 dark:text-stone-400 leading-relaxed max-w-2xl mx-auto">
              إدارة متكاملة وشاملة لإشغال الوحدات، توزيع الأفواج الأسبوعية (جمعة إلى خميس)، منع تعارض التسكين آلياً، والتحصيل المالي اللحظي.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full max-w-md sm:max-w-none mx-auto">
            {auth?.user ? (
              <Link href="/reservations?date_preset=current_period" className="w-full sm:w-auto">
                <Button
                  type="primary"
                  size="large"
                  icon={<CalendarOutlined />}
                  className="w-full sm:w-auto bg-sky-600 hover:bg-sky-500 font-bold px-8 h-12 shadow-lg"
                >
                  استعراض الحجوزات النشطة
                  <ArrowLeftOutlined className="mr-1" />
                </Button>
              </Link>
            ) : (
              <Link href={login()} className="w-full sm:w-auto">
                <Button
                  type="primary"
                  size="large"
                  icon={<LoginOutlined />}
                  className="w-full sm:w-auto bg-sky-600 hover:bg-sky-500 font-bold px-8 h-12 shadow-lg"
                >
                  تسجيل الدخول للمنظومة
                  <ArrowLeftOutlined className="mr-1" />
                </Button>
              </Link>
            )}

            <Link href={auth?.user ? dashboard() : login()} className="w-full sm:w-auto">
              <Button
                size="large"
                icon={<AppstoreOutlined />}
                className="w-full sm:w-auto font-semibold px-6 h-12 border-stone-300 dark:border-stone-700"
              >
                مصفوفة القطاعات
              </Button>
            </Link>
          </div>

          {/* Feature Highlights Grid */}
          <Row gutter={[16, 16]} className="pt-8 text-right">
            <Col xs={24} md={8}>
              <Card
                className="h-full border border-stone-200 dark:border-stone-800 shadow-2xs rounded-xl bg-white dark:bg-stone-900"
                styles={{ body: { padding: 20 } }}
              >
                <div className="h-10 w-10 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center text-lg mb-3">
                  <ThunderboltOutlined />
                </div>
                <Text strong className="text-sm block mb-1">
                  منع التعارض بنسبة 100%
                </Text>
                <Text type="secondary" className="text-xs leading-relaxed block">
                  خوارزمية ذكية تتحقق فوراً من تداخل التواريخ وتوافر الغرف والشاليهات قبل اعتماد أي حجز.
                </Text>
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card
                className="h-full border border-stone-200 dark:border-stone-800 shadow-2xs rounded-xl bg-white dark:bg-stone-900"
                styles={{ body: { padding: 20 } }}
              >
                <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center text-lg mb-3">
                  <FileExcelOutlined />
                </div>
                <Text strong className="text-sm block mb-1">
                  استيراد كشوف الإكسيل
                </Text>
                <Text type="secondary" className="text-xs leading-relaxed block">
                  دعم مباشر لكشوفات فرع القوات الجوية واستخراج تواريخ الأفواج تلقائياً بدون إدخال يدوي مكرر.
                </Text>
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card
                className="h-full border border-stone-200 dark:border-stone-800 shadow-2xs rounded-xl bg-white dark:bg-stone-900"
                styles={{ body: { padding: 20 } }}
              >
                <div className="h-10 w-10 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center text-lg mb-3">
                  <CheckCircleOutlined />
                </div>
                <Text strong className="text-sm block mb-1">
                  التحصيل المالي والإنستاباي
                </Text>
                <Text type="secondary" className="text-xs leading-relaxed block">
                  تسجيل المدفوعات النقدية والإلكترونية وحساب المتبقي تلقائياً لكل نزيل مع إيصالات مرجعية.
                </Text>
              </Card>
            </Col>
          </Row>
        </main>

        {/* Footer */}
        <footer className="max-w-6xl mx-auto w-full py-4 text-center border-t border-stone-200 dark:border-stone-800 text-xs text-stone-500">
          جميع الحقوق محفوظة © {new Date().getFullYear()} منتجع النسور - منظومة إدارة الحجوزات الفندقية.
        </footer>
      </div>
    </>
  );
}
