import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "../..");
const diagnosticScriptPath = path.join(
  repoRoot,
  "scripts/v2/diagnostics/query-planning-distribution.ts",
);

function readDiagnosticScript(): string {
  return fs.readFileSync(diagnosticScriptPath, "utf8");
}

function importedSpecifiers(sourceText: string): string[] {
  const imports: string[] = [];
  for (const match of sourceText.matchAll(/from\s+["']([^"']+)["']/g)) {
    imports.push(match[1]);
  }
  for (const match of sourceText.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)) {
    imports.push(match[1]);
  }
  return imports;
}

function structuralSourceText(sourceText: string): string {
  return [
    "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
    "Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?",
    "Using hydrogen for cars is more efficient than using electricity",
  ].reduce((text, approvedInput) => text.replace(approvedInput, "CAPTAIN_DEFINED_INPUT"), sourceText);
}

describe("X7-W2-QC2 query planning distribution diagnostic boundary", () => {
  it("keeps the diagnostic harness stopped at Query Planning inspection", () => {
    const sourceText = readDiagnosticScript();

    expect(sourceText).toContain("STOP_AFTER_QUERY_PLANNING_INSPECTION");
    expect(sourceText).toContain("CAPTAIN_DEFINED_INPUTS");
    expect(sourceText).toContain("selectedAtomicClaimSnapshotSource: \"7l1_input_envelope\"");
    expect(sourceText).toContain("downstreamExecutionCalled: false");
  });

  it("uses only Claim Understanding and Query Planning runtime imports", () => {
    const imports = importedSpecifiers(readDiagnosticScript());

    expect(imports).toEqual([
      "node:child_process",
      "node:crypto",
      "node:fs",
      "node:path",
      "@/lib/analyzer-v2/claim-understanding/stage-handoff",
      "@/lib/analyzer-v2/claim-understanding/runtime-stage",
      "@/lib/analyzer-v2/evidence-lifecycle/query-planning/inspection",
      "@/lib/analyzer-v2/evidence-lifecycle/query-planning/runtime",
      "@/lib/analyzer-v2/pipeline-input",
      "@/lib/analyzer-v2/run-context",
      "@/lib/analyzer-v2-runtime/claim-understanding-runtime-activation",
      "@/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink",
      "@/lib/analyzer-v2-runtime/evidence-query-planning-provider-factory",
      "@/lib/analyzer-v2-runtime/evidence-query-planning-provider-runtime-config.contract",
    ]);
  });

  it("does not reference blocked downstream owners or public/product entry points", () => {
    const sourceText = structuralSourceText(readDiagnosticScript());
    const forbiddenMarkers = [
      "apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/",
      "source-acquisition",
      "candidate-provider-network-loop",
      "source-acquisition-candidate-runtime",
      "source-acquisition-network-",
      "source-acquisition-content-",
      "content-parser",
      "parser-isolation",
      "EvidenceCorpus",
      "source-material",
      "@/lib/analyzer/",
      "claimboundary-pipeline",
      "orchestrator",
      "internal-runner-queue",
      "app/api",
      "route.ts",
      "cache-governance",
      "source-reliability",
      "storage",
      "report",
      "verdict",
      "warning",
      "confidence",
      "runClaimBoundaryV2Shell",
      "runClaimBoundaryPipeline",
    ];

    for (const marker of forbiddenMarkers) {
      expect(sourceText).not.toContain(marker);
    }
  });
});
