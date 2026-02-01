---
title: "Hardcoded Heuristics → UCM Migration Plan"
version: "0.2.0"
status: "Approved"
lastModified: "2026-01-31"
owner: "AI Assistant"
reviewers: ["Claude Opus 4.5 (2026-01-31)"]
approvedBy: "Claude Opus 4.5"
approvedDate: "2026-01-31"
---

# Hardcoded Heuristics → UCM Migration Plan

## Goal
Remove hardcoded keyword lists that influence analysis quality, migrate configurable lists into UCM, and eliminate heuristic fallbacks that can distort report quality. The end state should be **generic-by-design** (no domain-specific phrases), **configurable**, and **auditable** through UCM.

## Deliverables
1. **UCM Config Schema Extensions** for heuristic lexicons and thresholds (split into smaller configs).
2. **Config-backed prompt templates** where wording is required (LLM prompts use UCM variables instead of inline lists).
3. **Elimination of heuristic fallbacks** that alter verdict/report quality when LLM is enabled.
4. **Migration utilities** to seed defaults and preserve behavior during rollout.
5. **Validation & regression plan** (promptfoo + golden runs).

## Success Criteria
- **No domain-specific tokens** (e.g., brand names, legal/jurisdiction names) embedded in analysis code or prompts.
- **All heuristic lists are UCM-managed** (DB-backed, versioned, reviewable).
- **LLM-enabled runs do not fall back** to heuristic logic that alters verdicts or report quality.
- **Documented compatibility layer** for safe migration and rollback.

## Constraints
- Must remain **generic by design** (no test-case hardcoding).
- Avoid breaking existing interfaces; use config defaults with sensible safe values.
- Maintain auditability and reproducibility via UCM snapshots.

---

## Inventory of Hardcoded Keyword Lists (Current)
These are the primary sources of embedded keyword lists that influence analysis quality:

1. **Scope/Context Heuristics** (`apps/web/src/lib/analyzer/scopes.ts`) — *migrated separately via LLM-Based Scope Detection plan*
2. **Verdict Inversion & Counter-Claim Heuristics** (`verdict-corrections.ts`)
3. **Evidence Filtering** (`evidence-filter.ts`)
4. **Quality Gates** (`quality-gates.ts`)
5. **Pseudoscience Detection** (`pseudoscience.ts`)
6. **Aggregation Heuristics** (`aggregation.ts`)
7. **Recency/Procedural Topic Detection** (`orchestrated.ts`)
8. **Text-Analysis Heuristic Fallbacks** (`text-analysis-heuristic.ts`)

---

## Proposal: UCM Config Design

### A. Split UCM Config Types (Recommended)
To reduce schema size and improve auditability, split lexicons into three configs:

| Config Type | Concerns |
| --- | --- |
| `analysis-lexicon.v1` | scopeDetection, inputNormalization |
| `evidence-lexicon.v1` | evidenceFilter, qualityGates |
| `aggregation-lexicon.v1` | aggregation, contestation |

> **Note:** Scope detection lexicon is migrated via the separate LLM-Based Scope Detection plan; this plan will only reference shared utilities if needed.

**Schema (example):**
```json
{
  "version": "analysis-lexicon.v1",
  "scopeDetection": {
    "comparisonCues": ["more", "less", "better", "worse", "higher", "lower", "greater", "smaller", "vs", "versus"],
    "efficiencyTerms": ["efficien*", "performance", "impact", "effect", "output", "consumption", "energy", "resource", "cost", "speed"],
    "legalProcessTerms": ["trial", "judgment", "court", "procedure", "process"],
    "fairnessTerms": ["fair", "just", "appropriate", "proper", "legitimate", "valid"],
    "environmentTerms": ["environment", "health", "safety", "pollution", "emission", "toxicity"],
    "internationalCues": ["international", "foreign", "external", "global", "overseas", "outside"]
  },
  "inputNormalization": {
    "predicateStarters": ["fair", "true", "false", "accurate", "correct", "legitimate", "legal", "valid", "based", "justified", "reasonable", "biased", "efficient", "effective", "successful", "proper", "appropriate", "proportionate"],
    "fillerWords": ["really", "actually", "truly", "basically", "essentially", "simply", "just", "very", "quite", "rather"]
  },
  "evidenceFilter": {
    "vaguePhrases": ["some say", "many believe", "it is said", "reportedly", "allegedly"],
    "citationPatterns": ["§", "article", "section", "case v."],
    "temporalAnchors": ["year", "month", "date", "last year", "this year"]
  },
  "qualityGates": {
    "opinionMarkers": ["i think", "i believe", "perhaps", "maybe", "should", "best", "worst"],
    "futureMarkers": ["will", "going to", "in the future", "expected to"],
    "uncertaintyMarkers": ["unclear", "insufficient evidence", "cannot confirm"]
  },
  "aggregation": {
    "harmIndicators": ["death", "injury", "risk", "fraud"],
    "contestationSignals": ["disputed", "contested", "challenged", "criticized"]
  }
}
```

**Pattern Syntax (mandatory):**
- All matching lists must specify whether entries are **literal strings** or **regex patterns**.
- If regex is supported, prefix with `re:` (e.g., `re:efficien\w*`).
- If literal-only, wildcards like `*` are NOT allowed.

> **Important:** All defaults must be **generic**, not domain-specific (no brands, jurisdictions, or named entities).

### B. UCM Config Type: `prompt-lexicon.v1`
For prompts that must include terminology (e.g., LLM text-analysis prompts), move lists into UCM and render into prompt templates via variables (instead of inline lists).

**Important:** Audit existing prompt configs first. The text-analysis prompts already use configurable prompt files; extend them rather than duplicating.

---

## Migration Strategy

### Phase 1 — Inventory & Mapping
1. Map each hardcoded list to a UCM config field.
2. Identify which lists are **domain-specific** and must be removed or replaced with generic cues.
3. Add a “deprecation” comment in code for each hardcoded list.

### Phase 2 — UCM Schema & Defaults
1. Implement `analysis-lexicon.v1` schema in `config-schemas.ts`.
2. Add defaults in `DEFAULT_*_CONFIG` with **generic** terms only.
3. Extend config loader to fetch the lexicon profile with caching.

### Phase 3 — Code Refactor
1. Replace hardcoded lists in:
   - `evidence-filter.ts`
   - `quality-gates.ts`
   - `aggregation.ts`
   - `verdict-corrections.ts`
   - `orchestrated.ts`
2. Inject UCM lexicon via `PipelineConfig` or dedicated `analysisLexicon` config lookup.
3. Ensure deterministic hashing/canonicalization uses config values, not embedded lists.

> **Dependency:** Scope detection migration is handled by **LLM-Based_Scope_Detection_with_UCM_Configuration.md** and is not part of this plan.

### Phase 4 — Refine Heuristic Fallbacks (LLM Enabled)
1. Add **fallback tiers** in `text-analysis-hybrid.ts`:
   - **Quality-impacting** (verdict validation, evidence filtering): **strict** by default (fail fast, no heuristic fallback unless explicitly enabled).
   - **Non-quality-impacting** (input classification, recency hints): **graceful degradation** allowed if enabled.
2. Add config flags:
   - `allowQualityFallbacks` (default: `false`)
   - `allowNonQualityFallbacks` (default: `true`)
3. Add a circuit breaker: after N consecutive LLM failures, surface error to user instead of silently degrading.

### Phase 5 — Prompts via UCM Variables
1. Audit existing prompt configs to avoid duplication (text-analysis prompts already exist).
2. Replace inline keyword lists in prompt files with template variables where still hardcoded.
3. Populate those variables from `prompt-lexicon.v1` or the split lexicon configs.
4. Reseed prompt configs.

### Phase 6 — Validation & Regression
1. Run promptfoo with updated prompts.
2. Run regression suite comparing outputs vs current baseline.
3. Verify: no domain-specific tokens appear in prompts/config defaults.

---

## Risk Mitigations
- **Feature flag:** `allowHeuristicFallbacks` to preserve current behavior during rollout.
- **Config snapshotting:** ensure UCM snapshots record lexicon configs.
- **Gradual migration:** allow hybrid use (config-based lists + old lists behind debug toggle) until verified.

---

## Open Questions (Resolved)
- **Pseudoscience detection:** Convert to a generic “unsupported mechanism” lexicon. Remove named categories/brands; keep configurable mechanism cues only.
- **Existing lexicon configs:** No dedicated UCM profile exists today; create new split lexicon configs and reference them from pipeline config.

---

## Next Steps
1. Approve this plan.
2. Define UCM schema and defaults for `analysis-lexicon.v1`.
3. Begin incremental refactor in the order: evidence-filter → quality-gates → aggregation → verdict-corrections → text-analysis-heuristic.

---

## Review Comments

**Reviewer:** Claude Opus 4.5
**Date:** 2026-01-31
**Status:** ✅ **APPROVED** (v0.2.0)

### Overall Assessment: ✅ APPROVED

All approval conditions from the initial review have been addressed in v0.2.0. The plan is now ready for implementation.

---

### Critical Issues

#### 1. ⚠️ Overlap with LLM-Based Scope Detection Plan
This plan covers scope detection heuristics (Phase 3, item 1: `scopes.ts`), but this is **already being implemented** via the approved [LLM-Based_Scope_Detection_with_UCM_Configuration.md](LLM-Based_Scope_Detection_with_UCM_Configuration.md) plan.

**Resolution:**
- Remove scope detection from this plan's Phase 3
- Reference the LLM-Based plan as a **dependency**
- Add note: "Scope detection migrated separately via LLM-Based Scope Detection plan"

#### 2. ⚠️ Phase 4 Risk: Hard Failure on LLM Error
Removing heuristic fallbacks entirely when LLM is enabled creates a **single point of failure**. If the LLM API fails, the entire analysis fails.

**Resolution:**
- Distinguish between **quality-impacting** vs **non-quality-impacting** fallbacks
- Quality-impacting (verdict, claim decomposition): Require explicit `allowQualityFallback: false`
- Non-quality-impacting (input classification, recency detection): Allow graceful degradation
- Add circuit breaker pattern: If LLM fails N times, surface error to user rather than silently degrading

---

### Recommendations

#### 3. Schema Complexity
The proposed `analysis-lexicon.v1` schema bundles 6 different concerns. Consider splitting:

| Proposed Config Type | Concerns Covered |
|---------------------|------------------|
| `analysis-lexicon.v1` | scopeDetection, inputNormalization |
| `evidence-lexicon.v1` | evidenceFilter, qualityGates |
| `aggregation-lexicon.v1` | aggregation, contestation |

**Benefit:** Smaller configs are easier to audit, version, and override per-use-case.

#### 4. Reference Existing Prompt Configs
The plan mentions moving prompt keywords to UCM, but the text-analysis prompts **already use configurable lexicons** via:
- `apps/web/prompts/text-analysis/text-analysis-scope.prompt.md`
- `apps/web/prompts/text-analysis/README.md`

**Resolution:** Add to Phase 5: "Audit existing prompt configs before creating new ones. Extend rather than duplicate."

#### 5. Wildcard Patterns in Lexicon
The schema example includes wildcards (e.g., `"efficien*"`). Clarify:
- Are these regex patterns or glob patterns?
- What matching engine will be used?
- Document the pattern syntax in the schema

---

### Open Question Responses

> Should **all** pseudoscience detection be removed, or converted to a generic "unsupported mechanism" lexicon?

**Recommendation:** Convert to generic "unsupported mechanism" lexicon.
- Keep the detection capability but make patterns configurable
- Default patterns: mechanism claims without evidence, correlation-as-causation markers
- Remove any named pseudoscience categories (specific therapies, branded products)

> Is there a dedicated UCM profile for lexicons already in use that we should reuse?

**Answer:** Not currently. The closest is `prompt-config.v1` which stores prompt templates. The proposed `analysis-lexicon.v1` would be new. Consider whether it should be a child of `pipeline-config.v1` (embedded) or standalone (referenced).

---

### Suggested Refactoring Order (Updated)

Given the LLM-Based Scope Detection plan is already in progress:

1. ~~scope detection~~ → **Already migrating (separate plan)**
2. `evidence-filter.ts` → Highest impact, most hardcoded lists
3. `quality-gates.ts` → Moderate impact
4. `aggregation.ts` → Lower impact
5. `verdict-corrections.ts` → Sensitive, do last with extra testing
6. `text-analysis-heuristic.ts` → Fallback only, lower priority

---

### Dependencies

- [x] LLM-Based Scope Detection plan (in progress)
- [ ] UCM schema extension for lexicon configs
- [ ] Config loader update for lexicon fetching

---

### Approval Conditions (All Resolved ✅)

| # | Condition | Status | Resolution |
|---|-----------|--------|------------|
| 1 | Remove scope detection from Phase 3 | ✅ Resolved | Line 38, 131: Marked as separate plan dependency |
| 2 | Refine Phase 4 fallback tiers | ✅ Resolved | Lines 133-140: Quality vs non-quality tiers added |
| 3 | Add pattern syntax documentation | ✅ Resolved | Lines 95-98: `re:` prefix syntax documented |
| 4 | Acknowledge existing prompt configs | ✅ Resolved | Lines 105, 142-143: Audit step added |

**Final Status:** All conditions addressed. Plan approved for implementation.

*** End of Document ***
