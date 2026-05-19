# V2 X7-W4-G Bounded Corpus Text Authorization Implementation

**Date:** 2026-05-19
**Role:** Lead Developer / Captain Deputy
**Agent:** Codex (GPT-5.5)
**Status:** Implementation complete locally; no live job run
**Source package:** `Docs/WIP/2026-05-19_V2_Slice_X7-W4-G_Bounded_Corpus_Text_Authorization_Review_Package.md`

## Summary

Implemented W4-G inside the accepted package envelope. The product V2 hidden runtime now creates one runtime-owned hidden/admin-only bounded corpus-text sidecar from the W3-B page-summary Source Material text, capped at `4096` bytes, after W4-C/W4-D/W4-E provide same-ledger corpus closure and extraction-denial evidence.

The W4-D shell-only EvidenceCorpus and W4-E extraction denial remain unchanged. W4-G adds a linked sidecar/decision and records it in a bounded in-memory artifact sink. The new internal artifact route is authenticated, no-store, and hash/length/provenance-only by default. Optional text inspection was intentionally not implemented in this slice.

## Files Changed

Production:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/bounded-text-authorization.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-authorization-owner.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-authorization-provenance.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-artifact-sink.ts`
- `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-evidence-corpus-bounded-text-artifacts/route.ts`
- `apps/web/src/lib/analyzer-v2/orchestrator.ts`

Tests and guards:

- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/bounded-text-authorization.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-authorization-owner.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-authorization-provenance.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-artifact-sink.test.ts`
- `apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-evidence-corpus-bounded-text-artifacts/route.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Status/handoff:

- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Handoffs/2026-05-19_Lead_Developer_V2_X7-W4-G_Implementation.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/index/handoff-index.json` after `npm run index`

## Behavior Implemented

- Positive W4-G status: `bounded_corpus_text_sidecar_created_extraction_gate_closed`.
- Text parent: runtime-owned W3-B `source_material_page_summary_completed` decision with exactly one `wikimedia_page_summary_extract_text` record.
- Corpus closure evidence: runtime-owned W4-C admission and W4-D shell, plus W4-E `extraction_denied_shell_only` / `shell_only_corpus`.
- W4-E note: the accepted implementation envelope did not include a separate W4-E provenance sidecar, so W4-G validates W4-E as exact structural closure evidence anchored by runtime-owned W4-D shell provenance.
- Sidecar posture:
  - `kind: "bounded_text_sidecar"`
  - `visibility: "internal_admin_only"`
  - `publicPointerExposure: "forbidden"`
  - `corpusTextAccess: "internal_admin_only_bounded_text_sidecar"`
  - `preservesShellOnlyCorpus: true`
  - `mutatesShellCorpus: false`
  - `mutatesExtractionDenial: false`
  - extraction input and EvidenceItems remain absent.
- Default route projection redacts the bounded text and returns hash/length/provenance only.

## Verification

Passed:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/bounded-text-authorization.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-authorization-owner.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-authorization-provenance.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-evidence-corpus-bounded-text-artifacts/route.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
```

Results:

- Focused W4-G + boundary guard: `6` files, `97` tests passed.
- Analyzer V2 runtime slice: `61` files, `303` tests passed.
- Analyzer V2 slice: `115` files, `705` tests passed. One earlier full-slice attempt showed suite-load timeouts/cross-test pressure; `orchestrator.test.ts` passed in isolation and the exact full slice passed on rerun.
- Web build passed.
- V2 gate validation and gate-register self-test passed.
- Whitespace check passed.

## Debt-Guard Result

Classification: failed-attempt recovery for test maintenance, not production behavior.
Chosen option: amend existing tests/guard bookkeeping.
Rejected path and why: production changes were rejected because verifier evidence pointed only to a fixture helper name shadow and boundary guard file enumeration.
What was removed/simplified: no production code removed.
What was added: no new mechanisms; test guard enumeration updated for W4-G.
Net mechanism count: unchanged.
Budget reconciliation: actual fix touched only the expected tests/guard.
Verification: focused and broad safe-local verifiers listed above.
Debt accepted and removal trigger: none.
Residual debt: boundary-guard full-suite runtime remains long and can show timing sensitivity under heavy parallel load, but it passed as the dedicated guard and in the rerun full analyzer slice.

## Warnings

- No live job was run.
- A W4-G canary remains separately gated and would consume one of the remaining `3` live jobs.
- W4-G does not authorize extraction input, EvidenceItems, parser execution, report/verdict/warning/confidence behavior, public behavior, cache/SR/storage, retries, provider expansion, W2/W3 widening, ACS/direct URL, V1 work, or V1 cleanup.
- The new route is internal/admin-only/no-store. It does not expose bounded text by default.

## Learnings

- First text-bearing EvidenceCorpus progress is cleanest as a linked bounded-text sidecar, not by mutating the W4-D shell or reopening W4-E denial.
- Default admin observability should prove text provenance through hashes and lengths; actual text inspection can remain a later, explicit governance decision.
