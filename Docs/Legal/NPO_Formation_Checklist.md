# FactHarbor NPO Formation Checklist

**Goal: Apply for Claude for Nonprofits (Anthropic/Goodstack) and OpenAI for Nonprofits ASAP**

> **Status update 2026-04-29**: Verein gegründet am 23. April 2026. Handelsregister-Anmeldung persönlich eingereicht am 27. April 2026. Handelsregister-Eintragsbrief am 29. April 2026 erhalten; der Beleg bleibt in der privaten Legal-Ablage und wird nicht in diesem cleanen Public-Branch versioniert. UID / Firmennummer: `CHE-448.446.098`. ZKB-Antrag für das Vereinskonto versendet; der Bank-Beleg bleibt ebenfalls in der privaten Legal-Ablage. Öffentliche `SHAB` / `Zefix`-Sichtbarkeit kann noch nachziehen.

## What "Internationally Recognized NPO" Means In Practice

There is **no single global NPO registration**.

For FactHarbor, the practical recognition stack is:

1. **Swiss legal existence**: entry in the Zurich Commercial Register (`Handelsregister`)
2. **Swiss public-benefit / nonprofit recognition**: tax exemption for public-benefit purposes (`Steuerbefreiung wegen Gemeinnützigkeit`)
3. **International platform / donor verification**: Goodstack, TechSoup, Candid
4. **U.S. grantmaker recognition when needed**: NGOsource equivalency determination (`ED`)

## Exact Registration Order From Current State (29 April 2026)

1. **Verify the public commercial-register visibility**
   - Check `SHAB` / `Zefix`
   - Download the commercial-register excerpt as soon as the public entry is visible
2. **Open the Verein bank account**
   - Current status: ZKB application sent on `2026-04-29`
   - Use the entry letter, UID, statutes, founding protocol, and later the public excerpt if requested
3. **File for Zurich tax exemption**
   - Submit the tax-exemption form for public-benefit purposes
   - Attach: statutes, founding protocol, activity concept, and budget
   - Aim for inclusion in the Zurich list of tax-exempt institutions after approval
4. **Start the international recognition track**
   - **Goodstack** after commercial-register visibility and with an organization email
   - **TechSoup** after the Swiss legal setup is stable
   - **Candid** once mission, leadership, programs, and basic financial information are present
   - **NGOsource ED** only if you actively target U.S. foundations or U.S.-based institutional funders
5. **Start the provider / discount track**
   - See `Docs/Legal/AI_And_Search_Provider_Nonprofit_Programs_2026-04-29.md`
   - Use `Docs/Legal/Search_API_Nonprofit_Outreach_2026-04-29.md` for Serper / SerpApi manual outreach

## Critical Path (Blocking Claude for Nonprofits Application)

### Phase 1: Formation (Target: Week 1)

- [X] **Secure Swiss address** for Verein Sitz (personal, co-working, or registered office)
- [X] **Find one co-founder** (any nationality, age 18+, supports mission)
- [ ] **Have statutes reviewed by Swiss lawyer** (~CHF 500–1,500)
  - Statutes: `Docs/Legal/Vereinsstatuten_FactHarbor_DE.md` and `Docs/Legal/Vereinsstatuten_FactHarbor_EN.md`
  - Lawyer must confirm: purpose clause, dissolution clause, non-profit constraint
- [X] **Hold founding assembly** (23 April 2026, video conference)
  - Adopt statutes
  - Elect Governing Team (minimum: President + Treasurer)
  - Set membership fee
  - Sign founding minutes (both founders)
- [X] **Register domain** `factharbor.ch` (if not already done)
- [X] **Set up org email** `info@factharbor.ch` — needed for Goodstack agent verification

### Phase 2: Official Registration (Target: Weeks 1–3)

- [X] **Register in Handelsregister** (Commercial Register) — entry letter received 2026-04-29
  - Official Zurich filing page: https://www.zh.ch/de/wirtschaft-arbeit/handelsregister/verein/neu-eintragen.html
  - Official Zurich factsheet: https://www.zh.ch/content/dam/zhweb/bilder-dokumente/themen/wirtschaft-arbeit/handelsregister/verein/verein_merkblatt_neueintragung.pdf
  - Submit: German registration application, statutes, founding minutes / protocol, and signature-certification documents for new signatories as required
  - Filing path: paper or qualified electronic submission (`PDF/A`)
  - Processing: usually about 1 working week for review, then a few additional working days until visible in Zefix
  - Result so far: UID / Firmennummer assigned as `CHE-448.446.098`; public [zefix.ch](https://www.zefix.ch) visibility may still be pending
  - **This is practically required for Goodstack verification**
- [ ] **Open bank account** for the Verein
  - Current status: **ZKB account-opening application sent** on `2026-04-29`
  - Supporting bank PDF retained in the private legal archive
  - Swiss bank path currently used: **ZKB**
  - Bring / provide: statutes, founding minutes / protocol, ID of signatories, and ideally the commercial-register excerpt once available
  - Next success artifact: bank statement or official bank document in PDF form (needed later for some Goodstack checks)

#### Exact Handelsregister Filing Pack For FactHarbor

- `Create`: **Anmeldung Verein, Neueintragung** (official Zurich form, in German)
- `Use`: **final signed German statutes PDF**
  - Current source: `Docs/Legal/Vereinsstatuten_FactHarbor_DE.md`
  - Current print/sign base: `Docs/Legal/Vereinsstatuten_FactHarbor_DE_unterschriftsfassung.pdf`
- `Use`: **final signed founding protocol PDF**
  - Base file: `Docs/Legal/Gruendungsprotokoll_FactHarbor_2026-04-23.pdf`
  - Before filing, make sure the final version includes the actual `Beginn` / `Ende` times and signatures
- `Create`: **Wahlannahmeerklärung Vorstand**
  - Can be omitted only if the board members' acceptance of election is already clearly documented in the founding protocol in a way accepted by the Handelsregisteramt
- `Create`: **Protokoll Vorstandsitzung, Konstituierung und Zeichnungsberechtigung**
  - This is the safest route because the Zurich filing page lists it explicitly
  - Use it to confirm the board constitution and the signatory rule (`Kollektivunterschrift zu zweien`)
- `Create`: **Erklärung der Vereinsnatur**
- `Prepare`: **ID copies** for each person to be entered in the register
  - For FactHarbor currently: Robert Schaub and Stefanie Schaub-Hehr
- `Prepare`: **beglaubigte Unterschriftenmuster** for each new signatory
  - Can be certified by Notariat, Stadt- oder Gemeindeammannamt, or at the Handelsregisteramt counter
- `Only if needed`: **Domizilannahmeerklärung**
  - Only if the registered address is a `c/o` address rather than your own actual legal domicile
- `Only if needed`: **members list**
  - Only if the statutes provided for personal liability or additional contribution obligations of members

#### Recommended Order For Assembly

1. Finalize and sign the German statutes
2. Finalize and sign the founding protocol
3. Prepare the board acceptance and constituting-board documents
4. Get signature certifications for the signatories
5. Complete the Zurich registration form
6. Submit the full package together

### Phase 3: Tax-Exempt Status (Target: Weeks 2–12, parallel)

- [ ] **Prepare tax-exemption application** (Gesuch um Steuerbefreiung)
  - Submit to cantonal Steueramt of your Sitz canton
  - Documents: completed form, statutes, founding minutes, activity description / concept, budget projection
  - Processing: 4–12 weeks
  - Result: stronger legal nonprofit status and possible inclusion in the public Zurich list of tax-exempt institutions
  - **Not a blocker for Goodstack** but strongly recommended for long-term donor and foundation credibility

### Phase 4: Claude for Nonprofits Application (Target: ~Week 5-6)

**Prerequisites before applying:**

- [ ] Verein registered on zefix.ch (Handelsregister entry visible) — entry letter received 2026-04-29; verify public Zefix visibility if needed
- [X] Org email `info@factharbor.ch` set up (for Goodstack agent verification)
- [ ] Statutes PDF ready (signed, dated 30+ days before application)
- [ ] Bank statement PDF ready (original electronic, dated 30+ days before application)
- [X] UID assigned: `CHE-448.446.098`

**Application steps:**

- [ ] Go to [Claude for Nonprofits](https://claude.com/solutions/nonprofits)
- [ ] Complete Goodstack validation form (2–3 minutes)
  - Goodstack will verify: org exists in registry, compliance checks, eligibility, agent email
- [ ] If additional docs requested: upload statutes PDF + bank statement PDF
- [ ] Receive eligibility confirmation email from Anthropic
- [ ] Sign up using verified email — select "With my team" (minimum 5 seats)
- [ ] Complete Team plan setup ($8/user/month with 75% discount)

### Phase 4b: OpenAI for Nonprofits Application (Target: parallel to Phase 4)

**Prerequisites before applying:**

- [ ] Verein registered on zefix.ch (same as Phase 4; entry letter received 2026-04-29)
- [X] Org email `info@factharbor.ch` set up
- [X] UID assigned: `CHE-448.446.098`

**OpenAI ChatGPT Business (NPO pricing):**

- [ ] Go to [OpenAI for Nonprofits](https://openai.com/index/introducing-openai-for-nonprofits/)
- [ ] Complete Goodstack validation (same verification as Anthropic — one validation covers both)
- [ ] Receive eligibility confirmation from OpenAI
- [ ] Sign up for ChatGPT Business — NPO discount applies automatically at checkout
- [ ] Pricing: **$8/month/seat** (annual) or **$10/month/seat** (monthly), down from ~$25-30

**OpenAI ChatGPT Enterprise (up to 75% off):**

- [ ] Contact OpenAI sales team for Enterprise NPO pricing (up to **75% discount**)
- [ ] Only relevant if FactHarbor needs large-scale ChatGPT deployment

**OpenAI API Credits:**

- [ ] Apply for **Researcher Access Program** — up to **$1,000 API credits** for approved projects
  - Requires active affiliation with university, research org, or qualifying nonprofit
- [ ] Monitor **OpenAI Nonprofit Fund** for next open application cycle
  - Previous cycle: $40.5M distributed to 208 US-based NPOs (closed Oct 2025)
  - Current phase: board-directed grants (early 2026)
  - Note: Previous cycle was US-only — check eligibility for Swiss Verein in future cycles

**Important**: OpenAI API discounts are **not stackable** — the single largest discount applies, not a sum. This is different from Anthropic/Cloud where stacking is possible.

### Phase 5: International Verification And Funder Visibility (Target: after Swiss base is stable)

- [ ] **Claim Goodstack nonprofit profile**
  - Needs an officially verifiable organization and representative
  - Use the legal name exactly as registered
- [ ] **Apply for TechSoup validation**
  - Useful for software programs and broader NGO validation
- [ ] **Claim Candid profile**
  - Add mission, leadership, programs, website, and later financials / impact data
- [ ] **Prepare NGOsource ED package if U.S. foundation fundraising becomes a priority**
  - Relevant mainly for U.S. institutional philanthropy, not for Swiss legal formation itself
- [ ] **Use the search/API outreach templates if special pricing is worth pursuing**
  - See: `Docs/Legal/Search_API_Nonprofit_Outreach_2026-04-29.md`
- [ ] **Use the AI/search provider program reference for priority applications**
  - See: `Docs/Legal/AI_And_Search_Provider_Nonprofit_Programs_2026-04-29.md`

---

## Document Inventory


| Document                    | Status      | Location                                            |
| ----------------------------- | ------------- | ----------------------------------------------------- |
| Statutes (EN)               | **READY**   | `Docs/Legal/Vereinsstatuten_FactHarbor_EN.md`      |
| Statutes (DE)               | **READY**   | `Docs/Legal/Vereinsstatuten_FactHarbor_DE.md`      |
| Founding Assembly Minutes   | **READY**   | `Docs/Legal/Gruendungsprotokoll_FactHarbor_2026-04-23.pdf` |
| Handelsregister Application | **COMPLETED** | Submitted 2026-04-27                               |
| Handelsregister Entry Letter | **READY**  | Retained in private legal archive |
| UID / Firmennummer | **READY** | `CHE-448.446.098` |
| ZKB Account Opening Application | **READY** | Retained in private legal archive |
| AI/Search Provider Programs | **READY** | `Docs/Legal/AI_And_Search_Provider_Nonprofit_Programs_2026-04-29.md` |
| Search/API Outreach Templates | **READY** | `Docs/Legal/Search_API_Nonprofit_Outreach_2026-04-29.md` |
| Tax-Exemption Application   | Not started | —                                                  |
| Budget Projection           | Not started | —                                                  |
| Activity Description        | Not started | —                                                  |
| Bank Statement (PDF)        | Not started | —                                                  |

## Key Contacts to Arrange


| Who                         | Why                                      | When                             |
| ----------------------------- | ------------------------------------------ | ---------------------------------- |
| Swiss lawyer (Rechtsanwalt) | Review statutes, advise on tax exemption | ASAP — Week 1                   |
| Notariat / Gemeindeammannamt / HRA Schalter | Signature certification for signatories | Before Handelsregister filing |
| Swiss bank                  | Verein account opening                   | After founding assembly          |
| Cantonal Steueramt          | Tax-exempt application                   | After founding + Handelsregister |
| Goodstack support           | If verification issues arise             | After applying                   |

## Cost Estimate (Formation Phase)


| Item                                                    | Estimated Cost                          |
| --------------------------------------------------------- | ----------------------------------------- |
| Swiss lawyer (statute review)                           | CHF 500–1,500                          |
| Handelsregister registration                            | CHF ~150                                |
| Domain registration (factharbor.ch)                     | CHF 15–30/year                         |
| Email hosting for info@factharbor.ch (ProtonMail etc.) | CHF 0–48/year                          |
| Bank account                                            | CHF 0 (many banks free for Verein)      |
| Claude for Nonprofits (5 seats)                         | ~$10/month ($2/seat after 75% discount) |
| **Total one-time**                                      | **~CHF 700–1,700**                     |

## Timeline Summary

```
2026-04-23:  ✅ Founding assembly held
2026-04-27:  ✅ Handelsregister filing submitted (in person)
2026-04-29:  ✅ Handelsregister entry letter received
2026-04-29:  ✅ UID assigned: CHE-448.446.098
2026-04-29:  ✅ ZKB bank-account application sent; PDF retained in private legal archive
~2026-04-30: Verify Zefix visibility / download excerpt if already public
~2026-05-05: Bank account opening confirmation / first bank document (expected next artifact)
~2026-05-23: 30-day doc age met → Apply Goodstack (covers both Anthropic + OpenAI)
~2026-05-24: Goodstack verified (1-72 hours) → Claude for Nonprofits + OpenAI for Nonprofits
Parallel:    Tax-exempt application, TechSoup, AWS/Google credits
```

## Key Official Sources

- Zurich Commercial Register, new association registration:
  https://www.zh.ch/de/wirtschaft-arbeit/handelsregister/verein/neu-eintragen.html
- Zurich Commercial Register factsheet for new association registration:
  https://www.zh.ch/content/dam/zhweb/bilder-dokumente/themen/wirtschaft-arbeit/handelsregister/verein/verein_merkblatt_neueintragung.pdf
- Zurich tax exemption for legal entities:
  https://www.zh.ch/de/steuern-finanzen/steuern/steuern-juristische-personen/steuerwissen-juristische-personen/steuerbefreiung-fuer-eine-juristische-person-beantragen.html
- Zurich practice note `ZStB 61.1`:
  https://www.zh.ch/de/steuern-finanzen/steuern/treuhaender/steuerbuch/steuerbuch-definition/zstb-61-1.html
- Zurich list of tax-exempt institutions:
  https://www.zh.ch/de/steuern-finanzen/steuern/steuern-juristische-personen/steuerwissen-juristische-personen.html
- Goodstack verification requirements:
  https://help.goodstack.org/hc/en-us/articles/28236947821585-What-documents-does-Goodstack-require-to-verify-my-organization-s-nonprofit-status
- TechSoup validation overview:
  https://page.techsoup.org/validation-services2
- Candid profile / transparency:
  https://candid.org/claim-nonprofit-profile/how-to-earn-a-candid-seal-of-transparency/
- NGOsource background / ED ecosystem:
  https://tenyears.ngosource.org/
- OpenAI for Nonprofits:
  https://openai.com/index/introducing-openai-for-nonprofits/
- OpenAI for Nonprofits — Help Center:
  https://help.openai.com/en/articles/9359041-openai-for-nonprofits
- Goodstack — OpenAI discount details:
  https://goodstack.org/software-discounts/openai
