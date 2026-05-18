# V2 Slice X7-W2-QC3 W2 Cap Alignment Source Package

**Date:** 2026-05-18
**Status:** implementation-complete
**Owner:** Lead Developer / Captain Deputy
**Parent package:** `Docs/WIP/2026-05-17_V2_Slice_X7-W2_Product_Internal_Candidate_Provider_Network_Source_Package.md`
**Evidence package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-QC2_Query_Planning_Distribution_Diagnostic_Result.md`
**Implementation commit:** `c2fdcd9c` (`feat: align v2 w2 query cap`)

## 1. Purpose

X7-W2-LS1 failed before provider-network execution because W2 accepted at most two query entries while accepted Query Planning can currently emit more. QC2 measured three exact Captain-defined inputs and found Query Planning counts of `2`, `5`, and `3`.

QC3 aligns W2's hidden candidate-provider-network admission with the reviewed Query Planning accepted-output maximum, while preserving W2's safety posture:

- one provider only: Wikimedia Core REST Search page-search endpoint;
- hidden/admin-only artifact only;
- no source material;
- no content dereference;
- no parser execution;
- no cache IO, durable storage, or Source Reliability;
- no EvidenceCorpus, EvidenceItem, warning, report, verdict, confidence, truth percentage, or public output;
- no ACS/direct URL execution;
- no V1 reuse, V1 work, or V1 cleanup;
- no live jobs inside QC3.

## 2. Review Result

Claude Opus, Security Reviewer, and Performance/Cost Reviewer converged on a constrained real cap alignment:

- do not keep W2 as assertion-only at cap `2`, because that preserves a known mismatch and prevents useful provider-network evidence for accepted Query Planning outputs;
- align the W2 query-entry cap to the current Query Planning accepted-output maximum, `EVIDENCE_QUERY_PLANNING_MAX_QUERY_ENTRIES = 6`;
- fix the W2 posture to this reviewed `6` value, rather than importing a value in a way that could silently widen W2 if Query Planning changes later;
- scale W2 total candidate and network timeouts from `3000ms` to `9000ms`, because current candidate-runtime and network-budget validators require per-query timeout multiplied by admitted query count to fit inside the total timeout;
- keep per-query timeout `1500ms`, max candidate records per query `3`, max providers per run `1`, max attempts per query `1`, byte caps `32768`, retry policy `none`, redirect `deny`, proxy `none`, no credentials, no provider SDKs, and all downstream/public/storage flags closed;
- use focused fake-transport tests only; do not run live jobs in QC3.

Rejected alternatives:

- **Compatible canary rerun:** rejected because it selects around a known mismatch rather than fixing it.
- **Assertion-only cap `2`:** rejected because it cannot produce provider-network evidence for accepted plans with 3 to 6 query entries.
- **Partial execution under fixed `3000ms` totals:** rejected because it would require changing runtime/budget validator semantics outside the W2 envelope and would add complexity.
- **Open-ended import from Query Planning max:** rejected unless paired with a fixed reviewed assertion, because future Query Planning max changes must not silently widen W2 network authority.

## 3. Approved Source Envelope

Allowed production file:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.ts`

Allowed test files:

- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Allowed documentation/status files:

- `Docs/WIP/2026-05-18_V2_Slice_X7-W2-QC3_W2_Cap_Alignment_Source_Package.md`
- `Docs/WIP/2026-05-17_V2_Slice_X7-W2_Product_Internal_Candidate_Provider_Network_Source_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W2-QC3_W2_Cap_Alignment.md`
- `Docs/AGENTS/index/handoff-index.json`

Forbidden edits:

- `source-acquisition-network-*` runtime files;
- candidate runtime validator files;
- artifact sink or route files;
- prompt files;
- model, cache, gateway, provider-policy, or UCM/default config files;
- source material, content transport, parser, Source Reliability, cache, storage, EvidenceCorpus, report, verdict, warning, confidence, public API/UI/export/compatibility files;
- V1 analyzer, prompt, type, helper, or cleanup files;
- package or lock files.

Stop and split a separate package if any verifier-backed issue requires editing outside this envelope.

## 4. Implementation Contract

QC3 may change only the W2 query cap and directly dependent exact snapshots:

```text
W2_MAX_QUERY_ENTRIES_REVIEWED: 6
maxQueries: 6
maxQueriesPerProvider: 6
providerTimeoutMs: 1500
perQueryTimeoutMs: 1500
totalCandidateAcquisitionTimeoutMs: 9000
totalNetworkTimeoutMs: 9000
maxCandidatesPerQuery: 3
maxProvidersPerRun: 1
maxAttemptsPerQuery: 1
compressedByteCap: 32768
decompressedByteCap: 32768
totalByteCap: 32768
retryPolicy: none
```

The W2 owner must continue to fail closed before network execution when a handoff contains more than six query entries.

The W2 owner should retain an explicit drift assertion tying the reviewed W2 cap to the current Query Planning maximum. If `EVIDENCE_QUERY_PLANNING_MAX_QUERY_ENTRIES` changes away from `6`, focused W2 tests or boundary guards must fail until a new reviewed package updates W2 posture.

The package does not authorize a general import-driven cap that silently follows future Query Planning changes.

## 5. Tests And Guards

Focused tests must prove:

- W2's reviewed cap is `6` and matches the current Query Planning accepted-output maximum;
- a six-query handoff reaches the fake provider boundary, performs six provider attempts, completes structurally, and records six query outcomes;
- a seven-query handoff fails closed as `query_count_exceeds_w2_cap` before provider/network calls;
- provider allowlist and network budget snapshots carry `maxQueries: 6`, `maxQueriesPerProvider: 6`, and `9000ms` total timeouts;
- per-query timeout, candidate cap, byte cap, credential posture, redirect policy, proxy policy, endpoint shape, and no-cache/no-storage/no-SR/no-public flags remain unchanged;
- poison query text, query ids, source-language rationale, provider payload titles/excerpts/keys/URLs, secrets, source material, parsed material, EvidenceCorpus, report, verdict, confidence, cache, and SR markers still do not leak through decisions or serialized output;
- boundary guards allow only the narrow W2 cap-alignment import/assertion needed for this package and preserve W2-only ownership plus all existing forbidden-import checks.

Required verifiers:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-authority.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
npm run index
```

Do not run expensive LLM tests, validation batches, or live jobs for QC3.

## 6. Cost, Timing, And Risk Posture

QC3 increases the hidden W2 provider-network upper bound from two attempts to six attempts.

Expected bounded effect:

- maximum W2 provider attempts per run: `6`;
- maximum hidden candidate records per run: `18`;
- worst-case W2 network budget: `9000ms`;
- direct provider dollar cost: `0`, because the approved endpoint is no-credential Wikimedia;
- Claim Understanding and Query Planning LLM cost: unchanged, because those stages already execute before W2.

This is acceptable for hidden proof execution because it produces provider-network evidence for accepted Query Planning plans without opening source material or public report behavior. It is not approval for broader provider portfolios, content dereference, parsing, evidence generation, public output, or repeated live runs.

Residual risk: future Query Planning cap changes could imply a larger provider-network envelope. QC3 therefore fixes W2 to reviewed `6/9000ms` values and requires a new reviewed package for any future cap increase.

## 7. Explicitly Not Authorized

- live jobs or Captain canaries;
- broader source/provider expansion;
- provider SDKs;
- fixed literal provider request parameters beyond existing W2 `q`;
- retries;
- redirects;
- proxies;
- source material creation;
- content dereference;
- parser execution or parser byte/frame handoff;
- EvidenceCorpus, EvidenceItem, warning, verdict, confidence, truth percentage, report prose, public API/UI/export/compatibility changes;
- cache IO, durable storage, Source Reliability, DB writes;
- prompt/config/schema/model/provider policy edits;
- ACS/direct URL runtime;
- V1 reuse, V1 work, or V1 cleanup.

## 8. Completion Requirements

After implementation:

- write completion handoff `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W2-QC3_W2_Cap_Alignment.md`;
- append `Docs/AGENTS/Agent_Outputs.md`;
- update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md`;
- run `npm run index`;
- state that QC3 does not authorize live jobs and that a later LS2-style package is required before any live provider-network canary.

## 9. Reviewer Prompt

Review `Docs/WIP/2026-05-18_V2_Slice_X7-W2-QC3_W2_Cap_Alignment_Source_Package.md` as a constrained W2 cap-alignment package.

Return `approve`, `modify`, or `reject`.

Check that QC3:

- raises only W2's hidden candidate-provider query cap from `2` to reviewed `6`;
- scales only the directly dependent total timeouts to `9000ms`;
- keeps one provider, endpoint, credentials posture, redirects, proxy posture, retry policy, byte caps, and candidate caps otherwise unchanged;
- preserves all no-source-material/no-content/no-parser/no-cache/no-SR/no-storage/no-evidence/no-report/no-verdict/no-warning/no-confidence/no-public/no-ACS/no-V1 constraints;
- adds focused tests for six-query completion, seven-query fail-closed behavior, exact snapshot posture, and leakage controls;
- does not edit runtime validators, `source-acquisition-network-*`, artifact route/sink, prompts, configs, schemas, model/provider policy, public surfaces, or V1 files;
- blocks live jobs until a separate reviewed live-smoke package exists.
