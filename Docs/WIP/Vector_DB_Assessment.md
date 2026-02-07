# Vector Database Assessment for Shadow Mode

Date: 2026-02-02
Owner: FactHarbor Engineering
Status: Draft

## Summary

Vector search is not required to deliver the core Shadow Mode value described in `Docs/WIP/Shadow_Mode_Architecture.md`, but it can improve similarity detection and clustering beyond exact text-hash matches. The current architecture is SQLite-first with offline analysis and async logging; vectors should remain optional and offline to preserve performance and pipeline determinism.

The best plug-in point is the text-analysis service layer (`apps/web/src/lib/analyzer/text-analysis-llm.ts` and `apps/web/src/lib/analyzer/text-analysis-service.ts`) because it centralizes the LLM classification calls used by orchestrated and monolithic pipelines. This keeps Shadow Mode generic and avoids domain-specific prompt tuning that would violate AGENTS.md rules.

## Current Components and Hooks

- Analysis pipelines: `apps/web/src/lib/analyzer/orchestrated.ts` and `apps/web/src/lib/analyzer/monolithic-canonical.ts`.
- LLM classification entry points: `apps/web/src/lib/analyzer/text-analysis-llm.ts` (`classifyInput`, `assessEvidenceQuality`, `analyzeScopeSimilarity`, `validateVerdicts`).
- Evidence metadata and terminology: `apps/web/src/lib/analyzer/types.ts` (AnalysisContext vs EvidenceScope separation).
- Existing SQLite cache patterns: `apps/web/src/lib/source-reliability-cache.ts` (TTL, migration patterns).
- Shadow Mode design: `Docs/WIP/Shadow_Mode_Architecture.md` (ClassificationLog, offline analysis, A/B testing).

## Where Vectors Fit

Vectors add value for approximate similarity:
- Consistency Analyzer: group paraphrases and near-duplicates rather than exact `textHash` matches.
- Edge Case Detector: cluster low-confidence or human-flagged cases to find recurring patterns.
- Prompt Element Mapper: retrieve cases similar to a prompt example to evaluate effectiveness without hardcoded domain terms.
- A/B Testing: assemble representative corpora by clustering embeddings to avoid skewed samples.

Vectors should NOT replace deterministic caching (exact hash or canonical text) or the existing quality gates.

## Risks and Guardrails

- Do not add domain-specific terms or test-case phrases into prompts or generated examples.
- Preserve terminology: use "context" for AnalysisContext and "evidenceScope" for source metadata.
- Embeddings are not facts; they are only retrieval aids for offline analysis.
- Keep vector search off the critical path to honor NFR1 (minimal performance impact).
- Ensure PII safety: embedding raw text can leak content. Prefer redaction or short snippets, and keep full text hashed.

## Short-Term Recommendations

1. Implement Phase 1 logging in SQLite as specified in `Docs/WIP/Shadow_Mode_Architecture.md`.
   - Add `ClassificationLog` table with `promptVersionHash` and `textHash`.
   - Wire logging in the text-analysis service layer to cover all pipelines.

2. Add a basic "near-duplicate" detector without a vector DB.
   - Use lightweight normalization and n-gram overlap in offline analysis to validate the value of similarity grouping.

3. Define a Shadow Mode analysis job runner that reads SQLite logs and generates proposals.
   - Keep this fully offline and separate from production analysis.

## Long-Term Recommendations

1. Introduce an optional embeddings store for offline analysis only.
   - Store vectors for `textSnippet` or canonicalized claim text plus metadata.
   - Keep lookups scoped by `analysisPoint` and `promptVersionHash` to avoid cross-version noise.

2. Add clustering-based tooling in the Shadow Mode analyzer.
   - Use clusters to propose prompt adjustments and identify missing decision branches.
   - Ensure all recommendations are generic and evidence-backed, consistent with AGENTS.md.

3. Extend A/B testing to use cluster-stratified sampling.
   - Avoid overfitting prompt changes to narrow topics by ensuring coverage across clusters.

## Decision Criteria

Proceed with vectors only if:
- The offline analyzers show a meaningful volume of near-duplicate or paraphrased cases that are not captured by `textHash`.
- The incremental lift in edge case detection justifies additional storage and operational complexity.

If the above is not met, stay SQLite-only and invest in stronger prompt evaluation and A/B testing discipline.
