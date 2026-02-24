'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Metrics page — redirects to the unified Analysis Monitoring dashboard.
 * Kept as a client redirect so existing bookmarks and links continue to work.
 */
export default function MetricsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/quality-health');
  }, [router]);

  return (
    <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
      Redirecting to Analysis Monitoring...
    </div>
  );
}
