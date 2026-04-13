# Phase 7 Charter — Salience-First Extraction

**Date:** 2026-04-13
**Status:** Design only. No code change until E1 measurement decides the path.
**Relation to prior work:** Supersedes the "deferred Opus / best-of-N" recommendation from the Phase 5+6 closure analysis at [Docs/WIP/2026-04-13_C16_R2_Combined_Replay_Analysis.md](2026-04-13_C16_R2_Combined_Replay_Analysis.md). Does not change any HEAD code.

## Captain's directive (2026-04-13, mid-charter)

> "Stop verifying older versions / commits. Continue working on main HEAD to improve report quality there."

**What this changes about the charter:**

- **Drop all pre-C16 / baseline comparisons.** The Phase 5+6 closure analysis already documented the pre-Phase-5 picture; there is no further value in re-running historical commits or maintaining a three-variant A/B/C experiment setup.
- **Each experiment lands on HEAD and is measured against the HEAD before it.** E1 lands → measure HEAD-E1. E2 lands on top of E1 (assuming E1 ships) → measure HEAD-E2. Linear iteration, not parallel cohorts.
- **Budget drops** from ~105 runs to ~35 runs per experiment (7 inputs × 5 runs). Sequential, not interleaved.
- **The decision tree simplifies** because there is no E1-vs-E2 cross-comparison to resolve — each experiment closes on its own terms before the next begins.

---

## Context

Phase 5 + Phase 6 (commits C6–C16) delivered targeted fixes for specific failure modes in the retry path and validator. On the R2-locked input, the HEAD aggregate rate is 1/6 full pass — indistinguishable from the pre-C16 baseline (4/25). See the [combined analysis doc](2026-04-13_C16_R2_Combined_Replay_Analysis.md) for the corrected numbers.

The residual failure mode is **extractor anchor loss**: the extractor (Haiku first attempt, Sonnet on retry) sometimes drops truth-condition-bearing modifiers from every claim it produces. The validator correctly flags the loss post-hoc; the repair pass (C11b) tries one narrow corrective LLM call and can also fail.

**User reframing that triggered this charter:**

> "I think this one is high priority and I don't see it as an edge case and it's not about just `rechtskräftig` — it's much more about to get LLM to understand what's most important in an input."

The reframe moves the problem from "R2 edge case" to a **class-level capability concern**: the pipeline asks the LLM to preserve truth-defining content without ever asking the LLM to explicitly commit to *what the truth-defining content is*. Salience is audited after the fact by the contract validator, not committed to up front. That inversion is the root of the class of failures.

The problem shows up with adverbials, qualifiers, modal operators, temporal markers, and quantifiers in any language — not just German legal adverbs. `only`, `mainly`, `approximately`, `allegedly`, `rechtskräftig`, `nur`, `vorläufig`, `angeblich` all sit in syntactic positions that summarization-trained decoders routinely strip.

## Hypothesis

Moving truth-condition identification **upstream of extraction**, as an explicit LLM commitment that the extractor operates under as a binding constraint, will materially reduce anchor-loss failures on inputs with non-trivial truth-condition-bearing content.

This hypothesis has two failure modes we need to test for:

- **H-false (cheap):** a prompt-level "think first, then extract" scaffold inside the existing Pass 2 closes the gap without any architectural change.
- **H-false-hard:** even a dedicated upstream stage drops salient content at a similar rate — the architectural move does not help. In that case the fix is Opus/best-of-N and this charter closes with a negative result.

## Experiments (run serially on HEAD, prompt-only first)

### E1 — Prompt-scaffold CoT preamble in Pass 2

**Mechanics:**
- One edit to [apps/web/prompts/claimboundary.prompt.md](../../apps/web/prompts/claimboundary.prompt.md), `CLAIM_EXTRACTION_PASS2` section.
- Add a CoT preamble **inside the system prompt** — an instruction to the model to **reason internally** about which words/phrases in the input change truth conditions if removed, and to let that reasoning constrain the atomic-claim decomposition that follows. The reasoning is purely internal (unstructured pre-decomposition deliberation inside the prompt flow) and is **not emitted as a new field**. This keeps Pass 2's existing `Pass2OutputSchema` ([claim-extraction-stage.ts:96](../../apps/web/src/lib/analyzer/claim-extraction-stage.ts#L96)) unchanged and keeps `Output.object({ schema: Pass2OutputSchema })` at [line ~1605](../../apps/web/src/lib/analyzer/claim-extraction-stage.ts#L1605) untouched.
- No schema change. No code change. Reversible via one `git revert`.

**What it tests:** can the existing Pass 2 prompt, with an internal salience-first reasoning scaffold, close the gap without any architectural move?

### E2 — Shadow Pass 0 salience stage

**Mechanics:**
- New file: `apps/web/src/lib/analyzer/stages/salience-stage.ts` (new stage, ~60 lines).
- New prompt section: `CLAIM_SALIENCE_COMMITMENT` in the same prompt file.
- Output schema: `{ anchors: [{ text: string, inputSpan: string, type: "modifier"|"predicate"|"threshold"|"temporal"|"modal"|"quantifier", rationale: string, truthConditionShiftIfRemoved: string }] }`.
- Wire into [apps/web/src/lib/analyzer/claimboundary-pipeline.ts](../../apps/web/src/lib/analyzer/claimboundary-pipeline.ts) post-Pass-1, **log-only**: the stage runs, writes its output to the job record (new optional field on the understanding block), and does NOT yet constrain Pass 2.
- New LLM call: +1 Haiku per run (~$0.001). Tier choice revisable after E2 measurement.
- Promote `truthConditionAnchor` to a shared type so Pass 0 and the existing validator both reference the same shape.

**What it tests:** does a dedicated single-task salience stage identify the anchors the extractor later drops? If yes on most failing cases, Pass 0 is viable as a binding input. If Pass 0 also drops them, the architectural hypothesis is wrong and we save the refactor.

**Multi-anchor support:** mandatory from day 1. Real inputs have multiple truth-condition modifiers ("only X may Y when Z"). Output is a list.

### Why serial, not parallel

Per Captain's directive, we iterate on HEAD rather than maintaining three variants in parallel. E1 is cheap and reversible — we land it, measure it, and decide whether to revert, keep as-is, or proceed to E2. If E1 closes the gap we skip E2 entirely. If E1 does not, E2 lands on top of the same HEAD and is measured against the post-E1 baseline. Each step is independently reversible.

## Input corpus for both experiments

Each input runs ×5 on the same build, measured independently. Corpus is split into **positive** inputs (contain at least one truth-condition-bearing modifier we expect Pass 0 to flag) and **negative-control** inputs (plain factual assertions with no non-trivial salient modifier; Pass 0 should return an empty or near-empty anchor list).

**Positive inputs (test recall + preservation):**

- **R2 (locked, German):** `Der Bundesrat unterschreibt den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben`
- **R2-plural (German):** `Nur rechtskräftige Urteile werden vollstreckt`
- **Reported-speech hedge (German):** `Die Behörde hat angeblich den Bericht unterdrückt`
- **Multi-modifier (English):** `Only qualified voters may participate when at least 60% turnout is reached`
- **Plain hedge (English):** `Approximately 30% of participants reported side effects` (or an equivalent from existing test set)

**Negative-control inputs (test Pass 0 precision — no salient modifier should be flagged):**

- **Plain factual (German):** `Der Bundesrat hat den EU-Vertrag unterzeichnet` — same subject/action as R2, modifiers stripped; Pass 0 should return an empty anchor list (or flag only the subject/action themselves, which do not pass the "removal changes truth conditions" test).
- **Plain factual (English):** `The parliament approved the budget on March 15, 2026` — date is not truth-condition-bearing in the sense Rule 12 targets (it's referential metadata, not a finality/modality/quantifier qualifier); ideal outcome is Pass 0 either emits no anchor or correctly classifies the date as `temporal` referential rather than as a critical modifier.
- **Plain assertion (English):** `Switzerland is a federal republic` — no modifiers, quantifiers, or qualifiers; Pass 0 should emit an empty anchor list.

7 inputs × 5 runs = **35 runs per experiment**, measured on the live HEAD after that experiment lands. Budget estimate ~$3–5 per measurement batch (E1 or E2). Total ≤ ~$10 if both land.

## Measurements

Per-run, record:
- Does the extractor output preserve the expected anchor(s) as verbatim substring in any claim statement? `preservesContract` and `validPreservedIds`.
- For E2: does Pass 0's emitted `anchors` list contain each expected anchor? And does downstream Pass 2 (unchanged) still drop it?
- LLM call count and wall-clock per run.
- `executedWebGitCommitHash` (so we can tie the result to the exact HEAD that produced it).

Per-experiment aggregate (on 35 runs, 25 positive + 10 negative-control):
- Gate-pass rate (validPreservedIds non-empty) on positive cohort.
- Full-pass rate (preservesContract=true AND verdict non-UNVERIFIED) on positive cohort.
- Negative-control contamination rate (contract-violation rate on plain factual inputs; ideally zero — any failure here is a regression, not a win).
- For E2: anchor-identification **recall** on positive cohort (did Pass 0 emit every expected truth-condition-bearing modifier?) and **precision** on negative-control cohort (did Pass 0 return empty or near-empty anchor lists on plain factual inputs?).

Exact-input filter (from the reviewer finding): all measurements use byte-identical `inputValue` matching, not substring preview matching.

## Decision tree after each experiment

Each experiment gates the next. No A/B/C cross-comparison.

### After E1 measurement (35 runs on HEAD-E1)

| E1 result | Next action |
|---|---|
| **Decisive PASS:** full-pass rate on positive cohort ≥ 60% AND negative-control contamination = 0% | **Ship E1.** Phase 7 closes with the prompt-scaffold fix. E2 not needed. |
| **Decisive FAIL:** full-pass rate ≤ 20% OR any negative-control regressions | **Revert E1.** The prompt-only intervention is insufficient and/or harmful. Proceed to E2 on clean pre-E1 HEAD. |
| **Ambiguous:** anything in between | **Keep E1 (do not revert), proceed to E2** on top of E1. The scaffold may be helping without closing the gap; leaving it in place gives E2 the best chance. Re-measure the full-pass rate after E2 to see if the combined intervention closes the gap. |

### After E2 measurement (35 runs on HEAD-E2, log-only — does NOT constrain Pass 2)

| E2 result | Next action |
|---|---|
| **Decisive PASS for Pass 0:** recall ≥ 80% on positive cohort AND precision ≥ 80% on negative-control cohort | **Proceed to Shape B** (binding Pass 0 + required `sourceSpan`). Phase 7b. |
| **Decisive FAIL for Pass 0:** recall ≤ 40% OR precision ≤ 40% | **Architectural hypothesis fails.** Close Phase 7 with negative result. Pass 0 concept is not reliable enough to serve as a binding input at this tier. Open Phase 7c scoped to Opus/best-of-N with the measurement as justification. |
| **Ambiguous:** anything in between | Treat Pass 0 as insufficiently reliable to serve as a binding input. Two options: (a) iterate on the Pass 0 prompt once and re-measure (**one lap only** — avoid prompt-tuning treadmill); or (b) close Phase 7 and fold the finding into Phase 7c's justification. Choose based on whether the misses and false-positives show a visible pattern (pattern → one fix lap; no pattern → close). |

Thresholds are locked *ex ante*. No post-hoc "was 55% good enough?" debate.

## Shape B (post-measurement, only if data supports it) — NOT COMMITTED YET

Documented here so the refactor footprint is transparent up front:

- Pass 2 prompt receives `<preCommittedAnchors>` block with hard directive: every anchor's `text` MUST appear verbatim as substring of at least one claim's `statement`.
- New required field on atomic claim output: `sourceSpan: string` — verbatim span from input the claim paraphrases. Forces emission order: span first, claim second. LLM Expert's strongest-effect intervention; makes dropping the anchor *ungrammatical*, not merely discouraged.
  - **Dependencies (reviewer-flagged):** this field addition requires matching changes to `Pass2AtomicClaimSchema` at [claim-extraction-stage.ts:70](../../apps/web/src/lib/analyzer/claim-extraction-stage.ts#L70) AND the `AtomicClaim` interface at [types.ts:824](../../apps/web/src/lib/analyzer/types.ts#L824). Downstream consumers of `AtomicClaim.statement` (Gate 1, contract validator, verdict stages, aggregation, UI rendering) are unaffected if `sourceSpan` is additive and optional-with-default during migration; breaking changes if required immediately. Phase 7b should make it optional first, gated by `SALIENCE_FIRST_MODE`, and promote to required only after a follow-up cleanup commit.
- Contract validator reframed from "discover anchor + audit preservation" to "audit commitment honored."
- C11b anchor-gated repair: stays; now targets a known list of anchors from Pass 0, not a single re-discovered one.
- C6 Sonnet retry: still fires on contract failure; less often because Pass 2 has upstream guidance.
- Schema migration: `truthConditionAnchor: {…}` → `truthConditionAnchors: [{…}]` (list), with a stored-record compatibility shim.
- Test surface: Gate tests, contract tests, C11b tests (~15–25 tests touch the anchor shape).
- Feature flag: `SALIENCE_FIRST_MODE` default off; enabled after E1+E2 validate.

## Non-goals for Phase 7

- **Not** a validator correctness refactor. The validator's role changes from discovery to audit, but its prompt quality remains a separate workstream.
- **Not** an Opus escalation. Tier choice is a separate lever measured only after Phase 7 evidence (E1+E2) is in.
- **Not** a Gate 1 rework. Gate 1 already stabilized in C13; it stays as opinion/specificity only.
- **Not** a user-facing verdict-schema change. All of Phase 7 is upstream of verdict generation.

## Success criterion for the Phase 7 charter itself

**Phase 7 is "complete" when we have data that decisively routes us to exactly one of the four outcomes in the decision tree.** Shipping Shape B is optional and conditional. Closing with a negative result (and a concrete case for Opus/best-of-N) is equally valid — the goal is a decision, not an outcome.

## Implementation order (strict, serial on HEAD)

1. **Charter committed** (done).
2. **Land E1** as one prompt edit to `CLAIM_EXTRACTION_PASS2`. Single commit. Reversible.
3. **Run E1 measurement: 35 runs on HEAD-E1.** Record results in `Docs/WIP/2026-04-1X_Phase7_E1_Measurement.md`.
4. **Decide per the E1 decision tree**:
   - PASS → ship, Phase 7 closes.
   - FAIL → revert E1, HEAD returns to pre-E1, proceed to E2.
   - Ambiguous → keep E1, proceed to E2 on top of E1.
5. **Land E2** as a shadow stage (~60 lines + 1 prompt file + 1 wire-up, log-only). Single commit. Feature-flag off.
6. **Run E2 measurement: 35 runs on HEAD-E2.** Record in `Docs/WIP/2026-04-1X_Phase7_E2_Measurement.md`.
7. **Debate the E2 result** (LLM Expert + Architect).
8. **Decide per the E2 decision tree.** If Shape B: open as Phase 7b with its own charter.

No pre-C16 replays. No three-variant cross-runs. Each measurement batch characterizes HEAD as it stood when the batch ran, identified by `executedWebGitCommitHash`.

## Rollback path

- E1: `git revert` the prompt edit. Zero downstream surface.
- E2 (shadow): `git revert` the stage wire-up. The stage file can stay (dead code) or be removed in the same revert.
- Shape B (if taken): feature flag off, then `git revert` if quality regresses on non-R2 inputs.

## Files referenced

- [apps/web/src/lib/analyzer/claim-extraction-stage.ts](../../apps/web/src/lib/analyzer/claim-extraction-stage.ts) — Pass 1, Pass 2, contract validation, C11b repair.
- [apps/web/src/lib/analyzer/claimboundary-pipeline.ts](../../apps/web/src/lib/analyzer/claimboundary-pipeline.ts) — stage wiring, Wave 1A safeguard.
- [apps/web/prompts/claimboundary.prompt.md](../../apps/web/prompts/claimboundary.prompt.md) — all prompt sections. E1 edits `CLAIM_EXTRACTION_PASS2`; E2 adds `CLAIM_SALIENCE_COMMITMENT`.
- [apps/web/src/lib/analyzer/types.ts](../../apps/web/src/lib/analyzer/types.ts) — Pass 0 output type and the `truthConditionAnchor(s)` schema shared across pre- and post-extraction.
- [Docs/WIP/2026-04-12_Phase5_Implementation_Plan_Final.md](2026-04-12_Phase5_Implementation_Plan_Final.md) — Phase 5+6 trajectory.
- [Docs/WIP/2026-04-13_C16_R2_Combined_Replay_Analysis.md](2026-04-13_C16_R2_Combined_Replay_Analysis.md) — corrected HEAD baseline that triggered this charter.

## Verification (after E1 + E2 land)

```bash
# List R2 jobs on the Phase 7 experiment build (commit hash set after each step)
curl -s 'http://localhost:5000/v1/jobs?limit=200' \
  | python -c "import sys,json; [print(j['jobId'][:8], j['createdUtc'][:19], j.get('verdictLabel')) \
      for j in json.load(sys.stdin)['jobs'] if 'Bundesrat' in (j.get('inputPreview') or '') \
      and 'rechtskr' in (j.get('inputPreview') or '')]"

# Per-job: compare Pass 0 anchors (E2) against validator-discovered anchors (HEAD)
curl -s 'http://localhost:5000/v1/jobs/<jobId>' | python -c "
import sys, json
d = json.load(sys.stdin)
r = d.get('resultJson', {}) or {}
u = r.get('understanding', {}) or {}
print('Pass 0 anchors:', (u.get('salienceCommitment') or {}).get('anchors'))
print('validator anchor:', (u.get('contractValidationSummary') or {}).get('truthConditionAnchor', {}).get('anchorText'))
print('claim statements:', [c.get('statement') for c in u.get('atomicClaims', []) or []])
"
```

(If E2 never lands, the Pass 0 lookup is None; if the hypothesis holds, the Pass 0 anchors list will include the validator's `anchorText` on runs where the extractor drops it.)
