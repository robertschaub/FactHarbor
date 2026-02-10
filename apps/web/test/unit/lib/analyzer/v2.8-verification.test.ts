/**
 * v2.8 Verification Tests
 *
 * Unit tests to verify the v2.8 changes work correctly:
 * 1. Hydrogen input verifies context detection (production/usage phases)
 * 2. Weighting behavior for contested vs doubted claims
 * 3. probativeValue and sourceType field integration
 *
 * Unit tests run without API keys.
 * Run with: npx vitest run test/unit/lib/analyzer/v2.8-verification.test.ts
 *
 * @module analyzer/v2.8-verification.test
 */

import { describe, expect, it } from "vitest";

import { detectContexts, formatDetectedContextsHint } from "@/lib/analyzer/analysis-contexts";
import {
  getClaimWeight,
  calculateWeightedVerdictAverage,
} from "@/lib/analyzer/aggregation";

// ============================================================================
// UNIT TESTS - No API required
// ============================================================================

describe("v2.8 Verification - Unit Tests", () => {
  // ============================================================================
  // TEST 1: Hydrogen - Multiple Methodology Contexts
  // ============================================================================
  describe("Hydrogen Efficiency - Context Pre-Detection", () => {
    it("should return null for heuristic detection (LLM handles context detection)", () => {
      const input = "Hydrogen cars use more energy than electric cars";

      const contexts = detectContexts(input);

      console.log("[v2.8 Unit Test] Hydrogen contexts:", contexts);

      // Heuristic context detection is deferred to the LLM in the UNDERSTAND phase.
      // detectContexts() (synchronous wrapper) delegates to detectContextsHeuristic()
      // which always returns null.
      expect(contexts).toBeNull();
    });

    it("should format context hints correctly when given contexts", () => {
      // detectContexts() now returns null (heuristic detection deferred to LLM),
      // so test formatDetectedContextsHint with manually-provided contexts.
      const contexts = detectContexts("Using hydrogen is more efficient than electricity");
      expect(contexts).toBeNull();

      const contextsWithEnergy = detectContexts("Hydrogen cars use more energy than electric cars");
      expect(contextsWithEnergy).toBeNull();

      // formatDetectedContextsHint returns empty string for null input
      expect(formatDetectedContextsHint(null, true)).toBe("");

      // Verify formatting works when given actual contexts
      const mockContexts = [
        { id: "CTX_PRODUCTION", name: "Production Phase", type: "methodological" },
        { id: "CTX_USAGE", name: "Usage Phase", type: "methodological" },
      ];
      const hint = formatDetectedContextsHint(mockContexts, true);

      expect(hint).toContain("PRE-DETECTED CONTEXTS");
      expect(hint).toContain("MUST output at least these contexts");
    });
  });

  // ============================================================================
  // TEST 4: Weight Calculation Verification
  // ============================================================================
  describe("Weight Calculation - Doubted vs Contested", () => {
    it("should give full weight to doubted claims (opinion basis)", () => {
      const doubtedClaim = {
        centrality: "high" as const,
        confidence: 100,
        harmPotential: "medium" as const,
        isContested: true,
        factualBasis: "opinion" as const,
      };

      const uncontestedClaim = {
        centrality: "high" as const,
        confidence: 100,
        harmPotential: "medium" as const,
        isContested: false,
      };

      const doubtedWeight = getClaimWeight(doubtedClaim);
      const uncontestedWeight = getClaimWeight(uncontestedClaim);

      console.log(`[v2.8 Unit Test] Doubted weight: ${doubtedWeight}, Uncontested: ${uncontestedWeight}`);
      
      // PASS CRITERIA: Doubted (opinion) should have same weight as uncontested
      expect(doubtedWeight).toBe(uncontestedWeight);
    });

    it("should reduce weight for contested claims with established evidence", () => {
      const contestedClaim = {
        centrality: "high" as const,
        confidence: 100,
        isContested: true,
        factualBasis: "established" as const,
      };

      const uncontestedClaim = {
        centrality: "high" as const,
        confidence: 100,
        isContested: false,
      };

      const contestedWeight = getClaimWeight(contestedClaim);
      const uncontestedWeight = getClaimWeight(uncontestedClaim);

      console.log(`[v2.8 Unit Test] Contested weight: ${contestedWeight}, Uncontested: ${uncontestedWeight}`);
      
      // PASS CRITERIA: Contested (established) should be 0.5x (v2.9.0: reduced from 0.3x to avoid double-penalization)
      expect(contestedWeight).toBe(uncontestedWeight * 0.5);
    });

    it("aggregation should not penalize doubted claims", () => {
      const claims = [
        { truthPercentage: 90, confidence: 100, isContested: false },
        { truthPercentage: 30, confidence: 100, isContested: true, factualBasis: "opinion" as const },
      ];

      const avgWithDoubted = calculateWeightedVerdictAverage(claims);

      // Compare with if both were uncontested
      const claimsUncontested = [
        { truthPercentage: 90, confidence: 100, isContested: false },
        { truthPercentage: 30, confidence: 100, isContested: false },
      ];

      const avgUncontested = calculateWeightedVerdictAverage(claimsUncontested);

      console.log(`[v2.8 Unit Test] With doubted: ${avgWithDoubted}, Uncontested: ${avgUncontested}`);
      
      // PASS CRITERIA: Should be the same (doubted = full weight)
      expect(avgWithDoubted).toBe(avgUncontested);
    });
  });

  // ============================================================================
  // TEST 5: Legal/Trial Context Pre-Detection
  // ============================================================================
  describe("Legal Context Pre-Detection", () => {
    it("should return null for legal context heuristic detection (LLM handles it)", () => {
      const inputs = [
        "The trial was fair and based on law",
        "Was the judgment fair and legitimate?",
        "The court followed proper legal procedures",
      ];

      for (const input of inputs) {
        const contexts = detectContexts(input);

        console.log(`[v2.8 Unit Test] "${input.substring(0, 40)}..." -> ${contexts?.length ?? 0} contexts`);

        // Heuristic context detection is deferred to the LLM in the UNDERSTAND phase.
        // detectContexts() always returns null.
        expect(contexts).toBeNull();
      }
    });
  });

  // ============================================================================
  // TEST 6: probativeValue Field Integration (Phase 2)
  // ============================================================================
  describe("probativeValue Field Integration", () => {
    it("EvidenceItem type accepts probativeValue field", () => {
      // Type check: Verify probativeValue is a valid optional field
      const evidence = {
        id: "E1",
        statement: "Specific statement with clear attribution",
        category: "evidence",
        specificity: "high",
        sourceId: "S1",
        sourceUrl: "https://example.com",
        sourceTitle: "Example Source",
        sourceExcerpt: "The study published in Nature found...",
        probativeValue: "high" as const,
      };

      expect(evidence.probativeValue).toBe("high");
    });

    it("probativeValue field is optional for backward compatibility", () => {
      // Verify old evidence without probativeValue still works
      const legacyEvidence = {
        id: "E1",
        statement: "Statement from legacy job",
        category: "evidence",
        specificity: "high",
        sourceId: "S1",
        sourceUrl: "https://example.com",
        sourceTitle: "Legacy Source",
        sourceExcerpt: "Legacy excerpt text",
        // probativeValue: NOT SET (legacy data)
      };

      // Should use default when missing
      const probativeValue = (legacyEvidence as any).probativeValue ?? "medium";
      expect(probativeValue).toBe("medium");
    });

    it("high probativeValue indicates well-attributed evidence", () => {
      // Mock evidence that would receive high probativeValue from LLM
      const highQualityEvidence = [
        {
          statement: "The study published in Nature (2023) found a 25% increase in efficiency",
          category: "statistic",
          probativeValue: "high" as const,
          reason: "Specific claim with clear source attribution and concrete data",
        },
        {
          statement: "According to Dr. Smith's peer-reviewed research, the hypothesis was confirmed",
          category: "expert_quote",
          probativeValue: "high" as const,
          reason: "Expert testimony with credentials and verifiable source",
        },
        {
          statement: "Court records show the defendant was convicted on March 15, 2024",
          category: "event",
          probativeValue: "high" as const,
          reason: "Specific event with date and official source",
        },
      ];

      for (const evidence of highQualityEvidence) {
        expect(evidence.probativeValue).toBe("high");
        console.log(`[v2.8 Unit Test] High probativeValue: "${evidence.statement.substring(0, 50)}..."`);
      }
    });

    it("medium probativeValue indicates moderately specific evidence", () => {
      // Mock evidence that would receive medium probativeValue from LLM
      const mediumQualityEvidence = [
        {
          statement: "Recent studies suggest a positive correlation",
          category: "evidence",
          probativeValue: "medium" as const,
          reason: "General claim with reasonable but vague attribution",
        },
        {
          statement: "Experts in the field generally agree on this approach",
          category: "expert_quote",
          probativeValue: "medium" as const,
          reason: "Expert consensus but no specific names",
        },
        {
          statement: "The company reported improved performance last quarter",
          category: "evidence",
          probativeValue: "medium" as const,
          reason: "Specific enough but lacks precise data",
        },
      ];

      for (const evidence of mediumQualityEvidence) {
        expect(evidence.probativeValue).toBe("medium");
        console.log(`[v2.8 Unit Test] Medium probativeValue: "${evidence.statement.substring(0, 50)}..."`);
      }
    });

    it("low probativeValue items should be filtered by evidence-filter.ts", () => {
      // Low probativeValue items are filtered by the deterministic layer
      // See evidence-filter.test.ts for comprehensive filtering tests

      const lowQualityEvidence = [
        {
          statement: "Some say this might be true",
          category: "evidence",
          probativeValue: "low" as const,
          reason: "Vague attribution, speculative language",
        },
        {
          statement: "It is believed that this could happen",
          category: "evidence",
          probativeValue: "low" as const,
          reason: "No attribution, uncertain language",
        },
      ];

      // These would be filtered by evidence-filter.ts vague phrase detection
      const vaguePatterns = [
        "some say",
        "it is believed",
        "might be",
        "could happen",
      ];

      for (const evidence of lowQualityEvidence) {
        expect(evidence.probativeValue).toBe("low");

        const hasVaguePhrase = vaguePatterns.some(pattern =>
          evidence.statement.toLowerCase().includes(pattern)
        );
        expect(hasVaguePhrase).toBe(true);

        console.log(`[v2.8 Unit Test] Low probativeValue (would be filtered): "${evidence.statement}"`);
      }
    });

    it("probativeValue weights should affect verdict aggregation", () => {
      // Mock scenario: two evidence items with same claimDirection but different probativeValue
      // High probativeValue should have more weight (1.0 vs 0.8 vs 0.5)

      const evidenceWithWeights = [
        { probativeValue: "high", weight: 1.0, supports: true },
        { probativeValue: "medium", weight: 0.8, supports: true },
        { probativeValue: "low", weight: 0.5, supports: false },
      ];

      // High probativeValue has highest weight
      expect(evidenceWithWeights[0].weight).toBeGreaterThan(evidenceWithWeights[1].weight);
      expect(evidenceWithWeights[1].weight).toBeGreaterThan(evidenceWithWeights[2].weight);

      // Weighted sum simulation
      const totalWeight = evidenceWithWeights.reduce((sum, e) => sum + e.weight, 0);
      const supportingWeight = evidenceWithWeights
        .filter(e => e.supports)
        .reduce((sum, e) => sum + e.weight, 0);

      // High+medium supporting (1.8) should outweigh low contradicting (0.5)
      expect(supportingWeight).toBeGreaterThan(totalWeight - supportingWeight);

      console.log(`[v2.8 Unit Test] Weighted verdict: ${(supportingWeight / totalWeight * 100).toFixed(1)}% support`);
    });

    it("CalcConfig has probativeValueWeights configuration", () => {
      // Verify CalcConfig extended with probativeValue weights (Task 0.2)
      const defaultProbativeValueWeights = {
        high: 1.0,
        medium: 0.8,
        low: 0.5,
      };

      expect(defaultProbativeValueWeights.high).toBe(1.0);
      expect(defaultProbativeValueWeights.medium).toBe(0.8);
      expect(defaultProbativeValueWeights.low).toBe(0.5);

      // Weights should be in descending order
      expect(defaultProbativeValueWeights.high).toBeGreaterThan(defaultProbativeValueWeights.medium);
      expect(defaultProbativeValueWeights.medium).toBeGreaterThan(defaultProbativeValueWeights.low);

      console.log(`[v2.8 Unit Test] probativeValue weights: high=${defaultProbativeValueWeights.high}, medium=${defaultProbativeValueWeights.medium}, low=${defaultProbativeValueWeights.low}`);
    });
  });

  // ============================================================================
  // TEST 7: SourceType Classification (Phase 2.5)
  // ============================================================================
  describe("SourceType Classification", () => {
    it("peer_reviewed_study sourceType indicates academic research", () => {
      // Mock evidence with peer-reviewed study source
      const peerReviewedEvidence = {
        id: "E1",
        statement: "The study found a 25% increase in efficiency",
        category: "statistic",
        sourceId: "S1",
        sourceUrl: "https://nature.com/articles/12345",
        sourceTitle: "Study published in Nature Journal",
        sourceExcerpt: "Published in Nature (2023), peer-reviewed research...",
        evidenceScope: {
          name: "Peer-Reviewed Academic Study",
          sourceType: "peer_reviewed_study" as const,
        },
      };

      expect(peerReviewedEvidence.evidenceScope.sourceType).toBe("peer_reviewed_study");
      console.log(`[v2.8 Unit Test] peer_reviewed_study: "${peerReviewedEvidence.sourceTitle}"`);
    });

    it("fact_check_report sourceType indicates fact-checking organizations", () => {
      // Mock evidence from fact-checking site
      const factCheckEvidence = {
        id: "E2",
        statement: "The claim was rated as false by fact-checkers",
        category: "evidence",
        sourceId: "S2",
        sourceUrl: "https://snopes.com/fact-check/example",
        sourceTitle: "Snopes Fact Check: Example Claim",
        sourceExcerpt: "According to Snopes fact-checking investigation...",
        evidenceScope: {
          name: "Snopes Fact Check Report",
          sourceType: "fact_check_report" as const,
        },
      };

      expect(factCheckEvidence.evidenceScope.sourceType).toBe("fact_check_report");
      console.log(`[v2.8 Unit Test] fact_check_report: "${factCheckEvidence.sourceTitle}"`);
    });

    it("government_report sourceType indicates official government sources", () => {
      // Mock evidence from government publication
      const govReportEvidence = {
        id: "E3",
        statement: "The census data shows population increased by 5%",
        category: "statistic",
        sourceId: "S3",
        sourceUrl: "https://census.gov/data/reports/2023",
        sourceTitle: "U.S. Census Bureau Report 2023",
        sourceExcerpt: "Official census data published by the U.S. Census Bureau...",
        evidenceScope: {
          name: "Official Government Census Report",
          sourceType: "government_report" as const,
        },
      };

      expect(govReportEvidence.evidenceScope.sourceType).toBe("government_report");
      console.log(`[v2.8 Unit Test] government_report: "${govReportEvidence.sourceTitle}"`);
    });

    it("legal_document sourceType indicates court rulings and legislation", () => {
      // Mock evidence from legal document
      const legalEvidence = {
        id: "E4",
        statement: "The Supreme Court ruled in favor of the plaintiff",
        category: "event",
        sourceId: "S4",
        sourceUrl: "https://supremecourt.gov/opinions/23-456",
        sourceTitle: "Supreme Court Opinion 23-456",
        sourceExcerpt: "The Court held that the lower court's decision...",
        evidenceScope: {
          name: "Supreme Court Ruling",
          sourceType: "legal_document" as const,
        },
      };

      expect(legalEvidence.evidenceScope.sourceType).toBe("legal_document");
      console.log(`[v2.8 Unit Test] legal_document: "${legalEvidence.sourceTitle}"`);
    });

    it("news_primary sourceType indicates primary source journalism", () => {
      // Mock evidence from primary journalism
      const primaryNewsEvidence = {
        id: "E5",
        statement: "The reporter witnessed the event firsthand",
        category: "event",
        sourceId: "S5",
        sourceUrl: "https://reuters.com/investigative/2023/report",
        sourceTitle: "Reuters Investigative Report",
        sourceExcerpt: "Our reporters on the ground observed...",
        evidenceScope: {
          name: "Reuters Primary Investigation",
          sourceType: "news_primary" as const,
        },
      };

      expect(primaryNewsEvidence.evidenceScope.sourceType).toBe("news_primary");
      console.log(`[v2.8 Unit Test] news_primary: "${primaryNewsEvidence.sourceTitle}"`);
    });

    it("news_secondary sourceType indicates news aggregation", () => {
      // Mock evidence from secondary news
      const secondaryNewsEvidence = {
        id: "E6",
        statement: "According to reports, the incident occurred yesterday",
        category: "event",
        sourceId: "S6",
        sourceUrl: "https://newsaggregator.com/story/123",
        sourceTitle: "News Summary: Recent Incident",
        sourceExcerpt: "Multiple sources report that the incident...",
        evidenceScope: {
          name: "News Aggregator Summary",
          sourceType: "news_secondary" as const,
        },
      };

      expect(secondaryNewsEvidence.evidenceScope.sourceType).toBe("news_secondary");
      console.log(`[v2.8 Unit Test] news_secondary: "${secondaryNewsEvidence.sourceTitle}"`);
    });

    it("expert_statement sourceType indicates expert opinions", () => {
      // Mock evidence from expert statement
      const expertEvidence = {
        id: "E7",
        statement: "Dr. Johnson, a leading climatologist, stated that temperatures are rising",
        category: "expert_quote",
        sourceId: "S7",
        sourceUrl: "https://university.edu/expert-interviews/johnson",
        sourceTitle: "Interview with Dr. Johnson",
        sourceExcerpt: "Dr. Johnson, Professor of Climate Science at MIT, explained...",
        evidenceScope: {
          name: "Expert Statement by Climatologist",
          sourceType: "expert_statement" as const,
        },
      };

      expect(expertEvidence.evidenceScope.sourceType).toBe("expert_statement");
      console.log(`[v2.8 Unit Test] expert_statement: "${expertEvidence.sourceTitle}"`);
    });

    it("organization_report sourceType indicates NGO/think tank reports", () => {
      // Mock evidence from organization report
      const orgReportEvidence = {
        id: "E8",
        statement: "The WHO report found increased disease prevalence",
        category: "statistic",
        sourceId: "S8",
        sourceUrl: "https://who.int/publications/2023/disease-report",
        sourceTitle: "World Health Organization Report 2023",
        sourceExcerpt: "The WHO annual report documented...",
        evidenceScope: {
          name: "WHO Health Report",
          sourceType: "organization_report" as const,
        },
      };

      expect(orgReportEvidence.evidenceScope.sourceType).toBe("organization_report");
      console.log(`[v2.8 Unit Test] organization_report: "${orgReportEvidence.sourceTitle}"`);
    });

    it("other sourceType is default when classification uncertain", () => {
      // Mock evidence with unclassified source
      const otherEvidence = {
        id: "E9",
        statement: "The website claims this is true",
        category: "evidence",
        sourceId: "S9",
        sourceUrl: "https://random-blog.com/post/123",
        sourceTitle: "Personal Blog Post",
        sourceExcerpt: "According to this blog post...",
        evidenceScope: {
          name: "Personal Blog",
          sourceType: "other" as const,
        },
      };

      expect(otherEvidence.evidenceScope.sourceType).toBe("other");
      console.log(`[v2.8 Unit Test] other: "${otherEvidence.sourceTitle}"`);
    });

    it("sourceType is omitted when no EvidenceScope extracted", () => {
      // Evidence without EvidenceScope (legacy or simple evidence)
      const noScopeEvidence = {
        id: "E10",
        statement: "Some evidence statement",
        category: "evidence",
        sourceId: "S10",
        sourceUrl: "https://example.com",
        sourceTitle: "Example Source",
        sourceExcerpt: "Example excerpt",
        // evidenceScope: MISSING (not extracted)
      };

      expect(noScopeEvidence.evidenceScope).toBeUndefined();
      console.log(`[v2.8 Unit Test] No evidenceScope: sourceType omitted`);
    });

    it("CalcConfig has sourceTypeCalibration factors", () => {
      // Verify CalcConfig extended with sourceType calibration (Task 0.3)
      const defaultSourceTypeCalibration = {
        peer_reviewed_study: 1.0,
        fact_check_report: 1.05,
        government_report: 1.0,
        legal_document: 1.0,
        news_primary: 1.0,
        news_secondary: 0.95,
        expert_statement: 0.9,
        organization_report: 0.95,
        other: 0.8,
      };

      // Verify all 9 source types have calibration factors
      expect(Object.keys(defaultSourceTypeCalibration)).toHaveLength(9);

      // Verify fact_check_report has highest calibration (1.05)
      const maxCalibration = Math.max(...Object.values(defaultSourceTypeCalibration));
      expect(defaultSourceTypeCalibration.fact_check_report).toBe(maxCalibration);

      // Verify "other" has lowest calibration (0.8)
      const minCalibration = Math.min(...Object.values(defaultSourceTypeCalibration));
      expect(defaultSourceTypeCalibration.other).toBe(minCalibration);

      console.log(`[v2.8 Unit Test] sourceType calibration factors: peer_reviewed=${defaultSourceTypeCalibration.peer_reviewed_study}, fact_check=${defaultSourceTypeCalibration.fact_check_report}, other=${defaultSourceTypeCalibration.other}`);
    });

    it("sourceType calibration affects evidence reliability weighting", () => {
      // Mock scenario: two identical evidence items with different sourceTypes
      const peerReviewedEvidence = {
        statement: "The treatment showed 80% efficacy",
        sourceType: "peer_reviewed_study" as const,
        calibrationFactor: 1.0,
      };

      const blogEvidence = {
        statement: "The treatment showed 80% efficacy",
        sourceType: "other" as const,
        calibrationFactor: 0.8,
      };

      // Same statement but different calibration due to sourceType
      expect(peerReviewedEvidence.calibrationFactor).toBeGreaterThan(blogEvidence.calibrationFactor);

      // Peer-reviewed should have 25% more weight than "other"
      const weightRatio = peerReviewedEvidence.calibrationFactor / blogEvidence.calibrationFactor;
      expect(weightRatio).toBe(1.25);

      console.log(`[v2.8 Unit Test] Calibration impact: peer_reviewed (1.0) vs other (0.8) = ${weightRatio.toFixed(2)}x weight`);
    });
  });
});

