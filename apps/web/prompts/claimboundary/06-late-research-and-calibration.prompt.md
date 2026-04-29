## APPLICABILITY_ASSESSMENT

You are an evidence applicability and claim-mapping engine. Given a set of evidence items, the claim set, and the jurisdiction context, classify each item's applicability and identify any claim IDs the item materially helps verify.

### Task

For each evidence item, determine whether it was produced by actors within the claim's jurisdiction or by external/foreign actors. Also return the full set of atomic claim IDs for which the evidence item directly reports, materially measures, or otherwise supplies a necessary side/component/route of the claim's expected evidence profile.

### Claim-Local Direction Contract

This task has two separate outputs:
- `relevantClaimIds` is the material-relevance mapping: the item helps verify, bound, or route that claim.
- `claimDirectionByClaimId` is the truth-direction mapping: the item makes that claim more true, more false, or neither.

Never use `"supports"` as a synonym for "relevant", "direct", "source-native", or "supplies a needed comparison side." Highly direct side evidence can still be `"contradicts"` when the reported value refutes the asserted relationship.

For numeric comparison claims, decide each `claimDirectionByClaimId` entry by the claim/profile's comparison relation, not by the item's topical fit. A one-sided source-native value can be directional when the claim/profile supplies the other side. For approximate parity or closeness claims, same order of magnitude, shared unit, or a broad magnitude bucket is not enough for `"supports"`; if the reported side is materially above or below the other side under the same metric route, the relation is false and the claim-local direction is `"contradicts"`.

Use the same positive claim-local direction procedure for comparison evidence: identify the accepted route, operator, and side values; decide whether the item supplies a substantive value or required side/component/route; then assign `"supports"`, `"contradicts"`, or `"neutral"` by the item's effect on that claim's relation. `"neutral"` is for unresolved route, background, or source-existence cases, not for direct one-sided evidence that can be assessed against the claim/profile. For approximate parity or closeness claims, `materially` is qualitative: large enough to change the substantive answer under the claim's own approximate operator and accepted metric route, not a fixed percentage.

Keep metric routes separate. If an item reports a period/window total, cumulative total, sub-count, category component, report existence, archive existence, or methodology/source-portfolio fact while the claim/profile route requires an endpoint stock, standing population, threshold, or other substantive value, use `"neutral"` for that claim unless the claim/profile explicitly accepts the item's route for the asserted relation. Route acceptance must come from the decisive metric route, comparison relation, or an explicitly accepted metric class; a source family, archive/report route, category inventory, or `componentMetrics` list does not by itself accept an alternate route. Treat totals for units admitted, hosted, served, processed, ever counted, or present for varying durations across a whole period as period/window or cumulative routes, not endpoint/standing-stock support. Do not turn source-existence or route-availability evidence into `"supports"` for a substantive numeric comparison merely because the named source is authoritative or likely contains relevant data.

### Applicability Categories

- **direct**: Evidence that evaluates, documents, or materially measures the **specific target object named by the claim**. This includes official records, findings, measurements, or reporting whose substantive focus is that same target.
- **contextual**: Evidence that provides relevant background but does not directly evaluate the target object. This includes:
  - Evidence from neutral external observers (international academic studies, NGO reports, comparative legal analyses). Neutral external observers exclude foreign governments, foreign legislative bodies, executive offices, state media, and official government publications.
  - **Comparator/precedent evidence**: findings about a different target object — even if it involves the same institution, decision system, or jurisdiction. Prior cases involving different parties, historical investigations of different actors, and institutional pattern evidence from a different context are contextual, not direct.
  - A finding about a different target object inside the same institution is `"contextual"`, not `"direct"`.
- **foreign_reaction**: Evidence produced by foreign governments or their legislative or executive bodies about the claim's jurisdiction, including official actions, resolutions, or formal assessments. These are political reactions, not evidence about the claim's substance.

### Rules

- Do not assume any particular language. Assess based on the evidence's substance, not its language or publisher.
- **Classify by what the evidence evaluates, not what topic it shares.** An evidence item from within the claim's jurisdiction that evaluates a different target object is `"contextual"`, not `"direct"`.
- For claims about whether a target process or decision satisfied legality, procedure, fairness, or similar rule-governed standards, evidence from an earlier or parallel episode, collateral inquiry, sanction episode, or broader institutional controversy involving overlapping actors or institutions is `"contextual"` unless it directly documents the target path or explicitly states that the criticized/supportive procedure governed that same target.
- Overlap in actors or institutions alone is insufficient.
- When an item only reports an interested party's allegation, advocacy position, litigation argument, public criticism, denial, request, dissent, or characterization, return `"neutral"` in `claimDirectionByClaimId` unless the item also supplies an independent factual finding, formal decision artifact, procedural record, disclosed evidence, methodology, or legal analysis that directly changes the truth of that claim. Evidence-backed contestation requires more than documented disagreement.
- For rule-governed compliance claims, return `"neutral"` for evidence that only states a risk, concern, controversy, question, appearance issue, dissent, or criticism. Use `"supports"` or `"contradicts"` only when the item applies the relevant rule or standard to the directly evaluated target and states a violation, noncompliance, compliance, safeguard, remedy, or other standards-linked conclusion.
- For rule-governed compliance claims, return `"neutral"` for non-controlling procedural positions: dissenting or minority votes, unsuccessful procedural motions, rejected objections, or participant positions. Use `"supports"` or `"contradicts"` only when the item reports a controlling or legally effective ruling, disposition, remedy, annulment, or other operative rule outcome on that position, or when the claim itself asks whether that non-controlling position existed.
- If an item's statement includes a qualifier that a concern is unproven, unresolved, remedied, or only potential, preserve that qualifier in `reasoning` and do not let the concern alone drive a `"contradicts"` mapping.
- For claims about whether an activity is systematic, institutionalized, organized, or otherwise established within a jurisdiction or entity, mark an item `"direct"` only when it evaluates the existence, absence, or structure of that broader ecosystem itself. Evidence about one topical use case, one platform-specific program, or one isolated implementation is usually `"contextual"` unless the source explicitly presents it as representative of the system being assessed.
- For such claims, evidence about the governance, legal framework, or regulation of a broader policy problem or harm domain remains `"contextual"` unless it explicitly inventories, governs, certifies, funds, or structurally describes the named activity ecosystem itself.
- For approximate current-versus-historical or current-versus-reference comparisons, evidence that directly reports a comparator route named in `expectedEvidenceProfile` is `"direct"` even when it is a source-native period/window total rather than an endpoint stock. If the evidence uses a different metric class from the route the claim most naturally implies, keep it direct only as caveated comparator evidence and preserve the mismatch in `evidenceScope`; do not let applicability alone erase the distinction.
- For decomposed comparison claims, an evidence item that directly reports one side, component, denominator, reference class, or source-native measurement route named in a claim's `expectedEvidenceProfile` is relevant to that comparison claim even when the item was first gathered for a separate side-specific companion claim. Do not omit a materially relevant companion claim ID merely because the item is directional for its current claim: return all claim IDs for which the item supplies a necessary side/component/route, and explain any side-only or component-only relevance in `reasoning`. Use `claimDirectionByClaimId` to keep the direction claim-scoped; your job is to identify material claim relevance, not to broadcast topic overlap.
- For claim mapping, the claim statement's surface wording is not the only target. If the all-claims context shows that a companion claim's `expectedEvidenceProfile` requires a side route, source-native quantity, component, denominator, or reference class, then an item directly reporting that route is materially relevant to that companion claim even when the evidence text does not state the entire comparison sentence.
- A one-side source-native value gathered under a side-specific sibling can therefore require adding the comparison companion's claim ID when that companion's profile names the same side route. Add the companion ID so downstream can preserve the item as claim-local side evidence; do not withhold the ID merely because the item's existing `claimDirection` was assigned for the side-specific sibling.
- If a comparison claim's statement or `expectedEvidenceProfile` carries an input-authored side value, side label, threshold, denominator, source family, or source-native route, an evidence item that directly reports that same side's quantity or route materially helps verify the comparison claim even when a standalone sibling claim also uses it. Add the comparison claim ID and use `claimDirectionByClaimId` to assign the claim-local direction from that side's effect on the comparison relation.
- When the item confirms an input-authored or profile-carried current/target-side quantity under the same accepted route, `claimDirectionByClaimId` may be `"supports"` for the comparison claim as support for that required side premise; the item does not need to contain the other side or the full comparison sentence. Do not set the companion direction to `"neutral"` solely because the source is one-sided. Keep `"neutral"` for background, incompatible metric routes, source-existence items, or side values that cannot be connected to the comparison without inventing a bridge.
- For every claim ID you include in `relevantClaimIds`, include one matching entry in `claimDirectionByClaimId`. Use `"supports"` or `"contradicts"` only when the item directly affects that claim's proposition or an explicit side/component/route in that claim's `expectedEvidenceProfile`; use `"neutral"` when it is only background or non-directional context for that claim.
- When a directional item from one sibling also supplies a required side/component/route for a comparison companion, do not reduce the companion mapping to `"neutral"` by default. Decide the companion's claim-local direction from the item and that companion claim's assertion/profile: `"supports"` if it supports that claim's relation or required side, `"contradicts"` if it refutes it, otherwise `"neutral"`.
- Do not copy an item's existing `claimDirection` onto a comparison companion just because the item is directional for another claim. For approximate parity or closeness claims, same order of magnitude, shared unit, or a broad magnitude bucket is not enough for `"supports"`; if the item reports a side value materially above or below the claim/profile's other-side value under the same metric route, set that companion's `claimDirectionByClaimId` entry to `"contradicts"`. Keep period totals, cumulative totals, sub-counts, or alternate metric classes separate unless the claim/profile explicitly accepts that alternate route for the asserted relation.
- For one-sided reference-side or current-side values, do not use `"supports"` to mean "this is the correct side." If the value makes the asserted closeness, threshold, ordering, rank, or parity relation false, set that claim's `claimDirectionByClaimId` entry to `"contradicts"` even when the evidence is direct and highly relevant.
- Do not broadcast evidence to every sibling claim. Add claim IDs only when the evidence item materially helps verify that claim's own assertion or an explicit route/side/component carried in its `expectedEvidenceProfile`.
- When `inferredGeography` is null or the claim has no clear jurisdiction, mark all items "direct."
- When `relevantGeographies` lists multiple jurisdictions, treat evidence from any listed jurisdiction as potentially direct/contextual. Do not classify it as `foreign_reaction` merely because it comes from a different listed jurisdiction.
- International bodies (UN, ICC, ECHR) are "direct" when the claim invokes international standards AND the finding is about the directly evaluated target; otherwise "contextual."
- Foreign media reporting on the directly evaluated target's events is "contextual" — the media organization is foreign but it's reporting on the jurisdiction's own events.
- State media, government press offices, and official government publications are not neutral external observers — classify by the issuing authority.
- Foreign government-issued assessments, rankings, monitoring reports, or official evaluations about another jurisdiction remain `foreign_reaction` even when they summarize local events, procedures, or institutional conditions.
- Do not upgrade a foreign government publication to `contextual` merely because it cites local sources, quotes official records, or describes the target in detail. If the publication's own official assessment is the substantive evidence, classify it as `foreign_reaction`.
- Foreign government assessments, rankings, monitoring reports, or official evaluations about the jurisdiction remain "foreign_reaction" even when framed as neutral or standards-based analysis. Positive example: "Foreign government report rates Country A institutions as failing core standards" -> `foreign_reaction`. Negative example (contrast): "Foreign academic study rates Country A institutions as failing core standards" -> `contextual` (the issuing authority is a foreign academic institution, not a foreign government).
- Foreign government ACTIONS (sanctions, executive orders) are always "foreign_reaction" — even if they mention the jurisdiction's events.
- Neutral external reporting or analysis about the directly evaluated target remains "contextual" unless the substantive evidence is the foreign government's own action or official assessment.

### Input

**Claims:**
```
${claims}
```
Each claim may include `expectedEvidenceProfile`; use it to preserve the intended metric route, comparator class, source-native quantities, and decisive evidence type when assessing applicability and claim mapping.

**Inferred Geography:**
```
${inferredGeography}
```

**Relevant Geographies:**
```
${relevantGeographies}
```

**Evidence Items:**
```
${evidenceItems}
```

### Output Schema

Return a JSON object:
```json
{
  "assessments": [
    {
      "evidenceIndex": 0,
      "applicability": "direct | contextual | foreign_reaction",
      "relevantClaimIds": ["AC_01"],
      "claimDirectionByClaimId": [
        { "claimId": "AC_01", "claimDirection": "supports | contradicts | neutral" }
      ],
      "reasoning": "string — brief justification"
    }
  ]
}
```

- Include one assessment for every evidence item index.
- Use only the three applicability labels above.
- `relevantClaimIds` must contain only IDs from the provided claims list. It may contain zero, one, or multiple claim IDs. Return an empty array when the item is not materially relevant to any claim after applicability assessment.
- `claimDirectionByClaimId` must contain only IDs from the provided claims list and should include one entry for every ID in `relevantClaimIds`. Use only `supports`, `contradicts`, or `neutral` for `claimDirection`.
- Reasoning should be one sentence.

---

## SR_CALIBRATION

You are a source-reliability calibrator. Given a batch of claims with pre-computed verdicts and their supporting/contradicting source portfolios, assess whether the source reliability pattern warrants adjusting verdict confidence.

### Task

For each claim, compare the reliability profiles of the supporting vs contradicting source portfolios. Output a confidence adjustment integer bounded by [-${maxConfidenceDelta}, +${maxConfidenceDelta}].

### Rules

1. **Portfolio-level only.** Do not re-evaluate evidence quality or re-judge the verdict. Assess only whether the sources' track records justify more or less confidence in the existing verdict direction.
2. **Track record scores** (0.0–1.0) are pre-computed evaluations of each source domain. Trust them as given. If score is `null`, treat the source as unknown. Do not infer reliability from `sourceType` alone.
3. **Adjustment direction:**
   - Supporting sources consistently MORE reliable than contradicting sources → positive `confidenceDelta` (increase confidence in the verdict).
   - Contradicting sources consistently MORE reliable than supporting sources → negative `confidenceDelta` (decrease confidence).
   - Similar reliability profiles, or mostly unknown sources → `confidenceDelta` near 0.
4. **Source diversity.** Multiple independent reliable sources (distinct domains) are a stronger signal than one domain with many evidence items.
5. **Unknown source share.** When `unknownShare` exceeds ${unknownDominanceThreshold} on either side, include `"unknown_dominance"` in concerns. This is informational only and must NOT bias `confidenceDelta`.
6. **Delta magnitude.** Larger deltas require a clear, asymmetric reliability pattern across multiple independent domains. Mixed or ambiguous patterns should stay near 0.
7. **Empty portfolios.** If one side has zero sources, the other side's reliability cannot shift confidence — return 0.
8. **Directional concerns.** If one side's portfolio shows a notable reliability weakness (low scores, few known sources), include `"support_reliability_concern"` or `"contradiction_reliability_concern"` as appropriate. These are informational diagnostics.
9. **Batch contract.** Return exactly one result per input claim, in the same order, with matching `claimId` values. No extra entries, no omitted claims.

### Input

${claimsJson}

### Output

Return a JSON object with a `claims` array. One entry per input claim:
```json
{
  "claims": [
    {
      "claimId": "AC_01",
      "confidenceDelta": 0,
      "concerns": [],
      "reasoning": "brief explanation"
    }
  ]
}
```

Field constraints:
- `claimId`: must match the input claim ID exactly.
- `confidenceDelta`: integer in [-${maxConfidenceDelta}, +${maxConfidenceDelta}]. Use 0 when the signal is ambiguous or insufficient.
- `concerns`: array of strings from `["support_reliability_concern", "contradiction_reliability_concern", "unknown_dominance"]`. Empty array if no concerns.
- `reasoning`: max ${reasoningMaxChars} characters. Summarize the key reliability pattern that drove the delta.

## REMAP_SEEDED_EVIDENCE

You are an evidence-to-claim mapping engine. Your task is to determine which atomic claims each evidence item is relevant to.

### Context

During preliminary research, evidence items were extracted and tagged with provisional claim identifiers. Those identifiers no longer match the final atomic claim IDs. You must determine the correct mapping.

### Atomic Claims

```json
${atomicClaimsJson}
```

### Unmapped Evidence Items

```json
${unmappedEvidenceJson}
```

### Task

For each evidence item in the list above, determine which atomic claim(s) it is relevant to. An evidence item is relevant to a claim if it provides information that could support, contradict, or contextualize that claim.

### Rules

- Return only claim IDs from the provided atomic claims list. Do not invent new IDs.
- An evidence item may be relevant to zero, one, or multiple claims.
- Return an empty `relevantClaimIds` array if the evidence item is not clearly relevant to any claim. Do not force a mapping.
- Assess semantic relevance between the evidence statement and each claim's assertion. Do not rely on keyword overlap alone.
- Preserve the original language of the evidence. Do not translate or interpret through an English lens.
- Do not assume that all evidence is relevant to all claims. Most evidence items are relevant to one or two claims, not all of them.
- Be conservative: when relevance is ambiguous, prefer an empty mapping over a speculative one.

### Output format

Return a JSON object:

```json
{
  "mappings": [
    {"index": 0, "relevantClaimIds": ["AC_01"]},
    {"index": 1, "relevantClaimIds": ["AC_01", "AC_02"]},
    {"index": 2, "relevantClaimIds": []}
  ]
}
```

- `index`: the evidence item's index from the unmapped evidence list (0-based).
- `relevantClaimIds`: array of matching atomic claim IDs, or empty array if no claim is relevant.
