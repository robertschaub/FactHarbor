# Lead Architect Handoff: V2 X7-L Claim Understanding Live-Result Diagnosis

### 2026-05-17 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 X7-L Claim Understanding Live-Result Diagnosis

**Task:** Diagnose the Claim Understanding blocker exposed by X7-K without changing prompts or source.
**Files touched:** `Docs/WIP/2026-05-17_V2_Slice_X7-L_Claim_Understanding_Live_Result_Diagnosis.md`, `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`, `Docs/AGENTS/index/handoff-index.json`.
**Key decisions:** Deputy review converged on docs-only diagnosis before any prompt/source work. The German canary has exact schema evidence of dotted-field prompt ambiguity (`input.selectedAtomicClaimIds` emitted as a flat key). The Bolsonaro canary returned schema-valid `no_valid_claim`, likely requiring topic-neutral Claim Understanding Gate 1 clarification for externally assessable compliance/fairness/standard questions.
**Open items:** Prepare a future Captain-gated Claim Understanding prompt/contract repair approval package. Do not implement prompt edits without explicit Captain approval plus LLM Expert prompt review and Architect scope acceptance.
**Warnings:** Do not relax the strict schema to accept flat dotted keys. Do not continue meaningful downstream Evidence Lifecycle work until accepted ClaimContracts are available.
**For next agent:** Start from the X7-L diagnosis. X3-B is separate Query Planning metadata/prompt drift and does not fix these Claim Understanding failures.
**Learnings:** Not appended to `Role_Learnings.md`; this is package-specific evidence.

## Review Basis

Deputy next-step review after X7-K:

- Architect: APPROVE docs-only diagnosis first.
- Security/runtime: APPROVE docs-only diagnosis with possible future Captain-gated repair request.
- LLM/semantic: APPROVE docs-only diagnosis first, then explicit Captain approval request.
- Code/package: APPROVE docs-only diagnosis; source diagnostics only if current artifacts prove insufficient.

## Result

X7-L records a go/no-go matrix:

- reject downstream continuation without accepted ClaimContracts;
- reject schema relaxation;
- reject more live jobs for now;
- conditionally allow a future hidden diagnostics-enrichment package only if required;
- recommend a Captain-gated Claim Understanding prompt/contract repair approval package.
