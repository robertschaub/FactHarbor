### 2026-05-18 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 X7-W2-QC3 W2 Cap Alignment Source Package

**Task:** Decide and document the next W2 step after QC2 showed accepted Query Planning outputs exceed W2's current cap.

**Files touched:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-QC3_W2_Cap_Alignment_Source_Package.md`; `Docs/WIP/2026-05-17_V2_Slice_X7-W2_Product_Internal_Candidate_Provider_Network_Source_Package.md`; `Docs/STATUS/Current_Status.md`; `Docs/STATUS/Backlog.md`; `Docs/AGENTS/Agent_Outputs.md`; `Docs/AGENTS/index/handoff-index.json`.

**Key decisions:** QC3 is deputy-approved as a constrained real W2 cap alignment, not assertion-only. W2 may align hidden candidate-provider-network admission from cap `2` to reviewed cap `6`, and directly dependent total candidate/network timeouts from `3000ms` to `9000ms`. Per-query timeout, candidate cap, byte cap, one-provider posture, no credentials, redirect denial, proxy denial, retry policy, hidden-only artifact surface, and all downstream/public/storage/source-material constraints remain unchanged. Live jobs remain blocked until a separate LS2-style package.

**Open items:** Implement QC3 inside the approved envelope, then write the completion handoff and commit. After QC3 implementation, prepare a separate reviewed live-smoke package if provider-network proof is still desired.

**Warnings:** Do not edit runtime validators, `source-acquisition-network-*`, artifact sink/route, prompts, configs, schemas, model/provider policy, public/API/UI/report/export/compatibility files, parser/content/source-material/cache/SR/storage/EvidenceCorpus files, V1 files, or package/lock files. Future Query Planning cap changes must not silently widen W2; QC3 is fixed to reviewed `6/9000ms`.

**For next agent:** Start with `Docs/WIP/2026-05-18_V2_Slice_X7-W2-QC3_W2_Cap_Alignment_Source_Package.md`. The implementation target is narrow: W2 owner cap/timeouts plus focused W2 tests and boundary guard. Prove six fake-transport queries complete and seven fail closed before network execution.

**Learnings:** Accepted upstream output contracts should be aligned before spending provider-network live jobs, but the alignment must be fixed to a reviewed value so future upstream cap increases do not silently widen network authority.

**DEBT-GUARD RESULT**

Classification: failed-validation recovery; incomplete existing mechanism.

Chosen option: amend the existing W2 cap/budget mechanism in place through a reviewed QC3 package.

Rejected path and why: compatible canary rerun would select around the mismatch; assertion-only cap `2` would preserve the mismatch; partial execution under `3000ms` would require runtime validator changes outside the W2 envelope.

What was removed/simplified: no runtime mechanism changed in this package; the decision removes ambiguity by fixing QC3 to reviewed `6/9000ms`.

What was added: one source package plus status/handoff pointers.

Net mechanism count: unchanged.

Budget reconciliation: docs-only source package stayed inside WIP/status/handoff/index envelope.

Verification: package reviewed by Claude Opus plus Security and Performance/Cost agents; no source tests needed before implementation.

Debt accepted and removal trigger: boundary-guard size remains accepted short-term debt; split only if QC3 implementation requires broad guard refactor.

Residual debt: W2 still lacks post-QC3 live provider-network evidence; live proof needs a separate reviewed package and committed/refreshed runtime.
