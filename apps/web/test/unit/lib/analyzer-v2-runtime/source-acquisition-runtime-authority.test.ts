import { describe, expect, it } from "vitest";
import {
  createSourceAcquisitionRuntimeAuthority,
  isSourceAcquisitionRuntimeAuthority,
  readSourceAcquisitionRuntimeAuthoritySnapshot,
  SOURCE_ACQUISITION_RUNTIME_AUTHORITY_PACKAGE_PATH,
  SOURCE_ACQUISITION_RUNTIME_AUTHORITY_VERSION,
  type SourceAcquisitionRuntimeAuthoritySnapshot,
} from "@/lib/analyzer-v2-runtime/source-acquisition-runtime-authority";
import { SOURCE_ACQUISITION_CONTROLLED_HARNESS_AUTHORITY } from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/execution-contract";

function baseSnapshot(
  overrides: Partial<SourceAcquisitionRuntimeAuthoritySnapshot> = {},
): SourceAcquisitionRuntimeAuthoritySnapshot {
  return {
    kind: "source_acquisition_runtime_authority_7n3a",
    source: "v2_7n3a_source_io_authority_boundary_package",
    authorityVersion: SOURCE_ACQUISITION_RUNTIME_AUTHORITY_VERSION,
    packagePath: SOURCE_ACQUISITION_RUNTIME_AUTHORITY_PACKAGE_PATH,
    approval: {
      status: "approved_7n3a_authority_contract_only",
      approvedBy: "deputy_review_team",
      packagePath: SOURCE_ACQUISITION_RUNTIME_AUTHORITY_PACKAGE_PATH,
      packageCommit: "8b4035cc",
      approvedScope: "authority_boundary_contracts_only",
    },
    visibility: "internal_only",
    configSnapshot: {
      source: "v2_task_policy_snapshot",
      freezeLocation: "runtime_owner_contract",
      configSnapshotHash: "source-config-snapshot-hash-7n3a",
      providerAllowlistSnapshotHash: "source-provider-allowlist-hash-7n3a",
      budgetSnapshotHash: "source-budget-snapshot-hash-7n3a",
      executionState: "not_executable_authority_contract_only",
    },
    capabilityScope: {
      concreteProviderIo: false,
      providerSdk: false,
      searchFetch: false,
      network: false,
      parser: false,
      urlDereference: false,
      cacheRead: false,
      cacheWrite: false,
      durableStorage: false,
      sourceReliability: false,
      productRuntime: false,
      publicExposure: false,
      liveJobs: false,
      acsPreparedSnapshot: false,
      directUrl: false,
      evidenceCorpusPopulation: false,
      semanticInterpretation: false,
    },
    futureGate: "requires_7n3b_concrete_io_gate",
    ...overrides,
  };
}

describe("Analyzer V2 source-acquisition runtime authority", () => {
  it("creates a frozen runtime-owned capability for 7N-3A authority contracts only", () => {
    const authority = createSourceAcquisitionRuntimeAuthority(baseSnapshot());

    expect(isSourceAcquisitionRuntimeAuthority(authority)).toBe(true);
    expect(Object.isFrozen(authority)).toBe(true);
    expect(Object.isFrozen(authority.approval)).toBe(true);
    expect(Object.isFrozen(authority.configSnapshot)).toBe(true);
    expect(Object.isFrozen(authority.capabilityScope)).toBe(true);
    expect(readSourceAcquisitionRuntimeAuthoritySnapshot(authority)).toMatchObject({
      kind: "source_acquisition_runtime_authority_7n3a",
      visibility: "internal_only",
      capabilityScope: {
        concreteProviderIo: false,
        searchFetch: false,
        cacheRead: false,
        cacheWrite: false,
        sourceReliability: false,
        productRuntime: false,
        publicExposure: false,
        liveJobs: false,
      },
      futureGate: "requires_7n3b_concrete_io_gate",
    });
  });

  it("rejects copied plain objects and JSON round-trips even when their fields match", () => {
    const authority = createSourceAcquisitionRuntimeAuthority(baseSnapshot());
    const plainCopy = { ...readSourceAcquisitionRuntimeAuthoritySnapshot(authority) };
    const roundTrip = JSON.parse(JSON.stringify(authority));

    expect(isSourceAcquisitionRuntimeAuthority(plainCopy)).toBe(false);
    expect(isSourceAcquisitionRuntimeAuthority(roundTrip)).toBe(false);
    expect(() =>
      readSourceAcquisitionRuntimeAuthoritySnapshot(plainCopy as typeof authority)
    ).toThrow("runtime authority was not created by the runtime owner");
  });

  it("does not treat the 7N-2 controlled harness marker as runtime source-IO authority", () => {
    expect(isSourceAcquisitionRuntimeAuthority(SOURCE_ACQUISITION_CONTROLLED_HARNESS_AUTHORITY)).toBe(false);
  });

  it("fails closed for stale approval, placeholder hashes, public exposure, cache, or concrete IO", () => {
    const cases: SourceAcquisitionRuntimeAuthoritySnapshot[] = [
      baseSnapshot({
        approval: {
          ...baseSnapshot().approval,
          packageCommit: "stale" as unknown as SourceAcquisitionRuntimeAuthoritySnapshot["approval"]["packageCommit"],
        },
      }),
      baseSnapshot({
        configSnapshot: {
          ...baseSnapshot().configSnapshot,
          configSnapshotHash: "placeholder",
        },
      }),
      baseSnapshot({
        capabilityScope: {
          ...baseSnapshot().capabilityScope,
          concreteProviderIo: true as unknown as false,
        },
      }),
      baseSnapshot({
        capabilityScope: {
          ...baseSnapshot().capabilityScope,
          cacheWrite: true as unknown as false,
        },
      }),
      baseSnapshot({
        capabilityScope: {
          ...baseSnapshot().capabilityScope,
          publicExposure: true as unknown as false,
        },
      }),
    ];

    for (const snapshot of cases) {
      expect(() => createSourceAcquisitionRuntimeAuthority(snapshot)).toThrow(
        "Invalid V2 source-acquisition runtime authority snapshot.",
      );
    }
  });

  it("rejects extra fields that would make the capability a loose marker", () => {
    const snapshot = {
      ...baseSnapshot(),
      authorityToken: "not allowed",
    } as unknown as SourceAcquisitionRuntimeAuthoritySnapshot;

    expect(() => createSourceAcquisitionRuntimeAuthority(snapshot)).toThrow(
      "Invalid V2 source-acquisition runtime authority snapshot.",
    );
  });
});
