
# Quality Issues — Unified Analysis & Implementation Plan

**Date:** 2026-02-12
**Synthesized by:** Senior Developer (Opus)
**Inputs:** 4 independent investigations (Sr. Dev Sonnet, Sr. Dev Opus, Lead Dev Codex, SW Architect Cline/GLM5)
**Verified against:** Runtime code, prompt loading, schema definitions, actual analysis outputs

---

## Executive Summary

Three quality issues were investigated across two real analyses (Epstein/Fox article + Bolsonaro trial). All four investigators converged on the same root causes, with Codex providing the most actionable insight: **the runtime prompt profile doesn't include classification field instructions at all.**

| Issue | Root Cause | Impact | Agreed Fix |
|-------|-----------|--------|------------|
| Classification fallbacks (22/analysis) | Runtime prompt missing field instructions + schema `.optional()` | Evidence systematically downgraded to "anecdotal" | Add instructions to prompt profile + make fields required in schema |
| Low grounding ratio (30-35%) | Missing evidence citations (28.6% of claims) + ~~substring matching too strict~~ | False quality warnings, incorrect confidence penalties | Citation hydration + LLM-powered grounding **✅ DONE (Steps 1-3)** |
| Verdict direction mismatch | `claimDirection` scope mismatch + LLM conflates "contested" with "false" | Auto-corrections that may be wrong; misleading warning text | Disable auto-correct → warning-only; LLM-based per-claim validation **✅ DONE (Steps 1-3)** |

---

## Issue 1: Classification Fallbacks — `evidenceBasis` (CRITICAL)

### Confirmed Root Cause (all 4 agree)

The `orchestrated.prompt.md` EXTRACT_EVIDENCE section (lines 476-520) — which is the **only prompt sent to the LLM at runtime** — does **not contain instructions** for:
- `sourceAuthority` (primary/secondary/opinion)
- `evidenceBasis` (scientific/documented/anecdotal/theoretical/pseudoscientific)
- `probativeValue` (high/medium/low)

Detailed instructions exist in `extract-evidence-base.ts` (lines 126-200), but that file is **legacy/unused** by the orchestrated pipeline. The prompt loader (`loadAndRenderSection`) loads only from `orchestrated.prompt.md`.

Additionally, the Zod EVIDENCE_SCHEMA marks all three fields as `.optional()` (lines 6124-6130), so structured output mode doesn't force the LLM to produce them.

**Result:** The LLM is never told about these fields → omits them → Zod passes silently → fallback defaults apply → `evidenceBasis` defaults to `"anecdotal"` for official records, legal documents, government reports, etc.

**Data (Codex):** 189 fallbacks across last 120 jobs. Target is <5% fallback rate. Current: ~25%.

### Agreed Fix (two-part, all investigators align)

**Part A — Prompt profile alignment (requires human approval per AGENTS.md)**
Port classification field instructions from `extract-evidence-base.ts` lines 126-200 into `orchestrated.prompt.md` section EXTRACT_EVIDENCE. Include:
- Decision tree for each field
- Concrete examples per category
- Clear guidance on boundary cases

**Part B — Schema enforcement**
Make `evidenceBasis`, `sourceAuthority`, and `probativeValue` **required** (remove `.optional()`) in EVIDENCE_SCHEMA. The structured output mode (AI SDK `Output.object({ schema })`) will force the LLM to produce them. The normalization layer remains as safety net.

**Risk:** Minimal. Structured output providers (Anthropic, OpenAI) enforce required fields. The normalization fallback layer in `evidence-normalization.ts` handles any edge cases.

**Files to change:**
- `apps/web/prompts/orchestrated.prompt.md` — Add classification instructions to EXTRACT_EVIDENCE section
- `apps/web/src/lib/analyzer/orchestrated.ts` lines 6124-6130 — Remove `.optional()` from 3 fields
- `apps/web/src/lib/analyzer/prompts/base/extract-evidence-base.ts` — Consider deprecation notice

---

## Issue 2: Low Grounding Ratio (HIGH)

### Confirmed Root Cause (all 4 agree, Codex quantified)

Three compounding sub-problems:

**A. Missing `supportingEvidenceIds` (primary cause)**
- 28.6% of claims across 120 jobs have empty citation arrays (Codex data)
- Job 1 (Epstein): 5/15 claims with empty citations → those all score 0% grounding
- The verdict schema marks `supportingEvidenceIds` as `.optional()` in all verdict schemas (lines 6780, 6819, 6912, 6947)
- The verdict prompt (line 644) lists `supportingEvidenceIds` in the output spec but doesn't emphasize it as critical

**B. ~~Lexical substring matching (secondary cause)~~ ✅ RESOLVED**
- ~~`corpus.includes(term.toLowerCase())` (grounding-check.ts:213) is exact match~~
- ~~LLM reasoning paraphrases evidence (e.g., "controversial plea deal" vs "pleaded guilty to soliciting prostitution")~~
- ~~No stemming, no synonym handling, no semantic equivalence~~
- **Fix applied:** Replaced with LLM-powered grounding adjudication (`adjudicateGroundingBatch` in `grounding-check.ts`). LLM directly rates how well reasoning traces to cited evidence (0-1 ratio). Degraded fallback returns 0.5 with `degraded: true` flag.

**C. ~~Term extraction from wrong perspective~~ ✅ RESOLVED**
- ~~Key terms extracted from reasoning language, not evidence language~~
- ~~Even well-grounded reasoning shows low match rates because vocabulary differs~~
- **Fix applied:** No longer relevant — LLM adjudication evaluates semantic grounding directly, bypassing term extraction + matching entirely.

### Agreed Fix (phased)

**Phase 1 — Citation hydration (structural, immediate) ✅ DONE**
Before the grounding check runs, scan verdict `reasoning` text for evidence ID patterns (e.g., `S1-E5`, `S10-E2`) and hydrate empty `supportingEvidenceIds` arrays. This is structural plumbing (regex for ID patterns, not semantic analysis), so it complies with AGENTS.md.
- **Implemented:** `hydrateSupportingEvidenceIdsFromReasoning()` in `grounding-check.ts`

**Phase 2 — LLM-powered grounding adjudication (proper fix) ✅ DONE**
~~Replace the substring matching step (grounding-check.ts:208-216) with a batched LLM call~~ that asks: "For each verdict, are the key claims in the reasoning supported by the cited evidence?" This aligns with AGENTS.md mandate and was recommended by Sonnet, Codex, and the SW Architect.
- **Implemented:** `adjudicateGroundingBatch()` in `grounding-check.ts`. Returns `{ ratios: number[], degraded: boolean }`. Degraded fallback: 0.5 (not 1.0). Prompt section: `GROUNDING_ADJUDICATION_BATCH_USER`.

**Phase 3 — Make thresholds UCM-configurable ✅ DONE**
~~Current hardcoded thresholds (0.3 warning, 0.5 penalty) should move to UCM~~ per AGENTS.md configuration rules.
- **Implemented:** `groundingPenalty` section in `calculation.default.json` + Zod schema in `config-schemas.ts`. Fields: `enabled`, `threshold`, `reductionFactor`, `floorRatio`.

**Files to change:**
- `apps/web/src/lib/analyzer/grounding-check.ts` — Citation hydration + LLM adjudication
- `apps/web/prompts/orchestrated.prompt.md` — Strengthen evidence citation instructions in VERDICT section
- `apps/web/src/lib/config-storage.ts` — Add grounding threshold UCM keys

---

## Issue 3: Verdict Direction Mismatch (HIGH)

### Confirmed Root Cause (Codex + Opus + Sonnet converge)

**A. Scope mismatch in direction validation (Codex, critical insight)**
`claimDirection` on evidence items is defined relative to the **original user claim** (types.ts:477). But `validateVerdictDirections` uses these directions to validate **sub-claim verdicts** (orchestrated.ts:3509). Sub-claims can have different truth directions than the original claim, making the validation unreliable.

Example: Original claim "Trump exposed Epstein." Sub-claim SC16 "3M pages = substantial compliance." Evidence supporting SC16 has `claimDirection: "supports"` (relative to original claim), but the sub-claim verdict rates something different.

**B. Auto-correct always enabled, may produce wrong flips**
All three verdict paths pass `autoCorrect: true` (lines 8009, 8596, 9306). When the scope mismatch makes the direction check wrong, auto-correction flips verdicts incorrectly.

**C. Warning message is misleading (Codex)**
Line 3592 always reports "% of evidence contradicts" even when the actual issue is that evidence supports but verdict is low.

**D. LLM conflates "contested" with "false" (Opus)**
SC16 had all evidence confirming the factual release (supports), but the LLM scored low because stakeholders contested the completeness. The LLM treated contestation as counter-evidence.

### Agreed Fix (phased)

**Phase 1 — Disable auto-correct, fix warnings (immediate, code-only) ✅ DONE**
- ~~Change `autoCorrect: true` → `autoCorrect: false` in all three call sites~~ Done (lines 8097, 8694, 9414)
- ~~Fix warning message text~~ Done — legacy directional metadata moved to `legacyDirectionalMetadata` sub-object
- Warning-only mode active

**Phase 2 — LLM-based claim-specific direction validation (proper fix) ✅ DONE**
~~Replace deterministic direction check with a batched LLM call~~ Done. `batchDirectionValidationLLM()` evaluates per sub-claim semantically. Returns `DirectionValidationBatchResult { results: [...] | null, degraded: boolean }`. Degraded mode: skips all judgments, keeps verdicts unchanged (no false "aligned" assumption). Prompt section: `VERDICT_DIRECTION_VALIDATION_BATCH_USER`.
- **Also:** Removed `totalDirectional` counter-based gate. Only structural gate remains: `linkedEvidence.length >= minEvidenceCount`.

**Phase 3 — Strengthen verdict prompt (prompt change, needs approval) ✅ DONE**
Anti-pattern examples added per Sonnet's recommendation:
- "Contested ≠ false: If evidence confirms the factual claim but stakeholders dispute interpretation, verdict should be ≥50%"
- "Score THE CLAIM, not YOUR CONFIDENCE in the analysis"

**Files changed:**
- `apps/web/src/lib/analyzer/orchestrated.ts` — Auto-correct disabled, LLM direction validation, degraded mode handling, `legacyDirectionalMetadata`
- `apps/web/src/lib/analyzer/grounding-check.ts` — LLM adjudication, degraded mode, citation hydration
- `apps/web/src/lib/analyzer/types.ts` — Added `grounding_check_degraded`, `direction_validation_degraded` warning types
- `apps/web/prompts/orchestrated.prompt.md` — Anti-patterns in VERDICT + new prompt sections

---

## Issue 4: Prompt Observability (MEDIUM, Codex only)

Prompt hash is tracked in pipeline (line 10132) but not persisted to result meta (line 11895). All succeeded jobs have `PromptContentHash = null`. This makes it impossible to correlate quality issues with specific prompt versions.

**Fix:** Persist prompt hash + loaded timestamp into result meta and Jobs table.

---

## Implementation Plan

### Step 1 — Immediate code fixes (no prompt changes, no approval needed) ✅ DONE

| Change | File | Lines | Risk | Status |
|--------|------|-------|------|--------|
| Remove `.optional()` from `evidenceBasis`, `sourceAuthority`, `probativeValue` in EVIDENCE_SCHEMA | orchestrated.ts | 6124-6130 | Low | ✅ |
| Fix `claimDirection` scope mismatch in `validateVerdictDirections` — validate against sub-claim direction, not original claim | orchestrated.ts | 3482-3640 | Medium | ✅ |
| Fix misleading warning message in verdict direction mismatch | orchestrated.ts | 3592 | Low | ✅ |
| Add citation hydration (regex S\d+-E\d+ from reasoning text) before grounding check | grounding-check.ts | new function | Low | ✅ |
| Persist prompt hash to result meta | orchestrated.ts | 11895 | Low | ✅ |

**Decision:** Auto-correct disabled (warning-only mode) until LLM per-claim validation is proven.
**Decision:** All three classification fields (`evidenceBasis`, `sourceAuthority`, `probativeValue`) made required.

### Step 2 — Prompt profile alignment (needs human approval) ✅ DONE

| Change | File | Risk | Status |
|--------|------|------|--------|
| Port `sourceAuthority`, `evidenceBasis`, `probativeValue` instructions from `extract-evidence-base.ts` into `orchestrated.prompt.md` EXTRACT_EVIDENCE section | orchestrated.prompt.md | Medium | ✅ |
| Add anti-pattern examples to VERDICT section (contested ≠ false) | orchestrated.prompt.md | Medium | ✅ |
| Strengthen `supportingEvidenceIds` as REQUIRED with emphasis in VERDICT section | orchestrated.prompt.md | Low | ✅ |

### Step 3 — LLM-powered replacements (significant code changes) ✅ DONE

| Change | File | Risk | Status |
|--------|------|------|--------|
| Replace substring grounding check with LLM-powered adjudication (batched) | grounding-check.ts | Medium | ✅ `adjudicateGroundingBatch()` |
| Replace deterministic direction validation with LLM-based per-claim validation (batched) | orchestrated.ts | Medium | ✅ `batchDirectionValidationLLM()` |
| Make grounding thresholds UCM-configurable | config-schemas.ts + calculation.default.json | Low | ✅ `groundingPenalty` section |
| Add degraded mode for LLM failures (grounding + direction) | grounding-check.ts + orchestrated.ts + types.ts | Medium | ✅ Conservative fallbacks + warning types |

**Verification:** 493/493 unit tests pass, build clean, prompt hash updated (75e2b29d).

### Step 4 — Telemetry & regression (hardening) — NOT STARTED

| Change | File | Risk |
|--------|------|------|
| Add telemetry gates: fallback rate, no-citation rate, grounding ratio, direction-mismatch rate | orchestrated.ts | Low |
| Add regression tests for classification fallback scenarios | test/unit/ | Low |
| Deprecate `extract-evidence-base.ts` with notice | extract-evidence-base.ts | Low |

**Effort:** ~2-3 hours

### Total estimated effort: 12-17 hours across 4 steps

### Expected outcomes after full implementation:
- evidenceBasis fallbacks: from ~25% → <2%
- Grounding ratio: from 30-35% → 60-80%
- Verdict direction auto-corrections: scope-correct (no more wrong flips)
- Classification fallbacks total: from 10-12/analysis → <2/analysis

---

## Cross-Reference: Investigator Agreement Matrix

| Finding | Sonnet | Opus | Codex | Cline |
|---------|--------|------|-------|-------|
| Prompt missing classification instructions | Partial (prompt too brief) | Partial (schema mismatch) | **Full** (prompt-schema drift, runtime verified) | Partial (prompt emphasis) |
| Schema `.optional()` allows omission | — | **Full** (primary finding) | **Full** (confirmed) | Partial (mentioned) |
| Substring matching too strict | **Full** | **Full** | **Full** | **Full** |
| Missing `supportingEvidenceIds` | — | **Full** (sub-problem C) | **Full** (28.6% quantified) | **Full** |
| `claimDirection` scope mismatch | — | — | **Full** (critical insight) | Partial |
| Auto-correct may be wrong | — | — | **Full** | Partial |
| Warning message misleading | — | — | **Full** | — |
| LLM conflates contested ≠ false | — | **Full** | — | — |
| Prompt observability gap | — | — | **Full** | — |
| Recommend LLM-powered grounding | **Full** | Partial (stemming first) | **Full** | — |

**Strongest contributions per investigator:**
- **Codex**: Runtime prompt-schema drift discovery, quantitative data from 120 jobs, claimDirection scope mismatch, warning text bug
- **Opus**: Schema `.optional()` as primary enabler, contested-vs-false conflation analysis
- **Sonnet**: LLM-powered grounding recommendation with AGENTS.md compliance rationale, verdict prompt restructuring proposal
- **Cline**: Confirmation of all issues, neutral evidence handling gap in direction check

---

## Raw Investigation Reports

----
Report from Senior Developer Sonnet:

Quality Issues Investigation Report
I've completed a systematic investigation of the four quality issues. Here are my findings:

Issue 1: Low Grounding Ratios (30-35%)
Files Analyzed:

grounding-check.ts:1-277
Root Cause:
The grounding check system has a fundamental mismatch between how reasoning is expressed vs. how evidence is stored:

LLM extracts key terms from verdict reasoning using intelligent extraction (lines 70-121)
Simplistic string matching checks if terms appear in evidence corpus (lines 208-216):

if (corpus.includes(term.toLowerCase())) {
  groundedCount++;
}
Problems:

No semantic equivalence handling - "judicial process" in reasoning won't match "court procedures" in evidence
No synonym handling - "fair" won't match "equitable"
No phrase variations - "27-year prison sentence" won't match "sentenced to 27 years"
The LLM uses natural language variations, but matching is literal substring search
Impact: Even well-grounded verdicts show 30-35% grounding because the LLM paraphrases evidence using different wording in the reasoning.

Proposed Fixes:

Option A: LLM-Powered Grounding Check (Recommended)

Replace substring matching with LLM call: "Which of these key terms are semantically present in the evidence corpus?"
Batch all term-checking into one call per analysis
Cost: ~1 Haiku call per analysis (minimal)
Aligns with AGENTS.md: "Deterministic text-analysis logic that makes analytical decisions MUST be replaced with LLM-powered intelligence"
Option B: Embedding-Based Semantic Matching

Use text embeddings to find semantic similarity between terms and evidence
More expensive, requires vector operations
Still deterministic (doesn't understand context)
Option C: Loosen Substring Matching (Quick fix, not recommended)

Stem words, use fuzzy matching
Violates AGENTS.md LLM-first principle
Won't solve fundamental semantic gap
Issue 2: EvidenceBasis Classification Failures (10-12 per analysis, all defaulting to "anecdotal")
Files Analyzed:

extract-evidence-base.ts:142-151
orchestrated.ts:896-907
Root Cause:
The prompt guidance for evidenceBasis is inadequate:


## EVIDENCE BASIS (NEW - classify for each evidence item)
Classify the basis of the evidence itself:
- **scientific**: Empirical studies, experiments, measured data
- **documented**: Official records, audits, legal findings, verified logs
- **anecdotal**: Personal accounts or testimonials without broader verification
- **theoretical**: Logical arguments without empirical confirmation
- **pseudoscientific**: Claims that conflict with established scientific principles

If unclear, default to "documented" for official sources or "anecdotal" for informal sources.
Problems:

Too brief - Only 6 lines vs. 30+ lines for other fields (sourceAuthority, probativeValue, claimDirection)
No examples - Other fields have concrete examples, this doesn't
Ambiguous boundaries - "documented" overlaps heavily with many other categories
Contradictory defaults - Prompt says default to "documented" for official sources, but code defaults to "anecdotal" (line 902)
No decision tree - Unlike sourceAuthority which has clear if/then logic, evidenceBasis guidance is vague
Impact: LLM consistently fails to classify evidenceBasis, triggering fallback to "anecdotal" for 10-12 fields per analysis.

Proposed Fixes:

Option A: Enhanced Prompt Guidance (Recommended)
Add to extract-evidence-base.ts:

3-4 concrete examples per category
Decision tree logic: "If source contains measurements/experiments → scientific; if source is official records/filings → documented; if source is testimony/accounts → anecdotal"
Explicit non-examples: "Court documents are 'documented' not 'scientific' even if they reference studies"
Move evidenceBasis section BEFORE output format (currently buried at line 142)
Option B: Two-Pass Classification

First pass: Extract evidence items without evidenceBasis
Second pass: Batch-classify all evidenceBasis in one LLM call with focused prompt
More expensive but potentially more accurate
Option C: Change Default to "documented"

Quick fix: Change line 902 from "anecdotal" to "documented" to match prompt guidance
Doesn't solve root cause (LLM still failing to classify)
Masks the problem instead of fixing it
Issue 3: Verdict Direction Mismatch (auto-correction frequently needed)
Files Analyzed:

orchestrated.ts:7874-7903 - Inversion detection
orchestrated.ts:3482-3632 - Direction validation
verdict-base.ts:206-256 - ratingConfirmation prompt
Root Cause:
Multiple detection/correction systems indicate persistent LLM confusion about what to rate:

ratingConfirmation field (added v2.8.4) - LLM explicitly states what it's rating
Regex inversion detection (v2.6.31) - Fallback pattern matching
Evidence direction validation (P0) - Compares verdict % against evidence direction
The need for THREE correction systems means the prompt is not clear enough.

Problems:

Prompt assumes LLM understands the task - Says "Rate the claim's truth" but doesn't explain why this is confusing
No anti-pattern examples - Doesn't show what "rating your analysis" looks like vs. "rating the claim"
ratingConfirmation is buried - Line 206 in a long prompt, easy for LLM to miss
Competing instructions - Multiple sections about reasoning, confidence, evidence - verdict direction gets lost
Impact: Verdicts frequently have wrong direction, requiring auto-correction which adds warnings and degrades user trust.

Proposed Fixes:

Option A: Restructured Verdict Prompt (Recommended)

Move ratingConfirmation to TOP - Make it the first instruction after examples
Add anti-pattern examples:

❌ WRONG: "My analysis is well-supported (85% confident)" → verdict: 85%
✅ RIGHT: "Evidence refutes the claim (85% confident)" → verdict: 15%
Explicit reminder before each claim: "Are you rating THE CLAIM or YOUR ANALYSIS?"
Visual separation: Use more prominent formatting for ratingConfirmation section
Option B: Separate Confirmation Step

Two-pass verdict generation:
First pass: Generate verdict + reasoning
Second pass: "Given this reasoning, confirm the verdict direction and percentage"
More expensive (2x LLM calls per verdict)
But eliminates direction errors
Option C: Remove Auto-Correction, Force Manual Review

Stop auto-correcting mismatches
Flag as analysis failure requiring manual review
User-facing, increases friction
Issue 4: Classification Fallbacks (10-12 fields per analysis)
Files Analyzed:

classification-fallbacks.ts:1-61
format-fallback-report.ts
Root Cause:
This is a symptom tracking system, not a root cause. The fallbacks are consequences of Issues 1-3:

evidenceBasis failures → Issue 2
Other classification failures → Similar prompt inadequacy problems
Breakdown by Field (from user's examples):

evidenceBasis: 10-12 per analysis → Issue 2
harmPotential: Occasional → Check prompt guidance
factualBasis: Occasional → Check prompt guidance
sourceAuthority: Rare → Prompt seems adequate
isContested: Rare → Prompt seems adequate
Proposed Fix:
No direct fix needed - fixing Issues 2 and improving other field prompts will reduce fallback count. The FallbackTracker system is working correctly as a monitoring tool.

Summary Recommendations
Issue	Priority	Recommended Fix	Effort	Impact
Low Grounding (30-35%)	HIGH	LLM-powered semantic term matching	2-3 hours	Accurate grounding ratios, proper confidence penalties
EvidenceBasis Failures (10-12/analysis)	CRITICAL	Enhanced prompt with examples + decision tree	1-2 hours	Eliminate classification fallbacks
Verdict Direction Mismatch	HIGH	Restructured prompt with anti-patterns at top	1-2 hours	Eliminate direction corrections
Classification Fallbacks	MEDIUM	Fix Issues 2 + audit other fields	3-4 hours	Reduce total fallbacks to <2 per analysis
Total Estimated Effort: 7-11 hours

Expected Outcome: Grounding ratios 60-80%, evidenceBasis fallbacks eliminated, verdict direction auto-corrections eliminated, total fallbacks <2 per analysis.

Next Steps
Immediate: Fix evidenceBasis prompt (Issue 2) - highest ROI, eliminates most fallbacks
Short-term: Restructure verdict prompt (Issue 3) - eliminates direction mismatches
Medium-term: Implement LLM-powered grounding check (Issue 1) - requires more code changes but critical for confidence calibration accuracy
----
From Senior Developer Opus:

Issue 1: evidenceBasis Classification Fallbacks (22 across both analyses)
Root Cause: Zod schema marks evidenceBasis as .optional()

The chain of failure:

EVIDENCE_SCHEMA declares evidenceBasis as .optional() — the LLM is allowed to omit it
The prompt at extract-evidence-base.ts:241 says evidenceBasis: ... (REQUIRED) — but the schema contract contradicts the prompt text
When the LLM omits evidenceBasis, Zod validation passes silently (it's optional!)
EvidenceNormalizer.normalizeClassifications catches the missing value and defaults to "anecdotal"
The fallback tracker records "LLM did not provide value"
Why this matters: "anecdotal" is the weakest evidence basis. Defaulting 22 evidence items — many of which are official records, legal documents, or government reports — to "anecdotal" systematically downgrades evidence quality, biasing the analysis toward lower confidence.

Proposed fix (two-part):

A. Make evidenceBasis required in the Zod schema — Change .optional() to required. When using structured output mode (AI SDK's Output.object({ schema })), the LLM is constrained to match the schema. If the field is required, the model must return it. This is the primary fix.


// orchestrated.ts line 6126-6128
evidenceBasis: z.enum(["scientific", "documented", "anecdotal", "theoretical", "pseudoscientific"]),
// Remove .optional()
B. Same for sourceAuthority and probativeValue — These are also marked .optional() but the prompt says (REQUIRED). Aligning schema with prompt intent would prevent similar fallback issues.

Risk: If the LLM provider doesn't support strict structured output (e.g., some OpenAI models), removing .optional() could cause extraction failures. However, the code already uses Output.object({ schema }) with getStructuredOutputProviderOptions(), which enables constrained decoding. The fallback normalization layer provides safety even if a non-compliant provider is used.

Issue 2: Low Grounding Ratio (30% / 35%)
Root Cause: Structural mismatch between LLM reasoning style and substring matching

The grounding-check.ts algorithm:

Uses Haiku to extract key terms from verdict reasoning (line 73)
Builds a corpus from cited evidence statement + sourceExcerpt fields (lines 130-146)
Does exact substring matching — corpus.includes(term.toLowerCase()) (line 213)
Three sub-problems:

A. Vocabulary mismatch is inherent. The LLM writes verdict reasoning using synthesized/paraphrased language (e.g., "controversial plea deal", "serial sex offender"). The evidence items contain raw source text (e.g., "pleaded guilty to a state charge of soliciting prostitution"). The key terms from reasoning naturally won't appear verbatim in evidence text.

B. No stemming/fuzzy matching. "controversial" won't match "controversy". "prosecutors" won't match "prosecution". "investigating" won't match "investigation". Exact substring matching is too strict for natural language.

C. Claims with no supportingEvidenceIds automatically score 0%. Claims SC8-SC12 in Analysis 1 show "reasoning has N key terms but no cited evidence" — the LLM wrote reasoning without citing evidence IDs. This is a verdict LLM output quality issue, not a grounding check bug.

Proposed fixes:

A. Add basic stemming to term matching — Use a lightweight stemmer (or at minimum, strip common suffixes) before matching. This is structural plumbing, not analytical decision-making, so it complies with the LLM Intelligence Migration rule.

B. Include the full verdict reasoning text in the grounding prompt — Ask the LLM to extract terms that would appear in evidence corpus language (source-grounded terms), not reasoning language. The current prompt says "extract key factual terms from reasoning" but should say "extract terms that you would expect to find in the cited evidence."

C. For verdicts with no cited evidence IDs (the SC8-SC12 cases) — This is the bigger issue. The verdict LLM is producing reasoning that doesn't reference evidence IDs. Two approaches:

Prompt improvement: Strengthen the verdict prompt to require explicit evidence ID citations
Post-hoc evidence linking: Before grounding check, attempt to match unreferenced evidence to verdicts by semantic similarity (LLM-powered)
Issue 3: Verdict Direction Mismatch (SC16 auto-corrected 38% → 65%)
Root Cause: LLM produced a low verdict despite 100% supporting evidence

The validateVerdictDirections function correctly detected and corrected this. The auto-correction formula:

Evidence supports → verdict is low → correctedPct = Math.max(65, 100 - verdict.truthPercentage)
For SC16: Math.max(65, 100 - 38) = Math.max(65, 62) = 65
This is working as designed. The detection caught an LLM quality issue. But we should address why the LLM produced a contradictory verdict in the first place.

Why it happened: SC16 is about whether releasing 3M pages represents "substantial transparency compliance." The LLM likely interpreted the contested nature (Khanna says "only half") as reason for a low score, while classifying all evidence items as "supports" because the evidence confirmed the factual release. This is a conflation of factual accuracy with contested interpretation — the LLM scored the contested interpretation low while the evidence confirmed the underlying facts.

Proposed fix: This is a prompt-level issue. The verdict prompt should be clearer about:

Score based on evidence direction (if evidence supports, verdict should be ≥50%)
Contested evidence should influence confidence, not verdict direction
The auto-correction mechanism is a valid safety net, but ideally the LLM should get it right
Summary & Priority
Issue	Impact	Fix Effort	Priority
evidenceBasis .optional() schema mismatch	High — 22 items misclassified as "anecdotal"	Low — schema change	P0
sourceAuthority / probativeValue also .optional()	Medium — similar fallback risk	Low — same pattern	P1
Grounding: no cited evidence IDs	High — 8 verdicts ungrounded	Medium — prompt improvement	P1
Grounding: substring matching too strict	Medium — inflates false positives	Medium — add stemming	P2
Verdict direction: LLM conflating contested ≠ false	Low — auto-correction catches it	Medium — prompt tuning	P2
-----
From Lead Developer CODEX:

**Role/Scope**
Lead Developer is the right fit for this task (no handoff needed).  
I loaded the required docs (`AGENTS.md`, coding/testing guidelines, current status) and traced the pipeline code + prompt profile used at runtime.

**Findings (root causes + fixes)**

1. **Classification fallbacks are mostly prompt-schema drift (critical)**
- Runtime prompt profile `apps/web/prompts/orchestrated.prompt.md:476` (`EXTRACT_EVIDENCE`) does not instruct `sourceAuthority`, `evidenceBasis`, `probativeValue` output.
- Extraction schema expects those fields but currently optional: `apps/web/src/lib/analyzer/orchestrated.ts:6103`, `apps/web/src/lib/analyzer/orchestrated.ts:6124`, `apps/web/src/lib/analyzer/orchestrated.ts:6126`, `apps/web/src/lib/analyzer/orchestrated.ts:6130`.
- Your 2 jobs: `evidenceBasis` fallbacks were `12/44` and `10/52` evidence items (27.3% and 19.2%).
- Broader scan (last 120 succeeded orchestrated jobs): `evidenceBasis` fallback total = `189` (docs target is <5% fallback: `Docs/ARCHITECTURE/Evidence_Quality_Filtering.md:1245`).
- **Fix**:
  - Update orchestrated prompt sections to require those fields explicitly (prompt edit; needs your explicit approval per AGENTS rules).
  - Then tighten schema/output validation and add regression checks for missing classification fields.

2. **Verdict direction auto-correction can produce wrong flips (critical)**
- `claimDirection` is defined relative to the **original user claim** (`apps/web/src/lib/analyzer/types.ts:477`), but direction validation runs per **sub-claim verdict** using those evidence directions (`apps/web/src/lib/analyzer/orchestrated.ts:3482`, `apps/web/src/lib/analyzer/orchestrated.ts:3509`).
- Auto-correct is always enabled in all verdict paths (`apps/web/src/lib/analyzer/orchestrated.ts:8009`, `apps/web/src/lib/analyzer/orchestrated.ts:8596`, `apps/web/src/lib/analyzer/orchestrated.ts:9306`).
- That mismatch is why SC16 got pulled from 38% to 65% despite contested reasoning.
- Warning text is also misleading: message always reports “% contradicts” even when evidence majority is supportive (`apps/web/src/lib/analyzer/orchestrated.ts:3592`).
- **Fix**:
  - Immediate: disable auto-correction (warning-only) and fix warning text/details.
  - Proper: replace with claim-specific LLM direction validation (batched), not original-claim `claimDirection`.

3. **Grounding warnings are inflated by missing citations + lexical matching limits (high)**
- `supportingEvidenceIds` is optional/catch-fallback in verdict schemas (`apps/web/src/lib/analyzer/orchestrated.ts:6780`, `apps/web/src/lib/analyzer/orchestrated.ts:6819`, `apps/web/src/lib/analyzer/orchestrated.ts:6912` etc.).
- Job 1 had `5/15` claims with empty citations; recent 120-job scan shows `28.6%` of claims without citations.
- Grounding uses term extraction + substring checks (`apps/web/src/lib/analyzer/grounding-check.ts:213`) and warns below 0.3 (`apps/web/src/lib/analyzer/grounding-check.ts:231`), which is brittle on paraphrases.
- **Fix**:
  - Add structural citation hydration from reasoning citations (e.g., `Sx-Ey`) when `supportingEvidenceIds` is empty.
  - Move grounding scoring to LLM adjudication (batched), keep deterministic checks only for structural validation.
  - Make grounding thresholds UCM-configurable.

4. **Prompt observability is incomplete (medium)**
- Prompt hash is loaded/tracked in pipeline (`apps/web/src/lib/analyzer/orchestrated.ts:10132`) but not included in result `meta` (`apps/web/src/lib/analyzer/orchestrated.ts:11895`).
- In DB, all succeeded orchestrated jobs had `PromptContentHash = null`.
- **Fix**:
  - Persist prompt hash/loaded timestamp into result meta and Jobs table fields for postmortem traceability.

**Recommended implementation order**
1. Disable direction auto-correct + fix message payload + add citation hydration.
2. Prompt profile alignment for extraction fields (with your approval).
3. LLM-based claim-direction validation + LLM grounding adjudication (batched).
4. Add telemetry gates: fallback rate, no-citation rate, grounding ratio, direction-mismatch rate.
---
From SW Architect Cline z-ai/glm5

# Quality Issues Investigation - Analysis & Recommendations

Based on my investigation of the codebase, I've identified the root causes and potential solutions for the three quality issues you've highlighted.

---

## Issue 1: Verdict Direction Mismatch

### Problem Analysis
The system detected that claim SC16 had a verdict of 38% but 0% of evidence contradicted it, and auto-corrected to 65%. Looking at the code in `orchestrated.ts` (line ~3482), the `validateVerdictDirections` function:

```typescript
// Determine expected direction based on evidence majority
const supportRatio = supportCount / totalDirectional;
const evidenceSuggestsHigh = supportRatio >= majorityThreshold; // 0.6
const evidenceSuggestsLow = contradictRatio >= majorityThreshold;

// Determine actual direction from verdict
const verdictIsHigh = verdict.truthPercentage >= VERDICT_BANDS.MOSTLY_TRUE; // 72%
const verdictIsLow = verdict.truthPercentage < VERDICT_BANDS.MIXED; // 43%
```

**Root Cause**: The logic only considers evidence direction when there's a **majority** (≥60%) in one direction. If evidence is split (e.g., 50% support, 50% neutral), neither `evidenceSuggestsHigh` nor `evidenceSuggestsLow` is true, so no mismatch is detected even when the verdict is low despite supporting evidence.

**For SC16 specifically**: The claim had 100% supporting evidence (0% contradicts), but the verdict was 38% (LOW). The mismatch detection should have caught this, but the auto-correction logic may have issues with edge cases.

### Recommendations
1. **Add neutral evidence handling**: When most evidence is neutral but some supports, the verdict shouldn't be penalized to "Leaning False"
2. **Review auto-correction formula**: The current formula `correctedPct = Math.min(35, 100 - verdict.truthPercentage)` may be too aggressive
3. **Add logging for mismatch detection**: Track why certain mismatches are/aren't detected

---

## Issue 2: Grounding Check (Low Ratio: 30-35%)

### Problem Analysis
The grounding check in `grounding-check.ts` extracts key terms from verdict reasoning and checks if they appear in cited evidence. The low ratios (30-35%) indicate:

1. **LLM reasoning uses terms not in evidence**: The verdict reasoning discusses concepts that aren't directly quoted from sources
2. **Term extraction may be too aggressive**: The LLM-based `extractKeyTermsBatch` may extract too many terms
3. **Evidence IDs not properly linked**: Some verdicts cite evidence IDs but the reasoning doesn't reference the actual evidence content

Looking at the warnings:
```
"Claim SC8: reasoning has 9 key terms but no cited evidence"
"Claim SC12: reasoning has 10 key terms but no cited evidence"
```

**Root Cause**: Verdicts are being generated without properly citing supporting evidence IDs, or the reasoning is too abstract.

### Recommendations
1. **Enforce evidence citation in prompts**: Update verdict prompts to require explicit evidence ID references in reasoning
2. **Add grounding pre-check**: Before accepting a verdict, verify it has at least 2 cited evidence IDs
3. **Improve term extraction**: Focus on nouns/entities rather than abstract concepts

---

## Issue 3: Classification Fallbacks (evidenceBasis)

### Problem Analysis
The LLM failed to classify `evidenceBasis` for 12+ evidence items, falling back to "anecdotal" (the safe default). Looking at `orchestrated.ts`:

```typescript
// evidenceBasis
if (!item.evidenceBasis || !["scientific", "documented", "anecdotal", "theoretical", "pseudoscientific"].includes(item.evidenceBasis)) {
  const reason = !item.evidenceBasis ? 'missing' : 'invalid';
  item.evidenceBasis = "anecdotal";
  // ... fallback tracking
}
```

**Root Cause**: The evidence extraction prompt may not be emphasizing `evidenceBasis` strongly enough, or the LLM is skipping it when the evidence is ambiguous.

### Recommendations
1. **Strengthen prompt requirements**: Make `evidenceBasis` a REQUIRED field with explicit examples
2. **Add validation layer**: After extraction, verify all classification fields are populated
3. **Use structured output enforcement**: Ensure the schema marks these as required (not optional)

---

## Proposed Implementation Plan

### Phase 1: Quick Wins (Low Risk)
1. **Add logging to `validateVerdictDirections`** to understand why mismatches occur
2. **Update evidence extraction prompt** to emphasize `evidenceBasis` and `sourceAuthority` as required
3. **Add minimum evidence citation check** before accepting verdicts

### Phase 2: Structural Improvements
1. **Refine grounding check algorithm** to be more lenient with abstract reasoning
2. **Add evidence-to-reasoning linking** in verdict prompts (explicit "Based on evidence E1, E2...")
3. **Implement classification confidence tracking** to identify when LLM is uncertain

### Phase 3: Monitoring & Telemetry
1. **Add quality metrics dashboard** to track these issues over time
2. **Implement alerting** when fallback rates exceed thresholds
3. **Create regression tests** for these specific scenarios

----**Role/Scope**
Lead Developer is the right fit for this task (no handoff needed).  
I loaded the required docs (`AGENTS.md`, coding/testing guidelines, current status) and traced the pipeline code + prompt profile used at runtime.

**Findings (root causes + fixes)**

1. **Classification fallbacks are mostly prompt-schema drift (critical)**
- Runtime prompt profile `apps/web/prompts/orchestrated.prompt.md:476` (`EXTRACT_EVIDENCE`) does not instruct `sourceAuthority`, `evidenceBasis`, `probativeValue` output.
- Extraction schema expects those fields but currently optional: `apps/web/src/lib/analyzer/orchestrated.ts:6103`, `apps/web/src/lib/analyzer/orchestrated.ts:6124`, `apps/web/src/lib/analyzer/orchestrated.ts:6126`, `apps/web/src/lib/analyzer/orchestrated.ts:6130`.
- Your 2 jobs: `evidenceBasis` fallbacks were `12/44` and `10/52` evidence items (27.3% and 19.2%).
- Broader scan (last 120 succeeded orchestrated jobs): `evidenceBasis` fallback total = `189` (docs target is <5% fallback: `Docs/ARCHITECTURE/Evidence_Quality_Filtering.md:1245`).
- **Fix**:
  - Update orchestrated prompt sections to require those fields explicitly (prompt edit; needs your explicit approval per AGENTS rules).
  - Then tighten schema/output validation and add regression checks for missing classification fields.

2. **Verdict direction auto-correction can produce wrong flips (critical)**
- `claimDirection` is defined relative to the **original user claim** (`apps/web/src/lib/analyzer/types.ts:477`), but direction validation runs per **sub-claim verdict** using those evidence directions (`apps/web/src/lib/analyzer/orchestrated.ts:3482`, `apps/web/src/lib/analyzer/orchestrated.ts:3509`).
- Auto-correct is always enabled in all verdict paths (`apps/web/src/lib/analyzer/orchestrated.ts:8009`, `apps/web/src/lib/analyzer/orchestrated.ts:8596`, `apps/web/src/lib/analyzer/orchestrated.ts:9306`).
- That mismatch is why SC16 got pulled from 38% to 65% despite contested reasoning.
- Warning text is also misleading: message always reports “% contradicts” even when evidence majority is supportive (`apps/web/src/lib/analyzer/orchestrated.ts:3592`).
- **Fix**:
  - Immediate: disable auto-correction (warning-only) and fix warning text/details.
  - Proper: replace with claim-specific LLM direction validation (batched), not original-claim `claimDirection`.

3. **Grounding warnings are inflated by missing citations + lexical matching limits (high)**
- `supportingEvidenceIds` is optional/catch-fallback in verdict schemas (`apps/web/src/lib/analyzer/orchestrated.ts:6780`, `apps/web/src/lib/analyzer/orchestrated.ts:6819`, `apps/web/src/lib/analyzer/orchestrated.ts:6912` etc.).
- Job 1 had `5/15` claims with empty citations; recent 120-job scan shows `28.6%` of claims without citations.
- Grounding uses term extraction + substring checks (`apps/web/src/lib/analyzer/grounding-check.ts:213`) and warns below 0.3 (`apps/web/src/lib/analyzer/grounding-check.ts:231`), which is brittle on paraphrases.
- **Fix**:
  - Add structural citation hydration from reasoning citations (e.g., `Sx-Ey`) when `supportingEvidenceIds` is empty.
  - Move grounding scoring to LLM adjudication (batched), keep deterministic checks only for structural validation.
  - Make grounding thresholds UCM-configurable.

4. **Prompt observability is incomplete (medium)**
- Prompt hash is loaded/tracked in pipeline (`apps/web/src/lib/analyzer/orchestrated.ts:10132`) but not included in result `meta` (`apps/web/src/lib/analyzer/orchestrated.ts:11895`).
- In DB, all succeeded orchestrated jobs had `PromptContentHash = null`.
- **Fix**:
  - Persist prompt hash/loaded timestamp into result meta and Jobs table fields for postmortem traceability.

**Recommended implementation order**
1. Disable direction auto-correct + fix message payload + add citation hydration.
2. Prompt profile alignment for extraction fields (with your approval).
3. LLM-based claim-direction validation + LLM grounding adjudication (batched).
4. Add telemetry gates: fallback rate, no-citation rate, grounding ratio, direction-mismatch rate.

If you want, I can implement step 1 now (code-only, no prompt edits), then prepare a separate prompt-change patch for your explicit approval.


