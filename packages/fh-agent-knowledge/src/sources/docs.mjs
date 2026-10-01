import { basename, extname, resolve } from "node:path";

import { PATHS, toRepoRelativePath } from "../utils/paths.mjs";
import { extractDocumentTitle, extractSectionText, extractSections } from "../utils/sections.mjs";
import { listFilesRecursive, listTrackedFiles, pathExists, readTextFile } from "../utils/fs.mjs";

const DOC_ROOTS = [
  PATHS.rolesDir,
  PATHS.policiesDir,
  PATHS.wipDir,
  PATHS.developmentDir,
  PATHS.architectureDir,
  PATHS.claudeSkillsDir,
];

function listAllowedDocs() {
  const docs = new Set([PATHS.agents, PATHS.currentStatus, PATHS.agentOutputs, PATHS.roleLearnings, ...PATHS.methodSummaries]);

  for (const rootPath of DOC_ROOTS) {
    for (const filePath of listFilesRecursive(rootPath, (path, entry) => {
      const extension = extname(path).toLowerCase();
      return extension === ".md" && !entry.isSymbolicLink();
    })) {
      docs.add(filePath);
    }
  }

  const tracked = new Set(listTrackedFiles().map((path) => resolve(PATHS.repoRoot, path)));
  return [...docs].filter((path) => tracked.has(path) && pathExists(path))
    .sort((left, right) => left.localeCompare(right));
}

export function buildDocSectionIndex() {
  return listAllowedDocs().map((filePath) => {
    const text = readTextFile(filePath);
    const sections = extractSections(text);
    return {
      file: toRepoRelativePath(filePath),
      title: extractDocumentTitle(text, filePath),
      sections: sections.map((section) => ({
        heading: section.heading,
        startLine: section.startLine,
        endLine: section.endLine,
      })),
    };
  });
}

export function readAllowedDocSection(filePath, sectionHeading) {
  const absolutePath = resolve(PATHS.repoRoot, filePath);
  const allowedDocs = new Set(listAllowedDocs());
  if (!allowedDocs.has(absolutePath)) {
    throw new Error(`File is not in the allowlisted doc set: ${filePath}`);
  }

  if (!pathExists(absolutePath)) {
    throw new Error(`Doc file not found: ${filePath}`);
  }

  const text = readTextFile(absolutePath);
  const extracted = extractSectionText(text, sectionHeading);
  if (!extracted) {
    throw new Error(`Section not found in ${filePath}: ${sectionHeading}`);
  }

  return {
    file: toRepoRelativePath(absolutePath),
    title: extractDocumentTitle(text, absolutePath),
    heading: extracted.heading,
    startLine: extracted.startLine,
    endLine: extracted.endLine,
    text: extracted.text,
  };
}
