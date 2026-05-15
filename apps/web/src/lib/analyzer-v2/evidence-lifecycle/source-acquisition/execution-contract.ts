import type { QueryPlanSourceAcquisitionHandoffDecision } from "./query-plan-handoff";
import type { SourceAcquisitionStartDecision } from "./types";
import type { SourceAcquisitionStructuralOutcomeKind } from "../source-acquisition-port/types";

export const SOURCE_ACQUISITION_STRUCTURAL_EXECUTION_VERSION =
  "analyzer-v2-source-acquisition-structural-execution-7n2";

export const SOURCE_ACQUISITION_CONTROLLED_HARNESS_AUTHORITY = {
  kind: "controlled_harness_only",
  source: "static_7n2_controlled_harness",
  productionRuntime: false,
  providerSdk: false,
  network: false,
  parser: false,
  searchFetch: false,
  cacheStorage: false,
  sourceReliability: false,
  productRuntime: false,
  publicExposure: false,
} as const;

export type SourceAcquisitionControlledHarnessAuthority =
  typeof SOURCE_ACQUISITION_CONTROLLED_HARNESS_AUTHORITY;

export type SourceAcquisitionHandoffIdentitySnapshot = {
  readonly handoffVersion: string;
  readonly selectedAtomicClaimIds: readonly string[];
  readonly queryIds: readonly string[];
  readonly queryEntryCount: number;
  readonly promptContentHash: string;
  readonly renderedPromptHash: string;
  readonly modelPolicyId: string;
  readonly cacheNamespace: string;
  readonly cacheReason: string;
  readonly cacheCanRead: false;
  readonly cacheCanWrite: false;
  readonly sourceLanguagePolicy: unknown;
};

export type SourceAcquisitionExecutionBudgetSnapshot = {
  readonly version: typeof SOURCE_ACQUISITION_STRUCTURAL_EXECUTION_VERSION;
  readonly source: "static_7n2_controlled_harness";
  readonly handoffVersion: string;
  readonly handoffIdentity: SourceAcquisitionHandoffIdentitySnapshot;
  readonly maxQueryEntries: number;
  readonly maxAttemptsPerQuery: 1;
  readonly maxCandidateRecordsPerQuery: number;
  readonly timeoutMs: number;
  readonly retryPolicy: "none";
  readonly cancellationState: "not_requested" | "requested";
  readonly maxContentPacketPointersPerQuery: number;
};

export type OpaqueSourceContentPacketPointer = {
  readonly contentPacketPointerId: string;
  readonly nonDurable: true;
  readonly dereferenceableByStructuralCore: false;
  readonly rawContentIncluded: false;
};

export type SourceAcquisitionPortAttemptRequest = {
  readonly executionId: string;
  readonly queryId: string;
  readonly retrievalPolicyKey: string;
  readonly queryText: string;
  readonly targetAtomicClaimIds: readonly string[];
  readonly timeoutMs: number;
  readonly maxCandidateRecords: number;
  readonly maxContentPacketPointers: number;
  readonly sourceLanguagePolicy: unknown;
  readonly supplementaryLanguageRationale: string | null;
};

export type SourceAcquisitionPortAttemptResult = {
  readonly attemptId: string;
  readonly outcomeKind: SourceAcquisitionStructuralOutcomeKind;
  readonly durationMs: number;
  readonly candidateIds: readonly string[];
  readonly contentPacketPointers: readonly OpaqueSourceContentPacketPointer[];
};

export type SourceAcquisitionPort = {
  readonly authority: SourceAcquisitionControlledHarnessAuthority;
  readonly acquire: (
    request: SourceAcquisitionPortAttemptRequest,
  ) =>
    | SourceAcquisitionPortAttemptResult
    | Promise<SourceAcquisitionPortAttemptResult>;
};

export type SourceAcquisitionExecutionRequest = {
  readonly executionId: string;
  readonly visibility: "internal_only";
  readonly handoffDecision: QueryPlanSourceAcquisitionHandoffDecision;
  readonly sourceAcquisitionStartDecision: SourceAcquisitionStartDecision;
  readonly budget: SourceAcquisitionExecutionBudgetSnapshot;
  readonly port: SourceAcquisitionPort;
};

export type SourceAcquisitionExecutorStopReason =
  | "not_stopped"
  | "handoff_not_ready"
  | "source_request_invalid"
  | "provenance_missing"
  | "cache_provenance_invalid"
  | "budget_invalid"
  | "budget_stale"
  | "budget_cancelled"
  | "controlled_harness_authority_invalid"
  | "port_result_invalid"
  | "port_candidate_cap_exceeded"
  | "port_content_packet_cap_exceeded"
  | "port_attempt_limit_exceeded"
  | "port_timeout"
  | "partial_execution";

export type SourceAcquisitionExecutionAttempt = {
  readonly executionId: string;
  readonly queryId: string;
  readonly retrievalPolicyKey: string;
  readonly targetAtomicClaimIds: readonly string[];
  readonly attemptId: string;
  readonly outcomeKind: SourceAcquisitionStructuralOutcomeKind;
  readonly executorStopReason: SourceAcquisitionExecutorStopReason;
  readonly durationMs: number;
  readonly candidateCount: number;
  readonly contentPacketPointerCount: number;
  readonly opaqueCandidateIds: readonly string[];
  readonly opaqueContentPacketPointers: readonly OpaqueSourceContentPacketPointer[];
  readonly structuralSuccessIsAcquisitionStatusOnly: true;
};

export type SourceAcquisitionExecutionDecision =
  | {
      readonly version: typeof SOURCE_ACQUISITION_STRUCTURAL_EXECUTION_VERSION;
      readonly visibility: "internal_only";
      readonly status: "blocked";
      readonly executorStopReason: Exclude<
        SourceAcquisitionExecutorStopReason,
        "not_stopped"
      >;
      readonly attempts: readonly [];
    }
  | {
      readonly version: typeof SOURCE_ACQUISITION_STRUCTURAL_EXECUTION_VERSION;
      readonly visibility: "internal_only";
      readonly status: "completed_structural";
      readonly executorStopReason: "not_stopped";
      readonly attempts: readonly SourceAcquisitionExecutionAttempt[];
    }
  | {
      readonly version: typeof SOURCE_ACQUISITION_STRUCTURAL_EXECUTION_VERSION;
      readonly visibility: "internal_only";
      readonly status: "damaged_structural";
      readonly executorStopReason: Exclude<
        SourceAcquisitionExecutorStopReason,
        "not_stopped"
      >;
      readonly attempts: readonly SourceAcquisitionExecutionAttempt[];
    };
