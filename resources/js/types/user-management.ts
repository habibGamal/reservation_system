export interface AssignedSector {
    sector_id: number;
    sector_name: string;
    permission: 'view' | 'edit';
}

export interface ManagedUser {
    id: number;
    name: string;
    email: string;
    email_verified_at: string | null;
    roles: string[];
    direct_permissions: string[];
    all_permissions: string[];
    assigned_sectors: AssignedSector[];
    has_sector_restrictions: boolean;
    created_at: string | null;
    updated_at: string | null;
}

export interface RoleItem {
    id: number;
    name: string;
    is_system: boolean;
    users_count: number;
    permissions: string[];
}

export interface PermissionDefinition {
    id: number;
    name: string;
    label: string;
}

export interface PermissionGroup {
    key: string;
    label: string;
    icon: string;
    permissions: PermissionDefinition[];
}

export interface UserManagementStats {
    total_users: number;
    admin_users: number;
    receptionist_users: number;
    total_roles: number;
    total_permissions: number;
}

export interface UserManagementProps {
    users: ManagedUser[];
    roles: RoleItem[];
    permissionGroups: PermissionGroup[];
    allPermissions: string[];
    stats: UserManagementStats;
    allSectors: { id: number; name: string }[];
    filters: {
        search: string;
        role: string;
    };
}

