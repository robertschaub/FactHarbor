/**
 * Build a user-facing error ID from an error message.
 *
 * Extracts the error class name (e.g. AI_APICallError) and appends up to 2
 * significant words from the message detail after the colon, producing IDs
 * like "AI_APICALL_ERROR_CREDIT_BALANCE". Returns "UNKNOWN" if no error
 * class is detected. Truncated to 36 characters.
 *
 * This module is client-safe (no Node.js dependencies).
 */
const ERROR_ID_STOP_WORDS = new Set([
  "a","an","the","your","my","is","are","was","to","of","in","at","on",
  "for","with","from","by","too","not","and","or","be","has","have",
  "its","this","that",
]);

export function buildErrorId(message: string): string {
  const typeMatch = message.match(/\b([A-Za-z_][A-Za-z0-9_]*(?:Error|Exception|Failure|Timeout))\b/);
  if (!typeMatch) return "UNKNOWN";

  const typePart = typeMatch[1].replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();
  const afterType = message.slice((typeMatch.index ?? 0) + typeMatch[1].length);
  const colonContent = afterType.match(/^:\s*(.+)/)?.[1] ?? "";
  const detail = colonContent.split(/\s+/)
    .filter(w => { const l = w.toLowerCase().replace(/[^a-z]/g, ""); return l.length >= 2 && !ERROR_ID_STOP_WORDS.has(l); })
    .slice(0, 2)
    .map(w => w.replace(/[^a-zA-Z0-9]/g, "").toUpperCase());

  return (typePart + (detail.length ? "_" + detail.join("_") : "")).slice(0, 36);
}
