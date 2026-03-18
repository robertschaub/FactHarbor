# Innovationsprojekt mit Umsetzungspartner

**Projekttitel:**
**LiveCheck: Evidenzbasierte Echtzeit-Faktenprüfung für Audio- und Video-Inhalte**
*LiveCheck: Evidence-Based Real-Time Fact-Checking for Audio and Video Streams*

**Umsetzungspartner:** FactHarbor Verein, Zürich
**Forschungspartner:** Universität Zürich, Department of Finance, Gruppe Prof. Markus Leippold
**Projektdauer:** 24 Monate
**Gesamtbudget:** CHF 485'750

---

## 1. Kurzbeschreibung

Ziel des Projekts ist die Entwicklung eines produktnahen Systems zur echtzeitnahen, evidenzbasierten Faktenprüfung von Audio- und Video-Inhalten. Das System zerlegt laufende Inhalte aus Livestreams, Debatten, Interviews, Podcasts und Videos in verifizierbare Aussagen, recherchiert relevante Evidenz unter harten Zeitbudgets, bewertet die Qualität dieser Evidenz mittels kalibrierter Mechanismen und erzeugt vorläufige, transparent begründete und attribuierte Verifikationssignale mit expliziter Unsicherheitskommunikation.

Das Projekt baut auf der bestehenden FactHarbor-Plattform auf — einem funktionsfähigen, evidenzbasierten Faktenprüfungssystem (TRL 5-6) mit 1199 bestandenen Tests, einer 5-Schritt-LLM-Debattenarchitektur, 7 integrierten Suchmaschinen und über 200 konfigurierbaren Parametern. LiveCheck erweitert diese bewährte Architektur auf den grundlegend neuen Anwendungsbereich der Echtzeit-Audio-/Video-Verarbeitung (TRL 3→6).

Bestehende Systeme sind entweder schnell aber flach (LiveFC: binäre Urteile ohne Evidenzqualitätsbewertung; Factiverse: ~80% Genauigkeit ohne publiziertes Evidenz-Framework) oder tief aber langsam (CLIMINATOR: 96% Genauigkeit, nur Batch-Modus). Kein existierendes System kombiniert Echtzeitfähigkeit mit evidenzbasierter Attribution, kalibrierter Unsicherheit und Human-in-the-Loop-Eskalation (Vykopal et al. 2024; Guo et al. 2022). Das Projekt adressiert sieben dokumentierte Forschungslücken und stellt gleichzeitig ein Innovationsprojekt mit klarer Verwertungsperspektive dar.

---

## 2. Die innovative Lösung

### 2.1 Innovative Aspekte

Der innovative Kern liegt in einer integrierten Systemarchitektur für evidenzbasierte Live-Faktenprüfung, die sieben technisch-wissenschaftliche Problemfelder erstmals zusammenführt:

**1. Streaming Claim Detection**
Fortlaufende Erkennung verifizierbarer Aussagen in laufenden Audio-/Video-Streams mit Rolling-Window-Segmentierung, Sprecherdiarisierung und Incomplete-Utterance-Handling. Bisherige Systeme (ClaimBuster, CLEF CheckThat!) operieren auf vollständigen Sätzen/Dokumenten (Hassan et al. 2017; Barron-Cedeño et al. 2024).

**2. Low-Latency Evidence Retrieval mit Zeitbudgets**
Evidenzsuche unter harten Zeitbudgets (Ziel: <15 Sekunden), die das bestmögliche Ergebnis innerhalb der Latenzgrenze liefert. FIRE (Xie et al., NAACL 2025) demonstriert iterative, konfidenzbasierte Retrieval mit 7.6× Kostenreduktion, operiert aber auf statischen Claims.

**3. Attribuierbare Live-Verifikation**
Jede vorläufige Einschätzung ist auf konkrete Quellen und Evidenzfragmente zurückführbar. Warren et al. (CHI 2025) zeigen in Interviews mit Faktenprüfern, dass Replizierbarkeit — Links zu Quellen und Daten — die wichtigste Anforderung an automatisierte Systeme ist.

**4. Uncertainty-Aware Output mit konfidenzbasierter Kalibrierung**
Live-Ausgaben mit expliziter, kalibrierter Unsicherheitskommunikation statt falsch präziser Soforturteile. FactHarbors bestehende Konfidenz-Kalibrierung (Density Anchor, Band Snapping, Verdict Coupling, Context Consistency) wird auf Streaming-Anforderungen erweitert. Konforme Vorhersage für NLP ist als theoretischer Rahmen etabliert (TACL 2024 Survey), wurde aber nie auf Streaming-Predictions angewendet.

**5. Human-in-the-Loop-Eskalation in Echtzeit**
Automatisierte Vorselektion und Priorisierung mit bewusst eingebautem Übergang zur menschlichen Überprüfung unter Latenzrestriktionen. Full Fact AI unterstützt 40+ Organisationen (333'000 Sätze/Tag), arbeitet aber asynchron. LiveCheck entwickelt eine Echtzeit-Triage.

**6. Multi-Agenten-Debatte unter Zeitrestriktionen**
FactHarbors bewährte 5-Schritt-Debattenarchitektur (Advocate → Self-Consistency → Challenger → Reconciler → Validation) mit Cross-Provider-Rollenzuweisung (Stammbach & Ash 2024). Bestehende Debatten-Frameworks (CLIMINATOR, Tool-MAD, DebateCV) operieren ohne Zeitrestriktionen. Die Adaption auf Echtzeit ist wissenschaftlich unerforscht.

**7. Produktionsnahe Evaluationsschicht**
Systematische Messung von Latenz, Präzision, Recall, Attributionsqualität, Stabilität und Fehlertypen. Kein standardisierter Benchmark für Live-Faktenprüfung existiert. LiveCheck wird einen solchen Benchmark als wissenschaftlichen Beitrag entwickeln.

### 2.2 Erweiterung des Stands von Wissenschaft und Technik

#### Forschungslandschaft

Automated Fact-Checking hat sich als eigenständiges NLP-Forschungsfeld mit einem kanonischen Pipeline-Modell etabliert: Claim Detection → Evidence Retrieval → Verdict Prediction → Justification Production (Guo et al. 2022). Drei Entwicklungsrichtungen prägen die aktuelle Forschung:

**Multi-Agenten-Debatte:** CLIMINATOR (Leippold et al., npj Climate Action 2025) erreicht 96% Genauigkeit mit einem Mediator-Advocate-Framework. Tool-MAD (2026) führt werkzeugdiversifizierte Agenten ein (5.5% Verbesserung). DebateCV (2025) erreicht 83.4% Genauigkeit. Alle Systeme operieren im Batch-Modus ohne Zeitrestriktionen.

**Evidenz-Retrieval:** FIRE (Xie et al., NAACL 2025) demonstriert iterative, konfidenzbasierte Suche mit 7.6× Kosten- und 16.5× Suchkostenreduktion. DIRAS (Schimanski et al., NAACL 2025) zeigt, dass ein 8B-Modell via Wissensdistillation GPT-4-Niveau erreicht. Kein System adressiert zeitbudgetierte Retrieval in Echtzeit.

**Live-Faktenprüfung:** LiveFC (Venktesh & Setty, WSDM 2025) ist das einzige publizierte End-to-End-System (83.9% F1). Factiverse verfolgte 1'123 Aussagen in Echtzeit während der US-Debatten 2024.

#### Limitationen bestehender Live-Systeme

| System        | Evidenztiefe              | Attribution                      | Unsicherheit              | Human-in-Loop           | Granularität       |
|---------------|---------------------------|----------------------------------|---------------------------|-------------------------|--------------------|
| LiveFC        | NLI-Klassifikation        | Keine                            | Keine                     | Keine                   | Binär              |
| Factiverse    | Web-Ranking               | Nicht publiziert                 | Nicht publiziert          | Via Faktisk (async)     | ~80% Genauigkeit   |
| ClaimBuster   | Keine (nur Detection)     | —                                | —                         | —                       | 3-Klassen-Score    |
| **LiveCheck** | **Multi-Agenten-Debatte** | **Explizite Quellenattribution** | **Kalibrierte Konfidenz** | **Echtzeit-Eskalation** | **7-Punkte-Skala** |

### 2.3 Forschungsfragen

**FF1:** Wie verhält sich die Attributionsqualität (Source Quality, Answer Attributability nach Schimanski et al. 2024) unter zunehmend kürzeren Retrieval-Zeitfenstern? Gibt es einen charakteristischen Kipp-Punkt?

**FF2:** Lässt sich die Multi-Agenten-Debatte auf Sub-30-Sekunden-Latenzen skalieren, ohne die Verdict-Qualität signifikant zu reduzieren? Welche Debattenschritte sind unter Zeitdruck verzichtbar?

**FF3:** Welche Evidenz-Ranking-Strategien optimieren den Precision-Recall-Tradeoff bei Evidenzsuche unter harten Zeitbudgets (5s, 15s, 30s, 60s)?

**FF4:** Wie kann kalibrierte Unsicherheit für Streaming-Predictions mit evolving evidence base kommuniziert werden? Wie verändert sich die Konfidenz als Funktion der akkumulierten Evidenz?

**FF5:** Welche Claim-Merkmale sagen voraus, ob ein Claim automatisiert verifiziert oder an menschliche Reviewer eskaliert werden muss?

### 2.4 Warum dies mehr ist als bewährte Praktiken

Die zentralen Zielkonflikte sind wissenschaftlich ungelöst:

- **Latenz vs. Evidenzqualität:** FIRE zeigt, dass iterative Retrieval die Qualität steigert, aber jede Iteration kostet Zeit. Wie sich diese Kurve unter harten Echtzeit-Deadlines verhält, ist unbekannt (FF1, FF3).
- **Debattentiefe vs. Echtzeitfähigkeit:** CLIMINATOR benötigt mehrere iterative Debatterunden. Ob eine reduzierte Debatte unter Zeitdruck noch signifikant besser als Single-Pass-Klassifikation ist, ist eine offene empirische Frage (FF2).
- **Automatisierung vs. Verantwortbarkeit:** Full Fact AI delegiert alle Verdicts an Menschen. LiveCheck muss einen Mittelweg finden: ausreichend automatisiert für Echtzeit, ausreichend transparent für redaktionelle Verantwortung (FF5).
- **Provisorische Signale vs. Fehlerrisiko:** Streaming-Unsicherheitsquantifizierung mit evolving evidence ist ein eigenständiges Forschungsproblem ohne publizierte Lösung (FF4).

### 2.5 Dokumentierte Forschungslücken

| # | Forschungslücke                                                  | Evidenz                                               | LiveCheck-Beitrag                                       |
|---|------------------------------------------------------------------|-------------------------------------------------------|---------------------------------------------------------|
| 1 | Kein integriertes Echtzeit-evidenzbasiertes Fact-Checking-System | Vykopal et al. (2024): "real-time largely unexplored" | Erstes System mit Echtzeit + Evidenztiefe + Attribution |
| 2 | Unsicherheitsquantifizierung für Streaming-Predictions           | CP Survey (TACL 2024): nur statische Predictions      | Kalibrierte provisorische Verdicts                      |
| 3 | Zeitbudgetierte Evidenzsuche für Live-Verifikation               | FIRE (NAACL 2025): iterativ, aber statisch            | Evidence Retrieval mit Early-Stopping                   |
| 4 | Echtzeit-Human-in-the-Loop-Eskalation                            | Full Fact AI: 40+ Organisationen, aber asynchron      | Prädiktive Triage unter Latenzrestriktionen             |
| 5 | Multi-Agenten-Debatte unter Zeitrestriktionen                    | CLIMINATOR, Tool-MAD: alle ohne Zeitbudgets           | Zeitrestringierte adversariale Verifikation             |
| 6 | Kein Evaluationsbenchmark für Live-Faktenprüfung                 | LiveFC: ad-hoc-Evaluation gegen PolitiFact            | Standardisierter Benchmark                              |
| 7 | Streaming-Claim-Detection aus Audio                              | ClaimBuster/CLEF: vollständiger Text                  | Detection für gesprochene Sprache                       |

### 2.6 IPR / Freedom to Operate

**Patentrecherche (Voranalyse):** Keine blockierenden Patente im Kernbereich evidenzbasierter Live-Verifikation identifiziert. ClaimBuster (UT Arlington): publiziert, kein Patent. Factiverse: keine publizierten Patente. Google Fact Check Tools: offener Schema.org-Standard.

**Freedom to Operate:** Alle Kernkomponenten verwenden offene Lizenzen (Whisper: MIT; pyannote: MIT; AI SDK: Apache 2.0). Eigene Debattenarchitektur unabhängig entwickelt.

**IP-Strategie:**
- Open-Source-Kern: Pipeline-Architektur, Evaluations-Framework, Benchmark-Daten → maximale wissenschaftliche Verwertbarkeit
- Geschäftsgeheimnis: Kalibrierungskonfigurationen, optimierte Prompt-Templates, Triage-Modelle → Wettbewerbsvorteil
- Patentfähigkeit prüfen: Echtzeit-Debattenarchitektur unter Zeitbudgets

**Vertragliche Regelung:** IPR-Vereinbarung innerhalb 3 Monate nach Projektstart. Forschungspartner: akademische Publikationsrechte. Umsetzungspartner: kommerzielle Verwertungsrechte. Gemeinsam: Benchmark-Daten und Evaluations-Framework.

---

## 3. Der Mehrwert des Innovationsprojekts

### 3.1 Geschäftsmodell und Wertschöpfungskette

FactHarbor positioniert sich als evidenzbasierte Verifikationsinfrastruktur zwischen Monitoring-Layer (Full Fact, Logically) und redaktioneller Review/Publikation.

| Segment                | Produkt                | Preismodell                      | Zielumsatz (Jahr 3-5)    |
|------------------------|------------------------|----------------------------------|--------------------------|
| Newsroom-Tooling       | LiveCheck SaaS         | Subscription CHF 500-2'000/Monat | CHF 120'000-360'000/Jahr |
| API-Service            | Verifikations-API      | Pay-per-Call CHF 0.50-2.00       | CHF 60'000-180'000/Jahr  |
| Institutionelle Lizenz | Enterprise-Lösung      | Jahreslizenz CHF 5'000-20'000    | CHF 50'000-200'000/Jahr  |
| Evaluations-Service    | Benchmark-as-a-Service | Projektbasiert                   | CHF 30'000-100'000/Jahr  |

**Ziel:** CHF 260'000-840'000 jährlicher Umsatz ab Jahr 3 nach Projektende. Break-Even bei CHF 200'000/Jahr.

### 3.2 Kundenprobleme und gesellschaftliche Herausforderung

**Quantifiziertes Problem:**
- Manuelle Faktenprüfung dauert 15-60 Minuten pro Claim (CBS News, PolitiFact bei US-Debatten 2024). Falschinformationen verbreiten sich in dieser Zeit millionenfach.
- 443 aktive Faktenprüfungsprojekte weltweit (Duke Reporters' Lab 2025) bei Millionen täglich zirkulierender Aussagen.
- Immer grösserer Anteil öffentlicher Kommunikation in Video-, Podcast- und Livestream-Formaten.
- Finanzierungskrise: Meta beendete US-TPFC (Januar 2025, ~160 Organisationen betroffen). Google strich Förderungen (Oktober 2025, >GBP 1 Mio./Jahr Verlust für Full Fact). Organisationen brauchen dringend unabhängige Werkzeuge.

### 3.3 Nachweis der Notwendigkeit

1. **Akademische Validierung:** Warren et al. (CHI 2025) dokumentieren, dass Faktenprüfer Replizierbarkeit und Unsicherheitstransparenz als wichtigste unerfüllte Anforderungen nennen — LiveChecks Kernversprechen.

2. **Marktvalidierung durch Konkurrenzprodukt:** Factiverse erhielt EUR 1 Mio. Finanzierung, setzte bei US-Debatten 2024 ein (1'123 Claims). Belegt: Marktnachfrage existiert, Investoren sehen Potenzial, bestehende Lösung hat Qualitätslimitationen.

3. **Regulatorische Nachfrage:** EU Digital Services Act (seit Februar 2024), EU AI Act (Durchsetzung August 2026). 44 Verpflichtungen und 128 Massnahmen im EU Code of Practice on Disinformation.

4. **Organisatorische Nachfrage:** Full Fact AI wird von 40+ Organisationen in 30+ Ländern genutzt — Bereitschaft zur Lizenzierung von KI-Tools belegt.

### 3.4 USP / Differenzierung

| USP-Dimension               | LiveCheck                                         | Nächster Wettbewerber                   | Differenzierung |
|-----------------------------|---------------------------------------------------|-----------------------------------------|-----------------|
| Evidenzbasierte Attribution | Jeder Verdict trackt zu Quellen/Evidenzfragmenten | Factiverse: NLI ohne Attribution        | Hoch            |
| Kalibrierte Unsicherheit    | 7-Punkte-Skala + Konfidenzband + Evidenzdichte    | LiveFC: Binär                           | Hoch            |
| Multi-Agenten-Debatte       | 5-Schritt, Cross-Provider                         | CLIMINATOR: Batch-only, klimaspezifisch | Mittel-Hoch     |
| Themenagnostisch            | Jedes Thema, jede Sprache                         | Factiverse: 114 Sprachen                | Mittel          |
| Human-in-the-Loop           | Prädiktive Echtzeit-Triage                        | Full Fact: async, alle manuell          | Hoch            |

### 3.5 Markt und adressierbarer Markt

**Serviceable Addressable Market (SAM) — DACH + EU:**

| Segment                                 | Organisationen | Durchschn. Budget | SAM              |
|-----------------------------------------|----------------|-------------------|------------------|
| Fact-Checking-Redaktionen (EU)          | ~150           | CHF 12'000/Jahr   | CHF 1.8 Mio.     |
| Newsrooms mit Monitoring (DACH)         | ~50            | CHF 18'000/Jahr   | CHF 900'000      |
| Institutionelle Monitoring-Teams (DACH) | ~30            | CHF 24'000/Jahr   | CHF 720'000      |
| **SAM gesamt**                          |                |                   | **CHF 3.4 Mio.** |

**Serviceable Obtainable Market (5 Jahre):**
- Jahr 2: 3-5 Pilotkunden → CHF 30'000-60'000
- Jahr 3: 10-15 Kunden → CHF 150'000-300'000
- Jahr 5: 30-50 Kunden → CHF 600'000-840'000

Erwartete Wachstumsrate: 40-60% jährlich, getrieben durch regulatorischen Druck (DSA, AI Act), Plattform-Rückzug (Meta, Google) und zunehmende Live-/Video-Formate.

### 3.6 Wettbewerberanalyse

| Kriterium                  | LiveCheck             | Factiverse  | Full Fact AI | LiveFC    | Logically  | Buster.ai  |
|----------------------------|:---------------------:|:-----------:|:------------:|:---------:|:----------:|:----------:|
| Echtzeit Audio/Video       | Ja                    | Ja          | Nein         | Ja        | Nein       | Nein       |
| Evidenzbasiert             | Ja                    | Teilw.      | Nein         | Teilw.    | Teilw.     | Ja         |
| Quellenattribution         | Explizit              | Keine publ. | Keine        | Keine     | Keine      | Implizit   |
| Unsicherheitskommunikation | Kalibriert (7-Punkte) | Keine publ. | —            | Keine     | Keine      | Keine      |
| Human-in-the-Loop          | Echtzeit-Triage       | Async       | Ja (async)   | Nein      | Ja (async) | Nein       |
| Multi-Agenten-Debatte      | 5-Schritt             | Nein        | Nein         | Nein      | Nein       | Nein       |
| Sprachen                   | Multilingual (LLM)    | 114         | 3            | Begrenzt  | 57         | Multi      |
| Publizierte Genauigkeit    | Zu evaluieren         | ~80%        | 50→80%       | 83.9% F1  | —          | —          |
| Finanzierung               | Innosuisse            | EUR 1 Mio.  | Stiftungen   | Forschung | VC         | EUR 2 Mio. |

**Wettbewerbsvorteil:**
- Know-how: Einzige Cross-Provider-Debattenarchitektur (4 LLM-Provider). Kalibrierungs-Framework ohne publiziertes Äquivalent. 1199 Tests mit Input-Neutralitätsprüfung.
- Time-to-Market: Bestehende Plattform (TRL 5-6) als Ausgangspunkt.
- Eintrittsbarrieren: Integration von 7 Suchmaschinen + 4 LLM-Providern + 5-Schritt-Debatte + Kalibrierung = hohe Reproduktionskosten. Kalibrierungsdaten über Hunderte Testfälle aufgebaut.

### 3.7 Umsatz- und Rentabilitätsentwicklung (NPV-Szenarien)

**Szenario A: Ohne Innosuisse-Förderung**

| Jahr | Investition  | Umsatz      | Cashflow     | Kumulativ    |
|------|--------------|-------------|--------------|--------------|
| 1    | CHF -150'000 | CHF 0       | CHF -150'000 | CHF -150'000 |
| 2    | CHF -120'000 | CHF 0       | CHF -120'000 | CHF -270'000 |
| 3    | CHF -80'000  | CHF 60'000  | CHF -20'000  | CHF -290'000 |
| 4    | CHF -60'000  | CHF 150'000 | CHF 90'000   | CHF -200'000 |
| 5    | CHF -60'000  | CHF 300'000 | CHF 240'000  | CHF 40'000   |

**NPV (8%, 5 Jahre): CHF -82'000** — wirtschaftlich marginal

**Szenario B: Mit Innosuisse-Förderung**

| Jahr | Investition (FH) | Innosuisse  | Umsatz      | Cashflow (FH) | Kumulativ    |
|------|------------------|-------------|-------------|---------------|--------------|
| 1    | CHF -65'000      | CHF 137'500 | CHF 0       | CHF -65'000   | CHF -65'000  |
| 2    | CHF -65'000      | CHF 137'500 | CHF 30'000  | CHF -35'000   | CHF -100'000 |
| 3    | CHF -40'000      | CHF 0       | CHF 150'000 | CHF 110'000   | CHF 10'000   |
| 4    | CHF -40'000      | CHF 0       | CHF 400'000 | CHF 360'000   | CHF 370'000  |
| 5    | CHF -40'000      | CHF 0       | CHF 600'000 | CHF 560'000   | CHF 930'000  |

**NPV (8%, 5 Jahre): CHF 585'000** — wirtschaftlich attraktiv

**Die Innosuisse-Förderung ermöglicht einen um 2 Jahre früheren Markteintritt (Differenz: CHF 667'000).**

### 3.8 Markteinführungsstrategie

**Phase 1 — Pilotierung (Monat 18-24):** 2-3 Pilot-Newsrooms im DACH-Raum. Kostenlose Nutzung gegen strukturiertes Feedback. Live-Einsatz bei politischen Debatten.

**Phase 2 — Erste Kunden (Jahr 1 nach Projekt):** Conversion der Pilotpartner. Aufbau API-Service. Präsenz auf Fachkonferenzen (Global Fact, CLEF, IJ4EU).

**Phase 3 — Skalierung (Jahre 2-3):** Expansion in EU-Markt (EDMO-Hubs). Institutionelle Lizenzen. Partnerschaft mit Full Fact AI.

**Nachweis früher Marktentwicklung:** FactHarbor-Plattform ist operativ. Factiverse-Markterfolg beweist Zahlungsbereitschaft im Segment. Akademisches Interesse von UZH/ETH bestätigt.

### 3.9 Nachhaltigkeit

Die finanzielle Nachhaltigkeit basiert auf einem Einnahmenmodell ohne Abhängigkeit von Spenden, Sponsoring oder Subventionen:

| Einnahmequelle                    | Anteil (Ziel, Jahr 5) |
|-----------------------------------|-----------------------|
| B2B SaaS-Subscriptions            | 50%                   |
| API-Umsatz (Pay-per-Verifikation) | 25%                   |
| Institutionelle Lizenzen          | 15%                   |
| Evaluations-/Beratungsdienste     | 10%                   |

Risikominimierung: Dual-Tier-Preismodell (Non-Profit / kommerziell). Multi-Provider-Architektur ohne Abhängigkeit von einem LLM-Anbieter (Lehre aus Full Facts Google-Verlust: >GBP 1 Mio./Jahr).

### 3.10 Erwartete Resultate und Begünstigte

**Quantitative Ergebnisse:**

| Metrik                 | Zielwert               | Baseline                          |
|------------------------|------------------------|-----------------------------------|
| End-to-End-Latenz      | <15 Sekunden           | Manuell: 15-60 Minuten            |
| Claim Detection F1     | ≥0.85                  | ClaimBuster: 0.899; LiveFC: 0.899 |
| Veracity Prediction F1 | ≥0.75                  | LiveFC: 0.839 (binär)             |
| Attributionsqualität   | ≥80% korrekt           | Schimanski et al. 2024            |
| Verdict-Stabilität     | <10pp Schwankung (60s) | Kein Benchmark (neu)              |
| Reviewer-Zeitersparnis | ≥40%                   | Full Fact: qualitativ bestätigt   |
| Pilotpartner           | ≥3                     | —                                 |
| Publikationen          | ≥3 (ACL/EMNLP/NAACL)   | —                                 |
| Benchmark-Dataset      | 1 (öffentlich)         | —                                 |

**Direkte Begünstigte:** Newsrooms, Fact-Checking-Organisationen (443+ weltweit), Monitoring-Teams, öffentliche Institutionen.

**Indirekte Begünstigte:** Mediennutzer:innen, demokratische Öffentlichkeit, Forschende im Bereich Information Integrity.

### 3.11 Beitrag zu nachhaltiger Entwicklung

| SDG                                                  | Beitrag                                                    |
|------------------------------------------------------|------------------------------------------------------------|
| SDG 16: Frieden, Gerechtigkeit, starke Institutionen | Stärkung öffentlicher Informationsintegrität               |
| SDG 9: Industrie, Innovation, Infrastruktur          | Neuartige Verifikationsinfrastruktur                       |
| SDG 4: Hochwertige Bildung                           | Transparente Quellenattribution fördert Medienkompetenz    |
| SDG 17: Partnerschaften                              | Akademisch-industrielle Partnerschaft; Open-Source-Beitrag |

---

## 4. Projektplanung

### 4.1 Projektpartner und Rollen

#### Umsetzungspartner — FactHarbor Verein, Zürich

**Rolle:** Produktvision und Systemarchitektur, Integration in bestehende Plattform (TRL 5-6), Implementierung der Live-Pipeline, Pilotierung, Verwertung.

**Kompetenzen:**
- Lauffähige evidenzbasierte Faktenprüfungsplattform (1199 Tests, Produktionsbetrieb)
- 5-Schritt-LLM-Debattenarchitektur mit Cross-Provider-Rollenzuweisung
- Multi-Provider-Integration: Anthropic, OpenAI, Google, Mistral (4 LLM-Provider)
- 7 integrierte Suchmaschinen: Google CSE, SerpAPI, Brave, Serper, Wikipedia, Semantic Scholar, Google Fact Check API
- Kalibrierungs-Framework: Konfidenz-Kalibrierung, Input-Neutralitätsprüfung (≤4% Toleranz), systematische Bias-Messung
- UCM-Konfigurationssystem mit 200+ konfigurierbaren Analyseparametern

#### Forschungspartner — Universität Zürich, Department of Finance

**Gruppe:** Prof. Markus Leippold
**Kontaktperson:** Tobias Schimanski (PhD-Kandidat / angehender Postdoc)

**Rolle:** Methodische Mitentwicklung (Streaming-Verifikation, Uncertainty-Quantifizierung), Evaluationsdesign und Benchmarking, wissenschaftliche Fundierung und Publikation.

**Qualifikationen der Gruppe:**
- CLIMINATOR: 96% Genauigkeit bei Faktenprüfung mit Multi-Agenten-Debatte (npj Climate Action 2025)
- AFaCTA: Claim-Detection-Framework, angewendet auf 6 Mio. US-Kongressreden (ACL 2024)
- DIRAS: Kalibriertes Relevanz-Scoring via Wissensdistillation, 8B-Modell auf GPT-4-Niveau (NAACL 2025)
- Faithful LLM Specialists: Source-Attribution-Metriken (ACL 2024)
- ClimRetrieve: IR-Benchmark (EMNLP 2024)
- ClimateBERT: 16 Modelle, 840'000+ Downloads
- SERI-Förderung NATURE-3B (CHF 748'000, 2025)

**Affiliiert:** Prof. Elliott Ash (ETH Zürich, Center for Law & Economics) — Kalibrierung und Bias-Analyse.

### 4.2 Team

| Rolle                       | Profil                  | Qualifikation                                     | Aufwand  |
|-----------------------------|-------------------------|---------------------------------------------------|----------|
| Projektleiter (UP)          | FactHarbor Gründer      | System-Architektur, Full-Stack, NLP/LLM-Erfahrung | 60% FTE  |
| Wissenschaftl. Leitung (FP) | Postdoc (UZH)           | PhD in NLP/IR, Publikationen ACL/EMNLP/NAACL      | 80% FTE  |
| PI (FP)                     | Prof. M. Leippold (UZH) | Full Professor, PI CLIMINATOR                     | 10% FTE  |
| Beratend (FP)               | T. Schimanski (UZH)     | Attribution, Retrieval, Debatte                   | 10% FTE  |
| Beratend (FP)               | Prof. E. Ash (ETH)      | Kalibrierung, Bias-Analyse                        | Beratend |

### 4.3 Arbeitspakete

#### AP1 — Use Cases, Datenbasis, Evaluationsrahmen (Monate 1-4)
**Verantwortung:** FP (Lead), UP (Use-Case-Anforderungen)

**Ergebnisse:**
- Use-Case-Spezifikation mit messbaren KPIs
- Evaluationsprotokoll (Latenz, F1, Attribution Quality, Verdict Stability)
- Daten- und Rechtekonzept (DSG-konform)
- Live-Faktenprüfungs-Benchmark-Design
- Ontologie-Spezifikation

#### AP2 — Streaming Ingestion und Claim Detection (Monate 3-10)
**Verantwortung:** UP (Pipeline), FP (Detection-Modelle)

**Technologie:** Whisper Large V3 Turbo (MIT, 300ms Latenz), pyannote-audio (MIT, WER 2.68%), Fine-tuned XLM-RoBERTa oder LLM-basiert (Vergleichsstudie).

**Ergebnisse:**
- Streaming-Ingestion-Prototyp (Audio → segmentierter Text in <3s)
- Claim-Candidate-Engine mit Rolling-Window-Detection
- Detection-Baseline (Ziel: F1 ≥ 0.85)
- Vergleichsstudie Classifier vs. LLM-Prompt

#### AP3 — Zeitbudgetierte Evidenzsuche und Live-Verifikation (Monate 8-16)
**Verantwortung:** UP (Retrieval-Integration), FP (Ranking/Attribution)

**Ergebnisse:**
- Zeitbudgetierte Retrieval-Schicht mit konfidenzbasiertem Early-Stopping
- Attributionslogik mit Degradations-Kurve
- Optimierte Debatte-Konfiguration für verschiedene Latenzbudgets (5s/15s/30s/60s)
- Live-Signal-Ausgabe mit kalibrierter Unsicherheit
- Publikation: Attributionsqualität unter Zeitdruck (Ziel: ACL/EMNLP)

#### AP4 — Human-in-the-Loop und Produktintegration (Monate 14-22)
**Verantwortung:** UP (UI/Produkt), FP (Triage-Modell)

**Ergebnisse:**
- Reviewer-Oberfläche mit Echtzeit-Evidenzanzeige
- Prädiktives Triage-Modell
- Eskalationslogik mit konfigurierbaren Schwellenwerten
- Pilotfähige Produktintegration
- Publikation: Prädiktive Triage (Ziel: CHI/CSCW)

#### AP5 — Evaluation, Pilotierung, Verwertung (Monate 20-24)
**Verantwortung:** UP (Pilotierung), FP (Evaluation)

**Ergebnisse:**
- Evaluationsbericht mit vollständiger Metrik-Dokumentation
- Pilotreport (≥3 Partner, ≥2 Live-Events)
- Verwertungs- und Nachhaltigkeitskonzept
- Live-Faktenprüfungs-Benchmark (öffentlich)
- Publikation: Benchmark-Paper (Ziel: FEVER Workshop / CLEF CheckThat!)
- Go-/No-Go-Entscheid

### 4.4 Meilensteine

| Meilenstein               | Monat | Kriterium (messbar)                                                                      | Go/No-Go     |
|---------------------------|-------|------------------------------------------------------------------------------------------|--------------|
| **M1: Projektbasis**      | 4     | Use Cases mit KPIs definiert; Evaluationsprotokoll verabschiedet; Ontologie spezifiziert | —            |
| **M2: Claim Detection**   | 8     | F1 ≥ 0.80 bei Latenz < 5s auf deutschsprachigen Audio-Streams                            | **Go/No-Go** |
| **M3: Evidenzsuche**      | 12    | Relevante Evidenz innerhalb <15s; Attributionsqualität ≥ 70%                             | —            |
| **M4: Live-Signale**      | 16    | Verifikationssignale mit Quellenbezug; Verdict-Stabilität < 15pp (60s)                   | **Go/No-Go** |
| **M5: Human-in-Loop**     | 20    | Reviewer-Workflow integriert; Triage-Genauigkeit ≥ 80%                                   | —            |
| **M6: Transferentscheid** | 24    | ≥3 Pilotpartner evaluiert; ≥2 bestätigen Produktnutzen                                   | **Go/No-Go** |

### 4.5 Gantt-Übersicht

```
Monat:    1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21 22 23 24
AP1       ████████████████████
AP2                ████████████████████████████████████
AP3                               ████████████████████████████████████
AP4                                                 █████████████████████████████████
AP5                                                                    █████████████
          ↑           ↑              ↑                 ↑                    ↑        ↑
          M1          M2             M3                M4                   M5       M6
```

---

## 5. ICT- / AI-spezifische Anforderungen

### 5.1 Ontologie

```
UserInput (Audio/Video/Text)
  ↓ [Streaming Ingestion]
TranscribedSegment {speakerId, timestamp, text}
  ↓ [Claim Detection]
AtomicClaim {claimText, claimType, centrality, harmPotential, checkWorthiness, speakerAttribution}
  ↓ [Evidence Retrieval]
EvidenceItem {statement, category, claimDirection, probativeValue, sourceType, sourceAuthority,
              evidenceBasis, evidenceScope, sourceReliability}
  ↓ [Clustering]
ClaimAssessmentBoundary {evidenzbasierte Gruppierung kompatibler EvidenceScopes}
  ↓ [Debate & Verdict]
ClaimVerdict {truthPercentage, confidence, rating[7-point], supportingEvidenceIds,
              reasoning, isContested, factualBasis, provisionalStability}
```

**Claim-Typen:** FACTUAL, OPINION, PREDICTION, AMBIGUOUS
**Evidence-Kategorien:** legal_provision, evidence, direct_evidence, expert_quote, statistic, event, criticism
**Source-Typen:** peer_reviewed_study, fact_check_report, government_report, legal_document, news_primary, news_secondary, expert_statement, organization_report
**Verdict-Skala:** TRUE, MOSTLY-TRUE, LEANING-TRUE, MIXED, UNVERIFIED, LEANING-FALSE, MOSTLY-FALSE, FALSE

Die Ontologie wird in AP1 verfeinert und über ein UCM-Konfigurationssystem verwaltet.

### 5.2 Datenquellen

| Quelle                              | Zugang                 | Nutzungsrecht                      |
|-------------------------------------|------------------------|------------------------------------|
| Live-Audio-Streams (TV, Podcasts)   | HLS/m3u8, öffentlich   | Forschungsprivileg CH URG Art. 24d |
| Video-Clips (Mediatheken)           | Öffentlich             | Forschungsprivileg                 |
| CLEF CheckThat! / AVeriTeC          | Forschungs-Communities | Akademische Lizenz                 |
| Web-Quellen (7 Suchmaschinen)       | APIs                   | Öffentlich zugänglich              |
| Semantic Scholar (216 Mio.+ Papers) | API                    | Frei nutzbar                       |
| Google Fact Check API (280'000+)    | API                    | Frei nutzbar                       |

Datenschutz: Keine personenbezogenen Daten gespeichert. Transkripte nur für Analysedauer. DSG-konforme Verarbeitung.

### 5.3 Trainingsdaten

LiveCheck nutzt vortrainierte LLMs via API. Trainingsdaten betreffen primär Claim Detection (Fine-Tuning):

- ClaimBuster-Datensatz: ~23'000 annotierte Sätze
- CLEF CheckThat! Datasets: 2018-2025, 15+ Sprachen
- Eigene Produktionsannotationen: Ziel 1'000+ Claims (IAA ≥ 0.75 Cohen's κ)

**Evaluationsdaten:** AVeriTeC (4'568 Claims, 50 Organisationen), FEVER (185'000 Claims), eigener Live-Benchmark (Ziel: 500+ Claims).

**Erwartete Fehlerraten:**

| Komponente      | FP-Rate | FN-Rate | Umgang                                     |
|-----------------|---------|---------|--------------------------------------------|
| Claim Detection | <15%    | <20%    | FP: Ressourcenkosten. FN: Human Escalation |
| Verdict         | <20%    | <20%    | Unsicherheitskommunikation + Escalation    |
| Triage          | <10%    | <15%    | FP akzeptabel. FN: Confidence-Floor        |

**Rückkopplungsschleife:** Reviewer-Feedback → Triage-Training. Pilotdaten → Benchmark-Erweiterung. Produktionsdaten → Konfidenz-Kalibrierung. Source-Reliability-Cache wächst kontinuierlich.

### 5.4 Algorithmus-Begründung

| Komponente         | Technologie                       | Begründung                                        | Leistungsannahme   |
|--------------------|-----------------------------------|---------------------------------------------------|--------------------|
| Transkription      | Whisper V3 Turbo                  | 5.4× schneller; MIT; 100+ Sprachen                | WER < 5%           |
| Diarisierung       | pyannote-audio                    | State-of-the-Art; MIT; WDER 2.68%                 | WDER < 5%          |
| Claim Detection    | XLM-RoBERTa / LLM                 | Multilingual; LiveFC: F1 0.899                    | F1 ≥ 0.85          |
| Evidence Retrieval | Multi-Source + FIRE-Retrieval     | 7 Provider; konfidenzbasiertes Early-Stopping     | Evidenz in <15s    |
| Verifikation       | 5-Schritt Debatte                 | Cross-Provider reduziert Bias; CLIMINATOR: 96%    | F1 ≥ 0.75          |
| Confidence         | Multi-Faktor-Kalibrierung         | Density Anchor + Band Snapping + Verdict Coupling | ECE < 0.15         |
| Triage             | Trainiertes Klassifikationsmodell | Prädiktive Eskalation                             | P ≥ 0.80, R ≥ 0.85 |

**Kosten pro Echtzeit-Verifikation:** CHF 0.20-1.00 (dreistufige Modell-Schichtung: Budget/Standard/Premium).

### 5.5 Marktakzeptanz einer nicht 100% exakten Lösung

LiveCheck wird als priorisierende Live-Assistentin positioniert, nicht als unfehlbarer Automat.

1. **Geschwindigkeitsvorteil:** 75% F1 in 15 Sekunden ist für Live-Situationen wertvoller als 95% F1 in 60 Minuten.
2. **Professionelle Validierung:** Warren et al. (CHI 2025) zeigen: Faktenprüfer priorisieren Transparenz und Replizierbarkeit, nicht Perfektion.
3. **Bewährte Akzeptanz:** Full Fact AI startete mit 50% Genauigkeit, wird von 40+ Organisationen genutzt. Factiverse hat ~80% und Kunden.
4. **Vertrauensmechanismus:** 7-Punkte-Skala mit Konfidenzband kommuniziert aktiv, wann ein Ergebnis belastbar ist — ehrlicher als scheinbar sichere Binärurteile.

### 5.6 Black-Swan- / Edge-Case-Handling

| Szenario                  | Erkennung                       | Reaktion                                           |
|---------------------------|---------------------------------|----------------------------------------------------|
| Breaking News             | Evidenzdichte-Check             | Eskalation; "INSUFFICIENT" markiert                |
| Themenverschiebung        | Diarisierung + Segmentierung    | Neuer ClaimAssessmentBoundary                      |
| Ironie/Mehrdeutigkeit     | AMBIGUOUS-Klassifikation        | Niedrige Worthiness; Eskalation                    |
| ASR-Fehler                | WER-Monitoring pro Segment      | Niedrig-konfidente Segmente gefiltert              |
| Adversariale Manipulation | Harm-Potential-Klassifikation   | High-Harm-Floor: 50% Minimum-Confidence            |
| Provider-Ausfall          | Circuit Breaker, Multi-Provider | Automatischer Failover; Eskalation bei <2 Provider |

Robustheit: Multi-Provider-Architektur (7 Suchmaschinen, 4 LLM-Provider). Totalausfall erfordert simultanen Ausfall aller Provider.

### 5.7 Evaluationsmetriken

| Metrik              | Zielwert               | Messmethode                        |
|---------------------|------------------------|------------------------------------|
| End-to-End-Latenz   | <15s (P50), <30s (P95) | Pipeline-Monitoring                |
| Claim Detection F1  | ≥0.85                  | Annotiertes Test-Set (≥500 Claims) |
| Veracity F1         | ≥0.75                  | AVeriTeC + eigener Benchmark       |
| Attribution Quality | ≥80%                   | Manuelle Annotation + NLI          |
| Verdict Stability   | <10pp (60s)            | Evidenz-Akkumulationsfenster       |
| Triage P/R          | P≥0.80, R≥0.85         | Human-annotierte Daten             |
| ECE                 | <0.15                  | Reliability Diagram                |
| Input-Neutralität   | ≤4pp                   | FactHarbor-Framework               |

---

## 6. Budget und Kostenstruktur

### 6.1 Gesamtbudget

| Kostenblock            | Forschungspartner (UZH) | Umsetzungspartner (FH) | Total           |
|------------------------|-------------------------|------------------------|-----------------|
| Personalkosten         | CHF 220'000             | CHF 195'000 (In-Kind)  | CHF 415'000     |
| Material/Infrastruktur | CHF 15'000              | CHF 30'000             | CHF 45'000      |
| Reisen/Konferenzen     | CHF 10'000              | CHF 5'000              | CHF 15'000      |
| Sonstiges              | CHF 5'000               | CHF 5'000              | CHF 10'000      |
| **Zwischensumme**      | **CHF 250'000**         | **CHF 235'000**        | **CHF 485'000** |

### 6.2 Finanzierungsaufteilung

| Quelle                              | Betrag          | Anteil   |
|-------------------------------------|-----------------|----------|
| Innosuisse-Beitrag (an FP)          | CHF 250'000     | 51.5%    |
| Umsetzungspartner In-Kind           | CHF 211'500     | 43.6%    |
| Umsetzungspartner Cash (Barbeitrag) | CHF 24'250      | 5.0%     |
| **Total**                           | **CHF 485'750** | **100%** |

### 6.3 Härtefallklausel — Art. 19 Abs. 2bis FIFG

FactHarbor Verein beantragt eine Reduktion des Barbeitrags. Drei gesetzliche Bedingungen sind erfüllt:

**(a)** Überdurchschnittliches Realisierungsrisiko, aber hoher gesellschaftlicher Nutzen: Echtzeit-Faktenprüfung adressiert eine zentrale demokratische Herausforderung.

**(b)** Ergebnisse nützen einer breiten Nutzergruppe: Open-Source-Benchmark und Evaluations-Framework kommen 443+ Organisationen weltweit zugute.

**(c)** Partner finanziell nicht in der Lage, Standardbeitrag zu leisten, aber überdurchschnittliches Umsetzungspotenzial: Non-Profit-Organisation mit funktionsfähiger Plattform (TRL 5-6).

---

## 7. Wirtschaftliche und gesellschaftliche Wirkung

**Wirtschaftlich:**
- Neues Produkt im wachsenden Segment der Medien-Assistenzsysteme
- 2-5 Arbeitsplätze ab Jahr 3
- Wertschöpfung Schweiz: Technologie, Publikationen, Benchmark-Daten
- Stärkung des Schweizer KI-Ökosystems

**Gesellschaftlich:**
- Stärkung der Informationsintegrität in Live-Formaten
- Werkzeug für 443+ Faktenprüfungsorganisationen
- Unabhängigkeit von Plattform-Finanzierung (Meta, Google)
- EU AI Act-Compliance (Transparenz, Audit, menschliche Aufsicht)
- Open-Source-Benchmark als öffentliches Gut

---

## 8. Risiken und Gegenmaßnahmen

| Risiko                              | WS      | Wirkung | Gegenmaßnahme                                                     |
|-------------------------------------|---------|---------|-------------------------------------------------------------------|
| Latenz zu hoch                      | Mittel  | Hoch    | Gestufte Zeitbudgets (5s/15s/30s/60s); M2 Go/No-Go                |
| Evidenzqualität ungenügend          | Mittel  | Hoch    | FIRE-Early-Stopping; Multi-Source; Contrarian-Search; Eskalation  |
| Markt akzeptiert Unsicherheit nicht | Mittel  | Mittel  | CHI 2025 validiert Bedarf; UX-Design; Human-in-Loop               |
| Daten-/Rechtefragen                 | Mittel  | Hoch    | Frühe Klärung AP1; öffentliche Streams; CH URG Art. 24d           |
| Transkription instabil              | Niedrig | Mittel  | Whisper V3 Turbo (WER <5%); Fallbacks                             |
| LLM-Kosten steigen                  | Niedrig | Mittel  | Multi-Provider; Budget-Tier; lokale Modelle als Fallback          |
| Konkurrent                          | Mittel  | Mittel  | TRL-5-Vorsprung; Differenzierung durch Evidenztiefe + Attribution |

---

## 9. Referenzen

1. Guo, Z., Schlichtkrull, M. & Vlachos, A. (2022). A Survey on Automated Fact-Checking. *TACL*, 10, 178-206.
2. Vykopal, I. et al. (2024). Generative LLMs in Automated Fact-Checking: A Survey. *arXiv:2407.02351*.
3. Venktesh, V. & Setty, V. (2024). LiveFC: Live Fact-Checking of Audio Streams. *WSDM 2025*.
4. Hassan, N. et al. (2017). Toward Automated Fact-Checking: ClaimBuster. *KDD 2017*.
5. Leippold, M. et al. (2025). CLIMINATOR: Automated Fact-Checking of Climate Claims. *npj Climate Action*, 4, 17.
6. Xie, Z. et al. (2025). FIRE: Fact-checking with Iterative Retrieval. *Findings of NAACL 2025*.
7. Schimanski, T. et al. (2024). Faithful and Robust LLM Specialists for Evidence-Based QA. *ACL 2024*.
8. Schimanski, T. et al. (2025). DIRAS: Efficient LLM Annotation for Document Relevance. *NAACL 2025*.
9. Ni, J., Stammbach, D., Ash, E. & Leippold, M. (2024). AFaCTA: Assisting Annotation of Factual Claims. *ACL 2024*.
10. Warren, G. et al. (2025). Show Me the Work: Fact-Checkers' Requirements for Explainable AFC. *CHI '25*.
11. Du, Y. et al. (2023). Improving Factuality through Multiagent Debate. *arXiv:2305.14325*.
12. Tool-MAD (2026). Multi-Agent Debate for Fact Verification. *arXiv:2601.04742*.
13. DebateCV (2025). Debate-driven Claim Verification. *arXiv:2507.19090*.
14. Conformal Prediction for NLP: A Survey (2024). *TACL*.
15. ConU: Conformal Uncertainty in LLMs (2024). *Findings of EMNLP 2024*.
16. Zeng, X. et al. (2021). Automated Fact-Checking: A Survey. *Language and Linguistics Compass*, 15(10).
17. Barron-Cedeño, A. et al. (2024/2025). CLEF CheckThat! Lab. *CLEF 2024 / ECIR 2025*.
18. Thorne, J. et al. (2018). FEVER: Fact Extraction and VERification. *NAACL 2018*.
19. Schlichtkrull, M. et al. (2024). AVeriTeC Shared Task. *FEVER 2024 Workshop*.
20. Kavtaradze, L. (2024). Challenges of Automating Fact-Checking. *Digital Journalism*.
21. Duke Reporters' Lab (2025). Fact-Checking Census 2025.
22. Poynter Institute (2024). State of the Fact-Checkers Report 2024.
23. European Commission (2024). Digital Services Act.
24. EU AI Act (Regulation EU 2024/1689).
25. EDMO (2025). European Digital Media Observatory.
26. Swiss Federal Council (2024). Report on Disinformation Threats.
27. Whisper Large V3 Turbo (2024). MIT License.
28. pyannote-audio. Speaker Diarization. MIT License.
29. Bloomberg Streaming Whisper (Interspeech 2025).
