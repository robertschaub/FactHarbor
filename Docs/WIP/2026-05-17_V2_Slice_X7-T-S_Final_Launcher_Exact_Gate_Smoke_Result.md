# V2 Slice X7-T-S Final Launcher Exact-Gate Smoke Result

**Date:** 2026-05-17
**Status:** `PARTIAL_X7_T_S_QUERY_PLANNING_SCHEMA_VALIDATION_FAILED`
**Package:** `Docs/WIP/2026-05-17_V2_Slice_X7-T-S_Final_Launcher_Exact_Gate_Smoke_Addendum.md`
**Commit/runtime:** `10db25989d297944197b439f514e0daf89f12270`

## 1. Job

| Field | Value |
|---|---|
| Job ID | `4b9c0db413b742b8a47806daa568e95d` |
| Input | `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz` |
| Submitted variant | `claimboundary-v2` |
| Terminal status | `SUCCEEDED` |
| First preparation event | `Preparing input (pipeline: claimboundary-v2)` |
| Created git hash | `10db25989d297944197b439f514e0daf89f12270` |
| Executed web git hash | `10db25989d297944197b439f514e0daf89f12270` |

X7-T-S authorized no English canary. No English job was submitted.

## 2. Preflight Evidence

Pre-submission checks passed:

- worktree clean before runtime refresh;
- disposable exact-gate launcher probe passed for all three non-secret gates;
- actual port-3000 process ancestry had the approved V2 gate assignments;
- runtime healthy on API and web;
- four hidden artifact routes enforced unauthenticated `401`, wrong-key `401`, authenticated bounded internal-only response, and `Cache-Control: no-store`;
- 60-second idle checkpoint stayed clean and healthy.

No raw process command lines, env dumps, admin keys, runner keys, provider keys, or search keys were recorded.

## 3. Hidden Artifact Result

| Artifact | Count | Key status |
|---|---:|---|
| Claim Understanding | 1 | `executionStatus=completed`, `schemaOutcome.status=accepted` |
| X7-J Evidence Lifecycle intake | 1 | `evidenceLifecycleIntake.status=intake_ready` |
| X7-O pre-execution observation | 1 | `status=structural_prerequisites_observed_not_executed_precutover`, `sourceLanguageSignal=present` |
| X7-S Query Planning runtime | 1 | `runtime.status=completed`, `resultStatus=damaged`, `damagedReason=schema_validation_failed` |

Query Planning prompt provenance was present:

- prompt content hash: present;
- rendered prompt hash: present;
- provider telemetry: present;
- cache read/write: `false` / `false`.

The Query Planning output did not produce accepted query entries:

- `queryEntryCount=0`;
- `sourceLanguagePolicy` missing;
- source-acquisition handoff: `blocked`.

## 4. Containment

The X7-S artifact confirmed:

- `queryPlanningRuntimeInvoked=true`;
- `promptLoaded=true`;
- `promptRendered=true`;
- `modelCalled=true`;
- `providerCallbackCreated=true`;
- `providerSearchFetchCalled=false`;
- `sourceAcquisitionExecuted=false`;
- `parserExecuted=false`;
- `evidenceCorpusCreated=false`;
- `reportGenerated=false`;
- `verdictGenerated=false`;
- `publicSurfaceWritten=false`.

This is the first useful Query Planning runtime sample in the X7-T sequence. It is not a passing X7-T sample because schema validation failed.

## 5. Public Non-Leak

Public job response stayed:

- `_schemaVersion=4.0.0-cb-precutover`;
- `meta.publicCutoverStatus=blocked_precutover`;
- hidden marker leak count: `0`.

No hidden artifact IDs, ledger IDs, prompt/rendered hashes, provider telemetry, query entries, source-language policy, source-acquisition handoff, or internal-only artifact markers appeared in public output.

## 6. Classification

Classification: `PARTIAL_X7_T_S_QUERY_PLANNING_SCHEMA_VALIDATION_FAILED`

What this proves:

- corrected local launcher path can open the V2 shell, Claim Understanding runtime, and Query Planning runtime gates;
- product route reaches hidden Query Planning runtime and calls the model;
- hidden artifacts remain admin-only/no-store;
- public output remains blocked/precutover with no hidden marker leak;
- source/search/fetch/parser/SR/cache/evidence/report/verdict/confidence execution remains blocked.

What this does not prove:

- accepted Query Planning schema output;
- source acquisition readiness beyond blocked handoff;
- source/search/fetch/parser/SR/cache behavior;
- EvidenceCorpus/EvidenceItems/report/verdict/confidence behavior;
- public V2 readiness;
- English canary behavior.

## 7. Next Action

Next action: create a separate X7-U Query Planning schema-output diagnosis and repair package. Because prompt implementation is authorized by Captain in the current thread, X7-U may evaluate a prompt/schema-alignment repair, but it must still be reviewed and committed before any further live job.

Do not submit more X7-T/X7-T-R/X7-T-S jobs. Do not submit the English canary until a separate reviewed package authorizes it.
