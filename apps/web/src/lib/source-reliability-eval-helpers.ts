export interface EvidencePackItemRef {
  id: string;
  url: string;
}

export interface EvidencePackRef {
  items: EvidencePackItemRef[];
}

export interface EvidenceCitedRef {
  basis?: string;
  evidenceId?: string;
  recency?: string;
  url?: string;
}

export interface EvaluationResultRef {
  score: number | null;
  confidence: number;
  evidenceCited?: EvidenceCitedRef[];
  evidenceQuality?: {
    independentAssessmentsCount?: number;
  };
}

export type LanguageDetectionStatus = "ok" | "failed" | "timeout";

export const languageDetectionStatus = new Map<string, LanguageDetectionStatus>();

export function extractEvidenceIdsFromText(text: string): string[] {
  if (!text) return [];
  const patterns = [
    /\bE\s*\d+\b/gi,           // E1, E 1
    /\[E\s*\d+\]/gi,           // [E1]
    /\bEvidence\s*\d+\b/gi,    // Evidence 1
  ];

  const ids = new Set<string>();
  for (const pattern of patterns) {
    const matches = text.match(pattern) ?? [];
    for (const m of matches) {
      const num = m.match(/\d+/)?.[0];
      if (num) ids.add(`E${num}`);
    }
  }

  return [...ids];
}

export function countUniqueEvidenceIds(
  result: EvaluationResultRef,
  evidencePack: EvidencePackRef
): number {
  const cited = result.evidenceCited ?? [];
  if (cited.length === 0) return 0;

  const ids = new Set(evidencePack.items.map((i) => i.id));
  const uniqueRefs = new Set<string>();

  for (const item of cited) {
    if (item.evidenceId && ids.has(item.evidenceId)) {
      uniqueRefs.add(item.evidenceId);
    }

    const extracted = extractEvidenceIdsFromText(item.basis || "");
    for (const id of extracted) {
      if (ids.has(id)) {
        uniqueRefs.add(id);
      }
    }
  }

  return uniqueRefs.size;
}

export function computeRefinementConfidenceBoost(
  initialResult: EvaluationResultRef,
  refinedResult: EvaluationResultRef,
  evidencePack: EvidencePackRef,
  refinementApplied: boolean
): { boost: number; evidenceDelta: number; scoreDelta: number } {
  const originalEvidenceCount = countUniqueEvidenceIds(initialResult, evidencePack);
  const refinedEvidenceCount = countUniqueEvidenceIds(refinedResult, evidencePack);
  const evidenceDelta = Math.max(0, refinedEvidenceCount - originalEvidenceCount);
  const scoreDelta = Math.abs((refinedResult.score ?? 0) - (initialResult.score ?? 0));

  let boost = 0;
  if (refinementApplied || evidenceDelta > 0) {
    if (scoreDelta >= 0.10 || evidenceDelta >= 2) {
      boost = 0.10;
    } else if (scoreDelta >= 0.05 || evidenceDelta >= 1) {
      boost = 0.05;
    } else {
      boost = 0.02;
    }
  }

  return { boost, evidenceDelta, scoreDelta };
}

export function getLanguageDetectionCaveat(domain: string): string | null {
  const status = languageDetectionStatus.get(domain);
  if (status === "timeout") {
    return "Language detection timed out; evaluation may be incomplete for non-English sources.";
  }
  if (status === "failed") {
    return "Language detection failed; evaluation may be incomplete for non-English sources.";
  }
  return null;
}
