# Vorbereitung Meeting: Elliott Ash — Politische Verzerrung in LLMs & FactHarbor

**Für:** Meeting mit Elliott Ash (ETH Zürich)
**Datum:** 19.02.2026
**Ausgangspunkt:** [Aligning LLMs with Diverse Political Viewpoints](https://aclanthology.org/2024.emnlp-main.412/) (Stammbach, Widmer, Cho, Gulcehre, Ash — EMNLP 2024)
**Review durch:** Claude Opus 4.6, Claude Sonnet 4.6, GPT-5.3 Codex (nachfolgend zusammengeführt)

---

## 1. Das Paper in Kürze

LLMs haben eine messbare politische Verzerrung. ChatGPT stimmt mit der Grünliberalen Partei der Schweiz zu 58% überein. Wenn es gebeten wird, unterschiedliche Standpunkte darzustellen, erzeugt es nahezu identische Antworten (Jaccard-Ähnlichkeit 0,48).

**Lösung:** Feinabstimmung von Llama 3 8B mit 100'000 echten Kommentaren von Schweizer Parlamentskandidierenden ([smartvote.ch](https://smartvote.ch)) mittels ORPO (Odds Ratio Preference Optimization) — eine monolithische Präferenzmethode, die Antworten mit unterschiedlichen politischen Metadaten in einem einzigen Trainingsdurchlauf auseinandertreibt.

**Ergebnisse:**

| Metrik | ChatGPT Zero-Shot | ChatGPT Few-Shot | **Llama 3 ORPO** |
|--------|-------------------|-----------------|------------------|
| Diversität (Jaccard, niedriger=besser) | 0,48 | 0,34 | **0,24** |
| Genauigkeit (MAUVE, höher=besser) | 0,24 | 0,49 | **0,64** |
| Menschliche Präferenz | Baseline | — | **~60% bevorzugt** |

**Kernbefund:** ORPO treibt Antworten auseinander, die ähnliche Sprache verwenden, aber unterschiedliche politische Positionen ausdrücken. Das Muster «ausgewogene Übersichten» (perspektivenbezogene Standpunkte generieren → synthetisieren) eliminiert falschen Konsens.

### Einschränkung der Übertragbarkeit

Das Paper misst die Qualität der **Standpunkt-Generierung**, nicht die Genauigkeit der **Behauptungsüberprüfung**. Evidenzbasierung verändert die Verzerrungsdynamik grundlegend. Die Ergebnisse sind für FactHarbor primär bei bewertend mehrdeutigen Behauptungen mit umstrittener Evidenz relevant — nicht bei faktisch eindeutigen Aussagen. *(Alle drei Reviewer stimmen überein)*

### Einschränkungen des Papers (Methodenkritik, NICHT FactHarbor-Schwächen)

1. Nur Llama 3 8B getestet — grössere Modelle benötigen möglicherweise kein Alignment
2. Schweiz-spezifisch — ungewöhnlich günstiger Kontext (Verhältniswahlrecht, 85% Kandidatenteilnahme)
3. Schwache menschliche Evaluation — 2 Annotatoren, Cohens Kappa 0,55 (moderat), 0,84 ohne Unentschieden
4. Jaccard ist ein schwaches Diversitätsmass — Wortüberlappung, keine semantische Ähnlichkeit. MAUVE-Ergebnisse sind robuster
5. Zirkuläres Training/Evaluation — ORPO auf denselben Kommentaren trainiert, die als MAUVE-Referenz dienen
6. Keine Halluzinationsanalyse, keine Kontrolle für zeitliche Verschiebung, keine Tests auf adversariale Robustheit

---

## 2. Ashs Forschungsportfolio — Wissenswertes

### Stufe 1: Direkt relevant für FactHarbor

**Climinator** (npj Climate Action 2025) — [Link](https://www.nature.com/articles/s44168-025-00215-8)
Automatisierte Faktenprüfung von Klimabehauptungen. **Mediator-Anwalt-Framework** mit strukturell unabhängigen Anwälten (RAG auf IPCC-Korpus vs. allgemeines GPT-4o). >96% Genauigkeit. Das Hinzufügen eines adversarialen NIPCC-Anwalts erhöhte die Debattenrunden von 1 auf 18 bei umstrittenen Behauptungen — wobei echte Kontroverse korrekt erkannt wurde.
*Kritischer Vergleich:* Climinator verwendet verschiedene Modelle mit verschiedenen Korpora. FactHarbor verwendet dasselbe Sonnet-Modell für alle Debattenrollen.
> **[FH 19.02.2026]** Teilweise adressiert. Alle 4 Debattenrollen (advocate, selfConsistency, challenger, reconciler) sind nun per UCM pro Tier konfigurierbar (`debateModelTiers` in PipelineConfig). Admins können verschiedene Tiers pro Rolle zuweisen. Eine Laufzeitwarnung (`all_same_debate_tier`) wird ausgelöst, wenn alle 4 denselben Tier verwenden. Einschränkung: weiterhin auf Anthropic-Modell-Tiers beschränkt (haiku/sonnet) — echte Anbieter-Trennung (z.B. GPT-4o als Challenger) erfordert eine Erweiterung von `LLMCallFn`.

**AFaCTA** (ACL 2024) — [Link](https://aclanthology.org/2024.acl-long.104/)
LLM-gestützte Erkennung faktualer Behauptungen mit dem PoliClaim-Datensatz. Verwendet **3 vordefinierte Argumentationspfade** zur Konsistenzkalibrierung — strukturell verschieden von FactHarbors temperaturbasierter Selbstkonsistenz. Pfadbasierte Konsistenz könnte Verzerrungen erkennen, die Temperaturvariation nicht aufdeckt.

**Knowledge Base Choice** (JDIQ 2023) — [Link](https://dl.acm.org/doi/10.1145/3561389)
Es gibt keine universell beste Wissensbasis. Domänenüberlappung bestimmt die Genauigkeit. Die Kombination mehrerer KBs bietet minimalen Vorteil gegenüber dem besten Einzeltreffer. Pipeline-Konfidenz sagt die KB-Effektivität ohne Ground-Truth-Labels voraus. Befürwortet «datenzentrierte Behauptungsprüfung».
*Am unmittelbarsten umsetzbar für FactHarbor:* Websuche = Auswahl einer KB zur Laufzeit. Die Suchstrategie sollte behauptungsdomänen-bewusst sein.

**BallotBot** (Working Paper 2025) — [SSRN](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5168217)
Randomisiertes Experiment (Kalifornien, Wahlen 2024). KI-Chatbot mit offiziellen Wahlführer-Informationen. Kernbefunde: verbesserte vertiefte Antworten, **reduzierte Überkonfizienz**, senkte Informationskosten für weniger informierte Wähler, **kein Einfluss auf die Wahlrichtung**. Bestätigt, dass ausgewogene KI-Information informiert, ohne zu steuern.

### Stufe 2: Relevant für spezifische Fragestellungen

| Paper | Venue | Kernbefund für FactHarbor |
|-------|-------|---------------------------|
| **Media Slant is Contagious** | Economic Journal (bedingt angenommen) | Mediale Schlagseite verbreitet sich durch **Framing, nicht Themenwahl**. 24 Mio. Artikel zeigen, dass «diverse» Quellen vererbte Verzerrung teilen können. Bestätigt C13. |
| **In-Group Bias in Indian Judiciary** | REStat 2025 | ML-basierte Verzerrungserkennung bei 5 Mio. Fällen. Ergab knapp null Verzerrung. Methodik (quasi-zufällige Zuweisung → Messung der Richtungsabweichung) relevant für C10-Kalibrierungsdesign. |
| **Conservative News Media & Criminal Justice** | EJ 2024 | Fox-News-Exposition erhöht messbar die Inhaftierungsrate. Mediale Verzerrung hat reale Konsequenzen. |

### Stufe 3: Hintergrund

**Variational Best-of-N** (ICLR 2025) — Alignment-Inferenzoptimierung. **Emotion and Reason in Political Language** (EJ 2022) — textbasierte Emotions-Rationalitäts-Skala bei 6 Mio. Reden. **Apertus** (2025) — offenes mehrsprachiges LLM. **LePaRD** (ACL 2024) — Datensatz für juristische Zitationen.

### Dominik Stammbach (Erstautor)

Postdoc am Princeton CITP. Promotion an der ETH (Frühling 2024) zu datenzentrierter Faktenprüfung. Aktueller Fokus: Legal NLP, Desinformationserkennung, KI für Zugang zur Justiz.

---

## 3. FactHarbor-Positionierung: Stärken, Schwächen, Chancen, Adressiert

### Stärken

1. **Evidenz-zuerst-Pipeline.** Urteile müssen abgerufene Evidenz mit struktureller ID-Validierung zitieren. Eliminiert den Kernbefund des Papers (Zero-Shot-Fabrikation).
2. **Mehrperspektivische Urteile.** `BoundaryFindings[]` und `TriangulationScore` machen Dissens strukturell sichtbar, nicht als nachträgliche Synthese. *(Codex-Einschränkung: Dies ist methodologische Pluralität, nicht notwendigerweise ideologische Pluralität.)*
3. **Obligatorische Widerspruchssuche.** Die Pipeline sucht explizit nach gegenteiliger Evidenz — architektonisch erzwungen.
4. **Reichhaltige Metadaten-Konditionierung.** EvidenceScope, SourceType, claimDirection, sourceAuthority, evidenceBasis — reichhaltiger als das Partei + Sprache + Thema-Template des Papers. *(Codex-Einschränkung: Metadaten existieren, aber es ist nicht garantiert, dass sie bei der Urteilsfindung ausschlaggebend sind.)*
5. **Eingabeneutralität.** «War X fair?» = «X war fair» (Toleranz ≤4%), mit Testsuite.

**Ehrliche Einschätzung:** Dies sind echte Stärken gegenüber Zero-Shot-LLMs. Aber «gute Prozessarchitektur» ist nicht dasselbe wie «nachgewiesene Ergebnisse bei der Verzerrungsminderung» *(Codex' Kernkritik)*. Ohne Messung auf Ergebnisebene ist die Behauptung «mitigiert» verfrüht.
> **[FH 19.02.2026]** Weiterhin zutreffend. Wir haben Erkennung (Evidenz-Schieflage), Korrektur (Harm-Konfidenz-Untergrenze) und Konfigurierbarkeit (Debatten-Tiers) ergänzt, aber noch keine empirische Messung. Das Kalibrierungs-Harness (Massnahme 1) bleibt die kritische Lücke. Alle neuen Parameter sind per UCM konfigurierbar mit Config-Load-Fehlerprotokollierung, sodass das System operativ beobachtbar ist. *Code Review (P-H1): Evidenzeinträge wurden bei mehreren in einem LLM-Aufruf gebündelten Quellen stets `sources[0]` zugeordnet — behoben; LLM gibt nun ein `sourceUrl` pro Eintrag zurück, der der korrekten Quelle zugeordnet ist. Die Zitiergenauigkeit von Stärke #1 ist nun echt.*

### Schwächen

1. **C10: Keine empirische Verzerrungsmessung** — <span style="color:#d32f2f">**Kritisch**</span>. Höchste Priorität, direkt umsetzbar.
2. **C9: Selbstkonsistenz belohnt stabile Verzerrung** — <span style="color:#e65100">**Hoch**</span>. Illusorische Kontrolle, die falsche Sicherheit vermittelt.
3. **C13: Verzerrung des Evidenzpools** — <span style="color:#e65100">**Hoch**</span>. Verzerrungseinspeisung vor jeglicher LLM-Reasoning; Erkennung erledigt, Rebalancierung noch nicht implementiert.
> **[FH 19.02.2026]** Erkennung implementiert. `assessEvidenceBalance()` läuft nach Stage 2 (Recherche), vor den Urteilen. Gibt eine `evidence_pool_imbalance`-Warnung mit Stichprobengrössen-Kontext aus (z.B. «83%, 5 von 6 gerichteten Evidenzeinträgen»). Schieflage-Schwellenwert und Mindestanzahl gerichteter Einträge sind per UCM konfigurierbar. Rebalancierung (aktive Korrektur) ist noch nicht implementiert — nur Erkennung. *Code Review (P-M2): Richtungslabel-Matching korrigiert von `includes("support")` (würde "unsupported" treffen) zu `=== "supports"` — die in diese Warnung einfliessenden Richtungszählungen sind nun korrekt.*
4. **C17/C18: Prompt Injection + asymmetrische Verweigerung** — <span style="color:#e65100">**Hoch**</span>. Neuartige Angriffsvektoren, die politische Verzerrung verstärken.

### Chancen

Drei konkrete Anknüpfungspunkte aus der Ash-Zusammenarbeit: (1) **Kalibrierungs-Harness-Design** (C10 / §5 Massnahme 1) — Ashs Team verfügt über direkt anwendbare Benchmark-Methodik zur Messung politischer Schieflage; (2) **Pfadkonsistenz aus AFaCTA** als Ergänzung zur temperaturbasierten Selbstkonsistenz — könnte Verzerrungen aufdecken, die Temperaturvariation nicht erkennt (C9); (3) **Anbieterübergreifende Debattenarchitektur** — Climinator's strukturell unabhängige Anwälte bestätigen die Richtung von §5 Massnahme 4; Ash kann beraten, ob Anbieter-Trennung die Ergebnisse im Vergleich zu Tier-Trennung beim gleichen Anbieter wesentlich verändert.

### Adressiert

1. **C8: Nur beratende Validierung** — <span style="color:#2e7d32">**Hoch**</span>. Erkennung ohne Korrektur bei Behauptungen mit hohem Schadenspotenzial.
> **[FH 19.02.2026]** Geschlossen. `enforceHarmConfidenceFloor()` in verdict-stage stuft Urteile mit niedriger Konfidenz bei hohem Schadenspotenzial auf UNVERIFIED herab. Schwellenwert (`highHarmMinConfidence`, Standard 50) und auslösende Schadensstufen (`highHarmFloorLevels`, Standard ["critical","high"]) sind per UCM konfigurierbar. *Code Review (P-H3, U-L1): `as any`-Cast aus der Floor-Prüfung entfernt; UCM-Standardwerte als korrekt registriert bestätigt.*

---

## 4. Meeting-Fragen (priorisiert)

### Muss-Fragen (3-4 für ein einzelnes Meeting auswählen)

1. **Restverzerrung nach architektonischer Mitigation.** «Wie viel verbleibende politische Verzerrung schätzen Sie angesichts unserer Evidenz-zuerst-Architektur mit Widerspruchssuche und Debatte? Reicht Architektur aus, oder ist ein Eingriff auf Modellebene unvermeidlich?»

2. **Single-Model vs. Multi-Model-Debatte.** «Climinator verwendet strukturell verschiedene Anwälte. Wir verwenden dasselbe Sonnet für alle Rollen. Haben Sie qualitativ unterschiedliche Ergebnisse mit struktureller Unabhängigkeit beobachtet? Ist ‹performativer Adversarialismus› ein reales Problem?»
> **[FH 19.02.2026]** Update für Meeting: Wir unterstützen nun Modell-Tier-Konfiguration pro Rolle und warnen, wenn alle Rollen denselben Tier verwenden. Weiterhin derselbe Anbieter (Anthropic). Die Frage bleibt relevant für anbieterübergreifende Trennung.

3. **Minimal tragfähige Verzerrungsmessung.** «Was ist das kleinste Benchmark-Design, das Modell-Prior-Verzerrung von Evidenzpool-Verzerrung unterscheidet? Wie sieht ein gutes Kalibrierungs-Harness für politische Schieflage aus?»

4. **Diagnostik für Evidenzpool-Verzerrung.** «Ihr KB-Choice-Paper zeigt, dass Domänenüberlappung die Genauigkeit bestimmt. Unsere Websuche wählt zur Laufzeit eine KB. Wie sollten wir erkennen, wenn der Evidenzpool schlecht abgestimmt oder politisch verzerrt ist?»
> **[FH 19.02.2026]** Update für Meeting: Wir erkennen nun die Richtungs-Schieflage im Evidenzpool nach der Recherche (Verhältnis unterstützend vs. widersprechend mit Stichprobengrössen-Kontext). Die Frage kann sich verschieben von «wie erkennen» zu «wie rebalancieren» und «reicht verhältnisbasierte Erkennung oder brauchen wir Metriken für semantische Diversität?»

### Falls noch Zeit bleibt

5. **AFaCTA-Pfadkonsistenz vs. Temperaturkonsistenz.** Welche Methode liefert stabilere Kalibrierung bei umstrittenen Behauptungen?
6. **Kumulation von Suchverzerrung.** Kumuliert die Ranking-Verzerrung von Suchmaschinen mit der Reasoning-Verzerrung von LLMs, oder heben sie sich auf?
7. **NIPCC-Stresstest-Analogon.** Könnten wir einen bewusst skeptischen Anwalt einsetzen, um zu testen, ob unsere Debatte echte Kontroverse zutage fördert?
8. **Asymmetrische Verweigerung.** Wie sollte ein Faktenprüfungssystem mit themenabhängigen Modellverweigerungen umgehen, ohne eine Richtungsverzerrung einzuführen?

---

## 5. Umsetzbare Empfehlungen (Prioritätsreihenfolge)

**Grundsatz: Messen vor Umbauen.** *(Codex' strategische Kernerkenntnis — zuerst Baseline-Metriken aufbauen, dann jede architektonische Änderung an gemessene Verbesserung knüpfen.)*

| Priorität | Massnahme | Aufwand | Wirkung | Status |
|-----------|-----------|---------|---------|--------|
| **1** | **Kalibrierungs-Harness für politische Verzerrung** — 20-30 ausgewogene Behauptungspaare (gespiegelte Formulierungen, mehrsprachige Varianten), Richtung/Ausmass der Urteilsverzerrung messen | Gering (~1 Tag, ~$5-10) | <span style="color:#d32f2f">**Kritisch**</span> — grundlegend | <span style="color:#d32f2f">**Offen**</span> |
|   |   |   | *[FH 19.02.2026] Noch nicht umgesetzt. Genehmigt und budgetiert, auf dedizierte Session verschoben.* | |
| **2** | **Fehlermodi instrumentieren** — Verweigerungs-/Degradationsraten nach Thema, Anbieter, Stage erfassen. C18 (asymmetrische Verweigerung) erkennen | Gering | <span style="color:#e65100">**Hoch**</span> — deckt unsichtbare Verzerrung auf | <span style="color:#e65100">**Teilweise**</span> |
|   |   |   | *[FH 19.02.2026] Vorbestehend: Phasen-Metriken (LLM-Aufrufzähler, Latenz, Modell) bereits über `metrics.ts`/`metrics-integration.ts` verdrahtet. Verweigerungs-/Degradationstracking pro Aufruf noch nicht ergänzt.* | |
| **3** | **Validierung bei hohem Schadenspotenzial blockierend machen** — `validateVerdicts()` gibt Urteile unverändert zurück; bei `harmPotential >= "high"` Konfidenz deckeln oder UNVERIFIED erzwingen | Mittel | <span style="color:#2e7d32">**Hoch**</span> — schliesst C8 | <span style="color:#2e7d32">**Erledigt**</span> |
|   |   |   | *[FH 19.02.2026] **Erledigt.** `enforceHarmConfidenceFloor()` — erzwingt UNVERIFIED bei Konfidenz < Schwellenwert. Schadensstufen und Schwellenwert per UCM konfigurierbar. 9 Unit-Tests.* | |
| **4** | **Challenger-Modell trennen** — anderen Anbieter für VERDICT_CHALLENGER (z.B. GPT-4o, wenn der Anwalt Sonnet ist) | Mittel | <span style="color:#e65100">**Hoch**</span> — schliesst C1/C16 | <span style="color:#e65100">**Teilweise**</span> |
|   |   |   | *[FH 19.02.2026] **Teilweise erledigt.** Tier-Konfiguration pro Rolle (`debateModelTiers`) implementiert. Unterstützt haiku/sonnet-Tier-Trennung. Anbieterübergreifende Trennung (GPT-4o vs. Sonnet) erfordert `LLMCallFn`-Erweiterung — als Follow-up markiert. Laufzeitwarnung `all_same_debate_tier` ergänzt.* | |
| **5** | **Diagnostik für Evidenzpool-Balance** — erkennen und melden, wenn der Evidenzpool politisch einseitig ist | Mittel | <span style="color:#2e7d32">**Mittel-Hoch**</span> — schliesst C13 | <span style="color:#2e7d32">**Erledigt**</span> |
|   |   |   | *[FH 19.02.2026] **Erledigt (Erkennung).** `assessEvidenceBalance()` mit stichprobengrössen-bewussten Warnungen. Schieflage-Schwellenwert und Mindestanzahl gerichteter Einträge per UCM konfigurierbar. Rebalancierung noch nicht implementiert.* | |
| **6** | **Warnung «politisch umstritten» + Bereichsanzeige** — plausiblen Urteilsbereich anzeigen, nicht nur Punktschätzung, bei umstrittenen Behauptungen | Hoch (langfristig) | <span style="color:#e65100">**Hoch**</span> — epistemische Ehrlichkeit | <span style="color:#e65100">**Offen**</span> |
|   |   |   | *[FH 19.02.2026] Noch nicht begonnen.* | |

---

## 6. Referenzen

### Das Paper
- Stammbach et al. (2024). Aligning LLMs with Diverse Political Viewpoints. EMNLP 2024. [ACL Anthology](https://aclanthology.org/2024.emnlp-main.412/) | [arXiv](https://arxiv.org/abs/2406.14155) | [Code](https://github.com/dominiksinsaarland/swiss_alignment)

### Ash-Gruppe — Faktenprüfung & Behauptungen
- Climinator — [Link](https://www.nature.com/articles/s44168-025-00215-8) | AFaCTA — [Link](https://aclanthology.org/2024.acl-long.104/) | KB Choice — [ACM](https://dl.acm.org/doi/10.1145/3561389)

### Ash-Gruppe — Politische Verzerrung & Medien
- BallotBot — [SSRN](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5168217) | Media Slant — [SSRN](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3712218) | Emotion & Reason — [Link](https://academic.oup.com/ej/article/132/643/1037/6490125)

### Ash-Gruppe — Verzerrungserkennung & Alignment
- Indian Judiciary Bias — [Link](https://direct.mit.edu/rest/article-abstract/doi/10.1162/rest_a_01569/128265) | vBoN — [arXiv](https://arxiv.org/abs/2407.06057) | Apertus (2025) | LePaRD (ACL 2024)

### Personen
- Elliott Ash: [elliottash.com](https://elliottash.com/) | [ETH Zürich](https://lawecon.ethz.ch/group/professors/ash.html)
- Dominik Stammbach: [Princeton CITP](https://citp.princeton.edu/people/dominik-stammbach/) | [Persönliche Seite](https://dominik-stammbach.github.io/)
