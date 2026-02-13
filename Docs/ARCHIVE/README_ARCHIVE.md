# FactHarbor Documentation Archive

**Purpose**: This directory contains historical documents that are no longer actively referenced but may be useful for context or historical review.

**Last Updated**: 2026-02-13 (WIP Consolidation)

---

## Content Extraction Log

The following documents had valuable content extracted and merged into active documentation:

| Archived Document | Extracted Content | Merged Into |
|-------------------|-------------------|-------------|
| `REVIEWS/Claim_Filtering_Enhancements_Implementation_Prompt.md` | Config options table | [Unified_Config_Management.md](../USER_GUIDES/Unified_Config_Management.md#54-pipelineconfig) |
| `REVIEWS/Terminology_Catalog_Five_Core_Terms.md` | Known Issues & Migration Status | [TERMINOLOGY.md](../REFERENCE/TERMINOLOGY.md#known-issues--migration-status) |
| `REVIEWS/Baseless_Tangential_Claims_Investigation_2026-02-02.md` | 7-Layer Defense System | [Evidence_Quality_Filtering.md](../ARCHITECTURE/Evidence_Quality_Filtering.md#2-multi-layer-claim-filtering-defense) |

---

## What's Archived

### Review & Audit Documents

**Location**: `REVIEWS/`

**Description**: Historical review documents (UCM, terminology migration, analysis quality, SR investigations). These are no longer actively edited but remain as reference and audit trail.

**Current Documentation**: Active guidance lives in `Docs/STATUS/` and `Docs/ARCHITECTURE/`.

---

### Status Changelogs & Reports

**Location**: `STATUS/`

**Description**: Historical status snapshots and changelogs that are superseded by current status/history docs.

**Examples**:
1. `Changelog_v2.6.38_to_v2.6.40.md`
2. `Changelog_v2.6.41_Unified_Config.md`
3. `Documentation_Inconsistencies.md`

---

### Historical Reports & Summaries

**Location**: Root of `ARCHIVE/`

**Examples**:
1. `FactHarbor POC1 Architecture Analysis.md`
2. `WORKSHOP_REPORT_2026-01-21.md`
3. `Mermaid_Fix_Summary.md`
4. `Analysis_Quality_Issues_2026-02-13.md`
5. `Report_Issues_Review_and_Fix_Plan_2026-02-13.md`
6. `Phase2_Prompt_Approval_Patch_2026-02-13.md`

### WIP Consolidation (2026-02-13)

**Description**: Documents archived during WIP consolidation — completed proposals, superseded reports, and historical working documents.

**Files**:
1. `Phase1_Implementation_Plan.md` - Jaccard Phase 1 implementation spec (DONE — 14/14 tests, all items complete; tracked in Jaccard v2)
2. `Jaccard_Similarity_AGENTS_Violations.md` - v1 violations report (SUPERSEDED — replaced by v2 after reviewer corrections)
3. `Quality Issues Investigations and Plan.md` - Multi-agent raw investigation findings (SUPERSEDED — synthesized into Quality_Issues_Consolidated_Implementation_Plan.md)
4. `WIP_Documentation_Audit_2026-02-12.md` - WIP cleanup audit (DONE — actions executed in Feb 12-13 cleanups; remaining "Triple-Path" refs added to Backlog)
5. `POC_Approval_Readiness_Assessment_2026-02-07.md` - POC readiness snapshot from Feb 7 (STALE — findings captured in Current_Status.md known issues)
6. `Reporting_Improvement_Exchange.md` - 30-session paired-programming exchange log (DONE — all sessions complete; outcomes reflected in code and status docs)
7. `Generic_Evidence_Quality_Principles.md` - 5 evidence quality principles (DONE — all 5 principles implemented in evidence-filter.ts, types.ts, prompts, orchestrated.ts)

### Source Reliability Service Reviews

**Location**: `Source_Reliability_Service_Reviews/` (Note: Files are at root of ARCHIVE for now)

**Description**: Historical review documents from the Source Reliability Service implementation (v2.6.17-v2.6.33 timeframe). These documents tracked the development, architecture review, security review, and implementation validation of the source reliability scoring system.

**Files**:
1. `Source_Reliability_Service_Proposal.md` - Initial proposal for source reliability system
2. `Source_Reliability_Service_Proposal.LeadDevReview.md` - Lead developer review of proposal
3. `Source_Reliability_Service_Architecture_Review.md` - Architecture review
4. `Source_Reliability_Service_Final_Review.md` - Final pre-implementation review
5. `Source_Reliability_Service_Security_Review.md` - Security considerations
6. `Source_Reliability_Service_Project_Lead_Review.md` - Project lead approval
7. `Source_Reliability_Implementation_Review.md` - Post-implementation review
8. `Source_Reliability_Review_Summary.md` - Summary of all reviews

**Why Archived**:
- Implementation complete (v2.6.33)
- System is operational and documented in current architecture docs
- Reviews were part of development process, no longer needed for day-to-day reference
- Kept for historical context and audit trail

**Current Documentation**: See `Docs/ARCHITECTURE/Source_Reliability.md` for active documentation

---

## Archive Policy

### When to Archive

Documents should be moved to ARCHIVE when:
1. ✅ Implementation is complete and stable
2. ✅ Active documentation exists for the feature
3. ✅ Document is no longer referenced by current development
4. ✅ Document is useful for historical context but not operational needs

### When NOT to Archive

Keep documents in main directory if:
1. ❌ Actively referenced by current development
2. ❌ Part of onboarding or daily operations
3. ❌ Required for understanding current architecture
4. ❌ Updated in last 3 months (unless superseded)

### Retrieval

If you need to reference archived documents:
- Check this README for file list and locations
- All archived documents remain in git history
- Links from active docs to archived docs are updated to include `/ARCHIVE/` path

---

## Related Directories

- **`Docs/ARCHITECTURE/`** - Current architecture documentation
- **`Docs/ARCHIVE/REVIEWS/`** - Archived reviews and audits
- **`Docs/ARCHIVE/STATUS/`** - Archived changelogs and resolved audits
- **`Docs/STATUS/`** - Current status and known issues
- **`Docs/REFERENCE/`** - Reference documentation and guides

---

**Archive Maintainer**: Plan Coordinator
**Last Review**: 2026-02-13 (WIP Consolidation)
**Next Review**: Quarterly (or when major features complete)
