# Bug Analysis: "Doubted" Factors Incorrectly Counted as Evidence

**Date:** 2026-02-02
**Severity:** HIGH - Affects verdict accuracy
**Related Job:** 6620f24f9c7647eba4143c0315e5d256

---

## Problem Statement

Factors that are only "doubted" (baseless opinion) are being incorrectly classified as having `factualBasis: "established"` or `"disputed"`, causing them to count as evidenced negatives and reduce verdicts.

**Expected behavior:** Doubted factors should be `factualBasis: "opinion"` and NOT affect the verdict.

**Actual behavior:** Factors doubted by Justice Fux and US White House are classified as "established" evidence, reducing the verdict from expected "Mostly True" to "Leaning False".

---

## Root Cause Analysis

### Issue 1: LLM Generates Incorrect factualBasis

The verdict LLM prompt does not clearly distinguish between:
- **Evidence:** Documented findings (audit results, investigation reports, measurements)
- **Opinion:** Disagreement or criticism (dissenting opinions, political statements)

Debug log shows:
```json
{
  "factor": "Constitutional jurisdiction compliance",
  "supports": "no",
  "isContested": true,
  "contestedBy": "Justice Fux",
  "factualBasis": "established"  // WRONG - should be "opinion"
}
```

### Issue 2: validateContestation() Fails to Downgrade

The `validateContestation()` function ([aggregation.ts:72-106](apps/web/src/lib/analyzer/aggregation.ts#L72-L106)) checks for `documentedEvidenceKeywords` in the contestation text, but the keyword list is too broad.

**Current documentedEvidenceKeywords** ([config-schemas.ts:820-825](apps/web/src/lib/config-schemas.ts#L820-L825)):
```javascript
documentedEvidenceKeywords: [
  "data", "measurement", "study", "record", "document", "report",
  "investigation", "audit", "log", "dataset", "finding", "determination",
  "ruling", "documentation", "violation", "breach", "non-compliance",
  "procedure", "article", "section", "regulation", "statute",  // ❌ TOO BROAD
  "methodology", "causation", "causality", "correlation", "unverified",
  // ...
]
```

**Problem:** Words like `"ruling"`, `"procedure"`, `"article"`, `"section"` appear in ANY legal discussion, not just documented evidence.

- Justice Fux's dissent mentions "jurisdiction" and "procedure" → triggers false match
- Text about US Executive Order mentions "judicial" and "ruling" → triggers false match

---

## Evidence from Debug Log

### Factor 1: Constitutional jurisdiction compliance
```json
{
  "factor": "Constitutional jurisdiction compliance",
  "supports": "no",
  "contestedBy": "Justice Luiz Fux",
  "factualBasis": "established"  // Should be "opinion"
}
```
**Why wrongly classified:** The word "jurisdiction" or "procedure" in the explanation triggered the keyword match.

### Factor 2: Judicial impartiality
```json
{
  "factor": "Judicial impartiality",
  "supports": "no",
  "contestedBy": "White House Presidential Action",
  "factualBasis": "established"  // Should be "opinion"
}
```
**Why wrongly classified:** The US Executive Order is political criticism, not evidence. But words like "ruling" or "judicial" in the text triggered the match.

---

## Proposed Fixes

### Fix 1: Update UCM aggregation-lexicon.v1 Config (Database)

The `documentedEvidenceKeywords` is stored in UCM config type `aggregation-lexicon`, profile `default`.

**How to apply:**
1. Go to Admin UI → Config → aggregation-lexicon
2. Edit the `contestation.documentedEvidenceKeywords` array
3. Save and activate the new config

**Remove these overly broad terms:**
- `"ruling"` - appears in ANY court-related text
- `"procedure"` - describes process, not evidence
- `"article"` - legal citation format, not evidence
- `"section"` - legal citation format, not evidence
- `"determination"` - describes decisions, not evidence
- `"statute"` - describes law, not evidence
- `"regulation"` - describes rules, not evidence

**Keep terms that indicate actual findings:**
- `"audit"` - indicates actual audit findings
- `"investigation"` - indicates formal investigation
- `"measurement"` - indicates quantitative data
- `"data"` - indicates empirical evidence

**Updated UCM config value:**
```json
{
  "contestation": {
    "documentedEvidenceKeywords": [
      "data", "measurement", "metric", "statistic", "percentage",
      "audit", "investigation", "inquiry", "review found", "examination",
      "re:violation(s)? (found|documented|confirmed)",
      "re:non-compliance (found|documented|confirmed)",
      "re:breach(es)? (found|documented|confirmed)",
      "study", "dataset", "log", "record",
      "methodology", "causation", "causality", "correlation",
      "control group", "randomized", "peer-review", "replicated",
      "confound", "bias", "systematic", "meta-analysis"
    ]
  }
}
```

**Also update DEFAULT_AGGREGATION_LEXICON** in `config-schemas.ts` for new installs and default refresh:
- Location: [config-schemas.ts:820-825](apps/web/src/lib/config-schemas.ts#L820-L825)
- This ensures the fix persists if the system default is refreshed

### Fix 2: Add Opinion Indicator Patterns (New UCM Config Field)

Add a new pattern list to detect when contestation is opinion-based, even if some "evidence" words are present.

**New field: `opinionIndicatorPatterns`**
```javascript
opinionIndicatorPatterns: [
  // Dissenting opinions
  "re:dissent(ed|ing)?",
  "re:minority (opinion|view)",
  // Political criticism
  "re:(accused|accuses|accusing)",
  "re:(criticized|criticizes|criticizing)",
  "re:(alleged|alleges|alleging)",
  "re:(claimed|claims|claiming)",
  "re:(argued|argues|arguing)",
  // External government statements
  "re:(white house|executive order|presidential action)",
  "re:(foreign|external) (government|official)",
  "re:diplomatic (statement|criticism|pressure)"
]
```

### Fix 3: Update validateContestation() Logic

Modify the function to check for opinion indicators FIRST:

```typescript
export function validateContestation<T extends ContestableKeyFactor>(keyFactors: T[]): T[] {
  return keyFactors.map(kf => {
    if (kf.factualBasis === "opinion" || kf.supports !== "no") return kf;
    if (kf.factualBasis !== "established" && kf.factualBasis !== "disputed") return kf;

    const textToCheck = [
      kf.contestationReason || "",
      kf.explanation || "",
      kf.contestedBy || "",  // ADD: Check contestedBy field
      kf.factor || ""
    ].join(" ");

    // NEW: Check for opinion indicators FIRST
    const hasOpinionIndicators = matchesAnyPattern(textToCheck, _patterns.opinionIndicatorPatterns);
    if (hasOpinionIndicators) {
      return {
        ...kf,
        factualBasis: "opinion" as const,
        contestationReason: `Opinion-based contestation detected: ${kf.contestationReason || kf.explanation || "disagreement"}`
      } as T;
    }

    // THEN check for documented evidence
    const hasDocumentedEvidence = matchesAnyPattern(textToCheck, _patterns.documentedEvidenceKeywords);
    if (!hasDocumentedEvidence) {
      return {
        ...kf,
        factualBasis: "opinion" as const,
        contestationReason: `No documented counter-evidence cited: ${kf.contestationReason || kf.explanation || "general disagreement"}`
      } as T;
    }

    return kf;
  });
}
```

### Fix 4: Update Verdict Prompt (Prompt Engineering)

Add explicit guidance in the verdict prompt to classify factualBasis correctly:

```markdown
## FACTUAL_BASIS CLASSIFICATION RULES

CRITICAL: Classify factualBasis based on the TYPE of contestation, not just the SOURCE:

**"established" - ONLY when there is documented counter-evidence:**
- Audit findings that contradict the claim
- Investigation reports with specific findings
- Quantitative data showing different results
- Documented violations or breaches

**"disputed" - When experts disagree with documented reasoning:**
- Conflicting scientific studies
- Different methodological interpretations with citations
- Legal precedent arguments with case citations

**"opinion" - When contestation is based on disagreement without documented evidence:**
- Dissenting judicial opinions (even from respected judges)
- Political criticism (even from governments)
- Expert opinions without documented evidence
- Allegations without proof
- "Accused of", "criticized for", "alleged to" → ALWAYS opinion

EXAMPLES:
- "Justice Fux dissented, arguing jurisdiction was improper" → opinion (dissent = legal interpretation)
- "US White House accused of political persecution" → opinion (accusation without evidence)
- "Audit found 47 procedural violations" → established (documented finding)
```

---

## Implementation Priority

| Fix | Type | Effort | Impact | Priority |
|-----|------|--------|--------|----------|
| Fix 1: Tighten keywords | UCM DB via Admin UI | Low | High | P0 |
| Fix 2: Add opinion patterns | UCM DB + schema code | Medium | High | P0 |
| Fix 3: Update validation logic | Code (aggregation.ts) | Medium | High | P1 |
| Fix 4: Update verdict prompt | Prompt file | Medium | Medium | P2 |
| Fix 5: File-based config seeding | Architecture refactor | High | Medium | P3 |

**Immediate fix (no deploy):** Update UCM config via Admin UI
**Short-term:** Update schema to add `opinionIndicatorPatterns` field
**Long-term:** Move default configs to editable JSON files (architectural alignment)

---

## Test Cases

After implementing fixes, verify:

1. **Bolsonaro trial fairness** → Should get higher verdict (factors from Fux/US should be opinion)
2. **Any case with dissenting judicial opinions** → Dissent should be opinion, not evidence
3. **Any case with political criticism** → Political statements should be opinion
4. **Actual documented violations** → Should still be classified as established/disputed

---

## Architectural Issue: Hardcoded Default Configs

### Current State (Inconsistent)

| Config Type | Default Source | Editable Without Code? |
|-------------|----------------|------------------------|
| Prompts | `apps/web/prompts/*.prompt.md` files | Yes |
| Lexicons | `DEFAULT_*_LEXICON` in `config-schemas.ts` | No |
| Pipeline/Search/Calc | `DEFAULT_*_CONFIG` in `config-schemas.ts` | No |

**Problem:** Lexicons and other configs have their defaults hardcoded in `config-schemas.ts`, while prompts are loaded from editable files. This creates:
1. Inconsistent seeding mechanisms
2. Code changes required to modify defaults
3. Less visible version control for config defaults

### Recommended Architecture

**Principle:** Everything editable in UCM Admin UI should have its default defined in an editable file.

All seeded configs should originate from editable files, following the existing prompt pattern:

```
apps/web/configs/
├── prompts/                          # (existing, move from apps/web/prompts/)
│   ├── orchestrated.prompt.md
│   ├── monolithic-canonical.prompt.md
│   ├── monolithic-dynamic.prompt.md
│   ├── source-reliability.prompt.md
│   └── text-analysis/
│       ├── text-analysis-input.prompt.md
│       ├── text-analysis-evidence.prompt.md
│       ├── text-analysis-scope.prompt.md
│       └── text-analysis-verdict.prompt.md
├── lexicons/
│   ├── aggregation-lexicon.default.json
│   └── evidence-lexicon.default.json
├── pipeline.default.json
├── search.default.json
├── calculation.default.json
└── sr.default.json
```

**Implementation:**
1. Generalize `seedPromptFromFile()` → `seedConfigFromFile(configType, filePath)`
2. Move all `DEFAULT_*` constants from `config-schemas.ts` to JSON files
3. Update `ensureDefaultConfig()` to load from files instead of hardcoded constants
4. Schema definitions remain in code (for validation), but default VALUES come from files
5. Keep hardcoded constants only as emergency fallback if file is missing
6. **Add "Save to File" in UCM Admin UI** - allow saving edited config back to the default file

### UCM Admin UI Enhancements

The Admin Config editor should support bidirectional file sync:

| Action | Description |
|--------|-------------|
| **Load from File** | Load default config from `apps/web/configs/*.json` file |
| **Edit in UI** | Edit config in the existing UCM editor |
| **Save to DB** | Save to UCM database (existing functionality) |
| **Save to File** | Write edited config back to the default file (new) |

This allows:
- Editing defaults via Admin UI instead of manual file editing
- Committing file changes to version control
- Consistent workflow for prompts and configs

### Side Effect Mitigations

| Risk | Mitigation |
|------|------------|
| File write in prod | Only enable "Save to File" in dev mode or with explicit env flag |
| Concurrent edits | Atomic write + warn if file changed since load |
| Bad config | Auto-backup (`.bak`) before overwrite |
| Security | Restrict to config directory; validate paths |

### Admin UI Quick Wins

For immediate usability improvement when editing `documentedEvidenceKeywords`:

| Feature | Why Needed |
|---------|------------|
| **Diff view** | See what changed before saving |
| **Reset to Default** | Quick revert if something breaks |
| **Validation feedback** | Catch regex syntax errors in patterns |
| **Search in config** | Find specific keywords in large lexicons |

### Benefits
- Fix `documentedEvidenceKeywords` by editing in Admin UI and saving to file
- Consistent architecture: UCM-editable = file-editable defaults
- Better visibility in version control for all config changes
- Easier operator customization of defaults
- Single source of truth for "what's configurable"
- No need for direct file editing - use Admin UI for everything

---

## Conclusion

The bug is caused by overly broad keyword matching in `documentedEvidenceKeywords`. The fix requires:

**UCM Database Changes (no code deploy needed):**
1. Update `aggregation-lexicon` config to remove generic legal terms from `documentedEvidenceKeywords`
2. Add new `opinionIndicatorPatterns` field to detect opinion-based contestation

**Code Changes (for robustness):**
3. Update `validateContestation()` to check `contestedBy` field for known opinion sources
4. Update verdict prompt with explicit factualBasis classification guidance

**Architectural Improvement:**
5. Move default configs from hardcoded constants to editable JSON files (aligns with prompt seeding pattern)

---

*Analysis completed by Claude Code on 2026-02-02*
