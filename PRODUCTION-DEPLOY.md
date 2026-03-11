# Deploy Luminum to production (app / api / analytics subdomains)

This guide gets the full stack running on a single server with:

- **app.luminum.agency** → Dashboard  
- **api.luminum.agency** → API  
- **analytics.luminum.agency** → Analytics  

Using **Cloudflare** for DNS (and optional proxy) and **Caddy** on the server for HTTPS and reverse proxy.

---

## What you need

- A **server** (VPS) with a public IP (e.g. Ubuntu 22.04).
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

Add these **Secrets** (each name must match exactly):

| Secret name           | What to put |
|-----------------------|-------------|
| `SERVER_HOST`         | Your server’s public IP or hostname (e.g. `123.45.67.89` or `server.luminum.agency`). |
| `SERVER_USER`         | SSH user (e.g. `root` or `deploy`). |
| `SERVER_SSH_KEY`       | Full contents of the **private** key used to SSH (e.g. `~/.ssh/id_rsa`). The matching public key must be in `~/.ssh/authorized_keys` on the server. |
| `DEPLOY_GHCR_TOKEN`   | A GitHub **Personal Access Token** with scope `read:packages` (so the server can pull images from GHCR). Create under GitHub → Settings → Developer settings → Personal access tokens. |
| `BETTER_AUTH_SECRET`  | Long random string (e.g. `openssl rand -hex 32`). |
| `WEBHOOK_SECRET`      | Shared secret for webhooks (e.g. `openssl rand -hex 24`). |
| `VAPID_PUBLIC_KEY`    | (Optional) For push notifications. |
| `VAPID_PRIVATE_KEY`   | (Optional) For push notifications. |
| `RESEND_API_KEY`      | (Optional) Resend API key for email. |
| `PAYSTACK_SECRET`     | (Optional) Paystack secret key. |
| Others (R2, Cloudinary, Google OAuth) | Add only if you use those features. |

The workflow uses **only** `SERVER_HOST`, `SERVER_USER`, `SERVER_SSH_KEY`, and `DEPLOY_GHCR_TOKEN` to connect and pull images. The rest are for **your app**; you will put them in the server’s `.env` (see Step 4). You can copy the same values from your password manager or from GitHub Secrets when you create `.env` on the server.

### Repository variables (plain)

Under **Variables**:

| Variable                  | Value                        | Notes |
|---------------------------|------------------------------|--------|
| `DEPLOY_ENABLED`          | `true`                       | Turns on the deploy job. |
| `DEPLOY_PATH`             | `~/luminum`                  | Path on the server where the repo is cloned (optional; default `~/luminum`). |
| `NEXT_PUBLIC_APP_URL`     | `https://app.luminum.agency` | Baked into the dashboard build (optional; for correct links in the app). |
| `NEXT_PUBLIC_ANALYTICS_URL` | `https://analytics.luminum.agency` | Baked into the dashboard build (optional). |

---

## Step 3: Prepare the server (one-time)

SSH into the server (replace with your user and host):

```bash
ssh YOUR_SERVER_USER@YOUR_SERVER_IP
```

### 3.1 Install Docker and Docker Compose

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

### 3.2 Install Caddy (reverse proxy + HTTPS)

```bash
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update && sudo apt-get install -y caddy
```

### 3.3 Clone the repo and set deploy path

```bash
mkdir -p ~/luminum && cd ~/luminum
git clone https://github.com/YOUR_ORG/luminum.git .
```

Replace `YOUR_ORG` with your GitHub org or username. If the repo is private, use a deploy key or HTTPS with a token; the deploy job will later use `DEPLOY_GHCR_TOKEN` only for pulling images, not for git.

If you use a different path (e.g. `/opt/luminum`), set the **Variable** `DEPLOY_PATH` in GitHub to that path (e.g. `/opt/luminum`).

---

## Step 4: Create `.env` on the server

On the server, in the deploy path (e.g. `~/luminum`):

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

Save and exit.

---

## Step 5: Caddy reverse proxy

Copy the Caddyfile from the repo and load it:

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

On the server, log in to GitHub Container Registry (use the same token you stored in `DEPLOY_GHCR_TOKEN`):

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
   - `docker login ghcr.io` (using `DEPLOY_GHCR_TOKEN`)
   - `docker compose -f docker-compose.prod.yml pull`
   - `docker compose -f docker-compose.prod.yml up -d`
3. New containers use the new images; Caddy keeps routing the same way.

No need to copy env vars from GitHub to the server in the workflow; the server’s `.env` already has them. The workflow only needs `SERVER_HOST`, `SERVER_USER`, `SERVER_SSH_KEY`, and `DEPLOY_GHCR_TOKEN` to connect and pull.

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
| Env file | `.env` (from `.env.production.example`) |

---

## Troubleshooting

- **502 Bad Gateway:** Containers not running or not listening on 127.0.0.1. Run `docker compose -f docker-compose.prod.yml ps` and `curl -v http://127.0.0.1:4000/api/health`.
- **SSL errors:** In Cloudflare, use SSL mode **Full** or **Full (strict)**. Ensure Caddy is running and can listen on 80/443 (`sudo systemctl status caddy`).
- **Deploy job fails on SSH:** Check `SERVER_HOST`, `SERVER_USER`, and `SERVER_SSH_KEY` in GitHub Secrets. Test SSH from your machine: `ssh -i /path/to/key SERVER_USER@SERVER_HOST`.
- **Pull unauthorized:** Regenerate a PAT with `read:packages` and update `DEPLOY_GHCR_TOKEN`. On the server, run `echo NEW_TOKEN | docker login ghcr.io -u YOUR_ORG --password-stdin` and re-run compose.
