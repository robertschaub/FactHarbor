import { describe, expect, it } from "vitest";

import {
  getResumeTarget,
  getSessionStatusLabel,
  getSessionSummary,
} from "@/app/analyze/ActiveClaimSelectionSessions";
import type { StoredClaimSelectionSessionRef } from "@/lib/claim-selection-client";

function buildRef(overrides: Partial<StoredClaimSelectionSessionRef> = {}): StoredClaimSelectionSessionRef {
  return {
    draftId: "draft-1",
    inputType: "url",
    inputPreview: "URL session",
    selectionMode: "interactive",
    createdUtc: "2026-04-23T18:01:29.000Z",
    lastKnownStatus: "PREPARING",
    lastKnownFinalJobId: null,
    lastKnownUpdatedUtc: "2026-04-23T18:01:29.000Z",
    hidden: false,
    ...overrides,
  };
}

describe("ActiveClaimSelectionSessions helpers", () => {
  it("keeps the report link available when draft access is gone but the final job id is known", () => {
    const item = {
      ref: buildRef({
        lastKnownStatus: "COMPLETED",
        lastKnownFinalJobId: "job-1",
      }),
      draft: null,
      error: null,
      accessUnavailable: true,
    };

    expect(getResumeTarget(item)).toEqual({
      destination: "/jobs/job-1",
      linkLabel: "Open report",
    });
    expect(getSessionStatusLabel(item)).toBe("REPORT PROCESSING");
    expect(getSessionSummary(item)).toBe("Preparation has completed and the report job is processing.");
  });

  it("labels claim-selection-ready sessions without exposing the raw internal status", () => {
    const item = {
      ref: buildRef({ lastKnownStatus: "AWAITING_CLAIM_SELECTION" }),
      draft: null,
      error: null,
      accessUnavailable: false,
    };

    expect(getSessionStatusLabel(item)).toBe("READY");
  });

  it("does not expose a resume link when draft access is gone and no final job exists", () => {
    const item = {
      ref: buildRef(),
      draft: null,
      error: null,
      accessUnavailable: true,
    };

    expect(getResumeTarget(item)).toBeNull();
    expect(getSessionSummary(item)).toBe("Session access is no longer available in this browser profile.");
  });
});
