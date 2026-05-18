### 2026-05-18 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 X7-W2-TR1 Standard-Client Transport Repair Source Package

**Task:** Prepare TR1 as a narrow W2 transport repair source package after LS6 confirmed DIAG5 mapping.

**Files touched:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-TR1_Standard_Client_Transport_Repair_Source_Package.md`; `Docs/STATUS/Current_Status.md`; `Docs/STATUS/Backlog.md`; `Docs/AGENTS/Agent_Outputs.md`; `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W2-TR1_Source_Package.md`; `Docs/AGENTS/index/handoff-index.json`.

**Key decision:** TR1 should repair the current W2 transport path by trying the standard Node HTTPS client connection path without the custom pinned lookup callback first, while retaining explicit DNS pre-resolution/public-address validation, final remote-address validation, redirect-deny, proxy-none, no-credentials, byte/timeout caps, endpoint allowlist, and raw-leak controls. Claude Opus 4.6 reviewed the package and returned `APPROVE`.

**Warnings:** TR1 is a source package only until reviewed and committed. It authorizes no implementation before review acceptance. It does not authorize provider expansion, retries, source material, content dereference, parser/cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence/public behavior, prompt/config/model/schema edits, ACS/direct URL, V1 work/cleanup, or more than one post-repair live canary.

**For next agent:** Start with `Docs/WIP/2026-05-18_V2_Slice_X7-W2-TR1_Standard_Client_Transport_Repair_Source_Package.md`. Implementation must stay inside the transport-focused envelope and apply `/debt-guard` before source edits. If the post-repair canary still has zero bytes/candidates, stop and prepare an endpoint/client pivot package for Steering Board review.

**Learnings:** LS6 made the failure actionable: the next risk is weakening containment while repairing transport. TR1 therefore treats final remote-address validation and raw-leak protection as non-negotiable, not optional cleanup.
