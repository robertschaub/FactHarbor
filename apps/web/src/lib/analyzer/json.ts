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

/**
 * Attempt to repair truncated JSON by closing unclosed arrays/objects.
 *
 * When LLM output exceeds maxOutputTokens, the JSON gets cut mid-stream.
 * Typically the verdictSummary and analysisContextAnswers appear before
 * claimVerdicts in the output, so they are usually complete. This function
 * finds the last complete array item in the truncated output, closes the
 * structure, and returns whatever parsed successfully.
 *
 * Returns null if the text doesn't start with '{' or repair fails.
 */
export function repairTruncatedJson(text: string): any | null {
  const raw = String(text ?? "").trim();
  const start = raw.indexOf("{");
  if (start < 0) return null;

  // If it already parses, no repair needed
  try {
    return JSON.parse(raw.slice(start));
  } catch {
    // continue to repair
  }

  // Strategy: find the last position where a complete JSON object/array item ends
  // (i.e., the last '}' that completes a nested object at depth > 0).
  // Then close all open brackets from that point.
  let depth = 0;
  let inString = false;
  let escape = false;
  let lastCompleteObjectEnd = -1;
  let depthAtLastComplete = 0;

  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];

    if (inString) {
      if (escape) { escape = false; continue; }
      if (ch === "\\") { escape = true; continue; }
      if (ch === "\"") { inString = false; }
      continue;
    }

    if (ch === "\"") { inString = true; continue; }

    if (ch === "{" || ch === "[") depth++;
    if (ch === "}" || ch === "]") {
      depth--;
      if (depth >= 1) {
        // This closing bracket completed a nested structure
        lastCompleteObjectEnd = i;
        depthAtLastComplete = depth;
      }
    }
  }

  if (lastCompleteObjectEnd < 0) return null;

  // Take everything up to and including the last complete nested object
  let repaired = raw.slice(start, lastCompleteObjectEnd + 1);

  // Close remaining open brackets
  // We need to track what's open from the start up to lastCompleteObjectEnd
  depth = 0;
  inString = false;
  escape = false;
  const openBrackets: string[] = [];

  for (let i = start; i <= lastCompleteObjectEnd; i++) {
    const ch = repaired[i - start];

    if (inString) {
      if (escape) { escape = false; continue; }
      if (ch === "\\") { escape = true; continue; }
      if (ch === "\"") { inString = false; }
      continue;
    }

    if (ch === "\"") { inString = true; continue; }

    if (ch === "{") openBrackets.push("}");
    if (ch === "[") openBrackets.push("]");
    if (ch === "}" || ch === "]") openBrackets.pop();
  }

  // Close all remaining open brackets in reverse order
  repaired += openBrackets.reverse().join("");

  try {
    return JSON.parse(repaired);
  } catch {
    return null;
  }
}

