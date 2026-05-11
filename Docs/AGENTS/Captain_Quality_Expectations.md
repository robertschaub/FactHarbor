# Captain Quality Expectations

**Status:** Living reference · **Last updated:** 2026-05-11 · **Purpose:** Captain's one-page human-readable quality bar for FactHarbor analysis reports.

**Authority rule (applies when this MD and the JSONs disagree):** JSONs win on mechanical bands and Q-code checks; this MD wins on intent, rationale, and current "what to do next" status. When a band changes, this MD is updated to match — it is the derived narrative view.

## How Agents Should Use This File

Use this file as the fast human-readable reference for Captain intent. It is not a replacement for the machine-readable JSONs, live job inspection, or the Captain-defined input list in `AGENTS.md`.

| Section | Use it for | Do not use it for |
|---|---|---|
| Release Summary | Current family status and active caution flags. | Changing bands or deciding a current rerun passed without inspecting the job. |
| Benchmark Families | Captain intent, exact canonical input wording, and JSON-aligned band summary. | Inventing nearby inputs, translating inputs, or adding implementation-specific fixes. |
| Comparator Reports | Recognizing acceptable report shape and useful historical/local/deployed examples. | Treating examples as new benchmark inputs, replacement bands, or proof current HEAD is fixed. |
| Generic Expectations | Cross-family quality rules every report must satisfy. | Waiving family-specific bands or Q-code checks. |
| Next Actions | The next operational question to answer. | Assuming a family is solved when the row explicitly says validation remains open. |

Agent checklist:
- Use only Captain-approved exact inputs for validation, planning, and benchmark comparison.
- When judging report quality, compare the target report against this file, the JSON expectation files, and the best usable comparator reports below; do not judge a report in isolation when a Captain expectation or comparator exists.
- Confirm mechanical bands, `latestVerifiedJobId`, and Q-code annotations in `benchmark-expectations.json` / `report-quality-expectations.json`.
- Treat comparator jobs as report-shape references unless they are explicitly described as exact current-stack validation.
- If a family has no official band, do not infer one from comparator reports.
- Never turn benchmark examples into report-specific code, prompt, or search-query hacks.

## Release Summary (as of 2026-05-11)

**2026-05-09 Captain correction:** Prior tables incorrectly listed `MIXED` as acceptable for `bolsonaro-en`, `bolsonaro-pt`, and `asylum-235000-de`. That was not Captain's original expectation. These families must be true-side: Bolsonaro is legal-basis strongly supported and procedural-fairness largely supported with caveats; asylum-current-total is an official SEM aggregate/threshold claim where caveats belong in confidence and reasoning, not a neutral verdict direction. The same correction pass also moved `bundesrat-simple` to the high-true chronology expectation based on Captain-preferred exact comparators.

- **Good expectation / comparator set (6/8):** `bundesrat-rechtskraftig`, `bundesrat-simple`, `asylum-wwii-de`, `bolsonaro-en`, `bolsonaro-pt`, `hydrogen-en`
- **Watch (4/8):** `asylum-235000-de`, `asylum-wwii-de`, `bolsonaro-en`, `plastic-en` — asylum-current now has a current in-band canary after component rows stayed neutral, but remains watch-listed because one prior stability rerun flipped false-side and the latest narrative still uses component reconstruction as caveat context; asylum-WWII now has a first exact current-stack false-side pair but needs Captain acceptance / later spot-check before closure; Bolsonaro EN has a current exact true-side pass and no-edit comparator review, but remains watch-listed because low-confidence fair-trial/verdict claims and claim-local citation warning are acceptable residuals rather than closure proof; plastic evidence variance remains open
- **Not validated (0/8):** none — all approved families now have at least one current or accepted comparator-backed expectation band
- **Release-blockers:** none formally declared in this file; `asylum-235000-de`, `asylum-wwii-de`, and `bolsonaro-en` have current exact passes but should stay in watch/review lanes rather than be treated as fully closed.

**Bolsonaro current-state caution:** Current exact job `8761ab59a825430ab3bd2ae325dc4573` on `5dc1d675` passed the corrected true-side expectation overall (`LEANING-TRUE` 65/50) with the intended three AtomicClaims. AC_02 and AC_03 are both verifiable and true-side, but low confidence and one admin-only claim-local citation warning mean this is current-pass/watch, not broad closure.

**Bundesrat-rechtskräftig current-state note:** Current isolated exact job `f8e72c84fb004f23945e23c81973fc26` is accepted by Captain as good. It resolves the old zero-evidence/concurrent-run ambiguity: 3 AtomicClaims, 5 boundaries, 88 evidence items, no user-visible warnings, and a coherent `rechtskräftig` dominance analysis. Its truth score 32 is just below the nominal 35-60 band but inside the repository's 8-point noise tolerance.

**Asylum-WWII current-state caution:** Exact current jobs `9e1f0f0014564edeaa0e673b43dc27e6` (`MOSTLY-FALSE` 25/73) and `ce265797d3fc4540a45aaeac99510e4a` (`LEANING-FALSE` 30/63) establish the first false-side band. Reports may treat the present 235k asylum-area count as true-side or definition-caveated, but the historical comparison must use endpoint stock at the end of WWII rather than cumulative wartime admissions/flows.

## Benchmark Families

Each row leads with Captain's intent — what the family is actually testing. Bands in parentheses are authoritative in `benchmark-expectations.json`; the MD prose tracks them.

| Slug | Intent | Exact input | Bands (from JSON) |
|---|---|---|---|
| `bundesrat-rechtskraftig` | Must not collapse to UNVERIFIED on Stage 1; the `rechtskräftig` anchor must survive extraction. Current isolated rerun `f8e72c84fb004f23945e23c81973fc26` is accepted as good: the legal-force anchor dominates while the chronology remains true-side. | `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben` | MIXED / LEANING-TRUE / LEANING-FALSE; truth 35–60; conf 55–85; min 2 boundaries |
| `bundesrat-simple` | Literal chronology claim without the `rechtskräftig` anchor. Captain prefers high-true reports that recognize the signature happened before parliamentary/popular approval while caveating that this is procedurally normal and not final democratic approval. | `Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben` | TRUE / MOSTLY-TRUE; truth 85–100; conf 75–95; min 2 boundaries |
| `asylum-235000-de` | Must surface ONE clean official SEM aggregate total, not stitch from components. Must be true-side; `MIXED` is not acceptable. Latest current canary is in band, with component rows neutral; still watch residual component-reconstruction caveats. | `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz` | LEANING-TRUE / MOSTLY-TRUE; truth 58–75; conf 40–70; min 1 boundary |
| `asylum-wwii-de` | Historical-comparison variant. Current 235k count can be true-side or definition-caveated, but the WWII comparison is false-side when "am Ende des Zweiten Weltkrieges" is treated as endpoint stock rather than cumulative wartime admissions/flows. First exact current pair is in band; keep watch until Captain accepts or a later spot-check confirms stability. | `235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.` | MOSTLY-FALSE / LEANING-FALSE; truth 18–42; conf 50–75; min 2 boundaries |
| `bolsonaro-en` | Must be true-side with caveats: legal basis strongly supported; procedural fairness largely supported with legitimate concerns. Latest exact current canary `8761ab59a825430ab3bd2ae325dc4573` passes overall and preserves three claims; keep watch because AC_03 confidence is low and one preliminary `state.gov` candidate remains as unselected/zero-extraction search residue. | `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?` | LEANING-TRUE / MOSTLY-TRUE; truth 58–85; conf 45–75; min 3 boundaries |
| `bolsonaro-pt` | Same true-side expectation as EN, with language-agnostic transfer of fixes. The `as sentencas proferidas foram justas` clause must survive ACS selection as the verdict/sentence fairness claim; do not discard it as merely subjective. Confirmed on current HEAD, with this selection guardrail now explicit. | `O processo judicial contra Jair Bolsonaro por tentativa de golpe de Estado respeitou o direito processual brasileiro e os requisitos constitucionais, e as sentencas proferidas foram justas` | LEANING-TRUE / MOSTLY-TRUE; truth 58–85; conf 45–75; min 3 boundaries |
| `hydrogen-en` | Tank-to-wheel and full-pathway analyses stay structurally distinct — do not get conflated. Solved. | `Using hydrogen for cars is more efficient than using electricity` | FALSE / MOSTLY-FALSE; truth 5–25; conf 65–85; min 2 boundaries |
| `plastic-en` | No fallback UNVERIFIED collapse from the old Stage 4 parse failure. Parse-failure fixed; evidence variance remains. | `Plastic recycling is pointless` | MOSTLY-FALSE / FALSE / MIXED; truth 10–35; conf 55–80; min 2 boundaries |

## Bolsonaro Comparator Reports

Comparator interpretation guardrail: these reports are quality exemplars for the Bolsonaro expectation, not new benchmark inputs and not substitutes for the canonical `bolsonaro-en` / `bolsonaro-pt` wording. They show acceptable report shape, not proof that current HEAD passes unless the report is explicitly labeled as exact current-stack validation. Use them to recognize the intended shape: true-side overall, 3 AtomicClaims, strong Brazilian-law compliance, and fair-trial/verdict fairness handled as caveated and contested rather than downgraded to `MIXED`. For `bolsonaro-pt`, the sentence-justice clause is the same verdict/fairness dimension and must not be dropped by claim selection as a non-checkable opinion when the report otherwise analyzes legal/procedural standards.

| Job | Verdict | Why it is useful | Caveat |
|---|---|---|---|
| `eb02cd2e535a4556a2bc3c29868412a0` | MOSTLY-TRUE 73/70 | Clean top-line calibration: domestic compliance strong; fair-trial/impartiality subclaim true-side but contested. | Deployed older variant input; not current HEAD proof. |
| `3828f958352c40bf96b4f9e7451be80b` | MOSTLY-TRUE 72/75 | Best comparator for "verdicts were fair": flags fairness as contested without collapsing formal legality. | Older statement-form variant; no prompt hash in result meta. |
| `3f76f6eb069c4d329ca670bcd3c34506` | MOSTLY-TRUE 76/65 | Good later local comparator with explicit split between Brazilian law, international procedure, and fair-trial/verdict standards. | Fair-trial subclaim has lower confidence and must remain caveated. |

Contamination note: the reviewed comparator reports had no final `state.gov` evidence/citation contamination. Reviewed lower-priority comparator `8f07c9de5d0746b382a7fb632b2f2fe5` fetched two `state.gov` sources but extracted zero evidence from them; it is not listed as best because source/boundary concentration and the fair-trial subclaim were near the lower bound.

## Best Usable Exact / Family Comparator Reports

Comparator interpretation guardrail: this table is a lookup aid for report review and regression diagnosis. It does not create new accepted bands, does not approve non-canonical inputs, and does not make older or variant reports current validation proof.

Search scope: local `apps/api/factharbor.db` exact-input matches plus the deployed public `/api/fh/jobs` list. Deployed results below are limited to public visible jobs. Exactness is necessary but not sufficient: weak exact matches are excluded from the "best" columns and named only in notes.

| Slug | Best local report | Best deployed report | Notes |
|---|---|---|---|
| `bundesrat-rechtskraftig` | `f8e72c84fb004f23945e23c81973fc26` — LEANING-FALSE 32/80; historical comparator `b92201bb47454f7498a1919c4a82c567` — MIXED 48/72 | No good deployed exact match found | Current local `f8e72c84` is the preferred exact current-stack comparator and Captain-accepted good report: 3 AtomicClaims, explicit rechtskräftig claim, 5 boundaries, 88 evidence items, no user-visible warnings. Historical `b92201bb` remains useful for mixed-band shape. Visible deployed exact `26432b9bb47f409c97155a148b65566c` is excluded because it is too weak for "best" use: one AtomicClaim and only 30 evidence items. |
| `bundesrat-simple` | `a6b0e0fc14984926a678a462456bc110` — TRUE 97/89; alternate `a53573047fe64778a76e53cb578900c7` — TRUE 96/88 | No exact deployed match found | Captain-preferred exact local comparators and basis for the corrected JSON band. They treat the simple wording as a literal chronology claim and still flag the procedural caveat: signature before parliamentary/popular approval is factually true but not final democratic approval. Excluded prior candidates: `9581a6568dd640c8b5b3cf6bbb57bda3` is too awkward; `5b411500eee44d32857ba1bf3380fe09` captures nuance but is no longer preferred. |
| `asylum-235000-de` | `3ba25fe7c99f4b96822e37a6a65f6bb1` — LEANING-TRUE 62/68 | `6a60b3eb0df540c0b16228d9367b1366` — MOSTLY-TRUE 72/70 | Both are exact and true-side. Local is the cleaner current-stack comparator with 36 evidence items and SEM-heavy sourcing; deployed is usable but near the upper truth/confidence edge. |
| `asylum-wwii-de` | `9e1f0f0014564edeaa0e673b43dc27e6` — MOSTLY-FALSE 25/73; confirmatory current exact `ce265797d3fc4540a45aaeac99510e4a` — LEANING-FALSE 30/63 | `a48a621091da41f59bf1cb64676f6b76` — MOSTLY-FALSE 22/77; near-exact `96282803637a46c28efe10f32b2cb47d` — LEANING-FALSE 41/61 | Exact current local pair establishes the first false-side band. Use deployed `a48a621` as an older exact deployed comparator and `962828` only as a near-exact variant (missing final period). Exclude local `808e6f8ac29a4850b10ff04c9c534d85` from best use because it appears to treat cumulative WWII admissions/flows as support for an endpoint-stock comparison. |
| `bolsonaro-en` | `91bf6083d26e407c98a474d89d2e618f` — LEANING-TRUE 63/52 | `85812d61a3984fa6bb945d4096eaa039` — LEANING-TRUE 68/62 | These are exact canonical-input comparators. Current exact validation `8761ab59a825430ab3bd2ae325dc4573` passed on `5dc1d675` (`LEANING-TRUE` 65/50), but keep `91bf6083` / `85812d61` as comparator references until a no-edit quality review decides whether `8761ab59` should become the preferred current-stack exemplar. |
| `bolsonaro-pt` | `e182f37a471443bfbb2d5b8bf9a763d3` — LEANING-TRUE 67/60 | `3469b32536004b369501b4cdd11e7dd5` — LEANING-TRUE 62/55 | Both exact and in band; deployed `3469b325` is the best visible PT comparator. |
| `hydrogen-en` | `24654634057b4b3e965b3239ef5fe8e4` — FALSE 14/77 | `c1fd6e692e594f22ae7d4e361a836f43` — MOSTLY-FALSE 16/82 | Local has the best structural split across stored-energy, full-system, and cost-efficiency claims, but is old/no prompt hash. Current-stack exact `16b0d093a0fc4617a634a6e5cace29e3` is also good (`FALSE` 7/80) but less rich with one AtomicClaim. Deployed exact `6bfd73ea286a42d2a0e052b563688730` is excluded from "best" because confidence 87 is above band; `c1fd6e69` is a capitalization variant but in band and structurally richer. |
| `plastic-en` | `32f00bb32d644a909f0c99521e800536` — MOSTLY-FALSE 21/68 | No exact deployed match found | Local exact report is the best comparator: 3 AtomicClaims and broad evidence. Best visible deployed family variant is German `800431527e254d2888ef56ba23af4688` (`Plastik Recycling bringt nichts`, LEANING-FALSE 29/59), but it is not the canonical English input and should remain a variant control. |

## Generic Expectations (apply to every input, approved or not)

- No report-specific or benchmark-specific hacks. Fixes must be generic and topic-neutral.
- No deterministic semantic adjudication in code. Meaningful analytical decisions come from LLM calls, not regexes, keyword lists, or heuristic rescues.
- Input neutrality: question and statement forms of the same claim stay within ≤4% outcome drift.
- Confidence accompanies every verdict and means confidence that THIS verdict is correct.
- Evidence must be real, cited, and probative. Low-probative evidence should not drive verdicts.
- Every published verdict cites at least one supporting or contradicting evidence item.
- Web search is required — model staleness alone is not a sufficient evidence base.
- Baseless opinion or political contradiction must not count as evidence-backed contestation and must not move truth or confidence.
- For factually true-side families with legitimate caveats, express the caveats in confidence, boundaries, and reasoning; do not downgrade to `MIXED` unless evidence-backed contradiction actually defeats the claim.
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
| `asylum-wwii-de` | First exact current pair is complete (`9e1f0f` and `ce265797`) and defines the initial false-side band. Do not spend another immediate job; next work is no-edit quality/comparator review only if Captain challenges the band or wants one later stability spot-check. | No — current first band exists, but keep watch until Captain accepts or a later spot-check confirms stability |
| `plastic-en` | The 2026-05-10 isolated attempt `9d7ab72a60114878a96c30ffc517c347` failed operationally at progress 60 and produced no report. Inspect that failure before spending another plastic job; do not treat it as report-quality evidence. | No — control lane only |
| `asylum-235000-de` | Latest current canary `fd93d0de531243a18d2097b38351f4d4` passed at `LEANING-TRUE` 70/60: component rows stayed neutral and the only contradiction was the dated 2024 SEM aggregate. Captain clarified that this current-total input is the better asylum validation target than the WWII comparison. Next work is a short no-edit comparator review to confirm component reconstruction is caveat-only; spend another job only if that review identifies a focused stability question. | Yes — active watch lane; current pass exists but not broad closure |
| `bolsonaro-en` current-pass/watch | Current exact canary `8761ab59a825430ab3bd2ae325dc4573` passes overall and gives AC_02/AC_03 true-side, verifiable verdicts. Next work is no-edit quality review against this file, `benchmark-expectations.json`, `report-quality-expectations.json`, and exact comparators `91bf6083` / `85812d61`; do not spend another Bolsonaro EN job unless that review identifies a focused stability question. | No — current pass exists, but low-confidence fair-trial/verdict claims and one admin-only citation warning keep it on watch |
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
- `Docs/xwiki-pages/FactHarbor/Product Development/Specification/FH Analysis Reports/FactHarbor_Analysis_Bolsonaro_Trial_Fairness/WebHome.xwiki` — original Bolsonaro true-side expectation: legal basis strongly supported; procedural fairness largely supported with legitimate concerns.
- `Docs/xwiki-pages/FactHarbor/Product Development/Specification/FH Analysis Reports/FactHarbor_Analysis_Bolsonaro_Trial_Fairness/Analysis Summary/WebHome.xwiki` — compact Bolsonaro summary: legal basis 85%, procedural fairness 70% with caveats.
- `Docs/ARCHIVE/Captain_Comments_Consolidated_2026-02-16.md` — earlier Captain comments that became formal rules.
