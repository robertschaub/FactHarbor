import type { ClaimBoundaryV2Ingress } from "@/lib/analyzer-v2/pipeline-input";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function readOptionalString(value: unknown): string | null {
  return isNonBlankString(value) ? value : null;
}

export function readAcsResolvedInputText(input: ClaimBoundaryV2Ingress): string | null {
  const snapshot = input.preparedSeed?.acsSnapshot;
  if (!isRecord(snapshot)) {
    return null;
  }

  return isNonBlankString(snapshot.resolvedInputText) ? snapshot.resolvedInputText : null;
}
