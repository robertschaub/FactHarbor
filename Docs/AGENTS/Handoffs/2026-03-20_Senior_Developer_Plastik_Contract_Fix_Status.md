# 2026-03-20 Senior Developer Handoff — Plastik Contract Fix Status

**Task:** Give Captain Deputy a decision-ready summary of the Plastik quality investigation, the new Stage 1 contract fix, the validation results, and the next recommended actions.

**Files touched:**  
- `Docs/WIP/2026-03-19_Report_Quality_Evolution_Investigation.md`  
- `Docs/WIP/README.md`  
- `Docs/WIP/2026-03-20_Broad_Claim_Contract_Validator_Plan.md`  
- `Docs/AGENTS/Agent_Outputs.md`

## Ausgangslage

Plastik war zuletzt der größte offene Qualitätsblocker auf `main`.

Vor dem neuesten Fix war die Lage:
- die Familie schwankte auf demselben Stack stark
- exakte Inputs wie
  - `Plastik recycling bringt nichts`
  - `Plastic recycling is pointless`
  kippten zwischen `MOSTLY-FALSE`, `MIXED`, `LEANING-TRUE` und teils noch höher
- die schlechten Runs drifteten im Claim-Contract weg vom ursprünglichen breiten evaluativen Prädikat und wurden zu engeren Proxy-Claims wie:
  - effectiveness
  - viability
  - profitability
  - technical feasibility

Wichtige Zwischenbefunde:
- B1 (`Predicate preservation` + `No proxy rephrasing`) half bereits, war aber nicht robust genug
- der diagnostische Batch zeigte dann klar:
  - **exakte colloquial phrasings** (`bringt nichts`, `is pointless`) waren am instabilsten
  - nahe Paraphrasen (`bringt keinen Nutzen`, `brings no real benefit`) waren bereits deutlich stabiler
  - FR lag stabiler im false-ish Bereich als EN

Schluss vor dem neuen Fix:
- der Restfehler war nicht mehr „nur Englisch“
- und auch nicht mehr „nur Retrieval-Rauschen“
- sondern vor allem fehlende robuste **claim-contract preservation** für breite umgangssprachliche Evaluationsprädikate

## Problem

Die Pipeline stellte bei breiten evaluativen Inputs oft **die falsche Frage**.

Statt den ursprünglichen Claim treu in neutrale Dimensionen zu zerlegen, wurden daraus Proxy-Claims, zum Beispiel:
- „ineffective in terms of environmental impact“
- „economically unviable“
- „technical feasibility“

Das erzeugte Kaskadeneffekte:
- Search Queries drifteten
- Evidence Allocation driftete
- Verdict Direction driftete

## Was geändert wurde

Ein neuer LLM-basierter **Claim Contract Validator** wurde implementiert.

### Architektur

Einbau-Stelle:
- nach Stage 1 Pass 2
- vor Gate 1

Verhalten:
- validiert, ob die extrahierten Claims die **ursprüngliche evaluative Bedeutung** erhalten
- erlaubt nur **neutrale Dimensionsqualifikation**
- erkennt **Proxy-Drift**
- triggert bei materiellem Drift **einen einmaligen Pass-2-Retry**
- läuft **fail-open** bei technischem Fehler

### Implementierte Teile

- neue Prompt-Section: `CLAIM_CONTRACT_VALIDATION`
- neue UCM-Config:
  - `claimContractValidation.enabled`
  - `claimContractValidation.maxRetries`
- neue Validator-Funktion im Pipeline-Code
- einmaliger Retry-Pfad
- Tests + Build grün

### Designabsicht

Wichtig:
- keine deterministischen Sprachregeln
- keine Hardcodings auf Plastik oder bestimmte Begriffe
- rein generischer LLM-Guardrail für broad evaluative claim preservation

## Ergebnisse

### Struktur-Validation auf aktuellem `main`

Fünf gezielte Validierungsruns wurden nach der Implementierung ausgeführt:

| Input | Verdict | Truth | Conf | Predicate erhalten? |
|---|---:|---:|---:|---|
| DE: `Plastik recycling bringt nichts` | `MIXED` | 43 | 65 | ja |
| EN: `Plastic recycling is pointless` | `MIXED` | 54 | 72 | ja |
| DE: `Plastikrecycling bringt keinen Nutzen` | `LEANING-FALSE` | 39 | 76 | ja |
| EN: `Plastic recycling brings no real benefit` | `MOSTLY-TRUE` | 74 | 64 | ja |
| FR: `Le recyclage du plastique ne sert à rien` | `LEANING-TRUE` | 69 | 68 | ja |

### Wichtigster Befund

**5/5 Predicate Preservation sauber.**

Kein Proxy-Drift mehr in diesem Validierungsset:
- kein `is ineffective` als Ersatz
- kein `is not viable` als Ersatz
- kein `does not contribute` als Ersatz

Das bedeutet:
- das bisherige Stage-1-Hauptproblem ist **strukturell gelöst**
- die Pipeline analysiert jetzt deutlich konsistenter **den richtigen Claim**

## Schlussfolgerung

Der primäre Plastik-Blocker hat sich verschoben.

Vorher:
- Stage 1 Claim-Contract / Decomposition war der Hauptfehler

Jetzt:
- Stage 1 Contract Preservation ist weitgehend repariert
- die verbleibende Varianz ist **downstream**

Die neue Lage ist:

> Broad evaluative claim-contract preservation for Plastik-like inputs is now materially fixed on current `main`. The remaining instability is downstream of Stage 1 extraction.

Das heißt praktisch:
- Verdict-Streuung ist noch da
- aber sie kommt jetzt nicht mehr primär daher, dass die Pipeline die falsche semantische Frage stellt

## Was Captain Deputy daraus ableiten sollte

### Was jetzt **nicht** mehr Priorität 1 ist

- noch mehr Stage-1-Prompt-Regeln für Plastik
- erneute Debatte, ob das Hauptproblem noch immer die Decomposition selbst ist
- weitere breite Old-Worktree-Vergleiche

### Was jetzt **Priorität 1** sein sollte

Ein gezielter Follow-up auf die **downstream instability**:
- Search Query Framing
- Evidence Allocation / Evidence Balance
- Boundary concentration
- Verdict grounding / direction consistency

## Empfohlene nächste Aktionen

1. **Downstream Plastik Analyse starten**
   Vergleiche die fünf validator-era Runs direkt auf:
   - Search Queries
   - Evidence Balance
   - Boundary concentration
   - Verdict warnings
   - ClaimVerdict distributions

2. **Stage 1 vorerst stabil lassen**
   Die neue Validator-Schicht nicht sofort wieder umbauen, solange keine neue Evidenz gegen sie spricht.

3. **Config provenance weiter hoch priorisieren**
   Nicht weil sie das Verdict ändert, sondern weil die nächste Untersuchungsrunde sonst wieder schwerer auditierbar wird.

4. **Optional danach: frozen-retrieval Vergleich**
   Falls Captain Deputy eine saubere Trennung von Retrieval- und Verdict-Effekten will.

## Warnings

- „Problem gelöst“ wäre zu stark.  
  Richtig ist:
  - **Stage 1 claim-contract issue materially fixed**
  - **remaining verdict variance still open**

- Diese Einschätzung gilt für den aktuellen `main`-Stand, nicht als allgemeines Urteil über alte Worktrees.

## For next agent

Lies zuerst:
- `Docs/WIP/2026-03-19_Report_Quality_Evolution_Investigation.md`
  - besonders `10.3` und `10.4`
- `Docs/WIP/2026-03-20_Broad_Claim_Contract_Validator_Plan.md`

Wenn du direkt weitermachst, dann nicht noch einmal bei Claim Decomposition einsteigen, sondern eine kurze Note oder Implementierungsplanung für:
- Search / evidence / verdict stabilization after contract preservation

**Learnings:** no
