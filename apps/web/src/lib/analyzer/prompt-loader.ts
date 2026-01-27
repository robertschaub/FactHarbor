/**
 * External Prompt File Loader
 *
 * Loads prompt templates from external .prompt.md files, supports:
 * - YAML frontmatter parsing (version, pipeline, variables, sections)
 * - Section extraction (## SECTION_NAME)
 * - Variable substitution (${variableName})
 * - File-watching cache for hot-reload with performance
 * - Content hashing for version tracking (SHA-256)
 *
 * @module analyzer/prompt-loader
 * @version 2.6.41
 */

import { readFile, stat } from "fs/promises";
import { createHash } from "crypto";
import path from "path";

// ============================================================================
// TYPES
// ============================================================================

/** Valid pipeline identifiers */
export type Pipeline =
  | "orchestrated"
  | "monolithic-canonical"
  | "monolithic-dynamic"
  | "source-reliability";

const VALID_PIPELINES: Pipeline[] = [
  "orchestrated",
  "monolithic-canonical",
  "monolithic-dynamic",
  "source-reliability",
];

/** Parsed YAML frontmatter from prompt file */
export interface PromptFrontmatter {
  version: string;
  pipeline: string;
  description: string;
  lastModified: string;
  variables: string[];
  requiredSections: string[];
  models?: string[];
  defaultModel?: string;
}

/** Parsed section from prompt file */
export interface PromptSection {
  name: string;
  content: string;
  startLine: number;
  endLine: number;
}

/** Fully parsed prompt file */
export interface PromptFile {
  frontmatter: PromptFrontmatter;
  sections: PromptSection[];
  rawContent: string;
  contentHash: string;
  filePath: string;
  loadedAt: string; // ISO timestamp
}

/** Validation warning (non-fatal) */
export interface ValidationWarning {
  type: "missing_section" | "unknown_variable" | "empty_section" | "fallback_used";
  message: string;
}

/** Validation error (fatal) */
export interface ValidationError {
  type: "file_not_found" | "parse_error" | "invalid_frontmatter" | "no_sections";
  message: string;
}

/** Result of loading a prompt file */
export interface LoadResult {
  success: boolean;
  prompt?: PromptFile;
  warnings: ValidationWarning[];
  errors: ValidationError[];
  fallbackUsed?: boolean;
}

// ============================================================================
// CACHE (mtime-based for hot-reload + performance)
// ============================================================================

interface CachedPrompt {
  prompt: PromptFile;
  mtimeMs: number;
}

const promptCache = new Map<string, CachedPrompt>();

/**
 * Clear prompt cache (for testing or forced reload)
 */
export function clearPromptCache(): void {
  promptCache.clear();
}

// ============================================================================
// FILE PATHS
// ============================================================================

/**
 * Get the absolute path to a prompt file for a given pipeline
 */
export function getPromptFilePath(pipeline: Pipeline): string {
  const promptDir = process.env.FH_PROMPT_DIR || path.resolve(process.cwd(), "prompts");
  return path.join(promptDir, `${pipeline}.prompt.md`);
}

/**
 * Validate pipeline name against allowlist
 */
export function isValidPipeline(pipeline: string): pipeline is Pipeline {
  return VALID_PIPELINES.includes(pipeline as Pipeline);
}

// ============================================================================
// CONTENT HASHING
// ============================================================================

/**
 * Generate SHA-256 hash of content for version tracking
 */
export function hashContent(content: string): string {
  return createHash("sha256").update(content, "utf-8").digest("hex");
}

/**
 * Estimate token count from text content
 * Uses character-based estimation (adequate for POC; replace with tokenizer later)
 */
export function estimateTokens(content: string): number {
  // ~3.5 characters per token for English text (slightly more conservative than /4)
  return Math.ceil(content.length / 3.5);
}

// ============================================================================
// FRONTMATTER PARSER
// ============================================================================

/**
 * Parse YAML frontmatter from prompt file content
 * Supports the simple YAML subset used in prompt files
 */
function parseFrontmatter(content: string): {
  frontmatter: PromptFrontmatter | null;
  body: string;
  error?: string;
} {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    return { frontmatter: null, body: content, error: "No frontmatter block found" };
  }

  const fmText = fmMatch[1];
  const body = fmMatch[2];

  try {
    // Simple YAML parser for our known structure
    const fm: Record<string, any> = {};
    let currentKey = "";
    let currentArray: string[] | null = null;

    for (const line of fmText.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      // Array item
      if (trimmed.startsWith("- ") && currentArray !== null) {
        currentArray.push(trimmed.slice(2).replace(/^["']|["']$/g, ""));
        continue;
      }

      // Key-value pair
      const kvMatch = trimmed.match(/^(\w+):\s*(.*)$/);
      if (kvMatch) {
        const [, key, value] = kvMatch;
        // Save previous array
        if (currentArray !== null) {
          fm[currentKey] = currentArray;
          currentArray = null;
        }

        if (value === "" || value === undefined) {
          // Start of array or empty value
          currentKey = key;
          currentArray = [];
        } else {
          fm[key] = value.replace(/^["']|["']$/g, "");
        }
      }
    }

    // Save final array
    if (currentArray !== null) {
      fm[currentKey] = currentArray;
    }

    const frontmatter: PromptFrontmatter = {
      version: fm.version || "unknown",
      pipeline: fm.pipeline || "unknown",
      description: fm.description || "",
      lastModified: fm.lastModified || new Date().toISOString(),
      variables: Array.isArray(fm.variables) ? fm.variables : [],
      requiredSections: Array.isArray(fm.requiredSections) ? fm.requiredSections : [],
      models: Array.isArray(fm.models) ? fm.models : undefined,
      defaultModel: fm.defaultModel || undefined,
    };

    return { frontmatter, body };
  } catch (err: any) {
    return {
      frontmatter: null,
      body: content,
      error: `Frontmatter parse error: ${err?.message || String(err)}`,
    };
  }
}

// ============================================================================
// SECTION PARSER
// ============================================================================

/**
 * Extract sections from prompt file body
 * Sections are delimited by `## SECTION_NAME` headers
 */
function extractSections(body: string): PromptSection[] {
  const sections: PromptSection[] = [];
  const lines = body.split("\n");
  let currentSection: PromptSection | null = null;
  let contentLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match section headers: ## SECTION_NAME or ## SECTION NAME (with optional parenthetical)
    const headerMatch = line.match(/^## ([A-Z][A-Z0-9_ ]+(?:\([^)]*\))?)\s*$/);

    if (headerMatch) {
      // Save previous section
      if (currentSection) {
        currentSection.content = contentLines.join("\n").trim();
        currentSection.endLine = i - 1;
        sections.push(currentSection);
      }

      // Start new section
      currentSection = {
        name: headerMatch[1],
        content: "",
        startLine: i,
        endLine: i,
      };
      contentLines = [];
    } else if (currentSection) {
      // Skip horizontal rules (---) between sections
      if (line.trim() === "---") continue;
      contentLines.push(line);
    }
  }

  // Save final section
  if (currentSection) {
    currentSection.content = contentLines.join("\n").trim();
    currentSection.endLine = lines.length - 1;
    sections.push(currentSection);
  }

  return sections;
}

// ============================================================================
// MAIN LOADER
// ============================================================================

/**
 * Load and parse a prompt file for a given pipeline
 *
 * Uses mtime-based caching: reads from disk only if file changed.
 * Returns structured result with warnings/errors.
 */
export async function loadPromptFile(pipeline: Pipeline): Promise<LoadResult> {
  const filePath = getPromptFilePath(pipeline);
  const warnings: ValidationWarning[] = [];
  const errors: ValidationError[] = [];

  try {
    // Check file stats for cache validation
    const fileStats = await stat(filePath);

    // Check cache
    const cached = promptCache.get(pipeline);
    if (cached && cached.mtimeMs === fileStats.mtimeMs) {
      return { success: true, prompt: cached.prompt, warnings: [], errors: [] };
    }

    // Cache miss or file changed - read from disk
    // Normalize \r\n to \n for cross-platform compatibility
    const rawContent = (await readFile(filePath, "utf-8")).replace(/\r\n/g, "\n");
    const contentHash = hashContent(rawContent);

    // Parse frontmatter
    const { frontmatter, body, error: fmError } = parseFrontmatter(rawContent);
    if (!frontmatter || fmError) {
      errors.push({
        type: "invalid_frontmatter",
        message: fmError || "Could not parse frontmatter",
      });
      return { success: false, warnings, errors };
    }

    // Extract sections
    const sections = extractSections(body);
    if (sections.length === 0) {
      errors.push({
        type: "no_sections",
        message: "No sections found in prompt file (expected ## SECTION_NAME headers)",
      });
      return { success: false, warnings, errors };
    }

    // Validate required sections
    const sectionNames = new Set(sections.map((s) => s.name));
    for (const required of frontmatter.requiredSections) {
      if (!sectionNames.has(required)) {
        warnings.push({
          type: "missing_section",
          message: `Required section "${required}" not found in prompt file`,
        });
      }
    }

    // Check for empty sections
    for (const section of sections) {
      if (!section.content.trim()) {
        warnings.push({
          type: "empty_section",
          message: `Section "${section.name}" is empty`,
        });
      }
    }

    const prompt: PromptFile = {
      frontmatter,
      sections,
      rawContent,
      contentHash,
      filePath,
      loadedAt: new Date().toISOString(),
    };

    // Update cache
    promptCache.set(pipeline, { prompt, mtimeMs: fileStats.mtimeMs });

    return { success: true, prompt, warnings, errors };
  } catch (err: any) {
    if (err?.code === "ENOENT") {
      errors.push({
        type: "file_not_found",
        message: `Prompt file not found: ${filePath}`,
      });
    } else {
      errors.push({
        type: "parse_error",
        message: `Failed to load prompt file: ${err?.message || String(err)}`,
      });
    }
    return { success: false, warnings, errors };
  }
}

// ============================================================================
// SECTION EXTRACTION
// ============================================================================

/**
 * Get a specific section from a loaded prompt file
 */
export function getSection(prompt: PromptFile, sectionName: string): PromptSection | null {
  return prompt.sections.find((s) => s.name === sectionName) || null;
}

/**
 * Get section content with variable substitution
 *
 * Replaces ${variableName} placeholders with provided values.
 * Variables that are not provided remain as-is (with a warning).
 */
export function renderSection(
  prompt: PromptFile,
  sectionName: string,
  variables: Record<string, string>,
): { content: string; warnings: ValidationWarning[] } | null {
  const section = getSection(prompt, sectionName);
  if (!section) return null;

  const warnings: ValidationWarning[] = [];
  let content = section.content;

  // Find all variable references in the section
  const varPattern = /\$\{(\w+)\}/g;
  const usedVars = new Set<string>();

  content = content.replace(varPattern, (match, varName) => {
    usedVars.add(varName);
    if (varName in variables) {
      return variables[varName];
    }
    warnings.push({
      type: "unknown_variable",
      message: `Variable "${varName}" referenced in section "${sectionName}" but not provided`,
    });
    return match; // Keep original placeholder
  });

  return { content, warnings };
}

/**
 * Render the full prompt file content with variable substitution
 * (replaces variables across all sections)
 */
export function renderFullPrompt(
  prompt: PromptFile,
  variables: Record<string, string>,
): { content: string; warnings: ValidationWarning[] } {
  const warnings: ValidationWarning[] = [];
  let content = prompt.rawContent;

  // Strip frontmatter for rendering
  const fmEnd = content.indexOf("\n---\n", content.indexOf("---\n") + 4);
  if (fmEnd > 0) {
    content = content.substring(fmEnd + 5);
  }

  const varPattern = /\$\{(\w+)\}/g;
  content = content.replace(varPattern, (match, varName) => {
    if (varName in variables) {
      return variables[varName];
    }
    warnings.push({
      type: "unknown_variable",
      message: `Variable "${varName}" not provided`,
    });
    return match;
  });

  return { content, warnings };
}

// ============================================================================
// CONVENIENCE: Load + Render Section
// ============================================================================

/**
 * Load a prompt file and render a specific section with variables.
 * Returns null if section not found or file load fails.
 */
export async function loadAndRenderSection(
  pipeline: Pipeline,
  sectionName: string,
  variables: Record<string, string>,
): Promise<{
  content: string;
  contentHash: string;
  loadedAt: string;
  warnings: ValidationWarning[];
} | null> {
  const result = await loadPromptFile(pipeline);
  if (!result.success || !result.prompt) return null;

  const rendered = renderSection(result.prompt, sectionName, variables);
  if (!rendered) return null;

  return {
    content: rendered.content,
    contentHash: result.prompt.contentHash,
    loadedAt: result.prompt.loadedAt,
    warnings: [...result.warnings, ...rendered.warnings],
  };
}

// ============================================================================
// METADATA
// ============================================================================

/**
 * Get prompt metadata without loading full content (useful for API responses)
 */
export async function getPromptMetadata(pipeline: Pipeline): Promise<{
  version: string;
  contentHash: string;
  tokenEstimate: number;
  sectionCount: number;
  sectionNames: string[];
  loadedAt: string;
  filePath: string;
} | null> {
  const result = await loadPromptFile(pipeline);
  if (!result.success || !result.prompt) return null;

  return {
    version: result.prompt.frontmatter.version,
    contentHash: result.prompt.contentHash,
    tokenEstimate: estimateTokens(result.prompt.rawContent),
    sectionCount: result.prompt.sections.length,
    sectionNames: result.prompt.sections.map((s) => s.name),
    loadedAt: result.prompt.loadedAt,
    filePath: result.prompt.filePath,
  };
}
