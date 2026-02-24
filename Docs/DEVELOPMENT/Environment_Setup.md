# Environment Setup & Internal Keys

This guide explains how to configure the FactHarbor environment and ensure that the **Next.js Web** and **.NET API** components can communicate securely using shared internal keys.

## 1. Key Components

FactHarbor consists of two main services that communicate via HTTP:

*   **Next.js Web (Port 3000)**: Houses the analysis orchestrator, UI, and runner.
*   **ASP.NET Core API (Port 5000)**: Handles job persistence, metrics, and the audit trail.

## 2. Shared Secrets (CRITICAL)

For the system to function, three internal keys **must match** between the Web and API configuration files. If these are mismatched, jobs will remain stuck in `QUEUED` or fail to update progress.

| Key Name | Web Variable (`.env.local`) | API Key (`appsettings.json`) | Purpose |
| :--- | :--- | :--- | :--- |
| **Admin Key** | `FH_ADMIN_KEY` | `Admin:Key` | Secures administrative and internal update endpoints. |
| **Runner Key** | `FH_INTERNAL_RUNNER_KEY` | `Runner:RunnerKey` | Authenticates the API's trigger to the Web runner. |
| **API URL** | `FH_API_BASE_URL` | `Runner:BaseUrl` (inverse) | Defines the communication endpoints. |

### Configuration Mapping

#### Web Configuration (`apps/web/.env.local`)
```bash
FH_API_BASE_URL=http://localhost:5000
FH_ADMIN_KEY=your_shared_admin_secret
FH_INTERNAL_RUNNER_KEY=your_shared_runner_secret
```

#### API Configuration (`apps/api/appsettings.json`)
```json
{
  "Admin": {
    "Key": "your_shared_admin_secret"
  },
  "Runner": {
    "BaseUrl": "http://localhost:3000",
    "RunnerKey": "your_shared_runner_secret"
  }
}
```

## 3. External API Keys

The analysis pipeline requires keys for LLM and Search providers. These are configured in `apps/web/.env.local`.

### LLM Providers (At least one required)
*   `ANTHROPIC_API_KEY`: Required for Claude (default).
*   `OPENAI_API_KEY`: Required for GPT models.
*   `GOOGLE_GENERATIVE_AI_API_KEY`: Required for Gemini models.

### Search Providers (At least one required)
*   `SERPAPI_API_KEY`: For Google/Brave search via SerpAPI.
*   `GOOGLE_CSE_API_KEY` & `GOOGLE_CSE_ID`: For direct Google Custom Search.
*   `BRAVE_API_KEY`: For direct Brave Search.

## 4. Verification

After setting the keys, run the health check script to verify connectivity:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/health.ps1
```

A healthy system will return:
*   `API health: {"ok":true,...}`
*   `Web health: {"ok":true,...}`

---
**See Also:**
* [`AGENTS.md`](../../AGENTS.md) — Authentication header details.
* [`QUICKSTART.md`](../../QUICKSTART.md) — Database and service startup instructions.
