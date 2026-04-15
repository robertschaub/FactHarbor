---
name: audit
description: Full FactHarbor quality audit — all prompts and key pipeline stages. Use when investigating analysis quality regression, before a release phase, or after major pipeline changes.
allowed-tools: Read Glob Grep Bash
---

ultrathink

Perform a comprehensive quality audit of the FactHarbor CB pipeline.
Focus area: $ARGUMENTS (leave blank for full audit)

**Step 1 — Read all prompt files:**
Read every file under `apps/web/prompts/`. Note each file's role in the pipeline.

**Step 2 — Read key pipeline stages:**
Read these files in `apps/web/src/lib/analyzer/`:
`claim-extraction-stage.ts`, `research-extraction-stage.ts`, `boundary-clustering-stage.ts`, `verdict-generation-stage.ts`, `aggregation-stage.ts`, `evidence-filter.ts`

**Step 3 — Identify issues across 7 categories:**
- **A. LLM Intelligence** — deterministic text-analysis logic that should be LLM-powered (AGENTS.md: MANDATORY)
- **B. Hardcoding** — domain-specific keywords, named entities, or case-specific patterns
- **C. Teaching-to-the-test** — prompt examples using terms from known benchmark inputs (Bolsonaro, Hydrogen, Venezuela)
- **D. Evidence quality** — probativeValue assignment, claimDirection accuracy, EvidenceScope correctness
- **E. Verdict calculation** — direction, confidence propagation, counter-evidence weighting
- **F. UCM sync** — hardcoded values that belong in UCM admin config
- **G. Contract mismatches** — prompt output schema ≠ TypeScript types consuming it

**Step 4 — Classify each issue:**
- **PHASE-BLOCKER** — degrades analysis quality or violates a MANDATORY AGENTS.md rule
- **HIGH** — significant quality impact
- **MEDIUM** — noticeable but not critical
- **LOW** — polish / housekeeping

Output a structured table: `ID | Category | Severity | File:Line | Description | Recommended Fix`
