# V2 HighJump HJ75 - Source Material Source-Native Selection Repair

Status: implementation committed; first live submission invalidated by runtime-auth trigger miss; one replacement canary pending after docs commit and fresh preflight

## Objective

HJ74 proved durable HJ73 attribution and showed the V2 chain reaches W5 and the
internal report writer for the Captain-defined current-asylum input, but the
report remains `UNVERIFIED` because the supplied Source Material still lacks a
comprehensive current asylum-domain stock count for the `235000` threshold.

HJ75 amends the existing Source Material selector so already-materialized
Serper source-native records are selected before preview-only fallback records
inside the existing provider-attempt balancing and byte caps. This is not a new
provider strategy, not a prompt repair, and not a report-writer repair.

## Authority

Captain authorized HighJump continuation and a fresh 12-job tranche after HJ73;
HJ74 consumed one job and left `11`. Steer-Co plus Claude Opus converged that
HJ75 should target existing Source Material materialization/selection rather
than Query Planning, W5, report writing, provider expansion, cap increases,
retries, parser/cache/SR/storage, public behavior, ACS/direct URL, or V1 work.

One HJ75 canary may be run only after implementation commit, runtime refresh,
clean git status, and verifier pass. The first HJ75 submission consumed a live
job but did not execute the analyzer because the local API-to-Web runner trigger
returned `401`. That job is recorded as analytically invalid; it must not be
used as Source Material or report-quality evidence.

## HJ74 Evidence

HJ74 job `b5dc2c0d4f3e47a6aa2bd82ff3c617e5`:

- stayed on `claimboundary-v2` and finished `SUCCEEDED`;
- preserved public/default containment;
- Query Planning accepted `4` entries;
- candidate provider network completed;
- Source Material completed with `7` records and `5753` bounded text bytes;
- Source Material kinds were `2` linked-page text, `4` preview text, and `1`
  OpenAlex abstract;
- W5 extracted `4` EvidenceItems and the internal report writer created a
  draft;
- the report stayed `UNVERIFIED` because supplied evidence was flow/context
  material, not comprehensive current-stock material.

The existing code already has bounded Serper linked-page and XLSX
materialization. Local inspection found the selector gap: the Source Material
owner accepted Serper preview and linked-page text records, but excluded Serper
XLSX records and sorted preview and source-native records at the same strength.

## Scope

Allowed:

- amend
  `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.ts`;
- update focused tests in
  `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.test.ts`;
- update this package, current lane/status/backlog, Agent Outputs, live ledger
  after canary, and generated indexes as required.

Closed:

- prompt/model/config/schema/UCM/gateway edits;
- provider expansion, endpoint migration, cap increase, retry, parser,
  cache/SR/storage, ACS/direct URL, V1 work;
- semantic/source-specific ranking, topic keywords, domain hardcoding;
- W5/W6/W7/W8/report-writer changes;
- public/API/UI/report/export/compatibility exposure;
- new hidden route/sink/table or durable storage.

## Debt-Guard

DEBT-GUARD INVENTORY

- Symptom: HJ74 produced a complete internal report draft but source material
  still missed the decisive current-stock evidence.
- Verifier: HJ74 attribution artifact
  `Docs/WIP/canary-evidence-hj74-source-chain-attribution.json`.
- Likely recent change surface: Source Material owner selection over
  Serper-provided records.
- Existing mechanisms: Serper linked-page fetch, Serper XLSX materialization,
  Source Material provider-attempt balancing, W5 strict extraction, HJ73
  attribution.
- Debt signals: V2 source/test footprint and boundary guard remain above
  advisory thresholds; do not add another mechanism if an existing selector can
  carry the fix.
- Constraints: no deterministic semantic text-analysis logic, no source/topic
  hardcoding, no public/default leak, no caps/retries/provider expansion.
- Unknowns: whether the live provider returns a source-native record containing
  the comprehensive stock number.

Classification: `incomplete-existing-mechanism`.

Chosen option: amend the existing Serper Source Material selector to include
bounded XLSX records and rank source-native Serper records ahead of preview-only
fallbacks while preserving provider-attempt balancing.

Rejected options:

- prompt repair: HJ71/HJ74 show the immediate gap is materialization/selection;
- W5/report-writer repair: both reached completion with the supplied material;
- provider/cap/retry expansion: broader than the inspected selector gap;
- semantic source ranking: violates the LLM-intelligence boundary and would be
  topic fragile.

COMPLEXITY BUDGET

- Chosen option: amend.
- Files expected to change: one runtime owner, one focused test, docs/status
  and generated index.
- Net mechanisms: unchanged.
- New branches/fallbacks/flags/helpers: one structural ranking helper based on
  source-material kind, not text meaning.
- Code expected to remove: none.
- Tests/verifier to add/update: Source Material owner test proving
  source-native Serper records beat preview fallback under existing caps.
- Why this is not workaround stacking: it uses the existing materialization and
  selector owner instead of adding a provider, route, retry, cap, or semantic
  classifier.
- Verifier tier: local tests/build plus exactly one live job after commit.
- Debt accepted: none.

## V2 Scorecard Impact

Quality dimension advanced: V2-Q2 evidence acquisition and V2-Q3 EvidenceItem
quality.

Direct user/report value: improves the chance that W5 receives source-native
bounded Source Material rather than preview-only fragments.

Hidden-only value: uses HJ73 attribution to target the actual upstream source
quality owner without adding another diagnostic layer.

Cost/latency impact: no new provider calls, retries, caps, or prompts. Existing
linked-page/XLSX materialization work is selected more effectively.

Retirement or simplification unlocked: avoids adding a parallel source-ranking
mechanism; keeps Source Material selection as the single owner.

Scorecard risk: if live provider results still lack the aggregate, the next
owner moves to provider/query strategy, not another selector tweak.

## V2 Retirement Ledger Impact

Rows touched:

- V2-RL-021 HighJump temporary bar-lowering prompt/gate loosenings: keep.
- V2-RL-024 HJ37 bounded Serper linked-page Source Material: keep/merge; HJ75
  merges newer XLSX/source-native materialization into the same selector owner.

Status changes: none.

New mechanism owner: none.

Removal / merge trigger: this remains inside the existing Source Material owner;
review after the HJ75 canary and before any provider/query strategy widening.

Debt accepted: none.

## Consolidation Gate

HJ75 is allowed because it amends an existing selector and may improve report
value without new machinery. If the live canary repeats the same current-stock
gap without useful new source-native material, stop and steer toward a provider
or query strategy package; do not stack another Source Material heuristic.

## Implementation Plan

1. Include `provider_search_result_xlsx_text_bounded` in eligible
   Serper-provided Source Material records.
2. Rank Serper records structurally by material strength:
   XLSX source text, linked page text, then preview text.
3. Preserve provider-attempt balancing, dedupe, record cap, byte cap, and
   malformed-id late fallback behavior.
4. Add focused tests for source-native preference under provider-attempt
   balancing.
5. Run focused owner and Serper tests, boundary guard, build, debt sensors,
   index, and diff checks.
6. Commit before any live canary.

## Verifier Plan

Before commit:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-serper-search-preview.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `npm -w apps/web run build`
- `npm run validate:v2-gates`
- `node scripts/validate-v2-gate-register.mjs --self-test`
- `npm run debt:sensors`
- `npm run index`
- `git diff --check`
- `git diff --cached --check`

After commit and runtime refresh, run exactly one live canary with:

`Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`

## Pass / Stop Criteria

Pass:

- verifiers pass and runtime/source provenance is clean;
- live canary stays on `claimboundary-v2`;
- public/default containment holds;
- HJ73 attribution remains present in admin raw output;
- Source Material has equal or stronger source-native composition than HJ74,
  ideally with XLSX or more linked-page material reaching W5;
- report quality improves, or attribution proves the remaining gap belongs to
  provider/query strategy.

Stop:

- stale runtime/source, V1 routing, or public/default/log/error leak;
- implementation needs provider expansion, prompt/model/config/schema edits,
  cap increase, retry, parser, cache/SR/storage, ACS/direct URL, public
  behavior, or V1 work;
- HJ75 repeats HJ74's missing aggregate with no useful new source-native
  material;
- the canary shows source-native aggregate material reached W5 but was not
  extracted, shifting ownership to W5.

## Local Implementation Result

Implemented inside the approved envelope:

- amended the existing Source Material owner selector to include
  `provider_search_result_xlsx_text_bounded` records in eligible
  Serper-provided records;
- added structural material-strength ordering for Serper-provided material:
  XLSX text, linked-page text, then preview text;
- preserved provider-attempt balancing, dedupe, byte caps, record caps,
  malformed-id late fallback, no public surface, no prompt/config/model/schema,
  no provider/cap/retry/parser/cache/SR/storage, and no V1 work;
- added a focused test proving source-native Serper records are selected ahead
  of preview-only fallback records under provider-attempt balancing.

Verifier results before implementation commit:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.test.ts`
  passed: 1 file, 20 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-serper-search-preview.test.ts`
  passed: 1 file, 10 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-xlsx-attachment-source-material.test.ts`
  passed: 1 file, 4 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`
  passed: 1 file, 96 tests.
- `npm -w apps/web run build` passed.
- `npm run validate:v2-gates` passed.
- `node scripts/validate-v2-gate-register.mjs --self-test` passed.

DEBT-GUARD RESULT

- Classification: `incomplete-existing-mechanism`.
- Chosen option: amend the existing Source Material selector in place.
- Rejected path and why: prompt repair, W5/report-writer repair,
  provider/cap/retry expansion, semantic source ranking, parser/cache/SR/
  storage, public behavior, ACS/direct URL, and V1 work touch the wrong owner
  or add mechanisms before the inspected selector gap is exhausted.
- What was removed/simplified: none.
- What was added: one structural material-kind rank helper plus focused tests.
- Net mechanism count: unchanged.
- Budget reconciliation: actual source diff stayed in one existing runtime
  owner and one focused test file; no new route, sink, provider, cap, retry, or
  prompt/config/schema change.
- Verification: focused owner, Serper preview, XLSX materializer, boundary
  guard, build, V2 gate validation, and gate-register self-test passed; final
  debt sensors, index, and diff checks are run at closeout.
- Debt accepted and removal trigger: none.

## First Canary Attempt - Invalid Runtime Trigger

First HJ75 submission:

- job: `bdde6d4ad58544bcbf07576c7cf89968`;
- input: `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`;
- status: `FAILED`;
- classification: `INVALID_X7_HJ75_RUNTIME_AUTH_TRIGGER_MISS`;
- implementation/source commit: `522beebb9fe36c89e011777118e6fcde6ece0c50`;
- `gitCommitHash` and `createdGitCommitHash` were stamped as `522beebb`, but
  `executedWebGitCommitHash`, `promptContentHash`, `resultJson`, and
  `reportMarkdown` are null;
- Web log showed `POST /api/internal/run-job 401` during the trigger window.

This is a runtime setup miss, not an HJ75 source-material result. The analyzer
never started, so no source-chain attribution, Source Material composition, W5
evidence, or report-quality conclusion can be drawn from this job.

Post-failure runtime auth preflight now passes:

- `/api/internal/run-job` with the configured runner key returns
  `400 Missing jobId`, proving the key is accepted;
- `/api/admin/test-config` with the configured admin key returns `200`;
- API and Web health checks pass.

Steer-Co consented to one replacement HJ75 canary under these conditions:

- commit this failure/provenance record first;
- count the failed job as budget-consuming but analytically invalid;
- re-verify Web/API health, runner auth, admin auth, clean git status, and
  runtime commit before replacement submission;
- run exactly one replacement canary;
- if the replacement fails before analyzer execution again or provenance is
  missing, stop for Captain.

## Replacement Canary Readiness

After this invalid-attempt documentation is committed, runtime is refreshed,
Web/API runtime commit hashes match the committed source, runner/admin auth
preflight passes, and provenance is clean, HJ75 may spend exactly one
replacement live job from the active tranche on:

`Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`

Do not run a second replacement HJ75 canary without a separate package/approval.
