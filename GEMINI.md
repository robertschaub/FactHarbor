# Gemini CLI — FactHarbor

@./AGENTS.md

Root AGENTS.md is canonical. Before target work, inspect the active session's loaded context; if the root is not visible, read it explicitly. Read applicable nested AGENTS.md files before touching their paths, including when the session began at the root. Do not assume context.fileName discovery or automatic import deduplication: record effective repository configuration and any unknown higher-scope behavior without inspecting excluded profiles.

Use only the repositories, operations and writable state named in the current task. Additional-directory context is task-scoped; a settings change does not erase context already loaded in an old session. Close affected sessions before changing context/import policy and start fresh after changes. Access does not grant public disclosure authority.

Shared skills remain authoritative under .claude/skills with synchronized .agents/skills discovery copies. Bind workflows to the current task and explicit arguments; skill loading adds no operation authority. Claude and Codex metadata do not establish Gemini controls. Follow canonical ownership, current-authorization and recovery rules; strict read-only reviewers use existing source/output and return findings in chat.

Before web/prompt/config work read apps/web/AGENTS.md; before API work read apps/api/AGENTS.md. Before an affected Gemini session starts, the integrator provisions and verifies workspace skills.disabled with validate and report-review. A task-specific toggle requires current authority and a session restart; check listed skill status. If a required restriction cannot be verified, narrow the profile and do not dispatch a writer relying on it. Use the shared handoff skill; no bespoke logger or archive is required.
