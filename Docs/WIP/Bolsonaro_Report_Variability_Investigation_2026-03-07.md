# Bolsonaro Report Variability Investigation

**Date:** 2026-03-07  
**Prepared by:** Senior Developer + LLM Expert (Codex GPT-5)  
**Status:** Ready for review  
**Scope:** Investigate why repeated Bolsonaro legal-case analyses now vary by up to ~20 percentage points, with emphasis on changes from the last ~3 days.  

---

## Executive Summary

The verdict variability is **real** and **not caused by a single change**.

The strongest evidence points to a **two-stage instability**:

1. **Stage 1 instability: claim extraction/decomposition changed over time and is still fragile for Bolsonaro-style inputs.**
2. **Stage 2+ instability: once a claim is extracted, the evidence pool now varies more than it should, and the current gating is permissive enough that those evidence-pool differences survive into the final verdict.**

This issue did **not start from zero on 2026-03-05**. The database already shows exact duplicate-input variance on **2026-03-01** for the classic Bolsonaro prompt:

- `4a3740edff3048069a2a24d7ba3c1cf4` → `LEANING-TRUE`, `69%`, `70 confidence`
- `2a867099c32f4cf3b6609e4475d56c88` → `MOSTLY-TRUE`, `85%`, `78 confidence`

That is a **16-point truth swing on the exact same input** before the March 5 rollout.

However, the **March 3-5 prompt/config/search changes likely changed the failure mode and made the variance easier to notice**:

- claim decomposition prompt changed materially
- search provider mix expanded
- evidence sufficiency gate was relaxed
- multiple prompt reseeds and config reseeds landed on March 5

My current judgment:

- The issue is **mostly real pipeline instability**, not user imagination.
- The **most likely recent amplifiers** are:
  - claim decomposition prompt churn
  - widened search/provider variability
  - lowered evidence sufficiency threshold
- The **most important recent containment failure** is that direction/grounding problems are being logged as `info` while the verdict still ships.

---

## Method

I investigated:

- recent git history (`2026-03-04` onward) for:
  - `apps/web/prompts/claimboundary.prompt.md`
  - `apps/web/configs/*.default.json`
  - `apps/web/src/lib/analyzer/*`
  - `apps/web/src/lib/web-search.ts` and provider files
- active UCM state in `apps/web/config.db`
- historical jobs and metrics in `apps/api/factharbor.db`
- older Bolsonaro investigations and handoffs

I did **not** run fresh paid LLM analyses in this pass, because the local job database already contains relevant recent Bolsonaro runs and exact duplicate-input examples.

---

## Key Findings

### 1. Exact duplicate-input variance already existed on 2026-03-01

For the exact same input:

`Was the Bolsonaro judgment (trial) fair and based on Brazil's law?`

I found two successful jobs about one hour apart:

| Job | Time | Verdict | Truth | Confidence |
|-----|------|---------|-------|------------|
| `4a3740edff3048069a2a24d7ba3c1cf4` | 2026-03-01 19:28 | `LEANING-TRUE` | `69` | `70` |
| `2a867099c32f4cf3b6609e4475d56c88` | 2026-03-01 20:26 | `MOSTLY-TRUE` | `85` | `78` |

This proves the root problem predates the March 5 rollout.

### 2. On March 1, the duplicate-input swing came from Stage 1 claim extraction differences

For the same exact input above:

- Job `4a3740ed...` extracted **2 claims**:
  - `The Bolsonaro trial was conducted fairly`
  - `The Bolsonaro trial was based on Brazil's law`
- Job `2a867099...` extracted **1 claim**:
  - `The Bolsonaro judgment was based on Brazil's law.`

Also important:

- job `2a867099...` hit:
  - `Stage 1 Pass 2 retry: reducing preliminary-evidence context after soft refusal`
  - `Stage 1 Pass 2 recovered via fallback model (claude-haiku-4-5-20251001)`

So one known instability vector is:

- politically sensitive legal input
- Pass 2 soft refusal / fallback recovery
- different extracted claims
- materially different final verdict

### 3. On March 6 vs March 7, similar Bolsonaro-family inputs diverged later in the pipeline

Recent runs after the March 5 rollout:

| Job | Input | Verdict | Truth | Confidence |
|-----|-------|---------|-------|------------|
| `eb75fad67bb645ae8db2169337d59973` | `Were the Bolsonaro trials conducted in accordance with Brazilian law, and were the verdicts fair?` | `LEANING-FALSE` | `35` | `68` |
| `867745503e5d478f8e5d3fd12bad2ecb` | `Were the various Bolsonaro trials conducted in accordance with Brazilian law, and were the verdicts fair?` | `LEANING-TRUE` | `62` | `58` |

Both jobs extracted effectively the **same single atomic claim**:

- `... conducted in accordance with Brazilian law in terms of procedural compliance`

That means the large swing here did **not** come from different Stage 1 claims. It came later:

| Job | Sources | Evidence Items | Institutional | General |
|-----|---------|----------------|---------------|---------|
| `eb75...` | `9` | `22` | `10` | `12` |
| `8677...` | `10` | `41` | `3` | `38` |

The evidence pool changed dramatically, even though the extracted claim stayed almost the same.

That is strong evidence for **search/result mix instability**.

### 4. Source-domain mix changed sharply between the March 6 and March 7 runs

Examples:

**2026-03-06 (`eb75...`)**

- `amnesty.org`
- `carnegieendowment.org`
- `idea.int`
- `ibanet.org`
- `repository.law.miami.edu`
- `state.gov`

**2026-03-07 (`8677...`)**

- `aljazeera.com` (3 hits)
- `agenciabrasil.ebc.com.br`
- `bbc.com`
- `oas.org`
- `pbs.org`
- `populismstudies.org`
- `state.gov`

This is a materially different evidence ecosystem.

### 5. March 5 introduced several real runtime changes

The local `apps/web/config.db` shows the active default configs were reseeded on **2026-03-05**:

- `calculation/default` activated `2026-03-05T13:03:27Z`
- `pipeline/default` activated `2026-03-05T13:03:27Z`
- `search/default` activated `2026-03-05T17:59:20Z`
- `claimboundary` prompt reseeded multiple times on `2026-03-05`

Key runtime deltas vs the prior active blobs:

### Calculation config delta

Old active blob:

- `mixedConfidenceThreshold = 40`
- `sourceReliability.defaultScore = 0.4`
- `gate4QualityThresholdHigh = 0.7`
- `evidenceSufficiencyMinSourceTypes = 2`

New active blob:

- `mixedConfidenceThreshold = 45`
- `sourceReliability.defaultScore = 0.45`
- `gate4QualityThresholdHigh = 0.75`
- `evidenceSufficiencyMinSourceTypes = 1`

The most important behavioral change here is:

- **`evidenceSufficiencyMinSourceTypes` relaxed from `2` to `1`**

That makes it easier for a volatile, low-diversity evidence pool to produce a directional verdict.

### Search config delta

Old active blob:

- `domainBlacklist = []`
- `serpapi.enabled = false`
- `brave.enabled = false`

New active blob:

- `domainBlacklist = [facebook, twitter/x, reddit, instagram, tiktok, pinterest, quora, youtube]`
- `serpapi.enabled = true`
- `brave.enabled = true`

The most important behavioral change here is:

- **provider mix widened** in AUTO mode

### Prompt / Pass 1 delta

The `claimboundary` prompt changed multiple times between March 3 and March 5:

- `5c3909fe` — ambiguous single-claim decomposition introduced
- `902d8fdb` — ambiguous decomposition refined
- `f1dfb18f` — dimension independence test added
- `4ca33376`, `75f81550`, `0e7ab091`, `4665ff07` — language/geography inference/query instructions changed repeatedly

This is exactly the part of the system that handles Bolsonaro-style:

- fairness questions
- legal-basis questions
- ambiguous evaluative predicates
- multi-assertion wording

### 6. Current reports are surfacing known integrity issues without containing them

Recent Bolsonaro-family jobs contain warnings like:

- `verdict_grounding_issue`
- `verdict_direction_issue`

But the active pipeline config is:

- `verdictGroundingPolicy = disabled`
- `verdictDirectionPolicy = disabled`

Important nuance:

- I do **not** think this created the variance.
- I **do** think this allows unstable verdicts to pass through without a stronger downgrade/warning path.

Also, `Docs/STATUS/Current_Status.md` still says the integrity policies are enabled, which is now stale relative to the active config.

---

## Candidate Causes With Estimated Probabilities

These probabilities are **non-exclusive**. They estimate the chance that the candidate is a **meaningful contributor** to the currently observed Bolsonaro volatility.

| Rank | Candidate | Estimated Probability | Why |
|------|-----------|-----------------------|-----|
| 1 | **Stage 1 claim-decomposition drift from March 3-5 prompt changes** | **0.78** | Bolsonaro inputs are exactly the kind of ambiguous evaluative/legal inputs affected by the new `ambiguous_single_claim` rules. Historical exact-duplicate evidence already shows claim extraction can flip from 2 claims to 1 claim and move the verdict by 16 points. |
| 2 | **Evidence-pool instability after widening AUTO search provider mix** | **0.74** | March 5 enabled `serpapi` and `brave` in default search config. Recent Bolsonaro-family runs show large changes in domains, evidence-item counts, and institutional/general balance despite similar extracted claims. |
| 3 | **Relaxed sufficiency gate (`evidenceSufficiencyMinSourceTypes: 2 -> 1`) made volatile runs publishable** | **0.68** | This is a concrete March 5 runtime change. A claim can now survive with weaker source-type diversity, so search noise is more likely to affect the published verdict instead of being gated to `UNVERIFIED`. |
| 4 | **Repeated geo/language prompt/query changes changed query wording and source acquisition behavior** | **0.41** | March 5 changed language/geography inference, then removed provider geo/language params, but kept language/geography context in query generation. Current runs now carry `detectedLanguage=en`, `inferredGeography=BR`, which did not exist in March 1 stored outputs. |
| 5 | **Disabled verdict integrity policies allow unstable outputs to survive** | **0.39** | Not likely the root creator, but clearly a containment failure. Recent jobs emit grounding/direction issues while still producing directional verdicts. |
| 6 | **March 5 config reseed + deep-merge behavior activated new defaults on old profiles** | **0.32** | `config-loader.ts` changed from missing-field behavior to deep-merging defaults. This made newly added defaults materially active without requiring a manual UCM profile rebuild. |
| 7 | **Pass 2 soft refusal / fallback behavior for politically sensitive legal inputs** | **0.27** | Proven contributor historically on the exact Bolsonaro question (March 1), but not directly visible in the March 6-7 jobs. Still a real amplifier for this claim family. |

### Background Amplifier (not a new March 5 regression by itself)

| Candidate | Estimated Probability | Why |
|-----------|-----------------------|-----|
| **Baseline LLM/search nondeterminism** | **0.80** | Search APIs, live web indexes, and multi-model debate were already producing notable variance before March 5. The March 5 changes likely amplified or reshaped it rather than inventing it from zero. |

---

## Most Likely Causal Narrative

My current best explanation is:

1. **Bolsonaro legal-fairness inputs were already high-variance** because they sit at the intersection of:
   - evaluative but evidence-checkable wording
   - multiple plausible factual dimensions
   - politically sensitive content
   - live, heterogeneous evidence ecosystems

2. **March 3-5 changed the way Stage 1 decomposes ambiguous claims**, especially via:
   - `ambiguous_single_claim`
   - dimension labels
   - specificity exceptions for dimension claims
   - repeated geo/language/query prompt edits

3. **March 5 also changed the evidence pool downstream** by:
   - enabling `serpapi` and `brave`
   - changing query generation context
   - reseeding configs

4. **At the same time, the sufficiency gate became more permissive**:
   - `evidenceSufficiencyMinSourceTypes: 2 -> 1`

5. So the pipeline now has a more unstable upstream decomposition and a more variable downstream source pool, while also being more willing to let that pool produce a directional answer.

That combination fits the user symptom well.

---

## Proposals

## Proposal A — Stabilize AUTO search for production

**Recommendation:** likely yes

Change default production search behavior to be less source-mix-sensitive:

- keep `google-cse` as primary
- use `serpapi` / `brave` only on hard failure or explicit test profile
- keep supplementary providers (Wikipedia / Semantic Scholar / Fact Check) separate

Why:

- right now AUTO mode is broadening the evidence ecosystem in a way that increases run-to-run variance
- Bolsonaro-family runs show domain-mix swings large enough to change verdict direction

Generic, not Bolsonaro-specific.

## Proposal B — Restore stronger evidence sufficiency gating

**Recommendation:** likely yes for pre-release

Test restoring:

- `evidenceSufficiencyMinSourceTypes = 2`

Possibly keep:

- `evidenceSufficiencyMinDistinctDomains = 3`

Why:

- this does not remove variance
- it prevents low-diversity evidence pools from becoming strong directional verdicts

## Proposal C — Freeze claim decomposition prompts until repeated-run tests pass

**Recommendation:** yes

No further production prompt edits to `claimboundary.prompt.md` without:

- repeated-run variance checks
- multilingual checks
- exact-input repeat checks on sensitive legal/political inputs

Why:

- March 3-5 changed the highest-variance part of the pipeline
- the prompt churn is real and observable in `config.db` seed history

## Proposal D — Add a softer integrity containment mode

**Recommendation:** yes, but not the current `safe_downgrade` as-is

Instead of current all-or-nothing choices:

- `disabled`
- harsh `safe_downgrade`

add a middle mode such as:

- retry once
- cap confidence
- force user-visible warning
- do **not** rewrite truth percentage to 50 unless the issue is severe

Why:

- recent Bolsonaro runs show grounding/direction issues
- the current disabled mode publishes them too easily
- the current harsh downgrade was reportedly causing false positives

## Proposal E — Add first-class stability telemetry

**Recommendation:** yes

Persist per job:

- prompt hash
- config hashes actually used
- extracted atomic claims
- source-domain histogram
- source-type histogram
- institutional/general partition counts
- provider list actually used per query

Some of this exists in `AnalysisMetrics`, but it is not consistently easy to compare across jobs.

## Proposal F — Add a repeated-run stability gate before prompt/config deployment

**Recommendation:** yes

Create a small canary pack of repeated-run claims:

- Bolsonaro legal fairness/basis
- one multilingual political/legal claim
- one scientific claim
- one economic claim
- one non-political control claim

Run each **5x** before prompt/config changes go live.

Track:

- truth spread
- confidence spread
- claim-count spread
- source/domain spread
- verdict direction changes

---

## Review Plan

### Phase 1 — Fast forensic A/B in a test UCM profile

Create test profiles, do **not** change production yet.

Profiles:

1. **Current production-equivalent**
2. **Google-primary only**
   - `serpapi.enabled = false`
   - `brave.enabled = false`
3. **Google-primary only + stronger sufficiency**
   - profile 2 +
   - `evidenceSufficiencyMinSourceTypes = 2`
4. **Profile 3 + pre-March-5 claimboundary prompt**
   - compare current prompt vs pre-`902d8fdb`

Run the same Bolsonaro input **5x per profile**.

Success criteria:

- truth spread <= 10 points
- no verdict direction flip
- claim extraction stable across all 5 runs

### Phase 2 — Decide what to roll back or keep

If Profile 2 or 3 stabilizes strongly:

- roll back the search-provider mix and/or sufficiency threshold in pre-release first

If Profile 4 stabilizes strongly:

- treat prompt churn as the primary regressor
- revert or rework the ambiguous decomposition prompt

### Phase 3 — Fix containment

Implement a softer integrity mode:

- visible warning
- confidence cap
- optional retry
- no forced 50% unless severe

### Phase 4 — Add guardrails to deployment process

- repeated-run stability suite for prompts/config
- stale-doc check for `Current_Status.md` vs active defaults
- config/prompt hash exposure in report metadata

---

## Concrete Recommendations

If I had to choose the **lowest-risk first move** before any deeper implementation work, it would be:

1. **Disable `serpapi` and `brave` in the default production search profile**
2. **Restore `evidenceSufficiencyMinSourceTypes = 2` in a test profile and compare**
3. **Run a 5x repeated Bolsonaro matrix before touching prompts again**

If I had to choose the **highest-information experiment**, it would be:

- A/B the current prompt against the pre-`902d8fdb` prompt while holding provider mix fixed

That will tell us whether the main driver is:

- Stage 1 decomposition
- or Stage 2 search/evidence variability

---

## Risks / Caveats

- I did **not** rerun paid live analyses in this investigation, so this report relies on stored jobs plus code/config history.
- `Current_Status.md` is stale regarding integrity-policy activation and should not be treated as authoritative for current runtime behavior.
- The probabilities above are judgment calls based on repo and DB evidence, not formal statistical attribution.

---

## Bottom Line

The most likely explanation is:

- **this problem already existed**
- **March 3-5 changed both decomposition and source acquisition**
- **March 5 also lowered the threshold that keeps noisy evidence pools from producing directional verdicts**

That combination is enough to explain why the Bolsonaro reports feel worse and why repeated runs can now swing hard enough to be user-visible.
