# Post-Migration Documentation Index (v2.7.0)

**Date**: 2026-01-18  
**Scope**: Canonical docs after terminology refactor  
**Status**: Current  

---

## Primary References

- `Docs/REFERENCE/TERMINOLOGY.md` — Canonical terminology and field mappings.
- `Docs/REFERENCE/LLM_Schema_Mapping.md` — Prompt ↔ schema mappings (v2.7 + legacy).
- `Docs/REFERENCE/Scope_Terminology_Master_Reference.md` — Quick reference for developers.

---

## Architecture

- `Docs/ARCHITECTURE/ADR_001_Scope_Context_Terminology_Refactoring.md` — Decision record (implemented).
- `Docs/ARCHITECTURE/Database_Schema_Migration_v2.7.md` — Migration details and validation steps.
- `Docs/ARCHITECTURE/Scope_Detection_and_Filtering.md` — Context detection logic and invariants.
- `Docs/ARCHITECTURE/Calculations.md` — Verdict calculations and context scoping.
- `Docs/ARCHITECTURE/Architecture_Review_Cycle_Summary.md` — Review history.

---

## Implementation & Roadmap

- `Docs/DEVELOPMENT/IMPLEMENTATION_ENTRY_GUIDE.md` — Entry guide and verification commands.
- `Docs/DEVELOPMENT/Scope_Terminology_Implementation_Roadmap.md` — Roadmap and checkpoints.
- `Docs/DEVELOPMENT/Terminology_Verification_Report.md` — Post-migration status report.
- `Docs/DEVELOPMENT/LLM_Prompt_Implementation_Summary.md` — Prompt implementation summary.
- `Docs/DEVELOPMENT/LLM_Prompt_Improvements.md` — Prompt audit and remaining verifications.

---

## Status & Changelog

- `Docs/STATUS/Current_Status.md` — Current system status.
- `Docs/STATUS/CHANGELOG.md` — Release notes (includes v2.7.0 entry).
- `Docs/STATUS/Pre_Prompt_Optimization_Checklist.md` — Post-migration follow-ups.

---

## Notes on Legacy Compatibility

- Legacy fields (`distinctProceedings`, `relatedProceedingId`, `proceedingId`, `proceedingContext`) remain accepted for older jobs.
- New work should use `analysisContexts`, `contextId`, and `analysisContext`.
