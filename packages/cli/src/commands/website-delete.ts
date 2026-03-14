import { Command } from "commander";
import { withDb } from "../lib/db.js";
import { resolveWebsite } from "../lib/resolve.js";

export function websiteDeleteCommand() {
  return new Command("delete")
    .description("Delete a website (cascades events, form submissions)")
    .argument("<id|domain>", "Website ID or domain")
    .option("--force", "Skip confirmation")
    .action(async (identifier: string, opts: { force?: boolean }) => {
      await withDb(async (prisma) => {
        const website = await resolveWebsite(prisma, identifier);
        if (!website) return;

        if (!opts.force) {
          console.error(`This will permanently delete "${website.domain}" and all associated data.`);
          console.error("Re-run with --force to confirm.");
          process.exitCode = 1;
          return;
        }

        await prisma.websites.delete({ where: { id: website.id } });
        console.log(`Website "${website.domain}" deleted.`);
      });
    });
}
