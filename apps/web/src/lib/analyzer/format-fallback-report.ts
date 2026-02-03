/**
 * Fallback Report Formatter
 * Formats classification fallback summaries for display
 */

import type { FallbackSummary } from './classification-fallbacks';

/**
 * Format fallback summary as Markdown for analysis reports
 */
export function formatFallbackReportMarkdown(summary: FallbackSummary): string {
  if (summary.totalFallbacks === 0) {
    return ''; // No fallbacks occurred - nothing to report
  }

  const lines: string[] = [];

  lines.push('## Classification Fallbacks');
  lines.push('');
  lines.push(`The LLM failed to classify ${summary.totalFallbacks} field(s). Safe defaults were used.`);
  lines.push('');

  // Summary by field
  lines.push('### Summary by Field');
  lines.push('');
  lines.push('| Field | Fallbacks | Default Used |');
  lines.push('|-------|-----------|--------------|');

  const fieldDefaults: Record<string, string> = {
    harmPotential: 'medium',
    factualBasis: 'unknown',
    sourceAuthority: 'secondary',
    evidenceBasis: 'anecdotal',
    isContested: 'false'
  };

  Object.entries(summary.fallbacksByField)
    .filter(([_, count]) => count > 0)
    .forEach(([field, count]) => {
      lines.push(`| ${field} | ${count} | \`${fieldDefaults[field]}\` |`);
    });

  lines.push('');

  // Details grouped by field
  if (summary.fallbackDetails.length > 0) {
    lines.push('### Details');
    lines.push('');

    // Group by field
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
        const textSnippet = fb.text.length > 60 ? fb.text.substring(0, 60) + '...' : fb.text;
        lines.push(`- **${fb.location}**: "${textSnippet}"`);
        const reasonText =
          fb.reason === 'missing'
            ? 'LLM did not provide value'
            : fb.reason === 'llm_error'
              ? 'LLM error during classification'
              : 'Invalid value provided';
        lines.push(`  - Reason: ${reasonText}`);
        lines.push(`  - Default: \`${fb.defaultUsed}\``);
      });
      lines.push('');
    });
  }

  // Note about what this means
  lines.push('---');
  lines.push('');
  lines.push('*Fallbacks indicate LLM classification gaps. If frequent, review prompts or increase timeout.*');
  lines.push('');

  return lines.join('\n');
}

/**
 * Format fallback summary as JSON for API responses
 */
export function formatFallbackReportJSON(summary: FallbackSummary) {
  if (summary.totalFallbacks === 0) {
    return null;
  }

  return {
    hasFallbacks: true,
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

/**
 * Format a brief one-line summary for logs
 */
export function formatFallbackOneLiner(summary: FallbackSummary): string {
  if (summary.totalFallbacks === 0) {
    return '';
  }

  const fields = Object.entries(summary.fallbacksByField)
    .filter(([_, count]) => count > 0)
    .map(([field, count]) => `${field}:${count}`)
    .join(', ');

  return `[Fallbacks] ${summary.totalFallbacks} total (${fields})`;
}
