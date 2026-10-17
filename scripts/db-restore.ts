import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { parseDatabaseUrl } from "./db-backup";

function findMysqlClient(): string {
  try {
    execSync("mysql --version", { stdio: "ignore" });
    return "mysql";
  } catch {
    const xamppPath = "C:\\xampp\\mysql\\bin\\mysql.exe";
    if (fs.existsSync(xamppPath)) {
      return `"${xamppPath}"`;
    }
    throw new Error("mysql CLI binary not found in PATH or standard XAMPP directory.");
  }
}

export async function restoreDatabaseToIsolatedTarget(
  backupSqlFile: string,
  targetDbName: string = "businesshub_restore_test"
): Promise<{ success: boolean; targetDatabase: string; tableCount: number }> {
  if (!fs.existsSync(backupSqlFile)) {
    throw new Error(`Backup file does not exist: ${backupSqlFile}`);
  }

  const mysqlBin = findMysqlClient();
  const dbConfig = parseDatabaseUrl();
  const pwdArg = dbConfig.password ? `-p"${dbConfig.password}"` : "";

  console.log(`[RESTORE] Ensuring target isolated database "${targetDbName}" exists...`);
  // Create test database
  const createDbCmd = `${mysqlBin} -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.user} ${pwdArg} -e "CREATE DATABASE IF NOT EXISTS \`${targetDbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"`;
  execSync(createDbCmd, { stdio: "inherit", shell: "cmd.exe" });

  console.log(`[RESTORE] Restoring ${backupSqlFile} into "${targetDbName}"...`);
  const restoreCmd = `${mysqlBin} -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.user} ${pwdArg} ${targetDbName} < "${backupSqlFile}"`;
  execSync(restoreCmd, { stdio: "inherit", shell: "cmd.exe" });

  console.log(`[RESTORE] Verifying restored schema and table counts in "${targetDbName}"...`);
  const verifyCmd = `${mysqlBin} -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.user} ${pwdArg} -N -s -e "SELECT count(*) FROM information_schema.tables WHERE table_schema = '${targetDbName}';"`;
  const tableCountStr = execSync(verifyCmd, { shell: "cmd.exe", encoding: "utf-8" }).trim();
  const tableCount = parseInt(tableCountStr, 10) || 0;

  console.log(`[RESTORE] Verification complete: Restored ${tableCount} tables in ${targetDbName}.`);
  return { success: true, targetDatabase: targetDbName, tableCount };
}

if (process.argv[1] && process.argv[1].includes("db-restore")) {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error("Usage: npx tsx scripts/db-restore.ts <path-to-backup.sql> [target_db_name]");
    process.exit(1);
  }
  const targetDb = process.argv[3] || "businesshub_restore_test";

  restoreDatabaseToIsolatedTarget(fileArg, targetDb)
    .then((res) => console.log(`[RESTORE SUCCESS]:`, res))
    .catch((err) => {
      console.error("[RESTORE ERROR]:", err.message);
      process.exit(1);
    });
}
