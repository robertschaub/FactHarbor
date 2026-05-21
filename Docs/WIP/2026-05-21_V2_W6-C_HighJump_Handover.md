# W6-C High-Jump Phase 1 — Agent Handover

**Date:** 2026-05-21
**Plan:** `C:\Users\rober\.claude\plans\velvety-stargazing-lightning.md`
**Workstream:** Captain Deputy W6-C retrieval-quality
**Skills active:** `/captain-deputy`, `/steer-co`

---

## 1. Captain's Standing Instructions (BINDING)

### The Core Directive
> "Lower the bars so that the chance is high to get results, then raise the bars
> step by step — but only where a higher bar is really needed."

This means **ALL blocking gates** on the path to W6-C must be loosened, not just
the prompt. The Captain was explicit: "Obviously to lower the bar there are code
changes needed!"

### Expanded Authority (Still Binding)
- "The Steer-Co is authorized to authorize anything that is naturally needed to
  complete the plan, including prompt, schema changes and job submission, up to
  20 jobs budget."
- "If cost/benefit is good and Steer-Co has consent, proceed without Captain
  escalation."
- "Don't stop if there is no captain escalation. Instead of giving me a prompt
  for lead developer, you can call Lead Developer agent directly!"

### Security Constraints (Still Binding)
- All standing rules from AGENTS.md apply.
- Projected enum pairs must NOT be exposed in public behavior, final reports,
  user-facing outputs, provider scoring, or downstream claim adjudication.
- `redaction.sufficiencyResultPayloadReturned` must stay `false`.
- Forbidden: model/config/UCM/gateway policy changes, route/sink/artifact
  creation, public/default-admin behavior, provider expansion, W7/W8 gate
  changes, V1 work.
- `.env.local` contains API keys — never expose.

---

## 2. What Was Done (Commits on main)

| Commit | Description |
|--------|-------------|
| `0c44d391` | **Prompt change** — recalibrated W6-C sufficiency gate wording in `claimboundary-v2.prompt.md` line 469. Removed "Internal Alpha visibility does not lower the sufficiency bar", made `caveat_report` default when probative evidence exists, narrowed `refine_retrieval` to impossibility only, added status/action pairing guidance. |
| `264b0b6f` | **Test fix** — updated prompt contract test assertions in `prompt-contract.test.ts` lines 152-154 to match new prompt text. |
| `ed639a1a` | **W4A/W4C dedup** — `source-material-readiness.ts` now skips (deduplicates) records with identical `sourceMaterialTextHash` instead of blocking the entire batch. `source-material-admission.ts` loosened to accept `admittedCount < sourceMaterialRecordCount` (was strict equality). Updated test. |
| `fc5e7f8e` | **W4G/shell dedup** — Same dedup pattern applied to `bounded-text-authorization.ts` and `evidence-corpus-shell.ts`. |

### Files Changed

| File | What Changed |
|------|-------------|
| `apps/web/prompts/claimboundary-v2.prompt.md` | Line 469 replaced (prompt recalibration) |
| `apps/web/test/unit/.../prompt-contract.test.ts` | Lines 152-154 assertions updated |
| `apps/web/src/.../source-material-readiness.ts` | Lines 590-612: duplicate textHash → skip instead of block; empty-result guard |
| `apps/web/src/.../source-material-admission.ts` | Lines 523-531: `admittedCount < sourceMaterialRecordCount` now OK (was `===`) |
| `apps/web/src/.../bounded-text-authorization.ts` | Line 598: duplicate textHash → `continue` instead of `return failure` |
| `apps/web/src/.../evidence-corpus-shell.ts` | Line 553: same dedup pattern + empty-result guard |
| `apps/web/test/.../source-material-readiness.test.ts` | Removed old blocking test, added dedup test |

### Plan Steps Completed

1. Edit prompt — DONE (`0c44d391`)
2. Debate with implementing team — DONE (Lead Developer APPROVED WITH NOTES)
3. Steer-Co approval — DONE (full 3-model panel: Leader + GPT-5.5 + Gemini
   3.1 Pro Preview, all SUPPORT with confirmed confidence)
4. Commit — DONE
5. Canary run 1 — **DONE, VALIDATED** (see section 3)
6. Canary run 2 — **PARTIAL** (ran but artifacts not captured, see section 4)
7. Record results — IN PROGRESS

---

## 3. Canary Validation Results

### Canary Slot 19: `099eb05cbbca408a87f7168327926762` — VALIDATED

Full internal artifacts retrieved and saved at:
`C:\Users\rober\AppData\Local\Temp\v2-artifacts-099eb05c.json`

**Success criteria check:**

| Criterion | Expected | Actual | Pass? |
|-----------|----------|--------|-------|
| `assessmentStatus` | `sufficiency_assessment_completed` | `sufficiency_assessment_completed` | PASS |
| `sufficiencyResultStatus` | — | `accepted` | PASS |
| `reportStopRecommendation` | `caveat_report` or `continue_to_boundary_formation` | **`caveat_report`** | PASS |
| `boundaryVerdictCandidateStatus` | past `blocked` | `boundary_verdict_candidate_ready` | PASS |
| `admittedEvidenceItemCount` | >0 | 6 | PASS |

**Additional observations:**
- W7 boundary verdict execution status: `boundary_verdict_execution_damaged` —
  expected because W7 LLM task not approved (`candidatePopulation:
  "closed_until_llm_task_approved"`). Pipeline correctly progressed past W6-C.
- Provider: `anthropic / claude-haiku-4-5-20251001`
- Tokens: 12644 input, 3545 output, 16189 total
- Duration: 32323ms (2 schema retries)
- `warningMaterialityInputs.upstreamRecommendedNextAction: "caveat_report"` —
  confirms the prompt change reached the LLM and changed its routing decision.
- No integrity events on sufficiency assessment.

### Canary Slot 20: `68a4fa4fa99f48c18679e9b68e3ff344` — INCOMPLETE

Job SUCCEEDED (public precutover envelope OK) but internal artifacts were NOT
recorded at the report-result level. Evidence corpus readiness (W4) and bounded
evidence extraction (W5) artifacts exist — so the pipeline got past W4/W5 but
a runtime error was swallowed by the `catch` block at `orchestrator.ts:411`
somewhere in the sufficiency/boundary-verdict path. This is intermittent — the
first canary worked fine.

### Prior Canaries (Context)

| Slot | Job ID | Outcome |
|------|--------|---------|
| 16 | `1702d507...` | W4A blocked (duplicate textHash) — before dedup fix |
| 17 | `64a360ac...` | W4A blocked (duplicate textHash) — before dedup fix |
| 18 | `cbed5874...` | SUCCEEDED but artifacts lost (server restarted during debugging) |
| 19 | `099eb05c...` | **VALIDATED** — `caveat_report`, all criteria pass |
| 20 | `68a4fa4f...` | SUCCEEDED but W8 artifact not recorded (runtime error swallowed) |

---

## 4. What Remains

### Immediate: Second Validation Canary

The plan requires 2 successful canaries for stability validation. We have 1
validated (`099eb05c`). The second canary (`68a4fa4f`) ran but its artifacts
weren't fully captured due to an intermittent runtime error.

**Decision needed:** Per the plan's failure response: "1/2 pass → use 1 reserve
slot for tie-breaker." We are at budget 20/20, so either:
- (a) Accept 1 validated canary as sufficient (the prompt change clearly works —
  `caveat_report` instead of `refine_retrieval`), or
- (b) Submit another canary beyond the 20-slot budget (requires Captain approval).

### Record Results

Update `Docs/WIP/2026-05-21_V2_W6-C_HighJump_Phase1_Canary_Result.md` with
the validated `099eb05c` results and close out Phase 1.

---

## 5. How to Submit V2 Canaries

```powershell
# Submit
$body = @{
  inputType = "text"
  inputValue = "Using hydrogen for cars is more efficient than using electricity"
  inviteCode = "<local invite code>"
  pipelineVariant = "claimboundary-v2"
} | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:5000/v1/analyze' `
  -Method Post -Body $body -ContentType 'application/json'

# IMPORTANT: Trigger runner pickup (job stays QUEUED without this!)
Invoke-RestMethod -Uri 'http://localhost:3000/api/internal/run-job' `
  -Method Post `
  -Body (@{ jobId = "<jobId>" } | ConvertTo-Json) `
  -ContentType 'application/json' `
  -Headers @{ 'x-runner-key' = $env:FH_INTERNAL_RUNNER_KEY }

# Check status
Invoke-RestMethod -Uri 'http://localhost:5000/v1/jobs/<jobId>'

# Fetch V2 internal artifacts (in-memory, lost on server restart!)
Invoke-WebRequest `
  -Uri 'http://localhost:3000/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-result-artifacts?ledgerId=<jobId>:precutover-observability' `
  -Headers @{ 'X-Admin-Key' = $env:FH_ADMIN_KEY }
```

### Critical Pitfalls (Learned the Hard Way)
1. **Must use `pipelineVariant: "claimboundary-v2"`** — default routes to V1.
2. **Must trigger runner** via `POST /api/internal/run-job` with
   `x-runner-key` from the local environment — otherwise job sits QUEUED at 8%
   indefinitely.
3. **Artifacts are in-memory only** — fetch immediately after job completes.
   Server restart = artifacts lost forever.
4. **Use the canonical claim text exactly**: "Using hydrogen for cars is more
   efficient than using electricity" (no variations).
5. **Fail stuck jobs** via: `PUT http://localhost:5000/internal/v1/jobs/<id>/status`
   with body `{"status":"FAILED","level":"error","message":"reason"}`.

---

## 6. Key Architecture Notes

### V2 Pipeline Path
`execution-selection.ts` routes `requestedVariant === "claimboundary-v2"` to
V2 shell. Requires `FH_ANALYZER_V2_SHELL=enabled` in `.env.local`.

### Precutover Envelope
V2 ALWAYS returns a "damaged" precutover envelope publicly (`shellOnly: true`,
`analysisIssueCode: "report_damaged"`). Real analysis results are stored as
internal runtime artifacts in an in-memory global
(`__factHarborV2InternalAlphaReportResultArtifactLedgers`).

### W6-C Sufficiency Assessment Flow
1. `sufficiency-intake.ts` — packages evidence items for assessment
2. `sufficiency-assessment.ts` — runs LLM with prompt from
   `claimboundary-v2.prompt.md`
3. LLM returns `reportStopRecommendation`: one of `continue_to_boundary_formation`,
   `caveat_report`, `refine_retrieval`, `damage_report`
4. `boundary-verdict-candidate.ts:387-393` — `sufficiencyStopReason()` returns
   `null` for `caveat_report` (pipeline continues) or a stop reason for
   `refine_retrieval`/`damage_report` (pipeline blocks)

### Duplicate TextHash Dedup (Our Code Change)
Four gates previously blocked on duplicate `sourceMaterialTextHash`:
- W4A: `source-material-readiness.ts:598`
- W4C: `source-material-admission.ts:523-531`
- W4G: `bounded-text-authorization.ts:598`
- W4D: `evidence-corpus-shell.ts:553`

All four now skip duplicates (continue) instead of blocking (return failure).
Duplicate `sourceMaterialId` still blocks (data integrity).

---

## 7. Server State

- **API:** port 5000 (ASP.NET Core). No health endpoint — 404 on `/v1/health`
  is normal.
- **Web:** port 3000 (Next.js dev server). Should be running.
- **Admin key:** local environment value only (header: `X-Admin-Key`)
- **Runner key:** local environment value only (header: `x-runner-key`)
- **Invite code:** local development invite code only

---

## 8. Budget

| Resource | Used | Remaining |
|----------|------|-----------|
| Canary slots | 20 of 20 | 0 |
| Steer-Co sessions | 2 (quota-6 reconvention + Phase 1 approval) | Captain authority |

---

## 9. Test Suite Status

Full suite: **493 tests pass** across 67 files. No regressions from the 4
commits. Two flaky tests (unrelated network/timing) noted in prior session.

Run: `npm test` from repo root.

---

## 10. Uncommitted Files

- `Docs/WIP/2026-05-21_V2_W6-C_HighJump_Phase1_Canary_Result.md` — WIP doc
  from prior session, needs updating with `099eb05c` validated results.
- This handover document.
