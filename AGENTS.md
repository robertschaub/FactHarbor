# AGENTS.md

How AI coding agents should operate in the FactHarbor repository.
Applies to all paths unless a closer `AGENTS.md` overrides it (e.g., `apps/api/AGENTS.md`).

---

## Fundamental Rules

### Generic by Design
- **No domain-specific hardcoding.** Code, prompts, and logic must work for ANY topic.
- **No hardcoded keywords.** No lists like `['bolsonaro', 'trump', 'vaccine']`.
- **Parameterize, don't specialize.** Use configuration over conditionals.
- **No new code for removed/replaced things.** If something has been removed, replaced, or renamed (e.g., Monolithic Canonical pipeline [removed], `ExtractedFact` → `EvidenceItem`, `fact` → `statement`), do not extend, reference, or build on it. Use only the current version.

### Analysis Prompt Rules
These rules apply specifically to the LLM prompts used in the analysis pipeline (under `apps/web/prompts/`). Improving these prompts for quality and efficiency is welcome — but only with explicit human approval.
- **No test-case terms.** Prompt examples must be abstract (e.g., "Entity A did X" not "Country built industry"). This prevents teaching-to-the-test.
- **Do not enforce** finding AnalysisContexts or EvidenceScopes by using non-generic terms, date-periods, or regions. These must emerge naturally from evidence.

### Terminology — NEVER Confuse These

| Term | Meaning | Variable names | NEVER call it |
|------|---------|---------------|---------------|
| **AnalysisContext** | Top-level analytical frame requiring separate analysis | `context`, `analysisContext` | "scope" |
| **EvidenceScope** | Per-evidence source metadata (methodology, temporal bounds) | `evidenceScope` | "context" |
| **EvidenceItem** | Extracted evidence from a source (NOT a verified fact) | — | "fact" (in new code) |
| **probativeValue** | Quality assessment of evidence (high/medium/low). Assigned by LLM, filtered by `evidence-filter.ts` | — | — |
| **SourceType** | Source classification (peer_reviewed_study, news_primary, etc.). Used for reliability calibration. | — | — |

EvidenceItem key fields: `statement`, `category`, `claimDirection`, `evidenceScope`, `probativeValue`, `sourceType`. See `apps/web/src/lib/analyzer/types.ts` for full schema.

### Input Neutrality
- "Was X fair?" must yield same analysis as "X was fair" (tolerance ≤4%)
- Input phrasing must NOT affect analysis depth or structure

### Pipeline Integrity
- **No stage skipping:** Understand → Research → Verdict (all required)
- **Evidence transparency:** Every verdict must cite supporting or opposing evidence items
- **Quality gates:** Gate 1 (claim validation) and Gate 4 (confidence) are mandatory

---

## Architecture

```
User Input → apps/web (Next.js, port 3000)    → apps/api (ASP.NET Core, port 5000)
             ├─ src/lib/analyzer/                 ├─ Controllers/ (Jobs, Analyze, Internal)
             │  orchestrated.ts (~13600 lines)    ├─ Services/ (JobService, RunnerClient)
             │  monolithic-dynamic.ts             ├─ Data/ (Entities, FhDbContext)
             ├─ src/app/api/internal/run-job/     └─ SQLite: factharbor.db
             └─ LLM calls via AI SDK              Swagger: http://localhost:5000/swagger
```

### Key Files

| File | Purpose |
|------|---------|
| `apps/web/src/lib/analyzer/orchestrated.ts` | Main pipeline (~13600 lines — navigate carefully) |
| `apps/web/src/lib/analyzer/types.ts` | TypeScript types and interfaces |
| `apps/web/src/lib/analyzer/aggregation.ts` | Verdict aggregation + claim weighting |
| `apps/web/src/lib/analyzer/evidence-filter.ts` | Deterministic evidence quality filtering |
| `apps/web/src/lib/analyzer/source-reliability.ts` | Source reliability: prefetch, lookup, weighting |
| `apps/web/src/lib/config-storage.ts` | Unified Config Management: SQLite storage |
| `apps/web/src/app/api/internal/run-job/route.ts` | Runner route (job execution entry point) |
| `apps/api/Services/JobService.cs` | All DB writes (creates event rows for audit) |

**Pattern references:** When adding new code, study existing patterns first. For controller patterns follow `JobsController.cs`, for service patterns follow `JobService.cs`, for pipeline modules study how `evidence-filter.ts` and `aggregation.ts` are structured.

Full project structure: see Architecture diagram above and `apps/api/AGENTS.md` for .NET details.

---

## Commands

| Action | Command |
|--------|---------|
| Quick start | `powershell -ExecutionPolicy Bypass -File scripts/first-run.ps1` |
| Restart / Stop services | `.\scripts\restart-clean.ps1` / `.\scripts\stop-services.ps1` |
| Web dev server | `cd apps/web; npm run dev` (port 3000) |
| API dev server | `cd apps/api; dotnet watch run` (port 5000) |
| Build web | `npm -w apps/web run build` |
| Tests | `npm test` — runs vitest (`npm -w apps/web test`) |
| Lint | `npm run lint` — placeholder (not yet configured) |

---

## Reading .xwiki Files

Documentation lives in xWiki 2.1 format under `Docs/xwiki-pages/FactHarbor/`. Quick syntax: `= H1 =`, `== H2 ==`, `**bold**`, `//italic//`, `[[Link>>Target]]`, `{{info}}...{{/info}}`, `{{mermaid}}...{{/mermaid}}`, `{{code language="..."}}...{{/code}}`.

Preserve existing syntax when editing. Full rules: `Docs/AGENTS/GlobalMasterKnowledge_for_xWiki.md`.

**Format rule:** Each document exists in exactly ONE authoritative format. If a `.md` file shows "Moved to xWiki", read the `.xwiki` file instead.

---

## Safety

- Do not access production systems or real customer data
- Do not change secrets/credentials or commit them
- Do not modify generated files or dependencies (e.g., `node_modules`) unless requested
- Avoid destructive git commands unless explicitly asked
- Do not overwrite `apps/api/factharbor.db` unless asked
- Platform is Windows. Use PowerShell-compatible commands.

---

## Agent Handoff Protocol

When starting any new task, every agent MUST:

1. **Assess fit**: Is this task best suited for the current agent/tool, or would another be more effective?
2. **Recommend if not**: Tell the user which agent/tool to use, why, what context it needs (files to read, decisions already made), and any work completed so far.

### Roles & Multi-Agent Workflows

If the user assigns you a role (Lead Architect, Lead Developer, Senior Developer, LLM Expert, Tech Writer), read `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md` for role definitions, workflows, and collaboration protocols. The area-to-document mapping in that file tells you which docs to read for each task area.

### Working Principles

- **Stay focused.** Do the task you were given. Do not wander into adjacent improvements unless asked.
- **Plan before non-trivial changes.** For multi-file changes or unfamiliar code: explore the relevant code, draft an approach, then implement. Skip planning only for single-file, obvious changes.
- **Don't guess — read or ask.** If unsure what code does, read it. Don't assume from function names or training knowledge. If still unsure, ask the human. Check actual project dependencies (`package.json`, `.csproj`) rather than assuming library/framework behavior.
- **Quality over quantity.** A small, correct change beats a large, sloppy one. Read before you edit. Verify after you change.
- **Verify your work.** After implementing, run tests, build, or check output. Don't mark work done without verification.
- **Be cost-aware.** Minimize unnecessary LLM calls, file reads, and token usage. Don't re-read files you already have in context. Don't generate verbose output when concise will do.
- **Don't gold-plate.** Deliver what was requested — don't also refactor the file, add comments, and update docs unrequested. But DO report issues, inconsistencies, or improvement opportunities you notice along the way — just flag them, don't act on them without asking.
- **Cross-check code against docs.** When working on code, consult the related documentation under `Docs/xwiki-pages/FactHarbor/` (see the area-to-document mapping in `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md` §1.2). When working on docs, check the code it describes. Report any mismatches — stale docs and diverged implementations are high-value catches.
- **Summarize when done.** List files touched, note assumptions, and flag if tests were not run and why.

### Tool Strengths Reference

| Task Type | Best Tool | Why |
|-----------|-----------|-----|
| Complex architecture, multi-step reasoning | Claude Code (Opus) | Deep reasoning, plan mode |
| Inline code completions | GitHub Copilot | Fast, context-aware |
| Multi-file refactors with preview | Cursor (Composer) | Visual diff, multi-file edits |
| Autonomous multi-step workflows | Cline | Runs commands, creates files autonomously |
| Documentation + diagrams | Agent with TECH_WRITER role | See `Docs/AGENTS/TECH_WRITER_START_HERE.md` |
| .NET API work | Any agent | Read `apps/api/AGENTS.md` first |
| xWiki documentation | Any agent | Read `Docs/AGENTS/AGENTS_xWiki.md` first |

---

## Authentication

| Header / Variable | Purpose |
|-------------------|---------|
| `X-Admin-Key` / `FH_ADMIN_KEY` | Internal API endpoints |
| `X-Runner-Key` / `FH_INTERNAL_RUNNER_KEY` | Runner → Next.js trigger |

Config: `apps/api/appsettings.Development.json` (from `.example`). Web: `apps/web/.env.local` (from `.env.example`).

---

## Current State (Pre-release, targeting v1.0)

Pipeline variants: Orchestrated (default), Monolithic Dynamic (fast alternative). Monolithic Canonical was removed in v2.10.x.

LLM Tiering: Haiku 4.5 (extract/understand), Sonnet 4.5 (verdict/context refinement).

For full feature list and known issues, see `Docs/STATUS/Current_Status.md`.

| Variable | Default | Purpose |
|----------|---------|---------|
| `FH_RUNNER_MAX_CONCURRENCY` | `3` | Max parallel analysis jobs |
| `FH_CONFIG_DB_PATH` | `./config.db` | UCM SQLite location |
| `FH_SR_CACHE_PATH` | `./source-reliability.db` | SR cache database path |

Analysis configuration (pipeline/search/calculation/SR) is managed in UCM (Admin → Config). Env vars are for infra/runtime only.
