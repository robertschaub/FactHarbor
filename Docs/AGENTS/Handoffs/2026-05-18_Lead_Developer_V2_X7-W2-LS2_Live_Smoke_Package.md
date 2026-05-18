### 2026-05-18 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 X7-W2-LS2 Post-QC3 Candidate-Provider Network Live-Smoke Package

**Task:** Prepare the docs-only execution package for the first post-QC3 hidden W2 candidate-provider network live smoke.

**Files touched:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS2_Post_QC3_Candidate_Provider_Network_Live_Smoke_Package.md`; `Docs/STATUS/Current_Status.md`; `Docs/STATUS/Backlog.md`; `Docs/AGENTS/Agent_Outputs.md`; `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W2-LS2_Live_Smoke_Package.md`; `Docs/AGENTS/index/handoff-index.json`.

**Key decisions:** LS2 is a separate one-job live-smoke package after QC3, not a rerun of LS1. It uses the exact Captain-defined input `Using hydrogen for cars is more efficient than using electricity` because QC2 measured it at three accepted Query Planning entries and it should exercise the post-QC3 six-entry W2 cap while staying smaller than the legal/fair-trial question. The package keeps one provider, one endpoint, no credentials, q-only request mapping, hidden/admin-only artifacts, public pre-cutover damaged output, and no source material/downstream behavior. Claude Opus review required W1A/W1B artifact route probes and W1A/W1B pass criteria; both were incorporated.

**Warnings:** LS2 does not authorize source material, content dereference, parser/cache/SR/storage, EvidenceCorpus, evidence/report/verdict/warning/confidence behavior, public cutover, broad provider expansion, prompt/config/schema/model/provider/source/test/script edits, ACS/direct URL, V1 reuse, V1 work, or V1 cleanup. If any endpoint drift, route-preflight failure, V1 fallback, public leak, missing X7-S/X7-W2 artifact, or need for edits appears, stop and create a separate reviewed fix package.

**Verification at handoff time:** `npm run validate:v2-gates`, `node scripts/validate-v2-gate-register.mjs --self-test`, `npm run index`, and `git diff --check` passed before package commit. No live job has been run yet.

**Review status:** Claude Opus 4.6 senior architect/security review returned MODIFY on 2026-05-18 with two required edits; both were applied. The review stated the package is safe to commit as a focused docs package and execute under the package gates after those edits.

**For next agent:** Commit only the LS2 docs package by explicit path after verifying the staged envelope. Then refresh runtime, run runtime verifiers and admin-route preflight, and submit at most one live job. Do not repair failures inside LS2.

**Learnings:** After a cap-alignment source fix, the next live package needs to prove both the new cap path and the unchanged containment posture: exact input, one provider, explicit route probes, endpoint-status re-check, and public leak checks are part of the safety case, not optional execution notes.
