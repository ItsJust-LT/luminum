import { Command } from "commander";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function dbStatusCommand() {
  return new Command("status")
    .description("Show prisma migration status")
    .action(() => {
      if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL is not set.");
        process.exitCode = 1;
        return;
      }

      const dbPackage = resolve(__dirname, "../../..", "database");

      try {
        execSync("npx prisma migrate status", {
          cwd: dbPackage,
          stdio: "inherit",
          env: { ...process.env },
        });
      } catch {
        process.exitCode = 1;
      }
    });
}
