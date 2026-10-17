# Non-Functional Requirements (NFR) Specification — BusinessHub SaaS

This document defines the quality attributes, security standards, performance benchmarks, and compliance criteria for **BusinessHub SaaS**.

---

## 1. Security & Data Protection

### 1.1 Authentication & Session Management
- **Password Storage**: Passwords must be hashed using **Argon2id** (memory cost: 64MB, time cost: 3 iterations) or **bcrypt** (work factor: 12). Plaintext passwords must never be stored, logged, or transmitted in notifications.
- **Session Security**: Session tokens are cryptographically generated (256-bit entropy), stored in database-backed sessions or encrypted JWTs, and delivered via `HttpOnly`, `Secure` (in production), `SameSite=Lax` cookies.
- **Brute Force Protection**: Failed login attempts are throttled to a maximum of 5 attempts per 15-minute window per IP/email address using memory or database rate limiting.

### 1.2 Tenant Isolation & Zero-Trust Access
- **Mandatory Discriminator Scoping**: Every database query touching tenant-scoped tables must explicitly include `where: { businessId: session.businessId }`.
- **Server-Derived Identity**: The `businessId` is derived exclusively from the authenticated session context on the server, never accepted from user-submitted request bodies or query parameters.
- **Cross-Tenant Access Rejection**: Any attempt to access, mutate, or delete a record belonging to another `businessId` must return HTTP 404 (or HTTP 403) and log a security alert to the system audit trail.

### 1.3 Vulnerability Defenses
- **SQL Injection**: Prevented by design through Prisma ORM's parameterized query engine. Raw SQL queries (`$queryRaw`) are strictly forbidden unless accompanied by explicit parameter binding and architectural review.
- **Cross-Site Scripting (XSS)**: Handled by React's automatic string escaping. Any rich text or markdown rendering must sanitize HTML via `DOMPurify` or `sanitize-html`.
- **Cross-Site Request Forgery (CSRF)**: Next.js App Router Server Actions inherently enforce origin and host header verification, blocking cross-origin form submissions.
- **Secret Hygiene**: Sensitive credentials (`DATABASE_URL`, `NEXTAUTH_SECRET`, SMTP passwords) must never be prefixed with `NEXT_PUBLIC_` and must be excluded from Git via `.gitignore`.

---

## 2. Reliability, Auditing & Backup

### 2.1 Audit Immutability
- All high-impact business events (user invitations, role modifications, expense approvals, period finalizations, batch terminations) must generate an append-only `AuditLog` entry.
- Audit records must capture `businessId`, `userId`, `actionType`, `targetEntityId`, `clientIp`, `timestamp`, and a JSON diff of changed attributes.
- Audit tables must have no `UPDATE` or `DELETE` API endpoints exposed under any user role.

### 2.2 Database Backup & Disaster Recovery
- **Development**: Local database dumps using `mysqldump` prior to non-idempotent migration operations.
- **Production (Hostinger)**: Automated daily MySQL snapshot backups retained for 30 days, with point-in-time recovery capability.
- **Recovery Time Objective (RTO)**: Target recovery within 2 hours of a critical infrastructure failure.
- **Recovery Point Objective (RPO)**: Maximum acceptable data loss not to exceed 24 hours (daily backup baseline).

---

## 3. Performance & Scalability

### 3.1 Response Time Benchmarks
| Operation Type | Target P95 Latency (Local & Hostinger VPS) | Measurement Conditions |
| :--- | :--- | :--- |
| **Static / Cached Pages** | `< 100 ms` | Marketing and public login routes. |
| **Authenticated Dashboards** | `< 350 ms` | Dashboard load with aggregate queries and active tenant context. |
| **Server Action Mutations** | `< 250 ms` | Expense creation, batch phase advancement, harvest logging. |
| **Complex Report Generation** | `< 1,500 ms` | Monthly P&L or batch yield calculation over 10,000 records. |

### 3.2 Database Indexing Standards
- Every tenant model must maintain a compound index on `[businessId, createdAt]` to accelerate multi-tenant pagination.
- Foreign keys (`batchId`, `productId`, `userId`, `categoryId`) must be explicitly indexed.
- Unique constraints must always combine the natural key with `businessId` (e.g., `@@unique([businessId, sku])`, `@@unique([businessId, batchCode])`).

---

## 4. Usability, Accessibility & Mobile Readiness

### 4.1 Accessibility (a11y)
- UI components must comply with **WCAG 2.1 Level AA** standards.
- Form controls must feature explicit `<label>` bindings, aria descriptions, and visible focus rings.
- Color palettes must maintain a minimum contrast ratio of `4.5:1` for standard text and `3:1` for large text and interactive components.

### 4.2 Responsive & Field-Worker Usability
- Primary administrative dashboards are optimized for desktop displays (`>= 1024px`).
- Operational cultivation screens (`/mushroom/batches/[id]`, `/mushroom/harvests`, `/mushroom/fruiting`) must be fully responsive and touch-friendly for tablet and mobile devices (`>= 375px`) used by greenhouse staff wearing gloves.
- Button tap targets must measure at least `44x44px` on mobile breakpoints.

---

## 5. Deployment, Portability & Hosting Architecture

### 5.1 Local to Hostinger Migration Readiness
- **Runtime Environment**: Node.js v24.x runtime, compatible with standalone Next.js server output (`output: 'standalone'`) or lightweight Docker containers.
- **Database Engine**: Standard MySQL 8.0+ or MariaDB 10.6+ without reliance on proprietary cloud-specific database extensions.
- **Reverse Proxy**: NGINX or Caddy handling SSL/TLS termination, HTTP/2, and proxying requests to the Node.js application process managed by PM2 or Docker.
- **Temporary Tunneling**: Cloudflare Tunnel configured strictly for manual, temporary external stakeholder demonstrations, never running as an unmonitored persistent daemon.

---

## 6. Testing & Quality Gate Strategy

- **Unit Tests**: Zod schemas, utility calculations (Biological Efficiency %, profit distribution math, token hash verification) must achieve > 90% unit test coverage using Vitest/Jest.
- **Tenant Isolation Tests**: Automated integration tests verifying that authenticated queries for Tenant A return zero records belonging to Tenant B.
- **End-to-End (E2E) Browser Tests**: Playwright automated test suites covering critical P0 journeys:
  1. Super Admin creates business -> Primary Owner accepts invite -> Sets password.
  2. Owner invites co-owner -> 1–10 owner limit enforcement check.
  3. Cultivation technician creates batch -> advances phases -> logs harvest -> verifies inventory stock increase.
- **Pre-Commit Quality Gate**: Zero lint errors (`npm run lint`), zero TypeScript errors (`tsc --noEmit`), and 100% passing test suites before any branch merge.
