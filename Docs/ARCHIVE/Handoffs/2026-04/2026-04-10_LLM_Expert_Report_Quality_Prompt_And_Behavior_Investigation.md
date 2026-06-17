---
### 2026-04-10 | LLM Expert | Claude Opus 4.6 (1M) | Report Quality — Prompt & LLM-Behavior Investigation
**Task:** Independent LLM/prompt-perspective deep review of current report quality, using job `9dab007670434245a3b76fa405066989` as one case study but treating it as a manifestation of wider prompt, schema, control-flow, UI, and accretion problems.
**Files touched:** This handoff only. Investigation, not implementation.
**Key decisions:** I deliberately separate prompt failures from schema failures, control-flow failures, UI honesty problems, and accretion problems. I do not propose more prompt text where the actual fix is enforcement. Where prompt changes are recommended, I propose **fewer, sharper** rules and **deletions** alongside additions.
**Open items:** Captain decision on (a) what should happen on a verified contract-failure (retry / degrade / fail) and (b) whether to allow Gate 1 to receive contract-validator context (cross-stage data flow). Both are needed before Phase 1 implementation.
**Warnings:** Do not "fix" this by adding more rules to `CLAIM_EXTRACTION_PASS2`. The current Pass 2 is already attention-saturated and contains rules that **structurally compete** for the case the user is complaining about. More text will not help; reconciliation and removal will. Do not interpret `9dab` as a pure Stage-5 or aggregation problem — Stage 5 never had the right claim set in the first place.
**For next agent:** Start at F1, F2, and F3 below. Then NP1 + NP2 are the smallest combined change that fixes the user's primary complaint without adding new prompt scar tissue.
**Learnings:** Yes — appended summary at end.

---

## Scope and method

This review used:
- direct reads of `claim-extraction-stage.ts`, `verdict-stage.ts`, `grounding-check.ts`, `confidence-calibration.ts`, `CoverageMatrix.tsx`, `apps/web/src/app/jobs/[id]/page.tsx`
- direct reads of the relevant sections of `apps/web/prompts/claimboundary.prompt.md` (CLAIM_EXTRACTION_PASS2, CLAIM_CONTRACT_VALIDATION, CLAIM_VALIDATION)
- the three prior April 10 handoffs and the April 9 deterministic-hotspot review and March 30 quality-evolution analysis
- the persisted result for job `9dab007670434245a3b76fa405066989` (already extracted in the prior handoffs — I reused it rather than re-parsing the 39k-token JSON)

**Could not check:** the deployed (`factharbor.ch`) UI behavior. The prior handoff confirmed it resolves to docs, not the live report UI. I do not guess at deployed differences.

I treat the prior handoffs as **co-evidence**, not as a frame to inherit. Where I agree, I confirm. Where I extend, I say so explicitly.

---

## Findings — severity ordered

### F1 — CRITICAL — Pass 2 contains two structurally competing rules that drive the rechtskräftig failure

**Severity:** Critical • **Root cause:** **Mainly prompt** (rule conflict) — and the prompt rule conflict is what makes the downstream problems hard.

**What is happening.** `apps/web/prompts/claimboundary.prompt.md` lines 162-166 instruct the model to identify and **preserve** truth-condition-bearing modifiers in at least one direct atomic claim, including a self-check question for the case where the modifier changes the proposition's truth conditions. Line 190 instructs the model to **never** extract claims about legality, constitutionality, validity, or "binding" effect unless the input itself uses those words.

`rechtskräftig` is a German legal-finality adverb. Its meaning is *"with binding legal effect"*. It is **simultaneously** a truth-condition-bearing modifier (rule at 162-166) **and** a normative/legal/binding concept (rule at 190). The two rules are not reconciled and have no precedence statement.

The model resolves this by doing the only thing it can do: it splits the modifier into a separate side-claim that contains the legal-effect framing. That is exactly what the persisted `preFilterAtomicClaims` shows — `AC_03: "Die Unterzeichnung des EU-Vertrags durch den Bundesrat hat rechtskräftige Wirkung."` This is not the model failing the prompt; it is the model satisfying both rules in the only structurally available way.

**Why it matters.** The shape Pass 2 produces — chronology pair + standalone legal-effect side-claim — is **the wrong shape for Gate 1**. Gate 1 then strips the side-claim (see F2), and the contract collapses. So the failure is seeded at the prompt level even though the contract validator and the post-Gate-1 re-check both correctly detect it later.

**Why a "preserve in a fused direct claim" instruction is missing.** The current rule says "at least one direct atomic claim must preserve" the modifier. It does not say "the modifier should be **fused** into the primary direct claim." The model reads "supporting sub-claim" and "anchor preservation" as license to externalize. The control case `05be66ca` (which the prior handoffs correctly identify as the only well-shaped Swiss-family run) shows that fusion is what works; the prompt does not currently bias toward fusion.

**Root cause classification:** **Mainly prompt**, **secondarily control-flow**. A prompt fix here is necessary but not sufficient — without F2 and F3 fixes, Gate 1 will still strip an isolated anchor claim, and the pipeline will still ship the broken set silently.

---

### F2 — CRITICAL — Gate 1 evaluates fidelity per-claim with no contract-validator context

**Severity:** Critical • **Root cause:** **Mixed** — control-flow data-flow gap + prompt rule has no anchor-aware exception.

**What is happening.** `CLAIM_VALIDATION` (Gate 1) at lines 449-499 of the prompt evaluates each claim against `passedFidelity` independently. The rule says: "Fail when the claim adds evidence-derived specifics not stated or inherently implied by the input." Gate 1 receives the input text and the claim list — and **nothing else**. It has no view of:
- the truth-condition anchor identified by the contract validator
- the contract validator's preservation decision
- which claim the contract validator cited as the anchor carrier

So when Pass 2 produces a standalone `AC_03` carrying `rechtskräftig`, Gate 1 sees a claim with the words "rechtskräftige Wirkung" and reasons (correctly, in isolation) that this looks like an injected legal-effect dimension. The persisted `gate1Reasoning` confirms this exact path: `passedFidelity: false`, `reasoning: "introduces a legal-effect dimension not present in the input"`.

The Gate 1 prompt's fidelity exception for ambiguous-predicate dimensions (line 465) is the wrong shape for this case — it covers proxy dimensions of an evaluative predicate (`useless` → `economically useless`), not modifier preservation.

**Why it matters.** Gate 1 is the only stage in the pipeline that can independently strip claims based on per-claim text alone. When the only anchor-preserving direct claim is a modifier-only side-claim, Gate 1 always wins against the contract validator. This is true even when Pass 2 does the right thing.

**Root cause classification:** **Mixed** — half control-flow (the cross-stage data-flow gap: contract validator's anchor info doesn't reach Gate 1), half prompt (the fidelity rule has no exception for "this claim is the contract anchor").

---

### F3 — CRITICAL — Stage 1 contract enforcement is observational, not operational

**Severity:** Critical • **Root cause:** **Pure control-flow**. No prompt change can solve this.

**What is happening.** [claim-extraction-stage.ts:645-686](apps/web/src/lib/analyzer/claim-extraction-stage.ts#L645-L686). After Gate 1, if the final accepted claims differ from the previously validated set, the code re-runs `validateClaimContract()` and refreshes `contractValidationSummary`. There is **no branch** on `preservesContract === false`. The function falls through to `return` at line 690 regardless of the refreshed summary.

The persisted `contractValidationSummary` for `9dab` literally says `preservesContract: false`, `rePromptRequired: true`, summary "Both claims omit 'rechtskräftig'... No claim preserves it." The pipeline read this string into the result envelope and then proceeded to ship a `TRUE 86.9` article verdict.

**Why this is the most diagnosable defect in the entire pipeline.** Every other failure here is a multi-step inference: prompt rules competed, Gate 1 didn't have context, the matrix mixed semantics. This one is two missing branches in TypeScript. The system has a refreshed summary saying "broken" sitting in a variable, and the next line is `return`.

**Root cause classification:** **Pure control-flow**. No prompt change is on the critical path. The fix is roughly 30 lines of branch logic plus a new warning type.

---

### F4 — HIGH — Deterministic substring-based anchor preservation check is brittle and analytically meaningless

**Severity:** High • **Root cause:** **Code/control-flow** (deterministic semantic logic the LLM Intelligence mandate prohibits).

**What is happening.** [claim-extraction-stage.ts:1841-1866](apps/web/src/lib/analyzer/claim-extraction-stage.ts#L1841-L1866). `evaluateClaimContractValidation()` second-guesses the LLM's structured `preservedInClaimIds` decision with substring matching: `claimText.toLowerCase().includes(anchorLower)`.

This is exactly the deterministic-semantic logic flagged as Hotspot #1 in the April 9 review. It is brittle in three ways:
1. **Morphology.** `rechtskräftig` (root) vs `rechtskräftige` / `rechtskräftiger` / `rechtskräftiges` — German adjective declension is regular but `.includes()` only catches the root substring. It happens to work for `9dab` (`rechtskräftige` contains `rechtskräftig`), but `rechtskraeftig` (umlaut transliteration) would silently fail.
2. **Multilingual.** French `juridiquement contraignant`, plurals, contractions — none of these are reliably catchable by substring. The LLM Intelligence mandate is explicit: no English-only assumptions, no language-dependent string matching for analytical decisions.
3. **Analytically wrong contract.** The LLM already returns a structured `preservedInClaimIds` field with `preservedByQuotes`. The deterministic check exists because we don't trust the LLM. But re-checking the LLM with a less-capable substring rule is exactly what the LLM Intelligence mandate prohibits.

**Why it matters.** This is a clean deletion candidate. The LLM's structured output is the right contract; the substring check is a holdover from when the contract validator was less reliable. It also creates a false signal — when it disagrees with the LLM's structured judgment, the deterministic path wins.

**Root cause classification:** **Code/control-flow**. Replace with: trust LLM structured fields + structural ID validity check (`preservedInClaimIds` must reference IDs that exist in the claim list) + an optional LLM re-check on the final accepted claims if needed.

---

### F5 — HIGH — Coverage matrix mixes three different semantics in one display

**Severity:** High • **Root cause:** **UI/report honesty + schema** (no display-layer matrix model).

**What is happening.** [CoverageMatrix.tsx:93-115, 207-275](apps/web/src/app/jobs/[id]/components/CoverageMatrix.tsx#L93). The matrix displays:
- **Cells** colored by `cellVerdicts` — sourced from `cv.boundaryFindings` (boundary-local sub-verdict from Stage 4 advocate/reconciliation step). [page.tsx:1082-1100](apps/web/src/app/jobs/[id]/page.tsx#L1082).
- **Row headers and right-side row totals** colored by `dominantVerdict()` — picks the cell in the row with the highest evidence count and uses **its** color. This is not a boundary verdict; it is "the color of the noisiest cell in this row."
- **Column total cells** colored by `claimLevelVerdicts` — sourced from `cv.truthPercentage` (the **final repaired** claim verdict).
- **Corner cell + grand total** colored by `overallVerdict` (the article verdict).

These can — and in `9dab` do — diverge. `AC_01` boundary findings are 18/10/12 (false-side). `AC_01` final claim verdict is 75 (true-side). The matrix shows red cells in every boundary for `AC_01` **and** a green column total for `AC_01`. The user reads this as "the same claim is both true and false," and the user is correct to find that confusing.

**Why it matters.** The mismatch is not random; it is the visible signature of `verdict-stage.ts` repair logic running on the claim-level verdict without invalidating the stored `boundaryFindings`. Every time Stage 4 repair fires, the matrix becomes self-contradictory at the cell-vs-column level. The user has been seeing this on every difficult input.

**Root cause classification:** **UI honesty + schema gap**. The fix has two parts:
1. Stop using `dominantVerdict()` for row headers/totals — either persist a real boundary verdict, or color row headers neutrally.
2. After verdict-stage repair, recompute or invalidate stored `boundaryFindings`. The current data model has no concept of "this finding is now stale."

---

### F6 — HIGH — `isVerdictDirectionPlausible` is a deterministic adjudication layer next to the LLM

**Severity:** High • **Root cause:** **Code/control-flow** (deterministic semantic adjudication).

**What is happening.** [verdict-stage.ts:1561-1696](apps/web/src/lib/analyzer/verdict-stage.ts#L1561). The function combines:
- a **stable self-consistency rescue** path (if the verdict's consistency check is stable and there's no polarity mismatch, return true)
- **Rule 1**: hemisphere check — `truthPercentage >= 70` requires evidence ratio > 0.5 to count as plausible
- **Rule 2**: middle-ground flexibility — verdicts in 31-69 with mixed evidence pass automatically
- **Rule 3**: 15pp tolerance zone

This is deterministic adjudication of "is the verdict directionally correct?" running in arithmetic next to the LLM `VERDICT_DIRECTION_VALIDATION` prompt. The structural part (polarity-mismatch detection: a citation marked as supporting whose `claimDirection === "contradicts"` is structurally bad) is legitimate plumbing. The hemisphere/tolerance/ratio rules are not — they decide *meaning* with arithmetic.

**Why it matters.** This logic can rescue an LLM direction-validation failure and accept a verdict the LLM said was directionally wrong, based on weighted-ratio rules. It also fires before Stage 5 sees the result, so any rescue here changes what gets aggregated. Run-to-run, the same evidence can land on different sides of the hemisphere boundary depending on which evidence items got picked up — this is a hidden variance source.

**Root cause classification:** **Code/control-flow**. The replacement is: keep the structural polarity-mismatch detector (it is true plumbing), and replace the ratio/tolerance rescue with an LLM re-validation step that has access to the same evidence and reasoning the validator had.

---

### F7 — MEDIUM — Prompt accretion in `CLAIM_EXTRACTION_PASS2` is now a quality problem

**Severity:** Medium • **Root cause:** **Prompt accretion** + lack of a deletion track.

**What is happening.** Counting `CLAIM_EXTRACTION_PASS2` rules: ~75 rule lines, of which ~12 are marked **CRITICAL** in parentheses. Visible historical patches:
- Predicate strength preservation (rule with multi-line examples — clearly added during Plastik debugging)
- Truth-condition modifier identification → preservation → no decomposition without anchor retention → direct-claim anchor self-check → mandatory internal self-check (lines 162-165 + 244-248 — the same rule is stated **four times**, in slightly different framings, on different attentional axes)
- Shared-predicate decomposition fidelity (added during Swiss debugging)
- No counter-narrative claims (added during Muslims/comparative debugging)
- Facet convergence for comparative predicates (added during Plastik cross-language debugging)
- Claim count stability for ambiguous predicates (added during Plastik DE/EN/FR variance debugging)
- No inferred normative claims (added during legal/constitutional drift debugging)

Each of these was a real failure mode and each rule was a reasonable response. The problem now is that the rules are not reconciled with each other and they compete for the model's limited attention budget. F1 is the most visible casualty — but the same competition is plausibly behind some of the run-to-run decomposition variance across other families.

**Why it matters.** Adding more rules cannot fix the rechtskräftig case, because the case is *already* a casualty of two competing rules. The next quality wave should bias toward **deletion and reconciliation**, not addition.

**Root cause classification:** **Prompt accretion**. Concrete deletion / consolidation candidates listed in the recommendations.

---

### F8 — MEDIUM — Same-input variance is multi-stage and the dominant contributor is family-dependent

**Severity:** Medium • **Root cause:** **Mixed**.

This is not one variance source. The dominant contributor depends on the input.

| Family | Variance dominated by | Why |
|---|---|---|
| Swiss `rechtskräftig` (89pp) | **Stage 1 decomposition mode oscillation** (~55%) | F1 + F2 — Pass 2 produces dropped / isolated / fused modes across runs depending on which competing rule the model resolves toward |
| Plastik DE/EN/FR cross-lang (58pp) | **Stage 2 retrieval bias** (~70%) | Different language web-search returns directionally different evidence; not a Stage-1 problem |
| Bolsonaro (41pp) | **Stage 4 debate variance** (~45%) | Multi-call advocate/challenger with temperature; reconciler decision-point sensitivity |
| Hydrogen (51pp) | **Stage 1 tangential-claim drift** (~40%) + Stage 2 | Tangential claim about energy density inflates result |
| Flat Earth (50pp historical) | **Stage 1 classification oscillation** | `single_atomic_claim` vs `ambiguous_single_claim` swings |

Ranking by *broad* contribution to same-input variance across all families:
1. **Stage 2 retrieval / extraction stochasticity** (most families, hardest to fix — lives outside the prompt)
2. **Stage 1 decomposition mode oscillation** (Swiss + SRG/SSR + classification cases)
3. **Stage 4 debate / direction-rescue** (Bolsonaro and any case with mixed evidence)
4. **Stage 5 aggregation / repair** (compounds upstream variance, rarely the primary driver)

**Implication.** No single fix solves systemic variance. The Stage-1 fixes proposed below will materially help Swiss, SRG/SSR, and reduce one source of cross-family noise. They will not solve Plastik cross-language; that needs a Stage-2 source-balance intervention.

---

### F9 — LOW — Confidence calibration deterministic layers are legitimate plumbing

**Severity:** Low (no action needed) • **Root cause:** N/A — these are correct.

`confidence-calibration.ts` (band snapping, density anchor, verdict coupling) is exactly the kind of pure-arithmetic, structural plumbing the LLM Intelligence mandate's "KEEP" list authorizes. It does not interpret meaning; it reduces jitter. It is **not** a hotspot. I flag it here so future cleanup waves do not lump it in with F4/F6.

---

## Are prior analyses correct?

| Prior analysis | My assessment |
|---|---|
| Stage-1 contract enforcement is the highest-priority bug (all three April 10 handoffs) | **Confirmed.** F3. |
| Matrix mixes three semantics (all three handoffs) | **Confirmed and extended.** F5 — I add the mechanism: Stage-4 repair invalidates `boundaryFindings` without recomputing. |
| `f1a372bf` is not causal (all three handoffs) | **Confirmed.** Docs-only commit. |
| Deterministic anchor preservation is Hotspot #1 (April 9 review) | **Confirmed and extended.** F4 — I add that the LLM already returns the correct structured contract; the substring check actively second-guesses it. |
| Stage-4 direction rescue is Hotspot #2 (April 9 review) | **Confirmed.** F6. |
| Same-input variance is systemic across families (April 10 + March 30) | **Confirmed and re-ranked.** F8 — dominant contributor is family-specific; no single fix solves all of it. |
| The Swiss case is "Stage 1 still ships broken claim sets" (overarching handoff) | **Confirmed but incomplete.** This is true at the control-flow level (F3). It is not the *root* — the root is two competing prompt rules (F1) that produce the wrong shape, plus a Gate 1 that has no contract context (F2). Without F1+F2, F3 fixes by themselves will trigger retries that produce the same shape and still fail. |

The prior handoffs converged on the right symptoms and the right top priority. They under-emphasized that **the prompt itself biases toward the failure mode**. That is the addition I bring as LLM Expert.

---

## Recommendations

### Prompt changes recommended (sharp and few)

**PR1.** In `CLAIM_EXTRACTION_PASS2`, add an explicit precedence statement reconciling the truth-condition-anchor rule and the no-inferred-normative-claims rule. The precedence should be: when the user's own input contains a modifier whose meaning is the truth-condition anchor — even if that modifier carries normative or legal content — anchor preservation wins, and the modifier must be preserved in the **primary direct claim**, not externalized into a side-claim. State this once, sharply, and remove the duplicated re-statements (see PR4).

**PR2.** In `CLAIM_EXTRACTION_PASS2`, replace "at least one direct atomic claim must preserve" with "the primary direct claim must fuse the modifier with the action it modifies." The current "supporting sub-claim" framing reads as license to externalize. The control case `05be66ca` shows fusion is the correct shape; the prompt should bias the model toward fusion explicitly.

**PR3.** Pass the contract validator's `truthConditionAnchor` and `preservedInClaimIds` into the `CLAIM_VALIDATION` (Gate 1) prompt rendering, and add **one** sharp rule: a claim flagged as the contract anchor by the upstream validator is exempt from per-claim fidelity stripping; it can only be filtered for opinion or specificity. This is a small prompt addition but it requires NP2 (cross-stage data flow) to land first.

### Prompt changes I am explicitly NOT recommending

- More anchor-preservation re-statements. The rule is already in the prompt four times across Pass 2 and Contract Validation. A fifth re-statement will not change behavior.
- Domain examples. The CLAUDE.md / AGENTS.md rules forbid test-case-specific terms. PR1 must be domain-neutral.
- Tightening Gate 1 fidelity globally. That would over-strip in the common case. The fix is the per-anchor exception in PR3.

### Prompt removals / simplifications

**PRM1.** In `CLAIM_EXTRACTION_PASS2`, remove the "Direct-claim anchor test (required self-check)" at line 165 **and** the "Mandatory internal self-check before output" at lines 244-248 — both restate the anchor-preservation rule. Keep only the rule in lines 162-164 (or whatever PR1+PR2 produce). Repetition is not enforcement; it is attention-saturation.

**PRM2.** In `CLAIM_EXTRACTION_PASS2`, audit and consolidate the predicate-strength preservation rule (line 161) and the no-proxy-rephrasing rule (line 160). They overlap. Pick the one that captures both, delete the other.

**PRM3.** In `CLAIM_EXTRACTION_PASS2`, the Plurality override rule (line 138) and `multi_assertion_input` definition could be one rule, not two with overlapping triggers.

**PRM4.** Either delete the deterministic substring anchor check in `evaluateClaimContractValidation` (NP3) **or** delete the LLM `truthConditionAnchor` check in `CLAIM_CONTRACT_VALIDATION`. Currently both run and both make the same decision in different ways. Pick one. (Strong recommendation: keep the LLM, delete the deterministic.)

**PRM5.** The "facet convergence" rule and "claim count stability" rule (lines 170-171) were added during Plastik cross-language debugging. They did not actually solve the cross-language gap (it is a Stage-2 problem, not a Stage-1 one). They are good general guidance but they do not earn their attentional cost. Consider consolidating into one shorter rule, or moving them to a separate `AMBIGUOUS_PREDICATE_GUIDELINES` section that is conditionally included.

### Non-prompt changes required (the heavy lifting)

**NP1. (Critical, single-file change)** In `claim-extraction-stage.ts`, after the post-Gate-1 contract refresh at line 686, branch on `contractValidationSummary.preservesContract`. If `false`:
- **Allowed outcome A** — targeted retry with anchor-fusion guidance (preferred). Re-run Pass 2 with corrective guidance specific to the failure: "the previous extraction lost the truth-condition anchor at Gate 1; produce a single fused direct claim that combines the action with the modifier." Bound to one retry.
- **Allowed outcome B** — explicit degraded output with `error`-severity warning. The article verdict must not be presented as a normal high-confidence success.
- Add a new warning type `final_claim_contract_broken` and register it in `warning-display.ts`.
- Add tests asserting that on the `9dab`-style state (final accepted claims drop the anchor, contract summary says false), the pipeline does **not** produce a normal successful report.

**NP2. (Cross-stage data flow)** Pass `truthConditionAnchor` and `preservedInClaimIds` from the contract validator into `runGate1Validation()` so Gate 1 can render the per-anchor exemption rule (PR3). This is the smallest data-flow change that lets Gate 1 stop stripping the only anchor-preserving claim. Without this, PR3 has no effect.

**NP3. (Replace-then-delete)** Delete the deterministic substring/quote anchor check in `evaluateClaimContractValidation` (lines 1841-1866). Replace with: trust the LLM's `preservedInClaimIds` (which the schema already validates), plus a structural-only check that the cited IDs exist in the claim list. If additional confidence is wanted, run the LLM contract validator a second time on the final accepted set and trust **its** structured output. No substring matching.

**NP4. (Matrix honesty — two parts)**
- **Part A:** In `CoverageMatrix.tsx`, remove `dominantVerdict()`-based coloring for row headers and right-side per-row totals. Either color them neutrally, or persist a real boundary-level verdict in the result schema and use that. The current "color by the noisiest cell" semantics is not honest.
- **Part B:** In `verdict-stage.ts`, when claim-level repair changes a `truthPercentage`, either recompute the `boundaryFindings` for that claim or mark them stale and have the UI fall back to neutral. The current state lets `boundaryFindings` (false-side) and `truthPercentage` (true-side) coexist and contradict each other.

**NP5. (Replace deterministic semantic rescue)** In `verdict-stage.ts`, replace `isVerdictDirectionPlausible` semantic rescue rules (hemisphere / tolerance / mixed-floor) with an LLM re-validation step that has access to the verdict, the cited evidence, and the original LLM direction-validation result. **Keep** the structural polarity-mismatch detection — citations whose stored `claimDirection` contradicts their bucket label is true plumbing, not semantic adjudication.

**NP6. (Removal track)** Remove `articleVerdictOverride` dead config and deprecated dominance contract residue (already identified by prior handoffs). This is small but it shrinks the cognitive surface and makes the next debugging session faster.

---

## Variance contributor ranking — where prompt fixes help and where they don't

| Stage | Contribution to Swiss | Contribution to Plastik cross-lang | Prompt-tractable? |
|---|---|---|---|
| Stage 1 decomposition | ~55% (dominant) | ~20% | **Yes** — F1+F2+F3 fixes will materially reduce Swiss spread |
| Stage 2 retrieval / extraction | ~25% | ~70% (dominant) | **No** — provider non-determinism + extraction stochasticity. Needs source-balance intervention, not prompt change |
| Stage 4 debate / direction rescue | ~15% | ~5% | **Partially** — F6 (replace deterministic rescue with LLM re-validation) reduces rescue-induced variance |
| Stage 5 aggregation / claim weighting | ~5% | ~5% | **Partially** — currently amplifies upstream variance, less of a root source |

**Implication for the user's "report quality has declined" perception:** the perception is real but not because Stage 5 got worse. The Swiss-family experience dominates user perception because Swiss runs hit the F1+F2 prompt-rule conflict reliably, and every patch wave that added more rules to Pass 2 made the conflict more visible without solving it.

---

## Most important issues — five-line summary

1. **The user's primary complaint about `rechtskräftig`** is caused by two prompt rules competing in Pass 2 (F1), then Gate 1 stripping the anchor without contract context (F2), then the pipeline shipping anyway because there is no enforcement branch (F3). All three must be addressed; any one alone will not hold.
2. **The matrix red fields** are caused by the matrix mixing three different verdict semantics in one display, plus stale `boundaryFindings` after Stage-4 repair (F5). This is a UI/schema problem, not a verdict-calculation problem.
3. **Same-input variance** is multi-stage and family-dependent (F8). Stage 1 fixes will help Swiss and SRG/SSR materially. Plastik cross-language is a separate Stage-2 problem and should not be conflated with the Swiss fix.
4. **Code accretion is real** and now actively confuses debugging (F4, F6, F7). Two specific deterministic semantic hotspots are clean deletion candidates today (F4) or replacement candidates (F6).
5. **Prompt accretion is real** and is now contributing to the very problems the prompt patches were meant to fix (F1, F7). The next quality wave must include reconciliation and removal, not just additions.

---

## Implementation plan (recommended order)

### Phase 1 — Stop the bleeding (one focused branch + one warning type)

1. **NP1**: Branch on post-Gate-1 contract failure in `claim-extraction-stage.ts`. Hard route to retry-or-degrade. New warning type `final_claim_contract_broken` (severity `error`). Tests for the `9dab`-style state.

This is the smallest single change that prevents the user's primary failure mode from shipping silently. Estimated effort: small. Estimated impact: large for trust, partial for correctness (Phase 2 needed to actually produce a correct verdict).

### Phase 2 — Fix the prompt-level driver

2. **NP2** + **PR3**: Pass anchor info from contract validator into Gate 1 rendering. Add per-anchor fidelity exemption rule.
3. **PR1** + **PR2**: Reconcile the two competing rules in Pass 2. Bias toward fusion.
4. Same-input run battery on Swiss family: confirm decomposition mode no longer oscillates.

After Phase 2, the Phase 1 retry path should consistently produce a correct fused claim instead of degrading.

### Phase 3 — Replace deterministic semantic logic (LLM Intelligence mandate alignment)

5. **NP3**: Delete substring-based anchor check; trust LLM structured output.
6. **NP5**: Replace `isVerdictDirectionPlausible` semantic rescue with LLM re-validation; keep only structural polarity check.

### Phase 4 — Matrix honesty

7. **NP4 Part A**: Remove `dominantVerdict()`-based row coloring.
8. **NP4 Part B**: Recompute or invalidate `boundaryFindings` after claim-level repair.

### Phase 5 — Removal-first cleanup

9. **NP6**: Delete dead config (`articleVerdictOverride`) and dominance residue.
10. **PRM1-5**: Audit and consolidate Pass 2 prompt accretion. Remove duplicated rules.
11. **PRM4**: Choose one of the two duplicated anchor checks (LLM vs substring) and delete the other.

### Phase 6 — Variance discipline

12. Same-input run harness for the established families. Acceptance criterion before/after each future change wave. Track decomposition mode, evidence mix, boundary mix, claim verdict spread, article path. This prevents the next quality wave from being evaluated on single lucky/unlucky runs.

---

## What NOT to do

- **Do not add more "CRITICAL" rules to `CLAIM_EXTRACTION_PASS2`** without removing at least one. The prompt is attention-saturated.
- **Do not upgrade the Stage 1 model tier** in hopes of better adherence to competing rules. The rules are the problem, not the model. (Sonnet would resolve the F1 conflict the same way Haiku does, just more confidently.)
- **Do not try to fix Plastik cross-language with a Stage-1 prompt change.** That gap is a Stage-2 retrieval/source-balance problem. Different fix, different stage.
- **Do not patch `9dab` with a Stage-5 aggregation change.** Stage 5 never had the right claim set. Aggregation changes here would be solving the wrong problem and would introduce regression risk on the families where Stage 5 currently behaves correctly.
- **Do not mark this fixed by tests that only assert `contractValidationSummary` records the failure.** The current test suite already does this. The needed test asserts the pipeline must halt or degrade in that state.

---

## Open questions for the Captain

1. **NP1 outcome choice.** When the post-Gate-1 contract is broken, should the pipeline:
   - A) attempt one more retry with anchor-fusion guidance (most user-friendly, slightly higher latency), or
   - B) emit a degraded `UNVERIFIED`-style report with `error` severity (safer, less work), or
   - C) hard-fail the job (loudest, may surprise users)?
   
   My recommendation: **A then B**. One bounded retry, then degrade if still broken. Never silently ship.

2. **NP2 architectural question.** Allowing Gate 1 to receive contract-validator context creates a small cross-stage data dependency. Acceptable, or do you prefer Gate 1 stays input-only and the fix moves entirely to control-flow (skip Gate 1 strip when the stripped claim is the contract anchor)?
   
   My recommendation: **Pass the data through.** It is one more field on a render context, not a new abstraction.

3. **PRM4 ownership.** Deleting the deterministic substring check (NP3) is straightforward but it is a behavioral change in the contract-acceptance path. Want to do this in Phase 1 alongside NP1, or hold for Phase 3?
   
   My recommendation: **Phase 3.** Phase 1 should be the smallest change that stops the bleeding; do not bundle it with deletions.

---

## Learnings (appended to Role_Learnings.md)

- **Competing prompt rules are a structural failure, not a wording failure.** When a model is told (a) "preserve modifier X" and (b) "do not extract claims about Y" and modifier X happens to be a Y, the model will resolve the conflict in the only way the prompt allows — by externalizing the contradiction into a side-claim. No amount of additional "be careful" instructions fix this. The fix is precedence or reconciliation. Look for this pattern when investigating any "the model knows X but does Y" failure.
- **A deterministic substring check that re-evaluates an LLM's structured output is an anti-pattern.** If the LLM returns a structured `preservedInClaimIds` and you then re-check it with `claimText.includes(anchor)`, you have replaced LLM intelligence with a worse heuristic. Either trust the LLM and add a structural validity check (IDs exist), or have the LLM re-check. Do not substring-match across LLM judgments.
- **Stage 1 cascading: prompt → Pass 2 shape → Gate 1 strip → contract failure → silent ship.** When a quality investigation lands on "the contract validator detects the failure but the pipeline continues," check whether the contract validator's outputs reach downstream stages. Often the data is sitting in a result envelope that no one reads.
- **`isVerdictDirectionPlausible` and similar "rescue" functions are worth flagging on first read.** They look like robustness layers but they are deterministic adjudication of meaning. Test: is the function deciding "is this verdict directionally correct?" using arithmetic? If yes, it is the deterministic semantic adjudication the LLM Intelligence mandate prohibits.

---

## Files inspected

- [claim-extraction-stage.ts](apps/web/src/lib/analyzer/claim-extraction-stage.ts) — 2360 lines, key spans: 240-393, 645-686, 1832-1896
- [verdict-stage.ts](apps/web/src/lib/analyzer/verdict-stage.ts) — 2805 lines, key spans: 1347-1430, 1561-1696
- [grounding-check.ts](apps/web/src/lib/analyzer/grounding-check.ts) — 400 lines, full read
- [confidence-calibration.ts](apps/web/src/lib/analyzer/confidence-calibration.ts) — 370 lines, full read
- [CoverageMatrix.tsx](apps/web/src/app/jobs/[id]/components/CoverageMatrix.tsx) — 292 lines, full read
- [page.tsx](apps/web/src/app/jobs/[id]/page.tsx) — 3824 lines, key spans: 947-1111, 1868-1885
- [claimboundary.prompt.md](apps/web/prompts/claimboundary.prompt.md) — 1896 lines, full read of CLAIM_EXTRACTION_PASS2, CLAIM_CONTRACT_VALIDATION, CLAIM_VALIDATION
- Prior handoffs: 2026-04-10 Current_State, 2026-04-10 Overarching, 2026-04-10 Deep, 2026-04-09 Deterministic_Hotspots_Review, 2026-03-30 Report_Quality_Evolution
