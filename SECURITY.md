# Security (FactHarbor POC1)

## Secrets
Do not commit:
- `apps/web/.env.local`
- `apps/api/appsettings.Development.json`
- any API keys

Commit templates only:
- `apps/web/.env.example`
- `apps/api/appsettings.Development.example.json`

## Internal endpoints and keys
- Next runner endpoint requires `X-Runner-Key`
- API internal writer endpoints require `X-Admin-Key`

## URL ingestion (SSRF)
URL fetching must block localhost and private ranges and limit redirects/size.
