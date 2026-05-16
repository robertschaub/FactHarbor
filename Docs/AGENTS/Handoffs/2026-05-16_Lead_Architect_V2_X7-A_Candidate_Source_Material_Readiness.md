# Lead Architect Handoff: V2-X7-A Candidate-To-Source-Material Readiness

### 2026-05-16 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2-X7-A Candidate-To-Source-Material Readiness
**Task:** Continue the V2 rebuild after X6 by choosing and implementing the next low-risk direct-text Evidence Lifecycle slice with Architect/Security/runtime review.

**For next agent:** X7-A is a hidden/internal contract only. It proves X6 candidate-acquisition output is not source material, not evidence, and not extraction input. Continue with a reviewed follow-up package before any provider-network readiness, real source IO, source-material population, extraction, evidence-corpus building, product/public/live wiring, cache/SR/storage, prompt/config/model/schema edit, ACS/direct URL path, or V1 cleanup.

**Approval/source context:**
- Source package: `Docs/WIP/2026-05-16_V2_Slice_X7-A_Hidden_Candidate_To_Source_Material_Readiness_Source_Package.md`
- Baseline: `307bbc45` (`feat: add v2 hidden candidate acquisition harness`)
- Parent gate: X6 hidden direct-text candidate-acquisition harness
- Review result: Architect approved; Security modified then approved; runtime reviewer modified then approved.

**Files touched:**
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-material/types.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-material/readiness.ts`
- `apps/web/src/lib/analyzer-v2-runtime/hidden-direct-text-source-material-readiness-harness.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/readiness.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/hidden-direct-text-source-material-readiness-harness.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `Docs/WIP/2026-05-16_V2_Slice_X7-A_Hidden_Candidate_To_Source_Material_Readiness_Source_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_X7-A_Candidate_Source_Material_Readiness.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/index/handoff-index.json` after indexing

**Implementation summary:**
- Added a pure core source-material readiness contract under `analyzer-v2/evidence-lifecycle/source-material`.
- The core builder accepts only exact-shape sanitized candidate-acquisition trace data and has no `analyzer-v2-runtime` import.
- Added strict fail-closed blocked reasons for malformed traces, source-material-like candidate traces, dereferenceable locator claims, candidate-count-as-evidence claims, incomplete candidate acquisition, incomplete candidate runtime, and non-blocked public cutover state.
- Added a hidden runtime adapter under `analyzer-v2-runtime` that accepts an already-created X6 result, strips it to status/count/boolean facts, and returns the unchanged X6 public envelope plus the source-material readiness decision.
- X7-A produces no source material, extraction input, EvidenceItems, evidence corpus, warnings, verdicts, confidence, report content, cache/SR/storage behavior, product wiring, or live behavior.

**Guardrails preserved:**
- No provider-network execution, including fake transport.
- No real network/search/fetch.
- No content dereference, parser, packet/frame/real-byte consumption, or parsed material.
- No source records, EvidenceItems, evidence-corpus population, extraction, applicability, sufficiency, warnings, verdicts, confidence, or report generation.
- No product/orchestrator/runner/API/UI/report/export wiring.
- No cache read/write/storage.
- No Source Reliability import/call.
- No prompt/config/model/schema edits.
- No ACS/direct URL execution.
- No V1 analyzer/prompt/type/code reuse.
- No V1 cleanup.

**Verification passed:**
```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/readiness.test.ts test/unit/lib/analyzer-v2-runtime/hidden-direct-text-source-material-readiness-harness.test.ts test/unit/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run build
npm -w apps/web run test -- test/unit/lib/analyzer-v2
```

Results:
- Focused X7-A/X6/boundary suite: 4 files, 70 tests passed.
- Analyzer V2 runtime unit slice: 25 files, 151 tests passed.
- Web build passed; reseed reported `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`.
- Analyzer V2 unit slice: 61 files, 433 tests passed.

**Failed-attempt recovery:**
- Build initially failed because the trace validator used `Number.isInteger(...) && value >= 0` against `unknown`; amended with a local `isNonNegativeInteger()` type guard. Classification: keep/amend.
- Broad Analyzer V2 testing then exposed timeout fragility in the new X7-A and existing X6 transitive boundary guards. Focused boundary guard passed; runtime reviewer approved the timeout-only recovery. The fix preserves the guards and adds explicit `10_000` ms budgets to those two expensive tests. Classification: keep/amend.

**DEBT-GUARD RESULT**
Classification: incomplete-existing-mechanism.
Chosen option: amend the existing X7-A validator and boundary-guard tests.
Rejected path and why: loosening validation or removing transitive guards would weaken the approved package; adding new validation layers was unnecessary.
What was removed/simplified: none.
What was added: one local numeric type guard and explicit timeouts on two existing expensive transitive boundary tests.
Net mechanism count: unchanged.
Budget reconciliation: actual fixes stayed inside one source file and one test file after verifier failures.
Verification: focused readiness test, focused boundary guard, runtime slice, analyzer-v2 slice, and build passed after amendments.
Debt accepted and removal trigger: boundary-guard transitive scans remain slow; revisit if guard runtime becomes a recurring CI bottleneck.
Residual debt: X7-A is a hidden contract, not an execution gate. It still requires reviewed follow-up before provider-network readiness, source material, extraction, evidence corpus, product wiring, live jobs, or V1 cleanup.

**Next step recommendation:**
- Keep X3-B prompt frontmatter/text alignment blocked until explicit Captain/LLM Expert prompt approval.
- For the direct-text path, draft and review the next package separately. Reasonable candidates:
  - hidden provider-network readiness now that candidates cannot be mistaken for source material;
  - later source-material/evidence-corpus contracts if the team wants to define downstream shape before provider-network readiness.
- Do not run live jobs from X7-A.

**Warnings:**
- X7-A does not approve source-material population. Its positive state is still `not_ready_pre_execution`.
- X7-A does not consume or dereference hidden locator IDs.
- The hidden runtime adapter intentionally does not return the full X6 result, only the unchanged public envelope and sanitized source-material readiness decision.

**Learnings:** Candidate-acquisition integration needs an explicit negative boundary before provider-network readiness. The important invariant is not only "candidate acquisition can run" but "candidate records cannot become source material, evidence, or extraction input by accident."
