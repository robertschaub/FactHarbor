### 2026-05-18 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 X7-W2-LS3 DIAG2 Diagnostic Live-Smoke Package

**Task:** Prepare and review the next W2 live-smoke package after DIAG2 implementation so the new hidden transport diagnostics can be captured safely.

**Files touched:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS3_DIAG2_Transport_Diagnostics_Live_Smoke_Package.md`; `Docs/STATUS/Current_Status.md`; `Docs/STATUS/Backlog.md`; `Docs/AGENTS/Agent_Outputs.md`; `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W2-LS3_Diagnostic_Live_Smoke_Package.md`; `Docs/AGENTS/index/handoff-index.json`.

**Key decisions:** LS3 is diagnostic-only. It reuses the exact LS2 Captain input `Using hydrogen for cars is more efficient than using electricity` and passes only if a committed/refreshed product V2 job reaches W2 and safely records the DIAG2 fields on hidden network attempts. W2 provider-network completion may still fail; that is not an LS3 diagnostic failure if the DIAG2 capture objective passes.

**Review:** Claude Opus 4.6 reviewed the package and returned `APPROVE` with no required changes. The review confirmed the exact input, diagnostic-only pass bar, one-provider limit, pre-live gate sequence, no-source/no-public constraints, leak controls, and hard-fail criteria.

**Open items:** Commit this docs-only package, refresh runtime, re-check the official endpoint docs, run the package verifiers and route preflight, then submit at most one live job if all gates pass.

**Warnings:** LS3 does not authorize repair, retries, provider expansion, source material, content dereference, parser/cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence behavior, public output, ACS/direct URL, prompt/config/model/schema/provider-policy edits, V1 work, or V1 cleanup. Do not repair inside LS3; create a separate reviewed package if the diagnostic run fails or points to a fix.

**For next agent:** Start with `Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS3_DIAG2_Transport_Diagnostics_Live_Smoke_Package.md`. The next action is package commit and gated execution of one diagnostic job only after the listed verifiers and preflight pass.

**Learnings:** Separate diagnostic pass criteria from provider-success criteria when the immediate goal is observability. This keeps repair decisions reviewable and prevents a failed provider call from being mistaken for source quality evidence.
