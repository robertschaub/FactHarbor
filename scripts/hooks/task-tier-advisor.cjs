#!/usr/bin/env node
/* task-tier-advisor — UserPromptSubmit hook (advisory only).
   Reads the hook JSON from stdin, classifies the user prompt with simple
   keyword + length heuristics, and prints a systemMessage recommending a model/
   effort tier ONLY on a STRONG signal. On the common/ambiguous case it is
   SILENT. It NEVER blocks prompt submission, NEVER changes model/effort itself
   (a UserPromptSubmit hook cannot), NEVER calls the network or an LLM.

   Crash-safety contract: any parse error or exception -> print {"continue":true}
   and exit 0. Prompt submission must never be broken by this hook. The whole
   body runs inside main() with explicit returns after every emit(), so the
   error path stays correct even if emit() is later changed not to process.exit.

   LIMITATION: this hook can only ADVISE (systemMessage). It cannot switch the
   session model or effort. The automatic routing lever is the description-based
   auto-delegation of the named agents (scout / routine-dev / long-haul /
   verify); this hook just nudges the maintainer toward the right one. */

const fs = require('fs');

function emit(obj) {
  try { process.stdout.write(JSON.stringify(obj)); } catch { /* ignore */ }
  process.exit(0);
}
const SILENT = { continue: true, suppressOutput: true };

function main() {
  let input;
  try {
    input = JSON.parse(fs.readFileSync(0, 'utf8'));
  } catch {
    // Unreadable/invalid stdin — must not break submission.
    emit({ continue: true });
    return;
  }
  if (!input || typeof input !== 'object') { emit({ continue: true }); return; }

  const prompt = String(input.prompt || '').trim();
  if (!prompt) { emit(SILENT); return; }

  const text = prompt.toLowerCase();
  const wordCount = prompt.split(/\s+/).filter(Boolean).length;

  // Edit / reasoning verbs. If the prompt asks for a change or analysis, it is
  // NOT a pure read-only lookup even when it also says "find" or "where is".
  const ACTION_VERB =
    /\b(?:fix|refactor|change|edit|add|implement|debug|why|rewrite|update|modify|remove|delete|rename|migrat|rebuild|design|investigat)/;
  const hasAction = ACTION_VERB.test(text);

  // --- Strong long-horizon / whole-assignment signals -> long-haul (Fable) ---
  // Word-boundary matches so "remnant" etc. don't trip "rebuild", etc.
  const LONG_HAUL = [
    /\bmigrat(?:e|ion|ing)\b/,
    /\brebuild(?:ing)?\b/,
    /\bre-?architect(?:ure|ing)?\b/,
    /\bovernight\b/,
    /\bautonomous(?:ly)?\b/,
    /\bwhole\s+subsystem\b/,
    /\bentire\s+(?:codebase|subsystem|pipeline|module|system)\b/,
    /\ball\s+(?:the\s+)?files\b/,
    /\bacross\s+the\s+(?:whole|entire)\b/,
    /\bmulti-?hour\b/,
    /\bfull\s+(?:migration|rewrite|rebuild)\b/,
  ];
  const longHaulHit = LONG_HAUL.some((re) => re.test(text));
  // Only fire long-haul when the ask is also substantial, so a one-line
  // "is a migration risky?" question doesn't get routed to Fable.
  if (longHaulHit && wordCount >= 12) {
    emit({
      continue: true,
      systemMessage:
        'Tier hint: this looks like long-horizon, whole-assignment work. ' +
        'Consider delegating to the long-haul agent (Fable 5, high effort), ' +
        'or run /model fable and /effort xhigh for the hardest cases. ' +
        'Do NOT use Fable for small asks.',
    });
    return;
  }

  // --- Strong trivial / read-only-scouting signal -> scout or lower tier ---
  // Require the locate cue to be the DOMINANT intent: anchor it to the start of
  // the prompt, keep the prompt genuinely short, and suppress when it also
  // carries an edit/reasoning verb (those are real work, not a pure lookup).
  const LOCATE_LEAD =
    /^(?:where\s+is\b|which\s+files?\b|locate\b|find\s+(?:the\s+)?(?:file|code|function|definition|reference)\b|grep\s+for\b|search\s+(?:the\s+)?(?:code|codebase|repo)\b)/;
  if (LOCATE_LEAD.test(text) && wordCount <= 12 && !hasAction) {
    emit({
      continue: true,
      systemMessage:
        'Tier hint: this looks like a read-only lookup. Consider the scout ' +
        'agent (Haiku, low effort, read-only), or /model sonnet with a lower ' +
        '/effort for a light scoped task.',
    });
    return;
  }

  // Common / ambiguous case: stay silent.
  emit(SILENT);
}

try {
  main();
} catch {
  // Any unexpected failure -> never break submission.
  emit({ continue: true });
}
