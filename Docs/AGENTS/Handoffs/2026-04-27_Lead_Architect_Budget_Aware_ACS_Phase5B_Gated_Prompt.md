---
### 2026-04-27 | Lead Architect | Codex (GPT-5) | Budget-Aware ACS Phase 5B Gated Prompt
**Task:** Continue after Phase 5A by debating and implementing the smallest safe Phase 5B slice for ACS budget-aware prompt behavior.
**Files touched:** `apps/web/prompts/claimboundary.prompt.md`; `apps/web/src/lib/analyzer/claim-selection-recommendation.ts`; `apps/web/test/unit/lib/analyzer/claim-selection-recommendation.test.ts`; `Docs/WIP/2026-04-27_Budget_Aware_ACS_Slice5_Review_Design.md`; `Docs/AGENTS/Agent_Outputs.md`; this handoff.
**Key decisions:** Reviewer debate returned `MODIFY`, so implementation stayed inside the existing ACS recommendation path. Defaults remain off. The prompt receives only structural budget context. `explain_only` is shadow-only and cannot return operational deferred claims or reduce `recommendedClaimIds`. `allow_fewer_recommendations` is the only mode that may recommend fewer than the cap for budget fit, and the validator requires top-level `budgetFitRationale`, consistent per-claim budget treatment, and complete deferred metadata. The final runner still uses only `selectedClaimIds`.
**Open items:** No live job was run in this slice. Next gate is a small committed/runtime-refreshed validation run on Captain-approved inputs if product rollout evidence is needed. Broader default changes remain unapproved.
**Warnings:** The exact prompt-diff review returned `pass-with-concerns`; required changes were applied before verification: corrected optional-field shape, tightened allow-fewer language, clarified explain-only semantics, required budget rationale for fewer-than-cap budget metadata, and made `deferred_budget_limited` exclusive to allow-fewer mode. Full `npm test` was not rerun because the known runner heartbeat timeout remains a full-suite residual; the same runner integration file passed in isolation.
**For next agent:** Do not add a second selector, final-runner drop logic, deterministic budget filtering, or source reuse. If running live validation, commit first, restart/reseed runtime, use automatic ACS only as an operational profile, and compare selected-claim research coverage plus contradiction reachability.
**Learnings:** No `Role_Learnings.md` append. Reusable point: `explain_only` should not use the same `deferred` terminology as operational allow-fewer mode; otherwise shadow metadata can look like hidden selection behavior.

```text
DEBT-GUARD RESULT
Classification: missing-capability bounded by existing mechanism.
Chosen option: amend the existing ACS recommendation prompt/generator/validator path.
Rejected path and why: rejected second selectors, final-runner dropping, hidden caps, and deterministic budget filtering because they would add competing mechanisms and violate analysis rules.
What was removed/simplified: no removal; constrained Phase 5B to existing prompt and validator.
What was added: structural budget prompt variables, mode-aware validation for off/explain_only/allow_fewer_recommendations, and focused prompt/validator tests.
Net mechanism count: unchanged.
Budget reconciliation: actual diff matched expected prompt/generator/test/docs scope; no new fallback or parallel selector was added.
Verification: focused ACS recommendation tests; config/config-drift tests; internal-runner/draft-route tests; runner concurrency file in isolation; web build; git diff --check.
Debt accepted and removal trigger: no live validation evidence yet; run a small committed validation before broader rollout or default changes.
Residual debt: full safe suite still has a known runner heartbeat timeout only when run as the full suite.
```
