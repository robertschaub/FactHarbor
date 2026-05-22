# V2 HighJump HJ20 - W5 EvidenceItem Output-Shaping Repair

## Context

HJ19 canary job `7522df8a2f1647adb80d230efcfafe40` did not reach the
report-writer repair. It reached hidden CU, Query Planning, W2, and W5, then
W5 failed closed:

- `status = damaged_execution`
- `damagedReason = schema_validation_failed`
- `extractionResultStatus = damaged`
- schema diagnostics: `outputParseStatus = parsed`
- schema diagnostics: `failureCategory = schema_validation`
- schema diagnostics include path `evidenceItems`, code `too_big`
- token usage: `8673` input / `1497` output / `10170` total
- source packet shape: `3` OpenAlex packets and `6` Wikimedia packets

Public V2 remained blocked/precutover/damaged and containment held.

## Steer-Co Direction

Reduced-quorum Steer-Co decision: repair W5 in place.

Reviewer note:

- Claude Opus 4.6 was invoked through `scripts/agents/invoke-claude.cjs` for a
  concise HJ20 direction review and timed out. Timeout is not approval.
- Gemini review could not run because `GOOGLE_GENERATIVE_AI_API_KEY` is not set.
- Captain Deputy proceeded under reduced quorum because the stop is concrete,
  the repair is a bounded prompt-contract amendment to an existing mechanism,
  and HighJump guidance says not to add artificial barriers before internal
  report creation.

Decision:

- Amend only `V2_EVIDENCE_EXTRACTION` with topic-neutral EvidenceItem selection
  budget and strict completeness guidance.
- Keep the schema, adapter, model, source acquisition, provider selection,
  retries, public behavior, parser, cache/SR/storage, ACS/direct URL, V1 work,
  and V1 cleanup unchanged.

## V2 Scorecard Impact

V2 SCORECARD IMPACT

Quality dimension advanced:

- V2-Q4 Evidence quality: W5 should produce a smaller set of complete, distinct,
  probative EvidenceItems from richer source packets.
- V2-Q5 Verdict quality: unblocks W6/W7/W8/HJ19 progression toward a usable
  hidden/internal report.
- V2-Q9 Cost/latency discipline: keeps the repair in the existing W5 call and
  avoids retries or extra model stages.
- V2-Q10 Complexity convergence: amends an existing prompt contract instead of
  adding another diagnostic/proof layer.

Direct user/report value:

- Moves the pipeline toward a complete internal report from the product route.

Hidden-only value:

- Acceptable because this is on the shortest path to report-writer evidence.

## V2 Retirement Ledger Impact

V2 RETIREMENT LEDGER IMPACT

Rows touched:

- V2-RL-021 HighJump temporary bar-lowering prompt/gate loosenings.

Status changes:

- none.

New mechanism owner:

- none.

Removal / merge trigger:

- Revisit the W5 prompt-side item budget after a successful internal report is
  reviewed for evidence sufficiency and report quality.

Debt accepted:

- A prompt-side item budget is accepted as temporary HighJump output shaping
  rather than schema/config restructuring. It must be recalibrated after report
  evidence.

## V2 Consolidation Gate

HJ20 passes the consolidation gate because it does not add a hidden mechanism.
It amends the existing W5 prompt contract to clear the observed W5
schema-validation stop.

## Debt-Guard

DEBT-GUARD INVENTORY

Symptom:

- HJ19 canary stopped before report creation because W5 returned parseable JSON
  that failed strict schema validation; bounded diagnostics included
  `evidenceItems` / `too_big`.

Verifier:

- Canary job `7522df8a2f1647adb80d230efcfafe40` hidden W5 artifact.

Likely recent change surface:

- `apps/web/prompts/claimboundary-v2.prompt.md`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`

Existing mechanisms:

- Existing W5 `V2_EVIDENCE_EXTRACTION` prompt contract.
- Existing strict `EvidenceExtractionResultSchema`.
- Existing bounded schema diagnostics.
- Existing no-store/no-read cache and hidden/default redaction routes.

Debt signals:

- W5 already says "strongest bounded set" and "avoid duplicative items" but
  does not give an explicit item budget under richer source packets.
- Diagnostics are sufficient for the next step; adding new diagnostics would be
  barrier overhead.

Constraints:

- No deterministic semantic selection code.
- Prompt wording must be topic-neutral and free of Captain canary terms.
- Preserve multilingual robustness.
- No schema relaxation or adapter aliasing for this stop.
- No second HJ19 canary.

Unknowns:

- Whether the next W5 response will pass with the item budget and complete-field
  reminder.

Causal classification:

- `incomplete-existing-mechanism`: W5 execution works, but the prompt contract
  under-specifies output-shaping for richer source packets.

COMPLEXITY BUDGET

Chosen option:

- amend.

Files expected to change:

- HJ20 WIP package.
- `apps/web/prompts/claimboundary-v2.prompt.md`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`
- closeout docs/status/index.

Net mechanisms:

- unchanged.

New branches/fallbacks/flags/helpers:

- none.

Code expected to remove:

- none.

Verifier to run:

- focused prompt-contract/W5 tests;
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime`;
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`;
- `npm run validate:v2-gates`;
- gate-register self-test;
- `npm run debt:sensors`;
- `npm -w apps/web run build`;
- `npm run index`;
- `git diff --check`.

Why this is not workaround stacking:

- It repairs the existing W5 prompt contract that produced the failed artifact.
  It does not add retries, schema relaxation, or another hidden route.

## Scope

Allowed:

- add topic-neutral W5 EvidenceItem selection budget guidance;
- require complete strict fields for every included EvidenceItem;
- update focused prompt-contract tests;
- document the implementation and canary readiness.

Not allowed:

- schema relaxation;
- adapter normalization of invalid provider output;
- retries;
- model/provider/source acquisition changes;
- source-material widening;
- parser/cache/SR/storage;
- public API/UI/report/export/compatibility behavior;
- ACS/direct URL;
- V1 work or cleanup.

## Intended Prompt Delta

Add a compact W5 selection-budget rule:

- normally produce `2` to `5` EvidenceItems;
- never produce more than `5` EvidenceItems for one extraction packet in this
  HighJump path;
- choose the strongest materially distinct points needed for sufficiency and
  verdict work;
- do not output one item per source or per minor detail;
- omit lower-value duplicative items rather than emitting an oversized or
  incomplete JSON object;
- every included item must have all required strict fields, especially the full
  `evidenceScope` object and `provenance` object.

This is prompt-side output shaping, not a schema change.

## Pass Criteria

Local:

- `V2_EVIDENCE_EXTRACTION` contains the topic-neutral selection-budget rule.
- Prompt-contract tests prove the rule is present and contains no Captain canary
  terms.
- No code path, schema, model policy, provider, route, cache/SR/storage, public
  behavior, ACS/direct URL, or V1 path changes.

Canary, if run:

- exactly one HJ20 canary from the remaining HighJump budget;
- W5 either accepts a bounded EvidenceItem set or fails with a new concrete
  bounded stop;
- if W5 accepts, downstream W6/W7/W8/HJ19 may proceed through existing gates;
- public V2 remains blocked/precutover/damaged;
- default/admin routes remain hash/length/provenance-only and no-store.

## Stop Criteria

Stop and reconvene Steer-Co if:

- local tests show the repair needs schema relaxation, adapter aliasing, source
  acquisition changes, retries, or a new mechanism;
- canary still fails W5 schema validation with unclear cause;
- any public/default-admin/log/error surface leaks source text, EvidenceItem
  text, prompt text, provider payload, hidden ledger ids, or report markdown;
- runtime is stale or source/runtime commits do not match before canary.

## Implementation Result

Status:

- locally implemented and verifier-clean;
- implementation committed at
  `561f65d865f037f1a81b75dd9a2514a5cd988561`;
- one live HJ20 canary has run and is unevaluable because hidden artifact
  capture failed at route readiness;
- exactly one HJ20 evaluability rerun is authorized only after clean status,
  runtime refresh, API/Web runtime hash check, service stability, and
  hidden-route handler-level JSON preflight.

Implemented delta:

- amended only `V2_EVIDENCE_EXTRACTION` in
  `apps/web/prompts/claimboundary-v2.prompt.md`;
- added a topic-neutral `EvidenceItem Selection Budget` section;
- bounded normal W5 output to `2` to `5` EvidenceItems and no more than `5`
  for one extraction packet in the HighJump path;
- required every included EvidenceItem to be complete under the strict schema,
  including full `evidenceScope` and strict `provenance`;
- updated the prompt-contract test to assert the budget guidance and reject
  Captain canary-domain terms in that prompt section.

Failed-attempt recovery:

- the first broad `analyzer-v2` run failed in
  `orchestrator-w7c-product-chain.test.ts` with a timeout/order symptom;
- debt-guard classification for the HJ20 prompt repair remained `keep` because
  focused tests, runtime tests, and gate validation had passed and the failure
  was outside the touched prompt/test surface;
- the W7C file passed in isolation (`1` file / `5` tests);
- the full `analyzer-v2` slice then passed on rerun (`144` files / `871`
  tests);
- no W7C source or test behavior was changed.

Verifier results:

- focused HJ20 verifier:
  `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction.test.ts`
  passed (`2` files / `17` tests);
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime` passed (`75`
  files / `356` tests);
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/orchestrator-w7c-product-chain.test.ts`
  passed (`1` file / `5` tests);
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` passed (`144` files /
  `871` tests) after the isolated W7C check;
- `npm run validate:v2-gates` passed;
- `node scripts/validate-v2-gate-register.mjs --self-test` passed;
- `npm run debt:sensors` completed with `advisory_warn`;
- `npm -w apps/web run build` passed;
- `git diff --check` is required again after closeout docs/index updates.

DEBT-GUARD RESULT

Classification:

- `incomplete-existing-mechanism`, with one failed broad-suite recovery
  classified as `keep`.

Chosen option:

- amend the existing W5 prompt contract.

Rejected path and why:

- schema relaxation, adapter normalization, retries, model/source/provider
  changes, and new diagnostics were rejected because the observed failure was a
  parseable oversized EvidenceItem array and the existing W5 mechanism can carry
  the repair with lower net complexity.

What was removed/simplified:

- no code removed; the repair simplifies the model output target by explicitly
  limiting item count.

What was added:

- prompt guidance and focused prompt-contract assertions only.

Net mechanism count:

- unchanged.

Budget reconciliation:

- actual diff stayed inside the expected prompt/test/docs envelope; no new
  branches, helpers, routes, retries, flags, schemas, or hidden artifacts were
  added.

Verification:

- see verifier results above.

Debt accepted and removal trigger:

- accepted temporary HighJump prompt-side output shaping; revisit after a
  successful internal report is reviewed for evidence sufficiency and report
  quality.

Residual debt:

- the broad analyzer suite showed one non-reproduced W7C timeout/order symptom
  before passing in isolation and on rerun; no source change was justified.

## First Canary Result

Job:

- `8fe16cdeef7842058a8a36337a41b82e`

Runtime:

- `561f65d865f037f1a81b75dd9a2514a5cd988561+082c771c`

Classification:

- `UNEVALUATED_X7_HJ20_HIDDEN_ARTIFACT_CAPTURE_ROUTE_READINESS_MISS`

What happened:

- job used explicit `claimboundary-v2`;
- job completed `SUCCEEDED` and persisted the expected public
  `4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged` envelope;
- hidden artifact probes returned app-level HTML `404` responses immediately
  after completion;
- the local services then stopped, erasing the process-local hidden ledgers;
- after restart, the job's hidden artifacts could not be recovered.

Interpretation:

- this canary consumes one live-job slot;
- it is not evidence that the HJ20 W5 output-shaping repair passed or failed;
- the information yield is `new failure`: operational hidden-route readiness /
  artifact-capture provenance.

Rerun rule:

- Steer-Co and Claude Opus consented to exactly one HJ20 evaluability rerun;
- do not run it unless git status is clean, runtime is refreshed from
  the latest clean HEAD containing HJ20 source commit `561f65d8`, API/Web
  runtime hash checks pass, hidden artifact routes preflight to handler-level
  JSON with `no-store`, and the same web process remains alive through
  immediate post-job artifact capture;
- if route readiness fails before rerun, or if the rerun is also unevaluable,
  stop and prepare a small runtime/provenance repair package instead of spending
  another canary.

## Evaluability Rerun Result

Job:

- `53f22512b9aa41b5ab23b774e2ddf10f`

Runtime:

- `a7a73479d62779ad7b22868898fb50d0d09634c6`

Classification:

- `PASS_X7_HJ20_W5_OUTPUT_SHAPING_INTERNAL_REPORT_WRITER_DRAFT_CREATED`

Preflight:

- git status clean;
- API/Web runtime hashes matched clean HEAD `a7a73479`;
- all `18` internal analyzer-v2 artifact routes returned handler-level JSON
  with `no-store` under an authenticated sentinel ledger preflight;
- unauthenticated route probes returned JSON `401`;
- no app-level HTML `404` appeared before submission.

Hidden-chain evidence:

- W2: `candidate_provider_network_completed`, `4` query entries, `3` candidates
  per query.
- W4-A/source material readiness: `9` admitted Source Material records
  (`3` OpenAlex, `6` Wikimedia).
- W5: `hidden_evidence_item_extraction_completed`,
  `extractionResultStatus = accepted`, `evidenceItemCount = 4`, schema
  diagnostics `null`, `8847` input tokens / `2022` output tokens.
- W5E/W5F: `4` EvidenceItems admitted and ready for downstream handoff.
- W6-C: sufficiency completed, accepted, schema diagnostics `null`,
  report stop recommendation `caveat_report`.
- W7-B/W8-B: `3` boundary candidates, `2` verdict candidates, `4` cited
  EvidenceItem references, `firstIncompleteStage = none`.
- W8-G: internal Alpha draft created, `7843` bytes, default projection
  hash/length/provenance-only.
- HJ19 report writer: `internal_report_writer_draft_created`,
  `aggregationNarrativeResultStatus = accepted`, `8759` report bytes,
  `2` verdict sections, `3` boundary sections, `4` cited EvidenceItem refs.

Containment:

- public job result stayed `4.0.0-cb-precutover` /
  `blocked_precutover` / `report_damaged`;
- public `reportMarkdown` length stayed `0`;
- default admin projections returned hashes, lengths, and provenance only for
  report text and draft text;
- explicit report/draft text inspection remained authenticated admin-only and
  no-store;
- no public/default-admin report text, source text, prompt text, provider
  payload, hidden ledger id, verdict, truth percentage, confidence, or warning
  was returned.

Canary information yield:

- `report produced`

Budget:

- first unevaluable HJ20 canary consumed one slot, reducing the HighJump tranche
  from `6` to `5`;
- this evaluability rerun consumed one slot, reducing the tranche from `5` to
  `4`;
- no second HJ20 rerun is authorized.

Next action:

- pivot to internal report-quality review using the produced hidden report
  evidence;
- do not add another readiness/proof/plumbing layer before identifying the
  concrete report defect or quality bar to raise next.
