import type { ClaimAssessmentBoundary } from "@/lib/analyzer/types";

type BoundaryLike = Pick<ClaimAssessmentBoundary, "id" | "name" | "shortName" | "description">;

const MERGED_PREFIX_PATTERN = /^(?:Merged:\s*)+/i;

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function cleanSegment(text: string): string {
  return normalizeWhitespace(text).replace(MERGED_PREFIX_PATTERN, "").trim();
}

function labelsEqual(left: string, right: string): boolean {
  return cleanSegment(left).toLocaleLowerCase() === cleanSegment(right).toLocaleLowerCase();
}

function dedupeSegments(segments: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const segment of segments) {
    const key = cleanSegment(segment).toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(segment);
  }

  return result;
}

function splitSegments(text: string | null | undefined, separator: string): string[] {
  if (!text) return [];
  return dedupeSegments(
    text
      .split(separator)
      .map(cleanSegment)
      .filter(Boolean),
  );
}

export function getBoundaryNameSegments(name: string | null | undefined): string[] {
  return splitSegments(name, " + ");
}

export function getBoundaryDescriptionSegments(description: string | null | undefined): string[] {
  return splitSegments(description, ";");
}

export function mergeBoundaryNames(
  ...names: Array<string | null | undefined>
): string {
  return dedupeSegments(names.flatMap(getBoundaryNameSegments)).join(" + ");
}

export function mergeBoundaryDescriptions(
  ...descriptions: Array<string | null | undefined>
): string {
  return dedupeSegments(descriptions.flatMap(getBoundaryDescriptionSegments)).join("; ");
}

export function getBoundaryDisplayHeadline(boundary: BoundaryLike): string {
  const shortName = normalizeWhitespace(boundary.shortName || "");
  if (shortName) return shortName;

  const nameSegments = getBoundaryNameSegments(boundary.name);
  if (nameSegments.length > 0) return nameSegments[0];

  return normalizeWhitespace(boundary.name || boundary.id || "Boundary");
}

export function getBoundaryDisplaySubtitle(boundary: BoundaryLike): string {
  const shortName = normalizeWhitespace(boundary.shortName || "");
  const nameSegments = getBoundaryNameSegments(boundary.name);
  const cleanedName = normalizeWhitespace(boundary.name || "");

  if (nameSegments.length > 1) {
    const primary = nameSegments[0];
    const additionalCount = nameSegments.length - 1;
    if (
      shortName &&
      primary &&
      !labelsEqual(shortName, primary)
    ) {
      return `${primary} + ${additionalCount} related scope ${additionalCount === 1 ? "family" : "families"}`;
    }

    return `${additionalCount} related scope ${additionalCount === 1 ? "family" : "families"}`;
  }

  if (
    shortName &&
    cleanedName &&
    !labelsEqual(shortName, cleanedName)
  ) {
    return cleanedName;
  }

  return "";
}
