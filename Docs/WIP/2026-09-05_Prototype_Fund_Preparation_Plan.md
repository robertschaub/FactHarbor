# Prototype Fund implementation preparations

**Status:** IN_REVIEW — preparation plan only; no setup implementation authorized by this document.
**Revision:** 3
**Created / updated:** 2026-09-05
**Owner:** Agents Supervisor; Captain decides adoption; Lead Developer owns execution and integration.
**Source baseline:** FactHarbor `f792eb67193cf601c40949823bfa3bf6b07471a0`. The preceding advice handoff and indexes are uncommitted documentation changes. No other local repository has been inspected for this plan.

## Outcome and boundaries

Prepare the repositories and working environments so two implementation agents can deliver independently reviewed changes to one integration owner without sharing mutable application state or private planning context.

The current request authorizes this plan and its review, including a handover prompt for a user-run Claude review. It does not authorize implementing the plan, changing remote repository settings, creating repositories, installing dependencies, modifying credentials, deploying, or running analyses. Those actions belong to an adopted preparation work package. Routine work within an adopted package should proceed without repeated permission requests; changes outside its stated authority return to Captain.

This plan does not change the grant scope, estimates, analysis behavior, runtime contracts, or normative specifications. Existing Captain-defined analysis inputs remain authoritative. No new analysis inputs or live analysis runs are needed to validate these preparations. Coding-agent access and application provider credentials are separate concerns.

## Repository responsibilities to confirm in P0

| Home | Intended responsibility | Preparation boundary |
|---|---|---|
| FactHarbor | Evidence analysis and report/interface implementation | Concrete file targets below are verified here. |
| Public Charter repository | Authoritative requirements and specifications | Inspect only after Captain names the repository/path for this task; preserve its own instructions and approval rules. |
| Runtime repository | Runtime enforcement, receipts, conformance, and possibly the prototype application | Inspect before selecting the application/integration home; do not copy normative specifications or reverse dependency direction to accommodate a demo. |
| Prototype application home | User journey, integration tests, version manifest and demonstration | Prefer a suitable existing home; create a repository only if ownership, dependencies or releases justify it and Captain adopts that choice. |
| Coordination home | Overall work packages and decisions | Select an existing appropriate home in a separately scoped task. Public technical briefs must stand alone; no private names, links, records or context enter public artifacts. |

Public-repository workers start fresh tasks containing only public technical context. An agent that has read private material must not pass its full conversation or unrestricted filesystem access to those workers. Repository/worktree placement is not an access-control mechanism.

## Execution order and ownership

P0 establishes the cross-repository scope. P1 and P2 can then proceed in parallel with disjoint ownership, under explicit task-local isolation instructions while the durable rules are being prepared. P3 follows P2; P4 follows P1 and P3; P5 accepts the rehearsal evidence collected during P1-P4 and checks their integrated result. P6 is optional and follows a successful local rehearsal. FactHarbor-only preparation can be adopted separately while other repository inventories remain pending.

| Step | Owner | Change / output | Complete when |
|---|---|---|---|
| P0 — Inventory and select homes | Lead Architect + Agents Supervisor | Repository ownership, allowed access, exact baselines, integration home and applicable rules | Every included repository has an explicit scope and inspected baseline; unresolved application-home decisions are stated, not assumed. |
| P1 — Assignments and integration rules | Agents Supervisor | Small amendments to existing instructions, assignment and review templates | A representative assignment identifies its owner, checkout, boundaries, checks and reviewer without contradictory tool guidance. |
| P2 — Reviewer and worktree isolation | DevOps Expert + independent reviewer | Verified writer/reviewer restrictions and one writing worktree per task | Actual permissions and checkout identity match the assignment; unrelated work and private material are inaccessible to the task as required. |
| P3 — Reproducible worker checks | Senior Developer, supervised by Lead Developer | Credential-free local recipe with disposable state, derived from existing CI | Fresh worktree passes the approved local test selection and builds without starting application services, changing tracked files, or writing shared application state; excluded coverage and network-control limitations are recorded. |
| P4 — Controlled integration | Lead Developer / sole stack owner | Integration procedure and exact tested version record | One owner controls the stack and verifies the final component combination; review evidence remains current. |
| P5 — Rehearsal and acceptance | Integration lead + independent reviewer + Captain | Use the actual P1/P2 changes to exercise two disjoint writing worktrees and one review/integration path | Assignment, isolation, reviewed commits, integration checks and handoff are demonstrated; Captain accepts preparation readiness for the repositories actually verified. |
| P6 — Optional cloud recipe | DevOps Expert | One self-contained repository task in an authorized cloud environment | Setup is reproducible from committed public inputs and returns a reviewable change; platform-specific checks still run in their owning environment. |

## P0 — Establish the exact scope

1. Captain names any additional repository roots to inspect. Do not enumerate neighbouring directories or use prior private context as access permission. Inspect only public technical files in this task; coordinate private planning separately.
2. For each authorized repository, read its root/closer instructions, existing plan, dependency manifests, CI and relevant package boundaries. Record the repository identity, HEAD, branch, dirty-file ownership, Git common directory and worktree list. Do not switch branches, repair, prune or delete existing worktrees during inventory.
3. Record a compact row in this plan for each public component: authoritative home, reviewed source revision, lead, write scope, safe checks, state paths and integration dependencies. Machine-local paths/credentials belong in local configuration, not the public plan. Use the private coordination task for its own access map.
4. Lead Architect selects the prototype application's home with Captain: existing runtime package/app where dependency direction and releases permit; otherwise a separately justified repository. List exact counterpart file targets before authorizing edits there. No blanket propagation of FactHarbor rules: its ban on deterministic semantic analysis must not be misapplied to deterministic runtime authorization checks.

**Acceptance:** scope and integration-home decisions are explicit. Unknown repositories remain unverified. Preparation of one repository is not reported as completion across all repositories.

## P1 — Amend existing working rules

**Owned files:** `AGENTS.md`; `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md`; `Docs/AGENTS/Multi_Agent_Meta_Prompt.md`; `Docs/AGENTS/Policies/Handoff_Protocol.md`; `.github/pull_request_template.md`; thin tool wrappers `CLAUDE.md`, `.cursor/rules/factharbor-core.mdc`, `.clinerules/00-factharbor-rules.md`, `.windsurfrules`.

- Put the short mandatory ownership/branch rule in root `AGENTS.md`, with the procedure in the existing collaboration rules. Workers deliver scoped commits from task worktrees; a designated integrator controls main. Do not silently change the main-triggered documentation deployment workflow.
- Amend the existing assignment template with: repository and base SHA; branch/worktree; owned files/interfaces; read/write boundaries; permitted commands and state paths; acceptance checks; reviewer; integrator; and stop conditions. One writer owns shared contracts, migration files or configuration at a time.
- Replace the direct-to-main norm in the listed wrappers with pointers to the root rule. Search all active tool wrappers for equivalent contradictions; avoid unrelated terminology/model-policy cleanup.
- Add concise reviewed-commit and verification-evidence fields to existing PR/handoff templates. A review applies to a specific revision/diff. Later fixes and integration changes require review of the affected final diff and appropriate checks.
- Amend the existing Handoff Protocol with one restricted-reviewer exception: reviewers return findings in chat; the parent/integrator records the required completion artifact and index entry. The integrator serializes shared-index changes. Avoid a task registry service, new permanent agent roles, or duplicated rule manuals.

**Verification:** review the policy diff, search for contradictory instructions, and fill the amended assignment template for P3. No application test suite is needed for this documentation-only package.

## P2 — Make access and checkout boundaries real

**Owned files:** `.claude/agents/verify.md`; `.codex/agents/verify.toml` and `scout.toml` only if a verified gap requires an edit; the existing `.claude/agents/` and `.codex/agents/` developer definitions only for contradictory operational permissions. If active inherited hooks require repair, limit it to worktree-safe path handling in `scripts/git-hooks/post-commit` and `post-merge`, with installation performed by the integrator. No broad `.claude/settings.json` or model-routing redesign.

1. Narrow Claude verifier tools to `Read, Grep, Glob`, remove its Bash grant and the claim that subagent shell commands are protected by the safety hook. It reviews code/diffs and prepared evidence; an authorized isolated runner performs checks that write artifacts.
2. Retain Codex's read-only verifier/scout settings. Verify effective permissions in a fresh session rather than assuming the TOML overrides parent settings. A review task must have no effective write, deployment, job-submission or administrative tool capability; if the host cannot enforce that boundary, use a separate restricted session instead of labelling it enforced.
3. Align any subagent instruction that permits paid suites with root Safety: expensive tests and the guarded destructive/database operations stay in the main session, even when authorized. A child cannot acquire that authority from a caller's casual permission. The current main-session command hook also misses workspace-form npm invocations and some direct test-runner calls; it is not an enforcement guarantee. Preparation relies on restricted capabilities, credential absence and verified test selection, with P3's network limitations explicit.
4. Create writing tasks from known clean revisions in separate worktrees and short-lived `codex/<work-package>` branches. Check repository root, HEAD, branch and Git common directory at startup. Give each task only its required write roots and sanitized context. Worktrees share Git metadata; workers must not prune worktrees, alter shared hooks/configuration or perform broad Git cleanup.
5. Keep one integration checkout and one integrator. Preserve all pre-existing worktrees and uncommitted changes. Do not run `scripts/install-hooks.mjs` in linked worktrees: it assumes `.git/hooks` is a directory.
6. Recheck configured hooks before any worker commit/merge. In the inspected checkout, `core.hooksPath` selects installed post-commit/post-merge hooks that write to `$REPO_ROOT/.git/hooks/factharbor-index.log`, incompatible with a linked worktree's `.git` file. The integrator must minimally repair and install worktree-safe logging before commits/merges that exercise those paths; use task-local ignored logs, not a shared Git-directory log. Preserve unrelated installed-hook changes. Do not bypass hooks or change shared Git configuration to force a pass. Record which conditional paths were exercised; P1/P2 prose/agent-definition commits do not validate analyzer/handoff-triggered rebuilding.

**Verification:** inspect effective tool grants and filesystem policy for every writer and reviewer. Before task edits, each session with mutation-capable tools attempts a harmless out-of-write-root write to an integrator-designated disposable sentinel; it must be denied. Never probe a real protected file. For reviewers with no mutation-capable tools, verify that through the effective tool inventory. Requested settings alone are insufficient: an unenforced writer boundary, including a session running with unrestricted permissions, leaves that combination unfinished and unavailable for writing. Any other unverified required restriction likewise leaves its combination unfinished. Reviewer reads a prepared patch and returns findings; each writer's task edit must leave the other writer and integration checkout unchanged. Hook installation and shared Git settings remain integrator-owned.

## P3 — Add credential-free local checks to the contribution guide

**Owned files:** `CONTRIBUTING.md`; `.github/workflows/ci.yml` only if reproducing isolation requires an explicit state-path setting. The proposed `test-output` directory is already ignored. Inspect package lifecycle scripts and test discovery first. No application/prompt/config-default edits.

- Amend Prerequisites/Setup/Testing with a worker recipe separate from live-service setup. Match the declared Node requirement (`>=20.19.0`) and record the tested exact tool versions; current Windows CI uses Node 20.19.0 and .NET 8.0.x. Keep dependencies locked with `npm ci`.
- Use a fresh worktree without copied `.env.local`, development settings, credentials, databases, or application caches. Construct a credential-free process environment without printing inherited secret values. Inspect selected checks, lifecycle scripts and configuration consumers for service/provider access; unresolved access paths leave the affected check unexecuted. Dependency installation/restore is a distinct authorized network-enabled step.
- Reserve a check window with no application stack running. Record listener absence on the inspected application ports, including 3000/5000, immediately before and after checks; if occupied, stop the checks and report the conflict without stopping another owner's service. Start no application services. Use invalid endpoint overrides only where the inspected consumer rejects them before network access; record the controls actually applied. These are operational safeguards, not enforced network isolation, and cannot prove that no request occurred. If a check requires network confinement, use an existing separately authorized environment with verified restrictions and denial probes against designated test-owned endpoints, or leave that check unexecuted. Creating such an environment is outside this package.
- Allocate state beneath `test-output/preparation/<task-id>/`. Resolve absolute paths before execution, reject escapes/reparse links into shared state, and give `FH_CONFIG_DB_PATH`, `FH_SR_CACHE_PATH` and `FH_SEARCH_CACHE_PATH` explicit task-local destinations. Redirect process temporary storage (`TEMP`, `TMP`, and `TMPDIR` as applicable) into that directory and verify `os.tmpdir()` resolves there; existing tests create/remove OS-temp fixtures. Inventory other SDK/package-manager write targets; keep test/build mutations inside designated disposable paths. During installation/restore only, named and explicitly allowed dependency caches may be shared; otherwise redirect them too. Record those exceptions separately from application state. Do not copy or overwrite the ordinary API database.
- Derive the worker invocation from `npm run test:ci`, preserving all existing expensive-suite exclusions and explicitly excluding `test/unit/lib/job-lifecycle.test.ts` with the installed test runner's supported selection mechanism. Compare effective discovery against the union of existing configured exclusions and the lifecycle exclusion before execution; do not assume CLI excludes append to configuration. Record excluded coverage. The lifecycle file makes real localhost requests and can POST jobs if compatible endpoints answer; current API route differences are not a safety control. Do not rewrite its analysis inputs or run it for preparation. If a safe invocation cannot be established, stop the test step and propose a narrowly reviewed selection change.
- After test selection and controls are verified, run the approved local selection, `npm -w apps/web run build`, and `dotnet build apps/api -c Release --no-restore`. Complete installation/restoration first; prevent implicit restoration during checks. Do not count excluded or catch-and-return live cases as exercised; compilation is not API behavioral-test coverage.
- Treat `build` as a writing command: `postbuild` invokes `reseed-all-prompts.ts`. Keep this existing behavior for now, prove it writes only disposable UCM state, and do not seed the integration configuration during a worker check.
- Do not use `first-run.ps1`, restart/stop scripts, hook installers or expensive suites as worker bootstrap. If the documented recipe needs automation after rehearsal, add only a small wrapper justified by that failure; do not pre-build a bootstrap framework.

**Verification:** record starting/final tracked-file status, tool versions, selected/excluded tests, commands and exit codes, listener observations, environment controls, and any install-cache exceptions. Verify generated state stayed in designated disposable paths and no application service started; existing databases must remain untouched. Report network confinement as not established by this local recipe. If a check requires live credentials, external calls or shared application state, stop that check and report the specific gap. A failed implementation attempt uses the repository debt/recovery protocol before another edit.

## P4 — Control integration and review the final combination

**Owned files:** existing `Docs/AGENTS/Procedures/Live_Validation_Hygiene.md`; an integration-version record inside the application home's existing implementation plan once P0 selects it. Avoid implementing a cross-repository manifest service.

- Add the single stack owner to the existing procedure and link to root `AGENTS.md` §Live Job Submission Discipline for the commit-before-live rule. Workers cannot start/stop the integration stack, reseed it, submit jobs, or change its active revision. Paid validation and production operations remain outside preparation scope.
- Define how to record public component commit SHAs, contract/schema revisions, relevant fixture versions, and prompt/configuration content identifiers. Populate only what was actually tested: P5 records source/tool/check revisions, with running product/UCM integration marked not exercised. Do not manufacture runtime records for a documentation rehearsal. Later product integration records actual tested state separately from intended versions; source SHA alone does not prove a loaded UCM blob or running process is current.
- Review the final integrated diff and run its appropriate safe checks. Two independently approved commits are not evidence that their combination works. Resolve conflicts through the owning implementer or integrator; never discard unknown changes.
- Inspect live GitHub merge rules read-only when authorized. Reuse existing CI. Propose the smallest remote rule change if enforcement is absent; changing remote settings requires its own concrete authorization. Do not report local policy as server-enforced protection.
- Initially permit at most one application stack, kept off during P3's check window. Do not use the current restart/stop scripts during preparation: they can stop processes by port or broad shell matches. Alternate-port support is also unverified because Web npm scripts hardcode port 3000. Additional stacks and launcher repair are deferred.

**Before any later service run:** use an explicitly approved, ownership-checked launch/stop command that targets disposable state and records the exact process identity; reject occupied ports rather than kill their owners. If no such path exists, repair the existing scripts in a separately reviewed bounded package before launching. Address actual port propagation, process identity/PID reuse, environment handling, reseed exit status and partial-start cleanup there. No application server is needed for P5's preparation rehearsal.

**Acceptance:** there is one integrator and an auditable procedure for the assembled version set. This is preparation readiness, not evidence of end-to-end prototype correctness; product integration tests remain part of the separately approved implementation.

## P5 — Rehearse using the preparation changes

Collect rehearsal evidence while implementing the approved P1 instruction change and a disjoint P2 reviewer-definition change. P5 checks that evidence and the final combination; it does not replay completed changes or invent a product feature or analysis input.

1. Start two writers from recorded bases in separate worktrees, owning the disjoint P1 and P2 files. Establish P2's effective restrictions and denial checks for each session before task edits; verify simultaneous edits do not affect either other checkout. Start the reviewer separately with sanitized context and restricted capabilities.
2. Each writer delivers a small scoped commit and evidence appropriate to the change. Review pins the exact commits; the reviewer attempts to refute scope, isolation and acceptance claims. Scope the readiness record to exercised tool combinations and hook paths, not hypothetical concurrent workloads.
3. Integrator incorporates the accepted change through the adopted Git workflow. If the final content differs, review the changed diff again. Demonstrate P3's fresh-worktree checks once on the final preparation combination; do not repeat the full suite for every prose edit.
4. Record the final revisions, review result, verification results and remaining limitations in the existing handoff. Retain worktrees until accepted and their changes are reachable; no automatic cleanup of historical worktrees.
5. Captain accepts readiness only for the repository/tool combinations actually demonstrated. Counterpart repositories require their P0 inventory and equivalent preparation checks before a program-wide completion claim.

**Completion criteria:** explicit repository ownership; verified required writer/reviewer restrictions; reproducible credential-free local checks with excluded coverage and network-control limitations recorded; no shared application-state mutation or undeclared cache/temp/log writes; current review evidence for the final diff; one integration owner; and no unresolved blocker from the preparation reviews. Authorized commits/integration change shared Git metadata; P3 separately records allowed install-cache writes. Unverified required restrictions leave the affected tool/session combination unfinished. Record unexecuted tool combinations, cloud, hook paths and product integration as unexecuted.

## P6 — Optional cloud execution

After local acceptance, select one self-contained repository and one existing preparation task. Reuse the same locked installation, safe-check recipe and public technical brief. Verify available runtimes/platform compatibility before provisioning; keep provider credentials, local data and private planning out. Cloud execution must return an exact diff/revision for the normal review path. Windows-only behavior still needs Windows verification. Cloud setup is optional and must not block local preparation completion.

## Review and adoption

Use two independent Codex review lanes for the initial plan: (A) executable setup, state and process isolation; (B) scope, authority, review independence and unnecessary process. Reviewers must not edit the plan or see each other's findings before returning their own. For bounded amendments, use one focused follow-up reviewer against the complete re-pinned revision; add a second only for a new unresolved issue needing different expertise.

Captain can run an additional Claude review using the handover below. No Claude service is called by this task. Record the plan revision and SHA-256 in every review; do not transfer a verdict to a changed file without an explicit follow-up review. A useful review distinguishes blockers to approving this plan from checks intentionally scheduled during implementation.

Review identities, findings and dispositions live in the [preparation review handoff](../AGENTS/Handoffs/2026-09-05_Agents_Supervisor_Preparation_Plan_Review.md). Keep completed verdicts outside this plan so recording results does not change its reviewed hash or expose them to an independent reviewer reading the plan. Captain adoption and user-run Claude review remain separate from Codex plan review.

### Claude handover prompt

```text
As Agents Supervisor and independent adversarial reviewer, review the preparation plan at:
Docs/WIP/2026-09-05_Prototype_Fund_Preparation_Plan.md
Work from the FactHarbor repository root in a fresh task. This is review-only.

Read AGENTS.md, the plan and the specific repository files needed to test its claims.
Do not read other repositories, private material, .env files, development settings or databases.
Do not edit files, write a handoff, install dependencies, run tests/builds, start/stop services,
run paid calls, change Git state/settings, commit, push, deploy or call another paid reviewer.
This explicit read-only request overrides repository instructions to write completion files.
Use a restricted review session; do not rely on FactHarbor's subagent safety-hook claims.

Report the plan revision, file SHA-256 if a permitted read-only tool can compute it, and the
observed source revision. If identity cannot be established, say so; do not fabricate a pin.
Evaluate the plan independently before reading any prior review verdicts.

Try to REFUTE it. Focus on:
1. Whether the proposed access/tool boundaries actually constrain writers and reviewers.
2. Shared Git metadata, inherited hooks/context, UCM reseeding during builds, caches,
   hardcoded Web ports, and accidental service or provider activity.
3. Missing prerequisites, unsafe sequencing, review drift after integration, and readiness claims.
4. Any setup mechanism or paperwork that can be deleted or deferred without losing a real safeguard.
5. Whether repository scope and runtime application ownership remain honestly unverified where required.

Return exactly one verdict: READY FOR CAPTAIN APPROVAL, REVISE BEFORE APPROVAL, or BLOCKED BY MISSING EVIDENCE.
Then give ranked findings with CONFIRMED or PLAUSIBLE, exact file:line evidence and a quote,
the concrete failure scenario, and the smallest plan correction. Separate plan blockers from
implementation-time acceptance checks. Finish with evidence gaps and optional simplifications.
Do not implement or silently rewrite the plan. Return the complete review in chat for handover.
```

## Evidence used for this plan

- [Initial advice and audit](../AGENTS/Handoffs/2026-09-05_Agents_Supervisor_Prototype_Implementation_Setup_Advice.md).
- [Root instructions](../../AGENTS.md), especially Safety and the approval/input boundaries; [collaboration rules](../AGENTS/Multi_Agent_Collaboration_Rules.md); [assignment template](../AGENTS/Multi_Agent_Meta_Prompt.md); [handoff protocol](../AGENTS/Policies/Handoff_Protocol.md).
- [Claude verifier](../../.claude/agents/verify.md), tool grant and hook claim; [Codex verifier](../../.codex/agents/verify.toml), requested read-only sandbox.
- [Web scripts](../../apps/web/package.json), fixed ports and postbuild reseed; [reseed entrypoint](../../apps/web/scripts/reseed-all-prompts.ts), database-path override; [CI](../../.github/workflows/ci.yml), configured checks and runtime versions. [Vitest configuration](../../apps/web/vitest.config.ts) includes the [live lifecycle test](../../apps/web/test/unit/lib/job-lifecycle.test.ts) by default; [config-file tests](../../apps/web/test/unit/lib/config-file-loading.test.ts) create/remove OS-temp fixtures.
- [Contribution guide](../../CONTRIBUTING.md), setup/testing; [restart](../../scripts/restart-clean.ps1) and [stop](../../scripts/stop-services.ps1), process selection; [hook installer](../../scripts/install-hooks.mjs), [post-commit](../../scripts/git-hooks/post-commit) and [post-merge](../../scripts/git-hooks/post-merge), `.git/hooks` assumptions.
- Current Codex [worktree](https://learn.chatgpt.com/docs/environments/git-worktrees), [cloud](https://learn.chatgpt.com/docs/environments/cloud-environment), and [subagent](https://learn.chatgpt.com/docs/agent-configuration/subagents) documentation, checked in the preceding advice pass on 2026-09-05. No account-specific permissions or remote branch protections have been verified.
