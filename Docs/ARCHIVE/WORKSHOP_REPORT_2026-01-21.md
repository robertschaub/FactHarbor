# FactHarbor 3-Day Strategic Workshop
## Final Report and Action Plan

**Workshop Dates**: Simulated 3-Day Deep Dive
**Project Version**: 2.6.33 (Code) | 2.7.0 (Schema) | **Spec V0.9.70**
**Current Phase**: **POC1 (Proof of Concept - Core Workflow with Quality Gates)**
**Workshop Team**:
- Principal Software Architect
- Lead Developer
- Product Owner
- Product Manager
- Main Sponsor

---

# EXECUTIVE SUMMARY

## Project Identity

**FactHarbor** is an open-source, nonprofit fact-checking platform that transforms complex, contested articles into **Evidence Models** — structured breakdowns that make reasoning visible and verifiable.

**Vision**: A world where decisions and public debate are grounded in evidence, so people can move forward with clarity and confidence.

**Core Differentiator**: "Evidence Models, Not Simple Verdicts" — Unlike traditional fact-checkers that produce TRUE/FALSE verdicts, FactHarbor reveals the **truth landscape** showing where a claim holds up, where it fails, and where reasonable disagreement exists.

**Development Philosophy** (from Specification V0.9.70):
> **"Validate AI automation quality BEFORE building production features"**
>
> **"Start Simple, Measure First, Add Complexity Only When Metrics Prove Necessary"**
>
> Each phase builds on proven capabilities from the previous phase. We never skip ahead - if AI quality is insufficient, we improve prompts and algorithms rather than adding manual workarounds.

## Current Development Phase: POC1

FactHarbor follows a **four-phase roadmap** with explicit success criteria for each phase:

| Phase | Goal | Success Metric | Status |
|-------|------|----------------|--------|
| **POC1** | Prove AKEL can produce credible outputs | <10% hallucination rate, quality gates prevent low-confidence publications | **IN PROGRESS** (v2.6.33) |
| **POC2** | Prove consistent quality at scale | <5% hallucination rate, all 4 quality gates operational | Not started |
| **Beta 0** | Real user testing & production readiness | User satisfaction, corrections system, essential security | Not started |
| **V1.0** | Public launch with IFCN compliance | IFCN certified, Google indexed, sustained quality | Not started |

**Critical Finding**: POC1 success criteria have **never been formally validated** — no baseline testing, no A/B testing, no hallucination rate measurement.

## Current State Assessment

| Dimension | Score | Assessment |
|-----------|-------|------------|
| **Technical Architecture** | 8/10 | Sophisticated multi-LLM, triple-path pipeline, but premature complexity in some areas |
| **Documentation** | 10/10 | **Exceptional**: 28+ Git docs + comprehensive xWiki specifications (V0.9.70) |
| **Code Quality** | 7/10 | Well-organized but monolithic analyzer, built infrastructure disconnected |
| **POC1 Validation** | 1/10 | **CRITICAL GAP**: Success criteria never measured, v2.8 prompts never validated |
| **Community Readiness** | 3/10 | Minimal CONTRIBUTING.md (11 lines), no CODE_OF_CONDUCT |
| **Production Readiness** | 4/10 | Security gaps, missing NFR12 requirements, not ready for Beta 0 |
| **Marketing/Promotion** | 2/10 | No public demo, no branding, no outreach |

## Key Workshop Findings

### CRITICAL: Phase Misalignment
1. **POC1 Not Validated**: Currently at POC1 but never validated success criteria (<10% hallucination rate, quality gates effectiveness)
   - Cannot proceed to POC2 without POC1 validation per specification
   - v2.8 prompt optimization deployed without A/B testing violates "measure first" principle
   - Unknown whether current implementation meets POC1 goals

### Technical Gaps
2. **Significant Infrastructure Built But Disconnected**: Metrics, parallel verdicts, tiered LLM routing are complete but not integrated
3. **Premature Feature Development**: Some features built for later phases (parallel verdicts for scale) before POC1 validated
4. **Security Not Production-Ready**: Missing many NFR12 requirements (SSRF, rate limiting, authentication, OWASP compliance)

### Community & Visibility Gaps
5. **Community Infrastructure Severely Lacking**: 11-line CONTRIBUTING.md, no CODE_OF_CONDUCT, no issue templates
6. **No Public Visibility**: No demo instance, no branding assets, no outreach channels
7. **Missing Quality Metrics Dashboard**: NFR13 requires TIGERScore, AlignScore, IRR tracking — not implemented

---

# PART 0: POC1 VALIDATION REQUIREMENTS (BLOCKING)

## Specification Requirement: POC1 Success Criteria

**Source**: [xWiki Roadmap/POC1](Docs/FactHarbor_Spec_and_Impl_21.Jan.26.xar) | Specification V0.9.70

The specification defines explicit criteria that **MUST** be validated before proceeding to POC2:

### POC1 Success Criteria (MANDATORY VALIDATION)

**Functional Requirements**:
- ✅ Processes diverse test articles without crashes
- ✅ Generates verdicts for all factual claims
- ❓ Blocks all non-factual claims (0% pass through) — **NOT MEASURED**
- ❓ Blocks all insufficient-evidence verdicts (0% with <2 sources) — **NOT MEASURED**

**Quality Requirements**:
- ❓ **Hallucination rate <10%** (manual verification) — **NEVER MEASURED**
- ❓ **0 verdicts with <2 sources published** — **NOT VALIDATED**
- ❓ **0 opinion statements published as facts** — **NOT VALIDATED**
- ❓ **Average quality score ≥7.0/10** — **NO SCORING SYSTEM**

**Performance Requirements**:
- ✅ Processing time reasonable for POC demonstration
- ✅ Quality gates execute efficiently
- ✅ UI displays results clearly

**Learnings Requirements**:
- ❓ Identified prompt engineering improvements — **NEVER DOCUMENTED**
- ❓ Documented AKEL strengths/weaknesses — **NOT SYSTEMATIC**
- ❓ Validated threshold values — **NEVER VALIDATED**
- ❓ Clear path to POC2 defined — **NOT DOCUMENTED**

### Decision Gates (Specification Requirement)

**POC1 → POC2 Decision Criteria**:
- **IF** hallucination rate >10% → **Pause, improve prompts before POC2**
- **IF** majority of claims non-processable → **Rethink claim extraction approach**
- **IF** quality gates too strict (excessive blocking) → **Adjust thresholds**
- **IF** quality gates too loose (hallucinations pass) → **Tighten criteria**

**Current Status**: **CANNOT PROCEED TO POC2** — No validation data exists

## BLOCKING ACTION REQUIRED

| Priority | Action | Budget | Owner | Timeframe |
|----------|--------|--------|-------|-----------|
| **P0** | Create 30-article test set (diverse: straightforward, misleading, complex) | $0 | Product Owner | Week 1 |
| **P0** | Execute baseline quality testing | $50-100 | Lead Dev | Week 1 |
| **P0** | Execute v2.8 A/B validation (old vs. optimized prompts) | $100-200 | Lead Dev | Week 2 |
| **P0** | Manual hallucination rate verification | $0 | Product Owner + Sponsor | Week 2 |
| **P0** | Document POC1 validation results | $0 | Product Owner | Week 3 |
| **P0** | Make POC1 → POC2 GO/NO-GO decision | $0 | Team | Week 3 |

**Total Budget Required**: **$150-300**

**Decision Point**: End of Week 3 — If POC1 criteria not met, do NOT proceed to POC2 features. Instead, iterate on prompts and re-test.

---

# PART 1: TOP 15 PROBLEMS AND SOLUTIONS

## Phase 0 (BLOCKING): POC1 Validation

### Problem #0: POC1 Success Criteria Never Validated
**Source**: [xWiki Roadmap/POC1](Docs/FactHarbor_Spec_and_Impl_21.Jan.26.xar) | Specification V0.9.70

**The Problem**: The project is at POC1 phase but has never validated the explicit success criteria defined in the specification:
- Hallucination rate measurement: **NEVER DONE**
- Quality gate effectiveness: **NEVER MEASURED**
- A/B testing of v2.8 optimizations: **NEVER DONE**
- POC1 → POC2 decision criteria: **NO DATA**

**Impact**:
- Cannot confidently proceed to POC2 (risk of building on faulty foundation)
- Unknown whether v2.8 optimizations improved or degraded quality
- Violates specification requirement: "Validate AI automation quality BEFORE building production features"
- May be wasting resources on sub-POC1 quality system

**Solution**: **IMMEDIATE VALIDATION SPRINT** (Weeks 1-3)

See **PART 0: POC1 VALIDATION REQUIREMENTS** above for detailed action plan.

---

## CRITICAL ISSUES (Phase 1: Connect Built Infrastructure)

### Problem #1: Built Infrastructure Sits Disconnected
**Source**: [KNOWN_ISSUES.md](Docs/STATUS/KNOWN_ISSUES.md) Issue #2, P1, P2

**The Problem**: Weeks of engineering work on observability and performance is complete but not connected:
- **MetricsCollector** (400+ lines) — Built, dashboard ready, not integrated
- **Parallel Verdicts** — Built, 50-80% speed improvement, not enabled
- **Tiered LLM Routing** — Built, 50-70% cost savings, not enabled

**Impact**:
- Zero observability into quality, performance, or costs
- Missing massive performance and cost improvements
- Cannot validate optimizations empirically

**Solution**:
```typescript
// In apps/web/src/lib/analyzer.ts - Add at top:
import { initializeMetrics, startPhase, endPhase, finalizeMetrics } from './analyzer/metrics-integration';

// At start of runAnalysis():
initializeMetrics(jobId, 'orchestrated');

// Around major phases:
startPhase('understand');
// ... work ...
endPhase('understand');

// In finally block:
await finalizeMetrics();
```

| Action | Owner | Effort | Priority |
|--------|-------|--------|----------|
| Integrate metrics hooks | Lead Dev | 30 min | IMMEDIATE |
| Enable parallel verdict generation | Lead Dev | 2 hrs | Week 1 |
| Enable tiered LLM routing (`FH_LLM_TIERING=true`) | Lead Dev | 4 hrs | Week 1 |

**Files**:
- [orchestrated.ts](apps/web/src/lib/analyzer/orchestrated.ts)
- [metrics-integration.ts](apps/web/src/lib/analyzer/metrics-integration.ts)
- [parallel-verdicts.ts](apps/web/src/lib/analyzer/parallel-verdicts.ts)
- [model-tiering.ts](apps/web/src/lib/analyzer/model-tiering.ts)

---

### Problem #2: v2.8 Prompt Optimizations Never Validated
**Source**: [KNOWN_ISSUES.md](Docs/STATUS/KNOWN_ISSUES.md) Issue #1

**The Problem**: Large prompt optimization claiming 40% token reduction was deployed without A/B testing:
- Provider-specific formatting (Claude XML, GPT few-shot, Gemini format)
- 83 tests added but only validate syntax, not actual LLM behavior
- May be contributing to quality regression observed January 13-19

**Impact**: Unknown whether optimizations improve or degrade quality — potentially wasting money on degraded analysis

**Solution**:
| Action | Owner | Effort | Cost |
|--------|-------|--------|------|
| Execute baseline test suite (30 cases) | Lead Dev | 2 hrs | $20-50 |
| Run A/B test (old vs optimized prompts) | Lead Dev | 3 hrs | $100-200 |
| Document findings, decide keep/revert/hybrid | Team | 2 hrs | - |

**Required Budget**: $150-250 for validation testing

---

### Problem #3: Community Infrastructure Severely Lacking
**Source**: Repository analysis

**The Problem**:
- [CONTRIBUTING.md](CONTRIBUTING.md) is only **11 lines** — completely inadequate
- No CODE_OF_CONDUCT.md
- No issue/PR templates (`.github/ISSUE_TEMPLATE/` missing)
- No `.github/FUNDING.yml` for sponsorship
- Developer friendliness score: **4/10**

**Impact**: Cannot attract contributors; first impressions are poor; sponsors don't see a mature project

**Solution**:

**Expanded CONTRIBUTING.md Structure** (target 500+ lines):
```markdown
# Contributing to FactHarbor

## Quick Start (5 minutes)
- Prerequisites (Node.js 20+, .NET 8 SDK)
- Clone and run: `scripts/first-run.ps1`
- Verify: http://localhost:3000

## Architecture Overview
- Component diagram
- Data flow: Submission → Claims → Research → Verdicts → Report
- Key files explained

## Finding Work
- Good First Issues (labeled)
- High-priority backlog items
- Feature requests open for contribution

## Development Guidelines
- Coding standards (see Docs/DEVELOPMENT/Coding_Guidelines.md)
- Testing requirements
- PR process and review expectations

## Core Principles (from AGENTS.md)
- Generic by Design: No domain-specific hardcoding
- Input Neutrality: Questions ≈ Statements
- Pipeline Integrity: All stages must execute
- Evidence Transparency: Every verdict cites facts
- Scope Detection: Identify distinct analytical contexts

## Getting Help
- GitHub Issues for bugs
- GitHub Discussions for questions
- Office hours (TBD)
```

| Action | Owner | Effort |
|--------|-------|--------|
| Expand CONTRIBUTING.md | Product Owner | 6 hrs |
| Add CODE_OF_CONDUCT.md (Contributor Covenant) | Product Owner | 1 hr |
| Create `.github/ISSUE_TEMPLATE/bug_report.md` | Lead Dev | 1 hr |
| Create `.github/ISSUE_TEMPLATE/feature_request.md` | Lead Dev | 1 hr |
| Create `.github/PULL_REQUEST_TEMPLATE.md` | Lead Dev | 1 hr |
| Set up `.github/FUNDING.yml` | Product Manager | 30 min |

---

## HIGH PRIORITY ISSUES

### Problem #4: No Public Demo Instance
**Source**: Repository analysis

**The Problem**: Potential users, contributors, and sponsors cannot try FactHarbor without local setup

**Impact**:
- Cannot demonstrate value proposition
- Cannot attract contributors ("try before you contribute")
- Cannot support marketing efforts
- Sponsors can't see the product in action

**Solution**:
| Action | Owner | Effort | Monthly Cost |
|--------|-------|--------|--------------|
| Deploy frontend on Vercel (free tier) | Lead Dev | 4 hrs | $0 |
| Deploy API on Railway/Render (free tier) | Lead Dev | 4 hrs | $0-5 |
| Add demo-specific rate limits (10 analyses/day/IP) | Lead Dev | 2 hrs | - |
| Pre-load example analyses | Product Owner | 2 hrs | - |

**Reference**: [Zero_Cost_Hosting_Guide.md](Docs/DEPLOYMENT/Zero_Cost_Hosting_Guide.md)

---

### Problem #5: Security Not Production-Ready
**Source**: [KNOWN_ISSUES.md](Docs/STATUS/KNOWN_ISSUES.md) S1, S2, S3

**The Problem** (Critical before any public deployment):
- **SSRF Vulnerabilities**: URL fetching has no IP blocking, size limits, redirect caps
- **Open Admin Endpoints**: `/admin/test-config` publicly accessible, can trigger paid API calls
- **No Rate Limiting**: Any client can exhaust API quota

**Solution**:
| Action | Owner | Effort | Priority |
|--------|-------|--------|----------|
| SSRF protection (block private IPs, limit redirects, cap size) | Lead Dev | 2-3 days | Before deployment |
| Secure admin endpoints with `FH_ADMIN_KEY` authentication | Lead Dev | 1 day | Before deployment |
| Add rate limiting middleware (10 req/min free tier) | Lead Dev | 2-3 days | Before deployment |

**Files**: [retrieval.ts](apps/web/src/lib/retrieval.ts)

---

### Problem #6: Quality Gate Decisions Not Visible
**Source**: [KNOWN_ISSUES.md](Docs/STATUS/KNOWN_ISSUES.md) Issue #3

**The Problem**: Gate 1 (claim validation) and Gate 4 (verdict confidence) stats exist in JSON but not shown in UI

**Impact**:
- Violates transparency mission — users can't see why claims were filtered
- Cannot justify verdicts to skeptical users
- Debugging is harder

**Solution**:
Add Quality Gates section to results page showing:
- Gate 1: Claims passed/filtered with rejection reasons
- Gate 4: Confidence tiers (HIGH/MEDIUM/LOW/INSUFFICIENT)
- Expandable sections explaining gate decisions

| Action | Owner | Effort |
|--------|-------|--------|
| Add Quality Gates UI section | Lead Dev | 2-3 days |
| Show filtered claims with reasons | Lead Dev | 1 day |

**Files**: [jobs/[id]/page.tsx](apps/web/src/app/jobs/[id]/page.tsx)

---

### Problem #7: Input Neutrality Scope Variance
**Source**: [KNOWN_ISSUES.md](Docs/STATUS/KNOWN_ISSUES.md) Issue #4

**The Problem**: Question vs statement phrasing can yield different scope counts:
- EV Lifecycle: PASSED (identical scopes)
- Bolsonaro: HIGH VARIANCE (2 vs 3 scopes)

**Impact**: Violates "Question ≈ Statement" requirement (target: <5% variance)

**Possible Solutions**:
- Strengthen input normalization
- Add deterministic scope seeding based on normalized keywords
- Implement scope merging heuristics for near-duplicates
- Reduce scope detection temperature further

| Action | Owner | Effort |
|--------|-------|--------|
| Add 2-3 more inverse test pairs | Lead Dev | 2 days |
| Define strict vs best-effort symmetry per test | Lead Dev | 1 day |
| Keep `scripts/inverse-scope-regression.ps1` green | Lead Dev | Ongoing |

---

## MEDIUM PRIORITY ISSUES

### Problem #8: Budget Constraints May Be Too Strict
**Source**: [KNOWN_ISSUES.md](Docs/STATUS/KNOWN_ISSUES.md) Issue #6

**The Problem**: January regression showed 16 searches → 9 searches when budgets enforced
- Quick mode: 4 iterations max
- Per-scope limit: 3 iterations
- May terminate research prematurely

**Workaround**: Use deep mode (`FH_ANALYSIS_MODE=deep`) or increase limits (`FH_MAX_TOTAL_ITERATIONS=20`)

**Solution**: Run baseline tests with different budget configurations to find optimal balance

---

### Problem #9: No Claim Caching
**Source**: [KNOWN_ISSUES.md](Docs/STATUS/KNOWN_ISSUES.md) Issue #7, [Backlog.md](Docs/STATUS/Backlog.md)

**The Problem**: Every analysis recomputes all claims from scratch — no caching of normalized claim verdicts

**Potential Savings**: 30-50% on analyses with repeat claims

**Solution**:
| Action | Owner | Effort |
|--------|-------|--------|
| Design claim fingerprint algorithm | Architect | 1 day |
| Create ClaimVerdictCache table | Lead Dev | 3-4 days |
| Add cache lookup/storage to pipeline | Lead Dev | 2-3 days |

---

### Problem #10: No Normalized Database Schema
**Source**: [KNOWN_ISSUES.md](Docs/STATUS/KNOWN_ISSUES.md) Issue #8

**The Problem**: All data stored as JSON blobs in Jobs table — cannot query across analyses

**Impact**:
- Cannot search claims across analyses
- Cannot track source reliability over time
- Cannot build claim networks or evidence graphs

**Solution**: Create normalized tables for Claims, Verdicts, Sources, Facts with proper relationships

---

### Problem #11: Model Knowledge Toggle Not Enforced
**Source**: [KNOWN_ISSUES.md](Docs/STATUS/KNOWN_ISSUES.md) Issue #5

**The Problem**: `FH_ALLOW_MODEL_KNOWLEDGE=false` not fully respected in Understanding phase

**Impact**: Cannot guarantee evidence-only analysis; may generate verdicts without proper citation

---

### Problem #12: CI/CD Only Builds, No Tests
**Source**: Repository analysis

**The Problem**: GitHub Actions workflow builds but doesn't run tests

**Solution**: Add `npm test` and `dotnet test` to CI workflow

---

### Problem #13: LLM Fallback Not Implemented
**Source**: [KNOWN_ISSUES.md](Docs/STATUS/KNOWN_ISSUES.md) Issue #11

**The Problem**: `FH_LLM_FALLBACKS` documented but not implemented — if primary LLM fails, analysis fails

---

### Problem #14: Error Pattern Tracking Missing
**Source**: [KNOWN_ISSUES.md](Docs/STATUS/KNOWN_ISSUES.md) Issue #9

**The Problem**: No systematic tracking of schema failures, LLM errors, source fetch failures

---

### Problem #15: Monolithic Analyzer File
**Source**: [Backlog.md](Docs/STATUS/Backlog.md)

**The Problem**: `orchestrated.ts` is ~9,000 lines — maintenance burden

**Solution**: Gradual modularization into understanding.ts, research.ts, verdict-generation.ts, etc.

---

# PART 1.5: SPECIFICATION REQUIREMENTS REVIEW

## Requirements from Specification V0.9.70

The xWiki specifications define comprehensive requirements across multiple phases. Here's alignment with current implementation:

### POC1 Requirements

| Requirement ID | Title | Implementation Status | Gap Analysis |
|----------------|-------|----------------------|--------------|
| **NFR11** (POC1 subset) | AKEL Quality Assurance Framework | **PARTIAL** | Gates 1 & 4 implemented, not validated |
| **NFR-POC-11** | LLM Provider Abstraction | **IMPLEMENTED** | Multi-provider support exists, no failover |
| **FR7** (Enhanced) | Automated Verdicts with Quality Gates | **IMPLEMENTED** | Gates integrated, UI display missing |
| **FR4** (Enhanced) | Analysis Summary with Quality Metadata | **PARTIAL** | Basic summary exists, quality metadata not displayed |
| **FR1-FR3** | Claim Intake & Normalization | **IMPLEMENTED** | Working claim extraction |

### POC2 Requirements (NOT YET APPLICABLE)

| Requirement ID | Title | Deferred Until POC1 Validated | Notes |
|----------------|-------|------------------------------|-------|
| **NFR11** (Full) | All 4 Quality Gates | POC2 | Gates 2 & 3 not needed until POC1 proven |
| **FR54** | Evidence Deduplication | POC2 | Prevents artificial inflation |
| **NFR13** | Quality Metrics Dashboard | POC2 | TIGERScore, AlignScore, IRR tracking |
| **Context-Aware Analysis** | Article-level verdict analysis | POC2 (conditional) | Based on POC1 experimental results (70% accuracy threshold) |

### Beta 0 Requirements (FUTURE)

| Requirement ID | Title | Phase | Notes |
|----------------|-------|-------|-------|
| **FR45** | Corrections Notification System | Beta 0 | IFCN compliance requirement |
| **FR47** | Archive.org Integration | Beta 0 | Evidence persistence |
| **NFR12** | Security Controls (Essential) | Beta 0 | **BLOCKING for any public deployment** |

### V1.0 Requirements (FUTURE)

| Requirement ID | Title | Phase | Notes |
|----------------|-------|-------|-------|
| **FR44** | ClaimReview Schema Implementation | V1.0 | Google Fact Check Explorer visibility |
| **FR46** | Image Verification System | V1.0 | Reverse search, manipulation detection, EXIF analysis |
| **FR48** | Contributor Safety Framework | V1.0 | Protect against harassment, doxxing |
| **FR49** | A/B Testing Framework | V1.0 | Systematic improvement measurement |
| **NFR12** (Full) | Security Controls (Complete) | V1.0 | Full OWASP compliance, penetration testing |
| **NFR13** (Full) | Quality Metrics Transparency (Public) | V1.0 | Public quality dashboard |

## Critical Specification Philosophy

### Design Decision: Start Simple

**Source**: [xWiki Specification/Design-Decisions](Docs/FactHarbor_Spec_and_Impl_21.Jan.26.xar)

The specification emphasizes starting simple and adding complexity only when metrics prove necessary:

**Database Strategy**:
- ✅ **POC/V1.0**: PostgreSQL alone (current: SQLite for POC, PostgreSQL for production)
- ❌ **Do NOT add** TimescaleDB, Elasticsearch until proven necessary
- **Trigger**: Add Elasticsearch only when PostgreSQL search consistently >500ms
- **Trigger**: Add TimescaleDB only when metrics queries consistently >1s
- **Evidence**: Research shows single-DB architectures work well until 10,000+ users

**Roles & Reputation**:
- ✅ **POC/V1.0**: Simple manual roles (Reader, Contributor, Moderator, Admin)
- ❌ **Do NOT add** complex reputation system, automated privilege escalation
- **Trigger**: Add complexity only when 100+ active contributors
- **Evidence**: Successful communities (Wikipedia, Stack Overflow) started simple

**Federation**:
- ✅ **POC/V1.0**: Single-node architecture
- ❌ **Do NOT implement** federation until V2.0+
- **Trigger**: 10,000+ users, explicit user demand, geographic distribution necessary
- **Evidence**: Premature federation increases failure risk

**Architecture**:
- ✅ **Current**: Three-layer architecture (Interface, Processing, Data & Storage)
- ❌ **Avoid**: 7-layer architecture, pure microservices (20+ services)
- **Rationale**: Clear separation of concerns, maintainable by small team

### Quality Gates Detail (NFR11)

**POC1 Implementation** (Gates 1 & 4):

**Gate 1: Claim Validation**
- Purpose: Ensure extracted claims are factual assertions, not opinions or predictions
- Checks: Factual statement test, opinion detection, specificity score, future prediction test
- Pass Criteria: `isFactual: true`, `opinionScore: ≤ 0.3`, `specificityScore: ≥ 0.3`, `claimType: FACTUAL`
- Action if Failed: Flag as "Non-verifiable", do NOT generate scenarios or verdicts
- Target: **0% opinion statements processed as facts**
- **Status**: Implemented, not validated

**Gate 4: Verdict Confidence Assessment**
- Purpose: Only publish verdicts with sufficient evidence and confidence
- Checks: Evidence count (min 2 sources), source quality (≥0.6), evidence agreement (≥0.6), uncertainty factors
- Confidence Tiers: HIGH (80-100%), MEDIUM (50-79%), LOW (0-49%), INSUFFICIENT (<2 sources)
- POC1 Rule: Minimum **MEDIUM** confidence required to publish
- Target: **0% verdicts published with <2 sources**
- **Status**: Implemented, not validated

**POC2 Implementation** (Gates 2 & 3 — NOT YET NEEDED):

**Gate 2: Evidence Relevance Validation**
- Purpose: Ensure AI-linked evidence actually relates to the claim
- Checks: Semantic similarity (≥0.6), entity overlap (≥1), topic relevance (≥0.5)
- Target: **0% of evidence cited is off-topic**
- **Status**: Deferred to POC2

**Gate 3: Scenario Coherence Check**
- Purpose: Validate scenarios are logical, complete, and meaningfully different
- Checks: Completeness, internal consistency, distinctiveness, minimum detail
- Target: **0% duplicate scenarios, all scenarios internally consistent**
- **Status**: Deferred to POC2 (Note: Current implementation uses KeyFactors, not explicit Scenarios)

### Security Requirements (NFR12)

**Source**: [xWiki Specification/Requirements](Docs/FactHarbor_Spec_and_Impl_21.Jan.26.xar) NFR12

The specification defines comprehensive security controls. Current gaps:

**Essential (Beta 0 Requirements)**:
- [ ] Input validation (SQL injection, XSS, CSRF prevention)
- [ ] Rate limiting (100 req/hour per IP for analysis, 1,000 for read, 500 for search)
- [ ] HTTPS everywhere
- [ ] Basic authentication for admin functions
- **Target**: **0 critical/high security vulnerabilities**

**Full (V1.0 Requirements)**:
- [ ] Professional penetration testing
- [ ] Code review for vulnerabilities
- [ ] Dependency vulnerability scanning (Snyk, Dependabot)
- [ ] GDPR compliance audit (if EU users)
- [ ] Security headers (CSP, X-Frame-Options, etc.)
- [ ] DDoS protection (CloudFlare/AWS Shield)
- [ ] Incident response plan
- **Target**: Security audit passed, 0 critical findings

**Current Status**: **NOT BETA-READY** — Multiple critical gaps (SSRF, no rate limiting, open admin endpoints)

---

# PART 2: BRINGING THE PROJECT FORWARD

## Organizational Structure

### Current State
- Solo founder/developer model
- No formal governance
- No community processes

### Recommended Structure

**Phase 1: Foundation (Now - Month 3)**
| Role | Person | Responsibilities |
|------|--------|------------------|
| Project Lead | Sponsor | Vision, funding, partnerships |
| Technical Lead | Principal Architect | Architecture decisions, code review |
| Lead Developer | Current Developer | Implementation, testing, releases |
| Product Owner | Designate | Backlog, priorities, acceptance criteria |
| Community Manager | Product Manager (initial) | Outreach, contributor support |

**Phase 2: Growth (Months 4-12)**
- Additional developers (sponsored or volunteer)
- Dedicated Community Manager
- QA/Test engineer
- Documentation specialist

### Governance Model

**Technical Decisions**:
- Architecture: Principal Architect + Lead Developer consensus
- Implementation: Lead Developer + PR review process
- Priorities: Product Owner + Technical Lead input

**Community Decisions**:
- Code of Conduct enforcement: Community Manager + Project Lead
- Contributor recognition: Community Manager
- External communication: Project Lead + Product Manager

**Financial Decisions**:
- Budget allocation: Project Lead (transparent quarterly reports)
- Sponsorship acceptance: Project Lead + community input
- Vendor selection: Technical Lead + Project Lead

---

## 12-Month Roadmap (Phased Per Specification)

**Philosophy**: Each phase must be validated before proceeding to the next. Do not build Phase N+1 features until Phase N success criteria are met.

### Phase Transition Decision Gates

**POC1 → POC2 Decision (Week 3)**:
- **GO Criteria**: Hallucination rate <10%, quality gates effective, average quality ≥7.0/10
- **NO-GO Actions**: Iterate on prompts, adjust gate thresholds, retest

**POC2 → Beta 0 Decision (Month 4)**:
- **GO Criteria**: Hallucination rate <5%, all 4 gates operational, quality sustained
- **NO-GO Actions**: Improve evidence linking, strengthen gates, retest

**Beta 0 → V1.0 Decision (Month 9)**:
- **GO Criteria**: User satisfaction, corrections system working, 0 critical security issues
- **NO-GO Actions**: Address user feedback, fix security gaps, retest

---

### Q1: POC1 Validation & Stabilization (Months 1-3)

**Phase Goal**: **Validate POC1 success criteria** and stabilize for community engagement

**Month 1: POC1 VALIDATION (BLOCKING)**

*Week 1: Immediate Validation Prep*
- [ ] **Approve $300 validation budget** (Sponsor) — BLOCKING
- [ ] Integrate metrics, parallel verdicts, tiered routing — QUICK WINS
- [ ] Create 30-article test set (diverse: straightforward, misleading, complex)
- [ ] Execute baseline quality testing ($50-100)

*Week 2: A/B Testing & Measurement*
- [ ] Execute v2.8 A/B validation (old vs. optimized prompts) ($100-200)
- [ ] Manual hallucination rate verification (Product Owner + Sponsor)
- [ ] Expand CONTRIBUTING.md (500+ lines)
- [ ] Add CODE_OF_CONDUCT.md, issue/PR templates

*Week 3: Decision Point*
- [ ] Document POC1 validation results
- [ ] **POC1 → POC2 GO/NO-GO DECISION** (Team consensus)
- [ ] If NO-GO: Iterate on prompts, adjust thresholds, schedule retest
- [ ] If GO: Proceed with POC2 planning

*Week 4: Community Foundation (if GO)*
- [ ] Deploy public demo instance (Vercel + Railway)
- [ ] Set up sponsorship infrastructure (FUNDING.yml)
- [ ] Pre-load example analyses

**Month 2: POC1 Refinement & Visibility**

*Assuming POC1 GO decision:*
- [ ] Add Quality Gate UI display (transparency requirement)
- [ ] Create showcase materials (2-min explainer video, slides)
- [ ] Launch GitHub Discussions
- [ ] First contributor outreach
- [ ] Address any findings from validation testing

**Month 3: POC2 Preparation**

*If POC1 validated:*
- [ ] Plan POC2 features (Gates 2 & 3, Evidence Deduplication, Context-Aware Analysis)
- [ ] Essential security hardening (SSRF protection, admin auth, basic rate limiting)
- [ ] Persistent job queue (replace in-memory state)
- [ ] Target: 100 GitHub stars, 5 contributors

**Month 3 Alternative: POC1 Iteration**

*If POC1 failed validation:*
- [ ] Implement prompt improvements identified in testing
- [ ] Adjust quality gate thresholds based on data
- [ ] Re-execute validation testing
- [ ] Repeat until POC1 criteria met

---

### Q2: POC2 Implementation & Validation (Months 4-6)

**Phase Goal**: Prove consistent quality at scale with all 4 gates operational

**Prerequisite**: POC1 validated (<10% hallucination rate, gates effective)

**Month 4: POC2 Features**

- [ ] Implement Gates 2 & 3 (Evidence Relevance, Scenario Coherence)
- [ ] Implement Evidence Deduplication (FR54)
- [ ] Implement Quality Metrics Dashboard (NFR13) — TIGERScore, AlignScore, IRR
- [ ] Context-Aware Analysis (conditional, based on POC1 experimental results)
- [ ] Claim-level caching (30-50% cost savings)

**Month 5: POC2 Testing**

- [ ] Execute POC2 validation (100-article test set)
- [ ] Measure: Hallucination rate target <5%
- [ ] Measure: All 4 gates operational and effective
- [ ] Measure: Quality sustained at scale
- [ ] Cost optimization validation

**Month 6: POC2 → Beta 0 Decision**

- [ ] Document POC2 validation results
- [ ] **POC2 → Beta 0 GO/NO-GO DECISION**
- [ ] If NO-GO: Iterate on gates, improve evidence linking, retest
- [ ] If GO: Plan Beta 0 features (corrections, Archive.org, security)
- [ ] Target: 300 GitHub stars, 15 contributors

---

### Q3: Beta 0 Implementation (Months 7-9)

**Phase Goal**: Real user testing with corrections system and production-ready security

**Prerequisite**: POC2 validated (<5% hallucination rate, all gates working)

**Month 7: Beta 0 Features**

- [ ] Corrections Notification System (FR45) — IFCN compliance
- [ ] Archive.org Integration (FR47) — Evidence persistence
- [ ] Essential Security Controls (NFR12 Beta subset) — Production-ready
- [ ] Beta tester recruitment program

**Month 8: Beta Testing**

- [ ] Recruit beta testers (journalists, researchers, fact-checkers, general users)
- [ ] Structured testing period with guided tasks
- [ ] Satisfaction survey
- [ ] Bug reporting and resolution

**Month 9: Beta 0 → V1.0 Decision**

- [ ] Beta testing results analysis
- [ ] User satisfaction target met?
- [ ] Security audit: 0 critical/high issues?
- [ ] Corrections system working?
- [ ] **Beta 0 → V1.0 GO/NO-GO DECISION**
- [ ] If GO: Plan V1.0 public launch
- [ ] Target: 500 stars, 20 contributors, press mentions

---

### Q4: V1.0 Public Launch (Months 10-12)

**Phase Goal**: Production launch with IFCN compliance and public quality metrics

**Prerequisite**: Beta 0 validated (user satisfaction, security, corrections working)

**Month 10: V1.0 Launch Blockers**

- [ ] ClaimReview Schema Implementation (FR44) — Google visibility
- [ ] Image Verification System (FR46) — Media verification
- [ ] Contributor Safety Framework (FR48) — Protect contributors
- [ ] A/B Testing Framework (FR49) — Systematic improvement
- [ ] Full Security Audit (NFR12 complete) — Professional penetration testing
- [ ] Public Quality Metrics Dashboard (NFR13 complete) — Transparency

**Month 11: V1.0 Launch**

- [ ] ProductHunt launch
- [ ] Press outreach
- [ ] Public API for third-party integration
- [ ] IFCN compliance documentation
- [ ] Privacy Policy & Terms of Service
- [ ] Target: IFCN compliant, Google Fact Check Explorer indexed

**Month 12: Post-Launch & Sustainability**

- [ ] Monitor quality metrics (sustained <5% hallucination rate)
- [ ] User feedback integration
- [ ] Financial sustainability assessment
- [ ] Annual review and 2027 planning
- [ ] Target: 1,000 stars, 30 contributors, $2,000/mo revenue

---

### Deferred Beyond V1.0 (V1.1+)

Per specification "Start Simple" philosophy, these features are deferred:

- **Federation**: Until 10,000+ users, explicit demand (V2.0+)
- **Complex Reputation System**: Until 100+ active contributors
- **Video Verification (FR51)**: Advanced media verification
- **OSINT Toolkit Integration (FR50)**: Advanced verification tools
- **Interactive Detection Training (FR52)**: Media literacy education
- **Cross-Organizational Sharing (FR53)**: IFCN/EFCSN collaboration
- **Enterprise Features**: SSO, white-label (as needed)

---

# PART 3: PRESENTING AND PROMOTING THE PROJECT

## Brand Positioning

**Primary Tagline**: "Evidence Models, Not Simple Verdicts"

**Elevator Pitch** (30 seconds):
> "FactHarbor is an open-source fact-checking platform that shows you the full truth landscape, not just TRUE or FALSE. We break down complex claims into their components — the evidence, the assumptions, the contexts — so you can see exactly why something is true, false, or contested. Think of it as X-ray vision for misinformation."

**Key Messages**:
1. **Transparent Reasoning**: "See not just what we concluded, but how we got there"
2. **Multi-Scope Analysis**: "Different contexts can yield different verdicts — we show all of them"
3. **Open Source**: "Our methodology, code, and reasoning are open for inspection"
4. **Non-Profit**: "We serve the public interest, not shareholders"

## Competitive Positioning

| Competitor | Their Approach | FactHarbor Advantage |
|------------|---------------|---------------------|
| **Snopes** | Manual editorial review, narrative verdicts | Automated + transparent methodology |
| **FullFact** | Human fact-checkers, UK focus | Open source, global scope, scalable |
| **PolitiFact** | Rating system (Pants on Fire to True) | Evidence Models show full reasoning |
| **ClaimBuster** | Claim detection only | Full pipeline: detection + research + verdict |
| **Meta Partners** | Corporate fact-checking network | Non-profit, no corporate incentive misalignment |

## Marketing Channels

### Technical Community (Primary - Q1)
| Channel | Audience | Frequency | Content |
|---------|----------|-----------|---------|
| GitHub | Developers | Daily | Active issues, responsive PRs |
| Hacker News | Tech community | Quarterly | Major releases, launches |
| Dev.to/Medium | Developers | Monthly | Technical deep-dives |
| Reddit r/programming | Developers | Weekly | Engagement, AMAs |

### Research Community (Q2-Q3)
| Channel | Audience | Frequency | Content |
|---------|----------|-----------|---------|
| arXiv | Researchers | Annually | Methodology papers |
| EMNLP/ACL Workshops | NLP researchers | Annually | Conference presentations |
| University outreach | Academia | Ongoing | Research collaborations |

### General Audience (Q3-Q4)
| Channel | Audience | Frequency | Content |
|---------|----------|-----------|---------|
| Twitter/X | General | 2-3x/week | Analysis highlights, updates |
| LinkedIn | Professionals | Weekly | Industry insights |
| Newsletter | Subscribers | Monthly | Progress, community highlights |
| YouTube | General | Monthly | Demo videos, explainers |

## Demo Strategy

### Public Demo Instance
- **URL**: demo.factharbor.org (target)
- **Rate Limit**: 10 analyses/day/IP (free tier)
- **Pre-loaded Examples**:
  - Health claim analysis (COVID vaccine efficacy)
  - Political claim analysis (election security)
  - Scientific claim analysis (climate change)
- **"Try It Yourself"**: Simple input for users to test

### Showcase Materials
1. **2-minute explainer video**: "What is FactHarbor?"
2. **5-minute demo video**: Live analysis walkthrough
3. **10-minute technical deep-dive**: Architecture and methodology
4. **Slide deck**: 15 slides for presentations
5. **Comparison one-pager**: FactHarbor vs alternatives

### Launch Events Timeline
| Event | Timing | Audience | Goal |
|-------|--------|----------|------|
| GitHub "launch" | Month 2 | Developers | 100 stars |
| Hacker News post | Month 3 | Tech community | Awareness, feedback |
| Academic workshop | Month 6 | Researchers | Collaborations |
| ProductHunt | Month 9 | General audience | User growth |
| Press outreach | Month 9 | Journalists | Media coverage |

---

# PART 4: ATTRACTING CONTRIBUTORS AND SPONSORS

## Contributor Strategy

### Current State
- CONTRIBUTING.md: **11 lines** (completely inadequate)
- No "good first issue" labels
- No contributor recognition
- No pathway documentation

### Improved Contributor Experience

**Issue Labels to Create**:
- `good-first-issue` — Starter tasks for new contributors
- `help-wanted` — Tasks actively seeking contributors
- `documentation` — Documentation improvements
- `enhancement` — Feature requests
- `bug` — Bug fixes
- `security` — Security-related issues

**Contributor Recognition**:
- [CONTRIBUTORS.md](CONTRIBUTORS.md) file listing all contributors
- Monthly contributor spotlight in newsletter
- "Hall of Fame" for significant contributions
- GitHub profile recognition

**Contributor Path**:
```
Level 1: First Contribution (1-2 hours)
├── Fix typo/documentation
├── Add test case
└── Small UI improvement

Level 2: Regular Contributor (4-8 hours)
├── Fix labeled bug
├── Implement small feature
└── Code review participation

Level 3: Core Contributor (ownership)
├── Own a module/component
├── Regular PR reviews
├── Architecture input

Level 4: Maintainer (governance)
├── Release management
├── Roadmap planning
├── Community leadership
```

## Sponsorship Strategy

### Infrastructure Setup

**.github/FUNDING.yml**:
```yaml
github: [factharbor]
open_collective: factharbor
custom: ["https://factharbor.org/sponsor"]
```

### Sponsorship Tiers

| Tier | Monthly | Annual | Benefits |
|------|---------|--------|----------|
| **Supporter** | $5 | $50 | Name in SPONSORS.md, sponsor badge |
| **Backer** | $25 | $250 | + Newsletter, Discord/community access |
| **Bronze** | $100 | $1,000 | + Logo on README, quarterly update call |
| **Silver** | $500 | $5,000 | + Logo on website, priority support |
| **Gold** | $2,000 | $20,000 | + Feature input, dedicated support, advisory role |
| **Platinum** | $5,000+ | $50,000+ | + Custom integrations, board seat consideration |

### Funding Transparency

**Monthly Financial Report** (public):
```markdown
# FactHarbor Financial Report - [Month Year]

## Revenue
- GitHub Sponsors: $X
- Open Collective: $Y
- Direct donations: $Z
- **Total**: $[Total]

## Expenses
- LLM API costs: $X (X analyses)
- Infrastructure: $Y
- Development tools: $Z
- **Total**: $[Total]

## Balance
- Opening: $X
- Closing: $Y
- Change: +/-$Z

## Funding Goals Progress
- $500/mo: Cover infrastructure ▓▓▓▓░░░░░░ 40%
- $2,000/mo: Part-time community manager ▓░░░░░░░░░ 10%
- $5,000/mo: Full-time developer ░░░░░░░░░░ 0%
```

### Partnership Targets

| Partner Type | Value Proposition | Approach |
|--------------|-------------------|----------|
| **News Organizations** | API integration for fact-checking workflows | Direct outreach to tech teams |
| **Academic Institutions** | Research collaboration, student projects | Conference networking, direct outreach |
| **Media Literacy Orgs** | Educational tools, training materials | Partnership proposals |
| **Tech Companies (CSR)** | Misinformation combat, PR value | Sponsorship program |
| **Foundations** | Grant funding for public good | Grant applications |

**Target Foundations**:
- Mozilla Foundation (open source, internet health)
- Omidyar Network (democracy, informed citizenry)
- Knight Foundation (journalism, media)
- Wikimedia Foundation (knowledge access)
- Ford Foundation (social justice, democracy)

---

# PART 5: SOFTWARE ARCHITECTURE IMPROVEMENTS

## Immediate Integrations (Week 1)

| Optimization | Location | Impact | Effort |
|--------------|----------|--------|--------|
| **Metrics Collection** | [metrics-integration.ts](apps/web/src/lib/analyzer/metrics-integration.ts) | Full observability | 30 min |
| **Parallel Verdicts** | [parallel-verdicts.ts](apps/web/src/lib/analyzer/parallel-verdicts.ts) | 50-80% faster | 2 hrs |
| **Tiered LLM Routing** | [model-tiering.ts](apps/web/src/lib/analyzer/model-tiering.ts) | 50-70% cost savings | 4 hrs |

## Architecture Evolution

### Current State (POC)
```
[Browser] → [Next.js :3000] → [.NET API :5000] → [SQLite]
                 ↓
            [LLM APIs]
            [Search APIs]
```

### Target State (Production)
```
[CDN/Browser] → [Next.js (Vercel/Cloudflare)]
                      ↓
                [Load Balancer]
                      ↓
          [API Cluster (multiple instances)]
                      ↓
                [PostgreSQL + Redis]
                      ↓
                [Job Workers]
                      ↓
                [LLM APIs]
```

### Key Architectural Improvements

**1. Persistent Job Queue** (Month 3)
- Replace in-memory `globalThis.__fhRunnerQueueState` with Redis/PostgreSQL
- Enables horizontal scaling
- Jobs survive service restarts

**2. Claim Caching Layer** (Month 4)
- Fingerprint-based cache for normalized claim verdicts
- 30-50% cost reduction on repeat claims
- 90-day TTL with invalidation hooks

**3. Normalized Database Schema** (Month 6)
- Proper tables for Claims, Verdicts, Sources, Facts
- Enable cross-analysis queries
- Historical trend analysis

**4. Async Job Processing** (Month 3)
- Convert synchronous 5-minute blocking to async dispatch
- Background workers for analysis
- SSE for progress updates (already implemented)

## Security Hardening Checklist

**Before Any Public Deployment**:
- [ ] SSRF Protection: Block private IPs (127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
- [ ] Redirect limits: Max 3 redirects
- [ ] Response size limits: Max 10MB
- [ ] Admin Authentication: Require `FH_ADMIN_KEY` for all `/admin/*` routes
- [ ] Rate Limiting: 10 req/min (free), 100 req/min (authenticated)
- [ ] Input Validation: Max claim length, URL format validation
- [ ] CORS Tightening: Strict origin policy

## Cost Optimization Summary

| Optimization | Savings | Effort | Status |
|--------------|---------|--------|--------|
| **Tiered LLM Routing** | 50-70% LLM costs | 4 hrs | Built, needs integration |
| **Parallel Verdicts** | Time savings = cost savings | 2 hrs | Built, needs integration |
| **Claim Caching** | 30-50% on repeats | 5-7 days | Not built |
| **Search Deduplication** | 20-30% search costs | 2 days | Not built |

**Combined Potential**: **70-85% cost reduction** with all optimizations

---

# PART 6: SUCCESS METRICS AND KPIs

## Technical KPIs

| Metric | Current | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|---------|----------|
| Test Coverage | ~30% | 50% | 70% | 80% |
| Analysis Speed (median) | ~3 min | ~2 min | ~1.5 min | ~1 min |
| Cost per Analysis | $1-5 | $0.50-2 | $0.30-1 | $0.20-0.50 |
| Uptime | N/A | 95% | 99% | 99.5% |
| Gate 4 Publishable Rate | Unknown | Measured | >80% | >85% |

## Community KPIs

| Metric | Current | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|---------|----------|
| GitHub Stars | ~0 | 100 | 300 | 1,000 |
| Contributors | 1 | 5 | 15 | 30 |
| Monthly Active Contributors | 1 | 3 | 8 | 15 |
| Open Issues (healthy) | ~5 | 20 | 40 | 80 |
| PRs Merged/Month | ~10 | 15 | 30 | 50 |

## Adoption KPIs

| Metric | Current | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|---------|----------|
| Monthly Analyses (demo) | 0 | 100 | 500 | 5,000 |
| Newsletter Subscribers | 0 | 100 | 500 | 2,000 |
| API Integrations | 0 | 0 | 2 | 10 |
| Press Mentions | 0 | 0 | 3 | 10 |

## Financial KPIs

| Metric | Current | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|---------|----------|
| Monthly Sponsors | 0 | 5 | 20 | 50 |
| Monthly Revenue | $0 | $100 | $500 | $2,000 |
| Infrastructure Costs | ~$0 | $50 | $100 | $500 |
| LLM API Costs | Variable | $200 | $400 | $1,000 |

---

# PART 7: IMMEDIATE ACTION PLAN

## Week 1: Critical Quick Wins

| # | Action | Owner | Day | Status |
|---|--------|-------|-----|--------|
| 1 | **Approve validation budget** ($200) | Sponsor | Day 1 | Pending |
| 2 | **Integrate metrics** into orchestrated.ts | Lead Dev | Day 1 | Pending |
| 3 | **Enable parallel verdicts** | Lead Dev | Day 2 | Pending |
| 4 | **Enable tiered LLM routing** | Lead Dev | Day 2 | Pending |
| 5 | **Run baseline test suite** | Lead Dev | Day 3 | Pending |
| 6 | **Run A/B validation test** | Lead Dev | Day 4 | Pending |
| 7 | **Document test results** | Lead Dev | Day 5 | Pending |

## Week 2: Community Foundation

| # | Action | Owner | Day | Status |
|---|--------|-------|-----|--------|
| 8 | **Expand CONTRIBUTING.md** (500+ lines) | Product Owner | Day 6-7 | Pending |
| 9 | **Add CODE_OF_CONDUCT.md** | Product Owner | Day 8 | Pending |
| 10 | **Create issue templates** | Lead Dev | Day 9 | Pending |
| 11 | **Create PR template** | Lead Dev | Day 9 | Pending |
| 12 | **Set up FUNDING.yml** | Product Manager | Day 10 | Pending |

## Week 3-4: Public Visibility

| # | Action | Owner | Day | Status |
|---|--------|-------|-----|--------|
| 13 | **Deploy demo frontend** (Vercel) | Lead Dev | Day 11-12 | Pending |
| 14 | **Deploy demo API** (Railway) | Lead Dev | Day 13-14 | Pending |
| 15 | **Add demo rate limits** | Lead Dev | Day 15 | Pending |
| 16 | **Pre-load example analyses** | Product Owner | Day 16-17 | Pending |
| 17 | **Create 2-min explainer video** | Product Manager | Day 18-20 | Pending |

## Monthly Milestones

| Month | Milestone | Success Criteria |
|-------|-----------|------------------|
| 1 | **Quick Wins Complete** | Metrics integrated, parallel verdicts enabled, community docs done |
| 2 | **Demo Live** | Public demo accessible, 50+ test analyses |
| 3 | **Production Ready** | Security hardening complete, 100 GitHub stars |
| 4 | **Performance Optimized** | Claim caching live, 50% cost reduction |
| 5 | **Features Enhanced** | Templates and refinement live |
| 6 | **Scale Ready** | Normalized DB, 300 stars, 15 contributors |
| 9 | **Public Launch** | ProductHunt launch, 500+ stars, press coverage |
| 12 | **Sustainable** | $2,000/mo revenue, 30 contributors |

---

# PART 8: VERIFICATION PLAN

## After Implementation

### Technical Verification
1. Run `npm test` — all tests pass
2. Check `/admin/metrics` dashboard shows real data
3. Verify demo instance works end-to-end
4. Confirm parallel verdicts enabled (check logs for concurrent processing)
5. Confirm tiered routing enabled (check logs for model selection)

### Community Verification
1. CONTRIBUTING.md is comprehensive (>500 lines)
2. GitHub "Community" tab shows improved health score
3. Sponsorship button appears on repository
4. Issue templates work correctly

### Security Verification
1. Run DEPLOYMENT_CHECKLIST.md security items
2. Verify admin endpoints require authentication
3. Test rate limiting prevents abuse
4. Verify SSRF protections block private IPs

---

# KEY FILES REFERENCE

| Purpose | File |
|---------|------|
| **Main Pipeline** | [orchestrated.ts](apps/web/src/lib/analyzer/orchestrated.ts) |
| **Metrics Integration** | [metrics-integration.ts](apps/web/src/lib/analyzer/metrics-integration.ts) |
| **Parallel Verdicts** | [parallel-verdicts.ts](apps/web/src/lib/analyzer/parallel-verdicts.ts) |
| **Tiered Routing** | [model-tiering.ts](apps/web/src/lib/analyzer/model-tiering.ts) |
| **URL Fetching (SSRF)** | [retrieval.ts](apps/web/src/lib/retrieval.ts) |
| **Results UI** | [jobs/[id]/page.tsx](apps/web/src/app/jobs/[id]/page.tsx) |
| **Known Issues** | [KNOWN_ISSUES.md](Docs/STATUS/KNOWN_ISSUES.md) |
| **Backlog** | [Backlog.md](Docs/STATUS/Backlog.md) |
| **Current Status** | [Current_Status.md](Docs/STATUS/Current_Status.md) |
| **Improvements** | [Improvement_Recommendations.md](Docs/STATUS/Improvement_Recommendations.md) |
| **Contributing** | [CONTRIBUTING.md](CONTRIBUTING.md) |
| **Deployment** | [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) |
| **CI Workflow** | [.github/workflows/ci.yml](.github/workflows/ci.yml) |

---

# PART 9: COMPREHENSIVE SPECIFICATION DOCUMENTATION DISCOVERED

## Major Discovery: xWiki Specification Corpus

During the workshop deep dive, we discovered **comprehensive xWiki specification documentation** (V0.9.70) that provides authoritative guidance for the entire project:

### xWiki Documentation Structure

**Source**: `Docs/FactHarbor_Spec_and_Impl_21.Jan.26.xar` (latest version)

```
FactHarbor xWiki Corpus (V0.9.70):
├── WebHome (Project Overview)
├── Specification/
│   ├── POC/
│   │   ├── Requirements (FR-POC-1 to FR-POC-7, NFR-POC-1 to NFR-POC-5)
│   │   ├── Specification (Detailed POC specifications)
│   │   ├── Summary (Executive summary of POC goals)
│   │   ├── API-and-Schemas (Implementation details)
│   │   └── Article-Verdict-Problem (Context-aware analysis investigation)
│   ├── Requirements/ (Full system requirements)
│   │   ├── WebHome (50+ Functional & Non-Functional Requirements)
│   │   ├── Roles (User roles and permissions)
│   │   ├── User Needs (17 user needs driving requirements)
│   │   └── GapAnalysis (Spec vs. implementation gaps)
│   ├── Architecture/ (System architecture, LLM abstraction, 3-layer design)
│   ├── Design-Decisions (Rationale for simplicity choices)
│   ├── When-to-Add-Complexity (Triggers for adding features)
│   ├── Data Model/ (Entity-Relationship design)
│   ├── AI Knowledge Extraction Layer (AKEL)/ (AKEL specifications)
│   ├── Workflows/ (User interaction workflows)
│   ├── Diagrams/ (15+ architectural diagrams)
│   │   ├── AKEL Architecture
│   │   ├── High-Level Architecture
│   │   ├── LLM Abstraction Architecture
│   │   ├── Core Data Model ERD
│   │   ├── Orchestrated/Monolithic/Dynamic Pipeline Internals
│   │   └── ... (11 more diagrams)
│   └── Federation & Decentralization/ (Future V2.0+ plans)
├── Roadmap/
│   ├── WebHome (Development phases overview)
│   ├── POC1/ (Core Workflow with Quality Gates - <10% hallucination)
│   ├── POC2/ (Robust Quality & Reliability - <5% hallucination)
│   ├── Beta0/ (User Testing & Production Readiness)
│   ├── V10/ (Public Launch with IFCN compliance)
│   ├── Requirements-Roadmap-Matrix (Which requirements in which phases)
│   ├── Development Guidance/ (Tools decisions, installation checklist)
│   ├── Architecture Analysis/ (Architecture evolution analysis)
│   └── Zero-Cost Hosting Implementation Guide
└── Examples/ (Usage examples and test cases)
```

### Key Specification Documents

**Critical Reading**:
1. **[Roadmap/POC1](Docs/FactHarbor_Spec_and_Impl_21.Jan.26.xar)** — POC1 success criteria, decision gates
2. **[Specification/Requirements](Docs/FactHarbor_Spec_and_Impl_21.Jan.26.xar)** — NFR11, NFR12, NFR13, FR44-54
3. **[Specification/Design-Decisions](Docs/FactHarbor_Spec_and_Impl_21.Jan.26.xar)** — Why simple choices were made
4. **[Specification/Architecture](Docs/FactHarbor_Spec_and_Impl_21.Jan.26.xar)** — 3-layer architecture, LLM abstraction
5. **[Roadmap/Requirements-Roadmap-Matrix](Docs/FactHarbor_Spec_and_Impl_21.Jan.26.xar)** — Phase-to-requirement mapping

### Documentation Quality Assessment

| Documentation Type | Quality | Notes |
|-------------------|---------|-------|
| **xWiki Specifications** | **10/10** | Comprehensive, versioned, detailed requirements and roadmap |
| **Git Docs/ (STATUS)** | **9/10** | Excellent current state documentation |
| **Git Docs/ (DEVELOPMENT)** | **8/10** | Good coding guidelines and development docs |
| **Code Comments** | **7/10** | Good inline documentation |
| **CONTRIBUTING.md** | **2/10** | Only 11 lines — critical gap |

### Specification Compliance Analysis

**Alignment Areas**:
- ✅ Multi-LLM abstraction layer (NFR-POC-11)
- ✅ Triple-path pipeline (Orchestrated, Monolithic Canonical, Monolithic Dynamic)
- ✅ Quality Gates 1 & 4 implemented
- ✅ 7-point verdict scale (evolved from 4-point spec)
- ✅ KeyFactors (evolved from Scenarios concept)
- ✅ "Start Simple" philosophy mostly followed

**Gap Areas**:
- ❌ POC1 success criteria never validated
- ❌ v2.8 prompts deployed without A/B testing (violates "measure first")
- ❌ Some premature features built (parallel verdicts for scale, not needed in POC)
- ❌ Quality Metrics Dashboard (NFR13) not implemented
- ❌ LLM fallback not implemented (documented but not built)
- ❌ Security gaps (NFR12 not fully implemented)

### Organization Documentation

**Note**: `Docs/FactHarbor_Organisation_20.Jan.26.xar` exists but was not fully explored in this workshop. It likely contains:
- Governance structure
- Decision-making processes
- Community guidelines
- Financial transparency requirements
- Code of Conduct specifications
- Contribution policies

**Recommendation**: Extract and review organization documentation in Month 2 to inform community building.

### Workflow for Specification Sync

The project uses Python scripts for xWiki ↔ JSON conversion:
- **Import**: `scripts xWiki/xwiki_xar_to_fulltree_generic.py`
- **Export**: `scripts xWiki/xwiki_fulltree_to_xar_ROBUST.py`
- **Rules**: `Docs/AGENTS/GlobalMasterKnowledge_for_xWiki.md` (comprehensive rules for AI editing)

**Sync Strategy**:
- **xWiki**: Authoritative for specifications, requirements, roadmap ("what to build")
- **Git Docs/**: Authoritative for implementation status, known issues ("what is built")
- Bi-directional sync recommended quarterly

---

# WORKSHOP CONCLUSION

## Critical Realignment Based on Specifications

**The most important finding from this workshop**: FactHarbor has comprehensive specifications (xWiki V0.9.70) that define a clear phased approach, but implementation has proceeded without validating phase success criteria.

### Key Specification Insights

1. **Development Philosophy**: "Validate AI automation quality BEFORE building production features"
   - Current status: **VIOLATED** — Built features without validating POC1

2. **Four-Phase Roadmap**: POC1 → POC2 → Beta 0 → V1.0
   - Each phase has explicit success criteria and decision gates
   - **Cannot skip phases** — Must validate before proceeding
   - Current status: **At POC1, never validated**

3. **Start Simple Philosophy**: Add complexity only when metrics prove necessary
   - PostgreSQL alone until 10,000+ users (not multiple databases)
   - Simple roles until 100+ contributors (not complex reputation)
   - Deferred federation until proven necessary
   - Current status: **MOSTLY ALIGNED**, some premature features

4. **Comprehensive Requirements**: 50+ detailed requirements across phases
   - NFR11 (Quality Gates), NFR12 (Security), NFR13 (Metrics Transparency)
   - FR44-54 (ClaimReview, Corrections, Image Verification, etc.)
   - Current status: **POC1 requirements implemented but not validated**

### Revised Priority Order

**BEFORE THIS WORKSHOP**:
1. Connect built infrastructure (metrics, parallel verdicts)
2. Build new features (claim caching, normalized DB)
3. Community and marketing

**AFTER SPECIFICATION REVIEW**:
1. **VALIDATE POC1** (BLOCKING) — Test hallucination rate, quality gates effectiveness
2. Connect built infrastructure (quick wins)
3. **POC1 → POC2 decision** (GO/NO-GO based on data)
4. Community infrastructure (enable growth)
5. **Only if POC1 validated**: Plan POC2 features
6. **Only if POC2 validated**: Plan Beta 0 features

## Summary of Decisions

### Immediate Decisions (Blocking)

1. **Approve $300 validation budget** (increased from $200 to cover comprehensive testing) — **SPONSOR ACTION REQUIRED**
2. **Execute POC1 validation sprint** (Weeks 1-3) — **BLOCKING all other work**
3. **Week 3: POC1 → POC2 GO/NO-GO decision** — **TEAM DECISION REQUIRED**

### If POC1 Validation Passes (GO Decision)

4. **Immediate integration** of metrics, parallel verdicts, tiered routing (Week 1 parallel to testing)
5. **Community infrastructure** as foundation for growth (Week 2)
6. **Public demo deployment** to enable visibility (Week 3-4)
7. **Plan POC2 features** (Month 2-3)

### If POC1 Validation Fails (NO-GO Decision)

4. **Iterate on prompts** based on failure analysis
5. **Adjust quality gate thresholds** based on data
6. **Re-execute validation** until criteria met
7. **Do NOT proceed** to POC2 or community outreach until validated

## Next Steps

### Week 1 Actions (Parallel Execution)

| Role | Action | Priority |
|------|--------|----------|
| **Sponsor** | Approve $300 validation budget | P0 (BLOCKING) |
| **Product Owner** | Create 30-article test set | P0 (BLOCKING) |
| **Lead Developer** | Integrate metrics (quick win) | P0 (parallel) |
| **Lead Developer** | Execute baseline quality testing | P0 (BLOCKING) |
| **Lead Developer** | Enable parallel verdicts (quick win) | P1 (parallel) |
| **Product Manager** | Document testing methodology | P1 |

### Week 2 Actions

| Role | Action | Priority |
|------|--------|----------|
| **Lead Developer** | Execute v2.8 A/B validation | P0 (BLOCKING) |
| **Product Owner** | Manual hallucination verification | P0 (BLOCKING) |
| **Product Owner** | Expand CONTRIBUTING.md | P1 |
| **Product Owner** | Add CODE_OF_CONDUCT.md | P1 |
| **Lead Developer** | Create issue/PR templates | P1 |

### Week 3 Actions

| Role | Action | Priority |
|------|--------|----------|
| **Product Owner** | Document POC1 validation results | P0 (BLOCKING) |
| **Team** | **POC1 → POC2 GO/NO-GO DECISION** | P0 (BLOCKING) |
| **Lead Developer** | Deploy demo (if GO decision) | P1 |
| **Product Manager** | Set up sponsorship infrastructure | P1 |

### Week 4+ Actions (Conditional on GO Decision)

- See **12-Month Roadmap** for phased execution plan
- If NO-GO: Iteration cycle on prompts and retesting

---

# APPENDIX A: DETAILED ROLE-BASED ACTION PLANS

## Principal Software Architect Action Items

| Priority | Action | Deliverable | Timeframe |
|----------|--------|-------------|-----------|
| P0 | Review security gaps for deployment | Security remediation plan | Week 1 |
| P0 | Approve metrics integration approach | Technical sign-off | Day 1 |
| P1 | Design claim caching architecture | Architecture document | Month 2 |
| P1 | Plan async job processing migration | Migration strategy | Month 3 |
| P2 | Design normalized database schema | ERD and migration plan | Month 4 |
| P2 | Define horizontal scaling approach | Scaling document | Month 5 |

**Key Decisions to Make**:
1. Redis vs PostgreSQL for job queue
2. Cache invalidation strategy for claims
3. Database normalization priority vs new features

## Lead Developer Action Items

| Priority | Action | Deliverable | Timeframe |
|----------|--------|-------------|-----------|
| P0 | Integrate metrics hooks | Working metrics dashboard | Day 1 |
| P0 | Enable parallel verdicts | Faster analysis | Day 2 |
| P0 | Enable tiered LLM routing | Cost reduction | Day 2 |
| P0 | Run baseline tests | Test results report | Week 1 |
| P1 | Create issue/PR templates | `.github/` templates | Week 2 |
| P1 | Deploy demo instance | Live demo URL | Week 3-4 |
| P2 | Implement SSRF protection | Secure URL fetching | Month 2 |
| P2 | Add rate limiting | Protected endpoints | Month 2 |

## Product Owner Action Items

| Priority | Action | Deliverable | Timeframe |
|----------|--------|-------------|-----------|
| P0 | Expand CONTRIBUTING.md | 500+ line guide | Week 2 |
| P0 | Add CODE_OF_CONDUCT.md | Community standards | Week 2 |
| P1 | Pre-load demo examples | 5+ analysis examples | Week 3-4 |
| P1 | Write user stories for Quality Gate UI | Acceptance criteria | Week 2 |
| P2 | Create comparison matrix | FactHarbor vs competitors | Month 1 |
| P2 | Draft case studies | 3 use case documents | Month 2 |

## Product Manager Action Items

| Priority | Action | Deliverable | Timeframe |
|----------|--------|-------------|-----------|
| P0 | Set up FUNDING.yml | Sponsorship infrastructure | Week 2 |
| P1 | Create 2-min explainer video | YouTube/Vimeo link | Week 3-4 |
| P1 | Launch GitHub Discussions | Community channel | Week 3 |
| P2 | Draft press release | Launch materials | Month 2 |
| P2 | Identify partnership targets | Outreach list | Month 2 |

## Main Sponsor Action Items

| Priority | Action | Deliverable | Timeframe |
|----------|--------|-------------|-----------|
| P0 | Approve $200 validation budget | Budget approval | Day 1 |
| P1 | Define funding model | FUNDING_GOALS.md | Month 1 |
| P1 | Identify foundation targets | Grant application list | Month 2 |
| P2 | Set up financial transparency | Monthly reports template | Month 2 |

---

# APPENDIX B: PROJECT STRENGTHS ANALYSIS

## Licensing Strategy (Excellent)

The multi-license model demonstrates sophisticated governance thinking:

| Content Type | License | Rationale |
|--------------|---------|-----------|
| Documentation | CC BY-SA 4.0 | Ensures transparency preserved |
| Code (Default) | MIT | Maximum adoption |
| Code (Core/AKEL) | AGPL-3.0 | Prevents black-box network services |
| Structured Data | ODbL | Prevents proprietary data capture |

**Sponsor Appeal**: Strong governance foundation for institutional funding.

## Documentation Quality (Exceptional)

- **28+ comprehensive files** covering all aspects
- **Living documentation** with version tracking
- **Clear entry points** for different audiences
- **AGENTS.md** for AI coding assistants (innovative)

## Technical Architecture (Solid)

- **Multi-LLM provider support** (no vendor lock-in)
- **Triple-path pipeline** (flexibility for different use cases)
- **Quality Gates** (transparency in methodology)
- **7-point verdict scale** (nuanced verdicts)

---

# APPENDIX C: xWIKI SPECIFICATION ANALYSIS

## Specification vs. Implementation Alignment

The xWiki documentation (XAR files) contains the authoritative specifications. Key alignment gaps identified:

### POC1 Specification Status

| Spec Requirement | Spec Value | Implementation v2.6.33 | Status |
|------------------|------------|------------------------|--------|
| **Verdict Scale** | 4-point (WELL-SUPPORTED → REFUTED) | 7-point symmetric (TRUE → FALSE) | EVOLVED |
| **Scenarios** | Explicit entities | Replaced with **KeyFactors** (emergent decomposition) | EVOLVED |
| **Gate 1** | Claim Validation | Implemented | ALIGNED |
| **Gate 4** | Verdict Confidence | Implemented | ALIGNED |
| **Gates 2-3** | Evidence relevance, Scenario coherence | Deferred | ALIGNED (per spec) |
| **Redis Caching** | Required for Stage 2 | Not implemented | GAP |
| **Normalized Tables** | Claims, Verdicts, Sources | JSON blob storage | GAP |
| **LLM Abstraction** | Multi-provider with failover | Multi-provider, no failover | PARTIAL |

### POC1 Success Criteria (from xWiki)

The specification defines POC success as:
- **<10% hallucination rate** (manual verification)
- **0 verdicts published with <2 sources**
- **0 opinion statements published as facts**
- **Average quality score ≥7.0/10**
- **AI quality ≥70%** for GO decision

**Current Status**: These criteria have not been formally measured — A/B testing never executed.

### xWiki Documentation Structure

The xWiki XAR files contain:
```
FactHarbor/
├── WebHome (Vision, Mission, Overview)
├── Specification/
│   ├── POC/
│   │   ├── Requirements (FR-POC-1 through FR-POC-7, NFR-POC-1 through NFR-POC-5)
│   │   ├── API-and-Schemas
│   │   └── Article-Verdict-Problem
│   ├── Requirements/ (Full system FR, NFR)
│   ├── Architecture/
│   └── AI Knowledge Extraction Layer (AKEL)/
└── Roadmap/
    ├── POC1 (Core Workflow with Quality Gates)
    ├── POC2 (Scenarios, Evidence Display)
    ├── Beta0
    └── V10
```

### Key POC1 Philosophy (from Spec)

> "Build Less, Learn More" — Minimum features to test hypothesis
> "Fail Fast" — Quick test of hardest part (AI capability)
> "Automation First" — No manual editing allowed; tests scalability

This philosophy is correctly implemented in the current codebase.

---

# APPENDIX B: FULL XWIKI RECOMMENDATIONS

## xWiki Documentation Sync

The xWiki documentation and the Git repository should be kept in sync:

| Source | Contains | Sync Direction |
|--------|----------|----------------|
| **xWiki (XAR)** | Specifications, Requirements, Roadmap | Authoritative for "what to build" |
| **Git (Docs/)** | Implementation docs, status, known issues | Authoritative for "what is built" |

### Recommended Actions

1. **Update xWiki spec** to reflect v2.6.33 implementation decisions:
   - 7-point verdict scale (documented as "current implementation" in spec)
   - KeyFactors replacing Scenarios
   - Quality Gates 1 & 4 implemented

2. **Add to xWiki**:
   - Documentation_Inconsistencies.md findings
   - Current metrics and performance data
   - Community growth metrics

3. **Maintain sync** via:
   - `scripts xWiki/xwiki_xar_to_fulltree_generic.py` for import
   - `scripts xWiki/xwiki_fulltree_to_xar_ROBUST.py` for export
   - See `Docs/AGENTS/GlobalMasterKnowledge_for_xWiki.md` for rules

---

# APPENDIX E: WORKSHOP DISCUSSION NOTES

## Day 1, Morning: Discovery & Codebase Analysis

**Team Discussion: What's the current state?**

**Principal Architect**: "The architecture is fundamentally sound. We have a clean separation between the API (persistence) and Web (analysis) services. The triple-path pipeline gives us flexibility. But I'm concerned about three things: the synchronous job execution model won't scale, we have significant infrastructure built but not connected, and security gaps are blocking any public deployment."

**Lead Developer**: "Honestly, the metrics integration is 30 minutes of work. I don't know why we didn't ship it. Same with parallel verdicts and tiered routing — they're built, tested in isolation, but never plugged in. The v2.8 prompt optimization is my biggest concern: we deployed it without A/B testing, and we don't know if it helped or hurt quality."

**Product Owner**: "From a user perspective, the Quality Gate decisions are invisible. Users see the verdicts but not *why* certain claims were filtered. That's a transparency gap that contradicts our mission."

## Day 1, Afternoon: Problems Identification

**Team Discussion: What are the main blockers?**

**Product Manager**: "Community infrastructure is non-existent. Our CONTRIBUTING.md is 11 lines. No CODE_OF_CONDUCT. No issue templates. No sponsorship button. How can we attract contributors or sponsors with that first impression?"

**Main Sponsor**: "I agree. And we have no public demo. I can't show this to potential partners without asking them to set up a local development environment. That's a non-starter."

**Lead Developer**: "Security is also blocking. SSRF vulnerabilities in URL fetching, open admin endpoints, no rate limiting. We can't deploy publicly without fixing those."

## Day 2, Morning: Architecture & Technical Strategy

**Team Discussion: What should we build vs. connect?**

**Principal Architect**: "First priority: connect what we've already built. Metrics, parallel verdicts, tiered routing. That's low-hanging fruit with massive impact. Second: validate before scaling. Run those A/B tests before we promote the product."

**Lead Developer**: "I propose we spend Week 1 on integrations and validation. Week 2 on community infrastructure. Weeks 3-4 on demo deployment. Month 2 on security hardening."

**Product Owner**: "What about the Quality Gate UI? That's important for transparency."

**Principal Architect**: "Add it to Month 1, after the demo is deployed. It's user-facing polish, not blocking."

## Day 2, Afternoon: Marketing & Community Strategy

**Team Discussion: How do we promote and attract contributors?**

**Product Manager**: "Our differentiation is clear: 'Evidence Models, Not Simple Verdicts.' We show the full truth landscape. Competitors like Snopes and FullFact give binary verdicts. We show the reasoning."

**Main Sponsor**: "The multi-license strategy is also a differentiator. AGPL for core prevents black-box services. That resonates with transparency-focused funders."

**Product Owner**: "For contributors, we need a clear path: Good First Issues, clear CONTRIBUTING guide, responsive maintainers. We need to create that infrastructure before outreach."

**Product Manager**: "Demo first, then outreach. No one invests in a project they can't try."

## Day 3, Morning: Priorities & Roadmap

**Team Discussion: What's the 12-month plan?**

**Principal Architect**: "Q1 is stabilization and community. Q2 is growth and features. Q3 is expansion. Q4 is maturity and sustainability."

**Main Sponsor**: "I approve the $200 validation budget. That's critical. We need to know if v2.8 optimizations helped or hurt before we scale."

**Product Owner**: "For Q1, I propose these milestones:
- Month 1: Quick wins complete, community docs done
- Month 2: Demo live
- Month 3: Security hardened, 100 GitHub stars"

**Lead Developer**: "That's achievable. The technical work is mostly integration, not new development."

## Day 3, Afternoon: Final Decisions

**Team Consensus**:

1. **Immediate**: Approve $200 budget, begin Week 1 integrations
2. **Week 1**: Metrics, parallel verdicts, tiered routing, validation tests
3. **Week 2**: CONTRIBUTING.md, CODE_OF_CONDUCT, issue templates, FUNDING.yml
4. **Weeks 3-4**: Demo deployment, showcase materials
5. **Month 2**: Quality Gate UI, security hardening
6. **Month 3**: Rate limiting, persistent job queue, 100 stars target

**Action Owners**:
- **Sponsor**: Approve budget (Day 1)
- **Lead Dev**: Integrations and deployment
- **Product Owner**: Community documentation
- **Product Manager**: Sponsorship infrastructure and marketing materials
- **Architect**: Technical oversight and security review

---

*Workshop Report Prepared: 2026-01-21*
*Team: Principal Architect, Lead Developer, Product Owner, Product Manager, Main Sponsor*
*Sources: Code analysis, Docs/, xWiki XAR specifications*
