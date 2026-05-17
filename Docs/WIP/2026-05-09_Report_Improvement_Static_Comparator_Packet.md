# Report Improvement Static Comparator Packet

Date: 2026-05-09
Role: Lead Developer + LLM Expert
Scope: Static report review packet, later amended with current-pipeline rerun outcomes.
Job budget status: 9 live jobs preserved at packet creation; 8 remained after `asylum-235000-de` canary `da3adba136d14edeb91512bdda8c00c3`; 5 remain after the later current-pipeline PT and asylum reruns recorded below.

## Purpose

This packet records the evidence needed before continuing the report-improvement plan. It compares the recent weak reports against the corrected Captain expectations, benchmark JSONs, report-quality rules, and best usable reports.

The next implementation step should not start from a generic "run more jobs" posture. It should start from the observed Stage 2 direction/applicability failure pattern below, then use one narrow, reviewable change.

2026-05-09 addendum: Captain later identified local Portuguese job `0a3c00180b124625b056f5abd5b194e6` as good except that `as sentencas proferidas foram justas` was missing downstream. Inspection showed this is a separate ACS selection lane, not Stage 1 decomposition: prepared Stage 1 contained all three claims, but claim selection dropped `AC_03` as `opinion_or_subjective` even though the cap allowed three claims. That lane is being handled by a narrow `CLAIM_SELECTION_RECOMMENDATION` prompt amendment; it does not replace the Stage 2 direction/applicability diagnosis below.

2026-05-09 current-pipeline rerun addendum: after the ACS and UCM repairs, draft-backed `bolsonaro-pt` job `1644fcf2e800417a948c46416d9eec48` passed the corrected band (`LEANING-TRUE` 63/58) and retained all three final atomic claims including `AC_03`. The fresh exact `asylum-235000-de` job `0ea1066324f141f2ad6a81c53cf9a3ca` failed hard (`MOSTLY-FALSE` 22/78). It had one support, two contradictions, and 13 neutral evidence items; the contradictions were stale/narrow SEM route values (2023 factsheet and 2024 `Total Personen aus dem Asylbereich (inkl. RU)` = 226,706), while the best local comparator `3ba25fe7c99f4b96822e37a6a65f6bb1` had 15 supports and surfaced the current 2025 route. This confirms the next lane should remain asylum current-snapshot / official aggregate route handling, not more PT ACS work.

## Authority Sources Loaded

- `Docs/AGENTS/Captain_Quality_Expectations.md`
- `Docs/AGENTS/benchmark-expectations.json`
- `Docs/AGENTS/report-quality-expectations.json`
- `.claude/skills/report-review/SKILL.md`
- `Docs/ARCHIVE/PipelineV1/2026-05-08_DirectionBasis_Regression_Fix_Proposal.md`

Relevant corrected expectations:

| Family | Expected labels | Truth band | Confidence band | Current note |
| --- | --- | ---: | ---: | --- |
| `bolsonaro-en` | `LEANING-TRUE`, `MOSTLY-TRUE` | 58-85 | 45-75 | `MIXED` and false-side outcomes are regressions. |
| `asylum-235000-de` | `LEANING-TRUE`, `MOSTLY-TRUE` | 58-75 | 40-70 | `MIXED` is not acceptable; near-certain `TRUE` is also overconfident. |

Comparator availability note: no `NO-COMPARATOR-AVAILABLE` applies for the in-scope families. Both `bolsonaro-en` and `asylum-235000-de` have exact local and deployed comparators.

## Reports Inspected

### Recent Weak Targets

| Job | System | Relation | Input family | Verdict | Commit / prompt | Assessment |
| --- | --- | --- | --- | --- | --- | --- |
| `af77168bd72e4b0db20cbd5aae483adf` | local | exact, recent main-lane failed target | `bolsonaro-en` | `MOSTLY-FALSE` 27/44 | `49ab262d` / `a9c5e0a9` | Clear regression. False-side and support-starved. |
| `fff7c275d39343eab2e34326ecfba70a` | local | exact, Option A failed target | `bolsonaro-en` | `LEANING-FALSE` 35/28 | `324efeb1` / `a9c5e0a9` | Clear regression. Same failure pattern, less extreme. |
| `96f328b2dc9c4afbbf6703ee82ade9c2` | local | exact, diagnostic failed target | `asylum-235000-de` | `TRUE` 95/82 | `a2c7b228` / `e8dfc678` | Direction correct, calibration too high. |
| `31cb1379ad7443b6b20bc2b3b7cd59df` | local | exact, recent current-stack failed target | `asylum-235000-de` | `TRUE` 88/75 | `1519f688` / `13cc0d2b` | Improved but still above corrected band. |

### Best Usable Comparators

| Job | System | Relation | Family | Verdict | Why useful |
| --- | --- | --- | --- | --- | --- |
| `91bf6083d26e407c98a474d89d2e618f` | local | exact, historical | `bolsonaro-en` | `LEANING-TRUE` 63/52 | Best exact local reference for the intended true-side shape. |
| `85812d61a3984fa6bb945d4096eaa039` | deployed | exact, historical | `bolsonaro-en` | `LEANING-TRUE` 68/62 | Best exact deployed reference; includes caveats without false-side collapse. |
| `3828f958352c40bf96b4f9e7451be80b` | local | variant, historical | `bolsonaro-pt` / verdict-shape comparator | `MOSTLY-TRUE` 72/75 | Strong fair-trial caveat handling with true-side top line. |
| `3f76f6eb069c4d329ca670bcd3c34506` | local | variant, historical | `bolsonaro-pt` / verdict-shape comparator | `MOSTLY-TRUE` 76/65 | Shows contradiction handling without collapsing verdict direction. |
| `eb02cd2e535a4556a2bc3c29868412a0` | deployed | variant, historical | `bolsonaro-pt` / verdict-shape comparator | `MOSTLY-TRUE` 73/70 | Deployed reference with substantial support and contradiction evidence. |
| `3ba25fe7c99f4b96822e37a6a65f6bb1` | local | exact, historical | `asylum-235000-de` | `LEANING-TRUE` 62/68 | Best local in-band calibration reference, though not perfectly clean internally. |
| `6a60b3eb0df540c0b16228d9367b1366` | deployed | exact, historical | `asylum-235000-de` | `MOSTLY-TRUE` 72/70 | Clean deployed calibration reference. |

## Four-Source Quality Check

The target reports were checked against the required four sources:

1. Captain expectations: both target families have corrected true-side-only expectations, with no `MIXED` acceptance.
2. Benchmark JSON: mechanical label, truth, confidence, boundary, and contamination bands match the Captain document.
3. Report-quality Q-codes: most relevant are `Q-BE1`, `Q-BE2`, `Q-BE3`, `Q-BE4`, `Q-HF4`, `Q-EV6`, `Q-V1`, `Q-V_REASON_CITATION`, `Q-V_LABEL_DIRECTION`, and regression checks.
4. Best comparator reports: exact comparators exist for both families and materially differ from the weak targets.

## Findings By Stage

### Claim Decomposition

Bolsonaro decomposition is not the current dominant failure. The recent weak reports and the best exact comparator all use three atomic claims:

- Brazilian-law compliance
- International fair-trial compliance for proceedings
- International fair-trial compliance for verdicts

That means the older two-claim/omitted-verdict concern is not sufficient to explain `af77168b` or `fff7c275`. It remains a guardrail, but not the primary current root cause.

Separate later finding: `0a3c00180b124625b056f5abd5b194e6` proves a distinct ACS selection failure can still omit the Portuguese sentence-justice/verdict-fairness claim after Stage 1 extracts it. Do not confuse that with the EN Stage 2 support-starvation lane.

Asylum decomposition is also structurally acceptable: the target and comparators use one atomic claim for the current Swiss asylum-area count.

### Source Acquisition And Yield

The weak Bolsonaro targets are not simply "no evidence found" cases. They have enough retrieved material, but the admitted directional evidence is badly skewed.

| Job | Support | Contradict | Neutral | Interpretation |
| --- | ---: | ---: | ---: | --- |
| `af77168b` | 0 | 22 | 32 | No supporting evidence survived into final evidence items. |
| `fff7c275` | 1 | 14 | 29 | Same pattern, less extreme. |
| `91bf6083` | 41 | 0 | 43 | Exact local comparator keeps procedural-support evidence. |
| `85812d61` | 18 | 12 | 40 | Exact deployed comparator balances supports and caveats. |

The query shape changed in a way that matters. The failed Bolsonaro runs increasingly targeted recusal, dual-role, defense-objection, and procedural-violation material. The best comparator also searched for safeguards and procedural compliance: tribunal jurisdiction, indictment acceptance, defense access, full decision text, appeal/safeguard posture, and fair-trial compliance.

Important constraint: do not repeat the simple breadth fix. Commit `090a25c` restored first-pass query breadth and was later reverted by `1ba5cb7b` after it helped Bolsonaro only marginally while regressing other families. The evidence does not support "just increase first-pass queries" as the next move.

The asylum targets do find the decisive current figure: 235,057 persons in the asylum area at end-2025. Their problem is not source discovery. Their problem is calibration and stale/current direction handling.

### Evidence Direction And Applicability

This is the strongest shared root-cause area.

For Bolsonaro, the weak reports classify concern, allegation, role-conflict, and recusal material as direct contradiction evidence against legal/fair-trial compliance. Current prompt text already says rule-governed standards claims need a direct bridge to the target procedure or outcome before such material is directional. The target reports do not reliably enforce that distinction.

The exact deployed comparator shows the desired behavior: it includes concern evidence as caveat material, but still retains supporting evidence for formal safeguards and lawful procedural steps. The variant comparators show the same shape: caveats affect confidence and subclaim strength, not the entire verdict direction.

For asylum, stale prior-year totals are sometimes carried as direct contradiction evidence even though the reasoning later discounts them as older endpoints. The cleaner deployed comparator keeps the current total decisive and calibrates to `MOSTLY-TRUE` 72/70 rather than near-certain `TRUE`.

### Citation Selection And Verdict Generation

For Bolsonaro, Stage 4 mostly follows the evidence direction it receives. In `af77168b`, the verdict stage sees zero supporting IDs for all three atomic claims and therefore produces a false-side result. The first cause is upstream direction/applicability, not final-label wording alone.

For asylum, the final reasoning recognizes the current total but still overstates certainty. The target reports treat a narrow threshold-overrun as near-certain rather than as a true-side but caveated current-count claim.

## Root-Cause Hypothesis

Primary hypothesis:

> The current pipeline has enough structural prompt rules, but Stage 2 applicability/direction is not reliably enforcing them. Direct concern, allegation, role-fact, or stale-comparator material can be admitted as direct contradiction evidence when it should usually be neutral caveat material unless it records an operative target-specific outcome. Stage 4 then treats Stage 2 direction as binding, so upstream direction errors become verdict-direction or calibration errors.

Evidence supporting this hypothesis:

- Bolsonaro weak reports have three atomic claims, so the failure is not primarily missing decomposition.
- Bolsonaro weak reports are support-starved despite enough retrieved material.
- Exact comparators include the same broad controversy domain but retain procedural-support evidence and true-side verdicts.
- Asylum weak reports find the decisive current number but still over-calibrate, so discovery is not the dominant issue.
- Current prompt text already contains the intended target-path/direct-bridge rule, which points to adherence, prompt load, or prompt placement rather than absence of policy.
- Prior first-pass breadth broadening was rejected by validation and should not be revived without new evidence.

Evidence limits:

- This is static analysis. No new live jobs were submitted.
- The local asylum comparator is in-band but has some internal direction inconsistencies, so the deployed comparator should carry more weight for asylum calibration.
- Randomness and model-version differences may contribute, but they do not explain the repeated support-starvation pattern by themselves.

## Proposed Next Step

Do not change code or prompts yet. First run a focused review of this packet, then implement one narrow change if the review agrees with the root cause.

Recommended change surface if approved:

1. Load `/debt-guard` before editing, because this is a failed-validation recovery path.
2. Keep the change LLM-mediated and topic-neutral. Do not add deterministic semantic rules, keywords, or family-specific logic.
3. Prefer a narrow Stage 2 applicability/direction contract change over Stage 4 label forcing:
   - Put a compact direction checklist adjacent to the applicability output schema.
   - Require an operative target-specific bridge before concern/allegation/role-conflict/stale-comparator material can be labeled directional.
   - Treat older endpoint values for current-count claims as context or calibration caveats unless they are the current decisive metric.
4. Add focused static tests or prompt-shape tests with abstract fixtures only. Do not use Captain benchmark wording as prompt examples.

If the review instead finds code mapping or prompt-loading evidence, fix that narrower mechanism first.

## Validation Sequence After A Fix

Before any live job:

- Commit the implementation.
- Restart/reseed the affected runtime state.
- Use only Captain-defined inputs.

Suggested live-job order:

1. `asylum-235000-de` exact input. Expected: true side, 58-75 truth, 40-70 confidence. Stop if it remains near-certain `TRUE`.
2. `bolsonaro-en` exact input. Expected: true side, 58-85 truth, 45-75 confidence, at least 3 boundaries, no final `state.gov` contamination.
3. `plastic-en` exact input as a regression control only if the first two pass.

Do not spend the remaining budget on repeated canaries before the first hypothesis has a concrete static fix.

## Sonnet Review Prompt

Use this prompt for a Sonnet Lead Architect + LLM Expert review before editing:

```text
As Lead Architect and LLM Expert, review Docs/WIP/2026-05-09_Report_Improvement_Static_Comparator_Packet.md, Docs/ARCHIVE/PipelineV1/2026-05-08_DirectionBasis_Regression_Fix_Proposal.md, and the referenced authority files.

Goal: decide whether the next report-improvement change should target Stage 2 applicability/direction, another narrower mechanism, or no change yet.

Constraints:
- Do not propose domain-specific hardcoding, keywords, or deterministic semantic logic.
- Do not revive broad first-pass query expansion unless you can explain why commit 090a25c and revert 1ba5cb7b no longer apply.
- Compare the weak target jobs against the corrected Captain expectations and the best exact/variant comparators.
- Separate decomposition, acquisition, applicability/direction, citation selection, and verdict calibration.
- If you disagree with the packet's primary hypothesis, identify the strongest contrary evidence and the smaller fix you would choose.

Deliver:
1. Findings ordered by severity.
2. Approval or rejection of the primary root-cause hypothesis.
3. The smallest next change surface, with residual risk.
4. A validation plan that spends no more than 3 live jobs before stop/go.
```
