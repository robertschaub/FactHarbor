---
role: Lead Developer / Captain Deputy
date: 2026-05-17
topic: V2 X7-U1 Query Planning Diagnostic Live-Smoke Package
related:
  - Docs/WIP/2026-05-17_V2_Slice_X7-U0_Query_Planning_Adapter_Diagnostics_Source_Package.md
  - Docs/WIP/2026-05-17_V2_Slice_X7-U1_Query_Planning_Diagnostic_Live_Smoke_Package.md
---

# Lead Developer Handoff: V2 X7-U1 Query Planning Diagnostic Live-Smoke Package

### 2026-05-17 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 X7-U1 Query Planning Diagnostic Live-Smoke Package

**Task:** Prepare the separate diagnostic live-smoke gate after X7-U0 added hidden Query Planning adapter attempt diagnostics.

**Files touched:** `Docs/WIP/2026-05-17_V2_Slice_X7-U1_Query_Planning_Diagnostic_Live_Smoke_Package.md`, `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`, this handoff, and generated `Docs/AGENTS/index/handoff-index.json`.

**Decision:** X7-U1 consumes at most one live job from Captain's current max-8 authorization. It uses only the exact German Captain-defined input from X7-T-S, on committed X7-U0 diagnostics code, to capture sanitized `adapterAttemptDiagnostics` before any prompt/schema/provider/config/model repair decision.

**Scope:** Docs-only package. No source, prompt, schema, config, model, provider, API/UI, report, export, cache/SR/storage, source/search/fetch/parser, ACS/direct URL, or V1 changes are authorized inside X7-U1.

**Verification before commit:** Package verifiers are safe-local/docs only: `npm run validate:v2-gates`, `node scripts/validate-v2-gate-register.mjs --self-test`, `npm run index`, `git diff --check`, and clean status. Runtime verifiers are listed in the package and must run after commit before the live job.

**For next agent:** Commit this package first. Then refresh runtime using the corrected exact-gate launcher, prove the actual serving process has the three V2 gates, verify all hidden artifact routes are admin-only/no-store, run the clean idle checkpoint, submit exactly one German `claimboundary-v2` job, and record the public non-leak plus hidden artifact diagnostics. Stop after that one job regardless of whether Query Planning is damaged or accepted.

**Warnings:** Do not patch prompts or schemas before the X7-U1 diagnostic result is recorded. Do not submit an English canary or replacement job inside X7-U1.

**Learnings:** X7-U1 exists to choose the repair layer from evidence; it should not become another setup-recovery or prompt-experiment loop.
