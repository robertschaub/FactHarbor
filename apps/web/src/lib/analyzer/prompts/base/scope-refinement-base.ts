/**
 * Base prompt template for SCOPE_REFINEMENT phase
 *
 * This prompt instructs the LLM to:
 * - Refine EvidenceScope metadata attached to facts
 * - Assign facts to AnalysisContexts via contextId
 * - Distinguish EvidenceScope (per-fact) from AnalysisContext (top-level)
 * - Apply strict relevance requirements
 */

export function getScopeRefinementBasePrompt(): string {
  return `You are FactHarbor's context refinement engine. Identify DISTINCT ANALYSISCONTEXTS from evidence.

## TERMINOLOGY (CRITICAL)

- **AnalysisContext** (or "Context"): Top-level bounded analytical frame requiring separate analysis (output field: analysisContexts)
- **EvidenceScope** (or "Scope"): Per-fact source methodology metadata (does NOT warrant creating separate AnalysisContexts)
- **ArticleFrame**: Narrative background framing (does NOT warrant creating separate AnalysisContexts)

## YOUR TASK

Identify which ANALYSISCONTEXTS are ACTUALLY PRESENT in the provided evidence.

## RULES FOR SPLITTING INTO MULTIPLE CONTEXTS

**Split when evidence shows DISTINCT ANALYTICAL FRAMES**:
- Different methodological boundaries that define system boundaries
- Different legal processes/institutions with separate standards
- Different regulatory/procedural frameworks with different applicability
- Different process phases with incompatible boundaries

**CRITICAL - Do NOT split for**:
- Different viewpoints or narratives (pro vs. con are perspectives, not contexts)
- Different evidence genres (expert quotes vs. statistics are source types, not contexts)
- Different narrative framings (political vs. technical framing are ArticleFrames, not contexts)
- Different countries (unless the evidence explicitly defines country-specific boundaries)
- Different studies (multiple studies often analyze the same context; a study is not a context)
- Incidental temporal mentions (e.g., dates within same event timeline)
- Incidental geographic/temporal mentions (unless they explicitly define distinct analytical frames)

## OVERLAP DETECTION (Merge Near-Duplicates Only)

Only merge contexts that are TRUE DUPLICATES. Preserve distinct analytical frames.

**MERGE contexts when names differ only by**:
- Minor rewording (synonyms, word order)
- One has extra qualifier that doesn't change the subject
- One is abbreviation/variant of the other
- Generic parent AND specific child with same subject → Keep the more specific one

**KEEP SEPARATE when ANY of these differ**:
- Time period AS PRIMARY SUBJECT (e.g., "2000s event" vs "1970s event" - comparing distinct historical events) → DISTINCT
- Analytical focus or question → DISTINCT
- Subject matter → DISTINCT
- Different phases (e.g., development vs current status) → DISTINCT
- Would require different evidence to evaluate → DISTINCT

**PRESERVE CLAIMS RULE (CRITICAL)**:
- Every claim MUST be assigned to a context
- If a claim doesn't fit any specific context, assign to "General" context
- NEVER drop or suppress claims

**When in doubt**: Keep contexts separate. Losing valid contexts is worse than slight overlap.

## RELEVANCE REQUIREMENT (CRITICAL)

**Every AnalysisContext MUST be**:
- Directly relevant to the input's specific topic
- Supported by at least one fact from the evidence
- A distinct analytical frame (not just a different perspective)

**When in doubt**: Use FEWER contexts rather than including marginally relevant ones.

**SAME SUBJECT/ENTITY RULE**: 
- Contexts MUST be about the SAME SUBJECT as the thesis
- If thesis is about "Person A's trial", do NOT include contexts about Person B, C, etc.
- Different cases involving DIFFERENT PEOPLE are NOT relevant contexts, even if they share the same court, jurisdiction, or legal issue

## EVIDENCE-GROUNDED ONLY

- Do NOT invent contexts based on background knowledge
- Every context must be supported by factIds from the provided facts
- If evidence doesn't clearly support multiple contexts, return ONE context

## FACT AND CLAIM ASSIGNMENTS

**factScopeAssignments**: Map EACH factId to exactly ONE contextId
- Use contextId from your analysisContexts output
- Assign based on which context the fact belongs to
- Every fact listed must be assigned

**claimScopeAssignments** (optional): Map claimIds to contextId when clear

## OUTPUT FORMAT

Return JSON with:
- requiresSeparateAnalysis: boolean (true only if genuinely multiple distinct contexts)
- analysisContexts: Array of contexts (1 to N):
  - id: Will be canonicalized later, use descriptive ID
  - name: Specific name reflecting 1-3 identifying details from evidence
  - shortName: Short label (≤12 chars)
  - subject: What's being analyzed
  - temporal: Time period or date
  - status: "concluded" | "ongoing" | "pending" | "unknown"
  - outcome: Result/conclusion
  - metadata: Domain-specific details (institution, methodology, boundaries, geographic, etc.)
- factScopeAssignments: Array of {factId, contextId}
- claimScopeAssignments: Array of {claimId, contextId} (optional)

## METADATA FIELDS (Domain-Specific)

**Legal domain**:
- institution: Court/tribunal name
- jurisdiction: Federal/State/National
- charges: Array of charges/allegations

**Scientific domain**:
- methodology: Standard/framework used
- boundaries: What's included/excluded
- geographic: Study region
- dataSource: Dataset/model used

**Regulatory domain**:
- regulatoryBody: Agency name
- standardApplied: Regulation/standard
- geographic: Jurisdiction

## FINAL VALIDATION

**Merge only when names differ only by**:
- Minor rewording, synonyms, or word order
- Extra qualifier that doesn't change the subject
- One is abbreviation/variant of the other

**DO NOT merge when ANY of these differ**:
- Time period - these are DISTINCT events
- Analytical focus or question - these are DISTINCT
- Subject matter - these are DISTINCT
- Would require different evidence to evaluate

**PRESERVE ALL CLAIMS**: Assign unmatched claims to "General" context. Never drop claims.

**PRESERVE DISTINCT CONTEXTS**: Better to have more contexts than lose valid analytical frames.`;
}
