---
### 2026-04-28 | Lead Architect | Codex (GPT-5) | ACS Draft Config Provenance Fix
**Task:** Investigate and fix draft-backed ACS final jobs failing with `pipelineConfigHash changed` after UCM changes during Stage 1 preparation.

**Files touched:**
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
- `apps/web/test/unit/lib/analyzer/claimboundary-prepared-stage1.test.ts`
- `apps/web/src/app/api/admin/config/[type]/[profile]/activate/route.ts`
- `apps/web/src/app/api/admin/config/[type]/[profile]/rollback/route.ts`
- `apps/web/test/unit/app/api/admin/config/config-api.test.ts`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Role_Learnings.md`
- this handoff

**Key decisions:** The failed manual job `21a53a95b6a246f0af4f385062d7be04` was not caused by service restart itself. It failed because the active UCM pipeline hash changed between prepared Stage 1 and final draft-backed execution. The fix keeps prepared snapshot provenance fail-closed for real analysis drift, but narrows the Stage 1 pipeline fingerprint to exclude already-persisted ACS orchestration knobs (`claimSelectionDefaultMode`, idle auto-proceed, budget-awareness mode/minimums, and `claimSelectionCap`). `selectionCap` remains protected by its existing explicit provenance check. Admin config activation and rollback now also invalidate the analyzer `config-loader` cache, not only storage-side state.

**Open items:** No post-fix live job was submitted; the fix is covered by focused regression tests and build. Broader UX recovery is still open: stale draft detection before final job creation, explicit reprepare flow for truly stale drafts, and admin activation warnings for in-flight prepared sessions.

**Warnings:** Do not disable prepared Stage 1 provenance validation to work around this class of failure. Truly incompatible prompt/search/calc/pipeline changes should still fail closed unless a full frozen-config execution mode is designed. The exploratory SVP validation job `b4d2f8d2707144b9a1bb965a8714cf8d` was cancelled and is not validation evidence for this fix.

**For next agent:** If another draft-backed job reports `pipelineConfigHash changed`, inspect the prepared draft provenance and the active UCM hash first. For final-job execution, only persisted ACS orchestration knob changes should be tolerated; prompt content, search config, calc config, and real pipeline-analysis settings must still trigger the guard.

**Learnings:** Appended to `Docs/AGENTS/Role_Learnings.md`: prepared ACS draft provenance must separate analysis-affecting config from already-persisted selection orchestration, and UCM activation/rollback must invalidate both storage and analyzer-loader caches.

```text
DEBT-GUARD RESULT
Classification: incomplete-existing-mechanism.
Chosen option: amend the existing prepared Stage 1 provenance and admin config activation mechanisms.
Rejected path and why: rejected disabling provenance validation, auto-continuing stale snapshots, and adding a full frozen-config execution path because they either hide real analysis drift or introduce a larger parallel mechanism than the verified failure requires.
What was removed/simplified: no production path removed; the effective provenance comparison is narrowed to the Stage 1-relevant pipeline config subset.
What was added: a scoped pipeline-config hash helper, focused prepared-snapshot regression coverage, admin activation/rollback cache invalidation, and cache-invalidation route tests.
Net mechanism count: unchanged for analysis flow; one small structural helper added inside the existing provenance mechanism.
Budget reconciliation: actual diff stayed within prepared Stage 1 provenance plus UCM cache invalidation; no prompt changes, schema changes, live reruns, retries, fallback modes, or claim-selection behavior changes were added.
Verification: focused prepared Stage 1 tests; ACS flow/draft route tests; runner split tests; admin config API tests; config schema/drift tests; `npm -w apps/web run build`; `git diff --check`.
Debt accepted and removal trigger: UX recovery for truly stale drafts remains follow-up work; implement only if stale-draft user friction recurs or admin config changes during in-flight preparation become common.
Residual debt: generic failed-job retry still does not preserve claim-selection context, so failed draft-backed jobs should be reprepared rather than retried blindly.
```
