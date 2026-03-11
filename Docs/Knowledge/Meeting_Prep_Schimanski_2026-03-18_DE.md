# Meeting-Vorbereitung: Tobias Schimanski — UZH, 18. März 2026, 16:00

**Für:** Erstes Treffen mit Tobias Schimanski (UZH, Doktorand bei Leippold)
**Ort:** UZH Plattenstrasse 14 (von Tobias zu bestätigen)
**Dauer:** ~1 Stunde
**Ziel:** Zusammenarbeit erkunden, Forschungspassung bewerten, Innosuisse/BRIDGE-Finanzierung besprechen
**Erstellt von:** Claude Opus 4.6 (2026-03-10)

> **Verwandte Dokumente:** [Faithful LLM Specialists (ACL 2024)](Schimanski_Faithful_LLM_Specialists_ACL2024.md) | [DIRAS (NAACL 2025)](Schimanski_DIRAS_NAACL2025.md) | [Climinator-Analyse](Climinator_Lessons_for_FactHarbor.md) | [Executive Summary](EXECUTIVE_SUMMARY.md)

---

## 1. Wer ist Tobias Schimanski

- **Position:** Doktorand, Universität Zürich, Abteilung Finance (Betreuer: Markus Leippold). Affiliierter Forscher an der University of Oxford.
- **Forschungsschwerpunkt:** ClimateNLP — Einsatz von NLP für Klima-Faktenprüfung, ESG-Messung und Information Retrieval im Bereich Sustainable Finance.
- **Verbindet zwei Gruppen:**
  - **Leippold-Gruppe (UZH):** Climinator, ClimateBERT, ChatReport, ClimRetrieve, Analyse von Unternehmensberichten
  - **Ash-Gruppe (ETH):** Faithful LLM Specialists, politischer Bias, Legal NLP
- **Publikationen:** Erstautor bei ACL 2024, EMNLP 2024, NAACL 2025. Co-Autor bei npj Climate Action (Climinator). Starke Venues.
- **Grant-Erfahrung:** Er erwähnte Innosuisse-Erfahrung unaufgefordert — signalisiert echtes Interesse und praktisches Wissen über den Prozess.
- **Status-Signal:** Elliott stellte ihn als jemanden vor, der "interessiert wäre zu sprechen, wenn es Finanzierung für eine Vollzeit-Postdoc-Stelle gibt." Das bedeutet: (a) Tobias schliesst seine Promotion ab oder hat sie abgeschlossen, (b) das Postdoc-Gehalt ist eine harte Voraussetzung, (c) Elliott befürwortet die Passung, ist aber selbst nicht stark involviert.

---

## 2. Seine wichtigsten Paper — was du wissen solltest

### Paper 1: Faithful LLM Specialists (ACL 2024) — mit Ash
**Das Quellenattributions-Paper.** [Vollständige Analyse](Schimanski_Faithful_LLM_Specialists_ACL2024.md)

- **Problem:** LLMs zitieren falsche Quellen oder stellen falsch dar, was Quellen sagen
- **Lösung:** Kleine Spezialisten auf qualitätsgefilterten synthetischen Daten fine-tunen
- **Kernfund:** 669 qualitätsgefilterte Samples schlagen Tausende ungefilterte
- **Metriken:** Quellenqualität (binär: sind Zitate korrekt?) + Antwort-Attributierbarkeit (Anteil der abgeleiteten Sätze)
- **Dein Takeaway:** Dies formalisiert das Zitat-Treue-Problem, das FactHarbor zur Laufzeit über Grounding Checks löst. Seine Metriken könnten unsere Pipeline rigoros evaluieren.

### Paper 2: DIRAS (NAACL 2025) — mit Ash + Leippold
**Das Relevanz-Scoring-Paper.** [Vollständige Analyse](Schimanski_DIRAS_NAACL2025.md)

- **Problem:** Wie weiss man, ob RAG die richtigen Dokumente abruft? Manuelle Annotation ist teuer und verzerrt.
- **Lösung:** Explizite Relevanzdefinitionen pro Anfrage generieren, GPT-4 als Lehrer nutzen, in 8B-Modell destillieren
- **Kernfunde:** 8B-Modell erreicht GPT-4-Niveau bei Relevanz-Scoring. Chain-of-Thought schadet der Annotation. Adaptive Schwellenwerte > fester Top-k.
- **Dein Takeaway:** Direkt anwendbar auf Evidenz-Qualitätsbewertung. Könnte probativeValue-Scoring ersetzen oder verbessern.

### Paper 3: Climinator (npj Climate Action 2025) — Leippold-Gruppe
**Das Klima-Faktenprüfungs-Paper.** [Vollständige Analyse](Climinator_Lessons_for_FactHarbor.md)

- Mediator-Advocate-Debattenrahmen mit RAG auf unterschiedlichen Korpora
- Tobias ist Co-Autor, aber KEIN Hauptbeitragender
- Paper-vs-Code-Kluft ist signifikant (debate.py leer), aber sie arbeiten aktiv daran (Spectrum-Experiment PR #108, März 2026)
- **Dein Takeaway:** Nicht mit diesem Paper anfangen — es ist eher Leippolds Projekt. Aber die architektonischen Parallelen bestätigen die Zusammenarbeit.

---

## 2.5 Code Repositories — was wir gefunden haben

Alle Paper von Tobias haben öffentlichen Code — entgegen der ursprünglichen Annahme. Der primäre Code-Autor ist **Edison Ni** (EdisonNi-hku auf GitHub), nicht Tobias selbst.

| Paper | Repository | Autor | Stars |
|-------|-----------|-------|-------|
| DIRAS (NAACL 2025) | github.com/EdisonNi-hku/DIRAS | Edison Ni | 6 |
| Faithful LLM Specialists (ACL 2024) | github.com/EdisonNi-hku/Robust_Evidence_Based_QA | Edison Ni | 8 |
| ClimRetrieve (EMNLP 2024) | github.com/tobischimanski/ClimRetrieve | Tobias | 6 |
| Climinator (npj 2025) | github.com/climateandtech/factchecker | Org | 12 |
| ChatReport | github.com/EdisonNi-hku/chatreport | Edison Ni | 23 |
| AFaCTA (ACL 2024) | github.com/EdisonNi-hku/AFaCTA | Edison Ni | 9 |
| pdfQA (Jan 2026) | github.com/tobischimanski/pdfQA | Tobias | 13 |

**GitHub-Präsenz:**
- Tobias' persönliches GitHub (tobischimanski): 4 öffentliche Repos.
- Edison Ni (EdisonNi-hku): 18+ öffentliche Repos — der primäre Implementierer.
- Professoren (Leippold, Ash): Keine Forschungs-Repos auf ihren persönlichen Accounts.

**Implikationen für das Treffen:**
- **Frage stellen:** "Wer würde bei euch die technische Implementierung übernehmen? Wäre Edison Ni involviert?"
- Das DIRAS-Repo enthält eine vollständige Training-Pipeline — wir können sie evaluieren, bevor wir etwas bauen.
- Die Code-Qualität und Vollständigkeit von DIRAS und Faithful Specialists ist deutlich besser als bei Climinator — das sind Tobias/Edisons Projekte, nicht Leippolds.

---

## 3. Agenda — 5 Themen (3-4 für eine Stunde auswählen)

### Thema 1: Live-Demo + Architektur-Durchgang (10-15 Min. — obligatorisch)

FactHarbor in Aktion zeigen. Einen Claim auf app.factharbor.ch einreichen, den Report durchgehen.

Dann die Pipeline auf hoher Ebene erklären:
```
Nutzereingabe → AtomicClaim-Extraktion → Iterative Websuche (bis zu 10 Runden)
→ Evidenz-Filterung (probativeValue) → 5-Schritt-LLM-Debatte
  (Advocate ×3 → Challenger → Reconciler → Validierung)
→ Quellenbasierter Verdict-Report
```

**Warum das wichtig ist:** Akademiker reagieren auf funktionierende Systeme. Der Climinator-Code hat eine leere `debate.py` — eine voll funktionsfähige Debatten-Pipeline zu sehen, schafft sofortige Glaubwürdigkeit. Das ist kein Paper-Vorschlag; das ist ein laufendes System.

**Was hervorheben:**
- Domain-agnostisch: funktioniert für jedes Thema, jede Sprache
- Evidence-first: jedes Verdict verweist auf spezifische Quellen
- Multi-Provider: Anthropic, OpenAI, Google, Mistral
- ~40-50 LLM-Aufrufe pro Analyse, ~1'079 Tests bestanden

**Was NOCH NICHT hervorheben:** Kalibrierungs-Baseline-Zahlen, C13-Evidenz-Asymmetrie, interne Bias-Metriken. Zu viel Detail für ein erstes Treffen.

### Thema 2: Quellenattribution & Faithfulness (15 Min.)

Die stärkste Forschungsüberschneidung — verbindet sich mit seinem ACL 2024 Paper.

**Fragen stellen:**
1. "Wie würdest du Attributierbarkeit in unserer Pipeline messen — wo Verdicts live Web-Evidenz zitieren statt kuratierter Absätze?"
2. "Unser Grounding Check nutzt 2× Haiku-Validierung. Wäre NLI-basiertes Entailment (wie in deinem Paper) rigoroser, oder reicht LLM-basiertes Checking?"
3. "Dein Fund, dass Datenqualität Quantität schlägt, passt direkt auf unsere Evidenz-Filterung. Würdest du Evidenz-Qualitätsfilterung als publizierbaren Beitrag einordnen, wenn sie mit deinen Metriken formalisiert wird?"

**Was du teilen kannst:** FactHarbor hat einen Grounding Check (Post-Verdict-Validierung) und Evidenz-Filterung (probativeValue-Schwellenwert). Beides ist LLM-basiert, nicht formal gegen Attributions-Benchmarks gemessen. Seine Metriken könnten formalisieren, was wir informell tun.

### Thema 3: Evidenzqualität & Relevanz-Scoring (10 Min.)

Verbindet sich mit seinem DIRAS-Paper.

**Fragen stellen:**
1. "Wir vergeben probativeValue (high/medium/low) via LLM-Prompt. DIRAS zeigt, dass explizite Relevanzdefinitionen pro Anfrage das Scoring signifikant verbessern. Könnte ein ähnlicher Ansatz unsere Evidenz-Pipeline verbessern?"
2. "Dein CoT-Fund — dass es der Annotation schadet — hast du getestet, ob sich das breiter auf Evidenz-Qualitätsbewertung erstreckt?"
3. "Adaptive Schwellenwerte pro Anfrage vs. fester Cutoff — was ist deine praktische Empfehlung?"

**Was du teilen kannst:** FactHarbor nutzt eine 3-stufige kategorische Skala (high/medium/low). DIRAS legt nahe, dass kontinuierliche kalibrierte Scores sowohl erreichbar als auch nützlicher sind. Ein Wechsel könnte die Evidenz-Gewichtung in der Verdict-Aggregation verbessern.

### Thema 4: Forschungsrahmung & publizierbare Beiträge (10 Min.)

Erkunden, was ein gemeinsames Projekt produzieren würde. Kandidaten-Rahmungen:

| Rahmung | Neuheit | Sein Fit |
|---------|---------|----------|
| **"Faithfulness in open-domain automated fact-checking"** | Niemand hat Attributierbarkeit in einem debattenbasierten Fact-Checker gegen live Web-Evidenz gemessen | ACL 2024 Expertise |
| **"Calibration framework for automated verdict systems"** | FactHarbors C10/C13/C18-Framework, formalisiert mit Evaluationsmethodologie. Kein publiziertes Äquivalent. | Benchmarking-Expertise (ClimRetrieve, DIRAS) |
| **"Evidence retrieval quality in adversarial debate architectures"** | Kombination von DIRAS-Relevanz-Scoring mit Multi-Agent-Debatte | DIRAS + Climinator Expertise |

**Schlüsselfrage:** "Welches davon würdest du als Postdoc-Projekt am interessantesten finden?"

Genau auf seine Antwort hören — sie verrät, ob er AN FactHarbors Pipeline arbeiten will oder sie als Testbed für seine eigene Forschungsagenda nutzen möchte. Beides funktioniert, aber die Grant-Rahmung unterscheidet sich.

### Thema 5: Finanzierungsstruktur (10 Min.)

**Bestätigen:**
- Innosuisse Innovation Project als primäres Instrument
- Er forscht (Metriken, Evaluation, Benchmarking) an der UZH → finanziert durch Grant
- FactHarbor stellt Plattform + Integration bereit → Eigenleistung (deine Arbeitszeit)
- Postdoc-Stelle finanziert über den Grant (nicht durch FactHarbor)

**Fragen:**
1. "Aufgrund deiner Innosuisse-Erfahrung, was ist der typische Zeitrahmen von Erstgespräch bis Einreichung?"
2. "Würdest du das als Innovation Project oder BRIDGE Discovery rahmen? Was bevorzugst du?"
3. "Wer wäre PI — du mit Leippold als Garant, oder Leippold direkt?"
4. "Ist Elliott am Projekt beteiligt, oder ist es primär du + Leippold?"

**Was du weisst:**
- Innosuisse Innovation Project: CHF 300K-800K Forschungsseite, 18-36 Monate. FactHarbor steuert 50% Eigenleistung bei (deine Stunden).
- BRIDGE Discovery: bis CHF 130K/Jahr, max 4 Jahre. Forschungsorientierter, Tobias als individueller Antragsteller.
- Vollkosten Postdoc: ~CHF 120K-140K/Jahr (Gehalt + Overhead).

---

## 4. Was NICHT ansprechen

| Thema | Warum nicht |
|-------|------------|
| Politischer Bias / Kalibrierungs-Baseline (C10-Zahlen, 27.6pp Skew) | Zu intern, zu früh. Aufheben bis Vertrauen aufgebaut ist. |
| Climinator Paper-vs-Code-Kluft | Nicht das Projekt seines Betreuers beim ersten Treffen kritisieren. Wenn er es anspricht, neutral bestätigen. |
| Preisgestaltung / Kommerzialisierung / Geschäftsmodell | Forschungsfokus beibehalten. |
| Technische Implementierungsdetails (UCM, Config-Schemas, verdict-stage-Interna) | Zu tief für ein erstes Treffen. |
| Andere Kooperationsziele (Full Fact, Stammbach, ED2D) | Irrelevant und könnte den Fokus verwässern. |

---

## 5. Was mitbringen

- [ ] **Laptop mit Live-Demo** — app.factharbor.ch oder lokale Dev-Umgebung laufend
- [ ] **Einladungscode** für Tobias zum Selbstausprobieren (ETH-1 oder neuen erstellen)
- [ ] **Dieses Dokument** (ausgedruckt oder auf dem Handy) als Referenz während des Treffens
- [ ] **Visitenkarten** falls vorhanden
- [ ] **One-Pager** (optional) — High-Level-Architektur + Forschungsüberschneidung, etwas das er an Leippold weiterleiten kann

---

## 6. Signale beobachten

| Signal | Was es dir sagt |
|--------|----------------|
| Er will die Forschungsfragen selbst definieren | Er sieht FactHarbor als Testbed — den Grant so rahmen, dass seine Forschungsagenda führt |
| Er fragt nach Pipeline-Implementierungsdetails | Er will am System arbeiten — den Grant um Plattformverbesserung rahmen |
| Er erwähnt andere Unternehmen oder Projekte, mit denen er spricht | Du bist nicht die einzige Option — schneller beim Grant-Antrag |
| Er erwähnt Leippolds Beteiligung aktiv | Leippold könnte Co-PI sein — grösserer Grant, mehr institutionelles Gewicht |
| Er fragt nach Open-Sourcing oder Datenaustausch | Akademische Norm — bereit sein zu besprechen, was teilbar ist |
| Er ist vorsichtig beim Zeitrahmen | Promotion ist evtl. noch nicht abgeschlossen — prüfen, wann er ein Postdoc starten kann |
| Er lenkt Richtung klimaspezifische Arbeit | Er möchte evtl. in seiner Komfortzone bleiben — vorsichtig prüfen, ob domain-agnostische Forschung ihn interessiert |

---

## 7. Nach dem Treffen

- [ ] Dankes-Email innerhalb von 24 Stunden senden
- [ ] Besprochene Materialien teilen (Demo-Link, Architektur-Übersicht)
- [ ] Falls positiv: konkreten nächsten Schritt vorschlagen (Forschungsskizze entwerfen, zweites Treffen mit Leippold, vorläufige Grant-Struktur)
- [ ] `Docs/knowledge/EXECUTIVE_SUMMARY.md` Kooperationsstatus aktualisieren
- [ ] Falls Forschungsrichtung vereinbart: Grant-Outline-Dokument in `Docs/WIP/` starten
