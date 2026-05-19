# V2 X7-W5-A Runtime Activation Discriminator Canary Result

Date: 2026-05-19

## Classification

`STOP_X7_W5_A_SHELL_ONLY_RUNTIME_ACTIVATION_NOT_PROVEN`

## Authority

Captain clarified in the current Codex thread that no additional Captain input was needed, that live jobs are authorized, and that the current live-job budget is `6`. This canary consumed one job from that reset tranche.

## Runtime And Job

- Job id: `64ec6dcfe6e54fff8c90fc00f4c61b0a`
- Captain-defined input: `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`
- Submitted pipeline variant: `claimboundary-v2`
- Refreshed Web runtime commit: `6cef9c715a98e2c6ec48a0fef0522871380df6d2`
- Final status: `SUCCEEDED`
- Public schema: `4.0.0-cb-precutover`
- Public cutover status: `blocked_precutover`
- Public issue code: `report_damaged`

## Result

The job did not reach hidden Claim Understanding, W2, W3, W4, or W5 artifacts. The persisted public/admin job payload is the plain structural shell:

- `shellOnly: true`
- `analyticalStagesExecuted: []`
- selected claim id: `AC_V2_SHELL_01`

Authenticated internal artifact routes for ledger `64ec6dcfe6e54fff8c90fc00f4c61b0a:precutover-observability` returned `404` for Claim Understanding runtime, Evidence Lifecycle intake, Query Planning pre-execution, Query Planning runtime, W2 candidate-provider, W3-B Source Material, W4-G bounded corpus text, W4-H extraction input, W4-I readiness, and W5-A bounded evidence artifacts.

## Live-Job Tranche

- Reset tranche total before this run: `6`
- Prior remaining after the CU-gate canary: `5`
- This canary consumed: `1`
- Remaining after this run: `4`

## Interpretation

This run should not be interpreted as a W5-A extraction failure. It shows that the current product route can return the V2 shell-only envelope even when the job requests `claimboundary-v2` and the Web runtime commit is fresh.

Further live jobs are likely wasteful until the activation/provenance path is locally diagnosed or a reviewed package clarifies how hidden-chain execution is proved.

## V2 SCORECARD IMPACT

- Diagnostic only; no report-quality value was produced.
- It prevents a false assumption that the existing product-route canary path is reliably exercising W2-W5.

## V2 RETIREMENT LEDGER IMPACT

- No runtime mechanism is retired or merged.
- W4-I and W4-chain artifacts remain active.

## V2 CONSOLIDATION GATE

- No new mechanism was added.
- The next package should be narrow: determine why hidden-chain activation/evidence is missing before adding stages or running more canaries.

