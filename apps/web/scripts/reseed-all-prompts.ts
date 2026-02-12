/**
 * Reseed All Configs
 *
 * Re-seeds ALL prompt profiles and UCM configs from their source files.
 * In normal mode, only system-seeded/system-default entries are refreshed.
 * Use --force to overwrite active entries regardless of origin.
 *
 * Usage:
 *   npx tsx scripts/reseed-all-prompts.ts              # Reseed all configs
 *   npx tsx scripts/reseed-all-prompts.ts --force      # Force overwrite even if unchanged
 *   npx tsx scripts/reseed-all-prompts.ts --quiet      # Minimal output (for CI/postbuild)
 *   npx tsx scripts/reseed-all-prompts.ts --prompts    # Only reseed prompts
 *   npx tsx scripts/reseed-all-prompts.ts --configs    # Only reseed UCM configs
 *
 * Environment:
 *   FH_PROMPT_DIR - Override prompt directory (default: apps/web/prompts/)
 *   FH_CONFIG_DEFAULTS_DIR - Override UCM config directory (default: apps/web/configs/)
 *   FH_CONFIG_DB_PATH - Override database path (default: apps/web/config.db)
 */

import {
  seedPromptFromFile,
  refreshPromptFromFileIfSystemSeed,
  closeConfigDb,
  getActiveConfigHash,
  getActiveConfig,
  saveConfigBlob,
  activateConfig,
  loadDefaultConfigFromFile,
  VALID_PROMPT_PROFILES,
  type ConfigType,
} from "../src/lib/config-storage";
import {
  getDefaultConfig,
  canonicalizeContent,
} from "../src/lib/config-schemas";

// UCM config types (excludes "prompt" which is handled separately)
const UCM_CONFIG_TYPES: Array<Exclude<ConfigType, "prompt">> = [
  "search",
  "calculation",
  "pipeline",
  "sr",
];

interface ReseedResult {
  name: string;
  type: "prompt" | "config";
  action: "seeded" | "updated" | "skipped" | "error";
  contentHash?: string;
  error?: string;
  previousHash?: string;
}

/**
 * Reseed a UCM config from its JSON file
 * Similar logic to ensureDefaultConfig but with explicit tracking
 */
async function reseedUcmConfig(
  configType: Exclude<ConfigType, "prompt">,
  forceMode: boolean,
): Promise<ReseedResult> {
  const name = configType;

  try {
    // Get current active config
    const active = await getActiveConfig(configType, "default");
    const previousHash = active?.contentHash || null;

    // Load content from file (falls back to code default if file missing)
    const fileContent = loadDefaultConfigFromFile(configType);
    const defaultContent = fileContent ?? getDefaultConfig(configType);

    // Canonicalize for comparison
    const canonicalContent = canonicalizeContent(configType, defaultContent);

    // Check if update needed
    if (active) {
      const isSystemDefault =
        active.createdBy === "system" &&
        active.versionLabel === "Initial default config";

      if (!isSystemDefault && !forceMode) {
        // User has customized this config, don't overwrite
        return {
          name,
          type: "config",
          action: "skipped",
          contentHash: active.contentHash,
          previousHash: previousHash || undefined,
        };
      }

      // Compare content
      if (active.content === canonicalContent) {
        return {
          name,
          type: "config",
          action: "skipped",
          contentHash: active.contentHash,
        };
      }
    }

    // Save new blob and activate
    const { blob, isNew } = await saveConfigBlob(
      configType,
      "default",
      defaultContent,
      "Initial default config",
      "system",
    );
    await activateConfig(
      configType,
      "default",
      blob.contentHash,
      "system",
      active ? "refresh-default" : "initial",
    );

    const isUpdate = previousHash && previousHash !== blob.contentHash;

    return {
      name,
      type: "config",
      action: isUpdate ? "updated" : "seeded",
      contentHash: blob.contentHash,
      previousHash: previousHash || undefined,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      name,
      type: "config",
      action: "error",
      error: errorMsg,
    };
  }
}

/**
 * Reseed a prompt from file
 */
async function reseedPrompt(
  profile: string,
  forceMode: boolean,
): Promise<ReseedResult> {
  try {
    // Get current active hash (if any)
    const previousHash = await getActiveConfigHash("prompt", profile);

    // Force mode: overwrite active prompt from file.
    if (forceMode) {
      const seeded = await seedPromptFromFile(profile, true);
      if (seeded.error) {
        return { name: profile, type: "prompt", action: "error", error: seeded.error };
      }

      const isUpdate = previousHash && previousHash !== seeded.contentHash;
      return {
        name: profile,
        type: "prompt",
        action: isUpdate ? "updated" : "seeded",
        contentHash: seeded.contentHash || undefined,
        previousHash: previousHash || undefined,
      };
    }

    // Normal mode: refresh only system-seeded prompts when file changed.
    const refreshed = await refreshPromptFromFileIfSystemSeed(profile);
    if (refreshed.error) {
      return { name: profile, type: "prompt", action: "error", error: refreshed.error };
    }

    if (refreshed.refreshed) {
      const isUpdate = previousHash && previousHash !== refreshed.contentHash;
      return {
        name: profile,
        type: "prompt",
        action: isUpdate ? "updated" : "seeded",
        contentHash: refreshed.contentHash || undefined,
        previousHash: previousHash || undefined,
      };
    }

    return {
      name: profile,
      type: "prompt",
      action: "skipped",
      contentHash: refreshed.contentHash || undefined,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { name: profile, type: "prompt", action: "error", error: errorMsg };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const forceMode = args.includes("--force");
  const quietMode = args.includes("--quiet");
  const promptsOnly = args.includes("--prompts");
  const configsOnly = args.includes("--configs");

  // Default: process both
  const processPrompts = !configsOnly || promptsOnly;
  const processConfigs = !promptsOnly || configsOnly;

  if (!quietMode) {
    console.log("=".repeat(60));
    console.log("Reseed All Configs");
    console.log("=".repeat(60));
    console.log(`Mode: ${forceMode ? "FORCE (overwrite all)" : "Normal (skip unchanged)"}`);
    console.log(`Scope: ${processPrompts && processConfigs ? "Prompts + UCM Configs" : processPrompts ? "Prompts only" : "UCM Configs only"}`);
    console.log();
  }

  const results: ReseedResult[] = [];

  // Process UCM configs first
  if (processConfigs) {
    if (!quietMode) {
      console.log("--- UCM Configs ---");
    }

    for (const configType of UCM_CONFIG_TYPES) {
      if (!quietMode) {
        process.stdout.write(`Processing: ${configType.padEnd(30)}`);
      }

      const result = await reseedUcmConfig(configType, forceMode);
      results.push(result);

      if (!quietMode) {
        if (result.action === "error") {
          console.log(`ERROR: ${result.error}`);
        } else if (result.action === "seeded" || result.action === "updated") {
          console.log(`${result.action.toUpperCase()} (${result.contentHash?.substring(0, 12)}...)`);
        } else {
          console.log("skipped (unchanged)");
        }
      }
    }

    if (!quietMode) console.log();
  }

  // Process prompts
  if (processPrompts) {
    if (!quietMode) {
      console.log("--- Prompts ---");
    }

    for (const profile of VALID_PROMPT_PROFILES) {
      if (!quietMode) {
        process.stdout.write(`Processing: ${profile.padEnd(30)}`);
      }

      const result = await reseedPrompt(profile, forceMode);
      results.push(result);

      if (!quietMode) {
        if (result.action === "error") {
          console.log(`ERROR: ${result.error}`);
        } else if (result.action === "seeded" || result.action === "updated") {
          console.log(`${result.action.toUpperCase()} (${result.contentHash?.substring(0, 12)}...)`);
        } else {
          console.log("skipped (unchanged)");
        }
      }
    }
  }

  // Summary
  const seeded = results.filter(r => r.action === "seeded").length;
  const updated = results.filter(r => r.action === "updated").length;
  const skipped = results.filter(r => r.action === "skipped").length;
  const errors = results.filter(r => r.action === "error").length;

  const promptResults = results.filter(r => r.type === "prompt");
  const configResults = results.filter(r => r.type === "config");

  if (!quietMode) {
    console.log();
    console.log("=".repeat(60));
    console.log("Summary");
    console.log("=".repeat(60));
    console.log(`Total:   ${results.length} (${promptResults.length} prompts, ${configResults.length} configs)`);
    console.log(`Seeded:  ${seeded} (new)`);
    console.log(`Updated: ${updated} (changed)`);
    console.log(`Skipped: ${skipped} (unchanged)`);
    console.log(`Errors:  ${errors}`);

    if (errors > 0) {
      console.log();
      console.log("Errors:");
      for (const r of results.filter(r => r.action === "error")) {
        console.log(`  - ${r.name}: ${r.error}`);
      }
    }

    if (updated > 0) {
      console.log();
      console.log("Updated:");
      for (const r of results.filter(r => r.action === "updated")) {
        console.log(`  - ${r.name}: ${r.previousHash?.substring(0, 8)} -> ${r.contentHash?.substring(0, 8)}`);
      }
    }
  } else {
    // Quiet mode: just output summary line
    const promptSeeded = promptResults.filter(r => r.action === "seeded" || r.action === "updated").length;
    const promptSkipped = promptResults.filter(r => r.action === "skipped").length;
    const configSeeded = configResults.filter(r => r.action === "seeded" || r.action === "updated").length;
    const configSkipped = configResults.filter(r => r.action === "skipped").length;

    if (processPrompts && processConfigs) {
      console.log(`Configs: ${configSeeded} changed, ${configSkipped} unchanged | Prompts: ${promptSeeded} changed, ${promptSkipped} unchanged | Errors: ${errors}`);
    } else if (processPrompts) {
      console.log(`Prompts: ${promptSeeded} changed, ${promptSkipped} unchanged, ${errors} errors`);
    } else {
      console.log(`Configs: ${configSeeded} changed, ${configSkipped} unchanged, ${errors} errors`);
    }
  }

  await closeConfigDb();

  if (!quietMode) {
    console.log("\nDone.");
  }

  // Exit with error code if any failures
  if (errors > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
