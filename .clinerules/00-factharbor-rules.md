# FactHarbor — Cline

Read root `AGENTS.md` and applicable nested instructions before target work, including `apps/web/AGENTS.md` for web/prompt/config paths and `apps/api/AGENTS.md` for API paths. These canonical files own domain, authorization, recovery and ownership rules. A model choice does not change which client controls apply.

Shared workflow bodies are authoritative under `.claude/skills`, with discovery copies under `.agents/skills`. Cline discovery varies by client/version; identify the resolved skill file from native metadata rather than assuming which copy it loads. Bind a workflow to the current authorized task and explicit arguments, never an assumed variable expansion or active editor. `GEMINI.md` describes Gemini CLI context loading; do not assume that loading it configures Cline.

Keep `validate` and `report-review` visibly toggled off in ordinary restricted Cline sessions. The integrator or maintainer records the actual toggle state; enable only for a task that explicitly calls for that skill. Enabled skills may be selected automatically. Claude's `disable-model-invocation` and Codex's policy metadata are not Cline controls. If required restrictions cannot be verified, narrow permitted operations and report the limitation; do not dispatch a writer depending on them.

Some Cline versions persist toggles in the resolved SKILL.md, adding `disabled: true` and reformatting its YAML header. The two sensitive `.agents` copies permit this metadata under the root mirror rule; the shared bodies and other controls must remain equivalent. Do not remove the flag or copy it into canonical `.claude` files merely to make a mirror check pass. Verify the resolved path/state for the actual client; a passing mirror check does not establish a disabled session.

Pushes, deployments, live analyses, and provider-spending operations require current authorization covering the specific action and scope. Authorization already given in the task remains valid; preparation or review alone does not grant it. Skill loading, UI toggles and prompt instructions are not filesystem containment.

Strict read-only reviewers inspect source and captured output and return findings in chat: no tests/builds, cache refresh, recovery logging, shared records or Git mutations. Authorized reproduction has declared writable state; follow root recovery discipline without disabling safety hooks. Restricted writers return owned edits and evidence under collaboration §4.3; only the integrator performs shared writes and integration. Destructive or irreversible operations remain main-session-only.

Use root task/role routing and `Docs/AGENTS/Policies/Handoff_Protocol.md` proportionately. The shared `handoff` skill replaces any bespoke completion logger. Windows / PowerShell; conventional commits when integration is authorized.
