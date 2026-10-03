---
name: report-review
description: Explicitly selected review of authorized existing reports against public quality, benchmark, comparator and provenance contracts; findings and proposals only unless the task authorizes more.
allowed-tools: Read Glob Grep Bash Agent
disable-model-invocation: true
---

Bind this public contributor procedure to the current task and explicit arguments, not editor selection. Read applicable root/nested instructions. Resolve source, evidence and output homes through task scope or a verified adopted profile; a public cwd never selects a public output. A separately bound supplemental procedure must be qualified and available; report the selected edition and do not silently substitute when it is missing or stale. Access and skill selection grant no execution, spending, publication or persistence authority. Read-only sessions return findings in chat.

`TASK_ARGUMENTS` means the task's literal explicit selection, not a shell variable or inferred editor context. Record `CODE_ROOT`, full code revision `HEAD-SHA`, changed-file hashes where relevant, and exact authorized evidence/output bindings. Never put private record names or summaries in a public index; follow `Docs/AGENTS/Policies/Handoff_Protocol.md`.

# Report review

Explicit selection is mandatory. Bind exact reports/evidence, code revision and output record. Do not treat a skill menu entry as execution authority. This public edition implements the public quality contract; task-bound supplemental methods may add depth without changing that authority.

## Non-negotiable constraints (applies to every phase and every sub-agent)

These constraints bind both this skill's analysis AND the fixes it proposes. If a recommendation violates any of them, downgrade it to `REJECTED — policy violation` and do not present it as an accepted fix; retain its rejection and reason in the report.

1. **Generic by Design** — no proposed fix may introduce domain-specific keywords, named entities, regions, or date-periods into source code or prompts. Benchmark inputs listed in `AGENTS.md §Captain-Defined Analysis Inputs` are targets of analysis, never vocabulary for prompts or code.
   - Concrete failing jobs and benchmark inputs are for diagnosis only. A proposed fix must be stated from the abstract failure mechanism, not from vocabulary that appears only because it was present in the triggering analysis.
2. **No new deterministic text analysis** — do not propose regex, keyword lists, forbidden-term lists, similarity heuristics, or rule-based classifiers as fixes. Analysis decisions must stay in LLM calls.
3. **No string-match tests as mitigations** — do not recommend adding unit tests that grep prompt text for specific phrases, nor tests that assert specific words appear in verdicts.
4. **No deterministic verdict manipulation in source code** — do not propose post-hoc truth-percentage nudges, verdict-label overrides, or confidence clamps based on input content. Verdict shaping happens via prompt + aggregation logic that is input-agnostic, not via code paths that inspect the claim text.
5. **Strings that influence analysis live in two places only**: prompt text (under `apps/web/prompts/`, managed via UCM) and web-search query construction. Fixes that inject analysis-affecting strings anywhere else are rejected. ("Analysis-affecting" = strings that shape the LLM's reasoning input or search-provider queries — NOT log messages, error codes, warning-type identifiers, schema keys, or enum labels.)
6. **UCM is the home of tunables** — threshold, weight, and limit changes go through `apps/web/configs/*.default.json` + UCM, not hardcoded constants.
7. **Multilingual robustness** — a fix that only works for English (or any single language) is not a fix. Challenge any recommendation that implicitly assumes English word order, English keywords, or Latin script.
8. **Report Quality & Event Communication (AGENTS.md)** — severity reflects verdict impact, not internal noise. Do not propose downgrading a degrading-signal warning to hide it, and do not propose escalating a fully-recovered fallback to `warning+`.

9. **Inspect user-provided jobs first (HARD RULE)** — if the Captain/user supplied one or more specific job URLs or job IDs, those exact jobs are the primary evidence base and MUST be inspected before diagnosis, comparison, or fix proposals. Do not substitute nearby jobs, same-commit jobs, or same-input jobs as if they were equivalent. If a provided job cannot be read (missing, hidden, deleted, permission-blocked, or payload unavailable), state that explicitly and treat any subsequent recommendation as provisional hardening only — NOT as a confirmed root-cause fix for that job.

   **Report-quality baseline comparison extension:** after exact requested jobs are inspected, quality judgments MUST compare them with `Docs/AGENTS/Captain_Quality_Expectations.md`, `Docs/AGENTS/benchmark-expectations.json`, `Docs/AGENTS/report-quality-expectations.json`, and the best usable exact/family comparator reports listed in the Captain expectations file. State exact vs. variant, local vs. deployed, and current-stack vs. historical for every comparator used. If no best comparator exists, say so explicitly rather than promoting a weak nearby job.

10. **Prompt-change justification gate (HARD RULE)** — do not propose or apply prompt changes merely because a report is bad or because nearby jobs suggest a plausible prompt issue. Every prompt change must be justified by concrete evidence from the inspected in-scope jobs showing why prompt behavior is implicated rather than code, config, rollout state, or runtime variance. If the provided job was not inspectable, prompt edits may only be surfaced as speculative/provisional options and must be labeled as such.

11. **No speculative prompt piling** — when multiple plausible failure layers exist, prefer the narrowest confirmed mechanism from inspected job evidence. Do not stack prompt edits on top of code/config/runtime uncertainty. If causality is unclear, escalate that uncertainty instead of accumulating prompt changes.

12. **Index before scanning** — before listing or grepping `Docs/AGENTS/Handoffs/`, query `Docs/AGENTS/index/handoff-index.json` (filter by `roles` + `topics`). Read only the matched files. `handoff-index.json` covers agent task history only — for source code locations use grep, not this index.

13. **Current task authority governs every operation.** Selecting this skill authorizes no reseed, live analysis, provider spend, Git mutation, file/register/expectation update or deployment by itself. Inspect only authorized reports/source using read-only access. A missing file/database is an evidence limitation, not permission to create it.

    Pushes, deployments, live analyses, and provider-spending operations require current authorization covering the specific action and scope. Authorization already given in the task remains valid; preparation or review alone does not grant it. If authorization is absent, return the concrete proposed action and its purpose. Do not require repeated approval when the action is already covered.

    Before any authorized live validation: use only Captain-defined inputs with byte-exact wording; resolve the approved family from `benchmark-expectations.json` and confirm it matches the current root/input mandate. No invented, paraphrased, translated, normalized or substitute inputs. A missing approved input needs Captain definition before submission. Do not default to the full default-families batch; select the approved families explicitly.

    Commit relevant source/prompt/config changes through the authorized integrator, verify the intended checkout and clean relevant paths, activate/reseed changed prompts/config only in the assigned local stack and confirm effective runtime state. Follow `Docs/AGENTS/Procedures/Live_Validation_Hygiene.md` for required restarts and provenance. Missing prompt hashes or unresolved rollout drift do not establish readiness: keep the run proposed until the required state is verified. Raw file hashes do not equal canonicalized prompt-blob hashes.

    A combined authorized preparation/validation assignment may complete these prerequisites and run in one session when its state is verifiable. Record the exact input, baseline, active prompt/runtime evidence, writable state, job IDs, outcomes and cost. Monitor the root first-three-job clear-regression stop rule; uncertain variance alone is not a stop trigger. If execution exceeded authority or provenance/input gates, report the violation and do not use that run as valid fix evidence.

    File writes and recovery/register updates belong to the assigned writer/integrator; restricted reviewers return proposed content in chat. Destructive/irreversible operations are main-session-only. Protect user/other-agent changes; no skill-specific exception overrides root boundaries.

  14. **Failed-attempt recovery discipline** — when in-scope evidence shows that a code, prompt, or config change already failed its first focused validation (for example `npm test`, `npm -w apps/web run build`, or an explicitly described manual verification), do not stack a broader proposed fix on top of that attempt without first classifying the earlier attempt as `keep`, `amend`, `revert`, `quarantine`, or `add`. Recommendations may retain only the parts still supported by inspected job evidence and verifier output.

**Give each reviewer the full applicable non-negotiable constraints, including rules 9–14, and its permitted read sources/tools. The abbreviated template below does not replace them.**

---

## Phase 0 — Scope and selectors

**Selector validation (mandatory — runs BEFORE scope determination; abort with a clear error on any failure, do NOT proceed into phases that will feed the value into shell/git/sqlite).** `TASK_ARGUMENTS` is user-controlled and flows into later file, git, and DB reads. Every selector token must pass its validator below before it is accepted:

- `jobId` tokens — must match `^[0-9a-fA-F]{32}$` (the SQLite `Jobs.JobId` is a 32-char lowercase hex with no dashes; reject anything else)
- `job URL` tokens — must be an `http` or `https` URL whose path matches `/jobs/<32-hex-jobId>` (optional trailing slash or query string allowed) and whose host is `app.factharbor.ch`, `localhost`, or `127.0.0.1`. Extract the `jobId`, preserve the original URL/host for inspectability logging, and treat the resolved `jobId` as an explicit requested job selector.
- `commit=<sha>` — pass `<sha>` through `git rev-parse --verify --quiet <sha>^{commit}`; reject on non-zero exit. Never substitute `<sha>` into a shell command without running this check first.
- `input=<slug>` — must appear as an exact `families[].slug` value in `Docs/AGENTS/benchmark-expectations.json`. Prefix matches resolve only if exactly one family has that prefix; otherwise stop and ask Captain.
- evidence-subdirectory selector — resolve only against the explicitly assigned existing evidence root (public-only tasks may explicitly select CODE_ROOT/test-output). Canonicalize and reject traversal, escape through symlinks or absent paths. An absolute source path requires separate explicit source binding; it is not an unchecked selector.
- `--full` / `--dry-run` — exact string match only; unrecognized flags are rejected.

If any selector fails validation, STOP with `SELECTOR-REJECTED: <which selector + reason>` and do not enter Phase 1.

Then determine the review scope from the validated `TASK_ARGUMENTS`:
- **empty** → scope = all jobs whose `executedWebGitCommitHash` starts with `HEAD-SHA`
- **`commit=<sha>`** → scope = jobs matching that commit
- **`jobId` or `job URL` list** → scope = those exact jobs only
- **`input=<slug>`** → scope = jobs whose **`inputValue`** (the full, canonical input from the API DB — NOT the truncated `inputPreview`) exactly matches the `inputValue` keyed by that slug in `Docs/AGENTS/benchmark-expectations.json`. `inputPreview` is display-only and truncated; comparing against it silently drops long inputs (e.g., the Portuguese Bolsonaro variant at 190+ chars).
- **evidence subdirectory** → scope = job JSONs within the validated path and authorized task scope

When the selector is an explicit `jobId`/`job URL` list, preserve the user-supplied order as `REQUESTED-JOBS[] = { rawSelector, resolvedJobId, originHost }`. Phase 1 MUST classify every entry in `REQUESTED-JOBS[]` as `INSPECTED` or `NOT-INSPECTABLE` before loading same-input, same-commit, or historical comparator jobs. Comparator jobs are supplemental context only; they never substitute for a requested job.

If the scope ends up empty (e.g., no jobs ran at HEAD yet), surface that immediately and ask Captain whether to (a) broaden to the previous commit, (b) request a rerun, or (c) abort. **Do not silently broaden.**

---

## Phases 1–2 — Evidence and authority

Inspect each user-specified job first and record INSPECTED/NOT-INSPECTABLE before comparators. Use existing authorized read-only evidence only; scope cannot infer database, log or production access. Record exact input, status, timestamps, source revision/dirty state, prompt hash, verdict/truth/confidence, claims, evidence, boundaries, reasoning and warnings as available. Missing fields/sources are coverage gaps, not invented values.

`Docs/AGENTS/report-quality-expectations.json` is the Q-code/structuralCheck/dimensionMap authority; `benchmark-expectations.json` owns mechanical bands. `Captain_Quality_Expectations.md` owns Captain intent, open-status language and the best usable comparator selection. State exact/variant, local/deployed and current/historical for each comparator; emit NO-COMPARATOR-AVAILABLE with its reason when absent. Do not promote a nearby job to an exact comparator. If mechanical band prose differs from JSON, flag/reconcile it under current authority; do not silently change bands. A missing mandatory contract stops certification of its checks.

Read relevant public issue identities and task-authorized history through its index. Record checked/missing coverage; empty or header-only records cannot certify other collections. Preserve known open issues; a familiar unresolved pattern is not newly proven regression.

For baseline freshness, count analyzer/prompt/config changes since the family's last verified job. More than the existing threshold (10 unless the contract explicitly supplies another), absent latestVerifiedJobId or unavailable historical commit makes that family STALE. Emit RERUN-NEEDED; skip regression from band deltas but retain ADVISORY comparison of report shape with the best usable report. Unknown expected verdicts also require RERUN-NEEDED, never invented bands.

Annotation-dependent checks are skipped without a failure when the annotation is missing/null or an array is empty. Cross-language checks also skip when the other referenced family is outside scope. State aggregate coverage; absent annotations are not a quality pass. Semantic judgments require evidence and LLM reasoning, not keyword proxies.

Derived fields: `runtimeSeconds=UpdatedUtc-CreatedUtc`; `submittedWithin5sOfOthers` is true only if another scoped job is within five seconds (false for one report); `isDegenerate=(meta.evidenceBalance.total==0) OR (meta.llmCalls<20 AND claimCount>=2) OR (all claimVerdicts[*].verdict==null)`. Missing prerequisite fields make the derived check unavailable, not automatically true/false. A null prompt hash on a successful job is a provenance gap, not by itself verdict failure.

For general scope above 20 reports use sampled mode: earliest five, latest five and five greatest absolute truth-percentage distances from the applicable band's midpoint, deduplicated. Record selection/coverage and unavailable bands; exact user-requested jobs must still be inspected first, and an explicit job list can override sampling. Do not silently substitute samples for exact requested jobs.

## Phase 3 — Quality dimensions

Run applicable Q-codes in the catalogue's dimensionMap and their structuralCheck/onFail contracts. This table defines the phase identifiers used by that public catalogue.

| Phase | Scope and order |
|---|---|
| pre-3a | Q-HF1 runtime integrity and Q-HF4 cited-evidence minimum; run first |
| 3a | Benchmark expectations, noise tolerance, known issues and comparator shape |
| post-3a | Q-HF6 confidence/publication floor after expectation comparison |
| 3b | Exact approved input and applicable input/annotation integrity |
| 3c | Evidence quality, direction, language and source health |
| 3d | Evidence-emergent boundaries, distinctness and applicable minimums |
| 3e | Evidence-grounded verdict reasons, direction, citations and contestation |
| 3f | Registered warnings with severity based on material verdict impact |
| 3g | Systemic tagging of shared causes across reports using Q-SYS1 |
| 3h | Infrastructure, concurrency, timeout, model fallback and rollout state |
| 3i | Historical regression comparison and the change window |
| 3j | Rerun stability and applicable cross-language/anchor annotations |

Pre-3a: a non-SUCCEEDED report or analysis_generation_failed/llm_provider_error/report_damaged stops semantic Phase 3 checks for that report. A verdict without supporting or contradicting evidence IDs fails the structural citation minimum. Gate failures and infrastructure findings skip Phase 4 semantic panels and go to structural/workflow proposals. Do not confuse citation-generation failure with ordinary evidence scarcity. Apply Q-HF6's current publication conditions from the catalogue, not a confidence-only shortcut.

### Phase 3h — Infrastructure definitions

Before attributing a finding to prompt/stage logic, check available infrastructure evidence. Q-INF_CONCURRENCY applies when at least two scoped reports have meta.evidenceBalance.total=0, meta.llmCalls<20 and submission times within five seconds. File INFRASTRUCTURE-CONCURRENCY; serialization is a workflow proposal and FH_RUNNER_MAX_CONCURRENCY is an environment setting, not UCM. This diagnostic signature does not authorize a runtime change.

For Q-INF_TIMEOUT_PRESSURE and Q-INF_MODEL_FALLBACK use the catalogue's full checks. Missing/rotated logs produce an unknown timeout rate, not a zero count. Actual fallback models change comparator context.

For Q-INF_PROMPT_ROLLOUT_DRIFT, compare the authorized active claimboundary canonical prompt hash/activation time with scoped runtime prompt hashes and HEAD's prompt-commit times. A mismatch with every scoped hash AND activation preceding those commits flags rollout drift. If hashes/state are unavailable, record UNKNOWN; do not certify rollout readiness. The proposed repair is rollout verification/reseed, not another prompt edit. Recovered blobs anchor prompt provenance; execution SHA and raw file hashes do not replace them. Any actual reseed/build/restart needs current task authority and verified assigned state.

### Phase 3i — Regression contract

Run Q-REG1 when 3a found regression against a previously proven family (SOLVED, SOLVED-MAIN-BLOCKER, SOLVED-VISIBLE-CONTAMINATION, PARSE-FAILURE-FIXED, CONFIRMED-ON-CURRENT-HEAD or CONFIRMED-ON-CURRENT-STACK). Compare authorized prior successful runs of the byte-exact full input; never truncated inputPreview. For each prior run use the family's bands/noise tolerance:

- +2 for an expected verdict label;
- +1 for truth percentage in band including noise tolerance;
- +1 for confidence in band including noise tolerance for the Phase 3i ranking only; Q-BE3 still uses its strict band;
- +1 for boundaryCount meeting the applicable minimum;
- +1 for evidenceBalance.total>0;
- +1 for not isDegenerate.

An inapplicable/unknown band or boundary annotation cannot earn or lose a claimed check; record comparable coverage. The highest-scoring prior run is the candidate lastGoodJob; if none beats the target, emit NO-PRIOR-BETTER. Preserve the Captain comparator review independently of this structural score. This inherited ranking score does not make a Q-BE3 strict confidence-band failure pass.

Record the source change window and relevant prompt/code/config differences. Prefer exact prompt-blob comparison; unavailable blobs require labelled COMMIT-APPROXIMATE/CURRENT-ONLY coverage, and dirty source revisions remain approximate. A score delta does not prove causality. Propose bounded bisection only with approved exact inputs; never auto-run it. Compare full rollback, section rollback, targeted amendment and forward repair on evidence. Reject a rollback that violates root genericity or harms another family. Rewritten/unavailable historical commits are evidence gaps, not permission to recreate old branches or restart held work.

## Phases 4–6 — Review and proposals

Phase 4 means proportionate independent review of material findings, with applicable root constraints and bounded evidence supplied. Catalogue references to named panels identify the relevant review expertise, not a mandatory standing team. Record absent review and evidence confidence separately; no vote establishes correctness. Gate/infrastructure findings bypass semantic panels as above.

Phase 5 proposals must state the abstract mechanism, concrete inspected evidence, expected effect, alternatives (including amend/revert), regression risks and verification. No speculative prompt piling, keyword-driven analytical logic, phrase-matching mitigations, post-hoc verdict manipulation or teaching to the test. Configuration placement follows root policy. Classify earlier failed attempts before adding another repair. For every proposed fix, report rule compliance and rejected alternatives; never emit AUDIT-CERT unless each claimed constraint was actually checked. Group fixes sharing a root cause, state dependencies and safe application order, and flag a partial group application. Quality-status changes require direct rerun confirmation and Captain approval; the same observation that suggested a band update is not sufficient. No automatic application, band/status update or rollout follows.

Phase 6 records only evidence-backed systemic/workflow recommendations with cost/benefit. Keep them distinct from findings on a single report. A frequent irrelevant warning does not excuse hiding real degradation.

### Visible fix-compliance audit

Before accepted fixes, emit `F## | Change | R1 | R2 | R3 | R4 | R5 | R6 | R7 | Evidence/reason`, mapped to numbered non-negotiable constraints 1–7 above. For R1–R6, `Y` violates and `N` complies; for R7, `Y` establishes multilingual compliance and `N` violates. Reject any violation, and keep unknowns unresolved. Emit `AUDIT-CERT: every accepted fix is N for R1-R6 and Y for R7. Violators moved to 7d.3 Rejected fixes.` only when checked and truthful. This grid does not replace applicable constraints 8–14. Findings-only tasks omit proposals/certification. No rationalization or reclassification may weaken a violated constraint.

## Phase 7 — Output contract

Include scope/revisions, inspectability and missing evidence, comparator/baseline freshness, per-report observations, findings, compliance-audited proposed fixes and rejected mechanisms, application order, coverage/review skips, escalations and proposed persistence home. Dry-run emits the validated would-review scope/dimensions then stops: no review agents, fix proposals or register writes. Concise output may omit repetition, never a material hold, compliance failure or Captain decision.

### 7a. Scope summary

Report exact inspected jobs, code/runtime/prompt provenance, sampling, baseline freshness, source/annotation coverage, skipped/unevaluated checks and review status. The catalogue's Phase 7a references resolve here.

### 7b–7e. Reports, findings, audited fixes and systemic proposals

Each finding carries ID, Q-code, phase/dimension, type (REPORT-SPECIFIC/SYSTEMIC/INFRASTRUCTURE/REGRESSION/STABILITY), severity from the catalogue and confidence (CONFIRMED/INFERRED/SPECULATIVE), exact evidence, known-issue reference and provenance/coverage. Preserve one finding per triggered Q-code; link shared causes with rootCauseId. Q-SYS1 governs systemic re-tagging, primary code selection and contributingQCodes; it never erases per-report evidence. Confidence expresses evidentiary strength, not panel count. Severity expresses the contract's impact/priority, not certainty.

### 7f. Escalation hints

Propose the appropriate public workflow/source review for omitted catalogue checks (`notIncludedInSkill`); no follow-up runs automatically. The catalogue's Phase 7f references resolve here.

### 7g–7h. Unresolved decisions and proposed learnings

Escalate material unresolved causal/compliance deadlocks and unknown required rollout state. Keep unavailable-job recommendations provisional. Proposed learnings describe concrete workflow lessons, not self-certification of analytical output.

## Phases 8–9 — Registers and learnings

Phase 8 proposes eligible register entries under the public `prompt-diagnosis` schema/lifecycle. Confirmed prompt-related findings need independent evidence/duplication review. Accept existing heading-encoded P-codes and Constraint/Check limitation records without forced conversion. For new blocks include explicit qCode, Pcode or n/a, prompt/profile/section, exact job evidence, source revision/hash, coverage and recurrence. P/Q taxonomies are distinct. Existing public issue identities and open obligations remain intact; detailed records use the task's assigned home unless explicitly public-safe. Missing/private/header-only sources cannot be claimed checked by the public drift validator. Writes require existing action/record authority; otherwise return proposals, including updates. Use an atomic temporary sibling for an approved update; on lock failure report and stop, without retry/destination substitution.

Phase 9 proposes only concrete reusable lessons and exact target changes. Preserve approval/persistence boundaries for both new entries and amendments; no new public experiment-history collection or automatic cache/index rebuild. Follow the handoff protocol for significant continuity evidence. Live analyses, provider calls, destructive operations and application changes remain governed by root policy and task scope.

## Known catalogue conflicts and coverage limits

The catalogue remains unchanged in this migration. Apply governing root policy and report these discrepancies when relevant:

- Q-BE3 uses a strict confidence band with no noise expansion. Phase 3i's inherited comparator-ranking rubric uses confidence noise tolerance only for ranking; a higher score never erases a Q-BE3 finding.
- Q-ST3's lexical-Jaccard instruction conflicts with governing semantic policy. Mark Q-ST3 **unevaluated: policy conflict**, preserve it in coverage and report the gap. Do not score it PASS or silently replace its algorithm under the same identifier.
- Q-WS1 permits info for recovered fallbacks, while root policy requires a fully recovered fallback to be silent. Apply the root rule, state the catalogue conflict and any root-based finding; never certify info as compliant on the catalogue wording alone.

These are preserved follow-up obligations, not authority to alter catalogue thresholds or analytical behavior. Do not claim complete Q-code certification while a relevant criterion is unevaluated.
