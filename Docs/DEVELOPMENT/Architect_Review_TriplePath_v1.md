# Critical Senior Architect Review — Triple-Path Pipeline Architecture
**Reviewer**: Critical Senior Software Architect
**Date**: 2026-01-17

## 1. Executive Summary

The **Triple-Path Pipeline** is a bold architectural evolution that attempts to reconcile the deterministic reliability of orchestrated stages with the flexibility of agentic tool loops. While the "Strangler Pattern" migration and isolation of orchestration logic are sound, the architecture faces significant **economic tail risks** and **semantic isolation challenges** that must be mitigated before implementation.

---

## 2. Identified Flaws and Risks

### 2.1 The "Token Trap" (Quadratic Cost Risk)
**Issue**: The `MonolithicToolLoop` variants rely on a re-entrant LLM history. In agentic loops, every tool call re-injects the entire prior conversation.
- **Risk**: As research deepens (e.g., 5+ tool calls), the input token count grows quadratically. The "57% cost reduction" projected in earlier monolithic designs likely underestimates this overhead.
- **Impact**: High-volume usage could become economically unsustainable compared to the staged pipeline, where context is tightly pruned between steps.

### 2.2 Semantic "Attention Sink" (Scope Contamination)
**Issue**: A monolithic tool-loop is responsible for scope detection, research, and verdict in a single, long prompt context.
- **Risk**: LLMs struggle with "Attention Sink" when multiple jurisdictions are present (e.g., TSE vs. STF). Facts from one court "leak" into the verdict reasoning of another.
- **Impact**: Reduced verdict accuracy in complex, multi-scope scenarios—the very cases where FactHarbor needs to be most precise.

### 2.3 Result Model Divergence & "Black Box" UX
**Issue**: The introduction of a `DynamicPayload` moves FactHarbor away from its core value proposition: transparent, structured fact-checking.
- **Risk**: The "Dynamic Viewer" is a black box. Users may lose the ability to trace specific claims to specific facts if the model produces a free-form narrative.
- **Impact**: Potential loss of user trust if the dynamic path hallucinates "narrative truth" that doesn't align with the structured citations.

### 2.4 Database and API Fragility
**Issue**: Adding `pipelineVariant` to the job record is necessary but creates a dependency between the API (C#) and the Runner (Node.js).
- **Risk**: Out-of-sync migrations or missing default handling for legacy jobs (of which there are thousands in `factharbor.db`) could cause runtime crashes in the dispatcher.

---

## 3. Proposed Improvements

### 3.1 Implement "Context Compression" for Tool Loops
- **Requirement**: The `MonolithicToolLoop` modules must implement a **sliding window** or **summarization gate**. 
- **Action**: After N tool calls, the agent must summarize its current evidence buffer and reset the conversation history to stay within a linear cost bracket.

### 3.2 Dual-Pass Validation for Canonical Monolithic
- **Requirement**: Do not trust the monolithic model to correctly map scopes to the canonical schema.
- **Action**: Add a low-cost "Validation Gate" (e.g., GPT-4o-mini) that checks the `relatedProceedingId` mapping of the extracted facts before the result is finalized.

### 3.3 Enhanced "Grounding Score" for Dynamic Path
- **Requirement**: The `DynamicPayload` must include a computed **Grounding Ratio**.
- **Action**: `(number of unique URLs cited) / (number of sentences in narrative)`. Show this score in the UI to warn users of "low-evidence narratives."

### 3.4 Telemetry Unification: The "Cost Envelope"
- **Requirement**: The `ResultEnvelope` (§4.1) must include `estimatedCostUsd`.
- **Action**: Track `inTokens` and `outTokens` per job. This is the only way to make the "Decision Policy" in Phase 5 objective.

### 3.5 UI: "Experimental" Watermark
- **Requirement**: Any result from a monolithic path must be visually distinguished.
- **Action**: Add a subtle but persistent watermark or header: *"Experimental Agentic Result - Verification Required."*

---

## 4. Go/No-Go Stress Test (Multi-Jurisdiction)

The architecture is approved for implementation only if it can pass the following test case:

**Input**: *"The Brazilian TSE and the US Supreme Court both issued rulings on January 10th regarding data privacy."*
**Variant**: `monolithic_canonical`
**Success Criteria**:
1.  **Zero Leakage**: No TSE evidence appears in the SCOTUS rationale.
2.  **Schema Integrity**: Result JSON passes the existing Zod validator.
3.  **Linear Cost**: Total tokens < 2.5x the `Orchestrated` path (verifying history compression).

---

## 5. Implementation Sequence Refinement

1.  **Phase 0**: Add `pipelineVariant` to DB and API (Done correctly in current plan).
2.  **Phase 1**: Implement **Option D** (Code-Orchestrated Hybrid) as the "Internal Monolithic" engine. This provides the tool-loop benefit with the safety of code-driven boundaries.
3.  **Phase 2**: Implement the Dynamic viewer as a "Read-Only" debug tool for developers first.

---
**Signed**,
*Critical Senior Software Architect*
