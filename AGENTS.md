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

### LLM Intelligence (MANDATORY)
**Priority: CRITICAL | Scope: Entire analysis codebase | Exceptions: NONE**

Deterministic text-analysis logic that makes analytical decisions MUST be replaced with LLM-powered intelligence. **New deterministic text-analysis decision logic MUST NOT be created.** When implementing any feature that requires understanding, classifying, comparing, or interpreting text meaning — use an LLM call, never regex, keywords, heuristics, or rules.

**NEVER CREATE** (deterministic logic making analytical decisions about text):
- Regex/pattern/keyword-based classification, scoring, or routing that interprets meaning
- Text similarity heuristics that influence analytical outcomes
- Rule-based NLP, entity extraction, or semantic matching driving analysis
- Any hardcoded decision tree that determines what text *means*

**KEEP** (deterministic structural plumbing):
- Input validation (null/empty, format, length), type coercion, schema guards
- ID generation, hashing, normalization, formatting
- Routing, retry, timeout, concurrency limits — anything that doesn't interpret meaning

**Efficiency mandates** (intelligence must not be wasteful):
- **Batch aggressively.** One structured prompt over 10 separate calls.
- **Cache ruthlessly.** Identical/equivalent inputs hit cache before LLM. No repeated reasoning.
- **Tier intelligently.** Lightweight models for simple decisions; powerful models for complex reasoning only.
- **Minimize tokens.** Lean prompts, bounded outputs, no redundant context.
- **Pre-filter before calling.** Trivial validation stays deterministic.

**When writing or reviewing analysis code:** If you encounter existing deterministic logic making semantic decisions, flag it for replacement. Do not extend, optimize, or build on it — migrate it to LLM. If you are about to write new text-analysis logic, it MUST use LLM intelligence from the start.

### Multilingual Robustness (MANDATORY)
Analysis behavior must be robust across languages (e.g., English, French, German, and others), not just English.

- **No English-only semantic assumptions.** Do not rely on English-specific regex/keywords/word-order rules for analytical decisions.
- **Meaning over wording, in any language.** Semantic interpretation, equivalence, relevance, and classification must go through LLM intelligence.
- **Preserve original language.** Do not force translation as a prerequisite for analysis unless explicitly required by the feature.
- **Test beyond English.** For analysis-affecting changes, include multilingual validation scenarios to confirm input neutrality and stable outcomes across languages.

### String Usage Boundary (MANDATORY)
Strings that influence analysis are only allowed in:
- LLM prompt text
- Web search text (query construction / provider-facing search strings)

Outside of those two areas, do not use language-dependent strings, keyword lists, or regex phrase matching to make analysis decisions.

All text that goes into LLM prompts or Web search must be managed in UCM (Admin-configurable), not hardcoded inline in code.

Exception: Structural constants are allowed in code (e.g., enum-like labels, schema literals, status/type keys) when they define data contracts rather than analysis meaning.

### Analysis Prompt Rules
These rules apply specifically to the LLM prompts used in the analysis pipeline (under `apps/web/prompts/`). Improving these prompts for quality and efficiency is welcome — but only with explicit human approval.
- **No test-case terms.** Prompt examples must be abstract (e.g., "Entity A did X" not "Country built industry"). This prevents teaching-to-the-test.
- **Do not enforce** finding AnalysisContexts (or ClaimBoundaries) or EvidenceScopes by using non-generic terms, date-periods, or regions. These must emerge naturally from evidence.

### Terminology — NEVER Confuse These

| Term | Meaning | Variable names | NEVER call it |
|------|---------|---------------|---------------|
| **AnalysisContext** | Top-level analytical frame requiring separate analysis. **Being replaced by ClaimBoundary pipeline — do not use in new code.** | `context`, `analysisContext` | "scope" |
| **ClaimBoundary** | Evidence-emergent grouping of compatible EvidenceScopes post-research. Replaces AnalysisContext. See `Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md`. | `claimBoundary`, `claimBoundaries`, `claimBoundaryId` | "context", "scope" |
| **AtomicClaim** | Single verifiable assertion extracted from user input. The analytical unit in the ClaimBoundary pipeline. | `atomicClaim`, `atomicClaims` | "context", "fact" |
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

### Configuration Placement
When introducing a tunable parameter, place it in the correct tier:

| Tier | When | Examples |
|------|------|----------|
| **UCM** (Admin UI, runtime) | Anything that affects analysis behavior or quality and may need tuning without redeployment | Thresholds, weights, limits, model selection, prompt profiles, search parameters, SR weights |
| **Env var** (startup, infra) | Infrastructure, secrets, paths, concurrency — things set once per environment | `FH_ADMIN_KEY`, `FH_API_BASE_URL`, `FH_RUNNER_MAX_CONCURRENCY`, DB paths |
| **Hardcoded** (code change) | Structural constants, fixed design decisions that should not be tunable (making these tunable would compromise system correctness or create confusion) | Status enum values, API route paths, field names, confidence band boundaries (7-band scale), mathematical constants |

**Default to UCM.** If a parameter influences analysis output and you're unsure where it belongs — make it UCM-configurable. Never hardcode a value that an admin might need to tune.

UCM implementation: `apps/web/src/lib/config-storage.ts`. UCM docs: see Area-to-Documents mapping for "Configuration" in `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md` §1.2.

---

## Architecture

```
User Input → apps/web (Next.js, port 3000)    → apps/api (ASP.NET Core, port 5000)
             ├─ src/lib/analyzer/                 ├─ Controllers/ (Jobs, Analyze, Internal)
             │  claimboundary-pipeline.ts [NEW]   ├─ Services/ (JobService, RunnerClient)
             │  verdict-stage.ts [NEW]            ├─ Data/ (Entities, FhDbContext)
             │  orchestrated.ts [REPLACING]       └─ SQLite: factharbor.db
             │  monolithic-dynamic.ts             Swagger: http://localhost:5000/swagger
             ├─ src/app/api/internal/run-job/
             └─ LLM calls via AI SDK
```

### Key Files

| File | Purpose |
|------|---------|
| `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` | **[NEW]** ClaimBoundary pipeline — replaces orchestrated.ts |
| `apps/web/src/lib/analyzer/verdict-stage.ts` | **[NEW]** Verdict stage module (5-step debate pattern) |
| `apps/web/src/lib/analyzer/orchestrated.ts` | **[BEING REPLACED]** Legacy pipeline (~13600 lines). Do not extend — being replaced by ClaimBoundary pipeline. |
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
| Tests (safe) | `npm test` — runs vitest, excludes expensive LLM tests |
| Tests (expensive) | `npm -w apps/web run test:expensive` — runs ALL tests including real LLM calls |
| Test: LLM integration | `npm -w apps/web run test:llm` — real LLM calls to multiple providers |
| Test: input neutrality | `npm -w apps/web run test:neutrality` — full analysis x2 per pair |
| Test: context preservation | `npm -w apps/web run test:contexts` — full analysis runs |
| Test: adversarial | `npm -w apps/web run test:adversarial` — full analysis runs |
| Lint | `npm run lint` — placeholder (not yet configured) |

### Test Cost Warning

**`npm test` is safe** — it excludes tests that make real LLM API calls.

The following tests are **excluded from `npm test`** because they call real LLM APIs and incur Anthropic/OpenAI charges ($1-5+ per run):

- `test/unit/lib/llm-integration.test.ts` — multi-provider LLM integration
- `test/unit/lib/input-neutrality.test.ts` — full analysis x2 per neutrality pair
- `test/unit/lib/analyzer/context-preservation.test.ts` — full multi-context analysis
- `test/unit/lib/analyzer/adversarial-context-leak.test.ts` — full adversarial analysis

**NEVER run these tests routinely or as part of verification.** Only run them when:
1. Explicitly asked by the user
2. Validating a specific quality-affecting change (e.g., verdict logic, prompt changes)
3. Collecting baseline measurements for optimization work

Use `npm test` (safe) for build verification. Use `npm -w apps/web run build` to verify compilation.

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
2. **Check role and model**: Identify your current role and underlying LLM model. If either is a poor match for the task (e.g., a lightweight model assigned deep architectural reasoning, or a Technical Writer role asked to implement code), inform the Captain and propose a better-suited role, model tier, or both. Reference the Model-Class Guidelines in `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md` §6 for tier strengths.
3. **Recommend if not**: Tell the user which agent/tool to use, why, what context it needs (files to read, decisions already made), and any work completed so far.

### Role Activation Protocol

When the user starts with "As \<Role\>" or assigns you a role mid-conversation:

1. **Look up the role** in the alias table below → find the canonical role name
2. **Read required documents** listed for that role in `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md` §2 Role Registry
3. **Check learnings**: Scan your role's section in `Docs/AGENTS/Role_Learnings.md` for tips and gotchas from previous agents
4. **Acknowledge**: State your role, focus areas, and which docs you've loaded
5. **Stay in role**: Focus on that role's concerns. Flag (don't act on) issues outside your scope.
6. **On handoff/completion**: Summarize work done, decisions made, open items, files touched. If you learned something useful, append it to `Role_Learnings.md`.

**Role Alias Quick-Reference:**

| User Says | Maps To | Registry Section |
|-----------|---------|-----------------|
| "Senior Architect", "Principal Architect" | Lead Architect | §2.1 |
| "Lead Developer" | Lead Developer | §2.2 |
| "Senior Developer" | Senior Developer | §2.3 |
| "Tech Writer", "xWiki Expert", "xWiki Developer" | Technical Writer | §2.4 |
| "LLM Expert", "AI Consultant", "FH Analysis Expert" | LLM Expert | §2.5 |
| "Product Manager", "Product Owner", "Sponsor" | Product Strategist | §2.6 |
| "Code Reviewer" | Code Reviewer | §2.7 |
| "Security Expert" | Security Expert | §2.8 |
| "GIT Expert", "GitHub Expert" | DevOps Expert | §2.9 |
| "Agents Supervisor" | Captain (human role) | §2.10 |

**If the role is NOT in the table above:**
1. Tell the user which existing role is closest (if any) and ask whether to use that one
2. If no close match: read `/AGENTS.md` + `/Docs/STATUS/Current_Status.md` as baseline, then ask the user what documents and source files are relevant for this role
3. Proceed with steps 3-5 above once clarified

Full role definitions, required reading, and area-to-document mapping: `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md`

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

### Consolidate WIP Procedure

When the Captain requests "Consolidate WIP", follow this procedure to clean up `Docs/WIP/`. The goal is to keep WIP lean: only active proposals and in-progress work remain; everything else moves to ARCHIVE or gets absorbed into status docs.

**Prerequisites:** Read `Docs/WIP/README.md`, `Docs/STATUS/Backlog.md`, `Docs/STATUS/Current_Status.md`, and `Docs/ARCHIVE/README_ARCHIVE.md` before starting.

#### Step 1: Audit each WIP file

For every file in `Docs/WIP/` (excluding `README.md`):

1. **Read the file** completely.
2. **Cross-check against code and status:**
   - Has the proposed work been implemented? (Check git log, source code, Backlog "Recently Completed")
   - Is the document superseded by a newer document?
   - Are pending items still relevant?
3. **Classify the file** into one of these categories:

| Category | Criteria | Action |
|----------|----------|--------|
| **DONE** | All items implemented; no open decisions remain | Archive (Step 2) |
| **SUPERSEDED** | A newer document or implementation replaces this | Archive (Step 2) |
| **PARTIALLY DONE** | Some items done, some still pending | Update in place (Step 3) |
| **STILL ACTIVE** | Work not started or actively in progress | Keep as-is |
| **STALE** | Not referenced in 3+ months, not blocking any decision | Ask Captain: archive or revive? |

#### Step 2: Archive completed files

For each file classified as DONE or SUPERSEDED:

1. **Extract any forward-looking content** (future goals, deferred decisions, open questions) before archiving. Ask the Captain where this content should live:
   - Backlog item → `Docs/STATUS/Backlog.md`
   - Known issue → `Docs/STATUS/KNOWN_ISSUES.md`
   - Architecture note → relevant `Docs/ARCHITECTURE/` or xWiki doc
   - Future research → keep a summary in WIP or add to Backlog "Future Research"
2. **Move the file** to `Docs/ARCHIVE/`.
3. **Update** `Docs/ARCHIVE/README_ARCHIVE.md` with the new file entry.
4. **Update** `Docs/WIP/README.md`: remove the entry and add to "Cleanup History".

#### Step 3: Update partially-done files

For each file classified as PARTIALLY DONE:

1. **Mark completed items** with ✅ and a completion date.
2. **Mark remaining items** with their current status (🧭 pending decision, 🔧 in progress, 🔬 research).
3. **Remove obsolete content** (outdated approaches, rejected alternatives).
4. **Update** the file's header status line to reflect current state.

#### Step 4: Sync status documents

After processing all WIP files:

1. **Backlog.md**: Ensure "Recently Completed" reflects newly-completed work. Add/remove backlog items as discovered during audit.
2. **Current_Status.md**: Update "Recent Changes" and "Known Issues" if any WIP findings affect them.
3. **WIP/README.md**: Rebuild the "Active Future Proposals" section to match remaining WIP files. Update "Cleanup History" with today's actions.

#### Step 5: Report to Captain

Provide a summary:
- Files archived (with reason)
- Files updated (what changed)
- Files kept as-is (confirm still active)
- Content extracted and relocated (what went where)
- Items needing Captain decision (stale files, ambiguous status, content placement)

**Important:** When unsure whether a file is done or where extracted content belongs, **ask the Captain** — don't guess. This procedure is interactive, not autonomous.

---

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

Pipeline variants: Orchestrated (default, being replaced), Monolithic Dynamic (fast alternative). Monolithic Canonical was removed in v2.10.x. **ClaimBoundary pipeline** is the approved replacement — see `Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md`.

LLM Tiering: Haiku 4.5 (extract/understand), Sonnet 4.5 (verdict/context refinement).

For full feature list and known issues, see `Docs/STATUS/Current_Status.md`.

| Variable | Default | Purpose |
|----------|---------|---------|
| `FH_RUNNER_MAX_CONCURRENCY` | `3` | Max parallel analysis jobs |
| `FH_CONFIG_DB_PATH` | `./config.db` | UCM SQLite location |
| `FH_SR_CACHE_PATH` | `./source-reliability.db` | SR cache database path |

Analysis configuration (pipeline/search/calculation/SR) is managed in UCM (Admin → Config). Env vars are for infra/runtime only.
