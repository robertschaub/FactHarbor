# REST API contract

This page describes the current Alpha job interface in the public API source. It is not a commitment to a stable externally hosted service. Development Swagger at `http://localhost:5000/swagger` and the checked-out controllers define the available routes.

## Create an analysis

`POST /v1/analyze` accepts these JSON fields:

| Field | Contract |
|---|---|
| `inputType` | `text` or `url` |
| `inputValue` | Non-empty input; maximum 32,000 characters for text or 2,000 for a URL. URLs require HTTP(S) |
| `pipelineVariant` | `claimboundary`; used by default when omitted |
| `inviteCode` | Required for non-admin submission; an authorized admin key bypasses the invite check |

The endpoint applies structural validation, invite quota and rate limits. Success currently returns **200 OK** with `jobId` and `status`; processing continues asynchronously. A successful creation response is not a finished report. Invalid input/invite conditions return an error; quota contention can return 503 and rate limiting can return 429. The endpoint does not establish a client idempotency-key guarantee: do not blindly resubmit after an ambiguous response.

Analysis submission can call paid model/search providers. Project agents need current submission authority and approved exact wording; an API description is not such authority.

The web client reaches these API operations through its `/api/fh/*` proxy routes. The API paths below are the underlying service contract.

## Read jobs and progress

| Route | Purpose |
|---|---|
| `GET /v1/jobs` | Paginated jobs; `page`, `pageSize`, `q`, and admin-only `gitHash` filtering |
| `GET /v1/jobs/{jobId}` | Status, progress, timestamps, inputs, available verdict fields, parsed `resultJson` and `reportMarkdown` |
| `GET /v1/jobs/{jobId}/events/history` | Recorded job events |
| `GET /v1/jobs/{jobId}/events` | Server-sent progress events |
| `GET /v1/analyze/status` | Invite status using the `X-Invite-Code` header |

When `q` is provided, list search takes precedence over `gitHash`; those filters do not combine.

Readers receive only reports accessible to them; hidden jobs and administrative diagnostic fields have additional checks. Clients must handle absent results until processing finishes and preserve warnings, evidence citations, confidence and publishability qualifications.

Jobs normally move from `QUEUED` to `RUNNING`, then `SUCCEEDED`, `FAILED` or `CANCELLED`. Startup recovery also uses `INTERRUPTED`. Final-state writes are protected by the job service; clients must not infer success from progress alone.

## Administrative and internal operations

The current controller also exposes cancellation/retry, visibility and annotation operations under administrative authorization. These are mutations, not health checks. Internal status/result routes and the runner use their configured shared-secret controls. Keep credentials out of URLs, reports and source control.

## Source contracts

- [Analysis controller](https://github.com/robertschaub/FactHarbor/blob/main/apps/api/Controllers/AnalyzeController.cs): request validation, access and creation response.
- [Job controller](https://github.com/robertschaub/FactHarbor/blob/main/apps/api/Controllers/JobsController.cs): reads, events, filtering and administrative operations.
- [Analysis types](https://github.com/robertschaub/FactHarbor/blob/main/apps/web/src/lib/analyzer/types.ts): current result fields and optionality.
- [API instructions](https://github.com/robertschaub/FactHarbor/blob/main/apps/api/AGENTS.md) and [getting started](../../../../devops/guidelines/getting-started/index.md): configuration and local operation.

The current source has no public user-credit/billing API contract or the older scenario-based three-stage schema. Integration work should use the current public types rather than assuming those proposed capabilities exist.
