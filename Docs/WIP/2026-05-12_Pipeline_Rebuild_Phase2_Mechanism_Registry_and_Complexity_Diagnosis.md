# Pipeline Rebuild Phase 2 - Mechanism Registry and Complexity Diagnosis

**Date:** 2026-05-12  
**Worktree:** `C:\DEV\FactHarbor-pipeline-rebuild-spec`  
**Branch:** `codex/pipeline-rebuild-spec`  
**Status:** Phase 2 synthesis complete; implementation not started  
**Owner role:** Lead Architect  

---

## 1. Purpose

This document consolidates the Phase 2 reverse-engineering baselines into a mechanism registry and complexity diagnosis for the ClaimAssessmentBoundary pipeline rebuild.

It is still a specification input, not an implementation plan. It decides which current mechanisms are:

- essential invariants to preserve;
- purposes to preserve with a simpler implementation;
- duplicate or stale mechanisms to consolidate, quarantine, or retire only after approval;
- semantic hotspots that must not be copied into V2 as deterministic text logic.

The cleaned target specification must build from this document and the Phase 2 baselines before any pipeline rebuild implementation begins.

---

## 2. Inputs

Primary Phase 2 baseline documents:

- `Docs/WIP/2026-05-12_Pipeline_Rebuild_Phase1_Context_Summary.md`
- `Docs/WIP/2026-05-12_Pipeline_Rebuild_Phase2_Source_Inventory.md`
- `Docs/WIP/2026-05-12_Pipeline_Rebuild_Phase2_Stage1_Baseline.md`
- `Docs/WIP/2026-05-12_Pipeline_Rebuild_Phase2_Stage2_Baseline.md`
- `Docs/WIP/2026-05-12_Pipeline_Rebuild_Phase2_Stage3_Baseline.md`
- `Docs/WIP/2026-05-12_Pipeline_Rebuild_Phase2_Stage4_Baseline.md`
- `Docs/WIP/2026-05-12_Pipeline_Rebuild_Phase2_Stage5_Baseline.md`
- `Docs/WIP/2026-05-12_Pipeline_Rebuild_Phase2_Prompt_Config_Model_Baseline.md`
- `Docs/WIP/2026-05-12_Pipeline_Rebuild_Phase2_External_Compatibility_Baseline.md`

Deputy-team inputs:

- Poincare: mechanism registry synthesis.
- Kant: complexity diagnosis and architecture boundaries.
- Euler: missing constraints and external-contract review.

Governing instructions:

- Captain intent: replace the current pipeline with a cleaner, more maintainable architecture, starting from reverse-engineered specification, then cleaned target specification, then implementation.
- UI should not change unless clearly needed.
- Normal decision points are delegated to the deputy agent team. Escalate to Captain only for high risk or lack of deputy consensus.
- No implementation, prompt edit, config edit, UI change, validation spend, or live job belongs in this phase.

---

## 3. Baseline Conclusion

The current pipeline is complicated for two different reasons.

**Essential complexity:** the product performs evidence-grounded fact analysis. It needs the Understand -> Research -> Boundary formation -> Verdict -> Aggregation/report contract; Gate 1 and Gate 4; source and evidence transparency; ClaimAssessmentBoundary semantics; warnings tied to verdict impact; ACS prepared-stage compatibility; and versioned output contracts.

**Accidental complexity:** responsibilities drift across stages, public contracts are duplicated in adapters, confidence and warning logic have multiple authorities, prompt/config/model governance has stale or weakly wired surfaces, and several semantic decisions are still made by deterministic text checks.

The target architecture should therefore be less complicated by reducing ownership drift and duplicate contracts, not by removing analytical safeguards.

Deputy consensus: proceed to the cleaned target specification without Captain escalation. There was no deputy disagreement on the main direction. The target spec must carry the guardrails in this document as approval conditions.

---

## 4. Target Boundary Map

The current pipeline mixes orchestration, analytical judgment, provider resilience, report construction, compatibility adaptation, and observability inside overlapping modules. V2 should separate owners as follows.

| Target owner | Responsibility | Current pain it addresses |
|---|---|---|
| Pipeline application orchestrator | Stage sequencing, state handoff, fail/damage exits, typed events | Current high-level orchestrator also carries too much stage-specific behavior |
| Prompt/model/LLM gateway | Prompt-section loading, variable validation, model task routing, provider retry/fallback, call telemetry | Inline prompt text, stale frontmatter, mixed model routing, hardcoded temperatures |
| Config snapshot | One immutable per-run config view, sourced from UCM defaults/runtime config | Weakly wired knobs, duplicate JSON keys, config drift risk |
| Claim understanding and Gate 1 | Input contract, AtomicClaim extraction, contract validation/repair, selected-claim handling | Stage 1 mixes understanding with preliminary research and scattered repairs |
| Evidence lifecycle | Query planning, source acquisition, relevance, extraction, applicability, provenance, research policies | Research loop owns retrieval, sufficiency, refinement, and warning fragments |
| Boundary formation | EvidenceScope normalization/equivalence, ClaimAssessmentBoundary construction, assignment, coverage matrix | Exact fingerprints and Jaccard-like logic stand in for semantic equivalence |
| Sufficiency gate | D5/evidence sufficiency decision and evidence-scarcity warnings | Sufficiency is cross-cutting but not cleanly owned |
| Verdict adjudication and Gate 4 | Debate roles, citation integrity, grounding/direction repair, confidence tiering, safe downgrade | Stage 4 mixes debate, parsing, provider resilience, SR calibration, and confidence policy |
| Aggregation and report contract | Aggregation math, article adjudication, narrative generation, versioned result JSON | Stage 5 is both aggregation and product-output adapter |
| Warning/event policy | Single user-facing materiality classification for all surfaces | UI, markdown, HTML, metrics, and API currently diverge |
| External compatibility adapters | API list/detail, job UI, markdown, static HTML, validation, calibration, metrics, historical reports | Consumers independently derive verdicts, warnings, and old shapes |
| Observability ledger | Stage timings, source acquisition trace, repair events, warnings, compatibility decisions | Diagnostics are partly console-only or surface-specific |

Design rule: internals may be simplified aggressively, but external compatibility must move behind explicit adapters instead of remaining scattered across API, UI, markdown, HTML export, metrics, validation scripts, and runner glue.

---

## 5. Essential Complexity To Preserve

These are not optional simplification targets.

| Invariant | Why it stays |
|---|---|
| Understand -> Research -> Verdict pipeline order | Required by repository integrity rules and product behavior |
| Gate 1 | Prevents claim drift before research drives the rest of the run |
| Gate 4 | Prevents low-integrity verdicts from being presented as reliable |
| Damaged-report exits | Better than producing invalid reports when core contracts fail |
| AtomicClaim and ClaimAssessmentBoundary terminology | Product and data model semantics depend on these names and meanings |
| EvidenceItem transparency | Verdicts must cite supporting/opposing evidence items |
| EvidenceScope and coverage matrix | Boundary formation and report traceability depend on per-source scope metadata |
| ACS prepared Stage 1 compatibility | Drafts, selected-claim IDs, and runner reuse are persisted workflow contracts |
| LLM ownership of semantic decisions | Required by AGENTS.md; deterministic text interpretation must not be copied forward |
| Multilingual/input-neutral behavior | Captain-defined inputs include multiple languages and phrasing styles |
| Verdict integrity rails | Citation integrity, baseless-challenge enforcement, direction repair, and safe downgrade protect report trust |
| Warning materiality policy | User-visible warnings must reflect verdict impact, not implementation anxiety |
| UCM prompt/config governance | Analysis-affecting prompts and tunables must be admin-governed |
| Versioned result JSON | API/UI/export/validation/report surfaces need one canonical output source |
| Comparator-based quality gates | Captain quality expectations require comparison against known best reports and Q-code expectations |

---

## 6. Accidental Complexity To Remove Or Consolidate

These are the main simplification targets for the target specification.

| Complexity source | Diagnosis | Target disposition |
|---|---|---|
| Stage ownership drift | Stages perform adjacent-stage work, especially Stage 1 preliminary research and Stage 4 calibration/confidence/provider handling | Reassign to explicit owners while preserving behavior |
| Multiple verdict authorities | Result JSON, API quick fields, job UI, static HTML, metrics, and scripts derive labels differently | One canonical verdict/truth/confidence source plus adapters |
| Multiple Gate 4/confidence schemes | Stage 4, Stage 5, and metrics use different threshold shapes | One confidence contract, versioned if needed |
| Warning duplication | `warning-display.ts` is closest to canonical, but markdown/API/HTML/metrics use other paths | One warning policy used by every user-facing surface |
| Prompt frontmatter drift | Section variables are incomplete; render warnings are not decisive enough | Prompt-section registry with variable contract tests |
| Orphan prompt sections | `CLAIM_GROUPING` appears likely unused | Quarantine until a real caller is proven |
| Inline model-facing text | Some analysis-affecting prompt text lives in code wrappers | Move to UCM-governed prompt sections when changing prompts is approved |
| Model-routing drift | `model-tiering.ts` appears legacy-adjacent beside active model resolver behavior | Quarantine or remove after consumer check |
| Weak or unwired config knobs | Examples include hardcoded temperatures, weak token-budget wiring, duplicate timeout defaults | Typed config ownership and dead-knob tests |
| SR duplication | Source reliability has both prefetch/legacy weighting and optional LLM calibration | Decide one productized source-trust path |
| Stale static export | Static HTML reads old fields and omits/derives key warnings | Thin tested adapter or approved retirement |
| Validation/calibration adapter drift | Scripts consume old aliases and old gate/result paths | Versioned adapters or approved migration |
| Deterministic semantic checks | Regex/substrings/token overlap/fingerprints influence analysis outcomes | Replace with LLM semantic decisions or restrict to structural plumbing |

---

## 7. Protective Mechanism Registry

Disposition legend:

- **Preserve:** keep as an invariant.
- **Redesign:** preserve purpose with simpler implementation.
- **Consolidate:** merge duplicate authorities.
- **Quarantine:** isolate until a real consumer or need is proven.
- **Approval required:** do not remove or break without deputy/Captain approval.

| Area | Mechanism or intent | Current issue | V2 disposition |
|---|---|---|---|
| Pipeline | Required stage order and no stage skipping | Essential product contract | Preserve |
| Pipeline | Damaged-report exits on hard contract failure | Must remain visible and reliable | Preserve |
| Stage 1 | Two-pass extraction with preliminary grounding | Valuable but entwined with research lifecycle | Redesign |
| Stage 1 | Claim contract validation and repair | Sole hard claim-fidelity authority | Preserve |
| Stage 1 | Gate 1 current-claim filtering | Currently not the whole fidelity story | Preserve, clarify authority |
| Stage 1 | Salience, atomicity, low-count reprompt, contract refresh | Overlapping repair/retry paths | Redesign into one claim-integrity policy |
| Stage 1 | ACS prepared snapshot reuse and selected-claim IDs | Persisted external workflow contract | Preserve; approval required for invalidation |
| Stage 2 | Preliminary evidence remap/seeding | Spread across Stage 1/2 handoff | Redesign as first-class evidence lifecycle state |
| Stage 2 | LLM query generation | Essential semantic task | Preserve under prompt/model gateway |
| Stage 2 | Search acquisition, retry, budgets, source trace | Essential structural plumbing | Preserve with clearer policy ownership |
| Stage 2 | LLM relevance, evidence extraction, applicability | Essential semantic tasks | Preserve |
| Stage 2 | Probative filtering and per-source caps | Quality intent is sound; implementation must avoid semantic hardcoding | Redesign |
| Stage 2 | Sufficiency, contradiction, refinement, supplementary English lanes | Quality protections, but currently loop-heavy | Redesign as explicit retrieval policies |
| Stage 2/4 | Source reliability prefetch and calibration | Duplicate adjustment paths | Consolidate |
| Stage 3 | LLM scope normalization and boundary clustering | Essential, but fallback/low-coherence handling is weak | Preserve with better observability |
| Stage 3 | `CB_GENERAL` fallback and orphan assignment | Robustness path | Preserve with structured warning/event policy |
| Stage 3 | Max-boundary cap and merge behavior | Avoids report explosion but may use brittle similarity | Redesign |
| Stage 3 | Coverage matrix and `claimBoundaryId` assignment | Downstream product/report contract | Preserve |
| Stage 4 | Provider preflight, parse recovery, credential fallback | Keeps runs robust | Preserve under LLM gateway/provider policy |
| Stage 4 | Advocate/challenger/reconciler debate roles | Protects against one-shot verdict failure | Preserve |
| Stage 4 | Citation integrity, grounding, direction repair, phantom citation stripping | Core verdict-integrity rails | Preserve |
| Stage 4 | Baseless challenge enforcement | Prevents opinion-only contestation from reducing truth/confidence | Preserve |
| Stage 4 | Self-consistency spread, safe downgrade, high-harm advisory | Quality protections | Redesign with one confidence policy |
| Stage 4 | Gate 4 confidence tiering | Mandatory gate; current thresholds duplicate elsewhere | Consolidate |
| Stage 5 | Weighted aggregation and `contradicts_thesis` inversion | Essential math over LLM outputs | Preserve, but one canonical owner |
| Stage 5 | Non-direct zero weighting, triangulation, derivative, anchor, probative factors | Quality weighting logic; some parts are candidates for LLM assessment | Redesign after semantic/structural classification |
| Stage 5 | Article adjudication | Useful LLM override/adjudication, but fallback visibility is weak | Redesign with explicit model task and telemetry |
| Stage 5 | Narrative generation and explanation quality checks | Report quality surface | Preserve, but keep separate from verdict authority |
| Stage 5 | Warning display registry | Closest current canonical warning policy | Consolidate as cross-surface authority |
| Stage 5/external | Versioned result JSON | Core contract for reports/API/UI/validation | Preserve and version |
| Prompt/config/model | UCM prompts, JSON defaults, model tasks | Good direction with drift and weak tests | Preserve, strengthen contracts |

---

## 8. Deterministic Semantic Hotspot Registry

These hotspots should not be blindly ported into V2. Each must be classified during target-spec design as either structural plumbing or semantic analysis. If semantic, the replacement must use LLM intelligence or an approved LLM-produced structured signal.

| Surface | Hotspot | Why it matters | Target disposition |
|---|---|---|---|
| Stage 1 | Substring-based salience/anchor checks | Text-preservation decisions can become language- and wording-dependent | Replace semantic use with LLM judgment; keep only structural ID checks |
| Stage 1 | `detectInputType` heuristic | Can affect analysis route based on brittle text shape | Reclassify as structural routing or move to LLM if semantic |
| Stage 1/2 | Source-type string/regex bucketing | Source reliability/classification is semantic | LLM/UCM-governed source classification or structural provider metadata only |
| Stage 2 | Token-overlap primary-source refinement | Can prefer/drop sources based on wording rather than meaning | Replace with LLM relevance/completeness assessment |
| Stage 2 | Hardcoded non-directional `directionBasis` values demoting LLM direction | Deterministic label list can override semantic evidence direction | Consolidate into LLM schema/policy |
| Stage 2 | Scope-quality vague-string checks | English wording checks can affect evidence admission | Replace with LLM scope quality signal |
| Stage 2 | Source reliability platform/TLD/digit/length heuristics | Reliability is partly semantic/institutional | Move to LLM-backed or curated UCM policy where analysis-affecting |
| Stage 3 | Exact `scopeFingerprint` equivalence | Drives grouping/assignment with brittle normalization | Use structural IDs where possible; LLM equivalence for semantic grouping |
| Stage 3 | Jaccard-like boundary merge behavior | Boundary semantics should not be decided by text overlap | Replace with LLM equivalence or explicit structural cap rule |
| Stage 5 | Structural narrative regex checks | Report quality may be judged from wording patterns | Replace semantic quality checks with LLM rubric or keep as non-blocking structural format check |
| Stage 5/export | Static HTML and markdown field fallbacks | Can silently change report meaning | Use canonical result adapter |
| Cross-cutting | `detectedLanguage` fallback to `en` and English-only fallback text | Violates multilingual robustness if user-facing/analysis-affecting | Preserve source language or clearly mark structural fallback |

---

## 9. Contract Duplication Registry

| Contract | Current duplicated surfaces | Target rule |
|---|---|---|
| Verdict/truth/confidence | Result JSON, API quick fields, job UI, static HTML, metrics, validation scripts | Canonical result writer owns; adapters read, do not reinterpret |
| Gate 4 confidence | Stage 4 thresholds, Stage 5 quality gates, metrics thresholds, comments/default drift | One typed confidence contract with tests |
| Warnings | `warning-display.ts`, markdown raw severity filtering, API primary issue, metrics, static HTML omission | One warning policy used by every user-facing surface |
| Result schema | `schemaVersion`, legacy aliases, validation and export assumptions | Versioned schema plus compatibility adapter matrix |
| ACS prepared state | Draft JSON, selected IDs, runner reuse, job metadata | Default consume/migrate; invalidation requires approval |
| Prompt sections | Frontmatter variables, active prompt sections, orphan sections, inline wrappers | Prompt registry with section/variable tests |
| Config defaults | JSON defaults, TypeScript schema, hardcoded call-site values | JSON and schema remain authoritative; no dead knobs |
| Model routing | Model resolver, legacy tiering, hardcoded temperatures | One model task registry plus per-task UCM controls |
| Source reliability | Stage 2 prefetch, Stage 4.5 calibration, legacy weights | One source-trust policy with explicit math impact |
| Validation/calibration | Benchmark scripts, report quality expectations, metrics readers | Versioned input/output adapters and comparator-aware gates |

---

## 10. External Contract Disposition Matrix

The target specification must classify every external consumer as `preserve`, `versioned adapter`, `approved migration`, or `retire with approval`. Default is preserve or versioned adapter.

| Surface | Default disposition | Notes |
|---|---|---|
| API job detail | Preserve through adapter | Must expose canonical result fields without independent verdict derivation |
| API job list/quick fields | Preserve through adapter | Quick fields should derive from canonical result writer |
| Runner/internal run-job route | Preserve | Job lifecycle and metadata must remain stable |
| ACS draft and prepared snapshot | Preserve/migrate | Invalidation requires deputy/Captain approval and explicit user/admin behavior |
| Job UI | Preserve UI behavior | UI should not change unless clearly needed |
| Markdown report | Preserve through adapter | Warning visibility must match warning policy |
| Static HTML export | Preserve through tested adapter, or retire only with approval | Currently stale enough to need explicit handling |
| Metrics/report-quality scripts | Versioned adapter | Do not read stale gate/result paths directly |
| Validation/calibration scripts | Versioned adapter | Must support V2 result schema before cutover |
| Historical reports | Preserve read compatibility unless migration is approved | Old `resultJson` and `reportMarkdown` remain persisted records |
| Warning display registry | Preserve as authority or replace with reviewed equivalent | Authority must apply across UI, markdown, HTML, API summaries, metrics |

---

## 11. Deputy Decisions For The Target Spec

These decisions have enough deputy consensus to carry forward as target-spec assumptions, subject to final target-spec review:

- V2 must not collapse Stage 4 into a single verdict prompt.
- V2 must not remove Stage 1 contract validation, Gate 1, Gate 4, ACS prepared-state compatibility, or ClaimAssessmentBoundary semantics.
- V2 should make canonical `result.verdict`, `truthPercentage`, confidence, warnings, and quality gates authoritative instead of letting adapters rederive them.
- V2 should default ACS V1 prepared snapshots to consume/migrate, not invalidate.
- V2 should make warning policy cross-surface, with recovered fallbacks silent/info and material degradation visible.
- V2 should treat static HTML, markdown, metrics, validation, and API summaries as product contracts until explicitly retired or migrated.
- V2 should translate V1-coupled tests into V2 contract tests before implementation/cutover.

---

## 12. Open Decisions For Target-Spec Review

These do not need Captain escalation now. They should go to the deputy team during target-spec review unless they become high risk or contested.

| Decision | Preferred default | Escalation trigger |
|---|---|---|
| V2 result schema version and compatibility lifetime | Versioned schema with read adapters | Breaking persisted reports or public API |
| ACS snapshot policy | Consume/migrate | Any invalidation or user-visible draft loss |
| Canonical verdict authority | Persisted canonical result wins | UI/API/report behavior changes |
| Stage 1 preliminary evidence placement | First-class evidence lifecycle handoff | Loss of ACS/reuse behavior |
| Applicability and D5 ownership | Separate evidence/sufficiency owner | Gate weakening or stage skipping |
| SR calibration role | One source-trust policy | Changing verdict math materially |
| Article adjudication default and model task | Keep explicit and observable | New cost/latency or changed report behavior |
| Prompt inline migration | Move only with explicit prompt approval and LLM Expert review | Any analysis-prompt edit |
| Validation budget | Contract tests first, live/expensive later | Any real-LLM spend |
| Static HTML export | Preserve through adapter unless retired | Retirement or user-facing format change |

---

## 13. Stop And Escalate Conditions

Stop and escalate to Captain if any of these occur:

- the deputy team cannot reach consensus;
- the target spec proposes breaking UI/API/result JSON/persisted-report compatibility;
- ACS prepared snapshots or selected-claim semantics would be invalidated;
- warning-severity policy would change materially;
- prompt edits are proposed without explicit approval and LLM Expert review;
- live jobs, expensive tests, or validation batches are needed;
- implementation begins before the cleaned target spec is approved;
- production, security, secrets, or real customer data are involved;
- a proposed simplification removes Gate 1, Gate 4, evidence transparency, ClaimAssessmentBoundary semantics, or citation integrity rails.

---

## 14. Target-Spec Requirements Derived From This Diagnosis

The cleaned target specification must include:

1. A versioned V2 result contract and external-consumer disposition matrix.
2. A clean architecture boundary diagram and module responsibility table.
3. A stage contract for each analytical owner, including inputs, outputs, failure modes, events, and quality gates.
4. A prompt/config/model governance section with section registry, variable validation, model-task ownership, timeouts, token budgets, temperatures, and dead-knob detection.
5. A deterministic-hotspot disposition table showing structural vs semantic decisions.
6. A warning policy contract reused by UI, markdown, HTML export, API summaries, validation, and metrics.
7. ACS compatibility rules for prepared snapshots, selected IDs, and draft/job lifecycle.
8. Contract-test translation requirements before implementation/cutover.
9. Comparator-based quality gates using Captain expectations and Q-code checks.
10. A runnable-system strategy that keeps the current hot path intact until V2 is approved.

---

## 15. Verification State

This was a read-only specification synthesis.

- No analyzer source files changed.
- No prompt files changed.
- No config files changed.
- No UI files changed.
- No tests were run for this document.
- No live jobs or validation batches were submitted.

`git diff --check` should be run after the tracking-doc updates that include this file.
