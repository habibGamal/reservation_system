import { Form, Head } from '@inertiajs/react';
import { Button, Input, Typography } from 'antd';
import { LockOutlined, MailOutlined, UserAddOutlined, UserOutlined } from '@ant-design/icons';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { login } from '@/routes';
import { store } from '@/routes/register';

const { Text } = Typography;

type Props = {
  passwordRules: string;
};

export default function Register({ passwordRules }: Props) {
  return (
    <>
      <Head title="إنشاء حساب - منتجع النسور" />
      <Form
        {...store.form()}
        resetOnSuccess={['password', 'password_confirmation']}
        disableWhileProcessing
        className="flex flex-col gap-4 text-right"
        dir="rtl"
      >
        {({ processing, errors }) => (
          <div className="space-y-3.5">
            <div>
              <label htmlFor="name" className="block text-xs font-semibold mb-1.5 text-stone-700 dark:text-stone-300">
                الاسم الكامل
              </label>
              <Input
                id="name"
                type="text"
                name="name"
                required
                autoFocus
                tabIndex={1}
                autoComplete="name"
                placeholder="الاسم الثلاثي أو الرباعي"
                prefix={<UserOutlined className="text-stone-400" />}
                status={errors.name ? 'error' : undefined}
                className="w-full"
              />
              <InputError message={errors.name} className="mt-1" />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold mb-1.5 text-stone-700 dark:text-stone-300">
                البريد الإلكتروني
              </label>
              <Input
                id="email"
                type="email"
                name="email"
                required
                tabIndex={2}
                autoComplete="email"
                placeholder="email@example.com"
                prefix={<MailOutlined className="text-stone-400" />}
                status={errors.email ? 'error' : undefined}
                className="w-full text-left"
                dir="ltr"
              />
              <InputError message={errors.email} className="mt-1" />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold mb-1.5 text-stone-700 dark:text-stone-300">
                كلمة المرور
              </label>
              <Input.Password
                id="password"
                name="password"
                required
                tabIndex={3}
                autoComplete="new-password"
                placeholder="كلمة مرور قوية"
                prefix={<LockOutlined className="text-stone-400" />}
                status={errors.password ? 'error' : undefined}
                className="w-full text-left"
                dir="ltr"
              />
              <InputError message={errors.password} className="mt-1" />
            </div>

            <div>
              <label htmlFor="password_confirmation" className="block text-xs font-semibold mb-1.5 text-stone-700 dark:text-stone-300">
                تأكيد كلمة المرور
              </label>
              <Input.Password
                id="password_confirmation"
                name="password_confirmation"
                required
                tabIndex={4}
                autoComplete="new-password"
                placeholder="أعد إدخال كلمة المرور"
                prefix={<LockOutlined className="text-stone-400" />}
                status={errors.password_confirmation ? 'error' : undefined}
                className="w-full text-left"
                dir="ltr"
              />
              <InputError message={errors.password_confirmation} className="mt-1" />
            </div>

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={processing}
              tabIndex={5}
              icon={<UserAddOutlined />}
              data-test="register-user-button"
              className="mt-2 font-bold bg-sky-600 hover:bg-sky-500"
            >
              إنشاء الحساب
            </Button>

            <div className="text-stone-500 text-center text-xs pt-2 border-t border-stone-200 dark:border-stone-800">
              لديك حساب بالفعل؟{' '}
              <TextLink href={login()} tabIndex={6} className="font-semibold text-sky-600">
                تسجيل الدخول
              </TextLink>
            </div>
          </div>
        )}
      </Form>
    </>
  );
}

Register.layout = {
  title: 'إنشاء حساب مستخدم جديد',
  description: 'قم بإدخال بياناتك لإنشاء حساب في نظام منتجع النسور',
};
