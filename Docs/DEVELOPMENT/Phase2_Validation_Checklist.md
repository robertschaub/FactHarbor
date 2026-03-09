# Phase 2 — Post-Implementation Validation Checklist

Run 1–2 analyses per input to confirm the pipeline behaves correctly across different topics and input types. Use local dev (apps/web + apps/api running) or the deployed app.

---

## Inputs

| # | Input | Type | Expected band | Notes |
|---|-------|------|---------------|-------|
| 1 | Was Iran actually making nukes? | Question | truth 60–87%, conf 70–85% | Canonical regression case; dimension decomposition variance expected |
| 2 | Was the Bolsonaro judgment (trial) fair and based on Brazil's law? | Question | truth 68–85%, conf 70–85% | STF/TSE cases, 27-year sentence should be found |
| 3 | The Bolsonaro judgment (trial) was fair and based on Brazil's law | Statement | ~Same as #2 (±4%) | Input neutrality — question vs statement must yield similar analysis |
| 4 | Hydrogen for cars is more efficient than using electricity | Claim | truth 25–45%, verdict LEANING-FALSE/MOSTLY-FALSE | Inversion logic; lower-level claims should influence correctly |
| 5 | Venezuela's economy under Maduro has performed well | Claim | — | Sparse evidence topic; verify no crashes, reasonable verdict |
| 6 | [URL to a long-form article or PDF] | Article | — | Article path; verify summarization, boundary formation |

---

## Success criteria (per run)

- [ ] Job completes with status SUCCEEDED
- [ ] No `analysis_generation_failed` / `truth=50, conf=0` UNVERIFIED fallback (verdict stage token fix)
- [ ] No crashes in SR evaluation (web-search augmentation, scope normalization)
- [ ] Claim count ≥ 1; boundaries formed
- [ ] For Bolsonaro: STF and/or TSE mentioned where applicable
- [ ] For #2 vs #3: truth% within ~4% (input neutrality)

---

## Commands

```powershell
# Start services (from repo root)
cd apps/api; dotnet run    # port 5000
cd apps/web; npm run dev    # port 3000

# Or use Swagger (http://localhost:5000/swagger) to create jobs via API
```

---

## Reporting

| Input | Run | Truth% | Conf% | Verdict | Claims | Notes |
|-------|-----|--------|-------|---------|--------|------|
| Iran | 1 | | | | | |
| Iran | 2 | | | | | |
| Bolsonaro (Q) | 1 | | | | | |
| Bolsonaro (S) | 1 | | | | | |
| Hydrogen | 1 | | | | | |
| Venezuela | 1 | | | | | |
| Article/PDF | 1 | | | | | |

Fill after running. Any run that fails success criteria should be investigated before declaring Phase 2 production-ready.
