---
roles:
  - Lead Architect
topics:
  - admin
  - preparation sessions
  - claim selection drafts
  - audit
  - operational recovery
files_touched:
  - Docs/WIP/2026-04-24_Admin_Preparation_Sessions_Control_Plan.md
  - Docs/WIP/README.md
  - Docs/AGENTS/Handoffs/2026-04-24_Lead_Architect_Admin_Preparation_Sessions_Control_Plan.md
  - Docs/AGENTS/Agent_Outputs.md
status: completed
---

# Admin Preparation Sessions Control Plan

## Task

Create a concrete implementation plan for admin visibility and constrained manipulation of preparation-status work, have it reviewed, and document the final plan.

## Output

The reviewed final plan is documented at:

- `Docs/WIP/2026-04-24_Admin_Preparation_Sessions_Control_Plan.md`

It is indexed in:

- `Docs/WIP/README.md`

## Review

Two focused reviews were incorporated before finalizing the plan:

- Lead Developer review: required backend coverage, coherent lazy-expiry list/count semantics, explicit filter precedence, bounded/tolerant `DraftStateJson` parsing, selection-page action alignment, and proxy auth-before-side-effects.
- Security review: required mandatory draft audit events, server-side status gates, passive list reads, read-only admin inspection by default, list data minimization, and query validation/abuse controls.

## Key Decisions

- Admins should administer `ClaimSelectionDraftEntity`, not create synthetic `JobEntity` rows or add a preparation status to `JobEntity`.
- The admin surface should be a dedicated `Preparation Sessions` area under `/admin`, with a read-only detail page by default.
- `GET /v1/claim-selection-drafts` should be an admin-only, side-effect-free list endpoint.
- Draft admin mutations require a durable `ClaimSelectionDraftEventEntity` audit trail before UI actions ship.
- `PREPARING` is visible but not cancellable in v1 because the system cannot reliably abort in-flight Stage 1 LLM work.
- Existing `/jobs` behavior should remain a report-job list, not a mixed draft/job feed.

## Warnings

- Do not implement the admin UI before the backend list contract, audit entity, and service-level action gates exist.
- Do not reuse runner recovery endpoints for admin list polling; list reads must not call `drainDraftQueue()` or trigger work.
- Do not route admins to `/analyze/select/[draftId]` as the default inspection path because that page can perform live user-flow actions.
- Backend tests are required for this feature. The repo currently lacks an API test project, so implementation should either add `apps/api.Tests` or an equivalent documented SQLite integration harness.

## Learnings

- The initial low-risk conclusion only holds if the feature is framed as draft administration, not job administration.
- The existing selection page cancel affordance is broader than the reviewed target behavior; it must be aligned so `PREPARING` cannot be cancelled from UI or service code.
- Passive observability and operational recovery need separate endpoints. Combining them makes normal admin polling capable of changing runtime behavior.

## For Next Agent

Use `Docs/WIP/2026-04-24_Admin_Preparation_Sessions_Control_Plan.md` as the implementation baseline. Start with Slice 1 from the plan: backend list contract, draft audit events, service-level action gates, and backend tests. Treat the Lead Developer and Security review items as accepted constraints, not optional improvements.
