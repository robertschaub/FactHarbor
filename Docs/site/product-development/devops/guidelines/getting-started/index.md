# Getting Started with FactHarbor

## Purpose

This guide will help you set up and run FactHarbor on your local machine from scratch. It combines installation prerequisites with first-run configuration to ensure a smooth setup experience.

For a quick summary, see <a href="https://github.com/robertschaub/FactHarbor/blob/main/CONTRIBUTING.md" rel="noopener" target="_blank">CONTRIBUTING.md</a> in the GitHub repository.

------------------------------------------------------------------------

## Table of Contents

-   [Prerequisites](#prerequisites)
-   [Installation](#installation)
-   [Repository Setup](#repository-setup)
-   [Environment Configuration](#environment-configuration)
-   [Database Initialization](#database-initialization)
-   [Starting Services](#starting-services)
-   [Health Verification](#health-verification)
-   [First Analysis](#first-analysis)
-   [Troubleshooting](#troubleshooting)
-   [Next Steps](#next-steps)

------------------------------------------------------------------------

## Prerequisites

### System Requirements

-   **Operating System**: Windows 10 or 11
-   **Permissions**: Administrator rights for installation

### Required Tools

#### 1. Version Control

**Git for Windows**

-   Download from: <a href="https://git-scm.com/download/win" rel="noopener" target="_blank">https://git-scm.com/download/win</a>
-   Verify installation:

```
git --version
```

#### 2. Runtime & Build Tools

**Node.js (LTS)**

-   Download from: <a href="https://nodejs.org" rel="noopener" target="_blank">https://nodejs.org</a>
-   Install the LTS (Long Term Support) version
-   Verify installation:

```
node -v
npm -v
```

**.NET SDK 8.x**

-   Download from: <a href="https://dotnet.microsoft.com/download" rel="noopener" target="_blank">https://dotnet.microsoft.com/download</a>
-   Install the SDK (not just runtime)
-   Verify installation:

```
dotnet --info
```

#### 3. Development Editors

**Visual Studio 2022**

-   Download from: <a href="https://visualstudio.microsoft.com" rel="noopener" target="_blank">https://visualstudio.microsoft.com</a>
-   Required workload: **ASP.NET and web development**
-   Used for: Backend API development

**Cursor or VS Code**

-   Cursor: <a href="https://cursor.sh" rel="noopener" target="_blank">https://cursor.sh</a>
-   VS Code: <a href="https://code.visualstudio.com" rel="noopener" target="_blank">https://code.visualstudio.com</a>
-   Required extensions:
    -   TypeScript
    -   ESLint
    -   EditorConfig
-   Used for: Frontend web development

### Recommended Tools

**Browser with DevTools**

-   Chrome or Edge (for debugging)

**API Testing Client**

-   Postman (<a href="https://www.postman.com" rel="noopener" target="_blank">https://www.postman.com</a>) or
-   Insomnia (<a href="https://insomnia.rest" rel="noopener" target="_blank">https://insomnia.rest</a>)

**Database Inspection (Optional)**

-   SQLite browser for read-only database inspection

### Tools to Defer

**Do NOT install these yet** (not needed for local development):

-   Docker Desktop
-   PostgreSQL
-   Azure or Vercel CLIs

------------------------------------------------------------------------

## Installation

### Verification

After installing all prerequisites, verify everything is working:

```
git --version
node -v
npm -v
dotnet --info
```

All commands must succeed before continuing.

### Installation Hints

-   Avoid preview or nightly runtime versions
-   Use stable LTS releases for Node.js and .NET
-   Use one editor per role:
    -   Visual Studio 2022 for API (.NET)
    -   Cursor/VS Code for Web (TypeScript)

------------------------------------------------------------------------

## Repository Setup

### 1. Clone the Repository

```
git clone https://github.com/robertschaub/FactHarbor.git
cd factharbor
```

### 2. Open in Editors

-   **API**: Open `apps/api` folder in Visual Studio 2022
-   **Web**: Open root folder in Cursor or VS Code

**Important**: Do not change configuration files yet!

------------------------------------------------------------------------

## Environment Configuration

<span id="web-configuration-apps-web"></span>

### Web Configuration (`apps/web`)

1.  Navigate to `apps/web`
2.  Copy the example environment file:

```
copy .env.example .env.local
```

1.  Edit `.env.local` and configure your API keys and internal secrets:

### Required API Keys

FactHarbor requires API keys from external AI and search providers. You must register with these services before running analyses.

| Provider | Key | Required? | Sign Up |
|----|----|----|----|
| **Anthropic** (Claude) | `ANTHROPIC_API_KEY` | **Yes** | <a href="https://console.anthropic.com/" rel="noopener" target="_blank">console.anthropic.com</a> |
| **OpenAI** | `OPENAI_API_KEY` | **Yes** | <a href="https://platform.openai.com/" rel="noopener" target="_blank">platform.openai.com</a> |
| **Brave Search** | `BRAVE_API_KEY` | **Recommended** | <a href="https://brave.com/search/api" rel="noopener" target="_blank">brave.com/search/api</a> |
| **Google Custom Search** | `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_ID` | Optional | <a href="https://programmablesearchengine.google.com/" rel="noopener" target="_blank">programmablesearchengine.google.com</a> |
| SerpAPI | `SERPAPI_API_KEY` | Optional | <a href="https://serpapi.com/" rel="noopener" target="_blank">serpapi.com</a> |
| Google Fact Check | `GOOGLE_FACTCHECK_API_KEY` | Optional | Google API Console |
| Google Gemini | `GOOGLE_GENERATIVE_AI_API_KEY` | Optional | <a href="https://aistudio.google.com/" rel="noopener" target="_blank">aistudio.google.com</a> |
| Mistral | `MISTRAL_API_KEY` | Optional | <a href="https://console.mistral.ai/" rel="noopener" target="_blank">console.mistral.ai</a> |

> **Info**
>
> **Cost note:** These are commercial services with pay-per-use pricing. Both Anthropic and OpenAI offer free trial credits for new accounts. Brave Search and Google CSE offer free tiers. Typical development usage costs single-digit \$/month. See each provider's website for current pricing and free tier details.

<span id="example-env-local"></span>

### Example .env.local

```
# LLM providers (both required)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Web search (Brave or Google CSE recommended)
BRAVE_API_KEY=...
# GOOGLE_CSE_API_KEY=...
# GOOGLE_CSE_ID=...

# Internal keys (must match API settings)
FH_API_BASE_URL=http://localhost:5000
FH_ADMIN_KEY=your-secure-admin-key
FH_INTERNAL_RUNNER_KEY=your-secure-runner-key
```

<span id="api-configuration-apps-api"></span>

### API Configuration (`apps/api`)

1.  Navigate to `apps/api`
2.  Copy the example settings file:

```
copy appsettings.Development.example.json appsettings.Development.json
```

1.  Edit `appsettings.Development.json` and verify:

```
{
  "Admin": {
    "Key": "your-secure-admin-key"  // Must match FH_ADMIN_KEY
  },
  "Runner": {
    "RunnerKey": "your-secure-runner-key"  // Must match FH_INTERNAL_RUNNER_KEY
  },
  "Db": {
    "Provider": "sqlite"
  }
}
```

### Critical Configuration

**Key mismatches are the \#1 cause of setup failures!**

Ensure these match exactly:

-   `FH_ADMIN_KEY` (web) = `Admin:Key` (API)
-   `FH_INTERNAL_RUNNER_KEY` (web) = `Runner:RunnerKey` (API)

### Configuration Management (UCM)

FactHarbor uses **Unified Config Management (UCM)** for runtime configuration:

-   **API keys** → Environment variables (`.env.local`)
-   **Provider selection & analysis settings** → UCM Admin UI

After first run, configure your LLM provider:

1.  Open http://localhost:3000/admin/config
2.  Go to **Pipeline** config
3.  Set `llmProvider` to your preferred provider (`anthropic`, `openai`, `google`, `mistral`)
4.  Save and activate

**Note:** The deprecated `LLM_PROVIDER` environment variable is no longer used. Provider selection is now managed via UCM.

See [Unified Config Management](../../subsystems-and-components/unified-config-management/index.md) for detailed configuration options.

------------------------------------------------------------------------

## Database Initialization

**POC behavior:** The API creates the SQLite database automatically on startup (no `dotnet ef` step required).

**Expected result on first run:**

-   `apps/api/factharbor.db` file is created automatically
-   API starts without errors

If you already have a corrupted DB and want to reset it (local dev only):

```
cd apps/api
del factharbor.db
```

------------------------------------------------------------------------

## Starting Services

### Option 1: Automated Setup (Recommended)

Use the first-run script:

```
powershell -ExecutionPolicy Bypass -File scripts/first-run.ps1
```

This script will:

1.  Install npm dependencies
2.  Start the API server (port 5000) (creates the SQLite DB automatically if missing)
3.  Start the Web UI (port 3000)

### Option 2: Manual Setup

**Terminal 1 - API**:

```
cd apps/api
dotnet watch run
```

**Terminal 2 - Web**:

```
cd apps/web
npm install
npm run dev
```

------------------------------------------------------------------------

## Health Verification

Before running your first analysis, verify both services are healthy:

### API Health Check

Open in browser: http://localhost:5000/health

**Expected response:**

```
{
  "ok": true
}
```

### Web Health Check

Open in browser: http://localhost:3000/api/health

**Expected response:**

```
{
  "ok": true
}
```

### Swagger UI (Optional)

You can also test the API directly at: http://localhost:5000/swagger

**Do not proceed until both health checks return 200 OK**

------------------------------------------------------------------------

## First Analysis

### Run Your First Fact-Check

1.  **Open the Web UI**: http://localhost:3000
2.  **Submit a test analysis**:
    -   Start with simple text (avoid URLs for your first test)
    -   Example: "Organization A announced Policy B on Date C"
    -   Click **"Run Analysis"**
3.  **Observe progress**:
    -   Job will show "QUEUED" → "RUNNING" → "SUCCEEDED"
    -   Progress updates appear in real-time
4.  **View results**:
    -   Report tab: Human-readable markdown
    -   JSON tab: Structured analysis data
    -   If you see a "Classification Fallbacks" warning, see Evidence Quality Filtering - Classification Fallbacks

### Verification

Your setup is successful when:

-   Analysis completes without errors
-   Results are displayed in both tabs
-   Refreshing the page shows saved results
-   `/jobs` page lists your analysis

**Congratulations! FactHarbor is now operational.**

------------------------------------------------------------------------

## Troubleshooting

### Common Failure Patterns

| Symptom | Likely Cause | Solution |
|----|----|----|
| **Job stuck in QUEUED** | Runner key mismatch | Check `FH_INTERNAL_RUNNER_KEY` matches `Runner:RunnerKey` |
| **Job fails immediately** | Missing LLM API key | Add `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` to `.env.local` (both required) |
| **No progress updates** | Admin key mismatch | Check `FH_ADMIN_KEY` matches `Admin:Key` |
| **API not starting** | Database error | The DB is auto-created on startup; check API logs, then (local dev) delete `apps/api/factharbor.db` and restart |
| **Port already in use** | Previous instance running | Stop services with `scripts/stop-services.ps1` |

### Health Check Fails

**API Health Check (port 5000) fails:**

```
# Check if API is running
cd apps/api
dotnet watch run
# Look for errors in console output
```

**Web Health Check (port 3000) fails:**

```
# Check if Web is running
cd apps/web
npm run dev
# Look for errors in console output
```

### API Key Issues

**"Unauthorized" or "Invalid API key" errors:**

1.  Verify your key is valid (test at provider's website)
2.  Check for spaces or quotes in the key
3.  Ensure the key is for the correct provider:
    -   OpenAI keys start with `sk-`
    -   Anthropic keys start with `sk-ant-`

### Database Issues

**"Cannot open database" error:**

```
cd apps/api
# Delete old database if corrupted
del factharbor.db
# Restart API to recreate the DB automatically
```

### Port Conflicts

**"Port already in use" error:**

```
# Stop all services
.\scripts\stop-services.ps1

# Or manually find and kill processes
netstat -ano | findstr ":5000"
netstat -ano | findstr ":3000"
# Note the PID and use Task Manager to end the process
```

------------------------------------------------------------------------

## Next Steps

Now that FactHarbor is running:

1.  **Configure via UCM Admin**: http://localhost:3000/admin/config
    -   Set your LLM provider (Pipeline config)
    -   Configure search settings (Search config)
    -   Adjust analysis parameters (Calculation config)
2.  **Test Your Configuration**: http://localhost:3000/admin/test-config
    -   Verify all API keys are valid
    -   Test LLM and search provider connectivity
3.  **Read the Documentation**:
    -   [Unified Config Management](../../subsystems-and-components/unified-config-management/index.md) — Runtime configuration
    -   [LLM Configuration](../../subsystems-and-components/llm-configuration/index.md) - Configure AI providers
    -   `Docs/ARCHITECTURE/Calculations.md` - How verdicts are calculated
4.  **Customize Your Setup**:
    -   Configure search providers via UCM (Admin → Config → Search)
    -   Enable source reliability scoring (Admin → Config → Source Reliability)
    -   Adjust verdict thresholds (Admin → Config → Calculation)

------------------------------------------------------------------------

## Additional Resources

-   **Project Repository**: <a href="https://github.com/robertschaub/FactHarbor" rel="noopener" target="_blank">https://github.com/robertschaub/FactHarbor</a>
-   **Documentation**: See `Docs/` folder
-   **Scripts Reference**: See `scripts/` folder for automation tools
-   **AGENTS.md**: Guidelines for AI coding assistants (in project root)

------------------------------------------------------------------------

## Getting Help

If you encounter issues not covered in this guide:

1.  Check the **Troubleshooting** section above
2.  Review error messages in the console output
3.  Check `apps/web/debug-analyzer.log` for detailed logs
4.  Search existing GitHub issues
5.  Create a new issue with:
    -   Your operating system
    -   Node.js and .NET versions
    -   Error messages and logs
    -   Steps to reproduce

------------------------------------------------------------------------

**Last Updated**: February 2, 2026
