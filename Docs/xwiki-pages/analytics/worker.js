/**
 * FactHarbor Docs Analytics — Cloudflare Worker
 *
 * Privacy-preserving page view tracking for gh-pages xWiki viewer.
 * No cookies, no PII, no fingerprinting.
 *
 * KV schema (single key pattern):
 *   page:{pageRef} → { v: totalViews, u: { [anonId]: count } }
 *
 * Endpoints:
 *   POST /track  — Record a page view  { p: pageRef, id: visitorId }
 *   GET  /stats  — All page stats       [{ p, v, u }]
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (data, s = 200) => new Response(JSON.stringify(data), {
  status: s, headers: { 'Content-Type': 'application/json', ...CORS },
});

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS')
      return new Response(null, { status: 204, headers: CORS });

    const path = new URL(request.url).pathname;

    // --- Track a page view ---
    if (request.method === 'POST' && path === '/track') {
      let body;
      try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400); }
      const { p, id } = body;
      if (!p || !id) return json({ error: 'missing p or id' }, 400);

      const key = `page:${p.slice(0, 200)}`;
      const vid = id.slice(0, 64);
      const rec = JSON.parse((await env.ANALYTICS.get(key)) || '{"v":0,"u":{}}');
      rec.v++;
      rec.u[vid] = (rec.u[vid] || 0) + 1;
      await env.ANALYTICS.put(key, JSON.stringify(rec));
      return json({ ok: true });
    }

    // --- Get all stats ---
    if (request.method === 'GET' && path === '/stats') {
      const list = await env.ANALYTICS.list({ prefix: 'page:' });
      const pages = [];
      for (const key of list.keys) {
        const rec = JSON.parse((await env.ANALYTICS.get(key.name)) || '{}');
        pages.push({
          p: key.name.slice(5),
          v: rec.v || 0,
          u: Object.keys(rec.u || {}).length,
        });
      }
      pages.sort((a, b) => b.v - a.v);
      return json(pages);
    }

    return json({ error: 'not found' }, 404);
  },
};
