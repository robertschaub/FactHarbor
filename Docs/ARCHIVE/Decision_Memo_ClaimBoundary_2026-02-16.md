# Decision Memo — ClaimBoundary Architecture Rework

**Date:** 2026-02-16
**Author Role:** Lead Architect (External Advisor)
**Audience:** Captain + core engineering
**Scope:** Architectural decisions for ClaimBoundary pipeline v1

---

## Executive Summary

The converged design is strong and consistent across reviewers. The remaining decisions are about **auditability vs. cost**, **signal quality vs. configurability**, and **documentation timing**. My recommendations keep the architecture lean while preserving audit trails and AGENTS.md compliance.

---

## Decisions Needed

### Decision 1 — Scope of P1 (Claim Quality Gate)

**Options**
1. **Merged**: Pass 2 output includes `groundingQuality`; Gate 1 validates it. No extra LLM call.
2. **Separate**: Dedicated Haiku quality assessment call after Pass 2.

**Recommendation:** **Option 1 (Merged)**

**Rationale:**
- Keeps LLM reasoning in the same call that extracts claims.
- Lower cost and fewer moving parts.
- Still auditable if `groundingQuality` and Gate 1 rejections are logged per claim.

**Implementation note:** Ensure `groundingQuality` is a required field in Pass 2 output and recorded in the claim audit log. That yields equivalent traceability without another call.

---

### Decision 2 — Self‑Consistency “Lightweight” Mode

**Options**
1. **Two modes**: Full (2 Sonnet) or Disabled.
2. **Three modes**: Full (2 Sonnet), Lightweight (1 Haiku), Disabled.

**Recommendation:** **Option 1 (Two modes)**

**Rationale:**
- A weaker model often measures model capability differences, not claim stability.
- “Lightweight” risks misleading signals that dilute trust in the stability signal.

**If Option 2 is chosen:** label it explicitly as *coarse anomaly detection only* and do not compare it to full mode in metrics or dashboards.

---

### Decision 3 — Proceed with Architecture Document Update

**Options**
1. **Full update now** (rewrite sections §8.4, §8.5, §9.1, §11, §12, §13; add verdict stage module spec)
2. **Delta addendum now** (append a revision section capturing agreed v1 features + decisions)
3. **Hold** (wait for more discussion)

**Recommendation:** **Option 2 (Delta addendum now)**

**Rationale:**
- Decisions 1–2 are still open; a full rewrite risks churn.
- Addendum keeps the doc authoritative and time‑stamped while preserving continuity.
- Full rewrite can proceed immediately after decisions are closed.

---

## Architectural Guidance (Non‑Decision)

### Deterministic Consistency Check
- Allow **structural checks only**: ID validity, boundary membership, evidence references, coverage matrix completeness.
- Any **semantic** consistency must be LLM‑powered (AGENTS.md LLM Intelligence rule).

### Schema / Terminology Clash
- ClaimBoundary replaces AnalysisContext in the new pipeline, but the terminology reference and UI still assume AnalysisContext as the top‑level grouping.
- This is a **schema/UI contract change**; capture it explicitly in the architecture doc and flag for Captain sign‑off.

### UCM and Prompt Compliance
- All new prompt content (debate pattern, congruence clustering, grounding criteria) must be UCM‑managed. No inline strings in code.

---

## v1 Feature Set (Aligned)

The 13‑feature v1 list is coherent and implementable. The total extra LLM cost (~$0.60/run) is acceptable given the quality gains and is consistent with Phase 8 evidence of quality bottlenecks.

---

## Suggested Next Step

1. Captain chooses Decisions 1–3.
2. If **Decision 3 = Delta addendum**, append a short “Revision Addendum” to `Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md` that:
   - Records the v1 feature list (13 items)
   - Captures the selected options for Decisions 1–3
   - Flags the schema/UI contract change explicitly

---

## Decision Record

### Round 1 (Brainstorming Review)

- **Decision 1:** ☑ **A (Merged)** ☐ B (Separate)
- **Decision 2:** ☑ **A (Two modes)** ☐ B (Three modes)
- **Decision 3:** ☑ **A (Full update)** ☐ B (Delta addendum) ☐ C (Hold)

**Decided by:** Captain, 2026-02-16
**Notes:** All three decisions made in single session. D1+D2 unanimous across Captain Deputy and External Advisor. D3 was split (Deputy: A, External: B) — Captain chose A since D1+D2 are now closed, eliminating the External Advisor's "open decisions" concern.

### Round 2 (Captain Comments)

- **Decision 4 (EvidenceScope structure):** ☑ **B (Named core + extensible `additionalDimensions`)** ☐ A (Fully generic)
- **Decision 5 (Qualitative field granularity):** ☑ **A (Approve field-by-field recommendations)**
- **Decision 6 (claimDirection "neutral"):** ☐ A (Remove) ☑ **B (Rename to "contextual")** ☐ C (Keep)
- **Decision 7 (Structured VerdictNarrative):** ☑ **A (Yes — structured type)** ☐ B (Keep free-form)
- **Decision 8 (Rules audit timing):** ☑ **A (Lead Architect as Step 0)** ☐ B (Separate task)
- **Decision 9 (harmPotential 4 levels):** ☑ **A (critical/high/medium/low)** ☐ B (Keep 3 levels)

**Decided by:** Captain, 2026-02-16
**Notes:** All six decisions adopted Captain Deputy's recommendations. See `Captain_Comments_Consolidated_2026-02-16.md` for full analysis per decision.

### All Decisions Summary

| # | Decision | Choice |
|---|----------|--------|
| D1 | Claim Quality Gate | Merged (Pass 2 + Gate 1) |
| D2 | Self-Consistency Modes | Two modes (full / disabled) |
| D3 | Architecture Doc Update | Full update now |
| D4 | EvidenceScope Structure | Named core fields + extensible `additionalDimensions` |
| D5 | Qualitative Field Granularity | Field-by-field: probativeValue 3, harmPotential 4, centrality 3, groundingQuality 4, scopeQuality 3 |
| D6 | claimDirection "neutral" | Rename to "contextual" |
| D7 | Overall Verdict Narrative | Structured VerdictNarrative type |
| D8 | Rules Audit Timing | Lead Architect as Step 0 before implementation |
| D9 | harmPotential Expansion | 4 levels: critical / high / medium / low |

**Status: All decisions closed. No open items remain.**


