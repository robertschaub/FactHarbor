# Security (FactHarbor POC1)

> Report suspected vulnerabilities privately to **info@factharbor.ch**. Include the affected version, impact and safe reproduction details; omit credentials and personal data. Do not publish exploitable details in a public issue.

## Secrets
Do not commit:
- `apps/web/.env.local`
- `apps/api/appsettings.Development.json`
- any API keys

Commit templates only:
- `apps/web/.env.example`
- `apps/api/appsettings.Development.example.json`

## Internal endpoints and keys
- Next runner endpoint (`/api/internal/run-job`) requires `X-Runner-Key` **when `FH_INTERNAL_RUNNER_KEY` is set** (and is required in production).
- API internal writer endpoints (`/internal/v1/jobs/*`) require `X-Admin-Key` (must match `Admin:Key` in `apps/api/appsettings*.json`).

## Admin endpoints (cost exposure)
- `GET /api/admin/test-config` can trigger paid LLM/search calls. The endpoint requires administrative authentication. Keep `FH_ADMIN_KEY` configured and restrict access; calling the endpoint can incur provider charges.

## URL ingestion (SSRF)
URL fetching must block localhost and private ranges and limit redirects/size.
