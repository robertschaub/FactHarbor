# Lead Developer Feasibility Report v2 — Triple-Path Pipeline

**Author**: Lead Developer
**Date**: 2026-01-17
**Status**: COMPLETED (with codebase validation)
**Implementation**: PR 1 & PR 2 COMPLETE

---

## 1. Executive Summary

| Criterion | Assessment |
|-----------|------------|
| **Feasibility** | **GREEN** |
| **Estimated Effort** | **M** (5-7 days) |
| **Implementation Risk** | Low-Medium |

### Primary Risks (Validated)

1. **DB Migration Complexity**: Uses `EnsureCreated()` not EF migrations - requires manual ALTER TABLE or schema recreation strategy
2. **Cross-System Coordination**: API (C#) and Runner (Node.js) must stay in sync for new `pipelineVariant` field
3. **Monolithic Token Cost**: Architect concerns about quadratic cost growth in tool loops need mitigation via context compression

### Key Findings from Codebase Analysis

- **API Layer**: Simple, clean - extending `CreateJobRequest` is straightforward
- **Runner**: Already has queue management, easy to add variant dispatch
- **UI**: Minimal Analyze page - adding selector requires ~20 lines
- **Schema**: `EnsureCreated()` limitation is the primary technical hurdle

---

## 2. Technical Evaluation (Validated Against Codebase)

### 2.1 Data Model & API (C# - apps/api)

**Current State** (verified):
```csharp
// apps/api/Controllers/AnalyzeController.cs:7
public sealed record CreateJobRequest(string inputType, string inputValue);

// apps/api/Data/Entities.cs:5-24
public sealed class JobEntity {
    public string JobId { get; set; }
    public string Status { get; set; } = "QUEUED";
    public string InputType { get; set; } = "text";
    public string InputValue { get; set; } = "";
    public string? ResultJson { get; set; }
    // NO pipelineVariant field exists
}
```

**Required Changes** (IMPLEMENTED in PR 1):

1. **Extend CreateJobRequest**:
   ```csharp
   public sealed record CreateJobRequest(
       string inputType,
       string inputValue,
       string? pipelineVariant = "orchestrated"  // Optional with default
   );
   ```

2. **Extend JobEntity**:
   ```csharp
   public string PipelineVariant { get; set; } = "orchestrated";
   ```

3. **Update JobService.CreateJobAsync** to persist pipelineVariant

**Migration Strategy** (Critical):

The API uses `db.Database.EnsureCreated()` (Program.cs:43), NOT EF migrations:

```csharp
// apps/api/Program.cs:43
db.Database.EnsureCreated();
```

This means:
- `EnsureCreated()` only creates tables if they don't exist
- It does NOT update existing tables with new columns
- Existing `factharbor.db` will NOT get the new column automatically

**Recommended Migration Approach**:

**Option A (Production-Safe)**: Manual SQL migration script
```sql
-- Run once against existing factharbor.db
ALTER TABLE Jobs ADD COLUMN PipelineVariant TEXT NOT NULL DEFAULT 'orchestrated';
```

**Option B (Dev-Only)**: Delete local DB and let EnsureCreated() recreate
- Loses existing job history
- Only suitable for development environments

**Option C (Long-term)**: Switch to proper EF migrations
- Higher effort but proper solution
- `dotnet ef migrations add AddPipelineVariant`
- Replace `EnsureCreated()` with `Migrate()`

**Recommendation**: Use Option A for Phase 1, plan Option C for Phase 2.

### 2.2 Runner & Dispatch (Node.js - apps/web)

**Current State** (run-job/route.ts):

```typescript
// apps/web/src/app/api/internal/run-job/route.ts:145-150
const result = await runFactHarborAnalysis({
  jobId,
  inputType,
  inputValue,
  onEvent: async (m, p) => emit("info", m, p),
});
```

The runner already:
- Fetches job details from API (line 139)
- Has queue management infrastructure (lines 30-53)
- Has error handling with fallback to FAILED status

**Required Changes** (IMPLEMENTED in PR 2):

1. **Read pipelineVariant from job**
2. **Add dispatch logic** with fallback to orchestrated
3. **Record pipeline metadata** in result (`pipelineFallback`, `fallbackReason`)

### 2.3 UI (Next.js - apps/web)

**Required Changes** (IMPLEMENTED in PR 1):

1. **Add state for variant selection**
2. **Add variant selector UI** with Beta/Experimental warnings
3. **Include variant in submit payload**

---

## 3. Invariant Verification Plan

### 3.1 Preserved Invariants (Per Migration Plan section 0)

| Invariant | Orchestrated | Monolithic Canonical | Monolithic Dynamic |
|-----------|-------------|---------------------|-------------------|
| Understand -> Research -> Verdict ordering | Native | Must enforce via tool sequence | Must enforce via tool sequence |
| Gate1 (Understanding) presence | Native | Validate in output | Validate in output |
| Gate4 (Final validation) presence | Native | Add validation gate | N/A (dynamic output) |
| CTX_UNSCOPED display-only | Existing | Validate in output | Must enforce in prompt |
| Neutrality target <=4 pts | Existing tests | Add to eval suite | Add to eval suite |
| Provenance fail-closed | Existing | Add validation | Add validation |

### 3.2 Required Test Coverage

**Existing Tests** (apps/web/src/lib/analyzer/*.test.ts):
- `track-record-normalization.test.ts` - Score normalization
- `provenance-validation.test.ts` - Source provenance
- `scope-preservation.test.ts` - Multi-scope isolation
- `adversarial-scope-leak.test.ts` - Cross-scope contamination

**New Tests Required**:

1. **Pipeline Variant Persistence Test**:
   - Create job with each variant
   - Verify variant persisted in DB
   - Verify variant readable via API

2. **Monolithic Budget Enforcement Test**:
   - Mock tool loop with excessive calls
   - Verify maxSteps triggers termination
   - Verify fallback to orchestrated on budget exceed

3. **Dynamic Schema Safety Contract Test**:
   - Verify citations[] always present
   - Verify rawJson always stored
   - Verify "experimental" label in UI

4. **Multi-Jurisdiction Stress Test** (per Architect Review section 4):
   - Input: "TSE and SCOTUS both ruled on privacy"
   - Verify: Zero cross-scope leakage
   - Verify: Schema passes existing Zod validator
   - Verify: Tokens < 2.5x orchestrated path

---

## 4. Budget & Tail-Latency Risk Mitigation

### 4.1 Monolithic Tool Loop Caps

```typescript
const MONOLITHIC_BUDGET = {
  maxSteps: 15,           // Hard cap on LLM round-trips
  maxSearches: 8,         // Max web searches
  maxFetches: 12,         // Max page fetches
  timeoutMs: 180_000,     // 3-minute hard timeout
  maxInputTokens: 100_000, // Context window limit
};
```

### 4.2 Behavior on Budget Exceed

| Condition | Action |
|-----------|--------|
| maxSteps reached | Emit warning, trigger Gate4, finalize with partial results |
| maxSearches reached | Skip further research, proceed to verdict |
| timeout exceeded | Fallback to orchestrated with `pipelineFallback=true` |
| maxInputTokens reached | Summarize context, continue with compressed history |

### 4.3 Context Compression Strategy (per Architect Review section 3.1)

```typescript
// After N tool calls, compress history
if (toolCallCount >= COMPRESSION_THRESHOLD) {
  const summary = await summarizeEvidenceBuffer(history);
  history = [systemPrompt, summary]; // Reset context
}
```

---

## 5. Implementation Status

### PR 1: Infrastructure (API + DB + UI Selector) - COMPLETE
**Status**: Implemented

Files modified:
- `apps/api/Controllers/AnalyzeController.cs` - Extended CreateJobRequest
- `apps/api/Data/Entities.cs` - Added PipelineVariant to JobEntity
- `apps/api/Services/JobService.cs` - Persists variant on create
- `apps/api/Controllers/JobsController.cs` - Returns variant in job response
- `apps/web/src/app/analyze/page.tsx` - Added variant selector
- `apps/web/src/styles/common.module.css` - Added selector styles

Migration script created:
- `apps/api/migrations/001_add_pipeline_variant.sql`

### PR 2: Runner Dispatch + Placeholders - COMPLETE
**Status**: Implemented

Files modified:
- `apps/web/src/app/api/internal/run-job/route.ts` - Dispatch by variant with fallback
- `apps/web/src/lib/analyzer/monolithic-canonical.ts` - Placeholder (throws "not implemented")
- `apps/web/src/lib/analyzer/monolithic-dynamic.ts` - Placeholder (throws "not implemented")

### PR 3: Monolithic Canonical Implementation - PENDING
**Status**: Not started

Files to create/modify:
- `apps/web/src/lib/analyzer/monolithic-canonical.ts` - Full implementation
- `apps/web/src/lib/analyzer/tool-definitions.ts` - Tool schemas
- `apps/web/src/lib/analyzer/context-compression.ts` - History summarization

### PR 4: Dynamic Path + Viewer - PENDING
**Status**: Not started

Files to create/modify:
- `apps/web/src/lib/analyzer/monolithic-dynamic.ts` - Full implementation
- `apps/web/src/app/jobs/[id]/page.tsx` - Add DynamicResultViewer
- `apps/web/src/app/jobs/[id]/DynamicResultViewer.tsx` - New component

---

## 6. Go/No-Go Gates

### Phase 1 Gate (PR 1-2 Complete) - PASSED
- [x] Variant selector visible in UI
- [x] Variant persisted in job record
- [x] Existing orchestrated path unchanged
- [x] All existing tests pass
- [x] Fallback to orchestrated works for monolithic variants

### Phase 2 Gate (PR 3 Complete)
- [ ] Monolithic canonical produces valid schema
- [ ] Budget caps enforced
- [ ] Fallback to orchestrated works
- [ ] Multi-jurisdiction stress test passes

### Phase 3 Gate (PR 4 Complete)
- [ ] Dynamic viewer renders citations
- [ ] "Experimental" warning visible
- [ ] rawJson always available
- [ ] Grounding ratio displayed (per Architect Review section 3.3)

---

## 7. Architect Recommendations Status

| Recommendation | Status | Implementation |
|----------------|--------|----------------|
| Context Compression (3.1) | PR 3 | Sliding window summarization after N calls |
| Dual-Pass Validation (3.2) | PR 3 | GPT-4o-mini validation gate for scope mapping |
| Grounding Score (3.3) | PR 4 | `citedUrls / narrativeSentences` ratio in UI |
| Cost Envelope (3.4) | PR 1-4 | `estimatedCostUsd` in ResultEnvelope |
| Experimental Watermark (3.5) | PR 4 | Badge + header in dynamic viewer |

---

## 8. Final Recommendation

**APPROVED FOR PHASE 1 EXECUTION** - Phase 1 Complete

The Triple-Path Pipeline is **highly feasible** with the following caveats:

1. **DB Migration** requires manual SQL ALTER TABLE (Option A) for existing deployments
2. **Monolithic budgets** must be enforced to prevent cost explosion
3. **Dynamic path** must be clearly labeled as experimental

The "Strangler" approach allows shipping infrastructure first, then incrementally implementing monolithic variants without risking current system stability.

---

## Appendix: File Reference

### API Layer (C#)
| File | Status | Changes |
|------|--------|---------|
| AnalyzeController.cs | DONE | Extended CreateJobRequest |
| Entities.cs | DONE | Added PipelineVariant property |
| JobService.cs | DONE | Persists variant on create |
| JobsController.cs | DONE | Returns variant in responses |

### Runner Layer (Node.js)
| File | Status | Changes |
|------|--------|---------|
| run-job/route.ts | DONE | Dispatch logic with fallback |
| monolithic-canonical.ts | PLACEHOLDER | Throws "not implemented" |
| monolithic-dynamic.ts | PLACEHOLDER | Throws "not implemented" |

### UI Layer (React)
| File | Status | Changes |
|------|--------|---------|
| analyze/page.tsx | DONE | Variant selector |
| common.module.css | DONE | Selector styles |
| jobs/[id]/page.tsx | PENDING | Dynamic viewer (PR 4) |
| DynamicResultViewer.tsx | PENDING | New component (PR 4) |
