# Draft Outreach Email — Prof. Dr. Mark Cieliebak (ZHAW)

**To:** ciel@zhaw.ch
**Subject:** Kooperationsanfrage: Automatisiertes Fact-Checking — Innosuisse-Projekt

---

Sehr geehrter Herr Professor Cieliebak,

mein Name ist Robert Schaub, ich bin Gründer von FactHarbor — einem Schweizer Software-Startup, das eine automatisierte Fact-Checking-Pipeline entwickelt. Ich wende mich an Sie, weil die Forschungsarbeit Ihrer NLP-Gruppe am CAI eine bemerkenswerte Überlappung mit unserer Produktentwicklung aufweist, und ich gerne Möglichkeiten einer Zusammenarbeit im Rahmen eines Innosuisse-Projekts ausloten würde.

**Zu FactHarbor**

Unser System analysiert beliebige Behauptungen — themenunabhängig und mehrsprachig — durch eine mehrstufige Pipeline:

1. Extraktion atomarer, verifizierbarer Aussagen aus Nutzereingaben
2. Automatisierte Evidenzrecherche über mehrere Web-Quellen
3. Evidenz-Extraktion und Quellenqualitätsbewertung
4. LLM-basiertes Debattenverfahren zur Verdiktgenerierung
5. Aggregation mit Konfidenz- und Qualitätsmetriken

Das System ist funktionsfähig und durchläuft derzeit die Pre-Release-Phase.

**Warum Ihre Gruppe**

Drei Arbeiten Ihres Teams haben mein besonderes Interesse geweckt:

- **HAMiSoN** — Claim Worthiness Checking, Stance Detection und multilinguales Claim Retrieval decken sich direkt mit unseren Pipeline-Stufen
- **ViClaim** (EMNLP 2025) — Ihr Ansatz zur multilingualen Claim Detection in verschiedenen Medienformaten
- **CheckThat! Lab** — Ihr 2. Platz bei der Multimodal Misinformation Detection zeigt praxisnahe Forschungskompetenz

Darüber hinaus hat mich Ihr Engagement für angewandte KI-Forschung mit Industriepartnern überzeugt — sowohl durch Ihre Rolle bei SpinningBytes als auch durch die bisherigen Innosuisse-Projekte Ihrer Gruppe.

**Forschungsperspektive**

Die Forschungskomponente, die ich mir vorstelle, liegt im Bereich **Resource-Efficient Fact Verification**: Wie lässt sich eine mehrstufige LLM-Pipeline (Claim-Extraktion → Evidenzrecherche → Verdikt-Debatte → Aggregation) mittels Knowledge Distillation in spezialisierte kleinere Modelle überführen, ohne die Verdiktqualität wesentlich zu beeinträchtigen? Dies berührt aktuelle Forschungsfragen rund um Evidence Sufficiency, Cross-Stage Distillation und multilinguale Robustheit unter Modellkompression — Themen, die auch durch die neuen Constraints des AVeriTeC 2025 Shared Task (<10B Parameter, <1 Min/Claim) an Relevanz gewinnen.

**Nächster Schritt**

Als konkreten Einstieg könnte ich mir einen **Innosuisse Innovation Cheque** vorstellen, um in einer Machbarkeitsstudie die Synergiepotenziale zwischen unserer Pipeline und Ihrer Forschung zu evaluieren — als Grundlage für ein mögliches grösseres Innovationsprojekt.

Wären Sie offen für ein kurzes Gespräch — per Videocall oder gerne auch vor Ort in Winterthur? Ich würde Ihnen dabei gerne unsere Pipeline im Detail zeigen und Ihre Einschätzung zu möglichen Forschungsfragen hören.

Herzliche Grüsse,
Robert Schaub
FactHarbor
[Kontaktdaten]

---

## Notes for Robert (not part of email)

**Tone choices:**
- Formal "Sie" throughout — appropriate for first contact with a Swiss professor
- References 3 specific works to demonstrate genuine engagement with his research (not a mass email)
- Frames the research question in terms Innosuisse reviewers would value (not "make our product faster" but "knowledge distillation for multi-stage claim verification")
- Proposes Innovation Cheque as low-commitment first step (CHF 15K, 100% Innosuisse-funded)
- Offers to meet in Winterthur (shows respect for his time/location)

**Optional additions:**
- Link to a FactHarbor demo or architecture overview if available
- Mention the digitalSwitzerland Dec 2024 report on "Countering Disinformation with AI" to frame societal relevance
- Reference SwissText 2026 if you plan to attend/submit

**If he asks "why not ETH/UZH?":**
- You can honestly say ZHAW's applied research profile and Innosuisse track record make them the natural fit for this type of industry collaboration
- Don't mention that Tobias/Leippold declined — just emphasize the positive match
