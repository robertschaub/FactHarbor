import { VERDICT_BANDS } from "./truth-scale";
import type { ClaimVerdict } from "./types";
import { DEFAULT_PIPELINE_CONFIG } from "../config-schemas";

const UNVERIFIED_MAX_PERCENT = VERDICT_BANDS.LEANING_TRUE - 1;

export interface TemporalPromptTemplates {
  temporalPromptContractTemplate?: string;
  temporalPromptKnowledgeRuleAllowed?: string;
  temporalPromptKnowledgeRuleEvidenceOnly?: string;
  temporalPromptRecencyRuleSensitive?: string;
  temporalPromptRecencyRuleGeneral?: string;
  temporalPromptNoFreshEvidenceRule?: string;
  temporalPromptRelativeTimeRule?: string;
}

export interface TemporalPromptGuardOptions {
  currentDate?: Date;
  recencyMatters: boolean;
  allowModelKnowledge: boolean;
  templates?: TemporalPromptTemplates;
}

export interface RecencyEvidenceGuardOptions {
  recencyMatters: boolean;
  requireEvidenceAbove?: number;
  clampVerdictTo?: number;
  confidenceCeiling?: number;
}

export interface RecencyEvidenceGuardResult {
  verdicts: ClaimVerdict[];
  adjustedClaimIds: string[];
}

function formatCurrentDate(currentDate: Date): { isoDate: string; readableDate: string } {
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, "0");
  const day = String(currentDate.getDate()).padStart(2, "0");
  const isoDate = `${year}-${month}-${day}`;
  return {
    isoDate,
    readableDate: isoDate,
  };
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return out;
}

export function buildTemporalPromptGuard({
  currentDate = new Date(),
  recencyMatters,
  allowModelKnowledge,
  templates,
}: TemporalPromptGuardOptions): string {
  const { isoDate, readableDate } = formatCurrentDate(currentDate);
  const choose = (primary: string | undefined, fallback: string | undefined): string =>
    String((primary && primary.trim() ? primary : fallback) || "");
  const resolvedTemplates = {
    temporalPromptContractTemplate: choose(
      templates?.temporalPromptContractTemplate,
      DEFAULT_PIPELINE_CONFIG.temporalPromptContractTemplate,
    ),
    temporalPromptKnowledgeRuleAllowed: choose(
      templates?.temporalPromptKnowledgeRuleAllowed,
      DEFAULT_PIPELINE_CONFIG.temporalPromptKnowledgeRuleAllowed,
    ),
    temporalPromptKnowledgeRuleEvidenceOnly: choose(
      templates?.temporalPromptKnowledgeRuleEvidenceOnly,
      DEFAULT_PIPELINE_CONFIG.temporalPromptKnowledgeRuleEvidenceOnly,
    ),
    temporalPromptRecencyRuleSensitive: choose(
      templates?.temporalPromptRecencyRuleSensitive,
      DEFAULT_PIPELINE_CONFIG.temporalPromptRecencyRuleSensitive,
    ),
    temporalPromptRecencyRuleGeneral: choose(
      templates?.temporalPromptRecencyRuleGeneral,
      DEFAULT_PIPELINE_CONFIG.temporalPromptRecencyRuleGeneral,
    ),
    temporalPromptNoFreshEvidenceRule: choose(
      templates?.temporalPromptNoFreshEvidenceRule,
      DEFAULT_PIPELINE_CONFIG.temporalPromptNoFreshEvidenceRule,
    ),
    temporalPromptRelativeTimeRule: choose(
      templates?.temporalPromptRelativeTimeRule,
      DEFAULT_PIPELINE_CONFIG.temporalPromptRelativeTimeRule,
    ),
  };

  const knowledgeRule = allowModelKnowledge
    ? resolvedTemplates.temporalPromptKnowledgeRuleAllowed
    : resolvedTemplates.temporalPromptKnowledgeRuleEvidenceOnly;
  const recencyRule = recencyMatters
    ? resolvedTemplates.temporalPromptRecencyRuleSensitive
    : resolvedTemplates.temporalPromptRecencyRuleGeneral;

  return renderTemplate(resolvedTemplates.temporalPromptContractTemplate, {
    CURRENT_DATE_ISO: isoDate,
    CURRENT_DATE_READABLE: readableDate,
    KNOWLEDGE_RULE: knowledgeRule,
    RECENCY_RULE: recencyRule,
    NO_FRESH_EVIDENCE_RULE: resolvedTemplates.temporalPromptNoFreshEvidenceRule,
    RELATIVE_TIME_RULE: resolvedTemplates.temporalPromptRelativeTimeRule,
  });
}

export function applyRecencyEvidenceGuard(
  claimVerdicts: ClaimVerdict[],
  options: RecencyEvidenceGuardOptions,
): RecencyEvidenceGuardResult {
  if (!options.recencyMatters || claimVerdicts.length === 0) {
    return { verdicts: claimVerdicts, adjustedClaimIds: [] };
  }

  const requireEvidenceAbove = options.requireEvidenceAbove ?? VERDICT_BANDS.LEANING_TRUE;
  const clampVerdictTo = options.clampVerdictTo ?? UNVERIFIED_MAX_PERCENT;
  const confidenceCeiling = options.confidenceCeiling ?? 45;
  const adjustedClaimIds: string[] = [];

  const verdicts = claimVerdicts.map((verdict) => {
    const supportCount = Array.isArray(verdict.supportingEvidenceIds)
      ? verdict.supportingEvidenceIds.length
      : 0;
    const truthPercentage = Number.isFinite(verdict.truthPercentage)
      ? verdict.truthPercentage
      : verdict.verdict;

    if (supportCount > 0 || truthPercentage < requireEvidenceAbove) {
      return verdict;
    }

    adjustedClaimIds.push(verdict.claimId);
    const guardedTruth = Math.min(truthPercentage, clampVerdictTo);
    return {
      ...verdict,
      verdict: guardedTruth,
      truthPercentage: guardedTruth,
      confidence: Math.min(verdict.confidence, confidenceCeiling),
    };
  });

  return { verdicts, adjustedClaimIds };
}
