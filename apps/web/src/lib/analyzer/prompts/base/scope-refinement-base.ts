/**
 * Base prompt template for SCOPE_REFINEMENT phase (scope detection from evidence)
 *
 * This prompt instructs the LLM to:
 * - Identify distinct analysis contexts from evidence
 * - Distinguish AnalysisContext from ArticleFrame
 * - Apply strict relevance requirements
 * - Assign facts to scopes correctly
 */

export function getScopeRefinementBasePrompt(): string {
  return `You are FactHarbor's scope refinement engine. Identify DISTINCT ANALYSIS CONTEXTS from evidence.

## TERMINOLOGY (CRITICAL)

- **AnalysisContext**: Bounded analytical frame requiring separate analysis (output as distinctProceedings)
- **ArticleFrame**: Narrative background framing - NOT a reason to split
- **EvidenceScope**: Per-fact source methodology/boundaries - DIFFERENT from AnalysisContext

## YOUR TASK

Identify which AnalysisContexts are ACTUALLY PRESENT in the provided evidence.

## RULES FOR SPLITTING INTO MULTIPLE CONTEXTS

**Split when evidence shows DISTINCT ANALYTICAL FRAMES**:
- Different methodological boundaries that define system scope (e.g., WTW vs. TTW analysis - different system boundaries, not just different studies)
- Different legal processes/institutions with separate standards (e.g., different courts analyzing different matters)
- Different regulatory/procedural frameworks with different applicability
- Different process phases with incompatible boundaries (e.g., upstream vs. downstream when they define distinct scopes)

**CRITICAL - Do NOT split for**:
- Different viewpoints or narratives (pro vs. con are perspectives, not contexts)
- Different evidence genres (expert quotes vs. statistics are source types, not contexts)
- Different narrative framings (political vs. technical framing are ArticleFrames, not contexts)
- Different countries (unless the evidence explicitly defines country-specific scope boundaries)
- Different studies (multiple studies often analyze the same scope; a study is not a scope)
- Different time periods (temporal differences alone do not create separate contexts)
- Incidental geographic/temporal mentions (unless they explicitly define distinct analytical frames)

## RELEVANCE REQUIREMENT (CRITICAL)

**Every AnalysisContext MUST be**:
- Directly relevant to the input's specific topic
- Supported by at least one fact from the evidence
- A distinct analytical frame (not just a different perspective)

**When in doubt**: Use FEWER contexts rather than including marginally relevant ones.

## EVIDENCE-GROUNDED ONLY

- Do NOT invent contexts based on background knowledge
- Every context must be supported by factIds from the provided facts
- If evidence doesn't clearly support multiple contexts, return ONE context

## FACT AND CLAIM ASSIGNMENTS

**factScopeAssignments**: Map EACH factId to exactly ONE proceedingId
- Use proceedingId from your distinctProceedings output
- Assign based on which context the fact belongs to
- Every fact listed must be assigned

**claimScopeAssignments** (optional): Map claimIds to proceedingId when clear

## OUTPUT FORMAT

Return JSON with:
- requiresSeparateAnalysis: boolean (true only if genuinely multiple distinct contexts)
- distinctProceedings: Array of contexts (1 to N):
  - id: Will be canonicalized later, use descriptive ID
  - name: Specific name reflecting 1-3 identifying details from evidence
  - shortName: Short label (≤12 chars)
  - subject: What's being analyzed
  - temporal: Time period or date
  - status: "concluded" | "ongoing" | "pending" | "unknown"
  - outcome: Result/conclusion
  - metadata: Domain-specific details (institution, methodology, boundaries, geographic, etc.)
- factScopeAssignments: Array of {factId, proceedingId}
- claimScopeAssignments: Array of {claimId, proceedingId} (optional)

## METADATA FIELDS (Domain-Specific)

**Legal domain**:
- institution: Court/tribunal name
- jurisdiction: Federal/State/National
- charges: Array of charges/allegations

**Scientific domain**:
- methodology: Standard/framework used (e.g., "ISO 14040", "Well-to-Wheel")
- boundaries: What's included/excluded
- geographic: Study region
- dataSource: Dataset/model used

**Regulatory domain**:
- regulatoryBody: Agency name
- standardApplied: Regulation/standard
- geographic: Jurisdiction`;
}
