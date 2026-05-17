---
roles: [Lead Architect, Captain Deputy]
topics: [v2, x7-q, claim-understanding, language-metadata, package]
files_touched:
  - Docs/WIP/2026-05-17_V2_Slice_X7-Q_Claim_Understanding_Language_Metadata_Repair_Package.md
  - Docs/STATUS/Current_Status.md
  - Docs/STATUS/Backlog.md
  - Docs/AGENTS/Agent_Outputs.md
  - Docs/AGENTS/Handoffs/2026-05-17_Lead_Architect_V2_X7-Q_Language_Metadata_Repair_Package.md
  - Docs/AGENTS/index/handoff-index.json
---

# Lead Architect Handoff: V2 X7-Q Language-Metadata Repair Package

### 2026-05-17 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 X7-Q Language-Metadata Repair Package

**Task:** Prepare a package-first repair proposal after X7-P showed accepted direct-text Claim Understanding can still leave X7-O blocked on `language_signal_unavailable`.
**Files touched:** `Docs/WIP/2026-05-17_V2_Slice_X7-Q_Claim_Understanding_Language_Metadata_Repair_Package.md`, `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`, `Docs/AGENTS/Handoffs/2026-05-17_Lead_Architect_V2_X7-Q_Language_Metadata_Repair_Package.md`, `Docs/AGENTS/index/handoff-index.json`.
**Key decisions:** The approved package treats direct-input source-language metadata as part of the ClaimContract contract, not as an X7-O-only observer fallback. It authorizes prompt guidance plus global `ClaimContractSchema` validation: accepted direct-input contracts must not carry blank or `und` language metadata, and the LLM must infer source-language signal from direct input when the seed is `und`. X7-O and Query Planning input-envelope raw invalid direct-input cases should block as `claim_contract_invalid`.
**Open items:** Source implementation is next and must stay inside the approved X7-Q envelope. LLM/semantic, Architect, Security/runtime, and Code/package deputies approved the package on 2026-05-17.
**Warnings:** Do not implement prompt/schema changes until the package is accepted. Do not add deterministic language detection. Do not rerun X7-P until after an implementation commit and a separate reviewed execution package.
**For next agent:** Commit the docs-only package by exact path, then implement only inside the approved envelope. Use `/debt-guard` for the implementation because this is a failed-live-smoke repair.
**Learnings:** When a downstream observer blocks on a real execution prerequisite, avoid local observer fallback paths that would pass the smoke but leave the actual future execution path blocked.
