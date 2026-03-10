#!/usr/bin/env bash
# FactHarbor VPS Deployment Script (production)
# Pulls latest code, builds, and restarts production services.
# Test services are stopped during build (OOM prevention) but NOT restarted.
# Run deploy-test.sh separately to bring test services back up.
#
# Usage:
#   /opt/factharbor/scripts/deploy.sh                              # Deploy latest main
#   /opt/factharbor/scripts/deploy.sh v1.0.0                       # Deploy a specific tag
#   /opt/factharbor/scripts/deploy.sh "" --force-configs           # Deploy + force UCM config defaults
#   /opt/factharbor/scripts/deploy.sh v1.0.0 --force-configs       # Tag + force UCM config defaults
#
# Prerequisites: SSH into the VPS first (see scripts/.deploy.env for connection details)

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
FORCE_CONFIGS="${2:-}"   # Pass "--force-configs" to force-reseed UCM config defaults

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

# --- Step 3: Free memory for build ---
# Stop ALL app services to free RAM — VPS has 4 GB and npm ci + next build
# need most of it. Caddy stays up and serves the maintenance page.
TEST_WAS_RUNNING=0
if systemctl is-active factharbor-api-test &>/dev/null 2>&1; then
    TEST_WAS_RUNNING=1
fi

log "Stopping app services to free memory for build (Caddy stays up)..."
sudo systemctl stop factharbor-api factharbor-web
if [ "$TEST_WAS_RUNNING" -eq 1 ]; then
    sudo systemctl stop factharbor-api-test factharbor-web-test
fi
ok "App services stopped. Maintenance page active."

# --- Step 4: Build .NET API ---
log "Building .NET API..."
cd "$DEPLOY_DIR/apps/api"
dotnet publish -c Release -o "$API_PUBLISH_DIR" --verbosity quiet
ok "API build complete."

# --- Step 5: Build Next.js ---
log "Installing npm dependencies..."
cd "$DEPLOY_DIR"
npm ci --silent

log "Building Next.js..."
npm -w apps/web run build
cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static
ok "Web build complete."

# Reseed prompts/configs into the PRODUCTION config.db (owned by factharbor)
# The postbuild reseed ran during build but wrote to a local ./config.db
# because FH_CONFIG_DB_PATH wasn't set. This step targets the real DB.
log "Reseeding configs into production database..."
cd "$DEPLOY_DIR/apps/web"
if [ "$FORCE_CONFIGS" = "--force-configs" ]; then
    warn "Force-reseeding UCM configs (overwrites user-customized values with file defaults)..."
    sudo -u factharbor FH_CONFIG_DB_PATH=/opt/factharbor/data/config.db npx tsx scripts/reseed-all-prompts.ts --force --configs
    sudo -u factharbor FH_CONFIG_DB_PATH=/opt/factharbor/data/config.db npx tsx scripts/reseed-all-prompts.ts --quiet --prompts
else
    sudo -u factharbor FH_CONFIG_DB_PATH=/opt/factharbor/data/config.db npx tsx scripts/reseed-all-prompts.ts --quiet
fi
cd "$DEPLOY_DIR"
ok "Config reseed complete."

# --- Step 6: Start production services ---
log "Starting production services..."
sudo systemctl start factharbor-api
sudo systemctl start factharbor-web
ok "Production services started."

# Note: test services were stopped for OOM but are NOT restarted here.
# Run deploy-test.sh separately to bring them back up.
if [ "$TEST_WAS_RUNNING" -eq 1 ]; then
    warn "Test services were stopped for build. Run deploy-test.sh to restart them."
fi

# --- Step 7: Health checks ---
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
