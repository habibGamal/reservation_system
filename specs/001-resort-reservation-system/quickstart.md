# Quickstart & Verification Guide: Eagles Resort Reservation Management System

**Feature**: `001-resort-reservation-system`  
**Date**: 2026-09-04  
**Status**: Draft  

---

## 1. Prerequisites & Environment Setup

Ensure the following tools and services are available on the development machine:
- PHP 8.3+ with `pdo_mysql`, `bcmath`, `fileinfo`, `zip` extensions enabled
- Composer 2.x
- Node.js 20+ & npm
- Running MySQL 8.x instance configured in `.env`:
  ```ini
  DB_CONNECTION=mysql
  DB_HOST=127.0.0.1
  DB_PORT=3306
  DB_DATABASE=eagles_resort
  DB_USERNAME=root
  DB_PASSWORD=
  ```

---

## 2. Setup & Migration Commands

Run the installation and migration pipeline:

```bash
# 1. Install backend dependencies (including Spatie & Excel packages)
composer install

# 2. Run migrations and database seeders (Sectors, PriceRules, Units, Roles, Demo Guests)
php artisan migrate:fresh --seed

# 3. Generate Wayfinder TypeScript route bindings
php artisan wayfinder:generate

# 4. Install frontend dependencies
npm install

# 5. Build frontend assets
npm run build
```

---

## 3. Automated Test Suite Verification

Execute the test suites targeting reservation conflict handling, payment tracking, pricing calculation, and authorization policies:

```bash
# Run all reservation management tests
php artisan test --filter=ReservationTest

# Run conflict prevention tests
php artisan test --filter=ReservationConflictTest

# Run multi-payment ledger tests
php artisan test --filter=PaymentTrackingTest

# Run dynamic pricing calculation tests
php artisan test --filter=PricingServiceTest

# Run code style formatting check
vendor/bin/pint --dirty --format agent
```

---

## 4. End-to-End Operational Validation Scenarios

### Scenario 1: Conflict-Free Reservation Creation & Same-Day Turnover
1. Log in as receptionist (`receptionist@eaglesresort.com`).
2. Navigate to `/reservations`.
3. Open "New Reservation" dialog.
4. Select guest "أحمد منصور", unit "101", check-in `2026-10-01`, check-out `2026-10-05`, status "ثابت".
5. Observe automated total calculation ($4 \times \text{Member Rate}$).
6. Click "Confirm Booking". Verify reservation appears in the table with green status.
7. Open "New Reservation" dialog again. Select unit "101" for dates `2026-10-03` to `2026-10-07`.
8. **Expected Outcome**: Form immediately displays conflict alert with existing guest details and refuses submission.
9. Change check-in date to `2026-10-05` (same-day turnover).
10. **Expected Outcome**: Conflict warning disappears and booking succeeds.

---

### Scenario 2: Multi-Payment Ledger & Balance Tracking
1. Open the created reservation for `3,000 EGP`.
2. Inspect payment status: displays "غير مسدد" (Unpaid) with balance `3,000 EGP`.
3. Click "Record Payment", select "Cash", amount `1,000 EGP`. Submit.
4. **Expected Outcome**: Status updates to "مدفوع جزئياً" (Partially Paid) with remaining balance `2,000 EGP`.
5. Click "Record Payment", select "instapay", amount `2,000 EGP`. Submit.
6. **Expected Outcome**: Status updates to "مسدد بالكامل" (Fully Paid) with balance `0 EGP`.

---

### Scenario 3: Multi-View Switching (Table, Cards, Sector Matrix, Timeline)
1. On `/reservations`, click the "شبكة القطاعات" (Sector Matrix) tab.
2. Verify sectors ("لوسيال", "فندق 6", etc.) expand with color-coded unit badges.
3. Click a vacant unit badge. Verify the reservation dialog opens with that unit pre-selected.
4. Switch to "الخط الزمني" (Timeline) tab. Verify active reservations render as continuous horizontal blocks across dates without visual overlap errors.

---

### Scenario 4: Role Permissions & Pricing Overrides
1. While logged in as `receptionist`, inspect the reservation price field in the edit dialog. Verify it cannot be manually changed without supervisor privileges.
2. Log in as `admin@eaglesresort.com`. Open the same reservation edit dialog.
3. Apply a manual discount to `total_price` with reason note "تخفيض عائلي معتمد".
4. **Expected Outcome**: Override is saved and logged into `activity_log`.

