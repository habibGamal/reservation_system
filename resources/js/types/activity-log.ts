export type ActivityEventType = 'created' | 'updated' | 'deleted';

export type ActivitySubjectType =
    | 'reservation'
    | 'payment'
    | 'unit'
    | 'sector'
    | 'user'
    | 'guest'
    | 'unknown';

export interface ActivityCauser {
    id: number | null;
    name: string;
    email: string | null;
    role: string;
}

export interface ActivitySubject {
    type: ActivitySubjectType;
    type_label: string;
    id: number | null;
    title: string;
    subtitle?: string | null;
    unit_name?: string | null;
    sector_name?: string | null;
    guest_name?: string | null;
    guest_phone?: string | null;
    status?: string | null;
}

export interface ActivityChange {
    field: string;
    field_label: string;
    old: unknown;
    new: unknown;
    old_label: string;
    new_label: string;
}

export interface ActivityLogItem {
    id: number;
    log_name: string;
    event: ActivityEventType | string;
    description: string;
    headline: string;
    created_at: string;
    created_at_human: string;
    created_at_formatted: string;
    causer: ActivityCauser;
    subject: ActivitySubject;
    changes: ActivityChange[];
    raw_changes?: unknown;
    raw_properties?: unknown;
}

export interface ActivityStats {
    total_count: number;
    today_count: number;
    active_users_count: number;
    events_breakdown: {
        created: number;
        updated: number;
        deleted: number;
    };
}

export interface ActivityFilterUser {
    id: number;
    name: string;
    email: string;
}

export interface ActivityFilterSector {
    id: number;
    name: string;
}

export interface ActivityFilterUnit {
    id: number;
    name: string;
    sector_id: number;
}

export interface ActivityFilterOptions {
    users: ActivityFilterUser[];
    sectors: ActivityFilterSector[];
    units: ActivityFilterUnit[];
}

export interface ActivityFilterState {
    search: string;
    user_id: number | null;
    sector_id: number | null;
    unit_id: number | null;
    event: string;
    subject_type: string;
    start_date: string;
    end_date: string;
    per_page: number;
}

export interface PaginatedActivities {
    data: ActivityLogItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

export interface ActivityLogPageProps {
    activities: PaginatedActivities;
    filters: ActivityFilterState;
    stats: ActivityStats;
    filterOptions: ActivityFilterOptions;
}
