# Faktencheck-Landschaft Schweiz — Tools, Akteure, Kontakte

**Erstellt:** 2026-03-27
**Zweck:** Marktrecherche fur FactHarbor — wer pruft Fakten in der Schweiz, mit welchen Tools, und wer konnte an FactHarbor interessiert sein?

---

## 1. Kernbefund

Die Schweiz hat **kein Aquivalent zu CORRECTIV (DE), Full Fact (UK) oder AFP Fact Check (FR)**. Es gibt keine dedizierte, IFCN-zertifizierte Faktencheck-Organisation. Stattdessen:

- Verifikation liegt bei einzelnen Journalisten und Dokumentationsabteilungen
- Die meisten Redaktionen nutzen **frei verfugbare OSINT-Tools** (InVID, Reverse Image Search, Bellingcat)
- **Keystone-SDA** bietet die strukturierteste Schulungsinfrastruktur (mit dpa/Google)
- **SRF** hat das grosste interne Netzwerk (~15 Personen)
- **swissinfo.ch** hat das einzige systematische offentliche Faktencheck-Format

> *"Factcheckers dedicated solely to the verification of stories before publication are a rare breed in Switzerland."* — [swissinfo.ch](https://swissinfo.ch/eng/reportagen-festival_how-a-media-industry-under-pressure-does-verification/45190226)

---

## 2. Redaktionen im Detail

### SRF (Schweizer Radio und Fernsehen)

- **[Netzwerk Faktencheck](https://publizistische-leitlinien.srf.ch/index/netzwerk-faktencheck/)** seit 2017, ~15 Mitglieder (Nebenfunktion)
- Falsifizierungsprinzip, Zusammenarbeit mit Dokumentation & Archiv (D+A)
- Publizieren unter [srf.ch/news/srf-faktenchecks](https://www.srf.ch/news/srf-faktenchecks)
- **Leitung:** Melanie Komle
- **Schlussel-Person:** [Fiona Endres](https://fionaendres.ch) (Co-Leiterin SRF Investigativ, OSINT-Trainerin MAZ, investigativ.ch Vorstand)
- **Tools:** Bilder-Ruckwartssuche, Google Maps/Earth, [Bellingcat Toolkit](https://bellingcat.gitbook.io/toolkit), [InVID-WeVerify](https://chromewebstore.google.com/detail/fake-news-debunker-invid/mhccpoafgdgbhnjfhkcmgknndkeenfhe), EXIF-Analyse
- **Herausforderung 2025:** KI-Deepfakes erschweren Verifikation zunehmend

### Keystone-SDA (Nachrichtenagentur)

- **[Faktencheck-Schulungen](https://www.keystone-sda.ch/en/w/faktencheck25)** seit 2022 (jahrlich: 22/23/24/25)
- Partnerschaft mit **dpa**, finanziert durch **Google News Initiative**
- **Kostenlos** fur Schweizer Medienschaffende
- **Verification Officer:** [Catherine Gilbert](https://ch.linkedin.com/in/catherine-gilbert-087684156) — factchecking@keystone-sda.ch
- **Schulungsinhalte:** Reverse Image Search, Video-Verifikation, Telegram/Instagram/TikTok-Recherche, Deepfake-Erkennung

### NZZ (Neue Zurcher Zeitung)

- **[OSINT-Team](https://www.nzz.ch/folio/ausgabe-mai-2025/digitale-spurensuche-verifikation-fact-check-stimmt-das-denn-ld.1879867)** — wachsendes Team fur digitale Recherche
- **Team Lead OSINT:** [Jan Ludwig](https://www.linkedin.com/in/jan-ludwig-8bb304221/) (ex-dpa OSINT-Trainer, ex-Washington Post Visual Forensics)
- **OSINT-Reporterin:** [Jessica Eberhart](https://www.nzz.ch/impressum/jessica-eberhart-ld.1825715) (HSG/ETH Sicherheitspolitik)
- **Tools:** Google Images, [Fotoforensics](https://fotoforensics.com), EXIF Photo-Search
- **Kooperation:** [MAZ-Weiterbildungsoffensive](https://www.maz.ch/news/das-maz-ist-partner-der-nzz-weiterbildungsoffensive)

### Tamedia / TX Group (Tages-Anzeiger, 20 Minuten, SonntagsZeitung)

- **Kein offentlich dokumentiertes Faktencheck-Team**
- Qualitatshandbuch 2024 mit KI-Grundsatzen
- Das Magazin: Faktencheck durch Korrektorat (klassisches Gegenlesen)
- [Interaktiv-Team](https://interaktiv.tagesanzeiger.ch/): Datenvisualisierung, kein Faktencheck
- **KI-Strategie:** AI & Data Unit direkt unter CEO Jessica Peppel-Schulz
- **Kontakt:** kommunikation@tamedia.ch

### Ringier (Blick, Sonntagsblick)

- **Kein dediziertes Faktencheck-Team**
- **[KI-Richtlinien](https://www.ringier.com/de/ringier-fuehrt-klare-richtlinien-fuer-den-einsatz-kuenstlicher-intelligenz-ein/)** (2023): Pflicht zur Verifikation von KI-Ergebnissen
- **[AI Innovation Lead Newsroom](https://www.ringier.com/de/thomas-benkoe-wird-ai-innovation-lead-newsroom/):** Thomas Benko (seit Sept. 2024)
- **[Chief Innovation & AI Officer](https://www.ringier.com/de/petra-ehmann-leitet-als-chief-innovation-ai-officer-globale-kuenstliche-intelligenz-initiativen-der-ringier-gruppe/):** Petra Ehmann (direkt an CEO Marc Walder)
- **Palantir-Partnerschaft** seit 2018 (KI-Plattform, primarer Geschaftsoptimierung)

### CH Media (Aargauer Zeitung, Luzerner Zeitung, watson.ch)

- **Kein offentlich dokumentiertes Faktencheck-Team**
- **[watson.ch](https://www.watson.ch/Faktencheck/)** hat eine Faktencheck-Rubrik (gelegentliche redaktionelle Beitrage)
- watson Chefredaktorin: Nadine Sommerhalder

### SWI swissinfo.ch

- **[Einziges systematisches Faktencheck-Format](https://www.swissinfo.ch/eng/in-depth/fact-checks-by-swissinfo-ch)** der Schweiz
- Fokus: Abstimmungskampf-Aussagen und prominente Persoenlichkeiten
- Nur offentliche Quellen + on-the-record Experten
- Beteiligt am EU-Projekt **Pheme** (automatisierte Verifikation)
- **Chefredaktor:** Mark Livingston
- **Head of Audience:** Veronica De Vore
- **Head of Editors:** Virginie Mangin
- **Kontakt:** [swissinfo.ch/kontakt](https://www.swissinfo.ch/ger/kontakt/)

### Republik

- Gelegentliche Faktenchecks als Teil der Berichterstattung
- **Codebase ist [Open Source](https://github.com/republik/plattform)**
- **Technologie-Leiterin:** [Sharon Funke](https://www.republik.ch/~sfunke) (ex-NZZ Editorial Tech)
- **Kontakt:** kontakt@republik.ch

### RTS / RSI (Romandie / Tessin)

- Teil der SRG-Struktur, nutzen vermutlich SRF-Netzwerk-Ressourcen
- Keine eigenen offentlich dokumentierten Faktencheck-Tools

---

## 3. Tools in Schweizer Redaktionen

### Nachgewiesen im Einsatz

| Tool | Typ | Genutzt von |
|------|-----|-------------|
| **[InVID-WeVerify Plugin](https://chromewebstore.google.com/detail/fake-news-debunker-invid/mhccpoafgdgbhnjfhkcmgknndkeenfhe)** | Browser-Extension fur Bild/Video-Verifikation | SRF, Keystone-SDA |
| **Google Reverse Image Search** | Bildherkunft | SRF, NZZ, Keystone-SDA |
| **TinEye** | Reverse Image | SRF |
| **[Fotoforensics](https://fotoforensics.com)** | Metadaten + ELA-Analyse | NZZ |
| **EXIF-Metadaten-Tools** | Bildmetadaten | NZZ, SRF |
| **Google Maps / Earth** | Geolokation | SRF, MAZ-Kurse |
| **[Bellingcat Toolkit](https://bellingcat.gitbook.io/toolkit)** | OSINT-Sammlung | SRF, Keystone-SDA, MAZ |
| **Satellitenbilder** (Sentinel, Planet Labs) | Geoverifikation | MAZ OSINT-Kurse |
| **Wayback Machine** | Archivierte Webseiten | Standard OSINT |

### NICHT nachgewiesen in CH-Redaktionen

- ClaimBuster (automatische Claim-Erkennung)
- Full Fact Toolkit / Logically (AI-gestutzt)
- Google Fact Check Explorer (als redaktionelles Tool)
- Dedizierte Faktencheck-Software mit eigenem Backend

---

## 4. Weiterbildung und Infrastruktur

| Institution | Angebot | Relevanz |
|-------------|---------|----------|
| **[MAZ Luzern](https://www.maz.ch/kurs/recherche-und-verifikation-mit-osint)** | OSINT-Grundlagen + Vertiefungskurs (Leitung: Fiona Endres) | Zentrale CH-Journalismus-Ausbildung |
| **[Keystone-SDA Faktencheck25](https://www.keystone-sda.ch/en/w/faktencheck25)** | Jahrliche Schulung mit dpa (kostenlos) | Erreicht Medienschaffende aller CH-Hauser |
| **[investigativ.ch](https://investigativ.ch/ueber-uns/vorstand/)** | Recherche-Netzwerk, Weiterbildung | Vorstand deckt alle grossen Medienhaeuser ab |
| **[foeG UZH](https://www.foeg.uzh.ch)** | Forschung Medienqualitat | Akademische Evaluation |
| **ZHAW Winterthur** | "Radar Medienkritik Schweiz" | Wissenschaftliche Forschung |

---

## 5. Potentielle FactHarbor-Interessenten

### Tier 1 — Direktes Interesse wahrscheinlich

| Person | Rolle | Organisation | Kontakt |
|--------|-------|-------------|---------|
| **Catherine Gilbert** | OSINT Research (Freelance, since Feb 2026; ex-Verification Officer Keystone-SDA) | dpa Deutsche Presse-Agentur | [LinkedIn](https://ch.linkedin.com/in/catherine-gilbert-087684156) |
| **Jan Ludwig** | Team Lead OSINT | NZZ | [LinkedIn](https://www.linkedin.com/in/jan-ludwig-8bb304221/) |
| **Thomas Benko** | AI Innovation Lead Newsroom | Ringier/Blick | Via Ringier |

### Tier 2 — Strategisch wertvoll

| Person | Rolle | Organisation | Kontakt |
|--------|-------|-------------|---------|
| **Fiona Endres** | Co-Leiterin Investigativ | SRF / investigativ.ch | [LinkedIn](https://ch.linkedin.com/in/fiona-endres-760174101), [Website](https://fionaendres.ch) |
| **Mark Livingston** | Chefredaktor | swissinfo.ch | [Kontakt](https://www.swissinfo.ch/ger/kontakt/) |
| **Jessica Eberhart** | OSINT-Reporterin | NZZ | [NZZ Impressum](https://www.nzz.ch/impressum/jessica-eberhart-ld.1825715) |

### Tier 3 — Multiplikatoren

| Organisation | Warum relevant | Kontakt |
|-------------|---------------|---------|
| **[investigativ.ch Vorstand](https://investigativ.ch/ueber-uns/vorstand/)** | Erreicht alle grossen CH-Medienhaeuser | investigativ.ch |
| **[MAZ Luzern](https://www.maz.ch)** | Konnte FactHarbor in Schulungen integrieren | maz.ch |
| **Petra Ehmann** (Ringier CIAO) | Globale KI-Strategie | Via Ringier |

---

## 6. Marktlucke fur FactHarbor

Die Schweizer Medienlandschaft hat:
- **Kein automatisiertes Faktencheck-Tool** im Einsatz
- **Keine LLM-gestutzte Claim-Analyse** in irgendeiner Redaktion
- **Manuelle OSINT-Tools** als einzige systematische Methode
- **Steigende Herausforderung** durch KI-generierte Deepfakes und Desinformation
- **Begrenzte Personalressourcen** fur Faktencheck (Nebenfunktion, nicht Hauptaufgabe)

FactHarbor konnte als **erstes LLM-gestutztes Faktencheck-Tool fur Schweizer Redaktionen** positioniert werden — komplementar zu den bestehenden OSINT-Tools (Bild/Video-Verifikation), nicht als Ersatz.

---

*Basierend auf offentlich zuganglichen Quellen, LinkedIn-Profilen und Unternehmenswebsites. Stand: Marz 2026.*
