# V2 Slice 7N-3B3-2D-B1 Parser Isolation Boundary Selection

**Date:** 2026-05-16
**Status:** deputy-consolidated boundary selection; docs-only; source proof still requires separate package
**Owner role:** Lead Architect / Captain deputy
**Parent package:** `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-B_OS_Level_Parser_Isolation_Package.md`

## 1. Purpose

Select the concrete OS-level denial boundary that the later 2D-B proof package must implement before any 2D-C parser work.

This package is docs-only. It does not authorize source implementation, real fetched-byte parser execution, product/public wiring, live jobs, prompt/model/config/schema changes, cache IO, Source Reliability, Evidence Lifecycle consumption of parsed text, ACS/direct URL execution, V1 reuse, or V1 cleanup.

## 2. Consolidated Decision

Select a locked-down OCI container sandbox as the first proof target.

Preferred runtime:

- rootless OCI runtime in deployment/staging, preferably Podman or an equivalent rootless container runtime;
- Docker Desktop is acceptable only for Windows local proof if Podman is unavailable;
- rootful Docker socket access is not acceptable in deployed runtime because Docker socket authority is effectively host-root.

Current workspace reality:

- `docker` is not on PATH.
- `podman` is not on PATH.
- Therefore the local source proof, when implemented, must fail closed as `parser_isolation_unavailable` or equivalent until an approved OCI runtime is provisioned.
- This package does not claim 2D-C readiness.

## 3. Option Comparison

| Boundary option | Decision | Reason |
|---|---|---|
| Rootless OCI/container sandbox | SELECTED | Best auditable denial story across Windows local proof and deployed Linux/Next runtime: no network, no host filesystem, no inherited env, dropped capabilities, pids/memory/time limits, read-only root, no-new-privileges, and deterministic denial probes. |
| Separate OS user | REJECT for first proof | Requires account provisioning, credentials/service setup or platform-specific ACLs; weak and brittle for network/process denial across Windows/CI/deploy. |
| Windows Job Object/AppContainer | REJECT for first proof | Job Object helps lifecycle/resource control but does not deny filesystem/network/env. AppContainer is closer but Windows-specific and too broad for the first portable proof. |
| Reviewed equivalent | DEFER | Acceptable only if it names an explicit OCI-compatible or equally testable runtime with the same denial probes. Child process, Node flags, static guards, `vm`, or worker threads are not equivalent. |

## 4. Required OCI Runtime Contract

The later source proof must use a synthetic probe only. It must not pass real fetched bytes, 2C-A packet frames, parsed text, source identifiers, provider JSON, or Evidence Lifecycle material into the sandbox.

The proof command must be equivalent to:

```text
<oci-runtime> run --rm -i
  --network none
  --read-only
  --cap-drop ALL
  --security-opt no-new-privileges
  --pids-limit <reviewed low value>
  --memory <reviewed cap>
  --cpus <reviewed cap>
  --user 65534:65534
  --pull never
  --entrypoint node
  <approved-image@sha256:...>
  -
```

Required constraints:

- image reference must be explicitly approved and digest-pinned;
- no image pull during proof;
- no host repo mount;
- no host temp mount unless a later package proves it is empty, dedicated, and non-secret;
- no inherited environment;
- no shell invocation;
- no Docker/Podman socket mounted inside the sandbox;
- probe script passed by stdin or through a reviewed read-only bootstrap mechanism;
- stdout/stderr bounded and sanitized;
- wall-clock timeout and process/container cleanup enforced by the parent.

## 5. Denied Authorities To Prove

The later source proof must show denial of:

- inherited env secrets;
- repo/CWD/config/prompt/database file reads;
- sentinel temp file reads;
- host filesystem writes outside approved scratch;
- outbound network and DNS;
- child process creation;
- worker thread creation;
- native addon loading;
- shell execution;
- Docker/Podman socket access inside the sandbox;
- unbounded stdout/stderr;
- raw bytes, parsed text, URLs, headers, file paths, secrets, provider JSON, evidence, warnings, verdicts, confidence, or report prose in serialized output.

If any denial probe fails, the proof result is blocked and 2D-C remains blocked.

## 6. Fail-Closed Status Contract

Only this status may unlock a later 2D-C parser source proposal:

- `parser_isolation_verified`

All other statuses block 2D-C:

- `parser_isolation_unavailable`
- `parser_isolation_runtime_unapproved`
- `parser_isolation_runtime_not_found`
- `parser_isolation_image_unapproved`
- `parser_isolation_image_unavailable`
- `parser_isolation_probe_failed`
- `parser_isolation_denial_failed`
- `parser_isolation_output_malformed`
- `parser_isolation_output_leak`
- `parser_isolation_timed_out`
- `parser_isolation_cancelled`

Docker/Podman unavailable must not be treated as a skipped success.

## 7. Next Source Proof Package

The next implementation-adjacent package may be:

`Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-B2_OCI_Parser_Isolation_Proof_Source_Package.md`

Candidate source/test envelope, subject to review:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-parser-isolation-proof.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-parser-oci-container-proof.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-isolation-proof.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-oci-container-proof.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- status docs and completion handoff

The proof package must not touch parser consumption, packet sink, content transport, product/orchestrator/API/UI/report/export paths, prompts, configs, model policy, cache/SR, source-acquisition executor, X5 harness, V1, `package.json`, or scripts unless separately reviewed.

## 8. Verifier Expectations

Default safe local suite for the future source proof:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-isolation-proof.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-oci-container-proof.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git diff --check
```

Positive sandbox verifier, only on a provisioned host:

```powershell
$env:FH_ANALYZER_V2_PARSER_SANDBOX_PROOF = "oci_container"
$env:FH_ANALYZER_V2_PARSER_SANDBOX_IMAGE = "<approved-image@sha256:...>"
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-oci-container-proof.test.ts
```

If the positive sandbox verifier cannot run, the proof remains blocked and 2D-C remains blocked.

## 9. Stop Conditions

Stop and return to deputy review before any:

- real fetched-byte parser execution;
- parser output handoff into Evidence Lifecycle;
- product/orchestrator/runner/API/UI/report/export wiring;
- public exposure;
- live jobs;
- prompt/config/model/schema edits;
- cache IO, durable raw/parsed storage, Source Reliability;
- source-acquisition executor or parser consumption changes;
- Docker image pull/build during tests;
- host repo mount into sandbox;
- env forwarding;
- shell invocation;
- Docker socket mount;
- positive `parser_isolation_verified` result when any denial probe fails;
- V1 reuse or V1 cleanup.

## 10. Review Notes Used

- Security/runtime isolation recommended rootless OCI as the best boundary, with Docker Desktop acceptable for Windows local proof and rootless Podman preferred for deployed runtime.
- Senior Developer/runtime feasibility recommended locked-down OCI with fail-closed default because this workspace has no Docker/Podman CLI available.
- LLM/Evidence Lifecycle approved container proof only if parser output remains structural/hidden and no Evidence Lifecycle consumption is authorized.
- Governance requested this docs-only boundary-selection package before any source proof.
