# Architecture Decision Records (ADRs) — BusinessHub SaaS

This document establishes the formal Architecture Decision Records (ADRs) governing technical implementation for **BusinessHub SaaS**.

---

## Index of Decisions

- **ADR 01**: Modular Monolith over Distributed Microservices
- **ADR 02**: Shared Database & Shared Schema with Discriminator Column (`businessId`)
- **ADR 03**: MySQL 8.x with Prisma ORM
- **ADR 04**: Exact Decimal Representation for Monetary Amounts and Weights
- **ADR 05**: Concurrency-Safe Transactional Locking for Owner Quota (1–10)
- **ADR 06**: Decoupled Agricultural Domain Extension via Inventory Movement Influx
- **ADR 07**: Single-Use Cryptographic Onboarding Tokens with SHA-256 Storage
- **ADR 08**: Period Closing Immutability and Compensatory Reversal Accounting
- **ADR 09**: Next.js App Router Layer Separation (RSC, Server Actions, Route Handlers)
- **ADR 10**: Hostinger Portability via Standalone Node.js / Docker Engine

---

### ADR 01: Modular Monolith over Distributed Microservices
- **Status**: Accepted
- **Context**: The product requires complex cross-domain operations (e.g., deducting inventory materials, initializing a production batch, and updating partner equity). Target deployment is local development transitioning to a Hostinger VPS/Cloud environment.
- **Decision**: Build the application as a Modular Monolith within a single Next.js App Router codebase, using strict directory boundaries (`modules/*`) and TypeScript interfaces.
- **Consequences**:
  - Eliminates distributed network failure modes and complex RPC serialization overhead.
  - Allows cross-module operations to run within atomic database transactions (`prisma.$transaction`).
  - Keeps hosting costs minimal on Hostinger single-node servers.

---

### ADR 02: Shared Database & Shared Schema with Discriminator Column
- **Status**: Accepted
- **Context**: Need a scalable multi-tenant architecture suitable for dozens to hundreds of small business tenants without incurring separate database server or connection pool overhead per tenant.
- **Decision**: Adopt a Shared Database, Shared Schema architecture where all tenant-scoped tables include a `businessId` foreign key column.
- **Consequences**:
  - High efficiency: single connection pool and unified migration deployments (`prisma migrate deploy`).
  - Requires fail-safe application-level tenant isolation: every query must include `where: { businessId: context.businessId }`.
  - Enforced via compound indexes `[businessId, createdAt]` across all tenant models.

---

### ADR 03: MySQL 8.x with Prisma ORM
- **Status**: Accepted
- **Context**: Relational integrity, ACID transactions, and foreign key constraints are mandatory for financial and agricultural production records. Hostinger natively supports MySQL and MariaDB.
- **Decision**: Use MySQL 8.x (or MariaDB 10.6+) as the primary relational database, accessed via Prisma ORM.
- **Consequences**:
  - Provides type-safe database queries, schema validation, and tracked SQL migrations (`prisma/migrations/`).
  - Standardizes database types across development (XAMPP MariaDB) and production (Hostinger MySQL).

---

### ADR 04: Exact Decimal Representation for Monetary Amounts and Weights
- **Status**: Accepted
- **Context**: Floating-point numbers (`Float`, `Double`) suffer from binary representation inaccuracies (e.g., `0.1 + 0.2 = 0.30000000000000004`), which is unacceptable in financial ledgers and gram-level harvest measurements.
- **Decision**: All monetary columns are typed as `@db.Decimal(12, 2)`. All agricultural weights are typed as `@db.Decimal(10, 3)` (gram precision).
- **Consequences**:
  - Zero rounding drift in income, expenses, loan interest, or harvest yield aggregations.
  - In TypeScript, values are handled as strings, numbers, or `Prisma.Decimal` instances with explicit arithmetic methods.

---

### ADR 05: Concurrency-Safe Transactional Locking for Owner Quota (1–10)
- **Status**: Accepted
- **Context**: A business is configured with 1 to 10 owners. Concurrent invitation submissions could bypass naive count checks and exceed the configured quota.
- **Decision**: Enforce owner limits within a database transaction utilizing pessimistic row locking (`SELECT id, maxOwners FROM Business WHERE id = :id FOR UPDATE`) before checking active owners + pending invites.
- **Consequences**:
  - Prevents race conditions during simultaneous owner onboarding attempts.
  - Rejects excess invitations deterministically with HTTP 409 Conflict.

---

### ADR 06: Decoupled Agricultural Domain Extension via Inventory Influx
- **Status**: Accepted
- **Context**: BusinessHub SaaS serves general businesses first; the mushroom production module is a specialized vertical.
- **Decision**: The mushroom module interfaces with core inventory exclusively through standard `StockMovement` transactions (`PRODUCTION_CONSUMPTION` for substrate ingredients; `PRODUCTION_YIELD` for harvested fresh/dried mushrooms).
- **Consequences**:
  - Core business inventory and accounting schemas remain 100% domain-agnostic.
  - Future vertical modules (hydroponics, craft brewing) can reuse the identical inventory movement interface.

---

### ADR 07: Single-Use Cryptographic Onboarding Tokens with SHA-256 Storage
- **Status**: Accepted
- **Context**: Plaintext passwords must never be emailed. Setup links must be secure against brute-force guessing and database credential leaks.
- **Decision**: Issue 256-bit cryptographically random invitation tokens valid for 48 hours. Store only the SHA-256 hash in the database. Mark tokens `CONSUMED` atomically upon password establishment.
- **Consequences**:
  - If the database is compromised, unexpired invite tokens cannot be used to hijack accounts.
  - Links are strictly single-use and expire cleanly.

---

### ADR 08: Period Closing Immutability and Compensatory Reversal Accounting
- **Status**: Accepted
- **Context**: Historical financial records must not silently change when ownership percentages or tax rules change.
- **Decision**: Financial transactions in closed accounting periods are permanently locked (`isLocked: true`). Corrections must be posted as compensatory reversal transactions in the currently open period.
- **Consequences**:
  - Guarantees financial auditability and legal compliance.
  - Prevents retroactive distortion of partner dividends and past tax returns.

---

### ADR 09: Next.js App Router Layer Separation (RSC vs Actions vs Handlers)
- **Status**: Accepted
- **Context**: Need clear architectural guidelines on where data fetching, mutation, and file streaming occur in Next.js.
- **Decision**:
  - Use React Server Components (RSC) for all page data fetching and layout composition.
  - Use Server Actions with Zod schemas for all client form mutations.
  - Reserve Route Handlers (`app/api/*`) exclusively for external webhooks, file exports, and health checks.
- **Consequences**:
  - Minimal client JavaScript bundle size and maximum SEO performance.
  - Direct server RPC without maintaining redundant REST controller boilerplate.

---

### ADR 10: Hostinger Portability via Standalone Node.js / Docker Engine
- **Status**: Accepted
- **Context**: Application begins on local Windows machines, runs temporary tests via Cloudflare Tunnel, and migrates to Hostinger VPS/Cloud hosting in 2–3 months.
- **Decision**: Standardize Next.js output as standalone (`output: 'standalone'`) or containerize with Docker, avoiding proprietary cloud lock-in (e.g., AWS DynamoDB or Vercel-specific edge middleware).
- **Consequences**:
  - Fully portable across any standard Linux VPS with Node.js v24.x and MySQL.
  - Clean migration path without refactoring database or server logic.
