---
### 2026-09-01 | Technical Writer | Codex (GPT-5) | Silent Provisional Video
**Task:** Remove the synthetic voice from the published provisional Prototype Fund video without changing its application URL.
**Files touched:** `Docs/prototype-fund-pitch/index.html`, `Docs/prototype-fund-pitch/README.txt`, `Docs/prototype-fund-pitch/factharbor-prototype-fund-pitch.mp4`, `Docs/prototype-fund-pitch/factharbor-prototype-fund-pitch.en.vtt`, this handoff, and `Docs/AGENTS/Agent_Outputs.md`.
**Key decisions:** Publish an audio-free MP4 under the existing filename, retain burned captions, VTT captions, transcript and native controls, change the visible badge to `PROVISIONAL · silent preview`, and use a new internal query string to bypass cached voiced media.
**Open items:** Replace the silent preview with Robert's final Microsoft Teams recording by September 6; update captions, transcript, notice and query string while keeping the page URL unchanged.
**Warnings:** Verify that the final MP4 is under three minutes and that no provisional label remains. Do not rename the public page or change the URL stored in the application.
**For next agent:** Follow `Docs/prototype-fund-pitch/README.txt`. The silent preview has no audio stream; captions remain visible and downloadable. Replace the same media filename and update only the page's internal cache token.
**Learnings:** Not appended to `Role_Learnings.md`; the replacement instructions remain in the pitch README.
