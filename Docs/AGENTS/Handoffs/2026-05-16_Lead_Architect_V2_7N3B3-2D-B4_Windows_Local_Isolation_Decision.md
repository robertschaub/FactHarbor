# Lead Architect Handoff: V2 7N-3B3-2D-B4 Windows Local Isolation Decision

---
### 2026-05-16 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 7N-3B3-2D-B4 Windows Local Isolation Decision
**Task:** Respond to Captain's challenge that parser isolation may not require containers and consult expert agents.

**Consulted experts:**
- Architect / risk-tier reviewer
- Security / runtime isolation reviewer
- Senior Developer / Windows implementability reviewer

**Files touched:**
- `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-B4_Windows_Local_Isolation_Alternative_Decision.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_7N3B3-2D-B4_Windows_Local_Isolation_Decision.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/index/handoff-index.json` after indexing

**Decision recorded:**
- A container is not intrinsically required; a proven OS-level denial boundary is required before parser code processes untrusted fetched bytes.
- B3/rootless OCI remains the deployment-candidate path.
- Windows-local isolation may be proposed as a separate local-only proof path if it proves AppContainer/restricted identity or equivalent OS boundary, ACL denial, network denial, Job Object lifecycle controls, clean environment, no inherited handles, and Node defense-in-depth.
- Same-user child process, clean environment, Job Object, ACL scratch directory, and Node permission flags alone are not enough.
- Any Windows-local unlock is limited to a later reviewed hidden local-only 2D-C source package for inert text/JSON/passive HTML.
- Deployment readiness remains blocked unless B3 rootless OCI proof passes or a later Windows deployment-candidate package proves the same Windows boundary in production-equivalent deployment.
- Infomaniak managed Node.js hosting must not be assumed to provide the required OS-level denied authority. Deployment-candidate parser execution likely needs an Infomaniak container/custom infrastructure option or a separate isolated parser worker service.

**Sources checked:**
- Node.js v22.15.0 Permissions documentation.
- Microsoft Job Objects documentation.
- Microsoft AppContainer isolation documentation.
- Microsoft `CreateProcessAsUser` documentation.
- Infomaniak managed Node.js Hosting and Jelastic Cloud documentation.

**Warnings:**
- This package authorizes no source edits.
- This package authorizes no parser execution or proof implementation.
- Product/public/live/cache/SR/Evidence/ACS/direct URL/V1 behavior remains blocked.
- Windows local-only proof must not be represented as deployment readiness.
- Do not run a parser as a same-user process inside managed hosting and call that isolated.

**For next agent:**
- Send the B4 decision package to Architect/Security review.
- If accepted, either keep B3 as the next deployment proof path or draft a separate B4 Windows-local proof source package for review.
- Do not implement Windows-local sandbox source until a reviewed source/proof package exists.

**Learnings:** The important invariant is not "container"; it is "denied authority proven before hostile bytes enter parser code." The docs should say that explicitly to avoid cargo-culting OCI while still preventing same-user local parsing from becoming an accidental security boundary.
