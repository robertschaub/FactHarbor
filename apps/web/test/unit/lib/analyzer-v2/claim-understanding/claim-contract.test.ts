import { readFileSync } from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";
import {
  CLAIM_CONTRACT_V2_SCHEMA_VERSION,
  CLAIM_UNDERSTANDING_GATEWAY_OUTPUT_SCHEMA_VERSION,
} from "@/lib/analyzer-v2/claim-understanding/types";

const fixturesDir = path.resolve(process.cwd(), "test/fixtures/analyzer-v2");

function readFixture<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(fixturesDir, relativePath), "utf8")) as T;
}

describe("analyzer-v2 claim contract fixture", () => {
  it("validates the V2 ClaimContract fixture against its JSON schema", () => {
    const schema = readFixture<Record<string, unknown>>("schemas/claim-contract-v2.schema.json");
    const fixture = readFixture<Record<string, unknown>>("claim-contract-v2.fixture.json");
    const ajv = new Ajv2020({ allErrors: true });
    const validate = ajv.compile(schema);

    expect(validate(fixture), JSON.stringify(validate.errors, null, 2)).toBe(true);
  });

  it("keeps selected claim IDs aligned with atomic claims", () => {
    const fixture = readFixture<Record<string, any>>("claim-contract-v2.fixture.json");
    const selectedIds = fixture.input.selectedAtomicClaimIds;
    const selectedClaims = fixture.atomicClaims
      .filter((claim: Record<string, unknown>) => claim.selected === true)
      .map((claim: Record<string, unknown>) => claim.id);

    expect(selectedClaims).toEqual(selectedIds);
    expect(fixture.acsMigration.selectedClaimFinalityPreserved).toBe(true);
  });

  it("defines Claim Understanding gateway output as the ClaimContract schema", () => {
    expect(CLAIM_UNDERSTANDING_GATEWAY_OUTPUT_SCHEMA_VERSION).toBe(CLAIM_CONTRACT_V2_SCHEMA_VERSION);
    expect(CLAIM_UNDERSTANDING_GATEWAY_OUTPUT_SCHEMA_VERSION).toBe("v2.claim_contract.0");
  });
});
