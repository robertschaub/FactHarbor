# User Needs

This page defines user needs that drive FactHarbor's requirements and design decisions.

**Template**: As a \<specific user role\>, I want to \<action/goal\>, so that I can \<benefit/outcome\>

**Purpose**: User needs inform functional requirements (FR) and non-functional requirements (NFR). Each need maps to one or more requirements that fulfill it.

## 1. Core Reading & Discovery

### UN-1: Trust Assessment at a Glance

**As** an article reader (any content type), **I want** to see a trust score and overall verdict summary at a glance, **so that** I can quickly decide if the content is worth my time to read in detail.

**Maps to**: FR7 (Automated Verdicts), NFR3 (Transparency)

### UN-2: AtomicClaim Extraction and Verification

**As** an article reader, **I want** to see the key factual assertions (AtomicClaims) extracted from content with verification verdicts (likelihood ranges + uncertainty ratings) for each relevant ClaimAssessmentBoundary, **so that** I can distinguish proven facts from speculation and understand context-dependent truth across different analytical frames.

**Maps to**: FR1 (Claim Intake), FR4 (Boundary Generation), FR7 (Automated Verdicts)

### UN-3: Article Summary with FactHarbor Analysis Summary

**As** an article reader, **I want** to see an article summary (the document's position, key claims, and reasoning) side-by-side with FactHarbor's analysis summary (source credibility assessment, claim-by-claim verdicts, methodology evaluation, and overall quality verdict), **so that** I can quickly understand both what the document claims and FactHarbor's complete analysis of its credibility without reading the full detailed report.

**Maps to**: FR7 (Automated Verdicts), FR6 (Boundary Comparison), FR12 (Two-Panel Summary View - Article Summary with FactHarbor Analysis Summary)

#### Example: Two-Panel Summary Layout

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<thead>
<tr>
<th><strong>ARTICLE SUMMARY</strong></th>
<th><strong>FACTHARBOR ANALYSIS SUMMARY</strong></th>
</tr>
</thead>
<tbody>
<tr>
<td><p><strong>FactHarbor Summary: AHA Alcohol &amp; Heart Health Statement (2025)</strong></p>
<p><strong>Source:</strong> American Heart Association Scientific Statement, <em>Circulation</em>, June 2025 <strong>Credibility:</strong> Very High (peer-reviewed expert consensus)</p>
<h3 id="the-big-picture">The Big Picture</h3>
<p><strong>Old belief:</strong> "A glass of wine is good for your heart" <strong>New position:</strong> We're no longer sure that's true</p>
<h3 id="key-findings">Key Findings</h3>
<table>
<thead>
<tr>
<th><strong>Drinking Level</strong></th>
<th><strong>Verdict</strong></th>
</tr>
</thead>
<tbody>
<tr>
<td>Heavy (≥3 drinks/day)</td>
<td>❌ <strong>Harmful</strong> – consistent across ALL studies</td>
</tr>
<tr>
<td>Moderate (1-2 drinks/day)</td>
<td>❓ <strong>Uncertain</strong> – benefits may have been overstated</td>
</tr>
<tr>
<td>None</td>
<td>✅ <strong>Don't start drinking for heart health</strong></td>
</tr>
</tbody>
</table>
<h3 id="why-the-shift">Why the Shift?</h3>
<p>Newer genetic studies (Mendelian randomization) found <strong>no evidence</strong> that moderate drinking protects the heart. The apparent benefits in older studies were likely due to lifestyle differences and methodological bias.</p>
<h3 id="aha-bottom-line">AHA Bottom Line</h3>
<p>If you don't drink, don't start. If you do drink, keep it to ≤2/day (men) or ≤1/day (women). Focus on proven healthy behaviors instead—exercise, diet, not smoking.</p>
<p><em>The "wine for heart health" era appears to be over.</em></p></td>
<td><p><strong>FactHarbor Analysis Summary</strong></p>
<p><strong>Document:</strong> AHA Scientific Statement on Alcohol and Cardiovascular Disease (2025)</p>
<h3 id="source-assessment">Source Assessment</h3>
<p><strong>Credibility:</strong> <strong>VERY HIGH</strong> – Official AHA statement, peer-reviewed, expert panel, published in top journal (<em>Circulation</em>)</p>
<h3 id="analysis-findings">Analysis Findings</h3>
<table>
<thead>
<tr>
<th><strong>Claim in Document</strong></th>
<th><strong>FactHarbor Verdict</strong></th>
<th><strong>Confidence</strong></th>
</tr>
</thead>
<tbody>
<tr>
<td>Heavy drinking harms heart health</td>
<td><strong>STRONGLY SUPPORTED</strong></td>
<td><strong>95%</strong></td>
</tr>
<tr>
<td>Moderate drinking benefits uncertain</td>
<td><strong>WELL SUPPORTED</strong></td>
<td><strong>85%</strong></td>
</tr>
<tr>
<td>Prior "cardioprotective" claims overstated</td>
<td><strong>SUPPORTED</strong></td>
<td><strong>80%</strong></td>
</tr>
<tr>
<td>More research needed</td>
<td><strong>APPROPRIATE</strong></td>
<td>N/A</td>
</tr>
</tbody>
</table>
<h3 id="assessment">Assessment</h3>
<p>✅ <strong>Strengths:</strong> Transparent about methodological limitations, incorporates newer Mendelian randomization evidence, appropriately cautious, avoids overstatement</p>
<p>✅ <strong>Methodology:</strong> Sound synthesis of observational and genetic evidence</p>
<p>⚠️ <strong>Limitation:</strong> Still relies heavily on observational data; RCT evidence limited</p>
<h3 id="verdict-on-the-statement-itself">Verdict on the Statement Itself</h3>
<p><strong>WELL-SUPPORTED SCIENTIFIC SYNTHESIS</strong> – The AHA statement is credible, balanced, and appropriately reflects the current state of evidence. It correctly signals a shift away from previous assumptions about moderate drinking benefits without overclaiming in either direction.</p>
<p><strong>Analysis ID:</strong> FH-AHA-ALCO-2025-12-17</p></td>
</tr>
</tbody>
</table>

**Key Elements of Two-Panel Layout**:

**Left Panel (Article Summary)**:

-   Document title and source
-   Source credibility (document's own authority)
-   "The Big Picture" - old belief vs. new position
-   "Key Findings" - document's main claims in structured format
-   "Why the Shift?" - document's reasoning
-   "Bottom Line" - document's conclusion

**Right Panel (FactHarbor Analysis Summary)**:

-   FactHarbor's source assessment (independent credibility check)
-   Claim-by-claim analysis with verdicts and confidence scores
-   Assessment of methodology (strengths/limitations)
-   Overall verdict on the document itself
-   Analysis ID for reference

**Design Principle**: User sees **what they claim** and **FactHarbor's complete analysis** side-by-side without scrolling.

### UN-4: Social Media Fact-Checking

**As** a social media user, **I want** to check claims in posts before sharing, **so that** I can avoid spreading misinformation.

**Maps to**: FR1 (Claim Intake), FR7 (Automated Verdicts), NFR1 (Performance - fast processing)

### UN-17: In-Article AtomicClaim Highlighting

**As** a reader viewing an article, **I want** to see factual assertions (AtomicClaims) highlighted with color-coded credibility indicators (green for well-supported, yellow for uncertain, red for refuted), **so that** I can immediately identify which statements are trustworthy and which require skepticism without interrupting my reading flow.

**Maps to**: FR7 (Automated Verdicts), FR13 (In-Article Claim Highlighting), NFR1 (Performance - real-time highlighting)

#### Visual Concept

When reading an article on FactHarbor:

Regular article text flows normally...

This claim is well-supported by evidence and you can continue reading...

More context and explanation...

This claim is uncertain with conflicting evidence but the article continues...

Additional information...

This claim has been refuted by research and understanding that helps readers...

**Hover/Click on any highlighted claim** → See verdict, confidence score, and evidence summary

## 2. Source Tracing & Credibility

### UN-5: Source Provenance and Track Records

**As** an article reader, **I want** to trace each piece of evidence back to its original source and see that source's historical track record, **so that** I can assess the reliability of the information chain and learn which sources are consistently trustworthy.

**Maps to**: FR5 (Evidence Linking), Section 4.1 (Source Requirements - track record system)

### UN-6: Publisher Reliability History

**As** an article reader, **I want** to see historical accuracy track records for sources and publishers, **so that** I can learn which outlets are consistently reliable over time.

**Maps to**: Section 4.1 (Source Requirements), Data Model (Source entity with track_record_score)

## 3. Understanding the Analysis

### UN-7: Evidence Transparency

**As** a skeptical reader, **I want** to see the evidence and reasoning behind each verdict, **so that** I can judge whether I agree with the assessment and form my own conclusions.

**Maps to**: FR5 (Evidence Linking), NFR3 (Transparency)

### UN-8: Understanding Disagreement and Consensus

**As** an article reader, **I want** to see which ClaimAssessmentBoundaries have strong supporting evidence versus which have conflicting evidence or high uncertainty, **so that** I can understand where legitimate disagreement exists versus where consensus is clear across different analytical frames.

**Maps to**: FR6 (Boundary Comparison), FR7 (Automated Verdicts - uncertainty factors), AKEL Gate 2 (Contradiction Search)

### UN-9: Methodology Transparency

**As** an article reader, **I want** to understand how likelihood ranges and confidence scores are calculated, **so that** I can trust the verification process itself.

**Maps to**: NFR3 (Transparency), Architecture (documented algorithms), AKEL (Quality Gates)

## 4. Pattern Recognition & Learning

### UN-10: Manipulation Tactics Detection

**As** an article reader, **I want** to see common manipulation tactics or logical fallacies identified in content, **so that** I can recognize them elsewhere and become a more critical consumer of information.

**Maps to**: AKEL (Bubble Detection), Section 5 (Automated Risk Scoring)

### UN-11: Filtered Research

**As** a researcher, **I want** to filter content by verification status, confidence levels, and source quality, **so that** I can work only with reliable information appropriate for my research needs.

**Maps to**: FR1 (Claim Classification), Section 4.4 (Confidence Scoring), NFR1 (Performance)

## 5. Taking Action

### UN-12: Submit Unchecked Claims

**As** a reader who finds unchecked claims, **I want** to submit them for verification, **so that** I can help expand fact-checking coverage and contribute to the knowledge base.

**Maps to**: FR1 (Claim Intake), Section 1.1 (Reader role)

### UN-13: Cite FactHarbor Verdicts

**As** a content creator, **I want** to cite FactHarbor verdicts when sharing content, **so that** I can add credibility to what I publish and help my audience distinguish fact from speculation.

**Maps to**: FR7 (Automated Verdicts), NFR3 (Transparency - exportable data)

## 6. Professional Use

### UN-14: API Access for Integration

**As** a journalist/researcher, **I want** API access to verification data and claim histories, **so that** I can integrate fact-checking into my professional workflow without manual lookups.

**Maps to**: Architecture (REST API), NFR2 (Scalability), FR11 (Audit Trail)

## 7. Understanding Evolution & Trust Labels

### UN-15: Verdict Evolution Timeline

> **Warning**
>
> **Status:** Deferred (Not in V1.0)
>
> Full verdict evolution timeline has been **dropped from V1.0**. The system tracks UCM config versions and per-job config snapshots. Full evolution tracking is deferred to future releases.

**As** an article reader, **I want** to see how a claim's verdict has evolved over time with clear timestamps, **so that** I can understand whether the current assessment is stable or recently changed based on new evidence.

**Maps to**: \~~FR8 (Deferred)\~~, Data Model (UCM config tracking), NFR3 (Transparency)

### UN-16: Analysis Origin and Review Status

**As** an article reader, **I want** to know how the verdict was generated (AI pipeline, configuration version) and whether expert input was involved, **so that** I can gauge the appropriate level of trust and understand the analysis process used.

**Maps to**: AKEL (Content States), Section 5 (Risk Tiers), Data Model (AuthorType field)

## 8. User Need → Requirements Mapping Summary

This section provides a consolidated view of how user needs drive system requirements.

<span id="8-1-functional-requirements-coverage"></span>

### 8.1 Functional Requirements Coverage

| FR#  | Requirement                   | Fulfills User Needs                  |
|------|-------------------------------|--------------------------------------|
| FR1  | Claim Intake                  | UN-2, UN-4, UN-12                    |
| FR4  | Boundary Generation           | UN-2, UN-3                           |
| FR5  | Evidence Linking              | UN-5, UN-7                           |
| FR6  | Boundary Comparison           | UN-3, UN-8                           |
| FR7  | Automated Verdicts            | UN-1, UN-2, UN-3, UN-4, UN-13, UN-17 |
| FR8  | Time Evolution                | UN-15                                |
| FR11 | Audit Trail                   | UN-14, UN-16                         |
| FR12 | Two-Panel Summary View        | UN-3                                 |
| FR13 | In-Article Claim Highlighting | UN-17                                |

<span id="8-2-non-functional-requirements-coverage"></span>

### 8.2 Non-Functional Requirements Coverage

| NFR# | Requirement | Fulfills User Needs |
|----|----|----|
| NFR1 | Performance | UN-4 (fast fact-checking), UN-11 (responsive filtering), UN-17 (real-time highlighting) |
| NFR2 | Scalability | UN-14 (API access at scale) |
| NFR3 | Transparency | UN-1, UN-7, UN-9, UN-13, UN-15 |

<span id="8-3-akel-system-coverage"></span>

### 8.3 AKEL System Coverage

| AKEL Component                | Fulfills User Needs                       |
|-------------------------------|-------------------------------------------|
| Quality Gates                 | UN-9 (methodology transparency)           |
| Contradiction Search (Gate 2) | UN-8 (understanding disagreement)         |
| Bubble Detection              | UN-10 (manipulation tactics)              |
| Content States                | UN-16 (Analysis origin and review status) |
| Risk Tiers                    | UN-16 (appropriate review level)          |

<span id="8-4-data-model-coverage"></span>

### 8.4 Data Model Coverage

| Entity | Fulfills User Needs |
|----|----|
| Source (with track_record_score) | UN-5, UN-6 (source reliability) |
| ClaimAssessmentBoundary | UN-2, UN-3, UN-8 (context-dependent truth) |
| Verdict (with likelihood_range, uncertainty_factors) | UN-1, UN-2, UN-3, UN-8 (detailed assessment) |
| UCM config snapshots | UN-15 (evolution timeline) |
| AuthorType field | UN-16 (AI vs. human status) |

## 9. User Need Gaps & Future Considerations

This section identifies user needs that may emerge as the platform matures:

**Potential Future Needs**:

-   **Collaborative annotation**: Users want to discuss verdicts with others
-   **Personal tracking**: Users want to track claims they're following
-   **Custom alerts**: Users want notifications when tracked claims are updated
-   **Export capabilities**: Users want to export claim analyses for their own documentation
-   **Comparative analysis**: Users want to compare how different fact-checkers rate the same claim

**When to address**: These needs should be considered when:

1.  User feedback explicitly requests them
2.  Usage metrics show users attempting these workflows
3.  Competitive analysis shows these as differentiators

**Principle**: Start simple (current User Needs), add complexity only when metrics prove necessity.

## 10. Related Pages

-   [Requirements](../index.md) - Parent page with roles, rules, and functional requirements
-   [Architecture](../../specification/architecture/index.md) - How requirements are implemented
-   [Data Model](../../specification/data-model/index.md) - Data structures supporting user needs
-   [AKEL (Historical)](../../../akel-pipeline.md) - Original AI engine summary
-   [Workflows](../../specification/workflows/index.md) - User interaction workflows

<span id="additional-user-needs-v0-9-70"></span>

## Additional User Needs (V0.9.70)

### UN-26: Search Engine Visibility

**As a** content consumer **I want** FactHarbor analyses to appear in Google search results **So that** I can find fact-checks when searching

**Requirements:** FR44 (ClaimReview schema)

### UN-27: Visual Claim Verification

**As a** social media user **I want** to verify images shared with claims **So that** I can detect manipulated photos

**Requirements:** FR46 (Image Verification)

### UN-28: Safe Contribution Environment

**As a** fact-checking contributor **I want** protection from harassment **So that** I can contribute without fear

**Requirements:** FR48 (Safety Framework)
