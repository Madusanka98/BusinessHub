# Staged Database Migration & Production Release Runbook

**Document Status**: Operational Runbook  
**Target Platform**: Hostinger KVM VPS / Ubuntu 24.04 LTS with MySQL 8.0 & Node.js 20+

> [!CAUTION]
> **CRITICAL PRODUCTION SAFETY INVARIANTS**:
> 1. **NEVER** execute `npx prisma migrate reset` or `prisma db push --force-reset` on staging or production.
> 2. **NEVER** run database seeds that overwrite or truncate real tenant data.
> 3. Always take a fresh database snapshot immediately prior to running `prisma migrate deploy`.
> 4. Do not initiate production deployment without explicit user authorization.

---

## Staged Release Execution Process

### Phase 1: Pre-Release Freeze & Artifact Verification
1. Freeze release candidate commit on branch `feature/task-09-security-testing-deployment`.
2. Verify all local checks pass:
   ```bash
   npm run lint
   npx tsc --noEmit
   npm test
   npm run build
   ```
3. Merge feature branch into `main` after user review.

---

### Phase 2: Database Backup & Isolation Drill
1. Trigger automated dump on current database:
   ```bash
   npx tsx scripts/db-backup.ts
   ```
2. Verify dump integrity by executing isolated restore:
   ```bash
   npx tsx scripts/db-restore.ts backups/<latest_dump>.sql businesshub_staging_verify
   ```
3. Confirm table count equals 39 and check that foreign keys and indexes are intact.

---

### Phase 3: Staging Environment Deployment
1. Set environment variables on the target server matching `.env.example`.
2. Apply pending Prisma migrations non-destructively:
   ```bash
   npx prisma migrate deploy
   ```
3. Launch staging service via PM2:
   ```bash
   pm2 start npm --name "businesshub-staging" -- run start
   ```
4. Execute staging smoke tests:
   - Check `/api/health` returns `status: "ok"`.
   - Test login with verified test credentials.
   - Verify sales order creation and stock decrement.
   - Verify mushroom batch harvest recording.
   - Verify cron execution endpoint `/api/cron/reports?key=<CRON_SECRET>`.

---

### Phase 4: Production Deployment (Requires Explicit User Approval)
1. **User Sign-Off**: Confirm user has backed up production and approved maintenance window.
2. **Maintenance Mode**: If downtime is expected, route Nginx to a static 503 maintenance page.
3. **Execute Production Migration**:
   ```bash
   npx prisma migrate deploy
   ```
4. **Deploy Application Code**:
   ```bash
   git pull origin main
   npm ci --omit=dev
   npx prisma generate
   npm run build
   pm2 restart businesshub-production
   ```
5. **Verify Production Health**:
   - Query `/api/health`.
   - Perform end-to-end smoke check.
   - Remove maintenance mode.

---

## Rollback Contingency Procedures

If any critical error occurs during production deployment:

### Scenario A: Application Code Failure (Schema Intact)
1. Revert to previous Git commit:
   ```bash
   git checkout <PREVIOUS_STABLE_COMMIT_HASH>
   npm run build
   pm2 restart businesshub-production
   ```

### Scenario B: Database Migration Failure
1. Immediately stop the application service:
   ```bash
   pm2 stop businesshub-production
   ```
2. Restore the pre-migration snapshot taken in Phase 2:
   ```bash
   mysql -u <DB_USER> -p <DB_NAME> < backups/<pre_migration_dump>.sql
   ```
3. Restart the previous stable application version:
   ```bash
   pm2 restart businesshub-production
   ```
4. Document the failure reason, Prisma migration error log, and notify stakeholders.
