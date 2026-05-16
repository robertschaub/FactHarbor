# V2 Slice 7N-3B3-2D-B2 OCI Parser Isolation Proof Source Package

**Date:** 2026-05-16
**Status:** deputy-approved source package; implementation may proceed only inside this exact proof-only envelope
**Owner role:** Lead Architect / Captain deputy
**Parent packages:**
- `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-B_OS_Level_Parser_Isolation_Package.md`
- `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-B1_Parser_Isolation_Boundary_Selection.md`
**Baseline:** `97e8c486` (`docs: select v2 parser isolation boundary`)

## 1. Purpose

Define the exact source package that may implement a hidden, non-product OCI parser-isolation proof.

This package proves whether the selected sandbox boundary is present and denies the authorities required before any later 2D-C parser source proposal. It does not parse real fetched bytes, does not consume 2C-A packets, does not produce parsed text, and does not wire anything into Evidence Lifecycle, product runtime, public result projections, reports, exports, live jobs, cache IO, Source Reliability, prompts, models, configs, schemas, ACS/direct URL, V1 reuse, or V1 cleanup.

## 1.1 Approval Traceability

Source approval required before coding:

- This 2D-B2 package must receive explicit deputy review approval.
- The review result, reviewer roles, reviewer verdicts, and required modifications must be recorded in this file before source implementation starts.
- If review returns `modify` or `reject`, do not implement source.

Reviewers must treat this package as a security proof package, not as parser implementation approval.

Initial deputy review:

- LLM/Evidence Lifecycle reviewer: `APPROVE`.
- Governance/traceability reviewer: `APPROVE`.
- Senior Developer/runtime implementability reviewer: `MODIFY`.
- Security/runtime isolation reviewer: `MODIFY`.

Required modifications applied in this draft:

- added an explicit runtime/image approval contract instead of treating any digest-pinned image as approved;
- distinguished local-only proof from deployment-candidate proof so Docker Desktop/rootful Docker cannot be mistaken for deployment-safe parser isolation;
- made absolute approved runtime executable paths mandatory for positive real verifier runs;
- added a concrete forbidden OCI escape-flag list;
- added tests for digest-pinned-but-unapproved images, unsupported Node permission flags, rootful/unknown runtime authority in deployment mode, and untracked/forbidden file drift.

Final deputy re-review:

- Security/runtime isolation reviewer: `APPROVE`; prior blockers resolved by explicit runtime/image approval, deployment-candidate/rootless distinction, absolute runtime path requirement, forbidden host-escape flag guards, and untracked-aware verifier.
- Senior Developer/runtime implementability reviewer: `APPROVE`; prior blockers resolved, the two-TypeScript-file envelope is implementable in the current `noEmit` setup, and local Docker/Podman absence is correctly fail-closed.
- LLM/Evidence Lifecycle reviewer: `APPROVE`; package remains proof-only and does not introduce semantic analysis or Evidence Lifecycle consumption.
- Governance/traceability reviewer: `APPROVE`; approval traceability, exact envelope, stop conditions, and live-job prohibition are sufficient.

Consensus approval is limited to implementing this OCI isolation proof inside the exact source/test envelope below. Parser execution, packet consumption, product/public/live wiring, prompts/config/model/schema, cache/SR/storage, evidence/report semantics, ACS/direct URL, V1 reuse, and V1 cleanup remain blocked by later gates.

## 2. Package Decision

If approved, 2D-B2 may implement only:

- a hidden structural isolation-proof contract;
- an OCI container proof owner that builds and invokes a synthetic denial probe;
- default fail-closed behavior when no approved OCI runtime or image is supplied;
- status values proving `parser_isolation_verified` or a blocked reason;
- focused tests proving default local unavailability, command construction, denied-authority result mapping, output sanitization, timeout/cancel handling, and boundary guards.

2D-B2 must not implement:

- parser execution over real fetched bytes;
- parser execution over fixture/control bytes;
- 2C-A packet/frame consumption;
- source-acquisition executor wiring;
- product/orchestrator/runner/API/UI/report/export reachability;
- live jobs or Captain canary runs;
- prompt/config/model/schema edits;
- cache IO, durable raw/parsed storage, Source Reliability;
- evidence items, EvidenceCorpus, applicability, extraction, sufficiency, warning materiality, verdicts, confidence, or report prose;
- semantic text-analysis logic;
- ACS/direct URL execution;
- V1 analyzer, prompt, type, retrieval, search, parser, helper reuse, or cleanup.

## 3. Exact Source Envelope

Allowed production files:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-parser-isolation-proof.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-parser-oci-container-proof.ts`

Allowed test files:

- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-isolation-proof.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-oci-container-proof.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Allowed documentation and handoff files:

- this package;
- `Docs/STATUS/Current_Status.md`;
- `Docs/STATUS/Backlog.md`;
- one completion handoff under `Docs/AGENTS/Handoffs/`;
- `Docs/AGENTS/Agent_Outputs.md`, only if the active agent uses the standard exchange log instead of a handoff.

Forbidden files:

- parser consumption files such as `source-acquisition-content-parser.ts`;
- packet sink files;
- content transport files;
- source-acquisition candidate/network/content execution files;
- Evidence Lifecycle files;
- product/orchestrator/runner/API/UI/report/export files;
- compatibility-view files;
- prompt files;
- config defaults or config schemas;
- model policy, cache policy, Source Reliability, or UCM files;
- V1 analyzer files;
- `package.json`;
- `package-lock.json`;
- scripts;
- `Docs/AGENTS/V2_Gate_Register.json`.

No source package may edit outside this exact reviewed file envelope.

## 4. Runtime Contract

The proof must use a synthetic probe only. It must not pass real fetched bytes, fixture/control bytes, 2C-A packet frames, parsed text, source identifiers, URLs, headers, provider JSON, evidence, report material, or V1-shaped data into the sandbox.

The OCI command must be equivalent to:

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
  --experimental-permission
  --no-addons
  --disable-proto=throw
  -
```

If the approved Node image does not support the required Node runtime restrictions, the proof must fail closed as `parser_isolation_probe_failed` or `parser_isolation_image_unapproved`; it must not fall back to container-only success.

OCI is the primary OS-level boundary. Node permission flags and `--no-addons` are required defense in depth so that child process creation, worker thread creation, native addon loading, and arbitrary filesystem access are denied inside the container by the probe itself.

## 5. Source Contract

`source-acquisition-content-parser-isolation-proof.ts` may define:

- `PARSER_ISOLATION_PROOF_CONTRACT_VERSION`;
- status and result types for parser-isolation proof outcomes;
- a structural `buildParserIsolationUnavailableResult(...)`;
- shared validation helpers for approved runtime kind, approved image reference, bounded output, timeout, and denial-probe result shape;
- no `node:child_process` import.

`source-acquisition-content-parser-oci-container-proof.ts` may define:

- `OCI_PARSER_ISOLATION_PROOF_VERSION`;
- an OCI proof options type;
- `runOciParserIsolationProof(...)`;
- an injectable process-spawn boundary used only by tests to simulate OCI runtime behavior;
- runtime command construction and result mapping.

No barrel export is allowed. Product code must not import either file.

## 6. Activation And Configuration

Production code must not read process environment to activate this proof.

The source functions must take explicit options from their caller. Positive verifier tests may read the following environment variables in test code only:

- `FH_ANALYZER_V2_PARSER_SANDBOX_PROOF`
- `FH_ANALYZER_V2_PARSER_SANDBOX_IMAGE`
- `FH_ANALYZER_V2_PARSER_SANDBOX_RUNTIME`

Default behavior without explicit approved options:

- no runtime invocation;
- no container command construction using guessed values;
- result status `parser_isolation_unavailable`.

Runtime executable selection:

- `podman` or `docker` by name is acceptable only in mocked unit tests for command-construction coverage;
- a positive real verifier run must use an explicitly approved absolute runtime executable path;
- a by-name runtime command must never be enough for a real `parser_isolation_verified` result;
- rootful Docker socket authority remains rejected for deployed runtime even if a local Docker Desktop proof can run.

Container runtime CLI environment:

- do not forward inherited environment by default;
- if a Windows or rootless runtime requires minimal CLI environment keys, the exact allowlist must be named in the implementation handoff and tests must prove no sentinel secret key is forwarded into the container;
- no container `--env`, env-file, host config mount, host repo mount, or runtime socket mount is allowed.

## 6.1 Runtime And Image Approval Contract

The source proof must not infer approval from string format alone.

Approved proof options must carry all of:

- proof scope: `local_only` or `deployment_candidate`;
- runtime kind: `podman` or `docker`;
- runtime executable absolute path;
- runtime authority: `rootless_oci`, `windows_docker_desktop_local`, or `unknown_or_rootful`;
- exact approved image reference list;
- selected image reference, which must exactly match one approved image and must include `@sha256:`;
- approved Node restriction profile id.

Approval rules:

- digest-pinned but unapproved images return `parser_isolation_image_unapproved`;
- non-absolute runtime executable paths return `parser_isolation_runtime_unapproved` for positive real verifier runs;
- `proofScope = deployment_candidate` requires `runtimeAuthority = rootless_oci`;
- `proofScope = deployment_candidate` with Docker Desktop, rootful Docker, unknown socket authority, or by-name runtime returns `parser_isolation_runtime_unapproved`;
- a Windows Docker Desktop proof may be recorded only as `local_only` and must not be treated as deployment-safe or sufficient by itself for 2D-C readiness.

2D-C remains blocked unless the final handoff records whether a positive verifier actually ran and whether the result was `deployment_candidate` or only `local_only`.

## 7. Status Contract

Only this status, combined with `proofScope = deployment_candidate` and `runtimeAuthority = rootless_oci`, may unlock a later 2D-C source proposal:

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

## 8. Denial Probe Requirements

The synthetic probe must attempt and report structural pass/fail booleans for:

- inherited env secret read;
- host repo/CWD/config/prompt/database file read;
- sentinel temp file read;
- host filesystem write outside approved scratch;
- outbound network and DNS;
- child process creation;
- worker thread creation;
- native addon loading;
- shell execution;
- Docker/Podman socket access inside the sandbox;
- stdout/stderr output bounds;
- output leakage scan.

If any required denial is not observed, the result status must be `parser_isolation_denial_failed`.

The probe output may contain only:

- proof version;
- runtime kind;
- image digest reference hash or explicit approved-image reference;
- status;
- denied-authority boolean map;
- sanitized stop reason;
- bounded timing and exit metadata;
- no raw probe script, raw stdout/stderr, file paths, env values, URLs, headers, source identifiers, evidence, warning, verdict, confidence, report prose, prompt/model telemetry, or V1 identifiers.

## 9. Import And Export Constraints

Allowed imports for `source-acquisition-content-parser-isolation-proof.ts`:

- structural TypeScript/Zod-free code only unless reviewers explicitly approve a small schema library already used in analyzer-v2-runtime;
- `node:crypto` only if needed to hash approved image/runtime metadata without leaking raw values;
- no `node:child_process`;
- no `node:fs` unless review modifies this package.

Allowed imports for `source-acquisition-content-parser-oci-container-proof.ts`:

- `node:child_process` with `spawn` only;
- `node:crypto` for hashing proof metadata only;
- no `node:fs` by default;
- no `shell: true`;
- no network/fetch/search/provider SDK/cache/storage/config/SR/product/public/Evidence Lifecycle/V1 imports.

Exact exported functions and types must be named in the implementation and covered by boundary guards. If implementation needs additional exports, update this package and re-review before coding.

## 10. Boundary Guard Updates

Boundary guards must prove:

- the exact production/test file envelope;
- no barrel export;
- no product/public/orchestrator/runner/API/UI/report/export transitive reachability;
- no parser, packet sink, content transport, source-acquisition executor, Evidence Lifecycle, cache, Source Reliability, prompt/model/config, UCM, ACS/direct URL, or V1 imports;
- only `source-acquisition-content-parser-oci-container-proof.ts` may import `node:child_process`;
- any `spawn` call uses `shell: false`, `windowsHide: true`, pipe/ignore stdio only, bounded timeout, and no inherited environment by default;
- no Docker/Podman image pull/build flags;
- no host repo mount, env forwarding, shell entrypoint, runtime socket mount, or product data arguments.
- explicit rejection of host-escape OCI flags, including `--privileged`, `--cap-add`, `--device`, `--network host`, `--network=host`, `--pid host`, `--pid=host`, `--ipc host`, `--ipc=host`, `--uts host`, `--uts=host`, `--userns host`, `--userns=host`, `--mount`, `--volume`, `-v`, `--env`, `-e`, `--env-file`, `--dns`, `--add-host`, Docker/Podman socket paths, shell entrypoints, `seccomp=unconfined`, `apparmor=unconfined`, and equivalent runtime-specific host-escape flags.

## 11. Required Tests

The source package must add or update tests proving:

- default call with no runtime/image returns `parser_isolation_unavailable`;
- unapproved runtime kind returns `parser_isolation_runtime_unapproved`;
- missing runtime returns `parser_isolation_runtime_not_found`;
- non-digest image reference returns `parser_isolation_image_unapproved`;
- unavailable image/runtime output maps to `parser_isolation_image_unavailable` or `parser_isolation_runtime_not_found`;
- constructed OCI command contains required denial flags and no pull/build/mount/env/socket flags;
- constructed OCI command rejects contradictory escape flags, including `--privileged`, `--cap-add`, `--device`, `--network host`, `--network=host`, `--pid host`, `--pid=host`, `--ipc host`, `--ipc=host`, `--uts host`, `--uts=host`, `--userns host`, `--userns=host`, `--mount`, `--volume`, `-v`, `--env`, `-e`, `--env-file`, `--dns`, `--add-host`, Docker/Podman socket paths, shell entrypoints, `seccomp=unconfined`, `apparmor=unconfined`, and equivalent runtime-specific host-escape flags;
- constructed Node arguments contain `--experimental-permission`, `--no-addons`, and `--disable-proto=throw`;
- digest-pinned but unapproved image references return `parser_isolation_image_unapproved`;
- deployment-candidate proof rejects rootful/unknown runtime authority, Docker Desktop local authority, and by-name runtime commands;
- unsupported Node permission flags, such as `node: bad option` or a non-JSON exit caused by unsupported flags, map to `parser_isolation_probe_failed` or `parser_isolation_image_unapproved`;
- simulated all-denied probe returns `parser_isolation_verified`;
- simulated env, filesystem, network, child, worker, native addon, shell, socket, stdout/stderr, or leak failure returns `parser_isolation_denial_failed` or the more specific blocked status;
- malformed, extra-field-bearing, oversize, or leaking probe output fails closed;
- timeout and cancellation kill the runtime process and return structural blocked statuses;
- no raw stdout/stderr, file paths, env values, URLs, headers, source identifiers, provider JSON, evidence, warning, verdict, confidence, report prose, prompt/model telemetry, or V1 identifiers appear in serialized results;
- test-only positive verifier is gated by explicit environment variables and otherwise asserts local fail-closed unavailable behavior;
- boundary guards enforce import/export/file-envelope restrictions.

## 12. Minimum Verifiers

If deputy review approves implementation, run at least:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-isolation-proof.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-oci-container-proof.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git diff --check
git diff --cached --check
git status --short --untracked-files=all -- apps/web/src apps/web/test apps/web/prompts apps/web/configs apps/api apps/api.Tests scripts package.json package-lock.json Docs/AGENTS/V2_Gate_Register.json
```

Positive sandbox verifier, only on a provisioned host:

```powershell
$env:FH_ANALYZER_V2_PARSER_SANDBOX_PROOF = "oci_container"
$env:FH_ANALYZER_V2_PARSER_SANDBOX_RUNTIME = "<approved-runtime-or-absolute-path>"
$env:FH_ANALYZER_V2_PARSER_SANDBOX_IMAGE = "<approved-image@sha256:...>"
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-oci-container-proof.test.ts
```

If the positive sandbox verifier cannot run, the proof remains blocked and 2D-C remains blocked.

No expensive tests and no live jobs are approved by 2D-B2.

## 13. Review Questions

Deputy reviewers must answer:

1. Is this source envelope narrow enough for a proof-only package?
2. Is OCI plus Node runtime restrictions sufficient to test the required denial properties?
3. Is the default local behavior correctly fail-closed when Docker/Podman are unavailable?
4. Are runtime/image approval and digest-pinning constraints strong enough?
5. Is process environment handling safe enough for Windows local proof and rootless deployment proof?
6. Are denied-authority probes complete enough before 2D-C parser work?
7. Are outputs sufficiently structural and non-leaking?
8. Are boundary guards sufficient to prevent product/public/parser/Evidence Lifecycle/V1 reachability?
9. Are positive sandbox verifier rules clear enough to prevent false `parser_isolation_verified` results?
10. Are any source files, tests, or verifiers missing from the exact envelope?

Return `approve`, `modify`, or `reject`. If any answer is uncertain, do not implement source.

## 14. Reviewer Prompt

> Review `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-B2_OCI_Parser_Isolation_Proof_Source_Package.md` as a proposed V2 source package for an OCI parser-isolation proof. Return `approve`, `modify`, or `reject`. Confirm that no source implementation is authorized until approval is recorded. Verify that the package is proof-only: no real fetched-byte parsing, no fixture/control parsing, no 2C-A packet consumption, no parser output into Evidence Lifecycle, no product/public/API/UI/report/export wiring, no live jobs, no prompt/config/model/schema edits, no cache/SR/storage, no semantic text-analysis logic, no ACS/direct URL, no V1 reuse, and no V1 cleanup. Pay special attention to whether OCI plus Node runtime restrictions is enough to deny child/worker/native-addon/filesystem/network/shell/socket authorities, whether Docker/Podman absence fails closed, whether rootful Docker socket authority remains rejected for deployment, whether positive verifier rules prevent false success, and whether the source/test envelope and boundary guards are narrow enough.

## 15. Stop Conditions

Stop and return to deputy review or Captain escalation before any of these:

- source implementation before deputy approval is recorded;
- source edits outside the exact 2D-B2 envelope;
- parser execution over real fetched bytes;
- parser execution over fixture/control bytes;
- 2C-A packet/frame consumption;
- product/orchestrator/runner/API/UI/report/export wiring;
- public exposure;
- live jobs or Captain canary runs;
- prompt/config/model/schema edits;
- cache IO, durable raw/parsed storage, or Source Reliability integration;
- semantic text-analysis code;
- Docker image pull/build during tests;
- host repo mount into sandbox;
- env forwarding into the container;
- shell invocation;
- Docker/Podman socket mount;
- positive `parser_isolation_verified` when any denial probe fails;
- ACS/direct URL execution;
- V1 reuse or V1 cleanup.
