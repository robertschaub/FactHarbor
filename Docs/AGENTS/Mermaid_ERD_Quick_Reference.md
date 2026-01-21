# Mermaid ERD Quick Reference Card

**Version:** 1.0  
**Date:** 2026-01-21  
**Applies to:** Mermaid v11.12.2+

---

## ❌ COMMON ERROR: Spaces in Property Definitions

### The Problem

Mermaid v11.12.2+ does **NOT** allow spaces between property names and their descriptors/constraints in ERD diagrams.

**Error Message:** "Syntax error in text"

---

## ✅ THE RULE

**Pattern:** `TYPE propertyName_descriptor_or_constraint`

**Use underscores to connect ALL parts of a property definition.**

---

## 📋 Examples

### ❌ WRONG (Will Cause Errors)

```mermaid
erDiagram
    VERDICT {
        string label
        number score 0_to_100          ← SPACE HERE (ERROR!)
        number confidence 0_to_100     ← SPACE HERE (ERROR!)
        string reasoning
    }
    
    CLAIM {
        string id PK                    ← SPACE HERE (ERROR!)
        string articleId FK             ← SPACE HERE (ERROR!)
        string text
    }
```

### ✅ CORRECT (Will Render)

```mermaid
erDiagram
    VERDICT {
        string label
        number score_0_to_100           ← UNDERSCORE (CORRECT!)
        number confidence_0_to_100      ← UNDERSCORE (CORRECT!)
        string reasoning
    }
    
    CLAIM {
        string id_PK                    ← UNDERSCORE (CORRECT!)
        string articleId_FK             ← UNDERSCORE (CORRECT!)
        string text
    }
```

---

## 🔍 Common Patterns to Fix

| Wrong ❌ | Correct ✅ | Description |
|---------|-----------|-------------|
| `string id PK` | `string id_PK` | Primary key marker |
| `string userId FK` | `string userId_FK` | Foreign key marker |
| `number score 0_to_100` | `number score_0_to_100` | Range constraint |
| `int value min_0_max_100` | `int value_min_0_max_100` | Min/max constraint |
| `string status ENUM` | `string status_ENUM` | Enum type indicator |
| `datetime created_at UTC` | `datetime created_at_UTC` | Timezone indicator |

---

## 🛠️ Validation Process

### Before Creating/Exporting XAR:

1. **Find ERD diagrams:**
   ```powershell
   Select-String -Path *.xml -Pattern "erDiagram"
   ```

2. **Check for spaces in properties:**
   - Look between `ENTITY_NAME {` and `}`
   - Each property line should match: `TYPE name_descriptor`
   - No spaces between name and descriptor

3. **Fix pattern:**
   ```powershell
   # Replace space with underscore in property definitions
   $content -replace '(TYPE)\s+(name)\s+(descriptor)', '$1 $2_$3'
   ```

### After Fixing:

1. Extract one problematic diagram
2. Verify it renders without "Syntax error"
3. Then create full XAR

---

## 📚 References

- **GlobalMasterKnowledge v0.7:** DOC-R-029
- **Mermaid Documentation:** https://mermaid.js.org/syntax/entityRelationshipDiagram.html
- **Issue Fixed:** 2026-01-21 (6 XAR files, FactHarbor Specification)

---

## 💡 Pro Tips

1. **Use consistent pattern:** Always use `propertyName_descriptor` format
2. **Multi-word descriptors:** Use underscores for all spaces: `very_long_descriptor`
3. **Test early:** Create small test diagram before bulk changes
4. **Line-by-line:** Parse XML line-by-line, don't use greedy regex
5. **Preserve structure:** Only change the space→underscore, leave everything else intact

---

**Remember:** When in doubt, replace ALL spaces in property definitions with underscores!
