const assert = require("node:assert/strict");
const { transformResultJson } = require("./migrate-terminology-v2.7");

function runTests() {
  const input = {
    distinctProceedings: [{ id: "CTX_A" }],
    understanding: { proceedingContext: "Narrative frame" },
    verdicts: [{ proceedingId: "CTX_A", proceedingName: "Context A" }],
    facts: [{ id: "F1", relatedProceedingId: "CTX_A" }],
    claims: [{ id: "C1", relatedProceedingId: "CTX_A" }]
  };

  const { result, changed } = transformResultJson(input);

  assert.equal(changed, true);
  assert.ok(Array.isArray(result.analysisContexts));
  assert.equal((result as any).analysisContexts[0].id, "CTX_A");
  assert.equal((result as any).understanding.analysisContext, "Narrative frame");
  assert.equal((result as any).verdicts[0].contextId, "CTX_A");
  assert.equal((result as any).verdicts[0].contextName, "Context A");
  assert.equal((result as any).facts[0].contextId, "CTX_A");
  assert.equal((result as any).claims[0].contextId, "CTX_A");
  assert.equal((result as any).distinctProceedings, undefined);
  assert.equal((result as any).understanding.proceedingContext, undefined);

  const noChange = { verdicts: [{ contextId: "CTX_A" }] };
  const noChangeResult = transformResultJson(noChange);
  assert.equal(noChangeResult.changed, false);
}

try {
  runTests();
  console.log("Migration transform tests passed.");
} catch (error) {
  console.error("Migration transform tests failed:", error);
  process.exit(1);
}
