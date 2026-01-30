/**
 * Config Validation Warnings API
 *
 * GET /api/admin/config/warnings?pipeline=[hash]&search=[hash]
 * Returns validation warnings for current or specified configs
 *
 * Part of UCM v2.9.0 Phase 4: Admin UI
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadPipelineConfig, loadSearchConfig, DEFAULT_PIPELINE_CONFIG, DEFAULT_SEARCH_CONFIG } from '@/lib/config-loader';
import { getAllConfigWarnings, groupWarningsBySeverity, hasCriticalWarnings } from '@/lib/config-validation-warnings';

export async function GET(request: NextRequest) {
  try {
    // Load current configs (or specified versions)
    const pipelineResult = await loadPipelineConfig("default");
    const searchResult = await loadSearchConfig("default");

    // Get all warnings
    const warnings = getAllConfigWarnings(
      pipelineResult.config,
      searchResult.config
    );

    // Group by severity
    const grouped = groupWarningsBySeverity(warnings);
    const hasCritical = hasCriticalWarnings(warnings);

    return NextResponse.json({
      success: true,
      warnings,
      grouped,
      hasCritical,
      totalCount: warnings.length,
      configHashes: {
        pipeline: pipelineResult.contentHash,
        search: searchResult.contentHash,
      },
    });
  } catch (error) {
    console.error('[Config Warnings API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to validate config' },
      { status: 500 }
    );
  }
}
