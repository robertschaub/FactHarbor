# Captain Deputy Handoff - V2 HighJump HJ17 W5 Output Budget Repair Implementation

## Summary

HJ17 is locally implemented and verifier-clean. The repair amends the existing
W5 bounded evidence-extraction output budget after HJ16 showed a W5
`parse_failure` / `json_parse_error` at exactly `4000` output tokens.

Current HEAD at handoff creation: pending commit.

## Scope Implemented

- `apps/web/src/lib/analyzer-v2/gateway/model-policy-registry.ts`
  - W5 `evidence_extraction` `maxOutputTokens` changed from `4000` to `8000`.
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction.ts`
  - W5 exact model-policy approval validation now requires `8000`.
- `apps/web/prompts/claimboundary-v2.prompt.md`
  - `V2_EVIDENCE_EXTRACTION` now contains one topic-neutral compactness
    instruction for complete strict JSON, distinct EvidenceItems, no
    duplicative same-source items without distinct probative value, and concise
    rationale/provenance strings.
- Focused tests updated for the W5 policy and prompt-contract assertion.
- WIP package updated:
  `Docs/WIP/2026-05-22_V2_HighJump_HJ17_W5_Output_Budget_Repair.md`.

No chunking, retries, schema relaxation, source/provider changes,
aggregate-cap changes, model swap, cache/SR/storage behavior, parser, public
behavior, ACS/direct URL, V1 work, or V1 cleanup was added.

## Debt-Guard Result

Classification: `incomplete-existing-mechanism`.

Chosen path: amend the existing W5 model-policy budget and prompt contract.

Rejected paths:

- chunking or multi-call merge;
- source reduction/ranking;
- schema relaxation or adapter JSON repair;
- retries.

Net mechanisms: unchanged.

Failed-attempt recovery: the first focused verifier caught a local hunk mistake
where Query Planning was changed instead of W5. That edit was classified as an
`introduced-regression`, amended before commit, and the focused plus broad
verifier set passed afterward.

## Verification

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
  - `advisory_warn` at `2026-05-22T05:20:39.182Z`.
- `npm -w apps/web run build`.
- `git diff --check`.

## Review

Internal independent reviewer accepted the diff for exactly one canary after
local verifiers pass. No blocking findings. Low residual risk: inspect canary
output tokens, latency/cost, and whether W5 still reaches the `8000` ceiling.

## Canary Readiness

One HJ17 canary is ready after implementation commit, clean status, runtime
refresh, API/Web runtime hash match, route/runtime preflight, and live-job
ledger reconciliation.

Use exact Captain-defined input:

`Using hydrogen for cars is more efficient than using electricity`

Pass signal:

- W5 does not return `parse_failure` / `json_parse_error` from truncation;
- provider output tokens stay below `8000`;
- W5 accepts EvidenceItems or returns a clearer non-truncation stop;
- W5-E/W5-F and W8-B/W8-G proceed if W5 is accepted;
- public V2 remains blocked/precutover/damaged;
- no source text, EvidenceItem text, prompt text, hidden ledger id, or internal
  Alpha draft leaks into public/default-admin/log/error surfaces.

Stop signal:

- W5 hits exactly `8000` output tokens;
- parse failure persists below the cap;
- schema diagnostics identify a different prompt-contract issue;
- containment leaks;
- extraction quality materially degrades.
