
Folder content:

FactHarbor_Spec_and_Impl_20.Jan.26.xar : xWiki export (ZIP container; `.xar` extension) - Specification and Implementation docs
FactHarbor_Organisation_20.Jan.26.xar  : xWiki export - Organisation subtree (separate for smaller exports)

Subfolders:
- AGENTS/       : AI agent instructions and workflow docs
- ARCHITECTURE/ : Technical architecture documentation
- DEPLOYMENT/   : Deployment guides
- DEVELOPMENT/  : Development guidelines, testing strategy, evolution
- REFERENCE/    : Technical reference (terminology, schemas, LLM mappings)
- STATUS/       : Current status, history, backlog, known issues
- USER_GUIDES/  : End-user documentation

Local-only extraction policy:

- The `.xar` files are committed to git.
- Extracted pages folders are generated locally and are **not** committed (gitignored).

How to extract locally (Windows PowerShell):

1) Create output folder:
   - `New-Item -ItemType Directory -Force -Path "Docs\\xwiki-extract" | Out-Null`
2) Extract (ZIP container):
   - Prefer `Expand-Archive -Force -LiteralPath "Docs\\FactHarbor_Spec_and_Impl_20.Jan.26.xar" -DestinationPath "Docs\\xwiki-extract"`
   - If that fails (PowerShell sometimes checks extension), use:
     `tar -xf "Docs\\FactHarbor_Spec_and_Impl_20.Jan.26.xar" -C "Docs\\xwiki-extract"`

Note: The extracted pages (XML) may lag behind current code. Treat xWiki as a specification/reference and check the repo source + `.md` docs for the current behavior.
