let allData = [];
let chart;
let currentRange = '12h';

const GAUGE = (v) => (14.921 * v - 1675.7);

async function loadData() {
    try {
        const res = await fetch('./data/live.json?v=' + Date.now());
        const json = await res.json();

        if (!json || !json.rows) {
            console.error('Invalid data format:', json);
            return;
        }

        allData = json.rows
            .map(r => {
                const t = new Date(r.timestamp).getTime();
                const level = Number(r.absolute);
                return { time: t, level };
            })
            .filter(d => !isNaN(d.time) && !isNaN(d.level))
            .sort((a, b) => a.time - b.time);

        render();

        const updatedEl = document.getElementById('updated');
        if (updatedEl) {
            updatedEl.textContent = 'Updated: ' + new Date().toLocaleTimeString();
        }

    } catch (e) {
        console.error('Load error:', e);
    }
}

function setRange(r) {
    currentRange = r;
    render();
}

function getFiltered() {
    if (!allData.length) return [];

    const latestTime = allData[allData.length - 1].time;

    let hours = 99999;
    if (currentRange === '6h') hours = 6;
    if (currentRange === '12h') hours = 12;
    if (currentRange === '24h') hours = 24;
    if (currentRange === '48h') hours = 48;
    if (currentRange === '7d') hours = 168;
    if (currentRange === '3wk') hours = 504;

    return allData.filter(d => (latestTime - d.time) / 3600000 <= hours);
}

function render() {
    const data = getFiltered();

    if (!data.length) {
        console.warn('No chart data available');
        return;
    }

    const latest = data[data.length - 1];

    document.getElementById('level').textContent = latest.level.toFixed(3);
    document.getElementById('gauge').textContent = GAUGE(latest.level).toFixed(1);

    const first = data[Math.max(0, data.length - 10)];
    const rate = (latest.level - first.level) / ((latest.time - first.time) / 3600000);

    const trendEl = document.getElementById('trend');
    trendEl.textContent = rate > 0 ? 'Rising' : 'Falling';
    trendEl.style.color = rate > 0 ? '#2ED573' : '#FF4757';

    // IMPORTANT: V4-STABLE CHART FORMAT (x/y pairs)
    const levelSeries = data.map(d => ({ x: d.time, y: d.level }));
    const gaugeSeries = data.map(d => ({ x: d.time, y: GAUGE(d.level) }));

    if (!chart) {
        chart = new Chart(document.getElementById('riverChart'), {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'Level (m)',
                        data: levelSeries,
                        borderColor: '#36A2FF',
                        borderWidth: 3,
                        pointRadius: 0,
                        tension: 0.25,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Gauge',
                        data: gaugeSeries,
                        borderColor: '#FFC533',
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.25,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                parsing: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            tooltipFormat: 'dd/MM HH:mm'
                        },
                        ticks: {
                            maxRotation: 0,
                            autoSkip: true
                        }
                    },
                    y: {
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Level (m)'
                        }
                    },
                    y1: {
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        title: {
                            display: true,
                            text: 'Gauge'
                        }
                    }
                }
            }
        });
    } else {
        chart.data.datasets[0].data = levelSeries;
        chart.data.datasets[1].data = gaugeSeries;
        chart.update();
    }
}

setInterval(loadData, 900000);
loadData();
setRange('12h');