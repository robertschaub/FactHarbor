/**
 * FactHarbor POC1 Analyzer v2.6.31
 *
 * Features:
 * - 7-level symmetric scale (True/Mostly True/Leaning True/Unverified/Leaning False/Mostly False/False)
 * - Multi-Proceeding analysis with Contested Factors
 * - Search tracking with LLM call counting
 * - Configurable source reliability via FH_SOURCE_BUNDLE_PATH
 * - Configurable search with FH_SEARCH_ENABLED and FH_SEARCH_DOMAIN_WHITELIST
 * - Fixed AI SDK output handling for different versions (output vs experimental_output)
 * - Claim dependency tracking (claimRole: attribution/source/timing/core)
 * - Dependency propagation (if prerequisite false, dependent claims flagged)
 * - Unified analysis depth regardless of punctuation
 * - Key Factors generated for procedural/legal topics in both modes
 * - Simplified schemas for better cross-provider compatibility
 * - Enhanced recency detection with news-related keywords (v2.6.22)
 * - Date-aware query variants for ALL search types (v2.6.22)
 * - Optional Gemini Grounded Search mode (v2.6.22)
 * - v2.6.23: Fixed input neutrality - canonicalizeScopes uses normalized input
 * - v2.6.23: Strengthened centrality heuristic with explicit examples
 * - v2.6.23: Generic recency detection (removed person names)
 * - v2.6.25: Removed originalInputDisplay from analysis pipeline
 * - v2.6.25: resolveAnalysisPromptInput no longer falls back to yes/no format
 * - v2.6.25: isRecencySensitive uses impliedClaim (normalized) for consistency
 * - v2.6.26: Force impliedClaim to normalized statement unconditionally
 * - v2.6.26: Show article summary for all input styles
 * - v2.6.30: Complete Input Neutrality - removed detectedInputType override
 * - v2.6.30: Inputs now follow IDENTICAL analysis paths
 * - v2.6.31: Modularized - extracted debug, config modules
 *
 * @version 2.6.31
 * @date January 2026
 */

import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { mistral } from "@ai-sdk/mistral";
import { generateText, Output } from "ai";
import { extractTextFromUrl } from "@/lib/retrieval";
import { searchWebWithProvider, getActiveSearchProviders } from "@/lib/web-search";
import { searchWithGrounding, isGroundedSearchAvailable, convertToFetchedSources } from "@/lib/search-gemini-grounded";
import { applyGate1ToClaims, applyGate4ToVerdicts } from "./analyzer/quality-gates";
import { normalizeSubClaimsImportance } from "./claim-importance";
import * as fs from "fs";
import * as path from "path";

// Modular imports
import { debugLog, clearDebugLog, agentLog } from "./analyzer/debug";
import {
  CONFIG,
  getActiveConfig,
  getDeterministicTemperature,
  extractParenAcronym,
  extractAllCapsToken,
  inferToAcronym,
  inferScopeTypeLabel,
  scopeTypeRank,
  proceedingTypeRank,
  detectInstitutionCode,
  sanitizeScopeShortAnswer,
} from "./analyzer/config";
import { calculateWeightedVerdictAverage } from "./analyzer/aggregation";
import {
  detectAndCorrectVerdictInversion,
  detectCounterClaim,
} from "./analyzer/verdict-corrections";
import {
  canonicalizeScopes,
  canonicalizeScopesWithRemap,
  ensureAtLeastOneScope,
} from "./analyzer/scopes";

// Configuration, helpers, and debug utilities imported from modular files above

// NOTE: scope canonicalization helpers extracted to ./analyzer/scopes

async function refineScopesFromEvidence(
  state: ResearchState,
  model: any,
): Promise<{ updated: boolean; llmCalls: number }> {
  if (!state.understanding) return { updated: false, llmCalls: 0 };

  const preRefineScopes = state.understanding.distinctProceedings || [];

  const facts = state.facts || [];
  // If we don't have enough evidence, skip refinement (avoid hallucinated scopes).
  if (facts.length < 8) return { updated: false, llmCalls: 0 };

  const analysisInput =
    state.understanding.impliedClaim ||
    state.originalInput ||
    state.originalText ||
    "";

  const shouldEnableScopePromptSelection =
    process.env.FH_ENABLE_SCOPE_PROMPT_SELECTION !== "false";
  const scopePromptMaxFactsRaw = parseInt(process.env.FH_SCOPE_PROMPT_MAX_FACTS || "40", 10);
  const scopePromptMaxFacts = Number.isFinite(scopePromptMaxFactsRaw)
    ? Math.max(8, Math.min(80, scopePromptMaxFactsRaw))
    : 40;

  const promptFacts = shouldEnableScopePromptSelection
    ? selectFactsForScopeRefinementPrompt(facts, analysisInput, scopePromptMaxFacts)
    : facts.slice(0, scopePromptMaxFacts);

  const factsText = promptFacts.map((f) => {
      const es = (f as any).evidenceScope;
      const esBits: string[] = [];
      if (es?.methodology) esBits.push(`method=${es.methodology}`);
      if (es?.boundaries) esBits.push(`boundaries=${es.boundaries}`);
      if (es?.geographic) esBits.push(`geo=${es.geographic}`);
      if (es?.temporal) esBits.push(`time=${es.temporal}`);
      const esStr = esBits.length > 0 ? ` | EvidenceScope: ${esBits.join("; ")}` : "";
      return `[${f.id}] ${f.fact} (Source: ${f.sourceTitle})${esStr}`;
    }).join("\n");

  const claimsText = (state.understanding.subClaims || [])
    .filter((c: any) => !c?.thesisRelevance || c.thesisRelevance === "direct")
    .slice(0, 12)
    .map((c: any) => `${c.id}: ${c.text}`)
    .join("\n");

  const schema = z.object({
    requiresSeparateAnalysis: z.boolean(),
    distinctProceedings: z.array(ANALYSIS_CONTEXT_SCHEMA),
    factScopeAssignments: z
      .array(z.object({ factId: z.string(), proceedingId: z.string() }))
      .default([]),
    claimScopeAssignments: z
      .array(z.object({ claimId: z.string(), proceedingId: z.string() }))
      .default([]),
  });

  const systemPrompt = `You are FactHarbor's EvidenceScope refinement engine.

Terminology (critical):
- ArticleContext: narrative/background framing of the article or input. ArticleContext is NOT a reason to split.
- EvidenceScope (analysis scope): a bounded analytical frame that should be analyzed separately. You will output these as distinctProceedings.
- Per-fact evidenceScope (source scope): methodology/boundaries/geography/temporal fields attached to individual facts.

Prompt synonyms:
- You may use the words scope / bounded context / boundary as synonyms for EvidenceScope (analysis scope).
- Avoid using the bare word "context" unless you explicitly mean ArticleContext or "bounded context" (EvidenceScope).

Your job is to identify DISTINCT EVIDENCE SCOPES (bounded analytical frames) that are actually present in the EVIDENCE provided.

CRITICAL RULES:
- Scope relevance: every EvidenceScope MUST be directly relevant to the input's specific topic. Do not keep marginally related scopes.
- When in doubt, use fewer scopes rather than including marginally relevant ones.
- Evidence-grounded only: every EvidenceScope MUST be supported by at least one factId from the list.
- Do NOT invent scopes based on guesswork or background knowledge.
- Split into multiple scopes when the evidence indicates different boundaries, methods, time periods, institutions, jurisdictions, datasets, or processes that should be analyzed separately.
- Do NOT split into multiple EvidenceScopes solely due to incidental geographic or temporal strings unless the evidence indicates they materially change the analytical frame (e.g., different jurisdictions/regulatory regimes, different datasets/studies, different measurement windows).
- Also split when evidence clearly covers different phases/components/metrics that are not directly comparable (e.g., upstream vs downstream phases, production vs use-phase, system-wide vs component-level metrics, different denominators/normalizations).
- Do NOT split into scopes just because there are pro vs con viewpoints. Viewpoints are not scopes.
- Do NOT split into scopes purely by EVIDENCE GENRE (e.g., expert quotes vs market adoption vs news reporting). Those are source types, not bounded analytical frames.
- If you split, prefer frames that reflect methodology/boundaries/process-chain segmentation present in the evidence (e.g., end-to-end vs component-level; upstream vs downstream; production vs use-phase).
- If the evidence does not clearly support multiple scopes, return exactly ONE scope.
- Use neutral, generic labels (no domain-specific hardcoding), BUT ensure each EvidenceScope name reflects 1–3 specific identifying details found in the evidence (per-fact evidenceScope fields and/or the EvidenceScope metadata).
- Different evidence reports may define DIFFERENT scopes. A single evidence report may contain MULTIPLE scopes. Do not restrict scopes to one-per-source.
- Put domain-specific details in metadata (e.g., court/institution/methodology/boundaries/geographic/standardApplied/decisionMakers/charges).
- Non-example: do NOT create separate EvidenceScopes from ArticleContext narrative background (e.g., \"political context\", \"media discourse\") unless the evidence itself defines distinct analytical frames.
- A scope with zero relevant claims/evidence should NOT exist.

Return JSON only matching the schema.`;

  const userPrompt = `INPUT (normalized):
"${analysisInput}"

FACTS (evidence):
${factsText}

CURRENT CLAIMS (may be incomplete):
${claimsText || "(none)"}

Return:
- requiresSeparateAnalysis
- distinctProceedings (1..N)
- factScopeAssignments: map each factId listed above to exactly one proceedingId (use proceedingId from your distinctProceedings)
- claimScopeAssignments: (optional) map any claimIds that clearly belong to a specific proceedingId
`;

  let refined: any;
  try {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: getDeterministicTemperature(0.1),
      output: Output.object({ schema }),
    });
    refined = extractStructuredOutput(result);
  } catch (err: any) {
    debugLog("refineScopesFromEvidence: FAILED", err?.message || String(err));
    return { updated: false, llmCalls: 0 };
  }

  const sp = schema.safeParse(refined);
  if (!sp.success) {
    debugLog("refineScopesFromEvidence: safeParse failed", {
      issues: sp.error.issues?.slice(0, 10),
    });
    return { updated: false, llmCalls: 1 };
  }

  const next = sp.data;
  if (!Array.isArray(next.distinctProceedings) || next.distinctProceedings.length === 0) {
    return { updated: false, llmCalls: 1 };
  }

  // Validate coverage: we need assignments for most facts, and at least one fact per scope.
  const assignmentCount = (next.factScopeAssignments || []).length;
  if (assignmentCount < Math.floor(promptFacts.length * 0.7)) {
    debugLog("refineScopesFromEvidence: rejected (insufficient fact assignments)", {
      factsInPrompt: promptFacts.length,
      totalFacts: facts.length,
      assignments: assignmentCount,
    });
    return { updated: false, llmCalls: 1 };
  }

  // Apply refined scopes.
  state.understanding = {
    ...state.understanding!,
    distinctProceedings: next.distinctProceedings,
    requiresSeparateAnalysis: !!next.requiresSeparateAnalysis && next.distinctProceedings.length > 1,
  };

  // Canonicalize IDs and keep a remap so we can remap fact/claim assignments.
  const canon = canonicalizeScopesWithRemap(analysisInput, state.understanding!);
  state.understanding = canon.understanding;

  const remapId = (id: string) => (id && canon.idRemap.has(id) ? canon.idRemap.get(id)! : id);

  // Remap any pre-existing fact/claim assignments across canonicalization (important when we don't
  // necessarily reassign every fact/claim during refinement).
  for (const f of state.facts || []) {
    const rp = String((f as any).relatedProceedingId || "");
    if (rp) (f as any).relatedProceedingId = remapId(rp);
  }
  for (const c of state.understanding!.subClaims || []) {
    const rp = String((c as any).relatedProceedingId || "");
    if (rp) (c as any).relatedProceedingId = remapId(rp);
  }

  // Optional: merge near-duplicate EvidenceScopes deterministically and remap assignments.
  // NOTE: Do this BEFORE applying factScopeAssignments/claimScopeAssignments so both are mapped consistently.
  let dedupMerged: Map<string, string> | null = null;
  if (process.env.FH_ENABLE_SCOPE_DEDUP !== "false") {
    const thr = parseFloat(process.env.FH_SCOPE_DEDUP_THRESHOLD || "0.85");
    const threshold = Number.isFinite(thr) ? Math.max(0, Math.min(1, thr)) : 0.85;
    const dedup = deduplicateScopes(state.understanding!.distinctProceedings || [], threshold);
    dedupMerged = dedup.merged;
    state.understanding!.distinctProceedings = dedup.scopes;

    // Remap any pre-existing fact/claim assignments (from earlier phases) to merged IDs.
    for (const f of state.facts || []) {
      const rp = String((f as any).relatedProceedingId || "");
      if (!rp) continue;
      if (dedupMerged.has(rp)) (f as any).relatedProceedingId = dedupMerged.get(rp)!;
    }
    for (const c of state.understanding!.subClaims || []) {
      const rp = String((c as any).relatedProceedingId || "");
      if (!rp) continue;
      if (dedupMerged.has(rp)) (c as any).relatedProceedingId = dedupMerged.get(rp)!;
    }
  }

  // IMPORTANT: finalize any proceedingId coming from the refinement output by applying both:
  // - canonicalization remap (remapId)
  // - scope dedup merge remap (dedupMerged), transitively (in case of chained merges)
  const finalizeProceedingId = (rawId: string): string => {
    let pid = remapId(rawId || "");
    if (!pid) return "";
    if (dedupMerged) {
      // Chase merges transitively to a stable representative ID.
      const seen = new Set<string>();
      while (pid && dedupMerged.has(pid) && !seen.has(pid)) {
        seen.add(pid);
        pid = dedupMerged.get(pid)!;
      }
    }
    return pid;
  };

  const factAssignments = new Map<string, string>();
  for (const a of next.factScopeAssignments || []) {
    const pid = finalizeProceedingId(a.proceedingId || "");
    if (!a.factId || !pid) continue;
    factAssignments.set(a.factId, pid);
  }

  // v2.6.31: Identify facts that were in promptFacts (sent to LLM) vs excluded facts
  const promptFactIds = new Set(promptFacts.map((f) => f.id));

  // Determine default scope for facts not included in promptFacts
  // Use the first/primary scope as the default (most analyses have one dominant scope)
  const defaultScopeId = (state.understanding!.distinctProceedings || [])[0]?.id || "";

  for (const f of state.facts) {
    const pid = factAssignments.get(f.id);
    if (pid) {
      // Fact was in promptFacts and got an assignment from LLM
      f.relatedProceedingId = pid;
    } else if (!promptFactIds.has(f.id) && defaultScopeId && !f.relatedProceedingId) {
      // Fact was NOT in promptFacts (excluded due to max limit) and has no assignment
      // Assign to default scope to prevent orphaning
      f.relatedProceedingId = defaultScopeId;
      debugLog("refineScopesFromEvidence: assigned excluded fact to default scope", {
        factId: f.id,
        defaultScopeId,
        reason: "fact excluded from promptFacts due to max limit",
      });
    }
    // Facts that were in promptFacts but got no assignment are left alone
    // (they may have pre-existing assignments or will be reconciled by ensureScopesCoverAssignments)
  }

  // IMPORTANT: ensure we never end up with orphaned assignments (facts/claims referencing a
  // scope ID that does not exist in distinctProceedings). This can happen because:
  // - understandClaim/extractFacts may assign IDs from the initial scope list
  // - refineScopesFromEvidence may overwrite distinctProceedings with a refined list that omits
  //   some previously-referenced scope IDs (claimScopeAssignments are optional)
  //
  // Strategy (generic):
  // - If an orphaned scopeId exists in the pre-refinement scope list, restore that scope.
  // - Otherwise, clear the orphaned assignment to keep the state consistent.
  const ensureScopesCoverAssignments = () => {
    const prevById = new Map<string, any>();
    for (const s of preRefineScopes as any[]) {
      if (s?.id) prevById.set(String(s.id), s);
    }

    const referenced = new Set<string>();
    for (const f of state.facts || []) {
      const rp = String((f as any)?.relatedProceedingId || "").trim();
      if (rp) referenced.add(rp);
    }
    for (const c of state.understanding?.subClaims || []) {
      const rp = String((c as any)?.relatedProceedingId || "").trim();
      if (rp) referenced.add(rp);
    }

    const scopesNow = state.understanding!.distinctProceedings || [];
    const scopeById = new Map<string, any>();
    for (const s of scopesNow as any[]) {
      if (s?.id) scopeById.set(String(s.id), s);
    }

    const restored: string[] = [];
    const cleared: string[] = [];
    for (const rp of referenced) {
      if (scopeById.has(rp)) continue;
      const prev = prevById.get(rp);
      if (prev) {
        scopesNow.push(prev);
        scopeById.set(rp, prev);
        restored.push(rp);
      } else {
        // We can't restore it; clear downstream references so UI/state stays consistent.
        for (const f of state.facts || []) {
          if (String((f as any)?.relatedProceedingId || "") === rp) (f as any).relatedProceedingId = "";
        }
        for (const c of state.understanding?.subClaims || []) {
          if (String((c as any)?.relatedProceedingId || "") === rp) (c as any).relatedProceedingId = "";
        }
        cleared.push(rp);
      }
    }

    if (restored.length > 0 || cleared.length > 0) {
      state.understanding!.distinctProceedings = scopesNow;
      // v2.6.31: Fix - use simple check instead of AND logic
      // If we have multiple scopes after restoration, enable separate analysis
      // (the AND logic incorrectly kept requiresSeparateAnalysis=false when scopes were restored)
      state.understanding!.requiresSeparateAnalysis = scopesNow.length > 1;
      debugLog("refineScopesFromEvidence: reconciled orphaned scope assignments", {
        restored: restored.slice(0, 8),
        cleared: cleared.slice(0, 8),
      });
    }
  };

  ensureScopesCoverAssignments();

  const factsPerScope = new Map<string, number>();
  for (const f of state.facts) {
    const pid = String(f.relatedProceedingId || "");
    if (!pid) continue;
    factsPerScope.set(pid, (factsPerScope.get(pid) || 0) + 1);
  }
  for (const s of state.understanding!.distinctProceedings || []) {
    const c = factsPerScope.get(s.id) || 0;
    if (c < 1) {
      debugLog("refineScopesFromEvidence: rejected (scope with zero evidence)", {
        scopeId: s.id,
        scopeName: s.name,
      });
      return { updated: false, llmCalls: 1 };
    }
  }

  // Optional: enforce EvidenceScope name alignment based on scope metadata + per-fact evidenceScope signals.
  if (process.env.FH_ENABLE_SCOPE_NAME_ALIGNMENT !== "false") {
    const thr = parseFloat(process.env.FH_SCOPE_NAME_ALIGNMENT_THRESHOLD || "0.3");
    const threshold = Number.isFinite(thr) ? Math.max(0, Math.min(1, thr)) : 0.3;
    state.understanding!.distinctProceedings = validateAndFixScopeNameAlignment(
      state.understanding!.distinctProceedings || [],
      state.facts || [],
      threshold,
    );
  }

  // Avoid over-splitting into “dimension scopes” (e.g., cost vs infrastructure) unless the
  // evidence indicates genuinely distinct analytical frames (methodology/boundaries/geography/temporal).
  if ((state.understanding!.distinctProceedings?.length ?? 0) > 1) {
    const scopesNow = state.understanding!.distinctProceedings || [];

    const scopeFrameKeys = new Set<string>();
    for (const s of scopesNow as any[]) {
      const m = String(s?.metadata?.methodology || "").trim();
      const b = String(s?.metadata?.boundaries || "").trim();
      const g = String(s?.metadata?.geographic || "").trim();
      const t = String(s?.metadata?.temporal || s?.temporal || "").trim();
      const key = [m, b, g, t].filter(Boolean).join("|");
      if (key) scopeFrameKeys.add(key);
    }

    const evidenceScopeKeysByScope = new Map<string, Set<string>>();
    for (const f of state.facts as any[]) {
      const pid = String(f?.relatedProceedingId || "");
      if (!pid) continue;
      const es = f?.evidenceScope;
      if (!es) continue;
      const mk = String(es?.methodology || "").trim();
      const bk = String(es?.boundaries || "").trim();
      const gk = String(es?.geographic || "").trim();
      const tk = String(es?.temporal || "").trim();
      const nk = String(es?.name || "").trim();
      const key = [nk, mk, bk, gk, tk].filter(Boolean).join("|");
      if (!key) continue;
      if (!evidenceScopeKeysByScope.has(pid)) evidenceScopeKeysByScope.set(pid, new Set());
      evidenceScopeKeysByScope.get(pid)!.add(key);
    }

    const distinctEvidenceScopeKeys = new Set<string>();
    for (const set of evidenceScopeKeysByScope.values()) {
      for (const k of set) distinctEvidenceScopeKeys.add(k);
    }
    const scopesWithEvidenceScope = Array.from(evidenceScopeKeysByScope.entries()).filter(
      ([, set]) => set.size > 0,
    ).length;

    const hasStrongFrameSignal =
      scopeFrameKeys.size >= 2 ||
      (distinctEvidenceScopeKeys.size >= 2 && scopesWithEvidenceScope >= 2);

    if (!hasStrongFrameSignal) {
      // Extra debug signal: if scopes are very similar by text/metadata, it's likely a dimension split.
      const thrRaw = parseFloat(process.env.FH_EVIDENCESCOPE_ALMOST_EQUAL_THRESHOLD || "0.70");
      const simThreshold = Number.isFinite(thrRaw) ? Math.max(0, Math.min(1, thrRaw)) : 0.7;
      const pairs: Array<{ a: string; b: string; sim: number }> = [];
      for (let i = 0; i < scopesNow.length; i++) {
        for (let j = i + 1; j < scopesNow.length; j++) {
          const sim = calculateScopeSimilarity(scopesNow[i] as any, scopesNow[j] as any);
          if (sim >= simThreshold) {
            pairs.push({ a: (scopesNow[i] as any).name, b: (scopesNow[j] as any).name, sim });
          }
        }
      }
      debugLog("refineScopesFromEvidence: rejected (likely dimension split, weak frame signals)", {
        scopeCount: scopesNow.length,
        scopeFrameKeyCount: scopeFrameKeys.size,
        distinctEvidenceScopeKeys: distinctEvidenceScopeKeys.size,
        scopesWithEvidenceScope,
        highSimilarityPairs: pairs.slice(0, 8),
      });
      return { updated: false, llmCalls: 1 };
    }
  }

  const claimAssignments = new Map<string, string>();
  for (const a of next.claimScopeAssignments || []) {
    const pid = finalizeProceedingId(a.proceedingId || "");
    if (!a.claimId || !pid) continue;
    claimAssignments.set(a.claimId, pid);
  }
  for (const c of state.understanding!.subClaims || []) {
    const pid = claimAssignments.get(c.id);
    if (pid) c.relatedProceedingId = pid;
  }

  // Ensure we never end up with zero scopes.
  state.understanding = ensureAtLeastOneScope(state.understanding!);

  // If we introduced multi-scope but claim coverage is thin, add minimal per-scope central claims.
  // (This is generic decomposition; it does not “hunt” for named scenarios.)
  if (state.understanding!.distinctProceedings.length > 1 && state.understanding!.subClaims.length <= 1) {
    const added = await requestSupplementalSubClaims(analysisInput, model, state.understanding!);
    if (added.length > 0) {
      state.understanding!.subClaims.push(...added);
    }
    return { updated: true, llmCalls: 2 };
  }

  return { updated: true, llmCalls: 1 };
}

function normalizeYesNoQuestionToStatement(input: string): string {
  const trimmed = input.trim().replace(/\?+$/, "");

  // Handle the common yes/no forms in a way that is stable and avoids bad grammar.
  // Goal: "Was the X fair and based on Y?" -> "The X was fair and based on Y"
  const m = trimmed.match(/^(was|were|is|are)\s+(.+)$/i);
  if (!m) {
    return trimmed;
  }

  const aux = m[1].toLowerCase(); // was|were|is|are
  const rest = m[2].trim();
  if (!rest) return trimmed;

  // Prefer splitting on a clear subject boundary (parentheses / comma) when present.
  const lastParen = rest.lastIndexOf(")");
  if (lastParen > 0 && lastParen < rest.length - 1) {
    const subject = rest.slice(0, lastParen + 1).trim();
    const predicate = rest.slice(lastParen + 1).trim();
    const capSubject = subject.charAt(0).toUpperCase() + subject.slice(1);
    const out = `${capSubject} ${aux} ${predicate}`.replace(/\s+/g, " ").trim();
    return out;
  }

  const commaIdx = rest.indexOf(",");
  if (commaIdx > 0 && commaIdx < rest.length - 1) {
    const subject = rest.slice(0, commaIdx).trim();
    const predicate = rest.slice(commaIdx + 1).trim();
    const capSubject = subject.charAt(0).toUpperCase() + subject.slice(1);
    const out = `${capSubject} ${aux} ${predicate}`.replace(/\s+/g, " ").trim();
    return out;
  }

  // Heuristic: split before common predicate starters (covers many "Was X fair/true/based..." forms).
  const predicateStarters = [
    "fair",
    "true",
    "false",
    "accurate",
    "correct",
    "legitimate",
    "legal",
    "valid",
    "based",
    "justified",
    "reasonable",
    "biased",
  ];
  const starterRe = new RegExp(`\\b(${predicateStarters.join("|")})\\b`, "i");
  const starterMatch = rest.match(starterRe);
  if (starterMatch && typeof starterMatch.index === "number" && starterMatch.index > 0) {
    const subject = rest.slice(0, starterMatch.index).trim();
    const predicate = rest.slice(starterMatch.index).trim();
    const capSubject = subject.charAt(0).toUpperCase() + subject.slice(1);
    if (subject && predicate) {
      const out = `${capSubject} ${aux} ${predicate}`.replace(/\s+/g, " ").trim();
      return out;
    }
  }

  // Fallback: don't guess a subject/predicate split; keep the remainder intact and use "It <aux> the case that …"
  // This is grammatical and stable, though not identical to a hand-written statement.
  const out = `It ${aux} the case that ${rest}`.replace(/\s+/g, " ").trim();
  return out;
}

/**
 * NEW v2.6.29: Generate an inverse claim query for counter-evidence search
 * For comparative claims like "X is better than Y", generates "Y is better than X"
 * For efficiency claims, generates the opposite ("inefficient", "less efficient", etc.)
 * Returns null if no meaningful inverse can be generated
 */
function generateInverseClaimQuery(claim: string): string | null {
  if (!claim || claim.length < 10) return null;

  const lowerClaim = claim.toLowerCase();

  // Pattern 1a: "Using X for Y is more Z than [using] W" - swap X and W
  // Example: "Using hydrogen for cars is more efficient than using electricity"
  // -> "Using electricity for cars is more efficient than hydrogen"
  const usingPattern = /using\s+(\w+(?:\s+\w+)?)\s+(?:for\s+\w+\s+)?(?:is|are)\s+(?:more\s+)?(\w+)\s+than\s+(?:using\s+)?(\w+(?:\s+\w+)?)/i;
  const usingMatch = claim.match(usingPattern);
  if (usingMatch) {
    const [, subjectA, adjective, subjectB] = usingMatch;
    // Generate proper inverse: swap subjects
    return `${subjectB.trim()} is more ${adjective} than ${subjectA.trim()}`;
  }

  // Pattern 1b: General comparative "X is/are [more] Z than Y" - swap X and Y
  const comparativePattern = /^(.+?)\s+(?:is|are)\s+(?:more\s+)?(\w+)\s+than\s+(.+)$/i;
  const compMatch = claim.match(comparativePattern);
  if (compMatch) {
    const [, subjectA, adjective, subjectB] = compMatch;
    // Clean up subjects (remove "using" prefix if present)
    const cleanA = subjectA.replace(/^using\s+/i, '').trim();
    const cleanB = subjectB.replace(/^using\s+/i, '').trim();
    // Generate inverse: "B is more [adjective] than A"
    return `${cleanB} is more ${adjective} than ${cleanA}`;
  }

  // Pattern 2: Efficiency/performance claims without explicit comparison
  // Look for key adjectives and generate opposite search
  const efficiencyWords = ['efficient', 'effective', 'better', 'superior', 'faster', 'cheaper', 'safer'];
  const oppositeMappings: Record<string, string> = {
    'efficient': 'inefficient',
    'effective': 'ineffective',
    'better': 'worse',
    'superior': 'inferior',
    'faster': 'slower',
    'cheaper': 'more expensive',
    'safer': 'more dangerous',
  };

  for (const word of efficiencyWords) {
    if (lowerClaim.includes(word)) {
      const opposite = oppositeMappings[word] || `not ${word}`;
      // Extract the main subject (first noun phrase)
      const subjectMatch = claim.match(/(?:using\s+)?(\w+(?:\s+\w+){0,2})/i);
      if (subjectMatch) {
        return `${subjectMatch[1]} ${opposite} evidence study`;
      }
    }
  }

  // Pattern 3: Simple negation for factual claims
  // For claims starting with "The X is/was/has", search for contradicting evidence
  const factualPattern = /^(?:the\s+)?(.+?)\s+(?:is|was|has|have|are|were)\s+(.+)/i;
  const factMatch = claim.match(factualPattern);
  if (factMatch) {
    const [, subject, predicate] = factMatch;
    // Search for evidence that contradicts
    return `${subject.trim()} not ${predicate.trim().split(' ').slice(0, 3).join(' ')}`;
  }

  // Fallback: extract key terms and add contradiction modifiers
  const words = claim.split(/\s+/).filter(w => w.length > 3).slice(0, 4).join(' ');
  return `${words} false incorrect evidence against`;
}

/**
 * NEW v2.6.29: Calculate similarity between two strings (Jaccard similarity on words)
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  const words1 = new Set(normalize(text1));
  const words2 = new Set(normalize(text2));

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

function selectFactsForScopeRefinementPrompt(
  facts: ExtractedFact[],
  analysisInput: string,
  maxFacts: number,
): ExtractedFact[] {
  if (!Array.isArray(facts) || facts.length === 0) return [];
  if (facts.length <= maxFacts) return facts;

  const mustKeepIds = new Set<string>();
  for (const f of facts) {
    if (!f?.id) continue;
    if (f.category === "criticism") mustKeepIds.add(f.id);
    if (f.claimDirection === "contradicts") mustKeepIds.add(f.id);
    if (f.fromOppositeClaimSearch) mustKeepIds.add(f.id);
    if (f.evidenceScope) mustKeepIds.add(f.id);
  }

  const chosen: ExtractedFact[] = [];
  for (const f of facts) {
    if (f?.id && mustKeepIds.has(f.id)) chosen.push(f);
  }
  if (chosen.length >= maxFacts) return chosen.slice(0, maxFacts);

  const input = (analysisInput || "").trim();
  const scored = facts
    .filter((f) => f?.id && !mustKeepIds.has(f.id))
    .map((f) => {
      const score = input ? calculateTextSimilarity(input, f.fact || "") : 0;
      return { f, score };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.f.id).localeCompare(String(b.f.id));
    });

  for (const s of scored) {
    if (chosen.length >= maxFacts) break;
    chosen.push(s.f);
  }
  return chosen;
}

function calculateScopeSimilarity(a: Scope, b: Scope): number {
  const nameSim = calculateTextSimilarity(String(a?.name || ""), String(b?.name || ""));
  const subjectSim =
    a?.subject && b?.subject ? calculateTextSimilarity(String(a.subject), String(b.subject)) : 0;

  // NOTE: geographic/temporal can be noisy and should not dominate similarity/dedup.
  // Treat them as secondary modifiers, not primary identity signals.
  const primaryKeys = [
    "institution",
    "jurisdiction",
    "methodology",
    "boundaries",
    "standardApplied",
    "regulatoryBody",
  ];
  const secondaryKeys = ["geographic", "temporal"];

  const metaA: Record<string, any> = (a as any)?.metadata || {};
  const metaB: Record<string, any> = (b as any)?.metadata || {};

  let primarySim = 0;
  let primaryCount = 0;
  for (const k of primaryKeys) {
    const va = String((metaA as any)?.[k] ?? "").trim();
    const vb = String((metaB as any)?.[k] ?? "").trim();
    if (!va || !vb) continue;
    primarySim += calculateTextSimilarity(va, vb);
    primaryCount++;
  }
  if (primaryCount > 0) primarySim /= primaryCount;

  let secondarySim = 0;
  let secondaryCount = 0;
  for (const k of secondaryKeys) {
    const va = String((metaA as any)?.[k] ?? "").trim();
    const vb = String((metaB as any)?.[k] ?? "").trim();
    if (!va || !vb) continue;
    secondarySim += calculateTextSimilarity(va, vb);
    secondaryCount++;
  }
  if (secondaryCount > 0) secondarySim /= secondaryCount;

  // Weighted average: name (45%), primary metadata (30%), subject (20%), geo/time (5%)
  return nameSim * 0.45 + primarySim * 0.3 + subjectSim * 0.2 + secondarySim * 0.05;
}

function mergeScopeMetadata(primary: Scope, duplicates: Scope[]): Scope {
  const merged: Scope = { ...(primary as any) };
  const outMeta: Record<string, any> = { ...(((primary as any).metadata as any) || {}) };

  for (const dup of duplicates || []) {
    const dm: Record<string, any> = ((dup as any)?.metadata as any) || {};
    for (const [k, v] of Object.entries(dm)) {
      const existing = outMeta[k];
      const isEmpty =
        existing === undefined ||
        existing === null ||
        (typeof existing === "string" && existing.trim() === "");
      if (isEmpty && v !== undefined && v !== null && !(typeof v === "string" && v.trim() === "")) {
        outMeta[k] = v;
      }
    }
  }

  (merged as any).metadata = outMeta;
  return merged;
}

function deduplicateScopes(
  scopes: Scope[],
  similarityThreshold: number = 0.85,
): { scopes: Scope[]; merged: Map<string, string> } {
  if (!Array.isArray(scopes) || scopes.length <= 1) return { scopes: scopes || [], merged: new Map() };

  const merged = new Map<string, string>();
  const kept: Scope[] = [];
  const processed = new Set<string>();

  for (let i = 0; i < scopes.length; i++) {
    const cur = scopes[i];
    if (!cur?.id) continue;
    if (processed.has(cur.id)) continue;

    const dups: Scope[] = [];
    for (let j = i + 1; j < scopes.length; j++) {
      const other = scopes[j];
      if (!other?.id) continue;
      if (processed.has(other.id)) continue;
      const sim = calculateScopeSimilarity(cur, other);
      if (sim >= similarityThreshold) {
        dups.push(other);
        processed.add(other.id);
        merged.set(other.id, cur.id);
      }
    }

    const keptScope = dups.length > 0 ? mergeScopeMetadata(cur, dups) : cur;
    kept.push(keptScope);
    processed.add(cur.id);
  }

  return { scopes: kept, merged };
}

function validateAndFixScopeNameAlignment(
  scopes: Scope[],
  facts: ExtractedFact[],
  similarityThreshold: number,
): Scope[] {
  if (!Array.isArray(scopes) || scopes.length === 0) return scopes || [];
  if (!Array.isArray(facts) || facts.length === 0) return scopes;

  // Prefer non-noisy identity keys for naming; geo/time should be secondary.
  const primaryMetaKeys = [
    "institution",
    "jurisdiction",
    "methodology",
    "boundaries",
    "standardApplied",
    "regulatoryBody",
  ];
  const secondaryMetaKeys = ["geographic", "temporal"];

  const factsByScope = new Map<string, ExtractedFact[]>();
  for (const f of facts) {
    const pid = String((f as any)?.relatedProceedingId || "").trim();
    if (!pid) continue;
    if (!factsByScope.has(pid)) factsByScope.set(pid, []);
    factsByScope.get(pid)!.push(f);
  }

  const covers = (name: string, identifier: string) => {
    const n = String(name || "").toLowerCase();
    const id = String(identifier || "").toLowerCase().trim();
    if (!id) return false;
    if (n.includes(id)) return true;
    return calculateTextSimilarity(n, id) >= similarityThreshold;
  };

  return scopes.map((s) => {
    const scopeFacts = factsByScope.get(String((s as any)?.id || "")) || [];
    const meta: Record<string, any> = ((s as any)?.metadata as any) || {};

    // Gather candidate identifiers from per-fact evidenceScope (prioritize common values)
    const counts = new Map<string, number>();
    const bump = (v: string, w: number = 1) => {
      const vv = String(v || "").trim();
      if (!vv) return;
      counts.set(vv, (counts.get(vv) || 0) + Math.max(1, Math.floor(w)));
    };
    for (const f of scopeFacts) {
      const es: any = (f as any)?.evidenceScope;
      if (!es) continue;
      // Higher weight for core methodology/boundaries/name signals.
      bump(es.name, 3);
      bump(es.methodology, 3);
      bump(es.boundaries, 3);
      // Lower weight for geo/time to avoid misleading names.
      bump(es.geographic, 1);
      bump(es.temporal, 1);
    }

    // Add stable metadata string values as lower-priority candidates
    for (const k of primaryMetaKeys) {
      const v = meta?.[k];
      if (typeof v === "string" && v.trim()) bump(v.trim());
    }
    for (const k of secondaryMetaKeys) {
      const v = meta?.[k];
      if (typeof v === "string" && v.trim()) bump(v.trim());
    }

    const identifiers = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([v]) => v);

    if (identifiers.length === 0) return s;

    const name = String((s as any)?.name || "");
    const alreadyAligned = identifiers.some((id) => covers(name, id));

    // Opportunistically copy consistent per-fact evidenceScope fields into metadata
    const uniqueValue = (vals: Array<string | undefined>) => {
      const set = new Set(vals.map((v) => String(v || "").trim()).filter(Boolean));
      return set.size === 1 ? Array.from(set)[0] : "";
    };
    const method = uniqueValue(scopeFacts.map((f) => (f as any)?.evidenceScope?.methodology));
    const bounds = uniqueValue(scopeFacts.map((f) => (f as any)?.evidenceScope?.boundaries));
    const geo = uniqueValue(scopeFacts.map((f) => (f as any)?.evidenceScope?.geographic));
    const temp = uniqueValue(scopeFacts.map((f) => (f as any)?.evidenceScope?.temporal));

    const nextMeta = { ...meta };
    if (!nextMeta.methodology && method) nextMeta.methodology = method;
    if (!nextMeta.boundaries && bounds) nextMeta.boundaries = bounds;
    if (!nextMeta.geographic && geo) nextMeta.geographic = geo;
    if (!nextMeta.temporal && temp) nextMeta.temporal = temp;

    if (alreadyAligned) {
      return { ...(s as any), metadata: nextMeta };
    }

    const primary = identifiers[0];
    const extras = identifiers.slice(1, 3);
    const improved =
      extras.length > 0 ? `${primary} (${extras.join(", ")}) scope` : `${primary} scope`;

    debugLog("validateAndFixScopeNameAlignment: fixing scope name", {
      scopeId: (s as any)?.id,
      oldName: (s as any)?.name,
      newName: improved,
      identifiers: identifiers.slice(0, 5),
    });

    return { ...(s as any), name: improved, metadata: nextMeta };
  });
}

/**
 * NEW v2.6.29: Check if a fact is a duplicate or near-duplicate of existing facts
 * Returns true if the fact should be skipped (is duplicate)
 */
function isDuplicateFact(newFact: ExtractedFact, existingFacts: ExtractedFact[], threshold: number = 0.85): boolean {
  const newFactLower = newFact.fact.toLowerCase().trim();

  for (const existing of existingFacts) {
    const existingLower = existing.fact.toLowerCase().trim();

    // Exact match
    if (newFactLower === existingLower) {
      return true;
    }

    // Near-duplicate based on text similarity
    const similarity = calculateTextSimilarity(newFact.fact, existing.fact);
    if (similarity >= threshold) {
      return true;
    }
  }

  return false;
}

/**
 * NEW v2.6.29: Filter out duplicate facts from a list, keeping the first occurrence
 * Optionally merges fromOppositeClaimSearch flag if duplicate found from opposite search
 */
function deduplicateFacts(newFacts: ExtractedFact[], existingFacts: ExtractedFact[]): ExtractedFact[] {
  const result: ExtractedFact[] = [];

  for (const fact of newFacts) {
    if (!isDuplicateFact(fact, existingFacts) && !isDuplicateFact(fact, result)) {
      result.push(fact);
    } else {
      // Log deduplication for debugging
      console.log(`[Analyzer] Deduplication: Skipping near-duplicate fact: "${fact.fact.substring(0, 60)}..."`);
    }
  }

  return result;
}

/**
 * Detect if a topic likely requires recent data
 * Returns true if dates, recent keywords, or temporal indicators suggest recency matters
 * v2.6.23: Removed domain-specific person names to comply with Generic by Design principle
 */
function isRecencySensitive(text: string, understanding?: ClaimUnderstanding): boolean {
  const lowerText = text.toLowerCase();

  // Check for recent date mentions (within last 3 years from current date - extended for better coverage)
  const currentYear = new Date().getFullYear();
  const recentYears = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];
  const yearPattern = /\b(20\d{2})\b/;
  const yearMatch = text.match(yearPattern);
  if (yearMatch) {
    const mentionedYear = parseInt(yearMatch[1]);
    if (recentYears.includes(mentionedYear)) {
      return true;
    }
  }

  // Check for recent temporal keywords
  const recentKeywords = [
    'recent', 'recently', 'latest', 'newest', 'current', 'now', 'today',
    'this year', 'this month', 'last month', 'last week', 'yesterday',
    'announced', 'released', 'published', 'unveiled', 'revealed'
  ];

  if (recentKeywords.some(keyword => lowerText.includes(keyword))) {
    return true;
  }

  // Check for news-related keywords that typically involve recent events (GENERIC - no person names)
  // These topics often have ongoing developments that require fresh search results
  const newsIndicatorKeywords = [
    // Legal/court outcomes (often have recent rulings)
    'trial', 'verdict', 'sentence', 'sentenced', 'ruling', 'ruled', 'convicted', 'acquitted',
    'indicted', 'charged', 'plea', 'appeal', 'court', 'judge', 'judgment',
    // Political events
    'election', 'elected', 'voted', 'vote', 'poll', 'campaign', 'inauguration',
    // Announcements and decisions
    'decision', 'announced', 'confirmed', 'approved', 'rejected', 'signed',
    // Investigations and proceedings
    'investigation', 'hearing', 'testimony', 'inquiry', 'probe',
    // Breaking news indicators
    'breaking', 'update', 'developing', 'just', 'new'
  ];

  if (newsIndicatorKeywords.some(keyword => lowerText.includes(keyword))) {
    return true;
  }

  // Check understanding for recent dates in scopes
  if (understanding?.distinctProceedings) {
    for (const scope of understanding.distinctProceedings) {
      const dateStr = scope.date || scope.temporal || "";
      if (dateStr && recentYears.some(year => dateStr.includes(String(year)))) {
        return true;
      }
    }
  }

  return false;
}

function getKnowledgeInstruction(text?: string, understanding?: ClaimUnderstanding): string {
  const recencyMatters = text ? isRecencySensitive(text, understanding) : false;

  if (CONFIG.allowModelKnowledge) {
    const recencyGuidance = recencyMatters ? `
### ⚠️ RECENT DATA DETECTED - PRIORITIZE WEB SEARCH RESULTS:

This topic appears to involve recent events, dates, or announcements. For recent information:
- **PRIORITIZE**: Web search results and fetched sources (these contain the most current data)
- **USE CAUTIOUSLY**: Your training knowledge may be outdated for recent events
- **WHEN TO USE KNOWLEDGE**: Only for established facts, standard procedures, or historical context that hasn't changed
- **WHEN TO USE SEARCH**: For specific dates, recent announcements, current status, or events from the past 1-2 years

Example: If sources say "November 2025" and your knowledge cutoff is earlier, TRUST THE SOURCES, not your training data.
` : '';

    return `## KNOWLEDGE SOURCE INSTRUCTIONS (CRITICAL - READ CAREFULLY)

You MUST actively use your background knowledge as evidence. This is NOT optional.
${recencyGuidance}
### WHAT YOU KNOW (USE IT!):
- Standard procedures in well-documented domains (regulatory, scientific, organizational, etc.)
- Well-documented public roles and responsibilities (e.g., who is responsible for a decision or process)
- Major public events and their outcomes that were widely reported
- Established institutional processes (how reviews, audits, or decisions are typically handled)
- Historical events and their documented outcomes

### WHEN TO USE BACKGROUND KNOWLEDGE:
1. **Process integrity claims**: If you know a process follows standard procedures, mark supports="yes", NOT "neutral"
2. **Decision-maker roles**: If you know who was responsible for a process or decision, use that knowledge
3. **Established facts**: If something is widely documented (e.g., a process followed proper procedures), don't mark it "unknown"
4. **Applicable standards**: If you know which standards apply, use that to assess correct application

### CRITICAL RULES:
- NEVER mark a factor as "neutral" or "unknown" if you have relevant background knowledge
- NEVER place the answer in the UNVERIFIED band (43-57%) if you actually know the answer from your training data
- Stakeholder contestation ("critics say X") is NOT the same as factual uncertainty
- If you know a process followed standard procedures, say supports="yes" even without explicit source confirmation

### EXAMPLE - CORRECT USAGE:
For "The review followed proper procedures":
- You KNOW the review process has established procedural requirements
- You KNOW standard procedure requirements apply in this context
- Therefore: Assign a truth percentage in the TRUE/MOSTLY-TRUE band (72-100%), not the UNVERIFIED band (43-57%).

Prioritize provided sources when available, but actively supplement with your knowledge.`;
  }
  return "Use ONLY the provided facts and sources. If information is missing, keep the answer in the UNVERIFIED band (43-57%). Do not add facts not present in the sources.";
}

/**
 * Get provider-specific prompt hints for better cross-provider compatibility
 * Different LLMs have different strengths/weaknesses with structured output
 */
function getProviderPromptHint(): string {
  const provider = (process.env.LLM_PROVIDER ?? "anthropic").toLowerCase();

  if (provider === "openai" || provider === "gpt") {
    return `
## OUTPUT FORMAT (IMPORTANT)
Return ONLY valid JSON matching the schema. All string fields must be non-empty (use descriptive text, not empty strings for required fields).
For array fields, always include at least one item where appropriate.`;
  }

  if (provider === "google" || provider === "gemini") {
    return `
## OUTPUT FORMAT (CRITICAL)
Return ONLY valid JSON. Do NOT include any explanation text outside the JSON.
- All enum fields must use EXACT values from the allowed options
- All boolean fields must be true or false (not strings)
- All number fields must be numbers (not strings)
- For empty arrays, use [] not null`;
  }

  if (provider === "mistral") {
    return `
## OUTPUT FORMAT (CRITICAL)
Return ONLY valid JSON matching the exact schema structure.
- Use the exact enum values specified (case-sensitive)
- Do not omit any required fields
- Use empty string "" for optional string fields with no value
- Use empty array [] for optional array fields with no items`;
  }

  // Anthropic/Claude handles structured output well, minimal hints needed
  return "";
}

/**
 * Safely extract structured output from AI SDK generateText result
 * Handles different SDK versions and result structures
 * Prevents "Cannot read properties of undefined (reading 'value')" errors
 */
function extractStructuredOutput(result: any): any {
  // Guard against null/undefined result
  if (!result) {
    console.log("[Analyzer] extractStructuredOutput: result is null/undefined");
    return null;
  }

  console.log("[Analyzer] extractStructuredOutput: Checking result with keys:", Object.keys(result));

  const safeGet = (getter: () => any) => {
    try {
      return getter();
    } catch {
      return undefined;
    }
  };

  // Try different possible locations for the output
  // Priority: result.output > result._output > result.experimental_output?.value > result.experimental_output > result.object
  // Note: AI SDK 6.x uses _output for structured output
  const output = safeGet(() => result.output);
  console.log("[Analyzer] extractStructuredOutput: result.output =", output !== undefined ? "exists" : "undefined");
  if (output !== undefined && output !== null) {
    const outputValue = safeGet(() => output?.value);
    if (outputValue !== undefined) {
      console.log("[Analyzer] extractStructuredOutput: Found in output.value");
      return outputValue;
    }
    console.log("[Analyzer] extractStructuredOutput: Found in output directly");
    return output;
  }

  // AI SDK 6.x stores structured output in _output
  const _output = safeGet(() => result._output);
  console.log("[Analyzer] extractStructuredOutput: result._output =", _output !== undefined ? "exists" : "undefined");
  if (_output !== undefined && _output !== null) {
    console.log("[Analyzer] extractStructuredOutput: Found structured output in result._output");
    return _output;
  }

  // Handle experimental_output safely (avoid "reading 'value' of undefined")
  const experimental = safeGet(() => result.experimental_output);
  if (experimental !== undefined && experimental !== null) {
    const experimentalValue = safeGet(() => experimental?.value);
    if (experimentalValue !== undefined) {
      return experimentalValue;
    }
    if (typeof experimental === "object" && !Array.isArray(experimental)) {
      return experimental;
    }
  }

  // Some SDK versions might put it directly in result.object
  const objectOutput = safeGet(() => result.object);
  if (objectOutput !== undefined && objectOutput !== null) {
    return objectOutput;
  }

  // Last resort: return the result itself if it looks like structured data
  if (typeof result === "object" && !Array.isArray(result) && result !== null) {
    // Check if it has properties that suggest it's the output object
    const keys = Object.keys(result);
    if (keys.length > 0 && !keys.includes("text") && !keys.includes("usage")) {
      return result;
    }
  }

  return null;
}

// ============================================================================
// QUALITY GATES (POC1 Specification)
// ============================================================================

/**
 * Gate 1: Claim Validation Result
 * Determines if a claim is factual (verifiable) vs opinion/prediction
 */
interface ClaimValidationResult {
  claimId: string;
  isFactual: boolean;
  opinionScore: number;        // 0-1 (higher = more opinion-like)
  specificityScore: number;    // 0-1 (higher = more specific/concrete)
  futureOriented: boolean;
  claimType: "FACTUAL" | "OPINION" | "PREDICTION" | "AMBIGUOUS";
  passed: boolean;
  failureReason?: string;
  validatedAt: Date;
}

/**
 * Gate 4: Verdict Validation Result
 * Determines if verdict has sufficient evidence confidence to publish
 */
interface VerdictValidationResult {
  verdictId: string;
  evidenceCount: number;
  averageSourceQuality: number;     // 0-1
  evidenceAgreement: number;        // 0-1 (% supporting vs contradicting)
  uncertaintyFactors: number;       // Count of hedging statements
  confidenceTier: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  publishable: boolean;
  failureReasons?: string[];
  validatedAt: Date;
}
// NOTE: Gate 1/4 implementations live in `apps/web/src/lib/analyzer/quality-gates.ts`.
// This file imports `applyGate1ToClaims` and `applyGate4ToVerdicts` so there is a single
// source of truth (reduces logic drift between the monolith and the modular analyzer).

// ============================================================================
// PSEUDOSCIENCE DETECTION
// ============================================================================

/**
 * Patterns that indicate pseudoscientific claims
 * These are mechanisms that contradict established physics/chemistry/biology
 */
const PSEUDOSCIENCE_PATTERNS = {
  // Water pseudoscience
  waterMemory: [
    /water\s*memory/i,
    /information\s*water/i,
    /informed\s*water/i,
    /structured\s*water/i,
    /hexagonal\s*water/i,
    /water\s*structur(e|ing)/i,
    /molecular\s*(re)?structur/i,
    /water\s*cluster/i,
    /energi[sz]ed\s*water/i,
    /revitali[sz]ed\s*water/i,
    /living\s*water/i,
    /grander/i,
    /emoto/i, // Masaru Emoto's debunked water crystal claims
  ],

  // Energy/vibration pseudoscience
  energyFields: [
    /life\s*force/i,
    /vital\s*energy/i,
    /bio[\s-]*energy/i,
    /subtle\s*energy/i,
    /energy\s*field/i,
    /healing\s*frequencies/i,
    /vibrational\s*(healing|medicine|therapy)/i,
    /frequency\s*(healing|therapy)/i,
    /chakra/i,
    /aura\s*(reading|healing|cleansing)/i,
  ],

  // Quantum misuse
  quantumMisuse: [
    /quantum\s*(healing|medicine|therapy|wellness)/i,
    /quantum\s*consciousness/i,
    /quantum\s*energy/i,
  ],

  // Homeopathy
  homeopathy: [
    /homeopath/i,
    /potenti[sz]ation/i,
    /succussion/i,
    /dilution.*memory/i,
    /like\s*cures\s*like/i,
  ],

  // Detox pseudoscience
  detoxPseudo: [
    /detox\s*(foot|ion|cleanse)/i,
    /toxin\s*removal.*(?:crystal|magnet|ion)/i,
    /ionic\s*cleanse/i,
  ],

  // Other pseudoscience
  other: [
    /crystal\s*(healing|therapy|energy)/i,
    /magnet\s*therapy/i,
    /magnetic\s*healing/i,
    /earthing\s*(therapy|healing)/i,
    /grounding\s*(therapy|healing|mat)/i,
    /orgone/i,
    /scalar\s*(wave|energy)/i,
    /tachyon/i,
    /zero[\s-]*point\s*energy.*healing/i,
  ],
};

/**
 * Known pseudoscience products/brands
 */
const PSEUDOSCIENCE_BRANDS = [
  /grander/i,
  /pimag/i,
  /kangen/i,
  /enagic/i,
  /alkaline\s*ionizer/i,
  /structured\s*water\s*unit/i,
];

/**
 * Scientific consensus statements that indicate a claim is debunked
 */
const DEBUNKED_INDICATORS = [
  /no\s*(scientific\s*)?(evidence|proof|basis)/i,
  /not\s*(scientifically\s*)?(proven|supported|verified)/i,
  /lacks?\s*(scientific\s*)?(evidence|proof|basis|foundation)/i,
  /contradict.*(?:physics|chemistry|biology|science)/i,
  /violates?\s*(?:laws?\s*of\s*)?(?:physics|thermodynamics)/i,
  /pseudoscien/i,
  /debunked/i,
  /disproven/i,
  /no\s*plausible\s*mechanism/i,
  /implausible/i,
  /scientifically\s*impossible/i,
];

interface PseudoscienceAnalysis {
  isPseudoscience: boolean;
  confidence: number; // 0-1
  categories: string[];
  matchedPatterns: string[];
  debunkIndicatorsFound: string[];
  recommendation: number | null;
}

/**
 * Analyze text for pseudoscience patterns
 */
function detectPseudoscience(
  text: string,
  claimText?: string,
): PseudoscienceAnalysis {
  const result: PseudoscienceAnalysis = {
    isPseudoscience: false,
    confidence: 0,
    categories: [],
    matchedPatterns: [],
    debunkIndicatorsFound: [],
    recommendation: null,
  };

  const combinedText = `${text} ${claimText || ""}`.toLowerCase();

  // Check each pseudoscience category
  for (const [category, patterns] of Object.entries(PSEUDOSCIENCE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(combinedText)) {
        if (!result.categories.includes(category)) {
          result.categories.push(category);
        }
        result.matchedPatterns.push(pattern.toString());
      }
    }
  }

  // Check for known pseudoscience brands
  for (const brand of PSEUDOSCIENCE_BRANDS) {
    if (brand.test(combinedText)) {
      result.matchedPatterns.push(brand.toString());
      if (!result.categories.includes("knownBrand")) {
        result.categories.push("knownBrand");
      }
    }
  }

  // Check for debunked indicators in sources
  for (const indicator of DEBUNKED_INDICATORS) {
    if (indicator.test(combinedText)) {
      result.debunkIndicatorsFound.push(indicator.toString());
    }
  }

  // Calculate confidence
  const patternScore = Math.min(result.matchedPatterns.length * 0.15, 0.6);
  const categoryScore = Math.min(result.categories.length * 0.2, 0.4);
  const debunkScore = Math.min(result.debunkIndicatorsFound.length * 0.2, 0.4);

  result.confidence = Math.min(patternScore + categoryScore + debunkScore, 1.0);

  // Determine if it's pseudoscience
  if (result.categories.length >= 1 && result.confidence >= 0.3) {
    result.isPseudoscience = true;

    const refutedRecommendation = 10;
    const uncertainRecommendation = 50;

    if (result.confidence >= 0.7 || result.debunkIndicatorsFound.length >= 2) {
      result.recommendation = refutedRecommendation;
    } else if (
      result.confidence >= 0.5 ||
      result.debunkIndicatorsFound.length >= 1
    ) {
      result.recommendation = refutedRecommendation;
    } else {
      result.recommendation = uncertainRecommendation;
    }
  }

  return result;
}


/**
 * Escalate verdict when pseudoscience is detected
 */
function escalatePseudoscienceVerdict(
  originalTruthPercentage: number,
  originalConfidence: number,
  pseudoAnalysis: PseudoscienceAnalysis,
): { truthPercentage: number; confidence: number; escalationReason?: string } {
  const normalizedTruth = normalizePercentage(originalTruthPercentage);
  const normalizedConfidence = normalizePercentage(originalConfidence);

  if (!pseudoAnalysis.isPseudoscience) {
    return { truthPercentage: normalizedTruth, confidence: normalizedConfidence };
  }

  const strength = normalizedTruth >= 72 ? 4 : normalizedTruth >= 50 ? 3 : normalizedTruth >= 35 ? 2 : 1;
  let newTruth = normalizedTruth;
  let newConfidence = normalizedConfidence;
  let escalationReason: string | undefined;

  if (strength >= 2 && pseudoAnalysis.confidence >= 0.5) {
    if (pseudoAnalysis.debunkIndicatorsFound.length >= 2) {
      newConfidence = Math.min(Math.max(newConfidence, 80), 95);
      newTruth = truthFromBand("refuted", newConfidence);
      escalationReason = `Claim contradicts scientific consensus (${pseudoAnalysis.categories.join(", ")}) - multiple debunk sources found`;
    } else if (pseudoAnalysis.debunkIndicatorsFound.length >= 1) {
      newConfidence = Math.min(Math.max(newConfidence, 70), 90);
      newTruth = truthFromBand("refuted", newConfidence);
      escalationReason = `Claim based on pseudoscience (${pseudoAnalysis.categories.join(", ")}) - contradicts established science`;
    } else if (pseudoAnalysis.confidence >= 0.6) {
      newConfidence = Math.min(Math.max(newConfidence, 65), 85);
      newTruth = truthFromBand("refuted", newConfidence);
      escalationReason = `Multiple pseudoscience patterns detected (${pseudoAnalysis.categories.join(", ")}) - no scientific basis`;
    }
  }

  if (strength == 3 && pseudoAnalysis.confidence >= 0.4) {
    newConfidence = Math.min(newConfidence, 40);
    newTruth = truthFromBand("uncertain", newConfidence);
    escalationReason = `Claimed mechanism (${pseudoAnalysis.categories.join(", ")}) lacks scientific basis`;
  }

  return { truthPercentage: newTruth, confidence: newConfidence, escalationReason };
}


/**
 * Determine article-level verdict considering pseudoscience
 *
 * Verdict Calibration:
 * - Returns a truth percentage (0-100) based on claim pattern and evidence strength
 */
function calculateArticleVerdictWithPseudoscience(
  claimVerdicts: Array<{
    verdict: number;
    confidence: number;
    isPseudoscience?: boolean;
  }>,
  pseudoAnalysis: PseudoscienceAnalysis,
): { verdict: number; confidence: number; reason?: string } {
  const refutedCount = claimVerdicts.filter((v) => v.verdict < 43).length;
  const uncertainCount = claimVerdicts.filter(
    (v) => v.verdict >= 43 && v.verdict < 72,
  ).length;
  const supportedCount = claimVerdicts.filter((v) => v.verdict >= 72).length;
  const total = claimVerdicts.length;

  if (pseudoAnalysis.isPseudoscience && pseudoAnalysis.confidence >= 0.5) {
    if (
      uncertainCount >= total * 0.5 &&
      pseudoAnalysis.debunkIndicatorsFound.length >= 1
    ) {
      const confidence = Math.min(
        85,
        70 + pseudoAnalysis.debunkIndicatorsFound.length * 5,
      );
      return {
        verdict: truthFromBand("refuted", confidence),
        confidence,
        reason: `Claims based on pseudoscience (${pseudoAnalysis.categories.join(", ")}) - contradicted by scientific consensus`,
      };
    }

    if (pseudoAnalysis.debunkIndicatorsFound.length >= 1) {
      const avgConfidence =
        claimVerdicts.reduce((sum, v) => sum + v.confidence, 0) / total;
      const confidence = Math.min(avgConfidence, 90);
      return {
        verdict: truthFromBand("refuted", confidence),
        confidence,
        reason: `Contains pseudoscientific claims (${pseudoAnalysis.categories.join(", ")}) - no scientific basis`,
      };
    }

    return {
      verdict: Math.round(35),
      confidence: 70,
      reason: `Claims rely on unproven mechanisms (${pseudoAnalysis.categories.join(", ")})`,
    };
  }

  if (refutedCount >= total * 0.8) {
    const confidence = 85;
    return { verdict: truthFromBand("refuted", confidence), confidence };
  }
  if (refutedCount >= total * 0.5) {
    const confidence = 80;
    return { verdict: truthFromBand("refuted", confidence), confidence };
  }
  if (refutedCount > 0 || uncertainCount >= total * 0.5) {
    return { verdict: Math.round(35), confidence: 70 };
  }
  if (supportedCount >= total * 0.7) {
    const confidence = 80;
    return { verdict: truthFromBand("strong", confidence), confidence };
  }
  const confidence = 65;
  return { verdict: truthFromBand("partial", confidence), confidence };
}


// ============================================================================
// 7-POINT TRUTH SCALE (Symmetric, neutral)
// ============================================================================

/**
 * SYMMETRIC 7-LEVEL SCALE (centered on 50%):
 *
 * | Range    | Verdict       | Score |
 * |----------|---------------|-------|
 * | 86-100%  | True          | +3    |
 * | 72-85%   | Mostly True   | +2    |
 * | 58-71%   | Leaning True  | +1    |
 * | 43-57%   | Unverified    |  0    |
 * | 29-42%   | Leaning False | -1    |
 * | 15-28%   | Mostly False  | -2    |
 * | 0-14%    | False         | -3    |
 */

type ClaimVerdict7Point =
  | "TRUE" // 86-100%, Score +3
  | "MOSTLY-TRUE" // 72-85%,  Score +2
  | "LEANING-TRUE" // 58-71%,  Score +1
  | "MIXED" // 43-57%,  Score  0, high confidence (evidence on both sides)
  | "UNVERIFIED" // 43-57%,  Score  0, low confidence (insufficient evidence)
  | "LEANING-FALSE" // 29-42%,  Score -1
  | "MOSTLY-FALSE" // 15-28%,  Score -2
  | "FALSE"; // 0-14%,   Score -3

type VerdictSummary7Point =
  | "YES" // 86-100%, Score +3
  | "MOSTLY-YES" // 72-85%,  Score +2
  | "LEANING-YES" // 58-71%,  Score +1
  | "MIXED" // 43-57%,  Score  0, high confidence
  | "UNVERIFIED" // 43-57%,  Score  0, low confidence
  | "LEANING-NO" // 29-42%,  Score -1
  | "MOSTLY-NO" // 15-28%,  Score -2
  | "NO"; // 0-14%,   Score -3

type ArticleVerdict7Point =
  | "TRUE" // 86-100%, Score +3
  | "MOSTLY-TRUE" // 72-85%,  Score +2
  | "LEANING-TRUE" // 58-71%,  Score +1
  | "MIXED" // 43-57%,  Score  0, high confidence (evidence on both sides)
  | "UNVERIFIED" // 43-57%,  Score  0, low confidence (insufficient evidence)
  | "LEANING-FALSE" // 29-42%,  Score -1
  | "MOSTLY-FALSE" // 15-28%,  Score -2
  | "FALSE"; // 0-14%,   Score -3

// Confidence threshold to distinguish MIXED from UNVERIFIED
const MIXED_CONFIDENCE_THRESHOLD = 60;

/**
 * Normalize truth percentage values (0-100)
 */
function normalizePercentage(value: number): number {
  if (!Number.isFinite(value)) return 50;
  const normalized = value >= 0 && value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, Math.round(normalized)));
}

function truthFromBand(
  band: "strong" | "partial" | "uncertain" | "refuted",
  confidence: number,
): number {
  const conf = normalizePercentage(confidence) / 100;
  switch (band) {
    case "strong":
      return Math.round(72 + 28 * conf);
    case "partial":
      return Math.round(50 + 35 * conf);
    case "uncertain":
      return Math.round(35 + 30 * conf);
    case "refuted":
      return Math.round(28 * (1 - conf));
  }
}


/**
 * Normalize truth percentage (0-100)
 * v2.6.30: Consolidated duplicate functions for input neutrality
 */
function calculateTruthPercentage(
  answerPercentage: number,
  _confidence: number,
): number {
  return normalizePercentage(answerPercentage);
}


/**
 * Map truth percentage to 7-point claim verdict
 * @param truthPercentage - The truth percentage (0-100)
 * @param confidence - Optional confidence score (0-100). Used to distinguish MIXED from UNVERIFIED in 43-57% range.
 */
function percentageToClaimVerdict(truthPercentage: number, confidence?: number): ClaimVerdict7Point {
  if (truthPercentage >= 86) return "TRUE";
  if (truthPercentage >= 72) return "MOSTLY-TRUE";
  if (truthPercentage >= 58) return "LEANING-TRUE";
  if (truthPercentage >= 43) {
    // Distinguish MIXED (high confidence, evidence on both sides) from UNVERIFIED (low confidence, insufficient evidence)
    const conf = confidence !== undefined ? normalizePercentage(confidence) : 0;
    return conf >= MIXED_CONFIDENCE_THRESHOLD ? "MIXED" : "UNVERIFIED";
  }
  if (truthPercentage >= 29) return "LEANING-FALSE";
  if (truthPercentage >= 15) return "MOSTLY-FALSE";
  return "FALSE";
}

/**
 * Map truth percentage to verdict answer
 * v2.6.30: Updated comment for input neutrality
 * @param truthPercentage - The truth percentage (0-100)
 * @param confidence - Optional confidence score (0-100). Used to distinguish MIXED from UNVERIFIED in 43-57% range.
 */
function percentageToVerdictSummary(
  truthPercentage: number,
  confidence?: number,
): VerdictSummary7Point {
  if (truthPercentage >= 86) return "YES";
  if (truthPercentage >= 72) return "MOSTLY-YES";
  if (truthPercentage >= 58) return "LEANING-YES";
  if (truthPercentage >= 43) {
    const conf = confidence !== undefined ? normalizePercentage(confidence) : 0;
    return conf >= MIXED_CONFIDENCE_THRESHOLD ? "MIXED" : "UNVERIFIED";
  }
  if (truthPercentage >= 29) return "LEANING-NO";
  if (truthPercentage >= 15) return "MOSTLY-NO";
  return "NO";
}

/**
 * Map truth percentage to article verdict
 * @param truthPercentage - The truth percentage (0-100)
 * @param confidence - Optional confidence score (0-100). Used to distinguish MIXED from UNVERIFIED in 43-57% range.
 */
function percentageToArticleVerdict(
  truthPercentage: number,
  confidence?: number,
): ArticleVerdict7Point {
  if (truthPercentage >= 86) return "TRUE";
  if (truthPercentage >= 72) return "MOSTLY-TRUE";
  if (truthPercentage >= 58) return "LEANING-TRUE";
  if (truthPercentage >= 43) {
    const conf = confidence !== undefined ? normalizePercentage(confidence) : 0;
    return conf >= MIXED_CONFIDENCE_THRESHOLD ? "MIXED" : "UNVERIFIED";
  }
  if (truthPercentage >= 29) return "LEANING-FALSE";
  if (truthPercentage >= 15) return "MOSTLY-FALSE";
  return "FALSE";
}

/**
 * Normalize article truth percentage (0-100)
 */
function calculateArticleTruthPercentage(
  verdictPercentage: number,
  _confidence: number,
): number {
  return normalizePercentage(verdictPercentage);
}

// ============================================================================
// WEIGHTED VERDICT CALCULATION (v2.6.30)
// ============================================================================

/**
 * Calculate claim weight based on centrality and confidence.
 * Higher centrality claims with higher confidence have more influence on the overall verdict.
 *
 * Weight = centralityMultiplier × (confidence / 100)
 * where centralityMultiplier: high=3.0, medium=2.0, low=1.0
 */
// NOTE: weighted aggregation helpers extracted to ./analyzer/aggregation

// NOTE: verdict correction helpers extracted to ./analyzer/verdict-corrections

/**
 * Legacy: Map confidence to claim verdict (for backward compatibility)
 */
function calibrateClaimVerdict(
  truthPercentage: number,
  confidence: number,
): ClaimVerdict7Point {
  const truthPct = calculateTruthPercentage(truthPercentage, confidence);
  return percentageToClaimVerdict(truthPct);
}


/**
 * Legacy: Map confidence to verdict answer (for backward compatibility)
 * v2.6.30: Updated comment for input neutrality
 */
function calibrateVerdictSummary(
  truthPercentage: number,
  confidence: number,
): VerdictSummary7Point {
  const truthPct = calculateTruthPercentage(truthPercentage, confidence);
  return percentageToVerdictSummary(truthPct);
}


/**
 * Map confidence to article verdict
 */
function calibrateArticleVerdict(
  truthPercentage: number,
  confidence: number,
): ArticleVerdict7Point {
  const truthPct = calculateArticleTruthPercentage(truthPercentage, confidence);
  return percentageToArticleVerdict(truthPct);
}


/**
 * Get color for 7-level verdict display
 */
function getVerdictColor(verdict: string): {
  bg: string;
  text: string;
  border: string;
} {
  switch (verdict) {
    case "TRUE":
    case "YES":
      return { bg: "#d4edda", text: "#155724", border: "#28a745" }; // Green
    case "MOSTLY-TRUE":
    case "MOSTLY-YES":
      return { bg: "#e8f5e9", text: "#2e7d32", border: "#66bb6a" }; // Light green
    case "LEANING-TRUE":
    case "LEANING-YES":
      return { bg: "#fff9c4", text: "#f57f17", border: "#ffeb3b" }; // Yellow
    case "UNVERIFIED":
      return { bg: "#fff3e0", text: "#e65100", border: "#ff9800" }; // Orange
    case "LEANING-FALSE":
    case "LEANING-NO":
      return { bg: "#ffccbc", text: "#bf360c", border: "#ff5722" }; // Dark orange
    case "MOSTLY-FALSE":
    case "MOSTLY-NO":
      return { bg: "#ffcdd2", text: "#c62828", border: "#f44336" }; // Red
    case "FALSE":
    case "NO":
      return { bg: "#b71c1c", text: "#ffffff", border: "#b71c1c" }; // Dark red
    default:
      return { bg: "#fff3e0", text: "#e65100", border: "#ff9800" }; // Orange default
  }
}

/**
 * Get highlight color for verdicts
 *
 * Maps 7-point verdicts to 3-color UI system:
 * - Green: TRUE, MOSTLY-TRUE, YES, MOSTLY-YES (well-supported)
 * - Yellow: LEANING-TRUE, LEANING-YES, UNVERIFIED, LEANING-FALSE, LEANING-NO (uncertain)
 * - Red: MOSTLY-FALSE, MOSTLY-NO, FALSE, NO (refuted)
 */
function getHighlightColor7Point(
  truthPercentage: number,
): "green" | "yellow" | "red" {
  const normalized = normalizePercentage(truthPercentage);
  if (normalized >= 72) return "green";
  if (normalized >= 43) return "yellow";
  return "red";
}


// ============================================================================
// TYPES
// ============================================================================

type InputType = "claim" | "article";
// v2.6.27: Renamed from AnalysisIntent for input neutrality
type AnalysisIntent = "verification" | "exploration" | "comparison" | "none";
type ClaimRole = "attribution" | "source" | "timing" | "core" | "unknown";

interface DecisionMaker {
  name: string;
  role: string;
  affiliation: string;
}

// Scope = A bounded analytical frame (unifies: legal proceedings, scientific methodologies, regulatory contexts)
// Replaces: DistinctProceeding, Context
interface Scope {
  id: string;                // e.g., "SCOPE_TSE", "SCOPE_WTW"
  name: string;              // Human-readable name
  shortName: string;         // Abbreviation

  // Unified fields (generic across domains)
  institution?: string;      // Court, agency, organization (was: court)
  jurisdiction?: string;     // Geographic/legal jurisdiction
  methodology?: string;      // Standard/method used (e.g., "ISO 14040", "WTW")
  boundaries?: string;       // What's included/excluded
  temporal?: string;         // Time period (was: date)
  subject: string;           // What's being analyzed
  criteria?: string[];       // Evaluation criteria (was: charges)
  outcome?: string;          // Result if known
  status: "concluded" | "ongoing" | "pending" | "unknown";

  // Extensible domain metadata (legal/scientific/regulatory fields, etc.)
  metadata?: Record<string, any>;

  // Legacy field mappings for backward compatibility
  court?: string;            // Alias for institution (legal domain)
  date?: string;             // Alias for temporal
  charges?: string[];        // Alias for criteria (legal domain)

  decisionMakers?: DecisionMaker[];
}

// Backward compatibility alias
type DistinctProceeding = Scope;

interface KeyFactor {
  factor: string;
  supports: "yes" | "no" | "neutral";
  explanation: string;
  isContested: boolean;
  contestedBy: string;
  contestationReason: string;
  factualBasis: "established" | "disputed" | "alleged" | "opinion" | "unknown";
}

interface FactorAnalysis {
  positiveFactors: number;
  negativeFactors: number;
  neutralFactors: number;
  contestedNegatives: number;
  verdictExplanation: string;
}

interface ProceedingAnswer {
  proceedingId: string;
  proceedingName: string;
  // Answer truth percentage (0-100)
  answer: number;
  confidence: number;
  // Truth percentage for display (0-100%)
  truthPercentage: number;
  shortAnswer: string;
  keyFactors: KeyFactor[];
  factorAnalysis?: FactorAnalysis;
}

// NEW v2.4.3: Search tracking
interface SearchQuery {
  query: string;
  iteration: number;
  focus: string;
  resultsCount: number;
  timestamp: string;
  searchProvider?: string;
}

interface ResearchState {
  originalInput: string;
  originalText: string;
  inputType: "text" | "url";
  understanding: ClaimUnderstanding | null;
  iterations: ResearchIteration[];
  facts: ExtractedFact[];
  sources: FetchedSource[];
  contradictionSearchPerformed: boolean;
  contradictionSourcesFound: number;
  // NEW v2.4.3: Track all searches
  searchQueries: SearchQuery[];
  // NEW v2.6.6: Track LLM calls
  llmCalls: number;
  researchQueriesSearched: Set<number>;
  // NEW v2.6.18: Track if decision-maker search was performed
  decisionMakerSearchPerformed: boolean;
  // NEW v2.6.22: Track if claim-level recency search was performed
  recentClaimsSearched: boolean;
  // NEW: Track if we've already done a targeted search for a specific central claim
  // that has no evidence/counter-evidence yet.
  centralClaimsSearched: Set<string>;
  // NEW v2.6.29: Track if inverse claim search has been performed
  inverseClaimSearchPerformed: boolean;
}

interface ClaimUnderstanding {
  detectedInputType: InputType;
  analysisIntent: AnalysisIntent;
  originalInputDisplay: string;
  impliedClaim: string;

  distinctProceedings: DistinctProceeding[];
  requiresSeparateAnalysis: boolean;
  proceedingContext: string;

  mainThesis: string;
  articleThesis: string;
  subClaims: Array<{
    id: string;
    text: string;
    type: "legal" | "procedural" | "factual" | "evaluative";
    claimRole: ClaimRole;
    dependsOn: string[];
    keyEntities: string[];
    // Three-attribute assessment for claim importance
    checkWorthiness: "high" | "medium" | "low";
    harmPotential: "high" | "medium" | "low";   // Does it impact high-stakes areas?
    centrality: "high" | "medium" | "low";      // Is it pivotal to the author's argument?
    isCentral: boolean; // Derived: true if centrality is "high"
    // v2.6.31: Thesis relevance - does this claim DIRECTLY test the main thesis?
    thesisRelevance: "direct" | "tangential" | "irrelevant";
    relatedProceedingId: string;
    approximatePosition: string;
    keyFactorId: string; // empty string if not mapped to any factor
  }>;
  distinctEvents: Array<{
    name: string;
    date: string;
    description: string;
  }>;
  legalFrameworks: string[];
  researchQueries: string[];
  riskTier: "A" | "B" | "C";
  // NEW: KeyFactors discovered during understanding phase
  keyFactors: Array<{
    id: string;
    evaluationCriteria: string;
    factor: string;
    category: "procedural" | "evidential" | "methodological" | "factual" | "evaluative";
  }>;
  // Gate 1 statistics (POC1 quality gate)
  gate1Stats?: {
    total: number;
    passed: number;
    filtered: number;
    centralKept: number;
  };
}

interface ResearchIteration {
  number: number;
  focus: string;
  queries: string[];
  sourcesFound: number;
  factsExtracted: number;
}

interface ExtractedFact {
  id: string;
  fact: string;
  category:
    | "legal_provision"
    | "evidence"
    | "expert_quote"
    | "statistic"
    | "event"
    | "criticism";
  specificity: "high" | "medium";
  sourceId: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceExcerpt: string;
  relatedProceedingId?: string;
  isContestedClaim?: boolean;
  claimSource?: string;
  // NEW v2.6.29: Claim direction - does this fact support or contradict the ORIGINAL user claim?
  // "supports" = fact supports the user's claim being true
  // "contradicts" = fact contradicts the user's claim (supports the OPPOSITE)
  // "neutral" = fact is contextual/background, doesn't directly support or contradict
  claimDirection?: "supports" | "contradicts" | "neutral";
  // NEW v2.6.29: True if this fact was found from searching for the OPPOSITE claim
  // (e.g., if user claimed "X > Y", this fact came from searching "Y > X")
  fromOppositeClaimSearch?: boolean;
  // EvidenceScope: Captures the methodology/boundaries of the source document
  evidenceScope?: {
    name: string;           // Short label (e.g., "WTW", "TTW", "EU-LCA", "US jurisdiction")
    methodology?: string;   // Standard/method referenced (e.g., "ISO 14040", "EU RED II")
    boundaries?: string;    // What's included/excluded (e.g., "Primary energy to vehicle motion")
    geographic?: string;    // Geographic scope (e.g., "European Union", "California")
    temporal?: string;      // Time period (e.g., "2020-2025", "FY2024")
  };
}

interface FetchedSource {
  id: string;
  url: string;
  title: string;
  trackRecordScore: number | null;
  fullText: string;
  fetchedAt: string;
  category: string;
  fetchSuccess: boolean;
  searchQuery?: string; // Which query found this
}

interface ClaimVerdict {
  claimId: string;
  claimText: string;
  isCentral: boolean;
  // NEW v2.6.30: Centrality level for weighted verdict calculation
  centrality?: "high" | "medium" | "low";
  // NEW v2.6.31: Thesis relevance - does this claim directly test the thesis?
  // "direct" = contributes to verdict, "tangential" = on-topic but excluded, "irrelevant" = off-topic noise
  thesisRelevance?: "direct" | "tangential" | "irrelevant";
  // NEW: Claim role and dependencies
  claimRole?: "attribution" | "source" | "timing" | "core";
  dependsOn?: string[]; // Claim IDs this depends on
  dependencyFailed?: boolean; // True if a prerequisite claim was false
  failedDependencies?: string[]; // Which dependencies failed
  // Verdict truth percentage (0-100 where 100 = completely true)
  verdict: number;
  // LLM's confidence in the verdict (internal use)
  confidence: number;
  // Truth percentage for display (0-100% where 100 = completely true)
  truthPercentage: number;
  // Evidence weighting derived from source track record scores
  evidenceWeight?: number;
  riskTier: "A" | "B" | "C";
  reasoning: string;
  supportingFactIds: string[];
  keyFactorId?: string; // Maps claim to KeyFactor for aggregation
  relatedProceedingId?: string;
  startOffset?: number;
  endOffset?: number;
  highlightColor: "green" | "yellow" | "red";
  isPseudoscience?: boolean;
  escalationReason?: string;
  isContested?: boolean;
  contestedBy?: string;
  factualBasis?: "established" | "disputed" | "alleged" | "opinion" | "unknown";
}

// v2.6.27: Renamed from VerdictSummary for input neutrality
interface VerdictSummary {
  displayText: string;
  // Answer truth percentage (0-100)
  answer: number;
  confidence: number;
  // Truth percentage for display (0-100%)
  truthPercentage: number;
  shortAnswer: string;
  nuancedAnswer: string;
  keyFactors: KeyFactor[];

  hasMultipleProceedings: boolean;
  proceedingAnswers?: ProceedingAnswer[];
  proceedingSummary?: string;
  calibrationNote?: string;
  hasContestedFactors?: boolean;
}

interface ArticleAnalysis {
  inputType: InputType;
  verdictSummary?: VerdictSummary;

  hasMultipleProceedings: boolean;
  proceedings?: DistinctProceeding[];

  articleThesis: string;
  logicalFallacies: Array<{
    type: string;
    description: string;
    affectedClaims: string[];
  }>;

  // CLAIMS SUMMARY (average of individual claim verdicts)
  claimsAverageTruthPercentage: number;
  claimsAverageVerdict: number;

  // ARTICLE VERDICT (LLM's independent assessment of thesis/conclusion)
  // May differ from claims average! E.g., true facts used to support false conclusion
  articleTruthPercentage: number;
  articleVerdict: number;
  articleVerdictReason?: string;

  claimPattern: {
    total: number;
    supported: number;
    uncertain: number;
    refuted: number;
    centralClaimsSupported: number;
    centralClaimsTotal: number;
  };
  // Pseudoscience detection (v2.4.6+)
  isPseudoscience?: boolean;
  pseudoscienceCategories?: string[];
  keyFactors?: KeyFactor[];
  hasContestedFactors?: boolean;
}

interface TwoPanelSummary {
  articleSummary: {
    title: string;
    source: string;
    mainArgument: string;
    keyFindings: string[];
    reasoning: string;
    conclusion: string;
  };
  factharborAnalysis: {
    sourceCredibility: string;
    claimVerdicts: Array<{
      claim: string;
      verdict: number;
      truthPercentage: number;
    }>;
    methodologyAssessment: string;
    overallVerdict: number;
    confidence: number; // v2.6.28: Added missing confidence property
    analysisId: string;
  };
}

// ============================================================================
// SOURCE TRACK RECORD (Configurable via FH_SOURCE_BUNDLE_PATH)
// ============================================================================

/**
 * Source reliability scores loaded from FH_SOURCE_BUNDLE_PATH
 * No hard-coded scores - all scores must come from the configured bundle.
 * If no bundle is configured, all sources return null (unknown reliability).
 */
let SOURCE_TRACK_RECORDS: Record<string, number> = {};

/**
 * Load source reliability scores from external bundle if configured
 */
function loadSourceBundle(): void {
  if (!CONFIG.sourceBundlePath) {
    console.log(
      `[FactHarbor] No source bundle configured (FH_SOURCE_BUNDLE_PATH not set)`,
    );
    return;
  }

  try {
    const bundlePath = path.resolve(CONFIG.sourceBundlePath);
    if (fs.existsSync(bundlePath)) {
      const bundle = JSON.parse(fs.readFileSync(bundlePath, "utf-8"));
      if (bundle.sources && typeof bundle.sources === "object") {
        SOURCE_TRACK_RECORDS = bundle.sources;
        console.log(
          `[FactHarbor] Loaded ${Object.keys(bundle.sources).length} source scores from bundle`,
        );
      }
    } else {
      console.warn(`[FactHarbor] Source bundle not found: ${bundlePath}`);
    }
  } catch (err) {
    console.error(`[FactHarbor] Failed to load source bundle:`, err);
  }
}

// Load source bundle at startup
loadSourceBundle();

/**
 * Get track record score for a URL
 * Returns score from bundle if available, otherwise null (unknown).
 */
function getTrackRecordScore(url: string): number | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");

    // Check exact match from bundle
    if (SOURCE_TRACK_RECORDS[hostname] !== undefined) {
      return SOURCE_TRACK_RECORDS[hostname];
    }

    // Check subdomain match from bundle
    for (const [domain, score] of Object.entries(SOURCE_TRACK_RECORDS)) {
      if (hostname.endsWith("." + domain)) return score;
    }

    // No default - unknown reliability
    return null;
  } catch {
    return null;
  }
}

/**
 * Calculate de-duplicated weighted average truth percentage
 * Clusters near-duplicate claims and down-weights them so each semantic cluster
 * contributes approximately 1 unit to the average (prevents double-counting)
 */
function dedupeWeightedAverageTruth(verdicts: ClaimVerdict[]): number {
  if (verdicts.length === 0) return 50;
  if (verdicts.length === 1) return Math.round(verdicts[0].truthPercentage);

  // Simple token-based similarity clustering
  const tokenize = (text: string): Set<string> => {
    return new Set(
      text
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 3) // Ignore short words
    );
  };

  const jaccardSimilarity = (setA: Set<string>, setB: Set<string>): number => {
    const intersection = new Set([...setA].filter((x) => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return union.size === 0 ? 0 : intersection.size / union.size;
  };

  // Cluster claims by similarity (threshold 0.6)
  const clusters: ClaimVerdict[][] = [];
  for (const verdict of verdicts) {
    const tokens = tokenize(verdict.claimText);
    let addedToCluster = false;

    for (const cluster of clusters) {
      const clusterTokens = tokenize(cluster[0].claimText);
      if (jaccardSimilarity(tokens, clusterTokens) >= 0.6) {
        cluster.push(verdict);
        addedToCluster = true;
        break;
      }
    }

    if (!addedToCluster) {
      clusters.push([verdict]);
    }
  }

  // Calculate weighted average: each cluster contributes ~1 unit
  let totalWeight = 0;
  let weightedSum = 0;

  for (const cluster of clusters) {
    // Primary claim gets weight 1.0, duplicates share remaining weight
    const primaryWeight = 1.0;
    const duplicateWeight = cluster.length > 1 ? 0.5 / (cluster.length - 1) : 0;

    // Sort by truthPercentage descending to pick primary
    const sorted = [...cluster].sort((a, b) => b.truthPercentage - a.truthPercentage);

    weightedSum += sorted[0].truthPercentage * primaryWeight;
    totalWeight += primaryWeight;

    for (let i = 1; i < sorted.length; i++) {
      weightedSum += sorted[i].truthPercentage * duplicateWeight;
      totalWeight += duplicateWeight;
    }
  }

  return Math.round(weightedSum / totalWeight);
}

function applyEvidenceWeighting(
  claimVerdicts: ClaimVerdict[],
  facts: ExtractedFact[],
  sources: FetchedSource[],
): ClaimVerdict[] {
  const sourceScoreById = new Map(
    sources.map((s) => [s.id, s.trackRecordScore]),
  );
  const factScoreById = new Map(
    facts.map((f) => [f.id, sourceScoreById.get(f.sourceId) ?? null]),
  );

  return claimVerdicts.map((verdict) => {
    const factIds = verdict.supportingFactIds ?? [];
    const scores = factIds
      .map((id) => factScoreById.get(id))
      .filter((score): score is number => typeof score === "number");

    if (scores.length === 0) return verdict;

    const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const adjustedTruth = Math.round(50 + (verdict.truthPercentage - 50) * avg);
    const adjustedConfidence = Math.round(verdict.confidence * (0.5 + avg / 2));
    return {
      ...verdict,
      evidenceWeight: avg,
      truthPercentage: adjustedTruth,
      confidence: adjustedConfidence,
      verdict: adjustedTruth,
      highlightColor: getHighlightColor7Point(adjustedTruth),
    };
  });
}

/**
 * Sanitize temporal error phrases from LLM-generated reasoning
 * Removes false "temporal error", "in the future", "date discrepancy" comments
 * that occur when LLM incorrectly assumes dates are impossible
 */
function sanitizeTemporalErrors(reasoning: string, currentDate: Date): string {
  const temporalErrorPatterns = [
    /temporal\s+error/gi,
    /in\s+the\s+future\s+from\s+the\s+current\s+date/gi,
    /date\s+discrepancy/gi,
    /(?:claim|statement|event)\s+(?:is|was)\s+(?:in\s+the\s+)?future/gi,
    /(?:occurred|happened)\s+in\s+the\s+future/gi,
    /cannot\s+have\s+occurred\s+yet/gi,
    /has\s+not\s+yet\s+happened/gi,
    /impossible\s+(?:date|timing)/gi,
  ];

  let sanitized = reasoning;
  let hasTemporalError = false;

  for (const pattern of temporalErrorPatterns) {
    if (pattern.test(sanitized)) {
      hasTemporalError = true;
      // Replace with neutral phrasing
      sanitized = sanitized.replace(pattern, "[date evaluated]");
    }
  }

  if (hasTemporalError) {
    debugLog("sanitizeTemporalErrors: Cleaned temporal error text", {
      before: reasoning.substring(0, 150),
      after: sanitized.substring(0, 150),
    });
  }

  return sanitized;
}

// ============================================================================
// TOPIC DETECTION (for unified analysis)
// ============================================================================

/**
 * Detect if the topic involves procedural or institutional analysis
 * This determines whether Key Factors should be generated
 *
 * Key Factors are appropriate for topics involving:
 * - Multi-step processes (rollouts, audits, reviews, investigations)
 * - Institutional decisions (regulatory, organizational, or governance actions)
 * - Procedural integrity (process fairness, evidence basis, role conflicts)
 * - High-impact decisions with formal standards or rules
 */
function detectProceduralTopic(understanding: ClaimUnderstanding, originalText: string): boolean {
  // Check 1: Has distinct proceedings detected
  if (understanding.distinctProceedings && understanding.distinctProceedings.length > 0) {
    return true;
  }

  // Check 2: Has formal frameworks identified
  if (understanding.legalFrameworks && understanding.legalFrameworks.length > 0) {
    return true;
  }

  // Check 3: Claims are predominantly procedural type
  const legalProceduralClaims = understanding.subClaims.filter(
    (c: any) => c.type === "legal" || c.type === "procedural"
  );
  if (legalProceduralClaims.length >= understanding.subClaims.length * 0.4) {
    return true;
  }

  // Check 4: Text contains procedural or governance keywords
  const proceduralKeywords = [
    /\b(phase|stage|episode|cycle|version|iteration|rollout|release)\b/i,
    /\b(process|procedure|protocol|standard|policy|framework)\b/i,
    /\b(review|audit|assessment|evaluation|investigation|probe)\b/i,
    /\b(committee|board|panel|commission|authority|agency)\b/i,
    /\b(conflict|impartial|independent|oversight|compliance)\b/i,
    /\b(trial|court|judge|ruling|verdict|sentence|conviction|acquittal)\b/i,
    /\b(lawsuit|litigation|prosecution|defendant|plaintiff)\b/i,
    /\b(due process|fair trial|impartial|jurisdiction)\b/i,
    /\b(electoral|election|ballot|vote|ineligibility)\b/i,
    /\b(investigation|indictment|charges|allegations)\b/i,
    /\b(supreme court|federal court|tribunal|justice)\b/i,
    /\b(constitutional|legislation|statute|law|legal)\b/i,
    /\b(regulatory|agency|commission|board|authority)\b/i,
    /\b(proceeding|hearing|testimony|evidence|witness)\b/i,
  ];

  const textToCheck = `${understanding.articleThesis} ${originalText}`.toLowerCase();
  const keywordMatches = proceduralKeywords.filter(pattern => pattern.test(textToCheck));

  // If 3+ procedural keywords found, it's a procedural topic
  if (keywordMatches.length >= 3) {
    return true;
  }

  return false;
}

// ============================================================================
// STEP 1: UNDERSTAND
// ============================================================================

// NOTE: OpenAI structured output requires ALL properties to be in "required" array.
// Using union types with explicit "unknown" or empty values instead of nullable/optional.
const SUBCLAIM_SCHEMA = z.object({
  id: z.string(),
  text: z.string(),
  type: z.enum(["legal", "procedural", "factual", "evaluative"]),
  claimRole: z.enum(["attribution", "source", "timing", "core", "unknown"]),
  dependsOn: z.array(z.string()), // empty array if no dependencies
  keyEntities: z.array(z.string()),
  // Three-attribute assessment
  checkWorthiness: z.enum(["high", "medium", "low"]),
  harmPotential: z.enum(["high", "medium", "low"]),
  centrality: z.enum(["high", "medium", "low"]),
  isCentral: z.boolean(), // true if centrality is "high" (harmPotential affects risk tier, not centrality)
  // v2.6.31: Thesis relevance - does this claim DIRECTLY test the main thesis?
  // "direct" = directly evaluates whether the thesis is true (should contribute to verdict)
  // "tangential" = related context but doesn't test the thesis (e.g., reactions to an event)
  // "irrelevant" = off-topic noise that should not be evaluated or shown
  thesisRelevance: z.enum(["direct", "tangential", "irrelevant"]),
  relatedProceedingId: z.string(), // empty string if not applicable
  approximatePosition: z.string(), // empty string if not applicable
  keyFactorId: z.string(), // empty string if not mapped to any factor
});

// Lenient subclaim schema for providers that invent extra labels (e.g. "evidential").
// We normalize them back into the supported set so downstream code stays consistent.
const SUBCLAIM_SCHEMA_LENIENT = z.object({
  id: z.string(),
  text: z.string(),
  type: z
    .enum(["legal", "procedural", "factual", "evaluative", "evidential", "methodological"])
    .catch("factual")
    .transform((t) => (t === "evidential" || t === "methodological" ? "factual" : t)),
  claimRole: z.enum(["attribution", "source", "timing", "core", "unknown"]).catch("unknown"),
  dependsOn: z.array(z.string()).default([]),
  keyEntities: z.array(z.string()).default([]),
  checkWorthiness: z.enum(["high", "medium", "low"]).catch("medium"),
  harmPotential: z.enum(["high", "medium", "low"]).catch("medium"),
  centrality: z.enum(["high", "medium", "low"]).catch("medium"),
  isCentral: z.boolean().catch(false),
  thesisRelevance: z.enum(["direct", "tangential", "irrelevant"]).catch("direct"), // Default to direct for backward compat
  relatedProceedingId: z.string().default(""),
  approximatePosition: z.string().default(""),
  keyFactorId: z.string().default(""),
});

function enforceThesisRelevanceInvariants<T extends { thesisRelevance?: any; centrality?: any; isCentral?: any }>(
  claims: T[],
): T[] {
  for (const claim of claims as any[]) {
    const raw = String(claim?.thesisRelevance || "direct").trim();
    const thesisRelevance =
      raw === "direct" || raw === "tangential" || raw === "irrelevant" ? raw : "direct";
    const isMarkedCentral = claim?.isCentral === true || claim?.centrality === "high";

    // Invariant: central claims must be direct (by definition, they test the thesis).
    claim.thesisRelevance = isMarkedCentral ? "direct" : thesisRelevance;

    // Invariant: non-direct claims must never be treated as central/weighted.
    if (claim.thesisRelevance !== "direct") {
      claim.centrality = "low";
      claim.isCentral = false;
    }
  }
  return claims;
}

function applyThesisRelevancePolicyBToSubClaims<T extends { id?: any; dependsOn?: any; thesisRelevance?: any }>(
  claims: T[],
): T[] {
  // Policy B:
  // - "irrelevant": drop entirely (never shown, never researched, never verdicted)
  // - "tangential": keep for display, but exclude from research/verdict (handled elsewhere)
  const kept = (claims as any[]).filter((c) => String(c?.thesisRelevance || "direct") !== "irrelevant");
  const keptIds = new Set(kept.map((c) => String(c?.id || "")).filter(Boolean));

  for (const c of kept) {
    const deps = Array.isArray((c as any).dependsOn) ? (c as any).dependsOn : [];
    (c as any).dependsOn = deps.filter((dep: any) => keptIds.has(String(dep)));
  }
  return kept as any;
}

function pruneScopesByCoverage(
  understanding: ClaimUnderstanding,
  facts: ExtractedFact[],
): ClaimUnderstanding {
  const scopes = Array.isArray((understanding as any).distinctProceedings)
    ? ((understanding as any).distinctProceedings as any[])
    : [];
  if (scopes.length === 0) return understanding;

  const factsPerScope = new Map<string, number>();
  for (const f of facts || []) {
    const pid = String((f as any)?.relatedProceedingId || "").trim();
    if (!pid) continue;
    factsPerScope.set(pid, (factsPerScope.get(pid) || 0) + 1);
  }

  const claims = Array.isArray((understanding as any).subClaims)
    ? ((understanding as any).subClaims as any[])
    : [];
  const claimsPerScope = new Map<string, number>();
  for (const c of claims) {
    const pid = String((c as any)?.relatedProceedingId || "").trim();
    if (!pid) continue;
    claimsPerScope.set(pid, (claimsPerScope.get(pid) || 0) + 1);
  }

  const keep: any[] = [];
  const removed = new Set<string>();
  for (const s of scopes) {
    const id = String(s?.id || "").trim();
    if (!id) continue;
    const hasFacts = (factsPerScope.get(id) || 0) > 0;
    const hasAnyClaims = (claimsPerScope.get(id) || 0) > 0;

    // Keep a scope if it has ANY claims (direct or tangential) or ANY facts.
    // Tangential claims are displayed (Policy B), so a scope that contains only tangential
    // claims is not "empty" and must remain to preserve scoped display context.
    if (hasFacts || hasAnyClaims) keep.push(s);
    else removed.add(id);
  }

  if (removed.size === 0) return understanding;

  // Clear orphaned claim assignments to removed scopes.
  // (These scopes should be truly empty: no facts and no claims.)
  if (Array.isArray((understanding as any).subClaims)) {
    for (const c of (understanding as any).subClaims as any[]) {
      const pid = String(c?.relatedProceedingId || "").trim();
      if (pid && removed.has(pid)) c.relatedProceedingId = "";
    }
  }

  (understanding as any).distinctProceedings = keep;
  (understanding as any).requiresSeparateAnalysis = keep.length > 1;
  return understanding;
}

// Generic AnalysisContext schema (replaces legal-specific DISTINCT_PROCEEDING_SCHEMA)
// Domain-specific fields (court, jurisdiction, charges, etc.) are now in metadata
const ANALYSIS_CONTEXT_SCHEMA = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string(),
  subject: z.string().default(""),
  temporal: z.string().default(""),
  status: z.enum(["concluded", "ongoing", "pending", "unknown"]).catch("unknown"),
  outcome: z.string().default("unknown"),
  metadata: z.object({
    // Legal domain (backward compatibility)
    institution: z.string().optional(),
    court: z.string().optional(),
    jurisdiction: z.string().optional(),
    charges: z.array(z.string()).optional(),
    decisionMakers: z.array(z.object({
      name: z.string(),
      role: z.string(),
      affiliation: z.string().optional(),
    })).optional(),

    // Scientific domain
    methodology: z.string().optional(),
    boundaries: z.string().optional(),
    geographic: z.string().optional(),
    dataSource: z.string().optional(),

    // Regulatory domain
    regulatoryBody: z.string().optional(),
    standardApplied: z.string().optional(),
  }).passthrough().default({}),  // passthrough allows any additional fields
});

// NOTE: OpenAI structured output requires ALL properties to be in "required" array.
// Some providers are more tolerant and benefit from a more lenient schema.
const UNDERSTANDING_SCHEMA_OPENAI = z.object({
  detectedInputType: z.enum(["claim", "article"]),
  analysisIntent: z.enum(["verification", "exploration", "comparison", "none"]),
  originalInputDisplay: z.string(), // empty string if not applicable
  impliedClaim: z.string(), // empty string if not applicable

  distinctProceedings: z.array(ANALYSIS_CONTEXT_SCHEMA),
  requiresSeparateAnalysis: z.boolean(),
  proceedingContext: z.string(), // empty string if not applicable

  mainThesis: z.string(),
  articleThesis: z.string(),
  subClaims: z.array(SUBCLAIM_SCHEMA),
  distinctEvents: z.array(
    z.object({
      name: z.string(),
      date: z.string(),
      description: z.string(),
    }),
  ),
  legalFrameworks: z.array(z.string()),
  researchQueries: z.array(z.string()),
  riskTier: z.enum(["A", "B", "C"]),
  // NEW: KeyFactors discovered during understanding phase (emergent, not forced)
  // factor MUST be abstract label (2-5 words), NOT specific claims or quotes
  keyFactors: z.array(
    z.object({
      id: z.string(),
      evaluationCriteria: z.string(), // The evaluation criteria (e.g., "Was due process followed?")
      factor: z.string(), // ABSTRACT label only (2-5 words, e.g., "Due Process", "Expert Consensus")
      category: z.enum(["procedural", "evidential", "methodological", "factual", "evaluative"]),
    }),
  ),
});

const SUPPLEMENTAL_SUBCLAIMS_SCHEMA = z.object({
  subClaims: z.array(SUBCLAIM_SCHEMA),
});

// Lenient variant for providers that sometimes omit arrays/fields; defaults prevent hard failures.
const UNDERSTANDING_SCHEMA_LENIENT = z.object({
  detectedInputType: z.enum(["claim", "article"]).catch("claim"),
  // Some models invent new labels (e.g. "evaluation"); coerce unknowns to "none" then post-process.
  analysisIntent: z.enum(["verification", "exploration", "comparison", "none"]).catch("none"),
  originalInputDisplay: z.string().default(""),
  impliedClaim: z.string().default(""),

  distinctProceedings: z.array(ANALYSIS_CONTEXT_SCHEMA).default([]),
  requiresSeparateAnalysis: z.boolean().default(false),
  proceedingContext: z.string().default(""),

  mainThesis: z.string().default(""),
  articleThesis: z.string().default(""),
  subClaims: z.array(SUBCLAIM_SCHEMA_LENIENT).default([]),
  distinctEvents: z
    .array(
      z.object({
        name: z.string(),
        date: z.string(),
        description: z.string(),
      }),
    )
    .default([]),
  legalFrameworks: z.array(z.string()).default([]),
  researchQueries: z.array(z.string()).default([]),
  riskTier: z.enum(["A", "B", "C"]).catch("B"),
  keyFactors: z
    .array(
      z.object({
        id: z.string(),
        evaluationCriteria: z.string(),
        factor: z.string(),
        category: z
          .enum(["procedural", "evidential", "methodological", "factual", "evaluative"])
          .catch("evaluative"),
      }),
    )
    .default([]),
});

// Supplemental claim backfill should ensure each scope has at least one substantive/core claim,
// but MUST NOT force “central” marking. Centrality is determined by the LLM + guardrails.
const MIN_CORE_CLAIMS_PER_PROCEEDING = 1;
const MIN_TOTAL_CLAIMS_WITH_SINGLE_CORE = 2;
const SUPPLEMENTAL_REPROMPT_MAX_ATTEMPTS = 1;
const SHORT_SIMPLE_INPUT_MAX_CHARS = 60;

function isComparativeLikeText(text: string): boolean {
  const t = (text || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!t.includes(" than ")) return false;
  const before = t.split(" than ")[0] || "";
  const window = before.split(/\s+/).slice(-6).join(" ");
  // Generic comparative cues (topic-agnostic; no domain keywords).
  if (/\b(more|less|better|worse|higher|lower|fewer|greater|smaller)\b/.test(window)) return true;
  // Heuristic: common comparative adjective/adverb form (e.g., "faster", "cheaper") near "than".
  if (/\b[a-z]{3,}er\b/.test(window)) return true;
  return false;
}

async function understandClaim(
  input: string,
  model: any,
): Promise<ClaimUnderstanding> {
  // Get current date for temporal reasoning
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentDay = currentDate.getDate();
  const currentDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
  const currentDateReadable = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // =========================================================================
  // EARLY INPUT NORMALIZATION: Normalize yes/no phrasing to a statement BEFORE LLM call
  // This ensures equivalent phrasings follow the same analysis path
  // =========================================================================
  const trimmedInputRaw = input.trim();
  const needsNormalization =
    trimmedInputRaw.endsWith("?") ||
    /^(was|is|are|were|did|do|does|has|have|had|can|could|will|would|should|may|might)\s/i.test(
      trimmedInputRaw,
    );

  // Preserve original input for UI display, normalize for analysis
  const originalInputDisplay = trimmedInputRaw;
  const normalizedInput = needsNormalization
    ? normalizeYesNoQuestionToStatement(trimmedInputRaw)
    : trimmedInputRaw;

  if (needsNormalization) {
    console.log(`[Analyzer] Input Neutrality: normalized to statement BEFORE LLM call`);
    console.log(`[Analyzer]   Original: "${trimmedInputRaw.substring(0, 100)}..."`);
    console.log(`[Analyzer]   Normalized: "${normalizedInput.substring(0, 100)}..."`);
  }

  // Use normalizedInput for all analysis from this point forward
  const analysisInput = normalizedInput;

  // Safety: extremely long article/PDF inputs can cause provider hangs or excessive prompt sizes.
  // We keep analysis logic consistent, but cap what we send to the Step 1 LLM call.
  const understandMaxCharsRaw = parseInt(process.env.FH_UNDERSTAND_MAX_CHARS || "12000", 10);
  const understandMaxChars = Number.isFinite(understandMaxCharsRaw)
    ? Math.max(2000, Math.min(50000, understandMaxCharsRaw))
    : 12000;
  const analysisInputForLLM =
    analysisInput.length > understandMaxChars ? analysisInput.slice(0, understandMaxChars) : analysisInput;

  // Detect recency sensitivity for this analysis (using normalized input)
  const recencyMatters = isRecencySensitive(analysisInput, undefined);

  const systemPrompt = `You are a fact-checking analyst. Analyze the input with special attention to MULTIPLE DISTINCT SCOPES (bounded analytical frames).

SCOPE TERMINOLOGY (critical):
- ArticleContext: narrative/background framing of the article or input. ArticleContext is NOT a reason to split.
- EvidenceScope (analysis scope): a bounded analytical frame that should be analyzed separately. You will output these as distinctProceedings.

NOT DISTINCT SCOPES:
- Different perspectives on the same event (e.g., "US view" vs "Brazil view") are NOT separate scopes by themselves.
- Pro vs con viewpoints are NOT scopes.

SCOPE RELEVANCE REQUIREMENT (CRITICAL):
- Every scope MUST be directly relevant to the SPECIFIC TOPIC of the input
- Do NOT include scopes from unrelated domains just because they share a general category
- Example: If input is about "solar panel efficiency", do NOT include scopes about nuclear power regulations or wind farm subsidies - even though all are "energy-related"
- Example: If input is about "coffee consumption effects", do NOT include scopes about alcohol studies or tobacco research - even though all are "substance consumption"
- Each scope must have a clear, direct connection to the input's subject matter
- When in doubt, use fewer scopes rather than including marginally relevant ones
- A scope with zero relevant claims/evidence should NOT exist

${recencyMatters ? `## ⚠️ RECENT DATA DETECTED

This input appears to involve recent events, dates, or announcements. When generating research queries:
- **PRIORITIZE**: Queries that will help find the most current information via web search
- **INCLUDE**: Date-specific queries (e.g., "November 2025", "2025", "recent")
- **FOCUS**: Recent developments, current status, latest announcements
- **NOTE**: Web search will be used to find current sources - structure your research queries accordingly

` : ''}## CRITICAL: TEMPORAL REASONING

**CURRENT DATE**: Today is ${currentDateReadable} (${currentDateStr}).

**DATE REASONING RULES**:
- When evaluating dates mentioned in claims, compare them to the CURRENT DATE above
- Do NOT assume dates are in the future without checking against the current date
- A date like "November 2025" is in the PAST if the current date is January 2026 or later
- Do NOT reject claims as "impossible" based on incorrect temporal assumptions
- If a date seems inconsistent, verify it against the current date before making judgments
- When in doubt about temporal relationships, use the evidence from sources rather than making assumptions

**EXAMPLE**: If the current date is January 6, 2026, then "late November 2025" is in the PAST (approximately 6 weeks ago), not the future.

## CRITICAL: ARTICLE THESIS (articleThesis)

The articleThesis should NEUTRALLY SUMMARIZE what the article claims, covering ALL main points.
- Include ALL major claims, not just one
- Use neutral language ("claims that", "alleges that")
- Keep the source attribution ("according to X", "allegedly from Y")
- Example: "The article claims FDA official Prasad announced stricter vaccine regulations and alleges an internal review found child deaths linked to vaccines."

## CRITICAL: CLAIM STRUCTURE ANALYSIS

When extracting claims, identify their ROLE and DEPENDENCIES:

### Claim Roles:
- **attribution**: WHO said it (person's identity, role) - e.g., "Vinay Prasad is CBER director"
- **source**: WHERE/HOW it was communicated (document type, channel) - e.g., "in an internal email"
- **timing**: WHEN it happened - e.g., "in late November"
- **core**: THE ACTUAL VERIFIABLE ASSERTION - MUST be isolated from source/attribution

### CRITICAL: ISOLATING CORE CLAIMS

Core claims must be PURE FACTUAL ASSERTIONS without embedded source/attribution:
- WRONG: "An internal FDA review found that 10 children died from vaccines" (embeds source)
- CORRECT: "At least 10 children died because of COVID-19 vaccines" (pure factual claim)

The source attribution belongs in a SEPARATE claim:
- SC1: "An internal FDA review exists" (source claim)
- SC2: "At least 10 children died because of COVID-19 vaccines" (core claim, depends on SC1)

### CRITICAL: SEPARATING ATTRIBUTION FROM EVALUATIVE CONTENT

**THIS IS MANDATORY** - When someone CRITICIZES, CLAIMS, or ASSERTS something, YOU MUST create separate claims:
1. The FACT that they said/criticized it (attribution - verifiable: did they say it?)
2. The CONTENT of what they said (the actual claim to verify - is it TRUE?)

**NEVER CREATE CLAIMS LIKE THESE** (they conflate attribution with content):
❌ WRONG: "Dr. Prasad criticized FDA processes as based on weak and misleading science"
❌ WRONG: "Expert claims the treatment is dangerous"
❌ WRONG: "Study found that X causes Y"

**ALWAYS SPLIT INTO TWO CLAIMS:**

Example 1: "Dr. Prasad criticized FDA processes as based on weak science"
✅ SC-A: "Dr. Prasad has publicly criticized past FDA processes"
   → claimRole: "attribution", type: "factual", centrality: LOW
   → Verifies: Did Prasad make critical statements about FDA?
✅ SC-B: "Past FDA processes were based on weak and misleading science"
   → claimRole: "core", type: "evaluative", centrality: HIGH, dependsOn: ["SC-A"]
   → Verifies: Is this assessment ACCURATE based on evidence?

Example 2: "An internal review found 10 children died from vaccines"
✅ SC-A: "An internal FDA review exists making claims about child deaths"
   → claimRole: "source", type: "factual", centrality: LOW
✅ SC-B: "At least 10 children died because of COVID-19 vaccines"
   → claimRole: "core", type: "factual", centrality: HIGH, dependsOn: ["SC-A"]
   → This is THE claim readers care about - is it TRUE?

**WHY THIS MATTERS:**
- SC-A (attribution) might be TRUE (yes, he said it)
- SC-B (content) might be FALSE (what he said is wrong)
- If you only verify SC-A, you're NOT fact-checking the article's actual claims!
- The article's credibility depends on SC-B, not SC-A.

### Claim Dependencies (dependsOn):
Core claims often DEPEND on attribution/source/timing claims being true.

EXAMPLE: "CBER director Prasad claimed in an internal memo that 10 children died from vaccines"
- SC1 (attribution): "Vinay Prasad is CBER director" → claimRole: "attribution", dependsOn: []
- SC2 (source): "Prasad sent an internal memo making claims about child deaths" → claimRole: "source", dependsOn: ["SC1"]
- SC3 (core): "At least 10 children died because of COVID-19 vaccines" → claimRole: "core", dependsOn: ["SC2"], isCentral: true

If SC2 is FALSE (no such memo exists), then SC3 has NO evidential basis from this source.

### THREE-ATTRIBUTE CLAIM ASSESSMENT

For EACH claim, assess these three attributes (high/medium/low):

**1. checkWorthiness** - Is it a factual assertion a reader would challenge?
- HIGH: Specific factual claim that can be verified, readers would want proof
- MEDIUM: Somewhat verifiable but less likely to be challenged
- LOW: Pure opinion with no factual component, or not independently verifiable

NOTE: Broad institutional claims ARE verifiable (checkWorthiness: HIGH):
- "The FDA has acted on weak science" → Can check documented cases, GAO reports, expert analyses
- "The government has lied about X" → Can check historical record, declassified documents
- "Company X has a history of fraud" → Can check court records, SEC filings, news archives
These are not opinions - they're historical assertions that can be fact-checked.

**2. harmPotential** - Does it impact high-stakes areas?
- HIGH: Public health, safety, democratic integrity, financial markets, legal outcomes
- MEDIUM: Affects specific groups or has moderate societal impact
- LOW: Limited impact, affects few people, low stakes

IMPORTANT: harmPotential is CLAIM-LEVEL, not topic-level.
- Do NOT set harmPotential=HIGH just because the overall topic is “high risk” or because other claims are high-stakes.
- Attribution/source/timing/background claims are usually NOT harmPotential=HIGH even in high-stakes topics.
- Reserve harmPotential=HIGH for claims where being wrong could plausibly cause material real-world harm (directly, not just “credibility harm”).

**3. centrality** - Is it pivotal to the author's argument?
- HIGH: Core assertion the argument depends on; removing it collapses the narrative
- MEDIUM: Supports the main argument but not essential
- LOW: Peripheral detail, context, or attribution

**CRITICAL: Source/Attribution claims are NEVER centrality HIGH**
Claims with claimRole "source", "attribution", or "timing" should ALWAYS have centrality: LOW
- "An internal email exists" → centrality: LOW (source claim, not the argument itself)
- "Dr. X is director of Y" → centrality: LOW (attribution, establishes who said it)
- "The statement was made in November" → centrality: LOW (timing detail)
- "The methodology used is scientifically valid" → centrality: LOW (meta-claim about analysis, not the subject)
- "The study followed ISO standards" → centrality: LOW (methodology validation, not the main claim)
- "The data collection methods were appropriate" → centrality: LOW (methodological, not substantive)

Only CORE claims (claimRole: "core") can have centrality: HIGH
- The existence of a document is not the argument - what the document SAYS is the argument
- Who said something is not the argument - what they SAID is the argument

**CRITICAL: Policy/Action claims that DEPEND on source claims are NOT central**
If a policy claim depends on a source claim being true, it inherits LOW centrality:
- "FDA will impose stricter regulations" (depends on email existing) → centrality: LOW
- "Company will lay off 1000 workers" (depends on memo existing) → centrality: LOW
These are CONDITIONAL claims - they're only meaningful IF the source exists.

The CENTRAL claims are the **factual assertions about real-world impact**:
- "10 children died from vaccines" → centrality: HIGH (factual impact claim)
- "Past FDA processes were based on weak science" → centrality: HIGH (evaluative but verifiable)

**RULE: When multiple claims compete for centrality, ask: "Which claim, if false, would completely undermine the article's credibility?"**
- If "FDA will impose stricter regulations" is false → article is wrong about policy
- If "10 children died from vaccines" is false → article is spreading dangerous misinformation
The second is MORE CENTRAL because it has greater real-world harm potential.

**isCentral = true** if centrality is "high"
- harmPotential affects risk tier and warning display, NOT centrality
- checkWorthiness does NOT affect isCentral (a high checkWorthiness alone doesn't make it central)
- However, if checkWorthiness is "low", the claim should NOT be investigated or displayed
- Attribution, source, and timing claims should typically have centrality = "low" (not central to the argument)
- Only core evaluative claims that are the main thesis should have centrality = "high"

IMPORTANT: riskTier is ANALYSIS-LEVEL only.
- riskTier must NOT be used as a shortcut to set claim-level harmPotential/centrality.
- You may set riskTier based on the overall analysis, but claim-level harmPotential/centrality must be justified by each claim's content.

**CRITICAL HEURISTIC for centrality = "high"**:
Ask yourself: "Does this claim DIRECTLY address the user's primary thesis?"
→ If yes, it's central. If it's supporting evidence or background, it's not.

**EXPECT 1-4 CENTRAL CLAIMS** in most analyses. The number depends on the thesis type:
- Simple factual claim: 1-2 central claims
- Comparative claim ("X vs Y"): 2-4 central claims (one per major aspect of comparison)
- Multi-faceted thesis: 2-4 central claims (one per facet)

Only assign centrality: "high" when the claim:
1. DIRECTLY addresses the user's thesis, AND
2. Represents a distinct aspect that needs independent verification

**Examples of NON-central claims (centrality = "low" or "medium")**:
- ❌ "Source X stated Y" (attribution - NOT central)
- ❌ "Event happened on date Z" (timing/background - NOT central)
- ❌ "Document was published by institution W" (source verification - NOT central)
- ❌ "Person A has credentials B" (background context - NOT central)
- ❌ "Study used methodology M" (methodological detail - NOT central unless methodology IS the main claim)
- ❌ "The [analysis method] is valid/accurate/complete" (methodology validation - NOT central, the claim is about the SUBJECT, not the method)
- ❌ "The study/analysis framework is appropriate" (meta-analysis about methods - NOT central)
- ❌ "The analysis excludes/includes factor X" (methodological scope - NOT central)
- ❌ Supporting evidence for the main thesis (evidence - NOT central, only the thesis itself is central)

**CRITICAL FOR COMPARATIVE CLAIMS**: If the main claim is "X is better/more/faster than Y", then:
- ✓ CENTRAL: "X performs better than Y in aspect A" (direct comparison)
- ✓ CENTRAL: "X performs better than Y in aspect B" (another direct comparison)
- ✓ CENTRAL: "Expert consensus supports X over Y" (direct evaluative claim)
- ❌ NOT CENTRAL: "The methodology for comparing X and Y is valid" (meta-analysis)
- ❌ NOT CENTRAL: "The analysis framework is appropriate" (meta-analysis)
- ❌ NOT CENTRAL: "The comparison includes/excludes certain factors" (methodological scope)

**IMPORTANT**: For comparative claims, EACH distinct aspect of the comparison that directly addresses the thesis should have centrality="high". For "hydrogen vs electricity efficiency", claims about well-to-wheel efficiency, production efficiency, AND expert consensus are ALL central because they each address the efficiency thesis from different angles.

**Examples of CENTRAL claims (centrality = "high")**:
- ✓ "The trial was fair and impartial" (PRIMARY evaluative thesis)
- ✓ "The vaccine causes serious side effects" (PRIMARY factual thesis)
- ✓ "The policy violated constitutional rights" (PRIMARY legal thesis)

**Rule of thumb**: In an analysis of "Was X fair?", only the fairness conclusion itself is central. All supporting facts, sources, dates, and background are NOT central.

NOT "high" for:
- Supporting evidence (even if important)
- Attribution claims (who said what)
- Source verification (does document exist)
- Background context
- Peripheral details

## THESIS RELEVANCE (thesisRelevance field) - NEW v2.6.31

**thesisRelevance** determines whether a claim should CONTRIBUTE to the overall verdict:

- **"direct"**: The claim DIRECTLY tests part of the main thesis
  → These claims contribute to the verdict calculation

- **"tangential"**: Related context but does NOT test the thesis
  → These claims are displayed but EXCLUDED from verdict calculation

- **"irrelevant"**: Not meaningfully about the input’s specific topic (noise)
  → These claims should be dropped and not shown

**CRITICAL DISTINCTION**:
- "Was the trial fair?" → claims about the trial's fairness = "direct"
- "Was the trial fair?" → claims about US reactions/sanctions to the trial = "tangential"
- The thesis is about the TRIAL, not about how others REACTED to it

**Examples for input "The Bolsonaro judgment was fair and based on Brazil's law"**:

✓ thesisRelevance="direct" (evaluates the THESIS):
- "The trial followed due process" → directly tests fairness
- "The evidence was properly evaluated" → directly tests fairness
- "Brazilian legal standards were applied" → directly tests legal basis

✗ thesisRelevance="tangential" (does NOT evaluate the thesis):
- "US tariffs were proportionate" → US reaction, not the trial itself
- "US sanctions were justified" → US reaction, not the trial itself
- "Brazil's foreign relations deteriorated" → consequence, not the trial itself

**Rule**: If you can rephrase the claim as "The thesis is true/false BECAUSE [claim]" = direct
          If the claim is "BECAUSE the thesis is true/false, [consequence]" = tangential

**FILTERING RULE**: Claims with checkWorthiness = "low" should be excluded from investigation

**Examples:**

"At least 10 children died because of COVID-19 vaccines"
→ checkWorthiness: HIGH (specific factual claim, readers want proof)
→ harmPotential: HIGH (public health, vaccine safety)
→ centrality: HIGH (core assertion of the article) ← HIGH
→ isCentral: TRUE (centrality is HIGH)

"FDA will require randomized trials for all vaccines"
→ checkWorthiness: HIGH (policy claim that can be verified)
→ harmPotential: HIGH (affects drug development, public health)
→ centrality: HIGH (major policy change claim) ← HIGH
→ isCentral: TRUE (centrality is HIGH)

"Prasad is CBER director"
→ claimRole: attribution
→ checkWorthiness: MEDIUM (verifiable but routine)
→ harmPotential: LOW (credential, not harmful if wrong)
→ centrality: LOW (attribution, not the main point)
→ isCentral: FALSE (centrality is not HIGH)

"An internal email from Dr. Prasad exists stating the FDA will impose stricter regulations"
→ claimRole: source (establishes document existence)
→ checkWorthiness: HIGH (verifiable - does such email exist?)
→ harmPotential: MEDIUM (affects credibility of subsequent claims)
→ centrality: LOW ← MUST BE LOW - this is a source claim, not the core argument!
→ isCentral: FALSE
→ NOTE: Even though this claim is important as a prerequisite, it's NOT central to the ARGUMENT.
→ The argument is about FDA policy, not about email existence.

"The email was sent on November 28"
→ checkWorthiness: LOW (timing detail) ← LOW = EXCLUDE FROM INVESTIGATION
→ harmPotential: LOW (no significant impact)
→ centrality: LOW (peripheral detail)
→ isCentral: FALSE
→ NOTE: This claim should NOT be investigated or displayed (checkWorthiness is LOW)

"The FDA has acted on weak and misleading science in the past"
→ checkWorthiness: HIGH (historical claim, verifiable via documented cases, GAO reports)
→ harmPotential: HIGH (public health, regulatory trust) ← HIGH
→ centrality: MEDIUM (supports main argument but not the core claim)
→ isCentral: FALSE (centrality is not HIGH - supporting evidence, not the core thesis)

"Expert says the policy change is controversial"
→ checkWorthiness: HIGH (verifiable who said what)
→ harmPotential: MEDIUM (affects policy debate)
→ centrality: MEDIUM (contextual, not core)
→ isCentral: FALSE (neither harmPotential nor centrality is HIGH)

### EXAMPLE: Attribution vs Evaluative Content Split

Original text: "Dr. Prasad criticized FDA processes as based on weak science"

CORRECT claim extraction (2 separate claims):

SC5: "Dr. Prasad has publicly criticized past FDA processes"
→ type: factual (did he criticize? YES/NO)
→ claimRole: attribution
→ checkWorthiness: MEDIUM (routine verification)
→ harmPotential: LOW (just confirms he said something)
→ centrality: LOW (attribution only)
→ isCentral: FALSE
→ dependsOn: []

SC6: "Past FDA processes were based on weak and misleading science"
→ type: evaluative (is this assessment accurate?)
→ claimRole: core
→ checkWorthiness: HIGH (historical claim about FDA, verifiable)
→ harmPotential: HIGH (public health, regulatory trust)
→ centrality: HIGH (core evaluative assertion)
→ isCentral: TRUE
→ dependsOn: ["SC5"] (claim originates from Prasad's criticism)

NOTE: SC5 may be TRUE (he did criticize) while SC6 may fall in the UNVERIFIED or LEANING-TRUE bands (43-71%).
The system must verify BOTH: (1) did he say it? AND (2) is what he said accurate?

### Dependencies:
1. List dependencies in dependsOn array (claim IDs that must be true for this claim to matter)
2. Core claims typically depend on attribution claims

## MULTI-SCOPE DETECTION

Look for multiple distinct scopes that should be analyzed separately.
**Definition**: A "Scope" is a bounded analytical frame with defined boundaries, methodology, temporal period, and subject matter.

If the input mixes timelines, distinct scopes, or different analytical frames, split them.

### IMPORTANT: What is a VALID distinct scope
- Separate formal proceedings (e.g., TSE electoral case vs STF criminal case)
- Distinct temporal events (e.g., 2023 rollout vs 2024 review)
- Different jurisdictional processes (e.g., state court vs federal court)
- Different analytical methodologies or boundaries (e.g., broad-boundary vs narrow-boundary vs mid-boundary efficiency analysis)
- Different measurement boundaries (e.g., vehicle-only vs full-lifecycle)
- Different regulatory frameworks (e.g., EU vs US regulations)

### IMPORTANT: What is NOT a distinct scope
- Different national/political perspectives on the SAME event (e.g., "Venezuela's view" vs "US view")
- Different stakeholder viewpoints on a single topic
- Contested interpretations of the same event
- Pro vs con arguments about the same topic
- Claims and counter-claims about one event

**Only create separate scopes for GENUINELY DISTINCT events, proceedings, or analytical frames - not for different perspectives on the same event.**

### GENERIC EXAMPLES - MUST DETECT MULTIPLE SCOPES:

**Legal Domain:**
1. **CTX_TSE**: Electoral proceeding
   - subject: Electoral fraud allegations
   - temporal: 2024
   - status: concluded
   - outcome: Ineligibility ruling
   - metadata: { institution: "Superior Electoral Court", charges: ["Electoral fraud"], decisionMakers: [...] }

2. **CTX_STF**: Criminal proceeding
   - subject: Coup attempt charges
   - temporal: 2024
   - status: concluded
   - outcome: Prison sentence
   - metadata: { institution: "Supreme Federal Court", charges: ["Coup attempt"], decisionMakers: [...] }

**Scientific Domain:**
1. **CTX_BOUNDARY_A**: Narrow boundary analysis
   - subject: Performance/efficiency within a limited boundary
   - temporal: 2024
   - status: concluded
   - outcome: Example numeric estimate
   - metadata: { methodology: "Standard X", boundaries: "Narrow boundary", geographic: "Region A" }

2. **CTX_BOUNDARY_B**: Broad boundary analysis
   - subject: Performance/efficiency across a broader boundary
   - temporal: 2024
   - status: concluded
   - outcome: Example numeric estimate
   - metadata: { methodology: "Standard Y", boundaries: "Broad boundary", geographic: "Region A" }

**CRITICAL: metadata.decisionMakers field is IMPORTANT for legal/regulatory contexts!**
- Extract ALL key decision-makers or primary actors mentioned or known
- Use your background knowledge to fill in known decision-makers for well-documented cases
- This enables cross-scope conflict of interest detection

Set requiresSeparateAnalysis = true when multiple scopes are detected.

## FOR ANY INPUT STYLE

- **impliedClaim**: What claim would "YES" confirm? Must be AFFIRMATIVE.
  - CORRECT: "The process was fair and followed applicable standards"
  - WRONG: "may or may not have been fair"

- **subClaims**: Generate sub-claims that need to be verified to address the thesis.
  - Break down the implied claim into verifiable components
  - For multi-context cases, ensure meaningful coverage across all contexts (set relatedProceedingId appropriately)
  - **DECOMPOSE COMPOUND CLAIMS**: Split claims that combine multiple assertions into separate claims:
    - Isolate the core factual assertion as the CENTRAL claim (isCentral: true, claimRole: "core")
    - Separate source/attribution claims as non-central (isCentral: false, claimRole: "source" or "attribution")
    - Use dependsOn to link claims to their prerequisites
  - For each scope, consider claims covering:
    - Standards application (were relevant rules/standards/methods applied correctly?)
    - Process integrity (were appropriate procedures followed?)
    - Evidence basis (were conclusions based on evidence?)
    - Decision-maker independence (any conflicts of interest?)
    - Outcome proportionality/impact (was the outcome proportionate and consistent with similar situations?)
  - **CRITICAL: DECOMPOSE SPECIFIC OUTCOMES**: When specific outcomes, penalties, or consequences are mentioned (e.g., an \(N\)-year term, a monetary fine, a time-bound ban, ineligibility duration), create a SEPARATE claim evaluating whether that specific outcome was fair, proportionate, or appropriate for the context.

- **researchQueries**: Generate specific queries to research, including:
  - Potential conflicts of interest for key decision-makers
  - Comparisons to similar cases, phases, or precedents
  - Criticisms and rebuttals with documented evidence

## KEY FACTORS (Emergent Decomposition)

**IMPORTANT**: KeyFactors are OPTIONAL and EMERGENT - only generate them if the thesis naturally decomposes into distinct evaluation dimensions.

${CONFIG.keyFactorHints && CONFIG.keyFactorHints.length > 0
  ? `\n**OPTIONAL HINTS** (you may consider these, but are not required to use them):
The following KeyFactor dimensions have been suggested as potentially relevant. Use them only if they genuinely apply to this thesis. If they don't fit, ignore them and generate factors that actually match the thesis:
${CONFIG.keyFactorHints.map((hint, i) => `- ${hint.factor} (${hint.category}): "${hint.evaluationCriteria}"`).join("\n")}`
  : ""}

**WHEN TO GENERATE**: Create keyFactors array when the thesis involves:
- Complex multi-dimensional evaluation (e.g., fairness, legitimacy, effectiveness)
- Topics where truth depends on multiple independent criteria
- Situations requiring structured assessment beyond simple yes/no

**WHEN NOT TO GENERATE**: Leave keyFactors as empty array [] for:
- Simple factual claims ("Did X happen?")
- Single-dimension claims ("Is Y true?")
- Straightforward verifications

**HOW TO GENERATE**: Break down the thesis into 2-5 fundamental queries that must ALL be answered "yes" for the thesis to be true.

**FORMAT**:
- **id**: Unique identifier (KF1, KF2, etc.)
- **evaluationCriteria**: The evaluation criteria (e.g., "Was due process followed?")
- **factor**: SHORT ABSTRACT LABEL (2-5 words ONLY, e.g., "Due Process", "Expert Consensus", "Energy Efficiency")
- **category**: Choose from: "procedural", "evidential", "methodological", "factual", "evaluative"

**CRITICAL: factor MUST be abstract, NOT claim text**:
- GOOD: "Energy efficiency comparison", "Expert consensus", "Procedural fairness"
- BAD: "Professor David Cebon states hydrogen cars need 3x more electricity" (TOO SPECIFIC)
- BAD: "Multiple industry experts say BEVs are more efficient" (CONTAINS ATTRIBUTION)
- BAD: "The well-to-wheel efficiency of hydrogen exceeds electric" (THIS IS A CLAIM)

KeyFactors are CATEGORIES for evaluation, NOT the claims themselves. Specific claims belong in subClaims array.

**EXAMPLES**:

For "The Bolsonaro trial was fair."
[
  {
    "id": "KF1",
    "evaluationCriteria": "Were proper legal procedures and due process followed throughout the trial?",
    "factor": "Procedural Fairness",
    "category": "procedural"
  },
  {
    "id": "KF2",
    "evaluationCriteria": "Were decisions based on documented evidence rather than assumptions or bias?",
    "factor": "Evidence Basis",
    "category": "evidential"
  },
  {
    "id": "KF3",
    "evaluationCriteria": "Were the judges and decision-makers free from conflicts of interest?",
    "factor": "Impartiality",
    "category": "procedural"
  }
]

For "This vaccine causes autism."
[
  {
    "id": "KF1",
    "evaluationCriteria": "Is there documented scientific evidence of a causal mechanism linking vaccines to autism?",
    "factor": "Causal Mechanism",
    "category": "factual"
  },
  {
    "id": "KF2",
    "evaluationCriteria": "Do controlled studies and clinical trials support this causal relationship?",
    "factor": "Clinical Evidence",
    "category": "evidential"
  },
  {
    "id": "KF3",
    "evaluationCriteria": "What does the scientific consensus and expert opinion conclude about this relationship?",
    "factor": "Scientific Consensus",
    "category": "evaluative"
  }
]
**CLAIM-TO-FACTOR MAPPING**: If you generate keyFactors, map each claim to the most relevant factor using keyFactorId. Claims can only map to one factor. Use empty string "" for claims that don't address any specific factor.`;

// Use normalized analysisInput (yes/no→statement) for consistent LLM analysis
  const userPrompt = `Analyze for fact-checking:\n\n"${analysisInputForLLM}"`;

  function extractFirstJsonObject(text: string): string | null {
    const start = text.indexOf("{");
    if (start < 0) return null;
    let depth = 0;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (ch === "{") depth++;
      if (ch === "}") depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
    return null;
  }

  const providerName = (process.env.LLM_PROVIDER ?? "anthropic").toLowerCase();
  const isOpenAiProvider =
    providerName === "openai" || providerName.startsWith("gpt") || providerName.includes("openai");
  const understandingSchemaForProvider = isOpenAiProvider
    ? UNDERSTANDING_SCHEMA_OPENAI
    : UNDERSTANDING_SCHEMA_LENIENT;

  const tryStructured = async (prompt: string, attemptLabel: string) => {
    const startTime = Date.now();
    debugLog(`understandClaim: STARTING LLM CALL (${attemptLabel})`);
    debugLog("understandClaim: Input (first 100 chars)", input.substring(0, 100));
    debugLog("understandClaim: Model", String(model));

    const llmTimeoutMsRaw = parseInt(process.env.FH_UNDERSTAND_LLM_TIMEOUT_MS || "600000", 10);
    const llmTimeoutMs = Number.isFinite(llmTimeoutMsRaw)
      ? Math.max(60000, Math.min(3600000, llmTimeoutMsRaw))
      : 600000;

    const result: any = await Promise.race([
      generateText({
      model,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: userPrompt },
      ],
      temperature: getDeterministicTemperature(0.3),
      output: Output.object({ schema: understandingSchemaForProvider }),
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`understandClaim LLM timeout after ${llmTimeoutMs}ms`)), llmTimeoutMs),
      ),
    ]);

    const elapsed = Date.now() - startTime;
    debugLog(`understandClaim: LLM CALL COMPLETED (${attemptLabel}) in ${elapsed}ms`);
    debugLog("understandClaim: Result keys", result ? Object.keys(result) : "null");

    if (result?.usage || result?.totalUsage) {
      debugLog("understandClaim: Token usage", (result as any).usage || (result as any).totalUsage);
    }
    if (elapsed < 1000) {
      debugLog(`understandClaim: WARNING - LLM responded suspiciously fast (${elapsed}ms)`);
    }

    const rawOutput = extractStructuredOutput(result);
    if (!rawOutput) {
      debugLog(`understandClaim: No structured output (${attemptLabel})`, {
        resultType: typeof result,
        resultKeys: result ? Object.keys(result) : "null",
      });
      return null;
    }
    return rawOutput as any;
  };

  const tryRecoverFromNoObjectGeneratedError = (err: any): ClaimUnderstanding | null => {
    // ai-sdk throws AI_NoObjectGeneratedError with a cause stack containing:
    // "Type validation failed: Value: {...json...}"
    const causeStack = err?.cause?.stack ?? err?.cause?.message ?? "";
    if (typeof causeStack !== "string") return null;
    const idx = causeStack.indexOf("Value:");
    if (idx < 0) return null;
    const jsonStr = extractFirstJsonObject(causeStack.slice(idx));
    if (!jsonStr) return null;
    try {
      const obj = JSON.parse(jsonStr);
      const sp = UNDERSTANDING_SCHEMA_LENIENT.safeParse(obj);
      if (!sp.success) {
        debugLog("understandClaim: recovered Value failed lenient safeParse", {
          issues: sp.error.issues?.slice(0, 10),
        });
        return null;
      }
      debugLog("understandClaim: recovered Value from schema-mismatch error", {
        detectedInputType: sp.data.detectedInputType,
        proceedings: sp.data.distinctProceedings?.length ?? 0,
        requiresSeparateAnalysis: sp.data.requiresSeparateAnalysis,
        subClaims: sp.data.subClaims?.length ?? 0,
      });
      return sp.data;
    } catch (e: any) {
      debugLog("understandClaim: failed to parse recovered Value JSON", e?.message || String(e));
      return null;
    }
  };

  const tryJsonTextFallback = async () => {
    debugLog("understandClaim: FALLBACK JSON TEXT ATTEMPT");
    const system = `Return ONLY a single JSON object matching the expected schema.\n- Do NOT include markdown.\n- Do NOT include explanations.\n- Do NOT wrap in code fences.\n- Use empty strings \"\" and empty arrays [] when unknown.\n\nIMPORTANT TERMINOLOGY:\n- ArticleContext is narrative background; do NOT create separate scopes from perspectives.\n- distinctProceedings represents EvidenceScopes (analysis scopes).\n\nThe JSON object MUST contain at least these top-level keys:\n- detectedInputType\n- analysisIntent\n- originalInputDisplay\n- impliedClaim\n- distinctProceedings\n- requiresSeparateAnalysis\n- proceedingContext\n- mainThesis\n- articleThesis\n- subClaims\n- distinctEvents\n- legalFrameworks\n- researchQueries\n- riskTier\n- keyFactors`;
    const llmTimeoutMsRaw = parseInt(process.env.FH_UNDERSTAND_LLM_TIMEOUT_MS || "600000", 10);
    const llmTimeoutMs = Number.isFinite(llmTimeoutMsRaw)
      ? Math.max(60000, Math.min(3600000, llmTimeoutMsRaw))
      : 600000;

    const result: any = await Promise.race([
      generateText({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `${userPrompt}\n\nReturn JSON only.` },
      ],
      temperature: getDeterministicTemperature(0.2),
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`understandClaim JSON fallback timeout after ${llmTimeoutMs}ms`)), llmTimeoutMs),
      ),
    ]);

    const txt = (result as any)?.text as string | undefined;
    if (!txt || typeof txt !== "string") return null;
    const jsonStr = extractFirstJsonObject(txt);
    if (!jsonStr) return null;
    try {
      const obj = JSON.parse(jsonStr);
      const parsed = UNDERSTANDING_SCHEMA_LENIENT.safeParse(obj);
      if (!parsed.success) {
        debugLog("understandClaim: JSON fallback safeParse failed", {
          issues: parsed.error.issues?.slice(0, 10),
        });
        return null;
      }
      return parsed.data;
    } catch (e: any) {
      debugLog("understandClaim: JSON fallback parse failed", e?.message || String(e));
      return null;
    }
  };

  const handleApiKeyOrQuota = (errMsg: string) => {
    if (errMsg.includes("credit balance is too low") || errMsg.includes("insufficient_quota")) {
      console.error("[Analyzer] ❌ ANTHROPIC API CREDITS EXHAUSTED - Please add credits at https://console.anthropic.com/settings/plans");
      throw new Error("Anthropic API credits exhausted. Please add credits or switch to a different LLM provider (LLM_PROVIDER=openai)");
    }
    if (errMsg.includes("invalid_api_key") || errMsg.includes("401")) {
      console.error("[Analyzer] ❌ INVALID API KEY - Check your ANTHROPIC_API_KEY or OPENAI_API_KEY");
      throw new Error("Invalid API key. Please check your LLM provider API key.");
    }
  };

  let parsed: any = null;
  try {
    parsed = await tryStructured(systemPrompt, "structured-1");
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    debugLog("understandClaim: FAILED (structured-1)", errMsg);
    debugLog("understandClaim: FAILED (structured-1) details", JSON.stringify(err, Object.getOwnPropertyNames(err), 2).slice(0, 2000));
    console.error("[Analyzer] generateText failed in understandClaim (structured-1):", errMsg);
    handleApiKeyOrQuota(errMsg);
    parsed = tryRecoverFromNoObjectGeneratedError(err);
  }

  if (!parsed) {
    // Retry once with a smaller, schema-focused prompt (providers sometimes fail on long prompts + strict schemas).
    // v2.6.30: Changed detectedInputType to "claim | article" - yes/no inputs are normalized to claims at entry point
    const retryPrompt = `You are a fact-checking analyst.

Return ONLY a single JSON object that EXACTLY matches the expected schema.
- No markdown, no prose, no code fences.
- Every required field must exist.
- Use empty strings "" and empty arrays [] when unknown.

CRITICAL: MULTI-SCOPE DETECTION
- Detect whether the input mixes multiple distinct scopes (e.g., different events, methodologies, institutions, jurisdictions, timelines, or processes).
- If there are 2+ distinct scopes, put them in distinctProceedings (one per scope) and set requiresSeparateAnalysis=true.
- If there is only 1 scope, distinctProceedings may contain 0 or 1 item, and requiresSeparateAnalysis=false.

NOT DISTINCT SCOPES:
- Different perspectives on the same event (e.g., "US view" vs "Brazil view") are NOT separate scopes by themselves.
- Pro vs con viewpoints are NOT scopes.

SCOPE RELEVANCE REQUIREMENT (CRITICAL):
- Every scope MUST be directly relevant to the SPECIFIC TOPIC of the input
- Do NOT include scopes from unrelated domains just because they share a general category
- When in doubt, use fewer scopes rather than including marginally relevant ones
- A scope with zero relevant claims/evidence should NOT exist

ENUM RULES
- detectedInputType must be exactly one of: claim | article
- analysisIntent must be exactly one of: verification | exploration | comparison | none
- riskTier must be exactly one of: A | B | C

CLAIMS
- Populate subClaims with 3–8 verifiable sub-claims when possible.
- Every subClaim must include ALL required fields and use allowed enum values.

Now analyze the input and output JSON only.`;
    try {
      parsed = await tryStructured(retryPrompt, "structured-2");
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      debugLog("understandClaim: FAILED (structured-2)", errMsg);
      debugLog("understandClaim: FAILED (structured-2) details", JSON.stringify(err, Object.getOwnPropertyNames(err), 2).slice(0, 2000));
      console.error("[Analyzer] generateText failed in understandClaim (structured-2):", errMsg);
      handleApiKeyOrQuota(errMsg);
      parsed = tryRecoverFromNoObjectGeneratedError(err);
    }
  }

  if (!parsed) {
    parsed = await tryJsonTextFallback();
  }

  if (!parsed) throw new Error("Failed to understand claim: structured output did not match schema");

  // Ensure no orphaned scope assignments: if any subClaim uses relatedProceedingId, that ID must
  // exist in distinctProceedings. Some providers may emit claim assignments that reference IDs
  // they didn't include in distinctProceedings; we reconcile deterministically.
  const reconcileScopesWithClaimAssignments = (u: ClaimUnderstanding) => {
    const scopes = Array.isArray((u as any).distinctProceedings) ? (u as any).distinctProceedings : [];
    const scopeIds = new Set(scopes.map((s: any) => String(s?.id || "")).filter(Boolean));
    const claims = Array.isArray((u as any).subClaims) ? (u as any).subClaims : [];

    const missing = new Set<string>();
    for (const c of claims as any[]) {
      const rp = String(c?.relatedProceedingId || "").trim();
      if (rp && !scopeIds.has(rp)) missing.add(rp);
    }
    if (missing.size === 0) return u;

    for (const id of Array.from(missing)) {
      const exemplar = (claims as any[]).find((c) => String(c?.relatedProceedingId || "").trim() === id);
      const rawName = String(exemplar?.text || "").trim();
      const name = rawName ? rawName.slice(0, 120) : `${id} scope`;
      const shortName = id.replace(/^CTX_/, "").slice(0, 12) || "SCOPE";
      scopes.push({
        id,
        name,
        shortName,
        subject: rawName || "",
        temporal: "",
        status: "unknown",
        outcome: "unknown",
        metadata: {},
      });
      scopeIds.add(id);
    }

    // If any claim still references a non-existent ID (shouldn't happen), clear it.
    for (const c of claims as any[]) {
      const rp = String(c?.relatedProceedingId || "").trim();
      if (rp && !scopeIds.has(rp)) c.relatedProceedingId = "";
    }

    (u as any).distinctProceedings = scopes;
    (u as any).requiresSeparateAnalysis = scopes.length > 1;
    return u;
  };

  parsed = reconcileScopesWithClaimAssignments(parsed);

  // =========================================================================
  // POST-PROCESSING: Use early-normalized input for input neutrality
  // Since we normalized to statements BEFORE the LLM call (lines 2504-2528),
  // both paths now converge. We use:
  // - originalInputDisplay (raw input): for UI display
  // - analysisInput (from line 2528): for analysis (impliedClaim)
  // =========================================================================
  const trimmedInput = input.trim();

  // UI display: prefer the original raw input; otherwise use trimmed input
  parsed.originalInputDisplay = originalInputDisplay || parsed.originalInputDisplay || trimmedInput;

  // v2.6.26: ALWAYS force impliedClaim to normalized statement for input neutrality
  // Regardless of what LLM returns, use analysisInput to ensure any input style
  // produces identical analysis results. This is unconditional - no checking LLM output.
  const llmImpliedClaim = parsed.impliedClaim;
  parsed.impliedClaim = analysisInput;
  console.log(`[Analyzer] Input Neutrality: impliedClaim forced to normalized statement`);
  console.log(`[Analyzer]   LLM returned: "${(llmImpliedClaim || '').substring(0, 80)}..."`);
  console.log(`[Analyzer]   Using: "${analysisInput.substring(0, 80)}..."`);
  // Validate parsed has required fields
  if (!parsed.subClaims || !Array.isArray(parsed.subClaims)) {
    console.error(
      "[Analyzer] Invalid parsed output - missing subClaims:",
      parsed,
    );
    throw new Error("LLM output missing required fields");
  }

  // Canonicalize proceedings early so:
  // - IDs are stable (P1/P2/...) instead of model-invented IDs
  // - downstream research queries don't drift because the model changed labels/dates
  // v2.6.23: Use analysisInput (normalized statement) for consistent scope canonicalization
  // This ensures any input phrasing yields identical scope detection and research queries
  parsed = canonicalizeScopes(analysisInput, parsed);
  debugLog("understandClaim: scopes after canonicalize", {
    detectedInputType: parsed.detectedInputType,
    requiresSeparateAnalysis: parsed.requiresSeparateAnalysis,
    count: parsed.distinctProceedings?.length ?? 0,
    ids: (parsed.distinctProceedings || []).map((p: any) => p.id),
  });

  // If the model under-split scopes for a claim, do a single best-effort retry
  // focused ONLY on scope detection. v2.6.30: Simplified - single input type after normalization
  if (
    CONFIG.deterministic &&
    parsed.detectedInputType === "claim" &&
    (parsed.distinctProceedings?.length ?? 0) <= 1
  ) {
    // v2.6.23: Use normalized analysisInput for scope detection to maintain input neutrality.
      // When deterministic mode is enabled, yes/no forms are normalized to statements earlier (lines 2507-2528).
    // Using the same normalized form here ensures scope detection aligns with claim analysis,
    // preventing scope-to-statement misalignment and maintaining input neutrality.
    const supplementalInput = parsed.impliedClaim || analysisInput;
    const supplemental = await requestSupplementalScopes(supplementalInput, model, parsed);
    if (supplemental?.distinctProceedings && supplemental.distinctProceedings.length > 1) {
      parsed = {
        ...parsed,
        requiresSeparateAnalysis: true,
        distinctProceedings: supplemental.distinctProceedings,
      };
      // v2.6.23: Use analysisInput (normalized statement) for consistent scope canonicalization
      parsed = canonicalizeScopes(analysisInput, parsed);
      debugLog("understandClaim: supplemental scopes applied", {
        detectedInputType: parsed.detectedInputType,
        requiresSeparateAnalysis: parsed.requiresSeparateAnalysis,
        count: parsed.distinctProceedings?.length ?? 0,
        ids: (parsed.distinctProceedings || []).map((p: any) => p.id),
      });
    }
  }

  // v2.6.30: Input Neutrality: all inputs must be treated identically
  const isShortSimpleInput =
    input.trim().length > 0 &&
    input.trim().length <= SHORT_SIMPLE_INPUT_MAX_CHARS &&
    parsed.subClaims.length <= 1 &&
    (parsed.keyFactors?.length ?? 0) <= 1 &&
    // Comparative statements are short but need decomposition; don't skip expansion.
    !isComparativeLikeText(analysisInput);

  if (isShortSimpleInput && parsed.detectedInputType === "article") {
    parsed.detectedInputType = "claim";
    if (!parsed.originalInputDisplay) {
      parsed.originalInputDisplay = trimmedInput;
    }
    if (!parsed.impliedClaim) {
      parsed.impliedClaim = trimmedInput;
    }
  }

  // Post-processing: Re-prompt if coverage is thin (single attempt only)
  // Skip for short, simple inputs.
  if (!isShortSimpleInput) {
    for (let attempt = 0; attempt < SUPPLEMENTAL_REPROMPT_MAX_ATTEMPTS; attempt++) {
      // Use analysisInput (normalized statement) for input neutrality
      const supplementalClaims = await requestSupplementalSubClaims(
        analysisInput,
        model,
        parsed
      );
      if (supplementalClaims.length === 0) break;
      parsed.subClaims.push(...supplementalClaims);
      console.log(`[Analyzer] Added ${supplementalClaims.length} supplemental claims to balance scope coverage`);
      // Supplemental claims may introduce new relatedProceedingId values. Ensure distinctProceedings
      // covers all referenced scope IDs, then re-canonicalize for stable IDs.
      parsed = reconcileScopesWithClaimAssignments(parsed);
      parsed = canonicalizeScopes(analysisInput, parsed);
      break;
    }
  }

  // Deterministic normalization of importance labels.
  // This enforces role-based invariants and derives isCentral consistently.
  normalizeSubClaimsImportance(parsed.subClaims as any);

  // Post-processing: Ensure keyEntities are populated for each claim
  for (const claim of parsed.subClaims) {
    if (!claim.keyEntities || claim.keyEntities.length === 0) {
      // Extract key terms from claim text
      const stopWords = new Set(["the", "a", "an", "is", "was", "were", "are", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "shall", "can", "need", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after", "and", "but", "if", "or", "because", "this", "that", "these", "those", "it", "its", "what", "which", "who", "whom", "whose", "based"]);
      const words = claim.text
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((word: string) => word.length > 2 && !stopWords.has(word));
      // Take unique words, prioritize capitalized words from original text
      const capitalizedWords = claim.text
        .match(/[A-Z][a-z]+/g) || [];
      const uniqueTerms = [...new Set([...capitalizedWords, ...words])].slice(0, 5);
      claim.keyEntities = uniqueTerms;
      console.log(`[Analyzer] Auto-populated keyEntities for claim "${claim.id}": ${uniqueTerms.join(", ")}`);
    }
  }

  const claimsWithPositions = parsed.subClaims.map((claim: any) => {
    const positions = findClaimPosition(input, claim.text);
    return {
      ...claim,
      startOffset: positions?.start,
      endOffset: positions?.end,
    };
  });

  // Filter out claims with low checkWorthiness - they should not be investigated or displayed
  const filteredClaims = claimsWithPositions.filter((claim: any) => {
    if (claim.checkWorthiness === "low") {
      console.log(`[Analyzer] Excluding claim "${claim.id}" with low checkWorthiness: "${claim.text.slice(0, 50)}..."`);
      return false;
    }
    return true;
  });

  console.log(`[Analyzer] Filtered ${claimsWithPositions.length - filteredClaims.length} claims with low checkWorthiness, ${filteredClaims.length} remaining`);

  // Apply Gate 1: Claim Validation (filter opinions, predictions, low-specificity claims)
  // CRITICAL: Central claims are NEVER filtered, only flagged for review
  const { validatedClaims, stats: gate1Stats } = applyGate1ToClaims(filteredClaims);
  console.log(`[Analyzer] Gate 1 applied: ${gate1Stats.passed}/${gate1Stats.total} claims passed, ${gate1Stats.centralKept} central claims kept despite issues`);

  const claimsWithThesisRelevanceInvariant = enforceThesisRelevanceInvariants(validatedClaims as any);
  const claimsPolicyB = applyThesisRelevancePolicyBToSubClaims(claimsWithThesisRelevanceInvariant as any);
  return { ...parsed, subClaims: claimsPolicyB, gate1Stats };
}

async function requestSupplementalSubClaims(
  input: string,
  model: any,
  understanding: ClaimUnderstanding,
): Promise<ClaimUnderstanding["subClaims"]> {
  const scopes = understanding.distinctProceedings || [];
  const hasScopes = scopes.length > 0;
  const isMultiScope = scopes.length > 1;
  const singleScopeId = scopes.length === 1 ? scopes[0].id : "";

  const normalizeText = (text: string) =>
    text.toLowerCase().replace(/\s+/g, " ").trim();

  const claimsByProc = new Map<string, ClaimUnderstanding["subClaims"]>();
  const coreCounts = new Map<string, number>();
  const existingTextByProc = new Map<string, Set<string>>();
  const existingTextGlobal = new Set<string>();

  const coverageTargets = hasScopes
    ? scopes.map((s) => ({ id: s.id, name: s.name }))
    : [{ id: "", name: "General" }];

  for (const target of coverageTargets) {
    claimsByProc.set(target.id, []);
    existingTextByProc.set(target.id, new Set());
    coreCounts.set(target.id, 0);
  }

  for (const claim of understanding.subClaims) {
    const normalized = normalizeText(claim.text || "");
    if (normalized) {
      existingTextGlobal.add(normalized);
    }

    // For single-scope (or no-scope) runs, treat all claims as belonging to the
    // single/default scope to avoid brittle ID mismatches.
    const procId = isMultiScope ? (claim.relatedProceedingId || "") : (singleScopeId || "");

    if (isMultiScope && !procId) continue;
    if (!claimsByProc.has(procId)) continue;

    claimsByProc.get(procId)!.push(claim);
    existingTextByProc.get(procId)!.add(normalized);
    if (claim.claimRole === "core") {
      coreCounts.set(procId, (coreCounts.get(procId) || 0) + 1);
    }
  }

  const missingProceedings = coverageTargets
    .map((target) => {
      const totalClaims = claimsByProc.get(target.id)?.length ?? 0;
      const core = coreCounts.get(target.id) || 0;
      const needsCoverage =
        core < MIN_CORE_CLAIMS_PER_PROCEEDING &&
        !(core === 1 && totalClaims >= MIN_TOTAL_CLAIMS_WITH_SINGLE_CORE);
      return { target, totalClaims, core, needsCoverage };
    })
    .filter((entry) => entry.needsCoverage);

  if (missingProceedings.length === 0) return [];

  const missingSummary = missingProceedings
    .map(({ target, totalClaims, core }) => {
      const neededCore = Math.max(0, MIN_CORE_CLAIMS_PER_PROCEEDING - core);
      const label = target.id ? `${target.id}: ${target.name}` : `${target.name}`;
      return `- ${label} (total=${totalClaims}, core=${core}, need +${neededCore} core)`;
    })
    .join("\n");

  const existingClaimsSummary = missingProceedings
    .map(({ target }) => {
      const claims = claimsByProc.get(target.id) || [];
      const label = target.id ? `${target.id}` : `${target.name}`;
      if (claims.length === 0) return `- ${label}: (no claims yet)`;
      return `- ${label}:\n${claims
        .map((claim) => `  - ${claim.id}: ${claim.text}`)
        .join("\n")}`;
    })
    .join("\n");

  const systemPrompt = `You are a fact-checking assistant. Add missing subClaims ONLY for the listed contexts.
 - Return ONLY new claims (do not repeat existing ones).
 - Each claim must be tied to a single scope via relatedProceedingId.${hasScopes ? "" : " Use an empty string if no scopes are listed."}
 - Use claimRole="core" and checkWorthiness="high".
 - Set harmPotential and centrality realistically. Default centrality to "medium" unless the claim is truly the primary thesis of that scope.
 - Set isCentral=true if centrality==="high" (harmPotential affects risk tier, not centrality).
 - Use dependsOn=[] unless a dependency is truly required.
 - Ensure each listed context reaches at least ${MIN_CORE_CLAIMS_PER_PROCEEDING} core claims.
 - **CRITICAL**: If specific outcomes, penalties, or consequences are mentioned (e.g., an \(N\)-year term, a monetary fine, a time-bound ban), create a SEPARATE claim evaluating whether that specific outcome was fair, proportionate, or appropriate.`;

  const userPrompt = `INPUT:\n"${input}"\n\nCONTEXTS NEEDING MORE CLAIMS:\n${missingSummary}\n\nEXISTING CLAIMS (DO NOT DUPLICATE):\n${existingClaimsSummary}`;

  let supplemental: any;
  try {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: getDeterministicTemperature(0.2),
      output: Output.object({ schema: SUPPLEMENTAL_SUBCLAIMS_SCHEMA }),
    });

    supplemental = extractStructuredOutput(result);
  } catch (err: any) {
    debugLog("requestSupplementalSubClaims: FAILED", err?.message || String(err));
    return [];
  }

  if (!supplemental?.subClaims || !Array.isArray(supplemental.subClaims)) {
    debugLog("requestSupplementalSubClaims: No supplemental claims returned");
    return [];
  }

  const allowedProcIds = new Set(missingProceedings.map((entry) => entry.target.id));
  const existingIds = new Set(understanding.subClaims.map((c) => c.id));
  const idRemap = new Map<string, string>();

  let maxId = 0;
  for (const claim of understanding.subClaims) {
    const match = /^SC(\d+)$/i.exec(claim.id || "");
    if (match) {
      const num = Number(match[1]);
      if (!Number.isNaN(num)) maxId = Math.max(maxId, num);
    }
  }

  const nextId = () => {
    let candidate = `SC${++maxId}`;
    while (existingIds.has(candidate)) {
      candidate = `SC${++maxId}`;
    }
    return candidate;
  };

  const supplementalClaims: ClaimUnderstanding["subClaims"] = [];
  for (const claim of supplemental.subClaims) {
    // For single-scope/no-scope runs, force all supplemental claims onto the default scope.
    // This avoids dropping good claims due to model-invented IDs.
    let procId = isMultiScope ? (claim?.relatedProceedingId || "") : (singleScopeId || "");
    if (isMultiScope && !procId) {
      continue;
    }
    if (!allowedProcIds.has(procId)) {
      continue;
    }

    const normalized = normalizeText(claim.text || "");
    if (!normalized) continue;

    if (existingTextGlobal.has(normalized)) continue;

    const existingTexts = existingTextByProc.get(procId) || new Set();
    if (existingTexts.has(normalized)) continue;

    let newId = claim.id || "";
    if (!newId || existingIds.has(newId)) {
      newId = nextId();
      if (claim.id) idRemap.set(claim.id, newId);
    }

    existingIds.add(newId);
    existingTexts.add(normalized);

    supplementalClaims.push({
      ...claim,
      id: newId,
      relatedProceedingId: procId,
      dependsOn: Array.isArray(claim.dependsOn) ? claim.dependsOn : [],
      keyEntities: Array.isArray(claim.keyEntities) ? claim.keyEntities : [],
    });
  }

  if (idRemap.size > 0) {
    for (const claim of supplementalClaims) {
      if (!Array.isArray(claim.dependsOn)) continue;
      claim.dependsOn = claim.dependsOn.map((dep) => idRemap.get(dep) || dep);
    }
  }

  return supplementalClaims;
}

/**
 * Best-effort: ask the model to (re)consider whether there are multiple distinct contexts/threads.
 * This is intentionally generic and only applied when the initial understanding appears under-split.
 */
async function requestSupplementalScopes(
  input: string,
  model: any,
  understanding: ClaimUnderstanding,
): Promise<Pick<ClaimUnderstanding, "distinctProceedings" | "requiresSeparateAnalysis"> | null> {
  const currentCount = Array.isArray(understanding.distinctProceedings)
    ? understanding.distinctProceedings.length
    : 0;
  if (currentCount > 1) return null;

  const systemPrompt = `You are a fact-checking assistant.

Return ONLY a single JSON object with keys:
- distinctProceedings: array
- requiresSeparateAnalysis: boolean

CRITICAL:
- Detect whether the input mixes 2+ distinct contexts/threads (e.g., different events, phases, institutions, jurisdictions, timelines, or processes).
- Only split when there are clearly 2+ distinct contexts that would benefit from separate analysis.
- If there is only 1 context, return an empty array or a 1-item array and set requiresSeparateAnalysis=false.

NOT DISTINCT SCOPES:
- Different perspectives on the same event (e.g., "US view" vs "Brazil view") are NOT separate contexts/scopes by themselves.
- Pro vs con viewpoints are NOT scopes.

SCOPE RELEVANCE REQUIREMENT (CRITICAL):
- Every scope MUST be directly relevant to the SPECIFIC TOPIC of the input
- Do NOT include scopes from unrelated domains just because they share a general category
- When in doubt, use fewer scopes rather than including marginally relevant ones
- A scope with zero relevant claims/evidence should NOT exist

SCHEMA:
distinctProceedings items must include:
- id (string)
- name (string)
- shortName (string)
- subject (string)
- temporal (string)
- status (concluded|ongoing|pending|unknown)
- outcome (string)
- metadata (object, may include domain-specific fields like court/institution/jurisdiction/charges/decisionMakers/methodology/boundaries/geographic/standardApplied)

Use empty strings "" and empty arrays [] when unknown.`;

  const userPrompt = `INPUT:\n"${input}"\n\nCURRENT distinctProceedings COUNT: ${currentCount}\nReturn JSON only.`;

  const schema = z.object({
    requiresSeparateAnalysis: z.boolean(),
    distinctProceedings: z.array(ANALYSIS_CONTEXT_SCHEMA),
  });

  try {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: getDeterministicTemperature(0.2),
      output: Output.object({ schema }),
    });
    const raw = extractStructuredOutput(result) as any;
    if (!raw) return null;
    const sp = schema.safeParse(raw);
    if (!sp.success) return null;

    // Only accept if it meaningfully improves multi-context detection.
    const nextCount = sp.data.distinctProceedings?.length ?? 0;
    if (nextCount <= 1 || !sp.data.requiresSeparateAnalysis) return null;

    return {
      requiresSeparateAnalysis: sp.data.requiresSeparateAnalysis,
      distinctProceedings: sp.data.distinctProceedings,
    };
  } catch (err: any) {
    debugLog("requestSupplementalScopes: FAILED", err?.message || String(err));
    return null;
  }
}

/**
 * Extract outcome-related claims from facts discovered during research.
 * This addresses cases where specific outcomes (e.g., an N-year term) are mentioned
 * in research but weren't in the original input, so no claim was created initially.
 */
async function extractOutcomeClaimsFromFacts(
  state: ResearchState,
  model: any,
): Promise<ClaimUnderstanding["subClaims"]> {
  if (!state.understanding || state.facts.length === 0) return [];

  const understanding = state.understanding;
  const scopes = understanding.distinctProceedings || [];
  const existingClaims = understanding.subClaims || [];
  const existingClaimTexts = new Set(existingClaims.map((c) => c.text.toLowerCase().trim()));

  // Extract facts text for LLM analysis
  const factsText = state.facts
    .slice(0, 50) // Limit to first 50 facts to avoid token limits
    .map((f, idx) => `F${idx + 1}: ${f.fact}`)
    .join("\n");

  if (!factsText || factsText.length < 100) return [];

  // Check if any facts mention outcomes (quick heuristic check before LLM call)
  const outcomeKeywords = /\b(\d+\s*(?:year|month|day)\s*(?:sentence|prison|jail|ban|ineligible|suspended|fine|penalty|sanction)|sentenced|convicted|acquitted|fined|banned|ineligible)\b/i;
  if (!outcomeKeywords.test(factsText)) {
    return [];
  }

  const systemPrompt = `You are a fact-checking assistant. Extract specific outcomes, penalties, or consequences mentioned in the facts that should be evaluated as separate claims.

Return ONLY a JSON object with an "outcomes" array. Each outcome should have:
- "outcome": The specific outcome mentioned (e.g., "27-year prison sentence", "8-year ineligibility", "$1M fine")
- "relatedProceedingId": The proceeding ID this outcome relates to (or empty string if unclear)
- "claimText": A claim evaluating whether this outcome was fair/proportionate (e.g., "The 27-year prison sentence was proportionate to the crimes committed")

Only extract outcomes that:
1. Are specific and quantifiable (e.g., "27-year sentence", not just "sentenced")
2. Are NOT already covered by existing claims
3. Are relevant to evaluating fairness/proportionality

Return empty array if no such outcomes are found.`;

  const userPrompt = `FACTS DISCOVERED DURING RESEARCH:
${factsText}

EXISTING CLAIMS (DO NOT DUPLICATE):
${existingClaims.map((c) => `- ${c.id}: ${c.text}`).join("\n")}

SCOPES:
${scopes.map((s) => `- ${s.id}: ${s.name}`).join("\n")}

Extract outcomes that need separate evaluation claims.`;

  const OUTCOME_SCHEMA = z.object({
    outcomes: z.array(
      z.object({
        outcome: z.string(),
        relatedProceedingId: z.string(),
        claimText: z.string(),
      })
    ),
  });

  try {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: getDeterministicTemperature(0.2),
      output: Output.object({ schema: OUTCOME_SCHEMA }),
    });

    const extracted = extractStructuredOutput(result);
    if (!extracted?.outcomes || !Array.isArray(extracted.outcomes)) return [];

    // Generate claim IDs and create claim objects
    let maxId = 0;
    for (const claim of existingClaims) {
      const match = /^SC(\d+)$/i.exec(claim.id || "");
      if (match) {
        const num = Number(match[1]);
        if (!Number.isNaN(num)) maxId = Math.max(maxId, num);
      }
    }

    const outcomeClaims: ClaimUnderstanding["subClaims"] = [];
    for (const outcome of extracted.outcomes) {
      // Skip if claim text is too similar to existing claims
      const normalized = outcome.claimText.toLowerCase().trim();
      if (existingClaimTexts.has(normalized)) continue;

      const newId = `SC${++maxId}`;
      outcomeClaims.push({
        id: newId,
        text: outcome.claimText,
        type: "evaluative",
        claimRole: "core",
        dependsOn: [],
        keyEntities: [],
        checkWorthiness: "high",
        harmPotential: "high",
        // Outcome fairness claims are often important but not always the *primary thesis*.
        // Let centrality/isCentral be determined by the main UNDERSTAND rubric + guardrails.
        centrality: "medium",
        isCentral: false,
        thesisRelevance: "direct", // Outcome claims are direct evaluations
        relatedProceedingId: outcome.relatedProceedingId || "",
        approximatePosition: "",
        keyFactorId: "",
      });
      existingClaimTexts.add(normalized);
    }

    return outcomeClaims;
  } catch (err: any) {
    debugLog("extractOutcomeClaimsFromFacts: FAILED", err?.message || String(err));
    return [];
  }
}

/**
 * Enrich proceedings/scopes with outcomes discovered in the extracted facts.
 * Uses LLM to extract outcomes generically (no hardcoded domain-specific patterns).
 * This addresses the issue where outcome is shown as "pending" or "unknown" in the UI
 * even though the actual outcome was found in the evidence.
 */
async function enrichScopesWithOutcomes(state: ResearchState, model: any): Promise<void> {
  if (!state.understanding?.distinctProceedings?.length) return;

  const facts = state.facts || [];
  if (facts.length === 0) return;

  for (const proc of state.understanding.distinctProceedings) {
    // Skip if already has a specific outcome (not vague placeholders)
    const currentOutcome = (proc.outcome || "").toLowerCase().trim();
    const isVagueOutcome = !currentOutcome ||
      currentOutcome === "unknown" ||
      currentOutcome === "pending" ||
      currentOutcome.includes("investigation") ||
      currentOutcome.includes("ongoing") ||
      currentOutcome.includes("not yet") ||
      currentOutcome.includes("to be determined");

    if (!isVagueOutcome) continue;

    // Get facts related to this scope
    const relevantFacts = facts.filter(f =>
      !f.relatedProceedingId || f.relatedProceedingId === proc.id
    );

    if (relevantFacts.length === 0) continue;

    const factsText = relevantFacts.map(f => `- ${f.fact}`).join("\n").slice(0, 4000);

    try {
      // Use LLM to extract outcome - generic, not domain-specific
      const result = await generateText({
        model,
        temperature: CONFIG.deterministic ? 0 : undefined,
        messages: [
          { role: "system", content: "You extract specific outcomes from evidence. Return ONLY the outcome phrase, nothing else." },
          { role: "user", content: `Given these facts about "${proc.name}" (${proc.subject || ""}):

${factsText}

What is the specific, concrete outcome or result mentioned?
- Return ONLY the outcome in a short phrase (e.g., "8-year penalty", "approved", "rejected", "settled for $X")
- If no specific outcome is mentioned, return exactly: NONE
- Do NOT return vague terms like "pending", "ongoing", "under investigation"` },
        ],
      });
      const text = result.text;

      const outcome = text.trim();
      if (outcome && outcome !== "NONE" && outcome.length < 100) {
        console.log(`[Analyzer] Enriched scope "${proc.name}" outcome: "${proc.outcome}" → "${outcome}"`);
        proc.outcome = outcome;
        // Update status if we found a concrete outcome
        if (proc.status === "pending" || proc.status === "ongoing" || proc.status === "unknown") {
          proc.status = "concluded";
        }
      }
    } catch (err: any) {
      debugLog("enrichScopesWithOutcomes: LLM call failed", err?.message || String(err));
      // Continue with other proceedings
    }
  }
}

function findClaimPosition(
  text: string,
  claimText: string,
): { start: number; end: number } | null {
  const normalizedText = text.toLowerCase();
  const normalizedClaim = claimText.toLowerCase();

  let index = normalizedText.indexOf(normalizedClaim);
  if (index !== -1) {
    return { start: index, end: index + claimText.length };
  }
  return null;
}

// v2.6.30: Simplified - returns true for claims (NOT articles)
// Yes/no phrasing is normalized to claims at entry point, so no separate type exists
function isClaimInput(understanding: ClaimUnderstanding): boolean {
  return understanding.detectedInputType === "claim";
}

function resolveAnalysisPromptInput(
  understanding: ClaimUnderstanding,
  state: ResearchState,
): string {
  // v2.6.25: Never use originalInputDisplay for analysis - it's display-only
  // This ensures all inputs produce identical analysis results
  return (
    understanding.impliedClaim ||
    understanding.articleThesis ||
    understanding.mainThesis ||
    state.originalInput ||
    state.originalText ||
    ""
  );
}

// ============================================================================
// STEP 2-4: Research with Search Tracking
// ============================================================================

interface ResearchDecision {
  complete: boolean;
  focus?: string;
  queries?: string[];
  category?: string;
  isContradictionSearch?: boolean;
  targetProceedingId?: string;
  targetClaimId?: string;
  /** If true, search should use date filtering for recency */
  recencyMatters?: boolean;
}

function decideNextResearch(state: ResearchState): ResearchDecision {
  const config = getActiveConfig();
  const categories = [
    ...new Set(state.facts.map((f: ExtractedFact) => f.category)),
  ];
  const understanding = state.understanding!;

  const directClaimsForResearch = (understanding.subClaims || []).filter(
    (c: any) => !c?.thesisRelevance || c.thesisRelevance === "direct",
  );

  const entities = directClaimsForResearch
    .flatMap((c: any) => c.keyEntities)
    .slice(0, 4);

  // For claim inputs (normalized), prioritize the implied claim for better search results
  const isClaimLike = isClaimInput(understanding);
  const stopWords = new Set(["the", "a", "an", "is", "was", "were", "are", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "shall", "can", "need", "dare", "ought", "used", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after", "above", "below", "between", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "just", "and", "but", "if", "or", "because", "until", "while", "although", "though", "whether", "this", "that", "these", "those", "it", "its", "what", "which", "who", "whom", "whose", "based"]);

  let entityStr = "";

  // For claim inputs, always use the implied claim as primary search basis
  if (isClaimLike && understanding.impliedClaim) {
    entityStr = understanding.impliedClaim
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 8)
      .join(" ");
  } else {
    // For articles/claims, use keyEntities
    entityStr = entities.join(" ");
  }

  // Fallback: if entityStr is empty, extract terms from claim text or thesis
  if (!entityStr.trim()) {
    const fallbackText = understanding.impliedClaim
      || understanding.articleThesis
      || directClaimsForResearch[0]?.text
      || state.originalText?.slice(0, 150)
      || "";
    entityStr = fallbackText
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 6)
      .join(" ");
  }

  const hasLegal = categories.includes("legal_provision");
  const hasEvidence = categories.includes("evidence");

  // Detect if this topic requires recent data
  // v2.6.25: Use impliedClaim (normalized) for consistent recency detection across input styles
  const recencyMatters = isRecencySensitive(
    understanding.impliedClaim || understanding.articleThesis || state.originalInput || "",
    understanding
  );

  // Get current year for date-specific queries
  const currentYear = new Date().getFullYear();

  if (recencyMatters && CONFIG.searchEnabled) {
    debugLog("Research phase: Recency-sensitive topic detected - prioritizing web search", {
      input: state.originalInput?.substring(0, 100),
    });
  }

  const scopes = understanding.distinctProceedings || [];
  const scopesWithFacts = new Set(
    state.facts
      .map((f: ExtractedFact) => f.relatedProceedingId)
      .filter(Boolean),
  );
  const inverseClaimCandidate = generateInverseClaimQuery(
    understanding.impliedClaim || state.originalInput || "",
  );
  const inverseClaimSearchRequired = !!inverseClaimCandidate;

  if (
    state.facts.length >= config.minFactsRequired &&
    categories.length >= CONFIG.minCategories &&
    state.contradictionSearchPerformed &&
    (!inverseClaimSearchRequired || state.inverseClaimSearchPerformed) &&
    (scopes.length === 0 ||
      scopes.every((p: Scope) =>
        scopesWithFacts.has(p.id),
      ))
  ) {
    // =========================================================================
    // CENTRAL CLAIM EVIDENCE COVERAGE (NEW)
    // For each CENTRAL core claim, try to obtain at least one evidence or counter-evidence fact.
    // This is best-effort and bounded: at most 1 targeted search per central claim.
    // =========================================================================
    const normalizeText = (text: string) =>
      text.toLowerCase().replace(/\s+/g, " ").trim();

    const hasAnyEvidenceForClaim = (claim: any): boolean => {
      const claimText = String(claim?.text || "");
      const claimEntities = (claim?.keyEntities || []).map((e: string) =>
        String(e || "").toLowerCase(),
      );
      const claimLower = claimText.toLowerCase();
      const claimWords = claimLower.split(/\s+/).filter((w: string) => w.length > 4);
      const claimProc = String(claim?.relatedProceedingId || "");

      return state.facts.some((f: ExtractedFact) => {
        // If we have proceeding context, prefer matching within that scope.
        if (claimProc && f.relatedProceedingId && f.relatedProceedingId !== claimProc) return false;
        const factLower = String(f.fact || "").toLowerCase();
        // Entity overlap
        const hasEntityOverlap = claimEntities.some((entity: string) =>
          entity.length > 3 && factLower.includes(entity),
        );
        // Word overlap (at least 2 meaningful words)
        const wordOverlap = claimWords.filter((w: string) => factLower.includes(w)).length;
        return hasEntityOverlap || wordOverlap >= 2;
      });
    };

    const centralCoreClaims = directClaimsForResearch.filter(
      (c: any) => c?.isCentral === true && c?.claimRole === "core",
    );

    for (const c of centralCoreClaims) {
      if (!c?.id) continue;
      if (state.centralClaimsSearched.has(c.id)) continue;
      if (hasAnyEvidenceForClaim(c)) continue;

      const basis = String(c.text || understanding.impliedClaim || state.originalInput || "").trim();
      if (!basis) continue;

      const entityHints = Array.isArray(c.keyEntities) ? c.keyEntities.slice(0, 4).join(" ") : "";
      const qBase = entityHints ? `${basis} ${entityHints}`.trim() : basis;

      debugLog("Central-claim evidence coverage: scheduling targeted search", {
        claimId: c.id,
        claimText: basis.slice(0, 140),
        relatedProceedingId: c.relatedProceedingId || "",
      });

      return {
        complete: false,
        category: "central_claim",
        targetClaimId: c.id,
        targetProceedingId: c.relatedProceedingId || undefined,
        focus: `Central claim evidence: ${basis.slice(0, 80)}`,
        queries: [
          `${qBase} evidence`,
          `${qBase} study`,
          `${qBase} criticism`,
        ],
        recencyMatters: isRecencySensitive(basis, understanding),
      };
    }

    // =========================================================================
    // CLAIM-LEVEL RECENCY CHECK (v2.6.22)
    // Before marking complete, check if any claims appear to be about recent events
    // but have zero supporting facts. This catches cases like DOGE (Jan-May 2025)
    // where the thesis-level recency check passed but individual claims need facts.
    // =========================================================================
    const claimsWithoutFacts = directClaimsForResearch.filter((claim: any) => {
      // Check if this claim appears to be about recent events
      const claimText = claim.text || "";
      const isRecentClaim = isRecencySensitive(claimText, undefined);

      // Check if this claim has any supporting facts
      // Facts are linked via relatedClaimId or by matching claim text/entities
      const claimEntities = (claim.keyEntities || []).map((e: string) => e.toLowerCase());
      const hasFacts = state.facts.some((f: ExtractedFact) => {
        // Direct match via claim text in fact
        const factLower = f.fact.toLowerCase();
        const claimLower = claimText.toLowerCase();

        // Check if any key entity from the claim appears in the fact
        const hasEntityOverlap = claimEntities.some((entity: string) =>
          entity.length > 3 && factLower.includes(entity)
        );

        // Check for significant word overlap (at least 2 meaningful words)
        const claimWords = claimLower.split(/\s+/).filter((w: string) => w.length > 4);
        const wordOverlap = claimWords.filter((w: string) => factLower.includes(w)).length;

        return hasEntityOverlap || wordOverlap >= 2;
      });

      return isRecentClaim && !hasFacts;
    });

    // If there are recent claims without facts, don't mark complete yet - search for them
    if (claimsWithoutFacts.length > 0 && !state.recentClaimsSearched) {
      const claimToSearch = claimsWithoutFacts[0]; // Search for first ungrounded recent claim
      const claimEntities = (claimToSearch.keyEntities || []).slice(0, 4).join(" ");
      const claimTerms = (claimToSearch.text || "")
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((w: string) => w.length > 3)
        .slice(0, 5)
        .join(" ");

      debugLog("Claim-level recency check: Found ungrounded recent claims", {
        count: claimsWithoutFacts.length,
        firstClaim: claimToSearch.text?.substring(0, 100),
        entities: claimEntities,
      });

      const queries = [
        `${claimEntities} ${currentYear}`.trim(),
        `${claimTerms} ${currentYear} latest`.trim(),
        `${claimEntities} recent news`.trim(),
      ].filter(q => q.length > 5);

      return {
        complete: false,
        focus: `Recent claim: ${claimToSearch.text?.substring(0, 50)}...`,
        category: "evidence",
        queries,
        recencyMatters: true,
      };
    }

    return { complete: true };
  }

  // Research each scope
  if (
    scopes.length > 0 &&
    state.iterations.length < scopes.length * 2
  ) {
    for (const scope of scopes) {
      const scopeFacts = state.facts.filter(
        (f) => f.relatedProceedingId === scope.id,
      );
      if (scopeFacts.length < 2) {
        const scopeKey = [scope.institution || scope.court, scope.shortName, scope.name]
          .filter(Boolean)
          .join(" ")
          .trim();
        // Build base queries
        const baseQueries = [
          `${entityStr} ${scopeKey}`.trim(),
          `${entityStr} ${scope.court || ""} official decision documents`.trim(),
          `${entityStr} ${scope.shortName || scope.name} evidence procedure`.trim(),
          `${entityStr} ${scopeKey} outcome`.trim(),
        ];
        // Add date-variant queries for recency-sensitive topics
        const queries = recencyMatters ? [
          ...baseQueries,
          `${entityStr} ${scopeKey} ${currentYear} latest`.trim(),
        ] : baseQueries;
        return {
          complete: false,
          focus: `${scope.name} - ${scopeKey || "scope"}`,
          targetProceedingId: scope.id,
          category: "evidence",
          queries,
          recencyMatters,
        };
      }
    }
  }

  if (
    !hasLegal &&
    understanding.legalFrameworks.length > 0 &&
    state.iterations.length === 0
  ) {
    const baseQueries = [
      `${entityStr} legal basis statute`,
      `${understanding.legalFrameworks[0]} law provisions`,
    ];
    // Add date-variant for recency-sensitive legal topics
    const queries = recencyMatters ? [
      ...baseQueries,
      `${entityStr} ${understanding.legalFrameworks[0]} ${currentYear} ruling decision`,
    ] : baseQueries;
    return {
      complete: false,
      focus: "Applicable framework",
      category: "legal_provision",
      queries,
      recencyMatters,
    };
  }

  if (!hasEvidence && state.iterations.length <= 1) {
    // For recency-sensitive topics, add date-specific queries
    const baseQueries = [
      `${entityStr} evidence documents`,
      `${entityStr} facts findings`,
    ];

    const queries = recencyMatters ? [
      ...baseQueries,
      `${entityStr} ${currentYear} ${currentYear - 1} latest news`,
      `${entityStr} recent announcement update`,
    ] : baseQueries;

    return {
      complete: false,
      focus: recencyMatters ? "Recent evidence and facts (prioritizing current data)" : "Evidence and facts",
      category: "evidence",
      queries,
      recencyMatters,
    };
  }

  if (!state.contradictionSearchPerformed) {
    const baseQueries = [
      `${entityStr} criticism concerns`,
      `${entityStr} controversy disputed unfair`,
    ];
    // Add date-variant for recent controversies/criticism
    const queries = recencyMatters ? [
      ...baseQueries,
      `${entityStr} criticism ${currentYear}`,
    ] : baseQueries;
    return {
      complete: false,
      focus: "Criticism and opposing views",
      category: "criticism",
      isContradictionSearch: true,
      queries,
      recencyMatters,
    };
  }

  // NEW v2.6.29: Search for INVERSE claim evidence (counter-evidence)
  // For claims like "X is better than Y", explicitly search for evidence that "Y is better than X"
  if (!state.inverseClaimSearchPerformed) {
    const inverseClaim = inverseClaimCandidate;

    if (inverseClaim) {
      const inverseQueries = [
        `${inverseClaim} evidence study`,
        `${inverseClaim} research data`,
        ...(recencyMatters ? [`${inverseClaim} ${currentYear}`] : []),
      ];
      return {
        complete: false,
        focus: "Counter-evidence search (inverse claim)",
        category: "counter_evidence",
        isContradictionSearch: true,  // Mark as contradiction for tracking
        queries: inverseQueries,
        recencyMatters,
      };
    }
  }

  // NEW v2.6.18: Search for decision-makers and potential conflicts of interest
  if (!state.decisionMakerSearchPerformed && scopes.length > 0) {
    // Extract decision-maker names from all scopes
    const decisionMakerNames = scopes
      .flatMap((s: Scope) => s.decisionMakers?.map(dm => dm.name) || [])
      .filter((name, index, arr) => arr.indexOf(name) === index); // unique names

    if (decisionMakerNames.length > 0) {
      const baseQueries = [
        `${decisionMakerNames[0]} conflict of interest ${entityStr}`,
        `${decisionMakerNames[0]} impartiality bias ${scopes[0]?.court || ""}`,
        ...(decisionMakerNames.length > 1 ? [`${decisionMakerNames.slice(0, 2).join(" ")} role multiple trials`] : []),
      ];
      // Add date-variant for recency-sensitive conflict searches
      const queries = recencyMatters ? [
        ...baseQueries,
        `${decisionMakerNames[0]} ${currentYear} conflict bias`,
      ] : baseQueries;
      return {
        complete: false,
        focus: "Decision-maker conflicts of interest",
        category: "conflict_of_interest",
        queries,
        recencyMatters,
      };
    }

    // Fallback when the model didn't populate decisionMakers: still search generically for conflicts/independence.
    // This keeps runs aligned regardless of phrasing, without hardcoding any domain/person names.
    const fallbackBaseQueries = [
      `${entityStr} conflict of interest decision maker`.trim(),
      `${entityStr} impartiality bias`.trim(),
      `${entityStr} recusal ethics`.trim(),
    ];
    const fallbackQueries = recencyMatters ? [
      ...fallbackBaseQueries,
      `${entityStr} conflict ${currentYear}`.trim(),
    ] : fallbackBaseQueries;
    return {
      complete: false,
      focus: "Decision-maker conflicts of interest",
      category: "conflict_of_interest",
      queries: fallbackQueries,
      recencyMatters,
    };
  }

  // NEW v2.6.18: Use generated research queries for additional searches
  // Determinism: skip this step because researchQueries come from the model and can cause run-to-run drift.
  if (CONFIG.deterministic) {
    // no-op
  } else {
  const researchQueries = understanding.researchQueries || [];
  const nextQueryIdx = Array.from({ length: researchQueries.length }, (_, i) => i)
    .find(i => !state.researchQueriesSearched.has(i));

  if (nextQueryIdx !== undefined && state.iterations.length < config.maxResearchIterations) {
    const researchQuery = researchQueries[nextQueryIdx];
    // Convert research query to search query by extracting key terms
    const queryTerms = researchQuery
      .toLowerCase()
      .replace(/[?.,!]/g, "")
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 6)
      .join(" ");

    if (queryTerms.trim()) {
      const baseQueries = [
        queryTerms,
        `${entityStr} ${queryTerms.split(" ").slice(0, 3).join(" ")}`,
      ];
      // Add date-variant for recency-sensitive research queries
      const queries = recencyMatters ? [
        ...baseQueries,
        `${queryTerms} ${currentYear}`,
      ] : baseQueries;
      return {
        complete: false,
        focus: `Research: ${researchQuery.slice(0, 50)}...`,
        category: "research_query",
        queries,
        recencyMatters,
      };
    }
    }
  }

  return { complete: true };
}

// Helper to decode HTML entities in text
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&#x27;": "'",
    "&#x2d;": "-",
    "&#x2D;": "-",
    "&nbsp;": " ",
    "&#160;": " ",
    "&ndash;": "–",
    "&mdash;": "—",
  };

  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, "gi"), char);
  }
  // Also handle numeric entities like &#45;
  result = result.replace(/&#(\d+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 10)),
  );
  // Handle hex entities like &#x2d;
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 16)),
  );

  return result;
}

/**
 * Extract a readable title from URL path/filename
 */
function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // Get filename from path
    const filename = pathname.split("/").pop() || "";

    if (filename) {
      // Remove extension and clean up
      let title = filename
        .replace(/\.(pdf|html|htm|php|aspx?)$/i, "")
        .replace(/[-_]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      // Capitalize first letter of each word
      if (title.length > 3) {
        title = title
          .split(" ")
          .map(
            (word) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
          )
          .join(" ");
        return title.slice(0, 100);
      }
    }

    // Fallback to hostname
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return "Unknown Source";
  }
}

/**
 * Extract title from document text with PDF header detection
 */
function extractTitle(text: string, url: string): string {
  const firstLine = text.split("\n")[0]?.trim().slice(0, 150) || "";

  // Check for PDF header patterns - these indicate raw PDF bytes
  const isPdfHeader =
    /^%PDF-\d+\.\d+/.test(firstLine) ||
    firstLine.includes("%���") ||
    firstLine.includes("\x00") ||
    /^[\x00-\x1f\x7f-\xff]{3,}/.test(firstLine);

  // Check for other binary/garbage patterns
  const isGarbage =
    firstLine.length < 3 ||
    !/[a-zA-Z]{3,}/.test(firstLine) || // Must have some letters
    (firstLine.match(/[^\x20-\x7E]/g)?.length || 0) > firstLine.length * 0.3; // >30% non-printable

  if (isPdfHeader || isGarbage) {
    // Try to find a better title in the first few lines
    const lines = text.split("\n").slice(0, 10);
    for (const line of lines) {
      const cleaned = line.trim();
      // Look for a line that looks like a title (has letters, reasonable length)
      if (
        cleaned.length >= 10 &&
        cleaned.length <= 150 &&
        /[a-zA-Z]{4,}/.test(cleaned) &&
        !/^%PDF/.test(cleaned) &&
        (cleaned.match(/[^\x20-\x7E]/g)?.length || 0) < cleaned.length * 0.1
      ) {
        return cleaned.slice(0, 100);
      }
    }

    // Fallback to URL-based title
    return extractTitleFromUrl(url);
  }

  return firstLine.slice(0, 100) || extractTitleFromUrl(url);
}

async function fetchSource(
  url: string,
  id: string,
  category: string,
  searchQuery?: string,
): Promise<FetchedSource | null> {
  const config = getActiveConfig();
  const trackRecord = getTrackRecordScore(url);

  try {
    const result = await Promise.race([
      extractTextFromUrl(url),
      new Promise<{ text: string; title: string; contentType: string }>(
        (_, reject) =>
          setTimeout(() => reject(new Error("timeout")), CONFIG.fetchTimeoutMs),
      ),
    ]);

    // Handle both old (string) and new (object) return types for compatibility
    const text = typeof result === "string" ? result : result.text;
    const extractedTitle = typeof result === "string" ? null : result.title;

    // Use extracted title if available, otherwise fall back to extraction
    let title = extractedTitle || extractTitle(text, url);
    title = decodeHtmlEntities(title);

    return {
      id,
      url,
      title,
      trackRecordScore: trackRecord,
      fullText: text.slice(0, config.articleMaxChars),
      fetchedAt: new Date().toISOString(),
      category,
      fetchSuccess: true,
      searchQuery,
    };
  } catch (err) {
    console.warn(`Fetch failed for ${url}:`, err);
    return {
      id,
      url,
      title: extractTitleFromUrl(url),
      trackRecordScore: trackRecord,
      fullText: "",
      fetchedAt: new Date().toISOString(),
      category,
      fetchSuccess: false,
      searchQuery,
    };
  }
}

// NOTE: OpenAI structured output requires ALL properties to be in "required" array.
// Using empty string "" instead of optional for string fields.
const FACT_SCHEMA = z.object({
  facts: z.array(
    z.object({
      fact: z.string(),
      category: z.enum([
        "legal_provision",
        "evidence",
        "expert_quote",
        "statistic",
        "event",
        "criticism",
      ]),
      specificity: z.enum(["high", "medium", "low"]),
      sourceExcerpt: z.string().min(20),
      relatedProceedingId: z.string(), // empty string if not applicable
      isContestedClaim: z.boolean(),
      claimSource: z.string(), // empty string if not applicable
      // NEW v2.6.29: Does this fact support or contradict the ORIGINAL user claim?
      claimDirection: z.enum(["supports", "contradicts", "neutral"]),
      // EvidenceScope: Captures the methodology/boundaries of the source document
      // (e.g., WTW vs TTW, EU vs US standards, different time periods)
      evidenceScope: z.object({
        name: z.string(),           // Short label (e.g., "WTW", "TTW", "EU-LCA")
        methodology: z.string(),    // Standard/method (empty string if not applicable)
        boundaries: z.string(),     // What's included/excluded (empty string if not applicable)
        geographic: z.string(),     // Geographic scope (empty string if not applicable)
        temporal: z.string(),       // Time period (empty string if not applicable)
      }).optional(),
    }),
  ),
});

async function extractFacts(
  source: FetchedSource,
  focus: string,
  model: any,
  scopes: Scope[],
  targetProceedingId?: string,
  originalClaim?: string,
  fromOppositeClaimSearch?: boolean,
): Promise<ExtractedFact[]> {
  console.log(`[Analyzer] extractFacts called for source ${source.id}: "${source.title?.substring(0, 50)}..."`);
  console.log(`[Analyzer] extractFacts: fetchSuccess=${source.fetchSuccess}, fullText length=${source.fullText?.length ?? 0}`);

  if (!source.fetchSuccess || !source.fullText) {
    console.warn(`[Analyzer] extractFacts: Skipping ${source.id} - no content (fetchSuccess=${source.fetchSuccess}, hasText=${!!source.fullText})`);
    return [];
  }

  const scopesList =
    scopes.length > 0
      ? `\n\nKNOWN CONTEXTS:\n${scopes.map((p: Scope) => `- ${p.id}: ${p.name}`).join("\n")}`
      : "";

  // Get current date for temporal reasoning
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDay = currentDate.getDate();
  const currentDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
  const currentDateReadable = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // v2.6.29: Include original claim for counter-evidence identification
  const originalClaimSection = originalClaim
    ? `\n\n## ORIGINAL USER CLAIM (for claimDirection evaluation)
The user's original claim is: "${originalClaim}"

For EVERY extracted fact, evaluate claimDirection:
- **"supports"**: This fact provides evidence that SUPPORTS the user's claim being TRUE
- **"contradicts"**: This fact provides evidence that CONTRADICTS the user's claim (supports the OPPOSITE being true)
- **"neutral"**: This fact is contextual/background information that doesn't directly support or contradict the claim

CRITICAL: Be precise about direction! If the user claims "X is better than Y" and the source says "Y is better than X", that is CONTRADICTING evidence, not supporting evidence.`
    : "";

  const systemPrompt = `Extract SPECIFIC facts. Focus: ${focus}
 ${targetProceedingId ? `Target context: ${targetProceedingId}` : ""}
Track contested claims with isContestedClaim and claimSource.
Only HIGH/MEDIUM specificity.
If the source contains facts relevant to MULTIPLE known contexts, include them (do not restrict to only the target),
and set relatedProceedingId accordingly. Do not omit key numeric outcomes (durations, amounts, counts) when present.

**CURRENT DATE**: Today is ${currentDateReadable} (${currentDateStr}). When extracting dates, compare them to this current date.${originalClaimSection}

## SCOPE/CONTEXT EXTRACTION

Evidence documentation typically defines its scope/context. Extract this when present:

**Look for explicit scope definitions**:
- Methodology: "This study uses a specific analysis method", "Based on ISO 14040 LCA"
- Boundaries: "From primary energy to vehicle motion", "Excluding manufacturing"
- Geographic: "EU market", "California regulations", "US jurisdiction"
- Temporal: "2020-2025 data", "FY2024", "as of March 2024"

**Set evidenceScope when the source defines its analytical frame**:
- name: Short label (e.g., "Broad boundary", "Narrow boundary", "EU-LCA", "Agency report")
- methodology: Standard referenced (empty string if none)
- boundaries: What's included/excluded (empty string if not specified)
- geographic: Geographic scope (empty string if not specified)
- temporal: Time period (empty string if not specified)

**IMPORTANT**: Different sources may use different scopes. A "40% efficiency" from a broad-boundary study is NOT directly comparable to a number from a narrow-boundary study. Capturing scope enables accurate comparisons.${scopesList}`;

  debugLog(`extractFacts: Calling LLM for ${source.id}`, {
    textLength: source.fullText.length,
    title: source.title?.substring(0, 50),
    focus: focus.substring(0, 100),
  });

  try {
    const startTime = Date.now();
    const llmTimeoutMsRaw = parseInt(process.env.FH_EXTRACT_FACTS_LLM_TIMEOUT_MS || "300000", 10);
    const llmTimeoutMs = Number.isFinite(llmTimeoutMsRaw)
      ? Math.max(60000, Math.min(3600000, llmTimeoutMsRaw))
      : 300000;

    const result: any = await Promise.race([
      generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Source: ${source.title}\nURL: ${source.url}\n\n${source.fullText}`,
        },
      ],
      temperature: getDeterministicTemperature(0.2),
      output: Output.object({ schema: FACT_SCHEMA }),
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`extractFacts LLM timeout after ${llmTimeoutMs}ms`)), llmTimeoutMs),
      ),
    ]);
    const elapsed = Date.now() - startTime;

    debugLog(`extractFacts: LLM returned for ${source.id} in ${elapsed}ms`);
    debugLog(`extractFacts: Result keys`, result ? Object.keys(result) : "null");

    if (elapsed < 2000) {
      debugLog(`extractFacts: WARNING - LLM responded suspiciously fast (${elapsed}ms) for ${source.fullText.length} chars`);
    }

    // Handle different AI SDK versions - safely extract structured output
    const rawOutput = extractStructuredOutput(result);
    if (!rawOutput) {
      debugLog(`extractFacts: No structured output for ${source.id}`, {
        resultType: typeof result,
        resultKeys: result ? Object.keys(result) : "null",
        resultPreview: result && typeof result === 'object' ? JSON.stringify(result).substring(0, 500) : "N/A",
      });
      return [];
    }

    const extraction = rawOutput as z.infer<typeof FACT_SCHEMA>;
    console.log(`[Analyzer] extractFacts: Raw extraction has ${extraction.facts?.length ?? 0} facts`);

    if (!extraction.facts || !Array.isArray(extraction.facts)) {
      console.warn(`[Analyzer] Invalid fact extraction from ${source.id} - facts is not an array`);
      return [];
    }

    let filteredFacts = extraction.facts
      .filter((f) => f.specificity !== "low" && f.sourceExcerpt?.length >= 20);

    // Conservative safeguard: avoid treating high-impact outcomes (sentencing/conviction/prison terms)
    // as "facts" when they come from low/unknown-reliability sources.
    // These claims are easy to get wrong and can dominate the analysis.
    const track = typeof source.trackRecordScore === "number" ? source.trackRecordScore : null;
    // Only apply this safeguard when we have an explicit reliability score.
    // If no source bundle is configured, trackRecordScore is null (unknown) and we should NOT discard facts.
    if (typeof track === "number" && track < 0.6) {
      const before = filteredFacts.length;
      filteredFacts = filteredFacts.filter((f) => {
        const hay = `${f.fact}\n${f.sourceExcerpt}`.toLowerCase();
        const isHighImpactOutcome =
          hay.includes("sentenced") ||
          hay.includes("convicted") ||
          hay.includes("years in prison") ||
          hay.includes("year prison") ||
          hay.includes("months in prison") ||
          (hay.includes("prison") && hay.includes("year"));
        return !isHighImpactOutcome;
      });
      if (before !== filteredFacts.length) {
        console.warn(
          `[Analyzer] extractFacts: filtered ${before - filteredFacts.length} high-impact outcome facts from low/unknown trackRecord source ${source.id} (track=${track})`,
        );
      }
    }

    console.log(`[Analyzer] extractFacts: After filtering (non-low specificity, excerpt >= 20 chars): ${filteredFacts.length} facts`);

    if (filteredFacts.length === 0 && extraction.facts.length > 0) {
      console.warn(`[Analyzer] extractFacts: All ${extraction.facts.length} facts were filtered out!`);
      extraction.facts.forEach((f, i) => {
        console.warn(`[Analyzer]   Fact ${i}: specificity="${f.specificity}", excerptLen=${f.sourceExcerpt?.length ?? 0}`);
      });
    }

    return filteredFacts.map((f, i) => ({
        id: `${source.id}-F${i + 1}`,
        fact: f.fact,
        category: f.category,
        specificity: f.specificity as "high" | "medium",
        sourceId: source.id,
        sourceUrl: source.url,
        sourceTitle: source.title,
        sourceExcerpt: f.sourceExcerpt,
        relatedProceedingId: f.relatedProceedingId || targetProceedingId,
        isContestedClaim: f.isContestedClaim,
        claimSource: f.claimSource,
        claimDirection: f.claimDirection,
        fromOppositeClaimSearch: fromOppositeClaimSearch || false,
      }));
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    debugLog(`extractFacts: ERROR for ${source.id}`, {
      error: errorMsg,
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join('\n') : undefined,
    });

    // Check for specific API errors
    if (errorMsg.includes("credit balance is too low") || errorMsg.includes("insufficient_quota")) {
      debugLog("❌ ANTHROPIC API CREDITS EXHAUSTED");
    }

    // Check for OpenAI schema validation errors
    if (errorMsg.includes("Invalid schema") || errorMsg.includes("required")) {
      debugLog("❌ OpenAI SCHEMA VALIDATION ERROR - check for .optional() fields in FACT_SCHEMA");
    }

    return [];
  }
}

// ============================================================================
// STEP 5: GENERATE VERDICTS - FIX: Calculate factorAnalysis from actual factors
// ============================================================================

// NOTE: OpenAI structured output requires ALL properties to be in "required" array.
const KEY_FACTOR_SCHEMA = z.object({
  factor: z.string(),
  supports: z.enum(["yes", "no", "neutral"]),
  explanation: z.string(),
  isContested: z.boolean(),
  contestedBy: z.string(), // empty string if not contested
  contestationReason: z.string(), // empty string if not contested
  factualBasis: z.enum(["established", "disputed", "alleged", "opinion", "unknown"]),
});

// NOTE: OpenAI structured output requires ALL properties to be in "required" array.
const VERDICTS_SCHEMA_MULTI_PROCEEDING = z.object({
  verdictSummary: z.object({
    answer: z.number().min(0).max(100),
    confidence: z.number().min(0).max(100),
    shortAnswer: z.string(),
    nuancedAnswer: z.string(),
    keyFactors: z.array(KEY_FACTOR_SCHEMA),
    calibrationNote: z.string(), // empty string if not applicable
  }),
  proceedingAnswers: z.array(
    z.object({
      proceedingId: z.string(),
      proceedingName: z.string(),
      answer: z.number().min(0).max(100),
      confidence: z.number().min(0).max(100),
      shortAnswer: z.string(),
      keyFactors: z.array(KEY_FACTOR_SCHEMA),
    }),
  ),
  proceedingSummary: z.string(),
  claimVerdicts: z.array(
    z.object({
      claimId: z.string(),
      verdict: z.number().min(0).max(100),
      confidence: z.number().min(0).max(100),
      riskTier: z.enum(["A", "B", "C"]),
      reasoning: z.string(),
      supportingFactIds: z.array(z.string()),
      relatedProceedingId: z.string(), // empty string if not applicable
    }),
  ),
});

const VERDICTS_SCHEMA_SIMPLE = z.object({
  verdictSummary: z.object({
    answer: z.number().min(0).max(100),
    confidence: z.number().min(0).max(100),
    shortAnswer: z.string(),
    nuancedAnswer: z.string(),
    keyFactors: z.array(KEY_FACTOR_SCHEMA),
  }),
  claimVerdicts: z.array(
    z.object({
      claimId: z.string(),
      verdict: z.number().min(0).max(100),
      confidence: z.number().min(0).max(100),
      riskTier: z.enum(["A", "B", "C"]),
      reasoning: z.string(),
      supportingFactIds: z.array(z.string()),
    }),
  ),
});

const VERDICTS_SCHEMA_CLAIM = z.object({
  claimVerdicts: z.array(
    z.object({
      claimId: z.string(),
      verdict: z.number().min(0).max(100),
      confidence: z.number().min(0).max(100),
      riskTier: z.enum(["A", "B", "C"]),
      reasoning: z.string(),
      supportingFactIds: z.array(z.string()),
      // Contestation fields
      isContested: z.boolean(),
      contestedBy: z.string(), // empty string if not contested
      factualBasis: z.enum(["established", "disputed", "alleged", "opinion", "unknown"]),
    }),
  ),
  articleAnalysis: z.object({
    thesisSupported: z.boolean(),
    logicalFallacies: z.array(
      z.object({
        type: z.string(),
        description: z.string(),
        affectedClaims: z.array(z.string()),
      }),
    ),
    articleVerdict: z.number().min(0).max(100),
    articleConfidence: z.number().min(0).max(100),
    verdictDiffersFromClaimAverage: z.boolean(),
    verdictDifferenceReason: z.string(), // empty string if not applicable
  }),
});

async function generateVerdicts(
  state: ResearchState,
  model: any,
): Promise<{
  claimVerdicts: ClaimVerdict[];
  articleAnalysis: ArticleAnalysis;
  verdictSummary?: VerdictSummary;
  pseudoscienceAnalysis?: PseudoscienceAnalysis;
}> {
  const understanding = state.understanding!;
  const inputIsClaim = isClaimInput(understanding);
  const hasMultipleProceedings =
    understanding.requiresSeparateAnalysis &&
    understanding.distinctProceedings.length > 1;

  // Detect pseudoscience based on the input content and extracted claims
  // v2.6.25: Only use normalized forms for consistent detection across input styles
  const allText = [
    understanding.articleThesis,
    understanding.impliedClaim,
    ...understanding.subClaims.map((c: any) => c.text),
  ]
    .filter(Boolean)
    .join(" ");

  const pseudoscienceAnalysis = detectPseudoscience(allText);

  const directClaimsForVerdicts = (understanding.subClaims || []).filter(
    (c: any) => !c?.thesisRelevance || c.thesisRelevance === "direct",
  );

  const factsFormatted = state.facts
    .map((f: ExtractedFact) => {
      let factLine = `[${f.id}]`;
      if (f.relatedProceedingId) factLine += ` (${f.relatedProceedingId})`;
      // v2.6.31: Add direction labels so LLM knows which facts support vs contradict the claim
      if (f.claimDirection === "contradicts" || f.fromOppositeClaimSearch) {
        factLine += ` [COUNTER-EVIDENCE]`;
      } else if (f.claimDirection === "supports") {
        factLine += ` [SUPPORTING]`;
      }
      if (f.isContestedClaim)
        factLine += ` [CONTESTED by ${f.claimSource || "critics"}]`;
      factLine += ` ${f.fact} (Source: ${f.sourceTitle})`;
      return factLine;
    })
    .join("\n");

  const claimsFormatted = directClaimsForVerdicts
    .map(
      (c: any) =>
        `${c.id}${c.relatedProceedingId ? ` (${c.relatedProceedingId})` : ""}: "${c.text}" [${c.isCentral ? "CENTRAL" : "Supporting"}]`,
    )
    .join("\n");

  if (inputIsClaim && hasMultipleProceedings) {
    const result = await generateMultiScopeVerdicts(
      state,
      understanding,
      factsFormatted,
      claimsFormatted,
      model,
      understanding.detectedInputType,
    );
    return { ...result, pseudoscienceAnalysis };
  } else if (inputIsClaim) {
    const result = await generateSingleScopeVerdicts(
      state,
      understanding,
      factsFormatted,
      claimsFormatted,
      model,
      understanding.detectedInputType,
    );
    return { ...result, pseudoscienceAnalysis };
  } else {
    const result = await generateClaimVerdicts(
      state,
      understanding,
      factsFormatted,
      claimsFormatted,
      model,
      pseudoscienceAnalysis,
    );
    return { ...result, pseudoscienceAnalysis };
  }
}

async function generateMultiScopeVerdicts(
  state: ResearchState,
  understanding: ClaimUnderstanding,
  factsFormatted: string,
  claimsFormatted: string,
  model: any,
  analysisInputType: InputType,
): Promise<{
  claimVerdicts: ClaimVerdict[];
  articleAnalysis: ArticleAnalysis;
  verdictSummary: VerdictSummary;
}> {
  const scopesFormatted = understanding.distinctProceedings
    .map(
      (s: Scope) =>
        `- **${s.id}**: ${s.name}\n  Institution: ${s.institution || s.court || "N/A"} | Date: ${s.temporal || s.date || "N/A"} | Status: ${s.status}\n  Subject: ${s.subject}`,
    )
    .join("\n\n");

  // Get current date for temporal reasoning
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDay = currentDate.getDate();
  const currentDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
  const currentDateReadable = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const analysisInput = resolveAnalysisPromptInput(understanding, state);
  const displayText =
    understanding.originalInputDisplay ||
    understanding.mainThesis ||
    analysisInput;
  const directClaimsForVerdicts = (understanding.subClaims || []).filter(
    (c: any) => !c?.thesisRelevance || c.thesisRelevance === "direct",
  );
  // v2.6.21: Use neutral label to ensure phrasing-neutral verdicts
  const inputLabel = "STATEMENT";
  const systemPrompt = `You are FactHarbor's verdict generator. Analyze MULTIPLE DISTINCT CONTEXTS/THREADS (also called SCOPES) separately.

## CRITICAL: TEMPORAL REASONING

**CURRENT DATE**: Today is ${currentDateReadable} (${currentDateStr}).

**DATE REASONING RULES**:
- When evaluating dates mentioned in claims, compare them to the CURRENT DATE above
- Do NOT assume dates are in the future without checking against the current date
- A date like "November 2025" is in the PAST if the current date is January 2026 or later
- Do NOT reject claims as "impossible" based on incorrect temporal assumptions
- If a date seems inconsistent, verify it against the current date before making judgments
- When in doubt about temporal relationships, use the evidence from sources rather than making assumptions

## SCOPE/CONTEXT-AWARE EVALUATION

Evidence may come from sources with DIFFERENT analytical scopes (e.g., broad-boundary vs narrow-boundary, Region A vs Region B methodology).

- **Check scope alignment**: Are facts being compared from compatible scopes?
- **Flag scope mismatches**: Different scopes are NOT directly comparable
- **Note in reasoning**: When scope affects interpretation, mention it (e.g., "Under broad-boundary analysis...")

## CRITICAL: RATING DIRECTION

**ORIGINAL ${inputLabel} TO RATE**:
"${analysisInput}"

**YOUR TASK**: Rate the ORIGINAL ${inputLabel} above AS STATED by the user.
- If the user claims "X is better than Y" and evidence shows Y is better, rate as FALSE/LOW percentage
- If the user claims "X increased" and evidence shows X decreased, rate as FALSE/LOW percentage
- Preserve the directional/comparative aspect of the original claim
- DO NOT rate your analysis conclusion - rate whether the USER'S CLAIM matches the evidence

## COUNTER-EVIDENCE HANDLING

Facts in the FACTS section are labeled with their relationship to the user's claim:
- **[SUPPORTING]**: Evidence that supports the user's claim being TRUE
- **[COUNTER-EVIDENCE]**: Evidence that CONTRADICTS the user's claim (supports the OPPOSITE being true)
- Unlabeled facts are neutral/contextual

**How to use these labels:**
- If most facts are [COUNTER-EVIDENCE], the verdict should be LOW (FALSE/MOSTLY-FALSE range: 0-28%)
- If most facts are [SUPPORTING], the verdict should be HIGH (TRUE/MOSTLY-TRUE range: 72-100%)
- Weight counter-evidence appropriately - strong counter-evidence should significantly lower the verdict

## SCOPES - PROVIDE SEPARATE ANSWER FOR EACH
${scopesFormatted}

## INSTRUCTIONS

1. For EACH scope (use proceedingId in the schema), provide:
   - proceedingId (must match: ${understanding.distinctProceedings.map((p: Scope) => p.id).join(", ")})
   - answer: Truth percentage (0-100) rating THE ORIGINAL USER CLAIM shown above
     * CRITICAL: Rate whether the USER'S CLAIM is true, NOT whether your analysis is correct
     * If user claims "X is MORE efficient" and evidence shows "X is LESS efficient", answer should be 0-28% (FALSE/MOSTLY FALSE)
     * Preserve the direction/comparative aspect of the original claim
   - shortAnswer: A complete sentence summarizing what the evidence shows (e.g., "Evidence indicates the methodology was scientifically valid.")
     * MUST be a descriptive sentence, NOT just a percentage or scale label
   - keyFactors: Array of factors that address the SUBSTANCE of the original claim:
     * CRITICAL: Key factors must evaluate whether THE USER'S CLAIM is true, NOT whether your analysis is correct
     * For comparative claims ("X is better than Y"), factors should evaluate the actual comparison
     * For factual claims, factors should cover the main evidence points that support or refute the claim
     * For procedural/legal claims, include: standards application, process integrity, evidence basis, decision-maker independence
     * DO NOT generate meta-methodology factors like "Was the analysis done correctly?" - focus on the CLAIM ITSELF

2. KEY FACTOR SCORING RULES - VERY IMPORTANT:
   - supports="yes": Factor supports the claim with evidence (from sources OR your background knowledge of widely-reported facts)
   - supports="no": Factor refutes the claim with counter-evidence (NOT just disputed/contested)
   - supports="neutral": Use ONLY when you genuinely have no information about this factor

   ${CONFIG.allowModelKnowledge ? `IMPORTANT: You MUST use your background knowledge! For well-known public events, established procedures/standards, and widely-reported facts, you ALREADY KNOW the relevant information - use it!
   DO NOT mark factors as "neutral" if you know the answer from your training data.
   Example: If you know a process followed standard procedures, mark it "yes" even if sources don't explicitly state it.` : "Use ONLY the provided facts and sources."}

   CRITICAL: Being "contested" or "disputed" by stakeholders = supports="yes" (if facts support it), NOT "neutral"
   Example: "Critics claim X was unfair" but X followed proper procedures = "yes", not "neutral"

3. Mark contested factors:
   - isContested: true if this factor is disputed
   - contestedBy: Be SPECIFIC about who disputes it (e.g., "supplier group A", "regulator X", "employee union")
     * Do NOT use vague terms like "some people" - specify WHICH group/organization
   - factualBasis: Does the opposition have ACTUAL DOCUMENTED COUNTER-EVIDENCE?
     * "established" = Opposition cites SPECIFIC DOCUMENTED FACTS that contradict (e.g., audits, logs, datasets, official reports)
     * "disputed" = Opposition has some factual counter-evidence but it's debatable
     * "opinion" = Opposition has NO factual counter-evidence - just claims, rhetoric, or actions
     * "unknown" = Cannot determine

   CRITICAL - factualBasis MUST be "opinion" for ALL of these:
   - Policy announcements or institutional actions without evidence
   - Statements by supporters, officials, or advocacy groups (claims are not evidence)
   - Calling something "unfair", "persecution", or "political" without citing specific documented violations
   - Public protests, position papers, or other responses without evidence

   factualBasis can ONLY be "established" or "disputed" when opposition provides:
   - Specific documents, records, logs, or audits showing actual procedural violations
   - Verifiable data or documents contradicting the findings
   - Documented evidence of specific errors, bias, or misconduct (not just allegations)

4. Calibration: Neutral contested factors don't reduce verdicts
   - Positive factors with evidence + neutral contested factors => keep the answer in the TRUE/MOSTLY-TRUE band (>=72%)
   - Only actual negative factors with documented evidence can reduce verdict

5. CLAIM VERDICT RULES (for claimVerdicts array):
   **CRITICAL**: You MUST generate verdicts for ALL claims listed in the CLAIMS section above. Those are the DIRECT thesis-relevant claims. Every listed claim must have a corresponding entry in claimVerdicts. Do NOT add verdicts for tangential/irrelevant claims that are not listed.

   - For each scope, ensure ALL claims with that proceedingId (or claims that logically belong to that scope) have verdicts
   - If a claim doesn't have a relatedProceedingId, assign it to the most relevant scope based on the claim content

   **CRITICAL - RATING DIRECTION FOR SUB-CLAIMS**:
   - The verdict MUST rate whether THE CLAIM AS STATED is true
   - If the claim says "X was proportionate" but evidence shows X was NOT proportionate → verdict should be LOW (15-28%)
   - If the claim says "X was justified" but evidence shows X was NOT justified → verdict should be LOW (15-28%)
   - DO NOT rate whether your analysis reasoning is correct - rate whether THE CLAIM TEXT matches the evidence
   - The reasoning field explains why the verdict is high or low - the verdict percentage MUST match the reasoning's conclusion
   - Example: If reasoning says "tariffs were NOT proportionate", the verdict for a claim stating "tariffs were proportionate" MUST be LOW

   - Provide a truth percentage (0-100) for each claim.
   - Use these bands to calibrate:
     * 86-100: TRUE (strong support, no credible counter-evidence)
     * 72-85: MOSTLY-TRUE (mostly supported, minor gaps)
     * 58-71: LEANING-TRUE (mixed evidence)
     * 43-57: UNVERIFIED (insufficient evidence)
     * 29-42: LEANING-FALSE (more counter-evidence than support)
     * 15-28: MOSTLY-FALSE (strong counter-evidence)
     * 0-14: FALSE (direct contradiction)

   CRITICAL: Stakeholder contestation ("critics say it was unfair") is NOT the same as counter-evidence.
   Use the TRUE/MOSTLY-TRUE band (>=72%), not the UNVERIFIED band (43-57%), if you know the facts support the claim despite stakeholder opposition.

${getKnowledgeInstruction(state.originalInput, understanding)}
${getProviderPromptHint()}`;

  const userPrompt = `## ${inputLabel}
"${analysisInput}"

## SCOPES
${scopesFormatted}

## CLAIMS
${claimsFormatted}

## FACTS
${factsFormatted}

Provide SEPARATE answers for each scope.`;

  let parsed: z.infer<typeof VERDICTS_SCHEMA_MULTI_PROCEEDING> | null = null;

  try {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: getDeterministicTemperature(0.3),
      output: Output.object({ schema: VERDICTS_SCHEMA_MULTI_PROCEEDING }),
    });
    state.llmCalls++;

    // Handle different AI SDK versions - safely extract structured output
    const rawOutput = extractStructuredOutput(result);
    if (rawOutput) {
      parsed = rawOutput as z.infer<typeof VERDICTS_SCHEMA_MULTI_PROCEEDING>;
      debugLog("generateMultiScopeVerdicts: SUCCESS", {
        hasVerdictSummary: !!parsed.verdictSummary,
        proceedingAnswersCount: parsed.proceedingAnswers?.length,
        claimVerdictsCount: parsed.claimVerdicts?.length,
      });
    } else {
      debugLog("generateMultiScopeVerdicts: No rawOutput returned");
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    debugLog("generateMultiScopeVerdicts: ERROR", {
      error: errMsg,
      stack: err instanceof Error ? err.stack?.split('\n').slice(0, 5).join('\n') : undefined,
    });

    // Check for OpenAI schema validation errors
    if (errMsg.includes("Invalid schema") || errMsg.includes("required")) {
      debugLog("❌ OpenAI SCHEMA VALIDATION ERROR in VERDICTS_SCHEMA_MULTI_SCOPE");
    }
    state.llmCalls++;
  }

  // Fallback if structured output failed
  if (!parsed || !parsed.proceedingAnswers) {
    debugLog("generateMultiScopeVerdicts: Using FALLBACK (parsed failed)", {
      hasParsed: !!parsed,
      hasProceedingAnswers: !!parsed?.proceedingAnswers,
    });

    const fallbackVerdicts: ClaimVerdict[] = directClaimsForVerdicts.map(
      (claim: any) => ({
        claimId: claim.id,
        claimText: claim.text,
        verdict: 50,
        confidence: 50,
        truthPercentage: 50,
        riskTier: "B" as const,
        reasoning:
          "Unable to generate verdict due to schema validation error. Manual review recommended.",
        supportingFactIds: [],
        isCentral: claim.isCentral || false,
        centrality: claim.centrality || "medium",
        thesisRelevance: claim.thesisRelevance || "direct",
        startOffset: claim.startOffset,
        endOffset: claim.endOffset,
        highlightColor: getHighlightColor7Point(50),
        isContested: false,
        contestedBy: "",
        factualBasis: "unknown" as const,
      }),
    );

    const verdictSummary: VerdictSummary = {
      displayText: displayText,
      answer: 50,
      confidence: 50,
      truthPercentage: 50,
      shortAnswer: "Unable to determine - analysis failed",
      nuancedAnswer:
        "The structured output generation failed. Manual review recommended.",
      keyFactors: [],
      hasMultipleProceedings: true,
      proceedingAnswers: understanding.distinctProceedings.map(
        (p: DistinctProceeding) => ({
          proceedingId: p.id,
          proceedingName: p.name,
          answer: 50,
          truthPercentage: 50,
          confidence: 50,
          shortAnswer: "Analysis failed",
          keyFactors: [],
        }),
      ),
    };

    const centralTotal = fallbackVerdicts.filter((v) => v.isCentral).length;
    const centralSupported = fallbackVerdicts.filter(
      (v) => v.isCentral && v.truthPercentage >= 72,
    ).length;
    const articleAnalysis: ArticleAnalysis = {
      inputType: analysisInputType,
      verdictSummary,
      hasMultipleProceedings: true,
      proceedings: understanding.distinctProceedings,
      articleThesis: understanding.articleThesis,
      logicalFallacies: [],
      claimsAverageTruthPercentage: 50,
      claimsAverageVerdict: 50,
      articleTruthPercentage: 50,
      articleVerdict: 50,
      claimPattern: {
        total: fallbackVerdicts.length,
        supported: 0,
        uncertain: fallbackVerdicts.length,
        refuted: 0,
        centralClaimsTotal: centralTotal,
        centralClaimsSupported: centralSupported,
      },
    };

    return { claimVerdicts: fallbackVerdicts, articleAnalysis, verdictSummary };
  }

  // Normal flow with parsed output

  // FIX v2.4.3: Calculate factorAnalysis from ACTUAL keyFactors array
  // v2.5.0: Calibrate to 7-point scale
  // v2.5.1: Contested factors without evidence don't reduce rating
  // v2.6.31: Inversion detection for proceeding answers must reference the substantive claim being evaluated
  // (the normalized analysis input), not the proceeding name/id.
  const proceedingVerdictClaimText = resolveAnalysisPromptInput(understanding, state);
  const correctedProceedingAnswers = parsed.proceedingAnswers.map((pa: any) => {
    const factors = pa.keyFactors as KeyFactor[];
    const procMeta = understanding.distinctProceedings.find(
      (p: any) => p.id === pa.proceedingId,
    );
    const procStatus = (procMeta?.status || "unknown") as string;

    // Calculate from actual factors - NOT from LLM-reported numbers
    const positiveFactors = factors.filter((f) => f.supports === "yes").length;
    const negativeFactors = factors.filter((f) => f.supports === "no").length;
    const neutralFactors = factors.filter(
      (f) => f.supports === "neutral",
    ).length;

    // v2.5.1: Count negative factors that are contested without evidence
    // Only count "no" factors with established factualBasis as true negatives
    const evidencedNegatives = factors.filter(
      (f) => f.supports === "no" && f.factualBasis === "established",
    ).length;
    const contestedNegatives = factors.filter(
      (f) => f.supports === "no" && f.isContested,
    ).length;
    // Contested neutrals (opinions without evidence) should not count negatively
    const contestedNeutrals = factors.filter(
      (f) => f.supports === "neutral" && f.isContested,
    ).length;

    // Debug: Log factor details for this scope
    debugLog(`Factor analysis for scope ${pa.proceedingId}`, {
      answerTruthPct: pa.answer,
      factorCounts: {
        positive: positiveFactors,
        negative: negativeFactors,
        neutral: neutralFactors,
        evidencedNegatives,
        contestedNegatives,
        contestedNeutrals,
      },
      factors: factors.map((f) => ({
        factor: f.factor?.substring(0, 50),
        supports: f.supports,
        isContested: f.isContested,
        factualBasis: f.factualBasis,
      })),
    });

    const factorAnalysis: FactorAnalysis = {
      positiveFactors,
      negativeFactors,
      neutralFactors,
      contestedNegatives,
      verdictExplanation: `${positiveFactors} positive, ${negativeFactors} negative (${evidencedNegatives} evidenced, ${contestedNegatives} contested), ${neutralFactors} neutral (${contestedNeutrals} disputed)`,
    };

    // Apply calibration correction based on factors
    let answerTruthPct = normalizePercentage(pa.answer);
    let correctedConfidence = normalizePercentage(pa.confidence);

    // v2.6.31: Apply inversion detection to proceeding-level answers
    // Check shortAnswer for negation patterns - the LLM often correctly identifies
    // something is NOT fair/proportionate but still rates it high
    const proceedingInversion = detectAndCorrectVerdictInversion(
      proceedingVerdictClaimText,
      pa.shortAnswer || "",
      answerTruthPct
    );
    if (proceedingInversion.wasInverted) {
      answerTruthPct = proceedingInversion.correctedPct;
      debugLog("Proceeding answer inversion detected", {
        proceedingId: pa.proceedingId,
        originalPct: normalizePercentage(pa.answer),
        correctedPct: answerTruthPct,
        shortAnswer: (pa.shortAnswer || "").slice(0, 100),
      });
    }

    // v2.5.1: Only evidenced negatives count at full weight
    // Contested negatives without established basis count at 25%
    // Neutral contested don't count negatively at all
    const effectiveNegatives = evidencedNegatives + (negativeFactors - evidencedNegatives) * 0.25;

    // v2.6.20: Removed factor-based boost to ensure input neutrality
    // The boost was causing inconsistent verdicts for identical inputs
    // Verdicts are now purely claim-based for transparency and consistency
    debugLog(`Scope ${pa.proceedingId}: No factor-based boost applied`, {
      answerTruthPct,
          positiveFactors,
          evidencedNegatives,
      contestedNegatives,
        });

    if (answerTruthPct < 43 && positiveFactors > effectiveNegatives) {
      correctedConfidence = Math.min(correctedConfidence, 72);
      answerTruthPct = truthFromBand("partial", correctedConfidence);
      factorAnalysis.verdictExplanation = `Corrected from <43: ${positiveFactors} positive > ${effectiveNegatives.toFixed(1)} effective negative`;
    } else if (
      answerTruthPct < 43 &&
      contestedNegatives > 0 &&
      contestedNegatives === negativeFactors
    ) {
      correctedConfidence = Math.min(correctedConfidence, 68);
      answerTruthPct = truthFromBand("partial", correctedConfidence);
      factorAnalysis.verdictExplanation = `Corrected: All ${negativeFactors} negative factors are contested`;
    }

    return {
      ...pa,
      answer: answerTruthPct,
      confidence: correctedConfidence,
      truthPercentage: answerTruthPct,
      shortAnswer: sanitizeScopeShortAnswer(String(pa.shortAnswer || ""), procStatus),
      factorAnalysis,
    } as ProceedingAnswer;
  });


  // Recalculate overall using truth percentages
  const avgTruthPct = Math.round(
    correctedProceedingAnswers.reduce(
      (sum, pa) => sum + pa.truthPercentage,
      0,
    ) / correctedProceedingAnswers.length,
  );


  const avgConfidence = Math.round(
    correctedProceedingAnswers.reduce((sum, pa) => sum + pa.confidence, 0) /
      correctedProceedingAnswers.length,
  );

  // Calculate overall factorAnalysis
  const allFactors = correctedProceedingAnswers.flatMap((pa) => pa.keyFactors);
  // Only flag contested negatives with evidence-based contestation
  const hasContestedFactors = allFactors.some(
    (f) =>
      f.supports === "no" &&
      f.isContested &&
      (f.factualBasis === "established" || f.factualBasis === "disputed")
  );

  // Build claim verdicts with 7-point calibration
  // v2.5.1: Apply correction based on proceeding-level factor analysis

  // v2.6.19: Ensure ALL claims have verdicts - add missing ones
  const claimIdsWithVerdicts = new Set(parsed.claimVerdicts.map((cv: any) => cv.claimId));
  const missingClaims = directClaimsForVerdicts.filter(
    (claim: any) => !claimIdsWithVerdicts.has(claim.id)
  );

  if (missingClaims.length > 0) {
    debugLog(`generateMultiScopeVerdicts: Missing verdicts for ${missingClaims.length} claims`, {
      missingClaimIds: missingClaims.map((c: any) => c.id),
      totalClaims: directClaimsForVerdicts.length,
      verdictsGenerated: parsed.claimVerdicts.length,
    });

    // Add fallback verdicts for missing claims
    for (const claim of missingClaims) {
      const proceedingId = claim.relatedProceedingId || "";
      const relatedProceeding = correctedProceedingAnswers.find(
        (pa) => pa.proceedingId === proceedingId
      );

      // Use proceeding-level answer as fallback
      const fallbackConfidence = relatedProceeding?.confidence || 50;
      const fallbackVerdict = relatedProceeding
        ? (relatedProceeding.answer >= 72
          ? truthFromBand("strong", fallbackConfidence)
          : truthFromBand("uncertain", fallbackConfidence))
        : 50;

      // v2.6.31: Include all fields required by ClaimVerdict interface for weighted calculation
      // Cast to any since parsed.claimVerdicts has a narrower schema type; full ClaimVerdict fields are added here
      // and will be properly typed after the mapping step at line ~6180.
      (parsed.claimVerdicts as any[]).push({
        claimId: claim.id,
        claimText: claim.text || "",
        verdict: fallbackVerdict,
        confidence: fallbackConfidence,
        truthPercentage: fallbackVerdict,
        riskTier: "B",
        reasoning: `Fallback verdict based on proceeding-level analysis (${relatedProceeding?.proceedingId || "unknown"}). Original verdict generation did not include this claim.`,
        supportingFactIds: [],
        relatedProceedingId: proceedingId,
        isCentral: claim.isCentral || false,
        centrality: claim.centrality || "medium",
        thesisRelevance: claim.thesisRelevance || "direct",
        highlightColor: getHighlightColor7Point(fallbackVerdict),
      });

      debugLog(`Added fallback verdict for claim ${claim.id}`, {
        proceedingId,
        verdict: fallbackVerdict,
        reason: "Missing from LLM output",
      });
    }
  }

  const claimVerdicts: ClaimVerdict[] = parsed.claimVerdicts.map((cv: any) => {
    const claim = understanding.subClaims.find((c: any) => c.id === cv.claimId);
    const proceedingId = cv.relatedProceedingId || claim?.relatedProceedingId || "";

    // Find the corrected proceeding answer for this claim
    const relatedProceeding = correctedProceedingAnswers.find(
      (pa) => pa.proceedingId === proceedingId
    );

    // Sanitize temporal errors from reasoning
    const sanitizedReasoning = sanitizeTemporalErrors(cv.reasoning || "", new Date());

    // Calculate base truth percentage from LLM verdict
    let truthPct = calculateTruthPercentage(cv.verdict, cv.confidence);

    // v2.6.31: Detect and correct inverted verdicts
    // LLM sometimes rates "is my analysis correct" instead of "is the claim true"
    const inversionCheck = detectAndCorrectVerdictInversion(
      claim?.text || cv.claimId || "",
      sanitizedReasoning,
      truthPct
    );
    if (inversionCheck.wasInverted) {
      truthPct = inversionCheck.correctedPct;
    }

    // v2.6.31: Detect if this is a counter-claim (evaluates opposite of user's thesis)
    const claimFacts = state.facts.filter(f =>
      cv.supportingFactIds?.includes(f.id) || f.relatedProceedingId === proceedingId
    );
    const isCounterClaim = detectCounterClaim(
      claim?.text || cv.claimId || "",
      understanding.impliedClaim || understanding.articleThesis || "",
      claimFacts
    );

    // v2.5.2: If the proceeding has positive factors and no evidenced negatives,
    // boost claims below 72% into the >=72 band
    // v2.6.31: SKIP boost if verdict was inverted (reasoning contradicts claim)
    // v2.6.31: SKIP boost for counter-claims (they evaluate the opposite position)
    if (!inversionCheck.wasInverted && !isCounterClaim && relatedProceeding && relatedProceeding.factorAnalysis) {
      const fa = relatedProceeding.factorAnalysis;
      // Check if proceeding has positive factors and no evidenced negatives
      const proceedingIsPositive = relatedProceeding?.answer >= 72;

      // If proceeding is positive and claim is below threshold, boost it
      // This applies to claims below 72% or with mixed/uncertain evidence
      if (proceedingIsPositive && truthPct < 72) {
        const originalTruth = truthPct;
        truthPct = 72; // Minimum for MOSTLY-TRUE
        debugLog("claimVerdict: Corrected based on scope factors", {
          claimId: cv.claimId,
          scopeId: proceedingId,
          from: originalTruth,
          to: truthPct,
          truthPctBefore: originalTruth,
          truthPctAfter: truthPct,
          reason: "Scope is positive with no evidenced negatives",
        });
      }
    }

    // Derive 7-point verdict from percentage
    return {
      ...cv,
      verdict: truthPct,
      truthPercentage: truthPct,
      reasoning: sanitizedReasoning,
      claimText: claim?.text || "",
      isCentral: claim?.isCentral || false,
      centrality: claim?.centrality || "medium",
      thesisRelevance: claim?.thesisRelevance || "direct",
      keyFactorId: claim?.keyFactorId || "", // Preserve KeyFactor mapping for aggregation
      relatedProceedingId: proceedingId,
      highlightColor: getHighlightColor7Point(truthPct),
      isCounterClaim,
    };
  });

  const weightedClaimVerdicts = applyEvidenceWeighting(
    claimVerdicts,
    state.facts,
    state.sources,
  );

  const claimPattern = {
    total: weightedClaimVerdicts.length,
    supported: weightedClaimVerdicts.filter((v) => v.truthPercentage >= 72)
      .length,
    uncertain: weightedClaimVerdicts.filter(
      (v) => v.truthPercentage >= 43 && v.truthPercentage < 72,
    ).length,
    refuted: weightedClaimVerdicts.filter((v) => v.truthPercentage < 43).length,
    centralClaimsTotal: weightedClaimVerdicts.filter((v) => v.isCentral).length,
    centralClaimsSupported: weightedClaimVerdicts.filter(
      (v) => v.isCentral && v.truthPercentage >= 72,
    ).length,
  };

  const calibrationNote = hasContestedFactors
    ? "Some negative factors are politically contested claims and given reduced weight."
    : undefined;

  const verdictSummary: VerdictSummary = {
    displayText: displayText,
    answer: avgTruthPct,
    confidence: avgConfidence,
    truthPercentage: avgTruthPct,
    shortAnswer: parsed.verdictSummary.shortAnswer,
    nuancedAnswer: parsed.verdictSummary.nuancedAnswer,
    keyFactors: parsed.verdictSummary.keyFactors,
    hasMultipleProceedings: true,
    proceedingAnswers: correctedProceedingAnswers,
    proceedingSummary: parsed.proceedingSummary,
    calibrationNote,
    hasContestedFactors,
  };

  // Calculate claims average truth percentage (v2.6.30: weighted by centrality × confidence)
  const claimsAvgTruthPct = calculateWeightedVerdictAverage(weightedClaimVerdicts);

  const articleAnalysis: ArticleAnalysis = {
    inputType: analysisInputType,
    verdictSummary,
    hasMultipleProceedings: true,
    proceedings: understanding.distinctProceedings,
    articleThesis: understanding.impliedClaim || understanding.articleThesis,
    logicalFallacies: [],

    // Claims summary
    claimsAverageTruthPercentage: claimsAvgTruthPct,
    claimsAverageVerdict: claimsAvgTruthPct,

  // Article verdict
    articleTruthPercentage: avgTruthPct,
    articleVerdict: avgTruthPct,
    articleVerdictReason: undefined,

    claimPattern,
  };

  return {
    claimVerdicts: weightedClaimVerdicts,
    articleAnalysis,
    verdictSummary,
  };
}

async function generateSingleScopeVerdicts(
  state: ResearchState,
  understanding: ClaimUnderstanding,
  factsFormatted: string,
  claimsFormatted: string,
  model: any,
  analysisInputType: InputType,
): Promise<{
  claimVerdicts: ClaimVerdict[];
  articleAnalysis: ArticleAnalysis;
  verdictSummary: VerdictSummary;
}> {
  // Get current date for temporal reasoning
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDay = currentDate.getDate();
  const currentDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
  const currentDateReadable = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const analysisInput = resolveAnalysisPromptInput(understanding, state);
  const displayText =
    understanding.originalInputDisplay ||
    understanding.mainThesis ||
    analysisInput;
  const directClaimsForVerdicts = (understanding.subClaims || []).filter(
    (c: any) => !c?.thesisRelevance || c.thesisRelevance === "direct",
  );
  // v2.6.21: Use neutral label to ensure phrasing-neutral verdicts
  const inputLabel = "STATEMENT";

  const systemPrompt = `Answer the input based on documented evidence.

## CRITICAL: TEMPORAL REASONING

**CURRENT DATE**: Today is ${currentDateReadable} (${currentDateStr}).

**DATE REASONING RULES**:
- When evaluating dates mentioned in claims, compare them to the CURRENT DATE above
- Do NOT assume dates are in the future without checking against the current date
- Do NOT reject claims as "impossible" based on incorrect temporal assumptions
- If a date seems inconsistent, verify it against the current date before making judgments

## CRITICAL: RATING DIRECTION

**YOUR TASK**: Rate the ORIGINAL ${inputLabel} AS STATED by the user (shown below in the user prompt).
- If the user claims "X is better than Y" and evidence shows Y is better, rate as FALSE/LOW percentage
- If the user claims "X increased" and evidence shows X decreased, rate as FALSE/LOW percentage
- Preserve the directional/comparative aspect of the original claim
- DO NOT rate your analysis conclusion - rate whether the USER'S CLAIM matches the evidence

## COUNTER-EVIDENCE HANDLING

Facts in the FACTS section are labeled with their relationship to the user's claim:
- **[SUPPORTING]**: Evidence that supports the user's claim being TRUE
- **[COUNTER-EVIDENCE]**: Evidence that CONTRADICTS the user's claim (supports the OPPOSITE being true)
- Unlabeled facts are neutral/contextual

**How to use these labels:**
- If most facts are [COUNTER-EVIDENCE], the verdict should be LOW (FALSE/MOSTLY-FALSE range: 0-28%)
- If most facts are [SUPPORTING], the verdict should be HIGH (TRUE/MOSTLY-TRUE range: 72-100%)
- Weight counter-evidence appropriately - strong counter-evidence should significantly lower the verdict

## SCOPE/CONTEXT-AWARE EVALUATION

Evidence may come from sources with DIFFERENT analytical scopes (e.g., broad-boundary vs narrow-boundary, Region A vs Region B methodology).

- **Check scope alignment**: Are facts being compared from compatible scopes?
- **Flag scope mismatches**: Different scopes are NOT directly comparable
- **Note in reasoning**: When scope affects interpretation, mention it

## SHORT ANSWER GUIDANCE:
- shortAnswer MUST be a complete descriptive sentence summarizing the finding
- Example: "The evidence shows proper procedures were followed."
- NEVER use just a percentage value or scale label as the shortAnswer

## KEY FACTORS - CRITICAL GUIDANCE:
Key factors must address the SUBSTANCE of the original claim:
- CRITICAL: Key factors must evaluate whether THE USER'S CLAIM is true, NOT whether your analysis is correct
- For comparative claims ("X is better than Y"), factors should evaluate the actual comparison
- For factual claims, factors should cover the main evidence points that support or refute the claim
- For procedural/legal claims, include: standards application, process integrity, evidence basis
- DO NOT generate meta-methodology factors like "Was the analysis done correctly?" - focus on the CLAIM ITSELF

## KEY FACTOR SCORING RULES - VERY IMPORTANT:
- supports="yes": Factor supports the claim with evidence (from sources OR your background knowledge)
- supports="no": Factor refutes the claim with counter-evidence (NOT just disputed/contested)
- supports="neutral": Use ONLY when you genuinely have no information about this factor

${CONFIG.allowModelKnowledge ? `IMPORTANT: You MUST use your background knowledge! For well-known public events and widely-reported facts, use what you know!
DO NOT mark factors as "neutral" if you know the answer from your training data.` : "Use ONLY the provided facts and sources."}

CRITICAL: Being "contested" by stakeholders does NOT make something neutral.
Example: "Critics claim X was unfair" but X followed proper procedures = "yes", not "neutral"

## Mark contested factors:
- isContested: true if this claim is politically disputed
- contestedBy: Who disputes it (empty string if not contested)
- factualBasis: Does opposition have ACTUAL DOCUMENTED COUNTER-EVIDENCE?
  * "established" = Opposition cites SPECIFIC DOCUMENTED FACTS (audits, logs, datasets)
  * "disputed" = Opposition has some factual counter-evidence but debatable
  * "opinion" = NO factual counter-evidence (just claims, political statements, executive orders)
  * "unknown" = Cannot determine

CRITICAL - factualBasis MUST be "opinion" for:
- Policy announcements or institutional actions without evidence
- Statements by supporters, officials, or advocacy groups (claims are not evidence)
- Calling something "unfair" or "persecution" without documented violations

## CLAIM VERDICT RULES:

**CRITICAL - RATING DIRECTION FOR SUB-CLAIMS**:
- The verdict MUST rate whether THE CLAIM AS STATED is true
- If the claim says "X was proportionate" but evidence shows X was NOT proportionate → verdict should be LOW (15-28%)
- If the claim says "X was justified" but evidence shows X was NOT justified → verdict should be LOW (15-28%)
- DO NOT rate whether your analysis reasoning is correct - rate whether THE CLAIM TEXT matches the evidence
- The reasoning field explains why the verdict is high or low - the verdict percentage MUST match the reasoning's conclusion
- Example: If reasoning says "tariffs were NOT proportionate", the verdict for a claim stating "tariffs were proportionate" MUST be LOW

- Provide a truth percentage (0-100) for each claim.
- Use these bands to calibrate:
  * 86-100: TRUE (strong support, no credible counter-evidence)
  * 72-85: MOSTLY-TRUE (mostly supported, minor gaps)
  * 58-71: LEANING-TRUE (mixed evidence)
  * 43-57: UNVERIFIED (insufficient evidence)
  * 29-42: LEANING-FALSE (more counter-evidence than support)
  * 15-28: MOSTLY-FALSE (strong counter-evidence)
  * 0-14: FALSE (direct contradiction)

CRITICAL: Stakeholder contestation is NOT counter-evidence.
Use the TRUE/MOSTLY-TRUE band (>=72%) if you know the facts support the claim despite stakeholder opposition.

${getKnowledgeInstruction(state.originalInput, understanding)}
${getProviderPromptHint()}`;

  const userPrompt = `## ${inputLabel}
"${analysisInput}"

## CLAIMS
${claimsFormatted}

## FACTS
${factsFormatted}`;

  let parsed: z.infer<typeof VERDICTS_SCHEMA_SIMPLE> | null = null;

  try {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: getDeterministicTemperature(0.3),
      output: Output.object({ schema: VERDICTS_SCHEMA_SIMPLE }),
    });
    state.llmCalls++;

    // Handle different AI SDK versions - safely extract structured output
    const rawOutput = extractStructuredOutput(result);
    if (rawOutput) {
      parsed = rawOutput as z.infer<typeof VERDICTS_SCHEMA_SIMPLE>;
    }
  } catch (err) {
    console.warn(
      "[Analyzer] Structured output failed for verdicts, using fallback:",
      err,
    );
    state.llmCalls++;
  }

  // Fallback if structured output failed or verdictSummary is missing
  if (!parsed || !parsed.claimVerdicts || !parsed.verdictSummary) {
    console.log("[Analyzer] Using fallback verdict generation (parsed:", !!parsed, ", claimVerdicts:", !!parsed?.claimVerdicts, ", verdictSummary:", !!parsed?.verdictSummary, ")");

    const fallbackVerdicts: ClaimVerdict[] = directClaimsForVerdicts.map(
      (claim: any) => ({
        claimId: claim.id,
        claimText: claim.text,
        verdict: 50,
        confidence: 50,
        truthPercentage: 50,
        riskTier: "B" as const,
        reasoning: "Unable to generate verdict due to schema validation error.",
        supportingFactIds: [],
        isCentral: claim.isCentral || false,
        centrality: claim.centrality || "medium",
        thesisRelevance: claim.thesisRelevance || "direct",
        highlightColor: getHighlightColor7Point(50),
        isContested: false,
        contestedBy: "",
        factualBasis: "unknown" as const,
      }),
    );

    const verdictSummary: VerdictSummary = {
      displayText: displayText,
      answer: 50,
      confidence: 50,
      truthPercentage: 50,
      shortAnswer: "Unable to determine - analysis failed",
      nuancedAnswer:
        "The structured output generation failed. Manual review recommended.",
      keyFactors: [],
      hasMultipleProceedings: false,
    };

    const centralTotal = fallbackVerdicts.filter((v) => v.isCentral).length;
    const centralSupported = fallbackVerdicts.filter(
      (v) => v.isCentral && v.truthPercentage >= 72,
    ).length;
    const articleAnalysis: ArticleAnalysis = {
      inputType: analysisInputType,
      verdictSummary,
      hasMultipleProceedings: false,
      articleThesis: understanding.articleThesis,
      logicalFallacies: [],
      claimsAverageTruthPercentage: 50,
      claimsAverageVerdict: 50,
      articleTruthPercentage: 50,
      articleVerdict: 50,
      claimPattern: {
        total: fallbackVerdicts.length,
        supported: 0,
        uncertain: fallbackVerdicts.length,
        refuted: 0,
        centralClaimsTotal: centralTotal,
        centralClaimsSupported: centralSupported,
      },
    };

    return { claimVerdicts: fallbackVerdicts, articleAnalysis, verdictSummary };
  }

  // Normal flow with parsed output

  // Map LLM verdicts by claim ID for quick lookup
  const llmVerdictMap = new Map(
    (parsed.claimVerdicts || []).map((cv: any) => [cv.claimId, cv]),
  );

  // Ensure ALL claims get a verdict
  const claimVerdicts: ClaimVerdict[] = directClaimsForVerdicts.map(
    (claim: any) => {
      const cv = llmVerdictMap.get(claim.id);

      if (!cv) {
        console.warn(
          `[Analyzer] Missing verdict for claim ${claim.id}, using default`,
        );
        return {
          claimId: claim.id,
          claimText: claim.text,
          verdict: 50,
          confidence: 50,
          truthPercentage: 50,
          riskTier: "B" as const,
          reasoning: "No verdict returned by LLM for this claim.",
          supportingFactIds: [],
          isCentral: claim.isCentral || false,
          centrality: claim.centrality || "medium",
          thesisRelevance: claim.thesisRelevance || "direct",
          startOffset: claim.startOffset,
          endOffset: claim.endOffset,
          highlightColor: getHighlightColor7Point(50),
        } as ClaimVerdict;
      }

      // Sanitize temporal errors from reasoning
      const sanitizedReasoning = sanitizeTemporalErrors(cv.reasoning || "", new Date());

      let truthPct = calculateTruthPercentage(cv.verdict, cv.confidence);

      // v2.6.31: Detect and correct inverted verdicts
      const inversionCheck = detectAndCorrectVerdictInversion(
        claim.text || cv.claimId || "",
        sanitizedReasoning,
        truthPct
      );
      if (inversionCheck.wasInverted) {
        truthPct = inversionCheck.correctedPct;
      }

      // v2.6.31: Detect if this is a counter-claim
      const claimFacts = state.facts.filter(f =>
        cv.supportingFactIds?.includes(f.id)
      );
      const isCounterClaim = detectCounterClaim(
        claim.text || cv.claimId || "",
        understanding.impliedClaim || understanding.articleThesis || "",
        claimFacts
      );

        return {
        ...cv,
        claimId: claim.id,
          verdict: truthPct,
        truthPercentage: truthPct,
        reasoning: sanitizedReasoning,
        claimText: claim.text || "",
        isCentral: claim.isCentral || false,
        centrality: claim.centrality || "medium",
        thesisRelevance: claim.thesisRelevance || "direct",
        startOffset: claim.startOffset,
        endOffset: claim.endOffset,
        highlightColor: getHighlightColor7Point(truthPct),
        isCounterClaim,
      } as ClaimVerdict;
    },
  );

  const weightedClaimVerdicts = applyEvidenceWeighting(
    claimVerdicts,
    state.facts,
    state.sources,
  );

  const claimPattern = {
    total: weightedClaimVerdicts.length,
    supported: weightedClaimVerdicts.filter((v) => v.truthPercentage >= 72)
      .length,
    uncertain: weightedClaimVerdicts.filter(
      (v) => v.truthPercentage >= 43 && v.truthPercentage < 72,
    ).length,
    refuted: weightedClaimVerdicts.filter((v) => v.truthPercentage < 43).length,
    centralClaimsTotal: weightedClaimVerdicts.filter((v) => v.isCentral).length,
    centralClaimsSupported: weightedClaimVerdicts.filter(
      (v) => v.isCentral && v.truthPercentage >= 72,
    ).length,
  };

  const keyFactors = parsed.verdictSummary.keyFactors || [];
  // Only flag contested negatives with evidence-based contestation
  const hasContestedFactors = keyFactors.some(
    (kf: any) =>
      kf.supports === "no" &&
      kf.isContested &&
      (kf.factualBasis === "established" || kf.factualBasis === "disputed"),
  );

  // v2.5.1: Apply factor-based correction for single-proceeding cases
  const positiveFactors = keyFactors.filter((f: KeyFactor) => f.supports === "yes").length;
  const evidencedNegatives = keyFactors.filter(
    (f: KeyFactor) => f.supports === "no" && f.factualBasis === "established",
  ).length;
  const contestedNegatives = keyFactors.filter(
    (f: KeyFactor) => f.supports === "no" && f.isContested,
  ).length;

  let answerTruthPct = normalizePercentage(parsed.verdictSummary.answer);
  let correctedConfidence = normalizePercentage(parsed.verdictSummary.confidence);

  // v2.6.20: Removed factor-based boost to ensure input neutrality
  debugLog("generateSingleScopeVerdicts: No factor-based boost applied", {
    answerTruthPct,
    positiveFactors,
    evidencedNegatives,
    contestedNegatives,
  });

  const verdictSummary: VerdictSummary = {
    displayText: displayText,
    answer: answerTruthPct,
    confidence: correctedConfidence,
    truthPercentage: answerTruthPct,
    shortAnswer: parsed.verdictSummary.shortAnswer || "",
    nuancedAnswer: parsed.verdictSummary.nuancedAnswer || "",
    keyFactors,
    hasMultipleProceedings: false,
    hasContestedFactors,
  };

  // Calculate claims average truth percentage (v2.6.30: weighted by centrality × confidence)
  const claimsAvgTruthPct = calculateWeightedVerdictAverage(weightedClaimVerdicts);

  const articleAnalysis: ArticleAnalysis = {
    inputType: analysisInputType,
    verdictSummary,
    hasMultipleProceedings: false,
    articleThesis: understanding.impliedClaim || understanding.articleThesis,
    logicalFallacies: [],

    // Claims summary
    claimsAverageTruthPercentage: claimsAvgTruthPct,
    claimsAverageVerdict: claimsAvgTruthPct,

  // Article verdict
    articleTruthPercentage: answerTruthPct,
    articleVerdict: answerTruthPct,
    articleVerdictReason:
      Math.abs(answerTruthPct - claimsAvgTruthPct) > 15
        ? `Claims avg: ${percentageToArticleVerdict(claimsAvgTruthPct)} (${claimsAvgTruthPct}%)`
        : undefined,

    claimPattern,
  };

  return {
    claimVerdicts: weightedClaimVerdicts,
    articleAnalysis,
    verdictSummary,
  };
}

async function generateClaimVerdicts(
  state: ResearchState,
  understanding: ClaimUnderstanding,
  factsFormatted: string,
  claimsFormatted: string,
  model: any,
  pseudoscienceAnalysis?: PseudoscienceAnalysis,
): Promise<{
  claimVerdicts: ClaimVerdict[];
  articleAnalysis: ArticleAnalysis;
}> {
  // Detect if topic involves procedural/legal/institutional analysis
  // This determines whether to generate Key Factors (unified analysis mode)
  const isProceduralTopic = detectProceduralTopic(understanding, state.originalText);
  const directClaimsForVerdicts = (understanding.subClaims || []).filter(
    (c: any) => !c?.thesisRelevance || c.thesisRelevance === "direct",
  );

  // Add pseudoscience context and verdict calibration to prompt
  // Also add Article Verdict Problem analysis per POC1 spec
  // Get current date for temporal reasoning
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDay = currentDate.getDate();
  const currentDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
  const currentDateReadable = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  let systemPrompt = `Generate verdicts for each claim AND an independent article-level verdict.

## CRITICAL: TEMPORAL REASONING

**CURRENT DATE**: Today is ${currentDateReadable} (${currentDateStr}).

**DATE REASONING RULES**:
- When evaluating dates mentioned in claims, compare them to the CURRENT DATE above
- Do NOT assume dates are in the future without checking against the current date
- Do NOT reject claims as "impossible" based on incorrect temporal assumptions
- If a date seems inconsistent, verify it against the current date before making judgments

## CLAIM VERDICT CALIBRATION (IMPORTANT):

**CRITICAL - RATING DIRECTION FOR SUB-CLAIMS**:
- The verdict MUST rate whether THE CLAIM AS STATED is true
- If the claim says "X was proportionate" but evidence shows X was NOT proportionate → verdict should be LOW (15-28%)
- If the claim says "X was justified" but evidence shows X was NOT justified → verdict should be LOW (15-28%)
- DO NOT rate whether your analysis reasoning is correct - rate whether THE CLAIM TEXT matches the evidence
- The reasoning field explains why the verdict is high or low - the verdict percentage MUST match the reasoning's conclusion
- Example: If reasoning says "tariffs were NOT proportionate", the verdict for a claim stating "tariffs were proportionate" MUST be LOW

- Provide a truth percentage (0-100) for each claim.
- Use these bands to calibrate:
  * 86-100: TRUE (strong support, no credible counter-evidence)
  * 72-85: MOSTLY-TRUE (mostly supported, minor gaps)
  * 58-71: LEANING-TRUE (mixed evidence)
  * 43-57: UNVERIFIED (insufficient evidence)
  * 29-42: LEANING-FALSE (more counter-evidence than support)
  * 15-28: MOSTLY-FALSE (strong counter-evidence)
  * 0-14: FALSE (direct contradiction)

Use the MOSTLY-FALSE/FALSE bands (0-28%) for any claim that evidence contradicts, regardless of certainty level.

## COUNTER-EVIDENCE HANDLING

Facts in the FACTS section are labeled with their relationship to the user's claim:
- **[SUPPORTING]**: Evidence that supports the user's claim being TRUE
- **[COUNTER-EVIDENCE]**: Evidence that CONTRADICTS the user's claim (supports the OPPOSITE being true)
- Unlabeled facts are neutral/contextual

**How to use these labels:**
- If most facts are [COUNTER-EVIDENCE], the verdict should be LOW (FALSE/MOSTLY-FALSE range: 0-28%)
- If most facts are [SUPPORTING], the verdict should be HIGH (TRUE/MOSTLY-TRUE range: 72-100%)
- Weight counter-evidence appropriately - strong counter-evidence should significantly lower the verdict

## CLAIM CONTESTATION (for each claim):
- isContested: true if this claim is politically disputed or challenged
- contestedBy: Who disputes it (e.g., "climate skeptics", "vaccine opponents") - empty string if not contested
- factualBasis: Does the opposition have ACTUAL DOCUMENTED COUNTER-EVIDENCE?
  * "established" = Opposition cites SPECIFIC DOCUMENTED FACTS (studies, data, records, audits)
  * "disputed" = Opposition has some factual counter-evidence but debatable
  * "opinion" = NO factual counter-evidence (just claims, political statements)
  * "unknown" = Cannot determine

CRITICAL - factualBasis MUST be "opinion" for:
- Public statements or rhetoric without documented evidence
- Ideological objections without factual basis
- "Some people say" or "critics claim" without specific counter-evidence

## SCOPE/CONTEXT-AWARE EVALUATION

Evidence may come from sources with DIFFERENT analytical scopes (e.g., broad-boundary vs narrow-boundary, Region A vs Region B methodology).

**When evaluating claims with scope-specific evidence**:
1. **Check scope alignment**: Are facts being compared from compatible scopes?
2. **Flag scope mismatches**: If Source A uses a broad boundary and Source B uses a narrow boundary, these are NOT directly comparable
3. **Note in reasoning**: When scope affects interpretation, mention it (e.g., "Under broad-boundary analysis...")
4. **Don't treat scope differences as contradictions**: "40% efficient (broad boundary)" and "60% efficient (narrow boundary)" can BOTH be correct for different scopes

**Example scope mismatch to flag**:
- Claim: "Hydrogen cars are more efficient than EVs"
- Source A (narrow boundary): "X is 60% efficient"
- Source B (broad boundary): "Y is 80% efficient"
→ These use different scopes - NOT a valid comparison. Note in reasoning.

## ARTICLE VERDICT ANALYSIS (CRITICAL - Article Verdict Problem)

The article's overall credibility is NOT simply the average of individual claim verdicts!
An article with mostly accurate facts can still be MISLEADING if:
1. The main conclusion doesn't follow from the evidence
2. There are logical fallacies (correlation ≠ causation, cherry-picking, etc.)
3. The framing creates a false impression despite accurate individual facts

AFTER analyzing individual claims, evaluate the article as a whole:

1. What is the article's main argument or conclusion (thesis)?
2. Does this conclusion LOGICALLY FOLLOW from the evidence presented?
3. Are there LOGICAL FALLACIES?
   - Correlation presented as causation
   - Cherry-picking evidence
   - False equivalence
   - Appeal to authority without substance
   - Hasty generalization
4. Even if individual facts are accurate, is the article's framing MISLEADING?
5. Are CENTRAL claims (marked [CENTRAL]) true? If central claims are FALSE but supporting claims are TRUE, the article is MISLEADING.

ARTICLE VERDICT TRUTH PERCENTAGE:
- Provide articleVerdict as a truth percentage (0-100).
- Use these bands to calibrate:
  * 86-100: TRUE (thesis strongly supported, no significant logical issues)
  * 72-85: MOSTLY-TRUE (mostly supported, minor issues)
  * 58-71: LEANING-TRUE (mixed framing or gaps)
  * 43-57: UNVERIFIED (mixed support)
  * 29-42: LEANING-FALSE (notable logical gaps or framing issues)
  * 15-28: MOSTLY-FALSE (strong counter-evidence to the thesis)
  * 0-14: FALSE (thesis is directly contradicted)

IMPORTANT: Set verdictDiffersFromClaimAverage=true if the article verdict differs from what a simple average would suggest.
Example: If 3/4 claims are true but the main conclusion is false -> set articleVerdict in the LEANING-FALSE band (29-42%).

${getKnowledgeInstruction(state.originalInput, understanding)}
${getProviderPromptHint()}`;

  // KeyFactors are now generated in understanding phase, not verdict generation
  systemPrompt += `

## KEY FACTORS
KeyFactors are handled in the understanding phase. Provide an empty keyFactors array: []`;

  if (pseudoscienceAnalysis?.isPseudoscience) {
    systemPrompt += `\n\nPSEUDOSCIENCE DETECTED: This content contains patterns associated with pseudoscience (${pseudoscienceAnalysis.categories.join(", ")}).
Claims relying on mechanisms that contradict established science (like "water memory", "molecular restructuring", etc.) should be in the MOSTLY-FALSE/FALSE bands (0-28%), not the UNVERIFIED band (43-57%).
However, do NOT place them in the FALSE band (0-14%) unless you can prove them wrong with 99%+ certainty - we can't prove a negative absolutely.`;
  }

  let parsed: z.infer<typeof VERDICTS_SCHEMA_CLAIM> | null = null;

  try {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `THESIS: "${understanding.articleThesis}"\n\nCLAIMS:\n${claimsFormatted}\n\nFACTS:\n${factsFormatted}`,
        },
      ],
      temperature: getDeterministicTemperature(0.3),
      output: Output.object({ schema: VERDICTS_SCHEMA_CLAIM }),
    });
    state.llmCalls++;

    // Handle different AI SDK versions - safely extract structured output
    const rawOutput = extractStructuredOutput(result);
    if (rawOutput) {
      parsed = rawOutput as z.infer<typeof VERDICTS_SCHEMA_CLAIM>;
    }
  } catch (err: any) {
    console.error(
      "[Analyzer] Structured output failed for claim verdicts:",
      err?.message || err,
    );
    console.error("[Analyzer] Full error:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2).slice(0, 2000));
    state.llmCalls++;
  }

  // If structured output failed, create fallback verdicts
  if (!parsed || !parsed.claimVerdicts) {
    console.log("[Analyzer] Using fallback verdict generation");

    // Create default verdicts for each claim
    const fallbackVerdicts: ClaimVerdict[] = directClaimsForVerdicts.map(
      (claim: any) => ({
        claimId: claim.id,
        claimText: claim.text,
        verdict: 50,
        confidence: 50,
        truthPercentage: 50,
        riskTier: "B" as const,
        reasoning:
          "Unable to generate verdict due to schema validation error. Manual review recommended.",
        supportingFactIds: [],
        isCentral: claim.isCentral || false,
        centrality: claim.centrality || "medium",
        thesisRelevance: claim.thesisRelevance || "direct",
        startOffset: claim.startOffset,
        endOffset: claim.endOffset,
        highlightColor: getHighlightColor7Point(50),
        isContested: false,
        contestedBy: "",
        factualBasis: "unknown" as const,
      }),
    );

    const centralTotal = fallbackVerdicts.filter((v) => v.isCentral).length;
    const centralSupported = fallbackVerdicts.filter(
      (v) => v.isCentral && v.truthPercentage >= 72,
    ).length;
    const articleAnalysis: ArticleAnalysis = {
      inputType: "article",
      hasMultipleProceedings: false,
      articleThesis: understanding.articleThesis,
      logicalFallacies: [],
      claimsAverageTruthPercentage: 50,
      claimsAverageVerdict: 50,
      articleTruthPercentage: 50,
      articleVerdict: 50,
      articleVerdictReason:
        "Verdict generation failed - manual review recommended",
      claimPattern: {
        total: fallbackVerdicts.length,
        supported: 0,
        uncertain: fallbackVerdicts.length,
        refuted: 0,
        centralClaimsTotal: centralTotal,
        centralClaimsSupported: centralSupported,
      },
    };

    return { claimVerdicts: fallbackVerdicts, articleAnalysis };
  }

  // Normal flow with parsed output

  // Map LLM verdicts by claim ID for quick lookup
  const llmVerdictMap = new Map(
    (parsed.claimVerdicts || []).map((cv: any) => [cv.claimId, cv]),
  );

  // Ensure ALL claims get a verdict (fill in missing ones)
  const claimVerdicts: ClaimVerdict[] = directClaimsForVerdicts.map(
    (claim: any) => {
      const cv = llmVerdictMap.get(claim.id);

      // If LLM didn't return a verdict for this claim, create a default one
      if (!cv) {
        console.warn(
          `[Analyzer] Missing verdict for claim ${claim.id}, using default`,
        );
        return {
          claimId: claim.id,
          claimText: claim.text,
          verdict: 50,
          confidence: 50,
          truthPercentage: 50,
          riskTier: "B" as const,
          reasoning: "No verdict returned by LLM for this claim.",
          supportingFactIds: [],
          isContested: false,
          contestedBy: "",
          factualBasis: "unknown",
          isCentral: claim.isCentral || false,
          centrality: claim.centrality || "medium",
          thesisRelevance: claim.thesisRelevance || "direct",
          claimRole: claim.claimRole || "core",
          dependsOn: claim.dependsOn || [],
          keyFactorId: claim.keyFactorId || "", // Preserve KeyFactor mapping
          startOffset: claim.startOffset,
          endOffset: claim.endOffset,
          highlightColor: getHighlightColor7Point(50),
        } as ClaimVerdict;
      }

      // Sanitize temporal errors from reasoning
      const sanitizedReasoning = sanitizeTemporalErrors(cv.reasoning || "", new Date());

      let truthPct = calculateTruthPercentage(cv.verdict, cv.confidence);
      let finalConfidence = normalizePercentage(cv.confidence);
      let escalationReason: string | undefined;

      // v2.6.31: Detect and correct inverted verdicts
      const inversionCheck = detectAndCorrectVerdictInversion(
        claim.text || cv.claimId || "",
        sanitizedReasoning,
        truthPct
      );
      if (inversionCheck.wasInverted) {
        truthPct = inversionCheck.correctedPct;
      }

      // v2.6.31: Detect if this is a counter-claim
      const claimFacts = state.facts.filter(f =>
        cv.supportingFactIds?.includes(f.id)
      );
      const isCounterClaim = detectCounterClaim(
        claim.text || cv.claimId || "",
        understanding.impliedClaim || understanding.articleThesis || "",
        claimFacts
      );

      const claimPseudo = detectPseudoscience(claim.text || cv.claimId);

      // Apply pseudoscience escalation only when the claim itself matches pseudoscience patterns
      if (claimPseudo.isPseudoscience) {
        const escalation = escalatePseudoscienceVerdict(
          truthPct,
          finalConfidence,
          claimPseudo,
        );
        truthPct = escalation.truthPercentage;
        finalConfidence = escalation.confidence;
        escalationReason = escalation.escalationReason;
      }

      const evidenceBasedContestation =
        cv.isContested &&
        (cv.factualBasis === "established" || cv.factualBasis === "disputed");
      if (evidenceBasedContestation) {
        const penalty = cv.factualBasis === "established" ? 12 : 8;
        truthPct = Math.max(0, truthPct - penalty);
      }

      return {
        ...cv,
        claimId: claim.id,
        verdict: truthPct,
        truthPercentage: truthPct,
        confidence: finalConfidence,
        reasoning: sanitizedReasoning,
        claimText: claim.text || "",
        isCentral: claim.isCentral || false,
        centrality: claim.centrality || "medium",
        thesisRelevance: claim.thesisRelevance || "direct",
        claimRole: claim.claimRole || "core",
        dependsOn: claim.dependsOn || [],
        keyFactorId: claim.keyFactorId || "", // Preserve KeyFactor mapping for aggregation
        startOffset: claim.startOffset,
        endOffset: claim.endOffset,
        highlightColor: getHighlightColor7Point(truthPct),
        isPseudoscience: claimPseudo.isPseudoscience,
        escalationReason,
        isCounterClaim,
      } as ClaimVerdict;
    },
  );

  const weightedClaimVerdicts = applyEvidenceWeighting(
    claimVerdicts,
    state.facts,
    state.sources,
  );

  // DEPENDENCY PROPAGATION: If a prerequisite claim is false, flag dependent claims
  const verdictMap = new Map(weightedClaimVerdicts.map((v) => [v.claimId, v]));

  for (const verdict of weightedClaimVerdicts) {
    const claim = understanding.subClaims.find(
      (c: any) => c.id === verdict.claimId,
    );
    const dependencies = claim?.dependsOn || [];

    if (dependencies.length > 0) {
      // Check if any dependency is false (truthPercentage < 43%)
      const failedDeps = dependencies.filter((depId: string) => {
        const depVerdict = verdictMap.get(depId);
        return depVerdict && depVerdict.truthPercentage < 43;
      });

      if (failedDeps.length > 0) {
        // Mark this claim as having failed prerequisites
        verdict.dependencyFailed = true;
        verdict.failedDependencies = failedDeps;

        // Add note to reasoning
        const depNames = failedDeps
          .map((id: string) => {
            const dv = verdictMap.get(id);
            return dv ? `${id}: "${dv.claimText.slice(0, 50)}..."` : id;
          })
          .join(", ");

        verdict.reasoning = `[PREREQUISITE FAILED: ${depNames}] ${verdict.reasoning || ""}`;

        // For display purposes, we keep the original verdict but flag it
        // The UI can choose to show this differently
      }
    }
  }

  // Filter out claims with failed dependencies for verdict calculations
  // These claims are shown but don't contribute to the overall verdict to avoid double-counting
  // (the failed prerequisite already contributes its false verdict)
  const independentVerdicts = weightedClaimVerdicts.filter((v) => !v.dependencyFailed);

  // Calculate claim pattern using truth percentages (only independent claims)
  const claimPattern = {
    total: weightedClaimVerdicts.length,
    supported: independentVerdicts.filter((v) => v.truthPercentage >= 72)
      .length,
    uncertain: independentVerdicts.filter(
      (v) => v.truthPercentage >= 43 && v.truthPercentage < 72,
    ).length,
    refuted: independentVerdicts.filter((v) => v.truthPercentage < 43).length,
    centralClaimsTotal: independentVerdicts.filter((v) => v.isCentral).length,
    centralClaimsSupported: independentVerdicts.filter(
      (v) => v.isCentral && v.truthPercentage >= 72,
    ).length,
    // Track excluded claims for transparency
    dependencyFailedCount: weightedClaimVerdicts.filter((v) => v.dependencyFailed).length,
  };

  // Calculate claims average truth percentage (v2.6.30: weighted by centrality × confidence, only independent claims)
  const claimsAvgTruthPct = calculateWeightedVerdictAverage(independentVerdicts);

  // Article Verdict Problem: Check central claims specifically (using independent verdicts only)
  // If central claims are refuted but supporting claims are true, article is MISLEADING
  const centralClaims = independentVerdicts.filter((v) => v.isCentral);
  const centralRefuted = centralClaims.filter((v) => v.truthPercentage < 43);
  const centralSupported = centralClaims.filter((v) => v.truthPercentage >= 72);
  const nonCentralClaims = independentVerdicts.filter((v) => !v.isCentral);
  const nonCentralSupported = nonCentralClaims.filter((v) => v.truthPercentage >= 72);

  // Detect Article Verdict Problem pattern: accurate supporting facts but false central claim
  const hasMisleadingPattern =
    centralRefuted.length > 0 &&
    nonCentralSupported.length >= 2 &&
    claimsAvgTruthPct >= 50; // Average looks OK but central claim is false

  // Calculate article truth percentage from LLM's article verdict
  let articleTruthPct = calculateArticleTruthPercentage(
    parsed.articleAnalysis.articleVerdict,
    parsed.articleAnalysis.articleConfidence,
  );

  let articleVerdictOverrideReason: string | undefined;

  // If LLM returned default/unknown verdict (50%), use claims average instead
  if (articleTruthPct === 50 && claimsAvgTruthPct !== 50) {
    articleTruthPct = claimsAvgTruthPct;
  }

  // Article Verdict Problem Override: Central claim refuted = article MISLEADING
  // This catches the "Coffee cures cancer" pattern where supporting facts are true
  // but the main conclusion is false
  if (hasMisleadingPattern && articleTruthPct > 35) {
    console.log(`[Analyzer] Article Verdict Problem detected: ${centralRefuted.length} central claims refuted, ${nonCentralSupported.length} supporting claims true, but avg=${claimsAvgTruthPct}%. Overriding to MISLEADING.`);
    articleTruthPct = 35; // MISLEADING range (29-42%)
    articleVerdictOverrideReason = `Central claim(s) refuted despite ${nonCentralSupported.length} accurate supporting facts - article draws unsupported conclusions`;
  }

  const hasPseudoscienceClaims = weightedClaimVerdicts.some((v) => v.isPseudoscience);

  // For pseudoscience: article verdict cannot be higher than claims average
  // (can't have a credible article with false claims)
  if (
    pseudoscienceAnalysis?.isPseudoscience &&
    hasPseudoscienceClaims &&
    articleTruthPct > claimsAvgTruthPct
  ) {
    articleTruthPct = Math.min(claimsAvgTruthPct, 28); // Cap at FALSE level for pseudoscience
    articleVerdictOverrideReason = `Pseudoscience detected - article verdict capped`;
  }

  // Check if article verdict differs significantly from claims average
  const verdictDiffers = Math.abs(articleTruthPct - claimsAvgTruthPct) > 15 || hasMisleadingPattern;

  // Process Key Factors by aggregating claim verdicts (moved from verdict generation to understanding)
  const keyFactors: KeyFactor[] = [];

  // Only process KeyFactors if they were discovered during understanding
  if (understanding.keyFactors && understanding.keyFactors.length > 0) {
    for (const factor of understanding.keyFactors) {
      // Find all claims mapped to this factor
      const factorClaims = weightedClaimVerdicts.filter(v => v.keyFactorId === factor.id);

      if (factorClaims.length > 0) {
        // Aggregate verdicts for this factor
        const factorAvgTruthPct = Math.round(
          factorClaims.reduce((sum, v) => sum + v.truthPercentage, 0) / factorClaims.length
        );

        // Determine factor support based on average
        let supports: "yes" | "no" | "neutral";
        if (factorAvgTruthPct >= 72) {
          supports = "yes";
        } else if (factorAvgTruthPct < 43) {
          supports = "no";
        } else {
          supports = "neutral";
        }

        // Create explanation from aggregated claim verdicts
        const supportedCount = factorClaims.filter(v => v.truthPercentage >= 72).length;
        const refutedCount = factorClaims.filter(v => v.truthPercentage < 43).length;
        const explanation = `${supportedCount}/${factorClaims.length} claims support this factor, ${refutedCount} refute it. Average truth: ${factorAvgTruthPct}%.`;

        keyFactors.push({
          factor: factor.factor,
          supports,
          explanation,
          isContested: false, // Will be determined by contestation analysis
          contestedBy: "",
          contestationReason: "",
          factualBasis: "unknown",
        });
      }
    }
  }

  // Check if any negative factors are contested with evidence-based contestation
  const hasContestedFactors = keyFactors.some(
    (f) =>
      f.supports === "no" &&
      f.isContested &&
      (f.factualBasis === "established" || f.factualBasis === "disputed")
  );

  console.log(`[Analyzer] Key Factors aggregated: ${keyFactors.length} factors from ${understanding.keyFactors?.length || 0} discovered, ${hasContestedFactors ? "has" : "no"} contested factors`);

  return {
    claimVerdicts: weightedClaimVerdicts,
    articleAnalysis: {
      inputType: understanding.detectedInputType,
      hasMultipleProceedings: false,
      articleThesis: understanding.articleThesis,
      logicalFallacies: parsed.articleAnalysis.logicalFallacies,

      // Claims summary
      claimsAverageTruthPercentage: claimsAvgTruthPct,
      claimsAverageVerdict: claimsAvgTruthPct,

      // Article verdict (LLM's independent assessment, with Article Verdict Problem override)
      articleTruthPercentage: articleTruthPct,
      articleVerdict: articleTruthPct,
      articleVerdictReason: articleVerdictOverrideReason
        ? articleVerdictOverrideReason
        : verdictDiffers
          ? articleTruthPct < claimsAvgTruthPct
            ? "Article uses facts misleadingly or draws unsupported conclusions"
            : "Article's conclusion is better supported than individual claims suggest"
          : undefined,

      claimPattern,
      isPseudoscience: pseudoscienceAnalysis?.isPseudoscience,
      pseudoscienceCategories: pseudoscienceAnalysis?.categories,

  // NEW v2.6.18: Key Factors for article mode (unified analysis mode)
      keyFactors: keyFactors.length > 0 ? keyFactors : undefined,
      hasContestedFactors: keyFactors.length > 0 ? hasContestedFactors : undefined,
    },
  };
}

function getHighlightColor(truthPercentage: number): "green" | "yellow" | "red" {
  const normalized = normalizePercentage(truthPercentage);
  if (normalized >= 72) return "green";
  if (normalized >= 43) return "yellow";
  return "red";
}


// ============================================================================
// STEP 6-7: Summary & Report
// ============================================================================

async function generateTwoPanelSummary(
  state: ResearchState,
  claimVerdicts: ClaimVerdict[],
  articleAnalysis: ArticleAnalysis,
  model: any,
): Promise<TwoPanelSummary> {
  const understanding = state.understanding!;
  const hasMultipleProceedings = articleAnalysis.hasMultipleProceedings;

  const rawInputDisplay = String(
    understanding.originalInputDisplay || state.originalInput || "",
  ).trim();
  const isShortSimpleInput =
    !!rawInputDisplay &&
    state.inputType !== "url" &&
    rawInputDisplay.length <= 220 &&
    !rawInputDisplay.includes("\n") &&
    rawInputDisplay.split(/\s+/).filter(Boolean).length <= 35;

  // Display: do not paraphrase short/simple inputs; show verbatim.
  let title =
    (isShortSimpleInput ? rawInputDisplay : "") ||
    understanding.articleThesis ||
    understanding.impliedClaim ||
    state.originalText.split("\n")[0]?.trim().slice(0, 100) ||
    "Analyzed Content";

  if (hasMultipleProceedings) {
    title += ` (${understanding.distinctProceedings.length} contexts)`;
  }

  // Get the implied claim, filtering out placeholder values
  // v2.6.24: Use articleThesis for display (LLM-extracted summary)
  // impliedClaim is now the normalized input (for analysis consistency), not for display
  const displaySummary = isShortSimpleInput
    ? rawInputDisplay
    : (understanding.articleThesis || understanding.impliedClaim);
  const isValidDisplaySummary = displaySummary &&
    !displaySummary.toLowerCase().includes("unknown") &&
    displaySummary !== "<UNKNOWN>" &&
    displaySummary.length > 10;

  const articleSummary = {
    title,
    source:
      state.inputType === "url" ? state.originalInput : "User-provided text",
    mainArgument: isValidDisplaySummary
      ? displaySummary
      : (understanding.subClaims[0]?.text || "Analysis of provided content"),
    keyFindings: understanding.subClaims.slice(0, 4).map((c: any) => c.text),
    reasoning: hasMultipleProceedings
      ? `Covers ${understanding.distinctProceedings.length} contexts: ${understanding.distinctProceedings.map((p: DistinctProceeding) => p.shortName).join(", ")}`
      : `Examined ${understanding.subClaims.length} claims`,
    conclusion:
      articleAnalysis.verdictSummary?.shortAnswer ||
      (isValidDisplaySummary ? displaySummary : understanding.subClaims[0]?.text || "See claims analysis"),
  };

  const analysisId = `FH-${Date.now().toString(36).toUpperCase()}`;

  const overallVerdict = normalizePercentage(
    articleAnalysis.articleTruthPercentage ??
    articleAnalysis.verdictSummary?.truthPercentage ??
    50,
  );

  const inputUrl = state.inputType === "url" ? state.originalInput : undefined;

  // v2.6.28: Calculate confidence from verdictSummary or claims average
  let overallConfidence = 50; // Default fallback
  if (articleAnalysis.verdictSummary?.confidence != null) {
    overallConfidence = normalizePercentage(articleAnalysis.verdictSummary.confidence);
  } else if (claimVerdicts.length > 0) {
    // Fallback: average confidence from claims
    const avgClaimConfidence = claimVerdicts.reduce((sum, cv) => sum + (cv.confidence ?? 50), 0) / claimVerdicts.length;
    overallConfidence = Math.round(avgClaimConfidence);
  }

  const factharborAnalysis = {
    sourceCredibility: calculateOverallCredibility(state.sources, inputUrl),
    claimVerdicts: claimVerdicts.map((cv: ClaimVerdict) => ({
      claim:
        cv.claimText.slice(0, 80) + (cv.claimText.length > 80 ? "..." : ""),
      verdict: cv.verdict,
      truthPercentage: cv.truthPercentage,
    })),
    methodologyAssessment: generateMethodologyAssessment(
      state,
      articleAnalysis,
    ),
    overallVerdict,
    confidence: overallConfidence, // v2.6.28: Added missing confidence property
    analysisId,
  };

  return { articleSummary, factharborAnalysis };
}

function calculateOverallCredibility(
  sources: FetchedSource[],
  inputUrl?: string,
): string {
  // First, check input source credibility if URL provided
  let inputSourceInfo = "";
  if (inputUrl && inputUrl.startsWith("http")) {
    try {
      const hostname = new URL(inputUrl).hostname.replace(/^www\./, "");
      const inputScore = getTrackRecordScore(inputUrl);
      if (inputScore !== null) {
        const level =
          inputScore >= 0.85
            ? "Very High"
            : inputScore >= 0.7
              ? "High"
              : inputScore >= 0.55
                ? "Medium"
                : "Low";
        inputSourceInfo = `${hostname}: ${level} (${(inputScore * 100).toFixed(0)}%)`;
      } else {
        inputSourceInfo = `${hostname}: Unknown`;
      }
    } catch {
      inputSourceInfo = "Unknown source";
    }
  }

  // Then check research sources
  const withScore = sources.filter(
    (s) => s.trackRecordScore !== null && s.fetchSuccess,
  );
  if (withScore.length === 0) {
    return inputSourceInfo || "Unknown";
  }

  const avg =
    withScore.reduce((sum, s) => sum + (s.trackRecordScore || 0), 0) /
    withScore.length;
  const researchLevel =
    avg >= 0.85
      ? "Very High"
      : avg >= 0.7
        ? "High"
        : avg >= 0.55
          ? "Medium"
          : "Low";
  const researchInfo = `Research sources: ${researchLevel} (${(avg * 100).toFixed(0)}%)`;

  if (inputSourceInfo) {
    return `${inputSourceInfo}\n${researchInfo}`;
  }
  return researchInfo;
}

function generateMethodologyAssessment(
  state: ResearchState,
  articleAnalysis: ArticleAnalysis,
): string {
  const parts: string[] = [];
  parts.push("Unified analysis mode");
  if (articleAnalysis.hasMultipleProceedings)
    parts.push(`Multi-context (${articleAnalysis.proceedings?.length})`);
  if (articleAnalysis.verdictSummary?.hasContestedFactors)
    parts.push("Contested factors flagged");
  parts.push(`${state.searchQueries.length} searches`);
  parts.push(`${state.sources.filter((s) => s.fetchSuccess).length} sources`);
  return parts.join("; ");
}

async function generateReport(
  state: ResearchState,
  claimVerdicts: ClaimVerdict[],
  articleAnalysis: ArticleAnalysis,
  twoPanelSummary: TwoPanelSummary,
  model: any,
): Promise<string> {
  const understanding = state.understanding!;
  const hasMultipleProceedings = articleAnalysis.hasMultipleProceedings;
  const useRich = CONFIG.reportStyle === "rich";
  const iconPositive = useRich ? "✅" : "";
  const iconNegative = useRich ? "❌" : "";
  const iconNeutral = useRich ? "❓" : "";
  const iconWarning = useRich ? "⚠️" : "";
  const iconOk = useRich ? "✅" : "";
  const iconFail = useRich ? "❌" : "";

  let report = `# FactHarbor Analysis Report\n\n`;
  report += `**Analysis ID:** ${twoPanelSummary.factharborAnalysis.analysisId}\n`;
  report += `**Schema:** ${CONFIG.schemaVersion}\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;

  // Executive Summary (moved to top - public-facing content first)
  report += `## Executive Summary\n\n`;

  // Unified summary for all inputs (input neutrality)
    const verdictEmoji =
      articleAnalysis.articleTruthPercentage >= 72
        ? iconPositive
        : articleAnalysis.articleTruthPercentage >= 43
          ? iconNeutral
          : iconNegative;

    report += `### Article Verdict: ${verdictEmoji} ${percentageToArticleVerdict(articleAnalysis.articleTruthPercentage)} (${articleAnalysis.articleTruthPercentage}%)\n\n`;

    if (articleAnalysis.articleVerdictReason) {
      report += `> ${articleAnalysis.articleVerdictReason}\n\n`;
    }

    if (articleAnalysis.articleThesis &&
        articleAnalysis.articleThesis !== "<UNKNOWN>" &&
        !articleAnalysis.articleThesis.toLowerCase().includes("unknown")) {
      report += `**Implied Claim:** ${articleAnalysis.articleThesis}\n\n`;
    }

    if (articleAnalysis.keyFactors && articleAnalysis.keyFactors.length > 0) {
      report += `**Key Factors:**\n`;
      for (const f of articleAnalysis.keyFactors) {
        const icon =
          f.supports === "yes"
            ? iconPositive
            : f.supports === "no"
              ? iconNegative
              : iconNeutral;
        report += `- ${icon} ${f.factor}${f.isContested ? ` ${iconWarning} CONTESTED` : ""}\n`;
      }
      report += `\n`;
  }

  // Claims
  report += `## Claims\n\n`;
  for (const cv of claimVerdicts) {
    // 7-level scale emoji mapping based on truthPercentage
    const emoji =
      cv.truthPercentage >= 72
        ? iconPositive
        : cv.truthPercentage >= 43
          ? iconNeutral
          : iconNegative;

    const cvConfidence = cv.confidence ?? 0;
    report += `**${cv.claimId}:** ${cv.claimText} ${emoji} ${percentageToClaimVerdict(cv.truthPercentage, cvConfidence)} (${cv.truthPercentage}% truth)\n\n`;
  }

  // Sources
  report += `## Sources\n\n`;
  for (const s of state.sources) {
    const status = s.fetchSuccess ? iconOk : iconFail;
    report += `- ${status} [${s.title}](${s.url})`;
    if (s.trackRecordScore)
      report += ` (${(s.trackRecordScore * 100).toFixed(0)}%)`;
    report += `\n`;
  }

  // Technical Notes (moved to bottom - development/technical info)
  report += `\n---\n\n`;
  report += `## Technical Notes\n\n`;
  report += `### Research Summary\n\n`;
  report += `| Metric | Value |\n`;
  report += `| --- | --- |\n`;
  report += `| Web searches | ${state.searchQueries.length} |\n`;
  report += `| LLM calls | ${state.llmCalls} |\n`;
  report += `| Sources fetched | ${state.sources.length} |\n`;
  report += `| Sources successful | ${state.sources.filter((s: FetchedSource) => s.fetchSuccess).length} |\n`;
  report += `| Facts extracted | ${state.facts.length} |\n`;
  report += `| Search provider | ${CONFIG.searchProvider} |\n`;
  report += `| Analysis mode | ${CONFIG.deepModeEnabled ? "deep" : "quick"} |\n\n`;

  if (state.searchQueries.length > 0) {
    report += `### Web Search Queries\n\n`;
    for (const sq of state.searchQueries) {
      report += `- \`${sq.query}\` → ${sq.resultsCount} results (${sq.focus})\n`;
    }
    report += `\n`;
  }

  return report;
}

// ============================================================================
// MODEL SELECTION
// ============================================================================

function getModel(providerOverride?: string) {
  const provider = (
    providerOverride ??
    process.env.LLM_PROVIDER ??
    "anthropic"
  ).toLowerCase();

  if (provider === "anthropic" || provider === "claude") {
    return {
      provider: "anthropic",
      modelName: "claude-sonnet-4-20250514",
      model: anthropic("claude-sonnet-4-20250514"),
    };
  }
  if (provider === "google" || provider === "gemini") {
    return {
      provider: "google",
      modelName: "gemini-1.5-pro",
      model: google("gemini-1.5-pro"),
    };
  }
  if (provider === "mistral") {
    return {
      provider: "mistral",
      modelName: "mistral-large-latest",
      model: mistral("mistral-large-latest"),
    };
  }
  return { provider: "openai", modelName: "gpt-4o", model: openai("gpt-4o") };
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

type AnalysisInput = {
  inputType: "text" | "url";
  inputValue: string;
  onEvent?: (message: string, progress: number) => void;
  jobId?: string;
};

export async function runFactHarborAnalysis(input: AnalysisInput) {
  // Clear debug log at start of each analysis
  clearDebugLog();
  debugLog("=== ANALYSIS STARTED ===");
  debugLog("Input", {
    jobId: input.jobId || "",
    inputType: input.inputType,
    inputValue: input.inputValue.substring(0, 200),
  });

  const startTime = Date.now();
  const emit = input.onEvent ?? (() => {});
  const config = getActiveConfig();
  const mode = CONFIG.deepModeEnabled ? "deep" : "quick";

  const { provider, modelName, model } = getModel();
  debugLog(`LLM Provider: ${provider}, Model: ${modelName}`);
  console.log(`[Analyzer] Using LLM provider: ${provider}, model: ${modelName}`);

  await emit(`Analysis mode: ${mode} (v${CONFIG.schemaVersion}) | LLM: ${provider}/${modelName}`, 2);

  // ==========================================================================
  // v2.6.26: EARLY INPUT NORMALIZATION at entry point for complete input neutrality
  // Normalize yes/no phrasing to statements BEFORE any analysis begins
  // The original input is preserved only for UI display (originalInputDisplay)
  // ==========================================================================
  const rawInputValue = input.inputValue.trim();
  const needsNormalizationEntry =
    rawInputValue.endsWith("?") ||
    /^(was|is|are|were|did|do|does|has|have|had|can|could|will|would|should|may|might)\s/i.test(rawInputValue);

  // Normalize to statement form for ALL analysis
  // Also strip trailing period from statements to ensure identical text for both input phrasings
  let normalizedInputValue = needsNormalizationEntry
    ? normalizeYesNoQuestionToStatement(rawInputValue)
    : rawInputValue;

  // CRITICAL: Remove trailing period from ALL inputs for exact text matching
  // This ensures "Was X fair?" -> "X was fair" matches "X was fair." -> "X was fair"
  normalizedInputValue = normalizedInputValue.replace(/\.+$/, "").trim();

  // Store original input for UI display (will be set in understanding.originalInputDisplay)
  const originalInputDisplay = rawInputValue;

  console.log(`[Analyzer] v2.6.26 Input Neutrality: Entry point normalization`);
  console.log(`[Analyzer]   Original: "${rawInputValue.substring(0, 100)}"`);
  console.log(`[Analyzer]   Normalized: "${normalizedInputValue.substring(0, 100)}"`);
  // normalizedInputValue is now the canonical form for all analysis paths

  const state: ResearchState = {
    originalInput: normalizedInputValue,  // v2.6.26: Use NORMALIZED input everywhere
    originalText: "",
    inputType: input.inputType,
    understanding: null,
    iterations: [],
    facts: [],
    sources: [],
    contradictionSearchPerformed: false,
    contradictionSourcesFound: 0,
    searchQueries: [], // NEW v2.4.3
    llmCalls: 0, // NEW v2.6.6
    researchQueriesSearched: new Set(), // NEW v2.6.18
    decisionMakerSearchPerformed: false, // NEW v2.6.18
    recentClaimsSearched: false, // NEW v2.6.22
    centralClaimsSearched: new Set(),
    inverseClaimSearchPerformed: false, // NEW v2.6.29
  };

  // Handle URL
  let textToAnalyze = normalizedInputValue;  // v2.6.26: Use normalized input
  if (input.inputType === "url") {
    await emit("Fetching URL content", 3);
    try {
      const result = await extractTextFromUrl(input.inputValue);
      // Handle both old (string) and new (object) return types
      textToAnalyze = typeof result === "string" ? result : result.text;
    } catch (err) {
      throw new Error(`Failed to fetch URL: ${err}`);
    }
  }
  state.originalText = textToAnalyze;

  // STEP 1: Understand
  debugLog("=== STEP 1: UNDERSTAND CLAIM ===");
  debugLog("Text to analyze (first 300 chars)", textToAnalyze.substring(0, 300));
  await emit(`Step 1: Analyzing input [LLM: ${provider}/${modelName}]`, 5);
  const step1Start = Date.now();
  try {
    debugLog("Calling understandClaim...");
    state.understanding = await understandClaim(textToAnalyze, model);
    state.llmCalls++; // understandClaim uses 1 LLM call

    // UI-only: preserve original input text for display; analysis uses normalized statement
    state.understanding.originalInputDisplay = originalInputDisplay;

    const step1Elapsed = Date.now() - step1Start;
    debugLog(`Step 1 completed in ${step1Elapsed}ms`);
    debugLog("Understanding result", {
      detectedInputType: state.understanding?.detectedInputType,
      subClaimsCount: state.understanding?.subClaims?.length,
      researchQueriesCount: state.understanding?.researchQueries?.length,
    });
    console.log(`[Analyzer] Step 1 completed in ${step1Elapsed}ms`);
    if (step1Elapsed < 2000) {
      debugLog(`WARNING: Step 1 completed too fast (${step1Elapsed}ms). LLM call may have failed silently.`);
      console.warn(`[Analyzer] WARNING: Step 1 completed too fast (${step1Elapsed}ms). LLM call may have failed silently.`);
    }
  } catch (err: any) {
    debugLog("!!! STEP 1 FAILED !!!", err?.message || String(err));
    console.error(`\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
    console.error(`[Analyzer] STEP 1 FAILED - understandClaim threw an error!`);
    console.error(`[Analyzer] Error message:`, err?.message || err);
    console.error(`[Analyzer] Full error:`, err);
    console.error(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n`);

    // Re-throw if it's a critical API error so the user knows
    const errMsg = err?.message || String(err);
    if (errMsg.includes("credit balance") || errMsg.includes("insufficient_quota") || errMsg.includes("API")) {
      throw err; // Don't swallow API errors
    }

    state.understanding = {
      detectedInputType: "claim",
      analysisIntent: "none",
      originalInputDisplay: "",
      impliedClaim: "",
      distinctProceedings: [],
      requiresSeparateAnalysis: false,
      proceedingContext: "",
      mainThesis: textToAnalyze.slice(0, 200),
      articleThesis: textToAnalyze.slice(0, 200),
      subClaims: [
        {
          id: "C1",
          text: textToAnalyze.slice(0, 200),
          type: "factual",
          claimRole: "core",
          dependsOn: [],
          keyEntities: [],
          checkWorthiness: "high",
          harmPotential: "medium",
          centrality: "high",
          isCentral: true,
          thesisRelevance: "direct",
          relatedProceedingId: "",
          approximatePosition: "",
          keyFactorId: "",
        },
      ],
      distinctEvents: [],
      legalFrameworks: [],
      researchQueries: [],
      riskTier: "B",
      keyFactors: [],
    };
  }

  const proceedingCount = state.understanding.distinctProceedings.length;
  let statusMsg = `Detected: ${state.understanding.detectedInputType.toUpperCase()} with ${state.understanding.subClaims.length} claims`;
  if (proceedingCount > 1) statusMsg += ` | ${proceedingCount} CONTEXTS`;
  await emit(statusMsg, 10);

  // STEP 2-4: Research with search tracking
  let iteration = 0;
  while (
    iteration < config.maxResearchIterations &&
    state.sources.length < config.maxTotalSources
  ) {
    iteration++;
    const baseProgress = 10 + (iteration / config.maxResearchIterations) * 50;

    const decision = decideNextResearch(state);
    if (decision.complete) {
      await emit(
        `Research complete: ${state.facts.length} facts, ${state.searchQueries.length} searches`,
        baseProgress,
      );
      break;
    }

    let focusMsg = `Step 2.${iteration}: ${decision.focus}`;
    if (decision.targetProceedingId)
      focusMsg += ` [${decision.targetProceedingId}]`;
    await emit(focusMsg, baseProgress);

    if (decision.isContradictionSearch)
      state.contradictionSearchPerformed = true;

    // NEW v2.6.29: Track inverse claim search (counter-evidence)
    if (decision.category === "counter_evidence")
      state.inverseClaimSearchPerformed = true;

    // NEW v2.6.18: Track decision-maker and research query searches
    if (decision.category === "conflict_of_interest")
      state.decisionMakerSearchPerformed = true;
    // NEW v2.6.22: Track claim-level recency searches
    if (decision.focus?.startsWith("Recent claim:"))
      state.recentClaimsSearched = true;
    // NEW: Track central-claim targeted searches
    if (decision.category === "central_claim" && decision.targetClaimId) {
      state.centralClaimsSearched.add(decision.targetClaimId);
    }
    if (decision.category === "research_query") {
      // Mark all matching research queries as searched
      const researchQueries = state.understanding?.researchQueries || [];
      researchQueries.forEach((q, idx) => {
        if (decision.focus?.includes(q.slice(0, 30))) {
          state.researchQueriesSearched.add(idx);
        }
      });
      // Also just mark the next one as searched to avoid infinite loops
      const nextIdx = Array.from({ length: researchQueries.length }, (_, i) => i)
        .find(i => !state.researchQueriesSearched.has(i));
      if (nextIdx !== undefined) state.researchQueriesSearched.add(nextIdx);
    }

    // Check if search is enabled
    if (!CONFIG.searchEnabled) {
      await emit(
        `⚠️ Search disabled (FH_SEARCH_ENABLED=false)`,
        baseProgress + 1,
      );
      state.searchQueries.push({
        query: decision.queries?.[0] || "search disabled",
        iteration,
        focus: decision.focus!,
        resultsCount: 0,
        timestamp: new Date().toISOString(),
        searchProvider: "Disabled",
      });
      continue;
    }

    // =========================================================================
    // GROUNDED SEARCH MODE: Use Gemini's built-in Google Search
    // =========================================================================
    if (CONFIG.searchMode === "grounded" && isGroundedSearchAvailable()) {
      await emit(
        `🔍 Using Gemini Grounded Search for: "${decision.focus}"`,
        baseProgress + 1,
      );

      const groundedResult = await searchWithGrounding({
        prompt: `Find recent, factual information about: ${decision.focus}`,
        context: state.originalInput || state.originalText || "",
      });

      if (groundedResult.groundingUsed && groundedResult.sources.length > 0) {
        console.log(`[Analyzer] Grounded search found ${groundedResult.sources.length} sources`);

        // Convert grounded sources to FetchedSource format and add to state
        const groundedSources = convertToFetchedSources(groundedResult, state.sources.length + 1);
        for (const source of groundedSources) {
          state.sources.push(source as FetchedSource);
        }

        // Track the search
        state.searchQueries.push({
          query: groundedResult.searchQueries[0] || decision.focus!,
          iteration,
          focus: decision.focus!,
          resultsCount: groundedResult.sources.length,
          timestamp: new Date().toISOString(),
          searchProvider: "Gemini-Grounded",
        });

        // Extract facts from the grounded response
        if (groundedResult.groundedResponse) {
          await emit(`📊 Extracting facts from grounded response...`, baseProgress + 2);
          // Create a synthetic source for the grounded response
          const syntheticSource: FetchedSource = {
            id: `S${state.sources.length + 1}`,
            url: "gemini-grounded-search",
            title: `Grounded Search: ${decision.focus}`,
            fullText: groundedResult.groundedResponse,
            trackRecordScore: 60, // Moderate trust for AI-synthesized content
            fetchedAt: new Date().toISOString(),
            category: "grounded_search",
            fetchSuccess: true,
            searchQuery: decision.focus,
          };

          const extractedFacts = await extractFacts(
            syntheticSource,
            decision.focus!,
            model,
            state.understanding?.distinctProceedings || [],
            undefined,
            state.understanding?.impliedClaim || state.originalInput
          );

          if (extractedFacts && extractedFacts.length > 0) {
            // v2.6.29: Deduplicate facts before adding
            const uniqueFacts = deduplicateFacts(extractedFacts, state.facts);
            state.facts.push(...uniqueFacts);
            console.log(`[Analyzer] Extracted ${extractedFacts.length} facts from grounded search (${uniqueFacts.length} unique after dedup)`);
          }
        }

        // Continue to next iteration (skip standard search)
        state.iterations.push({
          number: iteration,
          focus: decision.focus!,
          queries: groundedResult.searchQueries,
          sourcesFound: groundedResult.sources.length,
          factsExtracted: state.facts.length,
        });
        continue;
      } else {
        console.log(`[Analyzer] Grounded search did not return results, falling back to standard search`);
        await emit(`⚠️ Grounded search unavailable, using standard search`, baseProgress + 1);
      }
    }

    // =========================================================================
    // STANDARD SEARCH MODE: Use SerpAPI / Google CSE
    // =========================================================================

    // Perform searches and track them
    const searchResults: Array<{ url: string; title: string; query: string }> =
      [];
    for (const query of decision.queries || []) {
      // Use decision-level recencyMatters (based on original input) OR per-query detection
      // This ensures date filtering is consistent across all queries in a recency-sensitive topic
      const recencyMatters = decision.recencyMatters || isRecencySensitive(query, state.understanding || undefined);
      const dateRestrict: "y" | "m" | "w" | undefined =
        CONFIG.searchDateRestrict || (recencyMatters ? "y" : undefined);

      // Get providers before search to show in event
      const searchProviders = getActiveSearchProviders().join("+");
      const dateFilterMsg = dateRestrict ? ` [filtering: past ${dateRestrict === "y" ? "year" : dateRestrict === "m" ? "month" : "week"}]` : "";
      await emit(
        `🔍 Searching [${searchProviders}]${dateFilterMsg}: "${query}"`,
        baseProgress + 1,
      );

      try {
        const searchResponse = await searchWebWithProvider({
          query,
          maxResults: config.maxSourcesPerIteration,
          dateRestrict,
          domainWhitelist: CONFIG.searchDomainWhitelist || undefined,
        });
        let results = searchResponse.results;
        const actualProviders = searchResponse.providersUsed.join("+");
        console.log(`[Analyzer] Search used: ${actualProviders}, returned ${results.length} results`);

        // Apply domain whitelist if configured
        if (
          CONFIG.searchDomainWhitelist &&
          CONFIG.searchDomainWhitelist.length > 0
        ) {
          const beforeCount = results.length;
          results = results.filter((r: any) => {
            try {
              const hostname = new URL(r.url).hostname
                .replace(/^www\./, "")
                .toLowerCase();
              return CONFIG.searchDomainWhitelist!.some(
                (domain) =>
                  hostname === domain || hostname.endsWith("." + domain),
              );
            } catch {
              return false;
            }
          });
          if (beforeCount > results.length) {
            await emit(
              `  → Filtered ${beforeCount - results.length} results (domain whitelist)`,
              baseProgress + 1,
            );
          }
        }

        // Track the search with provider info
        state.searchQueries.push({
          query,
          iteration,
          focus: decision.focus!,
          resultsCount: results.length,
          timestamp: new Date().toISOString(),
          searchProvider: CONFIG.searchProvider,
        });

        searchResults.push(...results.map((r: any) => ({ ...r, query })));
        await emit(`  → ${results.length} results`, baseProgress + 2);
      } catch (err) {
        await emit(`  → Search failed: ${err}`, baseProgress + 2);
        state.searchQueries.push({
          query,
          iteration,
          focus: decision.focus!,
          resultsCount: 0,
          timestamp: new Date().toISOString(),
          searchProvider: CONFIG.searchProvider,
        });
      }
    }

    const seenUrls = new Set(state.sources.map((s: FetchedSource) => s.url));
    const newResults = searchResults.filter((r) => !seenUrls.has(r.url));
    // Preserve provider relevance ordering (avoid sorting by URL, which can discard top results).
    // De-dupe by URL while keeping first occurrence.
    const uniqueResults: Array<{ url: string; title: string; snippet?: string | null; query: string }> = [];
    const used = new Set<string>();
    for (const r of newResults as any[]) {
      const url = String(r?.url || "");
      if (!url) continue;
      if (used.has(url)) continue;
      used.add(url);
      uniqueResults.push(r);
      if (uniqueResults.length >= config.maxSourcesPerIteration) break;
    }

    if (uniqueResults.length === 0) {
      state.iterations.push({
        number: iteration,
        focus: decision.focus!,
        queries: decision.queries!,
        sourcesFound: 0,
        factsExtracted: state.facts.length,
      });
      continue;
    }

    await emit(`Fetching ${uniqueResults.length} sources`, baseProgress + 3);

    const fetchPromises = uniqueResults.map((r: any, i: number) =>
      fetchSource(
        r.url,
        `S${state.sources.length + i + 1}`,
        decision.category || "general",
        r.query,
      ),
    );
    const fetchedSources = await Promise.all(fetchPromises);
    const validSources = fetchedSources.filter(
      (s): s is FetchedSource => s !== null,
    );
    state.sources.push(...validSources);

    const successfulSources = validSources.filter((s) => s.fetchSuccess);
    await emit(
      `  → ${successfulSources.length}/${validSources.length} fetched successfully`,
      baseProgress + 5,
    );

    if (decision.isContradictionSearch)
      state.contradictionSourcesFound = successfulSources.length;

    await emit(`Extracting facts [LLM: ${provider}/${modelName}]`, baseProgress + 8);
    const extractStart = Date.now();
    // v2.6.29: Mark facts from counter_evidence category as fromOppositeClaimSearch
    const isOppositeClaimSearch = decision.category === "counter_evidence";
    for (const source of successfulSources) {
      const facts = await extractFacts(
        source,
        decision.focus!,
        model,
        state.understanding!.distinctProceedings,
        decision.targetProceedingId,
        state.understanding?.impliedClaim || state.originalInput,
        isOppositeClaimSearch,
      );
      // v2.6.29: Deduplicate facts before adding to avoid near-duplicates
      const uniqueFacts = deduplicateFacts(facts, state.facts);
      state.facts.push(...uniqueFacts);
      state.llmCalls++; // Each extractFacts call is 1 LLM call
    }
    const extractElapsed = Date.now() - extractStart;
    console.log(`[Analyzer] Fact extraction for iteration ${iteration} completed in ${extractElapsed}ms for ${successfulSources.length} sources`);

    state.iterations.push({
      number: iteration,
      focus: decision.focus!,
      queries: decision.queries!,
      sourcesFound: successfulSources.length,
      factsExtracted: state.facts.length,
    });
    await emit(
      `Iteration ${iteration}: ${state.facts.length} facts from ${state.sources.length} sources (${extractElapsed}ms)`,
      baseProgress + 12,
    );
  }

  // STEP 4.4: Evidence-driven scope refinement (fixes under-split / asymmetric scope detection)
  await emit(`Refining scopes from evidence [LLM: ${provider}/${modelName}]`, 60);
  const scopeRefineStart = Date.now();
  const scopeRefine = await refineScopesFromEvidence(state, model);
  state.llmCalls += scopeRefine.llmCalls;
  if (scopeRefine.updated) {
    debugLog("refineScopesFromEvidence: applied", {
      scopeCount: state.understanding?.distinctProceedings?.length ?? 0,
      scopeIds: (state.understanding?.distinctProceedings || []).map((p: any) => p.id),
      requiresSeparateAnalysis: state.understanding?.requiresSeparateAnalysis,
      subClaimsCount: state.understanding?.subClaims?.length ?? 0,
    });
  }
  debugLog(`refineScopesFromEvidence: completed in ${Date.now() - scopeRefineStart}ms`, {
    updated: scopeRefine.updated,
    llmCalls: scopeRefine.llmCalls,
  });

  // STEP 4.5: Post-research outcome extraction - extract outcomes from facts and create claims
  await emit(`Extracting outcomes from research [LLM: ${provider}/${modelName}]`, 62);
  const outcomeClaims = await extractOutcomeClaimsFromFacts(state, model);
  if (outcomeClaims.length > 0) {
    state.understanding!.subClaims.push(...outcomeClaims);
    normalizeSubClaimsImportance(state.understanding!.subClaims as any);
    state.understanding!.subClaims = applyThesisRelevancePolicyBToSubClaims(
      enforceThesisRelevanceInvariants(state.understanding!.subClaims as any) as any,
    ) as any;
    console.log(`[Analyzer] Added ${outcomeClaims.length} outcome-related claims from research`);
    await emit(`Added ${outcomeClaims.length} outcome-related claims`, 63);
  }

  // STEP 4.6: Enrich scopes with outcomes discovered in evidence (generic LLM-based)
  // This updates "pending"/"unknown" outcomes with actual outcomes found in facts
  await emit(`Enriching scopes with discovered outcomes [LLM: ${provider}/${modelName}]`, 64);
  await enrichScopesWithOutcomes(state, model);

  // Deterministic backstop for the Scope Relevance Requirement:
  // prune scopes that have zero direct claims AND zero facts, and recompute requiresSeparateAnalysis.
  state.understanding = pruneScopesByCoverage(state.understanding!, state.facts);
  state.understanding = ensureAtLeastOneScope(state.understanding!);

  // STEP 5: Verdicts
  await emit(`Step 3: Generating verdicts [LLM: ${provider}/${modelName}]`, 65);
  const verdictStart = Date.now();
  const {
    claimVerdicts,
    articleAnalysis,
    verdictSummary,
    pseudoscienceAnalysis,
  } = await generateVerdicts(state, model);
  const verdictElapsed = Date.now() - verdictStart;
  console.log(`[Analyzer] Verdict generation completed in ${verdictElapsed}ms`);

  // Apply Gate 4: Verdict Confidence Assessment
  // Adds confidence tier and publication status to each verdict
  // CRITICAL: Central claims are ALWAYS kept publishable
  const { validatedVerdicts, stats: gate4Stats } = applyGate4ToVerdicts(
    claimVerdicts,
    state.sources,
    state.facts
  );
  console.log(`[Analyzer] Gate 4 applied: ${gate4Stats.publishable}/${gate4Stats.total} publishable, HIGH=${gate4Stats.highConfidence}, MED=${gate4Stats.mediumConfidence}, LOW=${gate4Stats.lowConfidence}, INSUFF=${gate4Stats.insufficient}`);

  // Use validated verdicts going forward (includes gate4Validation metadata)
  const finalClaimVerdicts = validatedVerdicts;

  if (pseudoscienceAnalysis?.isPseudoscience) {
    await emit(
      `⚠️ Pseudoscience detected: ${pseudoscienceAnalysis.categories.join(", ")}`,
      67,
    );
  }

  // STEP 6: Summary
  await emit("Step 4: Building summary", 75);
  const twoPanelSummary = await generateTwoPanelSummary(
    state,
    finalClaimVerdicts,
    articleAnalysis,
    model,
  );

  // STEP 7: Report
  await emit("Step 5: Generating report", 85);
  const reportMarkdown = await generateReport(
    state,
    finalClaimVerdicts,
    articleAnalysis,
    twoPanelSummary,
    model,
  );

  // Safety: ensure we never emit a result with zero scopes, even if scope refinement was
  // skipped/rejected and the initial understanding produced no scopes.
  state.understanding = ensureAtLeastOneScope(state.understanding!);

  await emit("Analysis complete", 100);

  // Result JSON with search data (NEW v2.4.3)
  const resultJson = {
    meta: {
      schemaVersion: CONFIG.schemaVersion,
      generatedUtc: new Date().toISOString(),
      analysisMode: mode,
      llmProvider: provider,
      llmModel: modelName,
      searchProvider: CONFIG.searchProvider,
      inputType: input.inputType,
      detectedInputType: state.understanding!.detectedInputType,
      hasMultipleProceedings: articleAnalysis.hasMultipleProceedings,
      hasMultipleScopes: articleAnalysis.hasMultipleProceedings,  // Alias
      proceedingCount: state.understanding!.distinctProceedings.length,
      scopeCount: state.understanding!.distinctProceedings.length,  // Alias
      hasContestedFactors:
        articleAnalysis.verdictSummary?.hasContestedFactors || false,
      // NEW v2.4.5: Pseudoscience detection
      isPseudoscience: pseudoscienceAnalysis?.isPseudoscience || false,
      pseudoscienceCategories: pseudoscienceAnalysis?.categories || [],
      pseudoscienceConfidence: pseudoscienceAnalysis?.confidence || 0,
      inputLength: textToAnalyze.length,
      analysisTimeMs: Date.now() - startTime,
      analysisId: twoPanelSummary.factharborAnalysis.analysisId,
      // Gate statistics (POC1)
      gate4Stats: {
        publishable: gate4Stats.publishable,
        total: gate4Stats.total,
        highConfidence: gate4Stats.highConfidence,
        mediumConfidence: gate4Stats.mediumConfidence,
        lowConfidence: gate4Stats.lowConfidence,
        insufficient: gate4Stats.insufficient,
        centralKept: gate4Stats.centralKept,
      },
    },
    verdictSummary: verdictSummary || null,
    // Primary: "scopes" (unified terminology for bounded analytical frames)
    scopes: state.understanding!.distinctProceedings,
    // Backward compatibility alias
    proceedings: state.understanding!.distinctProceedings,
    twoPanelSummary,
    articleAnalysis,
    claimVerdicts: finalClaimVerdicts,
    understanding: state.understanding,
    facts: state.facts,
    // Enhanced source data (v2.4.3)
    sources: state.sources.map((s: FetchedSource) => ({
      id: s.id,
      url: s.url,
      title: s.title,
      trackRecordScore: s.trackRecordScore,
      category: s.category,
      fetchSuccess: s.fetchSuccess,
      searchQuery: s.searchQuery,
    })),
    // NEW v2.4.3: Search queries
    searchQueries: state.searchQueries,
    iterations: state.iterations,
    // Research stats
    researchStats: {
      totalSearches: state.searchQueries.length,
      totalResults: state.searchQueries.reduce(
        (sum, q) => sum + q.resultsCount,
        0,
      ),
      sourcesFetched: state.sources.length,
      sourcesSuccessful: state.sources.filter((s) => s.fetchSuccess).length,
      factsExtracted: state.facts.length,
      contradictionSearchPerformed: state.contradictionSearchPerformed,
      llmCalls: state.llmCalls,
    },
    // NEW v2.4.5: Pseudoscience analysis
    pseudoscienceAnalysis: pseudoscienceAnalysis
      ? {
          isPseudoscience: pseudoscienceAnalysis.isPseudoscience,
          confidence: pseudoscienceAnalysis.confidence,
          categories: pseudoscienceAnalysis.categories,
          recommendation: pseudoscienceAnalysis.recommendation,
          debunkIndicatorsFound:
            pseudoscienceAnalysis.debunkIndicatorsFound.length,
        }
      : null,
    qualityGates: {
      passed:
        state.facts.length >= config.minFactsRequired &&
        state.contradictionSearchPerformed &&
        gate4Stats.publishable > 0,
      // Gate 1: Claim Validation (filters opinions, predictions, low-specificity claims)
      gate1Stats: state.understanding?.gate1Stats || {
        total: 0,
        passed: 0,
        filtered: 0,
        centralKept: 0,
      },
      // Gate 4: Verdict Confidence Assessment (validates evidence quality)
      gate4Stats: {
        total: gate4Stats.total,
        publishable: gate4Stats.publishable,
        highConfidence: gate4Stats.highConfidence,
        mediumConfidence: gate4Stats.mediumConfidence,
        lowConfidence: gate4Stats.lowConfidence,
        insufficient: gate4Stats.insufficient,
        centralKept: gate4Stats.centralKept,
      },
      summary: {
        totalFacts: state.facts.length,
        totalSources: state.sources.length,
        searchesPerformed: state.searchQueries.length,
        contradictionSearchPerformed: state.contradictionSearchPerformed,
      },
    },
  };

  return { resultJson, reportMarkdown };
}

export function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, value));
}
