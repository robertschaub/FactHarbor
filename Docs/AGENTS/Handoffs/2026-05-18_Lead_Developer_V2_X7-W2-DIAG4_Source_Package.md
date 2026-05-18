### 2026-05-18 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 X7-W2-DIAG4 Node Error Category Taxonomy Source Package

**Task:** Consolidate post-LS4 debate and prepare the next safe V2 W2 diagnostic/repair source package.

**Files touched:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-DIAG4_Node_Error_Category_Taxonomy_Source_Package.md`; `Docs/STATUS/Current_Status.md`; `Docs/STATUS/Backlog.md`; `Docs/AGENTS/Agent_Outputs.md`; `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W2-DIAG4_Source_Package.md`; `Docs/AGENTS/index/handoff-index.json`.

**Key decision:** Prepare DIAG4 as a narrow enum/mapping source package before any local raw-code probe or additional live job. DIAG4 closes known category debt from DIAG3 by adding bounded `nodeErrorCodeCategory` values for already-declared transport failure classes: `network_unreachable`, `host_unreachable`, and `address_family_failure`, plus reviewed TLS protocol aliases mapped to existing `tls_protocol`.

**Review:** Claude Opus 4.6 returned `MODIFY` only for the `EPROTO` mapping qualification; the package now states `EPROTO` maps to `tls_protocol` only in this HTTPS-only transport path. Claude Opus re-reviewed and returned `APPROVE` with no required changes.

**Debate consolidation:** Claude Opus 4.6 and implementation/cost review recommended category expansion first. Security/boundary review preferred a local raw-code probe first, but only under strict operator-local controls outside product artifacts. Lead Developer decision: avoid raw-code inspection unless DIAG4 plus a later reviewed LS5 still leaves `other_known`.

**Warnings:** DIAG4 authorizes no live jobs, no provider/source expansion, no local/loopback network probe, no raw-code inspection tool, no source material/content dereference/parser/cache/SR/storage, no EvidenceCorpus/evidence/report/verdict/warning/confidence/public behavior, no ACS/direct URL, no V1 work/cleanup, and no W2 success/damaged semantics change.

**For next agent:** Start with `Docs/WIP/2026-05-18_V2_Slice_X7-W2-DIAG4_Node_Error_Category_Taxonomy_Source_Package.md`. The package is approved; implement only the bounded enum/type and mapping changes in `source-acquisition-network-envelope.ts` and `source-acquisition-network-transport.ts`, with focused synthetic tests. Do not add live/probe behavior.

**Learnings:** The least risky way forward is to eliminate known taxonomy blind spots first. Raw-code inspection is a fallback diagnostic, not the next default, because it increases operational and governance surface before we have exhausted enum-only classification.
