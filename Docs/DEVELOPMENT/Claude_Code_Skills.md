# FactHarbor Workflow Skills

FactHarbor currently ships nine built-in workflow skills. Claude Code exposes them as slash
commands, and the same canonical procedures live under `.claude/skills/<name>/SKILL.md` for
Codex/GPT and Gemini to consume directly.

Skills are **Claude Code-native** but also usable by any other LLM tool (Gemini, GPT, Copilot, Cline): the YAML frontmatter is ignored and the rest is plain markdown. See [§ Cross-Tool Usage](#cross-tool-usage).

---

## Quick Reference

| Skill | Slash command | When to use | Real LLM calls? |
|---|---|---|---|
| [Pipeline Analysis](#pipeline-analysis) | `/pipeline` | Debug, architecture questions, multi-stage changes | No |
| [Quality Audit](#quality-audit) | `/audit` | Pre-release checks, quality regressions | No |
| [Validation](#validation) | `/validate` | Measure benchmark regressions after pipeline changes | **Yes — $1-5+** |
| [Handoff](#handoff) | `/handoff` | End of any significant task | No |
| [Debug Check](#debug-check) | `/debug` | Post-change health check; log + test analysis | No |
| [Explain Code](#explain-code) | `/explain-code` | Explain how code works with analogies and diagrams | No |
| [Prompt Diagnosis](#prompt-diagnosis) | `/prompt-diagnosis` | RAG-augmented prompting deficiency analysis with runtime prompt-hash plus commit context | No |
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

All nine skills are discoverable by non-Claude agents:

- **Codex / GPT agents** read the **Named Workflows** table in [AGENTS.md](../../AGENTS.md).
- **Gemini** reads the mirrored workflow list in [GEMINI.md](../../GEMINI.md) and can also
  enter through [`.gemini/skills/factharbor-agent/SKILL.md`](../../.gemini/skills/factharbor-agent/SKILL.md).

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
