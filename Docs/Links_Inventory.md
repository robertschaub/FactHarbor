# Links Inventory — FactHarbor

Live site: https://robertschaub.github.io/FactHarbor/

---

## Redirect Aliases (`_redirects.json`)

Each entry creates both an HTML redirect page (`/slug/` clean URL) and a bundle alias (`#slug` hash URL).

| Slug | Target Page Ref | URL |
|------|----------------|-----|
| `TestReports` | `Product Development.TestReports.WebHome` | `/TestReports/` or `#TestReports` |

**File:** `Docs/xwiki-pages/_redirects.json` (object format: `{ "slug": "#encodedRef" }`)
**Legacy:** `Docs/xwiki-pages/viewer-impl/_redirects.json` (array format, still supported)

---

## Internal Cross-Links (doc: references)

657 internal links across 117 xWiki files, linking to 160+ unique target pages.

### Most-Referenced Targets

| Target Page | Context |
|-------------|---------|
| `FactHarbor.Organisation.Governance.WebHome` | Governance structure |
| `FactHarbor.Organisation.How-We-Work-Together.WebHome` | Working agreements |
| `FactHarbor.Product Development.WebHome` | Product development root |
| `FactHarbor.Product Development.Specification.WebHome` | Specification root |
| `FactHarbor.Product Development.DevOps.Guidelines.Getting Started.WebHome` | Developer onboarding |
| `FactHarbor.Organisation.How-We-Work-Together.Privacy-Policy` | Privacy policy |
| `FactHarbor.Organisation.How-We-Work-Together.Terms-of-Service` | Terms of service |
| `FactHarbor.Organisation.How-We-Work-Together.Consent-Based-Decision-Making` | Decision-making process |

### Key Cross-Link Clusters

**Governance & Policy:**
- Privacy Policy, Terms of Service, Transparency Policy, Security Policy
- Consent-Based Decision Making, Continuous Improvement, Workplace Culture

**Architecture & Specification:**
- System Design, Data Model, AKEL Pipeline
- Quality Gates, Source Reliability

**DevOps & Deployment:**
- Getting Started, Deployment, Zero-Cost Hosting

---

## Cross-Project Links

| Source | Target | URL |
|--------|--------|-----|
| `Organisation/How-We-Work-Together/WebHome.xwiki` | BestWorkplace home | `https://robertschaub.github.io/BestWorkplace/#The%20Best%20Workplace.WebHome` |
| `Organisation/How-We-Work-Together/Workplace-Culture.xwiki` | BestWorkplace home | `https://robertschaub.github.io/BestWorkplace/#The%20Best%20Workplace.WebHome` |

---

## Deep-Link Mechanisms

Both mechanisms work for every redirect entry:

1. **HTML redirect pages** — `/TestReports/index.html` serves `<script>window.location.replace("../#ref")</script>`
2. **Bundle aliases** — `loadBundle()` adds `pageIndex["TestReports"] = pageIndex["Product Development.TestReports.WebHome"]`
3. **Hash navigation** — `#Product%20Development.TestReports.WebHome` resolves directly via `hashchange` listener
4. **Query parameter** — `?page=Product+Development.TestReports.WebHome` also works

---

## Deep-Link URL Patterns

All patterns for linking to a specific page:

```
https://robertschaub.github.io/FactHarbor/#Organisation.Governance.WebHome
https://robertschaub.github.io/FactHarbor/?page=Organisation.Governance.WebHome
https://robertschaub.github.io/FactHarbor/TestReports/  (via redirect alias)
```

---

## CI/CD & Analytics

| Setting | Value |
|---------|-------|
| Workflow | `.github/workflows/deploy-docs.yml` |
| Trigger | Push to `main` (watched paths) + `workflow_dispatch` |
| Analytics secret | `DOCS_ANALYTICS_URL` (injected via CI) |
| Site ID | `FH` |
| Deploy tool | `peaceiris/actions-gh-pages@v4` (`force_orphan: true`) |
| Re-trigger | `gh workflow run "Deploy Docs to GitHub Pages" --ref main` |

---

## External Dependencies (viewer)

| Resource | URL |
|----------|-----|
| Mermaid.js | `https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.9.1/mermaid.min.js` |
| Google Fonts | `https://fonts.googleapis.com/css2?family=Crimson+Pro&family=JetBrains+Mono&family=Outfit` |
| GitHub API | `https://api.github.com/repos/{repo}/contents/{path}` (for `{{github-files}}` macro) |

---

## External URLs in Content

Key external references across xWiki pages:

**Project & Repository:**
- GitHub: `https://github.com/robertschaub/FactHarbor`
- XWiki server: `https://schaubgroup.ch/bin/view/FactHarbor/`

**Licenses:**
- Creative Commons BY-SA 4.0: `http://creativecommons.org/licenses/by-sa/4.0/`
- MIT: `https://opensource.org/licenses/MIT`
- AGPL-3.0: `https://www.gnu.org/licenses/agpl-3.0.en.html`

**Hosting & Infrastructure:**
- Fly.io: `https://fly.io/docs`
- Upstash: `https://docs.upstash.com`
- Cloudflare Pages: `https://pages.cloudflare.com`

**AI/LLM Providers:**
- Anthropic: `https://console.anthropic.com/`
- OpenAI: `https://platform.openai.com/`
- Google AI Studio: `https://aistudio.google.com/`
- Mistral: `https://console.mistral.ai/`

**Development Tools:**
- Node.js, .NET, Git, VS Code, Cursor, Postman, Insomnia

**Frameworks:**
- Sociocracy 3.0: `https://sociocracy30.org/`

---

*Last updated: 2026-02-21*
