---
### 2026-05-20 | Lead Architect / LLM Expert | Codex (GPT-5.5) | V2 Stop-Line And Executable Plan

**Task:** Investigate whether V2 implementation should stop now or when it should stop; have the decision reviewed; update a V2-only executable plan with diverse review.

**Files touched:**

- `Docs/WIP/2026-05-20_V2_Stop_Line_Executable_Plan.md`
- `Docs/WIP/2026-05-20_V2_Slice_W6-A_Stop_Line_Acceptance_Package.md`
- `Docs/WIP/2026-05-20_V2_Slice_W6-B_EvidenceItem_Handoff_To_Sufficiency_Intake_Review_Package.md`
- `Docs/AGENTS/Role_Learnings.md`
- `Docs/AGENTS/Handoffs/2026-05-20_Lead_Architect_V2_Stop_Line_Executable_Plan.md`
- `Docs/AGENTS/Agent_Outputs.md`

**Key decisions:**

- V2 source/runtime implementation should pause now. This is a tranche-boundary pause, not a permanent stop.
- The pause is justified because X7-W5-G proved W5-F EvidenceItem handoff, X7-W5-H retired the standalone W4-I route, public V2 remains blocked/precutover/report_damaged, live-job budget is `0`, and debt sensors remain `advisory_warn`.
- The next positive stop line is one internal direct-text Alpha `ReportResult` candidate, using Captain-approved direct-text input verbatim and remaining non-public.
- After the Alpha candidate exists, implementation stops again for report-review, comparator review, cutover review, and live-job authorization.
- Alpha is not cutover readiness and is not live report-quality proof if produced only through fixture/internal verifiers.
- Captain accepted W6-A as review-only stop-line acceptance, then authorized W6-B package drafting only.
- W6-B package was amended after MODIFY review. It is ready for short confirmation as a contract/test-only implementation package, not implementation authority by itself.
- W6-B must implement only `EvidenceItemHandoffDecision -> SufficiencyIntakeDecision`, with `decisionVersion = v2.evidence-lifecycle.sufficiency-intake.w6b`, explicit blocked/damaged reasons, allowlisted field construction, no W4-I direct reads, no parent spreading/cloning, no text/language/semantic branching, no route/orchestrator/product wiring, and no prompt/UCM/model/gateway/schema bypass.
- Fixed epistemic formulas are now explicitly forbidden for Source Reliability, source independence, proxy fit, evidence sufficiency, evidence scarcity, truth, or confidence unless Captain separately approves such a policy. Later W6-C/W7/W8 adjustments must be LLM-owned structured judgments with cited EvidenceItem/provenance support.

**Open items:**

- No W6 implementation is authorized by this handoff. A separate accepted package must name exact sufficiency/report owners, allowed files, prompt/model/UCM/schema gates, retirement impact, and verifier set.
- Live jobs remain blocked while `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json` has `currentRemaining = 0`.
- W6-B/W6-C must decide whether W4-I core/sink state is merged, narrowed, kept with sharper trigger, or quarantined.
- W8-A must be followed by debt sensors and a mandatory boundary-guard split checkpoint.
- W6-B still needs short confirmation after the MODIFY edits before implementation authorization. If confirmed, implementation remains source/runtime code but contract/test-only, with no live jobs.

**Warnings:**

- Do not treat W5-G as report-ready evidence. It proves hidden handoff reachability only.
- Do not add hidden-only routes, proof artifacts, denial layers, guards, or diagnostics without V2 scorecard value and retirement-ledger impact.
- Do not introduce deterministic semantic analysis logic. Sufficiency, source independence, inferential fit, normative framing, warning materiality, language adequacy, and temporal applicability must be LLM-task outputs or report-contract fields.
- Do not introduce fixed epistemic formulas or deterministic limits for truth/confidence/sufficiency. Structural guards may detect missing lineage, redaction, counts, or forbidden side effects; epistemic adjustment belongs to approved LLM-owned judgments or explicit Captain-approved policy.
- Do not change public output, compatibility projection, UI/export behavior, prompt/model/config/schema behavior, provider/parser/ACS/direct URL scope, source-reliability weighting, or V1 cleanup under this plan.
- Final `npm run debt:sensors` status was `advisory_warn` at `2026-05-20T10:44:21.479Z`: V2 source/test/guard/docs footprints and net mechanism increases remain advisory warnings.

**For next agent:**

Read `Docs/WIP/2026-05-20_V2_Stop_Line_Executable_Plan.md` and `Docs/WIP/2026-05-20_V2_Slice_W6-B_EvidenceItem_Handoff_To_Sufficiency_Intake_Review_Package.md` before W6-B implementation. The next safe action is short confirmation of the amended W6-B package; if confirmed, implement one narrow sufficiency intake contract/test bridge, no route, no orchestration, no semantic sufficiency execution, no text leakage, no fixed epistemic formulas, and no live job.

**Learnings:** Appended to `Docs/AGENTS/Role_Learnings.md`: V2 stop lines must distinguish proof-ready hidden canaries from report-ready public pipeline evidence.
