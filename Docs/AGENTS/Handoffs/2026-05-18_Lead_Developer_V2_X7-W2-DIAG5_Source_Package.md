### 2026-05-18 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 X7-W2-DIAG5 RP1-Observed Node-Code Taxonomy Source Package

**Task:** Prepare and review the DIAG5 source package after RP1 classified the remaining W2 failure as `rp1_observed_unmapped_standard_node_code`.

**Files touched:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-DIAG5_RP1_Observed_Node_Code_Taxonomy_Source_Package.md`; `Docs/STATUS/Current_Status.md`; `Docs/STATUS/Backlog.md`; `Docs/AGENTS/Agent_Outputs.md`; `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W2-DIAG5_Source_Package.md`; `Docs/AGENTS/index/handoff-index.json`.

**Decision:** DIAG5 is approved as a narrow taxonomy/mapping source package. It may promote the RP1-observed raw literal into source/test mapping code only, while narrative docs and product/admin/public artifacts continue to use `[RAW_CODE_OBSERVED_LOCALLY_NOT_RECORDED]` or bounded enum categories only.

**Mapping contract:** Add exactly one generic taxonomy family: `nodeErrorCodeCategory: address_validation_failure`, `transportFailureClass: address_validation_failure`, `transportFailurePhase: address_selection`, and `transportErrorShape: node_error_code_present`.

**Claude review:** Claude Opus 4.6 reviewed the package through `scripts/agents/invoke-claude.cjs` and returned `APPROVE`, confirming sequencing, raw-literal containment, category naming, envelope, verifier set, and no live-job/endpoint-repair authorization.

**Warnings:** Source edits remain blocked until this package is committed. DIAG5 authorizes no live jobs, endpoint/client repair, provider expansion, retries, source material/content/parser/cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence/public behavior, ACS/direct URL, V1 work/cleanup, package/lockfile edits, prompt/config/model changes, or additional probes.

**For next agent:** Before source edits, apply `/debt-guard` compact path. Then implement only inside the approved source/test envelope and run the package verifier set. Do not commit raw literal in docs, handoffs, status, Agent_Outputs, or commit messages; source/test code is the only approved raw-literal location.

**Learnings:** Source/test literals and narrative raw-code non-persistence can coexist when the package explicitly scopes where the literal may live. This lets taxonomy code remain executable while preserving product/admin/public and governance-document leak boundaries.
