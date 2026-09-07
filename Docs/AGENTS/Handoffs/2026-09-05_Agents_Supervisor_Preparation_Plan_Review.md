---
### 2026-09-05 | Agents Supervisor | Codex | Prototype Preparation Plan and Review
**Task:** Convert setup advice into a concrete preparation plan, obtain independent reviews, and prepare a user-run Claude handover.
**Files touched:** `Docs/WIP/2026-09-05_Prototype_Fund_Preparation_Plan.md`, its WIP index entry, this handoff, the Agent Outputs entry and generated handoff index.
**Key decisions:** Keep implementation in existing homes and use P0-P5 to establish scope, ownership, effective access restrictions, disposable checks, integration and a two-writer rehearsal. Cloud and multi-stack launch tooling remain optional/deferred. Only planning documentation changes were made.
**Open items:** Revision 3 incorporates the user-supplied Claude findings and is READY FOR CAPTAIN APPROVAL after one focused Codex follow-up review. Captain adoption and actual setup verification remain pending. Additional repository scope remains P0 work.
**Warnings:** Neither a requested read-only agent role nor a successful nominal CI command establishes isolation. The local worker recipe uses operational network safeguards and does not establish network confinement. The default test selection includes real loopback lifecycle requests; Web build reseeds UCM; OS-temp fixtures and installed Git hooks need explicit handling. The live test route mismatch must not be used as a safety boundary.
**For next agent:** Read the [plan](../../WIP/2026-09-05_Prototype_Fund_Preparation_Plan.md) and verify its revision/hash against the accepted review before implementation. The embedded Claude prompt is for a fresh restricted user-run session, with chat-only findings.
**Learnings:** No Role_Learnings update; this operating plan is not yet adopted or exercised.

## Revision 1 review

Both independent reviewers verified revision 1 SHA-256 `FB87FF1F22251F429613BB7FA08F6A6CF56563D48133C7259B60A4D15943628B` against source HEAD `f792eb67193cf601c40949823bfa3bf6b07471a0`. Review A assessed executable setup; review B assessed governance and scope. Neither read the other's findings first or changed files.

| Reviewer | Verdict | Findings and revision-2 disposition |
|---|---|---|
| Codex A, execution | Ready for Captain approval, with implementation acceptance caveats | Made loopback/application blocking and live-test exclusion explicit; redirected process temp storage; required inherited-hook disposition; expanded rehearsal to two disjoint writing worktrees; limited claimed coverage and runtime evidence. |
| Codex B, governance | Revise before approval | Removed the undefined residual-limitation route around reviewer restrictions; added an integrator-recording exception for restricted reviewers; moved completed review results out of the hashed plan. |

No setup tests, builds, installs, service operations, analyses, commits, pushes or remote changes were performed. Plan links/whitespace and generated-index consistency are checked separately from implementation acceptance.

## Final revision 2 review

**Plan SHA-256:** `73EF9886468DA43DB041E234E798539451B5A7E44D58D53434404D4747791425`.
**Source HEAD:** `f792eb67193cf601c40949823bfa3bf6b07471a0`, unchanged. Both reviewers verified the complete revision and hash again without reading the linked review handoff or each other's findings.

| Reviewer | Final result | Scope of conclusion |
|---|---|---|
| Codex A, execution | HOLDS WITH CAVEATS — READY FOR CAPTAIN APPROVAL | No established plan blocker or impossible dependency. Test discovery, offline recipe, temporary/cache paths, hook behavior and simultaneous writers require implementation evidence. |
| Codex B, governance | HOLDS — READY FOR CAPTAIN APPROVAL | Reviewer-access contradiction and completion-writing conflict closed; review identity, independence, scope and adoption boundaries hold. |
| Claude, user-run | REVISE BEFORE APPROVAL | User supplied an independent review pinned to this exact revision/hash. Writer-confinement verification and network acceptance wording required correction; the earlier Codex readiness judgments are superseded for adoption. |
| Captain | Adoption pending | Reviewer agreement does not authorize setup implementation. |

**Implementation notes from final review:** Hook repair must not move worker logs into another shared location. Verify all expensive exclusions remain active and the lifecycle test is absent before executing the worker selection. Establish effective bootstrap restrictions before simultaneous edits, then distinguish those restrictions from durable agent definitions being changed. Authorized Git commits/integration necessarily change shared Git metadata; the prohibition concerns shared application/cache/temp/log mutation and unauthorized Git operations. Do not claim application integration or unexercised tool/hook coverage from preparation checks.

## Claude findings and revision 3 disposition

The user authorized revising the plan and obtaining one focused follow-up review. Claude reported verifying the revision-2 identity and repository claims before reading the earlier verdicts. Its review used an instruction-bound main session, not enforced read-only capabilities; it is plan-review evidence, not a P2 containment demonstration.

| Finding | Disposition in revision 3 |
|---|---|
| B1 — Writer containment lacked a denial check | P2/P5 require effective-policy inspection and a harmless out-of-write-root sentinel check before every mutation-capable writer/reviewer session begins task edits. Unenforced writers are unfinished and cannot be used for writing. |
| B2 — Network blocking and absence-of-requests claims were untestable as written | P3 now names service-access inspection, a stack-off check window, before/after listener observations, credential absence and only demonstrably safe endpoint overrides. These are operational safeguards; network confinement is explicitly unestablished. Required confinement needs an existing separately authorized environment or the affected check stays unexecuted. This is a narrower acceptance claim requiring Captain adoption. |
| I1 — Installed hooks are active and incompatible with linked-worktree logging | Read-only inspection confirmed the configured installed hooks and `.git/hooks` log targets. The integrator must repair and install task-local logging before affected paths execute. The installed post-commit differs from the checked-in copy, so unrelated changes must be preserved. Rehearsal coverage cannot be inferred for untriggered hook paths. |
| I2 — Main-session command hook misses alternative paid-test invocations | P2 records the limit and does not treat the hook as an enforcement guarantee. Broad hook redesign remains outside this package. |
| I3 — CLI exclusions may replace configured exclusions | P3 requires comparing discovered tests with the union of existing exclusions and the lifecycle exclusion before execution. The runner's actual merge behavior remains an implementation check. |
| I4 — Dependency cache writes need an explicit disposition | P3 permits only named, explicitly allowed install/restore-cache exceptions; test/build application, cache, temp and log state remains task-local. The .NET build uses `--no-restore` after explicit restore. |
| Simplification — Duplicated rule and repeated review committee | P4 links to the existing commit-before-live rule. Bounded plan amendments use one focused review unless another unresolved issue needs different expertise. |

The Windows platform-wide impossibility claim in the supplied review was not adopted; it is unnecessary to establish the plan's missing control/evidence problem. No network behavior, denial probe, hook execution or worker check was performed in this documentation task.

## Revision 3 follow-up review

**Plan SHA-256:** `5F92646EA179A44FBDB1F7431BDEF3ADBB5FD91A927C00C78C026E8143C662A0`.
**Source HEAD:** `f792eb67193cf601c40949823bfa3bf6b07471a0`, unchanged. The local tracking ref is two pitch-publication commits ahead; they have not been integrated. Later integration must preserve their shared-index additions and recheck any affected plan evidence.

**Focused Codex review:** READY FOR CAPTAIN APPROVAL. The reviewer independently verified the complete revision, hash and source pin without reading this handoff or another reviewer's verdict. No remaining plan approval blocker was found: writer restrictions now precede edits; network controls carry an explicit limitation; hook repair precedes affected operations; exclusion/caching/restore boundaries and final review identity are consistent.
**Claude revision 3 review:** Not run. Its revision-2 verdict is not transferred to revision 3.
**Captain adoption:** Pending; no preparation implementation is authorized by this record.

**Implementation checks retained by the reviewer:** Inspect all effective tools as well as filesystem policy; one denied sentinel does not prove every mutation route is blocked. Verify discovered tests, installed build tooling and all write targets. Web postbuild uses `npx tsx`, so settle dependency availability during installation to avoid fetching missing tooling during checks. Record ordinary task-local build outputs alongside disposable UCM/cache/temp/log paths. Demonstrate the actual writers, applicable hook paths, listener observations and final integrated checks; do not infer readiness for unexercised combinations.

**Review limitation:** This Codex reviewer also inherited workspace-write permissions and mutation-capable tools. It performed read-only operations under instruction; its review does not demonstrate P2 containment.

**Documentation verification:** Relative links and trailing whitespace checked; completion index rebuilt. No setup tests, builds, installs, service operations, analyses, commits, pushes or remote changes performed. The revision-3 plan remained unchanged after the pinned review.

## Captain acceptance and formal P2 closure — 2026-09-07

The Captain accepted P2 reviewer/writer readiness after reading
`test-output/preparation/p2-effective-checks/HANDOVER-to-Codex-Native-2026-09-06.md`
and `P2-CAPTAIN-DECISION-MEMO.md`. The integrator independently checked the consolidated
parent-process result at `p2-native-results-2026-09-07.json` and the clean, synchronized
FactHarbor checkout.

**Accepted evidence:**

- Codex `verify` and `scout` writes were denied by the read-only OS sandbox.
- The Codex writer could write inside its worktree and was denied outside it.
- The Claude verifier had no mutation-capable tool.
- A child spawned by an ephemeral read-only Codex parent inherited the sandbox; its sentinel
  write was OS-denied and the parent confirmed that the sentinel did not exist.
- A real outbound request was blocked. No retry or payload was used.
- P2 implementation commit `c9fb85241` is integrated on `main`; the acceptance checkout was
  clean and synchronized at `9f07b4ea4`.

**Closure:** P2 is **CLOSED for the demonstrated FactHarbor tool/session combinations**.
Restricted sessions must use a fresh
`codex exec --ignore-user-config --ephemeral --sandbox read-only|workspace-write` launch with
`windows.sandbox=elevated`, no additional writable roots, network disabled, and inherited
`CODEX_*` variables removed except `CODEX_HOME`. The desktop-collaboration-child path is not
an approved restricted-session launcher. Parent-process observations remain authoritative
over agent self-report.

This acceptance covers FactHarbor OS-sandbox enforcement, not other repositories or
prompt-injection resistance. It does not authorize cross-repository work, production access,
application services, paid tests, or destructive operations. The reviewed revision-3 plan
and SHA-256 remain unchanged. P5 preparation continues in
[`2026-09-07_Prototype_Fund_P5_Rehearsal_Execution_Packet.md`](../../WIP/2026-09-07_Prototype_Fund_P5_Rehearsal_Execution_Packet.md).
