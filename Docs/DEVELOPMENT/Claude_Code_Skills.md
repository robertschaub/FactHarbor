# FactHarbor Workflow Skills

FactHarbor currently ships fourteen built-in workflow skills. Claude Code exposes them as slash
commands, and the same canonical procedures live under `.claude/skills/<name>/SKILL.md` for
Codex/GPT, Gemini, and Cline to consume directly.

Skills are **Claude Code-native** but also usable by any other LLM tool (Gemini, GPT, Copilot, Cline): the YAML frontmatter is ignored and the rest is plain markdown. See [§ Cross-Tool Usage](#cross-tool-usage).

---

## Quick Reference

| Skill | Slash command | When to use | Real LLM calls? |
|---|---|---|---|
| [Pipeline Analysis](#pipeline-analysis) | `/pipeline` | Debug, architecture questions, multi-stage changes | No |
| [Quality Audit](#quality-audit) | `/audit` | Pre-release checks, quality regressions | No |
| [Adversarial Debate](#adversarial-debate) | `/debate` | Structured adversarial debate on any proposition; reusable by other skills | No |
| [Context Extension](#context-extension) | `/context-extension` | Preserve, exchange, and reload high-value in-progress context throughout long sessions | No |
| [Debt Guard](#debt-guard) | `/debt-guard` | Mandatory bugfix complexity guard: decide between undoing/amending previous code and adding new code before editing | No |
| [Prompt Audit](#prompt-audit) | `/prompt-audit` | Static prompt-only quality audit against AGENTS.md prompt rules and schema alignment | No |
| [Validation](#validation) | `/validate` | Measure benchmark regressions after pipeline changes | **Yes — $1-5+** |
| [Handoff](#handoff) | `/handoff` | End of any significant task | No |
| [Debug Check](#debug-check) | `/debug` | Post-change health check; log + test analysis | No |
| [Explain Code](#explain-code) | `/explain-code` | Explain how code works with analogies and diagrams | No |
| [Prompt Diagnosis](#prompt-diagnosis) | `/prompt-diagnosis` | RAG-augmented prompting deficiency analysis with runtime prompt-hash plus commit context | No |
| [Report Review](#report-review) | `/report-review` | Holistic job-report analysis: expectations, evidence, boundaries, verdict reasoning, warnings | No |
| [Docs Update](#docs-update) | `/docs-update` | Update living docs across `Docs/` and archive only clearly obsolete material | No |
| [WIP Update](#wip-update) | `/wip-update` | Consolidate `Docs/WIP/`, sync backlog/status, and archive completed or historical WIP docs | No |

---

## Pipeline Analysis

**File:** [`.claude/skills/pipeline/SKILL.md`](../../.claude/skills/pipeline/SKILL.md)

Performs a deep analysis of the ClaimAssessmentBoundary pipeline. Triggers a 64k-token thinking budget (`ultrathink`) before forming conclusions.

### When to use

- Debugging a multi-stage pipeline failure
- Answering architecture questions that span multiple stage files
- Reviewing a change that touches the data flow between stages
- Investigating evidence quality issues (probativeValue, claimDirection)

### Invocation

```
/pipeline <optional focus>
```

Examples:
```
/pipeline
/pipeline why are verdicts flipping from MOSTLY_FALSE to MOSTLY_TRUE on re-runs
/pipeline boundary-clustering producing single boundary for multi-claim inputs
```

Leave the argument blank for a general architecture review.

### What it does

1. Reads every relevant stage file under `apps/web/src/lib/analyzer/` before forming any conclusion.
2. Applies AGENTS.md mandatory rules throughout (no deterministic text-analysis logic, no hardcoded keywords).
3. Reports findings with `file:line` references.

### Covered stage files

| Area | Files |
|------|-------|
| Orchestration / data flow | `claimboundary-pipeline.ts`, `research-orchestrator.ts` |
| Claim extraction | `claim-extraction-stage.ts` |
| Query generation | `research-query-stage.ts` |
| Source acquisition | `research-acquisition-stage.ts` |
| Evidence extraction | `research-extraction-stage.ts` |
| Evidence filtering | `evidence-filter.ts` |
| Boundary clustering | `boundary-clustering-stage.ts` |
| Verdict generation | `verdict-generation-stage.ts` |
| Aggregation | `aggregation-stage.ts` |
| Types / contracts | `types.ts`, `pipeline-utils.ts` |

---

## Quality Audit

**File:** [`.claude/skills/audit/SKILL.md`](../../.claude/skills/audit/SKILL.md)

Full prompt and pipeline quality audit across seven issue categories. Triggers `ultrathink`. No real LLM calls — reads source files only.

### When to use

- Before a release phase or after any major pipeline change
- Investigating a suspected quality regression with no obvious source
- Verifying AGENTS.md compliance after a large refactor

### Invocation

```
/audit <optional focus area>
```

Examples:
```
/audit
/audit verdict-generation and aggregation stages only
/audit UCM sync — check for hardcoded values that should be configurable
```

### What it does

1. Reads all prompt files under `apps/web/prompts/`.
2. Reads five key pipeline stage files.
3. Classifies every finding into one of seven categories:

| Category | What it checks |
|---|---|
| A. LLM Intelligence | Deterministic text logic that should be LLM-powered |
| B. Hardcoding | Domain-specific keywords or named entities |
| C. Teaching-to-the-test | Prompt examples using benchmark input terms |
| D. Evidence quality | `probativeValue`, `claimDirection`, `EvidenceScope` |
| E. Verdict calculation | Direction, confidence, counter-evidence weighting |
| F. UCM sync | Hardcoded values that belong in admin config |
| G. Contract mismatches | Prompt output schema vs. TypeScript types |

4. Assigns severity: **PHASE-BLOCKER** / **HIGH** / **MEDIUM** / **LOW**.
5. Outputs a structured table: `ID | Category | Severity | File:Line | Description | Recommended Fix`.

---

## Adversarial Debate

**File:** [`.claude/skills/debate/SKILL.md`](../../.claude/skills/debate/SKILL.md)

Structured adversarial debate modeled on the pipeline's Stage 4 verdict debate (`verdict-stage.ts`). Runs an intake/structural audit, then spawns Advocate, Challenger, and Reconciler roles with optional Consistency Probes and Validator. No real LLM calls to the analysis pipeline — agent spawns only.

### When to use

- Architecture or design decisions that need adversarial pressure before committing
- Root-cause attribution when multiple plausible causes exist
- Fix mechanism selection (prompt-edit vs. UCM vs. stage-code vs. rollback)
- Any decision another skill wants to stress-test before acting on it

### Invocation

```
/debate [--lite | --standard | --full] [--constraints "..."] "Proposition text"
```

Examples:
```
/debate "Should we split the verdict stage into two separate LLM calls?"
/debate --full "The regression in bolsonaro-en is caused by the prompt change in commit 3add5697, not the evidence filter update"
/debate --lite "Use Haiku or Sonnet for the new validation step?"
```

### Complexity tiers

| Tier | Agents | Models | When |
|---|---|---|---|
| LITE | 2 (Challenger + Reconciler) | mid-tier | Binary choices with bounded evidence |
| STANDARD | 3 (Advocate + Challenger + Reconciler) | mid-tier | Tradeoffs and mechanism selection (default) |
| FULL | 5–6 (+ Probes + Validator) | mid + lightweight + top-tier | Uncertain attribution, high-stakes, irreversible |

Callers pass an explicit tier flag. Auto-detection uses the context manifest's structural properties (evidence depth, gaps, risk markers), not proposition keywords.

### What it does

1. **Intake audit** — verifies the evidence bundle has concrete items, stable IDs, and explicit known gaps.
2. **Argument panel** — Advocate and Challenger construct opposing cases citing inventory items.
3. **Reconciliation** — Reconciler decides inside the structural envelope; baseless challenges do not shift the conclusion.
4. **Validation** (FULL only) — lightweight grounding + direction check on the Reconciler's decision.

### Cross-skill integration

Other skills invoke `/debate` by passing a `CONTEXT_MANIFEST` with `EVIDENCE_INVENTORY`, `KNOWN_GAPS`, and optional `OPTIONAL_STATE`. The skill adds no domain rules — caller constraints pass through verbatim to all roles.

---

## Debt Guard

**File:** [`.claude/skills/debt-guard/SKILL.md`](../../.claude/skills/debt-guard/SKILL.md)

Mandatory balanced complexity-control workflow for bug fixes, failed validation recovery, refactors, and reviews. It prevents additive repair drift without assuming rollback is always best.

### When to use

- Every bugfixing task before editing, including regressions, failing tests/builds, runtime defects, and review findings
- Every bugfix where a previous change might have introduced or exposed the issue
- Failed validation recovery after a test, build, manual check, or live verifier fails
- Reviewing agent-generated patches for fallback stacking, duplicate mechanisms, or obsolete code left behind
- Refactoring when two mechanisms now compete for the same responsibility

### Invocation

```
/debt-guard <task or diff focus>
```

Examples:
```
/debt-guard fix the failing verdict citation guard test
/debt-guard review this patch for additive workaround drift
/debt-guard failed build after the retry change
```

### What it does

1. Builds an evidence inventory: symptom, verifier, recent change surface, existing mechanisms, and constraints.
2. Classifies the likely cause as introduced regression, incomplete existing mechanism, obsolete parallel mechanism, missing capability, or uncertain.
3. Compares undo/amend/quarantine/delete options against adding new code.
4. Allows a compact path for trivial single-site fixes, while still requiring the skill to be loaded and applied before editing.
5. Requires a pre-edit Complexity Budget and a post-edit reconciliation against the actual diff for non-trivial fixes.
6. Requires explicit verifier tier, cost, and runtime-provenance handling for expensive or live validation.
7. Enforces small, self-contained bugfix slices; oversized cleanup or refactor work becomes a follow-up unless required by the verifier-backed root cause.
8. Classifies accepted temporary debt separately from unplanned mess and requires a removal trigger when debt is deliberately accepted.
9. Uses self-review or reviewer review for non-trivial fixes and gates `/debate --standard` to high-risk cases.

### Key guardrails

- Do not default to rollback, and do not default to additive code.
- New fallbacks, flags, helpers, or compatibility paths require a missing-capability justification or containment/removal plan.
- Failed validation still uses the canonical `keep`, `quarantine`, or `revert` classification before another attempt is stacked.
- Reverting ambiguous user-owned work requires Captain approval.

---

## Context Extension

**File:** [`.claude/skills/context-extension/SKILL.md`](../../.claude/skills/context-extension/SKILL.md)

Preserves selected working context into compact reload and exchange artifacts throughout long sessions when context-window pressure, compaction, resume, delegation, or handoff would otherwise lose important state. It is an in-progress working-memory workflow, not a second memory system and not a replacement for task-completion outputs.

### When to use

- Before compaction or resume when important state would otherwise be lost
- After expensive file/log/report/subagent investigation that may need to be reloaded later
- At a phase boundary where the next phase needs decisions, hypotheses, validation state, and exact reload pointers
- Before delegating to another agent when it needs a bounded context packet rather than the full conversation
- After review/debate consolidation when accepted and rejected alternatives must travel to the next phase
- When the user asks to save, checkpoint, externalize, exchange, rehydrate, reload, or preserve working context

### Invocation

```
/context-extension <optional task slug or reload target>
```

Examples:
```
/context-extension selection-readiness-investigation
/context-extension reload 2026-04-26_selection-readiness_context.md
```

### What it does

1. Writes a compact artifact under `.codex/context-extension/` using a stable date and task slug.
2. Stores reload pointers and summaries, not raw transcripts or broad file dumps.
3. Separates verified observations, decisions, hypotheses, open questions, reload steps, and "do not trust without rechecking" items.
4. Adds agent-exchange packets with delegated questions, source pointers, constraints, known gaps, and expected return formats.
5. Requires freshness checks against the current branch, git status, source files, date, and newest user instructions before reusing artifact claims.
6. Requires deletion, supersession, or promotion into the normal Exchange Protocol output when the task ends.

### Overlap boundaries

Context Extension is a transport layer for working memory, not the owner of the work. Use the owning workflow for the actual task:

| If the need is... | Use... | Context Extension may... |
|---|---|---|
| Startup orientation or prior-work discovery | `fhAgentKnowledge.preflight_task` and AGENTS startup protocol | checkpoint only the state gathered after preflight |
| Completion or role handoff | Exchange Protocol / `/handoff` | promote selected working notes into the durable output |
| Adversarial decision-making | `/debate` | store the compact conclusion and rejected alternatives |
| Living-doc or WIP cleanup | `/docs-update` or `/wip-update` | checkpoint long-running cleanup state |
| Pipeline/report/prompt/debug/validation analysis | `/pipeline`, `/report-review`, `/prompt-diagnosis`, `/debug`, `/validate`, `/audit` | preserve reload pointers and intermediate state |

Efficiency rule: write one compact active artifact per task only at phase boundaries, delegation points, subagent returns, pause/compaction, or explicit user request. If the artifact would be more expensive than rereading the source, do not write it.

Suppression rule: do not create a context-extension artifact when the owning workflow's final output, required handoff, `Agent_Outputs.md` entry, or subagent return already preserves the needed state with enough fidelity for continuation.

### Discovery and authority

| Tool surface | Trigger mechanism | Canonical source |
|---|---|---|
| Codex / GPT in this desktop app | User-level skill auto-trigger from `C:\Users\rober\.codex\skills\context-extension\SKILL.md` | Mirror of `.claude/skills/context-extension/SKILL.md` |
| Claude Code | `/context-extension` or automatic skill selection from `.claude/skills/context-extension/SKILL.md` | `.claude/skills/context-extension/SKILL.md` |
| Gemini | Shared workflow list in `GEMINI.md` and `.gemini/skills/factharbor-agent/SKILL.md` | `.claude/skills/context-extension/SKILL.md` |
| Generic agents | Named Workflows table in `AGENTS.md` | `.claude/skills/context-extension/SKILL.md` |

If the user-level Codex copy and repo copy drift, the repo copy is authoritative for FactHarbor. Resync the user-level copy after changing the repo skill.

### Guardrails

- Completion outputs still use `Docs/AGENTS/Agent_Outputs.md` or `Docs/AGENTS/Handoffs/`.
- Rehydrated context is advisory unless it points back to authoritative current files or tool outputs.
- Do not store secrets, credentials, production/customer data, full transcripts, or raw sensitive logs.
- Do not use `Docs/WIP/` for temporary context-extension artifacts.
- `.codex/context-extension/` is gitignored local working state; promote selected content into the Exchange Protocol if it must survive task completion.

---

## Prompt Audit

**File:** [`.claude/skills/prompt-audit/SKILL.md`](../../.claude/skills/prompt-audit/SKILL.md)

Static prompt-only quality audit for `apps/web/prompts/`. It scores prompts against AGENTS.md prompt rules, multilingual robustness, neutrality, efficiency, output schema alignment, and failure-mode coverage. No real LLM calls and no file writes.

### When to use

- Auditing prompts before editing them
- Checking prompt rule compliance after prompt changes
- Looking for generic-hygiene, schema-alignment, or multilingual robustness issues without running jobs
- Following up on `/audit` findings that are prompt-only and do not require runtime provenance

### Invocation

```
/prompt-audit <optional prompt file, directory, or blank for all prompts>
```

Examples:
```
/prompt-audit
/prompt-audit claimboundary.prompt.md
/prompt-audit apps/web/prompts
```

### What it does

1. Loads AGENTS.md prompt rules and the analyzer type contracts needed for schema checks.
2. Audits each in-scope prompt against nine criteria: rule compliance, efficiency, effectiveness, un-ambiguity, generic hygiene, multilingual robustness, bias/neutrality, output schema alignment, and failure-mode coverage.
3. Emits findings only for concerns and failures, with line evidence and generic fix proposals.
4. Runs a self-audit over proposed fixes so policy-violating fixes are rejected instead of recommended.

### Caveat

- This is static and read-only. Use `/prompt-diagnosis` for runtime prompt provenance and `/report-review` for concrete job-output quality analysis.

---

## Validation

**File:** [`.claude/skills/validate/SKILL.md`](../../.claude/skills/validate/SKILL.md)

Runs the full benchmark validation suite and compares results to a baseline. **Submits real analysis jobs — costs $1-5+ per run.** Use deliberately, after targeted changes.

### When to use

- After a pipeline or prompt change that may affect verdict quality
- When `/debug` or `/audit` flags a potential regression
- Before tagging a release

### Invocation

```
/validate <change-slug>
```

Example:
```
/validate fix-boundary-clustering-v2
```

The slug is appended to the output directory name so results are easy to diff.

### What it does

1. Reads recent git log to understand the scope of changes.
2. Runs `npm run validate:run -- post-<change-slug>` — submits 16 benchmark families, writes JSON to `test-output/validation/`.
3. If a prior baseline exists, runs `npm run validate:compare` to diff the two runs.
4. Applies the Captain's principle: **"improve the system not the data"** — all fixes must be generic, never input-specific.
5. Pays special attention to the three priority benchmark families:

| Family | Variants |
|---|---|
| Bolsonaro judgment | Question and statement variants |
| Hydrogen vs. Electric Cars | — |
| Venezuela article | — |

### Caveats

- `disable-model-invocation: true` is set — Claude will not auto-invoke this skill on startup; you must call it explicitly.
- Do **not** run without a clear reason. The safe post-change check is `/debug` (no LLM calls).

---

## Handoff

**File:** [`.claude/skills/handoff/SKILL.md`](../../.claude/skills/handoff/SKILL.md)

Generates a structured handoff document at the end of any significant task. Ensures continuity between agent sessions and collaborators.

### When to use

- At the end of any multi-step task or agent session
- Before handing work off to a different agent or role
- When switching focus areas mid-sprint

### Invocation

```
/handoff <task-slug>
```

Example:
```
/handoff boundary-clustering-refactor
/handoff phase7-observability
```

### What it does

1. Runs `git log --oneline -8` and `git diff HEAD~3 --stat` to gather scope context.
2. Reads `Docs/AGENTS/Policies/Handoff_Protocol.md` for the required format and role alias table.
3. Creates `Docs/AGENTS/Handoffs/<DATE>_<active-role>_<task-slug>.md` with six required sections:

| Section | Content |
|---|---|
| Task | What was asked and the goal |
| Done | What was implemented, with `file:line` references |
| Decisions | Key choices and rationale |
| Warnings | Risks, known regressions, incomplete items |
| Learnings | What the next agent must know to continue correctly |
| Next | Recommended next steps in priority order |

4. Appends a one-line summary entry to `Docs/AGENTS/Agent_Outputs.md`.

---

## Debug Check

**File:** [`.claude/skills/debug/SKILL.md`](../../.claude/skills/debug/SKILL.md)

Standard post-change health check. Reads the debug log, runs the test suite, and correlates any issues with recent commits. No real LLM calls.

### When to use

- After any pipeline or prompt change, as a routine check
- When a job behaves unexpectedly and you want to triage quickly
- Before deciding whether a full `/validate` run is warranted

### Invocation

```
/debug <optional focus>
```

Examples:
```
/debug
/debug evidence extraction — seeing low probativeValue rates
```

### What it does

1. Reads `apps/web/debug-analyzer.log` (last 300 lines if large). Identifies errors, warnings, stage failures, contract violations, timing anomalies.
2. Runs `npm test` (safe — excludes expensive LLM tests) and checks the pass/fail summary.
3. Looks for five failure patterns:

| Pattern | What to look for |
|---|---|
| Stage failures | Which stage, which input |
| Evidence quality | Unusually low `probativeValue`, `claimDirection` inversions |
| Boundary clustering | Single boundary when multiple expected, or vice versa |
| Verdict direction | Counter-evidence treated as supporting evidence |
| Contract violations | Prompt output rejected by schema validator |

4. Runs `git log --oneline -5` to correlate issues with recent commits.
5. Reports findings in priority order: stage, likely cause, recommended fix.

### Benchmark regression flags

If any of the three Captain's priority families regress, `/debug` recommends running `/validate` for a full measurement:

- Bolsonaro judgment (question and statement variants)
- Hydrogen vs. Electric Cars
- Venezuela article

---

## Explain Code

**File:** [`.claude/skills/explain-code/SKILL.md`](../../.claude/skills/explain-code/SKILL.md)

Explains how code works using everyday analogies, mermaid diagrams, and a structured walkthrough. Designed for teaching, onboarding, or any time a piece of code needs to be understood rather than changed.

### When to use

- "How does this work?" questions about any part of the codebase
- Onboarding a new contributor to a pipeline stage or module
- Explaining a non-obvious architectural decision
- Reviewing code before modifying it — forces a clear mental model first

### Invocation

```
/explain-code <code selection or topic>
```

Examples:
```
/explain-code boundary-clustering-stage.ts
/explain-code how does evidence filtering decide what to drop?
/explain-code the verdict confidence calculation
```

### What it does

For every explanation, the skill produces four elements in order:

| Step | What it produces |
|---|---|
| 1. Analogy | Compares the code to something from everyday life |
| 2. Diagram | A mermaid diagram showing flow, structure, or relationships |
| 3. Walkthrough | Step-by-step explanation of what happens |
| 4. Gotcha | A common mistake or misconception to watch out for |

For complex concepts it uses multiple analogies. The tone is conversational, not reference-manual.

---

## Cross-Tool Usage

All fourteen skills are discoverable by non-Claude agents:

- **Codex / GPT agents** read the **Named Workflows** table in [AGENTS.md](../../AGENTS.md).
- **Gemini** reads the mirrored workflow list in [GEMINI.md](../../GEMINI.md) and can also
  enter through [`.gemini/skills/factharbor-agent/SKILL.md`](../../.gemini/skills/factharbor-agent/SKILL.md).
  `factharbor-agent.skill` is a repo-coupled helper package for that entrypoint; it does not
  bundle the `.claude/skills/` workflow files and must be used from a FactHarbor checkout.
- **GitHub Copilot, Cursor, Cline, and Windsurf** have lightweight wrapper files that point
  back to [AGENTS.md](../../AGENTS.md). Their bugfixing summaries explicitly point agents to
  `/debt-guard` before editing, then agents open the referenced `.claude/skills/<name>/SKILL.md`
  file directly.

For any tool that is not Claude Code:

1. Find the skill name in the Named Workflows table in `AGENTS.md`.
2. Read the corresponding `.claude/skills/<name>/SKILL.md` file.
3. **Ignore the YAML frontmatter** (the `---` block at the top). It is Claude Code metadata.
4. Follow the numbered steps in the body as a plain markdown procedure.
5. Prefer PowerShell-compatible command variants in this repository; translate any shell snippet
   to your host shell if needed.
6. Note that `ultrathink` is a Claude Code directive — other tools can ignore it or substitute
   their own deep-reasoning invocation.
7. `/validate` uses `disable-model-invocation: true` to prevent accidental auto-invocation;
   other tools should treat this as a reminder to only run the skill explicitly.

---

## Prompt Diagnosis

**File:** [`.claude/skills/prompt-diagnosis/SKILL.md`](../../.claude/skills/prompt-diagnosis/SKILL.md)

RAG-augmented diagnosis of LLM prompting deficiencies. Correlates pipeline failures with **runtime prompt provenance first** (`promptContentHash` / `config.db`) and **execution commit context second** (`executedWebGitCommitHash` / `git show`). Diagnoses report-specific failures, systemic deficiencies, and prompt rollout drift. No real LLM calls.

### When to use

- A pipeline output looks wrong and the cause may be in how the LLM was instructed
- Investigating why a specific report produced a bad verdict or low-confidence result
- Looking for systemic prompt deficiencies before a major release
- After `/audit` flags an issue but you need to trace it back to a specific report

### Invocation

```
/prompt-diagnosis <optional focus>
```

Examples:
```
/prompt-diagnosis
/prompt-diagnosis phase7-e2
/prompt-diagnosis verdict direction flipping on re-runs
/prompt-diagnosis job abc123
```

### What it does

The skill runs three tracks in parallel then correlates the results:

```
RAG Corpus                 Report Corpus                   Prompt Corpus
────────────               ─────────────                   ─────────────
Prompt_Issue_Register.md   test-output/**/*.json           config.db / config_blobs
Role_Learnings.md          debug-analyzer.log              promptContentHash (exact primary blob)
Recent Handoffs            → jobId + prompt hash           git show <hash>:prompt files
                           → issue/warning payload         (secondary code/history context)
        └────────────────────────────┴────────────────────────────┘
                                      ↓
                           Deficiency analysis (12 categories)
                                      ↓
                    Report + selective register updates
```

**Six phases:**

| Phase | What happens |
|---|---|
| 1. RAG bootstrap | Reads `Prompt_Issue_Register.md`, `Role_Learnings.md`, and recent handoffs to build a corpus of known issues |
| 2. Report discovery | Scans `test-output/` artifacts, uses structured report failures first, and uses logs only for corroboration |
| 3. Runtime-anchored retrieval | Recovers prompt blobs by `promptContentHash` from `config.db` when possible; uses `executedWebGitCommitHash` / `git show` as secondary context |
| 4. Diff analysis | Compares exact blob vs active blob vs file where possible; identifies prompt, rollout, code-parser, or model-route drift |
| 5. Deficiency analysis | Classifies findings across 12 categories (see below); tags each as NEW or KNOWN-RECURRING |
| 6. Register update | Appends only strong new findings to `Prompt_Issue_Register.md`; marks resolved or unconfirmed entries carefully |

### Twelve deficiency categories

| ID | Category |
|----|---|
| P1 | Instruction ambiguity |
| P2 | Missing or insufficient constraint (value-level or scope-level) |
| P3 | Conflicting instructions (with false-positive suppression for intentional priority ordering) |
| P4 | Output schema drift — mandatory stage code retrieval |
| P5 | Teaching-to-test or benchmark anchoring |
| P6 | Insufficient reasoning scaffold on high-stakes scored output |
| P7 | Threshold miscalibration — repeated outputs, distributions, or logs; single-run guesses stay low-confidence |
| P8 | Stage boundary confusion (upstream schema mismatch) |
| P9 | Section/order bias in rendered prompt sections |
| P10 | Prompt injection surface via interpolated user variables |
| P11 | Calibration drift from model version upgrade |
| P12 | Register stale-open false match |

### Self-improving RAG

`Prompt_Issue_Register.md` does not exist until the first run. The skill creates it automatically and appends only strong new findings after each run. Subsequent runs load the register as their primary RAG corpus, so the skill becomes more precise over time without filling the register with speculative noise.

### Caveats

- Prefers `promptContentHash` in the report JSON so it can recover the exact primary runtime prompt blob from `config.db`. If the blob is missing, the skill falls back to commit/file approximation and marks coverage accordingly.
- `executedWebGitCommitHash` is full-repo execution provenance, not prompt-exact provenance. Dirty suffixes indicate approximate code history, not prompt-specific drift.
- Runtime prompts are UCM/DB-first. If the active blob differs from the prompt file on disk, file diffs alone do not explain runtime behavior.
- If PHASE-BLOCKER systemic findings are found, the skill recommends `/audit`. If benchmark regressions are suspected, it recommends `/validate`.

---

## Report Review

**File:** [`.claude/skills/report-review/SKILL.md`](../../.claude/skills/report-review/SKILL.md)

Holistic review workflow for concrete analysis jobs and job families. It compares observed reports
against benchmark expectations, inspects evidence health and boundary structure, audits verdict
reasoning and warning severity, and proposes only AGENTS-compliant fixes. It operates on local
reports, databases, logs, prompts, and git history.

### When to use

- Investigating a specific bad report or `UNVERIFIED` outcome
- Reviewing one or more supplied job URLs or job IDs before proposing any fix
- Comparing current-stack job behavior against benchmark expectations
- Deciding whether a problem is in prompting, code, config, rollout state, or runtime variance

### Invocation

```
/report-review <optional scope>
```

Examples:
```
/report-review
/report-review 2369faac2e464221a124a2bf97c5916e
/report-review https://app.factharbor.ch/jobs/e5e6ec8da824491c8984a18505481ba7
/report-review input=bolsonaro-en
/report-review commit=ace3c114463ecfbe56f4f16037bc5c3a65088e50
```

### What it does

1. Builds scope from explicit jobs, URLs, commit, input slug, or HEAD.
2. Inspects user-provided jobs first and records each as `INSPECTED` or `NOT-INSPECTABLE`
   before any same-input or same-commit comparators are loaded.
3. Reads benchmark expectations, report-quality checks, prior handoffs, and in-scope job payloads
   from the API DB, `test-output/`, and repo-root result JSONs.
4. Runs a structured review over evidence, claim boundaries, verdicts, warnings, prompt/runtime
   provenance, regressions, and rerun stability.
5. Produces constrained fix proposals that must stay generic, multilingual, and evidence-backed.
   Prompt edits are allowed only when inspected-job evidence shows prompt behavior is implicated;
   otherwise they stay provisional-only.

### Key guardrails

- Exact user-supplied jobs are the primary evidence base; nearby jobs are supplemental only.
- A missing or inaccessible requested job must be reported explicitly rather than substituted away.
- Prompt changes require inspected-job evidence and may not be stacked speculatively on top of
  code/config/runtime uncertainty.
- Autonomous execution remains narrow: read operations plus the pre-gated single reseed or single
  `/validate` path defined in the skill.

---

## Docs Update

**File:** [`.claude/skills/docs-update/SKILL.md`](../../.claude/skills/docs-update/SKILL.md)

Systematic documentation cleanup across `Docs/`, with **update-first** handling for living docs
and **archive-first** handling for WIP and handoff material. The workflow is PowerShell-first for
this Windows repository. No real LLM calls.

### When to use

- Cleaning up stale architecture, spec, reference, or xWiki docs
- Reconciling documentation with the current codebase and terminology
- Archiving clearly obsolete documentation without losing partially valid content
- Doing a docs sweep that goes beyond `Docs/WIP/` only

### Invocation

```
/docs-update <optional scope>
```

Examples:
```
/docs-update
/docs-update Docs/ARCHITECTURE
/docs-update xwiki diagrams and pipeline docs
```

### What it does

1. Reads the required xWiki, Mermaid, and AGENTS guidance before editing anything.
2. Splits the work into living-doc updates vs WIP/handoff archival so current docs are corrected
   in place instead of being prematurely archived.
3. Verifies entities, types, stages, and diagrams against the actual code before changing prose.
4. Syncs `Backlog.md`, `Current_Status.md`, archive indexes, and WIP cleanup history when the
   doc pass surfaces active follow-up work.

### Caveat

- The workflow never deletes. Anything archived stays on disk for review before later removal.

---

## WIP Update

**File:** [`.claude/skills/wip-update/SKILL.md`](../../.claude/skills/wip-update/SKILL.md)

Focused consolidation workflow for `Docs/WIP/`. Reviews each WIP file against code and status
docs, archives completed or historical material, and ensures remaining open work is represented
in the backlog. No real LLM calls.

### When to use

- Cleaning up `Docs/WIP/` without touching the rest of the docs tree
- Reconciling WIP plans against what actually landed in code
- Updating backlog and current-status docs after a WIP cleanup pass
- Splitting mixed WIP files into still-active content vs historical narrative

### Invocation

```
/wip-update <optional scope>
```

Examples:
```
/wip-update
/wip-update Phase 7 only
/wip-update backlog sync after WIP cleanup
```

### What it does

1. Reads the WIP registry, backlog, current status, archive index, and base consolidation
   procedure before making any classification decision.
2. Classifies each WIP file as STILL ACTIVE, DONE, SUPERSEDED, PARTIALLY DONE, HISTORICAL,
   STALE, or UNCERTAIN.
3. Uses helper-agent investigation only for genuinely ambiguous implementation status; if the
   tool does not support delegation, it performs the same checklist directly.
4. Updates `Backlog.md`, `Current_Status.md`, and `Docs/WIP/README.md` so the surviving WIP set
   and the active backlog stay aligned.

### Caveat

- STALE and UNCERTAIN files are surfaced for user decision rather than being archived automatically.

---

## Adding New Skills

1. Create `.claude/skills/<name>/SKILL.md` with YAML frontmatter and a numbered step procedure.
2. Add a row to the **Named Workflows** table in `AGENTS.md`.
3. Add a row to the **Named Workflows** table in `GEMINI.md`.
4. Update the shared workflow list in `.gemini/skills/factharbor-agent/SKILL.md`.
5. Add a row to the Quick Reference table at the top of this file.
6. Rebuild/refresh `factharbor-agent.skill` whenever `.gemini/skills/factharbor-agent/SKILL.md` changes.
7. For mandatory workflows such as bugfix guards, update lightweight tool wrappers too:
   `.github/copilot-instructions.md`, `.cursor/rules/factharbor-core.mdc`,
   `.clinerules/00-factharbor-rules.md`, and `.windsurfrules`.
8. Verify every workflow path listed in `AGENTS.md`, `GEMINI.md`, `.gemini/skills/factharbor-agent/SKILL.md`, wrapper docs, and this file exists and is included in the intended commit.
9. Run `npm run index` after writing final handoffs so `Docs/AGENTS/index/handoff-index.json` can discover the new task history. Handoff indexes are for agent task history only, not source-code lookup.
