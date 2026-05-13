export const CLAIM_CONTRACT_V2_SCHEMA_VERSION = "v2.claim_contract.0";

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
    | "prepared_snapshot_invalid"
    | "selected_claim_missing";
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
    status: "accepted" | "blocked";
    selectedClaimFinalityPreserved: boolean;
  };
};

export type PreparedSnapshotClaimContractMigration =
  | {
    status: "accepted";
    claimContract: ClaimContract;
    integrityEvents: ClaimIntegrityEvent[];
  }
  | {
    status: "blocked";
    claimContract: null;
    integrityEvents: ClaimIntegrityEvent[];
  };
