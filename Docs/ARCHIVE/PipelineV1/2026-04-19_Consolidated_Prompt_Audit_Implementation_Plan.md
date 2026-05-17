# Consolidated Prompt Audit Implementation Plan

**Date:** 2026-04-19  
**Status:** Proposed, not yet implemented  
**Scope:** Prompt/runtime contract cleanup after consolidated GPT + Claude Opus audit adjudication  
**Primary inputs:** `Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Consolidated_Prompt_Audit_Adjudication.md`, `Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Prompt_Audit_Schema_Contract_Findings.md`

## Goal

Resolve the highest-value prompt audit findings that survived runtime review, while avoiding work on findings that were overstated by full-file prompt-size assumptions or by prompt-only readings that ignored the live consumers.

## Consolidated decisions

1. **Do not treat `claimboundary.prompt.md` as a monolithic live prompt problem.** Production renders one section at a time via `loadAndRenderSection(...)`. The issue is section-level policy duplication and cross-stage drift, not full-file token injection.
2. **Treat `inverse-claim-verification.prompt.md` as the highest-priority prompt defect.** The file is semantically underspecified and its consumer collapses parse failures to `isStrictInverse: false`, which biases audits toward false negatives.
3. **Treat source-reliability as a runtime contract problem, not a markdown-only prompt problem.** The live SR path currently uses TypeScript-built prompts plus permissive runtime schemas; these can drift from the file-backed prompt and allow parse-valid but unsupported values through.
4. **Treat `claimboundary` ecosystem guidance as a governance problem.** Repeated doctrine exists for a reason across stages, but it needs one routing contract and synchronization tests instead of repeated negative exclusions.
5. **Treat input-policy gate fail-open behavior as secondary.** It is operationally relevant, but lower priority than inverse verification, SR contract cleanup, and `claimboundary` ecosystem governance.

## Priority order

| Priority | Workstream | Why it is first | Main outputs |
|---|---|---|---|
| P1 | Inverse verification hardening | Small surface, clear defect, direct audit-quality impact | Stronger prompt, schema-constrained parse path, explicit failure handling |
| P2 | SR contract and prompt-surface unification | Real runtime drift risk in live SR evaluation | Tighter schema, one authoritative prompt surface, drift guard |
| P3 | `claimboundary` ecosystem governance | Repeated doctrine can drift across stages | Stage-1 routing field, prompt cleanup, synchronization tests |
| P4 | Extraction coercion observability | Silent coercions can hide prompt/output drift | Logging or warnings for category/source/claim rewrites |
| P5 | Gate failure visibility | Useful safety/ops improvement, but not the main audit finding | Fail-open visibility or `review` fallback decision |

## Workstream 1 — Inverse verification hardening

### Objective

Make strict-inverse verification reliable enough to be a trustworthy calibration/audit signal.

### Files

- `apps/web/prompts/text-analysis/inverse-claim-verification.prompt.md`
- `apps/web/src/lib/calibration/paired-job-audit.ts`
- optional: new small schema/helper under `apps/web/src/lib/calibration/`

### Changes

1. Expand the prompt contract to define:
   - strict inverse vs contradiction vs reformulation
   - quantifier drift (`all` vs `some`)
   - temporal drift
   - modality drift
   - scope drift
   - identical claims
   - empty claim handling
2. Replace ad hoc `JSON.parse` + silent `false` fallback with schema-constrained parsing.
3. Surface parse failure as an explicit degraded audit condition rather than silently classifying the pair as non-inverse.

### Acceptance criteria

- The prompt contains explicit edge-case rules and at least one abstract contrastive example.
- Parse failures no longer silently become `isStrictInverse: false`.
- Paired-job audit output can distinguish:
  - verified strict inverse
  - verified non-inverse
  - verification unavailable / parse failure

## Workstream 2 — SR contract and prompt-surface unification

### Objective

Remove ambiguity about which SR prompt is authoritative and make the runtime schema enforce the intended output contract.

### Files

- `apps/web/src/lib/source-reliability/sr-eval-types.ts`
- `apps/web/src/lib/source-reliability/sr-eval-prompts.ts`
- `apps/web/prompts/source-reliability.prompt.md`
- `apps/web/src/lib/source-reliability/sr-eval-engine.ts`
- `apps/web/src/lib/source-reliability-config.ts`

### Decision

Use **one** authoritative prompt surface for live SR evaluation. Preferred direction: migrate toward the file-backed/UCM-managed prompt path, because that is more aligned with repo prompt-governance expectations.

### Changes

1. Tighten the runtime schema:
   - enum or validated allowlist for `sourceType`
   - explicit bias contract
   - stronger `evidenceCited` expectations
2. Remove or gate parse-valid unsupported values that currently bypass cap logic.
3. Decide the source of truth:
   - either migrate live SR evaluation to the markdown prompt
   - or keep the TS builder temporarily but add drift tests against the markdown prompt and declare the TS builder transitional
4. Remove contradictory examples from the live prompt surface.

### Acceptance criteria

- The live SR evaluator has one declared authoritative prompt source.
- Runtime schema rejects or repairs unsupported `sourceType` values before cap logic runs.
- Drift between `sr-eval-prompts.ts` and `source-reliability.prompt.md` is either eliminated or guarded by tests.

## Workstream 3 — `claimboundary` ecosystem governance

### Objective

Keep the comparative-ecosystem doctrine consistent across stages without pretending the fix is a full-file prompt split.

### Files

- `apps/web/prompts/claimboundary.prompt.md`
- `apps/web/src/lib/analyzer/claim-extraction-stage.ts`
- `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`
- `apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts`

### Decision

Do **not** start with a loader/include refactor. First introduce a cross-stage routing contract that reduces ambiguity and lets the repeated sections stay synchronized.

### Changes

1. Add an explicit Stage-1 routing field, recommended name:
   - `decisiveEvidenceMode: "comparative_ecosystem" | "current_metric" | "other"`
2. Drive downstream prompt logic from that field in:
   - query generation
   - relevance classification
   - extraction
   - reconciliation
3. Shorten repeated negative-exclusion wording where possible, but keep stage-specific instructions where they are genuinely different.
4. Add synchronization tests for the key ecosystem invariants:
   - enumerative route requirement
   - adjacency/harm-domain exclusion
   - one-sided proxy evidence cannot settle above `UNVERIFIED`

### Acceptance criteria

- Stage 1 emits a stable routing decision for ecosystem-vs-metric handling.
- Later prompt sections no longer rely only on repeated “these rules do not apply when…” exclusions.
- Contract tests protect the core ecosystem doctrine across extraction, query, and verdict stages.

## Workstream 4 — Extraction coercion observability

### Objective

Reduce silent masking of prompt/output drift in evidence extraction.

### Files

- `apps/web/src/lib/analyzer/research-extraction-stage.ts`
- `apps/web/src/lib/analyzer/pipeline-utils.ts`

### Changes

1. Make category normalization auditable rather than invisible.
2. Surface source URL fallback and claim-ID overwrites in diagnostics or metrics.
3. Review whether `contextual -> neutral` mapping should remain silent or become explicit in trace data.

### Acceptance criteria

- Runtime rewrites that materially change extracted output are traceable in logs/metrics.
- Unknown categories no longer disappear silently without diagnostic signal.

## Workstream 5 — Input gate failure visibility

### Objective

Make policy-gate degradation visible without turning it into topic-based overblocking.

### Files

- `apps/web/src/lib/input-policy-gate.ts`
- any caller or warning surface that consumes gate state

### Changes

1. Decide whether config/parse/runtime gate failures should remain `allow` or become `review`.
2. If fail-open stays, emit a clear degraded-state signal so failures are observable.

### Acceptance criteria

- Gate outages are visible to operators and not silently indistinguishable from successful `allow`.

## Execution order

### Phase A — small, high-signal fixes

1. Workstream 1
2. Workstream 2 schema tightening

### Phase B — cross-stage governance

3. Workstream 3
4. Workstream 4

### Phase C — optional/operational

5. Workstream 5
6. Optional loader/include refactor only if Workstream 3 still leaves unacceptable duplication burden

## Validation plan

### Required before merge

- Focused unit/contract tests for each touched prompt/runtime path
- `npm test`

### Required before claiming behavioral improvement

- For `claimboundary` ecosystem work:
  - inspect seeded-vs-researched evidence counts
  - inspect enumerative-route query coverage
  - inspect adjacency admissions
- For inverse verification:
  - run a small controlled set of inverse / non-inverse pairs
- For SR:
  - verify unsupported prompt outputs are rejected or repaired before score-cap application

## Out of scope

- Full-file splitting of `claimboundary.prompt.md` as an immediate efficiency emergency
- Broad prompt rewrites outside the surviving audit findings
- New deterministic text-analysis logic

## Recommended next implementation move

Start with **Workstream 1** and **Workstream 2 schema tightening** in one bounded branch. They are the clearest defects, have the smallest blast radius, and do not depend on loader changes or large prompt refactors.
