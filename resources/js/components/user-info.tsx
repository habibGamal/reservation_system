import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import type { User } from '@/types';

export function UserInfo({
    user,
    showEmail = false,
}: {
    user: User;
    showEmail?: boolean;
}) {
    const getInitials = useInitials();

    return (
        <div className="flex items-center gap-2.5 w-full text-right" dir="rtl">
            <Avatar className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-[#053f89]/20 dark:border-sky-700/30 shadow-2xs ring-2 ring-[#053f89]/10">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-xl bg-gradient-to-tr from-[#053f89] to-[#0284c7] text-white font-bold text-xs">
                    {getInitials(user.name)}
                </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-right text-sm leading-tight min-w-0">
                <span className="truncate font-bold text-foreground">{user.name}</span>
                {showEmail && (
                    <span className="text-muted-foreground truncate text-xs font-sans">
                        {user.email}
                    </span>
                )}
            </div>
        </div>
    );
}
