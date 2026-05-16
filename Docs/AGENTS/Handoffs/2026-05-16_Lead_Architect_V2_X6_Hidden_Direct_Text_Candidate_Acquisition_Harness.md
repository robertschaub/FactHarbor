# Lead Architect Handoff: V2-X6 Hidden Direct-Text Candidate-Acquisition Harness

### 2026-05-16 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2-X6 Hidden Direct-Text Candidate-Acquisition Harness
**Task:** Continue the V2 rebuild after the parser-isolation/web-PDF roadmap discussion by returning to the direct-text Evidence Lifecycle path, with Architect/Security/runtime review before source implementation.

**For next agent:** X6 is a hidden/test-injected direct-text candidate-acquisition composition only. Continue with a reviewed follow-up package before any real provider/network canary, evidence-corpus/extraction contract, product wiring, live job, public output, parser/content consumption, cache/SR/storage, prompt/config/model/schema edit, ACS/direct URL path, or V1 cleanup.

**Approval/source context:**
- Source package: `Docs/WIP/2026-05-16_V2_Slice_X6_Hidden_Direct_Text_Candidate_Acquisition_Harness_Source_Package.md`
- Baseline: `a504e21b` (`docs: clarify v2 web and pdf capability roadmap`)
- Parent gate: X5 hidden integration harness at `b402cfbf`
- Review result: Architect approved; Security modified then approved; runtime reviewer modified then approved.

**Files touched:**
- `apps/web/src/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `Docs/WIP/2026-05-16_V2_Slice_X6_Hidden_Direct_Text_Candidate_Acquisition_Harness_Source_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_X6_Hidden_Direct_Text_Candidate_Acquisition_Harness.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/index/handoff-index.json` after indexing

**Implementation summary:**
- Added `runHiddenDirectTextCandidateAcquisitionHarness()` under `analyzer-v2-runtime`.
- X6 accepts an already-created `HiddenV2IntegrationHarnessResult`; it does not accept X5 request inputs, does not run X5, and has no query-planning/model callback path.
- X6 validates:
  - X5 status is `completed`;
  - query-plan to Source Acquisition handoff is `ready_not_executable`;
  - Source Acquisition request is `source_acquisition_ready_not_executable`;
  - candidate provider allowlist is `test_injected_candidate_boundary` only.
- X6 invokes the existing 7N-3B1 candidate runtime with caller-created authority, allowlist, budget, and injected provider boundary.
- Public output remains the X5 damaged/blocked pre-cutover envelope.

**Guardrails preserved:**
- No product/orchestrator/runner/API/UI/report/export wiring.
- No live jobs or canaries.
- No real network/search/fetch execution.
- No parser/content/real-byte consumption.
- No cache read/write/storage.
- No Source Reliability import/call.
- No prompt/config/model/schema edits.
- No evidence/report/warning/verdict/confidence generation.
- No ACS/direct URL execution.
- No V1 analyzer/prompt/type/code reuse.
- No V1 cleanup.

**Verification passed:**
```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness.test.ts test/unit/lib/analyzer-v2/hidden-integration-harness.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
```

Results:
- Focused X6 suite: 4 files, 77 tests passed.
- Analyzer V2 runtime unit slice: 24 files, 148 tests passed.
- Analyzer V2 unit slice: 59 files, 425 tests passed.
- Web build passed; reseed reported `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`.

**Failed-attempt recovery:**
- First focused verifier failed only because the older 7N-3B1 exact-envelope guard rejected the newly reviewed X6 import exception.
- Classification: keep/amend.
- Fix: amended the existing guard to exempt only the X6 harness while adding a stricter X6-specific guard for no product/public/network/parser/cache/SR/import leakage.
- Rerun passed.

**DEBT-GUARD RESULT**
Classification: incomplete-existing-mechanism.
Chosen option: amend the existing boundary guard.
Rejected path and why: reverting X6 would discard an approved hidden composition slice; adding a second guard-only workaround without amending the older exact-envelope guard would leave conflicting guard ownership.
What was removed/simplified: none.
What was added: one explicit X6 exception in the older candidate-runtime guard plus a stricter X6-specific boundary guard.
Net mechanism count: unchanged for the fix; X6 itself is one reviewed hidden harness.
Budget reconciliation: actual fix stayed inside the planned single guard file after the focused verifier failed.
Verification: focused suite passed after amendment, then both broader unit slices and build passed.
Debt accepted and removal trigger: X6 is temporary hidden integration infrastructure; revisit or delete when a later reviewed product/orchestrator or real-source execution path replaces it.
Residual debt: X6 is still not product wiring, not live-job authority, and not real source acquisition; future direct-text progress needs a reviewed follow-up gate.

**Next step recommendation:**
- If continuing direct-text: draft a reviewed package deciding whether the next hidden step is real provider/network canary readiness or evidence-corpus/extraction contracts.
- Do not run live jobs from X6.
- Do not treat X6 as approval for product wiring, public output, real source IO, parser consumption, cache/SR/storage, or V1 cleanup.

**Warnings:**
- X6 accepts only upstream X5 results; callers must build X5 outside this harness.
- X6 accepts caller-created authority/allowlist/budget; it must not become a product-shaped config factory.
- `candidate_search_api_future` remains blocked in X6 even though 7N-3B1 can represent it structurally.

**Learnings:** For cross-stage hidden harnesses, accepting the upstream stage result is cleaner than re-running upstream logic. It avoids duplicating identity/provenance hash construction and keeps the later runtime owner responsible only for its own stage.
