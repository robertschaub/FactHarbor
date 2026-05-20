# 2026-05-20 Captain Deputy V2 W7-B Implementation Approval Package

## Role / Scope

- Role: Captain Deputy / Steer-Co coordinator
- Scope: W7-B approval-package preparation only
- Prior package amendment commit: `b477f2bf`
- Package prepared:
  `Docs/WIP/2026-05-20_V2_Slice_W7-B_Boundary_Verdict_LLM_Execution_Approval_Package.md`

## Outcome

Prepared the W7-B implementation approval package as the next bounded phase
transition after W8-A. The package makes W7-B the first LLM-owned
BoundarySet/VerdictSet candidate execution owner and keeps W8-B split unless it
is later proven to be a thin, non-semantic wrapper.

The package requires:

- statement-bearing input packet from approved W5/W5-F lineage;
- no direct W4-I access;
- strict parent/hash/count/byte/provider/model lineage checks;
- one combined LLM boundary/verdict task through new gateway task id
  `boundary_verdict_execution`;
- gateway surface-ledger alignment and focused gateway tests;
- focused prompt contract tests before implementation commit;
- strict schema, citation, provider/model, parse-failure, and leak-negative
  tests;
- Product Trust public-cutover gate;
- warning-materiality contract without user-visible warning publication;
- W7-A merge trigger after W7-B fail-closed parity.

## Review Result

Reviewer positions:

- Claude Opus 4.6 senior architect / LLM expert: `modify`; amendments applied
  for real benchmark-capable input caps, combined-call quality trigger, 4000
  output-token cap, closed verdict-label enum, prompt review checkpoint, and
  boundary citation minimum.
- Product Trust: `approve`.
- Code Reviewer / implementation practicality: `modify`; amendments applied for
  explicit new `boundary_verdict_execution` gateway id, surface-ledger envelope,
  gateway verifier, parent provider/model naming, and prompt contract tests.

Consolidated consent: proceed to Lead Developer implementation only after this
amended package is committed cleanly.

## Authorization State

This handoff and package do not authorize implementation, live jobs, prompt
edits, model/config/schema/UCM/gateway edits, approval flips, public/API/UI
/report/export/compatibility behavior, parser/cache/SR/storage behavior,
provider expansion, ACS/direct URL, V1 work, V1 cleanup, or cutover.

Steer-Co or Captain approval is still required before Lead Developer implements
W7-B. Any later canary requires committed implementation, runtime refresh,
route/runtime preflight, live-job tranche ledger update, and explicit canary
authorization.

## V2 Scorecard Impact

- `V2-Q4`: proposes first semantic boundary candidate owner.
- `V2-Q5`: proposes first internal verdict candidate owner.
- `V2-Q6`: keeps warning publication closed while defining materiality inputs.
- `V2-Q8`: keeps public V2 blocked/precutover.
- `V2-Q9`: proposes one bounded LLM call with token/time caps.
- `V2-Q10`: requires W7-A merge trigger.

## V2 Retirement Ledger Impact

- `V2-RL-012`: W7-B must not create a W4-I consumer.
- `V2-RL-013`: guard additions must stay focused.
- `V2-RL-014`: package/status update only; no broad WIP narrative expansion.

Removal trigger: W7-A merges into W7-B after W7-B is verifier-stable and W7-A
contract-only fail-closed cases have equivalent W7-B coverage.

## Debt-Guard Result

Classification: missing-capability package, not bugfix.
Chosen option: add one proposed semantic owner, with W7-A merge trigger.
Rejected path and why: another readiness/denial/proof layer would increase
hidden machinery without report-value progress; using W7-A/W8-A hash-only
projections would not provide LLM input text; direct W4-I access would violate
the lineage-retirement direction.
What was removed/simplified: none in package work.
What was added: one approval package and status/handoff pointers.
Net mechanism count: no runtime mechanism added yet.
Budget reconciliation: docs-only package stayed within planned package/status
scope.
Verification: `npm run index` passed; `npm run debt:sensors` returned
`advisory_warn` at 2026-05-20T17:32:53Z; `git diff --check` passed.
Debt accepted and removal trigger: proposed W7-B owner only if approved; W7-A
merge trigger required.
Residual debt: boundary guard and WIP/handoff volume remain advisory pressure.

## Next Action

Have Steer-Co review the W7-B approval package. If Steer-Co consents, issue the
copy-ready Lead Developer implementation prompt from package Section 19.

Do not implement W7-B or run a live job until the package is explicitly
accepted.
