import { describe, expect, it } from "vitest";

import {
  getResumeTarget,
  getSessionStatusLabel,
  getSessionSummary,
  shouldDropSessionFromRegistry,
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
  it("drops sessions from the resume registry once the final job id is known", () => {
    const item = {
      ref: buildRef({
        lastKnownStatus: "COMPLETED",
        lastKnownFinalJobId: "job-1",
      }),
      draft: null,
      error: null,
      accessUnavailable: true,
    };

    expect(shouldDropSessionFromRegistry(null, item.ref)).toBe(true);
    expect(getResumeTarget(item)).toBeNull();
  });

  it("drops refreshed drafts when the server reports a final job id", () => {
    expect(
      shouldDropSessionFromRegistry({
        draftId: "draft-1",
        status: "COMPLETED",
        progress: 100,
        isHidden: false,
        lastEventMessage: null,
        selectionMode: "interactive",
        originalInputType: "url",
        originalInputValue: "https://example.com/article",
        activeInputType: "url",
        activeInputValue: "https://example.com/article",
        finalJobId: "job-1",
        createdUtc: "2026-04-23T18:01:29.000Z",
        updatedUtc: "2026-04-23T18:02:29.000Z",
        expiresUtc: "2026-04-24T18:01:29.000Z",
      }),
    ).toBe(true);
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
