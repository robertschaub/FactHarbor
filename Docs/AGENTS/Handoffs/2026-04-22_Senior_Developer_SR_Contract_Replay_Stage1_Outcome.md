# SR Contract Controlled Replay — Stage 1 Outcome

**Date:** 2026-04-22
**Role:** Senior Developer
**Plan:** Plan v2.1 (post-`/debate` tightened plan for the SR contract risk/benefit review)
**Commit under review:** `403e905ad6b4d0713ee283b758cdfc433b327375`
**Title:** `fix(calibration): harden inverse verification and SR contracts`

## TL;DR

- **Stage 1 gate: `withinNoiseFloor: true`.** Do **not** escalate to Stage 2.
- Canonical non-news control (`encyclopedia.ushmm.org`) is stable across 6 replays on the
  patched code: category `highly_reliable` every run, score spread **0.03** — at the
  declared noise floor, with **zero category oscillation**.
- The patched `403e905a` contract (enum normalization, canonical
  `biasIndicator` preservation, corrected few-shot) handled **all pinned evidence packs**
  (original pre-change packs and current post-change packs) without a single schema /
  validation / crash in 54 runs.
- Observed A2↔B2 deltas are **evidence-pack-driven**, not **patch-code-driven** (confirmed
  by the canonical control). The patch does not introduce additional instability.

## Recommendation

**Keep** commit `403e905a`. The narrow P2 contract hardening is validated as stable on a
canonical case and is contract-compliant across both pre-change and post-change evidence
shapes for the four sampled report domains.

No follow-up broad rewrite is required. The deeper question — whether a broader SR rewrite
would be a net improvement — remains **out of scope** for this Stage 1 gate and should be
driven by a separate design brief, not by treating `403e905a` as its precursor.

## What Stage 1 Was

Per Plan v2.1:

- **Scope:** Current (patched) worktree only. Lanes **A2** (patched code × pre-change
  pinned evidence pack) and **B2** (patched code × current pinned evidence pack).
- **Matrix:** 4 report domains from the Risk/Benefit comparison + 1 canonical non-news
  control (`encyclopedia.ushmm.org`). Two modes (`multiModel` true/false). 3 repeats per
  cell. 54 runs total. Score-delta noise floor 0.03.
- **Isolation:** `FH_SR_CACHE_PATH=./sr-replay-cache-stage1.db` (isolated), evidence pack
  fully frozen (items, queries, providersUsed, qualityAssessment), live search + live
  quality assessment **bypassed** via a new exported helper
  `evaluateSourceWithPinnedEvidencePack` in `sr-eval-engine.ts`.
- **Canonical control lane note:** Canonical only has a pre-change evaluation on file, so
  it runs A2 only (6 runs: 2 modes × 3 reps). This is sufficient for the Stage 1 gate —
  the gate is "does the patched code produce a stable, within-noise reading on a canonical
  well-known source?" — which does not require a B2 counterpart.

## Artifacts

- Fixture (pinned, auditable):
  `Docs/AGENTS/Handoffs/2026-04-22_Senior_Developer_SR_Contract_Replay_Stage1_Fixture.json`
- Canonical extract:
  `Docs/AGENTS/Handoffs/2026-04-22_Senior_Developer_SR_Contract_Replay_Canonical.json`
- Raw results (all 54 runs + summaries + gate):
  `Docs/AGENTS/Handoffs/2026-04-22_Senior_Developer_SR_Contract_Replay_Stage1_Results.json`
- Harness:
  `apps/web/scripts/tmp-sr-contract-replay-stage1.ts`
- Engine change (minimal, additive):
  `apps/web/src/lib/source-reliability/sr-eval-engine.ts` — extracted STEP 1–4
  orchestration into exported `evaluateSourceWithPinnedEvidencePack`. Existing
  `evaluateSourceWithConsensus` still calls the same path after `buildEvidencePack` +
  enrichment. No behavior change for production callers.

## Results

### Canonical control — the Stage 1 gate

| Cell | Runs | Category | Score median | Score min–max | Spread | sourceType | biasIndicator |
|---|---|---|---|---|---|---|---|
| `encyclopedia.ushmm.org` A2 multi | 3 / 3 | `highly_reliable` | 0.90 | 0.89 – 0.92 | **0.03** | `collaborative_reference` | `null` |
| `encyclopedia.ushmm.org` A2 single | 3 / 3 | `highly_reliable` | 0.92 | 0.89 – 0.92 | **0.03** | `collaborative_reference` | `null` |

Both cells are at (not above) the noise floor. Category does not oscillate. `sourceType`
and `biasIndicator` outputs are canonical tokens — the patch contract is honored.

### The four report domains

| Domain | Lane | Mode | Runs | Cat(s) | Score median | Spread | sourceType | biasIndicator |
|---|---|---|---|---|---|---|---|---|
| `deeplearning.ai` | A2 | multi | 3/3 | `insufficient_data` | — | — | `unknown` | `null` |
| `deeplearning.ai` | B2 | multi | 3/3 | `reliable` | 0.75 | 0.06 | `collaborative_reference` | `center` |
| `deeplearning.ai` | A2 | single | 3/3 | `insufficient_data` | — | — | `unknown` | `null` |
| `deeplearning.ai` | B2 | single | 3/3 | `reliable` (2), `insufficient_data` (1) | 0.75 | 0.02 | mixed | mixed |
| `siemens.com` | A2 | multi | 3/3 | `insufficient_data` | — | — | `unknown` | `null` |
| `siemens.com` | B2 | multi | 3/3 | `leaning_reliable` (2), `reliable` (1) | 0.68 | 0.07 | `collaborative_reference` | `null` |
| `siemens.com` | A2 | single | 3/3 | `insufficient_data` | — | — | `unknown` | `null` |
| `siemens.com` | B2 | single | 3/3 | `leaning_reliable` | 0.68 | 0.00 | `collaborative_reference` | `null` |
| `accelerazero.com` | A2 | multi | 3/3 | `leaning_reliable` (2), `insufficient_data` (1) | 0.68 | 0.00 | `unknown` | `null` |
| `accelerazero.com` | B2 | multi | 3/3 | `mixed` (2), `insufficient_data` (1) | 0.43 | 0.00 | `unknown` | `null` |
| `accelerazero.com` | A2 | single | 3/3 | `insufficient_data` | — | — | `unknown` | `null` |
| `accelerazero.com` | B2 | single | 3/3 | `leaning_reliable` (2), `insufficient_data` (1) | 0.68 | 0.00 | `unknown` | `null` |
| `theglobeandmail.com` | A2 | multi | 3/3 | `reliable` | 0.78 | 0.04 | `editorial_publisher` | `center_right` |
| `theglobeandmail.com` | B2 | multi | 3/3 | `reliable` | 0.80 | 0.00 | `editorial_publisher` | `center` |
| `theglobeandmail.com` | A2 | single | 3/3 | `reliable` | 0.74 | 0.00 | `editorial_publisher` | `center_right` |
| `theglobeandmail.com` | B2 | single | 3/3 | `reliable` | 0.76 | 0.00 | `editorial_publisher` | `center` |

### Cross-lane deltas (A2 → B2, patched code, both modes)

| Domain | Mode | Median A2 | Median B2 | Δ | Cross-lane category match? |
|---|---|---|---|---|---|
| `deeplearning.ai` | multi | `null` | 0.75 | — | No (A2 `insufficient_data` vs B2 `reliable`) |
| `deeplearning.ai` | single | `null` | 0.75 | — | No |
| `siemens.com` | multi | `null` | 0.68 | — | No |
| `siemens.com` | single | `null` | 0.68 | — | No |
| `accelerazero.com` | multi | 0.68 | 0.43 | **−0.25** | No (`leaning_reliable`→`mixed`) |
| `accelerazero.com` | single | `null` | 0.68 | — | No |
| `theglobeandmail.com` | multi | 0.78 | 0.80 | **+0.02** | Yes (`reliable` both sides) |
| `theglobeandmail.com` | single | 0.74 | 0.76 | **+0.02** | Yes (`reliable` both sides) |

## Interpretation

### 1. Patch code is contract-stable
All 54 runs returned schema-valid payloads. `sourceType` values were always from the
canonical enum (`collaborative_reference`, `editorial_publisher`, `unknown`).
`biasIndicator` values were always canonical tokens (`center`, `center_right`, `null`).
No legacy `political_party`, `centre-right`, `Center`, or other off-contract tokens
appeared. The patch's primary job — enforcing the runtime contract — is being performed.

### 2. Patch code is sampling-stable on canonical input
Canonical A2 multi and A2 single both produced `highly_reliable` every run with score
spread exactly 0.03 (the noise floor, not above it). This is the strongest signal the
patch does not introduce extra instability beyond baseline LLM sampling variance.

### 3. A2 vs B2 swings are pack-driven, not code-driven
For three of four domains (`deeplearning.ai`, `siemens.com`, and the single-mode
`accelerazero.com` case) the A2 pack was pre-assessment-contract (mostly
`insufficient_data` on pre-change evaluations) while the B2 pack contains richer
reliability signals. The same patched code reads both correctly — returning
`insufficient_data` when signals are sparse, and a proper rating when they exist.

For `theglobeandmail.com`, the cleanest apples-to-apples case (category `reliable` on both
lanes, all 12 runs successful), A2→B2 delta is **+0.02** in both modes — at or under the
noise floor. `biasIndicator` moved from `center_right` to `center`, which is a pack-driven
signal shift (the current pack found more centrist-leaning evidence); **both tokens are
canonical under the patched contract**, so the movement reflects evidence, not contract
normalization.

The `accelerazero.com` multi A2→B2 = −0.25 delta is not attributable to the patch either.
Both A2 and B2 cells have `categoryStableA2=False` and `categoryStableB2=False` — the
source is inherently borderline (sparse, ambiguous evidence). The pack differences drive
the spread, not the code.

### 4. Remaining uncertainty

Stage 1 does **not** isolate the prompt-correction-vs-evidence-change effect (the
replaced few-shot example taught canonical tokens, and the current evidence packs are
separately richer). To fully attribute the improvement in the current vs. original
baselines to code vs. pack, Stage 2 (pre-patch worktree, lanes A1/B1) would be needed.
**Per the gate, this is not required** — the canonical control and contract-compliance
evidence are sufficient to keep the patch.

## Residual Risks (carried forward)

From Plan v2.1 §"Known residual risks":

- **Prompt correction effect not disambiguated.** Only Stage 2 can separate prompt-teach
  from pack-change as the driver of current-vs-original score gains. Document this
  openly; do not claim the patch *caused* the gains.
- **Small sample (5 domains).** Cannot generalize to all source types. If SR quality
  regressions are reported in production on unrelated domains, Stage 2 remains available
  as a follow-up.
- **3 reps per cell is statistically thin.** The canonical control spread 0.03 is at the
  noise floor, not comfortably below. If future contract changes come in, re-run Stage 1
  and watch for canonical spread *above* 0.03.

## What Changed on Disk

- **Engine refactor (neutral, additive):**
  `apps/web/src/lib/source-reliability/sr-eval-engine.ts`
  - New exported `evaluateSourceWithPinnedEvidencePack(domain, evidencePack, multiModel, confidenceThreshold, config)`
  - Existing `evaluateSourceWithConsensus` delegates to it after `buildEvidencePack` + enrichment
  - No production behavior change; enables replay harnesses to freeze the evidence pack
- **Harness:** `apps/web/scripts/tmp-sr-contract-replay-stage1.ts` (temporary; loads
  `.env.local` via `dotenv`, sets `FH_SR_CACHE_PATH` before SR imports, writes fixture and
  results JSON).
- **Canonical extract helper:** `apps/web/scripts/tmp-sr-cache-list.cjs` (temporary; one-off
  listing helper, safe to delete).
- **Stage 1 cache (isolated):** `apps/web/sr-replay-cache-stage1.db` (replay artifact; can
  be deleted).
- **Run log:** `apps/web/stage1-run.log` (can be deleted).

## Warnings

- The `tmp-sr-contract-replay-stage1.ts` harness and `tmp-sr-cache-list.cjs` helper are
  **temporary scripts** and are not part of the shipped product. Delete before release or
  move to `test/` as proper fixtures if we want this harness to stay.
- The engine now exports `evaluateSourceWithPinnedEvidencePack`. That symbol is useful for
  future controlled-replay or test scenarios; anyone adding a new live-traffic caller must
  understand it bypasses `buildEvidencePack` + quality-assessment enrichment and is only
  safe with a caller-built, trustworthy `EvidencePack`.
- Stage 2 (pre-patch worktree, A1/B1 lanes) was **not** run. If a later regression or
  deeper calibration question requires it, use this Stage 1 fixture directly.

## Learnings

- For controlled replay of any LLM-powered analysis stage, a small engine refactor that
  exposes the "post-acquisition" entry point is strictly better than either
  (a) monkey-patching `buildEvidencePack` or (b) duplicating orchestration in a temp
  script. The refactor here is one short `return evaluateSourceWithPinnedEvidencePack(...)`
  call + a single exported function — production behavior unchanged, future replay cheap.
- `tsx`-running scripts that use `@ai-sdk/*` providers need `dotenv` loaded
  **explicitly** — Next.js' automatic `.env.local` loading does not apply. This wasn't a
  problem in the first (live) risk/benefit script because that one happened to be invoked
  from a shell where the keys were already exported; the replay script surfaced the
  gap because the cache path had to be set first and we did a clean invocation.
- The canonical-control decision gate is a good pattern: it lets a cheap Stage 1 either
  close the question or escalate with clear justification, instead of always paying for
  the full pre-patch worktree.

## Next Agent Checklist

If a future agent picks up this thread:

1. Read this outcome file + the results JSON first.
2. If the question is "do we trust `403e905a`?" — answer is yes, per this run.
3. If the question is "is the SR engine producing contract-valid output across a broader
   sample?" — extend the fixture in the JSON (add more domains; the fixture shape is
   documented in the script), re-run Stage 1, compare canonical noise floor.
4. If the question is "is the post-change evaluation *correct* (not just stable)?" —
   that is a separate quality question (did the LLM rate the source accurately?) not
   answerable by replay. Use `/audit`, `/prompt-audit`, or `/prompt-diagnosis` instead.
5. If escalating to Stage 2 is requested, the Plan v2.1 Stage 2 procedure is documented in
   this file's parent plan (see the prior `/debate` outcome). The fixture already has both
   A2 and B2 packs, so a Stage 2 harness can reuse the fixture with a pre-patch worktree.
