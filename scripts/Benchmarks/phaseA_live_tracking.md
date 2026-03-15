# Phase A: Search-Stack Drift Investigation — Live Tracking

**Started:** 2026-03-14 22:42 UTC

**Conditions:** C0=Control(auto-stop), C1=Serper-only, C2=SerpAPI-only, C3=Accumulation(worktree)

**Benchmarks:** B1_EN (Bolsonaro EN), B2_PT (Bolsonaro PT), B3_DE (Zürich school)

**Runs per condition:** 2

---

[2026-03-14 22:42 UTC] Phase A: Search-Stack Drift Investigation
[2026-03-14 22:42 UTC] Benchmarks: 3 inputs x 2 runs per condition
[2026-03-14 22:42 UTC] 
[1] Loading original search config from main...
[2026-03-14 22:42 UTC]     Original provider: auto | hash: 1da746e1ae6b...
[2026-03-14 22:42 UTC] 
[2] Disabling search cache for clean provider measurement...
[2026-03-14 22:42 UTC] 
======================================================================
[2026-03-14 22:42 UTC] CONDITION: C0_CONTROL
[2026-03-14 22:42 UTC] ======================================================================
[2026-03-14 22:42 UTC] 
  [B1_EN r1] Were the various Bolsonaro trials conducted in accordance with Brazili...
[2026-03-14 22:42 UTC]     Submitted: 8ff022d5
[2026-03-14 22:53 UTC]   C0_CONTROL   | B1_EN  r1 | job=8ff022d5 | score=141.9 truth= 50.1 conf= 44.4 ev= 53 pvh= 29 src= 20 | providers: Google-CSE
[2026-03-14 22:53 UTC] 
  [B1_EN r2] Were the various Bolsonaro trials conducted in accordance with Brazili...
[2026-03-14 22:53 UTC]     Submitted: bec2ccaf
[2026-03-14 23:04 UTC]   C0_CONTROL   | B1_EN  r2 | job=bec2ccaf | score=162.4 truth=   59 conf= 56.8 ev= 61 pvh= 32 src= 25 | providers: Google-CSE
[2026-03-14 23:04 UTC] 
  [B2_PT r1] Os julgamentos de Bolsonaro foram conduzidos de acordo com a lei brasi...
[2026-03-14 23:04 UTC]     Submitted: e4daa41f
[2026-03-14 23:16 UTC]   C0_CONTROL   | B2_PT  r1 | job=e4daa41f | score=127.4 truth=   47 conf=   57 ev= 44 pvh= 33 src= 16 | providers: Google-CSE
[2026-03-14 23:16 UTC] 
  [B2_PT r2] Os julgamentos de Bolsonaro foram conduzidos de acordo com a lei brasi...
[2026-03-14 23:16 UTC]     Submitted: 3c3b1511
[2026-03-14 23:28 UTC]   C0_CONTROL   | B2_PT  r2 | job=3c3b1511 | score=122.9 truth= 58.9 conf= 49.7 ev= 37 pvh= 23 src= 18 | providers: Google-CSE
[2026-03-14 23:28 UTC] 
  [B3_DE r1] Die Schülerinnen und Schüler im Kanton Zürich sind heute im Durchschni...
[2026-03-14 23:28 UTC]     Submitted: be9216f9
[2026-03-14 23:38 UTC]   C0_CONTROL   | B3_DE  r1 | job=be9216f9 | score= 74.0 truth=   62 conf=   50 ev= 14 pvh=  3 src=  5 | providers: Google-CSE, Google-CSE, Serper
[2026-03-14 23:38 UTC] 
  [B3_DE r2] Die Schülerinnen und Schüler im Kanton Zürich sind heute im Durchschni...
[2026-03-14 23:38 UTC]     Submitted: b6c1ba88
[2026-03-14 23:48 UTC]   C0_CONTROL   | B3_DE  r2 | job=b6c1ba88 | score= 92.6 truth=   64 conf=   48 ev= 19 pvh=  6 src= 12 | providers: Google-CSE, Google-CSE, Serper
[2026-03-14 23:48 UTC] 
======================================================================
[2026-03-14 23:48 UTC] CONDITION: C1_SERPER
[2026-03-14 23:48 UTC] ======================================================================
[2026-03-14 23:48 UTC] 
  [B1_EN r1] Were the various Bolsonaro trials conducted in accordance with Brazili...
[2026-03-14 23:48 UTC]     Submitted: bd3611f3
[2026-03-15 00:04 UTC]   C1_SERPER    | B1_EN  r1 | job=bd3611f3 | score=208.8 truth= 62.7 conf= 54.1 ev=107 pvh= 61 src= 29 | providers: Serper
[2026-03-15 00:04 UTC] 
  [B1_EN r2] Were the various Bolsonaro trials conducted in accordance with Brazili...
[2026-03-15 00:04 UTC]     Submitted: 9bffe0c7
[2026-03-15 00:20 UTC]   C1_SERPER    | B1_EN  r2 | job=9bffe0c7 | score=209.3 truth= 52.5 conf= 56.5 ev=115 pvh= 56 src= 29 | providers: Serper
[2026-03-15 00:20 UTC] 
  [B2_PT r1] Os julgamentos de Bolsonaro foram conduzidos de acordo com a lei brasi...
[2026-03-15 00:20 UTC]     Submitted: af4901a5
[2026-03-15 00:39 UTC]   C1_SERPER    | B2_PT  r1 | job=af4901a5 | score=234.6 truth= 67.8 conf= 63.1 ev=144 pvh= 68 src= 41 | providers: Serper
[2026-03-15 00:39 UTC] 
  [B2_PT r2] Os julgamentos de Bolsonaro foram conduzidos de acordo com a lei brasi...
[2026-03-15 00:39 UTC]     Submitted: 321ea2e4
[2026-03-15 01:04 UTC]   C1_SERPER    | B2_PT  r2 | job=321ea2e4 | score=270.3 truth= 63.4 conf= 61.6 ev=177 pvh= 99 src= 59 | providers: Serper
[2026-03-15 01:04 UTC] 
  [B3_DE r1] Die Schülerinnen und Schüler im Kanton Zürich sind heute im Durchschni...
[2026-03-15 01:04 UTC]     Submitted: a3507ba7
[2026-03-15 01:24 UTC]   C1_SERPER    | B3_DE  r1 | job=a3507ba7 | score=168.1 truth= 66.5 conf= 65.5 ev= 61 pvh= 32 src= 27 | providers: Serper
[2026-03-15 01:24 UTC] 
  [B3_DE r2] Die Schülerinnen und Schüler im Kanton Zürich sind heute im Durchschni...
[2026-03-15 01:24 UTC]     Submitted: 13d1e0e2
[2026-03-15 01:34 UTC]   C1_SERPER    | B3_DE  r2 | job=13d1e0e2 | score=110.4 truth=   69 conf=   62 ev= 34 pvh= 21 src= 12 | providers: Serper
[2026-03-15 01:34 UTC] 
======================================================================
[2026-03-15 01:34 UTC] CONDITION: C2_SERPAPI
[2026-03-15 01:34 UTC] ======================================================================
[2026-03-15 01:34 UTC] 
  [B1_EN r1] Were the various Bolsonaro trials conducted in accordance with Brazili...
[2026-03-15 01:34 UTC]     Submitted: 8409a477
[2026-03-15 01:51 UTC]   C2_SERPAPI   | B1_EN  r1 | job=8409a477 | score=199.8 truth= 56.7 conf= 49.2 ev=104 pvh= 42 src= 25 | providers: SerpAPI
[2026-03-15 01:51 UTC] 
  [B1_EN r2] Were the various Bolsonaro trials conducted in accordance with Brazili...
[2026-03-15 01:51 UTC]     Submitted: 042019ae
[2026-03-15 02:07 UTC]   C2_SERPAPI   | B1_EN  r2 | job=042019ae | score=191.0 truth= 62.3 conf= 59.8 ev= 95 pvh= 49 src= 22 | providers: SerpAPI
[2026-03-15 02:07 UTC] 
  [B2_PT r1] Os julgamentos de Bolsonaro foram conduzidos de acordo com a lei brasi...
[2026-03-15 02:07 UTC]     Submitted: 3d8953fc
[2026-03-15 02:25 UTC]   C2_SERPAPI   | B2_PT  r1 | job=3d8953fc | score=227.7 truth= 61.9 conf= 58.6 ev=119 pvh= 75 src= 38 | providers: SerpAPI
[2026-03-15 02:25 UTC] 
  [B2_PT r2] Os julgamentos de Bolsonaro foram conduzidos de acordo com a lei brasi...
[2026-03-15 02:25 UTC]     Submitted: b0e28f8d
[2026-03-15 02:40 UTC]   C2_SERPAPI   | B2_PT  r2 | job=b0e28f8d | score=177.6 truth= 60.7 conf= 57.9 ev= 82 pvh= 50 src= 22 | providers: SerpAPI
[2026-03-15 02:40 UTC] 
  [B3_DE r1] Die Schülerinnen und Schüler im Kanton Zürich sind heute im Durchschni...
[2026-03-15 02:41 UTC]     Submitted: 6fd9d398
[2026-03-15 03:01 UTC]   C2_SERPAPI   | B3_DE  r1 | job=6fd9d398 | score=195.1 truth= 66.8 conf= 65.7 ev= 70 pvh= 36 src= 36 | providers: SerpAPI
[2026-03-15 03:01 UTC] 
  [B3_DE r2] Die Schülerinnen und Schüler im Kanton Zürich sind heute im Durchschni...
[2026-03-15 03:01 UTC]     Submitted: 31c4432d
[2026-03-15 03:27 UTC]   C2_SERPAPI   | B3_DE  r2 | job=31c4432d | score=191.1 truth=   61 conf= 55.7 ev= 66 pvh= 14 src= 37 | providers: SerpAPI
[2026-03-15 03:27 UTC] 
[3] Checking worktree availability (port 3001)...
[2026-03-15 03:27 UTC] 
======================================================================
[2026-03-15 03:27 UTC] CONDITION: C3_ACCUM
[2026-03-15 03:27 UTC] ======================================================================
[2026-03-15 03:27 UTC] 
  [B1_EN r1] Were the various Bolsonaro trials conducted in accordance with Brazili...
[2026-03-15 03:27 UTC]     Submitted: 4569a09c
[2026-03-15 03:43 UTC]   C3_ACCUM     | B1_EN  r1 | job=4569a09c | score=203.6 truth= 58.3 conf= 47.9 ev=110 pvh= 60 src= 27 | providers: SerpAPI
[2026-03-15 03:43 UTC] 
  [B1_EN r2] Were the various Bolsonaro trials conducted in accordance with Brazili...
[2026-03-15 03:43 UTC]     Submitted: 7aa1b016
[2026-03-15 03:59 UTC]   C3_ACCUM     | B1_EN  r2 | job=7aa1b016 | score=192.4 truth= 66.1 conf= 56.8 ev= 93 pvh= 43 src= 24 | providers: SerpAPI
[2026-03-15 03:59 UTC] 
  [B2_PT r1] Os julgamentos de Bolsonaro foram conduzidos de acordo com a lei brasi...
[2026-03-15 04:00 UTC]     Submitted: ee0f1701
[2026-03-15 04:15 UTC]   C3_ACCUM     | B2_PT  r1 | job=ee0f1701 | score=219.0 truth= 60.8 conf= 60.2 ev= 95 pvh= 65 src= 36 | providers: SerpAPI
[2026-03-15 04:15 UTC] 
  [B2_PT r2] Os julgamentos de Bolsonaro foram conduzidos de acordo com a lei brasi...
[2026-03-15 04:15 UTC]     Submitted: b2c1de63
[2026-03-15 04:32 UTC]   C3_ACCUM     | B2_PT  r2 | job=b2c1de63 | score=207.1 truth= 68.5 conf= 65.6 ev=102 pvh= 55 src= 27 | providers: SerpAPI
[2026-03-15 04:32 UTC] 
  [B3_DE r1] Die Schülerinnen und Schüler im Kanton Zürich sind heute im Durchschni...
[2026-03-15 04:32 UTC]     Submitted: 8827506f
[2026-03-15 04:43 UTC]   C3_ACCUM     | B3_DE  r1 | job=8827506f | score=125.0 truth=   67 conf=   65 ev= 46 pvh= 22 src= 13 | providers: SerpAPI
[2026-03-15 04:43 UTC] 
  [B3_DE r2] Die Schülerinnen und Schüler im Kanton Zürich sind heute im Durchschni...
[2026-03-15 04:43 UTC]     Submitted: d9bb60d4
[2026-03-15 05:07 UTC]   C3_ACCUM     | B3_DE  r2 | job=d9bb60d4 | score=203.5 truth= 65.3 conf= 62.7 ev= 73 pvh= 27 src= 39 | providers: SerpAPI
[2026-03-15 05:07 UTC] 
[4] Restoring original search config on main...
[2026-03-15 05:07 UTC]     Restored: provider=auto cache=False
[2026-03-15 05:07 UTC] 

======================================================================
[2026-03-15 05:07 UTC] PHASE A — COMPARISON SUMMARY
[2026-03-15 05:07 UTC] ======================================================================
[2026-03-15 05:07 UTC] Condition       | Avg Score  | N   | vs Control  
[2026-03-15 05:07 UTC] --------------------------------------------------
[2026-03-15 05:07 UTC]   C0_CONTROL      |      120.2 |   6 | baseline
[2026-03-15 05:07 UTC]   C1_SERPER       |      200.2 |   6 | +80.0
[2026-03-15 05:07 UTC]   C2_SERPAPI      |      197.0 |   6 | +76.8
[2026-03-15 05:07 UTC]   C3_ACCUM        |      191.8 |   6 | +71.6
[2026-03-15 05:07 UTC] 
--- Provider behavior per run ---
[2026-03-15 05:07 UTC]   C0_CONTROL   | B1_EN  r1 | Google-CSE
[2026-03-15 05:07 UTC]   C0_CONTROL   | B1_EN  r2 | Google-CSE
[2026-03-15 05:07 UTC]   C0_CONTROL   | B2_PT  r1 | Google-CSE
[2026-03-15 05:07 UTC]   C0_CONTROL   | B2_PT  r2 | Google-CSE
[2026-03-15 05:07 UTC]   C0_CONTROL   | B3_DE  r1 | Google-CSE, Google-CSE, Serper
[2026-03-15 05:07 UTC]   C0_CONTROL   | B3_DE  r2 | Google-CSE, Google-CSE, Serper
[2026-03-15 05:07 UTC]   C1_SERPER    | B1_EN  r1 | Serper
[2026-03-15 05:07 UTC]   C1_SERPER    | B1_EN  r2 | Serper
[2026-03-15 05:07 UTC]   C1_SERPER    | B2_PT  r1 | Serper
[2026-03-15 05:07 UTC]   C1_SERPER    | B2_PT  r2 | Serper
[2026-03-15 05:07 UTC]   C1_SERPER    | B3_DE  r1 | Serper
[2026-03-15 05:07 UTC]   C1_SERPER    | B3_DE  r2 | Serper
[2026-03-15 05:07 UTC]   C2_SERPAPI   | B1_EN  r1 | SerpAPI
[2026-03-15 05:07 UTC]   C2_SERPAPI   | B1_EN  r2 | SerpAPI
[2026-03-15 05:07 UTC]   C2_SERPAPI   | B2_PT  r1 | SerpAPI
[2026-03-15 05:07 UTC]   C2_SERPAPI   | B2_PT  r2 | SerpAPI
[2026-03-15 05:07 UTC]   C2_SERPAPI   | B3_DE  r1 | SerpAPI
[2026-03-15 05:07 UTC]   C2_SERPAPI   | B3_DE  r2 | SerpAPI
[2026-03-15 05:07 UTC]   C3_ACCUM     | B1_EN  r1 | SerpAPI
[2026-03-15 05:07 UTC]   C3_ACCUM     | B1_EN  r2 | SerpAPI
[2026-03-15 05:07 UTC]   C3_ACCUM     | B2_PT  r1 | SerpAPI
[2026-03-15 05:07 UTC]   C3_ACCUM     | B2_PT  r2 | SerpAPI
[2026-03-15 05:07 UTC]   C3_ACCUM     | B3_DE  r1 | SerpAPI
[2026-03-15 05:07 UTC]   C3_ACCUM     | B3_DE  r2 | SerpAPI
[2026-03-15 05:07 UTC] 
  Results saved to c:/DEV/FactHarbor/scripts/phaseA_results.json
[2026-03-15 05:07 UTC] 
--- VERDICT ---
[2026-03-15 05:07 UTC]   IMPROVEMENT CONFIRMED: C1_SERPER beats control by +80.0 points.
[2026-03-15 05:07 UTC]   UCM-level provider fix (C1_SERPER) may recover quality without code changes.
[2026-03-15 05:07 UTC]   Recommendation: Proceed to Phase B in parallel; promote search winner to defaults.
[2026-03-15 05:07 UTC] 
Phase A complete. 2026-03-15 05:07 UTC
