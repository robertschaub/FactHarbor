import { extractNormalizedHostname } from "./domain-utils";

type SourceLabelInput = {
  sourceTitle?: string | null;
  sourceUrl?: string | null;
};

function clean(value?: string | null): string {
  return value?.trim() ?? "";
}

export function resolveEvidenceSourceLabel(
  item: SourceLabelInput,
  matchedSourceTitle?: string | null,
): string {
  const explicitTitle = clean(item.sourceTitle);
  if (explicitTitle) return explicitTitle;

  const canonicalTitle = clean(matchedSourceTitle);
  if (canonicalTitle) return canonicalTitle;

  const sourceUrl = clean(item.sourceUrl);
  if (!sourceUrl) return "Unknown";

  return extractNormalizedHostname(sourceUrl) ?? sourceUrl;
}
