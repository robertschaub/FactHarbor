// The MkDocs build injects route data; no content parser is shipped.
(() => {
  'use strict';
  const routes = ROUTE_DATA;
  const currentScript = document.currentScript;
  const root = new URL('../', currentScript.src);
  try { localStorage.removeItem('fh_vid'); } catch { /* Storage may be unavailable. */ }
  function navigate() {
    const query = new URLSearchParams(location.search);
    const hasPage = query.has('page');
    let hash;
    try { hash = decodeURIComponent(location.hash.slice(1)); }
    catch { location.replace(new URL('404.html',root)); return; }
    const isRoot = location.pathname===root.pathname || location.pathname===root.pathname+'index.html';
    if (!hasPage && (!isRoot || !hash || document.getElementById(hash))) return;
    const key = hasPage ? query.get('page') : hash;
    const destination = Object.hasOwn(routes,key) ? routes[key] : '404.html';
    const url = new URL(destination,root);
    // A second page key is the old viewer's hash, not a section anchor.
    if (hasPage && hash && !Object.hasOwn(routes,hash)) url.hash=hash;
    if (url.href!==location.href) location.replace(url.href);
  }
  navigate();
  window.addEventListener('hashchange',navigate);
})();
