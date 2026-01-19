import sqlite3 from "sqlite3";
import { open } from "sqlite";

interface JobRow {
  JobId: string;
  ResultJson: string | null;
}

interface TransformResult {
  result: Record<string, unknown>;
  changed: boolean;
}

const KEY_RENAMES: Record<string, string> = {
  distinctProceedings: "analysisContexts",
  relatedProceedingId: "contextId",
  proceedingId: "contextId",
  proceedingName: "contextName",
  proceedingContext: "analysisContext"
};

function renameKeysDeep(value: unknown): { value: unknown; changed: boolean } {
  let changed = false;

  if (Array.isArray(value)) {
    const next = value.map((entry) => {
      const result = renameKeysDeep(entry);
      if (result.changed) {
        changed = true;
      }
      return result.value;
    });
    return { value: next, changed };
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(record)) {
      const targetKey = KEY_RENAMES[key] || key;
      const isLegacyKey = targetKey !== key;
      const hasTargetKeyInRecord =
        isLegacyKey && Object.prototype.hasOwnProperty.call(record, targetKey);
      const nested = renameKeysDeep(entry);
      if (targetKey !== key) {
        changed = true;
      }
      if (nested.changed) {
        changed = true;
      }

      // Prefer the already-present new key over legacy duplicates.
      if (isLegacyKey && hasTargetKeyInRecord) {
        continue;
      }

      if (!Object.prototype.hasOwnProperty.call(next, targetKey)) {
        next[targetKey] = nested.value;
        continue;
      }

      if (!isLegacyKey) {
        next[targetKey] = nested.value;
        changed = true;
      }
    }

    return { value: next, changed };
  }

  return { value, changed };
}

export function transformResultJson(input: Record<string, unknown>): TransformResult {
  const { value, changed } = renameKeysDeep(input);
  return { result: value as Record<string, unknown>, changed };
}

async function migrateDatabase(dbPath: string) {
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  console.log("Starting migration v2.7.0...");

  const jobs: JobRow[] = await db.all(
    "SELECT JobId, ResultJson FROM Jobs WHERE ResultJson IS NOT NULL"
  );

  console.log(`Found ${jobs.length} jobs to migrate`);

  let migratedCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const job of jobs) {
    try {
      if (!job.ResultJson) {
        skippedCount++;
        continue;
      }

      const parsed = JSON.parse(job.ResultJson) as Record<string, unknown>;
      const { result, changed } = transformResultJson(parsed);

      if (!changed) {
        skippedCount++;
        continue;
      }

      const newJson = JSON.stringify(result);
      await db.run(
        "UPDATE Jobs SET ResultJson = ?, UpdatedUtc = ? WHERE JobId = ?",
        [newJson, new Date().toISOString(), job.JobId]
      );

      migratedCount++;

      if (migratedCount % 25 === 0) {
        console.log(`Migrated ${migratedCount}/${jobs.length} jobs...`);
      }
    } catch (error) {
      console.error(`Error migrating job ${job.JobId}:`, error);
      errorCount++;
    }
  }

  await db.close();

  console.log("\nMigration complete!");
  console.log(`  ✅ Migrated: ${migratedCount}`);
  console.log(`  ⚠️  Skipped: ${skippedCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);

  if (errorCount > 0) {
    throw new Error(`Migration had ${errorCount} errors`);
  }

  return { migratedCount, skippedCount, errorCount };
}

const isMain =
  typeof require !== "undefined" &&
  typeof module !== "undefined" &&
  require.main === module;

if (isMain) {
  const dbPath = process.env.DB_PATH || "./apps/api/factharbor.db";
  migrateDatabase(dbPath)
    .then((result) => {
      console.log("Migration successful:", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}
