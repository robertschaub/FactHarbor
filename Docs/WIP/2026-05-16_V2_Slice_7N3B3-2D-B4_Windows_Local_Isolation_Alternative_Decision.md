# V2 Slice 7N-3B3-2D-B4 Windows Local Isolation Alternative Decision

**Date:** 2026-05-16
**Status:** draft review package; docs-only; no source edits approved
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `2121966a` (`docs: prepare v2 provisioned oci proof gate`)
**Predecessors:**
- `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-B_OS_Level_Parser_Isolation_Package.md`
- `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-B1_Parser_Isolation_Boundary_Selection.md`
- `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-B3_Provisioned_OCI_Deployment_Candidate_Proof_Package.md`

## 1. Purpose

Record the answer to Captain's challenge:

> Why is a container needed? Why not run the parser locally on Windows?

The answer is: a container is not intrinsically required. A proven isolation boundary is required before parser code processes untrusted fetched bytes. OCI/rootless container isolation remains the current deployment-candidate option, but Windows-local isolation may be proposed as a separate local-only path if it proves equivalent denial properties for a limited parser tier.

This package is docs-only. It authorizes no source edits, parser execution, product/public wiring, live jobs, prompt/config/model/schema changes, cache IO, Source Reliability, Evidence Lifecycle consumption, ACS/direct URL execution, V1 reuse, or V1 cleanup.

## 2. Expert Consultation Summary

Consulted roles:

- Architect / risk-tier reviewer: recommends supplementing B3, not replacing it.
- Security / runtime isolation reviewer: recommends keeping rootless OCI as deployment-candidate, adding only a separate Windows-local proof if it is a real OS boundary.
- Senior Developer / Windows implementability reviewer: recommends OCI for deployment readiness; Windows-local proof is practical only for local-only inert parser development unless production uses the same Windows sandbox.

Consensus:

- Do not treat a normal Windows child process as isolation.
- Do not treat Node permission flags, clean environment, Job Object, or ACL scratch directory alone as enough.
- Keep B3 as the rootless OCI deployment-candidate gate.
- Add a possible B4 Windows-local proof path only as a separate reviewed package.
- A Windows-local proof may at most unlock local-only 2D-C development/testing for inert text/JSON/passive HTML, not deployment readiness, unless the deployed runtime is Windows and proves the same boundary.

## 3. Decision

Keep OCI/rootless container as the currently approved deployment-candidate proof path.

Supplement with a Windows-local isolation proof option:

- Status name: `windows_local_isolation_verified`
- Proof scope: `local_only`
- Candidate authority names:
  - `windows_appcontainer_local`
  - `windows_restricted_user_local`
- A later deployment authority is possible only if production/staging is Windows and proves the same isolation mechanism:
  - `windows_appcontainer_deployment_candidate`
  - `windows_restricted_user_deployment_candidate`

Windows-local proof does not replace B3 and does not weaken B3. It adds a second, narrower path for local-only parser development if Captain wants progress before a rootless OCI host is provisioned.

## 4. Parser Risk Tiers

| Parser tier | Minimum acceptable proof | Unlock effect |
|---|---|---|
| Inert `text/plain`, structural `application/json`, passive `text/html` | Windows OS boundary proof or OCI proof. For Windows: restricted identity/AppContainer or equivalent, ACL denial, network denial, Job Object lifecycle limits, clean env, no inherited handles, Node defense-in-depth, and denial probes. | May unlock only hidden local-only 2D-C source package for inert structural parsing after separate review. |
| Pure JavaScript parser library | Same as inert tier plus library approval: pinned version, no native addon/WASM/browser execution, no dynamic runtime loading, no fs/network/cache/SR/product imports, malformed-input tests. | Local-only unless deployment-equivalent proof passes. |
| PDF, browser, native, WASM, office, image/OCR, archives | Rootless OCI or stronger deployment-equivalent sandbox. Windows-local proof is acceptable only if production uses the same Windows sandbox and proves it there. | Not part of 2D-C. Requires later high-risk package. |

`text/html` is passive only: no browser, no script execution, no subresource loading, no link following, no rendering engine.

## 5. Why Plain Windows Local Process Is Not Enough

A normal child process on Windows runs with the same user authority unless a restricted token/AppContainer or equivalent boundary is applied. Clean environment and `shell: false` reduce accidental leakage, but they do not deny filesystem or network authority.

Node permission flags are useful defense in depth, but Node's own documentation states that the permission model does not protect against malicious code and can be bypassed by malicious code. It also documents constraints such as file access via other modules, setup-time flags, existing file descriptors, and symbolic-link behavior.

Windows Job Objects manage process groups and limits, including process-tree termination and resource controls. They are useful for lifecycle control, but they are not by themselves a filesystem, network, or environment-secret denial boundary.

Windows process creation APIs require explicit control of environment blocks, current directory, executable path, handle inheritance, and token identity. Defaults can inherit the parent's environment, current directory, handles, or ambiguous executable lookup behavior.

Therefore the Windows-local option must prove an OS boundary, not just process hygiene.

## 6. Minimum Windows-Local Boundary

A later B4 source/proof package must choose exactly one primary Windows authority model:

- AppContainer with no network capability unless explicitly reviewed; or
- restricted low-privilege user/token with ACL and network policy proof; or
- another reviewed Windows OS sandbox with equivalent denial properties.

Required supporting controls:

- ACLs deny reads from repo root, prompts, configs, `.env*`, package files, API database files, user profile sentinels, and other non-sandbox paths.
- One explicit scratch directory is writable if needed; writes elsewhere are denied.
- Job Object enforces process tree containment, kill-on-close, timeout, CPU/memory/process limits, and no breakaway.
- Process starts from an absolute executable path, with no shell and no PATH lookup.
- Environment is empty or strictly allowlisted.
- No inherited handles except explicitly approved pipes.
- Current directory is outside the repository and outside sensitive paths.
- Node defense-in-depth flags deny child process, worker thread, native addon, WASI, arbitrary filesystem access, and inspector where supported.
- Network/DNS/loopback is denied and tested.

## 7. Required Denial Probes

A Windows-local proof must show denial or containment of:

- restricted identity: AppContainer SID or restricted user/token, no admin token, no dangerous privileges;
- environment secret read and leak;
- repo root read;
- `apps/web/prompts` read;
- `apps/web/configs` read;
- `.env*` read;
- `apps/api/factharbor.db` read;
- package and source-tree read outside approved runner/bootstrap files;
- user-profile sentinel read;
- write outside approved scratch;
- DNS and outbound network;
- loopback and local app/API port access;
- link-local metadata IP access;
- child process creation: `cmd.exe`, PowerShell, `node`, and arbitrary executable spawn;
- shell execution;
- worker thread creation;
- native addon loading;
- WASI or equivalent host escape;
- Docker/Podman named pipe or socket access;
- inherited handle access;
- process breakaway and orphan process survival after timeout/cancel;
- stdout/stderr bounds and leakage;
- serialized-result leakage of raw bytes, parsed text, paths, URLs, env values, provider JSON, evidence, warnings, verdicts, confidence, or report prose.

Any failed probe returns a structural blocked result and keeps 2D-C blocked.

## 8. Unacceptable Shortcuts

These are not acceptable for real fetched-byte parser execution:

- same-user child process;
- clean environment only;
- `shell: false` only;
- Job Object only;
- ACL scratch directory only;
- Node permission flags only;
- Node `vm`;
- worker threads;
- browser parsing;
- output scanning as a substitute for denied authority;
- "no URL passed" as a substitute for network denial;
- current directory inside the repository;
- PATH lookup or partial executable paths;
- PowerShell or `cmd.exe` invocation;
- local-only proof represented as deployment readiness.

## 9. Acceptance And Unlock Rules

Windows-local proof can unlock only:

- drafting a separate reviewed 2D-C local-only source package;
- inert text/JSON/passive HTML structural parser work;
- hidden tests and hidden parsed-material artifacts only.

It cannot unlock:

- deployment readiness;
- product/orchestrator/runner/API/UI/report/export wiring;
- live jobs;
- public output;
- Evidence Lifecycle consumption;
- cache/SR/storage;
- prompt/model/config/schema changes;
- ACS/direct URL execution;
- V1 cleanup.

Deployment readiness remains blocked unless either:

- B3 rootless OCI proof passes as `parser_isolation_verified`, `deployment_candidate`, `rootless_oci`; or
- a later Windows deployment-candidate package proves the same Windows boundary in production-equivalent staging/deployment and receives Architect/Security acceptance.

## 10. Infomaniak Deployment Implication

If the current production target is Infomaniak managed Node.js hosting, do not assume either rootless OCI or Windows-local AppContainer-style isolation is available inside that hosting mode.

Implications:

- A Windows-local proof is useful for local developer progress only unless production/staging is also Windows and provides the same Windows sandbox.
- If Infomaniak deployment remains a managed Node.js site, deployment-candidate parser execution should stay blocked unless Infomaniak explicitly provides the required OS-level denial boundary in that environment.
- A deployment-candidate OCI proof likely requires moving the parser runtime, or the whole V2 runtime, to an Infomaniak offering that supports containerized/custom infrastructure, such as Jelastic Cloud, Public Cloud, Kubernetes, or an equivalent isolated worker service.
- The cleaner transition is likely a separate hidden parser worker service with an internal contract, while the public web/API deployment remains unchanged until later cutover. That keeps the blast radius smaller than moving the whole application first.
- If the hosting architecture is not changed, the safe fallback is to keep real fetched-byte parser execution disabled in deployment and continue with hidden/local-only structural tests only.

Do not silently run the parser as a same-user process inside managed Node.js hosting and call it isolated. That would violate the denied-authority invariant.

## 11. Sources Checked

- Node.js v22.15.0 Permissions documentation: Node permission model is a useful restriction mechanism but not a malicious-code sandbox.
- Microsoft Job Objects documentation: Job Objects manage and limit process groups, including termination and resource controls.
- Microsoft AppContainer isolation documentation: AppContainer provides network and process/window isolation through Windows sandboxing.
- Microsoft `CreateProcessAsUser` documentation: process creation needs explicit token, environment, current directory, executable path, and handle-inheritance control.
- Infomaniak Node.js Hosting documentation: managed Node.js hosting runs Node applications without users managing server infrastructure.
- Infomaniak Jelastic Cloud documentation/product pages: Jelastic supports containerized environments and Docker/Podman/LXC/Kubernetes-style deployment options.

## 12. Review Questions

Reviewers must answer:

1. Is it correct to keep B3 as the deployment-candidate path while adding Windows-local as a supplementary local-only option?
2. Are the parser risk tiers conservative enough?
3. Is the minimum Windows-local boundary strong enough before local-only 2D-C source can be proposed?
4. Are Node permission flags, Job Object, and clean env correctly classified as supporting controls rather than full isolation?
5. Are the denial probes complete enough?
6. Are the unlock rules narrow enough to prevent accidental deployment or product/public exposure?
7. Are Infomaniak deployment implications clear enough, especially the distinction between managed Node.js hosting and container/custom infrastructure?

Return `approve`, `modify`, or `reject`. If review returns `modify` or `reject`, do not draft a Windows-local source/proof package until this decision package is corrected and re-reviewed.

## 13. Reviewer Prompt

> Review `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-B4_Windows_Local_Isolation_Alternative_Decision.md` as a docs-only decision package responding to Captain's challenge that parser isolation may not require containers. Return `approve`, `modify`, or `reject`. Confirm that the package keeps B3/rootless OCI as the deployment-candidate path, adds Windows-local isolation only as a separate local-only proof option, rejects same-user child process / Node permission flags / Job Object / clean env alone, and keeps 2D-C blocked until a later reviewed proof package passes. Verify that parser scope remains inert text/JSON/passive HTML only for any local-only unlock, and that product/public/live/cache/SR/Evidence/V1 behavior remains blocked. Also verify that the Infomaniak deployment implication is clear: managed Node.js hosting must not be assumed to provide the required OS-level boundary, and deployment-candidate parser execution likely requires a container/custom infrastructure option or separate isolated parser worker.

## 14. Stop Conditions

Stop before any:

- source edits;
- parser execution;
- proof implementation;
- product/public/API/UI/report/export wiring;
- live jobs;
- prompt/config/model/schema edits;
- cache/SR/storage/Evidence Lifecycle consumption;
- ACS/direct URL execution;
- V1 reuse or cleanup;
- treating Windows local-only proof as deployment readiness.
