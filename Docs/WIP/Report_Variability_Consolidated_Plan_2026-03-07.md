# Report Variability — Consolidated Root Cause Analysis & Remediation Plan

**Date:** 2026-03-07
**Author:** Lead Architect (Claude Code, Opus 4.6)
**Status:** Review-ready — awaiting Captain approval
**Scope:** Consolidation of three agent investigations into one implementation-ready plan

---

## 1. Executive Summary

Repeated-input verdict variability on Bolsonaro legal-case inputs is **real, pre-existing, and recently amplified**. The observed truth-percentage swing widened from ~16 pp (pre-March 5) to ~27 pp (post-March 5).

**Root cause is compound, not singular.** Three layers interact:

1. **Inherent LLM/search nondeterminism** — baseline ~10-15 pp variance on politically sensitive, evaluative inputs. This is irreducible without architectural changes.
2. **Stage 1 claim-decomposition instability** — the same input can extract 1 or 2 claims depending on LLM sampling and soft-refusal recovery. This was the primary driver of the March 1 swing (16 pp).
3. **March 3-5 changes amplified downstream variance** — wider search provider mix, relaxed sufficiency gating, and prompt churn combined to let noisier evidence pools produce directional verdicts more easily. This is why the problem got worse.

**The single most impactful immediate action is:** restore `evidenceSufficiencyMinSourceTypes` from 1 to 2. This does not fix variance — it prevents low-diversity evidence pools from producing confident directional verdicts, converting noisy runs into `UNVERIFIED` instead of misleading directional answers.

**The single most important diagnostic action is:** run a controlled A/B comparing current prompts against pre-March-3 prompts with provider mix held constant.

---

## 2. Source Investigations

| # | Document | Agent | Key Contribution |
|---|----------|-------|------------------|
| 1 | [Bolsonaro_Report_Variability_Investigation_2026-03-07.md](../WIP/Bolsonaro_Report_Variability_Investigation_2026-03-07.md) | Sr. Developer + LLM Expert (Codex GPT-5) | Ranked 7 candidate causes with probabilities; identified exact-duplicate March 1 variance; confirmed evidence-pool instability in March 6-7 runs; proposed phased A/B plan |
| 2 | [UCM_Config_Drift_Review_2026-03-05.md](../WIP/UCM_Config_Drift_Review_2026-03-05.md) + [Handoff](../AGENTS/Handoffs/2026-03-05_Senior_Developer_UCM_Config_Drift_Investigation.md) | Sr. Developer (Claude Opus) | Discovered JSON-TS config drift; SR model mismatch; Captain-approved quality tuning decisions; phased fix plan |
| 3 | [UCM_Default_Change_History](../AGENTS/Handoffs/2026-03-07_Unassigned_UCM_Default_Change_History.md) | Codex GPT-5 | Complete commit-by-commit UCM change inventory; identified multi-flip parameters (mixedConfidenceThreshold, verdictGroundingPolicy, selfConsistencyMode) |

**Supporting:** [Ambiguous_Claim_Decomposition_Quality.md](../WIP/Ambiguous_Claim_Decomposition_Quality.md) — documents the dimension-label prompt fixes (A, B, C) that landed March 5, directly affecting Stage 1 decomposition behavior.

---

## 3. Confirmed Root Causes (Ranked)

### Confidence scale
- **HIGH** = confirmed by data (DB jobs, git diffs, config snapshots)
- **MEDIUM** = supported by evidence but not isolated
- **LOW** = plausible but untested

| Rank | Cause | Confidence | Evidence | Variance Contribution |
|------|-------|------------|----------|----------------------|
| **1** | **Stage 1 claim-decomposition instability** | HIGH | March 1: same input extracted 2 claims vs 1 claim = 16 pp swing. Prompt changed 6+ times March 3-5 (ambiguous decomposition rules, dimension labels, geo/language inference). | Primary upstream driver. Different claims = different research = different verdict. |
| **2** | **Search provider mix expansion (AUTO mode)** | HIGH | March 5 enabled serpapi + brave. March 6 vs March 7 runs show completely different domain mixes (amnesty/carnegie vs aljazeera/bbc/pbs) with same extracted claim. Evidence item counts: 22 vs 41. | Major downstream amplifier. Same claim, wildly different evidence pool. |
| **3** | **Relaxed evidence sufficiency gate** | HIGH | `evidenceSufficiencyMinSourceTypes` changed from 2 to 1 on March 5. Allows single-genre evidence pools to produce directional verdicts. Previously, low-diversity pools would be gated to UNVERIFIED. | Containment failure — lets noisy runs through instead of flagging them. |
| **4** | **Disabled verdict integrity policies** | MEDIUM | `verdictGroundingPolicy` and `verdictDirectionPolicy` both `disabled`. Recent jobs emit `verdict_grounding_issue` and `verdict_direction_issue` warnings but verdicts ship anyway. Current_Status.md says these are enabled — stale. | Not a cause of variance, but a containment failure. Unstable verdicts pass without downgrade. |
| **5** | **Pass 2 soft-refusal / fallback recovery** | MEDIUM | March 1 job `2a867099` hit Pass 2 soft refusal and recovered via fallback model (claude-haiku), producing 1 claim instead of 2. Politically sensitive legal inputs trigger this path. | Episodic amplifier for sensitive inputs. Not consistently reproducible. |
| **6** | **Config deep-merge behavior change** | LOW | March 5 commit `7e0d4d03` changed config loading from missing-field behavior to deep-merging defaults. May have activated previously-dormant defaults. | Possible one-time amplifier. Needs verification. |
| **7** | **Self-consistency temperature too high** | LOW | `selfConsistencyTemperature = 0.4` introduces sampling noise in self-consistency checks. Lower temperature would isolate evidence-driven variance from sampling noise. | Diagnostic noise, not a direct cause of user-visible variance. |

### Overlap Resolution Between Investigations

| Topic | Investigation 1 | Investigation 2 | Resolution |
|-------|-----------------|-----------------|------------|
| **evidenceSufficiencyMinSourceTypes** | Lists as Cause #3 (0.68 probability); recommends restoring to 2 | Lists as Item 2e; Captain **blocked** — "keep 1 until domain-diversity fallback stability confirmed" | **Conflict.** Investigation 1's data is more recent and shows this is actively enabling bad verdicts. Recommend: **restore to 2 now** with a monitoring escape hatch (see Phase 1). Captain blocked this on March 5 before the variability data was available. New evidence changes the risk calculus. |
| **Search provider mix** | Lists as Cause #2 (0.74); recommends disabling serpapi/brave in production | Investigation 2 does not address this directly | **No conflict.** Accept Investigation 1's recommendation. |
| **Integrity policies** | Lists as Cause #5 (0.39); recommends a softer middle-ground mode | Investigation 2 does not address integrity policies | **No conflict.** Accept, but this is Phase 2 work. |
| **mixedConfidenceThreshold** | Not directly mentioned | Captain approved at 50, then reduced to 45 in commit `4edee1b4` | **Resolved.** Currently 45 in runtime. The 40→50→45 oscillation is itself a variability amplifier (changing the label boundary mid-testing). Recommend: **freeze at 45** until stability is confirmed. |
| **defaultScore** | Not directly mentioned | Captain approved 0.4→0.45 | **No conflict.** Already deployed. Keep 0.45. |
| **domainBlacklist** | Not directly mentioned | Captain approved 9 domains | **No conflict.** Already deployed. Keep. |

---

## 4. Decision Log

### Decisions Made (by this review)

| # | Decision | Rationale | Reversible? |
|---|----------|-----------|-------------|
| D1 | **Override Captain's March 5 block on `evidenceSufficiencyMinSourceTypes` — restore to 2** | New data (March 6-7 jobs) shows single-genre evidence pools are producing misleading directional verdicts. The original block assumed "domain-diversity fallback stability" was needed first, but the current situation (27 pp swings) is worse than the UNVERIFIED false-positive risk. | Yes — UCM change, instant rollback. |
| D2 | **Narrow AUTO search to google-cse primary; brave as emergency fallback (priority=10); disable serpapi** | Evidence-pool instability is the #2 ranked cause. Captain modification M1: fully disabling both providers leaves zero primary search on google-cse circuit-open. Brave at priority=10 only fires as last resort. | Yes — UCM change. |
| D3 | **Freeze ALL pipeline-stage prompts in `apps/web/prompts/` until 5x repeated-run stability passes** | 6+ prompt commits in 3 days. Captain decision Q5: freeze applies to all prompts, not just claimboundary. No exceptions without 5x stability confirmation. | Process change, no code. |
| D4 | **Freeze `mixedConfidenceThreshold` at 45** | Three value changes (40→50→45) in the same week. Each change shifts the MIXED/directional boundary and makes cross-run comparisons unreliable. | UCM freeze — communicate to team. |
| D5 | **Update Current_Status.md to reflect actual runtime state** | Currently says integrity policies are enabled; they are disabled. Stale docs erode trust in the status system. | Doc update only. |

### Captain Decisions (2026-03-07)

| # | Question | Decision | Notes |
|---|----------|----------|-------|
| Q1 | Override sufficiency gate (restore to 2)? | **Approved (Option A)** | OR logic in Appendix C structurally mitigates the false-positive risk that motivated the original block. New variance data justifies override. |
| Q2 | Integrity policy approach? | **Option B (`warn_and_cap`)** | Phase 2 only. Keep disabled in Phase 1. |
| Q3 | A/B timing? | **Option B (post-fix)** | Running A/B on broken config wastes money. |
| Q4 | selfConsistencyTemperature? | **Defer (Option B)** | Phase 3. |
| Q5 | Prompt freeze scope? | **All pipeline-stage prompts** in `apps/web/prompts/`, not just `claimboundary.prompt.md`. No exceptions without 5x stability confirmation. |
| Q6 | mixedConfidenceThreshold 50 vs 45? | **Freeze at 45** | Reduction from 50 lacks documented rationale — flag as gap. Revisit post-Phase 1 stability confirmation. |

### Captain Modifications to Plan

| # | Original | Modified To | Rationale |
|---|----------|-------------|-----------|
| M1 | Step 1.2: fully disable serpapi + brave | **Set `brave.priority=10` (emergency fallback), disable serpapi only** | Zero primary search on google-cse circuit-open is unacceptable. Priority=99 means brave only fires as last resort — lower variance than full-enable, covers the outage case. |
| M2 | D5 alongside Phase 1 | **D5 first, before Phase 1 config changes** | Stale docs during active investigation mislead other agents. |
| M3 | No mention of affected jobs | **Flag March 5-7 jobs in admin dashboard** | Jobs that ran during high-variance window may have unreliable verdicts. Users should be aware. |

---

## 5. Phased Implementation Plan

### Phase 1: Immediate Containment (1-2 days, low risk)

**Goal:** Stop the worst variance from reaching users. No prompt changes.

| Step | Action | Config Type | Current | Target | Risk |
|------|--------|-------------|---------|--------|------|
| 1.1 | Restore evidence sufficiency gate | Calculation UCM | `evidenceSufficiencyMinSourceTypes: 1` | `2` | LOW — some claims may become UNVERIFIED. Mitigated by OR logic: claims pass if they have 2+ source types OR 3+ distinct domains (see Appendix C). Claims with diverse domains but a single source type still pass. |
| 1.2 | Narrow AUTO search to google-cse primary; brave as emergency fallback | Search UCM | serpapi: true, brave: true (both priority 2) | serpapi: false; brave: true with priority=10 (emergency-only) | LOW — google-cse handles normal traffic; brave only fires if google-cse circuit-opens. Eliminates provider-mix variance while preserving search availability. |
| 1.3 | Update Current_Status.md | Docs | Stale (says policies enabled) | Accurate runtime state | NONE |
| 1.4 | Freeze ALL pipeline-stage prompts (process) | Communication | — | No edits to any prompt in `apps/web/prompts/` without 5x stability check | NONE |

**Validation after Phase 1:**
- Run the standard Bolsonaro input 5x
- Success criteria: truth% spread <= 12 pp, no verdict-direction flip, claim extraction stable across all 5 runs

### Phase 2: Structural Fixes (1-2 weeks, medium risk)

**Goal:** Address root causes, not just containment.

| Step | Action | Detail | Risk |
|------|--------|--------|------|
| 2.1 | Implement softer integrity containment mode | New policy option: `warn_and_cap`. On grounding/direction issue: emit user-visible warning (severity `warning`), cap confidence at 55 (keeps MEDIUM tier), preserve original truth%. Does NOT force truth to 50 or tier to INSUFFICIENT. See Appendix C for exact code changes (5 files, ~40 lines). | MEDIUM — new code path paralleling existing `safeDowngradeVerdict`. Needs testing. |
| 2.2 | Add stability telemetry to job metadata | Persist per job: prompt hash, config hashes, extracted atomic claims, source-domain histogram, provider list used. | LOW — additive metadata. |
| 2.3 | Create repeated-run stability test suite | 5 canonical inputs (1 legal/political, 1 scientific, 1 economic, 1 multilingual, 1 non-controversial control). Run each 5x. Track truth spread, confidence spread, claim-count spread, domain spread. | LOW — test infrastructure. Cost: ~$15-25 per full run. |
| 2.4 | A/B prompt experiment (if Phase 1 doesn't stabilize) | Compare current claimboundary prompt vs pre-`902d8fdb` prompt with Phase 1 config (google-cse only, sufficiency=2). 5x each. | MEDIUM — $10-15. Only run if Phase 1 validation shows spread > 12 pp. |
| 2.5 | Search provider quality comparison | Run identical query sets through all available providers separately. Compare: result relevance, domain authority distribution, coverage breadth, and downstream verdict impact. Goal: determine whether quality gap is real or an artifact of provider-mix variance, and identify the best long-term CSE replacement. See **Appendix D: Search Provider Landscape** for full evaluation matrix. | LOW — research only, no code changes. Cost: ~$5-10 for query runs. |

### Phase 3: Long-term Robustness (2-4 weeks, lower priority)

| Step | Action | Detail |
|------|--------|--------|
| 3.1 | selfConsistencyTemperature calibration | Design proper calibration study: run 10x at temp 0.2, 0.3, 0.4 on 3 inputs. Co-adjust spread thresholds. |
| 3.2 | Search provider determinism layer | If multiple providers must be active, implement result deduplication and source-priority ranking to reduce domain-mix variance. |
| 3.3 | Claim-extraction stability gate | Add a lightweight check: if the same input produces different claim counts across self-consistency runs, flag and retry with lower temperature. |
| 3.4 | CI config drift guard | Vitest test that fails build if JSON defaults diverge from TS constants (already planned in UCM Drift Review Phase 3). |
| 3.5 | Pass 2 soft-refusal hardening | Investigate why politically sensitive legal inputs trigger Pass 2 soft refusal. Consider pre-warming the model with a system prompt that prevents refusal on analysis tasks. |
| 3.6 | Search provider migration strategy | Based on 2.5 findings, plan migration from google-cse (hard quota ceiling, no increase path) to the best-performing scalable provider. Top candidates: **Serper** (queries Google index directly, $1/1k queries, scalable) and **Tavily** (AI-native search with content extraction, $8/1k queries). Must address: quality parity validation, clean cutover approach (single primary, not multi-provider mix), quota monitoring, and circuit-breaker tuning for the new primary. See Appendix D. |

---

## 6. Validation Matrix

### Phase 1 Validation (required before Phase 2)

| Test | Input | Metric | Pass Criteria | Run Count |
|------|-------|--------|---------------|-----------|
| V1 | "Was the Bolsonaro judgment (trial) fair and based on Brazil's law?" | Truth% spread | <= 12 pp | 5x |
| V1 | Same | Verdict direction | No flip (all same direction) | 5x |
| V1 | Same | Claim count | Stable (same count all 5 runs) | 5x |
| V2 | "Were the Bolsonaro trials conducted in accordance with Brazilian law, and were the verdicts fair?" | Truth% spread | <= 12 pp | 5x |
| V3 | "Os julgamentos de Bolsonaro foram justos e baseados na legislacao brasileira?" | Truth% spread | <= 15 pp (multilingual tolerance) | 3x |
| V4 | Non-controversial control (e.g., "Is the Earth round?") | Truth% spread | <= 5 pp | 3x |

**Total estimated cost:** ~$15-20 (16 runs x ~$1/run)

### Phase 2 Validation (required before production rollout)

| Test | What | Pass Criteria |
|------|------|---------------|
| V5 | Integrity `warn_and_cap` mode on jobs with grounding issues | Warning appears in report; truth% NOT forced to 50; confidence capped at 55 |
| V6 | Stability telemetry populated | All new metadata fields present in job results |
| V7 | Stability test suite green | All 5 canonical inputs pass spread criteria |
| V8 | `npm test` | All existing tests pass |
| V9 | `npm -w apps/web run build` | Clean build |

---

## 7. Rollback / Containment Strategy

### Phase 1 Rollback

All Phase 1 changes are UCM config changes — instantly reversible via Admin UI or CLI.

| Change | Rollback Action | Time |
|--------|----------------|------|
| `evidenceSufficiencyMinSourceTypes: 2` | Set back to 1 via Admin UI | < 1 minute |
| serpapi/brave disabled | Re-enable via Admin UI | < 1 minute |
| Prompt freeze | Resume normal development | Immediate |

**Trigger for rollback:** If Phase 1 causes a significant increase in UNVERIFIED verdicts (> 30% of runs on the stability test suite), roll back `evidenceSufficiencyMinSourceTypes` to 1 and investigate domain-diversity fallback alternatives.

### Phase 2 Rollback

| Change | Rollback Action |
|--------|----------------|
| Integrity `warn_and_cap` mode | Set policy back to `disabled` via UCM |
| Telemetry fields | Additive — no rollback needed |
| Stability test suite | Test infrastructure — no rollback needed |

### Emergency Containment

If a user reports a clearly wrong verdict before Phase 1 is complete:
1. Check the job's warnings for `verdict_grounding_issue` or `verdict_direction_issue`
2. If present, mark the job as requiring re-run with a note
3. Do NOT manually edit verdicts

---

## 8. Open Questions — All Resolved

All questions answered by Captain on 2026-03-07. See "Captain Decisions" in Section 4.

### Remaining Action Items (from Captain review)

| # | Item | Status |
|---|------|--------|
| M3 | Flag March 5-7 jobs in admin dashboard as potentially unreliable | Pending — needs implementation approach (Phase 2 or immediate?) |
| — | Document rationale gap for `mixedConfidenceThreshold` 50→45 reduction | Pending — revisit post-Phase 1 stability |

---

## 9. Relationship to Existing Approved Decisions

The UCM Config Drift Review (March 5) had Captain-approved decisions. This plan's relationship:

| UCM Drift Decision | Status | This Plan |
|--------------------|--------|-----------|
| Phase 1 (JSON-TS alignment) | Implemented (commit `9297689a`) | No change needed |
| 2a domainBlacklist (9 domains) | Implemented | No change needed |
| 2b selfConsistencyTemp (blocked) | Still blocked | Agree — defer to Phase 3 |
| 2c gate4QualityHigh = 0.75 | Implemented | No change needed |
| 2d mixedConfidence = 50 | **Overridden to 45** (commit `4edee1b4`) | Flag for Captain (Q6) |
| 2e sufficiencyMinSourceTypes (blocked at 1) | Still blocked | **Override recommended** — new evidence (D1) |
| 2f defaultScore = 0.45 | Implemented | No change needed |
| Phase 3 (CI drift test) | Not yet implemented | Include in Phase 3 (step 3.4) |

---

## Appendix A: Timeline of Changes (March 3-7)

| Date | Commit | Change | Impact on Variability |
|------|--------|--------|----------------------|
| Mar 3 | `4ca33376` | Geo-aware search: language/geography detection added to Pass 1 | Changed query generation context |
| Mar 3 | `9297689a` | JSON-TS config alignment (Phase 1 of UCM drift fix) | Activated previously-dormant TS defaults via JSON |
| Mar 3 | `3a9f91cd` | Quality tuning: gate4=0.75, defaultScore=0.45, domainBlacklist=9 | Tightened quality gates, added domain filtering |
| Mar 3 | `7e0d4d03` | Config deep-merge: stored configs now merged with defaults | May have activated new defaults on old profiles |
| Mar 3 | `902d8fdb` | Ambiguous claim decomposition fixes (A+B) | Changed Stage 1 behavior for evaluative inputs |
| Mar 5 | `f1dfb18f` | Dimension independence test (Fix C) in prompts | Further changed Stage 1 decomposition |
| Mar 5 | `75f81550` | Remove language restriction from web search calls | Changed search behavior |
| Mar 5 | `0e7ab091` | Drop geo/language params from search providers | Changed search behavior |
| Mar 5 | `f9afb6df` | Enable search fallbacks, harden circuit breaker | Changed provider selection |
| Mar 5 | `4665ff07` | Generic geography examples, claim ID remapping | Changed pipeline behavior |
| Mar 5 | config.db | serpapi + brave enabled in search config | Widened provider mix — major variance amplifier |
| Mar 5 | config.db | evidenceSufficiencyMinSourceTypes set to 1 | Relaxed sufficiency gate — containment failure |
| Mar 5 | config.db | mixedConfidenceThreshold reduced 50→45 | Shifted MIXED/directional boundary |

---

## Appendix B: Current Runtime Configuration (Verified 2026-03-07)

| Parameter | Value | Set By | Concern? |
|-----------|-------|--------|----------|
| evidenceSufficiencyMinSourceTypes | 1 | UCM (Mar 5) | YES — Phase 1 target |
| serpapi.enabled | true | UCM (Mar 5) | YES — Phase 1 target |
| brave.enabled | true | UCM (Mar 5) | YES — Phase 1 target |
| verdictGroundingPolicy | disabled | UCM | YES — Phase 2 target |
| verdictDirectionPolicy | disabled | UCM | YES — Phase 2 target |
| selfConsistencyTemperature | 0.4 | UCM | Minor — Phase 3 |
| mixedConfidenceThreshold | 45 | UCM | Frozen — Q6 for Captain |
| gate4QualityThresholdHigh | 0.75 | UCM | OK — approved and deployed |
| sourceReliability.defaultScore | 0.45 | UCM | OK — approved and deployed |
| domainBlacklist | 9 domains | UCM | OK — approved and deployed |
| selfConsistencyMode | full | UCM | OK |

---

## Appendix C: Implementation-Critical Code References

### Phase 1.1 — Evidence Sufficiency Gate (UCM-only, no code changes)

**Gate logic:** `claimboundary-pipeline.ts:310-342`

The sufficiency gate checks three conditions per atomic claim:

```
1. evidenceSufficiencyMinItems (default: 3) — total evidence items >= threshold
2. evidenceSufficiencyMinSourceTypes (target: 2) — distinct sourceType values >= threshold
3. evidenceSufficiencyMinDistinctDomains (default: 3) — distinct normalized domains >= threshold
```

**Critical detail — OR logic (line 327-329):**
```typescript
const hasSufficientSourceDiversity =
  distinctSourceTypes.size >= sufficiencyMinSourceTypes ||   // Check 1
  distinctDomains.size >= sufficiencyMinDistinctDomains;     // Check 2 (OR)
```

A claim passes diversity if EITHER source types OR domain count meets its threshold. This means:
- A claim with only `news_primary` sources but from 3+ distinct domains still passes
- A claim with 2+ source types but only 1 domain still passes
- Only claims failing BOTH checks become UNVERIFIED

**Fallback verdict:** `createUnverifiedFallbackVerdict()` at line 3453 produces: truthPercentage=50, confidence=0, confidenceTier=INSUFFICIENT, verdict=UNVERIFIED.

**No code changes needed.** Setting `evidenceSufficiencyMinSourceTypes=2` in Admin UI / UCM takes effect on next job run.

---

### Phase 1.2 — Search Provider Narrowing (UCM-only, no code changes)

**AUTO mode logic:** `web-search.ts:260-294`

Provider selection flow:
1. `buildAutoProviderInfos()` (line 418-432) filters candidates by `hasCredentials() && isEnabled(config)`
2. Candidates sorted by priority (google-cse=1, serpapi=2, brave=2)
3. Sequential iteration: tries each provider until `maxResults` satisfied
4. Circuit breaker wraps each provider: 3 consecutive failures = 5 min cooldown (`search-circuit-breaker.ts`)

**Fallback risk when serpapi/brave disabled:**
- If google-cse fails, no other primary provider is available
- Supplementary providers (wikipedia, semantic-scholar) only provide background context, not primary search
- Circuit breaker cooldown = 300 seconds with no primary search capability

**Mitigation alternative:** Instead of fully disabling brave, set `brave.enabled=true` with `brave.priority=10` — this keeps it as an emergency-only fallback that never fires unless google-cse is circuit-open. However, this approach is untested and the clean disable is simpler for Phase 1.

**No code changes needed.** Setting `providers.serpapi.enabled=false` and `providers.brave.enabled=false` in Admin UI / UCM takes effect on next job run.

---

### Phase 2.1 — `warn_and_cap` Integrity Mode (Code Changes Required)

**Existing architecture:** `verdict-stage.ts:970-1055`

Step 5 validation runs grounding + direction checks after all debate steps. Current policy options:
- `disabled`: log info-level warning, no verdict modification
- `safe_downgrade`: force truth=50, cap confidence<=24, tier=INSUFFICIENT, severity=error

**Files to modify:**

| File | Line(s) | Change |
|------|---------|--------|
| `verdict-stage.ts` | 47 | Add `"warn_and_cap"` to `VerdictGroundingPolicy` type union |
| `verdict-stage.ts` | 48 | Add `"warn_and_cap"` to `VerdictDirectionPolicy` type union |
| `config-schemas.ts` | 492 | Extend Zod enum: `z.enum(["disabled", "safe_downgrade", "warn_and_cap"])` |
| `config-schemas.ts` | 496 | Extend Zod enum: `z.enum(["disabled", "retry_once_then_safe_downgrade", "warn_and_cap"])` |
| `verdict-stage.ts` | ~988-996 | Add `else if (config.verdictGroundingPolicy === "warn_and_cap")` branch |
| `verdict-stage.ts` | ~1007-1048 | Add `warn_and_cap` branch for direction policy |
| `verdict-stage.ts` | ~1175 | New `warnAndCapVerdict()` function |
| `pipeline.default.json` | 119-120 | Optionally set as new default (recommend keeping `disabled` until validated) |

**Proposed `warnAndCapVerdict()` behavior:**

| Property | `safe_downgrade` (existing) | `warn_and_cap` (proposed) |
|----------|----------------------------|---------------------------|
| truthPercentage | Forced to 50 | **Preserved** (original) |
| confidence | Capped at 24 (INSUFFICIENT max) | **Capped at 55** (stays in MEDIUM tier) |
| confidenceTier | Forced to INSUFFICIENT | Recalculated from capped confidence |
| verdict | Recalculated from truth=50 | **Preserved** (original direction) |
| verdictReason | `verdict_integrity_failure` | `verdict_integrity_warning` |
| Warning severity | `error` | `warning` |
| Warning type | `verdict_integrity_failure` | `verdict_integrity_warning` |

**Design decision — confidence cap value:**
- 24 (existing INSUFFICIENT_CONFIDENCE_MAX) is too harsh — forces INSUFFICIENT tier, equivalent to "no valid verdict"
- 55 keeps the verdict in MEDIUM tier, which communicates "we have a verdict but with reduced confidence"
- This is the key behavioral difference from `safe_downgrade`

**Implementation pattern:** Parallel to existing `safeDowngradeVerdict()` function at line 1146-1174. Same inputs, different output transformation. ~20 lines of new code.

**Warning registration:** Add `verdict_integrity_warning` to `warning-display.ts` classification map with `bucket: "analysis", impact: "degrading"`

---

## Appendix D: Search Provider Landscape & Migration Strategy

**Context:** Google CSE has a hard daily quota ceiling with no option to increase. Long-term, FH needs a scalable replacement. This appendix documents the provider landscape as of March 2026.

### D.1 Market Context

- **Bing Search API retired August 2025.** Only three large-scale web indices remain in the West: Google, Brave, and (partially) Yandex.
- **Brave Search API** is now the only commercially available independent web index. Powers most top-10 LLMs for real-time search. SOC 2 Type II certified (Oct 2025).
- **AI-native search APIs** (Tavily, Exa) are a new category — purpose-built for LLM consumption with content extraction and structured output.

### D.2 Provider Evaluation Matrix

| Provider | Index Source | Result Quality | Scalability | Pricing (per 1k queries) | Content Extraction | FH Fit | Status |
|----------|-------------|---------------|-------------|--------------------------|-------------------|--------|--------|
| **Google CSE** | Google index | Best | Hard ceiling (no increase) | Fixed quota | No | Current primary | Integrated |
| **Brave** | Independent (30B pages) | Good, weaker on long-tail | 10k/day, scalable plans | Variable | No | Emergency fallback | Integrated (priority 10) |
| **SerpAPI** | Multi-engine (Google, Bing†, etc.) | Good (Google-proxied) | Subscription-based | ~$15 | No | Re-enabled | Integrated |
| **Serper** | Google index (direct) | Same as Google CSE | Pay-as-you-go, no ceiling | $0.30–$1.00 | No | **HIGH — best CSE replacement candidate** | **Newly subscribed** |
| **Tavily** | Proprietary + web | Good for AI workflows | Pay-as-you-go | ~$8 | Yes (built-in) | HIGH — reduces pipeline complexity | Not integrated |
| **Exa** | Proprietary (semantic) | Best for nuanced queries | Enterprise pricing | ~$5 (opaque) | Partial | MEDIUM — semantic search could improve evidence relevance | Not integrated |
| **You.com** | Proprietary | Good, citation-focused | Contact-only pricing | Unknown | Yes | LOW — unpredictable pricing | Not integrated |

†Bing engine deprecated since Aug 2025 — SerpAPI's multi-engine advantage is reduced.

### D.3 Top Candidates for CSE Replacement

**1. Serper (Priority: Evaluate First)**
- Queries Google's actual index — same result quality as CSE
- Scalable pay-as-you-go pricing ($0.30–$1.00 per 1k queries at volume)
- No hard quota ceiling
- 300 queries/second throughput
- Structured JSON response, 1-2s latency
- Risk: Single vendor dependency on Google index (same as CSE)

**2. Tavily (Priority: Evaluate Second)**
- AI-native: pre-processes, chunks, and structures results for LLM consumption
- Built-in content extraction eliminates separate scraping step
- #1 on DeepResearch Bench (accuracy benchmark)
- Sub-200ms latency
- Acquired by Nebius (Feb 2026) — watch for pricing/direction changes
- Risk: Keyword-based retrieval weaker on complex multi-step queries

### D.4 Evaluation Criteria for Phase 2.5

For each provider, run the same 10 query sets (covering diverse topics and languages) and measure:

| Criterion | Weight | Measurement |
|-----------|--------|-------------|
| Result relevance | 30% | LLM-scored relevance of top-10 results to original claim |
| Domain authority distribution | 20% | Proportion of institutional/primary vs secondary/aggregator sources |
| Coverage breadth | 15% | Number of distinct domains and source types in results |
| Verdict impact | 20% | Run full pipeline with each provider; compare verdict stability |
| Latency | 5% | P50 and P95 response times |
| Cost at projected volume | 10% | Monthly cost at 1k, 5k, 20k analyses/month |

### D.5 Migration Path (Phase 3.6)

Once evaluation data is available, the migration follows this pattern:
1. Integrate winning provider into `web-search.ts` (new provider class)
2. Set as priority 2 (first fallback) — run in shadow mode alongside CSE for 1 week
3. Compare live results: if quality parity confirmed, promote to priority 1
4. Demote google-cse to fallback (priority 9-10)
5. Monitor for 2 weeks before removing CSE dependency
