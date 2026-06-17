### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Asylum 235000 Evidence Gap Investigation

**Task:** Analyze recent reports for the Captain-approved input "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz" and determine why the recent SEM "Total Personen aus dem Asylbereich" evidence is missing, using job `7333cb1f1ee6472b9c782e94e4aa7b0e` as the primary example.

**Files touched:** `Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Asylum_235000_Evidence_Gap_Investigation.md`; `Docs/AGENTS/Agent_Outputs.md`

**Key decisions:** Treat this as a retrieval/search diagnosis, not a verdict-prompt diagnosis. Across the six newest matching jobs, none include the SEM 2025 commentary PDF URL `stat-jahr-2025-kommentar...` in `resultJson.sources`, even though the public SEM archive page explicitly links it. The primary miss is upstream discoverability: Stage 2 generates only three broad claim-level queries per iteration, searches only eight results per query, and fetches only the top five relevant URLs. In the target run, the debug log shows NZZ, SEM landing pages, press releases, and older SEM PDFs entering the result pool, but never the 2025 archive PDF. Some queries are also served from the seven-day search cache, which can preserve stale ranking for current-statistics lookups. Stage 1 preliminary search adds more noise by seeding evidence from a simple `searchHint` plus truncated-claim query pair, which is how old SEM PDFs like the 2014 commentary enter the pool before the main research loop. Once the direct official total is absent, verdicts vary widely because the report is effectively balancing one NZZ supporting item against a noisy or weak contradiction plus many neutral items.

**Open items:** If this failure mode should become robustly handled, the next work should target retrieval generically: (1) improve query-generation guidance so claims asking for a current total or aggregate population push toward direct primary-source pages, navigational pages, and source-native metric labels rather than only broad topic phrasing; (2) consider a bounded primary-source follow-up expansion when `expectedEvidenceProfile.expectedMetrics` implies a direct total metric but the fetched pool contains only secondary coverage or partial-category fragments; (3) review whether the search cache should be bypassed or tightened for current-statistics claims where stale ranking can suppress newly published primary sources; (4) add a generic regression check for total-population/current-total claims so direct-primary-source retrieval is asserted before verdict quality is judged.

**Warnings:** No production code was changed in this investigation. The direct SEM PDF probe from an ad hoc `tsx` ESM harness failed because `retrieval.ts`'s PDF worker path uses `require` in that harness context; that is not the investigated production failure, because the live pipeline already fetched and extracted other PDFs and the SEM 2025 PDF never entered the job's search pool. The inspected job ran on dirty-state commit `c7a5ed7839e4e380fcb74812935fe94ca09dd2f4+b95e6294`, so commit-only historical reconstruction is approximate. The target job emitted no retrieval-degradation warning beyond an informational evidence-partition note.

**For next agent:** Reproduce from job `7333cb1f1ee6472b9c782e94e4aa7b0e`, then compare `eb7de9adfef6476ca66b68a50faa8178`, `9e8033b9b1ed4990b355f34437d97abc`, `95d5c3ee235845228f04777e42ecd158`, and `9dc205aa6b5142b380bcd27ad51ca4f4`. High-signal code anchors are `apps/web/src/lib/analyzer/research-query-stage.ts`, `apps/web/src/lib/analyzer/research-orchestrator.ts`, `apps/web/src/lib/analyzer/claim-extraction-stage.ts`, `apps/web/src/lib/search-google-cse.ts`, `apps/web/src/lib/search-serper.ts`, and `apps/web/src/lib/search-cache.ts`. Use the external pages from this investigation as empirical evidence only, not as a template for source-specific logic. The crucial empirical facts from this run are: (a) none of the newest matching jobs include the direct annual primary-source document carrying the total, (b) the debug log for the target job shows press releases, landing pages, and older annual documents but not the current annual source, (c) the source publisher's own archive/navigation path does expose the missing document, and (d) verdict variance comes after the direct official total is already missing.

**Learnings:** no

## Evidence Basis

### Direct job evidence

- Primary job inspected: `7333cb1f1ee6472b9c782e94e4aa7b0e`
- Recent comparison jobs: `eb7de9adfef6476ca66b68a50faa8178`, `9e8033b9b1ed4990b355f34437d97abc`, `95d5c3ee235845228f04777e42ecd158`, `9dc205aa6b5142b380bcd27ad51ca4f4`, `5ff87649fa1d4424a886093355c0845f`

Observed across those six jobs:

- `hasSem2025Pdf = 0` for all six
- direct matching evidence is usually limited to the NZZ `235'000` article plus occasional generic SEM landing-page or social-statistics context
- verdicts swing from `TRUE` to `LEANING-FALSE` despite the same missing official total source

### Search / retrieval path confirmed

- Stage 2 query generation in `research-query-stage.ts` is LLM-driven but constrained to `researchMaxQueriesPerIteration` and the current prompt steers toward broad asylum-statistics phrasing.
- `runResearchIteration(...)` in `research-orchestrator.ts` sends `maxResults = maxSourcesPerIteration` (default `8`) into the search layer and then fetches only `relevanceTopNFetch` (default `5`) URLs after relevance scoring.
- `search-google-cse.ts` and `search-serper.ts` pass the raw query through to the provider without any source-host-specific expansion or navigational targeting.
- `search-cache.ts` keeps cached query results for seven days by default, which can preserve stale ranking for repeated current-statistics queries.
- Stage 1 preliminary search in `claim-extraction-stage.ts` still uses a deterministic `searchHint` plus truncated-claim query pair, which helps explain why irrelevant old PDFs enter the seeded pool early.

### External source findings

- `https://www.sem.admin.ch/dam/sem/de/data/publiservice/statistik/asylstatistik/2025/stat-jahr-2025-kommentar.pdf.download.pdf/stat-jahr-2025-kommentar-d.pdf` is live and returns `200 application/pdf`.
- `https://www.sem.admin.ch/sem/de/home/publiservice/statistik/asylstatistik/archiv/2025.html` explicitly links `Kommentierte Asylstatistik 2025 (PDF, 1 MB, 18.02.2026)`.
- `aktuell.html` and `uebersichten.html` expose structured current-statistics assets and official overview files, but the target report never reaches those paths as decisive evidence.
