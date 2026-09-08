export type ReservationStatus = 'تم التسكين' | 'انتظار' | 'ثابت' | 'غادر';
export type ReservationType = 'فرع' | 'ادارة' | 'منتجع';
export type MembershipType = 'عضو' | 'غير عضو' | 'مرافق' | 'مدني';
export type PaymentMethod = 'Cash' | 'visa' | 'instapay';
export type PaymentStatus = 'Fully Paid' | 'Partially Paid' | 'Unpaid';
export type ActiveView = 'table' | 'matrix' | 'meals';

export interface Guest {
  id: number;
  name: string;
  phone: string;
  mil_code?: string | null;
  reservations_count?: number;
  created_at: string;
  updated_at: string;
}

export interface PriceRule {
  id: number;
  name: string;
  type?: 'unit' | 'meal';
  rules: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface Sector {
  id: number;
  name: string;
  has_meals?: boolean;
  units_count?: number;
  units?: Unit[];
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: number;
  sector_id: number;
  price_rule_id?: number | null;
  name: string;
  rooms_count: number;
  sector?: Sector;
  price_rule?: PriceRule | null;
  current_reservation?: Reservation | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  reservation_id: number;
  amount: number;
  method: PaymentMethod;
  reference_number?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReservationExtraFee {
  id?: number;
  reservation_id?: number;
  description: string;
  amount: number;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface ReservationAttachment {
  id: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  url?: string;
  human_size?: string;
  is_image?: boolean;
  created_at?: string;
}

export interface Reservation {
  id: number;
  guest_id: number;
  unit_id: number;
  check_in: string; // YYYY-MM-DD
  check_out: string; // YYYY-MM-DD
  status: ReservationStatus;
  type: ReservationType;
  membership?: MembershipType | null;
  enter_from_gates?: boolean;
  has_meals?: boolean;
  meals_persons_count?: number | null;
  meals_start_date?: string | null;
  meals_end_date?: string | null;
  meals_rate_per_night?: number;
  meals_total_price?: number;
  meals_nights_count?: number;
  todays_meals_count?: number;
  extra_fees_total?: number;
  total_price: number;
  paid_amount: number;
  balance: number;
  nights_count?: number;
  payment_status: PaymentStatus;
  notes?: string | null;
  attachments?: ReservationAttachment[];
  guest?: Guest;
  unit?: Unit;
  payments?: Payment[];
  extra_fees?: ReservationExtraFee[];
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
  has_full_sector_access?: boolean;
  allowed_sector_ids?: number[] | null;
  editable_sector_ids?: number[] | null;
}

export interface SharedProps {
  auth: {
    user: AuthUser | null;
  };
  flash?: {
    success?: string;
    error?: string;
  };
  [key: string]: unknown;
}

export type DatePresetType =
  | 'all'
  | 'current_period'
  | 'next_period'
  | 'prev_period'
  | 'period'
  | 'custom'
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'future';

export interface DashboardFilterState {
  view: ActiveView;
  search: string;
  sector_id?: number | null;
  sector_ids?: number[];
  status?: ReservationStatus | null;
  statuses?: ReservationStatus[];
  payment_status: 'paid' | 'partial' | 'unpaid' | 'all' | null;
  date_preset?: DatePresetType | string | null;
  start_date?: string | null;
  end_date?: string | null;
}

export interface KPIStats {
  total: number;
  checked_in: number;
  waiting: number;
  confirmed: number;
  departed: number;
  total_expected_revenue: number;
  total_collected_revenue: number;
  total_outstanding_balance: number;
}

export type StatusCounts = Record<string, number>;

