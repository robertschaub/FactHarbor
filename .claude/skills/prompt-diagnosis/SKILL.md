---
name: prompt-diagnosis
description: RAG-augmented diagnosis of LLM prompting issues. Correlates pipeline failures with runtime prompt provenance (`promptContentHash`) plus execution commit context (`executedWebGitCommitHash`). Detects report-specific failures, systemic deficiencies, and prompt rollout drift. Use when a pipeline output looks wrong and the cause may be in how the LLM was instructed or propagated.
allowed-tools: Read Glob Grep Bash
---

Diagnose LLM prompting issues for: $ARGUMENTS
(Leave blank to scan recent `test-output/` artifacts for issues.)

Think carefully before forming conclusions. Prefer structured report evidence over log greps. Treat git history as secondary context unless the runtime prompt blob cannot be recovered.

---

## Phase 1 — Identify Target Reports

**Do this first** — the RAG corpus query in Phase 2 is scoped only to stages and categories implicated by the target reports. Building the corpus before knowing the targets wastes context.

**1a. If $ARGUMENTS specifies a job ID, phase directory, validation batch, or failure description:**
Focus on that report set only. Jump to 1b with that scope.

**1b. General scan — find failing or suspicious artifacts:**

List the newest top-level artifacts under `test-output/`:
```bash
ls -t test-output/
```

Separate them into:
- run directories (e.g., `phase7-e2`)
- top-level JSON summaries (e.g., `phase7-e2-batch-jobs.json`)
- validation output roots (e.g., `test-output/validation/`)

Inspect:
- the 4 newest run directories
- the 4 newest top-level JSON summaries
- if `validation/` is relevant, the 2 newest batch directories under `test-output/validation/`

For each **run directory**:
```bash
ls test-output/<dir>/
```
Read up to **5 job JSON files** per directory: first 2, last 2, plus one additional file whose name prefix suggests a benchmark family or an outlier.

For each **top-level JSON summary**:
- read it once
- use it as a lead source only if it points to job IDs or anomalous verdicts
- do not treat it as a job result unless it has the job-level schema

For each **validation batch directory**:
- read `manifest.json`
- read up to 4 family summary JSONs
- drill into underlying job result files only when they are explicitly referenced

For each **job result JSON** you read, extract:
```
jobId                 → top-level field
generatedUtc          → resultJson.meta.generatedUtc
rawCommitHash         → resultJson.meta.executedWebGitCommitHash
promptContentHash     → resultJson.meta.promptContentHash
inputPreview          → top-level field
verdictLabel          → top-level field
truthPercentage       → top-level field
confidence            → top-level field  (scale: 0–100, not 0–1)
status                → top-level field
analysisIssueCode     → top-level field
analysisIssueMessage  → top-level field
warningTypes          → resultJson.analysisWarnings[].type
warningStages         → resultJson.analysisWarnings[].details.stage
```

Flag reports where any of the following are true:
- `status` is not `"SUCCEEDED"`
- `analysisIssueCode` is non-null
- `analysisIssueMessage` is non-null
- `verdictLabel` is `"UNVERIFIED"`
- `confidence` is below `40`
- any `analysisWarnings` entry has severity `"error"`
- `verdictLabel` appears inconsistent with `inputPreview` after a quick high-level check

Build:
```
TARGET-REPORTS[jobId, generatedUtc, promptContentHash, rawCommitHash,
               inputPreview, verdictLabel, truthPercentage, confidence,
               status, issueCode, issueMessage, warningTypes, warningStages]
```

**1c. Normalize runtime provenance:**
`executedWebGitCommitHash` is execution context, not prompt-exact provenance. It may appear as:
- `<40-char-sha>`
- `<40-char-sha>+<8-hex-suffix>`
- `<40-char-sha>+dirty`

For each raw commit hash:
- `COMMIT-HASH` = part before `+`
- `DIRTY-SUFFIX` = part after `+`, else empty
- `DIRTY-STATE` = true if suffix exists, else false

When `DIRTY-STATE` is true, record:
**"Execution hash indicates a dirty full-repo working tree. Git history for code is approximate. Exact prompt blob recovery via `promptContentHash` may still be valid."**

Treat `promptContentHash` as the preferred runtime prompt anchor.

**1d. Structured anomaly scan — before logs:**
For each target report, extract structured failure evidence first:
- `analysisIssueCode` / `analysisIssueMessage`
- `resultJson.analysisWarnings[].details.stage`
- `resultJson.analysisWarnings[].details.errorFingerprint`
- `resultJson.analysisWarnings[].details.errorMessage`
- `resultJson.claimVerdicts[].verdictReason`

Record:
```
REPORT-FINDINGS[jobId, stage, signal, message]
```

If the report already names a stage or failure mode, carry that stage into Phase 2 and Phase 3 even if the log is silent.

**1e. Log scan — corroboration only, not primary diagnosis:**
`apps/web/debug-analyzer.log` is large (60+ MB). Scan by **timestamp minute** and by stage/error keywords identified in 1d.

Minute-window scan:
```bash
grep "2026-<MM>-<DD>T<HH>:<MM>" apps/web/debug-analyzer.log | head -80
```

Stage/error scan using keywords discovered in 1d:
```bash
grep -E "<jobId>|VERDICT_RECONCILIATION|CLAIM_VALIDATION|schema|parse|retry" apps/web/debug-analyzer.log | head -80
```

Look for: `ERROR`, `schema`, `parse`, `contract`, `retry`, `budget`, `Skipping`, prompt section names.

Record:
```
LOG-FINDINGS[jobId, stage, message, timestamp]
```

Note: jobIds appear in the log **only for ERROR-level entries** — successful jobs have no jobId line. If the log has no matches, record `no log corroboration` and continue; this affects finding confidence, not whether the report is target-worthy.

---

## Phase 2 — Build the RAG Corpus (scoped)

Build `KNOWN-ISSUES` scoped to the stages and categories implicated by Phase 1 findings.

**Implicated stages** = any stage named in `REPORT-FINDINGS` or `LOG-FINDINGS`, plus any stage inferable from `analysisIssueCode`, `verdictReason`, or the warning payload.

**2a. Read the Prompt Issue Register:**
Check whether `Docs/AGENTS/Prompt_Issue_Register.md` exists.
- If it exists: read in full and extract
  `KNOWN-ISSUES[id, type, category, description, status, first-seen-commit, last-confirmed-commit, promptHash?, prompt-file?]`
- If it does not exist: proceed with empty corpus

**2b. Scan Role_Learnings.md — narrowly:**
Read `Docs/AGENTS/Role_Learnings.md`.

Include entries where:
- `**Category:**` is `gotcha` or `wrong-assumption`
- OR the entry explicitly describes prompt-runtime drift, schema mismatch, retry behavior, or model-route drift

AND the body mentions at least one of: `prompt`, `schema`, `instruction`, `threshold`, `output format`, `model`, `UCM`, `prompt hash`.

Do **not** include generic architecture advice unrelated to prompting defects.
Add qualifying entries to `KNOWN-ISSUES` with `source=learnings`.

**2c. Scan recent handoffs:**
```bash
ls -t Docs/AGENTS/Handoffs/ | head -5
```
For each file:
- read the `Warnings` and `Learnings` sections only
- also read `Key decisions` **only if** the handoff is clearly about prompt runtime, prompt rollout, UCM drift, schema mismatch, or model-route drift

Extract entries describing: prompt instruction failures, LLM output schema rejections, runtime prompt/file drift, threshold miscalibration, model-route drift without a prompt change.
Add to `KNOWN-ISSUES` with `source=handoff`.

**2d. Emit a compact anchor table:**
Print before proceeding:
```
| ID | Category | 10-word description |
```
If `KNOWN-ISSUES` is empty, print: `KNOWN-ISSUES: empty — all findings will be tagged NEW.`

---

## Phase 3 — Runtime-Anchored Retrieval

**3a. Recover the exact runtime prompt blob (preferred):**
If `promptContentHash` is present, query `apps/web/config.db` first:
```bash
sqlite3 apps/web/config.db "SELECT content FROM config_blobs WHERE content_hash = '<PROMPT-HASH>'"
```

- If the blob is returned → record `PROMPT-COVERAGE = BLOB-EXACT`. Treat that blob as the exact primary prompt content at runtime.
- If `promptContentHash` is present but query returns empty → record `PROMPT-COVERAGE = BLOB-MISSING`. Continue to 3c.
- If `promptContentHash` is absent → record `PROMPT-COVERAGE = NO-PROMPT-HASH`. Continue to 3c.

**3b. Compare runtime blob to current active blob:**
If you recovered a historical blob, query the current active hash for the same config profile:
```bash
sqlite3 apps/web/config.db \
  "SELECT active_hash FROM config_active WHERE config_type='prompt'"
```
This returns one row per profile. Identify the profile relevant to the failing job (e.g., `orchestrated`, `default`).

Then retrieve the current active blob:
```bash
sqlite3 apps/web/config.db \
  "SELECT content FROM config_blobs WHERE content_hash = '<ACTIVE-HASH>'"
```

**Important:** Do NOT compare `sha256sum` of the prompt file to `promptContentHash`. The hash is computed from the **canonicalized** blob content (via `computeContentHash` in `config-schemas.ts`), not the raw file bytes — they will never match.

Compare the historical blob content to the current active blob content directly. Record one of:
- `RUNTIME-STATE = BLOB-MATCHES-CURRENT-ACTIVE` — same prompt running now as at report time
- `RUNTIME-STATE = BLOB-DIFFERS-FROM-CURRENT-ACTIVE` — prompt has changed since report; diff to identify the delta
- `RUNTIME-STATE = CURRENT-ONLY` — blob not recoverable; analysis based on current prompts only

This step is mandatory before concluding that a file edit explains runtime behavior.

**3c. Retrieve commit/history context (secondary):**
Verify the commit exists:
```bash
git cat-file -t <COMMIT-HASH>
```
- If `commit` → proceed
- If not found → record `CODE-COVERAGE = CURRENT-ONLY`

When `DIRTY-STATE` is true, note: **"Git file retrieval is approximate — the job ran with a dirty working tree."**

Use git history for: stage code at run time, model-route context, file-history approximation when the blob is unrecoverable.

**3d. Retrieve implicated prompt file(s) as approximation when needed:**
Use the implicated pipeline profile, not a blind whole-directory scan.

For claimboundary jobs:
```bash
git show <COMMIT-HASH>:apps/web/prompts/claimboundary.prompt.md
```
Enumerate more prompt files only if the target issue implicates: source reliability, text-analysis prompts, or another profile explicitly named in `REPORT-FINDINGS` or `LOG-FINDINGS`.

If using a file approximation because the blob is unrecoverable, record `PROMPT-COVERAGE = COMMIT-APPROXIMATE`.

**3e. Retrieve historical model configuration:**
```bash
git show <COMMIT-HASH>:apps/web/src/lib/analyzer/claimboundary-pipeline.ts \
  | grep -E "getModelForTask|model.*(haiku|sonnet|opus)" | head -20
```
Record which model/task routes were configured at the historical commit. Enables model-drift detection (P11) when the prompt blob is unchanged.

**3f. Retrieve stage code for schema drift (mandatory for P4):**
For every implicated stage:
```bash
git show <COMMIT-HASH>:apps/web/src/lib/analyzer/<stage-name>-stage.ts
```
If the `-stage.ts` variant does not exist, try without the suffix. Also read the **current** stage file. Compare: field names, enum values, expected arrays vs. objects, parser fallback behavior.

Schema drift often does not appear in logs. Do not file P4 without checking the consumer code.

**3g. Diff priority:**
1. exact historical blob vs. current active blob (preferred)
2. exact historical blob vs. current file
3. historical git file vs. current file
4. current active blob vs. current file

Focus on the **implicated rendered sections**, not the full file abstractly.

Record:
```
PROMPT-DIFFS[promptHash?, commit, prompt-file, changed-sections,
             schema-changes, threshold-changes, model-route-changes, runtime-state]
```

---

## Phase 4 — Deficiency Analysis

**Re-print the `KNOWN-ISSUES` anchor table from Phase 2d before starting.** This is the working memory reset.

Before filing a finding, ask:
1. Is the failure already explained by runtime drift, stage parser drift, or model-route drift?
2. If yes, is the prompt still part of the root cause, or only a secondary amplifier?

Classify each finding as:
- `REPORT-SPECIFIC` — explains a specific failure for this input
- `SYSTEMIC` — present in the current active prompt/runtime path regardless of input

Use these twelve categories:

| ID | Category | Detection signal |
|----|----------|-----------------|
| P1 | Instruction ambiguity | Two distinct valid interpretations exist; output/logs support the unintended one |
| P2 | Missing or insufficient constraint | Model produced valid-looking but wrong output that the prompt did not explicitly constrain away |
| P3 | Conflicting instructions | Two instructions cannot both be followed AND no priority rule resolves them |
| P4 | Output schema drift | Prompt output field/type/enum diverges from the TypeScript consumer — requires stage code check |
| P5 | Teaching-to-test or benchmark anchoring | Few-shots, examples, or vocabulary anchored to specific benchmark families, Captain-defined inputs, or named entities instead of generic abstractions |
| P6 | Insufficient reasoning scaffold | High-stakes scored output lacks an explicit comparison, decomposition, reconciliation, or validation step needed for compounding logic |
| P7 | Threshold miscalibration | Numeric threshold appears mis-set relative to repeated outputs or explicit logs; single-run guesses stay LOW |
| P8 | Stage boundary confusion | Prompt references upstream outputs that do not match the actual upstream stage schema or sequence |
| P9 | Section/order bias | Critical rule buried late in the rendered prompt or after a large dynamic payload; consistently ignored with no better explanation |
| P10 | Prompt injection surface | User-controlled or fetched text interpolated into the prompt body without a clear instruction/data boundary |
| P11 | Calibration/model drift | Behavior changed without a material prompt change; model route or provider changed |
| P12 | Register stale-open false match | Finding looks like a known issue but the register entry is too stale or weakly matched to treat as recurring |

**P3 false-positive suppression:** Before filing P3, search the prompt for resolution language: `overrides`, `takes precedence`, `CHECK THIS FIRST`, `if … else`, explicit ordered checklists. If such language resolves the apparent conflict, do not file P3.

For each finding, record:
```
id                → F01, F02, ...
type              → REPORT-SPECIFIC | SYSTEMIC
category          → P1–P12
severity          → PHASE-BLOCKER | HIGH | MEDIUM | LOW
confidence        → CONFIRMED | INFERRED | SPECULATIVE
prompt-file       → filename or prompt profile
section           → rendered section / heading / line range
observed-behavior → what the model/runtime produced
root-cause        → specific hypothesis
historical-commit → COMMIT-HASH or CURRENT-ONLY
prompt-hash       → promptContentHash or unknown
dirty-state       → true/false
already-fixed     → yes | no | partial | unknown
cross-ref         → KNOWN-ISSUES id or NEW
analysis-coverage → BLOB-EXACT | COMMIT-APPROXIMATE | CURRENT-ONLY
runtime-state     → BLOB-MATCHES-CURRENT-ACTIVE | BLOB-DIFFERS-FROM-CURRENT-ACTIVE | CURRENT-ONLY
provenance-basis  → promptContentHash | executedWebGitCommitHash | current-only
```

KNOWN-RECURRING tagging requires all three:
- same category
- overlapping prompt profile or prompt file
- materially similar root cause

Free-text similarity alone is not sufficient.

---

## Phase 5 — Report

Use the finding records from Phase 4 directly. Do not re-derive.

### 5a. Per-report blocks

```
JOB:         <jobId>
PROMPT HASH: <promptContentHash or none> [COVERAGE: BLOB-EXACT / COMMIT-APPROXIMATE / CURRENT-ONLY]
COMMIT:      <COMMIT-HASH> [DIRTY-STATE: yes/no]
INPUT:       <inputPreview>
VERDICT:     <verdictLabel> (truth: <value>, confidence: <value>, status: <status>)
ISSUE:       <analysisIssueCode or none>

STRUCTURED SIGNALS:
  <stage: message> or none

LOG CORROBORATION:
  <stage: message> or none

PROMPT RUNTIME STATE:
  <runtime-state>

PROMPT / MODEL DIFFS:
  <summary> or none

FINDINGS:
  [<id>] P<n> <severity> <confidence> — <prompt-file>, <section>
  Observed:  <observed-behavior>
  Cause:     <root-cause>
  Fixed now: <already-fixed>
  Status:    NEW | KNOWN-RECURRING (<cross-ref>)
```

### 5b. Systemic findings

Table of all `SYSTEMIC` findings, ranked PHASE-BLOCKER → LOW, then CONFIRMED before INFERRED before SPECULATIVE within each band:

```
ID | P-code | Severity | Confidence | Coverage | Prompt:Section | Description | NEW/KNOWN-RECURRING
```

### 5c. Priority fix list

Order: PHASE-BLOCKER → HIGH, then CONFIRMED before INFERRED, then NEW before KNOWN-RECURRING.

Each recommendation must answer three questions as required output fields:

1. **Generic test:** Does this change affect behavior on inputs unlike the failing report?
   - If NO → downgrade to LOW and mark `input-specific — do not implement as written`
2. **Regression test:** Could this cause another input family to regress?
   - If YES → mark `REGRESSION RISK: <input families>`
3. **Runtime test:** Is this a prompt-text fix, or is the real fix prompt rollout / active-blob alignment / stage code change?

Prompt fixes must comply with `AGENTS.md` §Analysis Prompt Rules and §Multilingual Robustness: generic, topic-neutral, multilingual, and free of benchmark, input-specific, or diagnosis-sourced vocabulary.

```
[<id>] <severity> | <prompt-file or runtime path>
Change:           <specific wording or operational change>
Generic test:     <yes/no + reasoning>
Regression test:  <yes/no + at-risk families>
Runtime test:     <prompt-text | prompt-rollout | stage-code | model-route>
Expected:         <behavioral change>
```

---

## Phase 6 — Update the Prompt Issue Register

**6a. Create the register if it does not exist:**
Write `Docs/AGENTS/Prompt_Issue_Register.md` with this header:
```markdown
# Prompt Issue Register

Living register of diagnosed LLM prompting deficiencies. Updated by `/prompt-diagnosis`.
Entries with `status: resolved` are retained for historical context.
Entries not re-confirmed under newer prompt/runtime provenance become `status: unconfirmed`.

---
```

**6b. Append only strong NEW findings:**
Append a finding only if:
- `confidence` is `CONFIRMED`
- OR `confidence` is `INFERRED` AND `analysis-coverage` is not `CURRENT-ONLY`

Do **not** append purely `SPECULATIVE` findings.

For each qualifying NEW finding:
```markdown
## <id> — <category-name> (<P-code>)
- **Type:** REPORT-SPECIFIC | SYSTEMIC
- **Severity:** PHASE-BLOCKER | HIGH | MEDIUM | LOW
- **Confidence:** CONFIRMED | INFERRED
- **Prompt:** `<filename or profile>`, section: `<section>`
- **Prompt hash:** `<promptContentHash or unknown>`
- **Coverage:** BLOB-EXACT | COMMIT-APPROXIMATE | CURRENT-ONLY
- **First seen:** commit `<COMMIT-HASH>` — <generatedUtc date>
- **Last confirmed:** commit `<COMMIT-HASH>` — <this run date>
- **Status:** open
- **Description:** <root-cause>
- **Observed behavior:** <observed-behavior>
- **Recommended fix:** <change from Phase 5c>
```

**6c. Update KNOWN-RECURRING entries:**
- `already-fixed: yes` → set `status: resolved`, add `resolved-at: <COMMIT-HASH or prompt hash>`
- `already-fixed: partial` → add a note to the entry
- KNOWN-RECURRING with `already-fixed: no` → update `last-confirmed`

**6d. Mark stale entries carefully:**
Mark an entry `unconfirmed` only when all are true:
- not re-confirmed in this run
- current targets used newer prompt/runtime provenance than the entry's `last-confirmed`
- the gap is materially newer (>10 commits, or clearly newer prompt hashes)

Do **not** mark stale based on raw commit count alone if the intervening changes are docs-only or unrelated to the analyzer/prompt runtime.

---

## Escalation

- **PHASE-BLOCKER systemic findings** in the current active prompt/runtime path → recommend `/audit`
- **Findings correlate with Captain-defined benchmark or validation families** → recommend `/validate <slug>`
- **`promptContentHash` absent or unrecoverable for all target reports** → recommend strengthening prompt provenance / blob recoverability before relying on `/prompt-diagnosis`
- **All reports show `DIRTY-STATE: true`** → note that code-history diffs are approximate; exact blob recovery via `promptContentHash` may still be valid
- **Current active blob differs from current active file** → recommend blob activation verification (`config_active` vs. `config_blobs`) before concluding a prompt-text edit fixed or caused anything
