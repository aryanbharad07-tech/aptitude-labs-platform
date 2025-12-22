/* analysis.js */
document.addEventListener('DOMContentLoaded', () => {
    ChartManager.init();

    // Simulate Data Fetch
    setTimeout(() => {
        const data = { score: 186, rank: 42, pct: 99.5, acc: 88, sectional: {user:[62,54,70], topper:[50,45,65]} };

        // Fill KPI
        document.getElementById('disp-score').innerText = data.score;
        document.getElementById('disp-rank').innerText = "#" + data.rank;
        document.getElementById('disp-pct').innerText = data.pct;
        document.getElementById('disp-acc').innerText = data.acc + "%";

        // Fill Share
        document.getElementById('share-score').innerText = data.score;
        document.getElementById('share-rank').innerText = "#" + data.rank;
        document.getElementById('share-pct').innerText = data.pct;

        // Render Charts
        ChartManager.renderMain(document.getElementById('mainChart').getContext('2d'), data.sectional);
        ChartManager.renderScatter(document.getElementById('scatterChart').getContext('2d'));
        ChartManager.renderRadar(document.getElementById('radarChart').getContext('2d'));

        // Render Table
        const rows = [{n:'VARC', s:62, a:24, ac:75, t:'40m'}, {n:'DILR', s:54, a:20, ac:90, t:'45m'}, {n:'Quant', s:70, a:22, ac:95, t:'35m'}];
        document.getElementById('section-body').innerHTML = rows.map(r => `
            <tr><td style="font-weight:600">${r.n}</td><td style="color:var(--primary); font-weight:700">${r.s}</td><td>${r.a}</td><td>${r.ac}%</td><td>${r.t}</td></tr>
        `).join('');

        // Render Palette
        document.getElementById('q-palette').innerHTML = Array.from({length:66}, (_,i)=>`<div class="q-node ${Math.random()>0.3?'c':'w'}"></div>`).join('');

        // Render Solutions
        filterSol('all');

        // Render Weakness
        document.getElementById('weakness-container').innerHTML = `
            <div class="weak-item"><span>Geometry</span> <span style="color:var(--red); font-weight:700">-8 Marks</span></div>
            <div class="weak-item"><span>Para Jumbles</span> <span style="color:var(--red); font-weight:700">-5 Marks</span></div>
        `;
    }, 500);
});

function switchTab(id) {
    document.querySelectorAll('.tab-pane').forEach(e => e.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.mini-tab').forEach(e => e.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

function filterSol(type) {
    document.querySelectorAll('.f-pill').forEach(b => b.classList.remove('active'));
    event && event.target.classList.add('active');
    // Mock Data
    const list = document.getElementById('solution-container');
    list.innerHTML = Array.from({length:5}, (_,i)=>`
        <div class="sol-item">
            <div><div style="font-weight:700; color:#fff">Q${i+1}</div><div class="sol-meta">Algebra • Hard</div></div>
            <div class="sb-wrong">WRONG</div>
        </div>
    `).join('');
}

function runSimulation() {
    const check = document.getElementById('sim-negatives').checked;
    const res = document.getElementById('sim-result-box');
    if (check) {
        res.classList.remove('hidden');
        document.getElementById('sim-new-rank').innerText = "#28"; // Better rank
    } else {
        res.classList.add('hidden');
    }
}

function openShareModal() { document.getElementById('share-modal').classList.remove('hidden'); }
function closeShareModal() { document.getElementById('share-modal').classList.add('hidden'); }
function downloadStory() {
    html2canvas(document.getElementById('insta-card')).then(c => {
        const a = document.createElement('a'); a.download = 'Story.png'; a.href = c.toDataURL(); a.click();
    });
}