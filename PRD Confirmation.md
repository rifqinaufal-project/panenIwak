# Fish Harvest and Trading Batch Management Web App

**Product Requirements Document (PRD)**\
**Version:** 1.0\
**Date:** 20 October 2026\
**Status:** Ready for implementation planning

## 1. Overview

### Purpose

Build a responsive web application for recording fish purchases, trip
expenses, and sales within a single journey batch. The application will
calculate batch costs, revenue, estimated profit, final operating
profit, profit margin, and weight differences.

### Problem

Fish trading records are often spread across notes or spreadsheets. This
makes it difficult to combine purchase costs and travel expenses,
monitor multiple sales, calculate the final cost of goods sold, and
identify weight differences between purchased and sold fish.

### Main Goal

Provide one reliable record for each trip, from fish purchasing through
final sales. The system must support multiple fish types and sizes in
one batch, multiple sales transactions, offline data entry, and
automatic financial calculations.

### Users

-   **Admin:** Manages all batches, views the overall business
    dashboard, manages user access, and corrects or reopens records when
    necessary.
-   **Field staff:** Creates or updates batches assigned to them and
    records purchases, trip expenses, and sales.

### MVP Scope

The MVP covers batch management, purchase records, expense records,
sales records, dashboards, batch closing, user roles, and offline
synchronization. Invoice generation is not required.

## 2. Requirements

### 2.1 Platform, Selected Stack, and Accessibility

-   The application must work in modern mobile and desktop browsers.
-   The interface must be responsive and usable on common smartphone
    screens and laptop displays.
-   Frontend framework: Nuxt with Vue 3 and TypeScript.
-   Use Bun for local development scripts, package installation, and
    project tooling. Do not assume that Vercel runs the production
    application on the Bun runtime.
-   Deploy the Nuxt application, including its server routes, to Vercel
    using the supported Nuxt deployment integration.
-   Use Supabase PostgreSQL for persistent data and Supabase Auth for
    authentication.
-   Use Dexie.js over IndexedDB for offline data, with a service
    worker/PWA setup to cache the application shell.
-   The web app must support offline data entry after the user has
    signed in and opened the application online at least once.
-   Keep the frontend and server routes in one Nuxt repository. Supabase
    remains a managed external service.

### 2.2 User Types and Permissions

-   Users must authenticate before accessing business records.
-   The system must support two roles: `admin` and `field_staff`.
-   Admins can view all batches and the overall business dashboard,
    manage users, edit records across batches, close batches, and reopen
    a closed batch with an audit record.
-   Field staff can create batches and enter data for batches they
    create or are assigned to.
-   Field staff must not see the overall business dashboard or manage
    user accounts.
-   A closed batch is read-only for field staff. Admins may reopen it
    when corrections are required.

### 2.3 Input and Data Requirements

-   All data-entry forms must appear directly in the page. Do not use
    modal dialogs for primary data entry.
-   Users must be able to add multiple purchase items, sale items, and
    expenses to the same batch.
-   Purchase records must include purchase date, fish type, size, weight
    in kilograms, and purchase price per kilogram.
-   Each sale transaction can contain one or more sale items. Each item
    must include fish type, size, sold weight in kilograms, and sale
    price per kilogram.
-   Expense records must include date, category, amount, and
    description.
-   A batch must include a trip date, origin, destination, assigned
    staff, and status.
-   The system must store who created or updated a record and when the
    action occurred.
-   Fish type and size values should be reusable or selectable from
    suggestions to reduce inconsistent spelling.

### 2.4 Notifications and Feedback

-   Show whether the application is online or offline.
-   Show whether each change is saved locally, waiting to sync,
    synchronized, or failed to synchronize.
-   Display the last successful synchronization time.
-   Show validation errors next to the relevant fields.
-   Update batch totals after a successful local save, even while
    offline.
-   Never show a record as synchronized until the server confirms it.

### 2.5 Business Rules and Calculations

Use kilograms and Indonesian rupiah (IDR) as the default units and
currency.

  ---------------------------------------------------------------------------------------------------
  Metric                 Rule
  ---------------------- ----------------------------------------------------------------------------
  Purchase line cost     `weight_kg × purchase_price_per_kg`

  Total purchase cost    Sum of all purchase line costs in the batch

  Sales line revenue     `sold_weight_kg × sale_price_per_kg`

  Total revenue          Sum of all sales line revenue in the batch

  Total trip expenses    Sum of all expense amounts in the batch

  Total batch cost       `total_purchase_cost + total_trip_expenses`

  Estimated operating    `revenue_to_date - total_recorded_purchase_cost - total_recorded_expenses`
  profit                 

  Final operating profit `total_revenue - total_batch_cost`

  Final profit margin    `final_operating_profit ÷ total_revenue × 100%`

  Effective batch HPP    `total_batch_cost ÷ total_sold_weight_kg`
  per kg sold            

  Weight difference      `total_sold_weight_kg - total_purchased_weight_kg`

  Estimated remaining    `max(total_purchased_weight_kg - total_sold_weight_kg, 0)`
  purchased weight       
  ---------------------------------------------------------------------------------------------------

Rules: - Estimated profit is provisional while a batch is open. Label it
clearly as an estimate. - Final HPP, final operating profit, and final
margin are confirmed when the batch is closed. - If total revenue is
zero, show profit margin as unavailable rather than dividing by zero. -
If total sold weight is zero, show effective HPP per kilogram as
unavailable. - A positive final weight difference is a **tonjolan
bobot**. A negative final difference is a weight shortfall. Do not
record tonjolan bobot as separate revenue. - The application records the
net weight difference only. In the MVP, it does not classify the cause
of a negative difference. - The application uses a blended batch-level
HPP. Product-level profit by fish type or size is outside the MVP. - A
batch should only be closed after the user confirms that sales for that
batch are complete. Closing requires at least one sale item.

## 3. Core Features

### 3.1 Batch Management

-   Create a batch for one trip.
-   Record trip date, origin, destination, and assigned field staff.
-   Support multiple fish types and sizes in the same batch.
-   Display batch status: `Open` or `Closed`.
-   Show purchase, expense, sales, and weight summaries for each batch.
-   Prevent field staff from editing a closed batch.

### 3.2 Purchase Entry

-   Add multiple purchase items to a batch.
-   Record purchase date, fish type, size, weight, and purchase price
    per kilogram.
-   Calculate purchase line costs and total purchase cost automatically.
-   Allow multiple purchase entries during the same trip.

### 3.3 Expense Entry

-   Add expenses one at a time.
-   Record expense date, category, amount, and description.
-   Provide common category suggestions, such as tolls, fuel, meals,
    ice, parking, and other.
-   Add every expense to the batch cost automatically.

### 3.4 Sales Entry

-   Record multiple sale transactions for one batch.
-   Add multiple fish types or sizes to a single sale transaction.
-   Record sold weight and sale price per kilogram for each item.
-   Calculate line revenue, transaction revenue, and cumulative batch
    revenue automatically.
-   Allow a sale weight to exceed purchased weight. Show a
    weight-difference indicator rather than blocking the entry.

### 3.5 Dashboard and Batch Summary

-   Admin dashboard: total revenue, purchase costs, expenses, total
    batch cost, estimated or final operating profit, margin, purchased
    weight, sold weight, weight difference, and open/closed batch
    counts.
-   Field staff view: summaries for batches they created or are assigned
    to.
-   Open batches must display provisional figures and estimated
    remaining purchased weight.
-   Closed batches must display final HPP per kilogram, operating
    profit, margin, and final weight difference.
-   Allow filtering by date range, batch status, and batch.

### 3.6 Batch Closing

-   Require a confirmation that all sales have been recorded.
-   Calculate final metrics using all synchronized and locally available
    records. If records are still pending synchronization, clearly warn
    the user and do not mark the server-side batch as closed until
    pending records have synchronized.
-   Lock the batch against field-staff changes after closing.
-   Allow an admin to reopen a batch with a required reason. Record the
    action in the audit log.

### 3.7 Offline Entry and Synchronization

-   Save new records and edits locally when offline.
-   Add local changes to a synchronization queue.
-   Synchronize automatically when connectivity returns and provide a
    manual retry option.
-   Use stable UUIDs for records so retrying a request does not create
    duplicates.
-   Keep pending records until the server confirms successful
    synchronization.
-   Flag conflicting edits for review. Do not silently overwrite newer
    server data.
-   Show failed synchronization and provide a clear retry action.

### 3.8 MVP Exclusions

-   Invoice or receipt generation.
-   Online payments and payment reconciliation.
-   Supplier account management.
-   Tax filing and full accounting ledgers.
-   GPS tracking or route optimization.
-   Product-level profit analysis by fish type or size.
-   Advanced inventory management across separate warehouses.

## 4. User Flow

1.  The user signs in while online. The application loads and prepares
    its offline data store.
2.  The admin or field staff creates a batch and enters the trip date,
    origin, destination, and assigned staff.
3.  The user records each fish purchase item with its date, type, size,
    weight, and purchase price per kilogram.
4.  The user records travel expenses as they occur, including the
    category, amount, and description.
5.  When fish are sold, the user creates a sale transaction and enters
    the sold weight and sale price per kilogram for each fish type and
    size.
6.  The application recalculates revenue, costs, estimated profit,
    purchased weight, sold weight, and provisional weight difference.
7.  If the device is offline, the application saves the changes locally
    and labels them as pending synchronization.
8.  When the device reconnects, the application sends queued records to
    the backend. It marks records as synchronized only after
    confirmation.
9.  After all sales have been entered and pending records have
    synchronized, the user reviews the batch summary and confirms that
    sales are complete.
10. The user closes the batch. The system calculates final HPP per
    kilogram, operating profit, profit margin, and final weight
    difference.
11. The admin reviews overall performance through the dashboard and can
    reopen a batch with a reason if a correction is necessary.

## 5. Architecture

The application uses one Nuxt repository for the Vue frontend and server
routes. Vercel hosts the Nuxt application. Supabase provides managed
authentication and PostgreSQL. Dexie.js stores offline records in the
browser. Bun is used as the development toolchain; production runtime
behavior follows the deployment runtime supported by Vercel and Nuxt.

``` mermaid
sequenceDiagram
    actor User
    participant FE as Nuxt and Vue Client
    participant Local as Dexie.js / IndexedDB
    participant API as Nuxt Server Routes on Vercel
    participant Auth as Supabase Auth
    participant DB as Supabase PostgreSQL

    User->>FE: Enter purchase, expense, or sale
    FE->>FE: Validate fields and calculate preview
    FE->>Local: Save local record with stable UUID
    Local-->>FE: Confirm local save
    alt Device is online
        FE->>API: Submit record with UUID and session
        API->>Auth: Validate session and user identity
        Auth-->>API: Return authenticated user
        API->>API: Check role, batch access, and business rules
        API->>DB: Insert or update record idempotently
        DB-->>API: Confirm saved record
        API-->>FE: Return server result and recalculated totals
        FE->>Local: Mark record as synchronized
        FE-->>User: Show saved and synchronized status
    else Device is offline
        FE->>Local: Add operation to sync queue
        FE-->>User: Show saved locally, waiting to sync
    end

    Note over FE,Local: Retry queued operations when connectivity returns or the app is reopened
    FE->>API: Send queued records with UUIDs and versions
    API->>Auth: Validate session when online
    Auth-->>API: Return authenticated user
    API->>API: Check permissions, duplicates, and conflicts
    API->>DB: Persist valid records
    DB-->>API: Confirm persistence
    API-->>FE: Return per-record sync result
    FE->>Local: Mark confirmed records as synchronized
    FE-->>User: Show sync status and records needing review
```

### Architecture Rules

-   The Nuxt client validates input for immediate feedback, but server
    routes must validate it again.
-   Nuxt server routes are the trusted boundary for business rules,
    authorization, synchronization, and final batch calculations.
-   Supabase PostgreSQL is the source of truth for synchronized data and
    final financial calculations.
-   The local store supports offline entry and pending synchronization.
    A local save must not be presented as a server-confirmed save.
-   Use stable UUIDs and database constraints to make synchronization
    idempotent.
-   Enforce user roles and batch-level permissions on every protected
    server request. Do not rely only on hidden UI controls.
-   Keep Supabase service-role secrets on the server only. Never expose
    them in browser code.
-   The application must not close a batch on the server while required
    records remain unsynchronized.
-   Do not assume that Bun is the production runtime on Vercel. Confirm
    deployment behavior against the selected Nuxt/Vercel configuration.

## 6. Database Schema

### 6.1 Entity Relationship Diagram

``` mermaid
erDiagram
    USERS ||--o{ BATCHES : creates
    USERS ||--o{ BATCH_ASSIGNMENTS : receives
    BATCHES ||--o{ BATCH_ASSIGNMENTS : assigns
    BATCHES ||--o{ PURCHASE_ITEMS : contains
    BATCHES ||--o{ EXPENSES : contains
    BATCHES ||--o{ SALES : contains
    SALES ||--|{ SALE_ITEMS : contains
    USERS ||--o{ PURCHASE_ITEMS : records
    USERS ||--o{ EXPENSES : records
    USERS ||--o{ SALES : records
    USERS ||--o{ AUDIT_LOGS : performs

    USERS {
        uuid id PK
        string name
        string email
        string password_hash
        string role
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    BATCHES {
        uuid id PK
        date trip_date
        string origin
        string destination
        string status
        uuid created_by FK
        uuid closed_by FK
        datetime closed_at
        datetime created_at
        datetime updated_at
        int version
    }

    BATCH_ASSIGNMENTS {
        uuid id PK
        uuid batch_id FK
        uuid user_id FK
        datetime assigned_at
    }

    PURCHASE_ITEMS {
        uuid id PK
        uuid batch_id FK
        date purchased_at
        string fish_type
        string size_label
        decimal weight_kg
        decimal purchase_price_per_kg
        uuid created_by FK
        datetime created_at
        datetime updated_at
        int version
    }

    EXPENSES {
        uuid id PK
        uuid batch_id FK
        date expense_date
        string category
        decimal amount
        string description
        uuid created_by FK
        datetime created_at
        datetime updated_at
        int version
    }

    SALES {
        uuid id PK
        uuid batch_id FK
        datetime sold_at
        string notes
        uuid created_by FK
        datetime created_at
        datetime updated_at
        int version
    }

    SALE_ITEMS {
        uuid id PK
        uuid sale_id FK
        string fish_type
        string size_label
        decimal weight_kg
        decimal sale_price_per_kg
        datetime created_at
        datetime updated_at
        int version
    }

    AUDIT_LOGS {
        uuid id PK
        uuid actor_id FK
        string entity_type
        uuid entity_id
        string action
        json old_values
        json new_values
        string reason
        datetime created_at
    }
```

### 6.2 Entity Explanation

  ---------------------------------------------------------------------
  Entity                             Purpose
  ---------------------------------- ----------------------------------
  `users`                            Stores admin and field-staff
                                     accounts, roles, and account
                                     status.

  `batches`                          Stores one trip and its lifecycle,
                                     including origin, destination,
                                     status, and closing information.

  `batch_assignments`                Links field staff to batches they
                                     are allowed to work on. A batch
                                     can have multiple assigned staff
                                     members.

  `purchase_items`                   Stores each fish purchase line,
                                     including date, fish type, size,
                                     weight, and purchase price per
                                     kilogram.

  `expenses`                         Stores individual trip expenses
                                     with category, date, amount, and
                                     description.

  `sales`                            Represents one sales event. A
                                     batch can contain multiple sales
                                     events.

  `sale_items`                       Stores the fish type, size, sold
                                     weight, and sale price per
                                     kilogram for each line in a sales
                                     event.

  `audit_logs`                       Records important changes,
                                     including batch closing,
                                     reopening, and corrections to
                                     financial records.
  ---------------------------------------------------------------------

### 6.3 Data and Integrity Rules

-   Generate UUIDs on the client for offline-created records and
    preserve those IDs during synchronization.
-   Use decimal types for weights and money. Do not use floating-point
    types for financial values.
-   Reject zero or negative weights. Reject negative prices and expense
    amounts. Allow a zero price only if the business explicitly permits
    free or promotional items.
-   Calculate line totals and financial summaries on the backend. Do not
    trust totals sent by the browser.
-   Store timestamps consistently and display them in the user's local
    time zone.
-   Add indexes for batch status, trip date, batch foreign keys, sale
    dates, and expense dates.
-   Use record versions or equivalent optimistic concurrency controls to
    detect conflicting edits.
-   Use soft deletion or audited corrections for financial records.
    Avoid permanent deletion without an audit trail.
-   The local synchronization status belongs to the browser's local
    store and does not need to be a server-side business field.

## 7. Design & Technical Constraints

### 7.1 UI/UX

-   Use responsive layouts designed for phone-first data entry.
-   Do not use modal dialogs for purchase, expense, sale, or batch
    forms.
-   Keep forms inline or on dedicated pages with clear Save, Add Item,
    and Cancel actions.
-   Use large touch targets, visible field labels, numeric keyboards for
    weight and price inputs, and clear currency formatting.
-   Display totals close to the relevant input fields.
-   Clearly distinguish estimated figures from final figures.
-   Use confirmation before closing a batch or reopening a closed batch.
-   Show offline, pending-sync, synchronized, and sync-failed states
    with text, not color alone.

### 7.2 Performance Expectations

-   Under a normal connection, common reads and writes should generally
    complete within 2 seconds, excluding unusually slow networks.
-   Local offline saves should generally complete within 300
    milliseconds.
-   Dashboard summaries should load within 3 seconds for a typical
    small-business dataset of up to 10,000 purchase, expense, and
    sale-item records, subject to deployment capacity.
-   Synchronization must process records in manageable batches and
    report per-record success or failure.

### 7.3 Offline and Synchronization Constraints

-   The user must sign in online at least once before offline use.
-   Cache the application shell and store pending records in IndexedDB.
-   Do not remove a pending operation until the backend confirms it.
-   Retry transient failures with exponential backoff and provide a
    manual retry action.
-   If the same UUID is submitted more than once, the backend must
    return the existing result rather than create a duplicate.
-   If the server record has changed since the local copy was read, flag
    the conflict and preserve the local pending version for review. Do
    not silently overwrite either version.
-   If local storage is unavailable or full, show an explicit error and
    do not claim that the record was saved.
-   Offline data remains on the device until it is synchronized. Provide
    a clear warning before a user clears local application data or signs
    out with unsynchronized records.

### 7.4 Failure Scenarios and Recovery

-   **Network loss:** Save locally and queue the operation.
-   **Sync timeout or server error:** Keep the operation pending, retry
    later, and show its status.
-   **Duplicate submission:** Use UUID-based idempotency.
-   **Conflicting edits:** Flag for review and require an authorized
    resolution.
-   **Invalid input:** Show field-level errors and do not submit invalid
    data.
-   **Database unavailable:** Keep unsynchronized data locally and retry
    when the backend is available.
-   **Weight sold exceeds weight purchased:** Accept the entry and
    display a positive provisional weight difference.
-   **Final sold weight is below purchased weight:** Record the negative
    final difference automatically. The MVP does not ask for a cause.
-   **Batch closed with pending changes:** Block server-side closing
    until pending records have synchronized.
-   **No sold weight:** Do not calculate HPP per kilogram. Require at
    least one sale item before closing.
-   **Accidental closure:** Allow an admin to reopen the batch with a
    required reason and an audit log entry.

### 7.5 Security and Access

-   Enforce authorization on the backend, not only in the interface.
-   Store password hashes, never plain-text passwords.
-   Use secure transport for online requests.
-   Do not expose the business-wide dashboard to field staff.
-   Record the actor and timestamp for important financial changes.
-   Avoid storing authentication secrets in plain text in browser
    storage.

### 7.6 Selected Stack and Deployment

-   **Frontend framework:** Nuxt with Vue 3 and TypeScript.
-   **Application backend:** Nuxt server routes/API endpoints in the
    same repository as the frontend.
-   **Development toolchain:** Bun for dependency installation and local
    scripts. Use the same lockfile consistently across development and
    CI.
-   **Application hosting:** Vercel, connected to the project repository
    for automatic deployments and preview builds.
-   **Database:** Supabase PostgreSQL.
-   **Authentication:** Supabase Auth. Server routes must validate the
    user session and enforce application roles.
-   **Offline data:** Dexie.js over IndexedDB, plus a service worker/PWA
    configuration for caching static application assets.
-   Keep the frontend and server routes in one repository for the MVP.
    Do not introduce a separate Go, Java, or Laravel backend in this
    version.
-   Store Supabase URLs and public client configuration in environment
    variables. Keep privileged keys and secrets exclusively in
    server-side environment variables.
-   Configure separate environment variables and isolated environments
    for development, preview, and production where practical.

### 7.7 Technical Boundaries

-   No dedicated hardware integration is required.
-   No printer, camera, or external payment service is required.
-   The application must not depend on a constant internet connection
    for data entry after initial setup and authentication.
-   Final calculations and synchronized records must remain consistent
    between the local interface and the backend.
-   Vercel hosts the Nuxt application; Supabase remains a separate
    managed database and authentication service.
-   Bun is a development toolchain choice, not a guarantee about the
    production runtime used by Vercel.
