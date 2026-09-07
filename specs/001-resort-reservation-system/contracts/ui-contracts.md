# Frontend UI Contracts & Inertia Shared State

**Feature**: `001-resort-reservation-system`  
**Language**: TypeScript 5.x / React 19  

---

## 1. Domain Types (`resources/js/types/reservation.ts`)

```typescript
export type ReservationStatus = 'تم التسكين' | 'انتظار' | 'ثابت' | 'غادر';
export type ReservationType = 'فرع' | 'ادارة' | 'منتجع';
export type MembershipType = 'عضو' | 'غير عضو' | 'مرافق' | 'مدني';
export type PaymentMethod = 'Cash' | 'visa' | 'instapay';
export type PaymentStatus = 'Fully Paid' | 'Partially Paid' | 'Unpaid';
export type ActiveView = 'table' | 'cards' | 'matrix' | 'timeline';

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
  rules: Record<MembershipType, number>;
  created_at: string;
  updated_at: string;
}

export interface Sector {
  id: number;
  name: string;
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

export interface Reservation {
  id: number;
  guest_id: number;
  unit_id: number;
  check_in: string; // YYYY-MM-DD
  check_out: string; // YYYY-MM-DD
  status: ReservationStatus;
  type: ReservationType;
  membership: MembershipType;
  total_price: number;
  paid_amount: number;
  balance: number;
  payment_status: PaymentStatus;
  notes?: string | null;
  guest?: Guest;
  unit?: Unit;
  payments?: Payment[];
  created_at: string;
  updated_at: string;
}
```

---

## 2. Inertia Shared Auth Contract (`HandleInertiaRequests`)

```typescript
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  roles: string[]; // e.g. ['Super Admin'] or ['Receptionist']
  permissions: string[]; // e.g. ['reservations.create', 'reservations.override_price']
}

export interface SharedProps {
  auth: {
    user: AuthUser | null;
  };
  flash?: {
    success?: string;
    error?: string;
  };
}
```

---

## 3. UI Multi-View State Contract

```typescript
export interface DashboardFilterState {
  view: ActiveView;
  search: string;
  sector_id: number | null;
  status: ReservationStatus | null;
  payment_status: 'paid' | 'partial' | 'unpaid' | null;
  date_preset: 'today' | 'this_week' | 'this_month' | 'future' | 'custom';
  start_date?: string;
  end_date?: string;
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
```

