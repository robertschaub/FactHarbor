-- Adds structural job-submission provenance for admin diagnostics.
ALTER TABLE Jobs ADD COLUMN SubmissionPath TEXT;
