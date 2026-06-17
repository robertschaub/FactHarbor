# Stage-1 Classification Determinism — Design Proposal (the "Fix C / structural" lever)

**Author:** Lead Architect (Claude Code, Opus 4.8 1M) · **Date:** 2026-05-31 · **Status:** PROPOSAL — design + trade-offs only; needs LLM Expert review + Captain approval; no code.
**Predecessors:** `Docs/ARCHIVE/WIP/2026-05-30_Stage1_Contract_Gate_Hardening_Proposal.md` (§9 mechanism, §11 Fix A+B reverted as ineffective); `Docs/AGENTS/Handoffs/2026-05-30_Lead_Architect_Cross_Stage_Contract_Audit.md`.

---

## 1. Problem (proven)

The Hydrogen input sits on the Stage-1 `single_atomic_claim` ↔ `ambiguous_single_claim` boundary. The understand/classification step runs at **`understandTemperature ?? 0.15`** (`claim-extraction-stage.ts:1425`; raised on retry at `:2660` `+attempt*0.05` and `:2805` `+0.2`). The classification **flips run-to-run**: `ambiguous` → decompose into distinct measurement-frame dimension claims (meets the documented "TTW and full-pathway stay structurally distinct" intent); `single_atomic` → one broad claim, dimensions conflated (fails it). A **prompt tiebreaker (Fix A) was tried and falsified** (2/3 still `single_atomic`; reverted `1c790a05`). A prompt instruction cannot reliably override sampling stochasticity.

**Design tension to respect:** `understandTemperature 0.15` is *intentional* — its schema doc says *"higher = more exploration of ambiguous interpretations"* (`config-schemas.ts:317-318`). The 0.15 exists to let the model *find* dimension decompositions for genuinely-ambiguous inputs. There is also a `deterministic: true` config flag (`config-schemas.ts:316`, default `:1061`) that the understand step **does not honor** (it uses `understandTemperature` regardless) — a latent inconsistency.

---

## 2. This is a *tail*, not a broken mode — and the temperature lever is probably INVERTED

Two facts the framing must get right:

1. **Don't average the two "mode" data points — they're at different prompts.** Pre-fix `6f3037e1` (= the current *reverted* prompt) was **4/5 `ambiguous`**; the 1/3 figure was at the now-reverted Fix-A prompt `2c6496cd`. At the prompt we actually run, **the mode is already `ambiguous`.** So this is a **tail** (~1/5 `single_atomic` + ~1/5 `report_damaged`), **not** a broken classification — a tail on one borderline input, during alpha where run-to-run variance is explicitly wanted.

2. **Lowering temperature most likely makes it WORSE.** `understandTemperature` is "higher = more exploration of ambiguous interpretations" (`config-schemas.ts:317-318`). The `ambiguous` classification — and its dimension decomposition — is *produced by* exploration; the low-temp/greedy choice commits to the single dominant reading. So **temp→0 likely yields MORE `single_atomic`, not more `ambiguous`** — the opposite of the goal. (Not certain: 4/5 ambiguous at 0.15 means ambiguous has real probability mass — but the semantics tilt firmly *against* lowering temperature.)

**Optional Step 0 (characterization, NOT a gate):** a small Hydrogen temp-sweep (N runs at 0.15 vs 0) would confirm both the tail rate at the current prompt and the *direction* of the temperature effect. Prior: it confirms (a) ~1/5 single tail, and (b) temp↓ → *more* single. Run it only if the Captain wants the numbers; the recommendation below does not depend on it, and it must **not** become another long autonomous arc.

---

## 3. Options + trade-offs

| Option | What | Pros | Cons / risk | Compliance |
|---|---|---|---|---|
| **C1 — Lower `understandTemperature` toward 0** (UCM knob) | global determinism on the understand step | simplest; UCM; reversible | **Likely INVERTED — probably makes it WORSE:** lowering temp reduces the exploration that *produces* the `ambiguous` decomposition → yields MORE `single_atomic`. Also **global** (all 8 families); reduces decomposition for inputs that need it (`plastic-en`); fights the retry ladder (`:2660`/`:2805`) | OK (config) but mechanism likely counterproductive |
| **C2 — Deterministic classifier override** for "broad comparative efficiency predicates" | code rule forcing `ambiguous` | trivial; deterministic | **REJECTED — violates AGENTS.md** (semantic classification MUST be LLM-driven, not regex/keyword/heuristic) | ❌ forbidden |
| **C3 — Self-consistency vote on the classification** (N samples, majority) | LLM-driven determinism via redundancy | reduces variance; LLM-driven (structural plumbing on outputs) | **cost** (N classify calls/job); **still yields the modal** classification (same mode-dependency as C1); LLM Expert previously rejected blanket voting (rechtskräftig regression risk) | OK but costly |
| **C4 — Boundary-level distinctness (Stage 2/3 reframe)** | ensure broad comparative-efficiency research/clustering yields ≥2 distinct measurement-frame boundaries *regardless* of the Stage-1 claim-count classification | targets the *actual documented intent* (≥2 distinct boundaries, not claim count); **robust to classification variance**; a single_atomic claim can still cluster into distinct TTW+full-pathway boundaries | shifts locus to Stage 2/3; higher design effort; clustering must stay LLM/UCM-driven; needs its own proposal | OK (LLM-driven) |
| **C5 — Accept the variance + re-status the benchmark** | document Hydrogen as an inherently borderline classification input; re-status `hydrogen-en` from SOLVED → "known-variance/watch"; pursue no global fix | **zero regression risk**; honest; cheapest; aligns with alpha "variance per run is wanted" | leaves the input flaky (~1-2/3 conflated); the "structurally distinct" intent not *reliably* met | OK |

---

## 4. Recommendation — lead with C5

1. **C5 (accept the variance + re-status the benchmark) is the defensible default.** This is a ~1/5 tail on one inherently-borderline input, at a prompt whose mode is *already* `ambiguous`, during alpha where run-to-run variance is explicitly wanted. Re-status `hydrogen-en` SOLVED → "known-variance / watch", document the borderline classification, and ship **no global change**. Zero regression risk; honest; cheapest.
2. **C4 (boundary-level distinctness) — only if you decide the structural intent must be *guaranteed*.** Higher-effort Stage-2/3 work so broad comparative-efficiency research clusters into ≥2 distinct measurement-frame boundaries *regardless* of the Stage-1 claim count; robust to the classification tail. Would get its own scoped proposal.
3. **C1 (temperature) — do NOT pursue.** The mechanism predicts it **backfires** (temp↓ → *more* `single_atomic`); a global change to chase one tail is poor cost/benefit and risks the 7 families the 0.15 exploration setting was tuned for. Revisit only if an optional temp-sweep *surprisingly* shows temp↓ increasing `ambiguous`.
4. **Do NOT:** re-introduce the falsified prompt tiebreaker; implement C2 (forbidden).

**Latent-bug flag (separate; cuts both ways):** the `deterministic: true` config flag (`config-schemas.ts:1061`) is NOT honored by the understand step (it uses `understandTemperature` regardless) — the suite may be running non-deterministically despite being configured otherwise. Worth a look, but honoring it = the same global temp→0 change, so it's a *flag, not a fix*.

---

## 5. Verifier + guards (any landed change)

- **Full 8-family benchmark** (not just Hydrogen), scored against the FULL documented bar (verdict band + ≥2 boundaries + intent's structural distinctness + every-verdict-cites-evidence), under the **fail-fast rule** and **commit-first** provenance.
- Specific guards: `plastic-en` still decomposes by evaluative dimensions (≥2 boundaries) — temp↓ must not collapse its exploration; `asylum-wwii`/`asylum-235000`, both Bolsonaro (≥3 boundaries), both Bundesrat (no collapse, finality anchor) unchanged.
- **Runtime discipline (learned the hard way):** never launch the dev server from the Claude Code agent shell without `unset ANTHROPIC_API_KEY ANTHROPIC_BASE_URL ANTHROPIC_MODEL OPENAI_API_KEY …` (harness injects empty/wrong vars → LLM 404); avoid `restart-clean.ps1` until its CRLF env-prefix bug is fixed.

**Status: design proposal — LLM Expert review + Captain approval required before any change.** Implementation (a UCM/config change for C1, or a Stage-2/3 change for C4) delegates to a Senior Developer.

---

## 6. Review outcome — `/debate` (STANDARD: Advocate/Challenger/Reconciler), 2026-05-31 → VERDICT: MODIFY (not C5-accept; pursue scoped C4(a))

The structured review **overturned the §4 "lead with C5" recommendation** and advanced the analysis with a code-verified finding.

**Verified mechanism (Lead Architect confirmed in-repo):** `generateResearchQueries(claim: AtomicClaim, …)` generates queries from a *single* `claim.statement` (`research-query-stage.ts:137,183`), invoked per-claim. So a `single_atomic` classification (one broad claim) yields **no use-phase/TTW-framed query → no TTW evidence fetched → no TTW boundary** — which explains E9 (`460c52ad`: 5 boundaries, none TTW). Stage-3 clustering *can* separate frames (`claimboundary.prompt.md:1359-1361`) but had no TTW evidence to cluster. **⇒ the fix locus is C4(a) research-query coverage, NOT C4(b) clustering.**

**Verdict (Reconciler, governance-clean, INFERRED):**
- **C5's honest re-status SURVIVES** — stop calling `hydrogen-en` SOLVED (the documented "structurally distinct / min 2 boundaries" intent is not reliably met).
- **C5's "pursue no fix" is REJECTED as too complacent** — the failure is *silent and in-band* (passes verdict bands while conflating dimensions), and shipping that to alpha users is worse than a flagged failure. C5's "alpha variance is wanted" justification is a **category error** (classification stability ≠ verdict variance — proposal/§prior concession).
- **C1 (temperature) REJECTED** (inverted + global), **C2 forbidden**, **prompt tiebreaker falsified** — all confirmed.
- **ADOPTED from Challenger:** **C4(a)** — ensure research-query coverage spans both measurement frames (use-phase/TTW + full-pathway) for broad comparative-efficiency/optimization/resource-use predicates **regardless of Stage-1 claim count** (e.g. via the claim's `expectedEvidenceProfile`/`GENERATE_QUERIES` prompt), so Stage-3 has TTW-framed evidence to cluster. LLM/UCM-driven, generic, runtime-cost-neutral (no extra samples).

**Sequenced next step (gated, cost-aware — NOT "implement C4"):**
1. **Honestly re-status `hydrogen-en`** SOLVED → "known-open structural-intent gap; C4(a) spike commissioned" (`benchmark-expectations.json` + `Captain_Quality_Expectations.md`).
2. **Scoped C4(a) feasibility-spike proposal** (LLM Expert review + Captain approval): does covering both measurement frames in research surface the TTW boundary even under `single_atomic`? Resolves G2/G4 via a few bounded Hydrogen runs — **no long autonomous arc**.
3. **If the spike works** → C4(a) scoped implementation + **full 8-family** validation against the FULL bar (guard `plastic-en` decomposition) under fail-fast/commit-first → returns toward SOLVED. **If infeasible** → Captain *consciously* accepts the tail (deliberate, not silent).

**Confidence:** INFERRED — C4(a) *locus* CONFIRMED by code; C4(a) *sufficiency* pending the spike. **Caveat:** if the spike shows TTW evidence still won't surface or clustering re-merges frames, C4 may need (a)+(b); true tail rate (G1) unmeasured.

---

## 7. CONSOLIDATED POSITION — after 2 independent fresh-eyes reviews (2026-05-31) — *authoritative; supersedes §4/§6 framing*

Two independent reviewers (feasibility + decision) both returned **REFINE**: the direction is right (C4(a) locus; reject C1/C2/tiebreaker; re-status), with these corrections — each verified against the repo:

**1. Mechanism corrected — the broken link is an `expectedEvidenceProfile` enumeration asymmetry, not "single statement."** `generateResearchQueries` renders `claim.expectedEvidenceProfile` (`research-query-stage.ts:185`) and `GENERATE_QUERIES` targets its methodologies (`claimboundary.prompt.md:898`) — so a single broad claim CAN fetch TTW evidence *iff its EEP names the use-phase/TTW frame*. The `ambiguous` extraction branch (`:257`) enumerates "full-pathway vs use-phase-only vs conversion-stage" as distinct dimensions; the `single_atomic` branch (`:253`) only says "keep specificity in EEP" and never *requires* enumerating the frames. **Cleanest hook = extend the `:253` single_atomic comparative-efficiency rule to enumerate distinct measurement frames in the EEP, mirroring `:257`.** EEP-/extraction-side (not `GENERATE_QUERIES`-side) → naturally scoped to the existing LLM-judged comparative-efficiency predicate class (used 5× in-prompt), no new deterministic logic, `plastic-en` unaffected.

**2. C4(b) clustering NOT needed.** `460c52ad` had 5 boundaries with no forced merge (`maxClaimBoundaries=6`, `boundary-clustering-stage.ts:180`) → signature of *no TTW evidence*, not re-merge; clustering already separates frames (`:1361`). *Sufficiency still pending the spike* due to downstream LLM-judgment links: `EXTRACT_EVIDENCE` must tag TTW with a distinct `analyticalDimension` or items collapse at the `scopeFingerprint` step (`boundary-clustering-stage.ts:194`); EEP enrichment is itself an LLM judgment at temp 0.15.

**3. New option surfaced — cheap non-blocking post-hoc DETECTOR (a Q-code in `report-quality-expectations.json` / `/report-review`):** "broad comparative-efficiency input yielded no measurement-frame-distinct boundary." Per project rule `feedback_no_text_parsing_mitigations`, post-hoc *review tooling* is explicitly NOT bound by the no-deterministic-semantic prohibition (which binds in-pipeline code) → this is allowed where C2 is not. Converts the failure **silent → flagged** at ~0 cost. It does NOT meet the distinctness *intent* (still conflated, just visible) → **complement to re-status, not a substitute for C4(a).**

**4. Reframed decision axis (the key output):** the detector removes the *only* stated reason to reject pure-accept ("it's silent"). So the real choice for the Captain is **"is permanently watched-and-flagged acceptable for alpha, or must `hydrogen-en` return to SOLVED?"** — not "accept vs spike" in the abstract.

**5. Honesty corrections (adopted):** (a) "right verdict, structurally incomplete & undetected" — NOT "wrong-looking-right" (the verdict *direction* is correct). (b) The "temperature is inverted" claim is a **hypothesis, not a finding** — C1 stays rejected on **blast-radius** grounds alone (global change for 7 tuned families). (c) The true tail is ~**2/5 full-bar-fail + 1 borderline** across the n=5 record (undercounted as "1/5 silent"); n=5 is too small to estimate a ~20% rate → sizes the spike's run budget. (d) **C4(a) addresses only the silent-conflation tail; the separate `report_damaged` tail (`184f0bba`, energy-density proxy tripping the contract validator) is a DIFFERENT failure mode it does not fix** — the family won't be fully clean from C4(a) alone.

**6. Hardened spike (if commissioned):** success bar must be **end-to-end** — "a TTW-distinct boundary actually surfaces under a `single_atomic` classification," not merely "both-frame queries were generated"; hard run-cap (anti-limbo); watch the `maxClaimBoundaries=6` merge risk and the `EXTRACT_EVIDENCE` `analyticalDimension`-tagging step.

### Consolidated recommendation (3 actions; 1 Captain branch)
- **A. Re-status `hydrogen-en`** SOLVED → "known-open structural-intent gap" (honest; drops headline 5/8 → 4/8). *Both paths.*
- **B. Add the post-hoc detector Q-code** (cheap, allowed, generic) → silent becomes flagged. *Both paths.*
- **C. Captain's branch:** **(i)** if watched-and-flagged is acceptable for alpha → stop here (no pipeline change); **(ii)** if `hydrogen-en` must return to SOLVED → commission the hardened **C4(a) EEP-enumeration spike** (precisely located, generic across comparative-efficiency predicates, cheap hook).
- **Lead Architect lean:** A + B now; for C, lean **(ii) commission the spike** *because* C4(a) generalizes beyond hydrogen and the hook is cheap/precise — but this is genuinely the Captain's risk/effort call, and **(i)** is fully defensible during alpha.
