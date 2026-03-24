# Architectural Review — Refactoring Plan (Code Cleanup)

**Reviewer:** Lead Architect (Claude Code, Opus 4.6)
**Date:** 2026-03-19
**Plan reviewed:** `Docs/WIP/2026-03-18_Refactoring_Plan_Code_Cleanup.md` (rev. 2026-03-19)
**Prior reviews incorporated:** Code Reviewer (APPROVE WITH CHANGES), Lead Developer (APPROVE WITH REFINEMENTS)

**Verdict: APPROVE — with architectural recommendations below.**

The plan is structurally sound. All prior review findings have been incorporated. The recommendations below address long-term maintainability concerns that go beyond the scope of the two prior reviews.

---

## 1. Module Cohesion (WS-2)

**Assessment: Good — with two modules needing tighter cohesion boundaries.**

The proposed 8-module split maps cleanly to pipeline stages, which is the correct decomposition axis. Each module has a **single reason to change**: when its stage's logic, prompts, or schemas evolve. This is preferable to splitting by code type (all schemas in one file, all helpers in another), which would create shotgun surgery across every change.

**Module-by-module verdict:**

| Module | Cohesion | Holds up under extension? | Notes |
|--------|----------|--------------------------|-------|
| `pipeline-utils.ts` | ⚠️ Weak | Yes if disciplined | Utility grab-bags erode over time. See Rec-1. |
| `claim-extraction-stage.ts` | ✅ Strong | Yes | Pass1 → PreliminarySearch → Pass2 → Gate1 is a natural unit. |
| `query-generation.ts` | ✅ Strong | Yes | Query schemas + generation + relevance classification form a tight unit. |
| `evidence-extraction.ts` | ✅ Strong | Yes | Evidence schemas + extraction + applicability assessment. Clean. |
| `research-stage.ts` | ✅ Strong | Yes | Orchestration + budget plumbing. The 3-way split (query/evidence/orchestrator) was the right call. |
| `boundary-clustering-stage.ts` | ✅ Strong | Yes | Self-contained. No external stage dependencies beyond types. |
| `verdict-generation-stage.ts` | ✅ Strong | Yes | Thin wrapper — delegates to `verdict-stage.ts`. Will stay small. |
| `aggregation-stage.ts` | ⚠️ At risk | Needs monitoring | See Rec-2. |

**Would boundaries hold with new stages or pipeline variants?**

Yes. The stage-per-module pattern is the natural extension point. A hypothetical Stage 2.5 (evidence validation) would become `evidence-validation-stage.ts` without touching existing modules. A pipeline variant would compose different stage modules through its own orchestrator — the current `claimboundary-pipeline.ts` becomes one such orchestrator rather than the only one.

### Rec-1: Define `pipeline-utils.ts` admission criteria

The plan already flags this ("NOT a junk drawer"), but needs an enforceable rule:

**Admission test for `pipeline-utils.ts`:** A function belongs here if and only if:
1. It is a **pure function** (no side effects, no LLM calls, no state mutation), AND
2. It is used by **2+ stage modules** (not just the orchestrator + one stage)

`checkAbortSignal` violates criterion 1 (it throws) but is correctly placed here as cross-cutting infrastructure. Mark it as the explicit exception. Everything else must pass both criteria or live in its stage module.

**Concrete implication:** `extractDomain`, `mapSourceType`, `mapCategory`, `normalizeExtractedSourceType` — verify these actually have 2+ stage consumers. If any is used by only one stage, move it into that stage.

### Rec-2: Pre-define the `aggregation-stage.ts` split trigger

The plan says "flagged for monitoring" at ~900 lines. Make this concrete:

**Split trigger:** When `aggregation-stage.ts` exceeds **900 lines OR 4 distinct responsibilities**, extract the most self-contained cluster. Likely candidates:
- `aggregation-quality.ts` — quality gates, explanation rubric, TIGER scoring
- `aggregation-narrative.ts` — narrative generation, triangulation display

Do not pre-split on day one (I agree with the plan). But write the trigger into the plan so the implementer has a concrete decision rule, not a vague "watch it."

---

## 2. Dependency Direction

**Assessment: Clean. No circular dependency risk in the proposed design.**

I verified the current import graph against the proposed decomposition:

```
                    types.ts (leaf — no imports from analyzer/)
                       ↑
              ┌────────┼────────────────────────┐
              │        │                        │
        pipeline-utils.ts                  truth-scale.ts
              ↑        ↑                        ↑
    ┌─────────┼────────┼─────────┐              │
    │         │        │         │              │
claim-     query-   evidence-  boundary-   verdict-stage.ts
extraction generation extraction clustering     ↑
    ↑         ↑        ↑         ↑              │
    │         │        │         │    verdict-generation-stage.ts
    │         └───┬────┘         │              ↑
    │        research-stage      │              │
    │             ↑              │    aggregation-stage.ts
    │             │              │              ↑
    └─────────────┴──────────────┴──────────────┘
                          │
              claimboundary-pipeline.ts (orchestrator)
```

**Dependency direction is correct:** `utils ← stages ← orchestrator`.

**Key validations:**
- `verdict-stage.ts` (existing, proven) imports only `types.ts` + `truth-scale.ts` — no pipeline imports. This pattern holds.
- `verdict-generation-stage.ts` wraps `verdict-stage.ts` — unidirectional.
- `research-stage.ts` imports `query-generation.ts` + `evidence-extraction.ts` — both leaf-ward. No risk.
- `pipeline-utils.ts` imports only `types.ts`. All stage modules import it. Clean leaf.
- No module needs to import from the orchestrator or from a sibling stage (except research → query/evidence, which is a parent→child relationship within Stage 2).

**One thing to verify during implementation:** `classifyRelevance` (proposed for `query-generation.ts`) and `assessEvidenceApplicability` (proposed for `evidence-extraction.ts`) — confirm neither calls the other. If they share logic, that shared logic goes in `pipeline-utils.ts`, not via cross-stage import.

### Rec-3: Add a lint rule or test for import direction

Post-decomposition, add a lightweight test (or ESLint rule via `eslint-plugin-import`) that enforces:
- Stage modules do NOT import from `claimboundary-pipeline.ts`
- `pipeline-utils.ts` does NOT import from any stage module
- No stage module imports from a sibling stage (except `research-stage.ts` → `query-generation.ts` / `evidence-extraction.ts`)

This prevents regression. Without it, the next developer who needs a helper from `boundary-clustering-stage.ts` inside `aggregation-stage.ts` will import it directly, creating a lateral dependency.

---

## 3. Barrel Re-export Trade-off

**Assessment: Pragmatic for migration. Must be temporary.**

The plan's approach — `claimboundary-pipeline.ts` adds `export * from "./new-module"` — is the right migration strategy. Zero test changes needed, zero consumer changes, minimal risk.

**But barrel re-exports have real costs:**

1. **Hidden coupling.** Consumers can't tell which module they actually depend on. `import { extractDomain } from "./claimboundary-pipeline"` looks like it needs the whole pipeline, but it only needs `pipeline-utils.ts`.
2. **Tree-shaking.** Barrel re-exports can defeat tree-shaking in bundlers that don't fully analyze re-export chains.
3. **Circular dependency masking.** A barrel that re-exports everything creates a synthetic hub node. If module A imports from the barrel and module B (also re-exported) imports module A, you have a hidden cycle that only manifests as a runtime initialization order bug.

### Rec-4: Two-phase migration for barrel re-exports

**Phase 1 (this refactoring):** Keep barrel re-exports in `claimboundary-pipeline.ts`. Zero consumer changes. Ship it.

**Phase 2 (follow-up PR, within 2 weeks):** Update the test file to import from specific modules:

```typescript
// Before (44 imports from one file)
import { extractDomain, runPass1, ... } from "../claimboundary-pipeline";

// After (imports from specific modules)
import { extractDomain } from "../pipeline-utils";
import { runPass1, runPreliminarySearch } from "../claim-extraction-stage";
import { generateResearchQueries } from "../query-generation";
```

Then **remove the barrel re-exports** from `claimboundary-pipeline.ts`. The orchestrator keeps only its own export: `runClaimBoundaryAnalysis`.

**Why not do this in Phase 1?** Because it's a separate concern (consumer migration) that shouldn't be mixed with structural decomposition. Each phase is independently verifiable.

**Long-term:** `index.ts` (the analyzer barrel) should also switch to selective re-exports from specific modules rather than re-exporting the orchestrator's re-exports. But that's lower priority since external consumers (route.ts, etc.) import far fewer symbols.

---

## 4. State Threading Pattern

**Assessment: Current pattern (pass-by-reference mutation) is acceptable for now. Flag for future evolution.**

`CBResearchState` is a mutable accumulator passed through all stages. Each stage reads prior stage outputs and writes its own outputs into the same object. This is the simplest pattern that works and has been proven across 1,079 tests.

**Trade-offs of the current pattern:**

| Aspect | Pass-by-reference (current) | Return partial results |
|--------|---------------------------|----------------------|
| Simplicity | ✅ Simple — stages just mutate `state` | ❌ Requires merge logic in orchestrator |
| Testability | ⚠️ Must construct full state to test one stage | ✅ Each stage is input→output, easy to unit test |
| Type safety | ⚠️ State has nullable fields that are "guaranteed" non-null at certain stages | ✅ Each stage's return type is precise |
| Refactoring safety | ⚠️ Any stage can accidentally overwrite another's output | ✅ Orchestrator controls merge |
| Performance | ✅ Zero copying | ⚠️ Shallow copies at each merge point (negligible) |

**Why I'm NOT recommending a change now:**

1. The plan is explicitly behavior-preserving. Changing the state threading pattern changes every stage's signature — that's a redesign, not a refactoring.
2. The 44-function test file validates the current contract. Changing to return-based would require rewriting most tests.
3. The real pain point (constructing full `CBResearchState` for single-stage tests) is already present and won't get worse from decomposition.

### Rec-5: Add stage input/output type annotations for future migration

Without changing any runtime behavior, add **type aliases** that document each stage's actual contract:

```typescript
// In types.ts — stage contracts (documentation only, no runtime change)
type Stage1Input = Pick<CBResearchState, 'originalInput' | 'inputType' | 'onEvent'>;
type Stage1Output = Pick<CBResearchState, 'understanding'>;

type Stage2Input = Pick<CBResearchState, 'understanding' | 'originalInput' | ...>;
type Stage2Output = Pick<CBResearchState, 'evidenceItems' | 'sources' | 'searchQueries' | ...>;
```

These types serve three purposes:
1. **Documentation** — makes each stage's dependencies explicit without reading the implementation.
2. **Test scaffolding** — future tests can construct `Stage2Input` instead of full `CBResearchState`.
3. **Migration path** — if we later move to return-based stages, these types become the actual function signatures.

This is a low-effort addition (~30 lines in `types.ts`) that the implementer can do during or after WS-2.

---

## 5. Naming Conventions

**Assessment: Consistent with one exception.**

Proposed names follow the established `*-stage.ts` pattern set by `verdict-stage.ts`:

| Proposed File | Consistent? | Notes |
|--------------|-------------|-------|
| `pipeline-utils.ts` | ✅ | `pipeline-` prefix clearly scopes it to the pipeline |
| `claim-extraction-stage.ts` | ✅ | `*-stage.ts` pattern |
| `query-generation.ts` | ⚠️ | Missing `-stage` suffix. Not technically a stage — it's a sub-module of Stage 2. Acceptable. |
| `evidence-extraction.ts` | ⚠️ | Same — sub-module of Stage 2. Acceptable. |
| `research-stage.ts` | ✅ | The Stage 2 orchestrator. `*-stage.ts` correct. |
| `boundary-clustering-stage.ts` | ✅ | `*-stage.ts` pattern |
| `verdict-generation-stage.ts` | ✅ | `*-stage.ts` pattern |
| `aggregation-stage.ts` | ✅ | `*-stage.ts` pattern |

The `query-generation.ts` and `evidence-extraction.ts` names are fine without the `-stage` suffix because they're sub-modules of `research-stage.ts`, not top-level pipeline stages. The naming convention communicates the hierarchy: files ending in `-stage.ts` are pipeline stages; files without that suffix are supporting modules.

### Rec-6: No change needed — naming is sound

The only improvement I'd consider is adding a comment in the orchestrator's imports that groups them by stage, for readability:

```typescript
// Stage 1
import { extractClaims, ... } from "./claim-extraction-stage";
// Stage 2
import { generateResearchQueries, ... } from "./query-generation";
import { extractResearchEvidence, ... } from "./evidence-extraction";
import { researchEvidence, ... } from "./research-stage";
// Stage 3
import { clusterBoundaries, ... } from "./boundary-clustering-stage";
// ...
```

---

## 6. What's Missing

Three architectural improvements that fit within the plan's behavior-preserving scope:

### Rec-7: Stage contract interfaces (LOW EFFORT, HIGH VALUE)

Define a `PipelineStage` interface:

```typescript
interface PipelineStage {
  readonly name: string;
  execute(state: CBResearchState, config: PipelineConfig, signal?: AbortSignal): Promise<void>;
}
```

This is NOT about making stages pluggable (over-engineering). It's about making the orchestrator's structure explicit:

```typescript
// In the orchestrator
const stages: PipelineStage[] = [
  claimExtractionStage,
  researchStage,
  boundaryClusteringStage,
  verdictGenerationStage,
  aggregationStage,
];

for (const stage of stages) {
  checkAbortSignal(signal);
  onEvent?.(`Running ${stage.name}`, progress);
  await stage.execute(state, config, signal);
}
```

**Why:** The current orchestrator has 5 sequential stage calls interspersed with abort checks, progress events, and error handling. Each stage's invocation follows the same pattern. A stage interface makes this DRY and makes the orchestration flow obvious at a glance.

**Scope check:** This is a structural change to the orchestrator only. Each stage module wraps its existing functions into a `{ name, execute }` object. No logic changes. Compatible with behavior-preserving scope.

**Caveat:** Only implement this if the orchestrator's stage invocations truly follow a uniform pattern. If stages have significantly different error handling or progress reporting needs, a forced uniform interface creates more problems than it solves. Verify during implementation.

### Rec-8: Zod schemas co-located with their stage modules

The plan correctly places Zod schemas in their stage modules (`query-generation.ts` gets query schemas, `evidence-extraction.ts` gets evidence schemas). Verify during implementation that **no Zod schema remains in the orchestrator file**. Schemas are the primary type contract — if they stay in the orchestrator, the module boundary is illusory.

### Rec-9: Consider an `analyzer/stages/` subdirectory

With 8 new stage modules plus the existing `verdict-stage.ts`, the `analyzer/` directory will contain ~50 files. A `stages/` subdirectory would group the pipeline modules:

```
analyzer/
├── stages/
│   ├── pipeline-utils.ts
│   ├── claim-extraction-stage.ts
│   ├── query-generation.ts
│   ├── evidence-extraction.ts
│   ├── research-stage.ts
│   ├── boundary-clustering-stage.ts
│   ├── verdict-generation-stage.ts
│   ├── verdict-stage.ts          ← moved from parent
│   └── aggregation-stage.ts
├── claimboundary-pipeline.ts     ← orchestrator stays at top level
├── types.ts
├── aggregation.ts
├── evidence-filter.ts
└── ...
```

**Trade-off:** Better organization vs. deeper import paths and moving `verdict-stage.ts` (breaking existing imports). I rate this as **nice-to-have, not essential.** The flat structure works. Only pursue this if the team finds the 50-file flat directory confusing after implementation.

---

## Summary of Recommendations

| # | Recommendation | Priority | Effort | When |
|---|---------------|----------|--------|------|
| Rec-1 | Define `pipeline-utils.ts` admission criteria (pure + 2+ consumers) | **High** | Trivial | Before implementation |
| Rec-2 | Pre-define `aggregation-stage.ts` split trigger (900 lines OR 4 responsibilities) | **Medium** | Trivial | Write into plan |
| Rec-3 | Add import direction lint/test post-decomposition | **High** | Low | After WS-2 |
| Rec-4 | Two-phase barrel re-export migration (keep now, remove in follow-up) | **High** | Medium | Phase 2 within 2 weeks |
| Rec-5 | Add stage input/output type aliases in `types.ts` | **Medium** | Low | During or after WS-2 |
| Rec-6 | Naming is sound — no changes needed | — | — | — |
| Rec-7 | Stage contract interface for orchestrator | **Low** | Low | After WS-2, only if pattern is uniform |
| Rec-8 | Verify no Zod schemas remain in orchestrator post-split | **High** | Trivial | During WS-2 |
| Rec-9 | `stages/` subdirectory — defer unless flat dir becomes unwieldy | **Low** | Medium | Post-WS-2 if needed |

**No blockers. Plan is approved for execution.**
