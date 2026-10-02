# Quality and trust

FactHarbor makes an assessment inspectable by connecting claims, sources, reasoning and uncertainty. These controls support scrutiny; they do not guarantee that a result is complete, unbiased or correct.

## Claims and evidence

Claim validation should preserve the user's meaning and distinguish assessable assertions from opinion or underspecified wording. Research should seek relevant supporting and opposing evidence. An **EvidenceItem** is information extracted from a source, not an automatically verified fact.

Sources may use different methods, time periods or geographic coverage. **EvidenceScope** records those conditions; **ClaimAssessmentBoundaries** keep compatible evidence together. A result can differ across boundaries without either source being intrinsically unreliable. Readers should inspect which evidence applies to the actual claim.

## Challenging an assessment

The [debate stage](../../../../akel-stage-details.md#4-generate-challenge-and-validate-verdicts) separates an initial assessment, evidence-backed challenge, reconciliation and validation. Documented counter-evidence or a supported coverage problem can change a conclusion. Opinion and unsupported doubt alone must not reduce truth or confidence. Model agreement can still reflect shared gaps.

## Truth, confidence and publication

**Truth percentage** describes the assessment of the claim. **Confidence** describes how well that assessment is supported. A strongly directional result may still be uncertain; neither number is a guarantee or an independently calibrated probability of correctness.

The [verdict scale](../../../diagrams/verdict-scale/index.md) distinguishes **MIXED**, where the evidence supports a mixed assessment, from **UNVERIFIED**, where evidence is insufficient for a trustworthy judgment. Claim-validation and confidence gates are required. A retained directional signal can be marked unsuitable for publication; clients must respect the result's publishability and limitation fields.

## Source reliability

Source reliability supplies information about the source's track record and editorial practices. It is distinct from political alignment and from the probative value of an individual item. A reputable publisher does not make every statement true, and a weak reputation does not by itself refute primary evidence. Several articles can also repeat the same underlying source.

## Warnings and limitations

Material retrieval, interpretation or verdict failures must remain visible in the report. Sparse or inaccessible evidence can limit confidence; missing evidence does not establish falsity. Recovered technical events with no material analytical impact should not distract readers with warnings.

FactHarbor remains an Alpha. Repeated runs, different phrasings and languages can produce different results, and citations can be misread. Use the linked sources and claim-level explanations to assess a report rather than relying only on its headline.

Contributors must preserve the [quality expectations](https://github.com/robertschaub/FactHarbor/blob/main/Docs/AGENTS/Captain_Quality_Expectations.md), [current issues](https://github.com/robertschaub/FactHarbor/blob/main/Docs/STATUS/KNOWN_ISSUES.md), multilingual robustness and approved exact-input controls. New paid evaluations require their own authorization.
