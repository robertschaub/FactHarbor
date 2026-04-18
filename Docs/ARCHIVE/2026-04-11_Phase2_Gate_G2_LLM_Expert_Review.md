---
title: Phase 2 Gate G2 — LLM Expert Independent Review
date: 2026-04-11
reviewer: Claude Opus 4.6 (1M), LLM Expert role (subagent)
parent: Docs/WIP/2026-04-11_Phase2_Gate_G2_Replay_Plan.md
status: Review complete — Lead Architect response pending user direction
verdict: APPROVE WITH MODIFICATIONS (4 required + 3 strongly recommended)
---

# LLM Expert Independent Review — Gate G2 Plan Rev 2

Verbatim output from the LLM Expert subagent invoked on 2026-04-11 to independently review the Gate G2 replay plan before any jobs run.

## Final verdict: APPROVE WITH MODIFICATIONS

Four items must change before any job runs; three more are strongly recommended.

## Required before approval

### 1. Commit-count labels are wrong
- **C2 → C1 is 8 commits**, not 3. The plan names `d1677dd3 + f349cc84 + Option G`, but the interval actually contains: `94f1351b, 82d8080d, e6959951, f349cc84, e59d6f19, 69642ef0, ee456022, d1677dd3`.
- **Specifically, C1 (`94f1351b`) is itself a prompt change** — "downgrade comparator evidence to contextual". C0 vs C1 does NOT isolate Option G alone — it isolates Option G + comparator downgrade.
- **`e59d6f19` (Apr 8 22:24)** — "scope-of-truth rule + block self-consistency rescue on polarity mismatch". The Lead Architect attributed the polarity-mismatch code to d1677dd3; the commit message suggests it may actually have landed here. This affects the diff-read attribution.
- **C3 → C2 is 5 commits**, not 3. Missing from the plan: `70d4b9b3` (another Stage 1 proposition-anchoring strengthening) and `008918dc` (code review cleanup with prompt changes).
- **Fix:** either swap C1 to `82d8080d` (Apr 9 17:01, last pre-prompt-change code) OR relabel comparisons honestly.

### 2. R2 at 3 runs/commit is insufficient
- R2's empirical distribution is **tri-modal** per the 2026-04-10 Empirical Addendum: fused (~32), reified (~65-86), never-attempted (~93).
- At 3 runs, if the "good fused" mode has frequency 0.25, **~42% chance of zero fused runs in any 3-run sample**. Commit-level deltas on R2 cannot be separated from mode-sampling stochasticity.
- **Fix:** either bump R2 to 5 runs/commit (+10 jobs, ~$2–4.50) OR demote R2 to qualitative-only ("did contract enforcement land?") and do not attempt commit-level comparison on R2.

### 3. Missing measurements the plan doesn't capture
- **Option G cap-trigger rate** per commit. The ±30pp `maxDeviationFromBaseline` guard is "plumbing *if it rarely fires*". If it fires >10% on conflict jobs, it's acting as a semantic limiter, not a sanity rail. Count triggers per commit.
- **Wave 1A safeguard termination count** per commit, **split by reason** (contract-failure vs. validator-unavailable). Without this split we cannot tell whether replay numbers changed because quality changed or because more runs terminated.
- **`anchorOverrideRetry` trigger rate** per commit — tells us whether the uncommitted directness filter is firing more or less across history.

### 4. No stop rule for per-family regression
- If any commit-to-commit delta shows **≥15pp regression on any individual family's mean verdict**, the replay should pause and the window be targeted-bisected before proceeding. The plan does not say when to pause.

## Strongly recommended (not blocking)

### 5. 5-run variance baseline on HEAD first
Before the replay starts, run R2, R3, R3b, R9 × 5 on HEAD. Use observed stdev to validate that 3 runs/commit gives statistical power. If R2's HEAD variance has changed materially from the 4 original jobs (which it might, given the uncommitted Wave 1A safeguard), the baseline premise fails.

### 6. Capture `thesisRelevance` presence per run
So we can tell whether the uncommitted directness filter is running against a field the validator LLM actually produces or falling through to the default (which would mean the filter is a no-op in practice).

### 7. Acknowledge C3 → C2 scope limitation in the plan
The empirical addendum **withdrew** the Gate-1 anchor-exemption proposal. So C3 → C2 measures prompt-rule additions (one axis of F1). It does not address the Gate 1 anchor-context question — that fix was never made. The plan should explicitly say: "C3 → C2 measures prompt-rule changes, not F1/F2 as a whole." Otherwise a flat C3 → C2 result may be mis-read as "F1 is unfixed" when it was never attempted.

## The Wave 1A safeguard dilemma (important)

The LLM Expert flagged **three over-termination risks** with the uncommitted Wave 1A safeguard:

1. **Contract validator LLM transient failure.** Previously the fail-open said "assume OK" → run ships. New behavior: `preservesContract: false → terminate`. This is an **availability regression** — the user's run gets killed because the LLM was flaky, not because the claim set is broken. Needs a separate warning type `contract_validation_unavailable` at severity `warning` (not `error`), and ideally a third retry with backoff.

2. **New termination path from LLM-field self-contradiction.** If the contract validator returns `thesisRelevance: "tangential"` on a claim it also cites as the anchor carrier, the filter drops it → `noValidIds` → `anchorOverrideRetry` → retry → potentially "retry exhausted → terminate". This is a new failure mode.

3. **Legitimate tangential-anchor cases.** Inputs where the core thesis is itself a sub-thesis — the new filter assumes this is always wrong. Needs at least one round of testing.

**The critical finding for the replay itself:**

> *"Do not commit the Wave 1A safeguard as-is for the replay. Either (a) commit with `contract_validation_unavailable` warning-type distinction, or (b) do not commit the safeguard and run the replay on the same fail-open behavior that produced the 4 R2 reference jobs. Running the replay with the safeguard as-written will produce data that isn't apples-to-apples with the R2 baseline — which is exactly the thing the input-set doc is trying to preserve."*

## Concurrences with the Lead Architect

The reviewer explicitly **agreed** with:

- Dropping C5 (pre-Phase-2) — "the right call" given the Apr 10 scope
- The diff read on `d5ded98f` (Option G) as LLM-led replacement of deterministic dominance — "concur: plumbing, not semantic adjudication" (with the caveat to monitor cap-trigger rate)
- The diff read on `d1677dd3` lines 1669–1678 as legitimate structural plumbing (polarity-mismatch schema guard)
- The diff read on `d1677dd3` lines 1680–1693 as a Q-AH1 violation (hemisphere-ratio adjudication)
- `isVerdictDirectionPlausible` Rules 1–3 as a pre-existing F6 violation
- The input set coverage for the stated criteria
- The R2 phrasing choice (`unterschreibt`)

**One amendment:** the Lead Architect proposed refactoring only `getDeterministicDirectionIssues` lines 1680–1693. The reviewer says this is a **half-refactor**. The correct scope is:
- Delete hemisphere rules from BOTH `getDeterministicDirectionIssues` lines 1680–1693 AND `isVerdictDirectionPlausible` Rules 1–3
- Delete the `directionMixedEvidenceFloor` UCM config field (it should not exist as a tunable because the rule it tunes should not exist)
- Delete the self-consistency rescue boost from `db7cdcf8` (Mar 27)
- Keep only the polarity-mismatch early-return in `isVerdictDirectionPlausible`
- Replace the deleted rules with an LLM re-validation call that has access to verdict, cited evidence, and original validator reasoning

## New finding the Lead Architect missed

The Apr 8 commit **`70d4b9b3`** ("strengthen proposition anchoring checks") may **double down on the F1 failure side** without reconciling against the competing rule. F1 flagged rule 190 ("no inferred normative claims") vs rules 162–166 (modifier preservation) as the structural conflict for `rechtskräftig`. `70d4b9b3` appears to harden rule 190-area content without adding a reconciliation clause. **If R2 regresses on C0 vs C3, `70d4b9b3` is a prime suspect.** The Lead Architect did not read this commit's diff.

The reviewer also flagged: **PRM1 from F1** ("delete duplicated anchor-preservation re-statements") is **not visible in the uncommitted prompt diff** — the diff adds `thesisRelevance` gating but does not remove the duplicated restatements. Prompt accretion is still accreting.

## Risk assessment: uninterpretable data

**High risk on two axes:**
- **R2's tri-modal distribution at 3 runs** makes commit-level deltas untrustworthy
- **C2 → C1 covers 8 commits on 3 different pipeline stages** — a positive or negative delta will not attribute to any single change

The plan says "if ambiguous, bisect later". The reviewer's concern: "almost every result could be ambiguous and bisect-later becomes the whole follow-up phase". This is the single biggest interpretive risk in the current plan.

## Bottom line

> *"This is a serious, well-structured plan that does most things right. The execution protocol is sound, the safety story is clean, and the architectural refactor items the plan queues are well-identified. The four required modifications above are about making the plan's labels match its contents (commits-per-window), making statistical power match distribution shape (R2 runs), capturing the measurements that tell you whether the 'plumbing' is really plumbing (cap/safeguard trigger counts), and giving the replay a pause button (stop rule). With those in, approve. Without them, the resulting data will have ambiguity built in from the start, and the Phase 3 Change Impact Ledger — which this replay is supposed to feed — will inherit that ambiguity. The replay is worth running. Make these four changes, then run it."*

---

**End of LLM Expert review.** Response to be handled by Lead Architect in the next turn with the user.
