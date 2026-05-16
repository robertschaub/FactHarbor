# Lead Architect Handoff: V2-X5 Hidden Integration Harness

### 2026-05-16 | Lead Architect | Codex (GPT-5.5) | V2-X5 Hidden Integration Harness
**Task:** Continue the V2 rebuild by implementing the reviewed X5 hidden integration harness without product runner, UI/API, report/export, live-job, source-execution, prompt, config, cache, Source Reliability, ACS/direct URL, or V1 reuse changes.

**Files touched:**
- `apps/web/src/lib/analyzer-v2/hidden-integration-harness.ts`
- `apps/web/test/unit/lib/analyzer-v2/hidden-integration-harness.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`

**Deputy review decision:**
- Hypatia, Bacon, and Einstein approved X5 only as a hidden/test-driven harness.
- Consolidated envelope: one non-exported internal harness plus focused tests and guard assertions.
- Explicitly rejected: product/orchestrator/pipeline-shell/runner/API/UI/report/export wiring, live jobs, search/fetch/source execution, source-acquisition structural executor calls, cache/SR, provider SDK/factory creation, prompt/config/model changes, public artifacts, and V1 reuse.

**Implementation summary:**
- Added `runHiddenV2IntegrationHarness()` as an internal-only composition boundary.
- Flow:
  1. accepted Claim Understanding stage handoff
  2. Evidence Lifecycle intake
  3. hidden Evidence Query Planning runtime with injected provider callback
  4. query-plan inspection from selected AtomicClaim IDs carried by the same accepted `ClaimContract`
  5. query-plan to Source Acquisition handoff as `ready_not_executable`
  6. Source Acquisition request as `source_acquisition_ready_not_executable`
  7. damaged V2 pre-cutover public envelope
- Blocked/damaged branches fail closed and still return the damaged public envelope.
- Source Acquisition request is only created after accepted query planning, inspected query plan, and ready non-executable handoff.
- The harness is not exported from `apps/web/src/lib/analyzer-v2/index.ts` and is not imported by product/public paths.

**Guardrails preserved:**
- No V1 analyzer imports.
- No source-acquisition structural executor import or call.
- No analyzer-v2-runtime source-acquisition owner imports.
- No search/fetch provider, network/parser dependency, cache storage, Source Reliability, provider SDK, public app/component, or product/orchestrator import in the harness.
- Boundary guard now proves public/product surfaces do not transitively reach the harness.
- Public result remains `_schemaVersion: 4.0.0-cb-precutover` with `meta.publicCutoverStatus: blocked_precutover` and null public quick fields through the compatibility view.

**Verification:**
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/hidden-integration-harness.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/runtime.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/inspection.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/request.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff.test.ts test/unit/lib/analyzer-v2/compatibility-view.test.ts test/unit/lib/analyzer-v2/pipeline-shell.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`
- `npm -w apps/web run build`
- `git diff --check`

**Open items:**
- X3-B prompt frontmatter/text alignment remains blocked until explicit Captain/LLM Expert prompt approval.
- X5 does not approve product integration, public cutover, live jobs, parser consumption of real fetched bytes, Source Reliability, cache IO, evidence/report generation, ACS/direct URL execution, or V1 cleanup.
- Next source package should be reviewed before implementation. Likely candidates: OS-level denial/parser-isolation gate before real fetched-byte parsing, or a separate live-smoke readiness gate only if hidden artifacts are useful enough to justify live-job cost.

**Warnings:**
- Do not import this harness from `orchestrator.ts`, `pipeline-shell.ts`, `runner-ingress.ts`, API/UI/report/export code, or live runner code.
- Do not treat the harness result as public report evidence. It may contain internal query-planning telemetry and query text; the public envelope must remain damaged and blocked.
- Do not run live jobs from X5. It is local/structural verification only.
- Leave pre-existing unrelated dirty files in `Docs/AGENTS/Agent_Outputs.md`, `Docs/AGENTS/index/handoff-index.json`, external-advisor artifacts, and unrelated WIP files untouched.

**DEBT-GUARD RESULT**
Classification: missing-capability.
Chosen option: add one isolated hidden integration harness and focused tests because the existing pieces were individually verified but had no bounded composition proof across Claim Understanding handoff, Evidence Lifecycle intake, Query Planning, inspection, and non-executable Source Acquisition handoff.
Rejected path and why: product/orchestrator wiring would prematurely expose hidden execution; a test-only composition without a named boundary would leave the cross-stage contract implicit; modifying source execution/parser/cache/SR would violate the approved X5 envelope.
What was removed/simplified: none; no existing production path was active or obsolete.
What was added: one non-exported internal harness, a focused unit integration test file, one boundary-guard test, and status documentation.
Net mechanism count: increases by one contained internal harness, justified as missing composition capability and blocked from product/public reachability.
Budget reconciliation: actual diff stayed within the reviewed X5 envelope plus docs. No prompt/model/config/provider SDK/source execution/cache/SR/API/UI/report/export/live-job/V1 changes were made.
Verification: focused X5 suite, full Analyzer V2 suite, web build, and whitespace checks passed.
Debt accepted and removal trigger: the harness is planned internal infrastructure; revisit or delete when a later reviewed product-orchestrator integration gate replaces it with real V2 pipeline sequencing.
Residual debt: X3-B prompt frontmatter/text drift remains unresolved; next real-byte/parser or live-smoke work requires a reviewed package.
