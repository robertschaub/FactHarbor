---
### 2026-05-18 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 X7-W4-A Source Material To EvidenceCorpus Readiness Source Package
**Task:** Decide the next direction after W3-B passed and prepare the next reviewed source package.

**Package prepared:** `Docs/WIP/2026-05-18_V2_Slice_X7-W4-A_Source_Material_EvidenceCorpus_Readiness_Source_Package.md`.

**Decision:** Choose W4-A Source Material to EvidenceCorpus readiness/denial before widening Source Material coverage. Claude Opus 4.6 initially recommended a W3-C Source Material sweep, while Security/Containment and Product/Quality/Cost reviewers recommended W4-A first. Consolidated Lead Developer decision: W4-A reduces downstream leakage/interpretation risk before any more fetch breadth.

**Review result:** Concrete package review returned `MODIFY` from Claude Opus 4.6 and both reviewer agents. Required edits were applied:
- explicit relationship to existing X7-B absence-path modules (`source-material/readiness.ts`, `source-material/contract.ts`, `evidence-corpus/source-material-guard.ts`, `evidence-corpus/build-decision.ts`);
- mandatory W3-B producer-owned runtime provenance sidecar, no optional provenance;
- no source-material text copied into W4-A readiness artifacts;
- positive status renamed to `source_material_structurally_admissible_evidence_corpus_gate_closed`;
- explicit `evidenceCorpusBuildAuthorized: false`;
- product-route hidden owner/artifact/route posture made explicit;
- parent W3-B invariants tightened, including versions, `stopReason`, fetch count, diagnostic count, and hash/length consistency;
- absence-path regression tests added to required verifier set.

**Files touched:** Docs-only package:
- `Docs/WIP/2026-05-18_V2_Slice_X7-W4-A_Source_Material_EvidenceCorpus_Readiness_Source_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W4-A_Source_Package.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/index/handoff-index.json` after index rebuild

**Open items:** No implementation has started. No live job is authorized by this package. Next action is review/commit acceptance, then W4-A implementation strictly inside the package envelope if accepted.

**Warnings:** W4-A must not create EvidenceCorpus, EvidenceItems, parser output, extraction input, report, verdict, warning, confidence, cache/SR/storage, public behavior, retries, provider expansion, W2 endpoint migration, ACS/direct URL behavior, V1 work, or V1 cleanup. It is a hidden structural readiness/denial gate only.

**For next agent:** Start with the W4-A package. The highest-risk implementation detail is provenance: positive production admission must require producer-owned W3-B Source Material state and must reject JSON clones, `structuredClone`, spread copies, reconstructed objects, route responses, docs/log copies, and post-mark mutated objects.

**Learnings:** Appended to Role_Learnings.md? no.
