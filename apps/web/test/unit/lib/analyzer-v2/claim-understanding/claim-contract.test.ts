import { readFileSync } from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";
import {
  CLAIM_CONTRACT_V2_SCHEMA_VERSION,
  CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
  CLAIM_UNDERSTANDING_GATEWAY_OUTPUT_SCHEMA_VERSION,
  type ClaimContract,
  type ClaimUnderstandingResult,
} from "@/lib/analyzer-v2/claim-understanding/types";
import {
  ClaimContractSchema,
  ClaimUnderstandingResultSchema,
  parseClaimContract,
  parseClaimUnderstandingResult,
} from "@/lib/analyzer-v2/claim-understanding/schemas";

const fixturesDir = path.resolve(process.cwd(), "test/fixtures/analyzer-v2");

function readFixture<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(fixturesDir, relativePath), "utf8")) as T;
}

function ajvWithClaimContractSchema(): Ajv2020 {
  const ajv = new Ajv2020({ allErrors: true });
  ajv.addSchema(readFixture<Record<string, unknown>>("schemas/claim-contract-v2.schema.json"));
  return ajv;
}

function directInputClaimContract(): ClaimContract {
  return {
    schemaVersion: CLAIM_CONTRACT_V2_SCHEMA_VERSION,
    input: {
      inputType: "text",
      inputValue: "Plastic recycling is pointless",
      resolvedInputText: "Plastic recycling is pointless",
      detectedLanguage: "en",
      selectedAtomicClaimIds: ["AC_DIRECT_01"],
    },
    inputGroundingSeed: {
      source: "direct_input",
      inputType: "text",
      inputValue: "Plastic recycling is pointless",
      resolvedInputText: "Plastic recycling is pointless",
      detectedLanguage: "en",
      currentDate: "2026-05-14",
      acsSnapshotHash: null,
      inputGroundingSeedHash: "fixture-direct-input-grounding-seed-hash",
    },
    atomicClaims: [
      {
        id: "AC_DIRECT_01",
        statement: "Plastic recycling is pointless",
        selected: true,
        source: "v2_claim_understanding",
        gate1Status: {
          status: "passed",
          source: "v2_claim_understanding",
          summary: "Direct input claim understanding accepted the selected claim.",
          reasons: [],
        },
        integrityEvents: [],
      },
    ],
    integrityEvents: [],
    acsMigration: null,
  };
}

describe("analyzer-v2 claim contract fixture", () => {
  it("validates the V2 ClaimContract fixture against its JSON schema", () => {
    const schema = readFixture<Record<string, unknown>>("schemas/claim-contract-v2.schema.json");
    const fixture = readFixture<Record<string, unknown>>("claim-contract-v2.fixture.json");
    const ajv = new Ajv2020({ allErrors: true });
    const validate = ajv.compile(schema);

    expect(validate(fixture), JSON.stringify(validate.errors, null, 2)).toBe(true);
  });

  it("validates direct-input success without fabricating ACS migration metadata", () => {
    const schema = readFixture<Record<string, unknown>>("schemas/claim-contract-v2.schema.json");
    const fixture = directInputClaimContract();
    const ajv = new Ajv2020({ allErrors: true });
    const validate = ajv.compile(schema);

    expect(validate(fixture), JSON.stringify(validate.errors, null, 2)).toBe(true);
    expect(fixture.inputGroundingSeed.source).toBe("direct_input");
    expect(fixture.acsMigration).toBeNull();
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

  it("defines Claim Understanding gateway output as the result-envelope schema", () => {
    expect(CLAIM_UNDERSTANDING_GATEWAY_OUTPUT_SCHEMA_VERSION).toBe(CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION);
    expect(CLAIM_UNDERSTANDING_GATEWAY_OUTPUT_SCHEMA_VERSION).toBe("v2.claim_understanding_result.0");
  });

  it("pins production runtime schema versions to the V2 contract ids", () => {
    const claimContract = directInputClaimContract();
    const accepted: ClaimUnderstandingResult = {
      schemaVersion: CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
      status: "accepted",
      claimContract,
      integrityEvents: [],
      blockedReason: null,
      damagedReason: null,
    };

    expect(parseClaimContract(claimContract).schemaVersion).toBe("v2.claim_contract.0");
    expect(parseClaimUnderstandingResult(accepted).schemaVersion).toBe("v2.claim_understanding_result.0");
  });

  it("rejects unknown keys and malformed enum values in production runtime schemas", () => {
    const withUnknownKey = {
      ...directInputClaimContract(),
      legacyContext: "not allowed",
    };
    const withMalformedEnum = {
      ...directInputClaimContract(),
      input: {
        ...directInputClaimContract().input,
        inputType: "audio",
      },
    };

    expect(ClaimContractSchema.safeParse(withUnknownKey).success).toBe(false);
    expect(ClaimContractSchema.safeParse(withMalformedEnum).success).toBe(false);
  });
});

describe("analyzer-v2 claim understanding result envelope", () => {
  it("validates accepted ACS success with a ClaimContract", () => {
    const schema = readFixture<Record<string, unknown>>("schemas/claim-understanding-result-v2.schema.json");
    const claimContract = readFixture<ClaimContract>("claim-contract-v2.fixture.json");
    const accepted: ClaimUnderstandingResult = {
      schemaVersion: CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
      status: "accepted",
      claimContract,
      integrityEvents: claimContract.integrityEvents,
      blockedReason: null,
      damagedReason: null,
    };
    const ajv = ajvWithClaimContractSchema();
    const validate = ajv.compile(schema);

    expect(validate(accepted), JSON.stringify(validate.errors, null, 2)).toBe(true);
    expect(accepted.claimContract.acsMigration?.status).toBe("accepted");
  });

  it("validates accepted direct-input success with null ACS migration", () => {
    const schema = readFixture<Record<string, unknown>>("schemas/claim-understanding-result-v2.schema.json");
    const accepted: ClaimUnderstandingResult = {
      schemaVersion: CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
      status: "accepted",
      claimContract: directInputClaimContract(),
      integrityEvents: [],
      blockedReason: null,
      damagedReason: null,
    };
    const ajv = ajvWithClaimContractSchema();
    const validate = ajv.compile(schema);

    expect(validate(accepted), JSON.stringify(validate.errors, null, 2)).toBe(true);
    expect(accepted.claimContract.acsMigration).toBeNull();
  });

  it("rejects accepted envelopes with an invalid embedded ClaimContract at runtime", () => {
    const accepted = {
      schemaVersion: CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
      status: "accepted",
      claimContract: {
        ...directInputClaimContract(),
        schemaVersion: "v2.claim_contract.1",
      },
      integrityEvents: [],
      blockedReason: null,
      damagedReason: null,
    };

    expect(ClaimUnderstandingResultSchema.safeParse(accepted).success).toBe(false);
  });

  it("validates blocked no-valid-claim without a ClaimContract", () => {
    const schema = readFixture<Record<string, unknown>>("schemas/claim-understanding-result-v2.schema.json");
    const blocked: ClaimUnderstandingResult = {
      schemaVersion: CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
      status: "blocked",
      claimContract: null,
      integrityEvents: [
        {
          type: "no_valid_claim",
          severity: "error",
          message: "Claim Understanding found no valid AtomicClaim to continue.",
          claimIds: [],
        },
      ],
      blockedReason: "no_valid_claim",
      damagedReason: null,
    };
    const ajv = ajvWithClaimContractSchema();
    const validate = ajv.compile(schema);

    expect(validate(blocked), JSON.stringify(validate.errors, null, 2)).toBe(true);
    expect(blocked.claimContract).toBeNull();
  });

  it("validates blocked prepared-snapshot-invalid without a ClaimContract", () => {
    const schema = readFixture<Record<string, unknown>>("schemas/claim-understanding-result-v2.schema.json");
    const blocked: ClaimUnderstandingResult = {
      schemaVersion: CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
      status: "blocked",
      claimContract: null,
      integrityEvents: [
        {
          type: "prepared_snapshot_invalid",
          severity: "error",
          message: "Prepared snapshot is structurally invalid for Claim Understanding.",
          claimIds: [],
        },
      ],
      blockedReason: "prepared_snapshot_invalid",
      damagedReason: null,
    };
    const ajv = ajvWithClaimContractSchema();
    const validate = ajv.compile(schema);

    expect(validate(blocked), JSON.stringify(validate.errors, null, 2)).toBe(true);
    expect(blocked.claimContract).toBeNull();
  });

  it("validates blocked selected-claim-missing without silently reselecting", () => {
    const schema = readFixture<Record<string, unknown>>("schemas/claim-understanding-result-v2.schema.json");
    const blocked: ClaimUnderstandingResult = {
      schemaVersion: CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
      status: "blocked",
      claimContract: null,
      integrityEvents: [
        {
          type: "selected_claim_missing",
          severity: "error",
          message: "Prepared snapshot selected claim is missing from the supplied claim list.",
          claimIds: ["AC_PREPARED_MISSING"],
        },
      ],
      blockedReason: "selected_claim_missing",
      damagedReason: null,
    };
    const ajv = ajvWithClaimContractSchema();
    const validate = ajv.compile(schema);

    expect(validate(blocked), JSON.stringify(validate.errors, null, 2)).toBe(true);
    expect(blocked.claimContract).toBeNull();
  });

  it("validates blocked duplicate selected claim IDs without a ClaimContract", () => {
    const schema = readFixture<Record<string, unknown>>("schemas/claim-understanding-result-v2.schema.json");
    const blocked: ClaimUnderstandingResult = {
      schemaVersion: CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
      status: "blocked",
      claimContract: null,
      integrityEvents: [
        {
          type: "duplicate_selected_claim_id",
          severity: "error",
          message: "Prepared snapshot contains duplicate selected claim IDs.",
          claimIds: ["AC_PREPARED_01"],
        },
      ],
      blockedReason: "duplicate_selected_claim_id",
      damagedReason: null,
    };
    const ajv = ajvWithClaimContractSchema();
    const validate = ajv.compile(schema);

    expect(validate(blocked), JSON.stringify(validate.errors, null, 2)).toBe(true);
    expect(blocked.claimContract).toBeNull();
  });

  it("validates blocked shell-placeholder leakage without a ClaimContract", () => {
    const schema = readFixture<Record<string, unknown>>("schemas/claim-understanding-result-v2.schema.json");
    const blocked: ClaimUnderstandingResult = {
      schemaVersion: CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
      status: "blocked",
      claimContract: null,
      integrityEvents: [
        {
          type: "shell_placeholder_claim_id",
          severity: "error",
          message: "Shell-only placeholder claim ID reached Claim Understanding.",
          claimIds: ["AC_V2_SHELL_01"],
        },
      ],
      blockedReason: "shell_placeholder_claim_id",
      damagedReason: null,
    };
    const ajv = ajvWithClaimContractSchema();
    const validate = ajv.compile(schema);

    expect(validate(blocked), JSON.stringify(validate.errors, null, 2)).toBe(true);
    expect(blocked.claimContract).toBeNull();
  });

  it("validates damaged contract-validation failure without a ClaimContract", () => {
    const schema = readFixture<Record<string, unknown>>("schemas/claim-understanding-result-v2.schema.json");
    const damaged: ClaimUnderstandingResult = {
      schemaVersion: CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
      status: "damaged",
      claimContract: null,
      integrityEvents: [
        {
          type: "claim_contract_validation_failed",
          severity: "error",
          message: "Claim Understanding result failed ClaimContract validation after allowed repair.",
          claimIds: ["AC_DIRECT_01"],
        },
      ],
      blockedReason: null,
      damagedReason: "claim_contract_validation_failed",
    };
    const ajv = ajvWithClaimContractSchema();
    const validate = ajv.compile(schema);

    expect(validate(damaged), JSON.stringify(validate.errors, null, 2)).toBe(true);
    expect(damaged.claimContract).toBeNull();
  });

  it("validates damaged claim-understanding-unavailable without a ClaimContract", () => {
    const schema = readFixture<Record<string, unknown>>("schemas/claim-understanding-result-v2.schema.json");
    const damaged: ClaimUnderstandingResult = {
      schemaVersion: CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
      status: "damaged",
      claimContract: null,
      integrityEvents: [
        {
          type: "claim_contract_validation_failed",
          severity: "error",
          message: "Claim Understanding provider was unavailable before a valid contract could be produced.",
          claimIds: [],
        },
      ],
      blockedReason: null,
      damagedReason: "claim_understanding_unavailable",
    };
    const ajv = ajvWithClaimContractSchema();
    const validate = ajv.compile(schema);

    expect(validate(damaged), JSON.stringify(validate.errors, null, 2)).toBe(true);
    expect(damaged.claimContract).toBeNull();
  });
});
