# DirectionBasis Regression Fix — Debate-Consolidated Proposal

**Date:** 2026-05-08; updated 2026-05-11
**Status:** Active plan updated — corrected Captain expectations applied; `asylum-235000-de` has current in-band canaries but remains watch-listed, and Captain accepted `plastic-en` current exact job `939563ecbea14a4c90249eb13c9743ef` (`LEANING-FALSE` 37/62) as a good report with `LEANING-FALSE` accepted for plastic reports in English and other languages
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
| `plastic-en` | `FALSE` / `MOSTLY-FALSE` / `LEANING-FALSE` / `MIXED`, truth 10-42, confidence 55-80. Keep as a control for overcorrection. Captain accepts `LEANING-FALSE` for plastic reports in English and other languages. |
| `asylum-wwii-de` | `MOSTLY-FALSE` / `LEANING-FALSE`, truth 18-42, confidence 50-75. Current count can be true-side or definition-caveated, but the end-of-WWII comparison is false-side when treated as endpoint stock. |

### Mandatory Report-Quality Comparison Rule

Any report-quality judgment or proposed fix must compare the target report against all four available baselines:

1. Captain intent and comparator notes in `Docs/AGENTS/Captain_Quality_Expectations.md`.
2. Mechanical bands and latest verified metadata in `Docs/AGENTS/benchmark-expectations.json`.
3. Q-code checks in `Docs/AGENTS/report-quality-expectations.json`.
4. Best usable comparator reports from the Captain file, labeled as exact/variant, local/deployed, and current-stack/historical.

If no best usable comparator exists for an in-scope family, write `NO-COMPARATOR-AVAILABLE` with the reason. Do not silently skip comparator review, and do not treat a comparator report as current validation unless it is explicitly exact current-stack validation.

### Current Plan Shape

The active lane moved from source discovery to verdict semantics. Earlier asylum canaries failed the corrected band for stale/current route, threshold direction, support inflation, missing current data artifacts, and then component-stitching. Commit `2147d5ed` fixed artifact discovery/parsing. Commit `989b3d02` added generic prompt guidance that component-only/current partial rows must stay contextual unless the source provides the complete non-overlapping aggregate. Commit `10d72b80` fixed the Stage 2 applicability merge path so an explicit LLM neutral reassessment can demote an existing directional extraction instead of being ignored. The latest exact canary `fd93d0de531243a18d2097b38351f4d4` passed at `LEANING-TRUE` 70/60: March component rows are neutral and the only cited contradiction is the older SEM end-2024 total. This is a current pass, not broad closure; residual narrative caveats still use component reconstruction and should be reviewed before spending more asylum jobs.

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

### 12.10 Stage 4 Threshold Calibration Canary — 2026-05-09

Debt-guard classification:

- Stage 4 threshold calibration prompt `eda022fc`: **keep as a static contract, quarantine its live-quality claim**. The change is generic, prompt-only, and adds no code mechanism, flag, fallback, deterministic clamp, or family-specific wording. The canary did not exercise the intended Stage 4 calibration path because it reached Stage 4 with no directional evidence.
- Stage 2 freshness exposure `2258d99a`: **keep structurally**. The earlier canary proved it can neutralize stale-current contradictions and keep the end-2025 official total supportive when that source is admitted.
- Current canary `5855f86b6b924c8fb4017ec2bd0e2d31`: **active first-gate failure**. Do not spend another live job until a separate reviewed hypothesis localizes why the current official aggregate route disappears or remains non-directional in this run.

Prompt/test change:

- Commit under test: `eda022fcd30db7e3f1323a69719fa674e9f6c7dc`.
- Prompt hash under test: `c50f1d795cd5887493736c3015fe3bae01728a7cd2828156ac1d5ae1351526b1`.
- The `VERDICT_ADVOCATE` and `VERDICT_RECONCILIATION` sections now distinguish directional support from certainty calibration for barely satisfied threshold/current-stock claims.
- Verification before live job: focused `verdict-prompt-contract` test passed (`108` tests), `npm -w apps/web run build` passed and reseeded the prompt, and `git diff --check` passed.

Live gate result:

- Canary: `asylum-235000-de` exact input, job `5855f86b6b924c8fb4017ec2bd0e2d31`.
- Result: `UNVERIFIED` 50/0.
- Band assessment: **failed first gate**. It is outside the corrected true-side band and below the expected confidence range.
- Search providers: `Serper (cached), Serper, Wikipedia, Serper, Google-CSE (circuit-open), Wikipedia`.
- Evidence balance: 7 neutral, 0 support, 0 contradiction, 2 sources.
- Warning: `insufficient_evidence` — "Claim AC_01 has no non-seeded Stage 2 evidence after provider search."
- Remaining live-job budget: 3.

Observed effect:

- The run did not retrieve or admit the decisive official 2025 aggregate route as Stage 2 directional evidence. It used preliminary/admin source snippets and SEM statistics-page context, but all 7 final evidence items were neutral.
- Main/refinement queries targeted current SEM or 2025 Bestandstabelle routes but returned either irrelevant current-statistics pages or zero results. The 2025 annual-commentary route that powered `f079c5b6c5f84aa0941aafcff1b734a5`, `3ba25fe7c99f4b96822e37a6a65f6bb1`, and deployed comparator `6a60b3eb0df540c0b16228d9367b1366` did not survive into non-seeded Stage 2 evidence.
- The old malformed preliminary numeric query remains visible (`mehr als 235` without the thousands magnitude), but this canary's first actionable failure is not Stage 4 calibration. It is source route acquisition/admission: the claim reaches verdict with no direct supportive aggregate evidence.

Next hypothesis gate:

1. Do **not** run another live job before a no-edit trace comparison of `5855f86b6b924c8fb4017ec2bd0e2d31` against `f079c5b6c5f84aa0941aafcff1b734a5` and deployed comparator `6a60b3eb0df540c0b16228d9367b1366`.
2. Localize why the source-native 2025 aggregate route appears in some runs and not this one: query generation, relevance selection, fetch/extraction, seeded-vs-non-seeded evidence admission, or Gate 4 non-seeded evidence policy.
3. Keep the next change generic and LLM-mediated. Do not fix this by adding asylum/SEM-specific search terms, deterministic source recognition, or another verdict-stage guard.
4. If the next reviewed hypothesis points to query/acquisition rather than verdict calibration, classify `eda022fc` as static-keep/live-unvalidated and shift the active lane back upstream rather than stacking more Stage 4 wording.

### 12.11 Current Aggregate Route Query Repair Candidate — 2026-05-09

Debt-guard classification:

- Stage 4 threshold calibration prompt `eda022fc`: **keep as a static contract, quarantine its live-quality claim**. The latest canary did not reach Stage 4 with direct supporting evidence, so it remains unvalidated by live quality.
- Stage 2 freshness exposure `2258d99a`: **keep structurally**. It remains the right metadata path for stale-current direction handling.
- Current query route behavior: **incomplete-existing-mechanism**. `GENERATE_QUERIES` already has current-snapshot and source-native artifact rules, but the live trace shows the contract was too narrow after partial current evidence: it allowed over-specific dated/current-route queries while missing the latest complete official aggregate artifact route.

No-edit localization result:

- Failed canary `5855f86b6b924c8fb4017ec2bd0e2d31` generated current/date-heavy routes such as `SEM Asylstatistik aktuelle Zahlen 31. März 2026 Gesamtbestand` and an over-specific 2025 route that returned zero results.
- Comparator `f079c5b6c5f84aa0941aafcff1b734a5` found the decisive route through the more compact source-native publication/category query `SEM Asylstatistik Jahresbericht 2025 Bestand Kategorien`.
- The first actionable divergence is query route acquisition, not verdict calibration, provider fallback, deterministic relevance rescue, or Gate 4 policy.

Candidate fix implemented:

- `GENERATE_QUERIES` now treats the newest routine current-statistics route and the latest complete official/institutional publication or data artifact as complementary when either may carry the decisive value.
- When current overview, landing-page, dashboard, or component evidence may not expose the direct `primaryMetric` or umbrella total, it reserves one query for the latest complete source-native publication, data artifact, annex, table, or file.
- Refinement now pivots incomplete current aggregate coverage toward latest complete artifacts and avoids invented exact date/month/edition/page labels unless those labels are already present in the claim, profile, distinct-events metadata, or existing evidence.
- The change is prompt-only, generic, multilingual-safe, and LLM-mediated. It does not add provider tuning, family-specific search terms, deterministic source recognition, a fallback path, or a new code mechanism.

Verification:

- `npm -w apps/web test -- test/unit/lib/analyzer/verdict-prompt-contract.test.ts test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts` — 135 tests passed.
- `npm -w apps/web run build` — passed; `postbuild` reseeded `claimboundary` to hash `f8cff7b1986f...`.
- `git diff --check` — passed before docs.
- Broad `npm test` hit three unrelated runner integration timeouts; the failed files passed immediately when rerun directly (`drain-runner-pause.integration.test.ts` and `runner-concurrency-split.integration.test.ts`, 19 tests). Treat this as unrelated parallel test noise, not a prompt-patch contradiction.

Next gate:

1. Commit this candidate fix on `main`.
2. Restart/reseed runtime state after the commit.
3. Spend exactly one live job on the Captain-defined `asylum-235000-de` input.
4. Stop immediately if it is false-side, `MIXED`, `UNVERIFIED`, or outside the 58-75 truth / 40-70 confidence band. Classify this candidate as keep/quarantine/revert before any next edit.

Live gate result:

- Commit under test: `a61aaf3237438c53874edc18e0e4780c2e8d60ab`.
- Prompt hash under test: `f8cff7b1986f4bb1f4e034879ae9f3a89eb263f02a3b20ed97bd207459efc0d7`.
- Canary: `asylum-235000-de` exact input, job `b6dfe982ac2145bd8e72cb21d0173cdd`.
- Result: `UNVERIFIED` 50/24.
- Band assessment: **failed first gate**. It is outside the corrected true-side band and below the expected confidence range.
- Search providers: `Serper, Wikipedia, Serper, Google-CSE, Wikipedia, Serper, Google-CSE (circuit-open), Wikipedia`.
- Evidence balance: 0 support, 5 contradiction, 9 neutral, 14 total.
- Warnings/errors: `verdict_citation_integrity_guard:error` and `verdict_integrity_failure:error` because the final verdict had no supporting decisive citation side after sanitation.
- Remaining live-job budget: 2.

Observed effect:

- The query repair improved the targeted acquisition failure: the run fetched the official 2025 SEM annual-commentary PDF and a CMS copy, including the decisive `Total Personen aus dem Asylbereich (inkl. RU) ... 235 057` evidence.
- The next first divergence is now evidence direction/applicability: the threshold-satisfying 2025 value was repeatedly labeled `contradicts` even though the claim says "more than 235 000" and the source value is 235 057.
- This means `a61aaf32` is **static-keep / live-quality quarantined**: keep the query-route amendment as a useful acquisition repair, but do not treat it as a report-quality fix until the direction failure is resolved.

Next hypothesis gate:

1. Do **not** run another live job before a no-edit direction trace comparison against `f079c5b6c5f84aa0941aafcff1b734a5`, where the same official 2025 value was supporting.
2. Localize why `EXTRACT_EVIDENCE` or `APPLICABILITY_ASSESSMENT` can still mark a current threshold-satisfying primary metric as contradiction despite `freshnessRequirement = current_snapshot`.
3. Keep the next fix generic and LLM-mediated. Do not add numeric clamps, family-specific terms, deterministic source recognition, or another verdict-stage guard.

### 12.12 Grouped Numeric Direction And Narrow-Margin Calibration Canaries - 2026-05-09

Debt-guard classification:

- Query-route repair `a61aaf32`: **keep as static acquisition repair, quarantine live-quality claim**. The later canaries confirm it can fetch the official complete aggregate artifact route, but the family still fails the corrected band.
- Grouped-numeric prompt repair `a0632591`: **keep**. It is generic, prompt-only, and fixed the concrete direction/arithmetic failure where `235 057` was treated as below `235 000`. It adds no family-specific wording, deterministic numeric clamp, provider tuning, or new code mechanism.
- Narrow-margin calibration prompt `86491d0a`: **keep as a static contract, quarantine live-quality claim**. It improved calibration but did not reach the Captain band.
- Current lane: **active first-gate failure**. No more live jobs should be submitted on this lane until the remaining support-inflation mechanism is localized and one minimal generic patch is reviewed.

Live gate after `a0632591`:

- Commit under test: `a0632591d1143f12c30c22da98d993066ff7d8fd`.
- Prompt hash under test: `d2ec29f96728b89daefbb7ab0b0830ac4cb879db379f81f0da84e7d300418966`.
- Canary: exact `asylum-235000-de`, job `73bf5061515d471ca746a80c27df8fe8`.
- Result: `TRUE` 93/78.
- Band assessment: **failed first gate**. The decisive current aggregate evidence was now on the correct side, but truth and confidence remained above the corrected 58-75 / 40-70 Captain band.
- Evidence effect: final direction counts were support-heavy and contradiction-free (`supports=4`, `contradicts=0`, `neutral=10`). The prompt repair solved grouped-number direction, not verdict calibration.

Live gate after `86491d0a`:

- Commit under test: `86491d0a29e5a866a955c749ad510d1a7e57752b`.
- Prompt hash under test: `ac6914aa50577c30208f10f22f2d94e7907aeb45aa5fe66af6187f5feda7ff0d`.
- Canary: exact `asylum-235000-de`, job `e6a0afc3ca01472b943c51c380cbeaa7`.
- Result: `TRUE` 87/72.
- Band assessment: **failed first gate**. The change moved the result in the right direction from 93/78 to 87/72, but truth remains too high and confidence is still above the expected band.
- Search/config note: the run used the repaired Serper-primary / Google-CSE-fallback runtime. Provider behavior is not the first remaining cause in this trace.

Observed remaining divergence:

- The final report still has zero contradictions and multiple supports for one narrow threshold claim (`supports=6`, `contradicts=0`, `neutral=7`).
- Claim verdict `AC_01` lists support IDs that include the direct current aggregate (`235 057`) **and** older/prior-year/source-native comparator rows such as `226 706` from 2024.
- The 2024 comparator-side evidence is useful context for calibration, but it should not increase directional support for the current claim merely because it is part of the same source-native table or comparison route.
- Boundary `CB_01` remains near-certain (`95/90`) before aggregation, so Stage 4 starts from an inflated support picture and only partially discounts source concentration, missing latest-period uncertainty, and the 57-person margin.

Next no-edit trace:

1. Compare `e6a0afc3ca01472b943c51c380cbeaa7` against exact local comparator `3ba25fe7c99f4b96822e37a6a65f6bb1` and deployed comparator `6a60b3eb0df540c0b16228d9367b1366`.
2. Inspect `claimDirectionByClaimId`, `directionBasis`, `directnessJustification`, boundary evidence membership, and final verdict support IDs for direct target-metric evidence versus prior-year/comparator/context evidence.
3. Confirm whether the remaining first cause is `APPLICABILITY_ASSESSMENT` overclassifying contextual comparator rows as support, Stage 4 overcounting contextual support, or both.
4. Only after that trace, debate one minimal generic fix. The likely acceptable shape is an LLM-mediated support-semantics clarification: direct support should mean the evidence directly establishes the target metric/current threshold relation; prior-period, comparator-side, component, or methodology rows calibrate and contextualize unless they themselves establish the target claim.

Rejected next moves:

- No more live jobs before the no-edit trace. The latest allocation's live-job budget for this lane is now **0**.
- Do not add family-specific source terms, named entities, deterministic numeric rules, hard clamps, or another verdict-stage guard without first proving the upstream support semantics cannot carry the fix.
- Do not revive broad first-pass query expansion or behavioral `directionBasis` locks; both were already rejected or simplified earlier in this plan.

### 12.13 Profile Support-Inflation Static Fix - 2026-05-09

No-edit trace result:

- Latest failed canary `e6a0afc3ca01472b943c51c380cbeaa7` (`TRUE` 87/72) differs from deployed comparator `6a60b3eb0df540c0b16228d9367b1366` (`MOSTLY-TRUE` 72/70) before verdict weighting.
- The deployed comparator keeps `expectedEvidenceProfile` generic: it names the overall current asylum-area stock, source families, and component categories without copying observed result values.
- The current canary's Stage 1 profile already includes evidence-discovered result values: `235 057`, `226 706`, `+3,7 %`, and component counts. Stage 2 then treats those profile entries as accepted routes, so prior-year and component rows become directional support for the current narrow-threshold claim.
- This explains why `e6a0...` has `supports=6`, `contradicts=0`, `neutral=7` and a near-certain `CB_01`, while the deployed comparator has only two supports, one calibrated prior-year counterpoint, and seventeen neutral/context rows.

Debt-guard result:

- Classification: **incomplete-existing-mechanism**.
- Chosen option: **amend existing prompt contracts** in place.
- Rejected path: no verdict clamp, no deterministic post-hoc support filter, no provider/config change, no family-specific terms, and no additional live job before static repair.
- Net mechanism count: unchanged.

Candidate fix implemented:

- Commit: `9e801335b3ea1326be1246ab9a8353115314a7dd`.
- Active prompt hash after build/reseed: `cae5097eb69a...`.
- `CLAIM_EXTRACTION_PASS2` now says preliminary evidence may inform source-native labels, metric classes, route families, publication families, and methodology names, but must not turn observed result values into accepted profile targets unless the original input contains those values.
- `EXTRACT_EVIDENCE` now says evidence-discovered older values in `expectedEvidenceProfile` are not enough to make stale endpoints "explicitly evaluated" for current/recent metric claims.
- `APPLICABILITY_ASSESSMENT` now says route acceptance must come from the input-authored truth condition, decisive metric route, comparison relation, or explicitly accepted metric class; evidence-discovered observed values and `componentMetrics` entries do not by themselves accept alternate routes.
- For current threshold/current-stock claims with a direct `primaryMetric`, component rows and prior/reference rows are calibration context unless the evidence item itself reports the complete decisive aggregate, states the source-native comparison relation that satisfies the claim, or documents a transparent non-overlapping composition.

Verification:

- `npm -w apps/web test -- test/unit/lib/analyzer/verdict-prompt-contract.test.ts test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts` - 135 tests passed.
- `npm -w apps/web run build` - passed and reseeded `claimboundary`.
- `git diff --check` - passed.

Next gate:

1. Do not treat `9e801335` as live-validated yet. It is a static candidate only.
2. If Captain grants more live-job budget, restart/refresh runtime if needed and spend exactly one exact `asylum-235000-de` canary on `9e801335`.
3. Stop immediately on any band failure. Expected acceptance remains `LEANING-TRUE` or `MOSTLY-TRUE`, truth 58-75, confidence 40-70, with prior-year/component rows not inflating support.
4. If the next canary still over-scores, first inspect whether the new profile is clean and whether component/prior rows stayed neutral before touching Stage 4 again.

### 12.14 Source Data Artifact Retrieval Live Pass - 2026-05-09

Post-`9e801335` validation found one more upstream gap before the report could reach the intended calibrated true-side band:

- `bfe7bb89783e4632a7d8148ff70119a2` on `7e5acec2`: `TRUE` 92/82. The route found the 2025 official aggregate, but still overtrusted the end-2025 value for a `zurzeit` claim.
- `e27ad1a368164c95b2e68a9339b93fb7` on `6924daa0`: `TRUE` 90/78. Current-route awareness improved, but the current SEM March 2026 page only contributed page-level evidence; the linked current data tables were not fetched/extracted.
- No-edit trace: `retrieval.ts` discovered same-family PDFs but not `.xlsx` artifacts, and XLSX URLs were not parsed as structured source text if fetched directly. The current SEM page exposes relevant monthly `.xlsx` tables, so the first concrete missing mechanism was source-data artifact discovery/parsing, not another verdict prompt layer.

Candidate fix implemented:

- Commit: `2147d5ed037fee4f78d3c6690ceeeb134eb66728`.
- `retrieval.ts` now discovers same-family document/data artifact links from HTML pages, including `.xlsx`, and parses XLSX text with a small Office Open XML reader built from Node built-ins.
- `research-acquisition-stage.ts` now lets the LLM relevance gate classify more discovered same-family follow-up candidates while fetching only the top limited subset, preserving the no-pile-up constraint.
- UCM defaults now expose `discoveredFollowUpCandidateLimit` and `discoveredFollowUpFetchLimit`.
- Verification before live job: targeted retrieval/acquisition/config-drift tests passed, `npm -w apps/web run build` passed, full safe `npm test` passed, and runtime was restarted/reseeded on the commit.

Live gate result:

- Canary: exact `asylum-235000-de`, job `1df476e9638f49a3bbd4e7622c33fdfc`.
- Result: `LEANING-TRUE` 68/58.
- Band assessment: **passes corrected Captain band** (`LEANING-TRUE` / `MOSTLY-TRUE`, truth 58-75, confidence 40-70).
- Evidence shape: 28 evidence items, 21 sources, quality gates passed. The run fetched and parsed current SEM March 2026 `.xlsx` artifacts such as `6-10-best-asylprozess-2026-03`.
- Report reasoning: correctly treats 235 057 at end-2025 as formally above the threshold, but downgrades for the 57-person margin, missing full March 2026 aggregate, and source concentration.

Residual caveat:

- The job did not fetch the manually identified current `6-51` RU sheet. It selected current `6-10`, `6-20`, and `6-22` instead.
- Some March 2026 partial-current evidence is still tagged `contradicts` even though the final reasoning correctly says it is not a methodologically complete contradiction to the wider `Asylbereich` claim.
- This is not a reason to spend another job immediately. It is a focused report-review item: inspect whether the current artifact-selection prompt or follow-up candidate ranking should prefer complete aggregate/composition tables when the current page exposes multiple source-native data artifacts.

Next gate:

1. Treat `2147d5ed` as the first live pass for this lane, not as broad benchmark closure.
2. Spend no additional asylum job until the passing report is compared against `Captain_Quality_Expectations.md`, `benchmark-expectations.json`, `report-quality-expectations.json`, and the best exact/family comparators.
3. If a stability rerun is approved, spend exactly one more exact `asylum-235000-de` job and stop if it falls outside band.
4. Otherwise use the next job on a different corrected-family canary only after stating the expected band and stop rule.

Stability rerun result:

- Canary: exact `asylum-235000-de`, job `511c2b17299a49a5a9640505c40eac0f`.
- Result: `LEANING-FALSE` 32/60.
- Band assessment: **failed first gate**. False-side output is outside the corrected Captain expectation.
- Positive signal: artifact retrieval is now stable enough to fetch current SEM March 2026 XLSX artifacts, including the previously missing `6-50` and `6-51` RU sheets.
- Failure mechanism: the verdict stage stitched a custom component total from current SEM partial tables (`N`, `F`, `S`, `B`, `RU`) and treated that stitched total as decisive false-side evidence. This violates the family expectation: the report must surface one clean official SEM aggregate total or explicitly state that no current complete aggregate is available; it must not replace the official aggregate with an agent-composed component sum.
- Secondary symptom: the final reasoning drifted from the input wording `Personen aus dem Asylbereich` toward `Geflüchtete`, with a single NZZ title as support, while the SEM component stitch dominated the verdict.

Debt-guard classification for the next implementation turn:

- `2147d5ed` source-data artifact retrieval: **keep**. Both canaries confirm the mechanism discovers and parses XLSX artifacts.
- Live-quality claim for `asylum-235000-de`: **quarantine**. One pass plus one false-side failure means the family remains open.
- Active first divergence: **Stage 4 / verdict synthesis uses component evidence as if it were an official complete aggregate**. This is not a search-provider, XLSX parser, or broad query-breadth problem.

Next gate:

1. Do not run another `asylum-235000-de` job before a no-edit trace of `511c2b17299a49a5a9640505c40eac0f` against passing `1df476e9638f49a3bbd4e7622c33fdfc` and deployed comparator `6a60b3eb0df540c0b16228d9367b1366`.
2. Localize whether the component-stitching happens because `APPLICABILITY_ASSESSMENT` over-promotes component rows, Stage 4 overuses neutral component rows in reasoning, or both.
3. The next fix, if any, must be generic and LLM-mediated: for current aggregate/threshold claims, component tables can contextualize uncertainty, but must not become a decisive directional total unless the source itself provides the complete non-overlapping aggregate or the claim's expected profile explicitly authorizes that composition.
4. Remaining budget from the latest 8-job allocation after these two jobs: 6.

### 12.15 Component Evidence Neutralization Pass - 2026-05-09

No-edit trace result:

- Failing stability job `511c2b17299a49a5a9640505c40eac0f` and passing canary `1df476e9638f49a3bbd4e7622c33fdfc` both reached the current SEM XLSX artifact family. Retrieval was no longer the first cause.
- The failed run turned partial current components (`6-10`, `6-50`, `6-51`, status rows, and related component sheets) into a custom March total and treated that stitched number as false-side evidence.
- The deployed comparator `6a60b3eb0df540c0b16228d9367b1366` uses the official SEM end-2025 aggregate as the support anchor, treats the older end-2024 value as a dated counterpoint, and leaves incomplete current component data as calibration context.

Debt-guard classification:

- `2147d5ed` source-data artifact retrieval: **keep**.
- Component-only verdict flip in `511c2b...`: **incomplete-existing-mechanism** in LLM-mediated extraction/applicability semantics, not a reason to add deterministic post-processing or broaden search.
- Prompt component-completeness repair `989b3d02`: **keep**. It is generic, multilingual-safe, and extends the existing LLM extraction/applicability contract rather than adding a new mechanism.
- Stage 2 neutral reassessment merge repair `10d72b80`: **keep**. It removes an internal contradiction where the applicability LLM could explicitly mark an item neutral but the merge path preserved the old directional label.

Candidate fixes implemented:

- `989b3d02 fix(prompt): keep incomplete component arithmetic neutral`
  - `EXTRACT_EVIDENCE` and `APPLICABILITY_ASSESSMENT` now say component-only or incomplete component arithmetic is contextual unless the source itself provides the complete non-overlapping aggregate or the expected profile explicitly authorizes that composition.
  - Prompt-contract tests were added for extraction, applicability, and self-check language.
- `10d72b80 fix(stage2): honor neutral applicability reassessments`
  - `assessEvidenceApplicability` now allows explicit neutral claim-local reassessments to demote existing directional extraction results.
  - Added a focused unit test proving a component-only below-threshold item can be demoted from `contradicts` to `neutral`.

Verification:

- `npm -w apps/web run test -- test/unit/lib/analyzer/verdict-prompt-contract.test.ts` - passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer/research-extraction-stage.test.ts` - passed.
- `npm -w apps/web run build` - passed and reseeded unchanged prompts after the code-only fix.
- Full safe `npm test` - passed before the live canary.
- Runtime restarted/reseeded on committed code before submission.

Live gate result:

- Canary: exact `asylum-235000-de`, job `fd93d0de531243a18d2097b38351f4d4`.
- Commit under test: `10d72b80cd35373b639f1c05e5fb6770f67b38b3+e3b0c442`.
- Result: `LEANING-TRUE` 70/60.
- Band assessment: **passes corrected Captain band** (`LEANING-TRUE` / `MOSTLY-TRUE`, truth 58-75, confidence 40-70).
- Evidence shape: 36 evidence items, 3 support, 1 contradiction, 32 neutral. The only cited contradiction is the older SEM end-2024 official aggregate (`226 706`), explicitly dated as not current. Current March component rows are neutral and carry directness justifications saying they are incomplete for the aggregate.
- Residual caveat: the final reasoning still uses component reconstruction as a caveat when discussing March 2026 uncertainty. That is acceptable as uncertainty context in this canary, but it should not become decisive support or contradiction in later runs.

Next gate:

1. Do not batch-spend the remaining budget on asylum. This is a current pass plus one prior false-side stability failure, so the family is **improved, current-pass, watch** rather than closed.
2. If another asylum job is considered, first do a short no-edit review of `fd93d0de531243a18d2097b38351f4d4` against `3ba25fe7c99f4b96822e37a6a65f6bb1` and deployed `6a60b3eb0df540c0b16228d9367b1366`, focused only on whether component reconstruction stayed caveat-only.
3. The next best use of the remaining jobs is likely a different corrected-family canary, especially canonical `bolsonaro-en`, after restating its true-side band and stop rule.
4. Remaining budget from the latest 8-job allocation after this canary: 4.

### 12.16 Bolsonaro EN Current Pass - 2026-05-10

Captain restated the target after the first current true-side pass still left AC_02/AC_03 `MIXED`: the canonical `bolsonaro-en` input must keep the three-claim split, and the proceedings/fair-trial and verdict/fair-trial claims should be verifiable and true-side under the corrected expectation unless direct operative defect evidence defeats them.

Debt-guard classification before this slice:

- Prior claim-shape and seeded-sufficiency fixes: **keep**. They are generic and still necessary for the input to prepare and retain three claims.
- High-harm confidence advisory label fix (`dc312317`): **keep**. Advisory confidence should not override canonical truth-scale labels to `UNVERIFIED`.
- First current validation after `dc312317`, job `15ff9e18fea34816b8ee6fd8d96d87c2`: **quarantine as incomplete**. It fixed preparation and verifiability but left AC_02/AC_03 as `MIXED`, outside Captain's corrected true-side expectation.

Narrow fixes and live evidence:

- `48e884d3 fix(prompts): keep remedy mechanics caveated` kept appeal/remedy mechanics and model-background standards commentary from becoming direct contradiction without an operative bridge. Live job `9d7fe6fed6a746b893a6ccc0176de733` recovered the article top line (`LEANING-TRUE` 59/40) but left AC_02/AC_03 `UNVERIFIED`; keep as directionally correct but insufficient.
- `ffe7a455 fix(verdict): repair one-sided middle-band claims` repairs one-sided direct-evidence verdicts stuck in the mixed/UNVERIFIED band. Live job `5b8f118288964d1a84541123091c4803` still failed overall (`UNVERIFIED` 56/28) because AC_02 had no direct support to repair; keep the guard, but it is not the whole cause.
- `5dc1d675 fix(research): prioritize safeguard records for standards claims` adds generic query guidance for rule-governed standards claims: when only one query may survive budget/truncation, prefer the directly evaluated target's safeguard/process record over broad standards commentary. Focused prompt/stage tests passed, runtime was restarted/reseeded, and exact job `8761ab59a825430ab3bd2ae325dc4573` passed.

Current exact pass:

- Job: `8761ab59a825430ab3bd2ae325dc4573`
- Commit/prompt: `5dc1d67568a2239b89ea6df96918360fd57cb83a+a8d67c56`, prompt hash `d4096000536c83efc77374d384f5aa5c0ab1e337e125405ad06c4c183a75dd4a`
- Overall: `LEANING-TRUE` 65/50, 6 boundaries, 3 claims
- AC_01: `MOSTLY-TRUE` 74/63, 9 supports / 0 contradictions
- AC_02: `LEANING-TRUE` 58/48, 8 supports / 0 contradictions
- AC_03: `LEANING-TRUE` 62/44, 4 supports / 0 contradictions
- `state.gov` residue check: one preliminary-search candidate was present, but it was not selected for fetch and extracted zero evidence; no final-citation contamination was found in the verified report view.

Quality read:

- This satisfies the corrected `bolsonaro-en` expectation at article level and fixes the user-reported "others should be verifiable" issue: AC_02 and AC_03 are now explicit, supported, and true-side.
- Treat as **current-pass/watch**, not broad closure. AC_03 confidence is 44, just below the family confidence band if claim-level bands are enforced; the report also has one admin-only claim-local citation registry warning for AC_02. Neither issue changes the visible verdict, but both should be reviewed before promoting `8761ab59` as the preferred current-stack comparator.
- The query prompt amendment did not visibly rewrite the first AC_02 query in this run; the live improvement came from the combined current stack surfacing and mapping target-path safeguards. Do not over-attribute the pass to a single changed line.

Next gate:

1. Do not spend another Bolsonaro EN job immediately.
2. Do a no-edit report-quality review of `8761ab59a825430ab3bd2ae325dc4573` against `Captain_Quality_Expectations.md`, `benchmark-expectations.json`, `report-quality-expectations.json`, and exact comparators `91bf6083d26e407c98a474d89d2e618f` / `85812d61a3984fa6bb945d4096eaa039`.
3. Only if that review identifies a focused stability question, spend one more exact Bolsonaro EN rerun; otherwise move to the next open family/control.
4. Captain later granted an 8-job budget for the active rerun lane. This Bolsonaro EN slice spent 3 live jobs (`9d7fe6f`, `5b8f118`, `8761ab59`), so count at most 5 remaining from that later allocation unless Captain resets the budget.

### 12.17 Bolsonaro EN No-Edit Comparator Review - 2026-05-10

Assisted review:

- Comparator helper: inspected `8761ab59`, exact local comparator `91bf6083d26e407c98a474d89d2e618f`, and exact deployed comparator `85812d61a3984fa6bb945d4096eaa039`.
- Adversarial Q-code reviewer: applied `report-quality-expectations.json`, `benchmark-expectations.json`, and Captain current-pass/watch notes.
- Main thread independently verified structured fields through local/deployed APIs.

Decision:

- **Do not spend another Bolsonaro EN job now.**
- `8761ab59` is a legitimate current-stack exact pass and should supplement the comparator set, not replace `91bf6083` or `85812d61` as best comparators.
- Core checks pass: job succeeded, article band passes, 3 claims and 6 boundaries, every claim has cited supporting evidence, source-type mix is broad, and no user-visible warning is emitted.
- Remaining watch items are not rerun triggers:
  - AC_03 confidence is 44, slightly below the family confidence band if claim-level bands are enforced, while article confidence is in band.
  - One AC_02 claim-local citation registry warning is admin-only and the cited ID resolves as claim-local evidence.
  - One `state.gov` item exists only as a rejected preliminary-search candidate with `selectedForFetch=false` and `extractedEvidenceCount=0`.
  - `meta.evidenceBalance` reports 18 support / 19 contradiction / 41 neutral, while final evidence/narrative report 24 support / 0 contradiction / 61 neutral. This is a reporting-consistency follow-up, not a reason to rerun.

Next gate:

1. Keep `bolsonaro-en` at **current-pass/watch**.
2. Preserve `91bf6083` as best exact local historical comparator and `85812d61` as best exact deployed comparator.
3. Spend the next live-job budget on higher-value open validations unless Captain explicitly wants to close Bolsonaro EN stability with one same-stack repeat.
4. If implementing anything from this review, start with a no-live-job investigation of the `meta.evidenceBalance` vs final-direction accounting mismatch.

### 12.18 Asylum-WWII First Current Band - 2026-05-10

Scope:

- Exact Captain-defined input: `235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.`
- Runtime under test: local current stack `5dc1d67568a2239b89ea6df96918360fd57cb83a+ee246bc0`, prompt hash `d4096000536c83efc77374d384f5aa5c0ab1e337e125405ad06c4c183a75dd4a`.
- No source/prompt/config edit was made for this slice; this was a validation/discovery run after the Bolsonaro EN no-job review.

Live jobs:

- `9e1f0f0014564edeaa0e673b43dc27e6`: `MOSTLY-FALSE` 25/73, 2 AtomicClaims, 6 ClaimAssessmentBoundaries, 55 evidence items, 44 sources.
  - AC_01 current count: `MIXED` 55/75. The report recognized SEM/asylum-area support but kept definition caveats around "Flüchtlinge".
  - AC_02 WWII comparison: `MOSTLY-FALSE` 18/72. The report treated the end-of-WWII value as endpoint stock around 100k-115k, not cumulative wartime admissions.
- `ce265797d3fc4540a45aaeac99510e4a`: `LEANING-FALSE` 30/63, 2 AtomicClaims, 6 ClaimAssessmentBoundaries, 38 evidence items, 32 sources.
  - AC_01 current count: `LEANING-TRUE` 65/72, grounded in the SEM 2025 aggregate around 235,057.
  - AC_02 WWII comparison: `MOSTLY-FALSE` 22/58, again dominant and endpoint-stock based.

Assisted review result:

- The two exact current-stack reports agree on the important shape: the current 235k subclaim can be true-side or caveated depending on definition, but the historical-comparison subclaim dominates and is false-side.
- Local `808e6f8ac29a4850b10ff04c9c534d85` is not a best comparator despite being exact and true-side. It appears to use cumulative WWII admissions/flows as support for an endpoint-stock comparison, which is the failure mode this family must catch.
- Useful deployed comparators are exact `a48a621091da41f59bf1cb64676f6b76` (`MOSTLY-FALSE` 22/77) and near-exact `96282803637a46c28efe10f32b2cb47d` (`LEANING-FALSE` 41/61; missing final period).

Expectation update:

- `Docs/AGENTS/benchmark-expectations.json` now sets `asylum-wwii-de` to `MOSTLY-FALSE` / `LEANING-FALSE`, truth 18-42, confidence 50-75, min 2 boundaries.
- `Docs/AGENTS/Captain_Quality_Expectations.md` now lists the current local pair and deployed comparators, with the explicit rule that "am Ende des Zweiten Weltkrieges" means endpoint stock unless Captain says otherwise.

Next gate:

1. Do not spend another immediate `asylum-wwii-de` job. Two exact current-stack runs are enough to move the family out of "not validated".
2. Keep the family on watch until Captain accepts the new false-side band or requests one later stability spot-check.
3. If reviewing future reports, fail any report that treats cumulative WWII admissions/flows as direct support for the endpoint-stock comparison.
4. Latest renewed 8-job budget: 2 jobs spent on this slice, 6 remain.

### 12.19 Bundesrat Accepted Rerun And SVP PDF Control - 2026-05-11

Scope:

- No source, prompt, or config edit was made in this slice.
- Captain clarified after the asylum-WWII pair that `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz` is the better asylum validation input than the WWII-comparison input. Treat future asylum spend accordingly: use the exact current-total input unless Captain explicitly asks for the historical-comparison variant.

Bundesrat-rechtskräftig isolated rerun:

- Job: `f8e72c84fb004f23945e23c81973fc26`.
- Exact Captain-defined input: `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben`.
- Result: `LEANING-FALSE` 32/80, 3 AtomicClaims, 5 ClaimAssessmentBoundaries, 88 evidence items, 33 sources, no user-visible warnings.
- Runtime metadata from result: `4609e9b9c80bd6c2414ecd183b5bc684ed2ab297+31b54819`, prompt hash `d4096000536c83efc77374d384f5aa5c0ab1e337e125405ad06c4c183a75dd4a`.
- Quality read: Captain accepted this as good. The old concurrent-run zero-evidence collapse is cleared for this family. Truth 32 is 3 points below the nominal 35-60 band, but inside the repo's 8-point noise tolerance; the report is structurally strong and keeps the `rechtskräftig` legal-force anchor dominant while preserving the true chronology.
- Docs updated: `benchmark-expectations.json` now promotes `f8e72c84` to latest verified/current comparator and removes `bundesrat-rechtskraftig` from `highPriorityReruns`; `Captain_Quality_Expectations.md` names `f8e72c84` as the preferred exact current-stack comparator.

Plastic control attempt:

- Job: `9d7ab72a60114878a96c30ffc517c347`.
- Exact Captain-defined input: `Plastic recycling is pointless`.
- Result: `FAILED`, progress 60, no verdict/report.
- Quality read: not usable as report-quality evidence. Inspect the operational failure before spending another plastic job.

SVP PDF URL control:

- Job: `4cc3dabe4dfa46d6b0b12ba1c1f0efa4`.
- User-approved URL input: `https://www.svp.ch/wp-content/uploads/260324_Argumentarium-ohne-Q-A-DE.pdf`.
- Result: `LEANING-TRUE` 58/55, 5 AtomicClaims, 1 boundary, 78 evidence items, 58 sources.
- Runtime metadata from result: `0e643c4a913491bfe2b7b2def5124f133c18b1b6+53548a94`, prompt hash `d4096000536c83efc77374d384f5aa5c0ab1e337e125405ad06c4c183a75dd4a`.
- Useful signal: broad URL/article processing works on the current stack; core population-growth claims came out mostly true-side, the Germany 16x comparison was correctly false-side, and the report did not collapse despite 8 main research iterations.
- Residual quality issues: two user-visible warnings remain. Research time budget was exceeded after 13 minutes, and AC_04 (`Seit dem Jahr 2000 wurden über 655'000 asylrechtliche Gesuche...`) stayed `UNVERIFIED` because evidence lacked source-type/domain diversity. Treat this as a control report with caveats, not as a new benchmark family or proof that asylum-current is closed.

Budget accounting:

- Latest renewed 8-job budget after the Captain reset: asylum-WWII pair spent 2, Bundesrat accepted rerun spent 1, plastic failed attempt spent 1, SVP PDF control spent 1.
- Remaining submitted-job budget by conservative count: 3.

Next gate:

1. Do not spend more jobs until the Captain chooses the next target.
2. If continuing asylum quality work, prefer the exact `asylum-235000-de` current-total input, not the WWII comparison, and spend at most one job after a short no-edit comparator review.
3. If continuing plastic, inspect why `9d7ab72` failed before rerunning.
4. If continuing SVP URL/article controls, track AC_04 evidence-source diversity and research-time budget pressure rather than changing benchmark expectations.

### 12.20 Runner Heartbeat Fix And Current Plastic Verification - 2026-05-11

Captain reset the live-job budget to 8 and then requested fixing failed plastic job `9d7ab72a60114878a96c30ffc517c347`.

Debt-guard classification:

- Symptom: `9d7ab72` was `FAILED` at progress 60 with no report.
- Verifier: event history shows `Job failed: Stale job (no progress update for 15 minutes)` at 22:44:30, followed by continued analyzer progress (`Verdict generation complete`, `Analysis complete`, `Storing result`) and `Ignored result store after terminal status FAILED`.
- Classification: **incomplete-existing-mechanism**. The stale recovery mechanism treated an active local run as dead because long LLM stages can exceed 15 minutes without a status/progress write.
- Rejected fixes: raising the stale threshold globally, disabling stale recovery, adding plastic-specific retry/report logic, or allowing late result storage over terminal failed jobs.
- Chosen fix: amend the existing runner mechanism with a low-frequency active-job heartbeat while `runJobBackground` owns the local job execution.

Implementation:

- Commit: `37554ace fix(runner): heartbeat active jobs during long stages`.
- File: `apps/web/src/lib/internal-runner-queue.ts`.
- Behavior: active locally tracked jobs now write `Runner heartbeat` every 5 minutes by default (`FH_RUNNER_JOB_HEARTBEAT_INTERVAL_MS` can override with intervals >= 60 seconds). The heartbeat refreshes `UpdatedUtc` without changing progress and is cleared in `finally`.
- Tests: `apps/web/test/unit/lib/internal-runner-queue.test.ts` now covers heartbeat interval resolution.

Verification:

- Focused runner test: passed (`14` tests).
- `npm -w apps/web run build`: passed; prompt/config reseed reported `0 changed`.
- Full safe `npm test`: passed.
- Runtime restarted/reseeded on clean commit `37554ace`.

Live outcomes from the reset 8-job budget:

- `asylum-235000-de` stability job `aaaa8f6572c14b2bb3593866e1eefde5` ran before the runner patch activation, with manual heartbeats to avoid the known stale-watchdog false failure. It succeeded as `MOSTLY-TRUE` 75/68 on `acf99731`, with 1 claim, 6 boundaries, 45 evidence items, 48 sources, and no user-visible warnings. This is in band but at the truth-band ceiling, so keep watch.
- Plastic verification job `38655e2b60d24aaf93ea16d044d1a1c4` ran after restart on `37554ace` and succeeded as `MIXED` 52/68, with 3 claims, 6 boundaries, 124 evidence items, and 29 sources. Event history shows heartbeat updates at 13:45, 13:50, 13:55, and 14:00, then `Analysis complete`, `Storing result`, and `Done` with no stale failure.

Quality read:

- The user-reported failure mode for `9d7ab72` is fixed operationally: the analyzer can now survive long late-stage spans and store the result.
- Plastic report quality remains open. Current clean `38655e2b` is not a best comparator because truth 52 is above the expected calibrated false-side band, even though `MIXED` is an allowed label in the current JSON row.
- Do not spend another plastic job before a no-edit comparison against best exact comparator `32f00bb32d644a909f0c99521e800536`, focused on why current evidence/adjudication shifted from false-side to high mixed.

Budget:

- Reset budget: 8.
- Spent in this slice: 2 (`aaaa8f65` asylum, `38655e2b` plastic).
- Remaining submitted-job budget: 6.

### 12.21 Plastic False-Side Edge And Deploy-Readiness Review - 2026-05-11

Scope:

- Exact Captain-defined input: `Plastic recycling is pointless`.
- Goal: investigate whether current code/prompt quality is deployable and at least as good as the current deployment/comparator set, without piling prompt changes on top of failed validation.
- Runtime after final cleanup: local `main` commit `4b3fb1d431bb11d496ae74bf4ce0ba563de8d49e`, web `/api/version` confirmed on localhost, API health OK.

Debt-guard / failed-attempt classification:

| Commit | Classification | Reason |
|---|---|---|
| `01466a0d` Stage 2 contradiction-query ordering | Keep, residual watch | Current canary exercised the contradiction loop (`contradictionIterationsUsed=1`) and moved the report from high `MIXED` toward false-side. It did not fully solve direction skew, so do not broaden from it without a new verifier. |
| `3bd484a4` repair-prompt reinforcement | Reverted by `4b3fb1d4` | The only canary that exercised the repair prompt still failed in Stage 1; the successful canary passed on retry and did not use `CLAIM_CONTRACT_REPAIR`. Keeping it would be pile-up. |
| `0b3238b9` Stage 1 repair observability | Keep | Diagnostics-only, no semantic behavior change. Useful if the Stage 1 repair path fails again. |
| `7b6cce38` result-builder type fix | Keep | Minimal plumbing needed for the observability payload. |

Live jobs in this slice:

- `bbbbc49180d5440492461ec6d0ff2d4`: exact plastic on `01466a0d`; `UNVERIFIED` 50/0 with zero evidence. Not a Stage 2 verifier because it aborted in Stage 1 contract repair.
- `7222f56018c64d94ba9f1026d5fbd229`: exact plastic after prompt reinforcement `3bd484a4`; again `UNVERIFIED` 50/0 with zero evidence. This contradicted the prompt-fix claim.
- `939563ecbea14a4c90249eb13c9743ef`: exact plastic on `7b6cce38` before reverting the unused prompt change; `LEANING-FALSE` 37/62, 3 AtomicClaims, 6 boundaries, 144 evidence items, 34 sources, no `report_damaged`.

Report-quality comparison:

- Captain/JSON bar remains `MOSTLY-FALSE` / `FALSE` / `MIXED`, truth 10-35, confidence 55-80, min 2 boundaries. With the repository 8-point tolerance, truth 37 is inside the expanded truth band, but the label is a strict Q-BE1 miss because `LEANING-FALSE` is not listed.
- Best exact local comparator remains `32f00bb32d644a909f0c99521e800536` (`MOSTLY-FALSE` 21/68). It is still stronger: better nominal truth calibration and more balanced evidence.
- Prior current exact reports `38655e2b60d24aaf93ea16d044d1a1c4` and `8e3c9b9d58304dfe9cb4705b5c67cb41` were high `MIXED` 52; `939563ec` is a material improvement.
- Deployed family variant `800431527e254d2888ef56ba23af4688` is German and not exact, but its `LEANING-FALSE` 29/59 shape supports that false-side edge reports can be acceptable family controls.

Assisted review result:

- Technical review: deploy-ready only as an operationally safer/current-watch improvement, and only after excluding the unvalidated prompt change. Do not call plastic fully closed.
- Report-quality review: conditional pass for release gating, not a new best comparator. `LEANING-FALSE` 37/62 is mostly an expectation metadata decision plus residual quality watch, not the same hard miss as `MIXED` 52.

Next gate:

1. Captain decision completed: `LEANING-FALSE` is accepted for plastic reports in English and other languages, and `939563ec` is a good report.
2. `benchmark-expectations.json` now includes `LEANING-FALSE` for `plastic-en` and expands the nominal truth band to 10-42.
3. Do not spend another immediate plastic job. Run one same-stack exact plastic repeat only if deployment approval requires a fresh job hash after the docs/expectation commit.
4. If future plastic reports regress to high true-side or support-tail proxy claims, investigate contradiction/refuting research direction before adding another prompt patch.
5. Budget accounting since the latest 8-job reset: 3 plastic jobs spent in this slice (`bbbbc491`, `7222f560`, `939563ec`); conservative remaining budget is 5.

### 12.22 Captain Plastic Expectation Acceptance - 2026-05-11

Captain explicitly accepted `LEANING-FALSE` as acceptable for plastic reports in English and other languages, and accepted exact current-stack job `939563ecbea14a4c90249eb13c9743ef` as a good report.

Expectation changes:

- `Docs/AGENTS/benchmark-expectations.json`: `plastic-en.expectedVerdictLabels` now includes `LEANING-FALSE`; nominal truth band is 10-42 so `939563ec` is in band without relying on the 8-point noise tolerance.
- `Docs/AGENTS/Captain_Quality_Expectations.md`: `plastic-en` moved into the good expectation/comparator set, with `939563ec` named as accepted current-stack exact and `32f00bb32d644a909f0c99521e800536` retained as the stronger historical exact comparator.
- `Docs/AGENTS/report-quality-expectations.json`: source note updated; no Q-code structural change needed.

Next gate:

1. No additional plastic job is needed for expectation acceptance.
2. If deployment validation needs one more current-hash run, spend at most one exact `plastic-en` repeat after commit/restart.
3. Otherwise use remaining budget on higher-value watch lanes, especially `asylum-235000-de` or Bolsonaro EN only if a no-edit review identifies a focused stability question.

### 12.23 Asylum Current Duplicate-Direction Consistency Patch - 2026-05-12

Context:

- Exact `asylum-235000-de` canary `9bde7fdbb0cf454896169e6844e9fb1b` on prompt hash `a8498978...` passed the Captain band as `LEANING-TRUE` 68/58.
- The report still had a semantic consistency defect: the same official SEM 2025 aggregate statement appeared twice via URL variants, once as `supports` and once as `contradicts`.
- The `contradicts` item's `directnessJustification` itself said the value exceeded the threshold and should support the claim.

Debt-guard decision:

- Classification: **incomplete-existing-mechanism**.
- Existing mechanism: `APPLICABILITY_ASSESSMENT` already performs claim-local LLM direction reassessment over the full evidence pool.
- Chosen option: amend the existing prompt contract.
- Rejected option: add a new post-applicability LLM adjudication pass. That may become necessary if live validation still shows conflicts, but it would increase mechanism count before exhausting the existing full-pool applicability pass.
- Rejected option: deterministic duplicate text/number matching or direction repair. That would violate the LLM-intelligence boundary for semantic direction decisions.

Implementation:

- Added an `Evidence-Pool Direction Consistency` rule to `APPLICABILITY_ASSESSMENT`.
- The rule says repeated materially identical evidence for the same AtomicClaim must not receive conflicting directions unless a scope, route, time, metric, or target difference explicitly changes the direction.
- The rule also requires the JSON `claimDirection` field to match the model's own correction/justification rather than leaving a contradicted field plus a narrative correction.
- Added prompt-contract coverage in `verdict-prompt-contract.test.ts`.

Verification:

- `npm -w apps/web test -- test/unit/lib/analyzer/verdict-prompt-contract.test.ts`: passed (`112` tests).
- `npm -w apps/web test -- test/unit/lib/analyzer/research-extraction-stage.test.ts`: passed (`67` tests).
- `npm -w apps/web test -- test/unit/lib/analyzer/claimboundary-pipeline.test.ts`: passed (`385` passed, `1` skipped).
- `npm -w apps/web run build`: passed and reseeded the claimboundary prompt (`86b44a3a9eeb...`).
- `git diff --check`: passed.

Next gate:

1. Commit before any live job.
2. Restart/refresh runtime prompt state before submitting a canary.
3. Spend at most one exact `asylum-235000-de` canary if Captain wants live confirmation of this prompt-only consistency patch.
4. If a new canary still shows duplicate conflicting directions, stop and debate a bounded LLM-backed evidence-pool consistency pass; do not stack deterministic matching or broad query changes.

### 12.24 Runtime And Timing Debt Register - 2026-05-12

Captain asked to preserve the timing issues found during the May 11/12 validation work so they can be addressed separately from report-quality fixes.

Observed current-stack timing:

| Job | Family | Result | Duration | Evidence / sources | Boundaries | LLM calls | Timing note |
|---|---|---:|---:|---:|---:|---:|---|
| `4e9aef50951c48f58c4c758fc5fe18a6` | `asylum-235000-de` | `MOSTLY-FALSE` 18/72 | 11.94 min | 23 / 19 | 5 | 29 | Failed quality canary; still near 12 min. |
| `9bde7fdbb0cf454896169e6844e9fb1b` | `asylum-235000-de` | `LEANING-TRUE` 68/58 | 13.89 min | 33 / 25 | 6 | 30 | Passed band; 32 normalized scopes and 6 boundaries made clustering/verdict nontrivial. |
| `38655e2b60d24aaf93ea16d044d1a1c4` | `plastic-en` | `MIXED` 52/68 | 23.04 min | 124 / 29 | 6 | 44 | Heartbeat fix prevented false stale failure but did not reduce duration. |
| `939563ecbea14a4c90249eb13c9743ef` | `plastic-en` | `LEANING-FALSE` 37/62 | 28.43 min | 144 / 34 | 6 | 51 | Good accepted report, but expensive in wall time and LLM calls. |
| `d174b136feff4e898b9ba394272cd7e3` | `asylum-235000-de` | `MOSTLY-FALSE` 15/78 | 15.51 min | 31 / 22 | 6 | 31 | Failed quality canary; confirms current local asylum jobs are still above old UX expectations even when evidence volume is moderate. |

Known or likely timing drivers:

- The current CB stack performs more LLM quality work than the older deployed expectation: Stage 1 contract validation/repair, multi-iteration research, evidence applicability/mapping, scope normalization, boundary clustering, multi-role verdict debate, grounding/direction validation, and narrative generation.
- Research fan-out is a major wall-time driver. In `9bde7fdb...`, the second research iteration expanded to multiple queries, many fetched sources, and per-source capped evidence after extraction. Some work is spent on items later dropped or neutralized.
- Scope normalization and clustering scale with the number of unique evidence scopes. The `9bde7fdb...` trace had 32 normalized scopes and clustering took roughly minutes, not seconds.
- Plastic reports are heavier because evidence volume is much larger: 124-144 evidence items, 29-34 sources, and 44-51 LLM calls in the two recent plastic runs.
- Google-CSE fallback 429s are not currently a verdict-quality failure, but they add latency/noise whenever Serper returns no usable results and `first-success` falls through to Google-CSE.
- Queue/concurrency settings can add user-visible waiting time when more than one job is active; earlier notes identified `FH_RUNNER_MAX_CONCURRENCY=1` as an operational queueing factor.
- The runner heartbeat fix addresses false stale failures during long late-stage spans; it is not a performance optimization.
- Product copy or user expectation around "2-5 minutes" is stale for current local CB validation depth. Recent local nontrivial jobs are closer to 12-30 minutes.

Later optimization plan, separate from quality fixes:

1. Build a small timing ledger from job events/metrics for at least the accepted comparator set, including phase durations, evidence count, source count, scope count, boundaries, LLM calls, and provider fallbacks.
2. Decide target budgets by report family and UI context: quick claim, heavy article/PDF, and benchmark validation should not share one ETA.
3. Attack no-quality-loss waste first: duplicate URL/source variants before fetch/extract, provider fallback noise, repeated extraction of mirrored artifacts, and work that is predictably dropped by per-source cap.
4. Profile scope normalization and clustering separately; consider batching, early scope consolidation, or caps only if report quality is preserved.
5. Review model-tiering only after phase timing data exists. Do not downgrade models blindly while report quality is still under validation.
6. Update UI progress/ETA messaging to current measured ranges until real optimizations land.

Do not mix this timing work into the active report-quality patch unless a timing issue causes an operational failure or changes verdict quality.

### 12.25 Post-Timing Canary Failure - 2026-05-12

After the timing note above was written, the exact `asylum-235000-de` canary `d174b136feff4e898b9ba394272cd7e3` finished on committed local `main` state:

- Commit under test: `238858acf98d45e180a21ec8a2b466c80f5e9900`.
- Prompt hash under test: `86b44a3a9eeb6f821416881c6839ce6fd0f95d5e5969d863c7131740beafe44a`.
- Result: `MOSTLY-FALSE` 15/78.
- Expected band: `LEANING-TRUE` or `MOSTLY-TRUE`, truth 58-75, confidence 40-70.
- Evidence/source shape: 31 evidence items, 22 sources, 6 boundaries, 31 LLM calls.
- Final evidence balance: 0 supporting / 1 contradicting / 30 neutral.
- Duration: 15.51 minutes.

Stop-rule status: **active**. Do not submit additional jobs from the remaining budget until this failure is classified and the next hypothesis is reviewed.

Failed-attempt classification:

- `238858ac` evidence-balance recomputation: **keep**. It fixes stale published metadata after applicability reassessment and is not implicated in the missing-source failure.
- `238858ac` / prompt hash `86b44a3a...` evidence-pool direction-consistency prompt patch: **keep as structural prompt-contract hardening, but quarantine its live-quality claim**. The failed canary did not include the duplicate 2025 aggregate source, so it did not validate whether the patch resolves duplicate conflicting directions. It also did not cause the failure surface, because acquisition never admitted the decisive 2025 aggregate.

Comparator trace against good current-stack exact report `9bde7fdbb0cf454896169e6844e9fb1b`:

| Dimension | Failed `d174b136...` | Good `9bde7fdb...` |
|---|---|---|
| First Stage 2 main query | `SEM Asylstatistik 2024 Gesamtbestand Personen Asylbereich` | `SEM Ausländer- und Asylstatistik 2026 aktueller Bestand` |
| Second main iteration | Repeated 2024 aggregate and then component/status queries | Included current 2026 route plus `SEM Jahresbericht Asylstatistik 2024 2025 Gesamtbestand Asylbereich` |
| Decisive source acquisition | Fetched `stat-jahr-2024-kommentar.pdf` and 2025/2026 partial component tables only | Fetched `stat-jahr-2025-kommentar-d.pdf`, `admin.ch` 2025 release, and current 2026 component pages |
| Decisive evidence | `226 706` year-end 2024 aggregate as contradiction | `235 057` year-end 2025 aggregate as support, with current 2026 absence caveated |
| Source-route failure point | No generated query targeted the latest complete annual aggregate artifact after the 2024 route dominated | One query explicitly bridged the annual-report family across 2024/2025 and admitted the 2025 aggregate |

Root-cause signal:

- The first confirmed divergence is upstream of verdict calibration and upstream of the new duplicate-direction prompt patch.
- The failed run's Stage 1 `expectedEvidenceProfile` preserved a current-snapshot contract, but its `sourceNativeRoutes` over-indexed on `SEM - Ausländer- und Asylstatistik 2024 (Jahresbericht, erschienen Juni 2025)` and omitted an explicit latest-complete annual aggregate route.
- Stage 2 then followed that route into 2024 aggregate evidence and later current component tables, without generating the successful comparator's annual-report query that covered both the prior and latest complete publication.
- The failure is therefore best classified as **source-route/current-aggregate acquisition instability**, not a verdict-side direction-consistency regression.

Next recommended plan:

1. No more live jobs until the next hypothesis is written and reviewed.
2. Do a no-edit inspection of Stage 1/Stage 2 prompt and code contracts for current-snapshot aggregate claims, focused on why "latest complete official aggregate artifact" is not mandatory enough when preliminary evidence names a stale publication.
3. If editing is justified, use `/debt-guard` and prefer one simplification-oriented change: make the existing current-snapshot query/profile contract consistently preserve both routes, (a) newest current/live route and (b) latest complete source-native aggregate artifact. Do not add domain-specific terms, deterministic semantic matching, or report-specific query hacks.
4. Only after commit/reseed/restart, spend at most one exact `asylum-235000-de` canary. Stop again on first family-band failure.

### 12.26 Primary-Source Refinement Gate Fix - 2026-05-12

Debt-guard classification:

- Symptom: `d174b136...` failed because it never acquired the latest complete official aggregate artifact.
- Existing mechanism: Stage 2 already has a bounded `primary_source_refinement` lane for current aggregate metric contracts.
- Failure mode: `claimNeedsPrimarySourceRefinement` could suppress that lane when deterministic text overlap treated stale/partial numeric primary-source evidence as coverage of the direct current aggregate metric.
- Chosen option: **amend existing mechanism**. For current aggregate metric contracts, always spend the existing bounded refinement pass instead of relying on token-overlap coverage to decide whether the current umbrella artifact is already present.
- Rejected option: add deterministic date, metric, or source-name matching to distinguish stale/current aggregates. That would deepen the semantic heuristic problem and violate the LLM-intelligence boundary.
- Rejected option: add a new post-hoc rescue pass. The existing refinement lane is the right mechanism; it was just being skipped.

Independent review:

- Explorer `Boole` confirmed the same diagnosis: the final 2024 aggregate was likely not the first suppressor because refinement only runs after the first main iteration, but earlier non-seeded official/methodology items with overlapping aggregate tokens could suppress the lane. The recommended fix was the same: for current aggregate contracts, return `true` and let the existing LLM-mediated refinement query run.

Implementation:

- `apps/web/src/lib/analyzer/research-orchestrator.ts`: current aggregate metric contracts now always request the bounded primary-source refinement lane.
- Removed the now-unused `hasConcreteCurrentPrimaryMetricCoverage` helper from the active path.
- `apps/web/test/unit/lib/analyzer/primary-source-refinement.test.ts`: updated the direct-primary-metric case to assert that stale/partial lookalike evidence does not suppress bounded refinement.

Verification:

- `npm -w apps/web test -- test/unit/lib/analyzer/primary-source-refinement.test.ts`: passed (`13` tests).
- `npm -w apps/web test -- test/unit/lib/analyzer/claimboundary-pipeline.test.ts`: passed (`385` passed, `1` skipped).
- `npm -w apps/web test -- test/unit/lib/analyzer/research-extraction-stage.test.ts`: passed (`67` tests).
- `npm -w apps/web run build`: passed; prompt reseed reported `0 changed`.
- `git diff --check`: passed.

Next gate:

1. Commit this code/test/doc change before submitting any live job.
2. Refresh/restart localhost if needed and confirm `/api/fh/version` reports the new commit.
3. Spend exactly one exact `asylum-235000-de` canary.
4. Stop if it is outside `LEANING-TRUE` / `MOSTLY-TRUE`, truth 58-75, confidence 40-70, or if it fails to run the refinement lane when the latest aggregate is still missing after first main iteration.

### 12.27 Stale Runtime Canary And Stage 4 Date-Awareness Finding - 2026-05-12

After commit `e51b85ed`, one exact `asylum-235000-de` canary was submitted:

- Job: `74747a1b258b4d7da7672804ec73bc46`.
- Input: `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`.
- Result: `MOSTLY-FALSE` 25/38.
- Duration: about 19 minutes (`2026-05-12T07:31:53Z` to `2026-05-12T07:50:44Z`).
- Runner metadata: `executedWebGitCommitHash` and `promptContentHash` were both `null`.
- Web listener PID `44288` had started at `2026-05-11T22:15:35+02:00`, before the `e51b85ed` web code change.

Classification:

- The job is **not valid as a clean verification of `e51b85ed`**, because the web runner process was stale and the job metadata did not record the intended commit or prompt hash.
- Keep `e51b85ed`; do not infer that the primary-source refinement change failed from this job alone.
- The job still provides useful diagnostic evidence: the active runtime did not run a `primary_source_refinement` ledger entry and the final narrative/reasoning remained temporally fragile.

Observed failure details:

- Stage 2 found current SEM March 2026 component artifacts, including `6-10`, `6-50`, `6-51`, and `2-30`.
- The final verdict hand-assembled a contested component calculation and treated broad/narrow category choice as false-side, rather than surfacing the Captain-expected official umbrella aggregate or using uncertainty/limitations.
- The earlier failed job `d174b136feff4e898b9ba394272cd7e3` exposed a cleaner date-awareness symptom: it narrated `zurzeit` as if end-2024 were the current anchor (`... lag Ende 2024 deutlich tiefer`) even though the runtime date was `2026-05-12`.

Root-cause addition:

- Stage 1, Stage 2 query generation, and Stage 2 extraction already expose `currentDate`.
- Stage 4 code injects `currentDate` into prompt variables, and Stage 5 narrative generation also passes `currentDate`.
- The Stage 4 prompt sections did not visibly expose the current date in `VERDICT_ADVOCATE`, `VERDICT_CHALLENGER`, `VERDICT_RECONCILIATION`, or `VERDICT_NARRATIVE`.
- This is best classified as **incomplete existing mechanism**: the date variable existed, but the verdict/narrative prompts did not show it to the LLM.

Reviewer input:

- Explorer `Gibbs` independently reviewed the finding and recommended the same lowest-net-complexity fix: add explicit `Current Date` fields and a generic runtime-date rule to Stage 4 verdict/narrative sections.
- Gibbs recommended waiting on further research/extraction prompt edits until a properly restarted canary tests `e51b85ed`.

### 12.28 Stage 4 Runtime-Date Prompt Patch - 2026-05-12

Debt-guard classification:

- Classification: **incomplete-existing-mechanism**.
- Existing mechanism: `currentDate` is already wired into Stage 4 prompt rendering and Stage 5 narrative rendering.
- Chosen option: amend the existing prompt contract to expose that variable and tell verdict/narrative roles how to use it for current/latest/present wording.
- Rejected option: add new date-aware code, deterministic evidence-age logic, or a separate post-hoc validator. That would increase mechanism count before using the already-wired prompt variable.
- Rejected option: edit Stage 1/Stage 2 query/extraction prompts again in the same slice. Those already contain explicit current-date contracts; stacking changes there before a clean restarted canary would mix hypotheses.

Implementation:

- `apps/web/prompts/claimboundary.prompt.md`:
  - `VERDICT_ADVOCATE` now exposes `Current Date` and warns not to describe a prior reporting endpoint as current unless evidence establishes it as the current decisive route.
  - `VERDICT_CHALLENGER` now exposes `Current Date` and challenges silent anchoring of current-status claims to older snapshots.
  - `VERDICT_RECONCILIATION` now exposes `Current Date` and requires older endpoints to be treated as stale/prior-period evidence unless established as current.
  - `VERDICT_NARRATIVE` now exposes `Current Date` and prevents prior endpoints from being narrated as current facts.
- `apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts` now verifies the Stage 4 debate sections and narrative section expose the runtime date and render the supplied date.

Verification:

- `npm -w apps/web run test -- test/unit/lib/analyzer/verdict-prompt-contract.test.ts test/unit/lib/analyzer/prompt-frontmatter-drift.test.ts`: passed (`119` tests).
- `npm -w apps/web run build`: passed and reseeded `claimboundary` prompt from file (`5737b5bab778...`).
- `git diff --check`: passed.

Next gate:

1. Commit the prompt/test/doc patch.
2. Restart localhost web/API with `scripts/restart-clean.ps1` so the runner uses the committed web code and reseeded prompt.
3. Verify both `http://localhost:3000/api/version` and `http://localhost:3000/api/fh/version` point at the intended commit where possible.
4. Submit exactly one exact `asylum-235000-de` canary.
5. Accept only if it lands in the Captain band and records a usable commit/prompt hash. Stop on any false-side/MIXED result, missing commit metadata, or missing refinement lane when the latest aggregate route is still unresolved after first main.

### 12.29 Clean Canary Failure And Refinement Candidate Patch - 2026-05-12

Clean restarted canary after `f2e70bfd`:

- Job: `2d72a002274f4606aa97d177d2d58344`.
- Input: `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`.
- Result: `MOSTLY-FALSE` 15/68.
- Duration: about 16 minutes (`2026-05-12T08:11:38Z` to `2026-05-12T08:27:48Z`).
- Result metadata inside `resultJson.meta`: commit `f2e70bfd5e412938daae3250723887879a38140e`, prompt hash `5737b5bab77852b7d6ce5ad1bb68b7e300e2f057e9f0b73dc2df62ec1abf8a31`.
- Official external check: the SEM 2025 annual commentary route exists and reports `Total Personen aus dem Asylbereich (inkl. RU)` as `235 057`; the report missed this decisive source and instead anchored on the 2024 `226 706` aggregate.

Failed-attempt classification:

- `e51b85ed` primary-source refinement always-run change: **keep direction, amend implementation**. The refinement branch started, but did not execute a refinement search after duplicate filtering.
- `f2e70bfd` Stage 4 runtime-date prompt patch: **keep**. The prompt fix is still needed, but it cannot correct a missing decisive 2025 source by itself.

Root cause:

- The event history proves the runner reached `Generating direct-source refinement queries for AC_01...`.
- `claimAcquisitionLedger.AC_01` contains only `main`, `contradiction`, and `contrarian` iterations; `searchQueries` contains no `focus: refinement`.
- Side-agent review (`Boole`, `Gibbs`) agreed on the failure mode: the refinement branch generated candidates, then `filterUnsearchedClaimQueries` likely removed them all as duplicates. Because the code only records telemetry inside `selectedRefinementQueries.length > 0`, the refinement lane silently disappeared.
- This explains why the next steps fell back to contradiction/current-component routes and never recovered the latest complete annual aggregate artifact that the good comparator reached.

Debt-guard decision:

- Classification: **incomplete-existing-mechanism**.
- Chosen option: amend the existing bounded refinement mechanism.
- Rejected option: add asylum/SEM-specific query fallbacks or deterministic date/source-name matching. That would violate generic-by-design and LLM-intelligence rules.
- Rejected option: stack another prompt change before fixing the structural no-op path.

Implementation:

- `apps/web/src/lib/analyzer/research-orchestrator.ts` now asks the LLM for a small refinement candidate pool larger than the execution budget, then still executes only the configured refinement budget after duplicate filtering.
- If all generated refinement candidates are removed or none are generated, Stage 2 now records an explicit refinement ledger entry with `primary_source_refinement:no_unsearched_query` or `primary_source_refinement:no_query_generated`.
- `apps/web/test/unit/lib/analyzer/primary-source-refinement.test.ts` adds coverage for the duplicate-first-candidate case and the all-duplicate/no-selected telemetry case.

Verification:

- `npm -w apps/web run test -- test/unit/lib/analyzer/primary-source-refinement.test.ts`: passed (`15` tests).
- `npm -w apps/web run test -- test/unit/lib/analyzer/primary-source-refinement.test.ts test/unit/lib/analyzer/verdict-prompt-contract.test.ts test/unit/lib/analyzer/prompt-frontmatter-drift.test.ts`: passed (`134` tests).
- `npm -w apps/web run build`: passed; prompt/config reseed reported `0 changed`.

Next gate:

1. Commit this code/test/doc patch before any new live jobs.
2. Restart localhost web/API and verify version endpoints report the new commit.
3. Spend exactly one exact `asylum-235000-de` canary.
4. Accept only if it reaches `LEANING-TRUE` / `MOSTLY-TRUE` within the Captain band, or stop and diagnose if it still misses the 2025 aggregate or records `primary_source_refinement:no_unsearched_query`.

### 12.30 Refinement Route Priority Patch - 2026-05-12

Canary after `377397a9`:

- Job: `fac58feea8114d5197fadf8221cace00`.
- Result: `LEANING-TRUE` 62/52, inside the Captain label/truth/confidence band.
- Runtime: about 13.5 minutes (`2026-05-12T08:54:13Z` to `2026-05-12T09:07:44Z`).
- Result metadata: commit `377397a9ad0a84ba92ae8d5bf70e4ab394596131`, prompt hash `5737b5bab77852b7d6ce5ad1bb68b7e300e2f057e9f0b73dc2df62ec1abf8a31`.
- Refinement lane: executed and recorded `primary_source_refinement:recovered_non_seeded_primary_coverage`.

Quality verdict:

- **Not deploy-quality yet**, despite the true-side label pass.
- The report did not admit the official SEM 2025 annual aggregate `235 057`.
- The only supporting evidence was a NZZ secondary article (`Die Schweiz beherbergt mittlerweile über 235 000 Geflüchtete`).
- The final reasoning/narrative said no official SEM aggregate was directly found and leaned on component arithmetic / plausibility, which violates the Captain expectation that this family surface one clean official SEM aggregate total.

Failed-attempt classification:

- `377397a9` refinement dedupe patch: **keep**. It fixed the no-op branch: the live job did execute a refinement search.
- Live-quality claim for `377397a9`: **quarantine**. The patch repairs one mechanism but does not recover the decisive annual aggregate route.

Root cause:

- The `GENERATE_QUERIES` prompt contained a priority conflict:
  - It correctly says current-snapshot runs should cover both the newest current/live route and the latest complete source-native artifact.
  - But it also said that if only one query is returned, it should prioritize the newest current route.
- For refinement after current/live routes already yielded component tables, that one-query priority is wrong: it should first target the latest complete source-native aggregate artifact.

Reviewer input:

- `Boole` independently diagnosed the same prompt-priority issue and recommended a prompt-only refinement-specific rule.
- `Gibbs` identified a possible next code improvement: enrich the query generator's claim-local evidence summary so the LLM sees source titles/statements/temporal scopes, not just counts and methodologies. This is not applied in this slice because it is a larger context mechanism; reserve it for the next verifier if the prompt-priority fix is insufficient.

Implementation:

- `apps/web/prompts/claimboundary.prompt.md`:
  - Current-snapshot one-query priority now applies **outside refinement**.
  - Refinement on current-snapshot claims with a `primaryMetric` now says the first executable refinement query should target the latest complete source-native official/institutional publication, data artifact, table, annex, or recurring report likely to carry the complete `primaryMetric`, with `freshnessWindow: none`.
  - It explicitly says not to spend the first refinement query on a generic current landing page, live dashboard, update stream, or component-only route unless that route itself is likely to expose the complete decisive metric.
- `apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts` updated the query-generation contract assertions.

Verification:

- `npm -w apps/web run test -- test/unit/lib/analyzer/verdict-prompt-contract.test.ts test/unit/lib/analyzer/prompt-frontmatter-drift.test.ts`: passed (`119` tests).
- `npm -w apps/web run build`: passed; prompt reseed updated `claimboundary` prompt hash prefix to `2e9f20dea67b...`.

Next gate:

1. Commit this prompt/test/doc patch.
2. Restart/reseed localhost and confirm the version endpoints report the new commit.
3. Spend exactly one exact `asylum-235000-de` canary.
4. Accept only if it admits an official SEM aggregate source for the decisive value, not merely a secondary-source or component-arithmetic true-side result.
5. If it still misses the official aggregate, stop and consider Gibbs's proposed evidence-summary context patch rather than adding another prompt rule.
