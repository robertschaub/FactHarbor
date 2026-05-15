---
date: 2026-05-15
role: Lead Architect
agent: Codex (GPT-5)
title: V2 Slice 7J Evidence Prompt/Schema/Model/UCM Approval Package
topics: [v2, slice, 7j, evidence-lifecycle, prompt, schema, model-policy, ucm]
files_touched:
  - Docs/WIP/2026-05-15_V2_Slice_7J_Evidence_Prompt_Schema_Model_UCM_Approval_Package.md
---

## Task

Prepared the consolidated 7J approval package for V2 Evidence Lifecycle prompt sections, structured output schemas, model task policy, and UCM placement direction after Slice 7I.

## Review Inputs

- Gemini senior architecture/LLM-systems review: `APPROVE`; suggested categorical missing-evidence dimensions and long-term `analysis-profile` naming.
- Senior Developer deputy review: `MODIFY`; required a concrete 7J-1 verifier envelope, task-policy authority clarification, and stronger prompt co-location safety.
- Claude Opus LLM Expert/senior architect review: `MODIFY`; required explicit non-authorization wording, no baked-in retry default, preserving the optional `evidence_quality` split, warning-owner separation, inert-test wording, and direct canary execution blocking.

## Consolidated Decision

7J remains direction-only and non-executable. It does not authorize source/test/prompt/schema/UCM/model-policy/runtime/provider/cache/SR/public/live-job work.

The package now requires direct Captain approval before any 7J-1 source package because the next step affects prompt-profile placement, task split boundaries, and future canary sequencing.

## Key Boundaries

- Do not edit `apps/web/prompts/claimboundary-v2.prompt.md` under 7J alone.
- Do not add schemas, UCM defaults, model-policy registry entries, gateway approvals, or runtime wiring under 7J alone.
- Do not run the Captain-approved canaries until a committed, runtime-refreshed executable gate exists.
- Source Reliability remains unchanged until a later SR thin-port gate.
- `analysis-profile` is the preferred long-term human-facing UCM/admin concept, but no config-domain name is approved by 7J.

## Exact Captain Wording For Next Source Package

> Approved to implement the next 7J non-executable source package under `Docs/WIP/2026-05-15_V2_Slice_7J_Evidence_Prompt_Schema_Model_UCM_Approval_Package.md`, limited to clean-room V2 Evidence Lifecycle prompt sections, structured output schemas, non-executable task-policy metadata, and inert verifier-style tests only. No live LLM/provider/search/fetch execution, runtime execution, file seeding, approval flips, provider/search/fetch execution, cache IO, Source Reliability integration, public exposure, live jobs, direct-text canary execution, or V1 cleanup.

## Verification

- `git diff --check` for the new package/handoff scope.
- No source, test, prompt, schema, UCM/default JSON, runtime, provider, cache, SR, public surface, or live-job changes.

## Warnings

- Do not treat this package as approval for 7J-1 implementation. It is the Captain approval request artifact.
- The pre-existing dirty files `.claude/settings.json` and `Docs/AGENTS/Agent_Outputs.md` were intentionally left untouched.

## Learnings

- For new-file docs packages, include `git diff --cached --check` after staging because plain unstaged `git diff --check` may not inspect untracked files.
