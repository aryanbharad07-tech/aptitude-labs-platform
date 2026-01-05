// analysis-ui.js - FIXED VERSION

// 1. UI Elements Cache
const ui = {
    score: document.getElementById('score-val'),
    total: document.getElementById('total-marks'),
    perc: document.getElementById('percentile-val'),
    secRow: document.getElementById('hero-sections'),
    xp: document.getElementById('xp-val'),
    pot: document.getElementById('potential-val'),
    silly: document.getElementById('silly-count'),
    acc: document.getElementById('acc-val'),
    ai: document.getElementById('ai-insights'),
    grid: document.getElementById('q-grid'),
    table: document.getElementById('analysis-tbody'),
    modal: document.getElementById('sol-modal')
};

// 2. Main Update Function (Called by Core)
window.updateUI = function() {
    console.log("UI Update Triggered");
    const s = window.appState;
    if (!s || !s.mockData) return;

    const m = s.mockData;

    // --- A. HERO SECTION ---
    if(ui.score) ui.score.innerText = m.score;
    if(ui.total) ui.total.innerText = m.totalMarks;
    
    // Percentile Calculation (Mock)
    const perc = ((m.score / m.totalMarks * 100) + 10).toFixed(1);
    if(ui.perc) ui.perc.innerText = `${perc} %ile`;
    
    if(ui.xp) ui.xp.innerText = "+" + (m.xpGained || 150);

    // --- B. SECTION PILLS ---
    if(ui.secRow) {
        ui.secRow.innerHTML = '';
        const cols = ['#38bdf8', '#a78bfa', '#fbbf24']; // Blue, Purple, Orange
        let i = 0;
        
        // Safety check for sections
        const sectionsToRender = s.sections || { "General": { n: "General", s: m.score, c: m.correct, tot: m.attempted } };

        Object.values(sectionsToRender).forEach((sec) => {
            const acc = sec.tot > 0 ? Math.round((sec.c / sec.tot) * 100) : 0;
            const col = cols[i % 3];
            i++;

            ui.secRow.innerHTML += `
                <div class="sec-pill" style="border-bottom: 2px solid ${col}">
                    <div class="sp-head">
                        <span>${sec.n.split(' ')[0]}</span>
                        <span style="color:${col}">${sec.s}</span>
                    </div>
                    <div class="sp-val">
                        ${sec.c}/${sec.tot} 
                        <span style="font-size:0.8rem; color:${col}; margin-left:5px;">${acc}%</span>
                    </div>
                    <div class="sp-bar">
                        <div class="sp-fill" style="width:${acc}%; background:${col}"></div>
                    </div>
                </div>
            `;
        });
    }

    // --- C. STATS & AI ---
    if(ui.pot) ui.pot.innerText = s.stats.potential || m.score;
    if(ui.silly) ui.silly.innerText = s.stats.silly || 0;
    if(ui.acc) ui.acc.innerText = (s.stats.accuracy || 0) + "%";

    if(ui.ai) {
        ui.ai.innerHTML = '';
        const addMsg = (t, c) => ui.ai.innerHTML += `<div class="ai-msg ${c}" style="border-left: 3px solid ${c==='good'?'#34d399':'#f87171'}; padding:8px; margin-bottom:5px; background:rgba(255,255,255,0.05); font-size:0.8rem;">${t}</div>`;
        
        if(s.stats.silly > 0) addMsg(`${s.stats.silly} marks lost to silly errors.`, 'bad');
        else addMsg(`Clean attempt. Great focus!`, 'good');
        
        if(s.stats.accuracy > 80) addMsg(`High precision performance.`, 'good');
        else if(s.stats.accuracy < 50) addMsg(`Accuracy needs improvement.`, 'bad');
    }

    // --- D. HEATMAP (Topic) ---
    const tBox = document.getElementById('topic-heatmap'); 
    if(tBox) {
        tBox.innerHTML = '';
        // Aggregate topics
        const topics = {};
        s.questions.forEach(q => {
            const tName = q.topic || "General";
            if(!topics[tName]) topics[tName] = {c:0, t:0};
            topics[tName].t++;
            if(q.status === 'correct') topics[tName].c++;
        });

        Object.entries(topics).forEach(([t, d]) => {
            const acc = Math.round((d.c / d.t) * 100);
            const colorClass = acc > 75 ? 'tp-high' : 'tp-low';
            const colorHex = acc > 75 ? '#34d399' : '#f87171';
            
            tBox.innerHTML += `
                <div class="topic-pill" style="border:1px solid ${colorHex}; padding:8px; border-radius:6px; text-align:center; min-width:80px;">
                    <span style="display:block; font-weight:800; font-size:1rem; color:${colorHex}">${acc}%</span> 
                    <span style="font-size:0.7rem; color:#9ca3af">${t}</span>
                </div>
            `;
        });
    }

    // --- E. GRIDS & TABLES ---
    // This calls the function that was MISSING in your previous code
    renderGrid('status'); 
    renderTable();
};

// 3. The Missing Function (Grid Renderer)
window.renderGrid = function(mode) {
    if(!ui.grid) return;
    ui.grid.innerHTML = '';
    
    // Toggle Button Styles
    document.querySelectorAll('.tg-btn').forEach(b => {
        if(b.dataset.mode === mode) b.classList.add('active');
        else b.classList.remove('active');
    });

    window.appState.questions.forEach(q => {
        const d = document.createElement('div');
        d.innerText = q.qNum;
        d.style.cssText = "aspect-ratio:1; display:flex; align-items:center; justify-content:center; border-radius:4px; font-weight:700; cursor:pointer; font-size:0.8rem;";
        
        // Color Logic
        if(mode === 'status') {
            if(q.status === 'correct') d.style.background = 'rgba(52, 211, 153, 0.2)'; // Green
            else if(q.status === 'wrong') d.style.background = 'rgba(248, 113, 113, 0.2)'; // Red
            else d.style.background = '#27272a'; // Grey
            
            if(q.status === 'correct') d.style.color = '#34d399';
            else if(q.status === 'wrong') d.style.color = '#f87171';
            else d.style.color = '#71717a';
        } else {
            // Heatmap Mode
            const t = q.time || 0;
            if(t < 30) { d.style.background = '#064e3b'; d.style.color = '#6ee7b7'; } // Fast
            else if(t < 90) { d.style.background = '#1e293b'; d.style.color = '#94a3b8'; } // Normal
            else { d.style.background = '#450a0a'; d.style.color = '#fca5a5'; } // Slow
        }

        d.onclick = () => openSol(q);
        ui.grid.appendChild(d);
    });
};

// 4. Table Renderer
window.renderTable = function() {
    if(!ui.table) return;
    ui.table.innerHTML = '';
    window.appState.questions.forEach(q => {
        const statusColor = q.status === 'correct' ? '#34d399' : (q.status === 'wrong' ? '#f87171' : '#9ca3af');
        ui.table.innerHTML += `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05)">
                <td style="padding:10px;">${q.qNum}</td>
                <td>${(q.section || "Gen").substr(0,10)}</td>
                <td>${q.topic || "-"}</td>
                <td>${q.difficulty || "-"}</td>
                <td>${q.time || 0}s</td>
                <td style="color:${statusColor}">${q.status}</td>
            </tr>`;
    });
};

// 5. Modal Logic
window.openSol = function(q) {
    const modal = ui.modal;
    if(!modal) return;
    
    modal.innerHTML = `
        <div class="modal-box" style="background:#18181b; padding:20px; border-radius:10px; width:600px; max-width:90%; border:1px solid #333;">
            <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                <h3 style="margin:0; color:#fff;">Q${q.qNum}: ${q.topic}</h3>
                <button onclick="document.getElementById('sol-modal').classList.add('hidden')" style="background:none; border:none; color:#fff; cursor:pointer;">✕</button>
            </div>
            <div style="color:#e5e7eb; margin-bottom:20px; font-size:1rem;">${q.text}</div>
            <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:8px; margin-bottom:15px;">
                <div style="color:#9ca3af; font-size:0.8rem; margin-bottom:5px;">YOUR ANSWER</div>
                <div style="color:${q.status==='correct'?'#34d399':'#f87171'}; font-weight:bold;">${q.userAnswer || "Skipped"}</div>
            </div>
             <div style="background:rgba(52, 211, 153, 0.1); padding:15px; border-radius:8px;">
                <div style="color:#34d399; font-size:0.8rem; margin-bottom:5px;">CORRECT ANSWER</div>
                <div style="color:#fff; font-weight:bold;">${q.correct}</div>
                <div style="margin-top:10px; font-size:0.9rem; color:#d1d5db;">${q.solution}</div>
            </div>
        </div>
    `;
    modal.classList.remove('hidden');
};

// Event Listeners for Toggles
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tg-btn').forEach(btn => {
        btn.onclick = () => renderGrid(btn.dataset.mode);
    });
});