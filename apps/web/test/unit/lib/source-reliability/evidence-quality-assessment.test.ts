import { describe, expect, it, vi } from "vitest";
import {
  assessEvidenceQuality,
  formatEvidenceForEvaluationPrompt,
  mergeEvidenceQualityAssessment,
  parseEvidenceQualityAssessmentResponse,
  type EvidencePackItemForQuality,
} from "@/lib/source-reliability/evidence-quality-assessment";

const baseItems: EvidencePackItemForQuality[] = [
  {
    id: "E1",
    url: "https://example.org/e1",
    title: "Independent assessment",
    snippet: "Assessor rates outlet reliability as low.",
    query: "query-1",
    provider: "serper",
  },
  {
    id: "E2",
    url: "https://example.org/e2",
    title: "General mention",
    snippet: "Brief mention without methodology.",
    query: "query-2",
    provider: "serper",
  },
];

describe("parseEvidenceQualityAssessmentResponse", () => {
  it("parses object payload with classifications and normalizes values", () => {
    const parsed = parseEvidenceQualityAssessmentResponse(
      JSON.stringify({
        classifications: [
          { id: "E1", probativeValue: "HIGH", evidenceCategory: "fact_checker_rating", relevant: true },
          { id: "E2", probativeValue: "medium", evidenceCategory: "unknown_label", relevant: false },
        ],
      }),
    );
    expect(parsed).toEqual([
      { id: "E1", probativeValue: "high", evidenceCategory: "fact_checker_rating", relevant: true },
      { id: "E2", probativeValue: "medium", evidenceCategory: "other", relevant: false },
    ]);
  });

  it("defaults relevant to false when missing from LLM response", () => {
    const parsed = parseEvidenceQualityAssessmentResponse(
      JSON.stringify({
        classifications: [
          { id: "E1", probativeValue: "high", evidenceCategory: "fact_checker_rating" },
        ],
      }),
    );
    expect(parsed[0].relevant).toBe(false);
  });

  it("throws on invalid json", () => {
    expect(() => parseEvidenceQualityAssessmentResponse("not-json")).toThrow();
  });
});

describe("mergeEvidenceQualityAssessment", () => {
  it("guarantees N-in N-out with defaults, unknown ID ignore, and first-duplicate wins", () => {
    const merged = mergeEvidenceQualityAssessment(baseItems, [
      { id: "E1", probativeValue: "high", evidenceCategory: "fact_checker_rating", relevant: true },
      { id: "E1", probativeValue: "low", evidenceCategory: "opinion", relevant: false }, // duplicate ignored
      { id: "E9", probativeValue: "medium", evidenceCategory: "academic_research", relevant: true }, // unknown ID
    ]);

    expect(merged.items).toHaveLength(baseItems.length);
    expect(merged.items[0].probativeValue).toBe("high");
    expect(merged.items[0].evidenceCategory).toBe("fact_checker_rating");
    expect(merged.items[0].relevant).toBe(true);
    // Unassessed items default to relevant: true (conservative — don't filter out)
    expect(merged.items[1].probativeValue).toBe("low");
    expect(merged.items[1].evidenceCategory).toBe("unclassified");
    expect(merged.items[1].relevant).toBe(true);
    expect(merged.unknownIds).toEqual(["E9"]);
    expect(merged.duplicateIds).toEqual(["E1"]);
  });
});

describe("assessEvidenceQuality", () => {
  it("skips when disabled", async () => {
    const result = await assessEvidenceQuality({
      domain: "example.org",
      items: baseItems,
      config: {
        enabled: false,
        model: "haiku",
        timeoutMs: 8000,
        maxItemsPerAssessment: 12,
        minRemainingBudgetMs: 20000,
      },
      modelName: "claude-haiku-4-5-20251001",
      remainingBudgetMs: 90000,
      promptTemplate: "task ${domain} ${itemsBlock}",
      classify: async () => "[]",
    });
    expect(result.qualityAssessment.status).toBe("skipped");
    expect(result.qualityAssessment.skippedReason).toBe("disabled");
  });

  it("applies enrichment and preserves all items", async () => {
    const classify = vi.fn(async () =>
      JSON.stringify({
        classifications: [
          { id: "E1", probativeValue: "high", evidenceCategory: "fact_checker_rating", relevant: true },
        ],
      }),
    );

    const result = await assessEvidenceQuality({
      domain: "example.org",
      items: baseItems,
      config: {
        enabled: true,
        model: "haiku",
        timeoutMs: 8000,
        maxItemsPerAssessment: 12,
        minRemainingBudgetMs: 20000,
      },
      modelName: "claude-haiku-4-5-20251001",
      remainingBudgetMs: 90000,
      promptTemplate: "task ${domain}\n${itemsBlock}",
      outputFormatTemplate: "json-only",
      classify,
    });

    expect(result.qualityAssessment.status).toBe("applied");
    expect(result.items).toHaveLength(2);
    expect(result.items[0].probativeValue).toBe("high");
    expect(result.items[1].probativeValue).toBe("low");
    expect(classify).toHaveBeenCalledOnce();
  });

  it("returns failed status and unchanged items when classifier errors", async () => {
    const result = await assessEvidenceQuality({
      domain: "example.org",
      items: baseItems,
      config: {
        enabled: true,
        model: "haiku",
        timeoutMs: 8000,
        maxItemsPerAssessment: 12,
        minRemainingBudgetMs: 20000,
      },
      modelName: "claude-haiku-4-5-20251001",
      remainingBudgetMs: 90000,
      promptTemplate: "task ${domain}\n${itemsBlock}",
      classify: async () => {
        throw new Error("timeout while calling provider");
      },
    });

    expect(result.qualityAssessment.status).toBe("failed");
    expect(result.qualityAssessment.errorType).toBe("timeout");
    expect(result.items).toEqual(baseItems);
    expect(result.warningMessage).toMatch(/failed/i);
  });

  it("skips when remaining budget is below minRemainingBudgetMs", async () => {
    const classify = vi.fn(async () => "[]");
    const result = await assessEvidenceQuality({
      domain: "example.org",
      items: baseItems,
      config: {
        enabled: true,
        model: "haiku",
        timeoutMs: 8000,
        maxItemsPerAssessment: 12,
        minRemainingBudgetMs: 20000,
      },
      modelName: "claude-haiku-4-5-20251001",
      remainingBudgetMs: 15000, // below minRemainingBudgetMs
      promptTemplate: "task ${domain}\n${itemsBlock}",
      classify,
    });
    expect(result.qualityAssessment.status).toBe("skipped");
    expect(result.qualityAssessment.skippedReason).toBe("budget_guard");
    expect(result.items).toEqual(baseItems);
    expect(classify).not.toHaveBeenCalled();
  });

  it("handles multilingual evidence snippets (de/fr/en) without structural failure", async () => {
    const multilingualItems: EvidencePackItemForQuality[] = [
      {
        id: "E1",
        url: "https://example.org/de",
        title: "Korrektiv-Analyse",
        snippet: "Die Quelle wurde von unabhängigen Prüfern bewertet.",
        query: "de-query",
        provider: "serper",
      },
      {
        id: "E2",
        url: "https://example.org/fr",
        title: "Analyse journalistique",
        snippet: "Le média est cité dans plusieurs évaluations indépendantes.",
        query: "fr-query",
        provider: "serper",
      },
      {
        id: "E3",
        url: "https://example.org/en",
        title: "Reliability review",
        snippet: "Independent assessor rates factual reporting as mixed.",
        query: "en-query",
        provider: "serper",
      },
    ];

    const result = await assessEvidenceQuality({
      domain: "example.org",
      items: multilingualItems,
      config: {
        enabled: true,
        model: "haiku",
        timeoutMs: 8000,
        maxItemsPerAssessment: 12,
        minRemainingBudgetMs: 20000,
      },
      modelName: "claude-haiku-4-5-20251001",
      remainingBudgetMs: 90000,
      promptTemplate: "task ${domain}\n${itemsBlock}",
      classify: async () =>
        JSON.stringify({
          classifications: [
            { id: "E1", probativeValue: "high", evidenceCategory: "fact_checker_rating", relevant: true },
            { id: "E2", probativeValue: "medium", evidenceCategory: "journalistic_analysis", relevant: true },
            { id: "E3", probativeValue: "low", evidenceCategory: "general_mention", relevant: false },
          ],
        }),
    });

    expect(result.qualityAssessment.status).toBe("applied");
    expect(result.items).toHaveLength(3);
    expect(result.items.map((item) => item.probativeValue)).toEqual(["high", "medium", "low"]);
  });
});

describe("formatEvidenceForEvaluationPrompt", () => {
  it("groups quality-labeled evidence by probative value", () => {
    const formatted = formatEvidenceForEvaluationPrompt([
      {
        ...baseItems[0],
        probativeValue: "high",
        evidenceCategory: "fact_checker_rating",
        enrichmentVersion: 1,
      },
      {
        ...baseItems[1],
        probativeValue: "low",
        evidenceCategory: "general_mention",
        enrichmentVersion: 1,
      },
    ]);
    expect(formatted).toContain("HIGH PROBATIVE VALUE");
    expect(formatted).toContain("LOW PROBATIVE VALUE");
    expect(formatted).toContain("[fact_checker_rating]");
  });
});
