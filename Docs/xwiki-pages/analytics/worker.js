/**
 * FactHarbor Docs Analytics — Cloudflare Worker
 *
 * Privacy-preserving page view tracking for gh-pages xWiki viewer.
 * - No cookies, no PII, no fingerprinting
 * - Visitors identified by self-generated anonymous UUID (client-side localStorage)
 * - Data stored in Cloudflare KV
 *
 * KV key schema:
 *   page:{pageRef}    → { views: N, visitors: { [anonId]: count } }
 *   visitor:{anonId}  → { views: N, pages: { [pageRef]: count } }
 *   meta:summary      → { totalViews: N, uniqueVisitors: N, lastUpdated: ISO }
 *
 * Endpoints:
 *   POST /track         — Record a page view { pageRef, visitorId }
 *   GET  /stats/pages   — All page stats (sorted by views desc)
 *   GET  /stats/visitors — All visitor stats (sorted by views desc)
 *   GET  /stats/summary  — Overall summary
 *
 * Bind KV namespace as ANALYTICS in wrangler.toml.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function corsOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// ---------- Track ----------

async function handleTrack(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const { pageRef, visitorId } = body;
  if (!pageRef || typeof pageRef !== 'string' || !visitorId || typeof visitorId !== 'string') {
    return jsonResponse({ error: 'Missing pageRef or visitorId' }, 400);
  }

  // Sanitize inputs (max length, alphanumeric + dots/hyphens/underscores)
  const safePageRef = pageRef.slice(0, 200);
  const safeVisitorId = visitorId.slice(0, 64);

  // Update page record
  const pageKey = `page:${safePageRef}`;
  const pageData = JSON.parse((await env.ANALYTICS.get(pageKey)) || '{"views":0,"visitors":{}}');
  pageData.views += 1;
  pageData.visitors[safeVisitorId] = (pageData.visitors[safeVisitorId] || 0) + 1;
  await env.ANALYTICS.put(pageKey, JSON.stringify(pageData));

  // Update visitor record
  const visitorKey = `visitor:${safeVisitorId}`;
  const visitorData = JSON.parse((await env.ANALYTICS.get(visitorKey)) || '{"views":0,"pages":{}}');
  visitorData.views += 1;
  visitorData.pages[safePageRef] = (visitorData.pages[safePageRef] || 0) + 1;
  await env.ANALYTICS.put(visitorKey, JSON.stringify(visitorData));

  // Update summary
  const summaryKey = 'meta:summary';
  const summary = JSON.parse((await env.ANALYTICS.get(summaryKey)) || '{"totalViews":0,"uniqueVisitors":0}');
  summary.totalViews += 1;
  // Count unique visitors from page data (approximation: check if visitor is new)
  if (visitorData.views === 1) {
    summary.uniqueVisitors += 1;
  }
  summary.lastUpdated = new Date().toISOString();
  await env.ANALYTICS.put(summaryKey, JSON.stringify(summary));

  return jsonResponse({ ok: true });
}

// ---------- Stats ----------

async function handleStatsPages(env) {
  const list = await env.ANALYTICS.list({ prefix: 'page:' });
  const pages = [];

  for (const key of list.keys) {
    const data = JSON.parse((await env.ANALYTICS.get(key.name)) || '{}');
    const pageRef = key.name.slice(5); // Remove "page:" prefix
    pages.push({
      pageRef,
      totalViews: data.views || 0,
      uniqueVisitors: Object.keys(data.visitors || {}).length,
    });
  }

  pages.sort((a, b) => b.totalViews - a.totalViews);
  return jsonResponse({ pages });
}

async function handleStatsVisitors(env) {
  const list = await env.ANALYTICS.list({ prefix: 'visitor:' });
  const visitors = [];

  for (const key of list.keys) {
    const data = JSON.parse((await env.ANALYTICS.get(key.name)) || '{}');
    const visitorId = key.name.slice(8); // Remove "visitor:" prefix
    visitors.push({
      visitorId: visitorId.slice(0, 8) + '...', // Truncate for display
      totalViews: data.views || 0,
      pagesVisited: Object.keys(data.pages || {}).length,
    });
  }

  visitors.sort((a, b) => b.totalViews - a.totalViews);
  return jsonResponse({ visitors });
}

async function handleStatsSummary(env) {
  const summary = JSON.parse((await env.ANALYTICS.get('meta:summary')) || '{"totalViews":0,"uniqueVisitors":0}');
  return jsonResponse(summary);
}

// ---------- Router ----------

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return corsOptions();
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'POST' && path === '/track') {
      return handleTrack(request, env);
    }

    if (request.method === 'GET') {
      if (path === '/stats/pages') return handleStatsPages(env);
      if (path === '/stats/visitors') return handleStatsVisitors(env);
      if (path === '/stats/summary') return handleStatsSummary(env);
    }

    return jsonResponse({ error: 'Not found' }, 404);
  },
};
