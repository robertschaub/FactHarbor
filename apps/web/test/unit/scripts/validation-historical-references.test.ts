import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "../..");
const familiesPath = path.join(repoRoot, "scripts", "validation", "captain-approved-families.json");

describe("Captain-approved validation historical references", () => {
  it("maps every Captain-approved family to a read-only direct reference or explicit stale comparator", () => {
    const families = JSON.parse(fs.readFileSync(familiesPath, "utf-8"));

    expect(families).toHaveLength(8);

    for (const family of families) {
      expect(typeof family.familyName).toBe("string");
      expect(typeof family.inputValue).toBe("string");
      expect(family.historicalDirectReference).toEqual(
        expect.objectContaining({
          jobId: expect.any(String),
          submissionPath: "direct-api-historical",
          status: "SUCCEEDED",
          referenceQuality: expect.stringMatching(/^(same-day-direct|stale-direct)$/),
        }),
      );
      expect(family.historicalDirectReference.jobId).toMatch(/^[a-f0-9]{32}$/);
    }
  });
});
