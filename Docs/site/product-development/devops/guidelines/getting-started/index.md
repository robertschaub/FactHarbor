# Getting started with FactHarbor

This guide covers a local public checkout. For checks without credentials or running services, follow [credential-free checks](https://github.com/robertschaub/FactHarbor/blob/main/CONTRIBUTING.md#credential-free-worker-checks).

## Prerequisites

- Git, Node.js **22.23.3 or later**, and .NET SDK **8.0.x**.
- Python 3.12 or later only if you want the documentation preview.
- Model and search provider credentials for the providers selected in your configuration, if you intend to run analyses. Provider calls can incur charges.

## Repository and environment

```powershell
git clone https://github.com/robertschaub/FactHarbor.git
cd FactHarbor
Copy-Item apps/web/.env.example apps/web/.env.local
Copy-Item apps/api/appsettings.Development.example.json apps/api/appsettings.Development.json
```

Run the copy commands only for a new setup; preserve existing settings. Edit the local copies and keep secrets out of Git. The checked-in templates document the available infrastructure and credential fields.

| Web setting | Corresponding API setting |
|---|---|
| `FH_API_BASE_URL` | API address, normally `http://localhost:5000` locally |
| `FH_ADMIN_KEY` | `Admin:Key` |
| `FH_INTERNAL_RUNNER_KEY` | `Runner:RunnerKey` |
| Web runner address | `Runner:BaseUrl`, normally `http://localhost:3000` |

Set keys for the configured model/search providers. Model selection, prompts and analysis settings belong in [UCM](https://github.com/robertschaub/FactHarbor/blob/main/Docs/USER_GUIDES/UCM_Administrator_Handbook.md); environment files hold infrastructure and secrets.

## Start services

On a new local development setup, the repository helper validates configuration and starts both services:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/first-run.ps1
```

For manual startup, install dependencies from the repository root with `npm ci`, then run these in separate terminals:

```powershell
cd apps/api
dotnet watch run
```

```powershell
cd apps/web
npm run dev
```

The API initializes/migrates its configured database on startup. Preserve an existing database and recovery copy; deleting it is not a routine troubleshooting step.

## Check the setup

Open `http://localhost:5000/health` and `http://localhost:3000/api/health`; successful health responses establish reachability. Development Swagger is at `http://localhost:5000/swagger`. Open the web UI at `http://localhost:3000`.

Open `/admin/config` to inspect active configuration before an analysis. Connectivity tests and analysis submission can call paid providers. Project agents must use approved exact inputs and have current authorization for live calls; setup success alone does not grant that authority.

## Troubleshooting

| Symptom | Check |
|---|---|
| Job stays queued | Both services, runner URL and matching runner keys |
| Unauthorized administrative request | Matching admin keys and the expected authentication header |
| Provider unavailable | Active UCM selection, required credentials and provider response; omit secret values from reports |
| Database startup error | API logs, configured path and permissions; preserve the existing database |
| Port occupied | Identify its owner before stopping or restarting a service |
| Saved settings appear unused | Compare the active version and job configuration snapshot; a repository seed is not proof of active runtime state |

Read [CONTRIBUTING](https://github.com/robertschaub/FactHarbor/blob/main/CONTRIBUTING.md) for tests and [documentation authoring](https://github.com/robertschaub/FactHarbor/blob/main/Docs/DEVELOPMENT/Documentation.md) for the local MkDocs preview. When asking for help, provide versions and a sanitized error/reproduction description.
