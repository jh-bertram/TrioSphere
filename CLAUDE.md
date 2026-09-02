# CLAUDE.md — TrioSphere

Project instructions for Claude sessions working on TrioSphere.

## What this is

TrioSphere is a One Health data discovery platform from CSU's One Health Institute (built with DSRI). It's a curated, searchable catalog of metadata for external data sources spanning People, Animals, and Ecosystems — it hosts no data itself, only vetted pointers. Currently 41 entries in `datasets.xlsx`.

- Production: https://triosphere.research.colostate.edu/ (CSU Research IT hosting)
- Staging/preview: https://jh-bertram.github.io/TrioSphere/ (GitHub Pages, auto-updates on push)
- Dev env: https://triosphere-devl.research.colostate.edu/ (campus or GlobalProtect VPN only)
- Repo: https://github.com/jh-bertram/TrioSphere

## Architecture

Pure static site — no build step, no framework, no server code (a hosting requirement).

- `home.html` — landing page. `index.html` — the Data page (search/filter UI; also serves as site root). `about.html` — about page.
- `script.js` — fetches `datasets.xlsx` in the browser (SheetJS from CDN), parses the first sheet, renders filterable cards. `marked` (CDN) renders the markdown in `additionalInfo`. Font Awesome + simpleicons via CDN.
- `style.css` — all styling. CSU brand palette: green `#1E4D2B`, light gold `#C8C372`, orange `#D9782D`, neutral grey `#CCCCCC`, dark grey `#59595B`.
- `datasets.xlsx` IS the database. One row per source, first sheet, headers (exact, case-sensitive — script.js matches by name): `id, name, description, url, categories, source, region, type, yearStart, yearEnd, tags, invisibleTags, additionalInfo, dateAdded`.
- `csu_header_footer*.html` are reference extracts, not served pages. `GITHUB-PAGES-SETUP.md`, `README.md` are setup notes.

## Data conventions (from the Data Addition SOP v1.0)

- Multi-value fields are semicolon-separated. Tags in Title Case.
- `categories` ⊆ {People; Animals; Ecosystems}. `source` ∈ {database, dataset}. `region` standardized: Global / United States / Colorado / Europe (added 2026-09-02) / combos like "United States; Global". `type` usually blank.
- `tags` = 2–9 visible, user-facing tags. `invisibleTags` = 50+ search-only terms (synonyms, orgs, species, file formats, tools…).
- `description` ≈ 100 characters.
- `additionalInfo` = markdown popup: intro paragraph (no header) + five `####` sections in order: Host Organization, Data Format, How to access data of interest, Database Time Range, Access Type, Citation Information.
- `dateAdded` drives a "Recently Added" badge for 30 days.
- Markdown gotcha: `** text **` with spaces inside the asterisks does NOT render bold — several existing entries have this bug.
- New entries: id = max+1; full process lives in `TrioSphere_Data_Addition_SOP.docx` and the Quick Reference (kept outside this repo, in the project workspace).

## Editing rules

- Never rename, reorder, or add-before the header row in `datasets.xlsx`; edit values only, preserve the schema.
- Keep the site fully static and CDN-based.
- Keep CSU branding intact: the CSU logo script, brand colors, required footer links (Apply, Contact, Disclaimer, Equal Opportunity, Privacy), © notice.
- Test locally with a server (`python3 -m http.server`) — `fetch()` of the xlsx fails from `file://`.
- After data edits, sanity-check in the browser: entry count, filters, a few More Info modals.

## Annual maintenance (each January)

- Bump `yearEnd` on active databases (37 entries say 2025 as of Aug 2026) — decision 2026-08-31: keep concrete years rather than open-ended blanks, refresh annually. Blank years are legal and render as open-ended in filters.
- Bump the © year in the footers of home.html, index.html, about.html.

## Deployment flow (production does NOT auto-update)

1. Edit locally → commit → push to `main`.
2. GitHub Pages updates the staging URL automatically.
3. Email Allen Akers (Allen.Akers@colostate.edu, Research IT) to pull the update into CSU dev, verify there, then he promotes to production.

## Roadmap

1. **Cleanup/QA pass** — smooth out bugs and rough edges. Operative checklist: **QA_PASS.md** (item statuses verified 2026-08-31). Original list in `TrioSphere Functionality QA.docx` (broken-bold markdown in several entries, "U.S. Forest Service Data Sets" → "Datasets", Year Range needs a disclosure note, citation caveat note, indentation in Census of Agriculture entry…). Some QA items may already be fixed — verify against the live site before changing.
   Also spotted: id 35 name has a trailing newline ("Immunological Genome Project\n"); id 25 "Bureau of Land Managment…" typo; id 34 has only 1 visible tag (SOP min is 2); feedback form is a stub (alert only, goes nowhere).
2. **Add new sources** — ~25 approved candidates in `TrioSphere_Tracking_Template.xlsx` (mostly from Gray). Manual process is 2–3 hr/entry; goal is a skill and/or agent team that researches → assembles → verifies → publishes per the SOP.
3. **Constellation visualization (long-term, side work only)** — an easter-egg viz showing all sources as nodes, groupable/hideable by tags/categories. **Standing instruction: on every task, note anything useful for this** (tag co-occurrence, shared categories/regions, data shapes, promising libraries, natural hooks in script.js) in the project memory, but don't build it until the main work is done.

## People

Jonathan Bertram (owner, QA — jh.bertram@colostate.edu), Gray Knowles (data curation), Connor Price (original developer), Jessica Hunter (OHI business ops), Allen Akers (Research IT hosting), Tracey Goldstein / Michael Kirby (leadership).
