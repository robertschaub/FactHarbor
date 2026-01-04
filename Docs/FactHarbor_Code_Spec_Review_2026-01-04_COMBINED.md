# FactHarbor POC1 — Code Review + Specification Alignment
_Date: 2026-01-04_

This document is a **repo-wide review** of the current POC1 implementation (Next.js + .NET + SQLite) and an **alignment check** against the included XWiki specification export.

## Inputs reviewed

- Source code: `FactHarbor-main.zip` (unpacked locally)
- XWiki export: `FactHarbor Spec and Impl 1.Jan.26.xar` (86 pages)
- Repo docs: `Docs/*.md` (17 files)
- Key implementation files:
  - Web (Next.js): `apps/web/*` (TypeScript ~8266 non-empty LOC)
  - API (.NET): `apps/api/*` (C# ~477 non-empty LOC)
  - Analyzer core: `apps/web/src/lib/analyzer.ts` (**Analyzer v2.6.17 / schema 2.6.17**)

---

## Executive summary (what to do first)

### Urgent now (improves day-to-day dev + prevents fragile runs)
1) **Decouple runner execution from a single long HTTP request**  
   Move `/api/internal/run-job` to an async worker pattern (202 + job leasing/queue/BackgroundService). If you keep it synchronous for now, document the constraint clearly and ensure timeouts/hosting limits won’t kill real analyses.
2) **Unify job status vocabulary between API and UI** (`QUEUED` vs `PENDING`) so the UI reflects reality.
3) **Add a minimal automated “job lifecycle” test** (fake runner, no real LLM) to prevent regressions during refactors.

### Soon (core product correctness + spec fidelity)
4) **Surface Quality Gates** in the report + UI (pass/fail reasons, publishability, excluded claims).  
5) **Resolve the Quality Gate definition mismatch inside the XWiki spec** (pick the authoritative definition and align pages + implementation).  
6) **Split `apps/web/src/lib/analyzer.ts` into modules** (schemas, pipeline stages, renderers, providers) to keep iteration safe.

### Before public release (high importance, intentionally not urgent right now)
7) **Add SSRF protections to URL/PDF fetching** (block private/link‑local ranges, cap content size, limit redirects/timeouts, validate content-type).  
8) **Lock down cost-leaking endpoints** (`/api/admin/test-config`, detailed `/api/health`, Swagger UI) and disable/guard them in production.  
9) **Introduce AuthN/AuthZ + rate limiting/quota/cost guards** for any deployment exposed beyond localhost; tighten CORS/CSRF and protect internal runner callbacks.

---
## Architecture snapshot (as implemented)

**Current split is good for POC:**  
- **.NET API** (SQLite): job storage, job events (SSE), write-back endpoints for runner updates  
- **Next.js Web**:
  - UI (submit URL/text, show jobs + reports)
  - Runner (“/api/internal/run-job”): performs analysis and writes results to API

**Internal security model:**  
- Runner route requires `x-runner-key` header = `FH_INTERNAL_RUNNER_KEY`
- API internal update endpoints require `X-Admin-Key` header = `Admin:Key`

This matches the **“separated architecture”** concept in your docs, but production-hardening is still needed.

---

## Spec alignment overview (high level)

| Area | Status | Notes |
|---|---|---|
| Job orchestration (create job, progress, SSE events) | Implemented (POC-ready) | API stores job + events in SQLite; Web runner updates via internal endpoints; SSE endpoint for live events. |
| Quality Gates (POC) | Partially implemented | Analyzer applies Gate 1 (claim validation) and Gate 4 (verdict confidence) and tracks contradiction search; display of per-item gate reasons is largely missing in UI/report. |
| Source reliability / track record | Partial | Static Source Reliability Bundle (source-bundle.json) loaded; sources store trackRecordScore/category. No historical track record or provenance chain yet. |
| Evidence model (Claim–Scenario–Evidence–Verdict) | Partial (Claim–Evidence/Facts–Verdict) | Claims + extracted facts + verdicts exist in result JSON; Scenario object is not yet explicit/persisted. |
| AuthN/AuthZ & rate limiting | Missing (except shared secrets for internal calls) | Public UI and endpoints are open; admin test endpoints are unauthenticated; CORS is permissive in API. |
| Persistence / normalized data model | Missing (beyond job blobs) | API persists job metadata + JSON/markdown results; no normalized tables for claims/evidence/sources/verdicts. |
| Caching & separated architecture (claim-level) | Missing | Docs propose claim cache; current pipeline recomputes per job. |
| Testing | Partial | Web has unit/integration tests for analyzer; API has no tests; CI only builds. |


---

## Key findings and recommendations (detailed)

### 1) Security & abuse resistance

**Findings**
- `extractTextFromUrl()` in `apps/web/src/lib/retrieval.ts` fetches arbitrary URLs, follows redirects, and then parses HTML/PDF.
- The repo’s own `SECURITY.md` already warns about SSRF, but protections are not yet implemented in code.
- `/admin/test-config` and `/api/admin/test-config` are publicly reachable and can trigger paid LLM calls (and search provider calls).

**Recommendations**
- **P0:** Implement SSRF controls (block private IP ranges, localhost, metadata endpoints; enforce `http/https`; cap size; cap redirects; enforce timeouts; validate content-type; optionally add domain allowlist).  
- **P0:** Protect admin endpoints:
  - simplest: require `FH_ADMIN_KEY` as a bearer token/header for those routes
  - better: proper auth + role check + per-user rate limits
  - also: disable these routes in prod builds by default.
- **P1:** Add rate limiting (per IP/user) on `/api/fh/analyze` and any expensive route.  
- **P2:** Tighten CORS in API for production; current `AllowAnyOrigin` is fine for localhost POC but risky for public deployments.

---

### 2) Job workflow correctness & UX consistency

**Findings**
- API sets job status to **`QUEUED`** (see `JobService.CreateJobAsync` and `AnalyzeController`).
- Web UI pages (jobs list/detail) expect **`PENDING`** for the “waiting” state; `QUEUED` is not handled for icons/labels.
- Runner write-back relies on `FH_ADMIN_KEY` being configured in the web env; without it, jobs may remain stuck.

**Recommendations**
- **P0:** Choose a single status enum and apply it everywhere (API + UI + docs).  
  Suggested canonical: `QUEUED → RUNNING → SUCCEEDED | FAILED`.
- **P1:** Add a small “configuration state” banner in the UI if admin key / runner key is missing, so the failure mode is obvious.

---

### 3) Quality Gates: implemented, but not yet surfaced

**Findings**
- The analyzer **does apply**:
  - **Gate 1:** claim validation (filter opinions/predictions/low-specificity claims) while keeping central claims
  - **Gate 4:** verdict confidence assessment (min sources, source quality threshold, agreement threshold; central claims remain publishable)
- However, most gate decisions are not clearly visible to end users:
  - the markdown report includes aggregate stats, but not “why this claim was excluded” / “why this verdict is non-publishable”
  - UI pages don’t show gate reasoning or per-claim/per-verdict gate metadata

**Recommendations**
- **P1:** Add a “Quality Gate Details” section:
  - show excluded claims (Gate 1) with reasons + scores
  - show verdict publishability (Gate 4) with reasons and confidence tier
  - include links to supporting sources/facts in each item.
- **P1:** Update `Docs/POC1_Specification_vs_Implementation_Analysis.md` — it currently states “Quality Gates Not Implemented”, which no longer matches the code.

---

### 4) Spec inconsistency found inside the XWiki export

**Finding**
- In the XWiki export, **POC Requirements** describe Gates 1–4 differently (e.g., Gate 1 as “Source Quality (Basic)”) than what the current analyzer implements (Gate 1 as “Claim Validation”).  
  This creates ambiguity about what “correct” means.

**Recommendation**
- **P1:** Pick the authoritative gate definitions and update the XWiki pages to match:
  - either rename the implemented gates to match the requirements page, or
  - update the requirements page to reflect the implemented design (recommended if current design is intentional).

---

### 5) “Measure Everything” is not yet operationalized

**Findings**
- The analyzer tracks useful stats (LLM calls, searches, sources, timing), and stores some metrics in output JSON.
- But there is **no persistence layer** for metrics and no trend tracking (per day/week, per model, per prompt, per topic).

**Recommendations**
- **P1:** Persist “metrics rows” per job in SQLite (even a single JSON column is fine initially):
  - gate pass rates, source count, average source quality, agreement score, LLM call count, elapsed time, search provider usage
- **P1:** Add a simple `/admin/metrics` page to view trends and export CSV.

---

### 6) Data model gap vs specification

**Findings**
- The spec’s **Data Model** page describes first-class objects: Claim, Scenario, Evidence, Verdict, Source, Track Record, etc.
- Current implementation persists:
  - job metadata + job events
  - `resultJson` blob + `reportMarkdown`
- This is appropriate for POC1 speed, but it blocks:
  - reuse/caching across jobs
  - provenance queries (“where did this evidence come from historically?”)
  - building stable browsing UI beyond job outputs

**Recommendations**
- **P2:** Add minimal normalized tables incrementally:
  1) `Sources` (url/domain, trackRecord fields)
  2) `Claims` (normalized text hash + role + dependencies)
  3) `Verdicts` (claimId, scale, confidence, publishable, reasons)
  4) `Evidence/Facts` (fact text, excerpt, sourceId, claimId)
- Keep job-level blob for backwards compatibility; gradually populate normalized tables.

---

### 7) Maintainability: file size hotspots

**Findings**
- `apps/web/src/lib/analyzer.ts` is ~4.2k non-empty LOC and contains config, prompts, search logic, parsing, gating, and report generation.
- `apps/web/src/app/jobs/[id]/page.tsx` is ~1k non-empty LOC.

**Recommendations**
- **P1:** Modularize analyzer (separate folders for prompts, schemas, gates, retrieval, verdicts, reporting, metrics).  
- **P1:** Componentize the job details UI; pull formatting + helpers out of React render path.

---

### 8) Testing & CI

**Findings**
- Web has tests (including an LLM integration test file).
- CI workflow builds web + API, but does not run tests, lint, typecheck, or dotnet test.

**Recommendations**
- **P1:** Add a test stage to CI:
  - unit tests that don’t require real API keys (mock providers)
  - integration tests in a separate job that runs only when secrets are present
- **P3:** Add lint/typecheck steps and `dotnet test` once tests exist.

---



### Additional notable issues worth addressing

- **API DB initialization**: `EnsureCreated()` is used on startup. That’s fine for POC, but for any evolution of the schema you’ll want **EF migrations** (or at least a versioned migration strategy) to avoid data loss.  
- **Swagger exposure**: Swagger is enabled unconditionally. For production you typically restrict it to development or require auth.  
- **Runner execution constraints**: the runner is implemented as a Next.js route with `maxDuration = 300`. Depending on hosting, serverless execution limits may still kill long jobs; a queue-based worker is the safer long-term path.  
- **Debug log file writes**: analyzer writes a debug log via `fs.appendFileSync`. This is harmless (errors ignored) but can be confusing on serverless runtimes; consider swapping to structured logging only.  
- **Health endpoint information leak**: `/api/health` returns “key present” booleans. This is generally OK, but if the endpoint is public you may still want to gate it or redact details in prod.


## Action list (sorted by urgency, then importance)

**Legend**
- **Urgency:** Immediate → Soon → Before public release → Backlog  
- **Importance:** Critical → High → Medium → Low  
- “Before public release” items can be highly important while intentionally **not urgent** during POC/private development.

| Urgency | Importance | Area | Action |
|---|---|---|---|
| Immediate | High | Reliability / Architecture | **Make runner execution resilient:** shift `/api/internal/run-job` to async worker (202 + lease/queue/BackgroundService) or formally constrain analysis duration + hosting + timeouts. |
| Immediate | High | Testing / Safety | **Add a minimal automated job-lifecycle test** (create job → run fake runner → write result/events → verify SSE). |
| Immediate | Medium | UX / Correctness | **Unify job status values** between API + UI (`QUEUED` vs `PENDING`) and ensure UI mapping is exhaustive. |
| Soon | High | Spec / Product | **Surface Quality Gates** (Gate results + reasons) in `reportMarkdown` and in the UI, including “publishability”. |
| Soon | High | Maintainability | **Modularize `analyzer.ts`** into `schemas/`, `pipeline/`, `renderers/`, `providers/` to reduce risk when evolving the evidence model. |
| Soon | Medium | Spec Consistency | **Align gate definitions in XWiki export vs code** (spec pages currently disagree); update the XWiki pages to match the chosen definitions. |
| Soon | Medium | Observability | **Persist key metrics per job** (gate pass rates, token/call counts, search counts, source counts) to support “improve the system before editing data.” |
| Soon | Medium | Persistence | **Move off `EnsureCreated()` toward EF migrations** so schema evolution is controlled. |
| Soon | Medium | Performance | **Improve SSE efficiency** (index events, backoff polling, or plan a push/channel approach) to reduce DB load as usage grows. |
| Before public release | Critical | Security | **Add SSRF protections** to URL/PDF fetching (`retrieval.ts`): block private/link-local ranges, limit redirects, size caps, strict timeouts, validate content-type. |
| Before public release | Critical | Security / Cost | **Protect or disable `/api/admin/test-config`** (and any similar routes) to prevent key/cost abuse; add an admin key + rate limit. |
| Before public release | Critical | Security / Access Control | **Introduce AuthN/AuthZ** for UI + API (even token-based), and require auth for job creation/reading in any public deployment. |
| Before public release | High | Abuse Controls | **Rate limiting + quotas/cost guards** on job creation and expensive endpoints; consider per-user budget and captcha for anonymous. |
| Before public release | High | Security | **Protect internal runner callbacks** (shared secret, allowlist network, idempotency/lease checks) so only the runner can update job status/results. |
| Before public release | Medium | Security / Ops | **Restrict Swagger UI to Development** (or behind auth). |
| Before public release | Medium | Security / Ops | **Reduce `/api/health` detail** in production (don’t reveal which secrets exist). |
| Before public release | Medium | Security | **Tighten CORS and consider CSRF protections** for any cookie/session-based admin flows. |
| Backlog | Medium | Cost / Performance | **Add caching** (verdict caching + source fetch caching with TTL) to reduce repeated costs and speed up repeated analyses. |
| Backlog | Medium | Product | **Expand Source Reliability bundle/track-record UX** (show source provenance + credibility rationale) as described in the spec/docs. |
| Backlog | Medium | DevEx | **Add lint/format quality gates** (ESLint/Prettier + typecheck in CI, `dotnet test`) to keep refactors safe. |
| Backlog | Low | Docs | **Keep repo Docs + XWiki spec pages in sync** (especially gates, evidence model objects, and job workflow). |

---
## Notes on what looks strong already

- Clean separation between “storage API” and “runner” is a solid POC architecture.
- Internal calls are protected by shared secrets (runner key + admin key) — good baseline.
- Analyzer implements a lot of pragmatic functionality (truth scale, claim roles/dependencies, basic quality gating) and tracks useful stats.
- Documentation is unusually thorough for a POC (checklists, hosting guide, source reliability bundle concept).

---

## Appendix: Where the relevant spec lives in the XWiki export

- `FactHarbor/Specification/Architecture`
- `FactHarbor/Specification/Data Model`
- `FactHarbor/Specification/POC/Requirements`
- `FactHarbor/Specification/POC/Specification`
- `FactHarbor/Roadmap/Architecture Analysis 1.Jan.26`


---

## Appendix A — Prior quick-pass findings (included + reconciled)

This appendix consolidates the earlier “quick pass” findings you pasted (jobs/runner/security/maintainability) and maps them to what I confirmed in the codebase.

### A1) Architecture / runtime
- **Runner trigger timeout & sync execution**
  - **Confirmed risk:** `/api/internal/run-job` executes the full workflow synchronously (long-running request).
  - **Updated detail:** In the current repo, the API’s `HttpClient` timeout for `RunnerClient` is **5 minutes** (not 20 seconds).  
    Still, real-world analyses can exceed this, and many hosting environments/serverless functions will kill long requests.
  - **Recommendation:** make runner execution **asynchronous** (202 + queue/worker) and implement job leasing/idempotency.

### A2) Security
- **SSRF risk in URL/PDF fetching**
  - **Confirmed:** `apps/web/src/lib/retrieval.ts` fetches arbitrary URLs (HTML/PDF) without SSRF controls.
  - **Recommendation:** block private/link-local ranges + localhost; cap size/time/redirects; validate content-type; consider allowlist.

- **Unprotected admin “test-config” endpoint can burn keys**
  - **Confirmed:** `apps/web/src/app/api/admin/test-config/route.ts` has **no auth** and performs paid calls.
  - **Recommendation:** protect with `FH_ADMIN_KEY` (or proper auth) and disable in production builds by default.

- **Health endpoint leaks configuration presence**
  - **Confirmed:** `apps/web/src/app/api/health/route.ts` exposes which secrets are present.
  - **Recommendation:** reduce to `{ ok: true/false }` in prod, or protect the endpoint.

- **Swagger enabled in all environments**
  - **Confirmed:** `apps/api/Program.cs` calls `UseSwagger()` and `UseSwaggerUI()` unconditionally.
  - **Recommendation:** enable Swagger only in Development or behind auth.

### A3) Correctness / spec consistency
- **Status name mismatch (`QUEUED` vs `PENDING`)**
  - **Confirmed:** API uses `QUEUED`; UI styles handle `PENDING`.
  - **Recommendation:** standardize status vocabulary across API + UI.

### A4) Persistence / scalability
- **`EnsureCreated()` blocks migrations**
  - **Confirmed:** `db.Database.EnsureCreated()` is used (POC acceptable).
  - **Recommendation:** move to EF migrations once schema stabilizes.

- **SSE is polling-based**
  - **Confirmed:** jobs events SSE polls DB every ~2s for ~10 minutes.
  - **Recommendation:** keep for POC, but move to push/channel/pub-sub or reduce load + index.

- **Input validation + size limits**
  - **Confirmed:** `CreateJobRequest(string inputType, string inputValue)` has no validation and can store large payloads.
  - **Recommendation:** validate `inputType`; cap sizes; optionally store excerpt; add constraints / validation layer.

### A5) Maintainability / DX
- **`apps/web/src/lib/analyzer.ts` is a monolith**
  - **Confirmed:** large single file combining config + prompts + schemas + orchestration + rendering.
  - **Recommendation:** split into `config/`, `schemas/`, `pipeline/`, `renderers/`, `providers/` modules.

- **Root workspaces include `packages/*` but folder is missing**
  - **Confirmed:** root `package.json` workspaces include `packages/*` but no `packages/` directory exists.
  - **Recommendation:** remove `packages/*` or add the folder.

- **Lint script placeholder**
  - **Confirmed:** root `lint` script is `echo "(add lint later)"`.
  - **Recommendation:** add ESLint + Prettier + CI enforcement (at least for `apps/web`).

- **Potentially unused heavy dependency: `canvas`**
  - **Likely:** `apps/web/package.json` includes `canvas`, but there is no direct import usage in the TS/TSX sources.
  - **Recommendation:** confirm whether it’s needed; if not, remove to simplify Windows installs.

- **Add minimal tests**
  - **Recommendation:** add a small API test suite (create job, update status/result, fetch job, SSE emits events) and a web smoke test.