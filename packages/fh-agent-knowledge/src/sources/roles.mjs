import { PATHS, toRepoRelativePath } from "../utils/paths.mjs";
import { extractSectionText } from "../utils/sections.mjs";
import { listFilesRecursive, readTextFile } from "../utils/fs.mjs";

export function normalizeRoleKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "");
}

function parseBulletList(sectionText) {
  return sectionText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim());
}

function parseRequiredReading(sectionText) {
  return sectionText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && !line.startsWith("|-") && !line.includes("Document"))
    .map((line) => line.split("|").slice(1, -1).map((part) => part.trim()))
    .filter((cells) => cells.length >= 2)
    .map(([document, why]) => ({ document, why }));
}

function parseRoleLearnings(roleName) {
  const text = readTextFile(PATHS.roleLearnings);
  const section = extractSectionText(text, roleName);
  if (!section) {
    return [];
  }

  const entries = section.text
    .split(/\r?\n### /)
    .map((chunk, index) => (index === 0 ? chunk : `### ${chunk}`))
    .filter((chunk) => chunk.startsWith("### "));

  return entries.map((entry) => {
    const lines = entry.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const title = lines[0].replace(/^###\s+/, "");
    const learningLine = lines.find((line) => line.startsWith("**Learning:**"));
    return {
      title,
      summary: learningLine ? learningLine.replace("**Learning:**", "").trim() : "",
    };
  });
}

function parseRoleFile(roleFilePath) {
  const text = readTextFile(roleFilePath);
  const lines = text.split(/\r?\n/);
  const displayName = lines.find((line) => line.startsWith("# "))?.replace(/^# /, "").trim() ?? roleFilePath;
  const missionLine = lines.find((line) => line.startsWith("**Mission:**")) ?? "";
  const aliasesLine = lines.find((line) => line.startsWith("**Aliases:**")) ?? "";
  const focusAreas = parseBulletList(extractSectionText(text, "Focus Areas")?.text ?? "");
  const requiredReading = parseRequiredReading(extractSectionText(text, "Required Reading")?.text ?? "");
  const antiPatterns = parseBulletList(extractSectionText(text, "Anti-patterns")?.text ?? "");

  const aliases = aliasesLine
    ? aliasesLine
        .replace("**Aliases:**", "")
        .split(",")
        .map((alias) => alias.trim())
        .filter(Boolean)
    : [];

  return {
    canonicalName: displayName,
    canonicalKey: normalizeRoleKey(displayName),
    aliases,
    aliasKeys: [...new Set([displayName, ...aliases].map(normalizeRoleKey).filter(Boolean))],
    mission: missionLine.replace("**Mission:**", "").trim(),
    focusAreas,
    requiredReading,
    antiPatterns,
    file: toRepoRelativePath(roleFilePath),
    learnings: parseRoleLearnings(displayName),
  };
}

export function loadRoleEntries() {
  const roleFiles = listFilesRecursive(PATHS.rolesDir, (path) => path.endsWith(".md"));
  return roleFiles.map(parseRoleFile);
}

export function resolveRoleEntry(roleEntries, roleInput) {
  if (!roleInput) {
    return null;
  }

  const normalizedRole = normalizeRoleKey(roleInput);
  return roleEntries.find((entry) => entry.aliasKeys.includes(normalizedRole)) ?? null;
}
