import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, renameSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { extractSections } from '../src/utils/sections.mjs';
import { listTrackedFiles } from '../src/utils/fs.mjs';
import { buildDocSectionIndex, readAllowedDocSection } from '../src/sources/docs.mjs';

test('Markdown headings inside literal examples are not document sections', () => {
  const source='# Guide\n\n```markdown\n# Example title\n## Example section\n```\n\n<a id="details"></a>\n## Details\n\n~~~text\n# Another example\n~~~\n';
  assert.deepEqual(extractSections(source).map(section=>section.heading),['Guide','Details']);
});

test('untracked and ignored local notes never enter tracked publication inputs', () => {
  const root=mkdtempSync(join(tmpdir(),'fh-public-inputs-'));
  try {
    execFileSync('git',['init','-q'],{cwd:root});
    mkdirSync(join(root,'Docs'));
    writeFileSync(join(root,'.gitignore'),'Docs/local.md\n');
    writeFileSync(join(root,'Docs/approved.md'),'# Approved\n');
    writeFileSync(join(root,'Docs/draft.md'),'# Untracked\n');
    writeFileSync(join(root,'Docs/local.md'),'# Local\n');
    execFileSync('git',['add','.gitignore','Docs/approved.md'],{cwd:root});
    assert.deepEqual(listTrackedFiles(root).sort(),['.gitignore','Docs/approved.md']);
  } finally {
    rmSync(root,{recursive:true,force:true});
  }
});

test('public Markdown architecture and method summaries remain readable', () => {
  const index=buildDocSectionIndex();
  assert.ok(index.some(doc=>doc.file==='Docs/site/product-development/specification/architecture/index.md'));
  const result=readAllowedDocSection('Docs/site/prompt-architecture.md','Prompt management');
  assert.ok(result.text.length>30);
  assert.throws(()=>readAllowedDocSection('../outside.md','Anything'),/allowlisted/);
  assert.throws(()=>readAllowedDocSection('Docs/local.md','Anything'),/allowlisted/);
});

test('tracked names cannot admit a linked directory containing local notes', () => {
  const root=mkdtempSync(join(tmpdir(),'fh-linked-input-'));
  try {
    execFileSync('git',['init','-q'],{cwd:root});
    mkdirSync(join(root,'Docs')); mkdirSync(join(root,'Local'));
    writeFileSync(join(root,'Docs/approved.md'),'# Public\n');
    writeFileSync(join(root,'Local/approved.md'),'# Local note\n');
    execFileSync('git',['add','Docs/approved.md'],{cwd:root});
    renameSync(join(root,'Docs'),join(root,'Original'));
    symlinkSync(join(root,'Local'),join(root,'Docs'),process.platform==='win32'?'junction':'dir');
    assert.deepEqual(listTrackedFiles(root),[]);
  } finally { rmSync(root,{recursive:true,force:true}); }
});
