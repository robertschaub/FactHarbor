/**
 * Config File Loading Tests (Alpha)
 *
 * Validates file-backed defaults loading behavior:
 * - Happy path
 * - Version mismatch (warn + fallback)
 * - Invalid JSON (error + fallback)
 * - Legacy key migration (warn + mapped key)
 *
 * @module config-file-loading.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { loadDefaultConfigFromFile } from "@/lib/config-storage";
import { DEFAULT_PIPELINE_CONFIG, SCHEMA_VERSIONS } from "@/lib/config-schemas";

function writeConfigFile(dir: string, name: string, content: string) {
  fs.writeFileSync(path.join(dir, name), content, "utf8");
}

describe("Config file loading (alpha)", () => {
  let tempDir: string;
  let originalDefaultsDir: string | undefined;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fh-config-"));
    originalDefaultsDir = process.env.FH_CONFIG_DEFAULTS_DIR;
    process.env.FH_CONFIG_DEFAULTS_DIR = tempDir;
  });

  afterEach(() => {
    if (originalDefaultsDir === undefined) {
      delete process.env.FH_CONFIG_DEFAULTS_DIR;
    } else {
      process.env.FH_CONFIG_DEFAULTS_DIR = originalDefaultsDir;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("loads a valid config file", () => {
    const payload = {
      schemaVersion: SCHEMA_VERSIONS.search,
      enabled: true,
      provider: "auto",
      mode: "standard",
      maxResults: 6,
      maxSourcesPerIteration: 4,
      timeoutMs: 12000,
      dateRestrict: null,
      domainWhitelist: [],
      domainBlacklist: [],
    };

    writeConfigFile(tempDir, "search.default.json", JSON.stringify(payload, null, 2));

    const result = loadDefaultConfigFromFile("search");
    expect(result).not.toBeNull();

    const parsed = JSON.parse(result as string);
    expect(parsed).toEqual({
      enabled: true,
      provider: "auto",
      mode: "standard",
      maxResults: 6,
      maxSourcesPerIteration: 4,
      timeoutMs: 12000,
      dateRestrict: null,
      domainWhitelist: [],
      domainBlacklist: [],
    });
  });

  it("warns and falls back on schema version mismatch", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const payload = {
      schemaVersion: "0.0.0",
      enabled: true,
      provider: "auto",
      mode: "standard",
      maxResults: 6,
      maxSourcesPerIteration: 4,
      timeoutMs: 12000,
      dateRestrict: null,
      domainWhitelist: [],
      domainBlacklist: [],
    };

    writeConfigFile(tempDir, "search.default.json", JSON.stringify(payload, null, 2));

    const result = loadDefaultConfigFromFile("search");
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("version mismatch"),
    );
  });

  it("errors and falls back on invalid JSON", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    writeConfigFile(tempDir, "search.default.json", "{");

    const result = loadDefaultConfigFromFile("search");
    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to load"),
      expect.anything(),
    );
  });

  it("migrates legacy keys and logs warnings", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const legacyConfig = { ...DEFAULT_PIPELINE_CONFIG, llmScopeSimilarity: true };
    delete (legacyConfig as { llmContextSimilarity?: boolean }).llmContextSimilarity;

    const payload = {
      schemaVersion: SCHEMA_VERSIONS.pipeline,
      ...legacyConfig,
    };

    writeConfigFile(tempDir, "pipeline.default.json", JSON.stringify(payload, null, 2));

    const result = loadDefaultConfigFromFile("pipeline");
    expect(result).not.toBeNull();

    const parsed = JSON.parse(result as string);
    expect(parsed.llmContextSimilarity).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Pipeline config keys migrated"),
    );
  });
});
