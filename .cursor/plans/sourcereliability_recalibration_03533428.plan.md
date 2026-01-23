---
name: SourceReliability recalibration
overview: Diagnose why several domains are scoring too high and adjust SourceReliability so the negative-side scores are systematically lower (while preserving positive-side scores), using evidence-grounded evaluation and “better founded” multi-model combination—without hardcoding specific domains.
todos:
  - id: sr-eval-grounding
    content: Add optional web-search grounding to `apps/web/src/app/api/internal/evaluate-source/route.ts` using `apps/web/src/lib/web-search.ts` and inject results into the evaluation prompt.
    status: completed
  - id: sr-eval-schema-rubric
    content: Tighten the evaluation JSON contract and prompt rubric (sourceType + evidenceQuality) to avoid “mixed” score inflation and to push structurally low-reliability sources (e.g., UGC platforms) lower without affecting high-quality publishers.
    status: completed
  - id: sr-consensus-conservative
    content: Implement “better founded” multi-model selection (citations+recency to the provided evidence pack; tie-breaker=lower score) and update `apps/web/src/app/api/internal/evaluate-source/evaluate-source.test.ts`.
    status: completed
  - id: sr-docs-refresh
    content: Update `Docs/ARCHITECTURE/Source_Reliability.md` to reflect the grounded evaluation + “better founded” consensus; document how to re-evaluate cached domains.
    status: completed
isProject: false
---

# SourceReliability score recalibration

## Goal

- **Primary**: Move the **negative side** of SourceReliability scores lower (i.e., reduce “too generous” ratings for low-reliability domains), while keeping the **positive side** broadly stable.
- **Constraints**: Generic-by-design (no domain hardcoding), and defer cache/threshold unification during POC.

## What’s going wrong (root causes)

- **LLM is asked to “search/consult” external raters, but no evidence is actually retrieved.** In [`apps/web/src/app/api/internal/evaluate-source/route.ts`](apps/web/src/app/api/internal/evaluate-source/route.ts) `getEvaluationPrompt()` contains “SEARCH/CONSULT …” lines, but `evaluateWithModel()` always calls `getEvaluationPrompt(domain)` with `hasWebSearch=false` and does not inject any real search results. This makes the model rely on memory/hallucinations, often with **inflated confidence**.
- **Config inconsistency can let weaker evaluations persist in cache (defer in POC).** The analyzer defaults `FH_SR_CONFIDENCE_THRESHOLD` to **0.8** in [`apps/web/src/lib/analyzer/source-reliability.ts`](apps/web/src/lib/analyzer/source-reliability.ts), but the admin evaluator defaults to **0.65** in [`apps/web/src/app/api/admin/source-reliability/route.ts`](apps/web/src/app/api/admin/source-reliability/route.ts). This can store “too generous” results that then get reused.
- **Consensus averaging is optimistic.** In [`apps/web/src/app/api/internal/evaluate-source/route.ts`](apps/web/src/app/api/internal/evaluate-source/route.ts) scores are averaged when within threshold; for borderline sources this nudges scores upward compared to a “conservative” policy.

## Proposed solution (generic, no domain hardcoding)

### 1) Ground the evaluation with real web-search evidence (when available)

- Reuse the existing search subsystem in [`apps/web/src/lib/web-search.ts`](apps/web/src/lib/web-search.ts) (+ `search-serpapi.ts` / `search-google-cse.ts`).
- In [`apps/web/src/app/api/internal/evaluate-source/route.ts`](apps/web/src/app/api/internal/evaluate-source/route.ts):
  - Add a small **evidence retrieval step**: run 3–5 query templates such as:
    - `"<domain> reliability"`, `"<domain> fact check"`, `"<domain> misinformation"`, `"<domain> propaganda"`, `"<domain> corrections policy"`
  - Include top N results (title + snippet + URL) into the LLM prompt and require the model to cite them.
  - Make it **feature-gated** (e.g., `FH_SR_EVAL_USE_SEARCH=true` defaulting to true only if `FH_SEARCH_ENABLED` and a provider is configured).

### 2) Make the prompt “negative-calibrated” (reduce “mixed” inflation)

- Update the JSON contract in [`apps/web/src/app/api/internal/evaluate-source/route.ts`](apps/web/src/app/api/internal/evaluate-source/route.ts) to include:
  - `sourceType`: `editorial_publisher | wire_service | government | state_media | platform_ugc | advocacy | aggregator | unknown`
  - `evidenceQuality`: e.g. `independentAssessmentsCount`, `recencyWindowUsed`, `highVisibilityFailuresCount`
  - Keep `score/confidence`, but instruct (explicitly asymmetric intent):
    - **Do not use “mixed (0.43–0.57)” as a safe default** for structurally low-reliability source types (especially `platform_ugc`). If the domain is primarily an open UGC platform, the *domain-as-a-source* reliability should generally fall below the mixed band unless evidence shows strong editorial verification at the domain level.
    - For `editorial_publisher` / `wire_service`, allow high scores as before when supported by evidence.
    - When evidence is thin/conflicting, prefer **lowering the score** (not “pulling toward 0.5”) and record the limitation in `caveats`.
    - Require `evidenceCited` to reference the provided evidence pack (not general memories); uncited claims must be framed as caveats.

### 3) “Better founded” multi-model combination (not simple averaging)

- In [`apps/web/src/app/api/internal/evaluate-source/route.ts`](apps/web/src/app/api/internal/evaluate-source/route.ts):
  - When consensus is achieved, choose the score that is **better founded** by the evidence pack:
    - Prefer the model output with **more citations** to evidence-pack items AND more **recent/independent** items referenced.
    - Tie-breaker: choose the **lower** score (skeptical default).
  - Update [`apps/web/src/app/api/internal/evaluate-source/evaluate-source.test.ts`](apps/web/src/app/api/internal/evaluate-source/evaluate-source.test.ts) accordingly.

### 4) Operational follow-through

- After code changes, use the existing admin UI (`/admin/source-reliability`) “Re-evaluate existing domains” to refresh the cached entries.
- Update architecture docs to match reality (evidence pack + “better founded” combine): [`Docs/ARCHITECTURE/Source_Reliability.md`](Docs/ARCHITECTURE/Source_Reliability.md).

## Dataflow after changes

```mermaid
flowchart TB
  AdminOrAnalyzer --> Prefetch
  Prefetch --> Cache[(source-reliability.db)]
  Prefetch -->|cache_miss_or_invalid| EvalAPI[/api/internal/evaluate-source]
  EvalAPI -->|optional| WebSearch[web-search.ts]
  WebSearch --> EvalAPI
  EvalAPI --> LLM1[Claude]
  EvalAPI --> LLM2[GPT]
  LLM1 --> Combine[BetterFoundedCombine]
  LLM2 --> Combine
  Combine --> Cache
  Cache --> Prefetch
```

## Implementation state (2026-01-23)

### Shipped behavior changes

- **Evidence pack grounding**: `/api/internal/evaluate-source` now optionally performs web search and injects a bounded evidence pack into the prompt. This reduces “memory-based” inflation in the negative bands.
  - **Controls**: `FH_SR_EVAL_USE_SEARCH` (default `true`) and a configured search provider.
- **Negative-calibrated rubric**: prompt guidance explicitly prevents defaulting to “mixed” for structurally low-reliability source types (especially open UGC platforms).
- **Better-founded consensus**: when models agree within threshold, the final score is chosen by which output is better grounded to the evidence pack; tie-breaker is the lower score.

### Code changes

- `apps/web/src/app/api/internal/evaluate-source/route.ts`
  - Added evidence pack retrieval via `@/lib/web-search`
  - Updated prompt to include evidence pack + negative calibration
  - Implemented foundedness-based “winner” selection (vs averaging)
- `apps/web/src/app/api/internal/evaluate-source/evaluate-source.test.ts`
  - Updated consensus expectations for better-founded selection
- `Docs/ARCHITECTURE/Source_Reliability.md`
  - Documented evidence-pack evaluator env vars and better-founded consensus

### New/used environment variables (POC)

- `FH_SR_EVAL_USE_SEARCH` (default `true`)
- `FH_SR_EVAL_MAX_EVIDENCE_ITEMS` (default `8`)
- `FH_SR_EVAL_SEARCH_MAX_RESULTS_PER_QUERY` (default `5`)
- `FH_SR_EVAL_SEARCH_DATE_RESTRICT` (optional `y|m|w`; falls back to `FH_SEARCH_DATE_RESTRICT`)

### How to apply to existing cached domains

- Use `/admin/source-reliability` → **Evaluate Domains** with **Re-evaluate existing domains** checked (or delete entries and re-run analysis).

### Tests run

- `cd apps/web && npm test -- src/app/api/internal/evaluate-source/evaluate-source.test.ts`

