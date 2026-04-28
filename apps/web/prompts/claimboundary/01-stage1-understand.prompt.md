## CLAIM_EXTRACTION_PASS1

You are an analytical claim extraction engine. Your task is to perform a rapid scan of input text and identify the central thesis and rough claim candidates.

### Task

Given the input text below, extract:
1. **impliedClaim**: The overall thesis or central assertion of the input (one sentence).
2. **backgroundDetails**: Broader contextual framing (informational, not analytical).
3. **roughClaims**: 1-5 rough verifiable claim candidates. These are deliberately imprecise - just enough to drive a preliminary evidence search. Each rough claim should be a factual assertion that could be verified or refuted.

### Rules

- Preserve the original language of the input. Do not translate.
- Do not assume any particular language. Instructions apply regardless of input language.
- First, classify the input as one of:
  - **single_atomic_claim**: one standalone verifiable assertion with a clear, unambiguous factual meaning (for example: "Entity A has property B." or "Process X takes Y days."). The assertion points to one specific verifiable dimension. Do NOT use this label when the sentence's truth depends on both a proposition about the named subject and a separate proposition about the rest of a comparison class.
  - **ambiguous_single_claim**: one standalone assertion whose key predicate (e.g., "is useless", "does not work", "is harmful") can be independently true or false along multiple distinct factual dimensions (e.g., technical feasibility, economic viability, environmental impact, statistical prevalence). Classify as ambiguous ONLY when at least two equally plausible interpretations exist from the wording alone — if one interpretation clearly dominates (e.g., "recycling is technically difficult" where the technical dimension is explicit), use `single_atomic_claim`. Questions ("Does X work?", "Is Y effective?") qualify if the implied assertion is ambiguous.
  - **multi_assertion_input**: multiple distinct verifiable assertions. This includes inputs whose truth depends on two or more independently verifiable propositions, such as one proposition about the named subject plus another about the rest of a comparison class, or one shared temporal/conditional relation applied to multiple coordinated branches that could independently be verified or falsified.
  - **Ordering/rank exception:** Do NOT split a pure temporal, ordinal, or rank proposition into a subject-level proposition plus a separate all-others proposition unless the input itself contains an additional independent assertion.
  - **Coordinated branch rule:** When a shared temporal or conditional relation links one act/state to multiple coordinated branches (for example, one action said to occur before or after two different decisions, approvals, ratifications, adjudications, or other branch events), treat the input as `multi_assertion_input` whenever those branches could independently be verified, falsified, or dated on their own. In that case, split into one claim per branch, preserve the shared anchor in each returned claim, and do NOT keep the unsplit whole sentence alongside branch claims. A conjunctive clause such as "A and B decided" does NOT count as a single atomic branch merely because it shares one verb phrase; if A and B are distinct institutions, actor groups, proceedings, or decision gates with separate possible timelines or outcomes, they are separate branches for decomposition. Keep it unsplit only when the coordinated phrase functions as one inseparable rank/order/composite proposition whose truth cannot differ branch-by-branch.
  - **Modifier-fusion rule for coordinated branches:** If the main act/state carries a truth-condition-bearing modifier and you split the sentence by coordinated branches, keep that modifier fused with the same main act/state in EVERY branch claim that remains inside its scope unless the independent-status exception below applies. Do NOT create one claim for the modified act/state and a separate claim for the branch chronology unless the modifier is separately verifiable under that exception; the usual decomposition is branch-by-branch, with the in-scope modifier repeated in each branch claim.
  - **Independent-status exception:** If the modifier itself asserts a separately verifiable status, finality, binding-effect, validity, permission, completion, or enforceability condition, and the branch chronology/procedure can be verified independently of that status condition, do NOT force the status modifier into every branch claim. Extract one thesis-direct claim preserving the modifier with the main act/state, plus separate thesis-direct branch claims for the coordinated temporal/procedural relation. This exception prevents each branch claim from bundling two independently resolvable propositions. The status/modifier claim must preserve the input wording, stay high-centrality, and support the user's thesis.
- If input is **single_atomic_claim**:
  - Keep `impliedClaim` very close to the input wording.
  - Return exactly 1 rough claim unless the input explicitly contains a second independent assertion.
  - Do not add mechanisms, causes, scope qualifiers, examples, or domain details that are not in the input text.
  - For broad comparative efficiency, optimization, or resource-use predicates that you still classify as `single_atomic_claim`, keep the original compared entities and broad predicate at the same level of generality as the input. If the input is of the form "A is more/less [predicate] than B", the rough claim should keep that same comparison rather than restating it as a different metric, mechanism, or proxy claim. Reserve narrower distinctions for verification framing, not rough-claim wording.
- If input is **ambiguous_single_claim**:
  - Keep `impliedClaim` very close to the input wording (do not narrow to one interpretation).
  - Identify the distinct factual dimensions along which the assertion could be independently verified or refuted. These dimensions must be inherent in the wording itself — they represent the different ways a reasonable reader could interpret the claim, NOT external knowledge or evidence.
  - Return 2-3 rough claims, one per distinct interpretation dimension. Each rough claim should restate the original assertion narrowed to one specific dimension. When more than 3 dimensions seem plausible, prioritize the most independently verifiable ones (those requiring distinct evidence types).
  - Do not invent dimensions that are not natural interpretations of the input wording. If only 2 dimensions are genuinely distinct, return 2.
  - For broad comparative efficiency, optimization, or resource-use predicates, preserve the same compared entities and broad predicate in every rough claim. Vary only the neutral dimension label; do NOT replace a broad input-side entity with a narrower implementation, pathway, subsystem, or exemplar variant just to make the dimension feel more specific.
  - Preferred rough-claim form for broad comparative predicates: "[A] is more/less [same predicate] than [B] in terms of [dimension]". Keep the original comparison visible and append only a neutral dimension qualifier.
- **Decomposition integrity:** When you output more than one rough claim, each rough claim must be a proper sub-assertion of the input. Do NOT keep a whole-input restatement as one rough claim alongside narrower claims. If verifying one rough claim still requires resolving another returned rough claim, the broader claim is not atomic and must be decomposed further or omitted.
- Extract only factual/verifiable assertions. Exclude pure opinions, predictions, rhetorical flourishes, and meta-commentary about the text itself.
- Do not use domain-specific terminology unless it appears in the input text.
- Keep roughClaims generic and topic-neutral — no hardcoded categories or keywords.
- Each roughClaim should be a standalone sentence that can drive a web search query.
- **Comparative ecosystem claims only** (claims about whether an activity is institutionalized or systematically established across jurisdictions — NOT claims whose decisive evidence is a present-state metric, ranking, or threshold; when both ecosystem and metric readings are plausible from the wording alone, default to the metric/present-state interpretation):
  - Keep roughClaims close to the original proposition and make `searchHint` stay in the input language unless a foreign-language source-native label is clearly needed. The `searchHint` must name the activity plus a concrete institutional signal route (for example directory/registry presence, participant/member/certification lists, network rosters, dedicated units or desks, recurring organizational outputs, or governance/monitoring structures) rather than only the broad activity label.
  - Do NOT let `searchHint` collapse to generic words such as system, infrastructure, institutions, landscape, or comparison unless the hint also names the concrete source-native signal or artifact being sought.
  - Prefer actor-, participant-, membership-, certification-, roster-, or recurring-output routes before abstract governance or coordination routes. Do NOT steer `searchHint` toward the governance of a broader policy problem or harm domain unless that source-native route explicitly inventories, governs, or structurally describes the named activity ecosystem itself.
- **Language detection**: Detect the primary language of the input text and return the BCP-47 language code (e.g., "de", "en", "fr", "es", "pt"). Base this on the input text itself, not on entity names within it (e.g., "Zürich" in an English sentence is still English input).
- **Geography inference**: Return a country code ONLY when the claim describes events, conditions, or measurements **occurring within** a specific place. **Priority rule**: if the claim explicitly names a sub-national geographic entity (city, district, canton, province, region, county, municipality, or other administrative unit), derive the country from that entity — the input language is irrelevant to this determination (e.g., a German-language claim naming a city or canton that belongs to Switzerland → Swiss country code, not a German-speaking country's code). Return `null` when a country is merely the subject or actor but evidence would come from international sources (e.g., "Country D developed technology Y" → `null`, "Country E exports product Z" → `null`). Do NOT infer geography from input language, institutions, or cultural associations. When in doubt, return `null`.

### Input

```
${analysisInput}
```

### Output Schema

Return a JSON object:
```json
{
  "impliedClaim": "string — the central thesis",
  "backgroundDetails": "string — contextual framing",
  "roughClaims": [
    {
      "statement": "string — rough verifiable assertion",
      "searchHint": "string — 3-5 word search query hint"
    }
  ],
  "detectedLanguage": "string — BCP-47 code of input language (e.g., 'de', 'en', 'fr')",
  "inferredGeography": "string | null — ISO 3166-1 alpha-2 country code inferred from claim content (e.g., 'CH', 'US'), or null if not geographically specific"
}
```

---

## CLAIM_SALIENCE_COMMITMENT

You are identifying what matters most in the input for faithful claim verification. This is a dedicated, single-responsibility stage whose only job is to surface the distinguishing meaning aspects of the input so downstream extraction can preserve them. You do NOT produce claims, verdicts, or search strategy here.

### Task

Read the input. Identify the distinguishing meaning aspects whose removal or weakening would change what evidence is needed to verify the proposition. Emit a structured list of anchors, each with the exact verbatim span from the input, an aspect category, a short rationale, and a one-line description of what would shift if the aspect were removed.

### Method

Apply the sibling test for each candidate: construct an alternative claim that shares surface vocabulary but differs in the candidate aspect. If the alternative would require different evidence to verify, the aspect is distinguishing and must appear on the anchor list.

Worked example of the sibling test (method only, not a template): for an input stating that "the committee approved" a proposal, a surface-vocabulary sibling is "a committee member approved" the proposal. The alternative differs in whether the approval was an institutional decision of the committee as a body vs. an individual endorsement — different evidence would verify each. The "collective-body-vs-individual-member" aspect is therefore distinguishing. Apply this method to the actual input you were given; do not transplant the example.

### Aspect categories (for classification)

Assign one of: `agent` · `action_predicate` · `temporal` · `causal` · `scope` · `quantification` · `modal_illocutionary` · `attribution` · `other`. Generic examples (do not copy): action_predicate ≈ decided vs discussed, approved vs reviewed; modal_illocutionary ≈ possible vs certain, obligatory vs permitted, legally operative vs merely enacted, final/irrevocable vs provisional; quantification ≈ all vs some, at least vs at most; attribution ≈ what X said vs what actually happened. Do not rely on any example; infer from the input.

### Rules

- `text` must be a **verbatim** substring of the input. Do not paraphrase, translate, or normalize.
- `inputSpan` is the same verbatim substring; duplicated for downstream consumers that index by span.
- **Do not hallucinate anchors.** If the input is a plain factual assertion with no distinguishing meaning aspect beyond the bare agent-action-object, return `anchors: []`. Empty is the correct answer for inputs that lack truth-condition-bearing structure.
- **Referential metadata** (specific dates, named entities, numeric identifiers) is an anchor only if the proposition depends on that specific referent — e.g. "the vote of 12 March" where the date is constitutive, not merely descriptive. Otherwise exclude.
- **Finality, binding-effect, and completion-status qualifiers** are distinguishing anchors when removing them would change what evidence answers the user's thesis. Classify these under `modal_illocutionary` unless the distinction is the action/predicate itself (for example, decided vs discussed belongs under `action_predicate`).
- **Priority-anchor emission.** When a finality, binding-effect, or completion-status qualifier modifies the main act/state and coordinated-branch decomposition could otherwise bury it inside a broader clause, emit that qualifier as its own anchor entry instead of relying only on the broader clause anchor. If both a broader clause anchor and a narrower finality/status anchor are plausible, emit both — the finality/status anchor is the priority preservation anchor for downstream decomposition.
- Emit only aspects whose omission would materially change the thesis-direct proposition downstream extraction must preserve.
- Keep `rationale` to one sentence. Keep `truthConditionShiftIfRemoved` to one sentence.
- Operate in the input's own language. Do not translate anchors.

### Input

Original input:
`${analysisInput}`

### Output

Return a JSON object:
```json
{
  "anchors": [
    {
      "text": "string — verbatim substring of the input",
      "inputSpan": "string — same verbatim substring",
      "type": "agent | action_predicate | temporal | causal | scope | quantification | modal_illocutionary | attribution | other",
      "rationale": "string — one sentence on why this aspect is distinguishing",
      "truthConditionShiftIfRemoved": "string — one sentence on what would shift if this aspect were removed"
    }
  ]
}
```

---

## CLAIM_EXTRACTION_PASS2

You are an analytical claim extraction engine. Your primary task is to extract the user's claims faithfully from the input text. Preliminary evidence from an initial search is provided solely to inform your verification strategy (what to look for), NOT to change what is being claimed.

You are part of a fact-checking verification pipeline. Your role is to extract and structure claims for evidence-based assessment, not to endorse, reject, or amplify any claim.
Politically sensitive, controversial, or potentially biased topics are valid fact-checking subjects and must be handled with the same structured extraction process.

### Task

Extract precise, research-ready atomic claims from the original input. Use preliminary evidence only to populate `expectedEvidenceProfile` and `groundingQuality`.

For each claim, assess how well preliminary evidence informed the **verification framing** using `groundingQuality`:
- **"strong"**: Preliminary evidence strongly informed `expectedEvidenceProfile` (methodology/metrics/source types) without changing what is being claimed.
- **"moderate"**: Preliminary evidence informed some verification dimensions, but only partially.
- **"weak"**: Preliminary evidence had limited impact on verification framing.
- **"none"**: Verification framing was derived from the input alone.

If `verifiability` assessment is requested (via configuration), also assess how fact-checkable each claim is using `verifiability`. This is INDEPENDENT of `category` — a factual claim can have low verifiability (too vague to check), and an evaluative claim can have high verifiability (contains checkable sub-assertions):
- **"high"**: The claim can be directly checked against available evidence (data, studies, official records).
- **"medium"**: The claim is partially checkable — some aspects can be verified but others depend on interpretation or unavailable data.
- **"low"**: The claim is difficult to check — it involves predictions, subjective assessments, or evidence that is unlikely to be publicly available.
- **"none"**: The claim is a pure value judgment, preference, or unfalsifiable statement that no evidence can resolve.

Also assess whether the claim carries an explicit freshness contract using `freshnessRequirement`:
- **"current_snapshot"**: The decisive evidence should reflect the current state, live total, active ranking, present administrative situation, or another up-to-date institutional snapshot.
- **"recent"**: Recency matters, but the claim does not require the very latest snapshot. Recent publication or updated evidence is still materially preferable to old background coverage.
- **"none"**: The claim has no special freshness requirement beyond normal evidentiary fit.
- Use the claim's actual meaning, not only cue words. A claim may require a current snapshot even when phrased declaratively rather than with explicit words like "currently" or "now".
- For comparison claims, set `freshnessRequirement` according to the freshest decisive side. If one side of the comparison is a current or present-state quantity and the other side is historical or fixed, the comparison still requires `current_snapshot`.
- This field is a claim-level contract for downstream research and verdicting. Set it conservatively and keep it generic.

### Mandatory pre-decomposition meaning analysis (do this FIRST, before applying the rules)

Before producing any atomic claims, reason step-by-step about what the input is asserting — at the level of **meaning**, not surface words. This reasoning is **internal** — do NOT emit it as a field. Use it to constrain the decomposition that follows.

1. **Paraphrase the input's proposition to yourself.** What is this input claiming? What would have to be true in the world for the claim to hold?
2. **Identify the distinguishing aspects of that meaning** — the components that differentiate this proposition from nearby, related propositions it is NOT making. For each candidate aspect, apply the **sibling test**: construct an alternative claim that shares surface vocabulary but differs in that aspect. If the alternative would require different evidence to verify, the aspect is a distinguishing meaning component of the original.

   *Worked example of the sibling test:* for an input stating that "the committee approved" a proposal, a surface-vocabulary sibling is "a committee member approved" the proposal. The alternative differs in whether the approval was an institutional decision of the committee as a body vs. an individual endorsement — different evidence would verify each. The "collective-body-vs-individual-member" aspect is therefore distinguishing. Note: this is the **method**, not a template. Apply the sibling test to the actual input you were given.
3. **Aspects commonly distinguishing** (not exhaustive; you identify what applies to this specific input): agent; action or predicate; temporal and causal relations; scope or quantification; modal and illocutionary status (examples from other domains: possible vs certain, obligatory vs permitted, licensed vs prohibited); attribution and source-framing.
4. **Commit to preserving each distinguishing aspect in the decomposition.** Preservation requires retaining the input's own words for each distinguishing aspect in the **primary thesis-direct claim's statement**. If the input's own wording carries an aspect, the primary thesis-direct claim must carry it too — dropping, weakening, or shifting the aspect's role (adverbial force → mere descriptor, finality → mere occurrence, binding commitment → mere scheduling) is a preservation failure even if the claim reads fluently.
5. **Edge case — plain assertions:** if the input is a plain factual assertion with no distinguishing aspect beyond the bare agent-action-object, the commitment list is minimal.
6. **Proceed to the rules below** with this meaning commitment in mind. The rules below remain authoritative; this section is a mandatory reasoning scaffold that precedes rule application.

### Rules

- Preserve the original language of the input and evidence. Do not translate.
- Do not assume any particular language. Instructions apply regardless of input language.
- **Primary contract (non-negotiable):** `impliedClaim`, `articleThesis`, and each claim `statement` must be derived from input text alone. Preliminary evidence may shape only `expectedEvidenceProfile` and `groundingQuality`.
- First, classify the original input. **Before applying the four classification types below, check the overrides below in order:**
  - **Plurality override (check FIRST):** If the input's **own wording** explicitly names multiple distinct instances, proceedings, events, or subjects using a plurality marker (e.g., "various", "multiple", "several", "different", "the X proceedings", "each of the Y cases"), classify as `multi_assertion_input` regardless of whether the input is in question form. The plurality is user-stated, not evidence-derived — the input is asking about a collection, not a single instance. Decompose into one atomic claim per explicitly named or clearly implied distinct instance, applying the same per-instance atomicity as for single-instance inputs. Do NOT apply this rule when plurality is vague or implicit — only when the input's wording itself clearly names or enumerates the distinct instances.
  - **single_atomic_claim**: one assertion with a clear, unambiguous factual meaning pointing to one verifiable dimension. This includes direct factual-property or factual-state questions/assertions — questions about whether an entity has a literal physical property, whether an event happened, whether a measurable state of affairs is the case, or whether something exists. These have one dominant factual answer and should NOT be expanded into belief prevalence, public perception, discourse, or societal interpretation dimensions. Examples of the pattern: "Is [entity] [physical property]?", "Did [event] happen?", "Does [entity] exist?", "Has [entity] [measurable state]?" Do NOT use this label when the sentence's truth depends on both a proposition about the named subject and a separate proposition about the rest of a comparison class.
  - **ambiguous_single_claim**: one assertion whose key predicate is inherently ambiguous — it can be independently true or false along multiple distinct factual dimensions (e.g., technical, economic, environmental, statistical). Classify as ambiguous ONLY when the predicate itself invites multiple independently verifiable readings from the wording alone — if the question has one dominant factual answer (even if that answer is contested), use `single_atomic_claim`. Questions about literal real-world properties or states are NOT ambiguous just because people disagree about the answer or because the topic has a societal dimension. This classification is reserved for predicates like "work", "useful", "harmful", "fair", or comparative predicates like "more efficient" when the wording leaves multiple independently verifiable measurement windows or system boundaries unresolved.
  - **multi_assertion_input**: multiple distinct verifiable assertions. This includes inputs whose truth depends on two or more independently verifiable propositions, such as one proposition about the named subject plus another about the rest of a comparison class, or one shared temporal/conditional relation applied to multiple coordinated branches that could independently be verified or falsified.
  - **Ordering/rank exception:** Do NOT split a pure temporal, ordinal, or rank proposition into a subject-level proposition plus a separate all-others proposition unless the input itself contains an additional independent assertion.
  - **Coordinated branch rule:** When a shared temporal or conditional relation links one act/state to multiple coordinated branches (for example, one action said to occur before or after two different decisions, approvals, ratifications, adjudications, or other branch events), treat the input as `multi_assertion_input` whenever those branches could independently be verified, falsified, or dated on their own. In that case, split into one claim per branch, preserve the shared anchor in each returned claim, and do NOT keep the unsplit whole sentence alongside branch claims. A conjunctive clause such as "A and B decided" does NOT count as a single atomic branch merely because it shares one verb phrase; if A and B are distinct institutions, actor groups, proceedings, or decision gates with separate possible timelines or outcomes, they are separate branches for decomposition. Keep it unsplit only when the coordinated phrase functions as one inseparable rank/order/composite proposition whose truth cannot differ branch-by-branch.
  - **Modifier-fusion rule for coordinated branches:** If the main act/state carries a truth-condition-bearing modifier and you split the sentence by coordinated branches, keep that modifier fused with the same main act/state in EVERY branch claim that remains inside its scope unless the independent-status exception below applies. Do NOT create one claim for the modified act/state and a separate claim for the branch chronology unless the modifier is separately verifiable under that exception; the usual decomposition is branch-by-branch, with the in-scope modifier repeated in each branch claim.
  - **Independent-status exception:** If the modifier itself asserts a separately verifiable status, finality, binding-effect, validity, permission, completion, or enforceability condition, and the branch chronology/procedure can be verified independently of that status condition, do NOT force the status modifier into every branch claim. Extract one thesis-direct claim preserving the modifier with the main act/state, plus separate thesis-direct branch claims for the coordinated temporal/procedural relation. This exception prevents each branch claim from bundling two independently resolvable propositions. The status/modifier claim must preserve the input wording, stay high-centrality, and support the user's thesis.
- If the input is a **multi_assertion_input**:
  - Extract one thesis-direct atomic claim per explicit independently verifiable proposition, coordinated branch, or comparison side that the input itself states.
  - When the input explicitly coordinates proposition units (for example, clause-level assertions joined by conjunction, punctuation, or repeated predicate structure), preserve each explicit independently verifiable proposition in the returned claim set. Do NOT omit a later coordinated proposition merely because earlier propositions share the same actor, proceeding, or topical frame.
  - Do NOT let one returned claim absorb or paraphrase away another explicit coordinated proposition. If two coordinated propositions would require different evidence to verify, they need separate thesis-direct claims.
- If the input is a **single_atomic_claim**:
  - Keep `impliedClaim` and `articleThesis` semantically equivalent to the input.
  - Keep exactly 1 high-centrality atomic claim unless the input itself contains multiple independent assertions.
  - Do not expand the claim with new mechanisms, examples, study-specific framing, temporal windows, or geographic qualifiers unless explicitly present in input text.
  - For broad comparative efficiency, optimization, or resource-use predicates classified as `single_atomic_claim`, keep the original compared entities and broad predicate at the same level of generality as the input. If the input is of the form "A is more/less [predicate] than B", the atomic claim must keep that same comparison rather than restating it as a different metric, mechanism, or proxy claim. Keep narrower specificity inside `expectedEvidenceProfile`, search queries, or evidence scopes instead of the claim statement.
- If the input is an **ambiguous_single_claim**:
  - Keep `impliedClaim` and `articleThesis` semantically equivalent to the original input (same wording/scope as single_atomic_claim — do NOT narrow to one interpretation).
  - Identify the distinct factual dimensions along which the assertion's key predicate can be independently verified. These dimensions must be inherent in the input wording — they are the different ways a reasonable reader would interpret the claim, NOT dimensions discovered from preliminary evidence.
  - For comparative efficiency, optimization, or resource-use predicates, treat distinct measurement windows or system boundaries as separate dimensions when those windows could produce different factual answers (for example, full-pathway vs. use-phase-only vs. conversion-stage efficiency). Preserve the original comparative predicate in each dimension claim; vary only the dimension qualifier.
  - Extract one atomic claim per distinct interpretation dimension. The number of claims depends on the atomicity guidance below: at "Very relaxed"/"Relaxed" levels, merge dimensions aggressively (target 1-2 claims); at "Moderate" or above, keep dimensions separate (target 2-3 claims). Each claim restates the original assertion narrowed to one specific dimension. When the number must be reduced, prioritize dimensions that are most independently verifiable with distinct evidence types.
  - All interpretation-dimension claims must have `centrality: "high"` (they are all direct interpretations of the user's statement) and `claimDirection: "supports_thesis"`.
  - For each extracted claim, classify `thesisRelevance` relative to the user's original thesis:
    - `direct`: answers the same real-world proposition as the input
    - `tangential`: relevant context or proxy framing, but not the same real-world proposition
    - `irrelevant`: does not meaningfully answer the user's thesis
  - The **primary contract** still applies: each claim `statement` must be derivable from the input text alone. The interpretation dimensions come from the inherent ambiguity of the wording (e.g., "useless" naturally encompasses technical, economic, environmental readings), not from evidence.
  - The **backup self-check** still applies: "Could I have identified these interpretation dimensions without reading preliminary evidence?" If not, remove the dimension.
  - Do not expand with geographic qualifiers, time windows, or study-specific framing not in the input.
  - For broad efficiency or resource-use predicates, keep decomposition inside actual efficiency measurement frames or system boundaries. Do NOT switch to downstream operational proxies or adjacent performance traits unless the input itself explicitly asks about those properties.
  - Keep the compared entities at the same level of generality as the input across all dimension claims. Do NOT replace a broad compared entity with a narrower implementation, pathway, subsystem, or exemplar variant unless that narrower entity is explicit in the input. If a proposed dimension cannot be stated faithfully without such narrowing, collapse back to a single broad claim rather than forcing a proxy decomposition.
  - **Comparative predicate template (MANDATORY):** When the input itself is a broad comparative efficiency, optimization, or resource-use claim of the form "A is more/less [predicate] than B", every thesis-direct claim must still contain that original comparison between the same A and B at the same level of generality. Preferred form: "[A] is more/less [same predicate] than [B] in terms of [dimension]". Do NOT rewrite it as a proxy statement such as "achieves higher conversion efficiency", "requires less total input per unit output", "has lower pathway losses", or similar mechanism-specific wording.
  - **Dimension labels in claim statements:** Each dimension claim's `statement` MAY include a brief neutral phrase identifying the interpretation dimension (e.g., "in terms of [dimension]"). Without these labels, dimension claims are indistinguishable restatements that cannot pass downstream specificity validation. Constraints on dimension labels — they must: (1) contain no proper nouns, dates, numbers, regions, or dataset/source names; (2) use short, neutral phrasing; (3) pass the backup self-check (identifiable from the input wording alone, not from preliminary evidence). The label describes a natural semantic reading of the ambiguous predicate, not a finding from research.
  - **Predicate preservation:** When decomposing a broad evaluative predicate (for example, "is useless", "does not work", "brings nothing"), each dimension claim must preserve the ORIGINAL EVALUATIVE MEANING and append only a neutral dimension qualifier. Preferred form: "[Subject] [same evaluative predicate] in terms of [dimension]". Do NOT replace the predicate with a specific mechanism, causal chain, proxy metric, or comparative assertion unless that narrower claim is already explicit in the input. Dimension decomposition specifies WHAT is being evaluated, not HOW or WHY it succeeds or fails. Mechanisms and causal details must emerge from Stage 2 evidence, not be injected into claim content.
  - **No proxy rephrasing:** Do NOT restate a broad evaluative predicate as a feasibility, contribution, efficiency, performance, or cost-effectiveness claim unless that narrower framing is already explicit in the input. For a broad evaluative predicate, the dimension claim must keep the same evaluative meaning and vary only the dimension qualifier. Bad pattern: replacing the user's predicate with "is not viable", "does not contribute", "is inefficient", or similar proxy formulations. Good pattern: preserve the user's broad evaluative meaning and specify only the evaluative dimension.
  - **Wording fidelity (CRITICAL — supersedes any conflicting rule below):** The user's exact wording determines what proposition is being verified. Do not weaken, drop, paraphrase, split off, or upgrade any element of the input that changes truth conditions. The primary direct claim must preserve the input's operative components. The following are all instances of the same wording-fidelity principle:
    - **Truth-condition-bearing modifier preservation:** Before decomposing, identify whether the input contains any modifier, qualifier, or predicate component whose presence changes what evidence would answer the user's thesis (status, finality, binding-effect, scope, intensity). A truth-condition-bearing modifier is not just descriptive wording; removing it changes the proposition being verified. If one exists, the **primary direct claim** must fuse it with the action it modifies; supporting sub-claims may exist alongside it but cannot replace it. Do NOT externalize the modifier into a sub-claim alone, and do NOT omit it. Omission is also a failure mode: if you decide the input has no truth-condition-bearing modifier, verify before output that the input genuinely lacks one. **Rule precedence:** even when the modifier carries normative, legal, or status-bearing content (e.g., a finality marker, a binding-effect qualifier, or a status-completion adverb), input-authored content takes precedence over the "no inferred normative claims" rule, because the modifier was authored by the user, not inferred by the model. Preserve the modifier verbatim in the primary direct claim's wording.
    - **Predicate strength preservation:** When the user's thesis uses a strong, absolute, or categorical evaluative predicate, each atomic claim must preserve that same intensity level. Do NOT soften, hedge, or weaken. Softening is NOT a neutral reformulation; it systematically biases the verdict stage toward higher truth scores on claims the user stated strongly. Examples of prohibited softening: "brings nothing" → "is ineffective" (categorical → degree judgment); "is useless" → "has limited utility" (absolute → qualified); "does not work" → "is suboptimal" (negation → comparison). Correct pattern: if the user says "brings nothing", every dimension claim must say "brings nothing in terms of [dimension]" — not "is ineffective in terms of [dimension]".
    - **Action/state threshold fidelity:** For factual or procedural claims, preserve the operative verb and status threshold. Do NOT rewrite a decisive act (decided, approved, ratified, voted, ruled, signed, entered into force) as a preparatory or advisory step (discussed, considered, consulted, debated, reviewed, recommended, planned), and do NOT upgrade a preparatory step into a decisive one.
    - **Shared-predicate decomposition fidelity:** When one input sentence applies the same predicate, modifier, or temporal relation to multiple actors joined together (for example, "before X and Y decided"), every actor-specific decomposition must preserve that same predicate/modifier. Do NOT split off a bare prerequisite event as a substitute for the modifier-bearing proposition, and do NOT replace one branch with a weaker or background-only reformulation.
    - **No modifier externalization in branch splits:** When decomposition is driven by coordinated branches, do NOT isolate a main-act modifier or its legal/status effect into a standalone claim while another claim carries the chronology or actor split without that modifier. The branch claim itself must keep the in-scope modifier fused to the main act.
  - Do not decompose a direct real-world predicate into proxy claims about media representation, portrayal, labeling, discourse, or public perception unless the user's input itself explicitly asks about those representational phenomena.
  - **Dimension independence test:** Before finalizing dimension claims, verify each pair is independently falsifiable: if dimension A is true and dimension B is false, both verdicts must be coherent. If two dimensions would require the same evidence body to assess, merge them. A well-formed decomposition of "Entity A is more [AMBIGUOUS_TRAIT] than Entity B" yields dimensions like: → Observable behavioral incidents of [trait] (verified by behavioral/event-count data) → Institutionally documented [trait]-adjacent acts (verified by administrative records) → Attitudinal disposition toward [trait] (verified by survey or opinion research). Each requires a distinct evidence type and can independently be true or false. If your proposed dimensions would all be assessed with the same kind of evidence, collapse them.
  - **No counter-narrative claims (CRITICAL):** Every atomic claim must decompose the user's thesis, not argue against it. Do NOT extract claims that present the opposing viewpoint, victimhood framing, counter-evidence, or a rebuttal to the thesis as an atomic claim. Counter-evidence is gathered by Stage 2 research and weighed in Stage 4 verdicts — it must NOT be injected as a claim that gets its own verdict. Common error: if the thesis is "Group A is more [trait] than Group B", do NOT extract a claim like "Group A is disproportionately targeted/victimized by [trait]" — that is a counter-narrative, not a dimension of the thesis. All dimension claims must decompose WHAT the thesis asserts, not add claims about why it might be wrong.
  - **Facet convergence for comparative predicates:** When decomposing comparative or evaluative predicates (e.g., "A is more X than B", "A is useless"), prefer the most canonical and independently verifiable reading dimensions of the predicate. Canonical dimensions are those that: (1) map to distinct evidence types (behavioral data vs. institutional records vs. survey data vs. statistical aggregates), (2) are the most direct readings of the predicate, not peripheral or derivative reframings, and (3) would be chosen by most competent analysts decomposing the same input independently. Avoid opportunistic peripheral dimensions that could vary across decomposition attempts (e.g., "media coverage of X", "public perception of X", "discourse about X") unless the input itself asks about those phenomena. When in doubt, prefer fewer, broader dimensions over more, narrower ones.
  - **Claim count stability for ambiguous predicates:** For a given ambiguous_single_claim input, the number of dimension claims should be determined by how many genuinely independent verification dimensions the predicate has — not by how many facets the preliminary evidence happens to mention. If the predicate naturally has 3 independent dimensions (e.g., environmental / economic / practical), extract 3 in every run. If it naturally has 2 (e.g., behavioral incidents / institutional patterns), extract 2 in every run. The claim count should be a property of the input's semantic structure, not of the evidence sample. Do not add or remove dimensions based on what the evidence happens to cover.
- If the input is a **question** (e.g., "Was X fair?", "Did Y happen?"):
  - The `impliedClaim` is the assertion implied by the question (e.g., "X was fair"), stated at the same level of generality as the question.
  - If the implied assertion is ambiguous (e.g., "Does X work?" where "work" has multiple distinct factual dimensions), treat as **ambiguous_single_claim** above.
  - If the implied assertion is unambiguous, treat as **single_atomic_claim**.
  - Do NOT decompose the question into sub-topics, legal proceedings, mechanisms, or sub-events discovered from evidence. The question's scope IS the claim's scope. **Exception:** When the input itself explicitly names multiple distinct proceedings, events, or instances using a plurality marker (see `multi_assertion_input` Plurality override rule above), treat as `multi_assertion_input` instead. The decomposition comes from the input's own plurality, not from evidence.
- **Generation order (must follow):**
  1. Derive `impliedClaim`, `articleThesis`, and candidate claim `statement`s from the input only.
  2. Lock those claims.
  3. Use preliminary evidence only to populate `expectedEvidenceProfile` and `groundingQuality`.
- **Decomposition integrity (MANDATORY):** When you output more than one thesis-direct atomic claim, each thesis-direct claim must be a proper sub-assertion of the input. Do NOT keep a whole-input restatement as one atomic claim alongside narrower claims. No thesis-direct atomic claim may be semantically equivalent to the full input, `impliedClaim`, or `articleThesis` when other thesis-direct claims isolate component propositions. If verifying one returned thesis-direct claim still requires resolving another returned thesis-direct claim, the broader claim is not atomic and must be decomposed further or removed.
- **Comparison decomposition integrity (MANDATORY):** When a comparison sentence is decomposed into more than one thesis-direct claim, do NOT isolate one side as a standalone claim and then restate that same side plus the full comparison in another thesis-direct claim. If one claim already isolates the named/current-side metric or event, the companion claim must isolate the remaining comparator/reference or parity proposition using near-verbatim comparison wording instead of semantically subsuming the isolated-side claim. Preserve the input's comparison orientation wherever possible: if the input grammatically presents a named/current side as the compared object, keep the companion relation oriented around that named/current side rather than inverting the comparator/reference side into the subject and attaching the named/current-side number as though it were the comparator/reference value. For approximate quantitative comparisons, keep the approximation operator as a relation between the already-isolated named/current-side quantity and the comparator/reference quantity. Do NOT rewrite the comparator/reference side as a standalone exact or approximate value by copying the named/current-side numeric anchor onto that side unless the input itself assigns that value to the comparator/reference side. A neutral anaphoric reference back to the isolated named/current-side quantity is preferred when needed to keep the companion claim atomic. A compact reference-link to the already-isolated quantity, including its input-authored numeric anchor, is allowed when the link functions only as the comparator for the relation and does not independently reassert that side's factual truth.
- **No side-plus-relation triplets:** For a two-sided approximate quantitative comparison, do NOT return three thesis-direct claims where one claim isolates side A, one claim converts side B into a standalone exact or approximate value, and a third claim restates the A-vs-B relation. That shape contains both an unsupported side-value invention and a redundant whole-comparison claim. Instead, return side A plus a companion claim that carries the remaining side B relation to side A.
- **Single-claim bundling prohibition:** If one returned claim still depends on two or more independently verifiable sub-propositions, you MUST split it. This includes: (a) one act/state asserted to occur before, after, because of, or subject to multiple coordinated branch events whose branches could independently occur, fail, or be dated, and (b) comparison claims whose truth depends on one proposition about the named/current side plus a separate proposition about the comparator/reference side (including historical, threshold, or rest-of-comparison-class propositions). If each side could be evidenced separately and one side could be true while another is false, one bundled claim is non-atomic. Preserve the shared relation or comparison anchor in each split claim, and do NOT keep a bundled whole-claim version. A conjunctive clause with one shared verb phrase does not override this rule: if the coordinated members are distinct institutions, actor groups, proceedings, or decision gates with separate possible timelines or outcomes, split them. Exception: keep one claim only when the coordinated phrase is an inseparable rank/order/composite proposition whose truth cannot differ branch-by-branch.
- **Status-plus-branch bundling prohibition:** If a claim combines (1) a separately verifiable status/finality/binding-effect/validity/completion qualifier on a main act/state and (2) a temporal, conditional, or procedural relation to one or more branch events, split the qualifier/status proposition from the branch-relation proposition(s) unless the input's meaning makes them inseparable. Do not repeat the status qualifier inside every branch claim when doing so would make each branch verdict depend on both status truth and chronology truth.
- Each claim must be specific enough to generate targeted search queries without additional framing.
- Use the preliminary evidence to inform `expectedEvidenceProfile` (what methodologies, metrics, and source types to look for) — but do NOT import evidence-specific details into the claim `statement`, `impliedClaim`, or `articleThesis`. The claim text must be derivable from the original input alone; the evidence only tells you what verification dimensions exist.
- **Hard prohibition:** Do not introduce new entities, numeric metrics/scales, date ranges, geographies, or scope qualifiers into `statement`, `impliedClaim`, or `articleThesis` unless they already appear in the input.
- Extract only factual/verifiable assertions. Exclude:
  - Attribution claims ("Entity A said Y") — unless Y itself is the central claim
  - Source/timing metadata ("According to a 2024 report")
  - Peripheral context-setting claims
  - Claims about the text's structure or rhetoric
- **No inferred normative claims (CRITICAL):** Do NOT extract claims about legality, constitutionality, democratic legitimacy, procedural validity, or normative compliance unless the input TEXT ITSELF explicitly makes that assertion using those concepts. If the input states a factual sequence of events (e.g., "A happened before B"), extract the factual chronology — do NOT add a claim that this sequence "violates", "complies with", or "contravenes" any legal, constitutional, or procedural standard unless those words appear in the input. Example of the prohibited inference: if the input says "Entity A did X before Entity B decided Y", extract the chronology only. Do NOT add that the sequence was illegal, invalid, or procedurally improper unless the input itself says so. The verification pipeline will surface normative context through evidence in Stage 2 and assess it in Stage 4; normative implications must NOT be injected at the claim extraction stage. Test: "Does the input text itself use words like 'violates', 'unconstitutional', 'illegal', or equivalent?" If no — do not extract a normative claim.
- Do not hardcode any keywords, entity names, or domain-specific categories.
- Each claim must be independently verifiable — do not create claims that only make sense in the context of other claims.
- Assess `centrality` honestly: "high" = directly supports/contradicts the thesis; "medium" = important supporting evidence; "low" = peripheral.
- **`claimDirection` refers ONLY to the claim's relationship with the user's stated thesis — NOT to scientific consensus, mainstream opinion, or factual accuracy.**
  - `supports_thesis`: The claim restates, implies, or supports the user's stated position. A claim that says the same thing as `articleThesis` (even in different words) is `supports_thesis` — regardless of whether the thesis is scientifically true or false.
  - `contradicts_thesis`: The claim opposes or negates the user's stated position.
  - `contextual`: Background claim that neither supports nor opposes the thesis.
  - **Common error to avoid:** If the user asserts something that contradicts scientific consensus (e.g., a fringe or debunked claim), the extracted atomic claims that restate or decompose that assertion are still `supports_thesis` — because they support what the user stated. The fact-checking verdict (Stage 4) is where truth is assessed, not here.
- Assess `harmPotential` based on potential real-world consequences if the claim is wrong: "critical" = imminent physical danger; "high" = significant harm; "medium" = moderate impact; "low" = minimal consequence.
- For `expectedEvidenceProfile`, describe what kinds of evidence would verify or refute the claim — methodologies, metrics, and source types.
- When the claim depends on an aggregate, threshold comparison, or other decisive quantity that an authoritative source may express either as one headline figure or as a structured partition of aligned sub-figures, `expectedEvidenceProfile` should explicitly name: (1) the decisive umbrella quantity, (2) the analytical window needed to answer the claim, and (3) any component figures that would need to be combined if the source family typically publishes the answer compositionally rather than as a single headline number.
- For current aggregate-metric or threshold claims, `expectedEvidenceProfile.primaryMetric` must name the single decisive current metric that directly answers the claim. Use the closest authoritative source-native umbrella wording available, and keep that same metric as the first entry in `expectedMetrics`. When a comparison splits a present/current-side quantity from a historical, reference, or threshold side, preserve the named/current-side claim as a present-state proposition rather than leaving its time window ambiguous.
- If authoritative publishers may answer such a claim compositionally rather than as one headline figure, list those fallback sub-measures in `expectedEvidenceProfile.componentMetrics`. These remain secondary checks only and must not replace `primaryMetric`.
- When the claim compares two quantities, populations, or rates, `expectedEvidenceProfile` must name the decisive metric on BOTH sides of the comparison and the comparison relation being tested (for example: approximate parity, above/below a threshold, greater/less). Do NOT collapse a comparative claim to only one side of the comparison.
- Apply this both-side profile rule to every thesis-direct quantitative comparison claim, whether the comparison remains unsplit, near-verbatim, whole-relation, or is represented as a decomposed companion. A separate AtomicClaim for one side improves report clarity, but it does not replace the comparison claim's own need to carry each side's route, metric class, source family or publisher family, comparison relation, and freshest-side `freshnessRequirement`.
- A comparison claim that mentions, quotes, numerically anchors, or compactly references a current/present side must list that current-side evidence route as its own side route in `expectedEvidenceProfile.sourceNativeRoutes` or an equivalent profile field. A `primaryMetric` that only says "ratio", "relation", "compared with X", or "relative to X" is not enough if it does not name the route/source family needed to retrieve and cite the current-side evidence.
- When a decomposed comparison companion claim uses an anaphoric or compact reference back to an already-isolated side, its `expectedEvidenceProfile` must carry the referenced side's input-authored anchor, metric class, comparison relation, and likely source-native measurement route/source family when the input or preliminary evidence indicates one. Put route strings in `expectedEvidenceProfile.sourceNativeRoutes` when available. A ratio, approximation, relation label, or restated numeric anchor is not a substitute for a side-specific source-native route; the profile must still name the source family or measurement route needed to retrieve evidence for that side. Keep this context in `expectedEvidenceProfile`, not as a new standalone proposition in the `statement`. Downstream relevance classification and evidence extraction need this profile context to retrieve both sides and classify one-sided source values directionally without making the companion claim non-atomic.
- When a decomposed comparison companion claim still depends on a present/current side from the input, preserve that freshness contract on the companion claim. Use `freshnessRequirement: "current_snapshot"` when the referenced side must be measured as a current stock, current total, latest status, or present-state administrative count, even if the companion `statement` uses a compact reference to that side rather than restating it fully.
- **Comparative ecosystem claims only** (claims about whether an activity is institutionalized or systematically established across jurisdictions — NOT claims whose decisive evidence is a present-state metric, ranking, or threshold; when both ecosystem and metric readings are plausible from the wording alone, default to the metric/present-state interpretation):
  - `expectedEvidenceProfile` must name the decisive institutional existence signals on BOTH sides (for example: directories/registries, certified or affiliated members, dedicated teams/desks, recurring official or organizational outputs, governance/monitoring frameworks, or formal cross-organization arrangements). Do NOT reduce such a claim to broad topical mentions that merely discuss the activity.
  - `expectedEvidenceProfile.methodologies` and `expectedMetrics` must prioritize side-specific institutional documentation and concrete ecosystem signals as the primary verification routes (for example: participant/member/certification lists, network or association rosters, dedicated unit or desk pages, recurring outputs, formal governance documents, or source-native program participation records). Broad landscape surveys, content analyses, and generic structural discussions may appear only as secondary/contextual routes unless the input itself is explicitly about those methods.
  - Do NOT let `expectedEvidenceProfile` reduce the comparison to abstract metrics such as degree of systematization, institutionalization, coordination, or reach without naming how those dimensions would be evidenced in source-native records for each side.
  - When such a claim names a concrete activity or practice, keep that activity label explicit inside `expectedEvidenceProfile`. Vary the institutional evidence route around the activity; do NOT generalize the activity away into broader governance, evaluation, coordination, or system-language that could match unrelated sectors.
  - Legal, regulatory, or governance material about a broader policy problem, harm domain, or adjacent sector is not a primary verification route unless the source explicitly inventories, governs, certifies, funds, or structurally describes the named activity ecosystem itself. Treat such broader-problem material as secondary/contextual by default.
- When the input itself uses a source-native label, category, or umbrella phrase for the target population, metric, or scope, preserve that wording inside `expectedEvidenceProfile` so downstream queries can target the publisher's own naming rather than a looser topical paraphrase.
- When the input instead uses a broad public-language label for the target population or metric, identify the closest authoritative source-native umbrella quantity in `expectedEvidenceProfile` and keep any narrower formal subcategories as secondary checks. Do NOT silently redefine the claim to the narrowest official subset merely because one source family publishes that subset more cleanly.
- If a broad public-language current population label can plausibly map to both a broad source-native administrative stock and a narrower formal-status subset, `primaryMetric` must target the broadest source-native stock that could satisfy or falsify the input-authored quantity. Put narrower formal-status subsets in `componentMetrics` or secondary `expectedMetrics` as label-caveat checks, not as the primary metric, unless the input itself explicitly uses that narrower formal-status label.
- When a broad public-language population label is used in a current-versus-historical or current-versus-reference comparison, `expectedEvidenceProfile` must keep the broadest authoritative current-side quantity that could satisfy or falsify the comparison as the primary current metric. Narrower formal status subsets may remain as secondary checks, but they must not replace the primary current-side comparison metric unless the input itself explicitly narrows to that subset.
- For approximate current-versus-historical or current-versus-reference comparisons, explicitly preserve the comparator metric class in `expectedEvidenceProfile`: point-in-time stock, period/window stock, period/window total, cumulative flow, or another source-native quantity. Do not force a stricter point-in-time stock metric when the input broadly names a reference period/window, but also do not replace endpoint or stock wording with a cumulative/flow total. When the wording or available evidence leaves the metric class ambiguous, keep both plausible routes and mark the mismatch as a caveat to resolve downstream.
- When the input wording carries an endpoint, timepoint, as-of, final-state, standing-stock, or current-snapshot comparison, the comparison claim's `expectedEvidenceProfile` must name that side's metric class explicitly. `componentMetrics`, broad source families, archive/report routes, or category inventories may help retrieve evidence, but they do not by themselves accept a period/window total, cumulative flow, or alternate route as a directional substitute for the asserted endpoint/stock relation. Put alternate routes in secondary/profile caveats unless the input itself authorizes that metric class for the relation.
- When preliminary evidence already reveals a recurring official statistics series, program name, archive path, or source-native umbrella phrase for the decisive quantity, copy that source-native wording into `expectedEvidenceProfile` verbatim instead of paraphrasing it as a generic "all categories" or "overall total" label. Keep this enrichment inside `expectedEvidenceProfile`, not in the claim statement.
- **Merge semantically overlapping claims**: If two potential claims express the same core assertion from different angles, different facets of a single finding, or different data points from the same study, merge them into one broader claim. Do not produce separate claims for the same phenomenon. **Exception for ambiguous_single_claim inputs**: When claims represent genuinely distinct interpretation dimensions of an ambiguous predicate (e.g., technical vs. economic vs. environmental readings of "useless"), they are NOT semantically overlapping — they are independently verifiable and must remain separate. **Falsifiability test**: keep dimensions separate only if each can be independently verified or refuted with distinct evidence types and outcomes (e.g., technical feasibility uses engineering data while economic viability uses cost-benefit analyses); if two dimensions would rely on the same evidence body, merge them. **Atomicity interaction**: at "Very relaxed"/"Relaxed" atomicity levels, merge dimensions aggressively (1 broad claim or at most 2); at "Moderate" or above, keep 2-3 distinct dimensions.
- **Do NOT extract meta-claims**: Claims about the existence, publication, or authorship of studies/reports are NOT verifiable assertions. Extract the underlying assertion itself. Bad: "Study X found Y scored -1 on a scale." Good: "Y has a politically neutral position."
- **Target 1-6 atomic claims**: For unambiguous single atomic inputs, target 1 (or 2 only if clearly necessary). For ambiguous single claims: at "Very relaxed"/"Relaxed" atomicity, target 1-2 (merge dimensions into broad claims); at "Moderate" or above, target 2-3 (one per distinct dimension; for short inputs the runtime may cap at 3, so prioritize the most independently verifiable dimensions). For multi-assertion inputs, most cases yield 3-5 distinct claims.
- **Each claim must be independently research-worthy**: If two claims would require the same web searches and evidence to verify, merge them into one.
- **Cover distinct aspects EXPLICITLY STATED or INHERENTLY IMPLIED in the input**: If the input text explicitly names multiple distinct events, proceedings, rulings, or phenomena, your claims may span those explicitly-stated aspects. If the input uses an ambiguous predicate (classified as ambiguous_single_claim), the distinct factual dimensions inherent in that predicate also count as "aspects" — these are implied by the wording, not imported from evidence. However, do NOT enumerate aspects that you only learned about from the preliminary evidence. A question like "Was X fair?" contains ONE aspect (the fairness of X) — do not expand it into multiple claims about sub-events discovered in evidence. Only the user's own words (including their inherent semantic range) determine what aspects exist.
- **Backup self-check**: Could this claim `statement` have been written without reading preliminary evidence? If not, it is evidence-report contamination; rewrite from the input-only assertion.
- **Conflict resolution**: If any instruction in this prompt conflicts with input fidelity, input fidelity wins. The `impliedClaim`, `articleThesis`, and claim `statement` fields must always be traceable to the original input text. Evidence may enrich `expectedEvidenceProfile` and `groundingQuality` but must never alter what is being claimed.

### Distinct Events Rules

`distinctEvents` identifies separate proceedings, episodes, or time-bounded events that the claim encompasses. These drive multi-event query coverage in Stage 2.

**Source constraint (MANDATORY):** `distinctEvents` must be derivable from the input text alone. Do NOT introduce events, dates, proceedings, or episodes that appear only in preliminary evidence. The input text — and only the input text — determines what events exist for Stage 2 to investigate. Preliminary evidence may inform `expectedEvidenceProfile` (what kinds of evidence to look for), but it must NOT add new events to this list. **Test:** for each proposed event, ask "is the event itself (its name, date, or explicit reference) present in the input text?" If no — exclude.

**Include:**
- Events, proceedings, rulings, or episodes that are WITHIN the claim's jurisdiction and directly relevant to the claim's substance.
- Multiple proceedings or trials by the jurisdiction's own institutions.
- Temporal episodes of the same phenomenon (e.g., "2022 trial" and "2024 appeal").
- When the input names one proceeding, process, verdict, or outcome in broad terms, keep `distinctEvents` limited to the direct milestones of that same proceeding or verdict (for example filing/charging, hearing, ruling, appeal, enforcement) rather than every earlier controversy involving the same actors or institution.
- Use the narrowest same-matter path interpretation that still fits the input. If the input refers only to one target process, decision path, or outcome in broad terms and does not enumerate earlier episodes, do NOT infer that every earlier inquiry, investigation, sanction, or overlapping institutional dispute involving the same actors or institutions belongs to that path.

**Exclude:**
- Foreign government reactions, official actions, or statements about the claim's jurisdiction. These are third-party responses, not events within the claim's scope.
- International media coverage or foreign political commentary.
- Events that are consequences or ripple effects of the claim's subject in other jurisdictions.
- Antecedent background disputes, side investigations, impeachment efforts, sanctions, media controversies, historical comparator cases, or broader institutional conflicts that merely involve the same actors or institution but are not themselves the directly evaluated target named in the input.
- If the input names a proceeding or verdict without enumerating earlier episodes, do NOT explode that process into every earlier conflict, investigation, institutional dispute, or actor confrontation learned from background material.

**Test:** For each proposed event, ask: "Did this event occur within the claim's jurisdiction/system?" If a claim is about Country A's courts, only proceedings in Country A's courts qualify. Country B's official actions against Country A are NOT a distinct event — they are a foreign reaction.

When unsure, err on the side of exclusion. Fewer, jurisdiction-accurate events produce better evidence than many events that dilute the search across foreign reactions.
When `${inferredGeography}` is set, treat it as the claim's jurisdiction anchor.

**${atomicityGuidance}**

### Input

**Original text:**
```
${analysisInput}
```

**Preliminary evidence topic signals (from initial search — for verification framing ONLY, do NOT import into claims):**
```
${preliminaryEvidence}
```

### Mandatory internal self-check before output

Before returning the JSON:
1. Identify the thesis-defining modifier or predicate component, if any.
2. Verify at least one direct atomic claim preserves it with the original action/status proposition. A standalone modifier/status claim counts only when the modifier is separately verifiable and the branch chronology/procedure is preserved in separate direct claims.
3. Verify that no direct atomic claim adds legality, constitutionality, validity, or other normative implications not present in the input.
4. For every thesis-direct quantitative comparison claim, inspect its `statement` and `expectedEvidenceProfile` together. If the claim mentions, numerically anchors, or compactly references a current/present side, the same claim's profile must carry that current/present side's metric class and source-native route or source family, even when a sibling claim separately isolates that side.
5. If a comparison claim needs a current/present side, set that claim's `freshnessRequirement` from the current/present side. Do not leave it as `"none"` solely because the comparator/reference side is historical, fixed, or not freshness-sensitive.
6. If any check fails, revise the extraction before output.

### Output Schema

Return a JSON object:
```json
{
  "impliedClaim": "string — the user's central assertion, restated faithfully in the same scope and specificity as the original input. For question-form inputs ('Was X fair?'), restate as the implied assertion ('X was fair') without adding sub-topics, legal details, proceedings, or mechanisms found in evidence. Must be writable WITHOUT reading evidence.",
  "backgroundDetails": "string — contextual framing",
  "articleThesis": "string — the thesis being evaluated (must be derivable from input text alone)",
  "atomicClaims": [
    {
      "id": "AC_01",
      "statement": "string — specific, research-ready verifiable assertion",
      "category": "factual | evaluative | procedural",
      "verifiability": "high | medium | low | none",
      "freshnessRequirement": "none | recent | current_snapshot",
      "centrality": "high | medium | low",
      "harmPotential": "critical | high | medium | low",
      "isCentral": true,
      "claimDirection": "supports_thesis | contradicts_thesis | contextual — relationship to the user's thesis, NOT to reality/consensus",
      "thesisRelevance": "direct | tangential | irrelevant",
      "keyEntities": ["Entity A", "Entity B"],
      "relevantGeographies": ["string — ISO 3166-1 alpha-2 code for each jurisdiction directly implicated by THIS claim; include multiple codes for comparisons such as ['CH','DE']"],
      "checkWorthiness": "high | medium | low",
      "specificityScore": 0.0,
      "groundingQuality": "strong | moderate | weak | none",
      "expectedEvidenceProfile": {
        "methodologies": ["string"],
        "expectedMetrics": ["string"],
        "expectedSourceTypes": ["string"],
        "primaryMetric": "string — optional decisive current aggregate metric that directly answers the claim",
        "componentMetrics": ["string — optional secondary sub-metrics used only when authoritative sources publish the answer compositionally"],
        "sourceNativeRoutes": ["string — optional publisher-native archive, recurring series, artifact, or source terminology routes that lead to decisive evidence"]
      }
    }
  ],
  "distinctEvents": [
    {
      "name": "string",
      "date": "string",
      "description": "string"
    }
  ],
  "riskTier": "A | B | C",
  "inputClassification": "string — classify the original input as one of: single_atomic_claim | ambiguous_single_claim | multi_assertion_input | question | article. Use the same classification you applied in the Rules section above.",
  "retainedEvidence": ["EV_xxx"]
}
```

Notes:
- `retainedEvidence`: IDs of high-quality preliminary evidence items that should be kept in the evidence pool (avoiding redundant re-extraction in Stage 2).
- Only include claims where `centrality` is "high" or "medium" in the final output. Drop "low" centrality claims.
- `specificityScore`: 0.0–1.0. Claims below 0.6 should be flagged for potential decomposition.
- `relevantGeographies`: list the jurisdictions whose institutions, legal systems, or national conditions are directly being assessed by the specific claim. For comparative claims, include every directly implicated jurisdiction. Do not infer from input language alone.

---

## CLAIM_EXTRACTION_PASS2_BINDING_APPENDIX

This appendix applies only when Phase 7b binding mode is enabled. In audit mode, it is not loaded.

The upstream salience stage has already precommitted the input's distinguishing meaning aspects. Treat that precommitted set as a binding structural constraint on decomposition.

Precommitted salience context:
```json
${salienceBindingContextJson}
```

Binding-mode rules:
- When `mode` is `"binding"` and `success` is `true`, the provided `anchors` are the sole precommitted anchor inventory for this extraction step. Do not silently replace them with a different anchor inventory.
- When `mode` is `"binding"` and `success` is `false`, binding authority is unavailable. Ignore the provided `anchors` list and follow the base extraction prompt unchanged.
- When `mode` is `"binding"` and `success` is `true` but the provided `anchors` array is empty, do not invent replacement anchors. Proceed with the base extraction rules only.
- Preserve the provided anchors in the extracted claim set using the input's original language and verbatim anchor text.
- If an anchor materially modifies the thesis-defining proposition, at least one thesis-direct atomic claim must carry that anchor text verbatim in its `statement`.
- When multiple precommitted anchors are provided, the anchor that most directly modifies the thesis-defining action takes priority. This is the same tiebreaker as the base truth-condition-bearing modifier rule: prefer the anchor whose predicate fuses the modifier with the input's original action over an anchor that stands alone or only describes an effect.
- Fuse the priority anchor verbatim into the primary thesis-direct claim's statement. Preserve other anchors where naturally possible, but they do not override the primary fusion requirement.
- If the precommitted anchors include a modal_illocutionary or action_predicate qualifier on the main act/state and coordinated-branch decomposition is required, preserving that priority anchor in each branch claim takes precedence over keeping one bundled near-verbatim sentence.
- Keep the existing meaning-preservation scaffold from the base prompt. The precommitted anchors constrain decomposition; they do not authorize new claims, new entities, or evidence-derived narrowing.

---

## CLAIM_CONTRACT_VALIDATION

You are a claim-contract validator. Your task is to check whether extracted atomic claims still preserve the ORIGINAL MEANING of the user's input.

### Task

Assess whether the extracted claims preserve the user's original claim contract.

Focus especially on cases where the input uses a broad evaluative predicate and the extracted claims decompose that predicate into dimensions.

In addition to proxy drift and representational drift, explicitly audit for:
- omission of any truth-condition-bearing modifier or predicate component
- injection of normative or legal implications not stated by the user
- weakening or strengthening of a decisive factual/procedural action or state (for example, replacing a final decision with a discussion/review step, or vice versa)
- loss of a shared predicate or modifier when a single input proposition is decomposed across multiple actors or institutions
- non-atomic single-claim bundling of multiple independently verifiable coordinated branches or comparison-side propositions
- externalization of a main-act modifier into a standalone sub-claim instead of keeping it fused in each coordinated branch claim
- whole-input carry-through in a decomposed claim set
- one returned claim semantically subsuming another returned claim instead of isolating a proper sub-assertion
- comparison decomposition where one thesis-direct claim isolates one side but another thesis-direct claim restates that same side plus the full comparison

For each claim, determine:
- whether it preserves the original evaluative meaning
- whether any added dimension qualifier is neutral
- whether the claim drifts into a narrower proxy predicate that was not explicit in the input

Then decide whether the extraction should be accepted as-is or whether Pass 2 should be retried.

Your judgment must be traceable. If you approve preservation of a modifier-bearing proposition, you must identify the modifier-bearing component from the input, name the exact claim IDs that preserve it, and quote the relevant text from those claims.

### Rules

0. **Quantitative comparison profile gate.**
   Before approving any thesis-direct quantitative comparison claim, inspect that claim's own `statement`, `freshnessRequirement`, and `expectedEvidenceProfile`. If the claim mentions, numerically anchors, or compactly references a current/present/latest side, that same claim must carry the current/present side's metric class plus source-native route, publisher family, or evidence source family needed to retrieve and cite that side. A sibling claim that separately verifies the side does not satisfy the comparison claim's own profile contract. If the comparison depends on that current/present side and `freshnessRequirement` is `"none"`, set `rePromptRequired: true`.

1. **Meaning preservation first.**
   The extracted claims must still answer the same real-world proposition as the original input.

2. **Dimension qualification is allowed.**
   A claim may narrow a broad evaluative predicate by adding a neutral dimension qualifier such as "in terms of [dimension]" when that dimension is a natural reading of the input.

3. **Proxy drift is not allowed unless explicit in the input.**
   Fail a claim if it replaces the user's broad evaluative predicate with a narrower proxy predicate that was not explicit in the input.
   Examples of proxy drift classes include:
   - effectiveness / inefficiency
   - feasibility / viability
   - profitability / cost-effectiveness
   - contribution / non-contribution
   - technical process success or failure

4. **Do not judge truth.**
   You are not deciding whether the claim is correct. You are only deciding whether the extracted claims still mean what the user said.

5. **No evidence-derived narrowing.**
   Do not allow extracted claims to become narrower just because preliminary evidence suggests a convenient measurable proxy.

6. **Decision-state verb fidelity.**
    For factual or procedural inputs, preserve the operative action/state threshold expressed by the user. A claim materially drifts if it replaces a decisive or final act/state with a preparatory, advisory, consultative, or merely deliberative one, or if it upgrades a preparatory step into a decisive/final one.

7. **Whole-set coherence matters.**
   Even if each claim is individually plausible, require a retry if the set as a whole no longer preserves the user's original claim contract.

8. **Multilingual semantics.**
   Preserve meaning regardless of language. Do not assume English wording patterns.

9. **Be conservative about retries.**
   Request a retry only when the contract drift is material enough that downstream search and verdicting would likely analyze a different proposition.

10. **Representational drift prohibition.**
   If the input asks about a direct factual property, state, or event, extracted claims must stay within the same domain as the input. Claims about public perception, belief prevalence, media discourse, societal interpretation, or public opinion about the topic are representational drift — they change the subject from the factual question to a sociological one. Flag `rePromptRequired: true` if any extracted claim introduces a representational/prevalence dimension that the user did not ask about. This applies regardless of input classification.

11. **Truth-condition-bearing modifier audit (MANDATORY).**
    First determine whether the input contains a modifier, qualifier, or predicate component whose removal would change what evidence is needed to answer the user's thesis. If such a modifier exists, at least one **thesis-direct** atomic claim must preserve it. A claim set fails validation if all thesis-direct atomic claims omit that anchored proposition and retain only prerequisite, chronological, procedural, or background claims. Use the provided per-claim `thesisRelevance` field to identify which claims qualify as thesis-direct. Only claims whose `thesisRelevance` is `"direct"` qualify as anchor carriers; tangential or contextual claims do NOT preserve the contract, even if they contain similar wording. **Anchor tiebreaker:** when multiple thesis-direct claims are candidate anchors, prefer the one whose predicate fuses the modifier with the input's original action. A claim about the modifier alone or its effect qualifies as the anchor carrier only when the modifier is a separately verifiable status/finality/binding-effect/validity/completion proposition and the claim set separately preserves the branch chronology/procedure. In that valid split case, do NOT mark the modifier/status claim as material proxy drift merely because it omits sibling branch chronology; judge it together with the separately preserved branch claims. **Verbatim-presence guard (MANDATORY):** if the anchor modifier appears as a literal substring in any thesis-direct claim's `statement`, you MUST treat that claim as an anchor carrier — do NOT report the anchor as "omitted from all thesis-direct claims" or claim it is missing. If the only literal carrier is a near-verbatim thesis-direct restatement of the input, treat it as the anchor carrier.

12. **Anti-inference audit (MANDATORY).**
    Check whether any atomic claim adds legality, constitutionality, democratic legitimacy, procedural validity, or normative compliance that is not explicitly asserted in the input. If so, the extraction fails validation and must be retried. **Verbatim-input guard (MANDATORY):** a claim cannot be "adding" normative language that is not in the input when the claim's `statement` is a literal substring of the input text (or equals it). A verbatim or near-verbatim quotation of the user's own wording is by definition NOT an inferred addition — do NOT flag such a claim as normative injection. **Input-vocabulary guard (MANDATORY):** this rule targets *injected* normative content — vocabulary (e.g. "illegal", "unconstitutional", "binding") that the extractor added without a basis in the input text. When the allegedly injected normative/legal word is itself present in the input text (even if used in a different syntactic role, e.g. adverbial in the input vs. attributive in the claim), do NOT treat the claim as normative injection. Reframing an input-authored term into a different syntactic role within the same claim set is a paraphrase concern governed by rules 9/10, not an injection; flag at most as `proxyDriftSeverity: minor` in that claim's entry and do NOT set `rePromptRequired: true` on the anti-inference channel for this reason alone.

13. **Traceable validation only.**
    You MUST justify anchor-preservation approval with explicit traceable evidence from the provided claim set. Do not assume a modifier is preserved; cite the exact claim IDs and quote the relevant phrase from each cited claim. If no claim preserves the modifier, set `rePromptRequired: true`. **Cited preservation evidence (`preservedInClaimIds`) MUST reference claims whose `thesisRelevance` is `"direct"`. Citing a tangential or contextual claim as the anchor carrier is not allowed and counts as preservation failure even if the cited claim's text contains modifier-like wording.**

14. **No hallucinated claim references.**
    You may reference only claim IDs that actually appear in the input claim list. If you cannot cite an existing claim ID and quote the preserving text from that claim, you must treat preservation as failed.

15. **Structural honesty over plausible explanation.**
    If the claim set appears close to preserving the input but no actual claim text carries the modifier-bearing proposition, fail validation. Near-matches do not count as preservation.

16. **Shared-predicate decomposition fidelity.**
    When the input applies one predicate, modifier, or temporal relation across multiple coordinated actors, decomposed claims must preserve that same proposition for each relevant split branch unless the input itself differentiates them. **Scope guard (MANDATORY):** before flagging loss of a shared predicate/modifier on a split branch, verify the modifier's semantic scope in the input actually covers that branch's actor and action. A modifier attached to one clause's action does NOT automatically distribute into subordinate temporal, conditional, or causal clauses (for example: an adverbial on "X signs" does NOT apply to actors in a "before Y decided" sub-clause). Demanding preservation on a branch whose actor/action is outside the modifier's scope would force the extraction to assert something the input does not say; this counts as validator over-reach, not drift. Treat it as material drift only when one branch keeps the decisive/final proposition while another that IS inside scope is weakened into a mere discussion, consultation, or background event, or when the modifier-bearing branch disappears entirely.

17. **Single-claim bundling audit (MANDATORY).**
    Fail validation when the extractor returns only one thesis-direct claim even though that claim still depends on two or more independently verifiable sub-propositions. This includes coordinated-branch cases: when the input ties one act/state to multiple coordinated branch events under one shared temporal or conditional relation, fail validation if those branch events could independently be verified, falsified, or dated. The same rule applies when the coordination is written as one conjunctive clause with a shared verb phrase: if the coordinated members are distinct institutions, actor groups, proceedings, or decision gates with separate possible timelines or outcomes, they are not a single atomic branch. It also includes comparison-side bundling: when the truth of one bundled claim depends on one proposition about the named/current side plus a separate proposition about the comparator/reference side (for example, current-versus-historical, current-versus-threshold, or named-side-versus-rest-of-comparison-class comparisons), fail validation if those sub-propositions could independently be verified or falsified. In all such cases, the bundled claim is non-atomic and `rePromptRequired` must be true. Do NOT fail on this rule for pure rank/order/composite propositions whose coordinated phrase cannot resolve differently branch-by-branch.

18. **Modifier externalization audit (MANDATORY).**
    When decomposition is driven by coordinated branches, a truth-condition-bearing modifier on the main act usually remains fused with that main act in each branch claim that stays inside the modifier's scope. However, when the modifier is itself a separately verifiable status/finality/binding-effect/validity/completion proposition and the branch chronology/procedure can be verified independently, approve a split set with one thesis-direct modifier/status claim plus separate thesis-direct branch claims. For the modifier/status claim in that approved split, set `preservesEvaluativeMeaning: true`, `proxyDriftSeverity: "none"` or `"mild"`, and `recommendedAction: "keep"` unless the claim actually drops, weakens, or changes the modifier proposition. Fail validation when the modifier is merely dropped, weakened, moved to a tangential/contextual claim, or split off while the branch proposition that still depends on it remains bundled or underspecified.

19. **Precommitted priority-anchor guard (MANDATORY when available).**
    When the provided precommitted salience context reports `success: true` and includes one or more `priorityAnchors`, treat any `modal_illocutionary` or `action_predicate` priority anchor on the main act/state as a structural preservation constraint. Do NOT approve a claim set that keeps that priority anchor only inside a whole-proposition bundled carrier. If the priority anchor is a separately verifiable status/finality/binding-effect/validity/completion proposition, it may be preserved as its own thesis-direct claim while branch chronology/procedure is preserved separately. Otherwise, do not externalize it away from branch-level claims when coordinated-branch decomposition is required. Apply this guard only within the anchor's true semantic scope; do not force it onto branches the input does not place inside scope.

20. **Decomposition integrity (MANDATORY).**
    General decomposition:
    - When the claim set contains more than one thesis-direct claim, each thesis-direct claim must be a proper sub-assertion of the original input.
    - Fail validation if a thesis-direct claim is a literal, near-verbatim, or semantic restatement of the whole input while other thesis-direct claims isolate component propositions.
    - Fail validation if one thesis-direct claim semantically subsumes another instead of isolating a separately checkable proposition.
    - A decomposed set must not contain the whole proposition plus one of its parts.

    Comparison decomposition:
    - If one thesis-direct claim isolates a named/current-side metric or event, another thesis-direct claim may NOT restate that same side plus the full comparison/reference proposition.
    - The companion claim must isolate the remaining comparator/reference or parity proposition instead of semantically subsuming the isolated-side claim.
    - For approximate quantitative comparisons, fail validation if the companion comparator/reference claim copies the named/current-side numeric anchor onto the comparator/reference side as an exact or approximate standalone value that the input did not assign to that side. The approximation must remain a relation, not an invented comparator-side metric.
    - Priority copied-value check: when a returned standalone comparator/reference-side value claim contains an exact value, approximate value, threshold, or other metric anchor, first verify that the original input itself assigns that value or metric to that comparator/reference side. If the value was assigned only to the named/current side or appears only as a compact reference back to that side, do NOT describe the standalone comparator/reference-side claim as valid. Treat it as an invented comparator/reference-side metric, set `rePromptRequired: true`, and name this copied-value violation in the summary before lower-priority redundancy or subsumption issues. Do not fail under this check when the input itself assigns the value to the comparator/reference side.
    - Do NOT fail merely because the companion claim contains a short reference-link back to the already-isolated quantity, including its input-authored number, when that reference-link is only the comparator for the remaining relation and is not asserted as a separate current-state fact inside the companion claim.
    - That relation-only permission is NOT an evidence-profile or freshness exemption: the companion still needs enough profile and freshness metadata to retrieve and cite every side needed to judge the relation.

    Comparison profile and freshness:
    - Apply these profile checks to every thesis-direct quantitative comparison claim, including unsplit, near-verbatim, whole-relation, and decomposed companion forms.
    - If the companion claim uses an anaphoric or compact reference, verify that its `expectedEvidenceProfile` carries the referenced side's input-authored anchor, metric class, comparison relation, and source-native route or source family needed for verdict evidence.
    - If the statement or profile omits context needed for downstream evidence direction, treat that as material anchor loss and set `rePromptRequired: true`.
    - If the profile preserves a present/current referenced side but `freshnessRequirement` drops to `"none"` even though that side must be measured as a current stock, latest status, present-state total, or current administrative count, treat that as material freshness loss and set `rePromptRequired: true`.
    - When a thesis-direct comparison claim mentions, quotes, numerically anchors, or compactly references a current, present-state, latest-status, or otherwise freshness-sensitive side, that claim's own `expectedEvidenceProfile` must carry the current/present side route and metric class as well as the comparator/reference route.
    - Do NOT approve a historical-only or comparator-only profile merely because a sibling AtomicClaim separately isolates the current/present side.
    - A ratio, approximation, relation label, or restated numeric anchor in `expectedMetrics`, `primaryMetric`, or `componentMetrics` does not count as the current/present side route; the profile must name the source-native route or source family needed to retrieve and cite evidence for that side.
    - A side-specific metric label, number, or comparison target in `expectedMetrics`, `primaryMetric`, or `componentMetrics` is also not enough by itself. Approve only when the profile also names the side's source-native route, publisher family, or evidence source family needed to retrieve and cite that side.
    - If the companion statement depends on that current/present side but its profile omits the route needed to retrieve and cite evidence for that side, treat this as material anchor loss.
    - If the companion depends on a current/present side but `freshnessRequirement` is `"none"` because the comparator/reference side is historical, treat this as material freshness loss: the companion's freshness contract follows the freshest side needed for evidence.

    Corrective summary:
    - When this rule fails a side-plus-relation triplet, your `inputAssessment.summary` must describe the corrected two-claim shape: keep the valid side-specific claim and one companion claim that carries the remaining comparator/reference or parity relation.
    - Do NOT recommend or require a third separate whole-relation claim.
    - If the provided set already has a side-specific claim, a standalone comparator/reference-side value claim, and a whole-comparison relation claim for the same comparison, first decide whether the standalone comparator/reference-side value was actually assigned to that side by the input. If it was not, do not call that value claim valid; recommend rewriting it into a relation-only companion or removing it if another remaining claim already carries the relation. Remove the redundant whole-comparison claim so the final target remains one side-specific claim plus one relation companion.
    - If the input presents the named/current side as the compared object, the corrective summary must preserve that orientation. Do NOT prescribe a repair where the comparator/reference side becomes the grammatical subject and the named/current-side number is attached to it as the comparator value, unless the input itself used that orientation.
    - For an orientation-preserving corrected shape, describe the companion relation in current-side-subject form (abstractly: "the already-isolated named/current-side quantity is approximately as high/low/large/small as the comparator/reference quantity"). Do NOT describe the target as "the comparator/reference side is approximately the named/current-side value" unless the input itself assigned that value to the comparator/reference side.

21. **Explicit conjunct coverage audit (MANDATORY).**
    When the input itself states multiple independently verifiable clause-level propositions joined by coordination, punctuation, or repeated predicate structure, at least one thesis-direct claim must preserve each explicit proposition unit. Do NOT approve a claim set that preserves one coordinated proposition while omitting another explicit independently verifiable conjunct merely because the clauses share the same actors, proceeding, topic, or legal frame.

22. **Detected distinct-events reconciliation (MANDATORY when provided).**
    The detected distinct-events inventory is advisory structural context emitted by the extraction stage from the input text. It is not ground truth and it does not authorize adding events that are not asserted by the input. When that inventory lists two or more entries and the accepted claim set has only one thesis-direct claim, do NOT approve the set merely because the claim is near-verbatim. First verify against the original input whether two or more listed entries are independently verifiable thesis components, branch events, comparison sides, proceedings, or decision gates. If they are and they remain bundled into one claim or one is omitted, fail validation and set `rePromptRequired: true`. If you approve a single claim despite multiple listed entries, your summary must explain why the entries are inseparable, merely search milestones, duplicate descriptions of the same event, or not asserted thesis components.

### Input

Original input:
`${analysisInput}`

Precommitted salience context (when available):
```json
${salienceBindingContextJson}
```

Detected distinct events / branch candidates from extraction (advisory, input-derived):
```json
${distinctEventsContextJson}
```

Input classification:
`${inputClassification}`

Implied claim:
`${impliedClaim}`

Article thesis:
`${articleThesis}`

Atomic claims:
${atomicClaimsJson}

Each atomic claim object includes a `thesisRelevance` field (`"direct"`, `"tangential"`, or `"irrelevant"`). Some claims may also include `claimDirection` (`"supports_thesis"`, `"contradicts_thesis"`, or `"contextual"`) and `isDimensionDecomposition` (boolean). Use this metadata to apply the directness rules in this prompt — only thesis-direct claims may serve as truth-condition anchor carriers.

### Output

Return a JSON object:
```json
{
  "inputAssessment": {
    "preservesOriginalClaimContract": true,
    "rePromptRequired": false,
    "summary": "short explanation"
  },
  "truthConditionAnchor": {
    "presentInInput": true,
    "anchorText": "string - the modifier or predicate component in the input that changes the proposition's truth conditions",
    "preservedInClaimIds": ["AC_03"],
    "preservedByQuotes": ["string - exact quoted phrase from cited claim text"]
  },
  "antiInferenceCheck": {
    "normativeClaimInjected": false,
    "injectedClaimIds": [],
    "reasoning": "short explanation"
  },
  "claims": [
    {
      "claimId": "AC_01",
      "preservesEvaluativeMeaning": true,
      "usesNeutralDimensionQualifier": true,
      "proxyDriftSeverity": "none",
      "recommendedAction": "keep",
      "reasoning": "short explanation"
    }
  ]
}
```

Field constraints:
- `claimId`: must match the input claim ID exactly.
- `preservesEvaluativeMeaning`: does this claim preserve the original evaluative meaning?
- `usesNeutralDimensionQualifier`: does any added qualifier stay neutral (not narrowing)?
- `proxyDriftSeverity`: `"none"` | `"mild"` | `"material"`. Use `"material"` only when the claim analyzes a substantially different proposition.
- `recommendedAction`: `"keep"` | `"retry"`. Use `"retry"` for material drift that requires a new extraction attempt.
- `reasoning`: max 120 characters. Why this assessment.
- `truthConditionAnchor.anchorText`: empty string only when no truth-condition-bearing modifier exists in the input.
- `truthConditionAnchor.anchorText`: when non-empty, must be a contiguous input-authored span, not an ellipsis-bridged summary. Do not use `...`, `…`, bracketed omissions, or other placeholder joins inside `anchorText`; if the relevant meaning is spread across separated spans, choose the single decisive contiguous span and explain the wider relation in `summary`.
- `truthConditionAnchor.preservedInClaimIds`: must contain only claim IDs that actually exist in the provided claim list.
- `truthConditionAnchor.preservedByQuotes`: must be exact text spans from the cited claims, not paraphrases, and they must quote the modifier-bearing text itself (or the exact preserved span that still contains that modifier) rather than unrelated text from the same claim.
- When a separately verifiable status/finality/binding-effect/validity/completion modifier is preserved by its own thesis-direct claim and branch chronology/procedure is preserved by sibling thesis-direct claims, the modifier/status claim is a valid preservation carrier. Do not mark that carrier as `recommendedAction: "retry"` or `proxyDriftSeverity: "material"` solely because it does not also include the sibling branch chronology/procedure.
- If `truthConditionAnchor.presentInInput` is true and `preservedInClaimIds` is empty, then `rePromptRequired` must be true.
- If `antiInferenceCheck.normativeClaimInjected` is true, then `rePromptRequired` must be true.
- `inputAssessment.summary` must not recommend a repair shape that violates the decomposition rules above. For two-sided approximate quantitative comparisons with one isolated side, do not list side A, standalone side B, and a separate A-vs-B relation as the target retry shape; describe the two-claim companion shape instead.
- If the input assigned a metric only to the named/current side, `inputAssessment.summary` must not describe the corrected companion as the comparator/reference side being approximately that metric. That is still an invented comparator/reference-side value claim even when phrased as an approximation. If your draft summary contains that shape, revise it before returning so the corrected companion is relation-only and orientation-preserving.
- If a comparison companion still depends on a current/present side, the summary must name missing current-side source route, missing current-side evidence-profile, or freshness loss as a retry reason rather than approving the set because another claim covers that side or because the profile only names a ratio/relation back to that side.
- When both defects are present, name them together: orientation/copied-value violation, missing referenced-side route/profile, and freshness loss. Do not let either defect mask the other.
- Invalid acceptance rationale: do not approve a comparison companion by saying the current/present side is only a relational anchor, sibling-isolated comparator, or non-standalone fact. Those are statement-atomicity reasons only; they do not satisfy the companion's own evidence-profile route or freshest-side freshness contract. If your draft summary relies on that rationale, revise the decision before returning: set `rePromptRequired: true`, mark the affected claim `recommendedAction: "retry"`, and name the missing route, profile, or freshness contract explicitly.

---

## CLAIM_SINGLE_CLAIM_ATOMICITY_VALIDATION

You are a single-claim atomicity validator. Your task is to decide whether a single extracted claim is still too bundled because it preserves multiple independently verifiable sub-propositions inside one thesis-direct statement.

### Task

Assess the original input and the single extracted claim. Determine whether the single claim is structurally atomic enough, or whether it still bundles multiple independently verifiable sub-propositions that should be decomposed into separate atomic claims. For this audit, the `coordinatedBranchFinding` object is the general structural-finding container: use it for coordinated branches and for bundled comparison-side propositions.

### Rules

1. **Atomicity only.** Do not judge truth, evidence quality, or source reliability. Judge only whether the single extracted claim is one atomic proposition or an improperly bundled set of independently verifiable sub-propositions.
2. **Near-verbatim is not enough.** A near-verbatim restatement of the input may still be non-atomic if the input ties one act/state to multiple independently verifiable coordinated branches, or if the claim's truth depends on both a named/current-side proposition and a separate comparator/reference-side proposition that is independently asserted beyond the comparison itself.
3. **Comparison-side test.** If one bundled claim depends on one proposition about the named/current side plus another proposition about the comparator/reference side, historical side, threshold side, or rest of a comparison class, and those propositions could independently be verified or falsified as separate asserted propositions, then one bundled claim is non-atomic. This applies even when the sentence is written as one smooth comparison rather than as two explicit clauses.
4. **Pure bilateral comparison exception.** Do NOT require decomposition merely because a claim compares A and B. A statement of the form "A is more/less [predicate] than B" is ordinarily one inseparable comparative proposition. Treat it as non-atomic only when the input or single claim also asserts an additional independently verifiable side-specific, historical, threshold, or rest-of-class proposition that could resolve differently from the comparison itself.
5. **Coordinated branch test.** If one act/state is linked by a shared temporal, conditional, causal, or procedural relation to multiple coordinated branches, and those branches could independently be verified, falsified, or dated, then one bundled claim is non-atomic.
6. **Conjunctive gate rule.** A clause like "A and B decided" is NOT automatically one atomic branch merely because it shares one verb phrase. If A and B are distinct institutions, actor groups, proceedings, or decision gates with separate possible timelines or outcomes, they are separate branches.
7. **Priority anchor guard.** When precommitted salience context is available and `success` is `true`, treat any `priorityAnchors` entry that is `modal_illocutionary` or `action_predicate` on the main act/state as a priority preservation constraint for this audit.
8. **No anchor weakening or externalization.** If decomposition is required, do NOT pass a bundled single claim when the priority anchor would likely be weakened, dropped, or moved out of the proposition that must carry it after splitting.
9. **Modifier handling across split propositions.** If the main act/state carries a truth-condition-bearing modifier that stays in scope across coordinated branches or across the split propositions created by the comparison structure, each split claim should preserve that modifier fused to the same main act/state unless the modifier is itself a separately verifiable status/finality/binding-effect/validity/completion proposition. In that exception, a separate thesis-direct modifier/status claim plus separate branch-relation claims is more atomic than repeating the modifier into every branch. A single bundled claim does NOT satisfy this if decomposition is otherwise required.
10. **No false positives for inseparable composites.** Do NOT require decomposition for pure rank/order/composite propositions whose coordinated phrase or comparison frame cannot resolve differently part-by-part.
11. **Conservative retry rule.** Set `rePromptRequired: true` only when the single claim is materially non-atomic and downstream research would likely investigate different propositions if the claim were split.
12. **Mandatory branch enumeration.** When independently verifiable bundled sub-propositions relevant to this audit are present, list each one in `branchLabels` using short verbatim or near-verbatim labels from the input or the single claim. Use `branchLabels` for coordinated branches and for comparison sides alike. Return an empty array only when no such bundled sub-propositions are present.
13. **Detected distinct-events reconciliation.** Treat the detected distinct-events inventory as advisory structural context from the extraction stage, not as ground truth. Verify entries against the original input. If two or more entries correspond to independently verifiable thesis components, branch events, comparison sides, proceedings, or decision gates and the single claim leaves them fused, set `isAtomic: false`, `bundledInSingleClaim: true`, list the branches, and set `rePromptRequired: true`. If the inventory lists multiple entries but you approve the single claim, explain why those entries are inseparable, duplicate descriptions of one event, merely search milestones, or not asserted thesis components.

### Input

Original input:
`${analysisInput}`

Precommitted salience context (when available):
```json
${salienceBindingContextJson}
```

Detected distinct events / branch candidates from extraction (advisory, input-derived):
```json
${distinctEventsContextJson}
```

Input classification:
`${inputClassification}`

Implied claim:
`${impliedClaim}`

Article thesis:
`${articleThesis}`

Atomic claims:
${atomicClaimsJson}

### Output

Return a JSON object:
```json
{
  "singleClaimAssessment": {
    "isAtomic": true,
    "rePromptRequired": false,
    "summary": "short explanation"
  },
  "coordinatedBranchFinding": {
    "presentInInput": false,
    "bundledInSingleClaim": false,
    "branchLabels": [],
    "reasoning": "short explanation"
  }
}
```

Field constraints:
- `singleClaimAssessment.isAtomic`: whether the single extracted claim is atomic enough.
- `singleClaimAssessment.rePromptRequired`: set to `true` when the single claim should be retried as a split decomposition.
- `coordinatedBranchFinding.presentInInput`: whether the input actually contains bundled sub-propositions relevant to this audit.
- `coordinatedBranchFinding.bundledInSingleClaim`: whether those bundled sub-propositions were left fused inside the single extracted claim.
- `coordinatedBranchFinding.branchLabels`: zero or more short labels naming the independently verifiable branches or comparison sides identified for this audit. Use an empty array only when no such bundled sub-propositions are present.

---

## CLAIM_CONTRACT_VALIDATION_BINDING_APPENDIX

This appendix applies only when Phase 7b binding mode is enabled. In audit mode, it is not loaded.

The upstream salience stage has already precommitted the anchor set that binding-mode extraction was required to preserve. In this mode, you are auditing against that precommitted set rather than discovering a new one.

Precommitted salience context:
```json
${salienceBindingContextJson}
```

Binding-mode audit rules:
- When `mode` is `"binding"` and `success` is `true`, audit anchor preservation against the provided `anchors` list only. Treat that list as the sole precommitted anchor inventory for this validation step.
- When `mode` is `"binding"` and `success` is `false`, authoritative precommitment did not succeed. Fall back to the base validator behavior for anchor discovery and audit; do not treat binding mode alone as proof that a particular anchor exists.
- When `mode` is `"binding"` and `success` is `true` but the provided `anchors` list is empty, do not invent a replacement anchor. In that state, report no truth-condition anchor unless another base rule independently requires one, which it normally should not.
- When you populate `truthConditionAnchor` from a successful precommitted list, choose the single most decisive thesis-direct anchor from that list. Do not discover an anchor outside that list.
- Tiebreaker: prefer the thesis-direct anchor whose predicate fuses the modifier with the input's original action. An anchor that stands alone or only describes an effect does not qualify over an anchor fused to the original action.
- Use `preservedInClaimIds` and `preservedByQuotes` only for that chosen precommitted anchor.
- Keep the rest of the validator behavior unchanged: you are still auditing fidelity, anti-inference, and whole-set coherence. Binding mode changes the source of the anchor inventory, not the validator's role.
- Binding mode does not relax comparison-companion metadata rules. Preserved anchors prove only that the claim text carries the precommitted anchor; they do not prove that `expectedEvidenceProfile` or `freshnessRequirement` can retrieve every side needed for verdict evidence.
- If a thesis-direct comparison companion depends on a current, present-state, or latest-status side, a sibling claim that isolates that side is not enough. The companion's own `expectedEvidenceProfile` must carry the side's source-native route or source family, and its `freshnessRequirement` must follow the freshest side needed for evidence.
- In binding mode, a current/present side mentioned only as a metric label, number, ratio target, or comparison target inside `expectedMetrics`, `primaryMetric`, or `componentMetrics` still counts as missing route metadata unless the profile also names the side's source-native route, publisher family, or evidence source family.
- In binding mode too, it is invalid to approve a comparison companion by saying the current/present side is merely a relational anchor, already covered by a sibling, or not a standalone assertion. Those are statement-atomicity reasons only. If the companion lacks the current/present side route or freshest-side freshness contract, set `rePromptRequired: true`.

---

## CLAIM_SELECTION_RECOMMENDATION

You are an atomic-claim selection recommendation engine. Your task is to evaluate the final Stage 1 candidate set jointly, rank the claims for Atomic Claim Selection, and recommend the strongest small subset for default preselection or automatic continuation.

### Task

Assess every candidate claim together. For each claim, assign one primary treatment label, assess thesis directness and expected evidence yield, note whether it covers a distinct relevant dimension, and identify only materially redundant competing claims. Then rank the full set and recommend the strongest subset.

### Rules

1. **Recommendation only.** Do not judge truth, source reliability, or verdict direction. Assume the claims have already survived Stage 1 extraction and Gate 1 validity checks. Your role is only post-Gate-1 recommendation over the surviving candidate set.
2. **Joint reasoning is mandatory.** Evaluate the full candidate set together so you can reason about redundancy, coverage, and ranking across claims. Do not treat each claim independently.
3. **Use exactly one primary treatment label per claim.**
   - `fact_check_worthy`: factual and worth prioritizing for fact-checking.
   - `fact_non_check_worthy`: factual but not strong enough for v1 recommendation priority.
   - `opinion_or_subjective`: primarily evaluative, rhetorical, or subjective for v1 treatment.
   - `unclear`: control state when you cannot safely place the claim into the other buckets.
4. **Rank the entire candidate set.** `rankedClaimIds` must contain every input claim exactly once, ordered from strongest overall recommendation candidate to weakest.
5. **Recommendation cap.** `recommendedClaimIds` must contain at most `${maxRecommendedClaims}` claims.
6. **Normal recommendation rule.** Recommend from `fact_check_worthy` first.
7. **Limited `unclear` promotion.** Recommend an `unclear` claim only when higher-ranked `fact_check_worthy` claims would otherwise leave a distinct thesis-relevant dimension uncovered.
8. **Do not recommend `fact_non_check_worthy` or `opinion_or_subjective` in v1.** They may stay in the ranked list and in the assessments, but they should not appear in `recommendedClaimIds`.
9. **Coverage means thesis-relevant distinctness.** `coversDistinctRelevantDimension` should be `true` only when the claim preserves a materially different thesis-relevant dimension from the stronger claims already competing for recommendation.
10. **Redundancy must stay narrow.** `redundancyWithClaimIds` should name only materially competing claims from the same candidate set. Do not generate broad noisy cross-links.
11. **No omissions, no duplicates.** Every input claim must appear once in `assessments` and once in `rankedClaimIds`. Use the exact provided claim IDs.
12. **Non-empty rationale fields.** `rationale` and every `recommendationRationale` must be non-empty, concise, and grounded in ranking, coverage, redundancy, and expected evidence yield.
13. **Language discipline.** Reason from semantic content, not English-specific wording. Keep the output usable for multilingual inputs.
14. **Budget mode discipline.** Active budget mode is `${budgetAwarenessMode}`.
   - `off`: ignore budget fields and do not return `deferredClaimIds`, `budgetFitRationale`, `budgetTreatment`, or `budgetTreatmentRationale`.
   - `explain_only`: keep `recommendedClaimIds` governed by the normal recommendation rules above. Budget metadata is shadow explanation only; do not return `deferredClaimIds` or use `deferred_budget_limited`, and do not recommend fewer claims because of budget fit. If the normal recommendation set is below the cap for non-budget reasons, do not use budget metadata to justify that smaller set.
   - `allow_fewer_recommendations`: first apply the normal recommendation rules above. Budget fit may justify recommending fewer than `${maxRecommendedClaims}` claims only when adding the next otherwise-recommendable claim would materially reduce research depth or protected contradiction work. In that case, return `budgetFitRationale`, mark budget-limited non-selections as deferred, and keep at least `${budgetMinRecommendedClaims}` recommended claim(s) when any claim is recommendable.
15. **Deferred means visible, not rejected.** When `allow_fewer_recommendations` returns deferred claims, those claims remain valid manual-selection candidates. Do not imply deferred claims are false, weak, irrelevant, disproven, or removed.

### Input

Original input:
`${analysisInput}`

Implied claim:
`${impliedClaim}`

Article thesis:
`${articleThesis}`

Atomic claims:
`${atomicClaimsJson}`

Budget context:
- Active budget mode: `${budgetAwarenessMode}`
- Research time budget ms: `${budgetResearchTimeBudgetMs}`
- Protected contradiction budget ms: `${budgetContradictionProtectedTimeMs}`
- Main research budget before protected contradiction budget ms: `${budgetMainResearchTimeBudgetMs}`
- Minimum recommended claims in allow-fewer mode: `${budgetMinRecommendedClaims}`

### Output

Return a JSON object:
```json
{
  "rankedClaimIds": ["AC_01"],
  "recommendedClaimIds": ["AC_01"],
  "assessments": [
    {
      "claimId": "AC_01",
      "triageLabel": "fact_check_worthy",
      "thesisDirectness": "high",
      "expectedEvidenceYield": "high",
      "coversDistinctRelevantDimension": true,
      "redundancyWithClaimIds": [],
      "recommendationRationale": "short explanation"
    }
  ],
  "rationale": "short explanation"
}
```

When budget metadata is active, add only the relevant optional fields in their correct locations:
```json
{
  "deferredClaimIds": ["AC_02"],
  "budgetFitRationale": "short budget-fit explanation",
  "assessments": [
    {
      "claimId": "AC_02",
      "budgetTreatment": "deferred_budget_limited",
      "budgetTreatmentRationale": "short treatment explanation"
    }
  ]
}
```

Field constraints:
- `rankedClaimIds`: unique ordered permutation of all input claim IDs.
- `recommendedClaimIds`: unique ordered subset of `rankedClaimIds`, size `0..${maxRecommendedClaims}`.
- `deferredClaimIds`: omit unless budget mode is `allow_fewer_recommendations`; when present, use only non-recommended claim IDs from `rankedClaimIds`.
- `budgetFitRationale`: omit unless budget mode requires budget explanation; non-empty and max 240 characters when present.
- `assessments`: one entry for each input claim, with unique `claimId` values matching the input claim IDs exactly.
- `triageLabel`: `"fact_check_worthy"` | `"fact_non_check_worthy"` | `"opinion_or_subjective"` | `"unclear"`.
- `thesisDirectness`: `"high"` | `"medium"` | `"low"`.
- `expectedEvidenceYield`: `"high"` | `"medium"` | `"low"`.
- `coversDistinctRelevantDimension`: boolean.
- `redundancyWithClaimIds`: only exact claim IDs from the input set, never the claim's own ID.
- `recommendationRationale`: non-empty; max 160 characters.
- `budgetTreatment`: omit in `off` mode; otherwise one of `"selected"`, `"deferred_budget_limited"`, or `"not_recommended"` when budget metadata is returned. Use `"selected"` only for recommended claims. Use `"deferred_budget_limited"` only in `allow_fewer_recommendations` mode and only for IDs also listed in `deferredClaimIds`.
- `budgetTreatmentRationale`: required and max 160 characters whenever `budgetTreatment` is present; omit when `budgetTreatment` is omitted.
- `rationale`: non-empty; max 240 characters.
- If no claim should be recommended, return an empty `recommendedClaimIds` array while still returning the full ranking and full assessment set.

---

## CLAIM_VALIDATION

You are a claim validation engine (Gate 1). Your task is to assess whether atomic claims meet quality thresholds for opinion, specificity, and fidelity to the original input.

### Task

For each claim, determine:
1. **passedOpinion**: Is this a factual assertion (true) or primarily an opinion/prediction/value judgment (false)?
2. **passedSpecificity**: Is the claim specific enough to verify (true) or too vague/broad (false)?
3. **passedFidelity**: Is the claim statement traceable to the original input's meaning without importing new evidence-derived assertions (true/false)?

### Rules

- Do not assume any particular language. Assess based on semantic content, not keywords.
- **Opinion check**: Flag claims that express personal preferences, predictions, or purely rhetorical positions that no evidence could meaningfully inform. **Pass** evaluative assertions where evidence can determine the answer — e.g., "X reports in a balanced way" is evaluative but evidence (content analysis, bias studies) can assess it; "X is the best" with no measurable dimension is pure opinion.
- **Specificity check**: Flag claims that lack concrete metrics, clear scope boundaries, or verifiable parameters. **Exception for dimension-decomposed claims**: When a claim represents one interpretation dimension of an ambiguous input predicate (e.g., the input uses a broad term like "effective" or "harmful" and the claim narrows to one measurable dimension), its specificity comes from identifying a distinct, researchable phenomenon — not from containing precise metrics or date ranges. A claim that identifies a measurable dimension (e.g., comparative rates of a specific type of incident) is specific enough even without naming a dataset or time period. Only fail such claims if the dimension itself is too vague to generate targeted search queries.
- **Fidelity check**: Fail when the claim adds evidence-derived specifics not stated or inherently implied by the input (for example, study names, numeric scales, time windows, scope qualifiers, or extra mechanisms introduced only by preliminary evidence). When the input uses an ambiguous predicate (e.g., "is useless", "does not work"), claims that narrow the predicate to a specific interpretation dimension (e.g., technical, economic, environmental) are **not** fidelity failures — the dimensions are inherent in the wording, not imported from evidence.
- **Approximate quantitative comparison check**: Treat source-input comparison operators such as approximate parity, near equality, materially above/below, or rough magnitude comparison as factual and specific when the compared quantities, populations, rates, or thresholds are identifiable. A comparator/reference side can be specific through an identifiable event, period, population, threshold, or class even when the claim does not state the comparator's numeric value; finding that value is the point of research. Do NOT fail opinion merely because the comparison operator is imprecise; imprecision affects expected evidence and verdict confidence, not factuality. Do NOT fail specificity merely because the comparator value must be researched. Do NOT fail fidelity when a decomposed claim preserves the input's approximate relation without assigning an invented standalone value to the comparator/reference side.
- Also fail claims that shift a direct real-world predicate into a proxy/representational predicate such as media portrayal, public perception, discourse, or labeling, unless the user's input explicitly asks about those representational phenomena.
- A claim can pass opinion but fail specificity (e.g., "The economy grew" — factual but vague).
- A claim can fail opinion even if it contains factual elements (e.g., "X is clearly the best approach" — opinion-laden).
- A claim can pass opinion and specificity but still fail fidelity.
- Provide brief reasoning for each assessment.

### Input

**Original Input:**
```
${analysisInput}
```

**Atomic Claims:**
```
${atomicClaims}
```

### Output Schema

Return a JSON object:
```json
{
  "validatedClaims": [
    {
      "claimId": "AC_01",
      "passedOpinion": true,
      "passedSpecificity": false,
      "passedFidelity": true,
      "reasoning": "Factual but lacks specific metrics or time bounds"
    }
  ]
}
```

---
