# Lead Developer Review — Source Reliability Service Proposal
**Target doc**: `Docs/ARCHITECTURE/Source_Reliability_Service_Proposal.md`  
**Review date**: 2026-01-21  
**Reviewer**: Lead Developer (implementation + ops feasibility)

---

## Executive recommendation

**Proceed with Phases 1–3, with revisions.** The proposal is implementable in this repo, but it needs clearer integration boundaries (to avoid sync→async ripple), explicit auth + rate limiting, and a firm “score scale contract” to prevent silent calculation bugs.

---

## Feasibility assessment (repo-aligned)

### What’s already in place that makes this feasible

- **SQLite + EF Core in `apps/api`**: adding new entities/tables and a controller is straightforward.
- **Pattern for API delegating work to Next.js runner**: `apps/api` already triggers `apps/web` internal routes via `RunnerClient`. A similar pattern can be used for “evaluate source” without introducing a new deployment unit.
- **Source reliability is already integrated into weighting**: the analyzer consumes `trackRecordScore` and has explicit “unknown = null” behavior.

### What will be painful if implemented as currently written

- The proposal’s example changes `getTrackRecordScore(url)` to **async** and uses `fetch()` directly from analyzer code.
  - In the current codebase, `getTrackRecordScore` is **sync** and used on the “fetch source” path.
  - There is also **duplicate** track-record logic inside `apps/web/src/lib/analyzer/orchestrated.ts`.
  - Making this async would force broad refactors in the orchestrated pipeline and any code expecting sync semantics.

---

## Key design issues to resolve in the proposal (must-fix)

### 1) Avoid sync→async ripple: integrate via batch prefetch, not `async getTrackRecordScore()`

**Recommendation**: keep the “lookup from in-memory map” synchronous and introduce an explicit **prefetch/enrichment step**:

- Extract domains from selected sources.
- Call API **batch lookup** once.
- Populate `trackRecordScore` in `FetchedSource` objects.
- Proceed with analysis using a sync lookup map for any later steps.

This keeps analyzer hot paths fast, reduces coupling, and avoids refactoring the orchestrated pipeline’s synchronous flow.

### 2) Define a single score scale contract (0–1 vs 0–100)

The proposal uses 0.0–1.0. Existing code uses 0–1 in weighting, but there are signs of mixed assumptions elsewhere. The service must guarantee:

- **Canonical scale**: recommend **0.0–1.0 everywhere**.
- **Normalization**: any imported bootstrap data must be normalized at ingest.
- **Storage type**: `REAL`/`decimal` is fine; define rounding rules (e.g., 2–3 decimals) if you want stable diffs.

### 3) Auth + abuse prevention must be explicit

Without clear boundaries, a public cache-miss could become an LLM call → cost runaway. The proposal should explicitly state:

- **Public endpoints are lookup-only** (never trigger evaluation).
- **Evaluation is internal/admin-only**:
  - protected by `X-Admin-Key` (API already has this pattern), and/or
  - protected by an internal runner key (web already has `FH_INTERNAL_RUNNER_KEY`).
- **Rate limiting** for evaluation triggers (and per-domain cool-down).

### 4) Reliability scores can change pipeline behavior (risk: suppressing important facts)

The orchestrated pipeline includes logic that can filter certain “high-impact outcome” facts when a source has low reliability. If LLM-based reliability is wrong, it can incorrectly suppress important facts.

**Recommendation**:

- Treat LLM-derived reliability as **non-authoritative unless high confidence**.
- Prefer returning `score: null` unless confidence passes a high bar (e.g., 0.8+), while still caching audit info for review.
- Keep “unknown reliability” behavior consistent: unknown should not penalize evidence by default.

---

## Architecture comments (what to keep / what to change)

### “Integrated into existing API” vs microservice

**Keep it integrated (same ASP.NET app)** for now. This repo is currently a POC-ish scaffold and already runs API + Next.js together. A microservice split adds operational overhead without clear scaling value until evaluation volume is proven.

### Next.js “evaluate-source” endpoint vs doing LLM calls in API

The proposal routes LLM evaluation through Next.js. Given the codebase already centralizes LLM orchestration in `apps/web`, this is a pragmatic choice, but it creates a dependency chain:

- `apps/web` (analysis) → `apps/api` (reliability lookup)
- `apps/api` (reliability service) → `apps/web` (LLM eval)

This is acceptable if:

- evaluation calls are **internal-only**,
- timeouts/retries are clearly defined, and
- there is no scenario where a single request loops across both sides repeatedly.

---

## Data model review

### Suggested additions/adjustments

- **Domain normalization**:
  - store `Domain` lowercased
  - strip leading `www.` on ingest
  - document subdomain policy (exact vs suffix match) and keep it consistent with current analyzer behavior.
- **Reasoning length**: 500 chars is OK for UI, but add a separate field for “full reasoning” if audit needs it, or explicitly state truncation rules.
- **Audit log size controls**:
  - truncate `LlmPrompt` / `LlmResponse` to a max length
  - optionally omit prompt storage in prod and store only “prompt version + hash” if sensitive.

### SQLite schema ownership

Proposal suggests a separate `source-reliability.db`. That is fine and reduces coupling to `factharbor.db`. It also simplifies backup/rotation if audit grows.

---

## API design review

### Keep

- **Single lookup**: `GET /v1/source-reliability?domain=...`
- **Batch lookup**: needed for analysis runs
- **Override + lock**: essential for correctness and operations
- **Stats**: useful for monitoring + review queues

### Change

- **Batch should be POST** with JSON body to avoid URL/query limits and escaping edge cases.
- **Clarify cache-miss semantics**:
  - lookup-only endpoints return `score: null` and a reason enum
  - evaluation endpoints return an evaluation record + whether it was persisted/locked.

---

## LLM evaluation design review

### Prompt + schema

Structured output via schema validation is the right approach.

### Remove hardcoded “real outlet” examples

Keep examples generic (placeholder domains) to avoid “teaching to specific cases” and to better align with repository guidance on topic neutrality.

### Confidence gating

The proposal’s `knownSource` + confidence threshold gating is good. I recommend tightening it:

- Use score only if \(confidence \ge 0.8\).
- If \(0.5 \le confidence < 0.8\): store audit entry, but return `score: null` (unknown) to the analyzer by default.
- If \(confidence < 0.5\): store audit entry, mark as “review-needed”.

This reduces risk of spurious reliability impacting evidence weighting and fact filtering.

---

## Cost/latency/availability

- **Latency**: evaluation must not occur on the critical path of end-user requests. Ensure analysis runner can continue (or degrade gracefully) if reliability is missing.
- **Cost control**:
  - strict auth
  - per-domain cool-down
  - max evaluations per time window
  - long TTLs for high-confidence results.
- **Availability**:
  - service unreachable → treat as `null` reliability (no penalty)
  - avoid retries that amplify traffic across API↔web boundaries.

---

## Proposed revised implementation plan (MVP-first)

### Phase 1 (MVP): lookup + bootstrap

- Implement DB + lookup endpoints + bootstrap import.
- Ensure score scale is 0–1 end-to-end.
- Ensure analyzer can optionally prefetch scores in batch (no changes to sync `getTrackRecordScore()` required yet if you only use the bundle initially).

### Phase 2: evaluation (internal/admin-only)

- Add evaluation endpoint (internal) + audit logging.
- Enforce auth + rate limits.
- Implement strict confidence gating (“return score only when high confidence”).

### Phase 3: pipeline integration (batch prefetch)

- Add batch prefetch step early in analysis run to fill `trackRecordScore`.
- Remove duplicated track-record logic between `orchestrated.ts` and `source-reliability.ts` (or clearly designate one as canonical).

### Phase 4: admin UX (optional)

- Review queue: low-confidence, expired, high-impact domains.
- Override/lock flows with full provenance/audit visibility.

---

## Acceptance criteria (for this feature to be “done”)

- **Correctness**:
  - Scores are consistently treated as 0–1 everywhere.
  - Unknown sources do not degrade analysis unless explicitly configured.
  - LLM low-confidence results do not influence evidence weighting by default.
- **Operational safety**:
  - Evaluation is not publicly triggerable.
  - Rate limiting + cool-down prevents cost runaway.
  - Audit log has size controls.
- **Failure behavior**:
  - API down → analysis still runs with `null` reliability.
  - Web eval endpoint down → cache-miss does not block; returns unknown + logs.

---

## Questions to answer in the proposal (to unblock implementation)

- What is the **exact** canonical score scale and normalization strategy?
- Which endpoints can **trigger evaluation**, and under which keys/headers?
- Does evaluation happen only via explicit admin/internal calls, or ever on cache-miss?
- What’s the prefetch integration point in the analyzer (batch vs per-domain)?
- What is the policy for subdomains and redirects (e.g., `news.example` vs `example`)?

