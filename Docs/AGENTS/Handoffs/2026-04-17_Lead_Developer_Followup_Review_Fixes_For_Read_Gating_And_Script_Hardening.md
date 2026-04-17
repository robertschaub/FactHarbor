---
roles: [Lead Developer]
topics: [code-review, api-read-access, hidden-jobs, stage1, scripts, hooks]
files_touched:
  - apps/api/Controllers/JobsController.cs
  - apps/web/src/app/api/fh/jobs/[id]/events/route.ts
  - apps/web/src/app/api/fh/jobs/[id]/events/history/route.ts
  - apps/web/src/app/jobs/[id]/page.tsx
  - apps/web/src/lib/analyzer/claim-extraction-stage.ts
  - apps/web/src/lib/analyzer/claimboundary-pipeline.ts
  - apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts
  - apps/web/test/unit/lib/analyzer/repair-anchor-selection.test.ts
  - apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts
  - scripts/install-hooks.mjs
  - scripts/build-index.mjs
  - scripts/validate-quality-expectations-drift.mjs
  - scripts/git-hooks/post-commit
  - scripts/git-hooks/post-merge
  - scripts/tmp-validate-analyze.py
  - scripts/tmp-validate-preflight.py
  - CLAUDE.md
  - Docs/AGENTS/Role_Learnings.md
---

### 2026-04-17 | Lead Developer | GitHub Copilot (GPT-5.4) | Follow-up Review Fixes For Read Gating And Script Hardening
**Task:** Address the follow-up review round after the first events-history / retry-anchor patch set, with highest priority on the `/events/history` authz + validation blocker and the remaining script/test/documentation findings.
**Files touched:** `apps/api/Controllers/JobsController.cs`; `apps/web/src/app/api/fh/jobs/[id]/events/route.ts`; `apps/web/src/app/api/fh/jobs/[id]/events/history/route.ts`; `apps/web/src/app/jobs/[id]/page.tsx`; `apps/web/src/lib/analyzer/claim-extraction-stage.ts`; `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`; `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`; `apps/web/test/unit/lib/analyzer/repair-anchor-selection.test.ts`; `apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts`; `scripts/install-hooks.mjs`; `scripts/build-index.mjs`; `scripts/validate-quality-expectations-drift.mjs`; `scripts/git-hooks/post-commit`; `scripts/git-hooks/post-merge`; `scripts/tmp-validate-analyze.py`; `scripts/tmp-validate-preflight.py`; `CLAUDE.md`; `Docs/AGENTS/Role_Learnings.md`
**Key decisions:**
- Read access for job detail and event routes now follows one explicit rule: non-hidden jobs are public reads, hidden jobs are admin-only reads. `JobsController.Get`, `EventHistory`, and `EventsSse` all validate `jobId`, resolve the job first, and return `404` for hidden jobs unless the caller supplies a valid admin key.
- The Next.js event proxies now validate `jobId` locally and forward `X-Admin-Key` when the incoming request is admin-authenticated, so hidden-report admin views do not regress.
- `filterByCentrality(...)` now sorts required carrier IDs ahead of same-tier non-required peers. That makes the centrality cap deterministic once a retry/repair-approved carrier has been protected.
- The retry/repair protection predicate is exported and covered directly, including the negative `stageAttribution: "retry" + rePromptRequired: true` case the reviewer called out.
- Script hardening was kept minimal but concrete: hook installer backs up differing hooks before overwrite, Tier 1 index generation now fails soft with stderr warnings, post-commit/post-merge hooks log failures to `.git/hooks/factharbor-index.log`, and the drift checker moved from the previous broad `name:` regex to typed object-block scanning that still covers `RuntimeRoleModels` and `fallbackUsed`.
**Verification:**
- `npm -w apps/web exec vitest run test/unit/lib/analyzer/claimboundary-pipeline.test.ts test/unit/lib/analyzer/repair-anchor-selection.test.ts test/unit/lib/analyzer/verdict-prompt-contract.test.ts` → `416 passed | 1 skipped`
- `npm -w apps/web run build` → passed
- `dotnet build apps/api/FactHarbor.Api.csproj -o temp/verify-api-build-review2` → passed
- `node scripts/build-index.mjs --tier=1` → passed
- `node scripts/validate-quality-expectations-drift.mjs` → passed after widening the typed-block scanner to include object-bearing type aliases and function-parameter object types
**Open items:** None from the handed-over follow-up review list were left unresolved in this pass.
**Warnings:** The hook logging change is intentionally non-blocking. Hook failures are now visible in `.git/hooks/factharbor-index.log`, but commits/merges still complete even if indexing fails.
**For next agent:** If another reviewer questions the `/events/history` authz fix, the actual rule implemented is not “admin-only events”; it is “same public-read semantics as report detail, with hidden reports admin-only.” That preserves the public completed-job timeline while removing the looser direct read path that the new endpoint had introduced.
**Learnings:** yes — appended one Lead Developer learning about carrying hidden/admin semantics and admin-header forwarding across any new job read endpoint.
