# TrioSphere

**A One Health data discovery platform from Colorado State University**

🌐 **Live site:** [triosphere.research.colostate.edu](https://triosphere.research.colostate.edu/) &nbsp;·&nbsp; staging preview: [jh-bertram.github.io/TrioSphere](https://jh-bertram.github.io/TrioSphere/)

TrioSphere connects researchers to curated data sources spanning human, animal, and ecosystem health. One Health research depends on data scattered across dozens of agencies and platforms; TrioSphere gathers vetted sources into one searchable catalog, with the metadata researchers actually need — coverage, formats, access requirements, and citations — one click from the data itself. The platform hosts no data; every entry links directly to its source.

## Features

- **60+ curated sources** — databases and datasets screened for relevance, credibility, accessibility, and unique value
- **Search that finds things** — every entry carries 100+ hidden search terms (synonyms, acronyms, species, pollutants, file formats), so "PM2.5" finds air monitoring data even though no card says it
- **One Health filtering** — browse by People / Animals / Ecosystems, tags, region, source type, and year range
- **Rich detail cards** — host organization, data formats, step-by-step access instructions, time range, and ready-to-adapt citations
- **Three views** — cards, a compact list, and a preview view that leads with a screenshot of each source's website, for when you remember what a site looked like but not what it was called
- **CSV export** of any filtered view, and a feedback button for suggesting new sources

## How it works

A fully static site — no backend, no build step, no framework:

| File | Role |
|---|---|
| `datasets.xlsx` | **The database.** One row per source; loaded and parsed in the browser via SheetJS |
| `index.html` | The Data page (search, filters, cards) |
| `home.html` / `about.html` | Landing and about pages |
| `script.js` | Loads the spreadsheet, builds filters, renders cards and popups (marked + DOMPurify for the markdown) |
| `style.css` | All styling, in CSU brand colors |
| `images/previews/` | Website screenshots for the preview view (one `<id>.webp` per source) plus a `manifest.json` of capture dates |
| `tools/capture_previews.py` | Maintenance script that takes those screenshots with headless Chromium (run locally; not part of the site) |

## Running locally

```bash
git clone https://github.com/jh-bertram/TrioSphere.git
cd TrioSphere
python3 -m http.server 8000
# then open http://localhost:8000/home.html
```

A local server is required — the site fetches `datasets.xlsx`, which browsers block from `file://`.

## Adding data sources

Each source is one row in `datasets.xlsx` (`id`, `name`, `description`, `url`, `categories`, `source`, `region`, `type`, `yearStart`, `yearEnd`, `tags`, `invisibleTags`, `additionalInfo`, `dateAdded`). New sources go through a six-phase process — triage screening, research, classification, two-tier tagging, documentation, and quality control — before they're added. Have a source to suggest? Use the **Leave Feedback** button on the [Data page](https://triosphere.research.colostate.edu/index.html).

### Refreshing the website screenshots

The preview view's screenshots are static files, captured by hand and refreshed each January (or with `--only-missing` after adding sources):

```bash
pip3 install playwright openpyxl pillow && python3 -m playwright install chromium   # once
python3 tools/capture_previews.py            # all sources; --only-missing / --ids 12,34 for subsets
```

Then check the results in the preview view and commit `images/previews/`. To screenshot a more recognizable page than a source's catalog link, map its id to that page in `tools/preview_overrides.json`.

## Deployment

Changes merged to `main` publish automatically to the GitHub Pages staging site; production at `triosphere.research.colostate.edu` is promoted from staging by CSU Research IT.

## Team

Built by Colorado State University's [One Health Institute](https://onehealth.colostate.edu/) with the [Data Science Research Institute](https://www.research.colostate.edu/dsri/) — Connor Price (technical architecture & development), Gray Knowles (research & data curation), Jonathan Bertram (data curation & quality assurance), with Tracey Goldstein and Michael Kirby.

© Colorado State University
