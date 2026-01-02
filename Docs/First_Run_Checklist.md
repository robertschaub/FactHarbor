# First Run Checklist

## Table of Contents
- [Purpose](#purpose)
- [Phase 1 — Repository Setup](#phase-1--repository-setup)
- [Phase 2 — Environment Configuration](#phase-2--environment-configuration)
- [Phase 3 — Database Initialization](#phase-3--database-initialization)
- [Phase 4 — Start Services](#phase-4--start-services)
- [Phase 5 — Health Verification](#phase-5--health-verification)
- [Phase 6 — First Analysis](#phase-6--first-analysis)
- [Common Failure Patterns](#common-failure-patterns)
- [Definition of Success](#definition-of-success)

---

## Purpose

This checklist is designed to ensure **POC1 runs end-to-end on the first attempt**.
It focuses on the most common real-world failure points.

---

## Phase 1 — Repository Setup

- Clone the Git repository
- Open:
  - API in Visual Studio 2022
  - Web app in Cursor or VS Code

**Hint:** Do not change configuration yet.

---

## Phase 2 — Environment Configuration

### Web (`apps/web`)

- Copy `.env.example` → `.env.local`
- Set:
  - `OPENAI_API_KEY`
  - Verify `FH_API_BASE_URL` points to the local API

### API (`apps/api`)

- Copy `appsettings.Development.example.json` → `appsettings.Development.json`
- Verify:
  - `Admin:Key` matches `FH_ADMIN_KEY`
  - `Runner:RunnerKey` matches `FH_INTERNAL_RUNNER_KEY`
  - `Db:Provider` is set to `sqlite`

**Important Hint:**
Key mismatches are the most common cause of failure.

---

## Phase 3 — Database Initialization

Run:

```bash
cd apps/api
dotnet ef database update
```

Expected result:
- `factharbor.db` file is created
- No errors reported

---

## Phase 4 — Start Services

Recommended:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/first-run.ps1
```

This:
- installs dependencies
- applies migrations
- starts API
- starts Web UI

---

## Phase 5 — Health Verification

Check:
- API: `http://localhost:5000/health`
- Web: `http://localhost:3000/api/health`

Expected:
- HTTP 200
- `ok: true`

Do not proceed until both are healthy.

---

## Phase 6 — First Analysis

Steps:
1. Open the Web UI
2. Paste a short text (avoid URL first)
3. Click **Run Analysis**
4. Observe progress
5. Verify result is visible as:
   - Report
   - JSON

---

## Common Failure Patterns

| Symptom | Likely Cause |
|---------|--------------|
| Job stuck in QUEUED | Runner key mismatch |
| Job fails immediately | Missing OpenAI key |
| No progress updates | Admin key mismatch |
| API not starting | Database migrations missing |

---

## Definition of Success

- Analysis completes successfully
- Refreshing the job page still shows results
- `/jobs` lists previous runs

At this point, **POC1 is operational**.
