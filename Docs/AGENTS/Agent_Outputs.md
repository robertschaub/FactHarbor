# Agent Outputs Log -- Active Index

This file is a **triage-weight index**, not a full log. Each entry is a 3-line summary
with a link to the full handoff file in `Docs/AGENTS/Handoffs/`.

Full protocol: `Docs/AGENTS/Policies/Handoff_Protocol.md`.
Archived entries: `Docs/ARCHIVE/Agent_Outputs_YYYY-MM.md` + `Docs/ARCHIVE/Handoffs/YYYY-MM/`.

---
### 2026-05-16 | Lead Architect | Codex (GPT-5) | V2 B3 Image Approval Hardening -- [Significant] [open-items: yes]
**For next agent:** High B3 verifier finding is closed: the OCI positive proof path can no longer self-approve `FH_ANALYZER_V2_PARSER_SANDBOX_IMAGE`. The proof contract now requires an independent `imageApprovalSource`; the positive env branch requires `PROOF`, `RUNTIME`, `IMAGE`, `APPROVED_IMAGE`, and `IMAGE_APPROVAL_SOURCE`; zero env still returns `parser_isolation_unavailable`, but legacy/partial env now fails loudly. This is verifier hardening only, not a positive B3 proof. 2D-C, parser execution, product/public/live wiring, cache/SR/storage, evidence/report behavior, ACS/direct URL, and V1 cleanup remain blocked.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_B3_Image_Approval_Hardening.md

---
### 2026-05-16 | Lead Architect | Codex (GPT-5) | V2 7N-3B3-2C-A Source Package Approval -- [Significant] [open-items: yes]
**For next agent:** 7N-3B3-2C-A is deputy-approved for source implementation in `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2C-A_Real_Byte_Handoff_Source_Package.md`. Scope is exact: `source-acquisition-content-transport.ts`, `source-acquisition-content-packet-sink.ts`, focused transport/sink tests, and boundary guards only. Implement transport-owner real bytes into hidden packet sink with byte-free public transport outcomes, separate 2C-A packet sink authority, sink-owned HMAC sealing, explicit disposal, concrete kill switch, and no parser consumption. Product/public wiring, live jobs, cache/SR/storage, evidence/report/warning generation, prompt/model/config/schema changes, ACS/direct URL, V1 reuse, and V1 cleanup remain blocked.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_7N3B3-2C-A_Source_Package_Approval.md

---
### 2026-05-16 | Lead Architect | Codex (GPT-5) | V2 7N-3B3-2C Real Byte Handoff Design -- [Significant] [open-items: yes]
**For next agent:** 7N-3B3-2C is review-approved as docs-only real transport-byte handoff design in `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2C_Real_Byte_Handoff_Design_Package.md`. It authorizes no source edits. The next implementation step is drafting a separate 7N-3B3-2C-A source package, limited to owner-created real bytes from `source-acquisition-content-transport.ts` into hidden packet materialization in `source-acquisition-content-packet-sink.ts`; parser consumption of real fetched bytes remains blocked until a later parser-isolation package. Product/public wiring, live jobs, cache/SR/storage, evidence/report/warning generation, prompt/model/config/schema changes, ACS/direct URL, V1 reuse, and V1 cleanup remain blocked.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_7N3B3-2C_Real_Byte_Handoff_Design.md

---
### 2026-05-16 | Lead Architect | Codex (GPT-5) | V2 7N-3B3-2B Parser/Sink Source -- [Significant] [open-items: yes]
**For next agent:** 7N-3B3-2B is implemented at `13ff68d3` and hardened at `6e71bbea` / `3a4c7308` / `20dc2900` as fixture/control-only parser/sink source, then consolidated in `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2B_Post_Implementation_Consolidation.md`. `createSourceAcquisitionContentFixturePacket(...)` rejects ordinary caller bytes and uses only module-owned committed fixture material; parser terminal paths dispose valid packets; disposed packet references no longer validate; active packet metadata is module-private-state-backed and frozen against caller mutation; boundary guards block parser/sink owner and non-owner imports/re-exports. Next gate is a separate 7N-3B3-2C debate/review package only if real transport-byte handoff is still needed. Product/public wiring, live jobs, cache/SR, evidence/report generation, ACS/direct URL, V1 reuse, and V1 cleanup remain blocked.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_7N3B3-2B_Parser_Sink_Source.md

---
### 2026-05-16 | Lead Architect | Codex (GPT-5) | V2 7N-3B3-2A Approval And 7N-3B3-2B Draft -- [Standard] [open-items: yes]
**For next agent:** 7N-3B3-2A is approved as a docs-only parser/sink isolation boundary after security hardening and re-review. `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2B_Parser_Sink_Source_Package.md` is drafted for deputy review only and amended after initial 2B review: fixture/control-only parser/sink source package, exact files `source-acquisition-content-parser.ts` and `source-acquisition-content-packet-sink.ts`, exact exports/imports, branded fixture ingress, minimal non-worker timeout/abort path, focused tests, and boundary guards. Real transport-byte handoff from `source-acquisition-content-transport.ts` is reserved for later 7N-3B3-2C. Parser/sink implementation, real byte handoff, product/public wiring, live jobs, cache/SR, evidence/report generation, ACS/direct URL, V1 reuse, and V1 cleanup remain blocked pending 2B re-review.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_7N3B3-2A_Approval_7N3B3-2B_Draft.md

---
### 2026-05-16 | Lead Architect | Codex (GPT-5) | V2 7N-3B3-1 Consolidation And 7N-3B3-2A Draft -- [Standard] [open-items: yes]
**For next agent:** 7N-3B3-1 is consolidated as byte-free hidden/internal content dereference at `267bfb9e`, and `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2A_Parser_Sink_Isolation_Package.md` is drafted for deputy review. The hard blocker is explicit: real fetched-byte parser/sink materialization requires a reviewed owner-only HMAC/provenance-bound handoff from `source-acquisition-content-transport.ts`; parser/sink files alone cannot safely parse real transport bytes. Security-review hardening for HMAC/provenance mismatch rejection, terminal-path disposal, and mandatory isolation for real bytes is applied. Parser/sink source implementation, real byte handoff, product/public wiring, live jobs, cache/SR, evidence/report generation, ACS/direct URL, V1 reuse, and V1 cleanup remain blocked.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_7N3B3-1_Consolidation_7N3B3-2A_Draft.md

---
### 2026-05-16 | Senior Developer | Codex (GPT-5) | V2 7N-3B3-2 Parser/Sink Boundary Review -- [Standard] [open-items: yes]
**For next agent:** Reviewed commit `267bfb9e` and current 7N-3B3/7N-3B3-1 docs. Recommendation is `MODIFY` before any 7N-3B3-2 implementation: do not combine real parser execution with product/live/cache/SR/storage wiring. The next package should either be a narrower byte-transfer/content-packet sink gate, or explicitly amend the file envelope to include a reviewed owner-only raw-byte handoff from `source-acquisition-content-transport.ts`; current 7N-3B3-1 success outcomes expose diagnostics only, so parser/sink materialization cannot safely happen from the two new files alone. Public/product reachability, cache/SR/durable storage, live jobs, ACS/direct URL, semantic extraction/evidence/report generation, and V1 reuse/cleanup remain blocked.
**Warnings:** Hard blockers for source work are unresolved raw-byte authority/provenance ownership, parser isolation model proof, sink lifetime/disposal policy, sentinel secret/file leakage tests, HMAC key-sourcing rules, exact export/import guards for parser and packet sink, and no-public-reach proof after allowing parser/sink files.

---
### 2026-05-16 | Lead Architect | Codex (GPT-5) | V2 7N-3B3-1 Content Dereference Boundary -- [Significant] [open-items: yes]
**For next agent:** 7N-3B3-1 is implemented as hidden/internal content dereference only: private content authority derived from 7N-3B2, raw-URL-free target/budget envelope, HMAC-bound owner-created ephemeral targets, Node-core HTTPS transport with DNS/final-address/redirect/type-sniff/byte/decompression/timeout/cancellation controls, sanitized diagnostics, and boundary guards. Parser/sink, product/public wiring, live jobs, cache/SR, evidence/report generation, ACS/direct URL, V1 reuse/cleanup, and Captain canaries remain blocked pending separate reviewed gates.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_7N3B3-1_Content_Dereference_Boundary.md

---
### 2026-05-16 | Lead Architect | Codex (GPT-5) | V2 7N-3B3-1 Approval -- [Standard] [open-items: yes]
**For next agent:** 7N-3B3-1 is approved for implementation inside the exact package envelope only: content-dereference authority, raw-URL-free target envelope, content transport, focused tests, and boundary guards. Parser/sink, live jobs, product/public wiring, cache/SR, evidence/report generation, V1 reuse/cleanup, and Captain canaries remain blocked.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_7N3B3-1_Approval.md

---
### 2026-05-16 | Lead Architect | Codex (GPT-5) | V2 7N-3B3-1 Review Modifications -- [Standard] [open-items: yes]
**For next agent:** Initial 7N-3B3-1 review returned `MODIFY` from security and test/ops/cost. The amended package now requires hermetic transport tests, concrete target/attempt/concurrency/byte/time ceilings, commit-first provenance, exact rollback and refresh criteria, hidden artifact samples, static public-route reachability proof, prevalidated-address connection pinning before request emission, and opaque IDs/keyed HMACs instead of bare host/path/query/locator hashes. Implementation remains blocked until re-review approves.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_7N3B3-1_Review_Modifications.md

---
### 2026-05-16 | Lead Architect | Codex (GPT-5) | V2 7N-3B3 Approval And 7N-3B3-1 Draft -- [Standard] [open-items: yes]
**For next agent:** 7N-3B3 is approved as docs-only boundary work; `Docs/WIP/2026-05-16_V2_Slice_7N3B3-1_Content_Dereference_Source_Package.md` is drafted for deputy review. It may approve only content-dereference authority, raw-URL-free target envelope, and content transport; parser/sink, live jobs, product/public wiring, cache/SR, evidence/report generation, V1 reuse/cleanup, and Captain canaries remain blocked.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_7N3B3_Approval_7N3B3-1_Draft.md

---
### 2026-05-16 | Lead Architect | Codex (GPT-5) | V2 7N-3B2 Consolidation And 7N-3B3 Draft -- [Standard] [open-items: yes]
**For next agent:** 7N-3B2 is consolidated as hidden/internal candidate-provider-network only, and `Docs/WIP/2026-05-16_V2_Slice_7N3B3_Content_Packet_Parser_Package.md` is drafted for docs-only deputy review. The draft keeps source implementation blocked and splits later content dereference (`7N-3B3-1`) from parser/sink (`7N-3B3-2`); live jobs, product/public wiring, cache/SR, evidence/report generation, V1 reuse/cleanup, and Captain canaries remain blocked.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_7N3B2_Consolidation_7N3B3_Draft.md

---
### 2026-05-16 | Lead Architect | Codex (GPT-5) | V2 7N-3B2 Provider Network Boundary -- [Significant] [open-items: yes]
**For next agent:** 7N-3B2 is implemented at `54b8af1a` as a hidden/internal SDK-free candidate-provider network boundary only: private provider-network authority, raw-URL-free endpoint/budget snapshots, Node-core HTTPS transport, SSRF/final-address checks, redirect denial, streaming byte/decompression caps, timeout/abort handling, hidden diagnostics, and adapter wiring back into the injected 7N-3B1 provider boundary. Product/public wiring, live jobs, content dereference/parser execution, cache/SR, ACS/direct URL, prompt/config/model/schema changes, public result exposure, and V1 cleanup remain blocked.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_7N3B2_Provider_Network_Boundary.md

---
### 2026-05-16 | Lead Architect | Codex (GPT-5) | V2 7N-3B2 Review Modifications -- [Standard] [open-items: yes]
**For next agent:** First deputy review of `Docs/WIP/2026-05-16_V2_Slice_7N3B2_Candidate_Provider_Network_Source_Package.md` returned `MODIFY`. The amended draft now requires exact files/imports/exports, SDK-free Node-core HTTPS transport, structural raw-URL-free endpoint snapshots, concrete provider-network authority, redirect denial, and exact leakage/security tests. Implementation remains blocked until re-review returns `approve`.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_7N3B2_Review_Modifications.md

---
### 2026-05-16 | Lead Architect | Codex (GPT-5) | V2 7N-3B1 Consolidation And 7N-3B2 Draft -- [Standard] [open-items: yes]
**For next agent:** 7N-3B1 is consolidated and `Docs/WIP/2026-05-16_V2_Slice_7N3B2_Candidate_Provider_Network_Source_Package.md` is drafted for review only. Next action is deputy review of 7N-3B2; no provider/network implementation, content dereference/parser, live jobs, cache/SR, product/public wiring, or V1 cleanup is approved.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_7N3B1_Consolidation_7N3B2_Draft.md

---
### 2026-05-16 | Lead Architect | Codex (GPT-5) | V2 7N-3B1 Candidate Runtime Hardening -- [Standard] [open-items: yes]
**For next agent:** Post-review blockers in 7N-3B1 are fixed at `3d05583e`: child authority now matches parent 7N-3A snapshot hashes, provider attempt IDs are opaque `ATT_<digits>`, non-success provider outcomes cannot carry candidates, and injected provider calls enforce timeout outcomes. Concrete provider/source IO and live jobs still need a later reviewed package.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_7N3B1_Candidate_Runtime_Hardening.md

---
### 2026-05-16 | Lead Architect | Codex (GPT-5) | V2 7N-3B1 Candidate Acquisition Runtime Shell -- [Significant] [open-items: yes]
**For next agent:** 7N-3B1 is implemented at `878ba6ba` as a hidden/internal candidate-acquisition runtime shell only: package-scoped authority, injected provider boundary, structural allowlist/budget validation, hidden candidate records, exact query coverage, and boundary guards. Concrete provider/source IO, content dereference, parser/network execution, Source Reliability, cache IO, product/public wiring, and live jobs remain blocked until a separate reviewed package.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_7N3B1_Candidate_Acquisition_Runtime_Shell.md

---
### 2026-05-12 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Specification Plan -- [Standard] [open-items: yes]
**For next agent:** Phase 0 is deputy-approved and Phase 1 context is captured in `Docs/WIP/2026-05-12_Pipeline_Rebuild_Phase1_Context_Summary.md`. Start Phase 2 reverse-engineering from that file plus the Plan V2 Baseline; Captain delegated normal decision gates to a Captain Deputy agent team, escalating only for high risk or no consent.
-> Docs/AGENTS/Handoffs/2026-05-12_Lead_Architect_Pipeline_Rebuild_Specification_Plan.md

---
### 2026-04-26 | Code Reviewer | Claude Opus 4.6 | Pipeline Review Since ACS Baseline (2f7a2805) -- [Significant] [open-items: yes]
**For next agent:** 11 findings ranked by severity. #1 (high): no C# tests for `ClaimSelectionDraftService.cs` (1,057-line state machine). #2 (medium): verdict citation integrity fallback skips re-enforcement on adjudication failure. #3 (medium): relevance cache key missing model/provider. Comparison evidence profile threading is consistent across all 7 stages; ACS security is strong.
→ Docs/AGENTS/Handoffs/2026-04-26_Code_Reviewer_Pipeline_Review_Since_ACS_Baseline.md

---
### 2026-04-24 | Senior Developer | Codex (GPT-5) | Claim Selection Draft State And Salience Runtime Guards -- [Standard] [open-items: no]
**For next agent:** [page.tsx](/c:/DEV/FactHarbor/apps/web/src/app/analyze/select/[draftId]/page.tsx) now normalizes parsed draft JSON before rendering, so older or partial draft states no longer crash on missing `recommendedClaimIds.length`. [claim-extraction-stage.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts) now fail-opens leaked salience commitment schema errors, preserving the documented non-fatal behavior and allowing Stage 1 to continue to Pass 2.
→ Docs/AGENTS/Handoffs/2026-04-24_Senior_Developer_Claim_Selection_Draft_State_Runtime_Guard.md

---
### 2026-04-24 | Unassigned | Codex (GPT-5) | ACS Session Preparation Challenger Review -- [Standard] [open-items: yes]
**For next agent:** Block cross-session prepared-result reuse for now: current Stage 1 semantics still include live URL fetch plus live preliminary search, and `PreparedStage1Snapshot` only persists `resolvedInputText` + `preparedUnderstanding`, so exact public-URL equality is not a safe reuse contract. Narrow current scope to attribution cleanup in `internal-runner-queue.ts` / analyzer logging and truthful prep wording in `page.tsx` / `page-helpers.ts` without weakening the per-draft token boundary.
→ Docs/AGENTS/Handoffs/2026-04-24_Unassigned_ACS_Session_Preparation_Challenger_Review.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | ACS Fragment Root-Cause Debate -- [Standard] [open-items: yes]
**For next agent:** Full-tier debate result was `MODIFY`: the live Grander ACS case does prove fragment URL expansion into duplicated whole-page FAQ text before Stage 1, and it does rule out recommendation tuning as the first fix for that incident. But the current bundle still does not prove fragment-aware bounded extraction should ship ahead of Stage 1 final revalidation hardening without an exact same-URL A/B rerun.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_Fragment_Root_Cause_Debate.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | ACS Slow Dialog Real Issue: Fragment URL Expansion -- [Standard] [open-items: yes]
**For next agent:** The main defect behind the “slow checkworthiness dialog” is not recommendation itself. Fragment-scoped FAQ URLs are currently expanded into whole-page duplicated article text before Stage 1. On the live Grander case, a `#fragment` subsection of about `1332` chars became a `7364`-char whole-article input, producing `20` candidate claims and a late Stage 1 revalidation failure before recommendation started.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_Slow_Dialog_Real_Issue_Fragment_URL_Expansion.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | ACS Live Monitoring Grander Draft -- [Standard] [open-items: yes]
**For next agent:** Live monitoring of draft `6f18f926e2a2443f96afa097429ec146` confirmed the observability patch is working end to end: `lastEventMessage` persisted during prep, failure state carried `draftStateJson.observability`, and the run died in Stage 1 after Gate 1 when final contract revalidation returned no usable result twice. Measured prep time was ~`330s`, all effectively Stage 1; recommendation never started.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_Live_Monitoring_Grander_Draft.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Claim Selection Draft Observability Implementation -- [Significant] [open-items: yes]
**For next agent:** ACS draft prep now persists live milestone text via `LastEventMessage` and canonical prep telemetry via `ClaimSelectionDraftState.observability`; Stage 1 contract validation / retry / repair are split into distinct progress milestones and timed separately. Restart the services and run a fresh 5+ claim draft to verify the live UI path end to end, because only build/targeted-test verification was completed here.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Claim_Selection_Draft_Observability_Implementation.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | ACS Draft Slowness Challenger Position -- [Standard] [open-items: yes]
**For next agent:** Prefer a no-schema first slice: instrument `prepareStage1Snapshot(...)` and expose a derived draft-preparation projection from `DraftStateJson.observability` rather than adding a `LastEventMessage` row column. Main anchors: `internal-runner-queue.ts`, `claim-extraction-stage.ts`, `ClaimSelectionDraftService.cs`, and ACS spec section 5.6.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_Draft_Slowness_Challenger_Position.md

---
### 2026-04-22 | Unassigned | GitHub Copilot (GPT-5.4) | Internal Agent Knowledge Query Layer CLI-First Realignment -- [Standard] [open-items: yes]
**For next agent:** The active spec at [Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md) now matches the multi-model debate result: shared query core, local cache, and committed index substrate remain, but v1 is CLI-first and both the MCP adapter and `publish_handoff` are deferred.
→ Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Internal_Agent_Knowledge_Query_Layer_CLI_First_Realignment.md

---
### 2026-04-22 | Unassigned | GitHub Copilot (GPT-5.4) | Internal Agent Knowledge MCP v1 Publish Handoff Atomicity Pass -- [Standard] [open-items: yes]
**For next agent:** The active spec at [Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md) now has an explicit Section 9.4 for `publish_handoff`: required `topics` frontmatter, publish-lock plus idempotency check, handoff temp-write before `Agent_Outputs.md` rewrite, best-effort rollback on second-write failure, and immediate cache/index refresh so newly published handoffs are discoverable right away.
→ Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Internal_Agent_Knowledge_MCP_V1_Publish_Handoff_Atomicity_Pass.md

---
### 2026-04-22 | Unassigned | GitHub Copilot (GPT-5.4) | Internal Agent Knowledge MCP v1 Review Refinement -- [Standard] [open-items: yes]
**For next agent:** The active spec at [Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md) now replaces `scaffold_handoff` with protocol-complete `publish_handoff`, adds authoritative source coverage for analyzer/model-tier inputs, strengthens cache freshness tracking, and assumes a root `/.cache/` ignore rule.
→ Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Internal_Agent_Knowledge_MCP_V1_Review_Refinement.md

---
### 2026-04-22 | Unassigned | GitHub Copilot (GPT-5.4) | Internal Agent Knowledge MCP v1 Spec -- [Standard] [open-items: yes]
**For next agent:** New WIP spec at [Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md) turns the earlier indexing/MCP discussions into a concrete rollout shape: shared query core in a new `packages/fh-agent-knowledge/`, MCP plus first-class CLI adapters, gitignored local cache as primary serving layer, and current `Docs/AGENTS/index/*.json` files kept only as rollout-time compatibility inputs.
→ Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Internal_Agent_Knowledge_MCP_V1_Spec.md

---
### 2026-04-22 | Senior Developer | GitHub Copilot (GPT-5.4) | Build Index Parser Regression Tests -- [Standard] [open-items: no]
**For next agent:** [scripts/build-index.mjs](scripts/build-index.mjs) now exports `parseHandoff(...)` behind an `IS_MAIN` guard, and [apps/web/test/unit/lib/build-index.test.ts](apps/web/test/unit/lib/build-index.test.ts) locks in the role/topic fallback cases that previously dropped slug tokens like `captain` from `handoff-index.json`.
→ Docs/AGENTS/Handoffs/2026-04-22_Senior_Developer_Build_Index_Parser_Regression_Tests.md

---
### 2026-04-22 | Unassigned | Codex (GPT-5) | Report Review e95bd017 Non-Inspectable Hosted Job -- [Standard] [open-items: yes]
**For next agent:** Exact-job inspection failed cleanly: hosted job `e95bd017e955433d897fab04342f45e1` serves the `/jobs/<id>` shell but both public JSON endpoints return `404 {"error":"Job not found"}`, local `apps/api/factharbor.db` has no matching row, and no local artifact was found. No substantive report-quality diagnosis is confirmed until the exact payload is made inspectable.
→ Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Report_Review_e95bd017_Non_Inspectable_Hosted_Job.md

---
### 2026-04-22 | Senior Developer | GitHub Copilot (GPT-5.4) | Article Gate1 Contract Preservation And Iran URL Rerun -- [Standard] [open-items: yes]
**For next agent:** Stage 1 now uses `selectClaimsForGate1(...)` in `apps/web/src/lib/analyzer/claim-extraction-stage.ts` to keep clean contract-approved article claim sets intact for Gate 1; commit `424b9652` is live and rerun `9164bcf79cb04df2a0f308d933aed8ac` is running on that commit for the Iran URL.
→ Docs/AGENTS/Handoffs/2026-04-22_Senior_Developer_Article_Gate1_Contract_Preservation_And_Iran_URL_Rerun.md

---
### 2026-04-21 | Senior Developer | GitHub Copilot (GPT-5.4) | Unverified Validator Retry Hardening -- [Standard] [open-items: yes]
**For next agent:** Stage 1 now retries contract-validator structured-output once at every validation seam in [apps/web/src/lib/analyzer/claim-extraction-stage.ts](apps/web/src/lib/analyzer/claim-extraction-stage.ts#L2602). This targets the new `validator_unavailable` UNVERIFIED jobs (`d433c56e...`, `bc6325e6...`) and also stops exact-match retry salience from reordering an already-authoritative anchor inventory. Residual PDF/article drift remains open.
→ Docs/AGENTS/Handoffs/2026-04-21_Senior_Developer_Unverified_Validator_Retry_Hardening.md

---
### 2026-04-21 | Lead Architect | GitHub Copilot (GPT-5.4) | Skill-Level Failed Attempt Recovery Reinforcement -- [Standard] [open-items: yes]
**For next agent:** The new Failed-Attempt Recovery rule was reinforced in [.claude/skills/report-review/SKILL.md](/c:/DEV/FactHarbor/.claude/skills/report-review/SKILL.md), [.claude/skills/debug/SKILL.md](/c:/DEV/FactHarbor/.claude/skills/debug/SKILL.md), and [.claude/skills/pipeline/SKILL.md](/c:/DEV/FactHarbor/.claude/skills/pipeline/SKILL.md). `report-review` is the most important copy because its Phase 4 sub-agents inherit the non-negotiable constraints verbatim.
→ Docs/AGENTS/Handoffs/2026-04-21_Lead_Architect_Skill_Level_Failed_Attempt_Recovery_Reinforcement.md

---
### 2026-04-21 | Lead Architect | GitHub Copilot (GPT-5.4) | Failed Attempt Recovery Rule Draft -- [Standard] [open-items: yes]
**For next agent:** [AGENTS.md](/c:/DEV/FactHarbor/AGENTS.md) now carries a narrow Failed-Attempt Recovery rule: after failed focused validation, classify the earlier attempt as `keep`, `quarantine`, or `revert`, and broaden scope only with a verifier-backed reason. Copilot summary guidance was synced in [.github/copilot-instructions.md](/c:/DEV/FactHarbor/.github/copilot-instructions.md).
→ Docs/AGENTS/Handoffs/2026-04-21_Lead_Architect_Failed_Attempt_Recovery_Rule_Draft.md

---
### 2026-04-21 | Lead Architect | GitHub Copilot (GPT-5.4) | Additive Repair Drift Grounded Review -- [Standard] [open-items: yes]
**For next agent:** [2026-04-21_Additive_Repair_Drift_Problem_Statement.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-21_Additive_Repair_Drift_Problem_Statement.md) was tightened to better match the evidence bundle behind it: the problem is locally relevant, but prevalence remains unquantified and the “broader than one repo” claim now rests explicitly on external signals rather than repo-local proof.
→ Docs/AGENTS/Handoffs/2026-04-21_Lead_Architect_Additive_Repair_Drift_Grounded_Review.md

---
### 2026-04-21 | Lead Architect | Codex (GPT-5) | Additive Repair Drift Problem Statement -- [Standard] [open-items: yes]
**For next agent:** New reference doc at [2026-04-21_Additive_Repair_Drift_Problem_Statement.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-21_Additive_Repair_Drift_Problem_Statement.md) explains the workflow failure mode behind agents stacking failed code/prompt attempts instead of retiring them. Keep the final framing precise: the problem is real, but the better-supported response is verifier-gated bounded backtracking, hunk quarantine, and explicit scope-approval controls, not automatic rollback-first behavior.
→ Docs/AGENTS/Handoffs/2026-04-21_Lead_Architect_Additive_Repair_Drift_Problem_Statement.md

---
### 2026-04-19 | Unassigned | Claude Opus 4.6 | Exclusivity Claim Atomicity Fix -- [Significant] [open-items: yes]
**For next agent:** Uniqueness/exclusivity claims ("the only X that Y") were not decomposed — AC_01 was a verbatim copy of the full input. Added "Exclusivity/uniqueness override" to both Pass 1 and Pass 2 in `apps/web/prompts/claimboundary.prompt.md`. Prompt reseeded (hash `44867b58`); restart dev server and rerun job `01dfef57` to verify decomposition. All 1721 tests pass.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Report_Review_01dfef57_Exclusivity_Claim_Atomicity_Fix.md

---
### 2026-04-17 | Lead Developer | Codex (GPT-5) | Freshness Contract And Lane-Aware Retrieval Slice -- [Significant] [open-items: yes]
**For next agent:** The current-evidence slice is now implemented end to end without reopening recency-penalty architecture: Stage 1 emits `AtomicClaim.freshnessRequirement`, Stage 2 query generation and relevance classification consume it, claim-acquisition telemetry mirrors it into `claimAcquisitionLedger.*.iterations[*]`, and search now supports `supplementaryProviders.mode = "demote_on_freshness"` to keep supplementaries last but bounded to 1 result for `current_snapshot` claims. Prompt storage was reseeded to `claimboundary` hash `4803f2db...`; safe verification passed via `npm -w apps/web run build` and `npm test`. Remaining next step is live reruns of jobs `83747b8b` and `866e2c83`.
→ Docs/AGENTS/Handoffs/2026-04-17_Lead_Developer_Freshness_Contract_And_Lane_Aware_Retrieval_Slice.md

---
### 2026-04-17 | Lead Developer | GitHub Copilot (GPT-5.4) | Follow-up Review Fixes For Read Gating And Script Hardening -- [Significant] [open-items: no]
**For next agent:** Follow-up review blockers are closed. Job detail plus both event read paths now validate `jobId`, treat hidden jobs as admin-only, and the Next.js event proxies forward `X-Admin-Key` for admin reads. Stage 1 regression coverage now includes direct retry-failure protection assertions, protected carriers sort ahead of same-tier peers under the centrality cap, and the retry-preservation loop asserts a bounded 7-call path. Tooling hardening landed too: `install-hooks.mjs` backs up differing hooks before overwrite, `build-index.mjs` degrades safely on Tier 1 read failures, hook indexer failures append to `.git/hooks/factharbor-index.log`, the quality-drift scanner now parses typed object blocks without the old broad regex, temp validation scripts carry delete-by notes, and `CLAUDE.md` documents the `bypassPermissions` rationale. Verified with targeted Vitest (`416 passed | 1 skipped`), `npm -w apps/web run build`, `dotnet build apps/api/FactHarbor.Api.csproj -o temp/verify-api-build-review2`, and the touched Node maintenance scripts.
→ Docs/AGENTS/Handoffs/2026-04-17_Lead_Developer_Followup_Review_Fixes_For_Read_Gating_And_Script_Hardening.md

---
### 2026-04-17 | Lead Developer | GitHub Copilot (GPT-5.4) | Code Review Fixes For Events And Retry Anchor Preservation -- [Significant] [open-items: no]
**For next agent:** Terminal `/jobs/[id]` pages now hydrate the Events tab through `/api/fh/jobs/[id]/events/history` instead of relying on SSE replay, Stage 1 now protects valid anchor carriers for both retry- and repair-approved sets via `shouldProtectValidatedAnchorCarriers(...)`, the VS Code `build` task is repaired and lock-safe via `dotnet msbuild ... /t:Compile`, and `restart-clean.ps1` now clears stale API listeners so route-level browser checks hit current code. Verified live on completed job `ff97448210f8475faf6bf0c2eba921d4`: `/events/history` fetched once, `EventSource` opened zero times, and the Events tab rendered 55 entries.
→ Docs/AGENTS/Handoffs/2026-04-17_Lead_Developer_Code_Review_Fixes_For_Events_And_Retry_Anchor_Preservation.md


---
### 2026-04-17 | Lead Developer | Codex (GPT-5) | Asylum 235000 Prompt Generalization Follow-up -- [Standard] [open-items: yes]
**For next agent:** After user review, the new prompt rules were generalized away from asylum/current-administrative wording and reframed as a generic source-native compositional-evidence pattern: decisive propositions may be established either by one headline figure or by aligned component figures within one analytical window. Prompt storage was reseeded again from `d25a32e5...` to `e1403475...`; the focused prompt-contract suite still passes. No new live rerun was required for this wording-only generalization.
→ Docs/AGENTS/Handoffs/2026-04-17_Lead_Developer_Asylum_235000_Report_Review_Prompt_Stability_Fix.md

---
### 2026-04-17 | Lead Developer | Codex (GPT-5) | Asylum 235000 Report Review Prompt Stability Fix -- [Significant] [open-items: yes]
**For next agent:** Investigated bad job `09ce888778764cda9ddd53e06a68983a` (`UNVERIFIED | 47 | 32`) for the approved asylum input and confirmed it was a prompt-behavior stability failure, not prompt-rollout drift and not a Stage 5 aggregation bug. `claimboundary.prompt.md` is now hardened for current official aggregate claims: stronger `expectedEvidenceProfile`, umbrella-preserving queries, first-class extraction of same-timepoint partition counts, and verdict/narrative rules that allow compositional support instead of treating "no printed headline total" as automatic `UNVERIFIED`. Prompt storage was reseeded from `977aaac7...` to `d25a32e5...`; focused prompt tests and web build passed; fresh live rerun `93e4056f082047a69eb158a6b7aea243` finished `LEANING-TRUE | 68 | 47`.
→ Docs/AGENTS/Handoffs/2026-04-17_Lead_Developer_Asylum_235000_Report_Review_Prompt_Stability_Fix.md

---
### 2026-04-16 | Lead Developer + LLM Expert | Claude (Opus 4.7, 1M) | Report-Review Skill Systematic Review and Improvements -- [Significant] [open-items: yes]
**For next agent:** `/report-review` hardened end-to-end across four amendments: (1) initial systematic review (~17 edits, Phase 3i regression analysis); (2) 5-panel internal debate (17 more fixes, structural rubrics, sub-agent brief template); (3) cross-model GPT-5.4 review (7 more fixes — selector-validation gate, rule-9 self-contradiction, FH_RUNNER_MAX_CONCURRENCY env-var fix, Phase 8 HEAD-level overlap gate removed, role filter broadened); (4) quality-expectations extraction — new `Docs/AGENTS/report-quality-expectations.json` (31 Q-code checks + dimensionMap) referenced by skill, 12 new canonical Q-codes accepted (HF1/HF4/HF6 pre/post-gates; S1.1/S1.3/S1.6, EV5/EV6, V1/V6/V7, new Phase 3j stability with ST1–ST6). Still open: isolated reruns of Bundesrat-rechtskräftig + Plastic-en; annotation-dependent Q-codes (anchorTokens, minDistinctEvents, trueButMisleading, crossLanguageVariantOf) are inert until benchmark-expectations families gain those fields; two unrelated unit-test-drift failures; prompt rollout reseed pending; Phase 8 propose-only mode deferred per GPT review.
→ Docs/AGENTS/Handoffs/2026-04-16_Lead_Developer_LLM_Expert_Report_Review_Skill_Improvements.md

---
### 2026-04-16 | LLM Expert | GitHub Copilot (GPT-5.4) | Report Review Skill Review And Expectation Alignment -- [Standard] [open-items: yes]
**For next agent:** `/report-review` now has its concrete schema/config gaps closed: the Phase 1 SQL example uses `JobId`, slug scoping prefers exact matches with unique-prefix fallback only, the dead `MEMORY.md` reference is gone, `plastic-en` replaces the inconsistent `plastik-en` slug, and the missing WWII asylum benchmark input is now present in `AGENTS.md` and `.github/copilot-instructions.md`.
→ Docs/AGENTS/Handoffs/2026-04-16_LLM_Expert_Report_Review_Skill_Review_And_Expectation_Alignment.md

---
### 2026-04-16 | LLM Expert | GitHub Copilot (GPT-5.4) | Benchmark Report Quality Status Matrix -- [Standard] [open-items: yes]
**For next agent:** A new WIP doc now captures the current solved / partly solved / unresolved judgment for the Captain’s eight benchmark inputs, grounded in current live jobs and recent fixes. The highest-value remaining reruns are the exact WWII-comparison asylum variant, the Portuguese Bolsonaro variant on the final strongest backstop, and one fresh current-stack asylum `235 000` rerun with source inspection.
→ Docs/AGENTS/Handoffs/2026-04-16_LLM_Expert_Benchmark_Report_Quality_Status_Matrix.md

---
### 2026-04-16 | LLM Expert | GitHub Copilot (GPT-5.4) | Bolsonaro Foreign Assessment Backstop Verification -- [Standard] [open-items: yes]
**For next agent:** The stronger backstop is verified live. Prompt hash `af6ebf88...` removed all cited `state.gov` / U.S.-like evidence from Bolsonaro rerun `ec9840ff97994392a7ea9784beb5d79a`; compared with `a3ef...`, cited `state.gov` ids dropped from `7` to `0`. Residual risk: four uncited `state.gov`-domain items still survive in the evidence pool, so inspect source attribution if contamination reappears.
→ Docs/AGENTS/Handoffs/2026-04-16_LLM_Expert_Bolsonaro_Foreign_Assessment_Backstop_Verification.md

---
### 2026-04-16 | LLM Expert | GitHub Copilot (GPT-5.4) | Bolsonaro Foreign Assessment Leak Diagnosis And Applicability Prompt Fix -- [Standard] [open-items: yes]
**For next agent:** The old contamination fix is still present; the current leak was seeded-evidence applicability misclassification, not prompt rollout drift. Bad job `b48440718d3e4f428de5fbef8c2a45b3` cited seeded `state.gov` items `EV_021` and `EV_022` against `AC_01` and `AC_02`. `APPLICABILITY_ASSESSMENT` now explicitly keeps foreign government fair-trial/human-rights assessments as `foreign_reaction`, the prompt DB was reseeded to hash `3cacb809...`, focused tests are green, and verification rerun `d763f9507de4430681a471447b12d0fe` is still running.
→ Docs/AGENTS/Handoffs/2026-04-16_LLM_Expert_Bolsonaro_Foreign_Assessment_Leak_Diagnosis_And_Applicability_Prompt_Fix.md

---
### 2026-04-16 | LLM Expert | GitHub Copilot (GPT-5.4) | Analyzer Review Follow-up And Safe Suite Green -- [Standard] [open-items: yes]
**For next agent:** Addressed the two concrete review blockers by updating `llm-routing.test.ts` to Anthropic Sonnet 4.6 and `claimboundary-pipeline.test.ts` to expect the legitimate Stage 2 refinement pass (`main` + `refinement`, 5 mocked LLM calls). `npm test` is now green (`83 passed`, `1684 passed | 1 skipped`). Live Bundesrat rerun `b92201bb47454f7498a1919c4a82c567` completed `SUCCEEDED` with `MIXED | 48 | 72` and Gate 4 passed. I did **not** revert `24b26016`; on the current evidence that is a cleanup/scope decision, not a defect fix.
→ Docs/AGENTS/Handoffs/2026-04-16_LLM_Expert_Analyzer_Review_Followup_And_Safe_Suite_Green.md

---
### 2026-04-16 | LLM Expert | GitHub Copilot (GPT-5.4) | Stage 1 Repair Anchor Selection And Live Bundesrat Rerun -- [Standard] [open-items: yes]
**For next agent:** Stage 1 now has a salience-backed `selectRepairAnchorText(...)` helper and focused tests/build checks passed. Fresh live Bundesrat rerun `b92201bb47454f7498a1919c4a82c567` no longer dies at `UNVERIFIED 50/0`: SSE shows it clearing Pass 2, contract validation/repair, Gate 1, and entering Stage 2 research. The remaining nuance is that the live repair event still logs the broad clause anchor, so inspect the completed job’s final claim shape before deciding whether more Stage 1 tightening is needed.
→ Docs/AGENTS/Handoffs/2026-04-16_LLM_Expert_Stage1_Repair_Anchor_Selection_And_Live_Bundesrat_Rerun.md

---
### 2026-04-16 | Unassigned | Codex (GPT-5) | Daily Bug Scan State Recheck -- [Standard] [open-items: yes]
**For next agent:** No new git-level changes were visible on this rerun. `npm test` is still green, and the only remaining concrete issue is unchanged prompt/UCM drift: active `prompt/claimboundary` hash `977aaac7...` vs current file hash `db42b6c7...`.
→ Docs/AGENTS/Handoffs/2026-04-16_Unassigned_Daily_Bug_Scan_State_Recheck.md

---
### 2026-04-16 | Unassigned | Codex (GPT-5) | Daily Bug Scan Prompt Propagation Drift -- [Standard] [open-items: yes]
**For next agent:** Code/tests are green, but local runtime prompt state is stale: `apps/web/config.db` still has active `prompt/claimboundary` hash `977aaac7...` from `2026-04-16T15:43:12.915Z`, while the current `claimboundary.prompt.md` file hashes to `db42b6c7...` after later prompt commits. Reseed/build is required before local runs will use the new prompt text.
→ Docs/AGENTS/Handoffs/2026-04-16_Unassigned_Daily_Bug_Scan_Prompt_Propagation_Drift.md

---
### 2026-04-16 | Unassigned | Codex (GPT-5) | Daily Bug Scan Rerun After Analyzer Changes -- [Standard] [open-items: yes]
**For next agent:** The new Stage 1 anchor-selection patch (`24b26016`) passed its focused tests; the safe suite is still blocked only by the same two stale tests as before: Anthropic default-model drift in `llm-routing.test.ts:30` and pre-refinement search-count expectations in `claimboundary-pipeline.test.ts:3526`.
→ Docs/AGENTS/Handoffs/2026-04-16_Unassigned_Daily_Bug_Scan_Rerun_After_Analyzer_Changes.md

---
### 2026-04-16 | Unassigned | Codex (GPT-5) | Daily Bug Scan Analyzer Test Drift -- [Standard] [open-items: yes]
**For next agent:** Safe verification is currently blocked by two stale unit tests, not a confirmed new runtime bug: `llm-routing.test.ts:30` still expects Anthropic Sonnet 4.5 while `model-resolver.ts` now resolves Sonnet 4.6 by default, and `claimboundary-pipeline.test.ts:3526` still expects one Stage-2 search query even though `runResearchIteration(...)` now performs a legitimate refinement pass for the default metric-bearing fixture.
→ Docs/AGENTS/Handoffs/2026-04-16_Unassigned_Daily_Bug_Scan_Analyzer_Test_Drift.md

---
### 2026-04-16 | LLM Expert | GitHub Copilot (GPT-5.4) | Refinement Gate Restoration And Test Realignment -- [Standard] [open-items: yes]
**For next agent:** `claimNeedsPrimarySourceRefinement(...)` now matches the immediate pre-`308d00cf` gate again: no refinement when `expectedMetrics` is empty, the asylum-only fallback helper is gone, and the focused refinement + Stage 1 contract tests plus `tsc --noEmit` all passed. The next step is the live rerun of the three previously `UNVERIFIED` jobs.
→ Docs/AGENTS/Handoffs/2026-04-16_LLM_Expert_Refinement_Gate_Restoration_And_Test_Realignment.md

---
### 2026-04-16 | LLM Expert | GitHub Copilot (GPT-5.4) | Asylum Refinement Regression Fix -- [Standard] [open-items: yes]
**For next agent:** The asylum regression was traced to the new first-pass Stage 2 refinement branch, not to Stage 4 thresholds. `claimNeedsPrimarySourceRefinement(...)` now skips redundant refinement when a metric-bearing claim already has rich non-seeded institutional numeric coverage, and the focused `primary-source-refinement.test.ts` file passed with a new asylum-style regression case.
→ Docs/AGENTS/Handoffs/2026-04-16_LLM_Expert_Asylum_Refinement_Regression_Fix.md

---
### 2026-04-16 | LLM Expert | GitHub Copilot (GPT-5.4) | Stage 1 Contract Repair Prompt Hardening -- [Standard] [open-items: yes]
**For next agent:** `CLAIM_CONTRACT_REPAIR` now treats the anchor as possibly the original predicate itself, requires one thesis-direct non-proxy restatement, and keeps dimension claims predicate-faithful. Focused repair tests passed, but the hydrogen/Bundesrat regressions still need fresh live reruns and the broader Stage 1 suite still shows one unrelated Stage 2 query-count failure at `claimboundary-pipeline.test.ts:3526`.
→ Docs/AGENTS/Handoffs/2026-04-16_LLM_Expert_Stage1_Contract_Repair_Prompt_Hardening.md

---
### 2026-04-16 | LLM Expert | GitHub Copilot (GPT-5.4) | Stage 2 Review Fixes -- [Standard] [open-items: yes]
**For next agent:** The handed-over review findings were addressed on the current tree: refinement telemetry now records `rawEvidenceItems` and `iterationType` on the correct refinement entry, source-type-only claims can trigger refinement without `expectedMetrics`, WTT/WTW/LCA survive narrative highlighting, and the targeted Stage 2 + Stage 5 safe tests passed.
→ Docs/AGENTS/Handoffs/2026-04-16_LLM_Expert_Stage2_Review_Fixes.md

---
### 2026-04-16 | LLM Expert | GitHub Copilot (GPT-5.4) | Hydrogen Boundary And Asylum Refinement Followup -- [Standard] [open-items: yes]
**For next agent:** Hydrogen is now structurally separated into TTW/WTW on the live submitted run `a2e57bbb...`; asylum retrieval is improved through canonicalized source types and stricter primary-source refinement, but the queued live rerun `bc825742...` still needs confirmation and a future generic table-extraction step may be needed for one direct official aggregate total.
→ Docs/AGENTS/Handoffs/2026-04-16_LLM_Expert_Hydrogen_Boundary_And_Asylum_Refinement_Followup.md

---
### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Stage 2 Primary-Source Refinement Fresh Live Verification -- [Standard] [open-items: yes]
**For next agent:** Fresh approved-input rerun `ad4c0c1ba8bc4094849d2e3e9e0b1ef9` completed `SUCCEEDED` on commit `6bfffbba` with `LEANING-TRUE | 60 | 60`, source count back to `24`, and focus counts `preliminary=2`, `main=3`, `contradiction=3`, `contrarian=2`, `refinement=0`. `claimAcquisitionLedger.AC_01` still has no refinement entry and all `laneReason` values are empty, so the live refinement branch still did not activate; the 2025 SEM archive page/PDF are also still absent.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Stage2_Primary_Source_Refinement_Fresh_Live_Verification.md

---
### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Stage 2 Primary-Source Refinement Rerun After Review Follow-up -- [Standard] [open-items: yes]
**For next agent:** The fresh approved-input rerun is complete and still shows no stored refinement activation. Job `6aa4dc3e2c2d46f99fe83544b214c546` finished `SUCCEEDED` with focus counts `preliminary=2`, `main=3`, `contradiction=3`, `refinement=0`; `claimAcquisitionLedger.AC_01` has only `main` and `contradiction` iterations with empty `laneReason`. Compared with earlier current-code run `141cfe945d8540caaddb970d271317f2`, this rerun also regressed in persisted official-source breadth: 13 sources instead of 24 and no 2025 SEM archive page.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Stage2_Primary_Source_Refinement_Rerun_After_Review_Followup.md

---
### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Stage 2 Primary-Source Refinement Review Follow-up -- [Standard] [open-items: yes]
**For next agent:** The review follow-up is now landed. The prompt explicitly maps `expectedSourceTypes` to retrieval lanes, refinement metadata omission now warns at runtime, refinement writes separate claim-acquisition telemetry via `laneReason`, and the focused Stage 2 guard-case tests were expanded. Focused tests and full web build both passed after a small build-only `NonNullable<...>` typing fix in `research-orchestrator.ts`.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Stage2_Primary_Source_Refinement_Review_Followup.md

---
### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Stage 2 Primary-Source Refinement Regression Check -- [Standard] [open-items: yes]
**For next agent:** Two live runs were completed for the approved asylum input after landing the Stage 2 refinement slice. Result: partial retrieval improvement only. Baseline remained `0/6` exact 2025 commentary-PDF hits; current runs are `0/2` exact PDF hits, `1/2` persisted 2025 archive-page hits, and `0/2` `refinement` query activations. The implementation also needed a small compatibility fix: `research-orchestrator.ts` now initializes `researchedIterationsByClaim` defensively, and `generateResearchQueries(...)` only emits retrieval metadata when the LLM actually returns it.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Stage2_Primary_Source_Refinement_Regression_Check.md

---
### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Stage 2 Primary-Source Refinement Implementation -- [Standard] [open-items: yes]
**For next agent:** The low-risk retrieval slice is now implemented in Stage 2. Query generation returns `retrievalLane`/`freshnessWindow`, the orchestrator can spend one bounded first-pass `refinement` query when only seeded or secondary coverage exists for metric-bearing primary-evidence claims, and freshness-sensitive searches can bypass stale cache entries. Targeted Vitest coverage and `npm -w apps/web run build` both passed.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Stage2_Primary_Source_Refinement_Implementation.md

---
### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Asylum 235000 Evidence Gap Investigation -- [Standard] [open-items: yes]
**For next agent:** The recent `235 000` asylum-family runs are missing the SEM 2025 commentary PDF upstream of verdicting. The target job `7333cb1f1ee6472b9c782e94e4aa7b0e` and the five newest comparators never include `stat-jahr-2025-kommentar...` in `resultJson.sources`, even though the SEM 2025 archive page explicitly links it. Current diagnosis: broad query generation + 8-result search budget + top-5 fetch cap + occasional 7-day cached search results steer the pipeline toward NZZ, press releases, generic SEM landing pages, and older PDFs instead of the direct annual-total source.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Asylum_235000_Evidence_Gap_Investigation.md

---
### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Validator-Side Success-False Fallback Test -- [Standard] [open-items: no]
**For next agent:** The last missing Phase 7b `success=false` verification seam is now covered. `claimboundary-pipeline.test.ts` includes a validator-side behavioral test proving that binding mode with `success=false` still falls back to base validator behavior while passing the failed-binding context into `CLAIM_CONTRACT_VALIDATION_BINDING_APPENDIX`.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Validator_Side_Success_False_Fallback_Test.md

---
### 2026-04-15 | Unassigned | Codex (GPT-5) | LLM Prompt System Explanation -- [Standard] [open-items: yes]
**For next agent:** The prompt-system walkthrough now exists as `Docs/WIP/2026-04-15_LLM_Prompt_System_Explanation.md`. It includes the high-level DB-first/UCM flow, ClaimBoundary runtime section loading, provenance path, and the current SR/inverse-check exceptions.
→ Docs/AGENTS/Handoffs/2026-04-15_Unassigned_LLM_Prompt_System_Explanation.md

---
### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Phase 7b Success-False Coverage And Two Canaries -- [Standard] [open-items: yes]
**For next agent:** The minimal `success=false` verification slice is now executed: a Pass 2 prompt-contract assertion and a Pass 2 runtime-plumbing test were added, focused Stage 1 tests passed (`390 passed | 1 skipped`), prompt reseeding/build passed, and the two Captain-approved Bundesrat canaries both succeeded on the current commit.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Phase7b_Success_False_Coverage_And_Two_Canaries.md

---
### 2026-04-15 | Unassigned | Codex (GPT-5) | Prompt System Architecture Issues Report -- [Standard] [open-items: yes]
**For next agent:** The prompt-system findings are now written up in `Docs/WIP/2026-04-15_Prompt_System_Architecture_Issues_Report.md` and linked from backlog item `PROMPT-ARCH-1`. Core issue: ClaimBoundary is UCM-backed and coherent, but SR core evaluation, the inverse-check micro-prompt, and the stale `text-analysis` profile/docs still do not follow one truthful prompt-governance model.
→ Docs/AGENTS/Handoffs/2026-04-15_Unassigned_Prompt_System_Architecture_Issues_Report.md

---
### 2026-04-15 | Unassigned | Codex (GPT-5) | Explain Code LLM Prompts -- [Standard] [open-items: yes]
**For next agent:** Prompt architecture explanation is now grounded in the live runtime path. ClaimBoundary and the input-policy gate are DB-first/UCM-backed via `config-loader` and `prompt-loader`, but source reliability still uses `sr-eval-prompts.ts` for core evaluation and `paired-job-audit.ts` still reads its inverse-check prompt directly from disk.
→ Docs/AGENTS/Handoffs/2026-04-15_Unassigned_Explain_Code_LLM_Prompts.md

---
### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Captain-Defined Analysis Inputs Rule -- [Standard] [open-items: yes]
**For next agent:** `AGENTS.md` now explicitly forbids inventing or paraphrasing analysis inputs and lists the current Captain-approved inputs. `.github/copilot-instructions.md` was synced to carry the same rule for Copilot workspace guidance.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Captain_Defined_Analysis_Inputs_Rule.md

---
### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Phase 7b Overlap Check And Plan Rebase -- [Standard] [open-items: yes]
**For next agent:** The prompt-only slice described in the April 15 charter is already landed in the live prompt file. Current local verification passed for `claim-extraction-prompt-contract.test.ts`, `claim-contract-validation.test.ts`, and `claimboundary-pipeline.test.ts` (3 files, 389 tests passed, 1 skipped). The charter was rebased: do not reopen the prompt edits; remaining work is optional `success=false` coverage tightening plus prompt reseed and minimum canary spot-checks if fresh live validation is desired.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Phase7b_Overlap_Check_And_Plan_Rebase.md

---
### 2026-04-15 | Lead Architect + Senior Developer + Code Reviewer | GitHub Copilot (GPT-5.4) | Phase 7b Charter Debate Consolidation -- [Standard] [open-items: yes]
**For next agent:** Review-board pass converged on approve-with-changes. The Phase 7b charter remains valid, but it was tightened to reflect current repo state and reviewer concerns: the slice is now explicitly prompt-and-focused-test, `success=false` handling is framed as tighten-and-verify rather than missing-from-zero, and runtime appendix-loading changes remain a separate debated follow-up unless focused tests prove them necessary.
→ Docs/AGENTS/Handoffs/2026-04-15_Review_Board_Phase7b_Charter_Debate_Consolidation.md

---
### 2026-04-15 | Code Reviewer | Codex (GPT-5) | Skeptical Review Of Proposed Prompt Fixes -- [Standard] [open-items: yes]
**For next agent:** The April 14/15 prompt-fix proposals are mostly governance-safe, but `ISSUE-14` as written assumes nonexistent output/runtime state; `ISSUE-06`, `ISSUE-07`, and `ISSUE-18` are not prompt-only; and any Opus/model-tier escalation would hit shared task routes unless a new salience-specific task key is introduced.
→ Docs/AGENTS/Handoffs/2026-04-15_Code_Reviewer_Prompt_Fixes_Skeptical_Review.md

---
### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Phase 7b Prompt-Blocker Charter -- [Standard] [open-items: yes]
**For next agent:** A new WIP execution charter now exists for the first bounded Phase 7b slice. It keeps the review note intact and scopes implementation to the three prompt-only blockers already validated on current code and current-build jobs: thesis-direct precedence in the validator, explicit `success=false` handling in both binding appendices, and explicit single-source anchor audit in the binding validator.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Phase7b_Prompt_Blocker_Charter.md

### 2026-04-15 | LLM Expert | Codex (GPT-5) | Phase 7 Prompt-Quality Issue Investigation -- [Standard] [open-items: yes]
**For next agent:** Static review confirms four live areas: rule-11 thesis-direct/verbatim mismatch, missing `success=false` semantics in both binding appendices, binding-validator override ambiguity, and real-but-deferred salience-definition drift. Salience model tiering is not an accidental miswire; it is intentionally on `getModelForTask("understand")` and should only change via an explicit config/task decision.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Phase7_Prompt_Quality_Issue_Investigation.md

---
### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Prompt Audit Validation Review -- [Standard] [open-items: yes]
**For next agent:** The 2026-04-14 prompt audit was revalidated against the live prompt/runtime. ISSUE-01, ISSUE-14, ISSUE-15, and ISSUE-06 are confirmed exactly where reported. ISSUE-02 is also real but should stay deferred under the current E2 freeze because it touches CLAIM_SALIENCE_COMMITMENT. Highest-value next move is prompt-only work in apps/web/prompts/claimboundary.prompt.md plus focused tests for binding mode with salience success false.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Prompt_Audit_Validation_Review.md

---
### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Prompt Caching Debate Consolidation -- [Standard] [open-items: yes]
**For next agent:** The Anthropic caching proposal was consolidated into a phased recommendation: do not touch claimboundary-pipeline.ts, patch the two uncached grounding-check calls if implementation is desired, and defer any broad prompt-boundary refactor unless measured Anthropic cost telemetry justifies it. Main technical finding: the core stages already use getPromptCachingOptions(), but cache payoff is muted because dynamic job payload is rendered into system prompts.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Prompt_Caching_Debate_Consolidation.md

---
### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Grounding Prompt Caching Implementation And Review -- [Standard] [open-items: yes]
**For next agent:** The narrow grounding-check caching patch is now implemented and verified. `grounding-check.ts` uses `getPromptCachingOptions()` on both LLM calls, the grounding-check unit tests were updated to cover the new `providerOptions` path, `npm -w apps/web run build` passed, and the targeted grounding-check Vitest file passed. Final review found no regression in the caching change; only pre-existing grounding-check issues remain.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Grounding_Prompt_Caching_Implementation_And_Review.md

---
### 2026-04-14 | LLM Expert | Claude Sonnet 4.6 (Cowork) | Full Codebase Prompt Audit — 18 Issues, 4 Phase 7b Blockers Identified -- [Significant] [open-items: yes]
**For next agent:** All 5 prompt files and all inline prompt content were reviewed. 18 issues found across 7 categories. 4 are Phase 7b / Shape B pre-launch blockers: (1) CONTRACT_VALIDATION literal-substring rule must be tightened to only accept thesis-direct claims as anchor carriers (ISSUE-01); (2) PASS2_BINDING_APPENDIX needs salience-failure-mode handling defined (ISSUE-14); (3) VALIDATION_BINDING_APPENDIX needs an override notice so the base anchor-discovery rules don't compete with the precommitted anchor list (ISSUE-15); (4) SALIENCE_COMMITMENT anchor definition should be aligned with the validator's truth-condition test (ISSUE-02). High-value non-blocker: inline FACT_CHECK_CONTEXT and retry guidance text should be moved into the prompt system (ISSUE-06). IMPORTANT: do NOT touch CLAIM_SALIENCE_COMMITMENT or CLAIM_EXTRACTION_PASS2 before the next E2 measurement batch closes.
→ Docs/AGENTS/Handoffs/2026-04-14_LLM_Expert_Prompt_Review_and_Improvement_Proposals.md

---
### 2026-04-14 | Lead Developer + Lead Architect | Codex (GPT-5) | Phase 7 Final Reviewer Constraints Folded Into Plan -- [Standard] [open-items: yes]
**For next agent:** A final external reviewer agreed with the Shape B direction but required stricter slice-1 constraints. `Docs/WIP/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md` now reflects that Shape B is a go only with explicit mode separation, full salience persistence, durable recovery attribution, validator precedence cleanup, and typed anchor mapping in the first implementation slice.
→ Docs/AGENTS/Handoffs/2026-04-14_lead_developer_lead_architect_phase_7_final_reviewer_constraints_folded_into_plan.md

---
### 2026-04-14 | Lead Developer + Lead Architect | Codex (GPT-5) | Phase 7 Docs Corrected For Shape B Start Signal -- [Standard] [open-items: yes]
**For next agent:** The Phase 7 docs were corrected to separate three things clearly: (1) the first deep review’s still-valid architectural reasoning, (2) the blockers materially fixed in `61815f41`, and (3) the remaining honesty gap that the current E2 note is not a locally reproduced committed-build statistical closeout. Current architect position: proceed to Phase 7b / Shape B behind a feature flag, but do not overstate the current measurement note.
→ Docs/AGENTS/Handoffs/2026-04-14_lead_developer_lead_architect_phase_7_docs_corrected_for_shape_b_start_signal.md

---
### 2026-04-14 | Lead Developer + Lead Architect | Codex (GPT-5) | Phase 7 Working Baseline Consolidated Through Step 4 -- [Standard] [open-items: yes]
**For next agent:** `Docs/WIP/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md` was rewritten into a shorter Phase 7 working baseline for humans and agents. It now carries the durable Step 1 summary, Step 2 root-cause summary, Step 3 root fixes/specification, and Step 4 implementation/verification plan. Code/prompt-specific detail remains in `Docs/WIP/2026-04-14_Phase7_Code_and_Prompt_Deep_Review.md`. Next step is the hardened-surface E2 measurement report.
→ Docs/AGENTS/Handoffs/2026-04-14_lead_developer_lead_architect_phase_7_working_baseline_consolidated_through_step_4.md

---
### 2026-04-14 | Lead Developer + Lead Architect | Codex (GPT-5) | Phase 7 Code / Prompt Deep Review And Debate Consolidation -- [Standard] [open-items: yes]
**For next agent:** Use `Docs/WIP/2026-04-14_Phase7_Code_and_Prompt_Deep_Review.md` as the current code/prompt review note for Phase 7. It consolidates direct code inspection plus a two-reviewer debate and concludes that E2 is still worth measuring, but only as an anchor-recognition audit unless the measurement surface is tightened.
→ Docs/AGENTS/Handoffs/2026-04-14_lead_developer_lead_architect_phase_7_code_prompt_deep_review_debate_consolidation.md

---
### 2026-04-14 | Lead Developer + Lead Architect | Codex (GPT-5) | Phase 7 Step 2 Issues / Root Causes Consolidation -- [Standard] [open-items: yes]
**For next agent:** `Docs/WIP/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md` now contains both Step 1 and Step 2. The summary tables were rewritten after two reviewer-agent challenges: explicit `Pain/Need/Expectation`, explicit provenance, explicit confidence/caveat, plus Step 2 root-cause tables separating proven causes from hypotheses. Next step is Step 3: root fixes and specification.
→ Docs/AGENTS/Handoffs/2026-04-14_lead_developer_lead_architect_phase_7_step_2_issues_root_causes_consolidation.md

---
### 2026-04-14 | Lead Developer + Lead Architect | Codex (GPT-5) | Phase 7 Step 1 Pains / Issues / Needs Consolidation -- [Standard] [open-items: yes]
**For next agent:** Use `Docs/WIP/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md` as the Step 1 source of truth. It consolidates current HEAD job evidence, direct user statements preserved in docs, and the earlier Bundesrat expectation trail (`094e88fc`, `0afb2d88`, `b843fe70`) while explicitly separating proven facts from inference. Next step is Step 2: root causes and specification ambiguities.
→ Docs/AGENTS/Handoffs/2026-04-14_lead_developer_lead_architect_phase_7_step_1_pains_issues_needs_consolidation.md

---
### 2026-04-13 | LLM Expert | Claude Code (Opus 4.6) | Trim root AI-instruction files -- [Significant] [open-items: yes]
**For next agent:** Full context in `Docs/AGENTS/Handoffs/2026-04-13_LLM_Expert_Root_Instruction_File_Trim.md`. Code Reviewer approved with one staging fix and two non-blocking notes. To extend handoff protocol, edit `Docs/AGENTS/Policies/Handoff_Protocol.md` directl...
→ Docs/AGENTS/Handoffs/2026-04-13_LLM_Expert_Root_Instruction_File_Trim.md

---
### 2026-04-17 | Senior Developer + LLM Expert | GitHub Copilot (GPT-5.4) | Bundesrat Live Rerun And Jobs Page SSE Gating -- [Significant] [open-items: yes]
**For next agent:** The dominant Bundesrat hard-failure mode is fixed end-to-end: Stage 1 repair-approved anchor carriers are preserved, the `/jobs/[id]` page now waits for `job.status` and only subscribes to SSE for active jobs, and fresh local rerun `a2642a8d42ac4149a5fef7d10529a777` completed `SUCCEEDED` with a full report (`LEANING-TRUE | 71 | 79`, 43 evidence items, 5 boundaries). Remaining open question is calibration, not collapse.
→ Docs/AGENTS/Handoffs/2026-04-17_Senior_Developer_LLM_Expert_Bundesrat_Live_Rerun_And_Jobs_Page_SSE_Gating.md

---

### 2026-04-11 | Lead Architect + LLM Expert | Claude Opus 4.6 (1M) | Phase 2 Gate G2 Rev 4 Approved — Execution Beginning -- [Standard] [open-items: yes]
**For next agent:** Phase 2 execution begins immediately after the commit sequence lands. If the replay results land cleanly (no stop-rule triggers, no quota issues, statistically separable deltas per per-input criteria), Phase 3 Change Impact Ledger is the next step...
→ Docs/AGENTS/Handoffs/2026-04-11_lead_architect_llm_expert_phase_2_gate_g2_rev_4_approved_exe.md

---

### 2026-04-11 | Lead Architect + LLM Expert | Claude Opus 4.6 (1M) | Report Quality Restoration — Master Plan + Phase 1 Complete -- [Standard] [open-items: yes]
**For next agent:** Wait for Gate G1 answers from the user. Once received: begin Phase 2 (Historical Baseline Map) by (1) inventorying validation artefacts in `apps/web/test/output/` and `test-output/validation/`, (2) building the run-to-commit map, (3) presenting th...
→ Docs/AGENTS/Handoffs/2026-04-11_lead_architect_llm_expert_report_quality_restoration_master.md

---

### 2026-04-11 | Lead Developer | Cline | Claim Clarification Gate Design Review -- [Standard] [open-items: yes]
**For next agent:** Start Phase 1 with low-risk, unit-testable seams: add `clarificationAssessment` to Pass 2 schema + prompt contract tests, add `isClaimAnalyzable` as a pure helper with parity tests against current Gate 1 outcomes, then add `evaluateClarificationGa...
→ Docs/AGENTS/Handoffs/2026-04-11_lead_developer_claim_clarification_gate_design_review.md

---

### 2026-04-10 | Lead Architect | Codex (GPT-5) | Rev B Tightened After Lead Developer Review -- [Significant] [open-items: yes]
**For next agent:** Use Rev B directly as the implementation source of truth. The Lead Developer's required tightenings are now incorporated into the plan rather than living only in review commentary.
→ Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Report_Quality_Implementation_Plan_RevB.md

---

### 2026-04-10 | Lead Architect | Codex (GPT-5) | Rev B Prepared For Lead Developer Review -- [Significant] [open-items: yes]
**For next agent:** Use `Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Report_Quality_Implementation_Plan_RevB.md` directly for Lead Developer review.
→ Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Report_Quality_Implementation_Plan_RevB.md

---

### 2026-04-10 | Lead Architect | Codex (GPT-5) | Report Quality Implementation Plan Rev B -- [Significant] [open-items: yes]
**For next agent:** Use `Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Report_Quality_Implementation_Plan_RevB.md` as the implementation source of truth.
→ Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Report_Quality_Implementation_Plan_RevB.md

---

### 2026-04-10 | Lead Architect + Senior Developer | Codex (GPT-5) | Implementation Refresh Review -- [Significant] [open-items: yes]
**For next agent:** Full review in `Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Implementation_Refresh_Review.md`.
→ Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Implementation_Refresh_Review.md

---

### 2026-04-10 | Lead Architect | GitHub Copilot (GPT-5.4) | Handoff Status Update After Implementation -- [Significant] [open-items: yes]
**For next agent:** Start from the updated deep investigation handoff. It now separates implemented code changes from still-open validation and UI/trust work.
→ Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Report_Quality_Deep_Investigation.md

---

### 2026-04-10 | Lead Architect | GitHub Copilot (GPT-5.4) | Factual Correction Propagation -- [Significant] [open-items: yes]
**For next agent:** If another agent starts from the consolidated plan, review board, or current-state handoff instead of the deep investigation, they will now see the corrected factual baseline on the retry path and the Wave 2B seam.
→ Docs/AGENTS/Handoffs/2026-04-10_Report_Quality_Consolidated_Review_Plan.md

---

### 2026-04-10 | Lead Architect | GitHub Copilot (GPT-5.4) | LLM Expert Review Incorporation -- [Significant] [open-items: yes]
**For next agent:** Use the revised handoff as the current source of truth. The document now reflects both the architect consolidation and the LLM Expert's empirical refinements.
→ Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Report_Quality_Deep_Investigation.md

---

### 2026-04-10 | Lead Architect | GitHub Copilot (GPT-5.4) | Review-Ready Plan Consolidation -- [Significant] [open-items: yes]
**For next agent:** Use `Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Report_Quality_Deep_Investigation.md` as the review-ready source of truth for this task. Supporting April 10 handoffs remain relevant only for deeper evidence.
→ Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Report_Quality_Deep_Investigation.md

---

### 2026-04-10 | Review Board: Lead Architect + Senior Developer + LLM Expert + Adversarial Reviewer | GitHub Copilot (GPT-5.4) | Multi-Agent Review Board Consolidation -- [Significant] [open-items: yes]
**For next agent:** Use `Docs/AGENTS/Handoffs/2026-04-10_Report_Quality_Multi_Agent_Review_Board.md` as the latest review-board source of truth. Use the earlier April 10 handoffs only as supporting evidence.
→ Docs/AGENTS/Handoffs/2026-04-10_Report_Quality_Multi_Agent_Review_Board.md

---

### 2026-04-10 | Lead Architect + Senior Developer + LLM Expert | GitHub Copilot (GPT-5.4) | Consolidated Review Plan -- [Significant] [open-items: yes]
**For next agent:** Use `Docs/AGENTS/Handoffs/2026-04-10_Report_Quality_Consolidated_Review_Plan.md` as the review-ready source of truth. Fall back to the supporting April 10 handoffs only for raw evidence or deeper rationale.
→ Docs/AGENTS/Handoffs/2026-04-10_Report_Quality_Consolidated_Review_Plan.md

---

### 2026-04-10 | LLM Expert | GitHub Copilot (GPT-5.4) | Empirical Addendum On Four Same-Input Runs -- [Significant] [open-items: yes]
**For next agent:** Read `Docs/AGENTS/Handoffs/2026-04-10_LLM_Expert_Report_Quality_Prompt_And_Behavior_Investigation_Empirical_Addendum.md` after the original LLM handoff. Use the addendum as the current source of truth on F2, the retry path, and the recommended min...
→ Docs/AGENTS/Handoffs/2026-04-10_LLM_Expert_Report_Quality_Prompt_And_Behavior_Investigation_Empirical_Addendum.md

---

### 2026-04-10 | Lead Architect + Senior Developer | GitHub Copilot (GPT-5.4) | Current-State Report Quality Investigation -- [Significant] [open-items: yes]
**For next agent:** Start with `Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Current_State_Report_Quality_Investigation.md`. Highest-value first move is P0 final-claim contract enforcement in Stage 1, then P2 matrix honesty cleanup, then a removal-...
→ Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Current_State_Report_Quality_Investigation.md

---

### 2026-04-10 | Lead Architect + Senior Developer | Codex (GPT-5) | Report Quality Deep Investigation -- [Significant] [open-items: yes]
**For next agent:** (no For-next-agent field)
→ Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Report_Quality_Deep_Investigation.md

---

### 2026-04-10 | Lead Architect + Senior Developer | Codex (GPT-5) | Overarching Report Quality Investigation -- [Significant] [open-items: yes]
**For next agent:** Full report and implementation plan in `Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Overarching_Report_Quality_Investigation.md`. If implementing, start with the Stage-1 contract-acceptance fix and the Coverage Matrix semantic ...
→ Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Overarching_Report_Quality_Investigation.md

---

### 2026-04-10 | LLM Expert | Claude Opus 4.6 (1M) | Report Quality — Prompt & LLM-Behavior Investigation -- [Significant] [open-items: yes]
**For next agent:** Start at F1, F2, F3 in the handoff. NP1 (control-flow branch) + NP2 (Gate 1 anchor data flow) + PR3 (Gate 1 anchor exemption) is the smallest combined change that fixes the user's primary complaint without adding new prompt scar tissue. Phase orde...
→ Docs/AGENTS/Handoffs/2026-04-10_LLM_Expert_Report_Quality_Prompt_And_Behavior_Investigation.md

---

### 2026-04-10 | Senior Developer | Claude Code (Opus 4.6) | Option G Live Validation -- [Significant] [open-items: yes]
**For next agent:** Full report at `Docs/AGENTS/Handoffs/2026-04-10_Senior_Developer_Option_G_Validation_Report.md`. Recommendation: GO for promotion review.
→ Docs/AGENTS/Handoffs/2026-04-10_Senior_Developer_Option_G_Validation_Report.md

---

### 2026-04-10 | Lead Architect + LLM Expert | Claude Opus 4.6 (1M) | Claim Clarification Gate — Design for FR1.x -- [Standard] [open-items: yes]
**For next agent:** Lead Developer should read `Docs/WIP/2026-04-10_Claim_Clarification_Gate_Design.md` end-to-end, focus on §6 (pipeline orchestration), §5 (data model), §7 (API surface), and §16 (file list). Produce a Phase 1 implementation plan starting with the s...
→ Docs/AGENTS/Handoffs/2026-04-10_lead_architect_llm_expert_claim_clarification_gate_design_fo.md

---

### 2026-04-10 | Lead Architect | GitHub Copilot (GPT-5.4) | Architect Review Recheck Against Current Source -- [Standard] [open-items: yes]
**For next agent:** Treat the architect review as substantively accurate. The strongest remaining gaps are report-honesty in the matrix and missing directness context in contract validation, not a re-opened silent fail-open bug.
→ Docs/AGENTS/Handoffs/2026-04-10_lead_architect_architect_review_recheck_against_current_sour.md

---

### 2026-04-10 | Lead Architect | GitHub Copilot (GPT-5.4) | Seven-Run Contract Failure Review -- [Standard] [open-items: yes]
**For next agent:** Start with `Docs/Investigations/2026-04-10_Claim_Contract_Run_Review.md`. The key implementation target is the whole-anchor substring requirement inside `evaluateClaimContractValidation(...)`, which is over-rejecting coordinated actor decompositions.
→ Docs/AGENTS/Handoffs/2026-04-10_lead_architect_seven_run_contract_failure_review.md

---

### 2026-04-09 | LLM Expert | Claude Code (Opus 4.6) | Bolsonaro Evidence-Mix Regression Investigation -- [Significant] [open-items: yes]
**For next agent:** See full handoff at `Docs/AGENTS/Handoffs/2026-04-09_LLM_Expert_Bolsonaro_Evidence_Mix_Regression_Investigation.md`. Core follow-up: RELEVANCE_CLASSIFICATION / APPLICABILITY_ASSESSMENT prompt policy for historical precedent.
→ Docs/AGENTS/Handoffs/2026-04-09_LLM_Expert_Bolsonaro_Evidence_Mix_Regression_Investigation.md

---

### 2026-04-09 | Lead Architect + LLM Expert | Codex (GPT-5) | Dominant Claim Plan Marked Ready For Implementation Review -- [Significant] [open-items: yes]
**For next agent:** Use `Docs/AGENTS/Handoffs/2026-04-09_Lead_Architect_LLM_Expert_Dominant_Claim_Implementation_Plan_RevA.md` as the authoritative implementation-review artifact.
→ Docs/AGENTS/Handoffs/2026-04-09_Lead_Architect_LLM_Expert_Dominant_Claim_Implementation_Plan_RevA.md

---

### 2026-04-09 | Lead Architect + LLM Expert | Codex (GPT-5) | Dominant Claim Plan Tightening After Senior Developer Review -- [Significant] [open-items: yes]
**For next agent:** Use the updated Rev A handoff, not the earlier April 9 snapshot. The current review-ready plan now contains the predicate, gating, and multiplier policy requested by the Senior Developer review.
→ Docs/AGENTS/Handoffs/2026-04-09_Lead_Architect_LLM_Expert_Dominant_Claim_Implementation_Plan_RevA.md

---

### 2026-04-09 | Lead Architect + LLM Expert | Codex (GPT-5) | Dominant Claim Plan Revision For Re-Review -- [Significant] [open-items: yes]
**For next agent:** Review `Docs/AGENTS/Handoffs/2026-04-09_Lead_Architect_LLM_Expert_Dominant_Claim_Implementation_Plan_RevA.md` as the current implementation plan. Older April 8 handoffs are now background context, not the final execution order.
→ Docs/AGENTS/Handoffs/2026-04-09_Lead_Architect_LLM_Expert_Dominant_Claim_Implementation_Plan_RevA.md

---

### 2026-04-09 | Lead Architect | Codex (GPT-5) | Deterministic Analysis Hotspots Review -- [Standard] [open-items: yes]
**For next agent:** Start with `Docs/WIP/2026-04-09_Deterministic_Analysis_Hotspots_Review.md`. If this work is picked up, prioritize Stage 1 anchor preservation and Stage 4 direction rescue before lower-severity routing/quality labels.
→ Docs/AGENTS/Handoffs/2026-04-09_lead_architect_deterministic_analysis_hotspots_review.md

---

### 2026-04-09 | Lead Architect + LLM Expert | Claude Code (Opus 4.6) | Option G Review Incorporation -- [Standard] [open-items: yes]
**For next agent:** Full reviewed design at `Docs/WIP/2026-04-09_LLM_Led_Article_Adjudication_Redesign.md`. Section 7 has the review findings table. Section 8 has the migration path. Start with Phase 1 (tests + types + config).
→ Docs/AGENTS/Handoffs/2026-04-09_lead_architect_llm_expert_option_g_review_incorporation.md

---

### 2026-04-09 | Lead Architect + LLM Expert | Claude Code (Opus 4.6) | Stage-5 LLM-Led Article Adjudication Redesign -- [Standard] [open-items: yes]
**For next agent:** Full design at `Docs/WIP/2026-04-09_LLM_Led_Article_Adjudication_Redesign.md`. Option G is section 5. Review questions below in the GPT Lead Architect review request.
→ Docs/AGENTS/Handoffs/2026-04-09_lead_architect_llm_expert_stage_5_llm_led_article_adjudicati.md

---

### 2026-04-09 | Lead Architect | Codex (GPT-5) | Review Option G LLM-Led Article Adjudication -- [Standard] [open-items: yes]
**For next agent:** If implementing Option G, refine the conflict predicate before coding: use verdict bands or a minimum margin/confidence rule so borderline mixed claims do not trigger adjudication. Prefer a single cap of `30` on the conflict path unless live valid...
→ Docs/AGENTS/Handoffs/2026-04-09_lead_architect_review_option_g_llm_led_article_adjudication.md

---

### 2026-04-08 | Lead Architect + LLM Expert | Codex (GPT-5) | Dominant Claim Debate Consolidation -- [Significant] [open-items: yes]
**For next agent:** Main decision record: `Docs/AGENTS/Handoffs/2026-04-08_Lead_Architect_LLM_Expert_Dominant_Claim_Debate_Consolidation.md`. Use Swiss target `11a8f75c...`, Swiss sibling `67a3d07d...`, hydrogen `a0c5e51e...`, and plastic control `70a3963c...` as the...
→ Docs/AGENTS/Handoffs/2026-04-08_Lead_Architect_LLM_Expert_Dominant_Claim_Debate_Consolidation.md

---

### 2026-04-08 | Lead Architect | GitHub Copilot (GPT-5.4) | Quality Plan Hardening Review -- [Significant] [open-items: yes]
**For next agent:** See `Docs/AGENTS/Handoffs/2026-04-08_Lead_Architect_Quality_Plan_Hardening_Review.md`.
→ Docs/AGENTS/Handoffs/2026-04-08_Lead_Architect_Quality_Plan_Hardening_Review.md

---

### 2026-04-08 | Lead Architect + LLM Expert | Codex (GPT-5) | Dominant Claim Aggregation Investigation -- [Significant] [open-items: yes]
**For next agent:** Read `Docs/AGENTS/Handoffs/2026-04-08_Lead_Architect_Dominant_Claim_Aggregation_Investigation.md` and implement Phase 1 there first: dominance assessment output, dominance-aware aggregate, persisted observability, then the narrative/adjudication p...
→ Docs/AGENTS/Handoffs/2026-04-08_Lead_Architect_Dominant_Claim_Aggregation_Investigation.md

---

### 2026-04-08 | Code Reviewer | GitHub Copilot (GPT-5.4) | Post-Approval Low-Finding Cleanup -- [Standard] [open-items: yes]
**For next agent:** This cleanup is naming/formatting only; behavior was verified unchanged with the focused verdict-stage tests and a successful web build.
→ Docs/AGENTS/Handoffs/2026-04-08_code_reviewer_post_approval_low_finding_cleanup.md

---

### 2026-04-08 | Lead Architect | GitHub Copilot (GPT-5.4) | Code Review Blockers Resolved -- [Standard] [open-items: yes]
**For next agent:** If further review follows, validate the new aggregation baseline with fresh jobs rather than stale stored results. The semantic contracts restored here are covered by targeted tests in `verdict-stage.test.ts` and `claimboundary-pipeline.test.ts`.
→ Docs/AGENTS/Handoffs/2026-04-08_lead_architect_code_review_blockers_resolved.md

---

### 2026-04-08 | Senior Developer | Claude Code (Opus 4.6) | Complete Quality Assessment — Revised Per LLM Expert Review -- [Standard] [open-items: yes]
**For next agent:** The schema fix target is `claim-extraction-stage.ts:1655` — add `truthConditionAnchor` and `antiInferenceCheck` to `ClaimContractOutputSchema`, then wire the retry logic to read them. Full plan: `Docs/WIP/2026-04-08_Complete_Quality_Assessment_and...
→ Docs/AGENTS/Handoffs/2026-04-08_senior_developer_complete_quality_assessment_revised_per_llm.md

---

### 2026-04-08 | Senior Developer | Claude Code (Opus 4.6) | Fix 1 Strengthened Measurement — Modifier Preservation Still Failing + CH Regression -- [Standard] [open-items: yes]
**For next agent:** Full measurement data in this entry. The decision is: revert the strengthening, keep the first Fix 1 (which had anti-inference working + 1/3 preservation), and consider whether a code-level structural check is needed for modifier preservation.
→ Docs/AGENTS/Handoffs/2026-04-08_senior_developer_fix_1_strengthened_measurement_modifier_pre.md

---

### 2026-04-08 | LLM Expert | GitHub Copilot (GPT-5.4) | Fix 1 Prompt Strengthening for Proposition Anchoring -- [Standard] [open-items: yes]
**For next agent:** Measure against the same Fix 1 invariants: modifier preserved in direct claims, no normative injection on chronology-only variants, stable direction on the anchored claim, zero validator hallucinations.
→ Docs/AGENTS/Handoffs/2026-04-08_llm_expert_fix_1_prompt_strengthening_for_proposition_anchor.md

---

### 2026-04-08 | Senior Developer | Claude Code (Opus 4.6) | f1a372bf-to-HEAD Consolidated Investigation -- [Standard] [open-items: yes]
**For next agent:** The consolidated document supersedes both the primary investigation and the cross-review for decision-making. Source docs remain as audit trail. Priority 1 fix target: `apps/web/prompts/claimboundary.prompt.md` CLAIM_EXTRACTION_PASS2 section.
→ Docs/AGENTS/Handoffs/2026-04-08_senior_developer_f1a372bf_to_head_consolidated_investigation.md

---

### 2026-04-08 | Lead Architect + LLM Expert | Codex (GPT-5) | Dominant Claim Aggregation Follow-Up -- [Standard] [open-items: yes]
**For next agent:** Reuse the existing handoff as the main architecture note, but carry forward these extra validation anchors: Swiss target `11a8f75c...`, Swiss sibling override `67a3d07d...`, hydrogen `a0c5e51e...`, and plastic control `70a3963c...`.
→ Docs/AGENTS/Handoffs/2026-04-08_lead_architect_llm_expert_dominant_claim_aggregation_follow.md

---

### 2026-04-07 | Senior Developer | Claude Code (Opus 4.6) | f1a372bf-to-HEAD Investigation — Final with Bundesrat Failures -- [Standard] [open-items: yes]
**For next agent:** Full investigation with all findings: `Docs/WIP/2026-04-07_f1a372bf_to_HEAD_Job_Quality_Investigation.md`. The three Bundesrat critical findings are documented with exact job IDs, per-claim evidence, and root-cause analysis. The fix targets are: (...
→ Docs/AGENTS/Handoffs/2026-04-07_senior_developer_f1a372bf_to_head_investigation_final_with_b.md

---

### 2026-04-07 | Senior Developer | Claude Code (Opus 4.6) | f1a372bf-to-HEAD Job Quality Investigation -- [Standard] [open-items: yes]
**For next agent:** Full investigation: `Docs/WIP/2026-04-07_f1a372bf_to_HEAD_Job_Quality_Investigation.md`. Priority: Phase C > deploy Phase B > grounding monitoring.
→ Docs/AGENTS/Handoffs/2026-04-07_senior_developer_f1a372bf_to_head_job_quality_investigation.md

---

### 2026-04-07 | Senior Developer | Claude Code (Opus 4.6) | UPQ-1 Phase B Canary Measurement — `helps` -- [Standard] [open-items: yes]
**For next agent:** Phase B is validated and should be kept. The ledger proves the forced iterations are productive. Next target: Stage 3 clustering behavior with larger evidence pools. Full data: `Docs/WIP/2026-04-07_UPQ1_Phase_B_Canary_Measurement.md`.
→ Docs/AGENTS/Handoffs/2026-04-07_senior_developer_upq_1_phase_b_canary_measurement_helps.md

---

### 2026-04-07 | Senior Developer | Claude Code (Opus 4.6) | UPQ-1 Phase B — Per-Claim Researched-Iteration Floor -- [Standard] [open-items: yes]
**For next agent:** The fix targets the exact pattern from Phase A-2 ledger: Plastik AC_01 had 41 seeded/0 researched. After this change, AC_01 must receive at least 1 targeted iteration. The `claimAcquisitionLedger` will show whether the forced iteration produces us...
→ Docs/AGENTS/Handoffs/2026-04-07_senior_developer_upq_1_phase_b_per_claim_researched_iteratio.md

---

### 2026-04-07 | Senior Developer | Claude Code (Opus 4.6) | UPQ-1 Phase A-2 Telemetry Canary Measurement -- [Standard] [open-items: yes]
**For next agent:** The ledger data is in `resultJson.claimAcquisitionLedger`. Key fields: `seededEvidenceItems`, `iterations[].admittedEvidenceItems`, `iterations[].directionCounts`, `finalEvidenceItems`, `finalDirectionCounts`, `maxBoundaryShare`. Full analysis: `D...
→ Docs/AGENTS/Handoffs/2026-04-07_senior_developer_upq_1_phase_a_2_telemetry_canary_measuremen.md

---

### 2026-04-07 | Senior Developer | Codex (GPT-5) | Implement UPQ-1 Phase A-2 Claim-Level Acquisition Telemetry -- [Standard] [open-items: yes]
**For next agent:** The main analysis surface is now `resultJson.claimAcquisitionLedger`. The most relevant code paths are `runResearchIteration()` and `maybeRunSupplementaryEnglishLane()` in `research-orchestrator.ts`, the post-research applicability filter in `clai...
→ Docs/AGENTS/Handoffs/2026-04-07_senior_developer_implement_upq_1_phase_a_2_claim_level_acqui.md

---

### 2026-04-07 | Senior Developer | Codex (GPT-5) | Compare UPQ-1 A-2 Local Canaries Against Deployed And Update Docs -- [Standard] [open-items: yes]
**For next agent:** Use `Docs/WIP/2026-04-07_UPQ1_Phase_A2_Canary_Measurement.md` as the current source of truth. The deployed comparators referenced in this pass are `8ec681050e844becb4ec616eb426731e` (Swiss), `2cf4682c5c914834ac5a58b318c3fc0e` (Plastik), `eb02cd2e5...
→ Docs/AGENTS/Handoffs/2026-04-07_senior_developer_compare_upq_1_a_2_local_canaries_against_de.md

---

### 2026-04-07 | Senior Developer | Codex (GPT-5) | Diagnose Local-vs-Deployed Swiss-EU Treaty Claim Polarity Split -- [Standard] [open-items: yes]
**For next agent:** Focus on Stage 4 prompt/contract calibration, not Stage 2 query tuning. Best root fix is: truthPercentage must stay anchored to the explicit proposition; omitted-context or "normal procedure" arguments should affect `misleadingness`, `limitations`...
→ Docs/AGENTS/Handoffs/2026-04-07_senior_developer_diagnose_local_vs_deployed_swiss_eu_treaty.md

---

### 2026-04-07 | Lead Architect | Codex (GPT-5) | Cross-Review f1a372bf To HEAD Job Quality Investigation -- [Standard] [open-items: yes]
**For next agent:** Start with `Docs/WIP/2026-04-07_f1a372bf_to_HEAD_Job_Quality_Cross_Review.md`. The main corrections to preserve are: do not cite 39/74 as the strict post-baseline range; do not treat deployed `f1a372bf` as a runtime delta commit; do not frame Plas...
→ Docs/AGENTS/Handoffs/2026-04-07_lead_architect_cross_review_f1a372bf_to_head_job_quality_inv.md

---

### 2026-04-07 | Lead Architect | Codex (GPT-5) | Cross-Review Addendum For Hidden Deployed Bundesrat Jobs -- [Standard] [open-items: yes]
**For next agent:** The updated cross-review now reflects the correct combined position: public-visible strict range remains `21` local / `6` deployed, but the deployed analytical record for the Bundesrat family is larger because of the hidden addendum. Use that spli...
→ Docs/AGENTS/Handoffs/2026-04-07_lead_architect_cross_review_addendum_for_hidden_deployed_bun.md

---

### 2026-04-06 | Senior Developer | Claude Code (Sonnet 4.6) | UPQ-1 Cross-Review — Resequenced Phase A Soundness -- [Standard] [open-items: yes]
**For next agent:** Required plan change: `generateResearchQueries()` must filter `existingEvidence` to items where `relevantClaimIds.includes(claim.id)` before building the summary. This is a one-liner but critical for correctness. Full review text is in the chat re...
→ Docs/AGENTS/Handoffs/2026-04-06_senior_developer_upq_1_cross_review_resequenced_phase_a_soun.md

---

### 2026-04-06 | Senior Developer | Claude Code (Opus 4.6) | Cross-Boundary Tension Investigation -- [Standard] [open-items: yes]
**For next agent:** Fix 1: `aggregation-stage.ts:388` — add `aggregation` and `evidenceSummary` variables. Fix 2: `verdict-stage.ts:1022` — either have reconciler return updated boundaryFindings, or derive post-reconciliation boundary summary. Fix 3: tighten VERDICT_...
→ Docs/AGENTS/Handoffs/2026-04-06_senior_developer_cross_boundary_tension_investigation.md

---

### 2026-04-06 | Research | Claude Code (Sonnet 4.6) | Cross-Boundary Tension Analysis — All Deployed Jobs -- [Standard] [open-items: no]
**For next agent:** See Section 4 of the report below for the comparison finding. Short version: average tensions are higher on the current commit (2.00 vs 0.44), but this is almost certainly topic-driven rather than a pipeline regression — the previous commit's 9 jo...
→ Docs/AGENTS/Handoffs/2026-04-06_research_cross_boundary_tension_analysis_all_deployed_jobs.md

---

### 2026-04-06 | Senior Developer | Codex (GPT-5) | Compare Live Deployed `2ec54047` Jobs vs `b7783872` Baseline -- [Standard] [open-items: yes]
**For next agent:** If you need higher confidence on `2ec54047`, submit fresh deployed reruns for the Apr 5 baseline families (`Plastik`, `Bolsonaro EN`, `Earth`, `Meta`, `Swiss vs Germany`) and compare against the `b7783872` batch already documented in `Docs/WIP/202...
→ Docs/AGENTS/Handoffs/2026-04-06_senior_developer_compare_live_deployed_2ec54047_jobs_vs_b778.md

---

### 2026-04-06 | Senior Developer | Codex (GPT-5) | Trace Cross-Boundary Tensions Code Path And Regression Risk -- [Standard] [open-items: yes]
**For next agent:** Highest-leverage fixes are: align the Stage 5 prompt contract with actual variables and add a Stage 5 prompt-contract test; stop using stale advocate `boundaryFindings` for final narrative generation by either recomputing them after reconciliation...
→ Docs/AGENTS/Handoffs/2026-04-06_senior_developer_trace_cross_boundary_tensions_code_path_and.md

---

### 2026-04-06 | Generalist | Codex (GPT-5) | Local Current Commit Tension Investigation -- [Standard] [open-items: yes]
**For next agent:** Anchor jobs: current `bf502af1`, `02891ccb`, `f712efca`, `ff198492`; comparisons `7d2b91b5`, `da3f0cea`, `e65b9591`, `c4a4c606`, `345d6487`, `da1180ed`, `5e93d734`, `52fcb624`, `703c261d`. Key references are the optional concise `boundaryDisagreem...
→ Docs/AGENTS/Handoffs/2026-04-06_generalist_local_current_commit_tension_investigation.md

---

### 2026-04-06 | Senior Developer | Codex (GPT-5) | Consolidate Current vs Previous Deployment Cross-Boundary Tensions Investigation -- [Standard] [open-items: yes]
**For next agent:** Start from `Docs/WIP/2026-04-06_Cross_Boundary_Tensions_Current_vs_Previous_Deployment_Investigation.md`. The three supporting debate threads already concluded: deployed current jobs do show more visible tensions; local current jobs do not show a ...
→ Docs/AGENTS/Handoffs/2026-04-06_senior_developer_consolidate_current_vs_previous_deployment.md

---

### 2026-04-06 | Senior Developer | Codex (GPT-5) | Review Stage-5 Tension Fix Follow-Ups And Update Docs -- [Standard] [open-items: yes]
**For next agent:** The docs now consistently point to `08220154` + `2acc4545` as the shipped Stage-5 first-pass cleanup. Start measurement from the two WIP files dated 2026-04-06 and the new `NARR-1` backlog entry.
→ Docs/AGENTS/Handoffs/2026-04-06_senior_developer_review_stage_5_tension_fix_follow_ups_and_u.md

---

### 2026-04-06 | Senior Developer | Codex (GPT-5) | Close Stage-5 Fix 2 As Deferred And Propose Upstream Quality Workstream -- [Standard] [open-items: yes]
**For next agent:** Start from `Docs/WIP/2026-04-06_Upstream_Report_Quality_Workstream_Proposal.md`. The active question is no longer narrative calibration; it is how to instrument and improve Stage 2/3 claim-level evidence quality without reopening rejected heuristi...
→ Docs/AGENTS/Handoffs/2026-04-06_senior_developer_close_stage_5_fix_2_as_deferred_and_propose.md

---

### 2026-04-06 | Senior Developer | Codex (GPT-5) | Investigate Current Wikipedia Integration Status And Next Steps -- [Standard] [open-items: yes]
**For next agent:** Source of truth is the live code, not the older concept doc. Start with `apps/web/src/lib/web-search.ts`, `apps/web/src/lib/search-wikipedia.ts`, `apps/web/src/lib/analyzer/research-orchestrator.ts`, `apps/web/src/lib/analyzer/claim-extraction-sta...
→ Docs/AGENTS/Handoffs/2026-04-06_senior_developer_investigate_current_wikipedia_integration_s.md

---

### 2026-04-05 | Senior Developer | Claude Code (Opus 4.6) | sufficiencyMinMainIterations Experiment + AC_02 Check — Deploy -- [Standard] [open-items: yes]
**For next agent:** AC_02 check confirms genuine source scarcity, not starvation. AC_02 gets zero seeded items in both local AND deployed. Its 14 vs 21 item gap is proportional to iteration count (4 vs 6), driven by Stage 1 event-count variance (5 vs 7 distinct event...
→ Docs/AGENTS/Handoffs/2026-04-05_senior_developer_sufficiencyminmainiterations_experiment_ac.md

---

### 2026-04-05 | LLM Expert | Codex (GPT-5) | Review Keep-or-Revert Decision for 07cb2e0d -- [Standard] [open-items: yes]
**For next agent:** If you need to resolve the remaining uncertainty efficiently, run one controlled same-input multi-jurisdiction A/B canary with this line toggled and compare only the generated queries plus first-iteration retrieval coverage per listed jurisdiction...
→ Docs/AGENTS/Handoffs/2026-04-05_llm_expert_review_keep_or_revert_decision_for_07cb2e0d.md

---

### 2026-04-05 | Senior Developer | Claude Code (Opus 4.6) | Bolsonaro EN & Plastik DE Local Quality Investigation + Fix -- [Standard] [open-items: yes]
**For next agent:** Fix is committed (`cbb364ec`). Next step is rerunning local Bolsonaro EN and Plastik DE canaries to validate. If grounding warnings disappear and verdicts are stable, Plastik is deployment-ready; Bolsonaro needs the retrieval-depth check.
→ Docs/AGENTS/Handoffs/2026-04-05_senior_developer_bolsonaro_en_plastik_de_local_quality_inves.md

---

### 2026-04-05 | Senior Developer | Claude Code (Opus 4.6) | Post-Review Fixes (3 items) -- [Standard] [open-items: no]
**For next agent:** All three fixes are self-contained. No follow-up work needed unless validation runs reveal regression.
→ Docs/AGENTS/Handoffs/2026-04-05_senior_developer_post_review_fixes_3_items.md

---

### 2026-04-05 | Senior Developer | Codex (GPT-5) | Refine Grounding Validator Prompt for Remaining False Positives -- [Standard] [open-items: yes]
**For next agent:** After prompt rollout, re-run the Swiss-vs-Germany canary and one of the previously affected production claims (`38d576...` or `d0c115...` family) and compare the warning text against the three false-positive buckets documented in WIP section 5.10....
→ Docs/AGENTS/Handoffs/2026-04-05_senior_developer_refine_grounding_validator_prompt_for_remai.md

---

### 2026-04-05 | Senior Developer | Codex (GPT-5) | Fix Residual Grounding Noise: Source Backfill, Validator Context, Citation Repair -- [Standard] [open-items: yes]
**For next agent:** Start with fresh local canaries on the current branch before any deploy decision. Watch especially for the prior `isdglobal.org` empty-`sourceId` pattern and the Plastik AC_02 reasoning/array mismatch family. Verification passed: `npm -w apps/web ...
→ Docs/AGENTS/Handoffs/2026-04-05_senior_developer_fix_residual_grounding_noise_source_backfil.md

---

### 2026-04-05 | Senior Developer | Codex (GPT-5) | Replace Citation Repair with Single-Citation-Channel Root Fix -- [Standard] [open-items: yes]
**For next agent:** Fresh local canaries on prompt hash `79f7e76fa9c624f8256464739b2eb73d9b0ab065f9462190b8e7aa0e50ee1bd4` succeeded: `51751fbc88bb4489a9955f4baf011945` (Meta) finished `TRUE 92/85` with no `verdict_grounding_issue`; `c4a4c60612ff48f0a3dbb8da764fb0ab`...
→ Docs/AGENTS/Handoffs/2026-04-05_senior_developer_replace_citation_repair_with_single_citatio.md

---

### 2026-04-05 | Senior Developer | Codex (GPT-5) | Align Challenger and Grounding Prompts with Single-Citation-Channel Contract -- [Standard] [open-items: yes]
**For next agent:** The prompt contract tests now explicitly cover challenger prose and the defensive legacy wording in grounding validation. Verification passed: `npm -w apps/web exec vitest run test/unit/lib/analyzer/verdict-prompt-contract.test.ts`, `npm test`, an...
→ Docs/AGENTS/Handoffs/2026-04-05_senior_developer_align_challenger_and_grounding_prompts_with.md

---

### 2026-04-05 | Senior Developer | Codex (GPT-5) | Update Status Docs After Grounding Root Fix -- [Standard] [open-items: yes]
**For next agent:** If these doc updates are committed, keep `GRND-1` in MONITOR status until the first 7+ runs and deployed validation are reviewed. The next substantive plan/doc changes should likely focus on the Stage 2/3 boundary-concentration track.
→ Docs/AGENTS/Handoffs/2026-04-05_senior_developer_update_status_docs_after_grounding_root_fix.md

---

### 2026-04-05 | Senior Developer | Codex (GPT-5) | Run 5-Input Local-vs-Deployed Quality Gate -- [Standard] [open-items: yes]
**For next agent:** Batch job IDs were local `7849614707f941a4822120a8c32976a4`, `345d6487f2344923b0eeeb3b7ce1ca4d`, `52fcb6244a0145a999d9a5279b019912`, `e65b95916b594a90bfe72f31b04304cd`, `039b105677a54ccdbc7ef0e5da9c03d2`; deployed `3e1253cb79a44389b86d0c47ab734f13...
→ Docs/AGENTS/Handoffs/2026-04-05_senior_developer_run_5_input_local_vs_deployed_quality_gate.md

---

### 2026-04-05 | Senior Developer | Codex (GPT-5) | Reframe Batch as Build-over-Build Comparison -- [Standard] [open-items: yes]
**For next agent:** Local current-build batch: Earth `78496147`, Plastik `345d6487`, Bolsonaro `52fcb624`, Swiss/DE `e65b9591`, Meta `039b1056`. Deployed current-build batch: Earth `3e1253cb`, Plastik `80bbcc3d`, Bolsonaro `eb02cd2e`, Swiss/DE `9042bb73`, Meta `3f00b...
→ Docs/AGENTS/Handoffs/2026-04-05_senior_developer_reframe_batch_as_build_over_build_compariso.md

---

### 2026-04-05 | Senior Developer | Codex (GPT-5) | Write WIP Build Comparison Note -- [Standard] [open-items: yes]
**For next agent:** Use the WIP note as the canonical comparison reference for this batch instead of rephrasing from memory. It already contains the exact current job IDs and the comparator caveats.
→ Docs/AGENTS/Handoffs/2026-04-05_senior_developer_write_wip_build_comparison_note.md

---

### 2026-04-05 | Senior Developer | Codex (GPT-5) | Add Traffic-Light Status to WIP Comparison Note -- [Standard] [open-items: no]
**For next agent:** If this note is migrated into status docs, preserve both the legend and the separation between build-over-build and current local-vs-deployed sections.
→ Docs/AGENTS/Handoffs/2026-04-05_senior_developer_add_traffic_light_status_to_wip_comparison.md

---

### 2026-04-05 | Senior Developer | Codex (GPT-5) | Make WIP Comparison Colors Visible in Plain Markdown -- [Standard] [open-items: no]
**For next agent:** If you need real colored boxes later, this will need xWiki macros or HTML/CSS in a different rendering context rather than plain markdown tables.
→ Docs/AGENTS/Handoffs/2026-04-05_senior_developer_make_wip_comparison_colors_visible_in_plain.md

---

### 2026-04-05 | Senior Developer | Codex (GPT-5) | Check Whether Older Ahead-of-Deploy Commits Caused Local Quality Decline -- [Standard] [open-items: yes]
**For next agent:** The main conclusion is negative attribution: none of the older commits ahead of deployed currently has evidence of causing the local quality decline. If further causality work is needed, investigate later commits (`81e7ddc4`, `07cb2e0d`) only wher...
→ Docs/AGENTS/Handoffs/2026-04-05_senior_developer_check_whether_older_ahead_of_deploy_commits.md

---

### 2026-04-05 | Senior Developer | Claude Code (Opus 4.6) | Grounding Alias Fix — Validated -- [Significant] [open-items: yes]
**For next agent:** Full handoff: `Docs/AGENTS/Handoffs/2026-04-05_Senior_Developer_Grounding_Alias_Fix_Validation.md`. Clean canary jobs: Bolsonaro `703c261d05744fdf8ddc70ce3afa5145` (LEANING-TRUE 64/58, zero grounding/direction warnings), Plastik `da1180edfae445f8a...
→ Docs/AGENTS/Handoffs/2026-04-05_Senior_Developer_Grounding_Alias_Fix_Validation.md

---

### 2026-04-04 | Lead Architect | Claude Code (Opus 4.6) | Source Provenance Tracking Design -- [Standard] [open-items: yes]
**For next agent:** Read `Docs/WIP/2026-04-04_Source_Provenance_Tracking_Design.md` for the full design. Start with Phase 1 (section 4, "Phase 1 — Provenance Extraction + Telemetry"). Key integration points: `research-extraction-stage.ts` (extraction schema), `verdic...
→ Docs/AGENTS/Handoffs/2026-04-04_lead_architect_source_provenance_tracking_design.md

---

### 2026-04-04 | Product Strategist | Codex (GPT-5) | Funding Presentation Rewrite -- [Standard] [open-items: yes]
**For next agent:** Keep this page short and donor/partner-facing. Detailed partner sequencing, funder timing, and internal readiness notes belong in `Cooperation Opportunities`, `Academic Cooperation`, `Docs/Knowledge`, and `Docs/WIP`, not back in this presentation.
→ Docs/AGENTS/Handoffs/2026-04-04_product_strategist_funding_presentation_rewrite.md

---

### 2026-04-04 | Code Reviewer | Codex (GPT-5) | Documentation Currency Check For Solution And Plan Docs -- [Standard] [open-items: yes]
**For next agent:** If asked to update docs, start with `Docs/WIP/2026-03-26_Plastik_UNVERIFIED_Solution_Proposal.md`, `Docs/WIP/README.md`, `Docs/STATUS/Current_Status.md`, and `Docs/STATUS/Backlog.md`. Preserve the historical analysis, but add a clear outcome/super...
→ Docs/AGENTS/Handoffs/2026-04-04_code_reviewer_documentation_currency_check_for_solution_and.md

---

### 2026-04-04 | Product Strategist | Codex (GPT-5) | Tighten Funding Presentation Around Immediate Support Routes -- [Standard] [open-items: yes]
**For next agent:** If you expand this work, keep this page donor-facing and concise. Put detailed opportunity tracking, eligibility nuance, and call calendars on `Docs/xwiki-pages/FactHarbor/Organisation/Strategy/Cooperation Opportunities/WebHome.xwiki`. If you need...
→ Docs/AGENTS/Handoffs/2026-04-04_product_strategist_tighten_funding_presentation_around_immed.md

---

### 2026-04-04 | Product Strategist | Codex (GPT-5) | Sync Internal Cooperation Plan And Knowledge Summary -- [Standard] [open-items: yes]
**For next agent:** If another doc still says `Full Fact` is the immediate `#1` cooperation target or `NLnet` is already closed as of April 2026, treat that as stale unless it is clearly marked as historical background. The current internal source of truth is `Cooper...
→ Docs/AGENTS/Handoffs/2026-04-04_product_strategist_sync_internal_cooperation_plan_and_knowle.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Boundary Concentration vs Grounding Priority Plan -- [Standard] [open-items: yes]
**For next agent:** Start with `Docs/WIP/2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md`. Review whether the ordering is right: validation gate first, Stage 2/3 root-cause track second, grounding containment third. If approved, the first concre...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_boundary_concentration_vs_grounding_priorit.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Apply Sonnet Review To Boundary/Grounding Plan -- [Standard] [open-items: yes]
**For next agent:** Use the revised ordering in the WIP plan: `validation gate -> Track A root-cause stabilization + Track B grounding containment in parallel`. Do not revert to a strictly sequential order unless new evidence disproves the independent grounding failu...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_apply_sonnet_review_to_boundary_grounding_p.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Execute First Local Same-Commit Validation Gate Pass -- [Standard] [open-items: yes]
**For next agent:** Resume from the WIP plan’s new execution-status section. Restore Anthropic credits first, then rerun the exact same local canary matrix from a cleared-cache starting point: Bolsonaro EN, Plastik DE, `Ist die Erde rund?`, then the warm pass. Only a...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_execute_first_local_same_commit_validation.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Resume Validation Batch After Credit Restoration -- [Standard] [open-items: yes]
**For next agent:** Start from the WIP doc’s new rerun-status sections. The next step is not more analytical comparison; it is stabilizing the local run environment so a serial batch can execute on one fixed build/commit. Once that is achieved, rerun the same canary ...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_resume_validation_batch_after_credit_restor.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Priority Debate On Verdict Grounding Vs Retrieval/Clustering -- [Standard] [open-items: yes]
**For next agent:** Start with `apps/web/src/lib/analyzer/verdict-stage.ts`, `apps/web/src/lib/analyzer/warning-display.ts`, `apps/web/src/components/FallbackReport.tsx`, `apps/web/src/lib/config-schemas.ts`, `Docs/STATUS/Current_Status.md`, and `Docs/WIP/2026-03-30_...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_priority_debate_on_verdict_grounding_vs_ret.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Source Provenance Tracking Design Review -- [Standard] [open-items: yes]
**For next agent:** Start with `apps/web/src/lib/analyzer/types.ts`, `apps/web/src/lib/analyzer/research-extraction-stage.ts`, `apps/web/src/lib/analyzer/research-orchestrator.ts`, `apps/web/src/lib/analyzer/aggregation-stage.ts`, `apps/web/src/lib/analyzer/verdict-s...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_source_provenance_tracking_design_review.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Audit Provenance Documentation Currency -- [Standard] [open-items: yes]
**For next agent:** If asked to make the docs current, update `Docs/WIP/README.md` under future proposals, add a short “historical review input, not the active plan” note for `Docs/WIP/2026-04-04_Source_Provenance_GPT_Review_Prompt.md`, and optionally clean minor dri...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_audit_provenance_documentation_currency.md

---

### 2026-04-04 | LLM Expert | Codex (GPT-5) | Retrieval Documentation Currency Check -- [Standard] [open-items: yes]
**For next agent:** If asked to refresh docs, focus first on `Docs/Specification/Multi_Source_Evidence_Retrieval.md` and `Docs/WIP/2026-03-26_Next_Workstream_Decision.md`. Preserve the current April docs as the canonical retrieval planning sources unless newer design...
→ Docs/AGENTS/Handoffs/2026-04-04_llm_expert_retrieval_documentation_currency_check.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Make Commit Hash Live And Visible Across API/Web -- [Standard] [open-items: yes]
**For next agent:** Local verification succeeded with both endpoints reporting the same live build id: `http://localhost:5000/version` and `http://localhost:3000/api/version` now return `git_sha = 5f666979...+469a7968`. Use this patch as the current provenance baseli...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_make_commit_hash_live_and_visible_across_ap.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Investigate Executed Web Commit Hash Confusion -- [Standard] [open-items: yes]
**For next agent:** If the team wants to repair this, the right fix is not "make the hash more stable" globally. It is to add a second, analysis-scoped execution fingerprint for validation use, while keeping the existing visible hash for whole-repo build provenance. ...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_investigate_executed_web_commit_hash_confus.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Assess Whether Latest Deployment Caused Observed Degradation -- [Standard] [open-items: yes]
**For next agent:** If asked whether to revert the Wikipedia supplementary deployment, the best current answer is no. The current priority should remain Stage 2/3 retrieval-boundary stabilization plus narrow verdict-grounding containment, while local execution stabil...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_assess_whether_latest_deployment_caused_obs.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Compare Newest Local And Deployed Quality Jobs -- [Standard] [open-items: yes]
**For next agent:** Treat `Docs/WIP/2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md` as updated. If asked what to fix next, the best answer is still: stabilize local execution enough to satisfy the validation gate, then pursue Stage 2/3 retrieva...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_compare_newest_local_and_deployed_quality_j.md

---

### 2026-04-04 | LLM Expert | Codex (GPT-5) | Refresh Stale Retrieval Docs -- [Standard] [open-items: yes]
**For next agent:** Treat the current retrieval planning sources as `Docs/WIP/2026-03-03_Wikipedia_SemanticScholar_Integration_Concept.md`, `Docs/WIP/2026-04-03_Wikipedia_Supplementary_Completion_Plan.md`, `Docs/STATUS/Backlog.md`, and `Docs/STATUS/Current_Status.md`...
→ Docs/AGENTS/Handoffs/2026-04-04_llm_expert_refresh_stale_retrieval_docs.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Check Boundary/Grounding Documentation Currency -- [Standard] [open-items: yes]
**For next agent:** Treat `Docs/WIP/2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md` as current. Use `Docs/WIP/README.md` as the discovery entry point; it now points to the plan. Do not infer from older `Agent_Outputs` entries that grounding is ...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_check_boundary_grounding_documentation_curr.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Complete Same-Commit Local Validation Gate -- [Standard] [open-items: yes]
**For next agent:** Use the three same-commit jobs above as the current local baseline. Treat `verdict_grounding_issue` as the most clearly reproduced local defect on the current build. Treat earlier local mega-boundary outliers as historical/noisy signals unless the...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_complete_same_commit_local_validation_gate.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Refresh Provenance Doc Labels And Index -- [Standard] [open-items: yes]
**For next agent:** Treat `Docs/WIP/2026-04-04_Source_Provenance_Tracking_Design.md` as the current plan and `Docs/WIP/2026-04-04_Source_Provenance_GPT_Review_Prompt.md` as review history only.
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_refresh_provenance_doc_labels_and_index.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Refresh Status And xWiki Planning Docs -- [Standard] [open-items: yes]
**For next agent:** Treat `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, and the two updated xWiki pages as the refreshed top-level references. If further doc cleanup is requested, next targets should be older deep-dive/spec pages rather than these entry-...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_refresh_status_and_xwiki_planning_docs.md

---

### 2026-04-04 | Agents Supervisor | Codex (GPT-5) | Close Agent Rules Cleanup Documentation Gap -- [Standard] [open-items: yes]
**For next agent:** If governance-history docs are referenced in future reviews, use `Docs/ARCHIVE/2026-04-04_Agent_Rules_Cleanup_Closure_Summary.md` first, then the archived plan/report for underlying rationale.
→ Docs/AGENTS/Handoffs/2026-04-04_agents_supervisor_close_agent_rules_cleanup_documentation_ga.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | WIP Consolidation #9 -- [Standard] [open-items: yes]
**For next agent:** Treat the archived remap/direction/fetch/Wikipedia docs as historical records under `Docs/ARCHIVE/`. Treat `Docs/WIP/2026-03-27_Internet_Outage_Resilience_Plan.md` and `Docs/WIP/2026-03-27_Bolsonaro_efc5e66f_Single_Source_Flooding_Investigation.md...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_wip_consolidation_9.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Fix Comparative Geography Evidence Starvation -- [Standard] [open-items: yes]
**For next agent:** After deployment or local queue drain, re-run the exact Swiss-vs-Germany claim and confirm that AC_02 now receives Germany evidence, the `evidence_applicability_filter` warning drops or disappears, and the article no longer collapses to `UNVERIFIE...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_fix_comparative_geography_evidence_starvati.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Make Job/API Commit Hash Live Per New Commit -- [Standard] [open-items: yes]
**For next agent:** Verify production picks this up after the next deploy/restart by checking `/version` and one freshly created job. If future validation needs analyzer-only provenance, add a second scoped fingerprint rather than changing this whole-repo build id ag...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_make_job_api_commit_hash_live_per_new_commi.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Scope Grounding Validation to Claim-Local Context -- [Standard] [open-items: yes]
**For next agent:** Re-run the Swiss-vs-Germany local success case (`c3a19e4ca612445a8e32cb330da604f8`) or a fresh equivalent and inspect whether the prior `S_015/S_016`-style warning is gone. If any grounding warning remains, compare it against the new three-tier ru...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_scope_grounding_validation_to_claim_local_c.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Document Local vs Deployed Grounding Canary Results -- [Standard] [open-items: yes]
**For next agent:** Use the new section 6 in `Docs/WIP/2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md` as the current source of truth for the local/deployed status split. The next operational step is a fresh production rerun of the same claim a...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_document_local_vs_deployed_grounding_canary.md

---

### 2026-04-03 | Senior Developer | Claude Code (Opus) | Wikipedia Supplementary Completion -- [Standard] [open-items: yes]
**For next agent:** Feature is complete. If deeper Wikipedia-specific behavior is desired (reference extraction, provider-specific query variants), see `Docs/WIP/2026-03-03_Wikipedia_SemanticScholar_Integration_Concept.md` §2-3.
→ Docs/AGENTS/Handoffs/2026-04-03_senior_developer_wikipedia_supplementary_completion.md

---

### 2026-04-03 | Product Strategist | Codex (GPT-5) | Cooperation Opportunities Strategy Rewrite -- [Standard] [open-items: yes]
**For next agent:** Treat `Cooperation Opportunities` as the decision page and keep detailed partner/funder background in the funding presentation, academic cooperation presentation, and `Docs/Knowledge`. If new partner evidence arrives, update the short tables and s...
→ Docs/AGENTS/Handoffs/2026-04-03_product_strategist_cooperation_opportunities_strategy_rewrit.md

---

### 2026-04-03 | Senior Developer | Codex (GPT-5) | Fix False Orphan Requeue On Local Runner -- [Standard] [open-items: yes]
**For next agent:** Start with one fresh local job, not a batch. If a new duplicate run appears, inspect `JobEvents` first. `Done -> Re-queued after application restart (previous execution lost)` should now be much harder to reproduce locally. If you ever see that se...
→ Docs/AGENTS/Handoffs/2026-04-03_senior_developer_fix_false_orphan_requeue_on_local_runner.md

---

### 2026-04-03 | Senior Developer | Codex (GPT-5) | Fix Misleading Repeated Phase Blocks In Job Timeline -- [Standard] [open-items: yes]
**For next agent:** If the user still reports "restart-like" visuals, query the specific job in `factharbor.db` before touching runner code. Count `Runner started`, `Re-queued after application restart%`, and `Job interrupted by server restart.%` for that job. If tho...
→ Docs/AGENTS/Handoffs/2026-04-03_senior_developer_fix_misleading_repeated_phase_blocks_in_job.md

---

### 2026-04-03 | Senior Developer | Codex (GPT-5) | Fix Stage-4 Advocate Parse Failure From Unescaped Inner Quotes -- [Standard] [open-items: yes]
**For next agent:** If another `VERDICT_ADVOCATE` parse failure appears, fetch `/api/fh/metrics/{jobId}` with `X-Admin-Key` and check `parseFailureArtifact.recoveriesAttempted`. New quote-family failures should now show `inner_quote_repair` in the attempted chain and...
→ Docs/AGENTS/Handoffs/2026-04-03_senior_developer_fix_stage_4_advocate_parse_failure_from_une.md

---

### 2026-04-03 | Senior Developer | Codex (GPT-5) | Refresh Wikipedia WIP Scope And Add Narrow Completion Plan -- [Standard] [open-items: yes]
**For next agent:** Start from `Docs/WIP/2026-04-03_Wikipedia_Supplementary_Completion_Plan.md`, not from the archived large architecture doc. Keep the reopening narrow: no reference extraction, no Semantic Scholar redesign, no special aggregation heuristics. Validat...
→ Docs/AGENTS/Handoffs/2026-04-03_senior_developer_refresh_wikipedia_wip_scope_and_add_narrow.md

---

### 2026-04-03 | Senior Developer | Codex (GPT-5) | Add Supplementary Provider Usage Recommendations To WIP Docs -- [Standard] [open-items: yes]
**For next agent:** If implementation proceeds, preserve the distinction now documented in WIP: Wikipedia is the bounded default-on supplementary source; Semantic Scholar and Google Fact Check remain targeted optional discovery providers until their deeper integratio...
→ Docs/AGENTS/Handoffs/2026-04-03_senior_developer_add_supplementary_provider_usage_recommenda.md

---

### 2026-04-03 | Senior Developer | Codex (GPT-5) | Implement Bounded Default-On Wikipedia Supplementary Search -- [Standard] [open-items: yes]
**For next agent:** Validate serially on German Plastik, English Plastik, and one stable control. Check whether Wikipedia contributes bounded additional domains without flooding and whether disabling `search.providers.wikipedia.enabled` cleanly restores the pre-chang...
→ Docs/AGENTS/Handoffs/2026-04-03_senior_developer_implement_bounded_default_on_wikipedia_supp.md

---

### 2026-04-02 | Lead Architect | Codex (GPT-5) | Stage-4 Payload Simplification -- [Standard] [open-items: yes]
**For next agent:** Verify advocate `promptTokens`, `schemaCompliant`, retry firing, and final verdict/confidence on the live reruns. If parse failures persist after this simplification, the next investigation should focus on remaining Stage-4 output-shape failure ar...
→ Docs/AGENTS/Handoffs/2026-04-02_lead_architect_stage_4_payload_simplification.md

---

### 2026-04-02 | Investigator | Codex (GPT-5) | Plastik DE Stage-4 Prompt/Contract Parse Failure Review -- [Standard] [open-items: yes]
**For next agent:** Inspect [claimboundary.prompt.md](C:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md#L879), [verdict-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/verdict-stage.ts#L580), [verdict-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyz...
→ Docs/AGENTS/Handoffs/2026-04-02_investigator_plastik_de_stage_4_prompt_contract_parse_failur.md

---

### 2026-04-02 | Investigator | Codex (GPT-5) | Plastik Stage-4 Runtime/Artifact Failure Review -- [Standard] [open-items: yes]
**For next agent:** Most relevant runtime anchors are the DB rows/events/metrics for `b4678284c7e042f986211a5311aaa828`, `d460554f6b9549008a1f6e00c542b508`, `a695d0bc0fb745a2a6ebeccc0f8ec206`, `0ee67d3d3285418a813ed0dcf8ab06a4`, `d64adbaf52eb4953ba1bea596015a52d`, `7...
→ Docs/AGENTS/Handoffs/2026-04-02_investigator_plastik_stage_4_runtime_artifact_failure_review.md

---

### 2026-04-02 | Lead Architect | Codex (GPT-5) | German Plastik Stage-4 Parse Failure Reassessment -- [Standard] [open-items: yes]
**For next agent:** Anchor evidence: failing jobs `d460554f6b9549008a1f6e00c542b508`, `f279d6d32ccf49fb9d4843cee487e9bb`, `b4678284c7e042f986211a5311aaa828`; successful comparators `a695d0bc0fb745a2a6ebeccc0f8ec206`, `0ee67d3d3285418a813ed0dcf8ab06a4`, `513e99539b3b4...
→ Docs/AGENTS/Handoffs/2026-04-02_lead_architect_german_plastik_stage_4_parse_failure_reassess.md

---

### 2026-04-02 | Lead Architect | Codex (GPT-5) | German Plastik Variability Split Diagnosis -- [Standard] [open-items: yes]
**For next agent:** Anchor jobs for comparison: `974a754643d747c78de620558f26dd32`, `c86a3e4bb02349e3b316ea8e7dff095c`, `bc7f2cafc8fb4ea09267e18cf2a5f409`, `22c950cba66c4f18bfc280466c8f57d2`. Inspect `resultJson.searchQueries`, `resultJson.sources`, `resultJson.claim...
→ Docs/AGENTS/Handoffs/2026-04-02_lead_architect_german_plastik_variability_split_diagnosis.md

---

### 2026-04-02 | Investigator | Codex (GPT-5) | Funding Section Expansion and Reframe -- [Standard] [open-items: yes]
**For next agent:** Relevant section now lives in `Docs/xwiki-pages/FactHarbor/Organisation/Strategy/Cooperation Opportunities/WebHome.xwiki` around the `3. FUNDING OPPORTUNITIES` block. If continuing, the highest-value follow-up is editorial tightening, not more lis...
→ Docs/AGENTS/Handoffs/2026-04-02_investigator_funding_section_expansion_and_reframe.md

---

### 2026-04-02 | Investigator | Codex (GPT-5) | Funding Section Editorial Pass -- [Standard] [open-items: yes]
**For next agent:** If you continue editing the same section, protect the current separation between `Funding Opportunities`, `Funding Precedents`, and `Community Funding`. The section is now easier to scan; additional expansion will quickly make it too dense unless ...
→ Docs/AGENTS/Handoffs/2026-04-02_investigator_funding_section_editorial_pass.md

---

### 2026-04-02 | Senior Developer | Claude Code (Opus 4.6) | Stage-4 Parse Failure Diagnostic Artifact Capture -- [Standard] [open-items: yes]
**For next agent:** After the next failing Plastik run, inspect the artifacts via `GET /api/fh/metrics/{jobId}` and search for `parseFailureArtifact` in the `llmCalls` array. The `rawPrefix` and `rawSuffix` should reveal whether the failure is trailing commentary, in...
→ Docs/AGENTS/Handoffs/2026-04-02_senior_developer_stage_4_parse_failure_diagnostic_artifact_c.md

---

### 2026-04-02 | Senior Developer | Claude Code (Opus 4.6) | Metrics API Admin-Key Enforcement -- [Standard] [open-items: yes]
**For next agent:** The metrics API is now admin-only. If you add new metrics endpoints, follow the same pattern: `if (!AuthHelper.IsAdminKeyValid(Request)) return Unauthorized(...)`.
→ Docs/AGENTS/Handoffs/2026-04-02_senior_developer_metrics_api_admin_key_enforcement.md

---

### 2026-04-02 | Senior Developer | Codex (GPT-5) | German Plastik Reproduction Reset + Rubric Contract Fix -- [Standard] [open-items: yes]
**For next agent:** Start with one fresh single German Plastik run on current code after the last build/reseed. Check `/api/fh/metrics/{jobId}` with `X-Admin-Key` for `taskType='verdict' AND schemaCompliant=false`. If `EXPLANATION_QUALITY_RUBRIC` still shows `${narra...
→ Docs/AGENTS/Handoffs/2026-04-02_senior_developer_german_plastik_reproduction_reset_rubric_co.md

---

### 2026-04-02 | Senior Developer | Codex (GPT-5) | Restore Local Runner Serial Mode For Debugging -- [Standard] [open-items: yes]
**For next agent:** Assume the currently running local web stack is serial (`FH_RUNNER_MAX_CONCURRENCY=1`). Do not interpret improvements from the next Plastik runs as proof that the underlying concurrency issue is fixed globally; they only remove one local confound....
→ Docs/AGENTS/Handoffs/2026-04-02_senior_developer_restore_local_runner_serial_mode_for_debugg.md

---

### 2026-04-01 | LLM Expert | Codex (GPT-5) | Multilingual Docs Sync After Review Fixes -- [Significant] [open-items: yes]
**For next agent:** Use `Docs/AGENTS/Handoffs/2026-04-01_LLM_Expert_Multilingual_Output_Search_Review_Validation_Status.md` as the current validation gate. Earlier review findings in the prior 2026-04-01 entry are historical and no longer open.
→ Docs/AGENTS/Handoffs/2026-04-01_LLM_Expert_Multilingual_Output_Search_Review_Validation_Status.md

---

### 2026-04-14 | Lead Developer + Lead Architect | Codex (GPT-5) | Phase 7 Status And E2 Measurement Plan — [Standard] [open-items: yes]
**For next agent:** Phase 7 is already past planning: E1 V5 and E2 log-only are both on `main`. Do not keep changing prompts/stages. Write the missing E1 status note and run/document the E2 35-run batch from current HEAD before any Shape B or Opus decision.
→ Docs/AGENTS/Handoffs/2026-04-14_lead_developer_lead_architect_current_work_and_plan_takeover.md

---

### 2026-04-14 | Lead Developer + Lead Architect | Codex (GPT-5) | Current Work And Plan Takeover — [Standard] [open-items: yes]
**For next agent:** Active workstream is Phase 7. E1 V5 and E2 log-only stage are already on `main`; no committed Phase 7 measurement doc exists yet. Next recommended step is to stop changing code, write the missing measurement ledger, then run and record the E2 35-run batch on current HEAD.
→ Docs/AGENTS/Handoffs/2026-04-14_lead_developer_lead_architect_current_work_and_plan_takeover.md

---

### 2026-04-13 | Lead Architect + LLM Expert | Codex (GPT-5) | Phase 7 Salience-First Charter Review — [Standard] [open-items: yes]
**For next agent:** Before executing E1, fix two charter issues: E1 currently claims "no schema/code change" while requiring a new Pass 2 reasoning field, and the E2 precision metric has no negative-control inputs in the proposed corpus.
→ Docs/AGENTS/Handoffs/2026-04-13_lead_architect_llm_expert_phase7_salience_first_charter_review.md

---

### 2026-04-13 | Lead Architect + LLM Expert | Codex (GPT-5) | C16 Replay Review Round 2 — [Standard] [open-items: yes]
**For next agent:** The corrected doc math now matches the DB, but `Docs/WIP/2026-04-13_C16_R2_Combined_Replay_Analysis.md` still has one internal mismatch: line 66 says extractor anchor loss is `4/6`, while the partition table correctly shows `3/6` with `d5a7dc33` counted as `validator_unavailable`.
→ Docs/AGENTS/Handoffs/2026-04-13_lead_architect_llm_expert_c16_replay_review_round2.md

---

### 2026-04-13 | Lead Architect + LLM Expert | Codex (GPT-5) | C16 Combined Replay Review — [Standard] [open-items: yes]
**For next agent:** Recompute `Docs/WIP/2026-04-13_C16_R2_Combined_Replay_Analysis.md` using the exact locked R2 input only. The current doc mixes `unterschreibt` and `unterschrieb`, mislabels `0ce78ee9` as a full pass, and overstates the pre-C16 delta.
→ Docs/AGENTS/Handoffs/2026-04-13_lead_architect_llm_expert_c16_combined_replay_review.md

---

### 2026-04-01 | LLM Expert | Codex (GPT-5) | Multilingual Output/Search Review + Validation Plan + Status Sync -- [Significant] [open-items: yes]
**For next agent:** Use `Docs/AGENTS/Handoffs/2026-04-01_LLM_Expert_Multilingual_Output_Search_Review_Validation_Status.md` as the main summary of residual risks and the validation gate. The most important next work is validation and Stage-2 hardening, not additional...
→ Docs/AGENTS/Handoffs/2026-04-01_LLM_Expert_Multilingual_Output_Search_Review_Validation_Status.md

---

### 2026-04-01 | Lead Architect | Gemini 3.1 Pro | Stage 1 Narrow Hardening - Code Review -- [Standard] [open-items: yes]
**For next agent:** The repository is clean. Proceed to the next item since the narrow hardening has officially merged into the post-rollback baseline.
→ Docs/AGENTS/Handoffs/2026-04-01_lead_architect_stage_1_narrow_hardening_code_review.md

---

### 2026-04-01 | Lead Architect | Gemini 3.1 Pro | Stage 1 Narrow Hardening - Architect Review -- [Standard] [open-items: yes]
**For next agent:** Read Docs/WIP/2026-04-01_Stage1_Narrow_Hardening_Architect_Review.md and implement both changes simultaneously in claim-extraction-stage.ts.
→ Docs/AGENTS/Handoffs/2026-04-01_lead_architect_stage_1_narrow_hardening_architect_review.md

---

### 2026-04-01 | Senior Developer | Claude Code (Opus 4.6) | Multilingual Output/Search Policy (Proposal 2) -- [Standard] [open-items: no]
**For next agent:** (no For-next-agent field)
→ Docs/AGENTS/Handoffs/2026-04-01_senior_developer_multilingual_output_search_policy_proposal.md

---

### 2026-04-01 | Senior Developer | Claude Code (Opus 4.6) | Post-Rollback Live Validation (17 runs) -- [Standard] [open-items: no]
**For next agent:** (no For-next-agent field)
→ Docs/AGENTS/Handoffs/2026-04-01_senior_developer_post_rollback_live_validation_17_runs.md

---

### 2026-04-01 | Lead Architect | Codex (GPT-5) | Clean Replay of `fff7a508` Rollback -- [Standard] [open-items: no]
**For next agent:** (no For-next-agent field)
→ Docs/AGENTS/Handoffs/2026-04-01_lead_architect_clean_replay_of_fff7a508_rollback.md

---

### 2026-04-15 | Lead Developer + LLM Expert | Codex (GPT-5) | Delegated Review And Consolidated Plan -- [Standard] [open-items: yes]
**For next agent:** The delegated review split the work into three tracks: prompt rollout/verification (UCM-active prompt state matters more than file state), narrow test hygiene/additions, and a separate salience-routing design slice. Do not blend the salience model-tier question into the prompt patch; it needs dedicated task/config plumbing if pursued.
→ Docs/AGENTS/Handoffs/2026-04-15_Lead_Developer_LLM_Expert_Delegated_Review_And_Plan.md

---

### 2026-04-15 | Lead Developer + LLM Expert | Codex (GPT-5) | Prompt Issue Review Consolidation -- [Standard] [open-items: yes]
**For next agent:** Current repo already had the April 14 P0 repair-pass fix; this follow-up consolidated the newer prompt issue report, landed the safe prompt-only slice in `apps/web/prompts/claimboundary.prompt.md`, and rejected the salience-tier proposal as under-scoped. Next work, if any, should split into prompt-governance cleanup vs. dedicated salience routing/UCM design rather than mixing them.
→ Docs/AGENTS/Handoffs/2026-04-15_Lead_Developer_LLM_Expert_Prompt_Issue_Review_Consolidation.md

---

### 2026-04-01 | Senior Developer | Codex (GPT-5) | Stage 1 Narrow Hardening Implementation -- [Standard] [open-items: yes]
**For next agent:** Treat this as a narrow Stage-1 patch on top of the Apr 1 rollback baseline. If continuing, run live SRG/SRF/Plastik validation first; do not expand this into a broader Stage-1 package. If needed later, clean up the noisy mock sequencing in the two...
→ Docs/AGENTS/Handoffs/2026-04-01_senior_developer_stage_1_narrow_hardening_implementation.md

---

### 2026-04-14 | Lead Developer + Lead Architect | Codex (GPT-5) | Phase 7b Slice 1 Mode Separation + Persistence Hardening -- [Standard] [open-items: yes]
**For next agent:** `ba150b4d` consolidated the Phase 7 docs; this follow-up slice hardens the runtime surface for Shape B. `salienceCommitment` now has explicit `audit` vs `binding` mode in config/defaults, the full salience status is persisted on success and disabled paths, and final contract-summary refresh preserves `stageAttribution`. Next step is to wire binding-mode anchors into Pass 2/validator behavior behind the new mode flag without removing the existing V5 scaffold.
Warnings: Current E2 remains audit-only at runtime; binding mode is config-visible and persisted, but not yet consumed by Pass 2. Do not claim Shape B is active until the next slice lands. `npm -w apps/web run build` reseeded prompt/config storage as part of postbuild; that is expected.
Learnings: The persisted interface being optional masked a local runtime type hole; using `NonNullable<CBClaimUnderstanding["salienceCommitment"]>` in Stage 1 keeps compile-time expectations honest. Stage attribution after final revalidation must be preserved explicitly because the refreshed summary replaces the prior object.

---

### 2026-04-15 | Unassigned | Codex (GPT-5) | Salience Model-Tier Design Review -- [Standard] [open-items: yes]
**For next agent:** Salience is already a dedicated Stage 1 call, but it still borrows the shared `understand` lane. Recommended next step is a dedicated UCM-backed salience task/model key in pipeline config, defaulted to the current budget behavior, while keeping `salienceCommitment.enabled/mode` in calculation config. Check `apps/web/src/lib/analyzer/claim-extraction-stage.ts`, `apps/web/src/lib/analyzer/llm.ts`, `apps/web/src/lib/config-schemas.ts`, `apps/web/configs/pipeline.default.json`, `apps/web/configs/calculation.default.json`, plus admin/calibration surfaces if the new lane must be visible.
→ Docs/AGENTS/Handoffs/2026-04-15_Unassigned_Salience_Model_Tier_Design_Review.md

---

### 2026-04-15 | Unassigned | Codex (GPT-5) | CLAIM_CONTRACT_REPAIR P0 Investigation -- [Standard] [open-items: yes]
**For next agent:** Current repo state does not match the old P0 report anymore. `CLAIM_CONTRACT_REPAIR` exists with a loader-compatible header, `${...}` variables, and a narrow `atomicClaims` repair schema. There is still no section-level fallback prompt if repair loading/rendering fails, but an unresolved contract violation now propagates through `contractValidationSummary` and can terminate early as `report_damaged` instead of silently shipping an invalid analysis. Check `apps/web/prompts/claimboundary.prompt.md`, `apps/web/src/lib/analyzer/prompt-loader.ts`, `apps/web/src/lib/analyzer/claim-extraction-stage.ts`, and `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`.
→ Docs/AGENTS/Handoffs/2026-04-15_Unassigned_CLAIM_CONTRACT_REPAIR_P0_investigation.md

---

### 2026-04-14 | Lead Developer + Lead Architect | Codex (GPT-5) | Phase 7b Slice 2 Binding Prompt Wiring -- [Standard] [open-items: yes]
**For next agent:** `f48af7bf` established honest audit-vs-binding mode separation; this follow-up slice wires binding mode into Pass 2 and contract validation prompts without changing audit-mode behavior. `CLAIM_EXTRACTION_PASS2` now stays untouched for audit mode, while binding mode appends `CLAIM_EXTRACTION_PASS2_BINDING_APPENDIX` and constrains extraction to the precommitted salience anchor set. Contract validation similarly appends `CLAIM_CONTRACT_VALIDATION_BINDING_APPENDIX` and audits against the provided anchor inventory instead of discovering a fresh one.
Warnings: `stageAttribution` remains contract-recovery-only provenance. D1 / MT-5(C) reprompts can still change the final accepted set without changing `stageAttribution`, so do not use it as full claim-set provenance in the first Shape B measurement closeout. `npm -w apps/web run build` reseeded prompt/config storage as part of postbuild; that is expected.
Learnings: The cleanest rollback boundary was prompt layering, not prompt mutation. Keeping audit mode on the exact existing `CLAIM_EXTRACTION_PASS2` / `CLAIM_CONTRACT_VALIDATION` sections and appending binding-only sections avoided contaminating the audit baseline while still making the precommitted anchors operational.

---

### 2026-04-14 | Lead Developer + Lead Architect | Codex (GPT-5) | Phase 7b Slice 2 Review Follow-Up -- [Standard] [open-items: yes]
**For next agent:** Closed the only concrete regression gap from the post-`4adf6f17` review by adding explicit audit-mode non-loading coverage for `CLAIM_CONTRACT_VALIDATION_BINDING_APPENDIX` in `claimboundary-pipeline.test.ts`. Also made the provenance limit explicit in `Docs/WIP/2026-04-14_Phase7_E2_Measurement.md`: `stageAttribution` is contract-recovery provenance only and must not be used as full final-claim-set provenance in the first binding-mode closeout.
Warnings: The provenance caveat remains active. If the first binding-mode measurement packet needs full final-set provenance, extend the persisted model before making that claim. This follow-up only closes the regression-test and documentation gap; it does not change runtime provenance semantics.
Learnings: Positive-path coverage on a binding-only branch was not enough; audit-mode isolation needs an explicit negative assertion too, otherwise the rollback boundary can erode silently in later prompt wiring changes.

---

### 2026-04-14 | Lead Developer + Lead Architect | Codex (GPT-5) | Phase 7b P0 Repair-Pass Fix -- [Standard] [open-items: yes]
**For next agent:** Stopped the first bounded binding-mode verification attempt after confirming a real P0: `CLAIM_CONTRACT_REPAIR` had been broken since `61815f41` because the prompt file section header was not loader-compatible, it used legacy `{{...}}` placeholders instead of `${...}`, and the runtime was still expecting a full `Pass2OutputSchema` even though the repair prompt is a narrow claim-set editor. Fixed all three together: the prompt section now loads, the variables render, and the runtime accepts a narrow repair output (`atomicClaims` only) while merging it back into the existing Pass 2 envelope.
Warnings: The five binding-mode verification jobs submitted for the corrected corpus were cancelled and deleted after the bug was confirmed. Active calculation config was reverted back to the pre-run audit hash before the fix landed. Do not resume binding-mode verification until this commit is in place on the running stack.
Learnings: Mocked pipeline tests were insufficient for prompt-file integrity. A real-file prompt contract test now guards `CLAIM_CONTRACT_REPAIR` so malformed section headers and stale placeholder syntax fail at `npm test` cost instead of surfacing only during live runs.

---

### 2026-04-15 | Unassigned | Codex (GPT-5) | ClaimBoundary Prompt UCM Propagation Review -- [Standard] [open-items: yes]
**For next agent:** Runtime prompt loading is DB-first. `claimboundary.prompt.md` changed to `1.0.1`, but local `apps/web/config.db` still shows active `prompt/claimboundary` at `seed-v1.0.0` / `system-seed`. Next step is per-environment verification of active prompt metadata, then CLI reseed for system-seeded envs and manual compare/import/activate for admin-managed envs. Avoid the Admin “Load from File” flow if you want to preserve future auto-refresh semantics.
→ Docs/AGENTS/Handoffs/2026-04-15_Unassigned_ClaimBoundary_Prompt_UCM_Propagation_Review.md

---

### 2026-04-15 | Lead Developer + LLM Expert | Codex (GPT-5) | Narrow Claim Contract Test Cleanup -- [Standard] [open-items: yes]
**For next agent:** The stale `claim-contract-validation.test.ts` expectations are now aligned to the current Stage 1 source shape (`contractGuidance` inline fallback branch; case-insensitive anchor repair gate), and the narrow prompt/runtime regressions for `truthConditionAnchor` plus `antiInferenceCheck` are covered. The next step is live runtime verification of the reseeded prompt, not more unit-test churn.
→ Docs/AGENTS/Handoffs/2026-04-15_Lead_Developer_LLM_Expert_Narrow_Claim_Contract_Test_Cleanup.md

---

### 2026-04-15 | Lead Developer + LLM Expert | Codex (GPT-5) | Live Prompt Runtime Verification -- [Standard] [open-items: yes]
**For next agent:** Local live verification succeeded. Probe job `00f9ad972d854b24b2de5d292ed9ab20` is enough to inspect prompt usage and later report output. The job-specific `claimboundary` snapshot already proves runtime activation of hash `f17e326e48536f4acc71de296ee5e22d3aa883cb3d07d5829f2bfa2486883bc9`; if you continue, inspect this same job rather than creating another prompt probe.
→ Docs/AGENTS/Handoffs/2026-04-15_Lead_Developer_LLM_Expert_Live_Prompt_Runtime_Verification.md

---
### 2026-04-17 | Unassigned | Codex (GPT-5) | MT5C Contract-Approved Skip Fix -- [Standard] [open-items: yes]
**For next agent:** `claim-extraction-stage.ts` now extends the existing sacred-set rule into `MT-5(C)`: if a 1-claim post-Gate-1 set is already contract-approved, the multi-event reprompt is skipped instead of regenerating it. Regression coverage lives at `claimboundary-pipeline.test.ts:9891` and proves the branch stops after the initial contract validation + Gate 1 path.
→ Docs/AGENTS/Handoffs/2026-04-17_Unassigned_MT5C_Contract_Approved_Skip_Fix.md

---
### 2026-04-17 | Unassigned | Codex (GPT-5) | Report Review d816e2e8 Stage1 Multi-Event Reprompt -- [Standard] [open-items: yes]
**For next agent:** Job `d816e2e8abf14fa6a0c5f63a20e9b4a8` is a real benchmark miss for `bundesrat-rechtskraftig`, but the strongest cause is not Stage 2 or concurrency. Compare `claim-extraction-stage.ts:647-649` vs `:775-839`: the generic reprompt loop protects contract-approved sets, while `MT-5(C)` can still reprompt a repaired 1-claim set and destroy the preserved `rechtskräftig` anchor. Evidence anchor jobs: failed `d816e2e8...`, failed `1d9d9389...`, healthy `0f3696d0...`.
→ Docs/AGENTS/Handoffs/2026-04-17_Unassigned_Report_Review_d816e2e8_Stage1_Multi_Event_Reprompt.md

---

### 2026-04-15 | Lead Developer + LLM Expert | Codex (GPT-5) | Job Review On Prompt Effectiveness -- [Standard] [open-items: yes]
**For next agent:** Real job review says the prompt fixes should stay: the latest treaty runs on prompt hash `f17e326e...` clearly repaired the `rechtskräftig` / chronology anchor failure. But there is still a separate Stage 1 bug: Gate 1 flags extra claims as fidelity-failed and the pipeline keeps them anyway, which can still distort downstream verdicts. If continuing, start from `claim-extraction-stage.ts:2817-2825` and the two jobs `85843ef4f98144f2afa7a088b9371dd9` / `0a533220d8a24bc2ae6335c96a013352`.
→ Docs/AGENTS/Handoffs/2026-04-15_Lead_Developer_LLM_Expert_Job_Review_On_Prompt_Effectiveness.md

---

### 2026-04-15 | Lead Developer + LLM Expert | Codex (GPT-5) | Submitted Job Effectiveness Review -- [Standard] [open-items: yes]
**For next agent:** Existing user-submitted jobs confirm the prompt fixes should stay: the treaty runs on `f17e326e...` repaired the old `rechtskräftig`/chronology failure. The new narrow Stage 1 pruning patch is also still the right change, but it has not yet been exercised by a qualifying live current-build job; only tests and old-job pathology support it so far. The Bolsonaro and plastic jobs are controls on the old prompt hash and do not argue for rollback.
→ Docs/AGENTS/Handoffs/2026-04-15_Lead_Developer_LLM_Expert_Submitted_Job_Effectiveness_Review.md

---

### 2026-04-15 | Lead Developer + LLM Expert | Codex (GPT-5) | New Report Investigation -- [Standard] [open-items: yes]
**For next agent:** The new live treaty reports finally exercised the current Stage 1 pruning patch. Both still used prompt hash `f17e326e...`, but the newer worktree hash `+b95e6294` reduced accepted Stage 1 claims from 3 to 1 and removed the inflated extra claim verdicts. Keep the prompt fixes and the pruning patch. The remaining gap is only observability: persisted `gate1Stats.filteredCount` does not currently reveal that pruning happened.
→ Docs/AGENTS/Handoffs/2026-04-15_Lead_Developer_LLM_Expert_New_Report_Investigation.md

---

### 2026-04-15 | Unassigned | Codex (GPT-5) | Daily Bug Scan Metrics Pricing Fix -- [Standard] [open-items: yes]
**For next agent:** Scanned the last 24h commits and found one concrete regression from `e7be34b4d614e65a9941629061d70e2e5dd83815`: `apps/web/src/lib/analyzer/model-resolver.ts` now emits `claude-sonnet-4-6`, but `apps/web/src/lib/analyzer/metrics.ts` lacked a matching pricing entry and undercounted estimated cost via the generic fallback. Fixed by adding `claude-sonnet-4-6` pricing and a regression test in `apps/web/test/unit/lib/analyzer/metrics.test.ts`. The Phase 7 prompt/claim-extraction tests I sampled passed; remaining recent changes are in a dirty worktree, so treat other possible issues as unconfirmed until isolated from local WIP.
→ Docs/AGENTS/Handoffs/2026-04-15_Unassigned_Daily_Bug_Scan_Metrics_Pricing_Fix.md

---

### 2026-04-15 | Unassigned | Codex (GPT-5) | WIP Archive Cleanup -- [Standard] [open-items: yes]
**For next agent:** Archived four high-confidence historical/supporting docs out of `Docs/WIP` and rewired the live references. The current README now reflects the active Phase 7 forward path better, but this was intentionally not a full archive sweep. If you continue, review mixed-status WIP files one at a time rather than batch-moving older plans.
→ Docs/AGENTS/Handoffs/2026-04-15_Unassigned_WIP_Archive_Cleanup.md

---
### 2026-04-17 | Unassigned | Codex (GPT-5) | Daily Bug Scan Prompt Drift Persists -- [Standard] [open-items: yes]
**For next agent:** Safe verification is green again on this tree (`npm test` passed twice cleanly), and the new Stage 1 repair-anchor coverage also passed. The only reproducible current bug-scan finding is still local `claimboundary` prompt activation drift: active UCM hash `977aaac7...` vs current file hash `db42b6c7...` in `apps/web/prompts/claimboundary.prompt.md`.
→ Docs/AGENTS/Handoffs/2026-04-17_Unassigned_Daily_Bug_Scan_Prompt_Drift_Persists.md

---
### 2026-04-17 | Senior Developer | Codex (GPT-5) | Search Cache Review Followups -- [Standard] [open-items: yes]
**For next agent:** `search-cache.ts` now fingerprints against `DEFAULT_SEARCH_CONFIG` defaults instead of duplicated inline fallback values, and `search-cache.test.ts` now covers provider, `detectedLanguage`, and implicit-vs-explicit default equivalence. `JobsController.EventsSse` also now has `[EnableRateLimiting("ReadPerIp")]`. Remaining review leftovers are the historical commit-subject issue, the self-healing orphaned cache rows, and the older Stage 1 carry-forwards in `claim-extraction-stage.ts`.
→ Docs/AGENTS/Handoffs/2026-04-17_Senior_Developer_Search_Cache_Review_Followups.md

---
### 2026-04-15 | Unassigned | Codex (GPT-5) | Agent Outputs Crosslink Normalization -- [Standard] [open-items: yes]
**For next agent:** Normalized the last six active Phase 7 rows that still pointed directly at `Docs/WIP/...`. `Docs/AGENTS/Agent_Outputs.md` now uses canonical handoff links for those rows. The only remaining mixed references are narrative body mentions, mainly in the archived March index, not active arrow-link targets.
→ Docs/AGENTS/Handoffs/2026-04-15_Unassigned_Agent_Outputs_Crosslink_Normalization.md

---
### 2026-04-15 | Unassigned | Codex (GPT-5) | WIP Section Archive Cleanup -- [Standard] [open-items: yes]
**For next agent:** Moved clearly obsolete Phase 7 review/planning sections out of active WIP docs into two new `_arch` companions. The active Phase 7 deep review and working baseline now keep only still-live forward-looking guidance; fixed `61815f41` blocker detail lives in `Docs/ARCHIVE/2026-04-14_Phase7_*_arch.md`.
→ Docs/AGENTS/Handoffs/2026-04-15_Unassigned_WIP_Section_Archive_Cleanup.md

---
### 2026-04-15 | Unassigned | Codex (GPT-5) | Status And Backlog Refresh -- [Standard] [open-items: yes]
**For next agent:** Rebased `Current_Status.md` and `Backlog.md` from the stale April 7/9 baseline to the actual April 15 repo state. Phase 7 is now the explicit active workstream; April 14–15 shipped work is captured; and the next canonical backlog items are the next bounded Shape B slice, Phase 7 observability/prompt rollout, and dedicated salience routing.
→ Docs/AGENTS/Handoffs/2026-04-15_Unassigned_Status_And_Backlog_Refresh.md

---
### 2026-04-15 | Lead Architect + LLM Expert | Codex (GPT-5) | Prompt Diagnosis Skill Review -- [Standard] [open-items: yes]
**For next agent:** Review found the skill is useful but currently overclaims prompt exactness, is not runnable as written in PowerShell, uses a wrong confidence threshold for current report JSONs, and should anchor on `promptContentHash` / UCM blobs rather than only `executedWebGitCommitHash`.
→ Docs/AGENTS/Handoffs/2026-04-15_Lead_Architect_LLM_Expert_Prompt_Diagnosis_Skill_Review.md

---
### 2026-04-15 | Lead Architect + LLM Expert | Codex (GPT-5) | Prompt Diagnosis Skill Rewrite -- [Standard] [open-items: yes]
**For next agent:** The skill and companion docs are now rewritten around runtime prompt-hash provenance, PowerShell-compatible execution, current `test-output/` artifact patterns, and stricter register-update rules. Main file: `.claude/skills/prompt-diagnosis/SKILL.md`.
→ Docs/AGENTS/Handoffs/2026-04-15_Lead_Architect_LLM_Expert_Prompt_Diagnosis_Skill_Rewrite.md

---
### 2026-04-15 | Lead Architect + LLM Expert | Codex (GPT-5) | Prompt Diagnosis 7333cb1f -- [Standard] [open-items: yes]
**For next agent:** Job `7333cb1f1ee6472b9c782e94e4aa7b0e` is not a prompt-drift or prompt-schema-failure case. Exact runtime blob `f17e326e...` matches the active `claimboundary` prompt, while the stronger explanation is retrieval caps/cache (`maxSourcesPerIteration=8`, `relevanceTopNFetch=5`, `7d` search cache). One secondary `P2` query-generation gap remains in `apps/web/prompts/claimboundary.prompt.md` for current aggregate-total claims, but I intentionally did not add it to the prompt issue register yet.
→ Docs/AGENTS/Handoffs/2026-04-15_Lead_Architect_LLM_Expert_Prompt_Diagnosis_7333cb1f.md

---
### 2026-04-15 | Unassigned | Codex (GPT-5) | Skill Cross-Tool Availability -- [Standard] [open-items: no]
**For next agent:** Shared workflow discovery is now aligned across Codex/GPT and Gemini. `AGENTS.md` and `GEMINI.md` list all nine `.claude/skills/*` workflows, the reviewed `docs-update` and `wip-update` skills are PowerShell/cross-tool friendly, and `.gemini/skills/factharbor-agent/SKILL.md` plus `factharbor-agent.skill` now point Gemini at the shared workflow library.
→ Docs/AGENTS/Handoffs/2026-04-15_Unassigned_Skill_Cross_Tool_Availability.md

---
### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Primary-Source Discovery Refinement Design -- [Standard] [open-items: yes]
**For next agent:** Implement a bounded Stage-2 refinement lane, not a parallel retrieval subsystem. Start with `apps/web/src/lib/analyzer/types.ts`, `claim-extraction-stage.ts`, `research-query-stage.ts`, `research-orchestrator.ts`, `research-extraction-stage.ts`, `apps/web/src/lib/web-search.ts`, `apps/web/src/lib/search-cache.ts`, `apps/web/src/lib/config-schemas.ts`, and `apps/web/prompts/claimboundary.prompt.md`. The key idea is LLM-derived retrieval intent + query lanes + coverage assessment + fresh-query cache policy, all generic and UCM-backed.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Primary_Source_Discovery_Refinement_Design.md

---
### 2026-04-17 | Unassigned | Codex (GPT-5) | Asylum WWII Report Review Retrieval And Verdict Gap -- [Standard] [open-items: yes]
**For next agent:** Retrieval is materially fixed for the asylum/WWII report-review input: Stage 2 now reaches the official SEM 2025 commentary PDF and extracts `235.057 Personen aus dem Asylbereich` on later live runs, but the aggregate article still stops at `LEANING-FALSE` because the historical-comparison subclaim (`CV_AC_02`) keeps treating the WWII comparator as methodologically incompatible. Start from jobs `f74597c548e84c0db9dad158e17da05e` and `23d05e2f16d9493d9a2a37a215d9813c`, plus [apps/web/src/lib/retrieval.ts](/c:/DEV/FactHarbor/apps/web/src/lib/retrieval.ts), [research-acquisition-stage.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/research-acquisition-stage.ts), and [claimboundary.prompt.md](/c:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md).
→ Docs/AGENTS/Handoffs/2026-04-17_Unassigned_Asylum_WWII_Report_Review_Retrieval_And_Verdict_Gap.md

---
### 2026-04-18 | Senior Developer | Codex (GPT-5) | Asylum WWII Stage4 Comparator Reconstruction Prompt Fix -- [Standard] [open-items: yes]
**For next agent:** `23d05e2f16d9493d9a2a37a215d9813c` already proves the remaining blocker is Stage 4 reasoning, not missing comparison structure in Stage 1: `AC_02` exists, but `CV_AC_02` is dragged down by a hand-built lower historical comparator from selected subgroups and assumed simultaneity. The prompt now blocks that pattern in Stage 4 and keeps it in confidence/misleadingness territory instead. Validate next on the approved asylum/WWII input with the reseeded prompt hash from the latest build and only revisit Stage 1 claim-merging if `CV_AC_02` still underperforms.
→ Docs/AGENTS/Handoffs/2026-04-18_Senior_Developer_Asylum_WWII_Stage4_Comparator_Reconstruction_Prompt_Fix.md

---
### 2026-04-18 | Senior Developer | Codex (GPT-5) | Asylum WWII Discovered Follow-Up Relevance Gating -- [Standard] [open-items: yes]
**For next agent:** Concern A from the Lead Developer re-review is now closed in code: discovered same-family follow-ups no longer bypass Stage 2 relevance gating. `fetchSources(...)` now classifies discovered candidates before fetch, re-applies per-parent selection, and stores the accepted `relevanceScore` on `FetchedSource`. Main anchors: `apps/web/src/lib/analyzer/research-acquisition-stage.ts`, `apps/web/src/lib/analyzer/research-orchestrator.ts`, and the regression test in `apps/web/test/unit/lib/analyzer/research-acquisition-stage.test.ts`. Next step is a live rerun of the approved asylum/WWII input to confirm the decisive SEM PDF remains reachable with lower fan-out; Stage 4 comparator reasoning remains separate.
→ Docs/AGENTS/Handoffs/2026-04-18_Senior_Developer_Asylum_WWII_Discovered_Followup_Relevance_Gating.md

---
### 2026-04-18 | Senior Developer | Codex (GPT-5) | Asylum WWII Post-Gating Live Rerun -- [Standard] [open-items: yes]
**For next agent:** Valid exact-input rerun is job `25dea04fb0da4ab5ad12fd5dbf76896a` on commit `7b9dec65d4dcab86a0314fec4ac559f9e5abdae8`. It finished `MIXED 45/65`, merged to one claim, and did **not** reach the SEM 2025 commentary PDF. Compare it against `23d05e2f16d9493d9a2a37a215d9813c` before changing Stage 4 again. The main unresolved question is whether the new discovery gate over-rejected same-family follow-ups or whether the changed Stage 1/query shape never re-opened the prior golden path. Ignore job `d87c15b0ffba42b7a21520fd9cb331e7`; it was submitted through a PowerShell path that corrupted `Flüchtlinge`.
→ Docs/AGENTS/Handoffs/2026-04-18_Senior_Developer_Asylum_WWII_Post_Gating_Live_Rerun.md

---
### 2026-04-18 | LLM Expert | Codex (GPT-5) | Report-Review Skill Prompt Debate And Provenance Review -- [Standard] [open-items: yes]
**For next agent:** `/report-review` is structurally strong in Phase 4, but three skill-level gaps remain: (1) autonomous `/validate` still verifies intended input, not persisted `job.inputValue`, so a transport-encoding corruption can be treated as valid evidence; (2) the prompt-rollout drift gate is stricter than necessary because it does not use the repo's existing canonical prompt hash path to compare current files to `config.db.active_hash`; (3) panel context omits provenance/language state, so panels can analyze an invalid live run without seeing that it failed exact-input integrity. If Captain wants this tightened, patch the skill with LLM Expert + Senior Developer + Lead Architect lenses, then re-use `/report-review` on fresh multilingual live reruns.
→ Docs/AGENTS/Handoffs/2026-04-18_LLM_Expert_Report_Review_Skill_Prompt_Debate_And_Provenance_Review.md

---
### 2026-04-18 | Unassigned | Codex (GPT-5) | Current Official Data Discovery Prioritization -- [Standard] [open-items: yes]
**For next agent:** Stage 2 acquisition now gives capped same-family follow-up slots to direct document/data artifacts before feed/listing hops, so the newest official source-native files are less likely to be dropped behind navigation pages. Main anchors are `apps/web/src/lib/analyzer/research-acquisition-stage.ts` and the new regression in `apps/web/test/unit/lib/analyzer/research-acquisition-stage.test.ts`. Verify next with an exact-input live rerun of the asylum/WWII claim and compare against jobs `25dea04fb0da4ab5ad12fd5dbf76896a` and `23d05e2f16d9493d9a2a37a215d9813c`.
→ Docs/AGENTS/Handoffs/2026-04-18_Unassigned_Current_Official_Data_Discovery_Prioritization.md

---
### 2026-04-18 | Unassigned | Codex (GPT-5) | Discovered Document Gate Bridge -- [Standard] [open-items: yes]
**For next agent:** Stage 2 acquisition now preserves one top-priority same-family document artifact per already-relevant parent even when the discovered-item classifier omits it. The classifier still gates the remaining discovered URLs; only the first prioritized document inherits the parent relevance score as a fetch-time bridge. Main anchors are `apps/web/src/lib/analyzer/research-acquisition-stage.ts` and the new regression in `apps/web/test/unit/lib/analyzer/research-acquisition-stage.test.ts`. Validate next with a fresh exact-input asylum/WWII rerun and compare against miss `25dea04fb0da4ab5ad12fd5dbf76896a`.
→ Docs/AGENTS/Handoffs/2026-04-18_Unassigned_Discovered_Document_Gate_Bridge.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | Broad Current Total Comparison Prompt Fix -- [Standard] [open-items: yes]
**For next agent:** Stage 1 and Stage 2 prompt contracts now keep a broad public-language current-versus-historical comparison anchored to the broadest authoritative current-side umbrella total instead of letting all official queries collapse onto a narrower formal subset. Main anchors are `apps/web/prompts/claimboundary.prompt.md`, `claim-extraction-prompt-contract.test.ts`, and `verdict-prompt-contract.test.ts`. Validate next with a fresh exact-input rerun of `235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.` and compare against jobs `c9b04f5b74d645dea5f24459869a22ad` and `d1045764077f4012a4a4aa9463fc106b`.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Broad_Current_Total_Comparison_Prompt_Fix.md

---
### 2026-04-19 | Code Reviewer | Codex (GPT-5) | Indexing Recommendation Accuracy Review -- [Standard] [open-items: no]
**For next agent:** Review outcome: the recommendation is directionally right that Phase 2 MCP would improve adoption, but several premises are overstated. `AGENTS.md`, `Handoff_Protocol.md`, `Multi_Agent_Meta_Prompt.md`, and `report-review/SKILL.md` already instruct index-first usage; `docs-update`, `wip-update`, and `handoff` skills maintain the system; `build-index.mjs` is 255 lines and `handoff-index.json` is 213 entries today. Keep automation; if follow-up is wanted, add a query surface or MCP without claiming repo-wide ~0% bypass.
→ Docs/AGENTS/Handoffs/2026-04-19_Code_Reviewer_Indexing_Recommendation_Accuracy_Review.md

---
### 2026-04-19 | Code Reviewer | Codex (GPT-5) | Indexing Improvement Options Debate -- [Standard] [open-items: no]
**For next agent:** Ranked the next-step options for a `Claude + GPT/Codex first, Gemini second` workflow after a three-position debate. Conclusion: best immediate step is wrapper/skill alignment around one concrete index-first path; best target architecture is a shared query core with CLI first and optional Claude MCP second. MCP-only is too tool-skewed; CLI-only is too optional; minimum-change-only is cheap but may plateau.
→ Docs/AGENTS/Handoffs/2026-04-19_Code_Reviewer_Indexing_Improvement_Options_Debate.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | CH-DE Ecosystem Adjacency Guard Fix -- [Standard] [open-items: yes]
**For next agent:** Fixed the `69cbbf4b318e477ca740b63a45f1f5d5` failure mode with a prompt-only comparative-ecosystem adjacency guard. `apps/web/prompts/claimboundary.prompt.md` now blocks broader policy-problem governance/legal-framework material from counting as direct ecosystem evidence unless it explicitly inventories/governs/certifies/funds/structurally describes the named activity ecosystem itself, and query generation now requires more concrete actor/network/roster/program signals. Focused prompt-contract tests passed, and the fresh rerun `48e1dc1c6e2b416584a3539de947f6fc` improved from `UNVERIFIED 48/22` to `LEANING-TRUE 70/40` with a much better acquisition path (multiple main iterations, `22` evidence items, concrete IFCN/inventory/desk/roster queries). The latest changes are still uncommitted, so the rerun recorded a dirty suffix on the execution SHA.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_CH_DE_Ecosystem_Adjacency_Guard_Fix.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | Current Aggregate Metric Refinement Fix -- [Standard] [open-items: yes]
**For next agent:** Implemented the consolidated asylum fix across Stage 1, Stage 2, and Stage 4. `apps/web/prompts/claimboundary.prompt.md` now carries a positive `primaryMetric` / `componentMetrics` contract for current aggregate metric claims, and `apps/web/src/lib/analyzer/research-orchestrator.ts` now triggers the one-time primary-source refinement only while the direct aggregate metric is still missing. Focused prompt-contract tests, the refinement unit suite, and `npm -w apps/web run build` all passed. The remaining live check is a clean rerun of `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz` on the committed build to confirm recovery of the decisive umbrella-total source path.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Current_Aggregate_Metric_Refinement_Fix.md

---
### 2026-04-19 | Code Reviewer | Codex (GPT-5) | Wrapper Index-First Alignment -- [Standard] [open-items: no]
**For next agent:** Implemented the approved wrapper-only fix. `GEMINI.md`, `.github/copilot-instructions.md`, `.clinerules/00-factharbor-rules.md`, and `.cursor/rules/factharbor-core.mdc` now all point agents to `Docs/AGENTS/index/handoff-index.json`, `stage-map.json`, and `stage-manifest.json` before scanning `Docs/AGENTS/Handoffs/` by filename, while preserving the rule that code locations still use grep/search.
→ Docs/AGENTS/Handoffs/2026-04-19_Code_Reviewer_Wrapper_Index_First_Alignment.md

---
### 2026-04-19 | LLM Expert | Codex (GPT-5) | Claim-Extraction Atomicity Review -- [Standard] [open-items: no]
**For next agent:** Reviewed the prompt-only exclusivity narrowing in `apps/web/prompts/claimboundary.prompt.md` and the focused contract assertions in `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`. The semantic conclusion is to keep `sole` / `only` / `unique` inside the multi-assertion override, and keep `first` / `last` outside it by default because Stage 1 should usually preserve ordering/ranking as one atomic claim.
→ Docs/AGENTS/Handoffs/2026-04-19_LLM_Expert_Claim_Extraction_Atomicity_Review.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | Report Review e8777ef2 CH DE Fact-Checking Comparison -- [Standard] [open-items: yes]
**For next agent:** Job `e8777ef27ee74b649f80daf11d22ddcf` is not a prompt-drift case; active and runtime `claimboundary` hash both equal `99aa2a94...`. The main quality failure is prompt/runtime behavior: broad topical queries, off-target direct evidence admission, and loss of Swiss institutional extraction that was present in comparator `99550cfbf6c94b519758551707aaa183`. Start with `apps/web/prompts/claimboundary.prompt.md:279-285`, `:654-669`, `:799-818`, `:893-912`, `:1391-1396`, and `apps/web/src/lib/analyzer/research-query-stage.ts:181-185`.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Report_Review_e8777ef2_CH_DE_Fact_Checking_Comparison.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | Report Review CH DE Fact-Checking Prompt Fix -- [Standard] [open-items: yes]
**For next agent:** The prompt-only fix for job `e8777ef27ee74b649f80daf11d22ddcf` is now in `apps/web/prompts/claimboundary.prompt.md`. It hardens qualitative institutional-comparison handling across Pass 1, Pass 2, Stage 2 query/relevance/extraction/applicability, and Stage 4 verdict logic so topical-adjacent mentions no longer stand in for ecosystem evidence. Safe verification passed on the prompt-contract and frontmatter-drift tests; live validation still needs reseed + restart before rerunning the target input.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Report_Review_CH_DE_Fact_Checking_Prompt_Fix.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | Daily Bug Scan No Confirmed Regression -- [Standard] [open-items: no]
**For next agent:** Reviewed commit-backed analyzer changes in `3a13dbb9`, `bfc48338`, `01aa3203`, `1c7bd96e`, and `9479376d` and re-ran both the targeted retrieval/acquisition/prompt-contract suites and the full safe suite. No concrete post-last-run regression was reproduced; `apps/web/src/lib/analyzer/research-acquisition-stage.ts` and `apps/web/src/lib/retrieval.ts` remain the main surfaces if later runtime evidence contradicts this scan.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Daily_Bug_Scan_No_Confirmed_Regression.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | Analysis Of Job 5e1e8697 Asylum Current Total Rerun -- [Standard] [open-items: yes]
**For next agent:** Job `5e1e8697c9ac45c29e59c3058e22b172` ran on clean commit `b94c158973717b1dade12a5f9c816a115d5d35bb` with prompt hash `34bdfaa2e5cb3fca1215967865a3d5d2720d429abdb211a862f911518a6440a7`, but it did **not** validate the asylum fix. It finished `MOSTLY-FALSE 22/72`, which is worse than both `7be084ee2c52441894a0d4a5c67213ec` (`LEANING-FALSE 38/62`) and the earlier good comparator `c95d00114cc54e6da201237d1ab59218` (`MOSTLY-TRUE 78/72`). The important distinction is that the failure is no longer just generic prompt bleed: this run reached current-source-family material (`Asylstatistik Februar 2026`, `2026-02-grafiken-asylstatistik-d`) but still **missed** the decisive umbrella-total source `stat-jahr-2025-kommentar-d.pdf` that `c95...` admitted as supporting evidence. Stage 1/early Stage 2 still reframed the claim too compositionally: `expectedEvidenceProfile` now centers `Aggregation von Bestandszahlen nach Asylstatus`, and the generated queries shifted to category-sum routes like `Staatssekretariat Migration Bestandszahlen anerkannte Flüchtlinge vorläufig Aufgenommene aktuell` instead of the older source-native umbrella route `Staatssekretariat Migration SEM Asylstatistik Bestand`.
**For next agent:** The strongest next seam is Stage 1/Stage 2 handling for current aggregate metrics: preserve the authoritative umbrella-total metric as the primary expected metric, and force refinement when only component/category current figures are admitted without a direct current total artifact. Contradiction iteration in `5e...` fetched zero new sources, and there was no refinement iteration at all, unlike `c95...`.
→ Investigated live jobs `5e1e8697c9ac45c29e59c3058e22b172`, `7be084ee2c52441894a0d4a5c67213ec`, `c95d00114cc54e6da201237d1ab59218`

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | Prompt Diagnosis 7be084ee Asylum Current Total Regression -- [Standard] [open-items: yes]
**For next agent:** Job `7be084ee2c52441894a0d4a5c67213ec` is prompt drift, not analyzer code drift. The key comparator is `c95d00114cc54e6da201237d1ab59218` on prompt hash `5b34870a...` versus the failing run on prompt hash `53232e79...`. `git diff --stat caa03914..3add5697` over the runtime path shows only one changed file: `apps/web/prompts/claimboundary.prompt.md`. The runtime blob diff confirms the only changes were the CH/DE comparative-ecosystem bullets added to `CLAIM_EXTRACTION_PASS1`, `CLAIM_EXTRACTION_PASS2`, and `GENERATE_QUERIES`. The asylum run then lost the broad current-total route and fell onto 2024/component framing. Recommended direction is a **partial undo / narrowing** of that prompt expansion, not a full revert and not analyzer-code surgery.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Prompt_Diagnosis_7be084ee_Asylum_Current_Total_Regression.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | CH-DE Fact-Checking Query Seeding Stabilization -- [Standard] [open-items: yes]
**For next agent:** The fix for `bcfcaa1f99304c83a8ee3676170444dd` is committed as `3add5697` and lives in `apps/web/prompts/claimboundary.prompt.md` plus the prompt-contract tests. Root cause was upstream query/evidence seeding drift, not rollout drift: Stage 1 had become too generic for this ecosystem-comparison family. Prompt reseed activated `claimboundary` hash `53232e79...`, and pending jobs are now demonstrably binding to the fixed build because `12efc9df...` completed on `3add5697...+bdb0bd8a` and queued jobs `ef358963...` and `3a8dfd60...` then entered `RUNNING` on that same executed SHA. Exact Swiss rerun `f59f64d739be47fa9d5192c9d7fefc34` is still queued and remains the clean behavioral confirmation target.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_CH_DE_Fact_Checking_Query_Seeding_Stabilization.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | Report Review a99d1780 CH DE Fact-Checking Stage1 Filter And Grounding Fix -- [Standard] [open-items: yes]
**For next agent:** Job `a99d17807c1c47dea23270bc8b1880b3` was not rollout drift; it already used active prompt hash `626f17c0...`. The implemented fix adds a Stage-1 LLM relevance gate before preliminary fetch/extraction in [claim-extraction-stage.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts) and tightens [claimboundary.prompt.md](/c:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md) against different-sector lexical overlaps, omission-as-evidence from unrelated pages, and uncited verdict world knowledge. Fix review found and I corrected the missing Pass-1 geography handoff into the new relevance gate. Live confirmation still needs prompt reseed + restart + rerun of the exact input.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Report_Review_a99d1780_CH_DE_Fact_Checking_Stage1_Filter_And_Grounding_Fix.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | ZHAW Meeting Prep Refinement -- [Standard] [open-items: yes]
**For next agent:** [2026-04-21_ZHAW_Meeting_Prep.md](/c:/DEV/FactHarbor/Docs/Meetings/2026-04-21_ZHAW_Meeting_Prep.md) is the current briefing version. It was rewritten for clearer discovery-first framing and then corrected to the actual meeting slot (`Dienstag, 21. April 2026, 10:15-11:00 Uhr`), with the filename renamed to match. If you continue, the best follow-up is a short live speaking sheet rather than further expanding the main prep note.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_ZHAW_Meeting_Prep_Refinement.md

---
### 2026-04-19 | LLM Expert | Codex (GPT-5) | Exclusivity Guard Prompt Review -- [Standard] [open-items: no]
**For next agent:** Reviewed the current working-tree refinement in `apps/web/prompts/claimboundary.prompt.md` and the paired contract test in `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`. Consolidated verdict: keep the prompt change; it is generic and multilingual-safe enough under AGENTS.md. The only nit is that the new test couples the contract to exact English wording (`sole/only/unique`, `first/last`) rather than the semantic distinction.
→ Docs/AGENTS/Handoffs/2026-04-19_LLM_Expert_Exclusivity_Guard_Prompt_Review.md

---
### 2026-04-19 | LLM Expert | Codex (GPT-5) | Exclusivity Override Semantic Rewrite -- [Standard] [open-items: yes]
**For next agent:** The interim token-shaped exclusivity rule was replaced with the reviewed semantic-structure version in `apps/web/prompts/claimboundary.prompt.md`, and the paired prompt-contract test now locks the semantic boundary instead of exact English cue words. Final rule shape: subject-specific proposition + comparison-class exclusivity proposition => `multi_assertion_input`, extract at least those two claims, do not force exactly two, do not add claims just because verification uses multiple evidence routes, keep anti-verbatim protection, and return order/rank cases to the normal classification rules instead of hard-forcing `single_atomic_claim`. Focused tests passed and prompt reseed activated `claimboundary` hash `8298884f...`; latest changes are still uncommitted and a fresh live rerun of the Swiss motivating input remains optional.
→ Docs/AGENTS/Handoffs/2026-04-19_LLM_Expert_Exclusivity_Override_Semantic_Rewrite.md

---
### 2026-04-19 | LLM Expert | Codex (GPT-5) | Prompt Diagnosis 4c5218a2 CH DE Fact-Checking -- [Standard] [open-items: yes]
**For next agent:** Job `4c5218a2960444c29baccff13f21cb38` is not prompt drift; runtime `promptContentHash` exactly matches active `claimboundary` hash `8298884f...` and current prompt content. Main live prompt weakness is `VERDICT_RECONCILIATION`: it lacks a hard per-side direct-evidence sufficiency step for comparative institutional/ecosystem claims, so Germany-direct evidence plus Swiss proxy/omission signals can still settle above `UNVERIFIED`. Separate `verdict_grounding_issue` is a known recurring grounding-validator false-positive class on the current active prompt, likely due to rule-order weakness in `VERDICT_GROUNDING_VALIDATION`, not rollout. Start with `apps/web/prompts/claimboundary.prompt.md:1399-1414` and `:1484-1507`, plus `apps/web/src/lib/analyzer/research-orchestrator.ts:934-1015` and `apps/web/src/lib/analyzer/verdict-stage.ts:1216-1335`.
→ Docs/AGENTS/Handoffs/2026-04-19_LLM_Expert_Prompt_Diagnosis_4c5218a2_CH_DE_Fact_Checking.md

---
### 2026-04-19 | LLM Expert | Codex (GPT-5) | Prompt Diagnosis Fix 4c5218a2 Comparative Ecosystem Grounding -- [Standard] [open-items: yes]
**For next agent:** Implemented the prompt-side fix for the `4c5218a2960444c29baccff13f21cb38` diagnosis. `apps/web/prompts/claimboundary.prompt.md` now forces per-side direct ecosystem evidence sufficiency before resolving comparative institutional/ecosystem claims and clarifies that `citedEvidenceRegistry` validates only directional citation arrays while claim-local context governs uncited reasoning references. Focused prompt-contract tests passed. Runtime activation is already current at `claimboundary` hash `c77cb6e8...`, and loader pointer refresh means no restart is required. The remaining gap is behavioral confirmation on a live rerun, which was not done because the Swiss motivating input is not on the current Captain-defined list.
→ Docs/AGENTS/Handoffs/2026-04-19_LLM_Expert_Prompt_Diagnosis_Fix_4c5218a2_Comparative_Ecosystem_Grounding.md

---
### 2026-04-19 | LLM Expert | Codex (GPT-5) | Atomicity Decomposition Integrity Fix -- [Standard] [open-items: yes]
**For next agent:** Job `edbfd9e61b154db98ec6b3199a6bf987` proved the earlier exclusivity override did not solve the atomicity problem: `AC_01` still reproduced the whole input while `AC_02`/`AC_03` carried narrower propositions. The fix removes the dedicated `Exclusivity/uniqueness override` from `CLAIM_EXTRACTION_PASS1` and `CLAIM_EXTRACTION_PASS2` and replaces it with a generic decomposition-integrity contract plus a validator rule that rejects any decomposed set containing the whole proposition plus one of its parts. Focused prompt-contract tests passed, the active `claimboundary` hash is now `9696f877...`, and services were restarted. No post-fix live rerun has been done yet.
→ Docs/AGENTS/Handoffs/2026-04-19_LLM_Expert_Atomicity_Decomposition_Integrity_Fix.md

---
### 2026-04-19 | LLM Expert | Codex (GPT-5) | CH-DE Fact-Checking Forward Fix -- [Standard] [open-items: yes]
**For next agent:** The regression from `MOSTLY-TRUE` / `LEANING-TRUE` runs to `UNVERIFIED` on `7ff65fb0557d483e84c9192bef141998` is not explained by analyzer code diffs; the only relevant git-caused change in the window from strong run `02dc8880...` (`8f3ca9dd...`) to current is the stricter comparative-ecosystem reconciliation rule added in `1e206930`. I did not revert it. The forward fix narrows that Stage 4 guard and strengthens Stage 2 instead: query generation now requires an enumerative ecosystem route per side, extraction now allows multiple actor/network pages to collectively evidence an ecosystem, and reconciliation now still blocks one-sided proxy wins but no longer forces `UNVERIFIED` when both sides have convergent close-ecosystem coverage without a single formal registry. Focused prompt-contract tests passed and active `claimboundary` hash is now `5b34870a...`. Fresh rerun `df612169dab34eb788beb66384ace691` was submitted but remained queued due local runner backlog / unrelated 404/401/credit issues, so live behavioral confirmation is still pending.
→ Docs/AGENTS/Handoffs/2026-04-19_LLM_Expert_CH_DE_Fact_Checking_Forward_Fix.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | Report Review 8f3ca9dd Revert Assessment -- [Standard] [open-items: yes]
**For next agent:** Do not treat `8f3ca9dd55471881d69bf4c0b7f1c97c5790109b+8d56a484` as a clean rollback target. `8d56a484` is a dirty-worktree fingerprint, not a commit, and only four stored jobs ran on that state. The evidence supports a narrow partial prompt rollback/modification for the CH/DE comparative-ecosystem path, not a full revert: CH/DE regressed after later prompt commits (`1e206930`, then spillover around `3add5697`), while other families improved or remained healthy later (`13b8f97b...` asylum-current-total on clean `92143261`, `32f00bb3...` plastic, stable hydrogen, Bundesrat best runs elsewhere). Preserve `76f57b59` and today’s uncommitted prompt/test fixes; if acting, either commit the current forward fixes and rerun, or selectively narrow the implicated comparative-ecosystem prompt sections instead of resetting the whole stack.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Report_Review_8f3ca9dd_Revert_Assessment.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | Post-Commit Targeted Reruns Validation -- [Standard] [open-items: yes]
**For next agent:** Preserved the current prompt/test work in clean commit `fc4c657f`, restarted the stack, and ran four clean exact-input reruns. Results on `fc4c657f`: `cb2361aa...` Bundesrat `UNVERIFIED 50/0` with `report_damaged` and zero evidence; `87e6e04e...` asylum-current-total `LEANING-TRUE 68/70`; `f8235a23...` asylum-WWII `MOSTLY-FALSE 25/74`; `850da2e6...` plastic `MOSTLY-FALSE 26/66`. Conclusion: do not partially roll back the comparative-ecosystem / aggregate-metric prompt line. Three families validate the current direction; the remaining broken family is Bundesrat, and its clean failure is still the known Stage-1 contract/decomposition issue rather than a later prompt-regression signal.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Post_Commit_Targeted_Reruns_Validation.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | Prompt Audit Schema Contract Findings -- [Standard] [open-items: yes]
**For next agent:** `input-policy-gate` is already runtime-sanitized before use, so most prompt-output contract claims there are weaker than they look. The stronger SR seam is not the prompt file alone but the combination of permissive runtime schemas (`sourceType`/bias are free strings) and cap logic that only understands a subset, plus the fact that the live SR engine currently builds prompts in `sr-eval-prompts.ts` instead of loading `source-reliability.prompt.md`. Missing frontmatter on `inverse-claim-verification.prompt.md` is not a current runtime defect because `paired-job-audit.ts` reads that file directly from disk and parses only its JSON response.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Prompt_Audit_Schema_Contract_Findings.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | Consolidated Prompt Audit Adjudication -- [Standard] [open-items: yes]
**For next agent:** Runtime-loading review confirmed the full `claimboundary` file is not sent to production LLM calls; the real hotspots are large individual sections such as `CLAIM_EXTRACTION_PASS2`, `GENERATE_QUERIES`, and `EXTRACT_EVIDENCE`. The consolidated view is: keep the ecosystem-duplication concern but treat it as a section-governance problem, not a full-file efficiency emergency; treat SR as a runtime schema/prompt-surface problem rather than a markdown-only prompt problem; and prioritize semantic hardening of `inverse-claim-verification.prompt.md` over frontmatter or metadata cleanup.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Consolidated_Prompt_Audit_Adjudication.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | Consolidated Prompt Audit Implementation Plan -- [Standard] [open-items: yes]
**For next agent:** The written execution plan now lives in `Docs/WIP/2026-04-19_Consolidated_Prompt_Audit_Implementation_Plan.md`. Follow the bounded order: Workstream 1 inverse-verification hardening, then Workstream 2 SR schema tightening/prompt-surface decision, then Workstream 3 `claimboundary` ecosystem governance. Do not start with full-file `claimboundary` splitting or loader refactors unless the governance pass proves insufficient.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Consolidated_Prompt_Audit_Implementation_Plan.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | Bundesrat Repair Anchor Narrowing Fix -- [Standard] [open-items: yes]
**For next agent:** The live hard-failure path for the exact Captain-defined Bundesrat input is no longer the old `MT-5(C)` branch; the remaining Stage-1 seam was `selectRepairAnchorText(...)` narrowing the repair target to the temporal clause when only that sub-span was still missing. `claim-extraction-stage.ts` now keeps the validator's broader anchor unless the lone missing narrowed span is modifier/predicate-like, and `repair-anchor-selection.test.ts` locks the Bundesrat temporal-sub-anchor case. Fresh rerun `e26048eb15b042f5ba9f0b42a59e35c3` on executed build `88126439...+5814ca8f` completed `SUCCEEDED` with `LEANING-TRUE 62.9 / 73` instead of `report_damaged`, but its stored contract summary still notes a whole-claim-plus-`Volk` decomposition concern.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Bundesrat_Repair_Anchor_Narrowing_Fix.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | Inverse Verification And SR Contract Hardening -- [Standard] [open-items: yes]
**For next agent:** `paired-job-audit.ts` now treats inverse verification as a validated degraded path instead of a throw-on-parse-failure path, and `inverse-claim-verification.prompt.md` now defines strict inverse boundaries explicitly for quantifiers, modality, scope, timeframe, identical claims, empty claims, and multilingual pairs. `sr-eval-types.ts` now canonicalizes SR `sourceType`/bias outputs to enum-backed values with one explicit legacy alias (`political_party` -> `advocacy`), `sr-eval-engine.ts` preserves canonical `biasIndicator` tokens, and `sr-eval-prompts.ts` no longer teaches the off-contract `political_party` example. Focused tests and `npm -w apps/web run build` passed; unrelated dirty `claimboundary` files were left untouched.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Inverse_Verification_And_SR_Contract_Hardening.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Compound Subject Decomposition Prompt Fix -- [Standard] [open-items: yes]
**For next agent:** `claimboundary.prompt.md` now explicitly forbids splitting a compound subject/object that shares one joint temporal or conditional anchor, and its contract-repair section now allows redundant sub-claims to be merged away instead of forcing a broken fixed-count output. The focused Stage-1 prompt contract test passed. This was committed only; restart the stack before using it for clean commit-linked job runs.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Compound_Subject_Decomposition_Prompt_Fix.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Coordinated Branch Atomicity Prompt Fix -- [Standard] [open-items: yes]
**For next agent:** The previous compound-anchor exception over-corrected and could force a non-atomic single claim for coordinated temporal inputs like `... bevor Volk und Parlament ...`. `claimboundary.prompt.md` now uses a `Coordinated branch rule`: split only into independently verifiable branches, preserve the shared anchor in each branch, never keep the whole unsplit sentence alongside them, and do not merge those branches back together during repair. The focused prompt-contract test passed; runtime confirmation still depends on the queued clean Bundesrat rerun after restart.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Coordinated_Branch_Atomicity_Prompt_Fix.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Coordinated Branch Repair-Pass Gating And Atomicity Debug -- [Standard] [open-items: yes]
**For next agent:** The C11b repair pass was mutating contract-approved coordinated-branch sets by forcing the full literal anchor back into one claim. `claim-extraction-stage.ts` now skips repair on contract-approved sets and `repair-anchor-selection.test.ts` covers that gate. This removed the structural collapse: dirty-build rerun `06706852...` produced the desired Parliament/Volk split with `rechtskräftig` preserved in both branches. However the final clean rerun `447cc942...` on `fd4d6abf` still regressed to one bundled claim at `stageAttribution: initial`, so the remaining problem is now unstable initial extraction / validation, not repair.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Coordinated_Branch_Repair_Pass_Gating_And_Atomicity_Debug.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Single-Claim Atomicity Enforcement Fix -- [Standard] [open-items: yes]
**For next agent:** Added a dedicated Stage-1 single-claim atomicity audit and then tightened its override semantics so any bundled coordinated-branch finding or explicit non-atomic judgment forces retry. The first clean rerun on `adff6e0b` still failed with one bundled claim, but the follow-up contradiction-guard fix succeeded on clean commit `4bdef2c1`: job `8537313effa74c98a0945636c69dbd42` finished `LEANING-TRUE 58/74` with `claimCount: 2`, both `Volk` and `Parlament` claims preserving `rechtskräftig`, and `contractValidationSummary.stageAttribution: "retry"`.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Single_Claim_Atomicity_Enforcement_Fix.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Daily Bug Scan Atomicity Gating Fix -- [Standard] [open-items: no]
**For next agent:** Post-run bug scan found one concrete regression from the new single-claim atomicity audit (`6edbc457`, tightened in `f287e427`): `test/unit/lib/analyzer/claimboundary-pipeline.test.ts` failed because Stage 1 was making an extra atomicity LLM call even when salience commitment was disabled. `apps/web/src/lib/analyzer/claim-extraction-stage.ts` now gates `shouldRunSingleClaimAtomicityValidation(...)` on successful salience commitment with at least one anchor, and `apps/web/test/unit/lib/analyzer/claim-contract-validation.test.ts` locks that behavior. Verification passed on the focused atomicity suites and the full pipeline unit suite; `apps/web/prompts/claimboundary.prompt.md` remained dirty from prior work and was not modified here.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Daily_Bug_Scan_Atomicity_Gating_Fix.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Bundesrat Stage 1 Prompt Review -- [Standard] [open-items: yes]
**For next agent:** Treat the safest prompt-only change as a cross-section `priority-anchor` invariant: order salience anchors by preservation priority, rank any truth-condition-bearing modifier on the thesis-defining main act ahead of branch-only temporal/conditional spans, and require Pass 2 / contract validation / single-claim atomicity to repeat that same modifier-bearing main-act wording in every in-scope branch claim while keeping the existing two-claim split. Do not remove runtime enforcement; the current prompt already says most of this, so the remaining instability is model variance that still needs `claim-extraction-stage.ts` contract/atomicity stabilization.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Bundesrat_Stage1_Prompt_Review.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Bundesrat Priority-Anchor Contract Fix -- [Significant] [open-items: yes]
**For next agent:** The narrow generic fix is now implemented: salience can emit priority anchors for truth-condition-bearing finality/binding-effect qualifiers, the contract validator and single-claim atomicity validator both receive the same salience payload, and the single-claim binding challenger only runs after the existing atomicity pass succeeds. The unsafe detached-modifier repair preference was removed. Local verification passed on the focused Stage 1 suites, the full `claimboundary-pipeline.test.ts` suite, and `npm -w apps/web run build`. The fix is committed at `ccb5336e`, with clean runtime `HEAD` `8e3d9542` after a separate housekeeping commit for the pre-existing lockfile diff. Clean reruns on `8e3d9542` confirmed the exact `rechtskräftig` input now splits into two claims twice (`7810fa9f1a0d4e10bc89f929fc5c3166`, `0487ca351dbb40948ece1b70ca31dfc3`), both preserving `rechtskräftig` in each branch claim. The sibling input rerun `46e6eec5b373489287136193bf2f181b` failed in Pass 1 because the Anthropic API reported insufficient credit, and the completed exact-input jobs later fell back to `UNVERIFIED` in Stage 4 for the same billing reason.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Bundesrat_Priority_Anchor_Contract_Fix.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Stage 2 Extraction Normalization Diagnostics -- [Standard] [open-items: yes]
**For next agent:** The local Stage 2 extraction observability patch was kept, but rewritten to use honest metric names. `research-extraction-stage.ts` now logs `Extraction normalizations` with structured counters for `claimIdMismatches`, `categoryNormalizations`, `categoryFallbackToEvidence`, `missingSourceUrlAssignments`, `unmatchedSourceUrlFallbacks`, and `contextualMappedToNeutral`, rather than the earlier vague `coercions` labels. `research-extraction-stage.test.ts` now locks the counter semantics with one focused extraction test. Verification passed on `npm -w apps/web exec vitest run test/unit/lib/analyzer/research-extraction-stage.test.ts` and `npm -w apps/web run build`. An unrelated pre-existing local edit in `apps/web/src/lib/input-policy-gate.ts` was left untouched and should not be bundled into this commit unless separately reviewed.

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Bolsonaro Target-Proceeding Scope Hardening -- [Standard] [open-items: yes]
**For next agent:** The remaining clean-commit English Bolsonaro `UNVERIFIED` regression was traced to same-system scope bleed, not a stale runtime and not primarily a foreign-government leak. `claimboundary.prompt.md` now forces the narrowest same-matter/same-proceeding-path reading for broad "the proceedings/the verdict" inputs, requires target-case artifact queries for legality/fair-trial claims, and keeps earlier or parallel proceedings, collateral inquiries, sanctions, impeachment efforts, and broader institutional controversies involving the same actors contextual unless the source explicitly bridges them into the target proceeding. Prompt-contract coverage was added in `claim-extraction-prompt-contract.test.ts` and `verdict-prompt-contract.test.ts`. Verification passed on the two focused prompt suites, `tsc --noEmit`, and `npm -w apps/web run build`. Still pending: commit, reseed on that commit, and submit a fresh live Bolsonaro EN rerun.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Bolsonaro_Target_Proceeding_Scope_Hardening.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Stage 2 File-Only Normalization Logging -- [Standard] [open-items: yes]
**For next agent:** The Stage 2 `Extraction normalizations` diagnostic no longer writes to stdout. `apps/web/src/lib/analyzer/debug.ts` now exposes `debugLogFileOnly(...)`, and `apps/web/src/lib/analyzer/research-extraction-stage.ts` uses it for the structured normalization counters so they still land in `debug-analyzer.log` without polluting console output. `apps/web/test/unit/lib/analyzer/research-extraction-stage.test.ts` now asserts the normalization diagnostic goes through the file-only path and not `debugLog(...)`. Verification passed on `npm -w apps/web exec vitest run test/unit/lib/analyzer/research-extraction-stage.test.ts` and `npm -w apps/web run build`. The unrelated pre-existing edit in `apps/web/src/lib/input-policy-gate.ts` remains out of scope and uncommitted.

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Daily Bug Scan No Confirmed Regression -- [Standard] [open-items: no]
**For next agent:** Scanned post-run commits `6e393155`, `ccb5336e`, `0bab97c4`, `2fe4f8eb`, `25e87e8d`, `bd7d8e32`, and `1324c0a6`. Targeted verification passed on `claim-contract-validation.test.ts`, `claimboundary-pipeline.test.ts`, `research-extraction-stage.test.ts`, `claim-extraction-prompt-contract.test.ts`, `verdict-prompt-contract.test.ts`, and `npm -w apps/web run build`, so there is no confirmed behavioral regression in this window. The only concrete diff issue was trailing whitespace in `apps/web/src/lib/analyzer/research-extraction-stage.ts` from `git diff --check`, which was intentionally skipped as non-behavioral.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Daily_Bug_Scan_No_Confirmed_Regression.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Bolsonaro Target-Object Applicability Guard Fix -- [Significant] [open-items: yes]
**For next agent:** The forward fix for the remaining Bolsonaro `UNVERIFIED` atomic claims is ready but not yet live-rerun-verified. `claimboundary.prompt.md` no longer reuses benchmark-shaped `"the proceedings" / "the case" / "the verdict"` steering language from commit `39c2d222`; the relevant Stage 1/2/4 rules now use generic target-object / target-path wording. `verdict-stage.ts` now forwards `applicability` into Stage 4 verdict prompting and direction validation/repair, rejects explicitly non-direct directional citations in `isVerdictDirectionPlausible(...)`, emits deterministic direction issues for them, and strips them from directional arrays before repair/revalidation. Focused verification passed on the Stage 1/4 suites, `tsc --noEmit`, and `npm -w apps/web run build`. Still pending: commit, restart services, and rerun the approved English Bolsonaro input so the new job records the committed hash.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Bolsonaro_Target_Object_Applicability_Guard_Fix.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Stage 2 Console Noise Cleanup -- [Standard] [open-items: yes]
**For next agent:** `research-extraction-stage.ts` no longer emits Stage 2 diagnostics through `console.warn`, `console.info`, or `debugLog(...)`. Relevance classification summaries, discard summaries, extraction fail-open notices, applicability summaries, and applicability fail-open notices now all route through `debugLogFileOnly(...)`, so they land in `debug-analyzer.log` without polluting stdout. `research-extraction-stage.test.ts` now also locks the applicability summary onto the file-only logger. Focused verification passed on `npm -w apps/web exec vitest run test/unit/lib/analyzer/research-extraction-stage.test.ts`; `npm -w apps/web run build` still prints unrelated SR-Eval/config startup lines outside this module. The unrelated pre-existing edit in `apps/web/src/lib/input-policy-gate.ts` remains out of scope and uncommitted.

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Dominant Proposition Aggregation And Reporting Review -- [Standard] [open-items: yes]
**For next agent:** Reviewed the proposed `dominantProposition` + independently checkable component-claim model as an aggregation/reporting problem. Current Stage 5 in `aggregation-stage.ts` is still a flat weighted-average system with a narrow Option G LLM adjudication path that only fires on mixed-direction direct claims, so it cannot correctly express `all_must_hold` parent semantics for same-direction component claims. The report/result shape is also flat: `CBClaimUnderstanding` stores only `atomicClaims`, `OverallAssessment` stores only `claimVerdicts`, `claimboundary-pipeline.ts` persists those directly, and both the jobs page and HTML export render a flat atomic-claim list / coverage matrix keyed only by claim IDs. Best recommendation: do not overload current `articleAdjudication`/`dominanceAssessment` for this concept. Introduce parent semantics as a new optional Stage-1 contract first (`dominantProposition: null | proposition` plus component-claim linkage and parent logic such as `all_must_hold`), then add a thin Stage-5 aggregator path that computes top-level truth from the parent when present while leaving child verdict generation unchanged. Only after that should report/UI surfaces expose the parent as the top-level verdict target with child claims beneath it.

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Dominant Proposition Architecture Plan — [Standard] [open-items: yes]
**For next agent:** Wrote the consolidated reviewed plan to [2026-04-20_Dominant_Proposition_Architecture_Plan.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-20_Dominant_Proposition_Architecture_Plan.md) and indexed it in [README.md](/c:/DEV/FactHarbor/Docs/WIP/README.md). The agreed shape is: optional `topLevelProposition` outside `atomicClaims`, child-only research/verdicting, internal-only soft checkability disposition for now, and a separate Stage-5 `all_must_hold` path when/if aggregation is enabled. Use the short Sonnet/Gemini prompts from the plan doc for external review, and do not treat the parent as another peer claim.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Dominant_Proposition_Architecture_Plan.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Dominant Proposition Plan Review Adjudication — [Standard] [open-items: yes]
**For next agent:** External review tightened the plan materially. Keep the core model, but use a safer rollout: Phase A is detection-only by default with `topLevelPropositionAggregationEnabled = false`, `evaluationMode` is dropped from the Phase A contract, `componentClaimIds` must be validated against the final post-retry `atomicClaims` set, and the prompt must explicitly block `topLevelProposition` on alternative-dimension inputs such as `Plastic recycling is pointless`. If parent-aware aggregation is added later, it must bypass the existing `dominanceAssessment` path and record `aggregationMode` plus `constrainingClaimId` in the adjudication trail. `articleThesis` and `topLevelProposition` must be documented as separate fields with distinct semantics.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Dominant_Proposition_Architecture_Plan.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Dominant Proposition Plan Review Findings Addressed — [Standard] [open-items: yes]
**For next agent:** The plan now addresses the lead-architect review directly. `topLevelProposition` must not only survive post-retry ID validation; it must also be semantically re-authorized during the final Stage 1 contract-validation refresh over the final accepted child set. Phase B now explicitly says any required child that is `UNVERIFIED`, `INSUFFICIENT`, confidence-`0`, or otherwise non-publishable forces the parent to a non-publishable `UNVERIFIED` outcome. The plan also now defines the needed parent-aware persistence/audit shape: `AdjudicationPath.path = "parent_all_must_hold"` plus a `parentAggregation` block with `aggregationMode`, `componentClaimIds`, `constrainingClaimId`, `unresolvedRequiredClaimIds`, and `publishable`. `articleThesis` is no longer implicitly hidden; keep it in diagnostics/export/admin surfaces even when `topLevelProposition` becomes the report headline.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Dominant_Proposition_Plan_Review_Adjudication.md

---
### 2026-04-20 | Lead Architect + LLM Expert | Codex (GPT-5) | Dominant Proposition Plan Review — [Standard] [open-items: yes]
**For next agent:** Revise the plan before coding. The three blockers are: final parent validity must be re-LLM-authorized against the final post-Gate-1 child set; `all_must_hold` must define `UNVERIFIED`/non-publishable child behavior; and Phase B needs an explicit new `OverallAssessment`/`AdjudicationPath` contract rather than overloading Option G shapes.
→ Docs/AGENTS/Handoffs/2026-04-20_Lead_Architect_LLM_Expert_Dominant_Proposition_Plan_Review.md

---
### 2026-04-20 | Lead Architect + LLM Expert | Codex (GPT-5) | Dominant Proposition Plan Re-Review — [Standard] [open-items: yes]
**For next agent:** The three original blockers are addressed. The only remaining note is non-blocking: when Phase B types are formalized, treat the `adjudicationPath` example as an extension to the current Option G contract unless you intentionally redesign that contract in the same change.
→ Docs/AGENTS/Handoffs/2026-04-20_Lead_Architect_LLM_Expert_Dominant_Proposition_Plan_Rereview.md

---
### 2026-04-20 | Lead Architect + LLM Expert | Codex (GPT-5) | Dominant Proposition Final Assessment — [Standard] [open-items: yes]
**For next agent:** The plan is approved for Phase A. Only one optional docs refinement remains: make the Phase B `AdjudicationPath` example explicitly additive to the current Option G contract unless a deliberate migration is specified.
→ Docs/AGENTS/Handoffs/2026-04-20_Lead_Architect_LLM_Expert_Dominant_Proposition_Final_Assessment.md

---
### 2026-04-20 | Lead Architect + LLM Expert | Codex (GPT-5) | Dominant Proposition Proceed Recommendation — [Standard] [open-items: yes]
**For next agent:** Phase A is still safe to proceed. The only remaining downstream-risk item is contract wording: the Phase B `adjudicationPath` snippet in [2026-04-20_Dominant_Proposition_Architecture_Plan.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-20_Dominant_Proposition_Architecture_Plan.md) must explicitly say whether it extends the live Option G `AdjudicationPath` fields in [types.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/types.ts:1403) or replaces them as part of the same change. Make that additive-vs-replacement decision explicit before Phase B coding.
→ Docs/AGENTS/Handoffs/2026-04-20_Lead_Architect_LLM_Expert_Dominant_Proposition_Proceed_Recommendation.md

---
### 2026-04-20 | Lead Developer + LLM Expert | Codex (GPT-5) | Dominant Proposition Phase B Migration Semantics -- [Standard] [open-items: yes]
**For next agent:** The dominant-proposition plan now includes an explicit `Phase B Migration Semantics` subsection in `Docs/WIP/2026-04-20_Dominant_Proposition_Architecture_Plan.md`: non-parent runs keep the live Option G `AdjudicationPath` unchanged, parent-aware runs use `path = "parent_all_must_hold"` plus `parentAggregation`, `articleAdjudication` stays absent there, and `directionConflict`, `llmAdjudication`, and `guardsApplied` cannot be dropped implicitly.
→ Docs/AGENTS/Handoffs/2026-04-20_Lead_Developer_LLM_Expert_Dominant_Proposition_PhaseB_Migration_Semantics.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Unverified Stage 1 Contract Stability Fix -- [Significant] [open-items: yes]
**For next agent:** `/report-review` confirmed the reports-page `UNVERIFIED` badges were real Stage 1 regressions, not UI drift. `claimboundary.prompt.md` now preserves explicit conjuncts in `multi_assertion_input` cases and keeps broad efficiency claims inside efficiency/system-boundary frames instead of operational proxies; `claim-extraction-stage.ts` now treats claim-set equivalence as order-insensitive and can carry forward a prior contract approval after final revalidation failure only when the final set is a subset of previously validated claims and all validated anchor carriers remain. Verification passed on `claim-contract-validation.test.ts`, `claim-extraction-prompt-contract.test.ts`, new `contract-revalidation-fallback.test.ts`, `tsc --noEmit`, and `npm -w apps/web run build`. Still pending: rerun jobs `8497c447cbf54ddbb11680cdab4ae906`, `a2be703ddd014cf69cdb345f0c076fb9`, and `f1afe3ad61754067bd4f1d8742bae7c6` on the current stack.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Unverified_Stage1_Contract_Stability_Fix.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Unverified Review Follow-up Fix -- [Standard] [open-items: yes]
**For next agent:** The two review findings on the Stage 1 stability patch are resolved. `canCarryForwardValidatedContractApproval(...)` now requires every previously validated thesis-direct claim to survive, not just anchor carriers, and the prompt’s efficiency guard was rewritten to generic wording without hydrogen/vehicle-shaped proxy examples. Verification passed on the same focused analyzer suites (`73 passed`), `tsc --noEmit`, and `npm -w apps/web run build`; `postbuild` reseeded active prompt state to hash `79442a030aca...`.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Unverified_Review_Followup_Fix.md

---
### 2026-04-20 | Lead Developer + LLM Expert | Codex (GPT-5) | Dominant Proposition Opus Follow-up -- [Standard] [open-items: yes]
**For next agent:** The dominant-proposition plan now incorporates the remaining useful Opus follow-ups without changing architecture: prompt work is ordered before validation/re-authorization, `topLevelProposition` requires at least two `componentClaimIds`, the prompt doctrine now distinguishes `articleThesis` from a falsifiable parent proposition, and Phase A explicitly monitors Pass 2 prompt-token/caching impact instead of treating prompt budget as a blocker.
→ Docs/AGENTS/Handoffs/2026-04-20_Lead_Developer_LLM_Expert_Dominant_Proposition_Opus_Followup.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Global Rule For Commit-Before-Batch And Runtime Refresh -- [Standard] [open-items: no]
**For next agent:** Root `AGENTS.md` now requires agents to commit before submitting any live analysis batch so job records map to a concrete revision, and to restart or reseed before submission whenever the runtime would otherwise still be stale. Apply this to future live reruns, validation batches, and report-review verification runs.

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Unverified Stage 1 Live Rerun Fix -- [Significant] [open-items: yes]
**For next agent:** The two current `UNVERIFIED` Stage 1 regressions are fixed forward and verified live on committed runtime `5f1a7446`: Swiss comparison rerun `9382cb2dc3714267b2bb9f24d8b20bbb` now finishes `LEANING-FALSE | 65`, and Portuguese Bolsonaro rerun `2d5db7022b944dca8cc72f2bc8ca5aae` now finishes `LEANING-TRUE | 55`. The concrete fix split is: comparison-side repair fidelity in `CLAIM_CONTRACT_REPAIR`, clean-only repair adoption in `claim-extraction-stage.ts`, and Gate 1 anchor-carrier restoration widened to contract-approved `initial` sets so thesis-direct conjuncts are not lost before flaky final revalidation.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Unverified_Stage1_Live_Rerun_Fix.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Report Review Overfit Scrub And Prompt Rule Clarification -- [Standard] [open-items: no]
**For next agent:** Root `AGENTS.md` now clarifies that concrete failing analyses are for diagnosis only and do not license benchmark-shaped prompt wording. `/report-review` now requires an explicit abstract-mechanism line plus a trigger-vocabulary scrub before a fix can survive, and the self-check now drops any proposal that reuses wording from the triggering job/input instead of the abstract failure mechanism.

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Prompt Audit Overfit Check Alignment -- [Standard] [open-items: no]
**For next agent:** `/prompt-audit` now checks the same diagnosis-vs-fix discipline: motivating cases are for diagnosis only, generic-hygiene now flags trigger-vocabulary reuse even when the wording is superficially generic, and each proposed fix must state an abstract mechanism. The audit table now treats benchmark-shaped reuse as a rule-1 violation.

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Bolsonaro AC_02 CB_01 Contradicting Evidence Audit -- [Standard] [open-items: yes]
**For next agent:** Narrow-audited live job `2369faac2e464221a124a2bf97c5916e` at the evidence-item level for `AC_02` inside `CB_01`. Only three `CB_01` items mapped to `AC_02` actually carry `claimDirection="contradicts"`: `EV_006` (Wikipedia broader Moraes controversy), `EV_032` (CSMonitor broader unilateral-decision / due-process concern), and `EV_024` (Al Jazeera panel-composition fact). `EV_006` and `EV_032` are already labeled `applicability="contextual"` and look correctly contextual rather than direct. `EV_024` is the only contradict row still labeled `direct`, but the statement itself only documents that Justice de Moraes sat on the panel; the stronger suspicion there is directional over-read, not a foreign-assessment leak. No `foreign_reaction` items were mapped to `AC_02`, and no U.S. State Department item was mapped into the `AC_02 / CB_01` subset despite the broader boundary description mentioning it. The strongest target-specific cautionary material in this boundary is actually carried by `direct` but `neutral` items such as `EV_015`, `EV_028`, and `EV_034` (Justice Fux dissent / jurisdiction objections). Current takeaway: this audit does **not** justify a broad applicability rewrite. If anything is tightened, it should be a narrow generic prompt refinement so target-specific descriptive facts about panel composition or forum assignment are not auto-read as contradiction unless the source explicitly ties them to a procedural/fairness defect in the target proceeding.

---
### 2026-04-21 | Unassigned | Codex (GPT-5) | Daily Bug Scan No Confirmed Regression -- [Standard] [open-items: yes]
**For next agent:** This scan covered the post-`2026-04-20T09:24:03Z` window and found no confirmed regression after reviewing verdict commits `f8ae0d44`, `a1353b82`, `f874e62e`, `c2f68884`, `972eb1c4`, `ace3c114` plus Stage 1 commits `08b3d771` and `5f1a7446`. Verification passed on `test/unit/lib/analyzer/verdict-stage.test.ts`, `test/unit/lib/analyzer/verdict-prompt-contract.test.ts`, and `npm -w apps/web run build`. If a later signal appears, start in `apps/web/src/lib/analyzer/verdict-stage.ts` around `validateVerdicts(...)` and `isVerdictDirectionPlausible(...)`.
→ Docs/AGENTS/Handoffs/2026-04-21_Unassigned_Daily_Bug_Scan_No_Confirmed_Regression.md

---
### 2026-04-21 | Unassigned | Codex (GPT-5) | Report Review Skill Restore Exact-Job-First -- [Standard] [open-items: yes]
**For next agent:** `/report-review` once again accepts full job URLs, inspects the exact requested jobs before comparators, and requires inspected-job evidence before prompt edits can be proposed as confirmed fixes.
→ Docs/AGENTS/Handoffs/2026-04-21_Unassigned_Report_Review_Skill_Restore_Exact_Job_First.md

---
### 2026-04-21 | Unassigned | Codex (GPT-5) | Report Review Cross-Tool Publication -- [Standard] [open-items: yes]
**For next agent:** `/report-review` is now published across the shared non-Claude discovery surfaces: `GEMINI.md`, `.gemini/skills/factharbor-agent/SKILL.md`, and `Docs/DEVELOPMENT/Claude_Code_Skills.md`. The canonical workflow remains `.claude/skills/report-review/SKILL.md`.
→ Docs/AGENTS/Handoffs/2026-04-21_Unassigned_Report_Review_Cross_Tool_Publication.md

---
### 2026-04-22 | Senior Developer | Codex (GPT-5) | SR Contract Risk Benefit Review -- [Significant] [open-items: yes]
**For next agent:** The April 20 SR contract-hardening commit should be kept, but not treated as the whole SR quality story. A live four-domain before/after comparison saved to `Docs/AGENTS/Handoffs/2026-04-22_Senior_Developer_SR_Contract_Risk_Benefit_Comparison.json` shows the patch correctly eliminates unsupported runtime tokens like `educational_platform`, `corporate_publisher`, and `corporate_interest`, while also exposing a separate unresolved issue: current SR classification still mis-buckets some corporate/educational sources into `unknown` or `collaborative_reference`, so score changes are partly live-evidence variance and partly broader semantic classification drift.
→ Docs/AGENTS/Handoffs/2026-04-22_Senior_Developer_SR_Contract_Risk_Benefit_Review.md

---
### 2026-04-21 | Unassigned | Codex (GPT-5) | Daily Bug Scan Report Review Publication No Regression -- [Standard] [open-items: no]
**For next agent:** Commit `51ede468` is the only post-`2026-04-21T06:00:17Z` change in scope and it is docs/workflow-only. `git show`, `git diff --check`, and cross-file reference checks found no concrete regression to fix; excluded uncommitted analyzer/test work remains out of scope for this run.
→ Docs/AGENTS/Handoffs/2026-04-21_Unassigned_Daily_Bug_Scan_Report_Review_Publication_No_Regression.md

---
### 2026-04-21 | Unassigned | Codex (GPT-5) | Report Review e5e6ec8d Anchor Override Fix -- [Standard] [open-items: yes]
**For next agent:** Hosted job `e5e6ec8da824491c8984a18505481ba7` and local job `ae6b54e96bda4a54a685731fddc099bc` were confirmed to be the same PDF URL on the same prompt hash/commit family. The bad hosted run died in Stage 1 because `evaluateClaimContractValidation(...)` treated an uncited article-level limitation anchor as a hard provenance failure and flipped `preservesContract` to false. `claim-extraction-stage.ts` now only fires that structural override when the validator actually cites anchor carrier IDs and none survive structural validation; a new focused regression test covers the uncited-meta-anchor case.
→ Docs/AGENTS/Handoffs/2026-04-21_Unassigned_Report_Review_e5e6ec8d_Anchor_Override_Fix.md

---
### 2026-04-21 | Unassigned | Codex (GPT-5) | Daily Bug Scan Uncommitted Anchor Override Fix Verified -- [Standard] [open-items: yes]
**For next agent:** Including uncommitted changes changes the scan result: the working tree contains a concrete Stage 1 bug fix already in progress in `claim-extraction-stage.ts`. The narrowed `noValidIds` guard and the new focused regression test are both validated locally; the only remaining step is a fresh rerun of the affected job/current stack.
→ Docs/AGENTS/Handoffs/2026-04-21_Unassigned_Daily_Bug_Scan_Uncommitted_Anchor_Override_Fix_Verified.md

---
### 2026-04-21 | Unassigned | Codex (GPT-5) | Benchmark Rerun Wave Five Candidates -- [Standard] [open-items: yes]
**For next agent:** Five approved benchmark inputs were rerun on committed runtime `eaacd9ce` to probe expectation gaps and challenging families. `asylum-235000-de` landed cleanly inside Captain's bands (`LEANING-TRUE | 70 | 68`), `asylum-wwii-de` now has its first current-stack result (`LEANING-FALSE | 38 | 65`), `plastic-en` avoided the old collapse but still drifted high on truth (`MIXED | 44 | 65`), and both Bundesrat variants remain materially out of band (`MOSTLY-TRUE | 72 | 76` and `TRUE | 97 | 89`).
→ Docs/AGENTS/Handoffs/2026-04-21_Unassigned_Benchmark_Rerun_Wave_Five_Candidates.md

---
### 2026-04-21 | Unassigned | Codex (GPT-5) | Report Review 1b52c739 Contract Retry Binding Fix -- [Standard] [open-items: yes]
**For next agent:** Exact job `1b52c73913634990b7cb99224e9d56cc` was a real Stage 1 collapse on the same commit/prompt that previously handled the same Iran input successfully. The forward fix in `claim-extraction-stage.ts` now escalates anchor-driven contract retries into salience-binding mode whenever the validator says a truth-condition anchor is present in the input but preserved by no claim IDs, so the retry Pass 2 cannot free-drift back into proxy background claims.
→ Docs/AGENTS/Handoffs/2026-04-21_Unassigned_Report_Review_1b52c739_Contract_Retry_Binding_Fix.md

---
### 2026-04-21 | Unassigned | Codex (GPT-5) | Report Review 1b52c739 Binding Retry Redesign Assessment -- [Standard] [open-items: yes]
**For next agent:** The expert review findings on the uncommitted binding-retry patch are valid. Do not ship the current boolean helper. Replace it with a builder that keys off `validPreservedIds` from the evaluated contract result and merges the validator-discovered anchor into the binding inventory before retry if the original salience list omitted it.
→ Docs/AGENTS/Handoffs/2026-04-21_Unassigned_Report_Review_1b52c739_Binding_Retry_Redesign_Assessment.md

---
### 2026-04-21 | Unassigned | Codex (GPT-5) | Report Review 1b52c739 Retry Salience Plan Fix -- [Standard] [open-items: yes]
**For next agent:** The unsafe raw-payload retry-binding helper is gone. Stage 1 now plans retry salience from the evaluated contract result: zero `validPreservedIds` on a present-in-input truth-condition anchor yields either merged binding-mode retry (when trustworthy upstream salience anchors exist) or audit-mode guidance-only retry (when they do not). The old `contractResult.inputAssessment.rePromptRequired = true` mutation was removed; retry gating now reads `evaluatedContract.effectiveRePromptRequired` directly.
→ Docs/AGENTS/Handoffs/2026-04-21_Unassigned_Report_Review_1b52c739_Retry_Salience_Plan_Fix.md

---
### 2026-04-21 | LLM Expert | Codex (GPT-5) | Debate Skill Structural Hardening -- [Significant] [open-items: yes]
**For next agent:** `/debate` now keeps its core adversarial architecture but adds a mandatory intake/structural-audit layer, manifest-based routing instead of proposition-keyword routing, structural-first role outputs, and auditable final sections (`Structural Audit`, `Rejected Arguments`, `Skipped Roles`). If another workflow calls it, pass `CONTEXT_MANIFEST` with evidence IDs and known gaps rather than a free-form context blob.
→ Docs/AGENTS/Handoffs/2026-04-21_LLM_Expert_Debate_Skill_Structural_Hardening.md

---
### 2026-04-22 | Senior Developer | Claude (Opus 4.7) | SR Contract Controlled Replay Stage 1 -- [Significant] [open-items: no]
**For next agent:** Plan v2.1 Stage 1 (Lite-Replay) executed. 54 runs (4 report domains × A2/B2 × 2 modes × 3 reps, plus `encyclopedia.ushmm.org` canonical × A2 × 2 modes × 3 reps) against the patched engine with frozen evidence packs and an isolated SR cache. Canonical control held at `highly_reliable` every run with score spread **0.03** (at the declared noise floor, zero category oscillation) — so the Stage 1 gate closes: **keep `403e905a`, do not escalate to Stage 2**. All 54 runs returned contract-valid payloads (canonical `sourceType` and `biasIndicator` tokens only). A2↔B2 deltas are pack-driven, not code-driven (`theglobeandmail.com` A2→B2 delta +0.02 in both modes, category match). Engine change is minimal and additive: `evaluateSourceWithPinnedEvidencePack` is now exported from `sr-eval-engine.ts`; `evaluateSourceWithConsensus` delegates after `buildEvidencePack` + enrichment (no production behavior change). Residual uncertainty: prompt-correction vs. evidence-change attribution requires Stage 2 (pre-patch worktree) and is deferred.
→ Docs/AGENTS/Handoffs/2026-04-22_Senior_Developer_SR_Contract_Replay_Stage1_Outcome.md

---
### 2026-04-22 | Lead Architect / LLM Expert | Codex (GPT-5) | Atomic Claim Selection Requirement Refinement -- [Standard] [open-items: yes]
**For next agent:** The improved requirement now fixes the main ambiguities: the chooser sits after today’s final Stage 1 claim set and before Stage 2, its candidates must be the exact current `understanding.atomicClaims`, LLM recommendation drives semantic preselection (max 3), user selection is capped at 5, and `Other` is a restart-before-claim-extraction path. Use hosted job `a59e4a6e1e184c22ad8055e34a52beeb` as the main acceptance anchor because the current live run produced 22 claims but only 6 non-`UNVERIFIED` verdicts.
→ Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_LLM_Expert_Atomic_Claim_Selection_Requirement_Refinement.md

---
### 2026-04-22 | Lead Architect / LLM Expert | Codex (GPT-5) | Atomic Claim Selection Debate -- [Standard] [open-items: yes]
**For next agent:** `/debate` resolved the architecture as `MODIFY`: keep the requirement semantics, but do not make the chooser a live post-Stage-1 job wait state. The safer v1 baseline is a pre-job draft/intake selection step over the exact current final `atomicClaims`. Important caveat from validation: the debate did not fully justify “non-interactive default,” only that interactive default is not yet proven.
→ Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_LLM_Expert_Atomic_Claim_Selection_Debate.md

---
### 2026-04-22 | Lead Architect | GitHub Copilot (GPT-5.4) | Atomic Claim Selection Interactive Default Resolved -- [Standard] [open-items: yes]
**For next agent:** Treat the earlier default-choice open item as settled: v1 is interactive by default, with `automatic` mode available only as an explicit non-interactive override. Keep the debate baseline intact: pre-job/intake chooser over the exact final `CBClaimUnderstanding.atomicClaims`, no live post-Stage-1 wait state, and `Other` as a fresh pre-Stage-1 restart.
→ Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_Atomic_Claim_Selection_Interactive_Default.md

---
### 2026-04-22 | Lead Architect | GitHub Copilot (GPT-5.4) | Atomic Claim Selection Implementation Spec -- [Standard] [open-items: yes]
**For next agent:** The April 22 handovers are now consolidated into one build-ready design: a pre-job `ClaimSelectionDraftEntity`, shared Stage 1 preparation reused by both draft prep and cold-start analysis, browser-local automatic-mode preference, same-draft `Other` restarts, invite-slot claim at draft creation, and prepared jobs that start at Stage 2 with persisted selection provenance. Start with `Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md` and implement backend draft scaffolding before touching the UI.
→ Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_Atomic_Claim_Selection_Implementation_Spec.md

---
### 2026-04-22 | Lead Architect | GitHub Copilot (GPT-5.4) | Atomic Claim Selection Implementation Spec Debate -- [Standard] [open-items: yes]
**For next agent:** A full-tier `/debate` on adopting the implementation spec as-is returned `MODIFY`. The baseline architecture stands, but the spec is now tightened to use one authoritative draft payload, minimal job-side selection metadata, explicit active-input typing on `Other` restarts, a 24-hour draft TTL, retry-within-same-quota semantics, and shared runner concurrency without requiring a full queue-generalization refactor.
→ Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_Atomic_Claim_Selection_Implementation_Spec_Debate.md

---
### 2026-04-22 | Senior Developer / DevOps Expert | GitHub Copilot (GPT-5.4) | Runner Admin Reads For Hidden Jobs -- [Standard] [open-items: yes]
**For next agent:** `internal-runner-queue.ts` now forwards `X-Admin-Key` on every runner-owned `/v1/jobs` read, closing the hidden-job 404 gap both at execution start and in queue recovery/orphan refresh paths. After rollout, restart the web runner and retry the exact failed asylum job; if it still fails, verify deployed `FH_ADMIN_KEY` first.
→ Docs/AGENTS/Handoffs/2026-04-22_Senior_Developer_DevOps_Expert_Runner_Admin_Reads_For_Hidden_Jobs.md

---
### 2026-04-22 | Unassigned | Codex (GPT-5) | Atomic Claim Selection Check-Worthiness Proposal -- [Standard] [open-items: yes]
**For next agent:** The spec now makes current `AtomicClaim.checkWorthiness` advisory only and replaces “use check-worthiness for preselection” with a dedicated batched LLM triage in section 8.2 of `Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md`. Implement recommendation as FCW/FNC/OPN-style triage plus ranking, not as a binary scalar or deterministic fallback.
→ Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Atomic_Claim_Selection_Check_Worthiness_Proposal.md

---
### 2026-04-22 | Unassigned | Codex (GPT-5) | Atomic Claim Selection Check-Worthiness Review Follow-up -- [Standard] [open-items: yes]
**For next agent:** The spec was narrowed after review: current Gate 1 is now described accurately, the four-label triage is explicitly provisional rather than a direct ZHAW transfer, the separate post-Gate-1 batched call is justified on audit/contract grounds, and the full recommendation snapshot must persist into `ClaimSelectionJson`.
→ Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Atomic_Claim_Selection_Check_Worthiness_Review_Followup.md

---
### 2026-04-22 | Lead Architect | Codex (GPT-5) | Implementation Order For Check-Worthiness Atomic Claim Selection And Dominant Claim -- [Standard] [open-items: yes]
**For next agent:** Treat the dependency chain as asymmetric: current Dominant Atomic Claim work is the most independent item because Stage 5 `articleAdjudication`/`dominanceAssessment` already exists in [aggregation-stage.ts](apps/web/src/lib/analyzer/aggregation-stage.ts) and the matching prompt/config surfaces already exist; Atomic Claim Selection is a new draft/prepared-job intake path over the exact current `CBClaimUnderstanding.atomicClaims`; and the approved Check-worthiness improvement is not a standalone Gate 1 rewrite but a post-Gate-1 batched ACS recommendation layer over that final candidate set. If “Dominant Atomic Claim” actually means the separate `topLevelProposition` proposal, move that to the end because ACS v1 explicitly excludes it.
→ Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_Implementation_Order_CheckWorthiness_AtomicClaimSelection_DominantClaim.md

---
### 2026-04-22 | Lead Architect | Codex (GPT-5) | Clarified Order For ACS Check-Worthiness And TopLevelProposition -- [Standard] [open-items: yes]
**For next agent:** The ambiguity is now resolved: “Dominant Atomic Claim” means the separate `topLevelProposition` proposal, not the existing Stage 5 `dominanceAssessment` path. The recommended order is therefore [Atomic Claim Selection](/c:/DEV/FactHarbor/Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md) first, Check-worthiness recommendation second as the ACS ranking layer, and [topLevelProposition](/c:/DEV/FactHarbor/Docs/WIP/2026-04-20_Dominant_Proposition_Architecture_Plan.md) third in Phase A detection-only form. Keep parent-aware aggregation out of the first wave.
→ Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_Clarified_Order_ACS_CheckWorthiness_TopLevelProposition.md

---
### 2026-04-22 | Lead Architect | Codex (GPT-5) | Debate On Check-Worthiness Before ACS -- [Standard] [open-items: yes]
**For next agent:** `/debate` returned `MODIFY`, not `ADOPT`: keep the non-Gate-1 part, reject the separately shipped pre-ACS service part. The winning shape is: recommendation remains a post-Stage-1 batched signal over final `CBClaimUnderstanding.atomicClaims`, but it should ship inside the ACS draft/prepared-job flow rather than as a standalone external contract; any earlier work should stay internal telemetry/prototyping only.
→ Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_Debate_CheckWorthiness_Before_ACS.md

---
### 2026-04-22 | Lead Architect | Codex (GPT-5) | Documentation Update For ACS Check-Worthiness And TopLevelProposition -- [Standard] [open-items: yes]
**For next agent:** The canonical docs are now aligned: the ACS spec explicitly says automatic mode makes the recommendation layer the effective post-Stage-1 selection filter while keeping Gate 1 authority unchanged; the same spec now rejects a standalone pre-ACS external Check-worthiness rollout; the dominant-proposition plan now explicitly follows ACS + recommendation rather than preceding it; and [Backlog.md](Docs/STATUS/Backlog.md) now carries the staged work as `ACS-1`, `ACS-CW-1`, and `TOPPROP-1`.
→ Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_Documentation_Update_ACS_CheckWorthiness_TopLevelProposition.md

---
### 2026-04-22 | Unassigned | Codex (GPT-5) | Atomic Claim Selection Spec Sequencing Reconcile -- [Standard] [open-items: yes]
**For next agent:** The spec was re-aligned with the newer ACS planning docs: it now treats itself as the canonical design for `ACS-1` plus in-flow `ACS-CW-1`, makes the internal build order foundation-first then recommendation-second, and keeps `TOPPROP-1` explicitly later and out of ACS semantics.
→ Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Atomic_Claim_Selection_Spec_Sequencing_Reconcile.md

---
### 2026-04-22 | Unassigned | Codex (GPT-5) | Check-Worthiness Recommendation Design Consolidation -- [Standard] [open-items: yes]
**For next agent:** A new consolidated design doc now exists at [2026-04-22_Check_Worthiness_Recommendation_Design.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-22_Check_Worthiness_Recommendation_Design.md). It fixes the topic around `ACS-CW-1`: advisory live field, post-Gate-1 ACS recommendation contract, `ACS-1` foundation as prerequisite, fail-closed behavior, and `TOPPROP-1` explicitly later.
→ Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Check_Worthiness_Recommendation_Design_Consolidation.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Fragment-Aware HTML Extraction Fix -- [Standard] [open-items: yes]
**For next agent:** The shared retrieval path now preserves `#fragment` scope for HTML pages by bounding extraction to the first meaningful ancestor inside the main-content root and collapsing adjacent duplicate lines, which fixes the real Grander FAQ failure class without site-specific rules. Unit test `apps/web/test/unit/lib/retrieval.test.ts` and `next build` both passed, and a live retrieval-only probe on the Grander URL dropped extracted text to `1249` chars with only one copy of the targeted heading and no earlier FAQ entries.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Fragment_Aware_HTML_Extraction_Fix.md

---
### 2026-04-22 | Unassigned | Codex (GPT-5) | Check-Worthiness Service Reuse Refinement -- [Standard] [open-items: yes]
**For next agent:** The consolidated check-worthiness doc now explicitly says the new ACS recommendation module should be shaped as an internal reusable service for later Atomic Claim Extraction reuse, and it now makes the semantic mapping to ZHAW/ViClaim FCW/FNC/OPN explicit while keeping `unclear` as a FactHarbor control state and preserving the ACS-first rollout.
→ Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Check_Worthiness_Service_Reuse_Refinement.md

---
### 2026-04-22 | Unassigned | Codex (GPT-5) | Check-Worthiness Lead Developer Review Disposition -- [Standard] [open-items: yes]
**For next agent:** The consolidated design doc was tightened after Lead Developer review: field wording now says “coarse extraction-time signal” rather than “advisory only,” model-tier use of `context_refinement` now carries an escalation gate, inputs now explicitly require full `AtomicClaim` objects, automatic `max 3` vs interactive `max 5` is now justified, `unclear` promotion now uses an uncovered-dimension rule, and retry is now bounded. I did not rewrite the doc around `applyGate1Lite()` as an active path because repo search found no live call sites for that helper.
→ Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Check_Worthiness_Lead_Developer_Review_Disposition.md

---
### 2026-04-22 | Unassigned | Codex (GPT-5) | Check-Worthiness Senior Architect LLM Expert Findings Disposition -- [Standard] [open-items: yes]
**For next agent:** The consolidated design doc now hardens fail-closed behavior at the contract level: the recommendation module must enforce one assessment per candidate, a full ranked permutation of candidate ids, ordered-subset rules for `recommendedClaimIds`, and non-empty rationales before persistence or downstream use. Soft-refusal-shaped empty/partial outputs now explicitly count as recommendation failure and follow the bounded retry/fail-closed path.
→ Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Check_Worthiness_Senior_Architect_LLM_Expert_Findings_Disposition.md

---
### 2026-04-22 | Unassigned | Codex (GPT-5) | Check-Worthiness Review Disposition Appendix -- [Standard] [open-items: no]
**For next agent:** The consolidated design doc now includes a short in-document review-disposition appendix summarizing accepted findings, resulting contract changes, the intentional flexibility around empty `recommendedClaimIds`, and links to the full review-disposition handoffs.
→ Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Check_Worthiness_Review_Disposition_Appendix.md

---
### 2026-04-22 | Lead Architect | Codex (GPT-5) | Final Review Of ACS Check-Worthiness And TopLevelProposition Documentation -- [Standard] [open-items: yes]
**For next agent:** The high-level sequencing is now coherent across the ACS spec, dominant-proposition plan, and backlog: ACS foundation first, Check-worthiness as the in-flow recommendation layer second, and `topLevelProposition` later. Two document-level gaps remain before implementation starts: the ACS spec lists a public `/retry` draft route but omits the matching Next.js proxy route in section 7.2, and the backlog now places the new medium-urgency `ACS-1` / `ACS-CW-1` rows below a low-urgency architecture row despite declaring urgency-sorted ordering.
→ review references: [2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md), [2026-04-20_Dominant_Proposition_Architecture_Plan.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-20_Dominant_Proposition_Architecture_Plan.md), [Backlog.md](/c:/DEV/FactHarbor/Docs/STATUS/Backlog.md)

---
### 2026-04-22 | Lead Architect | Codex (GPT-5) | Review Findings Disposition For ACS Docs -- [Standard] [open-items: no]
**For next agent:** The two final-review findings are now closed. The ACS spec now mirrors the documented public retry endpoint with `app/api/fh/claim-selection-drafts/[id]/retry/route.ts` in section 7.2, and the backlog’s technical-debt section now places `ACS-1` / `ACS-CW-1` ahead of the low-urgency architecture rows so the file’s stated urgency ordering is true again.
→ updated docs: [2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md), [Backlog.md](/c:/DEV/FactHarbor/Docs/STATUS/Backlog.md)

---
### 2026-04-22 | Unassigned | Codex (GPT-5) | Atomic Claim Selection Lead Developer Review Disposition -- [Standard] [open-items: yes]
**For next agent:** The Lead Developer implementation review is now reflected in the ACS spec: Stage 1 prep is defined as the full cold-start boundary, prepared jobs must persist and reuse `PreparedStage1Snapshot.resolvedInputText`, draft-row lifecycle columns are the queryable truth while `DraftStateJson` is the rich-detail store, expiry is lazy in v1, and the spec now explicitly warns that draft-time invite-slot claiming cannot reuse the current jobs-only hourly count in `TryClaimInviteSlotAsync(...)` unchanged. The ACS spec and CW design doc also now point to `apps/web/src/lib/analyzer/types.ts` as the canonical home for recommendation contract types.
→ Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Atomic_Claim_Selection_Lead_Developer_Review_Disposition.md

---
### 2026-04-22 | Unassigned | Codex (GPT-5) | ACS-1 Implementation Takeover Fixes -- [Standard] [open-items: yes]
**For next agent:** The ACS-1 takeover patch replaces the draft worker TODO with a real Stage 1 preparation path, adds prepared-job reuse via `PreparedStage1Snapshot`, makes draft confirm/job creation transactional, validates selected IDs against `preparedStage1.preparedUnderstanding.atomicClaims`, and splits `PreparedStage1Json` from `ClaimSelectionJson` correctly. Invite hourly accounting now counts draft creations plus direct jobs without double-counting confirmed drafts. Remaining intentional gap: `ACS-CW-1` still needs to replace the temporary automatic-mode fallback for drafts with more than 5 surviving claims.
→ Docs/AGENTS/Handoffs/2026-04-22_Unassigned_ACS1_Implementation_Takeover_Fixes.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Claim Selection Dialog Slow Path Diagnosis -- [Standard] [open-items: yes]
**For next agent:** The current ACS dialog slowdown is upstream of recommendation. Live draft `2698064e48b446aa8b6a7d69d40ce504` stayed at progress `24` for >200s on the Iran Wikipedia URL while Stage 1 contract validation failed twice and forced a conservative Pass 2 retry; recommendation does not start until progress `32` in `internal-runner-queue.ts`.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Claim_Selection_Dialog_Slow_Path_Diagnosis.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Automatic Mode Auto-Confirm And Safe Source Reuse -- [Significant] [open-items: yes]
**For next agent:** Automatic mode now skips the chooser UI after recommendation when a non-empty recommended set exists, empty extracted PDFs classify as `pdf_parse_failure`, and same-job exact-match reuse is enabled only for document/data sources while HTML refetch still preserves follow-up discovery. The first review found two regressions in the new code path; both were fixed, and the reviewer re-pass reported no remaining findings.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Automatic_Mode_Auto_Confirm_And_Safe_Source_Reuse.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Claim Selection Slow Path Debate -- [Standard] [open-items: yes]
**For next agent:** Debate result was `MODIFY`: keep Stage 1 retry cost plus coarse progress visibility as the primary root cause, but widen the first fix to measure both Stage 1 sub-steps and recommendation in the same patch while surfacing Stage 1 milestones in the UI.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Claim_Selection_Slow_Path_Debate.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Claude Opus Slow Path Review Verification -- [Standard] [open-items: yes]
**For next agent:** Claude Opus was directionally right on the root cause, but one review claim was too optimistic: `recordLLMCall(...)` exists in the recommendation module, yet draft preparation does not run inside `runWithMetrics(...)`, so persisted recommendation timings are not established for drafts. More importantly, draft `eventMessage` text is accepted by the internal API but dropped by `ClaimSelectionDraftService.UpdateStatusAsync(...)`, so milestone visibility requires API/service/UI work, not just progress-bar tuning.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Claude_Opus_Slow_Path_Review_Verification.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Claim Selection Slow Path Implementation Plan Review -- [Standard] [open-items: yes]
**For next agent:** The debated plan landed as `MODIFY`: keep the instrumentation-first slice, but make `ClaimSelectionDraftState.observability` the authoritative prep-telemetry contract and keep row-level `LastEventMessage` as live UI convenience only. First patch should add truthful Stage 1 milestones, separated draft timings, and a surfaced latest milestone message, while deferring recommendation optimization and polling/SSE changes until measurements exist.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Claim_Selection_Slow_Path_Implementation_Plan_Review.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Deferred Stage 2 URL Content Reuse Note -- [Standard] [open-items: yes]
**For next agent:** The backlog now records Stage 2 URL/content reuse as a deferred production optimization, not an Alpha verification change. The first allowed slice is tightly scoped: UCM-gated and default-off, exact canonical-URL matches only within the same job, reuse limited to fetched raw content and parsed artifacts, required hit/miss observability, and explicit exclusion of cross-job cache plus heuristic/semantic dedupe in v1.
→ updated backlog: [Backlog.md](/c:/DEV/FactHarbor/Docs/STATUS/Backlog.md)

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | ACS Auto-Continue Recovery Fix -- [Significant] [open-items: yes]
**For next agent:** Drafts with four or fewer prepared claims no longer stop on the selection page if they leak into `AWAITING_CLAIM_SELECTION`. The page now auto-confirms once on load and redirects into the job, and only shows a retry continuation button if that automatic continuation actually fails. The broader Grander follow-up options are documented in `Docs/WIP/2026-04-23_Grander_Runtime_Followup_Options.md`.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_Auto_Continue_Recovery_Fix.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | ACS UCM Selection Cap -- [Significant] [open-items: no]
**For next agent:** `pipeline.claimSelectionCap` is now the single runtime knob for ACS manual-review threshold, max selected claims, and max LLM recommendations. The resolved value is persisted in `ClaimSelectionDraftState.selectionCap`, consumed by [internal-runner-queue.ts](/c:/DEV/FactHarbor/apps/web/src/lib/internal-runner-queue.ts), [page.tsx](/c:/DEV/FactHarbor/apps/web/src/app/analyze/select/[draftId]/page.tsx), and enforced on confirm in [ClaimSelectionDraftService.cs](/c:/DEV/FactHarbor/apps/api/Services/ClaimSelectionDraftService.cs).
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_UCM_Selection_Cap.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Runner Queue Split For Session Preparation -- [Significant] [open-items: yes]
**For next agent:** Session preparation no longer shares the exact same runner lane as full report jobs. [internal-runner-queue.ts](/c:/DEV/FactHarbor/apps/web/src/lib/internal-runner-queue.ts) now resolves separate job and prep concurrency budgets, with the prep lane defaulting to `1` unless `FH_RUNNER_PREP_MAX_CONCURRENCY` says otherwise. This means queued sessions can start Stage 1 preparation even while the report-job lane is saturated. Remember that this is a runtime/env change: restart the web runner to activate it, and if total parallel load should stay tighter than “jobs + 1 prep lane”, set the explicit split env vars rather than relying on legacy fallback behavior.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Runner_Queue_Split_For_Session_Preparation.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Code Review Disposition - Claim Selection And Check Worthiness -- [Standard] [open-items: no]
**For next agent:** External code review for the Claim Selection Draft and Check-Worthiness slices came back as approve-only with low-severity positive observations and no actionable defects. No product code changes were needed; this handoff is the repository-local approval record.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Code_Review_Disposition_Claim_Selection_Check_Worthiness.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | ACS Auto-Confirm And Job Progress Polling Fix -- [Significant] [open-items: no]
**For next agent:** Auto-continue drafts no longer commit a leaked `AWAITING_CLAIM_SELECTION` stop state before creating the final job. The runner now uses the internal atomic auto-confirm path, and the jobs list/detail pages merge polled snapshots defensively so stale responses cannot drag visible progress backward or keep it pinned at `0%`.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_Auto_Confirm_And_Job_Progress_Polling_Fix.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Bundesrat MT-5(C) Recovery And Preparing UI Copy -- [Significant] [open-items: yes]
**For next agent:** The Bundesrat under-splitting was not caused by ACS. The live failure path was Stage 1 skipping `MT-5(C)` after a contract-approved one-claim set, even though `distinctEvents` stayed high. `claim-extraction-stage.ts` now reopens that path only when salience commitment succeeded, reruns the retry in binding mode, and accepts the expanded set only after clean contract revalidation. The `/analyze/select/[draftId]` page also now uses `Preparing Analysis` during `PREPARING`/auto-continue states and reserves `Atomic Claim Selection` for true manual selection.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Bundesrat_MT5C_Recovery_And_Preparing_UI_Copy.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Preparation UI Info And Utility Pass -- [Significant] [open-items: yes]
**For next agent:** The preparation page now exposes the active analysis input, basic session metadata, copy actions, and a raw JSON viewer. Draft-token holders can read the input text again, not just admins. The next meaningful UX step would be a real draft-event history API if the page should gain an `Events` view comparable to the job screen.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Preparation_UI_Info_And_Utility_Pass.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Preparation UI Header Parity With Job Page -- [Significant] [open-items: yes]
**For next agent:** The preparation page’s custom hero was removed. The upper section now reuses the job page’s action-row and report-surface header pattern, drops visible `mode` fields, and uses the shared `InputBanner` for the active analysis input. No fake draft `hide` action was added; only real draft actions (`retry`, `cancel`) were surfaced in the top-right control cluster.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Preparation_UI_Header_Parity_With_Job_Page.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Draft Hide From Start -- [Significant] [open-items: yes]
**For next agent:** Hide now exists at the claim-selection draft layer and propagates into the eventual job. The preparation page shows an admin-only eye toggle from the start, `ClaimSelectionDraftEntity` persists `IsHidden`, and linked jobs inherit or mirror that state. The first EF-generated migration for this change was wrong and was manually corrected to a minimal `ADD COLUMN IsHidden` migration plus matching SQL.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Draft_Hide_From_Start.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | ACS Idle Auto-Proceed Timer -- [Significant] [open-items: yes]
**For next agent:** Manual atomic-claim selection sessions can now auto-continue after a UCM-configurable idle window via `pipeline.claimSelectionIdleAutoProceedMs` (default `180000`, `0` disables). The session page fetches the normalized timeout from `/api/fh/claim-selection-settings`, resets the countdown on every checkbox interaction attempt, and auto-confirms the last valid selection when the timer expires.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_Idle_Auto_Proceed_Timer.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | ACS Idle Auto-Proceed Timer Server-Owned Finalization -- [Significant] [open-items: no]
**For next agent:** The idle auto-proceed path is now server-owned, so manual claim-selection sessions can continue even after the browser closes. `ClaimSelectionDraftState` persists `selectionIdleAutoProceedMs`, `lastSelectionInteractionUtc`, and the last valid `selectedClaimIds`; the public session API accepts selection-activity pings; and the runner watchdog sweeps due `AWAITING_CLAIM_SELECTION` sessions through the internal auto-confirm path. This supersedes the earlier page-only timer design.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_Idle_Auto_Proceed_Timer.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | ACS Session Code Review Disposition -- [Significant] [open-items: yes]
**For next agent:** External review found two real idle-timeout issues and one residual test-gap note. The code now blocks stale due-snapshot auto-confirms via timestamp compare-and-confirm in `ClaimSelectionDraftService`, starts the manual inactivity timer when the selection screen is actually opened, and keeps legacy sessions visually honest by disabling the countdown when no persisted timeout exists. The remaining low-risk gap is missing direct backend tests because this repo still has no API test project.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_Session_Code_Review_Disposition.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | FactHarbor Statutes Challenger Position -- [Standard] [open-items: yes]
**For next agent:** The challenger conclusion is that the statutes are not "ready as-is" mainly because [Docs/Legal/DRAFT_Vereinsstatuten_FactHarbor_DE.md](/c:/DEV/FactHarbor/Docs/Legal/DRAFT_Vereinsstatuten_FactHarbor_DE.md) `Art. 24` overreaches beyond the evidence-backed minimum: no official Zurich blessing of the exact open-by-default IP wording, no assignment-template implementation path, and `URG Art. 16-17` cuts against broad automatic vesting. `Art. 18` is comparatively defensible if kept tightly tied to recusal and reasonable compensation controls.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_FactHarbor_Statutes_Challenger_Position.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | FactHarbor Statutes Art. 18 / Art. 24 Hardening -- [Standard] [open-items: yes]
**For next agent:** [DRAFT_Vereinsstatuten_FactHarbor_DE.md](/c:/DEV/FactHarbor/Docs/Legal/DRAFT_Vereinsstatuten_FactHarbor_DE.md) and [DRAFT_Vereinsstatuten_FactHarbor_EN.md](/c:/DEV/FactHarbor/Docs/Legal/DRAFT_Vereinsstatuten_FactHarbor_EN.md) now narrow `Art. 24` from automatic ownership to rights acquisition / written assignment-or-licence mechanics, keep `Open by Default` only where the association actually holds the necessary rights, and harden `Art. 18` with written-contract, pricing, and full-lifecycle recusal guardrails for paid board-member roles. The remaining legal follow-up is contractual implementation, not another statutes-only rewrite.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_FactHarbor_Statutes_Art18_Art24_Hardening.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | ACS Session Review Follow-Up: Locale And Visibility Route Coverage -- [Standard] [open-items: yes]
**For next agent:** A later external review turned out to be partly stale after the server-owned idle-timeout fixes, but two follow-ups were still worth landing. [page.tsx](/c:/DEV/FactHarbor/apps/web/src/app/analyze/select/[draftId]/page.tsx) no longer hardcodes `en-GB` for preparation-page timestamps and now uses the browser locale, while [claim-selection-drafts-routes.test.ts](/c:/DEV/FactHarbor/apps/web/test/unit/app/api/fh/claim-selection-drafts-routes.test.ts) now covers the `hide` and `unhide` proxy routes explicitly. The remaining residual risk is still the same one noted in the earlier review disposition: there is no dedicated API-side test harness yet for direct backend coverage of the session idle auto-proceed state machine.

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Verdict Citation Sanitation And SR Sparse Early Exit -- [Significant] [open-items: yes]
**For next agent:** Two deferred Grander follow-ups were revisited as low-hanging slices. [verdict-stage.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/verdict-stage.ts) now reverts a challenge-adjusted verdict to the advocate state when phantom-ID cleanup empties the decisive citation side, instead of carrying a partially grounded adjustment forward. [sr-eval-engine.ts](/c:/DEV/FactHarbor/apps/web/src/lib/source-reliability/sr-eval-engine.ts) now skips sequential refinement only for primary `insufficient_data` / `score = null` cases with effectively sparse grounding (empty pack, single item, or zero grounded citations). The cache layer discussed in the original SR idea was intentionally not implemented because it is not low-hanging.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Verdict_Citation_Sanitation_And_SR_Sparse_Early_Exit.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | FactHarbor Statutes Remove Paid Board Operational Roles -- [Standard] [open-items: yes]
**For next agent:** [DRAFT_Vereinsstatuten_FactHarbor_DE.md](/c:/DEV/FactHarbor/Docs/Legal/DRAFT_Vereinsstatuten_FactHarbor_DE.md) and [DRAFT_Vereinsstatuten_FactHarbor_EN.md](/c:/DEV/FactHarbor/Docs/Legal/DRAFT_Vereinsstatuten_FactHarbor_EN.md) no longer permit paid operational board-member roles. `Art. 18(4)` now states the opposite rule: during their term, board members may not perform paid operational activities for the association outside the board function under employment, contractor, or comparable arrangements. This removes the main Zurich-focused dual-role filing risk identified in the second debate, but it does not by itself resolve any separate question about whether the board minimum should remain at `2`.

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | FactHarbor Statutes Finalization And Draft-Status Removal -- [Standard] [open-items: yes]
**For next agent:** The statutes were finalized as separate governing documents and renamed to [Vereinsstatuten_FactHarbor_DE.md](/c:/DEV/FactHarbor/Docs/Legal/Vereinsstatuten_FactHarbor_DE.md) and [Vereinsstatuten_FactHarbor_EN.md](/c:/DEV/FactHarbor/Docs/Legal/Vereinsstatuten_FactHarbor_EN.md). The embedded founding-record and draft-review sections were removed from the statutes because the founding protocol now lives separately in [Gruendungsprotokoll_FactHarbor_2026-04-23.md](/c:/DEV/FactHarbor/Docs/Legal/Gruendungsprotokoll_FactHarbor_2026-04-23.md) / `.pdf`, the German file no longer carries `ENTWURF`, and the English reference translation now points to the final German filename and has the adopted date filled in. Live references in the legal/checklist/xwiki docs were updated to the final filenames and post-founding status. Remaining legal follow-up is limited to operational matters such as Handelsregister / tax filing package completeness and whether the 2-person board should later be expanded for governance resilience.

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | FactHarbor Statutes PDF Export And Signature Clarification -- [Standard] [open-items: yes]
**For next agent:** PDF exports were generated at [Vereinsstatuten_FactHarbor_DE.pdf](/c:/DEV/FactHarbor/Docs/Legal/Vereinsstatuten_FactHarbor_DE.pdf) and [Vereinsstatuten_FactHarbor_EN.pdf](/c:/DEV/FactHarbor/Docs/Legal/Vereinsstatuten_FactHarbor_EN.pdf), with the checklist status kept aligned to the already-held founding package. Zurich Handelsregister guidance confirms that the statutes must be dated and signed by one board member for filing, but it does not require every page to be signed; the remaining practical follow-up is whether to add a visible signature block to the statutes source or sign the printed/PDF final version manually before submission.

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | FactHarbor Statutes Signature Block And Updated DE PDF -- [Standard] [open-items: yes]
**For next agent:** The binding German statutes now include a formal end-of-document signature block in [Vereinsstatuten_FactHarbor_DE.md](/c:/DEV/FactHarbor/Docs/Legal/Vereinsstatuten_FactHarbor_DE.md). The original `Vereinsstatuten_FactHarbor_DE.pdf` could not be overwritten because another process had the file open, so the refreshed PDF with the signature block was emitted as [Vereinsstatuten_FactHarbor_DE_unterschriftsfassung.pdf](/c:/DEV/FactHarbor/Docs/Legal/Vereinsstatuten_FactHarbor_DE_unterschriftsfassung.pdf). If the canonical filename matters later, close the open PDF handle and re-render or rename deliberately.

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | NPO Formation Checklist International Recognition Update -- [Standard] [open-items: yes]
**For next agent:** [NPO_Formation_Checklist.md](/c:/DEV/FactHarbor/Docs/Legal/NPO_Formation_Checklist.md) now states the actual recognition stack explicitly: Zurich commercial-register entry, Zurich tax exemption, then Goodstack / TechSoup / Candid, with NGOsource ED only when U.S. foundation fundraising becomes relevant. The checklist now includes an exact ordered next-step section from the current post-founding state, updates the Handelsregister filing details to match the official Zurich process more closely, and adds a compact official-source block at the end.

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | NPO Formation Checklist Handelsregister Filing Pack -- [Standard] [open-items: yes]
**For next agent:** [NPO_Formation_Checklist.md](/c:/DEV/FactHarbor/Docs/Legal/NPO_Formation_Checklist.md) now includes a concrete Zurich Handelsregister submission pack for FactHarbor under the official-registration phase: exact required / conditional documents, explicit use of the current statutes and protocol file paths, and a recommended assembly order for finalizing signatures, acceptance declarations, board-constitution minutes, signature certifications, and the registration form. The remaining operational question is whether the founders want to rely on the existing founding protocol for board election acceptance or create a separate acceptance declaration to reduce filing risk.

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Session And Job Read-Route Queue Recoverability -- [Significant] [open-items: yes]
**For next agent:** The queue hang was not normal capacity pressure. In the live Next runtime, the background drain/watchdog path was not sufficient on its own, so queued sessions and stale running jobs could sit indefinitely. The fix was to make the UI-polled read routes kick recovery opportunistically: [claim-selection-drafts/[draftId]/route.ts](/c:/DEV/FactHarbor/apps/web/src/app/api/fh/claim-selection-drafts/[draftId]/route.ts) now triggers `drainDraftQueue()`, and [jobs/route.ts](/c:/DEV/FactHarbor/apps/web/src/app/api/fh/jobs/route.ts) plus [jobs/[id]/route.ts](/c:/DEV/FactHarbor/apps/web/src/app/api/fh/jobs/[id]/route.ts) now trigger `drainRunnerQueue()`. This recovered the real stuck session `5a6162785b434263852b513d37a159de` and resumed progress on job `a5f79bc1d8e545ceab8d80dc3df0fe12`. The remaining queued final jobs are expected because the local env still has `FH_RUNNER_MAX_CONCURRENCY=1`.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Session_And_Job_Read_Route_Queue_Recoverability.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Session Preparation Text-First Follow-On Debate -- [Standard] [open-items: yes]
**For next agent:** Debate result was `MODIFY`: pursue a text-first session-preparation path only as a post-`ACS-1` architecture track, not as an ACS v1 semantic change. The target design is text-first extraction + bounded retry + Gate 1 + recommendation/selection, with preliminary evidence retained only as a structural validator-triggered Stage 1 rescue and universal rollout gated on shadow parity for both Stage 1 claim quality and downstream report quality.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Session_Preparation_Text_First_Follow_On_Debate.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Session Preparation Text-First Proposal Document -- [Standard] [open-items: yes]
**For next agent:** The debate result is now documented as a concrete `ACS-vNext` proposal in [2026-04-23_Session_Preparation_Text_First_Follow_On_Proposal.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-23_Session_Preparation_Text_First_Follow_On_Proposal.md). The key guard is unchanged: text-first default plus bounded structural rescue is a follow-on design track only, with shadow validation required before any rollout.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Session_Preparation_Text_First_Proposal_Document.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Session Preparation Semantics-Preserving Async Proposal -- [Standard] [open-items: yes]
**For next agent:** The active recommendation has changed. Keep current evidence-seeded Stage 1 semantics unchanged and solve the user problem with async session UX, a private active-sessions surface, readiness notifications, exact-result reuse under an identical analytical contract, and same-semantics Stage 1 hardening. The text-first redesign note remains only as retired historical context.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Session_Preparation_Semantics_Preserving_Async_Proposal.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Session Preparation Semantics-Preserving Async Proposal Review -- [Standard] [open-items: yes]
**For next agent:** The proposal holds up as the right direction for the async user-interaction problem because it builds on the current draft/prepared-job path and leaves Stage 1 semantics untouched. The main guard is Phase 2 reuse for URL inputs: exact URL alone is not semantics-complete because prepared snapshots depend on `resolvedInputText`, so reuse must include resolved-content identity or a freshness revalidation rule. Also keep the first inbox scoped honestly as same-browser resumability, not cross-device recovery.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Session_Preparation_Semantics_Preserving_Async_Proposal_Review.md

---
### 2026-04-24 | Unassigned | Codex (GPT-5) | Selection Readiness Root Cause Plan Review Disposition -- [Significant] [open-items: yes]
**For next agent:** The active selection-readiness plan is now in [Docs/WIP/2026-04-24_Selection_Readiness_Root_Cause_And_Fix_Plan.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-24_Selection_Readiness_Root_Cause_And_Fix_Plan.md) and has been review-tightened. The key correction is sequencing: the strongest currently measured blocker is Stage 1 latency before selection, not repeated broad-input contract-preservation failure. Broad-input Stage 1 quality remains a real secondary investigation track, but only on concrete failing packets. The final priority order is latency first, quality investigation second, log attribution third.
→ Docs/AGENTS/Handoffs/2026-04-24_Unassigned_Selection_Readiness_Root_Cause_Plan_Review_Disposition.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | ACS Default Interactive Mode via UCM -- [Significant] [open-items: yes]
**For next agent:** The `/analyze` web submit path no longer hardcodes `automatic` claim-selection mode. A new pipeline UCM field, `claimSelectionDefaultMode`, now controls the effective default and currently defaults to `interactive`. The draft-create proxy resolves the effective mode server-side and returns it to the client, so sessions created from `/analyze` now surface the manual AC Selection dialog again when the candidate-claim threshold is reached, while still preserving 15-minute idle auto-continue.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_Default_Interactive_Mode_UCM.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Session Preparation Semantics-Preserving Async Proposal Finalized After Review Debate -- [Standard] [open-items: yes]
**For next agent:** The async-preparation plan is now implementation-ready and review-narrowed. Phase 1 is explicitly same-browser async resumability only: private active-session surface, readiness signaling, and inbox safeguards while keeping Stage 1 semantics unchanged and draft access tokens in `sessionStorage`. Cross-draft prepared-result reuse and browser-persistent resume are now explicitly deferred to separate correctness/privacy review tracks instead of being treated as default follow-ons.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Session_Preparation_Semantics_Preserving_Async_Proposal.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Session Preparation Async Proposal Review Cleanup -- [Standard] [open-items: yes]
**For next agent:** The follow-up review cleanup fixed two traceability issues without changing direction: the finalized AGENTS output now points to the primary proposal handoff, and the Phase 2 acceptance criteria in the active async proposal are now expressed as observable checks instead of soft wording. Read this as a documentation precision pass on the async-proposal slice only, not as a statement that the entire repo is otherwise clean.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Session_Preparation_Async_Proposal_Review_Cleanup.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Session Browser-Close Recovery Review -- [Significant] [open-items: yes]
**For next agent:** The same-browser/browser-close session-resume slice has now had a proper code review pass. The main hardening was privacy and churn control: the persistent local session registry no longer stores actual input previews, only generic `Text session` / `URL session` labels, and the `/analyze` resume surface no longer rewrites that registry on every polling cycle when nothing changed. Browser-close recovery still depends on the scoped HttpOnly draft-access cookie plus authenticated re-fetch, and the idle auto-continue default is now 15 minutes via the existing `claimSelectionIdleAutoProceedMs` UCM path.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Session_Browser_Close_Recovery_Review.md

---
### 2026-04-23 | Lead Architect | Codex (GPT-5) | Internal Agent Knowledge CLI-First Implementation Slice -- [Significant] [open-items: yes]
**For next agent:** The CLI-first internal knowledge layer now exists at `packages/fh-agent-knowledge/` with a working cache and query surface. Use `npm run fh-knowledge -- preflight-task --task "..." [--role ...]` as the default entry point, not ad hoc file hunting. The key retrieval bug found during smoke testing is already fixed: `preflight-task` no longer hides the MCP thread when a role is supplied, and `search-handoffs` now resolves role aliases through the parsed role table and returns field-level reasons. The next step is adoption/documentation, not another redesign; the MCP adapter itself remains deferred by the active spec.
→ Docs/AGENTS/Handoffs/2026-04-23_Lead_Architect_Internal_Agent_Knowledge_CLI_First_Implementation_Slice.md

---
### 2026-04-23 | Lead Architect | Codex (GPT-5) | Internal Agent Knowledge Review Fixes -- [Standard] [open-items: yes]
**For next agent:** The three Senior Architect review items on `@factharbor/fh-agent-knowledge` are now addressed. Query commands auto-refresh stale cache and expose `cacheRefreshed: true`, `health`/`refresh` still report stale state without mutating it, Windows cache writes no longer rely on temp-file rename replacement semantics, and missing optional source files no longer crash manifest snapshotting. This leaves the package ready for adoption wiring rather than more package-internal debugging.
→ Docs/AGENTS/Handoffs/2026-04-23_Lead_Architect_Internal_Agent_Knowledge_Review_Fixes.md

---
### 2026-04-23 | Lead Architect | Codex (GPT-5) | Internal Agent Knowledge MCP Documentation Realignment -- [Standard] [open-items: yes]
**For next agent:** The current governing docs now explicitly supersede the old CLI-first-only deferral. [2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md) and [Docs/WIP/README.md](/c:/DEV/FactHarbor/Docs/WIP/README.md) now say the shared core and CLI are implemented and that the thin MCP adapter is the active next slice. Reviewer consolidation is: do not spend another cycle on adoption-vs-MCP debate; implement the MCP slice in this order: package dependency ownership, `scripts/fh-knowledge-mcp.mjs`, `src/adapters/mcp.mjs`, parity tests, then client wiring.
→ Docs/AGENTS/Handoffs/2026-04-23_Lead_Architect_Internal_Agent_Knowledge_MCP_Documentation_Realignment.md

---
### 2026-04-24 | Lead Architect | Codex (GPT-5) | Internal Agent Knowledge MCP Execution Checklist -- [Standard] [open-items: yes]
**For next agent:** The architecture did not need another planning round, but the first MCP coding slice now has an explicit execution freeze in [2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md): `stdio` only, exact tool names, direct `@modelcontextprotocol/sdk` ownership, thin-adapter-only responsibilities, and parity tests as the completion gate. Next is implementation, not more planning.
→ Docs/AGENTS/Handoffs/2026-04-24_Lead_Architect_Internal_Agent_Knowledge_MCP_Execution_Checklist.md

---
### 2026-04-24 | Lead Architect | Codex (GPT-5) | Internal Agent Knowledge MCP Adapter Implementation -- [Significant] [open-items: yes]
**For next agent:** The thin MCP adapter is now implemented in the repo. `@factharbor/fh-agent-knowledge` now owns direct MCP runtime dependencies, `scripts/fh-knowledge-mcp.mjs` launches a stdio server, `src/adapters/mcp.mjs` exposes the frozen 9-tool surface, and CLI/MCP parity is enforced through a shared operation registry plus real stdio tests. The next step is rollout and client wiring, not more retrieval-layer implementation.
→ Docs/AGENTS/Handoffs/2026-04-24_Lead_Architect_Internal_Agent_Knowledge_MCP_Adapter_Implementation.md

---
### 2026-04-24 | Lead Architect | Codex (GPT-5) | Internal Agent Knowledge MCP Omitted Arguments Fix -- [Standard] [open-items: no]
**For next agent:** The MCP interop regression is fixed. Zero-arg tools and the all-optional `refresh_knowledge` path in [mcp.mjs](/c:/DEV/FactHarbor/packages/fh-agent-knowledge/src/adapters/mcp.mjs) now accept omitted `arguments`, and [mcp-parity.test.mjs](/c:/DEV/FactHarbor/packages/fh-agent-knowledge/test/mcp-parity.test.mjs) covers the omitted-arguments case explicitly for `bootstrap_knowledge`, `check_knowledge_health`, and `refresh_knowledge`.
→ Docs/AGENTS/Handoffs/2026-04-24_Lead_Architect_Internal_Agent_Knowledge_MCP_Omitted_Arguments_Fix.md

---
### 2026-04-24 | Lead Architect | Codex (GPT-5) | Internal Agent Knowledge MCP Rollout Setup -- [Significant] [open-items: yes]
**For next agent:** The rollout surface is now in place. `Docs/DEVELOPMENT/Agent_Knowledge_MCP_Setup.md` is the central setup guide, `.cursor/mcp.json` and `.vscode/mcp.json` are committed project-scoped configs, and the main wrapper docs now tell agents to use `fhAgentKnowledge` `preflight_task` first with the CLI as fallback. The governing MCP spec and WIP index now reflect that rollout docs/configs are landed; the next step is real client validation and adoption, not more adapter logic.
→ Docs/AGENTS/Handoffs/2026-04-24_Lead_Architect_Internal_Agent_Knowledge_MCP_Rollout_Setup.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Dominant Proposition Senior Architect Review Disposition -- [Standard] [open-items: yes]
**For next agent:** The latest dominant-proposition plan was already aligned with most of the Senior Architect review. The remaining pass was a narrow clarification update: stronger `topLevelProposition` / `dominanceAssessment` orthogonality wording, explicit Stage 1 finalization-time `componentClaimIds` cross-reference validation language, a clearer “not a restatement exemption” prompt rule, and a clearer UI rule that `articleThesis` should not sit alongside `topLevelProposition` in the main headline surface. No implementation work was done in this slice.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Dominant_Proposition_Senior_Architect_Review_Disposition.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Session Resume Review Follow-up -- [Significant] [open-items: yes]
**For next agent:** The session-resume review follow-up closed the two real browser-close UX bugs. `ActiveClaimSelectionSessions.tsx` now keeps the `Open report` path available from persisted `lastKnownFinalJobId` even after the draft-access cookie is cleared, and the polling loop no longer remounts on every status transition. Added focused regressions for completed-session resume helpers and cancel-route cookie clearance.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Session_Resume_Review_Followup.md

---
### 2026-04-24 | Unassigned | Codex (GPT-5) | Stage 1 Preliminary Fetch Reuse For Selection Readiness -- [Significant] [open-items: yes]
**For next agent:** Phase 1 of the selection-readiness plan now has a concrete same-semantics latency reduction in code. [claim-extraction-stage.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts) now reuses exact in-flight and successful URL fetches during Stage 1 preliminary search so duplicate query results do not re-download/re-parse the same source before AC selection becomes available. Review forced one important correction: failed and underlength fetches are evicted from the cache so later duplicates can retry, and focused regressions now cover both failure and short-body recovery paths.
→ Docs/AGENTS/Handoffs/2026-04-24_Unassigned_Stage1_Preliminary_Fetch_Reuse_For_Selection_Readiness.md

---
### 2026-04-24 | Unassigned | Codex (GPT-5) | ACS Recommendation Order Normalization -- [Standard] [open-items: no]
**For next agent:** The ACS recommendation validator no longer fails interactive sessions for order-only mismatch between `recommendedClaimIds` and `rankedClaimIds`. [claim-selection-recommendation.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-selection-recommendation.ts) now preserves all real set/cardinality invariants but normalizes the recommended subset into ranked order before returning it, and [claim-selection-recommendation.test.ts](/c:/DEV/FactHarbor/apps/web/test/unit/lib/analyzer/claim-selection-recommendation.test.ts) covers both direct validator normalization and the live generator path.
→ Docs/AGENTS/Handoffs/2026-04-24_Unassigned_ACS_Recommendation_Order_Normalization.md

---
### 2026-04-24 | Unassigned | Codex (GPT-5) | Selection Readiness Debate Consolidation And Implementation -- [Significant] [open-items: yes]
**For next agent:** The three-item follow-up was debate-reviewed and narrowed before code landed. Live cross-session prepared-snapshot reuse remains deferred, but forward-only `preparedStage1.preparationProvenance` is now embedded for future exact/auditable reuse decisions. The shippable fixes in this slice are concurrent draft/job log attribution via async-scoped prefixes in [debug.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/debug.ts) and [internal-runner-queue.ts](/c:/DEV/FactHarbor/apps/web/src/lib/internal-runner-queue.ts), plus preparation-page wording that now explains the true order: Stage 1 first, then recommendation, then manual selection when needed.
→ Docs/AGENTS/Handoffs/2026-04-24_Unassigned_Selection_Readiness_Debate_Consolidation_And_Impl.md

---
### 2026-04-24 | Unassigned | Codex (GPT-5) | Selection Readiness Living Plan Sync -- [Standard] [open-items: yes]
**For next agent:** The living plan in [2026-04-24_Selection_Readiness_Root_Cause_And_Fix_Plan.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-24_Selection_Readiness_Root_Cause_And_Fix_Plan.md) now matches what actually shipped. It explicitly records that cross-session prepared reuse is still deferred for live behavior, that provenance-only groundwork landed, that recommendation order-only mismatch is fixed, and that log attribution plus preparation-copy clarification are already implemented. Treat that WIP note, not just the handoff, as the current source of truth for what remains next on selection readiness.
→ Docs/WIP/2026-04-24_Selection_Readiness_Root_Cause_And_Fix_Plan.md

---
### 2026-04-24 | Lead Architect | Codex (GPT-5) | Internal Agent Knowledge MCP Schema Validation And Parity Hardening -- [Standard] [open-items: yes]
**For next agent:** Required-input MCP tools in [packages/fh-agent-knowledge/src/adapters/mcp.mjs](/c:/DEV/FactHarbor/packages/fh-agent-knowledge/src/adapters/mcp.mjs) now fail at the schema boundary instead of falling through to downstream `requireOption(...)`, while zero-arg tools still tolerate omitted `arguments`. [packages/fh-agent-knowledge/test/mcp-parity.test.mjs](/c:/DEV/FactHarbor/packages/fh-agent-knowledge/test/mcp-parity.test.mjs) now keeps `cacheSource` and `warnings` strict and treats only `cacheRefreshed` as volatile for query parity; the Claude setup guide and the local `C:/Users/rober/.claude.json` config both use direct `node` launch instead of `cmd /c`.
→ Docs/AGENTS/Handoffs/2026-04-24_Lead_Architect_Internal_Agent_Knowledge_MCP_Schema_Validation_And_Parity_Hardening.md

---
### 2026-04-24 | Senior Developer | Codex (GPT-5) | Code Review Findings Fix -- [Standard] [open-items: yes]
**For next agent:** The actionable review findings were fixed locally: trusted-header-only draft IP forwarding in [claim-selection-draft-proxy.ts](/c:/DEV/FactHarbor/apps/web/src/lib/claim-selection-draft-proxy.ts), bounded/cancel-safe draft restart in [ClaimSelectionDraftService.cs](/c:/DEV/FactHarbor/apps/api/Services/ClaimSelectionDraftService.cs), `IsHidden` bootstrap repair in [Program.cs](/c:/DEV/FactHarbor/apps/api/Program.cs), and metadata-only source refetch in [research-acquisition-stage.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/research-acquisition-stage.ts). [claimboundary-pipeline.test.ts](/c:/DEV/FactHarbor/apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts) now matches the updated acquisition contract. Open item: DevOps must configure and strip the trusted client-IP header before relying on per-client API draft rate limiting behind Next.js.
→ Docs/AGENTS/Handoffs/2026-04-24_Senior_Developer_Code_Review_Findings_Fix.md

---
### 2026-04-24 | Unassigned | Codex (GPT-5) | Pipeline Quality, Speed, And Cost Improvement Plan -- [Significant] [open-items: yes]
**For next agent:** Use [2026-04-24_Unassigned_Pipeline_Quality_Speed_Cost_Improvement_Plan.md](/c:/DEV/FactHarbor/Docs/AGENTS/Handoffs/2026-04-24_Unassigned_Pipeline_Quality_Speed_Cost_Improvement_Plan.md) as the current reconciled plan. First slice should be baseline/observability plus Stage 2 relevance/applicability fail-open counters and handling, then Stage 3 ClaimAssessmentBoundary concentration stabilization; safe cost work is limited to exact reuse, telemetry, default-off experiments, and structurally validated retry reduction.
→ Docs/AGENTS/Handoffs/2026-04-24_Unassigned_Pipeline_Quality_Speed_Cost_Improvement_Plan.md

---
### 2026-04-24 | Unassigned | Codex (GPT-5) | SerpApi Starter Sufficiency Investigation -- [Standard] [open-items: yes]
**For next agent:** SerpApi is not currently active in local or deployed search ordering; both use Google CSE first, Serper second, Wikipedia supplementary. Starter is enough as a Google fallback for one regular user based on local telemetry, but not enough as primary search for frequent daily full analyses. Relevant anchors: [web-search.ts](/c:/DEV/FactHarbor/apps/web/src/lib/web-search.ts), [search.default.json](/c:/DEV/FactHarbor/apps/web/configs/search.default.json), deployed admin `/api/version`, and `apps/api/factharbor.db` `ResultJson.searchQueries`.
→ Docs/AGENTS/Handoffs/2026-04-24_Unassigned_SerpApi_Starter_Sufficiency_Investigation.md

---
### 2026-04-24 | Unassigned | Codex (GPT-5) | Verdict Citation Integrity Guard -- [Standard] [open-items: yes]
**For next agent:** [verdict-stage.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/verdict-stage.ts) now runs `enforceVerdictCitationIntegrity(...)` after phantom cleanup and before spread/validation, removing structurally invalid/non-direct final citations and moving bucket-mismatched direct citations based on existing `claimDirection`. Verify live only after commit/restart; full `npm test` had runner timeouts that passed in isolated rerun.
→ Docs/AGENTS/Handoffs/2026-04-24_Unassigned_Verdict_Citation_Integrity_Guard.md

---
### 2026-04-24 | Unassigned | Codex (GPT-5) | Verdict Citation Integrity Guard Review Follow-up -- [Standard] [open-items: yes]
**For next agent:** The two follow-up review findings are addressed in [verdict-stage.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/verdict-stage.ts): explicit neutral `claimDirection` citations are removed from final directional buckets, including post-validation repair output, and decisive-side citation collapse now emits `verdict_citation_integrity_guard` with `error` severity. Focused verdict/warning tests and the web build passed; live jobs still require commit/restart first.
→ Docs/AGENTS/Handoffs/2026-04-24_Unassigned_Verdict_Citation_Integrity_Guard.md

---
### 2026-04-24 | Unassigned | Codex (GPT-5) | Verdict Citation Guard Live Validation -- [Standard] [open-items: yes]
**For next agent:** Four Captain-approved live jobs were submitted and monitored in the UI after the guard fix. Jobs `d29fd298`, `6c23a1bd`, and `e16ed62f` ran under `959b7280+dirty` and completed without `verdict_citation_integrity_guard`; `322d3d80` completed under later `58a74905+dirty`, so use it only as operational evidence. Open items: `SUCCEEDED`+progress `99`, runtime provenance drift, and long clustering/reconciler heartbeat gaps.
→ Docs/AGENTS/Handoffs/2026-04-24_Unassigned_Verdict_Citation_Guard_Live_Validation.md

---
### 2026-04-24 | Unassigned | Codex (GPT-5) | fhAgentKnowledge Startup Advice -- [Standard] [open-items: yes]
**For next agent:** `fhAgentKnowledge` `preflight_task` now accepts optional `skill` and returns `startupAdvice` with recommended role, workflow skill, first actions, docs to read, handoffs to inspect, code-search hints, a tool plan, and guardrail warnings. The cache now indexes `.claude/skills/*/SKILL.md`, includes `Docs/DEVELOPMENT/` and skills in doc allowlisting, and tracks development-doc/skill digests for freshness. Verification: `npm run test:knowledge` passed (12/12), `node scripts/fh-knowledge.mjs refresh --force` rebuilt the cache, and health now reports `skills: 12`, `docs: 139`.
**Warnings:** Existing Codex/VS Code MCP stdio processes must be restarted to load the new server code. The advisor is metadata/ranking based; source files remain authoritative and agents must still use source search/file reads before editing.
**Learnings:** Extending `preflight_task` preserved the frozen MCP tool set while adding the desired intelligence. Optional `skill` should be passed when a workflow is already active; otherwise skills are ranked from cached skill metadata.

---
### 2026-04-24 | Unassigned | Codex (GPT-5) | Cross-Agent MCP Config Audit -- [Standard] [open-items: no]
**For next agent:** Local MCP config now points to `fhAgentKnowledge` across the checked clients: Codex, Claude Code, Claude MCP file, VS Code/Copilot Chat project config, Cursor project and user config, Gemini project and user config, Copilot CLI, Cline, and Windsurf/Codeium. Added missing `C:/Users/rober/.copilot/mcp-config.json`, populated previously empty `C:/Users/rober/.cursor/mcp.json`, added the lowercase `c:/DEV/FactHarbor` Claude project entry, and normalized `C:/Users/rober/.claude/mcp.json` to direct `node` launch. Verification used JSON parsing, `codex mcp list`, and `claude mcp list`; Gemini's list command returned no text but both project/user Gemini settings contain the server entry.

---
### 2026-04-24 | Unassigned | Codex (GPT-5) | Role Preflight Trigger Documentation -- [Standard] [open-items: no]
**For next agent:** `As <Role>,` / `As <Role>:` is now documented as both role activation and a required `fhAgentKnowledge.preflight_task` trigger across the canonical handoff protocol, root `AGENTS.md`, MCP setup guide, and tool wrappers. `preflight_task` also extracts the leading role and first `Skill:` value when an agent passes the full short-form prompt as `task`; read additional named skill workflows manually.
→ Docs/AGENTS/Handoffs/2026-04-24_Unassigned_Role_Preflight_Trigger_Docs.md

---
### 2026-04-24 | Senior Developer / LLM Expert | Codex | Pipeline Integrity Fixes -- [Standard] [open-items: yes]
**For next agent:** `enforceVerdictCitationIntegrity` now safe-downgrades directional verdicts whose decisive citation side is empty after sanitation, limited to 7-band directional ranges; `resolveInitialClaimSelection` prevents seeded/stale `selectedClaimIds` from overriding current recommendations before user interaction. Verification: focused claim-selection/citation/verdict tests and `npm -w apps/web run build` passed.
→ Docs/AGENTS/Handoffs/2026-04-24_Senior_Developer_LLM_Expert_Pipeline_Integrity_Fixes.md

---
### 2026-04-24 | Senior Developer / LLM Expert | Codex | Monitor Pipeline Debug Consolidation -- [Significant] [open-items: yes]
**For next agent:** The whole monitor/pipeline-debug session is now consolidated in one durable handoff and surfaced in `Docs/STATUS/Current_Status.md` plus `Docs/STATUS/Backlog.md`. Fixed items include report markdown/warning cleanup, runner API-side concurrency claim, stale claim-selection seeding, and verdict citation safe-downgrade behavior. Open items remain Stage 1 latency, broad-input Stage 1 quality, Stage 2 evidence/provenance invariants, runtime provenance drift, progress `99`, long-stage heartbeats, warning materiality, Browser Use tooling, and deterministic `claimNeedsPrimarySourceRefinement()` replacement.
→ Docs/AGENTS/Handoffs/2026-04-24_Senior_Developer_LLM_Expert_Monitor_Pipeline_Debug_Consolidation.md

---
### 2026-04-24 | Lead Architect | Codex (GPT-5) | Preparation Jobs Admin Control Assessment -- [Standard] [open-items: yes]
**For next agent:** Admin visibility/manipulation for "jobs in preparation" is low risk only if treated as `ClaimSelectionDraftEntity` administration, not as new `JobEntity` lifecycle state. Add a dedicated admin-only draft list/proxy/UI and constrain actions to existing service methods: open, hide/unhide, cancel, retry failed, and confirm valid prepared selections. Avoid arbitrary draft-state/status editing; canceling `PREPARING` is persistence-safe but does not abort in-flight LLM work.
→ Docs/AGENTS/Handoffs/2026-04-24_Lead_Architect_Preparation_Jobs_Admin_Control_Assessment.md
---
### 2026-04-24 | Senior Developer / LLM Expert | Codex | Stage 1 Distinct-Events Validator Context -- [Significant] [open-items: yes]
**For next agent:** Jobs `d1689df...` and `466c86...` exposed a one-claim collapse where contract/atomicity validators approved a near-verbatim single claim without seeing the Pass 2 `distinctEvents` inventory that later triggered MT-5(C). [claim-extraction-stage.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts) now passes `distinctEventsContextJson` into contract and single-claim atomicity validation, [claimboundary.prompt.md](/c:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md) reconciles that advisory inventory before approving one-claim outputs, and focused/full tests plus build passed. `3328ed...` remains a separate broad-input SVP PDF packet under `MON-STG1-QUAL`.
→ Docs/AGENTS/Handoffs/2026-04-24_Senior_Developer_LLM_Expert_Stage1_Distinct_Events_Validator_Context.md

---
### 2026-04-25 | Agents Supervisor | Codex (GPT-5) | Debt Guard Workflow Skill -- [Standard] [open-items: no]
**For next agent:** New shared workflow skill [debt-guard](/c:/DEV/FactHarbor/.claude/skills/debt-guard/SKILL.md) is mandatory for every bugfixing task before editing. It now has explicit Compact vs Full paths, balanced undo/amend vs add decisions, hunk-level non-destructive revert wording, verifier tier/cost/provenance fields, high-risk-only debate, and deliberate-debt removal triggers. Discovery was synced in `AGENTS.md`, `GEMINI.md`, `.gemini/skills/factharbor-agent/SKILL.md`, `Docs/DEVELOPMENT/Claude_Code_Skills.md`, and `factharbor-agent.skill`.
→ Docs/AGENTS/Handoffs/2026-04-25_Agents_Supervisor_Debt_Guard_Workflow_Skill.md

---
### 2026-04-26 | Senior Developer / LLM Expert | Codex (GPT-5) | 235000 Comparison Profile Follow-up -- [Significant] [open-items: yes]
**For next agent:** The `235000 Flüchtlinge...` issue is improved but not proven fixed. Commits `b7712b0c`, `558f08cd`, and `987dc115` are keep-but-insufficient: Stage 1 no longer damages preparation on the latest run and SEM 2025 evidence `235 057 Personen aus dem Asylbereich` is found/cited for AC_01, but AC_02 still ends `UNVERIFIED` with `verdict_citation_integrity_guard` / `verdict_integrity_failure`. The next correction should tighten Stage 1 validation/repair so a comparison companion depending on a current-side number carries concrete current-side route/metric/freshness in its own profile; only move to Stage 4 if that profile is correct and citations still collapse. The 6 approved reruns are exhausted.
→ Docs/AGENTS/Handoffs/2026-04-26_Senior_Developer_LLM_Expert_235000_Comparison_Profile_Open.md

---
### 2026-04-26 | Agents Supervisor | Codex (GPT-5) | Debt Guard Cross-Tool Docs Sync -- [Standard] [open-items: no]
**For next agent:** Related agent docs now expose `/debt-guard` beyond the root/Gemini surfaces: Claude, Copilot, Cursor, Cline/RooCode, and Windsurf wrappers point bugfixing agents to `.claude/skills/debt-guard/SKILL.md`; `Docs/AGENTS/README.md`, `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md`, and `Docs/DEVELOPMENT/Claude_Code_Skills.md` document the cross-tool expectation. Keep the generated index files out of this commit unless they are intentionally regenerated after unrelated untracked handoffs/WIP files are handled.

---
### 2026-04-26 | Agents Supervisor | Codex (GPT-5) | Debt Guard Post-Review Amendments -- [Standard] [open-items: no]
**For next agent:** Post-commit review/debate of `8ab00f01` found fixable governance issues, not a bad workflow concept. The follow-up amendment clarifies `/debt-guard` Full Path phase obligations, normalizes verifier-tier wording, aligns bugfix trigger text across Gemini/Claude/Copilot/Cursor/Cline/Windsurf wrappers, documents `factharbor-agent.skill` as a repo-coupled helper, refreshes the Gemini helper package, and commits a clean handoff-index entry generated without unrelated untracked handoffs.
→ Docs/AGENTS/Handoffs/2026-04-26_Agents_Supervisor_Debt_Guard_Post_Review_Amendments.md

---
### 2026-04-26 | Agents Supervisor / LLM Expert | Codex (GPT-5) | Context Extension Skill -- [Significant] [open-items: no]
**For next agent:** New shared `context-extension` workflow is installed for Codex auto-triggering at `C:/Users/rober/.codex/skills/context-extension/SKILL.md` and as the canonical FactHarbor repo workflow at `.claude/skills/context-extension/SKILL.md`. It now supports explicit modes for session checkpoints, agent exchange, subagent returns, and reload; artifacts stay local/gitignored under `.codex/context-extension/` with an `index.md` manifest, sensitivity checks, freshness checks, and retention actions. It does not replace completion handoffs. Discovery is synced in `AGENTS.md`, `GEMINI.md`, `.gemini/skills/factharbor-agent/SKILL.md`, `factharbor-agent.skill`, and `Docs/DEVELOPMENT/Claude_Code_Skills.md`. Both skill validators passed after installing `PyYAML`.
→ Docs/AGENTS/Handoffs/2026-04-26_Agents_Supervisor_Context_Extension_Skill.md

Amendment: overlap review added an explicit Overlap Gate and Efficiency Budget so context-extension stays a compact transport/checkpoint layer around `preflight_task`, `/handoff`, `/debate`, docs/WIP workflows, and analysis workflows rather than duplicating them.

Debate follow-up: Reconciler accepted the current design with a narrow suppression rule — phase-boundary and after-debate artifacts are optional only when reconstruction cost is high, and no artifact should be created when the owning workflow output already preserves enough state.

---
### 2026-04-26 | Agents Supervisor | Codex (GPT-5) | Skill Review Amendments -- [Standard] [open-items: no]
**For next agent:** Applied the five accepted amendments from `.codex/context-extension/2026-04-26_skill-review-debate_context.md`: `/debt-guard` Compact Path now has `Mechanism touched`, a compact worked example, and concrete Phase 6 triggers; `/context-extension` now has a separate `/wip-update` Overlap Gate row and explicit `agent-exchange` supersession endpoint. Repo and user-level context-extension skills validate and hash-match.
→ Docs/AGENTS/Handoffs/2026-04-26_Agents_Supervisor_Skill_Review_Amendments.md

---
### 2026-04-26 | Agents Supervisor | Codex (GPT-5) | Skill Selection Routing Docs Sync -- [Standard] [open-items: no]
**For next agent:** Skill routing guidance is intentionally docs-only: no `skill-user` or `skill-selection` meta-skill was added. `AGENTS.md` now defines the canonical selection order, and related Claude/Gemini/shared skill docs mirror it: mandatory gates, explicit assignment, `fhAgentKnowledge.preflight_task` for role-activated or ambiguous tasks, then metadata/table matching. Overlapping workflows rely on their own scope guards.

---
### 2026-04-26 | Agents Supervisor | Codex (GPT-5) | ACE Readiness Challenge -- [Standard] [open-items: yes]
**For next agent:** The ACE readiness review is directionally useful but overstates several claims: all five original skill amendments are applied, its D3 Full Path example is a new recommendation, the "zero debt-guard output" claim is false but compliance telemetry is still weak, the 44% dead-weight audit is not reproducible enough to act on, and several literature attributions are overextended, especially MAST 79%, "attractive nuisance", and Agent Evaluator priority.
→ Docs/AGENTS/Handoffs/2026-04-26_Agents_Supervisor_ACE_Readiness_Challenge.md

---
### 2026-04-26 | Agents Supervisor | Codex (GPT-5) | ACE Governance Re-Audit Consolidation -- [Significant] [open-items: yes]
**For next agent:** Use `Docs/WIP/2026-04-26_ACE_Governance_Reaudit_Consolidated.md` as the operative baseline. Debate verdict is `MODIFY`: cleanup is justified, but first do factual stabilization, ownership clarification, passive governance/debt-guard telemetry, and a reproducible `Multi_Agent_Collaboration_Rules.md` audit before restructure/archive/delete work.
→ Docs/AGENTS/Handoffs/2026-04-26_Agents_Supervisor_ACE_Governance_Reaudit_Consolidation.md

---
### 2026-04-26 | Agents Supervisor | Codex (GPT-5) | ACE Governance Stabilization Decisions -- [Significant] [open-items: yes]
**For next agent:** Captain accepted the GPT re-audit corrections. The original ACE review now has a supersession banner; the consolidated re-audit records resolved decisions; `Multi_Agent_Collaboration_Rules.md` names Captain as owner and Agents Supervisor as maintainer; debt-guard telemetry starts by passively parsing existing `DEBT-GUARD RESULT` / `DEBT-GUARD COMPACT RESULT` blocks in `scripts/build-index.mjs`. Regenerate `handoff-index.json` only from a clean/intentional handoff set.
→ Docs/AGENTS/Handoffs/2026-04-26_Agents_Supervisor_ACE_Governance_Stabilization_Decisions.md

---
### 2026-04-26 | Agents Supervisor | Codex (GPT-5) | ACE Governance Implementation Plan -- [Significant] [open-items: yes]
**For next agent:** `Docs/WIP/2026-04-26_ACE_Governance_Implementation_Plan.md` is the execution plan for the accepted re-audit corrections. It preserves the staged path: commit stabilization baseline, rebuild passive debt-guard telemetry index from a clean/intentional handoff set, then produce a reproducible `Multi_Agent_Collaboration_Rules.md` audit before any restructure or Agent Evaluator work.
→ Docs/AGENTS/Handoffs/2026-04-26_Agents_Supervisor_ACE_Governance_Implementation_Plan.md

---
### 2026-04-26 | Agents Supervisor | Codex (GPT-5) | ACE Governance Phase 1-2 Implementation -- [Significant] [open-items: yes]
**For next agent:** Phase 1 added `node scripts/build-index.mjs --tier=2 --tracked-only` plus `npm run index:tier2:tracked` for clean committed handoff indexes; Phase 2 created `Docs/WIP/2026-04-26_Multi_Agent_Collaboration_Rules_Audit.md`. Review that audit before any rules restructure; most heavy sections are load-on-demand reference, not deletion candidates.
→ Docs/AGENTS/Handoffs/2026-04-26_Agents_Supervisor_ACE_Governance_Phase1_Phase2_Implementation.md

---
### 2026-04-26 | Agents Supervisor | Codex (GPT-5) | Post-Commit Index Stabilization -- [Standard] [open-items: yes]
**For next agent:** `scripts/git-hooks/post-commit` now rebuilds handoff indexes with `--tier=2 --tracked-only`, and local hooks were reinstalled. Commit-time generated `handoff-index.json` should no longer sweep unrelated untracked handoffs; PostToolUse indexing remains filesystem-based for live discoverability.
→ Docs/AGENTS/Handoffs/2026-04-26_Agents_Supervisor_Post_Commit_Index_Stabilization.md

---
### 2026-04-26 | Agents Supervisor | Codex (GPT-5) | Index GeneratedAt Stability -- [Standard] [open-items: yes]
**For next agent:** `scripts/build-index.mjs` now skips generated index rewrites when only top-level `generatedAt` changes, so post-commit tracked-only handoff indexing should stop dirtying `Docs/AGENTS/index/handoff-index.json` with timestamp-only churn. Continue ACE governance work from `Docs/WIP/2026-04-26_ACE_Governance_Implementation_Plan.md`.
→ Docs/AGENTS/Handoffs/2026-04-26_Agents_Supervisor_Index_GeneratedAt_Stability.md

---
### 2026-04-26 | Agents Supervisor | Codex (GPT-5) | Analysis Pipeline Fix Protocol -- [Standard] [open-items: no]
**For next agent:** Added the debated compact `AGENTS.md` Analysis Pipeline Fix Protocol: quality first, root-cause discipline, debate/review triggers, live-job monitoring, live inspection guidance, and documentation expectations. Added short execution cues to `/debug`, `/pipeline`, `/debt-guard`, `/prompt-diagnosis`, and `/validate`; no meta-skill was created and existing Safety, Prompt, Live Job, and Skill Selection rules remain canonical.

---
### 2026-04-26 | Agents Supervisor | Codex (GPT-5) | Collaboration Rules Restructure Proposal -- [Standard] [open-items: yes]
**For next agent:** Phase 3 is now a proposal only: `Docs/WIP/2026-04-26_Multi_Agent_Collaboration_Rules_Restructure_Proposal.md` gives a slice-by-slice approval matrix for shrinking `Multi_Agent_Collaboration_Rules.md` into a routing doc while preserving hub-and-spoke and WIP templates as procedures. Do not edit the rules file until Captain approves slices.
→ Docs/AGENTS/Handoffs/2026-04-26_Agents_Supervisor_Collaboration_Rules_Restructure_Proposal.md
---
### 2026-04-27 | Lead Developer | Codex (GPT-5) | Analyze Screen Report Processing Sessions -- [Standard] [open-items: no]
**For next agent:** `/analyze` no longer shows `REPORT PROCESSING` resume entries once `finalJobId` is known. `ActiveClaimSelectionSessions.shouldDropSessionFromRegistry()` now treats `draft.finalJobId` / `ref.lastKnownFinalJobId` as cleanup signals, storage sync removes old refs before display, refresh removes server-returned final-job drafts, and the obsolete `Open report` branch was deleted. Focused Vitest passed.
→ Docs/AGENTS/Handoffs/2026-04-27_Lead_Developer_Analyze_Report_Processing_Sessions.md

---
### 2026-05-01 | Senior Developer | Codex (GPT-5) | Idle Auto-Proceed Clean Rollout -- [Standard] [open-items: yes]
**For next agent:** Clean rollout branch `codex/idle-autoproceed-rollout` in `C:\DEV\FactHarbor-idle-autoproceed-rollout` is based on `2a713bcc` and contains only commit `7714840b fix(acs): seed idle selection timestamp`. The patch manually reimplements only the safe part of `0482c962`: interactive prepared drafts now seed `lastSelectionInteractionUtc` when they enter awaiting selection, so the existing server-owned idle auto-proceed sweep is armed. It does not apply the 15-minute UX default, any ACS budget/stage routing changes, prompt changes, UCM changes, live jobs, restarts, or reseeds. Verification passed: targeted runner tests, `npm -w apps/web run build`, `git diff --check`, and full safe `npm test`. Broader rollout remains blocked on the documented prerequisite DAG for ACS budget-aware substrate, selected-claim starvation substrate, prepared-routing/applicability substrate, and verdict repair substrate.
→ Docs/AGENTS/Handoffs/2026-05-01_Senior_Developer_Idle_Auto_Proceed_Clean_Rollout.md

---
### 2026-05-01 | Senior Developer | Codex (GPT-5) | Main Regression Snapshot Integration Plan -- [Standard] [open-items: yes]
**For next agent:** `codex/main-regression-snapshot-2026-05-01` is preserved as an integration source, not a rollout branch. `Docs/WIP/2026-05-01_Main_Regression_Snapshot_Integration_Plan.md` groups the snapshot into dependency lanes with promote/re-author/hold decisions: keep current clean `main`, re-author admin/preparation access first, then ACS observability, then selected-claim admission/coverage as a combined correctness lane; hold prepared-routing and Stage 4 verdict repair until prerequisites/fresh review exist. No code was merged or cherry-picked from the snapshot.
→ Docs/WIP/2026-05-01_Main_Regression_Snapshot_Integration_Plan.md

Amendment: Post-review hardening made the plan commit-explicit. Appendix A now lists all 142 commits in `2a713bcc..codex/main-regression-snapshot-2026-05-01` exactly once with lane, decision, dependencies, verification, and notes. Lane 1 is split into read-only admin access versus runner/runtime recovery, Lane 3 now names ACS draft config provenance and automatic-submission prerequisites, and Stage 4 hold decisions point to the exhaustive appendix rather than vague prompt-commit grouping.

---
### 2026-05-02 | Senior Developer | Codex (GPT-5) | Daily Bug Scan -- [Standard] [open-items: no]
**For next agent:** Reviewed commits since `2026-05-01T06:01:23Z`. The only code change in range was `2ea964b4 fix(acs): seed idle selection timestamp`; the rest were docs-only. Inspected [`internal-runner-queue.ts`](/c:/DEV/FactHarbor/apps/web/src/lib/internal-runner-queue.ts) and [`ClaimSelectionDraftService.cs`](/c:/DEV/FactHarbor/apps/api/Services/ClaimSelectionDraftService.cs) against the rollout handoff, then ran `npm -w apps/web test -- runner-concurrency-split.integration.test.ts`, which passed. No additional concrete regression was found, so no fix was applied.

---
### 2026-05-03 | Senior Developer | Codex (GPT-5) | ACS Observability Contracts Lane 2 -- [Standard] [open-items: yes]
**For next agent:** Branch `codex/integrate-acs-observability-contracts` re-authors only the approved Lane 2 diagnostics/contracts on top of `main@dc402b86`. It aligns `AtomicClaim.checkWorthiness` to `high|medium|low` as a Stage 1 extraction hint, adds `claim_selection` LLM metric attribution, serializes diagnostic `analysisObservability.acsResearchWaste.selectedClaimResearchCoverage`, persists nullable `Jobs.SubmissionPath`, exposes provenance fields admin-only, inventories prompt surfaces via `prompt-surface-registry.ts`, and updates validation summaries/comparisons. It deliberately does not include budget admission, Stage 2 scheduling changes, prompt edits, UCM default changes, live jobs, or Stage 4 repair. Verification passed: focused web/API tests, `npm -w apps/web run build`, `dotnet build apps/api/FactHarbor.Api.csproj -c Release --no-restore`, `node --check` on validation scripts, `git diff --check`, full safe `npm test`, and full API tests.
→ Docs/WIP/2026-05-03_ACS_Observability_Contracts_Lane2_Status.md

---
### 2026-05-03 | Senior Developer | Codex (GPT-5) | Selected Claim Admission Coverage Lane 3 -- [Standard] [open-items: yes]
**For next agent:** Branch `codex/integrate-selected-claim-admission-coverage` re-authors the approved Lane 3 admission/coverage slice on top of Lane 2. It adds UCM-backed budget-aware admission cap plumbing, persists `selectionAdmissionCap` through draft/prepared/job metadata, enforces final selected IDs in C# job creation, preserves selection metadata on retry, upgrades selected-claim coverage from targeted-iteration counting to provider-search-attempt counting, and emits registered `selected_claim_zero_acquisition` diagnostics that keep zero-search selected claims on the `UNVERIFIED` path instead of entering Stage 4 debate. It deliberately does not include prompt edits, Stage 1 atomicity repair, Stage 4 verdict repair, prepared-routing/applicability work, or the 15-minute idle default. Review disposition was approve. Verification passed: focused web/API tests, full safe `npm test`, full API tests, web build, API build, and `git diff --check`. Live jobs have not yet been submitted from this lane.
→ Docs/WIP/2026-05-03_Selected_Claim_Admission_Coverage_Lane3_Status.md

Live canary amendment: after commit `f896c889`, services were restarted/reseeded and three automatic draft canaries were submitted. Bolsonaro EN created 3 prepared/selected claims and all selected claims had provider search attempts, but verdict quality remained `UNVERIFIED` 52/40. Asylum 235000 DE recovered to `MOSTLY-TRUE` 80/78. SVP PDF prepared 26 claims but admitted only 3 under `selectionAdmissionCap = 3`, fixing the over-admission class; one admitted claim still ended `UNVERIFIED` from zero final evidence despite provider searches. Remaining issues are held Stage 4 verdict quality and acquisition-yield quality, not Lane 3 zero-search starvation.

---
### 2026-05-04 | DevOps Expert | Codex (GPT-5) | Lane 2/3 Promotion To Main -- [Standard] [open-items: yes]
**For next agent:** Local `main` was fast-forwarded from `dc402b86` to `78596f5d`, promoting `7c59c8dd`, `4e1bfff2`, `f896c889`, `7417bdfa`, plus the approved Lane 3 status-doc correction. Post-merge verification passed after one classified transient `drain-runner-pause.integration.test.ts` timeout: isolated file pass, full `npm test` pass, `npm -w apps/web run build`, full API tests, API build, restart/reseed, and active `pipeline/default` UCM hash/key verification. Residual follow-ups remain direct `/v1/analyze` ACS bypass, default-on budget-aware cap monitoring, Bolsonaro Stage 4, and SVP acquisition yield.
-> Docs/AGENTS/Handoffs/2026-05-04_DevOps_Expert_Lane2_Lane3_Promotion.md

---
### 2026-05-04 | Senior Developer | Codex (GPT-5) | Post-Promotion Live Canary Wave 1 -- [Standard] [open-items: yes]
**For next agent:** On `main`/`origin/main` at `1514c632`, four automatic draft canaries were submitted via shell/API, so they do not populate the browser-local active-session list. Results: Asylum 235000 DE [3ba25fe7](/jobs/3ba25fe7c99f4b96822e37a6a65f6bb1) `LEANING-TRUE` 62/68 with 1 selected claim, 8 searches, 36 final evidence, zero selected-claim starvation; Hydrogen [16b0d093](/jobs/16b0d093a0fc4617a634a6e5cace29e3) `FALSE` 7/80 with 1 selected claim, 8 searches, 62 final evidence, and boundary separation preserving tank-to-wheel/well-to-wheel distinctions; SVP PDF [f77eaea0](/jobs/f77eaea0a5fe4a708969b32fefb2f867) `LEANING-TRUE` 65/45 with 26 prepared, 3 selected/cap 3, all selected searched, but AC_19 repeated the known acquisition-yield gap: 6 searches, 0 final evidence, `UNVERIFIED`; Bolsonaro EN [1ae07d6f](/jobs/1ae07d6fa0fc441e9a2558fefddb9612) failed expectations at `LEANING-FALSE` 32/59, with 2 prepared claims rather than expected 3 and no Lane 2/3 starvation (`zeroTargetedSelectedClaimCount=0`, AC_01 4 searches/62 final evidence, AC_02 8 searches/52 final evidence). Read-only agent review classified Bolsonaro as high-likelihood Stage 1 atomicity plus Stage 2 evidence applicability/direction, medium Stage 4 aggregation/verdict, and very-low Lane 2/3 admission/coverage. Do not roll back Lane 2/3 based on this batch; open separate quality lanes for Bolsonaro generic atomicity/applicability and SVP acquisition yield.

---
### 2026-05-05 | Senior Developer | Codex (GPT-5) | Report Expectations vs Post-Deployed 22.4 Comparison -- [Standard] [open-items: yes]
**For next agent:** `Docs/WIP/2026-05-05_Report_Expectations_vs_Post_Deployed_22_4_Comparison.md` compares the latest local reports and best post-`deployed_22.4` exact-input reports against `Docs/AGENTS/benchmark-expectations.json` and `Captain_Quality_Expectations.md`. Current `1514c632` passes `asylum-235000-de`, `hydrogen-en`, and SVP ACS/admission coverage, but fails `bolsonaro-en` (`1ae07d6f`, `LEANING-FALSE` 32/59, 2 claims instead of expected 3). Best post-tag Bolsonaro EN comparator is `cea25d45` on `a5d2bfe8` (`LEANING-TRUE` 63/51, 3 prepared claims). Best aggregate mean score among commits with >=3 formal families is `959b7280`, but it is narrow and not a rollback target; broadest comparator is `945de236`, but quality is mixed. Conclusion remains per-family comparators, no single safe best commit across all report families.

Amendment after independent LLM Expert review: the comparison document now records the second-role debate outcome. Correct post-tag exact-input count is 281 rows (271 succeeded, 5 failed, 5 cancelled), because the API DB timestamp cutoff must use the stored space-separated format. Commit aggregation strips dirty suffixes after `+`. `959b7280` remains the best narrow aggregate scorer, but its mechanically good Bolsonaro EN run has only 2 AtomicClaims; `cea25d45`/`a5d2bfe8` remains the better Bolsonaro quality comparator because it preserves 3 claims.

---
### 2026-05-05 | Senior Developer | Codex (GPT-5) | Daily Bug Scan No Code Commits -- [Standard] [open-items: no]
**For next agent:** No commits landed after the last recorded run time, so this pass fell back to the last 24 hours. The only commits in range were `1514c632` and `78596f5d`, both docs-only changes under `Docs/`; no code, prompt, config, test, or CI regression signal was present, so no fix was applied.
→ Docs/AGENTS/Handoffs/2026-05-05_Senior_Developer_Daily_Bug_Scan_No_Code_Commits.md

---
### 2026-05-05 | Senior Developer | Codex (GPT-5) | Report Expectations Extended To best_reports_19.4 -- [Standard] [open-items: yes]
**For next agent:** Extended `Docs/WIP/2026-05-05_Report_Expectations_vs_Post_Deployed_22_4_Comparison.md` back to `best_reports_19.4` (`8f3ca9dd`) and included earlier investigation dimensions plus public `app.factharbor.ch` report evidence. Read-only local DB scope from `2026-04-19 07:30:31` UTC has 364 benchmark/control rows (352 succeeded) or 378 rows including the documented CH/DE fact-checking auxiliary. Consolidated debate outcome: no single safe best commit exists. `8f3ca9dd+8d56a484` is a narrow dirty CH/DE/PT comparator, `ace3c114+1dab4976` is broad but dirty and not rollback-safe, `959b7280` is clean but narrow, and current `1514c632` remains an ACS/Lane2/3 baseline rather than a global quality baseline. Important correction: best Bolsonaro EN quality comparator is now `91bf6083` on `b5421841`, not `cea25d45`, because it preserves 3 prepared and 3 selected/final AtomicClaims with zero `state.gov` residue. Public deployed comparators include `eb02cd2e`/`cfd508bc` for the older Bolsonaro EN variant, `3469b325` for PT, and public asylum/Bundesrat/CH-DE reports; `e95bd017` remains non-inspectable because the backing API returns 404.

---
### 2026-05-05 | Senior Developer | Codex (GPT-5) | Report Investigation Live Addendum And Prompt Audit Debate -- [Standard] [open-items: yes]
**For next agent:** The WIP comparison doc now has a superseding 2026-05-05 evening addendum. Two clean-`main` live jobs were spent from the 12-job budget. Bolsonaro EN `9ba14bc2` succeeded as `LEANING-TRUE` 61/40 but still prepared only 2 claims and both claim-level verdicts were `UNVERIFIED`; this confirms the stable Stage 1 bundled-proceedings/verdicts atomicity gap while showing Stage 2 direct-contradiction drift is intermittent. Bolsonaro PT draft `440b2963` correctly prepared 3 claims and selected 2 objective compliance claims, but final job `5a111092` failed because the API stale-job watchdog marked it failed after 15 minutes without progress while the analyzer continued through verdict events. Debate outcome: do not physically split `claimboundary.prompt.md` now; prioritize generic LLM-powered Stage 1 multi-claim atomicity/coverage audit, then Stage 2 target-identity applicability repair, then Stage 3/runner heartbeat and timeout hardening. Remaining live-job budget from this addendum: 10.

---
### 2026-05-06 | Senior Developer | Codex (GPT-5) | Prompt Structure AtomicClaim Review Packet -- [Standard] [open-items: yes]
**For next agent:** Created `Docs/WIP/2026-05-06_Prompt_Structure_AtomicClaim_Review_Packet.md` for Claude/Gemini review. It consolidates the agent assessment of prompt structuring, compact-but-precise prompt wording, and a stronger `AtomicClaim` definition. The packet recommends deferring physical prompt split, using section manifests/hashes/schema-drift checks for governance, avoiding broad prompt rewrites, and prioritizing a generic LLM-powered Stage 1 multi-claim atomicity/coverage audit before Stage 2 target-identity repair and runner heartbeat hardening. It includes explicit review prompts for Claude and Gemini and marks implementation as blocked pending independent review of the exact definition, audit placement, structured output contract, and validation set.

Amendment after three reviews: `Docs/WIP/2026-05-06_Prompt_Structure_AtomicClaim_Review_Packet.md` now includes the consolidated reviewed implementation gate. The accepted AtomicClaim definition uses the "different directional verdicts" test plus scope-preservation and relation-claim exceptions. The audit must run as a separate post-contract-validation LLM call, emit `splitConfidence`, `splitRecommendation` seeds, and `preservedRelationClaims`, consume `distinctEvents`, and route high-confidence findings through Pass 2 -> Gate 1 -> contract validation -> one bounded re-audit. Physical prompt split remains deferred; evidence category schema-drift alignment is a prerequisite for Stage 2 directness repair.

---
### 2026-05-06 | Senior Developer | Codex (GPT-5) | Stage 1 Multi-Claim Atomicity Audit -- [Significant] [open-items: yes]
**For next agent:** Implemented the reviewed Stage 1 multi-claim atomicity audit: separate post-contract-validation LLM call, strict high-confidence `splitRecommendation` seed gating, Pass 2 -> Gate 1 -> contract validation -> one bounded re-audit, plus prompt/schema/pipeline tests. No Stage 2/Stage 4 repair, prompt physical split, broad compaction, or live jobs are included. Commit/restart/reseed before validation canaries.
-> Docs/AGENTS/Handoffs/2026-05-06_Senior_Developer_Stage1_Multi_Claim_Atomicity_Audit.md

Live canary amendment: `5a744b1e` fixed Bolsonaro EN prepared claim separation (3 prepared/selected), but final verdict stayed bad (`LEANING-FALSE` 39/44), confirming a remaining Stage 2/Stage 4 lane. Hydrogen control exposed an over-splitting failure under `5a744b1e`; `ba266a69` added `inputAuthoredSplitBasis` and derived-submetric guard. Hydrogen rerun passed preparation and final report (`FALSE` 11/68). Bolsonaro PT passed as multilingual control (`LEANING-TRUE` 67/66); Bundesrat relation/temporal control prepared 2 claims with audit `pass`.

---
### 2026-05-06 | Senior Developer | Codex (GPT-5) | Bolsonaro EN Downstream Diagnosis Review Packet -- [Standard] [open-items: yes]
**For next agent:** Created `Docs/WIP/2026-05-06_Bolsonaro_EN_Downstream_Diagnosis_Review_Packet.md` after inspecting exact current canary `febfd467d0f24a339827267b5ea77851` and comparator `91bf6083d26e407c98a474d89d2e618f`. Stage 1 and ACS are healthy for the current canary: 3 prepared/selected claims, zero selected-claim starvation, and nonzero search attempts. The remaining failure is downstream: `AC_02` ends `LEANING-FALSE` with 0 supporting citations and 7 contradicting citations, dominated by IACHR confidentiality / collateral STF inquiry material and Moraes controversy promoted to direct contradiction. Independent reviewer agreed the primary next lane is Stage 2 direction/applicability with LLM-emitted `directionBasis` plus structural neutralization of non-directional bases; Stage 4 repair is a secondary amplifier and should stay held until after a direction-basis canary. Do not cherry-pick `b5421841`; re-author the minimal mechanism generically with prompt approval, tests, commit/reseed/restart, then canaries.

---
### 2026-05-06 | Senior Developer | Codex (GPT-5) | Direction Basis Atomicity Canaries -- [Standard] [open-items: yes]
**For next agent:** Implemented and committed Stage 2 direction-basis structural contract (`a62e60b6`), Stage 1 atomicity guards (`33d347ca`, `f683a605`), and Stage 2 direction-basis taxonomy tightening (`9c5e43b0`). Verification passed: full `npm test` and `npm -w apps/web run build` for the first commit, targeted prompt/stage tests and build for follow-ups. Live canaries consumed 10 of 12 jobs, leaving budget 2. Stage 1 Bolsonaro EN claim split is fixed at 3 prepared/selected claims, and PT/Plastic Stage 1 preparation failures were fixed, but quality is not release-ready: Bolsonaro EN on `9c5e43b0` is `LEANING-FALSE` 38/43, Plastic is `MIXED` 48/70, Asylum is `LEANING-FALSE` 30/72. Hydrogen passes (`FALSE` 8/80) and Bolsonaro PT is directionally acceptable (`LEANING-TRUE` 69/67) but selected only 2 of 3 prepared claims. Next lane should inspect Stage 2 acquisition/directness/source targeting before Stage 4 repair.
-> Docs/WIP/2026-05-06_Direction_Basis_Atomicity_Canary_Status.md

Amendment after failed route-balancing attempt: `e905b9cc fix(stage2): balance rule-governed evidence routes` passed focused tests, full `npm test`, build, and diff check, but failed live Bolsonaro EN validation (`45b31c816a3b432bb3aa42b7c328beb6`, `UNVERIFIED` 48/36 with `query_budget_exhausted`). Per `/debt-guard`, the attempt was classified as `revert` and reverted in `62f7dc16`; services were restarted/reseeded and health checks passed. One job remains in the current budget. Do not spend it on another broad prompt-route patch; first compare current bad jobs against comparator `91bf6083d26e407c98a474d89d2e618f` to locate where target-specific support sources are lost.

Independent source-loss review amendment: inspected current diagnostic `5667123333e84f8ea55ca53cf9b8565d` on `04dbc99f` against comparator `91bf6083d26e407c98a474d89d2e618f`. Recommendation remains to keep `62f7dc16` and not reapply `e905b9cc`. Smallest implementable next fix, if Captain approves a prompt edit, is a narrow `GENERATE_QUERIES` adjustment only: for rule-governed standard claims, preserve one broad target-specific standards/compliance discovery route using neutral safeguard/record language, while keeping other routes target-record/challenge focused. Do not change code routing, UCM thresholds, `RELEVANCE_CLASSIFICATION`, or Stage 4 before a one-job canary verifies query/source recovery.

---
### 2026-05-07 | Senior Developer | Codex (GPT-5) | Daily Bug Scan Stage 4 Follow-Up Only -- [Standard] [open-items: yes]
**For next agent:** Reviewed commits since `2026-05-06T13:18:30.205Z`. Current HEAD includes acquisition-trace commits `f9406499` and `04dbc99f` plus prompt commits `506e3178` and `a9e3804b`; reverted prompt attempt `e905b9cc` remains safely undone by `62f7dc16`. Concrete verification stayed green: `git diff --check` across the window plus targeted Vitest for [`research-extraction-stage.test.ts`](/c:/DEV/FactHarbor/apps/web/test/unit/lib/analyzer/research-extraction-stage.test.ts) and [`verdict-prompt-contract.test.ts`](/c:/DEV/FactHarbor/apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts) both passed. No new committed regression was reproduced. The only evidence-backed follow-up remains the documented post-`a9e3804b` Stage 4 direction-metadata gap in [`2026-05-06_Direction_Basis_Atomicity_Canary_Status.md`](/c:/DEV/FactHarbor/Docs/WIP/2026-05-06_Direction_Basis_Atomicity_Canary_Status.md); local uncommitted edits already target that surface in [`verdict-stage.ts`](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/verdict-stage.ts) and [`verdict-stage.test.ts`](/c:/DEV/FactHarbor/apps/web/test/unit/lib/analyzer/verdict-stage.test.ts), so this scan did not apply a duplicate fix.

---
### 2026-05-07 | Senior Developer | Codex (GPT-5) | B-Prime Prompt Simplification Canary -- [Standard] [open-items: yes]
**For next agent:** Tested the B-prime prompt-simplification hypothesis in isolated worktree `C:\DEV\FactHarbor-prompt-simplification-bprime` on branch `codex/prompt-simplification-bprime`, commit `8063f36a`. The experiment restored shared `claimboundary.prompt.md` sections toward `2f7a2805` while keeping the four current-code-required sections and minimal compatibility contracts. Build and targeted prompt-contract checks passed. Three automatic draft-backed canaries ran against an isolated copied API DB: Bolsonaro EN `8d71dc3009184e4db85300f6f3825d09` -> `UNVERIFIED` 52/24 with 3 prepared/selected claims; Asylum 235000 DE `c8b024d2cd594f9bb869b14c51424fc1` -> `MIXED` 48/70; Plastic EN `b97fab8096b840d9ac1260b3143b6e2a` -> `MIXED` 45/78. Conclusion: quarantine B-prime as a failed quality hypothesis. It preserves Stage 1 claim counts but does not recover Bolsonaro, is below the asylum truth band and weaker than `2f7a2805` job `91b6c56a` (68/65), and misses the plastic truth band. Do not spend more live jobs or promote this prompt profile without a narrower root-cause change.

---
### 2026-05-07 | Senior Developer | Codex (GPT-5) | Clean 2f7a2805 Full-Stack Baseline -- [Standard] [open-items: yes]
**For next agent:** Ran a clean detached full-stack baseline from `2f7a2805c44c3a72f9102c94f54aee30bd114ba9` in `C:\DEV\FactHarbor-2f7-baseline` on isolated ports `3100` / `5100` with separate SQLite DBs. Three Captain-defined jobs were submitted and completed: Plastic EN `5b0df483d0c743e7a8fe72bf2c319f45` -> `MOSTLY-FALSE` 27/64 with 3 AtomicClaims and 97 evidence items; Asylum 235000 DE `1246198d311c46f596f0d4fc0c3184e1` -> `MOSTLY-TRUE` 74/61 with 1 AtomicClaim and 21 evidence items; Bolsonaro EN `119b8c344b6d4e708503e39346a8a49e` -> `LEANING-TRUE` 62/55 with 3 AtomicClaims separating Brazilian law, proceedings fair-trial standards, and verdicts fair-trial standards. This strongly confirms the current regression is not prompt-only: the B-prime hybrid failed, but full old code+prompt passes all three checked families. Caveat: the old runtime is much slower/noisier (Plastic ~24 min, Bolsonaro ~27 min) and needed an isolated DB `IsHidden` bootstrap column, so it is a diagnostic baseline, not an immediate rollback target. Updated `Docs/WIP/2026-05-05_Report_Expectations_vs_Post_Deployed_22_4_Comparison.md` with the addendum. Remaining job budget from this allocation is 0.

---
### 2026-05-08 | Senior Developer | Codex (GPT-5) | Asylum Regression Bisection -- [Standard] [open-items: yes]
**For next agent:** Continued the report-quality bisection in isolated worktree `C:\DEV\FactHarbor-bisect-probe` on ports `3200` / `5200`; canonical checkout stayed on `main`. With a new 8-job budget, submitted 6 jobs total: `1514c632` Asylum `c29d8b41` -> `MOSTLY-TRUE` 84/72; `1514c632` Plastic `f2c56122` -> operational `FAILED` at 60% from stale watchdog after the analyzer continued verdict generation, so do not use it as quality evidence; `ba266a69` Asylum first attempt `43109e2e` failed from missing probe API keys, then replacement `d1b2b845` -> `MOSTLY-TRUE` 75/72; `a62e60b6` Asylum `4182ad7e` -> `LEANING-FALSE` 35/40; repeat `a62e60b6` Asylum `f5bdbe55` -> `UNVERIFIED` 50/35. First confirmed bad point is `a62e60b6 fix(stage2): enforce claim-local direction basis`. Reviewer correction: debug output showed `Direction-basis normalizations: 0`, so this is not a pure normalizer rewrite. More precise mechanism is that the new direction-basis/applicability contract plus profile/query variance failed to preserve official current aggregate-route support and allowed stale/alternate-route comparator evidence to dominate. This bisection does not implicate Lane 2/3 admission or Stage 1 atomicity. Updated `Docs/WIP/2026-05-05_Report_Expectations_vs_Post_Deployed_22_4_Comparison.md`. Recommendation: quarantine/narrow the `directionBasis` lane before adding further prompt/code layers; if keeping it, do not let defaulted/missing `ambiguous` basis erase or block directional evidence, and add asylum-like current-stock tests. Remaining job budget from this allocation: 2.

---
### 2026-05-08 | Senior Developer / Captain Deputy / LLM Expert | Codex (GPT-5) | DirectionBasis Option A Simplification -- [Standard] [open-items: yes]
**For next agent:** Implemented approved Option A on `main` in commit `324efeb1`: missing/defaulted `directionBasis` is no longer authoritative, directional evidence is not overwritten by later neutral assessments, basis-only variance no longer splits evidence pools, neutral cloning no longer splits by basis, and Stage 4 treats `directionBasis` as diagnostic guidance rather than a second veto over `claimDirection`. Focused Vitest, full `npm test`, `npm -w apps/web run build`, restart, reseed, and health checks passed. Prompt hash under test was `a9c5e0a9cb05745652c97027bc2cc2da4a7c80ad9e195e5a6160d09826591117`.

Live canaries used the two planned jobs. Asylum DE `a42517c7085e4e8782b4cf34e142cab8` recovered to `MOSTLY-TRUE` 72/72, so Option A fixes the sharp Asylum regression class introduced by `a62e60b6`. Bolsonaro EN `fff7c275d39343eab2e34326ecfba70a` still failed at `LEANING-FALSE` 35.9/28 despite correct 3-claim Stage 1 output. Offline classification: keep `324efeb1` for now; do not stack further prompt/code changes before a fresh diagnosis. The remaining Bolsonaro defect is primarily evidence-pool skew/acquisition-direction classification: comparator `91bf6083` had 17/11/9 supporting citations and 0 contradictions across the three claims, while `fff7c275` had 0 supporting citations and contradiction-heavy pools, including defense-position and collateral/advocacy sources retained as direct contradictions with missing or explicit directional basis. Stage 4 is not the first cause in this run; it is operating on a support-starved, contradiction-skewed Stage 2 pool.

Follow-up: tried `090a25c fix(stage2): restore first-pass query breadth` after tracing that Bolsonaro support routes were cut by `researchFirstPassMaxQueriesPerClaim=1`. Validation disproved it. On `090a25c`, Bolsonaro improved only slightly to `LEANING-FALSE` 42/40 (`e2e5890aed764d0b847eb70b1d42b266`), while Asylum regressed to `MOSTLY-FALSE` 28/28 (`414fe81e702d4292acefda32e6629692`) and Plastic regressed to `MOSTLY-TRUE` 75.6/78.7 (`7dbe14a0281b4f4b8e955fa02fcfe932`). Per failed-attempt recovery, reverted in `1ba5cb7b`; focused tests and build passed, restart/reseed completed, active UCM is back to `researchFirstPassMaxQueriesPerClaim=1`. Treat broader first-pass query breadth as rejected for now. Remaining budget from the 10-job allocation is 7.

---
### 2026-05-08 | Lead Architect / LLM Expert | Codex (GPT-5) | Search API Cost Reduction Review -- [Standard] [open-items: yes]
**For next agent:** Approved the no-code direction with guardrails: active main search config is Google CSE priority 1, Serper priority 2, SerpApi disabled; UCM `dailyQuotaLimit` is not enforced, so Google CSE cost must be capped via Google Cloud quota/billing controls. Caveat: SR evaluation search has its own config and active `serpapi.enabled=true`, so canceling SerpApi should also disable/remove that fallback or verify no SR usage.
→ Docs/AGENTS/Handoffs/2026-05-08_Lead_Architect_LLM_Expert_Search_Cost_Review.md

---
### 2026-05-08 | Lead Developer + LLM Expert | Codex (GPT-5) | Report Improvement State And Next Steps -- [Standard] [open-items: yes]
**For next agent:** Read `Docs/WIP/2026-05-08_DirectionBasis_Regression_Fix_Proposal.md` as the current report-improvement plan. Source/prompt/config paths are clean at `49ab262d`, active claimboundary prompt hash is `a9c5e0a9cb05745652c97027bc2cc2da4a7c80ad9e195e5a6160d09826591117`, and the recent jobs confirm the stop rule: Bolsonaro EN `af77168b` is `MOSTLY-FALSE` 27/44 with correct 3 AtomicClaims but 0 supports and many contradictions; Asylum DE repeats on the same commit/prompt disagree (`fa0b0b48` `MOSTLY-FALSE` 25/72, `afb038bc` `MOSTLY-TRUE` 82/72); reverted `48995373` job `133bcd7c` classified SEM 235,057 threshold-satisfying evidence as contradiction. Next step is a simplification review lane, not another additive patch: freeze live jobs, compare current Stage 2/4 prompt surfaces against clean `2f7a2805`, and propose a minimal branch that makes `directionBasis` diagnostic-only or quarantines its behavioral locks while preserving Stage 1 atomicity, ACS/admission, observability, and scheduler fixes.
-> Docs/AGENTS/Handoffs/2026-05-08_Lead_Developer_LLM_Expert_Report_Improvement_State_And_Next_Steps.md

---
### 2026-05-08 | Lead Developer + LLM Expert | Codex (GPT-5) | DirectionBasis Diagnostic-Only Simplification -- [Standard] [open-items: yes]
**For next agent:** Implemented the approved simplification lane without live jobs. `directionBasis` remains typed/preserved as diagnostic metadata, but its active behavioral locks were removed: no Stage 2 self-consistency normalization, no neutral overwrite of existing directional evidence based on non-directional basis, no Stage 4 exclusion/adjudication veto based on non-directional basis, and the prompt now states that `directionBasis` is not a second veto over `claimDirection`. Updated focused tests to encode `claimDirection` as the active semantic decision. Verification passed: focused Vitest for `research-extraction-stage.test.ts`, `verdict-stage.test.ts`, and `verdict-prompt-contract.test.ts` (361 tests), `next build`, and full safe Vitest. No restart/reseed/commit/live canary has been done yet; per live-job discipline, commit this patch, restart/reseed, then spend a small Captain-approved canary set before treating quality as validated.

DEBT-GUARD RESULT: Classification `introduced-regression` plus `obsolete-parallel-mechanism`; chosen option `quarantine/delete active directionBasis enforcement`; rejected path was another additive prompt/code repair because recent canaries already hit the stop rule. Net mechanism count decreased. Residual risk is live quality only: local tests prove the contract and build, not that Bolsonaro/Asylum/Plastic report quality is recovered.

Live gate amendment: committed the diagnostic-only patch as `a2c7b228`, reseeded prompts (`claimboundary` active hash `e8dfc67848105b4cd2ac113c1c056e83856d89570959993d1499c0ae29d0f020`), and restarted API/Web. The first serial canary was `asylum-235000-de`, draft `b5a36dec64cc477ca6088b257a433749`, job `96f328b2dc9c4afbbf6703ee82ade9c2`. It succeeded but failed the expected band: `TRUE` 95/82 against expected `LEANING-TRUE`/`MIXED`, truth 55-75 and confidence 40-70. Stage 1/ACS were healthy (1 prepared, 1 selected, 36 evidence items), but Stage 4 gave near-certain truth while still carrying four nominal contradicting citations that its reasoning said were not true contradictions. Per the WIP stop rule, Bolsonaro EN and Plastic EN were not submitted. Next step is failed-attempt recovery classification for `a2c7b228`: likely keep the deletion of runtime direction-basis locks as structurally simpler, but quarantine or soften the prompt language that may now let Stage 4 over-discount direct metric caveats; do not spend additional live jobs before that classification.
---
### 2026-05-09 | Lead Developer + LLM Expert | Codex (GPT-5) | Stage 4 Coherence Canary And Stop-Rule Classification -- [Standard] [open-items: yes]
**For next agent:** Continued the report-improvement plan under the "do not pile up" stop rule and a 10-job budget. Debated the `a2c7b228` canary (`96f328b2dc9c4afbbf6703ee82ade9c2`, `asylum-235000-de`, `TRUE` 95/82) and classified `a2c7b228` as structurally keep, but its live validation claim as quarantined. Implemented and committed `1519f688 fix(stage4): validate citation reasoning coherence`, which passes verdict reasoning into `VERDICT_DIRECTION_VALIDATION` and adds a generic citation-reasoning coherence check. Verification passed: focused verdict tests, web build, full safe Vitest, diff check; services were restarted and prompts reseeded to hash `13cc0d2bcf1e5c848d711b96ad4fac4cb434bca0346af998064059e32d65fdeb`. One final live canary was spent (`31cb1379ad7443b6b20bc2b3b7cd59df`), result `TRUE` 88/75 with 5 supporting, 1 contradicting, 14 neutral evidence items. This improves over 95/82 but still fails the expected `asylum-235000-de` band and still retains a prior-year SEM `226,706` item as a contradicting citation while the reasoning discounts it. A proposed follow-up to let applicability neutralize existing directional evidence was debated, failed a focused test, classified as quarantine/revert, and fully backed out; current source/prompt/test paths are clean. Next step: no additional live jobs until a reviewed simplification/root-cause plan addresses upstream stale/current metric direction and citation coherence without adding another guard layer. Remaining budget from the user allocation: 9 final jobs.

---
### 2026-05-09 | Lead Developer + LLM Expert | Codex (GPT-5) | Captain Expectation Correction: True-Side Families -- [Standard] [open-items: yes]
**For next agent:** Corrected the hallucinated `MIXED` acceptability for `bolsonaro-en`, `bolsonaro-pt`, and `asylum-235000-de` in `Docs/AGENTS/Captain_Quality_Expectations.md` and the mechanical source `Docs/AGENTS/benchmark-expectations.json`. New allowed labels are `LEANING-TRUE` / `MOSTLY-TRUE` for all three. Bolsonaro bands are now truth 58-85 and confidence 45-75, grounded in the original xWiki expectation that legal basis is strongly supported and procedural fairness is largely supported with caveats. Asylum-current-total is now truth 58-75 and confidence 40-70, preserving the "true-side but calibrated" bar: `MIXED` is a regression, while near-certain `TRUE` remains a calibration issue. JSON parse and `git diff --check` passed. Historical WIP/handoff snapshots still mention the old allowance; treat them as superseded by the 2026-05-09 Captain correction.

---
### 2026-05-09 | Lead Developer + LLM Expert | Codex (GPT-5) | Bolsonaro Comparator Report Review -- [Standard] [open-items: yes]
**For next agent:** Reviewed four Captain-supplied Bolsonaro comparator reports: local `3f76f6eb`, `8f07c9de`, `3828f958`, and deployed `eb02cd2e`. All four are true-side and broadly agree with the corrected Captain expectation: domestic Brazilian-law compliance is strong, international/fair-trial fairness is true-side but contested and caveated. Scores were `MOSTLY-TRUE` 76/65, 74/68, 73/70, and 72/75 respectively, with 3 AtomicClaims each and 4-6 ClaimAssessmentBoundaries. `state.gov` contamination is not visible in final evidence/citations; `8f07c9de` fetched two state.gov sources but extracted zero evidence from them. Best comparator patterns are `eb02cd2e` for top-line calibration and `3828f958` for fair-verdict caveat handling. Caveat: these are older variant inputs and not current-HEAD canonical validation, so they should be used as quality exemplars/comparators, not proof the current `bolsonaro-en` regression is fixed.

Follow-up doc update: `Docs/AGENTS/Captain_Quality_Expectations.md` now has a dedicated "Bolsonaro Comparator Reports" section for those four jobs, plus a release-summary caution that the comparator set does not close current-HEAD canonical `bolsonaro-en` validation.

Second follow-up: searched local exact-input jobs in `apps/api/factharbor.db` and deployed public `/api/fh/jobs` results for all benchmark families. `Docs/AGENTS/Captain_Quality_Expectations.md` now includes a "Best Exact / Family Comparator Reports" table with local and deployed references. Exact deployed matches were not visible for `bundesrat-simple` or `plastic-en`; the table names only variant controls where useful and keeps them separate from canonical validation.

Third follow-up after debate: Advocate argued for clearer use instructions because comparator sections can be mistaken for validation authority; Challenger rejected broad reorganization and recommended only a short usage note. Reconciled change kept the existing structure and added `How Agents Should Use This File`, an agent checklist, and comparator guardrails. No benchmark bands, comparator choices, or JSONs changed.

Fourth follow-up after Captain correction: tightened the comparator table so exact-but-weak reports are not listed as "best." Deployed `26432b9bb47f409c97155a148b65566c` was removed from the `bundesrat-rechtskraftig` best column and now appears only as an excluded weak exact match. `asylum-wwii-de` no longer promotes any report as best because no official band exists. Deployed hydrogen now uses in-band capitalization variant `c1fd6e692e594f22ae7d4e361a836f43`; exact deployed `6bfd73ea286a42d2a0e052b563688730` is retained only as excluded due above-band confidence.

Fifth follow-up after Captain rejected `bundesrat-simple` candidate `9581a6568dd640c8b5b3cf6bbb57bda3`: replaced it with exact local `5b411500eee44d32857ba1bf3380fe09` because it better captures the intended report shape: temporal chronology technically true but procedurally misleading. Caveat remains explicit: confidence is above band and the report uses one AtomicClaim, so it is a report-shape exemplar rather than a clean validation baseline.

Sixth follow-up after Captain identified better `bundesrat-simple` reports: replaced `5b411500eee44d32857ba1bf3380fe09` with exact local primary `a6b0e0fc14984926a678a462456bc110` (`TRUE` 97/89) and alternate `a53573047fe64778a76e53cb578900c7` (`TRUE` 96/88). Updated the family intent note to say the simple wording is now Captain-preferred as a high-true chronology claim with procedural caveats. Did not silently change `benchmark-expectations.json`; added a next-action row to review whether the JSON band should move from older mixed/leaning expectations to high-true.

Seventh follow-up after Captain asked to update all related docs and add a report-quality judgment rule: moved `bundesrat-simple` mechanically to the corrected high-true band in `Docs/AGENTS/benchmark-expectations.json` (`TRUE`/`MOSTLY-TRUE`, truth 85-100, confidence 75-95) with `a6b0e0fc14984926a678a462456bc110` as latest observed and `a53573047fe64778a76e53cb578900c7` as alternate preferred comparator. Updated `Docs/AGENTS/Captain_Quality_Expectations.md` to remove the band-review next action, added canonical `AGENTS.md` §Report Quality Baseline Comparison, and synced `/report-review`, skill docs, WIP/handoff correction notes, and lightweight tool wrappers so future agents compare reports against Captain expectations plus best comparators instead of judging in isolation. Validation: `python -m json.tool` on expectation JSONs and `git diff --check` passed. Remaining caveat: this is expectation/documentation alignment, not a new clean current-HEAD rerun.

Eighth follow-up after Claude Opus review: accepted the two actionable review findings and applied two adjacent consistency fixes. `Docs/AGENTS/report-quality-expectations.json` now has `_lastUpdated: 2026-05-09` plus a source-doc note that the Captain correction did not require a Q-code structural change. `.claude/skills/report-review/SKILL.md` now says stale families still run advisory comparator-shape review, and Phase 7b must emit either comparator IDs with relation labels or `NO-COMPARATOR-AVAILABLE`. Also updated `Docs/AGENTS/benchmark-expectations.json` so `Captain_Quality_Expectations.md` is the living narrative/comparator source, not the WIP doc, and changed the stale WIP validation row for `bundesrat-simple` from "overclaim" to "confirm high-true chronology with procedural caveat." Validation: JSON parse and `git diff --check` passed.

Ninth follow-up after Captain asked to update the current report-improvement plan: `Docs/WIP/2026-05-08_DirectionBasis_Regression_Fix_Proposal.md` is now refreshed as the active plan under the corrected 2026-05-09 expectations. It adds the true-side/no-`MIXED` bars for `bolsonaro-en`, `bolsonaro-pt`, and `asylum-235000-de`; the high-true `bundesrat-simple` bar and preferred comparators; the mandatory four-source report-quality comparison rule; explicit `NO-COMPARATOR-AVAILABLE` handling; and a current comparator-first root-cause lane. The plan now says no more live jobs from the remaining 9-job budget until a static comparator packet identifies a generic root cause and one minimal change surface. Validation: WIP trailing-whitespace check and `git diff --check` passed.

Tenth follow-up after Captain requested a debate on whether the updated plan is best to go forward: ran a standard Advocate / Challenger / Reconciler debate. Verdict was `MODIFY`: adopt the plan direction, but add a procedural Section 12 execution contract before acting. `Docs/WIP/2026-05-08_DirectionBasis_Regression_Fix_Proposal.md` now requires static comparator packets to name target reports, comparator relation labels, four-source quality checks, stage-separated findings, one generic root-cause hypothesis, one minimal change surface, and explicit `NO-COMPARATOR-AVAILABLE` when applicable. It also tightens the source/currentness hypothesis to be generic and LLM-mediated, and repeats pre-live-job commit/restart/reseed/Captain-input discipline. Validation: WIP trailing-whitespace check and `git diff --check` passed.

---
### 2026-05-09 | Lead Developer + LLM Expert | Codex (GPT-5) | Report Improvement Static Comparator Packet -- [Standard] [open-items: yes]
**For next agent:** Produced `Docs/WIP/2026-05-09_Report_Improvement_Static_Comparator_Packet.md` and linked it from the active report-improvement plan. The packet compares recent weak targets (`af77168b`, `fff7c275`, `96f328`, `31cb`) against corrected Captain expectations, expectation JSONs, report-quality Q-codes, and exact/variant local/deployed comparators. Primary hypothesis: Stage 2 applicability/direction is not reliably enforcing target-specific operative-bridge rules, causing Bolsonaro concern/recusal material to become direct contradictions and asylum stale/current metrics to distort calibration. No code/prompt/config edits and no live jobs were made; remaining job budget stays at 9. Next step: review packet, then load `/debt-guard` before any implementation.
-> Docs/AGENTS/Handoffs/2026-05-09_Lead_Developer_Report_Improvement_Static_Comparator_Packet.md

---
### 2026-05-09 | Lead Developer + LLM Expert | Codex (GPT-5) | Stage 2 Applicability Direction Prompt Fix -- [Standard] [open-items: yes]
**For next agent:** Implemented the first minimal fix slice from the static comparator packet. `apps/web/prompts/claimboundary.prompt.md` now makes `APPLICABILITY_ASSESSMENT` require directional `claimDirectionByClaimId` entries to use directional `directionBasis` values and concrete `directnessJustification`; non-directional bases now instruct the LLM to return `neutral`. It also adds a self-check for rule-governed standard claims and current-snapshot/endpoint/threshold numeric claims. Updated `verdict-prompt-contract.test.ts` and WIP Section 12.5. Verification passed: targeted prompt-contract test (107), adjacent Stage 2/4 tests (256), full safe `npm test`, and `git diff --check`. No live jobs spent; budget remains 9. Next gate: commit/reseed/restart, then run one `asylum-235000-de` canary and stop on first band failure.
-> Docs/AGENTS/Handoffs/2026-05-09_Lead_Developer_Stage2_Applicability_Direction_Prompt_Fix.md

---
### 2026-05-09 | Senior Developer | Codex (GPT-5) | UCM Search Config Change Review -- [Standard] [open-items: yes]
**For next agent:** Reviewed commit `edeca59a`. Blocking finding: `apps/web/configs/sr.default.json` still has SR evaluation search `googleCse.priority=1`, `dailyQuotaLimit=0`, and `serper.priority=2` while TypeScript defaults now have Serper primary and Google CSE quota 100; `npm -w apps/web test -- config-drift` fails on this drift. Secondary risk: `search.default.json` keeps `autoMode: "accumulate"`, so Google CSE is not strictly fallback-only and `dailyQuotaLimit` is not app-enforced. Fix SR JSON first, then rerun drift test; decide whether main search should be true fallback-only or top-up fallback.
-> Docs/AGENTS/Handoffs/2026-05-09_Senior_Developer_UCM_Search_Config_Review.md

---
### 2026-05-09 | Senior Developer | Codex (GPT-5) | UCM Search Config Repair -- [Standard] [open-items: no]
**For next agent:** Applied the repair instead of blanket-reverting the other agent's changes. SR JSON defaults now match TypeScript Serper-primary defaults (`googleCse.priority=2`, `googleCse.dailyQuotaLimit=100`, `serper.priority=1`), and main search defaults to `autoMode: "first-success"` in JSON, Zod, and `DEFAULT_SEARCH_CONFIG`, so Google CSE is fallback-only rather than a top-up provider. Added a web-search regression test proving default AUTO search uses Serper and does not call Google CSE after Serper returns results. Verification: `npm -w apps/web test -- config-drift web-search` passed, `npm -w apps/web run build` passed, and full safe `npm test` passed on rerun. Caveat: `dailyQuotaLimit` remains metadata only; provider-side billing/quota controls still enforce the hard cap.
-> Docs/AGENTS/Handoffs/2026-05-09_Senior_Developer_UCM_Search_Config_Repair.md

Follow-up DB verification: local `apps/web/config.db` has active non-prompt rows only as system-owned mirrors of JSON defaults; `calculation/default`, `pipeline/default`, `search/default`, and `sr/default` active hashes all match file defaults. Active non-prompt override count is `0`, and active non-system/non-seed override count across `config_active` is `0`.

### 2026-05-09 | Lead Developer + LLM Expert | Codex (GPT-5) | Bolsonaro PT AC_03 ACS Selection Fix -- [Standard] [open-items: yes]
**For next agent:** Commit `1b5a8045` fixes the Portuguese Bolsonaro AC_03 omission at the ACS recommendation layer, not Stage 1. User-flagged job `0a3c00180b124625b056f5abd5b194e6` had Stage 1 `AC_03` but ACS dropped it as `opinion_or_subjective`. The prompt now treats standards-grounded evaluative/outcome-fairness claims as eligible and prevents process-compliance claims from swallowing distinct outcome/fairness claims. Focused ACS test passed; broad `npm test` hit unrelated runner integration timeouts that passed in isolation. Direct smoke job `5d6d1dac0bea4b92ad0d0b27da084bc2` carried all 3 final claims but bypassed ACS. Draft-only validation `58af6533aeb34604b996131fafb0b341` is the actual ACS proof: ranked/recommended/selected IDs are all `AC_01`, `AC_02`, `AC_03`, with AC_03 `fact_check_worthy`, medium yield, distinct outcome-fairness dimension. No final draft-backed report was confirmed after the UCM search repair; spend one full job only if Captain wants a visible end-to-end report artifact. Search UCM after the other agent's repair is Serper P1 / Google CSE P2 (`ed766a8e...`). Full-job budget after asylum + direct PT smoke is 7.

---
### 2026-05-09 | Lead Developer + LLM Expert | Codex (GPT-5) | Current-Pipeline PT And Asylum Reruns -- [Standard] [open-items: yes]
**For next agent:** Ran the two current-pipeline reports after prompt/config reseed and web-runner refresh on HEAD `6cf74370`. Draft-backed `bolsonaro-pt` job `1644fcf2e800417a948c46416d9eec48` confirms draft `58af6533aeb34604b996131fafb0b341` with `AC_01`, `AC_02`, and `AC_03` selected; result `LEANING-TRUE` 63/58, 3 final atomic claims, 3 claim verdicts, 6 boundaries, and AC_03 present as the sentence/fairness claim. This validates the PT ACS omission fix end to end, with caveat that AC_03 itself is still relatively weak (`55/52`) and the run had a research time-budget warning.

The exact `asylum-235000-de` rerun `0ea1066324f141f2ad6a81c53cf9a3ca` failed the corrected band: `MOSTLY-FALSE` 22/78. It had 1 support, 2 contradictions, and 13 neutral evidence items; stale/narrow SEM route values (2023 factsheet and 2024 `Total Personen aus dem Asylbereich (inkl. RU)` = 226,706) dominated as contradictions, while the report did not surface the current 2025 official aggregate route used by comparator `3ba25fe7c99f4b96822e37a6a65f6bb1` (`LEANING-TRUE` 62/68, 15 support / 4 contradiction / 17 neutral). Updated `Docs/WIP/2026-05-08_DirectionBasis_Regression_Fix_Proposal.md` Section 12.7 and the static comparator packet addendum. Stop rule remains active: no more live jobs on this lane before `/debt-guard`, failed-attempt classification, and a generic current-snapshot / official-aggregate route fix hypothesis. Remaining live-job budget from the latest allocation: 5.

Follow-up debate on how to continue: standard Advocate / Challenger / Reconciler returned `MODIFY`. Destination remains one narrow generic fix, but immediate implementation is rejected because the first divergence is not localized. Updated [2026-05-08_DirectionBasis_Regression_Fix_Proposal.md](/c:/DEV/FactHarbor/Docs/WIP/2026-05-08_DirectionBasis_Regression_Fix_Proposal.md:425) with Section 12.8: load `/debt-guard`, classify keep/quarantine/revert, then do a no-edit trace comparison of failed `0ea1066324f141f2ad6a81c53cf9a3ca` against local comparator `3ba25fe7c99f4b96822e37a6a65f6bb1` and deployed comparator `6a60b3eb0df540c0b16228d9367b1366`. Implement only after identifying where the current official aggregate route disappears or loses direction. Stop/re-debate if the fix would require broad query expansion, family-specific terms, deterministic semantic rescue, or behavioral `directionBasis` locks.

Second follow-up after no-edit localization: first divergence is now trace-backed to stale/current metric direction handling, not broad first-pass query breadth. Failed job `0ea1066324f141f2ad6a81c53cf9a3ca` labels the end-2024 SEM total `226 706` as `direct_metric_value` contradiction against a `current_snapshot` claim, while the deployed comparator `6a60b3eb0df540c0b16228d9367b1366` treats the end-2025 official total `235 057` as support and uses the older 2024 endpoint only as a calibrated counterpoint. The candidate fix keeps the existing LLM-mediated mechanism but exposes `freshnessRequirement` to the stages that needed it: `extractResearchEvidence(...)` passes it into `EXTRACT_EVIDENCE`, `assessEvidenceApplicability(...)` includes it in each claim payload, and the extraction prompt now shows Current Date / Freshness Requirement plus the generic stale-endpoint rule. Verification passed: focused `research-extraction-stage` + `verdict-prompt-contract` Vitest (173 tests), `npm -w apps/web run build`, and `git diff --check`. No live job spent yet; next gate is commit, restart/reseed, then exactly one `asylum-235000-de` canary and stop on first band failure. Remaining live-job budget: 5.

Live gate result: committed as `2258d99a`, restarted/reseeded, and submitted exactly one canary, `f079c5b6c5f84aa0941aafcff1b734a5`. Result was `TRUE` 93/82, so the stop rule fired. The patch fixed stale-current direction in the evidence pool (2023/older items neutral, 2025 SEM `235 057` support, zero final contradictions) but overcorrected at verdict calibration: Stage 4 treated a 57-person threshold exceedance plus official-source concentration as near-certain truth. Debt-guard classification: keep the metadata exposure and stale-endpoint direction correction as structurally justified, quarantine the live-quality claim, and do not stack another prompt change in this turn. Next work should be a separate reviewed Stage 4 calibration / near-threshold weighting hypothesis. Remaining live-job budget: 4.

Follow-up Stage 4 calibration slice: implemented and committed `eda022fc fix(stage4): calibrate barely satisfied thresholds`. The prompt-only change adds generic `VERDICT_ADVOCATE` and `VERDICT_RECONCILIATION` guidance that a barely satisfied threshold/current-stock relation can support the claim while still requiring lower truth/confidence calibration; no code mechanism, deterministic clamp, family-specific wording, flag, or fallback was added. Verification passed: focused `verdict-prompt-contract` test (`108`), `npm -w apps/web run build` with prompt reseed to `c50f1d795...`, and `git diff --check`.

Live gate after `eda022fc`: exact `asylum-235000-de` canary `5855f86b6b924c8fb4017ec2bd0e2d31` failed at `UNVERIFIED` 50/0. This did not test the intended Stage 4 calibration path: the report reached verdict with 7 neutral evidence items, 0 support, 0 contradiction, 2 sources, and warning `insufficient_evidence` because no non-seeded Stage 2 evidence survived provider search. Debt-guard classification: keep `eda022fc` as a static generic contract but quarantine its live-quality claim; active failure shifts upstream to route acquisition/admission under current Serper-primary runtime. Stop rule remains active. No more live jobs before no-edit comparison against `f079c5b6c5f84aa0941aafcff1b734a5` and deployed comparator `6a60b3eb0df540c0b16228d9367b1366`, focused on why the source-native 2025 aggregate route disappears or remains neutral. Remaining live-job budget: 3.

Third follow-up after no-edit route localization: implemented a narrow `GENERATE_QUERIES` prompt repair for current aggregate/threshold claims. The prompt now treats the newest current-statistics route and the latest complete official/institutional publication or data artifact as complementary, pivots incomplete current aggregate coverage toward latest complete source-native artifacts/tables/annexes/data files, and avoids invented exact date/month/edition/page labels unless already evidenced. This is a generic prompt-only amendment to the existing query mechanism, not provider tuning, family-specific search text, deterministic source recognition, or another verdict-stage guard. Verification passed: focused prompt-contract tests (`135`), `npm -w apps/web run build` with prompt reseed to `f8cff7b1986f...`, and `git diff --check`. Broad `npm test` hit three unrelated runner integration timeouts; the failed files passed directly afterward (`19` tests), so classify that as parallel test noise. Next gate: commit, restart/reseed, run exactly one `asylum-235000-de` canary, then stop on any band failure. Remaining live-job budget before that canary: 3.

Live gate after `a61aaf32`: exact `asylum-235000-de` canary `b6dfe982ac2145bd8e72cb21d0173cdd` failed at `UNVERIFIED` 50/24 on prompt hash `f8cff7b1986f...`. The query repair succeeded on acquisition: it fetched the official 2025 SEM annual-commentary PDF and CMS copy, including the decisive `235 057` aggregate. The active failure moved downstream: the same threshold-satisfying value was repeatedly labeled `contradicts`, leaving 0 supporting, 5 contradicting, and 9 neutral evidence items; citation integrity then downgraded the verdict because no supporting decisive citation side survived. Debt-guard classification: keep `a61aaf32` as a static acquisition-route improvement, but quarantine its live-quality claim. Stop rule remains active. No more live jobs before a no-edit direction trace comparison against `f079c5b6c5f84aa0941aafcff1b734a5` localizes why `EXTRACT_EVIDENCE` or `APPLICABILITY_ASSESSMENT` still marks a current threshold-satisfying primary metric as contradiction. Remaining live-job budget: 2.

---
### 2026-05-10 | Senior Developer | Codex (GPT-5) | Daily Bug Scan No Confirmed Regression -- [Standard] [open-items: no]
**For next agent:** Scanned committed changes from `ca619cc9` through `ba06cd69` since the automation timestamp `2026-05-09T06:02:06Z`. Reviewed the highest-risk code diffs directly, then ran focused safe verification on the touched surfaces: `claim-contract-validation.test.ts`, `research-extraction-stage.test.ts`, `research-acquisition-stage.test.ts`, `retrieval.test.ts`, `web-search.test.ts`, plus `git diff --check`. Everything passed, and no concrete regression signal emerged, so no fix was applied. If a later issue is reported against this window, start with retrieval commit `2147d5ed` and applicability-direction commit `10d72b80`, and re-run the same focused tests before proposing any patch.
-> Docs/AGENTS/Handoffs/2026-05-10_Senior_Developer_Daily_Bug_Scan_No_Confirmed_Regression.md

---
### 2026-05-09 | Lead Developer + LLM Expert | Codex (GPT-5) | Grouped Numeric Direction And Narrow-Margin Calibration Canaries -- [Standard] [open-items: yes]
**For next agent:** Implemented two prompt-only, generic repairs after the `a61aaf32` acquisition-route canary. Commit `a0632591` normalized grouped numeric thresholds in extraction/applicability/verdict citation adjudication; focused prompt-contract tests, build, and `git diff --check` passed. Its exact `asylum-235000-de` canary `73bf5061515d471ca746a80c27df8fe8` proved the direction bug was fixed (`235 057` support, no contradictions) but failed the Captain band at `TRUE` 93/78. Commit `86491d0a` added narrow-margin calibration language to Stage 4; focused prompt-contract tests, build, and `git diff --check` passed. Its exact canary `e6a0afc3ca01472b943c51c380cbeaa7` improved to `TRUE` 87/72 but still failed the expected 58-75 truth / 40-70 confidence band.

DEBT-GUARD RESULT: keep `a0632591` as the grouped-number direction fix; keep `86491d0a` as a static calibration contract, but quarantine both live-quality claims. The active first divergence is now support inflation, not acquisition or arithmetic direction: `e6a0...` still lets older/prior-year/source-native comparator rows such as the 2024 `226 706` value count as support for the current narrow-threshold claim, and boundary `CB_01` remains near-certain before aggregation. Remaining live-job budget for this lane is now `0`. Next step is no-edit comparison of `e6a0afc3ca01472b943c51c380cbeaa7` against exact local comparator `3ba25fe7c99f4b96822e37a6a65f6bb1` and deployed comparator `6a60b3eb0df540c0b16228d9367b1366`, focused on `claimDirectionByClaimId`, `directionBasis`, `directnessJustification`, boundary membership, and final support IDs. Do not run more jobs or add another prompt layer until that trace identifies whether `APPLICABILITY_ASSESSMENT`, Stage 4 support counting, or both are the minimal generic fix surface.

Follow-up no-edit trace and static fix: comparing `e6a0afc3ca01472b943c51c380cbeaa7` with deployed comparator `6a60b3eb0df540c0b16228d9367b1366` localized the support inflation earlier than Stage 4. The deployed comparator keeps `expectedEvidenceProfile` generic, while current canary `e6a0...` had Stage 1 profile entries already populated with evidence-discovered values (`235 057`, `226 706`, percentage change, and component counts). Stage 2 then treated those profile entries as accepted support routes, turning prior-year and component rows into support for a current narrow-threshold claim. Implemented `9e801335 fix(prompt): prevent profile support inflation`: `CLAIM_EXTRACTION_PASS2` now forbids copying evidence-discovered observed result values into expected profile targets; `EXTRACT_EVIDENCE` and `APPLICABILITY_ASSESSMENT` now clarify that evidence-discovered profile values and `componentMetrics` entries do not by themselves make prior/reference/component rows directional support. Verification passed: focused prompt-contract tests (`135`), `npm -w apps/web run build` with prompt reseed to `cae5097e...`, and `git diff --check`. This is not live-validated; remaining live-job budget is `0`. Next gate is exactly one `asylum-235000-de` canary on `9e801335` after Captain grants budget and runtime is fresh.

---
### 2026-05-09 | Lead Developer + LLM Expert | Codex (GPT-5) | Source Data Artifact Retrieval Live Pass -- [Standard] [open-items: yes]
**For next agent:** Latest Captain budget was 8 jobs; spent 1. Commit `2147d5ed` (`fix(retrieval): follow source data artifacts`) is the first live pass for exact `asylum-235000-de`: job `1df476e9638f49a3bbd4e7622c33fdfc` returned `LEANING-TRUE` 68/58, inside the corrected Captain band. The fix discovers same-family document/data artifacts from HTML pages, parses XLSX source text, and exposes/follows more candidate artifacts through an LLM relevance gate while keeping the fetch cap small. Verification before the live job: targeted retrieval/acquisition/config-drift tests, web build, full safe `npm test`, and runtime restart/reseed on `2147d5ed`.

Quality read: this is a real improvement, not just a lucky label. The report fetched current SEM March 2026 XLSX artifacts and reasoned that the end-2025 official aggregate `235 057` formally supports the claim while the 57-person margin, missing full March 2026 aggregate, and source concentration require downgrade. Residual caveat: the run fetched current `6-10`, `6-20`, and `6-22`, but not the manually identified current `6-51` RU sheet; some March partial-current evidence is still tagged `contradicts`, although final reasoning correctly treats it as methodologically incomplete rather than decisive contradiction. Updated the active WIP plan Section 12.14. Recommendation: do not batch-spend remaining budget. Compare this passing report against Captain expectations and best comparators first; then spend at most one stability rerun or move to one clearly specified different-family canary with its expected band and stop rule.

Follow-up after comparator review and one stability rerun: spent a second job from the 8-job allocation. Stability job `511c2b17299a49a5a9640505c40eac0f` ran the exact `asylum-235000-de` input on docs-only HEAD `553eed7c` with the same runtime source behavior and failed at `LEANING-FALSE` 32/60. Positive signal: source-data artifact retrieval is now confirmed stable enough to fetch current SEM XLSX artifacts including `6-50` and `6-51` RU sheets. Failure mechanism moved downstream: verdict reasoning stitched component/current tables into a custom March 2026 total and treated that as decisive false-side evidence, despite the Captain expectation requiring one clean official SEM aggregate or an explicit "no complete current aggregate" caveat. Updated `Docs/WIP/2026-05-08_DirectionBasis_Regression_Fix_Proposal.md`, `Docs/AGENTS/Captain_Quality_Expectations.md`, and `Docs/AGENTS/benchmark-expectations.json`. Stop rule is active; remaining budget from the latest allocation is 6. Next step is no-edit trace of `511c2b...` against passing `1df476...` and deployed comparator `6a60b3...`, focused on whether component stitching enters through `APPLICABILITY_ASSESSMENT`, Stage 4 verdict synthesis, or both.

---
### 2026-05-09 | Unassigned | Codex (GPT-5) | ZHAW AI Provider Briefing Review -- [Standard] [open-items: yes]
**For next agent:** Revised `C:\DEV\FactHarbor-internal\Operations\Finance\Finanzierung\ZHAW_Briefing_AI_Provider_Konditionen_2026-05-09.md`, consolidated four specialized sub-agent reviews, then refocused after user correction. Core message: ZHAW can build or co-finance a concrete, cheaper FactHarbor provider stack, not a generic ZHAW AI platform; separate Claude/ChatGPT workspace access from API credits and do not claim Claude for Education, Azure credits, Codex, GitHub Education, or cloud-credit stacking automatically cover API, Claude Code, Codex UI, and search costs.
→ Docs/AGENTS/Handoffs/2026-05-09_Unassigned_ZHAW_AI_Provider_Briefing_Review.md

---
### 2026-05-09 | Lead Developer + LLM Expert | Codex (GPT-5) | Asylum Component Neutralization Current Pass -- [Standard] [open-items: yes]
**For next agent:** Continued the active report-improvement lane under the Captain "do not pile up" rule and latest 8-job budget. After the false-side stability job `511c2b17299a49a5a9640505c40eac0f`, no-edit trace showed retrieval was no longer first cause: current SEM XLSX artifacts were available, but partial component rows were becoming decisive false-side evidence. Kept `2147d5ed` source-data artifact retrieval, then implemented two narrow generic fixes. Commit `989b3d02` updates `EXTRACT_EVIDENCE` / `APPLICABILITY_ASSESSMENT` so incomplete component arithmetic stays contextual unless the source provides a complete non-overlapping aggregate. Commit `10d72b80` lets explicit LLM neutral applicability reassessments demote existing directional extraction results instead of being ignored.

Verification passed before live use: focused `verdict-prompt-contract` and `research-extraction-stage` tests, web build/reseed, and full safe `npm test`. Runtime was restarted/reseeded on committed code before the live job. Exact `asylum-235000-de` canary `fd93d0de531243a18d2097b38351f4d4` on `10d72b80...+e3b0c442` returned `LEANING-TRUE` 70/60, inside the corrected Captain band. Evidence shape was 3 support / 1 contradiction / 32 neutral; current March component rows are neutral, and the only cited contradiction is the dated end-2024 SEM aggregate. Residual risk: the final narrative still uses component reconstruction as a caveat, so mark the family as current-pass/watch, not closed. Updated the WIP plan, Captain expectations, and benchmark JSON. Budget from the latest 8-job allocation: 4 jobs remain; next best use is likely canonical `bolsonaro-en` or a no-edit review before any further asylum stability spend.

---
### 2026-05-10 | Lead Developer + LLM Expert | Codex (GPT-5) | Bolsonaro EN Verifiability And Harm Advisory Fix -- [Standard] [open-items: yes]
**For next agent:** Fixed the canonical `bolsonaro-en` input path without topic-specific code. Debt-guard classification: keep prior claim-shape/support prompt fixes; amend Stage 2/D5 sufficiency and the high-harm label mechanism; do not pile on more prompt edits after the live pass. Commit `b0929435` lets D5 treat a claim as sufficient after targeted provider search when it has diverse, direct, one-sided, non-low seeded evidence even if no new non-seeded item survives extraction/deduplication. Commit `dc312317` preserves canonical truth-scale labels under the high-harm confidence advisory instead of overriding them to `UNVERIFIED`, registers `high_harm_low_confidence`, and adds generic prompt guidance that target-path safeguard records should not be demoted merely because they come from the adjudicating institution/process actor.

Verification passed: focused `verdict-stage`, `claimboundary-pipeline`, `verdict-prompt-contract`, and `config-drift` Vitest; `npm -w apps/web run build` passed after deleting stale generated `.next` cache; runtime was restarted/reseeded and version endpoint reported `dc312317...+c04cd346`. Live validation job `15ff9e18fea34816b8ee6fd8d96d87c2` returned overall `LEANING-TRUE` 60/58 on executed hash `dc312317...+c04cd346` and prompt hash `f4c65a5d...`. Claim shape is the intended three claims: AC_01 Brazilian law `MOSTLY-TRUE` 74/67 with 24 supports / 0 contradictions; AC_02 proceedings/fair-trial standards `MIXED` 55/55 with 11 supports / 3 contradictions; AC_03 verdicts/fair-trial standards `MIXED` 52/52 with 7 supports / 3 contradictions. This resolves the preparation failure and the `UNVERIFIED`/non-verifiable AC_03 failure. Residual risk: AC_02 and AC_03 are now verifiable but still `MIXED`; if Captain expects every atomic claim to be true-side, that is a separate quality target requiring another reviewed hypothesis and job budget.

Follow-up after Captain clarified that `MIXED` was not acceptable for AC_02/AC_03: fixed the canonical `bolsonaro-en` current path to a true-side, verifiable pass without topic-specific code. Commits: `48e884d3` kept remedy/appeal mechanics caveated unless they bridge to an operative defect; `ffe7a455` repairs one-sided direct-evidence verdicts stuck in the mixed/UNVERIFIED band; `5dc1d675` adds generic standards-claim query guidance to prioritize target-path safeguard/process records when budget may leave only one useful query. Focused `verdict-stage`, `verdict-prompt-contract`, and `research-extraction-stage` tests passed before live use, with restart/reseed on committed code.

Live sequence: `9d7fe6fed6a746b893a6ccc0176de733` recovered the article top-line but left AC_02/AC_03 `UNVERIFIED`; `5b8f118288964d1a84541123091c4803` proved Stage 4 repair alone was insufficient because AC_02 had no direct support; final exact job `8761ab59a825430ab3bd2ae325dc4573` on `5dc1d675...+a8d67c56`, prompt `d4096000...`, passed as `LEANING-TRUE` 65/50 with 6 boundaries and 3 claims. Claim verdicts: AC_01 `MOSTLY-TRUE` 74/63, AC_02 `LEANING-TRUE` 58/48, AC_03 `LEANING-TRUE` 62/44; AC_02/AC_03 both had supporting evidence and zero contradictions. Verified `state.gov` residue is only a preliminary-search candidate not selected for fetch and with zero extracted evidence. Updated `Docs/WIP/2026-05-08_DirectionBasis_Regression_Fix_Proposal.md`, `Docs/AGENTS/Captain_Quality_Expectations.md`, and `Docs/AGENTS/benchmark-expectations.json`. Treat `bolsonaro-en` as current-pass/watch, not closed: AC_03 confidence is just below the family band if claim-level bands are enforced, and one admin-only claim-local citation registry warning remains. Do not spend another Bolsonaro EN job until a no-edit report-quality review against `91bf6083` and `85812d61` identifies a focused stability question. This EN slice spent 3 jobs from Captain's later 8-job allocation, so count at most 5 remaining unless Captain resets the budget.

No-edit comparator review follow-up: with two read-only helper agents, inspected `8761ab59` against exact local comparator `91bf6083d26e407c98a474d89d2e618f` and exact deployed comparator `85812d61a3984fa6bb945d4096eaa039`, plus Q-codes and Captain expectations. Decision: no additional Bolsonaro EN job now. `8761ab59` is a valid current-stack exact pass/watch canary, but it should supplement, not replace, `91bf6083` / `85812d61` as best comparators. Main residuals are not rerun triggers: AC_03 confidence 44, one admin-only AC_02 claim-local citation registry warning, rejected zero-extraction `state.gov` preliminary-search residue, and a reporting inconsistency where `meta.evidenceBalance` still reports 18 support / 19 contradiction / 41 neutral while final evidence/narrative report 24 support / 0 contradiction / 61 neutral. Updated the active WIP Section 12.17. Recommended next use of budget: higher-value open validations; investigate the evidence-balance reporting mismatch without a live job if it matters.

Follow-up asylum-WWII first-band validation: spent 2 jobs from Captain's renewed 8-job budget on the exact canonical `asylum-wwii-de` input. Current-stack job `9e1f0f0014564edeaa0e673b43dc27e6` returned `MOSTLY-FALSE` 25/73; confirmatory current-stack job `ce265797d3fc4540a45aaeac99510e4a` returned `LEANING-FALSE` 30/63. Both preserve the important split: the current 235k subclaim can be true-side or definition-caveated, while the end-of-WWII comparison is false-side when evaluated as endpoint stock rather than cumulative wartime admissions/flows. Updated `Docs/AGENTS/benchmark-expectations.json` to first-band `MOSTLY-FALSE` / `LEANING-FALSE`, truth 18-42, confidence 50-75, min 2 boundaries; updated `Docs/AGENTS/Captain_Quality_Expectations.md` comparators and next actions; updated the active WIP Section 12.18. Excluded local `808e6f8ac29a4850b10ff04c9c534d85` as a weak comparator because it appears to use cumulative WWII admissions as support for an endpoint-stock claim. No more immediate asylum-WWII job is recommended; keep the family watch-listed until Captain accepts the new band or requests one later stability spot-check. Remaining renewed budget: 6 jobs.

---
### 2026-05-10 | LLM Expert | Codex (GPT-5) | Anthropic Cache Opt-Out Partial Patch -- [Standard] [open-items: yes]
**For next agent:** A partial, unverified cost patch exists only in `C:\DEV\FactHarbor`: `getPromptCachingOptions()` now accepts `{ enabled: false }`, and only `extractResearchEvidence(...)` opts out of Anthropic prompt caching because it renders full source bodies into the system prompt. `C:\DEV\Guest-List` is clean and was only the active desktop context by mistake. Run `npm -w apps/web test -- test/unit/lib/analyzer/research-extraction-stage.test.ts`, then `git diff --check`; do not run live jobs or expensive LLM suites unless Captain explicitly asks.
-> Docs/AGENTS/Handoffs/2026-05-10_LLM_Expert_Anthropic_Cache_Opt_Out_Partial_Patch.md

---
### 2026-05-10 | Senior Developer | Codex (GPT-5) | Anthropic Cache Opt-Out Verification -- [Standard] [open-items: no]
**For next agent:** The Anthropic cache opt-out patch is locally verified in `C:\DEV\FactHarbor`. `extractResearchEvidence(...)` is the only Stage 2 extraction path opting out with `getPromptCachingOptions(pipelineConfig.llmProvider, { enabled: false })`; relevance classification and applicability assessment still use normal cache metadata. Added direct helper coverage in `llm-routing.test.ts` because the extraction callsite test mocks the helper. Passed: targeted research extraction test, web build, targeted helper+research tests, and `git diff --check`. No live jobs or expensive LLM suites were run; live cache ROI telemetry remains a later operations measurement.
-> Docs/AGENTS/Handoffs/2026-05-10_Senior_Developer_Anthropic_Cache_Opt_Out_Verification.md

---
### 2026-05-10 | Unassigned | Codex (GPT-5) | ZHAW AI Provider Briefing Readability Pass -- [Standard] [open-items: yes]
**For next agent:** `C:\DEV\FactHarbor-internal\Operations\Finance\Finanzierung\ZHAW_Briefing_AI_Provider_Konditionen_2026-05-09.md` now separates FactHarbor minimal Betrieb vs Entwicklung needs, existing FactHarbor NPO discounts, ZHAW-relevant cost blocks, provider channels, out-of-scope research credits/grants, and optional ZHAW-internal clarification points. Keep the language neutral toward ZHAW and recheck volatile provider eligibility, billing terms, and UI/API coverage before external submission.
→ Docs/AGENTS/Handoffs/2026-05-10_Unassigned_ZHAW_AI_Provider_Briefing_Readability.md

---
### 2026-05-11 | DevOps Expert | Codex (GPT-5) | Gist Sync Secret Repair -- [Standard] [open-items: yes]
**For next agent:** Fixed stale Gist sync for `C:\DEV\FactHarbor-internal\Operations\Finance\Finanzierung\ZHAW_Briefing_AI_Provider_Konditionen_2026-05-09.md` by updating the `robertschaub/FactHarbor-internal` GitHub Actions `GIST_PAT` secret; workflow run `25641172865` attempt 2 now succeeds and the Gist content matches local. Do not rerun older failed run `25637799387`, because it would reapply an older commit; rotate to a dedicated least-privilege Gist PAT later.
-> Docs/AGENTS/Handoffs/2026-05-11_DevOps_Gist_Sync_Secret_Repair.md

---
### 2026-05-11 | Lead Developer + LLM Expert | Codex (GPT-5) | Bundesrat Accepted Rerun And SVP PDF Control -- [Standard] [open-items: yes]
**For next agent:** Recorded the latest validation state in `Docs/AGENTS/benchmark-expectations.json`, `Docs/AGENTS/Captain_Quality_Expectations.md`, and WIP Section 12.19. Captain accepted exact `bundesrat-rechtskraftig` job `f8e72c84fb004f23945e23c81973fc26` as good: `LEANING-FALSE` 32/80, 3 AtomicClaims, 5 boundaries, 88 evidence items, no user-visible warnings. The old zero-evidence/concurrent-run ambiguity is cleared; 32 is below the nominal truth band but inside the 8-point noise tolerance. Plastic control job `9d7ab72a60114878a96c30ffc517c347` failed operationally at progress 60 and is not report-quality evidence. User-approved SVP PDF URL job `4cc3dabe4dfa46d6b0b12ba1c1f0efa4` returned `LEANING-TRUE` 58/55 with 5 claims and useful broad-article signal, but it had user-visible `budget_exceeded` and `insufficient_evidence` warnings, with AC_04 (`655'000+ asylrechtliche Gesuche...`) `UNVERIFIED`. Captain clarified that future asylum validation should prefer exact `asylum-235000-de` (`Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`) over the WWII-comparison input unless explicitly requested. Conservative remaining submitted-job budget from the latest 8-job reset is 3.

---
### 2026-05-11 | Senior Developer | Codex (GPT-5) | Daily Bug Scan No Confirmed Regression -- [Standard] [open-items: no]
**For next agent:** Scanned committed changes from `7c25499a` through `f2254569` since the automation timestamp `2026-05-10T06:02:02Z`. Reviewed the code-bearing diffs directly, focusing on `b0929435` Stage 2 researched-seeded sufficiency, `dc312317` high-harm advisory label preservation, `ffe7a455` middle-band verdict repair, and `4609e9b9` Anthropic cache opt-out. Re-checked prior handoff notes for the cache patch, then ran focused safe verification: `npm -w apps/web test -- --run test/unit/lib/analyzer/verdict-stage.test.ts test/unit/lib/analyzer/research-extraction-stage.test.ts test/unit/lib/analyzer/claimboundary-pipeline.test.ts` and `npm -w apps/web run build`. Everything passed, and no concrete regression signal emerged, so no fix was applied. If a later bug report lands in this window, start with `b0929435`, `dc312317`, and `ffe7a455` before widening scope, because those commits changed sufficiency and final verdict behavior rather than docs or test-only surfaces.

---
### 2026-05-11 | Lead Developer + LLM Expert | Codex (GPT-5) | Runner Heartbeat Plastic Failure Repair -- [Standard] [open-items: yes]
**For next agent:** Fixed failed plastic job class from `9d7ab72a60114878a96c30ffc517c347`. Root cause was not plastic-specific report logic: the event trace showed an active analysis was marked `FAILED` by stale recovery after 15 minutes without a DB progress update, then verdict/result storage was ignored after terminal failure. Commit `37554ace` amends `apps/web/src/lib/internal-runner-queue.ts` with a 5-minute active-job heartbeat (`FH_RUNNER_JOB_HEARTBEAT_INTERVAL_MS` override, min 60s) and covers interval resolution in `internal-runner-queue.test.ts`. Verification passed: focused runner test, web build/reseed, full safe `npm test`, and clean restart on `37554ace`. Plastic verification job `38655e2b60d24aaf93ea16d044d1a1c4` then completed successfully with heartbeat events and no stale failure; result was `MIXED` 52/68, 3 claims, 6 boundaries, 124 evidence items. Operational failure is fixed, but plastic report quality remains open because truth 52 is above the expected calibrated false-side band; compare next against best exact comparator `32f00bb32d644a909f0c99521e800536` before spending another plastic job. The reset 8-job budget spent 2 jobs in this slice: asylum stability `aaaa8f6572c14b2bb3593866e1eefde5` (`MOSTLY-TRUE` 75/68, in band but upper edge) and plastic verification `38655e2b...`; 6 submitted jobs remain.
### 2026-05-11 | Lead Developer + LLM Expert | Codex (GPT-5) | Plastic Deploy-Readiness Review -- [Significant] [open-items: yes]
**For next agent:** Plastic exact input now has a current false-side edge diagnostic: `939563ecbea14a4c90249eb13c9743ef` returned `LEANING-FALSE` 37/62 with 3 clean claims, 6 boundaries, and no `report_damaged`. Keep `01466a0d` Stage 2 contradiction-query ordering and the Stage 1 observability commits; `3bd484a4` repair-prompt reinforcement was reverted by `4b3fb1d4` because it failed its only repair-path canary and the successful canary did not exercise repair. Current `main` is `21e9a817`, and localhost reports that commit after restart. The next decision is Captain-owned: either add `LEANING-FALSE` to `plastic-en` accepted labels as a false-side edge outcome, or keep the stricter current label set and investigate contradiction/refuting research direction before another prompt/code change. Details:
→ Docs/AGENTS/Handoffs/2026-05-11_Lead_Developer_LLM_Expert_Plastic_Deploy_Readiness_Review.md

Captain follow-up: Captain accepted `LEANING-FALSE` as acceptable for plastic reports in English and other languages, and accepted `939563ecbea14a4c90249eb13c9743ef` as a good report. `benchmark-expectations.json` now includes `LEANING-FALSE` for `plastic-en` with nominal truth band 10-42; `Captain_Quality_Expectations.md` lists `939563ec` as accepted current-stack exact while retaining `32f00bb32d644a909f0c99521e800536` as the stronger historical exact comparator. No further immediate plastic job is needed unless deployment validation requires a fresh current-hash repeat.

---
### 2026-05-11 | Lead Developer + LLM Expert | Codex (GPT-5) | Sequential Canary Stopped On Asylum Regression -- [Standard] [open-items: yes]
**For next agent:** Captain granted an 8-job sequential budget with a strict stop-on-first-bad rule and asked to monitor runtime. Spent 1 job only. Exact `asylum-235000-de` canary `4e9aef50951c48f58c4c758fc5fe18a6` ran on local `main` / web version `1e6b292cb146f9fce4c251bd1142da34c1a3e106` and failed the corrected true-side expectation: `MOSTLY-FALSE` 18/72, 1 claim, 5 boundaries, 23 evidence items, no hard runtime failure. Stop rule is active; do not submit more jobs until the regression is reviewed.

Root cause signal: Stage 1 claim extraction was faithful (`current_snapshot`, one direct threshold claim), but preliminary relevance rejected the direct 2025 official result `Asylstatistik 2025 - Der Bundesrat` from the first preliminary query, fetched only 2024 preliminary evidence, and then the Stage 1 expected-evidence profile named a stale 2024 SEM route. Stage 2 did one current query with irrelevant Serper results, then followed the stale profile into 2024 annual evidence. Final evidence balance was `supporting=0 / contradicting=2 / neutral=21`; the decisive 2025 SEM aggregate (`Total Personen aus dem Asylbereich (inkl. RU) = 235 057`) seen in passing comparator `aaaa8f6572c14b2bb3593866e1eefde5` was never admitted. Suspect surfaces, in order: preliminary relevance classification for source-native current-statistics route candidates, Stage 1 profile over-specialization to stale preliminary evidence for `current_snapshot`, then Stage 2 query fallback/iteration strategy when first current query yields zero accepted sources. Also observed Google CSE still being called and 429-ing despite Serper-primary intent; it recovered but adds noise/latency.

Runtime: `4e9aef...` took 11.94 minutes end-to-end (about 32s queue, 95s Stage 1, ~5.9m research/applicability, ~2.0m clustering, ~2.0m verdict+narrative). This is shorter than the local May 10-11 successful-job average (~22.3m) but still above old deployment notes that described ~7m typical and UI text that said 2-5m. Main runtime drivers are added LLM quality gates, repeated research/fetch/extract loops, applicability mapping, scope normalization/clustering, and verdict debate. Next recommended action: load `/debt-guard`, classify prior recent changes as keep/quarantine/revert candidates, and prefer one minimal generic fix around source-native current-route preservation before another live canary.

---
### 2026-05-12 | Lead Developer + LLM Expert | Codex (GPT-5) | Focused Prompt-Audit Cleanup Slice -- [Standard] [open-items: yes]
**Task:** Captain requested a focused `/prompt-audit`, reviewer debate, and cleanup-first continuation after repeated report-improvement trial failures and prompt/code pile-up.
**Files touched:** `apps/web/prompts/claimboundary.prompt.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** LLM Expert audit scored `claimboundary.prompt.md` poorly for generic hygiene, multilingual cue lists, substring-presence guards, duplicated current-route rules, and schema-boundary ambiguity. Reviewer debate verdict was `MODIFY`: no-edit diagnostics first, then a narrow cleanup patch, not broad cleanup-first. Diagnostics showed `claimboundary.prompt.md` is section-loaded, so full-file token size overstates live prompt cost; `EXTRACT_EVIDENCE` intentionally accepts `claimDirection: "contextual"` and Stage 2 maps it to persisted `neutral`; `CLAIM_CONTRACT_REPAIR` has broad code/test coupling and remains quarantined, not deleted. Applied one prompt-only cleanup slice: abstracted concrete examples, removed the freshness cue-word list including Captain-input vocabulary, replaced literal substring/pass language with semantic quoted-presence checks, and documented the `contextual` extraction-to-neutral persistence boundary.
**Verification:** Passed safe-local focused tests: `npm -w apps/web test -- claim-extraction-prompt-contract.test.ts`, `npm -w apps/web test -- verdict-prompt-contract.test.ts`, `npm -w apps/web test -- research-extraction-stage.test.ts`, and `npm -w apps/web test -- claim-contract-validation.test.ts`.
**Open items:** This cleanup does not claim to fix canary `4e9aef...`. Remaining likely root cause is still current/source-native route handling: Stage 1 profile overfit to stale 2024 preliminary evidence and Stage 2 admitted 2024 aggregate contradiction while missing the current aggregate support. Next cleanup/fix slice should consolidate current aggregate/component/source-route rules separately, after `/debt-guard`; then commit, refresh/reseed prompt state, and run one exact `asylum-235000-de` canary only.
**Warnings:** No live jobs were run in this slice. Do not submit live jobs against this prompt change until it is committed and runtime prompt state is refreshed/reseeded.
**Learnings:** For prompt audits, distinguish full-file size from section-rendered size. Treat `contextual` in `EXTRACT_EVIDENCE` as an extraction-stage label that maps to persisted `neutral`, not as a simple prompt/type bug.

Follow-up canary after commit/reseed: commit `e387a9e3` and prompt hash `a8498978...` were active on localhost before submission. Exact `asylum-235000-de` job `9bde7fdbb0cf454896169e6844e9fb1b` succeeded at `LEANING-TRUE` 68/58, inside the corrected Captain band and with the intended single AtomicClaim. It correctly surfaced the SEM 2025 aggregate `Total Personen aus dem Asylbereich (inkl. RU) = 235 057` as the decisive official total and caveated the absence of a March 2026 consolidated total. Do not treat this as closure: the raw evidence balance is inconsistent because the same SEM 2025 aggregate statement appears once as `supports` and once as `contradicts` via duplicate SEM URL variants, while the AtomicClaim narrative says there is no contradicting evidence. Runtime was 834 seconds with 33 evidence items, 25 sources, 32 normalized scopes, 6 boundaries, 30 LLM calls, and two Google-CSE 429 fallback warnings despite Serper usage. Stop-on-first-quality-issue remains the right posture; next work should be no-edit root-cause on duplicate/direction consistency and search-provider fallback noise before any broader validation batch.

Follow-up no-edit root-cause + narrow fix: canary `9bde7fdbb0cf454896169e6844e9fb1b` exposed one confirmed code inconsistency and one still-open semantic consistency risk. Confirmed fix: `runClaimBoundaryAnalysis` computed `meta.evidenceBalance` before applicability reassessment, then later applicability rewrote/filtered `state.evidenceItems`; the final report could therefore publish stale support/contradict/neutral counts. Patched `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` to recompute `evidenceBalance` immediately after applicability updates the evidence pool while preserving the pre-applicability balance for the existing contrarian-retrieval gate. Verified with `npm -w apps/web test -- claimboundary-pipeline.test.ts`, `npm -w apps/web run build`, and `git diff --check`. Open risk: the duplicate SEM 2025 aggregate still demonstrates a deeper LLM consistency problem, because two URL variants of the same official statement can carry conflicting non-neutral directions. Do not add deterministic number/text matching for this; the next candidate should be a reviewed, generic, probably LLM-backed duplicate-conflict adjudication or evidence-pool consistency pass, scoped to exact/near-duplicate evidence with conflicting directions. Google-CSE 429 behavior was investigated and appears consistent with current `first-success` fallback semantics when Serper yields no results; it is currently info-level/report-hidden noise, not the first quality fix.

Follow-up duplicate-direction prompt patch: applied `/debt-guard` and chose `amend` over adding a new post-applicability adjudication pass. `APPLICABILITY_ASSESSMENT` now has an `Evidence-Pool Direction Consistency` rule requiring materially identical evidence for the same AtomicClaim to avoid conflicting `claimDirectionByClaimId` entries unless a scope/time/metric-route/target difference explicitly changes direction. It also requires the JSON `claimDirection` to match the model's own correction in `directnessJustification` rather than leaving a contradicted field plus narrative self-correction. Added prompt-contract coverage in `verdict-prompt-contract.test.ts`. Verification passed: `npm -w apps/web test -- test/unit/lib/analyzer/verdict-prompt-contract.test.ts`, `npm -w apps/web test -- test/unit/lib/analyzer/research-extraction-stage.test.ts`, `npm -w apps/web test -- test/unit/lib/analyzer/claimboundary-pipeline.test.ts`, `npm -w apps/web run build` (reseeded claimboundary prompt hash prefix `86b44a3a9eeb...`), and `git diff --check`. Updated WIP Section 12.23. No live job has been run on this patch; commit and restart/refresh runtime before any exact `asylum-235000-de` canary.

Timing debt note: Captain asked to document the timing issues separately before continuing. Updated WIP Section 12.24 with current local samples: asylum-current jobs around 11.94-15.51 minutes, recent plastic jobs around 23.04-28.43 minutes, and the `d174b136...` canary finishing in 15.51 minutes. Main likely drivers recorded: added LLM quality gates, multi-iteration research/fetch/extract, applicability mapping, scope normalization/clustering, verdict debate/validation, high evidence/source volumes, Google-CSE fallback 429 noise, queue/concurrency, and stale UI ETA expectations. Keep this as a later performance lane; do not mix it into active report-quality fixes unless timing causes operational failure or verdict degradation.

Post-timing canary failure: exact `asylum-235000-de` job `d174b136feff4e898b9ba394272cd7e3` finished on commit `238858ac` / prompt hash `86b44a3a...` as `MOSTLY-FALSE` 15/78, outside the corrected Captain band. Stop rule is active; no further jobs should be submitted. No-edit comparator trace against good exact current-stack report `9bde7fdbb0cf454896169e6844e9fb1b` shows the first divergence is upstream of verdict calibration and upstream of the duplicate-direction prompt patch: `d174` generated/followed 2024 aggregate and component-status routes, never fetched the SEM 2025 annual aggregate; `9bde` generated `SEM Jahresbericht Asylstatistik 2024 2025 Gesamtbestand Asylbereich` and fetched both `stat-jahr-2025-kommentar-d.pdf` and the `admin.ch` 2025 release. Classification: keep `238858ac` evidence-balance recomputation; keep the evidence-pool direction-consistency prompt as structural hardening but quarantine its live-quality claim because this failed canary did not exercise the duplicate-source scenario. Next work should be no-edit review of Stage 1/Stage 2 current-snapshot aggregate route contracts, then at most one generic simplification-oriented fix that preserves both newest current/live route and latest complete official aggregate artifact route. Do not add domain-specific terms, deterministic semantic matching, or report-specific query hacks.

Primary-source refinement gate fix: Applied `/debt-guard` after `d174b136...` failed and after explorer `Boole` independently confirmed the suspected recovery-path issue. Existing Stage 2 primary-source refinement was the right mechanism but could be suppressed for current aggregate contracts by deterministic token-overlap coverage (`hasConcreteCurrentPrimaryMetricCoverage`) when stale or partial official evidence looked like the primary metric. Amended `apps/web/src/lib/analyzer/research-orchestrator.ts` so current aggregate metric contracts always spend the existing bounded refinement pass; removed the now-unused helper from that path. Updated `primary-source-refinement.test.ts` so stale/partial lookalike evidence no longer suppresses refinement. Verification passed: `npm -w apps/web test -- test/unit/lib/analyzer/primary-source-refinement.test.ts`, `npm -w apps/web test -- test/unit/lib/analyzer/claimboundary-pipeline.test.ts`, `npm -w apps/web test -- test/unit/lib/analyzer/research-extraction-stage.test.ts`, `npm -w apps/web run build` (reseed: 0 changed), and `git diff --check`. Next: commit before live job, refresh localhost, confirm `/api/fh/version`, then spend exactly one exact `asylum-235000-de` canary and stop on any band failure.

Stale-runtime canary + Stage 4 current-date patch: Exact `asylum-235000-de` job `74747a1b258b4d7da7672804ec73bc46` returned `MOSTLY-FALSE` 25/38 after about 19 minutes, but it is not a valid verification of `e51b85ed` because `executedWebGitCommitHash` and `promptContentHash` were null and the web listener PID had started before the code change. Treat this as stale-runtime evidence, not proof that the refinement patch failed. Useful diagnostic: the runner did not record a `primary_source_refinement` ledger entry, found March 2026 SEM component artifacts, and still hand-assembled a false-side component calculation instead of surfacing the expected official umbrella aggregate. Captain also identified a cleaner Stage 4 date-awareness symptom in `d174b136...`: the report narrated `zurzeit` as end-2024 despite runtime date `2026-05-12`. Explorer `Gibbs` independently confirmed the lowest-net-complexity fix: Stage 4 already receives `currentDate`, but `VERDICT_ADVOCATE`, `VERDICT_CHALLENGER`, `VERDICT_RECONCILIATION`, and `VERDICT_NARRATIVE` did not expose it. Patched `claimboundary.prompt.md` to add explicit Current Date fields and generic stale/prior-endpoint wording rules to those sections; added contract tests in `verdict-prompt-contract.test.ts`. Verification passed: `npm -w apps/web run test -- test/unit/lib/analyzer/verdict-prompt-contract.test.ts test/unit/lib/analyzer/prompt-frontmatter-drift.test.ts`, `npm -w apps/web run build` (reseeded claimboundary prompt hash prefix `5737b5bab778...`), and `git diff --check`. Next: commit, restart localhost with `scripts/restart-clean.ps1`, verify both web/API version endpoints where possible, then spend exactly one exact `asylum-235000-de` canary. Stop on any false-side/MIXED result, missing commit metadata, or missing refinement lane when the latest aggregate route is still unresolved after first main.

Clean canary failure + refinement candidate patch: After committing/restarting, exact `asylum-235000-de` job `2d72a002274f4606aa97d177d2d58344` still failed as `MOSTLY-FALSE` 15/68 on `f2e70bfd` / prompt hash `5737b5bab778...`. This is a valid failed verifier. The result JSON metadata recorded the intended commit/hash; the unauthenticated top-level job fields were null because those are admin-only. Official SEM source check confirmed the missed decisive value: the 2025 SEM annual commentary reports `Total Personen aus dem Asylbereich (inkl. RU)` as `235 057`, while the job anchored on the superseded 2024 `226 706` aggregate. Side-agent review from `Boole` and `Gibbs` agreed on the immediate structural failure: Stage 2 emitted `Generating direct-source refinement queries...`, but the refinement branch recorded no search/ledger entry because all generated refinement candidates could be removed by duplicate filtering and the no-selected path was silent. Applied `/debt-guard` and amended the existing mechanism only: `research-orchestrator.ts` now asks the LLM for a small refinement candidate pool larger than the execution budget, still executes only the configured refinement budget after filtering, and records `primary_source_refinement:no_unsearched_query` / `no_query_generated` ledger entries if no executable refinement query remains. Added focused duplicate-candidate and no-selected telemetry coverage in `primary-source-refinement.test.ts`. Verification passed: focused refinement test (`15` tests), focused refinement + verdict prompt + prompt drift tests (`134` tests), and `npm -w apps/web run build` (reseed 0 changed). Next: commit this slice, restart localhost, verify version endpoints, then spend one exact `asylum-235000-de` canary. Stop if it still misses the 2025 aggregate or records `primary_source_refinement:no_unsearched_query`.

Refinement route-priority follow-up: Committed/restarted `377397a9` and ran exact `asylum-235000-de` job `fac58feea8114d5197fadf8221cace00`. It passed the nominal Captain band as `LEANING-TRUE` 62/52 on commit `377397a9...` / prompt `5737b5ba...`, and the refinement lane now executed. But it is **not deploy-quality**: it did not admit the official SEM 2025 aggregate `235 057`; the only supporting evidence was an NZZ secondary article, while the verdict says no official SEM aggregate was directly found and relies on component arithmetic/plausibility. Keep `377397a9` as a mechanism fix, but quarantine its live-quality claim. Reviewer `Boole` diagnosed a prompt-priority conflict in `GENERATE_QUERIES`: for current snapshots the prompt told one-query cases to prioritize the newest current route, which is wrong for refinement when current/live routes already yielded only components. Reviewer `Gibbs` suggested a larger possible code patch to enrich query-generation evidence summaries; reserve that for the next verifier if needed. Applied the smaller prompt-only patch: refinement on current-snapshot `primaryMetric` claims now makes the first executable query target the latest complete source-native official/institutional publication/data artifact/table/annex/recurring report carrying the complete metric, with `freshnessWindow: none`, and avoids generic current/component routes unless they expose the complete metric. Verification passed: query prompt contract + prompt drift tests (`119` tests) and `npm -w apps/web run build`, which reseeded claimboundary prompt hash prefix `2e9f20dea67b...`. Next: commit, restart/reseed, run one exact canary, and accept only if it admits an official SEM aggregate source, not just a secondary-source true-side label.

Refinement fetch-breadth follow-up: Exact `asylum-235000-de` canary `2ee047fd218f4067963b778d41e2784b` on committed `6ce48692` / prompt `2e9f20d...` failed as `MOSTLY-FALSE` 22/58 after about 16.5 minutes. This is a valid failed verifier and the stop rule remains active. The run found current SEM component tables and NZZ support but still anchored on stale 2024 aggregate `226 706` plus a flawed March 2026 component calculation. Official SEM 2025 commentary confirms the Captain expectation is valid: `Total Personen aus dem Asylbereich (inkl. RU) = 235 057`, with broader recognized-refugee coverage than only `Ausweis B`. Root cause is source selection: the decisive 2025 annual commentary was LLM-rated relevant during refinement but not selected for fetch because refinement inherited the first-pass top-2 fetch cap. Reviewer `Gibbs` confirmed this is not the next prompt gap; the candidate existed and was lost at fetch selection. Applied `/debt-guard` and amended the existing mechanism only: ordinary first-pass main research still uses `researchFirstPassRelevanceTopNFetch`, but `focus === "refinement"` now uses normal `relevanceTopNFetch` breadth. Added `primary-source-refinement.test.ts` coverage proving main remains capped while refinement fetches the lower-ranked complete-artifact candidate set. Verification passed: focused refinement test (`16` tests) and focused refinement + research orchestrator/progress tests (`26` tests). Next: build, `git diff --check`, commit, restart localhost, then spend at most one exact canary. Accept only if the report admits the official SEM aggregate, not just a secondary-source true-side label.

Post-fetch-breadth acceptance + diagnostic cleanup: Exact `asylum-235000-de` canary `bb2133a191894da9bacf4f63e4b458ac` on `5068efef` / prompt `2e9f20d...` is Captain-accepted as a very good current exact report: `MOSTLY-TRUE` 78/68, 1 claim, 4 boundaries, 38 evidence items, 28 sources, official SEM 2025 aggregate `235 057` as direct support, no final contradicting evidence, and component/monthly rows used only as caveats. Truth 78 is above the nominal 58-75 band but inside the 8-point tolerance; keep the family on pass/watch because prior current-stack runs flipped false-side. Fixed the remaining admin-only diagnostic mismatch: stale pre-applicability `evidence_pool_imbalance` snapshot warnings are now reconciled against the final post-applicability evidence balance, while contrarian retrieval operational warnings using the same type are preserved. Updated `Docs/AGENTS/benchmark-expectations.json`, `Docs/AGENTS/Captain_Quality_Expectations.md`, and WIP Section 12.32. Verification passed: `npm -w apps/web test -- test/unit/lib/analyzer/claimboundary-pipeline.test.ts`, `npm -w apps/web run build`, and `git diff --check`. No live job was run after this cleanup; commit before any new validation.

Bolsonaro EN stop-on-first-bad follow-up: Exact `bolsonaro-en` canary `176d8345b6424abcacf1bfe1f4f8d0dd` on `c3e50afe` / prompt `2e9f20d...` failed as `UNVERIFIED` 43/24 after 26.8 minutes, so the batch was stopped. Atomic claims were correct, but Stage 4 synthesized AC_02 false-side and AC_03 `UNVERIFIED` despite a final evidence pool of `28` supporting / `1` contradicting / `67` neutral directional items. Root cause is not extraction or the stale-warning cleanup; Stage 4 lacked a compact claim-level direct-side inventory and missed direct supporting safeguard/verdict evidence inside a large evidence pool. Applied `/debt-guard` and amended the existing verdict prompt-packaging path: `verdict-stage.ts` now passes `directionalEvidenceSummaryByClaim` to advocate/challenger/reconciliation, and `claimboundary.prompt.md` uses it as a citation-completeness checklist without domain wording or deterministic semantic overrides. Verification passed: `npm -w apps/web run test -- test/unit/lib/analyzer/verdict-stage.test.ts`, `npm -w apps/web run test -- test/unit/lib/analyzer/verdict-prompt-contract.test.ts`, `npm -w apps/web run build`, and `git diff --check`. Next: commit, restart/reseed, verify version endpoints, then spend exactly one Bolsonaro EN canary and stop again on failure.

Bolsonaro EN direction-repair follow-up: Canary `8b51c1e1a36d4941bf97c0facbcafb60` on clean `61ee6d53` / prompt `3a112990...` partially recovered (`LEANING-TRUE` 65) but remained below release quality because confidence was 24 and AC_02/AC_03 were still safe-downgraded to `UNVERIFIED`. The failure is now narrower: direction repair returned middle-band truth values (`50`/`55`) for one-sided direct-support issues, and the integrity policy correctly rejected them because `LEANING-TRUE` starts at 58. Amended `VERDICT_DIRECTION_REPAIR` to state the structural band guide explicitly: 43-57 is middle-band; one-sided direct-support repair requires 58+ unless direct citations are cleared as non-probative. Verification passed: `npm -w apps/web run test -- test/unit/lib/analyzer/verdict-prompt-contract.test.ts`, `npm -w apps/web run build`, and `git diff --check`. Next gate: commit, restart/reseed, one exact Bolsonaro EN canary, then stop/escalate if AC_02/AC_03 remain `UNVERIFIED`.

Bolsonaro EN final canary after band-guide prompt: `aedb3a05046441aba3eb2f6047ca0e22` on clean `9b0e8efd` / prompt `608d073d...` landed `LEANING-TRUE` 64/43 with all three claims true-side (AC_01 65/50, AC_02 62/32, AC_03 62/30), 78 evidence items, 21 sources, 31 supporting / 0 contradicting / 47 neutral, and 0 user-visible warnings. Direction repair is now fixed, but quality is not comparator-level: confidence is 2pp below the canonical band and materially below preferred comparators `91bf6083` (63/52 local) and `85812d61` (68/62 deployed). Updated `benchmark-expectations.json`, `Captain_Quality_Expectations.md`, and WIP Section 12.33. Recommendation: stop Bolsonaro EN jobs for now; treat `aedb3a05` as current-watch partial recovery and move to no-edit prompt-audit/review on low confidence rather than stacking another prompt clause.

Captain acceptance update: Captain reviewed `aedb3a05046441aba3eb2f6047ca0e22` in the app and said it is OK from their POV. Updated `benchmark-expectations.json`, `Captain_Quality_Expectations.md`, and WIP Section 12.33 to mark it as Captain-accepted current OK/watch rather than merely technical partial recovery. Keep the caveat that it is not promoted above `91bf6083` / `85812d61` as best comparator because confidence remains lower.

Bundesrat-simple current-head canary: Spent 1 job on exact Captain input `Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben`. Job `1de78d0a5a2c428baba3f40d189e46a7` on clean current runtime `bce6365f` / prompt `608d073d...` succeeded as `TRUE` 97/93 with 2 AtomicClaims, 5 boundaries, 65 evidence items, and 41 sources. This confirms the corrected high-true band and matches best comparators `a6b0e0fc14984926a678a462456bc110` / `a53573047fe64778a76e53cb578900c7`, but it carried one user-visible `budget_exceeded` warning and took about 23.7 minutes. Updated `benchmark-expectations.json`, `Captain_Quality_Expectations.md`, and WIP Section 12.34. Recommendation: stop Bundesrat-simple jobs; next work is timing/performance cleanup if release readiness requires no visible budget warning.

Captain timing target update: Captain clarified that about 15 minutes average final-report runtime is acceptable, with shorter preferred. Extra delay is acceptable for inputs that generate more than 3 AtomicClaims and wait for interactive claim selection; that user-wait interval should be measured separately from final report processing. Updated WIP Section 12.24 so the timing/performance slice optimizes toward this service bar without weakening report quality.

SVP PDF preparation timing sample: For `https://www.svp.ch/wp-content/uploads/260324_Argumentarium-ohne-Q-A-DE.pdf`, draft `07d6242864074dd381bdff412649a639` prepared 5 candidate claims in 10.61 min (10.40 min Stage 1, 12.3s recommendation, Stage 1 retry). Draft `17eb5f1f9b0940f9b312dd14db2c4313`, linked to job `15d1c2aea5714e3baea3e9be53324e64`, prepared 5 candidate claims in 13.24 min (13.04 min Stage 1, 12.0s recommendation, 66.4s contract validation, Stage 1 retry) and the final job reused its prepared snapshot. Duplicate draft `8ba46331a0f745a59929d112c7c57034` was still `PREPARING` at progress 31 after more than 20 min, last seen in multi-claim atomicity audit. Updated WIP Section 12.24 to include preparation timing as a first-class bucket.

Timing Phase 0 reviewer + execution: Reviewer `Hooke` approved only a narrow measurement/documentation slice and explicitly rejected immediate runtime optimization in this pass. Consolidated WIP Section 12.35 with separate timing buckets for draft preparation, interactive claim-selection wait, queue, active final-runtime, and later PDF/report-generation timing. Built a no-job ledger from existing jobs: `bb2133` is within target at 13.85m wall / 13.55m active; `d174` is near target at 15.51m wall; `1de78`, `aedb3`, `38655`, and `939563` exceed target at 22-28m active/wall. `15d1` was still running at capture after 13.14m research despite reusing prepared Stage 1, showing final-runtime research cost is separate from SVP PDF preparation. Next candidate remains structural/no-quality-loss waste reduction, not prompt/model/search-semantic changes.

Resolved URL source reuse slice: Applied `/debt-guard` and classified the timing edge as an incomplete existing mechanism, not a reason for new prompt/model/search behavior. Existing exact document/data source reuse was amended so URL inputs resolved during Stage 1 can seed the already-fetched non-HTML body into preliminary/final research reuse paths. HTML remains excluded to preserve follow-up discovery. Duplicate active draft reuse was explicitly rejected for this low-risk slice because public draft creation returns a one-time access token and stores only the hash, so safe draft reuse needs separate ownership/token design. Touched `claimboundary-pipeline.ts`, `claim-extraction-stage.ts`, `types.ts`, and focused tests. Verification passed: prepared Stage 1 reuse test, preliminary-search dedupe test, web build with `0` prompt/config reseeds, and `git diff --check`. No live validation job has been run from this patch yet; commit and restart are required before any job should be submitted.

SVP pre-patch completion update: Job `15d1c2aea5714e3baea3e9be53324e64` finished after the timing ledger was first captured. It is pre-patch evidence, not validation of the resolved URL reuse change. Final result was `LEANING-FALSE` 35/24 with 3 selected claims, 60 evidence items, 33 sources, 6 boundaries, and 3 user-visible warnings (`budget_exceeded`, `verdict_citation_integrity_guard`, `verdict_integrity_failure`). Timing: 0.40m queue, 25.53m active / 25.94m wall, ~0.06m Stage 1 reuse, 13.14m research to budget, 4.00m SR/applicability, 2.98m clustering, 5.36m verdict/narrative. Updated WIP Section 12.35 accordingly.

Plastic selection preparation contract fix: Captain surfaced failed selection session `5bb38e4674554026aae07fd4b290354e` for exact input `Plastic recycling is pointless`. Root cause was prompt-level validator overreach: the initial claims had proxy explanatory tails and were correctly rejected; repair stripped them to clean dimension labels, but refined validation wrongly treated those labels themselves as proxy drift. Side-agent review confirmed no code-path bug. Applied `/debt-guard` and amended only `CLAIM_CONTRACT_VALIDATION` so a neutral dimension label is not classified as the explanatory tail while preserving strict rejection of post-label mechanisms, thresholds, causal stories, viability/contribution tests, and metric results. Commit `beacc933` passed focused prompt-contract tests (`98` tests), web build, and `git diff --check`; runtime restarted and `/api/fh/version` reported `beacc933`. Retried the same draft after restart: it reached `AWAITING_CLAIM_SELECTION`, prepared and recommended 3 claims, recorded commit `beacc933` and prompt hash `992a6fa...`, adopted contract repair, and validated the repaired claims as preserving contract. Prepared claims are the intended short forms: environmental impact, economic viability, and practical effectiveness. This validates preparation only; no full plastic report job was run from this patch. Updated WIP Section 12.37.

SVP PDF timing sample after resolved URL reuse commit: Job `9e2522c90ed944738f0a2eac2fcd7a14` completed on commit `fb2943db` / prompt `608d073d...` for the SVP PDF URL as `LEANING-FALSE` 38/40. Runtime was about 23.5 minutes wall-clock, with 3 claims, 6 boundaries, 46 evidence items, 40 sources, 45 LLM calls, and one user-visible `budget_exceeded` warning after the 11-minute research budget. Treat this as useful timing evidence for the post-reuse source state, not as proof that performance is solved; next performance work should focus on research iteration/budget behavior and source/evidence volume. Updated WIP Section 12.38.

Hydrogen boundary-label fix: After exact `hydrogen-en` canary `7cfa1e2107af4821bed5d672ea650052` failed as `UNVERIFIED` 50/0 due contract validation rejecting WTW/TTW measurement-boundary labels, applied `/debt-guard` and amended the existing prompt mechanism only. Commit `d5948391` lets short neutral measurement-window/system-boundary labels, including parenthetical aliases naming the same boundary, count as dimension labels for broad comparative efficiency/resource-use claims; result/mechanism/threshold/loss/proxy tails remain forbidden. Verification passed: focused prompt-contract tests (`98`), web build, `git diff --check`, side-agent review, restart/reseed. Fixed canary `1f838f8b81804aa6997601507a46da07` on `d5948391` / prompt `6f39b64e...` returned `FALSE` 8/78, 2 AtomicClaims, 6 boundaries, 54 evidence, 20 sources, and 0 user-visible warnings. Updated `benchmark-expectations.json`, `Captain_Quality_Expectations.md`, and WIP Section 12.39. Conservative remaining job budget from this 8-job slice: 5.

Grander draft triage: Captain pasted draft `b3a175bdd5be404f90efc058e3284dae` for the anchored Grander FAQ URL. It failed Stage 1 on old runtime `d30b993` / old prompt `992a6fa...`, not current `d5948391` / `6f39b64e...`. The failure was legitimate contract pressure: omitted explicit conjuncts plus consequence/mechanism tails. Do not spend another job on Grander unless Captain explicitly promotes that URL into the current validation set; if promoted, run one current-code URL/article stress test and compare against the April 2026 Grander follow-up notes before patching.

---
### 2026-05-12 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Phase 2 Source Inventory -- [Standard] [open-items: yes]
**For next agent:** Workspace: `C:\DEV\FactHarbor`. Git branch: `main`. Completed the read-only Phase 2 source-inventory checkpoint for the pipeline rebuild specification track. Created `Docs/WIP/2026-05-12_Pipeline_Rebuild_Phase2_Source_Inventory.md`, covering analyzer hot-path files, prompt/config/model/LLM surfaces, API/runner/persistence, ACS prepared-stage contracts, report/export, warnings/events, quality baseline docs, and relevant test surfaces. No analyzer source, prompt, config, UI, tests, live jobs, or validation behavior was changed or run. The inventory says no surfaces are intentionally excluded yet, but it does not classify mechanisms as removable.

Continue Phase 2 by producing factual baseline specs, not target architecture: Stage 1 contract/mechanism registry first, then Stage 2 evidence lifecycle, Stage 3 boundary formation, Stage 4/Gate 4, Stage 5/report compatibility, prompt/config/model baseline, and test/quality coverage. Preserve the deputy-team escalation rule from the plan; escalate to Captain only for high risk, no consent, validation spend, or material product/UI/API/report/persisted-data changes.

---
### 2026-05-12 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Phase 2 Stage 1 Baseline -- [Standard] [open-items: yes]
**For next agent:** Added `Docs/WIP/2026-05-12_Pipeline_Rebuild_Phase2_Stage1_Baseline.md` as the factual current-state baseline for Stage 1. It covers cold and prepared entry points, `extractClaims` sequence, `CBClaimUnderstanding` and `AtomicClaim` contracts, Gate 1 current filtering semantics, contract validation/repair, salience, atomicity, preliminary search/evidence seeding, ACS prepared snapshot compatibility, Stage 1 prompt sections, multilingual/input-neutrality mechanisms, deterministic semantic hotspots, tests, and a protective mechanism registry. This remains read-only specification work: no analyzer source, prompt, config, UI, tests, live jobs, or validation behavior was changed or run.

Continue Phase 2 with Stage 2 evidence lifecycle next. Carry forward the key Stage 1 risks: Stage 1 currently owns preliminary research as well as extraction; Gate 1 fidelity is telemetry-only and contract validation is the sole fidelity authority; ACS V1 prepared snapshots are persisted compatibility surfaces; inline prompt text and substring-based anchor checks need later governance review, not immediate edits.

---
### 2026-05-12 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Phase 2 Stage 2 Baseline -- [Standard] [open-items: yes]
**For next agent:** Added `Docs/WIP/2026-05-12_Pipeline_Rebuild_Phase2_Stage2_Baseline.md` as the factual current-state baseline for Stage 2. It covers `researchEvidence`, preliminary evidence remap/seeding, query generation, search/relevance/fetch, extraction, applicability, budgets/sufficiency, contradiction/refinement/supplementary English lanes, source-reliability prefetch, warnings, prompt/model/schema surfaces, multilingual/input-neutrality mechanisms, compatibility constraints, deterministic semantic hotspots, tests, and a protective mechanism registry. This remains read-only specification work: no analyzer source, prompt, config, UI, tests, live jobs, or validation behavior was changed or run.

Continue Phase 2 with Stage 3 boundary formation next. Carry forward the key Stage 2 risks: the current boundary includes post-research applicability and D5 sufficiency, not just `researchEvidence`; report JSON/UI/static HTML consume Stage 2 top-level shapes; prompt frontmatter and prompt-render coverage are incomplete for auxiliary sections; some warning/test surfaces appear stale; and several deterministic semantic hotspots need later LLM-vs-structural classification.

---
### 2026-05-12 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Phase 2 Stage 3 Baseline -- [Standard] [open-items: yes]
**For next agent:** Added `Docs/WIP/2026-05-12_Pipeline_Rebuild_Phase2_Stage3_Baseline.md` as the factual current-state baseline for Stage 3. It covers scope normalization, boundary clustering, `ClaimAssessmentBoundary` contracts, in-place `EvidenceItem.claimBoundaryId` assignment, fallback/general-boundary behavior, max-boundary merging, coverage matrix behavior, boundary concentration warnings, prompt/model/config surfaces, downstream Stage 4/5/report/UI/export dependencies, tests, and a protective mechanism registry. This remains read-only specification work: no analyzer source, prompt, config, UI, tests, live jobs, or validation behavior was changed or run.

Continue Phase 2 with Stage 4/Gate 4 next. Carry forward the key Stage 3 risks: exact-string `scopeFingerprint` still drives several semantic-looking decisions; scope normalization prompt expects `analyticalDimension` but runtime does not pass it; clustering rationales are parsed but not persisted; Stage 3 LLM fallback/low coherence are console/event-only rather than structured warnings; and boundary/report consumers create compatibility pressure on `claimBoundaries`, `coverageMatrix`, and `claimBoundaryId`.

---
### 2026-05-12 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Phase 2 Stage 4 Baseline -- [Standard] [open-items: yes]
**For next agent:** Added `Docs/WIP/2026-05-12_Pipeline_Rebuild_Phase2_Stage4_Baseline.md` as the factual current-state baseline for Stage 4 and Gate 4. It covers Stage 4 preflight, verdict debate sequence, UCM prompt/model/config surfaces, provider resilience, parse recovery, citation integrity, grounding/direction validation, direction repair, baseless challenge enforcement, source-reliability calibration, confidence-tier classification, warning behavior, persisted/API/UI/export contracts, tests, and a protective mechanism registry. This remains read-only specification work: no analyzer source, prompt, config, UI, tests, live jobs, or validation behavior was changed or run.

Continue Phase 2 with Stage 5/report compatibility and cross-cutting prompt/config/model contracts. Carry forward the key Stage 4 risks: Gate 4 has three active confidence bucket schemes; `qualityGates.gate4*` config exists but does not appear to drive the active CB Stage 4 tier path; Stage 4 has no observed wall-clock timeout knob; `advocateTemperature` appears configured but not wired into the advocate call; source-reliability adjustment has both optional LLM-backed calibration and legacy deterministic weighting; and static HTML export has stale result/quality-gate shape assumptions.

---
### 2026-05-12 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Phase 2 Stage 5 Baseline -- [Standard] [open-items: yes]
**For next agent:** Added `Docs/WIP/2026-05-12_Pipeline_Rebuild_Phase2_Stage5_Baseline.md` as the factual current-state baseline for Stage 5/report compatibility. It covers aggregation weights, `contradicts_thesis` inversion, non-direct zero weighting, optional article adjudication, verdict narrative generation, explanation-quality/TIGER report checks, quality-gate reporting, result JSON, warning/display behavior, API/UI/static export/metrics compatibility, prompt/model/config surfaces, tests, and a protective mechanism registry. This remains read-only specification work: no analyzer source, prompt, config, UI, tests, live jobs, or validation behavior was changed or run.

Continue Phase 2 with the cross-cutting prompt/config/model contract baseline, external compatibility baseline, complete mechanism/hotspot registry, and complexity diagnosis. Carry forward the key Stage 5 risks: downstream consumers independently derive verdict labels instead of using top-level `result.verdict`; static HTML export expects stale `overallVerdict` and old quality-gate shapes; markdown/export warning visibility diverges from `warning-display.ts`; article-adjudication and narrative failures can silently fall back; `qualityGates` thresholds differ from Stage 4 and metrics thresholds; `CLAIM_GROUPING` appears orphaned; prompt frontmatter variables are stale; and deterministic substring/regex checks still influence weights or report-quality classification.

---
### 2026-05-12 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Phase 2 Cross-Cutting Baselines -- [Standard] [open-items: yes]
**For next agent:** Added `Docs/WIP/2026-05-12_Pipeline_Rebuild_Phase2_Prompt_Config_Model_Baseline.md` and `Docs/WIP/2026-05-12_Pipeline_Rebuild_Phase2_External_Compatibility_Baseline.md`. The first covers prompt loading/governance, active sections, frontmatter drift, UCM defaults, model routing, provider fallback, budgets, timeouts, temperatures, and config/model test gaps. The second covers canonical result JSON, API persistence/list/detail behavior, runner contracts, ACS prepared snapshots and selected-claim metadata, UI/markdown/static export assumptions, validation/calibration/metrics dependencies, warning/quality-gate display contracts, and compatibility test gaps. This remains read-only specification work: no analyzer source, prompt, config, UI, tests, live jobs, or validation behavior was changed or run.

Continue Phase 2 with the complete mechanism/hotspot registry and complexity diagnosis, then draft the cleaned target specification for deputy-team review. Carry forward the key cross-cutting risks: prompt `variables` frontmatter is stale and render warnings are ignored; `CLAIM_GROUPING` is likely orphaned; model/config defaults are guarded but duplicate JSON keys are not; some config knobs are unwired or hardcoded at call sites; LLM provider fallback is not generic; the current result contract is clearer than its adapters; ACS is an external compatibility contract; static HTML, API quick fields, validation scripts, and metrics still consume stale or duplicated shapes.

---
### 2026-05-12 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Phase 2 Mechanism Registry -- [Standard] [open-items: yes]
**For next agent:** Added `Docs/WIP/2026-05-12_Pipeline_Rebuild_Phase2_Mechanism_Registry_and_Complexity_Diagnosis.md`. It consolidates the Stage 1-5 and cross-cutting baselines into a preserve/redesign/consolidate/quarantine registry, deterministic semantic hotspot registry, external contract disposition matrix, and complexity diagnosis. Deputy consensus was strong enough to continue without Captain escalation: preserve analytical gates and external contracts, reduce ownership drift and duplicate authorities, and require explicit adapters/tests before V2 cutover.

Continue by drafting the cleaned target specification. The spec must include a versioned result contract, external-consumer disposition matrix, clean architecture boundary map, prompt/config/model governance, warning policy across all surfaces, ACS compatibility rules, deterministic-hotspot dispositions, contract-test translation requirements, comparator-based quality gates, and a runnable/shadow strategy that keeps the current hot path intact until V2 is approved. No analyzer source, prompt, config, UI, tests, live jobs, or validation behavior was changed or run.

---
### 2026-05-12 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Target Specification Draft -- [Standard] [open-items: yes]
**For next agent:** Added `Docs/WIP/2026-05-12_Pipeline_Rebuild_Target_Specification_Draft.md` as the cleaned V2 target architecture draft for deputy review. It defines the target module boundaries, stage contracts, canonical result/adapter strategy, prompt/config/model governance, warning policy, external compatibility matrix, deterministic hotspot dispositions, pre-implementation contract tests, cutover gates, implementation slice outline, complexity-reduction criteria, rejected alternatives, and reviewer prompt.

Next step is deputy-team review before any implementation. Required lenses are Lead Architect, LLM Expert, Senior Developer, Code Reviewer, and Gemini/Challenger. The draft is intentionally conservative on external contracts: preserve UI/API/markdown/static HTML/metrics/validation/historical reports through adapters unless retirement or migration is explicitly approved. No analyzer source, prompt, config, UI, tests, live jobs, or validation behavior was changed or run.

---
### 2026-05-12 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Target Specification Review -- [Standard] [open-items: yes]
**For next agent:** Added `Docs/WIP/2026-05-12_Pipeline_Rebuild_Target_Specification_Review_Consolidation.md` and revised `Docs/WIP/2026-05-12_Pipeline_Rebuild_Target_Specification_Draft.md` after deputy review. First pass returned approve-with-required-changes from Lead Architect, LLM Expert, Senior Developer, Code Reviewer, and Challenger. The revised target spec now includes V2 implementation boundary/shadow strategy, schema skeletons, typed warning event contract, ACS consume/migrate default, stage failure/event matrix, cache governance, prompt-genericity gate, field-level external adapter matrix, mandatory hotspot verifiers, per-slice tests, concrete cutover gates, adapter-first implementation order, and mechanism retention/cleanup ledger.

Second pass returned approve from all five reviewer lenses with no remaining blockers and no Captain escalation. The target architecture is deputy-approved as the implementation baseline. Next work is implementation Slice 1 only: golden result/ACS/warning/legacy fixtures and JSON schema contract tests. No analyzer source, prompt, config, UI, tests, live jobs, or validation behavior was changed or run during the review.

---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Slice 1 Contract Fixtures -- [Standard] [open-items: yes]
**For next agent:** Committed the deputy-approved target specification as `869b8861` (`docs: add pipeline rebuild target specification`), then implemented Slice 1 only. Added shared analyzer-v2 contract artifacts under `apps/web/test/fixtures/analyzer-v2/`: V2 `ReportResult` JSON schema/fixture (`4.0.0-cb-shadow`), typed `WarningEvent` schema/fixture, V1 ACS `PreparedStage1Snapshot` schema/fixture, V1 ACS draft-wrapper schema/fixture preserving ranked/recommended/selected claim IDs, and V1 `3.2.0-cb` legacy result schema/fixture. Added focused structural contract tests in `apps/web/test/unit/lib/analyzer-v2/result-contract.test.ts`.

No V1 hot-path, API, UI, prompt, config, markdown, static export, runner, or analyzer source module was edited. Deputy reviewer `Franklin` confirmed the slice boundaries and escalation risks; the ACS draft wrapper was added from that review before validation. Verification passed: hot-path/API diff guard, focused contract test (`6` tests), `npm -w apps/web run build`, full safe `npm test`, and `git diff --check`. `npm ci` was needed because the new worktree had no local dependencies; it did not create tracked package changes. Build/test created ignored local caches/DB files only. Next slice should be compatibility adapters for V1/V2 fixtures across API list/detail, job UI, markdown/static export, metrics, validation, calibration, and historical report reads, still with V1 runtime default and no prompt/config/model/live-validation changes.

---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Slice 2A Compatibility View -- [Standard] [open-items: yes]
**For next agent:** Added the first read-only analyzer-v2 compatibility adapter in `apps/web/src/lib/analyzer-v2/compatibility-view.ts` plus fixture tests in `apps/web/test/unit/lib/analyzer-v2/compatibility-view.test.ts`. The adapter maps stored V2 or legacy V1 `resultJson` into `ResultCompatibilityView`, `toJobQuickFields`, and `toLegacyReportSurfaceModel`. V2 canonical fields stay authoritative: `verdict.label`, `truthPercentage`, `confidence`, V2 warning `displaySeverity`, and `primaryIssueEligible` are not re-derived through legacy bands or legacy warning-type names. Legacy `3.2.0-cb` stays on current top-level fields. The V2 fixture now includes explicit adapter-only fallback fields for legacy report surfaces (`claimVerdicts`, `claimBoundaries`, `searchQueries`, and V1-shaped `qualityGates`).

Deputy reviewer `Lorentz` approved this boundary as the right nucleus and warned not to wire public consumers until parity is fixture-proven. No V1 analyzer hot path, API route, C# API, UI page, markdown/static export, prompt, config, model, runner, or live validation path was changed. Verification passed: focused analyzer-v2 tests (`15` tests), hot-path/API diff guard, `npm -w apps/web run build`, full safe `npm test`, and `git diff --check`. Next work should mirror the quick-field/primary-issue rules in API-side fixture-backed tests before changing `JobService.cs`/`JobsController.cs`, then wire API list/detail, UI, HTML/export, metrics, validation, and calibration one surface at a time.

---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Slice 2B API Compatibility Mirror -- [Standard] [open-items: yes]
**For next agent:** Added API-side compatibility helper `ResultCompatibility` plus fixture-backed tests. `JobService.StoreResultAsync` and `JobsController` list/detail now share one C# extractor: V2 trusts canonical `verdict.*` fields and `warnings[].primaryIssueEligible`; non-V2 JSON preserves legacy quick-field paths and `analysis_generation_failed` behavior. Verified with 31 API tests, web analyzer-v2 fixture tests, API build, web build, full safe web test, hot-path diff guard, and `git diff --check`.
→ Docs/AGENTS/Handoffs/2026-05-13_Lead_Architect_Pipeline_Rebuild_Slice_2B_API_Compatibility.md

---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Slice 2C Web Report Surface -- [Standard] [open-items: yes]
**For next agent:** Wired the web job detail/report and HTML export surfaces to the analyzer-v2 compatibility view. Raw JSON remains raw; V2 display/export uses `toLegacyReportSurfaceModel`, with V2 coverage matrix mapped to legacy `{ claims, boundaries, counts }`, original meta preserved, and HTML export using canonical top-level `result.verdict` before legacy per-claim fallbacks. Debt-guard applied after the first focused export test exposed numeric per-claim verdict handling in the existing exporter. Verified with focused V2 adapter/export tests, web build, full safe web test, hot-path diff guard, and `git diff --check`.
→ Docs/AGENTS/Handoffs/2026-05-13_Lead_Architect_Pipeline_Rebuild_Slice_2C_Web_Report_Surface.md

---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Slice 2D Calibration/Audit Compatibility -- [Standard] [open-items: yes]
**For next agent:** Wired calibration runner and paired-job audit read paths to the analyzer-v2 compatibility view for V2-only reads while preserving legacy V1 and unknown/raw fallback behavior. `SideResult.fullResultJson` remains canonical/original, V2 warning details are preserved for calibration diagnostics, and paired audit reads V2 canonical `verdict.truthPercentage` plus warning rationale through the adapter. Verified with focused V2/V1/raw calibration and audit tests, web build, full safe web test, hot-path diff guard, and `git diff --check`.
→ Docs/AGENTS/Handoffs/2026-05-13_Lead_Architect_Pipeline_Rebuild_Slice_2D_Calibration_Audit_Compatibility.md

---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Slice 2E Validation Summary Compatibility -- [Standard] [open-items: yes]
**For next agent:** Updated `scripts/validation/extract-validation-summary.js` so validation batch summaries read V2 canonical verdict fields, V2 warning rationale, V2 fallback claim verdicts, and V1-shaped fallback quality gates while preserving legacy V1 and unknown/raw historical summary behavior. The script remains standalone CommonJS; tests pin V2/V1/raw behavior and import safety. Verified with focused script tests, syntax/import checks, web build, full safe web test, hot-path diff guard, and `git diff --check`.
→ Docs/AGENTS/Handoffs/2026-05-13_Lead_Architect_Pipeline_Rebuild_Slice_2E_Validation_Summary_Compatibility.md

---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Slice 2F Validation Matrix Compatibility -- [Standard] [open-items: yes]
**For next agent:** Updated the older `scripts/run-validation-matrix.js` reader so V2 matrix metrics use canonical verdict fields, canonical `sources.items`, and normalized V2 warnings while legacy V1/unknown results keep the old `verdictSummary`/`analysisContexts`/`fetchSuccess` path. The script remains standalone CommonJS and import-safe for tests. Verified with focused script tests, syntax/import checks, web build, full safe web test, hot-path diff guard, and `git diff --check`.
→ Docs/AGENTS/Handoffs/2026-05-13_Lead_Architect_Pipeline_Rebuild_Slice_2F_Validation_Matrix_Compatibility.md

---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Slice 2G Evidence Quality Reader Compatibility -- [Standard] [open-items: yes]
**For next agent:** Updated the offline `scripts/measure-evidence-quality.ts` reader so V2 fixtures are parsed from canonical `evidence.evidenceItems` and `sources.items`, legacy V1 uses `evidenceItems`/`sources`, and unknown historical inputs keep the old `facts` preference. The script is now import-safe for tests. A runtime-adjacent `metrics-integration.ts` experiment was reverted after deputy review; analyzer runtime metrics remain deferred. Verified with focused script tests, CLI help smoke, web build, full safe web test, scope guard, and `git diff --check`.
→ Docs/AGENTS/Handoffs/2026-05-13_Lead_Architect_Pipeline_Rebuild_Slice_2G_Evidence_Quality_Reader_Compatibility.md

---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Slice 2H Legacy Live Runner Readers -- [Standard] [open-items: yes]
**For next agent:** Added a shared structural reader for legacy live-job scripts at `apps/web/scripts/result-metrics-reader.js`, made `baseline-runner.js` import-safe, routed `regression-test.js` through the shared reader, and pinned V2/V1/unknown behavior in `apps/web/test/unit/scripts/live-runner-result-readers.test.ts`. Deputy team plus Claude Opus advisors chose this offline Slice 2H; no live jobs were used, so the approved budget remains 8 for Slice 3+.
→ Docs/AGENTS/Handoffs/2026-05-13_Lead_Architect_Pipeline_Rebuild_Slice_2H_Legacy_Live_Runner_Readers.md

---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Slice 3 Disabled V2 Shell -- [Standard] [open-items: yes]
**For next agent:** Added the double-gated disabled V2 shell seam: `execution-selection.ts` keeps V1 default, `pipeline-shell.ts` fails fast with `ANALYZER_V2_SHELL_NOT_IMPLEMENTED`, and `internal-runner-queue.ts` calls V2 only for stored `claimboundary-v2` jobs plus `FH_ANALYZER_V2_SHELL=enabled` or `FH_ANALYZER_PIPELINE=v2-shadow`. Public API/UI/prompts/config stayed unchanged, no live jobs were used, and the approved budget remains 8 for the first runtime-relevant V2 gate.
→ Docs/AGENTS/Handoffs/2026-05-13_Lead_Architect_Pipeline_Rebuild_Slice_3_Disabled_V2_Shell.md

---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Slice 4 V2 Damaged Envelope -- [Standard] [open-items: yes]
**For next agent:** `runClaimBoundaryV2Shell` now returns a schema-valid `4.0.0-cb-shadow` damaged envelope through `runClaimBoundaryPipelineV2`; the envelope is explicitly non-analytical (`UNVERIFIED`, confidence 0, `report_damaged`, `damagedReport: true`). Runner V2 metadata now stays schema-valid by avoiding V1-only `meta.pipelineVariant*`; prompt/config/model gateway remains the next slice. No live jobs used; budget remains 8.
→ Docs/AGENTS/Handoffs/2026-05-13_Lead_Architect_Pipeline_Rebuild_Slice_4_V2_Damaged_Envelope.md

---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Slice 5 Gateway Governance Skeleton -- [Standard] [open-items: yes]
**For next agent:** Added V2-local gateway contracts under `apps/web/src/lib/analyzer-v2/gateway/`: static task policy, pure cache-key governance, and a surface ledger covering every current V1 stage plus quarantine/defer candidates (`CLAIM_GROUPING`, `orchestrated`, `model-tiering`, config knobs, hardcoded model params). Tests block unapproved executable tasks and enforce ledger exhaustiveness. No prompt/config/model/runtime/API/UI changes; no live jobs used; budget remains 8.
→ Docs/AGENTS/Handoffs/2026-05-13_Lead_Architect_Pipeline_Rebuild_Slice_5_Gateway_Governance_Skeleton.md

---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Slice 6A Claim Understanding Contracts -- [Standard] [open-items: yes]
**For next agent:** Added V2 `ClaimContract` types/schema/fixture plus a pure ACS prepared-snapshot migration adapter in `apps/web/src/lib/analyzer-v2/claim-understanding/`. Gateway policy now declares Claim Understanding variables and cache dimensions while remaining non-executable. Franklin, Lorentz, and Claude Opus 4.6 approved the contracts-only boundary; no prompt/runtime/API/UI/live-job changes were made.
→ Docs/AGENTS/Handoffs/2026-05-13_Lead_Architect_Pipeline_Rebuild_Slice_6A_Claim_Understanding_Contracts.md

---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Progress Diagrams -- [Standard] [open-items: yes]
**For next agent:** Updated `Docs/WIP/2026-05-12_Pipeline_Rebuild_Target_Specification_Draft.md` with Section 1.1, including current Slice 6A status and Mermaid diagrams for implementation progression and architecture boundaries. Review consolidation status now reflects implementation in progress. No source/prompt/config/API/UI/live-job behavior changed.
→ Docs/AGENTS/Handoffs/2026-05-13_Lead_Architect_Pipeline_Rebuild_Progress_Diagrams.md

---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild xWiki Crosscheck And Diagrams -- [Standard] [open-items: yes]
**For next agent:** Reviewed relevant `.xwiki` architecture and diagram pages as design intent, then added Sections 1.2-1.3 to `Docs/WIP/2026-05-12_Pipeline_Rebuild_Target_Specification_Draft.md`. The target spec now identifies useful xWiki intent, stale/rejected mechanisms, and includes V2 request lifecycle, detailed pipeline, entity model, and quality-gate/warning Mermaid diagrams.
→ Docs/AGENTS/Handoffs/2026-05-13_Lead_Architect_Pipeline_Rebuild_xWiki_Crosscheck_Diagrams.md

---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild xWiki Integration Debate -- [Standard] [open-items: yes]
**For next agent:** Franklin, Lorentz, and Claude Opus 4.6 reconciled the question of whether to debate deeper xWiki integration. Verdict: `MODIFY`; no broad spec rewrite or contract mutation, but add a compact `Design Intent Mapping` table to Section 1.2 of `Docs/WIP/2026-05-12_Pipeline_Rebuild_Target_Specification_Draft.md`.
→ Docs/AGENTS/Handoffs/2026-05-13_Lead_Architect_Pipeline_Rebuild_xWiki_Integration_Debate.md

---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Plan Status Consolidation -- [Standard] [open-items: yes]
**For next agent:** Added execution-status addenda to `Docs/WIP/2026-05-12_Pipeline_Rebuild_Specification_Plan.md` and `Docs/WIP/2026-05-12_Pipeline_Rebuild_Plan_Review_Consolidation.md`. The plan now points to the target spec as operative, records Phases 1-5 complete and Phase 6 stable through Slice 6A, and preserves the Slice 6B approval boundary.
→ Docs/AGENTS/Handoffs/2026-05-13_Lead_Architect_Pipeline_Rebuild_Plan_Status_Consolidation.md

---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild V2 xWiki Documentation -- [Standard] [open-items: yes]
**For next agent:** Created V2 sibling xWiki pages for AKEL Pipeline, AKEL Pipeline Detail, Data Model, Quality Gates, Verdict Debate Pattern, and Prompt Architecture, plus reusable V2 diagram pages and a diagram-only Academic Cooperation V2 appendix. The current V1 xWiki pages remain intact as production-runtime documentation; V2 pages document target architecture and current guarded status only. No source, prompt, config, API, UI, runtime, or live-job behavior changed.
→ Docs/AGENTS/Handoffs/2026-05-13_Lead_Architect_Pipeline_Rebuild_V2_xWiki_Documentation.md

---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild xWiki Spec Refinements -- [Standard] [open-items: yes]
**For next agent:** Franklin and Lorentz reviewed the xWiki-derived spec update and both returned `MODIFY`; the consolidated outcome is a bounded Section 1.4 addendum in `Docs/WIP/2026-05-12_Pipeline_Rebuild_Target_Specification_Draft.md`. It adds documentation parity, research-platform validation lenses, report-quality visibility, ledger-to-audit mapping, ACS selected-claim integrity, V2 xWiki reader links, and a stale-mechanism non-import list while preserving source/tests/fixtures as implementation authority. After commit, local Claude Code CLI review with Claude Opus returned `APPROVE`, no blockers, no required edits, and commit should stand as-is. No code, prompt, config, runtime, API, UI, or live-job behavior changed.
→ Docs/AGENTS/Handoffs/2026-05-13_Lead_Architect_Pipeline_Rebuild_xWiki_Spec_Refinements.md

---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild V2 Documentation Equivalents -- [Standard] [open-items: yes]
**For next agent:** Added V2 xWiki equivalents for `Quality and Trust`, `Pipeline Variants`, `Calculations and Verdicts`, `Evidence Lifecycle`, and `Source Reliability`, plus Markdown companions for V2 calculations and evidence lifecycle. Current/V1 docs now carry V2 target pointers while remaining runtime references. Franklin required one Evidence Lifecycle V2 diagram correction; Lorentz and Claude Opus 4.6 approved the corrected docs-only slice. No source, prompt, config, runtime, API, UI, or live-job behavior changed.
→ Docs/AGENTS/Handoffs/2026-05-13_Lead_Architect_Pipeline_Rebuild_V2_Documentation_Equivalents.md

---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | V2 Clean-Room Boundary Enforcement -- [Standard] [open-items: yes]
**For next agent:** Analyzer V2 now has a V2-owned ingress DTO plus a named `runner-ingress.ts` one-way mapping from current runner/job shape. Static boundary tests block imports from `@/lib/analyzer/**`, legacy prompt reuse in prompt-loading contexts, key V1 contract identifiers, and executable analyzer-v2 fixtures. Docs/spec now state no V1 code, prompt, type reuse, or cloning; runner compatibility mapping is allowed only at the seam. Franklin/Lorentz required the stricter no-cloning framing; Claude Opus approved the final patch.
→ Docs/AGENTS/Handoffs/2026-05-13_Lead_Architect_V2_Clean_Room_Boundary_Enforcement.md

---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | V2 Pre-Cutover Terminology And Naming Policy -- [Standard] [open-items: yes]
**For next agent:** Captain rejected the terminology around "non-public V2 evaluation" / "internal V2 evaluation result" and the prior temporary naming. The forward contract now uses `4.0.0-cb-precutover` and `FH_ANALYZER_PIPELINE=v2-precutover`, with no compatibility alias for the rejected schema/flag. V2 docs now describe a gated pre-cutover development/verification path, not a separate side evaluation path. The target spec and AKEL Pipeline Detail V2 page record the final naming policy: temporary rebuild names are allowed only at the boundary while V1 still exists; V2 internals use clean domain names; after V1 deletion, a mandatory naming-normalization cleanup slice removes temporary labels from final runtime code. Source Reliability V2 now explicitly states that the existing Source Reliability service/cache/admin/prompt/config surfaces remain unchanged by the pipeline rebuild; V2 only defines a thin consumption boundary.

---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | V1 Prompt Cleanup Conditions And Quality Rationale -- [Standard] [open-items: yes]
**For next agent:** Captain clarified that current V1 pipeline quality is not accepted as stable or sufficient and has not meaningfully progressed since deployment / the early ClaimAssessmentBoundary period, so V1 code, prompts, and mechanisms are not quality baselines for V2. Updated the target spec, execution plan, AKEL Pipeline V2, Prompt Architecture V2, and Pipeline Variants V2 to make V1 analysis prompt files/profiles/sections/UCM active prompt entries explicit removal debt once V2 owns and verifies corresponding prompt-backed tasks. Cleanup conditions now require V2-owned prompt profile/section/schema/approval/tests, no runtime loader/registry/config/model route to V1 prompts, historical reads through stored data/fixtures/adapters, static prompt-boundary and prompt/config/model tests, and deputy signoff on archive vs delete.

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Quality-Constrained Cost Latency Targets -- [Standard] [open-items: yes]
**For next agent:** Captain accepted lower normal/complex V2 cost and latency targets only if quality is not compromised. Franklin approved and Lorentz modified the tightening as budget envelopes, not hard promises before runtime data. Updated the target spec, execution plan, AKEL Pipeline V2, AKEL Pipeline Detail V2, Prompt Architecture V2, Pipeline Variants V2, and Quality Gates V2. New targets: normal 6-10 min / $0.50-$1.25 with review above 12 min or $1.75; complex 10-18 min / $1.25-$3.25 with review above 22 min or $4.00; deep-review exceptions require explicit approval. The model gateway is the budget governor, every prompt-backed task needs call/token/timeout/retry/cache/escalation policy, and budget exits must surface through sufficiency/scarcity/warning/damaged-report behavior rather than hidden quality loss.

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Prevention-First Recovery Policy -- [Standard] [open-items: yes]
**For next agent:** Captain clarified that retries and repairs should be prevented conceptually, while quality remains priority. Franklin approved and Lorentz modified a prevention-first policy: retries/repairs are exceptional safeguards, not normal control flow; no absolute zero-retry rule because provider/network/schema failures still need bounded structural resilience. Updated the target spec, execution plan, AKEL Pipeline V2, AKEL Pipeline Detail V2, Prompt Architecture V2, Quality Gates V2, and Pipeline Variants V2. Key rule: use contract-first prompts, structural preflight validation, stable IDs, valid uncertainty states, sufficiency-before-verdict gating, and right-model-first policy for high-leverage stages. Hidden semantic repair and repeated "try again for a better answer" loops are forbidden. High retry/repair rates block cutover until the responsible contract, prompt, model policy, evidence packet, or gate is improved.

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Analysis Session UX And Mode Policy -- [Standard] [open-items: yes]
**For next agent:** Captain clarified that V2 should not keep the current Atomic Claim preparation, selection, and execution UX split as separate user journeys. Documented the approved one-session model plus readiness checkpoint: visible mode choice before each submission, Unattended default for normal users, Attended for advanced focus review, Deep review for explicit admin/internal cases, server-authoritative caps/forced-review, selection-only focus changes, no claim wording edits, no job before finalized focus, adaptive focus recommendation to reduce unnecessary LLM rounds, report focus provenance, and no further architecture-wide redesign before continuing except the hard Slice 6B prompt/model approval and LLM Expert review gate.

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Report Generation Regression Control -- [Standard] [open-items: yes]
**For next agent:** Captain asked whether future report-generation improvements need built-in regression prevention and rollback. Documented this as mandatory for Stage 5/report surfaces: versioned report-generation profiles, ReportResult provenance, golden corpus using Captain-defined inputs and pinned deployed comparators, stored-canonical-packet replay where upstream contracts are unchanged, candidate-vs-approved comparison with improvement/neutral/accepted_tradeoff/regression classification, promotion gates, deputy signoff for accepted tradeoffs, and rollback/quarantine for regressing profiles.

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Implementation Guardrails -- [Standard] [open-items: yes]
**For next agent:** Added the durable guardrail layer requested after Sonnet/Gemini debate: `apps/web/src/lib/analyzer-v2/AGENTS.md`, canonical `Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md`, and stronger `boundary-guard.test.ts` checks for local/canonical guardrail discoverability, expanded V1 pipeline-owned type bans, and mandatory V2 report-generation provenance. The V2 ReportResult schema, fixture, and damaged shell envelope now carry `reportGeneration` provenance so future report-generation rollback controls are mechanically visible.

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Workspace Rehome -- [Standard] [open-items: no]
**For next agent:** Active V2 pipeline rebuild workspace: `C:\DEV\FactHarbor`. Git branch: `main`. Preserved prior workspace: `C:\DEV\FactHarbor-main-before-v2-rehome`. Preserved Git branch: `codex/main-before-v2-rehome` at `31b3ea90`. The retired duplicate V2 workspace has been removed.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Workspace_Rehome.md

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Final Implementation Readiness Review -- [Standard] [open-items: yes]
**For next agent:** Final review by Gemini, Claude Opus, and two deputy reviewers kept Slices 1-6A and rejected redo/quarantine. Continue with Slice 6A.5 only: full ACS snapshot ingress, shell-placeholder claim-id isolation, ACS/direct-input cache-policy alignment, and 6B prompt-output-to-`ClaimContract` schema mapping tests. Slice 6B remains blocked until 6A.5 completes plus Captain approval and LLM Expert review.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Final_Implementation_Readiness_Review.md

---
### 2026-05-14 | Senior Developer | Codex (GPT-5) | V2 Slice 6A.5 Pre-6B Contract Hardening -- [Standard] [open-items: yes]
**For next agent:** Implemented only non-prompt Slice 6A.5. V2 runner ingress carries the full ACS snapshot seed; run context no longer injects shell-only placeholder IDs; the damaged shell envelope may still display `AC_V2_SHELL_01`; ACS migration fails closed on shell-placeholder IDs; cache governance supports ACS-backed and direct-input key paths; gateway Claim Understanding output schema now points directly to `v2.claim_contract.0`. Slice 6B remains blocked pending Captain approval and LLM Expert review.
-> Docs/AGENTS/Handoffs/2026-05-14_Senior_Developer_V2_Slice_6A5_Pre_6B_Contract_Hardening.md

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6A.5 Status Consolidation -- [Standard] [open-items: yes]
**For next agent:** Plan/spec/guardrail docs now mark Slice 6A.5 complete at `724dd9aa`; Slice 6B remains blocked until Captain prompt-change approval plus LLM Expert review. Prepare the Slice 6B review package before any prompt/profile/model execution change.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6A5_Status_Consolidation.md

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6B.0 Prompt Model Review -- [Standard] [open-items: yes]
**For next agent:** Slice 6B.0 review package is at `Docs/WIP/2026-05-14_V2_Slice_6B_Prompt_Model_Review_Package.md`; deputy review returned `MODIFY`. Implement 6B.1a result-envelope contract before UCM/profile plumbing, prompt text, or model execution.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B0_Prompt_Model_Review.md

---
### 2026-05-14 | Senior Developer | Codex (GPT-5) | V2 Slice 6B.1a Claim Understanding Result Envelope -- [Standard] [open-items: yes]
**For next agent:** Added non-executable `ClaimUnderstandingResult` contract/schema and moved the Claim Understanding gateway output schema to `v2.claim_understanding_result.0`; accepted results carry a success-only `ClaimContract`, while blocked/damaged results keep `claimContract: null` with typed reasons/events. Direct-input success now uses `acsMigration: null`; ACS success still preserves accepted migration metadata. No prompt text, UCM/profile activation, runtime LLM call, API/UI change, live job, or expensive test was added.
-> Docs/AGENTS/Handoffs/2026-05-14_Senior_Developer_V2_Slice_6B1a_Claim_Understanding_Result_Envelope.md

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6B.1a Status Consolidation -- [Standard] [open-items: yes]
**For next agent:** Plan/spec/guardrail docs now mark Slice 6B.1a complete at `24f55d4a`. The next boundary is 6B.1b / UCM-0: minimal `claimboundary-v2` prompt-profile support and task-oriented model-policy metadata for `claim_understanding_gate1`, still non-executable. Do not draft prompt text, activate profiles, or add runtime model execution before LLM Expert review and Captain approval.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B1a_Status_Consolidation.md

---
### 2026-05-14 | Senior Developer | Codex (GPT-5) | V2 Slice 6B.1b UCM Profile And Model Policy -- [Standard] [open-items: yes]
**For next agent:** Added minimal non-executable UCM/profile/model-policy plumbing: `claimboundary-v2` is valid/manageable for prompt validation/import but not file-seeded; V1/V2 frontmatter separation is tested; `claim_understanding_gate1` has a concrete blocked model-policy registry entry; gateway execution remains blocked until prompt/model/cache approvals are recorded. No prompt file, prompt text, runtime model call, live job, or UI redesign was added.
-> Docs/AGENTS/Handoffs/2026-05-14_Senior_Developer_V2_Slice_6B1b_UCM_Profile_Model_Policy.md

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6B.1b Status Consolidation -- [Standard] [open-items: yes]
**For next agent:** Plan/spec/guardrail docs now mark Slice 6B.1b complete at `2f1b60a4`. The next boundary is 6B.2 prompt draft and contract tests, requiring updated LLM Expert review and explicit Captain prompt-text approval. Broader UCM UI redesign remains a later task-oriented analysis-profile/admin-gate track.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B1b_Status_Consolidation.md

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Workspace Naming Cleanup -- [Standard] [open-items: no]
**For next agent:** Cleaned active planning and handoff documents so they state the current V2 workspace and Git branch separately. Workspace: `C:\DEV\FactHarbor`. Git branch: `main`. Rebuilt the generated handoff index. No source, prompt, config, runtime, API, UI, or live-job behavior changed.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Workspace_Naming_Cleanup.md

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V1 Baseline Tag -- [Standard] [open-items: no]
**For next agent:** Created annotated tag `v1-before-v2-pipeline-specification` at `92b5a5f3` as the exact main commit before V2 pipeline specification/rebuild work started. No comparison branch was created; create one from the tag only when there is a concrete V1/V2 comparison task. Current work remains in `C:\DEV\FactHarbor` on Git branch `main`.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V1_Baseline_Tag.md

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Plan UCM Alignment -- [Standard] [open-items: yes]
**For next agent:** Updated the operative V2 plan, target spec, and guardrails to reflect the recent main-branch cleanup, V1 baseline tag, and Slice 6B.1b UCM/profile/model-policy completion. Minimal non-executable UCM support is enough for 6B.2 prompt draft and contract tests after approval; broader task-oriented analysis-profile/Admin UI redesign remains a later track before broad V2 prompt/model execution or cutover. 6B.2 still requires updated LLM Expert review and explicit Captain prompt-text approval.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Plan_UCM_Alignment.md

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6B.2 LLM Expert Approval Request -- [Standard] [open-items: yes]
**Superseded by next entry:** Slice 6B.2 was later approved, implemented, and committed at `8a1ef8cd`; use the following completion entry for current state.
**For next agent:** Claude Opus LLM Expert returned `APPROVE` for asking Captain to approve Slice 6B.2 prompt-text work after 6B.1a/6B.1b. Captain approval is still required before adding `V2_CLAIM_UNDERSTANDING_GATE1`, prompt source files, file seeding, approval flips, runtime model calls, or live jobs.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B2_LLM_Expert_Approval_Request.md

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6B.2 Prompt Draft And Contract Tests -- [Standard] [open-items: yes]
**For next agent:** Slice 6B.2 is complete at `8a1ef8cd` in `C:\DEV\FactHarbor` on `main`: clean-room non-executable `claimboundary-v2.prompt.md`, `V2_CLAIM_UNDERSTANDING_GATE1`, contract/static-hygiene tests, and final Claude Opus LLM Expert approval. `claimboundary-v2` remains not file-seeded, prompt/model/cache approvals remain unflipped, no runtime LLM call or live job was added, and V1 prompt/code/type reuse remains forbidden. Next boundary is 6B.3 gated model execution with separate Captain/deputy approval.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B2_Prompt_Draft_Contract_Tests.md

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6B.3 Approval Package -- [Standard] [open-items: yes]
**For next agent:** Prepared and reviewed `Docs/WIP/2026-05-14_V2_Slice_6B3_Gated_Model_Execution_Approval_Package.md`; consolidated verdict is `MODIFY`, so 6B.3 runtime implementation is not approved. Required before code: explicit V2 prompt loader by default, V2-owned/neutral model adapter, runtime validation schemas, structural-only schema retry, full provenance/cache decision, internal-only diagnostics, cache isolation, ACS migration at the V2 edge, multilingual/input-neutral runtime tests, and only `claim_understanding_gate1` eligible for executable status. `claimboundary-v2` remains not file-seeded, `claim_understanding_gate1` remains non-executable, approvals remain unflipped, no runtime LLM call or live job was added, and V1 remains default.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B3_Approval_Package.md

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6B.3 Revised Implementation Plan -- [Standard] [open-items: yes]
**For next agent:** Diverse-agent debate concluded 6B.3 runtime code is not yet low risk. Drafted `Docs/WIP/2026-05-14_V2_Slice_6B3_Revised_Implementation_Plan.md` as the next docs-only step. It maps the `MODIFY` findings into prerequisite slices: 6B.3a explicit V2 prompt loader/runtime schemas/provenance-cache decision, 6B.3b V2/neutral model adapter with structural-only retry, and 6B.3c gated direct-input orchestration with internal-only state. Implementation remains blocked until deputy review approves this plan. `claimboundary-v2` is not file-seeded, `claim_understanding_gate1` is non-executable, approvals are unflipped, no runtime LLM call or live job was added, and V1 remains default.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B3_Revised_Implementation_Plan.md

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6B.3a Foundation Approval -- [Standard] [open-items: yes]
**For next agent:** Claude Opus, Claude Sonnet, Gemini, and Senior Developer review approved starting 6B.3a foundation only. Updated `Docs/WIP/2026-05-14_V2_Slice_6B3_Revised_Implementation_Plan.md`, plan/spec, review package, and guardrails with the approval conditions: no V1 analyzer imports, no file seeding, no production executable/approval flip, no runtime LLM call, no orchestrator wiring, no API/UI/report change, no live jobs, production V2 runtime schemas required, cache/provenance records no-dispatch/no-store decisions without placeholder provider telemetry, and `npm -w apps/web run build` is unconditional for 6B.3a.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B3a_Foundation_Approval.md

---
### 2026-05-14 | Senior Developer | Codex (GPT-5) | V2 Slice 6B.3a Claim Understanding Foundation -- [Standard] [open-items: yes]
**For next agent:** Slice 6B.3a is complete at `2d14c89a`. Added explicit clean-room V2 prompt loader, production Zod runtime schemas for `ClaimContract`/`ClaimUnderstandingResult`, cache/provenance decision metadata with no-dispatch/no-store outcomes, and a policy eligibility guard so only `claim_understanding_gate1` can become executable in a future approved slice. Tests cover V1 profile/file/section rejection, approved variable enforcement, render determinism, schema id/version pinning, unknown key/enum rejection, invalid embedded contract rejection, cache namespace/no-store/ACS hash mismatch decisions, and later-task execution blocking. No file seeding, approval flips, runtime LLM call, orchestrator wiring, API/UI/report change, live job, or V1 analyzer import was added.
-> Docs/AGENTS/Handoffs/2026-05-14_Senior_Developer_V2_Slice_6B3a_Claim_Understanding_Foundation.md

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6B.3b Model Adapter Review -- [Standard] [open-items: yes]
**For next agent:** Claude Opus and Gemini returned `MODIFY` on 6B.3b; Claude Sonnet approved with clarifications. Tightened `Docs/WIP/2026-05-14_V2_Slice_6B3_Revised_Implementation_Plan.md` Section 6 before any code. 6B.3b now requires a V2-owned local adapter under `apps/web/src/lib/analyzer-v2/`, dependency-injected mock dispatch, production schema validation, gateway policy fail-closed, identical structural retry, no cache IO, no provider SDK callsite, no product-path imports, no neutral/shared adapter, no placeholder telemetry, and at least one non-English pass-through fixture. No source, prompt, config, runtime, API, UI, report, live-job, approval, or file-seeding behavior changed.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B3b_Model_Adapter_Review.md

---
### 2026-05-14 | Senior Developer | Codex (GPT-5) | V2 Slice 6B.3b Model Adapter -- [Standard] [open-items: yes]
**For next agent:** Slice 6B.3b is complete at `04742922`. Added a V2-owned local adapter with dependency-injected provider callback, production `ClaimUnderstandingResult` Zod validation, gateway policy fail-closed behavior, model-policy-owned retry/call limits, identical structural retry, typed telemetry/provenance, no cache IO, no provider SDK callsite, no product-path imports, and no neutral/shared adapter. Focused tests, full Analyzer V2 tests, clean-room/provider scan, build, and diff check passed. Full `npm test` timed out in three existing runner/admin tests under concurrent full-suite execution; each timed-out test passed when rerun directly. Next step is 6B.3c expert debate/review before any gateway/orchestrator wiring or runtime dispatch code.
-> Docs/AGENTS/Handoffs/2026-05-14_Senior_Developer_V2_Slice_6B3b_Model_Adapter.md

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6B.3c Debate -- [Standard] [open-items: yes]
**For next agent:** Four expert reviewers returned `MODIFY` for 6B.3c. Do not implement full runtime-dispatch/orchestrator wiring as previously written. Tightened Section 7 into 6B.3c-0 structural no-dispatch orchestration: internal-only runtime state, ACS migration at the V2 edge, direct-input gateway blocking before prompt/cache/provider work, raw shell-placeholder ID failure before normalization can hide it, no model-adapter import from product execution paths, no prompt rendering, no provider callback, no cache IO, no public/API/UI/report field, no approval/status mutation, and no live jobs. Next step is deputy acceptance of 6B.3c-0 before code.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B3c_Debate.md

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6B.3c-0 Acceptance Addendum -- [Standard] [open-items: yes]
**For next agent:** Follow-up expert debate returned consolidated `MODIFY`: proceed to source only under the new Section 7.1.1 file/test envelope. Implement raw runner shell-placeholder rejection, stop treating `resolvedInputSha256` as ACS snapshot hash, add V2-owned no-dispatch Claim Understanding stage/runtime state, keep orchestrator state internal, and add recursive public-result and import-time side-effect guards. Do not import the model adapter, render prompts, construct provider callbacks, perform cache IO/eligibility, expose API/UI/report diagnostics, flip approvals, run live jobs, or weaken V1/V2 boundaries.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B3c0_Acceptance_Addendum.md

---
### 2026-05-14 | Senior Developer | Codex (GPT-5) | V2 Slice 6B.3c-0 Runtime Stage -- [Standard] [open-items: yes]
**For next agent:** Slice 6B.3c-0 is complete at `3223d99f`. Added internal-only no-dispatch Claim Understanding orchestration: raw shell-placeholder selected IDs fail at runner ingress, `resolvedInputSha256` is no longer reused as ACS snapshot hash, run context no longer hides shell placeholders, ACS migration requires canonical V2 hashes, direct input blocks at shipped gateway policy, and public result/leak/boundary guards prevent prompt/cache/provider/adapter/runtime-state exposure. Later provider dispatch remains unapproved.
-> Docs/AGENTS/Handoffs/2026-05-14_Senior_Developer_V2_Slice_6B3c0_Runtime_Stage.md

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6B.3c Dispatch Review Package -- [Standard] [open-items: yes]
**For next agent:** Expert debate after 6B.3c-0 returned `MODIFY`: do not start dispatch code. New review package `Docs/WIP/2026-05-14_V2_Slice_6B3c_Dispatch_Integration_Review_Package.md` defines the next gate: owner-by-input contract, side-effect ordering before adapter dispatch, mock exclusion, URL blocking until resolved-body ownership exists, no-store/no-read default, public leak guards, and mandatory tests. Review this package before any product-path model-adapter import or runtime provider dispatch.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B3c_Dispatch_Review_Package.md

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6B.3c-1 Dispatch Frame Gate -- [Standard] [open-items: yes]
**For next agent:** Deputy-team review of the 6B.3c dispatch package returned `MODIFY`; the only approved next source work is a pure internal `claim-understanding/dispatch-frame.ts` contract plus tests/static guards. Product dispatch, prompt rendering, model-adapter imports, cache decisions or hash construction, provider callbacks, approval flips, public diagnostics, live jobs, V1 imports, and direct URL body assumptions remain blocked.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B3c1_Dispatch_Frame_Gate.md

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6B.3c-1 Dispatch Frame -- [Standard] [open-items: yes]
**For next agent:** Slice 6B.3c-1 is complete at `8a663d3f`: pure internal `buildClaimUnderstandingDispatchFrame(...)`, direct-text exact pass-through, direct URL fail-closed behavior, ACS resolved-text/hash requirements, and boundary guards against prompt/model/cache/provider/V1 imports. Product runtime dispatch remains unapproved and requires a later review gate.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B3c1_Dispatch_Frame.md

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6B.3c-2 Runtime Dispatch Gate -- [Standard] [open-items: yes]
**For next agent:** Post-6B.3c-1 deputy debate returned `BLOCK/BLOCK/MODIFY/MODIFY` for product runtime dispatch, and first package review also returned `MODIFY`. Revised `Docs/WIP/2026-05-14_V2_Slice_6B3c_Product_Runtime_Dispatch_Review_Package.md` as docs-only; any later source candidate is contract-only, preferably `dispatch-readiness-contract.ts`, with prompt rendering, adapter calls, cache decisions/IO, provider callbacks/SDKs, approval flips, public diagnostics, direct URL body assumptions, live jobs, and V1 reuse still blocked.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B3c2_Runtime_Dispatch_Gate.md

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6B.3c-2 Dispatch Readiness Contract -- [Standard] [open-items: yes]
**For next agent:** Added inert `validateClaimUnderstandingDispatchReadinessContract(...)` plus tests/static guards only. It validates externally supplied approval/provenance packets, requires cache decision state to stay `not_constructed`, blocks incomplete provenance, and keeps product paths from importing `dispatch-readiness-contract.ts` or future `runtime-dispatch.ts`. Product runtime dispatch, prompt rendering, adapter calls, cache construction/IO, approval flips, public surfaces, live jobs, and V1 reuse remain blocked.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B3c2_Dispatch_Readiness_Contract.md

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6B.3c-3A Runtime Dispatch Owner Contract -- [Standard] [open-items: yes]
**For next agent:** Post-readiness expert review returned `BLOCK/BLOCK/BLOCK/MODIFY` for product dispatch. Added only inert `validateClaimUnderstandingRuntimeDispatchOwnerContract(...)`, tightened readiness so `review_packet_snapshot` cannot satisfy runtime readiness, and strengthened boundary guards for transitive dispatch reachability, provider SDK/nonliteral dynamic imports, runtime side-effect imports, and executable gateway-status construction. Product runtime dispatch remains blocked.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B3c3_Runtime_Dispatch_Owner_Contract.md

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6B.3c-3B Package Consolidation -- [Standard] [open-items: yes]
**For next agent:** Expert review of the broader 3B owner implementation package returned `BLOCK/MODIFY/MODIFY/MODIFY`. Revised `Docs/WIP/2026-05-14_V2_Slice_6B3c3B_Runtime_Dispatch_Owner_Implementation_Approval_Package.md` to 3B1 preflight/provenance binding and guard hardening only. Prompt rendering, cache-decision construction, provider callback acceptance, adapter invocation, product wiring, public surfaces, direct URL dispatch, live jobs, and V1 reuse remain blocked.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B3c3B_Package_Consolidation.md

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6B.3c-3B1 Preflight Provenance Binding -- [Standard] [open-items: yes]
**For next agent:** 3B1 is implemented as inert readiness/provenance and guard hardening only. `ClaimUnderstandingDispatchReadinessProvenancePacket` is now explicitly `pre_render`; `promptContentHash` and `renderedPromptHash` must be `null`; direct-text readiness binds exact frame fields; ACS is deferred; direct URL preflight fails closed, including forged complete URL frames. Public/report/export leak guards and Analyzer V2 barrel guards are in `boundary-guard.test.ts`. Product dispatch, prompt rendering, cache construction/IO, provider callbacks/SDKs, live jobs, public diagnostics, and V1 reuse remain blocked.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B3c3B1_Preflight_Provenance_Binding.md

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6B.3c-3B2 Runtime No-Store Cache Contract -- [Standard] [open-items: yes]
**For next agent:** 3B2 is implemented as a pure gateway cache-contract slice. `buildAnalyzerV2ClaimUnderstandingRuntimeNoStoreCacheDecision(...)` returns `no_store_runtime_dispatch_safety` with `canRead=false` and `canWrite=false`, keeps incomplete dimensions and ACS mismatch fail-closed, and is not consumed by `runtime-dispatch.ts`. Guards block production `executionApproved: true`, cache-governance IO/storage/provider/prompt/model/runtime/readiness/test/V1 imports, public dispatch/cache leakage, and Analyzer V2 barrel exports. 3B3 prompt rendering/adapter invocation remains blocked pending review.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B3c3B2_Runtime_No_Store_Cache_Contract.md

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6B.3c-3B3 Review Consolidation -- [Standard] [open-items: yes]
**For next agent:** 3B3 expert review returned `MODIFY/MODIFY`. Implement only the narrowed internal direct-text owner slice documented in `Docs/WIP/2026-05-14_V2_Slice_6B3c3B_Runtime_Dispatch_Owner_Implementation_Approval_Package.md` Section 12: owner-built prompt variables, owner-created post-render provenance, runtime no-store cache decision, adapter call through injected provider callback only, exact symbol-level guard exceptions, and one private executable-clone helper if needed. Product wiring, provider SDKs, public surfaces, ACS/direct URL execution, cache read/write, approval flips, prompt/config changes, live jobs, and V1 reuse remain blocked.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B3c3B3_Review_Consolidation.md

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6B.3c-3B3 Runtime Dispatch Owner -- [Standard] [open-items: yes]
**For next agent:** 3B3 is implemented as an internal direct-text owner only. `executeClaimUnderstandingRuntimeDispatch(...)` blocks failed readiness/ACS/direct URL before work, renders the V2 prompt after readiness, builds owner post-render provenance, builds runtime no-store cache decision, calls the adapter through injected `providerCall`, and confines executable gateway task cloning to one private helper. It remains unexported and unreachable from product/public paths. Product wiring, public surfaces, cache read/write, built-in provider SDKs, ACS/direct URL execution, prompt/config changes, live jobs, and V1 reuse remain blocked.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B3c3B3_Runtime_Dispatch_Owner.md

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6B.3c-4 Product Runtime Dispatch Wiring Gate -- [Standard] [open-items: yes]
**For next agent:** Post-3B3 expert review returned `MODIFY/BLOCK`: product wiring is not approved. Added docs-only gate `Docs/WIP/2026-05-14_V2_Slice_6B3c4_Product_Runtime_Dispatch_Wiring_Gate.md`. Any future source package must define product-owned approval authority, provider callback factory ownership outside Analyzer V2, API acceptance mode, direct-text-only limits, public leak guards, rollback, failure classification, live-job discipline, and V1-removal separation. Do not import/call `executeClaimUnderstandingRuntimeDispatch(...)` from product paths, expose partial V2 results, run live jobs, enable ACS/direct URL, cache IO, provider SDKs, approval flips, prompt/config changes, or V1 cleanup without separate approval.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B3c4_Product_Runtime_Dispatch_Wiring_Gate.md

Follow-up review of the gate also lacked consent for source wiring (`MODIFY/BLOCK`). The safe intersection is guard/test hardening only while preserving current no-product-reach topology. A future source package must resolve approval authority, provider callback ownership, API acceptance, partial-result behavior, and product-path transitive reach into gateway policy/cache-governance metadata before any product path calls runtime dispatch.

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6B.3c-4 Cache Policy Metadata Split -- [Standard] [open-items: yes]
**For next agent:** Implemented a guard-hardening slice only, not product wiring. Added `gateway/cache-policy-registry.ts` for cache policy metadata, changed `gateway/policy.ts` to import metadata from it, kept `cache-governance.ts` as the behavior owner with compatibility re-exports, and tightened `boundary-guard.test.ts` so product paths cannot transitively reach `cache-governance.ts`. Product wiring, provider callback factories, API/UI/report/export changes, ACS/direct URL, cache IO, approval flips, live jobs, and V1 cleanup require separate approval. Captain clarified risky but meaningful progress should be escalated for confirmation, not postponed indefinitely.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B3c4_Cache_Policy_Metadata_Split.md

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6B.3c-4A Captain Confirmation Package -- [Standard] [open-items: yes]
**For next agent:** Prepared docs-only confirmation package `Docs/WIP/2026-05-14_V2_Slice_6B3c4A_Product_Runtime_Wiring_Captain_Confirmation_Package.md`. It asks Captain whether to proceed with risky source wiring despite deputy split review. No source wiring was done. Implement only after explicit Captain confirmation: env-gated, direct-text-only, fail-closed without provider callback, no public result exposure, no provider SDKs, no cache IO, no ACS/direct URL, no live jobs, and no V1 cleanup.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B3c4A_Captain_Confirmation_Package.md

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6B.3c-4A Runtime Wiring Scaffold -- [Significant] [open-items: yes]
**For next agent:** 6B.3c-4A is implemented as the Captain-approved internal direct-text scaffold. `runClaimUnderstandingRuntimeStage(...)` is the only product-stage bridge to `executeClaimUnderstandingRuntimeDispatch(...)`; execution requires explicit scaffold options plus an injected provider boundary. `runClaimBoundaryPipelineV2(...)` still returns the damaged pre-cutover envelope and V1 remains default. Do not add public API/UI/report/export exposure, provider SDK/factory ownership, cache read/write, ACS/direct URL execution, live jobs, or V1 cleanup without a new reviewed gate.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B3c4A_Runtime_Wiring_Scaffold.md

---
### 2026-05-14 | Senior Developer | Codex (GPT-5) | Daily Bug Scan -- [Standard] [open-items: yes]
**For next agent:** Scanned commits since `2026-05-13T18:41:08Z`. Concrete verification: `npm -w apps/web run build` passed, focused V2 tests passed (`boundary-guard`, `runtime-stage`, `pipeline-shell`), and full `npm test` had one failure in `test/unit/lib/drain-runner-pause.integration.test.ts` ("re-queues orphaned RUNNING jobs...") but that area had no commits in the scan window and the test passed in isolation, so it is weak evidence for a new regression. Review finding only: the new runtime scaffold can execute when `directTextRuntimeDispatch.enabled === true` even though the real gateway task remains `blockedUntilPromptApproved`, because [`apps/web/src/lib/analyzer-v2/claim-understanding/runtime-stage.ts`](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer-v2/claim-understanding/runtime-stage.ts) builds an approved snapshot and [`apps/web/src/lib/analyzer-v2/claim-understanding/runtime-dispatch.ts`](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer-v2/claim-understanding/runtime-dispatch.ts) clones the task to `status: "executable"`. Not currently product-reachable; only tighten this if the scaffold becomes reachable outside tests or another caller starts passing `claimUnderstandingRuntime` options.

---
### 2026-05-14 | Senior Developer | Codex (GPT-5) | Daily Bug Scan Re-review -- [Standard] [open-items: yes]
**For next agent:** Re-reviewed after `531a0ff6` and `d1f99b8a`. No new verifier-backed findings in the latest commits. The prior scaffold concern is now materially constrained by `boundary-guard.test.ts`, which forbids production callers outside the approved owner chain from referencing `claimUnderstandingRuntime`, `directTextRuntimeDispatch`, or `providerBoundary`. The new `analyzer-v2-runtime/claim-understanding-provider-boundary.contract.ts` slice remains inert and isolated from production imports. Focused verification passed: `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts test/unit/lib/analyzer-v2-runtime/claim-understanding-provider-boundary.contract.test.ts`. Residual risk is architectural, not currently exploitable in repo code: the runtime-stage approval snapshot and executable-clone helper still exist, so any future product caller that is allowed to pass scaffold options must be reviewed with the same boundary guards in mind.

---
### 2026-05-15 | Senior Developer | Codex (GPT-5) | Daily Bug Scan V2 Review -- [Standard] [open-items: yes]
**For next agent:** Reviewed the new V2 runtime series from `0aa31d4f` through `ab70ab1d`. Focused verification passed: `npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding/runtime-stage.test.ts test/unit/lib/analyzer-v2-runtime/claim-understanding-runtime-activation.test.ts test/unit/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink.test.ts test/unit/lib/analyzer-v2/pipeline-shell.test.ts` and `npm -w apps/web run build`. One concrete review finding remains: the hidden direct-text runtime is still unreachable in production code because `buildClaimUnderstandingRuntimeActivationSnapshot(...)` hardcodes `status: "kill_switch_closed"` in [`apps/web/src/lib/analyzer-v2/run-context.ts`](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer-v2/run-context.ts), activation immediately disables unless status is `enabled_hidden_direct_text` in [`apps/web/src/lib/analyzer-v2-runtime/claim-understanding-runtime-activation.ts`](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer-v2-runtime/claim-understanding-runtime-activation.ts), and the live runner path still calls `runClaimBoundaryV2Shell(analysisInput)` without any activation source in [`apps/web/src/lib/internal-runner-queue.ts`](/c:/DEV/FactHarbor/apps/web/src/lib/internal-runner-queue.ts). Current tests only reach the new path by overriding the snapshot status directly. No second verifier-backed issue was found in this range.

---
### 2026-05-16 | Senior Developer | Codex (GPT-5) | Daily Bug Scan V2 Re-review -- [Standard] [open-items: no]
**For next agent:** Reviewed V2 changes after the previous reachability finding, focusing on `01ba500e..3e19d8af` and the new evidence/source/query-planning contracts. The prior hidden-runtime reachability defect is addressed: `internal-runner-queue.ts` now passes `runtimeActivationStatus` from `resolveAnalyzerExecutionSelection(...)`, and tests cover the dedicated runtime kill switch. Verification passed: `npm -w apps/web run test -- test/unit/lib/analyzer-v2 test/unit/lib/analyzer-v2-runtime test/unit/app/api/internal/claim-understanding-runtime-artifacts/route.test.ts test/unit/lib/internal-runner-v2-routing.test.ts` (40 files / 291 tests) and `npm -w apps/web run build`. No verifier-backed V2 bug found in this pass. Residual risk: query-planning runtime is executable as an internal isolated runtime but not orchestrator-wired; downstream evidence lifecycle remains blocked/precutover by design.

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6B.3c-4A Scaffold Review Hardening -- [Standard] [open-items: yes]
**For next agent:** Addressed the Daily Bug Scan scaffold finding without changing runtime behavior. `boundary-guard.test.ts` now forbids production source outside the approved owner files from referencing scaffold option keys (`claimUnderstandingRuntime`, `directTextRuntimeDispatch`, `providerBoundary`). The scaffold override remains confined to tests/controlled harnesses until a later reviewed provider-boundary gate. Verification passed: focused boundary guard, full Analyzer V2 unit slice, and `git diff --check`.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B3c4A_Scaffold_Review_Hardening.md

---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6B.3c-4B Provider Boundary Ownership Contract -- [Standard] [open-items: yes]
**For next agent:** Diverse provider-boundary debate returned `MODIFY`: provider ownership is next, but real provider factory wiring is one step too early. Implemented only an inert contract under `apps/web/src/lib/analyzer-v2-runtime/` plus tests/guards. The contract blocks product reachability, activation approval, SDK import, callback creation, V1/legacy provider reuse, non-direct-text execution, cache IO, public exposure, wrong gateway task, invalid retry budgets, and incomplete telemetry ownership. Real provider factory construction, product callers, provider SDK imports, public result exposure, cache IO, ACS/direct URL execution, approval flips, live jobs, and V1 cleanup remain blocked pending a later source-wiring gate. Verification passed: focused 4B tests, full Analyzer V2 unit slice, build, and `git diff --check`.
-> Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B3c4B_Provider_Boundary_Ownership_Contract.md

---
### 2026-05-15 | Lead Architect | Codex (GPT-5.5) | V2 4C3b Hidden Direct-Text Wiring -- [Significant] [open-items: yes]
**For next agent:** Implemented Captain-approved 4C3b hidden direct-text source wiring. `claim-understanding-runtime-activation.ts` owns executable gateway/provider-boundary construction, `PipelineRunContext` freezes the activation snapshot, `runtime-stage.ts` records hidden artifacts only in `v2_observability_ledger`, and public result/report/UI/export/compatibility surfaces remain unchanged. Default kill switch is closed; no live jobs were submitted. Next gate is 4C3c committed/runtime-refreshed live smoke only.
-> Docs/AGENTS/Handoffs/2026-05-15_Lead_Architect_V2_4C3b_Hidden_Direct_Text_Wiring.md

---
### 2026-05-15 | Lead Architect | Codex (GPT-5.5) | V2 4C3b Review F1 Artifact Sink Bounds -- [Standard] [open-items: yes]
**For next agent:** Addressed review F1 before 4C3c by bounding the temporary in-memory `v2_observability_ledger`: retained ledgers and records per ledger are capped, and read/clear do not create empty retained ledgers. F2 remains planned temporary debt: static `CAPTAIN_APPROVAL` must be replaced by UCM/task-policy-derived authority later.
-> Docs/AGENTS/Handoffs/2026-05-15_Lead_Architect_V2_4C3b_Review_F1_Artifact_Sink_Bounds.md

---
### 2026-05-15 | Lead Architect | Codex (GPT-5.5) | V2 4C3b P1 Runtime Reachability Fix -- [Significant] [open-items: yes]
**For next agent:** Addressed P1 dead-code finding. Hidden direct-text runtime is now reachable from product runner only when stored variant is `claimboundary-v2`, the V2 shell gate is enabled, and `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text`. Env is a kill-switch selector only; authority/model/provider/config remain the frozen temporary activation profile. No live jobs were submitted.
-> Docs/AGENTS/Handoffs/2026-05-15_Lead_Architect_V2_4C3b_P1_Runtime_Reachability_Fix.md

---
### 2026-05-15 | LLM Expert | Codex (GPT-5) | V2 4C3c Claim Understanding Diagnostics Gate Review -- [Standard] [open-items: yes]
**For next agent:** Verdict is diagnostics first, not prompt/schema/model edits. 4C3c only exposes `schemaOutcome: damaged` / `claim_contract_validation_failed`; `model-adapter.ts` has attempt failure detail, but `runtime-stage.ts` drops it from completed hidden artifacts. Add a reviewed internal-only schema-error diagnostics gate before any topic-neutral prompt/schema/model correction.
-> Docs/AGENTS/Handoffs/2026-05-15_LLM_Expert_V2_4C3c_Claim_Understanding_Diagnostics_Gate_Review.md

---
### 2026-05-15 | Lead Architect | Codex (GPT-5.5) | V2 Slice 7J-1 Non-Executable Evidence Task Contracts -- [Significant] [open-items: yes]
**For next agent:** Implemented Captain-approved 7J-1 at `1a874b8d`: inert Evidence Lifecycle prompt sections in `claimboundary-v2`, strict task-result schemas, categorical missing-evidence dimensions, non-executable task-policy metadata, and boundary/static verifier tests. No prompt seeding, approval flips, provider/search/fetch execution, cache IO, SR integration, public exposure, live jobs, or V1 cleanup.
-> Docs/AGENTS/Handoffs/2026-05-15_Lead_Architect_V2_Slice_7J1_NonExecutable_Evidence_Task_Contracts.md

---
### 2026-05-15 | Lead Architect | Codex (GPT-5.5) | V2 Slice 7J-2 Evidence Readiness Alignment -- [Standard] [open-items: yes]
**For next agent:** Implemented inert post-7J-1 alignment at `f49c69cd`: gateway metadata now matches the four Evidence Lifecycle task contracts while remaining blocked/non-executable, and extraction accepted results now support honest `no_extractable_evidence` with empty `evidenceItems`. Next gate should be docs-only 7K execution design, not source execution.
-> Docs/AGENTS/Handoffs/2026-05-15_Lead_Architect_V2_Slice_7J2_Evidence_Readiness_Alignment.md

---
### 2026-05-15 | Lead Architect | Codex (GPT-5.5) | V2 Slice 7K Evidence Lifecycle Execution Design -- [Standard] [open-items: yes]
**For next agent:** Committed docs-only 7K at `b57f379e`: execution sequencing is staged, and the next low-risk source step is only 7K-1 inert execution-readiness contracts. Prompt/model runtime execution, provider/search/fetch, UCM/default changes, SR integration, cache IO, public exposure, live jobs/canaries, ACS/direct URL execution, and V1 cleanup remain blocked.
-> Docs/AGENTS/Handoffs/2026-05-15_Lead_Architect_V2_Slice_7K_Evidence_Execution_Design.md

---
### 2026-05-15 | Lead Architect | Codex (GPT-5.5) | V2 Slice 7K-1 Evidence Execution-Readiness Contracts -- [Standard] [open-items: yes]
**For next agent:** Implemented inert 7K-1 at `218fc879`: V2 Evidence Lifecycle now has static batch-input, pre-call readiness, and execution-provenance envelope contracts for query planning, applicability, extraction, and sufficiency. The module has no runtime consumer and remains non-executable. Prompt/model execution, provider/search/fetch, UCM/default changes, cache IO, Source Reliability integration, product wiring, public exposure, live jobs/canaries, ACS/direct URL execution, approval flips, and V1 cleanup remain blocked. Next gate should be a reviewed 7L execution package/design, not immediate source execution.
-> Docs/AGENTS/Handoffs/2026-05-15_Lead_Architect_V2_Slice_7K1_Evidence_Execution_Readiness_Contracts.md

---
### 2026-05-15 | LLM Expert | Codex (GPT-5) | V2 Slice 7L Query-Planning Gate Review -- [Standard] [open-items: yes]
**For next agent:** Review position: make 7L a docs/review package first. It should design only the first internal query-planning prompt/model execution gate from accepted direct-text `ClaimContract` to hidden bounded query-plan result, consuming 7K-1 readiness/provenance contracts. Provider/search/fetch, applicability, extraction, sufficiency, SR, cache IO, UCM/default changes, public exposure, live jobs/canaries, and V1 cleanup remain blocked pending later gates and Captain approval.
-> Docs/AGENTS/Handoffs/2026-05-15_LLM_Expert_V2_Slice_7L_Query_Planning_Gate_Review.md

---
### 2026-05-15 | Senior Developer | Codex (GPT-5) | V2 Slice 7L Execution Package Risk Review -- [Standard] [open-items: yes]
**For next agent:** Reviewed the post-7K-1 next step from an implementation-risk position. Recommendation: keep 7L docs/review-first and do not implement prompt/model execution yet. The minimum viable 7L package should define query-planning-only execution ownership over an accepted direct-text `ClaimContract`, pre-render/readiness authority, prompt section/hash/provenance handling, model-policy authority, no-store/no-read cache posture, hidden/internal output handling, blocked/damaged semantics, and an explicit verifier envelope. It must preserve clean-room V2 boundaries: no V1 analyzer/prompt/type reuse, no provider/search/fetch, no Source Reliability changes, no UCM/default JSON edits, no cache IO, no public exposure, no live jobs, no ACS/direct URL execution, and no V1 cleanup. Highest hazards are scope collapse into provider acquisition, accidental approval/status flips in gateway policy, treating static 7K-1 readiness as runtime authority, prompt-loader/model-adapter reachability before review, and boundary-guard blind spots as Evidence Lifecycle folders grow.

---
### 2026-05-15 | Lead Architect | Codex (GPT-5) | V2 Slice 7L Query-Planning Position Memo -- [Standard] [open-items: yes]
**For next agent:** Lead Architect position: query planning is the correct first executable Evidence Lifecycle candidate only after a docs/review 7L freezes the boundary. Scope should be accepted direct-text `ClaimContract` -> hidden bounded `EvidenceQueryPlanningResult` only, consuming 7K-1 readiness/provenance as contract inputs. Provider/search/fetch, Source Reliability, UCM/default changes, cache IO, public exposure, live jobs/canaries, ACS/direct URL execution, approval flips, and V1 cleanup remain Captain-escalation items.
-> Docs/AGENTS/Handoffs/2026-05-15_Lead_Architect_V2_Slice_7L_Query_Planning_Position_Memo.md

---
### 2026-05-15 | Lead Architect | Codex (GPT-5.5) | V2 Slice 7L Query-Planning Execution Package -- [Standard] [open-items: yes]
**For next agent:** Consolidated LLM Expert, Senior Developer, and Lead Architect debate into docs-only 7L at `497ea732`: `Docs/WIP/2026-05-15_V2_Slice_7L_Evidence_Query_Planning_Execution_Package.md`. 7L freezes the first executable-candidate boundary as query-planning only: accepted direct-text `ClaimContract` in, hidden/internal bounded `EvidenceQueryPlanningResult` out. It authorizes no source edits or execution. A later 7L-1 source package requires direct Captain approval and must keep provider/search/fetch, Source Reliability, UCM/default changes, cache IO, public exposure, live jobs/canaries, ACS/direct URL execution, approval flips outside the reviewed authority, V1 reuse, and V1 cleanup blocked.
-> Docs/AGENTS/Handoffs/2026-05-15_Lead_Architect_V2_Slice_7L_Query_Planning_Execution_Package.md

---
### 2026-05-15 | LLM Expert | Codex (GPT-5) | V2 Slice 7L Query-Planning Package Review -- [Standard] [open-items: yes]
**For next agent:** Reviewed committed 7L package at `Docs/WIP/2026-05-15_V2_Slice_7L_Evidence_Query_Planning_Execution_Package.md` as a Claude Opus-style senior architect/LLM expert. Decision: `APPROVE` for proceeding toward a later 7L-1 source package proposal, not implementation. The package is safe and precise enough because it keeps 7L docs-only/non-authorizing, limits future execution to accepted direct-text `ClaimContract` -> hidden/internal bounded `EvidenceQueryPlanningResult`, preserves clean-room/no-V1 constraints, requires source-language-first multilingual planning, blocks provider/search/fetch, SR, UCM/default JSON, cache IO, public exposure, live jobs/canaries, ACS/direct URL execution, approval flips, prompt/profile seeding unless explicitly stated, and V1 cleanup, and requires direct Captain approval before any 7L-1 prompt/model execution source work.

---
### 2026-05-15 | Code Reviewer | Codex (GPT-5) | V2 Slice 7L Package Gate Review -- [Standard] [open-items: yes]
**For next agent:** Reviewed committed package `Docs/WIP/2026-05-15_V2_Slice_7L_Evidence_Query_Planning_Execution_Package.md` at `497ea732` as Code Reviewer/gatekeeper. Decision: `APPROVE` for package quality only, not implementation. No forbidden source surface was introduced in the commit; the package remains docs-only/non-authorizing, blocks provider/search/fetch, Source Reliability, UCM/default JSON, cache IO, public/API/UI/report/export exposure, live jobs/canaries, ACS/direct URL execution, approval flips, prompt/profile file seeding unless explicitly stated, V1 reuse, and V1 cleanup. The proposed 7L-1 verifier envelope references existing analyzer-v2 tests and requires added focused tests for any new execution owner/result sink/runtime artifact path.
**Warnings:** Do not treat Section 10 suggested approval wording as approval itself. A 7L-1 source package still needs direct Captain approval with an explicit approval pointer before prompt/model execution, and live jobs remain forbidden until a later smoke gate.
**Learnings:** No durable role learning proposed; this was a package-gate confirmation, not a new review pattern.

---
### 2026-05-15 | Senior Developer | Codex (GPT-5) | V2 Slice 7L Source-Slice Envelope Review -- [Standard] [open-items: yes]
**For next agent:** Reviewed committed 7L package at `Docs/WIP/2026-05-15_V2_Slice_7L_Evidence_Query_Planning_Execution_Package.md` for later 7L-1 implementation readiness. Decision: `MODIFY` before using it as a source-slice envelope. The package is directionally safe and correctly blocks source acquisition, provider/search/fetch, SR, UCM/default changes, cache IO, public exposure, live jobs, ACS/direct URL, V1 reuse, and V1 cleanup, but the docs must tighten implementation-envelope details before code: name the allowed 7L-1 source/test file ownership envelope, resolve the prompt-loader/prompt-source authority while prompt/profile seeding and UCM/default edits remain blocked, define where hidden runtime artifacts may be stored and inspected, constrain `evidence_scarcity_handling` to query intent only or exclude it from 7L-1, require test cases for selected AtomicClaim ID rejection and no unselected claim leakage, and require boundary guards for any new query-planning runtime folder and analyzer-v2-runtime imports. Direct Captain approval remains required before any 7L-1 prompt/model execution source work.

---
### 2026-05-15 | Lead Architect | Codex (GPT-5.5) | V2 Slice 7L Review Follow-Up -- [Standard] [open-items: yes]
**For next agent:** Addressed the Senior Developer `MODIFY` findings in the 7L package docs. The package now states that 7L-1 must not use fake approvals or private executable clones, must use explicit query-planning gateway authority only if Captain approval names it, must stay within a named source/test file envelope, must use a dedicated Evidence Lifecycle prompt loader for the already committed `V2_EVIDENCE_QUERY_PLANNING` section without prompt seeding/UCM edits, must treat `evidence_scarcity_handling` as query intent only, and must test unknown/unselected AtomicClaim ID rejection, no unselected-claim leakage, hidden-only storage, public-surface unchanged behavior, and non-executable outcomes.

---
### 2026-05-15 | Lead Architect | Codex (GPT-5.5) | V2 Slice 7L-1 Query-Planning Source Approval Package -- [Standard] [open-items: yes]
**For next agent:** Prepared docs-only 7L-1 approval package at `Docs/WIP/2026-05-15_V2_Slice_7L1_Query_Planning_Source_Approval_Package.md`. It proposes a narrow source implementation boundary for internal hidden direct-text Evidence Lifecycle query-planning prompt/model execution: exact source/test file envelope, `evidence_query_planning`-only gateway authority, dedicated prompt loader for the existing V2 prompt section, injected provider boundary only, strict schema validation, hidden/internal telemetry, no provider/search/fetch, no Source Reliability, no UCM/default changes, no prompt text edits, no product/public wiring, no live jobs, no ACS/direct URL, no V1 reuse, and no V1 cleanup. This package still requires deputy/expert review and direct Captain approval before source implementation.

---
### 2026-05-15 | LLM Expert | Codex (GPT-5) | V2 Slice 7L-1 Source Approval Review -- [Standard] [open-items: yes]
**For next agent:** Reviewed committed 7L-1 source approval package at `a298c3e7`. Decision: `MODIFY` before Captain approval. The package is strong on envelope/blocking, but must restore explicit source-language-first/multilingual implementation and verifier requirements, bind bounded batching/query-count/retry/cost controls, and make no-V1 import/reuse/clone stop conditions explicit instead of relying on prompt text and general boundary guards alone.
-> Docs/AGENTS/Handoffs/2026-05-15_LLM_Expert_V2_Slice_7L1_Source_Approval_Review.md

---
### 2026-05-15 | Lead Architect | Codex (GPT-5.5) | V2 Slice 7L-1 Approval Package Review Follow-Up -- [Standard] [open-items: yes]
**For next agent:** Addressed the 7L-1 package `MODIFY` findings in docs only. The package now requires exact Captain approval traceability in handoff/Agent_Outputs, explicit temporary query-planning model policy values (`standard`, temperature `0.1`, `maxCalls: 1`, `schemaRetryCount: 0`, `timeoutMs: 90000`, `maxOutputTokens: 4000`, max 6 query entries), query-planning-specific no-store/no-read cache boundary, source-language-first/multilingual behavior, no English defaulting, supplementary-language decisions as LLM-owned output, explicit no-V1 import/reuse/clone stop conditions, static guards for forbidden imports/IO/UCM/public surfaces, and behavioral tests proving invalid IDs/readiness/gateway blocks prevent prompt rendering and provider invocation.

---
### 2026-05-15 | Lead Architect | Codex (GPT-5.5) | V2 Slice 7L-1 Cache Policy Clarification -- [Standard] [open-items: yes]
**For next agent:** Addressed the final Senior Developer `MODIFY` finding in docs only. The 7L-1 source approval package now gives exact temporary `AnalyzerV2CachePolicy` registry fields for query planning (`v2.semantic.evidence-query-planning`, required dimensions including prompt/model/config/input/language/current-date provenance, optional `adapterVersion`, Captain-approved approval metadata) and explicitly separates that metadata from the no-store/no-read runtime `AnalyzerV2CacheDecision`. The package also states that `und` is unavailable for 7L-1 and must block before prompt rendering or provider callback invocation.

---
### 2026-05-15 | Lead Architect | Codex (GPT-5.5) | V2 Slice 7L-1 Query-Planning Runtime -- [Significant] [open-items: yes]
**For next agent:** Implemented Captain-approved 7L-1 at `6162e057`: hidden/internal direct-text Evidence Lifecycle query-planning prompt/model runtime for accepted `ClaimContract` input only. The implementation records Captain approval (`Approved`, `2026-05-15T20:43:42.6482362Z`) against `Docs/WIP/2026-05-15_V2_Slice_7L1_Query_Planning_Source_Approval_Package.md`, resolves shipped gateway/model policy internally, blocks invalid IDs and missing/`und` language before prompt/provider, uses only an injected provider boundary, keeps cache no-store/no-read, and leaves product/public/source/live/V1 surfaces untouched. Next gate is post-7L-1 review/consolidation before source acquisition, product wiring, live smoke, or broader prompt/model execution.
-> Docs/AGENTS/Handoffs/2026-05-15_Lead_Architect_V2_Slice_7L1_Query_Planning_Runtime.md

---
### 2026-05-15 | Lead Architect | Codex (GPT-5.5) | V2 Slice 7M Post-7L-1 Consolidation -- [Standard] [open-items: yes]
**For next agent:** Committed docs-only 7M after Senior Developer, Code Reviewer, and LLM Expert all approved the next-step proposition. The next V2 action should be a 7M-1 source package for hidden query-plan inspection and non-executable query-plan-to-source-acquisition handoff only. Do not jump to source acquisition, provider/search/fetch, Source Reliability, cache IO, product wiring, public exposure, live jobs, ACS/direct URL execution, or V1 cleanup.
-> Docs/AGENTS/Handoffs/2026-05-15_Lead_Architect_V2_Slice_7M_Post_7L1_Consolidation.md

---
### 2026-05-15 | Lead Architect | Codex (GPT-5.5) | V2 Slice 7M-1 Source Package -- [Standard] [open-items: yes]
**For next agent:** Prepared reviewer-approved 7M-1 source package for hidden/internal query-plan inspection and non-executable query-plan-to-source-acquisition handoff only. Initial LLM Expert and Code Reviewer `MODIFY` findings were resolved by adding an explicit inspection request envelope with selected AtomicClaim IDs from the same 7L-1 invocation, banning selected-ID inference, tightening adapter diagnostic redaction, and adding structural/ACS-direct-URL verifier coverage. Next step is implementing 7M-1 exactly; source execution, product wiring, public exposure, live jobs, cache IO, Source Reliability, ACS/direct URL execution, and V1 cleanup remain blocked.
-> Docs/AGENTS/Handoffs/2026-05-15_Lead_Architect_V2_Slice_7M1_Source_Package.md

---
### 2026-05-15 | Lead Architect | Codex (GPT-5.5) | V2 Slice 7M-1 Query-Plan Inspection Handoff Source -- [Significant] [open-items: yes]
**For next agent:** Implemented 7M-1 at `e24a2816`: hidden/internal query-plan inspection and a non-executable query-plan-to-source-acquisition handoff. The implementation uses an explicit request envelope carrying the 7L-1 runtime result plus selected AtomicClaim IDs from the same 7L-1 input envelope, forbids selected-ID inference, redacts raw provider/event diagnostics, blocks malformed/non-accepted/provenance-missing states, and keeps the handoff `not_executable`. Focused verifier, full Analyzer V2 unit slice, build, whitespace checks, and forbidden-reference scan passed. No live jobs were run. Next step is post-7M-1 review/consolidation before any source execution package.
-> Docs/AGENTS/Handoffs/2026-05-15_Lead_Architect_V2_Slice_7M1_Query_Plan_Inspection_Handoff_Source.md

---
### 2026-05-16 | Lead Architect | Codex (GPT-5) | V2 Slice 7N-3B3-2C-A Hidden Real-Byte Handoff Source -- [Significant] [open-items: yes]
**For next agent:** Implemented 7N-3B3-2C-A at `09c66527`: hidden/default-closed transport-owner real bytes into a distinct packet-sink authority, HMAC/provenance-bound frame sealing, terminal hidden materialization plus disposal, byte-free public transport outcomes, and exact import/export guards. A P1 review found the first hidden byte-state factory was forgeable by importers; the final implementation removes that property and uses explicit guard-listed `sealSourceAcquisitionContentTransportOwnedByteFrameFromTransportSuccess(...)` from transport only. Focused 2C-A tests, runtime slice, source-acquisition slice, full Analyzer V2 unit slice, build, diff check, and independent narrow re-review passed. Parser consumption, live jobs, product/public wiring, cache/SR/storage, evidence/report generation, prompts/config/model/schema changes, ACS/direct URL execution, and V1 cleanup remain blocked by later gates.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_Slice_7N3B3-2C-A_Hidden_Real_Byte_Handoff_Source.md

---
### 2026-05-16 | Lead Architect | Codex (GPT-5) | V2 7N-3B3-2D Parser Isolation Design -- [Standard] [open-items: yes]
**For next agent:** Drafted docs-only 2D parser-isolation package after deputy PASS on 2C-A consolidation and a three-agent debate. First deputy package review returned Security `MODIFY` and Senior Developer / LLM-Evidence `APPROVE`; the package was tightened so child-process parser work is fixture/control protocol-only, while parser execution over real fetched bytes requires a later reviewed container, separate OS user, OS sandbox, or equivalent OS-level denial boundary. Deputy re-review then returned all `APPROVE`. 2D is review-clean as docs-only design. Next action is a separate 2D-A source package for fixture/control parser protocol harness only. Source implementation, parser consumption of real fetched bytes, product/public wiring, live jobs, cache/SR/storage, prompts/models/config/schema edits, evidence/report generation, ACS/direct URL, V1 reuse, and V1 cleanup remain blocked until later explicit gates.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_7N3B3-2D_Parser_Isolation_Design.md

---
### 2026-05-16 | Lead Architect | Codex (GPT-5) | V2 7N-3B3-2D-A Fixture/Control Parser Runner Source Package -- [Standard] [open-items: yes]
**For next agent:** Drafted and deputy-approved `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-A_Fixture_Control_Parser_Runner_Source_Package.md`. It proposes a fixture/control-only child-process parser runner protocol harness, exact file/import/export envelope, a checked-in `.cjs` worker entrypoint, and verifiers. Initial review returned Security/Senior Developer `MODIFY` and LLM-Evidence `APPROVE`; final re-review returned all `APPROVE` after adding stripped child-process env, sentinel env-secret tests, CommonJS worker source scans, and a narrowed callback contract. Next action is source implementation exactly inside the package envelope. Real fetched-byte parser execution, transport-owned packet/frame consumption, product/public/live wiring, cache/SR/storage, prompt/model/config/schema edits, evidence/report semantics, ACS/direct URL, V1 reuse, and V1 cleanup remain blocked.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_7N3B3-2D-A_Fixture_Control_Parser_Runner_Source_Package.md

---
### 2026-05-16 | Senior Developer | Codex (GPT-5) | Daily Bug Scan No Confirmed Regression -- [Standard] [open-items: no]
**For next agent:** Scanned code-bearing commits since `2026-05-15T06:01:35Z`, with attention to `7a263cbf`, `57dc2308`, `f49c69cd`, `6162e057`, `e24a2816`, `107366ab`, `3d05583e`, `13ff68d3`, and `6e71bbea`. Concrete verification stayed clean: `dotnet test apps/api.Tests/FactHarbor.Api.Tests.csproj --filter AnalyzeInputValidatorTests`; focused web suites for parser sink/parser, boundary guard, candidate/runtime/network/content transport, gateway policy/cache governance, task-contract schemas, and query-plan inspection/handoff; plus `npm -w apps/web run build`. No failing test, build break, or diff-backed regression remained after the same-window follow-up fixes, so no patch was applied. If a later issue is reported against this window, start with the parser-sink boundary pair (`13ff68d3` -> `6e71bbea`) and distinguish committed state from the current dirty worktree in `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.ts`, `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.test.ts`, `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`, and `Docs/AGENTS/Agent_Outputs.md`.
**Warnings:** Repo worktree was already dirty in the latest parser-sink files and `Docs/AGENTS/Agent_Outputs.md`; this scan did not treat those uncommitted edits as bug evidence and did not revert them.
**Learnings:** no

---
### 2026-05-16 | Lead Architect + LLM Expert | Codex (GPT-5) | V2 Pipeline Leadership Assessment -- [Significant] [open-items: yes]
**For next agent:** Produced a leadership deck and advisory synthesis for the V2 pipeline. Recommendation: continue V2, but do not cut over or expose public V2 until UCM/task-policy authority, parser isolation, hidden end-to-end evidence flow, ReportResult authority, public cutover gating, and comparator validation are complete. Highest-leverage next improvement is a machine-readable V2 Gate Register joining prompt section, schema, gateway/model/cache policy, approval, active hash, allowed files, blocked surfaces, verifiers, and live-job eligibility.
-> Docs/AGENTS/Handoffs/2026-05-16_External_Advisor_V2_Pipeline_Leadership_Assessment.md

---
### 2026-05-16 | Lead Architect + LLM Expert | Codex (GPT-5) | V2 Pipeline Executable Action Plan -- [Significant] [open-items: yes]
**For next agent:** Converted the blurry leadership assessment into executable work orders. Immediate sequence: V2-X0 deputy re-review of 2D-A, V2-X1 fixture/control parser runner implementation if approved, V2-X2 machine-readable Gate Register, V2-X3 query-planning policy/frontmatter drift repair, V2-X4 public cutover guard, V2-X5 hidden Claim Understanding -> Query Planning -> source-acquisition handoff harness. Each work order has candidate file envelopes, acceptance criteria, verifier commands, and stop conditions.
-> Docs/AGENTS/Handoffs/2026-05-16_External_Advisor_V2_Pipeline_Executable_Action_Plan.md

---
### 2026-05-16 | Lead Architect + LLM Expert | Codex (GPT-5) | V2 Pipeline Leadership Execution Bridge -- [Significant] [open-items: yes]
**For next agent:** Rebuilt the V2 leadership presentation as a 12-slide execution bridge. It now leads with the decision "fund the next gates, not a cutover", shows current state as done/ready/blocked, maps leadership levers to X1-X5 work orders and evidence artifacts, gives three leadership asks, and ends with five yes/no steering questions. Saved-PPTX previews and package QA passed after fixing wrapping defects on the state snapshot, runway, and 30/60/90 slides.
-> Docs/AGENTS/Handoffs/2026-05-16_External_Advisor_V2_Pipeline_Leadership_Execution_Bridge.md

---
### 2026-05-16 | External Advisor / Senior Architect / LLM Expert | Codex (GPT-5) | V2 Pipeline Immediate Execution Update -- [Significant] [open-items: yes]
**For next agent:** Created Revision B leadership deck and an X4 acceptance/next-gate execution packet after refreshing current status. X4 is implementation-complete and must be framed as a fail-closed public guard, not cutover. Immediate decision: explicit X3-B prompt approval yes/no; if no, choose the next low-risk source package from the reviewed action plan using the negative screen in `Docs/WIP/2026-05-16_V2_X4_Acceptance_and_Next_Gate_Execution_Packet.md`.
-> Docs/AGENTS/Handoffs/2026-05-16_External_Advisor_V2_Pipeline_Immediate_Execution_Update.md

---
### 2026-05-16 | Lead Developer | Codex (GPT-5.5) | V2 7N-3B3-2D-B2 OCI Proof Completion -- [Significant] [open-items: yes]
**For next agent:** Completed B2 as a hidden, proof-only OCI parser-isolation check inside the approved envelope. It adds a structural internal-only proof contract, OCI proof owner, explicit runtime/image approval checks, rootless deployment-candidate distinction, sanitized denial-result mapping, timeout/cancel/failure handling, focused tests, and boundary guards. Architect/Security P1 review found the env-present positive verifier branch was a no-op; it is fixed so explicit sandbox env now runs the real OCI proof and requires `parser_isolation_verified`, while no-env local behavior remains `parser_isolation_unavailable`. Local Docker/Podman is unavailable, so the final local proof state is `parser_isolation_unavailable`; no `local_only` or `deployment_candidate` proof was recorded. 2D-C remains blocked until a positive deployment-candidate rootless OCI proof passes on a provisioned host and a separate reviewed package approves parser work. No live jobs, product/public wiring, prompt/config/model/schema edits, cache/SR/storage, parser byte consumption, evidence/report behavior, ACS/direct URL execution, or V1 reuse/cleanup were done.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Developer_V2_7N3B3-2D-B2_OCI_Proof_Completion.md

---
### 2026-05-16 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 7N-3B3-2D-B3 Provisioned OCI Proof Package -- [Significant] [open-items: yes]
**For next agent:** Added the docs-only B3 package for the provisioned rootless OCI deployment-candidate proof because this host has no Docker/Podman runtime. The package authorizes no source edits and no 2D-C parser work. It defines the exact proof-host requirements, allowed verifier environment variables, independent pre-run image approval requirement, evidence to record, stop conditions, and acceptance criteria. Security review closed the false-success gap where the env image could otherwise self-approve; B3 now rejects any run where the only image approval source is `FH_ANALYZER_V2_PARSER_SANDBOX_IMAGE` echoed into the B2 allowlist. 2D-C remains blocked unless Architect/Security accept a positive `parser_isolation_verified` result with `proofScope = deployment_candidate` and `runtimeAuthority = rootless_oci`.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_7N3B3-2D-B3_Provisioned_OCI_Proof_Package.md

---
### 2026-05-16 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 7N-3B3-2D-B4 Windows Local Isolation Decision -- [Significant] [open-items: yes]
**For next agent:** Consulted Architect, Security/runtime isolation, and Senior Developer/Windows implementability experts after Captain challenged the container requirement. The consolidated decision is that containers are not intrinsically required; a proven OS-level denial boundary is required. B3/rootless OCI remains the deployment-candidate path. A Windows-local path may be added only as a separate local-only proof for inert text/JSON/passive HTML, using AppContainer/restricted identity or equivalent OS boundary plus ACL, network, Job Object, clean-env/no-handle, and Node defense-in-depth probes. Same-user child process, clean env, Job Object, ACL scratch dir, or Node permission flags alone remain insufficient. Infomaniak managed Node.js hosting must not be assumed to provide the needed authority; deployment-candidate parser execution likely requires Infomaniak container/custom infrastructure or a separate isolated parser worker. Product/public/live/cache/SR/Evidence/V1 behavior remains blocked.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_7N3B3-2D-B4_Windows_Local_Isolation_Decision.md

---
### 2026-05-16 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 2D-C0 Parser Worker Architecture -- [Significant] [open-items: yes]
**For next agent:** Drafted the docs-only C0 package for a future isolated parser worker and provisional isolation profile. It defines the parser-worker contract as the stable seam and introduces P0/P1/P2 isolation profiles. P0 is explicitly `provisional_local_inert_only_not_security_boundary`, limited to fixture/control or synthetic inert local/test work, and cannot consume 2C-A packets, real fetched bytes, production/staging traffic, or product/public/live/Evidence behavior. After review, the diagram/protocol now separates P0 synthetic/fixture ingress from P1/P2 2C-A packet ingress. The input capability roadmap is explicit: direct text first, simple web pages after parser-worker/isolation/Evidence Lifecycle gates, PDFs only through a later high-risk package. P1/P2 proof gates remain required before any local-only real-byte or deployment-candidate parser work.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_2D-C0_Parser_Worker_Architecture.md

---
### 2026-05-16 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2-X6 Hidden Direct-Text Candidate Acquisition Harness -- [Significant] [open-items: yes]
**For next agent:** Implemented X6 as a hidden runtime-owned direct-text candidate-acquisition harness after Architect/Security/runtime review. X6 accepts an already-created X5 hidden integration result, validates completed X5 + ready non-executable Source Acquisition handoff/request, requires a `test_injected_candidate_boundary` allowlist, and calls the existing 7N-3B1 candidate runtime with caller-created authority/allowlist/budget/providerBoundary. It has no X5 execution path, no query-planning/model callback, no real network/search/fetch, no parser/content bytes, no cache/SR/storage, no product/public/live wiring, no prompt/config/model/schema edits, no evidence/report/warning/verdict/confidence generation, no ACS/direct URL, and no V1 reuse/cleanup. Focused verifier, Analyzer V2 runtime slice, Analyzer V2 slice, and web build passed. Next direct-text step needs a reviewed package; X6 does not authorize live jobs or real source IO.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_X6_Hidden_Direct_Text_Candidate_Acquisition_Harness.md

---
### 2026-05-16 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2-X7-A Candidate-To-Source-Material Readiness -- [Significant] [open-items: yes]
**For next agent:** Implemented X7-A after Architect/Security/runtime review as a hidden/internal candidate-to-source-material readiness contract. Core `analyzer-v2` source-material code accepts only exact-shape sanitized candidate-acquisition trace data and has no runtime import. The hidden runtime adapter strips an already-created X6 result down to status/count/boolean facts, keeps the X6 damaged pre-cutover public envelope unchanged, and returns source-material readiness as `not_ready_pre_execution` while extraction input and evidence-corpus building remain blocked. X7-A does not authorize provider-network execution, real source IO, source-material population, extraction, evidence generation, product/public/live wiring, cache/SR/storage, prompt/config/model/schema edits, ACS/direct URL, V1 reuse, or V1 cleanup. Focused verifier, Analyzer V2 runtime slice, Analyzer V2 slice, and web build passed.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_X7-A_Candidate_Source_Material_Readiness.md

---
### 2026-05-16 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2-X7-B Source-Material / Evidence-Corpus Guard -- [Significant] [open-items: yes]
**For next agent:** Implemented X7-B under the reviewed source package as a hidden/internal negative guard. It adds a pure source-material absence contract and a pure evidence-corpus source-material guard that consume X7-A readiness only as absence/rejection. The only source-material contract status is `not_available_pre_execution`; the only evidence-corpus guard statuses are `not_buildable_no_source_material`, `blocked_source_material_invalid`, and `blocked_source_material_not_accepted`. Copied/JSON-round-tripped contracts and malformed/source-like inputs fail closed without raw-value echoing. Existing 7F `evidence-corpus/types.ts` and `build-decision.ts` were not edited. X7-B does not authorize provider-network execution, real source IO, source-material population, extraction, EvidenceItems/evidence-corpus population, product/public/live wiring, cache/SR/storage, prompt/config/model/schema edits, ACS/direct URL, V1 reuse, or V1 cleanup. Focused verifier, Evidence Lifecycle slice, Analyzer V2 slice, and web build passed.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_X7-B_Source_Material_Evidence_Corpus_Guard.md

---
### 2026-05-16 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2-X7-C Hidden Provider-Network Readiness -- [Significant] [open-items: yes]
**For next agent:** Implemented X7-C after a three-agent deputy debate and re-review. X7-C adds one hidden/internal runtime owner, `buildSourceAcquisitionProviderNetworkReadiness(...)`, which validates existing 7N-3B2 authority/endpoint/budget prerequisites plus X7-A/X7-B source-material absence input, then returns only `not_executable_pre_live_gate` or `blocked_pre_execution`. It imports no transport/factory, accepts no transport/factory/provider callback input, performs no network/search/fetch, and records explicit zero-cost fields (`providerCalls: 0`, `networkCalls: 0`, `bytesRead: 0`, `candidateRecords: 0`, `retries: 0`, `liveJobs: false`). It does not authorize candidate acquisition, source-material population, extraction, EvidenceItems/evidence-corpus population, product/public/live wiring, cache/SR/storage, prompt/config/model/schema edits, ACS/direct URL, V1 reuse, or V1 cleanup. Focused verifier, Analyzer V2 runtime slice, Analyzer V2 slice, and web build passed.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_X7-C_Hidden_Provider_Network_Readiness.md

---
### 2026-05-16 | Security/runtime Deputy Reviewer | Codex (GPT-5) | V2 X7 Hidden No-IO Composition Review -- [Standard] [open-items: yes]
**For next agent:** Reviewed the candidate next low-risk slice: hidden no-IO composition of X6, X7-A, X7-B, and X7-C after X7-C commit `826e8920`. Decision: `MODIFY`, not reject. The slice may proceed without Captain only if it is a composition/summary over already-created hidden artifacts or pure negative/readiness builders, remains hidden/internal, and returns only non-executable status. It must not construct, run, or import transport/factory/provider-network execution, provider SDKs, real network/search/fetch, real bytes, product/public/live surfaces, cache/SR/storage, prompt/config/model/schema files, ACS/direct URL execution, or V1 code. Recommended status names: `composition_not_executable_pre_live_gate` and `blocked_pre_execution`; avoid `ready`, `executable`, `source_acquired`, `candidate_acquired`, `source_material_available`, `evidence_corpus_buildable`, or public/report terms. Boundary tests must prove exact file/import/export envelope, no product/public transitive reach, zero-cost counters, JSON leak safety, no upstream runtime invocation if the package is declared no-execution, and fail-closed handling for copied/mismatched X6/X7-A/X7-B/X7-C artifacts.
**Warnings:** If implementation needs to call X6 runtime, create 7N-3B2 transport/factory callbacks, produce candidates/source material/evidence corpus, touch public/product/live wiring, edit prompt/config/model/schema, run live jobs, consume ACS/direct URLs, or reuse/clean V1, this review no longer applies and the work must return to deputy/Captain review.

---
### 2026-05-16 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2-X7-D Hidden Direct-Text Source-Acquisition Readiness Composition -- [Significant] [open-items: yes]
**For next agent:** Implemented X7-D after deputy debate and follow-up consensus on the X6 provenance limitation. X7-D adds one hidden/internal synchronous composition owner, `buildHiddenDirectTextSourceAcquisitionReadinessComposition(...)`, which consumes an already-created X6 result, derives X7-A source-material readiness, and calls X7-C provider-network readiness as summary-only `composition_not_executable_pre_live_gate` or `blocked_pre_execution`. It imports no X6 runner/candidate runtime/transport/factory, accepts no callback input, performs no network/search/fetch, and records explicit zero-cost fields. It does not authorize candidate acquisition, source-material population, extraction, EvidenceItems/evidence-corpus population, product/public/live wiring, cache/SR/storage, prompt/config/model/schema edits, ACS/direct URL, V1 reuse, or V1 cleanup. It does not claim copied-X6 provenance rejection; that requires later X6 runtime-owner hardening. Focused X7-D verifier, Analyzer V2 runtime slice, Analyzer V2 slice, and web build passed.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_X7-D_Hidden_Direct_Text_Source_Acquisition_Readiness_Composition.md

---
### 2026-05-16 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2-X6-P Hidden Candidate-Acquisition Provenance -- [Significant] [open-items: yes]
**For next agent:** Implemented X6-P after deputy debate narrowed the approach to a provenance-only sidecar. X6-P adds `hidden-direct-text-candidate-acquisition-harness-provenance.ts` with module-private WeakSet ownership, marks every completed/blocked X6 result inside `runHiddenDirectTextCandidateAcquisitionHarness(...)`, and exposes only a reader/predicate plus owner-only mark function. Spread copies, JSON round trips, structured clones, and mutated owned objects fail the reader. The marker is invisible to object keys and JSON. X6-P does not change X6 execution semantics, X7-D consumption, candidate runtime behavior, provider-network execution, product/public/live wiring, cache/SR/storage, prompt/config/model/schema files, ACS/direct URL, V1 reuse, or V1 cleanup. Focused X6-P verifier, Analyzer V2 runtime slice, Analyzer V2 slice, and web build passed.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_X6-P_Hidden_Candidate_Acquisition_Provenance.md

---
### 2026-05-16 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2-X7-E Hidden Source-Acquisition Composition X6 Provenance Gate -- [Significant] [open-items: yes]
**For next agent:** Implemented X7-E as the narrow X6-P/X7-D follow-up. X7-D now imports only the X6-P provenance sidecar reader and fails closed as `x6_not_runtime_owned` for spread copies, JSON round trips, structured clones, and exact-shape reconstructed X6 objects before source-material/provider-network readiness is evaluated. The composition remains hidden/internal, synchronous, summary-only, zero-cost, non-executable, and non-public. No source execution, candidate acquisition change, source-material population, extraction, EvidenceItems/evidence-corpus building, product/public/live wiring, cache/SR/storage, prompt/config/model/schema edits, ACS/direct URL execution, V1 reuse, or V1 cleanup was done. Focused X7-E/X6-P/boundary suite, Analyzer V2 runtime slice, Analyzer V2 slice, and web build passed.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_X7-E_Hidden_Source_Acquisition_Composition_X6_Provenance_Gate.md

---
### 2026-05-16 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2-X8 Source-Acquisition Gate Register Refresh -- [Significant] [open-items: yes]
**For next agent:** Implemented X8 as an audit-only maintainability slice after deputy recommendations diverged on X7-F, C0-S1, and X8. X8 updates `Docs/AGENTS/V2_Gate_Register.json` so `gate.research_acquisition` names X7-E as the latest hidden direct-text readiness state and records B2/B3/C0 parser blockers. The validator now fails if the row drifts from X7-E, drops the B2 parser blocker, or drops the `2D-C remains blocked` note. The register remains `audit_only`, `canApproveExecution: false`, `consumedByRuntime: false`, row-level `registerGrantsExecution: false`, and `liveJobEligibility: blocked`; gateway policy still reports `research_acquisition` as `notImplemented`. No app runtime, source execution, parser execution, product/public/live wiring, prompt/config/model/schema edits, cache/SR/storage, ACS/direct URL, V1 reuse, or V1 cleanup was done.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_X8_Source_Acquisition_Gate_Register_Refresh.md

---
### 2026-05-16 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2-X7-F Hidden No-IO Source-Acquisition Execution Gate -- [Significant] [open-items: yes]
**For next agent:** Implemented X7-F as a hidden/internal execution-denial contract after Architect, Security/runtime, and Lead Developer deputies agreed it was the lowest-risk next step after X8. X7-D/X7-E readiness-composition results are now process-local runtime-owned and X7-F consumes only the reader. Valid runtime-owned readiness returns `gate_closed_no_io` with `research_acquisition_gateway_not_implemented`; blocked, malformed, copied, or non-no-IO readiness fails closed before admission. X7-F outputs only zero-cost/null summary fields and records parser admission as blocked pending B2/B3/C0/2D-C. The V2 Gate Register now points `gate.research_acquisition` to X7-F while remaining audit-only and runtime-unconsumed. No source execution, provider/network calls, source material, extraction, EvidenceItems/evidence corpus, parser 2D-C, product/public/live wiring, prompt/config/model/schema edits, cache/SR/storage, ACS/direct URL, V1 reuse, or V1 cleanup was done.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_X7-F_Hidden_No_IO_Source_Acquisition_Execution_Gate.md

---
### 2026-05-16 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 C0-S1 P0 Parser Worker Admission -- [Significant] [open-items: yes]
**For next agent:** Implemented C0-S1 as a hidden/internal structural P0 parser-worker admission contract. It admits only fixture/control or synthetic inert metadata, labels P0 as `provisional_local_inert_only_not_security_boundary`, and still returns `blocked_no_parser_execution` with parser execution, worker spawn, byte consumption, packet/frame acceptance, real fetched bytes, product/public/live exposure, Evidence Lifecycle consumption, cache, Source Reliability, parsed material, parser output, and evidence corpus all false/null. Boundary guards keep the file structural, no-import, non-executing, not barrel-exported, and unreachable from product/public surfaces. Gate-register validation now tracks the C0-S1 source package as parser context while the register remains audit-only and non-approving. 2D-C remains blocked.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_C0-S1_P0_Parser_Worker_Admission.md

---
### 2026-05-16 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 C0-S1A Gate Register C0-S1 Blocker Hardening -- [Significant] [open-items: yes]
**For next agent:** After C0-S1, deputies did not fully consent on a runtime C0-S2 next step, so the consolidated safe path was audit-only. C0-S1A hardens `scripts/validate-v2-gate-register.mjs --self-test` so the research-acquisition row cannot silently drop the C0-S1 source package, `parser-worker execution` blocked surface, or `C0-S1` / `P0` note tokens. No app runtime source, parser execution, 2D-C, source IO, product/public/live wiring, cache/SR/storage, Evidence Lifecycle behavior, prompts/config/models/schemas, ACS/direct URL, V1 reuse, or V1 cleanup was changed.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_C0-S1A_Gate_Register_C0S1_Blocker_Hardening.md

---
### 2026-05-16 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 C0-S1A Status Sync -- [Standard] [open-items: yes]
**For next agent:** Synced `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md` with the committed C0-S1A audit-only validator hardening. The canonical status now says the gate register remains audit-only/runtime-unconsumed/live-job blocked and self-tests C0-S1 source package, `parser-worker execution`, `C0-S1`, `P0`, and `2D-C remains blocked` drift. This is documentation/status synchronization only; no runtime source or gate behavior changed.

---
### 2026-05-16 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 C0-S2 Parser Admission Provenance Source Package -- [Significant] [open-items: yes]
**For next agent:** Drafted the docs-only C0-S2 source package after six-agent deputy debate converged on package-first and blocked implementation. The package defines a future process-local runtime-owned C0-S1 admission provenance sidecar so future gates can reject copied/JSON/structured-clone/reconstructed admission objects. It authorizes no source edits now and explicitly keeps parser execution, worker spawn, byte consumption, packet/frame consumption, parsed material, source material, Evidence Lifecycle behavior, product/public/live wiring, cache/SR/storage, prompt/config/model/schema edits, ACS/direct URL, V1 reuse, V1 cleanup, and 2D-C blocked.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_C0-S2_Parser_Admission_Provenance_Source_Package.md

---
### 2026-05-16 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 C0-S2 Parser Admission Provenance Implementation -- [Significant] [open-items: yes]
**For next agent:** Implemented C0-S2 under the reviewed source package. C0-S1 admission decisions are now process-local runtime-owned through `source-acquisition-parser-worker-admission-provenance.ts`; the sidecar stores a mark-time integrity snapshot and accepts only the exact owned object while its contract fields still match. Spread copies, JSON round trips, `structuredClone`, reconstructed objects, malformed marker attempts, and post-mark mutations fail closed without preserving caller-provided positive status; post-mark mutation coverage includes status, blocked reason, P0 identity, approval flags, no-execution fields, and null-output fields. Architecture, Security/runtime, and Code/package reviewers approved after the test-coverage fix. No parser execution, worker spawn, byte consumption, packet/frame consumption, parsed material, source material, Evidence Lifecycle behavior, product/public/live wiring, cache/SR/storage, prompt/config/model/schema edits, ACS/direct URL, V1 reuse/cleanup, or 2D-C was added.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_C0-S2_Parser_Admission_Provenance_Implementation.md

---
### 2026-05-16 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 C0-S3 Parser Admission Parsed-Material Denial Source Package -- [Significant] [open-items: yes]
**For next agent:** Drafted and reviewed the docs-only C0-S3 source package after deputy debate. C0-S3 is intended as a future hidden denial owner between runtime-owned parser admission and parsed material: even a C0-S2-owned C0-S1 admission must still produce no parsed material, parser output, source material, extraction input, or evidence corpus while parser execution remains unapproved. Architecture, Security/runtime, and Code/package reviewers approved after tightening that future C0-S3 source may not import C0-S1 directly, including type-only imports. The package authorizes no source edits now and keeps parser execution, worker spawn, byte consumption, packet/frame consumption, real source IO, product/public/live wiring, cache/SR/storage, Evidence Lifecycle behavior, prompt/config/model/schema edits, ACS/direct URL, V1 reuse/cleanup, and 2D-C blocked.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_C0-S3_Parser_Admission_Parsed_Material_Denial_Source_Package.md

---
### 2026-05-16 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 C0-S3 Parser Admission Parsed-Material Denial Implementation -- [Significant] [open-items: yes]
**For next agent:** Implemented C0-S3 under the reviewed source package. `source-acquisition-parser-admission-parsed-material-denial.ts` imports only the C0-S2 provenance inspection API, accepts only runtime-owned C0-S1 admissions, and still returns denial-only output: no parsed material, parser output, source material, extraction input, or evidence corpus. Copied/serialized/cloned/reconstructed admission-shaped objects fail through the C0-S2 reader path. Focused C0-S3 suite, Analyzer V2 runtime slice, Analyzer V2 slice, gate validators, build, and diff hygiene passed. No parser execution, worker spawn, byte consumption, packet/frame consumption, Evidence Lifecycle behavior, product/public/live wiring, cache/SR/storage, prompt/config/model/schema edits, ACS/direct URL, V1 reuse/cleanup, or 2D-C was added.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_C0-S3_Parser_Admission_Parsed_Material_Denial_Implementation.md

---
### 2026-05-16 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 C0-S3A Gate Register Parser Adjunct Hardening -- [Significant] [open-items: yes]
**For next agent:** Hardened the audit-only V2 Gate Register after C0-S2/C0-S3. The `research_acquisition` row now tracks C0-S2 parser-admission provenance and C0-S3 parsed-material denial alongside C0-S1, and the validator self-test fails if those refs, `parsed-material creation`, or the C0-S2/C0-S3/no-parsed-material note tokens are dropped. The register remains audit-only, runtime-unconsumed, and non-approving; no source execution, parser execution, product/public/live wiring, prompt/config/model/schema edits, cache/SR/storage, ACS/direct URL, V1 reuse/cleanup, or 2D-C was added.
-> Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_C0-S3A_Gate_Register_Parser_Adjunct_Hardening.md
