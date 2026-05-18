import { createHash } from "node:crypto";

export const SOURCE_CANDIDATE_PREVIEW_PAGE_KEY_MAX_BYTES = 256;

export type SourceCandidatePreviewTextFieldName =
  | "titlePreviewText"
  | "excerptPreviewText"
  | "descriptionPreviewText";

export type SourceCandidatePreviewFieldState =
  | "accepted_bounded"
  | "missing"
  | "rejected_structural"
  | "truncated_bounded"
  | "not_materialized_by_policy";

export type SourceCandidateLocatorMaterialization =
  | {
      readonly status: "accepted_bounded";
      readonly pageKeyHash: string;
    }
  | {
      readonly status: "missing" | "rejected_structural";
      readonly pageKeyHash: null;
    };

export type SourceCandidatePreviewTextMaterialization = {
  readonly state: SourceCandidatePreviewFieldState;
  readonly value: string | null;
  readonly hash: string | null;
  readonly byteLength: number;
  readonly charLength: number;
  readonly truncated: boolean;
  readonly markupStripped: boolean;
};

const PLACEHOLDER_VALUES = new Set(["placeholder", "todo", "unknown", "null", "undefined"]);
const SECRET_OR_LOCATOR_FRAGMENTS = [
  "://",
  "/",
  "\\",
  "?",
  "#",
  "..",
  "@",
  "api_key",
  "apikey",
  "secret",
  "token",
  "password",
  "credential",
  "bearer",
  "sk_",
];
const PREVIEW_FORBIDDEN_FRAGMENTS = [
  "://",
  "www.",
  "@",
  "api_key",
  "apikey",
  "secret",
  "token",
  "password",
  "credential",
  "bearer",
  "sk_",
];

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function utf8ByteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function hasControlCharacter(value: string): boolean {
  return /[\u0000-\u001f\u007f]/.test(value);
}

function containsForbiddenLocatorFragment(value: string): boolean {
  const lower = value.toLowerCase();
  return SECRET_OR_LOCATOR_FRAGMENTS.some((fragment) => lower.includes(fragment));
}

function containsForbiddenPreviewFragment(value: string): boolean {
  const lower = value.toLowerCase();
  return PREVIEW_FORBIDDEN_FRAGMENTS.some((fragment) => lower.includes(fragment));
}

function stripMarkup(value: string): { readonly value: string; readonly markupStripped: boolean } {
  const stripped = value.replace(/<[^>]*>/g, "");
  return {
    value: stripped,
    markupStripped: stripped !== value,
  };
}

function removeControlCharacters(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ");
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncateByCharAndByte(
  value: string,
  maxChars: number,
  maxBytes: number,
): { readonly value: string; readonly truncated: boolean } {
  let result = "";
  let truncated = false;
  let charCount = 0;
  for (const character of value) {
    const nextCharCount = charCount + 1;
    const next = result + character;
    if (nextCharCount > maxChars || utf8ByteLength(next) > maxBytes) {
      truncated = true;
      break;
    }
    result = next;
    charCount = nextCharCount;
  }
  return {
    value: result,
    truncated: truncated || result.length !== value.length,
  };
}

export function materializeSourceCandidatePageKey(value: unknown): SourceCandidateLocatorMaterialization {
  if (typeof value !== "string") {
    return { status: "missing", pageKeyHash: null };
  }

  if (
    value.length === 0
    || value.trim() !== value
    || utf8ByteLength(value) > SOURCE_CANDIDATE_PREVIEW_PAGE_KEY_MAX_BYTES
    || hasControlCharacter(value)
    || PLACEHOLDER_VALUES.has(value.toLowerCase())
    || containsForbiddenLocatorFragment(value)
  ) {
    return { status: "rejected_structural", pageKeyHash: null };
  }

  return {
    status: "accepted_bounded",
    pageKeyHash: sha256Text(value),
  };
}

export function materializeSourceCandidatePageId(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }
  const normalized = String(value);
  if (
    normalized.length === 0
    || normalized.trim() !== normalized
    || utf8ByteLength(normalized) > 64
    || hasControlCharacter(normalized)
    || containsForbiddenLocatorFragment(normalized)
  ) {
    return null;
  }
  return sha256Text(normalized);
}

export function materializeSourceCandidatePreviewText(
  value: unknown,
  bounds: {
    readonly maxChars: number;
    readonly maxBytes: number;
  },
): SourceCandidatePreviewTextMaterialization {
  if (typeof value !== "string") {
    return {
      state: "missing",
      value: null,
      hash: null,
      byteLength: 0,
      charLength: 0,
      truncated: false,
      markupStripped: false,
    };
  }

  const stripped = stripMarkup(value);
  const normalized = collapseWhitespace(removeControlCharacters(stripped.value));
  if (normalized.length === 0 || containsForbiddenPreviewFragment(normalized)) {
    return {
      state: "rejected_structural",
      value: null,
      hash: null,
      byteLength: 0,
      charLength: 0,
      truncated: false,
      markupStripped: stripped.markupStripped,
    };
  }

  const bounded = truncateByCharAndByte(normalized, bounds.maxChars, bounds.maxBytes);
  if (bounded.value.length === 0 || containsForbiddenPreviewFragment(bounded.value)) {
    return {
      state: "rejected_structural",
      value: null,
      hash: null,
      byteLength: 0,
      charLength: 0,
      truncated: bounded.truncated,
      markupStripped: stripped.markupStripped,
    };
  }

  return {
    state: bounded.truncated ? "truncated_bounded" : "accepted_bounded",
    value: bounded.value,
    hash: sha256Text(bounded.value),
    byteLength: utf8ByteLength(bounded.value),
    charLength: Array.from(bounded.value).length,
    truncated: bounded.truncated,
    markupStripped: stripped.markupStripped,
  };
}
