# Technical Writer Prompt: UCM Documentation Cleanup

**Date:** 2026-02-02
**Context:** FactHarbor UCM (Unified Config Management) - Post-Implementation
**Goal:** Update documentation to reflect completed UCM work and archive outdated content

---

## Background

The Unified Config Management (UCM) system has completed its Alpha + Phase 2 implementation over the past ~4 days. Major architectural changes have been made:

1. **File-backed defaults** - All configs now load from `apps/web/configs/*.default.json`
2. **Schema versioning** - Version validation with fallback to constants
3. **Bidirectional sync** - Save-to-file functionality (dev mode)
4. **Observability** - Drift detection endpoint and health check validation
5. **Terminology cleanup** - Context vs EvidenceScope naming fixed throughout

**Key Reference Documents:**
- [Knowledge_Transfer_UCM_Terminology.md](Docs/Knowledge_Transfer_UCM_Terminology.md) - What was implemented
- [UCM_Terminology_Code_Review_Response_Plan.md](Docs/UCM_Terminology_Code_Review_Response_Plan.md) - Full implementation plan and completion status

---

## Task Overview

**What You Need to Do:**
1. Update Architecture, Status, and User Guide docs to reflect completed UCM work
2. Archive historical review documents and outdated status reports
3. Clean up backlog/roadmap references to completed items
4. Ensure consistency across all documentation
5. Mark deprecated environment variables as obsolete

**Time Estimate:** 3-4 hours

---

## Part 1: Update Core Documentation

### 1.1 Update `Docs/ARCHITECTURE/Overview.md`

**What to Update:**

**Section: Configuration Management**
- Add new section documenting UCM as the authoritative config system
- Replace any references to "hardcoded config" or "env-based config" with UCM references
- Add the configuration file organization table from the response plan (section 9, AC4)

**Add this section:**
```markdown
## Unified Config Management (UCM)

FactHarbor uses UCM for all runtime configuration. UCM provides:
- File-backed defaults with schema versioning
- Admin UI for runtime configuration changes
- Bidirectional sync between DB and files (development mode)
- Drift detection and config validation

### Configuration File Organization

FactHarbor uses a hybrid config storage model:

| Config Type | File Location | Format | UCM Domain |
|-------------|---------------|--------|------------|
| Pipeline/Search/Calc | `apps/web/configs/` | JSON | Yes |
| Prompts | `apps/web/prompts/` | Markdown | Yes |
| Source Reliability | `apps/web/configs/` | JSON | Yes (separate) |
| Lexicons | `apps/web/configs/` | JSON | Yes |

**Rationale:** Prompts are version-controlled text that benefits from Markdown
formatting and line-based diffs. Structured configs benefit from JSON schema
validation and programmatic manipulation.

### Source of Truth Hierarchy
1. **Runtime Authority:** Database (what the app actually uses)
2. **Default Templates:** JSON files in `apps/web/configs/`
3. **Fallback:** Code constants in `config-schemas.ts`

See [Unified_Config_Management.md](../USER_GUIDES/Unified_Config_Management.md) for details.
```

**Section: Environment Variables**
- Mark `LLM_PROVIDER` as **DEPRECATED** (now uses `pipeline.llmProvider` in UCM)
- Update the environment variables section to clarify:
  - API keys (ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.) are still required
  - LLM_PROVIDER is no longer used (removed from .env.example)
  - Config behavior is controlled via UCM, not environment variables

---

### 1.2 Update `Docs/STATUS/Current_Status.md`

**What to Update:**

**Recent Changes Section**
- Add entry for 2026-02-02 summarizing UCM Alpha + Phase 2 completion
- List the 6 commits from the past 4 days:
  1. `ucm: implement phase1 must-haves from review plan`
  2. `ucm: add basic concurrency warnings for config updates (AC3)`
  3. `fix: refine aggregation-lexicon keywords to prevent false evidence classification`
  4. `ucm: implement save-to-file functionality (Phase 2)`
  5. `docs: add Phase 2 save-to-file implementation guide`
  6. `ucm: add drift detection and health config validation`

**Add this entry:**
```markdown
### 2026-02-02: UCM Alpha + Phase 2 Complete

**Major Implementation:** Unified Config Management system now production-ready
- ✅ File-backed defaults for all 6 config types (pipeline, search, calc, SR, lexicons)
- ✅ Schema versioning with validation and fallback
- ✅ Concurrency warnings with updatedBy tracking
- ✅ Bidirectional sync (Save-to-file) with environment gating
- ✅ Drift detection endpoint (GET /api/admin/config/:type/drift)
- ✅ Health check config validation (status: degraded on invalid config)
- ✅ Terminology cleanup (Context vs EvidenceScope) complete
- 🐛 Fixed: Bolsonaro bug (aggregation-lexicon keywords refined)

**Breaking Changes:**
- `LLM_PROVIDER` env variable deprecated (use UCM pipeline.llmProvider)
- `.env.example` updated to remove deprecated vars

**Implementation Time:** ~16-17 hours over 4 days

**Deferred to Beta:**
- Optimistic locking (full solution)
- Detailed diff views in admin UI
- Automatic schema migration
- Audit logging with full history

See: [Knowledge_Transfer_UCM_Terminology.md](../Knowledge_Transfer_UCM_Terminology.md)
```

**Configuration Status Section**
- Update to reflect UCM as the active system
- Remove any "planned" or "TODO" references to UCM (it's done)
- Update LLM provider configuration status to reference UCM instead of env vars

---

### 1.3 Update `Docs/USER_GUIDES/Unified_Config_Management.md`

**What to Update:**

This doc was already updated during implementation, but verify it includes:
- ✅ Config Source Precedence section (Alpha)
- ✅ Update scenarios table
- ✅ Alpha limitations clearly stated
- ✅ Save-to-file instructions (if not present, add from Phase 2 guide)

**Add if missing:**
```markdown
## Save to File (Development Mode)

In development, you can save active DB configs back to default files:

1. Navigate to Admin → Config → [config type]
2. Make your changes and save to DB
3. Click "💾 Save to File" button (appears only in development)
4. Preview with "Preview Save to File" before committing

**Safety Features:**
- Only works in `NODE_ENV=development` or with `FH_ALLOW_CONFIG_FILE_WRITE=true`
- Creates `.bak` backup before overwriting
- Atomic writes (.tmp → rename)
- Schema validation before write

**Production:** Save-to-file is blocked by default in production for safety.
```

---

### 1.4 Update `Docs/USER_GUIDES/LLM_Configuration.md`

**What to Update:**

**Provider Selection Section**
- Remove any instructions to set `LLM_PROVIDER` environment variable
- Add clear migration note:

```markdown
## Provider Selection

**Current (UCM):** LLM provider is configured via UCM pipeline config.

To change provider:
1. Navigate to Admin → Config → Pipeline
2. Update `llmProvider` field (values: `anthropic`, `openai`, `google`)
3. Save and activate

**Deprecated:** The `LLM_PROVIDER` environment variable is no longer used (removed 2026-02-02).
If present in your `.env` file, it will be ignored.

**Migration:** If you previously set `LLM_PROVIDER=openai`, update your pipeline config to
`"llmProvider": "openai"` via the admin UI.
```

**API Keys Section**
- Clarify that API keys remain environment-based (not in UCM)
- Note: "Provider selection is in UCM; API keys stay in environment for security"

---

### 1.5 Update `Docs/ARCHITECTURE/Source_Reliability.md`

**What to Update:**

**Configuration Section**
- Replace any env-based SR config references with UCM references
- Add SR config independence note from the response plan (section 8, MR4)

**Add this section:**
```markdown
### SR Config Independence

While SR config is stored in UCM alongside pipeline/search configs, it maintains
operational independence:

- **Schema versioning:** `sr.v1`, `sr.v2` (independent of `pipeline.v1`)
- **Hot reload:** SR config changes apply to new evaluations only
- **No cascading invalidation:** SR updates don't trigger pipeline/search config reloads
- **Separate domain:** SR uses `getConfig("sr")` and `setSourceReliabilityConfig()`

This separation preserves modularity between orthogonal concerns.
```

**Evaluation Search Section**
- Update references to evaluation search config
- Note that `evalUseSearch`, `evalSearchMaxResultsPerQuery`, etc. are in SR UCM config

---

### 1.6 Update `Docs/DEVELOPMENT/Coding_Guidelines.md`

**What to Update:**

**Configuration Section**
- Add guidance: "Use UCM for all runtime config; avoid hardcoded constants"
- Note: "Do not add new env vars for config; use UCM instead"

**Add this section:**
```markdown
## Configuration Management

**Use UCM for runtime configuration:**
- ✅ Add new config fields to appropriate UCM schema (pipeline, search, calc, SR, lexicons)
- ✅ Update schema version when adding/removing fields
- ✅ Add validation rules in config-schemas.ts
- ❌ Do not add hardcoded config constants
- ❌ Do not use environment variables for business logic config

**Environment variables are only for:**
- API keys and secrets (ANTHROPIC_API_KEY, etc.)
- Deployment settings (PORT, NODE_ENV, etc.)
- Infrastructure config (DATABASE_URL, etc.)

**For new config fields:**
1. Add to appropriate schema in `apps/web/src/lib/config-schemas.ts`
2. Update default file in `apps/web/configs/*.default.json`
3. Increment schema version if breaking change
4. Document in user guides
```

---

## Part 2: Archive Outdated Documentation

### 2.1 Create `Docs/ARCHIVE/REVIEWS/` Directory

Move completed review documents to archive:

**Create directory:**
```
Docs/ARCHIVE/REVIEWS/
```

**Move these files (if they exist):**
- Any files matching `*Review*.md` in `Docs/REVIEWS/`
- Any files matching `*Code_Review*.md`
- Keep: Current planning docs that are still referenced

**Add README:**
Create `Docs/ARCHIVE/REVIEWS/README.md`:
```markdown
# Archived Code Reviews

Historical code reviews and architectural assessments.

**Note:** Information in these archives may reference deprecated practices
(e.g., env-based config, hardcoded constants). Always refer to current
documentation in `Docs/ARCHITECTURE/` and `Docs/USER_GUIDES/`.

## Archive Date
Most reviews archived: 2026-02-02 (Post-UCM implementation)
```

---

### 2.2 Update `Docs/CHANGELOG.md` (or create if missing)

**If file exists:** Add UCM completion entry
**If file doesn't exist:** Create it with this entry

```markdown
# FactHarbor Changelog

## 2026-02-02 - UCM Alpha + Phase 2

### Added
- Unified Config Management (UCM) with file-backed defaults
- Schema versioning for all config types
- Save-to-file functionality (development mode)
- Drift detection endpoint (GET /api/admin/config/:type/drift)
- Health check config validation (GET /api/health includes configValidation)
- Concurrency warnings with updatedBy tracking

### Changed
- LLM provider selection moved from env to UCM pipeline config
- SR evaluation search settings moved to SR UCM config
- PDF parse timeout moved to pipeline UCM config
- Terminology: AnalysisContext is "Context" (not "Scope") throughout

### Deprecated
- `LLM_PROVIDER` environment variable (use UCM pipeline.llmProvider)

### Fixed
- Aggregation-lexicon keywords refined to prevent false evidence classification (Bolsonaro bug)

### Removed
- Hardcoded config constants for pipeline/SR settings (migrated to UCM)
- `LLM_PROVIDER` from `.env.example`
```

---

### 2.3 Clean Up `Docs/BACKLOG.md` or Roadmap Docs

**Remove these completed items:**
- UCM implementation
- Config file-backed defaults
- Schema versioning
- Bidirectional sync
- Drift detection
- Terminology cleanup (Context vs EvidenceScope)

**Move to Beta/Future section (if not already there):**
- Optimistic locking for config updates
- Detailed diff views in admin UI
- Automatic schema migration
- Config audit logging with full history
- Multi-tenant config isolation

---

## Part 3: Verify Cross-References

### 3.1 Search and Replace Deprecated References

**Search for these patterns and update:**

| Old Pattern | New Pattern | Files to Check |
|-------------|-------------|----------------|
| `LLM_PROVIDER` environment variable | UCM `pipeline.llmProvider` | All architecture docs |
| "hardcoded config" | "UCM config" | Architecture, guides |
| "Scope" (when referring to AnalysisContext) | "Context" | All docs |
| "EvidenceScope" incorrectly called "context" | "evidenceScope" | All docs |

**Tools:**
```bash
# Find references to deprecated env var
grep -r "LLM_PROVIDER" Docs/

# Find "Scope" references (may need manual review for AnalysisContext)
grep -r "Scope" Docs/ | grep -v "EvidenceScope" | grep -v "scope"
```

---

### 3.2 Update Cross-References

Ensure these docs properly reference each other:

**From `Docs/ARCHITECTURE/Overview.md`:**
- Link to `USER_GUIDES/Unified_Config_Management.md`
- Link to `USER_GUIDES/LLM_Configuration.md`

**From `Docs/USER_GUIDES/LLM_Configuration.md`:**
- Link to `Unified_Config_Management.md` for general UCM info
- Link to `ARCHITECTURE/Source_Reliability.md` for SR-specific config

**From `Docs/STATUS/Current_Status.md`:**
- Link to `Knowledge_Transfer_UCM_Terminology.md` for implementation details

---

## Part 4: Verification Checklist

Before submitting, verify:

### Documentation Quality
- [ ] All code blocks have proper syntax highlighting (```typescript, ```bash, etc.)
- [ ] All internal links work (no broken references)
- [ ] Markdown tables are properly formatted
- [ ] Consistent terminology throughout (Context, not Scope for AnalysisContext)
- [ ] No references to deprecated `LLM_PROVIDER` env var (except in migration notes)

### Completeness
- [ ] Architecture docs reflect UCM as current system
- [ ] Status docs include 2026-02-02 UCM completion entry
- [ ] User guides updated with UCM instructions
- [ ] Deprecated features clearly marked with alternatives
- [ ] Completed items moved from backlog to changelog/archive

### Accuracy
- [ ] No contradictions between docs
- [ ] Version numbers match (pipeline 2.1.0, others 2.0.0)
- [ ] File paths are correct (`apps/web/configs/`, not `apps/web/config/`)
- [ ] API endpoint paths are correct

---

## Part 5: Output Format

**Provide summary of changes:**

For each doc you update, note:
1. File path
2. Sections added/updated/removed
3. Key changes made
4. Any questions or ambiguities found

**Example:**
```
File: Docs/ARCHITECTURE/Overview.md
- Added: "Unified Config Management (UCM)" section
- Updated: Environment Variables section (marked LLM_PROVIDER as deprecated)
- Added: Configuration File Organization table
- Questions: Should we add a diagram showing UCM flow?
```

---

## Reference Materials

**Implementation History:**
- See [Knowledge_Transfer_UCM_Terminology.md](Docs/Knowledge_Transfer_UCM_Terminology.md) for what was built
- See [UCM_Terminology_Code_Review_Response_Plan.md](Docs/UCM_Terminology_Code_Review_Response_Plan.md) for full plan

**Recent Commits:**
```
9368109 ucm: implement save-to-file functionality (Phase 2)
73d4bfa docs: add Phase 2 save-to-file implementation guide
ec6e464 ucm: add drift detection and health config validation
4e5243d docs: mark UCM alpha implementation complete
fa4fa10 fix: refine aggregation-lexicon keywords
35edcf5 ucm: add basic concurrency warnings for config updates (AC3)
9403932 ucm: implement phase1 must-haves from review plan
```

**Schema Versions:**
- Pipeline: 2.1.0
- Search: 2.0.0
- Calculation: 2.0.0
- SR: 2.0.0
- Evidence Lexicon: 2.0.0
- Aggregation Lexicon: 2.0.0

---

## Success Criteria

Documentation cleanup is complete when:
1. ✅ All architecture docs reflect UCM as the current system
2. ✅ All references to deprecated `LLM_PROVIDER` env var are updated with migration guidance
3. ✅ Status docs include 2026-02-02 UCM completion entry
4. ✅ User guides provide clear UCM usage instructions
5. ✅ Outdated reviews are archived with clear README
6. ✅ Backlog cleaned of completed items
7. ✅ All internal doc links work
8. ✅ Terminology is consistent (Context not Scope for AnalysisContext)

---

**Ready to begin!** Work through Parts 1-5 systematically and provide a summary of all changes made.
