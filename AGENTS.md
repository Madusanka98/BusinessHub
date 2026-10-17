# BusinessHub SaaS — AI Agent Operating Instructions (`AGENTS.md`)

This file defines the mandatory operating guidelines, coding conventions, architectural boundaries, security policies, and Git workflows for AI agents working in this repository.

---

## 1. Project Purpose & Multi-Tenant Architectural Constraints

**BusinessHub SaaS** is a multi-tenant business management platform designed for general small-to-medium businesses with specialized domain extensions (such as mushroom cultivation/production management).

### Mandatory Business Invariants:
1. **User Identity & Multi-Tenancy**:
   - Every user has an individual account and unique identity (`User`).
   - One user can belong to multiple businesses (`Business`) with distinct roles (`BusinessMember` / `Membership`).
   - A business can have multiple owners, constrained by a configurable business rule (1–10 owners).
2. **Authorization & Role Boundaries**:
   - **Super Admin**: Platform-level administration (system settings, creating businesses, assigning primary owners).
   - **Business Owner**: Manages business profile, billing, invites partners and managers, configures business modules.
   - **Business Member**: Role-scoped permissions within that specific business.
   - **Tenant Isolation**: Every database read, write, update, and delete for business data **MUST** filter explicitly by `businessId`. No cross-tenant data leaks are acceptable.
3. **Invitations & Credential Safety**:
   - User onboarding to a business uses expiring, single-use cryptographically secure invitation links sent to verified email addresses.
   - **NEVER** generate, store, log, or email plaintext passwords.
4. **Modularity**:
   - The mushroom-production workflow is a specialized extension module with clean domain boundaries, not the core architecture. Core business management (inventory, sales, finance, members) must remain domain-agnostic.

---

## 2. Technology Stack & Environment Execution Rules

- **Framework**: Next.js App Router (TypeScript strict mode)
- **Database & ORM**: MySQL with Prisma ORM
- **UI & Styling**: Tailwind CSS, shadcn/ui, Lucide Icons
- **Validation**: Zod (all Server Actions, route handlers, and form inputs)
- **Runtime & OS**: Node.js v24.x on Windows (PowerShell / cmd.exe)

### Windows Execution Note:
Windows PowerShell may block running `.ps1` scripts due to system execution policies (`PSSecurityException`). Always invoke package scripts using `cmd.exe /c npm ...` or `npm.cmd ...`:
```powershell
# Development server
cmd.exe /c npm run dev

# Linting & Type-Checking
cmd.exe /c npm run lint
cmd.exe /c npm run typecheck

# Database migrations
cmd.exe /c npx prisma migrate dev

# Running tests
cmd.exe /c npm test
```

---

## 3. Coding Conventions & Standards

- **Server-First Components**: Default to React Server Components (RSC). Use `"use client"` only when browser interactivity, client state, or event listeners are required.
- **Data Mutations**: Use Next.js Server Actions with Zod schema validation and authenticated tenant session checks.
- **Naming Conventions**:
  - Components: `PascalCase.tsx`
  - Utilities / Services / Actions: `camelCase.ts`
  - Directories / Routes: `kebab-case`
  - Database Models: `PascalCase` singular (`User`, `Business`, `BusinessMember`)
- **Zero Type Suppression**: Do not use `any` or `@ts-ignore` unless isolating third-party untyped dependencies with documented rationale.

---

## 4. Security & Data Protection Standards

1. **Tenant Filtering**: Every Prisma query touching business data must explicitly include `where: { businessId, ... }` derived from the validated server session, never blindly from client payload.
2. **Environment Variables**:
   - Never prefix secrets or database credentials with `NEXT_PUBLIC_`.
   - Never commit `.env` or local configuration to Git.
3. **Password & Token Storage**:
   - Passwords must be hashed with `argon2` or `bcrypt` (adequate work factor).
   - Invitation and password-reset tokens must be cryptographically hashed (e.g., SHA-256) when stored in the database, with explicit expiry timestamps.
4. **Network Exposure**:
   - MySQL must listen only on localhost (`127.0.0.1`) during development. Never expose MySQL directly to the public internet.
   - Cloudflare Tunnel or local tunneling tools are strictly for temporary manual external testing and must never run continuously as background daemons without explicit user direction.

---

## 5. Database Migration Rules

1. Always use `npx.cmd prisma migrate dev --name <migration_name>` for schema modifications during development.
2. Never execute destructive resets (`prisma migrate reset` or `prisma db push --force-reset`) without explicit confirmation and verification of backup.
3. Check generated SQL in `prisma/migrations/` before committing.
4. Database seeds must be idempotent and must not pollute development databases with realistic PII or live credentials.

---

## 6. Git Branching, Commits, and Verification Workflow

- **Branch Naming**:
  - Task 0: `feature/task-00-development-foundation`
  - Task 1: `feature/task-01-requirements`
  - Task 2: `feature/task-02-architecture`
  - Task N: `feature/task-XX-<slug>`
- **Pre-Commit Quality Gate**:
  - Ensure zero lint errors, zero TypeScript errors, and all tests pass.
  - Run `git diff` and `git diff --cached` to verify no secrets (`.env`), build artifacts (`.next`), or unintended files are staged.
- **Conventional Commits**: Use structured messages (e.g., `feat:`, `fix:`, `chore:`, `docs:`, `test:`).
- **Remote Push**: Push the feature branch to the configured remote once checks pass. If no remote exists or authentication fails, report the status and provide exact manual instructions. Never force push.

---

## 7. AI Agent Operating Protocol

1. **Inspect Before Changing**: Always inspect the filesystem, dependencies, and git status before proposing or making edits.
2. **Version-Matched Documentation**:
   - When Next.js is installed, verify the exact version in `package.json` and consult matching official Next.js documentation.
   - Do not hallucinate or fabricate installed doc paths if the package is not yet initialized.
   - Do not run `@next/codemod` or migration tools blindly without inspecting effects.
3. **Verify Every Task**:
   - Run relevant validation commands (type checks, linter, tests, build) before declaring completion.
   - If verification fails or blockers arise, **never falsely report success**. Explain the exact failure and remedial steps.
