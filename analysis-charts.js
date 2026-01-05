// analysis-charts.js

let charts = {};

window.renderCharts = function() {
    const s = window.appState;
    const colors = { blue:'#38bdf8', green:'#34d399', orange:'#fbbf24', grid:'rgba(255,255,255,0.05)' };

    // 1. Accuracy
    if(charts.acc) charts.acc.destroy();
    charts.acc = new Chart(document.getElementById('accuracyDoughnut'), {
        type: 'doughnut',
        data: { datasets: [{ data: [s.stats.accuracy, 100-s.stats.accuracy], backgroundColor: [colors.blue, '#232328'], borderWidth: 0 }] },
        options: { cutout: '85%', plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false }
    });

    // 2. Time Dist
    if(charts.td) charts.td.destroy();
    charts.td = new Chart(document.getElementById('timeDistChart'), {
        type: 'bar',
        data: { labels: ['<30s', '1m', '2m', '>2m'], datasets: [{ data: s.timeDist, backgroundColor: colors.orange, borderRadius: 4 }] },
        options: { 
            plugins: { legend: { display: false } }, 
            scales: { x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 9 } } }, y: { display: false } },
            maintainAspectRatio: false 
        }
    });

    // 3. Radar
    if(charts.rad) charts.rad.destroy();
    charts.rad = new Chart(document.getElementById('radarChart'), {
        type: 'radar',
        data: {
            labels: ['ACC', 'SPD', 'STM', 'SEL', 'STB'],
            datasets: [{ 
                data: [s.stats.accuracy, 75, 80, 65, 90], // Sim data
                backgroundColor: 'rgba(56, 189, 248, 0.2)', borderColor: colors.blue, borderWidth: 2, pointRadius: 0 
            }]
        },
        options: {
            scales: { r: { angleLines: { color: colors.grid }, grid: { color: colors.grid }, pointLabels: { color: '#94a3b8', font: { size: 10 } }, ticks: { display: false } } },
            plugins: { legend: { display: false } }, maintainAspectRatio: false
        }
    });

    // 4. Fatigue
    if(charts.fat) charts.fat.destroy();
    charts.fat = new Chart(document.getElementById('fatigueChart'), {
        type: 'line',
        data: {
            labels: s.questions.map(q=>q.qNum),
            datasets: [{ data: s.questions.map(q=>q.time), borderColor: colors.green, borderWidth: 2, pointRadius: 0, tension: 0.4 }]
        },
        options: { plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } }, maintainAspectRatio: false }
    });
};