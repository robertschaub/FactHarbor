// Offline tests: fixture summaries only.
// Run: node --test "scripts/validation/*.test.mjs"
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, "compare-batches.js");
const outputRoot = resolve(here, "../../test-output/validation");
const INPUT = "Entity A did X";

function summary(familyName, inputText, verdict = "MOSTLY-TRUE", truthPercentage = 75) {
  return {
    schemaVersion: "1.0.0",
    run: { familyName, inputText, inputType: "text", executedWebGitCommitHash: "abc1234", promptContentHash: "deadbeef" },
    article: { verdict, truthPercentage, confidence: 70 },
    claims: [],
    warnings: { total: 0, byType: {}, bySeverity: { error: 0, warning: 0, info: 0 } },
    acsResearchWaste: { zeroTargetedSelectedClaimCount: 0 },
  };
}

function compare(t, oldSummaries, newSummaries) {
  mkdirSync(outputRoot, { recursive: true });
  const root = mkdtempSync(join(outputRoot, "unit-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const dirs = [];
  for (const [side, summaries] of [["old", oldSummaries], ["new", newSummaries]]) {
    const dir = join(root, side);
    mkdirSync(dir);
    for (const s of summaries) writeFileSync(join(dir, `${s.run.familyName}.json`), JSON.stringify(s));
    dirs.push(dir);
  }
  const result = spawnSync(process.execPath, [script, ...dirs], { encoding: "utf8" });
  // The JSON summary is the last stderr line; anything Node prints before it is ignored.
  const json = JSON.parse(result.stderr.trim().split(/\r?\n/).pop());
  return { code: result.status, stdout: result.stdout, json };
}

test("pairs with byte-identical run.inputText are compared", (t) => {
  const { code, stdout, json } = compare(
    t,
    [summary("fam_a", INPUT, "MOSTLY-TRUE", 70)],
    [summary("fam_a", INPUT, "MOSTLY-TRUE", 80)],
  );
  assert.equal(code, 0, stdout);
  assert.match(stdout, /^\| fam_a \| MOSTLY-TRUE \(70\) \| MOSTLY-TRUE \(80\) \| \+10 \|/m);
  assert.doesNotMatch(stdout, /Not compared/);
  assert.equal(json.matched, 1);
  assert.deepEqual(json.inputMismatch, []);
});

test("pairs whose run.inputText differs or is missing are not compared", (t) => {
  const { code, stdout, json } = compare(
    t,
    ["fam_same", "fam_case", "fam_space", "fam_nbsp", "fam_missing"].map((name) => summary(name, INPUT)),
    [
      summary("fam_same", INPUT),
      summary("fam_case", "entity A did X", "FALSE", 5),
      summary("fam_space", `${INPUT} `, "FALSE", 5),
      summary("fam_nbsp", "Entity A did X", "FALSE", 5),
      summary("fam_missing", undefined, "FALSE", 5),
    ],
  );
  assert.equal(code, 2, stdout);
  assert.equal(json.matched, 1);
  assert.deepEqual(json.inputMismatch, ["fam_case", "fam_missing", "fam_nbsp", "fam_space"]);
  // Each refused pair would be a direction-flip regression; none may reach the table or the totals.
  assert.equal(json.regressions, 0);
  assert.equal(json.avgTpDelta, 0);
  assert.match(stdout, /^\| fam_same \|/m);
  for (const family of json.inputMismatch) {
    assert.doesNotMatch(stdout, new RegExp(`^\\| ${family} \\|`, "m"));
  }
  assert.ok(stdout.includes('- fam_nbsp: old=`"Entity A did X"` new=`"Entity A did\\u00a0X"`'), stdout);
  assert.ok(stdout.includes('- fam_space: old=`"Entity A did X"` new=`"Entity A did X "`'), stdout);
  assert.ok(stdout.includes('- fam_missing: old=`"Entity A did X"` new=(missing)'), stdout);
  assert.match(stdout, /Not compared \(input differs\): 4/);
});
