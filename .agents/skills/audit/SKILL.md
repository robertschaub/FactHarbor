---
name: audit
description: Full FactHarbor quality audit — all prompts and key pipeline stages. Use when investigating analysis quality regression, before a release phase, or after major pipeline changes.
allowed-tools: Read Glob Grep Bash
---

Bind this workflow to the documents, diff or question in the current authorized task and any explicit invocation arguments (`TASK_ARGUMENTS`). This name is a description, not a client-expanded variable or shell expression; do not guess the active editor file. Skill loading does not expand action, path or writable-state authority. Follow root AGENTS.md and the assigned session profile; return proposals/findings in chat when read-only.



Perform a comprehensive quality audit of the FactHarbor CB pipeline.
Focus area: TASK_ARGUMENTS (leave blank for full audit)

**Step 1 — Read all prompt files:**
Read the in-scope prompt sections and their pipeline roles. For an explicitly requested full audit, cover every prompt, using root large-prompt section reading rules.

**Step 2 — Read key pipeline stages:**
Read these files in `apps/web/src/lib/analyzer/`:
`claim-extraction-stage.ts`, `research-extraction-stage.ts`, `boundary-clustering-stage.ts`, `verdict-generation-stage.ts`, `aggregation-stage.ts`, `evidence-filter.ts`

**Step 3 — Identify issues across 7 categories:**
- **A. LLM Intelligence** — deterministic text-analysis logic that should be LLM-powered (AGENTS.md: MANDATORY)
- **B. Hardcoding** — domain-specific keywords, named entities, or case-specific patterns
- **C. Teaching-to-the-test** — prompt examples using terms from known benchmark inputs (the canonical Captain-defined inputs)
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
