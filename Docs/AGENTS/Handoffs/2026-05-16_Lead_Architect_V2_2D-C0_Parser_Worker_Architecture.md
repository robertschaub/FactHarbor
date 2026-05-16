# Lead Architect Handoff: V2 2D-C0 Parser Worker Architecture And Provisional Isolation

---
### 2026-05-16 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 2D-C0 Parser Worker Architecture
**Task:** Draft a small architecture package for the future isolated parser worker while providing a provisional isolation profile.

**Files touched:**
- `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-C0_Parser_Worker_Architecture_And_Provisional_Isolation.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_2D-C0_Parser_Worker_Architecture.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/index/handoff-index.json` after indexing

**Decision recorded:**
- Add a stable parser-worker contract as the seam between source-acquisition byte custody and future parsing.
- Add a P0 provisional local/test profile for fixture/control or synthetic inert inputs only.
- P0 is explicitly labelled `provisional_local_inert_only_not_security_boundary`.
- P0 cannot consume real fetched bytes, 2C-A packets, arbitrary URLs, HTML fetched from the network, PDFs, office docs, archives, browser-rendered pages, executable content, production traffic, or staging traffic.
- P1/P2 proof gates remain required before local-only real-byte or deployment-candidate parser work.
- After Architect/Security review, corrected the diagram and worker-contract wording so P0 starts only from fixture/control or synthetic inert local input and explicitly rejects 2C-A transport-owned packet/frame provenance.

**Warnings:**
- This package authorizes no source edits.
- This package authorizes no parser execution.
- This package does not weaken the production isolation requirement.
- Product/public/live/cache/SR/Evidence/ACS/direct URL/V1 behavior remains blocked.

**For next agent:**
- Send the C0 package to Architect/Security review.
- If accepted, a later source package may implement only the P0 parser-worker contract and fixture/control or synthetic inert behavior.
- Do not implement P0 source until that source package is reviewed.

**Learnings:** A provisional profile is useful only if it shapes the seam and prevents direct product-coupled parsing. It must be louder than usual about what it is not: it is not a hostile-document sandbox and not deployment readiness.
