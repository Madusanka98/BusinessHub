# Database Backup & Restore Runbook — BusinessHub-SaaS

**Document Status**: Verified with automated test execution  
**Target Engine**: MySQL 8.0+ / MariaDB 10.4+ with InnoDB engine  
**Tooling**: `mysqldump`, `mysql`, `scripts/db-backup.ts`, `scripts/db-restore.ts`

---

## 1. Objectives & Service Level Targets

> [!IMPORTANT]
> The Recovery Point Objective (RPO) and Recovery Time Objective (RTO) below are **proposed operational targets** based on architecture capabilities, not vendor-backed service level guarantees.

- **Proposed Recovery Point Objective (RPO)**: **24 hours** for standard daily automated dumps (or **1 hour** if MySQL binary logging / point-in-time recovery is enabled on a VPS).
- **Proposed Recovery Time Objective (RTO)**: **< 30 minutes** to provision target database, restore schema + data, and run verification smoke tests.

---

## 2. Backup Strategy & Procedure

### 2.1 Backup Automation Script
BusinessHub-SaaS provides an automated script at `scripts/db-backup.ts` that safely generates a self-contained SQL dump using `--single-transaction` (ensuring non-blocking reads across InnoDB tables), `--routines`, and `--triggers`.

```bash
# Execute local database dump
npx tsx scripts/db-backup.ts
```

### 2.2 Direct CLI Procedure (Hostinger / Production Server)
```bash
# Standard non-locking InnoDB dump command:
mysqldump -h 127.0.0.1 -P 3306 -u <DB_USER> -p \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --default-character-set=utf8mb4 \
  <DATABASE_NAME> | gzip > /var/backups/businesshub/db_backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### 2.3 Storage, Encryption & Security Guidelines
1. **At-Rest Encryption**: Compress and encrypt dumps using GPG or OpenSSL AES-256 before transferring offsite:
   ```bash
   openssl enc -aes-256-cbc -salt -pbkdf2 -in backup.sql.gz -out backup.sql.gz.enc -pass pass:<BACKUP_ENCRYPTION_KEY>
   ```
2. **Access Permissions**: Backup files must be set to `chmod 600` (readable only by the backup system user).
3. **Offsite Replication**: Store encrypted dumps in an isolated S3 bucket or external SFTP with write-once/immutable object locking enabled.
4. **Git Isolation**: The `backups/` directory and all `*.sql` files are strictly ignored in `.gitignore`. **NEVER** commit dumps to Git.

### 2.4 Backup Retention Policy
- **Daily Backups**: Retain for **14 days**.
- **Weekly Backups**: Retain for **8 weeks**.
- **Monthly Backups**: Retain for **12 months**.
- **Pre-Migration Backups**: Retain indefinitely in cold storage until the release milestone is decommissioned.

---

## 3. Restore & Disaster Recovery Procedure

### 3.1 Isolated Staging / Verification Restore
Before applying changes or restoring to production, backups must be restored to an isolated database (e.g. `businesshub_restore_test`) to verify data integrity:

```bash
# Automated restore script
npx tsx scripts/db-restore.ts backups/<backup_file>.sql businesshub_restore_test
```

### 3.2 Manual CLI Restore Procedure
```bash
# 1. Create target isolated database
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS businesshub_restore_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Decompress and import
mysql -u root -p businesshub_restore_test < backup.sql
```

### 3.3 Post-Restore Data Integrity Verification Checklist
1. **Schema Validation**: Verify all 39 Prisma tables exist:
   ```sql
   SELECT count(*) FROM information_schema.tables WHERE table_schema = 'businesshub_restore_test';
   -- Expect count: 39 tables
   ```
2. **Financial Balance Verification**: Ensure financial transactions reconcile with business ledgers:
   ```sql
   SELECT b.name, t.type, SUM(t.amount) as total_amount
   FROM FinancialTransaction t
   JOIN Business b ON t.businessId = b.id
   WHERE t.approvalStatus = 'ACTIVE'
   GROUP BY b.id, t.type;
   ```
3. **Inventory Quantity Check**: Ensure stock movements reconcile with product stock on hand.
4. **Prisma Migration Alignment**: Verify the Prisma migration history table is intact:
   ```sql
   SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;
   ```

---

## 4. Actual Automated Test Verification

A live backup and restore drill was executed on October 18, 2026:
1. **Backup Phase**:
   - Source Database: `businesshub_dev` (MySQL localhost:3306).
   - Generated Artifact: `backups/backup-businesshub_dev-2026-10-17T20-23-36-008Z.sql` (99.65 KB).
   - Result: Successful dump without lock contention.
2. **Restore Phase**:
   - Target Database: `businesshub_restore_test`.
   - Result: Successfully restored **39 out of 39 tables**.
   - Verification status: **PASSED**.
