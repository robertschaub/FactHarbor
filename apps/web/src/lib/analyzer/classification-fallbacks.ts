/**
 * Classification Fallback Tracker
 * Records when LLM fails to classify and fallbacks are used
 *
 * Purpose: Transparent reporting of LLM classification failures
 * NO PATTERN MATCHING - only null-checking and safe defaults
 */

export interface ClassificationFallback {
  field: 'harmPotential' | 'factualBasis' | 'sourceAuthority' | 'evidenceBasis' | 'isContested';
  location: string; // e.g., "Claim #2", "KeyFactor #5", "Evidence #3"
  text: string; // The text that couldn't be classified (first 100 chars)
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
