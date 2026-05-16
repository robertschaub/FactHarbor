---
### 2026-05-16 | Lead Architect | Codex (GPT-5) | V2 7N-3B3-2D Parser Isolation Design
**Task:** Draft the next docs-only source-acquisition gate after 7N-3B3-2C-A.
**Files touched:**
- `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D_Parser_Isolation_Design_Package.md`
- `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D_Post_Review_Consolidation.md`
- `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2C-A_Post_Implementation_Consolidation.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
**Key decisions:** Deputy post-review passed 2C-A consolidation. A follow-up debate converged that the next gate should be parser isolation before source-acquisition execution wiring. First deputy package review returned Security `MODIFY` and Senior Developer / LLM-Evidence `APPROVE`. The revised 2D direction is docs-only: child-process parser work may only be a protocol harness over fixture/control bytes; parser execution over real fetched bytes requires a later reviewed container, separate OS user, OS sandbox, or equivalent OS-level denial boundary. The package explicitly rejects in-process parsing, Node `vm`, worker thread as the security boundary, browser parsing, PDF/native parsing, product/public/live wiring, and evidence/report semantics.
**Open items:** 2D is review-clean as a docs-only design. The next allowed action is a separate 2D-A source package for a fixture/control parser runner protocol harness. 2D itself authorizes no source implementation.
**Warnings:** A child process and Node permission flags are defense-in-depth, not a malicious-code sandbox. Any later real-byte parser source package must solve both the OS-level denial boundary and the `apps/web` TypeScript `noEmit` worker-entrypoint problem without dev-only loaders. Keep parser output hidden/structural; do not feed parsed content into Evidence Lifecycle until a later gate.
**For next agent:** Draft 2D-A as a separate source package for fixture/control parser protocol harness only. Do not implement parser source until that package is reviewed. Do not parse real fetched bytes, product wiring, live jobs, cache/SR/storage, prompts/models, evidence/report generation, ACS/direct URL, V1 reuse, or V1 cleanup.
**Learnings:** no
