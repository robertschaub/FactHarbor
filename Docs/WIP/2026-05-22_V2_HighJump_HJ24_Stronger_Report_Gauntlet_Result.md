# V2 HighJump HJ24 Stronger Report Gauntlet Result

**Date:** 2026-05-22  
**Status:** `PASS_WITH_OPEN_GENERALIZATION_GAP`  
**Runtime range:** `1748a40b` -> `beb23bca`  
**Live-job tranche:** Captain reset to `18`; HJ24 consumed `7`; remaining `11`.

## Purpose

Captain asked for stronger validation than single "canaries". HJ24 therefore used a compact multi-job gauntlet across Captain-defined inputs to push Pipeline V2 toward complete internal reports while preserving public pre-cutover containment.

Captain-defined inputs used:

- `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`
- `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`
- `Using hydrogen for cars is more efficient than using electricity`

## Result Summary

HJ24 produced two complete hidden/internal V2 report-writer drafts:

- German asylum input passed end-to-end on runtime `366dce54`: W5 extracted `1` EvidenceItem; report writer produced a `2891` byte internal draft with `Evidence References` and `2` citations.
- Hydrogen input passed after prompt repair `beb23bca`: W5 extracted `4` EvidenceItems; W8 produced result/draft artifacts; report writer produced a `5906` byte internal draft with `Evidence References` and no `boundary_reference_mismatch`.

HJ24 also proved the Bolsonaro path now reaches W5 after W3-B/W4-A repairs, but it still returns `hidden_no_extractable_evidence`. This is now the main open generalization gap.

Public/default containment held across the gauntlet: public V2 stayed `4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged`; public/default job/page surfaces did not expose hidden reports, hidden statuses, EvidenceItem text, source text, prompt text, provider payloads, or internal report-writer output.

## Jobs

| Job | Input | Commit | Classification | Information yield |
|---|---|---:|---|---|
| `315886278aa34b4a9ba8fd91d9ac3cc0` | Bolsonaro EN | `1748a40b` | `STOP_X7_HJ24_BOLSONARO_W3B_LATER_FETCH_FAILURE` | new failure |
| `d2aaaee251cd40bb9d6dd2291d235a76` | Bolsonaro EN | `c6c55913` | `STOP_X7_HJ24_BOLSONARO_W4A_FETCH_DIAGNOSTIC_OVERSTRICT` | new failure |
| `34e0057f557a4e3f859702dbb1a45874` | Bolsonaro EN | `ea8246ff` | `STOP_X7_HJ24_BOLSONARO_W5_NO_EXTRACTABLE_EVIDENCE` | new stage reached |
| `4d9ff1dd1292405e8796937472774e51` | Bolsonaro EN | `366dce54` | `STOP_X7_HJ24_BOLSONARO_W5_NO_EXTRACTABLE_EVIDENCE_AFTER_PROMPT_LOWERING` | same stop with new evidence |
| `b943c31f416941c9b46887e5b996c901` | Asylum DE | `366dce54` | `PASS_X7_HJ24_ASYLUM_FULL_INTERNAL_REPORT_DRAFT_CREATED` | report produced |
| `069c89a05dac466ba0af15d072ae6939` | Hydrogen | `366dce54` | `STOP_X7_HJ24_HYDROGEN_REPORT_WRITER_BOUNDARY_REFERENCE_MISMATCH` | new failure |
| `0a769c00825e48e5933cb1b1286b85c1` | Hydrogen | `beb23bca` | `PASS_X7_HJ24_HYDROGEN_REPORT_WRITER_BOUNDARY_ID_REPAIR_VERIFIED` | report produced |

## Repairs Completed

- `c6c55913 fix(v2): keep w3b material after later fetch failure`
  - Amended W3-B so usable Source Material is retained when a later bounded fetch fails.
- `ea8246ff fix(v2): admit material despite later fetch diagnostics`
  - Amended W4-A so valid Source Material records can proceed while failed fetches remain diagnostics.
- `366dce54 fix(v2): lower premature evidence extraction stop`
  - Amended W5 prompt contract to prefer bounded extraction over premature empty output when supplied content can support a structured EvidenceItem without invention.
- `beb23bca fix(v2): preserve report writer boundary ids`
  - Amended `V2_AGGREGATION_NARRATIVE` to require exact verdict/boundary section cardinality and exact supplied ID preservation.

## Verifiers For Latest Repair

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts` - pass, `10` tests.
- `npm run validate:v2-gates` - pass.
- `npm run debt:sensors` - `advisory_warn` for known V2 source/test/docs/guard footprint and consolidation-marker pressure.
- `git diff --check` - pass.
- `npm -w apps/web run build` - pass.

## Latest Canary Evidence

Job `0a769c00825e48e5933cb1b1286b85c1` on runtime `beb23bcafc44e156b10406833c47cd09a142686e`:

- job status `SUCCEEDED`, progress `100`;
- W5 status `hidden_evidence_item_extraction_completed`;
- W5 EvidenceItems `4`;
- W8 result status `internal_alpha_report_result_candidate_created`;
- W8 draft status `internal_alpha_report_draft_created`, draft bytes `6027`;
- internal report writer status `internal_report_writer_draft_created`;
- internal report writer markdown bytes `5906`;
- `Evidence References` present;
- `boundary_reference_mismatch` absent;
- default internal report-writer projection kept `reportMarkdownReturned = false`;
- unauthenticated internal report-writer route returned `401`;
- public job API and public job page did not contain `Evidence References`, `internal_report_writer_draft_created`, or `hidden_evidence_item_extraction_completed`.

## Debt-Guard Result

Path: Full.

Classification: `incomplete-existing-mechanism`.

Decision: amend existing mechanisms in place. The W3-B/W4-A repairs narrowed fail-fast behavior around already-bounded materialization; the W5 and report-writer repairs tightened existing prompt contracts. No retry loop, parallel report path, schema relaxation, provider expansion, parser/cache/SR/storage behavior, public projection, V1 work, or new hidden readiness layer was added.

Residual debt:

- Bolsonaro still reaches W5 and returns no extractable evidence after prompt lowering. Treat the next move as source-content/usefulness and evidence-extraction generalization work, not as a solved report-writer issue.
- The V2/docs/guard footprint remains above advisory sensor thresholds and should be consolidated after the current report path is stable enough.

## Next Direction

Continue HighJump with a balanced next step:

1. Do not run another hydrogen validation solely for the repaired boundary-id issue.
2. Use one next job on a non-hydrogen Captain-defined input only after a focused source-content/usefulness repair or selection improvement is committed and runtime-refreshed.
3. Prefer improving the existing source-material/evidence-extraction path over adding another proof/readiness layer.
4. Keep public V2 blocked/precutover until Captain explicitly approves public cutover.
