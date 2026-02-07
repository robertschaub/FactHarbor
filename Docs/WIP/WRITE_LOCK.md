# Document Write Lock

**Status:** UNLOCKED
**Holder:** —
**Since:** —
**Target:** —

## Protocol

Every agent (LLM Expert, Senior Developer, Team Lead, etc.) MUST follow this protocol before writing to any shared document in `Docs/WIP/`:

### To Acquire Lock (before writing)

1. **Read this file** (`WRITE_LOCK.md`)
2. **If LOCKED**: STOP. Do NOT write. Report to user: "Lock held by {Holder} since {Since} on {Target}. Waiting."
3. **If UNLOCKED**: Edit this file to set:
   - `Status: LOCKED`
   - `Holder: <your role>`
   - `Since: <current timestamp>`
   - `Target: <file you intend to edit>`

### To Release Lock (after writing)

4. **After your edit is confirmed**, edit this file to set:
   - `Status: UNLOCKED`
   - `Holder: —`
   - `Since: —`
   - `Target: —`

### Stale Lock

If a lock has been held for more than **10 minutes**, the user may manually reset it to UNLOCKED. Agents should NOT break a stale lock themselves — ask the user.

### Rules

- **ONE writer at a time** per shared document
- **Always re-read** the target file after acquiring the lock (it may have changed)
- **Release immediately** after your edit — do not hold across multiple tool calls
- **Lock scope**: one file at a time. If you need to edit two files, acquire → edit → release for each
