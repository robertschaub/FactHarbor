# GPT Review Prompt — Source Provenance Tracking

> Status: Historical review input. This file intentionally preserves the pre-revision proposal that was sent out for critique on 2026-04-04. It is not the active design. The current post-review plan is [`2026-04-04_Source_Provenance_Tracking_Design.md`](2026-04-04_Source_Provenance_Tracking_Design.md).

Copy everything below the line into a GPT session (GPT-4o or o3 recommended) for independent review.

---

# Review Request: Source Provenance Tracking for Fact-Checking Pipeline

## Context

FactHarbor is an automated fact-checking platform. Its analysis pipeline:
1. Extracts atomic claims from user input
2. Researches claims via web search (fetches 10-30 sources per run)
3. Extracts structured evidence from each source using an LLM (Haiku 4.5 — budget tier)
4. Clusters evidence into assessment boundaries (groups of compatible evidence scopes)
5. Generates verdicts via multi-step LLM debate: advocate argues for, challenger argues against, judge decides (Sonnet 4.5 — standard tier)
6. Aggregates into final assessment with truth percentage, confidence, and evidence citations

The pipeline already tracks:
- **Domain-level reliability scores** (0-1 scale per domain, multi-model consensus, cached 90 days)
- **SourceType** (9 values: peer_reviewed_study, fact_check_report, government_report, legal_document, news_primary, news_secondary, expert_statement, organization_report, other)
- **sourceAuthority** (primary / secondary / opinion — per evidence item)
- **isDerivative** + **derivedFromSourceUrl** (minimal: detects when evidence cites another source's study)
- **probativeValue** (high / medium / low — LLM-assessed evidence quality)
- **evidenceBasis** (scientific / documented / anecdotal / theoretical / pseudoscientific)

What the pipeline does NOT track: **who originally created a claim.** This means 10 outlets repeating a single government press release appears as "10 independent sources agree" — the pipeline cannot distinguish genuine multi-source consensus from single-source amplification.

## Proposed Feature: Source Provenance Tracking

Goal: Trace evidence back to its original creator (person/organization) to detect misinformation amplification, propaganda patterns, and attribution washing.

### Phase 1 — Provenance Extraction (extend existing evidence extraction)

Add optional fields to each extracted evidence item, in the same Haiku 4.5 LLM call that already processes each source's full text:

```typescript
originalCreator?: string;           // Person or org who originated the claim
originalCreatorType?:               // What kind of entity
  | "news_organization"             // Editorial newsroom
  | "government_body"               // Government agency, ministry
  | "research_institution"          // University, research lab
  | "advocacy_group"                // NGO, think tank, lobby
  | "corporation"                   // Company, industry association
  | "political_party"              // Political party or campaign
  | "individual"                    // Named person without institutional affiliation
  | "unknown";
attributionType?:                   // How the source relates to the claim
  | "firsthand"                     // Source witnessed/researched/investigated directly
  | "quoted"                        // Source quotes another entity's claim
  | "aggregated"                    // Source compiles from multiple other sources
  | "anonymous";                    // Attributed to unnamed sources
provenanceConfidence?: number;      // 0-1, LLM's confidence in the extraction
```

Gated behind a UCM toggle (`provenanceTrackingEnabled`, default off). Cost: ~$0.01-0.03/run when enabled. Zero when disabled.

An earlier field `declaredInterest` (none_apparent / institutional / ideological / financial / unknown) was proposed and then removed after internal debate — the LLM Expert argued it is ungroundable for obscure organizations, and the existing source reliability system + sourceType already captures bias signals.

### Phase 2a — Deterministic Convergence Analysis (no additional LLM calls)

Post-extraction annotation pass that:
1. Normalizes creator strings (lowercase, strip punctuation, collapse whitespace)
2. Groups evidence by normalized creator per claim
3. Computes per-claim metrics: `independentCreatorCount`, `dominantCreatorShare`, `singleSourceFlag` (>60% from one creator)
4. Injects a convergence summary (2-3 sentences) into the verdict debate prompt as context — not as a mechanical penalty

Known limitation: basic string normalization will NOT merge "WHO" and "World Health Organization". This is accepted for Phase 2a.

### Phase 2b — LLM Entity Canonicalization (conditional, only if Phase 2a proves insufficient)

One Haiku call per assessment boundary to canonicalize creator names across language variants (WHO = World Health Organization = OMS) and assess genuine editorial independence. Triggered only if >30% of analyses have clearly missed groupings in Phase 2a.

### Phase 3 — Creator-Level Reliability (deferred, no timeline)

Extend existing domain-level reliability cache to also score organizations. Requires entity resolution infrastructure. Only pursued if Phases 1-2 show empirical need after 4+ weeks of production data.

## Design Constraints

- **LLM Intelligence mandate**: All analytical decisions must use LLM intelligence — no keyword/regex heuristics for semantic decisions
- **No hardcoded org lists**: No "known propaganda outlets" database. The LLM identifies originators; the pipeline weighs the evidence.
- **Multilingual**: Must work across languages (EN, FR, DE, and others) without English-centric assumptions
- **Cost budget**: Pipeline runs on a cost budget — each LLM call matters. Current cost per run: ~$0.15-0.50.
- **UCM configurable**: All tunable parameters must be admin-configurable at runtime
- **Evidence-weighted, not censorious**: A government source isn't wrong — but knowing it's the originator (not an independent verifier) changes its evidential weight
- **Existing tests**: 1079 unit tests must not break

## What We Debated Internally (4 perspectives)

### 1. Architecture Perspective
- Layer 1 fits cleanly into existing extraction — natural schema extension
- Layer 2 should be a pre-clustering annotation pass (new file), not a new pipeline stage — avoids breaking the 5-stage contract
- Layer 3 deferred — entity resolution is an unsolved hard problem; the existing `identifiedEntity` field on the SR cache already captures org-level signals as metadata
- Missing from original proposal: entity canonicalization strategy, UCM configuration surface, budget impact analysis

### 2. Analysis Quality Perspective
- **Haiku 4.5 may struggle** with subtle attribution distinctions (quoted vs. aggregated is genuinely hard)
- **`declaredInterest` dropped** — ungroundable for obscure organizations
- **Provenance errors propagate**: A false "same originator" classification corrupts triangulation scoring. Fail-open doesn't work because the damage is directional, not just noisy.
- **Recommendation**: Add `provenanceConfidence` so verdict stage can discount low-confidence extractions. Don't wire into verdict weighting until quality is measured.
- **False positive risk**: Legitimate wide reporting (genuine consensus) and amplification (coordinated messaging) produce identical structural signals. The `attributionType` field helps (firsthand vs. quoted) but may not fully disambiguate.

### 3. Cost/Efficiency Perspective
- Layer 1 is NOT "nearly zero cost" — adds ~$0.01-0.03/run in tokens, plus unmeasured quality degradation risk from overloading the extraction prompt
- Layer 2a (deterministic) costs $0.00 — this is the high-ROI move
- Layer 3 costs $0.10-0.30/run + significant infra complexity — low marginal ROI over existing fields
- **MVP recommendation**: Phase 1 + Phase 2a delivers ~80% of value at <10% cost increase
- **Alternative considered**: Separate provenance micro-call (post-extraction, budget tier, ~$0.01/run) to isolate quality risk from the critical extraction path

### 4. Practical Implementation Perspective
- Phase 1 touches ~11 files — achievable but not trivial
- Entity resolution for convergence analysis is the hardest sub-problem
- Testing strategy: mock LLM outputs for schema/mapping tests; no LLM accuracy tests in CI
- `source-reliability.ts` (842 lines) is already at its complexity ceiling — avoid modifying it in Phase 1
- Backward compatibility is clean: all new fields are optional on `EvidenceItem`

## Questions for Your Review

### 1. Completeness
Are there provenance patterns or misinformation techniques this design would miss? Consider:
- Laundering through multiple intermediaries (A → B → C → we fetch C)
- Sock puppet networks (many seemingly independent sources that are actually one actor)
- Citation chains longer than 2 hops
- Manufactured consensus through coordinated timing
- Content farms and SEO-driven amplification

### 2. Feasibility
Is Haiku 4.5 (budget-tier LLM) realistic for provenance extraction? The extraction prompt already asks it to produce 8+ structured fields per evidence item. Adding 4 more provenance fields increases cognitive load. What's your assessment of:
- Can a budget model reliably distinguish "this journalist investigated and found X" from "this journalist reports that Organization Y claims X"?
- How accurate will the firsthand/quoted/aggregated/anonymous distinction be?
- Would a separate, dedicated provenance extraction call (same model, focused prompt) be more reliable than extending the existing multi-field extraction?

### 3. Schema Design
- Are the four `attributionType` values sufficient? Should `press_release` be its own category rather than merged into `quoted`? Is there a meaningful analytical difference?
- Any missing `originalCreatorType` values? Consider: international organizations, intergovernmental bodies, religious institutions, military, intelligence agencies, anonymous collectives.
- Should `originalCreator` be a single string, or structured (name + organization + role)?
- Is `provenanceConfidence` (0-1) granular enough, or should it be categorical (high/medium/low) to match the existing `probativeValue` pattern?

### 4. Convergence Analysis
- Is deterministic string-matching grouping (Phase 2a) realistic for English-language sources? For multilingual sources?
- Would embedding-based similarity (e.g., cosine similarity of creator name embeddings) be a better middle ground between string matching and full LLM canonicalization?
- What threshold for `dominantCreatorShare` should trigger the single-source flag? We proposed 60% — is this too aggressive (false positives) or too conservative (misses)?

### 5. False Positive Mitigation
How do we distinguish:
- **Legitimate wide reporting** of a genuinely newsworthy event (many outlets report independently because the event is significant) vs.
- **Amplification** of a talking point (many outlets repeat because of coordination or shared bias)

The structural signal (many sources → one originator) is identical in both cases. The `attributionType` field helps (firsthand investigations vs. quotes), but is it sufficient? What additional signals could disambiguate?

### 6. Adversarial Robustness
How easily could a sophisticated actor defeat provenance tracking?
- Stripping attribution markers from content
- Creating circular citation chains (A cites B, B cites A)
- Using many domains that appear independent but are controlled by one entity
- Generating synthetic "original research" that is actually propaganda

What defensive measures could we add without violating the "no hardcoded lists" constraint?

### 7. Alternative or Complementary Approaches
Are there established techniques from computational journalism, OSINT, or academic misinformation research that we should consider instead of or in addition to LLM-based provenance extraction?
- Network analysis of citation/link patterns
- Temporal spread analysis (how fast did the claim propagate?)
- Linguistic fingerprinting (do different "independent" sources use suspiciously similar phrasing?)
- Cross-referencing with known fact-check databases
- Analyzing publication timestamps relative to the original event

### 8. Phasing and Sequencing
- Is our phasing correct (extract → deterministic convergence → LLM convergence → creator reliability)?
- Should any phase move earlier or later?
- Are we missing a phase? (e.g., should there be a dedicated "temporal spread analysis" phase?)
- Is the observation period between phases (20+ runs, 4+ weeks) appropriate?

### 9. Integration with Existing Pipeline
- The verdict stage uses a multi-step debate (advocate → challenger → judge). How should provenance context be presented to maximize its impact? Should only the judge see it? Should the challenger use it to argue against amplified evidence?
- Should provenance data affect the existing `derivativeFactor` calculation in aggregation, or remain separate?
- The source reliability calibration stage (Stage 4.5) adjusts confidence based on source portfolios. Should provenance convergence feed into this stage, or stay in the debate prompt only?

## What We Need From You

Please be critical and specific. We prefer actionable feedback over validation. Structure your response as:
1. **Overall assessment** (1-2 paragraphs)
2. **Per-question responses** (numbered to match above)
3. **Top 3 risks** we haven't identified
4. **Top 3 improvements** you'd make to the design
5. **Go/no-go recommendation** on proceeding with Phase 1
