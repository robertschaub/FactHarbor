/**
 * Documentation page-view counter — Cloudflare Worker
 *
 * Aggregate page-view counting for the BestWorkplace gh-pages xWiki viewer.
 * No cookies, browser identifier, unique-visitor tracking, or public stats API.
 *
 * KV schema (single key pattern):
 *   page:{siteId}:{pageRef} → { v: totalViews }
 *
 * Endpoints:
 *   POST /track  — Record a page view  { p: "siteId:pageRef" }
 *
 * Statistics remain private in the authenticated Cloudflare account.
 */

const cors = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Vary': 'Origin',
});

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json', ...headers },
});

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowedOrigin = env.ALLOWED_ORIGIN || '';
    const allowedSiteId = env.ALLOWED_SITE_ID || '';
    const corsHeaders = cors(allowedOrigin);

    if (request.method === 'OPTIONS') {
      if (!allowedOrigin || origin !== allowedOrigin)
        return json({ error: 'forbidden' }, 403);
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const path = new URL(request.url).pathname;

    // --- Track a page view ---
    if (request.method === 'POST' && path === '/track') {
      if (!allowedOrigin || origin !== allowedOrigin)
        return json({ error: 'forbidden' }, 403);

      let body;
      try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400, corsHeaders); }
      const { p } = body;
      if (typeof p !== 'string' || !p)
        return json({ error: 'missing p' }, 400, corsHeaders);
      if (!allowedSiteId || !p.startsWith(`${allowedSiteId}:`))
        return json({ error: 'invalid site' }, 400, corsHeaders);

      const key = `page:${p.slice(0, 200)}`;
      const current = JSON.parse((await env.ANALYTICS.get(key)) || '{"v":0}');
      const views = Number.isFinite(current.v) ? current.v : 0;
      await env.ANALYTICS.put(key, JSON.stringify({ v: views + 1 }));
      return json({ ok: true }, 200, corsHeaders);
    }

    return json({ error: 'not found' }, 404);
  },
};
