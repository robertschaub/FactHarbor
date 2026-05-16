# Lead Architect Handoff: V2 7N-3B3-2D-B2 OCI Parser Isolation Proof Source Package

---
### 2026-05-16 | Lead Architect | Codex (GPT-5.5) | V2 7N-3B3-2D-B2 OCI Proof Source Package
**Task:** Draft, review, tighten, and approve the proof-only source package for OCI parser isolation after B1 selected the boundary.

**Files touched:**
- `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-B2_OCI_Parser_Isolation_Proof_Source_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`

**Review result:**
- LLM/Evidence Lifecycle reviewer: `APPROVE`.
- Governance/traceability reviewer: `APPROVE`.
- Senior Developer/runtime implementability reviewer: initial `MODIFY`, then `APPROVE`.
- Security/runtime isolation reviewer: initial `MODIFY`, then `APPROVE`.

**Required modifications applied before approval:**
- Added explicit runtime/image approval rather than treating any digest-pinned image as approved.
- Distinguished `local_only` proof from `deployment_candidate` proof so Docker Desktop or rootful/unknown Docker authority cannot unlock deployment-safe 2D-C readiness.
- Required approved absolute runtime executable paths for positive real verifier runs.
- Added a concrete forbidden OCI host-escape flag list for guards and tests.
- Added tests for digest-pinned-but-unapproved images, unsupported Node permission flags, rootful/unknown runtime authority in deployment mode, and untracked/forbidden file drift.

**Approved source envelope:**
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-parser-isolation-proof.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-parser-oci-container-proof.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-isolation-proof.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-oci-container-proof.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- status docs and one completion handoff

**Scope boundaries:**
- B2 implementation may add only hidden structural isolation-proof contracts, OCI proof ownership, default fail-closed unavailable behavior, approval checks, denied-authority result mapping, focused tests, and boundary guards.
- It does not authorize parser execution over real fetched bytes, fixture/control parsing, 2C-A packet/frame consumption, source-acquisition executor wiring, product/orchestrator/runner/API/UI/report/export wiring, live jobs, prompt/config/model/schema edits, cache/SR/storage, evidence/report/warning/verdict/confidence generation, semantic text-analysis logic, ACS/direct URL execution, V1 reuse, or V1 cleanup.
- 2D-C remains blocked until a positive `deployment_candidate` rootless OCI proof passes on a provisioned host.

**Verification expected for implementation:**
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-isolation-proof.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-oci-container-proof.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`
- `npm -w apps/web run build`
- `git diff --check`
- `git diff --cached --check`
- `git status --short --untracked-files=all -- apps/web/src apps/web/test apps/web/prompts apps/web/configs apps/api apps/api.Tests scripts package.json package-lock.json Docs/AGENTS/V2_Gate_Register.json`

**Warnings:**
- Local Docker/Podman absence is expected and must return `parser_isolation_unavailable`, not skipped success.
- Do not run live jobs or Captain canaries from this gate.
- Do not pull/build container images unless a later reviewed package explicitly approves it.
- Do not mount the repo, forward env into the container, invoke a shell, or mount a Docker/Podman socket.

**For next agent:**
- Implement B2 exactly under `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-B2_OCI_Parser_Isolation_Proof_Source_Package.md`.
- Keep the source proof hidden and non-product. Do not proceed to 2D-C parser work from local unavailable proof.

**Learnings:** no
