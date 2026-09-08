#!/usr/bin/env node
// Read-only, repository-local checker. No frontmatter/body exceptions are allowed;
// CRLF/LF is normalized. Codex-only agents/openai.yaml files are separate metadata.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const names = [
  "audit", "debt-guard", "debate", "debug", "doc-guard", "docs-update",
  "explain-code", "handoff", "pipeline", "prompt-audit", "prompt-diagnosis",
  "report-review", "validate", "wip-update",
];
const sensitive = new Set(["validate", "report-review"]);
const failures = [];

function read(relativePath) {
  try {
    return readFileSync(resolve(root, relativePath), "utf8").replace(/\r\n/g, "\n");
  } catch (error) {
    failures.push(`${relativePath}: ${error.code ?? error.message}`);
    return null;
  }
}

for (const name of names) {
  const canonicalPath = `.claude/skills/${name}/SKILL.md`;
  const mirrorPath = `.agents/skills/${name}/SKILL.md`;
  const canonical = read(canonicalPath);
  const mirror = read(mirrorPath);
  if (canonical !== null && mirror !== null && canonical !== mirror) {
    failures.push(`${name}: shared body/frontmatter drift`);
  }
  for (const [path, content] of [[canonicalPath, canonical], [mirrorPath, mirror]]) {
    if (content === null) continue;
    const frontmatter = content.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)?.[1];
    if (!frontmatter || !new RegExp(`^name: ${name}$`, "m").test(frontmatter)
        || !/^description:\s*\S/m.test(frontmatter)) {
      failures.push(`${path}: missing/invalid name or description frontmatter`);
    }
    if (sensitive.has(name)) {
      const flags = frontmatter?.split("\n").filter((line) => /^disable-model-invocation:/.test(line)) ?? [];
      if (flags.length !== 1 || flags[0] !== "disable-model-invocation: true") {
        failures.push(`${path}: explicit Claude invocation flag required`);
      }
    }
  }
  if (sensitive.has(name)) {
    const path = `.agents/skills/${name}/agents/openai.yaml`;
    const metadata = read(path);
    if (metadata === null) continue;
    // This plan permits only the small declared metadata shape below. Reject
    // duplicate/extra fields instead of pretending to parse arbitrary YAML.
    if (!/^interface:\n  display_name: "[^"\n]+"\n  short_description: "[^"\n]{25,64}"\npolicy:\n  allow_implicit_invocation: false\n$/.test(metadata)) {
      failures.push(`${path}: expected quoted interface fields and explicit-only Codex policy`);
    }
  }
}

if (failures.length) {
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
} else {
  console.log(`PASS: ${names.length} skill pairs and both sensitive-skill policies. Gemini/Cline session controls are not checked.`);
}
