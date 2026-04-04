# Next Workstream Decision — Lead Architect Review

**Date:** 2026-03-26
**Role:** Lead Architect (Review Captain)
**Method:** Four-reviewer panel (Quality, Optimization, Code Reality, Challenger), reconciled by architect
**Status:** Decision-grade recommendation

**Update note (2026-04-04):** This document remains the historical decision record for 2026-03-26, but parts of its retrieval-default observations are now stale. Current code/defaults now enable Wikipedia as a bounded supplementary provider and use `supplementaryProviders.mode = "always_if_enabled"` in the default search config. For current retrieval planning, prefer `Docs/WIP/2026-03-03_Wikipedia_SemanticScholar_Integration_Concept.md`, `Docs/ARCHIVE/2026-04-03_Wikipedia_Supplementary_Completion_Plan.md`, `Docs/STATUS/Backlog.md`, and `Docs/STATUS/Current_Status.md`.

---

## 1. Executive Summary

**Final judgment: Do neither yet.**

No formal quality or optimization track should be opened. But "monitor mode" must not mean "do nothing." The review panel identified several cheap, high-learning backlog items that should be executed within the existing monitor-mode framework — without requiring a new formal workstream.

**Recommended next task: W15 domain-aware fetch batching**
**Why this first:** It is the smallest high-leverage reliability fix (~50-100 lines) that directly addresses the evidence-retrieval layer — the area the entire Long-Run Variance Reduction Roadmap identifies as the highest-confidence future lever. It prevents a known failure mode (100% fetch failure when search results cluster on one domain) and requires no design change, no fresh baseline, and no policy override.

---

## 2. What the Reviewer Team Found

### 2a. Quality Reviewer

**Verdict: No strong controllable quality opportunity justifies reopening a track.**

Key findings verified in code:
- **Article-level contrarian retrieval (D5 C13) is active** (`contrarianRetrievalEnabled: true` in `calculation.default.json`), but it is a single-pass mechanism — not an iterative rebalancing loop. Post-contrarian balance is logged but not acted upon further.
- **Only 2 of 7 search providers are enabled by default** (Google CSE and Serper). Brave, SerpAPI, Wikipedia, Semantic Scholar, and Google Fact Check are all wired but disabled.
- **The debate structure is sound** — 5-step pattern (advocate → self-consistency × 2 → adversarial challenger → reconciliation → validation), with cross-provider diversity (OpenAI challenger vs Anthropic advocate/reconciler). No obvious structural weakness.
- **UCM backlog items are partially stale**: UCM-1 (research depth) is mostly resolved in CB pipeline config. UCM-2 (source extraction limit) is already UCM-configurable as `sourceExtractionMaxLength`. UCM-3 (pipeline temperatures) is the only material remaining gap.
- **QLT-4's preflight confirmed** that per-claim evidence is already directionally balanced (ratio 0.62, 21 minority items). Remaining variance is content/quality-driven, not direction-scarcity-driven.
- **Highest-leverage quality improvement if one were forced**: enable Brave Search as a third provider (config-only, requires API key). Adds an independent search index. But impact on variance is unproven and does not justify opening a track.

### 2b. Optimization Reviewer

**Verdict: P1-B (preliminary search parallelism) is a valid, zero-risk optimization that can start immediately without a fresh baseline.**

Key findings verified in code:
- **~50-65 LLM calls per typical run** (40-50 Haiku, 8-10 Sonnet, 1 OpenAI). Stage 2 research dominates call count.
- **P1-B is confirmed valid**: `claim-extraction-stage.ts:718-839` runs 6 sequential search-fetch-extract cycles (3 claims × 2 queries). Parallelizing across claims would reduce Stage 1 latency by ~30-60 seconds. Zero quality risk — same searches, same LLM calls, just concurrent.
- **P1-A (clustering model downgrade) is still valid but small**: Stage 3 uses Sonnet (`getModelForTask("verdict")` at `boundary-clustering-stage.ts:314`), but it is a single call out of ~60. Saving: ~2-5% of total cost. Still quality-affecting and requires a baseline.
- **`explanationQualityMode: "rubric"` is on by default**, adding one Sonnet call per run for post-hoc quality scoring. Switching to `"structural"` saves ~$0.01-0.03/run with zero analysis impact.
- **No fresh baseline needed for P1-B** since it changes only timing, not analysis output.

### 2c. Code Reality Checker

**Verdict: Most doc claims match code. One material mismatch found.**

| Doc Claim | Code Reality | Status |
|-----------|-------------|--------|
| SR calibration feature-flagged/off | `sourceReliabilityCalibrationEnabled: false`, `sourceReliabilityCalibrationMode: "off"` — but SR *evaluation* (`SR_CONFIG.enabled`) is **true**. These are distinct systems. | **CONFIRMED** (but docs should distinguish evaluation from calibration) |
| Article-level contrarian retrieval active | `contrarianRetrievalEnabled: true`, single-pass at `claimboundary-pipeline.ts:417` | **CONFIRMED** |
| Clustering temperature 0.05 | `boundaryClusteringTemperature: 0.05` in both config and code fallback | **CONFIRMED** |
| Self-consistency T=0.4 | `selfConsistencyTemperature: 0.4` in config and code | **CONFIRMED** |
| Advocate at T=0.0 | No explicit temperature passed → falls through to `0.0` default in `createProductionLLMCall` | **CONFIRMED** |
| `maxResearchIterations` (4/5) | **Actually 10** (`maxTotalIterations: 10` in `pipeline.default.json`), with `contradictionReservedIterations: 1` → 9 main + 1 contradiction | **STALE — materially wrong** |
| P1-A: clustering could be downgraded to Haiku | Stage 3 uses Sonnet via `getModelForTask("verdict")`. P1-A is unimplemented. | **CONFIRMED** (opportunity exists) |
| 2 search providers active | Google CSE and Serper enabled. 5 others wired but disabled. | **CONFIRMED** |

**Material mismatch**: The `maxResearchIterations` claim of "4/5" in `CLAUDE.md` / `AGENTS.md` / Backlog (UCM-1 entry) is wrong. The actual budget is 10 iterations (9 main + 1 contradiction). This could mislead cost estimates and research-depth reasoning. **Should be corrected.**

**Undocumented capabilities found**:
- OpenAI TPM guard with automatic `gpt-4.1` → `gpt-4.1-mini` fallback
- Evidence partitioning for debate independence (institutional → advocate, general → challenger)
- Model resolver supports 4 providers (Anthropic, OpenAI, Google/Gemini, Mistral)
- Scope normalization deduplication step before clustering

### 2d. Challenger / Skeptic

**Verdict: The three-way framing is a false trilemma. The right answer is "do the cheapest backlog items that generate maximum learning."**

Strongest attacks on each option:

**Against "Do neither yet":**
- Monitor mode has no scheduled validation cadence — it is indefinite deferral with the appearance of governance.
- B-sequence features (pro/con queries, verifiability, misleadingness, rubric scoring) are shipped but **never validated with real data**. Cost to test: $3-5. Zero code changes. This is the cheapest possible quality learning opportunity.
- W15 domain-aware fetch batching is ~50-100 lines and prevents a known reliability failure mode.
- EVD-1 itself prescribes re-running amber items "if convenient." With no active workstream, it is convenient.

**Against "Open quality track":**
- QLT-4 demonstrated the project builds features before confirming hypotheses. Without a Verdict Accuracy Test Set (ground truth), quality is measured only as variance, never as correctness.
- Remaining variance may be inherent to live-web fact-checking, not addressable.
- Opening quality work over amber results would override EVD-1 on the day it was adopted.

**Against "Open optimization track":**
- Timing numbers are explicitly stale. The optimization plan itself says to start with a fresh baseline.
- At Alpha scale (single-digit users), engineering effort on cost optimization has ~zero dollar impact.
- NPO/OSS credit applications ($11K+/year potential: Anthropic nonprofits 75% off, Google $10K, AWS $1K) would dwarf any code-level savings and require no engineering time.

**Challenger's strongest recommendation**: Do B-sequence validation ($3-5), build Verdict Accuracy Test Set (zero API cost), implement W15 (~50-100 lines), and file credit applications. Then decide on a formal track based on actual data.

---

## 3. What the Code Actually Supports

Verified in source, not docs:

| Capability | Current State | File |
|------------|--------------|------|
| Research iterations | 10 total (9 main + 1 contradiction) | `pipeline.default.json:95` |
| Search providers | 2 active (CSE + Serper), 5 wired but off | `search.default.json` |
| Contrarian retrieval | Active, single-pass, article-level | `claimboundary-pipeline.ts:417` |
| Debate structure | 5-step, cross-provider (OpenAI challenger) | `verdict-stage.ts:300-445` |
| SR evaluation | Running (domain reliability assessment) | `sr.default.json:enabled=true` |
| SR calibration | Off (Stage 4.5 feature-flagged) | `pipeline.default.json:89-91` |
| Clustering model | Sonnet (standard tier) | `boundary-clustering-stage.ts:314` |
| Preliminary search | Fully sequential (6 cycles) | `claim-extraction-stage.ts:718-839` |
| Self-consistency | T=0.4, 2 re-runs, Sonnet | `verdict-stage.ts:572` |
| Advocate | T=0.0, Sonnet | `verdict-generation-stage.ts:456` |
| Explanation rubric | On by default (extra Sonnet call) | `pipeline.default.json` |
| Evidence partitioning | On (institutional→advocate, general→challenger) | `calculation.default.json` |

---

## 4. Best Next Workstream

**Do neither yet** — but execute cheap backlog items within monitor mode.

The review panel converges on this:

1. **No quality track is justified.** QLT-4 proved the project builds interventions before confirming premises. The remaining amber variance is evidence-content-driven — not addressable by any known code-level lever without a design change. EVD-1 says amber = monitor, not act.

2. **No optimization track is justified.** Stale baselines. Negligible dollar impact at Alpha. P1-A is quality-affecting and needs a baseline. The optimization plan itself says not to start without one.

3. **But monitor mode must have teeth.** The project has cheap, high-learning items that should be done now:

| Priority | Item | Effort | Cost | Learning Value |
|----------|------|--------|------|----------------|
| 1 | **W15 domain-aware fetch batching** | ~50-100 lines | $0 | Prevents known retrieval failure mode; directly improves evidence layer |
| 2 | **P1-B preliminary search parallelism** | ~100-150 lines | $0 | 30-60s latency improvement; zero quality risk |
| 3 | **B-sequence feature validation** | 0 lines (config toggle + runs) | $3-5 | First real data on shipped-but-untested quality features |
| 4 | **Fix stale `maxResearchIterations` doc claim** | Doc edit only | $0 | Prevents future planning errors (actual is 10, not 4/5) |

---

## 5. Best First Task

**W15: Domain-aware fetch batching**

- **What:** Add domain-level URL grouping + 500ms stagger for same-domain requests in batch fetch. Prevents 100% fetch failure when search results cluster on one domain.
- **Where:** `claimboundary-pipeline.ts` batch fetch section (~50-100 lines, new UCM param `fetchSameDomainDelayMs`)
- **Why this first:** It is the smallest task that directly improves evidence-retrieval reliability — the area the entire quality roadmap identifies as the highest-confidence future lever. It is a reliability fix, not a quality experiment, so it does not violate EVD-1 or require a policy override. It is already in the backlog as **high urgency, high importance**.
- **Verification:** Run 2-3 analyses and confirm fetch success rate improves on inputs that previously showed domain-clustered source failures.

---

## 6. What Should Be Deferred

| Item | Why Defer |
|------|-----------|
| **Quality track (retrieval-first, variance reduction)** | No red threshold breach. QLT-4 showed hypothesis-first building fails. Need Verdict Accuracy Test Set before any new quality intervention. |
| **P1-A clustering model downgrade** | Quality-affecting. Needs fresh baseline. Single Sonnet call — ~2-5% saving, not worth the risk now. |
| **UCM-3 (pipeline temperatures)** | Infrastructure work. Medium impact. Not blocking anything. |
| **Third search provider (Brave)** | Plausible quality lever, but impact on variance is unproven. Requires API key procurement. Consider as part of a future retrieval-first workstream. |
| **Verdict Accuracy Test Set** | High value but is a curation task, not engineering. Can be done in parallel with W15/P1-B. Not urgent until a quality track is opened. |

---

## 7. Final Judgment

### **Do neither yet.**

No formal quality or optimization track should be opened. The project should remain in approved-policy monitor mode under EVD-1.

**But:** Execute the following within monitor mode, in order:

**Recommended next task: W15 domain-aware fetch batching**
**Why this first:** Smallest high-leverage reliability fix that directly addresses the evidence-retrieval layer. ~50-100 lines, new UCM param, no design change, no policy override. Already in backlog as high urgency / high importance.

**Then:** P1-B preliminary search parallelism (zero quality risk, 30-60s latency gain).

**Then:** B-sequence feature validation ($3-5, no code changes, first real data on shipped quality features).

---

## Appendix: Stale Doc Items to Correct

The code reality audit found these items that should be corrected in docs to prevent future planning errors:

1. **`maxResearchIterations` (4/5) → actually 10**: Appears in Backlog UCM-1 entry. The actual config is `maxTotalIterations: 10` with `contradictionReservedIterations: 1`.
2. **UCM-1 and UCM-2 partially stale**: UCM-1 research depth params are mostly in CB pipeline UCM config already. UCM-2 `sourceExtractionMaxLength` already exists in `pipeline.default.json`.
3. **SR evaluation vs SR calibration**: Docs say "SR feature-flagged/off" without distinguishing that SR *evaluation* is **on** (running domain reliability assessment) while SR *calibration* (Stage 4.5 verdict adjustment) is off. These are distinct systems.
4. **`contradictionReservedIterations` schema description**: Says "default: 2" but actual default is 1 in code and config.

---

*Based on four independent reviewer analyses, 160+ source file reads, and reconciliation by Lead Architect. All claims verified against current codebase at commit HEAD.*
