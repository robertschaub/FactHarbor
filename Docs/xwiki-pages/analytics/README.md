# FactHarbor Docs Analytics

Privacy-preserving page view tracking for the gh-pages xWiki documentation viewer.

## How It Works

```
gh-pages viewer (static)           Cloudflare Worker + KV
  │                                  │
  ├─ loadPage() ──POST /track──────► page:{ref} → { v, u:{id:count} }
  │   { p: pageRef, id: visitorId }  │
  └─ Stats btn ───GET /stats───────► [{ p, v, u }]  (sorted by views)
```

- **No cookies, no PII** — visitor ID is a random UUID in localStorage
- **2 endpoints** — `POST /track` to record, `GET /stats` to read
- **1 KV key pattern** — `page:{ref}` stores views + anonymous visitor counts
- **Data persists** across gh-pages rebuilds (lives in Cloudflare KV)

## Setup

### 1. Install Wrangler

```bash
npm install -g wrangler
wrangler login
```

### 2. Create KV namespace

```bash
cd Docs/xwiki-pages/analytics
wrangler kv namespace create ANALYTICS
```

Paste the `id` into [wrangler.toml](wrangler.toml).

### 3. Deploy

```bash
wrangler deploy
```

Note the Worker URL (e.g. `https://factharbor-docs-analytics.YOUR.workers.dev`).

### 4. Configure GitHub Actions

Add repo secret: **Settings > Secrets > Actions > `DOCS_ANALYTICS_URL`** = your Worker URL.

Next docs deployment will include analytics automatically.

### 5. Local build with analytics

```bash
python Docs/xwiki-pages/scripts/build_ghpages.py --analytics-url https://your-worker.workers.dev
```

Without `--analytics-url`, analytics is disabled (Stats button hidden).

## Files

| File | Purpose |
|------|---------|
| `worker.js` | Cloudflare Worker (~65 lines) |
| `wrangler.toml` | Deployment config |
