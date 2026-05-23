# V2 HighJump HJ68 W5 Component Evidence Recall Repair

**Status:** implementation package in progress
**Date:** 2026-05-23
**Owner:** Captain Deputy / Lead Developer
**Authority:** Captain HighJump direction, approved prompt edits, current live-job
tranche with `7` jobs remaining after HJ67

## Purpose

HJ67 produced hidden/admin reports for six of eight Captain-defined inputs while
preserving public/default containment for all eight. The strongest remaining
reachability defect is W5 returning `hidden_no_extractable_evidence` after it
already received bounded source-content packets for `asylum-wwii-de` and
`bolsonaro-pt`. A related quality defect remains for `asylum-235000-de`: W5
extracted only contextual flow evidence and missed the decisive current-stock
aggregate.

HJ68 amends the existing W5 EvidenceItem extraction prompt contract so it is
better at extracting materially probative component evidence from multi-clause,
legal/procedural, aggregate, category-scope, and comparison claims without
requiring a source to decide the whole final verdict.

## Read-Only HJ67 Intake Audit

The audit used authenticated hidden/admin default projections only. No source
text, prompt text, provider payload, public report field, or hidden text was
committed.

| Family | W5 state | Source-content signal |
|---|---|---|
| `asylum-current` | `hidden_evidence_item_extraction_completed`, `2` EvidenceItems | W5 received `6` source-content packets, `8945` parent packet bytes, all from bounded Serper material. |
| `asylum-wwii` | `hidden_no_extractable_evidence`, `0` EvidenceItems | W5 received `4` source-content packets, `12346` parent packet bytes, with no schema damage. |
| `bolsonaro-pt` | `hidden_no_extractable_evidence`, `0` EvidenceItems | W5 received `9` source-content packets, `12388` parent packet bytes, with no schema damage. |

Conclusion: W5 execution and source-content handoff exist. The next bar belongs
to W5 extraction recall unless the HJ68 canaries prove the source packets are
still materially unusable.

## Scope

Allowed:

- amend only `V2_EVIDENCE_EXTRACTION` in `apps/web/prompts/claimboundary-v2.prompt.md`;
- add/update focused prompt-contract assertions;
- update this package, status/ledger/Agent_Outputs after execution;
- import/reseed the amended `claimboundary-v2` prompt after commit;
- run up to three focused live jobs after clean local verifiers and runtime
  refresh:
  1. `235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.`
  2. `O processo judicial contra Jair Bolsonaro por tentativa de golpe de Estado respeitou o direito processual brasileiro e os requisitos constitucionais, e as sentencas proferidas foram justas`
  3. `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`

Closed:

- no source code runtime behavior change;
- no schema relaxation, parser, cache/SR/storage, retry/fallback, provider
  expansion, W2/W3 widening, ACS/direct URL, public API/UI/report/export/
  compatibility exposure, V1 work, or V1 cleanup;
- no topic-specific prompt wording or deterministic semantic logic;
- no report-writer or W7-B verdict-calibration mutation in this package.

## V2 Scorecard Impact

Quality dimension advanced: V2-Q3 Evidence extraction, V2-Q5 Verdict quality
indirectly, V2-Q7 multilingual robustness, and V2-Q10 complexity convergence.

Direct user/report value: improves the chance that supplied source packets
become probative EvidenceItems instead of no-report stops.

Hidden-only value: keeps evidence extraction hidden/admin-only until public
cutover is explicitly approved.

Cost/latency impact: no per-job mechanism cost increase; up to three live jobs
from the current tranche.

Retirement or simplification unlocked: avoids adding more report-layer or
source-provider machinery when the observed defect is W5 recall.

Scorecard risk: lower W5 recall bar may admit weak component evidence. The
prompt must preserve material alignment and use `claimDirection`,
`probativeValue`, `evidenceStrength`, `extractionConfidence`, limitations, and
provenance rationale to keep uncertainty visible.

## V2 Retirement Ledger Impact

Rows touched: V2-RL-021 and V2-RL-023.

Status changes: none.

New mechanism owner: none.

Removal / merge trigger: if HJ68 causes weak filler EvidenceItems or repeats
the same no-evidence stop without new information, do not add more W5 prompt
lowering. Pivot owner to source usefulness or report review based on the live
result.

Debt accepted: no new mechanism debt.

## V2 Consolidation Gate

Net mechanism count: unchanged.

HJ68 amends an existing prompt section and test coverage only. It does not add a
hidden route, diagnostic sink, retry, fallback, schema coercion, public surface,
or parallel report path.

## Debt-Guard

```text
DEBT-GUARD INVENTORY
Symptom: HJ67 W5 returned hidden_no_extractable_evidence for two Captain-defined inputs despite receiving bounded source-content packets; one related report extracted only contextual current-flow evidence.
Verifier: HJ67 result artifact plus authenticated hidden/admin route audit after reboot.
Likely recent change surface: existing V2_EVIDENCE_EXTRACTION prompt section and prompt-contract tests.
Existing mechanisms: W5 evidence extraction prompt already supports partial, contextual, comparative, quantitative, and temporal/procedural extraction.
Debt signals: repeated HighJump prompt amendments; avoid adding runtime fallback/route/proof machinery.
Constraints: prompt wording must be topic-neutral, multilingual, non-deterministic, no schema relaxation, no public/default leakage, and live jobs must run only after commit/reseed/runtime refresh.
Unknowns: source packet content is redacted by default; if live result still shows no evidence, source usefulness rather than W5 recall may own the next bar.
```

```text
COMPLEXITY BUDGET
Chosen option: amend
Files expected to change: claimboundary-v2.prompt.md, prompt-contract.test.ts, this package, then closeout/status/ledger docs after live result
Small-change plan: single patch
Net mechanisms: unchanged
New branches/fallbacks/flags/helpers: none
Code expected to remove: none
Tests/verifier to add or update: prompt-contract assertions for component evidence recall
Why this is not workaround stacking: it amends the existing W5 LLM task contract and rejects runtime coercion, retries, schema relaxation, or source/provider expansion.
Why the rejected path is worse: adding report-layer fixes or new source machinery would not address W5's accepted no-evidence result when source-content packets already arrived.
Verifier to run: focused prompt-contract test, boundary guard, build, debt sensors, index, diff checks, then up to three committed/refreshed live jobs.
Verifier tier: safe-local plus live-job
Cost class: live jobs from approved tranche
Expensive/live justification: prompt behavior is quality-affecting and static tests only verify wording, not extraction recall.
Runtime provenance: commit required, prompt import/reseed required, runtime refresh/preflight required
Debt accepted, if any: none
```

## Prompt Amendment Intent

Add generic W5 guidance for:

- legal/procedural/standards claims where procedural acts, safeguards, defects,
  remedies, official decisions, charges, outcomes, or standards assessments can
  be EvidenceItems even when no source decides the whole fairness or legality
  question;
- multi-clause and category-scope claims where component evidence about official
  category definitions, inclusion/exclusion, status classes, or overlapping
  population/domain measures can be extracted as contextual/unclear/mixed when
  exact category labels differ;
- comparison and endpoint claims where one side, endpoint, threshold, or
  measurement frame component can be extracted without treating it as decisive
  support or opposition for the whole claim.

The prompt must keep the existing prohibition on broad-domain filler,
actor-only context, unrelated standards, and invented bridging.

## Pass / Stop Criteria

Local pass:

- focused prompt-contract tests pass;
- boundary guard passes;
- build passes;
- `npm run debt:sensors` returns no new hard blocker;
- `git diff --check` and `git diff --cached --check` pass.

Live pass:

- each focused job stays on `claimboundary-v2`, terminally `SUCCEEDED`, and
  preserves public/default containment;
- at least one of the two prior no-report families produces accepted W5
  EvidenceItems and reaches an internal report, or produces new evidence proving
  source material rather than W5 recall is the blocker;
- no schema damage, raw/default-public leak, hidden-text default route leak, or
  V1 routing appears.

Stop:

- stale runtime/source or prompt hash drift;
- public/default leak;
- W5 repeats `hidden_no_extractable_evidence` twice with no new information;
- EvidenceItems become actor-only, broad-domain, or adjacent-domain filler;
- any fix pressure moves to provider expansion, source widening, schema
  relaxation, retry/fallback, report writer, verdict calibration, public
  behavior, or V1 work.
