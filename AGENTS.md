# AGENTS.md

Agent guidance for all FactHarbor paths; closer `AGENTS.md` specializes it.

## Instruction Precedence

System/developer instructions and the current user task govern. Within repository guidance, highest first:
1. Closest path-specific `AGENTS.md` (e.g., `apps/api/AGENTS.md`)
2. Repository root `/AGENTS.md`
3. Active role file in `Docs/AGENTS/Roles/`
4. `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md` and other collaboration docs
5. Explicitly task-bound supplementary procedures
6. Tool-specific config wrappers (`GEMINI.md`, `CLAUDE.md`, Copilot/Cursor/Cline rules)

Nested guidance and supplementary procedures cannot waive root safety or domain invariants. Resolve routine choices within task authority; ask only for a material unresolved conflict. Instructions for another target repository still govern writes there.

## Program Constellation

FactHarbor supplies evidence modelling, contested-claim analysis, reasoning transparency and verifiable reports within [Our AI Charter's research program](https://github.com/robertschaub/our-ai-charter/blob/main/docs/About.md#stewardship-and-governance): a fair, stable, sustainable society using technology responsibly.

- Use authorized repositories and read/write scope. Ask once for any missing repository, purpose and access; continue independent work. Approval persists through handoffs until changed.
- Access is not disclosure permission. Keep private names/paths, operational records, secrets, personal data and finance/legal/partner records out of public files and artifacts. Public links/dependencies must resolve to public sources.
- MCP availability supplies no authority. Compare its source checkout/revision with the task; use authorized direct reads if unavailable, stale, mismatched or unqualified.

## Reading and task routing

Confirm scope, repository and ownership. Read source and surrounding behavior before editing; read whole files when needed. For prompts over 100KB, read the target section plus 20 surrounding lines.

All clients read target-path instructions, even from the root: `apps/web/AGENTS.md`, `apps/api/AGENTS.md` and any closer AGENTS.md. Load relevant architecture/status and task decisions; holds remain binding. Use [Task authority](#task-authority-and-review) and [Handoff Protocol](Docs/AGENTS/Policies/Handoff_Protocol.md) for review, verification and completion.

## Task authority and review

Use one accountable implementer and proportionate verification. Trivial fixes need no role ceremony, knowledge-tool preflight, broad suite or completion file. Independent review is required for analysis-affecting code, material risk, cross-stage changes, prompts, UCM/configuration, security or public surfaces, tests or validation plans affecting analysis outcomes, unclear root cause, repeated failed validation, and explicit review requests. When classification is borderline, apply the review requirement. One independent reviewer with relevant expertise is sufficient when they can assess all material risks; identify additional review needs when they cannot. Resolve findings on evidence, not unanimity or model count. This paragraph does not waive the Change Approval Boundary or action-specific authorization.

**Delegated model selection:** For an authorized agent call (Codex, Claude Code, Gemini or another client), honor explicit user model, effort and provider choices. Otherwise choose a supported model and effort suited to task complexity, risk, context, latency and authorized cost, without asking for model confirmation. State the choice and brief reason before dispatch; verify actual settings where exposed. If an agent-selected model is unsupported or unavailable for a non-quota reason, announce one suitable alternative within the same authorized provider, authentication and spending limits before retrying. Authentication or quota failures stop the call; do not switch models, accounts or providers to bypass them. Ask before changing a user-fixed selection or exceeding authority. Claude calls use subscription authentication only, never API fallback. This governs delegated calls only: it grants no delegation, access, disclosure, execution or spending permission, changes no current-session or application model/configuration, and resumes no paused work. Follow the [model-selection and invocation procedures](Docs/AGENTS/Policies/Tool_Strengths.md#model-and-effort-selection) for bounded access and result verification.

Push, deployment, live analysis and provider spending require current action/scope authorization; existing authorization persists, but preparation/review supplies none. Ask only for a missing decision or scope.

Strict read-only diagnosis reads existing sources/output; no builds, tests, bootstrap/refresh or recovery-log writes. Return findings/recovery choices in chat. Authorized reproduction assigns a writer and output/cache/temp paths; writing/validation sessions retain recovery duties.

## Fundamental Rules

### Generic by Design

Code, prompts and logic must work for any topic: no domain-specific hardcoding or keyword lists. Parameterize through configuration. Do not extend, reference or build on removed/replaced names or features (e.g. Monolithic Canonical, `ExtractedFact`, `fact`); use current `EvidenceItem`/`statement` and current features.

### LLM Intelligence (MANDATORY)

Use LLM intelligence for **all semantic analysis decisions**: understanding, classification, scoring, comparison, meaning-based routing, entity extraction and matching. Never substitute deterministic keywords/regex, similarity heuristics or rule-based NLP. Flag existing semantic heuristics for LLM replacement; do not extend or optimize them.

Deterministic structural plumbing is allowed: null/empty/format/length checks, schemas/type guards, IDs/hashing/normalization/formatting, retries/timeouts/concurrency and non-semantic routing. Batch structured decisions, cache equivalent inputs, use capable lower-cost tiers for simple work, bound prompts/outputs and avoid redundant reasoning. Pre-filter trivial validation deterministically.

### Multilingual Robustness (MANDATORY)

Analysis must work across languages, not only English. Semantic interpretation, equivalence, relevance and classification use LLMs, never language-specific regex, keywords or word-order assumptions. Preserve original language; require translation only when the feature explicitly needs it. Include multilingual validation for analysis-affecting changes to verify neutrality and stable behavior.

### String Usage Boundary (MANDATORY)

Analysis-influencing strings belong only in LLM prompt text or provider-facing web-search text. Outside these, no language-dependent strings, keyword lists or phrase regex may decide analysis meaning. All prompt/search text is UCM-managed and Admin-configurable, never hardcoded inline. Structural constants (enum/schema/status/type keys) are allowed when they define contracts, not analytical meaning.

### Change Approval Boundary

This rule applies to code, prompts, UCM/configuration, tests, validation plans and other analysis-affecting changes. Without separate Captain approval, a change must be carefully investigated and justified by a concrete failure mode or quality objective, with an appropriate verification plan and all independent review required by Task authority completed. Analysis-affecting changes always require independent review. A bounded non-analysis-affecting change outside those review triggers may use one implementer with focused verification. If required review is missing or a material finding remains unresolved, do not implement until the requirement is met. Captain may explicitly authorize a precise exception only for non-analysis-affecting review triggers where higher-priority rules allow it; analysis-affecting changes still require independent review. Speculative, trial-and-error and exploratory changes still require explicit Captain approval even after review. Benchmark failures may guide diagnosis; fixes must address general mechanisms. Tailoring prompts, UCM/configuration or analysis logic to known benchmark answers (teaching-to-test) is prohibited, including through an approval exception. Regression tests using approved examples and evidence-based review of benchmark expectations remain allowed under the existing exact-input and review rules. Exact-input, STOP, default-off, genericity and action-specific authorization requirements remain unchanged; this exception route cannot waive them.

### Analysis Prompt Rules

Pipeline prompts (`apps/web/prompts/`) follow the Change Approval Boundary.
- Use abstract examples; no test-case terms or teaching-to-test.
- Diagnosis establishes abstract failure mechanisms, not wording permission: keep fixes topic-neutral; never reuse trigger vocabulary merely because it appeared in a failing analysis.
- ClaimAssessmentBoundaries and EvidenceScopes must emerge from evidence; never force them with domain terms, dates or regions.

### Terminology — NEVER Confuse These

| Term | Meaning | Variable names | NEVER call it |
|------|---------|---------------|---------------|
| **ClaimAssessmentBoundary** | Evidence-emergent grouping of compatible EvidenceScopes post-research. The top-level analytical frame. See `Docs/site/akel-pipeline.md`. | `claimBoundary`, `claimBoundaries`, `claimBoundaryId` | "context", "scope" |
| **AtomicClaim** | Single verifiable assertion extracted from user input. The analytical unit in the ClaimAssessmentBoundary pipeline. | `atomicClaim`, `atomicClaims` | "context", "fact" |
| **EvidenceScope** | Per-evidence source metadata (methodology, temporal bounds) | `evidenceScope` | "context" |
| **EvidenceItem** | Extracted evidence from a source (NOT a verified fact) | — | "fact" (in new code) |
| **probativeValue** | Quality assessment of evidence (high/medium/low). Assigned by LLM, filtered by `evidence-filter.ts` | — | — |
| **SourceType** | Source classification (peer_reviewed_study, news_primary, etc.). Used for reliability calibration. | — | — |

EvidenceItem key fields: `statement`, `category`, `claimDirection`, `evidenceScope`, `probativeValue`, `sourceType`. See `apps/web/src/lib/analyzer/types.ts` for full schema.

### Input Neutrality
- "Was X fair?" must yield same analysis as "X was fair" (tolerance ≤4%)
- Input phrasing must NOT affect analysis depth or structure

### Captain-Defined Analysis Inputs
- **Do not invent analysis inputs.** For planning, validation, benchmark runs, live analysis, documentation, or review packets, agents MUST use only analysis inputs explicitly defined by Captain.
- **Do not paraphrase, translate, normalize, or synthesize substitute inputs.** Use the Captain-defined wording exactly as provided unless Captain explicitly replaces or extends the list.
- **If the needed analysis input is not on the approved list, stop and ask Captain** to define or approve it before proceeding.
- **Listing an input authorizes its exact wording only.** Live submission still requires current action and scope authorization under §Task authority and review.
- **Scored benchmark inputs (8):** Mechanical bands and status remain authoritative in `Docs/AGENTS/benchmark-expectations.json`.
    - `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben`
    - `Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben`
    - `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`
    - `235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.`
    - `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`
    - `O processo judicial contra Jair Bolsonaro por tentativa de golpe de Estado respeitou o direito processual brasileiro e os requisitos constitucionais, e as sentencas proferidas foram justas`
    - `Using hydrogen for cars is more efficient than using electricity`
    - `Plastic recycling is pointless`
- **Authorized unscored exact-input controls:** Use these only for byte-exact historical comparison and stability or multilingual controls. No Captain-approved verdict, truth, or confidence band exists; do not infer one from stored results or from a scored family.
    - `Plastik recycling bringt nichts`
    - `Le recyclage du plastique ne sert à rien`
    - `Ist die Erde flach?`
    - `Ist die Erde rund?`
- **Authorized dated asylum variant (unscored):**
    - `Am 31. August 2026 hielten sich 237 645 Personen aus dem Asylbereich in der Schweiz auf; das waren fast so viele wie am Ende des Zweiten Weltkrieges.`
    - This is a semantic, date, and definition variant, not an exact comparator or replacement for either scored asylum input. `237 645` is an agent-derived sum of official SEM monthly component tables, not a published monthly headline aggregate. Do not refresh, normalize, or substitute its date or number without Captain approval.

### Failed-Attempt Recovery

A fix **fails** when its focused test/build fails, a live job regresses on a passing input, or you/the user judge it worse—not only on red tests.

**Before the next edit**, record:
`ATTEMPT <n> · symptom: … · last-known-good: <commit/ref> · choice: keep | amend | revert | quarantine | add — because …`

An assigned writer persists it with `node scripts/hooks/revert-classify.cjs --choice <choice> --symptom "<symptom>" --baseline <ref>`; read-only reviewers return it in chat for the integrator.

Name the baseline before the fix chain. Restore hunks with Edit, never `git reset`/`checkout` (safety-hook blocked). Weigh revert/amend as first-class options alongside adding; explain rejected options. Do not stack mechanisms on a failed change without showing why amend/revert cannot carry the behavior. Scope expansion needs verifier-backed evidence. Ask Captain before reverting work with unclear ownership. This is bounded backtracking, not blanket rollback-first.

`/debt-guard` (`.claude/skills/debt-guard/SKILL.md`) activates this rule and Bugfix Complexity Heuristic automatically for bugfix/recovery; emit its DEBT-GUARD block before **each** edit attempt.

### Bugfix Complexity Heuristic

Before bugfix/regression, test/build, runtime, review-finding or recovery edits:
- Identify the existing mechanism that should carry the behavior.
- Prefer amend/delete/quarantine of obsolete or contradicted code before a parallel path.
- A new mechanism requires why existing ones cannot suffice and its removal/merge trigger.
- Every repair states its verifier and expected net mechanism impact.

A trivial single-site fix needs only a short note. Unclear causes, cross-stage or prompt/config changes and repeated failure need a written comparison; use reviewer/debate when it could change the repair path.

### Pipeline Integrity

- **Required stages:** Understand → Research → Verdict; no skipping.
- Every verdict cites supporting/opposing evidence; Gate 1 (claim validation) and Gate 4 (confidence) are mandatory.
- Only documented counter-evidence makes a challenge "contested" and may alter truth/confidence. Unsupported opinion, criticism or denial is "doubted" and MUST NOT reduce either. Applies to challenger outputs, aggregation and future contestation logic. Current implementation: `aggregation.ts` `contestationWeights` (opinion=1.0, disputed=0.7, established=0.5) and verdict-prompt `factualBasis` classification.

### Report Quality Baseline Comparison

For report reviews, regression diagnosis, best-report selection and release readiness, read and apply the [baseline comparison rules](Docs/AGENTS/Captain_Quality_Expectations.md#report-quality-baseline-comparison).

### Report Quality & Event Communication

For report/event implementation and review, read and apply the [event communication rules](Docs/AGENTS/Captain_Quality_Expectations.md#report-quality--event-communication), including impact-based severity and fallback/quality-loss treatment. Both relocated sections remain mandatory with root precedence.

### Configuration Placement

- **UCM:** redeployment-independent analysis/quality tunables—thresholds, weights, limits, models, prompts, search and source reliability. Default here when unsure.
- **Environment:** infrastructure/secrets/paths/startup concurrency (`FH_ADMIN_KEY`, `FH_API_BASE_URL`, `FH_RUNNER_MAX_CONCURRENCY`, database paths).
- **Code:** structural/fixed contracts—status/type keys, API paths, fields, seven-band scale, mathematical constants.

`apps/web/configs/*.default.json` is authoritative; synchronize `config-schemas.ts` defaults (checked by `apps/web/test/unit/lib/config-drift.test.ts`). Every tunable must appear in JSON for Admin comparison/editing. UCM: `apps/web/src/lib/config-storage.ts`; manuals: Collaboration Rules §1.2.

## Architecture references

The web UI/runner is under `apps/web/`; the ASP.NET API and SQLite persistence are under `apps/api/`. The ClaimAssessmentBoundary entry point is `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`. Read the applicable nested AGENTS.md for patterns and structure. Source search is authoritative for exact code locations; the stage indexes below are navigation aids.

## Commands

Run from repository root within task/state authority.

| Action | Command |
|---|---|
| Quick start | `powershell -ExecutionPolicy Bypass -File scripts/first-run.ps1` |
| Restart / stop local services | `./scripts/restart-clean.ps1` / `./scripts/stop-services.ps1` |
| Web build | `npm -w apps/web run build` |
| Default tests | `npm test` (excludes designated real-LLM suites) |
| Full index rebuild (integrator) | `npm run index` |
| Validation batch / compare | `npm run validate:run -- <batchLabel>` / `npm run validate:compare -- <oldDir> <newDir>` |

Nested AGENTS.md lists web/API commands. Lint is a placeholder, not verification. Validation writes `test-output/validation/` and may submit live jobs; quick start installs dependencies/starts services; web `postbuild` can reseed UCM. Index builders, knowledge bootstrap/refresh and Git hooks may write files/caches. Inspect effects and assign disposable state for restricted checks. Verify service ownership before stop/restart; investigate incomplete shutdown first.

Pushing `main` publishes documentation; CI owns `gh-pages`, never push there directly. Authorized redeploy: `gh workflow run "Deploy Docs to GitHub Pages" --ref main`. Local commit is not deployment authority.

### Test Cost Warning

Use focused offline checks; inspect service/write effects for restricted assignments. Docs edits need no broad suite/build. Calibration, promptfoo and live validation can call providers: current action/scope authority is required, never inferred from a quality change or skill.

### Live Job Submission Discipline

After source/prompt/config changes, **commit before live jobs/batches** to identify tested source. Before submission, restart affected processes or reseed prompt/config when sufficient; never validate stale runtime/state.

If the first **3 jobs** clearly regress (a passing guard fails or the target metric unambiguously worsens), stop, revert/quarantine and classify under Failed-Attempt Recovery. Do not spend to reconfirm clear regression; inconclusive/variance-dominated results may need more samples.

## Documentation sources

Read [Documentation guidance](Docs/DEVELOPMENT/Documentation.md); website pages use `Docs/site/`. Each edition has one editable authority. Public method, interfaces, current issues and contribution contracts remain self-contained, with source/tests/operative configuration here.

Cross-repository scope comes from the task or verified human-adopted profile. Durable notes, investigations, handoffs and unpublished prototypes use the assigned non-public home unless clearly authorized as public. Public cwd or absent confidentiality labels never select disclosure. If that home is unavailable, preserve permitted pending work outside this checkout and report the gap; never recreate private collections here. Public task records may retain concise public-safe implementation/review evidence. Missing history is not closure or permission to restart held work.

Choose the deliverable's primary checkout. Read each target's root/nested rules, use explicit cwd and verify tool source/revision. Directory access does not activate its instructions/hooks/skills; unverified required write controls require a fresh qualified target-primary session. Code worktrees do not isolate paired docs: record separate revisions and one shared-record owner. References need task authority; access is not disclosure permission.

## Documentation Discipline

Before new/substantially rewritten Markdown, explanations, FAQs/templates or clutter reviews, use `/doc-guard` and its required block. Prefer tighten/merge/move/delete; preserve semantics, sources and controls. Use `/docs-update` for affected status, indexes, links, backlog/changelog and handoffs.

## Safety

- No production-system or real-customer-data access.
- Do not change or commit secrets/credentials.
- Do not modify generated files/dependencies (e.g. `node_modules`) unless requested.
- Destructive Git commands and overwriting `apps/api/factharbor.db` require explicit authorization.
- Windows: use PowerShell-compatible commands.
- Verify each session's supported controls; record unknowns. The 2026-05-30 note about Claude main-session-only hooks is historical, not proof for the current client/version. Instructions, models, roles and worktrees are not filesystem isolation; see `CLAUDE.md`.
- **Main-session only; never delegate** destructive/irreversible operations: `git reset --hard`, `git push --force`, `git clean -f`, `git checkout -- .`, `factharbor.db` writes and expensive tests (the guarded set). Read-only fan-out is allowed.

### Scoped Task Worktrees

Solo work normally uses `main`. Concurrent writers use scoped branches/worktrees, explicit file ownership and one integrator under [Collaboration Rules §4.3](Docs/AGENTS/Multi_Agent_Collaboration_Rules.md#43-concurrent-editing). Restricted reviewers return findings in chat. During the adopted instruction-system rollout, concurrent writers return edits; only the integrator mutates Git/shared files. That designation does not prove restrictions. Other authorized worker-commit modes remain available. Deployment follows §Commands.

## Agent Handoff & Exchange Protocol (MANDATORY)

Use `Docs/AGENTS/Policies/Handoff_Protocol.md` for transfers and significant completion evidence; it owns role activation, output tiers and incoming-role checks. Read the assigned role and relevant learnings only.

For non-trivial work benefiting from history, query the scoped handoff index/read-only knowledge preflight. Results are advisory; empty public results do not imply absent task records. Only assigned writers/integrators bootstrap/refresh caches.

Close trivial work in chat; reuse task records, adding handoffs only for continuity. Restricted reviewers return findings, warnings, learnings and reviewed-content evidence in chat. Append needed `Agent_Outputs.md` entries; never overwrite history or use `Docs/WIP/` for completions.

## Generated indexes (do not edit manually)

Only the integrator serializes index writes and reviews generated diffs. Automatic PostToolUse Write/Edit rebuilds were removed; inspect remaining builders/Git hooks and local outputs first. Workers report needs without running builders or changing shared settings.

| Index | File | Use |
|---|---|---|
| Handoffs by role/topic | `Docs/AGENTS/index/handoff-index.json` | Task history only; NEVER code locations (use source search) |
| Stage → file → function | `Docs/AGENTS/index/stage-map.json` | Stage implementation |
| LLM task → model tier | `Docs/AGENTS/index/stage-manifest.json` | Model tier lookup |

For absent/stale indexes, report limits and read source. The integrator runs `npm run index` only when needed and not already rebuilt by Git hooks.

## Named Workflows

Bind workflows to the authorized task/arguments, not editor selection. Canonical bodies: `.claude/skills/<name>/SKILL.md`; declared Codex/Gemini copies: `.agents/skills`. Names: audit, debt-guard, debate, debug, doc-guard, docs-update, explain-code, handoff, pipeline, prompt-audit, prompt-diagnosis, report-review, validate, wip-update.

`validate` and `report-review` require explicit selection. Verify client-specific controls in the adapter and actual session; loading grants no operational authority. Material-risk reviews need evidence-based disposition, not votes or a standing committee.

After skill edits, run read-only `node scripts/agents/check-skill-mirrors.mjs`. Bodies match after line-ending normalization; validate/report-review permit equivalent flat/folded descriptions and `.agents`-only `disabled: true`; other pairs are identical. This checks Claude/Codex metadata, not Gemini/Cline session state.

## Tool Strengths Reference

Tool choice: `Docs/AGENTS/Policies/Tool_Strengths.md`. Model-tier guidance (Opus / Sonnet / Haiku capability per task): `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md` §6.

## Current implementation

Use current code/configuration for implementation, defaults and models; UCM controls analysis, environment variables infrastructure. Before status-dependent work, resolve the **assigned status collection** (status, backlog, issues, holds) through task scope or verified profile and read its repository guidance. Missing access never lifts holds or permits public recreation; report the gap.

All clients reload this routing before status-dependent writes; use fresh sessions to avoid stale paths. Adapters/history do not establish current implementation. Public-only work uses [project state and change authority](CONTRIBUTING.md#project-state-and-change-authority), public quality contracts and task scope.

Without a private home, record only intentionally public-safe work in public paths; keep uncertain/non-public material in authorized task/chat scope.
