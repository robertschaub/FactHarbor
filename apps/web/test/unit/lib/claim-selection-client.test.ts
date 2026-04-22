import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildDraftAccessHeaders,
  canUseSessionStorage,
  CLAIM_SELECTION_MODE_STORAGE_KEY,
  clearStoredDraftAccessToken,
  getStoredClaimSelectionMode,
  getStoredDraftAccessToken,
  setStoredClaimSelectionMode,
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
    expect(buildDraftAccessHeaders("draft-1", null)).toEqual({});
  });
});
