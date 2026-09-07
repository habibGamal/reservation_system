# Tasks: Eagles Resort Reservation Management System

**Feature**: `001-resort-reservation-system`  
**Date**: 2026-09-04  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)  

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, packages installation, enums, and frontend foundations

- [X] T001 Install Spatie permissions, Excel spreadsheet library, and frontend dependencies in `composer.json` and `package.json`
- [X] T002 [P] Create application enum classes in `app/Enums/ReservationStatus.php`, `app/Enums/ReservationType.php`, `app/Enums/MembershipType.php`, and `app/Enums/PaymentMethod.php`
- [X] T003 [P] Create frontend TypeScript domain type definitions in `resources/js/types/reservation.ts`
- [X] T004 [P] Configure RTL direction provider, right-side AppSidebar layout (`side="right"`), and Arabic typography styles in `resources/js/app.tsx`, `resources/js/components/app-sidebar.tsx`, `resources/js/components/ui/sidebar.tsx`, and `resources/css/app.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, core Eloquent models, seeders, and Inertia shared authorization state

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Create database migrations for sectors, price_rules, units (with `rooms_count`), guests, reservations, and payments in `database/migrations/`
- [X] T006 [P] Create Eloquent models with relationships, casts, and accessors in `app/Models/Guest.php`, `app/Models/Sector.php`, `app/Models/Unit.php`, `app/Models/PriceRule.php`, `app/Models/Reservation.php`, and `app/Models/Payment.php`
- [X] T007 [P] Create database seeders for sectors and 259 resort units self-generated with rooms count, standard price rules, and initial users in `database/seeders/SectorAndUnitSeeder.php`, `database/seeders/PriceRuleSeeder.php`, and `database/seeders/DatabaseSeeder.php`
- [X] T008 [P] Configure Spatie permissions sharing and flash notification state in `app/Http/Middleware/HandleInertiaRequests.php`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Front Desk Reservation Booking & Conflict Prevention (Priority: P1) 🎯 MVP

**Goal**: Allow front desk receptionists to book units for guests across date ranges with instant automated conflict detection preventing double-bookings and supporting same-day checkout turnover.

**Independent Test**: Book a unit for Date A to Date B; verify successful creation. Attempt an overlapping booking for Date A+1 to Date B+1 and verify rejection with a conflict error. Book on Date B to Date C and verify same-day turnover acceptance.

### Tests for User Story 1
- [X] T009 [P] [US1] Write automated feature tests for reservation booking and conflict prevention in `tests/Feature/ReservationConflictTest.php`

### Implementation for User Story 1
- [X] T010 [US1] Implement conflict detection query engine in `app/Services/AvailabilityService.php`
- [X] T011 [US1] Implement reservation validation requests with conflict check in `app/Http/Requests/StoreReservationRequest.php` and `app/Http/Requests/UpdateReservationRequest.php`
- [X] T012 [US1] Implement reservation management controller actions in `app/Http/Controllers/ReservationController.php`
- [X] T013 [P] [US1] Create reservation booking dialog with real-time date conflict warnings in `resources/js/components/reservations/reservation-form-dialog.tsx`
- [X] T014 [US1] Connect reservation booking form to backend routes in `resources/js/pages/reservations/index.tsx`

**Checkpoint**: At this point, User Story 1 is fully functional and delivers the core MVP booking workflow.

---

## Phase 4: User Story 2 - Multi-Payment Tracking & Balance Reconciliation (Priority: P1)

**Goal**: Allow front desk staff to record multiple installment payments (Cash, Visa, InstaPay) per reservation with automatic recalculation of paid amount, remaining balance, and payment status badges.

**Independent Test**: Create a 3,000 EGP reservation, record a 1,000 EGP cash payment, verify status updates to "Partially Paid" with 2,000 EGP balance. Record a 2,000 EGP InstaPay payment, verify status updates to "Fully Paid" with 0 EGP balance.

### Tests for User Story 2
- [X] T015 [P] [US2] Write automated feature tests for multi-payment recording and balance reconciliation in `tests/Feature/PaymentTrackingTest.php`

### Implementation for User Story 2
- [X] T016 [US2] Implement payment validation request in `app/Http/Requests/StorePaymentRequest.php`
- [X] T017 [US2] Implement payment controller with transactional balance reconciliation in `app/Http/Controllers/PaymentController.php`
- [X] T018 [P] [US2] Create payment recording dialog supporting Cash, Visa, and InstaPay in `resources/js/components/reservations/payment-dialog.tsx`
- [X] T019 [P] [US2] Create payment status badges and expandable payment history rows in `resources/js/components/reservations/reservation-table-view.tsx`
- [X] T020 [US2] Integrate payment dialog and balance refresh into `resources/js/pages/reservations/index.tsx`

**Checkpoint**: User Stories 1 and 2 are functional, providing complete booking and accounting operations.

---

## Phase 5: User Story 3 - Dynamic Membership-Based Pricing & Authorized Overrides (Priority: P2)

**Goal**: Automatically compute booking total based on unit price rule, membership category (Member, Non-Member, Companion, Civilian), and nights count, while allowing authorized supervisors to override total price with audit justification.

**Independent Test**: Select unit and Member tier, verify auto-calculated total. Switch to Non-Member tier, verify recalculation. Verify staff cannot edit price field, while admin can override with recorded justification.

### Tests for User Story 3
- [X] T021 [P] [US3] Write automated feature tests for dynamic pricing calculation and supervisor overrides in `tests/Feature/PricingServiceTest.php`

### Implementation for User Story 3
- [X] T022 [US3] Implement dynamic rate computation service in `app/Services/PricingService.php`
- [X] T023 [US3] Implement pricing calculation preview controller in `app/Http/Controllers/ReservationPriceController.php`
- [X] T024 [P] [US3] Implement unit and price rule administration controllers in `app/Http/Controllers/UnitController.php` and `app/Http/Controllers/PriceRuleController.php`
- [X] T025 [US3] Integrate automated pricing calculation preview and permission-guarded price override inputs into `resources/js/components/reservations/reservation-form-dialog.tsx`

**Checkpoint**: Dynamic pricing policies and authorized overrides are enforced.

---

## Phase 6: User Story 4 - Multi-Perspective Operations Monitoring (Priority: P2)

**Goal**: Provide 4 high-performance view modes (High-Density Table, Responsive Cards, Compact Sector Matrix, Timeline Calendar) alongside a live KPI dashboard.

**Independent Test**: Toggle between all 4 views; verify sorting and filtering in Table view, color-coded occupancy in Sector Matrix, one-click booking on vacant units, and horizontal bars in Timeline Calendar without page reloads.

### Tests for User Story 4
- [X] T026 [P] [US4] Write automated feature tests for KPI calculations and multi-view query filtering in `tests/Feature/ReservationDashboardTest.php`

### Implementation for User Story 4
- [X] T027 [P] [US4] Create live KPI dashboard cards (Checked-In, Waiting, Confirmed, Departed) in `resources/js/components/reservations/kpi-dashboard.tsx`
- [X] T028 [P] [US4] Create responsive reservation cards view in `resources/js/components/reservations/reservation-cards-view.tsx`
- [X] T029 [P] [US4] Create compact sector matrix view with color-coded unit availability in `resources/js/components/reservations/sector-matrix-view.tsx`
- [X] T030 [P] [US4] Create timeline occupancy calendar view with date grid in `resources/js/components/reservations/timeline-calendar-view.tsx`
- [X] T031 [US4] Integrate 4-view switcher, search inputs, sector toggles, and date presets in `resources/js/pages/reservations/index.tsx`

**Checkpoint**: Operational staff and management can monitor resort status across all 4 visual perspectives.

---

## Phase 7: User Story 5 - Guest Profile Management & Fast Identification Lookup (Priority: P3)

**Goal**: Allow front desk to rapidly search guests by name, phone, or military code, inspect booking history, and create new guests inline during reservation creation.

**Independent Test**: Search guest by partial military code or phone, verify matching suggestion. Enter new phone, create guest inline, and confirm attachment to active booking.

### Tests for User Story 5
- [X] T032 [P] [US5] Write automated feature tests for guest search and inline creation in `tests/Feature/GuestManagementTest.php`

### Implementation for User Story 5
- [X] T033 [US5] Implement guest search and store controller endpoints in `app/Http/Controllers/GuestController.php`
- [X] T034 [P] [US5] Create searchable guest combobox with inline creation dialog in `resources/js/components/reservations/guest-combobox.tsx`
- [X] T035 [US5] Integrate guest lookup and guest details drawer into `resources/js/components/reservations/reservation-form-dialog.tsx` and `resources/js/pages/reservations/index.tsx`

**Checkpoint**: Guest identity search and inline profile creation operational.

---

## Phase 8: User Story 6 - Role-Based Security & Audit Trail (Priority: P3)

**Goal**: Enforce Spatie RBAC roles (Super Admin, Admin, Receptionist, Viewer) and record an immutable audit log of all sensitive operations.

**Independent Test**: Sign in as Viewer, verify modification actions are disabled and rejected by backend. Sign in as Receptionist, verify price rules and deletion are blocked. Perform status change and verify entry in activity log.

### Tests for User Story 6
- [ ] T036 [P] [US6] Write automated feature tests for RBAC policy gates and activity logging in `tests/Feature/ReservationPermissionTest.php`

### Implementation for User Story 6
- [ ] T037 [P] [US6] Create Spatie role and permission seeder in `database/seeders/RoleAndPermissionSeeder.php`
- [ ] T038 [US6] Implement reservation and payment authorization policies in `app/Policies/ReservationPolicy.php` and `app/Policies/PaymentPolicy.php`
- [ ] T039 [US6] Configure Spatie activity logging on Reservation, Payment, and Unit models in `app/Models/Reservation.php` and `app/Models/Payment.php`
- [ ] T040 [P] [US6] Create frontend `<Can />` authorization wrapper and `usePermission` hook in `resources/js/hooks/use-permission.ts`

**Checkpoint**: Role security boundaries and audit trail active.

---

## Phase 9: User Story 7 - Bulk Excel Data Processing, WhatsApp Dispatch, & Printable Vouchers (Priority: P3)

**Goal**: Enable server-side Excel export/import with Arabic UTF-8 BOM, one-click WhatsApp confirmation links, and browser print vouchers.

**Independent Test**: Export reservations to Excel, verify Arabic text renders cleanly. Upload valid spreadsheet, verify batch creation with rollback on error. Click WhatsApp action, verify formatted link. Trigger print, verify clean styled voucher.

### Tests for User Story 7
- [ ] T041 [P] [US7] Write automated feature tests for spreadsheet export, transactional import, and voucher generation in `tests/Feature/ReservationUtilityTest.php`

### Implementation for User Story 7
- [ ] T042 [US7] Implement Arabic UTF-8 BOM export and transactional batch import service in `app/Services/ExcelReservationService.php`
- [ ] T043 [US7] Implement export and import controller endpoints in `app/Http/Controllers/ReservationExportController.php` and `app/Http/Controllers/ReservationImportController.php`
- [ ] T044 [P] [US7] Create bulk Excel drag-and-drop import dialog in `resources/js/components/reservations/excel-import-dialog.tsx`
- [ ] T045 [P] [US7] Create print-ready voucher dialog with print media styles in `resources/js/components/reservations/printable-voucher.tsx`
- [ ] T046 [US7] Create WhatsApp message generator utility and attach WhatsApp/Print actions to reservation rows in `resources/js/components/reservations/reservation-table-view.tsx`

**Checkpoint**: External spreadsheet integration, instant guest messaging, and voucher printing complete.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: System integration, styling formatting, route generation, and end-to-end verification

- [ ] T047 [P] Run Laravel Wayfinder route generation to synchronize frontend TypeScript routes in `resources/js/actions/` and `resources/js/routes/`
- [ ] T048 Format entire PHP codebase to project style guidelines with `vendor/bin/pint --format agent`
- [ ] T049 [P] Run static type checking and lint checks via `npm run types:check` and `composer ci:check`
- [ ] T050 Execute full end-to-end verification scenarios per `specs/001-resort-reservation-system/quickstart.md` and confirm all PHPUnit tests pass with `php artisan test`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) - **BLOCKS all user stories**.
- **User Stories (Phase 3 through Phase 9)**:
  - User Story 1 (P1): Core MVP booking. Can start immediately after Phase 2.
  - User Story 2 (P1): Depends on Reservation model from US1; can proceed sequentially or parallel with US1 backend.
  - User Story 3 (P2): Depends on Unit and Reservation models from Phase 2/US1.
  - User Story 4 (P2): Depends on Reservation and Unit queries from US1/US2.
  - User Story 5 (P3): Enhances guest creation in US1; independently testable.
  - User Story 6 (P3): Secures actions in US1, US2, US3.
  - User Story 7 (P3): Utility services operating on reservations and payments.
- **Polish (Phase 10)**: Depends on all user stories being implemented.

### Parallel Opportunities

- **Phase 1 (Setup)**: T002, T003, and T004 can be created simultaneously.
- **Phase 2 (Foundational)**: T006, T007, and T008 can be worked on in parallel once migrations (T005) are drafted.
- **User Story 1**: T009 (tests) and T013 (UI dialog) can be developed in parallel with T010/T011 (backend service).
- **User Story 2**: T015 (tests), T018 (payment dialog), and T019 (status badges) can be built in parallel.
- **User Story 4**: T027 (KPIs), T028 (Cards), T029 (Sector Matrix), and T030 (Timeline) can each be built independently in parallel.
- **User Story 7**: T044 (Excel dialog) and T045 (Voucher dialog) can be built in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete **Phase 1: Setup** (dependencies, enums, types).
2. Complete **Phase 2: Foundational** (database migrations, Eloquent models, seeders).
3. Complete **Phase 3: User Story 1** (AvailabilityService, conflict validation, booking dialog).
4. **STOP & VALIDATE**: Run `php artisan test --filter=ReservationConflictTest`. Verify that conflict-free booking works end-to-end.

### Incremental Feature Expansion
1. Add **User Story 2**: Multi-payment tracking and balance reconciliation.
2. Add **User Story 3**: Dynamic membership-based rate calculation.
3. Add **User Story 4**: 4-view operational dashboard (Table, Cards, Sector Matrix, Timeline).
4. Add **User Story 5**: Guest directory & inline creation.
5. Add **User Story 6**: Spatie RBAC & audit logging.
6. Add **User Story 7**: Excel import/export, WhatsApp notifications, printable voucher.
7. Run **Phase 10: Polish**: Pint formatting, Wayfinder route generation, static analysis, and full test suite verification.

