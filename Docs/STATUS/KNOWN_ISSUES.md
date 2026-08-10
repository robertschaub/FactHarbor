# FactHarbor Known Issues

**Last Updated**: 2026-08-10
**Current Version**: 2.11.0
**Schema Version**: 3.0.0-cb

This document tracks all known bugs, limitations, and technical debt in FactHarbor (ClaimAssessmentBoundary Pipeline v1.0).

**Verification provenance** — labels here have been checked against code at two different times, and the difference matters when reading a row:

- **Security concerns (S1–S4)**: re-verified against code on **2026-08-06** (`0d76f0ef`).
- **Everything else**: re-verified against code and the safe test suite on **2026-08-10**. Rows carry the file/line or commit they were checked against. Where a claim could not be re-verified, it says so instead of asserting a state.

Safe-suite baseline used for the test-hygiene rows: **102 files, 1,986 passing, 1 skipped** (`npm test`, 2026-08-10).

---

## Table of Contents

- [Critical Issues](#critical-issues)
- [High Priority](#high-priority)
- [Medium Priority](#medium-priority)
- [Low Priority](#low-priority)
- [Security Concerns](#security-concerns)
- [Performance Opportunities](#performance-opportunities)

---

## Critical Issues

### 1. Historical: v2.8 Prompt Optimizations Never Validated

**Status**: ✅ RESOLVED (v2.10.2 review)  
**Discovered**: January 2026  
**Severity**: Resolved / Historical

**Description**:
Large prompt optimization work (v2.8) was originally deployed without A/B testing:
- Provider-specific formatting (Claude XML, GPT few-shot, Gemini format, Mistral step-by-step)
- Claims ~40% token reduction for fast-tier models
- 83 tests added but only validate syntax, not actual LLM behavior

**Impact**:
- Historical risk was documented and tracked.
- Lead-dev review in v2.10.2 confirmed format-only/provider-variant safety and backward compatibility.
- Empirical A/B benchmarking remains optional follow-up work (not a blocking defect).

**Workaround**:
None. Optimizations are in production code.

**Solution**:
1. Run baseline test suite (30 cases, $20-50)
2. Run A/B test comparing old vs optimized prompts ($100-200)
3. Measure actual token usage, quality metrics, cost savings
4. Keep what works, revert what doesn't

**Files Affected**:
- `apps/web/src/lib/analyzer/prompts/*`
- All v2.8 prompt optimization code

---

### 2. Metrics Infrastructure Not Integrated

**Status**: ✅ RESOLVED — this issue was **factually wrong** as written  
**Discovered**: January 2026  
**Resolved / corrected**: 2026-08-10 (verified against code)

**What the old entry claimed**: metrics were built but never wired into the pipeline, fixable by adding hooks to `analyzer.ts` in "15-30 minutes".

**What is actually true**:

- `metrics-integration.ts` is imported by **10** analyzer and search modules, including `claimboundary-pipeline.ts:171` and `claim-extraction-stage.ts:46`, plus `boundary-clustering-stage.ts`, `aggregation-stage.ts`, `research-query-stage.ts`, `research-extraction-stage.ts`, `verdict-generation-stage.ts`, `claim-selection-recommendation.ts`, `source-reliability-calibration.ts`, and `web-search.ts`.
- Per-job metrics are isolated via `AsyncLocalStorage` (`OBS-1`, `6e402208`), not a module-global collector.
- `pipelineTelemetry` and `qualityHealth.d5` shipped in `746c4c66` (2026-06-01) with denominator-correct rates, and are aggregated by `/api/fh/metrics/summary` and `/api/fh/metrics/quality-health`.
- The old code sample was doubly stale: `initializeMetrics` is **not exported** (`runWithMetrics` replaced it), and `apps/web/src/lib/analyzer.ts` is a 25-line re-export shim with no `runAnalysis()` — there is no `runAnalysis` symbol anywhere in `apps/web/src`.

**Residual gap** (much smaller, and tracked elsewhere): there is no admin UI rendering the persisted `pipelineTelemetry` / `qualityHealth.d5` aggregates — backlog `TELEM-UI`. Two subcounts are deliberately not derivable post-analysis and need a Stage-4 change — backlog `TELEM-D5PIPE`.

---

## High Priority

### 3. Quality Gate Decisions Not Displayed in UI

**Status**: ✅ RESOLVED (February 5, 2026)
**Severity**: HIGH (UX)

**Description**:
Quality gates are applied (Gate 1 and Gate 4) and stats are tracked in result JSON, but per-item gate decisions with reasons are not shown in UI or reports.

**Resolution**:
Implemented `QualityGatesPanel` component (v2.10.2) that displays:
- Overall pass/fail status with visual indicators
- Summary stats: evidence items, sources, searches, counter-search status
- Gate 4 confidence distribution (HIGH/MEDIUM/LOW/INSUFFICIENT) with progress bars
- Gate 1 claim validation stats (passed/filtered/central kept)
- Collapsible panel for detailed view

**Files Created**:
- `apps/web/src/components/QualityGatesPanel.tsx`
- `apps/web/src/components/QualityGatesPanel.module.css`

**Files Modified**:
- `apps/web/src/app/jobs/[id]/page.tsx` (integration)

---

### 4. Input Neutrality Context Variance

**Status**: ✅ SUPERSEDED by ClaimAssessmentBoundary pipeline
**Severity**: RESOLVED (Historical)

**Description**:
Question vs statement phrasing could yield different context counts in the old Orchestrated pipeline.

**Resolution**:
The ClaimAssessmentBoundary pipeline eliminates pre-detection of AnalysisContexts entirely. Boundaries emerge from evidence clustering (Stage 3), which is input-phrasing agnostic.

**How neutrality is checked now** (updated 2026-08-10 — the old "Phase 5h" plan no longer exists):
- Heuristic question→statement normalization was **removed** in favour of LLM-first handling, so input equivalence is a *measured* property, not an enforced transform.
- Two live lanes exist, both expensive and excluded from the safe suite: `npm run test:neutrality` (`test/unit/lib/input-neutrality.test.ts`, full analysis ×2 per pair) and the framing-symmetry calibration lanes `test:calibration:smoke` / `:canary` / `:gate` (`test/calibration/framing-symmetry.test.ts`), governed by [Calibration_Run_Policy.md](Calibration_Run_Policy.md).
- Because both lanes need paid runs, neutrality is currently **monitored rather than gated** — no fresh measurement can be taken while engineering is paused.

**Status**: Superseded as a defect; carried forward as a monitored quality property, not a queued fix.

---

### 5. `allowModelKnowledge` Toggle Has No Effect on the Pipeline

**Status**: ⚠️ CONFIRMED OPEN — and **worse** than the previous "PARTIAL IMPLEMENTATION" label  
**Severity**: MEDIUM (misleading control surface, not a correctness bug)  
**Verified**: 2026-08-10

**Description**:
The `pipeline.allowModelKnowledge` flag is not partially enforced — it is **inert**. Every read of it was traced on 2026-08-10:

| Read site | What it does |
|---|---|
| `apps/web/src/app/admin/config/page.tsx:1394` | renders an editable checkbox |
| `apps/web/src/lib/analyzer/config.ts:42,88,100` | copies the value into a returned config object |
| `apps/web/src/lib/analyzer/metrics-integration.ts:60` | records it as per-job provenance |
| `apps/web/src/lib/config-validation-warnings.ts:57` | warns if it is on while `deterministic` is off |
| `apps/web/src/lib/config-schemas.ts:330,1077` / `configs/pipeline.default.json:18` | schema + default (`false`) |

No prompt text, stage, or gate branches on it. The one place designed to consume it — `PromptContext.allowModelKnowledge` in `apps/web/src/lib/analyzer/prompts/prompt-builder.ts:26` — is unreachable: nothing in `apps/web/src` or `apps/web/test` imports `prompt-builder`.

The old entry's framing is also obsolete: it blamed the "Understanding phase" in `analyzer.ts`, and the CB pipeline has no Understanding phase.

**Impact**:
- An operator can toggle it in the Admin UI and believe they changed analysis behavior when nothing changed.
- It is recorded in per-job provenance, so job records imply a distinction the run did not honor.
- It does **not** mean verdicts are ungrounded: grounding is enforced separately by the Stage-4 verdict citation publication contract (`ca143468`, `ac3b33da`, `6b9c562f`) and provenance validation. That is why severity is MEDIUM, not HIGH.

**Solution** (pick one, do not leave it as-is):
1. Wire it — inject an evidence-only directive into the load-bearing prompt sections and cover it with prompt-contract tests; or
2. Remove it — drop the field, the Admin control, and the validation warning, and delete the dead `prompt-builder.ts`, recording the decision that grounding is contract-enforced rather than flag-enforced.

Option 2 is the cheaper honest option; either way `prompt-builder.ts` is dead code.

---

## Medium Priority

### 6. Budget Constraints Not Systematically Benchmarked

**Status**: ⚠️ OPEN — narrowed; two of the three defaults have since been retuned  
**Severity**: LOW-MEDIUM  
**Verified**: 2026-08-10

**Description**:
The three CB budget parameters are wired and UCM-backed — read in `research-orchestrator.ts:502-505` and `claimboundary-pipeline.ts:749`. Current defaults, corrected against `config-schemas.ts` and `configs/pipeline.default.json`:

| Parameter | Default | Note |
|---|---|---|
| `maxTotalIterations` | **10** | retuned down from 20 (v2.11.1) to cap deep research loops |
| `contradictionReservedIterations` | **1** | the old entry said 2; the schema fallback and both defaults files say 1 |
| `claimSufficiencyThreshold` | 3 | `research-orchestrator.ts:2028` allows a D5-aligned item-count override |

So "not validated" is too strong: the iteration ceiling was tuned on cost grounds, and Stage-2 sufficiency was validated over 8 runs when diversity-aware sufficiency was promoted to default-on (`DIV-1`, `83a47aad` / `23d8576c`). What is genuinely missing is a *systematic* sweep showing these values are near-optimal rather than merely workable.

**Blocker**: such a sweep needs repeated paid runs, so it is out of scope while engineering is paused (see Current_Status §Why development is paused). The old "Phase 5h" benchmark plan referenced here no longer exists.

**Files to Review**:
- `apps/web/src/lib/analyzer/research-orchestrator.ts` (research loop)
- `apps/web/src/lib/config-schemas.ts` (UCM defaults)

---

### 6b. Skipped Budget Tests (V-09)

**Status**: ✅ RESOLVED  
**Verified**: 2026-08-10

The 8 skipped tests no longer exist. `apps/web/test/unit/lib/analyzer/budgets.test.ts` contains **zero** `.skip` calls — the tests for the deleted `checkContextIterationBudget` / `recordIteration` functions were removed rather than left skipped, and the file documents the removal inline (`budgets.test.ts:13,222`). The functions themselves are gone from `budgets.ts:152,158`.

The safe suite now reports exactly **1** skipped test, and it is unrelated: `claimboundary-pipeline.test.ts:4515` — *"does not let preliminary evidence satisfy sufficiency before main research runs"*. The three `test.skip` calls in `test/integration/claimboundary-integration.test.ts` are not counted, because `vitest.config.ts` excludes that file from the safe suite (it makes real LLM calls; run via `npm run test:cb-integration`).

---

### 7. No Claim Caching

**Status**: ❌ NOT IMPLEMENTED (documented)  
**Severity**: MEDIUM (Performance/Cost)

**Description**:
Every analysis recomputes all claim verdicts from scratch. No caching of normalized claim verdicts for reuse across analyses.

**Impact**:
- Wasted API calls on duplicate claims
- Higher cost per analysis
- Slower analysis time

**Potential Savings**: 30-50% on analyses with repeat claims

**Solution**:
Implement claim-level caching architecture. Note (2026-08-10): the previously cited design docs `Docs/ARCHITECTURE/Claim_Caching_*.md` **do not exist** — no file matching `*Claim_Caching*` is present anywhere under `Docs/`. Treat this as an unstarted design, not a documented-but-unimplemented one.

**Alpha constraint**: distinct from claim caching, *result* caching is deliberately off during Alpha so per-run variance stays measurable. Do not fold the two together in a cost proposal.

---

### 8. No Normalized Database Schema

**Status**: ❌ NOT IMPLEMENTED  
**Severity**: MEDIUM (Architecture)

**Description**:
All analysis data stored as JSON blobs in Jobs table. No relational tables for claims, evidence, sources, or verdicts.

**Impact**:
- Cannot query claims across analyses
- Cannot track source reliability over time
- Cannot build claim networks or evidence graphs
- No historical analysis

**Solution**:
Create normalized schema with tables for:
- Claims (with claim_text, normalized_text)
- Evidence/Facts
- Sources (with historical track record)
- Verdicts
- Relationships (claim_dependencies, claim_evidence)

**Status**: Planned architectural improvement

---

### 9. Error Pattern Tracking — Per-Job Only, No Cross-Job Alerting

**Status**: 🟡 PARTIAL (was "NOT IMPLEMENTED")  
**Severity**: MEDIUM (Observability)  
**Verified**: 2026-08-10

**What now exists**:
- `FailureModeMetrics` (`metrics.ts:110-119`) counts refusal and degradation events with rates per 100 LLM calls, bucketed `byProvider`, `byStage` and `byTopic`.
- `recordSchemaCompliance()` and `buildFailureModeMetrics()` in `metrics-integration.ts` cover the schema-validation and LLM-error categories the old entry listed.
- Source fetch failures are typed warnings with human-readable error summaries, and were characterised in the 2026-06 census work (chronic, ~87% of jobs see at least one, 72% of those HTTP 403).
- `pipelineTelemetry` + `qualityHealth.d5` are aggregated across a window by `/api/fh/metrics/summary` and `/api/fh/metrics/quality-health`.

**What is still missing** — the actual gap:
- No alerting or trend detection: a regression is visible only if someone runs a census script or opens the aggregate endpoint. Backlog `OPS-MONITOR` is **deferred by decision (2026-08-10)** — manual checks when appropriate are the accepted control at roughly 1–2 production jobs/week, so this stays a documented limitation rather than queued work.
- No admin UI over the persisted aggregates. See backlog `TELEM-UI`.

---

## Low Priority

### 10. Claim Highlighter Is Dead Code

**Status**: 🟡 RECLASSIFIED — not a live UX bug; unreachable component  
**Severity**: LOW (cleanup)  
**Verified**: 2026-08-10

The old entry described reports highlighting the submitted URL string instead of extracted content. The component that would do that highlighting, `ClaimHighlighter({ originalText, claimVerdicts })` at `apps/web/src/app/jobs/[id]/page.tsx:3945`, has **zero call sites** — the only occurrence of the identifier in `apps/web/src` is its own declaration. So no user currently sees this behavior.

**Solution**: delete the component (and its `highlighter*` CSS module classes), or wire it deliberately and pass extracted article text rather than the raw input value. Do not "fix the highlighting" without first deciding whether the feature is wanted.

---

### 11. No General Cross-Provider LLM Failover

**Status**: 🟡 PARTIAL (was "NOT IMPLEMENTED")  
**Severity**: LOW (Resilience)  
**Verified**: 2026-08-10

**Fallbacks that do exist** — both narrow and purpose-specific:
- **Stage-1 Pass-2 soft-refusal recovery**: on a content-policy soft refusal, a fallback model is retried with a temperature boost, the same `assessPass2Quality` gate is applied to its output so weak results are not silently accepted, and a `structured_output_failure` warning with `degradedPath: true` is emitted (`claim-extraction-stage.ts:~3290-3345`).
- **Debate-role credential fallback**: `checkDebateProviderCredentials()` (`verdict-generation-stage.ts:965-986`) preflights each of the 5 debate roles and emits a `debate_provider_fallback` warning when a configured provider has no credentials; the role then falls back to the global provider at runtime (`verdict-generation-stage.ts:427`).

**What is still missing**: there is no generic "primary provider erroring/timing out → retry on a secondary provider" path. A provider outage still fails the analysis. Outage *handling* exists separately (network failures feed the circuit breaker, Stage-4 preflights connectivity, damaged jobs abort rather than fabricating fallback verdicts, network-only auto-resume) — see backlog `RESILIENCE-1` — but that is graceful failure, not failover.

---

### 12. Rich Report Mode — Closed, Not Planned

**Status**: ✅ CLOSED as not-planned  
**Verified**: 2026-08-10

`FH_REPORT_STYLE` is not read anywhere in the codebase; `reportStyle` is hardcoded to `"standard"` at `apps/web/src/lib/analyzer/config.ts:41`. The only surviving mention of the variable outside this file is an **archived** xWiki page (`Docs/xwiki-pages-ARCHIVE/…/Specification vs. Implementation Analysis 1.Jan.26`). So it was never a live documented feature with a missing implementation — it is a stale line in a superseded spec.

Reports today ship as Summary / JSON / Report views plus a self-contained dark-themed HTML export. Reopen only if a concrete reader need for a second report style appears.

---

## Security Concerns

**Note**: FactHarbor is deployed (`app.factharbor.ch`) as an **invite-gated alpha**, not a local POC. The severity pairs on each entry below reflect that: LOW at current exposure (a handful of known invited testers), higher before open signup. This whole section was re-verified against code on **2026-08-06** (`0d76f0ef`); the entries carry their own file/line evidence.

### S1. SSRF Protection

**Status**: ✅ IMPLEMENTED (`retrieval.ts` v1.3.0) — one residual gap  
**Severity**: LOW  
**Verified**: 2026-08-06 (audit re-check)

**Implemented**: private/RFC1918, loopback, link-local, cloud-metadata and IPv6-variant blocking; scheme enforcement; redirect validation; 30 MB streaming size cap.

**Residual gap**: the address check runs at connection time, so an adversarial host could in principle DNS-rebind between resolution and connect. Reachable only via the follow-up link-discovery path in `research-acquisition-stage.ts`, which re-checks each discovered URL. Low priority; fix would pin resolved addresses.

**Files**:
- `apps/web/src/lib/retrieval.ts`

---

### S2. Admin Endpoint Security — PARTIAL

**Status**: 🟡 PARTIAL  
**Severity**: LOW (invite-gated alpha), HIGH (before open signup)  
**Verified**: 2026-08-06 (audit re-check)

**Implemented**: API admin endpoints require `X-Admin-Key`, compared in fixed time (`apps/api/Helpers/AuthHelper.cs`); the web admin area is behind a login gate.

**Still open**: `/admin/source-reliability` is exempted from that gate (`apps/web/src/app/admin/layout.tsx:46`, `isPublicAdminRoute`), so source track-record data is readable without authentication. Read-only, no paid calls, no personal data — but inconsistent with the rest of the admin area.

**Solution**: remove the exemption, or move the page out of `/admin` if public exposure is intended.

---

### S3. Rate Limiting

**Status**: ✅ IMPLEMENTED  
**Severity**: LOW  
**Verified**: 2026-08-06 (audit re-check)

Fixed-window per-IP limiter in `apps/api/Program.cs`: 5 analyze requests/min and 120 read requests/min, with an admin-key bypass. No per-user quotas beyond invite-code job caps.

---

### S4. Invite-Code Brute Force — No Lockout

**Status**: ❌ NOT IMPLEMENTED  
**Severity**: LOW (current alpha), MEDIUM (before wider rollout)  
**Identified**: 2026-06-10 advisory audit; re-verified 2026-08-06

**Description**:
Submitting an invalid invite code returns a distinguishable `404 Invalid invite code` (`apps/api/Controllers/AnalyzeController.cs:45`) and no failed-attempt tracking exists, so codes can be probed. The per-IP rate limiter (S3) caps this at 5 attempts/min/IP, which makes guessing slow but not impossible from rotating IPs.

**Impact**: a guessed code permits real analysis jobs, each costing roughly $1 in LLM spend — cost amplification rather than data exposure.

**Decision (2026-08-10)**: **risk accepted; backlog item `SEC-INVITE` is DECLINED.** The gap stays documented here because it is real in code, but no lockout work is queued. Rationale: the impact is cost amplification rather than data exposure, the per-IP limiter (S3) caps probing at 5 attempts/min/IP, and the spend tail is bounded more cheaply provider-side — a low monthly limit plus a billing alert — than by building attempt-tracking. Reopen on evidence of actual probing, or before open (non-invite) signup.

**Solution if reopened**: track failed attempts per IP and stop responding distinguishably after a threshold; consider raising code entropy.

**Files to Modify**:
- `apps/api/Controllers/AnalyzeController.cs`
- `apps/api/Services/JobService.cs`

---

## Performance Opportunities

### P1. Parallel Verdict Generation — Module Removed

**Status**: ✅ CLOSED — the referenced implementation no longer exists  
**Verified**: 2026-08-10

`apps/web/src/lib/analyzer/parallel-verdicts.ts` is not present in the repository, and `generateClaimVerdictsParallel` has no definition or call site anywhere in `apps/web/src`. The old integration target, `apps/web/src/lib/analyzer.ts`, is a 25-line re-export shim. The "50-80% faster, ready to deploy" claim rested entirely on a file that is gone, so it cannot be counted as available headroom.

Parallelism that *does* exist is upstream of verdicts: `P1-B` preliminary-search parallelism across claims, queries and source fetches (`756dded0`), and `W15` same-domain fetch staggering (`5942eba5`).

**If verdict parallelism is wanted again**, it is a new design, not an integration task — and it must respect the sequential dependency of the 5-step debate (advocate → challenger → reconciliation → self-consistency → validation), which is why per-claim rather than per-step is the only obvious axis. Reopening the wider optimization track requires Captain approval plus a fresh baseline — backlog `OPT-GATE`.

---

### P2. Tiered LLM Routing (Enabled)

**Status**: ✅ ENABLED  
**Verified**: 2026-08-10

Per-task routing is active via `getModelForTask()`. The default task→tier mapping (`model-tiering.ts:141-148`) is: `understand` → budget, `extract_evidence` → budget, `context_refinement` → standard, `verdict` → **premium**, `supplemental` → standard, `summary` → standard.

The previous text was stale on the verdict lane. With the Anthropic defaults in `model-resolver.ts:37-39`, the tiers resolve to `claude-haiku-4-5-20251001` (budget), `claude-sonnet-4-6` (standard, $3/$15 per M), and `claude-opus-4-6` (premium, $5/$25 per M) — so verdicts run on the Opus-tier model, not "Sonnet-4 ($3/M)". The old "Integration: `analyzer.ts`" pointer was also wrong.

**Known routing residual**: salience commitment has no dedicated task type and rides the shared `understand` budget lane — backlog `PHASE7B-MODEL`.

---

## Summary Statistics

Recounted 2026-08-10 after the 2026-08-06 security rewrite and this pass. Counts are of *entries in this document*, so closed entries stay counted for traceability.

**Total tracked entries**: 19 — **9 closed**, **10 open**

| Section | Entries | Closed | Open |
|---|---|---|---|
| Critical Issues (#1, #2) | 2 | 2 | 0 |
| High Priority (#3, #4, #5) | 3 | 2 | 1 |
| Medium Priority (#6, #6b, #7, #8, #9) | 5 | 1 | 4 |
| Low Priority (#10, #11, #12) | 3 | 1 | 2 |
| Security (S1–S4) | 4 | 1 | 3 |
| Performance (P1, P2) | 2 | 2 | 0 |

**No open entry is CRITICAL or HIGH severity.** Both former Critical entries closed — #1 by review in v2.10.2, #2 because the claim was wrong. The remaining open items are MEDIUM (#5, #7, #8, #9), LOW-MEDIUM (#6), or LOW (#10, #11, S1 residual, S2, S4). Note that the section *headings* are historical placements, not current severities: #5 sits under "High Priority" but is MEDIUM, and S2/S4 rise above LOW only at wider exposure.

**Closed entries**:
- ✅ #1 v2.8 prompt optimization validation risk — resolved by review in v2.10.2
- ✅ #2 Metrics infrastructure — the entry was factually wrong; metrics are wired
- ✅ #3 Quality gate decisions in UI — `QualityGatesPanel` shipped
- ✅ #4 Input neutrality context variance — superseded by the CB pipeline
- ✅ #6b Skipped budget tests — tests deleted, suite reports 1 unrelated skip
- ✅ #12 Rich report mode — closed as not-planned; the env var is read nowhere
- ✅ S3 Rate limiting — implemented (per-IP fixed window)
- ✅ P1 Parallel verdict generation — closed; the module was removed
- ✅ P2 Tiered LLM routing — enabled

**Open entries by category** — "open" here means *the gap exists in code*, which is not the same as *work is queued*:
- Architecture / data model: #7 claim caching, #8 normalized schema
- Observability: #9 error-pattern trend/alerting (partial) — plus backlog `TELEM-UI`; alerting itself is deferred (`OPS-MONITOR`)
- Config / control surface: #5 inert `allowModelKnowledge` toggle
- Cost / tuning: #6 budget defaults never systematically swept (blocked while paused)
- Resilience: #11 no generic cross-provider failover (partial)
- UI cleanup: #10 dead `ClaimHighlighter`
- Security: S1 DNS-rebind residual, S2 one exempt admin route, S4 no invite-code lockout — **risk accepted** (`SEC-INVITE` declined 2026-08-10)

**Documented but deliberately not queued** (decisions, not oversights — do not re-raise without new evidence): S4 / `SEC-INVITE` (risk accepted, bounded by a provider spend cap instead), and the alerting half of #9 / `OPS-MONITOR` (deferred in favour of manual checks). Both rest on the same measured fact: production runs at roughly **1–2 jobs per week**.

**Not tracked here**: the two production-runtime verifications that gate any resumption of spend (`F2-PROD` prompt blob 1.0.12, Serper→P1 re-seed) live in [Backlog.md](Backlog.md), because they are deployment state rather than code defects.

---

## References

- [Current Status](Current_Status.md) — overall system status and why development is paused
- [Backlog](Backlog.md) — prioritized task list; canonical for open work
- [Analysis Quality Consolidated Execution Plan](../WIP/2026-06-18_Analysis_Quality_Consolidated_Execution_Plan.md) — the active engineering plan
- [Development History](../ARCHIVE/HISTORY.md) — full version history and investigations
- [Improvement Recommendations](../ARCHIVE/Improvement_Recommendations.md) — historical enhancement analysis (archived)

---

**Document Status**: Consolidated from investigation reports, bug fixes, and code analysis. Security section verified against code 2026-08-06; all other entries verified 2026-08-10.  
**Next Review**: on resumption of engineering, before the first paid validation run.
