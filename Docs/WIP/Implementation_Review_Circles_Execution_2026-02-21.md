# Implementation Review Circles — Execution (2026-02-21)

## Goal
Run fast, parallel, multi-agent implementation review circles for Phase 1 (`A-1`, `A-2a`, `A-2b`, `A-2c`) and produce one go/no-go recommendation for `A-3` execution.

## Sub-Agent Capability Modes (must choose one before kickoff)

### Mode A — Direct sub-agent invocation available
- The orchestrating Claude session can spawn/coordinate sub-agents directly.
- Execute Circles 1-3 in true parallel from one orchestrator.
- Enforce output contract per circle and then run Circle 4 synthesis.

### Mode B — No direct sub-agent invocation (Captain-mediated)
- Use separate role sessions/tabs (or separate agent runs), one per circle.
- Captain acts as dispatcher and collector:
  1. Send Circle 1/2/3 prompts to assigned role sessions.
  2. Wait for all outputs.
  3. Send Circle 4 synthesis prompt with all three outputs attached.
- This is the default-safe mode and is fully supported by current AGENTS protocol.

### Required output routing (both modes)
- Each circle appends a Standard completion entry to `Docs/AGENTS/Agent_Outputs.md`.
- If a circle produces substantial findings, create a handoff file in `Docs/AGENTS/Handoffs/` and cross-reference it.
- Circle 4 publishes the final decision memo and frozen checklist in `Docs/WIP/`.

## Predefined Sub-Model Assignment (recommended)

Use capability-tier guidance from `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md` §6.

| Circle | Workload type | Primary model class | Preferred Claude model | Fallback model class | Fallback Claude model |
|---|---|---|---|---|---|
| Circle 1 (Code Correctness) | Multi-file code review + regression triage | Mid-tier | Claude Sonnet | High-capability | Claude Opus |
| Circle 2 (Architecture/Policy) | High-stakes reasoning + governance checks | High-capability | Claude Opus | Mid-tier | Claude Sonnet |
| Circle 3 (Docs/Observability) | Structured doc + consistency review | Mid-tier | Claude Sonnet | Lightweight (only if constrained) | Claude Haiku |
| Circle 4 (Synthesis/Decision) | Cross-circle conflict resolution + final decision | High-capability | Claude Opus | Mid-tier | Claude Sonnet |

### Hard rules for model use
1. Do not assign lightweight models to Circle 2 or Circle 4.
2. If only one model is available, run all circles on Claude Sonnet and keep Circle 4 as a separate pass.
3. If Circle 1 finds Critical/High regressions, escalate Circle 4 to Claude Opus even when Sonnet is default.
4. Keep model assignment stable for a full review cycle; do not swap models mid-circle unless blocked.

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
1. Confirm capability mode (Mode A or Mode B).
2. Run Circles 1-3 in parallel (native in Mode A, session-parallel in Mode B).
3. Complete Circle 4 after all three outputs are in.
4. Target turnaround: same working day.

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
