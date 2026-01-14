# Coding Guidelines for FactHarbor

This document provides guidelines for developers working on FactHarbor. These principles should be followed to maintain code quality, consistency, and adherence to the project's goals.

---

## Core Principles

### 1. Generic by Design

**Rule**: Code, prompts, and logic must work for ANY topic, not just specific domains.

**Do NOT**:
- Hardcode domain-specific keywords like `['bolsonaro', 'trump', 'vaccine']`
- Use topic-specific prompts or conditions
- Create special cases for particular events or people

**Example violations to avoid**:
```typescript
// BAD - Domain-specific keywords
const keywords = ['trial', 'judgment', 'bolsonaro', 'putin', 'trump'];

// BAD - Specific outcome detection
const isHighImpactOutcome =
    hay.includes("sentenced") ||
    hay.includes("convicted") ||
    hay.includes("27-year sentence");

// GOOD - Generic patterns
const hasLegalTerminology = detectDomainPatterns(text, 'legal');
const hasSpecificOutcome = extractNumericClaims(text);
```

**Instead**:
- Use parameterization and configuration
- Detect patterns generically
- Let the LLM identify domain-specific elements dynamically

### 2. Input Neutrality

**Rule**: Input phrasing must NOT affect analysis depth, research, or verdict. A yes/no phrased input (“Was X…?”) must behave the same as the equivalent statement (“X was …”).

**Hard requirements**:
- **No separate analysis paths**: There must be **zero branching** in analysis logic based on whether the user wrote a question or a statement.
- **Entry-point normalization**: If input is yes/no phrasing (including trailing `?`), convert to an **affirmative statement** **before any analysis stage runs**.
- **Single canonical analysis string**: All analysis steps (scope detection, research, fact extraction, verdict generation, weighting, quality gates, inversion correction) must use the **normalized statement** only.
- **Raw input is UI-only**: Preserve the original input (question or statement) **only for display**. It must not influence LLM prompts, research queries, scope splitting, or scoring.
- **No question-specific metadata**: Do not emit or persist flags/fields such as `wasQuestionInput`, `questionBeingAsked`, `questionIntent`, `QuestionAnswer`, `calculateQuestionTruthPercentage`, etc.
- **UI neutrality**: UI must not show question badges/labels or question-specific layouts. The same components and result fields must be used regardless of phrasing.
- **Equivalence guarantee**: For meaning-equivalent inputs, verdict and reasoning must be effectively identical; any drift should be **<1%** and treated as a regression.

**Implementation guidance**:
- Normalize to statements **at the earliest entry point** to guarantee full neutrality.
- Use a single variable (e.g., `analysisInput`) as the canonical input for all downstream logic and LLM calls.
- Store the original input in a dedicated display-only field (e.g., `originalInputDisplay`) for UI rendering.

### 3. Pipeline Integrity

**Rule**: All pipeline stages must execute, no skipping allowed.

**Required Stages**:
1. **Understand** → Extract claims, detect scope, assign risk tiers
2. **Research** → Web search, fetch sources, extract facts
3. **Verdict** → Generate verdicts, apply quality gates
4. **Summary** → Format results
5. **Report** → Generate markdown

**Do NOT**:
- Skip research phase for "easy" claims
- Skip quality gates for "obvious" facts
- Short-circuit verdict generation

### 4. Evidence Transparency

**Rule**: Every verdict must cite supporting or opposing facts.

**Requirements**:
- Track `supportingFactIds` for each verdict
- Include counter-evidence (criticism category)
- Show evidence sources with excerpts
- Display quality gate decisions with reasons

**Implementation**:
```typescript
// GOOD - Track evidence explicitly
verdict.supportingFactIds = facts
  .filter(f => supportsVerdict(f, claim))
  .map(f => f.id);

// Count counter-evidence
const counterEvidence = facts.filter(f => 
  f.category === "criticism" && 
  relatesToClaim(f, claim)
).length;
```

### 5. Scope Detection

**Rule**: Detect and analyze distinct scopes (contexts) independently.

**Scope Definition**:
- A bounded analytical frame with:
  - Defined boundaries (what's included/excluded)
  - Methodology (how analysis is done)
  - Temporal period (when)
  - Subject matter (what)

**Examples of Distinct Scopes**:
- Different legal proceedings (Trial A vs. Trial B)
- Different methodological approaches (Study 1 vs. Study 2)
- Different temporal periods (2020 events vs. 2024 events)
- Different regulatory frameworks (US law vs. EU law)

**NOT Distinct Scopes**:
- Different perspectives on same event ("US view" vs. "Brazil view")
- Different claims within same event
- Different sources reporting same facts

---

## Code Quality Standards

### Testing Requirements

**After each significant change**:
1. Run automated tests without manual intervention
2. Re-test recent analysis inputs (regression tests)
3. Use Swagger to investigate API behavior
4. Review `apps/web/debug-analyzer.log` for issues
5. Analyze reports for correctness
6. Check that earlier issues are not re-introduced
7. Search for other issues, flaws, inconsistencies
8. Report findings to `.md` file
9. Fix issues automatically where possible

**Test Cases to Always Verify**:
- Bolsonaro trial inputs (question and statement forms)
- Hydrogen vs Electric Cars article
- PDF article analysis
- Venezuela article
- Any input with recent events (date awareness)

### Logging and Debugging

**Local Development**:
- Debug code and detailed logging are acceptable
- Use environment checks for debug-only code:
  ```typescript
  if (process.env.NODE_ENV === 'development') {
    // Debug code here
  }
  ```

**Production**:
- Remove or disable debug endpoints
- Remove debug logging calls
- No hardcoded debug URLs (e.g., `fetch('http://127.0.0.1:7242')`)

### Performance

**Responsiveness Requirements**:
- Job queuing should not block UI
- Analyze button should not be disabled for long periods
- Even with 3-4 running jobs, new submissions should queue quickly
- Progress updates should appear in real-time

**Optimization**:
- Use parallel fetching where possible
- Implement timeout limits (5s per source fetch)
- Use exponential backoff for retries
- Cache static data (source reliability bundles)

---

## UI/UX Consistency

### Labeling Standards

**Rule**: Titles and labels must match underlying content.

**Requirements**:
- "Article Summary" → Must contain actual article summary
- "Verdict" → Must show verdict name (according to Scale Mapping) and verdict value 
- "Confidence" → Must be confidence in the verdict (0-100%)
- Labels should be human-readable (not code identifiers)

**Format Consistency**:
```
// GOOD - Unified format
✓ Mostly True 82% (80% confidence)

// BAD - Inconsistent format
Verdict: Mostly True
Confidence: 80
Truth: 82%
```

### Layout Standards

**Article Box Contents** (all in one box):
- Article Summary (the actual summary text)
- Verdict (7-point scale + truth % + confidence %)
- Key Factors (if applicable)
- Assessment (overall analysis)

**Never Show These**:
- "Implied Claim" (redundant with summary)
- "Question asked" (redundant with Input)
- Methodology validation claims (low value)

**Unified Naming**:
- Use "Verdict" everywhere (not "Overall Verdict" or "Article Verdict")
- Use "Contexts" (AnalysisContexts) instead of "Context-by-Context Analysis" or "Scope-by-Scope Analysis"
- Use "Confidence" (not "Conf" or "Certainty")

### Multi-Context Display

**Rule**: Use same layout for single-context and multi-context reports.

**Implementation**:
- Multi-context: Show contexts in rows (not columns)
- Single-context: Use same structure, omit context headers
- Support 2+ contexts (not just 2)

---

## Data Model Standards

### Verdict Scale

**Use**: 7-point scale with numeric truth percentage (0-100%)

**Scale Mapping**:
- **TRUE**: 86-100% (Score +3)
- **MOSTLY-TRUE**: 72-85% (Score +2)
- **LEANING-TRUE**: 58-71% (Score +1)
- **MIXED**: 43-57% with confidence ≥60% (Score 0)
- **UNVERIFIED**: 43-57% with confidence <60% (Score 0)
- **LEANING-FALSE**: 29-42% (Score -1)
- **MOSTLY-FALSE**: 15-28% (Score -2)
- **FALSE**: 0-14% (Score -3)

**Do NOT use**: Old 4-scale (WELL-SUPPORTED, PARTIALLY-SUPPORTED, UNCERTAIN, REFUTED)

### Centrality Detection


**Central Claims**:
- Core factual assertion that article depends on
- Removing it would invalidate the article's thesis

**NOT Central Claims**:
- Attribution claims ("Source S said X")
- Background context claims

**Irrelevant Claims** (do not use at all):
- Claims that validate Validation Methodology (e.g. "methodology provides an accurate framework for")

### Claim Deduplication

**Rule**: Near-duplicate claims should not fully influence verdict multiple times.

**Detection**:
- Detect extremely similar claims (>80% semantic overlap)
- Flag as duplicates
- Weight duplicates proportionally in aggregation

**Example Duplicates**:
- "Venezuelan takeover constituted theft of American property"
- "Venezuelan oil seizure was one of largest thefts of American property"

---

## Temporal Awareness

### Current Date Handling

**Rule**: LLM must be aware of current date.

**Requirements**:
- Inject current date into all prompts
- Detect and sanitize temporal errors
- Flag claims about "future" events that are actually past
- Use web search for very recent information (<6 months)

**Error Sanitization**:
```typescript
// Remove false "temporal error" comments
function sanitizeTemporalErrors(text: string): string {
  return text
    .replace(/temporal error/gi, '')
    .replace(/in the future from the current date/gi, '')
    .replace(/date discrepancy/gi, '');
}
```

---

## Prompt Engineering

### Generic Prompts

**Rule**: Prompts must work for any topic, not specific domains.

**Do**:
- Use examples from diverse domains
- Describe patterns, not specific instances
- Let LLM identify domain dynamically

**Don't hardcode in prompts or source code**:
- specific person names (Bolsonaro, Trump, etc.)
- specific event types (trials, elections, etc.)
- specific outcomes ("27-year sentence", etc.)

### Prompt Structure

**Best Practices**:
- Use clear section headers
- Use bullet points for lists
- Include 2-3 diverse examples
- State expected output format explicitly
- Include edge cases and non-examples

**Format**:
```
# Task

[Clear description]

# Requirements

- Requirement 1
- Requirement 2
- Requirement 3

# Examples

**Example 1** (Domain A):
[Input] → [Output]

**Example 2** (Domain B):
[Input] → [Output]

# Edge Cases

- [Edge case 1]: [How to handle]
- [Edge case 2]: [How to handle]

# Output Format

[JSON schema or structure description]
```

---

## Configuration and Environment

### Environment Variables

**Required**:
- LLM provider API keys (ANTHROPIC_API_KEY, etc.)
- Search provider keys (SERPAPI_API_KEY, etc.)
- Internal keys (FH_ADMIN_KEY, FH_INTERNAL_RUNNER_KEY)

**Optional**:
- Feature flags (FH_SEARCH_ENABLED, FH_DETERMINISTIC)
- Limits (FH_RUNNER_MAX_CONCURRENCY)
- Domain whitelist (FH_SEARCH_DOMAIN_WHITELIST)

**Security**:
- Never commit secrets to git
- Use `.env.local` for local development
- Use environment-specific configs for deployment
- Validate all environment variables at startup

---

## Documentation Standards

### Code Comments

**When to Comment**:
- Complex algorithms or calculations
- Non-obvious business logic
- Workarounds for known issues
- Security-critical sections
- Performance-critical sections

**When NOT to Comment**:
- Obvious code (`// Increment counter`)
- Redundant with function names
- Outdated information (remove instead)

### Documentation Files

**Keep Updated**:
- Architecture diagrams when structure changes
- Calculation formulas when logic changes
- Environment variable lists when adding new vars
- API endpoint lists when adding routes

**Archive**:
- Version-specific fix documents
- Historical analysis reports
- Deprecated design decisions

---

## References

- **AGENTS.md**: Core rules for AI coding assistants (project root)
- **Docs/ARCHITECTURE/Calculations.md**: Verdict calculation methodology
- **Docs/STATUS/Current_Status.md**: Current implementation status
- **Docs/USER_GUIDES/Getting_Started.md**: Setup and first run

---

**Last Updated**: January 2026
