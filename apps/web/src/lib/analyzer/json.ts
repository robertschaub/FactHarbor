/**
 * JSON extraction utilities for recovering structured outputs from LLM text.
 *
 * These helpers are intentionally conservative and do not attempt to fully parse
 * arbitrary JavaScript; they only try to locate and parse the first JSON object.
 */

/**
 * Extract the first JSON object substring from arbitrary text.
 * Resilient to braces inside quoted strings.
 */
export function extractFirstJsonObjectFromText(text: string): string | null {
  const raw = String(text ?? "");
  const start = raw.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];

    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      continue;
    }

    if (ch === "{") depth++;
    if (ch === "}") depth--;

    if (depth === 0) return raw.slice(start, i + 1);
  }

  return null;
}

export function tryParseFirstJsonObject(text: string): any | null {
  const jsonStr = extractFirstJsonObjectFromText(text);
  if (!jsonStr) return null;
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

