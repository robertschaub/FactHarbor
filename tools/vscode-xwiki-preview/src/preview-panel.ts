import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class XWikiPreviewPanel {
  public static currentPanel: XWikiPreviewPanel | undefined;
  public static pageIndex: Map<string, { uri: vscode.Uri; ref: string; name: string; relPath: string; segments: string[] }> = new Map();

  // Callbacks set by extension.ts
  public static onNavigate: (ref: string) => Promise<void> = async () => {};
  public static onResolveInclude: (ref: string) => Promise<string | null> = async () => null;

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionContext: vscode.ExtensionContext;
  private _currentDocument: vscode.TextDocument | undefined;
  private _lastDocumentUri: string | undefined;
  private _disposed = false;

  public static createOrShow(context: vscode.ExtensionContext, document: vscode.TextDocument) {
    // If panel already exists, update it with the new document
    if (XWikiPreviewPanel.currentPanel) {
      XWikiPreviewPanel.currentPanel._currentDocument = document;
      XWikiPreviewPanel.currentPanel._panel.reveal(vscode.ViewColumn.Beside, true);
      XWikiPreviewPanel.currentPanel._updateContent(document);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'xwikiPreview',
      'XWiki Preview',
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(context.extensionPath, 'src'))
        ]
      }
    );

    XWikiPreviewPanel.currentPanel = new XWikiPreviewPanel(panel, context, document);
  }

  private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext, document: vscode.TextDocument) {
    this._panel = panel;
    this._extensionContext = context;
    this._currentDocument = document;

    // Set initial HTML
    this._panel.webview.html = this._getHtmlForWebview(document.getText(), document.uri);

    // Handle messages from webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'navigate':
            await XWikiPreviewPanel.onNavigate(message.ref);
            break;
          case 'resolveInclude': {
            const content = await XWikiPreviewPanel.onResolveInclude(message.ref);
            this._panel.webview.postMessage({
              command: 'includeResolved',
              ref: message.ref,
              content: content,
              requestId: message.requestId
            });
            break;
          }
        }
      },
      null,
      []
    );

    // Dispose when panel is closed
    this._panel.onDidDispose(() => this.dispose(), null, []);
  }

  public update(document: vscode.TextDocument) {
    if (this._disposed) return;
    this._currentDocument = document;
    this._updateContent(document);
  }

  private _updateContent(document: vscode.TextDocument) {
    if (this._disposed) return;
    // Update panel title
    this._panel.title = `Preview: ${path.basename(document.uri.fsPath)}`;
    // Detect if this is a different file (scroll to top) vs same file edit (keep scroll)
    const docUri = document.uri.toString();
    const isNewFile = this._lastDocumentUri !== docUri;
    this._lastDocumentUri = docUri;
    // Build fresh page index for children resolution
    const pageIdx: Record<string, { ref: string; segments: string[]; displayTitle?: string }> = {};
    for (const [ref, info] of XWikiPreviewPanel.pageIndex) {
      pageIdx[ref] = { ref, segments: info.segments, displayTitle: info.displayTitle };
    }
    // Build attachment map for image resolution
    const attachments = this._buildAttachmentMap(document.uri);
    // Send content to webview for re-render
    this._panel.webview.postMessage({
      command: 'updateContent',
      content: document.getText(),
      fileName: path.basename(document.uri.fsPath),
      scrollToTop: isNewFile,
      currentPageRef: this._derivePageRef(document.uri),
      pageIndex: pageIdx,
      attachments
    });
  }

  private _buildAttachmentMap(documentUri: vscode.Uri): Record<string, string> {
    const map: Record<string, string> = {};
    // Walk up from the document to find _attachments/ directories in the xwiki-pages tree
    const docDir = path.dirname(documentUri.fsPath);
    // Check sibling _attachments/ (same folder as the .xwiki file)
    const localAtt = path.join(docDir, '_attachments');
    if (fs.existsSync(localAtt) && fs.statSync(localAtt).isDirectory()) {
      for (const file of fs.readdirSync(localAtt)) {
        const filePath = path.join(localAtt, file);
        if (fs.statSync(filePath).isFile()) {
          const ext = path.extname(file).toLowerCase();
          const mimeTypes: Record<string, string> = {
            '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
            '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
            '.bmp': 'image/bmp', '.ico': 'image/x-icon'
          };
          const mime = mimeTypes[ext] || 'application/octet-stream';
          try {
            const data = fs.readFileSync(filePath);
            map[file] = `data:${mime};base64,${data.toString('base64')}`;
          } catch { /* skip unreadable files */ }
        }
      }
    }
    return map;
  }

  private _derivePageRef(uri: vscode.Uri): string {
    const relPath = uri.fsPath.replace(/\\/g, '/');
    const idx = relPath.toLowerCase().indexOf('/xwiki-pages/');
    if (idx < 0) return '';
    const afterRoot = relPath.substring(idx + '/xwiki-pages/'.length);
    return afterRoot.replace(/\.xwiki$/i, '').replace(/\//g, '.');
  }

  public dispose() {
    this._disposed = true;
    XWikiPreviewPanel.currentPanel = undefined;
    this._panel.dispose();
  }

  private _getHtmlForWebview(content: string, documentUri: vscode.Uri): string {
    const extPath = this._extensionContext.extensionPath;

    // Read the CSS and parser JS from disk
    const cssContent = fs.readFileSync(path.join(extPath, 'src', 'xwiki-styles.css'), 'utf8');
    const parserJs = fs.readFileSync(path.join(extPath, 'src', 'xwiki-parser.js'), 'utf8');

    // Build page index as JSON for wiki link resolution in webview
    const pageRefs: string[] = [];
    const pageIndex: Record<string, { ref: string; segments: string[]; displayTitle?: string }> = {};
    for (const [ref, info] of XWikiPreviewPanel.pageIndex) {
      pageRefs.push(ref);
      pageIndex[ref] = { ref, segments: info.segments, displayTitle: info.displayTitle };
    }

    // Derive current page ref from document URI
    const currentPageRef = this._derivePageRef(documentUri);

    const fileName = path.basename(documentUri.fsPath);

    // Build attachment map for image resolution
    const attachments = this._buildAttachmentMap(documentUri);

    // Escape content for embedding in a script tag
    const escapedContent = JSON.stringify(content);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'unsafe-inline' https://cdnjs.cloudflare.com; img-src data: https:;">
  <link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&family=JetBrains+Mono:wght@400;500&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.9.1/mermaid.min.js"></script>
  <style>${cssContent}</style>
</head>
<body>
  <div class="preview-content" id="preview"></div>

  <script>
  // Parser
  ${parserJs}

  // Mermaid init
  mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });

  const previewEl = document.getElementById('preview');
  const vscodeApi = acquireVsCodeApi();
  let mermaidRenderCount = 0;

  // Page refs for link resolution (simple presence check)
  const pageRefs = ${JSON.stringify(pageRefs)};
  let currentPageRef = ${JSON.stringify(currentPageRef)};
  let vsPageIndex = ${JSON.stringify(pageIndex)};
  let vsAttachments = ${JSON.stringify(attachments)};

  function getChildPages(ref) {
    if (!ref || !vsPageIndex[ref]) return [];
    const page = vsPageIndex[ref];
    const segs = page.segments;
    if (segs[segs.length - 1] !== 'WebHome') return [];
    const spaceSegs = segs.slice(0, -1);
    const children = [];
    for (const [r, p] of Object.entries(vsPageIndex)) {
      if (r === ref) continue;
      const ps = p.segments;
      if (ps.length === spaceSegs.length + 2 && ps[ps.length - 1] === 'WebHome') {
        let match = true;
        for (let j = 0; j < spaceSegs.length; j++) { if (ps[j] !== spaceSegs[j]) { match = false; break; } }
        if (match) children.push({ ref: r, name: ps[spaceSegs.length] });
      } else if (ps.length === spaceSegs.length + 1 && ps[ps.length - 1] !== 'WebHome') {
        let match = true;
        for (let j = 0; j < spaceSegs.length; j++) { if (ps[j] !== spaceSegs[j]) { match = false; break; } }
        if (match) children.push({ ref: r, name: ps[spaceSegs.length] });
      }
    }
    children.sort((a, b) => a.name.localeCompare(b.name));
    return children;
  }

  function normalizeRef(ref) {
    let r = ref.replace(/^doc:/i, '').replace(/^xwiki:/i, '').trim();
    r = r.replace(/\\//g, '.').replace(/\\\\+/g, '.');
    r = r.replace(/^\\.+/, '');
    r = r.replace(/\\.WebHome$/i, '');
    return r;
  }

  function isRefResolvable(ref) {
    const norm = normalizeRef(ref);
    const normWH = norm + '.WebHome';
    const normLow = norm.toLowerCase();
    const normWHLow = normWH.toLowerCase();
    for (const r of pageRefs) {
      const rLow = r.toLowerCase();
      if (rLow === normLow || rLow === normWHLow) return true;
    }
    // Fuzzy: check last 2 segments
    const refSegs = norm.toLowerCase().split('.').filter(s => s && s !== 'webhome');
    const refKey = refSegs.slice(-2).join('.').replace(/[^a-z0-9]/g, '');
    for (const r of pageRefs) {
      const rSegs = r.toLowerCase().split('.').filter(s => s && s !== 'webhome');
      const rKey = rSegs.slice(-2).join('.').replace(/[^a-z0-9]/g, '');
      if (rKey === refKey) return true;
    }
    return false;
  }

  // Include resolution: request file content from extension host
  let includeRequestId = 0;
  const pendingIncludes = new Map(); // requestId -> resolve callback

  function requestIncludeContent(ref) {
    return new Promise((resolve) => {
      const id = ++includeRequestId;
      pendingIncludes.set(id, resolve);
      vscodeApi.postMessage({ command: 'resolveInclude', ref: ref, requestId: id });
      // Timeout after 5s
      setTimeout(() => { if (pendingIncludes.has(id)) { pendingIncludes.delete(id); resolve(null); } }, 5000);
    });
  }

  async function resolveIncludes(container, includedRefs, depth) {
    if (!depth) depth = 0;
    if (depth > 5) return;

    const placeholders = container.querySelectorAll('.xwiki-include[data-include-ref]');
    if (placeholders.length === 0) return;

    for (const el of placeholders) {
      const ref = el.getAttribute('data-include-ref');
      if (!ref) continue;

      // Circular include check
      if (includedRefs.has(ref)) {
        el.outerHTML = '<div class="xwiki-include-error">Circular include: ' + ref + '</div>';
        continue;
      }

      const content = await requestIncludeContent(ref);

      if (!content) {
        // Not found — keep as clickable link
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => vscodeApi.postMessage({ command: 'navigate', ref: ref }));
        continue;
      }

      // Parse included content
      const subParser = new XWikiParser();
      let html = subParser.parse(content);
      html = subParser.resolvePlaceholders(html);

      // Build wrapper with header
      const pageName = ref.split('.').filter(s => s.toLowerCase() !== 'webhome').pop() || ref;
      const wrapper = document.createElement('div');
      wrapper.className = 'xwiki-included-content';
      wrapper.setAttribute('data-source', ref);
      wrapper.innerHTML = '<div class="xwiki-included-header" title="Click to open ' + ref + '">\\ud83d\\udcc4 ' + pageName + '</div>' + html;

      // Header click navigates
      const header = wrapper.querySelector('.xwiki-included-header');
      if (header) {
        header.style.cursor = 'pointer';
        header.addEventListener('click', () => vscodeApi.postMessage({ command: 'navigate', ref: ref }));
      }

      // Wire wiki links inside included content
      wrapper.querySelectorAll('.wiki-link').forEach(link => {
        const linkRef = link.getAttribute('data-wiki-ref');
        if (!linkRef) return;
        const resolved = isRefResolvable(linkRef);
        link.classList.toggle('resolved', resolved);
        link.classList.toggle('unresolved', !resolved);
        link.addEventListener('click', (e) => { e.preventDefault(); vscodeApi.postMessage({ command: 'navigate', ref: linkRef }); });
      });

      el.replaceWith(wrapper);

      // Recursively resolve nested includes
      const newRefs = new Set(includedRefs);
      newRefs.add(ref);
      await resolveIncludes(wrapper, newRefs, depth + 1);
    }
  }

  function contentHasHeading(src) {
    // Only check the first non-empty line. Headings buried inside table
    // cells are layout, not standalone page titles, so we still inject a
    // title for those pages.
    for (const line of src.split('\\n')) {
      const s = line.trim();
      if (!s) continue;
      return /^={1,6}\\s/.test(s);
    }
    return false;
  }
  function derivePageTitle(ref) {
    if (!ref) return '';
    // Treat WebHome.LANG (e.g. WebHome.de) as WebHome (translation file)
    var cleaned = ref.replace(/\\.WebHome\\.[a-z]{2}$/i, '.WebHome').replace(/^WebHome\\.[a-z]{2}$/i, 'WebHome');
    const segs = cleaned.split('.').filter(s => s.toLowerCase() !== 'webhome');
    return segs.length ? segs[segs.length - 1] : '';
  }

  async function renderContent(source) {
    // Auto-inject title for pages that lack a heading at the top
    if (!contentHasHeading(source)) {
      // Use displayTitle from _meta.json if available, else derive from ref
      const page = vsPageIndex[currentPageRef];
      const title = (page && page.displayTitle) || derivePageTitle(currentPageRef);
      if (title) source = '= ' + title + ' =\\n\\n' + source;
    }
    const parser = new XWikiParser();
    let html = parser.parse(source);
    html = parser.resolvePlaceholders(html);
    previewEl.innerHTML = html;

    // Resolve local image attachments
    previewEl.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src');
      if (src && !src.startsWith('data:') && !src.startsWith('http')) {
        const dataUri = vsAttachments[src];
        if (dataUri) img.setAttribute('src', dataUri);
      }
    });

    // Mark wiki links as resolved/unresolved
    previewEl.querySelectorAll('.wiki-link').forEach(el => {
      const ref = el.getAttribute('data-wiki-ref');
      if (!ref) return;
      const resolved = isRefResolvable(ref);
      el.classList.toggle('resolved', resolved);
      el.classList.toggle('unresolved', !resolved);
      // Add click handler
      el.addEventListener('click', (e) => {
        e.preventDefault();
        vscodeApi.postMessage({ command: 'navigate', ref: ref });
      });
    });

    // Resolve includes inline: request content from extension host, parse, render
    await resolveIncludes(previewEl, new Set());

    // Resolve {{children/}} placeholders
    previewEl.querySelectorAll('.xwiki-children-list').forEach(el => {
      const children = getChildPages(currentPageRef);
      if (children.length === 0) {
        el.innerHTML = '<span class="children-empty">No child pages.</span>';
      } else {
        let h = '<ul>';
        for (const c of children) {
          h += '<li><a class="wiki-link resolved" data-wiki-ref="' + c.ref + '" href="#">' + c.name + '</a></li>';
        }
        el.innerHTML = h + '</ul>';
        // Wire click handlers
        el.querySelectorAll('.wiki-link').forEach(link => {
          link.addEventListener('click', (e) => { e.preventDefault(); vscodeApi.postMessage({ command: 'navigate', ref: link.getAttribute('data-wiki-ref') }); });
        });
      }
    });

    // Render mermaid diagrams (after includes are resolved, so included mermaid renders too)
    mermaidRenderCount++;
    const cur = mermaidRenderCount;
    try {
      const els = previewEl.querySelectorAll('.mermaid');
      if (els.length > 0) {
        els.forEach((el, i) => {
          el.removeAttribute('data-processed');
          el.id = 'm-' + cur + '-' + i;
        });
        await mermaid.run({ nodes: els });
      }
    } catch (e) {
      console.warn('Mermaid:', e);
    }
  }

  // Initial render
  renderContent(${escapedContent});

  // Handle messages from extension
  window.addEventListener('message', event => {
    const msg = event.data;
    switch (msg.command) {
      case 'updateContent':
        if (msg.currentPageRef !== undefined) currentPageRef = msg.currentPageRef;
        if (msg.pageIndex !== undefined) vsPageIndex = msg.pageIndex;
        if (msg.attachments !== undefined) vsAttachments = msg.attachments;
        renderContent(msg.content);
        if (msg.scrollToTop) {
          window.scrollTo(0, 0);
        }
        break;
      case 'includeResolved': {
        const cb = pendingIncludes.get(msg.requestId);
        if (cb) {
          pendingIncludes.delete(msg.requestId);
          cb(msg.content);
        }
        break;
      }
    }
  });
  </script>
</body>
</html>`;
  }
}
