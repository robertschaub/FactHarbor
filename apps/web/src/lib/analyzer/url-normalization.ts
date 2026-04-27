/**
 * Shared structural URL normalization for evidence/source diagnostics.
 *
 * This intentionally does not infer source meaning. It only canonicalizes URL
 * structure so deduplication and overlap metrics use the same key.
 */

const TRACKING_PARAM_NAMES = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "ref",
  "source",
]);

export type StructuralSourceFamily = "document" | "data" | "html" | "unknown";

const DOCUMENT_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
]);

const DATA_EXTENSIONS = new Set([
  ".csv",
  ".json",
  ".jsonl",
  ".xml",
  ".xls",
  ".xlsx",
]);

const HTML_EXTENSIONS = new Set([
  ".htm",
  ".html",
]);

const DOCUMENT_MIME_MARKERS = [
  "application/pdf",
  "msword",
  "wordprocessingml",
  "presentation",
  "powerpoint",
];

const DATA_MIME_MARKERS = [
  "text/csv",
  "application/csv",
  "application/json",
  "application/ld+json",
  "application/xml",
  "text/xml",
  "spreadsheet",
  "excel",
];

const HTML_MIME_MARKERS = [
  "text/html",
  "application/xhtml+xml",
];

export function normalizeUrlForEvidence(url: string): string {
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    for (const key of Array.from(parsed.searchParams.keys())) {
      const normalizedKey = key.toLowerCase();
      if (TRACKING_PARAM_NAMES.has(normalizedKey) || normalizedKey.startsWith("utm_")) {
        parsed.searchParams.delete(key);
      }
    }
    parsed.hash = "";
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (parsed.pathname.length > 1) {
      parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    }
    return parsed.toString().toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
}

export function classifyStructuralSourceFamily(params: {
  url?: string | null;
  contentType?: string | null;
  category?: string | null;
}): StructuralSourceFamily {
  const contentType = (params.contentType ?? params.category ?? "").toLowerCase();
  if (DOCUMENT_MIME_MARKERS.some((marker) => contentType.includes(marker))) {
    return "document";
  }
  if (DATA_MIME_MARKERS.some((marker) => contentType.includes(marker))) {
    return "data";
  }
  if (HTML_MIME_MARKERS.some((marker) => contentType.includes(marker))) {
    return "html";
  }

  const extension = extractPathExtension(params.url);
  if (DOCUMENT_EXTENSIONS.has(extension)) return "document";
  if (DATA_EXTENSIONS.has(extension)) return "data";
  if (HTML_EXTENSIONS.has(extension)) return "html";
  return "unknown";
}

function extractPathExtension(url?: string | null): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return lastExtension(parsed.pathname);
  } catch {
    const pathOnly = url.split(/[?#]/, 1)[0] ?? "";
    return lastExtension(pathOnly);
  }
}

function lastExtension(pathname: string): string {
  const lastSegment = pathname.split("/").pop()?.toLowerCase() ?? "";
  const dotIndex = lastSegment.lastIndexOf(".");
  if (dotIndex < 0) return "";
  return lastSegment.slice(dotIndex);
}
