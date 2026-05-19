---
### 2026-05-19 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 X7-W4-H Bounded Extraction-Input Authorization Implementation
**Task:** Implement the approved W4-H bounded extraction-input authorization package at `70ea2d74` without running a live job.

**Files touched:**
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-authorization-owner.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-authorization-provenance.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-artifact-sink.ts`
- `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-extraction-input-artifacts/route.ts`
- `apps/web/src/lib/analyzer-v2/orchestrator.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-authorization-owner.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-authorization-provenance.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-artifact-sink.test.ts`
- `apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-extraction-input-artifacts/route.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `Docs/WIP/2026-05-19_V2_Slice_X7-W4-H_Bounded_Extraction_Input_Authorization_Review_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/index/handoff-index.json`

**Key decisions:**
- W4-H adds a linked `bounded_text_extraction_input_packet` and does not mutate W4-D shell, W4-E denial, or W4-G bounded text sidecar state.
- The packet is built only from runtime-owned W4-G sidecar provenance and preserves hash, length, cap, provider id, source-material reference, locator reference, and parent sidecar lineage.
- Provider lineage drift fails closed as `provider_id_mismatch`; current upstream id remains `wikimedia_core`.
- The internal sink may retain the bounded packet text, but the authenticated default admin route returns only hash/length/provenance projection with `inputTextReturned: false`.

**Verification:**
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-authorization-owner.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-authorization-provenance.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-extraction-input-artifacts/route.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` passed: 6 files, 98 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime` passed: 64 files, 309 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` passed: 119 files, 716 tests.
- `npm -w apps/web run build` passed; postbuild reported `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`.
- `npm run validate:v2-gates` passed.
- `node scripts/validate-v2-gate-register.mjs --self-test` passed.

**Open items:** No live canary has been run. W4-H remains pre-extraction: a later canary, if desired, needs separate Steering authorization and clean committed/refreshed runtime.

**Warnings:** W4-H does not authorize extraction execution, EvidenceItems, parser execution, LLM extraction calls, report/verdict/warning/confidence behavior, public behavior, cache/SR/storage, retries, provider expansion, W2/W3 widening, ACS/direct URL, prompt/config/model/schema edits, V1 work, or V1 cleanup. Public/default-admin/log/error surfaces must not expose packet `inputText`, source text, snippets, or summaries.

**For next agent:** Treat W4-H as local implementation-verified but not live-canary-proven. The key new symbols are `buildBoundedExtractionInputAuthorization`, `buildEvidenceLifecycleExtractionInputAuthorizationDecision`, `recordEvidenceLifecycleExtractionInputRuntimeArtifact`, and the internal route `/api/internal/analyzer-v2/evidence-lifecycle-extraction-input-artifacts`.

**Learnings:** Not appended to `Role_Learnings.md`; the local learning is narrow: after adding a new hidden V2 route/runtime owner, update both the dedicated slice guard and the aggregate analyzer-v2-runtime product import allowlist.

```text
DEBT-GUARD COMPACT RESULT
Task: W4-H boundary-guard failed after adding approved files/imports.
Prior attempt classification: keep.
Chosen path: amend existing boundary-guard bookkeeping and one W4-H diagnostic boolean; do not alter runtime scope or weaken guards.
Files touched for fix: boundary-guard.test.ts and bounded-extraction-input-authorization.ts.
Rejected alternatives: broad runtime import allowlist, removing W4-H route/orchestrator wiring, or skipping aggregate guard coverage.
Verifier: focused W4-H package tests, analyzer-v2-runtime slice, analyzer-v2 slice, build, V2 gate validators.
Net complexity: no new mechanism beyond the approved W4-H slice; guard coverage increased.
```
