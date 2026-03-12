# Deploy Luminum to production (app / api / analytics subdomains)

This guide gets the full stack running on a single server with:

- **app.luminum.agency** → Dashboard  
- **api.luminum.agency** → API  
- **analytics.luminum.agency** → Analytics  

Using **Cloudflare** for DNS (and optional proxy) and **Caddy** on the server for HTTPS and reverse proxy.

---

## What you need

- A **server** (VPS) with a public IP, e.g. **Ubuntu 22.04** (or similar). The deploy workflow can **bootstrap** a fresh server: it will install Docker, Docker Compose, and Caddy if missing, and set up the Caddyfile. So you can use a blank Ubuntu box and only need SSH access (Step 2 secrets). Optionally, you can install Docker and Caddy yourself (Step 3) and the workflow will skip redundant work.
- **luminum.agency** (or your root domain) on **Cloudflare** (DNS managed there).
- This **repo** on GitHub with Actions enabled.
- About 30 minutes.

---

## Step 1: Cloudflare DNS

1. Log in to [Cloudflare](https://dash.cloudflare.com) and select the zone **luminum.agency** (or add it).
2. Go to **DNS** → **Records**.
3. Add **A** records pointing to your **server’s public IP**:

   | Type | Name     | Content        | Proxy status | TTL  |
   |------|----------|----------------|--------------|------|
   | A    | app      | YOUR_SERVER_IP | Proxied (orange cloud) or DNS only | Auto |
   | A    | api      | YOUR_SERVER_IP | Proxied or DNS only | Auto |
   | A    | analytics| YOUR_SERVER_IP | Proxied or DNS only | Auto |

   So you have three hostnames: `app`, `api`, `analytics` (each with Content = your server IP).

   **Optional:** If you prefer a wildcard, add one record: Type **A**, Name **\***, Content **YOUR_SERVER_IP**. Then `app`, `api`, and `analytics` all resolve to that IP (Cloudflare will still route by Host header).

4. **SSL/TLS** (recommended):  
   - Go to **SSL/TLS** → Overview.  
   - Set mode to **Full** or **Full (strict)**.  
   - With **Full (strict)**, the server must have a valid certificate; Caddy will get one from Let’s Encrypt.

   **Wildcard:** Instead of three A records, you can add one: Type **A**, Name **\***, Content **YOUR_SERVER_IP**. Then `*.luminum.agency` (including app, api, analytics) resolves to your server; Caddy still routes by hostname.

4. Save the records. After propagation, `app.luminum.agency`, `api.luminum.agency`, and `analytics.luminum.agency` should resolve to your server.

---

## Step 2: GitHub Secrets and Variables

In your GitHub repo: **Settings** → **Secrets and variables** → **Actions**.

### Repository secrets (encrypted)

Secrets are grouped by **environment** and **app**. Production only: use the **PROD_** prefix. **Server** credentials use the environment only (`PROD_SERVER_*`). **App** config uses environment + app (`PROD_API_*`). **Not in GitHub:** Postgres and Redis URLs/credentials (set on deployment / internal only).

#### Server (PROD_SERVER_*) and API (PROD_API_*)

| Secret name           | What to put |
|-----------------------|-------------|
| `PROD_SERVER_HOST` | Your server’s public IP or hostname (e.g. `123.45.67.89` or `server.luminum.agency`). |
| `PROD_SERVER_USER` | SSH user (e.g. `root` or `deploy`). |
| `PROD_SERVER_SSH_KEY` | Full contents of the **private** key used to SSH (e.g. `~/.ssh/id_rsa`). The matching public key must be in `~/.ssh/authorized_keys` on the server. |
| `PROD_SERVER_GHCR_TOKEN` | A GitHub **Personal Access Token** with scope `read:packages` (so the server can pull images from GHCR). Create under GitHub → Settings → Developer settings → Personal access tokens. |
| `PROD_API_BETTER_AUTH_SECRET` | Long random string (e.g. `openssl rand -hex 32`). |
| `PROD_API_WEBHOOK_SECRET` | Shared secret for webhooks (e.g. `openssl rand -hex 24`). |
| `PROD_API_VAPID_PUBLIC_KEY` | (Optional) For push notifications. |
| `PROD_API_VAPID_PRIVATE_KEY` | (Optional) For push notifications. |
| `PROD_API_RESEND_API_KEY` | (Optional) Resend API key for email. |
| `PROD_API_PAYSTACK_SECRET` | (Optional) Paystack secret key. |
| `PROD_API_R2_ACCOUNT_ID`, `PROD_API_R2_ACCESS_KEY_ID`, `PROD_API_R2_SECRET_ACCESS_KEY`, `PROD_API_R2_PUBLIC_URL` | (Optional) Cloudflare R2. |
| `PROD_API_CLOUDINARY_CLOUD_NAME`, `PROD_API_CLOUDINARY_API_KEY`, `PROD_API_CLOUDINARY_API_SECRET` | (Optional) Cloudinary. |
| `PROD_API_GOOGLE_CLIENT_ID`, `PROD_API_GOOGLE_CLIENT_SECRET` | (Optional) Google OAuth. |

The workflow uses **PROD_SERVER_*** to connect, writes the server `.env` from PROD_* secrets and variables (then copies it via SCP), and runs `docker compose` on the server. You do **not** need to create `.env` on the server manually for app secrets; the workflow generates it each deploy. For the first run you can still create `.env` manually if you prefer (see Step 4).

### Repository variables (plain)

Under **Variables**:

| Variable | Value | Notes |
|----------|-------|--------|
| `DEPLOY_ENABLED` | `true` | Turns on the deploy job. |
| `DEPLOY_PATH` | `~/luminum` | Path on the server (optional; default `~/luminum`). |
| `PROD_REGISTRY_IMAGE_PREFIX` | `ghcr.io/YOUR_ORG/luminum` | Replace YOUR_ORG with your GitHub org or username. |
| `PROD_APP_URL` | `https://app.luminum.agency` | Public URL of the dashboard. |
| `PROD_API_WS_URL` | `https://api.luminum.agency` | Public URL of the API (e.g. for WebSockets). |
| `PROD_DASHBOARD_NEXT_PUBLIC_APP_URL` | `https://app.luminum.agency` | Baked into the dashboard build. |
| `PROD_DASHBOARD_NEXT_PUBLIC_ANALYTICS_URL` | `https://analytics.luminum.agency` | Baked into the dashboard build. |
| `PROD_DASHBOARD_API_URL` | `http://api:4000` | (Optional) Internal API URL for dashboard build. |

---

## Step 3: Prepare the server (one-time)

You can use a **fresh Ubuntu server** and rely on the deploy workflow to install Docker and Caddy and set up the Caddyfile (see **Bootstrap on deploy** below). If you prefer to prepare the server yourself, SSH in and run the following.

SSH into the server (replace with your user and host):

```bash
ssh YOUR_SERVER_USER@YOUR_SERVER_IP
```

### 3.1 Install Docker and Docker Compose (optional – workflow can do this)

On **Ubuntu 22.04** (or similar):

```bash
sudo apt-get update && sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

Log out and back in (or run `newgrp docker`) so Docker works without `sudo`.

### 3.2 Install Caddy (optional – workflow can do this)

```bash
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update && sudo apt-get install -y caddy
```

### 3.3 Deploy path and Caddyfile

The workflow copies `.env`, `docker-compose.prod.yml`, and `deploy/caddy/Caddyfile` to the server. It does **not** clone the repo. Ensure the deploy path exists and is writable by the SSH user, e.g.:

```bash
mkdir -p ~/luminum
```

If you use a different path (e.g. `/opt/luminum`), create it and set the **Variable** `DEPLOY_PATH` in GitHub to that path (e.g. `/opt/luminum`).

**Bootstrap on deploy:** On each deploy, the workflow runs a **Bootstrap server** step that (idempotently):

- Installs **Docker** and the **Docker Compose** plugin if not present.
- Installs **Caddy** if not present.
- Copies the **Caddyfile** from the copied file to `/etc/caddy/Caddyfile` and reloads Caddy.

So a new Ubuntu server only needs SSH access (as **root** or a user with **passwordless sudo**) and the GitHub secrets/variables; the first deploy will install Docker and Caddy and then run the stack. Later deploys skip installs when already present.

---

## Step 4: (Optional) Create `.env` on the server before first deploy

The deploy workflow **generates** the server `.env` from PROD_* secrets and variables and copies it via SCP, so you normally do **not** need to create `.env` manually. If you want to run the stack once before the first automated deploy, create it on the server in the deploy path (e.g. `~/luminum`):

```bash
cd ~/luminum
cp .env.production.example .env
nano .env   # or vim
```

Set at least:

- `REGISTRY_IMAGE_PREFIX=ghcr.io/YOUR_ORG/luminum` (same as your GitHub org/user).
- `APP_URL=https://app.luminum.agency`
- `API_WS_URL=https://api.luminum.agency`
- `NEXT_PUBLIC_APP_URL=https://app.luminum.agency`
- `NEXT_PUBLIC_ANALYTICS_URL=https://analytics.luminum.agency`
- `BETTER_AUTH_SECRET` = same value you put in GitHub Secrets.
- `WEBHOOK_SECRET` = same value you put in GitHub Secrets.

Add any optional keys (VAPID, Resend, Paystack, etc.) if you use them. Postgres and Redis use internal defaults; you don’t need to set `POSTGRES_PASSWORD` unless you want a custom one.

Save and exit. On the next deploy, the workflow will overwrite `.env` with the contents from GitHub.

---

## Step 5: Caddy reverse proxy

If you use the deploy workflow, the **Bootstrap server** step copies the Caddyfile and reloads Caddy automatically. If you set up the server manually (no workflow or before first deploy), copy and load it:

```bash
sudo cp ~/luminum/deploy/caddy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

If Caddy isn’t running yet:

```bash
sudo systemctl enable caddy && sudo systemctl start caddy
```

Caddy will listen on 80 and 443 and obtain Let’s Encrypt certificates for `app.luminum.agency`, `api.luminum.agency`, and `analytics.luminum.agency`, and proxy to the Docker ports on 127.0.0.1 (3000, 4000, 8080).

---

## Step 6: Log in to GHCR and start the stack

On the server, log in to GitHub Container Registry (use the same token you stored in `PROD_SERVER_GHCR_TOKEN`):

```bash
cd ~/luminum
echo YOUR_GHCR_TOKEN | docker login ghcr.io -u YOUR_ORG --password-stdin
```

Replace `YOUR_GHCR_TOKEN` and `YOUR_ORG`. Then:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Containers will bind to `127.0.0.1:3000`, `127.0.0.1:4000`, and `127.0.0.1:8080`; Caddy will proxy the three hostnames to them.

Check:

```bash
docker compose -f docker-compose.prod.yml ps
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4000/api/health
```

You should get `200`. Then try in the browser:

- https://app.luminum.agency  
- https://api.luminum.agency/api/health  
- https://analytics.luminum.agency/health  

---

## Step 7: Deploy from GitHub (after first run)

Once the server is set up and the stack is running:

1. Push to the `main` branch (or run the **Build and Deploy** workflow manually).
2. The workflow builds images, pushes to GHCR, then SSHs to the server and runs:
   - `docker login ghcr.io` (using `PROD_SERVER_GHCR_TOKEN`)
   - `docker compose -f docker-compose.prod.yml pull`
   - `docker compose -f docker-compose.prod.yml up -d`
3. New containers use the new images; Caddy keeps routing the same way.

The workflow creates the server `.env` from PROD_* secrets and variables, copies it via SCP, then runs `docker compose` on the server. It uses `PROD_SERVER_HOST`, `PROD_SERVER_USER`, `PROD_SERVER_SSH_KEY`, and `PROD_SERVER_GHCR_TOKEN` to connect and pull.

---

## Quick reference

| Item | Value |
|------|--------|
| Dashboard | https://app.luminum.agency |
| API | https://api.luminum.agency |
| Analytics | https://analytics.luminum.agency |
| Server ports (local) | 3000 (dashboard), 4000 (api), 8080 (analytics) |
| Caddy config | `deploy/caddy/Caddyfile` → `/etc/caddy/Caddyfile` |
| Compose file | `docker-compose.prod.yml` |
| Env file | `.env` (generated on server by workflow from PROD_* secrets/vars) |

---

## Troubleshooting

- **Cloudflare 522 (Connection timed out):** Nothing on the server is listening on port 80/443. Install and start **Caddy** (Step 3.2 and Step 5) so it can accept traffic from Cloudflare and proxy to the containers on 127.0.0.1.
- **502 Bad Gateway:** Containers not running or not listening on 127.0.0.1. Run `docker compose -f docker-compose.prod.yml ps` and `curl -v http://127.0.0.1:4000/api/health`.
- **SSL errors:** In Cloudflare, use SSL mode **Full** or **Full (strict)**. Ensure Caddy is running and can listen on 80/443 (`sudo systemctl status caddy`).
- **Deploy job fails on SSH:** Check `PROD_SERVER_HOST`, `PROD_SERVER_USER`, and `PROD_SERVER_SSH_KEY` in GitHub Secrets. Test SSH from your machine: `ssh -i /path/to/key PROD_SERVER_USER@PROD_SERVER_HOST`.
- **API container restarting:** Run `docker logs luminum-api-1` (or `docker compose -f docker-compose.prod.yml logs api`) on the server to see the error. Typical causes: missing or wrong `DATABASE_URL` / Postgres vars, failed Prisma migrate (we fall back to `db push` when there are no migrations), or missing required env (e.g. `BETTER_AUTH_SECRET`). Ensure the deploy workflow has written the correct `.env` and that `PROD_POSTGRES_*` / `PROD_API_*` secrets and variables are set as in Step 2.
- **Pull denied / unauthorized:** The token in `PROD_SERVER_GHCR_TOKEN` must have **User permissions → Packages → Read** (this is `read:packages`). Repository permissions alone do **not** grant access to GHCR. Edit the token under GitHub → Settings → Developer settings → Personal access tokens, add **Packages** under *User permissions*, save, then update the secret and re-run the workflow.
