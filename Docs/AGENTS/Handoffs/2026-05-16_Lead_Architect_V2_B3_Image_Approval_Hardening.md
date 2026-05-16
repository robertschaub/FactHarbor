# Lead Architect Handoff: V2 B3 Image Approval Hardening

---
### 2026-05-16 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 B3 Image Approval Hardening
**Task:** Address high review finding that the B3 positive OCI verifier could self-approve `FH_ANALYZER_V2_PARSER_SANDBOX_IMAGE` by passing the same value into `approvedImageReferences`.

**Approval/source context:**
- Reviewer finding: B3 proof acceptance depended on manual/process control because the positive verifier branch used `approvedImageReferences: [imageReference]`.
- B3 package: `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-B3_Provisioned_OCI_Deployment_Candidate_Proof_Package.md`.
- Security reviewer returned `MODIFY`: require separate approved-image env and approval-source env, and keep 2D-C blocked.
- Architect reviewer returned `MODIFY`, then `ACCEPT` after the verifier distinguished zero-env unavailable from partial/legacy-env hard failure.

**Files touched:**
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-parser-isolation-proof.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-isolation-proof.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-oci-container-proof.test.ts`
- `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-B3_Provisioned_OCI_Deployment_Candidate_Proof_Package.md`
- `Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_B3_Image_Approval_Hardening.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/index/handoff-index.json` after `npm run index`

**Implemented:**
- Added `imageApprovalSource` to `ParserIsolationProofApprovedOptions`.
- `validateParserIsolationProofOptions()` now rejects absent, blank, image-equal, or approved-image-equal approval-source references as `parser_isolation_image_unapproved`.
- The B3 positive OCI verifier now requires five env inputs: `PROOF`, `RUNTIME`, `IMAGE`, `APPROVED_IMAGE`, and `IMAGE_APPROVAL_SOURCE`.
- The positive verifier passes `approvedImageReferences` from `FH_ANALYZER_V2_PARSER_SANDBOX_APPROVED_IMAGE`, not from `FH_ANALYZER_V2_PARSER_SANDBOX_IMAGE`.
- The test now has three explicit states: zero env returns `parser_isolation_unavailable`; partial or legacy three-env setup throws a clear failure; complete five-env setup may run the positive proof.
- B3 docs now make the five-env command shape and independent approval-source requirement authoritative.

**Warnings:**
- This hardens B3 proof evidence only. It does not start 2D-C.
- No parser execution over real, fixture, or control bytes was added.
- No packet/frame consumption, product/public/live wiring, prompt/config/model/schema edits, cache/SR/storage, evidence/report/warning/verdict/confidence generation, ACS/direct URL execution, V1 reuse, or V1 cleanup was added.
- A separate env var cannot prove human independence by itself; Architect/Security must still inspect the recorded approval source for the exact image digest before accepting any B3 proof.
- 2D-C remains blocked until a later positive `deployment_candidate` + `rootless_oci` proof is recorded and accepted, and a separate 2D-C source package is reviewed.

**Verification:**
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-oci-container-proof.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-isolation-proof.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` -- passed, 3 files / 71 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime` -- passed, 25 files / 152 tests.
- `npm -w apps/web run build` -- passed after the production proof-option contract change.
- `git diff --check` -- passed.

**DEBT-GUARD RESULT**
Classification: `incomplete-existing-mechanism`.
Chosen option: amend the existing B3/B2 approval mechanism.
Rejected path and why: docs-only correction would leave future proof callers able to self-approve; broad UCM/product approval wiring is larger than needed for B3.
What was removed/simplified: the implicit old three-env positive proof path is no longer accepted as green unavailable evidence.
What was added: a small proof-option approval-source field, focused validator checks, and test-local env completeness checks.
Net mechanism count: unchanged; the existing image-approval gate is tightened.
Budget reconciliation: actual diff stayed inside the proof contract/test/doc/handoff envelope; no parser or product capability was added.
Verification: focused tests, runtime slice, build, and diff check passed.
Debt accepted and removal trigger: temporary B3 approval-source env remains a proof-runner input until a real independent approval registry exists; final B3 acceptance still requires Architect/Security inspection.
Residual debt: none blocking this hardening commit; 2D-C remains blocked.

**For next agent:**
- Do not treat this as a positive B3 proof. It only hardens the verifier.
- If B3 is run on a provisioned rootless OCI host, use the five-env command shape and record the independent approval source for the exact image digest.
- Do not draft or implement 2D-C until a positive B3 proof is recorded and Architect/Security accept it.

**Learnings:** A proof verifier should fail loudly for partial activation state. Fail-closed unavailable is correct only for true zero-env local runs; legacy or incomplete proof env is a configuration error, not valid B3 evidence.
