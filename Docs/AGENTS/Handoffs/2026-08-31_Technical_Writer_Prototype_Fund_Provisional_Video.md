---
### 2026-08-31 | Technical Writer | Codex (GPT-5) | Prototype Fund Provisional Video
**Task:** Replace the broken pitch placeholder with a usable provisional video while keeping one stable application URL for the later final recording.
**Files touched:** `Docs/prototype-fund-pitch/index.html`, `Docs/prototype-fund-pitch/README.txt`, `Docs/prototype-fund-pitch/factharbor-prototype-fund-pitch.mp4`, `Docs/prototype-fund-pitch/factharbor-prototype-fund-pitch.en.vtt`, this handoff, and `Docs/AGENTS/Agent_Outputs.md`.
**Key decisions:** Keep `https://robertschaub.github.io/FactHarbor/prototype-fund-pitch/` stable. Publish a clearly labelled provisional H.264/AAC video with synthetic narration, burned captions, a VTT file, transcript, and native controls. Replace the same MP4 for the final Microsoft Teams recording and change only the internal cache-busting query string.
**Open items:** Before September 6, replace the provisional MP4 with Robert's final Microsoft Teams recording, update captions and transcript, remove the provisional notice, deploy, and re-verify the unchanged public page URL.
**Warnings:** The final video must remain under three minutes. Verify pause/play, backward/forward timeline seeking, captions, transcript, and public unauthenticated access after replacement.
**For next agent:** Follow `Docs/prototype-fund-pitch/README.txt`. Do not rename the public page or the MP4. The provisional cut is 169.067 seconds and uses `?v=provisional-20260831`; update that query string when publishing the final media.
**Learnings:** Not appended to `Role_Learnings.md`; the stable-page replacement procedure is recorded in the pitch README.
