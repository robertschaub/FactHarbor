---
roles: [Unassigned]
topics: [atomic_claim_selection, acs_1, live_validation, bundesrat, acceptance_failure]
files_touched:
  - Docs/AGENTS/Handoffs/2026-04-22_Unassigned_ACS1_Live_Acceptance_Validation_Bundesrat_Failure.md
---

### 2026-04-22 | Unassigned | Codex (GPT-5) | ACS-1 Live Acceptance Validation — Bundesrat Anchor Failed
**Task:** Continue ACS-1 acceptance validation on the live local stack using Captain-approved inputs and determine whether the draft-preparation path and cold-start path produce matching candidate sets.
**Files touched:** `Docs/AGENTS/Handoffs/2026-04-22_Unassigned_ACS1_Live_Acceptance_Validation_Bundesrat_Failure.md`
**Key decisions:** I stopped after the first approved anchor once it produced a clear blocker. I did **not** run the spec’s Iran/WMD anchor because that input is not in the current Captain-approved list in `AGENTS.md`. I used the approved Bundesrat input `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben` on the live local stack (`git_sha` reported by `/api/fh/version`: `b64bebf4b9b57d11f9715ee46d02dfd2c18b1cbb+643b1abc`; dirty suffix came from docs/test-only local changes, not runtime code edits). First I created an ACS automatic draft. The draft completed and auto-confirmed into job `a8a3a633e6cc4e40bf200dab471302f0`. That job correctly persisted `claimSelectionDraftId`, `preparedStage1Json`, and `claimSelectionJson`, and its event trail includes `Reusing prepared Stage 1 snapshot...`, which confirms the prepared-job reuse seam is working. I then submitted a fresh cold-start job on the exact same input: `5dc2089fb984461bbb6dbf2ae18f2765`. The cold-start job succeeded on the same runtime hash.
**Verification:** Live API calls against `http://localhost:5000` with `X-Admin-Key`. Draft: `31d63ed5056a4fccb7a698cb3b643323` → `COMPLETED` with `finalJobId = a8a3a633e6cc4e40bf200dab471302f0`. Prepared job `a8a3a633e6cc4e40bf200dab471302f0` event history showed `Reusing prepared Stage 1 snapshot...` and `claimSelectionDraftId = 31d63ed5056a4fccb7a698cb3b643323`. Cold-start job `5dc2089fb984461bbb6dbf2ae18f2765` event history showed the full cold-start Stage 1 path (`Extracting claims from input...`, Pass 1, salience audit, preliminary search, Pass 2, contract validation, atomicity validation, Gate 1). Final live comparison:

- Draft Stage 1 candidate count: `1`
- Draft Stage 1 candidate statement: `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig, bevor Volk und Parlament darüber entschieden haben.`
- Cold-start Stage 1 candidate count: `2`
- Cold-start candidate statements:
  - `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig, bevor das Volk darüber entschieden hat.`
  - `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig, bevor das Parlament darüber entschieden hat.`

This is an **acceptance failure** relative to spec section 12.4: the same approved Bundesrat anchor did **not** produce an identical candidate set through the draft-preparation path and the cold-start path.
**Open items:** Bolsonaro and any further live ACS anchors remain unrun. Given the Bundesrat parity failure, continuing without first deciding whether this is acceptable stochastic variance or a blocker would not be efficient. The next useful step is investigation, not more acceptance-anchor execution.
**Warnings:** The failure does **not** indicate that prepared-job reuse is broken. Prepared-job reuse worked correctly. The divergence appears earlier: two independent Stage 1 executions on the same input and same runtime produced different candidate sets. In other words, the ACS-1 seam is sound, but Stage 1 candidate-set stability is not currently acceptance-safe for this anchor. Any planning that assumes “draft preparation and cold-start are equivalent in candidate output” should now treat that as disproven on current code/runtime until investigated.
**For next agent:** Start from the live artifacts above. Compare the draft-prepared understanding (`preparedStage1Json` on job `a8a3a633e6cc4e40bf200dab471302f0`) against the cold-start `resultJson.understanding` on job `5dc2089fb984461bbb6dbf2ae18f2765`. The most likely seam is Stage 1 extraction stability around single-claim atomicity / split behavior (`Volk und Parlament` kept as one claim vs split into two claims). Do not proceed to `ACS-CW-1` or UI acceptance claims until this is triaged.
**Learnings:** no — not appended to `Docs/AGENTS/Role_Learnings.md`.
