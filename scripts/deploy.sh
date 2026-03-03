#!/usr/bin/env bash
# FactHarbor VPS Deployment Script
# Runs on the VPS to pull latest code, build, restart, and verify.
#
# Usage:
#   /opt/factharbor/scripts/deploy.sh          # Deploy latest main
#   /opt/factharbor/scripts/deploy.sh v1.0.0   # Deploy a specific tag
#
# Prerequisites: SSH into ubuntu@83.228.221.114 first

set -euo pipefail

DEPLOY_DIR="/opt/factharbor"
API_PUBLISH_DIR="$DEPLOY_DIR/deploy/api"
HEALTH_WAIT=5
HEALTH_RETRIES=3

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[deploy]${NC} $*"; }
err()  { echo -e "${RED}[deploy]${NC} $*" >&2; }
ok()   { echo -e "${GREEN}[deploy]${NC} $*"; }

TAG="${1:-}"

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  FactHarbor Deployment${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

cd "$DEPLOY_DIR"

# --- Step 1: Backup databases ---
log "Backing up databases..."
if [ -x "$DEPLOY_DIR/scripts/backup-dbs.sh" ]; then
    "$DEPLOY_DIR/scripts/backup-dbs.sh"
    ok "Backup complete."
else
    warn "Backup script not found, skipping."
fi

# --- Step 2: Pull latest code ---
if [ -n "$TAG" ]; then
    log "Fetching and checking out tag: $TAG"
    git fetch --tags
    git checkout "$TAG"
else
    log "Pulling latest from main..."
    git pull
fi
ok "Code updated: $(git log --oneline -1)"

# --- Step 3: Build .NET API ---
log "Building .NET API..."
cd "$DEPLOY_DIR/apps/api"
dotnet publish -c Release -o "$API_PUBLISH_DIR" --verbosity quiet
ok "API build complete."

# --- Step 4: Build Next.js ---
log "Installing npm dependencies..."
cd "$DEPLOY_DIR"
npm ci --silent

log "Building Next.js..."
npm -w apps/web run build
cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static
ok "Web build complete."

# --- Step 5: Restart services ---
log "Restarting services..."
sudo systemctl restart factharbor-api
sudo systemctl restart factharbor-web
ok "Services restarted."

# --- Step 6: Health checks ---
log "Waiting ${HEALTH_WAIT}s for services to start..."
sleep "$HEALTH_WAIT"

check_health() {
    local url="$1"
    local label="$2"
    for i in $(seq 1 $HEALTH_RETRIES); do
        if curl -sf "$url" > /dev/null 2>&1; then
            ok "$label: healthy"
            return 0
        fi
        if [ "$i" -lt "$HEALTH_RETRIES" ]; then
            warn "$label: not ready (attempt $i/$HEALTH_RETRIES), retrying in 3s..."
            sleep 3
        fi
    done
    err "$label: UNHEALTHY after $HEALTH_RETRIES attempts"
    return 1
}

FAILED=0
check_health "http://localhost:5000/health" "API" || FAILED=1
check_health "http://localhost:3000/api/health" "Web" || FAILED=1

echo ""
if [ "$FAILED" -eq 0 ]; then
    ok "========================================="
    ok "  Deployment successful!"
    ok "  $(git log --oneline -1)"
    ok "========================================="
else
    err "========================================="
    err "  Deployment completed with health check failures!"
    err "  Check logs: sudo journalctl -u factharbor-api -n 30"
    err "              sudo journalctl -u factharbor-web -n 30"
    err "========================================="
    exit 1
fi
