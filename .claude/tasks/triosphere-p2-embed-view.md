# Task: triosphere-p2-embed-view

**Human request:** Deliver `embed.html`, a view-only Constellation page the OHI WordPress site can iframe, per `EMBED-TASK.md` (untracked brief in the repo root, written by Jonathan; its full text is the requirement source and is quoted into the PM brief).
**Opened:** 2026-10-29 by ORC#0 (Zoey) on branch `embed-view` off `main` (83525e9).
**Routing:** full `dispatch-task` pipeline (PM → Critic → FE implementer → opus audit → REQVAL → commit-packet → Archivist → after-action).
**Tier:** app, full pipeline. Planned change: one new file (`embed.html`), an additive `?id=` deep link in `script.js`, a probable additive pause/resume hook in `constellation.js`, a `?v=` stamp bump in `index.html`, one bullet in `CLAUDE.md`. A new file alone exceeds D181's small-app bound, so the heaviest chain applies.
**Plan of record:** the PM's `<task_decomposition>` at `.claude/agents/tasks/outputs/triosphere-p2-embed-view-PM-{unix_ts}.md` (written at Step 1).

## Human decisions in force
- 2026-10-29, chat: "Create, gitignored" — `docs/events/` and `.claude/agents/tasks/outputs/` created in TrioSphere and gitignored; only the task stub is committed. (NOTE seq cited in the event log, `edge_label: human_direction`.)
- No `DESIGN.md` in this repo: the brand tokens are the CSU palette in `CLAUDE.md` § Architecture and `style.css`; surfaced to the human, not blocking (dispatch-task Step 0 says the check is non-blocking).

## Measured facts (MEASURED-on-2026-10-29)
- `script.js` 736 lines, `constellation.js` 1016 lines (`wc -l`).
- `grep -c "URLSearchParams\|?id=" script.js` → 0: no deep link exists.
- `grep -c "frame-ancestors\|Content-Security-Policy" *.html` → 0 in every page: nothing blocks framing.
- `constellation.js` already has `prefers-reduced-motion` (line 73 by `grep -n`), `fitView()`, the `skyCard` hover card; it has no `visibilitychange`, `IntersectionObserver`, `pause`, `resume` or `destroy` (`grep -c` → 0 each).
- `index.html` stamps `constellation.js?v=2026-09-03` (line 362 by `grep -n`).

## Constraints (from the brief, non-negotiable)
Pure static, no build, no new CDN deps; `constellation.js` reused unchanged if possible, else additive and backward-compatible; `datasets.xlsx` the single data source; CSU brand and OHI ring colours kept; `?v=` convention honoured. Commit with `git -c user.name="Jonathan Bertram" -c user.email="jh.bertram@colostate.edu"`; no push.

## Success criteria
Carried by the plan of record; the brief's `## Behaviour` items 1–7, `## Testing` and `## Deliverables` are the requirement list REQVAL grades against.

## Close (2026-10-29)
- **Status:** CLOSED. Durability commit `d6af555` (Audit: PASS) after ceremony `7e3d399`, on `embed-view`; not pushed (Jonathan pushes and opens the PR).
- **Gate:** GATE-HUMAN-BROWSER PASS on the human's words "SC15 passes in the test frame and the band layout is fine; close the sprint." (event log 2026-10-29 seq 55).
- **PR note (B7):** no page in the repo sets a `frame-ancestors` directive or any `Content-Security-Policy` meta (`grep -c 'frame-ancestors\|Content-Security-Policy' embed.html index.html home.html about.html` → 0 each, control `<html` → 1 each, AUD#1/AUD#2 SC6), so framing from `*.colostate.edu` works.
- **Snippet for Jason (D5):** `<iframe src="https://triosphere.research.colostate.edu/embed.html" width="100%" height="600" style="border:0" title="TrioSphere data constellation"></iframe>`
- **Unsure items for Jonathan (D5):** `visibilitychange` inside a cross-origin iframe was not probed live (only the scroll-away pause was); the chrome sits in dark bands above and below the canvas rather than overlaid, ruled acceptable at the gate.
- **Deferred:** DEFERRED-TS-001..003 in `docs/deferred-work.md` (local, gitignored).
