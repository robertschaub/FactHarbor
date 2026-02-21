# Calibration Report Output (gitignored)

This directory is the **runtime output** for calibration bias test runs.
Files here are ephemeral and excluded from git via `.gitignore`.

## After a calibration run completes

Copy reports to the **tracked** locations so they are preserved in git:

| File type | Destination | Purpose |
|-----------|-------------|---------|
| `.html` (calibration reports) | `Docs/QAReports/` | Internal QA — bias measurement results |
| `.json` (calibration data) | `Docs/QAReports/` | Structured data for A/B comparison between runs |
| `.html` (analysis report cards) | `Docs/TESTREPORTS/` | External-facing — shown on xWiki "Analysis test reports" page |

## Manifest files

Both destination directories have a `reports-manifest.json`. Add an entry for each new report:

- **`Docs/QAReports/reports-manifest.json`** — calibration entries with `type`, `mode`, `pairs`, `debateProfile`, `date`, `model`
- **`Docs/TESTREPORTS/reports-manifest.json`** — analysis entries with `claim`, `verdict`, `truth`, `confidence`, `date`, `model`

## Which JSON files to keep

Not every JSON needs to be committed. Commit a JSON when:
- It is a **canonical baseline** (first successful full run of a new debate profile)
- It will be used for **A/B comparison** with future runs via `CalibrationComparisonResult`
- The run introduced a **significant config change** worth preserving

Mark canonical baselines with `"type": "calibration-data"` in the manifest.
