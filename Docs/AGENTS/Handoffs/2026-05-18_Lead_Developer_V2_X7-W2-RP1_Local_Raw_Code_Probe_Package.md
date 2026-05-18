### 2026-05-18 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 X7-W2-RP1 Local Raw-Code Probe Package

**Task:** Prepare and review the next diagnostic package after X7-W2-LS5 still reported `node_error_code_present` / `other_known` / `unknown_phase` on all W2 attempts after DIAG4.

**Files touched:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-RP1_Local_Raw_Code_Probe_Package.md`; `Docs/STATUS/Current_Status.md`; `Docs/STATUS/Backlog.md`; `Docs/AGENTS/Agent_Outputs.md`; `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W2-RP1_Local_Raw_Code_Probe_Package.md`; `Docs/AGENTS/index/handoff-index.json`.

**Decision:** RP1 is approved as a docs-only, local-only diagnostic package. It authorizes exactly one transient operator-local probe outside the repo after package commit and clean pre-probe checks. The probe must mirror the actual product transport path: Node `https.request`, explicit `servername`, `agent: false`, `dns.promises.lookup(hostname, { all: true, verbatim: true })`, pinned lookup callback, product-equivalent headers, `1500ms` timeout, and the fixed Wikimedia Core REST Search page-search path.

**Claude review:** Claude Opus 4.6 reviewed the package through `scripts/agents/invoke-claude.cjs` and returned `APPROVE`. Non-blocking probe-time advisories: set `servername` explicitly and treat a helper timeout as `rp1_failure_not_reproduced`.

**Warnings:** RP1 must not commit, log, quote, or expose the observed raw code. The committed result must contain `[RAW_CODE_OBSERVED_LOCALLY_NOT_RECORDED]` and only a categorical conclusion. RP1 authorizes no production source/test edits, committed helper scripts, live jobs, product/admin raw-code telemetry, response body reads, source material/content/parser/cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence/public behavior, provider expansion, endpoint redesign, ACS/direct URL, V1 work/cleanup, retries, or additional probes.

**For next agent:** First commit this package by explicit paths after `git diff --check`, `npm run validate:v2-gates`, `node scripts/validate-v2-gate-register.mjs --self-test`, and `npm run index`. Then run exactly one transient local probe outside the repo, delete the temp helper, verify the repo stayed clean, and document the sanitized categorical RP1 result in a separate closeout package. Do not proceed into DIAG5 or endpoint/client redesign inside RP1.

**Learnings:** The product W2 path uses `https.request`, not fetch/undici/curl. Diagnostic tools must mirror this path or they risk explaining the wrong client behavior. After LS5, bounded taxonomy guesses have diminishing value; the next quality-preserving step is one contained observation, not broader source execution.
