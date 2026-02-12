# GPT Prompt: Lexicon-to-LLM Migration - FULL IMPLEMENTATION

## Task: Complete Migration from Pattern-Based to LLM-Based Classification

**Context:** Migrating from pattern-based to LLM-based classification. Implement ALL phases including pattern removal. Manual validation SKIPPED - use quick automated tests instead.

**Time Estimate:** 6-9 hours (Phase 1: 2-3h, Phase 2: 1-2h, Phase 3: 0.5h, Phase 4: 2-3h, Commit: 0.5h)

---

## Files to Modify

### 1. `apps/web/src/lib/analyzer/prompts/extract-keyfactors.ts`

**Add to prompt:** `factualBasis` classification guidance

```
For each KeyFactor, classify factualBasis:
- "established": Counter-evidence includes specific data, measurements, audits, studies, or legal citations
- "disputed": Some documented counter-evidence exists but is not conclusive
- "opinion": Counter-argument is political criticism, editorial opinion, or lacks specific evidence
- "unknown": Cannot determine evidence quality

Examples:
✅ "Study found 45% error rate" → established (has measurement)
✅ "Audit documented 12 violations" → established (specific findings)
❌ "Executive Order claims abuse" → opinion (political statement, not evidence)
❌ "Critics say it was unfair" → opinion (no specific evidence cited)

Common MISTAKES to avoid:
- ❌ "Official statement says X is true" → NOT established (it's opinion)
- ❌ "Report mentions concerns" → NOT established unless specific data cited

Decision flow:
1. Does it cite specific numbers/measurements? → likely "established"
2. Is it a claim about what happened? → check if documented vs asserted
3. Is it someone's interpretation/opinion? → "opinion"
4. Unclear? → "unknown" (avoid reducing weights without evidence)
```

---

### 2. `apps/web/src/lib/analyzer/prompts/understand-claim.ts`

**Add to prompt:** `harmPotential` assessment guidance

```
For each claim, assess harmPotential:

- "high": Claims about death, serious injury, safety hazards, fraud, or crimes
  Examples: "causes cancer", "kills people", "committed fraud", "is dangerous"

- "medium": Claims with moderate consequences if wrong
  Examples: "is inefficient", "costs more", "has bias"

- "low": Claims with minimal real-world impact if wrong
  Examples: "is popular", "was announced", "is planned"

High-harm claims require more careful verification because errors have serious consequences.
```

---

### 3. `apps/web/src/lib/analyzer/prompts/extract-facts-base.ts`

**Add to prompt:** `sourceAuthority` classification

```
When extracting evidence, classify the source type:

sourceAuthority:
- "primary": Original research, official documents, court records
- "secondary": News reports, analysis, reviews
- "opinion": Editorial, political statements, commentary
- "contested": Source itself is disputed

For OPINION sources (executive orders, dissenting opinions, press releases, spokesperson statements):
- These are NOT documented evidence even if they use words like "documented"
- Political statements claiming something is true/false are opinions, not proof
- A government saying "X is persecution" is an opinion, not evidence of persecution
```

---

### 4. `apps/web/src/lib/analyzer/prompts/generate-verdicts.ts`

**Add to prompt:** Evidence quality and contestation guidance

```
EVIDENCE QUALITY GUIDANCE:
- Claims that rely on mechanisms contradicting established physics, chemistry, or biology should be treated with skepticism
- Claims lacking peer-reviewed scientific evidence, or relying on anecdotes/testimonials, are OPINION not established fact

For contested claims, evaluate the QUALITY of counter-evidence:
- Political criticism without data → opinion (full weight kept)
- Documented counter-evidence → established (reduced weight)
```

---

## Phase 2: Schema Updates (1-2 hours)

### Files to Modify

Check schema files in `apps/web/src/lib/analyzer/types.ts` or related schema definitions.

### 1. Add `sourceAuthority` to EvidenceItem/ExtractedFact

```typescript
sourceAuthority: z.enum(["primary", "secondary", "opinion"]).optional()
```

### 2. Add `evidenceBasis` to EvidenceItem/ExtractedFact

```typescript
evidenceBasis: z.enum([
  "scientific",      // Peer-reviewed studies, established science
  "documented",      // Official records, audits, legal findings
  "anecdotal",       // Testimonials, personal accounts
  "theoretical",     // Logical arguments without empirical support
  "pseudoscientific" // Contradicts established science
]).optional()
```

### 3. Add `evidenceQuality` aggregation to ClaimVerdict

```typescript
evidenceQuality: z.object({
  // Distribution (transparent audit trail)
  scientificCount: z.number(),
  documentedCount: z.number(),
  anecdotalCount: z.number(),
  theoreticalCount: z.number(),
  pseudoscientificCount: z.number(),

  // Weighted quality score (0-100)
  // Weights: scientific=100, documented=80, theoretical=40, anecdotal=30, pseudoscientific=0
  weightedQuality: z.number(),

  // Strongest evidence type present (for quick filtering)
  strongestBasis: z.enum(["scientific", "documented", "theoretical", "anecdotal", "pseudoscientific"]),

  // Evidence diversity (0-1, higher = more diverse evidence types)
  diversity: z.number()
}).optional()
```

### 4. Verify Existing Fields

Confirm these fields already exist (should be present):
- `KeyFactor.factualBasis: z.enum(["established", "disputed", "opinion", "unknown"])`
- `Claim.harmPotential: z.enum(["high", "medium", "low"]).optional()`
- `ClaimVerdict.isContested: z.boolean()`
- `ClaimVerdict.factualBasis`
- `ClaimVerdict.contestedBy: z.string().optional()`

---

## Phase 3: Quick Automated Validation (0.5 hours)

**Purpose:** Replace manual validation with quick automated checks before pattern removal.

### Automated Tests to Run:

1. **Build Check:**
   ```bash
   npm -w apps/web run build
   ```
   Must pass with no errors (existing warnings OK)

2. **Type Check:**
   ```bash
   npm -w apps/web run type-check
   ```
   (If available) Must pass

3. **Existing Test Suite:**
   ```bash
   npm -w apps/web run test
   ```
   (If available) Existing tests must still pass

4. **Quick Smoke Test:**
   - Start dev server: `npm -w apps/web run dev`
   - Verify: Server starts without runtime errors
   - Check: No console errors related to schema changes

### Validation Checklist:

- [ ] Build passes
- [ ] TypeScript compiles
- [ ] Existing tests pass (if any)
- [ ] Dev server starts without errors
- [ ] No schema validation errors in console

**If any checks fail:** Fix issues before proceeding to Phase 4

---

## Phase 4: Pattern Code Removal (2-3 hours)

**Purpose:** Remove all pattern-based classification logic and trust LLM classifications.

### Files to Modify:

#### 1. `apps/web/src/lib/analyzer/aggregation.ts`

**Remove `validateContestation()` pattern logic:**
- Find function `validateContestation()`
- Remove pattern-matching logic (documentedEvidenceKeywords, opinionSourcePatterns)
- Replace with: trust LLM-provided `factualBasis` value
- Fallback: If LLM didn't provide value, use `"unknown"`

**Remove `detectClaimContestation()` function:**
- Find and remove entire `detectClaimContestation()` function
- Remove all calls to this function
- Ensure LLM-provided `isContested` and `factualBasis` are used instead

**Remove `detectHarmPotential()` function:**
- Find and remove entire `detectHarmPotential()` function
- Remove all calls to this function
- Ensure LLM-provided `harmPotential` is used instead

**Remove opinionSourcePatterns logic:**
- Remove pattern checks for "executive order", "dissenting", etc.
- Trust LLM-provided `sourceAuthority` classification

#### 2. `apps/web/src/lib/analyzer/orchestrated.ts`

**Remove pseudoscience detection functions:**
- Remove `detectPseudoscience()` function entirely
- Remove `escalatePseudoscienceVerdict()` function
- Remove `calculateArticleVerdictWithPseudoscience()` function
- Remove all calls to these functions
- Trust LLM-provided `evidenceBasis` classification

#### 3. Clean up imports and unused code

- Remove unused imports related to removed functions
- Remove unused lexicon pattern imports
- Ensure no dead code remains

### Testing After Phase 4:

Run same checks as Phase 3:
```bash
npm -w apps/web run build
npm -w apps/web run test  # if available
```

### Success Criteria:

- [ ] All pattern functions removed
- [ ] No calls to removed functions remain
- [ ] Build passes
- [ ] Existing tests pass
- [ ] No TypeScript errors
- [ ] No runtime errors

---

## Git Commit

**After Phase 4 completes successfully:**

```bash
git add .
git commit -m "$(cat <<'EOF'
feat: migrate from pattern-based to LLM-based classification

- Phase 1: Enhanced prompts with classification guidance (factualBasis, harmPotential, sourceAuthority, evidenceBasis)
- Phase 2: Added schema fields (sourceAuthority, evidenceBasis, evidenceQuality)
- Phase 4: Removed pattern-based logic (validateContestation, detectClaimContestation, detectHarmPotential, detectPseudoscience)

LLM now handles all semantic classifications. Pattern-based logic fully removed.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Final Success Criteria (All Phases)

- [ ] All 4 prompts updated with classification guidance
- [ ] Prompts include positive examples (✅) and negative examples (❌)
- [ ] All schema fields added (sourceAuthority, evidenceBasis, evidenceQuality)
- [ ] TypeScript compiles with no errors
- [ ] Build passes: `npm -w apps/web run build`
- [ ] All pattern functions removed (validateContestation, detectClaimContestation, detectHarmPotential, detectPseudoscience)
- [ ] No calls to removed functions remain
- [ ] Existing tests pass (if any)
- [ ] Changes committed to git

---

## Important Notes

1. **DO remove pattern-based logic** - Phase 4 removes all patterns
2. **DO NOT add real-world named examples** - use generic placeholders only
3. **Preserve existing terminology** - "AnalysisContext" not "scope" for top-level frames
4. **All new fields MUST be optional** - ensures backward compatibility
5. **Test after each phase** - run build to catch issues early
6. **Fallback strategy:** If LLM fails to provide a classification, use `"unknown"` as safe default

---

## Reference Documentation

- Full migration plan: `Docs/WIP/lexicon-to-llm-migration.md`
- See sections 1-6 for detailed prompt enhancements and examples
- See section 4 for evidenceQuality schema details

---

**Expected Outcome:** Complete migration to LLM-based classification with pattern code removed and changes committed.
