---
### 2026-05-16 | Lead Architect | Codex | V2 7N-3B Source-IO Preflight Gate

**Task:** Debate, review, and document the next V2 source-acquisition gate after 7N-3A runtime authority contracts.

**Files touched:**
- `Docs/WIP/2026-05-16_V2_Slice_7N3B_Source_IO_Preflight_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`

**Key decisions:**
- 7N-3B is a preflight gate only, committed at `05387362`; it does not approve concrete source IO or live jobs.
- The debate team rejected jumping straight from 7N-3A into provider/fetch implementation. It requires a reviewed preflight boundary first.
- 7N-3B freezes required SSRF/DNS/redirect/final-address/content-type/sniffing/size/decompression/timeout/cancellation/parser-sandbox/no-storage/no-public controls.
- 7N-3B makes 7N-3A runtime authority preservation explicit: future source IO must reject copied/JSON/plain-object authority, 7N-2 `controlled_harness_only`, injected harness ports, stale authority, and any enabled public/cache/SR/product/live/ACS/direct URL capability.
- Future source implementation is split in principle into 7N-3B1 candidate acquisition, 7N-3B2 content packet fetch/parser boundary, and 7N-3C live smoke.

**Open items:**
- 7N-3B1 implementation requires explicit Captain confirmation before code because it introduces provider/search/fetch/network behavior.
- 7N-3B1 must convert candidate file envelopes into exact allowed/forbidden source and test file lists before implementation.
- 7N-3B2 must separately approve content packet fetch/parser behavior before any fetched content or parser execution exists.
- 7N-3C live smoke remains blocked until hidden inspection, no-public-leak verification, runtime refresh/reseed, rollback/kill switch, and Captain-approved canaries are ready.

**Warnings:**
- Do not use `Docs/WIP/2026-05-16_V2_Slice_7N3B_Source_IO_Preflight_Package.md` as implementation approval.
- Do not import, clone, or adapt V1 search/retrieval helpers (`web-search.ts`, `search-*.ts`, `retrieval.ts`, `research-acquisition-stage.ts`) without a separate explicit review. Security ideas may be rewritten from the threat model, not copied.
- Do not let provider rank, title, snippet, URL/domain, language metadata, or content length become relevance, source-quality, warning, verdict, or report signals.

**For next agent:** Ask Captain for explicit approval before implementing 7N-3B1. If approved, start with an implementation package for hidden runtime-only candidate acquisition that names exact files, authority checks, provider allowlist snapshot, budget snapshot, no-cache/no-SR/no-public guards, and tests. No live jobs yet.

**Validation:**
- `git diff --check`

**Learnings:** Not appended. The durable learning is captured in the 7N-3B package and status docs.
