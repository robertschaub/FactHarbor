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
import { getConfig } from "@/lib/config-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TestResult = {
  service: string;
  status: "success" | "error" | "not_configured" | "skipped";
  message: string;
  configUrl?: string;
  details?: string;
};

export async function GET(request: NextRequest) {
  const results: TestResult[] = [];

  // Test FH API Base URL
  results.push(await testFhApiBaseUrl());

  // Test FH Admin Key
  results.push(testFhAdminKey());

  // Test FH Internal Runner Key
  results.push(testFhInternalRunnerKey());

  // Test LLM Providers
  let llmProvider = "anthropic";
  try {
    const pipelineConfigResult = await getConfig("pipeline", "default");
    llmProvider = pipelineConfigResult.config.llmProvider ?? llmProvider;
  } catch {
    // Fall back to default if config load fails.
  }
  const llmProviderLower = llmProvider.toLowerCase();

  results.push(await testOpenAI(llmProviderLower === "openai"));
  results.push(await testAnthropic(llmProviderLower === "anthropic"));
  results.push(await testGoogle(llmProviderLower === "google"));
  results.push(await testMistral(llmProviderLower === "mistral"));

  // Test Search Providers
  const searchConfigResult = await getConfig("search", "default");
  const searchEnabled = searchConfigResult.config.enabled;
  const searchProvider = searchConfigResult.config.provider;

  results.push(await testSerpApi(searchEnabled && (searchProvider === "serpapi" || searchProvider === "auto")));
  results.push(await testGoogleCse(searchEnabled && (searchProvider === "google-cse" || searchProvider === "auto")));

  // Summary
  const summary = {
    total: results.length,
    success: results.filter(r => r.status === "success").length,
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

async function testOpenAI(shouldTest: boolean): Promise<TestResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!shouldTest) {
    return {
      service: "OpenAI",
      status: "skipped",
      message: "Not selected as pipeline.llmProvider",
      configUrl: "https://platform.openai.com/api-keys",
    };
  }

  if (!apiKey) {
    return {
      service: "OpenAI",
      status: "not_configured",
      message: "OPENAI_API_KEY is not set",
      configUrl: "https://platform.openai.com/api-keys",
    };
  }

  if (apiKey.includes("PASTE") || apiKey === "sk-...") {
    return {
      service: "OpenAI",
      status: "error",
      message: "OPENAI_API_KEY contains placeholder text",
      configUrl: "https://platform.openai.com/api-keys",
    };
  }

  try {
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: "Reply with just the word 'OK'",
      maxOutputTokens: 20,  // OpenAI minimum is 16
    });

    return {
      service: "OpenAI",
      status: "success",
      message: "OpenAI API key is valid",
      details: `Test response: ${result.text}`,
      configUrl: "https://platform.openai.com/api-keys",
    };
  } catch (error: any) {
    return {
      service: "OpenAI",
      status: "error",
      message: `OpenAI API error: ${error.message}`,
      details: error.stack,
      configUrl: "https://platform.openai.com/api-keys",
    };
  }
}

async function testAnthropic(shouldTest: boolean): Promise<TestResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!shouldTest) {
    return {
      service: "Anthropic",
      status: "skipped",
      message: "Not selected as pipeline.llmProvider",
      configUrl: "https://console.anthropic.com/settings/keys",
    };
  }

  if (!apiKey) {
    return {
      service: "Anthropic",
      status: "not_configured",
      message: "ANTHROPIC_API_KEY is not set",
      configUrl: "https://console.anthropic.com/settings/keys",
    };
  }

  if (apiKey.includes("PASTE") || apiKey === "sk-ant-...") {
    return {
      service: "Anthropic",
      status: "error",
      message: "ANTHROPIC_API_KEY contains placeholder text",
      configUrl: "https://console.anthropic.com/settings/keys",
    };
  }

  try {
    const result = await generateText({
      model: anthropic("claude-3-5-haiku-20241022"),
      prompt: "Reply with just the word 'OK'",
      maxOutputTokens: 10,
    });

    return {
      service: "Anthropic",
      status: "success",
      message: "Anthropic API key is valid",
      details: `Test response: ${result.text}`,
      configUrl: "https://console.anthropic.com/settings/keys",
    };
  } catch (error: any) {
    return {
      service: "Anthropic",
      status: "error",
      message: `Anthropic API error: ${error.message}`,
      details: error.stack,
      configUrl: "https://console.anthropic.com/settings/keys",
    };
  }
}

async function testGoogle(shouldTest: boolean): Promise<TestResult> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!shouldTest) {
    return {
      service: "Google Generative AI",
      status: "skipped",
      message: "Not selected as pipeline.llmProvider",
      configUrl: "https://aistudio.google.com/app/apikey",
    };
  }

  if (!apiKey) {
    return {
      service: "Google Generative AI",
      status: "not_configured",
      message: "GOOGLE_GENERATIVE_AI_API_KEY is not set",
      configUrl: "https://aistudio.google.com/app/apikey",
    };
  }

  if (apiKey.includes("PASTE") || apiKey === "AIza...") {
    return {
      service: "Google Generative AI",
      status: "error",
      message: "GOOGLE_GENERATIVE_AI_API_KEY contains placeholder text",
      configUrl: "https://aistudio.google.com/app/apikey",
    };
  }

  try {
    const result = await generateText({
      model: google("gemini-1.5-flash"),
      prompt: "Reply with just the word 'OK'",
      maxOutputTokens: 10,
    });

    return {
      service: "Google Generative AI",
      status: "success",
      message: "Google API key is valid",
      details: `Test response: ${result.text}`,
      configUrl: "https://aistudio.google.com/app/apikey",
    };
  } catch (error: any) {
    return {
      service: "Google Generative AI",
      status: "error",
      message: `Google API error: ${error.message}`,
      details: error.stack,
      configUrl: "https://aistudio.google.com/app/apikey",
    };
  }
}

async function testMistral(shouldTest: boolean): Promise<TestResult> {
  const apiKey = process.env.MISTRAL_API_KEY;

  if (!shouldTest) {
    return {
      service: "Mistral AI",
      status: "skipped",
      message: "Not selected as pipeline.llmProvider",
      configUrl: "https://console.mistral.ai/api-keys",
    };
  }

  if (!apiKey) {
    return {
      service: "Mistral AI",
      status: "not_configured",
      message: "MISTRAL_API_KEY is not set",
      configUrl: "https://console.mistral.ai/api-keys",
    };
  }

  if (apiKey.includes("PASTE")) {
    return {
      service: "Mistral AI",
      status: "error",
      message: "MISTRAL_API_KEY contains placeholder text",
      configUrl: "https://console.mistral.ai/api-keys",
    };
  }

  try {
    const result = await generateText({
      model: mistral("mistral-small-latest"),
      prompt: "Reply with just the word 'OK'",
      maxOutputTokens: 10,
    });

    return {
      service: "Mistral AI",
      status: "success",
      message: "Mistral API key is valid",
      details: `Test response: ${result.text}`,
      configUrl: "https://console.mistral.ai/api-keys",
    };
  } catch (error: any) {
    return {
      service: "Mistral AI",
      status: "error",
      message: `Mistral API error: ${error.message}`,
      details: error.stack,
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
    const url = `https://serpapi.com/search.json?engine=google&q=test&num=1&api_key=${apiKey}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
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

    return {
      service: "SerpAPI",
      status: "success",
      message: "SerpAPI key is valid",
      details: `Test search returned ${data.organic_results?.length || 0} results`,
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

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=test&num=1`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

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
