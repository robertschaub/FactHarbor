# Source Provenance Tracking — Design Document

**Date:** 2026-04-04
**Status:** Proposal v2 (post-GPT review, revised)
**Author:** Robert Schaub + Claude (Opus 4.6)
**Review:** GPT review incorporated (2026-04-04)

---

## 1. Problem Statement

The FactHarbor pipeline tracks **which domain** published evidence (domain-level reliability scoring, 0-1 scale) but **not who originally created** a claim. This creates a blind spot:

- **10 outlets repeating a single government press release** appears as "10 independent sources agree"
- **Coordinated messaging** (e.g., party talking points distributed to aligned outlets) is indistinguishable from **genuine multi-source consensus**
- **Attribution washing** (lobby group claim laundered through "news" outlets) goes undetected

Without provenance, the pipeline cannot distinguish independent corroboration from single-source amplification — a critical gap for misinformation and propaganda detection.

### Real-World Patterns This Would Catch

| Pattern | Description | Current Detection |
|---------|-------------|-------------------|
| **Single-source amplification** | One press release → 10 outlets repeat it | Not detected (looks like 10 independent sources) |
| **Attribution washing** | Advocacy org → "news" site → appears neutral | Partially (sourceType helps, but not origin) |
| **Echo chamber corroboration** | Ideologically aligned outlets repeat each other | Not detected |
| **State propaganda laundering** | Government claim → state media → wire service → appears legitimate | SR system catches known state media domains, but not the chain |
| **Astroturfing** | Corporate/political interest → seemingly independent grassroots sources | Not detected |
| **Wire-service syndication** | AP/Reuters dispatch → 20 papers publish verbatim | Not detected (each paper looks independent) |
| **Translated laundering** | Claim in language A → translated and published in language B outlets | Not detected |

---

## 2. Current State (What Exists)

### 2.1 Source Tracking Capabilities

| Capability | File | Status |
|---|---|---|
| Domain-level reliability scores (0-1) | `source-reliability.ts` | Production |
| SourceType classification (9 types) | `types.ts:270-279` | Production |
| sourceAuthority: primary/secondary/opinion | `types.ts:458` | Production |
| isDerivative + derivedFromSourceUrl | `types.ts:477-481` | Production (minimal — study citations only) |
| identifiedEntity on SR cache | `source-reliability-cache.ts:50` | Production (metadata only, **never populated at runtime** — `null` in calibration, see `source-reliability-calibration.ts:143`) |
| extractionConfidence (0-100) | `types.ts:466` | Production |
| **Original author/creator extraction** | — | **Missing** |
| **Attribution chain tracking** | — | **Missing** |
| **Creator-level reliability** | — | **Missing** |

### 2.2 Existing Independence Mechanisms (MUST integrate with, not duplicate)

These mechanisms already exist in the pipeline and handle source concentration:

| Mechanism | File | What It Does |
|---|---|---|
| **`buildSourcePortfolioByClaim`** | `verdict-stage.ts:214` | Builds per-claim source concentration data. Already passed to challenger and reconciler. |
| **`sourcePortfolioByClaim`** param | `verdict-stage.ts:887, 923` | Challenger and reconciler already receive source portfolio context. |
| **`independence_concern`** challenge type | `types.ts:998` | Challenger can already raise independence concerns as a `ChallengePoint.type`. |
| **`computeDerivativeFactor`** | `aggregation-stage.ts:341` | Penalties for derivative evidence. Intentionally narrow — only explicit study citations. **Do not extend.** |

**Key insight from GPT review:** Provenance data should flow through these existing mechanisms, not create a parallel system.

---

## 3. Design Principles

1. **LLM-powered, not heuristic** — Attribution extraction is a semantic task. No regex, no byline-parsing, no keyword lists. **This extends to entity resolution and convergence grouping — per AGENTS.md LLM Intelligence mandate, grouping "WHO" = "World Health Organization" is a semantic decision that must go through LLM, not deterministic string normalization.**
2. **No hardcoded org lists** — No "known propaganda outlets" database. The LLM identifies originators; the pipeline weighs the evidence.
3. **Language-agnostic** — "laut dem Ministerium", "selon le ministere", "according to the ministry" get identical treatment.
4. **Evidence-weighted, not censorious** — A government source isn't *wrong*; knowing it's the originator (not an independent verifier) changes its evidential weight.
5. **Observe before weighting** — Collect provenance data and measure quality before any verdict integration. Missing provenance = `unknown`, never treated as evidence of independence.
6. **Integrate, don't duplicate** — Feed provenance through existing `sourcePortfolioByClaim`, `independence_concern`, and challenger/reconciler mechanisms. Do not create parallel independence-checking systems.
7. **Abstain over hallucinate** — LLM must output `null`/`unknown` when provenance cannot be determined. Low-confidence extraction is worse than no extraction.
8. **Cost-gated** — Every phase behind UCM toggle. Zero cost when disabled.

---

## 4. Phased Approach

### Phase 1 — Provenance Extraction + Telemetry

**Goal:** Extract who originally created/stated each piece of evidence. Collect quality metrics. **No verdict integration.** Observational only.

#### New Fields on `EvidenceItem`

All optional. Extracted in the same Haiku 4.5 LLM call that already processes each source's full text. **High-confidence-or-abstain behavior:** prompt instructs LLM to output `null` when uncertain rather than guessing.

```typescript
// New optional fields on EvidenceItem (types.ts)

// Structured creator identity (NOT a single free-text string)
originalCreator?: {
  displayName: string;              // Most commonly used name ("WHO", "Reuters", "Dr. Jane Smith")
  affiliatedOrganization?: string;  // Parent org if creator is a person ("University of Zurich")
  role?: string;                    // "spokesperson", "researcher", "editor", etc.
} | null;                           // null = LLM abstained (could not determine)

originalCreatorType?:
  | "news_organization"             // Editorial newsroom (Reuters, BBC, NZZ)
  | "wire_service"                  // Wire/syndication service (AP, AFP, dpa)
  | "government_body"               // Government agency, ministry, official body
  | "intergovernmental_org"         // UN, WHO, EU, WTO, etc.
  | "research_institution"          // University, research lab, academic publisher
  | "advocacy_group"                // NGO, think tank, lobby, activist org
  | "corporation"                   // Company, industry association
  | "political_party"              // Political party or campaign
  | "individual"                    // Named person without institutional affiliation
  | "unknown";                      // Cannot determine

attributionType?:
  | "firsthand"                     // Source witnessed/researched/investigated directly
  | "quoted"                        // Source quotes another entity's statement
  | "press_release"                 // Source reproduces/paraphrases an official release (analytically distinct from quoted — signals coordinated messaging)
  | "aggregated"                    // Source compiles from multiple other sources
  | "anonymous";                    // Attributed to unnamed/confidential sources

// Cited source URL (if the article explicitly references another publication)
citedSourceUrl?: string;            // URL of the cited original, if present in text

// Confidence: reuse existing extractionConfidence semantics (0-100 scale)
// NOT a separate provenanceConfidence — avoids creating two unrelated confidence notions
// extractionConfidence already exists on EvidenceItem (types.ts:466)
// When provenance is extracted, the extraction call's overall confidence covers provenance too
```

#### Design Decisions from GPT Review

| Decision | Rationale |
|---|---|
| **Structured `originalCreator`** (not single string) | Single string makes entity resolution harder downstream. Structured shape (name + org + role) is parseable and richer. |
| **`press_release` as own attributionType** | Analytically distinct from `quoted` — signals coordinated messaging intent. GPT: "it signals coordinated messaging." |
| **`wire_service` and `intergovernmental_org`** added to creatorType | Wire services are structurally different from newsrooms (syndication hub). Intergovernmental orgs (UN, WHO) don't fit neatly into other categories. |
| **No separate `provenanceConfidence`** | Aligns with existing `extractionConfidence` (0-100 scale, `types.ts:466`). Avoids two unrelated confidence notions. |
| **`citedSourceUrl`** added | Captures explicit citation links for future hop-tracking. Cheap to extract (LLM already reads the text). |
| **`declaredInterest` removed** | Ungroundable for obscure orgs. SR system + sourceType already capture bias signals. (Consensus from internal debate + GPT review.) |
| **Null = abstain** | `originalCreator: null` means "could not determine" — treated as `unknown`, never as evidence of independence. |

#### Schema Extension (zod)

```typescript
// Extension to Stage2EvidenceItemSchema (research-extraction-stage.ts)
originalCreator: z.object({
  displayName: z.string(),
  affiliatedOrganization: z.string().optional(),
  role: z.string().optional(),
}).nullable().optional(),
originalCreatorType: z.enum([
  "news_organization", "wire_service", "government_body", "intergovernmental_org",
  "research_institution", "advocacy_group", "corporation", "political_party",
  "individual", "unknown"
]).optional(),
attributionType: z.enum([
  "firsthand", "quoted", "press_release", "aggregated", "anonymous"
]).optional(),
citedSourceUrl: z.string().optional(),
```

#### UCM Configuration

```typescript
// New field in PipelineConfigSchema (config-schemas.ts)
provenanceTrackingEnabled: z.boolean().optional()  // default: false
```

```json
// pipeline.default.json
"provenanceTrackingEnabled": false
```

When disabled: provenance fields not requested from LLM, not present in output. Zero token cost.

#### Files Changed

| File | Change |
|------|--------|
| `types.ts` | Add optional provenance fields to `EvidenceItem` interface; add `OriginalCreator` interface |
| `research-extraction-stage.ts` | Extend `Stage2EvidenceItemSchema`, update mapping in `extractResearchEvidence`, gate on config |
| `claimboundary.prompt.md` | Extend EXTRACT_EVIDENCE prompt section with provenance instructions + abstain-on-uncertainty directive |
| `config-schemas.ts` | Add `provenanceTrackingEnabled` to `PipelineConfigSchema` |
| `pipeline.default.json` | Add `provenanceTrackingEnabled: false` |
| `pipeline-utils.ts` | Add `mapOriginalCreatorType()` normalizer (like existing `mapSourceType()`) |
| `evidence-normalization.ts` | Fallback handling for missing/malformed provenance fields |
| `config-drift.test.ts` | Auto-detected (will fail until JSON synced) |
| `schema-backward-compatibility.test.ts` | Add backward-compat tests for new optional fields |
| Test fixtures | Any mock `EvidenceItem` constructors — optional fields, no breakage expected |

**NOT changed in Phase 1:** `verdict-stage.ts`, `aggregation-stage.ts`, `source-reliability-calibration.ts`. Provenance is extracted and stored but not consumed by any verdict logic.

#### Telemetry (Phase 1 output)

Per-run telemetry logged (not user-facing):
- Count of evidence items with provenance extracted vs. abstained (`null`)
- Distribution of `attributionType` values
- Distribution of `originalCreatorType` values
- Count of `citedSourceUrl` populated
- Any extraction quality regressions (compare `extractionConfidence` distributions with vs. without provenance enabled)

#### Cost Impact

- Input tokens: +150-300 per extraction call (prompt instructions)
- Output tokens: +40-60% per evidence item (structured creator + 3 enum fields + optional URL)
- **Per-run total: ~$0.01-0.03** (Haiku pricing)
- Zero when `provenanceTrackingEnabled: false`

#### Evaluation Set (design before rollout)

**GPT review correction:** "20+ runs" is not a sufficient observation window. Design a multilingual evaluation set before rollout:

| Scenario | Language | Pattern | Expected Provenance |
|---|---|---|---|
| Wire-service syndication | EN | AP dispatch → 5 papers | `wire_service`, `quoted` or `aggregated` |
| Government press release | DE | Ministry statement → 3 outlets | `government_body`, `press_release` |
| Original investigation | FR | Journalist's own research | newsroom, `firsthand` |
| Anonymous sourcing | EN | "Officials say..." | `unknown`, `anonymous` |
| Academic study cited | EN | University paper → news | `research_institution`, `quoted` |
| Multi-hop laundering | EN | Think tank → news → aggregator | Each hop should identify different originator |
| Translated claim | DE→EN | German ministry → English press | `government_body`, `quoted` |
| Circular citation | EN | A cites B, B cites A | Should not produce false independence |
| Press release verbatim | EN | Corporate PR → "news" site | `corporation`, `press_release` |

Target: 15-20 curated test cases with human-labeled ground truth. Run with provenance enabled, score against labels.

#### Success Criteria (GATE before Phase 1.5)

- Evaluation set completed and scored
- `originalCreator` accuracy: >70% correct on evaluation set
- `attributionType` accuracy: >60% correct on firsthand/quoted/press_release distinction
- Abstention rate: 10-30% (too low = hallucinating; too high = useless)
- No regression in existing extraction quality (claimDirection, probativeValue, evidenceScope)
- If Haiku accuracy insufficient: evaluate (a) separate focused micro-call at standard tier, or (b) simplified schema

---

### Phase 1.5 — Challenger/Reconciler Prompt Integration

**Goal:** Surface high-confidence provenance data to the debate LLMs through existing mechanisms. **No aggregation changes. No new independence scoring.**

**Prerequisite:** Phase 1 GATE passed.

#### Integration Strategy

Use the existing `sourcePortfolioByClaim` mechanism that already flows to challenger and reconciler:

1. **Enrich `SourcePortfolioEntry`** with provenance fields from the evidence it contains:
   - `dominantOriginalCreator`: most frequent `originalCreator` among evidence items from this source
   - `attributionTypes`: set of attribution types found
   - `hasFirsthandEvidence`: boolean (at least one `firsthand` item)

2. **Challenger uses `independence_concern`**: The challenger already has `independence_concern` as a `ChallengePoint.type` (`types.ts:998`). With enriched portfolio data, the challenger LLM can now raise independence concerns backed by specific provenance data ("5 of 7 supporting evidence items attribute the claim to the same government ministry press release").

3. **Reconciler weighs provenance context**: The reconciler already receives `sourcePortfolioByClaim` (`verdict-stage.ts:923`). With provenance enrichment, it can naturally factor in whether challenges about independence are grounded.

**Key constraint:** Provenance context is **input to LLM reasoning only**. No mechanical penalties, no score adjustments, no deterministic convergence flags. The debate LLMs decide how to weight it.

#### Files Changed

| File | Change |
|------|--------|
| `verdict-stage.ts` | Enrich `SourcePortfolioEntry` construction with provenance fields from evidence |
| `types.ts` | Add optional provenance fields to `SourcePortfolioEntry` |
| `claimboundary.prompt.md` | Update VERDICT_CHALLENGER and VERDICT_RECONCILIATION prompts to reference provenance data in portfolio |
| Tests | Update verdict-stage tests with provenance-enriched portfolios |

#### Cost Impact

~200 extra tokens in existing challenger/reconciler calls (provenance data in portfolio). No new LLM calls. **Total: ~$0.003/run.**

#### Success Criteria (GATE before Phase 2)

- Challenger raises `independence_concern` challenges that reference provenance data in at least some runs
- Reconciler verdicts show provenance-informed reasoning in explanations
- No false-positive inflation (verdicts don't systematically distrust wide reporting of major events)
- Observe across multilingual evaluation set

---

### Phase 2 — LLM Entity Resolution & Convergence

**Goal:** Canonicalize creator identities across language variants and assess genuine editorial independence. **LLM-powered, not deterministic.**

**Prerequisite:** Phase 1.5 GATE passed. Sufficient production data to know entity variation is a real problem.

**Rationale for skipping deterministic convergence:** The original Phase 2a proposed deterministic string normalization for creator grouping. This was rejected:
- Violates AGENTS.md LLM Intelligence mandate (grouping "WHO" = "World Health Organization" = "OMS" is a semantic decision)
- Fails systematically for multilingual inputs
- GPT review: "Deterministic string grouping is not realistic even for English"

#### Approach

One Haiku call per ClaimAssessmentBoundary:
- **Input:** List of unique `originalCreator` objects from evidence items in the boundary
- **Output:** Canonical name mapping + independence assessment
- **Produces:** `provenanceProfile` on `ClaimAssessmentBoundary`

```typescript
export interface ProvenanceProfile {
  // LLM-resolved canonical creators (e.g., "WHO" + "World Health Organization" → one group)
  canonicalCreators: Array<{
    canonicalName: string;
    aliases: string[];              // All originalCreator.displayName values that resolved here
    creatorType: string;
    evidenceCount: number;
    directions: string[];           // supports/contradicts/contextual
  }>;
  independenceScore: number;        // 0-1, LLM-assessed genuine independence
  dominantCreator?: string;         // Canonical name if one creator dominates
  dominantCreatorShare?: number;    // 0-1
  // Graduated signal with minimum-count guards (GPT: "3 of 5 is very different from 30 of 50")
  concentrationSignal: "none" | "mild" | "moderate" | "strong";
  concentrationReasoning: string;   // LLM explanation of why this concentration level was assigned
}
```

**Graduated signal (not binary flag):** GPT review correctly identified that a 60% hard threshold is too brittle. Instead, use `concentrationSignal` as a graduated LLM assessment with minimum-count guards. The LLM sees both the count and the context.

#### Files Changed

| File | Change |
|------|--------|
| `provenance-analysis.ts` (new) | LLM entity canonicalization + independence assessment |
| `types.ts` | Add `ProvenanceProfile` interface on `ClaimAssessmentBoundary` |
| `claimboundary-pipeline.ts` | Call provenance analysis after extraction, before verdict |
| `claimboundary.prompt.md` | Add PROVENANCE_ANALYSIS prompt |
| `config-schemas.ts` | Add provenance analysis config (model tier, timeout) |
| `verdict-stage.ts` | Pass `provenanceProfile` to challenger/reconciler |
| Tests (new) | Entity resolution, convergence assessment |

#### Cost Impact

~$0.01-0.04/run (2-4 Haiku calls, one per boundary). Gated behind UCM toggle.

---

### Phase 3 — Creator-Level Reliability (deferred)

**Status:** Not committed to any timeline.

**What it would do:** Extend the SR cache from domain-level to also score organizations/entities. Persist creator reliability scores. Use for confidence calibration in Stage 4.5.

**Why deferred:**
1. **Entity resolution is an unsolved hard problem** — requires either curated alias table (brittle) or persistent LLM normalization (costly)
2. **SR system is already at complexity ceiling** — org-level scoring is a major refactor
3. **Stage 4.5 calibration is not entity-ready** — `identifiedEntity` is `null` at runtime (`source-reliability-calibration.ts:143`). Infra must be built before this can work.
4. **No empirical evidence yet** that persistent creator scoring would change verdicts beyond what Phase 1.5 + Phase 2 already provide

**Revisit after:** Phases 1-2 have run in production for 6+ weeks and empirical data shows clear cases where creator-level scoring would have changed a verdict.

---

## 5. Debate Summary

### Internal Debate (4 AI perspectives)

Four perspectives were argued: Architecture, Analysis Quality, Cost/Efficiency, Practical Implementation.

| Topic | Resolution |
|---|---|
| **Model tier for extraction** | Same Haiku call with optional fields. Observe quality; upgrade to separate standard-tier call only if <70% accuracy. |
| **Attribution type granularity** | 5-value enum (firsthand/quoted/press_release/aggregated/anonymous). `press_release` restored per GPT review. |
| **`declaredInterest` field** | Removed. Ungroundable for obscure orgs. SR + sourceType covers bias. |
| **Layer 2 approach** | LLM entity resolution (no deterministic phase). Internal debate favored deterministic; GPT review + LLM Intelligence mandate overruled. |
| **Layer 3 timing** | Unanimous defer. |

### GPT Review Corrections (incorporated in v2)

| GPT Feedback | Action Taken |
|---|---|
| Phase 2a deterministic convergence violates LLM Intelligence mandate | **Removed.** Replaced with LLM entity resolution (Phase 2). |
| `originalCreator` should be structured, not single string | **Changed** to `{ displayName, affiliatedOrganization?, role? }`. |
| `press_release` should be its own attributionType | **Restored** as 5th value. |
| Missing creatorType values (wire_service, intergovernmental) | **Added** `wire_service` and `intergovernmental_org`. |
| `provenanceConfidence` conflicts with `extractionConfidence` | **Removed.** Reuse existing `extractionConfidence` (0-100). |
| Add `citedSourceUrl` for hop tracking | **Added** as optional field. |
| Add Phase 1.5 (prompt context before convergence) | **Added** between Phase 1 and Phase 2. |
| Use existing `independence_concern` + `sourcePortfolioByClaim` | **Phase 1.5** integrates through these existing mechanisms. |
| Don't feed provenance into `derivativeFactor` | **Confirmed.** `derivativeFactor` stays narrow. |
| Don't feed provenance into Stage 4.5 calibration yet | **Confirmed.** Calibration path not entity-ready. |
| Design evaluation set before rollout | **Added** multilingual evaluation set requirement to Phase 1. |
| Observation window "20+ runs" is too small | **Changed** to curated multilingual evaluation set with human-labeled ground truth. |
| Treat missing provenance as `unknown`, not as independence | **Added** as design principle #7. |
| Risk of parallel systems (isDerivative, independence_concern, portfolios) | **Section 2.2** explicitly lists existing mechanisms; Phase 1.5 integrates with them. |
| Graduated signal, not binary 60% flag | **Phase 2** uses `concentrationSignal` (none/mild/moderate/strong) with LLM assessment. |

---

## 6. Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Haiku provenance accuracy too low (<50%) | Medium | Phase 1 blocked | Evaluate standard-tier separate call; or simplify schema |
| Extraction quality degradation (existing fields) | Low-Medium | Regression | A/B compare with provenance on/off; rollback via UCM toggle |
| Structured `originalCreator` too complex for Haiku | Medium | Falls back to `null` often | High abstention rate → evaluate simpler shape or stronger model |
| Legitimate wide reporting flagged as amplification | Medium | False positive in verdict | Phase 1.5: context only, no penalties. Phase 2: LLM reasoning, not thresholds. |
| Adversarial actors strip attribution | Medium | Provenance extraction fails | `attributionType: "anonymous"` captured; missing provenance = `unknown` (not independence) |
| Parallel system fragmentation | Medium | Confusing codebase | Phase 1.5 mandates integration with existing mechanisms; no new independence-checking systems |
| Scope creep into entity resolution infra | Medium | Delays, complexity | Phase 3 deferred with hard gate on empirical evidence |
| Multi-hop laundering undetected | High | Claim passes through 3+ intermediaries, origin lost | `citedSourceUrl` captures one hop; deeper chains need future network analysis (Phase 3+) |

---

## 7. Patterns This Design Will NOT Catch (Known Limitations)

From GPT review — honest about the boundary:

| Pattern | Why Missed | Future Mitigation |
|---|---|---|
| **Translated laundering** (3+ hops) | Only captures immediate creator, not full chain | Citation graph analysis (future) |
| **Sock puppet networks** | Many domains controlled by one entity; no domain-ownership data | Network/ownership metadata (future) |
| **Circular citation chains** | A cites B, B cites A — appears as 2 independent sources | Citation graph cycle detection (future) |
| **Shared domain ownership** | 10 "independent" news sites owned by same company | Domain registration/ownership data (future) |
| **Coordinated same-day amplification** | Temporal patterns not tracked | Temporal spread analysis (future) |
| **Synthetic "original research"** | Fabricated studies that look firsthand | Quality assessment via SR + probativeValue (existing, partial) |

---

## 8. GPT Review Prompt

See `2026-04-04_Source_Provenance_GPT_Review_Prompt.md` for the standalone prompt sent to GPT for independent review. That file is retained as historical review input, not as the active implementation plan.

---

## 9. Implementation Sequence

```
Phase 1 — Provenance Extraction + Telemetry
  1.1  Design multilingual evaluation set (15-20 cases with ground truth)
  1.2  Extend types.ts: OriginalCreator interface, provenance fields on EvidenceItem
  1.3  Extend Stage2EvidenceItemSchema (zod) in research-extraction-stage.ts
  1.4  Update EXTRACT_EVIDENCE prompt with provenance + abstain-on-uncertainty
  1.5  Add provenanceTrackingEnabled to config-schemas.ts + pipeline.default.json
  1.6  Gate extraction on config toggle in research-extraction-stage.ts
  1.7  Add mapOriginalCreatorType() to pipeline-utils.ts
  1.8  Update evidence-normalization.ts with fallback handling
  1.9  Tests: schema, mapping, backward-compat, config-drift
  1.10 Run evaluation set, score against ground truth
       GATE: >70% originalCreator accuracy, >60% attributionType accuracy,
             abstention rate 10-30%, no regression in existing fields

Phase 1.5 — Challenger/Reconciler Prompt Integration
  1.5.1  Enrich SourcePortfolioEntry with provenance data from evidence
  1.5.2  Update VERDICT_CHALLENGER prompt to reference provenance in portfolio
  1.5.3  Update VERDICT_RECONCILIATION prompt similarly
  1.5.4  Tests: enriched portfolios, prompt integration
  1.5.5  Observe: challenger raises independence_concern with provenance grounding?
         GATE: No false-positive inflation; provenance-informed reasoning visible

Phase 2 — LLM Entity Resolution & Convergence
  PREREQUISITE: Phase 1.5 GATE passed + evidence that entity variation is a problem
  2.1  New file: provenance-analysis.ts (LLM entity canonicalization)
  2.2  Add PROVENANCE_ANALYSIS prompt to claimboundary.prompt.md
  2.3  Add ProvenanceProfile to ClaimAssessmentBoundary in types.ts
  2.4  Wire into pipeline after extraction, before verdict
  2.5  Pass provenanceProfile to challenger/reconciler
  2.6  Tests + calibration against evaluation set
       GATE: Independence assessment accuracy, no false-positive inflation

Phase 3 — Creator-Level Reliability (deferred, no timeline)
  PREREQUISITE: 6+ weeks production data from Phases 1-2 showing clear need
  3.1  Entity resolution persistence layer
  3.2  SR cache extension for org-level scoring
  3.3  Stage 4.5 calibration integration
```
