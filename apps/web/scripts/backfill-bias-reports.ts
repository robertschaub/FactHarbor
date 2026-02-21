#!/usr/bin/env npx tsx
/**
 * Backfill script: adds resolvedLLM and resolvedSearch to existing
 * calibration JSON reports and regenerates their HTML files.
 *
 * Uses the shared resolveLLMConfig() from the runner module —
 * no duplicated model resolution logic.
 *
 * Usage: npx tsx scripts/backfill-bias-reports.ts
 */

import fs from "fs";
import path from "path";
import { generateCalibrationReport } from "../src/lib/calibration/report-generator";
import { resolveLLMConfig } from "../src/lib/calibration/runner";
import type { PipelineConfig } from "../src/lib/config-schemas";
import type { CalibrationRunResult } from "../src/lib/calibration/types";

const REPORT_DIR = path.resolve(__dirname, "../test/output/bias");

function resolveSearchFromBlob(
  search: Record<string, unknown>,
): CalibrationRunResult["configSnapshot"]["resolvedSearch"] {
  const providerMode = String(search.provider ?? "auto");
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
      const pipe = data.configSnapshot.pipeline as PipelineConfig;
      data.configSnapshot.resolvedLLM = resolveLLMConfig(pipe);
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
