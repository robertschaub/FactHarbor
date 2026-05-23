# V2 HighJump HJ49 - Query Planning Literal-Value Preservation

**Status:** live result recorded - report path restored, source usefulness defect remains
**Date:** 2026-05-23
**Owner:** Captain Deputy / Lead Developer
**Preceded by:** HJ48 stop `7938b16ecfe34056869559509dc93ed6`

## Why This Slice Exists

HJ48 did not exercise the boundary/verdict calibration repair. The run stopped
at W5 with `hidden_no_extractable_evidence` before report drafting. Compared
with HJ47, the decisive difference in the live evidence is Query Planning:

- HJ47 included the claim's literal threshold in a direct-record query and W5
  extracted two EvidenceItems.
- HJ48 omitted the literal threshold from both queries, Source Material still
  completed, but W5 extracted zero EvidenceItems.

The existing Query Planning prompt already requires measurement-frame
preservation, but it does not explicitly require preserving claim-supplied
literal quantities or thresholds in a direct-record query. This is a narrow
failed-attempt recovery to amend that existing mechanism in place.

## Scope

Allowed:

- amend only `V2_EVIDENCE_QUERY_PLANNING` so material claim-supplied literal
  values, units, dates, thresholds, or comparison values are preserved in at
  least one direct-record query when needed to find decisive evidence;
- update focused prompt-contract tests;
- run one HJ49 live rerun after clean verifiers, prompt import/activation, and
  runtime refresh.

Closed:

- source/provider/parser expansion, recursive crawling, retries, cache/SR/storage,
  public behavior, schema/model policy changes, deterministic semantic query
  rewriting, direct URL/ACS, V1 work, and V1 cleanup.

## V2 Scorecard Impact

Positive:

- V2-Q3 Source usefulness: direct-record queries should carry material claim
  values needed to retrieve decisive source material.
- V2-Q6 Report quality: restores the chance to produce a report before
  evaluating verdict calibration.
- V2-Q10 Complexity convergence: amends an existing prompt mechanism instead
  of adding another source-material or diagnostic mechanism.

## V2 Retirement Ledger Impact

No new hidden mechanism. This repair reduces pressure to add source machinery
for a failure that appears to be query-intent loss.

## V2 Consolidation Gate

Allowed because it directly repairs the HJ48 failed-attempt evidence and does
not add parallel plumbing.

## Debt-Guard Result

Classification: `incomplete-existing-mechanism`.

Prior attempt: keep HJ48 boundary/verdict calibration as generic and
verifier-clean, but recognize it was not exercised by the live run.

Chosen option: amend the existing Query Planning prompt.

Rejected paths:

- revert or quarantine HJ48 calibration, because HJ48 never reached boundary
  verdict generation and therefore provides no evidence that calibration caused
  a verdict-quality regression;
- W5 prompt/selectivity changes, because the live difference is upstream query
  loss of a material value before extraction;
- source/provider/crawler changes, because Source Material still completed and
  the missing direct value can be repaired at query intent first;
- code-side deterministic query rewriting, because analytical query meaning
  belongs in the LLM prompt/UCM-controlled prompt profile.

Net mechanisms: unchanged.

Residual risk: prompt-only repair may still produce variable query wording. If
HJ49 again reaches W5 with zero EvidenceItems despite preserving the material
literal value, the next repair should inspect source material usefulness or W5
extraction behavior rather than stacking query wording.

## Verification Plan

Before live job:

- focused prompt-contract test;
- `npm run validate:v2-gates`;
- `npm run debt:sensors`;
- `npm -w apps/web run build`;
- `npm run index`;
- `git diff --check`;
- commit;
- import/activate `claimboundary-v2` in UCM;
- restart/refresh runtime and verify Web/API/proxy commit match.

Local verifier results:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts` - pass, 1 file / 10 tests. First assertion attempt failed only because the test string crossed a prompt line wrap; the prompt change was kept and the assertion was narrowed to stable phrases.
- `npm run validate:v2-gates` - pass.
- `npm run debt:sensors` - `advisory_warn`; salient warnings remain known V2/test/boundary-guard/docs footprint and consolidation-marker review items.
- `npm -w apps/web run build` - pass after clearing a corrupted generated `.next` cache from the previous build environment.
- `npm run index` - pass.
- `git diff --check` - pass.

Live validation:

- exactly one HJ49 rerun for the Captain-defined input
  `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`;
- pass if Query Planning preserves the material numeric threshold in at least
  one direct-record query, W5 again produces EvidenceItems, an internal Alpha
  report draft/writer artifact is created, and public/default containment holds;
- if Query Planning preserves the value but W5 still returns no EvidenceItems,
  stop and classify the next defect as source-material usefulness or W5
  extraction behavior before another repair;
- if Query Planning still omits the value, stop and reconsider whether the
  prompt guidance is being loaded/rendered or whether query planning requires a
  stronger generic contract.

Live validation result:

- HJ49 job `910b9892ae3345a2a72ca1ca14b14990` ran on runtime commit
  `7319ada8e8beaf7bea27693611214465319ab745` after the V2 prompt profile was
  imported and activated with content hash
  `1bf6f9bb7d2216bcf6a72a531244e4cb5790f671ae4c197021f6bb57bbd44318`.
- Public/default containment held: public/default result stayed
  `4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged`, public
  reportMarkdown stayed `null`, public verdict/truth stayed `null`, and an
  unauthenticated hidden artifact route returned `401`.
- Query Planning completed with `3` queries and preserved the material literal
  threshold in the first direct-record query:
  `235000 Personen Asylbereich Schweiz aktuell Bestand`.
- Source Material completed with `6` records: `3` bounded linked-page records,
  `3` search-preview records, and `0` XLSX records.
- W5 returned `hidden_evidence_item_extraction_completed` with `1` EvidenceItem,
  and the internal Alpha result, draft, and report-writer artifacts were
  created. Authenticated admin reportMarkdown was `3504` bytes.
- The report remained low quality for the Captain expectation: it returned
  `UNVERIFIED`, truth `0`, confidence `15`, because the extracted EvidenceItem
  supported annual asylum-application flow rather than current population stock
  or the `235000+` threshold.

Classification:

`PASS_X7_HJ49_QUERY_LITERAL_VALUE_RESTORED_REPORT_PATH_SOURCE_USEFULNESS_DEFECT`

Information yield:

`report_produced`

Interpretation:

HJ49 repaired the immediate HJ48 regression. Query Planning now preserved the
literal threshold, W5 again extracted evidence, and the internal report path
reopened under the calibrated prompt profile. The active defect has moved back
to source usefulness/direct-stock retrieval: V2 still needs to surface direct
current-stock evidence reliably before verdict calibration can be evaluated
meaningfully on this claim family.

## Stop Conditions

Stop and reconvene Steer-Co if:

- the repair would require provider expansion, recursive crawling, schema/model
  policy changes, source/provider-specific terms, deterministic semantic code,
  public behavior, direct URL/ACS, cache/SR/storage, V1 work, or V1 cleanup;
- local tests show the prompt change damages schema/contract behavior;
- a live run leaks report text, source text, prompt text, provider payload,
  hidden ids, public verdict, truth percentage, or confidence to public/default
  surfaces.
