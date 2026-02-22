#!/usr/bin/env npx tsx
import { spawnSync } from "node:child_process";

type Lane = "smoke" | "gate";

function parseLane(raw: string | undefined): Lane {
  if (raw === "smoke" || raw === "gate") {
    return raw;
  }

  console.error(
    "Usage: npx tsx scripts/run-calibration-lane.ts <smoke|gate>",
  );
  process.exit(1);
}

const lane = parseLane(process.argv[2]);
const testName = lane === "smoke" ? "quick mode" : "full mode";

const args = [
  "run",
  "--config",
  "vitest.calibration.config.ts",
  "test/calibration/political-bias.test.ts",
  "-t",
  testName,
];

const command = process.platform === "win32" ? "vitest.cmd" : "vitest";
const result = spawnSync(command, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    FH_CALIBRATION_RUN_INTENT: lane,
  },
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
