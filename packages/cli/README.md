# Luminum CLI

Server-side CLI for managing the Luminum platform. Connects directly to the database (same as the API) and lets you manage users, organizations, websites, subscriptions, emails, support tickets, database migrations, and more.

## Requirements

- **Node.js** >= 18
- **DATABASE_URL** environment variable (PostgreSQL connection string)

## How the CLI Works

1. **Entry point:** `src/cli.ts` loads environment variables via `dotenv/config`, creates a Commander program, and registers all command groups.
2. **Commands:** Each command is a function in `src/commands/` that returns a Commander `Command()`. Commands are grouped under top-level groups like `user`, `org`, `website`, etc.
3. **Database:** Commands that need the database use the `withDb(fn)` helper from `src/lib/db.ts`. This creates a Prisma client, runs the provided function, then disconnects and sets `process.exitCode = 1` on error.
4. **Resolvers:** `src/lib/resolve.ts` provides `resolveUser`, `resolveOrg`, and `resolveWebsite` to look up entities by ID, email, slug, or domain.
5. **Output:** Commands support `--json` for machine-readable output and human-friendly tables/key-value display via `src/lib/output.ts`.
6. **Build:** TypeScript compiles to `dist/`. You must build before running.

## Setup

From the repo root:

```bash
pnpm install
pnpm build
```

## Running

**From repo root (recommended):**

```bash
pnpm run cli -- <command> [args] [options]
```

**From this package:**

```bash
pnpm --filter luminum run start -- <command> [args] [options]
```

**Direct (after build):**

```bash
node packages/cli/dist/cli.js <command> [args] [options]
```

**Global install (on deployed server):**

```bash
cd packages/cli && pnpm build && pnpm add -g .
luminum <command> [args] [options]
```

## Command Reference

### create

| Command | Description |
|---------|-------------|
| `create admin <email>` | Set a user as admin |
| `create admin <email> --remove` | Remove admin role |

### user

| Command | Description |
|---------|-------------|
| `user list` | List users. Options: `--limit`, `--role`, `--banned`, `--json` |
| `user show <email\|id>` | Show user details |
| `user ban <email>` | Ban a user. Options: `--reason`, `--expires` |
| `user unban <email>` | Unban a user |
| `user set-role <email> <role>` | Set role to `admin` or `user` |
| `user deactivate <email>` | Deactivate a user (ban with standard reason) |
| `user sessions <email>` | List sessions. Options: `--revoke-all`, `--json` |

### org

| Command | Description |
|---------|-------------|
| `org list` | List organizations. Options: `--limit`, `--slug`, `--status`, `--json` |
| `org show <id\|slug>` | Show organization with members, websites, subscriptions |
| `org create` | Create organization. Options: `--name`, `--slug`, `--owner-email`, `--domain`, `--currency`, `--country`, `--subscription-type`, `--trial-days` |
| `org update <id\|slug>` | Update organization. Options: `--name`, `--slug`, `--billing-email`, `--subscription-status`, `--currency`, `--country` |
| `org members <id\|slug>` | List organization members |
| `org invite <id\|slug> <email>` | Create invitation. Options: `--role`, `--expires-days` |
| `org websites <id\|slug>` | List organization websites |
| `org enable-email <id\|slug>` | Enable email. Options: `--website-id`, `--domain`, `--from-address`, `--skip-mx` |
| `org disable-email <id\|slug>` | Disable email for organization |
| `org check-dns <id\|slug>` | Check MX/SPF records. Options: `--spf`, `--json` |

### website

| Command | Description |
|---------|-------------|
| `website list` | List websites. Options: `--org`, `--limit`, `--json` |
| `website show <id\|domain>` | Show website details |
| `website create` | Create website. Options: `--org`, `--domain`, `--name`, `--analytics` |
| `website delete <id\|domain>` | Delete website (cascades). Requires `--force` |

### subscription

| Command | Description |
|---------|-------------|
| `subscription list` | List subscriptions. Options: `--org`, `--status`, `--limit`, `--json` |
| `subscription show <id>` | Show subscription details |
| `subscription set-status <id> <status>` | Set status (no provider sync). Statuses: `active`, `canceled`, `trialing`, `past_due`, `paused` |

### email

| Command | Description |
|---------|-------------|
| `email list` | List emails. Options: `--org`, `--direction`, `--since`, `--limit`, `--json` |
| `email count` | Count emails. Options: `--org`, `--direction`, `--json` |
| `email show <id>` | Show email details with attachments |

### support

| Command | Description |
|---------|-------------|
| `support list` | List tickets. Options: `--status`, `--org`, `--limit`, `--json` |
| `support show <ticket-id\|number>` | Show ticket with messages and participants |
| `support close <ticket-id>` | Close a ticket. Options: `--resolved` |
| `support assign <ticket-id> <email>` | Assign ticket to a user |

### forms

| Command | Description |
|---------|-------------|
| `forms submissions` | List form submissions. Options: `--website-id`, `--limit`, `--json` |
| `forms count` | Count submissions. Options: `--website-id`, `--json` |

### db

| Command | Description |
|---------|-------------|
| `db migrate` | Run `prisma migrate deploy` |
| `db status` | Show migration status |
| `db reset` | Reset database. Requires `--force` |

### cron

| Command | Description |
|---------|-------------|
| `cron verify-email-dns` | Re-check MX records for all orgs with email enabled |
| `cron list` | List available cron jobs |

### System (top-level)

| Command | Description |
|---------|-------------|
| `health` | Check database connectivity. Options: `--json` |
| `config` | Show expected env vars and which are set |
| `stats` | System-wide statistics. Options: `--json` |
| `--version` | Print CLI version |

## Examples

```bash
# Check system health
pnpm run cli -- health

# Show configuration status
pnpm run cli -- config

# Get system stats as JSON
pnpm run cli -- stats --json

# List all admin users
pnpm run cli -- user list --role admin

# Make a user admin
pnpm run cli -- create admin user@example.com

# Ban a user with reason
pnpm run cli -- user ban bad@example.com --reason "Spam"

# Show an organization
pnpm run cli -- org show my-org-slug

# Create an organization with owner
pnpm run cli -- org create --name "Acme Corp" --slug acme --owner-email owner@acme.com --domain acme.com

# Enable email for an org
pnpm run cli -- org enable-email acme --domain acme.com

# Run database migrations on deploy
pnpm run cli -- db migrate

# Check migration status
pnpm run cli -- db status

# Run email DNS verification job
pnpm run cli -- cron verify-email-dns

# List recent emails for an org
pnpm run cli -- email list --org acme --limit 10

# Close a support ticket
pnpm run cli -- support close TKT-001 --resolved
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `APP_URL` | No | Dashboard URL |
| `API_URL` | No | API public URL |
| `CRON_SECRET` | No | Cron endpoint auth (not needed for CLI) |
| `PAYSTACK_SECRET` | No | Paystack API key (not used by CLI) |
| `NODE_ENV` | No | Environment name |
