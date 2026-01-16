import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { runFactHarborAnalysis } from "./analyzer";

type LlmIntegrationConfig = {
  enabled: boolean;
  inputType: "text" | "url";
  inputValue: string;
  providers: string[];
  outputDir?: string;
};

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf-8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
      process.env[key] = value;
    }
  }
}

function hasProviderCredentials(providerRaw: string): boolean {
  const p = (providerRaw || "").toLowerCase().trim();
  if (p === "openai") return Boolean(process.env.OPENAI_API_KEY);
  if (p === "claude" || p === "anthropic") return Boolean(process.env.ANTHROPIC_API_KEY);
  if (p === "mistral") return Boolean(process.env.MISTRAL_API_KEY);
  if (p === "google" || p === "gemini") {
    return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY);
  }
  // Unknown providers are treated as not-configured in CI.
  return false;
}

describe.sequential("llm integration", () => {
  it("generates markdown reports per provider from config", async () => {
    const webRoot = path.resolve(__dirname, "../..");
    const configPath = path.join(webRoot, "test-config", "llm-providers.json");
    const envPath = path.join(webRoot, ".env.local");

    loadEnvFile(envPath);

    if (!fs.existsSync(configPath)) {
      throw new Error(`Missing config file: ${configPath}`);
    }

    const config = JSON.parse(fs.readFileSync(configPath, "utf-8")) as LlmIntegrationConfig;

    if (!config.enabled) {
      return;
    }

    // Keep this integration test hermetic by default: only run providers when credentials are available.
    const runnableProviders = (config.providers || []).filter(hasProviderCredentials);
    if (runnableProviders.length === 0) {
      // No secrets in CI/local by default; treat as a skip-with-success.
      return;
    }

    // Avoid depending on web-search API keys during LLM-only integration checks.
    process.env.FH_SEARCH_ENABLED = "false";
    process.env.FH_ALLOW_MODEL_KNOWLEDGE = "true";
    process.env.FH_DETERMINISTIC = "true";

    const shouldWriteOutput =
      (process.env.FH_LLM_INTEGRATION_WRITE_OUTPUT ?? "").toLowerCase().trim() === "true" ||
      (process.env.FH_LLM_INTEGRATION_WRITE_OUTPUT ?? "").toLowerCase().trim() === "1";

    const outputDir = path.join(webRoot, config.outputDir ?? "test-output");
    const runId = new Date().toISOString().replace(/[:.]/g, "-");
    if (shouldWriteOutput) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const provider of runnableProviders) {
      process.env.LLM_PROVIDER = provider;

      const result = await runFactHarborAnalysis({
        inputType: config.inputType,
        inputValue: config.inputValue
      });

      expect(result.reportMarkdown.length).toBeGreaterThan(0);

      if (shouldWriteOutput) {
        const safeProvider = provider.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
        const outPath = path.join(outputDir, `${safeProvider}-${runId}.md`);
        fs.writeFileSync(outPath, result.reportMarkdown, "utf-8");
      }
    }
  }, 10 * 60 * 1000);
});
