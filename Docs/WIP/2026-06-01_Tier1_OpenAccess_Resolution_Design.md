# Tier 1 Design — Open-Access Resolution for Gated Sources

**Date:** 2026-06-01
**Role:** Senior Developer (design for Lead Architect / Captain sign-off — **not yet implemented**)
**Parent:** `Docs/WIP/2026-06-01_SourceFetch_Failure_Status_RootCause_Proposal.md`
**Status:** AWAITING SIGN-OFF. No code written for Tier 1.

---

## 1. Why this exists (one paragraph)

The fetch investigation found source-fetch failure is chronic and environment-level: ~37% of attempts return HTTP 403, dominated by academic publishers and premium-news paywalls (ScienceDirect, ACS, Wiley, Science, FT, NYT, Economist, Reuters…). Reports stay non-degenerate because the pipeline over-provisions, **but** the systematically-dropped sources are the *most authoritative* ones — an **authority-skew** harm that degeneracy/UNVERIFIED metrics don't capture. Tier 1 recovers the **content** of those gated sources via their **open-access equivalents**, without changing default pipeline behavior until validated.

## 2. The coupling (why "down-rank gated domains" alone is rejected)

The original proposal listed two Tier 1 bullets. They are **coupled**: down-ranking gated domains *on its own* reduces how often we even attempt top-tier journals/news → it **worsens** authority skew. Down-ranking is only beneficial when paired with OA **substitution** (replace the blocked URL with a fetchable open version). Therefore Tier 1 is **one feature**: gated-domain awareness **+** OA resolution. Pure down-ranking is not implemented.

## 3. Reconciliation with the prior provider decision (important)

Memory records: Semantic Scholar (S2) is shipped-but-disabled; OpenAlex was judged not worth adding. **Those are search/discovery providers** — they change *which papers we find* for a query. This design is **different in kind**: it is **OA resolution** — given a source the pipeline *already selected*, find a fetchable open version of *that same work*. It does **not** add a discovery provider, does not change query generation, and does not change which claims/sources are selected. It only changes the **fetch target** for an already-chosen gated source after it is blocked. This should not be read as relitigating the S2/OpenAlex decision.

## 4. Design

### 4.1 Injection point — REACTIVE (on 401/403), not proactive

Two options considered:
- **(A) Proactive:** before fetching, if the URL is on a gated domain, resolve OA first.
- **(B) Reactive (recommended):** fetch normally; only when a **gated-domain** URL returns a deterministic block (401/403), attempt OA resolution and fetch the OA URL instead.

**Recommend B** because: (1) gated domains *sometimes* succeed (e.g. NYT occasionally serves), so don't pre-empt a possible direct hit; (2) OA-resolution cost is spent only when actually blocked; (3) minimal change to selection logic; (4) it slots into the existing `fetchSources` failure path in `research-acquisition-stage.ts`, where 401/403 are already classified and intentionally **not** retried — the natural hook point.

### 4.2 DOI acquisition (the crux — OA resolvers are DOI-keyed)

In priority order:
1. **URL-embedded DOI** — the URL is a `doi.org` link or contains a `10.\d{4,9}/…` pattern. Extract directly. *(Phase 1)*
2. **Search-result metadata** — if the search provider already returned a DOI/identifier, thread it through to the fetch candidate. *(Phase 1 if cheap)*
3. **Crossref bibliographic lookup** — query Crossref by the source **title** we already hold → top DOI match, gated by a fuzzy-title-match score to avoid wrong-paper resolution. *(Phase 2 — lower precision)*

If no DOI is derivable → **no-op** (fetch fails exactly as today). OA resolution never makes things worse.

### 4.3 OA resolvers

- **Unpaywall** (primary): `GET https://api.unpaywall.org/v2/{doi}?email=info@factharbor.ch` → `best_oa_location.url_for_pdf || .url`. Free, requires an email (we have `info@factharbor.ch`), designed for exactly this use.
- **Europe PMC** (secondary, optional, Phase 2): PMC full-text for biomedical DOIs.
- Resolved OA URL is fetched through the **existing `extractTextFromUrl`**, so SSRF validation, size cap, PDF/HTML handling, and the Tier 0 fixes all apply automatically.

### 4.4 Config (all default OFF / safe)

Add to `PipelineConfig` (Zod schema, same pattern as the fetch knobs):
- `openAccessResolutionEnabled: boolean` — **default `false`** (no behavior change until flipped).
- `openAccessResolverEmail: string` — default `info@factharbor.ch` (Unpaywall requirement).
- `gatedPublisherDomains: string[]` — default list (sciencedirect.com, pubs.acs.org, onlinelibrary.wiley.com, science.org, ft.com, nytimes.com, economist.com, reuters.com, …). OA resolution is attempted **only** when blocked on these, bounding external calls.

### 4.5 Telemetry (the live-validation signal)

- New info warning `open_access_recovered` with `{ originalUrl, oaUrl, resolver, doi }`, plus counters (gated-403 attempts vs OA recoveries). This is how we measure whether the feature is worth enabling.
- `source_fetch_failure` semantics are unchanged; OA recovery simply converts some would-be failures into successes.

### 4.6 Guards / failure modes

- OA-resolver calls have their own timeout + `try/catch`; **best-effort, never throw** into the fetch flow.
- Bounded: only on **gated-domain** 401/403, only when a DOI is derivable, capped per job.
- **SSRF**: OA URL passes through `validateUrlForFetch` (already inside `extractTextFromUrl`).
- **Rate limits**: Unpaywall is generous (~100k/day, polite-pool by email); reuse the existing search-throttle pattern if needed.
- **ToS/legal (nonprofit-relevant):** Unpaywall / Crossref / Europe PMC are legitimate OA-aggregation APIs built for programmatic access — **no ToS concern**, unlike scraping the paywalled publisher itself (the rejected Tier 2). Worth documenting the distinction for the NPO.

## 5. Tests (offline, mocked — Phase 1)

- DOI extraction from `doi.org` URLs and embedded `10.x/…` patterns (and negatives).
- Unpaywall response parsing (mocked fetch): OA found → URL; not found → null; malformed → null.
- Gated-domain gating: a non-gated 403 → **no** OA attempt.
- Reactive flow: gated-domain 403 + derivable DOI → fetches OA URL (mocked `extractTextFromUrl`).
- Default-off: `openAccessResolutionEnabled=false` → zero behavior change (regression guard).

## 6. Live validation plan (after merge; flag-on in a batch — needs cost approval)

- Small science-heavy batch (the topics that 403 most), flag **ON vs OFF**, **N≥5 replicates per arm**.
- Measure: OA recovery rate (`open_access_recovered` / gated-403 attempts), evidence-count delta, and authority composition (share of evidence from peer-reviewed/OA sources).
- Compare between-arm difference against within-arm evidence-pool drift (per the A/B discipline in the parent memo).
- Enable in production **only** if recovery is material and no regression.

## 7. Rollout

1. **Phase 1:** reactive OA resolution behind the default-off flag (URL-embedded DOI + Unpaywall), unit-tested, telemetry. *(implementation step after sign-off)*
2. **Phase 2:** Crossref title→DOI fallback + Europe PMC; live-validation batch; enable decision.
3. **Phase 3 (optional):** proactive pre-resolution for always-gated domains if reactive proves valuable.

## 8. Open questions for sign-off

1. **Injection:** reactive (on-403) vs proactive (pre-fetch). *Recommend reactive.*
2. **DOI source for Phase 1:** URL-embedded DOI only (higher precision, simpler) vs include Crossref title→DOI now. *Recommend DOI-only first; Crossref in Phase 2.*
3. **Europe PMC:** Phase 1 or Unpaywall-only first? *Recommend Unpaywall-only first.*
4. **Gated-domain list home:** code-constant default vs UCM-backed config. *Recommend config default with UCM override.*

---

**Decision requested:** approve §4 design + §8 recommendations (or amend), then I implement Phase 1 behind the default-off flag with the §5 tests.
