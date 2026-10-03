import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, writeFileSync, renameSync, symlinkSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

test('role and skill metadata and fingerprints exclude untracked, ignored and redirected sources', async () => {
  const parent=realpathSync(tmpdir());
  const root=mkdtempSync(join(parent,'fh-agent-sources-'));
  const write=(relative,content)=>{const p=join(root,relative);mkdirSync(resolve(p,'..'),{recursive:true});writeFileSync(p,content);};
  try {
    cpSync(fileURLToPath(new URL('../src/',import.meta.url)),join(root,'packages/fh-agent-knowledge/src'),{recursive:true});
    execFileSync('git',['init','-q'],{cwd:root});
    write('.gitignore','Docs/AGENTS/Roles/ignored.md\n.claude/skills/ignored/\n');
    const learning='# Role learnings\n\n## Approved role\n\n### Public lesson\n**Learning:** Approved lesson.\n';
    write('Docs/AGENTS/Role_Learnings.md',learning);
    write('Docs/AGENTS/Roles/approved.md','# Approved role\n**Mission:** Public role.\n');
    write('.claude/skills/approved/SKILL.md','---\nname: approved\n---\n# Public skill\n');
    write('apps/web/src/lib/analyzer/claimboundary-pipeline.ts','// Fixture\n');
    execFileSync('git',['add','.gitignore','Docs/AGENTS/Role_Learnings.md','Docs/AGENTS/Roles/approved.md','.claude/skills/approved/SKILL.md'],{cwd:root});
    const module=(name)=>import(pathToFileURL(join(root,'packages/fh-agent-knowledge/src',name)).href);
    const {loadRoleEntries}=await module('sources/roles.mjs');
    const {loadSkillEntries}=await module('sources/skills.mjs');
    const {readCurrentSourceSnapshot}=await module('cache/manifest.mjs');
    const indexes={handoffIndex:{},stageMap:{},stageManifest:{}};
    const before=readCurrentSourceSnapshot(indexes).sources;
    for(const name of ['untracked','ignored']) {
      write(`Docs/AGENTS/Roles/${name}.md`,`# ${name} role\n**Mission:** Local canary.\n`);
      write(`.claude/skills/${name}/SKILL.md`,`---\nname: ${name}\n---\n# Local canary\n`);
    }
    assert.deepEqual(loadRoleEntries().map(r=>r.canonicalName),['Approved role']);
    assert.equal(loadRoleEntries()[0].learnings[0].summary,'Approved lesson.');
    assert.deepEqual(loadSkillEntries().map(s=>s.name),['approved']);
    const after=readCurrentSourceSnapshot(indexes).sources;
    assert.equal(after.rolesDigest,before.rolesDigest);
    assert.equal(after.skillsDigest,before.skillsDigest);
    execFileSync('git',['rm','--cached','Docs/AGENTS/Role_Learnings.md'],{cwd:root});
    write('Docs/AGENTS/Role_Learnings.md',learning.replace('Approved lesson.','Untracked canary.'));
    assert.deepEqual(loadRoleEntries()[0].learnings,[]);
    assert.equal(readCurrentSourceSnapshot(indexes).sources.roleLearningsMtime,null);
    execFileSync('git',['add','Docs/AGENTS/Role_Learnings.md'],{cwd:root});
    // A tracked name redirected to another directory must not expose that target.
    write('Local/skill/SKILL.md','---\nname: redirected-canary\n---\n# Local canary\n');
    renameSync(join(root,'.claude/skills/approved'),join(root,'.claude/skills/original'));
    symlinkSync(join(root,'Local/skill'),join(root,'.claude/skills/approved'),process.platform==='win32'?'junction':'dir');
    assert.deepEqual(loadSkillEntries(),[]);
    renameSync(join(root,'Docs/AGENTS/Roles'),join(root,'Docs/AGENTS/OriginalRoles'));
    write('Local/roles/approved.md','# Redirected role\n**Mission:** Local canary.\n');
    symlinkSync(join(root,'Local/roles'),join(root,'Docs/AGENTS/Roles'),process.platform==='win32'?'junction':'dir');
    assert.deepEqual(loadRoleEntries(),[]);
    const redirected=readCurrentSourceSnapshot(indexes).sources;
    assert.equal(redirected.rolesDigest,null);
    assert.equal(redirected.skillsDigest,null);
    renameSync(join(root,'Docs/AGENTS'),join(root,'Docs/OriginalAgents'));
    write('Local/agents/Role_Learnings.md',learning.replace('Approved lesson.','Redirected canary.'));
    symlinkSync(join(root,'Local/agents'),join(root,'Docs/AGENTS'),process.platform==='win32'?'junction':'dir');
    assert.equal(readCurrentSourceSnapshot(indexes).sources.roleLearningsMtime,null);
  } finally {
    assert.equal(realpathSync(root),root);
    assert.ok(root.startsWith(parent+sep));
    rmSync(root,{recursive:true,force:true});
  }
});
