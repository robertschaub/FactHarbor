# Code Review — Changes Since 2026-02-21 (5-Hour Window)
**Date:** 2026-02-21
**Reviewer:** Code Reviewer (Claude Code, Sonnet 4.6)
**Scope:** Commits `84aad35` (exclusive) through `574ab66` (HEAD) — 5 commits
**Follows:** [Code_Review_2026-02-21.md](Code_Review_2026-02-21.md)

---

## Commits Reviewed (5 total)

| Commit | Message | Code Impact |
|--------|---------|-------------|
| `574ab66` | feat(calibration): LLM & search provider transparency in reports | **High** — runner.ts, report-generator.ts, types.ts, pipeline.ts, new backfill script, committed test output |
| `da84394` | docs: add Links Inventory for gh-pages redirects | Low — docs only |
| `66e1db0` | feat(build): add HTML redirect pages + align deep-link handling | Medium — build_ghpages.py |
| `86913cc` | fix(viewer): align viewer, local server, and deploy script with BestWorkplace | Medium — xwiki-viewer.html, PowerShell scripts |
| `9ef9a78` | docs(agents): CI owns gh-pages — agents must not push manually | Low — AGENTS.md, CLAUDE.md, workflow |

---

## Finding Summary

| Severity | Count |
|----------|-------|
| **CRITICAL** | 1 |
| **HIGH** | 3 |
| **MEDIUM** | 4 |
| **LOW** | 3 |
| **TOTAL** | 11 |

---

## Findings

---

### **[CRITICAL] R2-C1 — 7.8MB of calibration test output committed to the repository**
**File:** [.gitignore](.gitignore), `apps/web/test/output/bias/` (10 files)
**Commit:** `574ab66`

**Description:**
The `.gitignore` entry `apps/web/test/output/` was removed (line 83 deleted), and immediately 10 calibration run artifacts were committed:

| File | Size |
|------|------|
| `full-2026-02-20T21-32-24-288Z.json` | 58,389 lines |
| `full-2026-02-21T13-49-27-929Z.json` | 32,535 lines |
| `run-2026-02-20T14-44-11-904Z.json` | 15,707 lines |
| `run-2026-02-21T11-14-21-464Z.json` | 19,937 lines |
| `full-2026-02-20T15-00-21-961Z.json` | 486 lines |
| + 5 matching `.html` files | — |

**Total: ~7.8MB / ~130K lines added to git history permanently.**

These files contain full pipeline outputs from real LLM API runs — claim text, LLM reasoning chains, evidence items, source URLs, and analysis metadata. Committing them:

1. **Bloats git history permanently** — these blobs cannot be cheaply removed (requires `git filter-repo` and force-push).
2. **Creates an unbounded growth pattern** — every calibration run will now add new files. At ~32K lines/run, ten runs = 320K lines of committed JSON.
3. **May capture sensitive data** — full `resultJson` from pipeline runs can include detailed LLM traces, source content excerpts, and potentially PII from web-scraped sources.
4. **Violates CI/CD hygiene** — test artifacts are ephemeral outputs, not source code. They belong in external artifact storage (S3, GitHub Releases) or the `Docs/TESTREPORTS/` pattern used for HTML-only reports.

The `backfill-bias-reports.ts` script mutates these JSON files in-place (adding `resolvedLLM`/`resolvedSearch`) and re-commits them, establishing a workflow that assumes JSON blobs live in git.

**Recommendation:**
1. **Immediately** restore `.gitignore` entry: `apps/web/test/output/`
2. Use `git rm --cached apps/web/test/output/bias/*.json apps/web/test/output/bias/*.html` to untrack the files without deleting them locally.
3. If calibration results must be version-controlled, commit only the **HTML report** (not the raw JSON) to `Docs/TESTREPORTS/` (following the existing test report pattern), and generate the manifest via the existing `update-reports-manifest.yml` workflow.
4. Store raw JSON outputs locally or in an external artifact store.

---

### **[HIGH] R2-H1 — resolveModelName() duplicated between runner.ts and backfill-bias-reports.ts**
**File:** [calibration/runner.ts](apps/web/src/lib/calibration/runner.ts) ~line 218, [scripts/backfill-bias-reports.ts](apps/web/scripts/backfill-bias-reports.ts) ~line 23

**Description:**
`resolveModelName()` is defined with identical logic in both files — 20 lines of provider→model-name mapping (`anthropic`, `openai`, `google`, `mistral` branches). This is a direct DRY violation for non-trivial business logic. If the model name mappings change (e.g., `gpt-4.1` → `gpt-5`), both files must be updated in sync. With no shared tests for this function, drift is silent.

**Recommendation:**
Extract to a shared utility, e.g., `apps/web/src/lib/calibration/model-resolver.ts`, and import it in both runner.ts and the backfill script. This function should also be reconciled with `getModelForTask()` in the main pipeline (see R2-H2).

---

### **[HIGH] R2-H2 — Hardcoded model names in resolveLLMConfig() will mismatch UCM admin overrides**
**File:** [calibration/runner.ts](apps/web/src/lib/calibration/runner.ts) ~line 198

**Description:**
`resolveLLMConfig()` reads `config.modelUnderstand`, `config.modelExtractEvidence`, `config.modelVerdict` from the UCM pipeline config — correct. But `resolveModelName()` uses hardcoded defaults when those UCM fields are not set:

```typescript
const modelUnderstand = config.modelUnderstand ?? "claude-haiku-4-5-20251001";
const modelVerdict    = config.modelVerdict    ?? "claude-sonnet-4-5-20250929";
```

And within `resolveModelName()`:
```typescript
if (p === "openai") return isPremium ? "gpt-4.1" : "gpt-4.1-mini";
if (p === "google" || p === "gemini") return isPremium ? "gemini-2.5-pro" : "gemini-2.5-flash";
if (p === "mistral") return isPremium ? "mistral-large-latest" : "mistral-small-latest";
```

The pipeline's actual `getModelForTask()` function reads model names from UCM config and applies its own resolution logic. The calibration's `resolveLLMConfig()` re-implements this independently with hardcoded names. If:
- An admin overrides `modelVerdict` to a custom model name via UCM, the report will still show the hardcoded default.
- OpenAI's models change names, the report shows stale data.
- The pipeline's `getModelForTask()` logic is updated, the calibration's resolver diverges silently.

The report is supposed to show what model was *actually used*, but this implementation shows what model *would have been used* given hardcoded assumptions.

**Recommendation:**
Call `getModelForTask()` directly during config snapshot (as the pipeline already does in `claimboundary-pipeline.ts` — the `284-286` change in `574ab66` shows this for verdict/understand/extract). The runner can capture the resolved models immediately after calling the analysis, from the `resultJson.meta.modelsUsed` field (which now populates `modelsUsed.understand`, `.extractEvidence`, `.verdict`). This avoids re-implementing the resolution logic entirely.

---

### **[HIGH] R2-H3 — .gitignore removal is too broad: all test/output/ subdirectories now tracked**
**File:** [.gitignore](.gitignore)

**Description:**
The removed entry was `apps/web/test/output/` (entire directory). The intent appears to be tracking only calibration bias outputs (`test/output/bias/`). But the removal now means any future test output under `test/output/` (e.g., `test/output/neutrality/`, `test/output/integration/`, `test/output/llm/`) would be committed by default. Future developers adding a test that writes to `test/output/` will unknowingly commit large artifacts.

**Recommendation:**
If tracking calibration outputs is intentional (despite R2-C1 above), scope the ignore rule:
```gitignore
apps/web/test/output/
!apps/web/test/output/bias/*.html
```
to track only the HTML reports but not JSON. Or better: keep `apps/web/test/output/` ignored entirely and adopt the `Docs/TESTREPORTS/` pattern.

---

### **[MEDIUM] R2-M1 — Path traversal risk in generate_redirects() from _redirects.json slugs**
**File:** [Docs/xwiki-pages/scripts/build_ghpages.py](Docs/xwiki-pages/scripts/build_ghpages.py) ~line 361

**Description:**
```python
redirect_dir = output_dir / slug
redirect_dir.mkdir(parents=True, exist_ok=True)
```

Python's `pathlib.Path` division does NOT sanitize `../` traversal. If `_redirects.json` contains a slug like `"../../evil"`, `output_dir / "../../evil"` resolves to a directory outside the output, and `mkdir(parents=True)` creates it. The script would then write an `index.html` file outside the intended gh-pages output directory.

While `_redirects.json` is a controlled repository file (low external attack surface), a compromised commit or supply-chain attack could exploit this. It's also a latent correctness bug: a typo like `"../TestReports"` in a slug would silently create a file in the wrong place.

**Recommendation:**
Add a path guard before creating the directory:
```python
redirect_dir = (output_dir / slug).resolve()
if not str(redirect_dir).startswith(str(output_dir.resolve())):
    print(f'  Warning: skipping unsafe slug "{slug}" (path traversal)', file=sys.stderr)
    continue
```

---

### **[MEDIUM] R2-M2 — renderSideSearchProviders() uses String() cast — will show "[object Object]" for non-string values**
**File:** [calibration/report-generator.ts](apps/web/src/lib/calibration/report-generator.ts) ~line 533

**Description:**
```typescript
function renderSideSearchProviders(side: SideResult): string {
  const meta = side.fullResultJson?.meta as Record<string, unknown> | undefined;
  const providers = meta?.searchProviders;
  if (!providers) return "";
  const provStr = typeof providers === "string" ? providers : String(providers);
  return `...${esc(provStr)}...`;
}
```

`meta.searchProviders` in `claimboundary-pipeline.ts` (line 296-301) is set from `searchProviders || undefined` which can be a string like `"brave,google"`. However, if the pipeline shape changes and `searchProviders` becomes an array, `String(["brave","google"])` returns `"brave,google"` (coincidentally correct), but `String({brave: 1})` returns `"[object Object]"`. The fallback is fragile and will render garbage in the HTML.

**Recommendation:**
Handle known types explicitly:
```typescript
const provStr = Array.isArray(providers)
  ? providers.join(", ")
  : typeof providers === "string"
    ? providers
    : JSON.stringify(providers);
```

---

### **[MEDIUM] R2-M3 — displayTitle referenced in xwiki-viewer.html but not generated by build_ghpages.py**
**File:** [Docs/xwiki-pages/viewer-impl/xwiki-viewer.html](Docs/xwiki-pages/viewer-impl/xwiki-viewer.html) ~line 1051

**Description:**
Three locations in xwiki-viewer.html now check `page.displayTitle`:
1. `derivePageTitle()` — `if(page && page.displayTitle) return page.displayTitle`
2. `renderPreview()` — `const title = (page && page.displayTitle) || derivePageTitle(currentPageRef)`
3. `updateBreadcrumb()` — `const label = (page.displayTitle) ? page.displayTitle : segs[i]`

However, `build_ghpages.py` does not generate a `displayTitle` field in the page index. The field will always be `undefined` at runtime, making all three checks effectively dead code. If `displayTitle` was intended to be populated from xWiki page metadata (e.g., `_meta.json`), that wiring is missing.

**Recommendation:**
Either: (a) implement `displayTitle` generation in `build_ghpages.py` by reading from `_meta.json` files; or (b) remove the three `displayTitle` checks from the viewer until the feature is implemented, to avoid confusion.

---

### **[MEDIUM] R2-M4 — configuredProviders empty for backfilled reports (resolveSearchFromBlob fallback)**
**File:** [scripts/backfill-bias-reports.ts](apps/web/scripts/backfill-bias-reports.ts) ~line 79

**Description:**
`resolveSearchFromBlob()` in the backfill script cannot determine `configuredProviders` from the stored config blob alone (env vars are not captured in the snapshot). It falls back to extracting from `meta.searchProviders` in pair results:
```typescript
const sp = meta.searchProviders;
if (typeof sp === "string" && sp) {
  sp.split(",").map(...).forEach(s => providers.add(s));
}
```

But `meta` is accessed from `side.fullResultJson?.meta`. If `fullResultJson` is a large object stored in the JSON, this should work. However, `SideResult.fullResultJson` was added in the calibration types (line ~280 in types.ts) — check whether older JSON files captured `fullResultJson` at all. If not, `providers` will remain empty and the report will show "Search: (none)" misleadingly.

**Recommendation:**
Add a note to the backfill output when `configuredProviders` remains empty, and display `"providers unknown (old report)"` in the HTML rather than an empty providers section.

---

### **[LOW] R2-L1 — as any cast in resolveSearchConfig()**
**File:** [calibration/runner.ts](apps/web/src/lib/calibration/runner.ts) ~line 242

**Description:**
```typescript
const configuredProviders = getActiveSearchProviders(searchConfig as any);
```

`searchConfig` is already typed as `{ provider?: string }` but cast to `any` to satisfy `getActiveSearchProviders()`'s expected signature. This drops type safety. The function likely expects a fuller `SearchConfig` shape.

**Recommendation:**
Import `SearchConfig` from config-schemas and cast to it rather than `any`: `getActiveSearchProviders(searchResult.config as SearchConfig)`. This validates the cast at the type level.

---

### **[LOW] R2-L2 — HTML redirect noscript meta uses unescaped URL (low risk — URL-encoded)**
**File:** [Docs/xwiki-pages/scripts/build_ghpages.py](Docs/xwiki-pages/scripts/build_ghpages.py) ~line 376

**Description:**
The generated `index.html` includes:
```python
<noscript><meta http-equiv="refresh" content="0; URL={full_target}"></noscript>
```

`full_target` is `../../#{URL-encoded-ref}`. URL encoding prevents `"` injection (it becomes `%22`), so actual XSS risk is negligible. However, the value is not HTML-escaped as a defensive practice. Best practice for HTML `content` attributes is to HTML-escape the URL.

**Recommendation:**
Apply `html.escape()` to `full_target` in the `content` attribute (and optionally the `<a href>` attribute), even though URL encoding already prevents injection:
```python
import html
safe_target = html.escape(full_target, quote=True)
```

---

### **[LOW] R2-L3 — modelsUsed field uses camelCase key "extractEvidence" inconsistently**
**File:** [claimboundary-pipeline.ts](apps/web/src/lib/analyzer/claimboundary-pipeline.ts) ~line 299, [calibration/types.ts](apps/web/src/lib/calibration/types.ts) ~line 291

**Description:**
The pipeline now emits `resultJson.meta.modelsUsed` with keys `{ understand, extractEvidence, verdict }`. The key `extractEvidence` uses camelCase (matching the UCM field `modelExtractEvidence`), which is consistent. However, the calibration's `SideResult.modelsUsed` type is `Record<string, string>` — the key names are not typed, so any misalignment between producer and consumer is invisible to TypeScript.

This is currently benign, but adds fragility.

**Recommendation:**
Type `SideResult.modelsUsed` explicitly: `modelsUsed: { understand: string; extractEvidence: string; verdict: string; [role: string]: string }` to surface key mismatches at compile time.

---

## Positive Notes

- `decodeURIComponent(location.hash.slice(1))` fix in `build_ghpages.py` and `xwiki-viewer.html` is a correct bug fix — URLs with encoded characters (spaces, special chars) would fail to navigate without this decode.
- The `workflow_dispatch` trigger added to `deploy-docs.yml` is a good operational improvement — allows manual re-deployment without a dummy commit.
- `AGENTS.md` / `CLAUDE.md` additions about CI owning gh-pages are clear and important guardrails.
- `Open-XWikiViewer.ps1` wikiRoot rename from `"The Best Workplace"` to `"FactHarbor"` is correct alignment.
- The LLM/search configuration panel in calibration reports is a genuinely useful addition for reproducibility — right goal, but the implementation has the model resolution issues noted above.

---

## Prioritized Fix Plan

### Immediate

| ID | Issue | Effort |
|----|-------|--------|
| R2-C1 | Remove committed test JSON/HTML blobs (7.8MB) and restore .gitignore | S |
| R2-H3 | Scope .gitignore to only allow HTML (not JSON) or keep fully ignored | XS |

### High Priority

| ID | Issue | Effort |
|----|-------|--------|
| R2-H1 | Deduplicate resolveModelName() — extract to shared module | S |
| R2-H2 | Use actual pipeline resultJson.meta.modelsUsed instead of re-implementing resolution | S |

### Medium Priority

| ID | Issue | Effort |
|----|-------|--------|
| R2-M1 | Add path traversal guard in generate_redirects() | XS |
| R2-M2 | Fix renderSideSearchProviders() type handling | XS |
| R2-M3 | Either implement displayTitle in build_ghpages.py or remove checks | S |
| R2-M4 | Add fallback message when configuredProviders is empty in backfill | XS |

### Low Priority

| ID | Issue | Effort |
|----|-------|--------|
| R2-L1 | Replace as any with SearchConfig cast | XS |
| R2-L2 | HTML-escape full_target in noscript meta | XS |
| R2-L3 | Type modelsUsed keys explicitly | XS |

---

## Build & Test Status

> Calibration tests were running at review start — not interrupted.
> No code changes made during this review.
> Build not re-run (review only).
