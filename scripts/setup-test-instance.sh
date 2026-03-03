#!/usr/bin/env bash
# FactHarbor Test Instance Setup Script
# Runs on the VPS to create test.factharbor.ch alongside the production instance.
#
# Usage:
#   /opt/factharbor/scripts/setup-test-instance.sh
#
# What it does:
#   1. Creates data-test/ directory with correct ownership
#   2. Creates .env.test from .env.production (different ports, keys, paths)
#   3. Copies source-reliability.db from production
#   4. Creates systemd service files (factharbor-api-test, factharbor-web-test)
#   5. Adds test.factharbor.ch to Caddyfile
#   6. Enables and starts test services, restarts Caddy
#   7. Runs health checks

set -euo pipefail

DEPLOY_DIR="/opt/factharbor"
DATA_TEST_DIR="$DEPLOY_DIR/data-test"
ENV_PROD="$DEPLOY_DIR/deploy/.env.production"
ENV_TEST="$DEPLOY_DIR/deploy/.env.test"
CADDYFILE="/etc/caddy/Caddyfile"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[setup-test]${NC} $*"; }
warn() { echo -e "${YELLOW}[setup-test]${NC} $*"; }
err()  { echo -e "${RED}[setup-test]${NC} $*" >&2; }
ok()   { echo -e "${GREEN}[setup-test]${NC} $*"; }

echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  FactHarbor Test Instance Setup${NC}"
echo -e "${CYAN}  test.factharbor.ch (:3001/:5001)${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# --- Pre-flight checks ---
if [ ! -f "$ENV_PROD" ]; then
    err "Production env file not found: $ENV_PROD"
    err "Set up the production instance first."
    exit 1
fi

# --- Step 1: Create test data directory ---
log "Creating test data directory..."
sudo mkdir -p "$DATA_TEST_DIR"
sudo chown factharbor:factharbor "$DATA_TEST_DIR"
ok "Data directory: $DATA_TEST_DIR"

# --- Step 2: Copy source-reliability.db from production ---
if [ -f "$DEPLOY_DIR/data/source-reliability.db" ]; then
    log "Copying source-reliability.db from production..."
    sudo cp "$DEPLOY_DIR/data/source-reliability.db" "$DATA_TEST_DIR/source-reliability.db"
    sudo chown factharbor:factharbor "$DATA_TEST_DIR/source-reliability.db"
    ok "Source reliability database copied."
else
    warn "No production source-reliability.db found, test instance will start fresh."
fi

# --- Step 3: Create .env.test ---
if [ -f "$ENV_TEST" ]; then
    warn ".env.test already exists. Backing up to .env.test.bak"
    sudo cp "$ENV_TEST" "$ENV_TEST.bak"
fi

log "Creating .env.test from production template..."
sudo cp "$ENV_PROD" "$ENV_TEST"

# Generate new keys for isolation
NEW_ADMIN_KEY=$(openssl rand -hex 32)
NEW_RUNNER_KEY=$(openssl rand -hex 32)

# Apply test-specific overrides
sudo sed -i "s|^FH_API_BASE_URL=.*|FH_API_BASE_URL=http://localhost:5001|" "$ENV_TEST"
sudo sed -i "s|^FH_CORS_ORIGIN=.*|FH_CORS_ORIGIN=https://test.factharbor.ch|" "$ENV_TEST"
sudo sed -i "s|^FH_CONFIG_DB_PATH=.*|FH_CONFIG_DB_PATH=$DATA_TEST_DIR/config.db|" "$ENV_TEST"
sudo sed -i "s|^FH_SR_CACHE_PATH=.*|FH_SR_CACHE_PATH=$DATA_TEST_DIR/source-reliability.db|" "$ENV_TEST"
sudo sed -i "s|^FH_RUNNER_MAX_CONCURRENCY=.*|FH_RUNNER_MAX_CONCURRENCY=1|" "$ENV_TEST"
sudo sed -i "s|^FH_ADMIN_KEY=.*|FH_ADMIN_KEY=$NEW_ADMIN_KEY|" "$ENV_TEST"
sudo sed -i "s|^FH_INTERNAL_RUNNER_KEY=.*|FH_INTERNAL_RUNNER_KEY=$NEW_RUNNER_KEY|" "$ENV_TEST"

ok ".env.test created with separate keys and paths."
echo ""
echo -e "  ${YELLOW}Test Admin Key:${NC}  $NEW_ADMIN_KEY"
echo -e "  ${YELLOW}Test Runner Key:${NC} $NEW_RUNNER_KEY"
echo -e "  ${YELLOW}Save these keys — you'll need the Admin Key for the /admin panel.${NC}"
echo ""

# --- Step 4: Create systemd services ---
log "Creating systemd service: factharbor-api-test..."
sudo tee /etc/systemd/system/factharbor-api-test.service > /dev/null << EOF
[Unit]
Description=FactHarbor API (test)
After=network.target

[Service]
Type=simple
User=factharbor
WorkingDirectory=$DEPLOY_DIR/deploy/api
ExecStart=/usr/bin/dotnet $DEPLOY_DIR/deploy/api/FactHarbor.Api.dll
EnvironmentFile=$ENV_TEST
Environment="ASPNETCORE_ENVIRONMENT=Production"
Environment="ASPNETCORE_URLS=http://127.0.0.1:5001"
Environment="ConnectionStrings__FhDbSqlite=Data Source=$DATA_TEST_DIR/factharbor.db"
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
ok "factharbor-api-test.service created."

log "Creating systemd service: factharbor-web-test..."
sudo tee /etc/systemd/system/factharbor-web-test.service > /dev/null << EOF
[Unit]
Description=FactHarbor Web (test)
After=network.target factharbor-api-test.service

[Service]
Type=simple
User=factharbor
WorkingDirectory=$DEPLOY_DIR/apps/web/.next/standalone
ExecStart=/usr/bin/node apps/web/server.js
EnvironmentFile=$ENV_TEST
Environment="NODE_ENV=production"
Environment="PORT=3001"
Environment="HOSTNAME=127.0.0.1"
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
ok "factharbor-web-test.service created."

# --- Step 5: Update Caddyfile ---
if grep -q "test.factharbor.ch" "$CADDYFILE" 2>/dev/null; then
    warn "test.factharbor.ch already exists in Caddyfile, skipping."
else
    log "Adding test.factharbor.ch to Caddyfile..."
    sudo tee -a "$CADDYFILE" > /dev/null << 'CADDY_EOF'

test.factharbor.ch {
    reverse_proxy localhost:3001

    log {
        output file /var/log/caddy/test-access.log
    }

    handle_errors {
        @backend_down expression `{err.status_code} in [502, 503]`
        handle @backend_down {
            root * /opt/factharbor/scripts
            rewrite * /maintenance.html
            file_server
        }
    }
}
CADDY_EOF
    ok "Caddyfile updated."

    log "Validating Caddyfile..."
    if sudo caddy validate --config "$CADDYFILE"; then
        ok "Caddyfile valid."
    else
        err "Caddyfile validation failed! Check $CADDYFILE manually."
        exit 1
    fi
fi

# --- Step 6: Enable and start ---
log "Reloading systemd daemon..."
sudo systemctl daemon-reload

log "Enabling test services..."
sudo systemctl enable factharbor-api-test factharbor-web-test

log "Starting test services..."
sudo systemctl start factharbor-api-test
sudo systemctl start factharbor-web-test

log "Restarting Caddy..."
sudo systemctl restart caddy

ok "All services started."

# --- Step 7: Health checks ---
log "Waiting 5s for services to start..."
sleep 5

FAILED=0

check_health() {
    local url="$1"
    local label="$2"
    for i in 1 2 3; do
        if curl -sf "$url" > /dev/null 2>&1; then
            ok "$label: healthy"
            return 0
        fi
        if [ "$i" -lt 3 ]; then
            warn "$label: not ready (attempt $i/3), retrying in 3s..."
            sleep 3
        fi
    done
    err "$label: UNHEALTHY after 3 attempts"
    return 1
}

check_health "http://localhost:5001/health" "API (test)" || FAILED=1
check_health "http://localhost:3001/api/health" "Web (test)" || FAILED=1
check_health "https://test.factharbor.ch/api/health" "External (test)" || FAILED=1

# Also verify production is still healthy
check_health "http://localhost:5000/health" "API (prod)" || FAILED=1
check_health "http://localhost:3000/api/health" "Web (prod)" || FAILED=1

echo ""
if [ "$FAILED" -eq 0 ]; then
    ok "============================================"
    ok "  Test instance setup complete!"
    ok "  https://test.factharbor.ch"
    ok "  Admin: https://test.factharbor.ch/admin"
    ok "============================================"
else
    err "============================================"
    err "  Setup completed with health check failures!"
    err "  Check logs:"
    err "    sudo journalctl -u factharbor-api-test -n 30"
    err "    sudo journalctl -u factharbor-web-test -n 30"
    err "============================================"
    exit 1
fi
