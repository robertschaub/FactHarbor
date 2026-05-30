# Stage-1 Contract-Gate Hardening — Design Proposal (REVISED after review)

**Author:** Lead Architect (Claude Code, Opus 4.8 1M) · **Date:** 2026-05-30
**Status:** **Option A REJECTED** by 3 independent reviewers + advisor. The replacement fix is **PENDING an empirical discriminator** (§4) — *do not implement until the variance locus is known.* No code written.
**Upstream diagnostic:** `Docs/AGENTS/Handoffs/2026-05-30_Lead_Architect_Cross_Stage_Contract_Audit.md` (§1 RESOLVED).
**Reviews (this session):** Senior Developer (feasibility), LLM Expert (quality/neutrality), Code Reviewer (adversarial) — all REJECT Option A; convergent reasoning recorded in §2.

---

## 1. Problem (empirically grounded; mechanism CORRECTED by review)

The hydrogen input *"Using hydrogen for cars is more efficient than using electricity"* intermittently fails Stage-1 with a terminal `report_damaged`. **Live test (4 fresh runs, same source `8061954e`): 4 PASS** (`preservesContract:true`, in-band `FALSE 8/79`, `FALSE 14/71`, `FALSE 9/75`, `MOSTLY-FALSE 15/65`) **/ 1 FAIL** (`184f0bba`) ⇒ **flaky, not a deterministic regression.**

**Corrected mechanism (my earlier "prune AC_03" framing was WRONG — caught by all 3 reviewers).** In the failing run, the validator flagged **both thesis-direct carriers AC_01 AND AC_02** as drift via the `selfContradicted` path (`claim-extraction-stage.ts:3361-3393`): it cited them in `truthConditionAnchor.preservedInClaimIds=[AC_01,AC_02]` *and* judged the set "material proxy drift" / "AC_01 and AC_02 together do not cover the full scope." AC_03 ("energy density") is `thesisRelevance: "tangential"` — not a carrier. So there is **no unflagged thesis-direct survivor** to fall back on.

**The 5 runs separate perfectly by claim count:** 3 claims (incl. energy-density) → fail; 2/2/2/1 → pass. **The terminal gate is binary** (`claimboundary-pipeline.ts:799`: `preservesContract===false` → `report_damaged` + abort), and the existing recovery (`runContractCompletion`, `:829-916`) only **ADDS** claims, never drops.

---

## 2. Option A (prune-and-revalidate) — REJECTED (unanimous, 3 reviewers + advisor)

1. **Never fires on the actual failure.** Trigger requires "≥1 thesis-direct anchor-carrier NOT flagged"; in `184f0bba` *both* carriers (AC_01, AC_02) are flagged. Pruning the only prunable claim (tangential AC_03) leaves the flagged pair → still fails. *Option A leaves the captured failure exactly as-is.*
2. **Circular safety.** Step 2 re-validates the pruned set with the **same flaky validator** the proposal exists to route around. A flaky `false` triggers prune; a flaky `true` on the narrowed set greenlights publishing a *narrower* analysis.
3. **Correctness regression (the killer).** For multi-conjunct / comparison-side / decomposition inputs (Rules 16-22), a load-bearing conjunct can be flagged and pruned, leaving a clean subset that re-validates `true` → **publishes a verdict on half the input** (e.g. "voted against the bill AND took donations" → drop the donations conjunct). The current gate correctly *blocks* this; Option A *ships* it. "≥1 anchor survives" does not protect the *other* independent conjuncts.
4. **Per-claim flags don't encode "safe to drop."** `proxyDriftSeverity:material`/`recommendedAction:retry` can mean redundant cruft *or* a load-bearing conjunct phrased with drift; distinguishing them is a coverage judgment the named fields don't provide (and doing it deterministically would violate the no-semantic-logic rule). The only structural signal (`isDimensionDecomposition`) is **absent** in the dangerous multi-assertion regime.

**Verdict: drop Option A.** (Minor: my earlier draft also cited the wrong helper — `contradictedPreservedIds` — and an inverted worked example; both moot given the rejection.)

---

## 3. Candidate fix loci — UNRESOLVED (the right fix depends on WHERE the variance lives)

The reviews surfaced that "flaky" has **three distinct possible loci**, needing **different fixes**, and **not yet distinguished by the data**:

| Locus | What varies | Evidence for | Matched fix | Evidence against / risk |
|---|---|---|---|---|
| **L1 — Extraction shape** | extraction sometimes emits the 3-claim (energy-density-incl) set, sometimes a clean ≤2-claim set; the validator then judges each *deterministically* | the **5/5 claim-count↔outcome** separation | stabilize extraction of broad-comparative decomposition **OR** accept residual variance + a narrow guarded recovery | extraction-prompt area is a churned minefield; rules predate the break (don't blindly edit) |
| **L2 — Validator judgment** | the **same** claim set sometimes passes, sometimes fails (validator flips at temp `0.1`) | none yet (only 1 observation of the 3-claim set) | **resample-on-self-contradiction** (re-draw when `selfContradicted` fires) + lower `claimContractValidationTemperature` toward 0 | if outcome is fixed by claim-count (L1), resampling the validator on a fixed bad set won't help |
| **L3 — `selfContradicted` code check is a false-positive** | nothing varies in the validator; `{preserved ∩ drifted}` is **prompt-mandated & valid** (Rule 11 forces `preservedInClaimIds` on verbatim anchor; `proxyDriftSeverity` is orthogonal), and the code at `:3361-3380` wrongly treats it as a contradiction → abort | the upstream diagnostic's Rule-11/Rule-3 orthogonality finding | correct the code check (don't treat preserved+drifted as a contradiction) | the validator's *own* top-level `preservesOriginalClaimContract` may independently be `false` (raw boolean not persisted) — then the abort is a genuine rejection, not the code check |

**L2 and L3 are mutually exclusive on the same evidence:** either the validator *flips* on a fixed set (L2) or it's *stable* and the code check is wrong (L3). **The resample fix (L2) is incoherent under L3** ("resample hoping the LLM violates Rule 11"). So we must measure before choosing.

---

## 4. Discriminating test (run BEFORE committing any fix) — needs Captain approval (live LLM)

1. **Extraction-vs-validator (separates L1 from L2/L3):** run **5–6 more Hydrogen jobs**; tabulate `(claimCount, energy-density-present, preservesContract, selfContradicted, verdict)`. If claim-count keeps perfectly predicting outcome ⇒ **L1** (variance is in extraction; resampling the validator won't reliably help).
2. **Fixed-set re-validation (separates L2 from L3):** a small instrumented harness calls `validateClaimContract` on the **exact 3-claim `184f0bba` set** N times, logging the **raw** `preservesOriginalClaimContract` + per-claim `proxyDriftSeverity`/`recommendedAction` (not persisted in normal traces). If a fixed set *sometimes passes* ⇒ **L2** (resample is sound). If it *consistently* returns `{preserved+drifted}` with top-level `false` ⇒ **L3** (fix the code check) — or, if top-level is genuinely `false`, the validator *legitimately* rejects the 3-claim set and the lever is **L1** (extraction).

**Cost:** (1) ~5–6 jobs (~$1–5 each); (2) N cheap single LLM calls + a ~30-line read-only harness. Both are live LLM work ⇒ Captain approval.

---

## 5. Rejected approaches (record so they aren't re-proposed)

- **Option A — prune-and-revalidate** (§2).
- **Blanket N-sample majority voting** of the contract judgment: multiplies LLM cost on *every* run; risks regressing the `rechtskräftig` Captain inputs (#1-2, flagged historically false-positive-prone in `claim-extraction-stage.ts:3318-3320,3345-3348`) by locking in the modal judgment. If resampling is used (L2), gate it on *detected self-contradiction* only, not blanket.

---

## 6. Regression guards (any landed fix, regardless of locus)

- A genuine **whole-set drift** input (no valid anchor survives, stably) must still terminally `report_damaged`.
- `rechtskräftig` Captain inputs #1-2 unchanged; PT Bolsonaro unchanged.
- Hydrogen `report_damaged` rate ≈0 over N reruns (commit-first, runtime-refreshed).
- Config in UCM with a single rollback toggle; JSON defaults synced (config-drift test).
- **Fail-fast (Captain rule, 2026-05-30):** during post-fix validation, if the **first 3 jobs** show a *clear* regression (a guard input that passed now fails, or Hydrogen `report_damaged` not improved / worse), **stop the batch**, `git revert` the fix (non-destructive — preserves the hash for provenance), and classify. Do not keep spending jobs to confirm a clear regression. (Now also in AGENTS.md §Live Job Submission Discipline.)

---

## 7. Recommendation

**Do not implement yet.** Run the §4 discriminator (Captain approval), then commit the **locus-matched** fix:
- **L1** → extraction stability (with caution — churned area) or a narrow, coverage-guarded recovery; possibly accept some residual variance on this one input.
- **L2** → `selfContradicted`-gated resample + temperature reduction.
- **L3** → correct the `selfContradicted` code check (treat `{preserved ∩ drifted}` as the valid orthogonal judgment Rule 11 mandates, not a contradiction).

This keeps to the Captain's standard: prove the mechanism (now down to *which stage the variance lives in*) before touching code. Implementation, once the locus is known, is delegated to a Senior Developer with the matched change surface + the §6 guards.

---

## 8. Corrected evaluation against documented expectations (2026-05-30, per Captain) — L1 confirmed dominant

My initial "4/5 pass" checked only verdict label + truth + confidence. Scored against the **full** documented `hydrogen-en` bar (`Captain_Quality_Expectations.md` line 26: FALSE/MOSTLY-FALSE; truth 5–25; conf 65–85; **≥2 boundaries; TTW and full-pathway structurally distinct, not conflated**):

| Job | Verdict | T/C | Claims | Bnds | TTW vs full-pathway distinct | Full bar |
|---|---|---|---|---|---|---|
| `59eb6a95` | FALSE | 14/71 | 2 | 5 | yes (TTW Use-Phase + WTW Full-Pathway) | **PASS** |
| `b779ab4b` | FALSE | 9/75 | 2 | 6 | yes (TTW/Powertrain + Full-Pathway WtW) | **PASS** |
| `b885c508` | FALSE | 8/79 | 2 | 6 | weak — methodology-clustered boundaries, no clean TTW/WTW split | borderline |
| `460c52ad` | MOSTLY-FALSE | 15/65 | **1** | 5 | **no — two WTW boundaries, no TTW; single undecomposed claim** | **FAIL (intent)** |
| `184f0bba` | UNVERIFIED | 50/0 | 3 | 0 | n/a | **FAIL (report_damaged)** |

⇒ **Only 2/5 meet the full bar.** `460c52ad` (Captain-flagged) conflates the dimensions despite landing in the verdict band.

**Locus L1 (extraction-decomposition instability) is dominant.** The variance spans claim count (1/2/3) and boundary structure (clean-distinct → methodology-clustered → TTW-conflated → report_damaged); `report_damaged` is one tail. **L2/L3 fixes (validator resample / code-check) would not address the conflation/under-decomposition cases** — only stabilizing Stage-1 decomposition of broad comparative-efficiency inputs into distinct TTW + full-pathway claims/boundaries does. The discriminator's extraction-vs-validator question is largely answered by this data (extraction-dominated); a fixed-set re-validation remains only to classify the report_damaged tail (L2 vs L3).

**Verifier correction (binds all future validation):** score each run against the **FULL** documented expectation — bands AND ≥2 boundaries AND TTW/full-pathway distinctness AND "every published verdict cites ≥1 evidence item" (generic expectation) — **never verdict bands alone**. Pass target: an agreed ≥k/N runs meet the full bar; `report_damaged` ≈ 0.
