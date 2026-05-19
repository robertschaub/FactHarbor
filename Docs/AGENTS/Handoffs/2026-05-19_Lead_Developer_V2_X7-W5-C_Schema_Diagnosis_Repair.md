---
role: Lead Developer
date: 2026-05-19
topic: V2 X7-W5-C Evidence Schema Diagnosis Repair
related:
  - Docs/WIP/2026-05-19_V2_Slice_X7-W5-C_Evidence_Extraction_Schema_Diagnosis_Repair_Package.md
  - Docs/AGENTS/Handoffs/2026-05-19_Captain_Deputy_Steer_Co_V2_X7-W5-C_Direction.md
---

# Lead Developer Handoff: V2 X7-W5-C Evidence Schema Diagnosis Repair

### 2026-05-19 | Lead Developer | Codex (GPT-5.5) | V2 X7-W5-C Evidence Schema Diagnosis Repair

**Task:** Implement the W5-C local diagnosis/repair package for W5 `EvidenceExtractionResultSchema` failures without prompt/schema/model/provider/live-job/public behavior changes.

**Files touched:** `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction.ts`, `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction.test.ts`, `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-artifact-sink.test.ts`, `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-provenance.test.ts`, `apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-bounded-evidence-extraction-artifacts/route.test.ts`, `Docs/STATUS/Current_Status.md`, `Docs/AGENTS/Agent_Outputs.md`, `Docs/AGENTS/Handoffs/2026-05-19_Lead_Developer_V2_X7-W5-C_Schema_Diagnosis_Repair.md`.

**Key decisions:** Kept the strict `EvidenceExtractionResultSchema` unchanged and amended the existing W5 adapter telemetry. W5 now records bounded `executionTelemetry.schemaDiagnostics` for malformed JSON, schema-invalid JSON, and accepted-result task-contract mismatches. Diagnostics include only contract name/version, parse status, failure category, bounded issue count, bounded schema path segments, issue codes, negative leak booleans, and a removal/fold-in trigger. Raw provider output, Zod messages, completion text, source/input/EvidenceItem text, prompt text, stack traces, retries, fallbacks, and deterministic semantic repair were not added.

**Open items:** W5-C locally diagnoses schema failures but does not prove a live W5 EvidenceItem. If a later local or live diagnosis shows the root cause is prompt/schema contract wording, stop for a Captain-approved prompt/schema package. The temporary diagnostic field should be removed or folded into stable W5 telemetry after schema-root-cause resolution plus a later Captain-approved canary.

**Warnings:** One pre-edit required verifier attempt timed out at the tool's 120s cap and produced Vitest `EPIPE`; the same command passed with a longer timeout. During implementation, the first focused test run failed because diagnostics were initially placed at the W5 decision top level, violating the existing runtime-owned provenance key set. That attempt was classified `keep` for the diagnostic concept and amended by moving diagnostics under existing `executionTelemetry`, preserving the top-level decision contract.

**Verification:** Required W5/boundary tests passed, schema/prompt contract tests passed, `npm run validate:v2-gates` passed, `npm run debt:sensors` returned `advisory_warn`, `npm -w apps/web run build` passed, and `git diff --check` passed.

**DEBT-GUARD RESULT**

Classification: incomplete-existing-mechanism.

Chosen option: amend the existing W5 adapter telemetry and tests in place.

Rejected path and why: prompt/schema/model/provider edits and live jobs were rejected by package scope and standing Captain gates; schema relaxation, semantic alias normalization, retries, fallbacks, or new routes would obscure the contract failure instead of diagnosing it.

What was removed/simplified: raw JSON parse error detail and raw Zod error messages are no longer kept as W5 attempt failure messages for parse/schema failures; they are replaced by bounded status labels and structural diagnostics.

What was added: bounded W5 schema diagnostics on existing `executionTelemetry`, plus focused adapter/sink/route leak tests.

Net mechanism count: unchanged. The diagnostic rides on existing W5 telemetry/artifact route; no new route, execution path, fallback, retry, flag, or public surface was added.

Budget reconciliation: actual diff stayed within the W5 core/test/status/handoff envelope. The initially attempted top-level field was narrowed into existing telemetry after focused provenance tests failed.

Verification: required focused tests, schema/prompt contract tests, V2 gate validation, debt sensors, build, and diff check completed.

Debt accepted and removal trigger: planned temporary diagnostic telemetry owned by Lead Developer; remove or fold into stable W5 telemetry after W5 schema root cause is resolved and a later Captain-approved canary verifies W5 behavior.

Residual debt: W5 still needs a committed/refreshed, separately approved live canary after local diagnosis/repair to prove hidden EvidenceItem value or identify a Captain-gated prompt/schema blocker.

**V2 SCORECARD IMPACT**

Quality dimension advanced: V2-Q3 Evidence extraction.

Direct user/report value: none yet; public V2 remains pre-cutover/damaged.

Hidden-only value: high; W5 schema failures now produce actionable bounded structural diagnostics without raw text leakage.

Cost/latency impact: positive; avoids another live canary until local diagnosis is verifier-clean.

Retirement or simplification unlocked: future W5 canary evidence may unlock W4-I/W4-chain consolidation per V2-RL-010 through V2-RL-014.

Scorecard risk: temporary diagnostics must not become a permanent hidden layer without follow-up EvidenceItem/report value.

**V2 RETIREMENT LEDGER IMPACT**

Rows touched: V2-RL-010, V2-RL-011, V2-RL-012, V2-RL-013, V2-RL-014.

Status changes: none.

New mechanism owner: Lead Developer owns temporary W5 schema diagnostics.

Removal / merge trigger: remove or fold into stable W5 telemetry after schema-root-cause resolution plus a later Captain-approved canary.

Debt accepted: bounded temporary diagnostic telemetry only.

**V2 CONSOLIDATION GATE**

Package: X7-W5-C Evidence Extraction Schema Diagnosis Repair.

Substantial expansion: yes, but bounded to existing W5 telemetry/artifact projection.

Value produced: local schema-failure classification and path/code diagnosis for W5 failures.

Retires / merges / demotes / quarantines: none yet.

Debt kept and removal trigger: temporary W5 diagnostics, removal/fold-in trigger listed above.

Mechanical debt sensor run: `npm run debt:sensors` -> `advisory_warn` with existing footprint/docs/consolidation warnings.

Steer-Co exception: existing package authorization covered bounded temporary diagnostics; no new exception needed.

**For next agent:** Do not run another live job from this uncommitted work. If Captain approves a W5-C follow-up canary, commit first, refresh runtime, then inspect `executionTelemetry.schemaDiagnostics` on the authenticated W5 artifact route if W5 still returns `schema_validation_failed`.

**Learnings:** W5 decision top-level shape is provenance-sensitive; add diagnostic detail under existing telemetry or update provenance deliberately with a reviewed contract reason.

### 2026-05-19 Review-Fix Update

Addressed three medium review findings inside the W5-C envelope. `issueCount` now equals the emitted bounded issue array length, and nested schema issue traversal stops at the same cap instead of collecting an unbounded nested set first. Task-contract validation diagnostics now use allowlisted structural codes such as `approved_packet_mismatch` instead of prose `contentError` strings. Default artifact projection now re-sanitizes runtime-owned `schemaDiagnostics` before route exposure, so malformed diagnostic fields are replaced with fixed contract labels, allowlisted status/code values, capped issue arrays, bounded schema path segments, and negative leak flags.

Added focused tests for bounded issue counts, task-contract diagnostic codes, and unsafe seeded diagnostic values in sink and route projections. Re-ran the required W5-C verifier set: focused W5/route/boundary tests passed (`101` tests), schema/prompt contract tests passed (`11` tests), `npm run validate:v2-gates` passed, `npm run debt:sensors` returned advisory warnings only, `npm -w apps/web run build` passed, and `git diff --check` passed after the final documentation update.
