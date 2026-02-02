/**
 * Admin Configuration Test Page
 * Allows administrators to test their API keys and service configurations
 */

"use client";

import { useState } from "react";
import styles from "./test-config.module.css";

type TestResult = {
  service: string;
  status: "success" | "error" | "not_configured" | "skipped";
  message: string;
  configUrl?: string;
  details?: string;
};

type TestResponse = {
  summary: {
    total: number;
    success: number;
    error: number;
    not_configured: number;
    skipped: number;
  };
  results: TestResult[];
  timestamp: string;
};

export default function TestConfigPage() {
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTests = async () => {
    setTesting(true);
    setError(null);
    setTestResults(null);

    try {
      const response = await fetch("/api/admin/test-config");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setTestResults(data);
    } catch (err: any) {
      setError(err.message || "Failed to run tests");
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "not_configured":
        return "⚠️";
      case "skipped":
        return "⏭️";
      default:
        return "❓";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return styles.statusSuccess;
      case "error":
        return styles.statusError;
      case "not_configured":
        return styles.statusWarning;
      case "skipped":
        return styles.statusSkipped;
      default:
        return "";
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Configuration Test Dashboard</h1>
        <p className={styles.subtitle}>
          Test your API keys and service configurations to ensure everything is working correctly
        </p>
      </div>

      <div className={styles.testSection}>
        <button
          onClick={runTests}
          disabled={testing}
          className={`${styles.testButton} ${testing ? styles.testButtonDisabled : ""}`}
        >
          {testing ? "⏳ Running Tests..." : "🧪 Run All Tests"}
        </button>

        {error && (
          <div className={styles.errorBox}>
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      {testResults && (
        <>
          <div className={styles.summarySection}>
            <h2 className={styles.sectionTitle}>Summary</h2>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}>
                <div className={styles.summaryNumber}>{testResults.summary.total}</div>
                <div className={styles.summaryLabel}>Total Tests</div>
              </div>
              <div className={`${styles.summaryCard} ${styles.summaryCardSuccess}`}>
                <div className={styles.summaryNumber}>{testResults.summary.success}</div>
                <div className={styles.summaryLabel}>Passed</div>
              </div>
              <div className={`${styles.summaryCard} ${styles.summaryCardError}`}>
                <div className={styles.summaryNumber}>{testResults.summary.error}</div>
                <div className={styles.summaryLabel}>Failed</div>
              </div>
              <div className={`${styles.summaryCard} ${styles.summaryCardWarning}`}>
                <div className={styles.summaryNumber}>{testResults.summary.not_configured}</div>
                <div className={styles.summaryLabel}>Not Configured</div>
              </div>
              <div className={`${styles.summaryCard} ${styles.summaryCardSkipped}`}>
                <div className={styles.summaryNumber}>{testResults.summary.skipped}</div>
                <div className={styles.summaryLabel}>Skipped</div>
              </div>
            </div>
            <div className={styles.timestamp}>
              Last tested: {new Date(testResults.timestamp).toLocaleString()}
            </div>
          </div>

          <div className={styles.resultsSection}>
            <h2 className={styles.sectionTitle}>Test Results</h2>
            <div className={styles.resultsList}>
              {testResults.results.map((result, index) => (
                <div key={index} className={`${styles.resultCard} ${getStatusColor(result.status)}`}>
                  <div className={styles.resultHeader}>
                    <div className={styles.resultService}>
                      <span className={styles.resultIcon}>{getStatusIcon(result.status)}</span>
                      <span className={styles.resultName}>{result.service}</span>
                    </div>
                    <span className={styles.resultStatus}>{result.status.replace("_", " ").toUpperCase()}</span>
                  </div>

                  <div className={styles.resultMessage}>{result.message}</div>

                  {result.details && (
                    <div className={styles.resultDetails}>
                      <strong>Details:</strong> {result.details}
                    </div>
                  )}

                  {result.configUrl && (
                    <div className={styles.resultActions}>
                      <a
                        href={result.configUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.configLink}
                      >
                        🔗 Configure API Key
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.helpSection}>
            <h2 className={styles.sectionTitle}>Configuration Help</h2>
            <div className={styles.helpContent}>
              <p>
                Provider credentials and runtime wiring live in{" "}
                <code className={styles.code}>apps/web/.env.local</code>.
                Analysis and search behavior are configured in UCM (Admin → Config).
              </p>

              <h3 className={styles.helpSubtitle}>Common Issues:</h3>
              <ul className={styles.helpList}>
                <li>
                  <strong>API Key contains placeholder text:</strong> Make sure to replace placeholder values
                  like "PASTE_YOUR_KEY_HERE" with actual API keys from the provider.
                </li>
                <li>
                  <strong>Service not configured:</strong> Add the required environment variables to your
                  .env.local file and restart the development server.
                </li>
                <li>
                  <strong>Service skipped:</strong> This service is not currently selected. Update your
                  LLM_PROVIDER or the active UCM search config if you want to use it.
                </li>
                <li>
                  <strong>Connection errors:</strong> Check your internet connection and verify the API key
                  is valid by visiting the configuration URL.
                </li>
              </ul>

              <h3 className={styles.helpSubtitle}>Environment Variables:</h3>
              <div className={styles.envVarList}>
                <div className={styles.envVarCategory}>
                  <strong>LLM Providers:</strong>
                  <code className={styles.code}>LLM_PROVIDER</code>,
                  <code className={styles.code}>OPENAI_API_KEY</code>,
                  <code className={styles.code}>ANTHROPIC_API_KEY</code>,
                  <code className={styles.code}>GOOGLE_GENERATIVE_AI_API_KEY</code>,
                  <code className={styles.code}>MISTRAL_API_KEY</code>
                </div>
                <div className={styles.envVarCategory}>
                  <strong>Search Providers:</strong>
                  <code className={styles.code}>SERPAPI_API_KEY</code>,
                  <code className={styles.code}>GOOGLE_CSE_API_KEY</code>,
                  <code className={styles.code}>GOOGLE_CSE_ID</code>
                </div>
                <div className={styles.envVarCategory}>
                  <strong>FactHarbor API:</strong>
                  <code className={styles.code}>FH_API_BASE_URL</code>,
                  <code className={styles.code}>FH_ADMIN_KEY</code>,
                  <code className={styles.code}>FH_INTERNAL_RUNNER_KEY</code>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
