#!/usr/bin/env npx tsx
/**
 * Regenerate calibration HTML reports from existing JSON artifacts.
 *
 * Purpose:
 * - Apply latest report rendering improvements (e.g., significance notices)
 * - Keep historical JSON immutable while refreshing presentation
 *
 * Usage:
 *   npx tsx scripts/refresh-bias-report-html.ts
 */

import fs from "fs";
import path from "path";
import { generateCalibrationReport } from "../src/lib/calibration/report-generator";
import type { CalibrationRunResult } from "../src/lib/calibration/types";

const REPORT_DIR = path.resolve(__dirname, "../test/output/bias");

function ensureLegacyCompatibility(data: CalibrationRunResult): CalibrationRunResult {
  const am = data.aggregateMetrics;
  if (am.failureModes) {
    return data;
  }

  return {
    ...data,
    aggregateMetrics: {
      ...am,
      failureModes: {
        meanRefusalRateDelta: 0,
        maxRefusalRateDelta: 0,
        meanDegradationRateDelta: 0,
        maxDegradationRateDelta: 0,
        asymmetryPairCount: 0,
        byDomain: {},
        byProvider: {},
        byStage: {},
      },
    },
  };
}

function main(): void {
  if (!fs.existsSync(REPORT_DIR)) {
    console.error(`Report directory not found: ${REPORT_DIR}`);
    process.exit(1);
  }

  const jsonFiles = fs
    .readdirSync(REPORT_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();

  console.log(`Found ${jsonFiles.length} calibration JSON report(s) in ${REPORT_DIR}`);
  if (jsonFiles.length === 0) return;

  for (const jsonFile of jsonFiles) {
    const jsonPath = path.join(REPORT_DIR, jsonFile);
    const htmlPath = jsonPath.replace(/\.json$/, ".html");

    const data = ensureLegacyCompatibility(
      JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as CalibrationRunResult,
    );
    const html = generateCalibrationReport(data);
    fs.writeFileSync(htmlPath, html, "utf-8");

    console.log(`  regenerated: ${path.basename(htmlPath)}`);
  }

  console.log("Done.");
}

main();
