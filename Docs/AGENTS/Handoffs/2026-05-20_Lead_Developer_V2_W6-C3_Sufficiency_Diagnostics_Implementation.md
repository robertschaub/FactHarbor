---
### 2026-05-20 | Lead Developer | Codex (GPT-5.5) | V2 W6-C3 Sufficiency Schema Diagnostics Implementation
**Task:** Implement the approved W6-C3 code-only diagnostic amendment for the W6-C sufficiency schema stop.
**Files touched:** `apps/web/src/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment.ts`; `apps/web/src/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result.ts`; focused W6-C/W8-B/route tests.
**Key decisions:** Added a nullable bounded `schemaDiagnostics` object to W6-C execution telemetry and projected it through the existing W8-B internal Alpha report-result route. The diagnostic records only contract name/version, parse status, failure category, bounded issue count, bounded issue paths, bounded issue codes, and explicit non-leak booleans. It does not return provider output, prompt text, source text, EvidenceItem text, schema messages, or stack traces. No prompt/model/config/schema/UCM/gateway edit, schema relaxation, new route, sink, or public behavior was added.
**Open items:** One W6-C3 product-route canary remains pending after focused commit, clean provenance, runtime refresh, route preflight, and budget ledger update. The canary should capture the actual W6-C schema issue paths/codes before any later prompt/schema repair package is proposed.
**Warnings:** W6-C3 is temporary diagnostic debt. It must be removed or folded into stable W6-C telemetry after the schema root cause is fixed and a later Captain-approved canary verifies W6-C completion. Do not use the diagnostic as a user-facing warning or public report signal.
**For next agent:** Use commit-local W6-C3 verifier results before running the canary. If the canary returns populated W6-C `schemaDiagnostics`, prepare a narrow repair package from those paths/codes. If diagnostics are absent, raw values leak, W6-C unexpectedly completes, or route/public preflight fails with unclear cause, stop and reconvene Steer-Co; do not run a second canary.
**Learnings:** Not appended to `Role_Learnings.md`; no durable role-level learning beyond the package-specific diagnostic rule.

## Verification

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-result-artifacts/route.test.ts` — passed, 3 files / 19 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts` — passed, 1 file / 94 tests.
- `npm run validate:v2-gates` — passed.
- `node scripts/validate-v2-gate-register.mjs --self-test` — passed.
- `npm run debt:sensors` — completed with the known `advisory_warn` status.
- `npm -w apps/web run build` — passed.
- `npm run index` — passed before closeout.
- `git diff --check` — passed.

## DEBT-GUARD RESULT

```text
Classification: incomplete-existing-mechanism / planned-temporary-debt
Chosen option: amend existing W6-C telemetry and existing W8-B projection.
Rejected path: prompt/schema repair without issue paths; schema relaxation; new route/sink; public warning/report exposure.
What was removed/simplified: none in this slice.
What was added: one bounded nullable W6-C schema diagnostics object and one W8-B projection field.
Net mechanism count: small temporary increase, bounded and owned by W6-C3.
Budget reconciliation: source and tests stayed inside the approved package envelope.
Verification: focused W6-C/W8-B/route tests, boundary guard, V2 gates, gate-register self-test, debt sensors, build, index, and whitespace checks passed.
Debt accepted and removal trigger: remove or fold diagnostics into stable W6-C telemetry after W6-C schema root cause resolution and a later Captain-approved canary verifies W6-C completion.
Residual debt: known V2 footprint, boundary guard, docs volume, and debt-guard advisory warnings remain.
```
