export type ClaimSelectionMode = "interactive" | "automatic";
export type StoredClaimSelectionSessionStatus =
  | "QUEUED"
  | "PREPARING"
  | "AWAITING_CLAIM_SELECTION"
  | "FAILED"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

export type StoredClaimSelectionSessionRef = {
  draftId: string;
  createdUtc: string;
  inputType: string;
  inputPreview: string;
  selectionMode: ClaimSelectionMode;
  lastKnownStatus: StoredClaimSelectionSessionStatus | string;
  lastKnownFinalJobId?: string | null;
  lastKnownUpdatedUtc?: string | null;
  hidden?: boolean;
};

export const CLAIM_SELECTION_MODE_STORAGE_KEY = "fh_claim_selection_mode";
export const ACTIVE_CLAIM_SELECTION_SESSIONS_STORAGE_KEY = "fh_active_claim_selection_sessions";
const DRAFT_ACCESS_TOKEN_PREFIX = "fh_claim_selection_draft_token:";
const SESSION_STORAGE_PROBE_KEY = "__fh_claim_selection_probe__";
const MAX_STORED_ACTIVE_SESSIONS = 20;

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

export function removeLocalStorageItemSafely(key: string): boolean {
  const storage = getLocalStorageSafe();
  if (!storage) return false;

  try {
    storage.removeItem(key);
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

function isStoredClaimSelectionSessionRef(value: unknown): value is StoredClaimSelectionSessionRef {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.draftId === "string" &&
    typeof candidate.createdUtc === "string" &&
    typeof candidate.inputType === "string" &&
    typeof candidate.inputPreview === "string" &&
    (candidate.selectionMode === "interactive" || candidate.selectionMode === "automatic") &&
    typeof candidate.lastKnownStatus === "string"
  );
}

function normalizeStoredClaimSelectionSessions(
  refs: StoredClaimSelectionSessionRef[],
): StoredClaimSelectionSessionRef[] {
  const deduped = new Map<string, StoredClaimSelectionSessionRef>();

  for (const ref of refs) {
    if (!isStoredClaimSelectionSessionRef(ref)) continue;
    deduped.set(ref.draftId, {
      ...ref,
      lastKnownFinalJobId: ref.lastKnownFinalJobId ?? null,
      lastKnownUpdatedUtc: ref.lastKnownUpdatedUtc ?? null,
      hidden: Boolean(ref.hidden),
    });
  }

  return Array.from(deduped.values())
    .sort((left, right) => right.createdUtc.localeCompare(left.createdUtc))
    .slice(0, MAX_STORED_ACTIVE_SESSIONS);
}

export function getStoredActiveClaimSelectionSessions(): StoredClaimSelectionSessionRef[] {
  const raw = getLocalStorageItemSafely(ACTIVE_CLAIM_SELECTION_SESSIONS_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return normalizeStoredClaimSelectionSessions(parsed.filter(isStoredClaimSelectionSessionRef));
  } catch {
    return [];
  }
}

export function setStoredActiveClaimSelectionSessions(
  refs: StoredClaimSelectionSessionRef[],
): boolean {
  const normalized = normalizeStoredClaimSelectionSessions(refs);

  if (normalized.length === 0) {
    return removeLocalStorageItemSafely(ACTIVE_CLAIM_SELECTION_SESSIONS_STORAGE_KEY);
  }

  return setLocalStorageItemSafely(
    ACTIVE_CLAIM_SELECTION_SESSIONS_STORAGE_KEY,
    JSON.stringify(normalized),
  );
}

export function upsertStoredActiveClaimSelectionSession(
  ref: StoredClaimSelectionSessionRef,
): boolean {
  const current = getStoredActiveClaimSelectionSessions();
  const next = current.filter((entry) => entry.draftId !== ref.draftId);
  next.unshift(ref);
  return setStoredActiveClaimSelectionSessions(next);
}

export function removeStoredActiveClaimSelectionSession(draftId: string): boolean {
  const current = getStoredActiveClaimSelectionSessions();
  const next = current.filter((entry) => entry.draftId !== draftId);
  if (next.length === current.length) {
    return true;
  }
  return setStoredActiveClaimSelectionSessions(next);
}

export function buildClaimSelectionInputPreview(inputValue: string, inputType: string): string {
  const normalized = inputValue.replace(/\s+/g, " ").trim();
  if (!normalized) return inputType === "url" ? "Untitled URL session" : "Untitled session";

  const maxLength = inputType === "url" ? 180 : 140;
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildStoredClaimSelectionSessionLabel(inputType: string): string {
  return inputType === "url" ? "URL session" : "Text session";
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
