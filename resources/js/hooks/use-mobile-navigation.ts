import { useCallback, useContext } from 'react';
import { SidebarContext } from '@/components/ui/sidebar';

export type CleanupFn = () => void;

export function useMobileNavigation(): CleanupFn {
    const sidebar = useContext(SidebarContext);

    return useCallback(() => {
        sidebar?.setOpenMobile(false);
        // Remove pointer-events style from body...
        document.body.style.removeProperty('pointer-events');
    }, [sidebar]);
}
