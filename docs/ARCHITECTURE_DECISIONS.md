# Architecture Decision Records (ADRs) & Technology Choices

This document logs fundamental architectural choices, their trade-offs, and open design questions for **BusinessHub SaaS**.

---

## ADR 01: Core Web Framework & Language
- **Decision**: Next.js App Router with TypeScript (Strict Mode).
- **Status**: Accepted.
- **Context**: Need a robust full-stack React framework capable of server-side data fetching, secure Server Actions, SEO-friendly marketing pages, and fast administrative dashboards.
- **Consequences**:
  - React Server Components (RSC) reduce client bundle size and protect database logic.
  - Next.js App Router requires disciplined layout nesting and clear separation between server and client boundaries.

---

## ADR 02: Multi-Tenancy Data Architecture
- **Decision**: **Shared Database, Shared Schema with Discriminator Column (`businessId`)**.
- **Status**: Accepted.
- **Context**: Need a scalable, maintainable multi-tenant architecture suitable for small-to-medium businesses deployable to Hostinger MySQL without running separate database servers per tenant.
- **Consequences**:
  - **Pros**: Streamlined database migrations (one schema update applies to all tenants), lower hosting and connection pool overhead.
  - **Cons**: Requires strict, fail-safe application-level data isolation. Every database query involving tenant data must include `where: { businessId }`.
  - **Mitigation**: Utilize Prisma Client extensions or repository-layer middleware to automatically inject and verify `businessId` checks on tenant models.

---

## ADR 03: Database & ORM
- **Decision**: MySQL 8.x with Prisma ORM.
- **Status**: Accepted.
- **Context**: The target production hosting is a Hostinger VPS or Cloud plan with native MySQL support.
- **Consequences**:
  - Strong relational consistency, foreign key constraints, and ACID transactions for financial and batch records.
  - Prisma provides type-safe query generation and migration tracking via `prisma migrate`.

---

## ADR 04: UI Component Architecture & Styling
- **Decision**: Tailwind CSS with shadcn/ui (Radix UI primitives).
- **Status**: Accepted.
- **Context**: Need a clean, professional, accessible, and easily customizable design system.
- **Consequences**:
  - Components live directly in the repository codebase (`components/ui`), allowing full customization without black-box npm package locks.
  - Tailwind utilities guarantee zero runtime CSS evaluation overhead.

---

## ADR 05: Modular Domain Extension (Mushroom Cultivation)
- **Decision**: Decouple specialized mushroom cultivation modules from core business models via foreign key relations, rather than intertwining generic and specialized tables.
- **Status**: Accepted.
- **Context**: BusinessHub SaaS serves general businesses first; mushroom production is a specialized pluggable module.
- **Consequences**:
  - Core models (`InventoryItem`, `Order`, `Expense`) remain domain-agnostic.
  - `MushroomBatch` references `InventoryItem` for raw inputs (spawn, substrate) and outputs (harvested mushrooms) without forcing mushroom fields onto general inventory items.

---

## ADR 06: Authentication & Multi-Owner Model
- **Decision**: User identity is globally unique and independent of any single business. A `Membership` pivot table associates a `User` with a `Business` and defines their role (`OWNER`, `MANAGER`, `MEMBER`).
- **Status**: Accepted.
- **Context**: Business requirements specify:
  1. Each user has an individual account.
  2. One user can belong to multiple businesses.
  3. A business can have 1–10 owners.
  4. Super Admin creates businesses and assigns initial owners.
- **Consequences**:
  - Sessions track the authenticated `userId` and an active `currentBusinessId`.
  - Switching businesses simply changes the active tenant context without re-authenticating.

---

## Open Architecture Questions & Decisions for Future Tasks

| # | Question / Decision Area | Options Considered | Resolution Target |
| :--- | :--- | :--- | :--- |
| **Q1** | **Session Implementation** | NextAuth / Auth.js v5 vs. Iron-Session / Custom Database Session | Task 2 & Task 4 |
| **Q2** | **Asynchronous Job & Email Queue** | In-memory / Next.js Cron vs. Redis BullMQ vs. Database Queue (`Job` table) | Task 4 & Task 6 |
| **Q3** | **Media / Attachment Storage** | Local filesystem (Hostinger disk) vs. S3-compatible Object Storage (Cloudflare R2 / Hostinger Object Storage) | Task 7 |
| **Q4** | **Hostinger Deployment Mode** | Docker Container via VPS vs. Standalone Node.js process managed with PM2 | Task 9 |
