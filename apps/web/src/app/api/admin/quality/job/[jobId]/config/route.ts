/**
 * Job Config Snapshot API
 *
 * GET /api/admin/quality/job/[jobId]/config
 * Returns the complete config snapshot for a specific job
 *
 * Part of UCM v2.9.0 Phase 4: Admin UI
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConfigSnapshot, formatSnapshotForDisplay } from '@/lib/config-snapshots';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = params.jobId;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const snapshot = await getConfigSnapshot(jobId);

    if (!snapshot) {
      return NextResponse.json(
        { error: `No config snapshot found for job ${jobId}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      snapshot,
      markdown: formatSnapshotForDisplay(snapshot),
    });
  } catch (error) {
    console.error('[Config Snapshot API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve config snapshot' },
      { status: 500 }
    );
  }
}
