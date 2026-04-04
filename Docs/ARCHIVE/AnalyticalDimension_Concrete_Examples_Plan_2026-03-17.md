# analyticalDimension Concrete Examples — Prompt Fix Plan

**Date:** 2026-03-17
**Status:** DRAFT — awaiting review
**Author:** Lead Architect (Claude Opus 4.6)
**Parent plan:** [Combined_Claim_and_Boundary_Quality_Remediation_Plan_2026-03-16.md](Combined_Claim_and_Boundary_Quality_Remediation_Plan_2026-03-16.md) — Phase C
**Trigger:** 0% analyticalDimension fill rate across 11 consecutive Haiku runs

---

## 1. Problem

Phase C (commit `81314c86`) added `analyticalDimension` to `EvidenceScope` with:
- TypeScript interface field (`types.ts`)
- Zod schema field (`.optional().catch(undefined)`)
- `scopeFingerprint()` inclusion
- Clustering mega-cluster split guidance
- EXTRACT_EVIDENCE prompt marking it REQUIRED (commit `8f566bed`)

**Result: 0% fill rate.** Haiku ignores the field across all 11 Mar 17 runs, regardless of claim type, language, or evidence volume. The schema, fingerprint, and clustering infrastructure are in place but receive no data.

---

## 2. Root Cause

The JSON output example in the EXTRACT_EVIDENCE prompt currently shows:

```json
"analyticalDimension": "string (REQUIRED) — what property/metric is measured"
```

This is a **type annotation**, not a value. Haiku's behavior with structured output:
- It mimics JSON examples literally
- It treats type annotations ("string", "number") as documentation to skip
- It reliably populates fields that have **concrete example values** in the schema

Evidence: all other EvidenceScope fields that show concrete values in the example (`"methodology": "string"` etc.) are populated at near-100% rates. The difference is that those fields were established in training data patterns; `analyticalDimension` is new and needs stronger example scaffolding.

---

## 3. Proposed Fix

Replace the type annotation with concrete **abstract** example values in the two evidence item examples within the EXTRACT_EVIDENCE output schema.

### Current (not working):
```json
"analyticalDimension": "string (REQUIRED) — what property/metric is measured"
```

### Proposed:
```json
// Example item 1:
"analyticalDimension": "Property A measurement comparison"

// Example item 2:
"analyticalDimension": "Property B quantitative assessment"
```

### Rules compliance:
- **AGENTS.md "no test-case terms"**: Uses abstract "Property A" / "Property B" — no domain-specific words
- **Multilingual**: Rules section already says "Use short, descriptive labels in the source's language" — the example shows format, the rule governs language
- **Source terminology preference**: Rules section already says "Prefer terminology already present in the source text itself. Do not invent abstract taxonomy labels."
- **Fallback guidance**: Rules section already says "When evidence is general [...] use a short generic label in the source's language indicating that the evidence is general rather than property-specific"

### What this does NOT change:
- No code changes
- No schema changes — Zod remains `.optional().catch(undefined)`
- No UCM changes — all Phase C parameters already UCM-complete
- Fallback behavior identical to today if Haiku still omits the field

---

## 4. Cost Impact

**Zero.** The `analyticalDimension` value is one extra short string in the existing EXTRACT_EVIDENCE output. ~5-15 extra output tokens per evidence item at Haiku rates ($0.25/M) = ~$0.0001 per analysis.

### Alternative considered and rejected:

| Option | Cost | Outcome |
|--------|------|---------|
| **Option 2: Concrete examples (this plan)** | +$0.0001/analysis | Likely >50% fill rate based on Haiku's example-mimicking behavior |
| Option 1: Switch extraction to Sonnet | **+$0.10/analysis (+40% total LLM cost)** | Near-certain fill rate, but disproportionate cost for one field |

---

## 5. Risk

| Risk | Severity | Mitigation |
|------|----------|------------|
| Haiku produces verbatim "Property A measurement comparison" | Low | Rules section overrides with "Use labels in the source's language" and "Prefer source text terminology" |
| Near-synonym fragmentation (e.g., "energy efficiency" vs "energy conversion efficiency") | Medium | `scopeFingerprint()` uses lowercase normalized comparison; SCOPE_NORMALIZATION prompt merges similar dimensions |
| Still 0% fill rate | Low | No regression — behavior identical to today. Accept and close the analyticalDimension effort. |

---

## 6. Validation

| # | Claim | Language | Target |
|---|-------|----------|--------|
| 1 | "Using Hydrogen for cars is more efficient than using electricity" | EN | >50% analyticalDimension fill rate |
| 2 | "Using Hydrogen for cars is more efficient than using electricity" | EN | Largest boundary <70% of evidence |
| 3 | "Die Schülerinnen und Schüler im Kanton Zürich sind heute im Durchschnitt stärker psychisch belastet als vor zehn Jahren." | DE | No regression: TP within 60-72, boundaries in German, 0 empty |

### Success criteria:
- If fill rate >50%: **success** — `analyticalDimension` is working, evaluate boundary quality improvement
- If fill rate 10-50%: **partial** — field is being populated inconsistently, may need further prompt tuning
- If fill rate <10%: **failed** — accept Haiku limitation, close the effort, rely on clustering prompt improvements alone (which already delivered 0 empty boundaries across all runs)

---

## 7. Files Touched

Only `apps/web/prompts/claimboundary.prompt.md` — 2 line changes in the JSON output example within the EXTRACT_EVIDENCE section.

---

## 8. Decision Gate

If this fix fails (fill rate <10%), the recommendation is:
1. **Do not escalate to Sonnet** — +40% cost is disproportionate for one field
2. **Close the analyticalDimension effort** — the clustering prompt improvements and Phase A pruning already solved the original problem (0 empty boundaries, improved distribution)
3. **Revisit when Haiku 5 or a future budget model improves structured output compliance**

---

## Review Log

| Date | Reviewer Role | Status | Comments |
|------|---------------|--------|----------|
| | | | |
