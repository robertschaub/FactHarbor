# Analyzer V2 Contract Fixtures

These fixtures are structural contract artifacts for the pipeline rebuild. They are
not live analysis results and must not be used as quality baselines.

- `schemas/report-result-v2.schema.json` locks the V2 public result shape.
- `schemas/warning-event-v2.schema.json` locks the typed warning/event shape.
- `schemas/prepared-stage1-v1.schema.json` locks the V1 ACS prepared snapshot
  shape that V2 must consume or migrate by default.
- `schemas/claim-selection-draft-v1.schema.json` locks the V1 ACS draft wrapper
  invariants that carry selected, ranked, and recommended claim IDs.
- `schemas/claim-contract-v2.schema.json` locks the V2 ClaimContract shape for
  claim understanding and Gate 1 migration work.
- `schemas/claim-understanding-result-v2.schema.json` locks the
  ClaimUnderstandingResult envelope so accepted outcomes carry a ClaimContract
  and blocked/damaged outcomes do not fabricate one.
- `schemas/report-result-v1-compat.schema.json` preserves historical
  `3.2.0-cb` read compatibility.

The fixtures intentionally use Captain-defined analysis input text exactly, so
contract tests do not introduce synthetic benchmark inputs.
