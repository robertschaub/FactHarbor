# FactHarbor Glossar — für Fact-Checker verständlich erklärt

**Für:** Catherine Gilbert Call, 8. April 2026
**Zweck:** Alle Begriffe die im Report oder in der Demo auftauchen, in Praxis-Sprache erklärt.

---

## Der Report — von oben nach unten

### Overall Assessment (Gesamtbewertung)
Die Zusammenfassung ganz oben im Report. Enthält:
- **Truth Percentage (Wahrheitsgrad):** 0–100%. Wie stark die gefundene Evidenz die Behauptung stützt. 75% heisst: starke Stützung mit einigen Vorbehalten.
- **Verdict (Verdikt):** Eines von 7 Labels — True, Mostly True, Leaning True, Mixed, Leaning False, Mostly False, False. Abgeleitet vom Wahrheitsgrad.
- **Confidence (Konfidenz):** 0–100%. Wie sicher das System in seinem Verdikt ist. Hohe Konfidenz = klare, konsistente Evidenzlage. Niedrige Konfidenz = dünn oder widersprüchlich.
- **Verdict Narrative:** Ein Absatz in Klartext der die Kernaussage zusammenfasst.

### Atomic Claim (Atomare Behauptung)
Eine einzelne, prüfbare Aussage. Das System zerlegt jede Eingabe in solche Einzelbehauptungen. "Plastik-Recycling bringt nichts und verschmutzt die Umwelt" wird zu zwei getrennten Claims:
1. "Plastik-Recycling bringt nichts"
2. "Plastik-Recycling verschmutzt die Umwelt"

Meinungen, Prognosen und vage Aussagen werden rausgefiltert — nur prüfbare Fakten bleiben.

### Gate 1 (Qualitätstor 1)
Der erste Filter: Ist die Behauptung tatsächlich überprüfbar? Meinungen ("Ich finde X schlecht") und Prognosen ("X wird in 10 Jahren passieren") fallen hier raus. Zentrale Claims werden geschützt — auch wenn sie grenzwertig sind, bleiben sie drin weil der Nutzer sie eingegeben hat.

---

## Evidenz und Quellen

### Evidence Item (Evidenz-Element)
Eine einzelne Information aus einer Quelle. Kann ein Zitat, eine Statistik, ein Expertenfazit oder eine Zusammenfassung einer Studie sein. **Wichtig:** Das ist noch kein bewiesener Fakt — es ist Material das gegen die Claims geprüft wird.

Jedes Evidence Item enthält:
- **Statement:** Was die Quelle sagt
- **Claim Direction:** Stützt es die Behauptung (supports), widerspricht es (contradicts), oder ist es Kontext (neutral)?
- **Probative Value:** Wie beweiskräftig ist es? HIGH = konkret, spezifisch, gut belegt. MEDIUM = brauchbar aber weniger präzise. LOW = vage oder schlecht belegt.
- **Source Type:** Was für eine Quelle? Peer-Review-Studie, Nachrichtenartikel, Regierungsbericht, Expertenmeinung, Organisation etc.

### Source Reliability (Quellen-Zuverlässigkeit)
Jede Domain (z.B. reuters.com, tagesanzeiger.ch) bekommt einen Reliability-Score. Eine Peer-Review-Studie zählt anders als ein Social-Media-Post. Das System bewertet:
- Track Record der Domain (Genauigkeit, Korrekturen, Transparenz)
- Quellentyp (Primärquelle vs. Sekundärquelle)
- Ob die Evidenz von einer anderen Studie abgeleitet ist (derivative = schwächer als Original)

### Evidence Scope (Evidenz-Kontext)
Die "Rahmenbedingungen" eines Evidenz-Elements. Beantwortet: Wo, wann, mit welcher Methodik wurde das untersucht?
- **Geographic:** Gilt die Studie für die Schweiz, die EU, die USA?
- **Temporal:** Aus welchem Zeitraum stammen die Daten (2020? 2024?)?
- **Methodology:** Welche Methodik? (z.B. Life-Cycle-Assessment vs. wirtschaftliche Analyse)

**Warum das wichtig ist:** Eine Studie die für die EU gilt, sagt nicht unbedingt etwas über die USA aus. Evidence Scopes machen diese Unterschiede sichtbar.

---

## Analyse-Struktur

### Claim Assessment Boundary (Analyse-Rahmen)
**Das wichtigste Konzept zum Verstehen.** Wenn verschiedene Evidenz-Elemente unterschiedliche Methodik, Zeiträume oder Regionen abdecken, gruppiert das System sie in getrennte "Rahmen". Jeder Rahmen bekommt sein eigenes Verdikt.

**Beispiel Plastik-Recycling:**
- Rahmen A: "EU-weite LCA-Studien 2020–2024" → 72% True
- Rahmen B: "US-Wirtschaftsanalysen 2022" → 38% True
- Gesamtverdikt: Mixed, 55%

**In Journalisten-Sprache:** Statt zu sagen "Plastik-Recycling ist teils wahr", zeigt das System **warum** Experten unterschiedlicher Meinung sind — nämlich weil sie verschiedene Dinge messen.

### Cross-Boundary Tension (Rahmen-Widerspruch)
Wenn verschiedene Analyse-Rahmen zu widersprüchlichen Verdikten kommen. Das ist kein Fehler — es ist ein Feature. Es zeigt dass die Realität komplex ist und die Antwort davon abhängt welche Methodik, Region oder Zeitraum man betrachtet.

**Einfache Behauptungen** ("Die Erde ist rund") haben 0 Tensions.
**Komplexe Behauptungen** ("Plastik-Recycling bringt nichts") haben typisch 1–3 Tensions.

### Coverage Matrix (Abdeckungs-Matrix)
Eine Tabelle: Claims × Boundaries. Zeigt wie viele Evidenz-Elemente für jeden Claim in jedem Rahmen gefunden wurden. 

**Wofür nützlich:**
- Wo sind **Lücken**? (Claim 3 hat nur Evidenz aus einem Rahmen — unsicher)
- Wo ist die Evidenz **konzentriert**? (Alles von einer Quelle — riskant)
- Wo ist sie **breit abgestützt**? (Mehrere unabhängige Rahmen stimmen überein — stark)

---

## Die Debatte — 5 Schritte

### Advocate (Anwalt)
Erste KI liest alle Evidenz und erstellt ein initiales Verdikt pro Claim. Fokussiert auf die stärkste Interpretation der Evidenz.

### Self-Consistency (Gegenprobe)
Der Advocate wird 2x wiederholt mit leicht veränderten Einstellungen. Kommt jedes Mal das gleiche Verdikt raus? Wenn ja → stabil, hohe Konfidenz. Wenn die Antworten schwanken → die Evidenz ist mehrdeutig, Konfidenz sinkt.

### Challenger (Herausforderer)
Ein **anderer KI-Anbieter** (OpenAI statt Anthropic) versucht Schwächen im Verdikt zu finden:
- "Welche Evidenz fehlt?"
- "Welche Annahmen könnten falsch sein?"
- "Gibt es Gegenbeweise die ignoriert wurden?"

**Wichtig:** Nur evidenzbasierte Einwände zählen. "Ich glaube das nicht" reicht nicht — der Challenger muss auf konkrete Evidenz verweisen.

### Reconciler (Schlichter)
Dritte KI liest sowohl das Verdikt des Advocate als auch die Einwände des Challenger und entscheidet: Welche Einwände sind berechtigt? Ändern sie das Verdikt? Produziert das finale Verdikt.

### Validator (Prüfer)
Zwei automatische Checks am Schluss:
- **Grounding Check:** Existieren die zitierten Quellen wirklich? (Halluzinations-Erkennung)
- **Direction Check:** Passt die Evidenz-Richtung zum Verdikt? (Wenn das Verdikt "True" sagt aber die meiste Evidenz dagegen spricht → Warnung)

---

## Qualitätskontrolle

### Gate 4 (Qualitätstor 4)
Der finale Qualitätscheck nach der Debatte. Klassifiziert jedes Verdikt in einen Confidence Tier:
- **HIGH** (75–100%): Klare Evidenz, zuverlässige Quellen, stabiles Verdikt. Publizierbar.
- **MEDIUM** (50–74%): Brauchbar, aber mit Vorbehalten. Publizierbar mit Caveat.
- **LOW** (25–49%): Dünne Evidenz, schwache Quellen. Nur mit starkem Disclaimer.
- **INSUFFICIENT** (<25%): Keine ausreichende Evidenz. System sagt ehrlich: "Ich kann hier kein belastbares Verdikt abgeben."

### Analysis Warning (Analyse-Warnung)
Hinweise auf Einschränkungen im Report:
- "Nur 2 Quellen gefunden" → Mehr Recherche nötig
- "Alle Evidenz aus einer Region" → Eingeschränkte Gültigkeit
- "Hohe Evidenz-Konzentration auf eine Domain" → Abhängigkeit von einer Quelle
- "Evidenz-Ungleichgewicht" → Nur stützende oder nur widersprechende Evidenz gefunden

**Wichtig:** Warnungen sind keine Fehler — sie sind Transparenz. Das System sagt dir wo du selbst genauer hinschauen solltest.

---

## Pipeline-Begriffe

### Structured AI Debate (Strukturierte KI-Debatte)
Der Kernprozess: Nicht eine einzelne KI-Antwort, sondern 5 Schritte mit verschiedenen Rollen und verschiedenen KI-Anbietern die gegeneinander argumentieren. Analog zu einem redaktionellen Review-Prozess.

### Multi-Provider
Verschiedene KI-Firmen (Anthropic und OpenAI) werden bewusst eingesetzt — der Advocate und der Challenger kommen von verschiedenen Anbietern. Dadurch wird verhindert dass eine einzelne KI ihre eigenen Blind Spots nicht erkennt.

### RAG (Retrieval Augmented Generation)
Die KI "erfindet" keine Antworten aus dem Training. Stattdessen wird sie mit Evidenz "gefüttert" die das System vorher per Web-Suche (Google, Semantic Scholar, Wikipedia etc.) gefunden hat. Die KI analysiert nur was sie tatsächlich an Quellen bekommen hat.

### Alpha
Aktueller Entwicklungsstand: System funktioniert end-to-end, aber noch nicht produktionsreif. ~15 Minuten pro Analyse, nur Web-Quellen, keine Bild/Video-Verifikation.

---

## Begriffe die Catherine aus ihrem Alltag kennt — und wie FactHarbor sie abdeckt

| Ihr Begriff | FactHarbor-Äquivalent |
|---|---|
| "Claim checken" | Atomic Claim → Evidenz-Recherche → Verdikt |
| "Quellen prüfen" | Source Reliability + Evidence Scope |
| "Gegenrecherche" | Challenger-Schritt + Contradiction Iterations |
| "Faktencheck-Bericht" | Overall Assessment + Verdict Narrative |
| "OSINT-Recherche" | Automatische Web-Suche (7 Provider) + Relevanz-Filter |
| "Deepfake-Erkennung" | Nicht abgedeckt (dafür InVID/TinEye) |
| "Verifikation" | Die gesamte Pipeline: Extract → Research → Debate → Report |
