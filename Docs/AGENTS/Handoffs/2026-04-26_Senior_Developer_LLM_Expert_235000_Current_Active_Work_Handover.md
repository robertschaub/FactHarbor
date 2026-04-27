---
roles: [Senior Developer, LLM Expert]
topics: [235000_comparison, unverified, evidence_direction, stage2_extraction, live_validation]
files_touched:
  - apps/web/prompts/claimboundary.prompt.md
  - apps/web/src/lib/analyzer/research-extraction-stage.ts
  - apps/web/test/unit/lib/analyzer/research-extraction-stage.test.ts
  - apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts
  - apps/web/debug-analyzer.log
  - Docs/AGENTS/Agent_Outputs.md
  - Docs/AGENTS/Handoffs/2026-04-26_Senior_Developer_LLM_Expert_235000_Current_Active_Work_Handover.md
---

# 2026-04-26 | Senior Developer / LLM Expert | Codex (GPT-5) | 235000 Current Active Work Handover

## Task

Capture the current active work, current open issues, and accumulated knowledge for the ongoing FactHarbor pipeline investigation around the Captain-approved input:

`235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.`

## Current Active Work

The active work is the remaining `UNVERIFIED` / report-quality regression for the `235000 Flüchtlinge...` comparison claim after the claim-scoped applicability-direction fix.

Current state:
- Runtime is on `main`.
- Recent relevant commits include:
  - `d26fa84a fix(research): keep applicability directions claim-scoped`
  - `671c9462 fix(research): preserve shared directional evidence mappings`
  - Later docs-only commits are on top; latest observed HEAD was `9e005d48`.
- Active ClaimBoundary prompt hash for the validation batch was `b55125bc1113d12d8b79ce34ca54bf50e33bb16bd2d31b5530d2a7691e3657b9`.
- Services were restarted and prompts reseeded before the latest six-job batch.
- The in-app browser was placed on the current job page / jobs page for monitoring, though screenshot capture timed out in the browser runtime.

Latest six-job validation batch for the exact input:

| Job | Status | Verdict | Truth / confidence | Notes |
|---|---:|---:|---:|---|
| `76c8a6f256f240c5890349c1532ee630` | SUCCEEDED | UNVERIFIED | 57 / 24 | AC_02 lost historical endpoint contradiction because endpoint evidence was neutral and dropped by citation guard. |
| `a689b3c3b0fe4569a971385ed3589adb` | SUCCEEDED | LEANING-FALSE | 36 / 55 | SEM evidence reached AC_02; citation/grounding warnings remain. |
| `ca92532fe0e240a284e6f6e30d191aa8` | SUCCEEDED | MOSTLY-FALSE | 22 / 72 | Better directional result; still had citation integrity normalizations. |
| `ca4ca0bb9e3941e19bd4b3df61fbb573` | SUCCEEDED | MIXED | 45 / 58 | AC_02 leaned false, but aggregate was mixed; SEM current-side mapping still inconsistent. |
| `bec1fd79cd224574b6f476cd74392ac0` | SUCCEEDED | LEANING-FALSE | 32 / 60 | Finished with progress `99`; grounding warnings remain. |
| `83683452fafc4c5c9412ebc87c030d06` | SUCCEEDED | UNVERIFIED | 50 / 0 | Report damaged because claim extraction did not preserve original truth conditions. |

## What Is Already Fixed Or Improved

The prior root cause was that Stage 2 applicability could identify that an evidence item was relevant to multiple claims, but it had only one flat `claimDirection`. This made current-side SEM evidence for a comparison claim either disappear from AC_02 or arrive as neutral.

Implemented fix in `d26fa84a`:
- `ApplicabilityAssessmentOutputSchema` now accepts `claimDirectionByClaimId`.
- `assessEvidenceApplicability()` can create claim-specific companion clones with claim-local direction.
- `APPLICABILITY_ASSESSMENT` prompt now asks for one direction entry per relevant claim ID.
- Focused tests were added/updated for schema parsing, directional companion clones, old neutral fallback behavior, and prompt contract checks.

Verification for that patch:
- `npm -w apps/web run test -- test/unit/lib/analyzer/research-extraction-stage.test.ts` passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer/verdict-prompt-contract.test.ts` passed.
- `npm -w apps/web run build` passed.
- Forced prompt reseed activated hash `b55125bc...`.

Observed improvement:
- In job `76c8a6f2...`, SEM 2025 evidence `Total Personen aus dem Asylbereich (inkl. RU) per Ende 2025: 235.057 Personen` reached AC_02 as `supports`.
- This proves the original current-side evidence mapping hole is at least partially repaired.

## Current Open Issues

### 1. Historical endpoint comparator evidence can be extracted as neutral

Primary current issue.

Evidence from job `76c8a6f2...`:
- AC_02 cited support: `EV_1777225264373`, the SEM 2025 `235.057 Personen` evidence.
- AC_02 had no contradicting evidence after guard normalization.
- Historical endpoint evidence appeared as:
  - `EV_1777225313038`
  - `EV_1777225361496`
  - `EV_1777225423684`
- All three stated essentially: `Bis zum Waffenstillstand am 8. Mai 1945 stieg die Zahl der Flüchtlinge auf 115'000...`
- All three were `claimDirection: neutral`, `relevantClaimIds: [AC_02]`.
- The citation guard then dropped them when the verdict tried to use them as contradiction.
- Final warning: `verdict_integrity_failure`, safe downgrade to `UNVERIFIED`.

Working diagnosis:
- The current `EXTRACT_EVIDENCE` prompt has generic numeric comparison direction rules, but the model still treats endpoint/stock comparator-side values as contextual when they are one-sided historical values.
- The prompt currently says one-sided values can be directional when relation is unambiguous. That was not strong enough for endpoint comparator values whose contradiction depends on the claim/profile's current-side value.
- This is not a code-schema problem. Stage 2 can represent `contradicts`; it is receiving `neutral` from the LLM.

Lowest-net-complexity likely fix:
- Amend `EXTRACT_EVIDENCE` direction guidance, not add deterministic code repair.
- Keep it topic-neutral: for numeric comparison claims, a source-native value for the referenced side is directional when it makes the claimed relation true or false under the claim/profile's stated route, even if the source reports only that referenced side.
- Preserve route/metric caveats in `evidenceScope`, but do not demote to `contextual` solely because the evidence is one side, endpoint-only, or has a metric-window caveat.

Focused tests to add/update:
- Prompt contract test proving `EXTRACT_EVIDENCE` contains the generic rule for referenced-side numeric values.
- Unit test around extraction prompt contract only; do not hardcode the German example in prompt text.
- If a mocked extraction test exists, add an abstract numeric-comparison fixture where a referenced-side endpoint value must be `contradicts`, not `contextual`.

### 2. Stage 1 / claim extraction can still damage truth conditions

Evidence:
- Job `83683452fafc4c5c9412ebc87c030d06` ended `UNVERIFIED` 50/0.
- AC_02 reasoning was the generic damaged-report message:
  `This claim was marked UNVERIFIED because the extraction process failed to preserve the original input's truth conditions. Analysis was terminated early to prevent misleading results.`
- Warning: `report_damaged`, severity `error`.

Working diagnosis:
- This is separate from Stage 2 evidence direction.
- The pipeline's claim-preservation / contract gate correctly blocked a damaged report, but the upstream Stage 1 extraction/repair path still sometimes fails for this input.
- It needs a Stage 1-focused inspection of the failed job's `understanding`, `contractValidationSummary`, and debug log. Do not mix this into the Stage 2 direction patch unless evidence shows the same prompt rule is causal.

Likely next step:
- Inspect `resultJson.understanding.atomicClaims`, `preFilterAtomicClaims`, `contractValidationSummary`, and Stage 1 log lines for `83683452...`.
- Classify whether this is a retry/provider variance issue or a prompt contract gap.

### 3. SEM current-side evidence mapping is improved but still inconsistent

Evidence:
- Some jobs map `235.057 Personen aus dem Asylbereich` to both AC_01 and AC_02.
- Some jobs keep current-side evidence only on AC_01 or mark shared/current-side evidence as neutral.
- Example:
  - `76c8a6f2...`: SEM 2025 evidence `EV_1777225264373` is `supports`, claims `[AC_02, AC_01]`.
  - `ca4ca0bb...`: SEM current-side evidence stayed on AC_01 only.
  - `bec1fd79...`: current-side 235k text appeared shared but neutral, not a robust AC_02 support item.

Working diagnosis:
- `d26fa84a` fixed the representation path but did not force the LLM to always add companion mappings.
- Applicability logs for early jobs showed `Claim mapping extensions: 0`, so sometimes the extraction phase itself emits shared mappings, and sometimes no later applicability rescue happens.
- This may improve after the `EXTRACT_EVIDENCE` direction guidance is tightened, because the extraction prompt also controls shared/comparison relevance.

Next step:
- After the endpoint-direction prompt amendment, rerun a small batch and inspect whether AC_02 consistently has both current-side SEM support and historical endpoint contradiction.

### 4. Verdict citation/grounding warnings persist

Evidence:
- Multiple successful jobs showed:
  - `verdict_direction_issue`
  - `verdict_grounding_issue`
  - `LLM adjudicated direct neutral citation(s)`
  - `citation integrity guard normalized invalid directional evidence citation(s)`
- In several cases, reasoning referenced evidence not present in directional arrays.

Working diagnosis:
- The guard is doing useful damage control.
- The remaining root is upstream evidence direction and citation eligibility, not necessarily the guard itself.
- Avoid adding more guard-side fallbacks until extraction direction is repaired and revalidated.

### 5. Verdict instability remains high

Same input produced:
- `UNVERIFIED`
- `LEANING-FALSE`
- `MOSTLY-FALSE`
- `MIXED`

Working diagnosis:
- Some natural variation is expected, but this spread is too high for a stable pipeline.
- Current spread is driven by:
  - whether AC_02 receives current-side SEM evidence,
  - whether historical endpoint evidence is directional,
  - whether the verdict guard drops neutral evidence,
  - whether Stage 1 preserves the comparison claim.

Next step:
- Stabilize Stage 2 direction first, then reassess variance. Do not tune aggregation before fixing evidence direction.

### 6. Terminal progress can finish at 99

Evidence:
- Job `bec1fd79cd224574b6f476cd74392ac0` is `SUCCEEDED` with progress `99`.

Working diagnosis:
- Operational/UI/API consistency issue, probably outside the LLM prompt root cause.
- Should be a separate small bugfix after the report-quality issue.

### 7. Stage progress / heartbeat visibility is weak

Evidence:
- Several jobs sat for multi-minute intervals at 60% or 70% before advancing.
- Logs indicated the process was alive, so this was not proven as a stall.

Working diagnosis:
- Monitoring visibility is insufficient during long LLM/verdict steps.
- Not a blocking correctness bug, but it makes live supervision harder.

Next step:
- Add or improve stage heartbeat/progress events only after the report-quality bugfix, unless the Captain prioritizes operational monitoring.

### 8. Review/debate attempt was blocked

Evidence:
- A read-only explorer/reviewer was spawned for the residual failure, but it errored due usage limit:
  `You've hit your usage limit... try again at Apr 27th, 2026 12:24 AM.`

Next step:
- Do self-review now if continuing immediately, or rerun reviewer after usage resets.

## Decisions

- Keep `d26fa84a`; it is directionally correct and improved SEM evidence mapping.
- Do not revert the claim-scoped applicability direction work.
- Treat the first post-fix live failure as failed-attempt recovery with classification `keep-but-incomplete`.
- Next likely fix should amend existing prompt guidance in `EXTRACT_EVIDENCE`; avoid adding deterministic semantic repair logic in code.
- Do not broaden into aggregation/verdict scoring until extraction direction is fixed and revalidated.

## Warnings

- Do not use hardcoded German terms, dates, entities, numbers, or source names in prompt changes. Land only generic numeric-comparison guidance.
- Do not write deterministic semantic classification code to flip neutral endpoint evidence to contradiction; AGENTS.md requires LLM intelligence for semantic direction.
- Commit before new live jobs and reseed/restart as needed.
- Use Node, not inline PowerShell POST, for exact multilingual job submission.
- Current worktree has unrelated documentation/index changes. Do not stage them accidentally.
- Browser screenshot capture can time out even when navigation works; use the visible in-app browser plus API polling/log inspection.

## For Next Agent

1. Start with job `76c8a6f256f240c5890349c1532ee630`.
2. Inspect AC_02 evidence directions:
   - SEM current evidence is now present and supports AC_02.
   - Historical endpoint evidence `115'000 at 8 May 1945` is neutral and gets dropped.
3. Apply `/debt-guard` before editing.
4. Amend `## EXTRACT_EVIDENCE` in `apps/web/prompts/claimboundary.prompt.md` with topic-neutral numeric-comparison direction guidance for referenced-side values.
5. Add focused prompt-contract tests, and preferably a mocked extraction-direction test if the existing test harness supports it cleanly.
6. Run targeted tests and build.
7. Commit.
8. Force reseed prompt if needed, restart services if needed, then submit a small live validation batch with the exact Captain-approved input.
9. Success criteria:
   - No `UNVERIFIED` from AC_02 citation-integrity downgrade.
   - AC_02 has current-side SEM support and historical endpoint contradiction when both are found.
   - Historical endpoint values are not neutral solely because they report only the referenced side.
   - No new report-damaged Stage 1 failures in the small batch.

## Learnings

- Claim-scoped direction in applicability is necessary but not sufficient. Extraction itself must assign directional comparator-side evidence correctly, otherwise the guard will still drop neutral citations.
- A successful evidence-repair mechanism can be hidden by live variance; always inspect the evidence arrays and guard warnings, not only final verdict labels.
- `UNVERIFIED` can now mean either a damaged Stage 1 claim or a Stage 4 integrity downgrade; separate those before patching.

## DEBT-GUARD RESULT

Classification: `incomplete-existing-mechanism` plus failed-attempt recovery classified as `keep`.
Chosen option: amend existing prompt contract next; no new code path selected yet in this handover.
Rejected path and why: do not add deterministic semantic post-processing because evidence direction is an analytical LLM decision under AGENTS.md; do not revert `d26fa84a` because it demonstrably improved SEM current-side AC_02 mapping.
What was removed/simplified: none in this handover.
What was added: documentation only.
Net mechanism count: unchanged.
Budget reconciliation: document-only transfer; no production mechanism changed.
Verification: live batch inspected through API/logs; no new code verification run for this handover.
Debt accepted and removal trigger: none accepted by this handover. Existing unresolved debt remains open until Stage 2 direction and Stage 1 damaged-report failures are fixed and live-validated.
Residual debt: extraction direction instability, Stage 1 truth-condition damage, citation/grounding warnings, progress `99`, weak heartbeat visibility.
