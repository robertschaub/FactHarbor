---
name: report-review
description: Analyze local job reports from the most recent build/commit (HEAD by default), detect quality issues, and propose AGENTS.md-compliant fixes. Scopes to HEAD by default, or to specific job IDs / commit / input slug passed as argument. Uses RAG (static register + handoffs + machine-readable benchmark expectations, plus dynamic follow-up scans) and runs an adaptive multi-agent debate before emitting recommendations. Complements `/prompt-diagnosis` (which is narrower — prompt provenance only) by covering evidence, boundaries, verdict reasoning, and warning severity end to end.
allowed-tools: Read Glob Grep Bash Agent
---

ultrathink

Analyze local job reports for: $ARGUMENTS
(Leave blank to scan all jobs executed at HEAD.)

`$ARGUMENTS` may be: one or more `jobId`s (comma-separated), a commit SHA (`commit=<sha>`), a benchmark input slug (`input=bolsonaro-en`), a directory under `test-output/`, or empty.

---

## Non-negotiable constraints (applies to every phase and every sub-agent)

These constraints bind both this skill's analysis AND the fixes it proposes. If a recommendation violates any of them, downgrade it to `REJECTED — policy violation` and do not surface it to the user.

1. **Generic by Design** — no proposed fix may introduce domain-specific keywords, named entities, regions, or date-periods into source code or prompts. Benchmark inputs listed in `AGENTS.md §Captain-Defined Analysis Inputs` are targets of analysis, never vocabulary for prompts or code.
2. **No new deterministic text analysis** — do not propose regex, keyword lists, forbidden-term lists, similarity heuristics, or rule-based classifiers as fixes. Analysis decisions must stay in LLM calls.
3. **No string-match tests as mitigations** — do not recommend adding unit tests that grep prompt text for specific phrases, nor tests that assert specific words appear in verdicts.
4. **No deterministic verdict manipulation in source code** — do not propose post-hoc truth-percentage nudges, verdict-label overrides, or confidence clamps based on input content. Verdict shaping happens via prompt + aggregation logic that is input-agnostic, not via code paths that inspect the claim text.
5. **Strings that influence analysis live in two places only**: prompt text (under `apps/web/prompts/`, managed via UCM) and web-search query construction. Fixes that inject analysis-affecting strings anywhere else are rejected. ("Analysis-affecting" = strings that shape the LLM's reasoning input or search-provider queries — NOT log messages, error codes, warning-type identifiers, schema keys, or enum labels.)
6. **UCM is the home of tunables** — threshold, weight, and limit changes go through `apps/web/configs/*.default.json` + UCM, not hardcoded constants.
7. **Multilingual robustness** — a fix that only works for English (or any single language) is not a fix. Challenge any recommendation that implicitly assumes English word order, English keywords, or Latin script.
8. **Report Quality & Event Communication (AGENTS.md)** — severity reflects verdict impact, not internal noise. Do not propose downgrading a degrading-signal warning to hide it, and do not propose escalating a fully-recovered fallback to `warning+`.

9. **Index before scanning** — before listing or grepping `Docs/AGENTS/Handoffs/`, query `Docs/AGENTS/index/handoff-index.json` (filter by `roles` + `topics`). Read only the matched files. `handoff-index.json` covers agent task history only — for source code locations use grep, not this index.

10. **Destructive operations require Captain's permission, with two narrow pragmatic allowances.** This rule overrides any prior amendment that permitted broader autonomous action.

    **Allowed without per-run approval (skill may execute):**
    - All read operations: codebase, `apps/api/factharbor.db` read-only, `apps/web/config.db` read-only, `apps/web/debug-analyzer.log`, result JSONs, git log/show/diff/rev-parse, grep.
    - Prompt reseeds: `npm -w apps/web run reseed:prompts` — corrects active-blob drift without code or data change. **Subject to the pre-condition gate below.**
    - **ONE `/validate <family-slug>` per skill invocation**, with HARD input constraints:
      - The slug MUST exist as a key in `Docs/AGENTS/benchmark-expectations.json.families[]` (the Captain-approved benchmark set).
      - The input submitted MUST be the canonical `families[slug].inputValue`, **byte-exact** — NOT paraphrased, translated, normalized, truncated, or substituted.
      - The skill NEVER invents a new input, creates a new family on the fly, or picks "an equivalent wording". This mirrors AGENTS.md §Captain-Defined Analysis Inputs: agents do not invent inputs.
      - Cost expectation $1–5, logged in Phase 7a with family slug and observed cost band.
      - **Subject to the pre-condition gate below.**

    **Pre-condition gate (mandatory before any reseed or `/validate` execution):**

    *Motivation: before a new job submission, code and prompt state must be committed and services restarted. Validating against a dirty tree or stale active blob makes the result's provenance approximate and defeats the point of running the test.*

    1. **Git clean on analyzer/prompt/config paths.** Run `git status --porcelain apps/web/src/lib/analyzer/ apps/web/prompts/ apps/web/configs/`. The output MUST be empty. If dirty, reclassify the reseed or `/validate` as a proposal with a specific `Captain: commit changes to <paths>, then approve` note. Do NOT execute.
    2. **No `PROMPT-ROLLOUT-DRIFT` active, AND drift state is definitively established.** Phase 3h detects drift indirectly: it compares the active prompt hash in `config.db` against every in-scope report's `meta.promptContentHash`, and flags `PROMPT-ROLLOUT-DRIFT` when no match exists AND the active hash's `activated_utc` predates HEAD's prompt commits. This means: (a) if Phase 3h flagged drift → refuse; (b) if Phase 3h ran and found no drift because at least one in-scope report's `promptContentHash` matches the active hash → gate passes; (c) if scope contained no reports with a recoverable `promptContentHash` (common on first runs or after a full scope where all jobs swallowed the provenance `.catch`) → Phase 3h could not establish the negative, so this gate treats the drift state as UNKNOWN and refuses execution. In case (c), emit `Captain: confirm prompt rollout state (e.g., run reseed:prompts if recent prompt edits are unconfirmed)` and reclassify the action as a proposal. A direct `content-hash(file) == active_hash` comparison is NOT attempted because the hash is computed from the canonicalized blob via `computeContentHash` in `config-schemas.ts`, not from raw file bytes — a naive SHA-256 over the file will never match.
    3. **Reseed and `/validate` must NOT be combined in one invocation.** Service restart between them cannot be structurally verified from inside the skill. Execute a reseed, emit `Captain: restart apps/web dev server before the next skill invocation`, and stop. A subsequent `/report-review` invocation runs the `/validate` against the restarted server.

    If any gate fails, the action moves from "allowed execution" to "proposal with remediation steps" in Phase 7d. Never execute through a failed gate.

    **Require Captain approval (skill emits as a proposal in Phase 7d):**
    - Repo file writes (`Prompt_Issue_Register.md`, `benchmark-expectations.json`, `Captain_Quality_Expectations.md`, prompt files, any other).
    - Multiple `/validate` calls in one invocation OR full real-LLM suites (`test:llm`, `test:neutrality`, `test:cb-integration`, `test:expensive`).
    - Git mutations: commit, reset, rebase, checkout/switch, cherry-pick, merge.
    - Applied rollbacks — the Phase 5 `partial-rollback` / `full-rollback` / `modification` mechanisms are proposals; Captain applies.
    - Env-var or config-file changes.
    - Deployment actions: `git push`, `gh workflow run`, gh-pages writes, CI triggers, deploy-targeted builds.
    - Novel-input submission (input not byte-exactly matched to an existing family's `inputValue`). Per AGENTS.md §Captain-Defined Analysis Inputs, the skill should prefer proposing the family addition to `benchmark-expectations.json` first; Captain's approval of a novel-input `/validate` implicitly requires Captain to add the family or authorize the substitution.

    **Self-check trigger:** before reporting, verify that any `/validate` call the skill executed (not merely proposed) uses an input byte-exactly matched to an existing family's `inputValue`. Autonomous novel-input execution is always a rule-10 violation and is logged in 7a; the finding derived from it is not emitted. Novel-input *proposals* require Captain approval like any other proposal — they are not autonomously executable.

**Sub-agents spawned in Phase 4 MUST be given this list verbatim in their brief.**

---

## Lifecycle Roles

The numbered phases below are named by function; this table maps them to the analysis-lifecycle shape agents are typically briefed against (learn → analyze → decide → propose → plan → act → test → review). Use it to orient cold — then follow the phase numbers for execution.

| Lifecycle role | Skill phases | Notes |
|---|---|---|
| Learn & investigate | Phase 0 (orient/scope) + Phase 1 (load jobs) + Phase 2 (RAG corpus — static + dynamic) | Split across three phases; collectively the "investigate" step. |
| Analyze | Phase 3 (pre-3a gates, 3a–3j dimensions, post-3a gate) | Single labeled phase with 11 sub-dimensions. Note: lifecycle role "Analyze" and Phase 3's functional name "Analyze" share the word — when referencing in briefs, say "Phase 3" (phase) or "analyze step" (lifecycle role) to avoid collision. |
| Decide | Phase 4 (adaptive multi-agent debate) — with default downgrade rule applying when Phase 4 is skipped (empty panel set) | Reconciliation rule is the decision: ≥2 panels confirm AND Devil's Advocate cannot rebut. On skip, findings carry forward with confidence downgraded one tier — the skip clause itself is a decision. Lifecycle "Decide" ≠ phase name; Phase 4 is "Debate" functionally. |
| Propose | Phase 5 (proposed fixes) + Phase 6 (meta-recommendations) | Both are proposals; Phase 5 is per-finding, Phase 6 is systemic/infra. |
| Plan | Phase 5 — **Apply-order sub-step** (dependency sequencing across multi-fix runs) | Emits an explicit `Apply order:` block when multiple fixes will land together. |
| Act | Rule-10-allowed autonomous paths only: prompt reseed, single `/validate`. Everything else is Captain's step after reviewing Phase 7d. | Deliberate non-destructive posture; the skill's default is "propose, don't execute". |
| Test | Phase 3i (historical regression bisection) + Phase 3j (stability across reruns) + allowed `/validate` | Test-of-fix-after-applying happens in a future `/report-review` invocation, not within the current run. |
| Review | Mostly external — amendment cycles, cross-model adversarial review, drift-guard script. Within-run: Self-check enforces rule-10/generic/constraint compliance (guardrail, not review), and Phase 9 runs a post-execution reflection that produces learning/improvement *proposals* (not judgments on the run's analytical output). | The skill still does not judge its own analytical output within a run. Phase 9 reflects on what executing the skill revealed about the skill/expectations, which is a distinct activity from reviewing the analysis findings. |

Phase 7 ("Output format") is presentation, not a lifecycle step. Phase 8 (register update, propose-only under rule 10) is a specialized Act-with-approval path. Phase 9 (post-execution learnings and improvement proposals, also propose-only) is the internal-reflection complement to external Review — it captures skill/expectations feedback without judging the run's analysis.

---

## Phase 0 — Orient

Capture the review context once, so later phases and sub-agents share a common anchor:

```bash
git rev-parse HEAD
git log --oneline -15
git status --short
```

Record:
- `HEAD-SHA` (40-char) and `HEAD-SHORT` (7-char)
- `DIRTY?` — true if `git status` has any unstaged or untracked analyzer/prompt changes (ignore docs-only changes for this flag, but note them)
- `RECENT-COMMITS` — last 15 commit one-liners (prompt and analyzer changes get priority attention later)

**Selector validation (mandatory — runs BEFORE scope determination; abort with a clear error on any failure, do NOT proceed into phases that will feed the value into shell/git/sqlite).** `$ARGUMENTS` is user-controlled and flows into later file, git, and DB reads. Every selector token must pass its validator below before it is accepted:

- `jobId` tokens — must match `^[0-9a-fA-F]{32}$` (the SQLite `Jobs.JobId` is a 32-char lowercase hex with no dashes; reject anything else)
- `commit=<sha>` — pass `<sha>` through `git rev-parse --verify --quiet <sha>^{commit}`; reject on non-zero exit. Never substitute `<sha>` into a shell command without running this check first.
- `input=<slug>` — must appear as an exact `families[].slug` value in `Docs/AGENTS/benchmark-expectations.json`. Prefix matches resolve only if exactly one family has that prefix; otherwise stop and ask Captain.
- test-output subdirectory selector — must be a relative path that, after joining with the repo root and canonicalizing, still resolves under `<repo>/test-output/`. Reject absolute paths, `..` segments, symlinks that escape the tree, and any path that does not exist.
- `--full` / `--dry-run` — exact string match only; unrecognized flags are rejected.

If any selector fails validation, STOP with `SELECTOR-REJECTED: <which selector + reason>` and do not enter Phase 1.

Then determine the review scope from the validated `$ARGUMENTS`:
- **empty** → scope = all jobs whose `executedWebGitCommitHash` starts with `HEAD-SHA`
- **`commit=<sha>`** → scope = jobs matching that commit
- **`jobId` list** → scope = those jobs only
- **`input=<slug>`** → scope = jobs whose **`inputValue`** (the full, canonical input from the API DB — NOT the truncated `inputPreview`) exactly matches the `inputValue` keyed by that slug in `Docs/AGENTS/benchmark-expectations.json`. `inputPreview` is display-only and truncated; comparing against it silently drops long inputs (e.g., the Portuguese Bolsonaro variant at 190+ chars).
- **test-output subdirectory** → scope = all job JSONs under the validated path

If the scope ends up empty (e.g., no jobs ran at HEAD yet), surface that immediately and ask Captain whether to (a) broaden to the previous commit, (b) request a rerun, or (c) abort. **Do not silently broaden.**

---

## Phase 1 — Load jobs

Jobs live in three places. Read all three; prefer structured fields over log text.

**SQLite access — shared preamble for Phase 1a, Phase 3h, Phase 3i.1, Phase 3i.4:** every `sqlite3` invocation in this skill must fall back to Python's `sqlite3` module in read-only mode (`uri=True, mode=ro`) if the `sqlite3` CLI is unavailable. This is a known Windows/`better-sqlite3` ABI quirk on some local setups. **Never write to `factharbor.db` or `config.db` via this skill** — both are read-only data sources. If a DB is locked by the running web server (`SQLITE_BUSY`), retry once with read-only URI (`file:apps/web/config.db?mode=ro`); if still locked, record `CONFIG-DB-LOCKED` or `API-DB-LOCKED` in Phase 7a and degrade that dimension's finding confidence to `SPECULATIVE`.

**1a. API database** (authoritative for submitted jobs):
```bash
sqlite3 apps/api/factharbor.db \
  "SELECT JobId, Status, CreatedUtc, UpdatedUtc, InputValue, VerdictLabel, TruthPercentage, Confidence, GitCommitHash, ExecutedWebGitCommitHash, PromptContentHash FROM Jobs ORDER BY CreatedUtc DESC LIMIT 30;"
```
Selecting `ExecutedWebGitCommitHash` and `PromptContentHash` lets Phase 0's commit-hash scope filter operate at SQL-level without parsing `ResultJson`. `UpdatedUtc - CreatedUtc` gives runtime, which Phase 3h uses for concurrency-pressure detection.

**Note:** `analysisIssueCode` / `analysisIssueMessage` are NOT Jobs table columns — they are response-shape fields computed from `resultJson.analysisWarnings[*]` by `JobsController.cs` at read time. Extract them from the parsed `ResultJson`, not from the SQL result.

**1b. `test-output/` artifacts** — validation batches, phase runs, loose result JSONs:
```powershell
Get-ChildItem test-output -Directory |
  Sort-Object LastWriteTimeUtc -Descending |
  Select-Object -First 20 -ExpandProperty Name
```
Read the newest 2–4 directories; for each, read up to 5 job JSONs (first 2, last 2, plus one outlier by `verdictLabel` or `confidence`).

**1c. Loose repo-root result JSONs** — result/baseline JSONs created by one-off API probes, named per the Captain's working file. Pattern: `*_result.json`, `*_baseline.json` at repo root. Read whichever are in scope.

For each job, extract (field names verified against live schemas in `apps/web/src/lib/analyzer/types.ts` and `apps/api/Data/Entities.cs`):
```
TOP LEVEL (from API response, not raw Jobs row):
  jobId, inputValue (full), inputPreview (truncated), verdictLabel, truthPercentage,
  confidence, status, analysisIssueCode, analysisIssueMessage

meta.*:
  generatedUtc, executedWebGitCommitHash, promptContentHash, pipelineVariant,
  boundaryCount, claimCount, llmCalls,
  mainIterationsUsed, contradictionIterationsUsed, contradictionSourcesFound,
  evidenceBalance.{supporting, contradicting, neutral, total, balanceRatio, isSkewed},
  runtimeRoleModels (per-role model + fallbackUsed flags),
  modelsUsedAll

resultJson.*:
  languageIntent.{inputLanguage, reportLanguage, retrievalLanguages, sourceLanguagePolicy}
  analysisWarnings[*].{type, severity, message, details.stage, details.errorFingerprint, details.errorMessage}
  claimBoundaries[*].{id, name, shortName, description, methodology, geographic,      // NOTE: field is claimBoundaries, not boundaries
                      temporal, evidenceCount, internalCoherence, constituentScopes}  // per-boundary direction: derive from claimVerdicts[*].boundaryFindings[*].evidenceDirection OR evidenceItems[*] filtered by claimBoundaryId
  claimVerdicts[*].{id, claimId, verdict, truthPercentage, confidence,                // NOTE: field is verdict, not verdictLabel
                    verdictReason, reasoning, supportingEvidenceIds,
                    contradictingEvidenceIds, isContested, triangulationScore,
                    boundaryFindings}
  evidenceItems[*].{id, statement, probativeValue, sourceType, claimDirection,
                    applicability, claimBoundaryId, sourceId}                          // applicability: direct|contextual|foreign_reaction. jurisdictionMatch is a transient LLM-scoring field and is NOT persisted.
  sources[*].{id, url, category, trackRecordScore, fetchSuccess, searchQuery}    // searchQuery is the non-empty field that distinguishes researched evidence from Stage-1-seeded evidence (Q-EV6 depends on this)
  searchQueries[*].{query, iteration, focus, resultsCount, searchProvider}
```

**Note on `promptContentHash: null` on SUCCEEDED jobs:** the pipeline has a `.catch()` at [claimboundary-pipeline.ts:396-398](apps/web/src/lib/analyzer/claimboundary-pipeline.ts#L396) that swallows provenance-capture errors without failing the job. A null hash on SUCCEEDED is a provenance side-effect, NOT a verdict-failure signal. Do not use it as a primary diagnostic. Verify via `meta.evidenceBalance.total` and `meta.llmCalls` instead.

Filter to scope from Phase 0. For each in-scope job, split the commit hash on `+` to derive `COMMIT-HASH` and `DIRTY-STATE` (same convention as `/prompt-diagnosis §1c`).

Compute derived fields that Phase 3 depends on:
- `runtimeSeconds = UpdatedUtc - CreatedUtc`
- `submittedWithin5sOfOthers` — true iff another in-scope job has `|CreatedUtc - this.CreatedUtc| ≤ 5 seconds`. For scope of size 1, always false.
- `isDegenerate = (meta.evidenceBalance.total == 0) OR (meta.llmCalls < 20 AND claimCount >= 2) OR (all claimVerdicts[*].verdict == null)`

Build `TARGET-REPORTS[...]`.

**Scope caps:** if scope has more than 20 reports, auto-switch to **sampled mode**: first 5 by `CreatedUtc` ascending + last 5 by `CreatedUtc` descending + 5 outliers by `confidence` or `verdict` distance from the family's expected band (deterministic — sort by `abs(observed_truthPct - midpoint(truthPercentageBand))` descending). Record the sampling choice in Phase 7a so Captain can override with `$ARGUMENTS` (e.g. `jobId` list).

---

## Phase 2 — Build the RAG corpus (static + dynamic)

**2a. Static sources — always read in this order:**

0. `Docs/AGENTS/report-quality-expectations.json` — the **authoritative Q-code check catalog** (HF / S1 / EV / V / ST / BE / IN / WS / INF / REG categories). Load the `checks` object and the `dimensionMap`. The skill describes HOW to run each Phase; this file describes WHAT each Phase checks. For each Phase 3 dimension (and the new pre-3a / post-3a / 3j gates), the dimensionMap lists the Q-codes to run. For each Q-code, run its `structuralCheck` and apply its `onFail` guidance if the check fails. Annotation-dependent checks (those listing `annotationRequired`) are skipped silently when the corresponding `families[slug]` annotation in `benchmark-expectations.json` is absent — absence is NOT a failure. `notIncludedInSkill` documents why some canonical Q-codes (Q-AH1, Q-AH2, Q-EV3, Q-S1.2, Q-S1.4, Q-S1.5, Q-S1.7, Q-EV8) were deliberately excluded and what escalation path replaces them. If `report-quality-expectations.json` is missing, the skill falls back to the inline checks described in each Phase 3 dimension below — it remains functional but cannot pick up newly-added Q-codes.

   **Human-readable companion:** `Docs/AGENTS/Captain_Quality_Expectations.md` is Captain's one-page narrative summary of the quality bar. It is **onboarding/context only** for agents — no skill phase consumes it operationally. The JSONs (`report-quality-expectations.json` + `benchmark-expectations.json`) are the runtime authority for bands, Q-codes, and `structuralCheck` definitions. The MD is authoritative only in the narrative sense: for a human reader (Captain) deciding direction and priority. When the MD's prose disagrees with a JSON value on a band or check, update the MD to match (it is the derived view). Read the MD first for context on what families matter and what remains open; read the JSONs to run the skill.

   **Annotation-absence detection** — for annotation-dependent Q-codes (Q-S1.1, Q-S1.3, Q-V6, Q-ST5), "annotation absent" means: the key is missing from the family object OR the value is exactly `null` OR (for array-typed annotations like `anchorTokens`) the array has length 0. Empty arrays are treated as "no tokens to check" = skip silently = NOT a failure. For cross-family annotations like `crossLanguageVariantOf`, if the referenced slug is not itself in the current scope, skip the check silently (the cross-language pair cannot be evaluated from one side alone).

1. `Docs/AGENTS/benchmark-expectations.json` — machine-readable expected quality bands per benchmark family (authoritative). Load the `families` array. For each `TARGET-REPORT`, find the matching entry by `inputValue` or exact `slug`. If the caller supplied `input=<slug>` and no exact slug matches, allow a prefix match only when it resolves uniquely; if multiple families share the prefix, stop and mark the scope ambiguous. Extract `expectedVerdictLabels`, `truthPercentageBand`, `confidenceBand`, `minBoundaryCount`, `qualityStatus`, `knownOpenIssues`, `latestVerifiedJobId`. Use `noiseTolerancePct` as the run-to-run noise floor for Phase 3a comparisons. If a family has `expectedVerdictLabels: null`, set expectation to `UNKNOWN — flag for rerun (see highPriorityReruns)` rather than flagging as a regression.

   **Staleness gate (mandatory — compute for every family in scope before Phase 3a):** fetch the commit of each family's `latestVerifiedJobId` from the API DB (`ExecutedWebGitCommitHash`, stripped of any `+dirty` suffix). Count analyzer/prompt/config-touching commits between that commit and HEAD:
   ```bash
   git rev-list --count <lastVerifiedCommit>..HEAD -- apps/web/prompts/ apps/web/src/lib/analyzer/ apps/web/configs/
   ```
   If the count exceeds `expectationStalenessThreshold` (default 10 — UCM-overridable when a future `expectationStalenessThreshold` key is added to `benchmark-expectations.json` root) OR `latestVerifiedJobId` is `null` OR the commit is not present in git (`git cat-file -t` fails), mark the family as `STALE`. Phase 3a emits `RERUN-NEEDED` for STALE families instead of a regression finding. Record the staleness state (commit count) in Phase 7a so Captain can see which families have lost expectation fidelity.

2. `Docs/AGENTS/Prompt_Issue_Register.md` (if exists) — previously diagnosed prompting deficiencies with recurrence status.

3. `Docs/AGENTS/Role_Learnings.md` — filter to entries with `gotcha` or `wrong-assumption` category, or any entry naming a pipeline stage, prompt file, schema, or model route.

   `Docs/AGENTS/Skills_Learnings.md` (if it exists — created on first Captain-approved Phase 9 write) — filter to entries where `Skill: /report-review`. Read every entry — all four categories (`for-agents`, `for-captain`, `skill-improvement`, `expectations-improvement`) are in-scope for context. `for-agents` entries are the primary feed-back loop from prior runs. Different file from Role_Learnings.md: Role_Learnings is tips-per-role; Skills_Learnings is tips-per-skill-execution.

4. `Docs/AGENTS/Handoffs/` — **index-first per constraint 9**. Query `Docs/AGENTS/index/handoff-index.json` and filter entries where `roles ∩ {llm_expert, lead_developer, lead_architect, senior_developer, devops_expert, code_reviewer, agents_supervisor, unassigned}` is non-empty AND `topics ∩ {report, quality, bug_scan, analyzer, prompt, verdict, evidence, boundary, drift, rollout, concurrency, timeout} ∪ {any benchmark family slug in scope}` is non-empty. **The `unassigned` role is included deliberately** — daily bug-scan entries (e.g. `*_Unassigned_Daily_Bug_Scan_*.md`) often carry the most recent operational prior art on prompt-rollout drift and test-suite state, and excluding them hides the exact context this skill needs. Read only the matched files. If `handoff-index.json` does not exist, fall back to filename scan with the same keyword set (and note the index gap as a Phase 6 meta-recommendation).

5. `AGENTS.md §Captain-Defined Analysis Inputs` — the canonical input wording list. Any drift between a job's `inputValue` and the canonical wording is itself a finding.

6. `CLAUDE.md` — local project snapshot. If your tool exposes separate repository memory, treat it as optional context only, not as fix authority.

Extract into `KNOWN-ISSUES[id, category, scope, source, status, description]`. Prefer 10-word descriptions.

**2b. Dynamic follow-up scans — triggered by Phase 1 findings, not speculative:**

For each distinct stage, warning type, or error fingerprint present in `TARGET-REPORTS`:
- **Handoffs — index-first per constraint 9.** Re-query `Docs/AGENTS/index/handoff-index.json` with the stage name / fingerprint added to the `topics` filter from 2a. Read only the newly-matched files. Do NOT grep the `Docs/AGENTS/Handoffs/` directory directly — that violates rule 9 and was the exact self-contradiction the debate missed. Only if `handoff-index.json` is absent, fall back to a `Grep` on the directory with the stage/fingerprint as the pattern (and record the index gap as a Phase 6 meta-recommendation).
- `Grep` `Role_Learnings.md` AND `Skills_Learnings.md` (if it exists) for the stage name or fingerprint (case-insensitive). Both are single flat files, not indexed directories, so grep is the correct tool here. Skills_Learnings matches are filtered to `Skill: /report-review` entries for relevance.
- For any family in scope that has `knownOpenIssues` in `benchmark-expectations.json`, read the corresponding `latestVerifiedJobId` result JSON from `test-output/` if present — use it as the baseline comparator.

Append findings to `KNOWN-ISSUES` with `source=dynamic-scan`.

**2c. Emit the anchor table** before proceeding:
```
| ID | Category | Scope | Source | 10-word description |
```
If empty: print `KNOWN-ISSUES: empty — all findings will be tagged NEW.`

---

## Phase 3 — Analyze (main thread)

Analyze each target report across the following dimensions. Record findings but do not commit to fixes yet — fix proposals wait until after the Phase 4 debate. Track which dimensions produced findings; this gates Phase 4 spawning.

**Check catalog:** each dimension runs a set of Q-codes from `Docs/AGENTS/report-quality-expectations.json §dimensionMap`. The prose below describes the dimension's intent and the baseline structural checks; the JSON is authoritative for the full set including later-added Q-codes. Every filed finding must cite its Q-code in `FINDINGS[].qCode` so downstream panels, fixes, and register entries can trace to the canonical criterion.

**Pre-3a gates (mandatory — structural, run before any semantic dimension):**

- **Q-HF1 Runtime integrity.** `status == 'SUCCEEDED'` AND no `analysisWarnings[*].type ∈ {analysis_generation_failed, llm_provider_error, report_damaged}`. If this fails, STOP Phase 3 for this report. File as INFRASTRUCTURE (or 3h if the underlying cause is concurrency/timeout). Do NOT run semantic quality checks on a broken report — they will waste tokens on noise.
- **Q-HF4 Evidence citation minimum.** For every `claimVerdicts[i]`: `supportingEvidenceIds.length + contradictingEvidenceIds.length > 0`. A verdict with empty citedEvidenceIds is not a verdict. If Q-HF1 passed but Q-HF4 fails, investigate the verdict-generation stage — this is a structural verdict-stage defect, not an evidence-scarcity issue.

Pre-3a failures skip Phase 4 entirely (same short-circuit as 3h INFRASTRUCTURE) and go straight to Phase 5 as `stage-code-structural` or `workflow-gate` fixes.

**Post-3a gate (mandatory — runs after 3a has produced its expectation-delta):**

- **Q-HF6 Confidence publication floor.** If `confidence < 40` AND the report was published (or would be), flag MEDIUM finding. The root cause is usually visible in pre-3a (Q-HF4 failure) or 3d (clustering collapse). This gate exists to surface presentation-contract violations that lower-tier findings would otherwise obscure.

**3a. Expectation check** — using the bands from `benchmark-expectations.json` (Phase 2a source 1):
- **If the family is STALE (Phase 2a staleness gate):** emit `RERUN-NEEDED` and STOP — do not file a regression. The stored observation predates too many analyzer/prompt-touching commits to be a valid comparison.
- verdict direction inverted vs. `expectedVerdictLabels`
- `truthPercentage` outside the `truthPercentageBand` by more than `noiseTolerancePct`
- `confidence` outside the `confidenceBand` by more than `noiseTolerancePct`
- `boundaryCount` below `minBoundaryCount` (skip if `minBoundaryCount: null`)
- If `qualityStatus` is `IMPROVED-NOT-CLOSED` or `INFERENTIAL`, note the known open issue before flagging — do not file a regression for a known-open pattern
- If `expectedVerdictLabels: null`, emit `RERUN-NEEDED` rather than a regression finding

**3b. Input integrity** — compare `inputValue` against the Captain-defined list in `AGENTS.md §Captain-Defined Analysis Inputs`. Paraphrase, translation, normalization, or truncation is a finding.

**3c. Evidence health**:
- `probativeValue` distribution: high/medium/low mix — flag if `low` dominates (>60%)
- `sourceType` mix: `peer_reviewed_study` / `news_primary` / `opinion` ratio appropriate for the claim domain
- `claimDirection` distribution: supporting/contradicting/neutral balance vs. `evidenceBalance.isSkewed`
- Evidence language vs. `languageIntent`: foreign-jurisdiction evidence on a jurisdiction-specific claim is a known contamination pattern; cross-reference `benchmark-expectations.json §knownOpenIssues` before filing as new

**3d. Boundary clustering sanity**:
- Boundaries correspond to meaningfully different claim assessments, or are they duplicates / near-duplicates / evidence-starved?
- Compare `boundaryCount` against `minBoundaryCount` and against the narrative in `benchmark-expectations.json §qualityStatusNote`

**3e. Verdict reasoning trace** — read each `claimVerdicts[*].verdictReason`. Flag:
- reasons that cite evidence not present in the boundary's evidence set
- reasons that contradict the final `verdictLabel`
- reasons that treat opinion/disputed evidence as if `contestationWeights` aggregation applied — check `aggregation-stage.ts` if needed (structural read, no edits)

**3f. Warning severity (AGENTS.md §Report Quality & Event Communication)**:
- `warning`+ for an event that fully recovered via fallback → flag as over-escalation
- `info`/`silent` for a degrading signal that would change confidence tier → flag as under-escalation
- unregistered warning types (not in `warning-display.ts`) → schema-drift finding

**3g. Cross-report patterns (Q-SYS1 re-tagging)** — this dimension does not run its own structural check; it is a re-classification pass over findings already filed by 3a–3f, 3h, 3i. Algorithm:

1. Cluster findings across reports by `(qCode, rootCauseId)`. Two findings from different reports with the same qCode AND same rootCauseId are the same underlying concern.
2. If a cluster has ≥2 reports → emit one new FINDING with `type=SYSTEMIC`, `qCode` = the cluster's qCode, `rootCauseId` = the cluster's shared rootCauseId, `contributingQCodes` = distinct qCodes from the members (usually just one). The original per-report findings remain on record, linked by `rootCauseId`.
3. If reports share a `rootCauseId` across DIFFERENT qCodes (e.g., Q-V1 and Q-V_REASON_CITATION pointing at the same reasoning defect), emit the SYSTEMIC finding with the highest-severity qCode as primary; on severity tie, lexicographic ordering of the qCode strings. List all contributors in `contributingQCodes`.
4. Findings that don't cluster remain `REPORT-SPECIFIC`.

Systemic findings take priority in the fix list. Infrastructure findings from 3h may still participate in 3g clustering (two reports hitting the same `Q-INF_CONCURRENCY` signature is itself a systemic signal) but they do not route to Phase 4 regardless.

**3h. Systemic health & concurrency-induced failure (mandatory — always run):**

Before filing any finding against a prompt or stage, rule out infrastructure causes:

- Concurrency-induced collapse: if 2+ reports in scope satisfy all of: meta.evidenceBalance.total equals 0, meta.llmCalls under 20, and submission times within 5 seconds of each other, file as INFRASTRUCTURE-CONCURRENCY, not as a regression. Fix mechanism: workflow-gate (serialize submissions) or env-var change (reduce FH_RUNNER_MAX_CONCURRENCY and restart the runner). Per AGENTS.md §Configuration Placement, FH_RUNNER_MAX_CONCURRENCY is an env-var infrastructure knob, NOT a UCM-tunable — do not propose ucm-config for it.
- LLM-timeout pressure: if any scoped report has isDegenerate, run a ripgrep against apps/web/debug-analyzer.log for Fix3 errors, LLM timeouts, TPM fallbacks, and 429 responses. Over 50 matches on the execution date means weight findings toward infrastructure. Over 200 per day is a Phase 6 meta-recommendation on its own. If the log file is missing or rotated, record LLM-timeout rate: unknown in Phase 7a and proceed without this signal (do not block other 3h checks).
- Model fallback cascade: if meta.runtimeRoleModels has fallbackUsed true for verdict or reconciler, note it in the report block. The verdict came from the fallback model, not the configured one, so the quality baseline shifts.
- Prompt rollout drift: query apps/web/config.db for the active claimboundary prompt hash and activated_utc. If the active hash does not match any in-scope meta.promptContentHash and the activated_utc predates HEAD's prompt commits, flag PROMPT-ROLLOUT-DRIFT. Fix mechanism is prompt-rollout (reseed), never a prompt edit.

**3i. Historical regression analysis (conditional — run when 3a filed a regression finding against a family whose `qualityStatus` is `SOLVED`, `SOLVED-MAIN-BLOCKER`, `SOLVED-VISIBLE-CONTAMINATION`, `PARSE-FAILURE-FIXED`, or `CONFIRMED-ON-CURRENT-HEAD`. Skip for families whose status indicates they are not yet proven at HEAD — there is nothing to regress from.):**

Goal: find whether a prior run of the same input scored better, identify the commit(s) that could explain the drop, and assess whether rollback is a viable fix class.

All rollback proposals inherit non-negotiable constraints 1–9. A rollback to wording that violates rule 1 (e.g., reintroduces benchmark-specific vocabulary) is REJECTED regardless of quality delta — forward-fix is required instead.

**3i.1. Find prior runs of the same input.** Exact match on `InputValue` (case-sensitive, full string):
```bash
sqlite3 apps/api/factharbor.db \
  "SELECT JobId, CreatedUtc, VerdictLabel, TruthPercentage, Confidence, ExecutedWebGitCommitHash, PromptContentHash
   FROM Jobs
   WHERE InputValue = ? AND Status = 'SUCCEEDED'
   ORDER BY CreatedUtc DESC LIMIT 20;"
```
Also scan `test-output/` for result JSONs whose top-level `inputValue` matches exactly; read matched files for their `meta`.

**3i.2. Rank prior runs (deterministic rubric — structural, no LLM).** For each prior job compute:
```
bench-score =
  +2 if verdictLabel in expectedVerdictLabels
  +1 if truthPercentage within truthPercentageBand (±noiseTolerancePct)
  +1 if confidence within confidenceBand (±noiseTolerancePct)
  +1 if boundaryCount >= minBoundaryCount
  +1 if evidenceBalance.total > 0
  +1 if not isDegenerate
```
Use bands from `benchmark-expectations.json` for the matching family. `lastGoodJob` = highest-scoring prior run. If no prior run beats the current `TARGET-REPORT`, emit `NO-PRIOR-BETTER` and exit 3i for this input — there is no historical regression to analyze.

**3i.3. Identify the change window.** `lastGoodCommit` = `lastGoodJob.executedWebGitCommitHash` stripped of any `+dirty` suffix. Enumerate commits that touched analysis-relevant paths:
```bash
git log --oneline <lastGoodCommit>..HEAD -- apps/web/prompts/ apps/web/src/lib/analyzer/ apps/web/configs/
```
Filter out doc-only and test-only commits. Record `REGRESSION-WINDOW` (list of candidate commits).

**3i.4. Prompt-blob diff (only if prompt files are in the window AND both hashes are recoverable).** Retrieve both blobs from `config.db`:
```bash
sqlite3 apps/web/config.db "SELECT content FROM config_blobs WHERE content_hash='<lastGoodJob.PromptContentHash>'"
sqlite3 apps/web/config.db "SELECT content FROM config_blobs WHERE content_hash IN (SELECT active_hash FROM config_active WHERE config_type='prompt' AND profile_key='claimboundary')"
```
Diff by rendered section. Focus on sections named in 3a/3e findings. If `lastGoodJob.PromptContentHash` is null or the blob is not in the DB, fall back to `git show <lastGoodCommit>:apps/web/prompts/claimboundary.prompt.md` as an approximation (note `COMMIT-APPROXIMATE` in the finding).

**3i.5. Bisection guidance (no auto-bisection).** If `REGRESSION-WINDOW` has >3 commits, recommend `/validate <family-slug>` at the midpoint in Phase 7f. Never auto-run bisection — the $1–5 cost per real-LLM run requires Captain authorization.

**3i.6. Rollback feasibility classification.** For each implicated commit, assess:
- Does the change touch sections used by OTHER families in `benchmark-expectations.json §families`? (structural check — grep the implicated section for entity-neutral patterns that other families would match)
- Is the commit single-concern (one diff hunk) or bundled (multiple hunks)?
- Does the wording delta, reverted, pass rule 1 (Generic by Design)?

Classify each candidate rollback-target as one of:
- `SAFE-FULL-ROLLBACK` — single-concern commit, touches only the regression family's codepath, reverting passes rule 1
- `PARTIAL-ROLLBACK` — revert a specific section only; cite the exact section; other sections of the commit stay
- `MODIFICATION` — the direction of the change was correct but the specific wording broke something; propose a targeted re-edit that keeps the intent and passes rules 1 + 7
- `NOT-ROLLBACKABLE` — entangled with other families or with structural code; forward-fix required via generic prompt clarifier or UCM

Record:
```
REGRESSION-FINDINGS[
  finding-id, inputHash (first-16 chars of sha256(inputValue)),
  currentJob, lastGoodJob, benchScoreDelta,
  regressionWindow (commits),
  promptDiffSummary (sections differing, or NO-PROMPT-DIFF, or COMMIT-APPROXIMATE),
  rollbackClass (SAFE-FULL-ROLLBACK | PARTIAL-ROLLBACK | MODIFICATION | NOT-ROLLBACKABLE),
  rollbackTarget (commit:file:section or "none — forward-fix required")
]
```

Record:
```
FINDINGS[id, type=REPORT-SPECIFIC|SYSTEMIC|INFRASTRUCTURE|REGRESSION|STABILITY, dimension=pre-3a|3a–3j|post-3a, severity,
         qCode (required — the Q-code from report-quality-expectations.json that produced this finding. For 3g cross-report tagging, inherit the qCode from the highest-severity contributing dimension; on severity tie, use lexicographic ordering of the Q-code strings (Q-BE1 before Q-EV5 before Q-V1); list every contributing dimension's qCode in `contributingQCodes`. For multiple Q-codes firing on the same evidence in one dimension, file one FINDING per Q-code and set a shared `rootCauseId` so Phase 5 can collapse related fixes.),
         rootCauseId (optional — deterministic string shared across findings with the same underlying cause; format: `<first-firing-qCode>-<8-char-hash(evidence values)>`; Phase 5 uses this to group fixes, Phase 8 Check 5 uses it for near-duplicate word-overlap scoring),
         contributingQCodes (optional array — populated on SYSTEMIC and STABILITY findings when 3g/3j re-tag across multiple primary qCodes; Phase 4 Devil's Advocate reads this to assess whether the fix must cover all contributors or just the primary),
         confidence=CONFIRMED|INFERRED|SPECULATIVE,
         evidence (exact field values + command output for 3h/3i/3j),
         cross-ref (KNOWN-ISSUES id or NEW),
         regressionLink (id of REGRESSION-FINDINGS entry, if 3i fired)]
```

Also record which dimension letters (pre-3a, 3a–3j, post-3a) have findings — the **active dimension set** fed to Phase 4. Pre-3a gate failures (Q-HF1, Q-HF4) and dimension 3h `INFRASTRUCTURE` findings SKIP Phase 4 and go straight to Phase 5 as `workflow-gate`, `stage-code-structural`, or `env-var-change` fixes (per AGENTS.md §Configuration Placement — concurrency knobs are env-var, NOT ucm). Dimension 3i `REGRESSION` findings are passed to the Regression-Rollback Reviewer in Phase 4. Dimension 3j `STABILITY` findings have no dedicated panel — route Q-ST3/Q-ST4 to Evidence & Boundary Reviewer, Q-ST1/Q-ST2/Q-ST6/Q-ST5 to Verdict Reasoning Reviewer.

---

## Phase 4 — Adaptive multi-agent debate

Spawn only the sub-agents whose dimension has findings. Do not spawn a panel for a dimension with no Phase 3 findings.

**Anti self-eval bias (mandatory):** per LLM Expert Role_Learnings ("LLM self-eval bias"), LLMs rate same-family output higher on correlated dimensions. Every panel below MUST lead with structural checks (count-based, schema-based, cross-reference checks) before any subjective evaluation. Panels cite observed values, not impressions.

**Panel map — spawn only active panels, in a single parallel message:**

| Panel | Active when | Structural checks (cite values) | Subjective lens (only after structural) | Subagent type |
|---|---|---|---|---|
| Prompt Genericity Reviewer | 3a, 3c, or 3e has findings AND at least one candidate fix would touch `apps/web/prompts/*` | (a) Does proposed wording contain any token from AGENTS.md Captain-Defined Analysis Inputs? (b) Does it cite a named entity, region, or date-period? (c) Does it rely on English-only idioms or word-order? | Is the wording clearer or stabler than current text without adding specificity? | `Explore` |
| Evidence & Boundary Reviewer | 3c or 3d has findings AND 3h did NOT file INFRASTRUCTURE-CONCURRENCY | (a) evidenceItems.length vs sources.length ratio; (b) claimDirection balance; (c) applicability distribution; (d) boundaryCount vs minBoundaryCount; (e) per boundary: evidenceScopeIds.length greater than 0? | Do boundary labels reflect analytically distinct frames, or near-duplicates? | `general-purpose` |
| Verdict Reasoning Reviewer | 3e has findings | Per claimVerdicts[i]: (a) does verdictReason reference any evidence ID NOT in supportingEvidenceIds union contradictingEvidenceIds? (b) does truthPercentage direction match the verdict label (FALSE should be under 50)? (c) is isContested=true present but reasoning does not address counter-evidence? | Does the reasoning engage the strongest counter-evidence, or dismiss it? | `general-purpose` |
| Warning Severity Reviewer | 3f has findings | (a) Is each warning type registered in warning-display.ts? (b) Any severity at warning or above for a fully-recovered fallback event (AGENTS.md severity table)? (c) Any info/silent for a confidence-tier-changing degrader? | Would a non-technical reader correctly prioritize these warnings? | `general-purpose` |
| Regression-Rollback Reviewer | 3i has findings (REGRESSION-FINDINGS is non-empty) | (a) Does `lastGoodJob` actually score higher on the bench rubric (recompute and cite)? (b) Does `regressionWindow` contain a commit that touched the implicated prompt section or stage file? (c) For each proposed `rollbackTarget`: would reverting it affect any OTHER family's qualityStatus? (grep the reverted section for neutral patterns that match other families' inputs) (d) Does the reverted wording pass rule 1 (no benchmark-specific vocabulary) and rule 7 (multilingual)? | Among candidate rollback targets, which one is most surgical — minimum diff, maximum regression-fix coverage? Or does the analysis point to MODIFICATION rather than revert? | `general-purpose` |
| Devil's Advocate | always (when Phase 4 spawns at all) | (a) Each fix passes the Generic Test (helps inputs unlike the failing one)? (b) Any family in benchmark-expectations.json close enough to the fix's target behavior that it could regress? (c) Cheaper mechanism (UCM tunable, workflow gate) for the same outcome? (d) If 3i proposed a rollback, is there a forward-fix that gets the same effect without reverting? | Is the panel's "finding" actually correct behavior Captain would want preserved? | `general-purpose` |

**Sub-agent brief template — use verbatim for each spawned panel. Fill only the `<<...>>` placeholders.**

```
You are <<PANEL NAME>> for /report-review on FactHarbor. You have no memory of prior runs.

NON-NEGOTIABLE CONSTRAINTS — cite rule number if rejecting anything:
- Rule 1 (Generic by Design) VERBATIM: <<paste constraint 1>>
- Rule 2 (No new deterministic text analysis) VERBATIM: <<paste constraint 2>>
- Rule 7 (Multilingual robustness) VERBATIM: <<paste constraint 7>>
- Rules 3, 4, 5, 6, 8, 9 — SUMMARY (cite rule number when rejecting):
  3 = no string-match tests as mitigations
  4 = no deterministic verdict manipulation in source code
  5 = analysis-affecting strings live only in prompts or web-search queries
  6 = UCM is the home of tunables (not hardcoded)
  8 = warning severity reflects verdict impact, not internal noise
  9 = index-first for handoff scans, not directory grep

CONTEXT BUNDLE (authoritative; do not re-read files this summarizes):
- HEAD: <<sha>> | DIRTY: <<bool>>
- TARGET-REPORTS (compact table):
  jobId8 | slug | verdict | truth | conf | isDegenerate | llmCalls | evidenceTotal
  <<rows>>
- KNOWN-ISSUES anchor (Phase 2c):
  <<table>>
- Findings assigned to you:
  <<for single-dimension panels: subset of FINDINGS matching this panel's "Active when">>
  <<for Devil's Advocate: the full set of surviving findings from all other active panels plus each panel's [FIX <1..3>] headlines — no dimension filter>>
- Files you may open (bounded; do not wander):
  <<panel allowlist from Panel Allowlists table below — do not read anything else>>

YOUR TASK — structural checks FIRST (anti self-eval bias):
1. Run the structural checks from your panel row verbatim. Cite values, not impressions.
2. Confirm or reject each assigned finding. One of: CONFIRM, REJECT(rule#), REFRAME(proposed wording).
3. Propose up to 3 safe fix directions (headlines, not full specs). Mark each with its mechanism.
4. Total output at most 300 words. No hedging. No defense against Devil's Advocate.

RETURN FORMAT (strict — main thread parses by line prefix):
[STRUCTURAL] <one line per check with value or PASS>
[FINDING <id>] CONFIRM | REJECT <rule#> | REFRAME — <one-sentence reason>
  rootCauseId: <unchanged | NEW if REFRAME changes the underlying cause>   # MANDATORY on REFRAME; CONFIRM/REJECT inherit from the main-thread FINDING record
[FIX <1..3>] <mechanism> — <one-sentence direction>
[NEW] (optional) id=<id> qCode=<Q-code from report-quality-expectations.json, or Pcode P1-P12 if the finding maps to the /prompt-diagnosis P-code taxonomy> severity=<...> confidence=<...> observation=<...> root-cause=<...> cross-ref=<...>
```

**Panel Allowlists (canonical — the main thread fills `<<panel allowlist>>` from this table):**

| Panel | May open |
|---|---|
| Prompt Genericity Reviewer | `apps/web/prompts/*.prompt.md`, `AGENTS.md §Captain-Defined Analysis Inputs` |
| Evidence & Boundary Reviewer | in-scope `ResultJson` slices already in the context bundle; `apps/web/src/lib/analyzer/evidence-filter.ts` (read-only) |
| Verdict Reasoning Reviewer | in-scope `ResultJson.claimVerdicts` slices from the context bundle; `apps/web/src/lib/analyzer/aggregation-stage.ts` (read-only) |
| Warning Severity Reviewer | `apps/web/src/components/warning-display.ts` (or equivalent path); `AGENTS.md §Report Quality & Event Communication` |
| Regression-Rollback Reviewer | `apps/web/prompts/claimboundary.prompt.md` at HEAD and at `<lastGoodCommit>`; `git log`/`git show` output from Phase 3i.3-3i.4 already in the context bundle; `Docs/AGENTS/benchmark-expectations.json` families array |
| Devil's Advocate | context bundle only (no file reads — argues from panel outputs) |

**Exit clause — empty panel set:** if Phase 3 produced findings but no dimension maps to a panel (e.g., only 3b input-integrity or 3g cross-report-tagging findings), Phase 4 is SKIPPED entirely. All Phase 3 findings carry forward to Phase 5 with `confidence` downgraded one tier (CONFIRMED→INFERRED, INFERRED→SPECULATIVE) to reflect the absence of cross-panel confirmation. Record the skip in Phase 7a as `Phase 4: skipped — no panel-mapped findings`.

**Debate reconciliation (main thread):**
```
Finding | Panel-A | Panel-B | ... | Devil's Advocate | Verdict
```
A finding survives only if **≥2 active specialist panels confirm** AND Devil's Advocate cannot rebut with a concrete regression risk. Rebutted findings are downgraded to `SPECULATIVE` or dropped. Do not defend against the Devil's Advocate in the user-facing report — reframe or drop.

---

## Phase 5 — Proposed fixes (constrained to allowed mechanisms)

Every fix proposal MUST declare its mechanism and pass the constraint gate.

**Allowed mechanisms:**

| Mechanism | When | Constraint reminder |
|---|---|---|
| Prompt edit (generic wording) | Instruction ambiguity, missing constraint, insufficient scaffold | Rule 1: no benchmark terms, entities, regions, dates. Rule 7: works in every language the pipeline supports. |
| UCM config change | Threshold, weight, model-route, limit tuning | Update `apps/web/configs/*.default.json` AND `config-schemas.ts` in sync; drift verified by `config-drift.test.ts` |
| Stage code — structural only | Schema mismatch, retry/timeout, null-guard, warning registration | Rule 2: no analytical decision logic. LLM call stays as the decision point. |
| Workflow gate | Human-in-loop quality check, pre-merge benchmark rerun, rollout verification, serialize concurrent submissions | Documented procedure; no code change |
| Prompt rollout action | Active blob differs from current file (see 3h prompt rollout drift) | `npm -w apps/web run reseed:prompts` or full build |
| Env-var change | Infrastructure-tier knob per AGENTS.md §Configuration Placement (FH_RUNNER_MAX_CONCURRENCY, FH_ADMIN_KEY, FH_API_BASE_URL, FH_CONFIG_DB_PATH, FH_SR_CACHE_PATH) | Propose the new value + restart step as a documented procedure. Do NOT put it in UCM — these values live in `.env.local` / process environment and take effect only on restart. |
| Data update (expectations file) | A rerun verified (or refuted) a family's quality at HEAD; new observation replaces or augments `latestVerifiedJobId`/`latestObserved`; bands widen to include the new point only when inside `noiseTolerancePct` | Update `Docs/AGENTS/benchmark-expectations.json` (and sync `Captain_Quality_Expectations.md` prose). **Emit as proposal per rule 10**; Captain approves before the skill writes. Do NOT change `qualityStatus` from the same-run data that triggered the update; qualityStatus changes require direct rerun confirmation AND Captain approval. Rule 2 not violated — data file, no analytical logic. |

**Rejected mechanisms (never propose):**
- Hardcoded keyword list in code — rules 1+2
- Regex guard on LLM output interpreting meaning — rule 2
- Post-hoc truthPercentage adjustment based on input content — rule 4
- Unit test asserting specific words in prompt or verdict — rule 3
- Forbidden-term list or banned-phrase filter — rules 1–3

**For each surviving finding:**
```
[F##] <severity> | <SYSTEMIC|REPORT-SPECIFIC|INFRASTRUCTURE|REGRESSION> | dim <3x>
Mechanism:          <prompt-edit | ucm-config | stage-code-structural | workflow-gate | prompt-rollout | data-update | partial-rollback | full-rollback | modification>
Target file/path:   <specific path or commit:file:section for rollback mechanisms>
Change (specific):  <exact generic wording, config delta, structural edit, or revert-section spec>
Constraint gate:    PASS — <which rules apply and why this passes them>
Generic test:       <yes/no + reasoning — does this help inputs unlike the failing one?>
Regression risk:    <families from benchmark-expectations.json that could shift, or "none expected">
Expected outcome:   <behavioral change in concrete terms>
Cross-ref:          <KNOWN-ISSUES id or NEW>
Rollback-from:      <commit sha + section/subset, or "n/a — forward-fix">    # populated iff mechanism is *rollback or modification
Rollback-class:     <SAFE-FULL-ROLLBACK | PARTIAL-ROLLBACK | MODIFICATION | NOT-ROLLBACKABLE | n/a>
LastGood-job:       <jobId of prior better run, or n/a>                        # so Captain can inspect the before/after
```

**Rollback mechanism guidance:**
- `partial-rollback` is the preferred form when Phase 3i classified the target as `PARTIAL-ROLLBACK`. Specify the exact section, not the whole commit.
- `full-rollback` is only used for `SAFE-FULL-ROLLBACK` targets — single-concern commit, no cross-family impact.
- `modification` is for `MODIFICATION` targets — the direction of the change was correct; propose revised generic wording that preserves the commit's intent and fixes the regression. Must pass rule 1 + rule 7.
- `NOT-ROLLBACKABLE` targets do NOT emit a rollback fix. Instead, propose a forward-fix under `prompt-edit` or `ucm-config` mechanisms with `Rollback-from: n/a`.

Order: PHASE-BLOCKER → HIGH → MEDIUM → LOW, then CONFIRMED before INFERRED, then SYSTEMIC before REPORT-SPECIFIC.

**rootCauseId grouping (mandatory post-ordering pass):** after ordering, collapse fix blocks that share `rootCauseId`. The surviving block lists the union of the group's `qCode`s in a `groupedQCodes` line and names the group's highest-severity fix as primary; secondary qCode-linked blocks are listed beneath under `Related fixes:` without repeating the full template. This prevents the fix list from showing the same underlying fix three times because Q-V1, Q-V_REASON_CITATION, and Q-V_LABEL_DIRECTION all fired on the same verdict defect. A `rootCauseId` that is absent (single-Q-code finding) is never grouped.

**Apply-order planning (mandatory for multi-fix runs — skipped when only one fix block survives):**

After severity ordering and `rootCauseId` grouping, emit an explicit application sequence. Severity ordering is not sufficient on its own: a high-severity prompt edit may depend on a lower-severity stage-code null-guard landing first, and sequencing errors create half-applied states that the next `/report-review` invocation will misdiagnose as regressions.

```
Apply order:
  1. <F##> | <mechanism> — <one-line reason this goes first, including any upstream dependency it satisfies>
  2. <F##> | <mechanism> — <one-line reason, including any dependency on step 1>
  ...
  Independent set: <F##, F##, ...> (no cross-fix dependencies; any order works)
```

**Sequencing rules (rules compose — when multiple apply, emit the transitive chain; canonical multi-rule example is the reseed→validate→data-update cascade):**

1. **Pre-condition fixes first.** All sub-clauses below describe REQUIRED-before orderings:
   - A `prompt-rollout` (reseed) fix MUST come before any `/validate`-based verification of the reseeded prompt.
   - A `stage-code-structural` fix that changes a schema field MUST come before any `prompt-edit` that depends on the new field.
   - A fix that registers a new warning type in `warning-display.ts` MUST come before any fix that begins emitting that warning — otherwise the emission lands as an unregistered warning and hits the exact Q-WS2 schema-drift violation Phase 3f exists to catch.
   - A `config-schemas.ts` (Zod) edit MUST come before any `ucm-config` change to `apps/web/configs/*.default.json` that introduces a new key — otherwise `config-drift.test.ts` trips on the unrecognized field.
   - When the proposal path for a novel-input `/validate` is family-addition (the recommended route per AGENTS.md §Captain-Defined Analysis Inputs), the `benchmark-expectations.json` family-addition MUST come before the `/validate`. Alternative path: per rule 10 Captain may directly approve a novel-input `/validate` without first adding the family (an explicit substitution authorization); in that case this sub-clause does not apply and the proposal should state that Captain's direct authorization bypasses the family-addition step. Default to the family-addition path when the proposal is for a repeatable benchmark family.
2. **Data-after-evidence.** A `data-update` to `benchmark-expectations.json` or `Captain_Quality_Expectations.md` comes AFTER the rerun that produced its observation. Exception: pre-populating from a prior verified job Captain already holds and has referenced in the proposal — explicitly cite the source jobId in the proposal when taking this path.
3. **Rollback before forward-fix when both target the same defect.** If a `partial-rollback` and a follow-up `prompt-edit` both target the same regression, apply the rollback first (restore last-known-good), then the forward-fix (additive over a clean base). Captain may re-evaluate whether the forward-fix is still needed after the rollback — the skill does not presume it.
4. **rootCauseId groups SHOULD apply atomically.** A group's primary and `Related fixes:` are most safely applied together. If Captain splits the group across approval cycles, the skill flags it in Phase 7d as `PARTIAL-GROUP-APPLY` risk with explicit "this leaves the pipeline in a half-state" wording — the skill cannot enforce atomicity at execution (that is Captain's step per rule 10), but it surfaces the risk.
5. **No cross-fix dependencies → no order.** Two fixes are "independent" iff: (a) no shared target file-and-section, (b) no shared pre-condition action (e.g., both requiring the same reseed is NOT independent — they share that pre-condition), (c) no shared `rootCauseId`. When ALL proposed fixes are independent, emit the block as a single line: `Apply order: Independent set: F01, F02, F03 — no cross-fix dependencies.` No numbered steps. Inventing order where none exists misleads the next reader.

The apply-order block feeds directly into Captain's approval decision — Captain can approve the whole sequence, approve a prefix, or reject. The skill itself does NOT execute the full sequence; rule-10-allowed steps (a single `prompt-rollout` reseed OR a single `/validate`, never both in one invocation per gate 3) may still auto-execute per their own gates — everything else is Captain's step per rule 10.

---

## Phase 6 — Meta-recommendations

Based on recurring patterns across `TARGET-REPORTS` AND handoffs already read in Phase 2a, propose infrastructure or workflow improvements. Each entry must state: *problem observed → proposed change → why it is structural, not analytical → rough cost/benefit*.

Examples of what belongs here (pick only those that actually apply — no speculative list):
- **Quality-expectations drift guard** — propose a structural CI validation that: (a) every Phase 8 register block can represent `qCode` explicitly; (b) every `structuralCheck` field path in `report-quality-expectations.json` exists in live `types.ts`; (c) every family band in `Captain_Quality_Expectations.md` prose matches `benchmark-expectations.json`. The goal is to detect cross-file drift mechanically instead of relying on cross-model review. Respects rule 2 — it is structural validation, not analytical decision logic.
- Prompt activation verification (active blob vs. file drift has recurred multiple times — see `feedback_deploy_config_state.md`)
- `analysisIssueCode` taxonomy gaps if Phase 3 flagged uncoded failure modes
- `benchmark-expectations.json` update procedures — when to update after a rerun wave, who is responsible
- Cross-run quality trend aggregator (read-only structural tool — no analysis logic, rule 2 not violated)
- Handoff indexing if the RAG scan in Phase 2a started missing relevant entries
- Promotion of `/report-review` into pre-release or nightly workflow once it has proven value

---

## Phase 7 — Output format

**Output mode** (determined from `$ARGUMENTS` and scope size):
- Default: **concise** — emit 7a, 7c top-10 findings, 7d.1 audit (MANDATORY, full table and AUDIT-CERT line), 7d.2 top-5 accepted fixes, 7d.3 rejected fixes (if any), 7f escalation hints, 7g Captain escalations whenever any fire, AND 7h Proposed learnings whenever any fire. 7d.1, 7g, and 7h are never suppressed by concise mode — 7d.1 is a compliance certification that must be visible so Captain can verify the audit happened; Captain-decision-required unresolved states and Captain-approval-required write proposals are blocking or actionable signals and must be visible regardless of verbosity setting.
- `$ARGUMENTS` contains `--full` OR scope has more than 5 reports → **full** — emit every subsection.
- `$ARGUMENTS` contains `--dry-run` → emit 7a (scope summary) plus a "would analyze" list describing which dimensions and panels would activate, then STOP. No Phase 4 spawn, no fix proposals, no Phase 8 writes. (7g is moot under `--dry-run` since escalations fire during real execution, not planning.)

Emit in this order, terse:

### 7a. Scope summary
```
HEAD:              <sha> <short>
DIRTY:             <yes/no>  (analyzer/prompt changes only; docs-only dirt noted separately)
Scope:             <how scope was chosen + output mode>
Reports:           <count> (SUCCEEDED / failed / degraded)
Degenerate count:  <count where isDegenerate=true>
Families in scope: <list of slugs from benchmark-expectations.json>
LLM-timeout rate:  <match count from 3h grep, or n/a>
Active prompt:     <active_hash[:16] — activated_utc>  (for claimboundary profile)
```

### 7b. Per-report snapshot
One block per target report. Structure mirrors `/prompt-diagnosis §5a`, with these additional lines:
```
EXPECTATION-DELTA: verdictLabel <observed vs expected>, truthPct <observed vs band>, confidence <observed vs band>, boundaries <observed vs minBoundaryCount>
KNOWN-OPEN:        <knownOpenIssues from expectations file if any>
REGRESSION:        <if 3i fired>
  last-good:       <jobId> at commit <sha[:8]> — verdict <label>/<truth>/<conf>, bench-score <n>
  current:         bench-score <n>  (delta: <-n>)
  window:          <N commits between last-good and HEAD touching analysis paths>
  prompt-diff:     <rendered section names that differ, or NO-PROMPT-DIFF, or COMMIT-APPROXIMATE>
  rollback-class:  <SAFE-FULL-ROLLBACK | PARTIAL-ROLLBACK | MODIFICATION | NOT-ROLLBACKABLE>
  rollback-target: <commit:file:section, or "none — forward-fix required">
```
If 3i emitted `NO-PRIOR-BETTER`, add a one-line note: `REGRESSION: no prior run scored higher — not a historical regression.`

### 7c. Debated findings table
```
F## | Type | Dim | Severity | Confidence | Survived debate? | Cross-ref
```

Include a `Rejected findings` row for any finding that was dropped during debate — label it with the reason. This is telemetry, not apology.

### 7d. Proposed fixes

**7d.1. Rejected-mechanisms self-audit (MANDATORY — emit BEFORE fix blocks)**

Before ANY fix block is emitted, emit this audit table verbatim, with one row per candidate fix (including `rootCauseId`-grouped secondaries). A violation in any row moves that fix to `7d.3 Rejected fixes` with its rule number.

**Anti-rationalization note:** framings like *"this isn't really a keyword, it's a semantic cue"*, *"in this specific case the qualifier is necessary"*, *"hardcoding this one term is unavoidable for this claim"*, or *"it's just surfacing what the LLM already sees"* DO NOT exempt a fix from §Phase 5 Rejected mechanisms. If your justification starts with *"in this specific case"*, *"but this one is different"*, or *"technically it's not X, it's Y"*, treat that as a compliance signal — not permission. The rules bind every proposal regardless of perceived necessity; a proposal that trips any rule is rejected even if you can argue the underlying concern is real.

Rules (abbrev — full text in §Non-negotiable constraints):
- **R1** Generic by Design · **R2** No deterministic text analysis · **R3** No string-match tests
- **R4** No verdict manipulation · **R5** Strings only in prompts/search · **R6** UCM for tunables
- **R7** Multilingual robustness

```
| F## | Mechanism | Change (<=15w) | R1 | R2 | R3 | R4 | R5 | R6 | R7 |
|-----|-----------|----------------|----|----|----|----|----|----|----|
| F01 | ...       | ...            | N  | N  | N  | N  | N  | N  | Y  |
```

Marking convention — for R1–R6: `Y` = VIOLATES rule (reject), `N` = compliant. For R7: `Y` = works multilingually, `N` = English/single-language only (reject). Any `Y` in R1–R6 OR any `N` in R7 forces move to Rejected fixes.

**Mandatory certification line after the table (exact string — the main thread parses it):**
```
AUDIT-CERT: every accepted fix is N for R1-R6 and Y for R7. Violators moved to 7d.3 Rejected fixes.
```

Cannot certify truthfully? → compliance deadlock. Escalate via 7g Category C. Do NOT emit a fix that fails the audit, and do NOT soften the audit by reclassifying the violation (e.g., "this keyword isn't really domain-specific"). If every candidate for a real finding violates at least one rule, that is itself the Category C signal — Captain decides.

**7d.2. Accepted fixes**

Phase 5 blocks in order.

**7d.3. Rejected fixes (policy violations)**
```
Rejected fixes (policy violations):
  <any fix that was dropped + rule number violated>
```

### 7e. Meta-recommendations
Phase 6 list.

### 7f. Escalation hints
- PHASE-BLOCKER SYSTEMIC surviving → `/audit`
- Finding implicates prompt runtime provenance specifically → `/prompt-diagnosis` (narrower follow-up)
- Finding requires real-LLM validation → `/validate <slug>` (note $1–5 cost)
- `DIRTY=yes` AND finding cites executed code → root-cause attribution is approximate; blob via `promptContentHash` may still be exact
- All reports predate HEAD → recommend targeted rerun before acting
- Any family with `qualityStatus: UNVERIFIED-ON-CURRENT-STACK` in scope → recommend rerun per `highPriorityReruns` order in `benchmark-expectations.json`
- 3i `REGRESSION-WINDOW` has more than 3 commits → recommend `/validate <family-slug>` at the midpoint commit to narrow the regression (real-LLM, $1–5 cost — needs Captain authorization)
- 3i proposed `SAFE-FULL-ROLLBACK` or `PARTIAL-ROLLBACK` → Captain should review the specific section diff before applying; `git show <commit>:<file>` for verification
- 3i classified every candidate target as `NOT-ROLLBACKABLE` → the regression is entangled with other work; `/audit` the whole prompt surface before forward-fixing

### 7g. Captain escalations (agent team cannot resolve)

Phase 7f points Captain at follow-up skills (`/audit`, `/prompt-diagnosis`, `/validate`). Phase 7g is different: it flags situations where the skill's team of agents could not resolve a material item, and Captain must decide before the finding can be acted on. Flag-and-continue by default — the skill emits everything else it can determine; 7g surfaces only the specific unresolved items.

**Categories — emit ONLY when the stated trigger fires (not for ordinary disagreement, not for ordinary "could use more data" cases):**

- **A. Debate deadlock with no compliant resolution.** Phase 4 reconciliation leaves a material finding with no surviving compliant proposal: ≥2 panels CONFIRM the finding, Devil's Advocate rebuts every proposed fix with a concrete regression risk, and no alternative mechanism satisfies the rule 1–10 constraint gate. Ordinary Devil's Advocate rebuttal that results in downgrade or drop is NOT this category — that is the normal reconciliation path under SKILL.md §Phase 4 "Debate reconciliation".
- **B. Pre-condition UNKNOWN.** The pre-condition gate (rule 10) returned UNKNOWN for drift state because scope contained no recoverable `meta.promptContentHash` values for Phase 3h to compare against the active hash. The skill cannot execute a reseed or `/validate` safely until Captain confirms rollout state.
- **C. Compliance deadlock.** A real finding has no mechanism that passes the rule 1–10 constraint gate, whether detected during Phase 5 fix composition, at the 7d.1 Rejected-mechanisms self-audit (pre-emission catch), or during the Self-check destructive-action sweep (late catch). Every proposed fix violates at least one of rules 1–10, and no alternative exists within the skill's allowed mechanism set. A 7d.1 audit that cannot emit `AUDIT-CERT` truthfully for any candidate MUST escalate here rather than weakening the audit or softening a violation.
- **E. Multi-validate resolution needed.** A single `/validate` executed this invocation produced ambiguous results (typically a Phase 3i midpoint-bisection that splits the window), and resolving the finding requires a second `/validate` in a later invocation. Rule 10 caps `/validate` at one per invocation, so this is a hard stop inside the current run. "Could use more data in general" is NOT this category — that belongs in 7f.
- **G. Cross-skill ordering affects validity.** A finding requires follow-up by ≥2 skills AND the order materially affects whether the subsequent skills' conclusions are valid AND the skill cannot determine the correct order from in-scope evidence. If the skill can name the order (e.g., "run `/audit` first, then `/prompt-diagnosis`"), it belongs in 7f — escalate to 7g only when the order is genuinely undetermined.
- **H. Unclassifiable systemic pattern.** Multiple reports show a consistent pattern that does not fit any known Q-code, infrastructure pattern, or regression signature. The skill cannot name the failure class; Captain either needs to add a new Q-code (route to `/audit` + `report-quality-expectations.json` update) or identify the pattern.

**Output format (one block per escalation):**

```
CAPTAIN ESCALATION <A|B|C|E|G|H> — <one-line problem statement>
  Why the skill can't resolve:  <concrete: what was tried, what failed>
  Captain needs to decide:      <specific question or choice>
  Suggested next steps:         <2-3 options, if any>
  Blocking impact:              <what of the skill's output is unreliable or absent while this is unresolved>
```

**Rules:**
- Category B, when triggered by an attempted `/validate` execution, also stops the skill from executing the action (rule 10 pre-condition gate). The escalation is emitted; the execution is withheld.
- All other categories flag-and-continue: the skill emits 7a–7f normally, then appends the escalation block(s). The finding stays on record with its current confidence, not silently dropped.
- If multiple escalations fire, emit one block per category in A→B→C→E→G→H order.
- If NO escalation fires, 7g is omitted entirely (do not emit an "escalations: none" header).

### 7h. Proposed learnings (Phase 9 output)

Emits the learning and improvement proposals Phase 9 produced. All entries are proposals requiring Captain approval before any file is written — rule 10 applies identically to new writes and updates, to `Skills_Learnings.md` and to the skill/expectation files.

**Output format (one block per learning, grouped by category A→D):**

```
[L##] <for-agents | for-captain | skill-improvement | expectations-improvement> — <one-line summary>
  Observation (what happened this run):  <concrete, 1-3 sentences>
  Relevance (why others need it):        <1 sentence>
  Target file if approved:               <Skills_Learnings.md | SKILL.md:<section> | benchmark-expectations.json | report-quality-expectations.json | Captain_Quality_Expectations.md>
  Proposed text block:
    ---
    ### YYYY-MM-DD — <Title>
    Skill: /report-review
    Category: <for-agents | for-captain | skill-improvement | expectations-improvement>
    Agent/Tool: <agent name + model>
    Observation: <body>
    Relevance: <body>
    Related: <file paths, Q-codes, or slugs>
    ---
```

**Rules:**
- If NO Phase 9 learning fires, 7h is omitted entirely (no "learnings: none" noise header). Match the 7g convention.
- Multiple learnings emit in category order: for-agents → for-captain → skill-improvement → expectations-improvement.
- `Skill: /report-review` is mandatory on every persisted-entry block so the shared `Skills_Learnings.md` stays searchable as other skills start writing there.
- For `skill-improvement` and `expectations-improvement` categories, the `Target file` must specify the exact location (e.g., `SKILL.md §Phase 3h` or `benchmark-expectations.json families.bolsonaro-en.anchorTokens`) so Captain can scope the approval precisely.

---

## Phase 8 — Prompt Issue Register auto-update

For each surviving finding that is **CONFIRMED** and **prompt-related**:

1. Spawn a single `general-purpose` sub-agent with this brief (verbatim; fill `<<...>>`):

```
You are a Prompt Issue Register reviewer for /report-review. You have no memory of prior runs.

GIVEN FINDING:
<<paste the finding block>>

EXISTING REGISTER (for near-duplicate detection):
<<paste Docs/AGENTS/Prompt_Issue_Register.md if it exists; otherwise "register does not yet exist">>

STRUCTURAL CHECKS — do these first (all are enumerable; no judgment calls):
1. Is the prompt file OR profile explicitly named in the finding text (exact string match on `apps/web/prompts/*.prompt.md` or profile keys like `claimboundary`, `text-analysis-verdict`)?  (yes/no)
2. Is a rendered section, line range, or prompt section heading cited?  (yes/no)
3. Specificity check — count in the finding: (a) number of distinct jobIds cited, (b) number of distinct concrete field values cited (e.g., `truthPercentage=50`, `boundaryCount=0`), (c) presence of exact quoted wording of at least 8 characters. Eligible iff: (a) ≥ 1 AND ((b) ≥ 1 OR (c) is true).  (yes/no — output the three counts)
4. Does the finding's `root-cause` field contain either "prompt" or "prompt rollout" but NOT "infrastructure" / "3h" / "timeout" / "concurrent" / "stage code bug"?  (yes/no)
5. Scan existing register for near-duplicates. Match on `qCode` (primary key for findings originating from `/report-review`) OR `Pcode` (for `/prompt-diagnosis`-era entries that predate the Q-code catalog). Near-duplicate iff: same qCode-or-Pcode AND same prompt-file AND `description` shares ≥8 consecutive-word overlap with this finding's root-cause.  (yes/no — if yes, list the existing entry ID)

DECISIONS:
- REGISTER-ELIGIBLE = yes iff checks 1–4 all pass.
- LOW-RISK = yes iff REGISTER-ELIGIBLE=yes AND check 5 is no (no near-duplicate).
- If check 5 is yes (near-duplicate), return LOW-RISK=no AND propose UPDATE-EXISTING=<existing entry ID> with specific fields to update (last-confirmed, prompt-hash, commit).

RETURN FORMAT (strict):
[CHECK 1] yes|no — <one-sentence>
[CHECK 2] yes|no — <one-sentence>
[CHECK 3] yes|no — <one-sentence>
[CHECK 4] yes|no — <one-sentence>
[CHECK 5] yes|no [dup-of=<id or none>] — <one-sentence>
[REGISTER-ELIGIBLE] yes|no
[LOW-RISK] yes|no
[UPDATE-EXISTING] <id or none>
[FORMATTED BLOCK]
<<formatted per /prompt-diagnosis §6b, only if REGISTER-ELIGIBLE=yes, AND with an explicit `qCode:` field added on its own line immediately after the `Pcode:` line. If the finding has no Pcode mapping, write `Pcode: n/a`. Legacy entries without qCode are backward compatible; new entries MUST carry qCode so future dedup can match on it.>>
```

2. **Do NOT write to the register autonomously (rule 10).** Emit the candidate block as a **proposal** in Phase 7d under `Proposed register entries`, tagged with the reviewer's REGISTER-ELIGIBLE / LOW-RISK / UPDATE-EXISTING outcomes. Captain either approves ("write entry F## to the register") or rejects. On explicit approval, the agent appends the block using the Windows-safe atomic write procedure below. The 5-check reviewer still runs — its purpose now is to produce a confidence-qualified proposal for Captain, not to clear an autonomous write gate.

   **Near-duplicate handling:** Check 5 still matches on `(qCode OR Pcode, prompt-file, root-cause word-overlap)`. Because qCode and Pcode are distinct taxonomies (no crosswalk), Check 5 tries qCode first against entries that have one; falls back to Pcode for legacy `/prompt-diagnosis`-era entries. A new qCode-era finding can never match a legacy Pcode-only entry, which is correct — creating a new entry is honest. If Check 5 returns `UPDATE-EXISTING=<id>`, the proposed block is an amendment to that entry, not a new one; Captain still approves before the append happens.

   **Write procedure when Captain approves (Windows-safe, atomic):** write to `Docs/AGENTS/Prompt_Issue_Register.md.tmp` first, then rename over the original. If the rename fails (file locked, typically because Captain has the file open in an editor), leave `.tmp` in place, record `REGISTER-LOCKED` in 7d, and do not retry — the next `/report-review` run will surface the tmp state. Create the register with the header from `/prompt-diagnosis §6a` only when Captain approves the first entry (nothing-to-append case).

3. If `REGISTER-ELIGIBLE=yes AND LOW-RISK=no AND UPDATE-EXISTING=<id>`: emit the update-confirmation as a proposal in Phase 7d under `Proposed register entries` tagged with `UPDATE-EXISTING=<id>` and the specific field deltas (e.g. `last-confirmed: <this-run>`, bump `prompt-hash`). Captain approves before the append lands — no autonomous update-append either. Rule 10 covers any write to `Prompt_Issue_Register.md`, whether new entry or amendment to an existing one; UPDATE-EXISTING is not a carve-out from rule 10.

4. If `REGISTER-ELIGIBLE=no`: list the finding in 7d under `Register-skipped entries` with the failed check number and reason.

5. Update KNOWN-RECURRING entries (`already-fixed: yes` → `status: resolved`, etc.) following `/prompt-diagnosis §6c–6d`.

6. **Audit log:** for every Phase 8 decision (write, update, skip), emit one line in 7d under `Phase 8 log`: `<finding-id> → <action> — <reviewer's one-sentence reason>`. This is telemetry, not apology.

---

## Phase 9 — Post-execution learnings and improvement proposals

After Phases 1–8 complete and before Self-check, reflect on what executing this invocation of `/report-review` taught you that is worth persisting for other agents or Captain. This phase is NOT a review of the run's analytical findings (that would be self-judging — not allowed per the lifecycle Review row). It is reflection on the *skill itself* and the *expectation artifacts*: what was awkward, what was missing, what a future agent or Captain would want to know.

**Phase 9 is propose-only. Every output is emitted in 7h. No autonomous writes. Rule 10 applies verbatim to Phase 9 writes, same as Phase 8.**

**9a. Reflect across four categories:**

| Category | Fire when |
|---|---|
| `for-agents` | Tactical gotcha, shortcut, or pattern discovered while executing that would save the next agent running `/report-review` time or a mistake |
| `for-captain` | Recurring pattern Captain should know that isn't a finding on the analyzed jobs (e.g., "Phase 4 debate consistently deadlocks on Q-V7 because the structural proxy is weaker than Q-V7's intent") |
| `skill-improvement` | The run surfaced a specific gap in the skill's phases, checks, or sub-agent briefs that a future amendment should close |
| `expectations-improvement` | The run surfaced a gap in `benchmark-expectations.json`, `report-quality-expectations.json`, or `Captain_Quality_Expectations.md` (e.g., a family needing an `anchorTokens` annotation, a Q-code whose structuralCheck under-specifies, an MD band drifting from the JSON) |

**9b. Threshold: propose only concrete learnings.** If the run had nothing novel — everything went as specified, no surprises, no gaps — emit nothing. Do NOT manufacture learnings to fill space. Empty 9 = empty 7h = section omitted (no "learnings: none" noise header).

**9c. Format the persisted entry** (mandatory fields so `Skills_Learnings.md` stays searchable and dedupable as other skills start writing there):

```
---
### YYYY-MM-DD — <Title>
Skill: /report-review
Category: for-agents | for-captain | skill-improvement | expectations-improvement
Agent/Tool: <agent name + model>
Observation: <1-3 sentences — what happened during this run that's worth capturing>
Relevance: <1 sentence — why other agents or Captain need this>
Related: <file paths, Q-codes, or slugs — used for Phase 2 filtering on future runs>
---
```

`Skill: /report-review` is MANDATORY on every entry — the file is a shared resource and other skills will write there too. Without this field, Phase 2 filtering (which reads entries where `Skill: /report-review`) cannot work.

**9d. Target file per category:**

| Category | Proposed target |
|---|---|
| `for-agents`, `for-captain` | `Docs/AGENTS/Skills_Learnings.md` (created on first Captain-approved write; do NOT pre-create) |
| `skill-improvement` | `.claude/skills/report-review/SKILL.md` (specific section to edit) |
| `expectations-improvement` | `Docs/AGENTS/benchmark-expectations.json`, `Docs/AGENTS/report-quality-expectations.json`, or `Docs/AGENTS/Captain_Quality_Expectations.md` (specify which + where in file) |

**9e. Boundary with Phase 6.** Phase 6 (Meta-recommendations) is about patterns observed in the *analyzed jobs* suggesting workflow/infra improvements — about the system under review. Phase 9 is about patterns observed in *executing the skill* suggesting improvements to the skill or expectations — about the skill itself. If a proposed improvement fits both framings, put it in Phase 6 (the jobs surfaced it first) and reference it from 9 rather than double-listing.

---

## Self-check before reporting

Before emitting output, re-read the non-negotiable constraints and scan all proposed fixes:
- Does any fix name a benchmark input, entity, region, or date? → revise or drop
- Does any fix add a unit test asserting prompt/verdict word content? → drop
- Does any fix put a threshold in code instead of UCM? → move to UCM
- Does any fix bypass an LLM call with a rule? → drop
- Does any fix silence a degrading signal? → drop

Dropped fixes must appear in 7d under `Rejected fixes` with the rule number violated.

**Destructive-action sweep (rule 10):** before reporting, apply the revised rule 10 matrix:

- For every Phase 5/6 proposal, every Phase 8 register block, AND every Phase 9 learning/improvement proposal: if it would execute in the **Require Captain approval** category (file writes to `Skills_Learnings.md`, `SKILL.md`, `benchmark-expectations.json`, `report-quality-expectations.json`, `Captain_Quality_Expectations.md`, `Prompt_Issue_Register.md`, prompt files, or any other repo file; multiple validates; full suites; git mutations; applied rollbacks; env-var/config changes), reclassify it under the appropriate `Proposed ...` subsection in 7d or 7h. No Phase 9 write lands without explicit Captain approval — same gate as Phase 8.
- For every `/validate` call the skill executed autonomously: verify (a) exactly one `/validate` was run in this invocation, (b) the slug is in `benchmark-expectations.json.families[]`, (c) the input submitted was byte-exactly the family's canonical `inputValue`, (d) pre-condition gate passed immediately before execution (git clean on analyzer/prompt/config paths, no PROMPT-ROLLOUT-DRIFT active, no reseed performed in the same invocation). If any of these fail, log the violation in 7a under `Rule-10 violations` and do not emit findings derived from the invalid run.
- For every reseed the skill executed autonomously: verify (a) git status was clean on analyzer/prompt/config paths immediately before, (b) no `/validate` was executed in the same invocation after the reseed. If either fails, log under `Rule-10 violations`.
- For any proposal that would submit an input not in `benchmark-expectations.json.families[]`: emit as proposal with an explicit note that Captain should add the family to `benchmark-expectations.json` and `AGENTS.md` first per AGENTS.md §Captain-Defined Analysis Inputs, then re-invoke. The skill never *autonomously* submits novel inputs, but Captain can approve a proposal.
