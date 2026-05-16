# V2 Slice 7N-3B3-2D-B3 Provisioned OCI Deployment-Candidate Proof Package

**Date:** 2026-05-16
**Status:** draft review package; docs-only; no source edits approved
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `cdd5f934` (`feat: add v2 oci parser isolation proof`)
**Predecessor:** `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-B2_OCI_Parser_Isolation_Proof_Source_Package.md`

## 1. Purpose

Define the next gate after B2 when the local host cannot run Docker or Podman.

B2 implemented the hidden proof-only OCI parser-isolation contract and failed closed locally as `parser_isolation_unavailable`. B3 is the execution package for a positive deployment-candidate proof on a provisioned rootless OCI host.

B3 does not approve 2D-C parser source. It only approves collecting proof evidence that may later be used by Architect/Security reviewers to decide whether a separate 2D-C source package may be drafted.

## 2. Current State

- Current workspace `C:\DEV\FactHarbor` is clean after B2 and governance commits.
- B2 source is committed at `cdd5f934`.
- Governance artifacts are committed separately at `16e865dc`.
- Local `docker` and `podman` commands are unavailable on this machine.
- Therefore no positive `deployment_candidate` proof has been recorded.
- 2D-C remains blocked.

## 3. Package Decision

B3 may do only:

- run the existing B2 positive sandbox verifier on a provisioned host;
- use an independent pre-run image approval record as the authority for the selected image;
- record whether the proof result is `parser_isolation_verified`, `parser_isolation_unavailable`, `parser_isolation_runtime_unapproved`, `parser_isolation_runtime_not_found`, `parser_isolation_image_unapproved`, `parser_isolation_image_unavailable`, `parser_isolation_probe_failed`, `parser_isolation_denial_failed`, `parser_isolation_output_malformed`, `parser_isolation_output_leak`, `parser_isolation_timed_out`, or `parser_isolation_cancelled`;
- record proof scope, runtime authority, runtime kind, approved image reference hash/digest metadata, denial-authority booleans, bounded sanitized stop reason, and verifier command output;
- update status and handoff docs with the result.

B3 must not do:

- source edits;
- parser execution over real fetched bytes;
- parser execution over fixture/control bytes;
- 2C-A packet/frame consumption;
- product/orchestrator/runner/API/UI/report/export wiring;
- live jobs or Captain canary runs;
- prompt/config/model/schema edits;
- cache IO, durable storage, Source Reliability;
- evidence/report/warning/verdict/confidence generation;
- ACS/direct URL execution;
- V1 reuse or V1 cleanup;
- Docker image pull/build during tests;
- host repo mount into the sandbox;
- env forwarding into the container;
- shell invocation;
- Docker/Podman socket mount;
- treating local absence, local-only proof, rootful Docker, Docker Desktop, or unknown runtime authority as deployment-safe.

## 4. Required Provisioned Host Contract

The positive proof host must provide:

- rootless OCI runtime authority, preferably rootless Podman;
- an explicitly approved absolute runtime executable path;
- an independently approved digest-pinned Node image reference;
- a pre-run image approval record naming the exact image reference, digest, approver or approval source, and date or handoff reference;
- the approved image already present locally on the host, because tests must not pull or build images;
- no need to mount the repository into the sandbox;
- no need to forward environment variables into the container;
- no Docker/Podman socket exposed inside the container;
- enough local permissions to run the B2 test suite from the checked-out repository without changing product source.

Deployment-candidate proof requires:

- `proofScope = deployment_candidate`;
- `runtimeAuthority = rootless_oci`;
- status `parser_isolation_verified`;
- all required denied-authority booleans true.

Any other status or authority keeps 2D-C blocked.

## 5. Approved Command Shape

The test harness must set only these host-side environment variables:

```powershell
$env:FH_ANALYZER_V2_PARSER_SANDBOX_PROOF = "oci_container"
$env:FH_ANALYZER_V2_PARSER_SANDBOX_RUNTIME = "<absolute-rootless-oci-runtime-path>"
$env:FH_ANALYZER_V2_PARSER_SANDBOX_IMAGE = "<approved-node-image@sha256:...>"
$env:FH_ANALYZER_V2_PARSER_SANDBOX_APPROVED_IMAGE = "<same-approved-node-image@sha256:...>"
$env:FH_ANALYZER_V2_PARSER_SANDBOX_IMAGE_APPROVAL_SOURCE = "<independent-approval-record-or-handoff-reference>"
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-oci-container-proof.test.ts
```

The image reference in `FH_ANALYZER_V2_PARSER_SANDBOX_IMAGE` must exactly match `FH_ANALYZER_V2_PARSER_SANDBOX_APPROVED_IMAGE`, and the latter must be copied from the independent pre-run approval record. A digest-pinned but unapproved image is not acceptable.

The approved image list must come from an independent pre-run approval record, not from `FH_ANALYZER_V2_PARSER_SANDBOX_IMAGE` itself. The test branch must not run the positive proof unless `FH_ANALYZER_V2_PARSER_SANDBOX_APPROVED_IMAGE` is present, exactly matches the configured image, and `FH_ANALYZER_V2_PARSER_SANDBOX_IMAGE_APPROVAL_SOURCE` is present as a separate approval-record or handoff reference. A run is rejected for B3 acceptance if the only evidence of image approval is the same environment value echoed into the B2 test's `approvedImageReferences` option.

The runtime path must be absolute. A by-name command such as `podman` or `docker` is not enough for a positive real verifier result.

## 6. Evidence To Record

The proof handoff must record:

- host operating system and runtime family;
- absolute runtime executable path, but not secrets or host-private paths beyond the runtime path needed for audit;
- runtime authority classification;
- image reference and digest;
- approved image env reference, independent image approval source, and exact-match comparison against the configured env image;
- verifier command used;
- whether the test process attempted any image pull/build; expected answer: no;
- final proof status;
- proof scope;
- denied-authority boolean summary;
- whether any stdout/stderr leak, malformed output, timeout, or cancellation occurred;
- final statement whether 2D-C remains blocked.

If the result is not `parser_isolation_verified` with `deployment_candidate` and `rootless_oci`, record the blocked reason and stop.

## 7. Minimum Verifiers

Before running the positive sandbox verifier on the provisioned host, confirm the repository is at or after B2:

```powershell
git log --oneline -5
git status --short --untracked-files=all
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-isolation-proof.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-oci-container-proof.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
```

Then run the positive verifier command in Section 5.

Afterward run:

```powershell
git diff --check
git status --short --untracked-files=all -- apps/web/src apps/web/test apps/web/prompts apps/web/configs apps/api apps/api.Tests scripts package.json package-lock.json Docs/AGENTS/V2_Gate_Register.json
```

No expensive tests and no live jobs are approved by B3.

## 8. Acceptance Criteria

B3 is accepted only if:

- the positive verifier ran on a provisioned host with rootless OCI authority;
- an independent pre-run image approval record exists and exactly matches the configured env image;
- the positive verifier used `FH_ANALYZER_V2_PARSER_SANDBOX_APPROVED_IMAGE` as the approved-image input and did not self-derive the allowlist from `FH_ANALYZER_V2_PARSER_SANDBOX_IMAGE`;
- final status is `parser_isolation_verified`;
- proof scope is `deployment_candidate`;
- runtime authority is `rootless_oci`;
- denied-authority booleans all pass;
- no pull/build/mount/env/socket/shell behavior occurred;
- no source, prompt, config, model, schema, product, API, UI, report, export, cache, SR, storage, Evidence Lifecycle, ACS/direct URL, or V1 files changed;
- Architect and Security reviewers accept the recorded evidence.

If any criterion is not met, B3 records a blocked proof and 2D-C remains blocked.

## 9. What B3 Can Unlock

A successful B3 does not itself implement parsing.

A successful B3 may unlock only the right to draft a separate reviewed 2D-C source package. That later package must still define a narrow source envelope, stop conditions, tests, review prompts, and explicit non-public/non-product constraints before any parser work begins.

## 10. Review Questions

Reviewers must answer:

1. Is the provisioned-host contract strict enough to prevent false deployment-candidate proof?
2. Are the allowed environment variables narrow enough?
3. Is the independent image approval record strong enough, and does it prevent env self-approval?
4. Is rootless OCI authority clearly required before 2D-C can be proposed?
5. Is Docker Desktop/rootful/local-only proof clearly insufficient?
6. Is evidence recording sufficient for later Architect/Security acceptance?
7. Are all non-proof activities still blocked?

Return `approve`, `modify`, or `reject`. If review returns `modify` or `reject`, do not run the proof until this package is corrected and re-reviewed.

## 11. Reviewer Prompt

> Review `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-B3_Provisioned_OCI_Deployment_Candidate_Proof_Package.md` as a docs-only execution package for the B2 positive OCI sandbox verifier on a provisioned host. Return `approve`, `modify`, or `reject`. Confirm that it authorizes no source edits and no 2D-C parser implementation. Verify that it requires rootless OCI authority, an absolute approved runtime path, an independently approved digest-pinned image already available on the host, a pre-run approval record whose exact image reference and digest match the configured env image, no image pull/build, no host repo mount, no env forwarding into the container, no shell invocation, and no Docker/Podman socket mount. Confirm that a run is rejected if the only image approval source is `FH_ANALYZER_V2_PARSER_SANDBOX_IMAGE` echoed into the B2 test allowlist. Confirm that only `parser_isolation_verified` with `proofScope = deployment_candidate` and `runtimeAuthority = rootless_oci` may allow a later 2D-C source package to be drafted, and that all other outcomes keep 2D-C blocked.

## 12. Stop Conditions

Stop and return to Architect/Security review before any of these:

- source edits;
- package or lockfile edits;
- prompt/config/model/schema edits;
- product/public/API/UI/report/export wiring;
- parser execution over any bytes;
- packet/frame consumption;
- cache/SR/storage/evidence/report/warning/verdict/confidence behavior;
- ACS/direct URL execution;
- V1 reuse or cleanup;
- image pull/build;
- host repo mount;
- env forwarding into the container;
- shell invocation;
- Docker/Podman socket mount;
- treating any status other than `parser_isolation_verified` as success;
- treating non-rootless, local-only, rootful, Docker Desktop, or unknown runtime authority as deployment-candidate proof.
