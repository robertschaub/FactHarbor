---
role: Lead Developer / Captain Deputy
date: 2026-05-17
topic: V2 X7-U0 Query Planning Adapter Diagnostics Source Package
related:
  - Docs/WIP/2026-05-17_V2_Slice_X7-T-S_Final_Launcher_Exact_Gate_Smoke_Result.md
  - Docs/WIP/2026-05-17_V2_Slice_X7-U0_Query_Planning_Adapter_Diagnostics_Source_Package.md
---

# Lead Developer Handoff: V2 X7-U0 Query Planning Adapter Diagnostics Source Package

### 2026-05-17 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 X7-U0 Query Planning Adapter Diagnostics Source Package

**Task:** Prepare the source package for bounded admin-only Query Planning adapter attempt diagnostics after X7-T-S exposed `schema_validation_failed` without failure detail.

**Files touched:** `Docs/WIP/2026-05-17_V2_Slice_X7-U0_Query_Planning_Adapter_Diagnostics_Source_Package.md`, `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`, and generated `Docs/AGENTS/index/handoff-index.json`.

**Decision:** Do not patch the Query Planning prompt yet. The exact schema failure path is unknown because the X7-S runtime artifact drops adapter attempt diagnostics. Architect, Security/runtime, Code/package, and LLM/semantic reviewers approved diagnostics first.

**Approved envelope:** `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-runtime-artifact-sink.ts`, focused tests for the artifact/route/public non-leak behavior, and protocol docs/status/handoff/index. If diagnostics cannot be derived safely from existing `adapterOutcome.attempts`, stop and draft a revised package before editing model adapter/runtime/provider/prompt/config/schema code.

**For next agent:** Implement the diagnostics in the artifact sink only if possible. Keep diagnostics bounded, sanitized, admin-only, no-store, and non-public. Do not include raw provider output, rendered prompt text, user input text, source URLs/content, secrets, stack traces, or unbounded strings. After source commit, the next live step needs a separate X7-U1 package.

**Warnings:** X7-U0 does not authorize prompt edits, live jobs, retries, model escalation, source/search/fetch/parser/SR/cache IO, public output changes, ACS/direct URL, V1 reuse, or V1 cleanup.

**Learnings:** For LLM schema failures, strict schema plus hidden diagnostics is lower risk than blind prompt edits. Repair target selection should wait for bounded schema-path evidence.
