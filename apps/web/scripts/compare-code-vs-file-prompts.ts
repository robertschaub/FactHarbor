/**
 * Comparison Test: Code (Heuristic) vs File Prompts (LLM)
 *
 * This script compares:
 * a) Heuristic service results (code-based logic, no prompts)
 * b) LLM service with prompts loaded from files
 *
 * Run: npx tsx scripts/compare-code-vs-file-prompts.ts
 */

import { HeuristicTextAnalysisService } from "../src/lib/analyzer/text-analysis-heuristic";
import { loadPromptConfig } from "../src/lib/config-loader";
import { createHash } from "crypto";

// ============================================================================
// TEST CASES
// ============================================================================

const TEST_CASES = {
  inputClassification: [
    {
      name: "Comparative claim",
      input: { inputText: "Electric vehicles are better than gas cars for the environment", pipeline: "text-analysis" },
      expected: { isComparative: true, isCompound: false },
    },
    {
      name: "Compound claim",
      input: { inputText: "The economy grew by 3% and unemployment fell to 4%", pipeline: "text-analysis" },
      expected: { isComparative: false, isCompound: true },
    },
    {
      name: "Simple factual",
      input: { inputText: "Biden won the 2020 presidential election", pipeline: "text-analysis" },
      expected: { isComparative: false, isCompound: false, claimType: "factual" },
    },
    {
      name: "Predictive claim",
      input: { inputText: "Inflation will rise next year due to monetary policy", pipeline: "text-analysis" },
      expected: { claimType: "predictive" },
    },
  ],
  evidenceQuality: [
    {
      name: "High quality evidence",
      input: {
        evidenceItems: [{
          evidenceId: "e1",
          statement: "According to the EPA 2024 report, EV emissions are 60% lower over lifecycle",
          excerpt: "The EPA comprehensive lifecycle analysis found that electric vehicles produce 60% fewer emissions compared to gasoline vehicles when accounting for manufacturing, operation, and disposal.",
          sourceUrl: "https://epa.gov/reports/ev-lifecycle-2024",
          category: "statistics",
        }],
        thesisText: "Electric vehicles are environmentally superior",
      },
      expected: { e1: "high" },
    },
    {
      name: "Low quality - vague attribution",
      input: {
        evidenceItems: [{
          evidenceId: "e2",
          statement: "Some experts say EVs are better but many believe otherwise",
          excerpt: "People have different opinions about this topic",
          sourceUrl: "https://example.com",
        }],
        thesisText: "Electric vehicles are environmentally superior",
      },
      expected: { e2: "low" },
    },
    {
      name: "Filter - too short",
      input: {
        evidenceItems: [{
          evidenceId: "e3",
          statement: "EVs are good",
          excerpt: "Short",
        }],
        thesisText: "Electric vehicles are environmentally superior",
      },
      expected: { e3: "filter" },
    },
  ],
  verdictValidation: [
    {
      name: "No inversion - consistent",
      input: {
        thesis: "Electric vehicles are better for the environment",
        claimVerdicts: [{
          claimId: "c1",
          claimText: "EVs produce zero tailpipe emissions",
          verdictPct: 92,
          reasoning: "Strong evidence confirms EVs have no direct exhaust emissions during operation",
        }],
        mode: "full" as const,
      },
      expected: { c1: { isInverted: false } },
    },
    {
      name: "Inversion detected - reasoning contradicts verdict",
      input: {
        thesis: "Electric vehicles are better for the environment",
        claimVerdicts: [{
          claimId: "c2",
          claimText: "EVs are worse for the environment overall",
          verdictPct: 85,
          reasoning: "Evidence shows this claim is false - multiple studies contradict it",
        }],
        mode: "full" as const,
      },
      expected: { c2: { isInverted: true, suggestedCorrection: 15 } },
    },
    {
      name: "High harm potential",
      input: {
        thesis: "The medication is safe",
        claimVerdicts: [{
          claimId: "c3",
          claimText: "The medication can cause death in rare cases",
          verdictPct: 70,
          reasoning: "FDA data shows rare fatalities reported",
        }],
        mode: "full" as const,
      },
      expected: { c3: { harmPotential: "high" } },
    },
  ],
  contextSimilarity: [
    {
      name: "Similar contexts - should merge",
      input: {
        contextPairs: [{
          contextA: "US EPA vehicle emissions standards",
          contextB: "United States Environmental Protection Agency emissions regulations",
        }],
        contextList: ["regulatory", "environmental"],
      },
      expected: { shouldMerge: true },
    },
    {
      name: "Different contexts - should not merge",
      input: {
        contextPairs: [{
          contextA: "Manufacturing phase emissions",
          contextB: "Vehicle operation emissions",
        }],
        contextList: ["lifecycle", "emissions"],
      },
      expected: { shouldMerge: false },
    },
  ],
};

// ============================================================================
// COMPARISON FUNCTIONS
// ============================================================================

async function loadAndRenderPrompt(
  profileKey: string,
  variables: Record<string, string>
): Promise<{ prompt: string; promptHash: string } | null> {
  const config = await loadPromptConfig(profileKey);
  if (!config) return null;

  let prompt = config.content;

  // Substitute variables
  for (const [key, value] of Object.entries(variables)) {
    if (key === "PROMPT_HASH") continue;
    const pattern = new RegExp(`\\$\\{${key}\\}`, "g");
    prompt = prompt.replace(pattern, value);
  }

  // Calculate and substitute prompt hash
  const promptHash = createHash("sha256").update(prompt).digest("hex").substring(0, 8);
  prompt = prompt.replace(/\$\{PROMPT_HASH\}/g, promptHash);

  return { prompt, promptHash };
}

function checkExpectation(actual: any, expected: any, path: string = ""): string[] {
  const issues: string[] = [];

  for (const [key, expectedValue] of Object.entries(expected)) {
    const actualValue = actual[key];
    const fullPath = path ? `${path}.${key}` : key;

    if (typeof expectedValue === "object" && expectedValue !== null) {
      issues.push(...checkExpectation(actualValue, expectedValue, fullPath));
    } else if (actualValue !== expectedValue) {
      issues.push(`${fullPath}: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`);
    }
  }

  return issues;
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function main() {
  console.log("=".repeat(80));
  console.log("COMPARISON: CODE (Heuristic) vs FILE PROMPTS (LLM)");
  console.log("=".repeat(80));

  const heuristic = new HeuristicTextAnalysisService();

  let totalTests = 0;
  let passedTests = 0;
  const failures: string[] = [];

  // -------------------------------------------------------------------------
  // Test 1: Input Classification
  // -------------------------------------------------------------------------
  console.log("\n" + "=".repeat(80));
  console.log("1. INPUT CLASSIFICATION");
  console.log("=".repeat(80));

  for (const testCase of TEST_CASES.inputClassification) {
    totalTests++;
    console.log(`\n[TEST] ${testCase.name}`);
    console.log(`  Input: "${testCase.input.inputText.substring(0, 50)}..."`);

    // Run heuristic
    const heuristicResult = await heuristic.classifyInput(testCase.input);
    console.log(`  Heuristic: isComparative=${heuristicResult.isComparative}, isCompound=${heuristicResult.isCompound}, claimType=${heuristicResult.claimType}`);

    // Check expectations
    const issues = checkExpectation(heuristicResult, testCase.expected);
    if (issues.length === 0) {
      console.log(`  ✓ PASS`);
      passedTests++;
    } else {
      console.log(`  ✗ FAIL: ${issues.join(", ")}`);
      failures.push(`Input Classification - ${testCase.name}: ${issues.join(", ")}`);
    }
  }

  // Show what LLM prompt looks like
  const inputPromptData = await loadAndRenderPrompt("text-analysis-input", {
    INPUT_TEXT: TEST_CASES.inputClassification[0].input.inputText,
    PIPELINE: "text-analysis",
    PROMPT_HASH: "",
  });
  if (inputPromptData) {
    console.log(`\n  [PROMPT] text-analysis-input loaded (${inputPromptData.prompt.length} chars)`);
    console.log(`  [PROMPT] Hash: ${inputPromptData.promptHash}`);
  }

  // -------------------------------------------------------------------------
  // Test 2: Evidence Quality
  // -------------------------------------------------------------------------
  console.log("\n" + "=".repeat(80));
  console.log("2. EVIDENCE QUALITY ASSESSMENT");
  console.log("=".repeat(80));

  for (const testCase of TEST_CASES.evidenceQuality) {
    totalTests++;
    console.log(`\n[TEST] ${testCase.name}`);

    // Run heuristic
    const heuristicResult = await heuristic.assessEvidenceQuality(testCase.input);

    for (const result of heuristicResult) {
      console.log(`  ${result.evidenceId}: ${result.qualityAssessment} (issues: ${result.issues.join(", ") || "none"})`);

      // Check expectations
      const expectedQuality = (testCase.expected as any)[result.evidenceId];
      if (expectedQuality && result.qualityAssessment === expectedQuality) {
        console.log(`  ✓ PASS`);
        passedTests++;
      } else if (expectedQuality) {
        console.log(`  ✗ FAIL: expected ${expectedQuality}, got ${result.qualityAssessment}`);
        failures.push(`Evidence Quality - ${testCase.name}: expected ${expectedQuality}, got ${result.qualityAssessment}`);
      } else {
        passedTests++; // No specific expectation
      }
    }
  }

  // Show what LLM prompt looks like
  const evidencePromptData = await loadAndRenderPrompt("text-analysis-evidence", {
    EVIDENCE_ITEMS: JSON.stringify(TEST_CASES.evidenceQuality[0].input.evidenceItems, null, 2),
    THESIS_TEXT: TEST_CASES.evidenceQuality[0].input.thesisText,
    PROMPT_HASH: "",
  });
  if (evidencePromptData) {
    console.log(`\n  [PROMPT] text-analysis-evidence loaded (${evidencePromptData.prompt.length} chars)`);
    console.log(`  [PROMPT] Hash: ${evidencePromptData.promptHash}`);
  }

  // -------------------------------------------------------------------------
  // Test 3: Verdict Validation
  // -------------------------------------------------------------------------
  console.log("\n" + "=".repeat(80));
  console.log("3. VERDICT VALIDATION");
  console.log("=".repeat(80));

  for (const testCase of TEST_CASES.verdictValidation) {
    totalTests++;
    console.log(`\n[TEST] ${testCase.name}`);

    // Run heuristic
    const heuristicResult = await heuristic.validateVerdicts(testCase.input);

    for (const result of heuristicResult) {
      console.log(`  ${result.claimId}:`);
      console.log(`    isInverted: ${result.isInverted}`);
      console.log(`    suggestedCorrection: ${result.suggestedCorrection}`);
      console.log(`    harmPotential: ${result.harmPotential}`);
      console.log(`    isCounterClaim: ${result.isCounterClaim} (should be undefined)`);

      // Check expectations
      const expected = (testCase.expected as any)[result.claimId];
      if (expected) {
        const issues = checkExpectation(result, expected);
        if (issues.length === 0) {
          console.log(`  ✓ PASS`);
          passedTests++;
        } else {
          console.log(`  ✗ FAIL: ${issues.join(", ")}`);
          failures.push(`Verdict Validation - ${testCase.name}: ${issues.join(", ")}`);
        }
      }
    }
  }

  // Show what LLM prompt looks like
  const verdictPromptData = await loadAndRenderPrompt("text-analysis-verdict", {
    THESIS_TEXT: TEST_CASES.verdictValidation[0].input.thesis,
    CLAIM_VERDICTS: JSON.stringify(TEST_CASES.verdictValidation[0].input.claimVerdicts, null, 2),
    EVIDENCE_SUMMARY: "",
    MODE: "full",
    PROMPT_HASH: "",
  });
  if (verdictPromptData) {
    console.log(`\n  [PROMPT] text-analysis-verdict loaded (${verdictPromptData.prompt.length} chars)`);
    console.log(`  [PROMPT] Hash: ${verdictPromptData.promptHash}`);

    // Check that isCounterClaim is NOT in the prompt output format
    if (verdictPromptData.prompt.includes('"isCounterClaim"')) {
      console.log(`  ⚠️ WARNING: Prompt still contains isCounterClaim in output format!`);
      failures.push("Verdict prompt still contains isCounterClaim");
    } else {
      console.log(`  ✓ Prompt correctly omits isCounterClaim field`);
    }
  }

  // -------------------------------------------------------------------------
  // Test 4: Context Similarity
  // -------------------------------------------------------------------------
  console.log("\n" + "=".repeat(80));
  console.log("4. CONTEXT SIMILARITY");
  console.log("=".repeat(80));

  for (const testCase of TEST_CASES.contextSimilarity) {
    totalTests++;
    console.log(`\n[TEST] ${testCase.name}`);
    console.log(`  ContextA: "${testCase.input.contextPairs[0].contextA}"`);
    console.log(`  ContextB: "${testCase.input.contextPairs[0].contextB}"`);

    // Run heuristic
    const heuristicResult = await heuristic.analyzeContextSimilarity(testCase.input);

    for (const result of heuristicResult) {
      console.log(`  Similarity: ${(result.similarity * 100).toFixed(1)}%`);
      console.log(`  shouldMerge: ${result.shouldMerge}`);
      console.log(`  phaseBucketA: ${result.phaseBucketA}, phaseBucketB: ${result.phaseBucketB}`);

      // Check expectations
      if (result.shouldMerge === testCase.expected.shouldMerge) {
        console.log(`  ✓ PASS`);
        passedTests++;
      } else {
        console.log(`  ✗ FAIL: expected shouldMerge=${testCase.expected.shouldMerge}, got ${result.shouldMerge}`);
        failures.push(`Context Similarity - ${testCase.name}: expected shouldMerge=${testCase.expected.shouldMerge}, got ${result.shouldMerge}`);
      }
    }
  }

  // Show what LLM prompt looks like
  const contextPromptData = await loadAndRenderPrompt("text-analysis-context", {
    CONTEXT_PAIRS: JSON.stringify(TEST_CASES.contextSimilarity[0].input.contextPairs, null, 2),
    CONTEXT_LIST: JSON.stringify(TEST_CASES.contextSimilarity[0].input.contextList),
    PROMPT_HASH: "",
  });
  if (contextPromptData) {
    console.log(`\n  [PROMPT] text-analysis-context loaded (${contextPromptData.prompt.length} chars)`);
    console.log(`  [PROMPT] Hash: ${contextPromptData.promptHash}`);
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log("\n" + "=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));
  console.log(`\nTotal tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failures.length}`);

  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const failure of failures) {
      console.log(`  - ${failure}`);
    }
  }

  // -------------------------------------------------------------------------
  // Key Differences: Code vs File Prompts
  // -------------------------------------------------------------------------
  console.log("\n" + "=".repeat(80));
  console.log("KEY DIFFERENCES: CODE (Heuristic) vs FILE PROMPTS (LLM)");
  console.log("=".repeat(80));
  console.log(`
┌─────────────────────┬───────────────────────────────┬───────────────────────────────┐
│ Feature             │ Heuristic (Code)              │ LLM (File Prompts)            │
├─────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ isComparative       │ Regex: "than" + comparatives  │ Semantic understanding        │
│ isCompound          │ Regex: semicolons, "and"      │ Semantic understanding        │
│ claimType           │ Keyword matching              │ Semantic classification       │
│ evidenceQuality     │ Rule-based (length, URL)      │ Semantic assessment           │
│ isInverted          │ Keyword search in reasoning   │ Semantic contradiction check  │
│ isCounterClaim      │ ❌ UNDEFINED (handled earlier) │ ❌ REMOVED from prompt        │
│ harmPotential       │ Keyword matching              │ Semantic risk assessment      │
│ contextSimilarity     │ Jaccard word similarity       │ Semantic similarity           │
└─────────────────────┴───────────────────────────────┴───────────────────────────────┘

IMPORTANT: isCounterClaim is now correctly:
- Heuristic: Returns undefined (doesn't override earlier detection)
- LLM Prompt: Removed from output format (v1.1.0)

This ensures counter-claim detection from the understand phase (with full context)
is NOT overridden by the verdict validation phase (with limited context).
`);

  return failures.length === 0 ? 0 : 1;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
