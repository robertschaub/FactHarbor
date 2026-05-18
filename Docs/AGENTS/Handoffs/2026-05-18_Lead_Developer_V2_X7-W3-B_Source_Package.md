---
### 2026-05-18 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 X7-W3-B Bounded Page-Summary Source Material Source Package
**Task:** Decide the next V2 direction after W3-A passed canary and prepare the W3-B review package if appropriate.

**Files touched:** `Docs/WIP/2026-05-18_V2_Slice_X7-W3-B_Bounded_Page_Summary_Source_Material_Source_Package.md`, `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W3-B_Source_Package.md`, `Docs/AGENTS/Agent_Outputs.md`, and generated `Docs/AGENTS/index/handoff-index.json`.

**Key decisions:** After a compact debate with Claude Opus 4.6, Security/Containment, and Product/Quality/Cost perspectives, W3-B is recommended as the next review package, not implementation. It should be one hidden/admin-only Wikimedia Page Content Service page-summary fetch from one runtime-owned materialized W3-A locator. Review modifications were folded in: the pre-draft debate is labeled non-authoritative, the `wikimedia_core` provider-family vs `ep_wikimedia_project_page_summary` endpoint distinction is explicit, W2 Core endpoint durability remains separate, language host labels reject dots/unsafe labels, and byte caps must abort during streaming.

**Open items:** Steering Board must review and approve/modify/reject the W3-B package before implementation. W3-B implementation and live canary remain blocked until that review. Remaining live-job tranche is `5`; the package proposes at most one W3-B canary after implementation and verifiers.

**Warnings:** W3-A's one partial preview record was not recoverable from durable artifacts, and the local artifact route was unavailable during drafting. Code inspection shows the partial class is preview-field partial, not a blocked invalid locator. The W3-B package therefore allows first implementation to fetch only `source_candidate_preview_materialized` records. Parser, EvidenceCorpus, EvidenceItems, report/verdict/warning/confidence behavior, public exposure, second provider, retries, cache/SR/storage, ACS/direct URL, V1 work, and V1 cleanup remain closed.

**For next agent:** Start with `Docs/WIP/2026-05-18_V2_Slice_X7-W3-B_Bounded_Page_Summary_Source_Material_Source_Package.md`. Do not implement W3-B until Steering Board review accepts the package. If accepted, keep implementation to one materialized locator, one project-local page-summary endpoint, `extract` as the only body field, hidden/admin-only Source Material, and one canary maximum.

**Learnings:** Appended to Role_Learnings.md? no.
