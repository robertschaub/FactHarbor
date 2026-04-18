# Job Quality Investigation: f1a372bf to HEAD

**Date:** 2026-04-07
**Role:** Senior Developer (Claude Code, Opus 4.6)
**Baseline:** `f1a372bf7d9e69cfe220953cbfc5e5aa8193d651`
**HEAD:** `442a5450fa3e5e99af0d894fc557ca2608ae6048`
**Scope:** All local and deployed jobs since baseline

---

## Executive Summary

39 local jobs across 8 commits and 74 deployed jobs across 6+ commits were analyzed. The investigation reveals:

1. **Phase B (`442a5450`) successfully fixes seeded-evidence dominance** — Plastik AC_01 now receives researched iterations, and Bolsonaro EN hit MOSTLY-TRUE 74/68 (best local result, matching deployed range).

2. **Boundary concentration is now the dominant quality bottleneck** — amplified by Phase B's increased evidence volume. Plastik collapsed to 1 boundary (share=1.00) on local Phase B. This is the strongest argument for Phase C.

3. **Plastik DE shows a significant local-vs-deployed divergence on the same baseline build** — deployed `f1a372bf` gives LEANING-TRUE 62/72 while all local runs on the same and newer builds give LEANING-FALSE to MOSTLY-FALSE (28-53%). This is the most concerning cross-environment signal.

4. **Grounding warnings remain common** — 25 of 39 local jobs and ~49 of 74 deployed jobs carry grounding/direction/baseless warnings. The grounding alias fix (`cbb364ec`+`ffaa4fdd`) eliminated the timestamp-ID false-positive class, but genuine grounding issues persist across environments.

5. **No proven runtime regression from Phase A-1 (`62e97e0d`)** — the Swiss UNVERIFIED collapses on that build were fetch scarcity, not A-1-caused. Phase A-1 remains inconclusive but not harmful.

## Cross-Review Outcome (Lead Architect, adversarial)

The independent cross-review in `Docs/WIP/2026-04-07_f1a372bf_to_HEAD_Job_Quality_Cross_Review.md` materially narrows and reframes this result:

- The strict post-baseline set is `21` local jobs and `6` deployed jobs, not `39` local and `74` deployed. The larger counts remain useful context, but they are not the direct post-`f1a372bf` causal range.
- The public deployed set is `6` in-range jobs; the investigation also documents an additional hidden deployed Bundesrat tranche (`094e88fc`, `0afb2d88`, `b843fe70`) that strengthens the treaty-family diagnosis.
- `f1a372bf` is a **docs-only commit**. It is the current deployed label, not a runtime-changing commit.
- The strongest proven current blocker is the Bundesrat treaty family: proposition anchoring / decomposition instability is more central than Stage 3 alone.
- The hidden Bundesrat jobs sharpen that diagnosis into three sub-failures: Stage 1 keyword omission, Stage 1 interpretation injection, and Stage 5 underweighting of the legally decisive claim.
- Phase B still stands as a real fix for the seeded-evidence sufficiency interaction, but the broad "Stage 3 is now dominant" narrative is too strong.
- The current deployed Plastik run (`2cf4682c`, LT 62) should not be treated as a clean truth anchor; deployed history already shows large Plastik variance over time.

---

## Local Job Inventory

**Total:** 39 jobs, 8 builds

### By commit (runtime-affecting only)

| Commit | Label | Jobs | Families |
|---|---|---|---|
| `2ec54047` | Pre-baseline (earlier deployed) | 7 | Bolsonaro EN, Bolsonaro PT, Plastik DE, Swiss FC, Swiss Media, Swiss Propaganda, Misinfo EN |
| `f9b9099d` | Pre-baseline (tension fix) | 6 | Bolsonaro EN, Plastik DE, Swiss FC, Misinfo EN, Misinfo DE ×2 |
| `01ddeb1f` | Pre-baseline | 3 | Bolsonaro EN, Bolsonaro PT, Swiss FC |
| `62e97e0d` | **Phase A-1** | 7 | Bolsonaro EN, Bolsonaro PT, Plastik DE, Swiss FC ×3, Swiss FC (foreign) |
| `b130d00c` | **Phase A-2 telemetry** | 4 | Bolsonaro EN, Plastik DE, Swiss FC, Misinfo EN |
| `442a5450` | **Phase B** | 10 | Bolsonaro EN, Plastik DE, Swiss FC, Misinfo EN, Bundesrat EU ×4, Netanyahu |
| Other pre-baseline | Various | 2 | Plastik DE ×2 |

### By family

| Family | Jobs | Truth% range | Builds |
|---|---|---|---|
| Bolsonaro EN | 6 | 61–74 | 5 builds |
| Plastik DE | 7 | 28–68 | 6 builds |
| Swiss FC DE | 8 | 48–76 | 6 builds |
| Misinfo EN | 5 | 48–77 | 4 builds |
| Bolsonaro PT | 3 | 65–67 | 3 builds |
| Misinfo DE | 2 | 72–76 | 1 build |
| Bundesrat EU | 4 | 16–74 | 1 build |
| Other | 4 | Various | Various |

---

## Deployed Job Inventory

**Total:** 74 jobs, 6+ builds

### By commit

| Commit | Label | Jobs |
|---|---|---|
| `f1a372bf` | **Current deployed HEAD** | 6 |
| `b7783872` | Previous deployed | 9 |
| `2ec54047` | Earlier | 1 |
| `521040e9` | Earlier | 4 |
| `2bee45b3` | Earlier | 3 |
| Pre-hash era | Various | 48+ |

### Key deployed jobs on baseline `f1a372bf`

| Job | Family | Verdict | Truth/Conf | Evidence | Boundaries | Max share |
|---|---|---|---|---|---|---|
| `841d6de3` | Bolsonaro PT | LT 65/68 | 105 | 6 | 0.62 |
| `2cf4682c` | **Plastik DE** | **LT 62/72** | 78 | 5 | 0.47 |
| `8ec68105` | Swiss FC DE | LT 60/52 | 38 | 6 | 0.53 |
| `87185309` | Swiss Wealthy | MT 80/80 | 43 | 6 | 0.65 |
| `50f4e109` | Swiss FC (foreign) | LT 58/40 | 16 | 5 | 0.31 |

---

## Same-Input Comparison Matrix

### Plastik DE — Most Divergent Family

| Environment | Commit | Job | Verdict | Truth | Conf | Evidence | Max share |
|---|---|---|---|---|---|---|---|
| Deployed | `f1a372bf` | `2cf4682c` | **LEANING-TRUE** | **62** | 72 | 78 | 0.47 |
| Deployed | `b7783872` | `80bbcc3d` | LEANING-FALSE | 41 | 48 | 90 | 0.46 |
| Deployed | `521040e9` | `9a12f07e` | MIXED | 51 | 58 | 90 | 0.90 |
| Local | `442a5450` | `041c63ab` | **MOSTLY-FALSE** | **28** | 75 | 135 | **1.00** |
| Local | `b130d00c` | `c731c5b2` | LEANING-FALSE | 41 | 64 | 87 | 0.68 |
| Local | `62e97e0d` | `705b6c17` | LEANING-FALSE | 39 | 69 | 97 | 0.81 |
| Local | `f9b9099d` | `207131a4` | MIXED | 53 | 52 | 99 | 0.30 |

**Critical observation:** Deployed `f1a372bf` gives LEANING-TRUE 62% while all local runs give 28-53% (LEANING-FALSE to MIXED). The **34pp deployed-vs-local gap** on the same baseline build is the most concerning signal in this investigation.

**Per-claim comparison (deployed `f1a372bf` vs local Phase B `442a5450`):**

| Claim | Deployed `2cf4682c` | Local `041c63ab` |
|---|---|---|
| AC_01 | 22 (10S/4C/8N) | 66 (9S/50C/7N) |
| AC_02 | 28 (17S/7C/4N) | 32 (16S/6C/10N) |
| AC_03 | 28 (14S/13C/1N) | 39 (1S/28C/10N) |

The direction profiles are dramatically different — especially AC_01 and AC_03. Local AC_01 has 50 contradicting items; deployed has 4. Local AC_03 has 28 contradicting, deployed has 13. Local finds far more contradicting evidence, producing a lower truth percentage.

**Likely cause:** Different search provider results. Local and deployed use the same Google CSE + Wikipedia + Serper providers but get different result sets due to geographic location, cache state, and provider quota timing. The contradiction iteration may also yield different evidence at different times.

**Attribution:** Not attributable to any specific commit. This is run-to-run + environment variance. The deployed run had 1 main iteration vs local Phase B's 5, which means the deployed run hit sufficiency much earlier — likely because the deployed build lacks Phase B's per-claim floor.

### Bolsonaro EN — Best Improvement Family

| Environment | Commit | Job | Verdict | Truth | Conf | AC_02 items | Max share |
|---|---|---|---|---|---|---|---|
| Deployed | `b7783872` | `eb02cd2e` | **MOSTLY-TRUE** | **73** | 70 | ~21 | 0.78 |
| Deployed | `521040e9` | `cfd508bc` | LEANING-TRUE | 71 | 66 | ~11 | 0.27 |
| Local | `442a5450` | `8f07c9de` | **MOSTLY-TRUE** | **74** | 68 | 20 | 0.82 |
| Local | `b130d00c` | `ee5df495` | LEANING-TRUE | 70 | 68 | 17 | 0.37 |
| Local | `62e97e0d` | `e24093da` | LEANING-TRUE | 71 | 60 | 6 | 0.56 |
| Local | `f9b9099d` | `f6ea1496` | LEANING-TRUE | 63 | 68 | 17 | 0.46 |

**Phase B local result (74/68) now matches the best deployed result (73/70).** AC_02 recovered to 20 items (from the 6-item collapse on A-1). This is the strongest evidence that Phase B is working.

### Swiss FC DE

| Environment | Commit | Job | Verdict | Truth | Conf | Evidence |
|---|---|---|---|---|---|---|
| Deployed | `f1a372bf` | `8ec68105` | LEANING-TRUE | 60 | 52 | 38 |
| Local | `442a5450` | `00865fd1` | LEANING-TRUE | 63 | **76** | 26 |
| Local | `b130d00c` | `035d6e65` | LEANING-TRUE | 70 | 58 | 25 |
| Local | `62e97e0d` | `f36dd064` | **UNVERIFIED** | 50 | 0 | 5 |
| Local | `f9b9099d` | `5aa28697` | MOSTLY-TRUE | 76 | 65 | 12 |

Swiss is thin-evidence and high-variance. The UNVERIFIED on A-1 was fetch scarcity. Phase B gives the highest confidence (76%) in the series. Deployed is comparable (LT 60/52).

### Misinfo EN

| Environment | Commit | Job | Verdict | Truth | Conf | Claims |
|---|---|---|---|---|---|---|
| Local | `442a5450` | `d402535c` | MIXED | 57 | 62 | 2 |
| Local | `b130d00c` | `959d6a91` | LEANING-TRUE | 62 | 65 | 2 |
| Local | `62e97e0d` | `b3199cde` | MIXED | 48 | 58 | 3 |
| Local | `f9b9099d` | `86d1d0af` | MIXED | 52 | 70 | 3 |

Claim decomposition varies (2 vs 3 claims). Truth ranges 48-62. Moderate variance, no clear commit-driven trend.

---

## Issue Catalog

### Issue 1: Boundary Concentration Amplification (LOCAL, HIGH)

**Symptom:** Phase B's per-claim floor increases total evidence volume, and Stage 3 collapses more evidence into mega-boundaries.
**Affected:** Plastik Phase B (1.00 share), Bolsonaro Phase B (0.82)
**Unaffected:** Swiss Phase B (0.31), Misinfo Phase B (0.51)
**Layer:** Stage 3 clustering
**Scope:** Local only (deployed lacks Phase B)
**Severity:** High — single-boundary collapse defeats the purpose of multi-boundary analysis
**Reproducibility:** Consistent on evidence-rich families

### Issue 2: Plastik DE Local-vs-Deployed Truth Divergence (BOTH, HIGH)

**Symptom:** Deployed Plastik on `f1a372bf` gives LEANING-TRUE 62% while all local runs give 28-53%.
**Affected:** All Plastik DE comparisons
**Layer:** Stage 2 retrieval + evidence composition
**Scope:** Cross-environment
**Severity:** High — 34pp gap on same baseline build
**Likely cause:** Different search results by environment + deployed lacks Phase B per-claim floor (so it runs fewer iterations with less contra evidence)
**Attribution:** Not attributable to any specific commit — environment + provider variance

### Issue 3: Grounding Warnings Persistence (BOTH, MEDIUM)

**Symptom:** 25/39 local jobs and ~49/74 deployed jobs have grounding/direction/baseless warnings.
**Layer:** Stage 4 verdict + grounding validation
**Scope:** Both environments
**Severity:** Medium (info-level, doesn't block verdicts)
**Attribution:** Pre-existing. The alias fix eliminated timestamp-ID false positives but genuine grounding issues remain.

### Issue 4: Swiss FC Evidence Scarcity (LOCAL, MEDIUM)

**Symptom:** Swiss FC evidence pools range from 5 to 64 items. The UNVERIFIED collapses (5 and 17 items) are fetch-scarcity-driven.
**Layer:** Stage 2 search/fetch
**Scope:** Primarily local (deployed also thin but doesn't collapse as severely)
**Severity:** Medium — recoverable across runs
**Attribution:** Not commit-related — fetch reliability variance

### Issue 5: Claim Decomposition Variance (BOTH, LOW)

**Symptom:** Misinfo EN decomposes into 2 or 3 claims across runs. Bundesrat EU runs show 2-3 claims.
**Layer:** Stage 1 claim extraction
**Scope:** Both
**Severity:** Low — doesn't consistently change verdict direction
**Attribution:** LLM non-determinism at Stage 1

---

## Commit-to-Issue Association

| Commit | Intended change | Observed local effect | Deployed contrast | Confidence | Evidence |
|---|---|---|---|---|---|
| `62e97e0d` Phase A-1 | Evidence summary in query gen | Swiss UNVERIFIED (fetch scarcity, not A-1). AC_02 items varied within normal range. | N/A (not deployed) | **Not attributable** | Swiss collapsed from scarcity; Bolsonaro/Plastik within variance |
| `b130d00c` Phase A-2 | Telemetry only | No behavioral change detected. Bolsonaro 70/68, Plastik 41/64, Swiss 70/58 — all within variance. | N/A (not deployed) | **No effect** (as expected) | Telemetry addition confirmed non-behavioral |
| `442a5450` Phase B | Per-claim researched-iteration floor | **Plastik AC_01 now researched** (33 items admitted). **Bolsonaro MT 74/68** (best result). **Boundary concentration amplified** on Plastik (1.00) and Bolsonaro (0.82). | N/A (not deployed) | **Likely causation** for both improvement and concentration amplification | Ledger confirms AC_01 forced iteration. Concentration increase tracks with higher evidence volume. |

### What improved after Phase B

- Plastik AC_01 now receives research (was 0 iterations, now ≥1)
- Bolsonaro EN reached MOSTLY-TRUE 74/68 — best local result
- All claims across all families have ≥1 researched iteration

### What worsened after Phase B

- Boundary concentration on evidence-rich families (Plastik 1.00, Bolsonaro 0.82)
- Total evidence volume increases (Plastik 87→135), giving Stage 3 more material to mis-cluster

### What remained unchanged

- Swiss FC scarcity pattern (thin evidence, high variance)
- Grounding warning frequency
- Claim decomposition variance

---

## Critical Finding: Stage 1 Interpretation Injection (Bundesrat `b843fe70`)

### The input

> "Der Bundesrat hat den EU-Vertrag unterschrieben bevor Volk und Parlament darüber entschieden haben"

This is a simple factual chronology claim: the Bundesrat signed before Parliament and people decided. It says nothing about legality, constitutionality, or democratic order.

### What Stage 1 extracted

- **AC_01:** "Der Bundesrat hat das Paket Schweiz-EU am 2. März 2026 unterzeichnet, bevor das Parlament darüber entschieden hat." — Faithful extraction.
- **AC_02:** "Der Bundesrat hat das Paket Schweiz-EU unterzeichnet, bevor das Volk darüber in einem Referendum entschieden hat." — Faithful extraction.
- **AC_03:** "Die Unterzeichnung des Pakets Schweiz-EU durch den Bundesrat **verstößt gegen die verfassungsrechtliche Ordnung** der Schweiz bezüglich der Ratifizierung von Staatsverträgen." — **Not in the input.** The pipeline inferred "this implies a constitutional violation" and then verified/refuted its own inference.

### The cascade

AC_03 is marked `thesisRelevance: tangential`, so the system itself recognizes it is not a direct claim. But it still:
1. Generates research queries for it
2. Finds contradicting evidence (0S/4C/7N)
3. Produces a verdict (FALSE 8/78)
4. Labels the claim "highly_misleading"
5. Drags the aggregate to MOSTLY-FALSE 16/68

The headline concludes: "Die Behauptungen zum Schweiz-EU-Paket sind überwiegend falsch" — but the core factual claim (signing happened before parliamentary decision) is actually **true** (AC_01 evidence: 15S/0C/6N).

### Evidence of the distortion

| Job | Build | AC_03 present? | AC_03 content | Verdict |
|---|---|---|---|---|
| `b843fe70` (deployed) | `f1a372bf` | Yes, `tangential` | "verstößt gegen die verfassungsrechtliche Ordnung" | **MF 16** |
| `50e2e167` (deployed) | `f1a372bf` | No | — | **TRUE 89** |

Same build, similar input — 73pp difference driven entirely by whether Stage 1 injects an interpretive claim.

### Rule violation

This violates two AGENTS.md rules:

1. **Input neutrality** (tolerance ≤4%): The same semantic input produces a 73pp spread depending on Stage 1 decomposition.
2. **Claim extraction rules** (CLAIM_EXTRACTION_PASS2): "Extract only factual/verifiable assertions. Exclude pure opinions, predictions, rhetorical flourishes, and meta-commentary." AC_03 is the pipeline's own interpretation of what the user might have implied, not a verifiable assertion from the input text.

### Classification

- **Issue type:** Stage 1 interpretation injection
- **Severity:** **Blocker-level** — changes verdict direction by 73pp
- **Layer:** Stage 1 claim extraction (CLAIM_EXTRACTION_PASS2)
- **Scope:** Both environments (deployed `f1a372bf`)
- **Related backlog:** `STG1-DECOMP`
- **Not a Phase B issue** — occurs on deployed baseline without Phase B
- **Reproducibility:** Intermittent — depends on whether Stage 1's LLM infers an implied legal/constitutional dimension

### Recommended fix

The CLAIM_EXTRACTION_PASS2 prompt needs a stronger anti-inference guard:
- Do not add claims that interpret what the input "implies" about legality, constitutionality, or democratic order
- Only extract claims that are explicitly stated or directly entailed by the input wording
- If an input could be interpreted as implying a normative violation, extract only the factual chronological sub-claims, not the normative inference

This is a prompt-level fix in `apps/web/prompts/claimboundary.prompt.md` (CLAIM_EXTRACTION_PASS2 section).

---

## Critical Finding: Stage 5 Aggregation Underweights Core Assertion (Bundesrat `0afb2d88`)

### The input

> "Der Bundesrat unterschreibt den EU-Vertrag **rechtskräftig** bevor Volk und Parlament darüber entschieden haben"

### What Stage 1 correctly extracted

All 3 claims are faithful and marked `thesisRelevance: direct`:
- **AC_01:** "signed before Parliament" → MOSTLY-TRUE 82/88 (HIGH)
- **AC_02:** "signed before people's vote" → MOSTLY-TRUE 85/85 (HIGH)
- **AC_03:** "signing was rechtskräftig und bindend" → LEANING-FALSE 30/68 (MEDIUM)

### The problem: aggregation buries the key claim

The overall verdict is **LEANING-TRUE 70/82**. But "rechtskräftig" is the word that makes this input non-trivial. The user isn't asking whether the Bundesrat signed (obviously yes) — they're claiming the signing was **legally binding** before democratic approval. AC_03 correctly identifies this is false (signing ≠ ratification in Swiss law).

The headline even acknowledges this: "die Darstellung der rechtlichen Bindungswirkung ist irreführend." But the verdict label (LEANING-TRUE 70%) doesn't reflect that the input's defining assertion is wrong.

The `adjustedTruthPercentage: 70` shows the VERDICT_NARRATIVE LLM did NOT adjust down despite identifying the misleading framing.

### Why this happens

The aggregation weights by `confidenceTier` and `harmPotential`. AC_01 and AC_02 are both HIGH tier; AC_03 is MEDIUM. All three are `thesisRelevance: direct` with equal centrality. AC_01 and AC_02 are trivially verifiable chronological facts; AC_03 is the substantive legal assertion. The aggregation has no concept of "this claim contains the distinguishing keyword that makes the input non-trivial."

### Relationship to `b843fe70` and `094e88fc`

Three distinct failure modes on the same input, same build:
- `b843fe70`: Stage 1 **invents** "verstößt gegen verfassungsrechtliche Ordnung" → MF 16
- `0afb2d88`: Stage 1 correctly extracts "rechtskr��ftig", but aggregation **underweights** it → LT 70
- `094e88fc`: Stage 1 **drops** "rechtskräftig" entirely → TRUE 86

Together they produce an 70pp spread (MF 16 to TRUE 86) from three independent pipeline-layer failures.

---

## Critical Finding: Stage 1 Drops Distinguishing Keyword (Bundesrat `094e88fc`)

### The input

> "Der Bundesrat unterschreibt den EU-Vertrag **rechtskräftig** bevor Volk und Parlament darüber entschieden haben"

### What Stage 1 extracted

- **AC_01:** "Der Bundesrat hat die völkerrechtlichen Verträge des Pakets Schweiz–EU unterzeichnet, bevor das Parlament diese beraten und beschlossen hat."
- **AC_02:** "Der Bundesrat hat die völkerrechtlichen Verträge des Pakets Schweiz–EU unterzeichnet, bevor das Schweizer Volk über diese abstimmen konnte."

**"Rechtskräftig" appears in neither atomic claim.** Stage 1 classified the input as `single_atomic_claim`, decomposed into two chronological sub-claims, and silently dropped the word that makes the input non-trivial.

### The consequence

Both claims are trivially true. The verdict is **TRUE 86/79** — telling the user their claim is correct. But the user's actual assertion was that the signing was **legally binding** before democratic approval, which is **false** under Swiss constitutional law.

The `impliedClaim` correctly preserves "rechtskräftig" but the atomic claims strip it during decomposition.

### Classification

- **Issue type:** Stage 1 keyword omission during claim decomposition
- **Severity:** **Blocker-level** — the core assertion goes unverified, verdict is factually misleading
- **Layer:** Stage 1 claim extraction (CLAIM_EXTRACTION_PASS2)
- **Scope:** Deployed `f1a372bf`
- **Related backlog:** `QLT-1` (predicate strength stabilization), `STG1-DECOMP`
- **Fix direction:** Strengthen predicate preservation in CLAIM_EXTRACTION_PASS2 to ensure qualifier words that change the truth value of a claim (e.g., "rechtskräftig", "legally binding", "definitiv") survive decomposition. The B1 claim-contract validator should catch omissions where the atomic claims fail to cover a substantive predicate present in the `impliedClaim`.

### The Bundesrat failure-mode summary

| Job | Layer | Failure | Verdict | Correct direction |
|---|---|---|---|---|
| `094e88fc` | Stage 1 | Drops "rechtskräftig" | **TRUE 86** | Should be MIXED or lower |
| `0afb2d88` | Stage 5 | Underweights AC_03 (rechtskräftig=FALSE 30) | **LT 70** | Should be MIXED or lower |
| `b843fe70` | Stage 1 | Invents "verfassungsrechtliche Ordnung" | **MF 16** | Too low — chronology IS true |
| `50e2e167` | Stage 1 | No "rechtskräftig" dimension, only chronology | **TRUE 89** | Too high — same as 094e88fc |

The only run that got the decomposition right was `0afb2d88` (3 claims including "rechtskräftig und bindend" as AC_03). But even that run failed at aggregation by underweighting the key claim.

### Classification

- **Issue type:** Aggregation underweighting of core assertion
- **Severity:** High — verdict direction misleads users (LT 70 when the defining word is false)
- **Layer:** Stage 5 aggregation + VERDICT_NARRATIVE adjudication
- **Scope:** Both environments (deployed `f1a372bf`)
- **Related backlog:** `AGG-1` (LLM-assessed triangulation / derivative weighting)
- **Not a Phase B issue** — occurs on deployed baseline
- **Fix direction:** Either teach aggregation to weight the substantively-contested claim higher than trivially-true prerequisite claims, or strengthen VERDICT_NARRATIVE adjudication to adjust downward when the overall truth is misleading despite per-claim numbers

---

## Critical Finding: Bundesrat EU-Vertrag 80pp Variance

### The data — same input, same build (`442a5450`), same day

| Job | Verdict | Truth | Claims | AC_01 | AC_02 | AC_03 |
|---|---|---|---|---|---|---|
| `87487a15` | MOSTLY-TRUE | 74 | 3 | TRUE 92 | TRUE 95 | MF 18 |
| `7ffcab95` | LEANING-TRUE | 59 | 2 | TRUE 100 | FALSE 5 | — |
| `5c302710` | MOSTLY-FALSE | 16 | 2 | MF 15 | MF 18 | — |
| `21fe78d1` | MOSTLY-FALSE | 16 | 2 | MF 15 | UV 20 | — |

Plus one slightly different input (`9d79d2a0`): FALSE 9/89 (2 claims).
Plus one deployed (`50e2e167` on `f1a372bf`): TRUE 89/84 (2 claims).

**Spread: 80pp (FALSE 9 to TRUE 89).**

### Root cause: genuine analytical ambiguity + claim decomposition instability

The input "Der Bundesrat unterschreibt den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben" conflates two separable assertions:
1. **The Bundesrat signed** → factually TRUE (signed 2 March 2026)
2. **"rechtskräftig" (legally binding before democratic process)** → FALSE/MIXED (not binding until Parliament approves + optional referendum period passes)

When Stage 1 correctly separates these into 3 claims (AC_03 for "rechtskräftig"), the result is nuanced (MT 74 with AC_03=MF 18). When it collapses them into 2 claims, the result oscillates based on which interpretation dominates the evidence.

### Classification: Blocker-level instability for this input class

This is the largest variance observed in the entire investigation. It is:
- **Not a Phase B regression** — the ambiguity exists in the input
- **A Stage 1 claim decomposition instability** — 2 vs 3 claims on the same input
- Related to the existing `STG1-DECOMP` backlog item
- The deployed run (TRUE 89) only extracted 2 claims and interpreted "signed" as procedurally correct, ignoring the "rechtskräftig" binding dimension entirely

---

## Strongest Regressions

1. **Plastik DE boundary collapse on Phase B** (1.00 max share, 135 items in 1 boundary) — structurally the worst boundary result in the measurement series. This is the most urgent item for Phase C.

2. **Plastik DE local-vs-deployed divergence** (28-53% local vs 62% deployed on same baseline) — not a regression from a specific commit, but the largest unexplained cross-environment gap.

## Strongest Improvements

1. **Bolsonaro EN MOSTLY-TRUE 74/68 on Phase B** — matches deployed comparator (73/70) for the first time. All claims researched, AC_02 at 20 items (stable).

2. **All claims now receive ≥1 researched iteration** on Phase B — the seeded-evidence dominance failure mode is eliminated.

3. **Swiss FC confidence 76% on Phase B** — highest in the measurement series.

## Highest-Risk Unresolved Problems

1. **Stage 3 boundary concentration** — amplified by Phase B's increased evidence volume. Plastik and Bolsonaro consistently show mega-boundaries. This is the primary quality bottleneck now that Stage 2 sufficiency is addressed.

2. **Cross-environment evidence composition divergence** — same input, same build, materially different evidence pools and verdict directions between local and deployed. This is not fixable by pipeline code changes — it reflects search provider environmental variance.

3. **Grounding warning persistence** — the alias fix resolved false positives, but genuine grounding issues remain across both environments. The single-citation-channel contract is not fully enforced.

## Recommended Next Fixes (Priority Order)

1. **Stage 1 anti-inference guard (BLOCKER)** — the interpretation injection finding (`b843fe70`) is the highest-severity issue in this investigation. A prompt-level fix in CLAIM_EXTRACTION_PASS2 to prevent Stage 1 from inventing normative/legal claims the input did not make. This is a 73pp verdict swing on a factually simple input.

2. **Stage 5 aggregation: core-assertion weighting** — the `0afb2d88` finding shows the inverse problem: Stage 1 correctly extracts the key claim but aggregation buries it under trivially-true prerequisites. The VERDICT_NARRATIVE LLM adjudication should adjust downward when the overall truth is misleading despite high per-claim numbers on non-distinctive sub-claims. Related to `AGG-1`.

3. **Phase C: Stage 3 boundary-concentration stabilization** — the evidence now shows this is the dominant structural quality bottleneck. Focus on preventing single-boundary collapse when evidence volume is high.

4. **Deploy Phase B (`442a5450`) after fixes 1-2** — the per-claim floor is validated and produces the best Bolsonaro result. The concentration issue should be addressed in Phase C, not by reverting Phase B.

5. **Monitor grounding warnings** — no immediate code change needed, but track whether the remaining warnings correlate with verdict quality issues.

6. **Accept Plastik DE cross-environment divergence as environmental variance** — the deployed LEANING-TRUE 62% reflects a different evidence pool composition, not a code problem.
