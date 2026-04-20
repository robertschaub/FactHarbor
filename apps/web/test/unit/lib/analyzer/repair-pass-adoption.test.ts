import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("repair pass adoption", () => {
  it("only adopts repaired claims after post-repair validation clears re-prompt", () => {
    const sourcePath = path.resolve(
      __dirname,
      "../../../../src/lib/analyzer/claim-extraction-stage.ts",
    );
    const source = readFileSync(sourcePath, "utf-8");

    expect(source).toContain("if (!evaluatedRepair.effectiveRePromptRequired) {");
    expect(source).toContain('console.info("[Stage1] Contract repair did not validate cleanly; keeping pre-repair set.");');
    expect(source).toMatch(
      /if \(!evaluatedRepair\.effectiveRePromptRequired\) \{\s*activePass2 = \{ \.\.\.activePass2, atomicClaims: repairedPass2\.atomicClaims \};[\s\S]+lastContractValidatedClaims = repairedPass2\.atomicClaims as unknown as AtomicClaim\[];/,
    );
  });
});
