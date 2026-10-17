import fs from "fs";
import path from "path";
import { execSync } from "child_process";

function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const f of envFiles) {
    const fullPath = path.resolve(process.cwd(), f);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}
loadEnv();

function findMysqldump(): string {
  // Check if mysqldump is directly in PATH
  try {
    execSync("mysqldump --version", { stdio: "ignore" });
    return "mysqldump";
  } catch {
    // Check common local XAMPP installation paths
    const xamppPath = "C:\\xampp\\mysql\\bin\\mysqldump.exe";
    if (fs.existsSync(xamppPath)) {
      return `"${xamppPath}"`;
    }
    throw new Error("mysqldump CLI binary not found in PATH or standard XAMPP directory.");
  }
}

export function parseDatabaseUrl(urlStr?: string) {
  loadEnv();
  const dbUrl = urlStr || process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL is not set.");

  const parsed = new URL(dbUrl);
  return {
    user: decodeURIComponent(parsed.username || "root"),
    password: decodeURIComponent(parsed.password || ""),
    host: parsed.hostname || "127.0.0.1",
    port: parsed.port || "3306",
    database: parsed.pathname.replace(/^\//, ""),
  };
}

export async function createDatabaseBackup(outputDir: string = "backups"): Promise<string> {
  const mysqldumpBin = findMysqldump();
  const dbConfig = parseDatabaseUrl();

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `backup-${dbConfig.database}-${timestamp}.sql`;
  const targetFile = path.resolve(outputDir, filename);

  const pwdArg = dbConfig.password ? `-p"${dbConfig.password}"` : "";
  const cmd = `${mysqldumpBin} -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.user} ${pwdArg} --single-transaction --quick --routines --triggers ${dbConfig.database} > "${targetFile}"`;

  console.log(`[BACKUP] Initiating database dump for: ${dbConfig.database} on ${dbConfig.host}:${dbConfig.port}...`);
  execSync(cmd, { stdio: "inherit", shell: "cmd.exe" });

  const stats = fs.statSync(targetFile);
  console.log(`[BACKUP] Backup completed successfully: ${targetFile} (${(stats.size / 1024).toFixed(2)} KB)`);

  return targetFile;
}

if (process.argv[1] && process.argv[1].includes("db-backup")) {
  createDatabaseBackup()
    .then((filePath) => console.log(`Backup written to: ${filePath}`))
    .catch((err) => {
      console.error("[BACKUP ERROR]:", err.message);
      process.exit(1);
    });
}
