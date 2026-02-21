# Implementation Review Circles — Execution (2026-02-21)

## Goal
Run fast, parallel, multi-agent implementation review circles for Phase 1 (`A-1`, `A-2a`, `A-2b`, `A-2c`) and produce one go/no-go recommendation for `A-3` execution.

## Scope Lock
- In scope: code and docs touched by recent calibration/reporting/stability fixes, plus Phase 1 implementation prep.
- Out of scope: `B-*` and `C-*` implementation work.

## Inputs
1. `Docs/WIP/Decision_Log_D1-D5_Calibration_Debate_2026-02-21.md`
2. `Docs/WIP/Phase1_Immediate_Execution_Spec_2026-02-21.md`
3. `Docs/WIP/CrossProvider_Calibration_Execution_Report_2026-02-21.md`
4. `Docs/Knowledge/Stammbach_Ash_LLM_Political_Alignment_EMNLP2024.md`
5. Recent commits:
   - `4c04954` (R2 fixes)
   - `704063e` (structured error telemetry)
   - `574ab66` (LLM/search transparency)

## Fast Risk Snapshot (pre-circle)
1. Potential path traversal guard weakness in `build_ghpages.py` due prefix `startswith` check.
2. Potential report resolver regression for `mistral` debate role model mapping in `runner.ts`.
3. Safe test suite had one timeout once, then passed on isolated rerun (`drain-runner-pause`), indicating potential flakiness.

## Circle Structure

### Circle 1 — Code Correctness & Regression
- Roles: Lead Developer + Code Reviewer
- Focus:
  1. Verify no functional regressions from `4c04954` and `704063e`.
  2. Confirm report resolver behavior for all configured providers.
  3. Validate test stability concerns and identify flaky tests.
- Required checks:
  - `npm test`
  - `npm -w apps/web run build`
  - Targeted tests if failures are flaky/non-deterministic.
- Deliverable:
  - findings list by severity with file references
  - patch recommendations for any regressions

### Circle 2 — Architecture & Policy Compliance
- Roles: Lead Architect + LLM Expert
- Focus:
  1. Validate changes against D1-D5 sequencing and gate policy.
  2. Ensure fallback/degradation telemetry remains explicit and structured.
  3. Confirm AGENTS.md compliance (LLM intelligence, config placement, multilingual robustness).
- Deliverable:
  - policy compliance report
  - go/no-go for starting Phase 1 code execution

### Circle 3 — Observability & Documentation Integrity
- Roles: Technical Writer + DevOps Expert
- Focus:
  1. Ensure report semantics are unambiguous (`Global Provider`, role mode, runtime-vs-resolved distinction).
  2. Confirm archival/index consistency (`WIP`, `ARCHIVE`, knowledge docs).
  3. Verify that calibration artifacts tracked in docs are reproducible and correctly referenced.
- Deliverable:
  - docs consistency report
  - minimal docs patch list if needed

### Circle 4 — Captain Synthesis (Final)
- Roles: Agents Supervisor + Lead Architect
- Focus:
  1. Merge Circle 1-3 outputs.
  2. Resolve conflicts.
  3. Freeze next action list for Phase 1 execution.
- Deliverable:
  - final decision memo: `Proceed` / `Proceed with fixes` / `Hold`
  - ordered implementation checklist

## Execution Order and SLA
1. Run Circles 1-3 in parallel.
2. Complete Circle 4 after all three outputs are in.
3. Target turnaround: same working day.

## Minimum Exit Criteria
1. No unresolved High/Critical regressions in scoped commits.
2. D1-D5 policy alignment confirmed.
3. Documentation and report semantics consistent with actual runtime behavior and known limits.
4. Phase 1 implementation start recommendation explicitly approved by Circle 4.

## Kickoff Prompts (copy/paste)

### Prompt — Circle 1
As Lead Developer + Code Reviewer, run Circle 1 from `Docs/WIP/Implementation_Review_Circles_Execution_2026-02-21.md`.
Review commits `4c04954`, `704063e`, `574ab66` for regressions and test stability.
Output findings by severity with file:line references, include required fixes and verification commands/results.
Do not start B/C work.

### Prompt — Circle 2
As Lead Architect + LLM Expert, run Circle 2 from `Docs/WIP/Implementation_Review_Circles_Execution_2026-02-21.md`.
Assess compliance with D1-D5 (`Decision_Log...`) and AGENTS.md constraints.
Return policy-compliance verdict and go/no-go for Phase 1 start.

### Prompt — Circle 3
As Technical Writer + DevOps Expert, run Circle 3 from `Docs/WIP/Implementation_Review_Circles_Execution_2026-02-21.md`.
Verify report semantics, docs/index consistency, and artifact reference integrity.
Return concise patch list for any doc/ops mismatches.

### Prompt — Circle 4
As Agents Supervisor + Lead Architect, run Circle 4 from `Docs/WIP/Implementation_Review_Circles_Execution_2026-02-21.md`.
Synthesize Circle 1-3 outputs into one final execution decision and an ordered Phase 1 checklist.
