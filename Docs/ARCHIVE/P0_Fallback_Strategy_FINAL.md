# P0: Fallback Strategy (Final Specification)

**Date:** 2026-02-03
**Priority:** P0 (Critical)
**Effort:** 3-4 hours
**Principle:** No pattern-based intelligence - only null-checking, safe defaults, and transparent reporting

---

## Objectives

1. **Prevent runtime errors** when LLM fails to provide classification fields
2. **Use safe defaults** (no pattern-based intelligence)
3. **Track and report fallbacks** so users know when LLM failed to classify
4. **Enable monitoring** of LLM reliability over time

---

## Core Principle

**The LLM makes ALL intelligent decisions. Fallbacks are NOT intelligent - they're defensive programming.**

When LLM fails to classify:
1. Use a safe, neutral default value
2. Log the failure with context
3. **Report the fallback to the user** in the analysis results
4. Track fallback metrics for monitoring

**NO pattern matching. NO lexicon lookups. NO intelligent decisions.**

---

## Implementation

### Part 1: Fallback Tracking System

**Create:** `apps/web/src/lib/analyzer/classification-fallbacks.ts`

```typescript
/**
 * Classification Fallback Tracker
 * Records when LLM fails to classify and fallbacks are used
 */

export interface ClassificationFallback {
  field: 'harmPotential' | 'factualBasis' | 'sourceAuthority' | 'evidenceBasis' | 'isContested';
  location: string; // e.g., "Claim #2", "KeyFactor #5", "Evidence #3"
  text: string; // The text that couldn't be classified
  defaultUsed: string; // The default value used
  reason: 'missing' | 'invalid' | 'llm_error';
}

export interface FallbackSummary {
  totalFallbacks: number;
  fallbacksByField: {
    harmPotential: number;
    factualBasis: number;
    sourceAuthority: number;
    evidenceBasis: number;
    isContested: number;
  };
  fallbackDetails: ClassificationFallback[];
}

export class FallbackTracker {
  private fallbacks: ClassificationFallback[] = [];

  recordFallback(fallback: ClassificationFallback): void {
    this.fallbacks.push(fallback);
  }

  getSummary(): FallbackSummary {
    const summary: FallbackSummary = {
      totalFallbacks: this.fallbacks.length,
      fallbacksByField: {
        harmPotential: 0,
        factualBasis: 0,
        sourceAuthority: 0,
        evidenceBasis: 0,
        isContested: 0
      },
      fallbackDetails: this.fallbacks
    };

    // Count by field
    this.fallbacks.forEach(fb => {
      summary.fallbacksByField[fb.field]++;
    });

    return summary;
  }

  hasFallbacks(): boolean {
    return this.fallbacks.length > 0;
  }
}
```

---

### Part 2: Fallback Functions (No Pattern Intelligence)

**Add to:** `apps/web/src/lib/analyzer/orchestrated.ts`

```typescript
import { FallbackTracker, ClassificationFallback } from './classification-fallbacks';
import { Logger } from '@/lib/logger';

/**
 * Get factualBasis with safe default fallback
 * NO PATTERN MATCHING - just null-checking
 */
function getFactualBasisWithFallback(
  llmValue: string | undefined,
  keyFactorText: string,
  keyFactorIndex: number,
  tracker: FallbackTracker
): "established" | "disputed" | "opinion" | "unknown" {
  const validValues = ["established", "disputed", "opinion", "unknown"];

  // LLM provided valid value → use it
  if (llmValue && validValues.includes(llmValue)) {
    return llmValue as any;
  }

  // LLM failed → use safe default
  const reason = !llmValue ? 'missing' : 'invalid';
  const defaultValue = "unknown"; // Most conservative default

  tracker.recordFallback({
    field: 'factualBasis',
    location: `KeyFactor #${keyFactorIndex + 1}`,
    text: keyFactorText.substring(0, 100), // First 100 chars
    defaultUsed: defaultValue,
    reason
  });

  Logger.warn('LLM classification fallback', {
    field: 'factualBasis',
    keyFactorIndex,
    llmValue,
    defaultUsed: defaultValue,
    reason
  });

  return defaultValue;
}

/**
 * Get harmPotential with safe default fallback
 * NO PATTERN MATCHING - just null-checking
 */
function getHarmPotentialWithFallback(
  llmValue: string | undefined,
  claimText: string,
  claimIndex: number,
  tracker: FallbackTracker
): "high" | "medium" | "low" {
  const validValues = ["high", "medium", "low"];

  // LLM provided valid value → use it
  if (llmValue && validValues.includes(llmValue)) {
    return llmValue as any;
  }

  // LLM failed → use safe default
  const reason = !llmValue ? 'missing' : 'invalid';
  const defaultValue = "medium"; // Neutral default

  tracker.recordFallback({
    field: 'harmPotential',
    location: `Claim #${claimIndex + 1}`,
    text: claimText.substring(0, 100),
    defaultUsed: defaultValue,
    reason
  });

  Logger.warn('LLM classification fallback', {
    field: 'harmPotential',
    claimIndex,
    llmValue,
    defaultUsed: defaultValue,
    reason
  });

  return defaultValue;
}

/**
 * Get sourceAuthority with safe default fallback
 * NO PATTERN MATCHING - just null-checking
 */
function getSourceAuthorityWithFallback(
  llmValue: string | undefined,
  evidenceText: string,
  evidenceIndex: number,
  tracker: FallbackTracker
): "primary" | "secondary" | "opinion" | "contested" {
  const validValues = ["primary", "secondary", "opinion", "contested"];

  // LLM provided valid value → use it
  if (llmValue && validValues.includes(llmValue)) {
    return llmValue as any;
  }

  // LLM failed → use safe default
  const reason = !llmValue ? 'missing' : 'invalid';
  const defaultValue = "secondary"; // Neutral default

  tracker.recordFallback({
    field: 'sourceAuthority',
    location: `Evidence #${evidenceIndex + 1}`,
    text: evidenceText.substring(0, 100),
    defaultUsed: defaultValue,
    reason
  });

  Logger.warn('LLM classification fallback', {
    field: 'sourceAuthority',
    evidenceIndex,
    llmValue,
    defaultUsed: defaultValue,
    reason
  });

  return defaultValue;
}

/**
 * Get evidenceBasis with safe default fallback
 * NO PATTERN MATCHING - just null-checking
 */
function getEvidenceBasisWithFallback(
  llmValue: string | undefined,
  evidenceText: string,
  evidenceIndex: number,
  tracker: FallbackTracker
): "scientific" | "documented" | "anecdotal" | "theoretical" | "pseudoscientific" {
  const validValues = ["scientific", "documented", "anecdotal", "theoretical", "pseudoscientific"];

  // LLM provided valid value → use it
  if (llmValue && validValues.includes(llmValue)) {
    return llmValue as any;
  }

  // LLM failed → use safe default
  const reason = !llmValue ? 'missing' : 'invalid';
  const defaultValue = "anecdotal"; // Conservative default (weakest documented evidence)

  tracker.recordFallback({
    field: 'evidenceBasis',
    location: `Evidence #${evidenceIndex + 1}`,
    text: evidenceText.substring(0, 100),
    defaultUsed: defaultValue,
    reason
  });

  Logger.warn('LLM classification fallback', {
    field: 'evidenceBasis',
    evidenceIndex,
    llmValue,
    defaultUsed: defaultValue,
    reason
  });

  return defaultValue;
}

/**
 * Get isContested with safe default fallback
 * NO PATTERN MATCHING - just null-checking
 */
function getIsContestedWithFallback(
  llmValue: boolean | undefined,
  keyFactorText: string,
  keyFactorIndex: number,
  tracker: FallbackTracker
): boolean {
  // LLM provided valid boolean → use it
  if (typeof llmValue === 'boolean') {
    return llmValue;
  }

  // LLM failed → use safe default
  const defaultValue = false; // Conservative default (don't penalize without evidence)

  tracker.recordFallback({
    field: 'isContested',
    location: `KeyFactor #${keyFactorIndex + 1}`,
    text: keyFactorText.substring(0, 100),
    defaultUsed: String(defaultValue),
    reason: 'missing'
  });

  Logger.warn('LLM classification fallback', {
    field: 'isContested',
    keyFactorIndex,
    llmValue,
    defaultUsed: defaultValue,
    reason: 'missing'
  });

  return defaultValue;
}
```

---

### Part 3: Integration into Analysis Pipeline

**Modify:** `apps/web/src/lib/analyzer/orchestrated.ts`

```typescript
import { FallbackTracker } from './classification-fallbacks';

export async function analyzeArticle(
  article: Article,
  options?: AnalysisOptions
): Promise<AnalysisResult> {
  // Initialize fallback tracker
  const fallbackTracker = new FallbackTracker();

  try {
    // ... existing analysis logic ...

    // ===== AFTER CLAIM EXTRACTION =====
    // Normalize claims with fallback tracking
    const normalizedClaims = claims.map((claim, index) => ({
      ...claim,
      harmPotential: getHarmPotentialWithFallback(
        claim.harmPotential,
        claim.text,
        index,
        fallbackTracker
      )
    }));

    // ===== AFTER KEYFACTOR EXTRACTION =====
    // Normalize KeyFactors with fallback tracking
    const normalizedKeyFactors = keyFactors.map((kf, index) => ({
      ...kf,
      factualBasis: getFactualBasisWithFallback(
        kf.factualBasis,
        kf.text,
        index,
        fallbackTracker
      ),
      isContested: getIsContestedWithFallback(
        kf.isContested,
        kf.text,
        index,
        fallbackTracker
      ),
      contestedBy: kf.contestedBy ?? "" // Simple null-coalescing for string
    }));

    // ===== AFTER EVIDENCE EXTRACTION =====
    // Normalize evidence with fallback tracking
    const normalizedEvidence = evidence.map((ev, index) => ({
      ...ev,
      sourceAuthority: getSourceAuthorityWithFallback(
        ev.sourceAuthority,
        ev.text,
        index,
        fallbackTracker
      ),
      evidenceBasis: getEvidenceBasisWithFallback(
        ev.evidenceBasis,
        ev.text,
        index,
        fallbackTracker
      )
    }));

    // ... continue with normalized data ...

    // ===== AT END OF ANALYSIS =====
    // Include fallback summary in result
    const result: AnalysisResult = {
      // ... existing fields ...
      classificationFallbacks: fallbackTracker.getSummary()
    };

    // Log summary if fallbacks occurred
    if (fallbackTracker.hasFallbacks()) {
      const summary = fallbackTracker.getSummary();
      Logger.warn('Analysis completed with classification fallbacks', {
        articleId: article.id,
        totalFallbacks: summary.totalFallbacks,
        fallbacksByField: summary.fallbacksByField
      });
    }

    return result;

  } catch (error) {
    // Include fallback info even in error cases
    Logger.error('Analysis failed', {
      error,
      fallbacksOccurred: fallbackTracker.hasFallbacks(),
      fallbackCount: fallbackTracker.getSummary().totalFallbacks
    });
    throw error;
  }
}
```

---

### Part 4: Update Type Definitions

**Modify:** `apps/web/src/lib/analyzer/types.ts`

```typescript
import { FallbackSummary } from './classification-fallbacks';

export interface AnalysisResult {
  // ... existing fields ...

  /**
   * Classification fallbacks used during analysis
   * Present when LLM failed to classify and defaults were used
   * Enables transparency and monitoring of LLM reliability
   */
  classificationFallbacks?: FallbackSummary;
}
```

---

### Part 5: Report Formatting

**Create:** `apps/web/src/lib/analyzer/format-fallback-report.ts`

```typescript
import { FallbackSummary } from './classification-fallbacks';

/**
 * Format fallback summary for display in analysis reports
 */
export function formatFallbackReport(summary: FallbackSummary): string {
  if (summary.totalFallbacks === 0) {
    return ''; // No fallbacks occurred
  }

  const lines: string[] = [];

  lines.push('## ⚠️ Classification Fallbacks');
  lines.push('');
  lines.push(`The LLM failed to classify ${summary.totalFallbacks} field(s). Safe defaults were used:`);
  lines.push('');

  // Summary by field
  lines.push('### Fallbacks by Field');
  lines.push('');
  Object.entries(summary.fallbacksByField)
    .filter(([_, count]) => count > 0)
    .forEach(([field, count]) => {
      lines.push(`- **${field}**: ${count} fallback${count > 1 ? 's' : ''}`);
    });

  lines.push('');
  lines.push('### Details');
  lines.push('');

  // Group by field for better readability
  const byField = new Map<string, typeof summary.fallbackDetails>();
  summary.fallbackDetails.forEach(fb => {
    if (!byField.has(fb.field)) {
      byField.set(fb.field, []);
    }
    byField.get(fb.field)!.push(fb);
  });

  byField.forEach((fallbacks, field) => {
    lines.push(`#### ${field}`);
    lines.push('');
    fallbacks.forEach(fb => {
      lines.push(`- **${fb.location}**: "${fb.text.substring(0, 80)}${fb.text.length > 80 ? '...' : ''}"`);
      lines.push(`  - Reason: ${fb.reason === 'missing' ? 'LLM did not provide value' : 'Invalid value provided'}`);
      lines.push(`  - Default used: \`${fb.defaultUsed}\``);
      lines.push('');
    });
  });

  lines.push('---');
  lines.push('');
  lines.push('**Note:** Fallbacks indicate LLM reliability issues. If fallbacks occur frequently, review LLM prompts or increase timeout/retry limits.');
  lines.push('');

  return lines.join('\n');
}

/**
 * Format fallback summary for JSON API responses
 */
export function formatFallbackReportJSON(summary: FallbackSummary) {
  return {
    hasFallbacks: summary.totalFallbacks > 0,
    totalFallbacks: summary.totalFallbacks,
    fallbacksByField: summary.fallbacksByField,
    details: summary.fallbackDetails.map(fb => ({
      field: fb.field,
      location: fb.location,
      textSnippet: fb.text.substring(0, 100),
      defaultUsed: fb.defaultUsed,
      reason: fb.reason
    }))
  };
}
```

---

### Part 6: Display in Admin UI

**Create:** `apps/web/src/components/FallbackReport.tsx`

```tsx
import { FallbackSummary } from '@/lib/analyzer/classification-fallbacks';

interface FallbackReportProps {
  summary: FallbackSummary;
}

export function FallbackReport({ summary }: FallbackReportProps) {
  if (summary.totalFallbacks === 0) {
    return null; // Don't show anything if no fallbacks
  }

  return (
    <div className="fallback-report border-l-4 border-yellow-500 bg-yellow-50 p-4 my-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">
            Classification Fallbacks Occurred
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              The LLM failed to classify {summary.totalFallbacks} field(s).
              Safe defaults were used to ensure analysis completion.
            </p>
          </div>

          {/* Fallbacks by field */}
          <div className="mt-4">
            <h4 className="text-sm font-medium text-yellow-800">By Field:</h4>
            <ul className="mt-2 space-y-1 text-sm text-yellow-700">
              {Object.entries(summary.fallbacksByField)
                .filter(([_, count]) => count > 0)
                .map(([field, count]) => (
                  <li key={field}>
                    <strong>{field}:</strong> {count} fallback{count > 1 ? 's' : ''}
                  </li>
                ))}
            </ul>
          </div>

          {/* Details accordion */}
          <details className="mt-4">
            <summary className="text-sm font-medium text-yellow-800 cursor-pointer">
              View Details ({summary.fallbackDetails.length} items)
            </summary>
            <div className="mt-2 space-y-3">
              {summary.fallbackDetails.map((fb, index) => (
                <div key={index} className="p-2 bg-yellow-100 rounded text-xs">
                  <div><strong>{fb.field}</strong> at {fb.location}</div>
                  <div className="mt-1 text-gray-600">"{fb.text.substring(0, 80)}..."</div>
                  <div className="mt-1">
                    <span className="font-medium">Reason:</span> {
                      fb.reason === 'missing' ? 'LLM did not provide value' : 'Invalid value'
                    }
                  </div>
                  <div>
                    <span className="font-medium">Default used:</span> <code>{fb.defaultUsed}</code>
                  </div>
                </div>
              ))}
            </div>
          </details>

          <div className="mt-4 text-xs text-yellow-600">
            <strong>Note:</strong> Frequent fallbacks indicate LLM reliability issues.
            Consider reviewing prompts or adjusting timeout/retry settings.
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Safe Default Values Reference

| Field | Default Value | Reasoning |
|-------|--------------|-----------|
| `factualBasis` | `"unknown"` | Most conservative - doesn't assume evidence quality |
| `harmPotential` | `"medium"` | Neutral - not dismissive (low) or alarmist (high) |
| `sourceAuthority` | `"secondary"` | Neutral - not trusted primary, not dismissed opinion |
| `evidenceBasis` | `"anecdotal"` | Conservative - weakest form of documented evidence |
| `isContested` | `false` | Conservative - don't penalize without evidence of contestation |
| `contestedBy` | `""` | Empty string - no contestation assumed |

**All defaults are non-intelligent, defensive choices.**

---

## Testing

**Create:** `apps/web/test/unit/lib/analyzer/classification-fallbacks.test.ts`

```typescript
import { describe, test, expect } from 'vitest';
import { FallbackTracker } from '@/lib/analyzer/classification-fallbacks';
import {
  getFactualBasisWithFallback,
  getHarmPotentialWithFallback
} from '@/lib/analyzer/orchestrated';

describe('Classification Fallbacks', () => {
  test('factualBasis defaults to unknown when missing', () => {
    const tracker = new FallbackTracker();
    const result = getFactualBasisWithFallback(undefined, 'Some claim', 0, tracker);

    expect(result).toBe('unknown');
    expect(tracker.hasFallbacks()).toBe(true);
    expect(tracker.getSummary().totalFallbacks).toBe(1);
    expect(tracker.getSummary().fallbacksByField.factualBasis).toBe(1);
  });

  test('factualBasis uses LLM value when valid', () => {
    const tracker = new FallbackTracker();
    const result = getFactualBasisWithFallback('established', 'Some claim', 0, tracker);

    expect(result).toBe('established');
    expect(tracker.hasFallbacks()).toBe(false);
  });

  test('harmPotential defaults to medium when missing', () => {
    const tracker = new FallbackTracker();
    const result = getHarmPotentialWithFallback(undefined, 'Some claim', 0, tracker);

    expect(result).toBe('medium');
    expect(tracker.hasFallbacks()).toBe(true);
  });

  test('fallback summary includes details', () => {
    const tracker = new FallbackTracker();

    getFactualBasisWithFallback(undefined, 'Claim 1', 0, tracker);
    getHarmPotentialWithFallback(undefined, 'Claim 2', 1, tracker);

    const summary = tracker.getSummary();
    expect(summary.totalFallbacks).toBe(2);
    expect(summary.fallbackDetails.length).toBe(2);
    expect(summary.fallbackDetails[0].field).toBe('factualBasis');
    expect(summary.fallbackDetails[1].field).toBe('harmPotential');
  });

  test('invalid values trigger fallback', () => {
    const tracker = new FallbackTracker();
    const result = getFactualBasisWithFallback('invalid_value', 'Some claim', 0, tracker);

    expect(result).toBe('unknown');
    expect(tracker.hasFallbacks()).toBe(true);
    expect(tracker.getSummary().fallbackDetails[0].reason).toBe('invalid');
  });
});
```

---

## Success Criteria

- [ ] All classification fields have defined values (no `undefined`)
- [ ] Fallback tracker captures all fallback events
- [ ] Fallback summary included in `AnalysisResult`
- [ ] Fallback report visible in admin UI
- [ ] Fallback details show: field, location, text snippet, default used, reason
- [ ] Logger captures all fallback events
- [ ] Tests pass for all fallback scenarios
- [ ] Build passes with new types

---

## Monitoring & Alerting

After deployment, monitor fallback rates:

```typescript
// Add to telemetry/monitoring
const fallbackRate = (totalFallbacks / totalClassifications) * 100;

if (fallbackRate > 5%) {
  // Alert: LLM reliability below threshold
  alertOps(`High fallback rate: ${fallbackRate.toFixed(2)}%`);
}
```

**Healthy system:** < 5% fallback rate
**Investigate if:** > 10% fallback rate
**Critical issue if:** > 20% fallback rate

---

## Example Output

### In Analysis Report (Markdown)

```markdown
## ⚠️ Classification Fallbacks

The LLM failed to classify 3 field(s). Safe defaults were used:

### Fallbacks by Field

- **harmPotential**: 2 fallbacks
- **factualBasis**: 1 fallback

### Details

#### harmPotential

- **Claim #2**: "This policy will impact thousands of small businesses..."
  - Reason: LLM did not provide value
  - Default used: `medium`

- **Claim #5**: "The regulation causes financial hardship..."
  - Reason: LLM did not provide value
  - Default used: `medium`

#### factualBasis

- **KeyFactor #3**: "Critics argue the decision was politically motivated..."
  - Reason: LLM did not provide value
  - Default used: `unknown`

---

**Note:** Fallbacks indicate LLM reliability issues. If fallbacks occur frequently, review LLM prompts or increase timeout/retry limits.
```

---

## Summary

**P0 implements:**
1. ✅ Null-checking and safe defaults (NO pattern intelligence)
2. ✅ Fallback tracking throughout analysis pipeline
3. ✅ Transparent reporting in analysis results
4. ✅ Admin UI display of fallback details
5. ✅ Monitoring/alerting foundation

**P0 does NOT implement:**
- ❌ Pattern-based classification
- ❌ Lexicon lookups
- ❌ Intelligent fallback decisions
- ❌ Keyword matching

**The LLM makes ALL intelligent decisions. Fallbacks are purely defensive.**
