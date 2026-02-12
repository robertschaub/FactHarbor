import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { DEFAULT_PIPELINE_CONFIG, type PipelineConfig } from "@/lib/config-schemas";

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

describe.sequential("llm integration", () => {
  it("generates markdown reports per provider from config", async () => {
    const webRoot = path.resolve(__dirname, "../../..");
    const configPath = path.join(webRoot, "test", "config", "llm-providers.json");
    const envPath = path.join(webRoot, ".env.local");

    loadEnvFile(envPath);

    // Skip on CI - this test requires real LLM calls
    if (process.env.CI === "true") {
      console.warn("[LLM Integration] Skipping on CI - requires real LLM calls");
      return;
    }

    if (!fs.existsSync(configPath)) {
      throw new Error(`Missing config file: ${configPath}`);
    }

    const config = JSON.parse(fs.readFileSync(configPath, "utf-8")) as LlmIntegrationConfig;

    if (!config.enabled) {
      return;
    }

    // Skip when no LLM API keys are available
    const hasApiKey =
      !!process.env.OPENAI_API_KEY ||
      !!process.env.ANTHROPIC_API_KEY ||
      !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!hasApiKey) {
      console.warn("[LLM Integration] No API keys found, skipping");
      return;
    }

    const outputDir = path.join(webRoot, config.outputDir ?? "test/output");
    fs.mkdirSync(outputDir, { recursive: true });
    const runId = new Date().toISOString().replace(/[:.]/g, "-");
    const configDbPath = path.join(outputDir, "config-llm-integration.db");

    process.env.FH_CONFIG_DB_PATH = configDbPath;

    const { runFactHarborAnalysis } = await import("@/lib/analyzer");
    const { saveConfigBlob, activateConfig, closeConfigDb } = await import("@/lib/config-storage");
    const { invalidateConfigCache } = await import("@/lib/config-loader");

    const normalizeProvider = (provider: string): PipelineConfig["llmProvider"] => {
      const p = provider.toLowerCase().trim();
      if (p === "anthropic" || p === "claude") return "anthropic";
      if (p === "google" || p === "gemini") return "google";
      if (p === "mistral") return "mistral";
      return "openai";
    };

    const setPipelineProvider = async (provider: string) => {
      const pipelineConfig: PipelineConfig = {
        ...DEFAULT_PIPELINE_CONFIG,
        llmProvider: normalizeProvider(provider),
      };
      const { blob } = await saveConfigBlob(
        "pipeline",
        "default",
        JSON.stringify(pipelineConfig, null, 2),
        `llm-integration-${provider}`,
        "test",
      );
      await activateConfig("pipeline", "default", blob.contentHash, "test", "llm-integration");
      invalidateConfigCache("pipeline", "default");
    };

    for (const provider of config.providers) {
      await setPipelineProvider(provider);

      const result = await runFactHarborAnalysis({
        inputType: config.inputType,
        inputValue: config.inputValue
      });

      expect(result.reportMarkdown.length).toBeGreaterThan(0);

      const safeProvider = provider.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
      const outPath = path.join(outputDir, `${safeProvider}-${runId}.md`);
      fs.writeFileSync(outPath, result.reportMarkdown, "utf-8");
    }

    await closeConfigDb();
  }, 10 * 60 * 1000);
});
