# AGENTS.md

How AI coding agents should operate in the FactHarbor repository.
Applies to all paths unless a closer `AGENTS.md` overrides it (e.g., `apps/api/AGENTS.md`).

---

## Instruction Precedence

Repository instructions remain subordinate to system/developer instructions and the current user task. Within repository guidance, apply this order (highest first):
1. Closest path-specific `AGENTS.md` (e.g., `apps/api/AGENTS.md`)
2. Repository root `/AGENTS.md`
3. Active role file in `Docs/AGENTS/Roles/`
4. `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md` and other collaboration docs
5. Tool-specific config wrappers (`GEMINI.md`, `CLAUDE.md`, Copilot/Cursor/Cline rules)

Nested guidance specializes its area; it does not silently waive root safety or domain invariants. Resolve routine choices within existing task authority; ask the active user only if a material conflict remains.

---

## Program Constellation

FactHarbor is the public technical infrastructure in a broader research program:

> Researching how we can build a fair, stable, and sustainable society that uses new technologies responsibly.

The public project context is described in [Our AI Charter: stewardship and governance](https://github.com/robertschaub/our-ai-charter/blob/main/docs/About.md#stewardship-and-governance). FactHarbor's role is the technical layer: evidence modelling, contested-claim analysis, reasoning transparency, and verifiable reports.

Boundary rules for agents:

- Use the task's authorized repositories and read/write scope. If another is needed, ask once for its name, purpose and read/write access; continue independent work while waiting. Approval persists through task handoffs until changed; do not ask again for the same scope.
- Approved reads may include private material; access is not disclosure permission. Keep private names/paths, operational records, secrets, personal data and finance/legal/partner records out of this public repository and public artifacts.
- Public links and dependencies must use public URLs or files, never private repositories, local paths or unpublished operational context.
- Use MCP only for its identified source; availability grants no authority. If unavailable or unqualified, use authorized direct reads. Ask only for missing scope or disclosure authority.

---

## Reading and task routing

Read enough source and surrounding context to understand behavior before editing. Full-file reading is required when the change depends on the whole file, not for every task. For prompt files over 100KB in `apps/web/prompts/`, locate section boundaries and read the target section plus 20 surrounding lines; keep the working set focused even with a large context window.

Before working on any target path, all clients must read the applicable nested AGENTS.md, even when launched from the root: `apps/web/AGENTS.md` for web work and `apps/api/AGENTS.md` for API work. Check for closer instructions along the target path. These supplement the root invariants. Reference architecture/status documents are loaded only when relevant.

## Task authority and review

Use one accountable implementer with proportionate verification. Trivial fixes need no role choreography, mandatory preflight, broad test suite or completion file. Add independent review for materially risky, cross-stage, prompt/config, security or public-surface decisions, unclear root cause, repeated failed validation, or when requested. Resolve findings on evidence; unanimity and model count are not correctness tests.

Pushes, deployments, live analyses, and provider-spending operations require current authorization covering the specific action and scope. Authorization already given in the task remains valid; preparation or review alone does not grant it. Preserve existing authority for reversible work; ask only for a missing decision or scope expansion.

Strict read-only diagnosis uses existing failure output and source reads. If reproduction is needed and authorized, assign diagnosis and reproduction together with explicit writable output/cache/temp paths. Read-only sessions do not run builds, tests, bootstrap/refresh operations or recovery log writers. They return findings and recovery choices in chat for the integrator; writing/validation sessions retain their assigned recovery behavior.

---

## Fundamental Rules

### Generic by Design
- **No domain-specific hardcoding.** Code, prompts, and logic must work for ANY topic.
- **No hardcoded keywords.** No lists like `['bolsonaro', 'trump', 'vaccine']`.
- **Parameterize, don't specialize.** Use configuration over conditionals.
- **No new code for removed/replaced things.** If something has been removed, replaced, or renamed (e.g., Monolithic Canonical pipeline [removed], `ExtractedFact` → `EvidenceItem`, `fact` → `statement`), do not extend, reference, or build on it. Use only the current version.

### LLM Intelligence (MANDATORY)

All semantic decisions in the analysis codebase must use LLM intelligence: understanding, classifying, scoring, comparing, routing by meaning, entity extraction and semantic matching. Never create deterministic keyword/regex, similarity-heuristic or rule-based NLP substitutes. When existing semantic decision logic is encountered, flag it for LLM replacement; do not extend or optimize it.

Keep deterministic structural plumbing: null/empty/format/length checks, schemas/type guards, IDs/hashing/normalization/formatting, retry/timeout/concurrency and routing that does not interpret meaning.

Use intelligence efficiently: batch structured decisions, cache identical/equivalent inputs, use capable lower-cost tiers for simple work, bound prompts/outputs and avoid redundant context/reasoning. Pre-filter trivial validation deterministically.

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

### Change Approval Boundary
This approval rule applies to code, prompts, UCM/configuration, tests, validation plans, and other analysis-affecting changes:
- **Allowed without explicit Captain approval:** carefully investigated, justified, and diverse-team-reviewed changes with a concrete failure mode or quality objective and an appropriate verification plan.
- **Requires explicit Captain approval:** speculative, trial-and-error, teaching-to-test, or exploratory changes.

### Analysis Prompt Rules
These rules apply specifically to the LLM prompts used in the analysis pipeline (under `apps/web/prompts/`). Prompt edits follow the same approval boundary as code and UCM/configuration changes.
- **No test-case terms.** Prompt examples must be abstract (e.g., "Entity A did X" not "Country built industry"). This prevents teaching-to-the-test.
- **Diagnosis is not wording license.** Concrete failing analyses may be used to identify the abstract failure mechanism, but landed prompt changes must be phrased in topic-neutral terms and must not reuse trigger vocabulary merely because it appeared in the analysis that exposed the issue.
- **Do not enforce** finding ClaimAssessmentBoundaries or EvidenceScopes by using non-generic terms, date-periods, or regions. These must emerge naturally from evidence.

### Terminology — NEVER Confuse These

| Term | Meaning | Variable names | NEVER call it |
|------|---------|---------------|---------------|
| **ClaimAssessmentBoundary** | Evidence-emergent grouping of compatible EvidenceScopes post-research. The top-level analytical frame. See `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/Deep Dive/Pipeline Variants/WebHome.xwiki`. | `claimBoundary`, `claimBoundaries`, `claimBoundaryId` | "context", "scope" |
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
- **Current Captain-defined analysis inputs:**
    - `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben`
    - `Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben`
    - `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`
    - `235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.`
    - `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`
    - `O processo judicial contra Jair Bolsonaro por tentativa de golpe de Estado respeitou o direito processual brasileiro e os requisitos constitucionais, e as sentencas proferidas foram justas`
    - `Using hydrogen for cars is more efficient than using electricity`
    - `Plastic recycling is pointless`

### Failed-Attempt Recovery

A fix has **failed** when, after your change, a focused test/build fails, a live job regresses on a previously-passing input, **or you or the user judge the result worse than before** — not only red tests.

**Before your next edit, record and log one line:**
`ATTEMPT <n> · symptom: … · last-known-good: <commit/ref> · choice: keep | amend | revert | quarantine | add — because …`
then persist it in an assigned writing session: `node scripts/hooks/revert-classify.cjs --choice <choice> --symptom "<symptom>" --baseline <ref>`. A read-only reviewer returns the line in chat for the integrator instead of writing recovery state.

- **Name the last-known-good** (state before this fix chain began). Revert = restore those hunks with `Edit`; never `git reset`/`checkout` (blocked by the safety hook).
- **Revert and amend are first-class options, not fallbacks.** Undoing recent work is not a failure; it is often the lowest-net-complexity correction. State why the rejected options are worse.
- **Do not stack a new mechanism on a change that just failed** unless you state why amending or reverting it cannot carry the behavior.
- **Broaden scope only with a verifier-backed reason** — state what the failed validation showed and why the wider scope is required.
- **If ownership is unclear, ask Captain before reverting** another agent's or the user's work.

This is **bounded backtracking** — weigh undoing as seriously as adding. It is *not* blanket rollback-first.

The **`/debt-guard` skill** (`.claude/skills/debt-guard/SKILL.md`) is the activation wrapper for this rule and §Bugfix Complexity Heuristic: it fires automatically on bugfix/recovery tasks and requires a written `DEBT-GUARD` block before each edit attempt. (Restored 2026-06-12 — slim version — after pile-up recurrence; rehome carve-out exercised with Captain approval.)

### Bugfix Complexity Heuristic

For bugfixes, regressions, failing tests/builds, runtime defects, review findings, and failed-validation recovery, keep the repair path explicit but lightweight before editing:
- Identify the existing mechanism that should carry the behavior.
- Prefer amending, deleting, or quarantining obsolete or contradicted code before adding a parallel path.
- If adding a mechanism, state why existing mechanisms cannot carry it and what removes or merges it later.
- State the verifier and expected net mechanism impact.

Trivial single-site fixes can satisfy this as a short note. Unclear root cause, cross-stage behavior, prompt/config changes, or repeated failed validation need a written comparison and reviewer/debate only when that could change the implementation path.

### Pipeline Integrity
- **No stage skipping:** Understand → Research → Verdict (all required)
- **Evidence transparency:** Every verdict must cite supporting or opposing evidence items
- **Quality gates:** Gate 1 (claim validation) and Gate 4 (confidence) are mandatory
- **Evidence-weighted contestation:** Challenges to a verdict must be backed by documented evidence to count as "contested". Unsubstantiated objections (opinion, political criticism, denial without counter-evidence) are classified as "doubted" — they MUST NOT reduce a verdict's truth percentage or confidence. Only evidence-backed counter-arguments may alter verdicts. This applies to debate challenger outputs, aggregation weighting, and any future contestation logic. Existing implementation: `contestationWeights` in `aggregation.ts` (opinion=1.0, disputed=0.7, established=0.5) and `factualBasis` classification in verdict prompts.

### Report Quality Baseline Comparison

When judging analysis report quality — including `/report-review`, manual job review, regression diagnosis, "best report" selection, or release readiness — compare the target report against:
- `Docs/AGENTS/Captain_Quality_Expectations.md` for Captain intent and best comparator report IDs.
- `Docs/AGENTS/benchmark-expectations.json` for canonical inputs, accepted verdict/truth/confidence bands, latest verified observations, and rerun priority.
- `Docs/AGENTS/report-quality-expectations.json` for Q-code structural checks.
- The best usable exact/family comparator reports listed in `Captain_Quality_Expectations.md`, when available.

State whether each comparator is exact vs. variant, local vs. deployed, and current-stack vs. historical. Do not judge a report in isolation when a Captain expectation or comparator exists. If no best comparator exists, state that explicitly and do not invent one from nearby jobs.

### Report Quality & Event Communication

Before emitting/displaying a warning, ask: **Would the verdict be materially different without this event?** No: silent/info (admin only); maybe: warning at most; yes: error/severe. Severity measures verdict impact, not internal event type. Register every warning in `warning-display.ts`; do not classify inline in UI components.

| Severity | Impact and visibility |
|---|---|
| silent | None; recovered; emit no warning |
| info | None, but worth administrator tuning; admin only |
| warning | Noticeable, same verdict direction/confidence tier; user sees a low-emphasis caveat |
| error | Verdict direction or confidence tier may change; prominently visible to users |
| severe | No trustworthy report; error plus `report_damaged`, blocking user notice |

- Routine retries, fallbacks, cache misses and defaults are silent/info. Fully recovered fallbacks are silent, not even info. Only surface aggregated degradation that affects quality.
- System failures we could fix (source-provider collapse, verdict crash, budget exhaustion) must surface at warning/error/severe according to impact. Do not hide a real quality signal.
- Analytical reality (sparse/inaccessible evidence, paywalls, 404s) is info/warning, never error/severe merely because evidence is scarce. `insufficient_evidence`, `low_evidence_count`, `low_source_count`, `source_fetch_degradation` follow that distinction.
- Internal post-hoc diagnostics and heuristic consistency disagreements are info/admin-only; they do not establish a wrong verdict.
- Escalate to warning when degradation exceeds ordinary run variance and a reasonable user needs to know; to error when direction/confidence tier could change; to severe when no trustworthy report remains.
- Degradation that genuinely reduces report quality, including inadequate evidence, failed verdict generation, source-acquisition collapse or budget exhaustion, must remain visible at its appropriate level. Do not suppress it or hide it as admin-only. Frequent irrelevant warnings and missing material warnings both erode trust.

### Configuration Placement

- **UCM:** analysis behavior/quality tunables that may need adjustment without redeployment: thresholds, weights, limits, model selection, prompts, search and source-reliability settings. Default to UCM when unsure.
- **Environment:** infrastructure, secrets, paths and startup concurrency (`FH_ADMIN_KEY`, `FH_API_BASE_URL`, `FH_RUNNER_MAX_CONCURRENCY`, database paths).
- **Code:** structural constants and fixed data contracts, such as status/type keys, API paths, field names, the fixed seven-band scale and mathematical constants.

File-backed `apps/web/configs/*.default.json` defaults are authoritative. Keep `config-schemas.ts` defaults synchronized; `apps/web/test/unit/lib/config-drift.test.ts` checks drift. All tunables must appear in JSON for Admin comparison/editing. UCM implementation: `apps/web/src/lib/config-storage.ts`; relevant manuals are mapped in Collaboration Rules §1.2.

---

## Architecture references

The web UI/runner is under `apps/web/`; the ASP.NET API and SQLite persistence are under `apps/api/`. The ClaimAssessmentBoundary entry point is `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`. Read the applicable nested AGENTS.md for patterns and structure. Source search is authoritative for exact code locations; the stage indexes below are navigation aids.

---

## Commands

Run from repository root unless noted; these commands remain subject to task/state authorization.

| Action | Command |
|---|---|
| Quick start | `powershell -ExecutionPolicy Bypass -File scripts/first-run.ps1` |
| Restart / stop local services | `./scripts/restart-clean.ps1` / `./scripts/stop-services.ps1` |
| Web build | `npm -w apps/web run build` |
| Default tests | `npm test` — excludes designated real-LLM suites; inspect focused tests' state/service needs |
| Full index rebuild (integrator) | `npm run index` |
| Validation batch / compare | `npm run validate:run -- <batchLabel>` / `npm run validate:compare -- <oldDir> <newDir>` |

Dev/API commands are in their nested AGENTS.md. Lint is currently a placeholder, not verification evidence. Validation writes summaries under `test-output/validation/` and may submit live jobs.

Documentation publication is triggered by pushing `main`; CI owns `gh-pages`. Never push to `gh-pages` directly. An authorized docs redeploy can use `gh workflow run "Deploy Docs to GitHub Pages" --ref main`. A local commit is not deployment authority.

### Test Cost Warning

Select focused offline checks for the actual change. `npm test` excludes the designated real-LLM suites, but individual local tests can still contact services or write state: inspect the selected commands for restricted assignments. Broad suites/builds are not prerequisites for documentation edits.

`test:llm`, `test:neutrality`, `test:cb-integration`, `test:expensive`, calibration and live validation can call real providers. Run them only under the current action/scope authorization above; being a quality-affecting change or loading a skill does not supply that authority.

### Live Job Submission Discipline

When submitting **live analysis jobs or validation batches** after changing source code, prompts, or config behavior:
- **Commit first** before submitting a batch of jobs so each job records an associated git revision/hash that maps to the actual source under test.
- **Refresh the runtime before submission.** If the change requires a process reload to take effect, restart the affected services first. If the change is prompt/config-only and reseeding is sufficient, reseed before submitting jobs.
- **Do not submit live jobs against stale processes or stale prompt/config state.** Verification runs must use the updated source/prompt/config actually intended for evaluation.
- **Fail-fast on clear regression (cost rule).** When validating a change, if the first **3 jobs** already show a *clear* regression (a previously-passing guard input now fails, or the target metric is unambiguously worse), **stop the batch** — do not spend further jobs to confirm what is already clear. Revert/quarantine the change and classify the attempt (see *Failed-Attempt Recovery*). This does NOT apply to inconclusive or variance-dominated results, where more samples may be needed for signal.

---

## Reading .xwiki Files

Quick syntax reference: `Docs/AGENTS/Policies/xWiki_Reading.md`. Full authoring rules: `Docs/AGENTS/GlobalMasterKnowledge_for_xWiki.md`.

**Format rule:** Each document exists in exactly ONE authoritative format. If a `.md` file shows "Moved to xWiki", read the `.xwiki` file instead.

---

## Documentation Discipline

Use `/doc-guard` before adding or substantially rewriting Markdown/xWiki, explanatory sections, FAQs/templates, or reviewing documentation clutter. Write its DOC-GUARD block: reader, need, existing home, chosen option, rejected path, lean test, readability and whether `/docs-update` is needed. Prefer tightening, merging, moving or deleting before adding; preserve semantics, sources and normative controls. Use `/docs-update` when status, indexes, links, backlog/changelog or handoff references need reconciliation.

---

## Safety

- Do not access production systems or real customer data
- Do not change secrets/credentials or commit them
- Do not modify generated files or dependencies (e.g., `node_modules`) unless requested
- Avoid destructive git commands unless explicitly asked
- Do not overwrite `apps/api/factharbor.db` unless asked
- Platform is Windows. Use PowerShell-compatible commands.
- Claude hook coverage is client/version-dependent. A repository note dated 2026-05-30 reported main-session-only coverage; this is not a verified claim about every installed version. Inspect the effective supported controls for each assigned session and record unknowns. Prompt instructions, model strength, role names and task worktrees are not filesystem isolation. See `CLAUDE.md` for client-specific guidance.
- **Destructive or irreversible operations are main-session-only and MUST NEVER be delegated to a subagent or Workflow agent** — specifically `git reset --hard`, `git push --force`, `git clean -f`, `git checkout -- .`, `factharbor.db` writes, and expensive test runs (the exact set the hook guards). Read-only fan-out (e.g., the Explore agent) is inherently safe.

### Scoped Task Worktrees

Ordinary solo work retains the direct-to-`main` norm. During concurrent writing, use scoped task branches/worktrees with explicit file ownership and one designated integrator for shared writes and integration; follow [Collaboration Rules §4.3](Docs/AGENTS/Multi_Agent_Collaboration_Rules.md#43-concurrent-editing). Restricted reviewers return findings in chat. For the adopted instruction-system rollout, every concurrent writer uses the restricted-writer return-edits definition in Collaboration Rules §4.3; the integrator alone performs Git mutations and shared writes. The designation is a handoff model, not evidence of verified restrictions. Ordinary authorized worker-commit modes outside that rollout remain available. Documentation deployment remains triggered from `main` as described in §Commands.

---

## Agent Handoff & Exchange Protocol (MANDATORY)

Use `Docs/AGENTS/Policies/Handoff_Protocol.md` when transferring work or preserving significant completion evidence. It owns role activation, output tiers and the incoming-role checklist.

- For relevant non-trivial tasks, query the handoff index or the read-only knowledge preflight to locate useful prior work; skip it when history adds no value. Suggestions are advisory, and historical matches may be superseded by current decisions. Bootstrap/refresh are explicit cache mutations, reserved for an assigned writer/integrator.
- For an assigned role, read its role file and relevant learnings; do not load unrelated reference collections.
- Trivial work closes in chat. Reuse an existing task record when it preserves needed evidence; create a handoff only when continuity needs it. Restricted reviewers return findings, warnings, learnings and reviewed-content evidence in chat for the integrator to record.
- Append to `Agent_Outputs.md` when an output entry is needed; do not overwrite prior entries. `Docs/WIP/` is not a completion-output home.

## Generated indexes (do not edit manually)

The integrator owns index writes. Automatic PostToolUse Write/Edit rebuilding is removed; existing index builders and Git hooks remain. Inspect effective installed hooks and their worktree-local outputs before integration, and review generated changes.

During concurrent writing, the designated integrator serializes shared-index rebuilds and updates (§Scoped Task Worktrees); workers report needed updates instead of running them.

| Index | File | Use for |
|-------|------|---------|
| All handoffs — searchable by role + topic | `Docs/AGENTS/index/handoff-index.json` | Finding relevant prior work without scanning 193+ filenames. **Agent task history ONLY — NEVER query for source code locations; use grep for that.** |
| Pipeline stage → file → function | `Docs/AGENTS/index/stage-map.json` | Locating which file implements a given stage |
| LLM task → model tier | `Docs/AGENTS/index/stage-manifest.json` | Model tier lookups without grepping code |

If these files are absent or stale, read-only sessions report that limitation and use source reads. The authorized integrator may run `npm run index` when a rebuild is needed.

After relevant file changes, the integrator checks whether existing Git hooks already rebuilt the required index; avoid duplicate rebuilds. Workers report needed updates instead of running builders or changing shared settings.

---

## Named Workflows

Use a workflow only when it fits the current task. Shared bodies are authoritative in `.claude/skills/<name>/SKILL.md`; `.agents/skills` holds the declared Codex/Gemini discovery copies. The fourteen names are: audit, debt-guard, debate, debug, doc-guard, docs-update, explain-code, handoff, pipeline, prompt-audit, prompt-diagnosis, report-review, validate, wip-update. Binding comes from the authorized task and any explicit invocation arguments, not an assumed editor selection.

`validate` and `report-review` require explicit selection. Client invocation controls differ: see the client adapter and record actual session support; reading a skill never grants operational authority. Use independent review for material risk, not a standing committee. Failed reviews need evidence-based disposition, not a vote or unanimous quorum.

When skills change, run the read-only `node scripts/agents/check-skill-mirrors.mjs`. Bodies match with normalized line endings. For validate/report-review, equivalent flat shared headers and folded descriptions are accepted; only their `.agents` copies may add `disabled: true`. Other pairs remain identical. Claude/Codex invocation controls are checked; Gemini/Cline session state is not attested.

---

## Tool Strengths Reference

Which AI tool for which task: `Docs/AGENTS/Policies/Tool_Strengths.md`. Model-tier guidance (Opus / Sonnet / Haiku capability per task): `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md` §6.

---

## Current implementation

Use `Docs/STATUS/Current_Status.md` and current code/configuration for status, runtime defaults and model selection. Do not treat an adapter snapshot or historical handoff as the current implementation. Analysis configuration belongs in UCM; environment variables are for infrastructure/runtime settings.
