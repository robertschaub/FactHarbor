import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ACTIVE_CLAIM_SELECTION_SESSIONS_STORAGE_KEY,
  buildClaimSelectionInputPreview,
  buildStoredClaimSelectionSessionLabel,
  buildDraftAccessHeaders,
  canUseSessionStorage,
  CLAIM_SELECTION_MODE_STORAGE_KEY,
  clearStoredDraftAccessToken,
  getStoredActiveClaimSelectionSessions,
  getStoredClaimSelectionMode,
  getStoredDraftAccessToken,
  removeStoredActiveClaimSelectionSession,
  setStoredClaimSelectionMode,
  upsertStoredActiveClaimSelectionSession,
  storeDraftAccessToken,
} from "@/lib/claim-selection-client";

describe("claim-selection-client", () => {
  beforeEach(() => {
    const createStorage = () => {
      const data = new Map<string, string>();
      return {
        clear: () => data.clear(),
        getItem: (key: string) => data.get(key) ?? null,
        key: (index: number) => Array.from(data.keys())[index] ?? null,
        removeItem: (key: string) => void data.delete(key),
        setItem: (key: string, value: string) => void data.set(key, value),
        get length() {
          return data.size;
        },
      };
    };

    vi.stubGlobal("window", {
      localStorage: createStorage(),
      sessionStorage: createStorage(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults claim selection mode to interactive", () => {
    expect(getStoredClaimSelectionMode()).toBe("interactive");
  });

  it("persists the selected claim selection mode", () => {
    expect(setStoredClaimSelectionMode("automatic")).toBe(true);
    expect(window.localStorage.getItem(CLAIM_SELECTION_MODE_STORAGE_KEY)).toBe("automatic");
    expect(getStoredClaimSelectionMode()).toBe("automatic");
  });

  it("stores and clears per-draft access tokens", () => {
    expect(storeDraftAccessToken("draft-1", "token-1")).toBe(true);
    expect(getStoredDraftAccessToken("draft-1")).toBe("token-1");

    expect(clearStoredDraftAccessToken("draft-1")).toBe(true);
    expect(getStoredDraftAccessToken("draft-1")).toBeNull();
  });

  it("stores active claim-selection session refs in localStorage", () => {
    expect(upsertStoredActiveClaimSelectionSession({
      draftId: "draft-1",
      createdUtc: "2026-04-23T17:00:00.000Z",
      inputType: "text",
      inputPreview: "Preview 1",
      selectionMode: "automatic",
      lastKnownStatus: "QUEUED",
      lastKnownFinalJobId: null,
      lastKnownUpdatedUtc: null,
      hidden: false,
    })).toBe(true);

    expect(upsertStoredActiveClaimSelectionSession({
      draftId: "draft-2",
      createdUtc: "2026-04-23T18:00:00.000Z",
      inputType: "url",
      inputPreview: "https://example.com/article",
      selectionMode: "automatic",
      lastKnownStatus: "PREPARING",
      lastKnownFinalJobId: null,
      lastKnownUpdatedUtc: null,
      hidden: false,
    })).toBe(true);

    expect(getStoredActiveClaimSelectionSessions()).toEqual([
      expect.objectContaining({ draftId: "draft-2", lastKnownStatus: "PREPARING" }),
      expect.objectContaining({ draftId: "draft-1", lastKnownStatus: "QUEUED" }),
    ]);
    expect(window.localStorage.getItem(ACTIVE_CLAIM_SELECTION_SESSIONS_STORAGE_KEY)).toContain("draft-1");
  });

  it("updates and removes active claim-selection session refs", () => {
    upsertStoredActiveClaimSelectionSession({
      draftId: "draft-1",
      createdUtc: "2026-04-23T17:00:00.000Z",
      inputType: "text",
      inputPreview: "Preview 1",
      selectionMode: "automatic",
      lastKnownStatus: "QUEUED",
      lastKnownFinalJobId: null,
      lastKnownUpdatedUtc: null,
      hidden: false,
    });

    upsertStoredActiveClaimSelectionSession({
      draftId: "draft-1",
      createdUtc: "2026-04-23T17:00:00.000Z",
      inputType: "text",
      inputPreview: "Preview 1 updated",
      selectionMode: "automatic",
      lastKnownStatus: "AWAITING_CLAIM_SELECTION",
      lastKnownFinalJobId: null,
      lastKnownUpdatedUtc: "2026-04-23T17:05:00.000Z",
      hidden: false,
    });

    expect(getStoredActiveClaimSelectionSessions()).toEqual([
      expect.objectContaining({
        draftId: "draft-1",
        inputPreview: "Preview 1 updated",
        lastKnownStatus: "AWAITING_CLAIM_SELECTION",
      }),
    ]);

    expect(removeStoredActiveClaimSelectionSession("draft-1")).toBe(true);
    expect(getStoredActiveClaimSelectionSessions()).toEqual([]);
    expect(window.localStorage.getItem(ACTIVE_CLAIM_SELECTION_SESSIONS_STORAGE_KEY)).toBeNull();
  });

  it("builds bounded input previews for stored sessions", () => {
    expect(buildClaimSelectionInputPreview("  https://example.com/article  ", "url")).toBe("https://example.com/article");
    expect(buildClaimSelectionInputPreview("Line one\nline two", "text")).toBe("Line one line two");
    expect(buildClaimSelectionInputPreview("x".repeat(200), "text").length).toBeLessThanOrEqual(140);
    expect(buildStoredClaimSelectionSessionLabel("url")).toBe("URL session");
    expect(buildStoredClaimSelectionSessionLabel("text")).toBe("Text session");
  });

  it("prefers admin headers over draft token headers", () => {
    storeDraftAccessToken("draft-1", "token-1");

    expect(buildDraftAccessHeaders("draft-1", null)).toEqual({
      "x-draft-token": "token-1",
    });

    expect(buildDraftAccessHeaders("draft-1", "admin-key")).toEqual({
      "x-admin-key": "admin-key",
    });
  });

  it("fails closed when browser storage throws", () => {
    const throwingStorage = {
      clear: () => {
        throw new Error("blocked");
      },
      getItem: () => {
        throw new Error("blocked");
      },
      key: () => null,
      removeItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      get length() {
        return 0;
      },
    };

    vi.stubGlobal("window", {
      localStorage: throwingStorage,
      sessionStorage: throwingStorage,
    });

    expect(getStoredClaimSelectionMode()).toBe("interactive");
    expect(setStoredClaimSelectionMode("automatic")).toBe(false);
    expect(canUseSessionStorage()).toBe(false);
    expect(storeDraftAccessToken("draft-1", "token-1")).toBe(false);
    expect(getStoredDraftAccessToken("draft-1")).toBeNull();
    expect(clearStoredDraftAccessToken("draft-1")).toBe(false);
    expect(upsertStoredActiveClaimSelectionSession({
      draftId: "draft-1",
      createdUtc: "2026-04-23T17:00:00.000Z",
      inputType: "text",
      inputPreview: "Preview 1",
      selectionMode: "automatic",
      lastKnownStatus: "QUEUED",
      lastKnownFinalJobId: null,
      lastKnownUpdatedUtc: null,
      hidden: false,
    })).toBe(false);
    expect(getStoredActiveClaimSelectionSessions()).toEqual([]);
    expect(removeStoredActiveClaimSelectionSession("draft-1")).toBe(true);
    expect(buildDraftAccessHeaders("draft-1", null)).toEqual({});
  });
});
