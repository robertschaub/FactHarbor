'use client';

/**
 * Job Config Snapshot Viewer
 *
 * Displays the complete resolved configuration for a specific analysis job.
 * Shows PipelineConfig, SearchConfig, and SR summary used for that job.
 *
 * Part of UCM v2.9.0 Phase 4: Admin UI
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface ConfigSnapshot {
  jobId: string;
  schemaVersion: string;
  pipelineConfig: Record<string, unknown>;
  searchConfig: Record<string, unknown>;
  srEnabled: boolean;
  srDefaultScore: number;
  srConfidenceThreshold: number;
  capturedUtc: string;
  analyzerVersion: string;
}

export default function JobConfigPage() {
  const params = useParams();
  const jobId = params?.jobId as string;

  const [snapshot, setSnapshot] = useState<ConfigSnapshot | null>(null);
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    async function fetchSnapshot() {
      try {
        const response = await fetch(`/api/admin/quality/job/${jobId}/config`);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch config snapshot');
        }

        const data = await response.json();
        setSnapshot(data.snapshot);
        setMarkdown(data.markdown);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchSnapshot();
  }, [jobId]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Job Config Snapshot</h1>
          <p className="text-gray-600">Loading config snapshot for job {jobId}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Job Config Snapshot</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-red-800 font-semibold mb-2">Error</h2>
            <p className="text-red-600">{error}</p>
          </div>
          <div className="mt-6">
            <a
              href="/admin"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              ← Back to Admin
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Job Config Snapshot</h1>
          <p className="text-gray-600">No config snapshot found for job {jobId}</p>
          <div className="mt-6">
            <a
              href="/admin"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              ← Back to Admin
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <a
            href="/admin"
            className="text-blue-600 hover:text-blue-800 underline text-sm"
          >
            ← Back to Admin
          </a>
        </div>

        <h1 className="text-3xl font-bold mb-2">Job Config Snapshot</h1>
        <p className="text-gray-600 mb-6">
          Complete configuration for job <code className="bg-gray-100 px-2 py-1 rounded">{jobId}</code>
        </p>

        {/* Metadata */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-blue-900 mb-2">Metadata</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-700 font-medium">Captured:</span>
              <span className="ml-2 text-blue-900">{new Date(snapshot.capturedUtc).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Analyzer Version:</span>
              <span className="ml-2 text-blue-900">{snapshot.analyzerVersion}</span>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Schema Version:</span>
              <span className="ml-2 text-blue-900">{snapshot.schemaVersion}</span>
            </div>
          </div>
        </div>

        {/* Pipeline Config */}
        <div className="bg-white border border-gray-300 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Pipeline Configuration</h2>
          <pre className="bg-gray-50 p-4 rounded overflow-x-auto text-sm">
            {JSON.stringify(snapshot.pipelineConfig, null, 2)}
          </pre>
        </div>

        {/* Search Config */}
        <div className="bg-white border border-gray-300 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Search Configuration</h2>
          <pre className="bg-gray-50 p-4 rounded overflow-x-auto text-sm">
            {JSON.stringify(snapshot.searchConfig, null, 2)}
          </pre>
        </div>

        {/* SR Summary */}
        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Source Reliability Summary</h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Enabled:</span>
              <span className="ml-2">{snapshot.srEnabled ? 'Yes' : 'No'}</span>
            </div>
            <div>
              <span className="font-medium">Default Score:</span>
              <span className="ml-2">{snapshot.srDefaultScore}</span>
            </div>
            <div>
              <span className="font-medium">Confidence Threshold:</span>
              <span className="ml-2">{snapshot.srConfidenceThreshold}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Note: Full SR config not shown to maintain SR modularity
          </p>
        </div>

        {/* Markdown Export */}
        <div className="mt-6">
          <details className="bg-gray-50 border border-gray-300 rounded-lg p-4">
            <summary className="font-semibold cursor-pointer">
              View as Markdown
            </summary>
            <pre className="mt-4 text-sm whitespace-pre-wrap">
              {markdown}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}
