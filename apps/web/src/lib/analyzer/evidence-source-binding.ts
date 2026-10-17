import { createHash } from "node:crypto";
import type { EvidenceSourceBinding, EvidenceSourceView, FetchedSource } from "./types";

const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");
const wellFormed = (value: string) => Buffer.from(value, "utf8").toString("utf8") === value;

/** The caller supplies the exact text sent to extraction, without normalization. */
export function bindEvidenceSource(
  returnedUrl: string | undefined,
  requestSources: ReadonlyArray<{ url: string; text: string }>,
): EvidenceSourceBinding {
  if (!returnedUrl) return { status: "unresolved", reason: "missing_returned_url" };
  const matches = requestSources.filter(s => s.url === returnedUrl);
  if (!matches.length) return { status: "unresolved", reason: "unknown_returned_url" };
  if (matches.some(s => !s.text || !wellFormed(s.text) || !wellFormed(s.url))) {
    return { status: "unresolved", reason: "invalid_source_view" };
  }
  const views = matches.map(s => {
    const hash = sha256(s.text);
    return { ref: `SV_${sha256(JSON.stringify([s.url, hash]))}`, url: s.url, sha256: hash,
      start: 0, end: s.text.length, utf16Length: s.text.length,
      utf8Length: Buffer.byteLength(s.text, "utf8") };
  });
  if (new Set(views.map(v => v.ref)).size !== 1) {
    return { status: "unresolved", reason: "ambiguous_source_view" };
  }
  return { status: "bound", view: views[0] };
}

/** Reconstruct the exact view from retained text; a URL match alone is insufficient. */
export function resolveBoundSource(binding: EvidenceSourceBinding | undefined, sources: FetchedSource[]):
  { source: FetchedSource; view: EvidenceSourceView; text: string } | undefined {
  if (binding?.status !== "bound") return undefined;
  const v = binding.view;
  if (!v || !Number.isSafeInteger(v.start) || !Number.isSafeInteger(v.end) ||
    v.start < 0 || v.end <= v.start || v.end - v.start !== v.utf16Length) return undefined;
  for (const source of sources) {
    if (source.url !== v.url || typeof source.fullText !== "string" ||
      v.end > source.fullText.length || !wellFormed(source.fullText)) continue;
    const text = source.fullText.slice(v.start, v.end);
    const checked = bindEvidenceSource(source.url, [{ url: source.url, text }]);
    if (checked.status === "bound" && checked.view.ref === v.ref &&
      checked.view.sha256 === v.sha256 && checked.view.utf8Length === v.utf8Length) {
      return { source, view: v, text };
    }
  }
  return undefined;
}

/** Identical extraction views may alias; different versions of a URL must survive. */
export function mergeExtractionSources(target: FetchedSource[], incoming: FetchedSource[]): void {
  for (const source of incoming) {
    const binding = bindEvidenceSource(source.url, [{ url: source.url, text: source.fullText.slice(0, 8000) }]);
    if (resolveBoundSource(binding, target)) continue;
    source.id = `S_${String(target.length + 1).padStart(3, "0")}`;
    target.push(source);
  }
}
