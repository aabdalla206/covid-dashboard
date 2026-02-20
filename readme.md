# US COVID-19 Smart Dashboard

**Live Site:** https://aabdalla206.github.io/covid-dashboard

### AI Disclosure:

Ai was used to add comments to code and reformat to be more understandble as well as making the readme file easy to comprehend.

## Overview

An interactive smart dashboard visualizing COVID-19 case data across all 50 US states. Built with Mapbox GL JS for the map component and C3.js/D3.js for data visualizations.

## Features

- **Proportional Symbol Map** — Circle size scales with total case count per state. Color gradient from yellow to red reflects severity.
- **Dynamic Stat Counters** — Total cases, deaths, recovered, and mortality rate update when a state is selected.
- **Bar Chart** — At national view, shows top 10 states by cases vs deaths. At state view, shows case breakdown (total, deaths, recovered).
- **Top 5 Rankings** — Clickable list of highest-case states that flies the map to that location.
- **Hover Tooltips** — Detailed popup on hover showing all key stats.
- **Reset Button** — Returns to national overview.

## Why Proportional Symbol Map?

A proportional symbol map was chosen over a choropleth because COVID-19 case counts are **absolute quantities** tied to specific locations, not ratios across area. A choropleth (shading entire state polygons) can be misleading because larger geographic states appear more severe simply due to area. Proportional circles directly encode the magnitude of a variable at a point, making it immediately intuitive that a larger circle = more cases, independent of state size. This is especially important for comparing a state like California (large area, high population) vs Rhode Island (small area, also high density per capita).

## Data Source

- **COVID-19 case data:** Aggregated from NYT / Johns Hopkins University CSSE COVID-19 Dataset (2021 snapshot)
- **State centroids:** Computed geographic centroids for all 50 US states
- **Format:** GeoJSON point features with `cases`, `deaths`, `recovered`, and `rate` attributes

## Map Type

Proportional Symbol Map — circles scaled by total case count, colored by severity.

## Tech Stack

| Tool | Purpose |
|------|---------|
| Mapbox GL JS v3.2 | Base map & proportional symbol layer |
| C3.js + D3.js | Bar charts |
| Vanilla JS | Dashboard logic, async data loading |
| HTML/CSS | Layout & styling |

## File Structure

```
covid-dashboard/
    index.html          ← Main entry point
    readme.md           ← This file
    ├─css/
    │     style.css     ← All styles
    ├─js/
    │     main.js       ← Map logic, chart logic, events
    └─assets/
          covid_us.geojson  ← State-level COVID data
```

## How to Use

1. Open the live site or run locally via a local server (e.g. `python -m http.server`)
2. Hover over any circle to see a quick stats popup
3. Click a circle to drill into that state — stats and chart update
4. Click a state in the Top 5 list to fly to it
5. Click anywhere on the blank map or press "Reset Dashboard" to return to national view

## Running Locally

```bash
git clone https://github.com/aabdalla206/covid-dashboard
cd covid-dashboard
python -m http.server 8080
# Open http://localhost:8080
```

## Author

Abdul Abdalla — University of Washington, GEOG 458
