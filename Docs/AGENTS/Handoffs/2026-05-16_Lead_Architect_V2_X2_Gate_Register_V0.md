# Lead Architect Handoff: V2-X2 Gate Register V0

---
### 2026-05-16 | Lead Architect | Codex (GPT-5) | V2-X2 Gate Register V0
**Task:** Add a machine-readable V2 gate/task register and validator that make current V2 execution state auditable without granting execution authority.

**Files touched:**
- `Docs/AGENTS/V2_Gate_Register.json`
- `scripts/validate-v2-gate-register.mjs`
- `package.json`

**Key decisions:**
- The register is explicitly audit-only: `authority: "audit_only"`, `canApproveExecution: false`, `consumedByRuntime: false`, and every row has `registerGrantsExecution: false`.
- The register covers all 10 `AnalyzerV2GatewayTaskId` values, not only executable tasks.
- Runtime authority stays in `ANALYZER_V2_GATEWAY_TASKS`, `canExecuteAnalyzerV2GatewayTask(...)`, reviewed source packages, and Captain/deputy approvals.
- Query planning drift is intentionally visible through `knownDrift`: `static_task_policy_symbolic_not_executable` and `prompt_frontmatter_required_sections_lag`.
- The validator is offline/read-only. It reads repo files, parses TypeScript source with the compiler AST, compares register rows to gateway/model/cache source state, and exits nonzero on drift. It does not import runtime app modules, call services, read env for approval, write configs, mutate docs/indexes, or submit jobs.

**Open items:**
- X3 should repair query-planning policy/frontmatter drift. Until then, the register must continue to expose the drift.
- The register is not wired to runtime/admin UI and should remain non-runtime unless a later reviewed diagnostics-only package approves that.
- `Docs/AGENTS/Agent_Outputs.md` already contained unrelated local modifications, so this handoff was created without adding a new index row there.

**Warnings:**
- Do not let future agents treat `Docs/AGENTS/V2_Gate_Register.json` as an approval source. It is a mirror and validator target only.
- If gateway policy shape changes, the validator should fail closed rather than silently accept stale rows.
- Any future live-job eligibility change should come from a reviewed live-smoke gate, not a register edit alone.

**For next agent:**
- Run `npm run validate:v2-gates` before changing V2 gateway policy or the register.
- Use `node scripts/validate-v2-gate-register.mjs --self-test` when changing the validator itself.
- Next clear plan item remains V2-X3: repair query-planning policy/frontmatter drift, with prompt edits requiring explicit Captain/LLM Expert prompt approval.

**Learnings:** Not appended to `Role_Learnings.md`; the durable guidance is in the register and this handoff.

## Verification
- `npm run validate:v2-gates`
  - Passed.
- `node scripts/validate-v2-gate-register.mjs --self-test`
  - Passed; mutation checks cover missing executable row, duplicate row, wrong prompt section, wrong model/cache approval, live-job allowed state, wrong schema, register-grants-execution drift, wrong model approval id, and wrong gateway policy status alias.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/gateway`
  - Passed: 3 files, 24 tests.
- `npm -w apps/web run build`
  - Passed; postbuild reseed reported `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`.
- `git diff --check`
  - Passed.

## Reviewer Clearance
- Architecture reviewer: `PASS`. No architecture blocker; audit-only shape is explicit and query-planning drift remains visible.
- Security/governance reviewer: `PASS` after adding non-authority root flags, `registerGrantsExecution: false`, strict schema checks, and no runtime authority path.
- Implementation reviewer: `PASS` after adding required fields `sliceId`, `status`, `gatewayPolicyStatus`, `promptApprovalId`, `modelApprovalId`, and `cacheApprovalId`, all validator-checked.

## Debt-Guard Result
```text
DEBT-GUARD RESULT
Classification: incomplete-existing-mechanism
Chosen option: amend
Rejected path and why: replacing the register with a new design package would add delay without new information; reviewer blockers were field/schema strictness gaps in the existing register mechanism.
What was removed/simplified: ambiguous reliance on free-form state only.
What was added: stable required field aliases, approval-id fields, stricter schema/source checks, and self-test mutations.
Net mechanism count: unchanged
Budget reconciliation: stayed inside JSON register, validator script, package script, and handoff; no runtime/product/prompt/config/gateway behavior changed.
Verification: validator, self-test, gateway tests, build, and diff check passed.
Debt accepted and removal trigger: query-planning policy/frontmatter drift remains intentionally exposed until V2-X3 repairs it.
Residual debt: the register is not yet generated from source; it is validated against source and must be manually updated with future approved gate changes.
```
