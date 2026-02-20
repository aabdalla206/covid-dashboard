
// ── Config ──────────────────────────────────────────────────
// MAPBOX_TOKEN is loaded from js/config.js (gitignored)
const DATA_URL     = 'data/covid_us.geojson';

mapboxgl.accessToken = MAPBOX_TOKEN;

// ── State variables ──────────────────────────────────────────
let map, chart, popup;
let allFeatures   = [];
let selectedState = null;

// ── Initialize map ───────────────────────────────────────────
map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [-96, 37.5],
    zoom: 3.5,
    minZoom: 2,
    maxZoom: 10
});

map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

// ── On map load ───────────────────────────────────────────────
map.on('load', () => {
    document.getElementById('loading').style.display = 'none';

    // Load GeoJSON asynchronously
    fetch(DATA_URL)
        .then(r => r.json())
        .then(data => {
            allFeatures = data.features;

            // Add source
            map.addSource('covid', {
                type: 'geojson',
                data: data
            });

            // ── Proportional symbol layer ────────────────────
            map.addLayer({
                id: 'covid-circles',
                type: 'circle',
                source: 'covid',
                paint: {
                    'circle-radius': [
                        'interpolate', ['linear'],
                        ['get', 'cases'],
                        50000,  6,
                        250000, 12,
                        500000, 18,
                        1000000, 26,
                        3000000, 38,
                        5000000, 50
                    ],
                    'circle-color': [
                        'interpolate', ['linear'],
                        ['get', 'cases'],
                        50000,  '#ffd700',
                        500000, '#ff8c00',
                        1500000,'#f85149',
                        4000000,'#da3633'
                    ],
                    'circle-opacity': 0.75,
                    'circle-stroke-width': 1.5,
                    'circle-stroke-color': 'rgba(255,255,255,0.3)'
                }
            });

            // ── State label layer ────────────────────────────
            map.addLayer({
                id: 'covid-labels',
                type: 'symbol',
                source: 'covid',
                layout: {
                    'text-field': ['get', 'abbr'],
                    'text-size': 9,
                    'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold']
                },
                paint: {
                    'text-color': '#ffffff',
                    'text-halo-color': 'rgba(0,0,0,0.5)',
                    'text-halo-width': 1
                }
            });

            // Initialize the info panel with national totals
            updateNationalStats();
            buildTopList();
            buildChart(null);
        })
        .catch(err => {
            console.error('Data load error:', err);
            document.getElementById('loading').innerHTML = 'Failed to load data.';
        });

    // ── Hover effect ─────────────────────────────────────────
    map.on('mouseenter', 'covid-circles', (e) => {
        map.getCanvas().style.cursor = 'pointer';

        const props = e.features[0].properties;
        const coords = e.features[0].geometry.coordinates.slice();

        if (popup) popup.remove();
        popup = new mapboxgl.Popup({ offset: 15, closeButton: false })
            .setLngLat(coords)
            .setHTML(`
                <div class="popup-title">${props.state}</div>
                <div class="popup-row"><span class="label">Total Cases</span><span class="value">${fmtNum(props.cases)}</span></div>
                <div class="popup-row"><span class="label">Deaths</span><span class="value">${fmtNum(props.deaths)}</span></div>
                <div class="popup-row"><span class="label">Recovered</span><span class="value">${fmtNum(props.recovered)}</span></div>
                <div class="popup-row"><span class="label">Rate / 100k</span><span class="value">${props.rate}%</span></div>
            `)
            .addTo(map);
    });

    map.on('mouseleave', 'covid-circles', () => {
        map.getCanvas().style.cursor = '';
        if (popup) popup.remove();
    });

    // ── Click to drill down ──────────────────────────────────
    map.on('click', 'covid-circles', (e) => {
        const props = e.features[0].properties;
        selectedState = props;
        updateStateStats(props);
        buildChart(props);
        highlightCircle(props.state);
    });

    // ── Click on blank map = reset ───────────────────────────
    map.on('click', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['covid-circles'] });
        if (features.length === 0) resetDashboard();
    });
});

// ── Map idle ──────────────────────────────────────────────────
map.on('idle', () => {
    // Could update visible features here if needed
});

// ── Functions ─────────────────────────────────────────────────

function fmtNum(n) {
    return Number(n).toLocaleString('en-US');
}

function updateNationalStats() {
    const totals = allFeatures.reduce((acc, f) => {
        acc.cases     += f.properties.cases;
        acc.deaths    += f.properties.deaths;
        acc.recovered += f.properties.recovered;
        return acc;
    }, { cases: 0, deaths: 0, recovered: 0 });

    const mortality = ((totals.deaths / totals.cases) * 100).toFixed(1);

    document.getElementById('stat-cases').textContent     = fmtNum(totals.cases);
    document.getElementById('stat-deaths').textContent    = fmtNum(totals.deaths);
    document.getElementById('stat-recovered').textContent = fmtNum(totals.recovered);
    document.getElementById('stat-rate').textContent      = mortality + '%';

    document.getElementById('state-name').textContent    = 'United States';
    document.getElementById('state-details').textContent = 'Showing all 50 states — click a circle to drill down';
}

function updateStateStats(props) {
    const mortality = ((props.deaths / props.cases) * 100).toFixed(1);

    document.getElementById('stat-cases').textContent     = fmtNum(props.cases);
    document.getElementById('stat-deaths').textContent    = fmtNum(props.deaths);
    document.getElementById('stat-recovered').textContent = fmtNum(props.recovered);
    document.getElementById('stat-rate').textContent      = mortality + '%';

    document.getElementById('state-name').textContent    = props.state;
    document.getElementById('state-details').textContent =
        `Case rate: ${props.rate}% per 100k residents`;
}

function buildChart(props) {
    const chartEl = document.getElementById('bar-chart');

    // Destroy previous chart
    if (chart) { try { chart = chart.destroy(); } catch(e) {} }

    let columns, chartTitle;

    if (!props) {
        // National: top 10 states by cases
        const top10 = [...allFeatures]
            .sort((a, b) => b.properties.cases - a.properties.cases)
            .slice(0, 10);

        const states = top10.map(f => f.properties.abbr);
        const cases  = ['Cases', ...top10.map(f => f.properties.cases)];
        const deaths = ['Deaths', ...top10.map(f => f.properties.deaths)];

        columns     = [cases, deaths];
        chartTitle  = 'Top 10 States by Cases';

        chart = c3.generate({
            bindto: '#bar-chart',
            data: {
                columns,
                type: 'bar',
                colors: { Cases: '#f78166', Deaths: '#ff7b72' }
            },
            axis: {
                x: {
                    type: 'category',
                    categories: states,
                    tick: { rotate: -35, multiline: false },
                    height: 50
                },
                y: {
                    tick: { format: d => d >= 1e6 ? (d/1e6).toFixed(1)+'M' : d >= 1e3 ? (d/1e3).toFixed(0)+'K' : d }
                }
            },
            bar: { width: { ratio: 0.6 } },
            grid: { y: { show: true } },
            legend: { position: 'bottom' },
            size: { height: 190 },
            tooltip: {
                format: { value: d => fmtNum(d) }
            }
        });

        chartTitle = 'Top 10 States — Cases vs Deaths';
    } else {
        // State breakdown: cases, deaths, recovered
        const active = props.cases - props.deaths - props.recovered;
        columns = [
            ['Count', props.cases, props.deaths, props.recovered > 0 ? props.recovered : active]
        ];

        chart = c3.generate({
            bindto: '#bar-chart',
            data: {
                columns,
                type: 'bar',
                colors: {
                    Count: function(d) {
                        if (d.index === 0) return '#f78166';
                        if (d.index === 1) return '#ff7b72';
                        return '#3fb950';
                    }
                }
            },
            axis: {
                x: {
                    type: 'category',
                    categories: ['Total Cases', 'Deaths', 'Recovered'],
                    tick: { multiline: false }
                },
                y: {
                    tick: { format: d => d >= 1e6 ? (d/1e6).toFixed(1)+'M' : d >= 1e3 ? (d/1e3).toFixed(0)+'K' : d }
                }
            },
            bar: { width: { ratio: 0.5 } },
            grid: { y: { show: true } },
            legend: { show: false },
            size: { height: 190 },
            tooltip: {
                format: { value: d => fmtNum(d) }
            }
        });

        chartTitle = `${props.state} — Case Breakdown`;
    }

    document.getElementById('chart-title').textContent = chartTitle;
}

function buildTopList() {
    const top5 = [...allFeatures]
        .sort((a, b) => b.properties.cases - a.properties.cases)
        .slice(0, 5);

    const list = document.getElementById('top-list');
    list.innerHTML = '';

    top5.forEach((f, i) => {
        const p = f.properties;
        const item = document.createElement('div');
        item.className = 'top-item';
        item.innerHTML = `
            <span class="rank">#${i+1}</span>
            <span class="name">${p.state}</span>
            <span class="count">${fmtNum(p.cases)}</span>
        `;
        item.addEventListener('click', () => {
            selectedState = p;
            updateStateStats(p);
            buildChart(p);
            highlightCircle(p.state);
            // Fly to state
            const coords = f.geometry.coordinates;
            map.flyTo({ center: coords, zoom: 5.5, duration: 1200 });
        });
        list.appendChild(item);
    });
}

function highlightCircle(stateName) {
    map.setPaintProperty('covid-circles', 'circle-stroke-width', [
        'case',
        ['==', ['get', 'state'], stateName], 3,
        1.5
    ]);
    map.setPaintProperty('covid-circles', 'circle-stroke-color', [
        'case',
        ['==', ['get', 'state'], stateName], '#58a6ff',
        'rgba(255,255,255,0.3)'
    ]);
    map.setPaintProperty('covid-circles', 'circle-opacity', [
        'case',
        ['==', ['get', 'state'], stateName], 1,
        0.45
    ]);
}

function resetDashboard() {
    selectedState = null;

    // Reset circle styles
    map.setPaintProperty('covid-circles', 'circle-stroke-width', 1.5);
    map.setPaintProperty('covid-circles', 'circle-stroke-color', 'rgba(255,255,255,0.3)');
    map.setPaintProperty('covid-circles', 'circle-opacity', 0.75);

    // Reset info panel
    updateNationalStats();
    buildChart(null);

    // Fly back out
    map.flyTo({ center: [-96, 37.5], zoom: 3.5, duration: 1000 });
}

// ── Reset button ──────────────────────────────────────────────
document.getElementById('reset-btn').addEventListener('click', resetDashboard);
