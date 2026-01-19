/**
 * Schema Retry Logic with Error Recovery
 * 
 * Implements retry logic with schema-specific repair prompts
 * when LLM outputs fail validation.
 * 
 * Part of Phase 4: Targeted Quality Improvements
 * 
 * @version 1.0.0
 * @date 2026-01-19
 */

import { z } from 'zod';
import { generateText, NoObjectGeneratedError } from 'ai';
import { tryParseFirstJsonObject } from './json';

// ============================================================================
// TYPES
// ============================================================================

export interface SchemaRetryConfig {
  maxRetries: number;
  provider: 'anthropic' | 'openai' | 'google' | 'mistral';
  onRetry?: (attempt: number, error: string) => void;
}

export class SchemaComplianceError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: z.ZodError | Error
  ) {
    super(message);
    this.name = 'SchemaComplianceError';
  }
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

/**
 * Generate with automatic schema retry
 */
export async function generateWithSchemaRetry<T>(
  schema: z.ZodSchema<T>,
  generateFn: (retryPrompt?: string) => Promise<unknown>,
  config: SchemaRetryConfig
): Promise<T> {
  const { maxRetries, provider, onRetry } = config;
  
  let lastError: z.ZodError | Error | undefined;
  let lastOutput: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Generate output (with retry prompt if not first attempt)
      const retryPrompt = attempt > 0 && lastError && lastOutput
        ? buildSchemaRetryPrompt(lastError, lastOutput, provider)
        : undefined;
      
      const output = await generateFn(retryPrompt);
      lastOutput = output;

      // Parse and validate
      const parsed = schema.safeParse(output);
      
      if (parsed.success) {
        return parsed.data;
      }

      // Validation failed
      lastError = parsed.error;
      
      if (onRetry) {
        const errorSummary = summarizeSchemaErrors(parsed.error);
        onRetry(attempt + 1, errorSummary);
      }

      console.warn(`Schema validation failed (attempt ${attempt + 1}/${maxRetries + 1}):`, 
        summarizeSchemaErrors(parsed.error));
      
    } catch (error) {
      lastError = error as Error;
      
      // Special handling for NoObjectGeneratedError (AI SDK)
      if (error instanceof NoObjectGeneratedError) {
        console.warn('NoObjectGeneratedError - attempting JSON extraction from error payload');
        const extracted = tryExtractJsonFromError(error);
        if (extracted) {
          lastOutput = extracted;
          const parsed = schema.safeParse(extracted);
          if (parsed.success) {
            return parsed.data;
          }
          lastError = parsed.error;
        }
      }
      
      if (onRetry) {
        onRetry(attempt + 1, error instanceof Error ? error.message : String(error));
      }
    }
  }

  // All retries exhausted
  throw new SchemaComplianceError(
    `Failed to generate valid output after ${maxRetries + 1} attempts`,
    maxRetries + 1,
    lastError!
  );
}

// ============================================================================
// RETRY PROMPT GENERATION
// ============================================================================

/**
 * Build a retry prompt with error-specific guidance
 */
export function buildSchemaRetryPrompt(
  error: z.ZodError | Error,
  lastOutput: unknown,
  provider: 'anthropic' | 'openai' | 'google' | 'mistral'
): string {
  if (error instanceof z.ZodError) {
    return buildZodErrorRetryPrompt(error, lastOutput, provider);
  } else {
    return buildGenericErrorRetryPrompt(error, provider);
  }
}

/**
 * Build retry prompt for Zod validation errors
 */
function buildZodErrorRetryPrompt(
  error: z.ZodError,
  lastOutput: unknown,
  provider: 'anthropic' | 'openai' | 'google' | 'mistral'
): string {
  const errorSummary = summarizeSchemaErrors(error);
  const commonFixes = getCommonFixes(error);
  const excerpt = JSON.stringify(lastOutput, null, 2).slice(0, 500);

  const basePrompt = `Your previous output did not match the required schema. Please fix the following errors:

${errorSummary}

Common fixes needed:
${commonFixes.map((fix, i) => `${i + 1}. ${fix}`).join('\n')}

Your previous output (excerpt):
\`\`\`json
${excerpt}
\`\`\`

Please regenerate the COMPLETE output with all errors fixed. Ensure:
- All required fields are present
- Field types match exactly (string vs number vs boolean vs array)
- No null values (use empty string "" or empty array [] instead)
- Enum values match exactly (check spelling and case)
- Arrays contain the expected item types`;

  // Add provider-specific guidance
  switch (provider) {
    case 'anthropic':
      return `${basePrompt}

<claude_optimization>
Return ONLY valid JSON. Start your response with a curly brace {
</claude_optimization>`;
    
    case 'openai':
      return `${basePrompt}

CRITICAL: Return ONLY the JSON object. No explanations. No markdown. Just JSON.`;
    
    case 'google':
      return `${basePrompt}

STRICT FORMAT: Output must be valid JSON only. No text before or after the JSON.`;
    
    case 'mistral':
      return `${basePrompt}

**IMPORTANT**: Generate valid JSON matching the schema exactly. Double-check all field names and types.`;
    
    default:
      return basePrompt;
  }
}

/**
 * Build retry prompt for generic errors
 */
function buildGenericErrorRetryPrompt(
  error: Error,
  provider: 'anthropic' | 'openai' | 'google' | 'mistral'
): string {
  return `Your previous generation failed with error: ${error.message}

Please regenerate the output following the schema requirements exactly.`;
}

// ============================================================================
// ERROR ANALYSIS
// ============================================================================

/**
 * Summarize Zod errors into human-readable format
 */
function summarizeSchemaErrors(error: z.ZodError): string {
  const issues = error.issues.slice(0, 10); // Limit to first 10 errors
  return issues.map((issue) => {
    const path = issue.path.join('.');
    return `- ${path || 'root'}: ${issue.message} (code: ${issue.code})`;
  }).join('\n');
}

/**
 * Get common fixes for Zod errors
 */
function getCommonFixes(error: z.ZodError): string[] {
  const fixes = new Set<string>();
  
  for (const issue of error.issues) {
    switch (issue.code) {
      case 'invalid_type':
        if (issue.received === 'null') {
          fixes.add('Replace null values with appropriate defaults (empty string, empty array, 0, false)');
        } else if (issue.received === 'undefined') {
          fixes.add('Add missing required fields');
        } else {
          fixes.add(`Convert ${issue.received} to ${issue.expected} type`);
        }
        break;
      
      case 'invalid_enum_value':
        fixes.add(`Use exact enum values (check spelling and case sensitivity)`);
        break;
      
      case 'too_small':
        if (issue.type === 'array') {
          fixes.add(`Array must have at least ${issue.minimum} items`);
        } else if (issue.type === 'string') {
          fixes.add(`String must be at least ${issue.minimum} characters`);
        }
        break;
      
      case 'too_big':
        if (issue.type === 'array') {
          fixes.add(`Array must have at most ${issue.maximum} items`);
        } else if (issue.type === 'string') {
          fixes.add(`String must be at most ${issue.maximum} characters`);
        }
        break;
      
      case 'invalid_string':
        fixes.add('Ensure string format is correct (e.g., email, URL, date)');
        break;
      
      default:
        fixes.add(`Fix ${issue.code} error at ${issue.path.join('.')}`);
    }
  }
  
  return Array.from(fixes);
}

/**
 * Try to extract JSON from NoObjectGeneratedError
 */
function tryExtractJsonFromError(error: NoObjectGeneratedError): unknown | null {
  try {
    // The error might contain the response text
    const errorStr = error.toString();
    const textMatch = errorStr.match(/text: "(.*?)"/s);
    if (textMatch && textMatch[1]) {
      return tryParseFirstJsonObject(textMatch[1]);
    }
    
    // Try to access error properties directly
    if ((error as any).text) {
      return tryParseFirstJsonObject((error as any).text);
    }
    
    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Wrap AI SDK generateText with automatic retry
 */
export async function generateTextWithRetry<T>(
  schema: z.ZodSchema<T>,
  basePromptFn: () => { model: any; messages: any[]; temperature?: number; output: any },
  config: SchemaRetryConfig
): Promise<T> {
  return generateWithSchemaRetry(
    schema,
    async (retryPrompt) => {
      const promptConfig = basePromptFn();
      
      // Add retry guidance to last message if retrying
      if (retryPrompt) {
        const messages = [...promptConfig.messages];
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === 'user') {
          messages[messages.length - 1] = {
            ...lastMessage,
            content: `${lastMessage.content}\n\n${retryPrompt}`,
          };
        }
        promptConfig.messages = messages;
      }
      
      const result = await generateText(promptConfig);
      
      // Extract output based on AI SDK version
      return (result as any).output || (result as any).experimental_output;
    },
    config
  );
}
