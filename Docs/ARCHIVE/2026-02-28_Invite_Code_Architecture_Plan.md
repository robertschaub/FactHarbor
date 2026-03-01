# FactHarbor: Invite Code & Access Control Plan

**Lead Architect:** FactHarbor Agent
**Date:** 2026-02-28
**Status:** PROPOSED

## Goal
Implement a tiered access system that allows public read-only access (search/view) while restricting report generation to users with valid invite codes. Support daily and lifetime quotas per invite code.

## 1. Access Matrix

| Feature | Guest (No Invite) | Default Invite Code | Special Invite Code |
| :--- | :--- | :--- | :--- |
| **Wildcard Search** | ✅ Yes | ✅ Yes | ✅ Yes |
| **View Existing Report** | ✅ Yes | ✅ Yes | ✅ Yes |
| **List Latest Reports** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Submit New Analysis** | ❌ No | ✅ Yes (2/day default) | ✅ Yes (Custom limit) |
| **Lifetime Limit** | N/A | Default (e.g., 5 total) | Custom (e.g., 100 total) |

## 2. API Changes (ASP.NET Core)

### 2.1 Data Model Updates (`apps/api/Data/`)
- **`InviteCodeEntity.cs`**:
  - Add `DailyLimit` (int, default: 2).
  - Add `TotalLimit` (renaming/aliasing `MaxJobs`).
- **`InviteCodeUsageEntity.cs` (New)**:
  - `InviteCode` (string, index)
  - `Date` (DateTime, UTC Date only)
  - `UsageCount` (int)
  - *Purpose:* Track daily usage counts efficiently.

### 2.2 Service Logic (`JobService.cs`)
- **`ValidateInviteCodeAsync`**:
  - Add daily quota check against `InviteCodeUsageEntity`.
  - Return specific error messages (e.g., "Daily limit reached", "Invite code expired").
- **`IncrementInviteUsageAsync`**:
  - Perform atomic increment of `UsedJobs` (lifetime).
  - Upsert `InviteCodeUsageEntity` for the current date.
- **`SearchJobsAsync` (New)**:
  - Implement keyword/wildcard search on `InputValue` and `InputPreview`.

### 2.3 Controller Updates (`JobsController.cs`)
- Update `List` to accept an optional `q` (query) string.
- If `q` is present, call `SearchJobsAsync`.
- Ensure all GET endpoints remain accessible without an invite code.

## 3. Web Frontend Changes (Next.js)

### 3.1 `JobsPage` (`apps/web/src/app/jobs/page.tsx`)
- Add a search bar at the top of the job list.
- Implement debounced search that triggers the API with the `q` parameter.
- Update the UI to show "No results found" for search queries.

### 3.2 `AnalyzePage` (`apps/web/src/app/analyze/page.tsx`)
- Maintain existing invite code field but improve UX.
- Disable "Analyze" button and show a helpful tooltip/message if no invite code is provided.
- Store the invite code in `localStorage` (already implemented, verify persistence).
- **Optional Enhancement:** Add a "Check Code" button or auto-validate to show remaining daily quota.

## 4. Implementation Steps
1. **Migration:** Update SQLite schema with new fields and the usage tracking table.
2. **Backend Logic:** Update `JobService` to enforce the 2/day default limit.
3. **Search API:** Implement the search logic in the backend.
4. **Frontend Search:** Add the search UI to the jobs list.
5. **Validation:** Verify that guest users can search but not submit.
