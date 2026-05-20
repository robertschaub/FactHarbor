---
role: Lead Developer
date: 2026-05-20
topic: V2 X7-W5-D Evidence Extraction Prompt Contract Alignment
related:
  - Docs/WIP/2026-05-19_V2_Slice_X7-W5-D_Evidence_Extraction_Prompt_Contract_Alignment_Review_Package.md
  - Docs/WIP/2026-05-19_V2_Slice_X7-W5-C_Evidence_Extraction_Schema_Diagnosis_Live_Result.md
---

# Lead Developer Handoff: V2 X7-W5-D Prompt Contract Alignment

### 2026-05-20 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 X7-W5-D Prompt Contract Alignment

**Task:** Implement the Captain-approved W5-D analysis prompt edit after W5-C proved schema-validation failure at W5 evidence extraction.

**Files touched:** `apps/web/prompts/claimboundary-v2.prompt.md`, `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`, `Docs/WIP/2026-05-19_V2_Slice_X7-W5-D_Evidence_Extraction_Prompt_Contract_Alignment_Review_Package.md`, `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`, `Docs/AGENTS/V2_Retirement_Ledger.md`, this handoff, and generated handoff index.

**What changed:** The `V2_EVIDENCE_EXTRACTION` prompt section now clarifies the strict schema branch rules for accepted/blocked/damaged outputs, concrete `evidenceScope` fields, strict `provenance` fields, and null/empty-array requirements. The prompt remains topic-neutral and adds no examples or Captain input terms.

**What did not change:** No schema files, runtime code, provider/model routing, retries, deterministic semantic repair, output aliasing, parser/cache/SR/storage behavior, public API/UI/report/export/compatibility behavior, report/verdict/warning/confidence behavior, ACS/direct URL behavior, V1 work, or V1 cleanup.

**Verification:** Focused W5-D verifier set passed (6 files / 111 tests); `npm run validate:v2-gates` passed; `npm run debt:sensors` returned `advisory_warn`; `npm -w apps/web run build` passed; `git diff --check` passed.

**Warnings:** No W5-D live job has run. A canary requires a separate Captain authorization, focused commit/runtime refresh, clean git status, and W5-D pass/stop criteria. The unrelated dirty file `Docs/AGENTS/Handoffs/2026-05-19_Claude_Monitor_V2_Progress_Report.md` pre-existed this implementation and was not touched.

**V2 SCORECARD IMPACT**

- Quality dimension advanced: V2-Q3 Evidence extraction.
- Direct user/report value: none until a later canary produces accepted EvidenceItem output and later stages consume it.
- Hidden-only value: W5 prompt contract is now aligned with the strict output schema that W5-C identified as the blocker.
- Cost/latency impact: positive; the next live job should test a targeted prompt-contract fix instead of repeating the same schema failure.
- Retirement or simplification unlocked: a passing W5 canary can trigger W5-C diagnostic fold-in and W4-I/W4-chain merge planning.
- Scorecard risk: still unproven live until a canary runs.

**V2 RETIREMENT LEDGER IMPACT**

- Rows touched: V2-RL-009, V2-RL-010, V2-RL-011, V2-RL-012.
- Status changes: none.
- New mechanism owner: none; existing W5 prompt contract amended.
- Removal / merge trigger: schema-valid W5 canary should trigger W5-C diagnostic fold-in and W4-I standalone denial proof merge/quarantine planning.
- Debt accepted: none beyond existing temporary W5-C diagnostics.

**V2 CONSOLIDATION GATE**

- This implementation adds no hidden runtime mechanism.
- It amends the existing W5 task contract and test coverage.
- Latest debt sensors: `advisory_warn` with existing V2 footprint, test footprint, boundary guard size, docs volume, debt-guard telemetry, and consolidation-marker warnings.

**DEBT-GUARD RESULT**

Classification: incomplete-existing-mechanism.

Chosen option: amend existing W5 prompt contract and focused prompt-contract test.

Rejected path and why: schema relaxation, deterministic output repair/aliasing, retries/fallback extraction, provider/model routing changes, and another hidden diagnostic layer would hide or bypass the strict task contract failure rather than fixing it.

Net mechanism count: unchanged.

Residual risk: W5-D still requires one canary to prove schema-valid live output.
