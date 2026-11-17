# Beyond The Road Toll – D3.js data story

A single scrolling page: landing → Q1–Q5 → About the data. Charts are built with D3.js v7.

## Run it

The charts load CSV files, so the page must be opened through a local web server, not by double-clicking `index.html`.

- **VS Code:** install the "Live Server" extension, right-click `index.html` → *Open with Live Server*.
- **Python:** in this folder run `python -m http.server 8000`, then open http://localhost:8000

## Files

```
index.html          page structure and all text
css/style.css       layout, colours, fonts
js/common.js        shared helpers: column names, colours, tooltip, tables, resizing
js/hero.js          landing page mini chart
js/q1.js … q5.js    one file per research question
data/*.csv          chart data (Traffic rows only)
```

Each chart is in its own file, so group members can work on different questions without clashing.

## Using your KNIME exports

The CSVs in `data/` were generated from the BITRE national workbook (raw sheet, Cause of injury = "Traffic"). To use your own KNIME output instead, export with a **CSV Writer** node and save it over the matching file. Keep the column names exactly as below (these are KNIME's default names).

| File | Export from | Columns |
|---|---|---|
| `q1_annual.csv` | GroupBy: Calendar year | Calendar year, Hospitalisations |
| `q1_monthly.csv` | GroupBy: Calendar year + Month, then Rule Engine for month number | Calendar year, Month, Hospitalisations, Month number |
| `q2_roaduser.csv` | GroupBy: Calendar year + Road user | Calendar year, Road user, Hospitalisations |
| `q3_age_sex.csv` | GroupBy: Calendar year + Age group + Sex | Calendar year, Age group, Sex, Hospitalisations |
| `q3_remoteness.csv` | GroupBy: Calendar year + ABS remoteness area | Calendar year, ABS remoteness area, Hospitalisations |
| `q4_counterparty.csv` | **Math Formula** node (not the Pivot) | Road user, Counterparty, Hospitalisations, Sum(Hospitalisations), Share (%) |
| `q5_bed_days.csv` | **Math Formula** node (not the Pivot) | Calendar year, Age group, Bed days, Hospitalisations, Avg bed days |

The charts need the **long** format (one row per group), so export Q4 and Q5 from the Math Formula node, before any Pivot.

If your column names differ, change them once in the `COL` object at the top of `js/common.js`.

## Colours

From our Figma palette: Dark Amethyst `#241E4E` (text, header), Oxblood `#960200` (annotations), Burnt Peach `#CE6C47`, Golden Pollen `#FFD046` (highlights), Vanilla Custard `#EADAA2` (surfaces).

For chart marks, a lighter amethyst `#4B40A0` is paired with Burnt Peach `#CE6C47`. Dark Amethyst is too dark to read as a series colour. The pair was checked for colour-blind separation and contrast.

## Accessibility

- Every chart has a "Show data table" option.
- Colour is never the only cue: direct labels, legends and tooltips name every series.
- Controls are real buttons, selects and sliders, usable by keyboard.

## Still to fill in

- Access date and team names in the About section (`index.html`).
- Reference list.
