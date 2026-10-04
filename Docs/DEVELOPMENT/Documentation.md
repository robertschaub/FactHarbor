# Writing and previewing documentation

The website uses Markdown in `Docs/site/`. Contributor and agent documentation also lives in the relevant `Docs/` directories. Keep one editable source for each edition, and link to its current home. Public build, setup and contribution instructions must work from this checkout alone. Fonts, scripts, search assets and diagrams are served with the site; external content links use their destination services.

## Local preview

From the repository root, with Python 3.12 and Git available:

```powershell
python -m pip install -r requirements-docs.txt
python -m mkdocs serve --dev-addr 127.0.0.1:8000
```

Open the address printed by MkDocs. For the same strict build used by publication:

```powershell
python scripts/docs/check_diagrams.py
python -m mkdocs build --strict
```

The output is `site/`. The [documentation workflow](../../.github/workflows/deploy-docs.yml) publishes after an authorized push to `main` that changes its configured documentation paths. CI owns `gh-pages`; do not push directly to it. For an authorized manual redeploy, use the command in [AGENTS.md](../../AGENTS.md#commands). A local build or commit does not authorize deployment.

## Content and links

- Preserve substantive meaning, obligations, qualifications, sources and useful context. Tightening may remove repetition; explain substantive changes in the review. A fixed word count is not a preservation test.
- Distinguish implemented behavior, approved decisions, proposals and historical observations. A format or navigation edit is not a license to change analysis behavior, approved inputs, quality bands or investigation authority.
- Keep headings, lists and tables readable on GitHub and the website. Use relative links to repository files and public URLs for external references. Do not add local-machine paths or dependencies on inaccessible material.
- Keep public essentials, including licensing and effective privacy terms, authoritative. Review changes to obligations separately from formatting.
- For new website pages, update `mkdocs.yml` navigation and stage the intended publication files before verifying the site. The build and agent index use tracked public inputs; untracked local notes are not publication inputs.
- Review links when renaming a page. The page-key and directory aliases in `Docs/site/assets/legacy-routes.json` are the source of truth for stable destinations. Query and root-hash page keys resolve through that explicit map; unknown destinations show the not-found page. Retain useful destinations without exposing unrelated records.
- HTML reports in `Docs/TESTREPORTS/` are copied unchanged by the build and retain their published URL paths. The video page, MP4 and captions in `Docs/prototype-fund-pitch/` are also copied to preserve the submitted application URL at `/prototype-fund-pitch/`.

## Mermaid diagrams

Shared diagrams use one canonical `.mmd` file and a corresponding committed `.svg` in `Docs/site/diagrams/`. Reference the SVG with ordinary Markdown image syntax, followed by links to the full-size image and Mermaid source. Both GitHub and the website can display the same asset. Update the source and generated image together. Save Mermaid sources with LF line endings, as required by `.gitattributes`, so the source hashes also match a fresh checkout.

To regenerate assets with the pinned renderer:

```powershell
cd tools/docs
npm ci --ignore-scripts
npx playwright install chromium
npm run render
```

On Windows with Microsoft Edge installed, `npm run render -- --edge` uses that browser and does not need the Chromium download. The renderer reads only local Mermaid source and runtime assets. Return to the repository root for the diagram check and strict site build.

Use stable node identifiers without spaces, quote labels with punctuation, and validate with the configured Mermaid version. Preserve relationships, direction, conditions, legend and uncertainty. An attractive rendering is not evidence that the architecture is accurate. Compare any substantive diagram change with current source and approved design decisions.

Inspect diagrams at desktop and narrow widths. The website provides fit-width, 100% and full-size controls for detailed figures. Keep text legible without relying on color alone. Unique small diagrams may use fenced Mermaid where both target renderers support them; shared figures should use the canonical assets.

### Mermaid ERD syntax

Use a type and attribute name, followed by an optional key marker and quoted comment. `PK`, `FK` and `UK` are valid separate key markers. Existing figures also use names such as `id_PK`; these render as attribute names, without the separate key annotation. Keep pinned source/render pairs unchanged unless the figure itself is being revised. Use underscores inside multiword identifiers, and quoted comments for explanatory text or ranges.

```mermaid
erDiagram
    RECORD ||--o{ REFERENCE : has
    RECORD {
        string id PK
        string title
    }
    REFERENCE {
        string id PK
        string record_id FK
        number score "0 to 100"
    }
```

See the [Mermaid ERD syntax reference](https://mermaid.js.org/syntax/entityRelationshipDiagram.html#attribute-keys-and-comments). Validate with the repository's pinned renderer, then inspect the SVG and its labels.

## Working records

Start with the [contribution scope](../../CONTRIBUTING.md#project-state-and-change-authority) and the task's assigned status/backlog, resolved through [root guidance](../../AGENTS.md#current-implementation). Keep intentionally public task records in `Docs/WIP/` only within their approved scope. [Captain Quality Expectations](../AGENTS/Captain_Quality_Expectations.md) and its JSON companions define the quality contract.

For an authorized public implementation task, create a concise working record only when it is needed to make the change reviewable. State the current symptom or objective, scope, governing decisions, verification and unresolved questions. Use public sources and the task's explicitly supplied references; access never grants disclosure permission.

Do not recreate superseded investigations, detailed experiment histories or speculative design collections in `Docs/WIP/` by default. Preserve operative findings and open decisions in their appropriate current contract before retiring a record, using the authorized preservation scope. A missing historic record is not evidence of a solved issue or permission to restart held work.

Completed work follows the [handoff protocol](../AGENTS/Policies/Handoff_Protocol.md), not an accumulating WIP log. Public build and contribution paths must remain self-contained.

## Maintenance

Use `/doc-guard` before substantial edits and `/docs-update` when links, status or navigation need reconciliation. Preserve open work and operative rules before retiring a document. Retirement and preservation follow the current task's authorized scope; routine maintenance does not create additional history collections or destination catalogs. Rebuild the relevant public index once as the integrator, then inspect its diff.
