---
title: "Global MasterKnowledge for FactHarbor xWiki Work – Core Rules & Document Handling"
version: 0.7
status: draft
owner: "Robert Schaub"
primary_systems:
  - XWiki
  - Other long-term master systems as defined per project
core_protocols:
  - FMCP
  - TCP
  - Global Text Rules v1.1
  - Global Diagram Rules v1.2
core_keywords:
  - AddYourKnowledgeOnly
  - MergeIntoYourKnowledge
subjects:
  - id: DOC_HANDLING
    title: "Subject: Document & Snapshot Handling (XWiki)"
    status: embedded
    spec_location: "Section 5 of this document"
  - id: TASKS_PROJECTS
    title: "Subject: Tasks & Project Handling"
    status: "embedded – full rules"
  - id: MULTI_CHAT
    title: "Subject: Multi-Chat & FMCP Behaviour"
    status: "partial (see Section 8)"
changelog:
- version: 0.7
  date: "2026-01-21"
  changes:
    - "Added DOC-R-029: Mermaid ERD Property Names (CRITICAL) - no spaces allowed in property definitions (Mermaid v11.12.2+)."
    - "Added DOC-R-030: XAR File Structure and Handling - comprehensive guide to XAR extraction, modification, and recompression."
    - "Added DOC-R-031: Systematic XAR Validation and Fixing - process for validating and fixing Mermaid diagrams in XARs."
    - "Added DOC-R-032: Version Control for XAR Files - naming conventions, delta vs full XAR strategy, documentation requirements."
    - "Updated Global Diagram Rules to v1.2 (added XAR handling and Mermaid syntax validation)."
- version: 0.6
  date: "2026-01-20"
  changes:
    - "Added DOC-R-028: Mermaid Diagrams in xWiki (preferred for new diagrams, empty line requirements)."
    - "Added GLOBAL-R-034: Cursor xar-to-xar workflow."
    - "Added GLOBAL-R-035: Cursor export versioning (auto-increment patch)."
    - "Added GLOBAL-R-036: Cursor workflow exceptions (no generator script, no handshake required)."
    - "Added GLOBAL-R-037: Import standard Markdown to xWiki corpus (with Mermaid conversion)."
    - "Added GLOBAL-R-038: Export xWiki page to standard Markdown (with Mermaid conversion)."
    - "Added GLOBAL-R-039: Display xWiki pages as rendered Markdown (WYSIWYG)."
    - "Removed version suffix from filename (Git tracks versions now)."
- version: 0.5
  date: "2025-12-22"
  changes:
    - "Added GLOBAL-R-033: Version increment on export (automatic version progression)."
    - "Added DOC-R-024: Single source of truth for priority/importance (no duplication in requirement definitions)."
    - "Added DOC-R-025: No timing commitments in specifications (use phases only)."
    - "Added DOC-R-026: Requirements page content scope (clear separation of concerns)."
    - "Added DOC-R-027: Requirements Priority Matrix structure (Importance formulas and format)."
- version: 0.5
  date: "2025-12-12"
  changes:
    - "Restored full text for Section 6 (Tasks) and Section 8 (FMCP) which were accidentally summarized in v0.4j."
- version: 0.4j
  date: "2025-12-12"
  changes:
    - "Added DOC-R-023: PlantUML support rules."
    - "Refined DOC-R-022: Allowed text-based ERDs (Mermaid/PlantUML) if visualization is clear."
- version: 0.4i
  date: "2025-12-11"
  changes:
    - "Merged Section 8 (FMCP/System Operation) and Section 6.1 (Tasks) from v0.4g."
    - "Added GLOBAL-R-013 (Self-Correction) and GLOBAL-R-014 (Output Integrity)."
---

# Global MasterKnowledge for FactHarbor xWiki Work – Core Rules & Document Handling

> **For the human (how to use this file)**
> - Store this file in XWiki and as a Markdown file in the Git repo (`Docs/AGENTS/GlobalMasterKnowledge_for_xWiki.md`).
> - **Mandatory Start:** When you start a chat, upload this file immediately (or reference it in Cursor).
> - **Activation:** Type `MergeIntoYourKnowledge` to force the chat to acknowledge and adopt these rules.
> - **Enforcement:** If a chat ignores a rule, reply with: *"Rule Violation: Read GLOBAL-R-[Number]"*.

## 1. Purpose & Scope

1.1 **Goal**
- Provide a single global MasterKnowledge document that acts as the **configuration file** for the AI chat session.
- Define **hard constraints** on how the chat generates, formats, and handles data.

1.2 **Scope**
This document overrides any default AI behaviors regarding formatting, file generation, and organizational assumptions.

1.3 **Two-layer model**
- **Hard rules (This Document):** These are non-negotiable. If this document says "Output XML," the chat must output XML, not a summary of XML.
- **Soft defaults:** General helpfulness, politeness, standard coding abilities.

---

## 2. Global Core Rules (All Subjects)

**GLOBAL-R-001 – Long-term masters, not chats**
- Long-term, canonical content lives in master systems (e.g., XWiki), not in chat memory.
- Chats are **transient processors**.

**GLOBAL-R-002 – Stateless chats**
- Assume the chat memory will be wiped after every session.
- **Critical Knowledge Must Be Exported:** Anything not saved to a file or XWiki is considered lost.

**GLOBAL-R-003 – Non-destructive by default**
- Before large restructurings, the chat must offer or create a snapshot/export.

**GLOBAL-R-004 – Human-readable first**
- All exports must be understandable by a human (JSON is fine, binary blobs are not, unless accompanied by a manifest).

**GLOBAL-R-005 – One master per subject**
- Do not invent new rules if a MasterKnowledge document for that subject exists.

**GLOBAL-R-006 – No silent behaviour changes**
- Do not change file formats, naming conventions, or structural logic without explicit user instruction.

**GLOBAL-R-007 – Retiring / historical chats remain stable**
- If a chat is marked "Retiring" or "Historical," do not propose new features. Only export data.

**GLOBAL-R-008 – Prefer generic, reusable rules**
- Write rules that apply to the whole organization, not just the specific document you are editing.

**GLOBAL-R-009 – FactHarbor organisational wording**
- Use **"Lead"** (not Director).
- Use **"Governing Team"** (not Board).
- Describe as **"small organisation"** (not one-person NPO, unless historical).

**GLOBAL-R-010 – Current corpus = latest confirmed changes**
- When asked to "Export" or "Snapshot," include the **latest state** of the conversation, not the state from 5 turns ago.

**GLOBAL-R-011 – Preserve and enhance human readability**
- Do not summarize code or text into "..." unless explicitly asked.
- Do not degrade rich text into bullet points if the original was narrative.

**GLOBAL-R-012 – Topic / subject selection**
- Respect `OnlyTopics:` and `IgnoreTopics:` directives to limit scope.

**GLOBAL-R-013 – Mandatory Self-Correction (Enforcement)**
- Before outputting a file or structure, the chat must internally check: "Does this comply with the MasterKnowledge rules I read?"
- Specifically check: **Format rules** (XML vs JSON), **Naming conventions**, and **Completeness**.

**GLOBAL-R-014 – Output Integrity**
- When asked for a file or code block, provide the **full, functional content**.
- **Never** use placeholders like `// ... rest of code ...` inside a JSON or XML file intended for export/import, as this breaks the file.

**GLOBAL-R-015 – Delta-only outputs (default)**
- Unless you explicitly request a full output, the chat must only return **deltas**:
  - In normal messages: only changed pages/diagrams (and only the changed parts if feasible without breaking format requirements).
  - On exports: the output JSON (or generator script) must contain **only changed nodes** since the last export baseline.
- Exception: If you explicitly request “full export” / “full snapshot” / “print full page”, then full is allowed.

**GLOBAL-R-016 – Non-Lossy Editing Contract (mandatory)**
- Do not summarize, shorten, merge, or remove content unless you explicitly request it.
- Any deletion must be:
  1) explicitly requested by you, and
  2) reported in a **Deletions List** with the reason.
- If uncertain, prefer **adding clarifying text** over rewriting existing text.
- Target length per edited page: **not shorter than 98%** of the original unless you explicitly request reduction.

**GLOBAL-R-017 – No changes without explicit request**
- Do not change any page or diagram unless you explicitly requested the change (page/diagram-specific, or via an explicit batch instruction).
- If the scope is unclear, ask for confirmation before applying edits.
- Batch instructions (e.g., “apply X change across pages Y”) count as explicit requests **only if the scope and intent are unambiguous**.
  - If there is any reasonable risk of misinterpretation (scope, meaning, side effects, deletions, or format breakage), the chat must **ask the user to confirm** before applying changes.

**GLOBAL-R-018 – Fulltree JSON must be returned via generator script (no raw JSON)**
- When returning a “fulltree” JSON snapshot, do **not** paste raw JSON into chat.
- Instead, return a **Python generator script** that writes the JSON file to disk (utf-8, json library).
- The script must store page/diagram bodies in clearly separated multi-line string constants, and then assemble the JSON structure.

**GLOBAL-R-019 – Copyable outputs must be in a collapsible copy box**
- Any output intended to be copied by the user must be provided inside a **collapsible** block with **one-click copy** (e.g., a fenced code block inside a collapsible section).
- Only the copyable data goes inside the box (no titles/instructions inside).

**GLOBAL-R-020 – Delta baseline requirement (practicality rule)**
- “Delta since last export” requires a known baseline.
- If the baseline is not reliably available in the current session, the chat must:
  - ask for the baseline label/file, OR
  - default to a clearly labeled “delta since provided baseline <X>”, OR
  - (if you explicitly allow) fall back to “full export”.

**GLOBAL-R-021 – “Show” is always read-only**
- Commands like “show page X” / “show diagram Y” / “display X” must never trigger changes.
- No behind-the-scenes “improvements”, rewrites, formatting changes, or corrections. Ever.
- If the assistant wants to suggest an improvement, it must be presented as a **proposal** and must not be applied until confirmed by the user.

**GLOBAL-R-022 – “Show / Export / Snapshot” must reflect the current working state**
- When showing a page/diagram or creating an export/snapshot, the assistant must use the **current working version**:
  - If no edits have been applied yet: use the baseline from the uploaded corpus.
  - If edits have been applied: use the baseline **plus the applied deltas** (the modified objects).
- The assistant must clearly indicate whether the output/export is **baseline** or **modified** (working version).
- For traceability, include a minimal fingerprint (e.g., SHA-256 prefix) and the node identifiers when practical.

**GLOBAL-R-023 – When changes are allowed**
- The assistant may change pages/diagrams only if:
  1) the user explicitly requests the change, or
  2) the user confirms a previously proposed change.
- If there is any reasonable risk of misinterpretation (scope, meaning, side effects, deletions, or format breakage), the assistant must ask for confirmation before applying changes.

**GLOBAL-R-024 – Non-Lossy Editing scope**
- The ≥98% non-lossy constraint applies by default to requests like “cleanup”, “reformat”, “improve wording”, “make it clearer”, etc.
- It does not override a specific, explicit change the user requests/confirms (e.g., shorter, replaced, moved to a different page, etc.).
- Deletions still require explicit user intent and must be reported in a deletions list with reason if requested/required by the ruleset.


**GLOBAL-R-030 – Structural integrity guardrails (XWiki fulltree)**
- Unless explicitly requested/confirmed, do **not** change:
  - `id`, `pageId`, `parentId`, `type`, `syntax`, node hierarchy, or space/page placement.
- Preserve XWiki `xwiki/2.1` markup and macro syntax exactly.
- Preserve diagram content formats exactly (e.g., draw.io mxGraphModel XML; Mermaid macro wrappers).
- Preserve diagram attachment / xobject structures when present.

**GLOBAL-R-031 – Export / Snapshot generator script requirements**
- For fulltree JSON exports/snapshots, return a **Python generator script** (no raw JSON in chat) per GLOBAL-R-018.
- The generator script must:
  - store page/diagram bodies in multi-line string constants (data separated from logic),
  - assemble the JSON structure matching the fulltree schema used by the user’s pipeline,
  - write using `encoding="utf-8"` and `json.dump(..., ensure_ascii=False, indent=2)`.



**GLOBAL-R-032 – Rule-conformance checkpoints (mandatory)**
- For any non-trivial work, the assistant must add brief checkpoints at moments where rule violations are likely.
- At minimum, perform a checkpoint before each of these actions:
  1) Showing page/diagram content (“Show”): confirm read-only behavior and that shown content is the current working version.
  2) Applying any change: confirm explicit request/confirmation is present and scope is unambiguous; otherwise ask.
  3) Any operation that could reduce or merge content: confirm whether Non-Lossy constraints apply and avoid reductions unless requested.
  4) Any structural risk (ids, hierarchy, syntax/type, xobjects/attachments): confirm structural integrity guardrails are met.
  5) Export/Snapshot: confirm delta baseline availability, delta-only default, generator-script output, and no raw JSON in chat.
- Checkpoints must be short (1–3 lines) and must stop the action if a requirement is not satisfied.

**GLOBAL-R-033 – Version increment on export**
- Each export must increment the minor version number automatically.
- Pattern: 0.9.70 → 0.9.71 → 0.9.72 → 0.9.73
- Version must be clearly stated in export metadata (snapshotVersion, snapshotLabel).
- Version tracking ensures clear progression and no confusion about which export is newest.

### Cursor IDE Workflow Rules

**GLOBAL-R-034 – Cursor xar-to-xar workflow**
- User provides .xar file in `Docs/` folder.
- Agent extracts to JSON internally using conversion scripts.
- Agent edits JSON content directly.
- On "Export" command, agent rebuilds .xar in same folder with version suffix.

**GLOBAL-R-035 – Cursor export versioning**
- Each export increments patch number: 0.9.70 → 0.9.71 → 0.9.72.
- Exception: "Export delta" followed by "Export full" with NO edits between = same version.
- Output filename format: `<original_basename>_v<version>.xar`.

**GLOBAL-R-036 – Cursor workflow exceptions**
- GLOBAL-R-018 (generator script) does not apply in Cursor – use direct file writes.
- GLOBAL-R-019 (collapsible copy box) does not apply – Cursor has different UI.
- 5-step handshake from InitializeFHchat is optional in Cursor (files available immediately).

### Markdown Conversion Commands

**GLOBAL-R-037 – Import standard Markdown to xWiki corpus**
- Command: `"Import MD <filepath> as page <pageId>"` or `"Import MD <filepath> replacing page <pageId>"`
- Converts standard Markdown (.md) to xWiki 2.1 markup and adds/replaces page in corpus.
- Conversion rules:
  - Headings: `# H1` → `= H1 =`, `## H2` → `== H2 ==`, etc.
  - Italic: `*text*` or `_text_` → `//text//`
  - Bold: `**text**` → `**text**` (same)
  - Code inline: `` `code` `` → `##code##`
  - Code blocks: ` ```lang ` → `{{code language="lang"}}`, ` ``` ` → `{{/code}}`
  - Links: `[text](url)` → `[[url||text]]`
  - Images: `![alt](url)` → `[[image:url||alt="alt"]]`
  - **Mermaid diagrams:** ` ```mermaid ` → empty line + `{{mermaid}}` + empty line; closing ` ``` ` → empty line + `{{/mermaid}}` + empty line
- After import, page is part of working corpus and included in next export.

**GLOBAL-R-038 – Export xWiki page to standard Markdown**
- Command: `"Export page <pageId> as MD"` or `"Export page <pageId> to <filepath>.md"`
- Converts xWiki 2.1 markup to standard Markdown and saves as .md file.
- Conversion rules (reverse of GLOBAL-R-037):
  - Headings: `= H1 =` → `# H1`, `== H2 ==` → `## H2`, etc.
  - Italic: `//text//` → `*text*`
  - Bold: `**text**` → `**text**` (same)
  - Code inline: `##code##` → `` `code` ``
  - Code blocks: `{{code language="lang"}}` → ` ```lang `, `{{/code}}` → ` ``` `
  - Links: `[[url||text]]` → `[text](url)`
  - Images: `[[image:url||alt="alt"]]` → `![alt](url)`
  - **Mermaid diagrams:** `{{mermaid}}` → ` ```mermaid `, `{{/mermaid}}` → ` ``` ` (remove extra empty lines)
- Output file is standard Markdown, readable in GitHub/VS Code/etc.

**GLOBAL-R-039 – Display xWiki pages as rendered Markdown (WYSIWYG)**
- When showing a page via `"Show page <pageId>"`, convert xWiki 2.1 to standard Markdown for display.
- This makes pages readable in chat (headings render, Mermaid diagrams display, etc.).
- Internal storage remains xWiki 2.1 (unchanged) – only the **display** is converted.
- To see raw xWiki markup, use: `"Show raw page <pageId>"`.

**GLOBAL-P-001 – FactHarbor chat initialization handshake (mandatory)**
Before doing any work after the user attached files, the assistant must:
1) Confirm it loaded:
   - the newest `<GLOBAL_MASTERKNOWLEDGE>` version provided
   - the `<FULLTREE_JSON_BASELINE>` file (exact filename)
2) State the **delta baseline** policy for this session (what counts as “since last export”); if none exists, say so.
3) Confirm it will:
   - not change anything without explicit request/confirmation (GLOBAL-R-023),
   - ask when there is risk of misinterpretation,
   - export via generator script, delta-only by default (GLOBAL-R-015, GLOBAL-R-018).
4) Then wait for the user’s next instruction.

**GLOBAL-G-001 – Recommended user request phrases (non-binding)**
- “Show page `<NODE_ID>`”
- “Propose improvements to page `<NODE_ID>` (no changes yet)”
- “Apply proposal A to page `<NODE_ID>`”
- “Apply these changes to pages: …”
- “Export (delta)” / “Export full”

---

## 3. Topic / Subject Selection (Optional Filter)

(See GLOBAL-R-012)
- `OnlyTopics: DOC_HANDLING` -> Ignored other sections.
- `IgnoreTopics: MULTI_CHAT` -> Skips multi-chat rules.

---

## 4. Keyword Commands

### 4.1 `AddYourKnowledgeOnly`
- **Action:** Read the file, compare with current chat context, propose **additions** to the document text.
- **Effect:** Does **not** change chat behavior, only improves documentation.

### 4.2 `MergeIntoYourKnowledge`
- **Action:** Read the file, compare with current chat behavior, **adopt** these rules as the operating constraints for this session.
- **Effect:** **Changes chat behavior** to match the document.

---

## 5. Subject: Document & Snapshot Handling (XWiki) – Embedded Spec

**SUBJECT ID:** `DOC_HANDLING`

### 5.1 - 5.6 (General DOC Rules)
- **DOC-R-001:** XWiki is Master.
- **DOC-R-002:** Stateless Snapshots.
- **DOC-R-005:** JSON fulltree is the default exchange format.
- **DOC-R-008:** Snapshot = Export of artifacts (Files).
- **COMMAND-D-S-004 (`export`):** Create full current snapshot.
- **COMMAND-D-S-005 (`export delta`):** Create differential snapshot since baseline.

### 5.7 Diagrams & Diagram Wrappers

**DOC-R-014 – Draw.io Diagrams (mxGraphModel Strict)**
- **Standard:** Use Draw.io (xml) when complex visual layout or specific notation is required.
- **Syntax:** XWiki syntax must be `plain/1.0`.
- **Content:** The content body must contain **ONLY** the `<mxGraphModel>...</mxGraphModel>` XML. No titles, no `{{drawio}}` macros, no newlines before/after.
- **XObject:** The page node in the JSON/XML **must** include an XObject of type `Diagram.DiagramClass` so XWiki renders it automatically.

**DOC-R-015 – ASCII diagrams**
- Only for small sketches or conversation. Not for specs.

**DOC-R-016 – Wrapper pages**
- Diagrams live in `...Diagrams.<Name>.WebHome`.
- Other pages include them via `{{include reference="..."/}}`.

**DOC-R-017 – No duplicate diagram names**
- Do not create `Architecture` and `Architecture 1` in the same space. Use explicit versioning like `Architecture_v2` if needed.

**DOC-R-018 – Optional diagrams index**
- A `Diagrams.WebHome` page should list children or include them for navigation.

**DOC-R-022 – Entity Relationship Diagrams (ERDs)**
- **Preferred:** Visual Draw.io diagrams with clear cardinalities (Crow's Foot).
- **Allowed:** Mermaid `erDiagram` or PlantUML `class` diagrams if they clearly communicate the structure and are textually maintained.

**DOC-R-023 – PlantUML Diagrams**
- **Syntax:** XWiki syntax must be `xwiki/2.1` (or `2.0`).
- **Macro:** Wrap content in `{{plantuml}}...{{/plantuml}}`.
- **Use Case:** Complex UML Class diagrams, sequence diagrams where text-maintenance is prioritized over visual drag-and-drop.

**DOC-R-028 – Mermaid Diagrams in xWiki**
- **Preferred** for new diagrams (text-based, version-control friendly).
- **Syntax:** Use `{{mermaid}}...{{/mermaid}}` macro wrapper.
- **Critical:** MUST have empty line BEFORE `{{mermaid}}` and AFTER `{{/mermaid}}`.
- Do NOT use `{{code language="mermaid"}}` (doesn't work in current xWiki setup).
- Node IDs: no spaces (use camelCase or underscores).
- Special characters in labels: wrap in quotes `A["Step 1: Init"]`.
- Edge labels with special chars: use quotes `A -->|"O(1)"|B`.

**DOC-R-029 – Mermaid ERD Property Names (CRITICAL)**
- **Problem:** Mermaid v11.12.2+ does NOT allow spaces in ERD property definitions.
- **Rule:** Property names and their descriptors MUST be connected with underscores, NO SPACES.
- **Examples:**
  - ❌ WRONG: `number score 0_to_100` (space before descriptor)
  - ✅ CORRECT: `number score_0_to_100` (underscore connects all parts)
  - ❌ WRONG: `string id PK` (space before constraint)
  - ✅ CORRECT: `string id_PK` (underscore connects)
  - ❌ WRONG: `string articleId FK` (space before foreign key marker)
  - ✅ CORRECT: `string articleId_FK` (underscore connects)
- **Pattern:** `TYPE propertyName_descriptor_or_constraint`
- **Validation:** Before creating/editing ERD diagrams, verify NO spaces exist between property name and any descriptor/constraint.
- **Error Symptom:** If Mermaid shows "Syntax error in text" on ERD diagrams, check for spaces in property definitions.

**DOC-R-030 – XAR File Structure and Handling**
- **Format:** XAR files are ZIP archives containing XML files representing XWiki pages.
- **Structure:**
  - Root level: `package.xml` (metadata about pages in the archive)
  - Pages: `SpaceName/PageName/WebHome.xml` (one XML file per page)
  - Preserves: page hierarchy, metadata, attachments, objects
- **Extraction:** Use standard ZIP tools (Expand-Archive in PowerShell, unzip in bash).
- **Modification Workflow:**
  1. Extract XAR to temporary directory
  2. Modify XML files (preserve XML structure and namespaces)
  3. Recompress modified files to new XAR
  4. Version the output filename: `<basename>_Fixed.xar` or `<basename>_v<version>.xar`
- **Delta XARs:** Can create minimal XARs with only changed pages + package.xml for targeted updates.
- **Critical:** Preserve XML structure exactly - XWiki is sensitive to malformed XML.

**DOC-R-031 – Systematic XAR Validation and Fixing**
- **When to validate:** Before creating any XAR file for XWiki import.
- **Mermaid-specific checks:**
  1. Find all files with `erDiagram` content
  2. Check entity definitions (between `ENTITY_NAME {` and `}`)
  3. Verify property lines match pattern: `TYPE propertyName_descriptor` (underscores, no spaces)
  4. Fix any spaces between property parts with underscores
- **Process:**
  - Extract XAR → Parse XML line-by-line → Detect Mermaid sections → Apply fixes → Recompress
  - Use state machine: track `inErDiagram`, `inEntity` flags to target fixes precisely
  - Preserve all other content exactly (don't use greedy regex that might break XML)
- **Testing:** After fixing, verify at least one problematic diagram in sample output before creating full XAR.

**DOC-R-032 – Version Control for XAR Files**
- **Naming Convention:** Include date and version in XAR filename for traceability.
  - Pattern: `<ProjectName>_<ContentType>_<Date>.xar`
  - Example: `FactHarbor_Spec_and_Impl_21.Jan.26.xar`
  - Fixed version: `FactHarbor_Spec_and_Impl_21.Jan.26_Fixed.xar`
- **Delta vs Full:**
  - Delta XAR: Only changed pages, smaller file (~20KB), quick import
  - Full XAR: All pages, complete snapshot (~340KB), definitive version
- **Workflow:** Create delta first for user verification, then create full after confirmation.
- **Documentation:** Always create a summary document listing what changed and why.

**DOC-R-024 – Single source of truth for priority/importance**
- Priority/Importance/Urgency values must appear ONLY in the Requirements Priority Matrix table.
- Requirement definitions in the main Requirements page must NOT contain priority mentions.
- Exception: Milestone mentions are allowed (they indicate phase, not priority).
- Rationale: Eliminates duplication and ensures consistent priority values across documentation.

**DOC-R-025 – No timing commitments in specifications**
- Remove all absolute timing commitments from specifications:
  * Specific durations (Months 1-3, 2 weeks, 6 months)
  * Specific dates or date patterns
  * Tracking frequencies (weekly, monthly, quarterly, daily) when referring to project activities
- Use only phase references: POC1, POC2, Beta 0, V1.0, V1.1, etc.
- Exception: Normal language use (e.g., "daily meals") is acceptable.
- Rationale: Specifications should be timeline-independent; timing belongs in project plans.

**DOC-R-026 – Requirements page content scope**
- Requirements page should contain:
  * Roles and permissions
  * Functional Requirements (FR) specifications
  * Non-Functional Requirements (NFR) specifications
  * User Needs references
- Requirements page should NOT contain:
  * MVP Scope / Development phases (belongs in Implementation Roadmap)
  * Success Metrics / Quality metrics (belongs in Implementation Roadmap)
  * Implementation strategy (belongs in Implementation Roadmap)
- Rationale: Clear separation between "what" (requirements) and "how/when" (roadmap).

**DOC-R-027 – Requirements Priority Matrix structure**
- Use "Importance" not "Priority" as the column name.
- Include prioritization formulas at the top:
  * Importance = f(risk, impact, strategy)
  * Urgency = f(fail fast and learn, legal, promises made)
- Table must include columns: ID, Title, Importance, Urgency, Comment.
- Sort order: Urgency (HIGH→MEDIUM→LOW), then Importance (CRITICAL→HIGH→MEDIUM→LOW).
- Add comments for HIGH and CRITICAL importance items explaining why.
- Include both Functional/Non-Functional Requirements AND User Needs in the matrix.

### 5.8 Inter-Chat Transfer (DOC_HANDLING)
- **DOC-R-019:** Use FMCP for requests.
- **DOC-R-020:** Use clear Package Labels.
- **DOC-R-021:** Support Differential Exports.

---

## 6. Subject: Tasks & Project Handling

**SUBJECT ID:** `TASKS_PROJECTS`
**Status:** Embedded – Full Rules

### 6.1 Purpose & Scope (TASKS_PROJECTS)
**Goals**
- Provide a simple, consistent task format that works across all chats and projects.
- Make tasks easy to create directly from conversation (KISS).
- Avoid loss or duplication of tasks when chats slow down, freeze, or retire.

### 6.2 Core Rules (TASKS_PROJECTS)

**TASK-R-001 – Global note markers**
- The following one-letter markers are recognised globally:
  - `i` = idea
  - `n` = note
  - `q` = question
  - `t` = task / to-do
  - `f` = finding / link / hint
- These markers may appear at the start of a line, or in lightweight list formats.

**TASK-R-002 – Task prefix with origin**
- Every task should have an **origin prefix** identifying the project or chat that “owns” it, for example:
  - `FactHarbor Organisational: prepare Org snapshot rules`
- By default, the origin prefix is the **current chat name**.
- The prefix is part of the task text and must be preserved whenever tasks are exported, imported, or listed.

**TASK-R-003 – Prefix overrides & typo correction**
- The user may explicitly override the origin prefix, e.g.:
  ```text
  t [FactHarbor Specification] Add Data Model ERD task
  t [Me & Family Brainstorming & Notes] Weihnachtsgeschenke
  t [FactHarbor Full] Add new rule to GlobalMasterKnowledge
  t [S+ Immobilien AG] Rechtsform festlegen (GmbH, AG, Einzelfirma). [P1]
```

- The override prefix inside brackets must be treated as the **task’s origin** and preserved end-to-end (creation → listing → export/import).
- The system should **auto-correct small typos** in prefix overrides (e.g., missing/extra punctuation or small spelling deviations) when the intended prefix is clearly identifiable from known chat/project names.
- If the intended prefix is not clear, the system must ask the user to confirm.

**TASK-R-004 – Task listing format**
- When listing or printing tasks, omit the leading `t` marker (show only the task text with its origin prefix).

**TASK-R-005 – Preserve original language**
- Tasks must be shown in the **original language** they were created in.

**TASK-R-006 – Global tasks across chats**
- Tasks are global across the project corpus.
- Commands such as “show global task list”, “list tasks”, or similar should be routed to the designated Task-Master workflow/chat (if available in the current environment), rather than creating divergent local task lists.

**TASK-R-007 – Separate task corpus for S+ Immobilien AG**
- The S+ Immobilien AG project must maintain a **separate, independent task list**, not merged into the global FactHarbor tasks list.

**TASK-R-008 – `edit tasks`**
- The directive `edit tasks` should open the global task list in an editable canvas view (with save capability) when the UI supports it.

---

## 7. Troubleshooting Guide: Common XWiki & Mermaid Issues

**Issue: Mermaid diagram shows "Syntax error in text" after import**
- **Root Cause:** Spaces in ERD property definitions (Mermaid v11.12.2+ syntax requirement).
- **Fix:** See DOC-R-029 - replace spaces with underscores in property names.
- **Example:** Change `number score 0_to_100` to `number score_0_to_100`.
- **Detection:** Extract XAR, search for `erDiagram`, check entity property lines for spaces.
- **Prevention:** Validate all ERD diagrams before creating XAR.

**Issue: XAR import fails or pages appear empty**
- **Root Cause:** Malformed XML structure (broken tags, invalid characters, encoding issues).
- **Fix:** Ensure XML structure is preserved exactly during modifications.
- **Prevention:** Use line-by-line parsing instead of greedy regex when modifying XAR XML files.
- **Tool:** Validate XML structure with `[xml]$content = Get-Content file.xml` in PowerShell.

**Issue: Mermaid diagram doesn't render at all in XWiki**
- **Root Cause:** Missing empty lines around `{{mermaid}}` macro.
- **Fix:** Ensure blank line BEFORE `{{mermaid}}` and AFTER `{{/mermaid}}`.
- **Prevention:** When creating/converting Mermaid diagrams, always add empty line padding.

**Issue: Changes to XAR lost or not visible after import**
- **Root Cause:** Delta XAR missing pages, or full XAR overwriting with old content.
- **Fix:** Verify XAR contents before import - list files in ZIP archive.
- **Prevention:** After modifications, verify at least one changed file in the XAR before declaring success.

**Issue: Unable to extract XAR file**
- **Root Cause:** XAR is not a valid ZIP archive.
- **Fix:** Check file is actually a XAR (ZIP) file - try with `Expand-Archive` or `unzip -l`.
- **Prevention:** When creating XARs, use standard ZIP compression tools (Compress-Archive, zip).

**Issue: Special characters broken after XAR modification**
- **Root Cause:** Encoding mismatch (not using UTF-8).
- **Fix:** Always use UTF-8 encoding when reading/writing XML files in XARs.
- **PowerShell:** `Get-Content -Encoding UTF8`, `Set-Content -Encoding UTF8`
- **Prevention:** Explicitly specify UTF-8 in all file operations.

---

_End of Global MasterKnowledge v0.7_
