
Folder content:

FactHarbor Spec and Impl 1.Jan.26.xar : xWiki export (ZIP container; `.xar` extension) excluding organisation subtree

Local-only extraction policy:

- The `.xar` file is committed to git.
- The extracted pages folder `Docs/xwiki-extract/` is generated locally and is **not** committed (it is gitignored).

How to extract locally (Windows PowerShell):

1) Create output folder:
   - `New-Item -ItemType Directory -Force -Path "Docs\\xwiki-extract" | Out-Null`
2) Extract (ZIP container):
   - Prefer `Expand-Archive -Force -LiteralPath "Docs\\FactHarbor Spec and Impl 1.Jan.26.xar" -DestinationPath "Docs\\xwiki-extract"`
   - If that fails (PowerShell sometimes checks extension), use:
     `tar -xf "Docs\\FactHarbor Spec and Impl 1.Jan.26.xar" -C "Docs\\xwiki-extract"`

Note: The extracted pages (XML) may lag behind current code. Treat xWiki as a specification/reference and check the repo source + `.md` docs for the current behavior.
