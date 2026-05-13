import {
  CLAIM_CONTRACT_V2_SCHEMA_VERSION,
  type ClaimContract,
  type ClaimIntegrityEvent,
  type PreparedSnapshotClaimContractMigration,
} from "@/lib/analyzer-v2/claim-understanding/types";

type PreparedAtomicClaimLike = {
  id?: unknown;
  statement?: unknown;
};

type PreparedStage1SnapshotLike = {
  resolvedInputText?: unknown;
  preparedUnderstanding?: {
    detectedInputType?: unknown;
    detectedLanguage?: unknown;
    atomicClaims?: unknown;
    gate1Stats?: {
      overallPass?: unknown;
    };
  };
};

export type MigratePreparedStage1SnapshotOptions = {
  currentDate: string;
  inputValue?: string;
  acsSnapshotHash?: string | null;
  inputGroundingSeedHash?: string | null;
};

function event(
  type: ClaimIntegrityEvent["type"],
  severity: ClaimIntegrityEvent["severity"],
  message: string,
  claimIds: string[] = [],
): ClaimIntegrityEvent {
  return { type, severity, message, claimIds };
}

function asNonBlankString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readPreparedClaims(snapshot: PreparedStage1SnapshotLike): PreparedAtomicClaimLike[] {
  const claims = snapshot.preparedUnderstanding?.atomicClaims;
  return Array.isArray(claims) ? claims as PreparedAtomicClaimLike[] : [];
}

function normalizeSelectedClaimIds(selectedClaimIds: string[]): string[] {
  return selectedClaimIds.map((claimId) => claimId.trim()).filter((claimId) => claimId.length > 0);
}

function hasDuplicate(values: string[]): boolean {
  return new Set(values).size !== values.length;
}

export function migratePreparedStage1SnapshotToClaimContract(
  snapshot: PreparedStage1SnapshotLike,
  selectedClaimIds: string[],
  options: MigratePreparedStage1SnapshotOptions,
): PreparedSnapshotClaimContractMigration {
  const normalizedSelectedClaimIds = normalizeSelectedClaimIds(selectedClaimIds);
  const preparedClaims = readPreparedClaims(snapshot);
  const preparedClaimById = new Map(
    preparedClaims
      .map((claim) => [asNonBlankString(claim.id), asNonBlankString(claim.statement)] as const)
      .filter((entry): entry is readonly [string, string] => Boolean(entry[0] && entry[1])),
  );

  if (normalizedSelectedClaimIds.length === 0) {
    return {
      status: "blocked",
      claimContract: null,
      integrityEvents: [
        event("prepared_snapshot_invalid", "error", "Prepared snapshot migration requires selected claim IDs."),
      ],
    };
  }

  if (hasDuplicate(normalizedSelectedClaimIds)) {
    return {
      status: "blocked",
      claimContract: null,
      integrityEvents: [
        event("duplicate_selected_claim_id", "error", "Prepared snapshot migration received duplicate selected claim IDs.", normalizedSelectedClaimIds),
      ],
    };
  }

  const missingClaimIds = normalizedSelectedClaimIds.filter((claimId) => !preparedClaimById.has(claimId));
  if (missingClaimIds.length > 0) {
    return {
      status: "blocked",
      claimContract: null,
      integrityEvents: [
        event("selected_claim_missing", "error", "Selected claim IDs must exist in the prepared snapshot.", missingClaimIds),
      ],
    };
  }

  const resolvedInputText = asNonBlankString(snapshot.resolvedInputText);
  const inputType = snapshot.preparedUnderstanding?.detectedInputType;
  if (!resolvedInputText || (inputType !== "text" && inputType !== "url")) {
    return {
      status: "blocked",
      claimContract: null,
      integrityEvents: [
        event("prepared_snapshot_invalid", "error", "Prepared snapshot is missing structural input fields."),
      ],
    };
  }

  const detectedLanguage = asNonBlankString(snapshot.preparedUnderstanding?.detectedLanguage) ?? "und";
  const gate1Passed = snapshot.preparedUnderstanding?.gate1Stats?.overallPass === true;
  const acceptedEvent = event(
    "acs_snapshot_consumed",
    "info",
    "V2 claim contract consumed selected claims from the V1 prepared snapshot without rewriting claim text.",
    normalizedSelectedClaimIds,
  );

  const claimContract: ClaimContract = {
    schemaVersion: CLAIM_CONTRACT_V2_SCHEMA_VERSION,
    input: {
      inputType,
      inputValue: options.inputValue ?? resolvedInputText,
      resolvedInputText,
      detectedLanguage,
      selectedAtomicClaimIds: normalizedSelectedClaimIds,
    },
    inputGroundingSeed: {
      source: "acs_prepared_snapshot",
      inputType,
      inputValue: options.inputValue ?? resolvedInputText,
      resolvedInputText,
      detectedLanguage,
      currentDate: options.currentDate,
      acsSnapshotHash: options.acsSnapshotHash ?? null,
      inputGroundingSeedHash: options.inputGroundingSeedHash ?? null,
    },
    atomicClaims: normalizedSelectedClaimIds.map((claimId) => ({
      id: claimId,
      statement: preparedClaimById.get(claimId) as string,
      selected: true,
      source: "acs_prepared_snapshot",
      gate1Status: {
        status: gate1Passed ? "passed" : "blocked",
        source: "acs_prepared_snapshot",
        summary: gate1Passed
          ? "V1 prepared snapshot reported Gate 1 overall pass."
          : "V1 prepared snapshot did not report Gate 1 overall pass.",
        reasons: [],
      },
      integrityEvents: [acceptedEvent],
    })),
    integrityEvents: [acceptedEvent],
    acsMigration: {
      sourceSchemaVersion: "prepared-stage1-v1",
      status: "accepted",
      selectedClaimFinalityPreserved: true,
    },
  };

  return {
    status: "accepted",
    claimContract,
    integrityEvents: [acceptedEvent],
  };
}
