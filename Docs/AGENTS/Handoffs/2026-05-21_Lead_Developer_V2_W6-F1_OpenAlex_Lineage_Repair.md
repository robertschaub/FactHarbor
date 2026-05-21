# 2026-05-21 - Lead Developer - V2 W6-F1 OpenAlex Lineage Repair

**Role:** Lead Developer / Captain Deputy
**Package:** `Docs/WIP/2026-05-21_V2_Slice_W6-F1_OpenAlex_Bounded_Academic_Source_Material_Diversity_Review_Package.md`
**Base commit:** `7e3dafe8ce674765e77737e3b3aa007be02a7a06`
**Status:** Implemented locally, verifier-clean, not yet committed, no post-repair canary run

## Summary

The W6-F1 authority-repair canary job `130bfc4c8be94fffadf780e7a0dd3f3f`
ran on runtime `7e3dafe8ce674765e77737e3b3aa007be02a7a06`.

Classification:

`PARTIAL_X7_W6_F1_OPENALEX_SOURCE_MATERIAL_MATERIALIZED_W4H_LINEAGE_BLOCKED`

Public containment held. Hidden Source Material now includes one OpenAlex
abstract record plus Wikimedia records, and W4-G creates bounded text sidecars
for both providers. W4-H blocked before packet creation because it still carried
the older Wikimedia-only/single-provider extraction-input lineage assumption.

## Implementation

Implemented the narrowed multi-provider lineage repair recommended by Claude
Opus 4.6:

- W4-H now admits both supported Source Material kinds through the existing
  `SourceMaterialKind` contract.
- W4-H packet keeps scalar first-sidecar fields for compatibility and adds
  aligned arrays for provider ids, endpoint ids, source-material kinds, language
  codes, and per-source content packets.
- W4-H default admin projection redacts both aggregate `inputText` and each
  per-source `contentText`.
- W4-I validates provider lineage against the per-source packet list.
- W5 renders `sourceContentPacketsJson` from the approved per-source packets and
  accepts EvidenceItems copied from any approved source/content packet pair.

No public behavior, parser execution, cache/SR/storage, report/verdict/warning/
confidence behavior, provider expansion beyond the approved OpenAlex path,
ACS/direct URL support, V1 work, or V1 cleanup was added.

## Verifiers

Passed:

- Focused W4-H/W4-I/W5/sink/boundary suite:
  `5` files / `112` tests.
- Full V2 local suite:
  `140` files / `838` tests.
- `npm run validate:v2-gates`.
- `node scripts/validate-v2-gate-register.mjs --self-test`.
- `npm run debt:sensors`:
  `advisory_warn`, generated `2026-05-21T06:43:46.375Z`.
- `npm -w apps/web run build`.
- `npm run index`.
- `git diff --check`.

## Debt-Guard

DEBT-GUARD RESULT

Classification: `incomplete-existing-mechanism`

Chosen option: amend the existing W4-H/W4-I/W5 packet lineage mechanism.

Rejected path and why:

- Single-primary packet: would drop the already-admitted Wikimedia sidecars and
  create a misleading mismatch between W4-G multi-source state and W4-H input.
- Generic provider framework: not needed; W4-G and Source Material already have
  the required two-provider contract.
- Relaxing W6/W7 gates or prompt behavior: out of scope and would trade quality
  for progress.

What was removed/simplified: no path was removed; the obsolete single-provider
assumption was narrowed in place.

What was added: explicit per-source provenance arrays and source-content packet
projection inside the existing W4-H packet.

Net mechanism count: unchanged. The existing packet owner now represents the
upstream W4-G multi-source state instead of adding a parallel owner.

Budget reconciliation: touched only W4-H/W4-I/W5 source/tests, boundary guard,
ledger/status/package docs, Agent Outputs, and this handoff. The fix stayed
inside the failed canary's lineage blocker.

Verification: focused suite, full V2 suite, gates, debt sensors, and build
passed as listed above.

Debt accepted and removal trigger: `V2-RL-019` still governs W6-F1. If the next
committed/refreshed canary still fails before W6-C reassessment, classify the
new blocker with debt-guard before adding more machinery.

Residual debt: W4-H/W5 still use aggregate packet compatibility fields while
also carrying per-source packets. This is acceptable temporary compatibility
debt until a later stable EvidenceCorpus/EvidenceItem source-content contract
can retire scalar packet fields.

## Next Step

Run the pending index/diff checks, commit the focused repair, refresh runtime
from the commit, preflight authenticated no-store default-redacted routes, and
run exactly one W6-F1 lineage-repair canary if the runtime and git status are
clean.

Do not run another canary before commit/runtime refresh. Do not broaden into
another provider, public output, V1 cleanup, or report/verdict behavior.
