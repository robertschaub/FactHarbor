# Wikipedia & Semantic Scholar Integration — Future Integration Concept

**Date:** 2026-03-03  
**Status:** Active as a **future integration concept**. Provider-layer implementation history was moved to archive.  
**Historical detail:** [2026-03-03_Wikipedia_SemanticScholar_Integration_Concept_arch.md](../ARCHIVE/2026-03-03_Wikipedia_SemanticScholar_Integration_Concept_arch.md)

---

## 1. Document Role

The basic provider layer and admin wiring are no longer the open question. Those foundations are already in the codebase.

What remains relevant here are the **deeper pipeline-aware integration ideas**:

- provider-aware query generation
- once-per-claim supplementary orchestration
- better Wikipedia-language handling
- citation/reference harvesting
- deeper Semantic Scholar / academic-evidence treatment
- richer Google Fact Check loop integration

---

## 2. Current State

Already implemented:
- provider registration
- UCM/provider wiring
- admin visibility for the provider layer

Still future-facing:
- provider-specific query variants
- better use of source-type differences inside Stage 2
- deeper evidence extraction from supplementary providers

---

## 3. Current Decision Rule

- Keep this document only as a **future design source**.
- Do not treat it as approved near-term work while the current validation gate is open.
- If this track is reopened, start from the archived detailed concept but re-check assumptions against current code first.
