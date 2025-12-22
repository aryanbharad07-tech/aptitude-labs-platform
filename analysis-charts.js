/* analysis-charts.js */
const ChartManager = {
    defaults: { color: '#9CA3AF', borderColor: 'rgba(255,255,255,0.08)', font: "'Inter', sans-serif" },
    init: function() {
        Chart.defaults.color = this.defaults.color;
        Chart.defaults.borderColor = this.defaults.borderColor;
        Chart.defaults.font.family = this.defaults.font;
    },
    renderMain: function(ctx, data) {
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['VARC', 'DILR', 'Quant'],
                datasets: [
                    { label: 'You', data: data.user, backgroundColor: '#38bdf8', borderRadius: 4 },
                    { label: 'Topper', data: data.topper, type: 'line', borderColor: '#fff', borderDash:[5,5] }
                ]
            },
            options: {
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    },
    renderScatter: function(ctx) {
        const d = Array.from({length:30}, ()=>({x:Math.random()*120+10, y:Math.floor(Math.random()*3)+1}));
        new Chart(ctx, {
            type: 'scatter',
            data: { datasets: [{ label: 'Q', data: d, backgroundColor: '#a78bfa' }] },
            options: {
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { title: { display: true, text: 'Seconds' } },
                    y: { ticks: { callback: v=>['Easy','Med','Hard'][v-1] }, min:0, max:4 }
                }
            }
        });
    },
    renderRadar: function(ctx) {
        new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Alg', 'Geo', 'Num', 'Mod', 'Ari'],
                datasets: [{ label: 'Acc%', data: [80, 50, 60, 90, 70], borderColor: '#34d399', backgroundColor: 'rgba(52, 211, 153, 0.2)' }]
            },
            options: {
                maintainAspectRatio: false,
                scales: { r: { grid: { color: 'rgba(255,255,255,0.1)' }, pointLabels: { color: '#9CA3AF' }, ticks: { display: false } } }
            }
        });
    }
};