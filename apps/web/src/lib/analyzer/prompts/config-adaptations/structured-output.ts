/**
 * Structured Output Guidance - Provider-specific schema compliance optimizations
 *
 * Each LLM has different tendencies and capabilities for structured JSON output.
 * This module provides:
 * - Provider-specific output format guidance
 * - Schema compliance hints
 * - Retry prompts for schema validation failures
 *
 * @version 2.8.0 - New module for structured output hardening
 */

export type ProviderType = 'anthropic' | 'openai' | 'google' | 'mistral';

/**
 * Get provider-specific structured output guidance for understanding phase
 */
export function getStructuredOutputGuidance(provider: ProviderType): string {
  switch (provider) {
    case 'anthropic':
      return `
## JSON OUTPUT REQUIREMENTS (Claude)

**Format Rules:**
- Return ONLY a valid JSON object (no markdown code fences in output)
- Use empty strings "" for optional string fields (never null)
- Use empty arrays [] for optional array fields (never null)
- Ensure all required fields are present

**Field Validation:**
- id fields: Use exact format specified (SC1, E1, CTX_XXX)
- enum fields: Use exact string values (not variations)
- boolean fields: Use true/false (not "true"/"false")
- number fields: Use numeric values (not strings)`;

    case 'openai':
      return `
## JSON OUTPUT REQUIREMENTS (GPT)

**Critical for GPT:**
- Return ONLY a valid JSON object
- Include ALL required fields even if empty
- Use "" for empty strings (NEVER omit or use null)
- Use [] for empty arrays (NEVER omit)
- Ensure consistent field naming (exact case match)

**Common GPT Errors to Avoid:**
- Omitting optional fields entirely → Include with "" or []
- Using null instead of "" → Use empty string ""
- Inconsistent casing → Match schema exactly
- Adding extra fields → Only include schema fields`;

    case 'google':
      return `
## JSON OUTPUT REQUIREMENTS (Gemini)

**Critical for Gemini:**
- Return ONLY a valid JSON object (no explanatory text)
- Keep all string values within specified length limits
- Ensure array fields are always arrays (even single items)
- Use "" for empty strings, never null

**Length Enforcement:**
- Before output, verify each field meets length limits
- Truncate verbose values to fit limits
- No explanatory text outside JSON structure`;

    case 'mistral':
      return `
## JSON OUTPUT REQUIREMENTS (Mistral)

**Critical for Mistral:**
- Return ONLY valid JSON
- Follow field naming exactly as specified
- Include all required fields
- Use correct types for each field

**Validation Checklist:**
[ ] All required fields present
[ ] String fields are strings (quoted)
[ ] Number fields are numbers (unquoted)
[ ] Boolean fields are true/false (unquoted)
[ ] Arrays use square brackets []`;

    default:
      return '';
  }
}

/**
 * Get retry prompt for schema validation failure
 * Used when initial LLM output fails Zod schema validation
 */
export function getSchemaRetryPrompt(
  provider: ProviderType,
  schemaErrors: string[],
  originalOutput: string
): string {
  const errorSummary = schemaErrors.slice(0, 5).join('\n- ');

  const basePrompt = `Your previous response had schema validation errors. Please fix and resubmit.

## ERRORS FOUND:
- ${errorSummary}

## YOUR PREVIOUS OUTPUT (excerpt):
${originalOutput.substring(0, 500)}${originalOutput.length > 500 ? '...' : ''}

## INSTRUCTIONS:
1. Analyze the errors above
2. Fix the specific issues mentioned
3. Return ONLY the corrected JSON object (no explanations)`;

  // Add provider-specific guidance
  switch (provider) {
    case 'anthropic':
      return basePrompt + `

## CLAUDE-SPECIFIC FIX:
- Ensure all string fields use "" for empty values (not null)
- Check that array fields are arrays [] not null
- Verify boolean fields use true/false not strings`;

    case 'openai':
      return basePrompt + `

## GPT-SPECIFIC FIX:
- Include ALL required fields even if empty
- Use exact field names from schema (check casing)
- Don't add extra fields not in schema
- Use "" for empty strings, [] for empty arrays`;

    case 'google':
      return basePrompt + `

## GEMINI-SPECIFIC FIX:
- Check field lengths - truncate if over limits
- Ensure no explanatory text outside JSON
- Verify arrays are arrays (not single values)
- Use "" not null for empty strings`;

    case 'mistral':
      return basePrompt + `

## MISTRAL-SPECIFIC FIX:
- Verify each field type matches schema
- Check field names match exactly
- Ensure all required fields present
- Use correct JSON syntax (quotes, brackets)`;

    default:
      return basePrompt;
  }
}

/**
 * Get prefill text for Claude to improve JSON output reliability
 * Claude can benefit from "prefilling" the assistant response
 */
export function getClaudePrefill(taskType: string): string {
  switch (taskType) {
    case 'understand':
      return '{"impliedClaim":';
    case 'extract_evidence':
      return '{"evidenceItems":[';
    case 'verdict':
      return '{"contextId":';
    case 'context_refinement':
      return '{"requiresSeparateAnalysis":';
    default:
      return '{';
  }
}

/**
 * Get JSON mode instruction for OpenAI
 */
export function getOpenAIJsonModeHint(): string {
  return `\n\n**IMPORTANT**: Respond with valid JSON only. No markdown code fences, no explanatory text.`;
}

/**
 * Check if a schema error suggests a specific fix
 */
export function getSpecificFixForError(error: string): string | null {
  const errorLower = error.toLowerCase();

  // Common schema error patterns and fixes
  if (errorLower.includes('expected string') && errorLower.includes('null')) {
    return 'Use "" (empty string) instead of null for string fields';
  }
  if (errorLower.includes('expected array') && errorLower.includes('null')) {
    return 'Use [] (empty array) instead of null for array fields';
  }
  if (errorLower.includes('required')) {
    return 'Include the missing required field in output';
  }
  if (errorLower.includes('invalid enum value')) {
    return 'Use exact enum value from schema (check spelling and case)';
  }
  if (errorLower.includes('expected boolean')) {
    return 'Use true or false (not "true" or "false" strings)';
  }
  if (errorLower.includes('expected number')) {
    return 'Use numeric value (not a string)';
  }

  return null;
}

/**
 * Get enhanced retry prompt with specific fixes
 */
export function getEnhancedRetryPrompt(
  provider: ProviderType,
  schemaErrors: string[],
  originalOutput: string
): string {
  const basePrompt = getSchemaRetryPrompt(provider, schemaErrors, originalOutput);

  // Add specific fixes for each error
  const specificFixes = schemaErrors
    .map(err => getSpecificFixForError(err))
    .filter((fix): fix is string => fix !== null);

  if (specificFixes.length > 0) {
    return basePrompt + `

## SPECIFIC FIXES NEEDED:
${specificFixes.map((fix, i) => `${i + 1}. ${fix}`).join('\n')}`;
  }

  return basePrompt;
}
