import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runClaimBoundaryPipelineV2 } from "@/lib/analyzer-v2";

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

type JsonSchema = {
  $defs?: Record<string, JsonSchema>;
  $ref?: string;
  anyOf?: JsonSchema[];
  const?: JsonValue;
  enum?: JsonValue[];
  type?: string | string[];
  required?: string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  additionalProperties?: boolean | JsonSchema;
  minLength?: number;
  minItems?: number;
  minimum?: number;
  maximum?: number;
};

const fixturesDir = path.resolve(process.cwd(), "test/fixtures/analyzer-v2");

function readJson<T extends JsonValue = JsonValue>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(fixturesDir, relativePath), "utf8")) as T;
}

function isObject(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sameJsonValue(left: JsonValue, right: JsonValue): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function resolveLocalRef(root: JsonSchema, ref: string): JsonSchema {
  if (!ref.startsWith("#/$defs/")) {
    throw new Error(`Unsupported JSON schema ref in test validator: ${ref}`);
  }
  const key = ref.slice("#/$defs/".length);
  const resolved = root.$defs?.[key];
  if (!resolved) {
    throw new Error(`Unresolved JSON schema ref in test validator: ${ref}`);
  }
  return resolved;
}

function matchesType(value: JsonValue, type: string): boolean {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return isObject(value);
  if (type === "integer") return typeof value === "number" && Number.isInteger(value);
  return typeof value === type;
}

function validateSchema(
  schema: JsonSchema,
  value: JsonValue,
  root: JsonSchema = schema,
  location = "$",
): string[] {
  if (schema.$ref) {
    return validateSchema(resolveLocalRef(root, schema.$ref), value, root, location);
  }

  if (schema.anyOf) {
    const passed = schema.anyOf.some((candidate) => validateSchema(candidate, value, root, location).length === 0);
    return passed ? [] : [`${location} did not match any anyOf schema`];
  }

  const errors: string[] = [];

  if ("const" in schema && !sameJsonValue(value, schema.const ?? null)) {
    errors.push(`${location} expected const ${JSON.stringify(schema.const)}`);
  }

  if (schema.enum && !schema.enum.some((candidate) => sameJsonValue(value, candidate))) {
    errors.push(`${location} expected one of ${JSON.stringify(schema.enum)}`);
  }

  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => matchesType(value, type))) {
      errors.push(`${location} expected type ${types.join("|")}`);
      return errors;
    }
  }

  if (typeof value === "string" && schema.minLength !== undefined && value.length < schema.minLength) {
    errors.push(`${location} expected minLength ${schema.minLength}`);
  }

  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${location} expected minimum ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${location} expected maximum ${schema.maximum}`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${location} expected minItems ${schema.minItems}`);
    }
    if (schema.items) {
      value.forEach((item, index) => {
        errors.push(...validateSchema(schema.items as JsonSchema, item, root, `${location}[${index}]`));
      });
    }
  }

  if (isObject(value)) {
    for (const requiredKey of schema.required ?? []) {
      if (!(requiredKey in value)) {
        errors.push(`${location}.${requiredKey} is required`);
      }
    }

    for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
      if (key in value) {
        errors.push(...validateSchema(childSchema, value[key], root, `${location}.${key}`));
      }
    }

    if (schema.additionalProperties === false) {
      const knownKeys = new Set(Object.keys(schema.properties ?? {}));
      for (const key of Object.keys(value)) {
        if (!knownKeys.has(key)) {
          errors.push(`${location}.${key} is not allowed`);
        }
      }
    }
  }

  return errors;
}

function expectValid(schema: JsonSchema, value: JsonValue): void {
  expect(validateSchema(schema, value)).toEqual([]);
}

describe("analyzer-v2 JSON contract fixtures", () => {
  const reportV2Schema = readJson<JsonSchema>("schemas/report-result-v2.schema.json");
  const warningV2Schema = readJson<JsonSchema>("schemas/warning-event-v2.schema.json");
  const preparedStage1Schema = readJson<JsonSchema>("schemas/prepared-stage1-v1.schema.json");
  const claimSelectionDraftSchema = readJson<JsonSchema>("schemas/claim-selection-draft-v1.schema.json");
  const legacyV1Schema = readJson<JsonSchema>("schemas/report-result-v1-compat.schema.json");

  const reportV2 = readJson<Record<string, JsonValue>>("report-result-v2.fixture.json");
  const warningV2 = readJson<Record<string, JsonValue>>("warning-event-v2.fixture.json");
  const preparedStage1 = readJson<Record<string, JsonValue>>("acs-prepared-stage1-v1.fixture.json");
  const claimSelectionDraft = readJson<Record<string, JsonValue>>("acs-draft-v1.fixture.json");
  const legacyV1 = readJson<Record<string, JsonValue>>("report-result-v1-legacy.fixture.json");

  it("validates the V2 ReportResult golden fixture against the JSON schema", () => {
    expectValid(reportV2Schema, reportV2);
    expect(reportV2._schemaVersion).toBe("4.0.0-cb-precutover");
    expect((reportV2.meta as Record<string, JsonValue>).schemaVersion).toBe(reportV2._schemaVersion);
    expect((reportV2.meta as Record<string, JsonValue>).pipeline).toBe("claimboundary-v2");
    expect(reportV2.reportGeneration).toEqual(expect.objectContaining({
      profileId: "claimboundary-v2-precutover-fixture",
      reportWriterVersion: "v2.fixture.0",
      exportAdapterVersion: "v2.compatibility-view.0",
      sourceCommit: "fixture-commit",
    }));
  });

  it("validates the V2 damaged shell envelope against the JSON schema", async () => {
    const shellResult = await runClaimBoundaryPipelineV2(
      {
        runIdHint: "job-v2-contract-shell",
        submitted: {
          kind: "text",
          value: "Structural shell contract input",
        },
        preparedSeed: null,
        selectedAtomicClaimIds: ["AC_SELECTED_01"],
      },
      {
        now: () => new Date("2026-05-13T12:34:56.000Z"),
      },
    );
    const resultJson = JSON.parse(JSON.stringify(shellResult.resultJson)) as Record<string, JsonValue>;

    expectValid(reportV2Schema, resultJson);
    expect((resultJson.meta as Record<string, JsonValue>).runId).toBe("job-v2-contract-shell");
    expect((resultJson.meta as Record<string, JsonValue>).generatedUtc).toBe("2026-05-13T12:34:56.000Z");
    expect((resultJson.qualityGates as Record<string, JsonValue>).damagedReport).toBe(true);
    expect((resultJson.narrative as Record<string, JsonValue>).reportQualityStatus).toBe("damaged");
    expect(resultJson.reportGeneration).toEqual(expect.objectContaining({
      profileId: "claimboundary-v2-precutover-damaged",
      reportWriterVersion: "v2.shell.0",
      sourceCommit: null,
    }));
    expect(resultJson.warnings).toEqual([
      expect.objectContaining({
        type: "report_damaged",
        visibility: "blocking",
        primaryIssueEligible: true,
      }),
    ]);
  });

  it("validates the standalone WarningEvent fixture and embedded report warning", () => {
    expectValid(warningV2Schema, warningV2);

    const embeddedWarnings = reportV2.warnings as JsonValue[];
    expect(embeddedWarnings).toHaveLength(1);
    expectValid(warningV2Schema, embeddedWarnings[0]);
    expect(embeddedWarnings[0]).toEqual(warningV2);
  });

  it("validates the V1 ACS prepared Stage 1 compatibility fixture", () => {
    expectValid(preparedStage1Schema, preparedStage1);
    expect(preparedStage1.version).toBe(1);

    const reportInput = reportV2.input as Record<string, JsonValue>;
    const preparedUnderstanding = preparedStage1.preparedUnderstanding as Record<string, JsonValue>;
    const preparedClaims = preparedUnderstanding.atomicClaims as Array<Record<string, JsonValue>>;
    const selectedClaimIds = reportInput.selectedAtomicClaimIds as JsonValue[];

    expect(reportInput.inputValue).toBe(preparedStage1.resolvedInputText);
    expect(selectedClaimIds).toEqual(["AC_01"]);
    expect(preparedClaims.map((claim) => claim.id)).toEqual(expect.arrayContaining(selectedClaimIds));
  });

  it("validates the V1 ACS draft wrapper and preserves selected-claim finality", () => {
    expectValid(claimSelectionDraftSchema, claimSelectionDraft);

    const draftState = claimSelectionDraft.draftState as Record<string, JsonValue>;
    const rankedClaimIds = draftState.rankedClaimIds as JsonValue[];
    const recommendedClaimIds = draftState.recommendedClaimIds as JsonValue[];
    const selectedClaimIds = draftState.selectedClaimIds as JsonValue[];
    const prepared = draftState.preparedStage1 as Record<string, JsonValue>;
    const understanding = prepared.preparedUnderstanding as Record<string, JsonValue>;
    const preparedClaims = understanding.atomicClaims as Array<Record<string, JsonValue>>;
    const preparedClaimIds = preparedClaims.map((claim) => claim.id);

    expect(selectedClaimIds).toEqual((reportV2.input as Record<string, JsonValue>).selectedAtomicClaimIds);
    expect(rankedClaimIds).toEqual(expect.arrayContaining(selectedClaimIds));
    expect(recommendedClaimIds).toEqual(expect.arrayContaining(selectedClaimIds));
    expect(preparedClaimIds).toEqual(expect.arrayContaining(selectedClaimIds));
  });

  it("validates the legacy V1 fixture without accepting it as a V2 result", () => {
    expectValid(legacyV1Schema, legacyV1);
    expect(legacyV1._schemaVersion).toBe("3.2.0-cb");
    expect(validateSchema(reportV2Schema, legacyV1)).not.toEqual([]);
  });

  it("keeps canonical selected-claim state internally consistent", () => {
    const selectedClaimIds = (reportV2.input as Record<string, JsonValue>).selectedAtomicClaimIds as JsonValue[];
    const atomicClaims = ((reportV2.claims as Record<string, JsonValue>).atomicClaims ?? []) as Array<Record<string, JsonValue>>;
    const selectedClaims = atomicClaims.filter((claim) => claim.selected === true).map((claim) => claim.id);

    expect(selectedClaims).toEqual(selectedClaimIds);
  });
});
