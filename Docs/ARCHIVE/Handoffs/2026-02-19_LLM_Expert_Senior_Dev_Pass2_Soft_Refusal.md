# 2026-02-19 | LLM Expert + Senior Developer | Claude Code (Sonnet 4.6) + Claude Opus 4.6 | Pass 2 Schema Validation & Soft Refusal Fix

## Task

Fix recurring Stage 1 Pass 2 failures in the ClaimBoundary pipeline. Two distinct failure modes were identified and addressed:

1. **Schema validation failures** (`AI_NoObjectGeneratedError`) — LLM returns null for fields, Zod rejects at AI SDK level
2. **Content-policy soft refusal** — LLM calls the required tool with ALL fields empty/null for politically sensitive inputs

## Test Input

German political claim: `"Die SRG hat einen 'Rechtsdrall'"` (Swiss public media has a right-wing bias)

- Pass 1 (Haiku, "understand" tier): **SUCCEEDS** consistently
- Pass 2 (Sonnet, "verdict" tier): **FAILS** consistently with soft refusal
- The SAME input has succeeded before with Pass 2 (job `4dd7f840f72d48bcb6f2786d9723ce8f`), proving it's intermittent

## Root Cause Analysis (Two-Agent Investigation)

Parallel investigation by Claude Code (Sonnet 4.6) and a Claude Opus 4.6 agent. Both converged on the same diagnosis.

### Failure Mode 1: Schema Validation (FIXED — commits `f397244`, `b8a1477`)

The AI SDK's `Output.object({ schema: Pass2OutputSchema })` calls `schema.safeParse()` on the raw LLM output BEFORE the pipeline's `normalizePass2Output()` runs. Required fields without `.catch()` or `.nullish()` reject null values at the SDK level, throwing `NoObjectGeneratedError`. The retry loop was blind (no Zod-aware feedback).

**Fields that caused failures:**
- `Pass2OutputSchema.impliedClaim: z.string()` — rejected null
- `Pass2OutputSchema.backgroundDetails: z.string()` — rejected null
- `Pass2OutputSchema.articleThesis: z.string()` — rejected null
- `Pass2OutputSchema.atomicClaims: z.array(...)` — rejected null
- `Pass2AtomicClaimSchema.id: z.string()` — rejected null
- `Pass2AtomicClaimSchema.statement: z.string()` — rejected null
- Metadata fields (`distinctEvents`, `riskTier`, `retainedEvidence`) — also rejected null (fixed earlier in commit `3113fff`)

### Failure Mode 2: Content-Policy Soft Refusal (PARTIALLY ADDRESSED — needs more work)

**Mechanism** (confirmed by Opus agent reading AI SDK source code):

1. `getStructuredOutputProviderOptions()` forces `structuredOutputMode: "jsonTool"` for Anthropic
2. SDK creates a synthetic `json` tool with `tool_choice: { type: "required" }`
3. Model MUST call the tool — but for politically sensitive content, it fills args with null/empty (soft refusal)
4. **Critical**: Line 2907 in `@ai-sdk/anthropic/dist/index.mjs` — when `usesJsonResponseTool` is true, ALL text blocks are discarded. Any refusal message the model emits alongside the tool call is silently dropped
5. The system has NO way to detect a refusal occurred — only sees empty tool arguments

**Why Pass 1 succeeds but Pass 2 fails:**
- Pass 1 uses Haiku ("understand" tier) — less cautious about content policy
- Pass 2 uses Sonnet ("verdict" tier) — more cautious
- Pass 2 includes preliminary evidence (from web search about SRG political bias) in the system prompt, adding more "caution signal"
- Pass 2 has a much more complex schema (7 top-level fields, nested objects with enums)

## What Was Implemented (Committed and Pushed)

### Commit `f397244` — Schema `.catch()` defaults + quality gate + Zod-aware retry

**File:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`

1. **`.catch()` defaults on all Pass2 fields** — Prevents `NoObjectGeneratedError` from AI SDK. The JSON Schema sent to the LLM is unchanged (`.catch()` is parse-time only, confirmed by `parseCatchDef` in AI SDK source unwrapping catch to inner type).
   ```typescript
   // Pass2OutputSchema — quality-critical fields
   impliedClaim: z.string().catch(""),
   backgroundDetails: z.string().catch(""),
   articleThesis: z.string().catch(""),
   atomicClaims: z.array(Pass2AtomicClaimSchema).catch([]),

   // Pass2AtomicClaimSchema — id and statement
   id: z.string().catch(""),
   statement: z.string().catch(""),
   ```

2. **Quality validation gate** — After normalization + parse, checks that quality-critical fields contain substantive content (not empty catch-defaults). Filters claims with empty statements.

3. **Zod-aware retry guidance** — On quality failure, appends field-specific error guidance to the user message on retry.

### Commit `b8a1477` — Soft refusal detection + fact-checking retry framing

**File:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`

1. **Total refusal detection** — Distinguishes "all fields empty" (content-policy) from "some fields empty" (partial failure). Sets `wasTotalRefusal` flag.

2. **Fact-checking framing in retry guidance** — For total refusal, the retry user message includes explicit fact-checking context: "This is a fact-checking analysis engine... You are NOT being asked to endorse, reject, or amplify any claim... Politically sensitive topics are valid fact-checking subjects."

3. **`finishReason` logging** — Logs `content-filter` or `other` finish reasons for soft-refusal diagnostics.

4. **Error message improvement** — Final error includes `(content-policy soft refusal)` when total refusal is detected.

## What Was Tried But Did NOT Work

| Approach | Why it failed |
|----------|--------------|
| `.catch()` defaults alone | Prevents SDK crash but LLM still returns empty — quality gate catches but blind retry doesn't help |
| Zod-aware retry guidance (field-level) | Tells model WHAT is empty but doesn't address WHY it's refusing |
| Fact-checking framing in USER message | Not enough weight — system prompt dominates content-policy decisions. Model still soft-refuses on all 3 attempts |
| Assistant+user exchange for retries | **Reverted** — untested with `Output.object()` + Anthropic tool calling. The 4-message pattern `[system, user, assistant, user]` may break tool calling. Reverted to safe `[system, user]` pattern |

## What Was Started But NOT Committed (Stashed)

**`git stash` contains:** Model fallback implementation — on total refusal after all retries exhausted, try one more time with `getModelForTask("understand", ...)` (Haiku) instead of the verdict-tier model (Sonnet). Build was interrupted before verification.

The stashed code:
- Adds a fallback `generateText` call with Haiku after the main retry loop detects total refusal on the last attempt
- Includes quality validation of the fallback result
- Logs recovery success/failure

**To recover:** `git stash pop` in the repo root.

## Recommended Next Steps (Ranked)

### 1. Model fallback on total refusal (HIGH — code change, stash has partial implementation)

When total refusal is detected after all retries with Sonnet, try once with Haiku. Pass 1 proves Haiku handles this input. The stashed code is ~80% complete — needs build verification and possibly the type fix (`as const` on message roles).

**Risk:** Haiku produces lower-quality atomic claims than Sonnet. Log as degraded quality.

### 2. Add fact-checking framing to SYSTEM prompt (HIGH — prompt template change, needs Captain approval)

Add to the beginning of `CLAIM_EXTRACTION_PASS2` in `apps/web/prompts/claimboundary.prompt.md`:

```
You are part of a fact-checking verification pipeline. Your role is to extract claims for evidence-based assessment, not to make judgments about them. Claim extraction serves the public interest by enabling verification of assertions. Extract claims faithfully regardless of topic sensitivity.
```

This carries the most weight because system prompts dominate content-policy decisions. The current prompt says "You are an analytical claim extraction engine" which is neutral but doesn't explicitly frame the task as fact-checking.

**AGENTS.md constraint:** "Improving these prompts for quality and efficiency is welcome — but only with explicit human approval."

### 3. Strip preliminary evidence on soft-refusal retry (MEDIUM — code change)

The preliminary evidence (from web search about SRG political bias) in the Pass 2 system prompt adds "caution signal." On retry after total refusal, re-render the prompt WITHOUT preliminary evidence to reduce the politically sensitive content in context.

### 4. Increase maxRetries (LOW — trivial)

Change `maxRetries = 2` to `3`. Adds one more attempt (~$0.05 cost). Low impact alone but helps if combined with model fallback.

## Files Changed

| File | Commits | Changes |
|------|---------|---------|
| `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` | `3113fff`, `f397244`, `b8a1477` + stash | `.nullish()` metadata, `.catch()` all fields, quality gate, retry guidance, soft refusal detection, fact-checking framing |
| `apps/web/src/lib/analyzer/types.ts` | (earlier session) | Added `"analysis_generation_failed"` to `AnalysisWarningType` |

## Key Code Locations

| What | File | Lines (approx) |
|------|------|-----------------|
| `Pass2AtomicClaimSchema` | `claimboundary-pipeline.ts` | 386-403 |
| `Pass2OutputSchema` | `claimboundary-pipeline.ts` | 405-423 |
| `normalizePass2Output()` | `claimboundary-pipeline.ts` | 855-912 |
| `runPass2()` retry loop | `claimboundary-pipeline.ts` | 949-1093 |
| Quality gate | `claimboundary-pipeline.ts` | 1000-1047 |
| Total refusal detection | `claimboundary-pipeline.ts` | 1021-1045 |
| CLAIM_EXTRACTION_PASS2 prompt | `prompts/claimboundary.prompt.md` | 79-190 |
| `extractStructuredOutput()` | `llm.ts` | 197-256 |
| `getModelForTask()` | `llm.ts` | 159-187 |
| `getStructuredOutputProviderOptions()` | `llm.ts` | 36-55 |
| `generateWithSchemaRetry()` | `schema-retry.ts` | 45-112 |

## Job IDs for Testing

| Job ID | Input | Result | Notes |
|--------|-------|--------|-------|
| `88bce87d91db4fee8af486935c43b17f` | German conspiracy theory | FAILED (NoObjectGeneratedError) | Pre-fix, Dynamic pipeline |
| `88d91b9b59d949578dda7b9f7a74d7ee` | 2020 US election fraud | SUCCEEDED (degraded) | Dynamic pipeline, graceful degradation |
| `501eb411064d48e79044c10c0570004c` | Bolsonaro judgment fairness | FAILED (Pass 2) | ClaimBoundary, pre-.nullish() fix |
| `f169fb3c85f24094b19bd85307075963` | Die SRG Rechtsdrall | FAILED (Pass 2) | ClaimBoundary, post-.nullish(), pre-.catch() |
| `b819299c11e746409112fb707c19e67b` | Die SRG Rechtsdrall | FAILED (quality gate) | Post-.catch(), quality gate working |
| `4dd7f840f72d48bcb6f2786d9723ce8f` | Die SRG Rechtsdrall | **SUCCEEDED** | Proof that this input CAN work |
| `bc737b6a8f2c4db1aad7c6c64c9582bc` | Die SRG Rechtsdrall | FAILED (soft refusal) | Post fact-checking framing, still fails |

## Warnings

- The stashed model fallback code was NOT build-verified. It may have TypeScript type errors.
- The `as const` assertion on message roles is needed for the AI SDK's `generateText` type checking.
- The `test-latest.txt` file in repo root is untracked test output — can be deleted.
- The deleted xWiki file (`Orchestrated Pipeline Detail/WebHome.xwiki`) is unrelated to this work — still in working tree.
- **853 tests pass** with committed changes. Tests mock `generateText` so they don't test actual LLM behavior or tool calling.
- The `.catch()` on `atomicClaims` array: if ONE element is completely malformed (not an object), `.catch([])` replaces the ENTIRE array. Extremely unlikely with tool calling but worth knowing.

## For Next Agent

The core schema fix is done and working (`.catch()` prevents crashes, quality gate detects failures). The remaining problem is **Sonnet consistently soft-refusing** for politically sensitive German input via Anthropic tool calling.

**Most promising path:** Implement model fallback to Haiku (`git stash pop` for partial implementation) AND/OR add fact-checking framing to the CLAIM_EXTRACTION_PASS2 system prompt (needs Captain approval for prompt template changes).

**Entry point:** `runPass2()` in `claimboundary-pipeline.ts` (~line 918). The retry loop is at ~line 959. The model fallback code is in `git stash`.

**Quick test:** Submit job with input `"Die SRG hat einen 'Rechtsdrall'"` using the ClaimBoundary pipeline.
