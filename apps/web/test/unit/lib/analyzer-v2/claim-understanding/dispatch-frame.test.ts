import { describe, expect, it } from "vitest";
import {
  buildClaimUnderstandingDispatchFrame,
  type ClaimUnderstandingDispatchFrameSideEffects,
} from "@/lib/analyzer-v2/claim-understanding/dispatch-frame";
import type { ClaimBoundaryV2Ingress } from "@/lib/analyzer-v2/pipeline-input";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";

const noFrameSideEffects = {
  promptLoaded: false,
  promptRendered: false,
  adapterImported: false,
  adapterCalled: false,
  modelCalled: false,
  inputIdentityHashConstructed: false,
  cacheDecisionConstructed: false,
  cacheRead: false,
  cacheWrite: false,
  providerCallbackCreated: false,
  providerSdkLoaded: false,
} satisfies ClaimUnderstandingDispatchFrameSideEffects;

function buildContext(input: ClaimBoundaryV2Ingress) {
  return buildClaimBoundaryV2RunContext(input, {
    now: () => new Date("2026-05-14T12:34:56.000Z"),
  });
}

describe("analyzer-v2 Claim Understanding dispatch frame", () => {
  it("preserves direct non-English text exactly without prompt/cache/provider/adapter work", () => {
    const submittedText = "Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben";
    const input: ClaimBoundaryV2Ingress = {
      runIdHint: "job-frame-direct-text",
      submitted: {
        kind: "text",
        value: submittedText,
      },
      preparedSeed: null,
      selectedAtomicClaimIds: [],
    };

    const result = buildClaimUnderstandingDispatchFrame(input, buildContext(input));

    expect(result).toEqual({
      status: "ready",
      frame: {
        analysisInput: submittedText,
        resolvedInputText: submittedText,
        detectedLanguage: "und",
        selectedAtomicClaimIds: [],
        currentDate: "2026-05-14",
        inputSource: "direct_input",
      },
      blockedReason: null,
      sideEffects: noFrameSideEffects,
    });
  });

  it("blocks direct URL input before treating the URL as body text or cache identity", () => {
    const input: ClaimBoundaryV2Ingress = {
      runIdHint: "job-frame-direct-url",
      submitted: {
        kind: "url",
        value: "https://example.test/article",
      },
      preparedSeed: null,
      selectedAtomicClaimIds: [],
    };

    const result = buildClaimUnderstandingDispatchFrame(input, buildContext(input));

    expect(result).toEqual({
      status: "blocked",
      frame: null,
      blockedReason: "direct_url_requires_resolved_body",
      sideEffects: noFrameSideEffects,
    });
  });

  it("builds an ACS-backed URL frame only from resolved body text and canonical hashes", () => {
    const input: ClaimBoundaryV2Ingress = {
      runIdHint: "job-frame-acs-url",
      submitted: {
        kind: "url",
        value: "https://example.test/source",
      },
      preparedSeed: {
        acsSnapshot: {
          resolvedInputText: "Resolved article body text from the prepared snapshot.",
          preparedUnderstanding: {
            detectedInputType: "url",
            detectedLanguage: "en",
          },
        },
        acsSnapshotHash: "v2-acs-hash",
        inputGroundingSeedHash: "v2-input-grounding-hash",
      },
      selectedAtomicClaimIds: ["AC_01"],
    };

    const result = buildClaimUnderstandingDispatchFrame(input, buildContext(input));

    expect(result).toEqual({
      status: "ready",
      frame: {
        analysisInput: "https://example.test/source",
        resolvedInputText: "Resolved article body text from the prepared snapshot.",
        detectedLanguage: "en",
        selectedAtomicClaimIds: ["AC_01"],
        currentDate: "2026-05-14",
        inputSource: "acs_prepared_snapshot",
      },
      blockedReason: null,
      sideEffects: noFrameSideEffects,
    });
  });

  it("fails ACS frame construction closed when the ACS snapshot hash is missing", () => {
    const input: ClaimBoundaryV2Ingress = {
      runIdHint: "job-frame-acs-no-acs-hash",
      submitted: {
        kind: "text",
        value: "Submitted text",
      },
      preparedSeed: {
        acsSnapshot: {
          resolvedInputText: "Resolved text",
          preparedUnderstanding: {
            detectedLanguage: "en",
          },
        },
        inputGroundingSeedHash: "v2-input-grounding-hash",
      },
      selectedAtomicClaimIds: ["AC_01"],
    };

    expect(buildClaimUnderstandingDispatchFrame(input, buildContext(input))).toEqual({
      status: "blocked",
      frame: null,
      blockedReason: "acs_snapshot_hash_missing",
      sideEffects: noFrameSideEffects,
    });
  });

  it("fails ACS frame construction closed when the input-grounding seed hash is missing", () => {
    const input: ClaimBoundaryV2Ingress = {
      runIdHint: "job-frame-acs-no-grounding-hash",
      submitted: {
        kind: "text",
        value: "Submitted text",
      },
      preparedSeed: {
        acsSnapshot: {
          resolvedInputText: "Resolved text",
          preparedUnderstanding: {
            detectedLanguage: "en",
          },
        },
        acsSnapshotHash: "v2-acs-hash",
      },
      selectedAtomicClaimIds: ["AC_01"],
    };

    expect(buildClaimUnderstandingDispatchFrame(input, buildContext(input))).toEqual({
      status: "blocked",
      frame: null,
      blockedReason: "input_grounding_seed_hash_missing",
      sideEffects: noFrameSideEffects,
    });
  });

  it("fails ACS frame construction closed when selected claim IDs are not available", () => {
    const input: ClaimBoundaryV2Ingress = {
      runIdHint: "job-frame-acs-no-selected-ids",
      submitted: {
        kind: "text",
        value: "Submitted text",
      },
      preparedSeed: {
        acsSnapshot: {
          resolvedInputText: "Resolved text",
          preparedUnderstanding: {
            detectedLanguage: "en",
          },
        },
        acsSnapshotHash: "v2-acs-hash",
        inputGroundingSeedHash: "v2-input-grounding-hash",
      },
      selectedAtomicClaimIds: [],
    };

    expect(buildClaimUnderstandingDispatchFrame(input, buildContext(input))).toEqual({
      status: "blocked",
      frame: null,
      blockedReason: "selected_atomic_claim_ids_invalid",
      sideEffects: noFrameSideEffects,
    });
  });
});
