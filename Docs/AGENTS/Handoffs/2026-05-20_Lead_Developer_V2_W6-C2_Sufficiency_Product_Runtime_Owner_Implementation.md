# 2026-05-20 Lead Developer V2 W6-C2 Sufficiency Product Runtime Owner Implementation

## Summary

W6-C2 is locally implemented and verifier-clean as one bounded product runtime owner for existing W6-C sufficiency assessment execution.

The implementation adds:

- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-sufficiency-assessment-owner.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-sufficiency-assessment-provenance.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-sufficiency-assessment-owner.test.ts`
- W6-C2-specific boundary-guard coverage in `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

The owner wraps existing core `runSufficiencyAssessmentRuntime(...)`, uses hidden direct-text activation validation, executes the existing `evidence_sufficiency` task through injected Anthropic `generateText` only when the W6-C2 activation/profile/model-policy checks pass, sets `maxRetries: 0`, and marks returned decisions as process-local runtime-owned.

## Containment

W6-C2 does not wire the product orchestrator, W7-B, a chain artifact, a route, a sink, public/default-admin projection, report/verdict/warning/confidence behavior, parser/cache/SR/storage behavior, provider expansion, ACS/direct URL, V1 work, or live jobs.

The prompt packet includes EvidenceItem `statement` text for the sufficiency LLM task, but evidence-scope and provenance text are reduced to hash/length/structural projections. Focused tests assert that representative raw scope/provenance strings do not enter the rendered provider prompt.

## V2 Scorecard Impact

Advances report-quality value indirectly by making W6-C reachable from a product-owned runtime owner, which is a necessary precursor to later product-route W7-B and report-value canaries. It is not itself public report-quality progress and must not be described as a report-quality pass.

## V2 Retirement Ledger Impact

Adds one bounded owner/provenance marker that should be consumed directly by the later chain-integration package. Removal/merge trigger: after W6-C2 and W7-B2 are both product-owned and the chain owner is implemented, duplicated provider-call or provenance-owner patterns must be consolidated instead of cloned.

## V2 Consolidation Gate

Approved as a Steer-Co split package after W7-B proved core execution but not product-route reachability. Net mechanism increase is limited to the W6-C2 owner/provenance marker. The package does not add another hidden route or observability layer.

## Verification

Passed:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-sufficiency-assessment-owner.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `npm run validate:v2-gates`
- `node scripts/validate-v2-gate-register.mjs --self-test`
- `npm run debt:sensors` returned known `advisory_warn`
- `npm -w apps/web run build`

Pending at handoff creation: `npm run index`, `git diff --check`, final git status, and focused commit.

## DEBT-GUARD RESULT

Classification: planned bounded mechanism plus compact failed-validation guard amendment.

Chosen option: add the approved W6-C2 owner/provenance marker; amend the existing boundary guard allowlist after the containment patch introduced `node:crypto` hashing.

Rejected path and why: rejected product orchestrator wiring, W7-B owner/call, chain artifact/route/sink, public projection, prompt/model/schema changes, retries, and broad guard rewrites because W6-C2 only needed a product-owned sufficiency runtime owner.

What was removed/simplified: raw evidence-scope/provenance prompt exposure was avoided by projecting those fields to hashes and byte lengths before provider prompt rendering.

What was added: one owner, one provenance marker, focused owner tests, and boundary-guard coverage.

Net mechanism count: increases by one approved product owner/provenance pair, with a later chain-integration merge trigger.

Budget reconciliation: final diff stayed inside the approved W6-C2 envelope.

Verification: focused W6-C2/core/boundary tests, gate validation, debt sensors, and build passed.

Debt accepted and removal trigger: bounded owner/provenance duplication is accepted until the later W6-C2/W7-B2 chain integration consumes the owners directly.

Residual debt: V2 boundary guard remains large and advisory debt sensors continue to warn on V2 footprint, docs footprint, and consolidation markers.

## Next Step

Prepare the W7-B2 product runtime owner package next. Do not wire a product chain, run live jobs, expose public behavior, or add W8/report behavior before a reviewed package exists.
