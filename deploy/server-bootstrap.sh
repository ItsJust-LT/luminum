#!/usr/bin/env bash
# One-time server bootstrap (Ubuntu 22.04): Docker, Docker Compose plugin, Caddy.
# Run as root or with sudo. Usage: curl -sSL https://raw.githubusercontent.com/YOUR_ORG/luminum/main/deploy/server-bootstrap.sh | sudo bash
# Or: sudo bash deploy/server-bootstrap.sh (from repo root on server)

set -e

echo "[bootstrap] Installing Docker..."
apt-get update -qq && apt-get install -y -qq ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt-get update -qq && apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "[bootstrap] Adding current user to docker group..."
if [ -n "$SUDO_USER" ]; then
  usermod -aG docker "$SUDO_USER"
  echo "[bootstrap] User $SUDO_USER added to docker group. Log out and back in (or run: newgrp docker)."
fi

echo "[bootstrap] Installing Caddy..."
apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list > /dev/null
apt-get update -qq && apt-get install -y -qq caddy

systemctl enable caddy
systemctl start caddy || true

echo "[bootstrap] Done. Next: clone repo, copy .env.production.example to .env, edit .env, copy deploy/caddy/Caddyfile to /etc/caddy/Caddyfile, reload caddy, docker login ghcr.io, docker compose -f docker-compose.prod.yml up -d"
echo "[bootstrap] See PRODUCTION-DEPLOY.md for full steps."
