# Stage-1 Classification Determinism — Design Proposal (the "Fix C / structural" lever)

**Author:** Lead Architect (Claude Code, Opus 4.8 1M) · **Date:** 2026-05-31 · **Status:** PROPOSAL — design + trade-offs only; needs LLM Expert review + Captain approval; no code.
**Predecessors:** `Docs/WIP/2026-05-30_Stage1_Contract_Gate_Hardening_Proposal.md` (§9 mechanism, §11 Fix A+B reverted as ineffective); `Docs/AGENTS/Handoffs/2026-05-30_Lead_Architect_Cross_Stage_Contract_Audit.md`.

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
