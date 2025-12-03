// --- 1. CONFIGURATION ---
const SERIES_CONFIG = {
    "INDORE": { count: 20, prefix: "INDORE", isLocked: true, maxMarks: 360, baseXP: 500 },
    "ROHTAK": { count: 20, prefix: "ROHTAK", isLocked: true, maxMarks: 480, baseXP: 600 },
    "JIPMAT": { count: 20, prefix: "JIPMAT", isLocked: true, maxMarks: 400, baseXP: 550 },
    "IIMKBMSAT": { count: 5, prefix: "BMSAT", isLocked: true, maxMarks: 400, baseXP: 500 }
};

let hideCompleted = false; // Filter State

// --- 2. CORE FUNCTIONS ---

function handleMockAction(mockId, isAttempted) {
    const config = SERIES_CONFIG[mockId.split('-')[0]];
    if (mockId === 'TEST-MOCK-01') return selectMock(mockId);
    if (isAttempted) return; // In real app, go to analysis
    if (config && config.isLocked) { alert('Series Locked.'); return; }
    selectMock(mockId);
}

function selectMock(mockId) {
    localStorage.setItem("activeMockId", mockId);
    window.location.href = 'instructions.html'; 
}

function enableSpotlight() {
    const cards = document.querySelectorAll('.flip-container');
    cards.forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
            card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
        });
    });
}

// Toggle Filter
function toggleCompletedMocks() {
    hideCompleted = document.getElementById('toggle-completed').checked;
    // Re-render current active series
    const activeTab = document.querySelector('.series-tab.active');
    if(activeTab) {
        const seriesId = activeTab.getAttribute('data-series');
        if (seriesId !== 'ADMIN') renderMocks(seriesId);
    }
}

// --- 3. RENDER LOGIC ---
function renderMocks(seriesId) {
    if (seriesId === 'ADMIN') return; // Admin is static

    const config = SERIES_CONFIG[seriesId];
    if (!config) return;

    const container = document.getElementById(`${seriesId.toLowerCase()}-mocks`);
    if (!container) return;
    
    let htmlContent = '';
    
    // Stats Accumulators
    let totalAttempted = 0;
    let sumPercentile = 0;
    
    for (let i = 1; i <= config.count; i++) {
        const mockNum = i.toString().padStart(2, '0');
        const mockID = `${config.prefix}-MOCK-${mockNum}`;
        const isLocked = config.isLocked; 

        // Simulation Logic
        const isAttempted = (i <= 5 && seriesId === 'INDORE'); 
        const isTopper = (i === 2 && seriesId === 'INDORE'); 

        // Filter: Skip if hideCompleted is true
        if (hideCompleted && isAttempted) continue;

        // Stats Logic
        if (isAttempted) {
            totalAttempted++;
            sumPercentile += isTopper ? 100 : (85 + Math.random() * 10);
        }
        
        const userScore = isAttempted ? Math.floor(Math.random() * (config.maxMarks - 100) + 100) : 0;
        const xpEarned = isAttempted ? config.baseXP : 0;
        const percentile = isTopper ? '100.0' : (isAttempted ? (85 + Math.random() * 10).toFixed(1) : '—');
        const accuracy = isAttempted ? (70 + Math.random() * 25).toFixed(0) : '—';

        // Dynamic Classes
        let containerClass = "flip-container";
        let chipClass, chipText, icon;
        
        if (isTopper) { containerClass += " type-topper"; chipClass = "chip-gold"; chipText = "Topper"; icon = "emoji_events"; }
        else if (isAttempted) { containerClass += " type-attempted"; chipClass = "chip-done"; chipText = "Done"; icon = "check_circle"; }
        else if (isLocked) { chipClass = "chip-locked"; chipText = "Lock"; icon = "lock"; containerClass += " locked"; }
        else { chipClass = "chip-ready"; chipText = "Open"; icon = "bolt"; }

        // Stagger Animation: Delay increases by 0.05s per card
        const delay = i * 0.05; 

        htmlContent += `
            <div class="${containerClass}" style="animation-delay: ${delay}s">
                <span class="flip-icon material-icons-round" onclick="this.closest('.flip-container').classList.toggle('flipped'); event.stopPropagation();">sync</span>
                
                <div class="front" onclick="handleMockAction('${mockID}', ${isAttempted})">
                    <div class="card-top">
                        <div class="mock-chip ${chipClass}"><span class="material-icons-round" style="font-size:12px;">${icon}</span> ${chipText}</div>
                    </div>
                    <div class="card-mid">
                        <div class="mock-number">${mockNum}</div>
                        <div class="mock-series-lbl">${seriesId.substring(0,6)}</div>
                    </div>
                    <div class="card-bot">
                        <div class="meta-info">
                            <span><i class="material-icons-round" style="font-size:14px;">timer</i> 120m</span>
                            <span><i class="material-icons-round" style="font-size:14px;">quiz</i> 90Q</span>
                        </div>
                    </div>
                </div>
                
                <div class="back" onclick="handleMockAction('${mockID}', ${isAttempted})">
                    ${isAttempted ? `
                        <div class="score-label-small">Your Score</div>
                        <div class="score-value-main" style="color: ${isTopper ? '#fcd34d' : '#10b981'};">
                            ${userScore}<span style="font-size:1rem; color:#64748b;">/${config.maxMarks}</span>
                        </div>
                        <div class="stat-grid">
                            <div class="stat-box"><div class="stat-val">${percentile}%</div><div class="stat-lbl">%ile</div></div>
                            <div class="stat-box"><div class="stat-val">${accuracy}%</div><div class="stat-lbl">Acc</div></div>
                        </div>
                        <button class="btn-launch-full">Analysis</button>
                    ` : `
                        <div class="score-value-main" style="color:#64748b;">${config.maxMarks}</div>
                        <div class="score-label-small" style="margin-bottom:20px;">Max Marks</div>
                        <button class="btn-launch-full" ${isLocked ? 'disabled style="opacity:0.5; background:#334155;"' : ''}>${isLocked ? 'Unlock' : 'Start'}</button>
                    `}
                </div>
            </div>
        `;
    }
    container.innerHTML = htmlContent;
    
    // UPDATE HEADER STATS
    updateStats(totalAttempted, config.count, sumPercentile);
}

function updateStats(attempted, total, sumPerc) {
    const progress = Math.round((attempted / total) * 100);
    const avgPerc = attempted > 0 ? (sumPerc / attempted).toFixed(1) : '--';
    const qsSolved = attempted * 90; // Approx 90 Qs per mock

    document.getElementById('stat-progress').innerHTML = `${progress}<span>%</span>`;
    document.getElementById('stat-perc').innerText = avgPerc;
    document.getElementById('stat-qs').innerText = qsSolved;
}

function switchSeries(targetSeries) {
    document.querySelectorAll('.series-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.mock-series').forEach(series => series.classList.remove('active'));

    const activeTab = document.querySelector(`.series-tab[data-series="${targetSeries}"]`);
    const activeContainer = document.getElementById(`series-${targetSeries}`);
    
    if (activeTab) activeTab.classList.add('active');
    if (activeContainer) {
        activeContainer.classList.add('active');
        renderMocks(targetSeries);
    }
    enableSpotlight();
}

document.addEventListener('DOMContentLoaded', function() {
    renderMocks("INDORE"); // Initial load
    
    const tabsContainer = document.getElementById('series-tabs');
    if (tabsContainer) {
        tabsContainer.addEventListener('click', (event) => {
            const tab = event.target.closest('.series-tab');
            if (tab) {
                const seriesId = tab.getAttribute('data-series');
                switchSeries(seriesId);
            }
        });
    }
    switchSeries('ADMIN'); 
});