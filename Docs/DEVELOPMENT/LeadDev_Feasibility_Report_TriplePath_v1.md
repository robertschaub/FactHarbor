# Lead Developer Feasibility Report — Triple-Path Pipeline
**Author**: Lead Developer
**Date**: 2026-01-17
**Status**: COMPLETED

## 1. Summary
- **Feasibility**: **Green**
- **Estimated effort**: **M** (5-7 days)
- **Primary risks**:
    1. Manual SQLite migrations (ALTER TABLE) required.
    2. Schema validation for monolithic output.
    3. Ensuring `CTX_UNSCOPED` behavior is consistent across paths.

---

## 2. Technical Evaluation

### 2.1 Data Model & API (C#)
- **Changes**: We can successfully extend `CreateJobRequest` in `AnalyzeController.cs` with an optional `pipelineVariant` field.
- **Compatibility**: Defaulting to "orchestrated" ensures all legacy jobs and simple API calls remain functional.
- **DB Strategy**: Use manual SQL `ALTER TABLE Jobs ADD COLUMN PipelineVariant TEXT NOT NULL DEFAULT 'orchestrated';` to ensure no data loss in `factharbor.db`.

### 2.2 Runner & Dispatch (Next.js)
- **Dispatch Point**: `apps/web/src/app/api/internal/run-job/route.ts`.
- **Implementation**: The runner can await the appropriate analyzer module based on the variant stored in the DB.
- **Fallback**: If a monolithic variant fails, the system should catch the error, emit a warning event, and execute the orchestrated path as a fail-safe.

### 2.3 UI (Next.js)
- **Selection**: A simple selector on the Analyze page is sufficient.
- **Dynamic Viewer**: The Jobs page already has a tabbed interface. We can add a `DynamicResultViewer` that renders `narrativeMarkdown` and `citations` when the canonical schema is absent.

---

## 3. Proposed Implementation Sequence

1.  **PR 1 (Infrastructure)**: API schema changes + DB migration + UI Selector.
2.  **PR 2 (Runner)**: Dispatch logic in `run-job` route + empty placeholders for monolithic modules.
3.  **PR 3 (Monolithic Canonical)**: Implementation of `monolithic-canonical.ts` using AI SDK tool loops.
4.  **PR 4 (Dynamic Path)**: Implementation of `monolithic-dynamic.ts` + `DynamicResultViewer` component.

---

## 4. Final Recommendation
The project is highly feasible. The "Strangler" approach defined in the migration plan allows us to ship the infrastructure first and implement the agentic loops incrementally without risking the stability of the current system.

**APPROVED FOR PHASE 1 EXECUTION**
