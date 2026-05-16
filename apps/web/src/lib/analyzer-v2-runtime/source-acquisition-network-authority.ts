import {
  isSourceAcquisitionCandidateRuntimeAuthority,
  readSourceAcquisitionCandidateRuntimeAuthoritySnapshot,
  type SourceAcquisitionCandidateRuntimeAuthority,
  type SourceAcquisitionCandidateRuntimeAuthoritySnapshot,
} from "@/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime";
import {
  SOURCE_ACQUISITION_NETWORK_PACKAGE_COMMIT,
  SOURCE_ACQUISITION_NETWORK_PACKAGE_PATH,
  sourceAcquisitionNetworkApproval,
  validateSourceAcquisitionNetworkBudgetSnapshot,
  validateSourceAcquisitionNetworkEndpointSnapshot,
  type SourceAcquisitionNetworkApproval,
  type SourceAcquisitionNetworkBudgetSnapshot,
  type SourceAcquisitionNetworkEndpointSnapshot,
} from "./source-acquisition-network-envelope";

export const SOURCE_ACQUISITION_NETWORK_AUTHORITY_VERSION =
  "v2.source-acquisition.provider-network-authority.7n3b2";

export type SourceAcquisitionNetworkAuthoritySnapshot = {
  readonly kind: "source_acquisition_provider_network_authority_7n3b2";
  readonly source: "v2_7n3b2_candidate_provider_network_package";
  readonly authorityVersion: typeof SOURCE_ACQUISITION_NETWORK_AUTHORITY_VERSION;
  readonly packagePath: typeof SOURCE_ACQUISITION_NETWORK_PACKAGE_PATH;
  readonly packageCommit: typeof SOURCE_ACQUISITION_NETWORK_PACKAGE_COMMIT;
  readonly approval: SourceAcquisitionNetworkApproval;
  readonly visibility: "internal_only";
  readonly parentCandidateAuthoritySnapshot: SourceAcquisitionCandidateRuntimeAuthoritySnapshot;
  readonly endpointSnapshotHash: string;
  readonly networkBudgetSnapshotHash: string;
  readonly candidateRuntimeConfigSnapshotHash: string;
  readonly candidateRuntimeProviderAllowlistSnapshotHash: string;
  readonly candidateRuntimeBudgetSnapshotHash: string;
  readonly executionState: "provider_network_default_closed";
  readonly capabilityScope: {
    readonly providerNetwork: "sdk_free_node_core_https_only";
    readonly providerSdk: false;
    readonly fetchApi: false;
    readonly contentDereference: false;
    readonly parser: false;
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

declare const sourceAcquisitionNetworkAuthorityBrand: unique symbol;

export type SourceAcquisitionNetworkAuthority =
  Readonly<SourceAcquisitionNetworkAuthoritySnapshot> & {
    readonly [sourceAcquisitionNetworkAuthorityBrand]: "source_acquisition_provider_network_authority";
  };

const networkAuthorities = new WeakSet<object>();

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

function approvalIsValid(value: SourceAcquisitionNetworkApproval): boolean {
  return isRecord(value)
    && hasExactKeys(value, [
      "approvedBy",
      "approvedScope",
      "packageCommit",
      "packagePath",
      "status",
    ])
    && value.status === "approved_7n3b2_candidate_provider_network"
    && value.approvedBy === "deputy_review_team"
    && value.packagePath === SOURCE_ACQUISITION_NETWORK_PACKAGE_PATH
    && value.packageCommit === SOURCE_ACQUISITION_NETWORK_PACKAGE_COMMIT
    && value.approvedScope === "candidate_provider_network_only_sdk_free";
}

function capabilityScopeIsValid(
  scope: SourceAcquisitionNetworkAuthoritySnapshot["capabilityScope"],
): boolean {
  return isRecord(scope)
    && hasExactKeys(scope, [
      "acsPreparedSnapshot",
      "cacheRead",
      "cacheWrite",
      "contentDereference",
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
    && scope.providerNetwork === "sdk_free_node_core_https_only"
    && scope.providerSdk === false
    && scope.fetchApi === false
    && scope.contentDereference === false
    && scope.parser === false
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

function snapshotIsValid(snapshot: SourceAcquisitionNetworkAuthoritySnapshot): boolean {
  return isRecord(snapshot)
    && hasExactKeys(snapshot, [
      "approval",
      "authorityVersion",
      "candidateRuntimeBudgetSnapshotHash",
      "candidateRuntimeConfigSnapshotHash",
      "candidateRuntimeProviderAllowlistSnapshotHash",
      "capabilityScope",
      "endpointSnapshotHash",
      "executionState",
      "kind",
      "networkBudgetSnapshotHash",
      "packageCommit",
      "packagePath",
      "parentCandidateAuthoritySnapshot",
      "source",
      "visibility",
    ])
    && snapshot.kind === "source_acquisition_provider_network_authority_7n3b2"
    && snapshot.source === "v2_7n3b2_candidate_provider_network_package"
    && snapshot.authorityVersion === SOURCE_ACQUISITION_NETWORK_AUTHORITY_VERSION
    && snapshot.packagePath === SOURCE_ACQUISITION_NETWORK_PACKAGE_PATH
    && snapshot.packageCommit === SOURCE_ACQUISITION_NETWORK_PACKAGE_COMMIT
    && approvalIsValid(snapshot.approval)
    && snapshot.visibility === "internal_only"
    && isRecord(snapshot.parentCandidateAuthoritySnapshot)
    && snapshot.parentCandidateAuthoritySnapshot.kind === "source_acquisition_candidate_runtime_authority_7n3b1"
    && snapshot.parentCandidateAuthoritySnapshot.configSnapshotHash === snapshot.candidateRuntimeConfigSnapshotHash
    && snapshot.parentCandidateAuthoritySnapshot.providerAllowlistSnapshotHash
      === snapshot.candidateRuntimeProviderAllowlistSnapshotHash
    && snapshot.parentCandidateAuthoritySnapshot.budgetSnapshotHash === snapshot.candidateRuntimeBudgetSnapshotHash
    && isNonBlankHash(snapshot.endpointSnapshotHash)
    && isNonBlankHash(snapshot.networkBudgetSnapshotHash)
    && isNonBlankHash(snapshot.candidateRuntimeConfigSnapshotHash)
    && isNonBlankHash(snapshot.candidateRuntimeProviderAllowlistSnapshotHash)
    && isNonBlankHash(snapshot.candidateRuntimeBudgetSnapshotHash)
    && snapshot.executionState === "provider_network_default_closed"
    && capabilityScopeIsValid(snapshot.capabilityScope);
}

export function createSourceAcquisitionNetworkAuthority(params: {
  readonly candidateAuthority: SourceAcquisitionCandidateRuntimeAuthority;
  readonly endpointSnapshot: SourceAcquisitionNetworkEndpointSnapshot;
  readonly budgetSnapshot: SourceAcquisitionNetworkBudgetSnapshot;
}): SourceAcquisitionNetworkAuthority {
  if (!isSourceAcquisitionCandidateRuntimeAuthority(params.candidateAuthority)) {
    throw new Error("Invalid V2 source-acquisition candidate runtime authority.");
  }
  if (validateSourceAcquisitionNetworkEndpointSnapshot(params.endpointSnapshot).status !== "valid") {
    throw new Error("Invalid V2 source-acquisition network endpoint snapshot.");
  }
  if (validateSourceAcquisitionNetworkBudgetSnapshot(params.budgetSnapshot).status !== "valid") {
    throw new Error("Invalid V2 source-acquisition network budget snapshot.");
  }

  const parentCandidateAuthoritySnapshot =
    readSourceAcquisitionCandidateRuntimeAuthoritySnapshot(params.candidateAuthority);

  if (
    params.budgetSnapshot.endpointSnapshotHash !== params.endpointSnapshot.endpointSnapshotHash
    || params.budgetSnapshot.candidateRuntimeConfigSnapshotHash
      !== parentCandidateAuthoritySnapshot.configSnapshotHash
    || params.budgetSnapshot.candidateRuntimeProviderAllowlistSnapshotHash
      !== parentCandidateAuthoritySnapshot.providerAllowlistSnapshotHash
    || params.budgetSnapshot.candidateRuntimeBudgetSnapshotHash
      !== parentCandidateAuthoritySnapshot.budgetSnapshotHash
  ) {
    throw new Error("V2 source-acquisition network authority hashes do not match parent provenance.");
  }

  const snapshot: SourceAcquisitionNetworkAuthoritySnapshot = {
    kind: "source_acquisition_provider_network_authority_7n3b2",
    source: "v2_7n3b2_candidate_provider_network_package",
    authorityVersion: SOURCE_ACQUISITION_NETWORK_AUTHORITY_VERSION,
    packagePath: SOURCE_ACQUISITION_NETWORK_PACKAGE_PATH,
    packageCommit: SOURCE_ACQUISITION_NETWORK_PACKAGE_COMMIT,
    approval: sourceAcquisitionNetworkApproval(),
    visibility: "internal_only",
    parentCandidateAuthoritySnapshot,
    endpointSnapshotHash: params.endpointSnapshot.endpointSnapshotHash,
    networkBudgetSnapshotHash: params.budgetSnapshot.networkBudgetSnapshotHash,
    candidateRuntimeConfigSnapshotHash: parentCandidateAuthoritySnapshot.configSnapshotHash,
    candidateRuntimeProviderAllowlistSnapshotHash: parentCandidateAuthoritySnapshot.providerAllowlistSnapshotHash,
    candidateRuntimeBudgetSnapshotHash: parentCandidateAuthoritySnapshot.budgetSnapshotHash,
    executionState: "provider_network_default_closed",
    capabilityScope: {
      providerNetwork: "sdk_free_node_core_https_only",
      providerSdk: false,
      fetchApi: false,
      contentDereference: false,
      parser: false,
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
    throw new Error("Invalid V2 source-acquisition network authority snapshot.");
  }

  const authority = {
    ...snapshot,
    approval: Object.freeze({ ...snapshot.approval }),
    parentCandidateAuthoritySnapshot: Object.freeze({
      ...snapshot.parentCandidateAuthoritySnapshot,
      approval: Object.freeze({ ...snapshot.parentCandidateAuthoritySnapshot.approval }),
      parentAuthoritySnapshot: Object.freeze({
        ...snapshot.parentCandidateAuthoritySnapshot.parentAuthoritySnapshot,
        approval: Object.freeze({ ...snapshot.parentCandidateAuthoritySnapshot.parentAuthoritySnapshot.approval }),
        configSnapshot: Object.freeze({
          ...snapshot.parentCandidateAuthoritySnapshot.parentAuthoritySnapshot.configSnapshot,
        }),
        capabilityScope: Object.freeze({
          ...snapshot.parentCandidateAuthoritySnapshot.parentAuthoritySnapshot.capabilityScope,
        }),
      }),
      capabilityScope: Object.freeze({ ...snapshot.parentCandidateAuthoritySnapshot.capabilityScope }),
    }),
    capabilityScope: Object.freeze({ ...snapshot.capabilityScope }),
  };

  Object.freeze(authority);
  networkAuthorities.add(authority);
  return authority as SourceAcquisitionNetworkAuthority;
}

export function isSourceAcquisitionNetworkAuthority(
  value: unknown,
): value is SourceAcquisitionNetworkAuthority {
  return isRecord(value)
    && networkAuthorities.has(value)
    && snapshotIsValid(value as SourceAcquisitionNetworkAuthoritySnapshot);
}

export function readSourceAcquisitionNetworkAuthoritySnapshot(
  authority: SourceAcquisitionNetworkAuthority,
): SourceAcquisitionNetworkAuthoritySnapshot {
  if (!isSourceAcquisitionNetworkAuthority(authority)) {
    throw new Error("Source-acquisition network authority was not created by the runtime owner.");
  }

  return {
    kind: authority.kind,
    source: authority.source,
    authorityVersion: authority.authorityVersion,
    packagePath: authority.packagePath,
    packageCommit: authority.packageCommit,
    approval: { ...authority.approval },
    visibility: authority.visibility,
    parentCandidateAuthoritySnapshot: {
      ...authority.parentCandidateAuthoritySnapshot,
      approval: { ...authority.parentCandidateAuthoritySnapshot.approval },
      parentAuthoritySnapshot: {
        ...authority.parentCandidateAuthoritySnapshot.parentAuthoritySnapshot,
        approval: { ...authority.parentCandidateAuthoritySnapshot.parentAuthoritySnapshot.approval },
        configSnapshot: { ...authority.parentCandidateAuthoritySnapshot.parentAuthoritySnapshot.configSnapshot },
        capabilityScope: { ...authority.parentCandidateAuthoritySnapshot.parentAuthoritySnapshot.capabilityScope },
      },
      capabilityScope: { ...authority.parentCandidateAuthoritySnapshot.capabilityScope },
    },
    endpointSnapshotHash: authority.endpointSnapshotHash,
    networkBudgetSnapshotHash: authority.networkBudgetSnapshotHash,
    candidateRuntimeConfigSnapshotHash: authority.candidateRuntimeConfigSnapshotHash,
    candidateRuntimeProviderAllowlistSnapshotHash: authority.candidateRuntimeProviderAllowlistSnapshotHash,
    candidateRuntimeBudgetSnapshotHash: authority.candidateRuntimeBudgetSnapshotHash,
    executionState: authority.executionState,
    capabilityScope: { ...authority.capabilityScope },
  };
}
