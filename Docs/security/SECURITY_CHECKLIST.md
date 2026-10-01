# FactHarbor Security Checklist

> Historical assessment from 9 February 2026. Its implementation checklist is not the current security posture; see [Known issues — Security concerns](../STATUS/KNOWN_ISSUES.md#security-concerns) for verified controls and remaining gaps.

Quick reference checklist for maintaining security standards.

## 🎯 Critical Security Items

### Repository Security
- [x] ✅ Dependabot alerts enabled
- [x] ✅ Dependabot security updates enabled
- [x] ✅ Branch protection on `main` branch
- [x] ✅ CodeQL security scanning configured
- [x] ✅ CI/CD pipeline with automated builds
- [ ] ⏳ GitHub Secrets configured for CI/CD
- [ ] ⏳ Git history audited for leaked secrets

### Code Security
- [x] ✅ `.gitignore` properly configured for secrets
- [x] ✅ `.env.example` templates provided
- [x] ✅ API authentication via headers (`X-Runner-Key`, `X-Admin-Key`)
- [ ] ⏳ Constant-time comparison for API keys
- [ ] ⏳ Security headers middleware
- [ ] ⏳ SSRF protection implemented
- [ ] ⏳ Rate limiting on admin endpoints
- [ ] ⏳ Environment variable validation

### Dependencies
- [x] ✅ npm vulnerabilities resolved
- [x] ✅ Regular dependency updates scheduled
- [ ] ⏳ Lock file integrity verification in CI

### Monitoring
- [x] ✅ CodeQL scans weekly
- [x] ✅ Dependabot checks weekly
- [ ] ⏳ Security monitoring workflow
- [ ] ⏳ Audit logging implemented

## 📅 Maintenance Schedule

### Daily (Automated)
- [x] ✅ Dependabot monitors for new vulnerabilities
- [x] ✅ CodeQL scans on pull requests

### Weekly (Automated + Manual)
- [x] ✅ Scheduled CodeQL security scan (Mondays)
- [x] ✅ Dependabot version updates check
- [ ] ⏳ Review security alerts dashboard
- [ ] ⏳ Review and merge Dependabot PRs

### Monthly (Manual)
- [ ] Run `npm audit` manually
- [ ] Review audit logs (once implemented)
- [ ] Check for unauthorized access attempts
- [ ] Update `.env.example` if needed
- [ ] Review GitHub security advisories

### Quarterly (Manual)
- [ ] Comprehensive security review
- [ ] Rotate API keys and secrets
- [ ] Review access controls and permissions
- [ ] Update security documentation
- [ ] External security audit (production)

## 🚀 Pre-Deployment Checklist

### Before Production Deploy

#### Environment
- [ ] All secrets rotated from development values
- [ ] `FH_INTERNAL_RUNNER_KEY` set (32+ chars)
- [ ] `FH_ADMIN_KEY` set (32+ chars)
- [ ] All required API keys configured
- [ ] `NODE_ENV=production` set

#### Security Features
- [ ] Security headers middleware enabled
- [ ] Rate limiting configured
- [ ] SSRF protection enabled
- [ ] Constant-time auth comparison
- [ ] Audit logging enabled

#### Verification
- [ ] `npm audit` shows 0 high/critical vulnerabilities
- [ ] CodeQL scan passed
- [ ] No secrets in git history
- [ ] Security headers verified (curl test)
- [ ] Authentication tested
- [ ] Rate limiting tested

#### Documentation
- [ ] SECURITY.md updated with contact info
- [ ] Incident response procedures documented
- [ ] Security architecture documented
- [ ] Runbooks created for security incidents

## 🔍 Quick Security Audit Commands

```bash
# Check for vulnerabilities
npm audit
npm audit --audit-level=moderate

# Check git history for secrets
git log --all --full-history -- "**/*.env" "**/*.key" "**/*.pem"

# Verify security headers (server must be running)
curl -I http://localhost:3000/api/health

# Check lock file integrity
npm ci --audit=false

# Scan with TruffleHog (requires Docker)
docker run --rm -v "$(pwd):/repo" trufflesecurity/trufflehog:latest git file:///repo --only-verified
```

## ⚠️ Security Red Flags

Watch for these warning signs:

### Code Review Red Flags
- ❌ Hardcoded API keys or passwords
- ❌ `eval()` or `Function()` constructor usage
- ❌ SQL concatenation (SQL injection risk)
- ❌ Disabled security features (e.g., `--no-verify`)
- ❌ Overly permissive CORS settings
- ❌ Missing input validation
- ❌ Secrets committed to git

### Runtime Red Flags
- ❌ Repeated authentication failures (brute force)
- ❌ Unusual API access patterns
- ❌ Large number of requests from single IP
- ❌ Access to admin endpoints without auth
- ❌ Attempts to access internal URLs (SSRF)
- ❌ Suspicious user agents or referers

## 🎓 Security Resources

### Essential Reading
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)

### Tools
- [npm audit](https://docs.npmjs.com/cli/v10/commands/npm-audit)
- [TruffleHog](https://github.com/trufflesecurity/trufflehog)
- [Trivy](https://github.com/aquasecurity/trivy)
- [CodeQL](https://codeql.github.com/)

## 📊 Security Status Dashboard

| Area | Status | Last Check | Next Action |
|------|--------|------------|-------------|
| Dependencies | ✅ Clean | 2026-02-09 | Weekly auto-check |
| Code Scanning | ✅ Active | 2026-02-09 | Weekly auto-scan |
| Branch Protection | ✅ Enabled | 2026-02-09 | N/A |
| Secret Management | ⚠️ Review needed | - | Audit history |
| API Security | ⏳ In progress | - | Implement recommendations |
| Rate Limiting | ❌ Not implemented | - | Add to admin routes |
| Security Headers | ❌ Not implemented | - | Add middleware |
| SSRF Protection | ❌ Not implemented | - | Add URL validation |

**Legend:**
- ✅ Complete
- ⚠️ Needs attention
- ⏳ In progress
- ❌ Not started

---

**Quick Links:**
- [Full Security Recommendations](SECURITY_RECOMMENDATIONS.md)
- [Main Security Policy](../../SECURITY.md)
- [GitHub Security Dashboard](https://github.com/robertschaub/FactHarbor/security)

**Last Updated:** 2026-02-09
