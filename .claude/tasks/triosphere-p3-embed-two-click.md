# Task: triosphere-p3-embed-two-click

**Human request:** On the embed, "clicking a node should just open the pop-up and clicking it a second time while it is popped up should load the triosphere page, so it feels a little more interactive on the homepage, we want visitors to explore this first, and possibly linger on the page" (Jonathan, chat, 2026-10-29; event log 2026-10-29 seq 75).
**Opened:** 2026-10-29 by ORC#0 (Zoey) on branch `embed-two-click` off `main` (dfe0b83, PR #32 merged).
**Agents spawned:** FE#1 (implementer), AUD#1 (opus), REQVAL (Mode A by ORC or Mode B), AR#1.
**Routing:** small-app chain by analogy to D181 (stub, ORC dry-run, implementer, independent audit, REQVAL, commit-packet; no PM, no Critic) — a departure from the full-pipeline row for non-`apps/` paths, allowed only by the human's decision for this sprint (see § Tier).
**Tier:** estimated change: `embed.html` ≤ 25 added lines (a click-arming check in `openEntry` plus a "click again to open" hint on the card), and, only if the chart hides the focused star's card on hover-leave in a way that defeats the second click, an additive `opts.pinFocusCard` option in `constellation.js` ≤ 10 lines with default-off behaviour identical to today; then the `?v=` stamps in `index.html` (3/3) and `embed.html`. No new file, no schema or dependency change.

## Measured facts (MEASURED-on-2026-10-29, at dfe0b83)
- `grep -n 'function openEntry' embed.html` → line 134; it calls `window.open(href, "_blank", "noopener")` at line 136.
- `constellation.js` pointerup (`grep -n 'addEventListener("pointerup"' constellation.js` → 927): a click on a star runs `setFocus(dragged); onOpen(dragged.ds);` — focus, and therefore the card (`setFocus` calls `showCard`), precedes the open hook. Keyboard Enter on the focused star also calls `onOpen` (line 948).
- `setHover` (line 871) calls `showCard(n, …)` on every hover change, so when the pointer leaves a star the card hides even if that star is focused (lines 879–884).
- `.sky-card` rules live in `style.css` lines 1487–1520; the embed links `style.css` and carries its own `<style>` block.

## Behaviour required
1. First click (or Enter) on a star: its card shows and stays while that star is focused; no tab opens.
2. Second click (or Enter) on the same star while its card is up: `index.html?id=N` opens in a new tab (today's behaviour).
3. Clicking a different star swaps the card to it and re-arms; clicking the sky background clears the card and disarms.
4. The card carries a short hint, "Click again to open in TrioSphere" or equivalent, visible in the embed only.
5. The Data page (`index.html`) behaves exactly as on `main`: one click opens the modal.
6. Touch: the first tap shows the card, the second tap on the same star opens; a finger drag still scrolls the host page.

## Success criteria
- SC1 (ORC at receipt) `git diff --numstat main -- embed.html` → one row, added ≤ 25, deleted ≤ 5.
- SC2 (ORC at receipt) `git diff --numstat main -- constellation.js` → nothing, or one row with deleted 0 and added ≤ 10; if a row, `grep -c 'pinFocusCard' constellation.js embed.html` → ≥1 each, and `grep -c 'v=2026-10-29' index.html` → 0 with `grep -c '?v=' index.html` → 4 (stamps bumped to a new date, all three equal: `grep -o 'v=20[0-9-]*' index.html | sort -u | wc -l` → 1).
- SC3 (ORC at receipt) `git diff --numstat main -- script.js style.css datasets.xlsx home.html about.html` → nothing.
- SC4 (ORC at receipt) `grep -ci 'click again' embed.html` → ≥1; positive control `grep -c 'skyCard' embed.html` → ≥1.
- SC5 (auditor, Playwright, served by `python3 -m http.server`) on embed.html: first click on a star shows the card and opens no page (`context.pages` count unchanged); second click on the same star opens `index.html?id=N`; clicking another star swaps the card; clicking empty sky hides it; Enter twice on a focused star opens; console clean apart from the pre-existing `/favicon.ico` 404.
- SC6 (auditor, Playwright) on index.html: one click on a star opens the More Info modal, as on `main`; four view toggles unchanged.
- SC7 (ORC at commit-packet staging) `git diff --cached --name-only | grep -c 'EMBED-TASK\|test-frame'` → 0; positive control `git diff --cached --name-only | grep -c 'embed.html'` → 1.
- SC8 (human, on staging after merge) the two-click feel on the OHI test page.

## Constraints
Static, CDN-only, no new dependency; `constellation.js` unchanged if the embed can do it alone, else additive and default-off; CSU brand kept; commit as Jonathan Bertram, no push; `EMBED-TASK.md` stays untracked.

## Amendments
- A1 (2026-10-29, ORC dry-run): SC2's uniform-stamp command was `grep -o 'v=[0-9-]*' index.html | sort -u | wc -l → 1`, which prints 2 today because the comment at index.html line 21 matches `v=` with no digits; rewritten to `grep -o 'v=20[0-9-]*' … → 1` (prints 1 at dfe0b83).
- A2 (2026-10-29, ORC ruling after FE#1 round 2): the hover-away gap (card hides when the pointer leaves an armed star, so one click opens) is the case the § Tier clause reserved; the additive default-off `opts.pinFocusCard` in `constellation.js` is authorized (≤ 10 added lines, deleted 0), with the `?v=` stamps bumped to one new string on the three `index.html` tags and the two `embed.html` tags. Because today's stamp is already `2026-10-29`, the new string is `2026-10-29b`. SC2's stamp checks are replaced by: `grep -o '?v=[^"]*"' index.html | sort -u` prints exactly `?v=2026-10-29b"` (one line; the comment at line 21 carries no quote and does not match; measured at dfe0b83: prints `?v=2026-10-29"`, one line); the same command on `embed.html` prints the same one line.

## Close (2026-10-29)
- **Status:** CLOSED pending the human's staging check (SC8). Durability commit `e5a3801` (Audit: PASS) on `embed-two-click`; not pushed (Jonathan pushes and opens the PR).
- **Rounds:** FE round 1 → AUD#1 FAIL on behaviour 3 (Enter-arm, sky click, single click opened) → FE round 2 (caption observer disarms) → ORC amendment A2 authorized `pinFocusCard` → FE round 3 → AUD#2 full re-run PASS, 0 warnings → REQVAL Mode A 11 COVERED / 2 bound → commit halted once on the packet's `<files_created>none</files_created>` form, corrected by FE → commit.
- **Deferred:** DEFERRED-TS-004 (the disarm observer couples to the chart's caption writer).
- **For Jonathan:** on staging after merge, click a star once (card stays up, chart recentres), click it again (Data page opens); try hovering away and clicking back (opens on that click, by A2); keyboard Enter twice; on a phone, two taps.
