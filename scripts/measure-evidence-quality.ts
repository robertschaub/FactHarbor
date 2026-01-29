/**
 * Evidence Quality Baseline Measurement Script
 *
 * Measures quality metrics for evidence extraction to validate
 * Phase 1.5 and Phase 2 improvements.
 *
 * Usage:
 *   npx tsx scripts/measure-evidence-quality.ts [job-files-dir]
 *
 * Metrics measured:
 * - probativeValue coverage and distribution
 * - claimDirection missing rate
 * - Category distribution (evidence vs direct_evidence)
 * - Evidence per source statistics
 * - EvidenceScope population rate
 * - sourceType population rate (if EvidenceScope present)
 *
 * @version 1.0
 * @date 2026-01-29
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

interface EvidenceItem {
  id: string;
  fact: string;
  category: string;
  specificity?: string;
  sourceId: string;
  sourceUrl?: string;
  sourceTitle?: string;
  sourceExcerpt: string;
  contextId?: string;
  claimDirection?: "supports" | "contradicts" | "neutral";
  evidenceScope?: {
    name: string;
    methodology?: string;
    boundaries?: string;
    geographic?: string;
    temporal?: string;
    sourceType?: string;
  };
  probativeValue?: "high" | "medium" | "low";
  extractionConfidence?: number;
}

interface AnalysisJob {
  input?: string;
  facts?: EvidenceItem[];
  sources?: any[];
  // ... other fields not needed for this measurement
}

interface QualityMetrics {
  totalEvidence: number;
  totalSources: number;

  // probativeValue metrics
  probativeValueCoverage: number;  // % with field populated
  probativeValueDistribution: {
    high: number;
    medium: number;
    low: number;
    missing: number;
  };

  // claimDirection metrics
  claimDirectionCoverage: number;  // % with field populated
  claimDirectionDistribution: {
    supports: number;
    contradicts: number;
    neutral: number;
    missing: number;
  };

  // Category metrics
  categoryDistribution: Record<string, number>;
  directEvidenceUsage: number;  // % using "direct_evidence" vs "evidence"

  // EvidenceScope metrics
  evidenceScopeCoverage: number;  // % with evidenceScope present
  sourceTypeCoverage: number;     // % of evidenceScope items with sourceType
  sourceTypeDistribution: Record<string, number>;

  // Source metrics
  avgEvidencePerSource: number;
  evidencePerSourceDistribution: {
    min: number;
    max: number;
    median: number;
    p25: number;
    p75: number;
  };
}

// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================

function analyzeJobFiles(dirPath: string): QualityMetrics {
  const files = fs.readdirSync(dirPath)
    .filter(f => f.endsWith('.json') && !f.includes('baseline'))
    .map(f => path.join(dirPath, f));

  console.log(`Found ${files.length} job files to analyze`);

  let allEvidence: EvidenceItem[] = [];
  let sourceToEvidenceCount: Map<string, number> = new Map();

  for (const filePath of files) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const job: AnalysisJob = JSON.parse(content);

      if (job.facts && Array.isArray(job.facts)) {
        allEvidence.push(...job.facts);

        // Track evidence per source
        for (const evidence of job.facts) {
          const count = sourceToEvidenceCount.get(evidence.sourceId) || 0;
          sourceToEvidenceCount.set(evidence.sourceId, count + 1);
        }
      }
    } catch (error) {
      console.warn(`Failed to parse ${path.basename(filePath)}: ${error}`);
    }
  }

  console.log(`Collected ${allEvidence.length} evidence items from ${sourceToEvidenceCount.size} sources`);

  return calculateMetrics(allEvidence, sourceToEvidenceCount);
}

function calculateMetrics(
  evidence: EvidenceItem[],
  sourceToEvidenceCount: Map<string, number>
): QualityMetrics {
  const total = evidence.length;

  // probativeValue metrics
  const withProbativeValue = evidence.filter(e => e.probativeValue !== undefined);
  const probativeValueDistribution = {
    high: evidence.filter(e => e.probativeValue === 'high').length,
    medium: evidence.filter(e => e.probativeValue === 'medium').length,
    low: evidence.filter(e => e.probativeValue === 'low').length,
    missing: total - withProbativeValue.length,
  };

  // claimDirection metrics
  const withClaimDirection = evidence.filter(e => e.claimDirection !== undefined);
  const claimDirectionDistribution = {
    supports: evidence.filter(e => e.claimDirection === 'supports').length,
    contradicts: evidence.filter(e => e.claimDirection === 'contradicts').length,
    neutral: evidence.filter(e => e.claimDirection === 'neutral').length,
    missing: total - withClaimDirection.length,
  };

  // Category distribution
  const categoryDistribution: Record<string, number> = {};
  for (const item of evidence) {
    categoryDistribution[item.category] = (categoryDistribution[item.category] || 0) + 1;
  }

  const directEvidence = evidence.filter(e => e.category === 'direct_evidence').length;
  const legacyEvidence = evidence.filter(e => e.category === 'evidence').length;
  const directEvidenceUsage = (legacyEvidence + directEvidence) > 0
    ? (directEvidence / (legacyEvidence + directEvidence)) * 100
    : 0;

  // EvidenceScope metrics
  const withEvidenceScope = evidence.filter(e => e.evidenceScope !== undefined);
  const withSourceType = withEvidenceScope.filter(e => e.evidenceScope?.sourceType !== undefined);

  const sourceTypeDistribution: Record<string, number> = {};
  for (const item of withSourceType) {
    const sourceType = item.evidenceScope!.sourceType!;
    sourceTypeDistribution[sourceType] = (sourceTypeDistribution[sourceType] || 0) + 1;
  }

  // Evidence per source distribution
  const countsArray = Array.from(sourceToEvidenceCount.values()).sort((a, b) => a - b);
  const evidencePerSourceDistribution = {
    min: countsArray[0] || 0,
    max: countsArray[countsArray.length - 1] || 0,
    median: countsArray[Math.floor(countsArray.length / 2)] || 0,
    p25: countsArray[Math.floor(countsArray.length * 0.25)] || 0,
    p75: countsArray[Math.floor(countsArray.length * 0.75)] || 0,
  };

  const avgEvidencePerSource = countsArray.length > 0
    ? countsArray.reduce((a, b) => a + b, 0) / countsArray.length
    : 0;

  return {
    totalEvidence: total,
    totalSources: sourceToEvidenceCount.size,

    probativeValueCoverage: total > 0 ? (withProbativeValue.length / total) * 100 : 0,
    probativeValueDistribution,

    claimDirectionCoverage: total > 0 ? (withClaimDirection.length / total) * 100 : 0,
    claimDirectionDistribution,

    categoryDistribution,
    directEvidenceUsage,

    evidenceScopeCoverage: total > 0 ? (withEvidenceScope.length / total) * 100 : 0,
    sourceTypeCoverage: withEvidenceScope.length > 0
      ? (withSourceType.length / withEvidenceScope.length) * 100
      : 0,
    sourceTypeDistribution,

    avgEvidencePerSource,
    evidencePerSourceDistribution,
  };
}

// ============================================================================
// REPORTING
// ============================================================================

function printReport(metrics: QualityMetrics, outputFile?: string): void {
  const report = generateReport(metrics);

  console.log('\n' + '='.repeat(80));
  console.log('EVIDENCE QUALITY BASELINE MEASUREMENT');
  console.log('='.repeat(80) + '\n');
  console.log(report);

  if (outputFile) {
    fs.writeFileSync(outputFile, report, 'utf-8');
    console.log(`\nReport saved to: ${outputFile}`);
  }
}

function generateReport(m: QualityMetrics): string {
  const lines: string[] = [];

  lines.push(`Measurement Date: ${new Date().toISOString()}`);
  lines.push(`Total Evidence Items: ${m.totalEvidence}`);
  lines.push(`Total Sources: ${m.totalSources}`);
  lines.push('');

  // probativeValue section
  lines.push('## PROBATIVE VALUE METRICS');
  lines.push('');
  lines.push(`Coverage: ${m.probativeValueCoverage.toFixed(1)}% (${m.totalEvidence - m.probativeValueDistribution.missing}/${m.totalEvidence} items)`);
  lines.push('');
  lines.push('Distribution:');
  lines.push(`  High:    ${m.probativeValueDistribution.high.toString().padStart(6)} (${pct(m.probativeValueDistribution.high, m.totalEvidence)}%)`);
  lines.push(`  Medium:  ${m.probativeValueDistribution.medium.toString().padStart(6)} (${pct(m.probativeValueDistribution.medium, m.totalEvidence)}%)`);
  lines.push(`  Low:     ${m.probativeValueDistribution.low.toString().padStart(6)} (${pct(m.probativeValueDistribution.low, m.totalEvidence)}%)`);
  lines.push(`  Missing: ${m.probativeValueDistribution.missing.toString().padStart(6)} (${pct(m.probativeValueDistribution.missing, m.totalEvidence)}%)`);
  lines.push('');

  // Success criteria check
  if (m.probativeValueCoverage >= 80) {
    lines.push('✅ SUCCESS: probativeValue coverage >80%');
  } else {
    lines.push(`⚠️  WARNING: probativeValue coverage ${m.probativeValueCoverage.toFixed(1)}% below target 80%`);
  }
  lines.push('');

  // claimDirection section
  lines.push('## CLAIM DIRECTION METRICS');
  lines.push('');
  lines.push(`Coverage: ${m.claimDirectionCoverage.toFixed(1)}% (${m.totalEvidence - m.claimDirectionDistribution.missing}/${m.totalEvidence} items)`);
  lines.push('');
  lines.push('Distribution:');
  lines.push(`  Supports:     ${m.claimDirectionDistribution.supports.toString().padStart(6)} (${pct(m.claimDirectionDistribution.supports, m.totalEvidence)}%)`);
  lines.push(`  Contradicts:  ${m.claimDirectionDistribution.contradicts.toString().padStart(6)} (${pct(m.claimDirectionDistribution.contradicts, m.totalEvidence)}%)`);
  lines.push(`  Neutral:      ${m.claimDirectionDistribution.neutral.toString().padStart(6)} (${pct(m.claimDirectionDistribution.neutral, m.totalEvidence)}%)`);
  lines.push(`  Missing:      ${m.claimDirectionDistribution.missing.toString().padStart(6)} (${pct(m.claimDirectionDistribution.missing, m.totalEvidence)}%)`);
  lines.push('');

  const missingRate = (m.claimDirectionDistribution.missing / m.totalEvidence) * 100;
  if (missingRate < 5) {
    lines.push('✅ SUCCESS: claimDirection missing rate <5%');
  } else {
    lines.push(`⚠️  WARNING: claimDirection missing rate ${missingRate.toFixed(1)}% above target 5%`);
  }
  lines.push('');

  // Category section
  lines.push('## CATEGORY DISTRIBUTION');
  lines.push('');
  const sortedCategories = Object.entries(m.categoryDistribution)
    .sort((a, b) => b[1] - a[1]);
  for (const [category, count] of sortedCategories) {
    lines.push(`  ${category.padEnd(20)}: ${count.toString().padStart(6)} (${pct(count, m.totalEvidence)}%)`);
  }
  lines.push('');
  lines.push(`Direct Evidence Usage: ${m.directEvidenceUsage.toFixed(1)}% using "direct_evidence" vs "evidence"`);
  lines.push('');

  // EvidenceScope section
  lines.push('## EVIDENCE SCOPE METRICS');
  lines.push('');
  lines.push(`EvidenceScope Coverage: ${m.evidenceScopeCoverage.toFixed(1)}% (${Math.round(m.evidenceScopeCoverage * m.totalEvidence / 100)}/${m.totalEvidence} items)`);

  const scopeCount = Math.round(m.evidenceScopeCoverage * m.totalEvidence / 100);
  if (scopeCount > 0) {
    lines.push(`sourceType Coverage: ${m.sourceTypeCoverage.toFixed(1)}% of EvidenceScope items`);
    lines.push('');

    if (Object.keys(m.sourceTypeDistribution).length > 0) {
      lines.push('sourceType Distribution:');
      const sortedTypes = Object.entries(m.sourceTypeDistribution)
        .sort((a, b) => b[1] - a[1]);
      for (const [type, count] of sortedTypes) {
        lines.push(`  ${type.padEnd(25)}: ${count.toString().padStart(6)} (${pct(count, scopeCount)}%)`);
      }
      lines.push('');
    }

    if (m.sourceTypeCoverage >= 70) {
      lines.push('✅ SUCCESS: sourceType coverage >70% (of EvidenceScope items)');
    } else {
      lines.push(`⚠️  WARNING: sourceType coverage ${m.sourceTypeCoverage.toFixed(1)}% below target 70%`);
    }
  } else {
    lines.push('(No EvidenceScope items found for sourceType analysis)');
  }
  lines.push('');

  // Source statistics
  lines.push('## SOURCE STATISTICS');
  lines.push('');
  lines.push(`Average Evidence per Source: ${m.avgEvidencePerSource.toFixed(2)}`);
  lines.push('');
  lines.push('Distribution:');
  lines.push(`  Min:    ${m.evidencePerSourceDistribution.min}`);
  lines.push(`  25th:   ${m.evidencePerSourceDistribution.p25}`);
  lines.push(`  Median: ${m.evidencePerSourceDistribution.median}`);
  lines.push(`  75th:   ${m.evidencePerSourceDistribution.p75}`);
  lines.push(`  Max:    ${m.evidencePerSourceDistribution.max}`);
  lines.push('');

  // Success summary
  lines.push('## SUCCESS CRITERIA SUMMARY');
  lines.push('');
  const criteria = [
    { name: 'probativeValue coverage >80%', met: m.probativeValueCoverage >= 80 },
    { name: 'claimDirection missing rate <5%', met: missingRate < 5 },
    { name: 'sourceType coverage >70%', met: m.sourceTypeCoverage >= 70 || scopeCount === 0 },
  ];

  for (const criterion of criteria) {
    lines.push(`${criterion.met ? '✅' : '❌'} ${criterion.name}`);
  }
  lines.push('');

  const metCount = criteria.filter(c => c.met).length;
  lines.push(`Overall: ${metCount}/${criteria.length} criteria met`);

  return lines.join('\n');
}

function pct(value: number, total: number): string {
  if (total === 0) return '0.0';
  return ((value / total) * 100).toFixed(1);
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('Usage: npx tsx scripts/measure-evidence-quality.ts <job-files-dir> [output-file]');
    console.log('');
    console.log('Measures evidence quality metrics from analysis job JSON files.');
    console.log('');
    console.log('Arguments:');
    console.log('  job-files-dir  Directory containing analysis job JSON files');
    console.log('  output-file    Optional: Save report to file (default: console only)');
    console.log('');
    console.log('Example:');
    console.log('  npx tsx scripts/measure-evidence-quality.ts ./jobs baseline-2026-01-29.txt');
    process.exit(0);
  }

  const jobDir = args[0];
  const outputFile = args[1];

  if (!fs.existsSync(jobDir)) {
    console.error(`Error: Directory not found: ${jobDir}`);
    process.exit(1);
  }

  const metrics = analyzeJobFiles(jobDir);
  printReport(metrics, outputFile);
}

main();
