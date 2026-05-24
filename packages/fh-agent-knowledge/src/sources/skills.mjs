import { basename, dirname } from "node:path";

import { PATHS, toRepoRelativePath } from "../utils/paths.mjs";
import { extractSections } from "../utils/sections.mjs";
import { listFilesRecursive, readTextFile } from "../utils/fs.mjs";

function parseFrontmatter(text) {
  if (!text.startsWith("---")) {
    return {};
  }

  const lines = text.split(/\r?\n/);
  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (closingIndex <= 0) {
    return {};
  }

  const fields = {};
  for (const line of lines.slice(1, closingIndex)) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (key) {
      fields[key] = value;
    }
  }

  return fields;
}

function parseAllowedTools(value) {
  return String(value ?? "")
    .split(/[,\s]+/u)
    .map((tool) => tool.trim())
    .filter(Boolean);
}

function parseBoolean(value) {
  return String(value ?? "").trim().toLowerCase() === "true";
}

function parseSkillFile(skillFilePath) {
  const text = readTextFile(skillFilePath);
  const frontmatter = parseFrontmatter(text);
  const directoryName = basename(dirname(skillFilePath));
  const name = frontmatter.name || directoryName;
  const sections = extractSections(text);

  return {
    name,
    command: `/${name}`,
    file: toRepoRelativePath(skillFilePath),
    description: frontmatter.description ?? "",
    allowedTools: parseAllowedTools(frontmatter["allowed-tools"]),
    disableModelInvocation: parseBoolean(frontmatter["disable-model-invocation"]),
    sections: sections.map((section) => ({
      heading: section.heading,
      startLine: section.startLine,
      endLine: section.endLine,
    })),
  };
}

export function loadSkillEntries() {
  const skillFiles = listFilesRecursive(PATHS.claudeSkillsDir, (path) => path.endsWith("SKILL.md"));
  return skillFiles.map(parseSkillFile).sort((left, right) => left.name.localeCompare(right.name));
}
