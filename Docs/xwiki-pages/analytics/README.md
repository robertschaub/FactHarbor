# Documentation Page-View Counter

Aggregate page-view counting for the BestWorkplace gh-pages xWiki documentation viewer.

## How It Works

```
gh-pages viewer (static)           Cloudflare Worker + KV
  │                                  │
  └─ loadPage() ──POST /track──────► page:BW:{ref} → { v: totalViews }
      { p: "BW:" + pageRef }         │
```

- **No cookies or browser identifier** — the viewer sends only the site-prefixed page reference
- **No public statistics endpoint** — counts are visible only in the authenticated Cloudflare account
- **1 endpoint** — `POST /track` records an aggregate page view
- **1 KV key pattern** — `page:{siteId}:{ref}` stores only the total view count
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

Note the Worker URL (e.g. `https://factharbor-docs-analytics.YOUR.workers.dev`). The deployed configuration accepts browser writes only from the configured GitHub Pages origin and only for the configured site ID.

### 4. Configure GitHub Actions

Add repo secret: **Settings > Secrets > Actions > `DOCS_ANALYTICS_URL`** = your Worker URL.

The next BestWorkplace docs deployment will include aggregate page-view counting automatically.

### 5. Local build with analytics

```bash
python Docs/xwiki-pages/scripts/build_ghpages.py --analytics-url https://your-worker.workers.dev
```

Without `--analytics-url`, aggregate page-view counting is disabled.

## Files

| File | Purpose |
|------|---------|
| `worker.js` | Cloudflare Worker (~65 lines) |
| `wrangler.toml` | Deployment config |
