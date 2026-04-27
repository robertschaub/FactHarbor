---
title: Admin Preparation Sessions Control Plan
date: 2026-04-24
authors: Lead Architect, Codex (GPT-5)
status: Updated after 2026-04-27 codebase resync and debate
scope: Admin visibility and constrained control for ClaimSelectionDraft preparation sessions
related:
  - Docs/AGENTS/Handoffs/2026-04-24_Lead_Architect_Preparation_Jobs_Admin_Control_Assessment.md
  - Docs/AGENTS/Handoffs/2026-04-27_Lead_Developer_Analyze_Report_Processing_Sessions.md
  - Docs/AGENTS/Handoffs/2026-04-27_Lead_Developer_Stale_Draft_Preparation_Recovery.md
  - Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md
  - apps/api/Controllers/ClaimSelectionDraftsController.cs
  - apps/api/Services/ClaimSelectionDraftService.cs
  - apps/api/Data/Entities.cs
  - apps/web/src/app/analyze/ActiveClaimSelectionSessions.tsx
  - apps/web/src/app/analyze/select/[draftId]/page.tsx
  - apps/web/src/app/api/fh/claim-selection-drafts/route.ts
  - apps/web/src/lib/claim-selection-client.ts
  - apps/web/src/lib/internal-runner-queue.ts
---

# Admin Preparation Sessions Control Plan

## 1. Decision

Admins should be able to see and manage preparation-stage work, but the surface must administer `ClaimSelectionDraftEntity`, not synthesize fake `JobEntity` rows or introduce a new `JobEntity` lifecycle state.

The final shape is an admin-only **Preparation Sessions** area:

- lists active and diagnostic claim-selection drafts
- exposes read-only draft detail without opening the live user selection flow by default
- allows only status-gated service actions
- records durable audit events for admin draft mutations
- keeps normal `/jobs` behavior unchanged

This is an operational recovery and observability surface, not a general draft authoring tool.

After the April 27 fixes, the plan is no longer recommended as one immediate full implementation. The architecture should remain, but delivery should start with the narrow `PREPARING` cancellation safety fix, then test foundation, then read-only admin observability, and only then audited admin mutations.

## 2. Review Status

This plan incorporates two focused reviews.

Lead Developer review required:

- aligning the action matrix with the existing selection page and backend service
- making lazy expiry part of the list/count design
- adding backend coverage, not only Next.js proxy tests
- making `DraftStateJson` metadata parsing tolerant and bounded
- ensuring proxy auth happens before any side effect
- defining filter precedence and page-size caps

Security review required:

- making draft audit events mandatory, not optional
- enforcing cancel/status gates server-side
- avoiding the normal `/analyze/select/[draftId]` page as the default admin inspection view because it can perform live actions
- removing queue-drain side effects from list reads
- minimizing list data and avoiding raw exception/detail leakage
- adding query validation and abuse controls

All review blockers are incorporated below.

### 2.1 April 27 Codebase Resync

Several fixes landed after the April 24 plan. They reduce urgency for a full admin UI, but they do not make the plan obsolete.

Implemented since the original plan:

- `/analyze` now has a same-browser active-session resume surface in `ActiveClaimSelectionSessions.tsx`.
- Completed/final-job sessions are removed from the analyze resume registry instead of being displayed as report-processing sessions.
- Session refs are stored in `localStorage`; per-draft access uses session storage and a scoped `httpOnly` cookie fallback through the Next.js proxy.
- Draft preparation now has its own runner lane instead of sharing only the report-job lane.
- Stale locally tracked `PREPARING` drafts fail after the shared stale-running threshold, and orphaned `PREPARING` drafts after restart are requeued.
- Runner/status heartbeat work improved observability for long-running work.

Still missing in the current codebase:

- no admin root `GET /v1/claim-selection-drafts`
- no Next.js admin list proxy
- no `/admin/preparation` route
- no `ClaimSelectionDraftEventEntity`
- no source API test project
- `CancelDraftAsync(...)` still cancels any non-terminal draft, including `PREPARING`
- `/analyze/select/[draftId]` still shows cancel for any non-terminal draft, including `PREPARING`
- per-draft `GET /api/fh/claim-selection-drafts/[draftId]` intentionally calls `drainDraftQueue()` and is therefore not a passive admin-list read

### 2.2 Debate Disposition

The April 27 debate verdict is **MODIFY**.

The architecture remains correct:

- administer `ClaimSelectionDraftEntity`, not `JobEntity`
- keep `/jobs` as a report-job list
- separate passive admin inspection from recovery reads
- keep list/detail responses metadata-minimized
- require durable draft audit before exposing admin mutations
- keep `PREPARING` visible but non-cancellable

The sequencing changes:

- implement only the immediate safety slice now
- do not build the full admin preparation UI/control surface before backend tests and draft audit exist
- treat the read-only admin list as the next useful observability slice, not as a prerequisite for the immediate safety fix

## 3. Non-Goals

- No `JobEntity` row before a real report job exists.
- No new `JobEntity.Status` such as `PREPARING_CLAIM_SELECTION`.
- No raw `DraftStateJson` editing.
- No arbitrary status mutation endpoint.
- No claim rewrite/split/merge UI.
- No claim that `PREPARING` cancellation can stop in-flight Stage 1 LLM work.
- No non-admin draft enumeration.
- No passive list read that starts queue recovery, auto-confirm, or other runner work.

## 4. Source-Grounded Current State

- `JobEntity` and `ClaimSelectionDraftEntity` are already separate in `apps/api/Data/Entities.cs`.
- A real job is created from a draft only through `JobService.CreateJobFromDraftAsync(...)`.
- Drafts already carry `Status`, `Progress`, `FinalJobId`, `DraftStateJson`, `LastEventMessage`, and `IsHidden`.
- Existing draft routes already support get-by-id, confirm, cancel, hide/unhide, retry, restart, and selection-state updates.
- The draft detail page currently states that preparation sessions do not appear in the global reports list until a real report job exists.
- The runner has internal draft recovery endpoints, but those are runner contracts, not UI contracts.

## 5. Backend Plan

### 5.1 Draft Admin List Contract

Add one admin-only API list endpoint:

```text
GET /v1/claim-selection-drafts
```

`POST /v1/claim-selection-drafts` remains public draft creation. The new `GET` method on the same route requires a valid `X-Admin-Key`.

Do not reuse:

```text
GET /internal/v1/claim-selection-drafts/recoverable
GET /internal/v1/claim-selection-drafts/idle-auto-proceed-due
```

Those endpoints stay runner-only and may have side effects downstream through runner drain behavior.

### 5.2 Paged Service Method

Add a single service method instead of separate list/count methods:

```csharp
Task<AdminDraftListPage> ListDraftsForAdminAsync(AdminDraftListQuery query)
```

This method must:

- run lazy expiry before counting or materializing rows
- return `items`, `page`, `pageSize`, `totalCount`, and `totalPages` from one coherent flow
- tolerate malformed `DraftStateJson`
- never throw because one draft has corrupt JSON

Lazy expiry rule:

- expire active drafts whose `ExpiresUtc < now` before applying list filters
- save expiry mutations before calculating `totalCount`
- keep count and list from drifting due to expiry side effects

### 5.3 Filter Contract

Use explicit filter precedence.

Default:

```text
scope=active
hidden=include
page=1
pageSize=25
```

Allowed scopes:

- `active`: `QUEUED`, `PREPARING`, `AWAITING_CLAIM_SELECTION`, `FAILED`
- `terminal`: `COMPLETED`, `CANCELLED`, `EXPIRED`
- `all`: all known draft statuses

If one or more `status` values are provided, `status` overrides `scope`.

Allowed status values:

- `QUEUED`
- `PREPARING`
- `AWAITING_CLAIM_SELECTION`
- `FAILED`
- `COMPLETED`
- `CANCELLED`
- `EXPIRED`

Allowed hidden filters:

- `include` (default for admins)
- `exclude`
- `only`

Allowed linked filters:

- `any` (default)
- `withFinalJob`
- `withoutFinalJob`

Allowed selection modes:

- `interactive`
- `automatic`

Limits:

- `pageSize` hard cap: 100
- `q` max length: 120
- invalid enum values return `400`
- order by `UpdatedUtc DESC`, then `DraftId ASC` for stable pagination

Search:

- search only `ActiveInputValue` and `OriginalInputValue`
- use parameterized EF queries
- escape SQL LIKE wildcard characters
- do not expose full input in the list response

### 5.4 List Response Shape

Return metadata only:

```ts
type AdminDraftSummary = {
  draftId: string;
  status: string;
  progress: number;
  isHidden: boolean;
  selectionMode: "interactive" | "automatic";
  activeInputType: "text" | "url";
  inputPreview: string | null;
  finalJobId: string | null;
  createdUtc: string;
  updatedUtc: string;
  expiresUtc: string;
  restartCount: number;
  restartedViaOther: boolean;
  hasPreparedStage1: boolean;
  lastErrorCode: string | null;
  eventSummary: string | null;
};
```

Data minimization rules:

- `inputPreview` is capped at 96 characters, normalized to one line, and never includes the full input.
- `eventSummary` is sanitized and capped at 120 characters.
- raw exception messages should not appear in the list; prefer `lastErrorCode`.
- never return `DraftAccessTokenHash`, draft access tokens, full `DraftStateJson`, full `ActiveInputValue`, or full `OriginalInputValue` from the list.

Full draft detail remains available through existing admin-authorized get-by-id behavior, but the list stays intentionally compact.

### 5.5 Mandatory Draft Audit Events

Add a draft event table before exposing admin UI actions.

Recommended entity:

```csharp
public sealed class ClaimSelectionDraftEventEntity
{
    [Key]
    public long Id { get; set; }
    public string DraftId { get; set; } = "";
    public DateTime TsUtc { get; set; } = DateTime.UtcNow;
    public string ActorType { get; set; } = "system"; // admin, draft_token, runner, system
    public string Action { get; set; } = "";
    public string Result { get; set; } = "success"; // success, rejected, failed
    public string? BeforeStatus { get; set; }
    public string? AfterStatus { get; set; }
    public string? SourceIp { get; set; }
    public string? Message { get; set; }
}
```

Index:

```text
(DraftId, Id)
```

Do not store admin keys, draft tokens, or secrets.

Mandatory audited mutations:

- draft creation
- admin hide
- admin unhide
- admin cancel
- admin retry
- admin confirm, if confirmation is performed with `X-Admin-Key`
- runner prepared
- runner failed
- auto-confirm
- expiry mutation when discovered by lazy expiry

The implementation can audit draft-token user actions too, but admin actions are non-negotiable.

### 5.6 Server-Side Action Gates

The UI action matrix must be enforced in `ClaimSelectionDraftService`, not only in React.

Recommended v1 gates:

| Action | Allowed statuses | Notes |
|---|---|---|
| Open admin detail | all | Read-only admin surface. |
| Hide/unhide | all | Propagates to linked job when `FinalJobId` exists. |
| Retry | `FAILED` | Existing invariant; keep server-side. |
| Cancel | `QUEUED`, `AWAITING_CLAIM_SELECTION`, `FAILED` | `PREPARING` returns `409` because it cannot abort running Stage 1. |
| Confirm | `AWAITING_CLAIM_SELECTION` | Existing selected-claim validation remains authoritative. |
| Restart with other input | existing user flow only | Not a list-level admin action in v1. |
| Delete | none | Out of scope. |

Change `CancelDraftAsync(...)` or introduce a stricter admin cancellation path so `PREPARING` cannot be cancelled from admin UI or the existing selection page.

Preferred final behavior:

- `PREPARING` cancel returns `409` with a message equivalent to: "Preparation is already running and cannot be cancelled until it reaches a selectable, failed, or queued state."
- terminal statuses remain idempotent no-ops.
- `FAILED` can be cancelled because no compute is running and the draft may need administrative cleanup.

### 5.7 Existing Selection Page Alignment

The existing selection page currently enables cancel for any non-terminal draft. That must be updated to match the server gate.

Required change:

- `canCancelSession` excludes `PREPARING`
- failed drafts may still be cancelled or retried, matching the server action matrix
- UI copy must not imply that cancel stops running Stage 1 work

Admin inspection must not default to opening `/analyze/select/[draftId]` because that page can auto-confirm or perform live actions. Use the new admin read-only detail route instead.

## 6. Next.js Proxy Plan

Extend:

```text
apps/web/src/app/api/fh/claim-selection-drafts/route.ts
```

with `GET`.

Requirements:

- `export const dynamic = "force-dynamic"`
- reject non-admin requests before upstream fetch
- reject non-admin requests before any side effect
- whitelist and normalize query parameters before forwarding
- forward `X-Admin-Key` only after `checkAdminKey(request)` succeeds
- `cache: "no-store"`
- do not call `drainDraftQueue()` from this GET route

The review specifically rejected list polling that kicks queue recovery. If a manual recovery control is needed later, add an explicit admin `POST` endpoint with clear labeling and audit.

## 7. Admin UI Plan

### 7.1 Route

Add:

```text
apps/web/src/app/admin/preparation/page.tsx
apps/web/src/app/admin/preparation/[draftId]/page.tsx
```

Add a link from `/admin` under **Job Audit & Debugging**:

```text
Preparation Sessions
```

Use `useAdminAuth().getHeaders()` instead of reading `sessionStorage` directly.

### 7.2 List Page

The list page shows:

- status
- progress
- hidden badge
- input preview
- selection mode
- last updated age
- expiry
- final job link when present
- last error code
- sanitized event summary
- available actions

Poll only when at least one visible row is `QUEUED` or `PREPARING`. Pause polling while the tab is hidden.

GET polling must remain read-only.

### 7.3 Read-Only Admin Detail

The detail route should inspect the draft without using the live user selection page.

It may show:

- full metadata
- active/original input
- candidate claims when `preparedStage1` exists
- selected/recommended IDs
- failure diagnostics
- final job link
- event history after draft events exist

It should not auto-confirm anything on load.

If an admin needs to continue a draft through the user selection flow, expose an explicit secondary action such as:

```text
Open live selection flow
```

That action should be visually distinct and should not be the default row click.

### 7.4 UI Action Matrix

| Draft status | Primary display | Actions |
|---|---|---|
| `QUEUED` | Waiting for preparation | View, hide/unhide, cancel |
| `PREPARING` | Running preparation | View, hide/unhide only |
| `AWAITING_CLAIM_SELECTION` | Ready for selection | View, hide/unhide, cancel, open live selection flow |
| `FAILED` | Preparation failed | View, hide/unhide, retry, cancel |
| `COMPLETED` | Job created | View, hide/unhide, open report |
| `CANCELLED` | Cancelled | View, hide/unhide |
| `EXPIRED` | Expired | View, hide/unhide |

The UI must handle `409` responses from stale action buttons gracefully because another actor or the runner may transition the draft after the list renders.

## 8. Test Plan

### 8.1 API Tests

There is currently no API test project. This feature should add one of:

- a minimal `apps/api.Tests` project with xUnit and SQLite-backed EF tests, added to `FactHarbor.sln`
- or an equivalent seeded SQLite integration harness documented and runnable from the repo

Preferred: create `apps/api.Tests` because the highest-risk logic is in C# service/controller behavior.

Required backend coverage:

- non-admin `GET /v1/claim-selection-drafts` is rejected
- admin list returns hidden drafts by default and marks them
- `status` overrides `scope`
- invalid status, hidden, linked, selectionMode, page, pageSize, and overlong `q` fail predictably
- `pageSize` cap is enforced
- stable ordering by `UpdatedUtc DESC`, `DraftId ASC`
- lazy expiry happens before count/list
- malformed `DraftStateJson` does not break list
- `hasPreparedStage1` works for valid, missing, and malformed JSON
- `lastErrorCode` works for valid, missing, and malformed JSON
- admin cancel rejects `PREPARING`
- admin cancel allows `QUEUED`, `AWAITING_CLAIM_SELECTION`, and `FAILED`
- admin hide/unhide propagates to linked `JobEntity`
- admin mutations write `ClaimSelectionDraftEventEntity`

### 8.2 Next.js Route Tests

Extend:

```text
apps/web/test/unit/app/api/fh/claim-selection-drafts-routes.test.ts
```

Required coverage:

- root `GET` requires admin
- root `GET` rejects non-admin before upstream fetch
- root `GET` rejects non-admin before queue drain or any side effect
- allowed query params are forwarded
- disallowed query params are dropped or rejected according to the final route helper contract
- `X-Admin-Key` is forwarded only after local admin validation
- `cache: "no-store"` is used
- `drainDraftQueue()` is not called by list GET

### 8.3 UI Tests

Add helper-level tests for action availability:

- retry only `FAILED`
- cancel `QUEUED`, `AWAITING_CLAIM_SELECTION`, and `FAILED`
- `PREPARING` is read-only except hide/unhide
- `COMPLETED` shows final job link
- terminal statuses do not show live mutation actions

Update existing selection-page behavior tests or add focused coverage so `PREPARING` cancel is no longer offered.

### 8.4 Verification Commands

Safe verification:

```powershell
npm test
npm -w apps/web run build
dotnet build apps/api/FactHarbor.Api.csproj
dotnet test
```

Do not run expensive LLM validation suites for this feature.

## 9. Revised Implementation Sequence

### Slice 0 — Immediate Safety Alignment

Implement now if a small safety slice is acceptable.

Files:

- `apps/api/Services/ClaimSelectionDraftService.cs`
- `apps/api/Controllers/ClaimSelectionDraftsController.cs`, only if controller-level error shaping is needed
- `apps/web/src/app/analyze/select/[draftId]/page.tsx`
- focused tests around service/UI cancellation behavior

Deliver:

- `CancelDraftAsync(...)` rejects `PREPARING` with `409`
- existing selection page excludes `PREPARING` from `canCancelSession`
- terminal statuses remain idempotent
- `FAILED` remains cancellable
- UI copy does not imply cancel can abort active Stage 1 work

This is the only slice recommended for immediate implementation before broader admin tooling.

### Slice 1 — Backend Test And Contract Foundation

Implement before read-only admin listing or admin mutations.

Files:

- new `apps/api.Tests` project or equivalent seeded SQLite integration harness
- `FactHarbor.sln`
- focused service/controller tests

Deliver:

- API test coverage for draft action gates
- API test coverage for hide/unhide propagation to linked jobs
- API test coverage for stale recovery semantics where practical
- API test coverage distinguishing passive reads from recovery-triggering reads

The April 27 debate treated this as a prerequisite for expanding admin draft behavior safely.

### Slice 2 — Read-Only Admin List And Detail

Files:

- `apps/api/Data/Entities.cs`
- `apps/api/Data/FhDbContext.cs`
- `apps/api/Services/ClaimSelectionDraftService.cs`
- `apps/api/Controllers/ClaimSelectionDraftsController.cs`
- `apps/web/src/app/api/fh/claim-selection-drafts/route.ts`
- `apps/web/src/app/admin/page.tsx`
- `apps/web/src/app/admin/preparation/page.tsx`
- `apps/web/src/app/admin/preparation/[draftId]/page.tsx`
- route/UI tests

Deliver:

- admin list query contract
- single paged admin list service method
- admin-only root `GET`
- query whitelist
- no side effects on GET
- metadata-minimized list response
- read-only admin detail view
- event history placeholder if durable events do not exist yet
- action failure handling

This slice should not expose cancel/retry/confirm admin controls yet. Hide/unhide may remain available through the existing per-draft admin action, but the new admin list/detail should initially be read-only unless Slice 3 has landed.

### Slice 3 — Draft Audit And Controlled Admin Mutations

Implement only after Slice 1 and preferably after Slice 2.

Files:

- `apps/api/Data/Entities.cs`
- `apps/api/Data/FhDbContext.cs`
- `apps/api/migrations/*`
- `apps/api/Services/ClaimSelectionDraftService.cs`
- `apps/api/Controllers/ClaimSelectionDraftsController.cs`
- `apps/web/src/app/admin/preparation/page.tsx`
- `apps/web/src/app/admin/preparation/[draftId]/page.tsx`
- backend and route/UI tests

Deliver:

- `ClaimSelectionDraftEventEntity`
- audit writes for admin hide/unhide/cancel/retry/confirm
- audit writes for runner prepared/failed, auto-confirm, creation, and lazy-expiry mutation where practical
- admin controls for allowed statuses only
- `PREPARING` remains read-only except hide/unhide
- stale-button `409` handling in the UI

No admin mutation control should ship from the new admin surface before durable draft events exist.

### Deferred Slice — Explicit Recovery Kick

If operators still need manual queue recovery after the read-only admin list lands, add a separate explicit admin action:

```text
POST /api/fh/claim-selection-drafts/recover
```

This action must be audited and clearly labeled because it can cause runner-side work. It must not be hidden inside list polling.

## 10. Acceptance Criteria

### 10.1 Immediate Safety Slice Acceptance

Slice 0 is complete when:

1. `PREPARING` cannot be cancelled through `CancelDraftAsync(...)`.
2. `/analyze/select/[draftId]` does not offer a cancel affordance while status is `PREPARING`.
3. `QUEUED`, `AWAITING_CLAIM_SELECTION`, and `FAILED` cancellation behavior is intentionally preserved.
4. terminal statuses remain idempotent.
5. focused tests or documented service verification cover the revised gate.

### 10.2 Full Admin Feature Acceptance

The full admin feature is implementation-ready only when:

1. Admins can list preparation sessions without creating `JobEntity` rows.
2. Non-admins cannot enumerate drafts.
3. List reads have no runner side effects.
4. Hidden drafts are visible to admins by default and marked.
5. List output is metadata-minimized.
6. Draft admin mutations are audited.
7. `PREPARING` cannot be cancelled through admin UI, selection page UI, or backend service.
8. Existing draft confirm/retry/selection validation remains authoritative.
9. Backend tests cover list filters, expiry, malformed JSON, action gates, and audit writes.
10. Web tests cover proxy auth and no-side-effect behavior.
11. `/jobs` remains a report-job list, not a mixed draft/job feed.

## 11. Residual Risks

- Adding draft events is a schema change and needs the normal migration discipline.
- Backend test infrastructure does not currently exist; adding it is extra setup, but this feature is not safe with build-only API verification.
- Admin list search still touches potentially sensitive input text server-side. Keep it admin-only, length-capped, and metadata-minimized.
- `PREPARING` still cannot be hard-aborted. The plan intentionally avoids pretending otherwise.
- Recent stale-draft recovery reduces indefinite `PREPARING` risk, but it does not replace explicit admin observability.
- The current analyze resume surface is user/session UX, not an admin operations tool.
- Current status priorities still favor analysis quality and evidence/provenance integrity; full admin tooling should not displace that work without a concrete operator need.

## 12. Final Recommendation

Proceed with **Slice 0 only now** if the team wants a low-risk current-code safety cleanup.

Do **not** implement the full admin preparation-session UI/control surface immediately unless there is a concrete operational need, because recent fixes reduced the urgency:

- same-browser resume cleanup now removes final-job sessions from the analyze resume list
- draft preparation has a separate runner lane
- stale locally tracked `PREPARING` drafts fail instead of staying stuck indefinitely
- orphaned `PREPARING` drafts after restart are requeued
- heartbeat work improved long-running status visibility

The broader admin feature remains valid and should be kept as the next operations-observability track, but it should be sequenced as:

1. immediate safety alignment: block `PREPARING` cancel in service and existing UI
2. API test foundation
3. read-only passive admin list/detail
4. durable draft audit and controlled admin mutations

The reviewed and rebased plan is stricter than the initial debate output:

- audit is mandatory
- status gates are backend-enforced
- list reads are passive
- admin inspection is read-only by default
- `PREPARING` is visible but not cancellable in v1

That keeps the feature low risk while acknowledging the April 27 fixes: full implementation still makes architectural sense, but the right immediate move is a small safety slice, not the whole admin control surface.
