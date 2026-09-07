# API Contracts: Reservations & Accommodation Management

**Feature**: `001-resort-reservation-system`  
**Protocol**: Inertia.js HTTP Endpoints (Session Auth + CSRF)  

---

## 1. Endpoints Overview

| Method | URI | Action / Controller | Required Permission | Description |
|---|---|---|---|---|
| `GET` | `/reservations` | `ReservationController@index` | `reservations.view` | Main multi-view dashboard with filters & stats |
| `POST` | `/reservations` | `ReservationController@store` | `reservations.create` | Create new reservation with conflict validation |
| `PUT` | `/reservations/{id}` | `ReservationController@update` | `reservations.edit` | Update reservation details |
| `PATCH` | `/reservations/{id}/status` | `ReservationController@updateStatus` | `reservations.update_status` | Inline quick status update |
| `DELETE` | `/reservations/{id}` | `ReservationController@destroy` | `reservations.delete` | Delete reservation |
| `POST` | `/reservations/calculate-price` | `ReservationPriceController@calculate` | `reservations.view` | Dynamic rate preview endpoint |
| `GET` | `/reservations/export` | `ReservationExportController@export` | `reports.export` | Export filtered reservations to Excel/CSV |
| `POST` | `/reservations/import` | `ReservationImportController@import` | `excel.import` | Batch import reservations via spreadsheet |

---

## 2. Request & Response Payloads

### 2.1 `GET /reservations` (Inertia Render)
**Query Parameters**:
- `view`: `'table' | 'cards' | 'matrix' | 'timeline'` (default: `'table'`)
- `search`: `string` (searches guest name, phone, military code, unit name)
- `sector_id`: `number` (optional sector filter)
- `status`: `'تم التسكين' | 'انتظار' | 'ثابت' | 'غادر'`
- `payment_status`: `'paid' | 'partial' | 'unpaid'`
- `date_preset`: `'today' | 'this_week' | 'this_month' | 'future' | 'custom'`
- `start_date`: `YYYY-MM-DD`
- `end_date`: `YYYY-MM-DD`
- `page`: `number`

**Inertia Page Props (`Reservations/Index`)**:
```typescript
interface ReservationsIndexProps {
  reservations: {
    data: Reservation[];
    links: PaginationLink[];
    meta: PaginationMeta;
  };
  sectors: Sector[];
  stats: {
    total: number;
    checked_in: number;
    waiting: number;
    confirmed: number;
    departed: number;
    total_expected_revenue: number;
    total_collected_revenue: number;
    total_outstanding_balance: number;
  };
  filters: {
    view: 'table' | 'cards' | 'matrix' | 'timeline';
    search?: string;
    sector_id?: number;
    status?: string;
    payment_status?: string;
    date_preset?: string;
    start_date?: string;
    end_date?: string;
  };
}
```

---

### 2.2 `POST /reservations` (Create Reservation)
**Payload**:
```json
{
  "guest_id": 142,
  "unit_id": 12,
  "check_in": "2026-10-01",
  "check_out": "2026-10-05",
  "status": "ثابت",
  "type": "فرع",
  "membership": "عضو",
  "total_price": 1800.00,
  "notes": "حجز عائلي دور أرضي",
  "initial_payment": {
    "amount": 500.00,
    "method": "Cash"
  }
}
```

**Success Response**: Redirect to `/reservations` with flash message:
```json
{
  "flash": {
    "success": "تم تسجيل وتأكيد الحجز بنجاح"
  }
}
```

**Conflict Error Response (HTTP 422)**:
```json
{
  "message": "الوحدة السكنية محجوزة بالفعل خلال هذه الفترة.",
  "errors": {
    "unit_id": [
      "الوحدة '101' محجوزة بالفعل من قبل النزيل 'محمود السيد' من 2026-10-02 إلى 2026-10-06."
    ]
  }
}
```

---

### 2.3 `POST /reservations/calculate-price`
**Payload**:
```json
{
  "unit_id": 12,
  "membership": "عضو",
  "check_in": "2026-10-01",
  "check_out": "2026-10-05"
}
```

**Response (JSON)**:
```json
{
  "nights": 4,
  "rate_per_night": 450.00,
  "total_price": 1800.00,
  "price_rule_name": "تسعير شاليهات لوسيال صيف 2026"
}
```

---

### 2.4 `PATCH /reservations/{id}/status`
**Payload**:
```json
{
  "status": "تم التسكين"
}
```

**Success Response**: Inertia redirect with updated reservation state.

