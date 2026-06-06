# AtomicClaim-Level Reference Data Model

**Date:** 2026-06-06
**Role:** Lead Developer
**Status:** Closed v0.1 contract for Phase 0b implementation.
**Related plan:** `Docs/WIP/2026-06-04_Report_Quality_Measurement_Implementation_Plan.md`

## 1. Why this exists

The current report-quality plan intentionally treats gold reference as available only at aggregate C4: overall verdict label, truth band, and confidence band. That is too weak for hard inputs where Captain preference is not a sufficient reference standard and where a report can hit the aggregate band while extracting or judging the wrong underlying propositions.

The correction is to define source-grounded reference data at the pipeline's analytical unit: `AtomicClaim`.

This model is **not mainly about arbitrary claim-count variance**. For many inputs, the number of distinct truth conditions can be determined clearly. The more common hard problem is **term/frame interpretation**: words or concepts such as "pointless" or "rechtskräftig" can support multiple defensible readings. The reference system therefore needs two first-class contracts:

1. **Interpretation-frame contract** - what ambiguous term, phrase, or legal/procedural concept means under each defensible reading; when the report may commit to one frame; when it must disclose alternatives; when it must cover all frames.
2. **Atomicity/separability contract** - within a chosen frame, which truth conditions are clearly distinct and must remain independently assessable.

N:M alignment remains allowed, but only as a guard for occasional wording or split/combine differences. It is not a license to hide, merge away, or ignore clearly distinct AtomicClaims.

## 1a. Needs and Pains Covered

| Need / pain | Contract coverage | Non-negotiable rule |
|---|---|---|
| Captain preference is not enough as gold truth | Source-grounded `referenceAssertions[]`, source snapshots, role-separated curation/adjudication/review | No `adjudicated_gold` without independent review + Captain acceptance |
| Ambiguous terms such as `pointless` or `rechtskräftig` | `interpretationFrames[]` with explicit frame definitions and dossier/frame `ambiguityPolicy` | Score within the active frame; require disclosure when `must_disclose` |
| The number of AtomicClaims is often clearly determinable | Frame-scoped `atomicityProfile` with `determinability`, `determinabilityStatus`, and strict truth conditions | Ambiguity cannot excuse missed strict truth conditions |
| Split/combine wording variance is sometimes legitimate | N:M semantic alignment maps report `AtomicClaims` to reference assertions/truth conditions | Split/combine tolerance never hides a strict truth-condition miss |
| Current facts decay | `validityWindow` plus per-assertion `freshnessRequirement` | Current-snapshot comparisons pin dossier ID, version, and run-window |
| Generic, multilingual design | Byte-exact Captain input, language field, source-grounded frames, LLM/manual semantic adjudication | No keyword, regex, or language-specific semantic scoring |
| Build comparison needs stable references | Dossier versioning, source hashes/archives, cross-reference-era reporting | No comparing builds against a moving reference as one stable gold set |
| Implementation must not guess missing contracts | JSON Schema, validator, score artifact contract, manual rubric, judge output contract | No scorer wiring unless all Phase 0b gates pass |

## 2. Source-grounded constraints

- Pipeline `AtomicClaim` is a single verifiable assertion with fields such as `statement`, `category`, `verifiability`, `freshnessRequirement`, `centrality`, `harmPotential`, `claimDirection`, `thesisRelevance`, entities/geographies, and `expectedEvidenceProfile` (`apps/web/src/lib/analyzer/types.ts:840`).
- Stage 1 persists `CBClaimUnderstanding.atomicClaims[]`, `distinctEvents`, `preFilterAtomicClaims`, and Gate 1 reasoning (`apps/web/src/lib/analyzer/types.ts:1207`).
- Per-claim verdicts are linked to extracted claims through `CBClaimVerdict.claimId`, with truth percentage, 7-point verdict, confidence, evidence IDs, boundary findings, consistency, and misleadingness (`apps/web/src/lib/analyzer/types.ts:1043`).
- Stage 1 currently persists `CBClaimUnderstanding.inputClassification`, with the real enum values `single_atomic_claim`, `ambiguous_single_claim`, `multi_assertion_input`, `question`, and `article` (`apps/web/src/lib/analyzer/claim-extraction-stage.ts:118`). There is no persisted `ClarificationState` or `expectedClarificationReason` telemetry today; richer clarification reasons are outside the v0.1 contract and must not be scored by v0.1.
- Current benchmark expectations are family-level: expected verdict labels, truth/confidence bands, minimum boundary/event counts, anchor tokens, status notes, latest observations (`Docs/AGENTS/benchmark-expectations.json:13`).
- Current report-quality Q-codes use claim/event floors and anchor survival, not source-grounded per-AtomicClaim gold (`Docs/AGENTS/report-quality-expectations.json:74`, `Docs/AGENTS/report-quality-expectations.json:86`).
- FactHarbor rules forbid deterministic semantic matching or keyword adjudication for analytical meaning. Alignment between report claims and reference assertions must be manual or LLM-adjudicated with structural validation.

## 3. Consolidated Decision

Adopt AtomicClaim-level reference dossiers with **frame-scoped atomicity**:

1. The reference layer defines source-grounded reference assertions / core propositions, not expected pipeline claim IDs or exact claim strings.
2. Ambiguous terms, phrases, or legal/procedural concepts are represented as interpretation frames.
3. Each interpretation frame carries an `atomicityProfile` that says whether the frame's truth-condition count is determinable, partially determinable, or indeterminable.
4. When a frame's atomicity is determinable, the report must expose every strict truth condition as independently assessable at Stage 1 unless that truth condition is explicitly marked flexible.
5. v0.1 does not pre-register exact claim strings or exact claim counts. It does pre-register distinct truth conditions where determinable.
6. Reference dossiers are the authority. `benchmark-expectations.json` remains the compact scoring contract and points to dossier IDs/versions.

This changes the reference gradient:

- Before dossiers exist: C1/C2/C3 remain structural + stability + judge.
- For families with approved dossiers: C1 can be scored for frame choice, assertion coverage, atomicity fidelity, and ambiguity disclosure; C3 can be checked against per-reference-assertion verdict bands after alignment.
- C4 remains the aggregate gold layer and the first build-ranking signal until the dossier method is validated.

## 4. Data Model

Store heavy reference material in separate versioned dossier files, not inline in `benchmark-expectations.json`.

Canonical folder:

```text
Docs/AGENTS/Reference_Dossiers/
```

Canonical compact benchmark link:

```json
{
  "slug": "plastic-en",
  "referenceDossier": {
    "id": "plastic-en",
    "version": "0.1.0",
    "status": "draft | source_grounded | independently_reviewed | adjudicated_gold",
    "path": "Docs/AGENTS/Reference_Dossiers/plastic-en.v0.1.json"
  }
}
```

v0.1 dossier shape:

```json
{
  "id": "plastic-en",
  "version": "0.1.0",
  "inputSlug": "plastic-en",
  "captainInputValue": "Plastic recycling is pointless",
  "language": "en",
  "status": "draft",
  "expectedInputClassification": "single_atomic_claim | ambiguous_single_claim | multi_assertion_input | question | article",
  "ambiguityPolicy": "commit_allowed | must_disclose | must_cover_all",
  "ambiguityPolicyRationale": null,
  "curation": {
    "curator": null,
    "adjudicator": null,
    "peerReviewer": null,
    "createdAt": null,
    "lastRevalidatedAt": null,
    "revalidateAfter": null,
    "roleSeparationMode": "human_split | human_plus_agents | multi_agent_draft"
  },
  "validityWindow": {
    "referenceTime": null,
    "validFrom": null,
    "validThrough": null,
    "currentSnapshot": false
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
        "determinabilityStatus": "settled | contested | needs_adjudication",
        "determinabilityRationale": null,
        "distinctTruthConditions": [
          {
            "id": "TC_001",
            "description": null,
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

Pilot v0.1 required fields are the schema-required fields in `Docs/AGENTS/Reference_Dossiers/reference-dossier.schema.json`. Arrays such as `knownCounterEvidenceSourceIds[]` may be empty when no source-grounded counter-evidence is known; `harmfulMissCondition.description` may be `null` when no specific harmful-miss condition is defined. These are explicit nullable/empty states, not open design gaps.

Validation rules:

- The dossier shape is a v0.1 contract, not prose-only guidance. `scripts/validate-reference-dossiers.cjs` compiles and runs `Docs/AGENTS/Reference_Dossiers/reference-dossier.schema.json` with AJV, then applies cross-field checks that JSON Schema cannot express cleanly. Semantic alignment remains manual or LLM-adjudicated.
- `expectedInputClassification` must use the real Stage 1 enum only: `single_atomic_claim`, `ambiguous_single_claim`, `multi_assertion_input`, `question`, or `article`.
- `inputSlug` must equal a real `Docs/AGENTS/benchmark-expectations.json` family slug. `benchmarkCoherence.familyTruthBand` must equal that family's `truthPercentageBand`, and `benchmarkCoherence.familyConfidenceBand` must equal that family's `confidenceBand`. `plastic-en` is the slug for `Plastic recycling is pointless`.
- If `sourceSnapshots[].localPath` is set, it must resolve inside the repository and `sourceSnapshots[].localHash` must be `sha256:<64 hex chars>` matching the committed file contents. A `localHash` without `localPath` is invalid.
- Root-level `atomicityPolicy` is forbidden. Atomicity is frame-scoped through `interpretationFrames[].atomicityProfile`.
- `atomicityProfile.determinabilityStatus` is required. Only `settled` frames can produce automated dossier-backed rank; `contested` and `needs_adjudication` frames stay colour/human-review only.
- If an input has two or more interpretation frames, default `ambiguityPolicy` is `must_disclose`. `commit_allowed` requires non-empty `ambiguityPolicyRationale`. `must_cover_all` is reserved for compound inputs where frames are not alternatives but separate required dimensions.
- Frame IDs and reference assertion IDs must be unique within a dossier.
- Every required reference assertion belongs to exactly one truth condition through `referenceAssertions[].truthConditionId`; the reverse mapping is derived, not duplicated.
- Every `truthConditionId` resolves to a truth condition in the same frame.
- `separability: strict` requires an independently assessable truth condition.
- `role: required` requires at least one source-grounded `evidenceSourceId`.
- `acceptedVerdictLabels[]` uses the live string labels only: `TRUE`, `MOSTLY-TRUE`, `LEANING-TRUE`, `MIXED`, `UNVERIFIED`, `LEANING-FALSE`, `MOSTLY-FALSE`, `FALSE`.
- All truth/confidence bands are percentages in `[0,100]`; non-null band endpoints require `min <= max`.
- `acceptedVerdictLabels` and `truthBand` must be checked for 7-point-scale consistency. Store both, but reject inconsistent combinations unless `notes` starts with `BAND_EXCEPTION:` and explains the exception.
- `required` plus `contested: true` is allowed only as a provisional state. It is not a hard scoring requirement until adjudication resolves it or widens the band.
- `current_snapshot` assertions require `validityWindow.currentSnapshot = true` and a pinned `validityWindow.referenceTime`; build comparisons must pin dossier ID, dossier version, and comparison run-window. Revalidation that changes source snapshots, frame definitions, assertions, or bands creates a new dossier version.
- Any dossier band change must reconcile with the family-level band in `benchmark-expectations.json`; any benchmark band change must cite the dossier version that justifies it. Legacy scorer behavior continues to use `benchmark-expectations.json` until the dossier link is wired.

## 5. Research and Adjudication Workflow

Phase 0b should run before any additional live validation spend.

1. **Freeze the input.** Use only Captain-defined input wording. The input remains byte-exact.
2. **Classify the reference problem.** Curator labels the family as primarily `clear_atomicity`, `interpretation_ambiguous`, `both`, or `indeterminate`.
3. **Independent source discovery.** One researcher builds a source matrix with primary sources preferred, secondary sources only as context. Every source used for reference judgment must have retrieval date and archive/local hash where feasible.
4. **Interpretation-frame drafting.** A curator identifies ambiguous terms/frames, defines admissible readings, sets `ambiguityPolicy`, and sets `expectedInputClassification` against the real Stage 1 enum.
5. **Atomicity drafting.** For each frame, the curator declares whether truth-condition count is determinable and lists `distinctTruthConditions` where determinable.
6. **Assertion drafting.** Curator links each required reference assertion to exactly one truth condition.
7. **Adjudication split.** A different adjudicator assigns verdict/truth/confidence bands to each reference assertion using the source snapshots.
8. **Adversarial review.** A reviewer challenges omitted interpretations, missing counter-evidence, weak source choices, over-precise bands, and any hidden merge of distinct truth conditions.
9. **Contestation handling.** Assertions, interpretation frames, or determinability judgments with material disagreement become `contested: true`, frame `admissibility: contested`, or `atomicityProfile.determinabilityStatus: contested | needs_adjudication`; they are excluded from automated rank until resolved.
10. **Versioning.** Any source change, frame change, atomicity-profile change, assertion change, band change, or current-snapshot revalidation that changes the reference answer bumps the dossier version and records the delta.
11. **Revalidation.** Time-sensitive dossiers carry `revalidateAfter`. Stable historical/procedural dossiers can have longer review windows.

Determinability criteria:

- `determinable`: the frame exposes a stable set of independently verifiable truth conditions. A condition is independent when it can be true while another is false, depends on materially different evidence or legal/procedural authority, or its omission would materially change the answer to the Captain-defined input.
- `partial`: some truth conditions are independently verifiable, but the frame also contains evaluative, policy, or contextual parts where multiple decompositions remain defensible after source review. Only the declared strict conditions are scored for atomicity.
- `indeterminable`: source review cannot establish a stable decomposition without converting the input into a curator preference. The dossier must then score frame/disclosure/assertion coverage, but waive atomicity fidelity for that frame.
- Determinability is itself reviewable. Curator/adjudicator disagreement on `determinable` vs `partial` vs `indeterminable` is not silently resolved by the curator; `determinabilityStatus` becomes `contested` or `needs_adjudication` until a rationale is recorded.

Worked examples for the pilot:

- A procedural/legal input can be determinable where the act, legal effect, and timing against separate decision events can each be independently true or false under the selected legal frame.
- An evaluative term such as "pointless" may be partial or indeterminable until the dossier selects a frame such as environmental effect, economic efficiency, or practical recycling-rate impact. The frame definition, not the surface word, determines which truth conditions are strict.
- A fair-trial/legal-proceedings input may be determinable for separately sourced procedural requirements, verdict existence, and international-standard compliance, while still leaving some evaluative justice language as partial.

Role separation policy:

- `draft`: may be one human or one agent.
- `source_grounded`: requires separate curator and adjudicator passes. Distinct model families may satisfy this for draft work, but the dossier must say `roleSeparationMode: multi_agent_draft`.
- `independently_reviewed`: requires at least one independent reviewer not used as curator/adjudicator; a different model family is acceptable for pilot discussion.
- `adjudicated_gold`: requires human Captain acceptance after the independent challenge is visible. Agents can support but cannot be the sole authority.

## 6. Scoring Implications

### Stage 1 input-classification fit

Compare the report's persisted `CBClaimUnderstanding.inputClassification` against dossier `expectedInputClassification`:

- matching the real Stage 1 enum supports C1;
- a mismatch caps dossier-backed C1 semantic score until manually reviewed;
- historical reports without this field get `n/a`, not a fail;
- richer clarification reasons are outside the v0.1 contract and are not backfilled or scored.

This axis is a coarse input-shape fit only. Interpretation-frame choice and ambiguity disclosure are scored by the frame/disclosure axes below, not by inventing a clarification taxonomy in the scorer.

### C1 extraction alignment

Use a sequential, per-frame scoring process:

1. **Frame admissibility.** Human or LLM judge identifies which interpretation frame the report actually pursued. Do not map assertions across all frames in one pass.
2. **Assertion coverage.** Map report AtomicClaims only to the active frame's reference assertions. Status values: `addressed | partial | not_addressed | contradicted | tolerated_context | unsupported_extra`.
3. **Atomicity fidelity.** If the active frame has `determinability = determinable` or `partial`, every strict truth condition must be independently assessable at Stage 1. For C1, "independently assessable" means the report's extracted `AtomicClaims` expose each strict truth condition as a separately mappable direct assertion. Downstream verdicts, evidence, or narrative may explain C3/C5, but they cannot rescue a Stage 1 merge that hides strict truth conditions.
4. **Disclosure fidelity.** If dossier or frame `ambiguityPolicy = must_disclose`, the report must acknowledge the materially competing frame. If `must_cover_all`, it must cover all required frames.

Axis domains for Phase 0b:

- `inputClassificationFit`: 1.0 match, 0.5 uncertain/manual-review, 0.0 mismatch; reports without `inputClassification` are `n/a`, not zero.
- `frameAdmissibility`: 1.0 active frame identified, 0.0 no admissible frame.
- `assertionCoverage`: required assertions addressed or partial, with partial scored 0.5, divided by total required assertions in the active frame; forbidden assertion present floors the active frame to 0.
- `atomicityFidelity`: strict truth conditions separately represented in Stage 1 `AtomicClaims`, divided by strict truth conditions required in the active frame. If determinability is `indeterminable`, this axis is waived as 1.0.
- `disclosureFidelity`: 1.0 if policy does not require disclosure or disclosure is present; 0.0 if `must_disclose` / `must_cover_all` is violated.

Per-frame C1:

```text
C1Base(frame) =
  frameAdmissibility
  × min(assertionCoverage, atomicityFidelity, disclosureFidelity)

C1(frame) =
  min(C1Base(frame), inputClassificationCap) when inputClassificationFit is present
  C1Base(frame) when inputClassificationFit is n/a
```

`inputClassificationFit` is a cap, not a multiplier: match = cap 1.0; uncertain/manual-review = cap 0.5; mismatch = cap 0.0; `n/a` = cap absent.

Report C1 uses the report's active admissible frame, but the score artifact must record the active frame, runner-up frame, and all axis sub-scores. If two frames are near-equally admissible and the report did not disclose the ambiguity, record `ambiguous_active_frame`, use the lower tied frame score for automated comparison, and route the case to human review. This prevents "best frame" scoring from flattering a report that did not genuinely pursue or disclose that frame.

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
- If structural matching fails but the report evidence appears source-equivalent, use a separate C3 evidence-equivalence judge. Inputs: active frame ID, mapped reference assertion IDs, `sourceSnapshots[]` metadata, report `EvidenceItem` IDs/statements/source URLs when persisted, and `CBClaimVerdict.evidenceIds`. Missing report source URLs are represented as `null`; they do not create new matching rules. Outputs: strict JSON mappings from report evidence IDs to reference source IDs with `equivalent | partial | not_equivalent | unresolved`, confidence, and rationale. The judge does not rescore truth, does not infer missing citations, and does not use keyword or substring matching.
- If the join is unresolved, evidence-specific credit is `unverified`, not an automatic fail. Truth/verdict alignment can still be scored separately.

This is not a replacement for C4. C4 remains the aggregate gold check. AtomicClaim references explain where the aggregate score came from and catch false aggregate passes.

### Build comparison

AtomicClaim reference metrics should start as colour diagnostics until the Phase 0b pilot proves alignment-judge stability. They should not become a ranking signal until:

- per-axis judge agreement is measured, not only aggregate C1 agreement;
- human spot-checks show acceptable false-positive/false-negative rates;
- the dossier is at least `independently_reviewed`;
- source snapshots are stable.

Routing transition:

- Before the Phase 0b gate passes, dossier-backed C1/C3 is **COLOUR** for diagnosis and may be used only as a labelled manual tie-break in human review.
- After the Phase 0b gate passes for a specific dossier family, dossier-backed AtomicClaim alignment becomes an availability-gated **RANK** signal for that family only. It ranks alongside, not instead of, C4. C4 remains the aggregate gold band; dossier C1/C3 catches false aggregate passes and localizes which frame/assertion failed.
- Current-snapshot dossiers are time-relative gold. Any build comparison using them must pin dossier ID, dossier version, and comparison run-window; comparisons across revalidated dossier versions are reported as cross-reference-era, not a single stable gold comparison.

## 7. Manual Alignment Rubric and Score Artifact

This section is the pinned v0.1 manual rubric. Implementers instantiate it; they do not define a new rubric.

### C1 Rubric

Manual alignment is sequential and frame-primary:

1. `activeFrameId`: the frame the report actually pursues.
2. `runnerUpFrameId`: the closest alternative frame, or `null`.
3. `frameDecision`: `active_clear | active_ambiguous | no_admissible_frame`.
4. `inputClassificationFit`: `match | uncertain | mismatch | absent`.
5. `assertionCoverage[]`: one item per required reference assertion in the active frame, each labelled `addressed | partial | not_addressed | contradicted`.
6. `extraClaims[]`: report direct claims not mapped to required assertions, each labelled `tolerated_context | unsupported_extra | forbidden`.
7. `atomicityFidelity[]`: one item per strict truth condition in the active frame, each labelled `separately_represented | merged_but_visible | hidden_or_missing | waived`.
8. `disclosureFidelity`: `satisfied | violated | not_required`.
9. `reviewFlags[]`: zero or more of `ambiguous_active_frame`, `determinability_contested`, `unsupported_forbidden_extra`, `low_confidence_alignment`, `needs_human_review`.

Scoring conversions:

- `inputClassificationFit`: `match = cap 1.0`, `uncertain = cap 0.5`, `mismatch = cap 0.0`, `absent = cap absent`.
- `assertionCoverage`: `addressed = 1.0`, `partial = 0.5`, `not_addressed = 0.0`, `contradicted = 0.0` plus `harmFlag`.
- `extraClaims`: `tolerated_context` excluded from score; `unsupported_extra` recorded as colour unless it changes the input meaning; `forbidden` floors `assertionCoverage` to `0.0`.
- `atomicityFidelity`: `separately_represented = 1.0`; `merged_but_visible = 0.5` only when the truth condition is explicitly marked flexible; `hidden_or_missing = 0.0`; `waived` excluded from denominator.
- `disclosureFidelity`: `satisfied` or `not_required = 1.0`; `violated = 0.0`.
- `active_ambiguous` without adequate disclosure uses the lower of the tied frame scores and sets `needs_human_review`.
- `no_admissible_frame` sets C1 semantic coverage to `0.0` after human confirmation; before confirmation it remains colour only.

### C3 Rubric

C3 is scored only after C1 alignment:

1. For each mapped required assertion, locate the linked `CBClaimVerdict` through mapped report `AtomicClaim` IDs.
2. `verdictBandFit`: `in_band | adjacent | same_side_out_of_band | direction_flip | unverified | no_verdict`.
3. `confidenceFit`: `in_band | above_band | below_band | absent`.
4. `evidenceFit`: `equivalent | partial | not_equivalent | unresolved | no_citation`.
5. `harmfulError`: `none | confident_wrong | harmful_miss`.

Scoring conversions:

- `verdictBandFit`: `in_band = 1.0`, `adjacent = 0.7`, `same_side_out_of_band = 0.0..0.7 by distance`, `direction_flip = 0.0 + harmfulError`, `unverified = 0.25`, `no_verdict = 0.0`.
- `confidenceFit`: `in_band = 1.0`; `above_band` or `below_band = 0.5` for calibration colour until a validated per-assertion confidence policy is approved; `absent = needs_human_review`.
- `evidenceFit`: `equivalent = 1.0`, `partial = 0.5`, `not_equivalent | unresolved | no_citation = 0.0` for the evidence axis only. Evidence mismatch does not automatically rewrite truth/verdict fit.
- `confident_wrong` floors the assertion's C3 verdict score to `0.0` and records harm; aggregate harm ranking remains governed by the C4 harmful-error formula to avoid double counting.

### Score Artifact Contract

Each manual or LLM alignment run writes a score artifact with this shape:

```json
{
  "schemaVersion": "reference-alignment-score.v0.1",
  "dossierId": "plastic-en",
  "dossierVersion": "0.1.0",
  "inputSlug": "plastic-en",
  "reportJobId": null,
  "buildId": null,
  "runWindowId": null,
  "scorerVersion": null,
  "alignmentMode": "manual | llm_judge",
  "judge": {
    "promptVersion": null,
    "model": null,
    "runId": null
  },
  "c1": {
    "activeFrameId": null,
    "runnerUpFrameId": null,
    "frameDecision": "active_clear | active_ambiguous | no_admissible_frame",
    "axisScores": {
      "inputClassificationFit": null,
      "frameAdmissibility": null,
      "assertionCoverage": null,
      "atomicityFidelity": null,
      "disclosureFidelity": null
    },
    "claimMappings": [],
    "truthConditionMappings": [],
    "extraClaims": [],
    "reviewFlags": []
  },
  "c3": {
    "assertionVerdictFits": [],
    "evidenceMappings": [],
    "harmFlags": [],
    "reviewFlags": []
  }
}
```

`null` is allowed only for unavailable metadata before scorer wiring, never for required IDs inside `claimMappings`, `truthConditionMappings`, `assertionVerdictFits`, or `evidenceMappings`.

## 8. Alignment Judge Requirements

Do not use deterministic string or keyword matching for semantic alignment.

Minimum requirements:

- Use a two-pass sequence: first frame admissibility, then assertion mapping within the active frame.
- Elicit frame admissibility, assertion coverage, atomicity fidelity, and disclosure fidelity as separable judge outputs so per-axis agreement is measurable.
- The C1 judge prompt receives the byte-exact input, dossier frame(s), reference assertions, truth conditions, and report AtomicClaims only. It must not receive downstream verdict/evidence/narrative artifacts for C1 scoring.
- The C3 judge prompt receives the active C1 mapping plus report `CBClaimVerdict` and cited `EvidenceItem` artifacts. C3 may judge verdict/evidence correctness after C1 alignment, but it must not rewrite C1 atomicity.
- C1 output must be strict JSON with claim IDs, frame IDs, truth-condition IDs, and reference assertion IDs only. C3 output may also include report evidence IDs and reference source IDs for evidence-equivalence mapping.
- Structural validation verifies IDs exist, every required assertion has a status, and every report direct claim is either mapped or marked extra/context.
- Use a model family different from the report generator where possible.
- Record judge metadata in the score artifact: prompt version, model, run ID, dossier version, report job ID, and scorer version.
- Use separate prompts or clearly separated prompt sections for C1 extraction coverage and C3 verdict correctness.
- Low-confidence judge outputs become `needs_human_review`, not auto-fail.
- Use the pinned manual-alignment rubric in §7 before judging manual-vs-LLM agreement. The rubric defines each axis, allowed labels, tie handling, and examples of `needs_human_review`.

The v0.1 judge output contracts are:

```json
{
  "schemaVersion": "reference-c1-judge.v0.1",
  "activeFrameId": "FRAME_...",
  "runnerUpFrameId": null,
  "frameDecision": "active_clear | active_ambiguous | no_admissible_frame",
  "inputClassificationFit": "match | uncertain | mismatch | absent",
  "assertionCoverage": [
    {
      "referenceAssertionId": "RA_...",
      "status": "addressed | partial | not_addressed | contradicted",
      "reportClaimIds": ["AC_..."]
    }
  ],
  "atomicityFidelity": [
    {
      "truthConditionId": "TC_...",
      "status": "separately_represented | merged_but_visible | hidden_or_missing | waived",
      "reportClaimIds": ["AC_..."]
    }
  ],
  "extraClaims": [
    {
      "reportClaimId": "AC_...",
      "status": "tolerated_context | unsupported_extra | forbidden"
    }
  ],
  "disclosureFidelity": "satisfied | violated | not_required",
  "reviewFlags": []
}
```

```json
{
  "schemaVersion": "reference-c3-judge.v0.1",
  "assertionVerdictFits": [
    {
      "referenceAssertionId": "RA_...",
      "reportClaimId": "AC_...",
      "claimVerdictId": null,
      "verdictBandFit": "in_band | adjacent | same_side_out_of_band | direction_flip | unverified | no_verdict",
      "confidenceFit": "in_band | above_band | below_band | absent",
      "harmfulError": "none | confident_wrong | harmful_miss"
    }
  ],
  "evidenceMappings": [
    {
      "reportEvidenceId": "EV_...",
      "referenceSourceId": "SRC_...",
      "status": "equivalent | partial | not_equivalent | unresolved"
    }
  ],
  "reviewFlags": []
}
```

The prompt text is an implementation artifact, but the allowed inputs, outputs, labels, score conversions, and failure routing are closed by this section. Prompt wording may improve clarity only if it preserves this contract.

Pilot acceptance threshold:

- LLM alignment judge must reach at least 85% agreement with manual mapping on **each axis** before dossier-based C1/C3 metrics become more than colour diagnostics.
- The USD 10 pilot may validate raw agreement only. Cohen's kappa becomes a gate only when an axis has at least 30 adjudicable scored units and at least two non-rare labels. At that point, kappa below 0.70 is a warning; below 0.60 is a no-go for scaling.

Cost rule:

- Phase 0b remains zero-spend until Captain explicitly approves an alignment-judge pilot budget.
- Default initial cap for Captain approval: USD 10 for one dossier and a small stored-report sample. Treat it as a raw-agreement smoke test, not as a statistically powered kappa study. Stop early if the first sample shows unstable per-axis mapping; do not average instability away into aggregate C1.

## 9. Phase 0b Pilot

Start small. Do not attempt full benchmark conversion first.

Recommended pilot set:

1. `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben` - both axes: materially ambiguous legal/procedural term plus clearly distinct truth conditions.
2. `Plastic recycling is pointless` - interpretation-frame heavy; atomicity may be partial or indeterminable depending on frame.
3. One Bolsonaro input - atomicity-heavy with legal/procedural adjudication risk; use it as the curator/adjudicator separation test.

Pilot tasks:

1. Instantiate the dossier template from the existing JSON Schema and validator with `expectedInputClassification`, dossier-level `ambiguityPolicy`, frame-scoped `atomicityProfile`, and required v0.1 fields.
2. Use the pinned manual-alignment rubric in §7 before scoring any stored reports.
3. Produce one full dossier for `rechtskräftig`.
4. Produce partial dossiers for `Plastic recycling is pointless` and one Bolsonaro input.
5. Run manual alignment on historical stored reports for all three.
6. Record manual scores per axis: input-classification fit, frame admissibility, assertion coverage, atomicity fidelity, and disclosure fidelity.
7. Instantiate strict-JSON C1 alignment and C3 evidence-equivalence judge prompts from §8, but do not run them until Captain approves the cap.
8. If manual alignment is coherent and Captain approves the cap, run the two-pass LLM alignment pilot.
9. Measure manual-vs-judge agreement per axis.
10. Only then decide whether to wire dossier links into `benchmark-expectations.json`.

Gates before dossier-backed metrics leave diagnostic mode:

- At least 85% manual-vs-judge agreement on each axis.
- Kappa at or above 0.70 on assertion coverage and atomicity fidelity once each axis has at least 30 adjudicable scored units and a non-degenerate label distribution; below 0.60 is no-go for scaling.
- No production scorer wiring if frame admissibility is unstable.
- No production scorer wiring if determinability decisions are contested or unresolved.
- No update to aggregate benchmark bands without citing a dossier version.
- No build comparison over current-snapshot gold without pinning dossier version and run-window.
- Captain-approved spend cap not exceeded.

## 10. Red Lines

- No strict 1:1 expected AtomicClaim string list.
- No keyword, regex, or substring scoring for semantic alignment.
- No single-pass multi-frame LLM judging for C1.
- No scoring extraction coverage without first determining the active interpretation frame.
- No rescuing C1 atomicity with downstream verdicts, evidence, or narrative; C1 is Stage 1 extraction-only.
- No using frame ambiguity to excuse missed atoms. A report cannot get C1 credit by saying the input is ambiguous if the active frame's truth conditions are determinable and missed.
- No collapsing distinct truth conditions to evade an atomicity miss. If `separability = strict` or `independentAssessabilityRequired = true`, a merged Stage 1 claim that hides one truth condition is a C1 miss.
- No live-source-only references; source decay must be controlled with archives or local hashes.
- No comparing builds against a moving current-snapshot reference without dossier-version and run-window pinning.
- No single-person source-selection-plus-adjudication for gold status.
- No scoring of subjective pipeline fields such as `checkWorthiness` or exact `centrality` against gold.
- No teaching-to-test prompt changes based on dossier wording.
- No hidden update of benchmark bands without dossier version bump.
- No LLM judge spend without an explicit Captain-approved cap.

## 11. Closed Contract / Execution Boundary

No v0.1 reference-data contract item is left to define in implementation. Remaining work is execution against this contract:

- author dossiers;
- run structural validation;
- perform manual alignment;
- instantiate judge prompts from the fixed input/output contracts;
- run the gated pilot only after Captain-approved spend;
- wire scoring only after the published gates pass.

Changes to fields, labels, score conversions, routing roles, or acceptance gates are design changes and require a new review.

## 12. Plan Alignment

The implementation plan includes **Phase 0b - Reference Dossiers** between Phase 0 and Phase 1b/live validation.

Phase 1 zero-spend scorer can still run with the existing aggregate bands. But before spending on live build comparison or treating benchmark bands as Captain-grade gold, create frame-primary AtomicClaim reference dossiers for the hard inputs and validate both axes independently:

- interpretation-frame handling;
- frame-scoped atomicity/separability;
- C1/C3 judge reliability against the pinned manual rubric.

Plan implementation must not add new fields, labels, score conversions, routing roles, or acceptance gates without a reviewed design change.
