# Lead Architect Handoff: V2 C0-S1 P0 Parser Worker Admission

### 2026-05-16 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 C0-S1 P0 Parser Worker Admission
**Task:** Continue V2 implementation after X7-F by adding the next low-risk parser-path seam without opening parser execution or source execution.

**For next agent:** C0-S1 adds `evaluateSourceAcquisitionParserWorkerAdmission(...)` as a hidden/internal structural admission contract for the provisional P0 parser-worker profile. It admits only fixture/control or synthetic inert metadata as `p0_admitted_fixture_or_synthetic_inert`, while returning `executionStatus: "blocked_no_parser_execution"` and explicit false/null fields for parser execution, worker spawn, bytes consumed, 2C-A packet/frame acceptance, real fetched bytes, product/public/live exposure, Evidence Lifecycle consumption, cache, Source Reliability, parsed material, parser output, and evidence corpus.

**Approval/source context:**
- Source package: `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-C0-S1_P0_Parser_Worker_Admission_Source_Package.md`
- Baseline: `95cc5471` (`docs: record v2 x7f gate pointer`)
- Parent architecture: `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-C0_Parser_Worker_Architecture_And_Provisional_Isolation.md`
- Deputy review: Architect, Security/runtime, and Lead Developer reviewers converged on C0-S1 as the next low-risk step after X7-F, with the hard constraint that P0 is not a security boundary and must not execute parsers or consume bytes.

**Files touched:**
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-parser-worker-admission.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-parser-worker-admission.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-C0-S1_P0_Parser_Worker_Admission_Source_Package.md`
- `Docs/AGENTS/V2_Gate_Register.json`
- `scripts/validate-v2-gate-register.mjs`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_C0-S1_P0_Parser_Worker_Admission.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/index/handoff-index.json` after indexing

**Implementation summary:**
- Added a no-import runtime contract for C0-S1 parser-worker admission.
- Positive P0 admission is metadata-only and non-executing; admitted inputs carry only provenance kind, byte count, and digest.
- P0 admission requires `P0_PROVISIONAL_LOCAL_INERT` and `provisional_local_inert_only_not_security_boundary`.
- Rejected malformed requests, non-P0 profiles, P0 security-boundary claims, real fetched bytes, byte payload fields, 2C-A transport-owned packets, 2C-A transport-owned frames, non-fixture/synthetic provenance, deployment-candidate claims, 2D-C approval claims, product/public/live approval claims, and Evidence Lifecycle consumption approval claims.
- Updated boundary guards to keep the file structural, hidden, non-executing, not barrel-exported, and unreachable from product/public surfaces.
- Updated the V2 Gate Register and validator so C0-S1 is tracked as parser context while the register stays audit-only and non-approving.
- Post-review fix: widened only the C0-S1 and adjacent X7-F expensive transitive-scan guard timeouts to 30s after a reviewer reproduced timeout sensitivity, and added explicit `deploymentCandidateIsolationAccepted: true` rejection coverage.

**Verification passed:**
```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-parser-worker-admission.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-parser-worker-admission.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-runner-protocol.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm -w apps/web run build
git diff --check
```

Focused C0-S1/boundary suite: 2 files, 69 tests passed. Adjacent parser/admission/boundary suite: 4 files, 81 tests passed. Runtime slice: 29 files, 177 tests passed. Analyzer V2 slice: 67 files, 474 tests passed. Gate-register validator and self-test passed. Web build passed. Diff whitespace check passed.

**Review results:**
- Architect reviewer: APPROVE; no architecture/spec findings.
- Security/runtime reviewer: APPROVE; P0 remains not a security boundary, no execution or authority behavior found.
- Code reviewer: initial BLOCK on timeout-sensitive guard and missing deployment-candidate approval test; re-review APPROVE after the test-only fix.

**DEBT-GUARD RESULT**
Classification: `incomplete-existing-mechanism` for reviewer-found verifier reliability and admission coverage gaps.
Chosen option: amend the existing tests in place.
Rejected path and why: collapsing/shared-caching the boundary-guard transitive scans would be a broader test-infrastructure refactor and outside the small C0-S1 closeout; adding a new guard helper would increase mechanisms.
What was removed/simplified: no behavior was removed; the accidental wider timeout edits on unrelated guard tests were corrected before validation.
What was added: one explicit approval-snapshot assertion for `deploymentCandidateIsolationAccepted: true`, plus 30s timeouts for the C0-S1 and adjacent X7-F expensive transitive-scan tests.
Net mechanism count: unchanged.
Budget reconciliation: actual edits stayed inside the two expected test files plus this handoff note; no production behavior, prompts/config/models/schemas, product/public/live wiring, parser execution, byte consumption, cache/SR/storage, Evidence Lifecycle behavior, ACS/direct URL, or V1 code changed.
Verification: reviewer-focused suite passed after the fix, Analyzer V2 slice passed after the fix, and `git diff --check` passed.
Debt accepted and removal trigger: guard timeouts remain a pragmatic test-runtime allowance; revisit by sharing/caching transitive scan results if boundary-guard runtime becomes a recurring CI bottleneck.
Residual debt: none blocking C0-S1.

**Next step recommendation:**
- Do not start 2D-C from C0-S1. C0-S1 is an admission seam, not parser authorization.
- The next parser path still needs either a positive deployment-candidate proof on a provisioned rootless OCI host or a separately reviewed local-only proof package before any real-byte parser work.
- X3-B prompt frontmatter/text alignment remains blocked until explicit Captain/LLM Expert prompt approval.

**Warnings:**
- `p0_admitted_fixture_or_synthetic_inert` is not permission to parse fixture/control bytes; it is only structural admission metadata.
- P0 is explicitly not a security boundary.
- Real fetched bytes, 2C-A packets/frames, product/public/live wiring, Evidence Lifecycle consumption, cache/SR/storage, prompt/config/model/schema edits, ACS/direct URL execution, V1 reuse, and V1 cleanup remain blocked.

**Learnings:** Parser work benefits from an admission seam before execution exists; it gives future agents a machine-checked place to reject real bytes, packets, and false security-boundary claims before any parser runner can be wired.
