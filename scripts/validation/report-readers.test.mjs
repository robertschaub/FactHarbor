// Offline structural fixtures only. No live API, provider, database or analysis execution.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { extractEvidenceReadModel, analyzeJobFiles } from '../measure-evidence-quality.ts';

const { extractSummary, buildSummaryReadModel, getResultSchemaKind } = createRequire(import.meta.url)('./extract-validation-summary.js');
const family = {familyName:'offline', inputType:'text', inputValue:'Using hydrogen for cars is more efficient than using electricity'};
const evidence = {id:'e1', sourceId:'s1', statement:'', category:'direct_evidence', probativeValue:'high'};
const flat = { _schemaVersion:'3.2.0-cb', meta:{pipeline:'claimboundary', promptContentHash:'prompt-pin'}, truthPercentage:60, verdict:'LEANING-TRUE', confidence:70, claimVerdicts:[{claimId:'c1', truthPercentage:60}], understanding:{atomicClaims:[{id:'c1', claim:'original', text:'alternate'}]}, evidenceItems:[evidence], sources:[{id:'s1'}], analysisWarnings:[{type:'fixture', severity:'warning', message:''}], qualityGates:{gate1Stats:{totalClaims:1}}, analysisObservability:{acsResearchWaste:{selectedClaimResearchCoverage:[{claimId:'c1', zeroTargetedMainResearch:true}]}} };

test('current flat records keep evidence, statement preference and provenance', () => {
  const actual = extractSummary(family, {jobId:'offline', executedWebGitCommitHash:'commit-pin', resultJson:flat});
  assert.equal(actual.claims[0].statement, 'original');
  assert.equal(actual.run.executedWebGitCommitHash, 'commit-pin');
  assert.equal(actual.run.promptHash, 'prompt-pin');
  assert.deepEqual(extractEvidenceReadModel({resultJson:flat}), {evidenceItems:[evidence], sourceIds:['s1']});
  assert.deepEqual(extractEvidenceReadModel({resultJson:JSON.stringify(flat)}), {evidenceItems:[evidence], sourceIds:['s1']});
  assert.equal(getResultSchemaKind(flat), 'legacy-v1');
});

test('unversioned summaries remain supported and unknown is not an error', () => {
  const result = {truthPercentage:50, claimVerdicts:[], analysisWarnings:[]};
  assert.equal(getResultSchemaKind(result), 'unknown');
  assert.equal(buildSummaryReadModel(result).article.truthPercentage, 50);
  assert.deepEqual(extractSummary(family, {resultJson:result}).claims, []);
});

test('flat historical arrays and parsed unversioned payloads remain usable', () => {
  for (const payload of [{facts:[evidence]}, {evidenceItems:[evidence]}]) {
    assert.deepEqual(extractEvidenceReadModel(payload).evidenceItems, [evidence]);
    assert.deepEqual(extractEvidenceReadModel({resultJson:payload}).evidenceItems, [evidence]);
    assert.deepEqual(extractEvidenceReadModel({resultJson:JSON.stringify(payload)}).evidenceItems, [evidence]);
  }
  assert.deepEqual(extractEvidenceReadModel({facts:[], evidenceItems:[evidence]}).evidenceItems, []);
  assert.deepEqual(extractEvidenceReadModel({evidenceItems:[], sources:[]}), {evidenceItems:[], sourceIds:[]});
});

for (const payload of [42, [], 'text', {}, {evidenceItems:{}}, {evidenceItems:[null]}, {evidenceItems:[], sources:{}}, {_schemaVersion:'99.0.0', evidenceItems:[]}, {evidence:{evidenceItems:[]}}, {...flat, verdict:{label:'TRUE'}}, {...flat, evidence:{evidenceItems:[]}}, {...flat, sources:{items:[]}}]) {
  test(`measurement rejects unsupported shape ${JSON.stringify(payload).slice(0, 70)}`, () => {
    assert.throws(() => extractEvidenceReadModel({resultJson:payload}), /Unsupported report format|Unexpected token/);
  });
}

for (const payload of [42, [], 'text', {}, {claimVerdicts:{}}, {claimVerdicts:[null]}, {truthPercentage:50, understanding:{atomicClaims:{}}}, {truthPercentage:50, analysisWarnings:[null]}, {_schemaVersion:'99.0.0'}, {...flat, verdict:{label:'TRUE'}}, {...flat, evidence:{evidenceItems:[]}}, {...flat, sources:{items:[]}}, {...flat, qualityGates:[]}]) {
  test(`summary rejects unsupported shape ${JSON.stringify(payload).slice(0, 70)}`, () => {
    assert.throws(() => extractSummary(family, {resultJson:payload}), /Unsupported report format|Unexpected token/);
  });
}

test('malformed embedded JSON cannot fall back to outer evidence', () => {
  assert.throws(() => extractEvidenceReadModel({resultJson:'{', facts:[evidence]}), SyntaxError);
  assert.throws(() => extractSummary(family, {resultJson:'{'}), SyntaxError);
  assert.throws(() => extractEvidenceReadModel({resultJson:'null', facts:[evidence]}), /Unsupported report format/);
  assert.equal(extractSummary(family, {}), null);
});

test('a rejected file prevents a partial measurement report', () => {
  const folder = mkdtempSync(join(tmpdir(), 'fh-reader-test-'));
  try {
    writeFileSync(join(folder, 'a.json'), JSON.stringify({evidenceItems:[evidence]}));
    writeFileSync(join(folder, 'b.json'), '{');
    assert.throws(() => analyzeJobFiles(folder), /Failed to read b.json/);
  } finally {
    unlinkSync(join(folder, 'a.json'));
    unlinkSync(join(folder, 'b.json'));
    rmdirSync(folder);
  }
});

test('every schema declaration is checked and a tag alone is not a report', () => {
  for (const result of [{_schemaVersion:'3.2.0-cb'}, {...flat, meta:{schemaVersion:'99.0.0'}}, {...flat, meta:{schemaVersion:'3.0.0'}}]) {
    assert.throws(() => extractEvidenceReadModel({resultJson:result}), /Unsupported report format/);
    assert.throws(() => extractSummary(family, {resultJson:result}), /Unsupported report format/);
  }
});

test('summary rejects malformed consumed numbers and research collections', () => {
  for (const result of [{truthPercentage:{}, confidence:[]}, {...flat, claimVerdicts:[{truthPercentage:'50'}]}, {...flat, analysisObservability:{acsResearchWaste:{selectedClaimResearch:{}}}}]) {
    assert.throws(() => extractSummary(family, {resultJson:result}), /Unsupported report format/);
  }
});

test('summary preserves populated quality gates, warnings and research waste', () => {
  const result = {...flat, qualityGates:{gate1Stats:{total:2, passed:1, filtered:1}, gate4Stats:{total:1, highConfidence:0, mediumConfidence:1, lowConfidence:0, insufficient:0}, summary:{totalEvidenceItems:3, totalSources:2, searchesPerformed:4}}, analysisObservability:{acsResearchWaste:{selectedClaimResearchCoverage:[{claimId:'c1', zeroTargetedMainResearch:true}], selectedClaimResearch:[{claimId:'c1', searches:0}]}}};
  const actual = extractSummary(family, {resultJson:result});
  assert.deepEqual(actual.qualityGates, {gate1:{total:2, passed:1, filtered:1}, gate4:{total:1, highConfidence:0, mediumConfidence:1, lowConfidence:0, insufficient:0}, summary:{totalEvidenceItems:3, totalSources:2, searchesPerformed:4}});
  assert.deepEqual(actual.warnings, {total:1, byType:{fixture:1}, bySeverity:{error:0, warning:1, info:0}});
  assert.deepEqual(actual.acsResearchWaste, {selectedClaimResearchCoverage:[{claimId:'c1', zeroTargetedMainResearch:true}], selectedClaimResearch:[{claimId:'c1', searches:0}], zeroTargetedSelectedClaimCount:1, zeroTargetedSelectedClaimIds:['c1']});
});
