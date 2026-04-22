export type ClaimSelectionMode = "interactive" | "automatic";

export const CLAIM_SELECTION_MODE_STORAGE_KEY = "fh_claim_selection_mode";
const DRAFT_ACCESS_TOKEN_PREFIX = "fh_claim_selection_draft_token:";
const SESSION_STORAGE_PROBE_KEY = "__fh_claim_selection_probe__";

function getLocalStorageSafe(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getSessionStorageSafe(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function getLocalStorageItemSafely(key: string): string | null {
  const storage = getLocalStorageSafe();
  if (!storage) return null;

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function setLocalStorageItemSafely(key: string, value: string): boolean {
  const storage = getLocalStorageSafe();
  if (!storage) return false;

  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function getSessionStorageItemSafely(key: string): string | null {
  const storage = getSessionStorageSafe();
  if (!storage) return null;

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function setSessionStorageItemSafely(key: string, value: string): boolean {
  const storage = getSessionStorageSafe();
  if (!storage) return false;

  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeSessionStorageItemSafely(key: string): boolean {
  const storage = getSessionStorageSafe();
  if (!storage) return false;

  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function canUseSessionStorage(): boolean {
  const storage = getSessionStorageSafe();
  if (!storage) return false;

  try {
    storage.setItem(SESSION_STORAGE_PROBE_KEY, "1");
    storage.removeItem(SESSION_STORAGE_PROBE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function getStoredClaimSelectionMode(): ClaimSelectionMode {
  const stored = getLocalStorageItemSafely(CLAIM_SELECTION_MODE_STORAGE_KEY);
  return stored === "automatic" ? "automatic" : "interactive";
}

export function setStoredClaimSelectionMode(mode: ClaimSelectionMode): boolean {
  return setLocalStorageItemSafely(CLAIM_SELECTION_MODE_STORAGE_KEY, mode);
}

export function getDraftAccessTokenStorageKey(draftId: string): string {
  return `${DRAFT_ACCESS_TOKEN_PREFIX}${draftId}`;
}

export function storeDraftAccessToken(draftId: string, token: string): boolean {
  return setSessionStorageItemSafely(getDraftAccessTokenStorageKey(draftId), token);
}

export function getStoredDraftAccessToken(draftId: string): string | null {
  return getSessionStorageItemSafely(getDraftAccessTokenStorageKey(draftId));
}

export function clearStoredDraftAccessToken(draftId: string): boolean {
  return removeSessionStorageItemSafely(getDraftAccessTokenStorageKey(draftId));
}

export function buildDraftAccessHeaders(
  draftId: string,
  adminKey?: string | null,
): Record<string, string> {
  if (adminKey) {
    return { "x-admin-key": adminKey };
  }

  const token = getStoredDraftAccessToken(draftId);
  return token ? { "x-draft-token": token } : {};
}
