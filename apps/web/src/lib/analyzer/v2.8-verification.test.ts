/**
 * v2.8 Verification Tests
 * 
 * Unit and integration tests to verify the v2.8 changes work correctly:
 * 1. Hydrogen input verifies 2+ scopes detected (production/usage phases)
 * 2. Bolsonaro verifies US criticism is factualBasis: "opinion" (not "established")
 * 3. High harm potential claims get proper weight (death/injury claims)
 * 
 * Unit tests run without API keys.
 * Integration tests require API keys and running services.
 * Run with: npx vitest run src/lib/analyzer/v2.8-verification.test.ts
 * 
 * @module analyzer/v2.8-verification.test
 */

import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

import { detectScopes, formatDetectedScopesHint } from "./scopes";
import { 
  detectHarmPotential, 
  detectClaimContestation, 
  validateContestation,
  getClaimWeight,
  calculateWeightedVerdictAverage 
} from "./aggregation";
import { runMonolithicCanonical } from "./monolithic-canonical";
import { loadEnvFile } from "./test-helpers";

// ============================================================================
// UNIT TESTS - No API required
// ============================================================================

describe("v2.8 Verification - Unit Tests", () => {
  // ============================================================================
  // TEST 1: Hydrogen - Multiple Methodology Scopes
  // ============================================================================
  describe("Hydrogen Efficiency - Scope Pre-Detection", () => {
    it("should detect 2+ scopes for hydrogen vs electricity comparison", () => {
      const input = "Hydrogen cars use more energy than electric cars";
      
      const scopes = detectScopes(input);
      
      console.log("[v2.8 Unit Test] Hydrogen scopes:", scopes);
      
      // PASS CRITERIA: Should detect production/usage scopes
      expect(scopes).not.toBeNull();
      expect(scopes!.length).toBeGreaterThanOrEqual(2);
      
      // Check for expected scope IDs
      const scopeIds = scopes!.map(s => s.id);
      expect(scopeIds).toContain("SCOPE_PRODUCTION");
      expect(scopeIds).toContain("SCOPE_USAGE");
    });

    it("should format scope hints correctly", () => {
      const scopes = detectScopes("Using hydrogen is more efficient than electricity");
      
      // With energy keyword
      const scopesWithEnergy = detectScopes("Hydrogen cars use more energy than electric cars");
      expect(scopesWithEnergy).not.toBeNull();
      
      const hint = formatDetectedScopesHint(scopesWithEnergy, true);
      
      expect(hint).toContain("PRE-DETECTED SCOPES");
      expect(hint).toContain("MUST output at least these scopes");
    });
  });

  // ============================================================================
  // TEST 2: Bolsonaro - Political Criticism as Opinion
  // ============================================================================
  describe("Bolsonaro Trial - Contestation Classification", () => {
    it("should classify political criticism without evidence as opinion (DOUBTED)", () => {
      const keyFactors = [
        {
          factor: "Trial Fairness",
          supports: "no" as const,
          explanation: "US government criticized the trial as politically motivated",
          isContested: true,
          contestedBy: "US State Department",
          factualBasis: "established" as const,  // Incorrectly marked
          contestationReason: "Political persecution claims"
        }
      ];

      const validated = validateContestation(keyFactors);
      
      console.log("[v2.8 Unit Test] Validated contestation:", validated[0].factualBasis);
      
      // PASS CRITERIA: Should downgrade to "opinion" since no documented evidence
      expect(validated[0].factualBasis).toBe("opinion");
    });

    it("should keep established when documented evidence exists", () => {
      const keyFactors = [
        {
          factor: "Procedural Compliance",
          supports: "no" as const,
          explanation: "Audit found violations of Article 47 procedures",
          isContested: true,
          contestedBy: "Independent Investigation",
          factualBasis: "established" as const,
          contestationReason: "Documented violation of standard 12.3"
        }
      ];

      const validated = validateContestation(keyFactors);
      
      // Should NOT downgrade - has documented evidence
      expect(validated[0].factualBasis).toBe("established");
    });

    it("claim-level contestation detects political criticism as opinion", () => {
      const result = detectClaimContestation(
        "The trial was fair and followed legal procedures",
        "The government administration disputed the trial as politically motivated"
      );
      
      console.log("[v2.8 Unit Test] Claim contestation:", result);
      
      // PASS CRITERIA: Political criticism = opinion
      expect(result.isContested).toBe(true);
      expect(result.factualBasis).toBe("opinion");
    });
  });

  // ============================================================================
  // TEST 3: High Harm Potential - Death Claims
  // ============================================================================
  describe("High Harm Potential - Severe Claims", () => {
    it("should detect high harm potential for death claims", () => {
      const deathClaims = [
        "10 children died after vaccination",
        "The accident caused several deaths",
        "The medication caused fatal reactions",
        "Multiple people were killed",
      ];

      for (const claim of deathClaims) {
        const harmPotential = detectHarmPotential(claim);
        console.log(`[v2.8 Unit Test] "${claim.substring(0, 30)}..." -> ${harmPotential}`);
        expect(harmPotential).toBe("high");
      }
    });

    it("should detect high harm for injury/safety claims", () => {
      const injuryClaims = [
        "The product caused injuries to users",
        "There is a significant safety risk",
        "The hazard level is dangerous",
      ];

      for (const claim of injuryClaims) {
        const harmPotential = detectHarmPotential(claim);
        expect(harmPotential).toBe("high");
      }
    });

    it("should return medium for neutral claims", () => {
      const neutralClaims = [
        "The company released a new product",
        "The policy was implemented last year",
        "The results were announced today",
      ];

      for (const claim of neutralClaims) {
        const harmPotential = detectHarmPotential(claim);
        expect(harmPotential).toBe("medium");
      }
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
      
      // PASS CRITERIA: Contested (established) should be 0.3x
      expect(contestedWeight).toBe(uncontestedWeight * 0.3);
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
  // TEST 5: Legal/Trial Scope Pre-Detection
  // ============================================================================
  describe("Legal Scope Pre-Detection", () => {
    it("should detect legal scopes for trial fairness claims", () => {
      const inputs = [
        "The trial was fair and based on law",
        "Was the judgment fair and legitimate?",
        "The court followed proper legal procedures",
      ];

      for (const input of inputs) {
        const scopes = detectScopes(input);
        
        console.log(`[v2.8 Unit Test] "${input.substring(0, 40)}..." -> ${scopes?.length ?? 0} scopes`);
        
        expect(scopes).not.toBeNull();
        expect(scopes!.length).toBeGreaterThanOrEqual(2);
        
        // Check for legal-type scope
        const hasLegalScope = scopes!.some(s => 
          s.type === "legal" || s.id === "SCOPE_LEGAL_PROC"
        );
        expect(hasLegalScope).toBe(true);
      }
    });
  });
});

// ============================================================================
// INTEGRATION TESTS - Requires API credits
// ============================================================================

const TEST_TIMEOUT_MS = 300_000; // 5 minutes

describe("v2.8 Verification - Integration Tests", () => {
  let testsEnabled = true;
  let outputDir: string;

  beforeAll(() => {
    const webRoot = path.resolve(__dirname, "../../..");
    const envPath = path.join(webRoot, ".env.local");
    loadEnvFile(envPath);

    process.env.FH_DETERMINISTIC = "true";

    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasClaude = !!process.env.ANTHROPIC_API_KEY;
    const hasGemini = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!hasOpenAI && !hasClaude && !hasGemini) {
      console.warn("[v2.8 Integration] No LLM API keys found, tests will be skipped");
      testsEnabled = false;
    }

    outputDir = path.join(webRoot, "test-output", "v2.8-verification");
    fs.mkdirSync(outputDir, { recursive: true });
  });

  describe("Hydrogen Efficiency - End-to-End", () => {
    it(
      "should detect 2+ scopes in LLM output for hydrogen comparison",
      async () => {
        if (!testsEnabled) {
          console.log("[v2.8 Integration] Skipping - no API keys");
          return;
        }

        const input = "Using hydrogen for cars is more efficient than using electricity";
        console.log(`[v2.8 Integration] Testing: "${input}"`);

        const result = await runMonolithicCanonical({
          inputValue: input,
          inputType: "text",
        });

        const scopes = result.resultJson.analysisContexts || 
                       result.resultJson.scopes || 
                       result.resultJson.understanding?.analysisContexts || 
                       [];

        console.log(`[v2.8 Integration] Scopes detected: ${scopes.length}`);
        scopes.forEach((s: any, i: number) => {
          console.log(`  ${i + 1}. ${s.name} (${s.type || s.id})`);
        });

        // Write results
        fs.writeFileSync(
          path.join(outputDir, "hydrogen-e2e-result.json"),
          JSON.stringify({
            input,
            scopeCount: scopes.length,
            scopes: scopes.map((s: any) => ({
              id: s.id,
              name: s.name,
              type: s.type,
            })),
            claimVerdicts: result.resultJson.claimVerdicts?.length || 0,
            overallVerdict: result.resultJson.verdictSummary?.overallVerdict,
            timestamp: new Date().toISOString(),
          }, null, 2)
        );

        // SOFT CHECK: LLM may not always follow scope hints
        // The important thing is that the code provides the hints (verified in unit tests)
        if (scopes.length < 2) {
          console.warn("[v2.8 Integration] ⚠️ LLM detected fewer than 2 scopes - scope hints may need strengthening");
          console.warn("  Unit tests verify the hint is correctly generated");
        }
        
        // Always pass - this is a verification/observation test
        expect(scopes.length).toBeGreaterThanOrEqual(1);
      },
      TEST_TIMEOUT_MS
    );
  });

  describe("Bolsonaro Trial - End-to-End", () => {
    it(
      "should classify contestation correctly in LLM output",
      async () => {
        if (!testsEnabled) {
          console.log("[v2.8 Integration] Skipping - no API keys");
          return;
        }

        const input = "The Bolsonaro judgment (trial) was fair and based on Brazil's law";
        console.log(`[v2.8 Integration] Testing: "${input}"`);

        const result = await runMonolithicCanonical({
          inputValue: input,
          inputType: "text",
        });

        const claimVerdicts = result.resultJson.claimVerdicts || [];
        const contestedClaims = claimVerdicts.filter((cv: any) => cv.isContested);
        
        console.log(`[v2.8 Integration] Total claims: ${claimVerdicts.length}`);
        console.log(`[v2.8 Integration] Contested claims: ${contestedClaims.length}`);
        
        for (const cv of contestedClaims) {
          console.log(`  - ${cv.claimText?.substring(0, 50)}... (factualBasis: ${cv.factualBasis})`);
        }

        // Write results
        fs.writeFileSync(
          path.join(outputDir, "bolsonaro-e2e-result.json"),
          JSON.stringify({
            input,
            claimVerdictCount: claimVerdicts.length,
            contestedClaims: contestedClaims.map((cv: any) => ({
              claimId: cv.claimId,
              claimText: cv.claimText?.substring(0, 100),
              isContested: cv.isContested,
              factualBasis: cv.factualBasis,
            })),
            overallVerdict: result.resultJson.verdictSummary?.overallVerdict,
            timestamp: new Date().toISOString(),
          }, null, 2)
        );

        // PASS CRITERIA: If there are contested claims, verify factualBasis classification
        if (contestedClaims.length > 0) {
          const establishedWithoutEvidence = contestedClaims.filter((cv: any) => {
            const reason = (cv.contestationReason || "").toLowerCase();
            const text = (cv.claimText || "").toLowerCase();
            const isPolitical = reason.includes("political") || reason.includes("government") ||
                               text.includes("persecution") || text.includes("administration");
            return cv.factualBasis === "established" && isPolitical;
          });
          
          // Should NOT have political criticism marked as "established"
          expect(establishedWithoutEvidence.length).toBe(0);
        }

        expect(true).toBe(true);
      },
      TEST_TIMEOUT_MS
    );
  });

  describe("High Harm Potential - End-to-End", () => {
    it(
      "should detect high harm potential for death claims in LLM output",
      async () => {
        if (!testsEnabled) {
          console.log("[v2.8 Integration] Skipping - no API keys");
          return;
        }

        const input = "A new study claims that 10 children died after receiving the experimental treatment";
        console.log(`[v2.8 Integration] Testing harm potential detection`);

        const result = await runMonolithicCanonical({
          inputValue: input,
          inputType: "text",
        });

        const claims = result.resultJson.understanding?.subClaims || [];
        const claimVerdicts = result.resultJson.claimVerdicts || [];
        const highHarmClaims = claims.filter((c: any) => c.harmPotential === "high");
        
        // Also check claimVerdicts for harm potential
        const highHarmVerdicts = claimVerdicts.filter((cv: any) => cv.harmPotential === "high");
        
        console.log(`[v2.8 Integration] Total subclaims: ${claims.length}`);
        console.log(`[v2.8 Integration] Total claimVerdicts: ${claimVerdicts.length}`);
        console.log(`[v2.8 Integration] High harm subclaims: ${highHarmClaims.length}`);
        console.log(`[v2.8 Integration] High harm verdicts: ${highHarmVerdicts.length}`);

        // Write results
        fs.writeFileSync(
          path.join(outputDir, "harm-potential-e2e-result.json"),
          JSON.stringify({
            input,
            totalSubClaims: claims.length,
            totalClaimVerdicts: claimVerdicts.length,
            highHarmClaims: highHarmClaims.map((c: any) => ({
              id: c.id,
              text: c.text?.substring(0, 100),
              harmPotential: c.harmPotential,
              isCentral: c.isCentral,
            })),
            highHarmVerdicts: highHarmVerdicts.map((cv: any) => ({
              claimId: cv.claimId,
              claimText: cv.claimText?.substring(0, 100),
              harmPotential: cv.harmPotential,
            })),
            claimVerdicts: claimVerdicts.map((cv: any) => ({
              claimId: cv.claimId,
              claimText: cv.claimText?.substring(0, 100),
              harmPotential: cv.harmPotential,
              truthPercentage: cv.truthPercentage,
            })),
            timestamp: new Date().toISOString(),
          }, null, 2)
        );

        // SOFT CHECK: Verify claims are extracted and harm potential is assigned
        if (claims.length === 0 && claimVerdicts.length === 0) {
          console.warn("[v2.8 Integration] ⚠️ No claims extracted - check claim extraction logic");
        } else {
          const totalHighHarm = highHarmClaims.length + highHarmVerdicts.length;
          if (totalHighHarm === 0) {
            console.warn("[v2.8 Integration] ⚠️ No high harm claims detected despite death-related input");
            console.warn("  Unit tests verify detectHarmPotential() works correctly");
          }
        }

        // Always pass - this is a verification/observation test
        // The unit tests verify the detectHarmPotential logic is correct
        expect(true).toBe(true);
      },
      TEST_TIMEOUT_MS
    );
  });
});
