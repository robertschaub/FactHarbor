# FactHarbor Docs Analytics

Privacy-preserving page view tracking for the gh-pages xWiki documentation viewer.

## Architecture

```
gh-pages viewer (static HTML)
  │
  ├─ On page load: POST /track { pageRef, visitorId }
  │   (fire-and-forget, never blocks UI)
  │
  └─ Stats panel: GET /stats/pages, /stats/visitors, /stats/summary
         │
         ▼
Cloudflare Worker + KV (serverless)
  │
  ├─ page:{ref}     → { views, visitors: { [anonId]: count } }
  ├─ visitor:{id}   → { views, pages: { [ref]: count } }
  └─ meta:summary   → { totalViews, uniqueVisitors, lastUpdated }
```

## Privacy Guarantees

- **No cookies** — visitor ID is a random UUID in localStorage
- **No PII** — no IP addresses, user agents, or fingerprints stored
- **No tracking across sites** — ID is scoped to the docs domain
- **Truncated display** — visitor IDs shown as `abc12345...` in the stats panel
- **Data is anonymous** — there is no way to identify who a visitor is

## Setup Instructions

### 1. Create Cloudflare Account

Sign up at [dash.cloudflare.com](https://dash.cloudflare.com) (free tier is sufficient).

### 2. Install Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

### 3. Create KV Namespace

```bash
cd Docs/xwiki-pages/analytics
wrangler kv namespace create ANALYTICS
```

Copy the `id` from the output and paste it into `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "ANALYTICS"
id = "paste-your-id-here"
```

### 4. Deploy the Worker

```bash
wrangler deploy
```

Note the Worker URL printed after deploy (e.g., `https://factharbor-docs-analytics.your-subdomain.workers.dev`).

### 5. Configure GitHub Actions

Add the Worker URL as a repository secret:

1. Go to GitHub repo **Settings > Secrets and variables > Actions**
2. Add secret: `DOCS_ANALYTICS_URL` = your Worker URL

The next push to `main` that triggers docs deployment will include analytics.

### 6. Local Testing

For local builds with analytics:

```bash
python Docs/xwiki-pages/scripts/build_ghpages.py \
  --analytics-url https://factharbor-docs-analytics.your-subdomain.workers.dev
```

Without the `--analytics-url` flag, analytics is disabled (stats button hidden).

## Viewer Integration

- **Stats button** appears in the toolbar when analytics is configured
- **Pages tab** shows all viewed pages sorted by view count, with unique visitor counts
- **Visitors tab** shows anonymous visitors sorted by total views, with pages-visited count
- **Page links** in the stats panel are clickable — navigates to the page
- **Data persists** across page updates (stored in Cloudflare KV, independent of gh-pages branch)

## KV Data Retention

Cloudflare KV retains data indefinitely on the free tier. The `force_orphan: true` in GitHub Actions only affects the gh-pages branch content — analytics data lives in KV, completely separate.

## Files

| File | Purpose |
|------|---------|
| `worker.js` | Cloudflare Worker script (track + stats API) |
| `wrangler.toml` | Worker deployment configuration |
| `README.md` | This file |
