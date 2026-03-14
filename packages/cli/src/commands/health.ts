import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { output } from "../lib/output.js";

export function healthCommand() {
  return new Command("health")
    .description("Check database connectivity")
    .option("--json", "Output as JSON")
    .action(async (opts: { json?: boolean }) => {
      try {
        await withDb(async (prisma) => {
          const start = Date.now();
          await prisma.$queryRawUnsafe("SELECT 1");
          const latency = Date.now() - start;

          if (opts.json) {
            output({ status: "ok", latency_ms: latency }, true);
          } else {
            console.log(`Database: OK (${latency}ms)`);
          }
        });
      } catch {
        if (opts.json) {
          output({ status: "error" }, true);
        } else {
          console.error("Database: UNREACHABLE");
        }
        process.exitCode = 1;
      }
    });
}
