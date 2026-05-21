# 2026-05-21 - Lead Developer - V2 W6-F1 OpenAlex Source Material Implementation

**Role:** Lead Developer / Captain Deputy
**Package:** `Docs/WIP/2026-05-21_V2_Slice_W6-F1_OpenAlex_Bounded_Academic_Source_Material_Diversity_Review_Package.md`
**Status:** Implementation complete; verifier-clean locally; no live job run

## Summary

Implemented W6-F1 as one bounded OpenAlex Works academic Source Material path inside the existing hidden V2 Source Acquisition / Source Material chain.

The implementation adds:

- OpenAlex provider id `openalex`, endpoint id `ep_openalex_works_search`, and Works request parameters `search`, `per_page`, and `select`.
- A bounded `openalex_work_abstract_text` Source Material kind alongside the existing Wikimedia page-summary kind.
- Structural reconstruction of `abstract_inverted_index` with fail-closed validation for blank, invalid, duplicate/gapped, over-cap, or raw-leak fragments.
- In-process OpenAlex candidate consumption through the runtime factory projection hook, without serializing raw provider candidates on transport outcomes.
- OpenAlex-first Source Material merge: one eligible OpenAlex record first, then Wikimedia records, total cap still `3`.

No public API/UI/report/export/compatibility behavior, parser, cache/SR/storage, report/verdict/warning/confidence behavior, prompt/model/config/UCM/gateway change, provider framework, ACS/direct URL behavior, V1 work, or V1 cleanup was added.

## Verifiers

Passed:

- Focused W6-F1 tests: `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/openalex-abstract-source-material.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/source-candidate-preview.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-readiness.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-admission.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts` - 7 files / 34 tests.
- EvidenceCorpus/runtime chain: `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-shell-owner.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-authorization-owner.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.test.ts` - 10 files / 41 tests.
- Boundary guard: `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts` - 94 tests.
- Full V2 local suite: `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime test/unit/lib/analyzer-v2` - 140 files / 836 tests.
- `npm run validate:v2-gates`.
- `node scripts/validate-v2-gate-register.mjs --self-test`.
- `npm -w apps/web run build`.
- `npm run debt:sensors` - `advisory_warn`, generated `2026-05-21T05:51:24.020Z`.

Pending before commit closeout:

- `npm run index`.
- `git diff --check`.
- Final focused staging and commit.

## Debt-Guard / Complexity Control

This was a missing-capability increase tied to W6-C's verified `refine_retrieval` stop after W6-E proved same-provider query diversity. The accepted debt is one provider, one endpoint, one Source Material kind, and a canary-based quarantine trigger.

Failed-attempt recovery during implementation:

- Full V2 tests exposed that serializing raw `candidates` on the transport outcome violated existing raw-leak expectations.
- Classification: `keep/amend`.
- Resolution: kept the OpenAlex path, removed raw candidate serialization from the transport outcome, and consumed raw OpenAlex candidates only in-process through `candidateProjectionHook` in the runtime factory.

`V2-RL-019` now tracks the removal/quarantine trigger: if W6-F1 canary still leaves W6-C at `refine_retrieval`, or OpenAlex live authority/no-key posture is unavailable, Steer-Co should quarantine/remove the OpenAlex path rather than generalize it.

## Open Items

- No W6-F1 live job has run.
- The machine live-job ledger currently records `currentRemaining = 1` before any W6-F1 canary.
- A W6-F1 canary requires focused commit, runtime refresh from that commit, route/default-admin preflight, and explicit OpenAlex no-key/credential posture before submission.

## Warnings

- Do not run another same-provider Wikimedia refinement canary as a substitute for W6-F1.
- Do not generalize W6-F1 into a provider framework before canary value is proven.
- Do not weaken W6 prompts or relax W7 gates under W6-F1 authority.

## Learnings

- OpenAlex `abstract_inverted_index` is usable as structural Source Material only if reconstructed under strict positional validation and bounded output handling.
- Raw provider candidate access should remain local to the producer function; widening transport outcome types with raw payload slots creates unnecessary leak pressure and trips the existing boundary model.
