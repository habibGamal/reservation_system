# Research & Technical Decisions: Eagles Resort Reservation Management System

**Feature**: `001-resort-reservation-system`  
**Date**: 2026-09-04  
**Status**: Completed  

---

## 1. Conflict Detection Engine & Concurrency Control

### Context
A primary requirement of the system is the complete elimination of double bookings across all resort units while seamlessly permitting same-day checkout turnover (a departing guest leaves at 12:00 PM and an arriving guest checks in at 2:00 PM).

### Decision
Implement server-side conflict detection in an `AvailabilityService` and custom Laravel validation rule (`NoReservationConflictRule`), backed by a compound database index on `reservations(unit_id, status, check_in, check_out)`:

$$\text{Overlap} \iff (\text{new\_check\_in} < \text{existing\_check\_out}) \land (\text{new\_check\_out} > \text{existing\_check\_in})$$

Exclude departed and cancelled records (`status != 'غادر'`). For concurrent reservation submissions, encapsulate reservation creation inside a `DB::transaction()` with pessimistic row-level locking (`lockForUpdate` on the unit or active reservations query) to guarantee atomicity.

### Rationale
- The standard mathematical inequality ensures that adjacent dates ($check\_out = check\_in$) evaluate to false (no overlap), perfectly mirroring hotel check-in/check-out turnover windows.
- Executing validation at both the FormRequest layer and inside database transactions prevents race conditions when two receptionists attempt to book the same room simultaneously.

### Alternatives Considered
- *Dedicated Daily Calendar/Inventory Table*: Maintaining an individual row per unit per calendar day. Rejected due to unnecessary schema bloat (thousands of daily rows per year), complex date range synchronization, and risk of state drift.
- *Client-side Only Validation*: Rejected because concurrent network requests from different browsers would bypass frontend checks and cause double-bookings.

---

## 2. Dynamic Pricing & Membership Rate Calculation

### Context
Lodging rates vary by resort unit and the guest's military/civilian membership category:
- `عضو` (Member)
- `غير عضو` (Non-Member)
- `مرافق` (Companion)
- `مدني` (Civilian)

Authorized supervisors need the capability to apply manual price overrides with recorded justification.

### Decision
Create a `price_rules` table where rates are stored in a structured JSON column (`rules`), e.g.:
```json
{
  "عضو": 450.00,
  "غير عضو": 750.00,
  "مرافق": 600.00,
  "مدني": 900.00
}
```
Each `Unit` belongs to a `PriceRule`. A dedicated `PricingService` calculates:
$$\text{Total Price} = (\text{check\_out} - \text{check\_in}) \times \text{rules}[\text{membership}]$$

The computed price is populated into the form payload automatically. When a user with the `reservations.override_price` permission modifies `total_price`, the backend records the override and notes the variance in the reservation's audit log.

### Rationale
- Storing rates in JSON allows flexible addition or modification of membership tiers without modifying table structures.
- Decoupling price rules from units enables multiple units (e.g. all Hotel 1 standard rooms) to share a single rule, simplifying seasonal rate updates.

### Alternatives Considered
- *Separate price_rule_items table*: Rejected as overkill for a fixed set of four membership tiers; JSON field provides optimal read performance without extra table joins.
- *Hardcoded rates in code/enums*: Rejected because front desk administration needs to modify seasonal rates through an admin UI without code deployments.

---

## 3. Multi-Payment Architecture & Balance Integrity

### Context
Reservations often involve multiple payments across different channels: Cash at reception, POS credit cards (Visa), or instant mobile bank transfers (InstaPay). Balance and payment status must always be 100% accurate.

### Decision
Maintain a separate `payments` table referencing `reservation_id` (`cascade on delete`). Each record stores `amount`, `method` (`Cash`, `visa`, `instapay`), and timestamps. In the `Reservation` model:
- `paid_amount` accessor: `payments->sum('amount')`
- `balance` accessor: `max(0, total_price - paid_amount)`
- `payment_status` accessor:
  - `Fully Paid` when `paid_amount >= total_price`
  - `Partially Paid` when `paid_amount > 0` and `paid_amount < total_price`
  - `Unpaid` when `paid_amount == 0`

All payment creations, updates, or deletions are wrapped in `DB::transaction()` to ensure atomicity.

### Rationale
- Transactional ledger pattern prevents drift between recorded payments and reservation balances.
- Supports comprehensive payment receipts and audit histories for daily cashier reconciliation.

### Alternatives Considered
- *Single payment field on reservations table*: Rejected because it cannot track partial payments, installment history, or split payment methods (e.g., part Cash, part InstaPay).

---

## 4. Role-Based Access Control (RBAC) with Spatie & Inertia

### Context
The resort requires distinct access levels for Super Admins, Admins (Front Desk Supervisors), Receptionists (Staff), and Auditors (Viewers).

### Decision
Use `spatie/laravel-permission` to configure four primary roles and fourteen permissions:
- **Roles**: `Super Admin`, `Admin`, `Receptionist`, `Viewer`
- **Permissions**: `reservations.view`, `reservations.create`, `reservations.edit`, `reservations.update_status`, `reservations.delete`, `reservations.override_price`, `payments.create`, `payments.delete`, `guests.manage`, `units.manage`, `price_rules.manage`, `excel.import`, `reports.export`, `users.manage`, `activity_logs.view`.

In `HandleInertiaRequests.php`, share the current user's role and permission array to the frontend under `auth.user.roles` and `auth.user.permissions`. On the frontend, provide a `<Can />` wrapper component or `usePermission()` hook for conditional UI rendering. On the backend, enforce permissions with Laravel Policies and Middleware on all routes and controller actions.

### Rationale
- Defense-in-depth: frontend hides unauthorized UI controls for clean user experience; backend policies strictly block unauthorized API / form submissions regardless of client state.

---

## 5. Multi-View Architecture (Table, Cards, Sector Matrix, Timeline)

### Context
Front desk staff need dense data tables for high-volume check-ins, while management needs spatial and timeline views for occupancy overview.

### Decision
A single Inertia page component `Reservations/Index.tsx` supports 4 tabbed view modes:
1. **High-Density Table**: `@tanstack/react-table` + shadcn/ui Table with sorting, filtering, and expandable payment rows.
2. **Interactive Cards**: Responsive grid of cards highlighting guest details, balance badges, and WhatsApp/Call quick actions.
3. **Sector Matrix**: Accordion/grid grouped by resort sector (`Le Ciel`, `Old Villa`, `New Villa`, `Hotels 1-6`, `Distinguished`, `Duplex`), color-coded by unit status, with one-click instant booking for vacant units.
4. **Timeline Calendar**: Horizontal day-by-day Gantt/calendar visualization showing reservation bars per unit with highlighted conflict checks.

State (view type, search, sector filter, date presets, payment status) is synchronized via URL query parameters, utilizing Inertia partial reloads (`only: ['reservations', 'stats']`) to update views without full-page re-renders.

### Rationale
- Unified state ensures that switching views maintains current filter parameters (e.g., viewing only "Hotel 6" across both Table and Timeline).
- Inertia partial reloads provide instant responses under 200ms without GraphQL or separate API overhead.

---

## 6. Server-Side Excel Import/Export with Arabic UTF-8 BOM

### Context
Spreadsheets exchanged with administrative headquarters contain Arabic text. Opening standard UTF-8 CSVs in Excel on Windows often results in garbled text (mojibake).

### Decision
Implement server-side export and import using `phpoffice/phpspreadsheet` (or `maatwebsite/excel`):
- Exports output native `.xlsx` files or UTF-8 CSVs with the `\xEF\xBB\xBF` Byte Order Mark (BOM).
- Batch imports are executed inside a database transaction (`DB::beginTransaction()`). Each row is pre-validated against conflict and foreign key checks before insertion. If fatal errors occur, the transaction rolls back and returns a detailed row-by-row error report.

### Rationale
- Native `.xlsx` or BOM-prefixed files guarantee 100% Arabic text fidelity in Microsoft Excel across all operating systems.
- Transactional import protects database integrity from partial corrupt imports.

