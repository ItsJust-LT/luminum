import { Command } from "commander";
import { output } from "../lib/output.js";

const EXPECTED_VARS = [
  { name: "DATABASE_URL", required: true, description: "PostgreSQL connection string" },
  { name: "APP_URL", required: false, description: "Dashboard URL (for links, CORS)" },
  { name: "API_URL", required: false, description: "API public URL" },
  { name: "API_WS_URL", required: false, description: "API WebSocket URL" },
  { name: "CRON_SECRET", required: false, description: "Secret for cron endpoint auth" },
  { name: "PAYSTACK_SECRET", required: false, description: "Paystack API secret key" },
  { name: "CORS_ORIGINS", required: false, description: "Comma-separated CORS origins" },
  { name: "NODE_ENV", required: false, description: "Environment (production, development)" },
  { name: "PORT", required: false, description: "API server port (default: 4000)" },
];

export function configCommand() {
  return new Command("config")
    .description("Show expected environment variables and their status")
    .option("--json", "Output as JSON")
    .action((opts: { json?: boolean }) => {
      const vars = EXPECTED_VARS.map((v) => ({
        name: v.name,
        required: v.required ? "YES" : "",
        set: process.env[v.name] ? "SET" : "MISSING",
        description: v.description,
      }));

      if (opts.json) {
        output(vars, true);
      } else {
        const maxName = vars.reduce((m, v) => Math.max(m, v.name.length), 0);
        for (const v of vars) {
          const status = process.env[v.name] ? "\x1b[32mSET\x1b[0m" : (v.required === "YES" ? "\x1b[31mMISSING\x1b[0m" : "\x1b[33mMISSING\x1b[0m");
          console.log(`  ${v.name.padEnd(maxName)}  ${status}  ${v.description}`);
        }
      }
    });
}
