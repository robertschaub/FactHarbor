# GitHub Private Repo Split Execution Plan

**Date:** 2026-04-29  
**Status:** Ready for execution  
**Scope:** Documentation, governance, legal, and admin-material access split for GitHub  
**Primary goal:** Move sensitive non-product material out of the public `FactHarbor` repository into a private companion repository without breaking the public docs site more than necessary.

---

## 1. Current Situation

- The current GitHub repository is the canonical product/code repository and is currently **public**.
- GitHub access is **repository-level**, not folder-level.
- This means private access control cannot be achieved inside the current repo with `CODEOWNERS`, branch protection, or rulesets.
- The repo already contains legal and banking-adjacent documents under [Docs/Legal](</C:/DEV/FactHarbor/Docs/Legal>), plus sensitive organisational xWiki pages under [Docs/xwiki-pages/FactHarbor/Organisation](</C:/DEV/FactHarbor/Docs/xwiki-pages/FactHarbor/Organisation>).
- The public docs site is deployed from the current repo via [.github/workflows/deploy-docs.yml](</C:/DEV/FactHarbor/.github/workflows/deploy-docs.yml:1>) and heavily depends on the `Docs/xwiki-pages/FactHarbor/**` tree.
- The public docs site also contains redirect aliases and cross-links into legal/governance pages, documented in [Docs/Links_Inventory.md](</C:/DEV/FactHarbor/Docs/Links_Inventory.md:7>).

**Implication:** this is a **forward cutover** problem, not a path-permissions problem.

---

## 2. Target State

### 2.1 Recommended repository layout

1. **Public main repo:** `FactHarbor`
   - Product code
   - Public technical docs
   - Public-facing organisation pages that should remain citable
   - Public docs-site deployment

2. **Private companion repo:** `FactHarbor-internal`
   - Legal documents
   - Banking and registration material
   - Internal governance and operations pages
   - Sensitive nonprofit application material

3. **Optional later repo:** `FactHarbor-private-strategy`
   - Only if the internal repo becomes too broad
   - Use later for grants, partnership strategy, and internal planning

### 2.2 Access model

- Put both repos in a **GitHub organization**
- Set organization base permission to `none`
- Manage access through teams, not per-person ad hoc grants
- Minimum team model:
  - `fh-admins` → admin on `FactHarbor-internal`
  - `fh-core` → write on public `FactHarbor`
  - `fh-contributors` → write/triage on public `FactHarbor` only
- Disable private forking on the private repo

---

## 3. Path Manifest

This plan uses an explicit manifest, not a blanket move of all `Organisation/**`.

### 3.1 Keep in public `FactHarbor`

- [apps](</C:/DEV/FactHarbor/apps>)
- [packages](</C:/DEV/FactHarbor/packages>)
- [scripts](</C:/DEV/FactHarbor/scripts>)
- [tools/vscode-xwiki-preview](</C:/DEV/FactHarbor/tools/vscode-xwiki-preview>)
- [Docs/ARCHITECTURE](</C:/DEV/FactHarbor/Docs/ARCHITECTURE>)
- [Docs/DEVELOPMENT](</C:/DEV/FactHarbor/Docs/DEVELOPMENT>)
- [Docs/Specification](</C:/DEV/FactHarbor/Docs/Specification>)
- [Docs/USER_GUIDES](</C:/DEV/FactHarbor/Docs/USER_GUIDES>)
- Public product/specification xWiki pages such as [Atomic Claim Selection and Validation](</C:/DEV/FactHarbor/Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/Deep Dive/Atomic Claim Selection and Validation/WebHome.xwiki>)
- Public organisational presentation pages that are intentionally shareable, including [Funding](</C:/DEV/FactHarbor/Docs/xwiki-pages/FactHarbor/Organisation/Partner & User Relations/Presentations/Funding/WebHome.xwiki>)
- Public docs-site infrastructure:
  - [Docs/xwiki-pages/scripts](</C:/DEV/FactHarbor/Docs/xwiki-pages/scripts>)
  - [Docs/Links_Inventory.md](</C:/DEV/FactHarbor/Docs/Links_Inventory.md>)
  - [.github/workflows/deploy-docs.yml](</C:/DEV/FactHarbor/.github/workflows/deploy-docs.yml>)

### 3.2 Move now to `FactHarbor-internal`

- Selected non-statute files under [Docs/Legal](</C:/DEV/FactHarbor/Docs/Legal>)
- [Docs/xwiki-pages/FactHarbor/Organisation/Legal and Compliance/Finance and Compliance](</C:/DEV/FactHarbor/Docs/xwiki-pages/FactHarbor/Organisation/Legal and Compliance/Finance and Compliance>)
- [Docs/xwiki-pages/FactHarbor/Organisation/Governance/Transition Model](</C:/DEV/FactHarbor/Docs/xwiki-pages/FactHarbor/Organisation/Governance/Transition Model>)
- [Docs/xwiki-pages/FactHarbor/Organisation/Governance/Operational Readiness](</C:/DEV/FactHarbor/Docs/xwiki-pages/FactHarbor/Organisation/Governance/Operational Readiness>)
- Partner-specific meeting-prep bundle:
  - [Docs/Meetings/Call_Prep_Catherine_Gilbert.md](</C:/DEV/FactHarbor/Docs/Meetings/Call_Prep_Catherine_Gilbert.md>)
  - [Docs/Meetings/2026-04-22_ZHAW_Meeting_Prep.md](</C:/DEV/FactHarbor/Docs/Meetings/2026-04-22_ZHAW_Meeting_Prep.md>)
  - [Docs/Meetings/2026-04-22_ZHAW_Kurzreader.md](</C:/DEV/FactHarbor/Docs/Meetings/2026-04-22_ZHAW_Kurzreader.md>)
  - [Docs/Knowledge/Meeting_Prep_Schimanski_2026-03-18.md](</C:/DEV/FactHarbor/Docs/Knowledge/Meeting_Prep_Schimanski_2026-03-18.md>)
  - [Docs/Knowledge/Meeting_Prep_Schimanski_2026-03-18_DE.md](</C:/DEV/FactHarbor/Docs/Knowledge/Meeting_Prep_Schimanski_2026-03-18_DE.md>)
- Explicit proposal drafts:
  - [Docs/Knowledge/Innosuisse_Projektentwurf_Live_Audio_Video_FactChecking_2026-03-18.md](</C:/DEV/FactHarbor/Docs/Knowledge/Innosuisse_Projektentwurf_Live_Audio_Video_FactChecking_2026-03-18.md>)
  - [Docs/Knowledge/Innosuisse_Antrag_LiveCheck_Draft_2026-03-18.docx](</C:/DEV/FactHarbor/Docs/Knowledge/Innosuisse_Antrag_LiveCheck_Draft_2026-03-18.docx>)

### 3.3 Review in Phase 2

These likely belong in a private repo, but should be reviewed after the first cutover:

- [Docs/Knowledge/Innosuisse_Bewerbung_Leitfaden.md](</C:/DEV/FactHarbor/Docs/Knowledge/Innosuisse_Bewerbung_Leitfaden.md>)
- [Docs/Knowledge/DIZH_Rapid_Action_Call_Leitfaden.md](</C:/DEV/FactHarbor/Docs/Knowledge/DIZH_Rapid_Action_Call_Leitfaden.md>)
- [Docs/Knowledge/Innosuisse_Antrag_LiveCheck_Innolink_Struktur_2026-03-18.md](</C:/DEV/FactHarbor/Docs/Knowledge/Innosuisse_Antrag_LiveCheck_Innolink_Struktur_2026-03-18.md>)
- [Docs/xwiki-pages/FactHarbor/Organisation/Strategy/Cooperation Opportunities](</C:/DEV/FactHarbor/Docs/xwiki-pages/FactHarbor/Organisation/Strategy/Cooperation Opportunities>)
- Selected internal [Docs/Meetings](</C:/DEV/FactHarbor/Docs/Meetings>) notes that contain partner/funder-sensitive content

---

## 4. Non-Negotiables

1. **Do not use submodules for the private docs split.**
   - They add clone/auth friction.
   - They complicate docs-site publishing.
   - They do not solve the real access problem.

2. **Do not rely on `CODEOWNERS` for secrecy.**
   - It controls review ownership, not read access.

3. **Do not move the whole `Organisation/` tree blindly.**
   - Public navigation and redirect aliases depend on it.

4. **Do not start with a history rewrite.**
   - Rewrite only if a separate security/privacy decision says public history itself must be cleaned.

5. **Assume already-committed sensitive files are already exposed to anyone who had repo read access.**

---

## 5. Execution Sequence

## Phase 0 — Freeze the cutover scope

**Goal:** lock the exact first-wave path manifest before any file movement.

Checklist:

- [ ] Confirm the Phase 1 move list in section 3.2
- [ ] Confirm whether the statutes and founding record should remain publicly citable
- [ ] Decide whether `Docs/Knowledge/*Innosuisse*` stays for Phase 2 or moves immediately
- [ ] Tag current public repo state before cutover

Commands:

```powershell
git tag pre-private-split-2026-04-29
git push origin pre-private-split-2026-04-29
```

Output:

- Immutable public checkpoint tag
- Finalized path manifest

---

## Phase 1 — Create the private repo and teams

**Goal:** create the new access boundary before moving any files.

Checklist:

- [ ] Create GitHub organization if FactHarbor is still under a personal account
- [ ] Set org base permission to `none`
- [ ] Create team `fh-admins`
- [ ] Create private repo `FactHarbor-internal`
- [ ] Give `fh-admins` admin access
- [ ] Disable private forking in repo settings

Command:

```powershell
gh repo create <org>/FactHarbor-internal --private --description "Sensitive legal, governance, and banking documents for FactHarbor"
```

Output:

- Empty private companion repo with least-privilege access

---

## Phase 2 — Bootstrap the private repo with current files

**Goal:** create a usable private working copy first, without deleting anything from the public repo yet.

Recommended approach for the first cut:

- Copy **current files only**
- Do **not** migrate history in the first pass
- Preserve the same relative `Docs/...` structure inside the private repo

Commands:

```powershell
git clone git@github.com:<org>/FactHarbor-internal.git ..\FactHarbor-internal

New-Item -ItemType Directory ..\FactHarbor-internal\Docs -Force | Out-Null

# Copy selected non-statute legal/admin files plus public-reference statute copies
robocopy ".\Docs\xwiki-pages\FactHarbor\Organisation\Governance\Transition Model" "..\FactHarbor-internal\Docs\xwiki-pages\FactHarbor\Organisation\Governance\Transition Model" /E
robocopy ".\Docs\xwiki-pages\FactHarbor\Organisation\Governance\Operational Readiness" "..\FactHarbor-internal\Docs\xwiki-pages\FactHarbor\Organisation\Governance\Operational Readiness" /E
robocopy ".\Docs\xwiki-pages\FactHarbor\Organisation\Legal and Compliance\Finance and Compliance" "..\FactHarbor-internal\Docs\xwiki-pages\FactHarbor\Organisation\Legal and Compliance\Finance and Compliance" /E
```

Then commit in the private repo:

```powershell
Set-Location ..\FactHarbor-internal
git add .
git commit -m "chore(docs): seed internal repository from public repo"
git push origin main
Set-Location ..\FactHarbor
```

Output:

- Working private repo containing the first-wave sensitive material

---

## Phase 3 — Inventory and rewrite public links before deletion

**Goal:** prevent public broken links and accidental docs-site gaps.

Why this is mandatory:

- The public docs site has redirect aliases such as `/LegalFramework/`, documented in [Docs/Links_Inventory.md](</C:/DEV/FactHarbor/Docs/Links_Inventory.md:7>)
- Public pages currently hard-link to files under `Docs/Legal`, for example:
  - [Legal Framework](</C:/DEV/FactHarbor/Docs/xwiki-pages/FactHarbor/Organisation/Legal and Compliance/Legal Framework/WebHome.xwiki:21>)
  - [Transparency Policy](</C:/DEV/FactHarbor/Docs/xwiki-pages/FactHarbor/Organisation/Legal and Compliance/Transparency-Policy.xwiki:27>)

Checklist:

- [ ] Search all references to `Docs/Legal`
- [ ] Search all links to moved xWiki pages
- [ ] Decide which public pages become:
  - public summary pages
  - “internal/private document” stubs
  - deleted links
- [ ] Keep public copies of statutes/founding record only if explicitly intended

Commands:

```powershell
rg -n "Docs/Legal|Legal Framework|Transparency Policy|Operational Readiness|Transition Model|Finance and Compliance" Docs .github README.md
rg -n "github.com/.*/Docs/Legal" Docs/xwiki-pages
```

Output:

- Link rewrite checklist
- Stub-page list

---

## Phase 4 — Public repo cutover branch

**Goal:** remove the now-private material from the public repo and replace only what must remain visible.

Checklist:

- [ ] Create a dedicated cutover branch
- [ ] Remove first-wave sensitive paths from the public repo
- [ ] Add stub/summary pages where public navigation still needs a landing page
- [ ] Rewrite or remove links found in Phase 3
- [ ] Review the docs site locally if needed

Commands:

```powershell
git checkout -b codex/private-admin-repo-cutover

# Remove only the selected private files from Docs/Legal
# Replace moved xWiki pages with public stubs instead of deleting whole trees
```

Validation:

- [ ] `rg -n "Docs/Legal|Finance and Compliance|Operational Readiness|Transition Model" Docs`
- [ ] Review [.github/workflows/deploy-docs.yml](</C:/DEV/FactHarbor/.github/workflows/deploy-docs.yml:1>) assumptions
- [ ] Trigger a docs-site preview if needed

Output:

- Public-repo cutover branch ready for review

---

## Phase 5 — Merge the cutover

**Goal:** make the public/private split live.

Checklist:

- [ ] Review branch diff carefully
- [ ] Confirm public pages still have valid navigation
- [ ] Confirm private repo contains the moved material
- [ ] Merge the public cutover branch

Post-merge:

- [ ] Re-run docs deployment if needed
- [ ] Audit GitHub repo access again

---

## Phase 6 — Optional history-sanitization decision

**This is a separate incident decision, not part of the first cutover by default.**

Start a history rewrite only if the public history contains material that genuinely should no longer be public, for example:

- banking documents
- scans/signatures
- home addresses or identity material
- confidential nonprofit/vendor paperwork

If this threshold is met:

- open a separate security/admin work item
- define the exact paths and commits to purge
- expect force-push disruption and stale clones

If this threshold is **not** met:

- stop after the forward cutover
- document that historic exposure cannot be undone for prior cloners

---

## 6. What Stays Public on Purpose

These are the main items that need an explicit decision rather than automatic removal:

- [Vereinsstatuten_FactHarbor_DE.md](</C:/DEV/FactHarbor/Docs/Legal/Vereinsstatuten_FactHarbor_DE.md>)
- [Vereinsstatuten_FactHarbor_EN.md](</C:/DEV/FactHarbor/Docs/Legal/Vereinsstatuten_FactHarbor_EN.md>)
- [Vereinsstatuten_FactHarbor_DE.pdf](</C:/DEV/FactHarbor/Docs/Legal/Vereinsstatuten_FactHarbor_DE.pdf>)
- [Vereinsstatuten_FactHarbor_EN.pdf](</C:/DEV/FactHarbor/Docs/Legal/Vereinsstatuten_FactHarbor_EN.pdf>)

Rule:

- Keep these in the public repo because FactHarbor intentionally wants the statutes publicly citable
- The founding record and admin attachments move private and may be replaced with short public summary pages

---

## 7. Definition of Done

This plan is complete when:

- [ ] Sensitive admin/legal docs are no longer present in the public repo tip
- [ ] The private companion repo exists and contains the moved material
- [ ] GitHub access is team-based in an organization
- [ ] Public docs links no longer point to removed private files
- [ ] The public docs site still builds successfully
- [ ] A separate explicit decision has been recorded on whether history rewrite is required

---

## 8. Recommended Immediate Next Actions

1. Create the GitHub organization-level private repo and `fh-admins` team when ready.
2. Execute Phases 2 and 3 before deleting anything from the public repo.
3. Keep the first cut small: use only the selected legal/admin files and the three xWiki pages.
4. Keep the statutes public by design.
5. Treat history rewrite as a later security decision, not as part of the normal docs move.

---

## 9. Sources

- GitHub access model: [Managing team access to an organization repository](https://docs.github.com/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/managing-team-access-to-an-organization-repository)
- Access removal caveat: [Managing an individual's access to an organization repository](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/managing-an-individuals-access-to-an-organization-repository)
- `CODEOWNERS` limitation: [About code owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- Private-submodule caution for Pages: [Using submodules with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-submodules-with-github-pages)
- Sensitive-data rewrite guidance: [Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- Local site/deploy dependencies: [Docs/Links_Inventory.md](</C:/DEV/FactHarbor/Docs/Links_Inventory.md:7>), [deploy-docs.yml](</C:/DEV/FactHarbor/.github/workflows/deploy-docs.yml:1>)
