/**
 * Connectivity Probe
 *
 * Lightweight reachability checks for LLM provider endpoints.
 * Any HTTP response counts as reachable. Only transport-level failures
 * (DNS, refused connection, fetch failure, local timeout abort) count as unreachable.
 *
 * @module connectivity-probe
 */

import type { LLMProviderType } from "./analyzer/types";

export const LLM_CONNECTIVITY_PROBE_URLS: Record<LLMProviderType, string> = {
  anthropic: "https://api.anthropic.com/v1/messages",
  openai: "https://api.openai.com/v1/models",
  google: "https://generativelanguage.googleapis.com/v1beta/models",
  mistral: "https://api.mistral.ai/v1/models",
};

export const DEFAULT_LLM_CONNECTIVITY_TIMEOUT_MS = 5_000;

export interface ProbeResult {
  reachable: boolean;
  statusCode?: number;
  error?: string;
  durationMs: number;
}

export interface ProbeLLMConnectivityOptions {
  provider?: LLMProviderType;
  url?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export function getLlmConnectivityProbeUrl(provider: LLMProviderType = "anthropic"): string {
  return LLM_CONNECTIVITY_PROBE_URLS[provider];
}

export async function probeLLMConnectivity(
  options: ProbeLLMConnectivityOptions = {},
): Promise<ProbeResult> {
  const {
    provider = "anthropic",
    url = getLlmConnectivityProbeUrl(provider),
    timeoutMs = DEFAULT_LLM_CONNECTIVITY_TIMEOUT_MS,
    fetchImpl = fetch,
  } = options;
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method: "HEAD",
      signal: controller.signal,
    });
    return {
      reachable: true,
      statusCode: response.status,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      reachable: false,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
}
