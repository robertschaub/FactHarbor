# V2 Slice X3-B Query-Planning Prompt Frontmatter/Text Approval Package

**Date:** 2026-05-17
**Status:** reviewed approval package; docs-only; does not authorize prompt/source edits by itself
**Owner role:** Lead Architect / Captain Deputy
**Approval gate:** Explicit Captain approval plus LLM Expert prompt approval/review and Architect scope acceptance before implementation
**Current source state:** `a4acab22` (`docs: add v2 b3 proof intake runbook`)
**Review result:** Architect APPROVE, LLM Expert APPROVE, Code/package APPROVE, Security/runtime APPROVE after package completion and traceability amendments.

## 1. Purpose

X3-A repaired the non-prompt metadata drift for hidden/internal Evidence Lifecycle query planning. The remaining known drift is prompt-surface documentation inside `claimboundary-v2.prompt.md` and the tests/validator that intentionally keep that drift visible.

This package requests approval for a narrow X3-B implementation that aligns prompt frontmatter and one stale query-planning wording line with the already-approved hidden/internal 7L-1 query-planning state.

This package does not approve:

- source acquisition execution;
- provider search/fetch calls;
- parser execution or parsed-material creation;
- EvidenceCorpus, evidence/report/verdict/confidence generation;
- product/orchestrator/runner/API/UI/report/export wiring;
- public V2 exposure or live jobs;
- model/cache/gateway approval flips;
- UCM/default JSON/schema changes;
- ACS/direct URL execution;
- V1 cleanup or V1 prompt/code reuse.

## 2. Approval Requested

Approve implementation of X3-B exactly within this package:

```text
Approved to implement X3-B prompt frontmatter/text alignment under Docs/WIP/2026-05-17_V2_Slice_X3-B_Query_Planning_Prompt_Frontmatter_Text_Approval_Package.md, limited to the files, sections, tests, and gate-register updates listed here, with no model/cache/gateway approval flips, no live jobs, no product/public exposure, and no semantic expansion beyond the reviewed prompt alignment.
```

Implementation may begin only after explicit Captain approval of the quoted X3-B prompt/frontmatter/text alignment scope and LLM Expert prompt approval/review. Architect scope acceptance alone is insufficient. If Captain approval is absent or ambiguous, stop.

## 3. Review Basis

- `Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_X3A_Query_Planning_Metadata_Drift_Repair.md`
- `Docs/WIP/2026-05-16_V2_X4_Acceptance_and_Next_Gate_Execution_Packet.md` section 4, Path A
- `Docs/WIP/2026-05-15_V2_Slice_7L1_Query_Planning_Source_Approval_Package.md`
- `Docs/AGENTS/V2_Gate_Register.json` row `gate.evidence_query_planning`
- `scripts/validate-v2-gate-register.mjs`
- `apps/web/prompts/claimboundary-v2.prompt.md`
- `apps/web/src/lib/analyzer-v2/claim-understanding/prompt-loader.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/query-planning/prompt-loader.ts`

## 4. Current Drift To Repair

The approved hidden/internal query-planning runtime loads:

- prompt profile: `claimboundary-v2`
- prompt file: `claimboundary-v2.prompt.md`
- prompt section: `V2_EVIDENCE_QUERY_PLANNING`
- prompt inputs: appended JSON packets owned by the query-planning loader

Current drift:

- `claimboundary-v2.prompt.md` frontmatter says Evidence Lifecycle task drafts are non-executable.
- `requiredSections` lists only `V2_CLAIM_UNDERSTANDING_GATE1`.
- The `V2_EVIDENCE_QUERY_PLANNING` Inputs section says a future non-executable loader must provide JSON packets.
- The gate register keeps `prompt_frontmatter_required_sections_lag` as the remaining known drift.
- The claim-understanding prompt loader requires the V2 prompt frontmatter to contain only the Claim Understanding section, which blocks truthful multi-section prompt metadata.

## 5. Proposed Implementation Envelope

### 5.1 Source/Test Files

Implementation may edit only:

- `apps/web/prompts/claimboundary-v2.prompt.md`
- `apps/web/src/lib/analyzer-v2/claim-understanding/prompt-loader.ts`
- `apps/web/test/unit/lib/analyzer-v2/claim-understanding/prompt-contract.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/prompt-loader.test.ts`
- `apps/web/src/lib/prompt-surface-registry.ts`
- `apps/web/test/unit/lib/prompt-surface-registry.test.ts`
- `Docs/AGENTS/V2_Gate_Register.json`
- `scripts/validate-v2-gate-register.mjs`

### 5.2 Status/Handoff Files

Completion may update only:

- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/<dated X3-B completion handoff>.md`
- `Docs/AGENTS/index/handoff-index.json`

### 5.3 Explicit Non-Goals

Do not edit:

- `apps/web/prompts/claimboundary.prompt.md`
- `apps/web/configs/**`
- `apps/web/src/lib/analyzer/**`
- `apps/web/src/lib/internal-runner-queue.ts`
- product/orchestrator/API/UI/report/export files
- gateway/model/cache policy approval status except tests that assert no approval change

## 6. Exact Prompt Changes

### 6.1 Frontmatter Description

Change:

```yaml
description: V2 Claim Understanding plus non-executable Evidence Lifecycle task drafts. Non-executable until gateway approvals are recorded.
```

To:

```yaml
description: V2 Claim Understanding plus hidden/internal Evidence Query Planning and non-executable remaining Evidence Lifecycle task drafts. Execution remains governed by per-task gateway, model, and cache approvals.
```

Rationale: this describes the current approved state without granting new execution authority.

### 6.2 Frontmatter Variables

Keep unchanged:

```yaml
variables: [currentDate, analysisInput, acsSnapshotJson, inputGroundingSeedJson]
```

Rationale: frontmatter variables describe `${...}` interpolation placeholders in `V2_CLAIM_UNDERSTANDING_GATE1`. Query planning uses `loadAndRenderEvidenceQueryPlanningPrompt(...)` to append typed JSON packets after section load; those packets are not frontmatter interpolation variables.

### 6.3 Frontmatter Required Sections

Change:

```yaml
requiredSections: [V2_CLAIM_UNDERSTANDING_GATE1]
```

To:

```yaml
requiredSections: [V2_CLAIM_UNDERSTANDING_GATE1, V2_EVIDENCE_QUERY_PLANNING]
```

Rationale: Claim Understanding and hidden/internal Evidence Query Planning are the two approved prompt sections that loaders require today. Remaining Evidence Lifecycle sections stay present as non-executable drafts and must not be listed here until separately approved.

### 6.4 Query-Planning Inputs Wording

In `## V2_EVIDENCE_QUERY_PLANNING`, change:

```text
A future non-executable loader package must provide these JSON packets:
```

To:

```text
The hidden/internal query-planning runtime loader provides these JSON packets:
```

Rationale: the loader is now implemented for hidden/internal prompt/model-only query planning. The sentence must not be copied into applicability, extraction, or sufficiency sections, because those tasks remain non-executable.

## 7. Exact Non-Prompt Changes

### 7.1 Claim Understanding Prompt Loader

Update `assertFrontmatter(...)` so it still requires:

- `pipeline === "claimboundary-v2"`;
- frontmatter variables exactly equal to Claim Understanding interpolation variables;
- `requiredSections` includes `V2_CLAIM_UNDERSTANDING_GATE1`.

It must no longer require `requiredSections` to contain only that one section. It should continue rejecting a prompt file that omits Claim Understanding or changes approved interpolation variables.

### 7.2 Prompt Surface Registry

Update the `claimboundary-v2` registry note and runtime owners only if needed to remove stale "runtime execution remains blocked" wording. Any update must preserve:

- UCM management;
- `reseedSupported: false`;
- no file seeding;
- no prompt text embedded in code.

Registry edits may only remove stale drift wording and align owner metadata/tests with the already-approved hidden/internal 7L-1 query-planning surface; they must not enable reseeding, expose prompt text, change prompt source selection, or alter gateway/model/cache approval state.

Suggested note:

```text
V2 prompt source exists for contract review and hidden/internal approved V2 loaders; file seeding, public exposure, and unapproved runtime tasks remain blocked until later reviewed approvals.
```

Suggested runtime owner addition:

```text
apps/web/src/lib/analyzer-v2/evidence-lifecycle/query-planning/prompt-loader.ts
```

### 7.3 Gate Register And Validator

Update `gate.evidence_query_planning`:

- `state` / `status`: remove the prompt metadata drift qualifier.
- Remove `knownDrift: ["prompt_frontmatter_required_sections_lag"]`.
- Add this X3-B package to `sourceOfTruthRefs` or the row notes so the drift-marker removal has an auditable approval pointer.
- Update `lastVerifiedBy` to the X3-B verifier run.
- Update notes to say X3-B repaired frontmatter/text drift while the register remains audit-only and non-authorizing.
- Keep `registerGrantsExecution: false`, `liveJobEligibility: blocked`, and no prompt/model/cache approval flips.

Update `scripts/validate-v2-gate-register.mjs`:

- Remove the required `prompt_frontmatter_required_sections_lag` validator rule.
- Add a repaired-marker guard so reintroducing `prompt_frontmatter_required_sections_lag` fails self-test.
- Keep the existing guard that rejects `static_task_policy_symbolic_not_executable`.
- Update self-tests accordingly.

## 8. Prompt-Audit Compliance Screen

The accepted prompt edits must pass this screen before implementation:

| Proposed change | Generic by design | No deterministic semantics | No test-case terms | Multilingual neutral | No semantic expansion |
|---|---|---|---|---|---|
| Frontmatter description alignment | pass | pass | pass | pass | pass |
| Required-section metadata alignment | pass | pass | pass | pass | pass |
| Query-planning loader wording | pass | pass | pass | pass | pass |

Certification: the proposed edits introduce no named entities, jurisdictions, dates, Captain-defined canary vocabulary, keyword lists, semantic rules, or language-specific assumptions. They describe execution governance and loader ownership only.

## 9. Required Verifiers

Focused verifiers:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding/prompt-contract.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/prompt-loader.test.ts test/unit/lib/prompt-surface-registry.test.ts test/unit/lib/analyzer-v2/gateway/policy.test.ts
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
```

Broader verifiers before completion:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts test/unit/lib/analyzer-v2/claim-understanding
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git diff --check
git status --short --untracked-files=all -- apps/web/prompts apps/web/src/lib/analyzer-v2 apps/web/src/lib/prompt-surface-registry.ts apps/web/test/unit/lib/analyzer-v2 apps/web/test/unit/lib/prompt-surface-registry.test.ts Docs/AGENTS/V2_Gate_Register.json scripts/validate-v2-gate-register.mjs Docs/STATUS Docs/AGENTS
```

Do not run expensive LLM tests or live jobs.

## 10. Docs-Only Package Completion

Before committing this approval package itself, complete:

- append a concise package result to `Docs/AGENTS/Agent_Outputs.md`;
- create a completion handoff under `Docs/AGENTS/Handoffs/`;
- regenerate and stage `Docs/AGENTS/index/handoff-index.json`.

Required package verifiers:

```powershell
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
node scripts/build-index.mjs --tier=2 --tracked-only
```

Run the index command after the handoff is staged or present in the worktree, then include the verifier results in the handoff.

## 11. Stop Conditions

Stop and request review if implementation needs:

- wording beyond section 6;
- any semantic instruction change in a prompt;
- any concrete topic, named entity, jurisdiction, date-period, or Captain canary wording;
- new prompt sections, prompt variables, output schema edits, UCM/default JSON edits, or config changes;
- model/cache/gateway approval-status changes;
- source/provider/search/fetch/parser execution;
- product/orchestrator/runner/API/UI/report/export wiring;
- cache IO, Source Reliability, durable storage, source material, EvidenceCorpus, parsed material, evidence/report/verdict/confidence generation;
- live jobs;
- ACS/direct URL execution;
- V1 reuse, V1 prompt/code cloning, or V1 cleanup.

## 12. Review Questions

LLM Expert:

- Are the prompt wording changes topic-neutral, multilingual-safe, and limited to metadata/loader-state alignment?
- Is the unchanged `variables` frontmatter correct given query-planning packet injection?
- Does the package avoid semantic expansion and teaching-to-the-test?

Architect:

- Does this close the X3-A remaining drift without granting new execution authority?
- Is the implementation envelope narrow enough?
- Is prompt-surface registry alignment acceptable in the same slice?

Code/Package Reviewer:

- Are the verifier set and gate-register validator changes sufficient?
- Are the file envelope and stop conditions enforceable?
- Is the package ready for implementation without additional Captain clarification?

## 13. Expected Completion State

After implementation and review:

- `prompt_frontmatter_required_sections_lag` is removed from the gate register.
- `claimboundary-v2.prompt.md` truthfully lists Claim Understanding plus hidden/internal Query Planning as required sections.
- Query-planning prompt wording no longer describes the implemented loader as future/non-executable.
- Remaining Evidence Lifecycle prompt sections continue to be non-executable drafts.
- Gate register remains audit-only and non-runtime-authority.
- No new product/public/source/parser/evidence/report/live capability exists.
