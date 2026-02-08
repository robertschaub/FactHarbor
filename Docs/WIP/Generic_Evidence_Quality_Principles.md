# Generic Evidence Quality Principles

**Status:** PROPOSED — Awaiting implementation
**Date:** 2026-02-05
**Origin:** Extracted from Bolsonaro trial analysis investigation (archived to `Docs/ARCHIVE/WIP/Bolsonaro_Analysis_Investigation_arch.md`)

---

## Overview

These principles are COMPLETELY ABSTRACT and apply to ANY analysis, not just legal/political cases. They address recurring quality issues observed during real-world analyses.

---

## PRINCIPLE 1: Opinion ≠ Evidence (Universal)

**Rule:** An entity's CHARACTERIZATION of something is NOT evidence about that thing.

| Source Type | Example | Probative Value |
|-------------|---------|-----------------|
| Direct observation/measurement | "The document contains 47 pages" | HIGH |
| Expert analysis with methodology | "Analysis of data shows X correlates with Y" | HIGH |
| Official records from the subject | Court filings, audit reports, lab results | HIGH |
| Third-party characterization | "Entity X says Y is bad/good" | LOW |
| Emotional/rhetorical language | "witch hunt", "persecution", "unfair" | LOW |

**Key insight:** The DISTANCE between the source and the subject determines reliability:
- **Direct**: Source IS the subject or directly measured it → HIGH
- **Expert**: Source analyzed the subject with transparent methodology → MEDIUM-HIGH
- **Reported**: Source reports facts with citations → MEDIUM
- **Opinion**: Source expresses view without evidence → LOW
- **Hearsay**: Source reports what others say → VERY LOW

---

## PRINCIPLE 2: LLM Knowledge Has a Cutoff Date (Universal)

**Fundamental truth:** LLMs are trained on data from the past. They do NOT know:
- Current events (anything after training cutoff)
- Recent changes to laws, policies, organizations
- Current status of ongoing proceedings
- Recent scientific discoveries or corrections

**Generic solution:**
1. Web search provides current information
2. BUT web search results are still just TEXT that needs evaluation
3. Apply the same evidence quality rules to web results
4. Recency of source does NOT automatically make it reliable

---

## PRINCIPLE 3: Source Type Classification (Universal)

Every piece of potential evidence should be classified:

**CATEGORY A - Direct/Primary Sources (HIGH weight):**
- Official documents from the subject entity
- Peer-reviewed research with methodology
- Court records, filings, official rulings
- Audit reports, inspection records
- Raw data with provenance

**CATEGORY B - Expert Analysis (MEDIUM-HIGH weight):**
- Analysis by credentialed experts in the relevant field
- Methodology is stated and verifiable
- Sources are cited

**CATEGORY C - Factual Reporting (MEDIUM weight):**
- News articles with specific facts, quotes, documents
- Clear attribution of claims
- Multiple independent sources corroborate

**CATEGORY D - Opinion/Commentary (LOW weight - typically DISCARD):**
- Characterizations without supporting evidence
- Rhetorical language ("unfair", "biased", "corrupt")
- One entity's opinion about another entity
- Diplomatic/political statements about other entities
- Advocacy materials with clear agenda

**CATEGORY E - Unreliable (DISCARD):**
- Anonymous sources
- "Some say", "critics claim", "many believe"
- Social media posts without verification
- Obvious propaganda or satire

---

## PRINCIPLE 4: Jurisdiction/Subject Relevance (Universal)

**Rule:** Evidence must be ABOUT the subject being analyzed.

| Scenario | Relevance |
|----------|-----------|
| Source directly discusses subject X | RELEVANT |
| Source discusses similar subject Y | POSSIBLY RELEVANT (with caution) |
| Source mentions subject X tangentially | LOW RELEVANCE |
| Source is about different subject entirely | IRRELEVANT - DISCARD |

**Generic implementation:**
- When searching for counter-evidence/criticism, constrain to subject's domain
- A document about Entity A is NOT evidence about Entity B just because both are mentioned
- Geographic, temporal, and topical scope must match

---

## PRINCIPLE 5: probativeValue Enforcement (Universal)

**Current state:** `evidence-filter.ts` discards low probativeValue items.
**Enhancement needed:** Ensure the LLM correctly ASSIGNS probativeValue in the first place.

Add to extraction prompts:
```
CRITICAL: Assign probativeValue based on SOURCE TYPE, not content agreement.

- A well-sourced article that DISAGREES with the claim → HIGH probativeValue
- An opinion piece that AGREES with the claim → LOW probativeValue

The question is "How reliable is this source?" NOT "Does this support the conclusion?"
```

---

## Implementation Plan

| Change | File | Description |
|--------|------|-------------|
| Source type classification prompt | `orchestrated.ts` | Add guidance to extract prompts |
| Jurisdiction relevance filter | `orchestrated.ts` | Constrain criticism search to subject's domain |
| probativeValue assignment rules | Extract prompts | Explicit source type → probativeValue mapping |
| Strengthen filter | `evidence-filter.ts` | Log WHY items are discarded |

---

## Verification (Generic Test Cases)

To verify these rules work correctly, test with DIVERSE cases:

1. **Legal proceeding analysis** - Evidence should be legal documents, not political opinions
2. **Scientific claim analysis** - Evidence should be peer-reviewed research, not popular articles
3. **Corporate action analysis** - Evidence should be filings, audits, not competitor statements
4. **Historical event analysis** - Evidence should be primary sources, not later interpretations

Each test should verify:
- [ ] Direct/primary sources have HIGH probativeValue
- [ ] Third-party opinions have LOW probativeValue
- [ ] Irrelevant jurisdiction sources are filtered
- [ ] Rhetorical characterizations are not treated as evidence
