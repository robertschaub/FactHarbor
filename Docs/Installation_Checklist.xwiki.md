# Installation Checklist

{{toc/}}

## Purpose
This checklist ensures a predictable and low-friction setup.
Follow the phases in order and stop once your current phase works.

---

## Phase 0 — Prerequisites

- Windows 10 or 11
- Administrator rights for installation

---

## Phase 1 — Minimal POC1 Setup

### Required Tools

#### Version Control
- Git for Windows
  - Verify: `git --version`

#### Runtime & Build
- Node.js (LTS)
  - Verify: `node -v`, `npm -v`
- .NET SDK 8.x
  - Verify: `dotnet --info`

#### Editors
- Visual Studio 2022
  - Workload: ASP.NET and web development
- Cursor or VS Code
  - Extensions:
    - TypeScript
    - ESLint
    - EditorConfig

---

## Phase 1 — Recommended Additions

### Debugging & Inspection
- Browser with DevTools (Chrome or Edge)
- API client (Postman or Insomnia)

### Database Inspection
- Optional: SQLite browser (read-only inspection)

---

## Phase 2 — Deferred (Do Not Install Yet)

- Docker Desktop
- PostgreSQL
- Azure or Vercel CLIs

---

## Hints to Avoid Problems

- Avoid installing tools that are not required for local execution
- Use one editor per role (VS2022 for API, Cursor/VS Code for Web)
- Avoid preview or nightly runtime versions

---

## Verification

Run once after installation:

```
git --version
node -v
npm -v
dotnet --info
```

All commands must succeed before continuing.
