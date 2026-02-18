# 2026-02-18 | Lead Developer | Codex (o4-mini) | Claim Extraction Fidelity Fix

**Task:** Fix Stage 1 Pass 2 over-anchoring to preliminary evidence instead of user input, causing claim drift at pipeline start. P0 quality issue: if atomic claims drift, all downstream stages (search, clustering, verdicts) drift with them.

**Files touched:**
- `apps/web/prompts/claimboundary.prompt.md` — Prompt hardening: Pass 1 atomic detection (`single_atomic_claim` / `multi_assertion_input`), Pass 2 input-anchoring rules, anti-evidence-report rule, Gate 1 `passedFidelity` check
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` — `passedFidelity` field in Gate 1 schema and filtering, evidence truncation in Pass 2 payload, safety-net rescue for over-filtered claims, fidelity stats in gate1Stats
- `apps/web/src/lib/analyzer/types.ts` — Added `passedFidelity?: number` to `gate1Stats` interface
- `apps/web/src/lib/analyzer/truth-scale.ts` — Mixed confidence threshold lowered 60→40
- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts` — `passedFidelity` in all Gate 1 fixtures, new fidelity filtering test, safety-net rescue test
- `apps/web/src/app/jobs/[id]/page.tsx` — Added missing `"MIXED": "Mixed"` to both `getVerdictLabel` and `getAnswerLabel` maps; title reset from `"FactHarbor POC1"` to `"FactHarbor Alpha"`
- `Docs/WIP/Lead_Developer_Companion_Claim_Fidelity_2026-02-18.md` — Full investigation report with findings, root cause analysis, and implementation plan
- `AGENTS.md` — Step 6 wording fix (allow appropriate mode selection, not always Role Handoff)
- `Docs/AGENTS/Multi_Agent_Meta_Prompt.md` — Added "Agents Supervisor" to role options list

**Key decisions:**
- Phase 1 (prompt hardening): LLM must classify input as single_atomic vs multi_assertion before decomposition. `impliedClaim` must be derivable from input alone — evidence refines verifiability, not thesis scope. Banned "Study X found Y" style as central claim.
- Phase 2 (Gate 1 fidelity): Extended `CLAIM_VALIDATION` prompt with `passedFidelity` per-claim check against original input. Claims failing fidelity are filtered alongside existing opinion/specificity checks.
- Safety net: If all claims get filtered by gates, rescue the highest-scoring ones to prevent empty output.
- Truth-scale mixed confidence threshold lowered from 60 to 40 to reduce false "mixed" classifications.

**Open items:**
- Phase 3 (structural decontamination) not yet implemented: compress Pass 2 evidence payload to scope signals instead of full statements.
- Phase 4 (validation): Need to re-run the two target scenarios (SRF report, "The sky is blue") and compare thesis drift, evidence-report claim incidence, and query drift breadth against baseline.
- Full acceptance criteria defined in `Docs/WIP/Lead_Developer_Companion_Claim_Fidelity_2026-02-18.md` § Acceptance Criteria.

**Warnings:**
- Changes are uncommitted in the working tree. Need `npm test` and `npm -w apps/web run build` verification before commit.
- The truth-scale threshold change (60→40) affects all verdicts, not just fidelity cases — may need monitoring.
- Expensive LLM tests (`test:cb-integration`) should be run to validate real-world fidelity improvement, but at $1-2/run cost.

**For next agent:** All Phase 1 + Phase 2 changes are in the working tree. Run `npm test` to verify unit tests pass, then `npm -w apps/web run build` to confirm compilation. Phase 3 (evidence payload compression) is the next logical step if drift persists after validation. See the companion doc for full proposal stack and acceptance criteria.

**Learnings:** Codex (o4-mini) reads AGENTS.md natively but did not write to Agent_Outputs.md on completion. Exchange Protocol compliance for Codex requires the `AGENTS.md` instructions to be explicit enough, or Captain intervention to relay outputs. This entry was written by a colleague agent (Claude Code) on behalf of Codex based on Captain-relayed output.
