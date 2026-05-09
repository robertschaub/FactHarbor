# Captain Quality Expectations

**Status:** Living reference · **Last updated:** 2026-05-09 · **Purpose:** Captain's one-page human-readable quality bar for FactHarbor analysis reports.

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

## Release Summary (as of 2026-05-09)

**2026-05-09 Captain correction:** Prior tables incorrectly listed `MIXED` as acceptable for `bolsonaro-en`, `bolsonaro-pt`, and `asylum-235000-de`. That was not Captain's original expectation. These families must be true-side: Bolsonaro is legal-basis strongly supported and procedural-fairness largely supported with caveats; asylum-current-total is an official SEM aggregate/threshold claim where caveats belong in confidence and reasoning, not a neutral verdict direction. The same correction pass also moved `bundesrat-simple` to the high-true chronology expectation based on Captain-preferred exact comparators.

- **Good expectation / comparator set (5/8):** `bundesrat-rechtskraftig`, `bundesrat-simple`, `bolsonaro-en`, `bolsonaro-pt`, `hydrogen-en`
- **Watch (2/8):** `asylum-235000-de`, `plastic-en` — asylum artifact retrieval improved, but current-stack stability rerun still failed from component-stitching verdict logic; plastic evidence variance remains open
- **Not validated (1/8):** `asylum-wwii-de` — no current-stack rerun yet
- **Release-blockers:** none formally declared in this file; `asylum-235000-de` is no longer cleanup-only and should stay in the active report-improvement lane until the component-stitching failure is fixed.

**Bolsonaro current-state caution:** The true-side expectation is stable and supported by good historical/variant comparator reports, but those reports do not prove current HEAD is fixed. Recent canonical `bolsonaro-en` current-stack failures remain a separate Stage 2/Stage 4 diagnosis lane.

## Benchmark Families

Each row leads with Captain's intent — what the family is actually testing. Bands in parentheses are authoritative in `benchmark-expectations.json`; the MD prose tracks them.

| Slug | Intent | Exact input | Bands (from JSON) |
|---|---|---|---|
| `bundesrat-rechtskraftig` | Must not collapse to UNVERIFIED on Stage 1; the `rechtskräftig` anchor must survive extraction. Old Stage 1 contract failure fixed. | `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben` | MIXED / LEANING-TRUE / LEANING-FALSE; truth 35–60; conf 55–85; min 2 boundaries |
| `bundesrat-simple` | Literal chronology claim without the `rechtskräftig` anchor. Captain prefers high-true reports that recognize the signature happened before parliamentary/popular approval while caveating that this is procedurally normal and not final democratic approval. | `Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben` | TRUE / MOSTLY-TRUE; truth 85–100; conf 75–95; min 2 boundaries |
| `asylum-235000-de` | Must surface ONE clean official SEM aggregate total, not stitch from components. Must be true-side; `MIXED` is not acceptable. Improved, not closed. | `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz` | LEANING-TRUE / MOSTLY-TRUE; truth 58–75; conf 40–70; min 1 boundary |
| `asylum-wwii-de` | Historical-comparison variant; not yet validated on the current stack. No official band yet. | `235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.` | No bands until first current-stack rerun |
| `bolsonaro-en` | Must be true-side with caveats: legal basis strongly supported; procedural fairness largely supported with legitimate concerns. No visible U.S.-government contamination in final citations. Watching for small uncited `state.gov` residue. | `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?` | LEANING-TRUE / MOSTLY-TRUE; truth 58–85; conf 45–75; min 3 boundaries |
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
| `bundesrat-rechtskraftig` | `b92201bb47454f7498a1919c4a82c567` — MIXED 48/72 | No good deployed exact match found | Local is preferred: exact input, 3 AtomicClaims, explicit rechtskräftig claim, fewer warnings than richer later local `4002497e`. Visible deployed exact `26432b9bb47f409c97155a148b65566c` is excluded because it is too weak for "best" use: one AtomicClaim and only 30 evidence items. |
| `bundesrat-simple` | `a6b0e0fc14984926a678a462456bc110` — TRUE 97/89; alternate `a53573047fe64778a76e53cb578900c7` — TRUE 96/88 | No exact deployed match found | Captain-preferred exact local comparators and basis for the corrected JSON band. They treat the simple wording as a literal chronology claim and still flag the procedural caveat: signature before parliamentary/popular approval is factually true but not final democratic approval. Excluded prior candidates: `9581a6568dd640c8b5b3cf6bbb57bda3` is too awkward; `5b411500eee44d32857ba1bf3380fe09` captures nuance but is no longer preferred. |
| `asylum-235000-de` | `3ba25fe7c99f4b96822e37a6a65f6bb1` — LEANING-TRUE 62/68 | `6a60b3eb0df540c0b16228d9367b1366` — MOSTLY-TRUE 72/70 | Both are exact and true-side. Local is the cleaner current-stack comparator with 36 evidence items and SEM-heavy sourcing; deployed is usable but near the upper truth/confidence edge. |
| `asylum-wwii-de` | No accepted local best yet | No accepted deployed best yet | No official band yet, so no report should be promoted as "best." Provisional candidates exist (`808e6f8ac29a4850b10ff04c9c534d85`, `a48a621091da41f59bf1cb64676f6b76`, near-exact `96282803637a46c28efe10f32b2cb47d`), but they remain diagnosis material until Captain defines the expected band. |
| `bolsonaro-en` | `91bf6083d26e407c98a474d89d2e618f` — LEANING-TRUE 63/52 | `85812d61a3984fa6bb945d4096eaa039` — LEANING-TRUE 68/62 | These are exact canonical-input comparators. Keep them separate from the older variant reports above. Current HEAD failures remain open. |
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
| `asylum-wwii-de` | Single isolated rerun on current stack to produce a first verdict band. | No — but keeps the family permanently "not validated" until run |
| `bundesrat-rechtskraftig` + `plastic-en` | One isolated (non-concurrent) rerun each to clear the 2026-04-16 concurrent-submission collapse from the record. | No — the collapse was ruled infrastructure; reruns just remove ambiguity |
| `asylum-235000-de` | Rerun with explicit source-inspection confirmed XLSX artifact retrieval, including current RU sheets, but stability job `511c2b17299a49a5a9640505c40eac0f` flipped false-side after stitching current component tables into an agent-composed total. Next work: prevent component tables from replacing one clean official SEM aggregate unless the source itself provides a complete non-overlapping aggregate. | Yes — active report-improvement lane; no more jobs before a generic component-stitching fix |
| `bolsonaro-en` current-stack regression and evidence-pool residue | Use the comparator reports above when diagnosing current canonical failures. Ongoing monitoring of whether uncited `state.gov` items remain in the evidence pool across runs. `MIXED` or false-side outputs are regressions unless strong target-specific evidence overturns the original true-side expectation. | No — comparator citations are clean, but current canonical validation remains open |
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
