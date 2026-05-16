# V2 Slice X8 Source-Acquisition Gate Register Refresh Source Package

**Date:** 2026-05-16
**Status:** implemented as audit-only maintainability slice
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `82e73c25` (`test: align calibration v2 approved fixtures`)
**Parent context:** X7-E hidden source-acquisition composition X6 provenance gate
**Reason:** The machine-readable V2 Gate Register still described `gate.research_acquisition` from older 2D-A source-acquisition/parser context even though status/backlog had advanced the direct-text hidden readiness state to X7-E.
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## 1. Purpose

X8 refreshes `Docs/AGENTS/V2_Gate_Register.json` so the audit row for `gate.research_acquisition` matches the current source-acquisition state after X7-E.

It also hardens `scripts/validate-v2-gate-register.mjs` so future edits cannot silently remove:

- X7-E as the latest direct-text hidden readiness/composition state;
- the local B2 parser proof state and `parser_isolation_unavailable` blocker;
- the B3 provisioned rootless OCI proof requirement;
- the C0 parser-worker/provisional-isolation context;
- the `2D-C remains blocked` decision.

## 2. Audit-Only Boundary

X8 does not approve execution. The register remains:

- `authority: "audit_only"`;
- `canApproveExecution: false`;
- `consumedByRuntime: false`;
- `registerGrantsExecution: false` for every row;
- `liveJobEligibility: "blocked"` for every row.

The register is not read by runtime code and must not become a policy source.

## 3. Implementation Boundary

Allowed files:

- `Docs/AGENTS/V2_Gate_Register.json`
- `scripts/validate-v2-gate-register.mjs`
- `Docs/WIP/2026-05-16_V2_Slice_X8_Source_Acquisition_Gate_Register_Refresh_Source_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Handoffs/<date>_Lead_Architect_V2_X8_Source_Acquisition_Gate_Register_Refresh.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/index/handoff-index.json` after indexing

No app source, prompts, configs, models, schemas, API, UI, product runner, source execution, parser execution, or live-job code is in scope.

## 4. Register Changes

The `gate.research_acquisition` row now records:

- `sliceId: "X7-E"`;
- `state/status: "implemented_hidden_direct_text_readiness_gateway_not_implemented"`;
- X7-E as the source package and `ce9bfe74` as the current implementation pointer;
- source-of-truth references to X7-E, B2, B3, and C0;
- blocked surfaces for provider-network execution, real network/search/fetch, source-material population, extraction input creation, evidence-corpus building, real fetched-byte parser consumption, 2D-C parser source implementation, product/public wiring, cache IO, Source Reliability, evidence/report/verdict generation, and live jobs.

## 5. Validator Changes

The validator now enforces the source-acquisition audit row's current critical anchors:

- exact X7-E slice id, state/status, source package, and implementation commit;
- required X7-E/B2/B3/C0 source-of-truth references;
- required blocked-surface labels;
- notes mentioning `X7-E`, `parser_isolation_unavailable`, `B3`, `2D-C remains blocked`, and `audit-only`;
- live-job block reason mentioning X7-E and the unimplemented gateway task.

Self-test mutations now fail if the row drifts from X7-E, drops the B2 parser blocker, or drops the 2D-C blocked note.

## 6. Explicit Non-Goals

X8 does not:

- change runtime behavior;
- approve `research_acquisition` execution;
- wire product/orchestrator/runner/API/UI/report/export paths;
- run or enable provider-network transport/factory calls;
- run real network/search/fetch;
- create source material, extraction input, EvidenceItems, evidence corpus, warnings, verdicts, confidence, reports, or exports;
- run parser code or 2D-C;
- submit live jobs;
- touch cache IO, durable storage, or Source Reliability;
- edit prompts, configs, models, schemas, or UCM defaults;
- execute ACS prepared snapshots or direct URLs;
- reuse or clean V1 code.

## 7. Verification Passed

```powershell
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
```

No app build or live jobs are required because X8 changes only the audit register, its validator, and docs.

Before commit, also run:

```powershell
npm run index
git diff --check
git diff --cached --check
```

## 8. Rollback

Rollback is straightforward:

- restore the `gate.research_acquisition` row to the previous 2D-A pointer;
- remove the research-acquisition-specific validator constants/checks/self-test mutations.

Rollback would reintroduce audit drift and should only be done if a newer source-acquisition gate supersedes X7-E and updates the validator to the new state.
