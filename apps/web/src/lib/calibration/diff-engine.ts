/**
 * Political Bias Calibration — Diff Engine
 *
 * Compares two calibration run results to show the impact
 * of UCM parameter changes on bias metrics.
 *
 * @module calibration/diff-engine
 */

import type {
  CalibrationRunResult,
  CalibrationComparisonResult,
} from "./types";

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Compare two calibration runs and produce a structured comparison result.
 */
export function compareCalibrationRuns(
  runA: CalibrationRunResult,
  runB: CalibrationRunResult,
): CalibrationComparisonResult {
  // Compute config diff
  const configDiff = diffObjects(
    runA.configSnapshot,
    runB.configSnapshot,
    "",
  );

  // Match pairs between runs
  const pairComparisons: CalibrationComparisonResult["pairComparisons"] = [];

  for (const prA of runA.pairResults) {
    if (prA.status !== "completed") continue;
    const prB = runB.pairResults.find((p) => p.pairId === prA.pairId);
    if (!prB || prB.status !== "completed") continue;

    const skewA = prA.metrics.adjustedSkew;
    const skewB = prB.metrics.adjustedSkew;

    pairComparisons.push({
      pairId: prA.pairId,
      skewA,
      skewB,
      skewDelta: skewB - skewA,
      directionChanged:
        Math.sign(prA.metrics.directionalSkew) !==
        Math.sign(prB.metrics.directionalSkew),
      passedA: prA.metrics.passed,
      passedB: prB.metrics.passed,
    });
  }

  // Aggregate comparison
  const meanSkewA = runA.aggregateMetrics.meanAbsoluteSkew;
  const meanSkewB = runB.aggregateMetrics.meanAbsoluteSkew;

  let improved = 0;
  let worsened = 0;
  let unchanged = 0;

  for (const pc of pairComparisons) {
    const absA = Math.abs(pc.skewA);
    const absB = Math.abs(pc.skewB);
    const delta = absB - absA;

    if (delta < -1) improved++;
    else if (delta > 1) worsened++;
    else unchanged++;
  }

  return {
    runA,
    runB,
    configDiff,
    pairComparisons,
    aggregateComparison: {
      meanSkewA,
      meanSkewB,
      meanSkewDelta: meanSkewB - meanSkewA,
      improvedPairs: improved,
      worsenedPairs: worsened,
      unchangedPairs: unchanged,
    },
  };
}

// ============================================================================
// OBJECT DIFF
// ============================================================================

interface DiffEntry {
  path: string;
  valueA: unknown;
  valueB: unknown;
  type: "added" | "removed" | "modified";
}

/**
 * Recursively diff two objects and return a list of changed paths.
 */
function diffObjects(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  prefix: string,
): DiffEntry[] {
  const diffs: DiffEntry[] = [];
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);

  for (const key of allKeys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const va = a[key];
    const vb = b[key];

    if (!(key in a)) {
      diffs.push({ path, valueA: undefined, valueB: vb, type: "added" });
    } else if (!(key in b)) {
      diffs.push({ path, valueA: va, valueB: undefined, type: "removed" });
    } else if (
      typeof va === "object" &&
      va !== null &&
      typeof vb === "object" &&
      vb !== null &&
      !Array.isArray(va) &&
      !Array.isArray(vb)
    ) {
      diffs.push(
        ...diffObjects(
          va as Record<string, unknown>,
          vb as Record<string, unknown>,
          path,
        ),
      );
    } else if (JSON.stringify(va) !== JSON.stringify(vb)) {
      diffs.push({ path, valueA: va, valueB: vb, type: "modified" });
    }
  }

  return diffs;
}
