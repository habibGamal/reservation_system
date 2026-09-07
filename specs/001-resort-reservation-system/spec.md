# Feature Specification: Eagles Resort Reservation Management System

**Feature Branch**: `001-resort-reservation-system`  
**Created**: 2026-09-04  
**Status**: Draft  
**Input**: User description: "PRODUCT_REQUIREMENTS_DOCUMENT.md - Eagles Resort Reservation Management System"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Front Desk Reservation Booking & Conflict Prevention (Priority: P1)

As a Front Desk Receptionist, I need to create and manage unit reservations for incoming guests without risk of double-booking, so that units are assigned accurately and guests never arrive to find an occupied unit.

**Why this priority**: Preventing double bookings and recording reservations is the core operational function of the resort. Without accurate, conflict-free booking, daily resort operations cannot function.

**Independent Test**: Can be fully tested by creating a reservation for an available unit across a specific date range, verifying confirmation, and subsequently attempting to create a second overlapping reservation for the same unit to verify that the system blocks the duplicate and alerts the operator immediately.

**Acceptance Scenarios**:

1. **Given** unit "101" is vacant from October 1 to October 5, **When** a receptionist books unit "101" for a guest checking in on October 1 and checking out on October 5, **Then** the reservation is successfully saved with status "Confirmed", unit occupancy is updated, and a booking summary is generated.
2. **Given** an existing active reservation for unit "101" from October 1 to October 5, **When** an operator attempts to book unit "101" checking in October 3 and checking out October 7, **Then** the system rejects the booking, displays a prominent conflict warning identifying the conflicting booking dates, and refuses to save the duplicate record.
3. **Given** an existing reservation for unit "101" with check-out on October 5, **When** a receptionist books unit "101" with check-in on October 5 (same day turnover), **Then** the booking is permitted because departure and arrival occur on the turnover boundary.
4. **Given** a reservation with status "Departed", **When** a new reservation is placed for the same unit during previously occupied dates, **Then** the past departed booking does not cause a conflict.

---

### User Story 2 - Multi-Payment Tracking & Balance Reconciliation (Priority: P1)

As a Front Desk Cashier or Manager, I need to record multiple installment payments for a reservation across diverse payment methods (Cash, Visa, InstaPay) and immediately view the updated balance and payment status, so that resort accounts remain accurate and financial reconciliation is transparent.

**Why this priority**: Financial accountability and multi-stage payment collection (deposits, check-in payments, final settlements) are essential to daily cash flow and preventing revenue loss.

**Independent Test**: Can be fully tested by booking a reservation with a known total cost, recording an initial cash deposit, verifying that the remaining balance decreases and status updates to "Partially Paid", and then recording a final digital payment that brings the balance to zero with a "Fully Paid" status.

**Acceptance Scenarios**:

1. **Given** a reservation with a total required amount of 3,000 EGP and 0 EGP paid, **When** viewing the reservation, **Then** the financial status indicates "Unpaid" with a balance of 3,000 EGP.
2. **Given** an unpaid reservation of 3,000 EGP, **When** the cashier logs an initial deposit of 1,000 EGP via "Cash", **Then** the payment record is saved, the total paid updates to 1,000 EGP, the remaining balance updates to 2,000 EGP, and the payment status changes to "Partially Paid".
3. **Given** a partially paid reservation with a 2,000 EGP balance, **When** the cashier logs a second payment of 2,000 EGP via "InstaPay", **Then** the remaining balance becomes 0 EGP and the status updates to "Fully Paid".
4. **Given** a reservation, **When** an operator enters a negative or zero payment amount, **Then** the system rejects the transaction with a validation error.

---

### User Story 3 - Dynamic Membership-Based Pricing & Authorized Overrides (Priority: P2)

As an Operations Supervisor or Front Desk Staff, I need the system to automatically compute total booking costs based on the unit's pricing rule, the guest's membership category (Member, Non-Member, Companion, Civilian), and duration of stay, while allowing authorized supervisors to apply manual discounts or overrides, so that pricing policies are consistently enforced.

**Why this priority**: Eliminates manual pricing calculations and human calculation errors while retaining necessary supervisory flexibility for special discounts and authorized adjustments.

**Independent Test**: Can be fully tested by selecting a unit with defined tier rates, varying the membership category and dates to verify automatic total computation, and testing that only users with override authority can edit the calculated total price.

**Acceptance Scenarios**:

1. **Given** a unit linked to a price rule (Member: 400 EGP/night, Non-Member: 700 EGP/night) and a 3-night stay, **When** selecting a guest classified as "Member", **Then** the system automatically calculates the total price as 1,200 EGP (3 nights x 400 EGP).
2. **Given** the same unit and duration, **When** switching the guest classification to "Non-Member", **Then** the system recalculates the total price to 2,100 EGP (3 nights x 700 EGP).
3. **Given** a user with supervisor/admin pricing override permissions, **When** they manually modify the calculated total from 2,100 EGP to 1,800 EGP with an explanatory note, **Then** the override is saved and logged in the reservation notes.
4. **Given** a standard staff user without override permissions, **When** they attempt to edit the calculated total price field, **Then** the field is read-only and modifications are prohibited.

---

### User Story 4 - Multi-Perspective Operations Monitoring (Priority: P2)

As a Resort Manager or Front Desk Officer, I need to switch seamlessly between multiple visual representations of reservations and occupancy (High-Density Table, Interactive Cards, Compact Sector Matrix, and Timeline Calendar), so that I can quickly assess resort capacity, locate reservations, and perform swift operational actions.

**Why this priority**: Front desk staff require high-density data tables for fast processing, while managers and supervisors require spatial, sector-grouped, and timeline views to optimize room allocation and spot availability gaps.

**Independent Test**: Can be tested by switching between the four views with a seeded set of reservations and verifying that filtering, status badges, sector groupings, and timeline blocks reflect accurate live state across all perspectives.

**Acceptance Scenarios**:

1. **Given** the reservations dashboard, **When** viewing the High-Density Table, **Then** the operator can sort columns, expand rows to inspect payment histories, filter by sector/status/payment state, and trigger quick actions (status update, add payment, edit).
2. **Given** the Compact Sector Matrix view, **When** expanding a sector (e.g., "Le Ciel" or "Hotel 6"), **Then** units are displayed with instant color-coded operational states (Green: Checked-In, Blue: Confirmed, Orange: Waiting, Muted: Vacant).
3. **Given** a vacant unit in the Sector Matrix view, **When** clicking on the unit, **Then** a new reservation dialog opens pre-populated with that sector and unit.
4. **Given** the Timeline Calendar view, **When** inspecting occupancy across days and units, **Then** reservation blocks span the exact check-in to check-out dates, and any accidental scheduling overlaps are visibly highlighted with emergency indicators.

---

### User Story 5 - Guest Profile Management & Fast Identification Lookup (Priority: P3)

As a Receptionist, I need to quickly search existing guest profiles by name, phone number, or military identification code, or register a new guest inline without leaving the reservation flow, so that guest check-in is swift and repetitive data entry is minimized.

**Why this priority**: Streamlines guest reception, prevents duplicate guest profiles, and ensures reliable contact and identification records.

**Independent Test**: Can be tested by typing partial name, phone, or military ID into the guest lookup field, observing instant matching results, and creating a new guest profile directly from within an open reservation form.

**Acceptance Scenarios**:

1. **Given** an existing guest named "Ahmed Mansour" with phone "01012345678" and military code "M-9842", **When** the receptionist types "9842" or "Mansour" in the search field, **Then** the guest profile appears in the matching suggestions.
2. **Given** a first-time guest, **When** the receptionist types an unregistered phone number or name, **Then** the option to create a new guest profile appears inline, allows entering full name, phone, and military code, and attaches the newly created guest to the active reservation without resetting the form.
3. **Given** a guest profile, **When** viewing their profile card, **Then** all historical and current reservations linked to that guest are visible.

---

### User Story 6 - Role-Based Security & Audit Trail (Priority: P3)

As a System Auditor or Administrator, I need access controls based on user roles (Super Admin, Admin, Receptionist, Viewer) and an immutable activity log of all sensitive actions, so that operational integrity is enforced and unauthorized alterations are prevented.

**Why this priority**: Secures resort revenue, protects sensitive guest information, and ensures complete traceability of operational and financial actions.

**Independent Test**: Can be tested by signing in under different role accounts (Viewer vs. Receptionist vs. Admin) to verify that unauthorized buttons/endpoints are restricted, followed by performing changes and inspecting the resulting audit log records.

**Acceptance Scenarios**:

1. **Given** a user with the "Viewer" role, **When** they view the dashboard, **Then** they can search, inspect, and export reports, but all action buttons for adding reservations, modifying bookings, or recording payments are completely disabled and inaccessible.
2. **Given** a user with the "Receptionist" role, **When** they attempt to delete a reservation or modify system price rules, **Then** the action is denied.
3. **Given** any modification to a reservation (e.g., status change or price override), **When** the action completes, **Then** an audit entry is recorded documenting the acting user, action type, timestamp, IP, and the exact previous and new values.

---

### User Story 7 - Bulk Excel Data Processing, WhatsApp Dispatch, & Printable Vouchers (Priority: P3)

As an Operations Supervisor or Receptionist, I need to import/export reservation batches via Excel spreadsheets, send instant WhatsApp reservation confirmations to guests, and generate print-ready booking vouchers, so that external branch coordination and guest communication are efficient.

**Why this priority**: Facilitates smooth data handoffs from administrative headquarters and branches while elevating guest satisfaction through modern instant confirmations.

**Independent Test**: Can be tested by exporting current reservations to Excel, uploading a batch file to verify safe database ingestion with rollback on error, generating a WhatsApp message link with pre-filled details, and triggering the print layout for a booking voucher.

**Acceptance Scenarios**:

1. **Given** a list of active reservations, **When** the supervisor triggers "Export to Excel", **Then** a spreadsheet file is downloaded with proper Arabic character encoding containing all booking details and payment summaries.
2. **Given** an uploaded batch Excel file with mixed valid and conflicting reservation rows, **When** processed, **Then** the system validates rows transactionally, prevents invalid entries, and provides a clear error report pinpointing problematic rows.
3. **Given** a confirmed reservation, **When** clicking "Send WhatsApp Confirmation", **Then** a formatted chat message is generated including guest name, unit, arrival/departure dates, paid amount, and remaining balance.
4. **Given** a reservation, **When** triggering "Print Voucher", **Then** a clean print-formatted voucher displays with resort branding, reservation particulars, payment itemization, and signature lines without extraneous UI elements.

---

### Edge Cases

- **Same-Day Checkout and Check-In (Turnover Boundary)**: A guest checking out on October 10 at standard checkout time (e.g., 12:00 PM) must not block a new guest checking in on October 10 at check-in time (e.g., 2:00 PM). The conflict logic treats checkout date as exclusive for night occupancy.
- **Overlapping Check-In/Check-Out with Mid-Stay Extension**: When an existing reservation extends its check-out date, the extension window must be checked for potential conflicts against other future reservations for the same unit.
- **Payment Exceeding Total Price**: If an operator enters a payment amount higher than the remaining balance, the system must warn the user and require explicit confirmation or restrict payment to the exact balance based on business rule configuration.
- **Cancellation or Departure Handling**: A reservation marked as "Departed" or cancelled vacates the unit for any future date adjustments or new bookings without triggering retrospective conflict errors.
- **Simultaneous Booking Submissions (Race Conditions)**: If two receptionists submit bookings for the exact same unit and date range simultaneously, database-level transactional locks must ensure that the first submission succeeds while the second fails gracefully with an availability conflict notification.
- **Zero-Night Stay**: If check-in and check-out dates are entered as the same calendar day, the system must enforce a minimum duration of 1 night or flag a same-day day-use policy requirement.
- **Sector or Unit Name Duplication**: Unit names must be unique within their assigned sector (e.g., "Room 101" can exist in "Hotel 1" and "Hotel 2", but cannot exist twice in "Hotel 1").

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST store and manage resort sectors (e.g., Le Ciel, Old Villa, New Villa, Hotels 1-6, Distinguished, Duplex Units) and allow administrative creation, editing, and deactivation of sectors.
- **FR-002**: The system MUST support individual lodging units assigned to specific sectors, with unique unit identifiers enforced within each sector.
- **FR-003**: The system MUST allow administrators to define dynamic pricing rules (`PriceRule`) that assign specific nightly rates to each membership tier: Member (`عضو`), Non-Member (`غير عضو`), Companion (`مرافق`), and Civilian (`مدني`).
- **FR-004**: Each lodging unit MUST be linkable to an active pricing rule to drive automated rate calculation.
- **FR-005**: The system MUST maintain guest profiles comprising full name, primary contact phone number, and optional military/identification code (`mil_code`).
- **FR-006**: The system MUST provide instant search and lookup for guest profiles by name, phone number, or identification code during the reservation creation workflow.
- **FR-007**: The system MUST allow inline registration of new guest profiles without abandoning an in-progress reservation form.
- **FR-008**: The system MUST require each reservation to specify guest, lodging unit, check-in date, check-out date, reservation status, origin channel (`فرع`, `ادارة`, `منتجع`), and membership classification.
- **FR-009**: The system MUST validate against double-booking by executing automated conflict checks before any reservation is saved or dates are updated, detecting any date overlap: $(\text{new\_check\_in} < \text{existing\_check\_out}) \land (\text{new\_check\_out} > \text{existing\_check\_in})$ for non-departed bookings of the same unit.
- **FR-010**: The system MUST calculate the total reservation price automatically by multiplying the number of booked nights by the unit's pricing rate for the selected membership tier.
- **FR-011**: The system MUST permit authorized supervisory roles to manually override the calculated reservation price while logging the override and justification in the audit notes.
- **FR-012**: The system MUST support recording multiple financial payments for a single reservation, tracking amount, payment method (Cash, Visa, InstaPay), and payment timestamp.
- **FR-013**: The system MUST automatically compute total paid amount, outstanding balance, and payment status (`Fully Paid`, `Partially Paid`, `Unpaid`) upon every payment record change.
- **FR-014**: The system MUST provide four primary operational views of reservations:
  - **High-Density Table**: sortable, filterable columns with expandable payment histories and row-level action menus.
  - **Responsive Cards**: mobile/tablet friendly overview with status badges and quick contact actions.
  - **Sector Matrix**: grouped accordion/grid showing live unit availability states (vacant, checked-in, confirmed, waiting) with one-click booking on vacant units.
  - **Timeline Calendar**: horizontal timeline mapping reservations across units and calendar days with visual conflict indicators.
- **FR-015**: The system MUST provide a live KPI dashboard displaying key operational metrics: Total Reservations, Checked-In Count, Pending/Waiting Count, Confirmed Count, and Departed Count with immediate one-click status filtering.
- **FR-016**: The system MUST enforce Role-Based Access Control (RBAC) across four tiers: Super Admin, Admin, Receptionist, and Viewer, controlling access to data viewing, record creation, modifications, price overrides, record deletion, and user administration.
- **FR-017**: The system MUST log all critical operational events (creation, modifications, status transitions, payments, deletions, overrides) in an immutable activity log capturing user, timestamp, IP address, and attribute diffs.
- **FR-018**: The system MUST generate formatted WhatsApp messaging links containing reservation confirmation details for one-click communication with guests.
- **FR-019**: The system MUST provide a print-ready booking voucher view optimized for paper/PDF output with resort branding, guest and stay details, and payment receipts.
- **FR-020**: The system MUST support exporting reservation data, guest listings, and payment reports to Excel/CSV with complete Arabic character integrity (UTF-8 with BOM).
- **FR-021**: The system MUST support bulk importing of reservation datasets from Excel spreadsheets with transactional validation and failure rollback on corrupted/conflicting rows.
- **FR-022**: The system MUST support full Right-to-Left (RTL) interface orientation and complete Arabic localization across all views, dialogs, forms, and printed outputs.

---

### Key Entities

- **Guest**: Represents the lodging patron; maintains full name, indexed contact phone number, and military/work identification code. Has many reservations across time.
- **Sector**: Represents an architectural or geographical resort zone (e.g., Le Ciel, Old Villa, Hotel 1-6, Duplex); has many lodging units.
- **PriceRule**: Represents a pricing schedule linking membership categories (`عضو`, `غير عضو`, `مرافق`, `مدني`) to specific nightly rates in Egyptian Pounds (EGP); applies to one or many units.
- **Unit**: Represents a specific rentable room, chalet, or villa under a sector. Has an optional pricing rule and unique name within its sector. Has many reservations.
- **Reservation**: Core operational contract capturing guest, assigned unit, arrival date, departure date, reservation status (`تم التسكين`, `انتظار`, `ثابت`, `غادر`), booking channel (`فرع`, `ادارة`, `منتجع`), membership tier applied, total price, and calculated balances.
- **Payment**: An itemized monetary transaction linked to a reservation, recording the collected amount, payment instrument (Cash, Visa, InstaPay), and transaction timestamp.
- **ActivityLog**: An audit trail recording every state change, price override, status transition, or user action across the resort management system.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Double-booking rate is reduced to exactly 0%, with 100% of conflicting date attempts blocked before database commitment.
- **SC-002**: Front desk staff can complete and confirm a new reservation in under 60 seconds when booking an available unit.
- **SC-003**: Availability conflict alerts are visually and programmatically reported to the operator within 500 milliseconds of selecting conflicting dates.
- **SC-004**: Financial reconciliation discrepancies between logged payments, outstanding balances, and total reservation costs are eliminated (0 balance calculation discrepancies).
- **SC-005**: 100% of operational changes (reservation updates, status transitions, price overrides, payments, and cancellations) are captured in the immutable audit log.
- **SC-006**: Excel bulk exports and imports maintain 100% Arabic text fidelity without character corruption or encoding errors.
- **SC-007**: Operators can switch between any of the 4 interface views (Table, Cards, Sector Matrix, Timeline) in under 1 second without full application reloads.
- **SC-008**: System supports seamless operation across desktop workstations and mobile tablets with 100% RTL Arabic presentation compliance.

---

## Assumptions

- **Currency**: All financial values, pricing rules, and payment balances are denominated in Egyptian Pounds (EGP).
- **Check-in/Check-out Turnover Times**: Standard resort policy permits check-out on day $D$ and a new check-in on day $D$ for the same unit without conflict, assuming standard midday housekeeping turnover.
- **Authentication & User Identity**: Operators log in with authenticated user credentials, and their system user identity is automatically bound to all created reservations, payments, and audit entries.
- **Network & Hardware Environment**: Front desk operators work primarily on modern desktop browsers and resort tablets with active local or cloud network connectivity.
- **Membership Verification**: Receptionists are responsible for verifying military IDs or membership credentials presented by guests before applying the corresponding membership discount tier.
- **Third-Party Messaging**: WhatsApp confirmation relies on standard universal web/app links (`wa.me`) opened on the operator's browser or device; direct automated WhatsApp API webhooks are optional and out of scope for initial core delivery.

