# LLM-Grundwissen — Kompakt-Referenz

**Für:** Meeting-Vorbereitung Schimanski (18. März 2026)
**Niveau:** Praxisorientiert, nicht akademisch. Du musst es nicht mathematisch erklären — aber verstehen, wovon Tobias spricht.

---

## A: LLM-Grundlagen

### A1. Foundation Model vs Fine-Tuned Model *(dein Wissen: gut)*

Deine Antwort war korrekt. Ergänzung:

- **Foundation Model** = auf riesigem Textkorpus trainiert (Internet, Bücher, Code). Kann "alles ein bisschen". GPT-4 base, Claude base, Llama base.
- **Fine-Tuning** = das Foundation Model wird mit spezifischen Daten weitertrainiert. Wie ein Generalist-Arzt, der eine Facharzt-Ausbildung macht.
- **Wichtig für das Meeting:** Tobias' DIRAS fine-tuned ein Llama-3-8B auf Relevanz-Scoring-Daten. Das Ergebnis: ein kleines Modell das bei *dieser einen Aufgabe* so gut ist wie GPT-4, aber 100x billiger läuft.

### A2. Tokens *(Richtung stimmt, Detail-Korrektur)*

Tokens sind **nicht** mehrere Wörter zusammen — eher umgekehrt:

- Ein Token ≈ **0.75 Wörter** (im Englischen). "FactHarbor" = 3 Tokens ("Fact", "Har", "bor")
- Häufige Wörter = 1 Token ("the", "ist", "and")
- Seltene/lange Wörter werden in Teile zerlegt
- **Warum Tokens statt Wörter?** Weil das Modell intern mit einer festen Vokabular-Tabelle arbeitet (~100K Einträge). Subword-Tokenisierung ist der Kompromiss zwischen "jeder Buchstabe einzeln" (zu langsam) und "jedes Wort einzeln" (Vokabular wäre unendlich gross).
- **Praxis:** Du zahlst pro Token. FactHarbor verbraucht ~40-50K Tokens pro Analyse. Deshalb ist Tobias' Distillation-Ansatz (kleines lokales Modell) finanziell interessant.

### A3. Temperature

**Temperature** steuert die **Zufälligkeit** der Wortauswahl:

| Temperature | Verhalten | Analogie |
|-------------|-----------|----------|
| **0** | Immer das wahrscheinlichste nächste Token. Deterministisch, reproduzierbar. | Buchhalter — immer die sicherste Antwort |
| **0.3-0.7** | Etwas Variation, aber meist vernünftig | Erfahrener Mitarbeiter — meist vorhersagbar, manchmal kreativ |
| **1.0** | Viel Variation, kreativ, aber auch mehr Unsinn | Brainstorming-Session — viele Ideen, nicht alle gut |
| **>1.0** | Sehr zufällig, oft unbrauchbar | Betrunkener Poet |

**Für das Meeting relevant:** DIRAS nutzt Temperature=0 für Annotation — weil Reproduzierbarkeit wichtig ist. FactHarbor nutzt niedrige Temperature für Verdicts (Konsistenz) und könnte höhere für Advocate-Diversität nutzen.

### A4. Chain-of-Thought (CoT) Prompting

**Was:** Du bittest das LLM, **Schritt für Schritt zu denken** bevor es antwortet.

Ohne CoT:
> "Ist die Aussage korrekt?" → "Ja"

Mit CoT:
> "Denke Schritt für Schritt nach:" → "Erstens... Zweitens... Drittens... → Deshalb: Ja"

**Warum es funktioniert:** Das LLM generiert Token für Token. Wenn es "Schritt 1" schreibt, hat es beim Generieren von "Schritt 2" den Kontext von Schritt 1 schon im Blick. Die Zwischenschritte sind wie Notizzettel für das Modell selbst.

**Wichtig für das Meeting:** DIRAS fand, dass CoT bei **Relevanz-Annotation schadet** — das Modell "überdenkt" und wird schlechter kalibriert. Das ist kontraintuitiv und ein guter Gesprächspunkt. Aber Vorsicht: das gilt spezifisch für Bewertungsaufgaben, nicht generell.

### A5. Halluzination *(Kernidee stimmt, Mechanismus präziser)*

Deine Intuition ist richtig, aber der Mechanismus ist spezifischer:

- Ein LLM **sucht nicht** nach Informationen — es **generiert** das statistisch wahrscheinlichste nächste Token, basierend auf Mustern im Training.
- Wenn die Trainingsdaten keine gute Antwort enthalten, generiert das Modell trotzdem fliessenden, überzeugenden Text — weil es darauf trainiert ist, *immer* kohärent zu antworten.
- **Halluzination = das Modell erfindet plausibel klingende Fakten**, nicht weil es "schlecht sucht", sondern weil es gar nicht sucht. Es *erzeugt*.
- **Warum das für FactHarbor kritisch ist:** Deshalb RAG (C1) — wir geben dem LLM echte Quellen, damit es nicht erfinden muss. Und deshalb Grounding Checks — wir prüfen, ob das Verdict wirklich aus den gegebenen Evidenzen folgt.

---

## B: Architektur & Training

### B1. Transformer

**In einem Satz:** Der Transformer ist die neuronale Netzwerk-Architektur hinter allen modernen LLMs — er verarbeitet Text **parallel** (nicht Wort für Wort) und nutzt "Attention" um zu verstehen, welche Wörter im Satz sich aufeinander beziehen.

**Analogie:** Stell dir vor, du liest einen Vertrag. Alte Architektur (RNN) = du liest Wort für Wort von links nach rechts. Transformer = du siehst den ganzen Absatz gleichzeitig und dein Blick springt automatisch zwischen zusammengehörigen Stellen.

**Paper-Referenz:** "Attention Is All You Need" (Google, 2017) — das Paper das alles gestartet hat.

### B2. Attention (Self-Attention)

**Was:** Ein Mechanismus, der für jedes Token berechnet: **"Wie wichtig ist jedes andere Token im Kontext für mich?"**

**Beispiel:** Im Satz *"Die Bank am Fluss war nass"*:
- Für das Wort "Bank" berechnet Attention hohe Gewichte für "Fluss" und "nass" → erkennt: Sitzbank, nicht Geldinstitut.
- Ohne Attention müsste das Modell sich auf die Position im Satz verlassen.

**Warum Durchbruch:** Vor Transformern (2017) hatten Modelle ein "Gedächtnisproblem" — bei langen Texten vergassen sie den Anfang. Attention erlaubt direkte Verbindungen zwischen beliebig weit entfernten Wörtern.

**Für das Meeting relevant:** Die "Context Window"-Grösse von LLMs (z.B. 200K Tokens bei Claude) bestimmt, wie viel Text das Modell gleichzeitig "sehen" kann. FactHarbor stopft Evidenz + Prompts in dieses Fenster.

### B3. RLHF *(dein Wissen: richtig, aber unvollständig)*

Deine Antwort ("an menschliches Kommunikationsverhalten anpassen") ist korrekt — aber RLHF macht mehr:

**Drei Trainingsschritte eines Chat-LLMs:**

```
1. Pre-Training     → "Lese das Internet" → Sprachverständnis, Weltwissen
                       (Milliarden Parameter, Wochen auf GPU-Clustern)

2. Instruction      → "Folge Anweisungen" → Aus Frage-Antwort-Paaren lernen
   Fine-Tuning         (Tausende kuratierte Beispiele)

3. RLHF            → "Sei hilfreich UND sicher" → Menschen bewerten Antworten,
                       Modell lernt was "gut" bedeutet
                       (Belohnungsmodell + Reinforcement Learning)
```

**Was RLHF spezifisch tut:**
- Menschen vergleichen zwei Antworten und sagen welche besser ist
- Daraus wird ein "Belohnungsmodell" trainiert (was ist eine gute Antwort?)
- Das LLM wird dann optimiert, um hohe Belohnungen zu bekommen
- **Ergebnis:** Das Modell lehnt gefährliche Anfragen ab, gibt ausgewogene Antworten, sagt "ich weiss es nicht" statt zu halluzinieren (manchmal)

**Für das Meeting:** Tobias' Fine-Tuning (DIRAS, ACL 2024) ist Schritt 2 — kein RLHF nötig, weil die Aufgabe klar definiert ist (Relevanz-Score, nicht offener Dialog).

### B4. Pre-Training vs Inference

| | Pre-Training | Inference |
|---|---|---|
| **Was** | Modell **lernt** aus Daten | Modell **antwortet** auf Anfragen |
| **Wann** | Einmal (Wochen/Monate) | Jede Anfrage (Millisekunden-Sekunden) |
| **Kosten** | $10M-$100M+ (GPT-4 Training) | $0.001-$0.10 pro Anfrage |
| **Hardware** | Tausende GPUs | Eine oder wenige GPUs |
| **Analogie** | Medizinstudium (6 Jahre) | Patient behandeln (30 Minuten) |

**Für FactHarbor:** Du zahlst nur Inference-Kosten (~$0.50-2 pro Analyse). Pre-Training hat Anthropic/OpenAI gemacht. Fine-Tuning (wie Tobias es vorschlägt) liegt dazwischen: einmalig $100-1000, dann günstige Inference.

### B5. Knowledge Distillation

**Was:** Ein grosses, teures Modell (der "Lehrer") erzeugt Trainingsdaten, mit denen ein kleines, billiges Modell (der "Schüler") trainiert wird.

```
GPT-4 (Lehrer)                    Llama-3-8B (Schüler)
━━━━━━━━━━━━━━                    ━━━━━━━━━━━━━━━━━━━━
Sehr schlau                        Schnell + billig
Langsam + teuer ($$$)              Nach Distillation: fast so schlau
                                   wie der Lehrer — FÜR DIESE AUFGABE
        │                                    ▲
        │    Annotierte Daten                │
        └────────────────────────────────────┘
         "So bewertet der Lehrer
          diese 10'000 Beispiele"
```

**Analogie:** Ein Meisterkoch (GPT-4) kocht 1000 Rezepte vor und schreibt für jedes auf: "Dieses Gericht ist 8/10". Ein Lehrling (8B-Modell) lernt aus diesen Bewertungen. Am Ende kann der Lehrling Gerichte fast so gut bewerten wie der Meister — obwohl er selbst kein Meisterkoch ist.

**Für das Meeting:** Das ist der Kern von DIRAS. GPT-4 annotiert Relevanz-Scores für Dokumente. Llama-3-8B lernt daraus. Ergebnis: 8B-Modell erreicht GPT-4-Qualität bei Relevanz-Scoring, zum Bruchteil der Kosten. Für FactHarbor könnte das heissen: probativeValue-Scoring lokal laufen lassen statt pro Anfrage bei Anthropic zu bezahlen.

---

## C: Retrieval & Evaluation

### C1. RAG (Retrieval Augmented Generation)

**Was:** Statt das LLM aus dem "Kopf" (Trainingswissen) antworten zu lassen, gibst du ihm **aktuelle, relevante Dokumente mit** und sagst: "Antworte basierend auf DIESEN Texten."

```
OHNE RAG:                          MIT RAG:
User: "Stimmt Behauptung X?"       User: "Stimmt Behauptung X?"
                                    System: [sucht im Web, findet 5 Quellen]
LLM: denkt nach...                 LLM: liest Quellen + denkt nach...
     (Trainingswissen, evtl.            (basiert auf echten Dokumenten)
      veraltet, evtl. halluziniert)
Antwort: "Ja, weil..." (vielleicht  Antwort: "Ja, weil Quelle 3 sagt..."
         erfunden)                          (nachprüfbar!)
```

**Warum RAG:**
1. LLM-Wissen ist **veraltet** (Trainingsdaten haben ein Enddatum)
2. LLM **halluziniert** ohne Quellen (siehe A5)
3. RAG macht Antworten **nachprüfbar** — du siehst die Quellen

**FactHarbor IST ein RAG-System.** Deine Pipeline: Web-Suche (Retrieval) → Evidenz-Extraktion → LLM-Verdict (Generation). Du weisst das — du hast es gebaut. Jetzt hast du den Fachbegriff.

**Für das Meeting:** Tobias' DIRAS-Paper verbessert den "R"-Teil von RAG — wie misst man, ob die richtigen Dokumente gefunden werden? Das ist direkt FactHarbors Evidenz-Qualitäts-Problem.

### C2. NLI (Natural Language Inference)

**Was:** Ein Modell das entscheidet: **Folgt Satz B logisch aus Satz A?**

Drei mögliche Ergebnisse:

| Ergebnis | Bedeutung | Beispiel |
|----------|-----------|---------|
| **Entailment** | B folgt aus A | A: "Der Hund ist im Garten" → B: "Ein Tier ist draussen" ✅ |
| **Contradiction** | B widerspricht A | A: "Der Hund ist im Garten" → B: "Kein Tier ist draussen" ❌ |
| **Neutral** | B hat nichts mit A zu tun | A: "Der Hund ist im Garten" → B: "Es ist Dienstag" ➖ |

**Für das Meeting:** Tobias nutzt NLI in seinem ACL 2024 Paper, um zu prüfen ob eine Antwort wirklich aus der zitierten Quelle folgt ("Answer Attributability"). Das ist exakt was FactHarbors Grounding Check tut — aber informell via LLM-Prompt. NLI-Modelle sind formaler und schneller. Frage an Tobias: "Wäre ein NLI-Modell rigoroser als unser LLM-basierter Grounding Check?"

### C3. Calibration *(deine Antwort war nicht korrekt — hier die Richtigstellung)*

Calibration hat nichts mit der "Wissensbasis" zu tun. Es bedeutet:

**Wenn ein Modell sagt "Ich bin 80% sicher", sollte es in 80% der Fälle richtig liegen.**

| Modell sagt | Tatsächlich korrekt | Calibration |
|-------------|--------------------|----|
| "90% sicher" | 90 von 100 richtig | Perfekt kalibriert ✅ |
| "90% sicher" | 60 von 100 richtig | Overconfident ❌ |
| "90% sicher" | 99 von 100 richtig | Underconfident (aber harmloser) |

**Analogie:** Ein Wetterdienst sagt "80% Regenwahrscheinlichkeit". Wenn es bei dieser Vorhersage in 80% der Fälle tatsächlich regnet, ist er gut kalibriert. Wenn er immer "80%" sagt aber es regnet nur in 50% der Fälle — schlecht kalibriert.

**Warum das wichtig ist:**
- FactHarbor gibt Confidence-Scores bei Verdicts (HIGH/MEDIUM/LOW)
- Wenn "HIGH Confidence" in 50% der Fälle falsch ist, sind die Scores wertlos
- DIRAS zeigt: das 8B-Modell ist *besser kalibriert* als GPT-4 (91.35 vs 91.10)

**Für das Meeting:** Wenn Tobias von "well-calibrated confidence scores" spricht, meint er: die Scores entsprechen der tatsächlichen Trefferquote. Das ist eine seiner Stärken — und eine Lücke bei FactHarbor (wir messen nicht, wie gut unsere Confidence kalibriert ist).

### C4. LoRA (Low-Rank Adaptation)

**Was:** Eine **effiziente Fine-Tuning-Methode** — statt alle Milliarden Parameter eines Modells zu ändern, änderst du nur eine kleine "Zusatzschicht".

```
Normales Fine-Tuning:              LoRA Fine-Tuning:
━━━━━━━━━━━━━━━━━━━━              ━━━━━━━━━━━━━━━━━━
Alle 8 Milliarden                  Original-Modell EINGEFROREN
Parameter ändern                   + kleine Adapter-Matrix (~0.1%)

GPU: 8x A100 (>$100K)             GPU: 1x A100 (~$15K) oder Cloud
Zeit: Tage                        Zeit: Stunden
Kosten: $$$                       Kosten: $
```

**Analogie:** Statt ein ganzes Gebäude umzubauen (normales Fine-Tuning), baust du nur einen Anbau (LoRA). Das Ergebnis für spezifische Aufgaben ist fast gleich gut.

**Für das Meeting:** Tobias nutzt LoRA um Llama-3-8B auf Relevanz-Scoring zu spezialisieren. Wenn FactHarbor einen eigenen Evidenz-Scorer trainieren wollte, wäre LoRA der Weg — machbar auf einem einzelnen GPU, Kosten <$100 für Cloud-Training.

### C5. nDCG (normalized Discounted Cumulative Gain)

**Was:** Eine Metrik die misst: **Wie gut ist eine Rangfolge?** — nicht nur ob die richtigen Ergebnisse dabei sind, sondern ob sie **oben** stehen.

**Intuition:**
```
Perfekte Rangfolge (nDCG = 1.0):   Schlechte Rangfolge (nDCG = 0.4):
1. ⭐ Sehr relevant                1. ➖ Irrelevant
2. ⭐ Sehr relevant                2. ➖ Irrelevant
3. ⭐ Relevant                     3. ⭐ Sehr relevant  ← zu spät!
4. ➖ Irrelevant                   4. ⭐ Sehr relevant  ← zu spät!
5. ➖ Irrelevant                   5. ➖ Irrelevant
```

**Warum "Discounted":** Ergebnisse weiter unten zählen weniger. Position 1 ist wichtiger als Position 10 — weil Nutzer (oder Pipelines) die oberen Ergebnisse zuerst sehen.

**Warum "Normalized":** Score wird auf 0-1 normalisiert, damit man verschiedene Anfragen vergleichen kann.

**Für das Meeting:** Wenn Tobias sagt "Llama-3 erreicht nDCG 77.23 auf ClimRetrieve", meint er: das Modell sortiert relevante Dokumente fast so gut an die Spitze wie ein perfektes Ranking. Du musst nDCG nicht berechnen können — nur verstehen dass höher = besseres Ranking.

---

## Lernressourcen (kompakt, hohe Qualität)

### Videos (nach Priorität)

| Thema | Video | Dauer | Warum |
|-------|-------|-------|-------|
| **Transformer + Attention** | 3Blue1Brown: "But what is a GPT? Visual intro to transformers" (YouTube) | 27 Min. | Beste visuelle Erklärung die es gibt. Keine Vorkenntnisse nötig. |
| **Transformer Teil 2** | 3Blue1Brown: "Attention in transformers, visually explained" (YouTube) | 26 Min. | Vertieft Attention. Optional aber empfohlen. |
| **RAG** | IBM Technology: "What is Retrieval-Augmented Generation (RAG)?" (YouTube) | 8 Min. | Kurz, klar, geschäftsrelevant. |
| **Fine-Tuning + LoRA** | IBM Technology: "What is LoRA?" (YouTube) | 9 Min. | Genau richtig für dein Niveau. |
| **RLHF** | Robert Miles / Computerphile: "RLHF - How ChatGPT is Trained" (YouTube) | 12 Min. | Gut erklärt, nicht zu technisch. |

**Minimum für das Meeting:** Die beiden 3Blue1Brown-Videos (53 Min. total). Die geben dir das intuitive Verständnis für Transformer/Attention das alle anderen Konzepte verknüpft.

### Texte (falls du lieber liest)

| Thema | Ressource | Aufwand |
|-------|-----------|---------|
| **Alles zusammen** | "What Are Large Language Models?" — Anthropic (anthropic.com/research) | 15 Min. |
| **RAG im Detail** | "Retrieval Augmented Generation" — AWS Documentation | 10 Min. |
| **Calibration** | Wikipedia: "Calibration (statistics)" — nur Abschnitt "In classification" | 5 Min. |

---

## Spickzettel fürs Meeting

Falls Tobias diese Begriffe benutzt — hier die Ein-Satz-Übersetzung:

| Er sagt | Du verstehst |
|---------|-------------|
| "Knowledge distillation" | Grosses Modell erzeugt Trainingsdaten für kleines Modell |
| "Fine-tuning with LoRA" | Effizientes Spezialisten-Training, nur kleine Zusatzschicht |
| "Well-calibrated" | Confidence-Scores entsprechen tatsächlicher Trefferquote |
| "RAG pipeline" | Suche + LLM-Antwort basierend auf gefundenen Dokumenten |
| "NLI-based entailment" | Formale Prüfung ob Aussage B aus Quelle A folgt |
| "nDCG" | Ranking-Qualität: sind die besten Ergebnisse oben? |
| "CoT prompting" | LLM zum Schritt-für-Schritt-Denken auffordern |
| "Selection bias" | Systematische Verzerrung durch das was man NICHT in den Daten hat |
| "Pointwise annotation" | Jedes Dokument einzeln bewerten (vs. Liste vergleichen) |
| "Teacher-student setup" | = Knowledge Distillation |
| "Inference cost" | Kosten pro LLM-Aufruf (nicht Training) |
| "Relevance definition" | Explizite Beschreibung was "relevant" für DIESE Frage bedeutet |
| "Attributability" | Kann man die Antwort auf die zitierte Quelle zurückführen? |
| "ECE / Brier score" | Metriken für Calibration-Qualität (tiefere = besser kalibriert) |
