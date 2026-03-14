import { Command } from "commander";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function dbMigrateCommand() {
  return new Command("migrate")
    .description("Run prisma migrate deploy")
    .action(() => {
      if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL is not set.");
        process.exitCode = 1;
        return;
      }

      const dbPackage = resolve(__dirname, "../../..", "database");

      try {
        console.log("Running prisma migrate deploy...");
        execSync("npx prisma migrate deploy", {
          cwd: dbPackage,
          stdio: "inherit",
          env: { ...process.env },
        });
        console.log("Migration complete.");
      } catch {
        console.error("Migration failed.");
        process.exitCode = 1;
      }
    });
}
