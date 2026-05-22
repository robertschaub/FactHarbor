# Captain Deputy Handoff: V2 HighJump HJ12 W5 Event Contract Result

**Date:** 2026-05-22
**Role:** Captain Deputy / Lead Developer
**Agent:** Codex (GPT-5.5) with Steer-Co quick consent
**Tier:** Significant
**Status:** HJ12 canary completed; next step is retrieval-quality package, not another same-shape canary

## Summary

HJ11 source-coverage repair commit `bf1f0011898956bb2efabd2044cfce9be30defb5`
worked structurally but exposed a W5 schema failure on malformed
`integrityEvents`. HJ12 commit
`40207da59a521041879617f94c349162eb86a273` amended only the existing
`V2_EVIDENCE_EXTRACTION` prompt section with the canonical task-event contract
and updated the prompt-contract test.

HJ12 canary job `4dfbcd7627414738b0216d200df550c4` ran `claimboundary-v2` on
runtime `40207da59a521041879617f94c349162eb86a273` and is classified:

`PASS_X7_HJ12_W5_EVENT_CONTRACT_REPAIR_INTERNAL_ALPHA_UNVERIFIED`

## Verifiers Before Canary

- Focused W5/prompt route set: pass, 4 files / 23 tests.
- Full V2 unit slice: pass, 142 files / 859 tests.
- `npm run validate:v2-gates`: pass.
- `node scripts/validate-v2-gate-register.mjs --self-test`: pass.
- `npm run debt:sensors`: `advisory_warn` with known V2 footprint/docs/guard warnings.
- `npm -w apps/web run build`: pass.
- `git diff --check`: pass.

## Canary Result

- W4-A admitted `9` Source Material records: `1` OpenAlex and `8` Wikimedia.
- W4-H carried `9` source-material refs into one bounded extraction-input packet.
- W5 completed hidden EvidenceItem extraction with `6` EvidenceItems.
- W5 `schemaDiagnostics = null`.
- W8-B created an internal Alpha result candidate.
- W8-G created an internal Alpha draft: `5387` bytes, hash
  `f0f8c9031e7c04dd82427c177741b5b2ed3ced12e87852330ecd8d42aa6f6d28`.

The internal draft remains `UNVERIFIED` with internal truth/confidence candidate
`0` / `0`. The active gap is now direct comparative source quality, not W5
schema conformance or W7-B off-comparator positive drift.

## Containment

- Public V2 stayed `4.0.0-cb-precutover` / blocked/damaged.
- W8-G default admin route is hash/length/provenance-only and no-store.
- W8-G inspection requires explicit authenticated inspection.
- W8-G unauthenticated access returned `401`.
- No public/default-admin prompt text, source text, provider payload, hidden
  ledger id, or draft text leak was found.

## Budget And Provenance Warning

Two HJ11 operational misses consumed live-job slots without exercising V2:

- `1a5e8f236a164c598429ea6ed3334a69`: stale-runtime/wrong-variant miss.
- `897c97cd4180493b93da09bf2cf2d9db`: refreshed runtime but submitted
  `claimboundary` instead of `claimboundary-v2`.

Steer-Co consented to one corrective HJ11 V2 canary and one HJ12 canary to avoid
an artificial stop. The live-job ledger now records the exception accounting and
sets current remaining budget to `0`. Do not run another live job until there is
a reviewed package plus Steer-Co/Captain budget reconciliation.

## Next Action

Prepare HJ13 as a bounded retrieval-quality/source-selection package. It should
target direct comparative efficiency evidence for the selected claim and avoid:

- generic fan-in increases without evidence that direct-comparison material is
  being truncated;
- verdict prompt patches before the evidence portfolio is direct enough;
- public V2 exposure;
- V1 work or cleanup.

## Warnings

- HJ12 is not a full report-quality pass.
- Do not count the V1 wrong-variant jobs as V2 evidence.
- Do not run another canary from the exhausted HighJump tranche without budget
  reconciliation.
- Do not add deterministic comparator heuristics; any comparative source-quality
  judgment must remain LLM-owned or be structural only.

## Learnings

- The previous W5 schema repair was sufficient for a smaller source packet but
  the broader HJ11 packet exposed the missing event-object prompt contract.
- Prompt-contract tests should cover every executable Evidence Lifecycle section
  for canonical event shape, not only the sections that previously failed.
- Source coverage is now broader, but report quality still depends on direct
  comparative evidence, not just more contextual records.
