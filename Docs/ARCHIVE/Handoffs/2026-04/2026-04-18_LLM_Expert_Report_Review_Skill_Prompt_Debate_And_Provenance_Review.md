### 2026-04-18 | LLM Expert | Codex (GPT-5) | Report-Review Skill Prompt Debate And Provenance Review

**Task:** Review `.claude/skills/report-review/SKILL.md` for prompt/debate design quality, anti-self-eval-bias hardening, multilingual robustness, and evidence/provenance handling, with special attention to Phase 4 panel design, rule-10 `/validate`, prompt-rollout drift logic, and encoding/provenance failure modes.

**Files touched:**
- `Docs/AGENTS/Handoffs/2026-04-18_LLM_Expert_Report_Review_Skill_Prompt_Debate_And_Provenance_Review.md`
- `Docs/AGENTS/Agent_Outputs.md`

**Key decisions:**
- Keep the current Phase 4 structural-first panel pattern. The explicit structural-check column, strict return format, and always-on Devil's Advocate are the right anti-self-eval-bias backbone for this skill.
- Improvement 1 (`HIGH`): rule-10 `/validate` is still too weak on provenance. The skill requires a byte-exact canonical input on submission, but it does not require proof that the persisted job payload stayed byte-exact after transport/encoding. The 2026-04-18 live rerun showed the concrete failure mode: PowerShell stored `Fl??chtlinge` instead of `Flüchtlinge`. Minimum viable change: after any autonomous `/validate`, fetch the created terminal job and compare stored `job.inputValue` byte-for-byte against `families[slug].inputValue`; if different, log `INPUT-PROVENANCE-INVALID`, discard findings from that run, and require a UTF-8-safe submission path for non-ASCII canonical inputs.
- Improvement 2 (`MEDIUM`): the prompt-rollout drift gate is now overly conservative. It still treats direct file-to-active-hash comparison as impossible, but the repo already exposes canonical prompt hashing in `apps/web/src/lib/config-schemas.ts` via `canonicalizeContent("prompt", ...)` and `computeContentHash(...)`. Minimum viable change: in Phase 3h / rule-10 gate, compute the canonical hash of the current prompt file with the repo's own canonicalization path and compare it to `config.db.active_hash`; keep report-level `meta.promptContentHash` only for matching historical jobs to the active blob, not for establishing whether the active blob itself matches the file.
- Improvement 3 (`MEDIUM`): Phase 4 panels still lack explicit provenance and language state in the context bundle. The current compact table gives `jobId`, verdict, confidence, degeneracy, and evidence counts, but not `inputIntegrity`, `inputLanguage`, `reportLanguage`, retrieval languages, or whether a run is an autonomous `/validate` artifact. Minimum viable change: extend the context bundle rows (or add a dedicated `PROVENANCE` block) with `inputIntegrityState`, `inputLanguage`, `reportLanguage`, `retrievalLanguages`, and `promptHash8`, and instruct every panel to treat `inputIntegrityState=INVALID` as a stop-condition for quality judgment.

**Open items:**
- The skill itself was not patched in this review. The three improvements above are still recommendations.
- `Docs/AGENTS/Skills_Learnings.md` still does not exist, so the skill's Phase 9 feedback loop remains effectively dormant until Captain approves the first write.

**Warnings:**
- Review only. I did not modify `.claude/skills/report-review/SKILL.md`, run `/report-review`, or execute `/validate`.
- The provenance recommendation relies on a real failure observed in `Docs/AGENTS/Handoffs/2026-04-18_Senior_Developer_Asylum_WWII_Post_Gating_Live_Rerun.md`; the drift recommendation relies on the currently shipped hashing utilities in `apps/web/src/lib/config-schemas.ts`.

**For next agent:**
- If Captain wants the skill tightened, make this a short three-role debate: LLM Expert for Phase 4/prompt logic, Senior Developer for Windows submission/provenance handling, and Lead Architect for the drift-gate contract. The fixes are small, but they cross prompt, runtime provenance, and workflow boundaries.
- Patch the skill before using `/report-review` as evidence on fresh multilingual live reruns; otherwise a transport-corrupted validate run can still be analyzed as if it were a valid benchmark execution.

**Learnings:** Appended to Role_Learnings.md? no
