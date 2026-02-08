import * as vscode from 'vscode';
import * as path from 'path';
import { XWikiPreviewPanel } from './preview-panel';
import { XWikiTreeProvider } from './xwiki-tree';

// Page index: normalized ref → vscode.Uri
let pageIndex: Map<string, { uri: vscode.Uri; ref: string; name: string; relPath: string; segments: string[] }> = new Map();

export function activate(context: vscode.ExtensionContext) {
  // Build page index on activation
  buildPageIndex();

  // Register XWiki Pages tree view in explorer sidebar
  const treeProvider = new XWikiTreeProvider();
  vscode.window.createTreeView('xwikiPages', { treeDataProvider: treeProvider });

  // Rebuild index when xwiki files are created/deleted
  const watcher = vscode.workspace.createFileSystemWatcher('**/*.xwiki');
  watcher.onDidCreate(() => { buildPageIndex(); treeProvider.refresh(); });
  watcher.onDidDelete(() => { buildPageIndex(); treeProvider.refresh(); });
  context.subscriptions.push(watcher);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('xwiki.openPage', async (uri: vscode.Uri) => {
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    }),
    vscode.commands.registerCommand('xwiki.refreshTree', () => {
      treeProvider.refresh();
    }),
    vscode.commands.registerCommand('xwiki.openPreview', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === 'xwiki') {
        XWikiPreviewPanel.createOrShow(context, editor.document);
      }
    }),
    vscode.commands.registerCommand('xwiki.togglePreview', () => {
      if (XWikiPreviewPanel.currentPanel) {
        XWikiPreviewPanel.currentPanel.dispose();
      } else {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === 'xwiki') {
          XWikiPreviewPanel.createOrShow(context, editor.document);
        }
      }
    })
  );

  // Auto-open preview when an xwiki file becomes active
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (!editor) return;
      const config = vscode.workspace.getConfiguration('xwiki.preview');
      if (!config.get<boolean>('autoOpen', true)) return;
      if (editor.document.languageId === 'xwiki') {
        XWikiPreviewPanel.createOrShow(context, editor.document);
      }
    })
  );

  // Live-update preview on document change (debounced)
  let updateTimeout: ReturnType<typeof setTimeout> | undefined;
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.languageId !== 'xwiki') return;
      if (!XWikiPreviewPanel.currentPanel) return;
      const delay = vscode.workspace.getConfiguration('xwiki.preview').get<number>('updateDelay', 300);
      if (updateTimeout) clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        XWikiPreviewPanel.currentPanel?.update(e.document);
      }, delay);
    })
  );

  // Handle messages from the webview (wiki link navigation, include resolution)
  XWikiPreviewPanel.onNavigate = async (ref: string) => {
    const page = resolveReference(ref);
    if (page) {
      const doc = await vscode.workspace.openTextDocument(page.uri);
      await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
      // Preview will auto-update via onDidChangeActiveTextEditor
    } else {
      vscode.window.showWarningMessage(`XWiki page not found: ${ref}`);
    }
  };

  XWikiPreviewPanel.onResolveInclude = async (ref: string): Promise<string | null> => {
    const page = resolveReference(ref);
    if (!page) return null;
    try {
      const content = await vscode.workspace.fs.readFile(page.uri);
      return Buffer.from(content).toString('utf8');
    } catch {
      return null;
    }
  };

  // If an xwiki file is already open, show preview
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor && activeEditor.document.languageId === 'xwiki') {
    const config = vscode.workspace.getConfiguration('xwiki.preview');
    if (config.get<boolean>('autoOpen', true)) {
      XWikiPreviewPanel.createOrShow(context, activeEditor.document);
    }
  }
}

export function deactivate() {
  XWikiPreviewPanel.currentPanel?.dispose();
}

// ── Page Index ──

async function buildPageIndex() {
  pageIndex = new Map();
  const files = await vscode.workspace.findFiles('**/*.xwiki', '**/node_modules/**');
  for (const uri of files) {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    const relPath = workspaceFolder
      ? path.relative(workspaceFolder.uri.fsPath, uri.fsPath)
      : path.basename(uri.fsPath);

    // Build xwiki-style reference from path
    // e.g. Docs/xwiki-pages/FactHarbor_Org/.../WebHome.xwiki → FactHarbor_Org...WebHome
    const segments = relPath
      .replace(/\\/g, '/')
      .replace(/\.xwiki$/i, '')
      .split('/');

    // Remove common prefix directories (Docs/xwiki-pages/)
    const xwikiIdx = segments.findIndex(s => s.toLowerCase() === 'xwiki-pages');
    const refSegments = xwikiIdx >= 0 ? segments.slice(xwikiIdx + 1) : segments;

    const ref = refSegments.join('.');
    const name = refSegments[refSegments.length - 1];

    pageIndex.set(ref, { uri, ref, name, relPath, segments: refSegments });
  }

  // Update the preview panel's page index
  XWikiPreviewPanel.pageIndex = pageIndex;
}

// ── Reference Resolution ──

function normalizeRef(ref: string): string {
  let r = ref.replace(/^doc:/i, '').replace(/^xwiki:/i, '').trim();
  r = r.replace(/\//g, '.').replace(/\\+/g, '.');
  r = r.replace(/\.WebHome$/i, '');
  return r;
}

export function resolveReference(ref: string): { uri: vscode.Uri; ref: string; name: string; relPath: string; segments: string[] } | null {
  const norm = normalizeRef(ref);
  const normWithWebHome = norm + '.WebHome';

  // 1. Exact match
  if (pageIndex.has(norm)) return pageIndex.get(norm)!;
  if (pageIndex.has(normWithWebHome)) return pageIndex.get(normWithWebHome)!;

  // 2. Case-insensitive match
  const normLow = norm.toLowerCase();
  const normWebHomeLow = normWithWebHome.toLowerCase();
  for (const [k, v] of pageIndex) {
    const kLow = k.toLowerCase();
    if (kLow === normLow || kLow === normWebHomeLow) return v;
  }

  // 3. Fuzzy matching — find best match by key segments
  const refSegments = norm.toLowerCase().split('.').filter(s => s && s !== 'webhome');
  const refKey = refSegments.slice(-2).join('.');
  const refKeyNorm = refKey.replace(/[^a-z0-9]/g, '');

  let bestMatch: typeof pageIndex extends Map<string, infer V> ? V : never | null = null;
  let bestScore = 0;

  for (const [k, v] of pageIndex) {
    const kSegments = k.toLowerCase().split('.').filter(s => s && s !== 'webhome');
    const kKey = kSegments.slice(-2).join('.');
    const kKeyNorm = kKey.replace(/[^a-z0-9]/g, '');

    let score = 0;
    if (kKeyNorm === refKeyNorm) score += 100;
    else if (kKeyNorm.includes(refKeyNorm) || refKeyNorm.includes(kKeyNorm)) score += 50;

    for (const refSeg of refSegments) {
      const refSegNorm = refSeg.replace(/[^a-z0-9]/g, '');
      for (const kSeg of kSegments) {
        const kSegNorm = kSeg.replace(/[^a-z0-9]/g, '');
        if (kSegNorm === refSegNorm) score += 20;
        else if (kSegNorm.includes(refSegNorm) || refSegNorm.includes(kSegNorm)) score += 10;
      }
    }

    if (k.toLowerCase().endsWith('.webhome')) score += 5;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = v;
    }
  }

  if (bestScore >= 20) return bestMatch;
  return null;
}
