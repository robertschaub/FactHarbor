# POC Requirements

> **Info**
>
> **POC1 Architecture:** 3-stage AKEL pipeline (Extract → Analyze → Holistic) with Redis caching, credit tracking, and LLM abstraction layer.
>
> See [POC1 API Specification](api-and-schemas/index.md) for complete technical details.

**Status:** ✅ Approved for Development **Version:** 2.0 (Updated after Specification Cross-Check) **Goal:** Prove that AI can extract claims and determine verdicts automatically without human intervention

## 1. POC Overview

<span id="1-1-what-poc-tests"></span>

### 1.1 What POC Tests

**Core Question:**

> Can AI automatically extract factual claims from articles and evaluate them with reasonable verdicts?

**What we're proving:**

-   AI can identify factual claims from text
-   AI can evaluate those claims and produce verdicts
-   Output is comprehensible and useful
-   Fully automated approach is viable

**What we're NOT testing:**

-   Scenario generation (deferred to POC2)
-   Evidence display (deferred to POC2)
-   Production scalability
-   Perfect accuracy
-   Complete feature set

<span id="1-2-scenarios-deferred-to-poc2"></span>

### 1.2 Scenarios Deferred to POC2

**Intentional Simplification:**

Scenarios are a core component of the full FactHarbor system (Claims → Scenarios → Evidence → Verdicts), but are **deliberately excluded from POC1**.

**Rationale:**

-   **POC1 tests:** Can AI extract claims and generate verdicts?
-   **POC2 will add:** Scenario generation and management
-   **Open questions remain:** Should scenarios be separate entities? How are they sequenced with evidence gathering? What's the optimal workflow?

**Design Decision:**

Prove basic AI capability first, then add scenario complexity based on POC1 learnings. This is good engineering: test the hardest part (AI fact-checking) before adding architectural complexity.

**No Risk:**

Scenarios are additive complexity, not foundational. Deferring them to POC2 allows:

-   Faster POC1 validation
-   Learning from POC1 to inform scenario design
-   Iterative approach: fail fast if basic AI doesn't work
-   Flexibility to adjust scenario architecture based on POC1 insights

**Full System Workflow (Future):**

```
Claims → Scenarios → Evidence → Verdicts
```

**POC1 Simplified Workflow:**

```
Claims → Verdicts (scenarios implicit in reasoning)
```

## 2. POC Output Specification

<span id="2-1-component-1-analysis-summary-context-aware"></span>

### 2.1 Component 1: ANALYSIS SUMMARY (Context-Aware)

**What:** Context-aware overview that considers both individual claims AND their relationship to the article's main argument

**Length:** 4-6 sentences

**Content (Required Elements):**

1.  **Article's main thesis/claim** - What is the article trying to argue or prove?
2.  **Claim count and verdicts** - How many claims analyzed, distribution of verdicts
3.  **Central vs. supporting claims** - Which claims are central to the article's argument?
4.  **Relationship assessment** - Do the claims support the article's conclusion?
5.  **Overall credibility** - Final assessment considering claim importance

**Critical Innovation:**

POC1 tests whether AI can understand that **article credibility ≠ simple average of claim verdicts**. An article might:

-   Make accurate supporting facts but draw unsupported conclusions
-   Have one false central claim that invalidates the whole argument
-   Misframe accurate information to mislead

**Good Example (Context-Aware):**

```
This article argues that coffee cures cancer based on its antioxidant 
content. We analyzed 3 factual claims: 2 about coffee's chemical 
properties are well-supported, but the main causal claim is refuted 
by current evidence. The article confuses correlation with causation. 
Overall assessment: MISLEADING - makes an unsupported medical claim 
despite citing some accurate facts.
```

**Poor Example (Simple Aggregation - Don't Do This):**

```
This article makes 3 claims. 2 are well-supported and 1 is refuted.
Overall assessment: mostly accurate (67% accurate).
```

↑ This misses that the refuted claim IS the article's main point!

**What POC1 Tests:**

Can AI identify and assess:

-   ✅ The article's main thesis/conclusion?
-   ✅ Which claims are central vs. supporting?
-   ✅ Whether the evidence supports the conclusion?
-   ✅ Overall credibility considering logical structure?

**If AI Cannot Do This:**

That's valuable to learn in POC1! We'll:

-   Note as limitation
-   Fall back to simple aggregation with warning
-   Design explicit article-level analysis for POC2

<span id="2-2-component-2-claims-identification"></span>

### 2.2 Component 2: CLAIMS IDENTIFICATION

**What:** List of factual claims extracted from article **Format:** Numbered list **Quantity:** 3-5 claims **Requirements:**

-   Factual claims only (not opinions/questions)
-   Clearly stated
-   Automatically extracted by AI

**Example:**

```
CLAIMS IDENTIFIED:

[1] Coffee reduces diabetes risk by 30%
[2] Coffee improves heart health
[3] Decaf has same benefits as regular
[4] Coffee prevents Alzheimer's completely
```

<span id="2-3-component-3-claims-verdicts"></span>

### 2.3 Component 3: CLAIMS VERDICTS

**What:** Verdict for each claim identified **Format:** Per claim structure

**Required Elements:**

-   **Verdict Label:** \~~WELL-SUPPORTED / PARTIALLY SUPPORTED / UNCERTAIN / REFUTED\~~

***Current Implementation (v2.6.33):** 7-point symmetric scale:*

-   &#32;
    -   TRUE (86-100%) / MOSTLY-TRUE (72-85%) / LEANING-TRUE (58-71%)
    -   MIXED (43-57%, high confidence) / UNVERIFIED (43-57%, low confidence)
    -   LEANING-FALSE (29-42%) / MOSTLY-FALSE (15-28%) / FALSE (0-14%)
-   **Confidence Score:** 0-100%
-   **Brief Reasoning:** 1-3 sentences explaining why
-   **Risk Tier:** A (High) / B (Medium) / C (Low) - for demonstration

**Example:**

```
VERDICTS:

[1] WELL-SUPPORTED (85%) [Risk: C]
Multiple studies confirm 25-30% risk reduction with regular consumption.

[2] UNCERTAIN (65%) [Risk: B]
Evidence is mixed. Some studies show benefits, others show no effect.

[3] PARTIALLY SUPPORTED (60%) [Risk: C]
Some benefits overlap, but caffeine-related benefits are reduced in decaf.

[4] REFUTED (90%) [Risk: B]
No evidence for complete prevention. Claim is significantly overstated.
```

**Risk Tier Display:**

-   **Tier A (Red):** High Risk - Medical/Legal/Safety/Elections
-   **Tier B (Yellow):** Medium Risk - Policy/Science/Causality
-   **Tier C (Green):** Low Risk - Facts/Definitions/History

**Note:** Risk tier shown for demonstration purposes in POC. Full system uses risk tiers to determine review workflow.

<span id="2-4-component-4-article-summary-optional"></span>

### 2.4 Component 4: ARTICLE SUMMARY (Optional)

**What:** Brief summary of original article content **Length:** 3-5 sentences **Tone:** Neutral (article's position, not FactHarbor's analysis)

**Example:**

```
ARTICLE SUMMARY:

Health News Today article discusses coffee benefits, citing studies 
on diabetes and Alzheimer's. Author highlights research linking coffee 
to disease prevention. Recommends 2-3 cups daily for optimal health.
```

<span id="2-5-component-5-usage-statistics-cost-tracking"></span>

### 2.5 Component 5: USAGE STATISTICS (Cost Tracking)

**What:** LLM usage metrics for cost optimization and scaling decisions

**Purpose:**

-   Understand cost per analysis
-   Identify optimization opportunities
-   Project costs at scale
-   Inform architecture decisions

**Display Format:**

```
USAGE STATISTICS:
• Article: 2,450 words (12,300 characters)
• Input tokens: 15,234
• Output tokens: 892
• Total tokens: 16,126
• Estimated cost: $0.24 USD
• Response time: 8.3 seconds
• Cost per claim: $0.048
• Model: claude-sonnet-4-20250514
```

**Why This Matters:**

At scale, LLM costs are critical:

-   10,000 articles/month ≈ \$200-500/month
-   100,000 articles/month ≈ \$2,000-5,000/month
-   Cost optimization can reduce expenses 30-50%

**What POC1 Learns:**

-   How cost scales with article length
-   Prompt optimization opportunities (caching, compression)
-   Output verbosity tradeoffs
-   Model selection strategy (FAST vs. REASONING roles)
-   Article length limits (if needed)

**Implementation:**

-   Claude API already returns usage data
-   No extra API calls needed
-   Display to user + log for aggregate analysis
-   Test with articles of varying lengths

**Critical for GO/NO-GO:** Unit economics must be viable at scale!

<span id="2-6-total-output-size"></span>

### 2.6 Total Output Size

**Combined:** ~220-350 words

-   Analysis Summary (Context-Aware): 60-90 words (4-6 sentences)
-   Claims Identification: 30-50 words
-   Claims Verdicts: 100-150 words
-   Article Summary: 30-50 words (optional)

**Note:** Analysis summary is slightly longer (4-6 sentences vs. 3-5) to accommodate context-aware assessment of article structure and logical reasoning.

<span id="3-what-s-not-in-poc-scope"></span>

## 3. What's NOT in POC Scope

<span id="3-1-feature-exclusions"></span>

### 3.1 Feature Exclusions

The following are **explicitly excluded** from POC:

**Content Features:**

-   ❌ Scenarios (deferred to POC2)
-   ❌ Evidence display (supporting/opposing lists)
-   ❌ Source links (clickable references)
-   ❌ Detailed reasoning chains
-   ❌ Source quality ratings (shown but not detailed)
-   ❌ Contradiction detection (basic only)
-   ❌ Risk assessment (shown but not workflow-integrated)

**Platform Features:**

-   ❌ User accounts / authentication
-   ❌ Saved history
-   ❌ Search functionality
-   ❌ Claim comparison
-   ❌ User contributions
-   ❌ Commenting system
-   ❌ Social sharing

**Technical Features:**

-   ❌ Browser extensions
-   ❌ Mobile apps
-   ❌ API endpoints
-   ❌ Webhooks
-   ❌ Export features (PDF, CSV)

**Quality Features:**

-   ❌ Accessibility (WCAG compliance)
-   ❌ Multilingual support
-   ❌ Mobile optimization
-   ❌ Media verification (images/videos)

**Production Features:**

-   ❌ Security hardening
-   ❌ Privacy compliance (GDPR)
-   ❌ Terms of service
-   ❌ Monitoring/logging
-   ❌ Error tracking
-   ❌ Analytics
-   ❌ A/B testing

## 4. POC Simplifications vs. Full System

<span id="4-1-architecture-comparison"></span>

### 4.1 Architecture Comparison

**POC Architecture (Simplified):**

```
User Input → Single AKEL Call → Output Display
 (all processing)
```

**Full System Architecture:**

```
User Input → Claim Extractor → Claim Classifier → Scenario Generator 
→ Evidence Summarizer → Contradiction Detector → Verdict Generator 
→ Quality Gates → Publication → Output Display
```

**Key Differences:**

| Aspect | POC1 | Full System |
|----|----|----|
| Processing | Single API call | Multi-component pipeline |
| Scenarios | None (implicit) | Explicit entities with versioning |
| Evidence | Basic retrieval | Comprehensive with quality scoring |
| Quality Gates | Simplified (4 basic checks) | Full validation infrastructure |
| Workflow | 3 steps (input/process/output) | 6 phases with gates |
| Data Model | Stateless (no database) | PostgreSQL + Redis + S3 |
| Architecture | Single prompt to Claude | AKEL Orchestrator + Components |

<span id="4-2-workflow-comparison"></span>

### 4.2 Workflow Comparison

**POC1 Workflow:**

1.  User submits text/URL
2.  Single AKEL call (all processing in one prompt)
3.  Display results

**Total: 3 steps, ~10-18 seconds**

**Full System Workflow:**

1.  **Claim Submission** (extraction, normalization, clustering)
2.  **Scenario Building** (definitions, assumptions, boundaries)
3.  **Evidence Handling** (retrieval, assessment, linking)
4.  **Verdict Creation** (synthesis, reasoning, approval)
5.  **Public Presentation** (summaries, landscapes, deep dives)
6.  **Time Evolution** (versioning, re-evaluation triggers)

**Total: 6 phases with quality gates, ~10-30 seconds**

<span id="4-3-why-poc-is-simplified"></span>

### 4.3 Why POC is Simplified

**Engineering Rationale:**

1.  **Test core capability first:** Can AI do basic fact-checking without humans?
2.  **Fail fast:** If AI can't generate reasonable verdicts, pivot early
3.  **Learn before building:** POC1 insights inform full architecture
4.  **Iterative approach:** Add complexity only after validating foundations
5.  **Resource efficiency:** Don't build full system if core concept fails

**Acceptable Trade-offs:**

-   ✅ POC proves AI capability (most risky assumption)
-   ✅ POC validates user comprehension (can people understand output?)
-   ❌ POC doesn't validate full workflow (test in Beta)
-   ❌ POC doesn't validate scale (test in Beta)
-   ❌ POC doesn't validate scenario architecture (design in POC2)

<span id="4-4-gap-between-poc1-and-poc2-beta"></span>

### 4.4 Gap Between POC1 and POC2/Beta

**What needs to be built for POC2:**

-   Scenario generation component
-   Evidence Model structure (full)
-   Scenario-evidence linking
-   Multi-interpretation comparison
-   Truth landscape visualization

**What needs to be built for Beta:**

-   Multi-component AKEL pipeline
-   Quality gate infrastructure
-   Review workflow system
-   Audit sampling framework
-   Production data model
-   Federation architecture (Release 1.0)

**POC1 → POC2 is significant architectural expansion.**

## 5. Publication Mode & Labeling

<span id="5-1-poc-publication-mode"></span>

### 5.1 POC Publication Mode

**Mode:** Mode 2 (AI-Generated, No Prior Human Review)

Per FactHarbor Specification Section 11 "POC v1 Behavior":

-   Produces public AI-generated output
-   No human approval gate
-   Clear AI-Generated labeling
-   All quality gates active (simplified)
-   Risk tier classification shown (demo)

<span id="5-2-user-facing-labels"></span>

### 5.2 User-Facing Labels

**Primary Label (top of analysis):**

```
╔════════════════════════════════════════════════════════════╗
║ [AI-GENERATED - POC/DEMO] ║
║ ║
║ This analysis was produced entirely by AI and has not ║
║ been human-reviewed. Use for demonstration purposes. ║
║ ║
║ Source: AI/AKEL v1.0 (POC) ║
║ Review Status: Not Reviewed (Proof-of-Concept) ║
║ Quality Gates: 4/4 Passed (Simplified) ║
║ Last Updated: [timestamp] ║
╚════════════════════════════════════════════════════════════╝
```

**Per-Claim Risk Labels:**

-   **\[Risk: A\]** 🔴 High Risk (Medical/Legal/Safety)
-   **\[Risk: B\]** 🟡 Medium Risk (Policy/Science)
-   **\[Risk: C\]** 🟢 Low Risk (Facts/Definitions)

<span id="5-3-display-requirements"></span>

### 5.3 Display Requirements

**Must Show:**

-   AI-Generated status (prominent)
-   POC/Demo disclaimer
-   Risk tier per claim
-   Confidence scores (0-100%)
-   Quality gate status (passed/failed)
-   Timestamp

**Must NOT Claim:**

-   Human review
-   Production quality
-   Medical/legal advice
-   Authoritative verdicts
-   Complete accuracy

<span id="5-4-mode-2-vs-full-system-publication"></span>

### 5.4 Mode 2 vs. Full System Publication

| Element       | POC Mode 2         | Full System Mode 2  | Full System Mode 3 |
|---------------|--------------------|---------------------|--------------------|
| Label         | AI-Generated (POC) | AI-Generated        | AKEL-Generated     |
| Review        | None               | None                | Human-Reviewed     |
| Quality Gates | 4 (simplified)     | 6 (full)            | 6 (full) + Human   |
| Audit         | None (POC)         | Sampling (5-50%)    | Pre-publication    |
| Risk Display  | Demo only          | Workflow-integrated | Validated          |
| User Actions  | View only          | Flag for review     | Trust rating       |

## 6. Quality Gates (Simplified Implementation)

<span id="6-1-overview"></span>

### 6.1 Overview

Per FactHarbor Specification Section 6, all AI-generated content must pass quality gates before publication. POC implements **simplified versions** of the 4 mandatory gates.

**Full System Has 4 Gates:**

1.  Source Quality
2.  Contradiction Search (MANDATORY)
3.  Uncertainty Quantification
4.  Structural Integrity

**POC Implements Simplified Versions:**

-   Focus on demonstrating concept
-   Basic implementations sufficient
-   Failures displayed to user (not blocking)
-   Full system has comprehensive validation

<span id="6-2-gate-1-source-quality-basic"></span>

### 6.2 Gate 1: Source Quality (Basic)

**Full System Requirements:**

-   Primary sources identified and accessible
-   Source reliability scored against whitelist
-   Citation completeness verified
-   Publication dates checked
-   Author credentials validated

**POC Implementation:**

-   ✅ At least 2 sources found
-   ✅ Sources accessible (URLs valid)
-   ❌ No whitelist checking
-   ❌ No credential validation
-   ❌ No comprehensive reliability scoring

**Pass Criteria:** ≥2 accessible sources found

**Failure Handling:** Display error message, don't generate verdict

<span id="6-3-gate-2-contradiction-search-basic"></span>

### 6.3 Gate 2: Contradiction Search (Basic)

**Full System Requirements:**

-   Counter-evidence actively searched
-   Reservations and limitations identified
-   Alternative interpretations explored
-   Bubble detection (echo chambers, conspiracy theories)
-   Cross-cultural and international perspectives
-   Academic literature (supporting AND opposing)

**POC Implementation:**

-   ✅ Basic search for counter-evidence
-   ✅ Identify obvious contradictions
-   ❌ No comprehensive academic search
-   ❌ No bubble detection
-   ❌ No systematic alternative interpretation search
-   ❌ No international perspective verification

**Pass Criteria:** Basic contradiction search attempted

**Failure Handling:** Note "limited contradiction search" in output

<span id="6-4-gate-3-uncertainty-quantification-basic"></span>

### 6.4 Gate 3: Uncertainty Quantification (Basic)

**Full System Requirements:**

-   Confidence scores calculated for all claims/verdicts
-   Limitations explicitly stated
-   Data gaps identified and disclosed
-   Strength of evidence assessed
-   Alternative scenarios considered

**POC Implementation:**

-   ✅ Confidence scores (0-100%)
-   ✅ Basic uncertainty acknowledgment
-   ❌ No detailed limitation disclosure
-   ❌ No data gap identification
-   ❌ No alternative scenario consideration (deferred to POC2)

**Pass Criteria:** Confidence score assigned

**Failure Handling:** Show "Confidence: Unknown" if calculation fails

<span id="6-5-gate-4-structural-integrity-basic"></span>

### 6.5 Gate 4: Structural Integrity (Basic)

**Full System Requirements:**

-   No hallucinations detected (fact-checking against sources)
-   Logic chain valid and traceable
-   References accessible and verifiable
-   No circular reasoning
-   Premises clearly stated

**POC Implementation:**

-   ✅ Basic coherence check
-   ✅ References accessible
-   ❌ No comprehensive hallucination detection
-   ❌ No formal logic validation
-   ❌ No premise extraction and verification

**Pass Criteria:** Output is coherent and references are accessible

**Failure Handling:** Display error message

<span id="6-6-quality-gate-display"></span>

### 6.6 Quality Gate Display

**POC shows simplified status:**

```
Quality Gates: 4/4 Passed (Simplified)
✓ Source Quality: 3 sources found
✓ Contradiction Search: Basic search completed
✓ Uncertainty: Confidence scores assigned
✓ Structural Integrity: Output coherent
```

**If any gate fails:**

```
Quality Gates: 3/4 Passed (Simplified)
✓ Source Quality: 3 sources found
✗ Contradiction Search: Search failed - limited evidence
✓ Uncertainty: Confidence scores assigned
✓ Structural Integrity: Output coherent

Note: This analysis has limited evidence. Use with caution.
```

<span id="6-7-simplified-vs-full-system"></span>

### 6.7 Simplified vs. Full System

| Gate | POC (Simplified) | Full System |
|----|----|----|
| Source Quality | ≥2 sources accessible | Whitelist scoring, credentials, comprehensiveness |
| Contradiction | Basic search | Systematic academic + media + international |
| Uncertainty | Confidence % assigned | Detailed limitations, data gaps, alternatives |
| Structural | Coherence check | Hallucination detection, logic validation, premise check |

**POC Goal:** Demonstrate that quality gates are possible, not perfect implementation.

## 7. AKEL Architecture Comparison

<span id="7-1-poc-akel-simplified"></span>

### 7.1 POC AKEL (Simplified)

**Implementation:**

-   Single provider API call (REASONING model)
-   One comprehensive prompt
-   All processing in single request
-   No separate components
-   No orchestration layer

**Prompt Structure:**

```
Task: Analyze this article and provide:

1. Extract 3-5 factual claims
2. For each claim:
 - Determine verdict (WELL-SUPPORTED/PARTIALLY/UNCERTAIN/REFUTED)
 - Assign confidence score (0-100%)
 - Assign risk tier (A/B/C)
 - Write brief reasoning (1-3 sentences)
3. Generate analysis summary (3-5 sentences)
4. Generate article summary (3-5 sentences)
5. Run basic quality checks

Return as structured JSON.
```

**Processing Time:** 10-18 seconds (estimate)

<span id="7-2-full-system-akel-production"></span>

### 7.2 Full System AKEL (Production)

**Architecture:**

```
AKEL Orchestrator
├── Claim Extractor
├── Claim Classifier (with risk tier assignment)
├── Scenario Generator
├── Evidence Summarizer
├── Contradiction Detector
├── Quality Gate Validator
├── Audit Sampling Scheduler
└── Federation Sync Adapter (Release 1.0+)
```

**Processing:**

-   Parallel processing where possible
-   Separate component calls
-   Quality gates between phases
-   Audit sampling selection
-   Cross-node coordination (federated mode)

**Processing Time:** 10-30 seconds (full pipeline)

<span id="7-3-why-poc-uses-single-call"></span>

### 7.3 Why POC Uses Single Call

**Advantages:**

-   ✅ Simpler to implement
-   ✅ Faster POC development
-   ✅ Easier to debug
-   ✅ Proves AI capability
-   ✅ Good enough for concept validation

**Limitations:**

-   ❌ No component reusability
-   ❌ No parallel processing
-   ❌ All-or-nothing (can't partially succeed)
-   ❌ Harder to improve individual components
-   ❌ No audit sampling

**Acceptable Trade-off:**

POC tests "Can AI do this?" not "How should we architect it?"

Full component architecture comes in Beta after POC validates concept.

<span id="7-4-evolution-path"></span>

### 7.4 Evolution Path

**POC1:** Single prompt → Prove concept **POC2:** Add scenario component → Test full pipeline **Beta:** Multi-component AKEL → Production architecture **Release 1.0:** Full AKEL + Federation → Scale

## 8. Functional Requirements

### FR-POC-1: Article Input

**Requirement:** User can submit article for analysis

**Functionality:**

-   Text input field (paste article text, up to 5000 characters)
-   URL input field (paste article URL)
-   "Analyze" button to trigger processing
-   Loading indicator during analysis

**Excluded:**

-   No user authentication
-   No claim history
-   No search functionality
-   No saved templates

**Acceptance Criteria:**

-   User can paste text from article
-   User can paste URL of article
-   System accepts input and triggers analysis

### FR-POC-2: Claim Extraction (Fully Automated)

**Requirement:** AI automatically extracts 3-5 factual claims

**Functionality:**

-   AI reads article text
-   AI identifies factual claims (not opinions/questions)
-   AI extracts 3-5 most important claims
-   System displays numbered list

**Critical:** NO MANUAL EDITING ALLOWED

-   AI selects which claims to extract
-   AI identifies factual vs. non-factual
-   System processes claims as extracted
-   No human curation or correction

**Error Handling:**

-   If extraction fails: Display error message
-   User can retry with different input
-   No manual intervention to fix extraction

**Acceptance Criteria:**

-   AI extracts 3-5 claims automatically
-   Claims are factual (not opinions)
-   Claims are clearly stated
-   No manual editing required

### FR-POC-3: Verdict Generation (Fully Automated)

**Requirement:** AI automatically generates verdict for each claim

**Functionality:**

-   For each claim, AI:
    -   Evaluates claim based on available evidence/knowledge
    -   Determines verdict: \~~WELL-SUPPORTED / PARTIALLY SUPPORTED / UNCERTAIN / REFUTED\~~ *(Now: 7-point scale - see Section 2.3)*
    -   Assigns confidence score (0-100%)
    -   Assigns risk tier (A/B/C)
    -   Writes brief reasoning (1-3 sentences)
-   System displays verdict for each claim

**Critical:** NO MANUAL EDITING ALLOWED

-   AI computes verdicts based on evidence
-   AI generates confidence scores
-   AI writes reasoning
-   No human review or adjustment

**Error Handling:**

-   If verdict generation fails: Display error message
-   User can retry
-   No manual intervention to adjust verdicts

**Acceptance Criteria:**

-   Each claim has a verdict
-   Confidence score is displayed (0-100%)
-   Risk tier is displayed (A/B/C)
-   Reasoning is understandable (1-3 sentences)
-   Verdict is defensible given reasoning
-   All generated automatically by AI

### FR-POC-4: Analysis Summary (Fully Automated)

**Requirement:** AI generates brief summary of analysis

**Functionality:**

-   AI summarizes findings in 3-5 sentences:
    -   How many claims found
    -   Distribution of verdicts
    -   Overall assessment
-   System displays at top of results

**Critical:** NO MANUAL EDITING ALLOWED

**Acceptance Criteria:**

-   Summary is coherent
-   Accurately reflects analysis
-   3-5 sentences
-   Automatically generated

### FR-POC-5: Article Summary (Fully Automated, Optional)

**Requirement:** AI generates brief summary of original article

**Functionality:**

-   AI summarizes article content (not FactHarbor's analysis)
-   3-5 sentences
-   System displays

**Note:** Optional - can skip if time limited

**Critical:** NO MANUAL EDITING ALLOWED

**Acceptance Criteria:**

-   Summary is neutral (article's position)
-   Accurately reflects article content
-   3-5 sentences
-   Automatically generated

### FR-POC-6: Publication Mode Display

**Requirement:** Clear labeling of AI-generated content

**Functionality:**

-   Display Mode 2 publication label
-   Show POC/Demo disclaimer
-   Display risk tiers per claim
-   Show quality gate status
-   Display timestamp

**Acceptance Criteria:**

-   Label is prominent and clear
-   User understands this is AI-generated POC output
-   Risk tiers are color-coded
-   Quality gate status is visible

### FR-POC-7: Quality Gate Execution

**Requirement:** Execute simplified quality gates

**Functionality:**

-   Check source quality (basic)
-   Attempt contradiction search (basic)
-   Calculate confidence scores
-   Verify structural integrity (basic)
-   Display gate results

**Acceptance Criteria:**

-   All 4 gates attempted
-   Pass/fail status displayed
-   Failures explained to user
-   Gates don't block publication (POC mode)

## 9. Non-Functional Requirements

### NFR-POC-1: Fully Automated Processing

**Requirement:** Complete AI automation with zero manual intervention

**Critical Rule:** NO MANUAL EDITING AT ANY STAGE

**What this means:**

-   Claims: AI selects (no human curation)
-   Scenarios: N/A (deferred to POC2)
-   Evidence: AI evaluates (no human selection)
-   Verdicts: AI determines (no human adjustment)
-   Summaries: AI writes (no human editing)

**Pipeline:**

```
User Input → AKEL Processing → Output Display
 ↓
 ZERO human editing
```

**If AI output is poor:**

-   ❌ Do NOT manually fix it
-   ✅ Document the failure
-   ✅ Improve prompts and retry
-   ✅ Accept that POC might fail

**Why this matters:**

-   Tests whether AI can do this without humans
-   Validates scalability (humans can't review every analysis)
-   Honest test of technical feasibility

### NFR-POC-2: Performance

**Requirement:** Analysis completes in reasonable time

**Acceptable Performance:**

-   Processing time: 1-5 minutes (acceptable for POC)
-   Display loading indicator to user
-   Show progress if possible ("Extracting claims...", "Generating verdicts...")

**Not Required:**

-   Production-level speed (\< 30 seconds)
-   Optimization for scale
-   Caching

**Acceptance Criteria:**

-   Analysis completes within 5 minutes
-   User sees loading indicator
-   No timeout errors

### NFR-POC-3: Reliability

**Requirement:** System works for manual testing sessions

**Acceptable:**

-   Occasional errors (\< 20% failure rate)
-   Manual restart if needed
-   Display error messages clearly

**Not Required:**

-   99.9% uptime
-   Automatic error recovery
-   Production monitoring

**Acceptance Criteria:**

-   System works for test demonstrations
-   Errors are handled gracefully
-   User receives clear error messages

### NFR-POC-4: Environment

**Requirement:** Runs on simple infrastructure

**Acceptable:**

-   Single machine or simple cloud setup
-   No distributed architecture
-   No load balancing
-   No redundancy
-   Local development environment viable

**Not Required:**

-   Production infrastructure
-   Multi-region deployment
-   Auto-scaling
-   Disaster recovery

### NFR-POC-5: Cost Efficiency Tracking

**Requirement:** Track and display LLM usage metrics to inform optimization decisions

**Must Track:**

-   Input tokens (article + prompt)
-   Output tokens (generated analysis)
-   Total tokens
-   Estimated cost (USD)
-   Response time (seconds)
-   Article length (words/characters)

**Must Display:**

-   Usage statistics in UI (Component 5)
-   Cost per analysis
-   Cost per claim extracted

**Must Log:**

-   Aggregate metrics for analysis
-   Cost distribution by article length
-   Token efficiency trends

**Purpose:**

-   Understand unit economics
-   Identify optimization opportunities
-   Project costs at scale
-   Inform architecture decisions (caching, model selection, etc.)

**Acceptance Criteria:**

-   ✅ Usage data displayed after each analysis
-   ✅ Metrics logged for aggregate analysis
-   ✅ Cost calculated accurately (Claude API pricing)
-   ✅ Test cases include varying article lengths
-   ✅ POC1 report includes cost analysis section

**Success Target:**

-   Average cost per analysis \< \$0.05 USD
-   Cost scaling behavior understood (linear/exponential)
-   2+ optimization opportunities identified

**Critical:** Unit economics must be viable for scaling decision!

## 10. Technical Architecture

<span id="10-1-system-components"></span>

### 10.1 System Components

**Frontend:**

-   Simple HTML form (text input + URL input + button)
-   Loading indicator
-   Results display page (single page, no tabs/navigation)

**Backend:**

-   Single API endpoint
-   Calls provider API (REASONING model; configured via LLM abstraction)
-   Parses response
-   Returns JSON to frontend

**Data Storage:**

-   None required (stateless POC)
-   Optional: Simple file storage or SQLite for demo examples

**External Services:**

-   Claude API (Anthropic) - required
-   Optional: URL fetch service for article text extraction

<span id="10-2-processing-flow"></span>

### 10.2 Processing Flow

```
1. User submits text or URL
 ↓
2. Backend receives request
 ↓
3. If URL: Fetch article text
 ↓
4. Call Claude API with single prompt:
 "Extract claims, evaluate each, provide verdicts"
 ↓
5. Claude API returns:
 - Analysis summary
 - Claims list
 - Verdicts for each claim (with risk tiers)
 - Article summary (optional)
 - Quality gate results
 ↓
6. Backend parses response
 ↓
7. Frontend displays results with Mode 2 labeling
```

**Key Simplification:** Single API call does entire analysis

<span id="10-3-ai-prompt-strategy"></span>

### 10.3 AI Prompt Strategy

**Single Comprehensive Prompt:**

```
Task: Analyze this article and provide:

1. Identify the article's main thesis/conclusion
 - What is the article trying to argue or prove?
 - What is the primary claim or conclusion?

2. Extract 3-5 factual claims from the article
 - Note which claims are CENTRAL to the main thesis
 - Note which claims are SUPPORTING facts

3. For each claim:
 - Determine verdict (7-point scale: TRUE/MOSTLY-TRUE/LEANING-TRUE/MIXED/UNVERIFIED/LEANING-FALSE/MOSTLY-FALSE/FALSE)
 - Assign confidence score (0-100%)
 - Assign risk tier (A: Medical/Legal/Safety, B: Policy/Science, C: Facts/Definitions)
 - Write brief reasoning (1-3 sentences)

4. Assess relationship between claims and main thesis:
 - Do the claims actually support the article's conclusion?
 - Are there logical leaps or unsupported inferences?
 - Is the article's framing misleading even if individual facts are accurate?

5. Run quality gates:
 - Check: ≥2 sources found
 - Attempt: Basic contradiction search
 - Calculate: Confidence scores
 - Verify: Structural integrity

6. Write context-aware analysis summary (4-6 sentences):
 - State article's main thesis
 - Report claims found and verdict distribution
 - Note if central claims are problematic
 - Assess whether evidence supports conclusion
 - Overall credibility considering claim importance

7. Write article summary (3-5 sentences: neutral summary of article content)

Return as structured JSON with quality gate results.
```

**One prompt generates everything.**

**Critical Addition:**

Steps 1, 2 (marking central claims), 4, and 6 are NEW for context-aware analysis. These test whether AI can distinguish between "accurate facts poorly reasoned" vs. "genuinely credible article."

<span id="10-4-technology-stack-suggestions"></span>

### 10.4 Technology Stack Suggestions

**Frontend:**

-   HTML + CSS + JavaScript (minimal framework)
-   OR: Next.js (if team prefers)
-   Hosted: Local machine OR Vercel/Netlify free tier

**Backend:**

-   Python Flask/FastAPI (simple REST API)
-   OR: Next.js API routes (if using Next.js)
-   Hosted: Local machine OR Railway/Render free tier

**AKEL Integration:**

-   Claude API via Anthropic SDK
-   Model: Provider-default REASONING model or latest available

**Database:**

-   None (stateless acceptable)
-   OR: SQLite if want to store demo examples
-   OR: JSON files on disk

**Deployment:**

-   Local development environment sufficient for POC
-   Optional: Deploy to cloud for remote demos

## 11. Success Criteria

<span id="11-1-minimum-success-poc-passes"></span>

### 11.1 Minimum Success (POC Passes)

**Required for GO decision:**

-   ✅ AI extracts 3-5 factual claims automatically
-   ✅ AI provides verdict for each claim automatically
-   ✅ Verdicts are reasonable (≥70% make logical sense)
-   ✅ Analysis summary is coherent
-   ✅ Output is comprehensible to reviewers
-   ✅ Team/advisors understand the output
-   ✅ Team agrees approach has merit
-   ✅ **Minimal or no manual editing needed** (\< 30% of analyses require manual intervention)
-   ✅ **Cost efficiency acceptable** (average cost per analysis \< \$0.05 USD target)
-   ✅ **Cost scaling understood** (data collected on article length vs. cost)
-   ✅ **Optimization opportunities identified** (≥2 potential improvements documented)

**Quality Definition:**

-   "Reasonable verdict" = Defensible given general knowledge
-   "Coherent summary" = Logically structured, grammatically correct
-   "Comprehensible" = Reviewers understand what analysis means

<span id="11-2-poc-fails-if"></span>

### 11.2 POC Fails If

**Automatic NO-GO if any of these:**

-   ❌ Claim extraction poor (\< 60% accuracy - extracts non-claims or misses obvious ones)
-   ❌ Verdicts nonsensical (\< 60% reasonable - contradictory or random)
-   ❌ Output incomprehensible (reviewers can't understand analysis)
-   ❌ **Requires manual editing for most analyses** (\> 50% need human correction)
-   ❌ Team loses confidence in AI-automated approach

<span id="11-3-quality-thresholds"></span>

### 11.3 Quality Thresholds

**POC quality expectations:**

| Component | Quality Threshold | Definition |
|----|----|----|
| Claim Extraction | ≥70% accuracy | Identifies obvious factual claims, may miss some edge cases |
| Verdict Logic | ≥70% defensible | Verdicts are logical given reasoning provided |
| Reasoning Clarity | ≥70% clear | 1-3 sentences are understandable and relevant |
| Overall Analysis | ≥70% useful | Output helps user understand article claims |

**Analogy:** "B student" quality (70-80%), not "A+" perfection yet

**Not expecting:**

-   100% accuracy
-   Perfect claim coverage
-   Comprehensive evidence gathering
-   Flawless verdicts
-   Production polish

**Expecting:**

-   Reasonable claim extraction
-   Defensible verdicts
-   Understandable reasoning
-   Useful output

## 12. Test Cases

<span id="12-1-test-case-1-simple-factual-claim"></span>

### 12.1 Test Case 1: Simple Factual Claim

**Input:** "Coffee reduces the risk of type 2 diabetes by 30%"

**Expected Output:**

-   Extract claim correctly
-   Provide verdict: WELL-SUPPORTED or PARTIALLY SUPPORTED
-   Confidence: 70-90%
-   Risk tier: C (Low)
-   Reasoning: Mentions studies or evidence

**Success:** Verdict is reasonable and reasoning makes sense

<span id="12-2-test-case-2-complex-news-article"></span>

### 12.2 Test Case 2: Complex News Article

**Input:** News article URL with multiple claims about politics/health/science

**Expected Output:**

-   Extract 3-5 key claims
-   Verdict for each (may vary: some supported, some uncertain, some refuted)
-   Coherent analysis summary
-   Article summary
-   Risk tiers assigned appropriately

**Success:** Claims identified are actually from article, verdicts are reasonable

<span id="12-3-test-case-3-controversial-topic"></span>

### 12.3 Test Case 3: Controversial Topic

**Input:** Article on contested political or scientific topic

**Expected Output:**

-   Balanced analysis
-   Acknowledges uncertainty where appropriate
-   Doesn't overstate confidence
-   Reasoning shows awareness of complexity

**Success:** Analysis is fair and doesn't show obvious bias

<span id="12-4-test-case-4-clearly-false-claim"></span>

### 12.4 Test Case 4: Clearly False Claim

**Input:** Article with obviously false claim (e.g., "The Earth is flat")

**Expected Output:**

-   Extract claim
-   Verdict: REFUTED
-   High confidence (\> 90%)
-   Risk tier: C (Low - established fact)
-   Clear reasoning

**Success:** AI correctly identifies false claim with high confidence

<span id="12-5-test-case-5-genuinely-uncertain-claim"></span>

### 12.5 Test Case 5: Genuinely Uncertain Claim

**Input:** Article with claim where evidence is genuinely mixed

**Expected Output:**

-   Extract claim
-   Verdict: UNCERTAIN
-   Moderate confidence (40-60%)
-   Reasoning explains why uncertain

**Success:** AI recognizes uncertainty and doesn't overstate confidence

<span id="12-6-test-case-6-high-risk-medical-claim"></span>

### 12.6 Test Case 6: High-Risk Medical Claim

**Input:** Article making medical claims

**Expected Output:**

-   Extract claim
-   Verdict: \[appropriate based on evidence\]
-   Risk tier: A (High - medical)
-   Red label displayed
-   Clear disclaimer about not being medical advice

**Success:** Risk tier correctly assigned, appropriate warnings shown

## 13. POC Decision Gate

<span id="13-1-decision-framework"></span>

### 13.1 Decision Framework

After POC testing complete, team makes one of three decisions:

**Option A: GO (Proceed to POC2)**

**Conditions:**

-   AI quality ≥70% without manual editing
-   Basic claim → verdict pipeline validated
-   Internal + advisor feedback positive
-   Technical feasibility confirmed
-   Team confident in direction
-   Clear path to improving AI quality to ≥90%

**Next Steps:**

-   Plan POC2 development (add scenarios)
-   Design scenario architecture
-   Expand to Evidence Model structure
-   Test with more complex articles

**Option B: NO-GO (Pivot or Stop)**

**Conditions:**

-   AI quality \< 60%
-   Requires manual editing for most analyses (\> 50%)
-   Feedback indicates fundamental flaws
-   Cost/effort not justified by value
-   No clear path to improvement

**Next Steps:**

-   **Pivot:** Change to hybrid human-AI approach (accept manual review required)
-   **Stop:** Conclude approach not viable, revisit later

**Option C: ITERATE (Improve POC)**

**Conditions:**

-   Concept has merit but execution needs work
-   Specific improvements identified
-   Addressable with better prompts/approach
-   AI quality between 60-70%

**Next Steps:**

-   Improve AI prompts
-   Test different approaches
-   Re-run POC with improvements
-   Then make GO/NO-GO decision

<span id="13-2-decision-criteria-summary"></span>

### 13.2 Decision Criteria Summary

```
AI Quality < 60% → NO-GO (approach doesn't work)
AI Quality 60-70% → ITERATE (improve and retry)
AI Quality ≥70% → GO (proceed to POC2)
```

## 14. Key Risks & Mitigations

<span id="14-1-risk-ai-quality-not-good-enough"></span>

### 14.1 Risk: AI Quality Not Good Enough

**Likelihood:** Medium-High **Impact:** POC fails

**Mitigation:**

-   Extensive prompt engineering and testing
-   Use best available AI models (role-based selection; configured via LLM abstraction)
-   Test with diverse article types
-   Iterate on prompts based on results

**Acceptance:** This is what POC tests - be ready for failure

<span id="14-2-risk-ai-consistency-issues"></span>

### 14.2 Risk: AI Consistency Issues

**Likelihood:** Medium **Impact:** Works sometimes, fails other times

**Mitigation:**

-   Test with 10+ diverse articles
-   Measure success rate honestly
-   Improve prompts to increase consistency

**Acceptance:** Some variability OK if average quality ≥70%

<span id="14-3-risk-output-incomprehensible"></span>

### 14.3 Risk: Output Incomprehensible

**Likelihood:** Low-Medium **Impact:** Users can't understand analysis

**Mitigation:**

-   Create clear explainer document
-   Iterate on output format
-   Test with non-technical reviewers
-   Simplify language if needed

**Acceptance:** Iterate until comprehensible

<span id="14-4-risk-api-rate-limits-costs"></span>

### 14.4 Risk: API Rate Limits / Costs

**Likelihood:** Low **Impact:** System slow or expensive

**Mitigation:**

-   Monitor API usage
-   Implement retry logic
-   Estimate costs before scaling

**Acceptance:** POC can be slow and expensive (optimization later)

<span id="14-5-risk-scope-creep"></span>

### 14.5 Risk: Scope Creep

**Likelihood:** Medium **Impact:** POC becomes too complex

**Mitigation:**

-   Strict scope discipline
-   Say NO to feature additions
-   Keep focus on core question

**Acceptance:** POC is minimal by design

## 15. POC Philosophy

<span id="15-1-core-principles"></span>

### 15.1 Core Principles

**1. Build Less, Learn More**

-   Minimum features to test hypothesis
-   Don't build unvalidated features
-   Focus on core question only

**2. Fail Fast**

-   Quick test of hardest part (AI capability)
-   Accept that POC might fail
-   Better to discover issues early
-   Honest assessment over optimistic hope

**3. Test First, Build Second**

-   Validate AI can do this before building platform
-   Don't assume it will work
-   Let results guide decisions

**4. Automation First**

-   No manual editing allowed
-   Tests scalability, not just feasibility
-   Proves approach can work at scale

**5. Honest Assessment**

-   Don't cherry-pick examples
-   Don't manually fix bad outputs
-   Document failures openly
-   Make data-driven decisions

<span id="15-2-what-poc-is"></span>

### 15.2 What POC Is

✅ Testing AI capability without humans ✅ Proving core technical concept ✅ Fast validation of approach ✅ Honest assessment of feasibility

<span id="15-3-what-poc-is-not"></span>

### 15.3 What POC Is NOT

❌ Building a product ❌ Production-ready system ❌ Feature-complete platform ❌ Perfectly accurate analysis ❌ Polished user experience

## 16. Success = Clear Path Forward

**If POC succeeds (≥70% AI quality):**

-   ✅ Approach validated
-   ✅ Proceed to POC2 (add scenarios)
-   ✅ Design full Evidence Model structure
-   ✅ Test multi-scenario comparison
-   ✅ Focus on improving AI quality from 70% → 90%

**If POC fails (\< 60% AI quality):**

-   ✅ Learn what doesn't work
-   ✅ Pivot to different approach
-   ✅ OR wait for better AI technology
-   ✅ Avoid wasting resources on non-viable approach

**Either way, POC provides clarity.**

## 17. Related Pages

-   [User Needs](../../requirements/user-needs/index.md)
-   [Requirements](../../requirements/index.md)
-   [Gap Analysis](../../requirements/gapanalysis.md)
-   [Architecture](../architecture/index.md)
-   [AKEL](../../../akel-pipeline.md)
-   [Workflows](../workflows/index.md)

**Document Status:** ✅ Ready for POC Development (Version 2.0 - Updated with Spec Alignment)

### NFR-POC-11: LLM Provider Abstraction (POC1)

**Requirement:** POC1 MUST implement LLM abstraction layer with support for multiple providers.

**POC1 Implementation:**

-   **Primary Provider:** Anthropic Claude API
    -   Stage 1: Provider-default FAST model
    -   Stage 2: Provider-default REASONING model (cached)
    -   Stage 3: Provider-default REASONING model

<!-- -->

-   **Provider Interface:** Abstract LLMProvider interface implemented

<!-- -->

-   **Configuration:** Environment variables for provider selection
    -   &#32;
        ```
        LLM_PRIMARY_PROVIDER=anthropic
        ```

    -   &#32;
        ```
        LLM_STAGE1_MODEL=claude-haiku-4
        ```

    -   &#32;
        ```
        LLM_STAGE2_MODEL=claude-sonnet-3-5
        ```

<!-- -->

-   **Failover:** Basic error handling with cache fallback for Stage 2

<!-- -->

-   **Cost Tracking:** Log provider name and cost per request

**Future (POC2/Beta):**

-   Secondary provider (OpenAI) with automatic failover
-   Admin API for runtime provider switching
-   Cost comparison dashboard
-   Cross-provider output verification

**Success Criteria:**

-   All LLM calls go through abstraction layer (no direct API calls)
-   Provider can be changed via environment variable without code changes
-   Cost tracking includes provider name in logs
-   Stage 2 falls back to cache on provider failure

**Implementation:** See [POC1 API & Schemas Specification](api-and-schemas/index.md) Section 6

**Dependencies:**

-   NFR-14 (Main Requirements)
-   Design Decision 9
-   Architecture Section 2.2

**Priority:** HIGH (P1)

**Rationale:** Even though POC1 uses single provider, abstraction must be in place from start to avoid costly refactoring later.
