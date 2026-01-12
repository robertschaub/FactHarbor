# FactHarbor Backlog

**Purpose**: Single canonical task list for FactHarbor. Keep this list current; keep `Docs/STATUS/Current_Status.md` high-level and link here.

**Last Updated**: January 2026

**Ordering**: Sorted by **Urgency** (high → med → low), then **Importance** (high → med → low).

| Description | Domain | Urgency | Importance |
|---|---|---|---|
| Inverse-input symmetry hardening: keep `scripts/inverse-scope-regression.ps1` green; add 2–3 more inverse pairs; define “strict symmetry” vs “best-effort” per test. | Analyzer | med | high |
| Evidence-driven scope refinement guardrails: add lightweight instrumentation (how often refine is applied/rejected + reason) to prevent over-splitting into non-scope “dimensions”. | Analyzer | med | high |
| Central-claim evidence coverage pass: bounded “missing-evidence” retrieval pass for central claims with zero supporting/counter facts (best-effort; no loops; respect search budgets). | Analyzer / Search | med | high |
| Scope guidelines note: short dev note defining what qualifies as a distinct “Scope” vs a dimension; keep aligned with `AGENTS.md`. | Analyzer / Docs | med | med |
| SSRF protections for URL fetching: block private IP ranges, cap redirects, cap response size, enforce timeouts. *(POC: low urgency)* | Security | low | high |
| Secure admin endpoints: protect `/admin/test-config` and any endpoints that can trigger paid API calls. *(POC: low urgency)* | Security / Cost-Control | low | high |
| Rate limiting / quotas: per-IP and/or per-key throttling; protect search + LLM calls. *(POC: low urgency)* | Security / Cost-Control | low | high |
| Expose Quality Gate reasons in UI: Gate stats exist in JSON; show per-item reasons in the report UI. | Web UI | low | med |
| Persist metrics and cost estimates: tokens/search calls/cost estimation stored per job; basic admin view. | Observability | low | med |
| Error pattern tracking: persist structured error categories and frequency to inform prompt/code fixes. | Observability | low | med |
| Analyzer modularization plan: `apps/web/src/lib/analyzer.ts` is monolithic; do incremental extraction only with safety rails. | Architecture | low | low |

