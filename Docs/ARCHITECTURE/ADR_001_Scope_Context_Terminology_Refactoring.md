# ADR 001: Scope/Context Terminology Refactoring with Breaking Changes

**Date**: 2026-01-18  
**Status**: Approved  
**Decision Makers**: Project Lead  
**Architects**: Lead Developer, LLM Expert  

---

## Context

FactHarbor's terminology system evolved organically from "Proceeding" to "AnalysisContext" over multiple iterations, creating a **backward compatibility trap** where:

1. **TypeScript interface names** (`AnalysisContext`) don't match **JSON field names** (`distinctProceedings`)
2. **Code references** use legacy terms (`relatedProceedingId`, `proceedingContext`)
3. **LLM prompts** mix terminology inconsistently across pipeline variants
4. **Database schema** stores JSON with outdated field names

This creates:
- **High cognitive load** for developers (must remember both old and new names)
- **Risk of LLM confusion** (prompts use different terms than schema)
- **Maintainability debt** (every new feature must handle dual terminology)

### Current Pain Points

```typescript
// TypeScript says:
export interface AnalysisContext { ... }

// But JSON stores:
{ "distinctProceedings": [ ... ] }

// And code references:
fact.relatedProceedingId  // Should be: fact.contextId
```

---

## Decision

**APPROVED: Aggressive refactoring with breaking changes**

We will:
1. ✅ Rename JSON fields to match TypeScript types
2. ✅ Update all code references to use consistent terminology
3. ✅ Standardize all LLM prompts with unified glossary
4. ✅ Migrate database records with SQL script
5. ✅ Accept breaking changes to stored data

### Key Changes

| Old Name | New Name | Layer |
|----------|----------|-------|
| `distinctProceedings` | `analysisContexts` | JSON Schema (top-level) |
| `relatedProceedingId` | `contextId` | JSON Schema (fact/claim references) |
| `proceedingId` | `contextId` | JSON Schema (verdicts) |
| `proceedingContext` | `analysisContext` | JSON Schema (understanding object) |
| `ProceedingAnswer` | `ContextAnswer` | TypeScript Types |

---

## Rationale

### Why Breaking Changes Are Acceptable

1. **No Production Data at Risk**: System is pre-production; existing data is for testing only
2. **Database Backup Strategy**: Current database will be backed up and accessible via pre-refactoring branch
3. **One-Time Cost**: Temporary migration pain vs. permanent technical debt
4. **Future Clarity**: New developers won't inherit confusing dual terminology

### Alternatives Considered

**Option A: Soft Migration (Parallel Fields)**
- Write to both old and new fields during transition
- Read from new field, fall back to old
- Deprecate old fields after 3-6 months

**Rejected Because**:
- Adds complexity (dual writes, dual reads, migration tracking)
- Extends confusion period (both terminologies coexist)
- Unnecessary given no production data constraint

**Option B: Documentation Only**
- Keep code as-is, document the discrepancy
- Add comments explaining legacy field names

**Rejected Because**:
- Doesn't solve the problem, just acknowledges it
- LLMs still get confused by mixed terminology
- Technical debt persists indefinitely

---

## Consequences

### Positive

✅ **Single source of truth**: One term per concept across all layers  
✅ **Reduced cognitive load**: Developers learn terminology once  
✅ **LLM clarity**: Prompts match schema exactly  
✅ **Maintainability**: Future features use consistent names  
✅ **Documentation simplicity**: No need to explain legacy names  

### Negative

⚠️ **Migration effort**: ~3 weeks of implementation work  
⚠️ **Historical data incompatibility**: Pre-refactoring jobs won't load in new UI without migration  
⚠️ **API breaking change**: External consumers (if any) must update  

### Mitigation Strategies

| Risk | Mitigation |
|------|-----------|
| Database corruption | Full backup before migration + validation queries |
| Incomplete migration | Automated test suite validates all renamed fields |
| API breaking change | Version API endpoints (v2.7) + document changes |
| Rollback complexity | Keep pre-refactoring branch accessible + rollback SQL script |

---

## Implementation Approach

### Phase 1: Preparation (Week 1)
- **Backup database**: `factharbor-backup-$(date).db`
- **Create migration branch**: `feature/terminology-refactoring-v2.7`
- **Document current schema**: Snapshot before changes

### Phase 2: Code Layer (Week 1-2)
- Rename TypeScript types (deprecate old aliases)
- Update all code references
- Fix Zod schemas
- Update unit tests

### Phase 3: Database Migration (Week 2)
- Write SQL migration script
- Execute on test database
- Validate data integrity
- Run on production database

### Phase 4: Prompt Standardization (Week 2-3)
- Update all base prompts
- Add mandatory glossaries
- Ensure consistency across providers

### Phase 5: Testing & Validation (Week 3)
- Run full regression suite
- Multi-jurisdiction tests
- Performance benchmarks
- API integration tests

### Phase 6: Documentation (Week 3)
- Update README files
- Update API documentation
- Publish release notes (v2.7.0)

---

## Validation Criteria

Before merging:
- [ ] All tests pass (100% pass rate)
- [ ] Database migration succeeds on test DB
- [ ] No terminology inconsistencies remain (automated check)
- [ ] API responses match new schema
- [ ] Documentation updated
- [ ] Lead Architect sign-off

---

## References

- [Scope_Context_Terminology_Architecture_Analysis.md](../DEVELOPMENT/Scope_Context_Terminology_Architecture_Analysis.md) - Full audit
- [TERMINOLOGY.md](../REFERENCE/TERMINOLOGY.md) - Glossary reference
- [Database_Schema_Migration_v2.7.md](../ARCHITECTURE/Database_Schema_Migration_v2.7.md) - Migration script

---

## Notes

**Database Backup Confirmation**: User confirmed database backup strategy acceptable (2026-01-18).

**Timeline Confidence**: 3-week estimate assumes full-time focus. May extend to 4 weeks if interrupted.

**Rollback Plan**: If critical bugs discovered post-deployment, revert to pre-refactoring branch and restore backup database.

---

**Approved By**: Project Lead  
**Date**: 2026-01-18  
**Next Review**: Post-implementation (v2.7.0 release)
