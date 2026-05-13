# Pipeline Rebuild Phase 1 Context Summary

**Date:** 2026-05-12  
**Status:** Phase 1 complete enough to start Phase 2 inventory/reverse-engineering  
**Worktree:** `C:\DEV\FactHarbor-pipeline-rebuild-spec`  
**Branch:** `codex/pipeline-rebuild-spec`

---

## 1. Phase 0 Decision State

Captain delegated normal decision gates to the Captain Deputy team. The deputy team approved Phase 0 with notes, and those notes were folded into `Docs/WIP/2026-05-12_Pipeline_Rebuild_Specification_Plan.md`.

Phase 1 is authorized. No analyzer source, prompt, config, UI, validation, benchmark, or live-job work has started.

Escalate to Captain only if a decision is high-risk, deputy consensus fails, or the decision would materially change product behavior, UI/API/report compatibility, persisted data behavior, validation spend, production/secrets/security posture, or Captain Intent.

## 2. Governing Constraints

The rebuild must preserve these constraints:

- Replacement with clean architecture, not additive refactoring.
- Reverse-engineer the current pipeline before target design.
- No implementation until the specification gates approve it.
- UI/API/report JSON/persisted report compatibility locked by default.
- Current hot path remains runnable until a verified V2 path replaces it.
- Understand -> Research -> Boundary formation -> Verdict -> Aggregation/report must remain analytically present; stage boundaries may change but no analytical stage may be skipped.
- Gate 1 claim validation and Gate 4 confidence are mandatory and must be reverse-engineered as contracts.
- Semantic text decisions must use LLM intelligence, not regex, keywords, similarity, or hardcoded meaning rules.
- Analysis-affecting strings belong in UCM-managed prompts or provider-facing search strings.
- Behavior must be generic by topic and robust beyond English.
- Use only Captain-defined canonical inputs for validation planning; do not invent, translate, or paraphrase test inputs.
- No expensive tests or live jobs during specification unless Captain explicitly approves them.

## 3. Quality Baseline

Quality work must use:

- `Docs/AGENTS/Captain_Quality_Expectations.md` for Captain intent and best comparator reports.
- `Docs/AGENTS/benchmark-expectations.json` for mechanical verdict/truth/confidence bands, latest verified jobs, and the `8pp` noise tolerance.
- `Docs/AGENTS/report-quality-expectations.json` for Q-code checks.

Current benchmark family posture:

- Good comparator/expectation set exists for all 8 approved families.
- Watch lanes remain: `asylum-235000-de`, `asylum-wwii-de`, and `bolsonaro-en`.
- No formal release blocker is declared in the quality expectation file.
- Current accepted reports should not be treated as broad closure where the expectation file says watch debt remains.

Generic quality rules that matter for the rebuild:

- No report-specific or benchmark-specific hacks.
- Every verdict must cite real supporting or contradicting evidence.
- Web search remains required; model knowledge alone is not enough.
- Baseless political/opinion contestation must not move truth or confidence.
- Caveats in true-side families belong in confidence/reasoning unless evidence-backed contradiction defeats the claim.
- Warning severity reflects verdict impact, not internal noise.
- Report quality includes verdict accuracy, explanation quality, evidence completeness, cross-lingual robustness, and stability.

Q-code categories to preserve in the target verification plan:

- Hard-failure floor: runtime integrity, evidence citation minimum, confidence publication floor.
- Stage 1 claim quality: multi-event coverage, truth-condition preservation, opinion-contestation immunity.
- Evidence quality: source diversity, per-claim research completeness, probative balance, language match.
- Verdict quality: direction alignment, truth-vs-misleadingness separation, evidence-backed contestation, citation coherence, label/truth band consistency.
- Stability: truth spread, confidence tier, claim set, evidence mix, cross-linguistic verdict stability, Stage 1 classification stability.
- Benchmark expectation, input integrity, warning severity, infrastructure, regression, and systemic tagging checks.

## 4. Current Status Risks

Current status and recent handoffs show the following active risks:

- Stage 1 latency remains material, especially for heavy URL/PDF/article inputs.
- Stage 1 broad-input quality remains open; validator/contract behavior has had repeated targeted repairs.
- Stage 2 evidence lifecycle and provenance invariants are active priority work.
- Evidence-pool variance remains open even after Stage 4 deterministic-mode fixes.
- Warning materiality and user-visible severity must remain governed through `warning-display.ts`.
- Runner heartbeat and stale-failure repair are recent operational fixes; runner/job lifecycle surfaces must be part of the baseline.
- Report-quality watch lanes should be compared against exact/family comparators, not judged in isolation.

## 5. Relevant Handoff Anchors

`2026-04-10_Lead_Architect_Senior_Developer_Current_State_Report_Quality_Investigation.md`

- Highest-priority historical finding: Stage 1 final-claim contract enforcement.
- The system could detect a broken final claim contract and still ship a normal high-confidence report.
- Matrix/report surface mixed incompatible semantic levels.
- Same-input variance and complexity accretion were already quality problems.

`2026-04-10_Report_Quality_Multi_Agent_Review_Board.md`

- Do not treat report quality as a one-case Swiss-family issue.
- Stage 1 safeguard alone is not enough; proof gates and broad stabilization matter.
- Matrix honesty is user-trust relevant.
- Reduction/deletion remain required; do not keep adding defenses indefinitely.

`2026-04-15_Lead_Architect_LLM_Expert_Prompt_Diagnosis_Skill_Review.md`

- Runtime prompt provenance is DB/UCM-first; `promptContentHash` and loaded prompt blobs matter more than repo commit alone.
- Prompt diagnosis must inspect loaded prompt sections, not whole prompt files by assumption.
- Confidence values are stored on a `0..100` scale in reports.

## 6. Phase 2 Entry Rules

Phase 2 reverse-engineering should start from implementation, not xWiki design intent. Architecture xWiki pages are useful later, but every doc-derived claim must be labeled as intended design unless verified against source.

Required Phase 2 outputs include:

- Full source inventory with explicit exclusions.
- Current stage sequence and orchestration.
- Gate 1 and Gate 4 contracts.
- Hot-path mechanism registry.
- Prompt/config/model/structured-output baseline.
- Multilingual and input-neutrality mechanism inventory.
- Evidence lifecycle and provenance map.
- UCM/config migration surface.
- Public and persisted output contracts.
- Warning/event/report-integrity compatibility surface.
- Test coverage map and test gaps.
- Current cost/latency profile where available.

## 7. Open Watch Items For Phase 2 Review

- Confirm ACS/claim-selection surfaces were inventoried even if later redesigned or conditionally retained.
- Confirm every active analyzer file is classified, not only the obvious stage files.
- Confirm prompt sections are mapped using the large-file exception and not summarized from memory.
- Confirm structured-output schemas and normalization/default behavior are captured for every LLM task.
- Confirm warning replacement equivalence has both semantic review and rendering/JSON compatibility review.
- Confirm test gaps for risk-bearing mechanisms are carried into Phase 3 as architecture risks.

