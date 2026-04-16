### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Stage 2 Primary-Source Refinement Fresh Live Verification

**Task:** Restart the local stack, rerun the Captain-approved asylum input on the current head, and verify from stored job telemetry whether Stage 2 primary-source refinement actually activates in a real job.

**Files touched:**
- Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Stage2_Primary_Source_Refinement_Fresh_Live_Verification.md
- Docs/AGENTS/Agent_Outputs.md

**Done:**
- Restarted the local stack with `scripts/restart-clean.ps1`, then verified health via `scripts/health.ps1` after the API needed a few extra seconds to bind.
- Submitted a fresh local job for the approved input `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz` using the current API request shape (`inputType`, `inputValue`). New job ID: `ad4c0c1ba8bc4094849d2e3e9e0b1ef9`.
- Tracked the run through persisted SSE job events from `Job created` through `Done`, confirming the live path executed fully on commit `6bfffbba4750e74639a44a0266721b223172af1e`.
- Extracted the stored result directly from `/v1/jobs/ad4c0c1ba8bc4094849d2e3e9e0b1ef9` after completion.
- Measured the stored focus counts for the fresh run: `preliminary=2`, `main=3`, `contradiction=3`, `contrarian=2`, `refinement=0`.
- Verified that `claimAcquisitionLedger.AC_01.iterations` still contains only `main`, `contradiction`, and `contrarian` entries, all with empty `laneReason`, so the new refinement telemetry path still did not activate live.
- Compared the fresh run against the earlier rerun `6aa4dc3e2c2d46f99fe83544b214c546` and the earlier stronger current-code run `141cfe945d8540caaddb970d271317f2`.

**Key decisions:**
- Treated persisted `searchQueries.focus` counts and `claimAcquisitionLedger` entries as the authoritative signal for refinement activation, not the UI or the broad debug log.
- Used the SSE job-events endpoint only to confirm live stage progression; conclusions were based on the stored job record after `SUCCEEDED`.
- Compared against both prior live baselines because `6aa4dc...` represents the immediately previous no-refinement rerun while `141cfe...` remains the stronger current-code source-pool reference.

**Open items:**
- The fresh live run still shows **no refinement activation**: no `refinement` search focus and no `primary_source_refinement:*` `laneReason`.
- The exact 2025 SEM commentary PDF still did not appear.
- The 2025 SEM archive page from `141cfe...` still did not reappear in the fresh run.

**Warnings:**
- This rerun improved breadth relative to `6aa4dc...` without proving the refinement slice works. Fresh run `ad4c0c...` recovered `24` sources and added a `contrarian=2` focus, but refinement remained `0`.
- Verdict drift across the same approved input remains material even on current code: `141cfe...` = `MIXED | 45 | 48`, `6aa4dc...` = `MOSTLY-TRUE | 75 | 60`, `ad4c0c...` = `LEANING-TRUE | 60 | 60`.
- The fresh official SEM URLs improved from four in `6aa4dc...` to six in `ad4c0c...`, but still exclude the 2025 archive page and exact annual-total commentary PDF that motivated the refinement work.

**For next agent:**
- Fresh verification result: job `ad4c0c1ba8bc4094849d2e3e9e0b1ef9` completed `SUCCEEDED` on commit `6bfffbba4750e74639a44a0266721b223172af1e` with verdict `LEANING-TRUE | 60 | 60`, source count `24`, and focus counts `preliminary=2`, `main=3`, `contradiction=3`, `contrarian=2`, `refinement=0`.
- `claimAcquisitionLedger.AC_01.iterations` has three entries only: `main`, `contradiction`, `contrarian`; every `laneReason` is null. That means the persisted refinement branch still did not fire in a real run.
- Compare these three runs first before changing Stage 2 again:
  - `141cfe945d8540caaddb970d271317f2` — `24` sources and includes `https://www.sem.admin.ch/sem/de/home/publiservice/statistik/asylstatistik/archiv/2025/10.html`
  - `6aa4dc3e2c2d46f99fe83544b214c546` — `13` sources, no refinement, narrower official-source pool
  - `ad4c0c1ba8bc4094849d2e3e9e0b1ef9` — back to `24` sources and six SEM URLs, but still no refinement and no 2025 archive/PDF
- Highest-value next step remains inspecting the actual live `GENERATE_QUERIES` structured output for this claim family to determine why refinement metadata is still absent or not leading to the refinement branch.

**Learnings:**
- Yes. Live reruns can recover source-pool breadth without any recorded refinement activation, so `sourceCount` improvements alone are not evidence that the refinement slice is working. The decisive checks are persisted `searchQueries.focus === "refinement"` and `claimAcquisitionLedger[*].laneReason`.

**Next:**
1. Inspect live `GENERATE_QUERIES` outputs for `ad4c0c...` versus `141cfe...` to confirm whether `retrievalLane` and `freshnessWindow` are missing, malformed, or stripped before orchestration.
2. If metadata omission is confirmed, tighten structured-output adherence at the query-generation boundary instead of adding deterministic retrieval heuristics.
3. Re-measure the same approved asylum input only after that prompt/output enforcement change lands.

