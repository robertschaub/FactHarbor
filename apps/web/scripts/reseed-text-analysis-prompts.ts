/**
 * Reseed Text Analysis Prompts
 *
 * Re-seeds the text-analysis prompts from the files in prompts/text-analysis/
 * This forces the database to reload from the current file versions.
 *
 * Usage: npx tsx scripts/reseed-text-analysis-prompts.ts
 */

import {
  seedPromptFromFile,
  closeConfigDb,
} from "../src/lib/config-storage";

const TEXT_ANALYSIS_PROFILES = [
  "text-analysis-input",
  "text-analysis-evidence",
  "text-analysis-context",
  "text-analysis-verdict",
] as const;

async function main() {
  console.log("=".repeat(60));
  console.log("Reseeding Text Analysis Prompts");
  console.log("=".repeat(60));
  console.log();

  const results: Array<{ profile: string; success: boolean; hash?: string; error?: string }> = [];

  for (const profile of TEXT_ANALYSIS_PROFILES) {
    console.log(`Processing: ${profile}`);

    // Force reseed (overwrite existing)
    const result = await seedPromptFromFile(profile, true);

    if (result.seeded) {
      console.log(`  ✓ Seeded: ${result.contentHash?.substring(0, 12)}...`);
      results.push({ profile, success: true, hash: result.contentHash || undefined });
    } else if (result.error) {
      console.log(`  ✗ Error: ${result.error}`);
      results.push({ profile, success: false, error: result.error });
    } else {
      console.log(`  - Skipped (already exists)`);
      results.push({ profile, success: true, hash: result.contentHash || undefined });
    }
  }

  console.log();
  console.log("=".repeat(60));
  console.log("Summary");
  console.log("=".repeat(60));

  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`Total:     ${results.length}`);
  console.log(`Succeeded: ${succeeded}`);
  console.log(`Failed:    ${failed}`);
  console.log();

  if (failed > 0) {
    console.log("Failures:");
    for (const r of results.filter(r => !r.success)) {
      console.log(`  - ${r.profile}: ${r.error}`);
    }
  }

  await closeConfigDb();
  console.log("\nDatabase connection closed.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
