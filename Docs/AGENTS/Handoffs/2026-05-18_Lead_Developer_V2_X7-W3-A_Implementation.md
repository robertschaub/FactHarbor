---
### 2026-05-18 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 X7-W3-A Safe Locator Materialization Preview Implementation
**Task:** Implement W3-A strictly inside the approved package envelope from `Docs/WIP/2026-05-18_V2_Slice_X7-W3-A_Safe_Locator_Materialization_Preview_Source_Package.md`.

**Files touched:** Final W3-A package files:
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-material/locator-materialization.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-material/source-candidate-preview.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-candidate-preview-owner.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-candidate-preview-artifact-sink.ts`
- `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-source-candidate-preview-artifacts/route.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-transport.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-factory.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.ts`
- `apps/web/src/lib/analyzer-v2/orchestrator.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/locator-materialization.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/source-candidate-preview.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-candidate-preview-owner.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-candidate-preview-artifact-sink.test.ts`
- `apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-candidate-preview-artifacts/route.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/orchestrator.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W3-A_Implementation.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/index/handoff-index.json` after index rebuild

Unrelated dirty files observed before/while closing out and not part of W3-A: `.claude/settings.json`, `Docs/STATUS/Backlog.md`, `Docs/WIP/README.md`.

**Key decisions:** W3-A is implemented as Tier 0 only. The transport reads provider-owned Wikimedia search candidates and invokes an observational projection hook for the bounded candidate cap. The factory builds sanitized `source_candidate_preview` projections and passes them to the product-owned orchestrator side-channel. The W3-A owner records hidden/admin-only preview diagnostics and the artifact sink stores bounded, in-memory, non-public ledgers behind an admin-only no-store route. No shared transport outcome contract change remains; `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-envelope.ts` has no final diff.

**Open items:** Live canary was not run. It remains blocked until Steering explicitly authorizes it, then the package must be committed, runtime refreshed, and route/runtime preflight checked first.

**Warnings:** W3-A creates no Source Material record and performs no extra HTTP call. It does not open parser execution, EvidenceCorpus, EvidenceItems, report/verdict/warning/confidence behavior, public exposure, second provider, retries, cache/SR/storage, ACS/direct URL, Tier 1 summary fetch, Tier 2 full page/source/html fetch, Query Planning, Claim Understanding, downstream denial, parser, provider expansion, gate-register cleanup, or V1 work.

**Verification:**
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/locator-materialization.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/source-candidate-preview.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-candidate-preview-owner.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-candidate-preview-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-candidate-preview-artifacts/route.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` - pass, 10 files / 114 tests
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime` - pass, 45 files / 263 tests
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` - pass, 92 files / 636 tests
- `npm -w apps/web run build` - pass
- `npm run validate:v2-gates` - pass
- `node scripts/validate-v2-gate-register.mjs --self-test` - pass
- `git diff --check` - pass
- `git diff -- apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-envelope.ts` - clean

**For next agent:** Treat W3-A as implementation-complete and verifier-clean, but not canary-proven. The next action is review/commit decision for the focused W3-A package only. Do not run the optional W3-A canary without explicit Steering authorization and a clean committed/refreshed runtime.

**Learnings:** Appended to Role_Learnings.md? no.

```text
DEBT-GUARD RESULT
Classification: failed-validation recovery plus scope correction.
Chosen option: amend existing W3-A mechanisms in place.
Rejected path and why: widening the package envelope or adding a shared transport outcome field was rejected because the approved transport/factory callback seam could carry the preview projection without changing the shared outcome contract.
What was removed/simplified: removed the final diff from source-acquisition-network-envelope.ts and kept preview projection as observational callback output only.
What was added: W3-A materializer, preview owner, bounded artifact sink, admin-only artifact route, orchestrator side-channel integration, and focused tests/guards.
Net mechanism count: unchanged relative to approved W3-A package; no parallel public or downstream source-material path added.
Budget reconciliation: final files are inside the approved W3-A source/test/docs envelope, excluding unrelated pre-existing dirty files.
Verification: focused W3-A package, analyzer-v2-runtime slice, analyzer-v2 slice, build, V2 gate validators, whitespace, and envelope-clean check passed.
Debt accepted and removal trigger: none for W3-A. Optional canary remains a later Steering-approved step.
Residual debt: unrelated dirty files remain outside the W3-A package and should not be staged with it.
```
