# V2 HighJump HJ26 Bolsonaro Serper Source Material Result

**Date:** 2026-05-22  
**Role:** Captain Deputy / Lead Developer  
**Runtime commit:** `7f4ebcd5f7d78e47c81ebf59f036360d10e76fba`  
**Implementation under test:** `30d8d011e6112657189abef73d594af90ee01a84` plus docs sync `7f4ebcd5`  
**Live job:** `4a5ecd46675041eb9cdc347fc8bc2c94`  
**Input:** `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`

## Result

Classification: `STOP_X7_HJ26_BOLSONARO_W4H_PROVIDER_LINEAGE_BLOCKED`

Information yield: `new_stage_reached`

The default manual submission path stored and ran `claimboundary-v2`.
W3-B Source Material improved: the hidden/admin-only Source Material artifact
contained `9` records, `5610` aggregate bytes, and providers
`openalex`, `serper_web_search`, and `wikimedia_core`. Public/default
surfaces stayed `4.0.0-cb-precutover` / `blocked_precutover` /
`report_damaged`, with `reportMarkdown` null.

The new blocker is downstream of Source Material. W4-G created `9` bounded
text sidecars, including Serper preview sidecars. W4-H then failed closed with
`blocked_pre_extraction_input_provider_id_mismatch`; W5 therefore recorded
`blocked_pre_execution` with `w4h_packet_invalid`, and no internal report
writer artifacts were created.

## Repair

Root cause: W4-H already supports multi-source bounded text fan-in, but its
approved provider-lineage allowlist did not include the newly admitted
`serper_web_search` provider. This was an older single-provider/downstream
lineage assumption, not a Source Material failure.

Repair commit: `dbdd2acc fix(v2): admit serper extraction input lineage`

Scope: amend the existing W4-H provider allowlist and extend the existing
mixed-provider fan-in test to cover OpenAlex + Serper + Wikimedia. No new
route, prompt, schema, parser, cache/SR/storage, public behavior, report,
verdict, warning, or confidence behavior was added.

## Verification

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-authorization-owner.test.ts` passed: 2 files, 10 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2 --testTimeout=30000` passed: 145 files, 882 tests.
- `npm -w apps/web run build` passed after removing only generated `.next` artifacts corrupted by a concurrent dev build.
- `git diff --check` passed.
- `npm run debt:sensors` returned `advisory_warn` with the existing V2 footprint, boundary-guard size, docs volume, and consolidation-marker warnings.

## Next Action

Commit this result/status sync, refresh runtime to `dbdd2acc` plus docs sync,
then run one default manual V2 validation job on the same Captain-defined
Bolsonaro input.

Stop only if the next run exposes a public/default-admin/log/error leak, stale
runtime provenance, a verifier failure with unclear cause, or a blocker that
requires a standing Captain approval gate.
