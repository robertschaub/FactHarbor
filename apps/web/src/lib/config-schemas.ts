/**
 * Configuration Schemas
 *
 * Zod schemas for validating and canonicalizing configuration content.
 * Supports search.v1, calc.v1, and prompt.v1 config types.
 *
 * @module config-schemas
 * @version 1.0.0
 */

import { z } from "zod";
import crypto from "crypto";

// ============================================================================
// TYPES
// ============================================================================

export type ConfigType = "prompt" | "search" | "calculation";
export type SchemaVersion = "prompt.v1" | "search.v1" | "calc.v1";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// SEARCH CONFIG SCHEMA (search.v1)
// ============================================================================

export const SearchConfigSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(["auto", "google-cse", "serpapi"]),
  mode: z.enum(["standard", "grounded"]),
  maxResults: z.number().int().min(1).max(20),
  maxSourcesPerIteration: z.number().int().min(1).max(10),
  timeoutMs: z.number().int().min(1000).max(60000),
  dateRestrict: z.enum(["y", "m", "w"]).nullable(),
  domainWhitelist: z.array(z.string().regex(/^[a-z0-9.-]+$/i)).max(50),
  domainBlacklist: z.array(z.string().regex(/^[a-z0-9.-]+$/i)).max(50),
});

export type SearchConfig = z.infer<typeof SearchConfigSchema>;

export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  enabled: true,
  provider: "auto",
  mode: "standard",
  maxResults: 6,
  maxSourcesPerIteration: 4,
  timeoutMs: 12000,
  dateRestrict: null,
  domainWhitelist: [],
  domainBlacklist: [],
};

// ============================================================================
// CALCULATION CONFIG SCHEMA (calc.v1)
// ============================================================================

// Helper: Integer tuple with min <= max validation
const IntRangeTuple = z
  .tuple([z.number().int().min(0).max(100), z.number().int().min(0).max(100)])
  .refine(([min, max]) => min <= max, "Range min must be <= max");

// Verdict bands type
type VerdictBands = {
  true: [number, number];
  mostlyTrue: [number, number];
  leaningTrue: [number, number];
  mixed: [number, number];
  leaningFalse: [number, number];
  mostlyFalse: [number, number];
  false: [number, number];
};

// Centrality weights type
type CentralityWeights = {
  high: number;
  medium: number;
  low: number;
};

// Quality gates type
type QualityGates = {
  gate1OpinionThreshold: number;
  gate1SpecificityThreshold: number;
  gate1MinContentWords: number;
  gate4MinSourcesHigh: number;
  gate4MinSourcesMedium: number;
  gate4QualityThresholdHigh: number;
  gate4QualityThresholdMedium: number;
  gate4AgreementThresholdHigh: number;
  gate4AgreementThresholdMedium: number;
};

// Validators for calculation config
function validateBandsContiguous(bands: VerdictBands): boolean {
  const ordered: (keyof VerdictBands)[] = [
    "false",
    "mostlyFalse",
    "leaningFalse",
    "mixed",
    "leaningTrue",
    "mostlyTrue",
    "true",
  ];
  for (let i = 0; i < ordered.length - 1; i++) {
    const current = bands[ordered[i]];
    const next = bands[ordered[i + 1]];
    if (current[1] + 1 !== next[0]) return false;
  }
  return true;
}

function validateBandsComplete(bands: VerdictBands): boolean {
  return bands.false[0] === 0 && bands.true[1] === 100;
}

function validateCentralityMonotonic(weights: CentralityWeights): boolean {
  return weights.high >= weights.medium && weights.medium >= weights.low;
}

function validateGate4Hierarchy(gates: QualityGates): boolean {
  return (
    gates.gate4MinSourcesHigh >= gates.gate4MinSourcesMedium &&
    gates.gate4QualityThresholdHigh >= gates.gate4QualityThresholdMedium &&
    gates.gate4AgreementThresholdHigh >= gates.gate4AgreementThresholdMedium
  );
}

export const CalcConfigSchema = z.object({
  verdictBands: z
    .object({
      true: IntRangeTuple,
      mostlyTrue: IntRangeTuple,
      leaningTrue: IntRangeTuple,
      mixed: IntRangeTuple,
      leaningFalse: IntRangeTuple,
      mostlyFalse: IntRangeTuple,
      false: IntRangeTuple,
    })
    .refine(validateBandsContiguous, "Verdict bands must be contiguous")
    .refine(validateBandsComplete, "Bands must cover 0-100 completely"),

  aggregation: z.object({
    centralityWeights: z
      .object({
        high: z.number().min(1).max(10),
        medium: z.number().min(1).max(10),
        low: z.number().min(0.1).max(5),
      })
      .refine(
        validateCentralityMonotonic,
        "Centrality weights must be monotonic: high >= medium >= low",
      ),
    harmPotentialMultiplier: z.number().min(1).max(5),
    contestationWeights: z.object({
      established: z.number().min(0).max(1),
      disputed: z.number().min(0).max(1),
      opinion: z.number().min(0).max(1),
    }),
  }),

  sourceReliability: z.object({
    confidenceThreshold: z.number().min(0).max(1),
    consensusThreshold: z.number().min(0).max(1),
    defaultScore: z.number().min(0).max(1),
  }),

  qualityGates: z
    .object({
      gate1OpinionThreshold: z.number().min(0).max(1),
      gate1SpecificityThreshold: z.number().min(0).max(1),
      gate1MinContentWords: z.number().int().min(1).max(20),
      gate4MinSourcesHigh: z.number().int().min(1).max(10),
      gate4MinSourcesMedium: z.number().int().min(1).max(10),
      gate4QualityThresholdHigh: z.number().min(0).max(1),
      gate4QualityThresholdMedium: z.number().min(0).max(1),
      gate4AgreementThresholdHigh: z.number().min(0).max(1),
      gate4AgreementThresholdMedium: z.number().min(0).max(1),
    })
    .refine(
      validateGate4Hierarchy,
      "Gate 4 'High' thresholds must be >= 'Medium' thresholds",
    ),

  contestationPenalties: z
    .object({
      established: z.number().int().min(-50).max(0),
      disputed: z.number().int().min(-50).max(0),
    })
    .refine(
      (p) => p.established <= p.disputed,
      "Established penalty should be >= disputed (more severe)",
    ),

  deduplication: z.object({
    evidenceScopeThreshold: z.number().min(0).max(1),
    claimSimilarityThreshold: z.number().min(0).max(1),
    contextMergeThreshold: z.number().min(0).max(1),
  }),

  mixedConfidenceThreshold: z.number().int().min(0).max(100),
});

export type CalcConfig = z.infer<typeof CalcConfigSchema>;

export const DEFAULT_CALC_CONFIG: CalcConfig = {
  verdictBands: {
    true: [86, 100],
    mostlyTrue: [72, 85],
    leaningTrue: [58, 71],
    mixed: [43, 57],
    leaningFalse: [29, 42],
    mostlyFalse: [15, 28],
    false: [0, 14],
  },
  aggregation: {
    centralityWeights: {
      high: 3.0,
      medium: 2.0,
      low: 1.0,
    },
    harmPotentialMultiplier: 1.5,
    contestationWeights: {
      established: 0.3,
      disputed: 0.5,
      opinion: 1.0,
    },
  },
  sourceReliability: {
    confidenceThreshold: 0.8,
    consensusThreshold: 0.2,
    defaultScore: 0.5,
  },
  qualityGates: {
    gate1OpinionThreshold: 0.7,
    gate1SpecificityThreshold: 0.3,
    gate1MinContentWords: 3,
    gate4MinSourcesHigh: 3,
    gate4MinSourcesMedium: 2,
    gate4QualityThresholdHigh: 0.7,
    gate4QualityThresholdMedium: 0.5,
    gate4AgreementThresholdHigh: 0.7,
    gate4AgreementThresholdMedium: 0.5,
  },
  contestationPenalties: {
    established: -12,
    disputed: -8,
  },
  deduplication: {
    evidenceScopeThreshold: 0.85,
    claimSimilarityThreshold: 0.85,
    contextMergeThreshold: 0.7,
  },
  mixedConfidenceThreshold: 60,
};

// ============================================================================
// PROMPT CONFIG SCHEMA (prompt.v1)
// ============================================================================

// Prompt frontmatter schema
const PromptFrontmatterSchema = z.object({
  version: z.string().regex(/^\d+\.\d+(\.\d+)?(-[\w]+)?$/),
  pipeline: z.enum([
    "orchestrated",
    "monolithic-canonical",
    "monolithic-dynamic",
    "source-reliability",
  ]),
  description: z.string().optional(),
  lastModified: z.string().optional(),
  variables: z
    .array(z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/))
    .optional(),
  requiredSections: z.array(z.string()).optional(),
});

export type PromptFrontmatter = z.infer<typeof PromptFrontmatterSchema>;

// ============================================================================
// PROMPT VALIDATION FUNCTIONS
// ============================================================================

function validateHasSections(content: string): boolean {
  return /^## [A-Z][A-Z0-9_]+\s*$/m.test(content);
}

function validateNoDuplicateSections(content: string): boolean {
  const sections = content.match(/^## ([A-Z][A-Z0-9_]+)\s*$/gm) || [];
  const names = sections.map((s) => s.replace(/^## /, "").trim());
  return names.length === new Set(names).size;
}

function extractVariablesFromContent(content: string): string[] {
  const matches = content.match(/\$\{(\w+)\}/g) || [];
  return matches.map((v) => v.slice(2, -1));
}

/**
 * Validate prompt content (markdown with YAML frontmatter)
 *
 * LIMITATION: This uses a simple YAML parser that only supports inline syntax:
 *   variables: [foo, bar]
 * NOT multi-line block syntax:
 *   variables:
 *     - foo
 *     - bar
 *
 * For full prompt management, use /admin/config?type=prompt which has dedicated prompt tooling.
 * This validation is for basic structural checks only.
 */
export function validatePromptContent(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!frontmatterMatch) {
    errors.push("Prompt must start with YAML frontmatter (--- block)");
    return { valid: false, errors, warnings };
  }

  // Basic frontmatter checks (without full YAML parsing)
  const frontmatterYaml = frontmatterMatch[1];

  // Check for required fields using regex (more robust than simple YAML parsing)
  if (!/^version:\s*.+$/m.test(frontmatterYaml)) {
    errors.push("Frontmatter must include 'version' field");
  }
  if (!/^pipeline:\s*.+$/m.test(frontmatterYaml)) {
    errors.push("Frontmatter must include 'pipeline' field");
  }

  // Check for multi-line YAML constructs that our simple parser can't handle
  if (/^  - /m.test(frontmatterYaml)) {
    warnings.push(
      "Frontmatter uses multi-line YAML arrays which cannot be fully validated here. " +
      "Use /admin/config?type=prompt for full prompt validation."
    );
  }

  // Check for sections in the body
  const body = content.slice(frontmatterMatch[0].length);
  if (!validateHasSections(body)) {
    errors.push("Prompt must contain at least one ## SECTION_NAME header");
  }

  if (!validateNoDuplicateSections(body)) {
    errors.push("Prompt contains duplicate section headers");
  }

  // Try to parse with simple YAML for basic validation (but don't fail on parse errors)
  try {
    const frontmatter = parseSimpleYaml(frontmatterYaml);

    // Validate version format if we got it
    const version = frontmatter.version;
    if (version && typeof version === "string") {
      if (!/^\d+\.\d+(\.\d+)?(-[\w]+)?$/.test(version)) {
        errors.push(`Invalid version format: ${version}. Expected: X.Y.Z or X.Y.Z-suffix`);
      }
    }

    // Validate pipeline value if we got it
    const pipeline = frontmatter.pipeline;
    if (pipeline && typeof pipeline === "string") {
      const validPipelines = ["orchestrated", "monolithic-canonical", "monolithic-dynamic", "source-reliability"];
      if (!validPipelines.includes(pipeline)) {
        errors.push(`Invalid pipeline: ${pipeline}. Valid: ${validPipelines.join(", ")}`);
      }
    }

    // Check variable usage only if we successfully parsed variables
    if (Array.isArray(frontmatter.variables)) {
      const declaredVars = new Set(frontmatter.variables as string[]);
      const usedVars = extractVariablesFromContent(body);

      // Used but not declared
      const undeclared = usedVars.filter((v) => !declaredVars.has(v));
      if (undeclared.length > 0) {
        errors.push(`Variables used but not declared: ${undeclared.join(", ")}`);
      }

      // Declared but not used (warning only)
      const unusedDeclared = [...declaredVars].filter((v) => !usedVars.includes(v));
      if (unusedDeclared.length > 0) {
        warnings.push(`Variables declared but not used: ${unusedDeclared.join(", ")}`);
      }
    }
  } catch {
    // Simple YAML parser failed - that's OK for complex frontmatter
    warnings.push("Could not fully parse frontmatter YAML. Use /admin/config?type=prompt for detailed validation.");
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Simple YAML parser for frontmatter (handles basic key: value pairs)
 */
function parseSimpleYaml(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    let value: unknown = trimmed.slice(colonIndex + 1).trim();

    // Handle arrays (simple case: [item1, item2])
    if (typeof value === "string" && value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter((s) => s.length > 0);
    } else if (value === "true") {
      value = true;
    } else if (value === "false") {
      value = false;
    } else if (typeof value === "string" && !isNaN(Number(value))) {
      value = Number(value);
    } else if (typeof value === "string") {
      // Remove quotes
      value = value.replace(/^["']|["']$/g, "");
    }

    result[key] = value;
  }

  return result;
}

// ============================================================================
// SECRETS VALIDATION
// ============================================================================

const DENYLIST_PATTERNS = [
  /api[_-]?key/i,
  /secret[_-]?key/i,
  /access[_-]?token/i,
  /bearer[_-]?token/i,
  /password/i,
  /credential/i,
];

function getAllKeys(obj: object, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    keys.push(fullKey);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...getAllKeys(value as object, fullKey));
    }
  }
  return keys;
}

export function validateNoSecrets(content: object): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  for (const key of getAllKeys(content)) {
    if (DENYLIST_PATTERNS.some((p) => p.test(key))) {
      errors.push(
        `Field '${key}' appears to be a secret - not allowed in DB config`,
      );
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================================================
// CANONICALIZATION
// ============================================================================

/**
 * Deep sort object keys alphabetically
 */
function sortKeysDeep(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(sortKeysDeep);
  }
  if (obj && typeof obj === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = sortKeysDeep((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return obj;
}

/**
 * Canonicalize JSON config (search, calculation)
 */
export function canonicalizeJson(obj: object): string {
  return JSON.stringify(sortKeysDeep(obj), null, 2);
}

/**
 * Canonicalize markdown prompt
 * - Normalize line endings to \n
 * - Trim trailing whitespace per line
 * - Sort YAML keys in frontmatter
 * - Ensure single trailing newline
 */
/**
 * Canonicalize Markdown content for consistent hashing.
 *
 * IMPORTANT: This function strips trailing whitespace from each line.
 * This intentionally removes Markdown "hard line breaks" (two trailing spaces).
 * For LLM prompts, this is acceptable since:
 * - LLMs interpret newlines semantically, not via trailing spaces
 * - Trailing whitespace variations would cause hash differences for identical semantic content
 *
 * If standard Markdown hard breaks are needed in the future, use <br> tags instead.
 */
export function canonicalizeMarkdown(content: string): string {
  // Normalize line endings
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Extract frontmatter
  const frontmatterMatch = normalized.match(/^---\n([\s\S]*?)\n---\n/);
  if (frontmatterMatch) {
    const frontmatterYaml = frontmatterMatch[1];
    const body = normalized.slice(frontmatterMatch[0].length);

    // Check if frontmatter uses multi-line YAML (which we can't safely rewrite)
    const usesMultiLineYaml = /^  - /m.test(frontmatterYaml);

    if (!usesMultiLineYaml) {
      // Parse and re-serialize frontmatter with sorted keys (only for simple YAML)
      try {
        const parsed = parseSimpleYaml(frontmatterYaml);
        const sorted = sortKeysDeep(parsed) as Record<string, unknown>;
        const canonicalFrontmatter = Object.entries(sorted)
          .map(([k, v]) => {
            if (Array.isArray(v)) {
              return `${k}: [${v.map((i) => `"${i}"`).join(", ")}]`;
            }
            if (typeof v === "string") {
              return `${k}: "${v}"`;
            }
            return `${k}: ${v}`;
          })
          .join("\n");

        const canonicalBody = body
          .split("\n")
          .map((line) => line.trimEnd())
          .join("\n")
          .trimEnd();

        return `---\n${canonicalFrontmatter}\n---\n${canonicalBody}\n`;
      } catch {
        // Fall back to preserving frontmatter as-is
      }
    }

    // For complex YAML frontmatter, just normalize line endings and trailing whitespace
    // but preserve the original structure to avoid data loss
    const canonicalBody = body
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n")
      .trimEnd();

    return `---\n${frontmatterYaml}\n---\n${canonicalBody}\n`;
  }

  // Simple canonicalization for non-frontmatter content
  return (
    normalized
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n")
      .trimEnd() + "\n"
  );
}

/**
 * Canonicalize config content based on type
 */
export function canonicalizeContent(
  configType: ConfigType,
  content: string,
): string {
  if (configType === "prompt") {
    return canonicalizeMarkdown(content);
  }
  // JSON configs (search, calculation)
  const parsed = JSON.parse(content);
  return canonicalizeJson(parsed);
}

/**
 * Compute content hash (SHA-256)
 */
export function computeContentHash(canonicalizedContent: string): string {
  return crypto.createHash("sha256").update(canonicalizedContent).digest("hex");
}

// ============================================================================
// SCHEMA VALIDATION BY TYPE
// ============================================================================

/**
 * Validate config content based on type and schema version
 */
export function validateConfig(
  configType: ConfigType,
  content: string,
  schemaVersion: SchemaVersion,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    if (configType === "prompt") {
      return validatePromptContent(content);
    }

    // Parse JSON for search/calculation configs
    const parsed = JSON.parse(content);

    // Validate no secrets
    const secretCheck = validateNoSecrets(parsed);
    errors.push(...secretCheck.errors);
    warnings.push(...secretCheck.warnings);

    // Validate against schema
    if (configType === "search" && schemaVersion === "search.v1") {
      const result = SearchConfigSchema.safeParse(parsed);
      if (!result.success) {
        errors.push(
          ...result.error.issues.map(
            (i) => `${i.path.join(".")}: ${i.message}`,
          ),
        );
      }
    } else if (configType === "calculation" && schemaVersion === "calc.v1") {
      const result = CalcConfigSchema.safeParse(parsed);
      if (!result.success) {
        errors.push(
          ...result.error.issues.map(
            (i) => `${i.path.join(".")}: ${i.message}`,
          ),
        );
      }
    } else {
      errors.push(`Unknown schema version: ${schemaVersion}`);
    }
  } catch (err) {
    errors.push(`Failed to parse content: ${err}`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Get schema version for config type
 */
export function getSchemaVersion(configType: ConfigType): SchemaVersion {
  switch (configType) {
    case "prompt":
      return "prompt.v1";
    case "search":
      return "search.v1";
    case "calculation":
      return "calc.v1";
  }
}

/**
 * Get default config for type
 */
export function getDefaultConfig(configType: ConfigType): string {
  switch (configType) {
    case "search":
      return canonicalizeJson(DEFAULT_SEARCH_CONFIG);
    case "calculation":
      return canonicalizeJson(DEFAULT_CALC_CONFIG);
    case "prompt":
      return ""; // No default prompt
  }
}
