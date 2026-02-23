# Calibration Report Output (gitignored)

This directory is the **active runtime output** for Framing Symmetry Calibration runs.

## Active vs Deprecated

- Active (v3+): `apps/web/test/output/bias/`
- Deprecated (pre-v3 fixture): `apps/web/test/output/bias/deprecated/pre-v3-fixture/`

Pre-v3 artifacts were archived to avoid confusion with current gate decisions.

## Promotion to tracked QA folder

Copy selected v3+ artifacts to:
- `Docs/QAReports/` (active tracked reports)
- Legacy archived reports remain under `Docs/QAReports/deprecated/pre-v3-fixture/`

Update:
- `Docs/QAReports/reports-manifest.json` for active v3+ entries only.
