export interface ReportSourceRecord extends Record<string, unknown> {
  url: string;
  category: string;
  trackRecordScore: number | null;
  trackRecordConfidence?: number | null;
  trackRecordConsensus?: boolean | null;
  fetchSuccess?: boolean;
}

type RawSourceRecord = Record<string, unknown>;

function isRecord(value: unknown): value is RawSourceRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalNumber(value: unknown): number | null | undefined {
  return typeof value === "number" ? value : value === null ? null : undefined;
}

function optionalBoolean(value: unknown): boolean | null | undefined {
  return typeof value === "boolean" ? value : value === null ? null : undefined;
}

function toReportSource(source: RawSourceRecord): ReportSourceRecord {
  const trackRecordConfidence = optionalNumber(source.trackRecordConfidence);
  const trackRecordConsensus = optionalBoolean(source.trackRecordConsensus);

  return {
    ...source,
    url: typeof source.url === "string" ? source.url : "",
    category: typeof source.category === "string" ? source.category : "",
    trackRecordScore: optionalNumber(source.trackRecordScore) ?? null,
    ...(trackRecordConfidence !== undefined ? { trackRecordConfidence } : {}),
    ...(trackRecordConsensus !== undefined ? { trackRecordConsensus } : {}),
    ...(typeof source.fetchSuccess === "boolean" ? { fetchSuccess: source.fetchSuccess } : {}),
  };
}

export function normalizeReportSources(rawSources: unknown): ReportSourceRecord[] {
  if (Array.isArray(rawSources)) {
    return rawSources.filter(isRecord).map(toReportSource);
  }

  if (!isRecord(rawSources)) {
    return [];
  }

  if (Array.isArray(rawSources.items)) {
    return rawSources.items.filter(isRecord).map(toReportSource);
  }

  return [];
}

export function normalizeDynamicCitationSources(rawCitations: unknown): ReportSourceRecord[] {
  return normalizeReportSources(rawCitations).map((citation) => ({
    url: citation.url,
    title: citation.title,
    fetchSuccess: true,
    trackRecordScore: citation.trackRecordScore,
    trackRecordConfidence: citation.trackRecordConfidence,
    trackRecordConsensus: citation.trackRecordConsensus,
    excerpt: citation.excerpt,
    category: typeof citation.sourceType === "string" ? citation.sourceType : "citation",
  }));
}
