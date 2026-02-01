# Visual Guide: AnalysisContext vs EvidenceScope

## The Key Distinction

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER INPUT                                 │
│  "Is electric vehicle A more efficient than vehicle B?"             │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ANALYSIS CONTEXTS (Top-Level)                    │
│                                                                      │
│  ┌────────────────────────────┐  ┌────────────────────────────┐    │
│  │  Context 1: WTW Analysis   │  │  Context 2: TTW Analysis   │    │
│  │  (Well-to-Wheel)           │  │  (Tank-to-Wheel)           │    │
│  │                            │  │                            │    │
│  │  ✓ Gets own verdict: 85%  │  │  ✓ Gets own verdict: 72%  │    │
│  │  ✓ Shown as separate card │  │  ✓ Shown as separate card │    │
│  │  ✓ Answers different Q    │  │  ✓ Answers different Q    │    │
│  └────────────────────────────┘  └────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                             │
                             │ contains
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      EVIDENCE ITEMS                                 │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Evidence #1: "Vehicle A achieves 95 mpge"                   │   │
│  │                                                              │   │
│  │ contextId: "CTX_WTW" ◄─ Assigned to Context 1              │   │
│  │                                                              │   │
│  │ evidenceScope: {                                            │   │
│  │   ├─ methodology: "ISO 14040"    ◄─ How SOURCE measured it │   │
│  │   ├─ boundaries: "Primary energy to wheel"                 │   │
│  │   ├─ geographic: "EU"                                       │   │
│  │   └─ temporal: "2023"                                       │   │
│  │ }                                                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Evidence #2: "Vehicle B efficiency is 88 mpge"              │   │
│  │                                                              │   │
│  │ contextId: "CTX_TTW" ◄─ Assigned to Context 2              │   │
│  │                                                              │   │
│  │ evidenceScope: {                                            │   │
│  │   ├─ methodology: "SAE J2841"    ◄─ How SOURCE measured it │   │
│  │   ├─ boundaries: "Fuel tank to wheel motion"               │   │
│  │   ├─ geographic: "US"                                       │   │
│  │   └─ temporal: "2024"                                       │   │
│  │ }                                                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Assignment Flow

```
factContextAssignments: [
  { factId: "E1", contextId: "CTX_WTW" },  ◄─ Maps evidence to top-level context
  { factId: "E2", contextId: "CTX_TTW" }   ◄─ Maps evidence to top-level context
]

Each evidence item also has:
  evidenceScope: { ... }  ◄─ Per-item metadata about source methodology
```

## Terminology Table

| Term | Level | Purpose | Quantity | Gets Verdict? |
|------|-------|---------|----------|---------------|
| **AnalysisContext** | Top | Separate analytical frame | Few (1-5) | ✓ YES |
| **EvidenceScope** | Item | Source methodology metadata | Many (1 per item) | ✗ NO |
| **factContextAssignments** | - | Maps evidence → context | N mappings | - |
| **evidenceScope** | - | Attached to each evidence | Per item | - |

## Real-World Analogy

Think of it like a restaurant menu:

```
┌─────────────────────────────────────────┐
│  MENU (AnalysisContexts)               │  ◄─ Top-level organization
│                                         │
│  ├─ Appetizers  ◄─ Context 1          │
│  ├─ Entrees     ◄─ Context 2          │
│  └─ Desserts    ◄─ Context 3          │
└─────────────────────────────────────────┘
         │
         └─ contains dishes
                │
                ▼
┌─────────────────────────────────────────┐
│  DISHES (Evidence Items)               │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │ Caesar Salad                     │  │
│  │ contextId: "Appetizers"          │  │  ◄─ Which section
│  │                                  │  │
│  │ evidenceScope: {                │  │  ◄─ Recipe details
│  │   ingredients: "Romaine, ..."   │  │
│  │   prepMethod: "Tossed"          │  │
│  │   servingSize: "1 bowl"         │  │
│  │ }                                │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

- **AnalysisContext (Menu sections)**: Top-level organization, customers see these
- **EvidenceScope (Recipe details)**: Per-dish metadata, kitchen uses these
- **factContextAssignments**: Maps each dish to its section
- **evidenceScope**: Recipe details attached to each dish

## Wrong vs Right

### ❌ WRONG (Confusing)

```typescript
// Using "scope" for contexts
const scopes = understanding.analysisContexts;  // NO!
const assignment = { factId: "E1", scopeId: "CTX_1" };  // NO!
```

### ✅ RIGHT (Clear)

```typescript
// Using "context" for contexts
const contexts = understanding.analysisContexts;  // YES!
const assignment = { factId: "E1", contextId: "CTX_1" };  // YES!

// Using "evidenceScope" for per-item metadata
const scope = evidence.evidenceScope;  // YES!
```

## Quick Reference Card

```
┌──────────────────────────────────────────────────────────────┐
│  QUICK REFERENCE: When to Use What                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Need to split analysis into separate verdicts?             │
│  → Create multiple AnalysisContexts                          │
│                                                              │
│  Need to document how a source measured its data?           │
│  → Add EvidenceScope to evidence item                        │
│                                                              │
│  Need to assign evidence to an analytical frame?            │
│  → Use factContextAssignments                                │
│                                                              │
│  Referring to top-level frames in code?                     │
│  → Use "context" or "analysisContext" (NOT "scope")         │
│                                                              │
│  Referring to per-item source metadata?                     │
│  → Use "evidenceScope" (fully qualified)                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Anti-Patterns to Avoid

### 🚫 Anti-Pattern #1: Calling contexts "scopes"

```typescript
// BAD
const scopes = analysis.analysisContexts;
for (const scope of scopes) {
  renderScopeCard(scope);  // Confusing!
}

// GOOD
const contexts = analysis.analysisContexts;
for (const context of contexts) {
  renderContextCard(context);  // Clear!
}
```

### 🚫 Anti-Pattern #2: Using bare "scope" or "context"

```typescript
// BAD - Ambiguous
function assignToScope(factId, scopeId) { ... }  // Which kind of scope?

// GOOD - Explicit
function assignToContext(factId, contextId) { ... }  // Clear!
function getEvidenceScope(fact) { ... }  // Fully qualified!
```

### 🚫 Anti-Pattern #3: Confusing assignment directions

```typescript
// BAD - Wrong terminology
factScopeAssignments  // NO! Assigns to contexts, not scopes

// GOOD - Correct terminology
factContextAssignments  // YES! Clear what it assigns to
```

---

**Remember**: 
- **AnalysisContext** = Where does this analysis happen? (top-level)
- **EvidenceScope** = How did the source measure this? (per-item metadata)

**Never** use "scope" when you mean "context"!
