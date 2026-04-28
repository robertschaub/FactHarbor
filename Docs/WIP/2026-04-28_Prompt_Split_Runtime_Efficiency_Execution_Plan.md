# Prompt Split and LLM Runtime Efficiency Execution Plan

**Date:** 2026-04-28  
**Status:** Ready for implementation planning; no prompt behavior approved yet  
**Roles:** Lead Developer, LLM Expert  
**Supersedes / extends:** `Docs/ARCHIVE/2026-04-20_Prompt_Split_Plan.md`, `Docs/WIP/2026-04-20_Token_Reduction_Chunking_Debate_Consolidated.md`  
**Related backlog:** `PROMPT-SPLIT-1`

---

## 1. Decision

Reopen the prompt split work now, but do not start by physically splitting `claimboundary.prompt.md`.

The first executable work should be a telemetry and design slice that makes prompt context, cache boundaries, and retry causes measurable. Physical splitting follows only after the manifest, UCM, provenance, and admin behavior are specified and covered by tests.

This preserves the April 20 decision for agent ergonomics while recognizing that the prompt has grown from roughly 212KB / 53K estimated tokens to roughly 294KB / 84K estimated tokens, close to the previous 300KB reopen trigger.

---

## 2. Problem Separation

There are two related but different context problems.

| Problem | Current state | Correct lever |
|---|---|---|
| Agent development context | Large prompt file is expensive to inspect during coding sessions. | Targeted reads remain valid; physical split improves maintainability once design is ready. |
| Production LLM context | Runtime calls often combine stable instructions and dynamic payloads inside cache-controlled system messages. | Static/dynamic prompt separation, cache-boundary telemetry, and retry prevention. |

Physical file splitting helps agents and maintainability. It does not by itself reduce runtime tokens, latency, or retries.

---

## 3. Existing Telemetry To Reuse

Do not create a parallel metrics system for the first slice. Reuse and extend the existing surfaces:

1. `apps/web/src/lib/analyzer/metrics.ts`
   - `LLMCallMetric` already records task type, provider, model, prompt tokens, completion tokens, duration, success, schema compliance, retry count, cache read tokens, cache creation tokens, and parse-failure artifacts.
   - Extend this contract with prompt-context diagnostics instead of adding a new top-level mechanism.

2. `apps/web/src/lib/analyzer/metrics-integration.ts`
   - `runWithMetrics(...)` uses `AsyncLocalStorage` for per-job metric isolation.
   - Final-job LLM telemetry should continue flowing through `recordLLMCall(...)`.

3. `apps/api/Controllers/MetricsController.cs`
   - `AnalysisMetrics.MetricsJson` already persists the full metrics payload per job.
   - Query endpoints already support metrics inspection without schema migrations for every JSON-field addition.

4. `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
   - `buildClaimBoundaryResultJson(...)` already exposes diagnostic-only final-job observability through `analysisObservability.acsResearchWaste`.
   - Use the same pattern for a compact `analysisObservability.promptRuntime` summary if job-local diagnosis needs data that is awkward to query from `AnalysisMetrics`.

5. `apps/web/src/lib/analyzer/research-waste-metrics.ts`
   - Yesterday's ACS research-waste telemetry is a good pattern: diagnostic-only, sanitized, persisted, and explicitly non-behavioral.
   - Do not mix prompt-runtime metrics into `researchWasteMetrics`; create a separate prompt-runtime metrics helper if final-job JSON needs a summary.

6. Draft preparation observability
   - `ClaimSelectionDraftState.observability` already carries draft preparation timings.
   - If Stage 1 draft-prep retry cost must be visible before final job creation, extend this existing draft observability rather than creating a separate draft telemetry store.

---

## 4. Execution Phases

### Phase 1 — Prompt Runtime Telemetry, No Behavior Change

Goal: make context/caching/retry waste measurable on final jobs and, where feasible, ACS draft preparation.

Add or verify per LLM call:

| Field | Purpose |
|---|---|
| `promptProfile` | Usually `claimboundary`; connects metrics to UCM profile. |
| `promptSection` | Exact section rendered, e.g. `EXTRACT_EVIDENCE`, `CLAIM_EXTRACTION_PASS2`. |
| `promptContentHash` | Active composite/current hash. |
| `promptSectionHash` | Section-local hash, computed from the unrendered section template. |
| `renderedSystemChars` / `renderedSystemEstimatedTokens` | Size of cache-controlled instructions actually sent. |
| `dynamicPayloadChars` / `dynamicPayloadEstimatedTokens` | Approximate dynamic input size included in the call. |
| `cacheReadInputTokens` / `cacheCreationInputTokens` | Already supported; ensure call sites pass provider usage fields when available. |
| `retryCause` | Structural category: schema, parse, timeout, contract, repair, provider, validation, unknown. |
| `retryBranch` | Stage-specific branch name, e.g. Pass 2 retry, contract validation retry, repair validation. |
| `outputBranch` | Initial, retry, repair, fallback, or failed. |

Implementation notes:

- Start by extending `LLMCallMetric`; keep fields optional for backward compatibility.
- Add a small helper near metrics integration or prompt loading to compute estimated tokens and section hashes.
- Avoid storing raw prompt text or raw source payload in metrics.
- Use structural retry categories only; do not classify semantic meaning with deterministic code.

Acceptance:

- Safe tests pass for touched metrics/helper code.
- Existing persisted metrics still parse.
- A mock LLM unit test can assert that a call records section name, hashes, token estimates, and retry cause without invoking a real provider.
- No prompt text, model selection, retry policy, or analysis behavior changes.

### Phase 2 — Prompt Manifest Design

Goal: specify the physical split contract before moving files.

Design decisions to document and test before implementation:

1. Manifest shape
   - Deterministic section order.
   - Required sections list.
   - Per-section file path.
   - Composite canonical content used for hashing.

2. Hash behavior
   - Preserve one composite prompt hash for job provenance and `/prompt-diagnosis`.
   - Add optional section hashes for diagnosis and targeted invalidation.
   - Keep canonicalization equivalent to the current single-file prompt.

3. UCM/admin behavior
   - Keep the active prompt profile concept as `prompt|claimboundary`.
   - Treat split files as source layout, not separate admin profiles, unless section-level admin editing is explicitly approved later.
   - Admin diff/export can initially operate on the generated composite content plus a section list.

4. Prepared Stage 1 provenance
   - Prepared snapshots should fail closed on Stage 1-relevant prompt changes.
   - Avoid invalidating a prepared Stage 1 snapshot because an unrelated Stage 4 or Stage 5 section changed.
   - Define a Stage 1 subset hash before changing invalidation behavior.

Acceptance:

- Manifest design reviewed before code migration.
- Byte-for-byte rendered section equivalence tests planned for the current monolithic file vs manifest-generated composite.
- No section-level admin editing until explicitly approved.

### Phase 3 — Static/Dynamic Prompt Separation

Goal: improve production LLM cache efficiency by keeping stable instructions stable.

Current risk:

- Many calls render large dynamic JSON/source/evidence payloads into the system message.
- The system message is the place where Anthropic prompt caching is enabled.
- If dynamic payloads change every call, cacheable content changes too.

Target design:

- Keep UCM-managed instructions in stable system sections.
- Move dynamic claim/source/evidence/job payloads into user messages or explicit non-cache-controlled payload sections where safe.
- Preserve the existing `loadAndRenderSection(...)` API until the new contract is proven.
- Consider a new loader return shape only after the first call family validates the pattern:

```ts
{
  system: RenderedPromptPart;
  user: RenderedPromptPart;
  provenance: {
    profile: string;
    compositeHash: string;
    sectionHashes: Record<string, string>;
  };
}
```

First candidates:

1. `EXTRACT_EVIDENCE`
2. `CLAIM_EXTRACTION_PASS2`
3. `CLAIM_CONTRACT_VALIDATION`
4. `VERDICT_ADVOCATE`
5. `VERDICT_RECONCILIATION`

Acceptance:

- Prompt output behavior is unchanged except for message placement.
- Provider cache-read/cache-creation metrics improve on repeated comparable calls.
- No prompt wording changes are bundled into the first separation slice.

### Phase 4 — Physical Prompt Split

Goal: split files after the manifest/provenance contract is stable.

Likely file layout:

```text
apps/web/prompts/claimboundary/
  manifest.json
  stage1-understand.prompt.md
  stage2-research.prompt.md
  stage3-boundary.prompt.md
  stage4-verdict.prompt.md
  stage5-aggregation-report.prompt.md
```

Constraints:

- `loadAndRenderSection("claimboundary", section, vars)` must keep working.
- `seedPromptFromFile("claimboundary")` or its replacement must produce the same composite hash semantics.
- `prompt-frontmatter-drift` coverage must be replaced or extended, not removed.
- Reseed scripts and deployment packaging must include all split files.
- Existing `/prompt-diagnosis` can still recover the runtime prompt by composite hash.

Acceptance:

- Monolith-to-manifest equivalence test passes before any prompt wording edits.
- Reseed and config activation tests pass.
- Admin prompt provenance still shows one active composite prompt version.

### Phase 5 — Retry Prevention

Goal: reduce costly repeated LLM calls without deleting safety checks.

Principles:

- Do not remove retries just because they are expensive.
- Classify retries first, then prevent the common preventable causes.
- Keep retries for genuine provider/schema/transient failures.
- Prompt fixes require explicit approval and must be generic and multilingual.

Likely first targets:

1. Stage 1 Pass 2 contract retry
   - Measure initial vs retry vs repair branch frequency.
   - Record which structural contract field failed.
   - Shorten retry context if the retry only needs the failed contract guidance.

2. Contract validation
   - Avoid repeated full-context validation if previous output is structurally unusable.
   - Batch validation where the same candidate set is being rechecked.

3. Evidence extraction
   - Measure source text vs instruction vs dynamic payload sizes.
   - Improve source text structural cleanup only where it does not make analytical decisions.

4. Verdict prompts
   - Do not filter evidence before verdict.
   - Investigate LLM summarization only after telemetry proves verdict payload size is the active bottleneck.

---

## 5. First Implementation Slice

Recommended first branch:

**Title:** Prompt Runtime Telemetry Slice 1  
**Behavior:** No analysis behavior change  
**Main files:**

- `apps/web/src/lib/analyzer/metrics.ts`
- `apps/web/src/lib/analyzer/metrics-integration.ts`
- `apps/web/src/lib/analyzer/prompt-loader.ts`
- One or two representative call sites, preferably `research-extraction-stage.ts` and one Stage 1 retry path
- Focused unit tests under `apps/web/test/unit/lib/analyzer/`

Deliverables:

1. Optional fields added to `LLMCallMetric`.
2. Helper for prompt section hash + rough token estimate.
3. A call-site wrapper or helper that records prompt profile/section/hash/size consistently.
4. Retry cause enum/type using structural categories.
5. Tests proving old metrics remain valid and new metrics are recorded.

Non-goals:

- No prompt wording edits.
- No physical file split.
- No new LLM calls.
- No live validation batch.
- No model/provider policy changes.
- No deterministic semantic classification.

Verification:

```powershell
npm -w apps/web run test -- --run apps/web/test/unit/lib/analyzer/<new-focused-test>.test.ts
npm -w apps/web run build
```

Run full `npm test` only if the touched tests or build surface suggests broader risk. Do not run expensive LLM suites for this telemetry-only slice.

---

## 6. Approval Gates

| Gate | Required approval |
|---|---|
| Phase 1 telemetry | Captain can approve as no-behavior implementation. |
| Phase 2 manifest design | Lead Developer + LLM Expert review before coding. |
| Phase 3 static/dynamic separation | Approval required because message placement can affect model behavior. |
| Phase 4 physical split | Approval required because UCM/admin/provenance/deploy behavior changes. |
| Phase 5 prompt wording/retry policy changes | Explicit human approval required under Analysis Prompt Rules. |
| Live jobs / validation batches | Commit first, refresh runtime/config state, then run only approved Captain-defined inputs. |

---

## 7. Open Questions

1. Should prompt-runtime telemetry be exposed only through `AnalysisMetrics`, or also summarized in final `resultJson.analysisObservability.promptRuntime`?
2. Should draft preparation get its own persisted prompt-runtime summary, or is Stage 1 timing plus final-job metrics enough for the first slice?
3. Should section hashes be computed from raw unrendered section text, canonicalized markdown, or both?
4. Should the first static/dynamic separation target be Stage 2 evidence extraction or Stage 1 Pass 2?

Recommended answers for first execution:

1. Use `AnalysisMetrics` first; add final-job summary only if diagnostics remain awkward.
2. Do not extend draft state in Slice 1 unless the chosen Stage 1 retry path cannot be measured otherwise.
3. Use canonicalized unrendered section text for stable section identity; record rendered size separately.
4. Start with Stage 2 evidence extraction for lower contract risk, then Stage 1 Pass 2 after telemetry proves retry shape.

---

## 8. Ready State

The repo is ready for a small telemetry-only implementation branch. The first slice should be treated as instrumentation, not optimization. Optimization decisions should wait until the new telemetry shows which sections and retry branches dominate token cost and latency.

Before submitting live jobs after any implementation:

1. Commit the instrumentation.
2. Restart or refresh the affected runtime.
3. Confirm prompt/config hashes are current.
4. Use only Captain-approved analysis inputs.
