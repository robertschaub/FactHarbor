### 2026-05-18 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 X7-W2-DIAG2 Sanitized Transport Diagnostics Source Package

**Task:** Draft and review the next W2 package after DIAG1 so the transport failure can be diagnosed without broadening source execution.

**Files touched:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-DIAG2_Sanitized_Transport_Diagnostics_Source_Package.md`; `Docs/STATUS/Current_Status.md`; `Docs/STATUS/Backlog.md`; `Docs/AGENTS/Agent_Outputs.md`; `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W2-DIAG2_Source_Package.md`; `Docs/AGENTS/index/handoff-index.json`.

**Key decisions:** Claude Opus 4.6 reviewed the package and returned `approve` with two advisory clarifications, both incorporated. DIAG2 is diagnostic-only: propagate existing hidden diagnostic fields into W2 attempt telemetry/artifacts and add only `selectedAddressFamily` plus structural `transportFailureClass`.

**Open items:** Implement inside the approved source envelope, then run the verifier set in the package. Do not run a live job under DIAG2; a separate LS3/repair package is required before a rerun.

**Warnings:** Do not expose raw URLs, query text, provider payloads, response body/header, raw IP addresses, raw error messages, stacks, causes, source material, parser output, cache/SR fields, evidence, report, verdict, warning, or confidence. Preserve current W2 damaged semantics.

**For next agent:** Implement `Docs/WIP/2026-05-18_V2_Slice_X7-W2-DIAG2_Sanitized_Transport_Diagnostics_Source_Package.md` exactly. Expected production files are `source-acquisition-network-envelope.ts`, `source-acquisition-network-transport.ts`, `source-acquisition-network-factory.ts`, and `candidate-provider-network-loop.ts`; test/status/handoff/index updates are allowed. No prompt/config/model/schema/provider-policy edits, no live jobs, no source material/content/parser/cache/SR/storage/EvidenceCorpus/report/public behavior, and no V1 work.

**Learnings:** Not appended. The durable lesson is already captured in DIAG1/DIAG2: safe telemetry can be too coarse; add bounded structural diagnostics before repairing provider behavior.
