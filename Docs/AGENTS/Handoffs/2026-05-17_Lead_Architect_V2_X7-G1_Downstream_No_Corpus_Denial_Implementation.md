---
### 2026-05-17 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 X7-G1 Downstream No-Corpus Denial Implementation
**Task:** Implement the approved X7-G1 pure-core downstream no-corpus denial source package.

**Files touched:**
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/downstream-denial/types.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/downstream-denial/no-corpus-denial.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/downstream-denial/no-corpus-denial.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `Docs/WIP/2026-05-17_V2_Slice_X7-G1_Downstream_No_Corpus_Denial_Source_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/index/handoff-index.json`

**Key decisions:**
- Implemented X7-G1 exactly as pure `analyzer-v2` core: `EvidenceCorpusSourceMaterialGuardDecision` from X7-B in, downstream blocked/no-corpus state out.
- Kept the builder pure and synchronous. It accepts exact-shape X7-B guard output only, rejects malformed/wrong-version/extra-field inputs as `downstream_blocked_input_invalid`, and maps X7-B negative guard states to downstream denial statuses.
- Kept all downstream analytical/public outputs null or false: no applicability, extraction, sufficiency, boundary, verdict, evidence corpus, evidence items, warnings, report, public output, live eligibility, semantic LLM approval, product/public approval, cache touch, or Source Reliability touch.
- Added boundary guard coverage proving downstream-denial has only the approved files and imports only the X7-B source-material guard contract plus local types.

**Verification:**
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/downstream-denial/no-corpus-denial.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-guard.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` -> pass, 3 files / 77 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle` -> pass, 19 files / 93 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` -> pass, 70 files / 492 tests.
- `npm -w apps/web run build` -> pass.
- `npm run validate:v2-gates` -> pass.
- `node scripts/validate-v2-gate-register.mjs --self-test` -> pass.
- `node scripts/build-index.mjs --tier=2 --tracked-only` -> pass, 570 handoffs.
- `git diff --check` -> pass.
- `git diff --cached --check` -> pass.

**Review status:** Architect APPROVE after handoff-index regeneration; Security/runtime APPROVE; Code/package APPROVE after validator hardening for nested X7-B contract consistency; LLM Expert APPROVE.

**Open items:**
- X7-G1 does not add a runtime adapter. Any future consumption of X7-F or C0-S3 runtime-owned outputs needs a separately reviewed hidden `analyzer-v2-runtime` adapter package.
- X7-G1 does not enable downstream semantic Evidence Lifecycle execution. EvidenceCorpus/EvidenceItems, extraction, sufficiency, boundary, verdict, aggregation, report, live jobs, product/public wiring, and V1 cleanup remain blocked.
- 2D-C parser work remains blocked.

**Warnings:**
- The `sourceMaterialGuardReason` field preserves upstream X7-B reason metadata. X7-G1's own `status` and `blockedReason` avoid readiness/execution wording; upstream metadata may still contain X7-B's existing `source_material_not_available_pre_execution`.
- This is denial-state plumbing only. Do not treat it as evidence scarcity, report warning generation, or analytical no-evidence semantics.

**For next agent:** X7-G1 is now implemented as the pure-core downstream denial owner under `apps/web/src/lib/analyzer-v2/evidence-lifecycle/downstream-denial/`. The module is structural only and consumes only X7-B guard output. Keep runtime-owned X7-F/C0-S3 objects out of `analyzer-v2` core; if needed later, design a separate hidden runtime adapter that strips to denial-only structural facts. No source/provider/search/fetch/parser execution, downstream LLM task, product/public/live wiring, prompt/config/model/schema edit, cache/SR/storage, ACS/direct URL path, V1 work, or 2D-C was added.

**Learnings:** Not appended to `Role_Learnings.md`; no durable role-level lesson beyond the existing package-first/gate-first pattern.

```text
DEBT-GUARD RESULT
Classification: failed-attempt recovery / incomplete-existing-mechanism in boundary guard ownership enumeration.
Chosen option: amend the existing Evidence Lifecycle root-intake boundary guard exclusion list.
Rejected path and why: production-code changes or weakening the intake guard would be broader and would not address the verifier-proven stale test enumeration.
What was removed/simplified: nothing removed; the old root-intake guard remains intact.
What was added: one downstream-denial subdirectory exclusion in the existing root-intake guard plus the dedicated downstream-denial boundary guard required by the source package.
Net mechanism count: unchanged.
Budget reconciliation: touched only the expected boundary guard file for the failed verifier recovery; no new branches, flags, fallbacks, or production helpers were introduced.
Verification: same focused verifier rerun passed after the amendment; broader Analyzer V2, Evidence Lifecycle, build, gate validator, and diff hygiene also passed.
Debt accepted and removal trigger: none.
Residual debt: none for X7-G1; future runtime adapter remains a separate reviewed package, not accepted debt in this slice.
```
