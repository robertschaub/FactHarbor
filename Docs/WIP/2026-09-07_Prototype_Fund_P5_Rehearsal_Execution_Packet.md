# Prototype Fund P5 rehearsal — execution packet

**Status:** PROCESS REHEARSAL ACCEPTED — isolated P3 runner qualification remains open after the repeated NuGet acquisition stop
**Created:** 2026-09-07
**Owner:** Lead Developer/integrator; Captain approves dispatch and final acceptance
**Scope:** FactHarbor only

## Purpose

Turn the reviewed revision-3 preparation plan's P5 requirements into one bounded rehearsal assignment.
P2 containment is formally closed for the demonstrated FactHarbor sessions. This packet does
not authorize work in another repository, application services, paid tests, live analyses,
remote-setting changes, deployment, or destructive operations.

Authoritative inputs:

- [Preparation plan revision 3](2026-09-05_Prototype_Fund_Preparation_Plan.md), especially P1-P5.
- [Plan review and P2 closure](../AGENTS/Handoffs/2026-09-05_Agents_Supervisor_Preparation_Plan_Review.md).
- Local parent-process evidence under
  `test-output/preparation/p2-effective-checks/` (ignored, machine-local).

## Historical dispatch decision (completed)

The Captain approved the two disjoint writer packages below before launch:

1. **Writer A — P1 governance alignment.**
2. **Writer B — P3 credential-free worker-check documentation.**

Revision 3 originally paired P1 with a P2 reviewer-definition edit. P2 is now implemented and
integrated at `c9fb85241`; the plan also prohibits replaying completed changes. P1 and P3 are
therefore the smallest real, disjoint remaining packages that can exercise two writers. This
substitution was approved before launch; this record does not authorize another dispatch.

The sandbox's enforced boundary is the assigned worktree root, not the narrower owned-file
list. Owned files are additionally controlled through the assignment, parent-captured diff,
and review. Writer processes do not commit because linked-worktree commits mutate the shared
Git common directory while the accepted launch recipe permits no additional writable roots.
After each writer exits, the integrator reviews and commits its accepted diff on that task
branch.

## Dispatch baseline and topology

Before launch, the integrator:

1. Commits this packet and records the resulting clean `main` SHA.
2. Creates two linked worktrees and short-lived branches from that exact SHA:
   `codex/p5-p1-governance` and `codex/p5-p3-worker-checks`.
3. Records each worktree root, branch, HEAD, Git common directory and starting tracked status.
4. Confirms that the integration checkout and both worktrees are clean and that no writer can
   access another worktree as a writable root.
5. Designates ignored in-root and out-of-root sentinel paths under
   `test-output/preparation/p5-rehearsal/`; verifies they are absent before launch.

Do not prune, repair, delete or reuse an existing worktree. Machine-local paths belong in the
execution evidence, not this packet.

## Enforced launch contract

Every Codex writer or reviewer uses a fresh non-interactive launch:

```text
codex exec --ignore-user-config --ephemeral --sandbox <workspace-write|read-only> -C <assigned-root> --json
```

The parent launcher must also set:

- `approval_policy=never`
- `windows.sandbox=elevated`
- `sandbox_workspace_write.writable_roots=[]`
- `sandbox_workspace_write.exclude_tmpdir_env_var=true`
- `sandbox_workspace_write.exclude_slash_tmp=true`
- `sandbox_workspace_write.network_access=false`
- `features.apps=false`, `features.plugins=false`, `features.memories=false`
- `web_search=disabled`
- remove inherited `CODEX_*` variables except `CODEX_HOME`

The desktop-collaboration-child path is prohibited for restricted sessions. The parent
records requested and reported sandbox modes, process exit, sentinel state and tracked diff.
Agent self-report is supplementary only.

Before task edits, each writer performs exactly one in-root disposable write and one
out-of-root disposable write. The in-root write must succeed; the out-of-root write must be
OS-denied. The parent removes the in-root sentinel after recording it. Any unexpected result
stops both writer packages before substantive edits.

## Writer A assignment — P1 governance alignment

**Role:** Agents Supervisor
**Branch:** `codex/p5-p1-governance`
**Goal:** Implement only the revision-3 P1 ownership, integration and review-evidence rules.

**Owned files:**

- `AGENTS.md`
- `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md`
- `Docs/AGENTS/Multi_Agent_Meta_Prompt.md`
- `Docs/AGENTS/Policies/Handoff_Protocol.md`
- `.github/pull_request_template.md`
- `CLAUDE.md`
- `.cursor/rules/factharbor-core.mdc`
- `.clinerules/00-factharbor-rules.md`
- `.windsurfrules`

**Required result:**

- One concise root rule: scoped task worktrees and one designated integrator for concurrent
  writing; no silent change to the main-triggered documentation deployment workflow.
- Existing assignment, pull-request and handoff templates carry repository/base revision,
  worktree/branch, owned files, boundaries, permitted commands/state paths, checks, reviewer,
  integrator, stop conditions and reviewed-revision evidence without duplicating manuals.
- Thin wrappers point to the root rule instead of claiming direct-to-main as the concurrent
  workflow.
- Restricted reviewers return chat findings; the integrator records completion artifacts and
  serializes shared-index changes.

**Verification:** parent-captured diff contains only owned files; search active wrappers for
contradictory direct-to-main or reviewer-write guidance; no application tests or services.

## Writer B assignment — P3 worker-check documentation

**Role:** Senior Developer
**Branch:** `codex/p5-p3-worker-checks`
**Goal:** Document a reproducible, credential-free local worker-check recipe derived from CI.

**Owned files:**

- `CONTRIBUTING.md`
- `.github/workflows/ci.yml` only if an explicit state-path setting is proven necessary

**Required result:**

- Separate worker checks from live-service setup; require Node `>=20.19.0`, .NET 8.0.x,
  locked installation and recorded exact versions.
- Use fresh worktrees without credentials or development databases and task-local state below
  `test-output/preparation/<task-id>/`.
- Preserve configured expensive-suite exclusions and explicitly exclude
  `apps/web/test/unit/lib/job-lifecycle.test.ts`; require discovery comparison before running.
- Keep services off, inspect ports 3000/5000 before and after, and describe local controls as
  operational safeguards rather than network confinement.
- Treat Web build/reseeding, dependency caches, restore and temporary paths explicitly.
- Require `npm ci`, the approved safe selection, `npm -w apps/web run build`, and
  `dotnet build apps/api -c Release --no-restore` only after selection and state controls are
  verified.

**Verification during writing:** documentation and CI-source inspection only. Do not install,
build, test, start services or call providers in the writer session. Executing the resulting
recipe is an integrator-owned later rehearsal step.

## Review and integration sequence

1. Each writer exits after returning a parent-captured diff and concise evidence; neither
   writer commits, pushes or edits shared Git metadata.
2. The integrator rejects out-of-scope changes, then commits each accepted diff on its task
   branch. Installed hooks must run normally; do not bypass them.
3. A fresh enforced read-only reviewer receives the exact commit and diff for each package,
   attempts to refute scope and acceptance, and returns findings in chat only.
4. The owning writer may receive one fresh constrained correction session if needed. Any
   changed commit/diff is reviewed again.
5. The integrator incorporates the approved commits sequentially into the integration
   checkout and records conflict resolutions. The reviewer checks the final combined diff.
6. Only after the final documentation is approved, an authorized isolated runner executes
   the documented P3 recipe once. It records selected/excluded tests, commands, exit codes,
   listener observations, tracked status, state paths, cache exceptions and network limits.
7. The integrator writes the P5 completion handoff. Captain acceptance is limited to the
   FactHarbor tools, hook paths and checks actually exercised.

## Stop conditions

Stop before further edits or checks if any of the following occurs:

- requested and reported sandbox modes differ;
- an out-of-root sentinel write succeeds or an in-root write fails;
- a writer's diff touches an unowned file or another checkout changes;
- a reviewer has an effective mutation, deployment, job-submission or admin path;
- a task sees private-repository material, credentials or development settings;
- ports 3000/5000 are occupied during the reserved check window;
- test discovery cannot prove all expensive and lifecycle exclusions;
- a check requires provider access, live credentials, shared application state or network
  confinement unavailable to the runner;
- an installed hook fails or writes outside its task-local path;
- the integration result differs from the reviewed commits without renewed review.

No retries, fallback mechanisms or scope expansion follow a stop without an integrator
record and, where required, Captain decision.

## P5 acceptance record

The completion handoff must include:

- dispatch baseline and final integrated SHA;
- worktree/branch identities and parent-captured containment results;
- writer diffs and integrator-created commit SHAs;
- reviewer identities, exact reviewed revisions and dispositions;
- hook paths actually exercised;
- P3 discovery, selection and command evidence;
- proof that tracked files and protected application state remained clean;
- all unexecuted combinations and the standing limits on other repositories, networking,
  prompt injection and product integration.

The Captain accepted the demonstrated P5 collaboration/process rehearsal on 2026-09-07: two
isolated writers with disjoint ownership, enforced containment checks, sequential integration and
fresh read-only review. Acceptance is limited to those exercised combinations. It does not claim
that the isolated P3 runner completed dependency restoration, discovery, selected tests or builds.
Those commands remain a separate open environmental qualification rather than reopening the
accepted collaboration rehearsal.

Attempts seven and nine both stopped at command 07 with `NU1301` after commands 00 through 06
passed. Attempt nine was the sole actual Captain-authorized retry; a pre-task identity guard
stopped attempt eight before any worker command ran. A fresh read-only reviewer returned
`CONFIRMED_STOP / ACCEPT_CLASSIFICATION`. The failed run already used an explicit task-local
`NuGet.Config` that declared the nuget.org v3 service index, while a separate host-side request
returned HTTP 200. The host result establishes reachability only from that host at that later time;
it does not localize the earlier runner failures or exclude timing-dependent or upstream causes.
Missing machine-level configuration, certificate trust and the runner's inner cause all remain
unproven. No additional restore or runner launch is authorized by this packet.
