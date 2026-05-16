# V2 X4 Acceptance And Next-Gate Execution Packet

**Date:** 2026-05-16
**Status:** execution packet for leadership and implementation coordination
**Owner role:** External Advisor / Senior Architect
**Current source of truth:** `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_X4_Public_Cutover_Guard.md`

**Post-B2 note (2026-05-16):** After this steering packet, B2 was selected as the next low-risk gate and committed as `cdd5f934` (`feat: add v2 oci parser isolation proof`). This packet is the decision bridge that preceded B2, not the current post-B2 execution state.

## 1. Executive Correction

X4 is no longer pending. Current status and backlog documents record 7A through X4 as implementation-complete.

The immediate recommendation is therefore not "implement X4." The immediate recommendation is:

1. Record X4 as complete in leadership communication.
2. Keep X4 framed as a fail-closed public-surface safety guard, not as public V2 cutover approval.
3. Ask for explicit Captain/LLM Expert authority if leadership wants to unblock X3-B prompt frontmatter/text alignment.
4. If prompt approval is not provided, select the next V2 gate from the reviewed action plan only after confirming it is still low-risk and does not pull blocked future capability into the slice.

## 2. X4 Acceptance Statement

X4 can be treated as accepted for execution tracking when these facts remain true:

- V2 public quick fields fail closed unless the result is schema `4.0.0-cb`, pipeline `claimboundary-v2`, and `meta.publicCutoverStatus` is exactly `approved`.
- Missing, invalid, or `blocked_precutover` status fails closed.
- `4.0.0-cb-precutover` remains blocked even if status is mutated to `approved`.
- Blocked V2 results still identify as V2 and can surface the primary issue, but do not expose canonical V2 verdict, truth percentage, confidence, evidence, boundaries, sources, narrative, or report markdown to public/non-admin surfaces.
- Admin detail JSON remains available for diagnostics where existing admin semantics require raw inspection.

This acceptance does not approve public V2 launch, live validation, meaningful report exposure, parser consumption of real fetched bytes, cache IO, Source Reliability integration, evidence/report generation, ACS/direct URL dispatch, prompt/model/config/schema edits beyond approved gates, or V1 cleanup.

## 3. Evidence Artifacts

Primary implementation handoff:

- `Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_X4_Public_Cutover_Guard.md`

Current state documents:

- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`

Relevant implementation surfaces recorded by the X4 handoff:

- `apps/web/src/lib/analyzer-v2/result-envelope.ts`
- `apps/web/src/lib/analyzer-v2/compatibility-view.ts`
- `apps/web/src/app/jobs/[id]/utils/generateHtmlReport.ts`
- `apps/web/test/fixtures/analyzer-v2/report-result-v2.fixture.json`
- `apps/web/test/fixtures/analyzer-v2/schemas/report-result-v2.schema.json`
- focused V2 compatibility/result/export tests
- `apps/api/Services/ResultCompatibility.cs`
- `apps/api/Controllers/JobsController.cs`
- focused API compatibility/persistence tests

Recorded X4 verification from the handoff:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/compatibility-view.test.ts test/unit/lib/analyzer-v2/pipeline-shell.test.ts test/unit/lib/analyzer-v2/result-contract.test.ts test/unit/app/jobs/[id]/utils/generateHtmlReport.test.ts
dotnet test apps/api.Tests/FactHarbor.Api.Tests.csproj --filter "FullyQualifiedName~ResultCompatibilityTests|FullyQualifiedName~JobServiceTests"
npm -w apps/web run test -- test/unit/lib/analyzer-v2
dotnet test apps/api.Tests/FactHarbor.Api.Tests.csproj
npm -w apps/web run test -- test/unit/scripts/validation-summary.test.ts test/unit/scripts/validation-matrix.test.ts test/unit/scripts/live-runner-result-readers.test.ts
npm -w apps/web run build
git diff --check
```

Focused confirmation already re-run during the external-advisor review:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/compatibility-view.test.ts
```

## 4. Leadership Decision Fork

### Path A: Approve X3-B Prompt Alignment

Use this path only if Captain or LLM Expert explicitly approves prompt edits.

Required packet before implementation:

- exact prompt/frontmatter sections to change;
- topic-neutral wording only;
- no test-case terms;
- focused prompt drift/frontmatter tests;
- explicit statement that this does not approve public V2 exposure or live jobs.

Stop immediately if the work starts changing analysis semantics beyond the approved prompt/frontmatter alignment.

### Path B: Keep Prompts Frozen And Select Next Code Gate

Use this path if prompt approval is not granted.

Required packet before implementation:

- candidate gate from the reviewed action plan;
- allowed production/test/doc file envelope;
- forbidden files and blocked capabilities;
- focused verifiers;
- rollback/quarantine criteria;
- reviewer owner and stop authority.

Stop immediately if the candidate requires live jobs, public V2 cutover, parser consumption of real fetched bytes, cache IO, Source Reliability integration, evidence/report generation, prompt/model/config/schema edits, ACS/direct URL dispatch, or V1 cleanup.

## 5. Negative Screen For The Next Gate

A next-gate candidate is not low-risk if any of these are true:

- It needs live jobs or Captain canary runs to prove value.
- It exposes meaningful V2 verdict, truth, confidence, report markdown, evidence, boundaries, sources, or narrative publicly.
- It makes parser output consume real fetched bytes.
- It wires product/orchestrator/runner/API/UI/report/export behavior beyond an explicit blocking/projection guard.
- It adds cache IO, durable raw-content/parsed-text storage, or Source Reliability behavior.
- It changes prompts, models, configs, schemas, or UCM defaults without the gate being explicitly about those changes.
- It creates evidence/report semantics from parsed content.
- It touches ACS/direct URL runtime dispatch.
- It cleans up, rewrites, or removes V1 behavior.

## 6. Recommended Immediate Action

Default recommendation:

1. Present Revision B leadership deck, not the earlier stale deck.
2. State that X4 is complete and fail-closed.
3. Ask for a yes/no decision on X3-B prompt approval.
4. If the answer is not explicit approval, prepare the next source package from the reviewed action plan before any implementation.

The source package should fit on one page of operational control:

- scope envelope;
- acceptance criteria;
- verifier set;
- stop conditions.

## 7. Open Risks

- X3-B prompt frontmatter/text drift remains unresolved until explicit prompt authority exists.
- Static `CAPTAIN_APPROVAL` remains temporary debt until UCM/task-policy-derived activation authority exists.
- X4 prevents accidental public projection but does not increase the analytical quality of damaged pre-cutover V2 results.
- Future gates must keep distinguishing hidden/internal readiness from meaningful public V2 readiness.
