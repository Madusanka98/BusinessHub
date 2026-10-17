# Cloudflare External Testing Guide — BusinessHub-SaaS

**Document Status**: Operational Guide  
**Purpose**: Safe, temporary external stakeholder preview and mobile testing using Cloudflare Quick Tunnels.

---

## 1. Safety Policies & Prerequisites

> [!CAUTION]
> **Cloudflare Quick Tunnels are strictly for temporary manual testing**.
> - Quick Tunnel URLs are ephemeral (they expire upon terminal termination).
> - There is NO service uptime SLA.
> - **NEVER** expose local MySQL ports (3306) to the tunnel.
> - **NEVER** use real customer PII or production credentials during tunnel tests.
> - Only forward the local Next.js HTTP server port (3000).

---

## 2. Launching a Temporary Quick Tunnel

### Step 1: Start Next.js Development Server
Ensure the application is running locally on port 3000:
```powershell
cmd.exe /c npm run dev
```

### Step 2: Launch Cloudflare Quick Tunnel
Download `cloudflared` (if not already installed) and run without account credentials:
```powershell
cloudflared.exe tunnel --url http://localhost:3000
```
This generates an ephemeral HTTPS URL: `https://<random-slug>.trycloudflare.com`.

### Step 3: Update `APP_URL` & `NEXTAUTH_URL` (Temporary)
In `.env.local` (or passed as command-line env), update:
```env
APP_URL="https://<random-slug>.trycloudflare.com"
NEXTAUTH_URL="https://<random-slug>.trycloudflare.com"
```
Restart the dev server so email links and absolute redirects generate the tunnel domain.

---

## 3. External Testing Verification Matrix

| Test Journey | Action | Expected External Result | Status |
|---|---|---|---|
| **1. HTTPS Cookie Security** | Log in via tunnel URL | Session cookie set with `Secure; SameSite=Lax; HttpOnly`. Auth persists across requests. | Verified |
| **2. Protected Routes** | Direct browser access to `/dashboard` without session | Redirects cleanly to `/login?from=%2Fdashboard` via middleware. | Verified |
| **3. Tenant Isolation** | Access Tenant A resources with Tenant B session | HTTP 403 / Forbidden error thrown server-side. Zero data leakage. | Verified |
| **4. Invitation Onboarding** | Send partner invitation to test inbox; open link via tunnel | Single-use invitation token validated; user sets password and joins business. | Verified |
| **5. Sales & Stock Deduction** | Create and post a sales order on mobile via tunnel URL | Stock decremented in real-time; financial ledger entries created. | Verified |
| **6. Mushroom Production** | Update batch stage from Inoculation to Fruiting | Batch status advances, logs audit record, updates batch timeline. | Verified |
| **7. Scheduled Reports** | Trigger `/api/cron/reports?key=<secret>` | Returns `{ success: true, processedCount: ... }` with proper status code. | Verified |

---

## 4. Teardown & Post-Testing Cleanup

1. **Terminate Tunnel**: Press `Ctrl + C` in the `cloudflared` terminal window. The external URL is immediately deallocated.
2. **Revert Environment**: Revert `APP_URL` and `NEXTAUTH_URL` in `.env.local` back to `http://localhost:3000`.
3. **Purge Test Sessions**: Clear test browser cookies or restart local server.
