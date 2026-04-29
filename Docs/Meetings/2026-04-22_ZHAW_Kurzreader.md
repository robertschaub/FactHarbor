# ZHAW-Meeting Kurzreader — 4 Zusammenfassungen

Kompakte Vorbereitung für das Meeting am 22. April 2026. Lesezeit: ~15 Minuten.

> **Statushinweis 29.04.2026:** Dieses Dokument ist ein historischer Meeting-Kurzreader aus der Phase vor der formellen Eintragung. FactHarbor ist inzwischen als Verein gegründet; der Handelsregister-Eintragsbrief liegt vor; UID / Firmennummer: `CHE-448.446.098`.

---

## 1/4: Meeting-Prep — das Wichtigste auf einen Blick

> Vollversion: [Meeting-Prep](2026-04-22_ZHAW_Meeting_Prep.md)

### Die drei Leute

| Wer | Rolle | Was er macht | Für dich wichtig |
|-----|-------|-------------|-----------------|
| **Patrick Giedemann** | Doktorand | ViClaim (EMNLP 2025): Claim Detection in Videos. HAMiSoN-Team. WEF 2026 für ZHAW. | Dein Hauptkontakt. Thesis C baut auf seiner Doktorarbeit auf → er profitiert persönlich von einer Publikation. |
| **Mark Cieliebak** | Professor, Gruppenleiter | Leitet NLP-Gruppe, CEO SpinningBytes, Präsident SwissNLP, SwissText-Gründer. Mehrere Innosuisse-Projekte. | Entscheidungsträger. Kennt Innosuisse besser als du. Strategische Fragen an ihn richten, Finanzierung ihm überlassen. |
| **Jan Milan Deriu** | Senior Researcher | HAMiSoN Co-PI, Evaluationsmethodik (Favi-Score), 831+ Zitierungen. | Kann formalisieren, wie man Verdikt-Qualität misst. |

### Ablauf (60–75 Min.)

1. **Einstieg** (5 Min.) — Danke, kurze Vorstellung, Erwartung setzen
2. **Ihre Perspektive** (15–20 Min.) — DER WICHTIGSTE BLOCK. Fragen, zuhören, Demo-Fokus anpassen
3. **Demo** (10 Min.) — Nur 4 Punkte: Verdikt → Atomic Claims/Gate 1 → Evidenz → Debatte
4. **Ehrliche Grenzen** (5 Min.) — 15 Min./Analyse, $0.20-0.55, Solo, Alpha, kein Video, Vereins-/UID-Status damals noch im Aufbau
5. **Projektthesen** (15 Min.) — Thesis C als Favorit führen, A und B als Alternativen
6. **Nächste Schritte** (5–10 Min.) — Cheque-Zeitplan, SwissText, SpinningBytes-Synergien

### Dein Favorit: Thesis C — Claim-Worthiness als Pipeline-Vorfilter

*"Kann eine ViClaim-basierte Check-Worthiness-Klassifikation FactHarbors Claim-Extraktion verbessern?"*

Warum C: Baut auf Giedemanns PhD, klarer Scope für Cheque, schnellste Publikation ("ViClaim in the Wild"), am klarsten messbar. Sage: "Mein Favorit ist C — aber ich möchte hören, was euch am meisten reizt."

### Drei Merksätze

1. **40% du, 60% sie.** Nicht pitchen — intellektuell einsteigen lassen.
2. **Finanzierung Cieliebak überlassen.** Er kennt Innosuisse besser.
3. **Schwächen vorwegnehmen.** "Genau deshalb suche ich eine akademische Partnerschaft."

---

## 2/4: ViClaim — Giedemanns Hauptarbeit

> Vollversion: [ViClaim Analyse](../Knowledge/ViClaim_EMNLP2025_Lessons_for_FactHarbor.md)

### Was ist ViClaim?

Erster multilingualer Datensatz für Claim Detection in **Videos** (nicht Text). 1'798 YouTube Shorts, 17'116 annotierte Sätze, 3 Sprachen (EN/DE/ES), 6 Themen. Publiziert bei EMNLP 2025 (main conference) — das ist eine Top-Venue.

### Die Kernresultate, die du kennen musst

| Modell | Parameter | Fact-Check-Worthy F1 |
|--------|-----------|---------------------|
| **XLM-RoBERTa-Large** (fine-tuned) | **550M** | **0.90** |
| LLama3.2-3B (QLoRA fine-tuned) | 3B | 0.90 |
| o3-mini (zero-shot) | — | 0.78 |
| 4o-mini (zero-shot) | — | 0.65 |

**Die Kernaussage:** Ein feinjustiertes 550M-Modell schlägt Zero-Shot-Frontier-LLMs um 12+ Punkte. Grössere Decoder-Modelle (3B, 7B) bringen keinen Vorteil.

### Die Taxonomie (3 Klassen, multi-label)

| Label | Bedeutung | FactHarbor-Parallele |
|-------|-----------|---------------------|
| **FCW** (Fact Check-Worthy) | Prüfbare Faktenaussage von öffentlichem Interesse | AtomicClaim (was wir extrahieren) |
| **FNC** (Fact Non-Check-Worthy) | Faktisch, aber nicht prüfenswert (persönliche Erfahrung, Witz) | Wird von Gate 1 rausgefiltert — aber unformalisiert |
| **OPN** (Opinion) | Meinungen, Überzeugungen, Spekulationen | Wird aktuell nicht explizit unterschieden |

**Warum das für dich wichtig ist:** FactHarbors Gate 1 macht binär pass/fail. ViClaims 3-Klassen-Taxonomie ist differenzierter und könnte Gate 1 ersetzen — das ist Thesis C.

### Die Killer-Statistik für Written vs. Spoken

Modelle, die auf Tweets trainiert wurden, erreichen auf Video-Transkripten nur **F1 = 0.32** (statt 0.69). Written ≠ Spoken. Falls FactHarbor jemals Audio/Video verarbeitet, braucht es ViClaim-spezifische Modelle.

### Was du im Meeting dazu sagen kannst

- "Euer ViClaim-Modell (550M) schlägt die grossen LLMs — das passt perfekt zu unserer Pipeline, wo wir in Stage 1 und 2 aktuell teure API-Calls machen."
- "Die FCW/FNC/OPN-Taxonomie ist differenzierter als unser binäres Gate 1 — genau das könnte die Qualität unserer Claim-Extraktion verbessern."
- "Und der Weg zur Publikation ist klar: ViClaim-Modell in einer echten Fact-Checking-Pipeline evaluieren."

---

## 3/4: HAMiSoN — ihr Flagship-Projekt

> Vollversion: [HAMiSoN Analyse](../Knowledge/HAMiSoN_Lessons_for_FactHarbor.md)

### Was ist HAMiSoN?

**Holistic Analysis of Organised Misinformation Activity in Social Networks.** EUR 1.1M EU-Projekt (CHIST-ERA), 36 Monate (Jan 2023 – Dez 2025). Vier Partner: UNED (Spanien, Koordinator), **ZHAW** (Schweiz), Uni Tartu (Estland), Synapse (Frankreich).

### Zwei Ebenen

| Ebene | Was | FactHarbor-Bezug |
|-------|-----|-----------------|
| **Message Level** | Claim Detection, Stance Detection, Verified Claim Retrieval | Direkt relevant: Stage 1 + Stage 2 + Stage 4 |
| **Network Level** | Propagation, Koordiniertes Verhalten, Kampagnen-Erkennung | Aktuell nicht relevant, aber langfristig interessant für Source Reliability |

### Was rauskam (Auswahl)

- **30+ Publikationen** an Top-Venues (EMNLP, IJCAI, ICWSM, CLEF)
- **ViClaim** — der Claim-Detection-Datensatz (siehe oben)
- **CheckThat! Lab 2023: Platz 2** — Multimodale Check-Worthiness Detection
- **Minimale Domain-Adaption:** Nur 100 gelabelte Beispiele reichen für neue Domänen (CPCC/BCC-Methode)
- **Diverse Demos:** Dashboard, Chatbot, Propagations-Simulator

### Wer was gemacht hat

- **Deriu:** Co-PI, Projektleitung ZHAW-Seite
- **Cieliebak:** Co-PI, strategische Leitung
- **Giedemann:** ViClaim (Erstautor), Video-Desinformation
- **von Däniken:** CheckThat! Lab (Platz 2), Kernel-Ensemble-Methode

### Was du im Meeting dazu sagen kannst

- "HAMiSoN analysiert Desinformation auf Message- und Netzwerk-Ebene — FactHarbor arbeitet auf Evidenz- und Claim-Ebene. Das ergänzt sich."
- "Was HAMiSoN nicht gemacht hat: automatisierte Verdikt-Generierung und evidenzgewichtete Multi-Agent-Debatte. Genau das bringt FactHarbor mit."
- "Euer Track Record mit HAMiSoN — 30+ Papers, Top-Venues, pünktlich abgeliefert — ist genau das, was eine Innosuisse-Bewerbung braucht."

---

## 4/4: Innosuisse — was du wissen musst

> Vollversion: [Innosuisse Leitfaden](../Knowledge/Innosuisse_Bewerbung_Leitfaden.md)

### Innovation Cheque (der erste Schritt)

| Aspekt | Detail |
|--------|--------|
| **Betrag** | CHF 15'000, 100% Innosuisse-finanziert |
| **Entscheid** | 4–6 Wochen |
| **Wer beantragt** | Forschungspartner (ZHAW) |
| **Zweck** | Machbarkeitsstudie / Vorstudie |
| **Anforderung** | Umsetzungspartner (FactHarbor) braucht UID |

### Innovation Project (das Folgeprojekt)

| Aspekt | Detail |
|--------|--------|
| **Betrag** | Typisch CHF 100K–300K (max. CHF 2.5M) |
| **Dauer** | Bis 36 Monate |
| **Kostenaufteilung** | Innosuisse zahlt Forschungspartner; FactHarbor trägt Eigenleistung |
| **Eigenleistung** | 40–60% der Gesamtkosten (In-Kind: deine Entwicklerzeit) |
| **Cash-Beitrag** | Min. 5% der Gesamtkosten an Forschungspartner |
| **Härtefallklausel** | Art. 19(2bis) FIFG: Reduktion möglich bei hohem gesellschaftlichem Nutzen, breiter Nutzergruppe, oder finanzieller Unfähigkeit + starkem Umsetzungspotenzial. Alle drei treffen auf FactHarbor zu. |
| **Bewilligungsquote** | 41% (2024, reguläre Innovation Projects) |
| **Einreichung** | Laufend (rolling basis), 8 ICT-Sitzungen pro Jahr |

### Was du als Verein brauchst

- **UID-Nummer** — beim BFS direkt oder via Handelsregister
- **Verein muss bei Antragstellung existieren** (Innolink-Portal verlangt UID)
- **Keine Mindestanforderungen** an Mitarbeiterzahl, Umsatz oder Track Record
- **Gründung:** 1 Tag (2 Mitglieder + Statuten). UID: 1–2 Wochen danach.

### Was du NICHT im Meeting sagen solltest

- Keine Hardship-Klausel als Behauptung. Stattdessen: "Ich habe gelesen, dass es Reduktionsmöglichkeiten gibt — stimmt das nach eurer Erfahrung?"
- Keine Eigenleistungs-Prozente als Fakten präsentieren. Cieliebak kennt das besser.
- Kein "4-monatige Machbarkeitsstudie" — die Cheque-Laufzeit ist projektabhängig, nicht fix.

### Update nach dem Meeting (April 2026)

**Neuer bevorzugter Track: DIZH 5. Rapid Action Call**
- CHF 15'000–75'000, Deadline 1. Juli 2026
- Thema: "Demokratische Resilienz" — passt perfekt
- **Kein Cash-Beitrag von FactHarbor nötig** (Cieliebak bestätigt: ZHAW deckt Matching intern)
- In-Kind (Entwicklerzeit) im Letter of Intent erwähnen
- Kompatibilität mit Innosuisse Cheque wird noch geklärt (Navina Gupta, ab 1. Mai)

Siehe [DIZH Leitfaden](../Knowledge/DIZH_Rapid_Action_Call_Leitfaden.md) für Details.

### Entlastungspaket 2027

Innosuisse-Kürzungen von 32–33 Mio. CHF/Jahr geplant. Argument: "Die Fördertöpfe werden kleiner — ein Grund mehr, jetzt zu starten."

### Nächste realistische ICT-Sitzungen (Innosuisse)

| Datum | Einreichung bis |
|-------|----------------|
| 24.06.2026 | ~13.05.2026 |
| 02.09.2026 | ~22.07.2026 |

Für den **Innovation Cheque** gilt ein schnellerer Prozess (4–6 Wochen, keine festen Sitzungstermine).
