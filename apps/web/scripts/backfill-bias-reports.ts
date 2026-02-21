#!/usr/bin/env npx tsx
/**
 * Backfill script: adds resolvedLLM and resolvedSearch to existing
 * calibration JSON reports and regenerates their HTML files.
 *
 * Usage: npx tsx scripts/backfill-bias-reports.ts
 */

import fs from "fs";
import path from "path";
import { generateCalibrationReport } from "../src/lib/calibration/report-generator";
import { DEBATE_PROFILES } from "../src/lib/config-schemas";
import type { CalibrationRunResult } from "../src/lib/calibration/types";

const REPORT_DIR = path.resolve(__dirname, "../test/output/bias");

// Same model resolution logic as runner.ts
function resolveModelName(
  tier: string,
  roleProvider: string,
  tiering: boolean,
  modelUnderstand: string,
  modelVerdict: string,
): string {
  const isPremium = tier === "sonnet";
  const p = (roleProvider || "").toLowerCase();

  if (p === "anthropic" || p === "claude") {
    if (!tiering) return modelVerdict;
    return isPremium ? modelVerdict : modelUnderstand;
  }
  if (p === "openai") return isPremium ? "gpt-4.1" : "gpt-4.1-mini";
  if (p === "google" || p === "gemini") return isPremium ? "gemini-2.5-pro" : "gemini-2.5-flash";
  if (p === "mistral") return isPremium ? "mistral-large-latest" : "mistral-small-latest";
  return isPremium ? modelVerdict : modelUnderstand;
}

function resolveFromPipelineBlob(
  pipe: Record<string, unknown>,
): CalibrationRunResult["configSnapshot"]["resolvedLLM"] {
  const provider = String(pipe.llmProvider ?? "anthropic");
  const tiering = Boolean(pipe.llmTiering ?? false);
  const modelUnderstand = String(pipe.modelUnderstand ?? "claude-haiku-4-5-20251001");
  const modelExtractEvidence = String(pipe.modelExtractEvidence ?? "claude-haiku-4-5-20251001");
  const modelVerdict = String(pipe.modelVerdict ?? "claude-sonnet-4-5-20250929");
  const debateProfile = String(pipe.debateProfile ?? "baseline");

  const profile =
    DEBATE_PROFILES[debateProfile as keyof typeof DEBATE_PROFILES] ??
    DEBATE_PROFILES.baseline;
  const explicitTiers = pipe.debateModelTiers as Record<string, string> | undefined;
  const explicitProviders = pipe.debateModelProviders as Record<string, string> | undefined;

  const roles = ["advocate", "selfConsistency", "challenger", "reconciler", "validation"] as const;
  const debateRoles: Record<string, { tier: string; provider: string; model: string }> = {};

  for (const role of roles) {
    const tier = explicitTiers?.[role] ?? profile.tiers[role] ?? "sonnet";
    const roleProvider = explicitProviders?.[role] ?? profile.providers[role] ?? provider;
    const model = resolveModelName(tier, roleProvider, tiering, modelUnderstand, modelVerdict);
    debateRoles[role] = { tier, provider: roleProvider, model };
  }

  return {
    provider,
    tiering,
    models: { understand: modelUnderstand, extractEvidence: modelExtractEvidence, verdict: modelVerdict },
    debateProfile,
    debateRoles,
  };
}

function resolveSearchFromBlob(
  search: Record<string, unknown>,
): CalibrationRunResult["configSnapshot"]["resolvedSearch"] {
  const providerMode = String(search.provider ?? "auto");
  // Cannot determine actual available providers from stored config alone,
  // but we can check what was recorded in the run results
  return { providerMode, configuredProviders: [] };
}

function main() {
  const jsonFiles = fs.readdirSync(REPORT_DIR).filter((f) => f.endsWith(".json"));

  console.log(`Found ${jsonFiles.length} JSON report(s) in ${REPORT_DIR}`);

  for (const jsonFile of jsonFiles) {
    const jsonPath = path.join(REPORT_DIR, jsonFile);
    const htmlPath = jsonPath.replace(/\.json$/, ".html");

    console.log(`\nProcessing: ${jsonFile}`);

    const data: CalibrationRunResult = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

    // Add resolvedLLM if missing
    if (!data.configSnapshot.resolvedLLM) {
      const pipe = data.configSnapshot.pipeline as Record<string, unknown>;
      data.configSnapshot.resolvedLLM = resolveFromPipelineBlob(pipe);
      console.log(`  + Added resolvedLLM (profile: ${data.configSnapshot.resolvedLLM.debateProfile})`);
    } else {
      console.log(`  = resolvedLLM already present`);
    }

    // Add resolvedSearch if missing
    if (!data.configSnapshot.resolvedSearch) {
      const search = data.configSnapshot.search as Record<string, unknown>;
      data.configSnapshot.resolvedSearch = resolveSearchFromBlob(search);

      // Try to extract actually-used providers from pair results
      const providers = new Set<string>();
      for (const pr of data.pairResults) {
        if (pr.status !== "completed") continue;
        for (const side of [pr.left, pr.right]) {
          const meta = (side.fullResultJson?.meta as Record<string, unknown>) ?? {};
          const sp = meta.searchProviders;
          if (typeof sp === "string" && sp) {
            sp.split(",").map((s: string) => s.trim()).filter(Boolean).forEach((s: string) => providers.add(s));
          }
        }
      }
      if (providers.size > 0) {
        data.configSnapshot.resolvedSearch.configuredProviders = [...providers];
      }
      console.log(`  + Added resolvedSearch (mode: ${data.configSnapshot.resolvedSearch.providerMode}, providers: [${data.configSnapshot.resolvedSearch.configuredProviders.join(", ")}])`);
    } else {
      console.log(`  = resolvedSearch already present`);
    }

    // Write updated JSON
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), "utf-8");
    console.log(`  → Updated JSON`);

    // Regenerate HTML
    const html = generateCalibrationReport(data);
    fs.writeFileSync(htmlPath, html, "utf-8");
    console.log(`  → Regenerated HTML`);
  }

  console.log("\nDone! All reports backfilled.");
}

main();
