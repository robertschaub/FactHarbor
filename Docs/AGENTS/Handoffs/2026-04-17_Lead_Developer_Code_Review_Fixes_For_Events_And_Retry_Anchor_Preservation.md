---
roles: [Lead Developer]
topics: [code-review, jobs-page, events-history, stage1, retry-anchor, windows]
files_touched:
  - .vscode/tasks.json
  - apps/api/Controllers/JobsController.cs
  - apps/web/src/app/jobs/[id]/page.tsx
  - apps/web/src/app/api/fh/jobs/[id]/events/history/route.ts
  - apps/web/src/lib/analyzer/claim-extraction-stage.ts
  - apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts
  - scripts/restart-clean.ps1
  - .claude/skills/report-review/SKILL.md
  - Docs/AGENTS/Role_Learnings.md
---

### 2026-04-17 | Lead Developer | GitHub Copilot (GPT-5.4) | Code Review Fixes For Events And Retry Anchor Preservation
**Task:** Address three review findings, repair the broken workspace build task, and complete a live browser validation of the terminal-job Events timeline.
**Files touched:** `.vscode/tasks.json`; `apps/api/Controllers/JobsController.cs`; `apps/web/src/app/jobs/[id]/page.tsx`; `apps/web/src/app/api/fh/jobs/[id]/events/history/route.ts`; `apps/web/src/lib/analyzer/claim-extraction-stage.ts`; `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`; `scripts/restart-clean.ps1`; `.claude/skills/report-review/SKILL.md`; `Docs/AGENTS/Role_Learnings.md`
**Key decisions:** Added a JSON `events/history` endpoint and matching Next.js proxy so terminal jobs can keep SSE disabled without losing the timeline; broadened Stage 1 carrier protection from repair-only to retry-or-repair contract-approved sets; added a retry-path regression test mirroring the repair-path protection; replaced `ls -t test-output/ | head -20` with a PowerShell-native directory listing; changed the VS Code `build` task to a lock-safe `dotnet msbuild ... /t:Compile` against `apps/api/FactHarbor.Api.csproj`; extended `restart-clean.ps1` so it also kills stale listeners on the configured API port before starting new services.
**Open items:** None for this review-fix slice. `publish` and `watch` now point at the correct project path, but I only executed the repaired `build` task in this session.
**Warnings:** The initial browser validation failed even after code changes because a stale `FactHarbor.Api.exe` was still bound to port 5000 and serving old controller code. Route-level browser checks on this repo can be misleading unless the restart path clears bound API executables, not only `dotnet watch` shells.
**For next agent:** The workspace `build` task in `.vscode/tasks.json` now succeeds while the API is running by using the MSBuild `Compile` target against `apps/api/FactHarbor.Api.csproj`. Runtime proof used completed job `ff97448210f8475faf6bf0c2eba921d4`: direct API call to `/v1/jobs/{jobId}/events/history` returned `200`, the browser page requested `/api/fh/jobs/{jobId}/events/history`, constructed zero `EventSource` instances, and rendered `55` timeline entries including `Job created`, `Triggering runner`, `Preparing input`, and `Analysis complete`.
**Learnings:** yes — appended Lead Developer learnings covering terminal SSE gating requiring a separate history path, retry-approved anchor carriers requiring the same downstream structural protection as repaired carriers, and restart-clean needing explicit API-port listener cleanup.
