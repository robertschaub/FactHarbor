import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export const PROMPT_MANIFEST_FILENAME = "manifest.json";
export const PROMPT_MANIFEST_SCHEMA_VERSION = 1;
const DEFAULT_PROMPT_MANIFEST_JOINER = "\n\n";

export interface PromptManifestFile {
  path: string;
  sections: string[];
}

export interface PromptManifest {
  schemaVersion: typeof PROMPT_MANIFEST_SCHEMA_VERSION;
  profile: string;
  frontmatterPath: string;
  files: PromptManifestFile[];
  joiner?: string;
}

export type PromptSourceKind = "monolith" | "manifest";
export type PromptSourceErrorReason =
  | "file_not_found"
  | "invalid_manifest"
  | "path_escape"
  | "section_mismatch";

export class PromptSourceError extends Error {
  readonly reason: PromptSourceErrorReason;
  readonly sourceKind: PromptSourceKind;

  constructor(reason: PromptSourceErrorReason, sourceKind: PromptSourceKind, message: string) {
    super(message);
    this.name = "PromptSourceError";
    this.reason = reason;
    this.sourceKind = sourceKind;
  }
}

export interface PromptSourceContent {
  content: string;
  sourceKind: PromptSourceKind;
  primaryPath: string;
  sourceFiles: string[];
  manifest?: PromptManifest;
}

export function getPromptDir(): string {
  return process.env.FH_PROMPT_DIR || path.join(process.cwd(), "prompts");
}

export function getPromptMonolithPath(profile: string, promptDir = getPromptDir()): string {
  if (profile.startsWith("text-analysis-")) {
    return path.join(promptDir, "text-analysis", `${profile}.prompt.md`);
  }
  return path.join(promptDir, `${profile}.prompt.md`);
}

export function getPromptManifestPath(profile: string, promptDir = getPromptDir()): string {
  if (profile.startsWith("text-analysis-")) {
    return path.join(promptDir, "text-analysis", profile, PROMPT_MANIFEST_FILENAME);
  }
  return path.join(promptDir, profile, PROMPT_MANIFEST_FILENAME);
}

function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function ensureFinalNewline(content: string): string {
  return content.endsWith("\n") ? content : `${content}\n`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseManifest(raw: string, manifestPath: string, profile: string): PromptManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid prompt manifest JSON at ${manifestPath}: ${message}`);
  }

  if (!isObject(parsed)) {
    throw new Error(`Prompt manifest must be a JSON object: ${manifestPath}`);
  }
  if (parsed.schemaVersion !== PROMPT_MANIFEST_SCHEMA_VERSION) {
    throw new Error(
      `Prompt manifest schemaVersion must be ${PROMPT_MANIFEST_SCHEMA_VERSION}: ${manifestPath}`,
    );
  }
  if (parsed.profile !== profile) {
    throw new Error(
      `Prompt manifest profile "${String(parsed.profile)}" does not match requested profile "${profile}"`,
    );
  }
  if (typeof parsed.frontmatterPath !== "string" || parsed.frontmatterPath.trim().length === 0) {
    throw new Error(`Prompt manifest frontmatterPath is required: ${manifestPath}`);
  }
  if (!Array.isArray(parsed.files) || parsed.files.length === 0) {
    throw new Error(`Prompt manifest files must be a non-empty array: ${manifestPath}`);
  }

  const files = parsed.files.map((entry, index): PromptManifestFile => {
    if (!isObject(entry)) {
      throw new Error(`Prompt manifest file entry ${index} must be an object: ${manifestPath}`);
    }
    if (typeof entry.path !== "string" || entry.path.trim().length === 0) {
      throw new Error(`Prompt manifest file entry ${index} is missing path: ${manifestPath}`);
    }
    if (!Array.isArray(entry.sections) || entry.sections.length === 0) {
      throw new Error(`Prompt manifest file entry ${entry.path} must list sections`);
    }
    const sections = entry.sections.map((section, sectionIndex) => {
      if (typeof section !== "string" || section.trim().length === 0) {
        throw new Error(
          `Prompt manifest file entry ${entry.path} has invalid section at index ${sectionIndex}`,
        );
      }
      return section;
    });
    return { path: entry.path, sections };
  });

  return {
    schemaVersion: PROMPT_MANIFEST_SCHEMA_VERSION,
    profile,
    frontmatterPath: parsed.frontmatterPath,
    files,
    joiner: typeof parsed.joiner === "string" ? parsed.joiner : DEFAULT_PROMPT_MANIFEST_JOINER,
  };
}

function resolveManifestRelativePath(manifestDir: string, relativePath: string): string {
  if (path.isAbsolute(relativePath) || relativePath.includes("\0")) {
    throw new PromptSourceError(
      "path_escape",
      "manifest",
      `Prompt manifest path must be relative and safe: ${relativePath}`,
    );
  }

  const root = path.resolve(manifestDir);
  const resolved = path.resolve(root, relativePath);
  const relative = path.relative(root, resolved);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new PromptSourceError(
      "path_escape",
      "manifest",
      `Prompt manifest path escapes manifest directory: ${relativePath}`,
    );
  }

  return resolved;
}

function extractSectionHeadings(content: string): string[] {
  const sections: string[] = [];
  for (const line of normalizeLineEndings(content).split("\n")) {
    const match = line.match(/^## ([A-Z][A-Z0-9_ ]+(?:\([^)]*\))?)\s*$/);
    if (match) {
      sections.push(match[1]);
    }
  }
  return sections;
}

function extractRequiredSections(frontmatterContent: string): string[] {
  const frontmatterMatch = normalizeLineEndings(frontmatterContent).match(/^---\n([\s\S]*?)\n---\n?/);
  if (!frontmatterMatch) {
    throw new Error("Prompt manifest frontmatter file must contain a YAML frontmatter block");
  }

  const sections: string[] = [];
  let inRequiredSections = false;
  for (const line of frontmatterMatch[1].split("\n")) {
    if (/^requiredSections\s*:/.test(line)) {
      inRequiredSections = true;
      continue;
    }
    if (!inRequiredSections) {
      continue;
    }
    const item = line.match(/^\s*-\s*"?([A-Z][A-Z0-9_]+)"?\s*$/);
    if (item) {
      sections.push(item[1]);
      continue;
    }
    if (/^[A-Za-z]/.test(line)) {
      break;
    }
  }

  if (sections.length === 0) {
    throw new Error("Prompt manifest frontmatter must list requiredSections");
  }
  return sections;
}

function assertSameOrderedList(label: string, expected: string[], actual: string[]): void {
  if (expected.length !== actual.length || expected.some((value, index) => value !== actual[index])) {
    throw new PromptSourceError(
      "section_mismatch",
      "manifest",
      `${label} mismatch. Expected [${expected.join(", ")}], got [${actual.join(", ")}]`,
    );
  }
}

function assertSameSectionSet(label: string, expected: string[], actual: string[]): void {
  const expectedCounts = new Map<string, number>();
  const actualCounts = new Map<string, number>();
  for (const value of expected) {
    expectedCounts.set(value, (expectedCounts.get(value) ?? 0) + 1);
  }
  for (const value of actual) {
    actualCounts.set(value, (actualCounts.get(value) ?? 0) + 1);
  }

  const allValues = Array.from(new Set([...expectedCounts.keys(), ...actualCounts.keys()])).sort();
  const mismatches = allValues.filter((value) => expectedCounts.get(value) !== actualCounts.get(value));
  if (mismatches.length > 0) {
    throw new PromptSourceError(
      "section_mismatch",
      "manifest",
      `${label} mismatch for section(s): ${mismatches.join(", ")}. ` +
        `Expected [${expected.join(", ")}], got [${actual.join(", ")}]`,
    );
  }
}

function asManifestSourceError(err: unknown): PromptSourceError {
  if (err instanceof PromptSourceError) {
    return err;
  }
  const message = err instanceof Error ? err.message : String(err);
  return new PromptSourceError("invalid_manifest", "manifest", message);
}

async function loadManifestSource(profile: string, manifestPath: string): Promise<PromptSourceContent> {
  const manifestDir = path.dirname(manifestPath);
  const rawManifest = await readFile(manifestPath, "utf-8");
  const manifest = parseManifest(rawManifest, manifestPath, profile);

  const frontmatterPath = resolveManifestRelativePath(manifestDir, manifest.frontmatterPath);
  const frontmatterContent = normalizeLineEndings(await readFile(frontmatterPath, "utf-8"));
  const requiredSections = extractRequiredSections(frontmatterContent);

  const sourceFiles = [manifestPath, frontmatterPath];
  const contentParts = [frontmatterContent];
  const manifestSections: string[] = [];

  for (const file of manifest.files) {
    const filePath = resolveManifestRelativePath(manifestDir, file.path);
    const fileContent = normalizeLineEndings(await readFile(filePath, "utf-8"));
    const actualSections = extractSectionHeadings(fileContent);
    assertSameOrderedList(`Sections for ${file.path}`, file.sections, actualSections);
    manifestSections.push(...file.sections);
    sourceFiles.push(filePath);
    contentParts.push(fileContent);
  }

  assertSameSectionSet("Manifest files vs frontmatter requiredSections", requiredSections, manifestSections);

  return {
    content: ensureFinalNewline(contentParts.map((part) => part.trimEnd()).join(manifest.joiner)),
    sourceKind: "manifest",
    primaryPath: manifestPath,
    sourceFiles,
    manifest,
  };
}

export async function loadPromptSourceContent(profile: string): Promise<PromptSourceContent> {
  const promptDir = getPromptDir();
  const manifestPath = getPromptManifestPath(profile, promptDir);

  if (existsSync(manifestPath)) {
    try {
      return await loadManifestSource(profile, manifestPath);
    } catch (err) {
      throw asManifestSourceError(err);
    }
  }

  const filePath = getPromptMonolithPath(profile, promptDir);
  if (!existsSync(filePath)) {
    throw new PromptSourceError("file_not_found", "monolith", `Prompt file not found: ${filePath}`);
  }

  return {
    content: await readFile(filePath, "utf-8"),
    sourceKind: "monolith",
    primaryPath: filePath,
    sourceFiles: [filePath],
  };
}
