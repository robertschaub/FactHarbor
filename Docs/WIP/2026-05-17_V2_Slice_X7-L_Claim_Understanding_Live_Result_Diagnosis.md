# V2 Slice X7-L Claim Understanding Live-Result Diagnosis

**Date:** 2026-05-17
**Status:** diagnosis complete; docs-only; no prompt/source/runtime edits authorized
**Owner role:** Lead Architect / Captain Deputy
**Baseline:** `71b46de8` (`docs: record v2 x7k live-smoke result`)
**Evidence source:** X7-K live-smoke jobs `0e3901f2c5e74af8bbde2383297d1b5e` and `7da66e060e104e88a958c858533f22c2`, hidden Claim Understanding artifacts, X7-J intake artifacts, and current Claim Understanding prompt/schema contracts.

## 1. Purpose

Record the first Claim Understanding blocker exposed by X7-K.

X7-K proved product-runner reachability for the X7-J Evidence Lifecycle intake observer. It also showed that meaningful downstream progress is blocked before Evidence Lifecycle: the hidden direct-text Claim Understanding runtime did not produce an accepted `ClaimContract` for either Captain-approved direct-text canary.

This package is diagnosis only. It does not authorize prompt edits, source edits, model/config/schema edits, additional live jobs, Query Planning execution, source/provider/parser execution, public exposure, or downstream Evidence Lifecycle execution.

## 2. Evidence Reviewed

Runtime and package baseline:

- X7-K package commit: `6a728471dfcd2d99d74c0c9f26a1ec8ee6dad483`.
- X7-K result commit: `71b46de8`.
- Web `/api/version` during X7-K reported `6a728471dfcd2d99d74c0c9f26a1ec8ee6dad483`.
- Runtime gates included `FH_ANALYZER_V2_SHELL=enabled` and `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text`.

Code and prompt contracts inspected:

- `apps/web/prompts/claimboundary-v2.prompt.md`.
- `apps/web/src/lib/analyzer-v2/claim-understanding/schemas.ts`.
- `apps/web/src/lib/analyzer-v2/claim-understanding/types.ts`.
- `apps/web/src/lib/analyzer-v2/claim-understanding/model-adapter.ts`.

## 3. Findings

### F1 - German asylum canary failed because the provider output used a flattened nested key

Job:

- Job id: `0e3901f2c5e74af8bbde2383297d1b5e`.
- Input: `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`.
- Claim Understanding execution status: `completed`.
- Gateway task status: `executable`.
- Schema outcome: `damaged`.
- Damaged reason: `claim_contract_validation_failed`.
- Adapter attempts: `2`.

Both adapter attempts failed with the same schema validation shape:

- missing required nested field path `claimContract.input.selectedAtomicClaimIds`;
- unrecognized key `input.selectedAtomicClaimIds` at `claimContract`.

Diagnosis:

- This is not a provider outage and not a public-output failure.
- The provider produced JSON parseable enough to reach Zod validation.
- The failure is strongly consistent with prompt-output ambiguity: the current Claim Understanding prompt describes accepted contract fields using dotted names such as `input.selectedAtomicClaimIds`. The model appears to have emitted that dotted name as a literal flat key under `claimContract` instead of nesting it under `claimContract.input`.
- This is a prompt/contract presentation problem until proven otherwise. It should not be repaired by downstream code or by relaxing the schema.

Recommended repair direction:

- A future Captain-approved prompt/contract package should replace dotted field bullets in `V2_CLAIM_UNDERSTANDING_GATE1` with an explicit nested JSON skeleton or otherwise unambiguous nested field wording.
- The schema should remain strict.

### F2 - Bolsonaro fair-trial canary was blocked as `no_valid_claim`

Job:

- Job id: `7da66e060e104e88a958c858533f22c2`.
- Input: `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`
- Claim Understanding execution status: `completed`.
- Gateway task status: `executable`.
- Schema outcome: `blocked`.
- Blocked reason: `no_valid_claim`.
- Adapter attempts: `1`.

Diagnosis:

- The output was schema-valid, so this is not the same failure as F1.
- The input is a direct question about legal compliance and fair-trial standards. It is suitable for conversion into one or more verifiable AtomicClaims under the intended V2 Claim Understanding role.
- The current `no_valid_claim` outcome therefore indicates a likely Gate 1 prompt/interpretation defect for evaluative legal/procedural questions, but the exact model rationale is not available from the current artifact because the hidden artifact intentionally does not store raw provider output or full free-form integrity-event messages.

Recommended repair direction:

- A future Captain-approved Claim Understanding prompt package should clarify that direct questions asking whether a proceeding, action, policy, or event complied with a law, standard, requirement, or stated criterion can be verifiable if the criterion is externally assessable.
- The wording must remain topic-neutral and multilingual-safe. It must not mention the Bolsonaro case, Brazil, courts, elections, asylum, Switzerland, or any other canary-specific topic.

### F3 - X7-J behaved correctly for both upstream failures

For both jobs, X7-J produced one internal-only Evidence Lifecycle intake artifact.

Job 1:

- Handoff status: `damaged`.
- Intake status: `blocked`.
- Intake blocked reason: `claim_understanding_damaged`.
- Observation status: `blocked_preexecution`.
- Execution eligibility: `not_executable_precutover`.

Job 2:

- Handoff status: `blocked`.
- Intake status: `blocked`.
- Intake blocked reason: `claim_understanding_blocked`.
- Observation status: `blocked_preexecution`.
- Execution eligibility: `not_executable_precutover`.

Diagnosis:

- X7-J correctly refused to fabricate a `ClaimContract`.
- X7-J correctly kept downstream execution flags false.
- No Evidence Lifecycle, Query Planning, source, parser, report, verdict, confidence, cache, Source Reliability, public exposure, or V1 behavior was unlocked.

### F4 - Current artifacts are sufficient for the next decision, but not for detailed model-rationale analysis

The current artifacts are sufficient to justify a prompt/contract repair package:

- F1 has exact structural schema evidence.
- F2 has a concrete schema-valid blocked outcome on a Captain-approved input.

The current artifacts are not sufficient to reconstruct the model's full reasoning for F2 because raw provider output and full free-form integrity-event messages are intentionally not exposed.

If reviewers need exact rationale before approving any prompt repair, the alternative is a separate hidden/admin-only diagnostics enrichment package. That package must be bounded, sanitized, non-public, and avoid storing raw provider output or prompt text unless separately approved.

## 4. Decision Matrix

| Option | Diagnosis verdict | Reason |
|---|---:|---|
| Continue downstream Evidence Lifecycle work | reject | Accepted `ClaimContract` is now the blocking prerequisite. More downstream denial plumbing has low value until Claim Understanding can produce accepted contracts. |
| Relax schema or accept flat dotted keys | reject | This would hide a prompt-output contract problem and weaken strict V2 contracts. |
| Run more live jobs | reject for now | X7-K already spent the meaningful two-job smoke budget and found the upstream blocker. More jobs would add cost without changing root-cause confidence. |
| Source-only diagnostics enrichment | conditional | Use only if Captain/deputies require more model-rationale evidence before prompt repair. Keep admin-only, bounded, no raw prompt/provider text by default. |
| Captain-gated Claim Understanding prompt/contract repair package | recommended | It addresses both observed failure classes while preserving strict schemas and blocked downstream gates. |

## 5. Proposed Future Approval Request

Recommended next package is an explicit Captain-gated Claim Understanding prompt/contract repair approval package.

Proposed approval wording for Captain review:

```text
Approved to draft and, after LLM Expert plus Architect review, implement a V2 Claim Understanding prompt/contract repair package based on X7-K/X7-L findings, limited to `V2_CLAIM_UNDERSTANDING_GATE1` wording in `apps/web/prompts/claimboundary-v2.prompt.md` and focused prompt/contract tests. The package may remove dotted-field ambiguity by using an explicit nested output skeleton and may clarify, in topic-neutral multilingual wording, that externally assessable compliance/fairness/standard questions can produce verifiable AtomicClaims. It may not mention canary topics, change schemas, relax validation, edit model/cache/gateway approvals, run source/provider/search/fetch/parser code, expose public V2 output, run live jobs, touch cache/SR/storage, or perform V1 cleanup.
```

This wording is intentionally a future request. It is not approval and does not authorize prompt edits.

## 6. Constraints Still Active

- Prompt edits require explicit Captain approval plus LLM Expert prompt review and Architect scope acceptance.
- X3-B remains a separate Query Planning prompt/frontmatter package and does not fix the Claim Understanding failures recorded here.
- Query Planning execution remains blocked.
- X5-X7 hidden harnesses remain non-product live-path stages.
- Source-provider/search/fetch/content-dereference/provider-network/parser execution remains blocked.
- EvidenceCorpus, EvidenceItems, report generation, meaningful V2 verdicts, confidence, cache/SR/storage, ACS/direct URL, B3 proof, 2D-C, V1 work, and V1 cleanup remain blocked.

## 7. Recommended Next Step

Prepare the future Captain-gated Claim Understanding prompt/contract repair approval package from section 5.

Do not implement the prompt repair unless the Captain explicitly approves the package wording and the required LLM Expert/Architect reviews accept the concrete prompt changes.
