# FactHarbor Current Status

**Version**: v2.11.0
**Last Updated**: 2026-08-10
**Phase**: **Alpha** — development paused since 2026-07-02 for funding reasons
**Status**: The ClaimAssessmentBoundary pipeline is operational and deployed (`app.factharbor.ch`, invite-gated alpha). **Development is paused for one reason: the metered third-party API cost of running analyses exceeds what the project can fund.** It is not paused for technical reasons — the safe test suite is green at **1,986 passing / 1 skipped across 102 files** (verified 2026-08-10), and the active engineering plan is intact with its next step unstarted rather than blocked. No pipeline or application code has changed since **2026-07-02**; the work since then has been documentation, security re-verification, and funding/product-concept work. See [Why development is paused](#why-development-is-paused) below.

---

## Why development is paused

Paused since **2026-07-02**. The pause is a funding decision, not a technical one.

- **The cost driver is metered API spend, not tooling.** Each analysis job consumes third-party LLM and search API calls costing roughly **$1**. The recurring bill is the analysis product itself — production jobs, local development runs, and eval/diagnostic scripts. It is not agentic coding, which runs on a nonprofit team subscription rather than an API key. Measured breakdown by model, task and stage: [LLM API Cost Reduction & NPO Discounts](../WIP/2026-06-01_LLM_API_Cost_Reduction_and_NPO_Discounts.md).
- **The nonprofit programs FactHarbor holds do not reach that cost line.** Claude for Nonprofits and OpenAI for Nonprofits (both active since 2026-05-10) cover team and workspace **seats only**. There is no self-serve nonprofit discount for the Claude API runtime the pipeline actually consumes.
- **The one documented lever on that line got no answer.** A nonprofit / social-impact API-pricing request went to Anthropic sales on 2026-06-11. As of 2026-08-06 there has been no reply, so the working assumption is a "no" and cost planning no longer waits on it.
- **No grant or academic funding replaced it.** Both academic cooperation tracks — the ZHAW/Innosuisse Innovation Cheque and the DIZH Rapid Action Call — will not materialize (confirmed 2026-06-10). Swiss foundation applications are not credible before **Q1 2027**: the Verein has no banking history, no first-year financials, and no independent board member yet. One programme assessment exists (Stiftung Mercator Prototype Fund, 2026-08-04) and its own risk register notes that a grant won now could not be delivered while the project is paused.
- **Revenue is zero.** Alpha is invite-gated to a handful of testers; there is no paid tier and no pilot contract.

**What would resume development** — either side of the same equation:

1. **Cost inside budget**: nonprofit API pricing or credits; routing the lower-judgment extraction share of spend to a cheaper model behind an audit gate; Batch API for the eval bucket; and completing the two pending production config verifications, one of which — Serper as search priority 1 — is a roughly **$170/month** lever already shipped to `main` but not yet re-seeded in production.
2. **External money**: a sponsor, a grant, or one supervised paid pilot.

**Production stays live during the pause.** The deployed alpha at `app.factharbor.ch` keeps serving and keeps accepting jobs — the pause applies to development, not to the service. Two consequences follow:

- **Per-job API spend continues at alpha volume.** So the cost levers that do not depend on new development are live actions, not resume-time ones: provider spend caps, the pending Serper search-priority re-seed, and stopping non-production consumption (local development jobs and eval/diagnostic batches, which accounted for the larger share of measured spend).
- **The service runs unattended.** That gives `SEC-INVITE` and `OPS-MONITOR` more weight than their `med` backlog urgency suggests: invite-code probing converts directly into LLM spend, and there is no monitoring to notice either that or an outage.

Until funding or cost resolves, development work stays confined to zero-spend activities. The engineering plan is sequenced accordingly: its Phases 4–5 are fixture- and dry-run-based, and Phase 6 is the first step that needs the funding question answered.

Cost accounting, funding correspondence and the organizational record live in the private operations repository, not here.

---

## Current Focus (2026-08-10)

- **The engineering plan is paused mid-sequence, not stuck.** The active track is the **[Analysis Quality Consolidated Execution Plan](../WIP/2026-06-18_Analysis_Quality_Consolidated_Execution_Plan.md)** (2026-06-18). Phases 0–3 and the Phase-4 scaffold are shipped; the Phase-4 LLM retrieval-language planner slice is simply unstarted. Two mid-June live-validation attempts did fail their gates — the Cycle-1 prune (reverted, `a56fed6f4`) and the Stage2/D5 recovery chain (`0396ea47`) — but both were classified as failed attempts with baselines recorded, and `main` was left green. Resuming means executing the plan, not re-planning it.
- **The measured problem is failure *attribution*, not a single known bug.** Read-only censuses on 2026-06-18 over 1,640 `SUCCEEDED` jobs: Q-HF1 hard failures **8.2%** (135 jobs), top-level `UNVERIFIED` **15.4%** (253), checkworthy-AtomicClaim `UNVERIFIED` **24.6%** (992/4,038). These rates are why narrow prompt tuning was ruled a low-confidence next move.
- **Two failure classes are isolated and unfixed**: (1) English-Bolsonaro source-native retrieval gap — evidence exists but not in the input language's likely source routes; (2) asylum-current D5/Stage-4 decisive-metric sufficiency gap — authoritative evidence is present but not admitted to verdict reasoning. Phases 4 and 5 of the plan target these respectively.
- **F2 surgical contract repair is shipped and live-validated once, not at volume.** `bb4de5f7` + `33ed6f74` (2026-06-11) stop `report_damaged` aborts by repairing individual claims instead of failing the bundle. One confirmed firing (job `b84ebbfe`, 2026-06-12) rescued a report that would have aborted. The 13%→~0 design claim is **unmeasured** — see backlog `F2-CENSUS`.
- **F2 can silently no-op in production.** It depends on prompt section `CLAIM_CONTRACT_SURGICAL_REPAIR` (claimboundary prompt 1.0.12). Admin-owned prompt blobs do not auto-refresh from file, so a stale production blob disables the fix invisibly. Verifying this is the highest-urgency open item — see backlog `F2-PROD`.
- **Two production config verifications are still pending**, both the same class of risk — a shipped change that a stale admin-owned DB blob silently ignores: the F2 prompt blob above, and the Serper→P1 search-priority re-seed (`362a9312`, 2026-06-01; local DB live, production outstanding). The second is also the cost lever named above.
- **Selective prune is the ratified debt approach; rebuild-from-POC was rejected.** The plan's non-negotiable stands: do not prune `claimboundary.prompt.md` before measurement and stage isolation exist.
- **Cross-linguistic neutrality remains the largest comparative quality gap.** Multilingual/report-language groundwork is shipped; the EN and source-native supplementary lanes are both experimental and default-off, awaiting validation and a promotion decision. Mechanism reference: [Multilingual_Language_Handling.md](../ARCHITECTURE/Multilingual_Language_Handling.md).
- **Volume measurement is out of scope while paused.** Repeated-run statistics (N≥5 reps/arm) and population censuses need paid runs, so they wait on the funding question. The F2 efficacy re-measurement is the exception worth watching: its census is read-only and free, and because production stays live its input accumulates on its own — just slowly, at real alpha traffic rates rather than batch rates.

---

## Recent Changes (2026-04-15 → 2026-08-10)

Grouped by theme rather than by day. Full commit history in git; dated sections for 2026-02-13 → 2026-04-15 are in [Current_Status_arch.md](../ARCHIVE/STATUS/Current_Status_arch.md).

### Analysis quality — the main track

- ✅ **Verdict citation publication contract** (`ca143468`, `ac3b33da`, `6b9c562f`): Stage-4 verdicts must cite publishable evidence; repaired verdicts must carry plausible citations; invalid challenge citations are separated rather than silently absorbed.
- ✅ **Verdict label separated from publishability** (`45c51b31`, `999f78b7`, `046430ff`, `776bf455`): a claim can be labelled without being publishable; legacy `UNVERIFIED` truth-signal fallbacks removed from the web layer.
- ✅ **Reconciliation now runs against the full evidence pool** (`54fe23c3`) instead of a role-partitioned subset.
- ✅ **F2 surgical per-claim contract repair** (`bb4de5f7`, `33ed6f74`, 2026-06-11): replaces the all-or-nothing contract gate abort — the root cause of `report_damaged` — with per-claim repair, plus prompt 1.0.12, UCM knobs, and `contract_surgical_repair_fired` / `_diagnostic` telemetry. Live-validated on one firing; efficacy at volume open (`F2-CENSUS`).
- ✅ **D5 gating corrected to per-claim** (`4c140ca4`) and the **applicability classifier now fails open** on infrastructure failure (`85f129a9`) rather than closed job-wide.
- ✅ **Zero-citation INSUFFICIENT claims excluded from article aggregation** (`82a1aa17`); narrative confidence downgrade bounded by a configurable max delta (`551e714b`).
- ✅ **Prompt audit fixes F01–F09 applied** (`bcae3239`, `fd5ce7e2`): generic-hygiene, neutrality, and output-schema alignment across the claimboundary and source-reliability prompts.
- ⚠️ **Two attempts failed their live gates and were reverted or classified**: the Stage-1 broad-comparative classification fix (`ed7698a8` → reverted `1c790a05`, ineffective in live validation) and the Stage2/D5 recovery chain (`0396ea47`, both Captain inputs returned `UNVERIFIED` 50/0). Both are recorded as failed attempts with baselines, per the Failed-Attempt Recovery rule.
- ⚠️ **A published quality claim was retracted** (`5f58a7e2`): the earlier "F1 44.5% / F4 36.1%" UNVERIFIED census cited a plan file that never existed. Superseded by the reproducible censuses now cited in Current Focus.

### Measurement and diagnostics — mostly zero-spend, read-only

- ✅ **Phase-1 report-quality scorer** (`7296f4a7`) plus reference dossiers and manual alignment artifacts for the Captain benchmark families (Bundesrat, Bolsonaro, plastic, hydrogen, asylum), including a frame-dominance contract and aggregation modes.
- ✅ **Reason-coded failure censuses and abort drills** (`ccb526e2`, `716de649`, `a4338753`, `7fdf78d0`, `66bcdca3`): established that `report_damaged` is 94% Stage-1 contract gate, and rejected the fetch-failure hypothesis for checkworthy `UNVERIFIED` on base-rate grounds.
- ✅ **Longitudinal quality-over-time tooling** (`0811d9aa` … `a1b43c13`): per-branch attribution, build-date x-axis, production DB folded into coverage.
- ✅ **Pipeline telemetry Phase 1/2 + derivable D5 subcounts** (`746c4c66`, 2026-06-01): additive `pipelineTelemetry` and `qualityHealth.d5` with denominator-correct rates, no pipeline behavior change and no DB migration.
- ✅ **Evidence-pool comparator** (`b67a50c1`) confirmed same-input verdict variance is dominated by evidence-pool drift (Jaccard 0.10–0.29), not sampling temperature.
- ✅ **Failure-attribution and stage-isolation fixtures** (`66ddc0cf`, 2026-07-01): frozen fixtures + `scripts/diag/current-build-failure-attribution.cjs`, satisfying plan Phases 1–2.

### Retrieval, search, and reliability

- ✅ **Search priority swapped Serper→P1, Google CSE→free-tier fallback** (`362a9312`). Local DB live; **production re-seed still pending**.
- ✅ **Google-CSE throttle** (`406393c9`) to curb 429-driven evidence drift under runner concurrency — a verdict-variance driver, not just a latency issue.
- ✅ **Content-type-aware PDF detection + configurable response cap** (`af026923`, `d09d1973`) from the source-fetch failure investigation (`0b38dd8b`). Fetch failure is chronic (~87% of jobs see at least one, 72% of those 403) but non-degenerate: the pipeline over-provisions.
- ✅ **Research coverage preserved before D5** (`0396ea47`) — shipped, but the surrounding chain failed live validation.
- ✅ **Default-off source-native supplementary lane scaffold** (`b72b5111`, 2026-07-01): the Phase-4 landing surface. Scaffold only; no planner behind it yet.

### Cost and models

- ✅ **Anthropic prompt caching disabled on `main`** (`b692ae17`) — measured net-negative for this workload.
- ✅ **Discarded output tokens cut** (`871cbf24`) via cluster/applicability schema tightening and guard caps.
- ✅ **Cost-tracking corrections**: Opus family repriced to $5/$25 (`0a2c9d40`), gpt-5.x entries added (`c8e8cdd1`), Haiku model ID corrected (`45606613`), Gemini references updated to 3.1-pro-preview (`e649b6e5`).
- ✅ **Short sequential evidence IDs** (`a446b7cc`, `582911fb`): `EV_001`-style per-analysis IDs replace the prior scheme, with monotonic-continuity coverage.

### Platform, security, and hygiene

- ✅ **Security posture re-verified against code** (2026-08-06, commit `0d76f0ef`): SSRF protection and per-IP rate limiting are **implemented** — [KNOWN_ISSUES.md](KNOWN_ISSUES.md) previously understated this. Admin auth downgraded to PARTIAL with the one remaining exempt route named; a new invite-code brute-force gap recorded.
- ✅ **Dependency and CI maintenance**: 7 npm vulnerabilities patched (`beae2e16`, `064b7240`), ~12 Dependabot bumps merged, GitHub Actions moved to Node 24 (`a7f091a0`).
- ✅ **Deployment guide and test artifacts untracked** from git (`6d2f7710`).
- ✅ **Harness environment leak fixed** (`3fc2b26b`): `restart-clean.ps1` strips the injected `ANTHROPIC_BASE_URL`/`MODEL` that made every agent-started pipeline LLM call return 404.
- ✅ **DB write-guard hook scoped to writes only** (`f1afdeef`), so read-only `sqlite3` inspection works while destructive statements stay blocked.
- ✅ **Admin job annotations + job search** (`6444126d`, `34f009f8`) and automatic claim selection (`d2d06f83`).
- ✅ **Legal documents rewritten to match the live product** (`62f894a8`, `45df14fd`, 2026-06-11): the prior Privacy Policy and ToS described a community wiki and omitted all third-party LLM/search sub-processors. Both remain DRAFT with open `[NEEDS DECISION]` items.
- ✅ **Verein founded and registered; NPO status verified** (`a48feedd`, `bfd466f5`); Steuerbefreiung applied for, pending.

### Documentation and process

- ✅ **Handoff index rebuilt; April and May handoffs archived** (`688ef2411`, `8f750374`).
- ✅ **`/doc-guard` and slim `/debt-guard` skills restored** (`3fee2839`, `d6804bef`, `12f1e492`) after a repair-drift pile-up recurred.
- ✅ **JIT model + effort routing for Claude Code** (`4a2a8367`, `6a1c3a46`) — agent tooling, not product code.
- 📋 **Evidence-based action tools product concept** (`7cd90803`, `ccf43df9`, `db830328`, 2026-07-01/02): three-tool concept (Evidence Compass, Honest Inquiry Engine, Agent Provenance Contract) plus competitive landscape. Concept only — no build sequence committed; the open crux is a minimum Estuarine map usable without expert facilitation (backlog `EVACT-1`).

---

## Quick Status

### ✅ What works

**Core analysis pipeline** — ClaimAssessmentBoundary, 5 stages, single production pipeline:

- Evidence-emergent boundary clustering; claim extraction with dependency tracking; temporal reasoning with current-date awareness
- Two-pass evidence-grounded claim extraction (Haiku scan → preliminary search → evidence-grounded re-extraction) with Gate 1 validation and LLM-backed claim-contract validation
- 5-step LLM debate for verdicts (advocate → challenger → reconciliation → self-consistency → validation), 7-point verdict scale, MIXED vs UNVERIFIED distinction
- Source triangulation, per-source evidence caps, claim-local source portfolios, derivative-evidence tracking
- Quality gates (Gate 1 claim validation, Gate 4 confidence distribution) surfaced in UI via `QualityGatesPanel`
- Provenance validation, harm-potential detection, doubted-vs-contested distinction, pseudoscience escalation
- F2 surgical per-claim contract repair on the Stage-1 contract gate

**Infrastructure:**

- Job lifecycle (QUEUED → RUNNING → SUCCEEDED/FAILED/CANCELLED/INTERRUPTED) with SSE progress, monotonic progress guard, orphan re-queue on restart
- Multi-provider LLM (Anthropic, OpenAI, Google, Mistral) with tiered per-task routing; multi-provider search — enabled by default: Serper (priority 1), Google CSE (priority 2), Wikipedia (priority 3, supplementary, capped at 3 results); supported but off by default: Brave, SerpAPI, Semantic Scholar, Google Fact Check
- Unified Configuration Management: DB-backed config for prompt/search/calculation/pipeline/sr/lexicons with validation, history, rollback, import/export, per-job snapshots, hot reload
- SSRF protection and per-IP rate limiting; invite-code access control with daily and lifetime quotas
- Per-job metrics isolation via `AsyncLocalStorage`; metrics wired into the CB pipeline; `pipelineTelemetry` + `qualityHealth.d5` aggregates persisted
- SQLite locally, PostgreSQL in production; automated retry with exponential backoff; VPS deployment with Caddy/TLS and backup cron

**UI:**

- Analysis submission, job history with search, report display (Summary / JSON / Report), analysis timeline, boundary findings, admin annotations shown at report top
- Self-contained dark-themed HTML report export
- Admin: config editors, metrics dashboard, invite-code management, source-reliability view

### ⚠️ Known issues

[KNOWN_ISSUES.md](KNOWN_ISSUES.md) is authoritative and its security section was re-verified against code on 2026-08-06. The items that matter for the next work session:

| Item | State |
|---|---|
| F2 prompt 1.0.12 unverified in production | F2 silently no-ops on a stale admin-owned prompt blob (`F2-PROD`) |
| Serper→P1 priority not re-seeded in production | Shipped to `main` 2026-06-01; production still on the old order |
| `/admin/source-reliability` bypasses the admin login gate | Read-only, no paid calls, no personal data — but inconsistent (`SEC-ADMIN-SR`) |
| No invite-code brute-force lockout | Distinguishable 404, no attempt tracking; a guessed code costs ~$1/job (`SEC-INVITE`) |
| No `dotnet test` in CI | The whole .NET layer — auth, invite quotas, rate limiting, runner client — has zero gate coverage (`CI-DOTNET`) |
| No uptime monitoring or error aggregation | Production failures are found when a user reports them (`OPS-MONITOR`) |
| No claim caching; no normalized data model | Results are JSON blobs; every analysis recomputes from scratch |

`KNOWN_ISSUES.md` and `Backlog.md` were reconciled against code and git on 2026-08-10: no open entry there is CRITICAL or HIGH severity, and the previously stale claims (metrics not wired, `parallel-verdicts.ts`, 8 skipped budget tests, Phase 7 / Shape B as the active track) are corrected with file/line or commit evidence.

---

## Current Priorities

[Backlog.md](Backlog.md) is the canonical prioritized list. Priorities 1–3 apply **now**, because production keeps running and spending while development is paused. Priorities 4 onward are the engineering sequence on resume:

1. **Audit the live production runtime** — Serper P1 priority actually re-seeded and `SERPER_API_KEY` present (else provider selection silently falls back to the pricier Google CSE and the bill never moves), model-role config pins not drifted to a premium tier, F2 prompt blob 1.0.12 active. These are live cost and correctness facts today, not resume-time checks.
2. **Cap the downside while unattended** — lower the provider monthly spend limit to something an alpha can justify, and close or accept the two open cost-amplification paths (`SEC-INVITE` invite-code probing, `SEC-ADMIN-SR`). A free uptime ping on `/api/health` (`OPS-MONITOR`) is the cheapest way to stop discovering outages by email.
3. **Re-measure the standing burn split** — production vs local development vs eval scripts. Standing burn has previously consumed most of the available budget on its own, independent of any validation runs, and the non-production share is the part a development pause should already have removed.
4. **Execute plan Phase 4** — generic LLM retrieval-language / source-native route planning behind the shipped default-off scaffold. Zero-spend: planner unit tests, dry-run plan snapshots, lane-bloat checks.
5. **Execute plan Phase 5** — authoritative-evidence sufficiency admission for D5/Stage-4, validated against frozen fixtures including negative fixtures that must stay `UNVERIFIED`.
6. **Then Phase 6 live validation** — one Captain-defined job at a time, starting with an accepted comparator as regression sentinel, under the documented stop rules.
7. **Re-measure F2 efficacy at volume** (`F2-CENSUS`) once accumulated jobs exist — read-only, no new spend.

Deferred by explicit decision: optimization reopening (`OPT-GATE`), volume statistics and population censuses, Gemini provider swap during alpha, foundation applications before Q1 2027.

---

## Architecture Status

| Component | Status | Notes |
|-----------|--------|-------|
| **Next.js Web App** | ✅ Operational | Runner + orchestrator, port 3000 |
| **.NET API** | ✅ Operational | SQLite local, PostgreSQL production; no automated test coverage in CI |
| **Job Orchestration** | ✅ Working | SSE events, exponential backoff, orphan re-queue |
| **Analysis Pipeline** | ✅ Operational | ClaimAssessmentBoundary only — Orchestrated, Monolithic Canonical and Monolithic Dynamic all removed |
| **LLM Integration** | ✅ Multi-provider | Anthropic (default), OpenAI, Google, Mistral |
| **LLM Tiering** | ✅ Implemented | Per-task model selection; salience still rides the shared `understand` lane |
| **Search Integration** | ✅ Multi-provider | Serper primary, Google CSE fallback, Wikipedia supplementary; Brave/SerpAPI/S2/FactCheck off by default. Both multilingual lanes default-off |
| **Provenance Validation** | ✅ Implemented | All paths validate URL provenance |
| **PDF/HTML Extraction** | ✅ Working | Content-type-aware detection, configurable response cap, timeout handling |
| **Quality Gates** | ✅ Implemented | Applied and displayed (`QualityGatesPanel`) |
| **Source Reliability** | ✅ Implemented | LLM evaluation with cache, multi-model consensus, pinned evidence-pack replay |
| **Metrics / Telemetry** | ✅ Wired | Per-job isolation, `pipelineTelemetry`, `qualityHealth.d5`; no admin UI for the aggregates yet (`TELEM-UI`) |
| **Uptime Monitoring** | ❌ Not implemented | `OPS-MONITOR` |
| **Claim Caching** | ❌ Not implemented | Recomputes per job |
| **Normalized Data Model** | ❌ Not implemented | Job blobs only, no claim/evidence tables |
| **Rate Limiting** | ✅ Implemented | Per-IP fixed window, admin-key bypass; no per-user quotas beyond invite caps |
| **AuthN/AuthZ** | 🟡 Partial | Admin key + login gate, one exempt admin route; no end-user accounts |

### Data model

**Implemented**: analysis result with claims, verdicts, sources and evidence; article verdict with aggregation; claim verdicts with dependency tracking; quality gate statistics; per-job config and prompt-hash provenance; pipeline telemetry.

**Missing**: normalized relational tables, quality-metrics persistence beyond the metrics blob, error pattern tracking, historical source track record over time.

---

## Test Status

**Safe suite** (`npm test` — mocked, no API calls, verified 2026-08-10):

- **102 test files, 1,986 passing, 1 skipped**
- Covers the CB pipeline, verdict stage, prompt contracts, evidence filtering, aggregation, truth scale, quality gates, confidence calibration, job lifecycle, admin API routes

**Expensive integration tests** (explicit scripts only, $1–5+ per run — do not run without asking):

- `npm run test:llm` — multi-provider LLM integration
- `npm run test:neutrality` — input neutrality (full analysis ×2 per pair)
- `npm run test:cb-integration` — CB end-to-end (3 scenarios)
- `npm run test:calibration:canary` / `:smoke` / `:gate` — framing-symmetry lanes, per [Calibration_Run_Policy.md](Calibration_Run_Policy.md)
- `npm run test:expensive` — LLM + neutrality + CB integration (excludes calibration)

**Missing coverage**: .NET API controllers and database layer (no `dotnet test` in CI at all), frontend components, automated E2E.

---

## TIGERScore (Alpha)

Optional Stage-6 holistic audit pass scoring Truth, Insight, Grounding, Evidence, Relevance. Disabled by default (`tigerScoreMode: "off"`).

**Enable** via Admin → Config → Pipeline: `tigerScoreMode: "on"`, `tigerScoreStrength` (`budget` | `standard` | `premium`, default `standard`; legacy `tigerScoreTier` still normalizes on load), `tigerScoreTemperature` (default `0.1`). Defaults live in `apps/web/configs/pipeline.default.json` and `apps/web/src/lib/config-schemas.ts`.

**Verify active**: run a normal job and confirm a populated `tigerScore` object in `OverallAssessment` and a rendered TIGERScore panel in the report and HTML export.

**Calibration policy**: keep the setting identical on both sides of any A/B and record it in run metadata. If the baseline ran with TIGERScore off, keep it off.

---

## Environment Configuration

### Required

```bash
# LLM provider keys (provider selected in UCM pipeline config)
ANTHROPIC_API_KEY=sk-ant-...
# OPENAI_API_KEY=sk-...
# GOOGLE_GENERATIVE_AI_API_KEY=AIza...
# MISTRAL_API_KEY=...

# Search provider keys (priority set in UCM search config)
SERPER_API_KEY=...                 # P1 primary since 2026-06-01
# GOOGLE_CSE_API_KEY=... + GOOGLE_CSE_ID=...   # free-tier fallback
# BRAVE_API_KEY=...
# Optional: SEMANTIC_SCHOLAR_API_KEY=..., GOOGLE_FACTCHECK_API_KEY=...
# Wikipedia needs no key (enabled in UCM)

# Internal keys (must match between web and API)
FH_ADMIN_KEY=your-secure-admin-key
FH_INTERNAL_RUNNER_KEY=your-secure-runner-key
# API side: Admin:Key and Runner:RunnerKey in apps/api/appsettings.Development.json
```

### Optional

```bash
FH_RUNNER_MAX_CONCURRENCY=3   # max parallel analysis jobs
FH_JOB_TIMEOUT_MS=1800000     # per-job timeout for diagnostic batches
```

---

## Performance and Cost

**Typical analysis time**: 30–60 s for 1–2 claims, 2–5 min for a medium article, 5–15 min for 20+ claims.

**Measured cost**: roughly **$1.10 per job** on the current stack. The dominant spend is the pipeline itself, not agent tooling. Anthropic prompt caching is disabled on `main` (measured net-negative for this workload) and result caching is deliberately off during alpha so per-run variance stays visible.

**Search behaviour**: 3–6 queries per analysis, 4–8 sources fetched, parallel fetch with per-domain 401/403 short-circuiting and same-domain staggering. Fetch failure is chronic at the environment level (publisher bot-walls) but the pipeline over-provisions so reports stay non-degenerate.

---

## Compliance Status (AGENTS.md rules)

| Rule | Status | Notes |
|---|---|---|
| **Generic by Design** | ✅ Compliant | No domain-specific keyword tables; prompt audit F01–F09 applied 2026-06-01 |
| **Input Neutrality** | ⚠️ Monitored | Heuristic question→statement normalization was removed in favour of LLM-first handling; equivalence is now a measured property, not an enforced transform. Framing-symmetry calibration is the check |
| **Pipeline Integrity** | ✅ Compliant | All 5 stages execute; no stage skipping; fail-fast on damaged jobs rather than fabricated fallback verdicts |
| **Evidence Transparency** | ✅ Compliant | Verdict citation publication contract enforced; single citation channel; counter-evidence tracked |
| **No deterministic semantic logic** | ⚠️ Partial | Ranked residual hotspots tracked as `LLMINT-2`; the top two are Stage-1 anchor preservation and Stage-4 direction plausibility |
| **UCM-managed tunables** | ✅ Compliant | All analysis-affecting parameters in UCM; JSON and TypeScript defaults drift-tested |

---

## Getting Help

- **Known issues**: [KNOWN_ISSUES.md](KNOWN_ISSUES.md) · **Backlog**: [Backlog.md](Backlog.md) · **History**: [HISTORY.md](../ARCHIVE/HISTORY.md)
- **Active plan**: [Analysis Quality Consolidated Execution Plan](../WIP/2026-06-18_Analysis_Quality_Consolidated_Execution_Plan.md)
- **Quality bar**: `Docs/AGENTS/Captain_Quality_Expectations.md`, `Docs/AGENTS/benchmark-expectations.json`
- **Architecture**: [Multilingual_Language_Handling.md](../ARCHITECTURE/Multilingual_Language_Handling.md), [Calculations.md](../ARCHITECTURE/Calculations.md), and the xWiki System Design pages
- **Logs**: `apps/web/debug-analyzer.log`, API console, browser DevTools
- **Config check**: http://localhost:3000/admin/test-config · **API**: http://localhost:5000/swagger

| Symptom | Fix |
|---|---|
| Job stuck in QUEUED | `FH_INTERNAL_RUNNER_KEY` must match `Runner:RunnerKey` |
| Job fails immediately | Check LLM API key; if the error URL is missing `/v1`, a harness-injected `ANTHROPIC_BASE_URL` leaked — use `scripts/restart-clean.ps1` |
| No progress updates | `FH_ADMIN_KEY` must match `Admin:Key` |
| API not starting | DB auto-creates on startup; locally, delete `apps/api/factharbor.db` to recreate |
| No sources fetched | Enable at least one search provider in UCM and set its key |
| A prompt fix has no effect | Admin-owned prompt blobs do not auto-refresh from file — check the active version in the Admin UI, or re-seed |

---

## POC Closure Statement (2026-02-19)

The FactHarbor Proof of Concept is complete, tagged `v1.0.0-poc`. It demonstrated that a pipeline can extract claims from arbitrary text, gather web evidence, and produce structured evidence-backed verdicts with quality controls — via the 5-stage ClaimAssessmentBoundary architecture, the LLM debate pattern, enforced quality gates, LLM-based source reliability, evidence quality filtering, multi-provider tiered LLM routing, and runtime UCM configuration. Everything since is Alpha scope.

---

**Last Updated**: 2026-08-10
**Actual Version**: 2.11.0 (code) | 3.0.0-cb (schema) | `v1.0.0-poc` (tag)
**HEAD at last update**: `89b45abd` (2026-08-09) · last code commit `5c76e0e3` (2026-07-02)
**Document status**: Current Alpha snapshot. Dated changelog entries before 2026-04-15 are in [Current_Status_arch.md](../ARCHIVE/STATUS/Current_Status_arch.md); prioritization lives in [Backlog.md](Backlog.md).
