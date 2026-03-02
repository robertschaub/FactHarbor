# Deployment Strategy — Limited Public Pre-Release

**Filed by:** Deputy Captain (Claude Code, Opus 4.6)
**Date:** 2026-03-02
**Status:** DRAFT — Awaiting review
**Depends on:** `Docs/WIP/2026-03-01_Limited_Public_PreRelease_Readiness_Plan.md` (Steps 0-12 complete)

---

## 1. Problem Statement

All 12 implementation steps of the pre-release readiness plan are complete. Security hardening is done. But **there is no deployment mechanism** — everything assumes the dev machine is the server.

### What exists

| Asset | Purpose | Production-ready? |
|-------|---------|-------------------|
| `scripts/restart-clean.ps1` | Start API (`dotnet watch run`) + Web (`npm run dev`) in PowerShell windows | **No** — dev servers only |
| `scripts/health.ps1` | Hit `localhost:5000/health` + `localhost:3000/api/health` | Partially — logic is right, needs remote URL support |
| `scripts/stop-services.ps1` | Kill local PowerShell windows running services | **No** — local only |
| `scripts/build-and-restart.ps1` | Build + restart locally | **No** — local only |
| `scripts/validate-config.ps1` | Check env vars before startup | Yes — reusable |
| `appsettings.Production.json` | Kestrel bound to `127.0.0.1:5000` | Yes — correct for production |
| Zero-Cost Hosting Guide (xWiki) | Fly.io + Cloudflare Pages + PostgreSQL + Redis plan | **Outdated** — see §2 |
| Security Checklist | Pre-deployment verification items | Partially outdated — many items now done |

### What's missing

1. **No production process management** — dev servers (`dotnet watch run`, `npm run dev`) are not production-grade
2. **No reverse proxy / HTTPS** — no nginx, Caddy, or IIS config
3. **No Dockerfiles** — Zero-Cost guide has generic templates but nothing FactHarbor-specific
4. **No target platform selected** — no VPS, no Vercel account, no Fly.io app
5. **No production Next.js build** — `next.config.js` lacks `output: "standalone"` for self-hosted deployment
6. **No CI/CD for app deployment** — GitHub Actions only deploys docs (gh-pages)

---

## 2. Existing Documentation Review

### Zero-Cost Hosting Guide (xWiki) — Assessment

**Location:** `Docs/xwiki-pages/FactHarbor/Product Development/DevOps/Deployment/Zero-Cost Hosting Implementation Guide/WebHome.xwiki`
**Written:** 2026-01-02 (2 months ago, before most hardening)
**Status:** Approved but **architecturally outdated**

| Guide assumption | Current reality | Impact |
|-----------------|-----------------|--------|
| Cloudflare Pages for static SPA frontend | Next.js SSR with server components, API routes, proxy routes | **Breaking** — can't use Cloudflare Pages for SSR |
| Separate frontend/backend containers | Next.js is sole public surface; .NET API on localhost only (Step 11) | Architecture mismatch |
| PostgreSQL database | SQLite (3 databases: factharbor.db, config.db, source-reliability.db) | Different DB technology |
| Upstash Redis for caching | SQLite-based caching (config-storage.ts, SR cache) | Different caching technology |
| JWT auth for beta users | Invite code system (no JWT, no sessions) | Different auth model |
| Generic Dockerfile templates | No actual Dockerfiles exist in repo | Not implemented |

**Salvageable content:** Fly.io account setup, secrets management pattern, cost control philosophy, monitoring metrics, scaling strategy. The alternative section mentions Vercel.

### Vercel References in Codebase

The codebase already has Vercel awareness:
- `apps/web/src/lib/analyzer/debug.ts:60` — checks `process.env.VERCEL` to disable debug logging
- `apps/web/src/app/api/version/route.ts:13` — reads `VERCEL_GIT_COMMIT_SHA` for version info
- Workshop Report (archived) proposed "Deploy frontend on Vercel (free tier)"
- Tools Decisions xWiki: "Next.js → Vercel"
- Zero-Cost Guide §Alternative: "Vercel (free, better DX than Cloudflare)"

### Deployment Topology Diagram (xWiki)

**Location:** `Docs/xwiki-pages/FactHarbor/Product Development/Diagrams/Deployment Topology/WebHome.xwiki`

Current (POC): Single host with Next.js:3000 + .NET:5000 + SQLite.
Target (Production): Load balancer + multiple API servers + PostgreSQL + Redis + monitoring.

**For pre-release:** We're between these two. Single host, but remote and publicly accessible.

---

## 3. Architecture Constraint Analysis

### The FactHarbor deployment topology

```
Internet → HTTPS → Next.js :3000 → .NET API :5000 (localhost only)
                   (public)         (internal)
                      │                  │
                      │                  ├─ factharbor.db
                      │                  ├─ config.db (UCM)
                      │                  └─ source-reliability.db
                      │
                      ├─ /api/fh/* proxy routes → .NET API
                      ├─ /api/internal/* runner routes (self-call)
                      └─ /api/admin/* admin routes → .NET API
```

**Key constraints:**
1. Next.js is the sole public surface (Step 11: API on localhost only)
2. The runner route (`/api/internal/run-job`) is long-running (30s–5min per analysis)
3. SQLite databases must be on local disk with write access
4. Three processes communicate: Next.js server, .NET API, and the runner (which is a Next.js API route calling back into itself)
5. `FH_API_BASE_URL` connects Next.js → .NET API (currently `http://localhost:5000`)
6. `Runner__BaseUrl` connects .NET API → Next.js runner (currently `http://localhost:3000`)

### Platform evaluation

| Platform | Next.js SSR | .NET API | SQLite | Long-running (5min) | Cost | Complexity |
|----------|-------------|----------|--------|---------------------|------|------------|
| **Vercel (free)** | ✅ Native | ❌ No .NET | ❌ No disk | ❌ 60s timeout | $0 | Low (Next.js only) |
| **Vercel Pro** | ✅ Native | ❌ No .NET | ❌ No disk | ❌ 300s timeout (jobs ~7min) | $20/mo | Low (Next.js only) |
| **Vercel + VPS** | ✅ Native | ✅ On VPS | ✅ On VPS | ❌ Vercel timeout (even Pro: 300s < 420s typical) | $5-25/mo | High — split infra, networking |
| **Single VPS + Caddy** | ✅ Standalone | ✅ Bare-metal | ✅ Local disk | ✅ No timeout | €4.50-10/mo | Medium |
| **Fly.io (2 containers)** | ✅ Docker | ✅ Docker | ⚠️ Volume needed | ✅ No timeout | $0-5/mo | High — Dockerfiles, volumes, networking |
| **Home server + Cloudflare Tunnel** | ✅ Standalone | ✅ Bare-metal | ✅ Local disk | ✅ No timeout | $0 | Medium — tunnel setup, availability |

### Vercel timeout problem (critical)

Analysis jobs trigger `/api/internal/run-job` which runs the full ClaimAssessmentBoundary pipeline (5 stages, multiple LLM calls, web searches). Typical runtime: **1-5 minutes**.

- Vercel Free: **60-second function timeout** → analyses would fail
- Vercel Pro ($20/mo): **300-second timeout** → still insufficient (typical analysis: ~7 minutes / 420s)
- Any VPS: **no timeout** → all jobs complete

This is the single biggest factor against Vercel for the pre-release. The runner route is not a simple proxy — it's the analysis engine itself.

**Workaround possibility:** Restructure so the .NET API triggers the runner on the VPS directly (bypassing Vercel). But this requires:
- Moving runner logic out of Next.js API routes, or
- Having the VPS run a second Next.js instance for the runner, or
- The .NET API calling a VPS-hosted runner URL instead of Vercel

This adds significant complexity for pre-release.

---

## 4. Recommendation: Single VPS + Caddy

### Why

| Factor | VPS + Caddy | Vercel + VPS | Fly.io |
|--------|-------------|--------------|--------|
| No timeout issues | ✅ | ❌ Requires workaround | ✅ |
| Deployment simplicity | ✅ One box | ❌ Split infra | ❌ Docker + volumes |
| SQLite on local disk | ✅ | ❌ Split (API on VPS, web on Vercel) | ⚠️ Volume mount |
| HTTPS (automatic) | ✅ Caddy auto-TLS | ✅ Vercel auto-TLS | ✅ Fly.io auto-TLS |
| Cost | €4.50-10/mo | $5-25/mo | $0-5/mo |
| Ops burden | Low (systemd + Caddy) | Medium (two platforms) | Medium (Docker + Fly CLI) |
| Migration path | Easy — move to Vercel/Fly later | Already on Vercel | Already on Fly |
| Bare-metal (Captain preference) | ✅ | Partial | ❌ Docker required |

### Proposed stack

```
VPS (Hetzner CX22 — 2 vCPU, 4GB RAM, 40GB SSD, €4.51/mo)
├── Caddy (reverse proxy, auto-HTTPS via Let's Encrypt)
│   └── factharbor.ch → localhost:3000
├── Next.js (standalone build, PM2 or systemd)
│   ├── Port 3000 (localhost only, Caddy proxies)
│   ├── FH_API_BASE_URL=http://localhost:5000
│   └── All API routes, runner, proxy, UI
├── .NET 8 API (published binary, systemd)
│   ├── Port 5000 (localhost only — appsettings.Production.json)
│   ├── Runner__BaseUrl=http://localhost:3000
│   └── SQLite databases on disk
└── SQLite databases
    ├── factharbor.db (jobs, events, invites)
    ├── config.db (UCM)
    └── source-reliability.db (SR cache)
```

### Why Hetzner CX22 specifically

- **€4.51/mo** (cheapest tier with enough RAM for Node.js + .NET)
- 2 shared vCPU, 4GB RAM, 40GB SSD
- EU datacenter (relevant for `factharbor.ch` Swiss domain)
- IPv4 + IPv6 included
- Automatic backups: +€0.96/mo (20% of base)
- Can upgrade in-place if needed (CX32: 8GB RAM, €8.49/mo)

Alternative providers: DigitalOcean ($6/mo), Vultr ($6/mo), OVH (€3.50/mo). Any Linux VPS with 2GB+ RAM works.

---

## 5. Implementation Plan — Step 9 Revised

### Phase 1: VPS Setup (~1-2 hours)

#### 9a. Provision VPS

1. Create Hetzner account, provision CX22 (Ubuntu 24.04 LTS)
2. Add SSH key, disable password auth
3. Configure UFW firewall: allow SSH (22), HTTP (80), HTTPS (443) only
4. Set hostname: `factharbor` or similar
5. Point DNS: `factharbor.ch` A record → VPS IP (and AAAA for IPv6)

#### 9b. Install runtimes

```bash
# .NET 8 runtime (not SDK — production only needs runtime)
wget https://dot.net/v1/dotnet-install.sh -O dotnet-install.sh
chmod +x dotnet-install.sh
./dotnet-install.sh --runtime aspnetcore --version 8.0 --install-dir /usr/share/dotnet
ln -s /usr/share/dotnet/dotnet /usr/local/bin/dotnet

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Caddy (reverse proxy)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

#### 9c. Deploy application code

```bash
# Create app directory
sudo mkdir -p /opt/factharbor
sudo chown $USER:$USER /opt/factharbor

# Option A: git clone (simplest for pre-release)
cd /opt/factharbor
git clone https://github.com/<org>/FactHarbor.git .

# Option B: rsync from dev machine (if repo is private)
# rsync -avz --exclude node_modules --exclude .git c:/DEV/FactHarbor/ user@vps:/opt/factharbor/

# Build .NET API (published, release mode)
cd /opt/factharbor/apps/api
dotnet publish -c Release -o /opt/factharbor/deploy/api

# Build Next.js (standalone mode — requires next.config.js change)
cd /opt/factharbor/apps/web
npm ci
npm run build
# Standalone output in .next/standalone/
```

**Required code change:** Add `output: "standalone"` to `next.config.js` for self-hosted deployment:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone"
};
module.exports = nextConfig;
```

This makes Next.js produce a self-contained `server.js` that doesn't need `node_modules` at runtime.

### Phase 2: Configure Services (~1 hour)

#### 9d. Environment variables

Create `/opt/factharbor/deploy/.env.production`:

```bash
# API connection (both on localhost)
FH_API_BASE_URL=http://localhost:5000
ASPNETCORE_ENVIRONMENT=Production

# Security keys (GENERATE NEW — do not reuse dev values)
FH_ADMIN_KEY=<generate: openssl rand -hex 32>
FH_INTERNAL_RUNNER_KEY=<generate: openssl rand -hex 32>

# LLM providers
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Search providers (as configured in UCM)
GOOGLE_CSE_API_KEY=...
GOOGLE_CSE_CX=...
BRAVE_API_KEY=...

# CORS (must match the public domain)
FH_CORS_ORIGIN=https://factharbor.ch

# Runner
FH_RUNNER_MAX_CONCURRENCY=3

# Paths (use absolute paths on the VPS)
FH_CONFIG_DB_PATH=/opt/factharbor/data/config.db
FH_SR_CACHE_PATH=/opt/factharbor/data/source-reliability.db

# Node
NODE_ENV=production
PORT=3000
```

Create `/opt/factharbor/data/` directory for SQLite databases:

```bash
mkdir -p /opt/factharbor/data
# factharbor.db will be created by EF migrations on first run
# config.db will be created by config-storage.ts on first run
```

#### 9e. Caddy configuration

Create `/etc/caddy/Caddyfile`:

```
factharbor.ch {
    reverse_proxy localhost:3000

    # Security headers (Step 10a)
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
        # CSP can be added later (Step 10a — deferred)
    }

    # Access logging
    log {
        output file /var/log/caddy/access.log
        format json
    }
}
```

Caddy automatically obtains and renews Let's Encrypt TLS certificates.

#### 9f. Systemd services

Create `/etc/systemd/system/factharbor-api.service`:

```ini
[Unit]
Description=FactHarbor .NET API
After=network.target

[Service]
Type=simple
User=factharbor
WorkingDirectory=/opt/factharbor/deploy/api
ExecStart=/usr/local/bin/dotnet /opt/factharbor/deploy/api/FactHarbor.Api.dll
EnvironmentFile=/opt/factharbor/deploy/.env.production
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ConnectionStrings__FhDbSqlite=Data Source=/opt/factharbor/data/factharbor.db
Environment=Runner__BaseUrl=http://localhost:3000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/factharbor-web.service`:

```ini
[Unit]
Description=FactHarbor Next.js Web
After=network.target factharbor-api.service
Wants=factharbor-api.service

[Service]
Type=simple
User=factharbor
WorkingDirectory=/opt/factharbor/apps/web/.next/standalone
ExecStart=/usr/bin/node server.js
EnvironmentFile=/opt/factharbor/deploy/.env.production
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo useradd -r -s /bin/false factharbor
sudo chown -R factharbor:factharbor /opt/factharbor/data

sudo systemctl daemon-reload
sudo systemctl enable factharbor-api factharbor-web caddy
sudo systemctl start factharbor-api
sudo systemctl start factharbor-web
sudo systemctl restart caddy
```

### Phase 3: Verify (~30 min)

#### 9g. Health checks

```bash
# API health (internal)
curl http://localhost:5000/health

# Web health (internal)
curl http://localhost:3000/api/health

# Public HTTPS
curl https://factharbor.ch/api/health

# Verify Swagger is NOT exposed
curl -o /dev/null -s -w "%{http_code}" https://factharbor.ch/swagger
# Expected: 404 (Swagger disabled in Production)

# Verify .NET API is NOT reachable externally
# (from a different machine)
curl http://<vps-ip>:5000/health
# Expected: connection refused (firewall blocks, Kestrel on localhost only)
```

#### 9h. Run Step 8b smoke checks against production

Run the 11-point smoke checklist from Step 8b against `https://factharbor.ch` instead of `localhost:3000`.

#### 9i. Seed initial data

```bash
# Create invite code(s) via admin API
curl -X POST https://factharbor.ch/api/fh/admin/invite-codes \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: <production-admin-key>" \
  -d '{"code":"BETA-2026-PREVIEW","dailyLimit":10,"lifetimeLimit":50,"isActive":true}'
```

### Phase 4: Operational Procedures

#### 9j. Deployment procedure (for updates)

```bash
# 1. SSH into VPS
ssh user@factharbor.ch

# 2. Pull latest code
cd /opt/factharbor
git pull

# 3. Build API
cd apps/api
dotnet publish -c Release -o /opt/factharbor/deploy/api

# 4. Build Web
cd ../web
npm ci
npm run build

# 5. Restart services
sudo systemctl restart factharbor-api
sudo systemctl restart factharbor-web

# 6. Verify
curl https://factharbor.ch/api/health
curl https://factharbor.ch/api/version
```

#### 9k. Rollback procedure

```bash
# 1. Stop services
sudo systemctl stop factharbor-web factharbor-api

# 2. Revert code
cd /opt/factharbor
git checkout <last-known-good-commit>

# 3. Restore DB backup if needed
cp /opt/factharbor/backups/factharbor_$(date -I).db /opt/factharbor/data/factharbor.db

# 4. Rebuild and restart
cd apps/api && dotnet publish -c Release -o /opt/factharbor/deploy/api
cd ../web && npm ci && npm run build
sudo systemctl start factharbor-api factharbor-web

# 5. Verify
curl https://factharbor.ch/api/health
```

#### 9l. Backup schedule

```bash
# Add to crontab (daily at 03:00 UTC)
0 3 * * * cp /opt/factharbor/data/factharbor.db /opt/factharbor/backups/factharbor_$(date +\%Y\%m\%d).db
0 3 * * * cp /opt/factharbor/data/config.db /opt/factharbor/backups/config_$(date +\%Y\%m\%d).db

# Retain 14 days
0 4 * * * find /opt/factharbor/backups -name "*.db" -mtime +14 -delete
```

#### 9m. Monitoring

- **Service health:** `systemctl status factharbor-api factharbor-web caddy`
- **Logs:** `journalctl -u factharbor-api -f` / `journalctl -u factharbor-web -f`
- **Caddy access log:** `/var/log/caddy/access.log`
- **Disk usage:** SQLite databases grow ~1-5MB per analysis job
- **Uptime:** External ping via UptimeRobot (free) or similar on `https://factharbor.ch/api/health`

---

## 6. Required Code Changes

| File | Change | Why |
|------|--------|-----|
| `apps/web/next.config.js` | Add `output: "standalone"` | Required for self-hosted Next.js (produces standalone `server.js`) |
| `apps/web/.env.example` | Add `FH_CORS_ORIGIN` documentation | Ensure production CORS is documented |

**Note:** `output: "standalone"` changes the build output. The `.next/standalone/` directory contains a self-contained Node.js server. Static assets must be copied separately (`.next/static/` → `.next/standalone/.next/static/`, `public/` → `.next/standalone/public/`). This is standard Next.js standalone deployment procedure.

---

## 7. Cost Estimate

| Item | Monthly | Notes |
|------|---------|-------|
| VPS (Hetzner CX22) | €4.51 | 2 vCPU, 4GB RAM, 40GB SSD |
| Automatic backups | €0.96 | Hetzner server snapshots (optional) |
| Domain (factharbor.ch) | ~€1.00 | Already owned |
| LLM API calls | $2-10 | Depends on usage volume |
| Search API calls | $0-5 | Google CSE free tier: 100/day |
| **Total** | **~€7-17/mo** | |

---

## 8. Future Migration Path

When traffic or requirements grow beyond pre-release:

1. **Vercel Pro ($20/mo)** for Next.js — better DX, automatic preview deployments, analytics. Only viable after decoupling the runner from Next.js API routes (current jobs take ~7min, exceeding even Pro's 300s limit). Requires significant refactor.
2. **PostgreSQL** when SQLite hits concurrency limits (~50+ concurrent users). Migrate via EF Core provider swap.
3. **Docker + Fly.io** for both services — enables auto-scaling, zero-downtime deploys.
4. **Full CI/CD** — GitHub Actions: build → test → deploy to VPS via SSH/rsync.

---

## 9. Alternatives Considered

### Vercel (free) + VPS for .NET API

**Rejected because:**
- 60-second serverless function timeout kills analysis jobs (1-5 min)
- Split infrastructure: Next.js on Vercel, .NET on VPS, networking complexity
- SQLite must be on VPS, but runner runs on Vercel → can't access DB directly
- Would need to restructure the runner architecture (significant code change)

### Vercel Pro ($20/mo) + VPS

**Rejected because:**
- 300-second timeout is **still insufficient** — typical analysis takes ~7 minutes (420s), exceeding even the Pro limit
- Still requires split infra and networking
- $20/mo and it still can't run the core workload
- Only viable if the runner is fully decoupled from Next.js API routes (significant refactor)

### Fly.io (2 containers)

**Deferred because:**
- Requires Dockerfiles (don't exist yet)
- SQLite on Fly volumes has known durability concerns
- Captain preference: bare-metal
- Can revisit if containerization becomes needed

### Home server + Cloudflare Tunnel

**Not recommended because:**
- Depends on home machine uptime and internet stability
- Not suitable for "limited public" audience
- But viable as a staging/testing environment

---

## 10. Open Questions for Captain

| # | Question | Recommendation |
|---|----------|----------------|
| D-1 | **VPS provider:** Hetzner CX22 (€4.51/mo, EU) vs alternatives? | Hetzner — cheapest, EU location matches .ch domain |
| D-2 | **Domain:** Use `factharbor.ch` directly or a subdomain like `app.factharbor.ch`? | `factharbor.ch` — simpler, single entry point |
| D-3 | **Code deployment:** Git clone (requires repo access on VPS) or rsync from dev machine? | Git clone if repo is accessible; rsync otherwise |
| D-4 | **Backups:** Hetzner automatic snapshots (€0.96/mo) in addition to DB file backups? | Yes — belt and suspenders for pre-release |
| D-5 | **Security headers (Step 10a):** Include in Caddy config now or defer? | Include basic headers now (X-Content-Type-Options, X-Frame-Options) — costs nothing |

---

## 11. Relationship to Existing Docs

| Document | Action Needed |
|----------|---------------|
| Zero-Cost Hosting Guide (xWiki) | Mark as "superseded for pre-release" — still valid as future Fly.io migration reference |
| Deployment Topology (xWiki) | Update to add "Pre-Release" topology between Current and Production |
| Pre-Release Readiness Plan (WIP) | Replace Step 9 content with reference to this document |
| Security Checklist | Update ⏳ items that are now ✅ (SSRF, auth, rate limiting, CORS) |
| KNOWN_ISSUES.md | Update S1 (SSRF → done), S2 (admin auth → done) |
