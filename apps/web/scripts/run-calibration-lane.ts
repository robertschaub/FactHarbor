#!/usr/bin/env npx tsx
import { spawnSync } from "node:child_process";

type Lane = "smoke" | "gate" | "canary";

function parseLane(raw: string | undefined): Lane {
  if (raw === "smoke" || raw === "gate" || raw === "canary") {
    return raw;
  }

  console.error(
    "Usage: npx tsx scripts/run-calibration-lane.ts <smoke|gate|canary>",
  );
  process.exit(1);
}

const lane = parseLane(process.argv[2]);
const testName =
  lane === "canary"
    ? "canary mode"
    : lane === "smoke"
      ? "quick mode"
      : "full mode";

const args = [
  "run",
  "--config",
  "vitest.calibration.config.ts",
  "test/calibration/framing-symmetry.test.ts",
  "-t",
  testName,
];

const result = spawnSync("vitest", args, {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    // Intentional policy: canary is always smoke-intent (never decision-grade gate intent).
    FH_CALIBRATION_RUN_INTENT: lane === "gate" ? "gate" : "smoke",
  },
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
