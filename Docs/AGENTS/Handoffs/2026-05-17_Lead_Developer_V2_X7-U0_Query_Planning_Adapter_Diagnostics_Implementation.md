---
role: Lead Developer / Captain Deputy
date: 2026-05-17
topic: V2 X7-U0 Query Planning Adapter Diagnostics Implementation
related:
  - Docs/WIP/2026-05-17_V2_Slice_X7-U0_Query_Planning_Adapter_Diagnostics_Source_Package.md
  - Docs/WIP/2026-05-17_V2_Slice_X7-T-S_Final_Launcher_Exact_Gate_Smoke_Result.md
---

# Lead Developer Handoff: V2 X7-U0 Query Planning Adapter Diagnostics Implementation

### 2026-05-17 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 X7-U0 Query Planning Adapter Diagnostics Implementation

**Task:** Implement the approved X7-U0 diagnostics-only source package after X7-T-S reached hidden Query Planning runtime/model invocation but produced a damaged `schema_validation_failed` result without adapter attempt detail.

**Files touched:** `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-runtime-artifact-sink.ts`, `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-runtime-artifact-sink.test.ts`, `apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-runtime-artifacts/route.test.ts`, `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`, `Docs/WIP/2026-05-17_V2_Slice_X7-U0_Query_Planning_Adapter_Diagnostics_Source_Package.md`, `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`, and generated `Docs/AGENTS/index/handoff-index.json`.

**Implementation:** Added hidden/admin-only `adapterAttemptDiagnostics` to the X7-S Query Planning runtime artifact, derived only from existing `adapterOutcome.attempts`. The diagnostics include bounded attempt metadata, prompt-content hash, bounded provider telemetry, failure category, issue count, and sanitized structural issue details. URL-like text, email-like text, and long quoted literals are redacted; diagnostics stay behind the existing authenticated no-store route.

**Preserved gates:** Damaged Query Planning artifacts still expose zero query entries, no source-language policy, and blocked source-acquisition handoff. X7-U0 did not change prompts, schemas, config, model policy, provider factory, acceptance logic, retries, source/search/fetch/parser/SR/cache IO, EvidenceCorpus/evidence/report/verdict/confidence behavior, public output, ACS/direct URL, or V1 code. No live jobs were run under X7-U0.

**Failed-verifier recovery:** The first full `analyzer-v2` verifier failed only because the boundary guard did not yet allow the shared pure V2 `isRecord` utility import in the X7-S runtime artifact sink. The source change was kept, and the guard allowlist was amended in the X7-S test block instead of reintroducing local duplicate type-guard logic.

**Verification:**

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-runtime-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-runtime-artifacts/route.test.ts` — pass, 2 files / 8 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime` — pass, 39 files / 228 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts` — pass after allowlist correction, 71 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` — pass after correction, 80 files / 568 tests.
- `npm -w apps/web run test -- test/unit/app/api/internal/analyzer-v2` — pass, 4 files / 19 tests.
- `npm -w apps/web run build` — pass.
- `npm run validate:v2-gates` — pass.
- `node scripts/validate-v2-gate-register.mjs --self-test` — pass.
- `git diff --check` — pass.

**DEBT-GUARD RESULT**

Classification: incomplete-existing-mechanism. X7-S already recorded hidden runtime artifacts and adapter attempts already carried failure detail, but the artifact projection dropped the attempt diagnostics.

Chosen option: amend the existing artifact sink and route tests in place.

Rejected path and why: prompt/schema/provider repair was rejected because the exact schema failure path was still unknown; adding a new diagnostic route was rejected because the existing authenticated no-store route already owned this hidden artifact surface.

What was removed/simplified: no mechanism removed; duplication was avoided by using the existing pure V2 `isRecord` helper and explicitly updating the boundary guard.

What was added: bounded `adapterAttemptDiagnostics` projection, sanitization helpers, focused tests for damaged schema attempts and route visibility, and a boundary-guard allowlist entry for the pure helper import.

Net mechanism count: unchanged.

Budget reconciliation: patch stayed within the approved X7-U0 source/test/status/handoff/index envelope. The only failed-verifier correction was the boundary guard allowlist.

Verification: focused artifact/route tests, runtime slice, analyzer-v2 slice, internal route slice, build, V2 gate validators, and whitespace check passed.

Debt accepted and removal trigger: none.

Residual debt: the next diagnostic smoke must run on a committed, refreshed runtime before any prompt/schema repair is selected.

**For next agent:** Prepare a separate X7-U1 diagnostic live-smoke package, then run a bounded canary on committed code to collect `adapterAttemptDiagnostics`. Only after that evidence should the team choose a prompt, schema, adapter-normalization, provider-config, or model-routing repair. The latest Captain instruction authorizes prompt implementation and live jobs with a max-8 ceiling, but it should not bypass the diagnostic evidence step.

**Warnings:** Do not treat X7-U0 as authorizing source execution, public output, report/verdict/evidence generation, cache/SR/storage, ACS/direct URL, V1 reuse, or V1 cleanup.

**Learnings:** Runtime schema failures need bounded adapter diagnostics before prompt surgery; otherwise the likely fix layer is speculative.
