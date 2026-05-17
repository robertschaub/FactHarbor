---
role: Lead Developer / Captain Deputy
date: 2026-05-17
topic: V2 X7-W Source Acquisition candidate-runtime admission proposal
related:
  - Docs/WIP/2026-05-17_V2_Slice_X7-W_Hidden_Product_Internal_Source_Acquisition_Candidate_Runtime_Admission_Proposal.md
  - Docs/AGENTS/Handoffs/2026-05-17_LLM_Expert_V2_Team_Debate_Consolidated_Direction.md
  - Docs/WIP/2026-05-17_V2_Slice_X7-V-LS1_X7V_Source_Acquisition_Intake_Live_Result.md
---

# Lead Developer Handoff: V2 X7-W Candidate-Runtime Admission Proposal

### 2026-05-17 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 X7-W Candidate-Runtime Admission Proposal

**Task:** Continue after X7-V-LS1 pass and turn the team-debate X7-W direction into a concrete proposal package without starting implementation.

**Proposal:** `Docs/WIP/2026-05-17_V2_Slice_X7-W_Hidden_Product_Internal_Source_Acquisition_Candidate_Runtime_Admission_Proposal.md`.

**Decision:** Recommend X7-W1A as the next reviewed implementation package: hidden product-internal Source Acquisition candidate-runtime admission after X7-V. The proposal keeps public cutover closed and distinguishes two positions: Position A admission-only/no executable runtime or provider invocation as the default, and Position B one concrete candidate provider boundary only with explicit Security approval and a complete 7N-3B2-grade SSRF/security matrix.

**Review consolidation:** Architect, Security/runtime, and code-review perspectives all returned `MODIFY`, not reject. Security and Architect required X7-W1A to stop before `executeSourceAcquisitionCandidateRuntime(...)` and any provider-boundary call. Code review wanted the runtime loop exercised to avoid another passive marker. Consolidated decision: split those concerns. X7-W1A is product-owned admission authority/snapshot/artifact only, with zero provider attempts and zero candidates; a later X7-W1B may exercise the existing runtime with a closed no-IO boundary only after separate review.

**Review result:** After amendment, Architect, Security/runtime, and Lead Developer/code-review all returned `APPROVE` with no remaining blockers.

**Warnings:** This proposal does not authorize implementation, executable candidate-runtime invocation, provider-boundary invocation, provider-network execution, content dereference, parser work, cache/SR/storage, source material, EvidenceCorpus, evidence/report/verdict/warning/confidence behavior, public exposure, live jobs, ACS/direct URL, V1 reuse, V1 work, or V1 cleanup.

**For next agent:** Implement X7-W1A Position A first, as a separate reviewed source package, and include the retirement/demotion target for X6/X7-D in that source package. If a future package wants Position B, require endpoint approval and the full 7N-3B2-grade SSRF matrix before any source edit.

**Learnings:** The next value step is product-owned admission authority for one canonical candidate-runtime path, not another readiness marker. Keeping X7-W1A admission-only, X7-W1B closed-runtime exercise, and Position B provider-network execution separate prevents accidental broad IO while preserving a clean path toward real candidate acquisition.
