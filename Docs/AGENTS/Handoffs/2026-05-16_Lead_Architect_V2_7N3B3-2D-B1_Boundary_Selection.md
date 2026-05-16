# Lead Architect Handoff: V2 7N-3B3-2D-B1 Parser Isolation Boundary Selection

---
### 2026-05-16 | Lead Architect | Codex (GPT-5.5) | V2 7N-3B3-2D-B1 Parser Isolation Boundary Selection
**Task:** Consolidate the post-2D-B expert debate into a docs-only boundary-selection package and update the active queue.

**Files touched:**
- `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-B1_Parser_Isolation_Boundary_Selection.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`

**Key decisions:**
- Selected a locked-down OCI container sandbox as the first parser-isolation proof target.
- Preferred runtime is rootless OCI in deployment/staging, preferably Podman or an equivalent rootless runtime.
- Docker Desktop is acceptable only for Windows local proof when Podman is unavailable.
- Rootful Docker socket access is not acceptable in deployed runtime because Docker socket authority is effectively host-root.
- The current machine has neither `docker` nor `podman` on PATH, so the later source proof must fail closed locally as `parser_isolation_unavailable` or equivalent until an approved OCI runtime is provisioned.
- Only `parser_isolation_verified` can unlock a later 2D-C parser source proposal; all unavailable, unapproved, failed-denial, malformed-output, leak, timeout, or cancellation states block 2D-C.

**Scope boundaries:**
- This is docs-only. It authorizes no source implementation.
- It does not authorize real fetched-byte parser execution, parser output handoff into Evidence Lifecycle, product/orchestrator/runner/API/UI/report/export wiring, public exposure, live jobs, prompt/config/model/schema edits, cache IO, durable raw/parsed storage, Source Reliability, ACS/direct URL execution, V1 reuse, or V1 cleanup.
- The next implementation-adjacent step must be a separate reviewed 2D-B2 OCI proof source package.

**Review inputs used:**
- Security/runtime isolation recommended rootless OCI as the strongest portable denial boundary.
- Senior Developer/runtime feasibility recommended a locked-down OCI proof with fail-closed default because this workspace has no Docker/Podman CLI available.
- LLM/Evidence Lifecycle approved a container proof only while parser output remains structural/hidden and no Evidence Lifecycle consumption is authorized.
- Governance requested this docs-only boundary-selection package before any source proof.

**Open items:**
- Draft and review `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-B2_OCI_Parser_Isolation_Proof_Source_Package.md` before source edits.
- 2D-C parser work remains blocked until the positive sandbox proof passes on a provisioned host.
- X3-B prompt frontmatter/text alignment remains blocked until explicit Captain/LLM Expert prompt approval.
- Live jobs remain deferred until a reviewed executable/live-smoke gate makes them meaningful.

**Warnings:**
- Do not treat local Docker/Podman absence as skipped success.
- Do not pull or build container images during tests without a reviewed package.
- Do not mount the repo, forward env, invoke a shell, or mount the Docker/Podman socket in the sandbox.
- Do not extend the 2D-A fixture/control parser runner to real fetched bytes.

**Verification expected for this docs-only package:**
- `git diff --check`
- `git status --short --untracked-files=all -- apps/web/src apps/web/test apps/web/prompts apps/web/configs apps/api apps/api.Tests scripts package.json package-lock.json Docs/AGENTS/V2_Gate_Register.json`

**For next agent:**
- Start from `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-B1_Parser_Isolation_Boundary_Selection.md`.
- If continuing, create and review the 2D-B2 source proof package first. Do not jump to 2D-C and do not wire parser output into Evidence Lifecycle.

**Learnings:** no
