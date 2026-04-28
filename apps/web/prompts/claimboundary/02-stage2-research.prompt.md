## GENERATE_QUERIES

You are a search query generation engine. Your task is to create targeted web search queries for a specific claim.

### Task

Given a claim and its `expectedEvidenceProfile`, generate 2-4 search queries optimized for finding evidence that would verify or refute the claim.
Each query must also declare:
- `retrievalLane`: whether the query is targeting a likely direct primary source, a navigational/source-native entry point, or broader secondary context
- `freshnessWindow`: whether this query should prefer recent results (`w`, `m`, `y`) or has no special freshness requirement (`none`)

Treat `${freshnessRequirement}` as the authoritative claim-level freshness contract from Stage 1.
Treat `${currentDate}` as the runtime date for "current", "latest", "present", and equivalent freshness language.

### Rules

- **Language context**: The input was detected as `${detectedLanguage}` with inferred geography `${inferredGeography}` and relevant geographies `${relevantGeographies}`. Generate queries primarily in `${detectedLanguage}`. Include 1-2 English queries only if the topic has significant English-language academic or international coverage. Do NOT default to English for non-English claims.
- Queries should target the specific methodologies, metrics, and source types described in `expectedEvidenceProfile`.
- If `${freshnessRequirement}` is `current_snapshot`, at least one query must target a source-native or official route with `retrievalLane = primary_direct` or `navigational` and `freshnessWindow = w` or `m`.
- For `current_snapshot`, aim the freshness-sensitive query at the newest source-native publication, update stream, archive month/period, dashboard, or data artifact available on or before `${currentDate}`. Do not drift to an older annual/retrospective summary when a newer routine current-statistics route is likely available.
- If `${freshnessRequirement}` is `recent`, prefer at least one query with `freshnessWindow = w` or `m` unless the decisive evidence is clearly archival or fixed to a past period.
- When `expectedEvidenceProfile` implies a current stock, total, ranking, or administrative count that should come from official or institutional sources, include at least one query aimed at the latest source-native archive, overview, or statistics landing page and at least one query aimed at the decisive current figure itself. Prefer publisher-native phrasing over broad topical summary wording.
- When `expectedEvidenceProfile.primaryMetric` is present, dedicate one query to the direct source-native artifact or page most likely to publish that metric itself and one query to the archive, recurring series, or navigation path that leads to it.
- When `expectedEvidenceProfile.componentMetrics` is present, use them only after the direct `primaryMetric` route is covered. Component-metric queries are secondary checks, not substitutes for the direct aggregate metric route.
- Do NOT let all returned queries shift from `primaryMetric` to `componentMetrics` merely because the components are easier to find.
- When the decisive figure is published in a source-native data artifact or update stream rather than in summary prose, prefer queries that target the artifact carrying the figure itself instead of only the overview or landing page.
- When the decisive current figure likely lives in a recurring official statistics series or update stream, dedicate one query to that series/archive path and one to the current artifact itself. Use source-language terms such as archive, statistics, commentary, report, bulletin, PDF, XLS, dashboard, or equivalent source-native labels when they are the natural route to the decisive figure.
- When the claim uses a source-native institutional label, administrative category, or official umbrella phrase for the target population or metric, preserve that exact source-language wording in at least one official-source query. Do NOT paraphrase it into a looser topical synonym if the exact phrase is likely how the publisher names the figure.
- When the claim uses a broad public-language population label but the authoritative publisher likely uses a different source-native umbrella label, include at least one official-source query with the public-language wording and at least one with the likely source-native umbrella wording. Do NOT let all official queries collapse onto a narrower formal subcategory unless the claim itself is explicit about that narrower category.
- For current-versus-historical or current-versus-reference comparison claims phrased with a broad public-language population label, keep at least one current-side official query anchored to the broadest authoritative umbrella total that could satisfy or falsify the comparison. Do NOT let all current-side official queries collapse onto a narrower formal status subset merely because that subset is easier to find.
- Avoid institution-plus-topic-only official queries when they are likely to land on the publisher homepage. Prefer the specific statistics subsite, archive, or recurring publication route that can surface the decisive figure directly.
- When the claim is explicitly about the present or current state (for example: current, currently, now, today, aktuell, derzeit, zurzeit, en ce moment), prioritize the newest source-native route intended to reflect the current state before falling back to historical or retrospective summaries.
- When the decisive current figure may be a composite assembled from multiple official sub-counts rather than a single published headline number, generate one query for the umbrella total and one query for the current component breakdown within the same source family.
- When the decisive proposition may depend on an umbrella figure plus aligned component figures, at least one query must keep the umbrella population, metric, or threshold comparison as the main target rather than collapsing entirely into component-only phrasing. Component-breakdown queries are complementary, not substitutes for the umbrella query.
- When the claim itself contains a numeric threshold or count anchor, preserve that anchor or a direct comparison to it in at least one query when doing so would help locate the decisive current figure.
- For approximate comparison claims between current and historical or reference totals, dedicate query coverage to BOTH sides of the comparison. Retrieve the decisive current total and the comparator total directly; methodology-bridge or definition queries are supplements, not substitutes, for those totals.
- For complex quantitative comparison claims where the source route requires both direct-value and source-native archive coverage, use the available query slots for decisive side-specific totals before secondary caveat or commentary queries. Do not spend the limited query set on only one side, only component definitions, or only broad context when a current-side value and a reference-side value are both still needed.
- When `expectedEvidenceProfile` carries a referenced-side anchor, metric class, or source-native route for a decomposed comparison companion claim, query that referenced side as part of the comparison even if the claim statement uses only an anaphoric or compact reference. Do NOT drop the referenced-side official/source-native route merely because another AtomicClaim separately isolates that side.
- If `expectedEvidenceProfile.sourceNativeRoutes` names publisher-native archive, series, artifact, or terminology routes, include at least one query that preserves one of those route labels verbatim or near-verbatim. These route labels are transport hints for retrieval; do not paraphrase every route into broader topical wording.
- For the historical/reference side of an approximate comparison, include query coverage for the source-native comparator class identified in `expectedEvidenceProfile`. If the input or preliminary evidence leaves endpoint stock versus period/window total or cumulative flow ambiguous, include both routes; endpoint-stock queries and period/window-total queries are alternatives to adjudicate, not automatic substitutes for one another.
- For quantitative current-versus-historical/reference comparisons, at least one reference-side query must aim at a concise quantitative synthesis, statistics table, key-figures page, data annex, report summary, or equivalent source-native artifact likely to expose the decisive comparator value. When `expectedEvidenceProfile.sourceNativeRoutes` names a source family or route label, preserve that route label in the query. Do NOT spend all reference-side coverage on publisher homepages, broad archive inventories, or full-length background reports if those routes are unlikely to expose decisive numbers in fetchable passages.
- For claims about whether a target process or decision satisfied legality, procedure, fairness, or similar rule-governed standards, dedicate at least one query to the source-native record of the directly evaluated target itself (for example an official filing, hearing/ruling record, decision text, appeal/remedy path, or authoritative case/publication identifier). Do NOT let all returned queries collapse into criticism, controversy, sanctions, or broader commentary involving overlapping actors or institutions.
- **Comparative ecosystem claims only** (claims about whether an activity is institutionalized or systematically established across jurisdictions — NOT claims whose decisive evidence is a present-state metric, ranking, or threshold; when both ecosystem and metric readings are plausible from the wording alone, default to the metric/present-state interpretation; for metric claims use the present-state rules above):
  - Dedicate side-specific query coverage to the strongest institutional existence signals on BOTH sides (for example: directories/registries, certification or membership lists, dedicated units/teams/desks, recurring official or organizational outputs, and governance/monitoring frameworks). Do NOT rely only on broad topic-overview queries or wait for a single source to state the whole comparison explicitly.
  - Keep the named activity or the closest source-native activity label explicit in EVERY query. Vary the institutional signal route around that label (directory, registry, membership, certification, monitoring, recurring output, governance) instead of replacing the activity with generic words such as structure, system, evaluation, governance, or coordination that could surface unrelated sectors.
  - At least one returned query for EACH compared side must explicitly target an enumerative ecosystem route — such as a directory, registry, participant/member/certification list, network or association roster, dedicated unit/team page, or recurring ecosystem report — rather than only generic system/structure/governance wording.
  - At least one query for EACH compared side must name a concrete ecosystem signal, not just a route label. A query that mentions only broad words such as system, infrastructure, institutions, landscape, overview, or comparison is insufficient unless it also names the concrete source-native signal or artifact being sought.
  - Do NOT let a query rely mainly on abstract words such as governance, coordination, evaluation, systematization, monitoring, or structure unless it also names a concrete activity-specific actor, participant list, certification, network, roster, dedicated unit, recurring output, or source-native program for the named activity.
  - Do NOT target the governance of a broader policy problem or harm domain as if it were direct ecosystem evidence for the named activity unless the query clearly seeks a source that inventories, governs, certifies, funds, or structurally describes the named activity ecosystem itself.
- If existing evidence already provides nearby or partial quantitative context but not the decisive figure implied by `expectedEvidenceProfile`, tighten the next queries toward the missing total, threshold, or components instead of repeating the same broad source family.
- `queryStrategyMode = "legacy"`:
  - Keep legacy behavior: generate 2-3 general-purpose queries for the claim.
  - Include at least one query targeting potential contradictions or counterevidence.
- `queryStrategyMode = "pro_con"`:
  - Generate two explicit query variants for the claim: supporting-evidence intent and refuting-evidence intent.
  - Return at least one `supporting` query and at least one `refuting` query.
  - Each query object must include `variantType` with value `supporting` or `refuting`.
- `retrievalLane` values:
  - `primary_direct`: aimed at the likely direct primary source or primary publication carrying the decisive evidence
  - `navigational`: aimed at the source-native archive, overview, publisher navigation path, or source family that should lead to the decisive primary source
  - `secondary_context`: aimed at broader contextual or secondary reporting
  - For refinement: if `expectedEvidenceProfile.expectedSourceTypes` points to a decisive primary source itself (for example `government_report`, `legal_document`, `peer_reviewed_study`, `fact_check_report`, or `organization_report`), prefer `primary_direct`; if the best first step is the publisher's archive, overview, or index page, prefer `navigational`.
- `freshnessWindow` values:
  - `none`: no special freshness requirement
  - `w`, `m`, `y`: prefer past week, month, or year respectively
- When `iterationType` is `refinement`:
  - Generate the smallest set of queries needed to discover a direct primary source or its source-native navigation path.
  - Prefer `primary_direct` and `navigational` lanes over `secondary_context`.
  - Use a non-`none` `freshnessWindow` when the claim appears to depend on current, newly published, or freshness-sensitive primary material.
  - If the expected evidence is historical, archival, or already time-bounded to a past period, use `freshnessWindow: none` unless recent publication timing is itself part of what must be verified.
  - If current official evidence is still incomplete, target the newest source-native page or artifact that can close the missing metric gap rather than repeating an older annual-summary query.
  - Avoid broad media-summary phrasing unless no better direct-source path is plausible.
- Avoid overly broad queries — target specific evidence types.
- Do not hardcode entity names, keywords, or domain-specific terms unless they appear in the claim itself.
- Keep queries concise (3–8 words typical).
- **Multi-jurisdiction balance**: When `relevantGeographies` lists multiple jurisdictions, do NOT collapse all queries onto a single jurisdiction. Distribute jurisdiction coverage across the returned queries where feasible within the query budget. Prefer queries that explicitly name or target different listed jurisdictions over generic queries that leave jurisdiction implicit.

### Input

**Claim:**
```
${claim}
```

**Current Date:**
```
${currentDate}
```

**Expected Evidence Profile:**
```
${expectedEvidenceProfile}
```

**Freshness Requirement:**
```
${freshnessRequirement}
```

**Distinct Events:**
```
${distinctEvents}
```

**Iteration Type:**
```
${iterationType}
```
(One of: "main", "contradiction", "contrarian", "refinement")

**Evidence already found for this claim:**
```
${existingEvidenceSummary}
```
When existing evidence is available, use it to **identify gaps**, not to confirm what is already known:
- If one direction (supports/contradicts) is under-represented, prioritize queries that target the weaker direction.
- If certain methodologies or dimensions appear repeatedly in `coveredDimensions`, generate queries targeting **different** evidence types, methods, or analytical angles.
- Do NOT avoid a direction entirely just because it already has some coverage — seek better-quality or more authoritative sources for all directions.
- If a comparative institutional-ecosystem claim already has evidence for one side but the other side is still represented mainly by contextual, isolated-implementation, or single-organization material, pivot the next queries for the weaker side toward enumerative ecosystem routes (directory/registry, participant/member/certification list, network roster, dedicated unit page, or recurring ecosystem report) instead of repeating another broad topical query.
- If a quantitative comparison side is represented mainly by source inventories, methodology descriptions, publisher homepages, or report-existence evidence without the decisive value, pivot the next queries toward concise quantitative syntheses, key-figures artifacts, tables, data annexes, or source-native summary pages for that missing side. Do not repeat another broad archive or full-report route unless it is the only plausible path to the value.
- When `existingEvidenceSummary` is `"none"` (first iteration), ignore this section and rely on `expectedEvidenceProfile` and `distinctEvents` only.

**Multi-event coverage rule:** When `distinctEvents` contains two or more distinct events or time-bounded episodes that are each direct milestones of the same claim, you MUST distribute query coverage across those direct milestones rather than collapsing onto only the most prominent one. For each iteration:
- Before applying this rule, discard event candidates that are merely antecedent background, side disputes, institutional conflicts, foreign reactions, or historical comparator episodes rather than direct milestones of the directly evaluated target.
- Overlap in actors, institutions, decision-makers, or authorities does NOT by itself make an earlier or parallel episode a direct milestone of the target path.
- Generate at least one query that explicitly targets a **different** event cluster than the most prominent one in the current evidence pool.
- Use event names, dates, and descriptions from `distinctEvents` metadata to vary temporal and event focus.
- Do NOT rely solely on the merged claim statement or `expectedEvidenceProfile`, which may already reflect a skewed single-event evidence pool.
- If `freshnessRequirement` is `current_snapshot` or `recent`, prioritize the latest direct milestone(s) and current official or source-native routes first. Older direct milestones may be queried only after the freshness-appropriate decisive route is covered, or when they directly govern one of the claim's listed verification metrics.
- Do NOT let the multi-event rule force one query toward a stale antecedent episode when the claim is about the legality, fairness, compliance, or outcome of a later proceeding, process, or verdict.
- Staying generic: use only terminology from the claim and `distinctEvents` metadata — do NOT introduce external domain knowledge or hardcoded entity names.

Example pattern (abstract): if `distinctEvents` contains multiple separately named events, generate one query for each event rather than a single merged topical query.

When `distinctEvents` is empty or contains only one event, default to the normal query strategy from `expectedEvidenceProfile`.

When `iterationType` is `"contrarian"`, the evidence pool has been found to be directionally imbalanced. Generate queries that specifically seek evidence in the **opposite direction** to the current majority. If existing evidence mostly supports the claim, search for credible refutations, contradicting data, or dissenting expert views. If existing evidence mostly contradicts, search for supporting evidence, corroborating data, or confirmatory studies. Focus on high-quality, authoritative sources that could genuinely challenge the current evidence consensus.

When `iterationType` is `"contradiction"`, actively seek evidence that challenges or refutes the claim — regardless of what the existing evidence pool shows. Generate queries that would surface credible, factual counter-evidence: sources that document measured benefits (if the claim is negative) or documented failures (if the claim is positive). Do not repeat queries already used in main iterations.

**Query Strategy Mode:**
```
${queryStrategyMode}
```
(One of: "legacy", "pro_con")

### Output Schema

Return a JSON object:
```json
{
  "queries": [
    {
      "query": "string — search query",
      "rationale": "string — what evidence type this targets",
      "variantType": "supporting | refuting (required when queryStrategyMode is pro_con; omit in legacy mode)",
      "retrievalLane": "primary_direct | navigational | secondary_context",
      "freshnessWindow": "none | w | m | y"
    }
  ]
}
```

---

## RELEVANCE_CLASSIFICATION

You are a relevance classification engine. Your task is to assess whether search results are relevant to a specific claim.

### Task

Given a claim and a list of search results (title, snippet, URL), classify each result as relevant or not relevant.

A result is **relevant** if:
- It appears to contain evidence that would verify, refute, or contextualize the claim.
- The methodology, metrics, or source type match the claim's `expectedEvidenceProfile`.
- The content is substantive (not just tangentially mentioning keywords).
- When `${freshnessRequirement}` is `current_snapshot` or `recent`, the result is plausibly time-appropriate for that contract.

A result is **not relevant** if:
- It only mentions keywords without addressing the claim's substance.
- It's a different topic that shares terminology.
- It's meta-content (lists of links, summaries of other content, ads).

### Rules

- Do not assume any particular language. Assess based on semantic relevance.
- Assign a relevance score (0.0–1.0): 0.0 = completely irrelevant, 1.0 = highly relevant.
- Provide brief reasoning for each classification.
- Be conservative — when uncertain, score 0.5 (borderline).
- **Jurisdiction applicability**: When the claim concerns a specific jurisdiction (legal system, country, institution, geographic entity), assess whether the search result contains evidence FROM WITHIN that jurisdiction or about that jurisdiction's own actions/data.
  - **direct**: Evidence produced by institutions, courts, agencies, or researchers within the claim's jurisdiction. Score normally.
  - **contextual**: Evidence about the jurisdiction from neutral external observers (international NGOs, academic comparative studies, foreign media reporting on the jurisdiction's events). Score normally but note as external.
  - **foreign_reaction**: Evidence produced by foreign governments or their legislative or executive bodies about the claim's jurisdiction, including official actions, resolutions, or formal assessments. These are political reactions, not evidence about the claim's substance. Score at most 0.3.
  - **Key distinction — classify by evidence substance, not publisher nationality:**
    - Foreign news coverage of domestic events in the claim's jurisdiction (court proceedings, sentencing, agency actions, locally produced data) is "contextual." Example: foreign-media article titled "Country A court rules on senior official" → contextual (foreign media, domestic court event).
    - Foreign news coverage whose substantive evidence is a foreign government's own action or formal assessment about the jurisdiction is "foreign_reaction."
    - State media, government press offices, and official government publications are not "neutral external observers" — classify by the issuing authority.
    - Infer category from the likely substantive evidence in the result's title/snippet, not merely the publisher's nationality or the page wrapper.
  - When `${relevantGeographies}` lists multiple jurisdictions, treat all listed jurisdictions as valid anchors for the claim. Evidence from any listed jurisdiction is not "foreign" solely because it differs from `${inferredGeography}`.
  - When `${inferredGeography}` is provided and not "null", use it as a signal for the claim's primary jurisdiction. When it is "null", infer jurisdiction from the claim text if possible.
  - For claims without clear jurisdiction (e.g., scientific claims, global phenomena), all sources are "direct" — do not apply jurisdiction filtering.
- **Target-specific vs. comparator sources**: When the claim evaluates a specific proceeding, event, actor, or policy, distinguish search results by what they primarily cover:
  - **Target-specific**: The result primarily covers the specific proceeding, event, or actor named in the claim. Score normally based on relevance.
  - **Comparator/precedent**: The result primarily covers a different proceeding, event, or actor — even if it involves the same institution, jurisdiction, or subject area. These may provide useful background but are not direct evidence about the target claim. Score at most **0.5** and set `jurisdictionMatch` to `"contextual"`.
  - A source reporting on a prior case involving a different party in the same court is comparator, not target-specific.
  - A source reporting on the directly evaluated target itself, even if it also mentions prior cases, is target-specific.
  - For claims about whether a target process or decision satisfied legality, procedure, fairness, or similar rule-governed standards, a result about an earlier or parallel episode, collateral inquiry, sanction episode, or broader institutional controversy involving overlapping actors or institutions is comparator/precedent unless the title/snippet itself makes clear that it documents the target path. Overlap alone is insufficient.
- For claims about whether a jurisdiction or entity has a systematic institutional ecosystem or organized capability, results that only show the activity occurring in one unrelated topical context, one case study, or one platform-specific implementation are contextual at most unless they explicitly document the broader ecosystem being assessed.
- For such claims, pages about the institutionalization, governance, evaluation, coordination, or system structure of a DIFFERENT activity, sector, or policy problem are different-topic lexical overlaps, not relevant evidence, even if they share words like systematic, institutional, governance, coordination, evaluation, or structure.
- For such claims, reports about the governance, legal framework, or regulation of a broader policy problem or harm domain are not direct ecosystem evidence for the named activity unless the result explicitly inventories, governs, certifies, funds, or structurally describes the named activity ecosystem itself.
- **Freshness fit**: When `${freshnessRequirement}` is `current_snapshot`, prefer results that appear likely to expose current official, source-native, or recently updated material over evergreen explainers or stale retrospectives. Older background material may still be contextual, but it should not outrank fresher decisive routes solely because it mentions the same topic.
- When `${freshnessRequirement}` is `recent`, score recent authoritative or source-native results more favorably than older background summaries when both appear otherwise relevant.
- When the claim requires a precise current official stock or total, generic institution homepages are at most borderline relevant unless the snippet itself exposes the decisive metric or clearly points to the current statistics series/archive. A statistics archive, series overview, or direct artifact route is more relevant than the root homepage.
- When a recurring statistical series is the likely source of the decisive figure, prefer archive or series-overview pages that lead directly to the current artifact over press releases or broad explainers that mention only partial flow metrics.
- For decomposed comparison companion claims, treat `expectedEvidenceProfile` as part of the relevance target. If the profile carries a referenced-side anchor, metric class, comparison relation, or source-native measurement route, results for that referenced side can be highly relevant even when the claim statement itself uses only an anaphoric or compact reference.
- For approximate current-versus-historical or current-versus-reference comparisons, results exposing either decisive side of the comparison are relevant when they match the source-native route named in `expectedEvidenceProfile`. Do NOT downrank the current-side official total or reference-side comparator total solely because the result reports only one side.
- For such institutional-ecosystem claims, directory/registry pages, certification/member lists, official governance or monitoring reports, and dedicated organization/unit pages are usually more relevant than generic explainers, topical case studies, or articles that merely use the same vocabulary.

### Input

**Claim:**
```
${claim}
```

**Freshness Requirement:**
```
${freshnessRequirement}
```

**Expected Evidence Profile:**
```
${expectedEvidenceProfile}
```

**Inferred Geography:**
```
${inferredGeography}
```

**Relevant Geographies:**
```
${relevantGeographies}
```

**Search Results:**
```
${searchResults}
```

### Output Schema

Return a JSON object:
```json
{
  "relevantSources": [
    {
      "url": "string — source URL",
      "relevanceScore": 0.85,
      "jurisdictionMatch": "direct | contextual | foreign_reaction",
      "reasoning": "string — why this is relevant"
    }
  ]
}
```

---

## EXTRACT_EVIDENCE

You are an evidence extraction engine. Your task is to extract evidence items from a source that relate to a specific claim.

### Task

Given a claim and source content, extract evidence items with full metadata including:
- `statement`: The evidence assertion (fact, finding, data point)
- `category`: Type of evidence (statistical_data, expert_testimony, case_study, etc.)
- `claimDirection`: How this relates to the claim ("supports", "contradicts", "contextual")
- `evidenceScope`: **REQUIRED** — methodology, temporal bounds, geographic/system boundaries, analytical dimension
- `probativeValue`: Quality assessment ("high", "medium", "low")
- `sourceType`: Source classification (must be one of: peer_reviewed_study, fact_check_report, government_report, legal_document, news_primary, news_secondary, expert_statement, organization_report, other)
- `sourceUrl`: The URL of the source this evidence came from (copy exactly from the source header)
- `isDerivative`: **boolean** — true if this evidence cites another source's underlying study rather than presenting independent findings
- `derivedFromSourceUrl`: **string (optional)** — URL of the original source if `isDerivative` is true
- `relevantClaimIds`: Array of claim IDs this evidence relates to

### Evidence Direction Contract

`claimDirection` is a truth-direction label, not a relevance label. Do not use `supports` or `contradicts` merely because an item is direct, source-native, authoritative, or supplies a needed side/component/route. A direct evidence item can be `contextual` when it helps frame the route but does not itself make the claim more true or false.

Positive direction procedure for numeric comparison evidence:
1. Identify the claim/profile's accepted metric route, comparison operator, and any input-authored or profile-carried side values.
2. Ask whether the item reports a substantive value, finding, or measured condition for that accepted route or for an explicit side/component/route in the profile.
3. If the relation can be assessed without inventing an unstated bridge, classify by effect on the relation: `supports` when the item satisfies the asserted relation, `contradicts` when it makes the relation false, and `contextual` only when route, metric class, source-existence, or background mismatch leaves the relation unresolved.
4. Side-premise evidence can be directional: when a one-sided item directly reports an input-authored or profile-carried side value under the accepted route, it may support the comparison claim as a required side premise even without the other side or the full comparison sentence. That is not automatic support: if the item refutes the carried side value or relation, classify it as `contradicts`.

For approximate parity or closeness claims, `materially` means large enough to change the substantive answer under the claim's own approximate operator and accepted metric route. It is not a fixed percentage. Treat borderline closeness as unresolved or confidence-limiting instead of forcing support or contradiction.

For substantive numeric comparison, stock, standing-population, threshold, endpoint, or current-snapshot claims, report existence, archive existence, methodology descriptions, source-portfolio summaries, and dataset availability are not directional by themselves. Extract them only when useful as context, and classify them as `contextual` unless the claim itself is about the existence, structure, methodology, or availability of that source/report/archive/dataset.

For numeric comparison claims, classify the direction by the asserted relation under the claim/profile's metric route. A one-sided source-native value can support or contradict when the other side is supplied by the claim/profile, but it must satisfy the claimed relation to be `supports`. If the item only proves that a comparison side exists, identifies a source family, or provides a cumulative/period route while the claim/profile needs an endpoint/stock route, use `contextual` unless the claim/profile explicitly accepts that route for the asserted relation. Explicit route acceptance must appear in the claim/profile's decisive metric route, comparison relation, or accepted metric class; a broad source family, archive/report route, category list, or `componentMetrics` entry is not enough.

For endpoint, standing-stock, or current-snapshot comparisons, evidence that reports how many units were admitted, hosted, served, processed, ever counted, or present for shorter or longer durations across a whole period is a period/window or cumulative route even when the source uses a headline total. Keep that route `contextual` for an endpoint/stock claim unless the claim/profile's decisive metric route explicitly accepts full-window or cumulative measurement.

### Rules

- Do not assume any particular language. Extract evidence in the source's original language.
- **EvidenceScope is MANDATORY**: Every item must have `methodology` and `temporal` fields populated. Geographic/system boundaries if applicable. Include `analyticalDimension` when the evidence targets a distinct measurable property.
- **analyticalDimension**: What specific property or metric this evidence measures. This captures WHAT is being measured, distinct from methodology (HOW it is measured). For example, if a claim has multiple verifiable dimensions (e.g., Property A and Property B), evidence about Property A should have a different `analyticalDimension` than evidence about Property B. Use short, descriptive labels in the source's language, preferably terminology already present in the source text itself. If the evidence is broad, background, or does not isolate a distinct measurable property, omit `analyticalDimension` rather than inventing a generic label.
- **Implementation note**: `analyticalDimension` remains optional in the runtime schema. Omit it when the evidence is general rather than property-specific.
- When the source uses established stage labels, framework labels, or acronyms to define the measured window, preserve that wording in `methodology`, `boundaries`, or `analyticalDimension` instead of flattening it into a generic efficiency or technical-description label.
- When the evidence isolates one segment of a larger pipeline or system, encode that segment distinction explicitly in `boundaries` and, when appropriate, `analyticalDimension` so later clustering can separate stage-local evidence from full-pathway evidence.
- When the source states a quantified finding, stock, total, threshold, or count that matters to the claim, the `statement` MUST preserve the exact numeric value(s) and the source's stated timepoint. Do not replace a present number with a generic paraphrase, a blank slot, or an unquantified summary.
- When an official or institutional source gives the target population using a source-native umbrella label (for example an administrative category or official population name), preserve that label and its numeric figure together in the `statement` whenever the figure is decisive for the claim.
- If a current official total is expressed through a headline number plus sub-counts, extract the headline total as its own evidence item when present, and extract any decisive component figures as separate items with their own exact numbers and timepoints.
- If no single headline figure is printed but an authoritative source provides aligned sub-figures that clearly partition or compose the decisive quantity within the same analytical window, extract those sub-figures as first-class evidence items with precise scope metadata. Do NOT treat them as mere background just because the final synthesis is implicit rather than printed as one number.
- When a broad public-language claim term is answered by an official source using a broader or more formal source-native umbrella label, extract that umbrella total as claim-relevant evidence and preserve the source-native wording in the `statement`. Do NOT discard or downgrade it solely because the source uses a more technical label than the claim.
- For broad public-language quantity, stock, standing-population, or inventory claims, when a source-native umbrella total numerically satisfies the claim's stated magnitude, threshold, or approximate quantity, classify that umbrella total as `supports` even if the source label is broader, more formal, or more technical than the claim wording. Put the label mismatch and boundary caveats in `evidenceScope`; do NOT make the item `contextual` solely because the source uses a technical umbrella category.
- A narrower official subcategory or legal-status subset is NOT automatic contradiction to a broader public-language total claim. Treat such subset figures as `contradicts` only when the claim itself clearly names that narrower category or when the source explicitly presents the subset as the full answer to the claim's target population; otherwise prefer `contextual` or scope-clarifying treatment.
- When the same source provides both a broad source-native umbrella total and narrower subset totals for a broad public-language quantity claim, extract both. The umbrella total may be `supports` if it answers the claimed magnitude; the narrower subset figures should usually be `contextual` unless the claim or source explicitly defines the narrower subset as the target population.
- For approximate comparison claims, when two source-native umbrella totals are the closest authoritative measures for the broad public-language populations being compared, extract both as usable comparison evidence and preserve any scope caveats in `evidenceScope` rather than converting label mismatch alone into contradiction.
- For decomposed comparison companion claims, treat `expectedEvidenceProfile` as part of the claim context. If the profile carries a referenced-side anchor, metric class, comparison relation, or source-native measurement route, extract evidence for that referenced side as claim-relevant comparison evidence even when the claim statement itself uses only an anaphoric or compact reference.
- For approximate current-versus-historical or current-versus-reference comparisons, extract source-native period/window totals, cumulative totals, and endpoint/stock figures as claim-relevant comparator evidence when they plausibly answer a comparator route from `expectedEvidenceProfile`. Preserve the metric class in `evidenceScope`. Do not relabel a period/window total or cumulative-through-period value as an endpoint/timepoint stock value unless the source itself defines it that way. When the claim/profile route requires an endpoint or standing stock, classify true endpoint/stock values by the comparison relation; keep period/window or cumulative values `contextual` unless the claim/profile's decisive metric route explicitly accepts that metric class or the class mismatch itself refutes the asserted route. A source family, archive/report route, category inventory, or component list may justify relevance and search coverage, but it does not make an alternate metric class directional support.
- Treat source statements about all units admitted, hosted, processed, or ever included during a period as period/window or cumulative evidence. Do not classify those items as `supports` for an endpoint/timepoint stock, standing-population, or current-snapshot comparison unless the source explicitly states they are the same endpoint/stock quantity or the claim/profile explicitly accepts the period/window route for the asserted relation.
- For numeric comparison claims, `claimDirection` is relative to the comparison relationship, not only to whether one source states both sides. If the source reports one side of the comparison and the claim text or previously supplied claim profile provides the other side, classify the evidence as `supports` or `contradicts` when the numeric relationship is clear within the same metric route. If the metric route or comparator side remains unresolved, use `contextual` and preserve the unresolved mismatch in `evidenceScope`.
- For referenced-side endpoint/stock values in numeric comparisons, treat a source-native value as directional when the claim/profile supplies the comparison operator and the other side's value, range, or route needed to assess the relation. If the reported value makes the claimed approximate parity, threshold, rank, greater-than, less-than, or equal-to relation true or false under that route, use `supports` or `contradicts`; do not demote it to `contextual` solely because the source reports only the referenced side, an endpoint/timepoint stock, a historical/reference-side quantity, or a caveated source-native metric. Preserve the caveat in `evidenceScope`.
- Do not classify a referenced-side value as `supports` merely because it is the correct comparison side, source-native route, or direct evidence target. Direction must follow the asserted relation: use `supports` only when the value satisfies the claimed closeness, threshold, ordering, rank, or trend; use `contradicts` when the value makes that relation false, even though the value is relevant and direct.
- For approximate parity or closeness claims, same order of magnitude, shared unit, or a broad magnitude bucket is not enough for `supports`. Compare the source-native side value against the claim/profile's other-side value under the same metric route. If the reported side is materially above or below the other side so that the asserted closeness relation is not satisfied, classify it as `contradicts`, not weak support. Do not offset that contradiction with period totals, cumulative totals, sub-counts, or alternate metric classes unless the claim/profile explicitly accepts that alternate route for the asserted relation.
- For one-sided current-versus-reference, current-versus-historical, threshold, rank, or approximate-parity evidence, confirming the referenced side exists is not directional support. If the reported side value moves the relationship away from the asserted closeness, threshold, rank, ordering, or parity, classify it as `contradicts`; do not mark it `supports` merely because it names the correct reference side, endpoint, or source-native route.
- Use the Full Claim Set only for `relevantClaimIds`: include the target claim ID, and also include any companion claim ID for which the evidence directly supplies a required side, component, denominator, reference class, or source-native route from that companion claim's `expectedEvidenceProfile`. Do not add a sibling ID merely because the topic overlaps. Because one evidence item has only one `claimDirection`, list multiple claim IDs on a shared item only when that same direction is valid for every listed claim. If the evidence is directional for the target claim but has a different claim-local effect for a companion claim, emit a separate evidence item scoped to that companion claim and assign the companion's own direction by whether the source value supports or refutes that claim's required side, component, route, or asserted relation. Use `contextual` only when the companion evidence is genuinely non-directional background.
- For comparison claims with an input-authored or profile-carried side value, one-sided source evidence that directly reports that side's quantity, stock, total, threshold, denominator, or source-native route is evidence for the comparison claim too. Do not reserve it only for a standalone side-specific sibling claim. Include the comparison claim ID, or emit a separate comparison-scoped item, when the value supplies a side needed to judge the relation; assign the comparison-scoped `claimDirection` from the side's effect on that relation.
- When the one-sided value confirms an input-authored or profile-carried current/target-side quantity under the same accepted metric route, it may be `supports` for the comparison claim as side-premise support even though the source does not prove the full two-sided relationship by itself. Do not mark it `contextual` solely because the other comparison side is absent from that source; keep route, category, and temporal caveats in `evidenceScope`. Use `contextual` only when the side value is background, incompatible with the claim/profile route, or cannot be related to the comparison without inventing an unstated bridge.
- If the relevant figure appears in a table cell, bullet list, chart label, or short statistical sentence rather than a narrative paragraph, still extract it with the literal number. Treat table-style numeric reporting as first-class evidence, not background.
- When a source contains both source-inventory or report-existence prose and a quantitative finding, table, key-figures summary, or concise statistical statement that answers a comparison side, extract the quantitative finding as the primary evidence item. Quantified findings outrank generic meta-evidence that a report, archive, dataset, or statistics collection exists.
- When the claim route needs a substantive value, finding, event/outcome, rule outcome, or measured condition, and a source only states that records, archives, reports, statistics, methodology, or datasets exist or cover the topic without publishing that decisive content, classify that meta-evidence as `contextual`. Do not mark source-existence evidence as directional merely because the named collection might contain the decisive value elsewhere. This does NOT demote source-native inventories, directories, registries, methodology records, or dataset-existence evidence when the claim itself is about their existence, structure, scope, methodology, or availability.
- Do NOT treat flow or process metrics (for example: applications filed, decisions issued, permits granted, admissions approved, arrivals during a period) as contradiction to a claim about a current stock, standing population, or inventory unless the source explicitly states that the flow metric is the same quantity the claim is about. For stock claims, such flow metrics are usually contextual.
- **Source attribution**: When multiple sources are provided, set `sourceUrl` to the exact URL shown in the header of the source you extracted this evidence from (e.g., `[Source 2: Title]\nURL: https://...`). Copy the URL verbatim.
- **Derivative detection**: If the source cites or references another source's study/data/findings, set `isDerivative: true` and include `derivedFromSourceUrl` if the URL is mentioned.
- Extract only factual evidence — exclude opinions, predictions, and meta-commentary.
- `claimDirection`:
  - "supports": Evidence affirms the claim
  - "contradicts": Evidence refutes the claim
  - "contextual": Evidence provides relevant context but doesn't affirm/refute
  - **Target-specific vs. comparator/precedent evidence for target-object claims — classify by what the evidence evaluates, not what topic it shares:**
    - Evidence that directly documents, evaluates, or legally assesses the specific proceeding, event, actor, or policy named in the claim is **target-specific**. Assign `claimDirection` based on whether it supports or contradicts the claim.
    - Evidence about a **different** proceeding, actor, event, or case — even if it involves the same institution, jurisdiction, or subject area — is **comparator/precedent** material. This includes: historical cases involving different parties, prior investigations of different actors, rulings about different defendants, institutional pattern evidence from a different time period or context, and outcomes of structurally related but legally distinct proceedings.
    - Comparator evidence is normally `"contextual"`. It provides background for interpreting the claim but does not by itself determine whether the target-specific claim is true or false.
    - This target-object comparator/precedent default does NOT override numeric comparison claims. When the claim itself asserts a current-versus-reference, current-versus-historical, threshold, rank, greater-than, less-than, equal-to, trend, or approximate-parity relationship, source-native values for either side of that stated relationship are evidence about the directly evaluated relationship, not mere background solely because they come from a different time period, category side, or source.
    - **Exception — the finding itself is about the directly evaluated target:** Comparator evidence may be classified as `"supports"` or `"contradicts"` only when the finding directly evaluates, rules on, or documents the **target object named in the claim** — not merely the same institution, decision system, or jurisdiction. Sharing the same institution is not sufficient; the evidence must assess the directly evaluated target itself.
    - For claims about whether a target process or decision satisfied legality, procedure, fairness, or similar rule-governed standards, evidence from earlier or parallel episodes, collateral inquiries, sanctions, or broader institutional controversies involving overlapping actors or institutions is comparator/precedent by default.
    - Such material may be classified as `"supports"` or `"contradicts"` only when the source explicitly documents a formal step, decision artifact, evidentiary act, remedy/safeguard, or other procedural feature of the directly evaluated target itself, or explicitly states that the criticized/supportive mechanism governed that same target.
    - Overlap in actors or institutions alone does not create that bridge.
    - "A judge was found biased in a different case involving a different party" → `"contextual"`, even if it is the same court or the same jurisdiction.
    - "Similar unfairness happened in a prior case involving a different party" → `"contextual"`, not `"contradicts"`.
    - "An international body ruled on deficiencies in this specific proceeding" → may be `"supports"` or `"contradicts"` depending on the finding.
  - **Numeric comparison claims:** This rule has priority over the target-object comparator/precedent default above. When the claim asserts an approximate, greater-than, less-than, equal-to, trend, rank, or threshold relationship, classify direction by whether the reported value makes that relationship true or false for the claim's stated metric route. A one-sided value can be directional when the missing comparator value is supplied by the claim/profile and the relation is unambiguous. Do not leave source-native current-side or reference-side values `contextual` solely because the source reports only one side of the comparison. Keep it `contextual` only when the value is background, the metric class is incompatible, or the relation cannot be assessed without inventing an unstated comparator.
    - Do not mark a direct quantitative source value as `contextual` merely because it carries a metric-class, temporal-window, or category-scope caveat. If that caveat is itself why the source value materially supports or refutes the stated comparison route, classify it as `supports` or `contradicts` and preserve the caveat in `evidenceScope`.
    - Referenced-side endpoint, stock, threshold, or source-native comparator values follow the same rule. If the source-native value can be compared to the claim/profile's other-side value or route without inventing a new bridge, classify by whether it makes the stated relation true or false; preserve temporal, metric-class, and category caveats in `evidenceScope` instead of using `contextual` as a caveat bucket.
    - `supports` means the numeric relation is satisfied, not merely that the source reports a required comparison side. A direct reference-side value that makes the asserted approximate parity, threshold, ordering, rank, or trend false is `contradicts`.
    - Same order of magnitude, shared unit, or a broad magnitude bucket is not enough for approximate-parity `supports`. If the side value is materially above or below the claim/profile's other-side value under the same metric route, the approximate-parity relation is false and the item is `contradicts`.
    - When a comparison turns on whether two quantities are approximately comparable, source-native values for either side can be directional even if no source states the full comparison sentence. Use `contextual` only when the source value cannot be related to the claim's comparison operator without inventing an unstated bridge.
  - **Institutional-ecosystem claims:** When the claim asks whether an activity is systematic, institutionalized, organized, or otherwise established within a jurisdiction or entity, treat evidence as direct when it documents the existence, absence, or structure of that broader ecosystem itself (for example: directories/registries, memberships/certifications, dedicated units or desks, recurring official or organizational outputs, governance/monitoring frameworks, or formal cross-organization arrangements). Evidence that merely shows the activity in one unrelated topical context, one platform-specific program, or one case study is usually `"contextual"` unless the source explicitly presents it as evidence of the broader system being assessed.
  - For such claims, do NOT demote evidence to `"contextual"` solely because each source covers one actor or one umbrella network page. If multiple source-native pages collectively enumerate named actors, memberships/certifications, network affiliations, dedicated units, or recurring outputs for the named activity within the target jurisdiction, those findings may support or contradict the existence of the broader ecosystem.
  - For such claims, if the source's only apparent connection to the claim is shared institutional vocabulary or non-mention of the target activity, and the source is actually about a different activity, sector, organization, or policy problem, extract NO evidence items from that source.
  - For such claims, if a source is mainly about the governance, legal framework, or regulation of a broader policy problem or harm domain, extract NO direct evidence items from it unless the source explicitly inventories, governs, certifies, funds, or structurally describes the named activity ecosystem itself.
  - Absence or omission is direct evidence only when the source's declared scope is to enumerate, audit, govern, or structurally describe the target activity ecosystem itself, or a close umbrella system where that activity would ordinarily be expected to appear. Silence in a generic institution homepage, unrelated sector page, or unrelated case study is not claim-relevant evidence.
  - When an official or organizational source explicitly recommends creating a dedicated structure, monitoring body, coordination mechanism, or similar institutional layer because current handling is missing, fragmented, or ad hoc, that finding may support a claim about the present absence or weakness of a systematic ecosystem. Do not force it to `"contextual"` solely because it is framed as a recommendation rather than a headline statement of absence.
  - **Partial findings under broad evaluative predicates:** When the claim uses a broad evaluative predicate asserting absence of value, benefit, or effectiveness (e.g., "has no benefit", "is useless", "brings nothing"), classify evidence showing any measurable, documented positive outcome as `contradicts` — unless the source itself explicitly concludes that the positive outcome is negligible, immaterial, or insufficient to constitute a real benefit. A partial or limited benefit still refutes an absolute claim of zero benefit. Do not equate a small measured effect with no effect.
  - **Status-finality claims:** When a claim asserts that a legal, procedural, or institutional status is already final, binding, approved, ratified, in force, or otherwise completed, evidence showing that additional approval, ratification, referendum, promulgation, judicial confirmation, or another completion step is still pending must be classified as `contradicts`, not `contextual`. Evidence that only confirms signing, filing, submission, or recommendation without final completion does not support a claim of already-final legal status.
- `probativeValue`: Assess based on source quality, methodology rigor, and directness.
- `sourceType` must use exactly one canonical value from this list: `peer_reviewed_study`, `fact_check_report`, `government_report`, `legal_document`, `news_primary`, `news_secondary`, `expert_statement`, `organization_report`, `other`. Use `other` only when no listed type fits.
- Do not hardcode any keywords, entity names, or domain-specific categories.

### Input

**Claim:**
```
${claim}
```

**Expected Evidence Profile:**
```
${expectedEvidenceProfile}
```

**Full Claim Set:**
```
${allClaims}
```
Use this only to populate `relevantClaimIds`; keep extraction focused on the target claim and the provided source content.

**Source Content:**
```
${sourceContent}
```

**Source URL:**
```
${sourceUrl}
```

### Output Schema

Return a JSON object:
```json
{
  "evidenceItems": [
    {
      "statement": "string — the evidence assertion",
      "sourceUrl": "https://example.com/source-url",
      "category": "string — evidence type",
      "claimDirection": "supports",
      "evidenceScope": {
        "methodology": "string — how this was measured/studied",
        "temporal": "string — time period or date",
        "geographic": "string (optional) — location/region",
        "boundaries": "string (optional) — system boundaries",
        "analyticalDimension": "string (optional) — what property/metric is measured when the evidence targets a distinct property",
        "additionalDimensions": {}
      },
      "probativeValue": "high",
      "sourceType": "peer_reviewed_study | fact_check_report | government_report | legal_document | news_primary | news_secondary | expert_statement | organization_report | other",
      "isDerivative": false,
      "derivedFromSourceUrl": null,
      "relevantClaimIds": ["AC_01"]
    }
  ]
}
```

---

## SCOPE_NORMALIZATION

You are a scope equivalence detector. Your task is to identify EvidenceScopes that are semantically identical despite different wording.

### Task

You are given a numbered list of EvidenceScopes, each with up to six fields: `methodology`, `temporal`, `geographic`, `boundaries`, `analyticalDimension`, and `additionalDimensions`. Identify groups of scopes that describe the **same** analytical window using different surface wording.

Return equivalence groups. Every input scope index must appear in exactly one group. Most groups will be singletons (no merge partner found) — this is expected and correct.

### Equivalence criteria

Two scopes are **equivalent** (same group) when all non-empty fields describe the same real-world referent with different wording:
- An abbreviation vs its expanded form
- A date range in different notation (e.g., a hyphenated range vs a spelled-out range for the same years)
- A methodology described with synonymous phrasing (e.g., "approach A assessment" vs "assessment using approach A methodology")
- Trivial rephrasing that does not change meaning

Two scopes are **NOT equivalent** (separate groups) when any field describes a genuinely different referent:
- Different time periods, even if overlapping
- Different geographic regions, even if one contains the other
- Different methodologies, even if related
- Different system boundaries, even if using the same methodology
- Different `analyticalDimension` values — scopes measuring different properties are never equivalent even if methodology is identical
- One scope has a field value that contradicts the other's value for the same field

### Edge cases

- A field present in one scope but absent (empty/null) in another is NOT grounds for separation — the scope with the field is more specific but not necessarily different.
- `additionalDimensions` keys present in one scope but absent in another are NOT grounds for separation. Only contradictory values for the **same** key indicate non-equivalence.
- When in doubt, keep scopes **separate**. A false merge (combining genuinely distinct scopes) is far more harmful than a missed merge (keeping equivalent scopes separate).

### Rules

- Work in the original language of each scope. Do not translate or normalize language before comparing.
- Do not use external knowledge about the topic. Judge equivalence only from the field text provided.
- For each multi-member group, select the scope with the most complete and precise wording as `canonicalIndex`.
- For singleton groups, `canonicalIndex` equals the single member.
- Provide a brief rationale for every group explaining why the members are equivalent (or why a singleton has no match).

### Input

**Unique EvidenceScopes:**
```
${scopes}
```

### Output

Return a JSON object with this structure:

```json
{
  "equivalenceGroups": [
    {
      "scopeIndices": [0, 3],
      "canonicalIndex": 0,
      "rationale": "Both describe the same methodology and temporal period; index 3 uses an abbreviated form of the standard referenced in index 0"
    },
    {
      "scopeIndices": [1],
      "canonicalIndex": 1,
      "rationale": "No equivalent scope found"
    },
    {
      "scopeIndices": [2, 5, 7],
      "canonicalIndex": 2,
      "rationale": "All three reference the same geographic region and measurement framework; indices 5 and 7 use shorthand notation"
    },
    {
      "scopeIndices": [4, 6],
      "canonicalIndex": 4,
      "rationale": "Same temporal range expressed in different date formats; index 4 has more complete boundaries description"
    }
  ]
}
```

**Constraints:**
- Every scope index from the input (0 to N-1) must appear in exactly one group.
- `canonicalIndex` must be a member of the group's `scopeIndices`.
- Do not create new or synthetic scopes — the canonical must be an existing input scope.

---
