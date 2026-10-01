# Documentation links

The [documentation website](https://robertschaub.github.io/FactHarbor/) is built from `Docs/site/` using `mkdocs.yml`. Ordinary Markdown links connect current pages; shared images and Mermaid sources live under `Docs/site/diagrams/`.

## Stable destinations

`Docs/site/assets/legacy-routes.json` contains the explicit page-key and directory aliases. Query and root-hash page keys resolve only through this map. Unknown destinations show the not-found page.

| Address | Destination |
|---|---|
| `/TestReports/` | `test-reports.html` |
| `/LegalFramework/` | `legal-framework.html` |
| `/Product Development.Presentations.Meeting UZH.WebHome/` | `academic-cooperation.html` |
| `/FactCheckerCooperation/` | `fact-checker-cooperation.html` |
| `/Product Development.Presentations.Fact-Checker Cooperation.WebHome/` | `fact-checker-cooperation.html` |
| `/Funding/` | `funding.html` |
| `/LinkedIn/` | `linkedin.html` |
| `/LinkedInDE/` | `linkedin-de.html` |

The report HTML files in `Docs/TESTREPORTS/` and the pitch assets in `Docs/prototype-fund-pitch/` retain their published URL paths. Their source files are copied unchanged by the build.

## Publication

`.github/workflows/deploy-docs.yml` publishes the strict MkDocs build after an authorized push to `main`. CI owns `gh-pages`; do not push directly to it. An authorized redeploy can use `gh workflow run "Deploy Docs to GitHub Pages" --ref main`.

See [authoring and preview guidance](DEVELOPMENT/Documentation.md) for local checks. Documentation fonts, scripts, search assets and rendered diagrams are served with the site; content links can lead to external services under their own terms.
