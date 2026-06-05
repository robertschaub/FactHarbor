# Pipeline Era Comparison — Worktree-Native Study (Plan + Harness Spec)

**Date:** 2026-06-04
**Role:** Lead Architect
**Status:** Active plan (Captain-approved direction) — **PAUSED 2026-06-04** (no code started; resume at §5 Phase 1 spike).
**Supersedes (for the near-term path):** the in-tree multi-variant docs — now a **decoupled, deferred capability** (see §7).

### Document map (entry point for this cluster)

| Doc | Role | Status |
|---|---|---|
| **this file** | Worktree-native era-comparison study | **ACTIVE (paused)** — resume here |
| `2026-06-04_Multi_Variant_Pipeline_Architecture.md` (+ `_Specification`, `_Implementation_Plan`) | In-tree multi-variant capability (registry + file-authoritative UCM + provenance + 2×2 cross-conditions) | **DEFERRED / decoupled** — revive only if forward variant testing is wanted |
| `2026-06-04_Multi_Variant_Pipeline_Codex_Review_Prompt.md`, `..._Gemini_Scoped_Review_Prompt.md` | Review prompts for the deferred capability | reference |
| `2026-06-04_Report_Quality_Measurement_*` (parallel workstream — not authored here) | The **measurement/rating layer** that scores the reports this study produces | related — feeds §5 Phase 3 |

> **Resume note (paused):** nothing implemented. Next action when resumed = §5 **Phase 1 runnability spike** on `2before_bol_fix` (`d528b62c`). The actual `/v1/analyze` run needs a Captain-defined input + live-spend OK; the worktree bring-up (install/build/start servers) is safe.

---

## 0. Decision provenance

After a scoped second-opinion review (Cline/Gemini 3.1-pro, 2026-06-04) and an advisor cross-check, the Captain chose **study-first**: run the historical eras **natively** via `git worktree` rather than re-implementing each era's Stages 2–5 in-tree. This **reopens and stands down two previously-locked decisions** for this path:
- the **in-tree variant registry** (process/worktree-native is used instead), and
- the **Stage-1-pin** (each era runs its own full pipeline, including its own claim selection).

Rationale: the target eras are **deeply code-divergent historical tags** (42 / 21 / 16 analyzer files vs HEAD). Re-implementing them in-tree is a large, error-prone translation with **silent semantic fidelity loss** (compiles, but prompts quietly degrade); running the original commit is **code-faithful** with zero re-implementation.

---

## 1. Goal and the precise question

**Goal:** attribute analysis-quality differences across pipeline eras — *which era's pipeline produced the best reports, and by how much* — on the Captain-defined inputs.

**The question this study answers:** *"Which era's **full** pipeline (Stages 1–5, unmodified) produces the best reports **on today's external world**?"* — the **true baselines**, conditions ① (Era→Era) and ② (HEAD→HEAD) of the 2×2 ablation below.

**What it does NOT answer (deferred):** the **upstream-vs-downstream decomposition** — conditions ③ (HEAD-claims→Era-downstream) and ④ (Era-claims→HEAD-downstream). Those require **cross-version claim injection**, which is exactly the in-tree adapter machinery; they ride with the deferred capability (§7).

### The 2×2 ablation (adopted as the framing; Gemini's methodology win)
| # | Stage 1 (claims) | Stages 2–5 (downstream) | In this study? |
|---|---|---|---|
| ① | Era-X | Era-X | **Yes — native worktree** |
| ② | HEAD | HEAD | **Yes — native HEAD** |
| ③ | HEAD | Era-X | Deferred (needs in-tree claim injection) |
| ④ | Era-X | HEAD | Deferred (needs in-tree claim injection) |

①&② give the honest "which full pipeline is best" answer now. ③&④ (why — upstream or downstream) come only if the decoupled capability is later built.

---

## 2. Honest caveats (state these in the final report)

1. **External-world drift — this measures "era code on *today's* world," not the era's original reports.** The pipeline makes live LLM + search calls; models have been retired/changed and search results have moved (per memory: model-alias drift, Serper→P1, CSE limits). So neither this nor any approach recovers historical outputs. Running all arms **concurrently** holds the external world ~constant *across eras within a run*, which is what makes the comparison fair.
2. **Result-schema drift — cross-era reports are not directly diffable.** HEAD is `3.2.0-cb`; older tags emit older schemas. The harness must **normalize** to a common comparison view (verdict label, truthPercentage, confidence, evidence/source counts, warnings) before diffing.
3. **No unified provenance/fingerprint** across native arms (that was an in-tree benefit). The harness records each arm's commit + dirty state + its own prompt/config hashes; comparison is by normalized view, not a shared fingerprint.
4. **Variance is real (alpha).** Run **N reps per arm** and compare distributions/medians, not single runs.

---

## 3. Operational reality (verified 2026-06-04 — worktrees are NOT "light glue")

Diff of the 3 tags vs HEAD shows each arm needs its **own full stack**, not just a different port:

| Tag | Commit | Deps drift (own install) | API schema drift (own DB) | API contract drift (own API process) |
|---|---|---|---|---|
| `quality_before_decline` | `d3ad26ca` (03-08) | large (lockfile +5.2k/−3.9k) | yes (Data −20) → own DB | yes (+35/−582) |
| `Quality_Top_Peak` | `b7783872` (04-04) | moderate (+493/−877) | yes (Data −7) → own DB | yes (+18/−418) |
| `2before_bol_fix` | `d528b62c` (05-25) | moderate (+306/−819) | **none** (schema-compatible) | yes (+7/−279) |

⇒ each era = **its own `npm install` + (for 2 of 3) its own DB schema/migrations + likely its own API process + its own env/secrets**. Still plausibly cheaper than faithful 42-file re-implementation, but budget for full-stack-per-era bring-up, and expect dependency rot on the March tag. **This is the assumption the Phase 1 spike must validate.**

---

## 4. Harness contract (out-of-band orchestrator)

A standalone script (e.g. `scripts/era-study/run-era-study.mjs`), **not** part of the product. Per arm (3 eras + HEAD):

1. **Provision** — `git worktree add` the tag into an isolated dir (non-destructive; never touches the main checkout or its DBs).
2. **Build** — install that arm's deps (`npm ci` on its lockfile; `dotnet restore/build` for its API); use the era's toolchain versions where they differ.
3. **Isolate state** — own `config.db`/`factharbor.db`/`source-reliability.db` and own ports under the worktree; never share HEAD's DBs (AGENTS: don't write the main `factharbor.db`).
4. **Run** — start that arm's web + api; submit each Captain-defined input to its `/v1/analyze` (with the arm's invite code), N reps; poll to completion.
5. **Collect** — capture `ResultJson` + `reportMarkdown` + the arm's commit/dirty-state + its prompt/config hashes.
6. **Normalize + compare** — project every arm's report to a common comparison view (§2.2); emit a cross-era comparison report (deltas + per-input table + variance bands).

**Inputs:** only the Captain-defined analysis inputs (AGENTS.md). **No invented inputs.**

**Concurrency/teardown:** run arms concurrently for external-world fairness where resources allow; tear down worktrees + processes after collection.

---

## 5. Phased plan

### Phase 1 — Runnability spike (de-risk the core assumption) [do first]
- Bring up **one** arm end-to-end: `2before_bol_fix` (`d528b62c`) — schema-compatible + most recent ⇒ lowest drift. Worktree → install → run web+api → submit **one** Captain-defined input → get a complete `ResultJson`.
- **Decision gate:** if it runs with reasonable effort → proceed. If it fights dependency rot / missing old deps / env/secret/schema problems badly → **stop and report** (the worktree cost argument weakens; reconsider vs the deferred in-tree path). Classify the attempt per AGENTS Failed-Attempt Recovery.

### Phase 2 — Generalize the harness
- Parameterize over arms (3 eras + HEAD); per-arm build/run/isolate/collect; port + DB isolation; reps.
- Handle the harder bring-ups (`quality_before_decline` deps/schema; per-era API).

### Phase 3 — Normalization + comparison
- Common comparison view across schema versions; cross-era delta report (verdict/truth/confidence/evidence/warnings); variance bands over reps. Reuse diag intuition (`compare-evidence-pools.cjs`, `verdict-direction-instability.cjs`).
- **Scoring/rating** of the normalized reports is the job of the parallel **Report-Quality Measurement** workstream (`Docs/WIP/2026-06-04_Report_Quality_Measurement_Implementation_Plan.md`) — this study produces the era reports; that layer rates them (Q-codes + reference model + pairwise A/B). Use its Phase-1 zero-spend rollup over the collected `ResultJson`s rather than inventing a scoring scheme here. (Per-stage causal attribution = the deferred 2×2 cross-conditions ③&④.)

### Phase 4 — Run the study (Captain-gated live spend)
- Commit-first; Captain-defined inputs; N reps/arm; fail-fast on clear breakage. Produce the attribution report with the §2 caveats stated. Compare against `Captain_Quality_Expectations.md` / `benchmark-expectations.json`.

**Safe verification** (Phases 1–3 plumbing): `node --check`, harness dry-runs against a single arm, no batch spend until Phase 4 gate.

---

## 6. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Old commit won't build/run (dep rot, env, secrets, old toolchain) | Medium–High (worse for `d3ad26ca`) | Phase 1 spike on the easiest tag first; budget per-era bring-up; fall back to in-tree path if a tag is unrunnable |
| API schema drift needs per-era DB/migrations | Confirmed for 2 of 3 | Own `factharbor.db` per worktree; run the era's own migrations |
| Result-schema drift makes diffs misleading | High | Normalize to a common comparison view before diffing; never raw-diff `ResultJson` across eras |
| External-world drift misread as era quality | High | State the caveat; run arms concurrently; compare within-run, report "on today's world" |
| Variance read as signal | Medium | N reps/arm; compare distributions, not single runs |
| Live spend surprise | Medium | Captain-gated Phase 4; reps × arms × inputs budgeted up front |
| Secrets/keys per worktree | Medium | Reuse current env keys (read-only); do not commit; old commits may expect different env var names — reconcile in Phase 1 |

---

## 7. Relationship to the in-tree capability (now decoupled + deferred)

The in-tree design — **`2026-06-04_Multi_Variant_Pipeline_{Architecture,Specification,Implementation_Plan}.md`** (+ the Codex/Gemini review prompts) — is **not discarded**; it is the design for a **separate, deferred capability**: a durable multi-variant registry + **file-authoritative UCM simplification** + **embedded provenance/fingerprint** + add/remove/replace + product-integrated comparison, and the **2×2 cross-conditions ③&④**.

Pursue it **only if forward variant testing (new, evolving variants) is actually wanted** — judged on its own merits, **not** as a prerequisite to this study. If/when it is built, **this worktree harness becomes its fidelity oracle**: the native-era outputs are the ground truth any in-tree re-implementation must match.

The **UCM simplification** (files-authoritative, drop the config DB/editing UI) is independently valuable and can also proceed as its own small initiative — it does not depend on either pipeline-comparison path.
