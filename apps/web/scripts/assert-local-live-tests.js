#!/usr/bin/env node

const scriptName = process.argv[2] || "live test";

if (process.env.GITHUB_ACTIONS === "true") {
  console.error(
    `[Local-only] ${scriptName} is blocked on GitHub Actions. ` +
      "Paid/live API test suites must only be run explicitly on a local machine.",
  );
  process.exit(1);
}
