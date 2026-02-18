# Implementation Plan: Job Cancellation and Deletion

**Status:** IMPLEMENTED
**Created:** 2026-02-18
**Completed:** 2026-02-18

---

## Context

The user needs to support job management operations:
- **Cancel**: Allow anyone to cancel running/queued jobs (future: restrict to job owner)
- **Delete**: Allow administrators to hard-delete jobs from the database

This addresses the need for better job lifecycle management in the FactHarbor application. Currently, there is no way to stop a running analysis or remove unwanted jobs from the system.

---

## Design Decisions (User-Confirmed)

1. **Cancel mechanism**: Active cancellation with runner abort endpoint
2. **Delete behavior**: Hard delete (remove from database, cascade to events)
3. **UI placement**: Job detail page (`/jobs/[id]`)
4. **Authorization**:
   - Cancel: Public (anyone can cancel any job for now)
   - Delete: Admin-only (requires X-Admin-Key)

---

## Implementation Overview

### Backend (ASP.NET Core API)

#### 1. Add CANCELLED Status Constant

**File**: `apps/api/Data/Entities/JobEntity.cs` (or status constants file)

Add string constant:
```csharp
public const string STATUS_CANCELLED = "CANCELLED";
```

#### 2. Add Service Methods

**File**: `apps/api/Services/JobService.cs`

```csharp
public async Task<JobEntity?> CancelJobAsync(string jobId)
{
    var job = await GetJobAsync(jobId);
    if (job is null) return null;

    // Only cancel if in cancellable state
    if (job.Status == "SUCCEEDED" || job.Status == "FAILED" || job.Status == "CANCELLED")
        return job; // Already in final state, idempotent

    await UpdateStatusAsync(jobId, "CANCELLED", job.Progress, "info",
        "Job cancelled by user");

    return await GetJobAsync(jobId);
}

public async Task<bool> DeleteJobAsync(string jobId)
{
    var job = await _db.Jobs.FindAsync(jobId);
    if (job is null) return false;

    // Cascade delete will remove JobEvents automatically (ON DELETE CASCADE)
    _db.Jobs.Remove(job);
    await _db.SaveChangesAsync();

    return true;
}
```

#### 3. Add RunnerClient Abort Method

**File**: `apps/api/Services/RunnerClient.cs`

```csharp
public async Task<bool> AbortJobAsync(string jobId)
{
    var baseUrl = _cfg["Runner:BaseUrl"] ?? "http://localhost:3000";
    var runnerKey = _cfg["Runner:RunnerKey"];

    var url = $"{baseUrl.TrimEnd('/')}/api/internal/abort-job/{jobId}";

    using var req = new HttpRequestMessage(HttpMethod.Post, url);
    req.Headers.Add("X-Runner-Key", runnerKey);

    try
    {
        var res = await _http.SendAsync(req);
        return res.IsSuccessStatusCode;
    }
    catch (HttpRequestException ex)
    {
        _log.LogWarning(ex, "Failed to abort job {JobId} on runner", jobId);
        return false; // Runner may not be running, that's okay
    }
}
```

#### 4. Add Public Cancel Endpoint

**File**: `apps/api/Controllers/JobsController.cs`

```csharp
[HttpPost("{jobId}/cancel")]
public async Task<IActionResult> CancelJob(string jobId)
{
    var job = await _jobs.CancelJobAsync(jobId);
    if (job is null) return NotFound();

    // Try to abort on runner (best effort)
    if (job.Status == "CANCELLED")
    {
        await _runner.AbortJobAsync(jobId);
    }

    return Ok(new { ok = true, status = job.Status });
}
```

#### 5. Add Admin Delete Endpoint

**File**: `apps/api/Controllers/InternalJobsController.cs`

```csharp
[HttpDelete("{jobId}")]
public async Task<IActionResult> DeleteJob(string jobId)
{
    if (!IsAuthorized()) return Unauthorized();

    var deleted = await _jobs.DeleteJobAsync(jobId);
    if (!deleted) return NotFound();

    return Ok(new { ok = true });
}
```

---

### Frontend (Next.js)

#### 6. Add Cancel Proxy Route

**File**: `apps/web/src/app/api/fh/jobs/[id]/cancel/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";

async function resolveJobId(context: any): Promise<string> {
  const params = await Promise.resolve(context.params);
  return params.id;
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const jobId = await resolveJobId(context);
  const baseUrl = process.env.FH_API_BASE_URL || "http://localhost:5000";

  const upstreamUrl = `${baseUrl.replace(/\/$/, "")}/v1/jobs/${jobId}/cancel`;

  try {
    const res = await fetch(upstreamUrl, { method: "POST" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to cancel job" },
      { status: 500 }
    );
  }
}
```

#### 7. Add Delete Proxy Route (Admin-Protected)

**File**: `apps/web/src/app/api/fh/jobs/[id]/delete/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";

function isAuthorized(req: NextRequest): boolean {
  const adminKey = process.env.FH_ADMIN_KEY;
  if (!adminKey && process.env.NODE_ENV !== "production") return true;
  const providedKey = req.headers.get("x-admin-key");
  return !!providedKey && providedKey === adminKey;
}

async function resolveJobId(context: any): Promise<string> {
  const params = await Promise.resolve(context.params);
  return params.id;
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = await resolveJobId(context);
  const baseUrl = process.env.FH_API_BASE_URL || "http://localhost:5000";
  const adminKey = process.env.FH_ADMIN_KEY;

  const upstreamUrl = `${baseUrl.replace(/\/$/, "")}/internal/v1/jobs/${jobId}`;

  try {
    const res = await fetch(upstreamUrl, {
      method: "DELETE",
      headers: { "X-Admin-Key": adminKey || "" }
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete job" },
      { status: 500 }
    );
  }
}
```

#### 8. Add Runner Abort Endpoint

**File**: `apps/web/src/app/api/internal/abort-job/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";

function isAuthorizedRunner(req: NextRequest): boolean {
  const expectedKey = process.env.FH_INTERNAL_RUNNER_KEY;
  if (!expectedKey) return true; // Dev mode
  const providedKey = req.headers.get("x-runner-key");
  return providedKey === expectedKey;
}

async function resolveJobId(context: any): Promise<string> {
  const params = await Promise.resolve(context.params);
  return params.id;
}

// In-memory abort signals (job ID → abort flag)
const abortSignals = new Map<string, boolean>();

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isAuthorizedRunner(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = await resolveJobId(context);
  abortSignals.set(jobId, true);

  return NextResponse.json({ ok: true, jobId, aborted: true });
}

// Helper function for pipeline to check abort status
export function isJobAborted(jobId: string): boolean {
  return abortSignals.get(jobId) === true;
}

export function clearAbortSignal(jobId: string): void {
  abortSignals.delete(jobId);
}
```

#### 9. Update Pipeline to Check Abort Signal

**File**: `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`

Import abort checker and add check helper:
```typescript
import { isJobAborted, clearAbortSignal } from "@/app/api/internal/abort-job/[id]/route";

function checkAbortSignal(jobId: string | undefined): void {
  if (jobId && isJobAborted(jobId)) {
    throw new Error(`Job ${jobId} was cancelled`);
  }
}
```

Add checks before each stage in `runClaimBoundaryAnalysis`:
```typescript
// Stage 1: Extract Claims
checkAbortSignal(input.jobId);
onEvent("Extracting claims from input...", 10);
// ...

// Stage 2: Research
checkAbortSignal(input.jobId);
onEvent("Researching evidence for claims...", 30);
// ...

// Stage 3: Cluster Boundaries
checkAbortSignal(input.jobId);
onEvent("Clustering evidence into boundaries...", 60);
// ...

// Stage 4: Verdict
checkAbortSignal(input.jobId);
onEvent("Generating verdicts...", 70);
// ...

// Stage 5: Aggregate
checkAbortSignal(input.jobId);
onEvent("Aggregating final assessment...", 90);
// ...
```

Clear abort signal in finally block:
```typescript
} finally {
  await finalizeMetrics();
  if (input.jobId) {
    clearAbortSignal(input.jobId);
  }
}
```

#### 10. Update Job Detail Page UI

**File**: `apps/web/src/app/jobs/[id]/page.tsx`

Add imports, state, and handlers:
```typescript
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const [isCancelling, setIsCancelling] = useState(false);
const [isDeleting, setIsDeleting] = useState(false);
const [hasAdminKey, setHasAdminKey] = useState(false);

useEffect(() => {
  if (typeof window !== "undefined") {
    const key = sessionStorage.getItem("fh-admin-key");
    setHasAdminKey(!!key);
  }
}, []);
```

Add action buttons in job info card (before closing `</div>`):
```typescript
{/* Job Action Buttons */}
{(() => {
  const canCancel = job.status === "QUEUED" || job.status === "RUNNING";
  const showActions = canCancel || hasAdminKey;

  return showActions ? (
    <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
      {canCancel && (
        <button onClick={handleCancel} disabled={isCancelling} style={{...}}>
          {isCancelling ? "Cancelling..." : "⏸️ Cancel Job"}
        </button>
      )}
      {hasAdminKey && (
        <button onClick={handleDelete} disabled={isDeleting} style={{...}}>
          {isDeleting ? "Deleting..." : "🗑️ Delete Job (Admin)"}
        </button>
      )}
    </div>
  ) : null;
})()}
```

#### 11. Update Job List to Show CANCELLED Status

**File**: `apps/web/src/app/jobs/page.tsx`

Update status functions:
```typescript
const getStatusClass = (status: string): string => {
  // ... existing cases
  case "CANCELLED": return styles.statusCancelled;
};

const getStatusBadgeClass = (status: string): string => {
  // ... existing cases
  case "CANCELLED": return styles.statusBadgeCancelled;
};

const getProgressClass = (status: string): string => {
  // ... existing cases
  case "CANCELLED": return styles.progressPercentCancelled;
};
```

Add emoji in status indicator:
```typescript
{job.status === "CANCELLED" && <span className={styles.statusIcon}>🚫</span>}
```

**File**: `apps/web/src/app/jobs/page.module.css`

Add CSS styles:
```css
.statusCancelled {
  background-color: #e0e0e0;
}

.statusBadgeCancelled {
  background-color: #e0e0e0;
  color: #616161;
}

.progressPercentCancelled {
  color: #616161;
}
```

---

## Critical Files Modified

### Backend (C#)
- ✅ `apps/api/Services/JobService.cs` - Added CancelJobAsync, DeleteJobAsync
- ✅ `apps/api/Services/RunnerClient.cs` - Added AbortJobAsync
- ✅ `apps/api/Controllers/JobsController.cs` - Added POST /v1/jobs/{id}/cancel
- ✅ `apps/api/Controllers/InternalJobsController.cs` - Added DELETE /internal/v1/jobs/{id}

### Frontend (Next.js)
- ✅ `apps/web/src/app/api/fh/jobs/[id]/cancel/route.ts` - New file (cancel proxy)
- ✅ `apps/web/src/app/api/fh/jobs/[id]/delete/route.ts` - New file (delete proxy)
- ✅ `apps/web/src/app/api/internal/abort-job/[id]/route.ts` - New file (runner abort endpoint)
- ✅ `apps/web/src/app/jobs/[id]/page.tsx` - Added action buttons
- ✅ `apps/web/src/app/jobs/page.tsx` - Added CANCELLED status handling
- ✅ `apps/web/src/app/jobs/page.module.css` - Added CANCELLED styles
- ✅ `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` - Added abort checks

---

## Verification Steps

### 1. Test Cancel Flow (Public)

```bash
# Start services
cd apps/api && dotnet watch run
cd apps/web && npm run dev

# Create a test job
curl -X POST http://localhost:3000/api/fh/analyze \
  -H "Content-Type: application/json" \
  -d '{"inputType":"text","inputValue":"Test claim","pipelineVariant":"claimboundary"}'

# Note the jobId from response

# Cancel the job
curl -X POST http://localhost:3000/api/fh/jobs/{jobId}/cancel

# Verify status is CANCELLED
curl http://localhost:3000/api/fh/jobs/{jobId} | jq '.status'
# Expected: "CANCELLED"
```

### 2. Test Delete Flow (Admin)

```bash
# Set admin key
export FH_ADMIN_KEY="DEV_SHARED_SECRET_ADMIN_KEY"

# Delete the cancelled job
curl -X POST http://localhost:3000/api/fh/jobs/{jobId}/delete \
  -H "X-Admin-Key: DEV_SHARED_SECRET_ADMIN_KEY"

# Verify job is gone
curl http://localhost:3000/api/fh/jobs/{jobId}
# Expected: 404 Not Found
```

### 3. Test UI Actions

1. Navigate to http://localhost:3000/jobs
2. Click on any RUNNING or QUEUED job
3. Verify "Cancel Job" button appears
4. Click cancel, verify toast notification and status update
5. Log into admin (http://localhost:3000/admin)
6. Return to job detail page
7. Verify "Delete Job (Admin)" button appears
8. Click delete, verify redirect to job list
9. Verify job no longer appears in list

### 4. Test Abort During Processing

1. Create a job with a complex claim (triggers long-running analysis)
2. Click "Cancel Job" while status is RUNNING
3. Check runner logs for abort detection
4. Verify status transitions to CANCELLED mid-processing

### 5. Build Verification

```bash
# Verify TypeScript compilation
cd apps/web && npm run build
# ✅ Build successful (verified 2026-02-18)

# Verify tests pass
npm test

# NOTE: Do NOT run expensive tests (test:llm, test:expensive) unless explicitly needed
```

---

## Edge Cases & Considerations

1. **Idempotency**: Cancelling an already-cancelled job returns 200 OK (no error) ✅
2. **Final states**: Cannot cancel SUCCEEDED or FAILED jobs (already terminal) ✅
3. **Race conditions**: If cancel is called while job completes, last write wins ✅
4. **Runner offline**: Abort call fails gracefully (job still marked CANCELLED in DB) ✅
5. **Delete cascade**: JobEvents are automatically deleted via ON DELETE CASCADE ✅
6. **Admin key detection**: UI checks sessionStorage for admin key to show delete button ✅
7. **Abort signal cleanup**: Signals cleared in pipeline finally block to avoid memory leaks ✅

---

## Future Enhancements

1. **User ownership**: Add userId to JobEntity, filter cancel/delete by owner
2. **Batch operations**: Allow selecting multiple jobs for bulk cancel/delete
3. **Audit trail**: Keep deleted job metadata in archive table
4. **Confirmation modals**: Add more detailed confirmation dialogs with job details
5. **Optimistic UI**: Update job list immediately, rollback on error
6. **WebSocket notifications**: Real-time status updates instead of polling

---

## Implementation Notes

- Build verified successful on 2026-02-18
- All TypeScript type errors resolved (Next.js 15+ params signature)
- CANCELLED status integrated throughout UI with gray color scheme
- Abort signal checks placed before all 5 pipeline stages
- Delete button only shows when admin key present in sessionStorage
