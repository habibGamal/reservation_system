# Implementation Plan: Eagles Resort Reservation Management System

**Branch**: `001-resort-reservation-system` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-resort-reservation-system/spec.md`  

---

## Summary

Build and integrate the end-to-end Eagles Resort Reservation Management System to replace error-prone spreadsheet tracking with a robust relational database (MySQL), conflict prevention engine, dynamic membership-based pricing, multi-payment installment ledger, and a high-performance 4-view operational dashboard (Table, Cards, Sector Matrix, Timeline) built with Laravel 13, Inertia.js v3, React 19, Tailwind CSS v4, and RTL-optimized shadcn/ui.

---

## Technical Context

**Language/Version**: PHP 8.3+ (backend) & TypeScript 5.7+ / React 19 (frontend)  
**Primary Dependencies**:
- Backend: Laravel 13.x, `inertiajs/inertia-laravel` v3, `spatie/laravel-permission`, `phpoffice/phpspreadsheet` (or `maatwebsite/excel`), `spatie/laravel-activitylog`, `laravel/wayfinder`
- Frontend: `@inertiajs/react` v3, Tailwind CSS v4, shadcn/ui (`@radix-ui`), `@tanstack/react-table`, `lucide-react`, `date-fns`  
**Storage**: MySQL 8.x (InnoDB engine with compound indexing, `utf8mb4_unicode_ci` charset)  
**Testing**: PHPUnit 12.x (`php artisan test --compact`) with feature tests for conflict detection, payment ledger, pricing calculations, and RBAC policies  
**Target Platform**: Modern desktop browsers & tablet devices (iPad/Android) with native Right-to-Left (RTL) Arabic layout  
**Project Type**: Monolithic Single Page Application via Laravel + Inertia.js v3 + React  
**Performance Goals**:
- Initial page load < 1.0s
- Inertia partial reload response time < 200ms
- Real-time conflict detection feedback < 500ms  
**Constraints**:
- Exactly 0% double-booking occurrence
- Strict ACID transaction wrapping on all reservation & payment mutations
- Enums represented as strings in MySQL, PHP Backed Enums, and TypeScript string literals
- Complete Arabic language localization and RTL directionality (`dir="rtl"`)  
**Scale/Scope**:
- 12 predefined resort sectors (Le Ciel, Old Villa, New Villa, Hotels 1-6, Distinguished, Duplex, Other)
- Scalable to hundreds of units and tens of thousands of historical reservation and payment records

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

- [x] **Relational Integrity & ACID Transactions**: All multi-step mutations (reservation creation with initial payment, payment deletion, spreadsheet batch imports) are wrapped in `DB::transaction()`.
- [x] **Application Enums Rule**: All enum definitions live in `App\Enums` as PHP string Backed Enums and TypeScript union types; database columns are standard `VARCHAR` strings without MySQL `ALTER TABLE ENUM` constraints.
- [x] **Boundary Security & Strict RBAC**: Dual-layer security model where permissions are shared for UI conditional rendering, and strictly enforced on the server via FormRequests, Spatie Middleware, and Policies.
- [x] **Test-Driven Reliability**: Key critical workflows (conflict logic, pricing formula, multi-payment calculations, role gates) have automated feature tests.
- [x] **Style & Formatting Compliance**: Code complies with Laravel conventions and will be formatted with `vendor/bin/pint --dirty --format agent`.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-resort-reservation-system/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output: conflict math, pricing architecture, RBAC, multi-view UI
├── data-model.md        # Phase 1 output: MySQL schemas, relationships, enums, lifecycle
├── quickstart.md        # Phase 1 output: setup, migration, test runner, and verification steps
├── contracts/           # Phase 1 output: interface contracts
│   ├── reservations-api.md
│   ├── payments-api.md
│   └── ui-contracts.md
└── checklists/
    └── requirements.md  # Requirements quality validation checklist
```

### Source Code (repository root)

```text
app/
├── Enums/
│   ├── MembershipType.php
│   ├── PaymentMethod.php
│   ├── ReservationStatus.php
│   └── ReservationType.php
├── Http/
│   ├── Controllers/
│   │   ├── ReservationController.php
│   │   ├── ReservationPriceController.php
│   │   ├── ReservationExportController.php
│   │   ├── ReservationImportController.php
│   │   ├── PaymentController.php
│   │   ├── GuestController.php
│   │   └── UnitController.php
│   ├── Middleware/
│   │   └── HandleInertiaRequests.php
│   └── Requests/
│       ├── StoreReservationRequest.php
│       ├── UpdateReservationRequest.php
│       └── StorePaymentRequest.php
├── Models/
│   ├── Guest.php
│   ├── Sector.php
│   ├── Unit.php
│   ├── PriceRule.php
│   ├── Reservation.php
│   └── Payment.php
├── Policies/
│   ├── ReservationPolicy.php
│   └── PaymentPolicy.php
└── Services/
    ├── AvailabilityService.php
    ├── PricingService.php
    └── ExcelReservationService.php

database/
├── migrations/
│   ├── 2026_09_05_000001_create_guests_table.php
│   ├── 2026_09_05_000002_create_sectors_table.php
│   ├── 2026_09_05_000003_create_price_rules_table.php
│   ├── 2026_09_05_000004_create_units_table.php
│   ├── 2026_09_05_000005_create_reservations_table.php
│   └── 2026_09_05_000006_create_payments_table.php
└── seeders/
    ├── DatabaseSeeder.php
    ├── RoleAndPermissionSeeder.php
    ├── SectorAndUnitSeeder.php
    └── PriceRuleSeeder.php

resources/js/
├── components/
│   ├── reservations/
│   │   ├── reservation-table-view.tsx
│   │   ├── reservation-cards-view.tsx
│   │   ├── sector-matrix-view.tsx
│   │   ├── timeline-calendar-view.tsx
│   │   ├── reservation-form-dialog.tsx
│   │   ├── payment-dialog.tsx
│   │   ├── guest-combobox.tsx
│   │   ├── kpi-dashboard.tsx
│   │   ├── printable-voucher.tsx
│   │   └── excel-import-dialog.tsx
│   └── ui/
├── pages/
│   └── reservations/
│       └── index.tsx
└── types/
    └── reservation.ts

tests/
└── Feature/
    ├── ReservationConflictTest.php
    ├── PaymentTrackingTest.php
    ├── PricingServiceTest.php
    └── ReservationPermissionTest.php
```

**Structure Decision**: Monolithic Laravel + Inertia React architecture following domain-oriented directory grouping within standard Laravel conventions.

---

## Complexity Tracking

| Mechanism | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Dynamic `PriceRule` JSON rates | Resort charges different rates depending on 4 military/civilian membership classes; rates change seasonally | Hardcoded pricing or column-heavy tables fail when new unit tiers are added |
| Compound DB Index `(unit_id, status, check_in, check_out)` | Immediate conflict checking across thousands of historical bookings in sub-millisecond time | Table scanning without compound index leads to query degradation as reservations scale |
| 4-Way Multi-View UI | Operational staff need high-speed data tables, while floor managers need spatial sector cards & timeline overviews | A single view fails to satisfy both cashier transaction speed and supervisory capacity planning |
