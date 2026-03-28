/**
 * Admin API Key Test Route
 * Tests all configured API keys and services
 */

import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { mistral } from "@ai-sdk/mistral";
import { generateText } from "ai";
import { loadPipelineConfig, loadSearchConfig } from "@/lib/config-loader";
import { getCacheStats } from "@/lib/search-cache";
import { getAllProviderStats, getProviderStats } from "@/lib/search-circuit-breaker";
import { checkAdminKey } from "@/lib/auth";
import { ANTHROPIC_MODELS } from "@/lib/analyzer/model-tiering";
import { classifyError } from "@/lib/error-classification";
import type { PipelineConfig } from "@/lib/config-schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TestResult = {
  service: string;
  status: "success" | "warning" | "error" | "not_configured" | "skipped";
  message: string;
  configUrl?: string;
  details?: string;
};

type LlmProvider = "openai" | "anthropic" | "google" | "mistral";

type LlmProviderTestPlan = {
  shouldTest: boolean;
  usageContexts: string[];
};

const LLM_TEST_TIMEOUT_MS = 15000;

function getUsedLlmProviderContexts(pipelineConfig: Pick<PipelineConfig, "llmProvider" | "debateRoles">): Record<LlmProvider, string[]> {
  const contexts: Record<LlmProvider, string[]> = {
    openai: [],
    anthropic: [],
    google: [],
    mistral: [],
  };

  const primaryProvider = pipelineConfig.llmProvider;
  if (primaryProvider && primaryProvider in contexts) {
    contexts[primaryProvider].push("pipeline.llmProvider");
  }

  const roleEntries = Object.entries(pipelineConfig.debateRoles ?? {});
  for (const [roleName, roleConfig] of roleEntries) {
    const provider = roleConfig?.provider;
    if (!provider || !(provider in contexts)) continue;
    contexts[provider].push(`debateRoles.${roleName}`);
  }

  return contexts;
}

function buildLlmProviderTestPlan(
  pipelineConfig: Pick<PipelineConfig, "llmProvider" | "debateRoles">,
): Record<LlmProvider, LlmProviderTestPlan> {
  const usedContexts = getUsedLlmProviderContexts(pipelineConfig);

  return {
    openai: {
      shouldTest: usedContexts.openai.length > 0,
      usageContexts: usedContexts.openai,
    },
    anthropic: {
      shouldTest: usedContexts.anthropic.length > 0,
      usageContexts: usedContexts.anthropic,
    },
    google: {
      shouldTest: usedContexts.google.length > 0,
      usageContexts: usedContexts.google,
    },
    mistral: {
      shouldTest: usedContexts.mistral.length > 0,
      usageContexts: usedContexts.mistral,
    },
  };
}

function formatPlanDetails(plan: LlmProviderTestPlan): string | undefined {
  if (plan.usageContexts.length > 0) {
    return `Used by: ${plan.usageContexts.join(", ")}`;
  }

  return undefined;
}

function combineDetails(primary: string | undefined, plan: LlmProviderTestPlan): string | undefined {
  const secondary = formatPlanDetails(plan);
  return [primary, secondary].filter(Boolean).join(" | ") || undefined;
}

function stripRetryWrapper(message: string): string {
  return message
    .replace(/^AI_RetryError:\s*/i, "")
    .replace(/^Failed after \d+ attempts\.\s*Last error:\s*/i, "")
    .trim();
}

function formatLlmTestFailure(providerLabel: string, error: unknown, plan: LlmProviderTestPlan): TestResult {
  const classified = classifyError(error);
  const rawMessage = error instanceof Error ? error.message : String(error ?? "Unknown error");
  const cleanedMessage = stripRetryWrapper(rawMessage);

  let message = `${providerLabel} API error: ${cleanedMessage}`;
  if (classified.category === "rate_limit") {
    message = `${providerLabel} quota or rate limit reached`;
  } else if (classified.category === "timeout") {
    message = `${providerLabel} test timed out`;
  }

  return {
    service: providerLabel,
    status: "error",
    message,
    details: combineDetails(cleanedMessage, plan),
  };
}

async function runWithAbortTimeout<T>(
  operation: (abortSignal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await operation(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET(request: NextRequest) {
  if (!checkAdminKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: TestResult[] = [];

  const [basicResults, pipelineConfigResult, searchConfigResult] = await Promise.all([
    Promise.all([
      testFhApiBaseUrl(),
      Promise.resolve(testFhAdminKey()),
      Promise.resolve(testFhInternalRunnerKey()),
    ]),
    loadPipelineConfig("default"),
    loadSearchConfig("default"),
  ]);

  results.push(...basicResults);

  const llmTestPlan = buildLlmProviderTestPlan(pipelineConfigResult.config);
  results.push(...await Promise.all([
    testOpenAI(llmTestPlan.openai),
    testAnthropic(llmTestPlan.anthropic),
    testGoogle(llmTestPlan.google),
    testMistral(llmTestPlan.mistral),
  ]));

  const searchEnabled = searchConfigResult.config.enabled;
  const searchProvider = searchConfigResult.config.provider;
  results.push(...await Promise.all([
    testSerpApi(searchEnabled && (searchProvider === "serpapi" || searchProvider === "auto")),
    testGoogleCse(searchEnabled && (searchProvider === "google-cse" || searchProvider === "auto")),
    testBrave(searchEnabled && (searchProvider === "brave" || searchProvider === "auto")),
    testSerper(searchEnabled && (searchProvider === "serper" || searchProvider === "auto")),
  ]));
  results.push(...await Promise.all([
    testSearchCache(searchEnabled),
    testSearchCircuitBreaker(searchEnabled),
  ]));

  // Summary
  const summary = {
    total: results.length,
    success: results.filter(r => r.status === "success").length,
    warning: results.filter(r => r.status === "warning").length,
    error: results.filter(r => r.status === "error").length,
    not_configured: results.filter(r => r.status === "not_configured").length,
    skipped: results.filter(r => r.status === "skipped").length,
  };

  return NextResponse.json({
    summary,
    results,
    timestamp: new Date().toISOString(),
  });
}

async function testFhApiBaseUrl(): Promise<TestResult> {
  const baseUrl = process.env.FH_API_BASE_URL;

  if (!baseUrl) {
    return {
      service: "FH API Base URL",
      status: "not_configured",
      message: "FH_API_BASE_URL is not set",
      configUrl: "https://github.com/yourusername/factharbor#configuration",
    };
  }

  try {
    const healthUrl = `${baseUrl}/health`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(healthUrl, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return {
        service: "FH API Base URL",
        status: "success",
        message: `Connected to API at ${baseUrl}`,
        details: `Health endpoint responded with status ${response.status}`,
      };
    } else {
      return {
        service: "FH API Base URL",
        status: "error",
        message: `API returned status ${response.status}`,
        details: `Attempted to connect to ${healthUrl}`,
        configUrl: "https://github.com/yourusername/factharbor#configuration",
      };
    }
  } catch (error: any) {
    return {
      service: "FH API Base URL",
      status: "error",
      message: `Failed to connect to API: ${error.message}`,
      details: `Attempted to connect to ${baseUrl}/health`,
      configUrl: "https://github.com/yourusername/factharbor#configuration",
    };
  }
}

function testFhAdminKey(): TestResult {
  const adminKey = process.env.FH_ADMIN_KEY;

  if (!adminKey) {
    return {
      service: "FH Admin Key",
      status: "not_configured",
      message: "FH_ADMIN_KEY is not set",
      configUrl: "https://github.com/yourusername/factharbor#configuration",
    };
  }

  if (adminKey.includes("PASTE") || adminKey === "your-admin-key-here") {
    return {
      service: "FH Admin Key",
      status: "error",
      message: "FH_ADMIN_KEY contains placeholder text",
      details: "Please replace with actual admin key",
      configUrl: "https://github.com/yourusername/factharbor#configuration",
    };
  }

  return {
    service: "FH Admin Key",
    status: "success",
    message: "FH_ADMIN_KEY is configured",
    details: `Key length: ${adminKey.length} characters`,
  };
}

function testFhInternalRunnerKey(): TestResult {
  const runnerKey = process.env.FH_INTERNAL_RUNNER_KEY;

  if (!runnerKey) {
    return {
      service: "FH Internal Runner Key",
      status: "not_configured",
      message: "FH_INTERNAL_RUNNER_KEY is not set",
      configUrl: "https://github.com/yourusername/factharbor#configuration",
    };
  }

  if (runnerKey.includes("PASTE") || runnerKey === "your-runner-key-here") {
    return {
      service: "FH Internal Runner Key",
      status: "error",
      message: "FH_INTERNAL_RUNNER_KEY contains placeholder text",
      details: "Please replace with actual runner key",
      configUrl: "https://github.com/yourusername/factharbor#configuration",
    };
  }

  return {
    service: "FH Internal Runner Key",
    status: "success",
    message: "FH_INTERNAL_RUNNER_KEY is configured",
    details: `Key length: ${runnerKey.length} characters`,
  };
}

async function testOpenAI(plan: LlmProviderTestPlan): Promise<TestResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!plan.shouldTest) {
    return {
      service: "OpenAI",
      status: "skipped",
      message: "Not used by the active default pipeline config",
      configUrl: "https://platform.openai.com/api-keys",
    };
  }

  if (!apiKey) {
    return {
      service: "OpenAI",
      status: "not_configured",
      message: "OPENAI_API_KEY is not set",
      details: combineDetails(undefined, plan),
      configUrl: "https://platform.openai.com/api-keys",
    };
  }

  if (apiKey.includes("PASTE") || apiKey === "sk-...") {
    return {
      service: "OpenAI",
      status: "error",
      message: "OPENAI_API_KEY contains placeholder text",
      details: combineDetails(undefined, plan),
      configUrl: "https://platform.openai.com/api-keys",
    };
  }

  try {
    const result = await runWithAbortTimeout(
      (abortSignal) => generateText({
        model: openai("gpt-4o-mini"),
        prompt: "Reply with just the word 'OK'",
        maxOutputTokens: 20,  // OpenAI minimum is 16
        maxRetries: 0,
        abortSignal,
      }),
      LLM_TEST_TIMEOUT_MS,
      "OpenAI test",
    );

    return {
      service: "OpenAI",
      status: "success",
      message: "OpenAI API key is valid",
      details: combineDetails(`Test response: ${result.text}`, plan),
      configUrl: "https://platform.openai.com/api-keys",
    };
  } catch (error: any) {
    return {
      ...formatLlmTestFailure("OpenAI", error, plan),
      configUrl: "https://platform.openai.com/api-keys",
    };
  }
}

async function testAnthropic(plan: LlmProviderTestPlan): Promise<TestResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!plan.shouldTest) {
    return {
      service: "Anthropic",
      status: "skipped",
      message: "Not used by the active default pipeline config",
      configUrl: "https://console.anthropic.com/settings/keys",
    };
  }

  if (!apiKey) {
    return {
      service: "Anthropic",
      status: "not_configured",
      message: "ANTHROPIC_API_KEY is not set",
      details: combineDetails(undefined, plan),
      configUrl: "https://console.anthropic.com/settings/keys",
    };
  }

  if (apiKey.includes("PASTE") || apiKey === "sk-ant-...") {
    return {
      service: "Anthropic",
      status: "error",
      message: "ANTHROPIC_API_KEY contains placeholder text",
      details: combineDetails(undefined, plan),
      configUrl: "https://console.anthropic.com/settings/keys",
    };
  }

  try {
    const result = await runWithAbortTimeout(
      (abortSignal) => generateText({
        model: anthropic(ANTHROPIC_MODELS.budget.modelId),
        prompt: "Reply with just the word 'OK'",
        maxOutputTokens: 10,
        maxRetries: 0,
        abortSignal,
      }),
      LLM_TEST_TIMEOUT_MS,
      "Anthropic test",
    );

    return {
      service: "Anthropic",
      status: "success",
      message: "Anthropic API key is valid",
      details: combineDetails(`Test response: ${result.text}`, plan),
      configUrl: "https://console.anthropic.com/settings/keys",
    };
  } catch (error: any) {
    return {
      ...formatLlmTestFailure("Anthropic", error, plan),
      configUrl: "https://console.anthropic.com/settings/keys",
    };
  }
}

async function testGoogle(plan: LlmProviderTestPlan): Promise<TestResult> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!plan.shouldTest) {
    return {
      service: "Google Generative AI",
      status: "skipped",
      message: "Not used by the active default pipeline config",
      configUrl: "https://aistudio.google.com/app/apikey",
    };
  }

  if (!apiKey) {
    return {
      service: "Google Generative AI",
      status: "not_configured",
      message: "GOOGLE_GENERATIVE_AI_API_KEY is not set",
      details: combineDetails(undefined, plan),
      configUrl: "https://aistudio.google.com/app/apikey",
    };
  }

  if (apiKey.includes("PASTE") || apiKey === "AIza...") {
    return {
      service: "Google Generative AI",
      status: "error",
      message: "GOOGLE_GENERATIVE_AI_API_KEY contains placeholder text",
      details: combineDetails(undefined, plan),
      configUrl: "https://aistudio.google.com/app/apikey",
    };
  }

  try {
    const result = await runWithAbortTimeout(
      (abortSignal) => generateText({
        model: google("gemini-1.5-flash"),
        prompt: "Reply with just the word 'OK'",
        maxOutputTokens: 10,
        maxRetries: 0,
        abortSignal,
      }),
      LLM_TEST_TIMEOUT_MS,
      "Google Generative AI test",
    );

    return {
      service: "Google Generative AI",
      status: "success",
      message: "Google API key is valid",
      details: combineDetails(`Test response: ${result.text}`, plan),
      configUrl: "https://aistudio.google.com/app/apikey",
    };
  } catch (error: any) {
    return {
      ...formatLlmTestFailure("Google Generative AI", error, plan),
      configUrl: "https://aistudio.google.com/app/apikey",
    };
  }
}

async function testMistral(plan: LlmProviderTestPlan): Promise<TestResult> {
  const apiKey = process.env.MISTRAL_API_KEY;

  if (!plan.shouldTest) {
    return {
      service: "Mistral AI",
      status: "skipped",
      message: "Not used by the active default pipeline config",
      configUrl: "https://console.mistral.ai/api-keys",
    };
  }

  if (!apiKey) {
    return {
      service: "Mistral AI",
      status: "not_configured",
      message: "MISTRAL_API_KEY is not set",
      details: combineDetails(undefined, plan),
      configUrl: "https://console.mistral.ai/api-keys",
    };
  }

  if (apiKey.includes("PASTE")) {
    return {
      service: "Mistral AI",
      status: "error",
      message: "MISTRAL_API_KEY contains placeholder text",
      details: combineDetails(undefined, plan),
      configUrl: "https://console.mistral.ai/api-keys",
    };
  }

  try {
    const result = await runWithAbortTimeout(
      (abortSignal) => generateText({
        model: mistral("mistral-small-latest"),
        prompt: "Reply with just the word 'OK'",
        maxOutputTokens: 10,
        maxRetries: 0,
        abortSignal,
      }),
      LLM_TEST_TIMEOUT_MS,
      "Mistral test",
    );

    return {
      service: "Mistral AI",
      status: "success",
      message: "Mistral API key is valid",
      details: combineDetails(`Test response: ${result.text}`, plan),
      configUrl: "https://console.mistral.ai/api-keys",
    };
  } catch (error: any) {
    return {
      ...formatLlmTestFailure("Mistral AI", error, plan),
      configUrl: "https://console.mistral.ai/api-keys",
    };
  }
}

async function testSerpApi(shouldTest: boolean): Promise<TestResult> {
  const apiKey = process.env.SERPAPI_API_KEY;

  if (!shouldTest) {
    return {
      service: "SerpAPI",
      status: "skipped",
      message: "Search disabled or different provider selected",
      configUrl: "https://serpapi.com/manage-api-key",
    };
  }

  if (!apiKey) {
    return {
      service: "SerpAPI",
      status: "not_configured",
      message: "SERPAPI_API_KEY is not set",
      configUrl: "https://serpapi.com/manage-api-key",
    };
  }

  if (apiKey.includes("PASTE")) {
    return {
      service: "SerpAPI",
      status: "error",
      message: "SERPAPI_API_KEY contains placeholder text",
      configUrl: "https://serpapi.com/manage-api-key",
    };
  }

  try {
    // Use the account endpoint — validates the key without burning a search credit
    const url = `https://serpapi.com/account.json?api_key=${apiKey}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        service: "SerpAPI",
        status: "error",
        message: `SerpAPI returned status ${response.status}`,
        details: errorText.substring(0, 200),
        configUrl: "https://serpapi.com/manage-api-key",
      };
    }

    const data = await response.json();
    const remaining = data.total_searches_left ?? "unknown";

    return {
      service: "SerpAPI",
      status: "success",
      message: "SerpAPI key is valid",
      details: `Searches remaining: ${remaining}`,
      configUrl: "https://serpapi.com/manage-api-key",
    };
  } catch (error: any) {
    return {
      service: "SerpAPI",
      status: "error",
      message: `SerpAPI error: ${error.message}`,
      details: error.stack,
      configUrl: "https://serpapi.com/manage-api-key",
    };
  }
}

async function testGoogleCse(shouldTest: boolean): Promise<TestResult> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cx = process.env.GOOGLE_CSE_ID;

  if (!shouldTest) {
    return {
      service: "Google Custom Search",
      status: "skipped",
      message: "Search disabled or different provider selected",
      configUrl: "https://developers.google.com/custom-search/v1/introduction",
    };
  }

  if (!apiKey || !cx) {
    return {
      service: "Google Custom Search",
      status: "not_configured",
      message: "GOOGLE_CSE_API_KEY or GOOGLE_CSE_ID is not set",
      configUrl: "https://developers.google.com/custom-search/v1/introduction",
    };
  }

  if (apiKey.includes("PASTE") || cx.includes("PASTE")) {
    return {
      service: "Google Custom Search",
      status: "error",
      message: "GOOGLE_CSE_API_KEY or GOOGLE_CSE_ID contains placeholder text",
      configUrl: "https://developers.google.com/custom-search/v1/introduction",
    };
  }

  // Skip live call if circuit breaker is OPEN — saves daily quota
  const gcseCircuit = getProviderStats("google-cse");
  if (gcseCircuit && gcseCircuit.state === "open") {
    return {
      service: "Google Custom Search",
      status: "warning",
      message: "Google CSE circuit breaker is OPEN (skipped live test to save quota). Fallback providers active.",
      details: `${gcseCircuit.consecutiveFailures} consecutive failures. Credentials are configured.`,
      configUrl: "https://developers.google.com/custom-search/v1/introduction",
    };
  }

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=test&num=1`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });

    if (response.status === 429) {
      return {
        service: "Google Custom Search",
        status: "warning",
        message: "Google CSE daily quota exceeded. Credentials valid — fallback providers will handle searches.",
        details: "Quota resets at midnight Pacific time. This is normal under heavy usage.",
        configUrl: "https://developers.google.com/custom-search/v1/introduction",
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      return {
        service: "Google Custom Search",
        status: "error",
        message: `Google CSE returned status ${response.status}`,
        details: errorText.substring(0, 200),
        configUrl: "https://developers.google.com/custom-search/v1/introduction",
      };
    }

    const data = await response.json();

    return {
      service: "Google Custom Search",
      status: "success",
      message: "Google CSE credentials are valid",
      details: `Test search returned ${data.items?.length || 0} results`,
      configUrl: "https://developers.google.com/custom-search/v1/introduction",
    };
  } catch (error: any) {
    return {
      service: "Google Custom Search",
      status: "error",
      message: `Google CSE error: ${error.message}`,
      details: error.stack,
      configUrl: "https://developers.google.com/custom-search/v1/introduction",
    };
  }
}

async function testBrave(shouldTest: boolean): Promise<TestResult> {
  const apiKey = process.env.BRAVE_API_KEY;

  if (!shouldTest) {
    return {
      service: "Brave Search API",
      status: "skipped",
      message: "Search disabled or different provider selected",
      configUrl: "https://api-dashboard.search.brave.com",
    };
  }

  if (!apiKey) {
    return {
      service: "Brave Search API",
      status: "not_configured",
      message: "BRAVE_API_KEY is not set",
      configUrl: "https://api-dashboard.search.brave.com",
    };
  }

  if (apiKey.includes("PASTE")) {
    return {
      service: "Brave Search API",
      status: "error",
      message: "BRAVE_API_KEY contains placeholder text",
      configUrl: "https://api-dashboard.search.brave.com",
    };
  }

  // Skip live call if circuit breaker is OPEN — saves search credits
  const braveCircuit = getProviderStats("brave");
  if (braveCircuit && braveCircuit.state === "open") {
    return {
      service: "Brave Search API",
      status: "warning",
      message: "Brave circuit breaker is OPEN (skipped live test to save credits). Fallback providers active.",
      details: `${braveCircuit.consecutiveFailures} consecutive failures. Key is configured.`,
      configUrl: "https://api-dashboard.search.brave.com",
    };
  }

  try {
    // Use count=1 to minimize credit usage; detect 402 as quota exhaustion
    const url = "https://api.search.brave.com/res/v1/web/search?q=test&count=1";
    const response = await fetch(url, {
      headers: {
        "X-Subscription-Token": apiKey,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (response.status === 402) {
      let quotaDetails = "Usage limit exceeded";
      try {
        const errData = await response.json();
        const meta = errData?.error?.meta;
        if (meta) {
          quotaDetails = `Spend: $${meta.current_spend}/$${meta.usage_limit} (${meta.plan} plan)`;
        }
      } catch { /* ignore parse error */ }
      return {
        service: "Brave Search API",
        status: "warning",
        message: "Brave quota exhausted. Credentials valid — other fallback providers will handle searches.",
        details: quotaDetails,
        configUrl: "https://api-dashboard.search.brave.com",
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      return {
        service: "Brave Search API",
        status: "error",
        message: `Brave returned status ${response.status}`,
        details: errorText.substring(0, 200),
        configUrl: "https://api-dashboard.search.brave.com",
      };
    }

    const data = await response.json();

    return {
      service: "Brave Search API",
      status: "success",
      message: "Brave API key is valid",
      details: `Test search returned ${data.web?.results?.length || 0} results`,
      configUrl: "https://api-dashboard.search.brave.com",
    };
  } catch (error: any) {
    return {
      service: "Brave Search API",
      status: "error",
      message: `Brave error: ${error.message}`,
      details: error.stack,
      configUrl: "https://api-dashboard.search.brave.com",
    };
  }
}

async function testSerper(shouldTest: boolean): Promise<TestResult> {
  const apiKey = process.env.SERPER_API_KEY;

  if (!shouldTest) {
    return {
      service: "Serper",
      status: "skipped",
      message: "Search disabled or different provider selected",
      configUrl: "https://serper.dev/api-key",
    };
  }

  if (!apiKey) {
    return {
      service: "Serper",
      status: "not_configured",
      message: "SERPER_API_KEY is not set",
      configUrl: "https://serper.dev/api-key",
    };
  }

  if (apiKey.includes("PASTE")) {
    return {
      service: "Serper",
      status: "error",
      message: "SERPER_API_KEY contains placeholder text",
      configUrl: "https://serper.dev/api-key",
    };
  }

  // Skip live call if circuit breaker is OPEN — saves search credits
  const serperCircuit = getProviderStats("serper");
  if (serperCircuit && serperCircuit.state === "open") {
    return {
      service: "Serper",
      status: "warning",
      message: "Serper circuit breaker is OPEN (skipped live test to save credits). Fallback providers active.",
      details: `${serperCircuit.consecutiveFailures} consecutive failures. Key is configured.`,
      configUrl: "https://serper.dev/api-key",
    };
  }

  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: "test", num: 1 }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        service: "Serper",
        status: "error",
        message: `Serper returned status ${response.status}`,
        details: errorText.substring(0, 200),
        configUrl: "https://serper.dev/api-key",
      };
    }

    const data = await response.json();

    return {
      service: "Serper",
      status: "success",
      message: "Serper API key is valid",
      details: `Test search returned ${data.organic?.length || 0} results`,
      configUrl: "https://serper.dev/api-key",
    };
  } catch (error: any) {
    return {
      service: "Serper",
      status: "error",
      message: `Serper error: ${error.message}`,
      details: error.stack,
      configUrl: "https://serper.dev/api-key",
    };
  }
}

async function testSearchCache(shouldTest: boolean): Promise<TestResult> {
  if (!shouldTest) {
    return {
      service: "Search Cache",
      status: "skipped",
      message: "Search disabled",
    };
  }

  try {
    const stats = await getCacheStats();

    const statusMessage = stats.validEntries > 0
      ? `${stats.validEntries} cached queries (${stats.totalQueries} unique)`
      : "Cache is empty (no queries cached yet)";

    const hitRate = stats.validEntries > 0
      ? Math.round((stats.validEntries / (stats.validEntries + stats.expiredEntries)) * 100)
      : 0;

    return {
      service: "Search Cache",
      status: "success",
      message: statusMessage,
      details: `Hit rate: ~${hitRate}% | DB size: ${(stats.dbSizeBytes || 0) / 1024}KB`,
    };
  } catch (error: any) {
    return {
      service: "Search Cache",
      status: "error",
      message: `Cache error: ${error.message}`,
      details: error.stack,
    };
  }
}

async function testSearchCircuitBreaker(shouldTest: boolean): Promise<TestResult> {
  if (!shouldTest) {
    return {
      service: "Search Circuit Breaker",
      status: "skipped",
      message: "Search disabled",
    };
  }

  try {
    const providerStats = getAllProviderStats();

    const openCircuits = providerStats.filter((p) => p.state === "open");
    const halfOpenCircuits = providerStats.filter((p) => p.state === "half_open");
    const healthyCircuits = providerStats.filter((p) => p.state === "closed");

    if (openCircuits.length > 0) {
      const allOpen = healthyCircuits.length === 0;
      return {
        service: "Search Circuit Breaker",
        status: allOpen ? "error" : "warning",
        message: allOpen
          ? `All ${openCircuits.length} provider(s) circuit OPEN — no healthy fallbacks`
          : `${openCircuits.length} provider(s) circuit OPEN — ${healthyCircuits.length} healthy provider(s) available`,
        details: openCircuits.map((p) => `${p.provider}: ${p.consecutiveFailures} failures`).join(", "),
      };
    }

    if (halfOpenCircuits.length > 0) {
      return {
        service: "Search Circuit Breaker",
        status: "success",
        message: `${halfOpenCircuits.length} provider(s) testing recovery`,
        details: halfOpenCircuits.map((p) => `${p.provider}: HALF_OPEN`).join(", "),
      };
    }

    const totalRequests = providerStats.reduce((sum, p) => sum + p.totalRequests, 0);

    if (totalRequests === 0) {
      return {
        service: "Search Circuit Breaker",
        status: "success",
        message: "All circuits healthy (no requests yet)",
      };
    }

    const summary = providerStats
      .filter((p) => p.totalRequests > 0)
      .map((p) => `${p.provider}: ${Math.round(p.successRate * 100)}%`)
      .join(", ");

    return {
      service: "Search Circuit Breaker",
      status: "success",
      message: "All circuits closed (healthy)",
      details: `Success rates: ${summary}`,
    };
  } catch (error: any) {
    return {
      service: "Search Circuit Breaker",
      status: "error",
      message: `Circuit breaker error: ${error.message}`,
      details: error.stack,
    };
  }
}
