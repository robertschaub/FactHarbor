import { createHash } from "node:crypto";
import {
  isSourceAcquisitionNetworkAuthority,
  readSourceAcquisitionNetworkAuthoritySnapshot,
  type SourceAcquisitionNetworkAuthority,
  type SourceAcquisitionNetworkAuthoritySnapshot,
} from "./source-acquisition-network-authority";
import {
  SOURCE_ACQUISITION_CONTENT_PACKAGE_COMMIT,
  SOURCE_ACQUISITION_CONTENT_PACKAGE_PATH,
  sourceAcquisitionContentApproval,
  validateSourceAcquisitionContentBudgetSnapshot,
  validateSourceAcquisitionContentRequestBinding,
  validateSourceAcquisitionContentTargetEnvelope,
  type SourceAcquisitionContentApproval,
  type SourceAcquisitionContentBudgetSnapshot,
  type SourceAcquisitionContentTargetEnvelope,
} from "./source-acquisition-content-envelope";

export const SOURCE_ACQUISITION_CONTENT_AUTHORITY_VERSION =
  "v2.source-acquisition.content-dereference-authority.7n3b3-1";

export type SourceAcquisitionContentAuthoritySnapshot = {
  readonly kind: "source_acquisition_content_dereference_authority_7n3b3_1";
  readonly source: "v2_7n3b3_1_content_dereference_source_package";
  readonly authorityVersion: typeof SOURCE_ACQUISITION_CONTENT_AUTHORITY_VERSION;
  readonly packagePath: typeof SOURCE_ACQUISITION_CONTENT_PACKAGE_PATH;
  readonly packageCommit: typeof SOURCE_ACQUISITION_CONTENT_PACKAGE_COMMIT;
  readonly approval: SourceAcquisitionContentApproval;
  readonly visibility: "internal_only";
  readonly parentNetworkAuthoritySnapshot: SourceAcquisitionNetworkAuthoritySnapshot;
  readonly providerNetworkAuthoritySnapshotHash: string;
  readonly contentAuthoritySnapshotHash: string;
  readonly contentTargetSnapshotHash: string;
  readonly contentBudgetSnapshotHash: string;
  readonly parentNetworkEndpointSnapshotHash: string;
  readonly parentNetworkBudgetSnapshotHash: string;
  readonly parentCandidateRuntimeConfigSnapshotHash: string;
  readonly parentCandidateRuntimeProviderAllowlistSnapshotHash: string;
  readonly parentCandidateRuntimeBudgetSnapshotHash: string;
  readonly executionState: "content_dereference_default_closed";
  readonly capabilityScope: {
    readonly contentDereference: "hidden_structural_fetch_only";
    readonly providerNetwork: "requires_valid_7n3b2_parent";
    readonly providerSdk: false;
    readonly fetchApi: false;
    readonly parser: false;
    readonly contentPacketSink: false;
    readonly cacheRead: false;
    readonly cacheWrite: false;
    readonly durableStorage: false;
    readonly sourceReliability: false;
    readonly productRuntime: false;
    readonly publicExposure: false;
    readonly liveJobs: false;
    readonly acsPreparedSnapshot: false;
    readonly directUrl: false;
    readonly semanticInterpretation: false;
  };
};

declare const sourceAcquisitionContentAuthorityBrand: unique symbol;

export type SourceAcquisitionContentDereferenceAuthority =
  Readonly<SourceAcquisitionContentAuthoritySnapshot> & {
    readonly [sourceAcquisitionContentAuthorityBrand]: "source_acquisition_content_dereference_authority";
  };

const contentAuthorities = new WeakSet<object>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}

function isNonBlankHash(value: unknown): value is string {
  return typeof value === "string"
    && value.trim().length > 0
    && value === value.trim()
    && !["placeholder", "todo", "unknown"].includes(value.toLowerCase());
}

function sha256Json(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function approvalIsValid(value: SourceAcquisitionContentApproval): boolean {
  return isRecord(value)
    && hasExactKeys(value, [
      "approvedBy",
      "approvedScope",
      "packageCommit",
      "packagePath",
      "status",
    ])
    && value.status === "approved_7n3b3_1_content_dereference"
    && value.approvedBy === "deputy_review_team"
    && value.packagePath === SOURCE_ACQUISITION_CONTENT_PACKAGE_PATH
    && value.packageCommit === SOURCE_ACQUISITION_CONTENT_PACKAGE_COMMIT
    && value.approvedScope === "content_dereference_authority_envelope_transport_only";
}

function capabilityScopeIsValid(
  scope: SourceAcquisitionContentAuthoritySnapshot["capabilityScope"],
): boolean {
  return isRecord(scope)
    && hasExactKeys(scope, [
      "acsPreparedSnapshot",
      "cacheRead",
      "cacheWrite",
      "contentDereference",
      "contentPacketSink",
      "directUrl",
      "durableStorage",
      "fetchApi",
      "liveJobs",
      "parser",
      "productRuntime",
      "providerNetwork",
      "providerSdk",
      "publicExposure",
      "semanticInterpretation",
      "sourceReliability",
    ])
    && scope.contentDereference === "hidden_structural_fetch_only"
    && scope.providerNetwork === "requires_valid_7n3b2_parent"
    && scope.providerSdk === false
    && scope.fetchApi === false
    && scope.parser === false
    && scope.contentPacketSink === false
    && scope.cacheRead === false
    && scope.cacheWrite === false
    && scope.durableStorage === false
    && scope.sourceReliability === false
    && scope.productRuntime === false
    && scope.publicExposure === false
    && scope.liveJobs === false
    && scope.acsPreparedSnapshot === false
    && scope.directUrl === false
    && scope.semanticInterpretation === false;
}

function snapshotIsValid(snapshot: SourceAcquisitionContentAuthoritySnapshot): boolean {
  return isRecord(snapshot)
    && hasExactKeys(snapshot, [
      "approval",
      "authorityVersion",
      "capabilityScope",
      "contentAuthoritySnapshotHash",
      "contentBudgetSnapshotHash",
      "contentTargetSnapshotHash",
      "executionState",
      "kind",
      "packageCommit",
      "packagePath",
      "parentCandidateRuntimeBudgetSnapshotHash",
      "parentCandidateRuntimeConfigSnapshotHash",
      "parentCandidateRuntimeProviderAllowlistSnapshotHash",
      "parentNetworkAuthoritySnapshot",
      "parentNetworkBudgetSnapshotHash",
      "parentNetworkEndpointSnapshotHash",
      "providerNetworkAuthoritySnapshotHash",
      "source",
      "visibility",
    ])
    && snapshot.kind === "source_acquisition_content_dereference_authority_7n3b3_1"
    && snapshot.source === "v2_7n3b3_1_content_dereference_source_package"
    && snapshot.authorityVersion === SOURCE_ACQUISITION_CONTENT_AUTHORITY_VERSION
    && snapshot.packagePath === SOURCE_ACQUISITION_CONTENT_PACKAGE_PATH
    && snapshot.packageCommit === SOURCE_ACQUISITION_CONTENT_PACKAGE_COMMIT
    && approvalIsValid(snapshot.approval)
    && snapshot.visibility === "internal_only"
    && isRecord(snapshot.parentNetworkAuthoritySnapshot)
    && snapshot.parentNetworkAuthoritySnapshot.kind === "source_acquisition_provider_network_authority_7n3b2"
    && snapshot.parentNetworkAuthoritySnapshot.endpointSnapshotHash === snapshot.parentNetworkEndpointSnapshotHash
    && snapshot.parentNetworkAuthoritySnapshot.networkBudgetSnapshotHash === snapshot.parentNetworkBudgetSnapshotHash
    && snapshot.parentNetworkAuthoritySnapshot.candidateRuntimeConfigSnapshotHash
      === snapshot.parentCandidateRuntimeConfigSnapshotHash
    && snapshot.parentNetworkAuthoritySnapshot.candidateRuntimeProviderAllowlistSnapshotHash
      === snapshot.parentCandidateRuntimeProviderAllowlistSnapshotHash
    && snapshot.parentNetworkAuthoritySnapshot.candidateRuntimeBudgetSnapshotHash
      === snapshot.parentCandidateRuntimeBudgetSnapshotHash
    && sha256Json(snapshot.parentNetworkAuthoritySnapshot) === snapshot.providerNetworkAuthoritySnapshotHash
    && isNonBlankHash(snapshot.providerNetworkAuthoritySnapshotHash)
    && isNonBlankHash(snapshot.contentAuthoritySnapshotHash)
    && isNonBlankHash(snapshot.contentTargetSnapshotHash)
    && isNonBlankHash(snapshot.contentBudgetSnapshotHash)
    && isNonBlankHash(snapshot.parentNetworkEndpointSnapshotHash)
    && isNonBlankHash(snapshot.parentNetworkBudgetSnapshotHash)
    && isNonBlankHash(snapshot.parentCandidateRuntimeConfigSnapshotHash)
    && isNonBlankHash(snapshot.parentCandidateRuntimeProviderAllowlistSnapshotHash)
    && isNonBlankHash(snapshot.parentCandidateRuntimeBudgetSnapshotHash)
    && snapshot.executionState === "content_dereference_default_closed"
    && capabilityScopeIsValid(snapshot.capabilityScope);
}

export function createSourceAcquisitionContentDereferenceAuthority(params: {
  readonly networkAuthority: SourceAcquisitionNetworkAuthority;
  readonly targetEnvelope: SourceAcquisitionContentTargetEnvelope;
  readonly budgetSnapshot: SourceAcquisitionContentBudgetSnapshot;
}): SourceAcquisitionContentDereferenceAuthority {
  if (!isSourceAcquisitionNetworkAuthority(params.networkAuthority)) {
    throw new Error("Invalid V2 source-acquisition provider-network authority.");
  }
  if (validateSourceAcquisitionContentTargetEnvelope(params.targetEnvelope).status !== "valid") {
    throw new Error("Invalid V2 source-acquisition content target envelope.");
  }
  if (validateSourceAcquisitionContentBudgetSnapshot(params.budgetSnapshot).status !== "valid") {
    throw new Error("Invalid V2 source-acquisition content budget snapshot.");
  }
  if (
    validateSourceAcquisitionContentRequestBinding({
      target: params.targetEnvelope,
      budget: params.budgetSnapshot,
    }).status !== "valid"
  ) {
    throw new Error("V2 source-acquisition content target and budget hashes do not match.");
  }

  const parentNetworkAuthoritySnapshot =
    readSourceAcquisitionNetworkAuthoritySnapshot(params.networkAuthority);
  const parentNetworkAuthoritySnapshotHash = sha256Json(parentNetworkAuthoritySnapshot);

  if (
    params.targetEnvelope.providerNetworkAuthoritySnapshotHash !== parentNetworkAuthoritySnapshotHash
    || params.budgetSnapshot.providerNetworkAuthoritySnapshotHash !== parentNetworkAuthoritySnapshotHash
  ) {
    throw new Error("V2 source-acquisition content authority hashes do not match parent provider-network authority.");
  }

  const snapshot: SourceAcquisitionContentAuthoritySnapshot = {
    kind: "source_acquisition_content_dereference_authority_7n3b3_1",
    source: "v2_7n3b3_1_content_dereference_source_package",
    authorityVersion: SOURCE_ACQUISITION_CONTENT_AUTHORITY_VERSION,
    packagePath: SOURCE_ACQUISITION_CONTENT_PACKAGE_PATH,
    packageCommit: SOURCE_ACQUISITION_CONTENT_PACKAGE_COMMIT,
    approval: sourceAcquisitionContentApproval(),
    visibility: "internal_only",
    parentNetworkAuthoritySnapshot,
    providerNetworkAuthoritySnapshotHash: parentNetworkAuthoritySnapshotHash,
    contentAuthoritySnapshotHash: params.targetEnvelope.contentAuthoritySnapshotHash,
    contentTargetSnapshotHash: params.targetEnvelope.contentTargetSnapshotHash,
    contentBudgetSnapshotHash: params.budgetSnapshot.contentBudgetSnapshotHash,
    parentNetworkEndpointSnapshotHash: parentNetworkAuthoritySnapshot.endpointSnapshotHash,
    parentNetworkBudgetSnapshotHash: parentNetworkAuthoritySnapshot.networkBudgetSnapshotHash,
    parentCandidateRuntimeConfigSnapshotHash: parentNetworkAuthoritySnapshot.candidateRuntimeConfigSnapshotHash,
    parentCandidateRuntimeProviderAllowlistSnapshotHash:
      parentNetworkAuthoritySnapshot.candidateRuntimeProviderAllowlistSnapshotHash,
    parentCandidateRuntimeBudgetSnapshotHash: parentNetworkAuthoritySnapshot.candidateRuntimeBudgetSnapshotHash,
    executionState: "content_dereference_default_closed",
    capabilityScope: {
      contentDereference: "hidden_structural_fetch_only",
      providerNetwork: "requires_valid_7n3b2_parent",
      providerSdk: false,
      fetchApi: false,
      parser: false,
      contentPacketSink: false,
      cacheRead: false,
      cacheWrite: false,
      durableStorage: false,
      sourceReliability: false,
      productRuntime: false,
      publicExposure: false,
      liveJobs: false,
      acsPreparedSnapshot: false,
      directUrl: false,
      semanticInterpretation: false,
    },
  };

  if (!snapshotIsValid(snapshot)) {
    throw new Error("Invalid V2 source-acquisition content authority snapshot.");
  }

  const authority = {
    ...snapshot,
    approval: Object.freeze({ ...snapshot.approval }),
    parentNetworkAuthoritySnapshot: Object.freeze({
      ...snapshot.parentNetworkAuthoritySnapshot,
      approval: Object.freeze({ ...snapshot.parentNetworkAuthoritySnapshot.approval }),
      parentCandidateAuthoritySnapshot: Object.freeze({
        ...snapshot.parentNetworkAuthoritySnapshot.parentCandidateAuthoritySnapshot,
        approval: Object.freeze({ ...snapshot.parentNetworkAuthoritySnapshot.parentCandidateAuthoritySnapshot.approval }),
        parentAuthoritySnapshot: Object.freeze({
          ...snapshot.parentNetworkAuthoritySnapshot.parentCandidateAuthoritySnapshot.parentAuthoritySnapshot,
          approval: Object.freeze({
            ...snapshot.parentNetworkAuthoritySnapshot.parentCandidateAuthoritySnapshot.parentAuthoritySnapshot.approval,
          }),
          configSnapshot: Object.freeze({
            ...snapshot.parentNetworkAuthoritySnapshot.parentCandidateAuthoritySnapshot.parentAuthoritySnapshot.configSnapshot,
          }),
          capabilityScope: Object.freeze({
            ...snapshot.parentNetworkAuthoritySnapshot.parentCandidateAuthoritySnapshot.parentAuthoritySnapshot.capabilityScope,
          }),
        }),
        capabilityScope: Object.freeze({
          ...snapshot.parentNetworkAuthoritySnapshot.parentCandidateAuthoritySnapshot.capabilityScope,
        }),
      }),
      capabilityScope: Object.freeze({ ...snapshot.parentNetworkAuthoritySnapshot.capabilityScope }),
    }),
    capabilityScope: Object.freeze({ ...snapshot.capabilityScope }),
  };

  Object.freeze(authority);
  contentAuthorities.add(authority);
  return authority as SourceAcquisitionContentDereferenceAuthority;
}

export function isSourceAcquisitionContentDereferenceAuthority(
  value: unknown,
): value is SourceAcquisitionContentDereferenceAuthority {
  return isRecord(value)
    && contentAuthorities.has(value)
    && snapshotIsValid(value as SourceAcquisitionContentAuthoritySnapshot);
}

export function readSourceAcquisitionContentAuthoritySnapshot(
  authority: SourceAcquisitionContentDereferenceAuthority,
): SourceAcquisitionContentAuthoritySnapshot {
  if (!isSourceAcquisitionContentDereferenceAuthority(authority)) {
    throw new Error("Source-acquisition content authority was not created by the runtime owner.");
  }

  return {
    kind: authority.kind,
    source: authority.source,
    authorityVersion: authority.authorityVersion,
    packagePath: authority.packagePath,
    packageCommit: authority.packageCommit,
    approval: { ...authority.approval },
    visibility: authority.visibility,
    parentNetworkAuthoritySnapshot: {
      ...authority.parentNetworkAuthoritySnapshot,
      approval: { ...authority.parentNetworkAuthoritySnapshot.approval },
      parentCandidateAuthoritySnapshot: {
        ...authority.parentNetworkAuthoritySnapshot.parentCandidateAuthoritySnapshot,
        approval: { ...authority.parentNetworkAuthoritySnapshot.parentCandidateAuthoritySnapshot.approval },
        parentAuthoritySnapshot: {
          ...authority.parentNetworkAuthoritySnapshot.parentCandidateAuthoritySnapshot.parentAuthoritySnapshot,
          approval: {
            ...authority.parentNetworkAuthoritySnapshot.parentCandidateAuthoritySnapshot.parentAuthoritySnapshot.approval,
          },
          configSnapshot: {
            ...authority.parentNetworkAuthoritySnapshot.parentCandidateAuthoritySnapshot.parentAuthoritySnapshot.configSnapshot,
          },
          capabilityScope: {
            ...authority.parentNetworkAuthoritySnapshot.parentCandidateAuthoritySnapshot.parentAuthoritySnapshot.capabilityScope,
          },
        },
        capabilityScope: { ...authority.parentNetworkAuthoritySnapshot.parentCandidateAuthoritySnapshot.capabilityScope },
      },
      capabilityScope: { ...authority.parentNetworkAuthoritySnapshot.capabilityScope },
    },
    providerNetworkAuthoritySnapshotHash: authority.providerNetworkAuthoritySnapshotHash,
    contentAuthoritySnapshotHash: authority.contentAuthoritySnapshotHash,
    contentTargetSnapshotHash: authority.contentTargetSnapshotHash,
    contentBudgetSnapshotHash: authority.contentBudgetSnapshotHash,
    parentNetworkEndpointSnapshotHash: authority.parentNetworkEndpointSnapshotHash,
    parentNetworkBudgetSnapshotHash: authority.parentNetworkBudgetSnapshotHash,
    parentCandidateRuntimeConfigSnapshotHash: authority.parentCandidateRuntimeConfigSnapshotHash,
    parentCandidateRuntimeProviderAllowlistSnapshotHash: authority.parentCandidateRuntimeProviderAllowlistSnapshotHash,
    parentCandidateRuntimeBudgetSnapshotHash: authority.parentCandidateRuntimeBudgetSnapshotHash,
    executionState: authority.executionState,
    capabilityScope: { ...authority.capabilityScope },
  };
}
