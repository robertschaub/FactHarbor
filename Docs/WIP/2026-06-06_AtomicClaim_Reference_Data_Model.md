# AtomicClaim-Level Reference Data Model

**Date:** 2026-06-06
**Role:** Lead Developer
**Status:** Captain-review ready after focused diverse debate. Claude Opus and Gemini debated the user's correction that clear atomicity and ambiguous term interpretation are separate problems; this version incorporates the reconciled decision.
**Related plan:** `Docs/WIP/2026-06-04_Report_Quality_Measurement_Implementation_Plan.md`

## 1. Why this exists

The current report-quality plan intentionally treats gold reference as available only at aggregate C4: overall verdict label, truth band, and confidence band. That is too weak for hard inputs where Captain preference is not a sufficient reference standard and where a report can hit the aggregate band while extracting or judging the wrong underlying propositions.

The correction is to define source-grounded reference data at the pipeline's analytical unit: `AtomicClaim`.

The focused debate resolved one important correction: this is **not mainly about arbitrary claim-count variance**. For many inputs, the number of distinct truth conditions can be determined clearly. The more common hard problem is **term/frame interpretation**: words or concepts such as "pointless" or "rechtskräftig" can support multiple defensible readings. The reference system therefore needs two first-class contracts:

1. **Interpretation-frame contract** - what ambiguous term, phrase, or legal/procedural concept means under each defensible reading; when the report may commit to one frame; when it must disclose alternatives; when it must cover all frames.
2. **Atomicity/separability contract** - within a chosen frame, which truth conditions are clearly distinct and must remain independently assessable.

N:M alignment remains allowed, but only as a guard for occasional wording or split/combine differences. It is not a license to hide, merge away, or ignore clearly distinct AtomicClaims.

## 2. Source-grounded constraints

- Pipeline `AtomicClaim` is a single verifiable assertion with fields such as `statement`, `category`, `verifiability`, `freshnessRequirement`, `centrality`, `harmPotential`, `claimDirection`, `thesisRelevance`, entities/geographies, and `expectedEvidenceProfile` (`apps/web/src/lib/analyzer/types.ts:840`).
- Stage 1 persists `CBClaimUnderstanding.atomicClaims[]`, `distinctEvents`, `preFilterAtomicClaims`, and Gate 1 reasoning (`apps/web/src/lib/analyzer/types.ts:1207`).
- Per-claim verdicts are linked to extracted claims through `CBClaimVerdict.claimId`, with truth percentage, 7-point verdict, confidence, evidence IDs, boundary findings, consistency, and misleadingness (`apps/web/src/lib/analyzer/types.ts:1043`).
- The Claim Clarification design already separates `single_analyzable`, `multiple_plausible`, `materially_ambiguous`, and `bundled_assertions` as clarification reasons. That is the right forward contract for ambiguous inputs; current stored historical reports may not have this state.
- Current benchmark expectations are family-level: expected verdict labels, truth/confidence bands, minimum boundary/event counts, anchor tokens, status notes, latest observations (`Docs/AGENTS/benchmark-expectations.json:13`).
- Current report-quality Q-codes use claim/event floors and anchor survival, not source-grounded per-AtomicClaim gold (`Docs/AGENTS/report-quality-expectations.json:74`, `Docs/AGENTS/report-quality-expectations.json:86`).
- FactHarbor rules forbid deterministic semantic matching or keyword adjudication for analytical meaning. Alignment between report claims and reference assertions must be manual or LLM-adjudicated with structural validation.

## 3. Debate Decision

Adopt AtomicClaim-level reference dossiers with **frame-scoped atomicity**:

1. The reference layer defines source-grounded reference assertions / core propositions, not expected pipeline claim IDs or exact claim strings.
2. Ambiguous terms, phrases, or legal/procedural concepts are represented as interpretation frames.
3. Each interpretation frame carries an `atomicityProfile` that says whether the frame's truth-condition count is determinable, partially determinable, or indeterminable.
4. When a frame's atomicity is determinable, the report must make every distinct truth condition independently assessable, even if the report phrases several in one extracted claim.
5. v0.1 does not pre-register exact claim strings or exact claim counts. It does pre-register distinct truth conditions where determinable.
6. Reference dossiers are the authority. `benchmark-expectations.json` remains the compact scoring contract and points to dossier IDs/versions.

This changes the reference gradient:

- Before dossiers exist: C1/C2/C3 remain structural + stability + judge.
- For families with approved dossiers: C1 can be scored for frame choice, assertion coverage, atomicity fidelity, and ambiguity disclosure; C3 can be checked against per-reference-assertion verdict bands after alignment.
- C4 remains the aggregate gold layer and the first build-ranking signal until the dossier method is validated.

## 4. Data Model

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
  "expectedClarificationReason": "single_analyzable | multiple_plausible | materially_ambiguous | bundled_assertions",
  "ambiguityPolicy": "commit_allowed | must_disclose | must_cover_all",
  "atomicityPolicy": {
    "globalDeterminability": "determinable | mixed | indeterminable",
    "mergePolicy": "must_keep_separate | merge_with_independent_assessability | merge_allowed",
    "policyRationale": null
  },
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
      "interpretedTermOrFrame": "pointless",
      "interpretationDefinition": null,
      "admissibility": "defensible",
      "admissibilityRationale": null,
      "ambiguityPolicy": null,
      "atomicityProfile": {
        "determinability": "determinable | partial | indeterminable",
        "determinabilityRationale": null,
        "distinctTruthConditions": [
          {
            "id": "TC_001",
            "description": null,
            "coversReferenceAssertionIds": ["RA_001"],
            "independentAssessabilityRequired": true,
            "mergeAllowedWith": []
          }
        ]
      },
      "referenceAssertions": [
        {
          "id": "RA_001",
          "truthConditionId": "TC_001",
          "text": null,
          "role": "required | optional | tolerated_context | forbidden",
          "separability": "strict | flexible",
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

Pilot v0.1 required fields are intentionally narrower than the full schema: `expectedClarificationReason`, dossier `ambiguityPolicy`, frame label/definition, frame `atomicityProfile`, required reference assertions, truth/confidence bands, and source snapshots. Counter-evidence IDs and harmful-miss detail are useful but can remain sparse until the pilot proves the core alignment method.

Validation rules:

- If an input has two or more interpretation frames, default `ambiguityPolicy` is `must_disclose`. `commit_allowed` requires explicit curator/adjudicator rationale. `must_cover_all` is reserved for compound inputs where frames are not alternatives but separate required dimensions.
- Every required reference assertion belongs to exactly one truth condition.
- Every truth condition's `coversReferenceAssertionIds[]` resolves to assertions in the same frame.
- `separability: strict` requires an independently assessable truth condition.
- `acceptedVerdictLabels` and `truthBand` must be checked for 7-point-scale consistency. Store both, but reject inconsistent combinations unless the dossier explains why.
- `required` plus `contested: true` is allowed only as a provisional state. It is not a hard scoring requirement until adjudication resolves it or widens the band.
- Any dossier band change must reconcile with the family-level band in `benchmark-expectations.json`; any benchmark band change must cite the dossier version that justifies it. Legacy scorer behavior continues to use `benchmark-expectations.json` until the dossier link is wired.

## 5. Research and Adjudication Workflow

Phase 0b should run before any additional live validation spend.

1. **Freeze the input.** Use only Captain-defined input wording. The input remains byte-exact.
2. **Classify the reference problem.** Curator labels the family as primarily `clear_atomicity`, `interpretation_ambiguous`, `both`, or `indeterminate`.
3. **Independent source discovery.** One researcher builds a source matrix with primary sources preferred, secondary sources only as context. Every source used for reference judgment must have retrieval date and archive/local hash where feasible.
4. **Interpretation-frame drafting.** A curator identifies ambiguous terms/frames, defines admissible readings, sets `ambiguityPolicy`, and sets `expectedClarificationReason`.
5. **Atomicity drafting.** For each frame, the curator declares whether truth-condition count is determinable and lists `distinctTruthConditions` where determinable.
6. **Assertion drafting.** Curator links each required reference assertion to exactly one truth condition.
7. **Adjudication split.** A different adjudicator assigns verdict/truth/confidence bands to each reference assertion using the source snapshots.
8. **Adversarial review.** A reviewer challenges omitted interpretations, missing counter-evidence, weak source choices, over-precise bands, and any hidden merge of distinct truth conditions.
9. **Contestation handling.** Assertions with material disagreement become `contested: true`; they are excluded from hard scoring or scored with widened bands until resolved.
10. **Versioning.** Any source change, frame change, atomicity-profile change, assertion change, or band change bumps the dossier version and records the delta.
11. **Revalidation.** Time-sensitive dossiers carry `revalidateAfter`. Stable historical/procedural dossiers can have longer review windows.

Role separation policy:

- `draft`: may be one human or one agent.
- `source_grounded`: requires separate curator and adjudicator passes. Distinct model families may satisfy this for draft work, but the dossier must say `roleSeparationMode: multi_agent_draft`.
- `independently_reviewed`: requires at least one independent reviewer not used as curator/adjudicator; a different model family is acceptable for pilot discussion.
- `adjudicated_gold`: requires human Captain acceptance after the independent challenge is visible. Agents can support but cannot be the sole authority.

## 6. Scoring Implications

### Stage 1 clarification fit

When `ClarificationState` or equivalent forward telemetry exists, compare the report's Stage 1 clarification behavior against `expectedClarificationReason`:

- matching `single_analyzable`, `multiple_plausible`, `materially_ambiguous`, or `bundled_assertions` supports C1;
- a mismatch caps dossier-backed C1 semantic score until manually reviewed;
- historical reports without this field get `n/a`, not a fail.

This is forward-looking. It should not be backfilled by deterministic text heuristics.

### C1 extraction alignment

Use a sequential, per-frame scoring process:

1. **Frame admissibility.** Human or LLM judge identifies which interpretation frame the report actually pursued. Do not map assertions across all frames in one pass.
2. **Assertion coverage.** Map report AtomicClaims only to the active frame's reference assertions. Status values: `addressed | partial | not_addressed | contradicted | tolerated_context | unsupported_extra`.
3. **Atomicity fidelity.** If the active frame has `determinability = determinable` or `partial`, every strict truth condition must be independently assessable. A merged report claim can pass only if the separate truth conditions remain separately checkable through verdict/evidence/reasoning.
4. **Disclosure fidelity.** If dossier or frame `ambiguityPolicy = must_disclose`, the report must acknowledge the materially competing frame. If `must_cover_all`, it must cover all required frames.

Axis domains for Phase 0b:

- `clarificationFit`: 1.0 match, 0.5 uncertain/manual-review, 0.0 mismatch; historical reports without forward telemetry are `n/a`, not zero.
- `frameAdmissibility`: 1.0 active frame identified, 0.0 no admissible frame.
- `assertionCoverage`: required assertions addressed or partial, with partial scored 0.5, divided by total required assertions in the active frame; forbidden assertion present floors the active frame to 0.
- `atomicityFidelity`: strict truth conditions independently assessable divided by strict truth conditions required in the active frame. If determinability is `indeterminable`, this axis is waived as 1.0.
- `disclosureFidelity`: 1.0 if policy does not require disclosure or disclosure is present; 0.0 if `must_disclose` / `must_cover_all` is violated.

Per-frame C1:

```text
C1(frame) =
  clarificationFit cap
  × frameAdmissibility
  × min(assertionCoverage, atomicityFidelity, disclosureFidelity)
```

Report C1 uses the best admissible frame, but the score artifact must record the active frame, runner-up frame, and all four axis sub-scores. This makes misses diagnosable instead of hiding them in one scalar.

Factual, harmless context is not penalized merely because it was not pre-listed. It is mapped to `tolerated_context` or reported as colour. Forbidden assertions or unsupported direct propositions that change the input's meaning can floor C1 for the active frame.

If no frame admits the report, Phase 0b marks `needs_human_review`. Once the method is approved, high-confidence no-frame outcomes become zero C1 semantic coverage plus a finding; they still should not silently rewrite C4.

### C3 per-claim verdict reference

After C1 alignment, C3 checks mapped report verdicts only against the active frame's reference assertions:

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

- per-axis judge agreement is measured, not only aggregate C1 agreement;
- human spot-checks show acceptable false-positive/false-negative rates;
- the dossier is at least `independently_reviewed`;
- source snapshots are stable.

## 7. Alignment Judge Requirements

Do not use deterministic string or keyword matching for semantic alignment.

Minimum requirements:

- Use a two-pass sequence: first frame admissibility, then assertion mapping within the active frame.
- Elicit frame admissibility, assertion coverage, atomicity fidelity, and disclosure fidelity as separable judge outputs so per-axis agreement is measurable.
- Judge prompt receives the byte-exact input, dossier frame(s), reference assertions, truth conditions, and report AtomicClaims.
- Output must be strict JSON with claim IDs, frame IDs, truth-condition IDs, and reference assertion IDs only.
- Structural validation verifies IDs exist, every required assertion has a status, and every report direct claim is either mapped or marked extra/context.
- Use a model family different from the report generator where possible.
- Record judge metadata in the score artifact: prompt version, model, run ID, dossier version, report job ID, and scorer version.
- Use separate prompts or clearly separated prompt sections for C1 extraction coverage and C3 verdict correctness.
- Low-confidence judge outputs become `needs_human_review`, not auto-fail.

Pilot acceptance threshold:

- LLM alignment judge must reach at least 85% agreement with manual mapping on **each axis** before dossier-based C1/C3 metrics become more than colour/tie-break diagnostics.
- If sample size supports it, report Cohen's kappa per axis. Kappa below 0.70 is a warning; below 0.60 is a no-go for scaling.

Cost rule:

- Phase 0b remains zero-spend until Captain explicitly approves an alignment-judge pilot budget.
- Proposed initial cap: USD 10 for one dossier and a small stored-report sample. Stop early if the first sample shows unstable per-axis mapping; do not average instability away into aggregate C1.

## 8. Phase 0b Pilot

Start small. Do not attempt full benchmark conversion first.

Recommended pilot set:

1. `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben` - both axes: materially ambiguous legal/procedural term plus clearly distinct truth conditions.
2. `Plastic recycling is pointless` - interpretation-frame heavy; atomicity may be partial or indeterminable depending on frame.
3. One Bolsonaro input - atomicity-heavy with legal/procedural adjudication risk; use it as the curator/adjudicator separation test.

Pilot tasks:

1. Create the dossier template with `expectedClarificationReason`, frame-scoped `atomicityProfile`, and minimal v0.1 required fields.
2. Produce one full dossier for `rechtskräftig`.
3. Produce partial dossiers for `Plastic recycling is pointless` and one Bolsonaro input.
4. Run manual alignment on historical stored reports for all three.
5. Record manual scores per axis: clarification fit, frame admissibility, assertion coverage, atomicity fidelity, disclosure fidelity.
6. If manual alignment is coherent and Captain approves the cap, run the two-pass LLM alignment pilot.
7. Measure manual-vs-judge agreement per axis.
8. Only then decide whether to wire dossier links into `benchmark-expectations.json`.

Gates before dossier-backed metrics leave diagnostic mode:

- At least 85% manual-vs-judge agreement on each axis.
- Kappa at or above 0.70 on assertion coverage and atomicity fidelity where sample supports it; below 0.60 is no-go.
- No production scorer wiring if frame admissibility is unstable.
- No update to aggregate benchmark bands without citing a dossier version.
- Captain-approved spend cap not exceeded.

## 9. Red Lines

- No strict 1:1 expected AtomicClaim string list.
- No keyword, regex, or substring scoring for semantic alignment.
- No single-pass multi-frame LLM judging for C1.
- No scoring extraction coverage without first determining the active interpretation frame.
- No using frame ambiguity to excuse missed atoms. A report cannot get C1 credit by saying the input is ambiguous if the active frame's truth conditions are determinable and missed.
- No collapsing distinct truth conditions to evade an atomicity miss. If `separability = strict` or `mergePolicy = must_keep_separate`, a merged claim that hides one truth condition is a C1 miss.
- No live-source-only references; source decay must be controlled with archives or local hashes.
- No single-person source-selection-plus-adjudication for gold status.
- No scoring of subjective pipeline fields such as `checkWorthiness` or exact `centrality` against gold.
- No teaching-to-test prompt changes based on dossier wording.
- No hidden update of benchmark bands without dossier version bump.
- No LLM judge spend without an explicit Captain-approved cap.

## 10. Recommended Plan Change

Add **Phase 0b - Reference Dossiers** between current Phase 0 and Phase 1b/live validation.

Phase 1 zero-spend scorer can still run with the existing aggregate bands. But before spending on live build comparison or treating benchmark bands as Captain-grade gold, create frame-primary AtomicClaim reference dossiers for the hard inputs and validate both axes independently:

- interpretation-frame handling;
- frame-scoped atomicity/separability.

The main implementation plan should state:

> aggregate gold exists at C4 by default; deeper AtomicClaim-level gold exists only for families with independently reviewed reference dossiers, scored through frame-scoped N:M semantic alignment with per-frame atomicity fidelity - never through strict claim-string matching, and never by allowing ambiguity to hide clearly distinct truth conditions.
