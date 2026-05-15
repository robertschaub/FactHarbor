---
### 2026-05-15 | Lead Architect | Codex (GPT-5.5) | V2 4C3c Smoke Inspection Path

**Task:** Prepare the approved 4C3c hidden-artifact inspection path before the first live direct-text smoke.

**Files touched:** `apps/web/src/app/api/internal/analyzer-v2/claim-understanding-runtime-artifacts/route.ts`, `apps/web/test/unit/app/api/internal/analyzer-v2/claim-understanding-runtime-artifacts/route.test.ts`, `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`, and `Docs/WIP/2026-05-15_V2_Slice_6B3c4C3_Product_Activation_Approval_Package.md`.

**Key decisions:** No live smoke is meaningful unless the in-process `v2_observability_ledger` can be inspected after the runner job. Added a narrow admin-key-protected internal route that reads a caller-supplied ledger id from the existing V2 runtime artifact sink. The route does not write job events/history, result JSON, report markdown, exports, UI state, or compatibility-view data.

**Warnings:** This route is for internal 4C3c smoke inspection only. It must not become a public report/API surface, and it must not be used as durable artifact persistence. Ledger id for a runner job is `<jobId>:precutover-observability`.

**For next agent:** After committing and refreshing the runtime, enable the V2 shell gate and dedicated runtime kill switch, submit one Captain-defined direct-text `claimboundary-v2` job, then inspect `GET /api/internal/analyzer-v2/claim-understanding-runtime-artifacts?ledgerId=<jobId%3Aprecutover-observability>` with the admin key. Acceptance remains section 18 of the 4C3 product activation package.

**Learnings:** Hidden in-memory artifacts require an in-process inspection surface for real runner jobs; a separate shell process cannot read the Next.js module-scoped ledger.
