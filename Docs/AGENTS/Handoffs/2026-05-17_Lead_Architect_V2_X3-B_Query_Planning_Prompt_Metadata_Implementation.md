---
roles: [Lead Architect, Captain Deputy]
topics: [v2, x3-b, query-planning, prompt, metadata, implementation]
files_touched:
  - apps/web/prompts/claimboundary-v2.prompt.md
  - apps/web/src/lib/analyzer-v2/claim-understanding/prompt-loader.ts
  - apps/web/src/lib/prompt-surface-registry.ts
  - apps/web/test/unit/lib/analyzer-v2/claim-understanding/prompt-contract.test.ts
  - apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/prompt-loader.test.ts
  - apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts
  - apps/web/test/unit/lib/prompt-surface-registry.test.ts
  - Docs/AGENTS/V2_Gate_Register.json
  - scripts/validate-v2-gate-register.mjs
  - Docs/STATUS/Current_Status.md
  - Docs/STATUS/Backlog.md
  - Docs/AGENTS/Agent_Outputs.md
  - Docs/AGENTS/index/handoff-index.json
---

# Lead Architect Handoff: V2 X3-B Query Planning Prompt Metadata Implementation

### 2026-05-17 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 X3-B Query Planning Prompt Metadata Implementation

**Task:** Implement the Captain-authorized X3-B query-planning prompt frontmatter/text alignment exactly under `Docs/WIP/2026-05-17_V2_Slice_X3-B_Query_Planning_Prompt_Frontmatter_Text_Approval_Package.md`.

**Files touched:** `apps/web/prompts/claimboundary-v2.prompt.md`, `apps/web/src/lib/analyzer-v2/claim-understanding/prompt-loader.ts`, `apps/web/src/lib/prompt-surface-registry.ts`, focused prompt/registry tests, `Docs/AGENTS/V2_Gate_Register.json`, `scripts/validate-v2-gate-register.mjs`, `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`, and `Docs/AGENTS/index/handoff-index.json`.

**Key decisions:** Implemented only metadata/text alignment for the already-approved hidden/internal query-planning loader. `claimboundary-v2.prompt.md` now lists `V2_CLAIM_UNDERSTANDING_GATE1` and `V2_EVIDENCE_QUERY_PLANNING` as required sections, keeps frontmatter variables unchanged, and replaces the stale query-planning "future non-executable loader" sentence. The Claim Understanding prompt loader still requires the Claim Understanding section and exact interpolation variables, but no longer rejects additional approved required sections. The prompt surface registry now lists the query-planning prompt loader as a runtime owner while preserving UCM/no-file-seeding/no-public-exposure constraints. The V2 gate register removes the repaired `prompt_frontmatter_required_sections_lag` marker and the validator now rejects its reintroduction.

**Open items:** No live job is authorized by X3-B. If clean post-route-repair V2 live evidence is still needed, prepare a separate reviewed execution package after runtime refresh; do not reuse spent X7-N-A.

**Warnings:** X3-B does not authorize Query Planning product/public execution, source acquisition execution, provider search/fetch calls, parser execution, EvidenceCorpus/evidence/report/verdict/confidence generation, cache/SR/storage, ACS/direct URL runtime, model/cache/gateway approval flips, or V1 cleanup. Remaining Evidence Lifecycle prompt sections are still non-executable drafts.

**For next agent:** Stage and commit only the X3-B prompt/source-test/register/status/handoff/index package. After commit, continue with the next reviewed low-risk package or draft a new clean live-smoke rerun package if clean evidence is still required.

**Learnings:** Not appended to `Role_Learnings.md`; this is slice-specific implementation context.

## Authorization

Captain authorization was explicit in conversation on 2026-05-17:

```text
Prompt implementation authorized.
```

The implementation followed the reviewed X3-B package. No stop condition was touched: no semantic prompt expansion, no new prompt variables, no UCM/default JSON/schema changes, no model/cache/gateway approval-status changes, no product/public/source/parser/evidence/report/live capability, no ACS/direct URL, and no V1 reuse or cleanup.

## Verification

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding/prompt-contract.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/prompt-loader.test.ts test/unit/lib/prompt-surface-registry.test.ts test/unit/lib/analyzer-v2/gateway/policy.test.ts` - PASS, 5 files / 29 tests.
- `npm run validate:v2-gates` - PASS.
- `node scripts/validate-v2-gate-register.mjs --self-test` - PASS.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts test/unit/lib/analyzer-v2/claim-understanding` - PASS, 16 files / 112 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` - PASS, 74 files / 523 tests.
- `npm -w apps/web run build` - PASS.

## Scope Check

The implementation stayed inside the X3-B approved source/test envelope plus allowed status/handoff/index files. It did not edit `apps/web/prompts/claimboundary.prompt.md`, `apps/web/configs/**`, `apps/web/src/lib/analyzer/**`, product/orchestrator/runner/API/UI/report/export files, or gateway/model/cache approval status.
