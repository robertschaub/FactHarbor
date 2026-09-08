#!/usr/bin/env node
// Read-only, repository-local checker. Bodies match after CRLF/LF normalization.
// Only the two sensitive .agents copies may add Cline's disabled: true metadata.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

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

// Parse only these skills' flat header schema, not arbitrary YAML. Cline's
// serializer may wrap description as >-. Reject unsupported forms and duplicate
// keys rather than silently discarding metadata. Other skills still match bytes.
function parseSensitiveSkill(content, path, mirror) {
  const parts = content.match(/^---\n([\s\S]*?)\n---(?:\n|$)([\s\S]*)$/);
  const reject = (reason) => {
    failures.push(`${path}: ${reason}`);
    return null;
  };
  if (!parts || !parts[2].trim()) return reject("missing header or instruction body");
  const allowed = new Set(["name", "description", "allowed-tools", "disable-model-invocation"]);
  if (mirror) allowed.add("disabled");
  const fields = {};
  const lines = parts[1].split("\n");
  for (let i = 0; i < lines.length; i++) {
    const entry = lines[i].match(/^([a-z][a-z-]*): (.+)$/);
    if (!entry) return reject("unsupported sensitive-skill header syntax");
    const [, key, scalar] = entry;
    if (!allowed.has(key) || Object.hasOwn(fields, key)) {
      return reject(`unexpected or duplicate metadata: ${key}`);
    }
    let value = scalar;
    if (key === "description" && scalar === ">-") {
      const folded = [];
      while (i + 1 < lines.length && lines[i + 1].startsWith("  ")) {
        const line = lines[++i].slice(2);
        if (!line || line.trim() !== line) return reject("unsupported folded description indentation/whitespace");
        folded.push(line);
      }
      if (!folded.length) return reject("empty folded description");
      value = folded.join(" ");
    } else if (key === "disable-model-invocation" || key === "disabled") {
      if (scalar !== "true") return reject(`${key} must be the boolean true`);
      value = true;
    } else if (scalar.trim() !== scalar
        || !/^\p{L}/u.test(scalar)
        || /:(?:\s|$)|\s#/.test(scalar)
        || /^(?:true|false|null|yes|no|on|off)$/i.test(scalar)) {
      return reject(`unsupported plain string: ${key}`);
    }
    fields[key] = value;
  }
  for (const key of ["name", "description", "allowed-tools", "disable-model-invocation"]) {
    if (!Object.hasOwn(fields, key)) return reject(`missing metadata: ${key}`);
  }
  // Absence permits the original copy or an authorized Cline enablement. This
  // checker does not certify an active session's disabled state.
  delete fields.disabled;
  return { fields, body: parts[2] };
}

for (const name of names) {
  const canonicalPath = `.claude/skills/${name}/SKILL.md`;
  const mirrorPath = `.agents/skills/${name}/SKILL.md`;
  const canonical = read(canonicalPath);
  const mirror = read(mirrorPath);
  if (canonical !== null && mirror !== null) {
    if (sensitive.has(name)) {
      const left = parseSensitiveSkill(canonical, canonicalPath, false);
      const right = parseSensitiveSkill(mirror, mirrorPath, true);
      if (left && right) {
        if (left.body !== right.body) failures.push(`${name}: shared body drift`);
        if (!isDeepStrictEqual(left.fields, right.fields)) failures.push(`${name}: shared metadata drift`);
      }
    } else if (canonical !== mirror) {
      failures.push(`${name}: shared body/frontmatter drift`);
    }
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
