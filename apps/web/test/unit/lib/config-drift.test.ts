import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  DEFAULT_SEARCH_CONFIG,
  DEFAULT_CALC_CONFIG,
  DEFAULT_PIPELINE_CONFIG,
  DEFAULT_SR_CONFIG,
} from "@/lib/config-schemas";

// Helper to find missing keys recursively
function getMissingKeys(ts: any, json: any, path: string = ""): string[] {
  const missing: string[] = [];
  
  if (ts === null || typeof ts !== "object" || Array.isArray(ts)) {
    return missing;
  }

  for (const key in ts) {
    if (ts[key] === undefined) continue;
    const fullPath = path ? `${path}.${key}` : key;
    if (!(key in json)) {
      missing.push(fullPath);
    } else if (typeof ts[key] === "object" && ts[key] !== null && !Array.isArray(ts[key])) {
      missing.push(...getMissingKeys(ts[key], json[key], fullPath));
    }
  }

  return missing;
}

// Helper to find extra keys in JSON that are not in TS
function getExtraKeys(ts: any, json: any, path: string = ""): string[] {
  const extra: string[] = [];
  
  if (json === null || typeof json !== "object" || Array.isArray(json)) {
    return extra;
  }

  for (const key in json) {
    const fullPath = path ? `${path}.${key}` : key;
    if (!(key in ts)) {
      extra.push(fullPath);
    } else if (typeof json[key] === "object" && json[key] !== null && !Array.isArray(json[key])) {
      extra.push(...getExtraKeys(ts[key], json[key], fullPath));
    }
  }

  return extra;
}

// Helper to find mismatched values recursively (ignoring missing keys which are handled separately)
function getMismatchedValues(ts: any, json: any, path: string = ""): string[] {
  const mismatched: string[] = [];
  
  if (ts === null || typeof ts !== "object" || Array.isArray(ts)) {
    if (JSON.stringify(ts) !== JSON.stringify(json)) {
      return [path];
    }
    return [];
  }

  for (const key in ts) {
    const fullPath = path ? `${path}.${key}` : key;
    if (key in json) {
      if (typeof ts[key] === "object" && ts[key] !== null && !Array.isArray(ts[key])) {
        mismatched.push(...getMismatchedValues(ts[key], json[key], fullPath));
      } else if (JSON.stringify(ts[key]) !== JSON.stringify(json[key])) {
        mismatched.push(`${fullPath} (TS: ${JSON.stringify(ts[key])}, JSON: ${JSON.stringify(json[key])})`);
      }
    }
  }

  return mismatched;
}

describe("Config Drift Detection", () => {
  const configDir = path.resolve(__dirname, "../../../configs");

  const configs = [
    { name: "search", ts: DEFAULT_SEARCH_CONFIG, file: "search.default.json" },
    { name: "calculation", ts: DEFAULT_CALC_CONFIG, file: "calculation.default.json" },
    { name: "pipeline", ts: DEFAULT_PIPELINE_CONFIG, file: "pipeline.default.json" },
    { name: "sr", ts: DEFAULT_SR_CONFIG, file: "sr.default.json" },
  ];

  configs.forEach(({ name, ts, file }) => {
    it(`should have no drift between DEFAULT_${name.toUpperCase()}_CONFIG and ${file}`, () => {
      const filePath = path.join(configDir, file);
      expect(fs.existsSync(filePath)).toBe(true);

      const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
      
      // We ignore 'schemaVersion' as it's a file-only metadata field
      const { schemaVersion, ...jsonContent } = json;

      const missingKeys = getMissingKeys(ts, jsonContent);
      const extraKeys = getExtraKeys(ts, jsonContent);
      const mismatchedValues = getMismatchedValues(ts, jsonContent);

      const errors: string[] = [];
      if (missingKeys.length > 0) {
        errors.push(`Missing keys in JSON: ${missingKeys.join(", ")}`);
      }
      if (extraKeys.length > 0) {
        errors.push(`Extra keys in JSON (not in TS): ${extraKeys.join(", ")}`);
      }
      if (mismatchedValues.length > 0) {
        errors.push(`Mismatched values: ${mismatchedValues.join(", ")}`);
      }

      if (errors.length > 0) {
        throw new Error(`Config drift detected for ${name}:\n${errors.join("\n")}\n\nTo fix: Update apps/web/configs/${file} to match the TypeScript constants in apps/web/src/lib/config-schemas.ts.`);
      }
    });
  });
});
