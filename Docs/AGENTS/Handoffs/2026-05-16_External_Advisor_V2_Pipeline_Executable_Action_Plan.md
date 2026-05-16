---
### 2026-05-16 | Lead Architect + LLM Expert | Codex (GPT-5) | V2 Pipeline Executable Action Plan

**Reason for addendum:** The first leadership assessment was directionally useful but too high-level to execute. This addendum converts it into ordered work packages with file envelopes, acceptance criteria, verifier commands, and stop conditions.

## Executive Decision

Continue V2, but change the next month of work from “more architecture assessment” to four concrete tracks:

1. Finish the parser runner protocol gate already in flight. In the current dirty workspace, 2D-A already appears to have moved from re-review to deputy-approved; if those approval edits are retained, V2-X0 is complete and V2-X1 is the first implementation task.
2. Add one machine-readable V2 gate/task register so approval state stops living only in prose.
3. Close the known prompt/model/task-policy drift around query planning.
4. Add hidden integration and public-cutover guards before any public V2 result can be meaningful.

Do **not** start V1 cleanup, public V2 exposure, live canary expansion, cache IO, Source Reliability, or evidence/report generation until the gates below are done.

## Immediate Work Orders

### V2-X0 — Confirm 2D-A Approval State

**Goal:** Confirm whether `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-A_Fixture_Control_Parser_Runner_Source_Package.md` is approved for source implementation before coding.

**Owner:** Captain deputy reviewers: Security, Senior Developer, LLM/Evidence Lifecycle.

**Files allowed:** Review docs only. No source edits.

**Inputs:**
- `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-A_Fixture_Control_Parser_Runner_Source_Package.md`
- `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D_Parser_Isolation_Design_Package.md`
- Latest 2C-A handoff and current status.

**Acceptance criteria:**
- Review result is recorded as `approve`, `modify`, or `reject`.
- If approved, the package records reviewer roles, verdicts, approval timestamp or approval pointer, and exact source envelope.
- If modified or rejected, source implementation remains blocked and the required modifications are explicit.
- Current dirty workspace note: `Current_Status.md`, `Backlog.md`, the 2D-A WIP package, and the 2D-A handoff already state final deputy approval. If those edits are accepted as the active state, treat V2-X0 as done and start V2-X1.

**Stop conditions:**
- Any reviewer uncertainty about fixture/control-only byte capability.
- Any proposal to parse real fetched bytes in 2D-A.
- Any need to edit outside the package envelope.

### V2-X1 — Implement 2D-A Fixture/Control Parser Runner Protocol

**Goal:** If V2-X0 is approved, implement only the fixture/control child-process parser runner harness.

**Allowed production files:**
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-parser.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-parser-runner-protocol.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-parser-runner.worker.cjs`

**Allowed tests:**
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-runner-protocol.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

**Required behavior:**
- Child process launched with `process.execPath`, `shell: false`, `windowsHide: true`, pipe stdio only, and stripped env.
- Fixture/control packets only.
- No real fetched bytes, no transport-owned packet/frame input, no source acquisition execution wiring.
- No parsed text, raw bytes, source identifiers, evidence, warnings, verdicts, confidence, or report prose returned.
- Disposal on every terminal path.

**Verifier commands:**
```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-runner-protocol.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git diff --check
git diff --cached --check
```

**Stop conditions:**
- Need for a dev-only loader (`tsx`, `ts-node`, `npx`) in the worker path.
- Need for inherited env, filesystem reads, network, worker threads, `vm`, native addons, or provider/cache/SR imports.
- Any real fetched-byte parser consumption.

### V2-X2 — Add V2 Gate Register V0

**Goal:** Replace scattered approval/status memory with a machine-readable register that can be validated.

**Recommended files:**
- `Docs/AGENTS/V2_Gate_Register.json`
- `scripts/validate-v2-gate-register.mjs`
- `package.json` script entry, for example `validate:v2-gates`
- One focused test or script invocation documented in the handoff.

**Minimum register fields per gate/task:**
- `sliceId`
- `taskId`
- `status`
- `promptProfile`
- `promptSectionId`
- `outputSchemaVersion`
- `gatewayPolicyStatus`
- `modelPolicyApprovalId`
- `cachePolicyApprovalId`
- `sourcePackage`
- `approvalPointer`
- `implementationCommit`
- `allowedFiles`
- `blockedSurfaces`
- `verifierCommands`
- `liveJobEligibility`

**Acceptance criteria:**
- Every executable V2 gateway task has a register row.
- `claim_understanding_gate1` and `evidence_query_planning` rows show their current actual status.
- Register flags current drift instead of hiding it: query planning executable in gateway policy while static evidence task policy/frontmatter still lag.
- Validation script fails if an executable gateway task is missing from the register.

**Verifier commands:**
```powershell
node scripts/validate-v2-gate-register.mjs
npm -w apps/web run test -- test/unit/lib/analyzer-v2/gateway
npm -w apps/web run build
git diff --check
```

**Stop conditions:**
- Register attempts to approve execution by itself.
- Register becomes a second authority instead of an auditable view over source packages and UCM/task policy.

### V2-X3 — Repair Query-Planning Policy Drift

**Goal:** Make query planning’s executable state consistent across gateway policy, static task policy, prompt metadata, and tests.

**Known drift to close:**
- `apps/web/src/lib/analyzer-v2/gateway/policy.ts` marks `evidence_query_planning` executable.
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/task-policy/static-policy.ts` still reports symbolic/not executable.
- `apps/web/prompts/claimboundary-v2.prompt.md` frontmatter still lists only `V2_CLAIM_UNDERSTANDING_GATE1` as required, while `V2_EVIDENCE_QUERY_PLANNING` is now a hidden executable section.
- Prompt text still says “future non-executable loader” for query planning.

**Allowed path:** Split this into two approvals if needed:
- X3-A: code/docs metadata drift only.
- X3-B: prompt frontmatter/text update, only after explicit Captain/LLM Expert prompt approval.

**Candidate files:**
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/task-policy/static-policy.ts`
- `apps/web/src/lib/analyzer-v2/gateway/policy.ts`
- `apps/web/prompts/claimboundary-v2.prompt.md` only after prompt approval.
- Focused gateway/task-policy/prompt-boundary tests.

**Acceptance criteria:**
- One source of truth explains query planning as hidden/internal executable, no public output, no source fetch, no cache IO.
- Static task policy no longer contradicts gateway policy.
- Prompt metadata and loader expectations match executable sections.
- No prompt wording adds topic-specific examples or English-only semantic assumptions.

**Verifier commands:**
```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/gateway test/unit/lib/analyzer-v2/evidence-lifecycle
npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run build
git diff --check
```

**Stop conditions:**
- Prompt edit attempted without explicit approval.
- Any expansion from query planning into source fetch, evidence extraction, public output, or live jobs.

### V2-X4 — Add Public Cutover Guard

**Goal:** Ensure API/UI compatibility code cannot accidentally treat a partial/non-damaged V2 result as public-ready before cutover approval.

**Candidate files:**
- `apps/web/src/lib/analyzer-v2/result-envelope.ts`
- `apps/web/src/lib/analyzer-v2/compatibility-view.ts`
- `apps/api/Services/ResultCompatibility.cs`
- Existing web/API compatibility tests plus new V2 cutover guard fixtures.

**Required behavior:**
- V2 result contract carries explicit `publicCutoverStatus: "blocked_precutover" | "approved"`.
- Pre-cutover and any V2 result without `approved` remains damaged/non-public for compatibility quick fields.
- API quick fields and UI compatibility view refuse meaningful verdict/truth/confidence extraction from non-approved V2.
- Current damaged pre-cutover envelope remains unchanged from the user’s perspective.

**Acceptance criteria:**
- A fixture with `meta.pipeline = "claimboundary-v2"` and non-damaged verdict fields but no `publicCutoverStatus: "approved"` does not surface as a meaningful successful report.
- Existing V1 compatibility remains unchanged.
- Existing V2 damaged envelope still exposes the primary issue, not a meaningful truth verdict.

**Verifier commands:**
```powershell
dotnet test apps/api.Tests/FactHarbor.Api.Tests.csproj --filter ResultCompatibility
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git diff --check
```

**Stop conditions:**
- Any UI/API public exposure beyond guard behavior.
- Any schema claim that V2 is cutover-ready.

### V2-X5 — Hidden V2 Integration Harness

**Goal:** Prove hidden internal flow across the existing V2 pieces without changing public output.

**Candidate files:**
- `apps/web/src/lib/analyzer-v2/orchestrator.ts`
- `apps/web/src/lib/analyzer-v2/claim-understanding/stage-handoff.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/query-planning/runtime.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/request.ts`
- Focused orchestrator/runtime tests.

**Flow to prove:**
1. Hidden Claim Understanding returns accepted `ClaimContract`.
2. Hidden Query Planning runs from that exact accepted contract.
3. Query-plan inspection validates selected AtomicClaim IDs from the same invocation.
4. Source-acquisition request/handoff is created as `ready_not_executable`.
5. Public result remains the damaged pre-cutover envelope.

**Acceptance criteria:**
- No public result includes provider telemetry, prompt text, hidden artifacts, query text, source request internals, or source/acquisition diagnostics.
- No search/fetch/provider source execution is introduced.
- No live jobs are needed; tests use injected provider boundaries and fixtures.
- Blocked/damaged branches stay fail-closed and still return damaged public output.

**Verifier commands:**
```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git diff --check
```

**Stop conditions:**
- Need to call real search/fetch from the orchestrator.
- Need to expose query/source artifacts publicly.
- Need to run live jobs.

## Then, Not Before

After V2-X0 through V2-X5 are complete and reviewed:

1. **2D-B OS-level denial package:** container, separate OS user, OS sandbox, or equivalent reviewed isolation for real fetched-byte parsing.
2. **2D-C first inert real-byte parser:** text/plain and application/json only; no evidence semantics.
3. **Evidence Applicability LLM task:** parsed hidden text to applicability decisions, no deterministic relevance.
4. **Evidence Extraction LLM task:** EvidenceItems, EvidenceScopes, direction, probative/evidence strength, provenance.
5. **Sufficiency Gate:** LLM-owned sufficiency and scarcity candidate classification, warning materialization still later.
6. **Boundary/Verdict/Aggregation:** only after EvidenceCorpus is real and replayable.
7. **Launch validation:** Captain-defined inputs only, comparator reports, Q-code checks, multilingual/input-neutrality checks, stored-packet replay, and rollback profile.

## Explicit Non-Goals For The Next Sprint

- No live jobs unless a reviewed live-smoke gate says why the hidden artifact is worth spending on.
- No broad validation batches.
- No prompt edits without explicit prompt approval.
- No V1 analyzer reuse or V1 cleanup.
- No Source Reliability integration.
- No cache IO.
- No public/API/UI/report/export exposure beyond cutover guard hardening.
- No deterministic semantic text-analysis logic.

## Leadership Checkpoint

At the next leadership review, ask only these questions:

1. Is 2D-A approval recorded and accepted as the current active state?
2. Is the Gate Register in place and catching policy drift?
3. Is query planning’s executable state consistent across policy, prompt metadata, and tests?
4. Is public V2 exposure blocked by contract, not convention?
5. Can the hidden harness prove Claim Understanding to query-plan handoff without changing public output?

If any answer is “no,” V2 is still infrastructure-stage and should not be discussed as cutover-ready.
