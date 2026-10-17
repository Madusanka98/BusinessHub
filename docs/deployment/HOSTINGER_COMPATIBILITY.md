# Hostinger Compatibility & Deployment Audit — BusinessHub-SaaS

**Document Status**: Technical Assessment  
**Current Compatibility Status**: **UNCONFIRMED (Awaiting User Hostinger Plan Specification)**

---

## 1. Hosting Architecture Requirements

BusinessHub-SaaS is built on:
- **Framework**: Next.js 15 (App Router with React Server Components and Server Actions).
- **Runtime**: Node.js v20.x or v22.x LTS.
- **Database Engine**: MySQL 8.0+ / MariaDB 10.4+ with InnoDB.
- **ORM**: Prisma ORM (requires platform-compatible Prisma query engine binaries).
- **Background Tasks**: External cron HTTP trigger or persistent Node scheduler.

---

## 2. Hostinger Plan Tier Evaluation

| Feature / Requirement | Hostinger Shared / Web Hosting | Hostinger Cloud Hosting | Hostinger VPS (KVM) |
|---|---|---|---|
| **Node.js Support** | Limited / CloudLinux Passenger (Often capped at older Node versions) | Supported via App Manager / Container | **Full Native Support (Node 20/22/24)** |
| **Next.js App Router (RSC & Server Actions)** | ❌ **High Risk / Incompatible** (Passenger struggles with long-running Next.js standalone server) | ⚠️ **Partial** (May run standalone server, but process restarts are common) | ✅ **Fully Compatible (Recommended)** |
| **Prisma Engine Binaries** | ❌ May fail due to missing native libraries or execution permissions in `/tmp` | ⚠️ Requires testing with Debian/Ubuntu engine targets | ✅ **Native compilation and glibc support** |
| **MySQL Database** | Provided via cPanel/hPanel, but connection limits (max_user_connections) are low | High resource limits | Dedicated MySQL instance with custom tuning |
| **Background / Cron Jobs** | Shared cron (min 1-minute interval, strict execution timeout) | Shared cron | Native Linux systemd timers / crontab / PM2 |
| **Process Manager (PM2 / Docker)** | ❌ Not permitted | ❌ Restricted | ✅ Full root access for PM2 / Docker |
| **SSL & Custom Domain** | Free Let's Encrypt | Free Let's Encrypt | Free Let's Encrypt via Certbot / Nginx |

---

## 3. Recommended Hosting Topology: Hostinger KVM VPS

Because Next.js 15 App Router utilizes persistent streaming connections, Server Actions, and Prisma binaries, **Hostinger KVM 1 or KVM 2 VPS** is the only reliable tier for production SaaS delivery.

### Recommended Stack on Hostinger VPS:
1. **OS**: Ubuntu 24.04 LTS.
2. **Web Server / Reverse Proxy**: Nginx (handling SSL termination, gzip/brotli compression, and proxying port 3000).
3. **Process Manager**: PM2 (running `npm start` or `node server.js` in Next.js standalone mode with auto-restart).
4. **Database**: Local or managed MySQL 8.0 listening strictly on `127.0.0.1`.
5. **Cron**: Hostinger cron or local crontab pinging `https://<domain>/api/cron/reports?key=<CRON_SECRET>`.

---

## 4. User Plan Verification Checklist

Before attempting deployment, the user must verify the following in their Hostinger dashboard:

- [ ] **Hosting Plan Name**: Is it **Shared Web Hosting**, **Cloud Hosting**, or **VPS**?
  - *If Shared Web Hosting*: We must **NOT** attempt production deployment here; Next.js 15 Server Actions and streaming will fail.
  - *If Cloud Hosting*: Verify if Node.js application manager allows setting Node >= 20.9.0 and custom start commands.
  - *If VPS*: Ready for automated deployment via SSH, Nginx, and PM2.
- [ ] **SSH Access**: Is SSH enabled and public key authentication configured?
- [ ] **MySQL Version**: Is MySQL 8.0+ or MariaDB 10.4+ available?
- [ ] **Memory Limit**: At least 1.5 GB RAM is required for Next.js production builds (or build locally/CI and deploy `.next/standalone`).

---

## 5. Deployment Alternatives (If Hostinger VPS is Unavailable)

If the user only has Hostinger Shared Web Hosting:
1. **Option A (Recommended)**: Upgrade Hostinger plan to **KVM 1 VPS** (~$5–$7/month).
2. **Option B (Hybrid Hosting)**:
   - Deploy Next.js frontend/backend on **Vercel** (Hobby or Pro tier).
   - Use Hostinger VPS or Remote MySQL for database storage (with SSL connection).
