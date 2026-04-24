import { basename } from "node:path";

export function normalizeHeading(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[`*_#=]+/g, " ")
    .replace(/\s+/g, " ");
}

export function extractSections(text) {
  const lines = text.split(/\r?\n/);
  const sections = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const markdownMatch = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (markdownMatch) {
      sections.push({
        heading: markdownMatch[2].trim(),
        normalizedHeading: normalizeHeading(markdownMatch[2]),
        level: markdownMatch[1].length,
        startLine: index + 1,
        endLine: lines.length,
      });
      continue;
    }

    const xwikiMatch = line.match(/^(=+)\s*(.+?)\s*\1\s*$/);
    if (xwikiMatch) {
      sections.push({
        heading: xwikiMatch[2].trim(),
        normalizedHeading: normalizeHeading(xwikiMatch[2]),
        level: xwikiMatch[1].length,
        startLine: index + 1,
        endLine: lines.length,
      });
    }
  }

  for (let index = 0; index < sections.length; index += 1) {
    const current = sections[index];
    for (let lookAhead = index + 1; lookAhead < sections.length; lookAhead += 1) {
      if (sections[lookAhead].level <= current.level) {
        current.endLine = sections[lookAhead].startLine - 1;
        break;
      }
    }
  }

  return sections;
}

export function extractDocumentTitle(text, filePath) {
  const sections = extractSections(text);
  if (sections.length > 0) {
    return sections[0].heading;
  }

  return basename(filePath);
}

export function extractSectionText(text, targetHeading) {
  const normalizedTarget = normalizeHeading(targetHeading);
  const sections = extractSections(text);
  const match = sections.find((section) => section.normalizedHeading === normalizedTarget);
  if (!match) {
    return null;
  }

  const lines = text.split(/\r?\n/);
  return {
    heading: match.heading,
    startLine: match.startLine,
    endLine: match.endLine,
    text: lines.slice(match.startLine - 1, match.endLine).join("\n").trim(),
  };
}
