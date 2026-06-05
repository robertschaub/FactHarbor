# AtomicClaim-Level Reference Data Model

**Date:** 2026-06-06
**Role:** Lead Developer
**Status:** Captain-review ready draft. Consolidated from Claude Opus + Gemini methodology review, then revised after second-pass GO-after-fixes review.
**Related plan:** `Docs/WIP/2026-06-04_Report_Quality_Measurement_Implementation_Plan.md`

## 1. Why this exists

The current report-quality plan intentionally treats gold reference as available only at aggregate C4: overall verdict label, truth band, and confidence band. That is too weak for hard inputs where Captain preference is not a sufficient reference standard and where a report can hit the aggregate band while extracting or judging the wrong underlying propositions.

The correction is to define reference data closer to the pipeline's analytical unit: `AtomicClaim`.

Important limit: the reference unit must not be a strict expected list of pipeline `AtomicClaim` strings. Stage 1 decomposition is allowed to vary across runs, prompt versions, and languages. A valid report may split one reference proposition into two claims, or combine two propositions into one claim, while preserving the same meaning. Strict 1:1 claim matching would create false precision and punish defensible ambiguity handling.

## 2. Source-grounded constraints

- Pipeline `AtomicClaim` is a single verifiable assertion with fields such as `statement`, `category`, `verifiability`, `freshnessRequirement`, `centrality`, `harmPotential`, `claimDirection`, `thesisRelevance`, entities/geographies, and `expectedEvidenceProfile` (`apps/web/src/lib/analyzer/types.ts:840`).
- Stage 1 persists `CBClaimUnderstanding.atomicClaims[]`, `distinctEvents`, `preFilterAtomicClaims`, and Gate 1 reasoning (`apps/web/src/lib/analyzer/types.ts:1207`).
- Per-claim verdicts are linked to extracted claims through `CBClaimVerdict.claimId`, with truth percentage, 7-point verdict, confidence, evidence IDs, boundary findings, consistency, and misleadingness (`apps/web/src/lib/analyzer/types.ts:1043`).
- Current benchmark expectations are family-level: expected verdict labels, truth/confidence bands, minimum boundary/event counts, anchor tokens, status notes, latest observations (`Docs/AGENTS/benchmark-expectations.json:13`).
- Current report-quality Q-codes use claim/event floors and anchor survival, not source-grounded per-AtomicClaim gold (`Docs/AGENTS/report-quality-expectations.json:74`, `Docs/AGENTS/report-quality-expectations.json:86`).
- FactHarbor rules forbid deterministic semantic matching or keyword adjudication for analytical meaning. Alignment between report claims and reference assertions must be manual or LLM-adjudicated with structural validation.

## 3. Decision

Adopt AtomicClaim-level reference data with limits:

1. The reference layer defines **source-grounded reference assertions / core propositions**, not expected pipeline claim IDs or exact claim strings.
2. Ambiguous inputs can have one or more **interpretation frames**.
3. Each frame has required, optional, tolerated-context, and forbidden reference assertions.
4. v0.1 does **not** pre-register strict admissible extraction topologies. The scorer should judge collective assertion coverage across the report's extracted claims. Topology constraints can be added later only if the pilot proves role-based assertion coverage is too permissive.
5. A report passes extraction alignment if its extracted claims collectively cover the required reference assertions for at least one admissible frame, do not introduce forbidden propositions, and satisfy the frame's ambiguity policy.
6. Reference dossiers are the authority. `benchmark-expectations.json` remains the compact scoring contract and points to dossier IDs/versions.

This changes the reference gradient:

- Before dossiers exist: C1/C2/C3 remain structural + stability + judge.
- For families with approved dossiers: C1 can be scored for semantic coverage, and C3 can be checked against per-reference-assertion verdict bands through N:M alignment.
- C4 remains the aggregate gold layer and the first build-ranking signal until the AtomicClaim reference process is validated.

## 4. Data model

Store heavy reference material in separate versioned dossier files, not inline in `benchmark-expectations.json`.

Suggested folder:

```text
Docs/AGENTS/Reference_Dossiers/
```

Suggested compact benchmark link:

```json
{
  "slug": "plastic-recycling-pointless",
  "referenceDossier": {
    "id": "plastic-recycling-pointless",
    "version": "0.1.0",
    "status": "draft | source_grounded | independently_reviewed | adjudicated_gold",
    "path": "Docs/AGENTS/Reference_Dossiers/plastic-recycling-pointless.v0.1.json"
  }
}
```

Suggested dossier shape:

```json
{
  "id": "plastic-recycling-pointless",
  "version": "0.1.0",
  "inputSlug": "plastic-recycling-pointless",
  "captainInputValue": "Plastic recycling is pointless",
  "language": "en",
  "status": "draft",
  "curation": {
    "curator": null,
    "adjudicator": null,
    "peerReviewer": null,
    "createdAt": null,
    "lastRevalidatedAt": null,
    "revalidateAfter": null,
    "roleSeparationMode": "human_split | human_plus_agents | multi_agent_draft"
  },
  "sourceSnapshots": [
    {
      "id": "SRC_001",
      "url": null,
      "archiveUrl": null,
      "localPath": null,
      "localHash": null,
      "retrievedAt": null,
      "sourceType": null,
      "notes": null
    }
  ],
  "interpretationFrames": [
    {
      "id": "FRAME_reasonable_meaning",
      "label": "reasonable fact-checking reading",
      "admissibility": "defensible",
      "admissibilityRationale": null,
      "ambiguityPolicy": "must_disclose",
      "referenceAssertions": [
        {
          "id": "RA_001",
          "text": null,
          "role": "required | optional | tolerated_context | forbidden",
          "kind": "factual | evaluative | procedural",
          "truthBand": { "min": null, "max": null },
          "confidenceBand": { "min": null, "max": null },
          "acceptedVerdictLabels": [],
          "freshnessRequirement": "current_snapshot | recent | none",
          "relevantGeographies": [],
          "evidenceSourceIds": [],
          "knownCounterEvidenceSourceIds": [],
          "harmfulMissCondition": {
            "description": null,
            "severity": "high | medium | low"
          },
          "contested": false,
          "notes": null
        }
      ]
    }
  ],
  "benchmarkCoherence": {
    "familyTruthBand": { "min": null, "max": null },
    "familyConfidenceBand": { "min": null, "max": null },
    "coherenceNote": null
  }
}
```

Rules:

- If an input has two or more interpretation frames, default `ambiguityPolicy` is `must_disclose`. `commit_allowed` requires explicit curator/adjudicator rationale. `must_cover_all` is reserved for compound inputs where the frames are not alternatives but separate required dimensions.
- `acceptedVerdictLabels` and `truthBand` must be checked for 7-point-scale consistency during dossier validation. Store both, but reject inconsistent combinations unless the dossier explains why.
- `required` plus `contested: true` is allowed only as a provisional state. It is not a hard scoring requirement until adjudication resolves it or widens the band.
- Any dossier band change must reconcile with the family-level band in `benchmark-expectations.json`; any benchmark band change must cite the dossier version that justifies it. Legacy scorer behavior continues to use `benchmark-expectations.json` until the dossier link is wired.

## 5. Research and adjudication workflow

Phase 0b should run before any additional live validation spend.

1. **Freeze the input.** Use only Captain-defined input wording. The input remains byte-exact.
2. **Independent source discovery.** One researcher builds a source matrix with primary sources preferred, secondary sources only as context. Every source used for reference judgment must have retrieval date and archive/local hash where feasible.
3. **Independent assertion drafting.** A curator drafts interpretation frames, reference assertions, evidence links, and ambiguity policy.
4. **Adjudication split.** A different adjudicator assigns verdict/truth/confidence bands to each reference assertion using the source snapshots.
5. **Adversarial review.** A reviewer challenges omitted interpretations, missing counter-evidence, weak source choices, and over-precise bands.
6. **Contestation handling.** Assertions with material disagreement become `contested: true`; they are excluded from hard scoring or scored with widened bands until resolved.
7. **Versioning.** Any source change, assertion change, or band change bumps the dossier version and records the delta.
8. **Revalidation.** Time-sensitive dossiers carry `revalidateAfter`. Stable historical/procedural dossiers can have longer review windows.

Role separation policy:

- `draft`: may be one human or one agent.
- `source_grounded`: requires separate curator and adjudicator passes. Distinct model families may satisfy this for draft work, but the dossier must say `roleSeparationMode: multi_agent_draft`.
- `independently_reviewed`: requires at least one independent reviewer not used as curator/adjudicator; a different model family is acceptable for pilot discussion.
- `adjudicated_gold`: requires human Captain acceptance after the independent challenge is visible. Agents can support but cannot be the sole authority.

## 6. Scoring implications

### C1 extraction alignment

For a report, compare `CBClaimUnderstanding.atomicClaims[]` against the dossier:

- Human or LLM judge selects the best-fitting interpretation frame.
- Output is a structured mapping matrix: report AtomicClaim(s) -> reference assertion(s), with `addressed | partial | not_addressed | contradicted | tolerated_context | unsupported_extra`.
- Full C1 semantic credit requires required assertions covered for one admissible frame, no forbidden assertions, and no unsupported direct proposition that changes the input's meaning.
- Factual, harmless context is not penalized merely because it was not pre-listed. It is either mapped to `tolerated_context` or ignored as colour.
- Ambiguous inputs use `ambiguityPolicy`:
  - `commit_allowed`: report may choose one defensible frame, with dossier rationale.
  - `must_disclose`: report may choose a frame but must disclose the competing reading.
  - `must_cover_all`: report must cover all listed frames.
- If no frame admits the report, Phase 0b marks `needs_human_review`. Once the method is approved, high-confidence no-frame outcomes become zero C1 semantic coverage plus a finding; they still should not silently rewrite C4.

Frame selection rule:

- Score under the best admissible frame for the report.
- If two frames tie and the input has `must_disclose`, the report must show awareness of the competing frame to get full semantic-alignment credit.

### C3 per-claim verdict reference

After alignment, the scorer can evaluate each mapped report verdict against the reference assertion:

- truth percentage within the assertion band;
- verdict label in accepted labels;
- confidence within band;
- evidence IDs linked to source-grounded support/opposition;
- harmful-error penalty if a report is confidently wrong on a required assertion.

Evidence-source join rule:

- First use structural URL equality after canonicalization, source IDs if persisted, archive URL equality, or local snapshot hash equality.
- If structural matching fails but the report evidence appears source-equivalent, use the same LLM/human adjudication path as claim alignment.
- If the join is unresolved, evidence-specific credit is `unverified`, not an automatic fail. Truth/verdict alignment can still be scored separately.

This is not a replacement for C4. C4 remains the aggregate gold check. AtomicClaim references explain where the aggregate score came from and catch false aggregate passes.

### Build comparison

AtomicClaim reference metrics should start as gated diagnostic/tie-break signals until the Phase 0b pilot proves alignment-judge stability. They should not replace C4 ranking until:

- alignment judge agreement is measured;
- human spot-checks show acceptable false-positive/false-negative rates;
- the dossier is at least `independently_reviewed`;
- source snapshots are stable.

## 7. Alignment judge requirements

Do not use deterministic string or keyword matching for semantic alignment.

Minimum requirements:

- judge prompt receives the byte-exact input, one dossier frame at a time, reference assertions, and report AtomicClaims;
- output must be strict JSON with claim IDs and reference assertion IDs only;
- structural validation verifies IDs exist, every required assertion has a status, and every report direct claim is either mapped or marked extra/context;
- use a model family different from the report generator where possible;
- record judge metadata in the score artifact: prompt version, model, run ID, dossier version, report job ID, and scorer version;
- use separate prompts or reviewer passes for C1 extraction coverage and C3 verdict correctness, or explicitly record the coupling as a known limitation;
- low-confidence judge outputs become `needs_human_review`, not auto-fail.

Pilot acceptance threshold:

- LLM alignment judge must reach at least 85% agreement with manual mapping on the pilot sample before dossier-based C1/C3 metrics become more than colour/tie-break diagnostics.
- If sample size supports it, also report Cohen's kappa; kappa below 0.70 is a warning and below 0.60 is a no-go for scaling.

Cost rule:

- Phase 0b remains zero-spend until Captain explicitly approves an alignment-judge pilot budget.
- Proposed initial cap: USD 10 for one dossier and a small stored-report sample. Stop early if the first sample shows unstable mapping.

## 8. Phase 0b pilot

Start small. Do not attempt full benchmark conversion first.

Recommended pilot set:

1. `Plastic recycling is pointless` - ambiguous and interpretation-laden.
2. `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben` - procedural/legal semantics and anchor sensitivity.
3. One Bolsonaro input - legally complex, high-risk, likely to expose source/adjudication disagreement.

Pilot tasks:

1. Create the dossier template.
2. Produce one full dossier and one partial dossier.
3. Run alignment manually on historical stored reports first.
4. If manual alignment is coherent and Captain approves the cap, test an LLM alignment judge on a small stored-report sample.
5. Record judge agreement and failure modes.
6. Only then decide whether to wire dossier links into `benchmark-expectations.json`.

## 9. Red lines

- No strict 1:1 expected AtomicClaim list.
- No keyword, regex, or substring scoring for semantic alignment.
- No live-source-only references; source decay must be controlled with archives or local hashes.
- No single-person source-selection-plus-adjudication for gold status.
- No scoring of subjective pipeline fields such as `checkWorthiness` or exact `centrality` against gold.
- No teaching-to-test prompt changes based on dossier wording.
- No hidden update of benchmark bands without dossier version bump.
- No LLM judge spend without an explicit Captain-approved cap.

## 10. Recommended plan change

Add **Phase 0b - Reference Dossiers** between current Phase 0 and Phase 1b/live validation.

Phase 1 zero-spend scorer can still run with the existing aggregate bands. But before spending on live build comparison or treating benchmark bands as Captain-grade gold, create AtomicClaim-level reference dossiers for the hard inputs and validate the alignment process.

The current implementation plan should be amended from:

> gold exists only at C4

to:

> aggregate gold exists at C4 by default; deeper AtomicClaim-level gold exists only for families with independently reviewed reference dossiers, and is scored through N:M semantic alignment rather than strict claim-string matching.
