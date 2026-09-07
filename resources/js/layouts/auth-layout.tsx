import AuthLayoutTemplate from '@/layouts/auth/auth-resort-layout';

export default function AuthLayout({
    title,
    description,
    children,
}: {
    title?: string;
    description?: string;
    children: React.ReactNode;
}) {
    const pageLayout = (children as any)?.type?.layout;
    const resolvedTitle = title ?? pageLayout?.title ?? '';
    const resolvedDescription = description ?? pageLayout?.description ?? '';

    return (
        <AuthLayoutTemplate title={resolvedTitle} description={resolvedDescription}>
            {children}
        </AuthLayoutTemplate>
    );
}
