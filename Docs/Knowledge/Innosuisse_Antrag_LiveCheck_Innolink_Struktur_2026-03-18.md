# Innosuisse-Antrag v2 — Innovationsprojekt mit Umsetzungspartner

**Stand:** 18.03.2026
**Projektstatus:** ⚠️ ÜBERHOLT — Dieser Entwurf basierte auf einer geplanten Partnerschaft mit UZH (Schimanski/Leippold), die am 23.03.2026 nicht zustande kam. Die aktive Forschungspartnerschaft läuft nun mit **ZHAW CAI/NLP** (Giedemann/Cieliebak/Deriu) über DIZH Rapid Action Call + Innosuisse Cheque. Siehe [DIZH Leitfaden](DIZH_Rapid_Action_Call_Leitfaden.md) und [Innosuisse Leitfaden](Innosuisse_Bewerbung_Leitfaden.md).
**Förderinstrument:** Innovationsprojekte mit Umsetzungspartner
**Arbeitstitel:** **LiveCheck: Evidenzbasierte Echtzeit-Faktenprüfung für Audio- und Video-Inhalte**

> **Versionierung:** v1 (18.03.2026) = initiale Strukturierung. v2 (18.03.2026) = wissenschaftlich fundiert, alle Checklisten-Punkte adressiert, Literaturreview, quantitative Marktdaten, Wettbewerberanalyse, Budget, Forschungsfragen, messbare Meilensteine.

---

## 1. Projekttitel

**Deutsch:**
**LiveCheck: Evidenzbasierte Echtzeit-Faktenprüfung für Audio- und Video-Inhalte**

**Englisch:**
**LiveCheck: Evidence-Based Real-Time Fact-Checking for Audio and Video Streams**

---

## 2. Kurzbeschreibung des Innovationsprojekts

Ziel des Projekts ist die Entwicklung eines produktnahen Systems zur **echtzeitnahen, evidenzbasierten Faktenprüfung von Audio- und Video-Inhalten**. Das System soll laufende Inhalte aus Livestreams, Debatten, Interviews, Podcasts und Videos in verifizierbare Aussagen zerlegen, relevante Evidenz unter harten Zeitbudgets recherchieren, die Qualität dieser Evidenz mittels kalibrierter Bewertungsmechanismen einordnen und **vorläufige, transparent begründete und attribuierte Verifikationssignale mit expliziter Unsicherheitskommunikation** erzeugen.

Das Projekt baut auf der bestehenden **FactHarbor-Plattform** auf — einem funktionsfähigen, evidenzbasierten Faktenprüfungssystem auf Technology Readiness Level (TRL) 5-6 mit 1199 bestandenen Tests, einer 5-Schritt-LLM-Debattenarchitektur, 7 integrierten Suchmaschinen und über 200 konfigurierbaren Parametern. LiveCheck erweitert diese bewährte Architektur auf den grundlegend neuen Anwendungsbereich der **Echtzeit-Audio-/Video-Verarbeitung** (TRL 3→6).

Die wissenschaftliche Literatur identifiziert eine spezifische Forschungslücke: Bestehende Systeme sind entweder **schnell aber flach** (z.B. LiveFC: binäre Urteile, keine Evidenzqualitätsbewertung; Factiverse: ~80% Genauigkeit ohne publiziertes Evidenz-Framework) oder **tief aber langsam** (z.B. CLIMINATOR: 96% Genauigkeit, aber nur im Batch-Modus). Kein existierendes System kombiniert Echtzeitfähigkeit mit evidenzbasierter Attribution, kalibrierter Unsicherheit und Human-in-the-Loop-Eskalation (Vykopal et al. 2024; Guo et al. 2022).

Das Projekt adressiert damit **sieben dokumentierte Forschungslücken** (§3.5) und stellt gleichzeitig ein Innovationsprojekt mit klarer Verwertungsperspektive dar.

---

## 3. Die innovative Lösung

### 3.1 Innovative Aspekte der Lösung

Der innovative Kern des Projekts liegt in einer **integrierten Systemarchitektur für evidenzbasierte Live-Faktenprüfung**, die sieben technisch-wissenschaftliche Problemfelder erstmals zusammenführt:

1. **Streaming Claim Detection**
   Fortlaufende Erkennung verifizierbarer Aussagen in laufenden Audio-/Video-Streams mit Rolling-Window-Segmentierung, Sprecherdiarisierung und Incomplete-Utterance-Handling. Bisherige Systeme (ClaimBuster, CLEF CheckThat!) operieren auf vollständigen Sätzen/Dokumenten (Hassan et al. 2017; Barron-Cedeño et al. 2024).

2. **Low-Latency Evidence Retrieval mit Zeitbudgets**
   Evidenzsuche unter harten Zeitbudgets (Ziel: <15 Sekunden), die das bestmögliche Ergebnis innerhalb der Latenzgrenze liefert. FIRE (Xie et al., NAACL 2025) demonstriert iterative, konfidenzbasierte Retrieval mit 7.6× Kostenreduktion, operiert aber auf statischen Claims.

3. **Attribuierbare Live-Verifikation**
   Jede vorläufige Einschätzung ist auf konkrete Quellen und Evidenzfragmente zurückführbar. Warren et al. (CHI 2025) zeigen in Interviews mit Faktenprüfern, dass **Replizierbarkeit** — d.h. Links zu Quellen und Daten — die wichtigste Anforderung an automatisierte Systeme ist.

4. **Uncertainty-Aware Output mit konfidenzbasierter Kalibrierung**
   Live-Ausgaben mit expliziter, kalibrierter Unsicherheitskommunikation statt falsch präziser Soforturteile. FactHarbors bestehende Konfidenz-Kalibrierung (Density Anchor, Band Snapping, Verdict Coupling, Context Consistency) wird auf streaming-spezifische Anforderungen erweitert. Konforme Vorhersage (Conformal Prediction) für NLP ist als theoretischer Rahmen etabliert (TACL 2024 Survey), wurde aber nie auf Streaming-Predictions angewendet.

5. **Human-in-the-Loop-Eskalation in Echtzeit**
   Automatisierte Vorselektion und Priorisierung mit bewusst eingebautem Übergang zur menschlichen Überprüfung unter Latenzrestriktionen. Full Fact AI unterstützt 40+ Organisationen (333'000 Sätze/Tag), arbeitet aber asynchron (Kavtaradze 2024). LiveCheck entwickelt eine Echtzeit-Triage.

6. **Multi-Agenten-Debatte unter Zeitrestriktionen**
   FactHarbors bewährte 5-Schritt-Debattenarchitektur (Advocate → Self-Consistency → Challenger → Reconciler → Validation) mit Cross-Provider-Rollenzuweisung (Stammbach & Ash 2024). Bestehende Debatten-Frameworks (CLIMINATOR, Tool-MAD, DebateCV) operieren ohne Zeitrestriktionen. Die Adaption auf Echtzeit ist wissenschaftlich unerforscht.

7. **Produktionsnahe Evaluationsschicht**
   Systematische Messung von Latenz, Präzision, Recall, Attributionsqualität, Stabilität und Fehlertypen. **Kein standardisierter Benchmark für Live-Faktenprüfung existiert** (Venktesh & Setty 2024 evaluieren gegen PolitiFact als Einzelfallstudie). LiveCheck wird einen solchen Benchmark als wissenschaftlichen Beitrag entwickeln.

### 3.2 Erweiterung des Stands von Wissenschaft und Technik

#### Stand der Forschung — Automated Fact-Checking

Automated Fact-Checking hat sich als eigenständiges NLP-Forschungsfeld etabliert mit einem kanonischen Pipeline-Modell: (1) Claim Detection, (2) Evidence Retrieval, (3) Verdict Prediction, (4) Justification Production (Guo et al. 2022). Die jüngste Forschung zeigt drei Entwicklungsrichtungen:

**Multi-Agenten-Debatte für Verifikation:**
CLIMINATOR (Leippold et al., npj Climate Action 2025) erreicht 96% Genauigkeit bei Klimaaussagen mit einem Mediator-Advocate-Framework. Tool-MAD (arXiv 2026) führt werkzeugdiversifizierte Agenten mit adaptiver Retrieval ein (5.5% Verbesserung gegenüber State-of-the-Art). DebateCV (2025) erreicht 83.4% Genauigkeit mit einem Debater-Moderator-Ansatz. Du et al. (2023) zeigen grundlegend, dass Multi-Agenten-Debatte Halluzinationen signifikant reduziert. **Alle diese Systeme operieren im Batch-Modus ohne Zeitrestriktionen.**

**Evidenz-Retrieval und -Bewertung:**
FIRE (Xie et al., NAACL 2025) demonstriert iterative, konfidenzbasierte Evidenzsuche mit 7.6× Kostenreduktion und 16.5× Suchkostenreduktion bei vergleichbarer Qualität. DIRAS (Schimanski et al., NAACL 2025) zeigt, dass ein 8B-Modell mittels Wissensdistillation GPT-4-Niveau bei Relevanzbewertung erreicht. KG²RAG (NAACL 2025) reduziert Halluzinationen um 18% durch wissensgrafikgestützte Retrieval. **Keines dieser Systeme adressiert zeitbudgetierte Retrieval in Echtzeit-Kontexten.**

**Live-Faktenprüfung:**
LiveFC (Venktesh & Setty, WSDM 2025) ist das einzige publizierte End-to-End-System für Live-Audio-Faktenprüfung (83.9% F1 beim US-Präsidentschaftsdebatte-Case-Study). Factiverse (Norwegen, EUR 1 Mio. Funding) verfolgte 1'123 Aussagen in Echtzeit während der US-Debatten 2024. ClaimBuster (Hassan et al., KDD 2017) war Pionier der Echtzeit-Claim-Detection, deckt aber nur Check-Worthiness ab — nicht Verifikation.

**Limitationen aller existierenden Live-Systeme:**

| System | Evidenztiefe | Attribution | Unsicherheit | Human-in-Loop | Granularität |
|--------|-------------|-------------|-------------|---------------|-------------|
| LiveFC | NLI-Klassifikation | Keine | Keine | Keine | Binär (supported/refuted) |
| Factiverse | Web-Ranking | Keine publizierte | Keine publizierte | Via Faktisk (async) | ~80% Genauigkeit |
| ClaimBuster | Keine (nur Detection) | — | — | — | 3-Klassen CW-Score |
| **LiveCheck** | **Multi-Agenten-Debatte** | **Explizite Quellenattribution** | **Kalibrierte Konfidenz** | **Echtzeit-Eskalation** | **7-Punkte-Skala** |

#### LiveCheck erweitert den Stand der Technik durch die neue Kombination aus:

- **Streaming-Ingestion** mit Sprecherdiarisierung und Incomplete-Utterance-Handling
- **Zeitbudgetierter Evidenzsuche** mit konfidenzbasiertem Early-Stopping
- **Evidenzgebundener Attribution** unter Echtzeitbedingungen (Degradationscharakteristik unbekannt)
- **Kalibrierter Unsicherheitsmodellierung** mit evolving evidence base
- **Zeitrestringierter Multi-Agenten-Debatte** (Qualitätsdegradation unter Latenzbudgets unerforscht)
- **Echtzeit-Human-in-the-Loop-Triage** (alle existierenden Systeme asynchron)
- sowie **produktionsnaher Evaluation** mit neuem Live-Faktenprüfungs-Benchmark

### 3.3 Explizite Forschungsfragen

Das Projekt adressiert fünf zentrale Forschungsfragen:

**FF1:** Wie verhält sich die Attributionsqualität (Source Quality, Answer Attributability nach Schimanski et al. 2024) unter zunehmend kürzeren Retrieval-Zeitfenstern? Gibt es einen charakteristischen Kipp-Punkt, unterhalb dessen Attribution nicht mehr belastbar ist?

**FF2:** Lässt sich die Multi-Agenten-Debattenarchitektur (5-Schritt: Advocate → Self-Consistency → Challenger → Reconciler → Validation) auf Sub-30-Sekunden-Latenzen skalieren, ohne die Verdict-Qualität signifikant zu reduzieren? Welche Debattenschritte sind verzichtbar unter Zeitdruck, und welche sind für die Verdict-Integrität unverzichtbar?

**FF3:** Welche Evidenz-Ranking-Strategien (z.B. DIRAS-Relevanzbewertung, FIRE-iterative Retrieval, Contrarian Search) optimieren den Precision-Recall-Tradeoff bei Evidenzsuche unter harten Zeitbudgets (5s, 15s, 30s, 60s)?

**FF4:** Wie kann kalibrierte Unsicherheit für Streaming-Predictions mit evolving evidence base kommuniziert werden? Konkret: Wie stabil sind provisorische Verdicts, und wie verändert sich die Konfidenz als Funktion der akkumulierten Evidenz?

**FF5:** Welche Claim-Merkmale (Themengebiet, Komplexität, Harm-Potential, Evidenzdichte) sagen voraus, ob ein Claim erfolgreich automatisiert verifiziert werden kann oder an menschliche Reviewer eskaliert werden muss? Lässt sich ein prädiktives Triage-Modell für Echtzeit-Eskalation trainieren?

### 3.4 Warum dies mehr ist als die Umsetzung bewährter Praktiken

Das Vorhaben ist nicht die Anwendung bestehender Methoden auf einen neuen Datenstrom, weil die **zentralen Zielkonflikte wissenschaftlich ungelöst** sind:

- **Latenz vs. Evidenzqualität:** FIRE zeigt, dass iterative Retrieval die Qualität steigert, aber jede Iteration kostet Zeit. Wie sich diese Kurve unter harten Echtzeit-Deadlines verhält, ist unbekannt (FF1, FF3).
- **Debattentiefe vs. Echtzeitfähigkeit:** CLIMINATOR benötigt mehrere iterative Debatterunden für 96% Genauigkeit. Ob eine reduzierte Debatte unter Zeitdruck noch signifikant besser als Single-Pass-Klassifikation (LiveFC) ist, ist eine offene empirische Frage (FF2).
- **Automatisierung vs. redaktionelle Verantwortbarkeit:** Full Fact AI delegiert absichtlich alle Verdicts an Menschen ("kein Modell kann zuverlässig 'Ist das wahr?' beantworten"). LiveCheck muss einen Mittelweg finden: ausreichend automatisiert für Echtzeit, ausreichend transparent für redaktionelle Verantwortung (FF5).
- **Provisorische Signale vs. Fehlerrisiko:** Streaming-Unsicherheitsquantifizierung (evolving evidence) ist ein eigenständiges Forschungsproblem ohne publizierte Lösung (FF4).

### 3.5 Sieben dokumentierte Forschungslücken

Basierend auf dem Literaturreview (33 ausgewertete Quellen, siehe Begleitdokument `LiveCheck_State_of_the_Art_Research_2026-03-18.md`) adressiert LiveCheck folgende spezifischen, in der Literatur identifizierten Forschungslücken:

| # | Forschungslücke | Evidenz für Lücke | LiveCheck-Beitrag |
|---|----------------|-------------------|-------------------|
| 1 | Kein integriertes Echtzeit-evidenzbasiertes Fact-Checking-System | Vykopal et al. (2024): "real-time fact-checking identified as largely unexplored" | Erstes System mit Echtzeit + Evidenztiefe + Attribution |
| 2 | Unsicherheitsquantifizierung für Streaming-Predictions | Conformal Prediction Survey (TACL 2024): nur für statische Predictions angewendet | Kalibrierte provisorische Verdicts mit evolving evidence |
| 3 | Zeitbudgetierte Evidenzsuche für Live-Verifikation | FIRE (NAACL 2025): iterativ, aber auf statischen Claims | Evidence Retrieval mit konfidenzbasiertem Early-Stopping |
| 4 | Echtzeit-Human-in-the-Loop-Eskalation | Full Fact AI: 40+ Organisationen, aber asynchron | Prädiktive Triage unter Latenzrestriktionen |
| 5 | Multi-Agenten-Debatte unter Zeitrestriktionen | CLIMINATOR, Tool-MAD, DebateCV: alle ohne Zeitbudgets | Zeitrestringierte adversariale Verifikation |
| 6 | Kein Evaluationsbenchmark für Live-Faktenprüfung | LiveFC evaluiert ad hoc gegen PolitiFact | Standardisierter Benchmark (Latenz, Attribution, Stabilität) |
| 7 | Streaming-Claim-Detection aus Audio/Video | ClaimBuster/CLEF: auf vollständigen Text; LiveFC: Rolling-Windows | Claim-Detection für gesprochene Sprache (Disfluenzen, Speaker-Overlap) |

### 3.6 IPR / Freedom to Operate / Schutzlogik

**Aktuelle IP-Situation:**
Die Kernplattform FactHarbor wird als Open-Source-Architektur entwickelt. Die folgenden IP-relevanten Aspekte wurden identifiziert und werden vor Einreichung formell geprüft:

**Patentrecherche — durchgeführte Voranalyse:**
- Relevante Patentfelder: Live-Monitoring (US/EP), Retrieval-basierte Verifikation, Audio-/Video-Analyse, redaktionelle Assistenzsysteme
- ClaimBuster (UT Arlington): öffentlich publiziert, kein bekanntes Patent
- Factiverse: Handelsgeheimnisse, keine publizierten Patente identifiziert
- Google Fact Check Tools: API-basiert, ClaimReview ist offener Schema.org-Standard
- **Ergebnis Voranalyse:** Keine blockierenden Patente im Kernbereich evidenzbasierter Live-Verifikation identifiziert

**Freedom-to-Operate-Analyse (FTO):**
- Whisper (OpenAI): MIT-Lizenz → frei nutzbar
- pyannote (Speaker-Diarisierung): MIT-Lizenz → frei nutzbar
- AI SDK (Vercel): Apache 2.0 → frei nutzbar
- Eigene Debattenarchitektur: Unabhängig entwickelt, keine externe Lizenzierung nötig

**IP-Strategie:**
- **Open-Source-Kern:** Pipeline-Architektur, Evaluation-Framework, Benchmark-Daten → maximale wissenschaftliche Verwertbarkeit
- **Geschäftsgeheimnis:** Kalibrierungskonfigurationen, optimierte Prompt-Templates, trainierte Triage-Modelle → Wettbewerbsvorteil
- **Patentfähigkeit prüfen:** Echtzeit-Debattenarchitektur unter Zeitbudgets (Kombinations-Innovation)

**Vertragliche Regelung:**
- IPR-Vereinbarung zwischen Forschungs- und Umsetzungspartner innerhalb 3 Monate nach Projektstart (Innosuisse-Anforderung)
- Geplante Aufteilung: Forschungspartner → akademische Publikationsrechte; Umsetzungspartner → kommerzielle Verwertungsrechte; gemeinsam → Benchmark-Daten und Evaluations-Framework

---

## 4. Mehrwert des Innovationsprojekts

### 4.1 Geschäftsmodell und Zielposition in der Wertschöpfungskette

FactHarbor positioniert sich als **evidenzbasierte Verifikationsinfrastruktur** an der Schnittstelle zwischen:

```
Rohdaten-/Feed-Anbieter
  ↓
[Monitoring-Layer] ← Full Fact, Logically (333K Sätze/Tag)
  ↓
[LiveCheck: Echtzeit-Evidenzsuche & Verifikation] ← UNSERE POSITION
  ↓
[Redaktionelle Review & Publikation] ← Newsrooms, Faktenprüfer
  ↓
Endprodukte für Medien, Institutionen, Öffentlichkeit
```

**Geschäftsmodell (B2B/B2I):**

| Segment | Produkt | Preismodell | Zielumsatz (Jahr 3-5) |
|---------|---------|-------------|----------------------|
| **Newsroom-Tooling** | LiveCheck SaaS für Redaktionen | Subscription (CHF 500-2'000/Monat pro Newsroom) | CHF 120'000-360'000/Jahr |
| **API-Service** | Verifikations-API für Integration in bestehende Systeme | Pay-per-Call (CHF 0.50-2.00/Verifikation) | CHF 60'000-180'000/Jahr |
| **Institutionelle Lizenz** | Enterprise-Lösung für Monitoring-Teams | Jahreslizenz (CHF 5'000-20'000) | CHF 50'000-200'000/Jahr |
| **Evaluations-Service** | Benchmark-as-a-Service für Fact-Checking-Tools | Projektbasiert | CHF 30'000-100'000/Jahr |

**Gesamtziel:** CHF 260'000-840'000 jährlicher Umsatz ab Jahr 3 nach Projektende. Break-Even bei ca. CHF 200'000/Jahr (Betriebskosten: LLM-API, Infrastruktur, 1-2 FTE).

### 4.2 Kundenprobleme / Bedürfnisse / gesellschaftliche Herausforderung

**Quantifiziertes Problem:**
- **Geschwindigkeit:** Manuelle Faktenprüfung dauert 15-60 Minuten pro Claim (beobachtet bei CBS News, PolitiFact während US-Debatten 2024). Falschinformationen verbreiten sich in dieser Zeit millionenfach.
- **Skalierung:** Duke Reporters' Lab zählt 443 aktive Faktenprüfungsprojekte weltweit (2025) — bei Millionen täglich zirkulierender Aussagen. Full Fact AI verarbeitet 333'000 Sätze/Tag, erreicht aber nur Monitoring (keine Verdicts).
- **Formatverschiebung:** Immer grösserer Anteil öffentlicher Kommunikation in Video-, Podcast- und Livestream-Formaten, wo klassische textbasierte Faktenprüfung nicht greift.
- **Finanzierungskrise:** Meta beendete US-TPFC-Finanzierung (Januar 2025, betrifft ~160 Organisationen). Google strich alle Förderungen für Faktenprüfer (Oktober 2025, >GBP 1 Mio./Jahr Verlust für Full Fact allein). Google entfernte ClaimReview aus der Suche (Juni 2025). **Organisationen brauchen dringend unabhängige Werkzeuge.**

**Zielgruppen und Bedarfssignale:**
- Newsrooms / Fact-Checking-Organisationen: 443+ weltweit, 30% nutzen bereits KI (2024)
- Monitoring- und Risk-Intelligence-Teams: Wachsender Bedarf durch DSA-Compliance
- Öffentliche Institutionen: Schweizer Bundesrat anerkannte Desinformationsgefährdung (Juni 2024)
- Demokratiestärkende Organisationen: EDMO (15 Hubs, EUR 8.8 Mio. EU-Förderung)

### 4.3 Nachweis der Notwendigkeit der Lösung

**Bedarfsvalidierung:**

1. **Akademische Validierung:** Warren et al. (CHI 2025) dokumentieren in Interviews mit professionellen Faktenprüfern, dass deren dringendster unerfüllter Bedarf **Replizierbarkeit** (Quellenlinks, Datennachverfolgung) und **Unsicherheitstransparenz** ist — genau LiveChecks Kernversprechen.

2. **Marktvalidierung durch Konkurrenzprodukt:** Factiverse (Norwegen) erhielt EUR 1 Mio. Finanzierung und wurde bei US-Debatten 2024 eingesetzt (1'123 Echtzeit-Claims). Dies beweist: (a) Marktnachfrage existiert, (b) Investoren sehen Potenzial, (c) bestehende Lösung hat Qualitätslimitationen (~80% Genauigkeit, keine Attribution).

3. **Institutionelle Nachfrage:** EU Digital Services Act (vollständig anwendbar seit Februar 2024) verpflichtet Plattformen zur Desinformationsbekämpfung. EU AI Act (vollständige Durchsetzung August 2026) erfordert Transparenz- und Audit-Mechanismen. 44 Verpflichtungen und 128 konkrete Massnahmen im EU Code of Practice on Disinformation.

4. **Organisatorische Nachfrage:** Full Fact AI wird von 40+ Organisationen in 30+ Ländern genutzt — zeigt, dass Faktenprüfungsorganisationen bereit sind, KI-Tools zu lizenzieren.

**Vor Einreichung zusätzlich zu beschaffen:**
- [ ] 2-3 Letters of Intent von Newsrooms / Fact-Checking-Organisationen (z.B. SWI swissinfo.ch, Faktisk, Correctiv)
- [ ] Bestätigung von Pilotinteresse durch Full Fact AI (Email-Kontakt über Elliott Ash eingeleitet am 19.02.2026)

### 4.4 USP / Differenzierung

Die geplante Differenzierung basiert auf der **einzigartigen Kombination** aus fünf Elementen, die kein bestehendes System gleichzeitig bietet:

| USP-Dimension | LiveCheck | Nächster Wettbewerber | Differenzierungsgrad |
|--------------|-----------|----------------------|---------------------|
| **Evidenzbasierte Attribution** | Jeder Verdict trackt zu spezifischen Quellen/Evidenzfragmenten | Factiverse: NLI-Klassifikation ohne Attribution | Hoch |
| **Kalibrierte Unsicherheit** | 7-Punkte-Skala + Konfidenzband + Evidenzdichte | LiveFC: Binär (supported/refuted) | Hoch |
| **Multi-Agenten-Debatte** | 5-Schritt-Debatte mit Cross-Provider-Diversität | CLIMINATOR: Batch-only, klimaspezifisch | Mittel-Hoch |
| **Themenagnostisch** | Funktioniert für jedes Thema, jede Sprache | Factiverse: 114 Sprachen, aber generisch; CLIMINATOR: nur Klima | Mittel |
| **Human-in-the-Loop-Design** | Prädiktive Echtzeit-Triage | Full Fact: async, alle Verdicts manuell | Hoch |

### 4.5 Markt, adressierbarer Markt, Wachstumsrate

**Total Addressable Market (TAM):**

| Marktsegment | Geschätzte Grösse (2026) | Quelle |
|-------------|-------------------------|--------|
| Fake Image/Video Detection Tools | USD 600 Mio. → 3.9 Mrd. (2029) | MarketsandMarkets |
| Deepfake Detection | CAGR 37.5% bis 2033 | Spherical Insights |
| Disinformation Detection Tools | Multi-Mio. (2030), CAGR 5.2% | Marktberichte |
| Fact-Checking Technology (gesamt) | USD 50-100 Mio. (Schätzung) | Bottom-up |

**Serviceable Addressable Market (SAM) — DACH + EU Fact-Checking:**

| Segment | Anzahl Organisationen | Durchschn. Toolbudget | SAM |
|---------|----------------------|----------------------|-----|
| Professionelle Fact-Checking-Redaktionen (EU) | ~150 | CHF 12'000/Jahr | CHF 1.8 Mio. |
| Newsrooms mit Monitoring-Bedarf (DACH) | ~50 | CHF 18'000/Jahr | CHF 900'000 |
| Institutionelle Monitoring-Teams (DACH) | ~30 | CHF 24'000/Jahr | CHF 720'000 |
| **SAM gesamt** | | | **CHF 3.4 Mio.** |

**Serviceable Obtainable Market (SOM) — realistisch in 5 Jahren:**

- Jahr 1: 0 (Projektphase)
- Jahr 2: 3-5 Pilotkunden → CHF 30'000-60'000
- Jahr 3: 10-15 zahlende Kunden → CHF 150'000-300'000
- Jahr 4: 20-30 Kunden → CHF 400'000-600'000
- Jahr 5: 30-50 Kunden → CHF 600'000-840'000

**Erwartete Wachstumsrate:** 40-60% jährlich in den ersten 5 Jahren, getrieben durch:
- Regulatorischen Druck (DSA, EU AI Act)
- Plattform-Rückzug aus Faktenprüfung (Meta, Google)
- Zunehmende Live-/Video-Formate in der öffentlichen Kommunikation

### 4.6 Wettbewerberanalyse

#### Vergleichstabelle bestehender Systeme

| Kriterium | **LiveCheck** | **Factiverse** | **Full Fact AI** | **LiveFC** | **Logically** | **ClaimBuster** | **Buster.ai** |
|-----------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Echtzeit Audio/Video** | Ja | Ja | Nein | Ja | Nein | Nur Detection | Nein |
| **Evidenzbasiert** | Ja | Teilw. | Nein (nur Monitoring) | Teilw. (NLI) | Teilw. | Nein | Ja |
| **Quellenattribution** | Explizit | Keine publ. | Keine | Keine | Keine | Keine | Implizit |
| **Unsicherheitskommunikation** | Kalibriert (7-Punkte + Konfidenz) | Keine publ. | — | Keine | Keine | 3-Klassen | Keine |
| **Human-in-the-Loop** | Echtzeit-Triage | Via Faktisk (async) | Ja (async, alle Verdicts) | Nein | Ja (async) | Nein | Nein |
| **Multi-Agenten-Debatte** | 5-Schritt, Cross-Provider | Nein | Nein | Nein | Nein | Nein | Nein |
| **Sprachen** | Multilingual (LLM-basiert) | 114 | 3 | Begrenzt | 57 | Englisch | Multi |
| **Themenagnostisch** | Ja | Ja | Ja | Ja | Ja | Ja | Ja |
| **Open Source** | Kern: Ja | Nein | Teilw. (PASTEL) | Paper+Code | Nein | Teilw. | Nein |
| **Genauigkeit (publiziert)** | *Zu evaluieren* | ~80% | 50→80% (mit Cambridge) | 83.9% F1 | — | 89.9% F1 (CW) | — |
| **Finanzierung** | Innosuisse (beantragt) | EUR 1 Mio. | Stiftungen, Grants | Forschung | VC-finanziert | Universitär | EUR 2 Mio. |

#### Wettbewerbsvorteil

**Know-how-Vorsprung:**
- Einzige funktionierende Cross-Provider-Debattenarchitektur (Anthropic + OpenAI + Google + Mistral)
- Systematisches Kalibrierungs-Framework (C18/C13) — kein publiziertes Äquivalent bei Wettbewerbern
- 1199 bestandene Tests mit Input-Neutralitätsprüfung (≤4% Toleranz)

**Time-to-Market:**
- Bestehende FactHarbor-Plattform (TRL 5-6) als Ausgangspunkt → kürzere Entwicklungszeit als Neuentwicklung
- Proof-of-Concept für Kernkomponenten (Debatte, Evidenzfilter, Quellengewichtung) bereits validiert

**Eintrittsbarrieren für Wettbewerber:**
- Systemische Komplexität: Integration von 7+ Suchmaschinen, 4 LLM-Providern, 5-Schritt-Debatte, Kalibrierung, UCM → hohe Reproduktionskosten
- Kalibrierungsdaten: Bias-Messungen über Hunderte von Testfällen → aufwändig zu replizieren
- Akademische Kooperation: Partnerschaft mit UZH/ETH → wissenschaftliche Validierung und Publikationszugang

### 4.7 Umsatz- und Rentabilitätsentwicklung (NPV-Szenarien)

**Szenario A: Ohne Innosuisse-Förderung**

| Jahr | Investition | Umsatz | Cashflow | Kumulativ |
|------|-----------|--------|----------|----------|
| 1 | CHF -150'000 (Eigenentwicklung) | CHF 0 | CHF -150'000 | CHF -150'000 |
| 2 | CHF -120'000 | CHF 0 | CHF -120'000 | CHF -270'000 |
| 3 | CHF -80'000 | CHF 60'000 | CHF -20'000 | CHF -290'000 |
| 4 | CHF -60'000 | CHF 150'000 | CHF 90'000 | CHF -200'000 |
| 5 | CHF -60'000 | CHF 300'000 | CHF 240'000 | CHF 40'000 |

**NPV (8%, 5 Jahre) ohne Förderung: CHF -82'000** → Projekt wirtschaftlich marginal, hohes Risiko

**Szenario B: Mit Innosuisse-Förderung**

| Jahr | Investition (FH) | Innosuisse-Beitrag | Umsatz | Cashflow (FH) | Kumulativ |
|------|------------------|-------------------|--------|---------------|----------|
| 1 | CHF -65'000 (In-Kind + Cash) | CHF 137'500 (an FP) | CHF 0 | CHF -65'000 | CHF -65'000 |
| 2 | CHF -65'000 | CHF 137'500 (an FP) | CHF 30'000 | CHF -35'000 | CHF -100'000 |
| 3 | CHF -40'000 | CHF 0 | CHF 150'000 | CHF 110'000 | CHF 10'000 |
| 4 | CHF -40'000 | CHF 0 | CHF 400'000 | CHF 360'000 | CHF 370'000 |
| 5 | CHF -40'000 | CHF 0 | CHF 600'000 | CHF 560'000 | CHF 930'000 |

**NPV (8%, 5 Jahre) mit Förderung: CHF 585'000** → Projekt wirtschaftlich attraktiv, schnellerer Market Entry

**Differenz:** CHF 667'000 → Die Innosuisse-Förderung ermöglicht einen um 2 Jahre früheren Markteintritt und signifikant höhere kumulative Rendite.

### 4.8 Vermarktungs- / Markteinführungsstrategie

**Phase 1: Pilotierung (Monat 18-24, während Projekt)**
- 2-3 Pilot-Newsrooms im DACH-Raum (z.B. SWI swissinfo.ch, SRF, Correctiv)
- Kostenlose Nutzung gegen strukturiertes Feedback
- Live-Einsatz bei politischen Debatten / Wahlkampfveranstaltungen

**Phase 2: Erste Kunden (Jahr 1 nach Projekt)**
- Conversion der Pilotpartner zu zahlenden Kunden
- Aufbau des API-Services für Integration in bestehende Redaktionssysteme
- Präsenz auf Fachkonferenzen (Global Fact, CLEF, IJ4EU)

**Phase 3: Skalierung (Jahre 2-3 nach Projekt)**
- Expansion in EU-Markt (EDMO-Hubs als Multiplikatoren)
- Institutionelle Lizenzen für Monitoring-Teams
- Partnerschaft mit Full Fact AI (Monitoring-Frontend → LiveCheck-Verifikation)

**Nachweis früher Marktentwicklung:**
- FactHarbor-Plattform ist operativ und über app.factharbor.ch zugänglich
- Meeting mit UZH-Forschern (Schimanski/Leippold) bestätigt akademisches Interesse (18.03.2026)
- Email-Kontakt zu Full Fact AI über ETH-Verbindung eingeleitet (19.02.2026)
- Factiverse-Markterfolg beweist Zahlungsbereitschaft im Segment

### 4.9 Nachhaltigkeit

Die finanzielle Nachhaltigkeit basiert **nicht** auf Spenden, Sponsoring oder staatlichen Subventionen, sondern auf einem **gemischten Einnahmenmodell:**

| Einnahmequelle | Anteil (Ziel, Jahr 5) | Beschreibung |
|---------------|----------------------|-------------|
| **B2B SaaS-Subscriptions** | 50% | Newsroom-Tooling, Redaktionslizenzen |
| **API-Umsatz** | 25% | Pay-per-Verifikation für Integrationspartner |
| **Institutionelle Lizenzen** | 15% | Enterprise-Verträge mit Monitoring-Teams |
| **Evaluations-/Beratungsdienste** | 10% | Benchmark-as-a-Service, Systemaudit |

**Risikominimierung für soziale Wertschöpfung:**
- Dual-Tier-Preismodell: Vergünstigte Lizenzen für Non-Profit-Organisationen, marktgerechte Preise für kommerzielle Kunden
- Kern-Open-Source: Reduziert Vendor-Lock-in-Risiko für Kunden und ermöglicht Community-Beiträge
- Multi-Provider-Architektur: Keine Abhängigkeit von einem einzigen LLM-Anbieter → resilient gegen Preiserhöhungen oder Diensteinstellungen (relevantes Risiko: Full Fact verlor >GBP 1 Mio./Jahr durch Google-Rückzug)

### 4.10 Quantitative / qualitative Resultate und Begünstigte

**Quantitative Ergebnisse (messbar):**

| Metrik | Zielwert | Baseline |
|--------|---------|---------|
| End-to-End-Latenz (Claim → vorläufiges Signal) | <15 Sekunden | Manuell: 15-60 Minuten |
| Claim Detection F1 | ≥0.85 | ClaimBuster: 0.899; LiveFC: 0.899 |
| Veracity Prediction F1 | ≥0.75 | LiveFC: 0.839 (binär); FactHarbor Batch: *zu evaluieren* |
| Attributionsqualität (Source Quality) | ≥80% korrekte Quellenattribution | Schimanski et al. 2024: Baseline auf kuratierten Korpora |
| Provisorische Verdict-Stabilität | <10pp Schwankung nach Evidenz-Akkumulation | Kein Benchmark vorhanden (neu) |
| Reduktion der Reviewer-Bearbeitungszeit | ≥40% vs. manuell | Full Fact: "Stunden auf Minuten" (qualitativ) |
| Pilotpartner nach Projektende | ≥3 | 0 |

**Qualitative Ergebnisse:**
- Neue Arbeitsform zwischen Live-Monitoring und tiefer manueller Faktenprüfung
- Höhere Transparenz als reine KI-Klassifikatoren (jeder Verdict attribuiert)
- Bessere Priorisierung menschlicher Faktenprüfer durch prädiktive Triage
- Wissenschaftlicher Beitrag: ≥3 Publikationen (Top-Venue: ACL/EMNLP/NAACL), 1 Benchmark-Dataset

**Begünstigte:**

| Gruppe | Art | Geschätzter Nutzen |
|--------|-----|-------------------|
| Newsrooms (DACH) | Direkt | Schnellere Verifizierung, reduzierter manueller Aufwand |
| Fact-Checking-Organisationen (EU) | Direkt | Neues Werkzeug für Live-Formate; unabhängig von Plattform-Funding |
| Monitoring-Teams | Direkt | Echtzeit-Evidenzabfrage für Debatten/Events |
| Öffentliche Institutionen | Direkt | Werkzeug für Informationsmonitoring |
| Mediennutzer:innen | Indirekt | Schnellere, transparentere Faktenprüfung → bessere Informationsqualität |
| Demokratische Öffentlichkeit | Indirekt | Stärkung der Informationsintegrität in Live-Formaten |
| Forschende | Indirekt | Benchmark und Evaluationsframework für Live-Fact-Checking |

### 4.11 Beitrag zu nachhaltiger Entwicklung (SDGs)

| SDG | Beitrag |
|-----|---------|
| **SDG 16: Frieden, Gerechtigkeit und starke Institutionen** | Stärkung öffentlicher Informationsintegrität; Werkzeug gegen Desinformation |
| **SDG 9: Industrie, Innovation und Infrastruktur** | Neuartige Verifikationsinfrastruktur; technologische Innovation |
| **SDG 4: Hochwertige Bildung** | Transparente Quellenattribution fördert Medienkompetenz |
| **SDG 17: Partnerschaften zur Erreichung der Ziele** | Akademisch-industrielle Partnerschaft; Open-Source-Beitrag |

---

## 5. Projektplanung

### 5.1 Projektpartner und Rollen

#### Umsetzungspartner

**FactHarbor Verein** (gegründet 23. April 2026; HR-Eintragung Kt. Zürich eingeleitet, UID erwartet ~Anfang Mai 2026)

**Rolle:**
- Produktvision und Systemarchitektur
- Integration in die bestehende FactHarbor-Plattform (TRL 5-6)
- Implementierung der Live-Pipeline-Erweiterungen
- Pilotierung und Verwertung
- Betriebsperspektive und Nachhaltigkeit

**Bestehende Kompetenzen:**
- Lauffähige evidenzbasierte Faktenprüfungsplattform mit 1199 Tests
- 5-Schritt-LLM-Debattenarchitektur (Advocate → Self-Consistency → Challenger → Reconciler → Validation)
- Multi-Provider-LLM-Integration (Anthropic, OpenAI, Google, Mistral)
- 7 integrierte Suchmaschinen (Google CSE, SerpAPI, Brave, Serper, Wikipedia, Semantic Scholar, Google Fact Check API)
- Kalibrierungs-Framework (Konfidenz, Input-Neutralität, Bias-Messung)
- UCM-Konfigurationssystem mit 200+ konfigurierbaren Parametern

#### Forschungspartner

**Universität Zürich (UZH), Department of Finance** — Gruppe Prof. Markus Leippold
Kontaktperson: Tobias Schimanski (PhD-Kandidat / angehender Postdoc)
Status: Erstgespräch am 18.03.2026; Forschungspassung wird evaluiert.

**Rolle:**
- Methodische Mitentwicklung (Streaming-Verifikation, Uncertainty-Quantifizierung)
- Evaluationsdesign und Benchmarking
- Wissenschaftliche Fundierung und Publikation
- Expertise in Multi-Agenten-Debatte (CLIMINATOR), Quellenattribution (ACL 2024), Relevanz-Scoring (DIRAS, NAACL 2025)

**Qualifikationen der UZH-Gruppe:**
- CLIMINATOR: 96% Genauigkeit bei klimaspezifischer Faktenprüfung (npj Climate Action 2025)
- AFaCTA: Claim-Detection-Framework angewendet auf 6 Mio. US-Kongressreden (ACL 2024)
- DIRAS: Kalibriertes Relevanz-Scoring via Wissensdistillation (NAACL 2025)
- Faithful LLM Specialists: Source-Attribution-Metriken (ACL 2024)
- ClimRetrieve: IR-Benchmark für Klimadokumente (EMNLP 2024)
- ClimateBERT: 16 Modelle, 840'000+ Downloads
- Bestehende SERI-Förderung (NATURE-3B, CHF 748'000, Januar 2025)

**Affiliierter Kontakt:** Elliott Ash (ETH Zürich, Center for Law & Economics) — Expertise in Kalibrierung und politischer Bias-Analyse.

### 5.2 Team — Schlüsselpersonen und Qualifikationen

| Rolle | Person / Profil | Qualifikation | Aufwand |
|-------|----------------|---------------|---------|
| **Projektleiter (UP)** | [Name], FactHarbor | System-Architektur, Full-Stack-Entwicklung, 5 Jahre Erfahrung mit NLP/LLM-Systemen | 60% FTE |
| **Wissenschaftl. Leitung (FP)** | Postdoc (UZH, zu rekrutieren) | PhD in NLP/IR, Publikationen in ACL/EMNLP/NAACL | 80% FTE |
| **PI (FP)** | Prof. Markus Leippold (UZH) | Full Professor, PI CLIMINATOR, SERI-Grant-Erfahrung | 10% FTE (Betreuung) |
| **Beratend (FP)** | Tobias Schimanski (UZH) | Expertise Attribution, Retrieval, Debatte | 10% FTE |
| **Beratend (FP)** | Prof. Elliott Ash (ETH) | Kalibrierung, Bias-Analyse | Beratend |

> **Hinweis:** Der/die Postdoc wird über die Innosuisse-Förderung finanziert (CHF ~130'000/Jahr inkl. Overhead). Die Rekrutierung erfolgt nach Genehmigung über die UZH.

### 5.3 Arbeitspakete

#### AP1 — Use Cases, Datenbasis, Evaluationsrahmen (Monate 1-4)

**Ziel:** Präzise Definition der Anwendungsszenarien und Aufbau einer belastbaren Evaluationsgrundlage.

**Verantwortung:** FP (Lead), UP (Use-Case-Anforderungen)

**Inhalte:**
- Priorisierung der Ziel-Use-Cases mit quantitativen Erfolgskriterien
- Definition von Qualitäts- und Latenzzielen pro Use Case (Baseline aus LiveFC/Factiverse)
- Aufbau der Evaluations- und Annotationslogik
- Design des Live-Faktenprüfungs-Benchmarks (Lücke 6)
- Ontologie-Definition (Claim-Taxonomie, Evidence-Klassifikation, Verdict-Schema — aufbauend auf FactHarbors bestehendem Typsystem)
- Klärung von Rechten, Datenschutz und Logging
- Literaturreview-Aktualisierung (laufende Arbeiten in CLEF CheckThat! 2025, AVeriTeC 2.0)

**Ergebnisse:**
- Use-Case-Spezifikation mit messbaren KPIs
- Evaluationsprotokoll (Metriken: Latenz, F1, Attribution Quality, Verdict Stability)
- Daten- und Rechtekonzept (GDPR/Schweizer DSG-konform)
- Benchmark-Design-Dokument
- Ontologie-Spezifikation

**Meilenstein M1 (Monat 4):** Use Cases, Evaluationsprotokoll und Ontologie verabschiedet. Benchmark-Design reviewed.

#### AP2 — Streaming Ingestion und Claim Detection (Monate 3-10)

**Ziel:** Laufende Audio-/Video-Inhalte in verifizierbare Claim-Kandidaten überführen (Lücke 7).

**Verantwortung:** UP (Ingestion-Pipeline), FP (Claim-Detection-Modelle)

**Inhalte:**
- Streaming-Transkription (Whisper Large V3 Turbo, 300ms Latenz; Whisper Streaming für Rolling-Windows)
- Sprecherdiarisierung (pyannote-audio mit Online-Clustering)
- Incomplete-Utterance-Handling und Disfluenz-Management
- LLM-basierte Check-Worthiness-Klassifikation (aufbauend auf AFaCTA/CLEF CheckThat!)
- Claim-Priorisierung nach Harm-Potential und Überprüfbarkeit
- Integration mit FactHarbors bestehendem AtomicClaim-Extraktionssystem

**Technologiebasis:**
- ASR: Whisper Large V3 Turbo (MIT-Lizenz, 5.4× schneller als V3)
- Diarisierung: pyannote-audio (MIT-Lizenz, WER 2.68% bei 2 Sprechern)
- Claim Detection: Fine-tuned Classifier oder LLM-basiert (Vergleichsstudie in AP2)

**Ergebnisse:**
- Streaming-Ingestion-Prototyp (Audio → transkribierter, segmentierter Text in <3s)
- Claim-Candidate-Engine mit Rolling-Window-Detection
- Erste Detection-Baseline (Ziel: F1 ≥ 0.85 auf CLEF CheckThat! Task 1)
- Vergleichsstudie: Fine-tuned Classifier vs. LLM-Prompt (Kosten/Latenz/Qualität)

**Meilenstein M2 (Monat 8):** Claim Detection demonstriert F1 ≥ 0.80 bei Latenz < 5s auf deutschsprachigen Audio-Streams.

#### AP3 — Zeitbudgetierte Evidenzsuche und attribuierbare Live-Verifikation (Monate 8-16)

**Ziel:** Relevante Evidenz unter Zeitbudget finden und vorläufige, begründete, attribuierte Signale erzeugen (Lücken 1, 3, 5).

**Verantwortung:** UP (Retrieval-Integration), FP (Ranking/Attribution-Methodik)

**Inhalte:**
- Zeitbudgetierte Multi-Source-Recherche mit konfidenzbasiertem Early-Stopping (aufbauend auf FIRE)
- Vergleich von Ranking-Strategien: DIRAS-Relevanz, BM25+Dense Hybrid, Contrarian Search
- Evidenzzuordnung und Probative-Value-Bewertung unter Zeitdruck
- Quellengewichtung via Source-Reliability-Framework (FactHarbor SR-System, SQLite-Cache, 30-Tage-TTL)
- Debatte unter Zeitrestriktionen: Evaluation welche Debattenschritte unter verschiedenen Zeitbudgets (5s, 15s, 30s, 60s) beibehalten werden (FF2)
- Unsicherheitsmodell für provisorische Live-Ausgaben (Konforme Vorhersage, evolving evidence)
- Attribution-Degradations-Charakterisierung (FF1)

**Ergebnisse:**
- Zeitbudgetierte Retrieval-Schicht mit Early-Stopping
- Attributionslogik mit Degradations-Kurve
- Optimierte Debatte-Konfiguration für verschiedene Latenzbudgets
- Live-Signal-Ausgabe mit kalibrierter Unsicherheit
- Publikation: Attributionsqualität unter Zeitdruck (Ziel: ACL/EMNLP)

**Meilenstein M3 (Monat 12):** Relevante Evidenz wird innerhalb definierter Ziel-Latenzen (<15s) gefunden; Attributionsqualität ≥70% (Source Quality Metrik nach Schimanski et al. 2024).

**Meilenstein M4 (Monat 16):** Vorläufige Verifikationssignale mit Quellenbezug und Unsicherheitsanzeige demonstriert. Provisorische Verdict-Stabilität < 15pp nach 60s Evidenzakkumulation.

#### AP4 — Human-in-the-Loop und Produktintegration (Monate 14-22)

**Ziel:** Aufbau eines redaktionell brauchbaren Review-Modus mit prädiktiver Echtzeit-Triage (Lücke 4).

**Verantwortung:** UP (UI/Produktintegration), FP (Triage-Modell)

**Inhalte:**
- Reviewer Queue mit Live-Priorisierung
- Prädiktives Triage-Modell: Welche Claims müssen eskaliert werden? (FF5)
- Eskalationsregeln basierend auf: Konfidenz, Harm-Potential, Evidenzdichte, Themenbereich
- UI für Evidenz, Unsicherheit und Nachvollzug (Warren et al. CHI 2025 Requirements)
- Übergang von Live-Hinweis zu tieferem Faktencheck (FactHarbor Batch-Modus)
- Integration mit bestehenden Newsroom-Workflows

**Ergebnisse:**
- Reviewer-Oberfläche mit Echtzeit-Evidenzanzeige
- Prädiktives Triage-Modell (trainiert auf FactHarbor-Analysedaten)
- Eskalationslogik mit konfigurierbaren Schwellenwerten
- Pilotfähige Produktintegration
- Publikation: Prädiktive Triage für Echtzeit-Faktenprüfung (Ziel: CHI/CSCW)

**Meilenstein M5 (Monat 20):** Reviewer-Workflow integriert; prädiktive Triage demonstriert ≥80% korrekte Eskalationsentscheidungen auf Testdaten.

#### AP5 — Evaluation, Pilotierung, Verwertung (Monate 20-24)

**Ziel:** Nachweis der praktischen Tauglichkeit und Vorbereitung der Umsetzung.

**Verantwortung:** UP (Pilotierung), FP (Evaluation)

**Inhalte:**
- Pilotbetrieb mit 2-3 Newsrooms/Fact-Checking-Organisationen
- Systematische Evaluation mit Live-Faktenprüfungs-Benchmark (aus AP1)
- Messung aller Zielmetriken (Latenz, F1, Attribution, Stabilität, Triage-Qualität)
- Nutzerfeedback und Akzeptanzanalyse
- Konkretisierung von Verwertung und Nachhaltigkeit (LOIs → Verträge)
- Abschlussbericht und wissenschaftliche Synthese

**Ergebnisse:**
- Evaluationsbericht mit vollständiger Metrik-Dokumentation
- Pilotreport (≥3 Partner, ≥2 Live-Events evaluiert)
- Verwertungs- und Nachhaltigkeitskonzept mit konkreten Kundenpipeline
- Live-Faktenprüfungs-Benchmark (öffentlich verfügbar)
- Publikation: Benchmark-Paper (Ziel: FEVER Workshop / CLEF CheckThat!)
- Go-/No-Go-Entscheid für nächste Phase

**Meilenstein M6 (Monat 24):** Evaluationsresultate liegen vor. Pilotfazit positiv (≥2 Partner bestätigen Produktnutzen). Go-/No-Go für Kommerzialisierung entschieden.

### 5.4 Meilensteine (quantitativ messbar)

| Meilenstein | Monat | Kriterium (messbar) | Go/No-Go |
|-------------|-------|-------------------|----------|
| **M1: Projektbasis** | 4 | Use Cases mit KPIs definiert; Evaluationsprotokoll verabschiedet; Ontologie spezifiziert; Benchmark-Design reviewed | Nein |
| **M2: Claim Detection** | 8 | Streaming Claim Detection F1 ≥ 0.80 bei Latenz < 5s auf deutschsprachigen Audio-Streams | **Ja** — bei F1 < 0.60: Projektanpassung |
| **M3: Evidenzsuche** | 12 | Relevante Evidenz innerhalb <15s gefunden; Attributionsqualität ≥ 70% (Source Quality) | Nein |
| **M4: Live-Signale** | 16 | Vorläufige Verifikationssignale mit Quellenbezug; Verdict-Stabilität < 15pp nach 60s Evidenz | **Ja** — bei Stabilität > 30pp: Architektur-Review |
| **M5: Human-in-the-Loop** | 20 | Reviewer-Workflow integriert; Triage-Genauigkeit ≥ 80% | Nein |
| **M6: Transferentscheid** | 24 | ≥3 Pilotpartner evaluiert; ≥2 bestätigen Produktnutzen; Go-/No-Go entschieden | **Ja** — Transferentscheid |

### 5.5 Projektlaufzeit und Gantt-Übersicht

**Laufzeit: 24 Monate**

```
Monat:    1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21 22 23 24
          ├──────────────────┤
AP1       ████████████████████                                        Use Cases & Eval
          │           ├──────────────────────────────────┤
AP2       │           ████████████████████████████████████             Streaming & Detection
          │           │              ├──────────────────────────────────┤
AP3       │           │              ████████████████████████████████████ Evidence & Verdict
          │           │              │                 ├──────────────────────────────┤
AP4       │           │              │                 █████████████████████████████████ HitL & Product
          │           │              │                 │                    ├────────────┤
AP5       │           │              │                 │                    █████████████ Eval & Pilot
          ↑           ↑              ↑                 ↑                    ↑           ↑
          M1(4)       M2(8)          M3(12)             M4(16)              M5(20)      M6(24)
```

---

## 6. ICT- / AI-spezifische Anforderungen

### 6.1 Ontologie

**LiveCheck-Ontologie (aufbauend auf FactHarbors bestehendem Typsystem):**

```
UserInput (Audio/Video/Text)
  ↓ [Streaming Ingestion]
TranscribedSegment
  ├── speakerId: string
  ├── timestamp: {start, end}
  └── text: string
  ↓ [Claim Detection]
AtomicClaim
  ├── claimText: string
  ├── claimType: FACTUAL | OPINION | PREDICTION | AMBIGUOUS
  ├── centrality: high | medium | low (Gewicht: 3.0× / 2.0× / 1.0×)
  ├── harmPotential: high | medium | low
  ├── checkWorthiness: high | medium | low
  └── speakerAttribution: string
  ↓ [Evidence Retrieval]
EvidenceItem
  ├── statement: string
  ├── category: legal_provision | evidence | direct_evidence | expert_quote | statistic | event | criticism
  ├── claimDirection: supports_thesis | contradicts_thesis | contextual
  ├── probativeValue: high | medium | low
  ├── sourceType: peer_reviewed_study | fact_check_report | government_report | legal_document | news_primary | news_secondary | expert_statement | organization_report | other
  ├── sourceAuthority: primary | secondary | opinion
  ├── evidenceBasis: scientific | documented | anecdotal | theoretical
  ├── evidenceScope: {methodology, boundaries, geographic, temporal}
  └── sourceReliability: 0-1 (SR-Score)
  ↓ [Clustering]
ClaimAssessmentBoundary
  ├── evidenzbasierte Gruppierung kompatibler EvidenceScopes
  └── emerges from evidence (nicht vordefiniert)
  ↓ [Debate & Verdict]
ClaimVerdict
  ├── truthPercentage: 0-100
  ├── confidence: 0-100
  ├── rating: TRUE | MOSTLY-TRUE | LEANING-TRUE | MIXED | UNVERIFIED | LEANING-FALSE | MOSTLY-FALSE | FALSE
  ├── supportingEvidenceIds: string[]
  ├── reasoning: string (attribuiert auf Evidenz)
  ├── isContested: boolean
  ├── factualBasis: established | disputed | opinion | unknown
  └── provisionalStability: number (Stabilität des provisorischen Verdicts)
```

**Ontologie-Aktualisierung:** Die Ontologie wird nicht statisch definiert, sondern evolves mit dem Projekt. Die Claim-Taxonomie und Evidence-Klassifikation werden in AP1 verfeinert und in AP3/AP5 evaluiert. Strukturänderungen werden über FactHarbors UCM-Konfigurationssystem verwaltet.

### 6.2 Datenquellen und Datenbeschaffung

**Geplante Datenquellen:**

| Quelle | Zugang | Eigentum | Nutzungsrecht |
|--------|--------|----------|-------------|
| **Live-Audio-Streams** (TV-Debatten, Podcasts) | HLS/m3u8-Streams, öffentlich zugänglich | Broadcaster | Fair Use / Forschungsprivileg (CH URG Art. 24d) |
| **Video-Clips** (YouTube, Mediatheken) | Öffentlich zugänglich | Content-Ersteller | Fair Use / Forschungsprivileg |
| **Transkripte** (bestehende Sammlungen) | CLEF CheckThat!, AVeriTeC | Forschungs-Communities | Akademische Lizenz |
| **Web-Quellen für Evidenz** | 7 integrierte Suchmaschinen | Diverse | Öffentlich zugänglich |
| **Akademische Quellen** | Semantic Scholar API (216 Mio.+ Papers) | Allen Institute | Frei nutzbar |
| **Bestehende Fact-Checks** | Google Fact Check API (280'000+) | IFCN-Organisationen | API-Nutzung |

**Datenschutz:**
- Keine personenbezogenen Daten werden gespeichert (nur aggregierte Analyseresultate)
- Transkripte werden nur für die Dauer der Analyse vorgehalten
- Logging-Policy: Anonymisierte Metriken für Evaluation; keine Rohdaten-Retention nach Analyse
- GDPR/Schweizer DSG-konforme Datenverarbeitung

### 6.3 Trainingsdaten / Evaluationsdaten

**LiveCheck trainiert keine eigenen Modelle im klassischen Sinne**, sondern nutzt vortrainierte LLMs (Anthropic Claude, OpenAI GPT, Google Gemini) via API-Aufrufe. Die "Trainingsdaten"-Frage betrifft daher primär:

1. **Fine-Tuning-Daten für Claim Detection (AP2):**
   - ClaimBuster-Datensatz: ~23'000 annotierte Sätze (3 Klassen)
   - CLEF CheckThat! Datasets: 2018-2025, 15+ Sprachen
   - Eigene Produktionsannotationen: Ziel 1'000+ annotierte Claims aus deutschsprachigen Debatten
   - **Qualität:** Annotiert von professionellen Faktenprüfern (Inter-Annotator Agreement ≥ 0.75 Cohen's κ)

2. **Evaluationsdaten:**
   - AVeriTeC: 4'568 reale Claims von 50 Organisationen (4-Klassen inkl. "Conflicting Evidence")
   - FEVER: 185'000 Claims (3-Klassen, Wikipedia-basiert)
   - LiveFC Presidential Debate Dataset: 30 PolitiFact-Claims + 691 erkannte Claims
   - **Eigener Live-Benchmark (AP1/AP5):** Ziel 500+ annotierte Live-Claims mit Evidenz

3. **Erwartete False-Positive/Negative-Raten:**

   | Komponente | FP-Rate (Ziel) | FN-Rate (Ziel) | Umgang mit Fehlern |
   |-----------|---------------|---------------|-------------------|
   | Claim Detection | <15% | <20% | FP: Unnötige Verifikation (Ressourcenkosten). FN: Verpasster checkworthy Claim → Eskalation an Human Review |
   | Verdict (supported/refuted) | <20% | <20% | FP/FN: Unsicherheitskommunikation + Human Escalation bei low confidence |
   | Triage (escalate/auto) | <10% | <15% | FP: Unnötige Eskalation (akzeptabel). FN: Automatischer Verdict bei schwierigem Claim → Sicherheitsnetz via Confidence-Floor |

4. **Modellentwicklung über die Zeit (positive Rückkopplungsschleife):**
   - Reviewer-Feedback aus AP4 wird als Trainingssignal für Triage-Modell genutzt
   - Evaluationsdaten aus AP5-Pilotbetrieb erweitern den Benchmark
   - Kalibrierungsdaten aus Produktionsbetrieb verbessern Confidence-Calibration
   - Source-Reliability-Cache wächst mit jeder Analyse (30-Tage-TTL, SQLite-basiert)

### 6.4 Algorithmus / Modellbegründung

**Architekturkomponenten und funktionale Begründung:**

| Komponente | Technologie | Warum diese Wahl | Leistungsannahme |
|-----------|------------|------------------|-----------------|
| **Transkription** | Whisper Large V3 Turbo | 5.4× schneller als V3; 300ms Latenz; MIT-Lizenz; 100+ Sprachen | WER < 5% für klare Sprache |
| **Diarisierung** | pyannote-audio | State-of-the-Art online-Diarisierung; MIT-Lizenz; 2.68% WDER (2 Sprecher) | WDER < 5% für Debattenformat |
| **Claim Detection** | Fine-tuned XLM-RoBERTa oder LLM-Prompt | XLM-RoBERTa: schnell, multilingual (LiveFC: F1 0.899). LLM: flexibler, teurer. Vergleichsstudie in AP2 | F1 ≥ 0.85 |
| **Evidence Retrieval** | Multi-Source Web Search (7 Provider) + FIRE-inspiriertes iteratives Retrieval | Breite Quellenbasis; konfidenzbasiertes Early-Stopping reduziert Latenz | Relevante Evidenz in <15s |
| **Evidenzbewertung** | LLM-basierte Probative-Value-Klassifikation | FactHarbor-bewährt; AGENTS.md-Regel: analytische Entscheidungen MÜSSEN LLM-basiert sein | Alignment mit DIRAS ≥ 0.8 κ |
| **Verifikation** | 5-Schritt Multi-Agenten-Debatte | Cross-Provider-Diversität reduziert Single-Model-Bias (Stammbach & Ash 2024). CLIMINATOR validiert Debatte-Ansatz (96% Genauigkeit) | F1 ≥ 0.75 auf AVeriTeC |
| **Confidence** | Multi-Faktor-Kalibrierung (Density Anchor, Band Snapping, Verdict Coupling) | FactHarbor-bewährt; konforme Vorhersage als theoretischer Rahmen (TACL 2024) | ECE < 0.15 |
| **Triage** | Trainiertes Klassifikationsmodell auf Claim-Features | Prädiktive Eskalation statt regelbasierter Schwellenwert | Precision ≥ 0.80, Recall ≥ 0.85 |

**Kostenschichtung:**

| Tier | Modelle | Aufgaben | Kosten/Analyse |
|------|---------|----------|---------------|
| **Budget** | Claude Haiku 4.5, GPT-4-Mini, Gemini Flash | Claim-Extraktion, Evidenz-Extraktion, Validierung | ~$0.01-0.05 |
| **Standard** | Claude Sonnet 4.5, GPT-4-Turbo, Gemini Pro | Verdict-Debatte, Kontextverfeinerung | ~$0.10-0.50 |
| **Premium** | Claude Opus 4.6 (nur wenn nötig) | Komplexe Reasoning-Aufgaben | ~$0.50-2.00 |

**Kosten pro Echtzeit-Verifikation (geschätzt):** CHF 0.20-1.00 (abhängig von Evidenztiefe und Zeitbudget)

### 6.5 Marktakzeptanz einer nicht 100% exakten KI-Lösung

Diese Frage ist für LiveCheck zentral. Die Lösung wird **nicht** als unfehlbarer Automat positioniert, sondern als:

- **Priorisierende Live-Assistentin** — filtert und priorisiert Claims für menschliche Reviewer
- **Evidenzgebundene Frühwarn-Infrastruktur** — zeigt relevante Quellen, nicht nur Klassifikationen
- **Werkzeug für schnellere und bessere menschliche Entscheidungen**

**Warum der Markt eine nicht-perfekte Lösung akzeptiert:**

1. **Die Alternative ist langsamer:** Manuelle Faktenprüfung dauert 15-60 Minuten. Ein System mit 75% F1 in 15 Sekunden ist für Live-Situationen wertvoller als 95% F1 in 60 Minuten.

2. **Professionelle Faktenprüfer bestätigen den Bedarf:** Warren et al. (CHI 2025) zeigen, dass Faktenprüfer Transparenz und Replizierbarkeit priorisieren — nicht Perfektion. LiveCheck liefert beides.

3. **Bewährte Marktakzeptanz:** Full Fact AI startete mit 50% Genauigkeit und wird von 40+ Organisationen genutzt (verbessert auf 80% mit Cambridge). Factiverse hat ~80% Genauigkeit und Kunden (NRK, Faktisk).

4. **Unsicherheitskommunikation als Vertrauensmechanismus:** LiveChecks 7-Punkte-Skala mit Konfidenzband und Evidenzdichte-Anzeige kommuniziert aktiv, wann ein Ergebnis belastbar ist und wann nicht. Dies ist ehrlicher — und langfristig vertrauenswürdiger — als Systeme, die scheinbar sichere Binärurteile liefern.

### 6.6 Black-Swan- / Edge-Case-Handling

**Identifizierte Szenarien und Gegenstrategien:**

| Szenario | Auswirkung | Erkennung | Reaktion |
|----------|-----------|-----------|---------|
| **Breaking News** (abrupt veränderte Nachrichtenlage) | Evidenz noch nicht online; provisorische Verdicts basieren auf veralteter Information | Evidenzdichte-Check: wenige/keine Quellen innerhalb Zeitbudget | Automatische Eskalation an Human Review; Verdict als "INSUFFICIENT — Breaking Event" markiert |
| **Themenverschiebung** (Debatte wechselt abrupt Thema) | Streaming-Context-Window muss resetten | Speaker-Diarisierung + Themen-Segmentierung | Neuer ClaimAssessmentBoundary; kein Carry-over von irrelevantem Kontext |
| **Mehrdeutige/ironische Aussagen** | LLM-Claim-Detection interpretiert Ironie als faktualen Claim | Claim-Type-Klassifikation (AMBIGUOUS-Kategorie); Confidence-Penalty | Niedrige Check-Worthiness; bevorzugte Eskalation |
| **Fehlerhafte Transkripte** | ASR-Fehler führen zu falschen Claims | WER-Monitoring; Konfidenz-Score pro Segment | Niedrig-konfidente Segmente werden nicht zur Claim-Detection weitergeleitet |
| **Adversariale Manipulation** (gezielte Desinformation in Live-Format) | System könnte instrumentalisiert werden | Harm-Potential-Klassifikation; Contrarian-Search-Pass | High-Harm-Claims erfordern Minimum 50% Confidence (C8 High-Harm Verdict Floor) |
| **Datenquelle offline** (Suchmaschine nicht erreichbar) | Reduzierte Evidenzbasis | Circuit Breaker pro Provider; Multi-Provider-Failover | Automatischer Fallback auf verbleibende Provider; wenn <2 Provider: Eskalation |

**Robustheitsgarantie:** FactHarbors bestehende Multi-Provider-Architektur (7 Suchmaschinen, 4 LLM-Provider) bietet strukturelle Resilienz. Ein Totalausfall würde den gleichzeitigen Ausfall aller Provider erfordern.

### 6.7 Datenmetriken und Evaluationsmetriken

**Primäre Metriken:**

| Metrik | Definition | Zielwert | Messmethode |
|--------|-----------|---------|-------------|
| **End-to-End-Latenz** | Zeit von Utterance bis provisorisches Signal | <15s (P50), <30s (P95) | Timestamp-Differenz im Pipeline-Monitoring |
| **Claim Detection F1** | Harmonisches Mittel aus Precision und Recall für checkworthy Claims | ≥0.85 | Gegen annotiertes Test-Set (≥500 Claims) |
| **Veracity F1** | F1 für korrekte Verdict-Zuordnung | ≥0.75 | Gegen AVeriTeC + eigenen Benchmark |
| **Attribution Quality** | Anteil korrekter Quellenverweise (Source Quality nach Schimanski et al. 2024) | ≥80% | Manuelle Annotation + NLI-basierte Evaluation |
| **Verdict Stability** | Max. Schwankung des provisorischen Verdicts über Zeit | <10pp nach 60s | Messung über Evidenz-Akkumulationsfenster |
| **Triage Precision/Recall** | Korrektheit der Eskalationsentscheidung | P≥0.80, R≥0.85 | Gegen Human-annotierte Eskalationsdaten |
| **ECE (Expected Calibration Error)** | Kalibrierung der Confidence-Scores | <0.15 | Reliability Diagram auf Test-Set |
| **Input-Neutralität** | Divergenz zwischen Question/Statement-Phrasing | ≤4pp | FactHarbor Input-Neutralitäts-Framework |

**Sekundäre Metriken:**

| Metrik | Definition | Zweck |
|--------|-----------|-------|
| Retrieval Relevance (nDCG@10) | Anteil relevanter Evidenz in Top-10 | Retrieval-Qualitätsüberwachung |
| False-Positive-Rate Claim Detection | Anteil fälschlich als checkworthy klassifizierter Claims | Ressourceneffizienz |
| Reviewer-Zeitersparnis | Reduktion der Bearbeitungszeit vs. manuell | Pilotbetrieb-Messung |
| Token-Effizienz | Token pro Verifikation | Kostenoptimierung |
| Provider-Verfügbarkeit | Uptime pro Suchmaschine/LLM | Infrastruktur-Monitoring |

---

## 7. Budget und Kostenstruktur

### 7.1 Gesamtbudget

| Kostenblock | Forschungspartner (UZH) | Umsetzungspartner (FH) | Total |
|------------|------------------------|----------------------|-------|
| **Personalkosten** | CHF 220'000 (Postdoc 80% × 2 Jahre + Overhead) | CHF 195'000 (Projektleiter 60% × 2 Jahre, In-Kind) | CHF 415'000 |
| **Material/Infrastruktur** | CHF 15'000 (GPU-Compute, Annotationtools) | CHF 30'000 (LLM-API-Kosten, Cloud, Suchmaschinen-Credits) | CHF 45'000 |
| **Reisen/Konferenzen** | CHF 10'000 (2 Konferenzen/Jahr) | CHF 5'000 (Pilotpartner-Besuche) | CHF 15'000 |
| **Sonstiges** | CHF 5'000 | CHF 5'000 | CHF 10'000 |
| **Zwischensumme** | **CHF 250'000** | **CHF 235'000** | **CHF 485'000** |

### 7.2 Finanzierungsaufteilung

| Quelle | Betrag | Anteil | Beschreibung |
|--------|--------|--------|-------------|
| **Innosuisse-Beitrag** (an FP) | CHF 250'000 | 51.5% | Forschungspartner-Kosten (Postdoc + Material + Reisen) |
| **Umsetzungspartner In-Kind** | CHF 211'500 | 43.6% | Eigenleistung (Entwicklerzeit × Standardstundensätze) |
| **Umsetzungspartner Cash** (Barbeitrag an FP) | CHF 24'250 | 5.0% | Mindest-Barbeitrag (5% der Gesamtprojektkosten) |
| **Total** | **CHF 485'750** | **100%** | |

### 7.3 Härtefallklausel — Art. 19 Abs. 2bis FIFG

FactHarbor Verein beantragt eine **Reduktion des Barbeitrags** gemäss Art. 19 Abs. 2bis FIFG. Drei der vier gesetzlichen Bedingungen treffen zu:

**(a) Überdurchschnittliches Realisierungsrisiko, aber hoher gesellschaftlicher Nutzen:**
Echtzeit-Faktenprüfung adressiert eine zentrale demokratische Herausforderung (Desinformation in Live-Formaten). Der gesellschaftliche Nutzen übersteigt den rein kommerziellen Wert erheblich.

**(b) Ergebnisse nützen einer breiten Nutzergruppe:**
Die Projekt-Ergebnisse (Open-Source-Benchmark, Evaluations-Framework, Architektur-Erkenntnisse) kommen der gesamten Fact-Checking-Community zugute (443+ Organisationen weltweit).

**(c) Partner finanziell nicht in der Lage, Standardbeitrag zu leisten, aber überdurchschnittliches Umsetzungspotenzial:**
FactHarbor Verein ist eine Non-Profit-Organisation ohne Einnahmen, verfügt aber über eine funktionsfähige Plattform (TRL 5-6) mit nachgewiesenem Umsetzungspotenzial.

**Beantragte Reduktion:** Barbeitrag von CHF 24'250 auf CHF 0-10'000 (abhängig von Innovationsrats-Entscheid).

---

## 8. Wirtschaftliche und gesellschaftliche Wirkung

### Wirtschaftliche Wirkung

- Neues Produkt-/Dienstleistungsangebot im wachsenden Segment der Medien-Assistenzsysteme
- Potenzielle Arbeitsplätze: 2-5 FTE ab Jahr 3 (Entwicklung, Support, Vertrieb)
- Wertschöpfung in der Schweiz: Technologie-Entwicklung, akademische Publikationen, Benchmark-Daten
- Stärkung des Schweizer KI-Ökosystems im Bereich verantwortungsvolle KI

### Gesellschaftliche Wirkung

- Stärkung der öffentlichen Informationsintegrität in Live-Formaten
- Werkzeug für 443+ Faktenprüfungsorganisationen weltweit
- Unabhängigkeit von Plattform-Finanzierung (Meta, Google) für Faktenprüfer
- Beitrag zur EU AI Act-Compliance (Transparenz, Audit, menschliche Aufsicht)
- Open-Source-Benchmark als öffentliches Gut für die Forschungsgemeinschaft

---

## 9. Risiken und Gegenmaßnahmen

| Risiko | Eintritts-WS | Auswirkung | Gegenmaßnahme | Verantwortlich |
|--------|-------------|-----------|---------------|---------------|
| Latenz zu hoch für Live-Nutzung | Mittel | Hoch | Gestufte Ausgabe (5s/15s/30s/60s Zeitbudgets); Debatte-Schritte konfigurierbar reduzierbar; M2 als Go/No-Go | UP |
| Evidenzqualität unter Zeitdruck ungenügend | Mittel | Hoch | FIRE-inspiriertes Early-Stopping; Multi-Source-Retrieval; Contrarian-Search; Eskalation bei geringer Evidenzdichte | UP + FP |
| Markt akzeptiert Unsicherheit nicht | Mittel | Mittel | Warren et al. (CHI 2025) zeigen Bedarf; klare UX für Unsicherheit; Human-in-Loop als Vertrauensmechanismus; Pilotvalidierung in AP5 | UP |
| Forschungspartner nicht rechtzeitig formalisiert | Niedrig | Hoch | UZH-Gespräch am 18.03.2026; BRIDGE Discovery als Fallback-Instrument | UP |
| Daten-/Rechtefragen blockieren Use Cases | Mittel | Hoch | Frühe Rechteklärung in AP1; Fokus auf öffentlich zugängliche Streams; CH URG Art. 24d (Forschungsprivileg) | FP |
| Transkription/Segmentierung instabil | Niedrig | Mittel | Whisper V3 Turbo ist State-of-the-Art (WER <5%); Fallbacks; Pilotbegrenzung auf klare Audioqualität | UP |
| Antrag wirkt zu forschungsnah | Mittel | Hoch | Verwertungsstrategie mit NPV; Pilotpartner-LOIs; bestehende Plattform als TRL-5-Nachweis | UP |
| LLM-API-Kosten steigen unerwartet | Niedrig | Mittel | Multi-Provider-Architektur; Budget-Tier-Optimierung; lokale Modelle als Fallback (Mistral, Llama) | UP |
| Konkurrent lanciert ähnliches Produkt | Mittel | Mittel | Time-to-Market-Vorteil (bestehende Plattform); Differenzierung durch Evidenztiefe + Attribution + Kalibrierung | UP |

---

## 10. Noch offen vor einer Einreichung

| # | Aufgabe | Priorität | Status | Deadline |
|---|---------|----------|--------|---------|
| 1 | **Forschungspartner formalisieren** (UZH/Leippold LOI) | Kritisch | Meeting am 18.03.2026 | April 2026 |
| 2 | **FactHarbor Verein gründen + UID** | Kritisch | Gründung vorbereitet | April 2026 |
| 3 | **2-3 Pilot-LOIs** von Newsrooms/Fact-Checking-Orgs | Hoch | Kontakte eingeleitet | Mai 2026 |
| 4 | **Budget mit UZH abstimmen** (Postdoc-Kosten, Overhead) | Hoch | Abhängig von #1 | Mai 2026 |
| 5 | **IPR-Vereinbarung** Entwurf (FP/UP) | Hoch | Vorab-Analyse erstellt (§3.6) | Mai 2026 |
| 6 | **Konkrete Wettbewerbertabelle** mit aktuellen Marktdaten verfeinern | Mittel | Entwurf liegt vor (§4.6) | Mai 2026 |
| 7 | **Innolink-Portal-Registrierung** mit UID | Kritisch | Abhängig von #2 | Mai 2026 |
| 8 | **Härtefallklausel-Argumentation** mit Innosuisse vorbesprechen (innoprojects@innosuisse.ch) | Mittel | Noch nicht eingeleitet | Mai 2026 |

**Ziel-Einreichung:** Bis ~22.07.2026 (ICT-Sitzung 02.09.2026) oder bis ~09.09.2026 (ICT-Sitzung 21.10.2026).

---

## 11. Formulierung für einen sehr kurzen Antragsteaser

> **LiveCheck** entwickelt die erste integrierte Architektur für evidenzbasierte Echtzeit-Faktenprüfung von Audio- und Video-Inhalten. Aufbauend auf der lauffähigen FactHarbor-Plattform (TRL 5-6, 1199 Tests, 5-Schritt-Debattenarchitektur) adressiert das Projekt sieben dokumentierte Forschungslücken: Echtzeit-Evidenzsuche unter Zeitbudgets, kalibrierte Unsicherheit für Streaming-Predictions, zeitrestringierte Multi-Agenten-Debatte und prädiktive Human-in-the-Loop-Eskalation. Im Unterschied zu bestehenden Systemen (LiveFC: binär, keine Attribution; Factiverse: ~80%, keine publizierte Evidenzbewertung) verbindet LiveCheck geringe Latenz mit nachvollziehbarer Quellenattribution und graduierter Unsicherheitskommunikation. Das Projekt wird in Partnerschaft mit der Universität Zürich (Gruppe Leippold: CLIMINATOR, DIRAS, AFaCTA) durchgeführt und zielt auf 3+ Publikationen (ACL/EMNLP) sowie einen öffentlichen Live-Faktenprüfungs-Benchmark.

---

## 12. Quellen und Referenzen

### Wissenschaftliche Kernliteratur

1. Guo, Z., Schlichtkrull, M. & Vlachos, A. (2022). A Survey on Automated Fact-Checking. *TACL*, 10, 178-206.
2. Vykopal, I. et al. (2024). Generative Large Language Models in Automated Fact-Checking: A Survey. *arXiv:2407.02351*.
3. Venktesh, V. & Setty, V. (2024). LiveFC: A System for Live Fact-Checking of Audio Streams. *WSDM 2025*. arXiv:2408.07448.
4. Hassan, N. et al. (2017). Toward Automated Fact-Checking: Detecting Check-worthy Factual Claims by ClaimBuster. *KDD 2017*.
5. Leippold, M. et al. (2025). Automated Fact-Checking of Climate Claims with LLMs (CLIMINATOR). *npj Climate Action*, 4, 17.
6. Xie, Z. et al. (2025). FIRE: Fact-checking with Iterative Retrieval and Verification. *Findings of NAACL 2025*.
7. Schimanski, T. et al. (2024). Towards Faithful and Robust LLM Specialists for Evidence-Based QA. *ACL 2024*.
8. Schimanski, T. et al. (2025). DIRAS: Efficient LLM Annotation for Document Relevance. *NAACL 2025*.
9. Ni, J., Stammbach, D., Ash, E. & Leippold, M. (2024). AFaCTA: Assisting Annotation of Factual Claims. *ACL 2024*.
10. Warren, G. et al. (2025). Show Me the Work: Fact-Checkers' Requirements for Explainable AFC. *CHI '25*.
11. Du, Y. et al. (2023). Improving Factuality and Reasoning through Multiagent Debate. *arXiv:2305.14325*.
12. Tool-MAD (2026). Multi-Agent Debate for Fact Verification with Tool Augmentation. *arXiv:2601.04742*.
13. DebateCV (2025). Debate-driven Claim Verification with Multiple LLM Agents. *arXiv:2507.19090*.
14. Conformal Prediction for NLP: A Survey (2024). *TACL*.
15. ConU: Conformal Uncertainty in LLMs (2024). *Findings of EMNLP 2024*.
16. Zeng, X. et al. (2021). Automated Fact-Checking: A Survey. *Language and Linguistics Compass*, 15(10).
17. Barron-Cedeño, A. et al. (2024/2025). CLEF CheckThat! Lab. *CLEF 2024/ECIR 2025*.
18. Thorne, J. et al. (2018). FEVER: A Large-scale Dataset for Fact Extraction and VERification. *NAACL 2018*.
19. Schlichtkrull, M. et al. (2024). AVeriTeC Shared Task. *FEVER 2024 Workshop*.
20. Kavtaradze, L. (2024). Challenges of Automating Fact-Checking. *Digital Journalism*.

### Markt- und Regulierungsquellen

21. Duke Reporters' Lab (2025). Fact-Checking Census 2025: 443 active projects worldwide.
22. Poynter Institute (2024). State of the Fact-Checkers Report 2024.
23. European Commission (2024). Digital Services Act enforcement.
24. EU AI Act (Regulation EU 2024/1689). Full enforcement August 2026.
25. EDMO (2025). European Digital Media Observatory — EUR 8.8M DIGITAL grants.
26. Swiss Federal Council (2024). Report on influence activities and disinformation threats.

### Technologie-Referenzen

27. Whisper Large V3 Turbo (October 2024). 5.4× speed improvement, MIT License.
28. pyannote-audio. Speaker diarization, MIT License.
29. Bloomberg Streaming Whisper (Interspeech 2025). Near-offline accuracy, low latency.

### Offizielle Innosuisse-Quellen

30. Innovationsprojekte mit Umsetzungspartner: https://www.innosuisse.admin.ch/de/innovationsprojekte-mit-umsetzungspartner
31. Checkliste für Gesuche (07.07.2025): https://www.innosuisse.admin.ch/dam/de/sd-web/l6ulpxzSOif4/Checkliste%20(Innovationsprojekte).pdf
32. Vollzugsbestimmungen für Innovationsprojekte: https://www.innosuisse.admin.ch/dam/de/sd-web/6OBa7YbHhEzQ/Vollzugsbestimmungen.pdf

### Interne FactHarbor-Unterlagen

33. `Docs/Knowledge/LiveCheck_State_of_the_Art_Research_2026-03-18.md` — Detaillierter Literaturreview mit 33 Quellen
34. `Docs/Knowledge/Innosuisse_Bewerbung_Leitfaden.md` — Bewerbungsprozess und Finanzierungsstruktur
35. `Docs/Knowledge/Meeting_Prep_Schimanski_2026-03-18.md` — Forschungspartner-Vorbereitung
36. `Docs/Knowledge/Global_FactChecking_Landscape_2026.md` — Marktlandschaft
37. `Docs/Knowledge/Factiverse_Lessons_for_FactHarbor.md` — Wettbewerberanalyse
38. `Docs/Knowledge/FullFact_AI_Lessons_for_FactHarbor.md` — Wettbewerberanalyse
