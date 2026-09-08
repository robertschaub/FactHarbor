import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const checker = join(root, "scripts/agents/check-skill-mirrors.mjs");
const outputRoot = join(root, "test-output/agent-instructions-v7");
const names = readdirSync(join(root, ".claude/skills"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory()).map((entry) => entry.name);
const sensitive = ["validate", "report-review"];
const canonical = (name) => `.claude/skills/${name}/SKILL.md`;
const mirror = (name) => `.agents/skills/${name}/SKILL.md`;
const policy = (name) => `.agents/skills/${name}/agents/openai.yaml`;

function change(fixture, path, transform) {
  const target = join(fixture, path);
  writeFileSync(target, transform(readFileSync(target, "utf8").replace(/\r\n/g, "\n")));
}

function fixture(t) {
  mkdirSync(outputRoot, { recursive: true });
  assert.equal(realpathSync(outputRoot).toLowerCase(), resolve(outputRoot).toLowerCase(), "fixture parent must not redirect elsewhere");
  const directory = mkdtempSync(join(outputRoot, "skill-mirror-compat-"));
  t.after(() => {
    const actual = realpathSync(directory);
    const owned = relative(realpathSync(outputRoot), actual);
    assert.ok(owned.startsWith("skill-mirror-compat-") && !owned.includes(sep), "cleanup must stay in the exact owned fixture");
    assert.equal(actual.toLowerCase(), resolve(directory).toLowerCase(), "cleanup target must be the created directory");
    rmSync(actual, { recursive: true });
  });
  for (const name of names) {
    for (const destination of [canonical(name), mirror(name)]) {
      mkdirSync(dirname(join(directory, destination)), { recursive: true });
      copyFileSync(join(root, canonical(name)), join(directory, destination));
    }
  }
  for (const name of sensitive) {
    mkdirSync(dirname(join(directory, policy(name))), { recursive: true });
    copyFileSync(join(root, policy(name)), join(directory, policy(name)));
  }
  return directory;
}

function check(directory, passes, diagnostic) {
  const result = spawnSync(process.execPath, [checker, directory], { encoding: "utf8" });
  assert.ifError(result.error);
  assert.equal(result.status, passes ? 0 : 1, result.stdout + result.stderr);
  if (diagnostic) assert.match(result.stderr, diagnostic);
}

// This is a captured form of the client's transformation, expressed separately
// from the checker's parser so a permissive parser cannot bless body/policy drift.
function disableAndFold(content) {
  return content.replace(/^description: (.+)$/m, (_, description) => {
    const split = description.indexOf(" ", Math.floor(description.length / 2));
    return `description: >-\n  ${description.slice(0, split)}\n  ${description.slice(split + 1)}`;
  }).replace("disable-model-invocation: true\n", "disable-model-invocation: true\ndisabled: true\n");
}

test("identical originals remain valid without asserting Cline toggle state", (t) => {
  check(fixture(t), true);
});

test("Cline folded metadata and disabled flag pass for both sensitive copies, including CRLF", (t) => {
  const directory = fixture(t);
  for (const name of sensitive) change(directory, mirror(name), (text) => disableAndFold(text).replace(/\n/g, "\r\n"));
  check(directory, true);
});

const rejected = [
  ["instruction change", mirror("validate"), (text) => text + "\nDifferent workflow instruction.\n", /shared body drift/],
  ["description change", mirror("report-review"), (text) => text.replace("description: ", "description: Different "), /shared metadata drift/],
  ["tool-list change", mirror("validate"), (text) => text.replace("allowed-tools: Bash Read", "allowed-tools: Read"), /shared metadata drift/],
  ["unknown metadata", mirror("validate"), (text) => text.replace("name: validate", "name: validate\nunexpected: true"), /unexpected or duplicate metadata/],
  ["disabled on canonical", canonical("validate"), (text) => text.replace("name: validate", "name: validate\ndisabled: true"), /unexpected or duplicate metadata/],
  ["disabled on ordinary skill", mirror("debug"), (text) => text.replace("name: debug", "name: debug\ndisabled: true"), /shared body\/frontmatter drift/],
  ["nonboolean disabled", mirror("validate"), (text) => text.replace("name: validate", 'name: validate\ndisabled: "true"'), /disabled must be the boolean true/],
  ["false disabled", mirror("validate"), (text) => text.replace("name: validate", "name: validate\ndisabled: false"), /disabled must be the boolean true/],
  ["duplicate metadata", mirror("validate"), (text) => text.replace("name: validate", "name: validate\nname: validate"), /unexpected or duplicate metadata/],
  ["missing Claude flag", mirror("validate"), (text) => text.replace("disable-model-invocation: true\n", ""), /missing metadata|explicit Claude invocation flag/],
  ["false Claude flag", mirror("validate"), (text) => text.replace("disable-model-invocation: true", "disable-model-invocation: false"), /must be the boolean true|explicit Claude invocation flag/],
  ["missing Codex policy", policy("validate"), (text) => text.replace("policy:\n  allow_implicit_invocation: false\n", ""), /expected quoted interface fields/],
  ["implicit Codex invocation", policy("validate"), (text) => text.replace("allow_implicit_invocation: false", "allow_implicit_invocation: true"), /expected quoted interface fields/],
  ["folded paragraph change", mirror("validate"), (text) => disableAndFold(text).replace(/\n  /, "\n\n  "), /unsupported sensitive-skill header syntax|empty folded description/],
  ["more-indented fold", mirror("validate"), (text) => disableAndFold(text).replace(/\n  /, "\n    "), /unsupported folded description/],
];

for (const [label, path, transform, diagnostic] of rejected) {
  test(`reject ${label}`, (t) => {
    const directory = fixture(t);
    change(directory, path, transform);
    check(directory, false, diagnostic);
  });
}

test("missing mirror still fails", (t) => {
  const directory = fixture(t);
  rmSync(join(directory, mirror("validate")));
  check(directory, false, /ENOENT/);
});

for (const scalar of ["# comment", ".nan", ".inf", "text:", "false", "null", "yes", "42"]) {
  test(`reject unsupported plain scalar versus folded string: ${scalar}`, (t) => {
    const directory = fixture(t);
    change(directory, canonical("validate"), (text) => text.replace(/^description: .+$/m, `description: ${scalar}`));
    change(directory, mirror("validate"), (text) => text.replace(/^description: .+$/m, `description: >-\n  ${scalar}`));
    check(directory, false, /unsupported plain string: description/);
  });
}
