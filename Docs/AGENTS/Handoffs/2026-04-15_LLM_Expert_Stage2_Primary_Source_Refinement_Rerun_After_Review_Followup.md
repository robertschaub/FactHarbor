### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Stage 2 Primary-Source Refinement Rerun After Review Follow-up

**Task:** Re-run the Captain-approved asylum input after the Stage 2 review-follow-up changes and inspect whether the new refinement telemetry or refinement-focused retrieval path activates in a real job.

**Files touched:**
- Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Stage2_Primary_Source_Refinement_Rerun_After_Review_Followup.md
- Docs/AGENTS/Agent_Outputs.md

**Done:**
- Restarted the local stack with `scripts/restart-clean.ps1` and confirmed API/web availability.
- Submitted a fresh local job for the approved input `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz` via `POST /v1/analyze` using the local admin key. New job ID: `6aa4dc3e2c2d46f99fe83544b214c546`.
- Tracked the run through persisted job events and the analyzer log from Pass 1 through Stage 5. The job completed successfully at `2026-04-15 20:15:11.7268979`.
- Extracted the stored result directly from SQLite after completion.
- Measured the stored query focus counts for the new run: `preliminary=2`, `main=3`, `contradiction=3`, `refinement=0`.
- Verified that the completed result contains no stored `refinement` queries and no separate refinement iteration in `claimAcquisitionLedger.AC_01.iterations`; only one `main` iteration and one `contradiction` iteration are present, both with empty `laneReason`.
- Extracted the persisted official SEM/asylstatistik URLs from the new run. The final source pool contains:
  - `https://www.sem.admin.ch/sem/de/home/publiservice/statistik/asylstatistik.html`
  - `https://www.sem.admin.ch/dam/sem/de/data/publiservice/statistik/asylstatistik/2014/stat-jahr-2014-kommentar-d.pdf`
  - `https://www.sem.admin.ch/dam/sem/de/data/publiservice/statistik/asylstatistik/2024/stat-jahr-2024-kommentar.pdf`
  - `https://www.sem.admin.ch/sem/de/home/asyl/asylverfahren.html`
- Compared that result with the earlier completed current-code run `141cfe945d8540caaddb970d271317f2`.

**Key decisions:**
- Used SQLite JSON extraction for the final measurement instead of relying on the large API payload. That made the query-focus counts, claim-acquisition ledger, and official-source URL comparison explicit and repeatable.
- Treated persisted `searchQueries` / `claimAcquisitionLedger` as the authoritative signal for whether refinement activated. Debug-log absence alone is not strong enough because some warnings may not be mirrored there.

**Open items:**
- The new rerun still shows **no stored refinement activation**. There are zero `refinement` search queries and no refinement ledger entry despite the review-follow-up telemetry additions.
- The new rerun did **not** persist the 2025 SEM archive page that one earlier current-code run managed to persist.
- The exact 2025 commentary PDF still did not appear.

**Warnings:**
- The new rerun is not just a non-fix; relative to the earlier current-code run `141cfe945d8540caaddb970d271317f2`, it regressed in source-pool breadth. Earlier run: `24` persisted sources and included `https://www.sem.admin.ch/sem/de/home/publiservice/statistik/asylstatistik/archiv/2025/10.html`. New rerun: `13` persisted sources and no 2025 archive page.
- The top-level verdict also shifted materially between current-code runs despite the same approved input. Earlier run `141cfe...`: `MIXED | 45 | 48`. New rerun `6aa4dc...`: `MOSTLY-TRUE | 75 | 60`. This reinforces that the retrieval/output path is still unstable for this input family.

**For next agent:**
- The strongest current conclusion is: the review follow-up did **not** produce observable live refinement activation on the approved asylum input. The stored result for `6aa4dc3e2c2d46f99fe83544b214c546` still has only `preliminary/main/contradiction` focus counts and no refinement telemetry entry.
- Compare these two current-code runs first before changing code again:
  - Earlier current-code run with better official-source persistence: `141cfe945d8540caaddb970d271317f2`
  - Fresh rerun after review follow-up: `6aa4dc3e2c2d46f99fe83544b214c546`
- Highest-value next step is to inspect the actual LLM output for `GENERATE_QUERIES` in the live path and determine whether `retrievalLane` / `freshnessWindow` are being omitted before orchestration can trigger refinement.

**Learnings:**
- Yes. The new stored telemetry is useful only if the branch actually fires. When real jobs still show `refinement=0`, the key remaining gap is live prompt/output adherence, not more downstream routing code.

**Next:**
1. Inspect prompt provenance or captured query-generation output for the two current-code runs to confirm whether refinement metadata was absent, malformed, or stripped before orchestration.
2. If metadata omission is confirmed, tighten structured-output enforcement at the query-generation boundary rather than adding deterministic heuristics.
3. Re-measure the same approved asylum input again only after that tighter prompt/output enforcement is in place.
