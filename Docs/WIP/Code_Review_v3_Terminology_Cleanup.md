# Code Review: v3.0/v3.1 Terminology Cleanup

**Status:** PREPARATION COMPLETE - Awaiting implementation completion
**Reviewer Role:** Code Review Agent (read-only)
**Branch Comparison:** `Before-Backward-Compatibility-Break` → `main`
**Created:** 2026-02-04

---

## Review Scope

**Changes under review:**
- 102 files changed
- ~3,092 additions, ~2,225 deletions
- 5 commits since branch point

**Commits:**
| Hash | Description |
|------|-------------|
| `4569d98` | feat: complete v3 terminology cleanup phase 5 |
| `b467e65` | feat: finalize v3.0 config and context renames |
| `ae2cf53` | feat: v3.1 terminology updates and task renames |
| `1775f9a` | feat: rename extract evidence config fields |
| `b25eecb` | ROLE: Code Review Agent |

---

## Review Focus Areas

Per instructions, this review will verify:

1. **Terminology correctness** - Terms match canonical definitions per AGENTS.md and TERMINOLOGY.md
2. **Confusion resolution** - Pre-existing ambiguities are eliminated
3. **No new confusions** - No new terminology collisions introduced
4. **LLM prompt clarity** - Instructions are clear and well-adjusted for models
5. **AGENTS.md compliance** - Strict adherence to project rules

---

## Part 1: Foundational Knowledge

### 1.1 Canonical Terminology Definitions

| Term | Definition | Usage Context |
|------|------------|---------------|
| **AnalysisContext** | Top-level bounded analytical frame requiring separate verdict | "WHAT we're analyzing" - user's question framing |
| **EvidenceScope** | Per-evidence source methodology metadata | "HOW sources analyzed it" - source boundaries/methodology |
| **EvidenceItem** | Unverified evidence extracted from source | NOT a "fact" - material to be evaluated |
| **backgroundDetails** | Narrative framing of article | NOT an AnalysisContext - purely descriptive |
| **statement** | Text content of an EvidenceItem | Replaces legacy `fact` field |

### 1.2 Critical Rules from AGENTS.md

**Context vs Scope - NEVER CONFUSE:**
- **NEVER** use "scope" when referring to AnalysisContext - always say "context"
- **NEVER** use "context" when referring to source metadata - always say "evidenceScope"
- Variables: Use `context`/`analysisContext` for top-level frames, `evidenceScope` for evidence metadata

**EvidenceItem Terminology:**
- **NEVER** call these "facts" in new code - always "evidence" or "evidence items"
- Key fields: `statement` (not `fact`), `evidenceScope`, `probativeValue`, `contextId`

**Generic by Design:**
- No domain-specific hardcoding
- No test-case terms in prompts
- Do not enforce context detection via non-generic terms

### 1.3 Three Concepts Across Three Layers

#### AnalysisContext (Top-Level Analytical Frame)

| Layer | Usage Pattern |
|-------|---------------|
| **LLM Exchange** | Defined as "bounded analytical frame requiring separate verdict"; LLM outputs `id`, `name`, `type`, `metadata`; detected via heuristics + LLM refinement |
| **UI Display** | "Contexts" banner; claims grouped by `contextId`; each context gets separate verdict section |
| **Pipeline** | Detected early -> Canonicalized (deterministic IDs) -> Evidence assigned `contextId` -> Separate verdicts per context |

**LLM Output Schema:**
```typescript
{
  id: string;           // "CTX_WTW", "CTX_TSE"
  name: string;         // "Well-to-Wheel Analysis"
  shortName: string;    // "WTW"
  type: "methodological" | "legal" | "scientific" | "general" | "regulatory" | "temporal" | "geographic";
  metadata: {
    methodology?: string;
    boundaries?: string;
    geographic?: string;
    institution?: string;
    // ...domain-specific
  }
}
```

#### EvidenceScope (Per-Evidence Source Metadata)

| Layer | Usage Pattern |
|-------|---------------|
| **LLM Exchange** | Defined as "source's methodology/boundaries"; extracted SELECTIVELY (only when incompatible boundaries exist) |
| **UI Display** | Small "i" icon on evidence items; hover tooltip shows methodology details; evidence grouped by methodology |
| **Pipeline** | Attached to EvidenceItem -> Validates context splits -> Groups evidence for display |

**LLM Output Schema:**
```typescript
{
  name: string;           // "WTW", "TTW", "EU-LCA"
  methodology?: string;   // "ISO 14040"
  boundaries?: string;    // "Primary energy to wheel"
  geographic?: string;    // "European Union"
  temporal?: string;      // "2022-2024"
  sourceType?: SourceType;
}
```

**Extraction Rule:** Single test - "Would combining with other evidence be misleading due to incompatible boundaries?"

#### EvidenceItem (Unverified Evidence)

| Layer | Usage Pattern |
|-------|---------------|
| **LLM Exchange** | Defined as "unverified material to evaluate" (NOT "fact"); ID prefix E1,E2; fields include `statement`, `contextId`, `claimDirection`, `evidenceScope` |
| **UI Display** | Grouped by direction (supports/contradicts/neutral); then by methodology; shows statement + source + scope tooltip |
| **Pipeline** | Extracted with `contextId` assignment -> Filtered by probative value -> Used in per-context verdicts |

**LLM Output Schema:**
```typescript
{
  id: string;                    // "E1", "E2" (v3.1: E-prefix, not F-prefix)
  statement: string;             // The evidence text (NOT "fact")
  contextId?: string;            // Links to AnalysisContext.id
  claimDirection?: "supports" | "contradicts" | "neutral";
  evidenceScope?: EvidenceScope;
  probativeValue?: "high" | "medium" | "low";
  sourceAuthority?: "primary" | "secondary" | "opinion" | "contested";
  evidenceBasis?: "scientific" | "documented" | "anecdotal" | "theoretical" | "pseudoscientific";
  // ...
}
```

### 1.4 Key Relationships

```
EvidenceItem.contextId  ────>  AnalysisContext.id
   (which analytical frame this evidence relates to)

EvidenceItem.evidenceScope  ────>  source metadata
   (HOW the source computed/measured this data)

AnalysisContext.metadata  ────>  frame-level methodology
   (boundaries that define this analytical frame)
```

**Critical Isolation Rule:** Evidence from Context A **CANNOT** support verdict in Context B.

### 1.5 v3.0/v3.1 Field Name Changes Under Review

#### Core Data Fields
| Legacy (v2.x) | New (v3.0+) | Status |
|---------------|-------------|--------|
| `facts[]` | `evidenceItems[]` | To verify |
| `fact` | `statement` | To verify |
| `analysisContext` (singular) | `backgroundDetails` | To verify |
| `detectedScopes` | `analysisContexts` | To verify |
| `factScopeAssignments` | `evidenceContextAssignments` | To verify |
| `claimScopeAssignments` | `claimContextAssignments` | To verify |
| `supportingFactIds` | `supportingEvidenceIds` | To verify |

#### Config Fields
| Legacy | New | Status |
|--------|-----|--------|
| `scopeDetectionMethod` | `contextDetectionMethod` | To verify |
| `scopeDetectionEnabled` | `contextDetectionEnabled` | To verify |
| `scopeDetectionMinConfidence` | `contextDetectionMinConfidence` | To verify |
| `scopeDedupThreshold` | `contextDedupThreshold` | To verify |

#### v3.1 Additions
| Change | Status |
|--------|--------|
| ID prefix `F1,F2` -> `E1,E2` | To verify |
| Task `extract_facts` -> `extract_evidence` | To verify |
| Task `scope_refinement` -> `context_refinement` | To verify |
| Config `modelExtractFacts` -> `modelExtractEvidence` | To verify |

#### File Renames
| Legacy | New | Status |
|--------|-----|--------|
| `scopes.ts` | `analysis-contexts.ts` | To verify |
| `scope-refinement-base.ts` | `context-refinement-base.ts` | To verify |
| `extract-facts-base.ts` | `extract-evidence-base.ts` | To verify |
| `ArticleFrameBanner.tsx` | `BackgroundBanner.tsx` | To verify |

---

## Part 2: Review Checklist

### 2.1 Terminology Correctness

- [ ] All "scope" references in code refer ONLY to EvidenceScope (per-evidence metadata)
- [ ] All "context" references in code refer ONLY to AnalysisContext (top-level frame)
- [ ] No "fact"/"facts" terminology in new code (use "evidence"/"evidenceItems")
- [ ] `backgroundDetails` replaces singular `analysisContext` for narrative framing
- [ ] `statement` replaces `fact` for evidence text content

### 2.2 LLM Prompt Clarity

- [ ] Prompts include clear terminology glossaries
- [ ] No ambiguous use of "scope" without qualifier
- [ ] Clear distinction between AnalysisContext and EvidenceScope explained
- [ ] No test-case-specific terms in prompt examples
- [ ] Output schemas use correct v3.0+ field names

### 2.3 Backward Compatibility

- [ ] Dual-parsing fallbacks accept legacy field names with warnings
- [ ] Schema versions bumped to 3.0.0
- [ ] No silent fallbacks that hide errors

### 2.4 No New Confusions

- [ ] No new terminology collisions introduced
- [ ] Variable names match their semantic meaning
- [ ] Function names reflect correct terminology
- [ ] UI labels are clear and unambiguous

### 2.5 Documentation Updates

- [ ] TERMINOLOGY.md updated for v3.0
- [ ] Migration guide complete
- [ ] AGENTS.md accurate (check Key Files table)

---

## Part 3: Preliminary Findings (Pre-Review)

*Identified during preparation phase. To be re-checked when review begins - some may be resolved by Senior Developer.*

### 3.0 First Step When Review Begins

**RE-CHECK ALL PRELIMINARY FINDINGS BELOW** - Senior Developer may have addressed these. Verify current state before proceeding with full diff review.

---

### 3.1 Preliminary Finding P1: AGENTS.md Key Files Table Outdated

**File:** [AGENTS.md:113](../../AGENTS.md#L113)

**Issue:** Key Files table references renamed file:
```
| apps/web/src/lib/analyzer/scopes.ts | Scope detection and handling |
```

**Expected:** Should reference `analysis-contexts.ts`

**Severity:** [LOW] - Documentation inconsistency

**Status:** To re-check

---

### 3.2 Preliminary Finding P2: TERMINOLOGY.md Outdated

**File:** [TERMINOLOGY.md](../REFERENCE/TERMINOLOGY.md)

**Issue:** Document shows version 2.6.42 (dated 2026-02-02) and lists config renames as `[DEFER]`:
```
config-schemas.ts:
├─ scopeDetectionMethod → contextDetectionMethod  [DEFER]
├─ scopeDetectionEnabled → contextDetectionEnabled  [DEFER]
├─ scopeDetectionMinConfidence → contextDetectionMinConfidence  [DEFER]
└─ scopeDedupThreshold → contextDedupThreshold  [DEFER]
```

**Expected:** These were implemented in v3.0. Document should reflect current state with status `[DONE]` or similar, and version should be 3.0+.

**Severity:** [MEDIUM] - Documentation out of sync with implementation

**Status:** To re-check

---

### 3.3 Preliminary Finding P3: UI Component Name Violates Terminology Rules

**File:** `apps/web/src/app/jobs/[id]/components/ClaimsGroupedByScope.tsx`

**Issue:** Component groups claims by **AnalysisContext** (using `contextId`), but filename uses "Scope".

**Rule Violated (AGENTS.md):**
> **NEVER** use "scope" when referring to AnalysisContext - always say "context"

**Expected:** Should be renamed to `ClaimsGroupedByContext.tsx`

**Severity:** [MEDIUM] - Terminology rule violation in component naming

**Status:** To re-check

---

### 3.4 Preliminary Finding P4: Conceptual Name Mismatch (ArticleFrame vs backgroundDetails)

**Files:** TERMINOLOGY.md, types.ts, BackgroundBanner.tsx

**Issue:** Inconsistent terminology across layers:

| Layer | Term Used |
|-------|-----------|
| TERMINOLOGY.md | "ArticleFrame" (concept name) |
| TypeScript field | `backgroundDetails` |
| UI Component | `BackgroundBanner.tsx` |

**Expected:** Conceptual name in documentation should align with implementation. Either:
- Update docs to use "Background Details" as concept name, OR
- Document that "ArticleFrame" is the conceptual name while `backgroundDetails` is the field name

**Severity:** [LOW] - Documentation/naming alignment

**Status:** To re-check

---

### 3.5 Preliminary Finding P5: AnalysisContext.metadata vs EvidenceScope Distinction

**Files:** Prompts (understand-base.ts, extract-evidence-base.ts, verdict-base.ts)

**Issue:** Both `AnalysisContext.metadata` and `EvidenceScope` can contain similar fields:
- `methodology`
- `boundaries`
- `geographic`
- `temporal`

**Distinction:**
- **AnalysisContext.metadata** = describes the analytical frame WE'RE using for analysis
- **EvidenceScope** = describes what the SOURCE used when producing evidence

**Risk:** LLMs may confuse these similar structures.

**Expected:** Prompts should clearly explain the distinction. Need to verify during review.

**Severity:** [MEDIUM] - Potential LLM confusion

**Status:** To verify in prompts during review

---

### 3.6 Preliminary Finding P6: "Scope" Preserved in EvidenceScope (Verification Needed)

**Issue:** The term "scope" is intentionally preserved in `EvidenceScope` (correct per rules - refers to per-evidence source metadata).

**Verification Needed:**
- [ ] No prompts confuse "scope" (EvidenceScope) with "context" (AnalysisContext)
- [ ] Variable names use `evidenceScope` consistently (not `scope` alone)
- [ ] UI/code comments don't misuse "scope" for AnalysisContext

**Severity:** [MEDIUM] - Potential terminology confusion

**Status:** To verify during review

---

## Part 4: Full Review Findings

*To be populated after implementation completion and full diff review*

### 4.1 Summary

*Pending*

### 4.2 Findings by Severity

#### [BLOCKER]

*None identified yet*

#### [HIGH]

*None identified yet*

#### [MEDIUM]

*None identified yet*

#### [LOW]

*None identified yet*

---

## Part 5: Verification Commands

To be run after review:

```bash
# Legacy field names that should not exist in new code
grep -r "detectedScopes" apps/web/src --include="*.ts" --include="*.tsx"
grep -r "factScopeAssignments" apps/web/src --include="*.ts"
grep -r "supportingFactIds" apps/web/src --include="*.ts"
grep -r '"facts"' apps/web/src --include="*.ts"
grep -r "scopeDetection" apps/web/src --include="*.ts"

# Legacy function names
grep -r "getScopeRefinement" apps/web/src --include="*.ts"
grep -r "detectScopes" apps/web/src --include="*.ts"

# F-prefix IDs (should be E-prefix in v3.1)
grep -rn '"F[0-9]' apps/web/src --include="*.ts"
```

---

## Appendix A: Reference Documents

| Document | Purpose | Status |
|----------|---------|--------|
| [AGENTS.md](../../AGENTS.md) | Project rules and terminology requirements | Reference |
| [TERMINOLOGY.md](../REFERENCE/TERMINOLOGY.md) | Canonical definitions | Needs update check |
| [Backward_Compatibility_Break_Terminology_Cleanup_Plan.md](Backward_Compatibility_Break_Terminology_Cleanup_Plan.md) | Original cleanup plan | Reference |
| [Backward_Compatibility_Break_Terminology_Cleanup_FollowUp_Plan.md](Backward_Compatibility_Break_Terminology_Cleanup_FollowUp_Plan.md) | Follow-up items | Reference |
| [v2-to-v3-migration-guide.md](../MIGRATION/v2-to-v3-migration-guide.md) | User migration guide | Reference |

---

## Appendix B: Key Files to Review

### Prompts (LLM Exchange)
- `apps/web/src/lib/analyzer/prompts/base/understand-base.ts`
- `apps/web/src/lib/analyzer/prompts/base/extract-evidence-base.ts`
- `apps/web/src/lib/analyzer/prompts/base/verdict-base.ts`
- `apps/web/src/lib/analyzer/prompts/base/context-refinement-base.ts`
- `apps/web/src/lib/analyzer/prompts/providers/*.ts`

### Types & Schemas
- `apps/web/src/lib/analyzer/types.ts`
- `apps/web/src/lib/config-schemas.ts`

### Pipeline
- `apps/web/src/lib/analyzer/analysis-contexts.ts`
- `apps/web/src/lib/analyzer/orchestrated.ts`
- `apps/web/src/lib/analyzer/monolithic-canonical.ts`
- `apps/web/src/lib/analyzer/aggregation.ts`

### UI
- `apps/web/src/app/jobs/[id]/page.tsx`
- `apps/web/src/app/jobs/[id]/components/*.tsx`

### Config
- `apps/web/configs/pipeline.default.json`
- `apps/web/configs/search.default.json`
- `apps/web/configs/calculation.default.json`

---

*Document maintained by Code Review Agent*
*Last updated: 2026-02-04*
