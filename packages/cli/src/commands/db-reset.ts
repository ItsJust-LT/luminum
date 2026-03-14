import { Command } from "commander";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function dbResetCommand() {
  return new Command("reset")
    .description("Reset database (development only)")
    .option("--force", "Skip safety check")
    .action((opts: { force?: boolean }) => {
      if (process.env.NODE_ENV === "production" && !opts.force) {
        console.error("Refusing to reset in production. Use --force to override.");
        process.exitCode = 1;
        return;
      }

      if (!opts.force) {
        console.error("This will destroy all data. Re-run with --force to confirm.");
        process.exitCode = 1;
        return;
      }

      if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL is not set.");
        process.exitCode = 1;
        return;
      }

      const dbPackage = resolve(__dirname, "../../..", "database");

      try {
        console.log("Resetting database...");
        execSync("npx prisma migrate reset --force", {
          cwd: dbPackage,
          stdio: "inherit",
          env: { ...process.env },
        });
        console.log("Database reset complete.");
      } catch {
        console.error("Database reset failed.");
        process.exitCode = 1;
      }
    });
}
