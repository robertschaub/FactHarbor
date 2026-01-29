# FactHarbor Documentation Archive

**Purpose**: This directory contains historical documents that are no longer actively referenced but may be useful for context or historical review.

**Last Updated**: 2026-01-29

---

## What's Archived

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
- **`Docs/REVIEWS/`** - Active reviews and audits
- **`Docs/STATUS/`** - Current status and known issues
- **`Docs/REFERENCE/`** - Reference documentation and guides

---

**Archive Maintainer**: Plan Coordinator
**Last Review**: 2026-01-29
**Next Review**: Quarterly (or when major features complete)
