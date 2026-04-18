# Bolsonaro `efc5e66f` — Single-Source Evidence Flooding Investigation

**Date:** 2026-03-27
**Role:** Lead Architect
**Status:** PARTIALLY DONE — Fix 1 + Fix 2 shipped; Fix 3 remains deferred
**Job:** `efc5e66fa1f4452298de8b00eeab6d29` (MIXED 56/51)
**Input:** "The court proceedings against Jair Bolsonaro for attempted coup d'etat complied with Brazilian procedural law and constitutional requirements, and the resulting verdicts were fair."
**Git commit:** `1ff092cd`
**Expected verdict:** LEANING-TRUE ~62-65 (modal across 18 prior runs, 78%)

---

## 1. Executive Summary

Job `efc5e66f` produced **MIXED 56/51** instead of the expected LEANING-TRUE. The root cause is a single low-reliability source (`civilizationworks.org`, trackRecordScore 0.38) that generated **11 evidence items** — all tagged `contradicts`, all `probativeValue: high`, all mapped exclusively to AC_01. This single URL produced more evidence items than BBC, PBS, NPR, and Al Jazeera combined, and flipped AC_01 from its typical ~60-65 TP range down to **LEANING-FALSE 38/52**.

The key question is: **why did a 38%-reliability source destroy the entire verdict?** Source reliability scores exist in the codebase but are missing from the active verdict path — the verdict LLM never sees them, and no stage uses them to weight or attenuate evidence. The 11 items were treated identically to high-reliability sources.

---

## 2. The Evidence Picture

### 2.1 AC_01 evidence balance — with and without civilizationworks.org

| Scenario | Items | Supports | Neutral | Contradicts | Balance ratio |
|----------|-------|----------|---------|-------------|---------------|
| **With** civilizationworks | 32 | 5 | 13 | 14 | 0.26 (contradiction-heavy) |
| **Without** civilizationworks | 21 | 5 | 13 | 3 | 0.62 (supports-leaning) |

Without this single source, AC_01 would have had a balance ratio consistent with strong Bolsonaro runs (0.62 vs typical ~0.60-0.76).

### 2.2 The civilizationworks.org source profile

| Metric | Value |
|--------|-------|
| URL | `civilizationworks.org/cw-master-blog/the-january-8th-files-inside-brazils-secret-judicial-task-force-for-mass-arrests` |
| trackRecordScore | **0.38** (low) |
| trackRecordConfidence | 0.55 (low) |
| sourceType | `organization_report` |
| Items extracted | **11** (all from 1 URL) |
| claimDirection | All 11 = `contradicts` |
| probativeValue | All 11 = `high` |
| Mapped to | All 11 → `AC_01` only |

### 2.3 Topical relevance concern

The article is about the **January 8 mass protest prosecution** — describing TSE electoral court overreach, mass detention practices, WhatsApp-based surveillance, and collective punishment of crowd protesters. Bolsonaro's individual coup trial is related but legally distinct. The applicability filter caught 3 foreign-jurisdiction items but did not flag these as out-of-scope for the specific claim about Bolsonaro's proceedings.

### 2.4 Minor contamination: EV_005

`EV_005` from `cfr.org/articles/us-trade-case-brazil-expediency-over-principles` is about US-Brazil trade law — zero relevance to criminal proceedings. Mapped to AC_01 as `supports`. 1 item, minor impact, but indicates extraction noise.

---

## 3. All Claim Verdicts

| Claim | Verdict | TP | Conf | Consistency | Spread | Key issue |
|-------|---------|-----|------|-------------|--------|-----------|
| AC_01 | **LEANING-FALSE** | **38** | 52 | [42, 35, 35] | 7 | Civilizationworks flooding |
| AC_02 | UNVERIFIED | 62 | 41 | [58, 58, 42] | 16 | Low confidence, unstable |
| AC_03 | LEANING-TRUE | 66 | 58 | [68, 68, 58] | 10 | Stable, expected range |

AC_01's LEANING-FALSE dragged the article verdict from the expected LEANING-TRUE to MIXED 56/51.

---

## 4. Why 38% Reliability Did Not Prevent Damage

### 4.1 Source reliability is missing from the active verdict path

The `trackRecordScore` (0.38) is stored on the source record but is **missing from the active verdict path** — no stage reads it to weight, filter, or attenuate evidence items during:
- Stage 2 extraction (all items from fetched sources are extracted equally)
- Stage 3 clustering (items contribute equally regardless of source reliability)
- D5 sufficiency (items counted equally)
- Stage 4 verdict debate (evidence IDs are listed without reliability weighting)

Stage 4.5 SR calibration (which would use these scores) is **feature-flagged off** (`SR-1` in Backlog). SR exists in the codebase (Stage 4.5, legacy weighting branch) but is missing from the active verdict path.

### 4.2 Per-source extraction is unbounded

There is no cap on how many evidence items a single URL can contribute. A long advocacy article generates more items than a concise news report. The extraction LLM is instructed to extract all relevant evidence, which for a detailed article means many items.

### 4.3 probativeValue assessment is per-item, not per-source

Each item was individually assessed as `probativeValue: high` by the extraction LLM — because each statement is internally coherent and specific. But the LLM does not consider:
- Whether the source itself is reliable
- Whether 11 items from 1 source should collectively carry less weight than 11 items from 11 sources

### 4.4 No derivative/redundancy detection across same-source items

The 11 items are all from the same article and share the same analytical perspective. They are effectively 11 facets of one argument, not 11 independent observations. But the pipeline counts them as 11 independent evidence items.

---

## 5. Why Was This the Only Major Contradicting Source?

### 5.1 Search query pattern

The job ran 16 search queries. The civilizationworks URL appeared via a query about pre-trial detention and procedural legality. Most other queries returned mainstream news (BBC, PBS, NPR, Al Jazeera) and legal scholarship — which tend to report procedural facts neutrally rather than making strong contradiction claims.

### 5.2 The nature of procedural compliance claims

AC_01 asks whether proceedings "complied with Brazilian procedural law." Most mainstream sources report what happened (neutral), and legal scholarship discusses systemic issues (contradicts at a structural level). The civilizationworks article is the only source that makes specific, detailed, operational accusations of procedural violations — which is why the extraction LLM tagged all 11 items as `contradicts` with `high` probative value.

### 5.3 This is not a search-scarcity problem

The job found 85 evidence items from 30 sources and 10 unique URLs for AC_01. The problem is not too little evidence — it's one source generating disproportionate volume.

---

## 6. Open Questions for Debate

1. **Should source reliability score gate or weight evidence items?** If so, at which stage and how?
2. **Should there be a per-source or per-URL evidence item cap?** If so, what is a reasonable limit?
3. **Should same-source items be treated as partially redundant?** (Derivative detection for same-URL items)
4. **Is this an extraction problem (too many items from one page) or a verdict problem (no per-source weighting)?**
5. **Would enabling Stage 4.5 SR calibration (`SR-1`) have prevented this?** Or is a different mechanism needed?
6. **Does this require a code fix, or is this acceptable evidence-driven variance under EVD-1?**

---

## 7. Preliminary Evidence LLM Remap Impact

Job `efc5e66f` ran with `preliminaryEvidenceLlmRemapEnabled: true`. Analysis of impact:

**The remap is NOT responsible for the problem.** The civilizationworks.org flooding is entirely **Stage 2 evidence** — all 11 items have `isSeeded=false`. The remap only affects seeded/preliminary evidence.

| Metric | Value |
|--------|-------|
| Preliminary items | 30 |
| Successfully remapped to AC_* | 26 (87%) |
| Still semantic slugs | 4 (`claim_bolsonaro_coup_proceedings`, `coup_verdict_fairness` x2, `claim_bolsonaro_fair_verdict`) |
| Seeded items mapped to AC_01 | 6 (1 supports, 5 neutral) |

The remap actually *helped* AC_01 slightly: without seeded evidence, AC_01's Stage 2 balance ratio is 0.22 (4 supports vs 14 contradicts). With the 6 remap-added seeded items, it rose to 0.26.

**One minor remap quality issue:** EV_005 from `cfr.org/articles/us-trade-case-brazil-expediency-over-principles` (a US-Brazil trade law article) was mapped to AC_01 as `supports`. This is a false attribution — the article is about trade, not criminal proceedings. Impact is negligible (1 item), but worth noting as a remap quality signal.

---

## 8. Why 38% Reliability Did Not Prevent Damage — Deep Analysis

### 8.1 Source reliability is missing from the active verdict path

The `trackRecordScore` (0.38) is stored on the source record but is **not present in the active verdict path**:

| Stage | Uses SR? | What happens |
|-------|----------|-------------|
| Stage 2 extraction | **No** | All fetched sources extracted equally regardless of reliability |
| Evidence filter | **No** | Filters by `probativeValue`, statement length, structural checks only |
| Stage 3 clustering | **No** | Groups by EvidenceScope, not source quality |
| D5 sufficiency | **No** | Counts items, source types, domains — not source reliability |
| Stage 4 verdict debate | **No** | LLM prompts receive evidence items without trackRecordScore |
| Stage 5 aggregation | **No** | Weights by probativeValue, centrality, harm, triangulation — not SR |

SR is not absent from the codebase — two mechanisms exist but are both disabled in the default path:
- **Stage 4.5 SR calibration**: `sourceReliabilityCalibrationMode: "off"` in `pipeline.default.json`, gated in `claimboundary-pipeline.ts`
- **Legacy `applyEvidenceWeighting()`** in `source-reliability.ts`: fires when Stage 4.5 is off AND `evidenceWeightingEnabled: true`. However, this legacy path **only averages reliability over `supportingEvidenceIds`** — it does not address contradicting evidence from low-SR sources. In the `efc5e66f` case, the damage came from 11 *contradicting* items, so this path would not have helped even if enabled.

The precise root cause is: **SR is missing from the active verdict path**, not "SR is nowhere used."

### 8.2 Per-source extraction is unbounded

No cap exists on how many evidence items a single URL can contribute. The `sourceExtractionMaxLength: 15000` limits text volume per URL, but a 15,000-character article can still produce 11+ evidence items. The extraction prompt has no per-source limit instruction.

### 8.3 probativeValue is per-item, not per-source

Each of the 11 items was individually assessed as `probativeValue: high` because each statement is internally coherent and specific. The LLM does not consider whether the *source* is reliable or whether 11 items from 1 source should collectively carry less weight.

### 8.4 No within-source redundancy detection

Derivative detection works **across sources** (`isDerivative` flag) but not **within** a single source. An unused `EvidenceDeduplicator` class exists in `evidence-deduplication.ts` but is never instantiated. The 11 items share the same analytical perspective — they are 11 facets of one argument, not 11 independent observations.

---

## 9. Multi-Agent Debate: How to Prevent Single-Source Flooding

Four positions were debated:

### Position A: Per-Source Item Cap (Advocate)

**Proposal:** Add `maxEvidenceItemsPerSource` UCM parameter (default 5). Enforce in code after extraction, not in the prompt. Keep the highest-`probativeValue` items when truncating.

**Arguments for:**
- Structural constraint on pipeline mechanics, not an analytical decision about text meaning — does NOT violate LLM Intelligence mandate
- Deterministic, reliable, zero additional LLM cost
- Prevents any single source from dominating regardless of reliability score
- UCM-configurable for different use cases

**Arguments against (from Challenger):**
- Discards evidence blindly by position, not by value
- A detailed legal analysis may legitimately contain 6+ distinct evidence points
- Silent, irreversible discard — the verdict never sees what was lost

### Position B: SR Score Integration in Verdict Prompts (Advocate)

**Proposal:** Include `trackRecordScore` and `srConfidence` in VERDICT_ADVOCATE and VERDICT_CHALLENGER prompt context for each evidence item. Let the LLM reason about source credibility during verdict debate.

**Arguments for:**
- Fully AGENTS.md compliant — LLM makes the analytical judgment, not deterministic code
- Zero new logic, no new thresholds — just pass existing metadata to the LLM
- Strictly better than Stage 4.5 post-hoc adjustment (LLM reasons holistically vs mechanical formula)
- Aligns with how human analysts work: they consider source credibility

**Arguments against (from Challenger):**
- SR scores are LLM-assessed with 0.55 confidence — using uncertain scores to influence verdicts introduces new error
- Low general track record ≠ this specific claim is wrong
- Risk of systematically suppressing legitimate evidence from smaller/advocacy sources

### Position C: LLM-Based Same-Source Consolidation (Advocate)

**Proposal:** Post-extraction LLM consolidation pass for any source producing >4 items. Group by URL, send one Haiku call per over-producing source to merge semantically redundant items into distinct evidence points.

**Arguments for:**
- Addresses the core insight: same-source items are correlated, not independent — the pipeline should model that reality
- Semantically richer than a blunt cap — preserves distinct points, merges redundant ones
- Fully AGENTS.md compliant — semantic similarity is an analytical decision requiring LLM
- The unused `EvidenceDeduplicator` was correctly not integrated because deterministic dedup would violate the mandate

**Arguments against (from Challenger):**
- Risk of over-merging genuinely distinct evidence points
- Additional LLM cost (small but nonzero)
- The extraction stage should produce fewer items in the first place

### Position D: Do Nothing (Challenger)

**Arguments for:**
- 78% of runs produce expected verdict — this is a tail event
- EVD-1 says amber = monitor, not fix
- The self-consistency spread (7pp, avg 37.3) shows the evidence pool was genuinely skewed — no post-hoc adjustment fixes skewed input
- Better extraction quality (passing source metadata to extraction LLM) would solve this without new mechanisms

**Arguments against (from other positions):**
- "Do nothing" means the pipeline has no defense against any single source dominating via volume
- The self-consistency mechanism did NOT flag this as unreliable — 3/3 runs converged on ~37, validating the skewed pool
- The problem recurs whenever a verbose low-reliability source appears in search results

---

## 10. Reconciled Analysis

### What the Challenger gets right

- This IS a tail event under EVD-1 amber governance.
- SR scores at 0.55 confidence should not be used for hard filtering.
- A blunt per-source cap discards evidence without analytical justification.
- Better extraction quality (source metadata in extraction prompts) is a valid complementary path.

### What the Challenger gets wrong

- "Do nothing" accepts that any verbose low-reliability source can dominate a verdict. That is not variance — it is a structural vulnerability. The self-consistency mechanism validated the skewed pool (spread=7, average=37.3), proving it cannot catch this failure mode.
- The extraction LLM does not currently receive source reliability context, so "better extraction quality" is itself an intervention, not an argument against intervention.

### What the Advocates get right

- **SR in verdict prompts (Position B)** is the narrowest, most AGENTS.md-compliant fix. It passes existing metadata to the LLM and lets the LLM reason. No new logic, no new thresholds.
- **Same-source consolidation (Position C)** addresses the correct root cause: same-source items are correlated observations, not independent ones. But it is more complex to implement.
- **Per-source cap (Position A)** is the simplest defense but is blunt. Acceptable as a safety net but not as the primary fix.

### What the Advocates get wrong

- A per-source cap of 5 is arbitrary without analytical backing. When ties exist (many same-source items share `probativeValue: high`), the selection within the cap is blunt and essentially arbitrary. This should be described honestly as a safety rail, not a precision instrument.
- SR prompt injection alone is unlikely to be sufficient. The challenger prompt in `claimboundary.prompt.md` already instructs the model to detect shared-source dependence and quality asymmetry. The verdict evidence already carries `sourceId`, `sourceUrl`, `sourceType`, and `probativeValue`. Despite this, the `efc5e66f` failure still passed through the debate. Adding `trackRecordScore` adds one more signal, but the model already had enough context to detect source concentration and did not act on it. This argues for shipping a structural safety rail (Fix 2) alongside Fix 1, not treating it as a later fallback.

---

## 11. Consolidated Proposal (revised per Senior Architect review)

Two interventions shipped together in the first rollout, one deferred:

### Fix 1 (SR-aware verdict reasoning): Payload + prompt-contract change

**What:** Three coordinated changes:
1. **Payload** (`verdict-stage.ts`): Add a compact per-source portfolio summary to the verdict prompt evidence context. Model on the approach in `source-reliability-calibration.ts` — pass a `sourcePortfolio` block listing each source's domain, `trackRecordScore`, `trackRecordConfidence`, and the count of evidence items it contributed. This is more informative than repeating SR fields on each individual evidence item.
2. **Prompt contract** (`claimboundary.prompt.md`): Add explicit instructions in VERDICT_ADVOCATE, VERDICT_CHALLENGER, and VERDICT_RECONCILIATION sections telling the model to consider the source portfolio when weighting evidence. Without this, the model has no contract to use the new data — the existing challenger prompt already instructs shared-source dependence detection and quality asymmetry detection, and it was not sufficient in `efc5e66f`.
3. **Prompt reseed**: After prompt edits, reseed via `reseed-all-prompts.ts --force` to update the UCM prompt blob.

**Why:** The verdict LLM currently cannot see that 11 items come from a 38%-reliability source. But adding the data alone is insufficient — the existing challenger prompt already had `sourceId`, `sourceUrl`, `sourceType`, and `probativeValue` available and still did not catch the flooding. The prompt contract must explicitly instruct the model to use track-record data in its reasoning.

**Scope:** This is **not** ~10 lines in `verdict-stage.ts`. It is payload change + prompt-contract change + prompt reseed. Prompt edits require explicit human approval per AGENTS.md.

**Expected impact:** The LLM can now reason with both the data and the instruction: "11 items from a source scoring 0.38 should carry less weight." Whether it does so reliably is empirical — hence shipping Fix 2 alongside as the structural guarantee.

### Fix 2 (Structural safety rail): Per-source evidence item cap

**What:** Add `maxEvidenceItemsPerSource` UCM parameter (default 5). Enforce in `research-extraction-stage.ts` after extraction, before items enter the evidence store.

**Why shipped together, not later:** Fix 1 alone is unlikely to be sufficient. The challenger prompt already instructs the model to detect shared-source dependence, and the verdict evidence already carries source metadata. Despite this, the `efc5e66f` failure passed through the debate. A structural cap provides a deterministic guarantee that no single source can dominate — regardless of whether the LLM acts on SR data or not.

**Honesty about bluntness:** When the cap truncates, it keeps items sorted by `probativeValue` descending. But many same-source items share the same `probativeValue` (e.g., all 11 civilizationworks items are `high`). Within-tier selection is essentially arbitrary (insertion order). This is acceptable for a safety rail — the cap's value is preventing 11-item flooding, not optimizing which 5 of 11 to keep. Describe honestly as a blunt structural guard, not a precision instrument.

**Scope:** ~20 lines in extraction stage + UCM config field in `config-schemas.ts` and `pipeline.default.json`.

### Fix 3 (Deferred): Same-source LLM consolidation

**What:** Post-extraction Haiku call to merge semantically redundant items from any source producing >threshold items.

**Why deferred:** Architecturally cleanest but most complex. Ship after Fix 1+2 and validate whether the simpler interventions are sufficient. If they are, Fix 3 becomes an optimization. If not, it addresses the deeper issue (same-source items are correlated observations, not independent ones).

### What NOT to do

| Action | Why not |
|--------|---------|
| Hard SR filtering (exclude sources below threshold) | Violates LLM Intelligence mandate — deterministic semantic gating |
| Enable Stage 4.5 SR calibration as-is | Post-hoc truth% adjustment is strictly worse than giving the LLM SR data during reasoning |
| Enable legacy `applyEvidenceWeighting()` as fallback | Only averages reliability over `supportingEvidenceIds` — does not address contradicting evidence from low-SR sources, which is the exact failure mode |
| Change D5 thresholds | D5 is correctly enforcing diversity — the problem is upstream evidence quality |
| Modify self-consistency | Self-consistency correctly converged — the evidence pool was genuinely skewed |
| Do nothing | Leaves a structural vulnerability where any verbose source can dominate |

---

## 12. Validation Plan

### After Fix 1 + Fix 2 (shipped together):

| # | Input | Family | Purpose |
|---|-------|--------|---------|
| 1 | Bolsonaro coup proceedings | Bolsonaro | Compare AC_01 TP to baseline (~38 pre-fix vs expected ~55-65) |
| 2 | Bolsonaro coup proceedings | Bolsonaro | Second run for consistency |
| 3 | Plastik recycling bringt nichts | Plastik DE | Regression check — verify no high-value sources lose critical evidence |
| 4 | Hydrogen efficiency | Hydrogen | Cross-family check |

**Success criteria:**
- AC_01 TP rises toward the 55-65 range
- No single source contributes >5 items to any claim
- No regression on Plastik DE or Hydrogen
- Verdict reasoning references source reliability in its analysis (Fix 1 validation)
- No high-value sources (peer-reviewed studies, legal documents) are truncated below usefulness by the cap

**Anti-success criteria (problems):**
- Fix 2 cap discards items from a source that was the only one providing a critical evidence type
- Verdict reasoning ignores the SR data despite prompt-contract change (Fix 1 not effective)
- Overall evidence counts drop below D5 sufficiency thresholds due to cap

---

## 13. Final Judgment

**`Single-source flooding is a real structural vulnerability, not acceptable variance`**

The pipeline has no defense against a verbose low-reliability source dominating the evidence pool for a claim. Self-consistency validates the skewed pool rather than flagging it. SR scores exist but are missing from the active verdict path. The existing challenger prompt already instructs source-dependence detection but was insufficient. This is not a tail-event tolerance question — it is a missing structural safeguard.

**Recommended next task:** Implement Fix 1 (SR payload + prompt-contract) and Fix 2 (per-source cap) together as one rollout.

**Why together:** Fix 1 is the analytical improvement (LLM-aware SR reasoning) but is not guaranteed to change behavior — the challenger already had source metadata and failed to act on concentration. Fix 2 is the structural guarantee (no source gets >5 items). Together they provide both the analytical signal and the deterministic backstop. Fix 1 prompt edits require explicit human approval.

**Approval required:** Prompt-contract changes to VERDICT_ADVOCATE, VERDICT_CHALLENGER, and VERDICT_RECONCILIATION in `claimboundary.prompt.md`.
