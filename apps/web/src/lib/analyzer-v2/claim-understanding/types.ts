export const CLAIM_CONTRACT_V2_SCHEMA_VERSION = "v2.claim_contract.0";
export const CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION = "v2.claim_understanding_result.0";
export const CLAIM_UNDERSTANDING_GATEWAY_OUTPUT_SCHEMA_VERSION = CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION;
export const CLAIM_UNDERSTANDING_SHELL_ONLY_PLACEHOLDER_CLAIM_IDS = ["AC_V2_SHELL_01"] as const;

export type Gate1Status = {
  status: "passed" | "failed" | "blocked";
  source: "acs_prepared_snapshot" | "v2_claim_understanding";
  summary: string;
  reasons: string[];
};

export type ClaimIntegrityEvent = {
  type:
    | "acs_snapshot_consumed"
    | "duplicate_selected_claim_id"
    | "claim_contract_validation_failed"
    | "no_valid_claim"
    | "prepared_snapshot_invalid"
    | "selected_claim_missing"
    | "shell_placeholder_claim_id";
  severity: "info" | "warning" | "error";
  message: string;
  claimIds: string[];
};

export type InputGroundingSeed = {
  source: "acs_prepared_snapshot" | "direct_input";
  inputType: "text" | "url";
  inputValue: string;
  resolvedInputText: string;
  detectedLanguage: string;
  currentDate: string;
  acsSnapshotHash: string | null;
  inputGroundingSeedHash: string | null;
};

export type V2AtomicClaim = {
  id: string;
  statement: string;
  selected: boolean;
  source: "acs_prepared_snapshot" | "v2_claim_understanding";
  gate1Status: Gate1Status;
  integrityEvents: ClaimIntegrityEvent[];
};

// Gateway-owned success contract; prompt/model output must be mapped into this shape.
export type ClaimContract = {
  schemaVersion: typeof CLAIM_CONTRACT_V2_SCHEMA_VERSION;
  input: {
    inputType: "text" | "url";
    inputValue: string;
    resolvedInputText: string;
    detectedLanguage: string;
    selectedAtomicClaimIds: string[];
  };
  inputGroundingSeed: InputGroundingSeed;
  atomicClaims: V2AtomicClaim[];
  integrityEvents: ClaimIntegrityEvent[];
  acsMigration: {
    sourceSchemaVersion: "prepared-stage1-v1";
    status: "accepted";
    selectedClaimFinalityPreserved: boolean;
  } | null;
};

export type ClaimUnderstandingBlockedReason =
  | "duplicate_selected_claim_id"
  | "no_valid_claim"
  | "prepared_snapshot_invalid"
  | "selected_claim_missing"
  | "shell_placeholder_claim_id";

export type ClaimUnderstandingDamagedReason =
  | "claim_contract_validation_failed"
  | "claim_understanding_unavailable";

// Non-executable result envelope for Claim Understanding outcomes before prompt activation.
export type ClaimUnderstandingResult =
  | {
    schemaVersion: typeof CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION;
    status: "accepted";
    claimContract: ClaimContract;
    integrityEvents: ClaimIntegrityEvent[];
    blockedReason: null;
    damagedReason: null;
  }
  | {
    schemaVersion: typeof CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION;
    status: "blocked";
    claimContract: null;
    integrityEvents: ClaimIntegrityEvent[];
    blockedReason: ClaimUnderstandingBlockedReason;
    damagedReason: null;
  }
  | {
    schemaVersion: typeof CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION;
    status: "damaged";
    claimContract: null;
    integrityEvents: ClaimIntegrityEvent[];
    blockedReason: null;
    damagedReason: ClaimUnderstandingDamagedReason;
  };

export type PreparedSnapshotClaimContractMigration = Extract<
  ClaimUnderstandingResult,
  { status: "accepted" | "blocked" }
>;

export function isShellOnlyPlaceholderClaimId(claimId: string): boolean {
  return CLAIM_UNDERSTANDING_SHELL_ONLY_PLACEHOLDER_CLAIM_IDS.includes(
    claimId as typeof CLAIM_UNDERSTANDING_SHELL_ONLY_PLACEHOLDER_CLAIM_IDS[number],
  );
}
