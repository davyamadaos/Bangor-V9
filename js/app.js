let allData = [];
let chart;
let currentRange = '12h';

const GAUGE = (v) => (14.921 * v - 1675.7);

async function loadData() {
    try {
        const res = await fetch('./data/live.json?v=' + Date.now());
        const json = await res.json();

        if (!json || !json.rows) {
            console.error('Invalid data', json);
            return;
        }

        allData = json.rows
            .map(r => ({
                time: new Date(r.timestamp),
                level: Number(r.absolute)
            }))
            .filter(d => !isNaN(d.level));

        render();

        document.getElementById('updated').textContent =
            'Updated: ' + new Date().toLocaleTimeString();

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

    return allData.filter(d =>
        (latestTime - d.time) / 3600000 <= hours
    );
}

function render() {
    const data = getFiltered();
    if (!data.length) return;

    const latest = data[data.length - 1];

    document.getElementById('level').textContent = latest.level.toFixed(3);
    document.getElementById('gauge').textContent = GAUGE(latest.level).toFixed(1);

    const first = data[Math.max(0, data.length - 8)];
    const rate = (latest.level - first.level) /
        ((latest.time - first.time) / 3600000);

    const trendEl = document.getElementById('trend');
    trendEl.textContent = rate > 0 ? 'Rising' : 'Falling';
    trendEl.style.color = rate > 0 ? '#2ED573' : '#FF4757';

    const labels = data.map(d => d.time);
    const levelData = data.map(d => d.level);
    const gaugeData = data.map(d => GAUGE(d.level));

    if (!chart) {
        chart = new Chart(document.getElementById('riverChart'), {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'Level (m)',
                        data: levelData,
                        borderColor: '#36A2FF',
                        borderWidth: 3,
                        pointRadius: 0,
                        tension: 0.25,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Gauge',
                        data: gaugeData,
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
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            tooltipFormat: 'dd/MM HH:mm'
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
        chart.data.labels = labels;
        chart.data.datasets[0].data = levelData;
        chart.data.datasets[1].data = gaugeData;
        chart.update();
    }
}

setInterval(loadData, 900000);
loadData();
setRange('12h');