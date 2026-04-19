# Meeting-Vorbereitung — ZHAW CAI / NLP-Gruppe

**Datum:** Dienstag, 21. April 2026, 10:15-11:00 Uhr  
**Ort:** ZHAW Winterthur (vor Ort)  
**Teilnehmende:**
- Patrick Giedemann (Doktorand, CAI / NLP) — Hauptkontakt
- Mark Cieliebak (Professor, Leiter NLP-Gruppe) — im CC, eventuell dabei
- Jan Milan Deriu (Senior Researcher, CAI / NLP) — im CC, eventuell dabei
- Robert Schaub (FactHarbor Gründer)

**Primäres Ziel:** Prüfen, ob aus der fachlichen Überschneidung zwischen FactHarbor und der ZHAW-NLP-Gruppe ein gemeinsames Innosuisse-Projekt entstehen kann.  
**Minimalziel:** Ein gemeinsames Verständnis gewinnen, welche Forschungsfrage fachlich am besten passt und wie ein realistischer nächster Schritt aussieht.  
**Signal aus dem Vorlauf:** Giedemann hat am 15. April 2026 bestätigt: *"Sehe dort durchaus Potential für ein cooles Innosuisse Projekt."*

---

## 1. Personen

### Patrick Giedemann
- **Rolle:** Doktorand, Centre for Artificial Intelligence (CAI), ZHAW
- **Forschung:** Desinformationserkennung in Videoinhalten, multilinguale Claim Detection
- **Wichtigste Arbeiten:**
  - **ViClaim** (EMNLP 2025 main): Erstautor. Multilingualer Multilabel-Datensatz für Claim Detection in Videos (1'798 Videos, 17K Sätze, EN/DE/ES). Fine-tuned XLM-R erreicht F1=0.90 auf Fact-Check-Worthiness vs. o3-mini F1=0.78.
  - **HAMiSoN** (EU CHIST-ERA, EUR 1.1M, 2023-2025): Teammitglied. Holistic Analysis of Organised Misinformation Activity in Social Networks.
  - ZHAW Digital Futures Fund Grant (2024): KI-Plattform zur Transkription von Videos, Annotation von Claims und Zuordnung zu Sprechern.
  - Vertretung ZHAW CAI am **World Economic Forum 2026**.
- **Relevanz für FactHarbor:** Seine Claim-Worthiness-Arbeit passt direkt auf FactHarbors frühe Pipeline-Stufe: Welche Aussagen sollen überhaupt vertieft geprüft werden? Seine Videoarbeit ist komplementär zu FactHarbors Textfokus.
- **Worauf achten:** Er ist vermutlich der natürlichste Einstiegspunkt für ein erstes gemeinsames, publizierbares Teilprojekt.

### Prof. Dr. Mark Cieliebak
- **Rolle:** Professor für NLP, Leiter NLP-Forschungsgruppe, CAI. Zudem CEO SpinningBytes AG und Präsident SwissNLP.
- **Forschung:** Textanalyse, Schweizerdeutsch-Verarbeitung, Desinformationserkennung, LLM-Evaluation
- **Wichtigste Arbeiten:**
  - HAMiSoN Co-PI
  - CheckThat! Lab 2023: ZHAW-CAI erreichte Platz 2 in Check-Worthiness Detection
  - Gründer SwissText-Konferenz (200+ Teilnehmende jährlich)
  - Mitgründer SpinningBytes AG (ETH/ZHAW-Spin-off für Textanalyse)
  - 40+ Publikationen, mehrere Innosuisse-Projekte (ChaLL, SCAI mit Legartis)
- **Relevanz für FactHarbor:** Entscheidungsträger. Kennt Innosuisse-Prozesse aus eigener Erfahrung. Bringt zugleich Forschungsperspektive, Schweizer NLP-Netzwerk und Industriebrücke mit.
- **Worauf achten:** An ihn eher die strategischen Fragen richten: Wo passt FactHarbor in die Gruppenstrategie, was ist für Innosuisse plausibel, wen sollte man noch einbeziehen?

### Dr. Jan Milan Deriu
- **Rolle:** Senior Researcher und Dozent, CAI. PhD Universität Zürich.
- **Forschung:** Evaluationsmethoden für Dialogsysteme, Desinformationserkennung, Schweizerdeutsch-Sprachverarbeitung, NL-to-SQL
- **Wichtigste Arbeiten:**
  - HAMiSoN Co-PI
  - ViClaim Co-Autor
  - "Survey on Evaluation Methods for Dialogue Systems" (AI Review, 2020) — vielzitiert
  - Favi-Score (ACL 2024): Evaluationsmetrik für KI-Bias
  - 38 Publikationen, 831+ Zitierungen
- **Relevanz für FactHarbor:** Besonders interessant für den methodischen Teil: Wie bewertet man Verdikt-Qualität, Stabilität, Reproduzierbarkeit und Benchmark-Tauglichkeit sauber?

---

## 2. Was sie vermutlich bereits wissen

Meine E-Mail an Cieliebak vom 25. März 2026 erwähnte:
- FactHarbors Multi-Agent-Debate-Pipeline mit 5 Stufen
- offene Probleme: Verdikt-Stabilität, Small-Model-Distillation, multilinguale Robustheit
- HAMiSoN, ViClaim und CheckThat! als offensichtliche Überschneidungen
- den Innosuisse Innovation Cheque als möglichen ersten Schritt
- den Einladungscode `ZHAW-1` für `app.factharbor.ch`
- dass ich Solo-Gründer mit Software-Entwickler-Hintergrund bin

**Arbeitsannahme für das Meeting:** Sie kennen den groben Rahmen, aber nicht zwingend das Produkt im Detail. Also nicht voraussetzen, dass sie das Tool intensiv getestet haben. Die Demo muss auch dann funktionieren, wenn sie es nur oberflächlich oder gar nicht angeschaut haben.

---

## 3. Zielbild für das Gespräch

Das Meeting ist kein Produkt-Pitch, sondern ein Explorationsgespräch mit Forschungspartnern.

**Haltung:**
- Mehr zuhören als senden
- Nicht beweisen wollen, dass FactHarbor "fertig" ist
- Ehrlich zeigen, was bereits funktioniert und wo die offenen Forschungshebel liegen
- Nicht auf eine Lösung drängen, sondern gemeinsam die fachlich plausibelste Richtung identifizieren

**Wenn das Gespräch gut läuft, sollte am Ende idealerweise klar sein:**
- welche Forschungsfrage für die ZHAW am attraktivsten ist
- ob ein Innovation Cheque als erster Schritt sinnvoll wirkt
- wer auf ZHAW-Seite in den nächsten Schritt eingebunden werden sollte

---

## 4. Gesprächsablauf (60-75 Min.)

### 4.1 Einstieg (5 Min.)

Ziel: ruhig, präzise, partnerschaftlich eröffnen.

- Danke für das Treffen und die schnelle Rückmeldung
- Kurz zu mir: Software-Entwickler, baue FactHarbor seit November 2025, bisher alleine
- Klarer Rahmensatz:
  - "Was ich aus diesem Gespräch vor allem mitnehmen möchte, ist: Wo trifft eure Forschung auf die offenen Probleme von FactHarbor, und ob daraus ein gemeinsames Projekt entstehen kann."

Nicht zu lang in die Selbstvorstellung gehen. Nach 60-90 Sekunden wieder bei ihnen sein.

### 4.2 Zuerst ihre Perspektive verstehen (15-20 Min.)

Das ist der wichtigste Block. Wenn dieser Teil stark ist, wird der Rest automatisch besser.

**Leitfragen:**
- "Was ist bei euch aktuell der wichtigste Strang im Bereich Desinformation, Claim Detection oder Evaluation?"
- "Welche Teile von FactHarbor habt ihr euch angeschaut, und was ist euch dabei aufgefallen?"
- "Wo seht ihr die stärkste Überschneidung mit eurer aktuellen Arbeit?"
- "Wenn ihr an ein gemeinsames Projekt denkt: Welche Frage wäre aus eurer Sicht wirklich interessant?"
- "Habt ihr bereits eine bestimmte Form eines Innosuisse-Projekts vor Augen?"

**Worauf im Verlauf achten:**
- Wenn Giedemann früh auf ViClaim oder Claim-Worthiness einsteigt, Demo und Gespräch auf frühe Pipeline-Stufen fokussieren.
- Wenn Cieliebak eher auf Evaluation, Robustheit oder Positionierung fragt, stärker auf Verdikt-Stabilität und methodische Messbarkeit gehen.
- Wenn Deriu methodisch einsteigt, sofort auf Reproduzierbarkeit, Evaluationsdesign und Benchmarking umschalten.

### 4.3 Demo nur als Mittel zum Gespräch, nicht als Selbstzweck (10 Min.)

Die Demo soll nicht beeindrucken um der Demo willen, sondern eine gemeinsame Forschungsfrage greifbar machen.

**Vorbereitung am Vorabend:**
- Einen Schweizer Claim auf Deutsch vorbereiten, idealerweise aus Politik, Gesundheit oder Umwelt
- Kein ambivalenter Fall, kein `INSUFFICIENT`, kein unnötig polarisierender Claim
- Den Lauf mindestens zweimal testen und die Resultate vergleichen
- Falls die Varianz sichtbar stört: anderen Claim wählen

**Wichtiger Grundsatz für die Demo:**
- Nicht zeigen: "Schaut, wie perfekt das System ist."
- Sondern zeigen: "Hier funktioniert bereits eine echte End-to-End-Pipeline, und genau hier liegen die Punkte, an denen Forschung echten Unterschied machen kann."

**Empfohlene Demo-Dramaturgie:**

1. **Vom Input zum Ergebnis**
   - Kurz das Gesamtverdikt zeigen: Wahrheitsprozent, Konfidenz, Verdiktskala
   - Nur kurz genug, um den Output zu verorten

2. **Wie aus einer Eingabe prüfbare Teilfragen werden**
   - Zeigen, wie das System eine Eingabe in überprüfbare Einzelaussagen zerlegt
   - Brücke zu ViClaim:
     - "Genau an dieser Stelle entscheidet sich, was überhaupt vertieft geprüft wird. Hier sehe ich die direkteste Überschneidung zu eurer Claim-Worthiness-Arbeit."

3. **Wie Evidenz aufgebaut wird**
   - Evidence Items, Quellentypen, Richtung und Gewichtung zeigen
   - Punkt nicht zu technisch aufblasen; wichtig ist zu zeigen, dass nicht nur ein generisches LLM-Urteil ausgegeben wird, sondern eine Evidenzstruktur dahinterliegt

4. **Wie das Verdikt zustande kommt**
   - Kurz die Debatte erklären: mehrere Rollen, mehrere Provider, adversariales Element
   - Brücke zu ZHAW:
     - "Bei euch liegt viel Expertise in Detection und Evaluation; bei mir ist die offene Frage stark: Wie macht man die letzte Bewertungsstufe stabiler, günstiger und methodisch belastbarer?"

**Was nur bei Rückfrage zeigen:**
- ClaimAssessmentBoundaries
- Coverage Matrix
- UCM-Konfiguration
- tiefere interne Pipeline-Details

### 4.4 Ehrliche Grenzen klar benennen (5 Min.)

Diese Stelle proaktiv setzen. Das schafft Vertrauen und verhindert, dass das Gespräch in einen defensiven Rechtfertigungsmodus kippt.

- **Analysezeit:** etwa 15 Minuten pro Analyse; Ziel wäre unter 5 Minuten
- **Kosten:** etwa $0.20-0.55 pro Analyse; für Skalierung zu hoch
- **Stochastizität:** Self-Consistency hilft, beseitigt Varianz aber nicht
- **Quellenbasis:** derzeit nur Web-Quellen; keine Paywalls, keine proprietären Datenbanken, keine Offline-Bestände
- **Modalität:** aktuell rein textbasiert; kein Bild- oder Video-Claim-Handling
- **Evaluation:** funktionierendes System, aber noch keine formale, akademisch belastbare Evaluation
- **Team:** bisher Solo-Entwicklung
- **Produktreife:** Alpha-Status, Einladungscode statt breitem Rollout
- **Organisation:** Schweizer Verein in Vorbereitung; Zieltermin 23. April 2026

Die Leitlinie hier ist: Schwächen nicht kaschieren, sondern als Forschungs- und Kooperationshebel formulieren.

### 4.5 Mögliche Projektlinien diskutieren (15 Min.)

Nicht mit einer Lieblingslösung in das Gespräch hineindrücken. Besser: drei plausible Richtungen anbieten und gemeinsam schärfen.

**Ein möglicher Übergangssatz:**
- "Ich sehe im Moment drei Richtungen, die inhaltlich anschlussfähig wirken. Für mich ist eine davon wahrscheinlich der direkteste Startpunkt, aber ich würde gerne zuerst eure Einschätzung hören."

#### C. Claim-Worthiness als Pipeline-Vorfilter
*"Kann eine ViClaim-basierte Check-Worthiness-Klassifikation FactHarbors frühe Pipeline-Stufe verbessern?"*

- Baut am direktesten auf Giedemanns Arbeit auf
- Trifft einen echten Engpass: Welche Aussagen werden vertieft geprüft und wie gut sind diese Teilclaims?
- Könnte die frühe Pipeline-Stufe formaler, konsistenter und potenziell günstiger machen
- Ist gut messbar: Klassifikationsqualität, Qualität der extrahierten Teilclaims, Latenz, Einfluss auf den Rest der Pipeline
- Wirkt als Startpunkt für einen Innovation Cheque besonders plausibel, weil der Scope klar begrenzbar ist

#### A. Ressourceneffiziente Faktenverifikation
*"Können kleinere spezialisierte Modelle frühe Large-Model-Aufrufe ersetzen, ohne die Gesamtqualität der Verdikte relevant zu verschlechtern?"*

- Baut gut auf ViClaim und verwandten Klassifikationsarbeiten auf
- Hat unmittelbaren praktischen Hebel auf Kosten und Laufzeit
- Wäre für ein grösseres Folgeprojekt oder ein späteres Innovationsprojekt attraktiv
- Gut messbar über Latenz, Kosten, Verdikt-Übereinstimmung und Qualitätsverluste entlang der Pipeline

#### B. Multilinguale Verdikt-Stabilität
*"Wie stabil sind FactHarbor-Verdikte über Sprachen, Paraphrasen und Wiederholungen hinweg?"*

- Passt stark zu ZHAWs multilingualer Expertise
- Hat hohe wissenschaftliche Relevanz
- Ist methodisch anspruchsvoller und vermutlich weniger kompakt als erster Cheque-Scope
- Eher eine forschungsintensive Hauptlinie oder ein Folgepaket

**Mein interner Favorit für einen ersten Schritt:** C.  
Nicht aggressiv verkaufen. Wenn die ZHAW klar in Richtung A oder B zieht, mitgehen und gemeinsam schärfen.

### 4.6 Finanzierung nur einordnen, nicht dozieren

Finanzierungsdetails nicht aktiv referieren, solange sie nicht danach fragen. Wenn das Thema aufkommt:

- **Innovation Cheque:** CHF 15'000, vollständig durch Innosuisse finanziert, typischerweise mit kurzer Entscheidfrist
- **Folgeprojekt / Innovationsprojekt:** deutlich grösserer Rahmen, falls der erste Scope gut sitzt
- **Wichtiger Gesprächspunkt:** weniger mit festen Behauptungen auftreten als mit Rückfragen:
  - "Wie erlebt ihr in der Praxis die Realisierbarkeit eines solchen ersten Scopes?"
  - "Welche Form wäre aus eurer Sicht für einen ersten Anlauf am sinnvollsten?"

### 4.7 Gesprächsende und nächste Schritte (5-10 Min.)

Am Ende nicht fünf gleichrangige Fragen nebeneinanderstellen. Zuerst auf eine Hauptentscheidung zielen, dann höchstens ein bis zwei Folgepunkte.

**Primärfrage:**
- "Welche dieser Richtungen wirkt für euch fachlich und organisatorisch am sinnvollsten als nächster Schritt?"

**Danach, falls passend:**
- "Wäre ein Innovation-Cheque-Antrag bis Ende Mai für euch grundsätzlich realistisch?"
- "Sollten wir für den nächsten Schritt noch weitere Personen einbeziehen?"
- "Seht ihr eine sinnvolle Verbindung zu SwissText oder wäre das eher ein späteres Thema?"
- "Gibt es mögliche Synergien mit SpinningBytes oder sollte man das bewusst separat halten?"

---

## 5. Mitbringen

- [ ] Laptop mit geöffneter FactHarbor-Demo
- [ ] Vorbereiteter Demo-Claim, zweimal getestet, Resultat plausibilisiert
- [ ] Screenshots des Reports auf dem Handy als Offline-Backup
- [ ] Kurz die wichtigsten Zahlen im Kopf, damit keine Suche im Meeting nötig ist
- [ ] Aktueller Stand zur Vereinsgründung
- [ ] Optional: Academic Cooperation Seite als Hintergrundreferenz, aber nicht als Gesprächsleitfaden

---

## 6. Nach dem Meeting

- [ ] Danke-E-Mail noch am selben Tag
- [ ] Vereinbarten nächsten Schritt schriftlich zusammenfassen
- [ ] Falls sie eine konkrete Projektlinie vorschlagen: innerhalb einer Woche einen knappen 1-Seiter schicken
- [ ] Falls SwissText Thema war: Fristen und passende Formate nachziehen
- [ ] Cooperation Opportunities Seite mit Ergebnis und Follow-up aktualisieren

---

## 7. Wichtige Fakten parat haben

Nur nennen, wenn sie für das Gespräch wirklich nützlich sind. Nicht ungefragt Zahlen abladen.

| Fakt | Wert |
|------|------|
| Pipeline-Stufen | 5 + optionale 4.5 (SR-Kalibrierung) |
| Debate-Schritte pro Claim | 5 (adversarial, Multi-Provider) |
| LLM-Anbieter | 4 (Anthropic Sonnet, OpenAI GPT-4.1, Google Gemini, Mistral) |
| Such-Anbieter | 7 |
| LLM-Aufrufe pro Analyse | ~40-50 |
| Analysezeit | ~15 Min. (Ziel: < 5 Min.) |
| Kosten pro Analyse | $0.20-0.55 (Ziel: < $0.10) |
| Verdikt-Skala | 7-Punkte (TRUE bis FALSE) + 4 Konfidenz-Stufen |
| Getestete Sprachen | DE, EN, FR, PT |
| Input-Neutralität | +-4% |
| Lizenz | Open Source, Public Interest, MIT |
| Rechtsform | Schweizer Verein in Vorbereitung (Ziel: 23. April 2026) |
| Einladungscode für ZHAW | `ZHAW-1` |

---

## 8. Gesprächsbrücken

Nur situativ verwenden. Nicht als Monologblock.

### Falls sie nach Praxis-Validierung fragen
- "Catherine Gilbert (dpa OSINT, zuvor Keystone-SDA) ist mein erster Fact-Checker-Kontakt. Wir hatten am 8. April einen Video-Call."
- "In der Schweiz gibt es keine IFCN-zertifizierte Fact-Checking-Organisation; genau deshalb scheint mir der Bedarf strukturell interessant."

### Falls sie nach anderen akademischen Kontakten fragen
- "Ich kenne Elliott Ashs Gruppe an der ETH und Markus Leippold an der UZH. Die ZHAW ist für mich im Moment die naheliegendste erste Adresse, weil die methodische Überschneidung besonders direkt ist."

### Falls sie nach Team und Umsetzbarkeit fragen
- "Bisher ist FactHarbor Solo-Entwicklung. Gerade deshalb ist eine akademische Partnerschaft für mich so interessant: für methodische Schärfe, Evaluation und personelle Breite."

### Falls sie nach Geschäftsmodell und Governance fragen
- "Geplant ist ein Non-Profit-Verein ohne Gewinnausschüttung. Finanzierung sehe ich über Fördergelder, Spenden und langfristig institutionelle Partnerschaften."

### Falls sie nach Verdikt-Qualität oder Benchmarks fragen
- "Ich habe ein funktionierendes System, aber noch keine akademisch saubere Evaluation. Genau das ist einer der Hauptgründe, warum ich diese Partnerschaft suche."

### Falls sie nach der Abgrenzung zu existierenden Tools fragen
- "Viele bestehende Tools decken nur einzelne Schritte ab. FactHarbor versucht die gesamte Kette abzubilden: Zerlegung, Recherche, Evidenzstruktur, Debatte und Verdikt."

### Falls Nachhaltigkeit und Personenabhängigkeit Thema werden
- "Der Open-Source-Ansatz und die geplante Vereinsstruktur sollen genau dieses Risiko reduzieren. Und gerade deshalb suche ich früh Partner, statt das Projekt isoliert weiterzubauen."

### Falls CheckThat! Lab aufkommt
- "Das wäre ein starker externer Referenzpunkt. Eine gemeinsame Evaluation oder Teilnahme würde Forschung und Praxis sehr gut verbinden."

### Falls AVeriTeC 2025 erwähnt wird
- "Die Vorgabe unter 10B Parametern und unter einer Minute pro Claim ist als Zielbild für ressourceneffiziente Verifikation extrem relevant."

### Falls SwissText zur Sprache kommt
- "Das könnte ein sehr guter nächster Schritt sein, sobald wir eine gemeinsame Projektlinie sauber formuliert haben."

---

## 9. Was schiefgehen kann

| Risiko | Vorbereitung |
|--------|-------------|
| WLAN oder Beamer fallen aus | Screenshots des Reports auf dem Handy und notfalls reine Gesprächsführung ohne Live-Demo |
| Demo liefert einen schwachen oder irritierenden Fall | Claim vorab testen; nur einen Fall zeigen, den ich inhaltlich verstehe |
| Sie haben das Tool kaum angeschaut | Kein Problem. Kurz kontextualisieren und mit der Demo aufholen |
| Cieliebak ist nicht dabei | Gespräch trotzdem vollwertig führen; Ergebnis danach an alle sauber nachfassen |
| Sie bringen eine ganz andere Projektidee ein | Nicht verteidigen, sondern prüfen, ob ihre Idee fachlich stärker und Innosuisse-tauglicher ist |
| Finanzierungsfrage kommt zu konkret | Nicht spekulieren; auf ihre Erfahrung zurückspielen |
| Das Gespräch dauert länger oder driftet | Nicht hektisch abklemmen; nur sicherstellen, dass am Ende ein klarer nächster Schritt benannt ist |
