# Contributing to FactHarbor

## Local run
- Configure env files (see README)
- Run `scripts/first-run.ps1`

## Architecture rules
- Orchestration logic lives in **TypeScript** (apps/web, packages/analyzer)
- Persistence and job lifecycle live in **.NET** (apps/api)
- Keep changes small and spec-driven
