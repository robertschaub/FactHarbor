# Job Quality Cross-Review: f1a372bf to HEAD

**Date:** 2026-04-07  
**Role:** Lead Architect + adversarial cross-reviewer (GPT-5)  
**Baseline:** `f1a372bf7d9e69cfe220953cbfc5e5aa8193d651`  
**HEAD:** `442a5450fa3e5e99af0d894fc557ca2608ae6048`  
**Primary doc under review:** `Docs/WIP/2026-04-07_f1a372bf_to_HEAD_Job_Quality_Investigation.md`

---

## Independent Executive Judgment

Claude is directionally right on three important points:

1. `442a5450` really does fix the targeted seeded-evidence sufficiency failure mode.
2. `b130d00c` is observability-only unless someone proves otherwise.
3. The Swiss `UNVERIFIED` collapses on `62e97e0d` are much better explained by evidence scarcity than by Phase A-1.

But the primary narrative is still overstated in two material ways:

1. The strict `f1a372bf..HEAD` evidence base is **21 local jobs on 3 runtime builds** and **6 deployed jobs on 1 live build**, not 39 local jobs and 74 deployed jobs. The larger numbers are useful historical context, but they are not the post-baseline causal set.
2. The strongest proven current instability is **not** Stage 3 boundary concentration. It is a more central **proposition anchoring failure**: Stage 1 sometimes decomposes multi-proposition inputs inconsistently, and Stage 4 sometimes grades the literal truth of a claim down because the wording feels misleading rather than because the extracted AtomicClaim is false.

Deployed must be treated as first-class evidence, not a side note. When rebuilt independently, deployed history shows its **own** meaningful variance, especially on Plastik. That means current deployed `f1a372bf` is not a clean gold standard against which local can be judged mechanically.

After the initial cross-review, an additional deployed-only hidden-job tranche from the Claude investigation must also be included. Those hidden jobs were not retrievable from the public API, but the documented Bundesrat cases (`094e88fc`, `0afb2d88`, `b843fe70`) materially strengthen the same root diagnosis rather than overturning it.

---

## 1. Independent Inventory Rebuild

### Strict in-range commit facts

- `f1a372bf` is a **docs-only commit**. It is the current deployed label, but it is not itself a runtime-changing commit.
- The only runtime-affecting commits in the strict ancestry path from baseline to `HEAD` are:
  - `62e97e0d` Phase A-1
  - `b130d00c` telemetry
  - `442a5450` Phase B

### Local inventory rebuilt independently

- Total local jobs with results in DB: `832`
- Strict in-range local jobs: `21`
- Strict in-range local build counts:
  - `62e97e0d`: `7`
  - `b130d00c`: `4`
  - `442a5450`: `10`

### Deployed inventory rebuilt independently

- Public visible deployed jobs: `74`
- Visible deployed build hashes: `7`
- Strict in-range deployed jobs: `6`
- All strict in-range deployed jobs are on current live build `f1a372bf`

### Hidden deployed addendum

The public deployed API does **not** expose hidden jobs. The primary Claude investigation documents three additional hidden deployed jobs on `f1a372bf` for the Bundesrat family:

- `094e88fc`
- `0afb2d88`
- `b843fe70`

Those jobs were not independently re-fetched from a public endpoint, but they are now part of the analytical record for this workstream. So the correct statement is:

- **Public visible** strict in-range deployed jobs: `6`
- **Public visible + documented hidden addendum**: at least `9`

### Why this correction matters

Claude's 39-local / 74-deployed framing mixes:

- older local pre-baseline runs such as `2ec54047`, `f9b9099d`, `01ddeb1f`
- older deployed runs on hashes before `f1a372bf`

That older history is still useful for context, but it cannot be presented as if it were direct evidence for **post-`f1a372bf` causality**.

### Same-input families that matter most

| Family | Local in-range | Deployed visible | Main signal |
|---|---:|---:|---|
| `Plastik recycling bringt nichts` | 3 jobs, `28-41` | 4 jobs, `29.6-62` | Deployed itself varies strongly over time |
| `Die Schweiz hat kein systematisches Fact-Checking wie Deutschland` | 4 jobs, `48-70` | 2 jobs, `60-71` | A-1 scarcity collapse, then local/deployed converge |
| Bolsonaro PT exact input | 1 local, `65` | 2 deployed, `62-65` | Stable cross-environment |
| `Der Bundesrat unterschreibt EU-Vertrag bevor Volk und Parlament darüber entschieden` | 1 local `9` | 1 deployed `89` | Material polarity split |
| `Der Bundesrat unterschreibt den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden` | 4 local, same build, `16-74` | no exact deployed match | Largest strict-range same-build instability |

### Same-build divergence by environment

| Environment | Build | Input | Jobs | Spread | Judgment |
|---|---|---|---:|---:|---|
| Local | `442a5450` | Bundesrat `rechtskräftig` | 4 | `58` | Unacceptable instability |
| Local | `62e97e0d` | Swiss fact-checking | 2 | `2` | Within normal tolerance |
| Deployed | visible hashed builds | No comparable high-spread duplicate in visible hashed set | low | low | No proven same-build deployed failure in the visible set |

The strict-range blocker is therefore local same-build instability on the Bundesrat family, not a deployed footnote.

---

## 2. Factual Adjudication of Material Disagreements

### A. Bundesrat / EU treaty family

Relevant jobs:

- Local `9d79d2a0` on `442a5450`: `FALSE 9 / 89`
- Deployed `50e2e167` on `f1a372bf`: `TRUE 89 / 84`
- Local same-build `rechtskräftig` variants on `442a5450`:
  - `21fe78d1`: `MOSTLY-FALSE 16`
  - `5c302710`: `MOSTLY-FALSE 16`
  - `7ffcab95`: `LEANING-TRUE 59`
  - `87487a15`: `MOSTLY-TRUE 74`

Primary sources:

- Swiss government press release on the signature date: <https://www.europa.eda.admin.ch/de/newnsb/afSUBKNIaRs3s1tqaCebd>
- Swiss-EU package page stating Parliament phase began on 13 March 2026: <https://www.europa.eda.admin.ch/de/botschaft-paket-schweiz-eu>
- Federal Council press release on optional referendum: <https://www.europa.eda.admin.ch/de/newnsb/nZPui4ybDJRNFN-qkQtS5>
- EDA treaty practice guide on signature vs ratification: <https://www.eda.admin.ch/dam/eda/de/documents/publications/Voelkerrecht/Praxisleitfaden-Voelkerrechtliche-Vertraege_de.pdf>

External judgment:

- For the input **without** `rechtskräftig`, the claim is factually much closer to **true**:
  - the agreements were signed on **2 March 2026**
  - the Federal Council adopted the dispatch to Parliament on **13 March 2026**, which started the parliamentary phase
  - the Federal Council had already framed the package around an optional referendum, so the people had also not yet decided
- For the input **with** `rechtskräftig`, the claim becomes mixed:
  - the **chronology** is true
  - the **legally binding / rechtskräftig** implication is not, because Swiss treaty binding normally turns on ratification, and the practice guide explicitly distinguishes ordinary signature from ratification subject to parliamentary approval

Therefore:

- Deployed `50e2e167` is factually closer to reality than local `9d79d2a0`.
- For the `rechtskräftig` input, the closest local outputs are the ones that split chronology from legal effect (`7ffcab95`, `87487a15`), not the runs that collapse the whole input to mostly false (`21fe78d1`, `5c302710`).

Pipeline-quality judgment:

- This is **not** just retrieval variance.
- `9d79d2a0` is a local reasoning failure: it downgrades a literally true chronology claim because the wording is judged politically or procedurally misleading.
- That is a **truth / misleadingness leakage** problem and a proposition-handling problem, not a mere provider-variance story.

### A1. Hidden-job addendum for Bundesrat

The hidden deployed jobs documented in the primary investigation sharpen the diagnosis:

| Job | Environment | Build | Failure mode | Verdict |
|---|---|---|---|---|
| `094e88fc` | deployed hidden | `f1a372bf` | Stage 1 keyword omission: `rechtskräftig` dropped | `TRUE 86` |
| `0afb2d88` | deployed hidden | `f1a372bf` | Stage 5 underweights the legal-effect claim after correct decomposition | `LEANING-TRUE 70` |
| `b843fe70` | deployed hidden | `f1a372bf` | Stage 1 injects constitutional-order interpretation not present in the input | `MOSTLY-FALSE 16` |

If these hidden jobs are accepted as authoritative internal evidence, they materially strengthen three conclusions:

1. **Stage 1 predicate preservation is a real failure surface.**
2. **Stage 1 anti-inference is also a real failure surface.**
3. **Stage 5 can bury the defining contested assertion under trivially true prerequisite claims.**

This hidden-job evidence does **not** weaken my earlier cross-review. It narrows it:

- my broader label `proposition anchoring failure` remains correct
- Stage 1 is now more specifically split into:
  - predicate preservation failure
  - interpretation injection failure
- Stage 5 core-assertion weighting moves from `plausible` to effectively `supported`, conditional on the hidden-job record being authoritative

### B. Plastik family

Relevant jobs:

- Deployed `2cf4682c` on `f1a372bf`: `LEANING-TRUE 62 / 71`
- Local `705b6c17` on `62e97e0d`: `LEANING-FALSE 39 / 68`
- Local `c731c5b2` on `b130d00c`: `LEANING-FALSE 41 / 63`
- Local `041c63ab` on `442a5450`: `MOSTLY-FALSE 28 / 74`

Primary sources:

- OECD Global Plastics Outlook: <https://www.oecd.org/en/publications/global-plastics-outlook_de747aef-en.html>
- OECD 2040 policy scenarios: <https://www.oecd.org/en/publications/2024/10/policy-scenarios-for-eliminating-plastic-pollution-by-2040_28eb9536.html>
- EEA plastics emissions / recycling contribution: <https://www.eea.europa.eu/en/circularity/sectoral-modules/plastics/ghg-emissions-from-eus-plastics-value-chain>
- EPA recycling basics: <https://www.epa.gov/recycle/recycling-basics-and-benefits>
- EPA plastics waste page: <https://www.epa.gov/plastics/what-you-can-do-reduce-plastic-waste>

External judgment:

- The categorical statement "`Plastik recycling bringt nichts`" is closer to **false** or at most **mixed**, not leaning true.
- OECD and EEA both treat better recycling as environmentally useful, while also making clear that recycling alone is insufficient and that reduction / reuse / broader lifecycle policy matter.
- EPA likewise treats recycling as beneficial, even while ranking reduction and reuse as more effective.

Therefore:

- The current deployed live run `2cf4682c` (`LEANING-TRUE 62`) is materially farther from external reality than the local in-range LF/MF runs.
- However, this is **not** evidence of a clean local post-baseline improvement story either, because deployed itself varies across visible history:
  - `80043152`: `LEANING-FALSE 29.6`
  - `9a12f07e`: `MIXED 51`
  - `80bbcc3d`: `LEANING-FALSE 41`
  - `2cf4682c`: `LEANING-TRUE 62`

Pipeline-quality judgment:

- The right conclusion is not "local regressed against a stable deployed truth anchor."
- The right conclusion is "Plastik is a high-variance family in **both** environments, and the current deployed run is a high-side factual outlier."

---

## 3. Debate With Claude

### Strongest points of agreement

1. **Phase B fixes the targeted researched-iteration gap.**  
   Supported. The ledger evidence for Plastik AC_01 is real.

2. **`b130d00c` is telemetry-oriented only.**  
   Supported. I found no credible runtime-quality delta attributable to it.

3. **Swiss A-1 collapse is mostly scarcity, not A-1-caused harm.**  
   Supported. `f36dd064` has only `5` evidence items and explicit insufficiency warnings.

4. **Grounding warnings remain a background issue.**  
   Supported as a secondary system quality problem, not the primary cause of the major verdict splits here.

### Strongest points of disagreement

1. **"39 local jobs across 8 commits and 74 deployed jobs since baseline"**  
   Incorrect for causal range analysis. That inventory includes substantial pre-baseline context.

2. **"Plastik shows a same-baseline local-vs-deployed divergence"**  
   Incorrect / overstated. There is no strict in-range local Plastik run on build `f1a372bf`.

3. **"Boundary concentration is now the dominant quality bottleneck"**  
   Weak / overstated. It is an important amplifier on some local families, but the clearest strict-range failure is the treaty proposition-handling failure.

4. **"Claim decomposition variance is low severity"**  
   Incorrect. On the Bundesrat `rechtskräftig` input it is blocker-level same-build instability.

5. **"Accept Plastik divergence as environmental variance"**  
   Too weak. Environmental variance is real, but the current deployed LT 62 output is also factually worse than the local LF/MF outputs.

6. **Bundesrat failures are mainly one phenomenon**  
   Now too compressed. With the hidden deployed tranche included, the evidence supports at least three distinct sub-failures: predicate omission, interpretation injection, and Stage 5 underweighting.

### Deployed-specific findings Claude got right

- Deployed current live build is `f1a372bf`.
- Deployed current Swiss and Bolsonaro PT runs are in a reasonable range relative to local.

### Deployed-specific findings Claude missed or underweighted

- Only **6** visible deployed jobs are actually in the strict post-baseline range.
- Deployed Plastik over time is already unstable enough that the current live LT 62 run cannot be treated as a clean reference.
- There is no comparable visible same-build deployed instability in hashed runs; the severe same-build failure is local.

---

## 4. Hypothesis Challenge

| Candidate explanation | GPT assessment | Why |
|---|---|---|
| Claim extraction instability | **Supported** | Primary driver for the Bundesrat family; hidden jobs sharpen this into predicate omission + interpretation injection |
| Truth / misleadingness leakage | **Supported** | Best explanation for local `9d79d2a0` (`FALSE 9`) despite externally true chronology |
| Stage 3 concentration | **Supported as amplifier, not primary root cause** | Real on Plastik / Bolsonaro, but not the best explanation for the treaty failures |
| Seeded-evidence sufficiency interaction | **Supported but narrower** | Real on targeted pre-Phase-B families; Phase B addresses it structurally |
| Grounding / challenge-context noise | **Plausible secondary issue** | Warnings are common, but they do not best explain the major verdict reversals |
| Provider / fetch variance | **Supported, but insufficient alone** | Explains part of Swiss and Plastik variance; does not explain local treaty reasoning leakage |
| Stage 5 core-assertion underweighting | **Supported with hidden-job addendum** | `0afb2d88` shows correct decomposition can still mislead overall verdict weighting |
| Something else more central | **Yes: proposition anchoring failure** | The system sometimes drops, invents, or misweights the proposition that actually determines the claim's truth |

---

## 5. Consolidated Issue Ranking

| Rank | Issue | Scope by environment | Severity |
|---|---|---|---|
| 1 | Proposition anchoring failure on treaty-like inputs | Shared | Blocker |
| 2 | Stage 1 predicate preservation / anti-inference failure | Shared | High |
| 3 | Stage 5 core-assertion underweighting | Deployed-only proven, shared plausible | High |
| 4 | Cross-environment retrieval / evidence composition variance | Shared | High |
| 5 | Stage 3 boundary concentration amplification | Shared historically, local-only strict-range extreme | Medium-High |
| 6 | Seeded-evidence sufficiency interaction (pre-Phase-B) | Local-measured, pipeline-shared | Medium |
| 7 | Swiss evidence scarcity / fetch volatility | Shared, local-heavier | Medium-Low |
| 8 | Grounding / challenge warning noise | Shared | Medium-Low |

---

## 6. Consolidated Commit-Attribution Table

| Commit | Claim / association under review | GPT judgment | Reason |
|---|---|---|---|
| `8fd31470` | Runtime cause | **incorrect** | Docs-only |
| `975df302` | Runtime cause | **incorrect** | Docs-only |
| `f1a372bf` | Runtime cause of current deployed behavior | **incorrect** | Docs-only commit; current deployed label only |
| `62e97e0d` | Caused Swiss `UNVERIFIED` collapses | **incorrect** | Evidence scarcity explains the collapses better |
| `62e97e0d` | Produced clear broad quality improvement | **weak** | No strong isolated same-input lift is proven |
| `2bb979ff` | Runtime cause | **incorrect** | Docs-only |
| `b130d00c` | Observability-only / no runtime behavior change | **supported** | Telemetry additions visible, no quality delta proven |
| `130f5aea` | Runtime cause | **incorrect** | Docs-only |
| `967567ab` | Runtime cause | **incorrect** | Docs-only |
| `442a5450` | Eliminated zero-researched-iteration failure mode | **supported** | Strong ledger evidence on Plastik AC_01 |
| `442a5450` | Improved some outputs (e.g. Bolsonaro EN) | **plausible** | Improvement exists, but stochastic variance remains a confounder |
| `442a5450` | Amplified concentration on some evidence-rich families | **supported** | Immediate A-2 to B jumps on Plastik and Bolsonaro |
| `442a5450` | Main source of current overall instability | **weak** | Treaty proposition failures are more central, and concentration pre-existed |
| `f1a372bf` live deployed runtime | Contains Stage 1 predicate omission / injection failures | **supported** | Hidden Bundesrat tranche demonstrates both on deployed baseline |
| `f1a372bf` live deployed runtime | Contains Stage 5 core-assertion underweighting | **supported** | Hidden job `0afb2d88` demonstrates it if internal record is accepted |

---

## 7. What Is Proven vs Still Uncertain

### Proven

- The strict post-baseline job set is `21` local / `6` deployed.
- The deployed internal evidence base is larger than the public visible set because the Bundesrat hidden-job tranche adds at least `3` more in-range deployed jobs.
- `442a5450` fixed the targeted sufficiency-floor problem.
- The Bundesrat family contains unacceptable same-build instability on local `442a5450`.
- Local `9d79d2a0` is factually worse than deployed `50e2e167` on the non-`rechtskräftig` treaty input.
- Current deployed Plastik `2cf4682c` is factually worse than the local in-range Plastik runs.
- Hidden deployed Bundesrat jobs support distinct Stage 1 predicate omission, Stage 1 interpretation injection, and Stage 5 underweighting failure modes.

### Still uncertain

- How much Phase A-1 helps in general, outside the measured canaries.
- How much of Plastik variance is search-result variance versus downstream reconciliation and aggregation.
- Whether deployed would show the same `rechtskräftig` decomposition instability if rerun on that exact input today.

---

## 8. Recommended Next Fixes

1. **Fix proposition anchoring before doing more Stage 3-first storytelling.**  
   Multi-proposition inputs need stronger separation between literal chronology, legal effect, and evaluative implication.

2. **Strengthen Stage 1 predicate preservation and anti-inference.**  
   Qualifiers like `rechtskräftig` must survive decomposition, and the extractor must not invent constitutional or normative claims not present in the input.

3. **Constrain Stage 4 from penalizing claims for omitted nuance unless that nuance is part of the extracted AtomicClaim.**  
   The system should not mark a true extracted claim false because the overall sentence "feels misleading."

4. **Strengthen Stage 5 core-assertion weighting.**  
   When one claim contains the predicate that actually determines truth, trivially true prerequisite claims must not bury it.

5. **Keep Phase B. Do not revert it.**  
   The per-claim researched-iteration floor is validated.

6. **Run a dedicated same-build repeat canary on the Bundesrat family.**  
   This is now the clearest blocker-class instability in the measured strict range.

7. **Treat Stage 3 work as targeted stabilization, not the sole master explanation.**  
   Validate against both strict-range local jobs and the older pre-baseline concentration history.

8. **Capture deployed query/result traces before attributing future local-vs-deployed gaps to code.**  
   Plastik shows why environment drift can otherwise be misread as a commit regression.

---

## Final Debate Table

| Topic | Claude position | GPT position | Final consolidated judgment |
|---|---|---|---|
| Inventory scope | 39 local / 74 deployed since baseline | Public strict post-baseline set is 21 local / 6 deployed; hidden deployed jobs extend the in-range evidence beyond the public set | Consolidated with provenance split |
| Phase B sufficiency fix | Validated | Validated | Agreed |
| Stage 3 as dominant bottleneck | Dominant current issue | Important amplifier, but not the central proven failure | Claude overstated |
| Plastik local vs deployed | Same-baseline divergence, mainly environment variance | No same-build local baseline run; deployed itself varies and current LT run is factually worse | Claude claim corrected |
| Swiss A-1 collapse | Not caused by A-1 | Not caused by A-1 | Agreed |
| Bundesrat instability | Three distinct failures: omission, injection, underweighting | Blocker-level proposition/decomposition failure, now sharpened by hidden-job evidence | Consolidated and strengthened |
