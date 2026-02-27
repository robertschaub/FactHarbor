/**
 * Framing Symmetry Calibration — Paired Job Audit
 *
 * Operator tool for comparing two completed analysis jobs as a strict inverse pair.
 * Computes complementarity error, runs root-cause diagnosis, and optionally
 * verifies the inverse claim relation via LLM.
 *
 * Calibration/audit subsystem only — production runtime is NOT affected.
 *
 * Usage (CLI): npx tsx scripts/run-paired-audit.ts <jobIdA> <jobIdB> [--verify-inverse]
 *
 * @module calibration/paired-job-audit
 */

import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { diagnoseInverseAsymmetry } from "./metrics";
import type { SideResult } from "./types";

// ============================================================================
// PUBLIC INTERFACES
// ============================================================================

export interface PairedJobAuditRequest {
  jobIdA: string;
  jobIdB: string;
  /** Use LLM (Haiku tier) to verify claims are strict inverses. Default: false. */
  verifyInverseRelation?: boolean;
  /** API base URL. Default: FH_API_BASE_URL env var. */
  apiBaseUrl?: string;
}

export interface PairedJobAuditResult {
  jobIdA: string;
  jobIdB: string;
  claimA: string;
  claimB: string;
  truthPercentageA: number;
  truthPercentageB: number;
  /** abs((truthPercentageA + truthPercentageB) - 100) */
  complementarityError: number;
  /** null if verification was skipped (verifyInverseRelation: false) */
  isConfirmedInverse: boolean | null;
  inverseVerificationReasoning?: string;
  rootCauseTags: string[];
  warningsA: Array<{ type: string; severity: string; message: string }>;
  warningsB: Array<{ type: string; severity: string; message: string }>;
  /** Count of verdict_integrity_failure warnings on each side */
  integrityDowngradesA: number;
  integrityDowngradesB: number;
  timestamp: string;
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

interface JobApiResponse {
  id: string;
  status: string;
  inputValue: string;
  resultJson: Record<string, unknown> | null;
}

async function fetchJob(
  jobId: string,
  apiBaseUrl: string,
  adminKey: string,
): Promise<JobApiResponse> {
  const url = `${apiBaseUrl}/v1/jobs/${encodeURIComponent(jobId)}`;
  const response = await fetch(url, {
    headers: {
      "X-Admin-Key": adminKey,
    },
  });

  if (response.status === 404) {
    throw new Error(`Job not found: ${jobId}`);
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch job ${jobId}: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<JobApiResponse>;
}

function extractWarnings(
  resultJson: Record<string, unknown>,
): Array<{ type: string; severity: string; message: string }> {
  const raw = Array.isArray(resultJson.analysisWarnings)
    ? resultJson.analysisWarnings
    : Array.isArray(resultJson.warnings)
      ? resultJson.warnings
      : [];
  return (raw as unknown[]).map((w) => {
    const warning = w as Record<string, unknown>;
    return {
      type: String(warning.type ?? ""),
      severity: String(warning.severity ?? "info"),
      message: String(warning.message ?? ""),
    };
  });
}

function countIntegrityDowngrades(
  warnings: Array<{ type: string; severity: string; message: string }>,
): number {
  return warnings.filter((w) => w.type === "verdict_integrity_failure").length;
}

/**
 * Build a minimal SideResult stub for diagnoseInverseAsymmetry().
 * Only the warnings field is used by the diagnostic function.
 */
function makeMinimalSideResult(
  warnings: Array<{ type: string; severity: string; message: string }>,
): SideResult {
  return {
    claim: "",
    side: "left",
    truthPercentage: 0,
    confidence: 0,
    verdict: "",
    claimVerdicts: [],
    evidencePool: {
      totalItems: 0,
      supporting: 0,
      contradicting: 0,
      neutral: 0,
      supportRatio: 0,
    },
    sourceCount: 0,
    uniqueDomains: 0,
    gate1Stats: { total: 0, passed: 0, filtered: 0 },
    gate4Stats: { total: 0, highConfidence: 0, insufficient: 0 },
    llmCalls: 0,
    searchQueries: 0,
    durationMs: 0,
    estimatedCostUSD: 0,
    modelsUsed: {},
    warnings: warnings.map((w) => ({
      type: w.type,
      severity: w.severity,
      message: w.message,
    })),
    fullResultJson: {},
  };
}

/**
 * UCM-managed prompt template for LLM inverse verification.
 * Canonical source: prompts/text-analysis/inverse-claim-verification.prompt.md
 */
const INVERSE_VERIFICATION_PROMPT =
  `Given two claims, determine if they are strict logical inverses ` +
  `(one asserts X, the other asserts NOT-X, with no additional semantic shift):\n\n` +
  `Claim A: {{CLAIM_A}}\n` +
  `Claim B: {{CLAIM_B}}\n\n` +
  `Return JSON only: { "isStrictInverse": boolean, "reasoning": "..." }`;

async function verifyInverse(
  claimA: string,
  claimB: string,
): Promise<{ isStrictInverse: boolean; reasoning: string }> {
  const prompt = INVERSE_VERIFICATION_PROMPT
    .replace("{{CLAIM_A}}", claimA)
    .replace("{{CLAIM_B}}", claimB);

  const result = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    temperature: 0,
    prompt,
  });

  try {
    const parsed = JSON.parse(result.text.trim()) as {
      isStrictInverse: boolean;
      reasoning: string;
    };
    return {
      isStrictInverse: Boolean(parsed.isStrictInverse),
      reasoning: String(parsed.reasoning ?? ""),
    };
  } catch {
    return {
      isStrictInverse: false,
      reasoning: `Failed to parse verification response: ${result.text.slice(0, 200)}`,
    };
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Audit two completed analysis jobs as a strict inverse pair.
 *
 * Flow:
 * 1. Fetch both jobs from API
 * 2. Validate both are SUCCEEDED
 * 3. Extract truthPercentage, inputValue, warnings from resultJson
 * 4. Compute complementarityError
 * 5. Optionally verify inverse relation via LLM (Haiku tier, temperature 0)
 * 6. Run root-cause diagnosis using diagnoseInverseAsymmetry()
 * 7. Return structured result
 */
export async function runPairedJobAudit(
  request: PairedJobAuditRequest,
): Promise<PairedJobAuditResult> {
  const apiBaseUrl = (
    request.apiBaseUrl ??
    process.env.FH_API_BASE_URL ??
    "http://localhost:5000"
  ).replace(/\/$/, "");
  const adminKey = process.env.FH_ADMIN_KEY ?? "";

  const [jobA, jobB] = await Promise.all([
    fetchJob(request.jobIdA, apiBaseUrl, adminKey),
    fetchJob(request.jobIdB, apiBaseUrl, adminKey),
  ]);

  if (jobA.status !== "SUCCEEDED") {
    throw new Error(
      `Job ${request.jobIdA} is not SUCCEEDED (status: ${jobA.status})`,
    );
  }
  if (jobB.status !== "SUCCEEDED") {
    throw new Error(
      `Job ${request.jobIdB} is not SUCCEEDED (status: ${jobB.status})`,
    );
  }

  const rjA = jobA.resultJson ?? {};
  const rjB = jobB.resultJson ?? {};

  const truthPercentageA = Number(rjA.truthPercentage ?? 50);
  const truthPercentageB = Number(rjB.truthPercentage ?? 50);
  const complementarityError = Math.abs(
    (truthPercentageA + truthPercentageB) - 100,
  );

  const warningsA = extractWarnings(rjA);
  const warningsB = extractWarnings(rjB);

  const sideA = makeMinimalSideResult(warningsA);
  const sideB = makeMinimalSideResult(warningsB);
  const diag = diagnoseInverseAsymmetry(sideA, sideB, complementarityError);

  let isConfirmedInverse: boolean | null = null;
  let inverseVerificationReasoning: string | undefined;
  if (request.verifyInverseRelation) {
    const verification = await verifyInverse(jobA.inputValue, jobB.inputValue);
    isConfirmedInverse = verification.isStrictInverse;
    inverseVerificationReasoning = verification.reasoning;
  }

  return {
    jobIdA: request.jobIdA,
    jobIdB: request.jobIdB,
    claimA: jobA.inputValue,
    claimB: jobB.inputValue,
    truthPercentageA,
    truthPercentageB,
    complementarityError,
    isConfirmedInverse,
    inverseVerificationReasoning,
    rootCauseTags: diag.rootCauseTags,
    warningsA,
    warningsB,
    integrityDowngradesA: countIntegrityDowngrades(warningsA),
    integrityDowngradesB: countIntegrityDowngrades(warningsB),
    timestamp: new Date().toISOString(),
  };
}
