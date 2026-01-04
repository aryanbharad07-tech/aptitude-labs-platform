/* analysis.js - Standardized Version */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Init Chart Defaults
    if(typeof ChartManager !== 'undefined') ChartManager.init();

    // 2. Auth Listener
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            // Standard navbar doesn't support custom profile updates here,
            // so we skip updateNavbarProfile() to avoid errors.
            loadAnalysisData(user.uid);
        } else {
            window.location.href = 'login.html';
        }
    });
});

const db = firebase.firestore();

// --- Data Fetching ---
async function loadAnalysisData(uid) {
    try {
        const attemptsRef = db.collection('users').doc(uid).collection('attempts');
        const snapshot = await attemptsRef.orderBy('timestamp', 'desc').limit(1).get();

        if (snapshot.empty) {
            console.log("No data found. Seeding dummy data for demo...");
            seedProData(); 
            return;
        }

        const data = snapshot.docs[0].data();
        renderDashboard(data);

    } catch (error) {
        console.error("Error:", error);
    }
}

// --- Render Logic ---
function renderDashboard(data) {
    // Header & KPI
    document.getElementById('mock-title').innerText = data.mockName;
    document.getElementById('meta-exam').innerText = data.examType || "CAT/IPMAT";
    document.getElementById('meta-date').innerText = data.date;
    
    document.getElementById('disp-score').innerText = data.score;
    document.getElementById('disp-rank').innerText = "#" + (data.rank || "100+");
    
    const pct = data.percentile || 0;
    document.getElementById('disp-pct').innerText = pct;
    document.getElementById('pct-ring').style.setProperty('--p', pct);
    
    const stats = data.stats || { correct: 0, wrong: 0 };
    const acc = (stats.correct + stats.wrong) > 0 ? Math.round((stats.correct / (stats.correct + stats.wrong)) * 100) : 0;
    document.getElementById('disp-acc').innerText = acc + "%";
    document.getElementById('acc-ring').style.setProperty('--p', acc);

    // Share Data
    document.getElementById('share-score').innerText = data.score;
    document.getElementById('share-rank').innerText = "#" + (data.rank || "--");
    document.getElementById('share-pct').innerText = pct;

    if (data.responses) {
        analyzeResponses(data.responses);
    }
}

function analyzeResponses(responses) {
    const sections = { "VARC": 0, "DILR": 0, "Quant": 0 };
    const topicStats = {}; 
    let timeCorrect = 0, nCorrect = 0;
    let timeWrong = 0, nWrong = 0;

    responses.forEach(r => {
        if(r.status === 'correct') sections[r.section || 'Quant'] += 4;
        else if(r.status === 'wrong') sections[r.section || 'Quant'] -= 1;

        if(r.status === 'correct') { timeCorrect += r.timeSpent; nCorrect++; }
        else if(r.status === 'wrong') { timeWrong += r.timeSpent; nWrong++; }

        if(!topicStats[r.topic]) topicStats[r.topic] = { total: 0, correct: 0 };
        topicStats[r.topic].total++;
        if(r.status === 'correct') topicStats[r.topic].correct++;
    });

    // Charts
    const userScores = [sections['VARC'], sections['DILR'], sections['Quant']];
    const topperScores = [45, 40, 50]; 
    if(typeof ChartManager !== 'undefined') {
        ChartManager.renderMain(document.getElementById('mainChart').getContext('2d'), { user: userScores, topper: topperScores });
    }

    // Weakness Radar
    const sortedTopics = Object.entries(topicStats).map(([k,v]) => ({
        topic: k, acc: (v.correct/v.total)*100
    })).sort((a,b) => a.acc - b.acc);

    if(typeof ChartManager !== 'undefined') {
        new Chart(document.getElementById('radarChart').getContext('2d'), {
            type: 'radar',
            data: {
                labels: sortedTopics.slice(0,5).map(t=>t.topic),
                datasets: [{
                    label: 'Accuracy',
                    data: sortedTopics.slice(0,5).map(t=>t.acc),
                    borderColor: '#f87171',
                    backgroundColor: 'rgba(248, 113, 113, 0.2)'
                }]
            },
            options: { plugins: { legend: {display:false} }, scales: { r: { ticks: {display:false}, grid: {color:'rgba(255,255,255,0.1)'}, pointLabels: {color:'#94a3b8'} } } }
        });
    }

    // Weak List
    document.getElementById('weakness-container').innerHTML = sortedTopics.slice(0,3).map(t => `
        <div class="weak-item" style="display:flex; justify-content:space-between; margin-bottom:8px; padding:8px; background:rgba(248,113,113,0.1); border-radius:6px;">
            <span style="font-weight:600; font-size:0.85rem;">${t.topic}</span>
            <span style="color:#f87171; font-weight:700;">${Math.round(t.acc)}%</span>
        </div>
    `).join('');

    // Honeycomb
    document.getElementById('q-palette').innerHTML = responses.map((r, i) => {
        let c = 's';
        if(r.status === 'correct') c = 'c';
        else if(r.status === 'wrong') c = 'w';
        return `<div class="q-node ${c}" onclick="openSolution(${i})">${r.qNo}</div>`;
    }).join('');
    window.currentResponses = responses;

    // Time Stats
    document.getElementById('time-correct').innerText = nCorrect ? Math.round(timeCorrect/nCorrect) + "s" : "--";
    document.getElementById('time-wrong').innerText = nWrong ? Math.round(timeWrong/nWrong) + "s" : "--";
    document.getElementById('time-wasted').innerText = Math.round(timeWrong/60) + "m";
}

function openSolution(idx) {
    const r = window.currentResponses[idx];
    document.getElementById('sol-title').innerText = `Question ${r.qNo}`;
    document.getElementById('sol-topic').innerText = r.topic;
    document.getElementById('sol-time').innerText = r.timeSpent + "s";
    
    const status = document.getElementById('sol-status');
    status.innerText = r.status.toUpperCase();
    status.className = `badge status ${r.status === 'correct' ? '' : 'text-red'}`;

    document.getElementById('solution-drawer').classList.remove('hidden');
}

function closeSolution() { document.getElementById('solution-drawer').classList.add('hidden'); }
function openShareModal() { document.getElementById('share-modal').classList.remove('hidden'); }
function closeShareModal() { document.getElementById('share-modal').classList.add('hidden'); }

// Standard navbar.js handles logout, so we don't strictly need it here, but keeping it safe if called directly
function logoutUser() { firebase.auth().signOut().then(() => window.location.href = 'login.html'); }

async function seedProData() {
    const user = firebase.auth().currentUser;
    if(!user) return;
    const topics = ["Algebra", "Geometry", "Arithmetic", "Number System", "Modern Math", "RC", "Grammar", "LR", "DI"];
    const responses = [];
    let score = 0, correct = 0, wrong = 0;
    for(let i=1; i<=60; i++) {
        const rand = Math.random();
        let status = 'skipped', time = Math.floor(Math.random()*120)+10;
        if(rand > 0.2) {
            if(rand > 0.45) { status = 'correct'; score+=4; correct++; }
            else { status = 'wrong'; score-=1; wrong++; }
        }
        responses.push({ qNo: i, section: i<=20?'VARC':(i<=40?'DILR':'Quant'), topic: topics[i%topics.length], status, timeSpent: time });
    }
    await db.collection('users').doc(user.uid).collection('attempts').add({
        mockName: "All India Open Mock (Pro)",
        examType: "IPMAT 2026",
        date: new Date().toDateString(),
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        score: score, rank: 42, percentile: 98.5,
        stats: { correct, wrong, skipped: 60 - correct - wrong },
        responses: responses
    });
    setTimeout(() => location.reload(), 1000);
}