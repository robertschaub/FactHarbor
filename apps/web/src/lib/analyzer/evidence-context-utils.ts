/**
 * Evidence Context Utilities Module
 *
 * Utility functions for context metadata manipulation and formatting.
 *
 * @module analyzer/evidence-context-utils
 */

import type { AnalysisContext } from "./types";

/**
 * Merge metadata from duplicate contexts into a primary context
 * Fills empty/missing fields in primary from duplicates (non-destructive merge)
 */
export function mergeContextMetadata(primary: any, duplicates: any[]): any {
  const merged: AnalysisContext = { ...(primary as any) };
  const outMeta: Record<string, any> = { ...(((primary as any).metadata as any) || {}) };

  for (const dup of duplicates || []) {
    const dm: Record<string, any> = ((dup as any)?.metadata as any) || {};
    for (const [k, v] of Object.entries(dm)) {
      const existing = outMeta[k];
      const isEmpty =
        existing === undefined ||
        existing === null ||
        (typeof existing === "string" && existing.trim() === "");
      if (isEmpty && v !== undefined && v !== null && !(typeof v === "string" && v.trim() === "")) {
        outMeta[k] = v;
      }
    }
  }

  (merged as any).metadata = outMeta;
  return merged;
}

/**
 * Build a readable context description for prompts and similarity assessment
 * Combines subject, institution, jurisdiction, and shortName
 */
export function buildContextDescription(ctx: any): string {
  if (!ctx) return "";
  const meta = (ctx.metadata || {}) as Record<string, any>;

  // Helper to normalize context alias/shortName
  const normalizeAlias = (alias: string | undefined) => {
    if (!alias) return "";
    return alias.replace(/^CTX_/, "").trim();
  };

  const parts = [
    ctx.subject || ctx.assessedStatement || ctx.name || "",
    meta.institution || meta.court || meta.regulatoryBody || "",
    meta.jurisdiction || meta.geographic || "",
    normalizeAlias(ctx.shortName) || "",
  ].filter(Boolean);

  return parts.join(" | ");
}

/**
 * Build formatted context summary for search relevance assessment prompts
 * Lists all contexts with their key metadata fields
 */
export function buildRelevanceContextSummary(contexts: any[]): string {
  if (!contexts || contexts.length === 0) return "No contexts available.";

  return contexts
    .map((ctx, idx) => {
      const meta = ctx.metadata || {};
      const institution = meta.institution || meta.court || "";
      const jurisdiction = meta.jurisdiction || meta.geographic || "";
      const methodology = meta.methodology || "";

      return [
        `Context ${idx + 1}: ${ctx.subject || ctx.name || ctx.shortName || "General"}`,
        institution ? `Institution: ${institution}` : "",
        jurisdiction ? `Jurisdiction: ${jurisdiction}` : "",
        methodology ? `Methodology: ${methodology}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
    })
    .join("\n");
}
