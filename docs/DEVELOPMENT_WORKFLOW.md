# Development & Git Workflow Guide

This guide details local environment setup, verification routines, coding standards, and Git procedures for **BusinessHub SaaS**.

---

## 1. Environment & Tooling Prerequisites

| Component | Detected / Required Version | Command / Note |
| :--- | :--- | :--- |
| **Node.js** | v24.21.0 (Installed) | `node -v` |
| **npm** | v11.19.0 (Installed) | `npm.cmd -v` (Use `.cmd` or `cmd.exe /c` on Windows) |
| **Git** | 2.56.0 (Installed) | `git --version` |
| **MySQL** | 8.0+ or MariaDB 10.6+ | Local instance listening on `127.0.0.1:3306` |
| **OS** | Windows 11 / Windows PowerShell | Execution policy prevents `.ps1`; run `.cmd` binaries |

> [!IMPORTANT]
> **Windows PowerShell Execution Policy Note**:
> Running `npm` directly in PowerShell may trigger `PSSecurityException (cannot load npm.ps1)`. 
> Always execute commands using either `cmd.exe /c npm <command>` or `npm.cmd <command>`.

---

## 2. Local Setup Routine (Post-App Initialization)

Once the Next.js application scaffold is established in Task 1/2:

1. **Environment Configuration**:
   ```powershell
   Copy-Item .env.example .env.local
   ```
   Configure `DATABASE_URL` with your local MySQL credentials:
   ```env
   DATABASE_URL="mysql://root:yourpassword@127.0.0.1:3306/businesshub_dev"
   ```

2. **Database Provisioning & Migration**:
   ```powershell
   cmd.exe /c npx prisma migrate dev --name init
   cmd.exe /c npx prisma db seed
   ```

3. **Running Local Development Server**:
   ```powershell
   cmd.exe /c npm run dev
   ```
   The application will be accessible at [http://localhost:3000](http://localhost:3000).

---

## 3. Quality Verification Gate (Mandatory Pre-Commit Checks)

Before marking any task complete or committing code to Git, the following sequence must be run and must exit with code 0:

```powershell
# 1. Type-checking
cmd.exe /c npx tsc --noEmit

# 2. Code style & linting
cmd.exe /c npm run lint

# 3. Automated unit and integration tests
cmd.exe /c npm test

# 4. Production build smoke test
cmd.exe /c npm run build
```

> [!CAUTION]
> If any check fails, do NOT commit and do NOT mark the task complete. Debug and resolve the issue first.

---

## 4. Git Branching & Commit Protocol

### Branch Naming Standard
Every task operates on a dedicated branch created from `main`:
- Task 0: `feature/task-00-development-foundation`
- Task 1: `feature/task-01-requirements`
- Task 2: `feature/task-02-architecture`
- Task 3: `feature/task-03-database-schema`
- ...

```powershell
# Create and switch to new task branch
git checkout -b feature/task-XX-<description>
```

### Clean Staging & Secret Check
Before committing, inspect changes to ensure no sensitive files are accidentally included:
```powershell
git status
git diff
git diff --cached
```
Verify that:
- No `.env`, `.env.local`, or secret keys are staged.
- No database dumps (`*.sql`) or temporary files are staged.
- Only files pertinent to the current task are staged.

### Conventional Commits
Use semantic conventional commit messages:
- `feat:` A new user-facing feature or domain capability.
- `fix:` A bug fix in existing code.
- `chore:` Tooling, configuration, or environment setup.
- `docs:` Documentation updates.
- `refactor:` Code restructuring without behavioral change.
- `test:` Adding or updating test suites.

Example:
```powershell
git add <target_files>
git commit -m "chore: establish development workflow and agent instructions"
```

### Remote Push & Synchronization
```powershell
# Check configured remotes
git remote -v

# Push branch upstream
git push -u origin feature/task-XX-<description>
```
If no remote is configured (e.g., initial local repository):
1. Create a repository on GitHub.
2. Add remote: `git remote add origin https://github.com/<user>/<repo>.git`
3. Push: `git push -u origin feature/task-XX-<description>`

---

## 5. Temporary External Testing (Optional Cloudflare Tunnel)

For temporary testing with external stakeholders or mobile device validation:
1. Ensure the local Next.js server is running on port 3000.
2. Run ad-hoc tunnel via temporary Quick Tunnel:
   ```powershell
   cmd.exe /c npx cloudflared tunnel --url http://localhost:3000
   ```
3. Copy the generated `*.trycloudflare.com` URL.
4. Terminate the process immediately once testing completes.
5. **Never** expose the database port or leave tunnels active in the background.
