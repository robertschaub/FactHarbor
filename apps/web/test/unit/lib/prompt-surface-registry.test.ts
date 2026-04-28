import { describe, expect, it } from "vitest";

import {
  getPromptSurfaceRegistryEntry,
  listPromptSurfaceExceptions,
  listPromptSurfaceRegistry,
} from "@/lib/prompt-surface-registry";

describe("prompt surface registry", () => {
  it("locks the known prompt surfaces and current exceptions", () => {
    expect(listPromptSurfaceRegistry().map((entry) => entry.id)).toEqual([
      "claimboundary",
      "source-reliability-enrichment",
      "source-reliability-core",
      "input-policy-gate",
      "grounding-check-legacy",
      "claimboundary-pass2-inline-framing",
      "source-reliability-evidence-pack-inline",
      "inverse-claim-verification",
    ]);

    expect(listPromptSurfaceExceptions().map((entry) => entry.id)).toEqual([
      "source-reliability-core",
      "grounding-check-legacy",
      "claimboundary-pass2-inline-framing",
      "source-reliability-evidence-pack-inline",
      "inverse-claim-verification",
    ]);
  });

  it("classifies UCM-backed runtime prompts separately from code and disk exceptions", () => {
    expect(getPromptSurfaceRegistryEntry("claimboundary")).toMatchObject({
      management: "manifest_backed_ucm",
      stability: "runtime_contract",
      adminEditable: true,
      reseedSupported: true,
      ucmProfile: "claimboundary",
    });
    expect(getPromptSurfaceRegistryEntry("input-policy-gate")).toMatchObject({
      management: "ucm",
      stability: "runtime_contract",
      adminEditable: true,
      reseedSupported: true,
      ucmProfile: "input-policy-gate",
    });
    expect(getPromptSurfaceRegistryEntry("source-reliability-core")).toMatchObject({
      management: "code_built",
      stability: "intentional_exception",
      adminEditable: false,
      reseedSupported: false,
    });
    expect(getPromptSurfaceRegistryEntry("grounding-check-legacy")).toMatchObject({
      management: "db_only_legacy",
      stability: "intentional_exception",
      adminEditable: true,
      reseedSupported: false,
      ucmProfile: "orchestrated",
    });
    expect(getPromptSurfaceRegistryEntry("claimboundary-pass2-inline-framing")).toMatchObject({
      management: "inline_code",
      stability: "intentional_exception",
      adminEditable: false,
      reseedSupported: false,
    });
    expect(getPromptSurfaceRegistryEntry("source-reliability-evidence-pack-inline")).toMatchObject({
      management: "inline_code",
      stability: "intentional_exception",
      adminEditable: false,
      reseedSupported: false,
    });
    expect(getPromptSurfaceRegistryEntry("inverse-claim-verification")).toMatchObject({
      management: "disk_only_calibration",
      stability: "intentional_exception",
      adminEditable: false,
      reseedSupported: false,
    });
  });

  it("records ownership paths without embedding prompt text", () => {
    for (const entry of listPromptSurfaceRegistry()) {
      expect(entry.runtimeOwners.length).toBeGreaterThan(0);
      if (entry.management !== "db_only_legacy") {
        expect(entry.sourcePaths.length).toBeGreaterThan(0);
      }
      expect(JSON.stringify(entry)).not.toContain("You are ");
      expect(JSON.stringify(entry)).not.toContain("Return only valid JSON");
    }
  });

  it("does not expose mutable registry array references", () => {
    const entry = getPromptSurfaceRegistryEntry("claimboundary");

    expect(entry).not.toBeNull();
    entry?.runtimeOwners.push("local-test-mutation");
    entry?.sourcePaths.push("local-test-mutation");

    expect(getPromptSurfaceRegistryEntry("claimboundary")).toMatchObject({
      runtimeOwners: [
        "apps/web/src/lib/analyzer/prompt-loader.ts",
        "apps/web/src/lib/analyzer/claimboundary-pipeline.ts",
      ],
      sourcePaths: [
        "apps/web/prompts/claimboundary/manifest.json",
        "apps/web/prompts/claimboundary.prompt.md",
      ],
    });
  });
});
