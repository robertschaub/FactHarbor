# V2 Slice 7N-3B3-2D-B3A Provisioned OCI Proof Intake Runbook

**Date:** 2026-05-17
**Status:** draft review package; docs-only; no source edits approved
**Owner role:** Lead Architect / Captain deputy
**Predecessors:**
- `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-B2_OCI_Parser_Isolation_Proof_Source_Package.md`
- `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-B3_Provisioned_OCI_Deployment_Candidate_Proof_Package.md`
- `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-C0_Parser_Worker_Architecture_And_Provisional_Isolation.md`

## 1. Purpose

B3A defines how a future provisioned-host B3 proof is requested, collected, rejected, and handed to Architect/Security review.

It does not run the proof, approve a host, approve an image, edit source, implement 2D-C, or authorize parser/source/product/live execution. Its purpose is to prevent false unlocks: local-only proof, rootful proof, Docker Desktop proof, image self-approval, stale transcripts, partial denied-authority evidence, or any proof that cannot be traced back to an independent pre-run approval record.

## 2. Current State

- Local `C:\DEV\FactHarbor` has no Docker or Podman runtime available.
- Local B2 proof state remains `parser_isolation_unavailable`, which is fail-closed and not success.
- C0-S1, C0-S2, and C0-S3 are non-executing parser adjuncts only.
- X7-F remains a closed no-IO source-acquisition execution gate.
- `research_acquisition` remains `notImplemented`.
- The V2 Gate Register remains audit-only, runtime-unconsumed, and non-approving.
- 2D-C remains blocked until a positive deployment-candidate proof is accepted and a later 2D-C source package is reviewed.

## 3. Non-Authorization Boundary

B3A authorizes only documentation and evidence-intake preparation.

B3A does not authorize:

- source edits under `apps/`;
- parser execution, worker spawn, parser runner changes, byte/frame consumption, parsed material, parser output, source material, extraction input, or EvidenceCorpus;
- source execution, provider/network/search/fetch calls, or content dereference execution;
- product/orchestrator/runner/API/UI/report/export wiring;
- prompt/config/model/schema edits or approval flips;
- cache IO, durable storage, Source Reliability, Evidence Lifecycle consumption, report/warning/verdict/confidence behavior;
- ACS/direct URL runtime behavior;
- V1 reuse, V1 cleanup, or V1 removal;
- live jobs or Captain canaries;
- 2D-C implementation package drafting.

## 4. Required Inputs Before A Proof Run

A B3 proof run may be requested only when all inputs exist before the run starts.

| Input | Required evidence | Reject if |
|---|---|---|
| Repository checkout | Exact reviewed proof baseline commit, or a later commit with a reviewed B3/B3A-compatible proof package. The proof packet must list every verifier/source/package/gate-register change since the baseline. | A later commit is accepted only because it is later, or dirty source/prompt/config/package/register files are present without a reviewed package. |
| Runtime approval record | Independent record naming absolute runtime path, runtime kind, runtime authority, runtime version, runtime binary identity where feasible, approver/source, and approval time. | Runtime is selected only from an env var, by name only, by path only with no host governance identity, or after the verifier already ran. |
| Runtime authority | `rootless_oci` on the provisioned host. | Docker Desktop, rootful Docker, unknown socket authority, same-user local process, or local-only boundary. |
| Image approval record | Independent pre-run record naming exact image reference with digest, approval source, date, and reason. | Image approval is copied from `FH_ANALYZER_V2_PARSER_SANDBOX_IMAGE` or derived after the run. |
| Image availability | Approved digest-pinned image already present locally on the host. | Verifier attempts pull/build or uses a tag without `@sha256:`. |
| Test command | Existing B2 positive verifier command only, with the five approved env vars. | Extra env, repo mount, env forwarding into container, socket mount, shell entrypoint, network/provider call, or product wiring appears. |

## 5. Independent Approval Record Shape

The image and runtime approval evidence may be a handoff, ticket, signed note, or other durable governance artifact, but it must be independent of the verifier environment values.

Minimum image approval fields:

```json
{
  "approvalKind": "analyzer_v2_parser_sandbox_image",
  "approvalId": "<stable id>",
  "approvedUtc": "YYYY-MM-DDTHH:mm:ssZ",
  "approvedBy": "<role or authority>",
  "imageReference": "registry.example/name@sha256:<64 hex chars>",
  "approvalScope": "b3_deployment_candidate_proof_only",
  "source": "<handoff/ticket/release-record path or id>",
  "notes": "No parser execution or 2D-C approval is granted by this record."
}
```

Minimum runtime approval fields:

```json
{
  "approvalKind": "analyzer_v2_parser_sandbox_runtime",
  "approvalId": "<stable id>",
  "approvedUtc": "YYYY-MM-DDTHH:mm:ssZ",
  "approvedBy": "<role or authority>",
  "runtimeKind": "podman",
  "runtimeExecutablePath": "<absolute path on provisioned host>",
  "runtimeVersion": "<version output or host build record reference>",
  "runtimeBinaryIdentity": "<binary hash, package id, immutable host image id, or documented reason unavailable>",
  "runtimeAuthority": "rootless_oci",
  "approvalScope": "b3_deployment_candidate_proof_only",
  "source": "<handoff/ticket/host-build-record path or id>",
  "notes": "No parser execution or 2D-C approval is granted by this record."
}
```

The proof is rejected if `approvalScope` is broader than B3 proof evidence, if either approval is missing, or if the approving evidence is not independent of the verifier environment.

Runtime binary identity should be recorded as a binary hash when the host governance model permits it. If hashing the runtime binary is not feasible on the provisioned host, the approval record must name an equivalent host-governance identity such as package id, immutable host image/build id, or signed platform record. Path-only runtime approval is not sufficient.

## 6. Approved Host-Side Command Envelope

The positive verifier may use only these host-side environment variables:

```powershell
$env:FH_ANALYZER_V2_PARSER_SANDBOX_PROOF = "oci_container"
$env:FH_ANALYZER_V2_PARSER_SANDBOX_RUNTIME = "<absolute-rootless-oci-runtime-path>"
$env:FH_ANALYZER_V2_PARSER_SANDBOX_IMAGE = "<approved-node-image@sha256:...>"
$env:FH_ANALYZER_V2_PARSER_SANDBOX_APPROVED_IMAGE = "<same-approved-node-image@sha256:...>"
$env:FH_ANALYZER_V2_PARSER_SANDBOX_IMAGE_APPROVAL_SOURCE = "<independent-approval-record-or-handoff-reference>"
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-oci-container-proof.test.ts
```

The run is invalid if:

- `FH_ANALYZER_V2_PARSER_SANDBOX_APPROVED_IMAGE` does not exactly equal `FH_ANALYZER_V2_PARSER_SANDBOX_IMAGE`;
- `FH_ANALYZER_V2_PARSER_SANDBOX_IMAGE_APPROVAL_SOURCE` equals either image env value;
- the image reference is not digest-pinned;
- the runtime path is not absolute;
- the host performs image pull/build as part of the verifier;
- the container receives host repo mounts, environment forwarding, Docker/Podman socket mounts, or a shell entrypoint;
- the verifier is modified or replaced by an ad hoc command.

## 7. Evidence Packet To Record

The completion handoff for a proof attempt must record:

- repository commit and clean scoped status before and after the run;
- host operating system and runtime family;
- absolute runtime executable path;
- runtime kind and runtime authority;
- runtime approval record id/source;
- image reference and digest;
- image approval record id/source;
- exact comparison result between approved image and configured env image;
- verifier command used;
- whether the host attempted image pull/build; expected: no;
- final test result;
- final proof status asserted by the verifier;
- proof scope asserted by the verifier;
- runtime authority asserted by the verifier;
- denied-authority boolean summary;
- timeout/cancellation/malformed-output/leak status, if any;
- explicit statement whether 2D-C remains blocked.

Do not record secrets, raw stdout/stderr beyond bounded sanitized excerpts, raw probe script, host-private file listings, env values other than approved non-secret proof variables, source material, parsed content, evidence, report prose, prompt text, model telemetry, or V1 identifiers.

## 8. Rejection Matrix

| Outcome | Intake decision | Effect |
|---|---|---|
| `parser_isolation_verified` + `deployment_candidate` + `rootless_oci` + all approval/evidence checks pass | Eligible for Architect/Security acceptance review. | May allow drafting a later 2D-C source package only after review accepts the evidence. |
| `parser_isolation_verified` with local-only, Docker Desktop, rootful, unknown, or by-name runtime | Reject as deployment proof. | 2D-C remains blocked. |
| `parser_isolation_unavailable` | Accept as blocked/fail-closed evidence only. | 2D-C remains blocked. |
| `parser_isolation_runtime_unapproved` or `parser_isolation_image_unapproved` | Reject as proof, record cause. | 2D-C remains blocked. |
| `parser_isolation_runtime_not_found` or `parser_isolation_image_unavailable` | Reject as proof, record environment gap. | 2D-C remains blocked. |
| `parser_isolation_probe_failed`, `parser_isolation_denial_failed`, `parser_isolation_output_malformed`, `parser_isolation_output_leak`, `parser_isolation_timed_out`, or `parser_isolation_cancelled` | Reject as proof, record failure class. | 2D-C remains blocked. |
| Any source/prompt/config/product/package/register drift outside reviewed package | Reject as contaminated proof. | Restore clean state before any retry. |

## 9. Reviewer Checklist

Architect and Security reviewers must answer:

1. Was the runtime approval independent, pre-run, absolute-path-based, and rootless OCI?
2. Was the image approval independent, pre-run, digest-pinned, and exact-match with the configured env image?
3. Did the host avoid image pull/build, repo mount, env forwarding, shell entrypoint, and Docker/Podman socket mount?
4. Did the proof use the existing B2 verifier only?
5. Did every required denied-authority boolean pass?
6. Were output bounds, leak checks, timeout/cancellation handling, and malformed-output handling clean?
7. Were source/prompt/config/product/package/register files unchanged except for reviewed documentation/handoff evidence?
8. Does the evidence prove deployment-candidate parser isolation only, without approving parser implementation?
9. Is 2D-C still explicitly blocked until a separate reviewed source package exists?

If any answer is no or unknown, reject the proof as 2D-C unlock evidence.

## 10. Stop Conditions

Stop and return to Architect/Security review before:

- editing source, tests, prompts, configs, models, schemas, package files, or gate register;
- running a proof on an unapproved or non-rootless host;
- using an image without independent pre-run approval;
- pulling or building an image during the proof;
- mounting the host repo or Docker/Podman socket;
- forwarding env into the container;
- invoking a shell inside the container;
- parsing real fetched bytes, fixture/control bytes, or 2C-A packets;
- producing parsed material, source material, extraction input, EvidenceCorpus, warnings, verdicts, confidence, or report prose;
- wiring product/public/live/API/UI/report/export behavior;
- submitting live jobs;
- drafting 2D-C source based on anything other than accepted deployment-candidate proof.

## 11. B3A Documentation Verifiers

Before committing B3A docs/status/handoff output, run:

```powershell
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
```

If completion handoff output is added, also run after staging the new handoff:

```powershell
node scripts/build-index.mjs --tier=2 --tracked-only
```

No build, expensive tests, live jobs, source verifiers, or positive OCI proof run are required or approved by B3A.

## 12. Review Prompt

> Review `Docs/WIP/2026-05-17_V2_Slice_7N3B3-2D-B3A_Provisioned_OCI_Proof_Intake_Runbook.md` as a docs-only B3 proof-intake runbook. Return `approve`, `modify`, or `reject`. Confirm that it authorizes no source edits, no parser execution, no source execution, no product/public/live wiring, no prompt/config/model/schema edits, no cache/SR/storage/Evidence/report behavior, no V1 cleanup, and no 2D-C. Check whether the independent image/runtime approval records, command envelope, evidence packet, rejection matrix, and reviewer checklist are strict enough to prevent local-only, rootful, Docker Desktop, self-approved image, stale, partial, or contaminated proof from unlocking 2D-C.
