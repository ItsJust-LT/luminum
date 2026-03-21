#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";

// Create
import { createAdminCommand } from "./commands/create-admin.js";

// User
import { userListCommand } from "./commands/user-list.js";
import { userShowCommand } from "./commands/user-show.js";
import { userBanCommand } from "./commands/user-ban.js";
import { userUnbanCommand } from "./commands/user-unban.js";
import { userSetRoleCommand } from "./commands/user-set-role.js";
import { userDeactivateCommand } from "./commands/user-deactivate.js";
import { userSessionsCommand } from "./commands/user-sessions.js";

// Organization
import { orgListCommand } from "./commands/org-list.js";
import { orgShowCommand } from "./commands/org-show.js";
import { orgCreateCommand } from "./commands/org-create.js";
import { orgUpdateCommand } from "./commands/org-update.js";
import { orgMembersCommand } from "./commands/org-members.js";
import { orgInviteCommand } from "./commands/org-invite.js";
import { orgWebsitesCommand } from "./commands/org-websites.js";
import { orgEnableEmailCommand } from "./commands/org-enable-email.js";
import { orgDisableEmailCommand } from "./commands/org-disable-email.js";
import { orgCheckDnsCommand } from "./commands/org-check-dns.js";

// Website
import { websiteListCommand } from "./commands/website-list.js";
import { websiteShowCommand } from "./commands/website-show.js";
import { websiteCreateCommand } from "./commands/website-create.js";
import { websiteDeleteCommand } from "./commands/website-delete.js";

// Subscription
import { subscriptionListCommand } from "./commands/subscription-list.js";
import { subscriptionShowCommand } from "./commands/subscription-show.js";
import { subscriptionSetStatusCommand } from "./commands/subscription-set-status.js";

// Email
import { emailListCommand } from "./commands/email-list.js";
import { emailCountCommand } from "./commands/email-count.js";
import { emailShowCommand } from "./commands/email-show.js";

// Support
import { supportListCommand } from "./commands/support-list.js";
import { supportShowCommand } from "./commands/support-show.js";
import { supportCloseCommand } from "./commands/support-close.js";
import { supportAssignCommand } from "./commands/support-assign.js";

// Forms
import { formsSubmissionsCommand } from "./commands/forms-submissions.js";
import { formsCountCommand } from "./commands/forms-count.js";

// DB
import { dbMigrateCommand } from "./commands/db-migrate.js";
import { dbStatusCommand } from "./commands/db-status.js";
import { dbResetCommand } from "./commands/db-reset.js";

// Cron
import { cronVerifyEmailDnsCommand } from "./commands/cron-verify-email-dns.js";
import { cronRunSiteAuditsCommand } from "./commands/cron-run-site-audits.js";
import { cronListCommand } from "./commands/cron-list.js";

// System
import { healthCommand } from "./commands/health.js";
import { configCommand } from "./commands/config.js";
import { statsCommand } from "./commands/stats.js";

const program = new Command();

program
  .name("luminum")
  .description("CLI for Luminum – manage users, organizations, and system from the server")
  .version("0.0.1");

// ─── create ────────────────────────────────────────────────────────────────
program
  .command("create")
  .description("Create or update resources")
  .addCommand(createAdminCommand());

// ─── user ──────────────────────────────────────────────────────────────────
const user = program.command("user").description("Manage users");
user.addCommand(userListCommand());
user.addCommand(userShowCommand());
user.addCommand(userBanCommand());
user.addCommand(userUnbanCommand());
user.addCommand(userSetRoleCommand());
user.addCommand(userDeactivateCommand());
user.addCommand(userSessionsCommand());

// ─── org ───────────────────────────────────────────────────────────────────
const org = program.command("org").description("Manage organizations");
org.addCommand(orgListCommand());
org.addCommand(orgShowCommand());
org.addCommand(orgCreateCommand());
org.addCommand(orgUpdateCommand());
org.addCommand(orgMembersCommand());
org.addCommand(orgInviteCommand());
org.addCommand(orgWebsitesCommand());
org.addCommand(orgEnableEmailCommand());
org.addCommand(orgDisableEmailCommand());
org.addCommand(orgCheckDnsCommand());

// ─── website ───────────────────────────────────────────────────────────────
const website = program.command("website").description("Manage websites");
website.addCommand(websiteListCommand());
website.addCommand(websiteShowCommand());
website.addCommand(websiteCreateCommand());
website.addCommand(websiteDeleteCommand());

// ─── subscription ──────────────────────────────────────────────────────────
const subscription = program.command("subscription").description("Manage subscriptions");
subscription.addCommand(subscriptionListCommand());
subscription.addCommand(subscriptionShowCommand());
subscription.addCommand(subscriptionSetStatusCommand());

// ─── email ─────────────────────────────────────────────────────────────────
const email = program.command("email").description("Manage emails");
email.addCommand(emailListCommand());
email.addCommand(emailCountCommand());
email.addCommand(emailShowCommand());

// ─── support ───────────────────────────────────────────────────────────────
const support = program.command("support").description("Manage support tickets");
support.addCommand(supportListCommand());
support.addCommand(supportShowCommand());
support.addCommand(supportCloseCommand());
support.addCommand(supportAssignCommand());

// ─── forms ─────────────────────────────────────────────────────────────────
const forms = program.command("forms").description("Manage form submissions");
forms.addCommand(formsSubmissionsCommand());
forms.addCommand(formsCountCommand());

// ─── db ────────────────────────────────────────────────────────────────────
const db = program.command("db").description("Database management");
db.addCommand(dbMigrateCommand());
db.addCommand(dbStatusCommand());
db.addCommand(dbResetCommand());

// ─── cron ──────────────────────────────────────────────────────────────────
const cron = program.command("cron").description("Run scheduled jobs manually");
cron.addCommand(cronVerifyEmailDnsCommand());
cron.addCommand(cronRunSiteAuditsCommand());
cron.addCommand(cronListCommand());

// ─── system (top-level) ────────────────────────────────────────────────────
program.addCommand(healthCommand());
program.addCommand(configCommand());
program.addCommand(statsCommand());

program.parse();
