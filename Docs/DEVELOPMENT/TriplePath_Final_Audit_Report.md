# Final Architecture & Implementation Audit — Triple-Path Pipeline
**Audience**: Stakeholders, Senior Architects
**Date**: 2026-01-17
**Status**: REVIEW COMPLETE

## 1. Executive Summary

The implementation of the **Triple-Path Pipeline** successfully transitions FactHarbor from a monolithic state machine to a flexible, multi-variant architecture. The core functional requirements—user-selectable paths, agentic research loops, and canonical/dynamic output support—are complete. 

Critically, the implementation **successfully avoids the "Token Trap"** (quadratic cost growth) by using a discrete, multi-turn approach rather than a single re-entrant AI SDK tool loop.

---

## 2. Implementation Completeness Check

| Phase | Path / Component | Status | Note |
| :--- | :--- | :--- | :--- |
| **1** | API & DB Schema | **PARTIAL** | Entities updated; migration needs manual execution. |
| **2** | Runner Dispatch | **COMPLETE** | Robust dispatch with fail-closed fallback. |
| **3** | Monolithic Canonical | **COMPLETE** | Conforms to UI requirements; 3-turn logic is sound. |
| **4** | Monolithic Dynamic | **COMPLETE** | Flexible structure with citations contract. |
| **-** | UI Selection | **COMPLETE** | Integrated into Analyze page with descriptions. |

---

## 3. Identified Issues and Risks

### 3.1 [CRITICAL] Database Migration Gap
The `PipelineVariant` column exists in the C# `JobEntity`, but `FhDbContext` uses `Database.EnsureCreated()`. 
- **Issue**: Existing deployments with an established `factharbor.db` will not receive the new column automatically.
- **Risk**: The API will crash on job creation when trying to persist the `PipelineVariant`.
- **Fix**: Execute manual SQL: `ALTER TABLE Jobs ADD COLUMN PipelineVariant TEXT NOT NULL DEFAULT 'orchestrated';`

### 3.2 [REGRESSION] Multi-Scope Detection Loss
The Orchestrated pipeline excels at isolating multiple jurisdictions (e.g., TSE vs. SCOTUS). 
- **Issue**: Both Monolithic implementations currently collapse all findings into a single hardcoded scope (`CTX_MAIN`).
- **Risk**: Reduced analytical depth for complex multi-jurisdiction queries.
- **Fix**: Update `monolithic-canonical.ts` to allow the LLM to output a `scopes` array in the final JSON.

### 3.3 [INTEGRITY] Missing Provenance Validation
- **Issue**: Monolithic paths skip the `filterFactsByProvenance` logic used in the Orchestrated path.
- **Risk**: The LLM might cite "synthetic" or unreachable URLs that aren't verified by the internal retrieval layer.
- **Fix**: Run the `facts` array through the provenance validator before the final verdict turn.

### 3.4 [UX] Missing Grounding Score
- **Issue**: The architect's requirement for a "Grounding Score" (Ratio of citations to findings) is calculated in the `meta` object but not rendered in the React UI.
- **Fix**: Add a small indicator in the `DynamicResultViewer` to show citation density.

---

## 4. Cost and Performance Audit

### 4.1 Cost Efficiency: **EXCELLENT**
- The design reset context between the "Understand," "Research," and "Verdict" turns.
- **Quadratic growth prevented**: Conversation history is not re-sent in its entirety for every research turn.
- **Total LLM Calls**: ~3-5 per job (compared to 15-25 in Orchestrated).

### 4.2 Performance Efficiency: **GOOD**
- **Timeouts**: 3-minute hard cap protects against runaway research.
- **Sampling**: Research is limited to top 3 URLs per turn, preventing extraction bloat.

---

## 5. Final Verdict & Improvement Plan

The implementation is **Production-Ready** for an internal "Shadow" rollout, provided the DB migration is handled. To reach "Full GA" quality, the following improvements are recommended:

1.  **[IMMEDIATE]** Deploy the SQL migration script to local/staging environments.
2.  **[PHASE 5]** Refactor `monolithic-canonical.ts` to support the dynamic scope detection found in the orchestrated path.
3.  **[PHASE 5]** Implement fact deduplication in the research loop to further reduce token usage in the final verdict call.

**Reviewer**: AI Systems Auditor (Cursor)
**Final Grade**: **A-** (Docked for DB migration risk and scope regression)
