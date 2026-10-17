# User Stories & Acceptance Criteria — BusinessHub SaaS

This document establishes prioritized, testable user stories across all core and modular functional areas. Every P0 story includes rigorous preconditions, acceptance criteria, and edge-case behaviors.

---

## Story Index & Priority Summary

| Story ID | Domain Area | Title | Priority |
| :--- | :--- | :--- | :--- |
| **US-01** | Platform / Provisioning | Super Admin Business Provisioning & Initial Owner Assignment | **P0** |
| **US-02** | Security / Auth | Cryptographic Single-Use Invitation & Password Setup | **P0** |
| **US-03** | Tenancy / Identity | Multi-Business Membership & Active Tenant Switching | **P0** |
| **US-04** | Tenancy / Governance | Business Owner Limit Enforcement (1–10 Owners) | **P0** |
| **US-05** | Security / Tenancy | Strict Cross-Tenant Data Isolation | **P0** |
| **US-06** | Finance / Operations | Income & Expense Logging with Receipt Attachments | **P0** |
| **US-07** | Finance / Approvals | Two-Tier Expense Approval Workflow | **P1** |
| **US-08** | Finance / Equity | Partner Capital Contribution & Loan Ledger | **P1** |
| **US-09** | Finance / Closing | Accounting Period Close & Profit-Sharing Distribution | **P1** |
| **US-10** | Inventory / Core | Product Catalog & Stock Movement Reconciliation | **P0** |
| **US-11** | Mushroom / Lifecycle | Mushroom Recipe BOM & Production Batch Initialization | **P0** |
| **US-12** | Mushroom / Cultivation | Phase Advancements, Incubation & Chamber Tracking | **P0** |
| **US-13** | Mushroom / Harvest | Flush Harvesting, Quality Grading & Stock Influx | **P0** |
| **US-14** | Mushroom / Quality | Contamination Outbreak & Discarded Bag Tracking | **P1** |
| **US-15** | Mushroom / Processing | Fresh-to-Dried Dehydration & Yield Ratio Logging | **P1** |
| **US-16** | Auditing / Compliance | Immutable Tenant Audit Trail & Data Export | **P1** |

---

## Detailed Specifications

### US-01: Super Admin Business Provisioning & Initial Owner Assignment
- **User Role**: Platform Super Admin
- **Story**: As a Super Admin, I want to provision a new business tenant and designate an initial owner so that an enterprise customer can onboard smoothly.
- **Business Value**: Enables managed SaaS provisioning while establishing formal tenant ownership and root data structures.
- **Priority**: **P0**
- **Preconditions**:
  - Super Admin is authenticated with platform administration credentials.
- **Acceptance Criteria**:
  1. The creation form requires `Business Name`, `URL Slug` (alphanumeric with hyphens), `Max Owners` (integer between 1 and 10), and `Primary Owner Email`.
  2. The server verifies that the `URL Slug` is globally unique; duplicate slugs are rejected with an inline validation error.
  3. The system generates a `Business` record with status `PENDING_SETUP`.
  4. The system creates a single-use invitation token valid for 48 hours and dispatches an onboarding email to the primary owner.
  5. The creation event is written to `PlatformAuditLog` containing Super Admin ID, business ID, and timestamp.
- **Error & Edge Cases**:
  - *Max Owners out of bounds*: Values `< 1` or `> 10` are rejected with HTTP 422 before database execution.
  - *Invalid email*: Malformed emails fail Zod validation immediately.
- **Dependencies**: None.
- **Related Module**: Platform Administration.

---

### US-02: Cryptographic Single-Use Invitation & Password Setup
- **User Role**: Primary Owner / Invited Member
- **Story**: As an invited user, I want to set up my account using a secure, single-use link so that I can establish my credentials without passwords being exposed in email.
- **Business Value**: Eliminates plaintext password transmissions and guarantees account ownership verification.
- **Priority**: **P0**
- **Preconditions**:
  - An invitation token exists in the database with status `PENDING` and `expiresAt > now()`.
- **Acceptance Criteria**:
  1. Navigating to `/invite/[token]` queries the token hash; if valid, displays the setup screen pre-filled with the invited email and target business name.
  2. The user enters their full name and a password meeting policy (min 10 chars, uppercase, lowercase, number, symbol).
  3. Upon submission, the password is hashed with Argon2id or bcrypt before persistence.
  4. The invitation token status transitions atomically to `CONSUMED`.
  5. Subsequent attempts to load the same token display: `"This invitation link has already been used."`
  6. If the invited email already has an active account, the UI prompts for login and automatically creates the new `Membership` record upon successful authentication.
- **Error & Edge Cases**:
  - *Expired token*: If `expiresAt <= now()`, displays `"Invitation expired. Please contact your business administrator to resend."`
  - *Revoked token*: If marked `REVOKED`, link display states `"Invitation was cancelled by the business."`
- **Dependencies**: US-01.
- **Related Module**: Authentication & Identity.

---

### US-03: Multi-Business Membership & Active Tenant Switching
- **User Role**: Multi-Business User (Owner / Partner)
- **Story**: As a user belonging to multiple businesses, I want to switch my active business context seamlessly without logging out and back in.
- **Business Value**: Enables entrepreneurs and investors to manage multiple entities from a unified login.
- **Priority**: **P0**
- **Preconditions**:
  - User has active memberships in at least two distinct businesses.
- **Acceptance Criteria**:
  1. The top navigation bar presents a persistent **Business Selector** showing the current business name and user role.
  2. Clicking the selector displays a list of all businesses where the user has active membership.
  3. Selecting a different business updates the active tenant cookie/session state and redirects to the dashboard of the selected business.
  4. All subsequent API queries and Server Actions execute strictly using the newly active `businessId`.
  5. Permissions dynamically re-evaluate to match the user's role in the newly selected business.
- **Error & Edge Cases**:
  - *Suspended business*: If one of the user's businesses is suspended, it appears greyed out with a `"Suspended"` badge and cannot be switched into.
- **Dependencies**: US-02.
- **Related Module**: Tenancy & Session Management.

---

### US-04: Business Owner Limit Enforcement (1–10 Owners)
- **User Role**: Business Owner
- **Story**: As a Business Owner, I want the system to enforce the configured owner limit (1–10) so that partnership boundaries remain within agreed governance constraints.
- **Business Value**: Protects commercial SaaS licensing limits and prevents unauthorized equity dilution.
- **Priority**: **P0**
- **Preconditions**:
  - Business has a configured `maxOwners` value (e.g., 3).
- **Acceptance Criteria**:
  1. The Owner/Partner management page shows current owners count and pending owner invites against the quota: `"Owners: 2 of 3 assigned (1 pending invite)"`.
  2. If `activeOwners + pendingOwnerInvites >= maxOwners`, the `"Invite Co-Owner"` button is disabled in the UI.
  3. Server-side validation actively counts existing owners and pending invites in a database transaction before creating any new owner invite; requests exceeding the limit return HTTP 409 Conflict with `"Maximum owner limit reached for this business."`
  4. Revoking a pending owner invite immediately decrements the reserved seat count.
- **Error & Edge Cases**:
  - *Concurrent invites*: Two owners attempting to send invites simultaneously are serialized via row-locking to ensure the total never exceeds `maxOwners`.
- **Dependencies**: US-01, US-02.
- **Related Module**: Member & Ownership Governance.

---

### US-05: Strict Cross-Tenant Data Isolation
- **User Role**: Any Authenticated User
- **Story**: As a business owner, I require all data queries to be scoped strictly to my business so that no competitor or external user can access my confidential records.
- **Business Value**: Core SaaS security and legal compliance invariant; prevents catastrophic cross-tenant data leaks.
- **Priority**: **P0**
- **Preconditions**:
  - User is authenticated with an active session in Business A.
- **Acceptance Criteria**:
  1. Every database query touching tenant-scoped tables (`Income`, `Expense`, `Batch`, `Product`, `Order`, `Customer`) explicitly injects `where: { businessId: session.businessId }`.
  2. Attempting to fetch a record by ID that belongs to Business B (e.g., `GET /api/batches/[idFromBusinessB]`) returns HTTP 404 Not Found (or HTTP 403 Forbidden).
  3. Mutation requests (update/delete) with an ID belonging to Business B fail silently or reject without modifying Business B data.
  4. Client payload injection of a foreign `businessId` is ignored; the server unconditionally overwrites `businessId` from the cryptographically verified session.
- **Error & Edge Cases**:
  - *Forged session cookie*: Tampered session cookies immediately invalidate and force re-authentication.
- **Dependencies**: US-03.
- **Related Module**: Platform Security & Data Layer.

---

### US-06: Income & Expense Logging with Receipt Attachments
- **User Role**: Business Owner / Financial Partner
- **Story**: As a finance user, I want to record revenues and expenses with categorized details and receipt attachments so that our financial records are audit-ready.
- **Business Value**: Ensures accurate bookkeeping, cash flow visibility, and receipt retention for tax compliance.
- **Priority**: **P0**
- **Preconditions**:
  - User possesses `finance:create` permission in the active business.
- **Acceptance Criteria**:
  1. Expense form requires: `Date`, `Category` (e.g., Substrate, Utilities, Labor, Packaging), `Amount`, `Payment Method` (Cash, Bank Transfer, Card), and `Description`.
  2. Supports uploading receipt files (`.jpg`, `.png`, `.pdf`) up to 5MB, stored with unique cryptographic filenames.
  3. Submitting the form creates an immutable financial ledger entry with the authenticated creator's ID.
  4. If the expense amount is below the business approval threshold, it is automatically committed as `ACTIVE`.
  5. The real-time cash balance and dashboard monthly expense totals update immediately.
- **Error & Edge Cases**:
  - *Invalid file type*: Uploading executable files (`.exe`, `.sh`) or files over 5MB triggers client and server rejection.
  - *Negative amounts*: Amounts `<= 0` fail Zod schema validation.
- **Dependencies**: US-05.
- **Related Module**: Core Finance.

---

### US-07: Two-Tier Expense Approval Workflow
- **User Role**: Business Owner
- **Story**: As a Business Owner, I want expenses exceeding a set threshold to require owner approval before ledger commitment so that unauthorized spending is prevented.
- **Business Value**: Internal financial control and fraud prevention for partnerships.
- **Priority**: **P1**
- **Preconditions**:
  - Business has configured an expense approval threshold (e.g., $500).
- **Acceptance Criteria**:
  1. Any expense submitted with `amount > threshold` is saved with status `PENDING_APPROVAL`.
  2. Pending expenses appear in the Owner's approval queue with full receipt preview.
  3. The Owner can click `"Approve"` or `"Reject"` (with mandatory rejection comments).
  4. Approved expenses transition to `APPROVED` and are factored into net profit calculations.
  5. The submitter cannot approve their own expense unless they are the sole registered owner.
- **Error & Edge Cases**:
  - *Approval threshold set to 0*: Disables threshold requirements; all expenses commit automatically.
- **Dependencies**: US-06.
- **Related Module**: Core Finance.

---

### US-08: Partner Capital Contribution & Loan Ledger
- **User Role**: Business Owner / Partner
- **Story**: As a partner, I want to record and track partner capital contributions and loans separately so that equity balances and debts are transparent.
- **Business Value**: Protects investor capital and clarifies liability obligations between partners.
- **Priority**: **P1**
- **Preconditions**:
  - User has `finance:capital:read` or `finance:capital:manage` permission.
- **Acceptance Criteria**:
  1. System provides distinct categories for **Capital Injections** (equity) vs **Partner Loans** (liability).
  2. Partner loan records capture principal, annual interest rate (%), start date, and maturity date.
  3. Loan repayment disbursements automatically reduce the loan balance without being misclassified as business dividend profit distributions.
  4. Partner capital statements show initial injection, subsequent additions, approved withdrawals, and ending equity.
- **Error & Edge Cases**:
  - *Withdrawal exceeding capital balance*: System displays a warning modal requiring confirmation before approving draws that would result in a negative capital balance.
- **Dependencies**: US-06.
- **Related Module**: Core Finance & Governance.

---

### US-09: Accounting Period Close & Profit-Sharing Distribution
- **User Role**: Business Owner
- **Story**: As a Business Owner, I want to close an accounting period and calculate profit distributions so that partners receive their agreed share based on established rules.
- **Business Value**: Prevents retroactive bookkeeping tampering and ensures fair, transparent dividend allocation.
- **Priority**: **P1**
- **Preconditions**:
  - Previous accounting period is closed; target period end date is past.
- **Acceptance Criteria**:
  1. Owner selects the accounting period (e.g., "October 2026") and reviews the Net Operating Profit.
  2. System prompts for Retained Earnings Reserve percentage (default: 0–100%, e.g., 20%).
  3. Distributable Profit is computed: `Net Profit * (1 - Reserve %)`.
  4. Distributable Profit is allocated to each partner according to their active `profitSharePercentage`.
  5. Clicking `"Lock & Finalize Period"` marks the period `CLOSED`, freezes all transaction ledgers for that date range, and creates permanent distribution statements.
- **Error & Edge Cases**:
  - *Negative Net Profit (Operating Loss)*: System calculates loss allocation per agreed loss-sharing ratio and offsets partner equity or carries forward to next period without disbursing funds.
- **Dependencies**: US-06, US-08.
- **Related Module**: Core Finance.

---

### US-10: Product Catalog & Stock Movement Reconciliation
- **User Role**: Operations Partner / Staff
- **Story**: As an operations user, I want to manage our product catalog and track inventory movements so that stock levels are accurate.
- **Business Value**: Prevents stockouts, tracks shrinkage, and supports order fulfillment.
- **Priority**: **P0**
- **Preconditions**:
  - User has `inventory:manage` permission.
- **Acceptance Criteria**:
  1. Products support SKU, name, unit of measure (kg, bag, piece), unit cost, sale price, and reorder point.
  2. Stock movements log quantity, movement type (`PURCHASE_RECEIPT`, `PRODUCTION_CONSUMPTION`, `PRODUCTION_YIELD`, `SALE_FULFILLMENT`, `SCRAP_ADJUSTMENT`), and timestamp.
  3. Current stock on hand is calculated as an aggregate of movements or a reconciled snapshot.
  4. If stock falls below the reorder point, the item is flagged with a `"Low Stock"` badge on the inventory dashboard.
- **Error & Edge Cases**:
  - *Negative inventory prevention*: Outward stock movements that would drive inventory below zero require explicit confirmation override.
- **Dependencies**: US-05.
- **Related Module**: Core Inventory.

---

### US-11: Mushroom Recipe BOM & Production Batch Initialization
- **User Role**: Operations Partner / Cultivation Lead
- **Story**: As a cultivation manager, I want to define substrate recipes and launch new production batches so that material consumption is tracked accurately.
- **Business Value**: Standardizes cultivation recipes and guarantees traceability from raw materials to harvest.
- **Priority**: **P0**
- **Preconditions**:
  - Mushroom strain master (e.g., "Oyster - Pleurotus ostreatus") and raw materials (sawdust, bran) exist in inventory.
- **Acceptance Criteria**:
  1. Recipe configuration defines percentage/mass ratios of ingredients per standard production bag.
  2. Batch creation requires: `Strain Selection`, `Recipe Selection`, `Total Bags Prepared`, and `Batch Start Date`.
  3. System automatically generates a unique batch code: `MB-[STRAIN]-[YYYYMMDD]-[SEQ]`.
  4. System computes total raw materials required and automatically generates `PRODUCTION_CONSUMPTION` stock movements in Core Inventory.
  5. The batch initializes in phase `PREPARATION`.
- **Error & Edge Cases**:
  - *Insufficient raw materials*: System warns the user if inventory levels of raw ingredients are lower than the recipe requirement, allowing save with warning.
- **Dependencies**: US-10.
- **Related Module**: Mushroom Production Module.

---

### US-12: Phase Advancements, Incubation & Chamber Tracking
- **User Role**: Cultivation Technician / Operations Lead
- **Story**: As a technician, I want to log environmental readings and advance batches through sterilization, inoculation, incubation, and fruiting phases.
- **Business Value**: Provides complete lifecycle visibility and environmental control to maximize biological efficiency.
- **Priority**: **P0**
- **Preconditions**:
  - An active batch exists in the system.
- **Acceptance Criteria**:
  1. Batches follow strict sequential phase states: `PREPARATION` -> `STERILIZATION` -> `INOCULATION` -> `INCUBATION` -> `FRUITING` -> `COMPLETED`.
  2. During `INCUBATION`, technicians can log daily room temperature (°C), relative humidity (RH %), and colonization progress (0–100%).
  3. Advancing to `FRUITING` requires specifying the destination `Fruiting Chamber / Room ID`.
  4. System records the technician ID, timestamp, and phase transition notes in the batch history.
- **Error & Edge Cases**:
  - *Skipping phases*: Advancing out-of-order (e.g., Preparation straight to Fruiting) is rejected by state-machine validation.
- **Dependencies**: US-11.
- **Related Module**: Mushroom Production Module.

---

### US-13: Flush Harvesting, Quality Grading & Stock Influx
- **User Role**: Cultivation Technician / Operations Partner
- **Story**: As a technician, I want to record harvest yields by flush number and quality grade so that fresh mushroom inventory is immediately available for sale.
- **Business Value**: Accurately tracks crop yield, picker productivity, and automates fresh goods inventory intake.
- **Priority**: **P0**
- **Preconditions**:
  - Target batch is currently in the `FRUITING` phase.
- **Acceptance Criteria**:
  1. Harvest entry requires: `Batch ID`, `Flush Number` (Flush 1, Flush 2, Flush 3), `Harvest Date`, `Total Fresh Weight (kg)`, and `Quality Grade Breakdown` (Grade A, Grade B, Processing).
  2. Submitting the harvest creates a `HarvestLog` record linked to the batch.
  3. System automatically generates a `PRODUCTION_YIELD` inventory movement, increasing on-hand stock of the corresponding Fresh Mushroom SKU.
  4. The batch overview calculates and displays cumulative yield (kg) and Biological Efficiency (BE % = Total Fresh Harvest kg / Dry Substrate kg * 100).
- **Error & Edge Cases**:
  - *Flush number > 5*: System requires confirmation for unusually high flush counts.
  - *Zero weight*: Weight `<= 0` fails validation.
- **Dependencies**: US-10, US-12.
- **Related Module**: Mushroom Production Module.

---

### US-14: Contamination Outbreak & Discarded Bag Tracking
- **User Role**: Cultivation Technician / Operations Partner
- **Story**: As a technician, I want to record contaminated and discarded bags with specific failure reasons so that root causes of crop failure can be diagnosed.
- **Business Value**: Minimizes biological loss, isolates infected chambers, and tracks cost of scrap.
- **Priority**: **P1**
- **Preconditions**:
  - An active batch has remaining viable bags.
- **Acceptance Criteria**:
  1. Contamination form requires: `Batch ID`, `Phase Detected`, `Bags Discarded Count`, and `Contamination Reason` (e.g., Green Mold / Trichoderma, Cobweb, Bacterial Blotch, Rodent/Pest, Sterilization Failure).
  2. The system decrements the batch's `viableBagsCount`.
  3. If all bags in a batch are discarded, the batch automatically transitions to `TERMINATED_CONTAMINATED`.
  4. Contamination loss metrics update on the cultivation analytics dashboard.
- **Error & Edge Cases**:
  - *Bags discarded > viable bags*: Submitting a discard count higher than the remaining bags is rejected with HTTP 422.
- **Dependencies**: US-11, US-12.
- **Related Module**: Mushroom Production Module.

---

### US-15: Fresh-to-Dried Dehydration & Yield Ratio Logging
- **User Role**: Operations Partner / Technician
- **Story**: As an operations user, I want to record the transfer of fresh mushrooms into the drying chamber and log the output dried weight so that value-added inventory is tracked.
- **Business Value**: Tracks inventory transformation, shrinkage metrics, and dried product availability.
- **Priority**: **P1**
- **Preconditions**:
  - On-hand stock of Fresh Mushroom SKU is greater than zero.
- **Acceptance Criteria**:
  1. Dehydration form prompts for `Input Fresh Mushroom SKU`, `Input Fresh Weight (kg)`, and `Drying Chamber / Machine ID`.
  2. System decreases Fresh Mushroom stock via `PRODUCTION_CONSUMPTION`.
  3. Upon completion, user logs `Final Dried Weight (kg)`.
  4. System calculates Moisture Loss % and Dehydration Yield Ratio (e.g., 10 kg fresh -> 1.05 kg dried = 10.5% yield).
  5. System increases Dried Mushroom SKU stock via `PRODUCTION_YIELD`.
- **Error & Edge Cases**:
  - *Dried weight > fresh weight*: Physically impossible and rejected with validation error.
- **Dependencies**: US-10, US-13.
- **Related Module**: Mushroom Production Module.

---

### US-16: Immutable Tenant Audit Trail & Data Export
- **User Role**: Business Owner / Auditor
- **Story**: As an Owner or Auditor, I want to inspect an immutable log of critical business actions and export records to CSV/PDF so that compliance and governance are verifiable.
- **Business Value**: Provides fraud detection, operational accountability, and easy tax reporting.
- **Priority**: **P1**
- **Preconditions**:
  - User has `audit:read` or `audit:export` permission.
- **Acceptance Criteria**:
  1. The system logs every critical mutation (user invite, role change, expense approval, period close, batch termination) with User ID, IP address, timestamp, action type, and diff of changes.
  2. The audit trail is strictly append-only; no user or API can update or delete audit records.
  3. Users can filter logs by actor, action type, and date range.
  4. Export buttons generate clean CSV or formatted PDF documents of financial transactions, harvest logs, and customer ledgers.
- **Error & Edge Cases**:
  - *Large export volume*: Exports exceeding 5,000 records stream asynchronously or paginate cleanly without memory crash.
- **Dependencies**: US-05.
- **Related Module**: Auditing & Compliance.
