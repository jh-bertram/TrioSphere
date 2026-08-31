# TrioSphere QA Pass — Plan & Status
_Organized 2026-08-31. Sources: TrioSphere Functionality QA.docx + automated sweep of repo (datasets.xlsx, html/js/css)._

## Already fixed — just re-verify on production after next deploy
- ✅ CSU DSRI link (now → research.colostate.edu/dsri/)
- ✅ Social links (now Bluesky/LinkedIn/Facebook/Instagram, real OHI accounts; old dead Twitter/FB/LinkedIn gone)
- ✅ About-page footer labels ("Datasets" → "Data")

## Track A — Data fixes in datasets.xlsx — ✅ DONE 2026-08-31 (verified cell-by-cell vs backup + full marked 11.1.1 render test)
1. ~~Broken bolds~~ **Already fixed before this pass** (commit "fixed commas and formatting"): all 41 entries render clean through marked 11.1.1 — the QA doc predates the fix. (And the "Equity" case was never about the word; it was markdown whitespace.)
2. ✅ Name whitespace stripped: ids 12, 18, 35, 41.
3. ✅ id 23 renamed → "U.S. Forest Service Datasets".
4. ✅ id 25 typo fixed → "Management".
5. ✅ id 34 tags → "Public Health; Biological Variability" (mirrors immunology-cluster ids 30-33; adjust if desired).
6. ✅ id 19: all 9 sub-bullets now nested; renders as proper sub-list (render-verified).
7. ✅ Citation caveat added to all 37 `database` entries (datasets 15/19/22/24 excluded — they cite one fixed source): "- See specific source citation details on the database website." as final bullet.
8. ✅ Bonus: id 7 renamed "Colorado Health Indications" → "Colorado Health Indicators" Dashboard (official CDPHE product name).
_Not committed to git yet. Pre-edit backup kept. File size 144→118 KB is normal openpyxl re-compression._

## Track B — Code fixes & review (Claude Code on the Mac; kickoff prompt below)
1. **Year Range disclosure** — add an info icon + accessible pop-up note by the "Year Range" filter (what the filter matches; final wording by Jonathan).
2. **Blank-year bug (found in sweep)** — `passFilters()` coerces blank `yearStart`/`yearEnd` to 0, so entries missing year data vanish whenever a year filter is set. Decide + implement (suggest: entries with no year data stay visible, noted in the disclosure).
3. **Feedback form** — currently discards input. Decision made: submit opens a prefilled email (mailto: jh.bertram@colostate.edu, subject "TrioSphere feedback", body = user's text).
4. **Escaping** — xlsx-sourced strings go into `innerHTML`/attributes unescaped (quotes in a tag value break markup). Add an escape helper.
5. **General review** — error-path UX (currently `alert()`), dead preview-view code, localStorage try/catch, a11y basics (modal aria/focus trap, labels, contrast), mobile filter panel + navbar, `<title>` consistency (index.html is just "TrioSphere"), console errors, broken links on all three pages.
6. **Deploy sanity** — confirm GitHub Pages serves from `main` (GITHUB-PAGES-SETUP.md references an old `claude/*` branch).

## Track C — Verification (after A+B merge)
Local server → 41 entries load; search, pills, tag/type/region/year filters, modals, CSV export, list view, clear-all. Then GitHub Pages staging; then email Allen; spot-check production.

## Out of scope for this pass
The 9 new raw candidates added to TrioSphere_Tracking_Template.xlsx on 2026-08-31 (EIOS, PADI-Web, BEACON, EMAi+, Wildlife Health Intelligence Network, VectorSurv, Move Disease Archive, Movebank/MoveBON/Euromammals, AGU 2021GH000436 paper) → source-addition workflow, next project phase.

---

## Kickoff prompt for Claude Code (run in ~/GitHub/TrioSphere)

> Read CLAUDE.md and QA_PASS.md first. Execute **Track B** of QA_PASS.md on a new branch `qa-pass-code`. Rules: do NOT edit datasets.xlsx (data fixes happen separately); keep the site fully static/CDN-based; preserve CSU branding and the datasets.xlsx header contract; match existing code style (vanilla JS, no framework).
>
> Order of work: B1 year-range disclosure (draft wording, mark for my approval), B2 blank-year filter behavior (keep no-year entries visible when year filters are set), B3 mailto feedback form (jh.bertram@colostate.edu, subject "TrioSphere feedback"), B4 escaping helper applied to all injected dataset strings, B5 the general review — fix small clear wins, list anything debatable instead of changing it, B6 verify GitHub Pages source branch is `main` (gh api repos/jh-bertram/TrioSphere/pages).
>
> Test with `python3 -m http.server` after each fix: 41 entries load, filters/search/modals/CSV export all work, no console errors. When done: commit to the branch with clear messages, do not push to main, and give me (a) a summary of every change, (b) a found-but-not-fixed list, (c) anything in Track A you noticed I should add. Production deploys only via the chain in CLAUDE.md.


---

## Decisions & follow-ups (2026-08-31, after Track B report)

- **B1 wording approved** as drafted; pending-approval marker removed.
- **yearEnd convention:** keep concrete years, refresh each January (now in CLAUDE.md "Annual maintenance"). BV-BRC's blank yearStart is intentional per its own Time Range note.
- **Debatables applied** (by Cowork, on qa-pass-code): © 2026 on all three pages; GITHUB-PAGES-SETUP.md branch refs corrected to `main`; dead PagePeeker preview code removed (JS + button comment + ~90 lines CSS); dead `.menu` nav-highlight JS removed from script.js/home.html/about.html; Tab focus trap added to both modals; DOMPurify 3.1.7 (pinned, cdnjs) sanitizes rendered markdown with graceful fallback.
- **Deferred:** inline validation for the two remaining alert()s; cache-buster versioning; dead `.navbar .menu` CSS rules (style.css ~754) left in place.
- **Track A + follow-ups committed on `qa-pass-code`; push + PR remain Jonathan's.**
