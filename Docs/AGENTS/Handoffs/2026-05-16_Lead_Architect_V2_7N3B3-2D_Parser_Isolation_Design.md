---
### 2026-05-16 | Lead Architect | Codex (GPT-5) | V2 7N-3B3-2D Parser Isolation Design
**Task:** Draft the next docs-only source-acquisition gate after 7N-3B3-2C-A.
**Files touched:**
- `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D_Parser_Isolation_Design_Package.md`
- `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2C-A_Post_Implementation_Consolidation.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
**Key decisions:** Deputy post-review passed 2C-A consolidation. A follow-up debate converged that the next gate should be parser isolation before source-acquisition execution wiring. The proposed 2D direction is docs-only: a one-shot child-process parser runner plus staged inert content-type allowlist, with container/sandbox deferred unless child-process verifiers cannot prove no network/file/env leakage. The package explicitly rejects in-process parsing, Node `vm`, worker thread as the security boundary, browser parsing, PDF/native parsing, product/public/live wiring, and evidence/report semantics.
**Open items:** 2D still needs deputy package review. It authorizes no source implementation.
**Warnings:** Any parser source implementation must solve the `apps/web` TypeScript `noEmit` worker-entrypoint problem without dev-only loaders. Keep parser output hidden/structural; do not feed parsed content into Evidence Lifecycle until a later gate.
**For next agent:** Review `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D_Parser_Isolation_Design_Package.md` using its reviewer prompt. Return approve/modify/reject. Do not implement parser source, product wiring, live jobs, cache/SR/storage, prompts/models, evidence/report generation, ACS/direct URL, V1 reuse, or V1 cleanup.
**Learnings:** no
