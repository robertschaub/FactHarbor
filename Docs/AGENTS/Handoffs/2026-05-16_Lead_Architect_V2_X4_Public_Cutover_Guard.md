# Lead Architect Handoff: V2-X4 Public Cutover Guard

### 2026-05-16 | Lead Architect | Codex (GPT-5) | V2-X4 Public Cutover Guard
**Task:** Continue the V2 pipeline rebuild by implementing the reviewed X4 fail-closed guard that prevents unapproved V2 result metrics from leaking through public compatibility/API/report/export surfaces.

**Files touched:**
- `apps/web/src/lib/analyzer-v2/result-envelope.ts`
- `apps/web/src/lib/analyzer-v2/compatibility-view.ts`
- `apps/web/src/app/jobs/[id]/utils/generateHtmlReport.ts`
- `apps/web/test/fixtures/analyzer-v2/report-result-v2.fixture.json`
- `apps/web/test/fixtures/analyzer-v2/schemas/report-result-v2.schema.json`
- focused V2 compatibility/result/export tests
- `apps/api/Services/ResultCompatibility.cs`
- `apps/api/Controllers/JobsController.cs`
- focused API compatibility/persistence tests
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`

**Key decisions:**
- V2 result metadata now carries `meta.publicCutoverStatus`.
- Missing, invalid, or `blocked_precutover` status fails closed.
- `4.0.0-cb-precutover` is always blocked, even if status is mutated to `approved`.
- Public V2 verdict/truth/confidence only projects when schema is `4.0.0-cb`, pipeline is `claimboundary-v2`, and `publicCutoverStatus` is `approved`.
- Blocked V2 results still detect as V2 and preserve primary-issue visibility, but public quick fields, legacy report surface metrics, API list/detail quick fields, non-admin detail JSON, non-admin markdown, and HTML metadata do not expose canonical V2 verdict/truth/confidence.
- Admin detail JSON remains raw for diagnostics.

**Open items:**
- X3-B prompt frontmatter/text alignment remains blocked until explicit Captain/LLM Expert prompt approval.
- X4 is not a public cutover approval and does not make V2 reports publicly meaningful.
- Next action must be selected from the reviewed V2 action plan after verifying the gate is still low-risk.

**Warnings:**
- Do not run live jobs from X4. It is a public-surface safety guard, not a live-smoke gate.
- Do not treat `publicCutoverStatus: approved` as valid on `4.0.0-cb-precutover`; approved projection requires schema `4.0.0-cb`.
- Do not reintroduce damaged-shell `UNVERIFIED/50/0` into public quick fields or HTML metadata.
- Leave pre-existing unrelated dirty files in `Docs/AGENTS/Agent_Outputs.md`, `Docs/AGENTS/index/handoff-index.json`, and the external-advisor handoff artifacts untouched.

**Verification:**
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/compatibility-view.test.ts test/unit/lib/analyzer-v2/pipeline-shell.test.ts test/unit/lib/analyzer-v2/result-contract.test.ts test/unit/app/jobs/[id]/utils/generateHtmlReport.test.ts`
- `dotnet test apps/api.Tests/FactHarbor.Api.Tests.csproj --filter "FullyQualifiedName~ResultCompatibilityTests|FullyQualifiedName~JobServiceTests"`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`
- `dotnet test apps/api.Tests/FactHarbor.Api.Tests.csproj`
- `npm -w apps/web run test -- test/unit/scripts/validation-summary.test.ts test/unit/scripts/validation-matrix.test.ts test/unit/scripts/live-runner-result-readers.test.ts`
- `npm -w apps/web run build`
- `git diff --check`

**DEBT-GUARD RESULT**
Classification: missing-capability.
Chosen option: add the explicit public-cutover authority field and amend existing TS/C# projection mechanisms in place.
Rejected path and why: keeping damaged shell `UNVERIFIED/50/0` public would preserve the unsafe implicit schema-trust pattern; changing only persistence would leave stale rows and raw API detail JSON exposed.
What was removed/simplified: unapproved V2 canonical verdict projection through public quick fields, legacy report surface, API list/detail fields, non-admin raw detail JSON, non-admin markdown, and HTML metadata.
What was added: bounded structural `publicCutoverStatus` contract, fail-closed compatibility guards, non-admin blocked-V2 public projection, and focused tests for blocked/missing/invalid/precutover-approved/approved cases.
Net mechanism count: increases by one explicit approval contract and guard, replacing implicit V2 schema trust.
Budget reconciliation: actual diff stayed inside the planned compatibility/API/report/export guard scope plus tests and status/handoff documentation; no prompt, model, provider, cache, source acquisition, live job, SR, or V1 analyzer behavior changed.
Verification: all focused, Analyzer V2, API, fixture-reader, build, and whitespace checks passed.
Debt accepted and removal trigger: blocked status remains until a later reviewed public-cutover gate approves `4.0.0-cb` projection.
Residual debt: X3-B prompt frontmatter/text drift remains unresolved pending explicit prompt approval.
