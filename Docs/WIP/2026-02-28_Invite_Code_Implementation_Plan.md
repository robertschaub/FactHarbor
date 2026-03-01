# Invite Code & Access Control — Implementation Plan

**Role:** Senior Developer
**Date:** 2026-02-28
**Status:** READY FOR REVIEW
**Based on:** Architecture plan review findings (B1, H1, M1–M3, L1–L2) + code review findings (M1, M2, L1–L4)

## Context

The invite code access control system is partially implemented in the working tree (uncommitted). The architecture plan review identified a BLOCKER (no DB migration strategy), a HIGH issue (non-atomic validate+increment), and several MEDIUM/LOW gaps. This plan resolves all review findings before the code is committed.

**Goal:** Beta-gate analysis submissions behind invite codes with daily + lifetime quotas, while keeping read/search fully public.

---

## Working Tree State (Already Done — Uncommitted)

`InviteCodeEntity.cs`, `FhDbContext.cs`, `Entities.cs`, `JobService.cs` (ValidateInviteCodeAsync, IncrementInviteUsageAsync), `AnalyzeController.cs` (not yet atomic), `JobsController.cs` (inviteCode in List — to be removed), `Program.cs` (seed), `analyze/page.tsx` (invite code input).

---

## Step 0: DB Reset

**Action:** Stop API → delete `apps/api/factharbor.db` → restart.

`EnsureCreated()` never alters an existing schema. Required for all new fields and the new usage table. Established POC pattern (Role_Learnings, Senior Developer 2026-02-18).

---

## Step 1: Data Layer

### 1a. `apps/api/Data/InviteCodeEntity.cs` — add `DailyLimit`

```csharp
/// <summary>Max submissions per UTC calendar day. 0 = unlimited.</summary>
public int DailyLimit { get; set; } = 2;
```

Keep `MaxJobs` — do not rename.

### 1b. `apps/api/Data/InviteCodeUsageEntity.cs` — CREATE

```csharp
namespace FactHarbor.Api.Data;

public sealed class InviteCodeUsageEntity
{
    public string InviteCode { get; set; } = string.Empty;
    /// <summary>UTC date only — time is always 00:00:00.</summary>
    public DateTime Date { get; set; }
    public int UsageCount { get; set; } = 0;
}
```

Composite PK `(InviteCode, Date)` — required for correct upsert semantics.

### 1c. `apps/api/Data/FhDbContext.cs` — add DbSet + model config

```csharp
public DbSet<InviteCodeUsageEntity> InviteCodeUsage => Set<InviteCodeUsageEntity>();
```

In `OnModelCreating`:
```csharp
modelBuilder.Entity<InviteCodeUsageEntity>(e =>
{
    e.HasKey(x => new { x.InviteCode, x.Date });
    e.HasIndex(x => x.InviteCode);
    e.Property(x => x.Date).HasConversion(
        v => v.ToString("yyyy-MM-dd"),
        v => DateTime.SpecifyKind(
            DateTime.ParseExact(v, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture),
            DateTimeKind.Utc));
});
```

SQLite has no native Date type — store as `"yyyy-MM-dd"` string.
- **Write side:** always use `DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc)` so the value stored and compared is unambiguously UTC.
- **Read side:** `ParseExact` with `InvariantCulture` avoids locale-sensitive parsing; `SpecifyKind(Utc)` prevents the result from being shifted to local time on non-UTC hosts (e.g. US timezones). `AssumeUniversal` alone is insufficient because `DateTime.Parse` can still return a `Local`-kinded value on some runtimes.

### 1d. `apps/api/Program.cs` — add `DailyLimit` to seed

```csharp
db.InviteCodes.Add(new InviteCodeEntity
{
    Code = "BETA-PREVIEW-2026",
    Description = "Default public preview code",
    MaxJobs = 10,
    DailyLimit = 2,
    UsedJobs = 0,
    IsActive = true
});
```

---

## Step 2: Service Layer — `apps/api/Services/JobService.cs`

### 2a. Update `ValidateInviteCodeAsync` (read-only, kept public)

Add daily quota check after lifetime check:
```csharp
if (invite.DailyLimit > 0)
{
    var today = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);
    var usage = await _db.InviteCodeUsage
        .FirstOrDefaultAsync(x => x.InviteCode == code && x.Date == today);
    if (usage != null && usage.UsageCount >= invite.DailyLimit)
        return (false, $"Daily limit reached ({invite.DailyLimit} analyses per day)");
}
```

### 2b. Add `TryClaimInviteSlotAsync` (atomic — replaces controller two-call pattern)

Combines validate + increment in a single DB transaction (fixes H1):

```csharp
public async Task<(bool claimed, string? error)> TryClaimInviteSlotAsync(string? code)
{
    if (string.IsNullOrWhiteSpace(code)) return (false, "Invite code required");

    // IsolationLevel.Serializable maps to BEGIN IMMEDIATE in Microsoft.Data.Sqlite.
    // This acquires a reserved write lock immediately, causing any concurrent
    // writer to block until this transaction commits — eliminating the
    // read-check-write race on both UsedJobs and the daily usage row.
    using var tx = await _db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
    try
    {
        var invite = await _db.InviteCodes.FindAsync(code);
        if (invite == null)   { await tx.RollbackAsync(); return (false, "Invalid invite code"); }
        if (!invite.IsActive) { await tx.RollbackAsync(); return (false, "Invite code is disabled"); }
        if (invite.ExpiresUtc.HasValue && invite.ExpiresUtc.Value < DateTime.UtcNow)
            { await tx.RollbackAsync(); return (false, "Invite code has expired"); }
        if (invite.UsedJobs >= invite.MaxJobs)
            { await tx.RollbackAsync(); return (false, $"Lifetime limit reached ({invite.MaxJobs} total)"); }

        var today = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);
        if (invite.DailyLimit > 0)
        {
            var usage = await _db.InviteCodeUsage.FindAsync(code, today);
            if (usage != null && usage.UsageCount >= invite.DailyLimit)
                { await tx.RollbackAsync(); return (false, $"Daily limit reached ({invite.DailyLimit}/day)"); }
        }

        // All checks passed — apply increments
        invite.UsedJobs++;
        if (invite.DailyLimit > 0)
        {
            var usage = await _db.InviteCodeUsage.FindAsync(code, today);
            if (usage == null)
                _db.InviteCodeUsage.Add(new InviteCodeUsageEntity
                    { InviteCode = code, Date = today, UsageCount = 1 });
            else
                usage.UsageCount++;
        }

        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return (true, null);
    }
    catch { await tx.RollbackAsync(); throw; }
}
```

`IncrementInviteUsageAsync` — remove (subsumed by `TryClaimInviteSlotAsync`).

### 2c. Add `SearchJobsAsync`

```csharp
/// <summary>
/// Full-text search on InputValue and InputPreview.
/// Note: LIKE '%q%' is ASCII case-insensitive in SQLite. Acceptable up to ~10k jobs.
/// </summary>
public async Task<(List<JobEntity> items, int totalCount)> SearchJobsAsync(
    string query, int skip = 0, int take = 50)
{
    var q = $"%{query.Trim()}%";
    var baseQuery = _db.Jobs.Where(j =>
        EF.Functions.Like(j.InputValue, q) ||
        EF.Functions.Like(j.InputPreview ?? "", q));

    var total = await baseQuery.CountAsync();
    var items = await baseQuery
        .OrderByDescending(x => x.CreatedUtc)
        .Skip(skip).Take(take)
        .ToListAsync();

    return (items, total);
}
```

### 2d. Propagate `InviteCode` in `CreateRetryJobAsync`

In the `retryJob` initializer add:
```csharp
InviteCode = originalJob.InviteCode,  // Preserve for audit trail
```

---

## Step 3: API Controllers

### 3a. `apps/api/Controllers/AnalyzeController.cs` — use atomic method

Replace:
```csharp
var (isValid, error) = await _jobs.ValidateInviteCodeAsync(req.inviteCode);
if (!isValid) return BadRequest(new { error });
await _jobs.IncrementInviteUsageAsync(req.inviteCode!);
```
With:
```csharp
var (claimed, error) = await _jobs.TryClaimInviteSlotAsync(req.inviteCode);
if (!claimed) return BadRequest(new { error });
```

### 3b. `apps/api/Controllers/JobsController.cs` — search + privacy fix

Add `string? q = null` to `List` signature. When `q` is non-empty call `SearchJobsAsync` and use its returned `totalCount`; otherwise use existing paginated flow.

Remove `inviteCode = j.InviteCode` from **both** the List and the single-job `Get` responses. Job IDs are publicly listed, so any caller can iterate the list and then GET each job — keeping the field on `Get` still leaks all codes. Invite code is access-control data; it has no display value for regular users. Admins needing this for debugging query the DB directly.

---

## Step 4: Proxy Route

### `apps/web/src/app/api/fh/jobs/route.ts` — forward `q`

Add alongside existing `page`/`pageSize` forwarding:
```typescript
const q = searchParams.get("q");
if (q) upstreamUrl.searchParams.set("q", q);
```

---

## Step 5: Frontend

### 5a. `apps/web/src/app/jobs/page.tsx` — search bar

- Add `searchQuery` state + 400ms debounced `debouncedQuery`
- When `debouncedQuery` changes: reset to page 1, append `?q=...` to fetch URL
- Text input above job list
- "No results for '…'" empty state when `jobs.length === 0` and query is active
- Pagination works with search (server returns `totalCount`)

### 5b. `apps/web/src/app/analyze/page.tsx` — button guard fix

```typescript
// Before:
disabled={isSubmitting || !hasInput}
// After:
disabled={isSubmitting || !hasInput || !inviteCode.trim()}
```

---

## Step 6: Calibration Fixes (Uncommitted — Ship in Same Batch)

### 6a. `apps/web/src/lib/calibration/runner.ts:255` — generic fixture selection (review M1)

```typescript
// Replace:
const inversePair = pairs.find((p) => p.id === "inverse-minwage-employment-en");
// With:
const inversePair = pairs.find((p) => p.isStrictInverse && p.language === "en");
```

### 6b. `apps/web/test/calibration/framing-symmetry.test.ts:371` — UCM-aware gate (review M2)

```typescript
if (am.strictInversePairCount > 0) {
  const gateAction =
    (result.configSnapshot.pipeline["calibrationInverseGateAction"] as string) ?? "warn";
  console.log(
    `  Strict inverse gate: ${am.strictInverseGatePassed ? "PASS" : "FAIL"} (action: ${gateAction})`,
  );
  if (gateAction === "fail") {
    expect(am.strictInverseGatePassed).toBe(true);
  }
}
```

With current config (`action: "warn"`), logs without failing. Switching UCM to `"fail"` auto-promotes to hard assertion.

---

## Files Changed

| # | File | Action | Addresses |
|---|------|--------|-----------|
| 1 | `apps/api/Data/InviteCodeEntity.cs` | Modify — add `DailyLimit` | B1, H1 |
| 2 | `apps/api/Data/InviteCodeUsageEntity.cs` | **Create** | B1, arch-M1 |
| 3 | `apps/api/Data/FhDbContext.cs` | Modify — `InviteCodeUsage` DbSet + composite key + date conversion | B1, arch-M1 |
| 4 | `apps/api/Program.cs` | Modify — `DailyLimit` in seed | arch alignment |
| 5 | `apps/api/Services/JobService.cs` | Modify — `TryClaimInviteSlotAsync`, `SearchJobsAsync`, retry `InviteCode` | H1, arch-M1/M3, review-L3 |
| 6 | `apps/api/Controllers/AnalyzeController.cs` | Modify — use atomic method | H1 |
| 7 | `apps/api/Controllers/JobsController.cs` | Modify — `?q=` search, remove inviteCode from List **and** Get | arch-M3, review-L2 |
| 8 | `apps/web/src/app/api/fh/jobs/route.ts` | Modify — forward `q` param | arch-M3 |
| 9 | `apps/web/src/app/jobs/page.tsx` | Modify — search bar + debounced fetch | arch-M3 |
| 10 | `apps/web/src/app/analyze/page.tsx` | Modify — button disabled guard | review-L4 |
| 11 | `apps/web/src/lib/calibration/runner.ts` | Modify — generic fixture selection | review-M1 |
| 12 | `apps/web/test/calibration/framing-symmetry.test.ts` | Modify — UCM-aware gate assertion | review-M2 |

## Deferred

- Invite code admin UI
- "Check Code" quota endpoint
- Search FTS index (revisit at 10k+ jobs)
- Proper EF migrations (production requirement)

---

## Verification

1. Delete `factharbor.db`, restart API → `InviteCodeUsage` table exists
2. `cd apps/api && dotnet build` — clean
3. `npm -w apps/web run build` — clean
4. `npm test` — all pass
5. Submit with valid code → `UsedJobs = 1`, `InviteCodeUsage` row with `count = 1`
6. 3rd submission same day → `400 "Daily limit reached (2/day)"`
7. `GET /v1/jobs?q=climate` → only matching jobs, correct `totalCount`
8. `GET /v1/jobs` and `GET /v1/jobs/{id}` → no `inviteCode` field in either response
9. Analyze page with empty code → Submit button disabled
10. Calibration quick mode picks first `isStrictInverse && language === "en"` pair
