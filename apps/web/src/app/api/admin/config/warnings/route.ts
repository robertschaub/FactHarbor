/**
 * Config Validation Warnings API
 *
 * GET /api/admin/config/warnings
 * GET /api/admin/config/warnings?pipeline=[hash]&search=[hash]
 *
 * Returns validation warnings for current active configs or specified config hashes.
 * If no query params provided, validates the active default configs.
 *
 * Part of UCM v2.9.0 Phase 4: Admin UI
 */

import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering - this route uses request.url for query params
export const dynamic = 'force-dynamic';
import { loadPipelineConfig, loadSearchConfig } from '@/lib/config-loader';
import { getConfigBlob } from '@/lib/config-storage';
import { PipelineConfigSchema, SearchConfigSchema, type PipelineConfig, type SearchConfig } from '@/lib/config-schemas';
import { getAllConfigWarnings, groupWarningsBySeverity, hasCriticalWarnings } from '@/lib/config-validation-warnings';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pipelineHash = searchParams.get('pipeline');
    const searchHash = searchParams.get('search');

    let pipelineConfig: PipelineConfig;
    let searchConfig: SearchConfig;
    let resolvedPipelineHash: string;
    let resolvedSearchHash: string;

    // Load pipeline config (by hash or active default)
    if (pipelineHash) {
      const blob = await getConfigBlob(pipelineHash);
      if (!blob) {
        return NextResponse.json(
          { error: `Pipeline config not found for hash: ${pipelineHash}` },
          { status: 404 }
        );
      }
      const parsed = PipelineConfigSchema.safeParse(JSON.parse(blob.content));
      if (!parsed.success) {
        return NextResponse.json(
          { error: `Invalid pipeline config: ${parsed.error.message}` },
          { status: 400 }
        );
      }
      pipelineConfig = parsed.data;
      resolvedPipelineHash = pipelineHash;
    } else {
      const result = await loadPipelineConfig("default");
      pipelineConfig = result.config;
      resolvedPipelineHash = result.contentHash;
    }

    // Load search config (by hash or active default)
    if (searchHash) {
      const blob = await getConfigBlob(searchHash);
      if (!blob) {
        return NextResponse.json(
          { error: `Search config not found for hash: ${searchHash}` },
          { status: 404 }
        );
      }
      const parsed = SearchConfigSchema.safeParse(JSON.parse(blob.content));
      if (!parsed.success) {
        return NextResponse.json(
          { error: `Invalid search config: ${parsed.error.message}` },
          { status: 400 }
        );
      }
      searchConfig = parsed.data;
      resolvedSearchHash = searchHash;
    } else {
      const result = await loadSearchConfig("default");
      searchConfig = result.config;
      resolvedSearchHash = result.contentHash;
    }

    // Get all warnings
    const warnings = getAllConfigWarnings(pipelineConfig, searchConfig);

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
        pipeline: resolvedPipelineHash,
        search: resolvedSearchHash,
      },
      requestedHashes: {
        pipeline: pipelineHash || null,
        search: searchHash || null,
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
