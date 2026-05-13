---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Slice 2B API Compatibility Mirror
**Task:** Continue the pipeline rebuild by mirroring analyzer-v2 compatibility quick-field and primary-issue extraction in the C# API before wider public-surface wiring.

**Files touched:** `apps/api/Services/ResultCompatibility.cs`, `apps/api/Services/JobService.cs`, `apps/api/Controllers/JobsController.cs`, `apps/api.Tests/FixtureFiles.cs`, `apps/api.Tests/Services/ResultCompatibilityTests.cs`, `apps/api.Tests/Services/JobServiceTests.cs`.

**Key decisions:** Added a pure `ResultCompatibility` helper shared by API persistence and list/detail responses. V2 detection requires `meta.pipeline == "claimboundary-v2"` plus schema `4.0.0-cb-shadow` or `4.0.0-cb`; V2 quick fields trust canonical `verdict.label`, `verdict.truthPercentage`, and `verdict.confidence` without deriving the label from bands. Non-V2 JSON falls through the previous legacy quick-field paths (`truthPercentage`, `verdictSummary`, `articleAnalysis`, `twoPanelSummary`). V2 primary issues come from `warnings[]` where `primaryIssueEligible == true`, with `message` falling back to `materialityRationale`; legacy primary issues remain limited to `analysisWarnings[].type == "analysis_generation_failed"`.

**Open items:** API list/detail now call the helper, but no HTTP/controller serialization tests were added; the helper and `StoreResultAsync` wiring are covered directly. Wider wiring is still pending for web UI report reads, markdown/static export, metrics, validation, calibration, and any historical-report read path.

**Warnings:** Keep V2 runtime routing off until each public surface has fixture-backed parity. Do not let future API code re-derive V2 labels from percentages. If the V2 schema version changes, update both the TypeScript compatibility view and this C# helper together.

**For next agent:** Continue Slice 2 one consumer at a time. Recommended next surface is the web job/report UI read path using `apps/web/src/lib/analyzer-v2/compatibility-view.ts`, then markdown/static export. Preserve the existing V1 analyzer hot path and avoid prompt/config/model/live-validation changes unless explicitly approved.

**Learnings:** No Role_Learnings update; this was implementation-specific compatibility work.
