# 2026-05-17 - Lead Developer - V2 X7-W2 Source Package

## Summary

Prepared and reviewer-approved `Docs/WIP/2026-05-17_V2_Slice_X7-W2_Product_Internal_Candidate_Provider_Network_Source_Package.md`.

X7-W2 is the next proposed Source Acquisition implementation package after X7-W1C. It is deliberately narrow: one hidden product-internal candidate-provider network path through the existing 7N-3B2 SDK-free provider-network boundary, using Wikimedia Core REST Search as a time-bound no-credential proof provider.

## Decision

Package-level verdict: `APPROVE`.

Implementation may proceed only inside the W2 envelope after a pre-implementation Wikimedia status/deprecation re-check. If the endpoint is no longer normal-operation compatible, redirected, credential-gated, rate-gated beyond the W2 budget, or response-shape incompatible, implementation must stop and a revised provider package must be drafted.

No Captain-level decision remains while W2 stays hidden, one-provider, no-live-job, no-public-output, no source-material, no parser, no EvidenceCorpus, and no broad source-execution.

## Important Package Constraints

- W2 must not be another no-IO marker.
- W2 must not open broad source execution.
- Exactly one provider: `wikimedia_core`.
- Hidden-only, admin-only artifacts.
- No live jobs.
- No public API/UI/report/export/compatibility changes.
- No source material, content dereference, parser execution, EvidenceCorpus, EvidenceItem, evidence extraction, warnings, verdicts, confidence, truth percentage, or report prose.
- No cache IO, durable storage, Source Reliability, DB writes, prompt/config/schema/model/provider-policy edits, ACS/direct URL, V1 reuse, V1 work, or V1 cleanup.
- Existing `source-acquisition-network-*` files are not in the W2 source envelope; concrete verifier-backed defects require package amendment or a separate repair package.
- `boundary-guard.test.ts` changes must stay in a small named W2-specific section; broader guard/test debt requires a separate package.

## Key Resolutions

- Wikimedia is treated as a time-bound hidden proof dependency, not as a stable long-term source strategy.
- The endpoint uses `limit=3` to avoid fetching avoidable provider payload.
- Candidate-provider no-auth posture is expressed through the exact allowlist literal `not_required_for_approved_network_provider`, not through the 7N-3B2 endpoint snapshot.
- The W2 candidate-provider allowlist contract defines exact provider id, endpoint kind, query cap, timeout, credential literal, disabled-provider shape, and hash inputs.
- Hidden artifact route contract requires `checkAdminKey`, production `401` for missing/wrong admin key, `Cache-Control: no-store` on every response, single-ledger reads only, no listing/enumeration/cross-ledger access, and generic errors.
- W2 must include timing, attempt count, byte-count, candidate-count, structural dropped-record, and fixed zero-dollar-cost telemetry.

## Review Trail

Reviewer pass found and resolved:

- endpoint durability wording for Wikimedia Core API deprecation starting July 2026;
- ambiguous credential-state handling;
- missing candidate-envelope and candidate-runtime verifiers;
- loose `source-acquisition-network-*` edit exception;
- unspecified W2 budgets;
- missing hidden artifact route auth/no-store/no-enumeration requirements;
- accidental `candidateProviderCredentialsState` placement inside the exact-key network endpoint snapshot;
- underspecified candidate-provider allowlist fields and hash inputs.

Final consolidated package review returned `APPROVE` with no package-level blockers.

## Files Touched

- `Docs/WIP/2026-05-17_V2_Slice_X7-W2_Product_Internal_Candidate_Provider_Network_Source_Package.md`
- `Docs/AGENTS/Handoffs/2026-05-17_Lead_Developer_V2_X7-W2_Source_Package.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/index/handoff-index.json`

## Verification

- `git diff --check -- Docs/WIP/2026-05-17_V2_Slice_X7-W2_Product_Internal_Candidate_Provider_Network_Source_Package.md` passed.
- Focused package review passed.
- No implementation tests or live jobs were run because this is a source package only.

## Warnings

W2 source package approval does not authorize live jobs, public output, source material, parser work, EvidenceCorpus, cache/SR/storage, prompt/config/model/schema edits, ACS/direct URL, V1 reuse, V1 work, or V1 cleanup. Implementation must perform the Wikimedia endpoint re-check before coding and then run the package verifier set before completion.

## Learnings

Opening the first real hidden provider-network path needs both capability and restraint: fixed provider, fixed endpoint, fixed budget, no-auth posture, route auth/no-store/no-enumeration, telemetry, and explicit guard/test debt containment should be specified before implementation starts.
