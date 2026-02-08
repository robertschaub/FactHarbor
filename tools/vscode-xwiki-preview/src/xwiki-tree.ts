import * as vscode from 'vscode';

interface XWikiNode {
  name: string;
  uri?: vscode.Uri;           // URI of WebHome.xwiki (for folders) or the .xwiki file (for leaves)
  children: Map<string, XWikiNode>;
  isFolder: boolean;
}

export class XWikiTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly node: XWikiNode
  ) {
    super(label, collapsibleState);

    if (node.uri) {
      // Clicking opens the file (WebHome.xwiki for folders, the file itself for leaves)
      this.command = {
        command: 'xwiki.openPage',
        title: 'Open Page',
        arguments: [node.uri]
      };
    }

    // Icons
    if (node.isFolder) {
      this.iconPath = new vscode.ThemeIcon('folder');
      this.contextValue = 'xwikiFolder';
    } else {
      this.iconPath = new vscode.ThemeIcon('file');
      this.contextValue = 'xwikiPage';
    }
  }
}

export class XWikiTreeProvider implements vscode.TreeDataProvider<XWikiTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<XWikiTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private _root: XWikiNode = { name: '', children: new Map(), isFolder: true };
  private _buildPromise: Promise<void> | undefined;
  private _log: vscode.OutputChannel;

  constructor() {
    this._log = vscode.window.createOutputChannel('XWiki Pages');
  }

  refresh(): void {
    this._buildPromise = this._buildTree().then(() => {
      this._onDidChangeTreeData.fire();
    });
  }

  // Recursively find xwiki-pages directories in the workspace
  private async _findXWikiPagesRoots(): Promise<vscode.Uri[]> {
    const roots: vscode.Uri[] = [];
    const folders = vscode.workspace.workspaceFolders;
    if (!folders) return roots;

    for (const folder of folders) {
      await this._searchForXWikiPages(folder.uri, roots, 0);
    }
    return roots;
  }

  private async _searchForXWikiPages(dir: vscode.Uri, roots: vscode.Uri[], depth: number): Promise<void> {
    if (depth > 4) return; // Don't go too deep looking for xwiki-pages
    try {
      const entries = await vscode.workspace.fs.readDirectory(dir);
      for (const [name, type] of entries) {
        if (type === vscode.FileType.Directory) {
          if (name.toLowerCase() === 'xwiki-pages') {
            roots.push(vscode.Uri.joinPath(dir, name));
          } else if (name !== 'node_modules' && name !== '.git' && name !== 'dist') {
            await this._searchForXWikiPages(vscode.Uri.joinPath(dir, name), roots, depth + 1);
          }
        }
      }
    } catch { /* ignore permission errors */ }
  }

  // Recursively collect all .xwiki files under a directory
  private async _collectXWikiFiles(dir: vscode.Uri, files: vscode.Uri[]): Promise<void> {
    try {
      const entries = await vscode.workspace.fs.readDirectory(dir);
      for (const [name, type] of entries) {
        const childUri = vscode.Uri.joinPath(dir, name);
        if (type === vscode.FileType.Directory) {
          await this._collectXWikiFiles(childUri, files);
        } else if (type === vscode.FileType.File && name.toLowerCase().endsWith('.xwiki')) {
          files.push(childUri);
        }
      }
    } catch { /* ignore permission errors */ }
  }

  private async _buildTree() {
    this._root = { name: '', children: new Map(), isFolder: true };

    // Find the xwiki-pages directory by walking the workspace
    const xwikiPagesRoots = await this._findXWikiPagesRoots();
    this._log.appendLine(`Found ${xwikiPagesRoots.length} xwiki-pages root(s): ${xwikiPagesRoots.map(u => u.fsPath).join(', ')}`);

    if (xwikiPagesRoots.length === 0) {
      // Fallback: try findFiles
      this._log.appendLine('Falling back to findFiles...');
      const files = await vscode.workspace.findFiles('**/*.xwiki', '**/node_modules/**');
      this._log.appendLine(`findFiles returned ${files.length} file(s)`);
      for (const uri of files) {
        this._addFileToTree(uri);
      }
      return;
    }

    // Collect all .xwiki files under each root
    for (const root of xwikiPagesRoots) {
      const files: vscode.Uri[] = [];
      await this._collectXWikiFiles(root, files);
      this._log.appendLine(`Found ${files.length} .xwiki file(s) under ${root.fsPath}`);

      const rootPath = root.path; // e.g. /c:/DEV/FactHarbor/Docs/xwiki-pages

      for (const uri of files) {
        // Get path relative to xwiki-pages root
        const rel = uri.path.substring(rootPath.length + 1); // strip root + leading /
        const segments = rel.split('/');
        if (segments.length === 0) continue;

        const fileName = segments[segments.length - 1];
        const baseName = fileName.replace(/\.xwiki$/i, '');

        // Build tree path: all segments except the file name are folders
        let current = this._root;
        for (let i = 0; i < segments.length - 1; i++) {
          const seg = segments[i];
          if (!current.children.has(seg)) {
            current.children.set(seg, { name: seg, children: new Map(), isFolder: true });
          }
          current = current.children.get(seg)!;
        }

        if (baseName.toLowerCase() === 'webhome') {
          current.uri = uri;
        } else {
          current.children.set(baseName, { name: baseName, uri, children: new Map(), isFolder: false });
        }
      }
    }

    this._log.appendLine(`Tree built: ${this._root.children.size} top-level node(s)`);
  }

  // Fallback: add a file using URI path to extract xwiki-pages relative segments
  private _addFileToTree(uri: vscode.Uri) {
    const parts = uri.path.split('/');
    const xwikiIdx = parts.findIndex(s => s.toLowerCase() === 'xwiki-pages');
    if (xwikiIdx < 0) return;
    const segments = parts.slice(xwikiIdx + 1);
    if (segments.length === 0) return;

    const fileName = segments[segments.length - 1];
    const baseName = fileName.replace(/\.xwiki$/i, '');

    let current = this._root;
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      if (!current.children.has(seg)) {
        current.children.set(seg, { name: seg, children: new Map(), isFolder: true });
      }
      current = current.children.get(seg)!;
    }

    if (baseName.toLowerCase() === 'webhome') {
      current.uri = uri;
    } else {
      current.children.set(baseName, { name: baseName, uri, children: new Map(), isFolder: false });
    }
  }

  async getChildren(element?: XWikiTreeItem): Promise<XWikiTreeItem[]> {
    // Wait for any in-flight build
    if (this._buildPromise) {
      await this._buildPromise;
    }

    const node = element ? element.node : this._root;

    // Lazy-build tree on first access
    if (!element && this._root.children.size === 0) {
      await this._buildTree();
    }

    const items: XWikiTreeItem[] = [];
    // Sort: folders first, then alphabetically
    const sorted = [...node.children.entries()].sort((a, b) => {
      if (a[1].isFolder !== b[1].isFolder) return a[1].isFolder ? -1 : 1;
      return a[0].localeCompare(b[0]);
    });

    for (const [, child] of sorted) {
      const hasChildren = child.children.size > 0;
      const state = hasChildren
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None;
      items.push(new XWikiTreeItem(child.name, state, child));
    }

    return items;
  }

  getTreeItem(element: XWikiTreeItem): vscode.TreeItem {
    return element;
  }
}
