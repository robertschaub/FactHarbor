# Prompt Audit + Adversarial Review — claimboundary / source-reliability

- **Date:** 2026-06-01
- **Commit audited:** `68d8b61a` · **HEAD now:** `bcae3239` (chain: `b1c7e0cf` docs → `f439f7da` **S4** code fix → `bcae3239` = the **F01–F09 prompt fixes**, this work). §4 line numbers refer to the pre-fix `68d8b61a` text.
- **Role:** LLM Expert + Lead Developer
- **Method:** `/prompt-audit` (static, 9-criterion rubric) → independent adversarial review (2 refute-by-default subagents) → code verification of verdict-moving claims → third independent GPT-agent reviewer (see §7). Conclusions below are reconciled across all three passes.
- **Status:** **Audit effectively CLOSED (2026-06-01).** Prompt fixes F01–F09 applied (`bcae3239`, Captain-approved). Systemic items dispositioned: S4 done (`f439f7da`); S5 + S6-specificity done (`fd5ce7e2`, Tier 1); S1, S3, advisory tunables **accepted** (Tier 3). Only an **optional** Tier-2 UCM pass (S2 `0.50` + S6 gating knobs) is deferred/unscheduled. Verified: suite 1916 pass, build clean.

---

## 0. Agent coordination / status — READ FIRST

**For other agents working concurrently. Status as of 2026-06-01.**

- **Phase:** Static prompt audit + 3-pass adversarial review **COMPLETE**; the 9 prompt fixes are now **APPLIED** (commit `bcae3239`, Captain-approved + verified).
- **On-disk changes by *this* (audit) agent:** (1) the F01–F09 prompt edits committed in `bcae3239` — `apps/web/prompts/claimboundary.prompt.md`, `apps/web/prompts/source-reliability.prompt.md`, and one stale string-match assertion in `verdict-prompt-contract.test.ts`; (2) this coordination doc (still untracked). No config/UCM *source* edits — the local `config.db` was refreshed by the build's postbuild reseed (normal).
- **Heads-up:** if you are editing `claimboundary.prompt.md` / `source-reliability.prompt.md`, **rebase onto `bcae3239`** — the F01–F09 wording is already in. The §4/§6 entries describe what changed.

**No-go / coordination flags:**
1. **§4 prompt fixes — ✅ APPLIED in `bcae3239`** (2026-06-01, explicit Captain approval; suite 1911 pass + build verified). All four in-scope prompts now carry the F01–F09 wording. *(was: drafted/certified but awaiting the §Analysis Prompt Rules approval gate — now satisfied.)*
2. **`analyticalDimension` code bug (S4)** — ✅ **DONE in `f439f7da`** (Lead Architect, 2026-06-01): propagated through Stage-2 + preliminary (schema/interface/mapping) + seed + the `preliminaryEvidence` element type; `scopeFingerprint` test added; build clean + full suite 1911 pass. **Do not re-implement.** *(was: queued as a task chip at `research-extraction-stage.ts:387-394`.)*
3. **Systemic items dispositioned (§6):** S4, S5, S6-specificity **done**; S1, S3, advisory tunables **accepted**. The **only** deferred slice is an **optional** Tier-2 UCM pass — S2 `0.50` threshold + S6 relevance caps + mega-cluster. Unscheduled; if you're doing a config pass, that's the slice to fold in (don't apply as prompt edits).
4. **This doc is untracked** (the prompt fixes themselves ARE committed in `bcae3239`; only this coordination record is uncommitted). Per the parallel-agent safety protocol, a `git stash`/`checkout`/`clean` could delete it — preserve or commit before destructive git ops.
5. **HEAD context:** audited `68d8b61a`; HEAD now `bcae3239` (`b1c7e0cf` docs → `f439f7da` S4 → `bcae3239` prompts). §4 line numbers refer to the pre-fix `68d8b61a` text; re-anchor against current HEAD if you edit these prompts further.

**TL;DR for a passing agent:** audit **effectively closed**. 9 prompt fixes applied (`bcae3239`); S4 fixed (`f439f7da`); Tier-1 follow-ups S5 + S6-specificity fixed (`fd5ce7e2`); S1/S3/advisory tunables **accepted as-is**. Only deferred = an **optional** Tier-2 UCM pass for a few gating knobs (S2 `0.50`, relevance caps, mega-cluster) — unscheduled, do only if tuning is wanted.

---

## 1. Scope

In-scope files (`apps/web/prompts/**/*.prompt.md`):

| File | Sections | Notes |
|---|---|---|
| `claimboundary.prompt.md` | 33 runtime prompts | The dominant artifact; scored worst-section-per-criterion. |
| `input-policy-gate.prompt.md` | 1 | Eligibility gate. |
| `source-reliability.prompt.md` | 1 (multi-mode) | Domain reliability + evidence-quality classification. |
| `text-analysis/inverse-claim-verification.prompt.md` | 1 | Strict-inverse detector. |

`promptfoo/*.txt` fixtures and `README.md` are out of scope (not `.prompt.md`).

---

## 2. Binding constraints (every proposed prompt fix must satisfy)

1. **Generic by Design** — no domain keywords, named entities, regions, or date-periods introduced.
2. **No deterministic text analysis** — no regex/keyword-list/rule classifiers.
3. **No string-match tests** as mitigations.
4. **Strings influencing analysis** live only in prompts or web-search queries.
5. **UCM is the home of tunables** — thresholds/weights/limits go to `configs/*.default.json` + UCM, not prompt literals.
6. **Multilingual robustness** — a fix that only works for one language is not a fix.
7. **No teaching-to-the-test** — no vocabulary from `AGENTS.md` §Captain-Defined Analysis Inputs.

---

## 3. Rubric summary (post-review)

`P` = PASS · `W` = CONCERN · `F` = FAIL · Score = count of `P`/9.

| Prompt | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | Score |
|--------|----|----|----|----|----|----|----|----|----|-------|
| claimboundary.prompt.md | W | W | P | P | **F** | W | W | W | P | 3/9 |
| input-policy-gate.prompt.md | P | P | P | P | P | P | P | P | P | 9/9 |
| source-reliability.prompt.md | W | W | P | W | W | P | W | P | P | 4/9 |
| inverse-claim-verification.prompt.md | P | P | P | P | P | P | P | P | P | 9/9 |

Criteria: R1 Rule compliance · R2 Efficiency · R3 Effectiveness · R4 Un-ambiguity · R5 Generic hygiene · R6 Multilingual · R7 Bias/neutrality · R8 Schema alignment (vs `types.ts`) · R9 Failure-mode coverage.

**Scoring caveat:** `claimboundary` aggregates 33 distinct prompts; each cell is *worst-section-per-criterion*, so 3/9 reflects a few flawed sections, not the whole file (~27 sections clean). After review the file has **one FAIL (F01)**, not two. `R8 = P` on the two small prompts means *no consuming type exists in `types.ts`* (nothing to misalign), not "verified aligned."

---

## 4. Findings (post-review, FAIL → CONCERN)

Format: severity · criterion · evidence (`file:line`) · issue · proposed prompt-edit fix · abstract mechanism.

### F01 — FAIL · R5 Generic hygiene · `claimboundary.prompt.md:103-104` *(broadened by review — two instances)*
- **Evidence:** Two named Swiss-coded examples in the Stage-1 language/geography rules:
  - `:104` geography rule — `"(e.g., a German-language claim naming a city or canton that belongs to Switzerland → Swiss country code, not a German-speaking country's code)"`.
  - `:103` language-detection rule — `"(e.g., \"Zürich\" in an English sentence is still English input)"`.
- **Issue:** Both examples name a specific Swiss place/jurisdiction + language, matching the Captain-defined Swiss-German inputs (`AGENTS.md` §Captain-Defined Analysis Inputs). The *same lines* carry correctly-abstract examples elsewhere (`"Country D developed technology Y" → null`), so these are knowing deviations toward the live test set — the exact teaching-to-the-test pattern `AGENTS.md:99` forbids.
- **Fix:** Replace both with placeholders — geography: *"a claim in language L_a naming a sub-national unit belonging to country C derives C's code, even when L_a is not C's dominant language"*; language: *"a place name P inside a sentence written in language L does not by itself change the detected language."*
- **Mechanism:** Named jurisdiction/place/language in examples teaches to the benchmark.

### F02 — CONCERN · R8 Schema alignment · `claimboundary.prompt.md:1139,1224` (EXTRACT_EVIDENCE)
- **Evidence:** Prompt instructs `category` examples `statistical_data, expert_testimony, case_study`; schema says `"string"`. None are members of the closed `EvidenceItem.category` union (`types.ts:479-486`).
- **Review correction (FAIL → CONCERN):** The runtime does **not** violate the type. `mapCategory()` (`pipeline-utils.ts:104-118`) normalizes `statistical_data→statistic`, `expert_testimony→expert_quote`, `case_study→evidence`, with `?? "evidence"` fallback; the preliminary mint site hardcodes `category:"evidence"`. So the declared type correctly describes runtime data. The residual defect is prompt-quality: the prompt instructs out-of-contract values and relies on a silent downstream mapper (wasteful + ambiguous).
- **Fix:** List the canonical `EvidenceItem.category` enum literals in the rule + schema; drop the non-enum free-text examples. (Tightening the Zod `z.string()` → enum is a separate code change → `/audit`.)
- **Mechanism:** Free-text field instructed with values outside the declared closed enum.

### F03 — CONCERN · R6 Multilingual · `claimboundary.prompt.md:911` (GENERATE_QUERIES)
- **Evidence:** `"(for example: current, currently, now, today, aktuell, derzeit, zurzeit, en ce moment)"` — EN/DE/FR Latin-script cue words for present-state detection.
- **Issue:** Language-specific lexical cues for a semantic decision; non-Latin / other languages unsupported. Minor (illustrative, LLM-read, surrounded by semantic instruction).
- **Fix:** Drop the lexical list; instruct purely on meaning — *"when the claim's meaning concerns the present or current state, regardless of the words or language used."*
- **Mechanism:** Language-specific lexical cues for a meaning judgment.

### F04 — CONCERN · R5 Generic hygiene · `claimboundary.prompt.md:1165` (EXTRACT_EVIDENCE)
- **Evidence:** flow-vs-stock examples `"applications filed, decisions issued, permits granted, admissions approved, arrivals during a period"`.
- **Issue:** Immigration/asylum-coded vocabulary that tracks the Captain inputs about asylum/refugee counts. The flow-vs-stock *mechanism* is legitimate; the *examples* are domain-shaped.
- **Fix:** Abstract to *"flow metrics (events counted over a period) vs. stock metrics (a standing total at a point in time)."*
- **Mechanism:** Example vocabulary shaped by a motivating domain, not the mechanism.

### F05 — CONCERN · R7 Bias/neutrality · `claimboundary.prompt.md:1695` (VERDICT_RECONCILIATION; cf. VERDICT_ADVOCATE :1484)
- **Evidence:** `"resolve truth primarily on whether the authoritative totals are materially close in magnitude."`
- **Review correction (narrowed):** Do **not** flag L1696 (`"do NOT force a low-truth verdict by inventing an uncited lower endpoint comparator"`) — that is the deliberate `AGENTS.md` §Pipeline-Integrity principle (uncited material must not lower truth). L1695 sentence 2 already supplies a downgrade path for material gaps. The **only** genuinely unguarded inflation case is **stated-strict-operator**: the prompt never instructs honoring a strict operator stated *in the claim itself* (e.g., "more than", "at least as many").
- **Fix:** Add the narrow converse: *"When the claim's own wording states a strict comparison operator, honor it — loose magnitude closeness does not satisfy a strictly-stated threshold; treat the shortfall as a truth, not merely confidence/misleadingness, signal."* (Do **not** impose unstated strictness — already handled at :1487/:1697.)
- **Mechanism:** A one-sided "lean-true" path for one claim shape with no symmetric guard for an explicit strict operator.

### F06 — CONCERN · R2 Efficiency · `claimboundary.prompt.md:226,273-278,380` (CLAIM_EXTRACTION_PASS2)
- **Evidence:** Wording-fidelity restated as pre-decomposition scaffold (`:226`), authoritative rule block (`:273-278`), and self-check (`:380`).
- **Issue:** Intra-section overlap inflates per-call tokens. (Note: this is *functional* reinforcement — scaffold → rule → self-check — not dead duplication, so lower priority.)
- **Fix:** State the principle once with sub-bullets; have the self-check reference it rather than re-state.
- **Mechanism:** Intra-prompt repetition of one rule across passages.

### F07 — CONCERN · R2 Efficiency · `source-reliability.prompt.md:76-85, 197-204`
- **Evidence:** `SOURCE TYPE SCORE CAPS` table duplicated near-verbatim (same cap values + "reform → reclassify" note in both places).
- **Issue:** Token waste + divergence risk if only one copy is edited.
- **Fix:** Keep one canonical caps block; replace the second with a back-reference.
- **Mechanism:** Duplicated normative table → drift + token cost.

### F08 — CONCERN · R7 Bias/neutrality · `source-reliability.prompt.md:73-74`
- **Evidence:** `"Reprimands from regimes without rule of law should be IGNORED or viewed positively."`
- **Issue:** Sign-flips evidence based on a subjective geopolitical "rule of law" determination by the model (no evidence-based criteria given).
- **Fix (revised by review — preserve methodology):** *"Reprimands from a body whose independence is not evidenced are non-probative (neither positive nor negative) — **unless** independent evidence documents that the reprimand is retaliatory or otherwise credibility-relevant, in which case weight that evidenced context, not the reprimand's origin alone."* (Keeps the legitimate retaliation signal instead of discarding it via a blunt neutralization.)
- **Mechanism:** Directional sign-flip gated on a subjective classification injects bias.

### F09 — CONCERN · R5 / R7 · `source-reliability.prompt.md:254` (also :63) *(added by review)*
- **Evidence:** `"MBFC (Media Bias/Fact Check), NewsGuard, AllSides, CORRECTIV, Snopes, PolitiFact, … EUvsDisinfo."`
- **Issue:** A hardcoded named-entity list (`AGENTS.md:49`) and an Anglo/English-centric set of HIGH-probativeValue exemplars — a stronger generic-hygiene/neutrality instance than F03/F04, partly offset by the regional-fact-checker text at `:106-108`. Flagged for consistency.
- **Fix (revised by review — region-neutral):** Replace brand names with the abstract assessor taxonomy the prompt already defines at `:208-214`, expressed region-neutrally — *"IFCN-signatory fact-checkers, media-credibility rating services, official/intergovernmental disinformation-tracking units."* Do **NOT** carry forward "EU" as a named-region exemplar — that would itself trip C1 (Generic by Design). A curated brand list, if wanted, belongs in UCM, not the prompt (see S2/S3).
- **Mechanism:** Named-entity exemplar list with regional recognition bias.

---

## 5. Rejected fix

- **Change EXTRACT_EVIDENCE `claimDirection` `"contextual"` → `"neutral"` to match `EvidenceItem.claimDirection`.** **REJECTED (correctness):** the parser enum `Stage2EvidenceItemSchema` (`research-extraction-stage.ts:48`) expects `"contextual"` with no `.catch()`; code coerces `contextual→neutral` at `:386`. Emitting `"neutral"` would throw the un-caught enum → `parse()` fails → the **entire evidence batch returns `[]`** (total evidence loss). The prompt is correct for its consumer. Tracked as terminology drift (S1), not a prompt edit.
- No fixes rejected on §1–7 policy grounds.

```
AUDIT-CERT: every accepted fix (F01–F09, with F05/F08/F09 in their revised wording) is N for R1–R6 and Y for R7.
```

**Cert note (process working as intended):** F09's *first-draft* fix reused the prompt's own "EU/government" taxonomy wording, which would have tripped **C1** (named region). The third reviewer caught it; the certified wording above is region-neutral. The 7-constraint gate audits the **fix text**, not just the finding — a fix can fail the gate even when the finding is sound.

---

## 6. Systemic / out-of-prompt-scope items (→ `/audit`)

These are **not** prompt edits (a literal→`${var}` swap or a rename without code wiring would break the prompt), so they are excluded from the §5 prompt-fix certification.

- **S1 — `claimDirection` terminology split (intentional). → ACCEPTED (Tier 3, 2026-06-01).** `EvidenceItem.claimDirection` uses `neutral` (`types.ts:500`); `preliminaryEvidence[].claimDirection` + EXTRACT_EVIDENCE parser use `contextual` (`types.ts:1227`, `research-extraction-stage.ts:48`), bridged by coercion at `:386`. **Disposition: accept** — the coercion works and is documented; cosmetic only. Unify the literal in code (drop the bridge) only during a broader terminology refactor; no standalone work. Do **not** edit the prompt (see §5).
- **S2 — SR hardcoded tunables → UCM. → DEFERRED (Tier 2, 2026-06-01).** Recency multipliers (`source-reliability.prompt.md:330-333`) and the `0.50` confidence/insufficient-data threshold (`:36`, `:442`) are tunables baked into prompt text; `AGENTS.md:216` lists thresholds/SR weights as UCM-tier. The negative-evidence cap **band edges** are partly justified by the legitimately-hardcoded 7-band scale (`AGENTS.md:218`) — keep those. **Disposition: deferred** — migrate the `0.50` threshold to UCM only if a tuning need arises (follows the existing `SR_CALIBRATION` variable pattern). Recency multipliers accepted as in-prompt advisory weighting.
- **S3 — `sourceType` field-name overloading. → ACCEPTED (Tier 3, 2026-06-01).** SR `sourceType` (`:351`: editorial_publisher, propaganda_outlet, …) is a different closed enum than `types.ts` `SourceType` (`:271-280`: peer_reviewed_study, news_primary, …). Zero member overlap, same field name. The SR enum is **not** wired into `EvidenceItem.sourceType` (separate consumer); CB EXTRACT_EVIDENCE `sourceType` does use the `types.ts` enum. **Disposition: accept** — separate consumers, no functional collision; readability only. Rename (e.g. to `outletClassification`) during a future SR-subsystem refactor, not standalone.
- **S4 — CODE BUG: `analyticalDimension` dropped at extraction.** `research-extraction-stage.ts:387-394` builds `evidenceScope` from `name/methodology/temporal/geographic/boundaries/additionalDimensions` but **omits** `analyticalDimension`, although the prompt instructs it (`claimboundary.prompt.md:1153-1156,1231`), the parser accepts it (`:54`), the type declares it (`types.ts:258`), and `BOUNDARY_CLUSTERING`/`SCOPE_NORMALIZATION` depend on it. The promised stage-local-vs-full-pathway signal is silently discarded → degraded clustering. **✅ FIXED in `f439f7da`** (2026-06-01): `analyticalDimension` now propagates through Stage-2, preliminary (schema/interface/mapping at `claim-extraction-stage.ts`), seed (`research-orchestrator.ts`), and the `preliminaryEvidence` element type (`types.ts`); `boundary-clustering-scope` test asserts `scopeFingerprint` uses it. Build clean + full suite 1911 pass.
- **S5 — Dead value reference. → DONE (Tier 1, `fd5ce7e2`, 2026-06-01).** `VERDICT_DIRECTION_VALIDATION` reasoned over `claimDirection` value `"mixed"`, which `EvidenceItem.claimDirection` can never hold (`supports|contradicts|neutral`). **Fixed:** dropped `"mixed"` → now `"neutral" means non-directional or ambiguous`. (`"mixed"` remains valid only for per-boundary `evidenceDirection`, not evidence items.)
- **S6 — ClaimBoundary prompt-level hardcoded tunables (broader than S2). → SPLIT (2026-06-01): part DONE / gating DEFERRED / advisory ACCEPTED.** *(added by third reviewer)* Numbers baked into `claimboundary.prompt.md`: specificity `0.6` (`:435`), relevance caps `0.3` foreign_reaction (`:1062`) and `0.5` comparator (`:1073`), mega-cluster `>80%` (`:1389`), track-record `0.5`/`0.6` (`:1499-1500`; also `:1596`, `:1700`), challenger severity `≥20`/`5-19` (`:1592`). **Dispositions:** (a) **specificity `0.6` — DONE** in `fd5ce7e2`: removed the duplicated literal from the prose; Gate 1 (code, `types.ts:865`) owns the threshold. (b) **Gating knobs (relevance caps, mega-cluster) — DEFERRED (Tier 2):** migrate to UCM only if evidence-strictness tuning is wanted. (c) **Track-record bands + challenger severity — ACCEPTED (Tier 3):** advisory reasoning guides / label definitions kept in-prompt (effectively structural per `AGENTS.md:218`).

---

## 7. Review provenance

- **Reviewers:** 2 independent `general-purpose` subagents, refute-by-default, instructed to read files directly (not trust audit quotes), check intended-design traps (`AGENTS.md` §Pipeline Integrity), audit all fixes against the 7 constraints, and hunt for false negatives. Both returned HIGH confidence with `file:line` evidence.
- **Changes forced by review:** F02 FAIL→CONCERN (mapCategory normalizer); F05 narrowed to the stated-strict-operator gap (L1696 is intended design); F09 promoted from a parked observation to a formal finding (consistency); S4 code bug surfaced and verified.
- **Independently re-verified by the lead** (not just reviewer-reported): `mapCategory()` normalization (pipeline-utils.ts:104-118) and the `analyticalDimension` omission (research-extraction-stage.ts:387-394).
- **Third reviewer (independent GPT agent, post-publication):** re-derived all findings against source at `68d8b61a` and confirmed the headline. Changes forced: **F01** broadened to include the second named example (`:103` "Zürich"); **F08** fix revised to preserve methodology (non-probative *unless* retaliation/credibility-relevance is evidenced); **F09** fix revised to drop the "EU" named-region exemplar (the first-draft fix would have tripped C1); **S6 added** (ClaimBoundary-wide hardcoded tunables, broader than the SR-only S2). The F02 downgrade and the F05 narrowing were both independently confirmed.
- **HEAD-drift check:** audited at `68d8b61a`; working tree now `b1c7e0cf`. The only intervening commit is `docs(wip)` — the prompt/code diff is empty — so all findings and line numbers remain valid at current HEAD.

---

## 8. Recommended order of operations

1. **Land F01** (FAIL, generic hygiene; both named examples) — single clearest defect.
2. Land F02, F03, F04, F08-revised, F09-revised (low-risk prompt hygiene/neutrality).
3. Land F05-revised and F06/F07 (token + symmetry).
4. **Systemic items — dispositioned (§6), mostly closed:** S4 **done** (`f439f7da`); S5 + S6-specificity **done** (`fd5ce7e2`); S1, S3, and advisory tunables **accepted as-is** (Tier 3). **Only remaining (optional, Tier 2, unscheduled):** an SR/CB tunables-to-UCM pass for the `0.50` SR threshold + relevance caps + mega-cluster — do only if evidence-strictness tuning is wanted.

All §4 prompt fixes are applied (`bcae3239`). Among systemic items, S5 and S6-specificity were the only prompt-side ones (done in `fd5ce7e2` with approval); the genuinely code/config items (S1, S3, S2/S6 gating) must not be applied as prompt edits.
