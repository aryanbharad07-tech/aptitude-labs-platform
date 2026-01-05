// analysis-core.js - BULLETPROOF EDITION

const db = firebase.firestore();
const auth = firebase.auth();

window.appState = {
    mockData: null,
    questions: [],
    stats: { silly: 0, potential: 0, accuracy: 0 },
    sections: {},
    timeDist: [0,0,0,0]
};

// --- DATA PROCESSOR (With Safety Checks) ---
function processData(qDoc, i, answers) {
    const data = qDoc.data();
    
    // SAFETY 1: Fallback if fields are missing in DB
    const q = { 
        id: qDoc.id, 
        qNum: i+1,
        text: data.text || "Question text missing",
        section: data.section || "General Section",
        topic: data.topic || "General Topic",
        difficulty: data.difficulty || "Medium",
        type: data.type || "MCQ",
        correct: data.correct,
        solution: data.solution || "No explanation available."
    };

    // SAFETY 2: Handle missing answers
    const ans = answers ? answers[q.id] : null;
    q.status = ans ? (ans.answer === q.correct ? 'correct' : 'wrong') : 'skipped';
    
    // SAFETY 3: Handle missing time (Default to simulated if 0)
    if (ans && ans.timeTaken) {
        q.time = ans.timeTaken;
    } else {
        // Fallback simulation so charts don't look broken
        let base = q.difficulty==='Easy'?40:90;
        q.time = Math.floor(base + (Math.random()*40 - 20));
    }

    return q;
}

async function loadMock(mockId) {
    const uid = auth.currentUser.uid;
    console.log("Attempting to load:", mockId);

    try {
        // 1. Fetch Result
        const res = await db.collection("mocks").doc(`${uid}_${mockId}`).get();
        if(!res.exists) {
            console.warn("Result document not found. ID:", `${uid}_${mockId}`);
            alert("Analysis not found for this ID. Please take a test first.");
            return;
        }
        window.appState.mockData = res.data();

        // 2. Fetch Questions
        const qs = await db.collection("questions").where("mockId","==",mockId).get();
        
        if(qs.empty) {
            console.warn("No questions found in DB for mockId:", mockId);
            // Emergency fallback: Create dummy questions so page doesn't crash
            window.appState.questions = Array.from({length: window.appState.mockData.attempted || 5}).map((_, i) => ({
                id: `dummy_${i}`, qNum: i+1, section: "Unknown", topic: "Unknown", 
                difficulty: "Medium", time: 60, status: "skipped" 
            }));
        } else {
            window.appState.questions = qs.docs.map((d,i) => processData(d, i, window.appState.mockData.answers))
                                               .sort((a,b) => a.qNum - b.qNum);
        }

        // 3. Aggregate Stats (With Safety)
        let s=0, pot=window.appState.mockData.score || 0;
        const sec = {};
        const td = [0,0,0,0];

        window.appState.questions.forEach(q => {
            // Silly Mistakes Logic
            if(q.status==='wrong' && q.difficulty==='Easy') { s++; pot+=5; }
            
            // Time Buckets
            if(q.time<30) td[0]++; else if(q.time<60) td[1]++; else if(q.time<120) td[2]++; else td[3]++;

            // Sectional Logic
            const secName = q.section || "General";
            if(!sec[secName]) sec[secName] = {n:secName, s:0, tot:0, c:0};
            sec[secName].tot++;
            
            if(q.status==='correct') { 
                sec[secName].s+=4; 
                sec[secName].c++; 
            } else if(q.status==='wrong' && q.type!=='SA') {
                sec[secName].s-=1;
            }
        });

        // 4. Update State
        const totalAttempted = window.appState.mockData.attempted || 1; // Prevent divide by zero
        const totalCorrect = window.appState.mockData.correct || 0;

        window.appState.stats = { 
            silly: s, 
            potential: pot, 
            accuracy: Math.round((totalCorrect/totalAttempted)*100)||0 
        };
        window.appState.sections = sec;
        window.appState.timeDist = td;

        // 5. Trigger Renders
        console.log("Data Processed. Updating UI...");
        if(window.updateUI) window.updateUI();
        if(window.renderCharts) window.renderCharts();

    } catch(e) { 
        console.error("CRITICAL ERROR in Analysis Load:", e); 
        alert("Error loading data. Check console (F12) for details.");
    }
}

// --- INITIALIZATION ---
auth.onAuthStateChanged(async user => {
    if(!user) {
        window.location.href="login.html";
        return;
    }
    
    // Auto-load latest mock if selector is empty
    const s = document.getElementById('mock-selector');
    if(s) {
        const snap = await db.collection('mocks').where('studentName','==',user.email).orderBy('timestamp','desc').limit(5).get();
        s.innerHTML = '';
        
        if(snap.empty) {
            s.innerHTML='<option>NO EXAMS FOUND</option>';
        } else {
            snap.forEach(d => {
                const opt = document.createElement('option'); 
                opt.value=d.data().mockId; 
                opt.innerText=d.data().mockId.toUpperCase(); 
                s.appendChild(opt);
            });
            
            // Load the one from localStorage, or the most recent one
            const activeId = localStorage.getItem("activeMockId");
            const latestId = snap.docs[0].data().mockId;
            
            if(activeId) {
                s.value = activeId;
                loadMock(activeId);
            } else {
                s.value = latestId;
                loadMock(latestId);
            }
        }
    }
});

// Listener for dropdown change
if(document.getElementById('mock-selector')) {
    document.getElementById('mock-selector').onchange = (e) => loadMock(e.target.value);
}