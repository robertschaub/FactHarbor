---
title: Report Quality Restoration — Master Plan
date: 2026-04-11
authors: Lead Architect + LLM Expert (Claude Opus 4.6 1M) — Captain: active human user
status: Draft — awaiting user prioritization of quality criteria (Phase 1 gate)
scope: End-to-end diagnosis and remediation of ClaimBoundary pipeline report quality drift since 2026-02-16
supersedes (in spirit, not delete): the April 10 handoffs cluster (Report_Quality_*)
---

# Report Quality Restoration — Master Plan

## 0. Context & framing

The user's lived experience: since the ClaimBoundary pipeline became default on **2026-02-16** (`a40b3a3f`), report quality has drifted unevenly — some reports improved, others regressed. The changes shipped on **2026-04-10** in particular produced mixed results, leaning more negative than positive. Roughly **60+ quality investigation documents** already exist across `Docs/ARCHIVE/`, `Docs/WIP/`, `Docs/AGENTS/Handoffs/`, and `Docs/Investigations/`. This plan is not "yet another investigation" — it is a **consolidation, historical bisection, and structured revert/improvement effort** on top of the existing body of work.

### 0.1 Hard constraints from the user (verbatim)

1. **Improve report quality** — that is the core goal.
2. **No dirty fixes.** Only conceptual, architectural, root-cause changes.
3. **Never guess.** All conclusions must be grounded in existing data, docs, and reproducible runs.
4. **Deterministic verdict/confidence manipulation is forbidden.** Any such existing logic is a candidate for replacement by an LLM call (AGENTS.md §LLM Intelligence mandate already requires this; this plan enforces it).
5. **Matrix coloring by verdict is kept.** It can be improved, but not removed.
6. **No git history destruction.** No `reset --hard`, no force push, no dropped commits. Use worktrees and `git revert` only.
7. **No deployments.** All work is local-only until user explicitly green-lights.
8. **Running jobs on previous commits is allowed** — but expensive; each LLM-real run must be user-approved.
9. **Call out other agents in different roles.** Multi-agent collaboration is required, not optional.
10. **Ask questions along the way.** The user wants to steer decisions, not receive a finished product.

### 0.2 Principles this plan is built on

- **Facts before fixes.** We catalogue what exists before proposing anything.
- **Bisection over speculation.** If the question is "when was quality best?", the answer comes from checking commits, not from memory.
- **Consolidation over creation.** A scorecard, a quality signals doc, a root-cause-and-stabilization plan, a post-rollback validation report, and a cross-review already exist. Before writing anything new, read what's there.
- **One canonical quality criteria set.** Multiple prior scorecards exist — we unify them into one criteria catalogue, then the user picks priorities.
- **Safety first for destructive-looking ops.** Use git worktrees, dedicated branches, and `git revert` commits. Never rewrite history.
- **Measure both ways.** Revert candidates must be tested in both directions (with and without the change) on the same input set, with the same config, on matched commits.
- **Cost-aware.** Expensive LLM runs are user-approved per run, not pre-authorized as a batch.
- **Report everything.** Every phase produces a written deliverable so the user can steer.

### 0.3 Anti-patterns this plan explicitly forbids

- Building a big-bang remediation PR without staging.
- Re-running Phase 1 investigations the Lead/LLM Expert already ran over the past 8 weeks. We **consume** prior work, we do not re-do it.
- Deterministic "rescue" functions, "plausibility overrides", substring-based anchor checks, or any heuristic that decides what text means. All such functions found during the audit are candidates for **LLM-led replacement**, not tuning. (Per LLM Expert learnings 2026-04-10: `isVerdictDirectionPlausible`, `evaluateClaimContractValidation` are already on the naughty list.)
- Silent shipping. Every change in scope must land with a validation measurement attached.
- Trusting a single run. Quality has run-to-run variance (Lead Developer learning 2026-02-22) — multi-run deltas with variance-aware interpretation only.

---

## 1. Scope & definition of done

### 1.1 In scope

- ClaimBoundary pipeline end-to-end, all five stages, plus aggregation and presentation.
- All existing deterministic logic that makes semantic decisions (routing, classification, direction validation, dominance, tier calibration, verdict adjustment).
- UCM configs (`pipeline.default.json`, `search.default.json`, `calc.default.json`, SR config).
- Prompts under `apps/web/prompts/`.
- Matrix coloring UI (improvement allowed, removal forbidden).
- Validation harness (`npm run validate:run`, `npm run validate:compare`).
- Git history since `a40b3a3f` (2026-02-16).

### 1.2 Out of scope

- Non-analysis features (user management, billing, admin UI beyond configuration).
- Infrastructure (deployment, CI, gh-pages).
- The Claim Clarification Gate design from `Docs/WIP/2026-04-10_Claim_Clarification_Gate_Design.md` — that is a separate, queued workstream. This plan may produce inputs to it, but will not block on it.

### 1.3 Definition of done

This plan is complete when **all** of these hold:

1. A **Canonical Quality Criteria Catalogue** exists, with user-assigned priorities.
2. A **Historical Quality Baseline Map** identifies at least three comparison points (best, mid, current) with reproducible commit references and, where possible, existing job output artifacts.
3. A **Change Impact Ledger** classifies every material quality-affecting change since 2026-02-16 as *Helped / Hurt / Neutral / Unknown*, with evidence citations.
4. A **Revert/Keep Decision Sheet** has been reviewed item-by-item with the user, and each decision is recorded with rationale.
5. Approved reverts are landed as **forward-applied `git revert` commits** (never history rewrites), each in its own branch, each with a validation measurement attached.
6. New improvement opportunities identified from the inflection-point analysis are drafted as **separate, sized proposals**, sequenced against the user's criteria priorities.
7. Validation shows the end state meets or exceeds the historical best on the user's top criteria, within variance tolerance.
8. All resulting work items are handed off to Senior/Lead Developer with explicit acceptance criteria.

---

## 2. Phased execution plan

### Phase 0 — Plan & setup (THIS TURN)

| Step | Action | Owner | Output |
|---|---|---|---|
| 0.1 | Write this master plan to WIP | Lead Architect + LLM Expert | This document |
| 0.2 | Confirm prior-work inventory with Explore agent | Lead Architect | Inventory list in Phase 1 report |
| 0.3 | Set up git worktree for historical runs | Lead Architect | `.tmp/quality-worktree/` (empty for now) |
| 0.4 | Return to user with criteria draft + prioritization questions | Lead Architect + LLM Expert | Chat response |

**Gate before Phase 2:** user has assigned priorities to the Quality Criteria Catalogue.

### Phase 1 — Consolidation of prior investigations & criteria synthesis

**Goal:** Read what's already been said. Produce one criteria catalogue. Do not re-investigate.

| Step | Action | Owner | Output |
|---|---|---|---|
| 1.1 | Inventory all report-quality docs (ARCHIVE + WIP + Handoffs + Investigations) | Explore agent | `Prior_Investigations_Index.md` (in WIP) |
| 1.2 | Read the *prior scorecards* and *root-cause plans*: `Report_Quality_Criteria_Scorecard_2026-03-12`, `2026-03-24_Generic_Report_Quality_Signals_Scorecard`, `2026-03-25_Report_Quality_Root_Causes_and_Stabilization_Plan`, `2026-04-06_Upstream_Report_Quality_Workstream_Proposal`, `2026-04-08_Complete_Quality_Assessment_and_Plan`, the April 10 handoff cluster | Lead Architect | Merged criteria draft |
| 1.3 | Read `Docs/xwiki-pages/.../Quality-Standards.xwiki` for any product-level criteria | LLM Expert | Included in criteria draft |
| 1.4 | Read the most recent handoff cluster (Apr 10) for the current diagnosis of regressions | Lead Architect | Appendix to criteria draft |
| 1.5 | Deduplicate overlapping criteria; separate **input signals**, **process signals**, **output signals**, and **user-perceived signals** | Lead Architect + LLM Expert | Canonical Quality Criteria Catalogue (draft) |
| 1.6 | Present to user with priority-setting questions | Lead Architect + LLM Expert | Chat response with questions |

**Explicit anti-duplication rule:** If a criterion already exists in a prior scorecard, we copy it verbatim with a source citation. No rephrasing, no re-derivation.

### Phase 2 — Historical baseline map (post-prioritization gate)

**Goal:** Identify when quality was demonstrably best, and where it regressed. Use existing validation artefacts first; only run new jobs when existing data is insufficient.

> **IMPORTANT CORRECTION (2026-04-11):** My earlier draft of this section asserted that commit `9cdc8889` (`quality_window_start`) was the established historical best. On review, that claim is not supported. The 2026-03-14 Restoration Plan marked it as a hypothesis ("Confirm `quality_window_start` is the correct quality baseline" appears as a reviewer checklist item), and several other commits cited in prior docs as "best" are actually docs-only or deploy-config commits that don't change analyzer code. There is **no single established historical-best commit**. Phase 2 must rediscover this with rigour. See §2.0 below for the re-framing.

#### 2.0 Re-framing: "best code state", not "best commit"

Prior docs conflate three different things:

1. **Job runs** that scored high (e.g. job `5a2aceff` scored 90% on Bolsonaro PT, 2026-03-12 scorecard §7.3)
2. **Commits** those jobs were submitted against (e.g. `523ee2aa` in the scorecard — but that commit is a production deploy reseed, not code)
3. **Code state** actually executing at the moment the job ran (the real variable we want)

The job's `createdAt` timestamp, cross-referenced with the runtime commit that was on `main` at that moment, is the only reliable way to identify the *code state* that produced the result. Docs and deploy commits are noise.

#### 2.1 What Phase 2 actually does

| Step | Action | Owner | Output |
|---|---|---|---|
| 2.1.1 | List every validation-run artefact in `apps/web/test/output/`, `test-output/validation/`, and the TESTREPORTS folder, **including job IDs and timestamps** | Explore agent | `Validation_Artefacts_Index.md` |
| 2.1.2 | For each high-quality run, map `job.createdAt` → the `main`-branch commit that was current at that moment (via `git rev-list -n 1 --first-parent --before="<timestamp>" main`) | Lead Architect | `Run_To_CodeState_Map.md` |
| 2.1.3 | Exclude docs-only and deploy-only commits from the candidate set; only code-touching commits to `apps/web/src/lib/analyzer/`, `apps/web/prompts/`, `apps/web/configs/` count as distinct code states | Lead Architect | Filtered candidate list |
| 2.1.4 | Rank the remaining candidate code states against the top-priority criteria from Phase 1 — **per family** (Bolsonaro, Plastik, Bundesrat/Swiss separately, not averaged) | LLM Expert | `Candidate_CodeStates_Per_Family.md` |
| 2.1.5 | Known candidates from existing data (none are confirmed, all need verification): <br>• Pre-Phase-2 era (before `523ee2aa` deploy, Mar 8) — strongest Bolsonaro-PT evidence<br>• Post-QLT-1 code (landed before `49700231` docs closeout, ~Mar 24) — strongest Plastik stability improvement on record<br>• UPQ-1 Phase B code (`442a5450`, Apr 7) — strongest local Bolsonaro EN result<br>• `9cdc8889` (Feb 17) — hypothesised in 2026-03-14 plan but **unverified** | Lead Architect | Annotated candidate list |
| 2.1.6 | **USER GATE (G2)**: present the top N candidates with per-family evidence and ask which (if any) to replay live | User steering | Go / No-go per replay |
| 2.1.7 | If approved: replay `npm run validate:run -- baseline_<shortsha>` on each approved code state in a worktree; preserve current working tree untouched | Senior Developer (delegated) | `test-output/validation/baseline_<shortsha>/` |
| 2.1.8 | Compare replays to current HEAD with `npm run validate:compare`, and to each other, **reporting per family, not averaged** | Senior Developer | `Historical_Baseline_Map.md` |

**Why per-family, not averaged:** the existing data shows quality is family-specific. Bolsonaro's best code state, Plastik's best code state, and Swiss/Bundesrat's best code state are almost certainly different commits. Averaging hides this and sends us hunting for a single golden commit that does not exist. Phase 2 reports three baselines (or more), not one.

**Git worktree protocol (critical — no data loss):**

```bash
# Stays on main; worktree lives in .tmp/ and is gitignored
git worktree add .tmp/quality-worktree <commit-sha>
# work inside that directory only — never cd out and edit
# when done:
git worktree remove .tmp/quality-worktree
```

Any replay happens inside the worktree. The main working tree (with the user's uncommitted Apr 10 work in `apps/web/src/app/jobs/[id]/page.tsx`, `CoverageMatrix.tsx`, and the claim-extraction stage) **is never touched**. Per memory (2026-03-19 parallel agent safety protocol): check `git status` before every destructive-looking op.

### Phase 3 — Change Impact Ledger (what helped vs hurt)

**Goal:** Classify every quality-affecting commit since 2026-02-16.

| Step | Action | Owner | Output |
|---|---|---|---|
| 3.1 | `git log --oneline a40b3a3f..HEAD -- apps/web/src/lib/analyzer/ apps/web/prompts/ apps/web/configs/` — produce the raw change set | Lead Architect | `Change_Set_Raw.md` |
| 3.2 | Bucket commits into **semantic categories**: prompt change, deterministic-logic add/remove, config change, refactor, schema change, UI change | Code Reviewer (delegated) | `Change_Set_Bucketed.md` |
| 3.3 | For each commit in a "semantic logic" bucket, read the diff and classify impact as *Helped / Hurt / Neutral / Unknown* with citation to validation artefacts or prior investigation docs | Lead Architect + LLM Expert + Code Reviewer (debate) | `Change_Impact_Ledger.md` |
| 3.4 | Flag every commit that introduced **deterministic semantic adjudication** (per AGENTS.md LLM Intelligence mandate) as a **forced candidate for LLM replacement** regardless of impact classification | LLM Expert | Appendix to ledger |
| 3.5 | Identify high-leverage clusters: "this group of commits together caused the Bolsonaro regression" type patterns (existing investigations already hypothesize several — extract and validate) | Lead Architect | Cluster analysis |

**Debate protocol for classification (this is the "debate" the user asked for):**

Per commit-in-question, three roles independently write a one-paragraph verdict: Lead Architect (architectural impact), LLM Expert (prompt/semantic impact), Code Reviewer (code quality/regression risk). If all three agree, the classification stands. If they disagree, the disagreement is recorded and the user adjudicates.

### Phase 4 — Revert/keep decisions (user-driven)

**Goal:** Walk the user through the ledger, one cluster at a time, and record decisions.

| Step | Action | Owner | Output |
|---|---|---|---|
| 4.1 | Present ledger clusters to the user, ranked by negative-impact magnitude | Lead Architect | Chat presentation per cluster |
| 4.2 | For each cluster: user chooses **Revert** / **Keep** / **Replace-with-LLM** / **Defer** | User steering | Decision per cluster |
| 4.3 | Record decisions in `Revert_Keep_Decision_Sheet.md` with rationale | Lead Architect | Decision sheet |
| 4.4 | For each *Revert* decision: check that downstream commits do not depend on the reverted logic; plan safe revert sequence | Lead Architect | Revert plan per decision |

**Safe revert protocol:**

1. Work in a dedicated branch: `git checkout -b quality-restore/<cluster-name>`
2. Use `git revert <sha>` for each commit to revert — never `reset`.
3. If `git revert` conflicts: resolve by hand, do not skip.
4. Run `npm -w apps/web run build` after each revert.
5. Run `npm test` after each revert.
6. Attach a validation measurement (§2.6 protocol) to each revert branch before merging.
7. Do not merge to `main` without explicit user sign-off.

### Phase 5 — New improvement opportunities

**Goal:** Feed forward the learnings from Phases 2–4 into forward-looking proposals, sequenced against user priorities.

Inputs: the historical best-quality commit analysis, the Change Impact Ledger, the user's Phase 1 priorities, and the AGENTS.md constraints (generic, multilingual, LLM-first).

Outputs:

- One *sized* proposal per opportunity, using the existing handoff template, with:
  - Root-cause hypothesis
  - Proposed change (conceptual, not code)
  - Expected quality dimension impact
  - Validation protocol
  - Estimated risk and reversibility
- A prioritized sequencing document tying proposals to the user's top criteria

### Phase 6 — Implementation handoff

| Step | Action | Owner |
|---|---|---|
| 6.1 | For each approved revert and each approved new improvement, write an implementation brief (conceptual, not code) | Lead Architect |
| 6.2 | Hand off to Senior Developer / Lead Developer per role matching | Lead Architect |
| 6.3 | Track implementation and validation outcomes; update Change Impact Ledger with post-fix data | Lead Architect |

---

## 3. Multi-agent collaboration model

**Captain:** active human user (per AGENTS.md default when no Captain role is assigned).

**Active roles and when to call them:**

| Role | When to call | Tool notes |
|---|---|---|
| **Lead Architect** (me, this plan) | Plan design, cluster analysis, architectural impact judgments | — |
| **LLM Expert** (me, this plan) | Prompt/semantic impact, deterministic-rescue audit, anti-pattern detection | — |
| **Explore agent** | Document inventory, validation artefact mapping, git log scans | Use Agent(subagent_type=Explore) |
| **Code Reviewer** | Per-commit diff reviews for the ledger, regression risk assessment | Use Agent(subagent_type=general-purpose) or human Code Reviewer role |
| **Senior Developer** | Worktree setup, replay runs, revert branches, implementation of handoffs | Human role; delegated via handoff briefs |
| **Lead Developer** | Implementation plan review, calibration test runs | Human role; gate for significant reverts |
| **Product Strategist** | Criteria prioritization (optional — user may self-steer) | Human role |

**Debate pattern** (per Lead Architect learning 2026-02-16): multi-reviewer brainstorming produces better architecture than solo design. Phases 3 and 5 explicitly use a 3-role debate (Lead Architect + LLM Expert + Code Reviewer), with disagreements surfaced to the user for adjudication.

**Parallelization rules:** Independent reads run in parallel (Phase 1.1, 2.1, 3.1). Classifications that depend on reads run sequentially after reads complete. Debates are sequential.

---

## 4. Deliverables summary (single table)

| Phase | File / artefact | Location | Size target |
|---|---|---|---|
| 0 | Master plan (this) | `Docs/WIP/2026-04-11_Report_Quality_Restoration_Master_Plan.md` | This file |
| 1 | Prior investigations index | `Docs/WIP/2026-04-11_Prior_Investigations_Index.md` | Short — a list with 1-line summaries |
| 1 | Canonical Quality Criteria Catalogue | `Docs/WIP/2026-04-11_Canonical_Quality_Criteria.md` | Medium |
| 2 | Validation artefacts index | `Docs/WIP/2026-04-11_Validation_Artefacts_Index.md` | Short |
| 2 | Run-to-commit map | Part of `Historical_Baseline_Map.md` | — |
| 2 | Historical Baseline Map | `Docs/WIP/2026-04-11_Historical_Baseline_Map.md` | Medium |
| 3 | Change set (raw + bucketed) | `Docs/WIP/2026-04-11_Change_Set_Bucketed.md` | Medium |
| 3 | Change Impact Ledger | `Docs/WIP/2026-04-11_Change_Impact_Ledger.md` | Long — the core artefact |
| 4 | Revert/Keep Decision Sheet | `Docs/WIP/2026-04-11_Revert_Keep_Decision_Sheet.md` | Medium |
| 5 | Improvement proposal(s) | `Docs/AGENTS/Handoffs/2026-04-XX_Quality_Improvement_Proposal_*.md` | Per-proposal |
| 6 | Implementation briefs | `Docs/AGENTS/Handoffs/2026-04-XX_Quality_Restore_Impl_*.md` | Per-brief |
| All | This plan's trail entry | `Docs/AGENTS/Agent_Outputs.md` | Appended per protocol |

---

## 5. User steering & approval gates

The user steers at these explicit gates — the plan does NOT proceed past them without an answer:

| Gate | When | Decision the user makes |
|---|---|---|
| **G1** | End of Phase 1 | Priority ordering of quality criteria (top 5–8 signals to optimize for) |
| **G2** | Mid Phase 2 (after candidates identified) | Whether to run live replays on the 3 candidate historical-best commits, and how many of them |
| **G3** | End of Phase 3 | Approval of the Change Impact Ledger classifications (any disputed entries adjudicated here) |
| **G4** | Start of Phase 4 | Cluster-by-cluster Revert / Keep / Replace-with-LLM / Defer decisions |
| **G5** | Before each revert lands | Explicit green-light per branch — "merge this into main" |
| **G6** | Phase 5 proposals | Which opportunities to implement and in what order |

At any point between gates, the user can interrupt with "pause / re-steer / stop". The plan treats interruption as normal operation, not exception.

---

## 6. Preliminary quality criteria (Phase 1 draft — to be confirmed/refined)

These are criteria I already expect from reading the existing scorecard filenames and the handoffs cluster. They will be validated and merged with prior scorecards in Phase 1.

**Input layer** — what enters the pipeline:
- **Claim specificity** — extracted AtomicClaims are single, verifiable, clear in subject/predicate/scope
- **Claim fidelity** — extracted claims match the user's actual input without drift or inference
- **Claim coverage** — every material assertion in the input has a matching claim
- **Input neutrality** — "Was X fair?" and "X was fair" yield the same analysis within ≤4%

**Process layer** — what happens during analysis:
- **Evidence diversity** — multiple independent sources per boundary, not one dominant domain
- **Evidence directional balance** — both supporting and contradicting evidence surfaced when it exists
- **Multilingual robustness** — analysis behaviour stable across input languages
- **Source reliability calibration** — SR weights match source type without domain bias
- **Contestation weighting** — only evidence-backed counter-arguments reduce truth %

**Output layer** — what the report says:
- **Verdict directional accuracy** — truth % points in the evidence-supported direction
- **Verdict confidence calibration** — confidence tier reflects actual evidence strength and agreement
- **Explanation quality** — the "why" cites real evidence items, not paraphrase
- **Coverage matrix fidelity** — the matrix correctly reflects claim × boundary evidence counts and verdicts (matrix coloring kept, improvement allowed)
- **Warning integrity** — warnings surface real quality issues without false alarms (per AGENTS.md severity rules)
- **Deterministic-logic freedom** — no deterministic semantic adjudication in the critical path (aggregation, verdict, direction validation)

**User-perceived layer** — what the user feels:
- **Run-to-run stability** — same input yields consistent verdicts across runs (within documented variance)
- **Cross-language consistency** — DE/FR/EN/ES versions of the same claim converge
- **Explanation trustworthiness** — user can verify each conclusion against cited evidence

**Will be validated against Phase 1 docs** — if any prior scorecard has a criterion I missed, it gets added verbatim.

---

## 7. Questions for the user (to be asked at Gate G1)

After Phase 1 consolidation, these are the questions I'll ask. Capturing them now so the user knows the shape of the upcoming interaction:

1. **Top 5–8 criteria.** Which of the above criteria matter most? (The plan will work the top items first.)
2. **Known pain points.** Are there specific inputs you already know regressed (beyond Bolsonaro and Plastik Recycling, which are well-documented)? Having concrete test inputs is worth more than abstract criteria.
3. **Acceptable regression.** If fixing criterion A costs a small regression on criterion B, is that OK — and if yes, what's the ceiling?
4. **Time horizon.** Is this work urgent (days) or sustained (weeks)? That determines whether we do a "big rollback + stabilize" or an "incremental bisect".
5. **Matrix coloring improvements.** You said the coloring stays but might need improvement. What specifically bothers you about the current coloring? (Colour choices, grouping, verdict mapping, something else?)
6. **Deterministic logic removal scope.** "Avoid deterministic verdict/confidence manipulation" — does that include scope like `evidence-filter.ts` probative-value filtering, or only post-LLM adjustment code like `isVerdictDirectionPlausible`?
7. **Budget for live replays.** Running validation on old commits costs real LLM money. Are you OK with up to N replay runs (e.g. 3 × 16-family validation ≈ 48 jobs)? If yes, what's N?

---

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Re-investigating work already done (wasted effort, fatigue) | Phase 1.1 inventory is mandatory; no new investigation allowed until prior work is read |
| Reverting a commit that also contains a useful change | Debate protocol (Phase 3.3) flags mixed commits; surgical reverts only on cluster leaders |
| Live replays eat budget without conclusive answers | Variance-aware interpretation (Lead Developer learning 2026-02-22) — minimum 2 runs per comparison point, compare overlapping pairs only |
| Cascading regressions from reverts | Build + test after each revert; validation before merge |
| Disagreement between roles in the debate | Surfaced to user explicitly; no silent consensus |
| Scope creep into non-quality refactors | §1.2 scope fence enforced; opportunistic fixes go into a separate backlog file, not into this plan's PRs |
| User overrun (too many questions too fast) | Explicit gates G1–G6; no gate skipping |
| Prior investigation concluded something we're about to contradict | Debate role must cite the prior doc; if contradicting, state why with evidence |
| Lost context across conversations | Every deliverable is a file under WIP; every phase concludes with an Agent_Outputs entry |

---

## 9. Compliance checklist

- [x] No hardcoded domain knowledge in plan (criteria are generic)
- [x] LLM Intelligence mandate — deterministic semantic logic flagged for replacement (Phase 3.4)
- [x] No git history destruction (§4.1 protocol)
- [x] No deployments (§1.2)
- [x] Matrix coloring kept (§1.1)
- [x] User steering gates explicit (§5)
- [x] Multi-agent collaboration (§3)
- [x] Prior work consumed before new work (§0.2, §1.1, §2.1)
- [x] Facts-only / no guessing (every classification requires citation)
- [x] Variance-aware interpretation for quality deltas (§8)
- [x] Parallel-agent safety protocol — git status check before destructive ops (§2)

---

## 10. Immediate next actions (this turn)

1. ✅ Plan written (this file)
2. **Launch Phase 1.1** — Explore agent inventories prior investigation docs
3. **Launch Phase 1.2/1.3** — Lead Architect reads the key prior scorecards and extracts criteria verbatim
4. Produce the Canonical Quality Criteria Catalogue (preliminary)
5. Return to user with:
   - The catalogue
   - The 7 prioritization questions (§7)
   - A one-screen inventory summary
   - The git worktree plan ready to activate pending G2 approval

**Do NOT start Phase 2 until G1 is passed.**

---

## Status update — 2026-04-11 (end of session 2)

- **Phase 1**: ✅ complete. 38-doc inventory + 40-criterion Canonical Quality Criteria Catalogue produced. G1 deferred by user.
- **Phase 2 Gate G2**: ✅ **Rev 4 approved and execution beginning**. See [`2026-04-11_Phase2_Gate_G2_Replay_Plan.md`](2026-04-11_Phase2_Gate_G2_Replay_Plan.md). Shape B selected: 3 commits (C0/C1/C3), 4 inputs (R2/R3/R3b/R4), 39 jobs, $15–30 budget. LLM Expert + Captain Deputy reviewed twice (Rev 2 and Rev 3). Priority restructured to 2 global + 21 per-input acceptance checks. Q-ST5 dropped from priority (user directive — cross-lang handled later via dual-language analysis). Wave 1A safeguard (A2) deferred via stash to preserve apples-to-apples with historical baseline. Commit sequence: stash A2 → A1 cleanup → docs-2026-04-10 → docs-2026-04-11 → B → revert B.
- **Phase 2B**: conditional expansion pre-drafted in the Gate G2 doc; activates only on stop-rule trigger.
- **Phase 3**: pending Phase 2 results (Change Impact Ledger from per-input data).
- **Phase 4**: pending Phase 3 (refactor `isVerdictDirectionPlausible` + `getDeterministicDirectionIssues` hemisphere rules + commit A2 with `contract_validation_unavailable` warning type).

**Execution state**: Rev 4 plan is the current source of truth for Phase 2 execution. All review findings are applied. User directives (Q-ST5 drop, per-input criteria, main-DB target, quota check) are incorporated. Awaiting replay data.

---

**End of plan — Phase 2 execution in progress.**
