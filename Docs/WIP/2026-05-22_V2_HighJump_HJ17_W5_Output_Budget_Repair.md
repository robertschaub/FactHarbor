# V2 HighJump HJ17 - W5 Output Budget Repair

## Context

HJ16 canary job `801450beed9b4de184f1a5ae532f00dd` closed the W4-G/W4-H
aggregate-cap stop and exposed a new W5 stop. W4-A admitted `9` Source Material
records, W4-H created one `11111` byte aggregate extraction-input packet, and
W5 executed the bounded evidence-extraction task. W5 then returned
`damaged_execution` / `parse_failure` with diagnostic code `json_parse_error`.
The provider telemetry ended at exactly `4000` output tokens.

This is most likely an output truncation failure in the existing W5
evidence-extraction model policy, not a source-acquisition, parser, schema,
public-surface, or aggregate-cap failure.

## Steer-Co Result

Steer-Co consented to HJ17 as a narrow amend-in-place repair:

- raise only the existing W5 `evidence_extraction` model-policy
  `maxOutputTokens` from `4000` to `8000`;
- keep model tier, model task, call count, retry count, timeout, gateway task,
  cache policy, schema, source fan-in, aggregate caps, provider set, parser,
  public behavior, ACS/direct URL, V1 work, and V1 cleanup unchanged;
- add one topic-neutral compactness instruction to `V2_EVIDENCE_EXTRACTION` so
  the larger budget is used for complete strict JSON, not verbosity;
- run focused policy/prompt/W5 verifiers, V2 gate validation, debt sensors,
  build, index, and diff checks;
- run at most one product-route canary only after verifier-clean commit, clean
  status, runtime refresh, API/Web runtime hash match, and route/runtime
  preflight.

Reviewer synthesis:

- Internal Steer-Co lanes preferred no chunking and no source changes. They
  recommended a modest output-budget repair with a compact prompt guard.
- Claude Opus recommended treating exact `4000` output tokens as canonical
  truncation evidence and rejected chunking/source changes as premature.
- Consolidated direction selected `8000` as the balanced middle ground between
  lower-cost `6000` and Opus's higher ceiling recommendation.

## V2 Scorecard Impact

- Directly advances report creation by removing a mechanical W5 JSON-truncation
  stop after real multi-source evidence reached extraction.
- Preserves quality by keeping all `9` admitted Source Material records
  available to the LLM-owned extraction task.
- Does not weaken schema validation, public containment, or downstream report
  gates.

## V2 Retirement Ledger Impact

- Net mechanisms: unchanged.
- This amends one existing W5 model-policy budget and prompt instruction.
- It avoids adding chunking, source selection, retries, fallback repair paths,
  or another hidden readiness/diagnostic artifact that would need later
  retirement.

## V2 Consolidation Gate

HJ17 is allowed under the consolidation gate because it advances real
report-value flow through an existing execution stage and adds no new hidden
mechanism. The stop condition is clear: if W5 still truncates at the larger cap,
do not raise caps again blindly; reconvene Steer-Co for prompt compaction,
source-packet shaping, or extraction-stage design.

## Debt-Guard

Latest debt sensor before HJ17: `advisory_warn` generated
`2026-05-22T05:14:19.099Z`, with known V2 source/test footprint,
boundary-guard size, docs-volume, net-mechanism, and consolidation-marker
warnings.

DEBT-GUARD INVENTORY:

- Symptom: HJ16 W5 returned `parse_failure` / `json_parse_error` while provider
  output ended at exactly `4000` tokens.
- Verifier: HJ16 canary job `801450beed9b4de184f1a5ae532f00dd` and hidden W5
  artifact telemetry.
- Existing mechanism: W5 `evidence_extraction` model policy and
  `V2_EVIDENCE_EXTRACTION` prompt contract.
- Classification: `incomplete-existing-mechanism`.
- Chosen fix: amend the existing W5 output-token budget to `8000` and add a
  compactness instruction in the existing prompt section.
- Rejected alternatives:
  - W5 chunking, because it adds a new orchestration mechanism and schema merge
    behavior before proving the simple budget stop;
  - source reduction/ranking, because it could discard useful OpenAlex/Wikimedia
    comparator evidence and would introduce semantic selection pressure;
  - schema relaxation or JSON repair, because current evidence points to
    truncation rather than an incorrect schema;
  - retries, because repeated truncation would increase cost without changing
    the output ceiling.
- Net mechanisms: unchanged.
- Stop if output reaches `8000`, parse failure persists below the new cap, or
  prompt compaction starts to suppress materially relevant evidence.

## Scope

Allowed:

- `apps/web/src/lib/analyzer-v2/gateway/model-policy-registry.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction.ts`
- `apps/web/prompts/claimboundary-v2.prompt.md`
- focused policy, prompt-contract, W5 runtime/core tests as needed;
- protocol docs, status, handoff, live-job ledger, index.

Not allowed:

- W5 chunking or multi-call merge logic;
- retries or schema-repair aliases;
- model/task/provider/gateway/cache/schema changes beyond the W5 output cap;
- source-acquisition changes, provider selection, aggregate-cap changes, parser
  execution, cache/SR/storage, public API/UI/report/export/compatibility
  behavior, ACS/direct URL, V1 reuse, V1 cleanup, or V1 removal.

## Pass Criteria

Local:

- W5 model-policy registry declares `maxOutputTokens: 8000` for
  `evidence_extraction` only;
- W5 exact approval validation accepts `8000` and still rejects unapproved
  policy drift;
- `V2_EVIDENCE_EXTRACTION` contains the strict JSON and compactness guidance
  without canary-domain terms;
- W5 tests, prompt-contract tests, V2 gate validation, gate-register self-test,
  debt sensors, build, index, and diff checks pass.

Canary, if run:

- W5 no longer returns `parse_failure` / `json_parse_error` caused by token
  truncation;
- provider output tokens are below `8000`;
- W5 produces either accepted EvidenceItems or a clearer non-truncation stop;
- W5-E/W5-F and W8-B/W8-G proceed if W5 is accepted;
- public V2 remains `4.0.0-cb-precutover` / `blocked_precutover` /
  `report_damaged`;
- no source text, EvidenceItem text, prompt text, hidden ledger id, or internal
  Alpha draft leaks into public/default-admin/log/error surfaces.

## Stop Criteria

Stop and reconvene Steer-Co if:

- W5 hits exactly `8000` output tokens or still emits malformed JSON;
- W5 parse failure persists while output is clearly below the cap;
- schema failures indicate a different prompt-contract issue;
- local tests require chunking, retries, schema relaxation, source dropping, or
  public-surface changes;
- canary evidence shows materially worse extraction quality or a containment
  leak.

## Implementation Result

Status: locally implemented and verifier-clean, no live job run yet.

Implementation delta:

- W5 `evidence_extraction` model-policy `maxOutputTokens` is now `8000`.
- W5 exact model-policy approval validation now requires the same `8000`
  output-token budget.
- Query Planning and W7-B boundary/verdict model-policy output budgets remain
  unchanged at `4000`.
- `V2_EVIDENCE_EXTRACTION` now includes one topic-neutral compactness
  instruction asking for compact complete JSON, distinct EvidenceItems, no
  duplicative same-source items without distinct probative value, and concise
  rationale/provenance strings.
- Focused policy and prompt-contract tests assert the W5 budget and compactness
  instruction.

No W5 chunking, retries, schema relaxation, source changes, provider changes,
aggregate-cap changes, model/provider swap, cache/SR/storage behavior, parser,
public behavior, ACS/direct URL, V1 work, or V1 cleanup was added.

Failed-attempt recovery note:

- The first focused verifier failed because the initial registry/test patch
  mistakenly raised Query Planning instead of W5 in one model-policy entry.
- Classification: `introduced-regression` in the local edit, before commit.
- Decision: keep the HJ17 approach, amend the mistaken registry/test hunk, and
  rerun focused verification.
- The corrected focused verifier and all broader verifiers passed.

Independent review:

- Internal reviewer found no blocking issues.
- Low residual risk: the canary must explicitly inspect output tokens,
  latency/cost, and whether W5 still reaches the `8000` ceiling.

## Local Verification

Passed:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/gateway/policy.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-owner.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`
  - `4` files / `28` tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-items`
  - `2` files / `13` tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime`
  - `74` files / `353` tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`
  - `142` files / `861` tests.
- `npm run validate:v2-gates`.
- `node scripts/validate-v2-gate-register.mjs --self-test`.
- `npm run debt:sensors`
  - `advisory_warn` at `2026-05-22T05:20:39.182Z`, with the known V2 source
    footprint, test footprint, boundary-guard size, WIP-doc volume,
    net-mechanism, and consolidation-marker warnings.
- `npm -w apps/web run build`.
- `git diff --check`.

## Canary Readiness

One HJ17 canary is appropriate after commit, clean status, runtime refresh,
API/Web runtime hash match, route/runtime preflight, and live-job ledger
reconciliation. The canary uses the Captain-defined input:

`Using hydrogen for cars is more efficient than using electricity`

The canary should determine whether W5 now emits valid strict JSON below the
`8000` output-token ceiling, whether W5-E/W5-F and W8-B/W8-G proceed if W5 is
accepted, and whether public/default-admin containment remains intact.
