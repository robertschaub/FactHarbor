/**
 * Input neutrality helpers.
 *
 * Goal: question and statement phrasing should normalize to the same canonical string
 * before any analysis begins.
 */

export type EntryPointNormalizationResult = {
  originalInputDisplay: string;
  normalizedInputValue: string;
  needsNormalization: boolean;
};

function normalizeYesNoQuestionToStatement(input: string): string {
  const trimmed = input.trim().replace(/\?+$/, "");

  // Handle the common yes/no forms in a way that is stable and avoids bad grammar.
  // Goal: "Was the X fair and based on Y?" -> "The X was fair and based on Y"
  // NOTE: needsNormalizationEntry (entry point) checks a broad set of auxiliaries (did/do/does/has/have/had/can/...),
  // so this function must also handle those; otherwise question vs statement inputs can diverge.
  const m = trimmed.match(
    /^(was|were|is|are|did|do|does|has|have|had|can|could|will|would|should|may|might)\s+(.+)$/i,
  );
  if (!m) {
    return trimmed;
  }

  const aux = m[1].toLowerCase(); // was|were|is|are|did|do|does|has|have|had|can|could|will|would|should|may|might
  const rest = m[2].trim();
  if (!rest) return trimmed;

  // Prefer splitting on a clear subject boundary (parentheses / comma) when present.
  const lastParen = rest.lastIndexOf(")");
  if (lastParen > 0 && lastParen < rest.length - 1) {
    const subject = rest.slice(0, lastParen + 1).trim();
    const predicate = rest.slice(lastParen + 1).trim();
    const capSubject = subject.charAt(0).toUpperCase() + subject.slice(1);
    return `${capSubject} ${aux} ${predicate}`.replace(/\s+/g, " ").trim();
  }

  const commaIdx = rest.indexOf(",");
  if (commaIdx > 0 && commaIdx < rest.length - 1) {
    const subject = rest.slice(0, commaIdx).trim();
    const predicate = rest.slice(commaIdx + 1).trim();
    const capSubject = subject.charAt(0).toUpperCase() + subject.slice(1);
    return `${capSubject} ${aux} ${predicate}`.replace(/\s+/g, " ").trim();
  }

  // Heuristic: split before common predicate starters.
  // Keep this generic (no domain-specific terms) but broad enough to handle common yes/no question shapes.
  const predicateStarters = [
    // evaluation adjectives
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
    // generic verb starters
    "cause",
    "causes",
    "caused",
    "increase",
    "increases",
    "increased",
    "decrease",
    "decreases",
    "decreased",
    "affect",
    "affects",
    "affected",
    "improve",
    "improves",
    "improved",
    "harm",
    "harms",
    "harmed",
    "work",
    "works",
    "worked",
    "happen",
    "happens",
    "happened",
    "lead",
    "leads",
    "led",
  ];

  const lower = rest.toLowerCase();
  let bestIdx = -1;
  let bestStarter = "";
  for (const starter of predicateStarters) {
    const idx = lower.indexOf(` ${starter} `);
    if (idx > 0 && (bestIdx === -1 || idx < bestIdx)) {
      bestIdx = idx;
      bestStarter = starter;
    }
  }

  if (bestIdx > 0) {
    const subject = rest.slice(0, bestIdx).trim();
    const predicate = rest.slice(bestIdx + 1).trim(); // keep starter in predicate
    const capSubject = subject.charAt(0).toUpperCase() + subject.slice(1);
    return `${capSubject} ${aux} ${predicate}`.replace(/\s+/g, " ").trim();
  }

  // Fallback: keep the whole rest as the subject; it will still preserve neutrality for many shapes.
  const capRest = rest.charAt(0).toUpperCase() + rest.slice(1);
  return `${capRest} ${aux}`.replace(/\s+/g, " ").trim();
}

export function normalizeInputAtEntryPoint(rawInputValue: string): EntryPointNormalizationResult {
  const raw = (rawInputValue ?? "").trim();
  const needsNormalization =
    raw.endsWith("?") ||
    /^(was|is|are|were|did|do|does|has|have|had|can|could|will|would|should|may|might)\s/i.test(raw);

  let normalized = needsNormalization ? normalizeYesNoQuestionToStatement(raw) : raw;

  // Remove trailing period(s) from ALL inputs for exact text matching.
  normalized = normalized.replace(/\.+$/, "").trim();

  return {
    originalInputDisplay: raw,
    normalizedInputValue: normalized,
    needsNormalization,
  };
}
