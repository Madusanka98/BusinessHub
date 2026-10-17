# UI Sitemap & Screen Inventory Specification — BusinessHub SaaS

This document defines the complete Information Architecture (IA) and Screen Inventory for **BusinessHub SaaS**.

---

## 1. Information Architecture Overview

```mermaid
graph TD
    Root([App Root]) --> PublicRoutes[Public & Auth Area]
    Root --> AdminRoutes[Platform Super Admin Area]
    Root --> TenantRoutes[Tenant Business Workspace]

    PublicRoutes --> Login[/login]
    PublicRoutes --> ForgotPwd[/forgot-password]
    PublicRoutes --> ResetPwd[/reset-password/:token]
    PublicRoutes --> AcceptInvite[/invite/:token]

    AdminRoutes --> AdminDash[/admin]
    AdminRoutes --> AdminBizList[/admin/businesses]
    AdminRoutes --> AdminBizCreate[/admin/businesses/new]
    AdminRoutes --> AdminAudit[/admin/audit-logs]

    TenantRoutes --> TenantDash[/dashboard]
    TenantRoutes --> TenantFinance[Finance & Equity]
    TenantRoutes --> TenantInventory[Products & Inventory]
    TenantRoutes --> TenantSales[Orders & Customers]
    TenantRoutes --> TenantMushroom[Mushroom Production Module]
    TenantRoutes --> TenantSettings[Settings & Governance]

    TenantFinance --> FinTx[/finance/transactions]
    TenantFinance --> FinApprovals[/finance/approvals]
    TenantFinance --> FinPartners[/finance/partners]
    TenantFinance --> FinClose[/finance/closing]

    TenantInventory --> InvCatalog[/inventory/products]
    TenantInventory --> InvMovements[/inventory/movements]

    TenantMushroom --> MushDash[/mushroom]
    TenantMushroom --> MushRecipes[/mushroom/recipes]
    TenantMushroom --> MushBatches[/mushroom/batches]
    TenantMushroom --> MushHarvest[/mushroom/harvests]
    TenantMushroom --> MushDrying[/mushroom/drying]
    TenantMushroom --> MushWaste[/mushroom/waste]

    TenantSettings --> SetMembers[/settings/members]
    TenantSettings --> SetProfile[/settings/profile]
    TenantSettings --> SetAudit[/settings/audit-logs]
```

---

## 2. Public & Authentication Area

### 2.1 `/login` (Sign In)
- **Purpose**: Authenticate individual user identity via email and password.
- **Authorized Roles**: Unauthenticated public users.
- **Main Actions**: Enter credentials, click "Sign In", click "Forgot Password".
- **Key Data Fields**: Email address, Password, Remember Me checkbox.
- **Validation Rules**: Valid email format; password minimum 8 characters.
- **States**: Loading spinner on submit; error alert on invalid credentials; rate limit block after 5 failed attempts.
- **Related Screens**: `/forgot-password`, `/dashboard`.
- **MVP Priority**: **P0**

### 2.2 `/forgot-password` & `/reset-password/[token]`
- **Purpose**: Self-service credential recovery without human intervention.
- **Authorized Roles**: Unauthenticated public users.
- **Main Actions**: Submit email for reset link; submit new password via token URL.
- **Key Data Fields**: Email; New Password, Confirm Password.
- **Validation Rules**: Cryptographic token validity (1-hour expiry); password complexity enforcement.
- **States**: Confirmation banner ("If the email exists, a reset link was sent"); error banner if token expired or consumed.
- **MVP Priority**: **P0**

### 2.3 `/invite/[token]` (Account Setup & Invitation Acceptance)
- **Purpose**: Cryptographically secure onboarding for invited owners, partners, and staff.
- **Authorized Roles**: Invited users possessing a valid token.
- **Main Actions**: Set full name and personal password; accept membership in the inviting business.
- **Key Data Fields**: Full Name, Password, Confirm Password (email and business name rendered read-only).
- **Validation Rules**: Token must be active and unexpired (48h TTL); password complexity enforced; password confirmation match.
- **States**: Loading token verification skeleton; "Token Expired" or "Already Used" error states with guidance to contact admin; redirect to business dashboard on success.
- **MVP Priority**: **P0**

---

## 3. Platform Super Admin Area (`/admin`)

### 3.1 `/admin` (Platform Overview)
- **Purpose**: Monitor platform-wide health, tenant volume, and system metrics.
- **Authorized Roles**: Platform Super Admin only.
- **Main Actions**: View aggregate metrics; quick-link to provision a new business.
- **Key Data Fields**: Total Tenants, Active Tenants, Pending Setups, Total Registered Users, System Status.
- **MVP Priority**: **P1**

### 3.2 `/admin/businesses/new` (Provision Tenant Business)
- **Purpose**: Provision a new business organization and dispatch the primary owner activation link.
- **Authorized Roles**: Platform Super Admin only.
- **Main Actions**: Enter organization details; submit provisioning form; copy manual backup invite link if needed.
- **Key Data Fields**: Business Name, URL Slug (e.g., `sunshine-mushrooms`), Max Owners (1–10, default 10), Primary Owner Email, Primary Owner Full Name.
- **Validation Rules**: Slug unique alphanumeric; max owners between 1 and 10; valid email.
- **States**: Immediate validation feedback; success confirmation modal with token link.
- **MVP Priority**: **P0**

### 3.3 `/admin/businesses` & `[id]` (Business Management & Tenant Audit)
- **Purpose**: View tenant status, suspend delinquent tenants, reissue setup invitations.
- **Authorized Roles**: Platform Super Admin only.
- **Main Actions**: Search tenants; filter by status (`ACTIVE`, `PENDING_SETUP`, `SUSPENDED`); view tenant profile; trigger invite re-send.
- **Key Data Fields**: Tenant Name, Slug, Status, Owner Email, Created At, Action Buttons.
- **MVP Priority**: **P1**

---

## 4. Tenant Business Workspace (`/`)

### 4.1 Global Tenant Header & Business Selector
- **Component**: Persistent top navigation bar across all tenant views.
- **Key Elements**: Active Business Name & Logo, Business Switcher Dropdown (listing all authorized tenants for current user), Active Role Badge (e.g., "Owner"), User Profile Menu, Theme Switcher.
- **Actions**: Select alternate business from dropdown; navigate to User Settings; Sign Out.
- **MVP Priority**: **P0**

### 4.2 `/dashboard` (Executive Overview)
- **Purpose**: High-level operational and financial summary for the active tenant.
- **Authorized Roles**: All tenant members (widgets conditionally rendered by role permissions).
- **Widgets**:
  - *Financial Card (Owners/Finance Partners)*: Real-time Cash Balance, Monthly Revenue, Monthly Expenses, Pending Approvals badge.
  - *Operational Card (Owners/Operations)*: Active Mushroom Batches, Harvests Today (kg), Contamination Rate (%), Low Stock Alerts.
  - *Technician Card (Staff)*: Today's Assigned Tasks, Quick Action ("Log Harvest", "Log Watering").
- **MVP Priority**: **P0**

### 4.3 `/settings/members` (Members, Roles & Invites)
- **Purpose**: Manage business team members, assign permissions, and send invitations subject to owner limits.
- **Authorized Roles**: Business Owner.
- **Main Actions**: Click "Invite Member"; choose Role (`OWNER`, `PARTNER_FINANCE`, `PARTNER_OPERATIONS`, `STAFF`, `VIEWER`); revoke pending invite; deactivate member.
- **Key Data Fields**: Quota Banner ("Owners: 2 of 3 assigned"), Member Table (Avatar, Name, Email, Role, Status, Joined Date, Actions).
- **Validation Rules**: If `activeOwners + pendingOwnerInvites >= maxOwners`, the "Invite Co-Owner" option is disabled.
- **MVP Priority**: **P0**

### 4.4 `/finance/transactions` (Income & Expenses)
- **Purpose**: Record and audit all business income and expense transactions.
- **Authorized Roles**: Business Owner, Financial Partner, Operations Partner (limited).
- **Main Actions**: Click "New Transaction"; upload receipt; filter by Category, Date Range, Status; export CSV.
- **Key Data Fields**: Date, Type (`INCOME` / `EXPENSE`), Category, Amount, Payment Method, Description, Receipt Attachment Preview, Approval Status (`ACTIVE`, `PENDING_APPROVAL`, `REJECTED`).
- **Validation Rules**: Positive amounts; valid receipt file formats (JPG/PNG/PDF <= 5MB).
- **MVP Priority**: **P0**

### 4.5 `/finance/approvals` (Expense Approval Queue)
- **Purpose**: Review and approve expenses exceeding the business authorization threshold.
- **Authorized Roles**: Business Owner.
- **Main Actions**: Review expense line items and receipt preview; click "Approve" or "Reject" (with comment).
- **Key Data Fields**: Submitter Name, Date, Category, Amount, Receipt Thumbnail, Action Buttons.
- **Validation Rules**: Submitter cannot approve their own expense unless sole owner.
- **MVP Priority**: **P1**

### 4.6 `/finance/partners` (Capital, Loans & Equity Ledger)
- **Purpose**: Transparent ledger of partner capital contributions, loans, interest, and drawings.
- **Authorized Roles**: Business Owner, Financial Partner.
- **Main Actions**: Record Capital Contribution; Record Partner Loan; Request Withdrawal; View Partner Equity Breakdown.
- **Key Data Fields**: Partner Name, Capital Injected, Total Withdrawals, Net Equity %, Outstanding Loans, Next Loan Repayment Date.
- **MVP Priority**: **P1**

### 4.7 `/finance/closing` (Period Closing & Profit Sharing)
- **Purpose**: Finalize accounting periods, calculate net profits, deduct reserves, and allocate dividends.
- **Authorized Roles**: Business Owner.
- **Main Actions**: Select Period Month/Year; set Retained Earnings Reserve %; generate Distribution Table; click "Finalize & Lock Period".
- **Key Data Fields**: Net Operating Profit, Reserve Amount, Distributable Pool, Per-Partner Profit Share, Period Status (`OPEN`, `CLOSED`).
- **MVP Priority**: **P1**

### 4.8 `/inventory/products` & `/inventory/movements` (Core Inventory)
- **Purpose**: Manage catalog of raw materials, packaging, and finished goods with stock movement tracking.
- **Authorized Roles**: Business Owner, Operations Partner, Staff (view only).
- **Main Actions**: Add Product; Adjust Stock (with reason code); View Stock Ledger.
- **Key Data Fields**: SKU, Product Name, Category, Unit of Measure, Current Quantity, Unit Cost, Selling Price, Reorder Level.
- **MVP Priority**: **P0**

### 4.9 `/sales/orders` (Orders & Customers)
- **Purpose**: Manage customer sales orders, invoices, and payment tracking.
- **Authorized Roles**: Business Owner, Operations Partner.
- **Main Actions**: Create Order; Add Line Items; Generate Invoice PDF; Update Payment Status (`PAID`, `PARTIAL`, `UNPAID`).
- **Key Data Fields**: Order #, Customer Name, Order Date, Total Amount, Fulfillment Status, Payment Status.
- **MVP Priority**: **P0**

---

## 5. Mushroom Production Module (`/mushroom`)

### 5.1 `/mushroom` (Cultivation Dashboard)
- **Purpose**: Operational command center for mushroom farm status and biological pipeline.
- **Authorized Roles**: Business Owner, Operations Partner, Cultivation Technician.
- **Key Widgets**: Active Batches by Phase (Kanban summary: Preparation, Incubation, Fruiting), Daily Fresh Harvest (kg), Chamber Environmental Readings, Contamination Loss Rate (%).
- **MVP Priority**: **P0**

### 5.2 `/mushroom/recipes` (Substrate Recipes & Formulations)
- **Purpose**: Define Bill of Materials (BOM) formulas for substrate mixes per strain.
- **Authorized Roles**: Business Owner, Operations Partner.
- **Main Actions**: Create Recipe; define ingredient ratios (sawdust, bran, lime, water); link to core inventory items.
- **Key Data Fields**: Recipe Name, Strain Target, Batch Size, Ingredient List (Item, Ratio %, Quantity per bag).
- **MVP Priority**: **P0**

### 5.3 `/mushroom/batches` & `[id]` (Batch Lifecycle & Chamber Tracking)
- **Purpose**: Launch new batches, track bag counts, log phase transitions, and record daily environmental metrics.
- **Authorized Roles**: Business Owner, Operations Partner, Cultivation Technician.
- **Main Actions**: "Create Batch" (auto-generates `MB-[STRAIN]-[YYYYMMDD]-[SEQ]`); advance phase; record daily temperature/humidity; assign to room/chamber.
- **Key Data Fields**: Batch Code, Strain, Recipe, Initial Bags Prepared, Viable Bags Remaining, Current Phase (`PREPARATION`, `STERILIZATION`, `INOCULATION`, `INCUBATION`, `FRUITING`, `COMPLETED`), Chamber ID.
- **MVP Priority**: **P0**

### 5.4 `/mushroom/harvests` (Flush Yield Logging & Grading)
- **Purpose**: Record fresh harvests by flush cycle and quality grade, auto-updating finished product inventory.
- **Authorized Roles**: Business Owner, Operations Partner, Cultivation Technician.
- **Main Actions**: "Log Harvest"; select Batch; choose Flush Number (Flush 1, 2, 3); input weight and grade breakdown.
- **Key Data Fields**: Batch Code, Harvest Date, Flush #, Total Fresh Weight (kg), Grade A kg, Grade B kg, Scrap kg, Biological Efficiency (BE %).
- **MVP Priority**: **P0**

### 5.5 `/mushroom/waste` (Contamination & Scrap Logging)
- **Purpose**: Record contaminated bags discarded during incubation and fruiting to isolate biological risks.
- **Authorized Roles**: Operations Partner, Cultivation Technician.
- **Main Actions**: Log Contamination; select Batch; enter Discarded Bags Count; select Contamination Reason (Green Mold, Cobweb, Bacteria, Pests).
- **Key Data Fields**: Batch Code, Date, Phase Discarded, Bags Count, Reason Code, Technician Notes.
- **MVP Priority**: **P1**

### 5.6 `/mushroom/drying` (Dehydration & Dried Stock Processing)
- **Purpose**: Record dehydration processing converting fresh mushrooms into dried inventory.
- **Authorized Roles**: Operations Partner, Cultivation Technician.
- **Main Actions**: Start Drying Run (input Fresh kg); Complete Drying Run (input Dried kg); compute moisture loss and yield ratio.
- **Key Data Fields**: Drying Run ID, Fresh SKU & Weight In, Dried SKU & Weight Out, Moisture Loss %, Dehydration Yield %.
- **MVP Priority**: **P1**

### 5.7 `/settings/audit-logs` (Tenant Audit Trail)
- **Purpose**: Immutable history of all tenant-level actions and mutations.
- **Authorized Roles**: Business Owner, Auditor.
- **Main Actions**: Search and filter by Date, User, Action Type; export log to CSV.
- **Key Data Fields**: Timestamp, Actor Name/Email, Action (`USER_INVITED`, `TRANSACTION_APPROVED`, `BATCH_TERMINATED`), Target Record, IP Address.
- **MVP Priority**: **P1**
