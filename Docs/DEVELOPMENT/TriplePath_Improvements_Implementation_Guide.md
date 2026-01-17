# Triple-Path Pipeline Improvements Implementation Guide
**Date**: 2026-01-17
**Status**: Technical Blueprint for Final Hardening

This document provides detailed implementation instructions for resolving regressions and improving performance in the Triple-Path architecture.

---

## 1. Multi-Scope Detection Fix (Monolithic Canonical)

### Issue
The current implementation of `monolithic-canonical.ts` collapses all findings into a single hardcoded scope (`CTX_MAIN`). This reduces the analytical depth compared to the orchestrated pipeline.

### Proposed Fix
Update the `VerdictSchema` and the `generateVerdict` logic to allow the LLM to identify and return distinct analytical frames.

#### Step A: Update Schema
In `apps/web/src/lib/analyzer/monolithic-canonical.ts`, update the `VerdictSchema`:

```typescript
const VerdictSchema = z.object({
  claim: z.string().describe("The claim being evaluated"),
  verdict: z.number().min(0).max(100).describe("Truth percentage (0=false, 50=mixed, 100=true)"),
  confidence: z.number().min(0).max(100).describe("Confidence in the verdict"),
  reasoning: z.string().describe("Detailed reasoning for the verdict"),
  summary: z.string().describe("One-sentence summary"),
  keyFactIds: z.array(z.string()).describe("IDs of most important facts"),
  // NEW: Support for dynamic scopes
  detectedScopes: z.array(z.object({
    id: z.string().describe("Unique short ID, e.g., 'CTX_TSE'"),
    name: z.string().describe("Human-readable name, e.g., 'TSE Electoral Case'"),
    subject: z.string().describe("The specific subject of this scope"),
    type: z.enum(["legal", "scientific", "methodological", "general"])
  })).optional().describe("List of distinct analytical frames detected")
});
```

#### Step B: Update Prompt
Modify the `generateVerdict` system prompt to include:
*"Analyze if the evidence belongs to distinct analytical frames (e.g., separate legal proceedings, different scientific studies, or distinct geographical jurisdictions). If so, return them in the 'detectedScopes' array and ensure each claim/fact is logically associated with one."*

#### Step C: Update Mapping
In `buildResultJson`, replace the hardcoded `scopes` array with logic that prefers `verdictData.detectedScopes` if present.

---

## 2. UI Grounding Score Integration

### Issue
The "Grounding Ratio" (citation density) is a metric for evaluating the reliability of agentic narratives but is currently hidden in the JSON metadata.

### Proposed Fix
Modify the `DynamicResultViewer` in `apps/web/src/app/jobs/[id]/page.tsx` to display this score.

#### Implementation
```tsx
function DynamicResultViewer({ result }: { result: any }) {
  const citationsCount = result.citations?.length || 0;
  // Estimate sentence count from narrativeMarkdown
  const sentencesCount = result.narrativeMarkdown?.split(/[.!?]+/).filter(Boolean).length || 1;
  const groundingRatio = (citationsCount / sentencesCount).toFixed(2);

  return (
    <div className={styles.dynamicViewer}>
      <div className={styles.groundingScoreBadge}>
        📊 Grounding Score: <strong>{groundingRatio}</strong> 
        <span className={styles.tooltip} title="Ratio of unique citations to narrative depth"> (?)</span>
      </div>
      {/* ... rest of viewer ... */}
    </div>
  );
}
```

---

## 3. LLM Tiering & Cost Control

### Issue
The monolithic paths currently use `getModel()` which defaults to the high-tier model for all tasks, ignoring the `FH_LLM_TIERING` and per-task model configurations.

### Proposed Fix
Update `monolithic-canonical.ts` and `monolithic-dynamic.ts` to use `getModelForTask()`.

#### Recommended Mapping:
- **Planning/Claim Extraction**: `getModelForTask("understand")` (Cheaper model like GPT-4o-mini).
- **Fact Extraction**: `getModelForTask("extract_facts")` (Cheaper model).
- **Final Synthesis/Verdict**: `getModelForTask("verdict")` (High-tier model like Gemini 1.5 Pro).

---

## 4. Provenance Validation Hardening

### Issue
Monolithic paths currently "trust" the LLM to provide real URLs in the facts/citations array. This can lead to hallucinations if the model invents a URL that was not actually fetched.

### Proposed Fix
Integrate the system's `filterFactsByProvenance` utility.

#### Implementation
In `runMonolithicCanonical`, before the final verdict turn:
1. Import `filterFactsByProvenance` from `./analyzer/provenance-validation`.
2. Map the LLM-extracted facts to the internal `ExtractedFact` type.
3. Pass the facts through the filter against the `state.sources` array.
4. Remove any facts that fail provenance validation before sending them to the `generateVerdict` turn.

---

## 5. Multi-Jurisdiction Stress Test

### Scenario
**Input**: *"Compare the 2023 TSE ruling on Jair Bolsonaro with the 2024 US Supreme Court ruling on Trump's eligibility (Colorado case)."*

### Verification Checklist
1. **Scope Separation**: Does the result contain at least two scopes (`CTX_TSE` and `CTX_SCOTUS`)?
2. **Isolation**: Are the facts about Brazil correctly mapped to the TSE scope?
3. **Neutrality**: Does changing the order of the comparison yield the same truth percentages?
4. **Cost**: Verify that token usage remains linear (no re-injection of prior search hits).
