# Report Quality Baseline Test Plan

**Created:** 2026-03-12
**Author:** Senior Developer (Claude Opus 4.6)
**Status:** APPROVED
**Prerequisites:** `Report_Quality_Criteria_Scorecard_2026-03-12.md` (scoring criteria + historical data)

---

## 1. Objective

Establish where current HEAD stands on report quality, using the scoring criteria from the Scorecard. Then determine whether the deployed Mar 8 quality peak (90% Bolsonaro PT) was due to code state, input language, or LLM variance.

---

## 2. Approach: HEAD-First, Worktree-If-Needed

### Phase 1: Current HEAD (no worktree)

Run 4 claims on the current local dev server (HEAD). This costs ~$2-4 and requires no worktree setup.

| Run | Claim | Language | Key Question |
|-----|-------|----------|-------------|
| H1a | "Os julgamentos de Bolsonaro foram conduzidos de acordo com a lei brasileira e os padrões internacionais de due process?" | PT | Does HEAD+Portuguese match the deployed 90%? (Language confound test, run 1 of 2) |
| H1b | Same as H1a | PT | Repeat of H1a for stability measurement. Gate uses mean of H1a+H1b. |
| H3 | "Were the various Bolsonaro trials conducted in accordance with Brazilian law and international standards of due process?" | EN | Baseline for EN Bolsonaro on current code. Compare to 13 historical local runs (60-85%). |
| H4 | "Immer mehr Kinder im Kanton Zürich sind von Migration betroffen" | DE | German baseline on current code. Compare to 8 historical local runs (50-75%). |

**Why no hydrogen claim:** The Scorecard §7.5 attributes the 16%/76% hydrogen divergence to "likely different input phrasing." The exact deployed input text is unconfirmed, making this claim a weak diagnostic. A second PT Bolsonaro run (H1b) strengthens the language confound measurement — the most important open question.

### Phase 1 Evaluation

Score each run using:
- **G1-G6** (General criteria, Scorecard §1) for all runs
- **B1-B7** (Bolsonaro-specific criteria, Scorecard §2) for H1 and H3

### Phase 1 Decision Gate

Gate uses **mean of H1a + H1b** (not a single run). H3 is an independent secondary trigger.

**Primary gate (H1 mean):**

| H1 Mean | Interpretation | Next Step |
|---------|---------------|-----------|
| ≥80% | Portuguese input is the main factor, not code state | No worktree needed. Focus on why EN underperforms PT. |
| 75-79% | Borderline — could be LLM variance or minor regression | No worktree yet. Check H1a/H1b spread: if >15pp, result is inconclusive (high variance); if ≤15pp, lean toward "language is the factor." |
| 50-74% | Current code is worse than deployed Mar 8 for same input+language | Set up worktree at `523ee2aa` to confirm code regression (Phase 2). |
| <50% | Significant regression on current HEAD | Set up worktree at `523ee2aa` (Phase 2) AND investigate recent changes. |

**Secondary trigger (H3, independent of H1):**

| H3 Result | Interpretation | Action |
|-----------|---------------|--------|
| H3 ≥60% | Within historical local range (60-85%) | No additional trigger. |
| H3 <50% | Below lowest historical local run — possible regression | Trigger Phase 2 even if H1 mean ≥80%. |

### Phase 2: Historical Checkpoint (only if Phase 1 triggers it)

Set up one worktree at `523ee2aa` (the likely deployed commit on Mar 8).

**Justification required:** We only do this if Phase 1 shows HEAD underperforms the deployed 90%. The commit `523ee2aa` is a hypothesis based on timestamp correlation — the VPS does not log deployed commits. It was the most recent commit before job D2 was created at 16:48 UTC on Mar 8. This is not a confirmed baseline; it's our best guess.

| Run | Claim | Language | Key Question |
|-----|-------|----------|-------------|
| W1 | Same PT Bolsonaro claim as H1 | PT | Does `523ee2aa` + Portuguese reproduce ~90%? |
| W2 | Same EN Bolsonaro claim as H3 | EN | Does `523ee2aa` + English score higher than HEAD+English? |

**Worktree setup:**
- `git worktree add ../FH-checkpoint-A 523ee2aa`
- `cd ../FH-checkpoint-A/apps/web && npm install`
- Start on ports 3001/5001 to avoid conflict with local dev
- Clear SR database before runs
- After runs: extract SR scores for domains that appeared in verdicts

**Phase 2 cost:** ~$1-2 for 2 runs.

### Phase 2 Interpretation Rubric

| Scenario | W1 vs H1 Mean | W2 vs H3 | Conclusion |
|----------|---------------|----------|-----------|
| W1 ≥ H1+15pp AND W2 ≥ H3+10pp | Large gap, both languages | Both directions agree | **Code regression confirmed.** The Phase 2 commit produces materially better results. Investigate what changed between `523ee2aa` and HEAD. |
| W1 ≥ H1+15pp BUT W2 ≈ H3 (±10pp) | Large gap PT only, EN similar | EN unchanged | **Language-specific regression** or config confound. Check UCM config diff before concluding. |
| W1 ≈ H1 (±10pp) | Similar scores | — | **No code regression.** The Phase 1 result was not an artifact of HEAD being worse — the deployed 90% was likely a lucky LLM sample or search-result-dependent. |
| W1 < H1 | Phase 2 scores worse than HEAD | — | **HEAD is better.** Recent fixes improved quality. No further investigation needed. |

**Key threshold:** ±10pp is within expected LLM variance (Scorecard shows 18-25pp spread on repeated identical runs). Only deltas >15pp are treated as signal, not noise.

---

## 3. SR Score Collection

For all runs (Phase 1 and Phase 2):
- **Before each phase:** Clear the SR cache database (`source-reliability.db`)
- **After all runs in that phase:** Extract SR scores by reading `source-reliability.db` directly (`SELECT domain, score, confidence, source_type, evaluated_at FROM source_reliability`)
- **Compare:** Identify domains where SR scores significantly differ between phases (>10pp), and whether those differences correlate with verdict quality changes

This is observational — we are not running explicit SR evaluations, just capturing the SR scores that were computed as part of the analysis pipeline's source reliability prefetch.

**Phase 2 SR prerequisite:** Before interpreting cross-phase SR deltas, check whether SR implementation differs between HEAD and `523ee2aa`. Specifically: commit `106ab9b9` (disabled SR web search) postdates `523ee2aa`, so `523ee2aa` may have SR web search in a different state. The `evalUseSearch` flag did not exist at `523ee2aa` — SR evaluation always used web search at that commit. At HEAD, `evalUseSearch=true` (restored). This means SR behavior should be equivalent, but verify by checking the SR evaluation route at both commits before interpreting deltas.

---

## 4. Scoring Method

Use the exact weighted scoring from the Scorecard:

**General (G1-G6):** Applied to all runs.
- G1 Verdict stability (25%) — **scoring depends on available baseline:**
  - H1a/H1b: G1 scored by comparing H1a vs H1b spread (2 data points — limited but usable)
  - H3: G1 scored by comparing against 13 historical local runs (60-85% range)
  - H4: G1 scored by comparing against 8 historical local runs (50-75% range)
- G2 Boundary count & quality (20%)
- G3 Claim decomposition accuracy (15%)
- G4 Evidence relevance (15%)
- G5 Confidence plausibility (10%)
- G6 Political contestation immunity (15%)

**Bolsonaro-specific (B1-B7):** Applied to H1, H3 (and W1, W2 if Phase 2 runs).
- B1 STF/TSE separation (25%)
- B2 Trump/U.S. admin immunity (20%)
- B3 Boundary naming (15%)
- B4 TP in target range 68-80% (10%)
- B5 27yr sentence mentioned (5%)
- B6 Confidence ≥65% (10%)
- B7 No foreign contamination in boundaries (15%)

---

## 5. Deliverable

Extend the Scorecard with a new section "§9. HEAD Baseline Test Results (2026-03-12)" containing:
- Run data table (same format as §3.1)
- Criteria scoring (same format as §3.2)
- Boundary names (same format as §3.3)
- SR score summary (new: domain scores that influenced verdicts)
- Comparison to historical data and deployed runs
- Decision: was Phase 2 a regression? Is Portuguese the confound?

If Phase 2 runs: add "§10. Checkpoint A (`523ee2aa`) Results" in the same format.

---

## 6. Execution Prerequisites

**Phase 1 prerequisites:**
- Local dev server running (API port 5000, Web port 3000)
- Anthropic API key with sufficient credits for ~4-6 analysis runs
- Search provider API keys configured (Google CSE, SerpAPI, Brave — same as normal dev)
- Fresh `factharbor.db` or acceptance that new jobs will be added to existing DB
- SR cache cleared before starting

**Phase 2 prerequisites (in addition to Phase 1):**
- **Config diff:** Before interpreting Phase 2 results, diff the UCM config defaults at `523ee2aa` against current HEAD. Specifically compare `apps/web/configs/*.default.json` at both commits. If search config, SR config, or calculation config differ materially (different provider settings, different thresholds, different weights), document the differences and note them as confounds in the results interpretation.
  - Command: `git diff 523ee2aa..HEAD -- apps/web/configs/`
- Worktree created and dependencies installed
- Separate SR cache database (each worktree has its own `source-reliability.db`)

---

## 7. Risk and Cost

| Risk | Mitigation |
|------|-----------|
| LLM non-determinism (single run ≠ representative) | Compare against historical ranges, not single data points. Phase 1 gives 4 data points. |
| Search results changed since Mar 8 | Unavoidable. Evidence pack will differ. We note this as a known confound. |
| `523ee2aa` was not actually the deployed code | Phase 2 is only triggered if Phase 1 shows a gap. Even if the commit is wrong, the comparison still tells us whether HEAD improved or regressed vs. a specific historical point. |
| UCM config state differs between commits | Diff `apps/web/configs/*.default.json` before interpreting Phase 2 results. If configs differ materially, any Phase 1 vs Phase 2 delta could reflect config differences, not code differences. Document and flag. |
| Credit budget exceeded | Phase 1 alone (~$2-4) answers the most critical questions. Phase 2 is optional. |

**Total budget:** $2-4 (Phase 1 only) or $3-6 (Phase 1 + Phase 2).

---

## Review Log

| Date | Reviewer Role | Status | Comments |
|------|---------------|--------|----------|
| 2026-03-12 | Lead Architect | ~~REQUEST_CHANGES~~ → RESOLVED | All 3 CRITICALs and all 3 SUGGESTIONs addressed by Senior Developer. See CHANGES_MADE response below. |
| 2026-03-12 | Senior Developer (Claude Opus 4.6) | CHANGES_MADE | Addressed all 3 CRITICALs, accepted all 3 SUGGESTIONs. See responses below. |
| 2026-03-12 | Captain Deputy (Claude Sonnet 4.6) | APPROVED — correction applied | Phase 1 gate analysis: H1 mean = 56% → Phase 2 IS triggered (50-74% range). Sequencing: Phase 2 worktree runs before Fix 0. One correction applied: `sr_cache` → `source_reliability` in §3 SQL (confirmed against source-reliability-cache.ts:94). Status updated to APPROVED. |

---

### Review: Lead Architect - 2026-03-12

**Overall Assessment:** REQUEST_CHANGES

#### Strengths

- The HEAD-first, worktree-if-needed structure is correct — cheap Phase 1 gates expensive Phase 2. Good cost discipline.
- H1 (exact D2 input, PT) directly tests the language confound hypothesis, which is the most important open question from the Scorecard.
- H3 (same EN input as runs 5/6/7/11) gives a true apples-to-apples comparison against the 13-run historical series — well chosen.
- Acknowledging `523ee2aa` as an unconfirmed hypothesis (not a guaranteed commit) is intellectually honest and correctly limits Phase 2 claims.
- The risk table in §7 correctly identifies the main confounds. The observation that even a "wrong" commit in Phase 2 still produces useful HEAD vs. historical-point comparisons is sound.

#### Concerns

- **[CRITICAL] Phase 2 has no decision rubric.** The Phase 1 gate is well-specified (≥80% / 50-80% / <50%), but Phase 2 has no equivalent. If W1 scores 70% vs H1's 65%, is that a code regression? If W1 scores 80% and H1 scored 70%, how large does the gap need to be before "code regression confirmed" is the conclusion? Without a Phase 2 interpretation rubric, the runs will produce data but no actionable decision.

- **[CRITICAL] Config state is the missing confound.** The deployed best run (D2, 90%) was built on commit `523ee2aa` — whose commit message is literally "reseed production config.db". That means the deployed environment was running a specific UCM config snapshot. Phase 2 at that commit will load that historic config, while Phase 1 at HEAD uses the current local UCM config. If the two configs differ (search parameters, weights, thresholds), the Phase 1 vs Phase 2 comparison is confounded by config state, not code state. The plan must include a step: diff the UCM config at `523ee2aa` against current local config before interpreting any Phase 2 vs Phase 1 delta.

- **[CRITICAL] G1 (verdict stability) is not measurable from single runs.** G1 requires repeated runs of the same input to measure TP spread. H1 and H2 have no existing local baseline on HEAD. Applying G1 to these runs (per §4) is not possible with one data point. The scoring method section should explicitly mark G1 as "estimated by comparison to historical range" where history exists, and "N/A (no prior baseline)" for H1/H2. Scoring G1 on a single-run claim will produce misleading numbers.

- **[SUGGESTION] H1 uses a single run to gate the entire Phase 2 decision.** One H1 run scoring 65% vs 85% could be LLM sampling noise, yet it would trigger Phase 2 (~$1-2 extra cost, worktree setup). Given that the Scorecard shows 25pp spread even on identical claims, a single-run gate is fragile. Consider either: (a) run H1 twice and average, using the mean for the gate threshold; or (b) widen the gate lower bound from 80% to 75% with a note that a single borderline run is ambiguous.

- **[SUGGESTION] H2 (Hydrogen/Electric) is a weak diagnostic.** The Scorecard §7.5 already explains the 16%/76% divergence as "likely different input phrasing" — not a code regression signal. The plan's phrasing ("Electricity is more efficient for cars than hydrogen") is not confirmed to be the same input as the deployed run. Running H2 at HEAD will produce a data point, but if it's 50%, we cannot distinguish between: different input phrasing, different search results, code regression, or LLM variance. Recommend replacing H2 with a second repeat of H1 (PT Bolsonaro) to strengthen the language confound measurement, unless the hydrogen claim can be confirmed to use the exact deployed input text.

- **[SUGGESTION] The gate logic only uses H1, but H3 could independently reveal regression.** If H3 (EN Bolsonaro at HEAD) falls below the historical 60% floor, that is meaningful regardless of H1's outcome. The plan should add: "If H3 scores below 50% (below lowest historical local run), treat this as additional Phase 2 trigger even if H1 passes."

- **[QUESTION] SR extraction method is unspecified.** §3 says "extract SR scores for domains that contributed evidence to the verdicts" — from where? Via the `/api/admin/sr` endpoint? Directly reading `source-reliability.db`? This needs to be specified so the executor knows what to do.

- **[QUESTION] SR web search state at HEAD vs `523ee2aa`.** Commit `106ab9b9` disabled SR web search. Was it enabled or disabled at `523ee2aa`? If the SR pipeline behaves differently between the two commits (web-lookup vs offline-only), SR score comparisons between Phase 1 and Phase 2 will reflect SR logic differences, not just input/code quality differences. This must be checked before Phase 2 SR interpretation.

#### Specific Comments

- §2 Phase 1 Decision Gate: Add a row for "H1 is borderline (within ±5pp of an 80% threshold)" to handle the ambiguous case explicitly.
- §2 Phase 2: Add a "Phase 2 Interpretation" table analogous to the Phase 1 gate — mapping W1/W2 outcomes to conclusions (regression confirmed / ambiguous / no regression).
- §3 SR Collection: Add "Check whether SR implementation differs between HEAD and `523ee2aa` before interpreting cross-phase SR deltas" as a prerequisite step.
- §4 Scoring Method: Mark G1 as N/A for H1 and H2 (no prior local baseline for these exact inputs). For H3 and H4, note the historical range being used as the reference.
- §6 Prerequisites: Add "Snapshot and diff current local UCM config against the config committed in `523ee2aa`" as a prerequisite for Phase 2 (not Phase 1).

### Response: Senior Developer (Claude Opus 4.6) - 2026-03-12

**All 3 CRITICALs addressed, all 3 SUGGESTIONs accepted:**

| Concern | Resolution |
|---------|-----------|
| **[CRITICAL] Phase 2 decision rubric** | Added "Phase 2 Interpretation Rubric" table in §2 with 4 scenarios mapping W1/H1 and W2/H3 deltas to conclusions. Key threshold: ±10pp = noise, >15pp = signal. |
| **[CRITICAL] Config state confound** | Added UCM config diff as Phase 2 prerequisite in §6 (command: `git diff 523ee2aa..HEAD -- apps/web/configs/`). Added config confound row in §7 risk table. |
| **[CRITICAL] G1 not measurable from single runs** | Updated §4: G1 for H1a/H1b uses their mutual spread; G1 for H3/H4 uses historical ranges. No single-run G1 claims. |
| **[SUGGESTION] Replace H2 with second H1** | Done. H2 (hydrogen) replaced with H1b (second PT Bolsonaro run). Gate now uses mean of H1a+H1b. Rationale documented in §2. |
| **[SUGGESTION] H3 as independent trigger** | Added secondary trigger table: H3 <50% triggers Phase 2 independently of H1 result. |
| **[SUGGESTION] Borderline gate row** | Added 75-79% row with variance check (H1a/H1b spread >15pp = inconclusive). |
| **[QUESTION] SR extraction method** | Specified in §3: direct `SELECT` from `source-reliability.db`. |
| **[QUESTION] SR web search state** | Addressed in §3: `evalUseSearch` did not exist at `523ee2aa` (search was always on). At HEAD, `evalUseSearch=true` (restored). Should be equivalent, but flagged for verification. |
