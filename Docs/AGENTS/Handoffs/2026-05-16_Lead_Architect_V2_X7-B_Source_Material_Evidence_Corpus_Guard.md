# Lead Architect Handoff: V2-X7-B Source-Material / Evidence-Corpus Guard

### 2026-05-16 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2-X7-B Source-Material / Evidence-Corpus Guard
**Task:** Continue the V2 rebuild after X7-A by implementing the reviewed hidden/internal source-material absence and evidence-corpus negative guard.

**For next agent:** X7-B is a hidden/internal negative guard only. It consumes X7-A source-material readiness as absence/rejection and proves absent, malformed, copied, JSON-round-tripped, or source-like source-material input cannot become corpus-buildable. Continue with a reviewed follow-up package before any provider-network execution, real source IO, source-material population, extraction, evidence-corpus population, product/public/live wiring, cache/SR/storage, prompt/config/model/schema edit, ACS/direct URL path, or V1 cleanup.

**Approval/source context:**
- Source package: `Docs/WIP/2026-05-16_V2_Slice_X7-B_Source_Material_Evidence_Corpus_Guard_Source_Package.md`
- Baseline: `33ddb984` (`docs: refresh handoff index`)
- Parent gate: X7-A hidden candidate-to-source-material readiness
- Review result: Architect approved. Security/runtime and Senior Developer reviewers required strict negative-only statuses, no edits to existing 7F `evidence-corpus/types.ts` or `build-decision.ts`, exact file inventory guards, and no future positive states; those requirements were incorporated before implementation.

**Files touched:**
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-material/contract.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-guard.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/contract.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-guard.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `Docs/WIP/2026-05-16_V2_Slice_X7-B_Source_Material_Evidence_Corpus_Guard_Source_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_X7-B_Source_Material_Evidence_Corpus_Guard.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/index/handoff-index.json` after indexing

**Implementation summary:**
- Added `buildSourceMaterialAbsenceContract(...)`, a pure internal contract builder that accepts exact-shape X7-A `SourceMaterialReadinessDecision` values only as source-material absence/rejection.
- The source-material absence contract has only one status: `not_available_pre_execution`.
- Added module-private authority tracking so copied or JSON-round-tripped absence contracts are not treated as authority-bearing by downstream guard code.
- Added `buildEvidenceCorpusSourceMaterialGuard(...)`, a pure evidence-corpus guard that returns only negative states: `not_buildable_no_source_material`, `blocked_source_material_invalid`, or `blocked_source_material_not_accepted`.
- The guard preserves `sourceMaterial: null`, `extractionInput: null`, and `evidenceCorpus: null`; it does not produce sources, source counts, EvidenceItems, warnings, verdicts, confidence, report content, or public compatibility fields.
- Existing 7F evidence-corpus build decision files were not edited.

**Guardrails preserved:**
- No provider-network readiness/execution.
- No real network/search/fetch.
- No content dereference, parser, packet/frame/byte consumption, parsed text, or source records.
- No source-material population, extraction input, EvidenceItems, evidence-corpus population, applicability, sufficiency, warnings, verdicts, confidence, or report generation.
- No product/orchestrator/runner/API/UI/report/export wiring.
- No cache read/write/storage.
- No Source Reliability import/call.
- No prompt/config/model/schema edits.
- No ACS/direct URL execution.
- No V1 analyzer/prompt/type/code reuse.
- No V1 cleanup.

**Verification passed:**
```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/readiness.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/contract.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/build-decision.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-guard.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
```

Results:
- Focused X7-B/X7-A/7F/boundary suite: 5 files, 77 tests passed.
- Evidence Lifecycle unit slice: 18 files, 87 tests passed.
- Analyzer V2 unit slice: 63 files, 444 tests passed.
- Web build passed; reseed reported `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`.

**Failed-attempt recovery:** None. The first focused verifier, broader slice, and build passed.

**Next step recommendation:**
- Keep X3-B prompt frontmatter/text alignment blocked until explicit Captain/LLM Expert prompt approval.
- For the direct-text path, draft and review X7-C separately. The likely next package is hidden provider-network readiness if it stays readiness-only/no-IO; any source execution, source-material creation, corpus population, product wiring, live jobs, or public exposure needs a separate reviewed gate.
- Do not run live jobs from X7-B.

**Warnings:**
- X7-B does not make any input source-material-accepted or corpus-buildable.
- Copied or JSON-round-tripped absence contracts are rejected by the guard; pass authoritative in-process contracts or X7-A readiness decisions only.
- X7-B does not replace or mutate the existing 7F `EvidenceCorpusBuildDecision`.

**Learnings:** The downstream boundary after candidate acquisition should reject both "absence" and "fake source material" explicitly. A negative source-material contract is useful only if it cannot be mistaken for positive source acceptance.
