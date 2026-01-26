import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { runFactHarborAnalysis } from "@/lib/analyzer";

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

    if (!fs.existsSync(configPath)) {
      throw new Error(`Missing config file: ${configPath}`);
    }

    const config = JSON.parse(fs.readFileSync(configPath, "utf-8")) as LlmIntegrationConfig;

    if (!config.enabled) {
      return;
    }

    const outputDir = path.join(webRoot, config.outputDir ?? "test/output");
    fs.mkdirSync(outputDir, { recursive: true });
    const runId = new Date().toISOString().replace(/[:.]/g, "-");

    for (const provider of config.providers) {
      process.env.LLM_PROVIDER = provider;

      const result = await runFactHarborAnalysis({
        inputType: config.inputType,
        inputValue: config.inputValue
      });

      expect(result.reportMarkdown.length).toBeGreaterThan(0);

      const safeProvider = provider.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
      const outPath = path.join(outputDir, `${safeProvider}-${runId}.md`);
      fs.writeFileSync(outPath, result.reportMarkdown, "utf-8");
    }
  }, 10 * 60 * 1000);
});
