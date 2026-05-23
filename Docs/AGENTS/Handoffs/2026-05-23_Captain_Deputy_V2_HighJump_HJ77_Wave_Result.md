---
### 2026-05-23 | Captain Deputy | Codex | V2 HighJump HJ77 Wave Result

**Task:** Implement and validate HJ77 prompt-only target-frame/directness repair, then run exactly one four-job wave from the active 12-job tranche.

**Implementation commit:** `1090e7db0bbf079fc8d7339c49d5654e36815aaa`

**Files touched before live jobs:**
- `apps/web/prompts/claimboundary-v2.prompt.md`
- `Docs/WIP/2026-05-23_V2_HighJump_HJ77_Target_Frame_Directness_Prompt_Repair.md`
- `Docs/STATUS/V2_Current_Lane.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`
- `Docs/AGENTS/Agent_Outputs.md`

**Verifier result before live jobs:**
- Prompt contracts: pass, 3 files / 25 tests.
- Boundary guard: pass, 96 tests.
- Web build: pass.
- `npm run debt:sensors`: `advisory_warn` only.
- `npm run index`: pass.
- `git diff --check`: pass, with only the known Backlog CRLF warning.
- `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`: JSON parse pass.

**Runtime preflight:** Runtime refreshed with `scripts/restart-clean.ps1`. Web/API version endpoints both reported `1090e7db0bbf079fc8d7339c49d5654e36815aaa`. Runner-key preflight returned `400 Missing jobId`, proving auth passed. Admin-key preflight returned `200`. Default pipeline remained `claimboundary-v2`.

**Live jobs:** The HJ77 wave submitted four exact Captain-defined inputs through `/api/fh/analyze` without explicit `pipelineVariant`, relying on the verified default V2 setting.

| Input family | Job id | Outcome |
| --- | --- | --- |
| hydrogen | `9ef3a6cf64244c6ea87f200e0db58fd0` | `SUCCEEDED`; internal report still includes `MOSTLY-TRUE` 72/68 driven by vehicle-level / hybrid-comparator evidence, plus `LEANING-FALSE` and `MIXED` candidates. |
| plastic | `3c8eb6181a5941a69219f9562f338ffa` | `SUCCEEDED`; improved by adding a `MIXED` 50/68 countervailing-value verdict, but still includes a `MOSTLY-TRUE` 74/82 recycling-outcomes verdict. |
| Bolsonaro EN | `5f4eb7709fc6416eaec2e8ab961f8d33` | `SUCCEEDED`; Brazilian-law compliance moved to `LEANING-TRUE` 62/58, international fair-trial standards remain `UNVERIFIED` 48/42. |
| asylum-WWII DE | `6f4fb7f9c5ce41579f53c657e3c07528` | `SUCCEEDED`; W5 stopped as `hidden_no_extractable_evidence` with zero EvidenceItems and a structural stop report. |

**Classification:** `STOP_X7_HJ77_TARGET_FRAME_PROMPT_REPAIR_PARTIAL_IMPROVEMENT_HYDROGEN_WRONG_SIDE_AND_ASYLUM_W5_STOP`

**Information yield:** `same_stop_repeated_with_new_evidence`

**Containment:** Pass. Public/default job responses had no report markdown, verdict label, truth percentage, confidence, `adminDiagnostics`, or non-public result keys. Public V2 stayed `4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged`.

**Budget:** HJ76 consumed 4 and HJ77 consumed 4 from the active 12-job tranche. Remaining live-job budget: `4`. Do not run HJ76 Wave 2 or a second HJ77 wave.

**Next owner:** HJ78 should target source-material usefulness/direct-comparator yield. The prompt-only target-frame repair helped plastic/Bolsonaro, but hydrogen still depends on off-comparator evidence and asylum-WWII has no extracted EvidenceItems. Do not stack another broad prompt-only tweak without new owner evidence.

**Primary evidence:** `Docs/WIP/canary-evidence-hj77-target-frame-directness-prompt-repair.json`

**Warnings:** The HJ77 runtime records `promptContentHash: null` in the public pre-cutover result envelope, as earlier V2 public envelopes do; the expected file-loaded prompt hash for HJ77 is `d37a3110880aab898a346b8264e741f20ae607e4199071d33545280fa1003e3d`, and the runtime commit carries the edited prompt file.

**Learnings:** HJ77 confirms a split owner. Prompt target-frame guidance can improve calibration when the evidence set already contains countervailing material, but it cannot create missing direct comparator/source material. Hydrogen and asylum-WWII need source-material yield improvement before more verdict/report prompt tuning is likely to pay off.
---
