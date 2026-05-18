# Lead Developer Handoff: V2 X7-W4-D EvidenceCorpus Shell Implementation

**Date:** 2026-05-18
**Role:** Lead Developer / Captain Deputy
**Agent:** Codex (GPT-5.5)
**Status:** Implementation-verified; commit pending at handoff write time
**Source package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W4-D_EvidenceCorpus_Shell_Source_Package.md`
**Package commit:** `c74bd35d`

## Summary

Implemented X7-W4-D strictly inside the approved package envelope.

W4-D now converts producer-owned W4-C corpus admission into exactly one hidden/admin-only, text-free `EvidenceCorpus` shell while keeping:

- `evidenceCorpus.kind: "shell_only"`;
- `corpusTextAccess: "closed"`;
- `semanticExtractionAuthorized: false`;
- `evidenceItemExtractionAuthorized: false`;
- `extractionInput: null`;
- `evidenceItems: []`;
- public V2 pre-cutover behavior unchanged.

No product route, artifact route, live job, source text, parser execution, Source Reliability, cache/storage, EvidenceItems, report/verdict/warning/confidence generation, provider expansion, ACS/direct URL behavior, or V1 work was added.

## Files Changed

Production:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/evidence-corpus-shell.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-source-material-admission-provenance.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-source-material-admission-owner.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-shell-owner.ts`

Tests:

- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/evidence-corpus-shell.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-source-material-admission-provenance.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-source-material-admission-owner.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-shell-owner.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Docs/status:

- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/index/handoff-index.json`

## Behavior Implemented

- Added W4-C admission runtime provenance with WeakMap/hash ownership.
- Marked W4-C admission decisions only in the W4-C owner.
- Added W4-D pure shell core that accepts only W4-C admission plus explicit runtime-owned proof.
- Added W4-D runtime owner that consumes only W4-C admission provenance and calls the pure core.
- Rejected absent W4-C admission, non-runtime-owned W4-C admission, post-mark mutated W4-C admission, non-positive W4-C admission, invalid readiness lineage, incomplete metadata, unsupported record counts, invalid hashes/lengths, leakage markers, and downstream-execution authorization.
- Preserved hash/ref-only shell output; source text never enters the W4-D corpus shell.
- Added a shell-only extraction readiness predicate that always returns false so downstream extraction cannot treat non-null corpus as ready.

## Verifiers

Passed:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/evidence-corpus-shell.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-admission.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-source-material-admission-provenance.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-source-material-admission-owner.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-shell-owner.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
```

Result: 6 files, 95 tests passed.

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
```

Result: 55 files, 290 tests passed.

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2
```

Result: 107 files, 682 tests passed.

```powershell
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
```

Result: all passed.

## Failed-Attempt Recovery

No failed focused verifier required source recovery during W4-D closeout.

## Warnings

- W4-D has no product-route artifact and no live canary.
- W4-D creates only a corpus shell/manifest, not evidence.
- A non-null `EvidenceCorpus` is not enough for extraction; downstream stages must explicitly reject `kind: "shell_only"`.
- W4-D does not authorize source text, extraction input, EvidenceItems, parser execution, report/verdict/warning/confidence, public behavior, cache/SR/storage, provider expansion, W2 endpoint migration, ACS/direct URL, or V1 cleanup.

## Learnings

The useful first EvidenceCorpus crossing is a text-free shell with explicit closed extraction semantics. That gives later stages a concrete corpus identity and lineage surface without importing Source Material text or creating analytical evidence prematurely.

## Next Recommended Step

Prepare a reviewed W4-E extraction-readiness package before any extraction work. That package should consume the shell only as a closed manifest and decide what additional gate is required before any text can become extraction input. No live job is needed until product-route observability for this boundary is explicitly approved.
