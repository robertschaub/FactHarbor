# Source-Fetch Failure — Status Re-verification, Root Cause, and Proposal

**Date:** 2026-06-01
**Role:** Senior Developer
**Type:** Investigation + proposal (no code changed; "propose" only)
**Scope:** `source_fetch_failure` chronicity, severity, root cause, and the live-work gate
**Data:** read-only, no LLM. Reproduced via three diag scripts (see §8). DB = `apps/api/factharbor.db`, 1565 SUCCEEDED jobs.

---

## 0. TL;DR — verdict on the gate

- **Claim CONFIRMED.** Source-fetch failure is **chronic** (per-job incidence 63.5–100% *every week* since 2026-03-01) **and environment-level** (HTTP 403 on subscription/bot-walled domains — e.g. in the recent science-heavy window, ScienceDirect alone was ~44% of 403 attempts, illustrating the topic→publisher-403 mechanism).
- **The recent-degradation worry is real but modest and largely topic-driven**, not a code regression: per-attempt failure crept ~41%→~46% and per-attempt 403 ~26%→~37% over March→June, with **no step-change at any commit**.
- **GATE RESULT: PASS.** Current severity **does** permit non-degenerate reports. Today's HEAD batch (`68d8b61abfac`, 14 jobs, **0 FAILED**) produced **0% degenerate** reports (every job 12–96 evidence items) and a healthy 14.3% UNVERIFIED. This **contradicts** the companion's worry that "this session's HEAD batch suggests it may not" — see §3.4 for the reconciliation.
- **A/B (424b9652-replay vs HEAD-replay) is valid for relative code comparison — but only with N replicates per arm.** A 1:1 single-A/single-B comparison cannot separate a code effect from per-run evidence-pool drift (the dominant variance source). See §5.

---

## 1. What was claimed (and by whom)

Prior handoff/companion assertions under test:
1. "`source_fetch_failure` appears in ≥64% of jobs every week since March (incl. the 424b9652 Apr-22 window) — fetch is a persistent factor."
2. "~72% HTTP 403, recently degraded" (per-attempt severity).
3. Worry: "this session's HEAD batch suggests [current severity] may not be [low enough to yield non-degenerate reports]."
4. Implication (a): a same-window A/B is still valid for relative code comparison *if* severity permits non-degenerate reports.

---

## 2. What I measured

| Script | Output |
|---|---|
| `scripts/diag/fetch-failure-drift-sizing.cjs` (existing) | all-time aggregate, cause split, outcome-by-bucket |
| `scripts/diag/fetch-failure-weekly-trend.cjs` (new) | per-week + per-commit per-JOB incidence and per-ATTEMPT severity |
| `scripts/diag/fetch-failure-domain-breakdown.cjs` (new) | which domains fail, by error type, for recent jobs |

All three are read-only (sqlite `-readonly`, no writes, no LLM).

---

## 3. Findings

### 3.1 Chronicity — CONFIRMED (per-JOB incidence)

Jobs with ≥1 `source_fetch_failure` warning, by week:

```
2026-03-01  82.4%   2026-04-06  67.3%   2026-05-24  85.7%
2026-03-09  98.1%   2026-04-13  63.5%   2026-05-25  88.2%
2026-03-16 100.0%   2026-04-20  86.2%   2026-06-01 100.0%  ← today's HEAD batch
2026-03-23  99.2%   2026-04-27  89.9%
2026-03-30  98.3%
```

All-time: **87.4%** of jobs (1368/1565). Every week clears the ≥64% bar. The two ~63–67% dips (Apr 6–13) coincide with a spike in *degenerate* jobs that failed before fetching — i.e. lower incidence there reflects jobs that never got to fetch, not healthier fetching. **Chronic confirmed.**

### 3.2 Severity — two different numbers, both correct

- **"72% HTTP 403" = cause composition.** Of all fetch-failure warnings, 72.1% are 403-classified. Confirmed.
- **Per-ATTEMPT 403 severity ≈ 26%→37%.** Of fetch *attempts* (within failing query-batches), ~26% returned 403 in Mar/Apr, ~37% recently.
- **Per-ATTEMPT total failure ≈ 41%→46%.**

> **Denominator caveat (important):** the warning is only emitted when a query-batch has ≥1 failure; fully-clean fetches emit no warning and are **not** in the denominator. So the per-attempt rates above are an **upper bound** on the true per-attempt rate. They are valid for *trend/relative* comparison (consistent bias), but must not be quoted as "46% of all fetch attempts."

### 3.3 Recent uptick is modest and topic-driven, NOT a code regression

The strong evidence that the recent uptick is *not* a code regression is twofold: (1) **chronic since March** — the failure is structural, not newly introduced; and (2) **topic mix** — late-May/June batches tested science-heavy claims ("plastic recycling", "hydrogen cars", "genetic basis of homosexuality"), which surface Elsevier/ACS/Wiley journals — all hard-403. More academic queries → more publisher 403s. Same-window A/B replays use the *same* topics on both arms, so this confound cancels.

*Corroborating (weaker):* per-commit per-attempt failure is noisy around a stable mean (38–50%) with no obvious step-change — but per-commit n is only 5–17 and the rate bounces 31–57%, too noisy to *rule out* a code effect with real power. This is why the A/B exists; even if part of the uptick were code, the recommendation (run the A/B) stands.

### 3.4 Non-degeneracy — GATE PASS, and why it contradicts the worry

Today's HEAD batch `68d8b61abfac` (**14 jobs, 0 FAILED** — no hidden failures behind the SUCCEEDED filter):

```
evidence items per job: 12, 14, 17, 18, 19, 28, 30, 36, 43, 47, 52, 55, 87, 96
verdicts: 6×MOSTLY/LEANING-TRUE, 4×MOSTLY/LEANING-FALSE, 1×FALSE, 1×MOSTLY-FALSE, 2×UNVERIFIED
degenerate (<5 evidence): 0 / 14      UNVERIFIED: 2/14 (14.3%)
```

**Reconciliation with the companion:** the companion reasoned *severity → degeneracy* (37–46% fail / "72% 403" looks fatal). The measured outcome is the opposite because **the pipeline over-provisions**: it issues many queries × many candidate sources per claim, so losing ~40% of attempts still lands 12–96 evidence items. The outcome buckets prove this directly — jobs at **50–75% fetch-fail still average 55 evidence items and only 12% UNVERIFIED**:

```
fetch-fail bucket   jobs  mean-evidence  UNVERIFIED
0%                   197       20           39.1%   ← these are early-failure/no-fetch jobs (the real degenerate set)
1-25%                 40       65           10.0%
25-50%               994       74           11.2%
50-75%               308       55           12.0%
75-100%               26       49           15.4%
```

**Severity ≠ degeneracy.** The chronic 403 rate is real but is absorbed by over-provisioning.

---

## 4. Root cause

**Primary (chronic, environment-level — not a bug):** FactHarbor fetches sources with a **single-IP, server-side `fetch()`** (`extractTextFromUrl`, `apps/web/src/lib/retrieval.ts`) using a desktop Chrome User-Agent but **no browser, no cookies, no subscription**. The query/source-selection LLM keeps surfacing the *most authoritative* sources — peer-reviewed journals and premium news — which are exactly the ones behind **publisher access controls, paywalls, and bot management (Cloudflare/Akamai)**. These return 403/401 to any non-browser, non-subscriber client regardless of headers.

Top failing domains in the **recent (since 2026-05-24) science-heavy window** — this window is topic-biased toward journals, so ScienceDirect's dominance illustrates the topic→403 mechanism, *not* an all-time constant (all-time per-domain 403 share was not computed):

```
 691  sciencedirect.com         403   ← ~44% of 403 attempts in THIS recent window (Elsevier = the science-journal aggregator)
  80  iaea.org                  403
  62  nycbar.org                403
  60  ft.com / pubs.acs.org     403
  51  nytimes.com               403
  28  reuters.com               401
  ... economist.com, science.org, wiley, oecd, chathamhouse, mckinsey, congress.gov (all 403)
```

This is **world-level**, not a defect: no header trick defeats a subscription wall. It has been present since March.

**The real harm is authority skew, not degeneracy.** Because the gated sources are systematically dropped, evidence pools skew toward whatever is openly fetchable. Reports stay populated, but the *most authoritative* sources are disproportionately missing — a quality/representativeness cost that the UNVERIFIED/degeneracy metrics do **not** capture.

**Secondary (genuine, cheap-to-fix code bugs — marginal in volume):**

1. **PDF mis-detection** — `isPdfUrl(url, contentType)` (`retrieval.ts:394`) returns `true` for any `.pdf` URL **regardless of content-type**. When a `.pdf` URL returns an HTML block/login page (200 OK, `text/html`), `extractTextFromUrl` (`retrieval.ts:743`) force-parses HTML as PDF → "Invalid PDF format. Content starts with `<!DO`". **95 occurrences** in recent jobs (PMC, Wikipedia, Georgetown Law…). Fix: trust an explicit `text/html` content-type over the URL extension.
2. **Size-cap hard-reject** — the 10 MB cap (`retrieval.ts:24`, checked at `:731` and `:658`) throws "Response too large", dropping legitimate 20–24 MB IGO PDFs entirely (OECD, swissvotes). Fix: raise/parameterize the cap, or truncate-and-parse instead of hard-reject.
3. **401 message cosmetics** — Reuters surfaces "HTTP 401 HTTP Forbidden" (double-verb). Cosmetic only.

These three together would recover on the order of ~100–200 attempts across 172 recent jobs — **real but marginal**; they do not move the chronic rate.

---

## 5. Implications for live A/B (424b9652-replay vs pinned-HEAD-replay)

- **Implication (a) is VALID** — fetch hits all commits at similar severity (Apr-22 `424b9652`: 42.3% fail / 35.4% 403 / 0% degen, 0% UNV; today: 45.9% / 37.4% / 0% degen, 14.3% UNV), so an A/B replay isolates code effects on the fetch dimension. **And the gate is met** (non-degenerate, §3.4).
- **REQUIRED replication condition (do not skip):** per-run, *which* sources 403/timeout is stochastic, and prior work established that **evidence-pool drift is the dominant per-run variance source** (`project_verdict_variance_evidence_drift`, Jaccard 0.10–0.29). Therefore a **1:1 single-A vs single-B** comparison cannot separate a code effect from fetch/evidence drift. The A/B must run **N replicates per arm** (use `scripts/diag/verdict-stability-batch.cjs` + `scripts/diag/compare-evidence-pools.cjs`) and compare the **between-arm difference against within-arm drift**. Only a between-arm signal that exceeds within-arm noise is a real code effect.
- **Implication (b) remains INVALID** — comparing fresh-today runs against *historical existing-reports* is confounded whenever severity (or topic mix) differs. Compare like-for-like fresh replays only.

---

## 6. Proposed solution (tiered; pick per cost/benefit)

**Tier 0 — cheap correctness fixes (recommended; low risk, no behavior change to verdict logic):**
- Fix PDF mis-detection: only PDF-parse when content-type is PDF, or URL says `.pdf` *and* content-type is not explicitly HTML. (`retrieval.ts:743` / `isPdfUrl`).
- Relax the size cap for document fetches (raise to ~30 MB and/or make it config-driven via `PipelineConfig`); for PDFs, prefer truncate-and-parse over hard-reject.
- Clean the 401 message string.
- *Effort:* small. *Payoff:* recovers ~100–200 attempts/172 jobs. **Marginal, not the answer to the chronic rate — label as correctness, not cure.**

**Tier 1 — design lever (recommended; strongest leverage on the chronic rate):**
- **Stop spending fetch budget on predictably-gated domains.** Maintain a known-gated-domain list (sciencedirect, acs, wiley, ft, nytimes, economist, reuters, …) and *down-rank* them in source selection / query generation so budget goes to fetchable sources.
- **Prefer open-access equivalents.** Resolve DOIs and route ScienceDirect/ACS/Wiley/PMC items through **Unpaywall / PMC full-text / DOI resolution** to the open version before fetching the paywalled URL. This recovers the *authoritative* content that 403s currently drop — directly addressing the §4 authority-skew harm.
- *Effort:* medium. *Payoff:* high **but bounded by OA availability** — only recovers gated papers that *have* an open version. Genuinely paywalled-only content stays lost under both Tier 1 and (legally) Tier 2; for that remainder the honest answer is the Tier 3 degradation net plus the acknowledged authority-skew cost. Tier 1 reduces, does not erase, the 403 rate.

**Tier 2 — infrastructure (caveated; likely NOT worth it):**
- Route gated-domain fetches through a headless browser or a third-party scraping/proxy API.
- **Caveats for a nonprofit:** publisher/news ToS prohibitions, recurring cost, and legal/ethical weight. Present as a deliberated tradeoff, **not** a clean win. Tier 1 (open-access resolution) achieves most of the benefit without the ToS/cost exposure.

**Tier 3 — graceful degradation (already working; keep):**
- The over-provisioning that yields non-degenerate reports under 40%+ fetch loss is the existing safety net. Keep `source_fetch_failure` at `info` severity and `source_fetch_degradation` aggregate as the admin signal. No change.

---

## 7. Recommended next steps

1. **Resume live A/B work — gate is met.** Run it with **N≥5 replicates per arm**, comparing between-arm vs within-arm drift (§5). Do not run single-A/single-B.
2. If quality (not just throughput) is the concern, prioritize **Tier 1 open-access resolution** over chasing 403s.
3. Tier 0 fixes are safe to schedule independently as correctness cleanup.
4. Re-run §8 scripts periodically to watch the slow 403 drift; alert only if per-attempt 403 jumps with a step-change at a specific commit (would indicate a real code regression, unlike the current smooth drift).

---

## 7b. Implementation status (2026-06-01, after "go as proposed")

**Tier 0 — SHIPPED to working tree (not committed; commit on request).**
- PDF mis-detection fix: new pure `shouldParseAsPdf(url, contentType)` (trusts explicit non-PDF content-type over `.pdf` extension) + `bufferLooksLikePdf()` magic-byte guard with **HTML fallback** when a `.pdf` URL returns non-PDF bytes — kills the "Invalid PDF format. Content starts with `<!DO`" failures. `apps/web/src/lib/retrieval.ts`.
  - *Regression guard (post-review):* an explicit `application/pdf` content-type is **trusted and parsed regardless of magic bytes** (a valid PDF may carry a BOM/leading bytes before `%PDF-`); the magic-byte fallback applies **only** to the ambiguous extension-only / octet-stream / missing-type case. `bufferLooksLikePdf` scans the first ~1 KB (not just offset 0).
- Size cap: raised default 10 MB → **30 MB** and made it config-driven — new `sourceMaxResponseBytes` in `PipelineConfig` (`config-schemas.ts`, bounded ≤ 50 MB), threaded through `fetchSources` → `extractTextFromUrl` (`research-acquisition-stage.ts`). Recovers large IGO PDFs (OECD/swissvotes).
- HTML extraction refactored into a shared `extractHtmlContent()` helper (used by both the normal and PDF-fallback paths).
- 401 cosmetic message: left as-is (it is the upstream server's `statusText`; nothing clean to fix; classification already correct via `status===401`).
- **Tests / verification:** 15 unit tests in `apps/web/test/unit/lib/retrieval.test.ts` — pure helpers (`shouldParseAsPdf`, `bufferLooksLikePdf`) **plus 3 end-to-end `extractTextFromUrl` tests** (mocked `fetch`+`dns`) covering the HTML path and both `.pdf`→HTML fallback paths. **Full touched-module set 129/129 pass**, `tsc --noEmit` clean, `npm run build` clean. *Coverage note:* the PDF-parse **success** path uses a worker thread and is exercised by live/integration runs (verified empirically by the live HEAD job at 44%/38% fetch severity), not by unit mocks.
- *Note:* a local dev-server restart is recommended so new jobs pick up the config-schema change.

**Tier 1 — DESIGN delivered, awaiting sign-off (per user choice "design-first, then build").**
- See `Docs/WIP/2026-06-01_Tier1_OpenAccess_Resolution_Design.md`. Key decisions for sign-off: reactive (on-403) injection, URL-embedded-DOI + Unpaywall first, default-OFF flag, reconciled with the prior S2/OpenAlex provider decision. **No Tier 1 code written yet.**

---

## 8. Reproduction

```bash
node scripts/diag/fetch-failure-drift-sizing.cjs       # all-time aggregate + cause split + outcome buckets
node scripts/diag/fetch-failure-weekly-trend.cjs       # per-week + per-commit incidence & per-attempt severity
node scripts/diag/fetch-failure-domain-breakdown.cjs 2026-05-24   # failing domains by error type since DATE
```

All read-only. The two new scripts were added by this investigation.

---

## 9. Live-job confirmation (true HEAD `399bc219`)

The session's queued job `2ba09707` ("Plastic recycling is pointless") ran on **true HEAD `399bc219`** (the `68d8b61`→`399bc219` delta is a diag-only verdict-stability health-check change, fetch-irrelevant).

**Result (completed):** `SUCCEEDED`, verdict **LEANING-FALSE** (truth 30%).
- Fetch this run: **71 attempted, 31 failed (44%), 27× HTTP 403 (38%)** — i.e. exactly the current "degraded" severity.
- Outcome: **83 evidence items, 44 sources kept.** Non-degenerate, decisive verdict.

This is the strongest single confirmation: on **true HEAD, at current 44%/38% fetch severity, the pipeline still produced a fully-populated, decisive report.** Gate PASS holds on HEAD, not just on the `68d8b61` batch.
