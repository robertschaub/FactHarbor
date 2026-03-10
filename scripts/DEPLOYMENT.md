# FactHarbor VPS Deployment Guide

**Last updated:** 2026-03-03
**Server:** Infomaniak VPS Lite M (2 vCPU, 4 GB RAM, 60 GB SSD)
**OS:** Ubuntu 24.04 LTS
**Domains:** `app.factharbor.ch` (production), `test.factharbor.ch` (test)
**IP:** `83.228.221.114` / `2001:1600:18:201::36e`

---

## Quick Reference

### SSH access

```bash
ssh -i ~/.ssh/fh ubuntu@83.228.221.114
```

### Redeploy (one command from local Windows)

```powershell
.\scripts\deploy-remote.ps1              # Deploy latest main
.\scripts\deploy-remote.ps1 -Tag v1.0.0  # Deploy specific tag
.\scripts\deploy-remote.ps1 -DryRun      # Preview without executing
```

### Redeploy (from VPS directly)

```bash
ssh -i ~/.ssh/fh ubuntu@83.228.221.114
bash /opt/factharbor/scripts/deploy.sh          # Deploy latest main (prod only)
bash /opt/factharbor/scripts/deploy.sh v1.0.0   # Deploy specific tag (prod only)
bash /opt/factharbor/scripts/deploy-test.sh     # Restart test instance (after deploy.sh)
```

> **Note:** `deploy.sh` builds and restarts production only. Test services are stopped during build (OOM prevention) but not restarted. Run `deploy-test.sh` separately to bring them back up.

### Redeploy (manual steps)

```bash
ssh -i ~/.ssh/fh ubuntu@83.228.221.114
cd /opt/factharbor
git pull
cd apps/api && dotnet publish -c Release -o /opt/factharbor/deploy/api
cd /opt/factharbor && npm ci && npm -w apps/web run build
cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static
sudo systemctl restart factharbor-api factharbor-web
sleep 3
curl -s http://localhost:5000/health
curl -s http://localhost:3000/api/health
```

### Service management

```bash
# Status
sudo systemctl status factharbor-api factharbor-web caddy

# Restart
sudo systemctl restart factharbor-api factharbor-web

# Logs (live)
sudo journalctl -u factharbor-api -f
sudo journalctl -u factharbor-web -f
sudo journalctl -u caddy -f

# Caddy access log
tail -f /var/log/caddy/access.log
```

### Health checks

```bash
# From VPS
curl -s http://localhost:5000/health
curl -s http://localhost:3000/api/health

# From anywhere
curl -s https://app.factharbor.ch/api/health
```

---

## Architecture

```
User → HTTPS :443 → Caddy (auto-TLS) → Next.js :3000 → .NET API :5000 → SQLite
```

| Component | Port | Process | Systemd service |
|-----------|------|---------|-----------------|
| Caddy | 443 (public), 80 (redirect) | `/usr/bin/caddy` | `caddy` |
| Next.js | 3000 (localhost) | `node apps/web/server.js` | `factharbor-web` |
| .NET API | 5000 (localhost) | `dotnet FactHarbor.Api.dll` | `factharbor-api` |

### Directory layout

```
/opt/factharbor/                  # Git clone (source code)
├── apps/api/                     # .NET API source
├── apps/web/                     # Next.js source
│   ├── .next/standalone/         # Production build (server.js lives here)
│   ├── prompts/                  # LLM prompt files (FH_PROMPT_DIR)
│   └── configs/                  # Config defaults (FH_CONFIG_DEFAULTS_DIR)
├── deploy/
│   ├── api/                      # Published .NET binaries (shared by both instances)
│   ├── .env.production           # Production env (secrets, ports, DB paths)
│   └── .env.test                 # Test instance env (port 3001/5001, data-test/)
├── data/                         # Production SQLite databases
│   ├── factharbor.db             # Jobs, events, invite codes
│   ├── config.db                 # UCM configuration
│   └── source-reliability.db    # Source reliability cache
├── data-test/                    # Test instance SQLite databases (same schema)
│   ├── factharbor.db
│   ├── config.db
│   └── source-reliability.db
├── backups/                      # Daily SQLite backups
└── scripts/
    ├── deploy.sh                 # Deploy script (production only, stops test for OOM)
    ├── deploy-test.sh            # Restart test instance (no build, just restart + health-check)
    ├── setup-test-instance.sh    # One-time test instance setup
    ├── backup-dbs.sh             # Backup script (cron daily 03:00 UTC)
    ├── Caddyfile.reference       # Reference Caddyfile (both instances, maintenance handling)
    └── maintenance.html          # Maintenance page served by Caddy on 502/503
```

---

## Full Deployment Procedure (update)

### 1. SSH into VPS

```bash
ssh -i ~/.ssh/fh ubuntu@83.228.221.114
```

### 2. Backup databases (safety net)

```bash
/opt/factharbor/scripts/backup-dbs.sh
```

### 3. Pull latest code

```bash
cd /opt/factharbor
git pull
```

For tagged releases:

```bash
git fetch --tags
git checkout <release-tag>  # e.g., v1.0.0-pre.3
```

### 4. Build .NET API

```bash
cd /opt/factharbor/apps/api
dotnet publish -c Release -o /opt/factharbor/deploy/api
```

### 5. Build Next.js

```bash
cd /opt/factharbor
npm ci
npm -w apps/web run build
cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static
```

> **Note:** The `postbuild` script automatically reseeds prompts and configs into the UCM database.

### 6. Restart services

```bash
sudo systemctl restart factharbor-api
sudo systemctl restart factharbor-web
```

### 7. Verify

```bash
sleep 3
curl -s http://localhost:5000/health
curl -s http://localhost:3000/api/health
curl -s https://app.factharbor.ch/api/health
```

Both should return `"ok": true`. If not, check logs:

```bash
sudo journalctl -u factharbor-api --no-pager -n 30
sudo journalctl -u factharbor-web --no-pager -n 30
```

### 8. Post-deploy checklist ⚠️ ONE-TIME — next deploy only, then delete this section

> **IMPORTANT:** Steps 8a and 8b are one-time only. After performing them, delete this section
> from the guide (or strike through with "✅ Done YYYY-MM-DD") so future deploys do not repeat them.

#### 8a. Apply Phase 1 UCM config (variability containment — Plan §5, D1+D2)

Open Admin → Config → Search Config and set:
- `serpapi.enabled` → **false**
- `brave.priority` → **10** (keep enabled — emergency fallback only)

Open Admin → Config → Calculation Config and set:
- `evidenceSufficiencyMinSourceTypes` → **2**

#### 8b. Expire stale SR cache entries — ONE-TIME ONLY

Run **once** on VPS after services are up. Do NOT run on subsequent deploys.

```bash
# ONE-TIME: Expire pre-web-search SR entries (no evidence_pack) and all insufficient_data entries
# These are low-quality entries that predate web-search augmentation (Phase 2.4, 2026-03-09).
# Safe: entries with good scores + evidence_pack are untouched. They will re-evaluate on next use.
sudo sqlite3 /opt/factharbor/data/source-reliability.db \
  "UPDATE source_reliability SET expires_at = datetime('now') WHERE evidence_pack IS NULL OR score IS NULL;"
```

After running, verify row count:
```bash
sudo sqlite3 /opt/factharbor/data/source-reliability.db \
  "SELECT COUNT(*) as expired FROM source_reliability WHERE expires_at <= datetime('now');"
```
Expected: ~1,035 rows expired. Then mark this step done and do not repeat.

---

## Rollback Procedure

### 1. Stop services

```bash
sudo systemctl stop factharbor-web factharbor-api
```

### 2. Revert code

```bash
cd /opt/factharbor
git checkout <last-known-good-tag>  # or: git checkout HEAD~1
```

### 3. Restore databases (if needed)

```bash
BACKUP_DATE=20260302  # Set to actual backup date
cp /opt/factharbor/backups/factharbor_${BACKUP_DATE}.db /opt/factharbor/data/factharbor.db
cp /opt/factharbor/backups/config_${BACKUP_DATE}.db /opt/factharbor/data/config.db
cp /opt/factharbor/backups/source-reliability_${BACKUP_DATE}.db /opt/factharbor/data/source-reliability.db
```

> **Important:** Always restore all 3 databases together to maintain consistency.

### 4. Rebuild and restart

```bash
cd /opt/factharbor/apps/api && dotnet publish -c Release -o /opt/factharbor/deploy/api
cd /opt/factharbor && npm ci && npm -w apps/web run build
cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static
sudo systemctl start factharbor-api factharbor-web
```

### 5. Verify

```bash
curl -s https://app.factharbor.ch/api/health
```

---

## Configuration

### Environment variables

**Location:** `/opt/factharbor/deploy/.env.production`

```bash
# View (keys only, no secrets)
grep "^[A-Z]" /opt/factharbor/deploy/.env.production | sed 's/=.*/=***/'

# Edit
sudo nano /opt/factharbor/deploy/.env.production

# After editing, restart both services:
sudo systemctl restart factharbor-api factharbor-web
```

Key variables:

| Variable | Purpose |
|----------|---------|
| `FH_ADMIN_KEY` | API admin authentication |
| `FH_INTERNAL_RUNNER_KEY` | Runner → Next.js authentication |
| `ANTHROPIC_API_KEY` | Primary LLM provider |
| `OPENAI_API_KEY` | Secondary LLM provider |
| `GOOGLE_CSE_API_KEY` / `GOOGLE_CSE_ID` | Google Custom Search |
| `BRAVE_API_KEY` | Brave Search (fallback) |
| `SERPAPI_API_KEY` | SerpAPI (fallback) |
| `FH_RUNNER_MAX_CONCURRENCY` | Max parallel analysis jobs (default: 3) |
| `FH_CORS_ORIGIN` | Allowed CORS origin (`https://app.factharbor.ch`) |
| `FH_CONFIG_DB_PATH` | UCM database path |
| `FH_SR_CACHE_PATH` | Source reliability cache path |
| `FH_PROMPT_DIR` | Absolute path to prompt files |
| `FH_CONFIG_DEFAULTS_DIR` | Absolute path to config defaults |
| `PORT` | Next.js listen port (3000 prod, 3001 test) |

### Caddy (reverse proxy + TLS)

**Config:** `/etc/caddy/Caddyfile`

```bash
# Edit
sudo nano /etc/caddy/Caddyfile

# Validate before restarting
sudo caddy validate --config /etc/caddy/Caddyfile

# Restart
sudo systemctl restart caddy
```

### Maintenance page

Caddy automatically handles 502/503 errors when backends are unreachable (e.g., during service restarts). No manual toggling needed.

**Two-layer approach:**

1. **Caddy (server-side):** Content-negotiates based on request path:
   - `/api/*` requests → JSON `{"error":"maintenance","message":"..."}` (so the SPA can detect it)
   - All other requests → serves the visual `maintenance.html` page
2. **Client-side (SPA):** The jobs pages detect 502/503 and network errors, showing a pulsing amber "System update in progress" banner instead of a red error. Auto-recovers when the service comes back.

**Caddyfile `handle_errors` block** (must exist in each site block):

```
handle_errors {
    @backend_down expression `{err.status_code} in [502, 503]`

    handle @backend_down {
        @api_request path /api/*
        handle @api_request {
            header Content-Type "application/json"
            respond `{"error":"maintenance","message":"FactHarbor is being updated. Please try again in a moment."}` {http.error.status_code}
        }

        handle {
            root * /opt/factharbor/scripts
            rewrite * /maintenance.html
            file_server
        }
    }
}
```

**Reference:** A complete Caddyfile template with both instances is at `scripts/Caddyfile.reference`.

**To apply on VPS** (if the current Caddyfile uses the old HTML-only pattern):

```bash
sudo nano /etc/caddy/Caddyfile    # Replace handle_errors blocks
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

**To test:** stop the web service (`sudo systemctl stop factharbor-web`), visit the site in a browser (should see maintenance.html) and test an API URL (`curl -s https://app.factharbor.ch/api/health` should return the JSON maintenance response), then restart.

### Systemd service files

```
/etc/systemd/system/factharbor-api.service
/etc/systemd/system/factharbor-web.service
```

After editing service files:

```bash
sudo systemctl daemon-reload
sudo systemctl restart factharbor-api factharbor-web
```

---

## Backups

### Automatic

Daily at 03:00 UTC via cron. Script: `/opt/factharbor/scripts/backup-dbs.sh`

Uses `sqlite3 .backup` (consistency-safe — holds read lock during copy).

Retention: 14 days.

```bash
# Check cron
crontab -l

# Manual backup
/opt/factharbor/scripts/backup-dbs.sh

# List backups
ls -la /opt/factharbor/backups/

# Check backup log
cat /var/log/factharbor-backup.log
```

---

## Monitoring

### Service health

```bash
sudo systemctl status factharbor-api factharbor-web caddy
```

### Logs

```bash
# API logs
sudo journalctl -u factharbor-api -f

# Web logs
sudo journalctl -u factharbor-web -f

# Caddy access log
tail -f /var/log/caddy/access.log

# Last 50 lines of a specific service
sudo journalctl -u factharbor-web --no-pager -n 50
```

### Disk usage

```bash
df -h /
du -sh /opt/factharbor/data/
du -sh /opt/factharbor/backups/
```

### Admin dashboard

`https://app.factharbor.ch/admin` — tests API keys, search providers, config, circuit breaker status.

---

## Security

### Firewall (two layers)

1. **Infomaniak panel firewall** (VPS → Firewall): ports 22, 80, 443 open
2. **UFW** (OS level): same ports

```bash
sudo ufw status
```

### SSH

- Key-only auth (password disabled)
- Key: `~/.ssh/fh` (ed25519)

### Secrets rotation

Rotate `FH_ADMIN_KEY` and `FH_INTERNAL_RUNNER_KEY` every 90 days:

```bash
# Generate new keys
openssl rand -hex 32

# Update .env.production, then:
sudo systemctl restart factharbor-api factharbor-web
```

---

## Troubleshooting

### API won't start

```bash
sudo journalctl -u factharbor-api --no-pager -n 30
```

Common causes:
- **Connection string error** — check quotes in service file: `Environment="ConnectionStrings__FhDbSqlite=Data Source=/opt/factharbor/data/factharbor.db"`
- **Permission denied on data dir** — `sudo chown -R factharbor:factharbor /opt/factharbor/data`

### Web won't start

```bash
sudo journalctl -u factharbor-web --no-pager -n 30
```

Common causes:
- **Module not found** — run `npm ci` from project root (`/opt/factharbor`), not from `apps/web`
- **Missing static assets** — re-run `cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static`

### Caddy won't start

```bash
sudo journalctl -u caddy --no-pager -n 20 --output=cat
```

Common causes:
- **Log permission denied** — `sudo chown caddy:caddy /var/log/caddy && sudo rm -f /var/log/caddy/access.log`
- **TLS cert failure** — check DNS resolves: `dig +short app.factharbor.ch`
- **Port blocked** — check Infomaniak panel firewall has ports 80+443 open

### Analysis jobs failing

Check the admin dashboard at `/admin` for provider status. Common causes:
- **Anthropic "Overloaded"** — transient; lower `FH_RUNNER_MAX_CONCURRENCY` to 1-2
- **Google CSE 429** — quota exceeded; system auto-falls back to Brave/SerpAPI
- **Circuit breaker OPEN** — will auto-reset; check which providers are affected

### Test instance won't start

```bash
sudo journalctl -u factharbor-api-test --no-pager -n 30
sudo journalctl -u factharbor-web-test --no-pager -n 30
```

Common causes:
- **API: EADDRINUSE on port 5000** — missing `Kestrel__Endpoints__Http__Url` override in service file (defaults to prod port)
- **Web: EADDRINUSE on port 3000** — `.env.test` has `PORT=3000` instead of `PORT=3001` (check `grep ^PORT /opt/factharbor/deploy/.env.test`)
- **Jobs stuck QUEUED** — missing `Runner__BaseUrl=http://localhost:3001` in API test service (triggers prod runner instead)
- **Caddy won't restart after adding test** — `sudo touch /var/log/caddy/test-access.log && sudo chown caddy:caddy /var/log/caddy/test-access.log`

### General debugging

```bash
# Check all service statuses
sudo systemctl status factharbor-api factharbor-web caddy

# Check resource usage
free -h
df -h /
top -bn1 | head -20

# Check if ports are listening
sudo ss -tlnp | grep -E ':(80|443|3000|3001|5000|5001) '
```

---

## Test Instance (`test.factharbor.ch`)

A second isolated instance sharing the same code/builds but with separate databases, config, and services. Set up on 2026-03-03.

### Architecture

```
test.factharbor.ch → Caddy :443 → localhost:3001 (Next.js test) → localhost:5001 (API test) → data-test/*.db
app.factharbor.ch  → Caddy :443 → localhost:3000 (Next.js prod) → localhost:5000 (API prod)  → data/*.db
```

### Components

| Component | Prod | Test |
|-----------|------|------|
| Next.js port | 3000 | 3001 |
| API port | 5000 | 5001 |
| Systemd services | `factharbor-api`, `factharbor-web` | `factharbor-api-test`, `factharbor-web-test` |
| Env file | `deploy/.env.production` | `deploy/.env.test` |
| Data directory | `data/` | `data-test/` |
| Domain | `app.factharbor.ch` | `test.factharbor.ch` |
| Caddy log | `/var/log/caddy/access.log` | `/var/log/caddy/test-access.log` |

### Service management

```bash
# Status
sudo systemctl status factharbor-api-test factharbor-web-test

# Restart test only
sudo systemctl restart factharbor-api-test factharbor-web-test

# Logs
sudo journalctl -u factharbor-api-test -f
sudo journalctl -u factharbor-web-test -f

# Health checks
curl -s http://localhost:5001/health
curl -s http://localhost:3001/api/health
curl -s https://test.factharbor.ch/api/health
```

### Key differences in `.env.test`

| Variable | Value |
|----------|-------|
| `FH_API_BASE_URL` | `http://localhost:5001` |
| `FH_CORS_ORIGIN` | `https://test.factharbor.ch` |
| `FH_CONFIG_DB_PATH` | `/opt/factharbor/data-test/config.db` |
| `FH_SR_CACHE_PATH` | `/opt/factharbor/data-test/source-reliability.db` |
| `PORT` | `3001` |
| `FH_RUNNER_MAX_CONCURRENCY` | `1` |

Auth keys (`FH_ADMIN_KEY`, `FH_INTERNAL_RUNNER_KEY`) are shared with production for convenience.

### Critical systemd overrides for test API

The test API service file (`/etc/systemd/system/factharbor-api-test.service`) requires these `Environment=` lines beyond what's in `.env.test`:

```ini
Environment="Kestrel__Endpoints__Http__Url=http://127.0.0.1:5001"  # Overrides appsettings.Production.json port 5000
Environment="Runner__BaseUrl=http://localhost:3001"                  # Routes runner trigger to test web, not prod
Environment="ConnectionStrings__FhDbSqlite=Data Source=/opt/factharbor/data-test/factharbor.db"
```

> **Why these are needed:** `appsettings.Production.json` hardcodes Kestrel to port 5000 (ignores `ASPNETCORE_URLS`), and `appsettings.json` hardcodes `Runner:BaseUrl` to `http://localhost:3000`. Without these overrides, the test API binds to port 5000 (conflict) and triggers the production runner.

### Setup (one-time)

```bash
bash /opt/factharbor/scripts/setup-test-instance.sh
```

This script creates `data-test/`, `.env.test`, both systemd services, updates the Caddyfile, and runs health checks. See script comments for details.

### Deployment

Test and production have separate deploy scripts:

```bash
bash /opt/factharbor/scripts/deploy.sh          # Build + restart prod (stops test for OOM)
bash /opt/factharbor/scripts/deploy-test.sh     # Restart test (no build, uses shared artifacts)
```

After `deploy.sh`, test services are stopped (to free RAM during build). Run `deploy-test.sh` to bring them back up. You can also run `deploy-test.sh` independently to restart just the test instance.

### Stop/disable test instance

```bash
sudo systemctl stop factharbor-api-test factharbor-web-test
sudo systemctl disable factharbor-api-test factharbor-web-test
```

---

## Initial Setup (from scratch)

This section documents the full setup performed on 2026-03-02 for reference. Use the procedures above for day-to-day operations.

### Prerequisites

- Infomaniak VPS Lite M (Ubuntu 24.04 LTS)
- SSH key added to Infomaniak Schlüsselbund
- Domain `factharbor.ch` managed at Infomaniak

### 1. System setup

```bash
sudo apt update && sudo apt upgrade -y
sudo hostnamectl set-hostname factharbor
sudo ufw allow OpenSSH && sudo ufw allow http && sudo ufw allow https && sudo ufw enable
```

### 2. Install runtimes

```bash
# .NET 8 runtime + SDK
sudo apt install -y aspnetcore-runtime-8.0 dotnet-sdk-8.0

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy

# SQLite CLI + git
sudo apt install -y sqlite3 git
```

### 3. Deploy code

```bash
sudo mkdir -p /opt/factharbor
sudo chown ubuntu:ubuntu /opt/factharbor
git clone https://github.com/robertschaub/FactHarbor.git /opt/factharbor

cd /opt/factharbor/apps/api
dotnet publish -c Release -o /opt/factharbor/deploy/api

cd /opt/factharbor
npm ci
npm -w apps/web run build
cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static

mkdir -p /opt/factharbor/data
```

### 4. Configure

- **Env file:** `/opt/factharbor/deploy/.env.production` (all API keys + config paths)
- **Caddyfile:** `/etc/caddy/Caddyfile` (reverse proxy app.factharbor.ch → localhost:3000)
- **Systemd:** `/etc/systemd/system/factharbor-api.service` + `factharbor-web.service`
- **Service user:** `sudo useradd -r -s /bin/false factharbor`
- **Data dir permissions:** `sudo chown -R factharbor:factharbor /opt/factharbor/data`

### 5. DNS (Infomaniak panel)

| Type | Name | Value |
|------|------|-------|
| A | `app` | `83.228.221.114` |
| AAAA | `app` | `2001:1600:18:201::36e` |
| A | `test` | `83.228.221.114` |
| AAAA | `test` | `2001:1600:18:201::36e` |

### 6. Infomaniak panel firewall

Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)

### 7. Hardening

```bash
# Disable password auth
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd

# Auto security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```
