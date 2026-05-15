export const SOURCE_ACQUISITION_RUNTIME_AUTHORITY_VERSION =
  "v2.source-acquisition.runtime-authority.7n3a";
export const SOURCE_ACQUISITION_RUNTIME_AUTHORITY_PACKAGE_PATH =
  "Docs/WIP/2026-05-16_V2_Slice_7N3A_Source_IO_Authority_Boundary_Package.md";

export type SourceAcquisitionRuntimeAuthorityApproval = {
  readonly status: "approved_7n3a_authority_contract_only";
  readonly approvedBy: "deputy_review_team";
  readonly packagePath: typeof SOURCE_ACQUISITION_RUNTIME_AUTHORITY_PACKAGE_PATH;
  readonly packageCommit: "8b4035cc";
  readonly approvedScope: "authority_boundary_contracts_only";
};

export type SourceAcquisitionRuntimeAuthorityCapabilityScope = {
  readonly concreteProviderIo: false;
  readonly providerSdk: false;
  readonly searchFetch: false;
  readonly network: false;
  readonly parser: false;
  readonly urlDereference: false;
  readonly cacheRead: false;
  readonly cacheWrite: false;
  readonly durableStorage: false;
  readonly sourceReliability: false;
  readonly productRuntime: false;
  readonly publicExposure: false;
  readonly liveJobs: false;
  readonly acsPreparedSnapshot: false;
  readonly directUrl: false;
  readonly evidenceCorpusPopulation: false;
  readonly semanticInterpretation: false;
};

export type SourceAcquisitionRuntimeAuthorityConfigSnapshot = {
  readonly source: "v2_task_policy_snapshot";
  readonly freezeLocation: "runtime_owner_contract";
  readonly configSnapshotHash: string;
  readonly providerAllowlistSnapshotHash: string;
  readonly budgetSnapshotHash: string;
  readonly executionState: "not_executable_authority_contract_only";
};

export type SourceAcquisitionRuntimeAuthoritySnapshot = {
  readonly kind: "source_acquisition_runtime_authority_7n3a";
  readonly source: "v2_7n3a_source_io_authority_boundary_package";
  readonly authorityVersion: typeof SOURCE_ACQUISITION_RUNTIME_AUTHORITY_VERSION;
  readonly packagePath: typeof SOURCE_ACQUISITION_RUNTIME_AUTHORITY_PACKAGE_PATH;
  readonly approval: SourceAcquisitionRuntimeAuthorityApproval;
  readonly visibility: "internal_only";
  readonly configSnapshot: SourceAcquisitionRuntimeAuthorityConfigSnapshot;
  readonly capabilityScope: SourceAcquisitionRuntimeAuthorityCapabilityScope;
  readonly futureGate: "requires_7n3b_concrete_io_gate";
};

declare const sourceAcquisitionRuntimeAuthorityBrand: unique symbol;

export type SourceAcquisitionRuntimeAuthority = Readonly<SourceAcquisitionRuntimeAuthoritySnapshot> & {
  readonly [sourceAcquisitionRuntimeAuthorityBrand]: "source_acquisition_runtime_authority";
};

const runtimeAuthorities = new WeakSet<object>();
const forbiddenPlaceholderValues = new Set(["", "placeholder", "todo", "unknown"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonBlankIdentifier(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 && !forbiddenPlaceholderValues.has(normalized);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}

function approvalIsValid(approval: SourceAcquisitionRuntimeAuthorityApproval): boolean {
  return isRecord(approval)
    && hasExactKeys(approval, [
      "approvedBy",
      "approvedScope",
      "packageCommit",
      "packagePath",
      "status",
    ])
    && approval.status === "approved_7n3a_authority_contract_only"
    && approval.approvedBy === "deputy_review_team"
    && approval.packagePath === SOURCE_ACQUISITION_RUNTIME_AUTHORITY_PACKAGE_PATH
    && approval.packageCommit === "8b4035cc"
    && approval.approvedScope === "authority_boundary_contracts_only";
}

function configSnapshotIsValid(
  snapshot: SourceAcquisitionRuntimeAuthorityConfigSnapshot,
): boolean {
  return isRecord(snapshot)
    && hasExactKeys(snapshot, [
      "budgetSnapshotHash",
      "configSnapshotHash",
      "executionState",
      "freezeLocation",
      "providerAllowlistSnapshotHash",
      "source",
    ])
    && snapshot.source === "v2_task_policy_snapshot"
    && snapshot.freezeLocation === "runtime_owner_contract"
    && isNonBlankIdentifier(snapshot.configSnapshotHash)
    && isNonBlankIdentifier(snapshot.providerAllowlistSnapshotHash)
    && isNonBlankIdentifier(snapshot.budgetSnapshotHash)
    && snapshot.executionState === "not_executable_authority_contract_only";
}

function capabilityScopeIsClosed(
  scope: SourceAcquisitionRuntimeAuthorityCapabilityScope,
): boolean {
  const keys: Array<keyof SourceAcquisitionRuntimeAuthorityCapabilityScope> = [
    "acsPreparedSnapshot",
    "cacheRead",
    "cacheWrite",
    "concreteProviderIo",
    "directUrl",
    "durableStorage",
    "evidenceCorpusPopulation",
    "liveJobs",
    "network",
    "parser",
    "productRuntime",
    "providerSdk",
    "publicExposure",
    "searchFetch",
    "semanticInterpretation",
    "sourceReliability",
    "urlDereference",
  ];

  return isRecord(scope)
    && hasExactKeys(scope, keys)
    && keys.every((key) => scope[key] === false);
}

function snapshotIsValid(snapshot: SourceAcquisitionRuntimeAuthoritySnapshot): boolean {
  return isRecord(snapshot)
    && hasExactKeys(snapshot, [
      "approval",
      "authorityVersion",
      "capabilityScope",
      "configSnapshot",
      "futureGate",
      "kind",
      "packagePath",
      "source",
      "visibility",
    ])
    && snapshot.kind === "source_acquisition_runtime_authority_7n3a"
    && snapshot.source === "v2_7n3a_source_io_authority_boundary_package"
    && snapshot.authorityVersion === SOURCE_ACQUISITION_RUNTIME_AUTHORITY_VERSION
    && snapshot.packagePath === SOURCE_ACQUISITION_RUNTIME_AUTHORITY_PACKAGE_PATH
    && approvalIsValid(snapshot.approval)
    && snapshot.visibility === "internal_only"
    && configSnapshotIsValid(snapshot.configSnapshot)
    && capabilityScopeIsClosed(snapshot.capabilityScope)
    && snapshot.futureGate === "requires_7n3b_concrete_io_gate";
}

export function createSourceAcquisitionRuntimeAuthority(
  snapshot: SourceAcquisitionRuntimeAuthoritySnapshot,
): SourceAcquisitionRuntimeAuthority {
  if (!snapshotIsValid(snapshot)) {
    throw new Error("Invalid V2 source-acquisition runtime authority snapshot.");
  }

  const authority = {
    ...snapshot,
    approval: Object.freeze({ ...snapshot.approval }),
    configSnapshot: Object.freeze({ ...snapshot.configSnapshot }),
    capabilityScope: Object.freeze({ ...snapshot.capabilityScope }),
  };

  Object.freeze(authority);
  runtimeAuthorities.add(authority);
  return authority as SourceAcquisitionRuntimeAuthority;
}

export function isSourceAcquisitionRuntimeAuthority(
  value: unknown,
): value is SourceAcquisitionRuntimeAuthority {
  return isRecord(value)
    && runtimeAuthorities.has(value)
    && snapshotIsValid(value as SourceAcquisitionRuntimeAuthoritySnapshot);
}

export function readSourceAcquisitionRuntimeAuthoritySnapshot(
  authority: SourceAcquisitionRuntimeAuthority,
): SourceAcquisitionRuntimeAuthoritySnapshot {
  if (!isSourceAcquisitionRuntimeAuthority(authority)) {
    throw new Error("Source-acquisition runtime authority was not created by the runtime owner.");
  }

  return {
    kind: authority.kind,
    source: authority.source,
    authorityVersion: authority.authorityVersion,
    packagePath: authority.packagePath,
    approval: { ...authority.approval },
    visibility: authority.visibility,
    configSnapshot: { ...authority.configSnapshot },
    capabilityScope: { ...authority.capabilityScope },
    futureGate: authority.futureGate,
  };
}
