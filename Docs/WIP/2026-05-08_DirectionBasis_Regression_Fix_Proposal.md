# DirectionBasis Regression Fix — Debate-Consolidated Proposal

**Date:** 2026-05-08; updated 2026-05-09
**Status:** Active plan updated — corrected Captain expectations applied; Option A and the first post-fix canary did not close quality; static comparator packet produced; Portuguese AC_03 selection omission isolated as a separate ACS lane
**Bisection source:** GPT Agent (Codex), confirmed `a62e60b6` as first bad point
**Debate participants:** Lead Architect (Opus 4.7), LLM Expert (Sonnet 4.6), Code Reviewer (Sonnet 4.6), Devil's Advocate (Opus 4.7)

---

## 0. 2026-05-09 Plan Refresh — Expectations And Review Rules

This remains the active report-improvement WIP plan, but the May 8 execution sequence below is historical. Future agents must use the corrected Captain expectations from `Docs/AGENTS/Captain_Quality_Expectations.md` plus the mechanical bands in `Docs/AGENTS/benchmark-expectations.json`; older WIP rows that allowed `MIXED` for true-side families are superseded.

### Corrected Pass/Fail Bars For This Plan

| Family | Current bar to use in report-improvement work |
|---|---|
| `bolsonaro-en` | `LEANING-TRUE` / `MOSTLY-TRUE`, truth 58-85, confidence 45-75, minimum 3 boundaries. `MIXED` or false-side outputs are regressions unless target-specific evidence truly overturns the Captain expectation. |
| `bolsonaro-pt` | Same true-side bar as EN, with multilingual transfer expected. |
| `asylum-235000-de` | `LEANING-TRUE` / `MOSTLY-TRUE`, truth 58-75, confidence 40-70. `MIXED` is a regression; near-certain `TRUE` is also a calibration/source-direction issue. |
| `bundesrat-simple` | `TRUE` / `MOSTLY-TRUE`, truth 85-100, confidence 75-95. Use exact local comparators `a6b0e0fc14984926a678a462456bc110` and `a53573047fe64778a76e53cb578900c7`. |
| `plastic-en` | `MOSTLY-FALSE` / `FALSE` / `MIXED`, truth 10-35, confidence 55-80. Keep as a control for overcorrection. |
| `asylum-wwii-de` | No official band and no accepted best comparator yet. Do not use as pass/fail evidence until Captain defines the expected band. |

### Mandatory Report-Quality Comparison Rule

Any report-quality judgment or proposed fix must compare the target report against all four available baselines:

1. Captain intent and comparator notes in `Docs/AGENTS/Captain_Quality_Expectations.md`.
2. Mechanical bands and latest verified metadata in `Docs/AGENTS/benchmark-expectations.json`.
3. Q-code checks in `Docs/AGENTS/report-quality-expectations.json`.
4. Best usable comparator reports from the Captain file, labeled as exact/variant, local/deployed, and current-stack/historical.

If no best usable comparator exists for an in-scope family, write `NO-COMPARATOR-AVAILABLE` with the reason. Do not silently skip comparator review, and do not treat a comparator report as current validation unless it is explicitly exact current-stack validation.

### Current Plan Shape

The active lane is now comparator-first root-cause review, not another local guard or prompt patch. The first post-fix asylum canary and the later current-pipeline rerun both failed the corrected band, so the stop rule remains active. The Portuguese AC_03 omission is a separate ACS selection issue; the current draft-backed PT report now validates that lane end to end. Spend no further Stage 2 validation jobs until the asylum failed attempt is classified and the next hypothesis has a minimal change surface.

Required static packet before more jobs:

1. Compare current failing canonical reports (`af77168bd72e4b0db20cbd5aae483adf`, `fff7c275d39343eab2e34326ecfba70a`, and the latest `asylum-235000-de` canaries `96f328b2dc9c4afbbf6703ee82ade9c2` / `31cb1379ad7443b6b20bc2b3b7cd59df`) against their best comparators.
2. Separate source acquisition/yield, evidence direction/applicability, citation selection, and verdict calibration. Do not collapse these into a single "Stage 4" diagnosis.
3. Keep the diagnostic-only removal of active `directionBasis` locks as structurally simpler unless direct evidence implicates it; quarantine the live-quality claim, not the simplification itself.
4. Propose only one generic root-cause change at a time, with a verifier and stop rule attached.

---

## 1. Regression Summary

Commit `a62e60b6` ("fix(stage2): enforce claim-local direction basis") plus 10 follow-up commits introduced a `directionBasis` field and three enforcement locks that collectively neutralize evidence direction when the field is missing or classified as non-directional.

**Confirmed regression:**
- Asylum: MOSTLY-TRUE 74/61 → LEANING-FALSE 35/40 / UNVERIFIED 50/35
- Bolsonaro EN: degraded against the corrected true-side expectation; `MIXED` is not an acceptable target outcome
- Clean baseline at `2f7a2805` passes all three control cases

**Debug observation:** "Direction-basis normalizations: 0" — the normalizer at line 615 is not firing. The regression path is through the Zod default + overwrite block, not through explicit normalization.

---

## 2. Root Cause — Three-Lock Cascade

| Lock | Location | Mechanism | Effect |
|---|---|---|---|
| **Lock 1** | `research-extraction-stage.ts:615` | Self-consistency normalizer: `supports`/`contradicts` → `neutral` when basis ∉ DIRECTIONAL_BASES | Forces direction to neutral based on basis classification |
| **Lock 2** | `claimboundary.prompt.md:1730` | Stage 4 prompt: "non-directional basis values may only affect confidence/caveats" | Verdict LLM forbidden from using non-directional-basis evidence directionally |
| **Lock 3** | `verdict-stage.ts:2573` | `hasDirectionalAdjudicationBasis()` filter | Excludes non-directional-basis items from neutral→directional re-adjudication |

**Amplifying factors:**
- Zod schema defaults missing `directionBasis` to `"ambiguous_or_insufficient"` (non-directional), auto-triggering Lock 1
- Overwrite block (lines 722-765) replaces existing directional evidence with basis-gated assessment
- 13-value taxonomy is hard for LLM to classify accurately; LLM hedges toward non-directional bases as "safe" choices
- `buildNeutralClaimLocalItems` (lines 659-701) fragments evidence pool by splitting on basis differences

---

## 3. Debate Verdicts

| Panelist | Model | Verdict | Key Position |
|---|---|---|---|
| **Lead Architect** | Opus 4.7 | Support-with-concerns | Three locks compound rather than provide defense-in-depth; remove all. Clean up overwrite split predicate. |
| **LLM Expert** | Sonnet 4.6 | Support-with-concerns | 13-value taxonomy creates perverse self-consistency trap; soften Stage 4 binding rather than fully remove. |
| **Code Reviewer** | Sonnet 4.6 | Support-with-concerns | Lock 3's undefined-vs-non-directional asymmetry is a latent bug; fix is net correctness gain. Retain Stage 4 advisory guidance. |
| **Devil's Advocate** | Opus 4.7 | **Oppose** | Full removal re-opens concern contamination. Fix the Zod default + overwrite block only; keep Lock 1 as the operative gate. |

---

## 4. Points of Consensus

All four panelists agree on:

1. **The Zod default must change.** Defaulting missing `directionBasis` to `"ambiguous_or_insufficient"` (non-directional) silently neutralizes evidence the LLM never classified. Every panelist flagged this as a primary regression driver.

2. **The overwrite block must stop destroying existing directional evidence.** When an already-directional item gets its direction replaced by a neutralized assessment, legitimate evidence is lost.

3. **Lock 3's undefined-vs-non-directional asymmetry is a bug.** Pre-existing evidence (undefined basis) passes the filter; Stage 2-assessed evidence with non-directional basis is blocked. Same semantic class, opposite treatment.

4. **The overwrite block's basis-heterogeneity split predicate (`uniqueBases.size > 1`) should be removed.** If basis is not a behavioral control, splitting items by differing basis values creates unnecessary evidence pool fragmentation.

5. **`buildNeutralClaimLocalItems` should be simplified** to not split neutral items by basis variance.

6. **The 13-value taxonomy has diagnostic value** but should not drive behavioral decisions at runtime.

---

## 5. Point of Disagreement — Lock 1

The central contested point is whether **Lock 1 (the self-consistency normalizer)** should be removed or preserved.

### Remove Lock 1 (Lead Architect, LLM Expert, Code Reviewer)

- Lock 1 is the "first domino" — without it, Lock 2 and Lock 3 have nothing to enforce
- The LLM hedges toward non-directional bases as a self-consistency safety measure; removing enforcement removes the perverse incentive
- Pre-directionBasis, applicability gating (`direct`/`contextual`/`foreign_reaction`) was sufficient to prevent concern contamination
- "0 normalizations" proves the LLM is proactively avoiding directional bases rather than being corrected — removing the normalizer won't change LLM behavior, it will just stop the Zod default pathway from neutralizing

### Keep Lock 1 (Devil's Advocate)

- Lock 1 is the conceptually correct part of the design — it prevents concern/allegation material from counting as supports/contradicts
- "0 normalizations" is an artifact of the Zod default pre-empting Lock 1 — once the default is fixed, Lock 1 becomes operative
- Removing Lock 1 re-opens concern contamination with no replacement mechanism
- The clean baseline was never validated for concern-handling correctness

---

## 6. Reconciled Proposal — Two-Track Fix

Based on the debate, the reconciled approach is a **targeted two-point fix** (Devil's Advocate counter-proposal) with **selective Lock relaxation** (majority position):

### Track 1: Targeted code fixes (consensus)

| Change | File | What |
|---|---|---|
| **Fix Zod default** | `research-extraction-stage.ts:612` | Change `?? "ambiguous_or_insufficient"` to `?? undefined` at all sites (612, 671, 739, 802, ~825). Lock 1 skips `undefined` basis — only normalizes when LLM explicitly emits non-directional basis with directional claim. |
| **Fix overwrite block** | `research-extraction-stage.ts:753-765` | Guard: if existing `item.claimDirection` is `supports`/`contradicts` and the new assessed direction is `neutral`, preserve the original direction. Allow neutral→directional (real reassessment). Allow supports↔contradicts (explicit directional change). Block only directional→neutral from weak/non-authoritative basis. |
| **Remove basis from split predicate** | `research-extraction-stage.ts:731` | Change `uniqueDirections.size > 1 \|\| uniqueBases.size > 1` to `uniqueDirections.size > 1`. Stop splitting items by differing basis alone. |
| **Simplify neutral cloning** | `research-extraction-stage.ts:659-701` | `buildNeutralClaimLocalItems` should not split neutral items by basis variance. Always return one shared item when all directions are neutral. |
| **Fix Lock 3 asymmetry** | `verdict-stage.ts:2573` | Change `hasDirectionalAdjudicationBasis` to return `true` for all evidence (remove filter), OR at minimum make `undefined` and non-directional bases behave the same way. |

### Track 2: Lock 1 disposition (contested — Captain decides)

**Option A — Keep Lock 1 (Devil's Advocate position):**
Lock 1 stays at line 615 but now only fires when the LLM explicitly emits a non-directional basis with `supports`/`contradicts`. With the Zod default fixed to `undefined`, Lock 1 no longer fires on missing-basis items. This preserves the concern-filtering gate for explicitly classified items.

**Option B — Demote Lock 1 to logging-only (majority position):**
Lock 1 logs the inconsistency but does NOT override the direction. The LLM's `claimDirection` is always preserved. `directionBasis` becomes purely diagnostic.

**Recommendation:** Start with **Option A** (keep Lock 1, fix the Zod default). This is the smaller change and directly addresses the bisection-identified regression path. If live validation shows Lock 1 is still over-neutralizing (because the LLM legitimately misclassifies bases even when it does emit them), escalate to Option B.

### Track 3: Stage 4 prompt adjustment

| Change | File | What |
|---|---|---|
| **Soften Lock 2** | `claimboundary.prompt.md:1730` | Replace hard prohibition ("may only affect confidence, caveats") with advisory guidance: "Items with non-directional `directionBasis` values are typically low-probative for direction; prefer using them for confidence/limitations unless specific evidence warrants otherwise." |

This is the consensus position — all four panelists agree the hard prohibition should be softened but not removed entirely.

---

## 7. Expected Change Surface

| File | Changes |
|---|---|
| `apps/web/src/lib/analyzer/research-extraction-stage.ts` | Fix Zod defaults (5 sites), guard overwrite block, simplify split predicate, simplify `buildNeutralClaimLocalItems`, Option A or B for Lock 1 |
| `apps/web/src/lib/analyzer/verdict-stage.ts` | Fix `hasDirectionalAdjudicationBasis` (Lock 3) |
| `apps/web/prompts/claimboundary.prompt.md` | Soften Lock 2 prompt binding |
| `apps/web/test/unit/lib/analyzer/research-extraction-stage.test.ts` | Update normalization tests, add missing-basis preservation test |
| `apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts` | Update Stage 4 contract assertions |

**Net mechanisms:** Decreases (removes 1-3 enforcement locks, simplifies 2 splitting paths)
**New mechanisms:** None

---

## 8. Verification Sequence

**Superseded on 2026-05-09:** This sequence describes the original Option A validation path. Do not execute it as-is. Use Section 12 for the current validation gate and apply the corrected bands in Section 0.

1. `npm test` — safe suite must stay green (83 tests)
2. `npm -w apps/web run build` — TypeScript/build verification
3. Commit, restart, reseed
4. Asylum live job (user-authorized) — must recover toward MOSTLY-TRUE
5. Bolsonaro EN live job (only if Asylum recovers)
6. If both pass: request fresh 3-job control wave (Plastic, Asylum repeat, Bolsonaro PT/EN)

---

## 9. Residual Debt

- `directionBasis` remains in the schema/prompts as optional diagnostic metadata. If it proves diagnostically useless after 2 weeks of observation, consider removing the field and taxonomy entirely.
- The 13-value taxonomy may benefit from being trimmed back to fewer values if LLM classification accuracy is poor — but this is an optimization, not a regression fix.
- The "Direction Basis Contract" section in the prompt should be reduced to a compact reference block (one-sentence framing + value list) rather than multi-paragraph definitions.

---

## 10. Decision — Captain Deputy Approved (2026-05-08)

**Option A selected.** Captain Deputy (Lead Developer) approved with these precise behavioral rules:

### Overwrite Guard Predicate

| Existing Direction | New Assessment | Action |
|---|---|---|
| `supports`/`contradicts` | `neutral` | **Block** — preserve existing directional mapping |
| `neutral` | `supports`/`contradicts` | **Allow** — legitimate directional reassessment |
| `supports` | `contradicts` (or vice versa) | **Allow** — explicit directional change |
| any | any (basis-only difference) | **Ignore** — no split, no overwrite |

### Authority Rules

- **Missing/defaulted `directionBasis`:** No authority. Passes through Lock 1 unchanged. Does not trigger normalization, splitting, or overwriting.
- **Explicit LLM-emitted non-directional basis + directional claim:** Lock 1 fires (normalize to neutral). This is the only case where Lock 1 acts.
- **Stage 4 prompt:** Softened to advisory guidance. Does not weaken applicability binding.

### Stop Rule

If live validation (Asylum DE, then Bolsonaro EN) does not show recovery, stop and classify the attempt before touching anything else. No more piling on.

---

## 11. Execution and Validation Result — 2026-05-08 Evening

Option A was implemented on `main` in `324efeb1` (`fix(stage2): reduce direction basis authority`). Follow-up commits then tried narrow Stage 2/Stage 4 amendments:

| Commit | Decision after validation | Reason |
|---|---|---|
| `324efeb1` | Keep under review | It reduced some direction-basis authority, but did not restore stable quality by itself. |
| `f3e9c443`, `d61f7294`, `f7ca0208` | Keep under review | These Stage 2 scheduling/query amendments remain plausible structural fixes, but they did not recover the report-quality regressions. |
| `fbf47ea2` | Keep under review | It blocks non-directional neutral evidence from Stage 4 citation adjudication. It is narrow, but it also keeps direction-basis behavioral authority alive and should be reviewed in the simplification lane. |
| `48995373` | Reverted by `49ab262d` | It required targeted admitted evidence for sufficiency, but live validation regressed `asylum-235000-de` to `UNVERIFIED` and increased research pressure. |

Live validation after the implementation did **not** show reliable recovery:

| Commit | Job | Family | Result | Interpretation |
|---|---|---|---|---|
| `fbf47ea2` | `2f1bf6271cc641d599d2815d9e6b5092` | `bolsonaro-en` | `LEANING-FALSE` 37/32 | Stage 4 guard worked narrowly, but Stage 2 still supplied a badly skewed evidence pool. |
| `48995373` | `26679e42118e4a27a68b06c7aa2b8208` | `bolsonaro-en` | `UNVERIFIED` 46/40 | Targeted admitted coverage improved, but verdict quality did not. |
| `48995373` | `133bcd7c7e4140a5b4b89db0b60f0c6d` | `asylum-235000-de` | `UNVERIFIED` 50/24 | Unsafe regression. The run found `235,057 > 235,000` support-side SEM evidence but classified it as contradiction. |
| `49ab262d` | `fa0b0b48ed454c298de9c2c693caf662` | `asylum-235000-de` | `MOSTLY-FALSE` 25/72 | Post-revert current main can still fail this control due to source/direction variance. |
| `49ab262d` | `afb038bc91884639a57d5b737e5199ce` | `asylum-235000-de` | `MOSTLY-TRUE` 82/72 | Repeat showed the same control can pass, so the current substrate is high variance rather than deterministically fixed. |
| `49ab262d` | `af77168bd72e4b0db20cbd5aae483adf` | `bolsonaro-en` | `MOSTLY-FALSE` 27/44 | Stable fail: three AtomicClaims are now correct, but the evidence pool has zero support and many contradictions for fair-trial proceedings/verdict claims. |

### Classification

The Option A attempt is **not sufficient**. The stop rule has fired. Do not add another local guard or prompt patch on top of this chain without first simplifying or quarantining the direction-basis/report-quality substrate.

### Current Recommendation

Move to a simplification review lane:

1. Treat `2f7a2805` as the diagnostic quality baseline, not as an immediate wholesale rollback target.
2. Preserve later ACS/admission and Stage 1 atomicity work unless a dependency review proves they are implicated.
3. Review `directionBasis` as diagnostic-only metadata: remove or quarantine behavioral locks before adding any new evidence-direction logic.
4. Compare current `APPLICABILITY_ASSESSMENT`, `EXTRACT_EVIDENCE`, and `VERDICT_ADVOCATE` sections against `2f7a2805`, then propose a smaller prompt surface before any further live jobs.
5. Use the remaining live-job budget only after the simplification plan is reviewed and implemented.

## 12. Active Plan From 2026-05-09 Forward

### 12.1 State After Diagnostic-Only Simplification

The diagnostic-only `directionBasis` simplification reduced mechanism count and should stay in the keep-under-review bucket unless later evidence directly implicates it. Its live validation claim is quarantined:

| Commit / change | Evidence | Current classification |
|---|---|---|
| `a2c7b228` diagnostic-only `directionBasis` simplification | Tests/build passed, but `asylum-235000-de` canary `96f328b2dc9c4afbbf6703ee82ade9c2` returned `TRUE` 95/82, above the corrected calibrated true-side band. | Keep structural simplification; quality not validated. |
| `1519f688` Stage 4 citation-reasoning coherence check | Tests/build passed, but `31cb1379ad7443b6b20bc2b3b7cd59df` returned `TRUE` 88/75 and still retained a stale/current metric tension in citations. | Keep under review; does not close source-direction/calibration root cause. |
| Follow-up idea to let applicability neutralize existing directional evidence | Focused test failed and the proposal was backed out. | Quarantine/revert; do not revive without new evidence. |

### 12.2 Static Comparator Packet Execution Contract

Before proposing another fix, produce a static comparator packet with this minimum structure:

**Completed packet:** `Docs/WIP/2026-05-09_Report_Improvement_Static_Comparator_Packet.md`. Use it as the active static diagnosis and review input before any implementation or live-job spending.

- **Target report(s):** job IDs, benchmark slug, exact/variant status, local/deployed status, current-stack/historical status, and commit/prompt/config hash when available.
- **Comparators used:** job IDs plus exact/variant, local/deployed, and current-stack/historical labels. If none exist, write `NO-COMPARATOR-AVAILABLE` with the reason from `Captain_Quality_Expectations.md`.
- **Four-source quality check:** explicit comparison against `Captain_Quality_Expectations.md`, `benchmark-expectations.json`, `report-quality-expectations.json`, and the best usable comparator reports.
- **Stage-separated findings:** source acquisition/yield, evidence direction/applicability, citation selection/coherence, verdict calibration, and claim decomposition.
- **Root-cause hypothesis:** one generic hypothesis with evidence for/against and rejected alternatives.
- **Minimal change surface:** one generic, multilingual-safe, LLM-mediated proposal. It must not introduce deterministic semantic rules, domain keywords, benchmark-specific prompt terms, or report-specific search/query hacks. Tunable analysis behavior belongs in UCM.
- **Validation plan:** focused verifier, live-job order, expected family bands, and first-failure stop rule.

Target-specific comparator requirements:

| Target | Required comparison |
|---|---|
| `bolsonaro-en` current failures | Compare current canonical failures to exact comparators `91bf6083d26e407c98a474d89d2e618f` (local) and `85812d61a3984fa6bb945d4096eaa039` (deployed), plus variant exemplars `eb02cd2e535a4556a2bc3c29868412a0`, `3828f958352c40bf96b4f9e7451be80b`, and `3f76f6eb069c4d329ca670bcd3c34506` when reasoning shape matters. Track support/contradiction counts, final citations, and whether fairness caveats are represented without false-side collapse. |
| `asylum-235000-de` overconfident TRUE canaries | Compare to exact comparators `3ba25fe7c99f4b96822e37a6a65f6bb1` (local) and `6a60b3eb0df540c0b16228d9367b1366` (deployed). Track whether the report uses one clean current official SEM aggregate, whether stale prior-year totals are treated as caveats rather than contradictions, and whether truth/confidence stay calibrated. |
| `plastic-en` control | Compare to `32f00bb32d644a909f0c99521e800536` and deployed variant `800431527e254d2888ef56ba23af4688`. Use only as an overcorrection/control check; do not tune specifically to plastic. |
| `bundesrat-simple` high-true control | Compare to `a6b0e0fc14984926a678a462456bc110` and `a53573047fe64778a76e53cb578900c7` only if the candidate fix touches chronology/procedural-caveat behavior. |

### 12.3 Hypotheses Allowed Back Into Implementation

Only these generic hypothesis classes are currently justified:

1. LLM-mediated source/currentness and metric-direction handling: the analyzer must recognize current high-probative aggregate evidence for threshold claims through generic prompts/configuration, not hardcoded topic terms or deterministic semantic rescue.
2. Evidence-pool direction/applicability calibration: support-starved or contradiction-skewed pools must be diagnosed before verdict-stage fixes are blamed.
3. Citation/reasoning coherence: verdict reasoning must not cite items as contradictions while explaining that they do not contradict the claim.
4. Claim decomposition stability: Bolsonaro EN must preserve the 3-claim structure without relying on report-specific wording.

Rejected for now: broader first-pass query breadth, new deterministic semantic rules, report-specific prompt examples, and any change that reintroduces `directionBasis` as a behavioral veto.

### 12.4 Live-Job Budget And Stop Rule

Remaining budget from the latest Captain allocation: 5 jobs after the 2026-05-09 current-pipeline PT and asylum reruns in Section 12.7. Spend only after static comparator review and a minimal generic fix proposal are written.

Before any live job:

1. Commit the source/prompt/config change under test so the job can be mapped to a real revision.
2. Restart affected services and reseed affected prompts/config; record the active prompt/config hash where available.
3. Use only Captain-defined exact inputs from `AGENTS.md`.
4. Preserve the static comparator packet and expected family band in the job note or follow-up review.

Suggested first validation wave after an approved fix:

1. `asylum-235000-de` exact input, single job. Required: true-side within 58-75 truth / 40-70 confidence, with clean SEM aggregate handling.
2. `bolsonaro-en` exact input, single job only if the asylum canary does not regress. Required: true-side within 58-85 truth / 45-75 confidence, 3 boundaries, no final `state.gov` contamination.
3. `plastic-en` exact input, single job only if the first two pass their family bars. Required: no overcorrection into true-side.
4. `bolsonaro-pt` exact input only after EN passes, to test multilingual transfer.
5. `bundesrat-simple` only if the candidate fix touches chronology/caveat behavior.

Stop immediately after the first family-band failure. Classify the attempted fix as keep/quarantine/revert before proposing another edit.

### 12.5 First Minimal Fix Slice — 2026-05-09

Implemented a narrow prompt-only amendment from the static comparator packet:

- `APPLICABILITY_ASSESSMENT` now requires each claim-local directional entry (`supports` / `contradicts`) to use a directional `directionBasis` value and a concrete `directnessJustification`.
- Non-directional bases (`question_only`, `allegation_only`, `concern_only`, `procedural_fact_only`, `non_controlling_position_only`, `collateral_context`, `source_existence_only`, `ambiguous_or_insufficient`) now instruct the LLM to return `neutral` for that claim rather than pairing the non-directional basis with a directional label.
- A pre-output self-check now covers:
  - rule-governed standard claims: role facts, objections, criticism, concern, appearance-risk material, alleged coordination, adjacent controversies, and broader institutional context are not directional unless the item records the same target's safeguard/remedy action, operative outcome, or standards conclusion;
  - current-snapshot / endpoint / standing-stock / threshold claims: older endpoints, prior-period totals, alternate-window values, and alternate-category values are neutral context or calibration caveats unless they are the current/recent decisive route or the claim/profile explicitly accepts that route.

This amends the existing LLM-mediated applicability mechanism. It does **not** reintroduce a code-level `directionBasis` veto, deterministic semantic rules, family-specific terms, benchmark examples, or query-breadth expansion.

Verification passed:

- `npm -w apps/web test -- test/unit/lib/analyzer/verdict-prompt-contract.test.ts` — 107 tests passed.
- `npm -w apps/web test -- test/unit/lib/analyzer/research-extraction-stage.test.ts test/unit/lib/analyzer/verdict-stage.test.ts` — 256 tests passed.
- `npm test` — full safe suite passed.
- `git diff --check` — passed.

Live validation status: **failed first gate** after commit/reseed/restart.

- Commit under test: `cdfe3a6b1c4e970223ea1b08c4232075de1de0fe`.
- Active prompt hash after reseed: `8a1c83bde60b97fdafee0a96717533602ceffbcc115843378b83bac481d8d7fd`.
- First canary: `asylum-235000-de`, job `da3adba136d14edeb91512bdda8c00c3`.
- Result: `MOSTLY-TRUE` 85/72.
- Corrected band: true-side label yes, but truth must stay 58-75 and confidence 40-70. This is still over-calibrated.

Debt-guard classification: keep the static applicability-direction contract as a prompt-contract improvement, but quarantine the live-quality claim. Do not proceed to the planned Bolsonaro EN canary from this validation wave until a new root-cause decision is made.

Remaining live-job budget after this canary: 8.

### 12.6 Separate ACS Selection Lane — Portuguese Bolsonaro AC_03

Captain flagged local job `0a3c00180b124625b056f5abd5b194e6` as otherwise good but missing the atomic claim `as sentencas proferidas foram justas`.

Inspection:

- Input was the exact Captain-approved `bolsonaro-pt` wording.
- Job result: `MOSTLY-TRUE` 73/70, in band for `bolsonaro-pt`.
- Commit recorded by the job: `1519f6886ee3cb9c2891ac34d38960275feb25ab+df479f83`.
- `PreparedStage1Json` contained all three claims, including `AC_03`: `As sentenças proferidas no processo judicial contra Jair Bolsonaro por tentativa de golpe de Estado foram justas.`
- `ClaimSelectionJson` ranked `AC_03` third but selected only `AC_01` and `AC_02`. It labeled `AC_03` as `opinion_or_subjective`, low yield, and redundant with the compliance claims.

Root cause: not Stage 1 extraction. The existing LLM-mediated ACS recommendation prompt was too broad about `opinion_or_subjective` and allowed a standards-grounded verdict/outcome-fairness claim to be collapsed into process/legal compliance.

Patch prepared:

- Amend only `CLAIM_SELECTION_RECOMMENDATION`.
- Clarify that `opinion_or_subjective` means personal-preference/aesthetic/rhetorical/unsupported value judgment with no externally checkable standard.
- Add a standards-grounded evaluative-claim rule: evaluative/normative claims can still be `fact_check_worthy` or `unclear` when assessable against rules, safeguards, methods, institutional records, expert standards, or documented outcomes.
- Add an outcome-vs-process rule: do not collapse a resulting decision/outcome/fairness claim into a separate process/procedure/compliance claim unless it is truly duplicate wording.

Verification:

- `npm -w apps/web test -- test/unit/lib/analyzer/claim-selection-recommendation.test.ts` — 16 tests passed.
- `git diff --check` — passed.
- `npm -w apps/web test -- test/unit/lib/drain-runner-pause.integration.test.ts test/unit/lib/runner-concurrency-split.integration.test.ts` — 19 tests passed after the full safe suite exposed runner-test timeouts.
- `npm test` — attempted twice; both attempts failed only on runner integration test timeouts that passed in isolation. Treat as unrelated runner flakiness, not evidence against the ACS prompt patch.

Internal review/debate result: accept with caution. The patch amends the existing LLM selector and adds no deterministic semantic override. Main risk is over-promoting weak value judgments; mitigated by keeping the external-standards requirement and leaving `opinion_or_subjective` non-recommendable when no standard exists.

Validation result:

- Patch commit: `1b5a8045b2afdbf4b44a2278485228ff95bc320e`.
- Prompt hash used after reseed: `3a96816337ae045309f63143e3c26e78c9ad680f430be5fc467d778676e90bc0`.
- Direct `/v1/analyze` smoke job: `5d6d1dac0bea4b92ad0d0b27da084bc2`, `LEANING-TRUE` 64/50, with all three final claim verdicts including `AC_03` (`UNVERIFIED` 55/45). This confirms downstream can carry AC_03 but does **not** validate ACS selection because direct jobs have empty `PreparedStage1Json` / `ClaimSelectionJson`.
- UCM search repair became active after that direct job: active `search/default` hash `ed766a8ef9009032be5d30977a48e5b81a26fd1041be06710f31ebac4ade605f` with Serper priority 1 and Google CSE priority 2. Treat the direct job as ACS/final-claim smoke only, not source-mix or verdict-calibration proof under repaired UCM.
- Draft-only ACS check after repaired UCM: draft `58af6533aeb34604b996131fafb0b341`, `AWAITING_CLAIM_SELECTION`, 3 recommendations. `rankedClaimIds`, `recommendedClaimIds`, and `selectedClaimIds` are all `["AC_01", "AC_02", "AC_03"]`.
- Draft assessment for `AC_03`: `fact_check_worthy`, expected evidence yield `medium`, `coversDistinctRelevantDimension: true`; rationale treats it as outcome fairness / sentencing proportionality / evidentiary sufficiency rather than mere opinion.

Conclusion: ACS selection omission is fixed at the draft/recommendation layer. The final draft-backed report validation is recorded in Section 12.7. Remaining full-job budget after the current-pipeline PT and asylum reruns: 5.

### 12.7 Current-Pipeline Reruns After ACS And UCM Repair — 2026-05-09

Runtime preparation:

- Repo HEAD: `6cf74370a6a4dd19140f14208a85aff4e41b03e0`.
- Prompt/config reseed: prompts and UCM configs unchanged.
- Search config active in logs: Serper used as primary; Google CSE remains fallback-only and hit quota when fallback was attempted.
- Web runner restarted; jobs recorded current executed web commit.

Fresh reports:

| Family | Job | Path | Result | Band assessment | Structural notes |
|---|---|---|---|---|---|
| `bolsonaro-pt` | `1644fcf2e800417a948c46416d9eec48` | Confirmed draft `58af6533aeb34604b996131fafb0b341` with `AC_01`, `AC_02`, `AC_03` selected | `LEANING-TRUE` 63/58 | Passes corrected true-side band | Final report contains all 3 atomic claims and 3 claim verdicts, including `AC_03`: `As sentenças proferidas no processo judicial contra Jair Bolsonaro por tentativa de golpe de Estado foram justas.` It has 6 claim boundaries and 179 evidence items. Caveat: research time-budget warning and AC_03 is weaker (`55/52`) than process/legal-compliance subclaims. |
| `asylum-235000-de` | `0ea1066324f141f2ad6a81c53cf9a3ca` | Direct exact Captain input | `MOSTLY-FALSE` 22/78 | Fails corrected true-side band | One atomic claim, 5 boundaries, 16 evidence items. Evidence direction skew: 1 support, 2 contradiction, 13 neutral. The run treated stale/narrow SEM values as direct contradictions: 2023 factsheet count and 2024 `Total Personen aus dem Asylbereich (inkl. RU)` = 226,706. It found the NZZ `über 235 000 Geflüchtete` item only as medium support and did not surface the current official 2025 aggregate route that the best local comparator used. |

Comparator delta for asylum:

- Best local exact comparator `3ba25fe7c99f4b96822e37a6a65f6bb1` (`1514c632`) was `LEANING-TRUE` 62/68 with 36 evidence items and a much healthier direction mix: 15 support, 4 contradiction, 17 neutral.
- The fresh failed run has lower yield and lets stale or alternate-route official counts dominate direction. This is the same family of failure already tracked in the static comparator packet, but now under the repaired UCM and current HEAD.

Decision:

- Do not spend another live job on this lane now.
- Treat the PT ACS fix as validated end to end.
- Treat asylum as the active first-gate failure. Before editing, load `/debt-guard`, classify the current Stage 2/applicability/source-currentness attempt as keep/quarantine/revert at the mechanism level, and compare `0ea1066324f141f2ad6a81c53cf9a3ca` directly against `3ba25fe7c99f4b96822e37a6a65f6bb1` and deployed comparator `6a60b3eb0df540c0b16228d9367b1366`.
- Next hypothesis should focus on generic current-snapshot / endpoint / standing-stock threshold handling and official aggregate route selection. Do not add family-specific search text, deterministic semantic rescue, or another broad query expansion.

### 12.8 Debate Decision — How To Continue

Debate tier: standard Advocate / Challenger / Reconciler.

Proposition debated: continue by implementing one narrow, generic Stage 2/source-currentness fix for `asylum-235000-de` now, after `/debt-guard` classification, with no more live jobs until the fix is committed.

Verdict: **MODIFY**.

Decision:

- Continue toward one narrow generic fix, but do **not** edit yet.
- The next action is a no-edit localization pass after `/debt-guard` classification.
- Implementation starts only after the failed report and comparators identify the first trace-backed divergence where the current official aggregate route disappears or loses direction.

Rationale:

- The current asylum failure is real and materially below comparator behavior.
- Comparator reports prove the target behavior is possible and define the desired report shape.
- The current evidence does not yet locate whether the first failure is query generation, acquisition/provider ranking, fetch/extraction, applicability/direction mapping, evidence capping, citation selection, or aggregation.
- Editing before first-divergence localization risks another additive prompt patch, broad query expansion, or benchmark overfit.

Next concrete step:

1. Load `/debt-guard`.
2. Classify the current failed attempt and recent related changes as keep / quarantine / revert at the mechanism level.
3. Compare `0ea1066324f141f2ad6a81c53cf9a3ca` against `3ba25fe7c99f4b96822e37a6a65f6bb1` and `6a60b3eb0df540c0b16228d9367b1366` by trace layer:
   - Stage 1 expected evidence profile and primary metric route.
   - Stage 2 queries and provider/cache results.
   - Source acquisition and fetch success/failure.
   - Evidence extraction and source-currentness/yield.
   - Applicability/direction mapping.
   - Evidence filtering/capping and final citation arrays.
   - Verdict calibration.
4. Write one falsifiable generic hypothesis tied to the first divergence.
5. Implement only if that hypothesis supports a narrow, multilingual-safe, generic fix that does not touch the validated PT ACS lane.

Stop / re-debate if localization points outside Stage 2/source-currentness, requires broad query expansion, depends on family-specific terms, revives deterministic semantic rescue, touches `directionBasis` as a behavioral lock, or needs another live job before a committed fix.

### 12.9 No-Edit Localization Result And Candidate Fix — 2026-05-09

`/debt-guard` classification:

- PT ACS fix `1b5a8045`: **keep**. It was validated by draft-backed `bolsonaro-pt` job `1644fcf2e800417a948c46416d9eec48` and is outside the current asylum failure.
- Broad first-pass query breadth `090a25c1`: **rejected / keep reverted**. Prior validation showed only marginal Bolsonaro movement and regressions in Asylum and Plastic; do not revive this path.
- Stage 2 applicability-direction contract from `cdfe3a6b`: **keep as a static contract, quarantine its live-quality claim**. The latest asylum failure proves the contract was not sufficient in practice, but the rule itself remains correct.
- Current failed asylum job `0ea1066324f141f2ad6a81c53cf9a3ca`: **active first-gate failure**. Do not submit another live job until the candidate fix is committed and runtime state is refreshed.

Trace comparison:

- Failed current job `0ea1066324f141f2ad6a81c53cf9a3ca` generated only one main query and one refinement query before contradiction search. It did not fetch the current 2025 SEM annual-commentary route.
- Best local exact comparator `3ba25fe7c99f4b96822e37a6a65f6bb1` and deployed exact comparator `6a60b3eb0df540c0b16228d9367b1366` both fetched `stat-jahr-2025-kommentar` and cited the end-2025 total `235 057`.
- The deployed comparator is the cleaner direction model: the 2025 official total is support and the 2024 total is only one older counterpoint. The local comparator is in-band but internally imperfect because it still labels the 2025 threshold-satisfying total as contradiction while the reasoning uses it as support.
- The failed current run shows the operative bug clearly on evidence metadata: `EV_1778336433880` labels the end-2024 SEM total `226 706` as `direct_metric_value` contradiction even though `AC_01` has `freshnessRequirement = current_snapshot`; `EV_1778336358693` keeps a 2023 narrower route as contradiction without a direction-basis override.

First divergence:

The currentness contract exists in the prompt text but was not consistently available where direction was first assigned and then re-assessed. `EXTRACT_EVIDENCE` did not expose `freshnessRequirement` in its input block, and `assessEvidenceApplicability(...)` omitted `freshnessRequirement` from the claims JSON even though `APPLICABILITY_ASSESSMENT` contains the stale/current rule. This made the LLM infer currentness from prose/profile wording while another numeric-direction rule encouraged treating any below-threshold endpoint as contradiction.

Candidate fix implemented:

- `extractResearchEvidence(...)` now passes `freshnessRequirement` to the `EXTRACT_EVIDENCE` prompt and includes it for every claim in `allClaims`.
- `assessEvidenceApplicability(...)` now includes `freshnessRequirement` for every claim in the `APPLICABILITY_ASSESSMENT` claims payload.
- `EXTRACT_EVIDENCE` now displays `Current Date` and `Freshness Requirement` and mirrors the already-approved generic currentness rule: older endpoints, prior-period totals, and age-mismatched snapshots are contextual calibration evidence unless the claim/profile evaluates that older endpoint or the source states it remains the current decisive route.

This is a metadata-exposure and prompt-placement fix, not broad query expansion, provider tuning, domain-specific search text, deterministic semantic rescue, or a behavioral `directionBasis` lock.

Verification:

- `npm -w apps/web test -- test/unit/lib/analyzer/research-extraction-stage.test.ts test/unit/lib/analyzer/verdict-prompt-contract.test.ts` — 173 tests passed.
- `npm -w apps/web run build` — passed; `postbuild` reseeded the local `claimboundary` prompt to hash `e88cac5b6617...`.
- `git diff --check` — passed.

Next gate:

1. Commit this candidate fix on `main`.
2. Restart/reseed runtime state after the commit.
3. Spend exactly one live job on the Captain-defined `asylum-235000-de` input.
4. Stop immediately if it is still false-side, `MIXED`, or outside the 58-75 truth / 40-70 confidence band. Classify this candidate as keep/quarantine/revert before any next edit.

Live gate result:

- Commit under test: `2258d99aa6bfa07587bfafc02f43e11f6ba1a0a6`.
- Prompt hash under test: `e88cac5b6617df07e92e188d951cff2cabc4475e76f86f44920f6d99698ba2bf`.
- Canary: `asylum-235000-de` exact input, job `f079c5b6c5f84aa0941aafcff1b734a5`.
- Result: `TRUE` 93/82.
- Band assessment: **failed first gate**. Label is true-side, but truth and confidence are both above the corrected Captain band.
- Remaining live-job budget: 4.

Observed effect:

- The candidate fixed the immediate stale-contradiction symptom: the 2023 narrower route and older contextual items are neutral, the end-2025 SEM total `235 057` is supporting, and there are no final contradicting citations.
- The candidate did not solve calibration. Stage 4 treated a narrow threshold exceedance of only 57 persons plus source concentration on the official SEM data pipeline as near-certain truth.
- The job also still shows malformed preliminary numeric query text (`mehr als 235` without the thousands magnitude), but the successful 2025 acquisition means that is not the first post-fix failure.

Debt-guard classification after the failed gate:

- **Keep** the code-level metadata exposure (`freshnessRequirement` into extraction and applicability payloads). It is structurally correct and does not add semantic heuristics.
- **Keep, but monitor** the extraction prompt's stale-endpoint rule as the intended generic direction correction. It removed stale false-side dominance, which is the behavior expected by the plan.
- **Quarantine the live-quality claim** for `2258d99a`: it is not an accepted quality fix because it overcalibrates the family.
- Do **not** stack another prompt change in this turn. The next hypothesis must be debated/reviewed as a separate Stage 4 calibration / near-threshold weighting issue, not another Stage 2 acquisition or broad query fix.
