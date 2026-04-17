# Captain Quality Expectations

**Status:** Living reference · **Last updated:** 2026-04-16 · **Purpose:** Captain's one-page human-readable quality bar for FactHarbor analysis reports.

**Authority rule (applies when this MD and the JSONs disagree):** JSONs win on mechanical bands and Q-code checks; this MD wins on intent, rationale, and current "what to do next" status. When a band changes, this MD is updated to match — it is the derived narrative view.

## Release Summary (as of 2026-04-16)

- **Good (5/8):** `bundesrat-rechtskraftig`, `bundesrat-simple`, `bolsonaro-en`, `bolsonaro-pt`, `hydrogen-en`
- **Watch (2/8):** `asylum-235000-de`, `plastic-en` — main old issue fixed, residual variance open
- **Not validated (1/8):** `asylum-wwii-de` — no current-stack rerun yet
- **Release-blockers:** none of these families currently block release; one isolated rerun each for Bundesrat + Plastic would clear the last open-item noise from the 2026-04-16 concurrent-submission anomaly.

## Benchmark Families

Each row leads with Captain's intent — what the family is actually testing. Bands in parentheses are authoritative in `benchmark-expectations.json`; the MD prose tracks them.

| Slug | Intent | Exact input | Bands (from JSON) |
|---|---|---|---|
| `bundesrat-rechtskraftig` | Must not collapse to UNVERIFIED on Stage 1; the `rechtskräftig` anchor must survive extraction. Old Stage 1 contract failure fixed. | `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben` | MIXED / LEANING-TRUE / LEANING-FALSE; truth 35–60; conf 55–85; min 2 boundaries |
| `bundesrat-simple` | Same as above without the anchor-preservation concern. Expected to track the harder variant. | `Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben` | MIXED / LEANING-TRUE / LEANING-FALSE; truth 35–60; conf 55–85; min 2 boundaries |
| `asylum-235000-de` | Must surface ONE clean official SEM aggregate total, not stitch from components. Improved, not closed. | `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz` | LEANING-TRUE / MIXED; truth 55–75; conf 40–70; min 1 boundary |
| `asylum-wwii-de` | Historical-comparison variant; not yet validated on the current stack. No official band yet. | `235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.` | No bands until first current-stack rerun |
| `bolsonaro-en` | No visible U.S.-government contamination in final citations. Watching for small uncited `state.gov` residue. | `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?` | LEANING-TRUE / MIXED; truth 55–75; conf 45–65; min 3 boundaries |
| `bolsonaro-pt` | Language-agnostic transfer of EN fixes. Confirmed on current HEAD. | `O processo judicial contra Jair Bolsonaro por tentativa de golpe de Estado respeitou o direito processual brasileiro e os requisitos constitucionais, e as sentencas proferidas foram justas` | LEANING-TRUE / MIXED; truth 50–75; conf 40–65; min 3 boundaries |
| `hydrogen-en` | Tank-to-wheel and full-pathway analyses stay structurally distinct — do not get conflated. Solved. | `Using hydrogen for cars is more efficient than using electricity` | FALSE / MOSTLY-FALSE; truth 5–25; conf 65–85; min 2 boundaries |
| `plastic-en` | No fallback UNVERIFIED collapse from the old Stage 4 parse failure. Parse-failure fixed; evidence variance remains. | `Plastic recycling is pointless` | MOSTLY-FALSE / FALSE / MIXED; truth 10–35; conf 55–80; min 2 boundaries |

## Generic Expectations (apply to every input, approved or not)

- No report-specific or benchmark-specific hacks. Fixes must be generic and topic-neutral.
- No deterministic semantic adjudication in code. Meaningful analytical decisions come from LLM calls, not regexes, keyword lists, or heuristic rescues.
- Input neutrality: question and statement forms of the same claim stay within ≤4% outcome drift.
- Confidence accompanies every verdict and means confidence that THIS verdict is correct.
- Evidence must be real, cited, and probative. Low-probative evidence should not drive verdicts.
- Every published verdict cites at least one supporting or contradicting evidence item.
- Web search is required — model staleness alone is not a sufficient evidence base.
- Baseless opinion or political contradiction must not count as evidence-backed contestation and must not move truth or confidence.
- Warning severity reflects verdict impact, not internal noise. Real degradation is visible; fully recovered fallbacks are not escalated.
- Multilingual robustness: no English-only assumptions or logic paths.
- Report quality is broader than symmetry: verdict accuracy, explanation quality, evidence completeness, cross-lingual robustness, and stability all matter.

## For Inputs Outside the 8 Approved Families

- Apply all generic expectations above.
- Do NOT invent new benchmark verdict bands. Captain adds new families to `AGENTS.md` and `benchmark-expectations.json` explicitly.
- Treat non-approved inputs as controls, stability probes, regression fixtures, or exploratory cases.

## Next Actions

Each item has a concrete next step, owner expectation, and whether it blocks release.

| Family / concern | Next action | Gates release? |
|---|---|---|
| `asylum-wwii-de` | Single isolated rerun on current stack to produce a first verdict band. | No — but keeps the family permanently "not validated" until run |
| `bundesrat-rechtskraftig` + `plastic-en` | One isolated (non-concurrent) rerun each to clear the 2026-04-16 concurrent-submission collapse from the record. | No — the collapse was ruled infrastructure; reruns just remove ambiguity |
| `asylum-235000-de` | Rerun with explicit source-inspection to confirm one clean official SEM aggregate surfaces, not a stitched component total. | No — current family behavior is usable, cleanup-tier |
| `bolsonaro-en` evidence-pool residue | Ongoing monitoring of whether uncited `state.gov` items remain in the evidence pool across runs. | No — citations are clean |
| Q-S1.3 / Q-S1.1 / Q-V6 / Q-ST5 check activation | Add per-family annotations (`anchorTokens`, `minDistinctEvents`, `trueButMisleading`, `crossLanguageVariantOf`) to `benchmark-expectations.json` as data becomes available. | No — the checks are dormant until then |

## Reading Order

1. **This doc** — one-page scan for direction and open items.
2. `Docs/AGENTS/benchmark-expectations.json` — exact per-family bands and latest verified job IDs.
3. `Docs/AGENTS/report-quality-expectations.json` — Q-code check catalog consumed by `/report-review`.
4. `AGENTS.md` — the non-negotiable project rules (generic by design, input neutrality, pipeline integrity, warning severity).

## Background Sources

Not part of the runtime loop; consult when researching rationale:

- `Docs/WIP/2026-04-11_Canonical_Quality_Criteria.md` — origin of the Q-code taxonomy.
- `Docs/WIP/2026-04-08_Complete_Quality_Assessment_and_Plan.md` — underlying assessment that produced the Q-codes.
- `Docs/DEVELOPMENT/Captains Prompting Notes.md` — Captain's direct wording on report quality, confidence, evidence quality.
- `Docs/ARCHIVE/Captain_Comments_Consolidated_2026-02-16.md` — earlier Captain comments that became formal rules.
