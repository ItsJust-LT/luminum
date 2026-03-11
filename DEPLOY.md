# Luminum – Docker and deployment

Run the full stack (Postgres, Redis, API, Dashboard, Analytics) with Docker. Optionally deploy automatically with GitHub Actions.

**→ For a step-by-step production deploy (app / api / analytics on luminum.agency with Cloudflare and Caddy), see [PRODUCTION-DEPLOY.md](./PRODUCTION-DEPLOY.md).**

---

## Production checklist (before going live)

- [ ] Store sensitive values in **GitHub Secrets** (e.g. `BETTER_AUTH_SECRET`, `WEBHOOK_SECRET`, API keys); set deployment-specific vars (Postgres/Redis URLs or credentials) on the server only.
- [ ] Set all public URLs to your real domain (`APP_URL`, `API_WS_URL`, `NEXT_PUBLIC_*`)
- [ ] Use HTTPS in front of the stack (reverse proxy: Nginx, Caddy, or similar)
- [ ] Postgres and Redis are internal-only; do not expose their ports publicly.
- [ ] For deploy via GitHub Actions: add repository secrets (`SERVER_HOST`, `SERVER_USER`, `SERVER_SSH_KEY`, etc.) and set `DEPLOY_ENABLED=true`

---

## How envs and secrets work

| Context | Where values live | How they’re used |
|--------|--------------------|------------------|
| **Local Docker** | A `.env` file (copy of `.env.docker.example`) on your machine. | `docker compose` reads `.env` and passes variables into containers. No secrets manager; keep `.env` out of git. |
| **GitHub Actions** | **Secrets** (encrypted, e.g. `SERVER_HOST`, `SERVER_SSH_KEY`, `DEPLOY_GHCR_TOKEN`) and **Variables** (plain, e.g. `DEPLOY_ENABLED`, `DEPLOY_PATH`). | The workflow uses secrets to SSH to the server and log into GHCR. It does **not** inject app env vars (e.g. `BETTER_AUTH_SECRET`) into the server; that’s your responsibility on the server. |
| **Server (production)** | A `.env` file (or your chosen method) **on the server** in the deploy path. | When you run `docker compose -f docker-compose.prod.yml up`, Compose reads that `.env` and supplies the values to the running containers (API, Dashboard, Analytics). |

**Secrets vs variables (GitHub)**  
- **Secrets**: Encrypted, for sensitive data (SSH key, PAT, auth secrets, API keys). Use for anything you wouldn’t commit.  
- **Variables**: Plain text, for non-sensitive config (e.g. `DEPLOY_ENABLED`, `DEPLOY_PATH`). Use for flags and paths.

**Who sets what**  
- **You (once)**: Add GitHub Secrets and Variables in the repo’s **Settings → Secrets and variables → Actions**.  
- **You (on the server)**: Create a `.env` file on the server with `REGISTRY_IMAGE_PREFIX`, public URLs, and **sensitive app values** (e.g. `BETTER_AUTH_SECRET`, `WEBHOOK_SECRET`, `RESEND_API_KEY`). You can copy these from your own secret store or from GitHub Secrets manually; the workflow does not write them to the server.  
- **Deployment / internal**: Postgres and Redis are internal-only. Their URLs/credentials can use defaults in Compose (`POSTGRES_PASSWORD:-luminum_internal`, etc.) or be set in the server’s `.env` if you override them.

**Flow when you push to `main`**  
1. GitHub Actions runs: builds images, pushes to GHCR (using `GITHUB_TOKEN`).  
2. If deploy is enabled, it SSHs into the server using `SERVER_HOST`, `SERVER_USER`, `SERVER_SSH_KEY`.  
3. On the server it runs `docker compose … pull` and `up -d`. Those commands use the **server’s `.env`** to configure the app (auth, APIs, DB URL, etc.).  
4. So: **secrets in GitHub** = access to the server and GHCR; **env on the server** = how the app actually runs (auth, DB, Redis, URLs).

---

## 1. Prerequisites

- **Docker** and **Docker Compose**
- For **GitHub Actions deploy**: a server with Docker, SSH access, and (for pull) a GitHub PAT with `read:packages`

---

## 2. Local run with Docker Compose

1. **Copy env and set values**
   ```bash
   cp .env.docker.example .env
   ```
   Edit `.env`: set at least `BETTER_AUTH_SECRET`, `WEBHOOK_SECRET`. Set `APP_URL`, `API_WS_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_ANALYTICS_URL` to your public URLs when not on localhost. Postgres is internal-only (default credentials used by compose).

2. **Start everything**
   ```bash
   docker compose up -d
   ```
   - Dashboard: http://localhost:3000  
   - API: http://localhost:4000  
   - Analytics: http://localhost:8080  

3. **Migrations**  
   The API container runs `prisma migrate deploy` on startup (see `docker/entrypoint-api.sh`). If you use `prisma db push` only, ensure the schema is applied before first run (e.g. run once from host or a one-off container).

---

## 3. Production: images from GHCR

After GitHub Actions builds and pushes images (see below), on the server use **images** instead of building:

1. **On the server**: clone the repo (or copy `docker-compose.prod.yml` and `.env`).
2. **Set in `.env` on the server**
   - `REGISTRY_IMAGE_PREFIX=ghcr.io/YOUR_ORG/luminum` (replace `YOUR_ORG` with your GitHub org/user).
   - Deployment-specific: Postgres/Redis URLs or credentials (internal-only; defaults work if not set).
   - Sensitive vars (auth, API keys) from GitHub Secrets or your own secret store.
3. **Pull and run**
   ```bash
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d
   ```
   Images used: `...-api:latest`, `...-dashboard:latest`, `...-analytics:latest`.

---

## 4. GitHub Actions: build and push

- **Workflow**: `.github/workflows/deploy.yml`
- **Triggers**: push to `main` or manual `workflow_dispatch`.
- **Job `build-and-push`**: builds API, Dashboard, and Analytics and pushes to **GitHub Container Registry (GHCR)**:
  - `ghcr.io/<owner>/luminum-api:latest`
  - `ghcr.io/<owner>/luminum-dashboard:latest`
  - `ghcr.io/<owner>/luminum-analytics:latest`

No extra **secrets** are required for build/push; the built-in `GITHUB_TOKEN` is used to push to GHCR.

**Optional – build-time variables (Dashboard)**  
In **Settings → Secrets and variables → Actions → Variables**, you can set:

- `API_URL` – e.g. `http://api:4000` (default)
- `NEXT_PUBLIC_APP_URL` – public URL of the dashboard
- `NEXT_PUBLIC_ANALYTICS_URL` – public URL of the analytics service  
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` can be set via variable or use secret `VAPID_PUBLIC_KEY` (see workflow)

---

## 5. GitHub Actions: deploy to a server (optional)

To have the workflow **SSH to your server** and run `docker compose -f docker-compose.prod.yml pull && up -d`, do the following.

**Env vars:** Sensitive values (e.g. `BETTER_AUTH_SECRET`, `WEBHOOK_SECRET`, API keys) should be stored in **GitHub Secrets** and set on the server (e.g. in `.env`). Deployment-specific vars such as **Postgres and Redis URLs/credentials** are set only on the server at deploy time (internal access; defaults are used if not set).

### 5.1 Repository variables (Settings → Secrets and variables → Actions → Variables)

| Variable | Required | Description |
|----------|----------|-------------|
| `DEPLOY_ENABLED` | Yes (for deploy) | Set to `true` to enable the deploy job. |
| `DEPLOY_PATH` | No | Path on the server where the repo (and `docker-compose.prod.yml`) lives. Default: `~/luminum`. |

### 5.2 Repository secrets (Settings → Secrets and variables → Actions → Secrets)

| Secret | Required | Description |
|--------|----------|-------------|
| `SERVER_HOST` | Yes | Server hostname or IP (e.g. `my-server.example.com` or `123.45.67.89`). |
| `SERVER_USER` | Yes | SSH user (e.g. `deploy` or `root`). |
| `SERVER_SSH_KEY` | Yes | Full SSH private key (contents of `id_rsa` or equivalent). The matching public key must be in `~/.ssh/authorized_keys` on the server. |
| `DEPLOY_GHCR_TOKEN` | Yes | GitHub PAT with `read:packages` so the server can pull images from GHCR. |

### 5.3 Steps to add secrets

1. Open your repo on GitHub → **Settings** → **Secrets and variables** → **Actions**.
2. Click **New repository secret**.
3. Add: `SERVER_HOST`, `SERVER_USER`, `SERVER_SSH_KEY`, `DEPLOY_GHCR_TOKEN`.
4. Under **Variables**, add `DEPLOY_ENABLED` = `true` and, if needed, `DEPLOY_PATH` (e.g. `~/luminum`).

### 5.4 Server setup

- Docker and Docker Compose installed.
- Repo cloned (or at least `docker-compose.prod.yml` and `.env`) in `DEPLOY_PATH`.
- `.env` on the server: set `REGISTRY_IMAGE_PREFIX`, deployment-specific DB/Redis vars if needed (internal-only; defaults work), and sensitive vars from GitHub Secrets or your secret store.
- SSH access for `SERVER_USER` using the key stored in `SERVER_SSH_KEY`.

### 5.5 Deploy job behavior

- Runs only if `DEPLOY_ENABLED` is `true`.
- Connects via SSH using `SERVER_HOST`, `SERVER_USER`, and `SERVER_SSH_KEY`.
- Logs into GHCR on the server with `DEPLOY_GHCR_TOKEN`, then runs `docker compose -f docker-compose.prod.yml pull` and `up -d` in `DEPLOY_PATH`.

---

## 6. Production URLs

Set these to your real domain (and correct ports if not 80/443):

- **APP_URL** – public URL of the dashboard (e.g. `https://app.example.com`).
- **API_WS_URL** – public URL of the API (e.g. `https://api.example.com`).
- **NEXT_PUBLIC_APP_URL** – same as APP_URL (used by the frontend).
- **NEXT_PUBLIC_ANALYTICS_URL** – public URL of the Analytics service (e.g. `https://analytics.example.com`).

Use HTTPS and a reverse proxy (e.g. Nginx/Caddy) in front of the Compose stack for production.

---

## 7. Summary checklist

**Local Docker**

- [ ] Copy `.env.docker.example` to `.env` and set required values.
- [ ] Run `docker compose up -d`.

**GitHub Actions (build only)**

- [ ] Push to `main` (or run workflow manually).
- [ ] (Optional) Set variables for Dashboard build: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_ANALYTICS_URL`, etc.

**GitHub Actions (deploy to server)**

- [ ] Add secrets: `SERVER_HOST`, `SERVER_USER`, `SERVER_SSH_KEY`, `DEPLOY_GHCR_TOKEN`.
- [ ] Add variable: `DEPLOY_ENABLED` = `true` (and optionally `DEPLOY_PATH`).
- [ ] On server: clone repo, add `.env` with `REGISTRY_IMAGE_PREFIX`, deployment-specific DB/Redis vars if needed, and sensitive vars from secrets.
- [ ] Push to `main` (or run workflow) to build and deploy.
