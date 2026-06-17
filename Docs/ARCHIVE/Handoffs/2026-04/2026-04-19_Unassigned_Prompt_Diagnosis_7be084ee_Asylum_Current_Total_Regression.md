### 2026-04-19 | Unassigned | Codex (GPT-5) | Prompt Diagnosis 7be084ee Asylum Current Total Regression
**Task:** Diagnose why job `7be084ee2c52441894a0d4a5c67213ec` for `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz` no longer finds the decisive current-total evidence that recent successful runs found, identify the exact git/runtime change behind the regression, and assess whether a partial undo is warranted.

**Files touched:** `Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Prompt_Diagnosis_7be084ee_Asylum_Current_Total_Regression.md`, `Docs/AGENTS/Prompt_Issue_Register.md`, `Docs/AGENTS/Agent_Outputs.md`

**Key decisions:** This is prompt-runtime drift, not analyzer code drift. The most relevant comparator is `c95d00114cc54e6da201237d1ab59218` (same input, `MOSTLY-TRUE 78/72`) on clean commit `caa0391479ad0fc46828228cc46b276dea4c188f` with prompt hash `5b34870a0258dc2104294c1babdde0894c9b5e8d2d11c1d79d3382723debcd66`. The failing run `7be084ee2c52441894a0d4a5c67213ec` (`LEANING-FALSE 38/62`) ran on commit `3add5697b2c0f93d0cb348859dea72e8c9a08723+1c3357d6` with prompt hash `53232e79991d6005dbd19415edf0bd9cadafedc39a87c17ee07523acf5a47530`.

Between those two executions, `git diff --stat caa03914..3add5697` over the relevant runtime path shows exactly one changed file:

- `apps/web/prompts/claimboundary.prompt.md` (`5 insertions, 1 deletion`)

There were **no** code changes in:
- `claim-extraction-stage.ts`
- `research-query-stage.ts`
- `research-acquisition-stage.ts`
- `research-orchestrator.ts`
- `verdict-generation-stage.ts`

The runtime blob diff confirms the only prompt change between the good and bad runs was the CH/DE comparative-ecosystem expansion added in three generic sections of `claimboundary.prompt.md`:

1. `CLAIM_EXTRACTION_PASS1` — stricter `searchHint` guidance for comparative institutional/ecosystem claims
2. `CLAIM_EXTRACTION_PASS2` — stronger side-specific institutional evidence profiling guidance
3. `GENERATE_QUERIES` — stronger concrete ecosystem-signal requirement for comparative claims

Those instructions were intended for `Die Schweiz hat kein systematisches Fact-Checking wie Deutschland`, not for the asylum current-total benchmark.

**Observed behavior change:**

- Good run `c95d...`:
  - Preliminary evidence already included a broad current-side signal (`NZZ: ... über 235'000 ...`) plus SEM monitoring.
  - Query set kept the broad official-total route alive: `SEM Asylbereich Bestand aktuell 2024`, `Asylstatistik Schweiz 235000 Personen`, `ZEMIS ... Bestand`.
  - Final sources included the decisive current artifacts: `stat-jahr-2025-kommentar-d.pdf`, 2025 archive pages, and other SEM current-total routes.
  - Verdict: `MOSTLY-TRUE 78/72`.

- Bad run `7be084ee...`:
  - Preliminary evidence regressed to narrow 2024 fragments only (`Asylstatistik 2024` pending/new applications), with no current-total carrier.
  - Query set tilted toward a 2024 under-threshold frame: `SEM Asylstatistik 2024 Gesamtzahl Personen aktuell`, `Asylpersonen ... unter 235000 Dezember 2024`, `... niedrigere Zahlen`.
  - Final sources never recovered the decisive 2025 current-total artifact; they stayed on 2024 yearly commentary plus 2025 monthly snippets and partial category pages.
  - Verdict: `LEANING-FALSE 38/62`.

This pattern strongly suggests **section/order spillover**, not a direct semantic conflict in the asylum rules themselves. The broad-current-total instructions that were already present for this benchmark did not change; instead, unrelated comparative-ecosystem bullets were inserted earlier in the same high-salience sections. The model then followed the prompt less reliably for a different family and drifted toward narrower or component-style current-state framing.

**Diagnosis:**

- `[F01]` `P9 HIGH INFERRED` — `claimboundary.prompt.md`, sections `CLAIM_EXTRACTION_PASS1`, `CLAIM_EXTRACTION_PASS2`, `GENERATE_QUERIES`
  - **Observed:** An unrelated prompt expansion for comparative institutional/ecosystem claims coincided exactly with the regression from a broad current-total path to a narrower 2024/component path on the asylum benchmark.
  - **Cause:** Section-order / prompt-breadth spillover. The added CH/DE bullets live in generic core sections that every input traverses, increasing prompt salience and displacing attention from the pre-existing broad-current-total rules even for inputs where the new bullets are irrelevant.
  - **Fixed now:** no
  - **Status:** NEW

- `[F02]` `P2 MEDIUM INFERRED` — `claimboundary.prompt.md`, sections `CLAIM_EXTRACTION_PASS2`, `GENERATE_QUERIES`
  - **Observed:** Once the run lost the decisive current-total artifact in preliminary evidence, the prompt still allowed the query plan to settle on narrower status fragments and under-threshold framing instead of reasserting the mandatory broad current-total route strongly enough.
  - **Cause:** The current-total guard for broad public-language snapshot claims exists, but it is still too soft to survive unrelated prompt pressure. The model can comply partially by exploring component/status counts without forcefully reacquiring the umbrella total.
  - **Fixed now:** no
  - **Status:** NEW

**Warnings:** There is no useful log corroboration. `apps/web/debug-analyzer.log` had no job-specific evidence for `7be084ee...`, and the structured warnings only show one preliminary fetch network miss on BFS. That network miss does not explain the core regression because the decisive difference is the **query/evidence routing path**, not a total acquisition outage.

**Recommended fix direction:** A **partial undo / narrowing** of `3add5697` is more defensible than piling on more prompt text. Do not revert the CH/DE intent outright; instead:

1. Compress or relocate the comparative-ecosystem bullets so they apply more narrowly and with less generic-section spillover.
2. Preserve the original reason for `3add5697` by keeping the comparative-ecosystem safeguards, but move them behind a short, tightly scoped conditional block rather than several new bullets in the core generic path.
3. Strengthen the existing broad-current-total guard slightly so that for thresholded `current_snapshot` population claims, the umbrella total must remain the primary reacquisition target even after narrow or component evidence appears.

This is the cleanest way to address both:
- the reason for the CH/DE change
- the newly observed asylum regression

**For next agent:** Start with runtime blobs `5b34870a...` vs `53232e79...` from `apps/web/config.db`, not the current working file. Compare `c95d00114cc54e6da201237d1ab59218` against `7be084ee2c52441894a0d4a5c67213ec`. If implementing, prefer a **narrow prompt rewrite** over new code. The main test of success is whether the next exact rerun restores discovery of `stat-jahr-2025-kommentar-d.pdf` or an equivalent current SEM umbrella-total artifact while leaving the CH/DE comparative ecosystem behavior intact.

**Learnings:** When a benchmark family regresses even though its own prompt rules did not change, first suspect generic-section spillover from unrelated prompt additions. A small prompt expansion in shared high-salience sections can degrade another family without any analyzer code change.
