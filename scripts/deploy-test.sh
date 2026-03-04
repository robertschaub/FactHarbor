#!/usr/bin/env bash
# FactHarbor Test Instance Deploy Script
# Restarts the test services using the already-built artifacts.
# No build step — test shares code/binaries with production.
#
# Usage:
#   /opt/factharbor/scripts/deploy-test.sh
#
# Run this after deploy.sh (which builds but only starts prod),
# or independently to restart the test instance.

set -euo pipefail

HEALTH_WAIT=5
HEALTH_RETRIES=3

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[deploy-test]${NC} $*"; }
warn() { echo -e "${YELLOW}[deploy-test]${NC} $*"; }
err()  { echo -e "${RED}[deploy-test]${NC} $*" >&2; }
ok()   { echo -e "${GREEN}[deploy-test]${NC} $*"; }

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  FactHarbor Test Instance Deploy${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# --- Check test services exist ---
if ! systemctl list-unit-files factharbor-api-test.service &>/dev/null 2>&1; then
    err "Test services not found. Run setup-test-instance.sh first."
    exit 1
fi

# --- Restart test services ---
log "Restarting test services..."
sudo systemctl restart factharbor-api-test
sudo systemctl restart factharbor-web-test
ok "Test services restarted."

# --- Health checks ---
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
check_health "http://localhost:5001/health" "API (test)" || FAILED=1
check_health "http://localhost:3001/api/health" "Web (test)" || FAILED=1

echo ""
if [ "$FAILED" -eq 0 ]; then
    ok "========================================="
    ok "  Test instance deploy successful!"
    ok "========================================="
else
    err "========================================="
    err "  Test instance deploy failed!"
    err "  Check logs: sudo journalctl -u factharbor-api-test -n 30"
    err "              sudo journalctl -u factharbor-web-test -n 30"
    err "========================================="
    exit 1
fi
