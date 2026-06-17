---
roles: [Senior Developer, LLM Expert]
topics: [bundesrat, live-rerun, jobs-page, sse, stage1, repair-anchor]
files_touched:
  - apps/web/src/lib/analyzer/claim-extraction-stage.ts
  - apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts
  - apps/web/src/app/jobs/[id]/page.tsx
---

# Senior Developer + LLM Expert Handoff

## Task

Follow up the Bundesrat root-cause fix by running a fresh local rerun of the exact Captain-defined input and fixing the second issue found during investigation: the job page events stream behavior on `/jobs/[id]`.

## Done

- Confirmed the Stage 1 structural fix remains in place and is the dominant root-cause fix for the prior `report_damaged` / zero-boundary failures:
  - `apps/web/src/lib/analyzer/claim-extraction-stage.ts:581-589` protects repair-approved anchor carriers before centrality capping.
  - `apps/web/src/lib/analyzer/claim-extraction-stage.ts:2261-2350` extends `filterByCentrality(...)` so required repaired carrier claims survive the cap.
  - `apps/web/src/lib/analyzer/claim-extraction-stage.ts:2413-2502` restores repair-approved anchor carriers after Gate 1 structural filtering and keeps the repaired-contract state authoritative.
- Preserved regression coverage for the Bundesrat-style failure path:
  - `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts:714-719` covers required repair carriers surviving centrality capping.
  - `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts:8762-8939` reproduces and protects the repaired-anchor-carrier Bundesrat path through Stage 1.
- Fixed the job page SSE gating bug in `apps/web/src/app/jobs/[id]/page.tsx:910-928`:
  - the page now waits until `job.status` is loaded before opening `EventSource`
  - terminal jobs (`SUCCEEDED`, `FAILED`, `CANCELLED`, `INTERRUPTED`) do not open `/api/fh/jobs/[id]/events` at all
  - the effect depends on `job?.status`, not the full `job` object, so active jobs do not tear down and recreate the SSE stream on every 10-second detail poll
- Ran a fresh local rerun for the exact Captain-defined input:
  - input: `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben`
  - job id: `a2642a8d42ac4149a5fef7d10529a777`
  - final status: `SUCCEEDED`
  - final verdict: `LEANING-TRUE | 71 | 79`
  - report shape observed on the live job page: `43` evidence items, `18` sources, `5` ClaimAssessmentBoundaries
  - this run reached Stage 4 / verdict generation and completed cleanly instead of collapsing into `report_damaged`
- Browser-validated the SSE behavior:
  - completed report page `ea0238551af44a9793d27afa0fde5cb0` no longer initiates `/api/fh/jobs/[id]/events` on load after the final gating fix

## Decisions

- Kept the SSE fix client-side and minimal. The problem was primarily the page lifecycle: terminal pages were opening a stream before status was known, and the first refinement accidentally re-opened the stream on every poll by depending on the full `job` object.
- Did not change the API-side SSE endpoint. The current evidence showed the immediate defect was subscription policy on the Next.js job page, not the controller's long-poll loop itself.
- Used the repo's normal local submission path (`SELF-TEST` invite code via `http://localhost:5000/v1/analyze`) for the rerun instead of bypassing invite enforcement.

## Warnings

- The fresh Bundesrat rerun succeeded, which resolves the dominant local hard-failure mode, but the verdict still landed high (`LEANING-TRUE 71/79`) relative to the benchmark's preferred healthy band. The root-cause failure is fixed; verdict calibration for the legal qualifier may still deserve separate review.
- A completed active-job page can still show one final aborted `/events` request at transition time when the browser closes the live stream after terminal status is detected. The repeated terminal-page subscription noise is fixed; one cleanup abort may still appear in browser diagnostics.
- Direct local SQLite inspection through Node remains blocked on this workstation by the pre-existing `better-sqlite3` ABI mismatch, so this follow-up continued to rely on API/browser inspection.

## Learnings

- For `/jobs/[id]`, SSE must be gated on a loaded `job.status`, not merely `jobId` visibility. Otherwise terminal pages open one unnecessary stream before details load.
- For active jobs, the SSE effect must depend on `job?.status`, not the full `job` object. Using the full object causes reconnect churn every time the detail poll updates progress or timestamps.
- The repaired-anchor Stage 1 fix is now validated by a real local rerun: the exact Bundesrat input progressed through research, clustering, and verdict generation rather than failing in Stage 1.

## For next agent

1. Decide whether the fresh local outcome `LEANING-TRUE 71/79` for job `a2642a8d42ac4149a5fef7d10529a777` is acceptable for the benchmark family or whether the legal-qualifier handling still needs calibration work.
2. If the user still wants deployed comparison, run the exact Captain-defined Bundesrat input against the freshly deployed system and compare it directly with local job `a2642a8d42ac4149a5fef7d10529a777`.
3. If browser diagnostics still matter, inspect whether the final one-shot abort on stream teardown is worth suppressing or merely documenting as expected cleanup behavior.
