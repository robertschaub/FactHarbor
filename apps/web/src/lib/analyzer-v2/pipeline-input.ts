export type ClaimBoundaryV2SubmittedInput = {
  kind: "text" | "url";
  value: string;
};

export type ClaimBoundaryV2PreparedSeed = {
  acsSnapshot: unknown;
  acsSnapshotHash?: unknown;
  inputGroundingSeedHash?: unknown;
};

export type ClaimBoundaryV2ProgressEvent = {
  message: string;
  progress: number;
};

export type ClaimBoundaryV2Ingress = {
  runIdHint: string | null;
  submitted: ClaimBoundaryV2SubmittedInput;
  preparedSeed: ClaimBoundaryV2PreparedSeed | null;
  selectedAtomicClaimIds: string[];
  emitProgress?: (event: ClaimBoundaryV2ProgressEvent) => void | Promise<void>;
};
