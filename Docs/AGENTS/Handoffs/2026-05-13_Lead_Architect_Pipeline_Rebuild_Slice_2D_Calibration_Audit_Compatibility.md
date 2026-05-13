---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Slice 2D Calibration/Audit Compatibility
**Task:** Continue the V2 compatibility-adapter implementation by wiring calibration and paired-job audit result readers without changing the analyzer hot path.

**Files touched:**
- `apps/web/src/lib/analyzer-v2/compatibility-view.ts`
- `apps/web/src/lib/calibration/runner.ts`
- `apps/web/src/lib/calibration/paired-job-audit.ts`
- `apps/web/test/unit/lib/analyzer-v2/compatibility-view.test.ts`
- `apps/web/test/unit/lib/calibration-runner-failures.test.ts`
- `apps/web/test/unit/lib/paired-job-audit.test.ts`

**Key decisions:**
- V2 result reads in calibration now go through the existing `toResultCompatibilityView` / `toLegacyReportSurfaceModel` adapter only when `schemaKind === "v2"`.
- Legacy V1 and unknown/raw local result shapes keep the prior raw read behavior.
- `SideResult.fullResultJson` continues to store the original result JSON, not the projected legacy surface.
- V2 warning details are preserved in the TypeScript compatibility view so calibration failure-mode metrics keep structured provider/stage/occurrence context where available.
- Paired-job audit now reads V2 canonical truth percentages and V2 warning `materialityRationale` through the compatibility adapter while keeping raw top-level fallback for unknown shapes.
- Deputy reviewer `Lorentz` approved the architecture as a read-only compatibility boundary and required explicit V2, V1, unknown/raw, and provenance tests; those were added before final verification.

**Open items:**
- Continue Slice 2 with remaining compatibility consumers: validation scripts, metrics/quality-health readers, and any historical-report helpers not yet routed through the adapter.
- No live or expensive validation was run; this slice is fixture/unit/build coverage only.
- No V1 pipeline cleanup or V2 implementation work has started yet.

**Warnings:**
- Calibration metrics still have existing warning-type classification logic outside this slice. This work only prevents adapter-driven loss of warning details; it does not redesign failure-mode classification.
- V2 `claimVerdicts` and V1-shaped quality gates are compatibility fallback data. Do not synthesize deeper per-claim verdict semantics from canonical V2 fields unless a later approved slice defines and tests that contract.
- Keep import direction one-way: calibration/audit may import `analyzer-v2/compatibility-view`; the adapter must remain pure and free of analyzer runtime, config storage, API clients, prompt loaders, or calibration imports.

**For next agent:**
- Worktree: `C:\DEV\FactHarbor-pipeline-rebuild-spec`, branch `codex/pipeline-rebuild-spec`.
- This slice is ready to commit after staging. Verification passed:
  - `npm -w apps/web test -- --run test/unit/lib/analyzer-v2/compatibility-view.test.ts test/unit/lib/calibration-runner-failures.test.ts test/unit/lib/paired-job-audit.test.ts` (27 tests)
  - `npm -w apps/web run build`
  - `npm test`
  - hot-path/API/prompt diff guard
  - `git diff --check`
- Next likely slice: route validation/metrics readers through `toResultCompatibilityView` without touching V1 analyzer source, prompts, UI, C# API, or live validation.

**Learnings:** Not appended to `Role_Learnings.md`; no durable role-level learning beyond this slice handoff.
