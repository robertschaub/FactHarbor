# Innosuisse-Projektentwurf — Echtzeit-Faktenprüfung für Audio- und Video-Inhalte

**Stand:** 18.03.2026  
**Status:** Erste Antragsskizze / Pre-Draft für Innolink  
**Ausgangspunkt:** Meeting mit Tobias Schimanski am 18.03.2026; neue Projektidee nach dem Gespräch

---

## 1. Kurzes Meeting-Protokoll

- Gespräch mit **Tobias Schimanski** geführt; **Elliott Ash war nicht anwesend**.
- Zentrale Rückmeldung: Für eine **postdoc-getriebene Zusammenarbeit** auf Basis der bisherigen FactHarbor-Architektur sieht Tobias **wenig ausreichende wissenschaftliche Neuheit**, da ein Teil der relevanten methodischen Bausteine aus seinem / dem UZH-/ETH-nahen Forschungsumfeld bereits vorliegt.
- Wichtige neue Einsicht aus der Nachreflexion: Es gibt **eine deutlich stärkere Forschungs- und Innovationschance** als das bisher diskutierte Vorhaben:
  - **Echtzeit-Live-Faktenprüfung von Audio- und Video-Inhalten**
- Konsequenz:
  - Kooperation **nicht mehr primär** als Anwendung bereits bestehender Tobias-/UZH-/ETH-Arbeiten auf FactHarbor rahmen.
  - Stattdessen ein neues Projekt aufsetzen, das eine **eigenständige Innovations- und Forschungslücke** adressiert:
    - multimodale Live-Eingänge,
    - niedrige Latenz,
    - belastbare Evidenzverknüpfung,
    - attributierbare und überprüfbare Echtzeit-Ausgaben,
    - Übergang von Streaming-Signalen zu publizierbaren Faktenchecks.

---

## 2. Was Innosuisse dafür sehen will

Auf Basis der aktuellen offiziellen Innosuisse-Unterlagen für **Innovation Projects with implementation partner** sollte der Antrag besonders klar auf folgende Punkte antworten:

### 2.1 Innovativer Kern

Innosuisse verlangt klar:
- **Was ist an der Lösung innovativ?**
- **Wie verbessert das Projekt den Stand der Technik?**
- **Warum ist es mehr als die Implementierung von Best Practices?**

Für dieses Projekt heißt das:
- Nicht nur „wir bauen Factiverse nach“.
- Sondern: Wir entwickeln eine **neue Kombination aus Live-Claim-Detection, Evidenzsuche, attributierbarer Verifikation, Unsicherheitsmanagement und Human-in-the-Loop-Eskalation** für Audio-/Video-Streams in einem produktnahen System.

### 2.2 Mehrwert / Wirkung

Innosuisse will nicht nur Forschung, sondern:
- gelöstes **Kundenproblem / gesellschaftliches Problem**,
- klarer **USP**,
- Vergleich zu bestehenden Lösungen,
- plausibler **Go-to-Market** bzw. bei sozialer Innovation ein tragfähiges **Nachhaltigkeitsmodell**.

Für FactHarbor bedeutet das:
- Problem: Falschinformationen verbreiten sich heute stark über **Live-Debatten, Podcasts, Streams, Video-Plattformen und kurze Clips**.
- Lücke: Bestehende Systeme sind entweder **schnell, aber flach**, oder **tief, aber nicht live-fähig**.
- Mehrwert: FactHarbor könnte ein System schaffen, das **Echtzeitfähigkeit mit evidenzbasierter Nachvollziehbarkeit und tieferer Begründung** verbindet.

### 2.3 Projekt-Setup

Innosuisse erwartet:
- klare Partnerrollen,
- konkrete **Work Packages**,
- messbare **Deliverables**,
- echte **Milestones** über die Projektlaufzeit verteilt.

### 2.4 Zusätzliche ICT-/AI-Anforderungen

Für KI-/Datenprojekte will Innosuisse u.a.:
- klare Beschreibung der **Datenquellen**,
- Eigentums- und Nutzungsrechte,
- Trainings-/Evaluationsdaten,
- Metriken wie **Precision, Recall, F1**, Fehlerraten,
- Begründung des Modellansatzes,
- Umgang mit Randfällen und „black swan events“,
- Frage der **Marktakzeptanz** einer KI-Lösung, die nicht 100% korrekt ist.

Für dieses Projekt ist das zentral, weil Live-Faktenprüfung naturgemäß:
- fehleranfällig,
- latenzsensitiv,
- multimodal,
- rechtlich und redaktionell sensibel ist.

---

## 3. Einschätzung: Warum dieses neue Thema deutlich stärker ist

Die bisherige FactHarbor-Kooperation riskierte, als „Anwendung vorhandener Forschung auf ein bestehendes System“ wahrgenommen zu werden.

Die neue Projektidee ist stärker, weil sie mehrere echte Neuheitsachsen verbindet:

1. **Live statt Batch**
   - Übergang von asynchroner Textanalyse zu kontinuierlichem Audio-/Video-Input.

2. **Multimodal statt text-only**
   - Transkription, Sprecherwechsel, Video-/Kontextsignale, ggf. Bild- und Metadaten.

3. **Provisorische Echtzeit-Ausgabe mit Unsicherheitsmanagement**
   - Nicht nur Endbericht, sondern vorläufige Signale mit sauberer Kalibrierung.

4. **Attributierbare Evidenz im Live-Kontext**
   - Schwieriger als klassische QA, weil Evidenz unter Zeitdruck gesucht, zugeordnet und kommuniziert werden muss.

5. **Human-in-the-loop-Produktionspfad**
   - Nicht bloß „vollautomatisch“, sondern redaktionell brauchbar, auditierbar und eskalierbar.

Das ist näher an einer **echten Innosuisse-Innovation** als eine reine Weiterentwicklung des aktuellen FactHarbor-Textsystems.

---

## 4. Antragsskizze — Rohentwurf

## 4.1 Projekttitel

**Deutsch:**  
**LiveCheck: Evidenzbasierte Echtzeit-Faktenprüfung für Audio- und Video-Inhalte**

**Englische Alternative:**  
**LiveCheck: Evidence-Based Real-Time Fact-Checking for Audio and Video Streams**

---

## 4.2 Kurzbeschreibung

Ziel des Projekts ist die Entwicklung eines produktnahen Systems zur **echtzeitnahen Faktenprüfung von Audio- und Video-Inhalten**. Das System soll laufende Sprach- und Videoinhalte in verifizierbare Aussagen zerlegen, relevante Evidenz in kurzer Zeit recherchieren, die Belastbarkeit der Evidenz bewerten und vorläufige, transparent begründete Verifikationssignale erzeugen. Im Unterschied zu bestehenden Live-Fact-Checking-Ansätzen soll der Fokus nicht nur auf Geschwindigkeit, sondern auf **Evidenzqualität, Quellenattribution, Unsicherheitsmanagement und nachvollziehbarer Ausgabe** liegen.

Das Projekt verbindet anwendungsnahe Systementwicklung mit wissenschaftlichen Fragestellungen in den Bereichen **multimodale Informationsverarbeitung**, **retrieval-basierte Verifikation**, **Attributionsqualität**, **Kalibrierung**, **Latenz-Qualitäts-Trade-offs** und **Human-in-the-loop-Faktenprüfung**.

---

## 4.3 Ausgangslage / Problem

Falschinformationen verbreiten sich zunehmend über **Livestreams, Debatten, Interviews, Podcasts, Kurzvideos und Video-Plattformen**. Herkömmliche Faktenprüfung ist zu langsam, um in solchen Formaten wirkungsvoll einzugreifen. Reine KI-Ansätze für Live-Faktenprüfung zeigen zwar, dass niedrige Latenzen möglich sind, opfern aber oft **Tiefe, Transparenz, Quellenqualität oder Verlässlichkeit**.

Gleichzeitig steigt der Bedarf bei:
- Medienhäusern,
- zivilgesellschaftlichen Organisationen,
- Forschungsinstitutionen,
- öffentlichen Stellen,
- Plattform- und Moderationsumfeldern,
nach Systemen, die **schnelle, nachvollziehbare und verantwortbare** Verifikationssignale liefern.

FactHarbor verfügt bereits über eine funktionierende evidenzbasierte Faktenprüfungsarchitektur für Texte. Diese bildet eine produktnahe Grundlage, reicht aber für Live-Audio-/Video-Szenarien derzeit nicht aus. Es fehlen insbesondere:

- Streaming-Ingestion,
- segmentierte Claim-Erkennung in Echtzeit,
- niedrige End-to-End-Latenz,
- robuste Evidenzverknüpfung unter Zeitdruck,
- multimodale Kontextintegration,
- abgestufte Live-Ausgaben mit sauberem Unsicherheitsmodell.

---

## 4.4 Innovationsgehalt

Der Innovationsgehalt liegt nicht in einer bloßen Übertragung existierender Modelle auf einen neuen Datentyp, sondern in der Entwicklung einer **integrierten Innovationsarchitektur** für Live-Faktenprüfung, die folgende Elemente verbindet:

1. **Streaming Claim Detection**
   - fortlaufende Identifikation verifizierbarer Aussagen in Transkripten / Audio-/Video-Segmenten

2. **Low-Latency Evidence Retrieval**
   - parallele, mehrstufige Recherche unter harten Zeitbudgets

3. **Attributierbare Live-Verifikation**
   - Zuordnung vorläufiger Einschätzungen zu konkreten Quellen und Evidenzfragmenten

4. **Uncertainty-Aware Output**
   - statt scheinbarer binärer Sicherheit: abgestufte Live-Signale mit Vertrauens- und Qualitätsindikatoren

5. **Human-in-the-Loop Escalation**
   - Übergabe an menschliche Reviewer bei hoher Relevanz, hoher Unsicherheit oder hohem Schadenpotenzial

6. **Produktionsnahe Evaluationsschicht**
   - Messung von Latenz, Präzision, Recall, Attributionsqualität, Stabilität und Fehlertypen im realen Einsatz

Die angestrebte Lösung wäre damit **mehr als State-of-the-Art-Replikation**: Sie adressiert die bislang offene Kombination aus **Tempo, Transparenz, Evidenzbezug und redaktioneller Nutzbarkeit**.

---

## 4.5 Nutzenversprechen / Zielgruppen

### Primäre Zielgruppen

- Newsrooms / Fact-Checking-Organisationen
- Public-interest- und Demokratie-Initiativen
- Forschungs- und Monitoring-Teams
- Medienbeobachtung / Debattenbeobachtung
- Institutionen mit Bedarf an schneller Evidenzprüfung

### Gelöstes Problem

Diese Zielgruppen brauchen Systeme, die:
- schnell genug für aktuelle Audio-/Video-Umfelder sind,
- trotzdem nicht auf bloße Black-Box-Klassifikation reduziert werden,
- Quellen sichtbar machen,
- Unsicherheit explizit kommunizieren,
- menschliche Prüfung unterstützen statt ersetzen.

### Geplanter Nutzen

- schnellere Reaktion auf virale oder live verbreitete Fehlbehauptungen,
- bessere Priorisierung für menschliche Faktenprüfer,
- nachvollziehbare Evidenzketten statt reiner Scores,
- ein neues Werkzeug zwischen „voll manuell“ und „vollautomatisch, aber intransparent“.

---

## 4.6 Wettbewerbs- und Differenzierungslogik

### Bestehende Ansätze

- Live-Fact-Checking-Systeme mit Fokus auf **Speed**
- klassische Faktenprüfung mit Fokus auf **manueller Qualität**
- Multimodal-/Deepfake-Anbieter mit Fokus auf **Manipulationserkennung**, nicht auf evidenzbasierte Claim-Verifikation

### Geplante Differenzierung

FactHarbor würde sich differenzieren durch:
- **evidenzbasierte statt rein klassifikatorische Ausgabe**
- **sichtbare Quellenattribution**
- **Unsicherheits- und Qualitätskommunikation**
- **topic-agnostische Architektur**
- **Hybridmodell aus Automatisierung und menschlicher Review**

**Noch zu belegen vor Einreichung:**
- Marktgrößen / adressierbarer Markt
- konkrete Letters of Intent
- Pilotpartner / frühe Validierungsinteressenten

---

## 4.7 Projektpartner (Entwurf)

### Umsetzungspartner

**FactHarbor Verein**  
in Gründung / Vorbereitung  
Rolle:
- Produktvision
- Systemarchitektur
- Integration in bestehende FactHarbor-Plattform
- Pilotierung
- spätere Umsetzung / Betriebspfad

### Forschungspartner

**Schweizer Forschungspartner (noch offen)**  
idealerweise UZH-, ETH- oder vergleichbares Umfeld  
Rolle:
- Methodenentwicklung
- Evaluationsdesign
- Benchmarking
- Publikations- und Forschungslogik
- ggf. multimodale / audio-video-spezifische Modellierung

**Wichtig:** Der Antrag sollte bewusst **nicht** von einer einzelnen Person abhängen. Die Partnerkonstellation muss offen gehalten werden.

---

## 4.8 Arbeitspakete (Entwurf)

### AP1 — Problemdefinition, Use Cases, Daten- und Evaluationsbasis

**Ziel:** Präzise Definition der Live-Anwendungsszenarien und Aufbau der Evaluationsbasis.

**Inhalte:**
- Auswahl prioritärer Use Cases:
  - Live-Debatten
  - Podcasts / Interviews
  - Video-Clips / Statements
- Definition von Latenz- und Qualitätszielen
- Aufbau eines Evaluationsdatensatzes / Annotationsrahmens
- Klärung Datenquellen, Rechte, Datenschutz, Logging

**Deliverables:**
- Use-Case-Spezifikation
- Evaluationsprotokoll
- Daten- und Rechtekonzept

### AP2 — Streaming Ingestion und Claim-Erkennung

**Ziel:** Verarbeitung laufender Audio-/Video-Inhalte zu verifizierbaren Claim-Kandidaten.

**Inhalte:**
- Transkription
- Segmentierung / Sprecherwechsel
- Claim Detection in rollierenden Fenstern
- Priorisierung relevanter Aussagen

**Deliverables:**
- Streaming-Ingestion-Prototyp
- Claim-Candidate Engine
- Baseline-Metriken für Claim Detection

### AP3 — Evidenzsuche und attributierbare Verifikation unter Zeitbudget

**Ziel:** Niedrig-latente Evidenzsuche und vorläufige, nachvollziehbare Verifikationssignale.

**Inhalte:**
- Zeitbudgetierte Suche
- Ranking / Relevanzbewertung
- Quellengewichtung
- Zuordnung von Evidenz zu Claim-Kandidaten
- vorläufige Live-Signale mit Unsicherheitsmodell

**Deliverables:**
- Retrieval- und Ranking-Schicht
- Attributions- und Verifikationslogik
- Live-Signal-Output

### AP4 — Human-in-the-loop, Produktintegration und UI

**Ziel:** Ein redaktionell brauchbarer Arbeitsmodus statt einer unkontrollierten Vollautomatisierung.

**Inhalte:**
- Reviewer Queue
- Eskalationsregeln
- UI für Evidenz, Quellen, Unsicherheit und Entscheidungsnachvollzug
- Übergang von Live-Signal zu tieferem Faktencheck

**Deliverables:**
- Reviewer Interface
- Eskalationslogik
- Pilotfähige Produktintegration

### AP5 — Evaluation, Pilotierung und Verwertungsmodell

**Ziel:** Nachweis, dass das System nicht nur technisch funktioniert, sondern praktisch wertvoll ist.

**Inhalte:**
- Pilotierung mit Partnern / Testumfeldern
- Messung von Latenz, Präzision, Recall, Attributionsqualität, Stabilität
- Nutzerfeedback / Akzeptanz
- Verwertungs- und Nachhaltigkeitsmodell

**Deliverables:**
- Evaluationsbericht
- Pilotreport
- Verwertungs- und Nachhaltigkeitskonzept

---

## 4.9 Meilensteine (Entwurf)

| Meilenstein | Zeitpunkt | Erfolgskriterium |
|-------------|-----------|------------------|
| M1: Projektbasis steht | Monat 4 | Use Cases, Daten-/Rechtekonzept, Evaluationsrahmen verabschiedet |
| M2: Live-Claim-Erkennung demonstriert | Monat 8 | Streaming-Ingestion + Claim Detection im Prototyp |
| M3: Evidenzsuche unter Zeitbudget | Monat 14 | Relevante Evidenz wird mit definierter Ziel-Latenz gefunden |
| M4: Attributierbare Live-Signale | Monat 18 | Vorläufige Verifikationssignale mit Quellenbezug und Unsicherheitsanzeige |
| M5: Human-in-the-loop-Pilot | Monat 22 | Reviewer-Workflow integriert und testbar |
| M6: Abschluss / Transferentscheid | Monat 24 | Evaluationsbericht + Pilotresultate + Entscheid über nächste Produkt-/Finanzierungsphase |

---

## 4.10 Evaluation und KPIs

### Technische KPIs

- End-to-End-Latenz pro Claim-Kandidat
- Precision / Recall / F1 der Claim Detection
- Retrieval-Relevanz
- Attributionsgenauigkeit
- False-positive- / False-negative-Raten
- Stabilität / Wiederholbarkeit

### Produkt-/Nutzungs-KPIs

- Anteil sinnvoll eskalierter Fälle
- Reviewer-Zeitersparnis
- Nutzbarkeit / Vertrauenswürdigkeit
- Anteil der Live-Signale, die in belastbare Faktenchecks überführt werden können

### Forschungs-KPIs

- Benchmarkbeiträge
- Publikationen / Workshops
- neue Evaluationsprotokolle
- nachweisbarer Stand-der-Technik-Fortschritt

---

## 4.11 AI-/Daten-Teil (explizit für Innosuisse wichtig)

### Datenquellen

- Live- oder quasi-live Audio-/Video-Streams
- Transkripte
- Webquellen / Evidenzquellen
- ggf. strukturierte Archivquellen

### Zu klärende Punkte

- Rechte an Audio-/Video-Daten
- Speicherung / Retention
- Datenschutz
- Trainings- und Evaluationsdaten
- Annotation
- Umgang mit bias / domain drift / edge cases

### Modell- und Systemfragen

- Welche Komponenten sind LLM-basiert, welche deterministisch?
- Welche Teile müssen echtzeitkritisch und leichtgewichtig sein?
- Welche Teile können verzögert, tiefer oder human-reviewed erfolgen?
- Wie wird Unsicherheit kommuniziert?
- Wie wird verhindert, dass ein schneller, aber falsch-sicherer Output entsteht?

---

## 4.12 IPR / Verwertung / Nachhaltigkeit

### IPR

Vor Einreichung zu klären:
- Open-Source vs. schützbare Komponenten
- Nutzungsrechte zwischen Umsetzungspartner und Forschungspartner
- Marken-/Produktrechte
- Freedom-to-operate / Wettbewerbsumfeld

### Verwertung

Plausible Verwertungspfade:
- B2B / institutionelle Nutzung
- API / newsroom tooling
- professionelle Monitoring- oder Review-Workflows
- öffentlicher Non-Profit-Dienst mit institutionell gestütztem Betrieb

### Nachhaltigkeit

Für Innosuisse wichtig: Das Projekt darf nicht nur von Spenden abhängen.  
Darum sollte das Nachhaltigkeitsmodell auf einem Mix beruhen aus:
- institutionellen Partnerschaften,
- professionellen Service-/API-Modellen,
- ggf. Stiftungsunterstützung für Public-Interest-Rollout,
- aber **nicht ausschließlich** auf unsicheren Spendenannahmen.

---

## 5. Noch offene Punkte vor einer echten Einreichung

Diese Punkte sollten vor einer echten Antragseinreichung ergänzt oder validiert werden:

1. **Forschungspartner konkretisieren**
   - UZH / ETH / andere Schweizer Forschungsinstitution?

2. **Markt- und Bedarfsvalidierung**
   - konkrete Zielsegmente
   - reale Nachfrage
   - LOIs / Pilotinteresse

3. **Wettbewerbsanalyse sauber quantifizieren**
   - Factiverse
   - Full Fact AI / Monitoring
   - multimodale Verifikationsanbieter
   - newsroom tooling

4. **Projektumfang schärfen**
   - nur Audio?
   - Audio + Video?
   - Live only oder auch Uploads?

5. **Daten- und Rechtekonzept**
   - Transkriptionsdaten
   - Videoquellen
   - Evaluationsset

6. **Budgetmodell**
   - Projektlaufzeit
   - Personalrollen
   - In-kind Beitrag
   - Cash-Beitrag

7. **Pilotpartner**
   - idealerweise mindestens 1-2 konkrete Gesprächspartner für Anwendungskontext

---

## 6. Empfehlung für das weitere Vorgehen

### Sofort

1. Diese Projektidee als **neue Hauptstory** setzen.
2. Den bisherigen Tobias-zentrierten Kooperationsframe ablösen.
3. UZH / ETH als **offenes Forschungsumfeld**, nicht als bereits feststehenden Person-Deal formulieren.

### In den nächsten 1-2 Wochen

1. Eine **2-seitige Projektskizze** aus diesem Entwurf ableiten.
2. Forschungspartner-Optionen offen sondieren.
3. Live Audio/Video Fact-Checking als **eigene Neuheits-These** schärfen.
4. 2-3 Pilot-Use-Cases definieren.

### Vor Innolink

1. Markt- und Wettbewerbsbelege ergänzen
2. Partnerrolle fixieren
3. Budgetgerüst bauen
4. LOIs / Interessenbekundungen sammeln
5. IPR- und Nachhaltigkeitslogik klarziehen

---

## 7. Arbeitsfassung für einen sehr kurzen Antragsteaser

> **LiveCheck** entwickelt ein evidenzbasiertes System zur echtzeitnahen Faktenprüfung von Audio- und Video-Inhalten. Ziel ist es, laufende Aussagen aus Livestreams, Debatten, Podcasts und Videos automatisch in verifizierbare Claims zu überführen, unter harten Zeitbudgets belastbare Evidenz zu recherchieren und transparente, attribuierbare Verifikationssignale mit explizitem Unsicherheitsmanagement bereitzustellen. Im Unterschied zu bestehenden Ansätzen verbindet das Projekt geringe Latenz mit nachvollziehbarer Evidenz, Quellenattribution und Human-in-the-loop-Eskalation. Damit adressiert es eine hochrelevante gesellschaftliche und marktnahe Lücke zwischen schneller, aber flacher Live-Erkennung und langsamer, manueller Qualitätsprüfung.

---

## 8. Quellenbasis

### Offizielle Innosuisse-Quellen

- Innovation projects with implementation partner: https://www.innosuisse.admin.ch/en/innovation-project-with-implementation-partner
- Innovation projects – Application checklist (07.07.2025): https://www.innosuisse.admin.ch/dam/en/sd-web/l6ulpxzSOif4/Checklist%20%28Innovation%20projects%29.pdf
- Innovation mentoring: https://www.innosuisse.admin.ch/en/innovation-mentoring
- Innovation cheque: https://www.innosuisse.admin.ch/en/innovation-cheque
- Innolink / submission: https://www.innosuisse.admin.ch/en/submission-of-applications

### FactHarbor-interne Quellen

- `Docs/Knowledge/Meeting_Prep_Schimanski_2026-03-18.md`
- `Docs/Knowledge/Innosuisse_Bewerbung_Leitfaden.md`
- `Docs/Knowledge/Global_FactChecking_Landscape_2026.md`
- `Docs/Knowledge/Factiverse_Lessons_for_FactHarbor.md`
- `Docs/Knowledge/FullFact_AI_Lessons_for_FactHarbor.md`
- `Docs/STATUS/Current_Status.md`

---

## 9. Wichtige Einordnung

Dieser Text ist **kein einreichungsfertiger Innosuisse-Antrag**, sondern eine **gut ausgerichtete Antragsskizze**, die:
- den **neuen Projektschwerpunkt** festlegt,
- die **Innosuisse-Logik** berücksichtigt,
- und den nächsten Schritt zu einer echten Einreichung vorbereitet.
