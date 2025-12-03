// --- CONFIGURATION ---
const firebaseConfig = { apiKey: "AIzaSyBTbfSlz0xvfBzAWmJzXDGbIC6Up0-6eU4", authDomain: "aptitudelabs-in.firebaseapp.com", projectId: "aptitudelabs-in", storageBucket: "aptitudelabs-in.firebasestorage.app", messagingSenderId: "175469863880", appId: "1:175469863880:web:b7b25ed27120665af716fd" };
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// --- EXAM RULES ---
const PATTERNS = {
    "TEST_MOCK_1": { 
        sections: ["QA (Short Answer)", "QA (MCQ)", "Verbal Ability"], 
        limits: [2, 2, 1], // 2min, 2min, 1min (Total 5 mins)
        switching: false 
    },
    "SAMPLE": { 
        sections: ["QA (Short Answer)", "QA (MCQ)", "Verbal Ability"], 
        limits: [2, 2, 2], // Testing limits
        switching: false 
    },
    "INDORE": { 
        sections: ["QA (Short Answer)", "QA (MCQ)", "Verbal Ability"], 
        limits: [40, 40, 40], 
        switching: false 
    },
    "ROHTAK": { 
        sections: ["Quantitative Ability", "Logical Reasoning", "Verbal Ability"], 
        limits: [120], 
        switching: true 
    },
    "JIPMAT": { 
        sections: ["Quantitative Aptitude", "DILR", "Verbal Ability"], 
        limits: [150], 
        switching: true 
    }
};

// --- STATE ---
let currentConfig = PATTERNS["INDORE"];
let activeSectionIndex = 0;
let sectionTimer = 0;
let timerInterval = null;
let allQuestions = [];
let sectionQuestions = [];
let userAnswers = {};
let activeMockId = "";
let currentQIdx = 0;

// --- INITIALIZATION ---
window.onload = function() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            document.getElementById('student-name').innerText = user.email.split('@')[0];
            activeMockId = localStorage.getItem("activeMockId");
            
            if(!activeMockId) {
                alert("No test selected. Returning to dashboard.");
                window.location.href = "dashboard.html";
                return;
            }
            
            setupExamPattern();
        } else {
            window.location.href = "login.html";
        }
    });
};

function setupExamPattern() {
    // 1. Detect Pattern
    if (activeMockId.includes("TEST")) currentConfig = PATTERNS["TEST_MOCK_1"];
    else if (activeMockId.includes("SAMPLE")) currentConfig = PATTERNS["SAMPLE"];
    else if (activeMockId.includes("ROHTAK")) currentConfig = PATTERNS["ROHTAK"];
    else if (activeMockId.includes("JIPMAT")) currentConfig = PATTERNS["JIPMAT"];
    else currentConfig = PATTERNS["INDORE"];

    // 2. Init Timer
    sectionTimer = currentConfig.limits[0] * 60; 

    // 3. Start Loading
    renderTabs();
    fetchQuestions();
}

async function fetchQuestions() {
    console.log("Fetching questions for:", activeMockId);
    try {
        const snapshot = await db.collection('questions').where('mockId', '==', activeMockId).get();
        
        if (snapshot.empty) { 
            alert("This mock has no questions uploaded yet. Contact Admin."); 
            return; 
        }

        // Process & Sort by Question Number (CRITICAL FIX)
        allQuestions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allQuestions.sort((a, b) => (a.qNumber || 0) - (b.qNumber || 0));

        // Start Exam
        loadSection(0);
        startTimer();

    } catch (error) { 
        console.error(error); 
        alert("Error loading questions. Please check internet."); 
    }
}

// --- CORE ENGINE ---
function loadSection(index) {
    activeSectionIndex = index;
    const secName = currentConfig.sections[index];

    // Filter questions for this section
    // Fix: Strict matching to avoid mixing "QA" and "QA (MCQ)"
    sectionQuestions = allQuestions.filter(q => q.section === secName);
    
    // If no questions found for exact name, try loose match (fallback)
    if(sectionQuestions.length === 0) {
        sectionQuestions = allQuestions.filter(q => q.section.startsWith(secName.split(' ')[0]));
    }

    renderTabs();
    renderPalette();
    
    // Reset to Q1 of this section
    if(sectionQuestions.length > 0) loadQuestionUI(0);
    else document.getElementById('question-text').innerText = "No questions in this section.";
}

function switchSection(index) {
    if (currentConfig.switching) loadSection(index);
}

function renderTabs() {
    const tabContainer = document.querySelector('.sections-tab');
    tabContainer.innerHTML = '';
    currentConfig.sections.forEach((secName, index) => {
        const btn = document.createElement('button');
        btn.innerText = secName;
        btn.className = (index === activeSectionIndex) ? 'active-sec' : '';
        
        if (!currentConfig.switching) {
            btn.disabled = true; 
            btn.style.cursor = "not-allowed";
            btn.style.opacity = (index === activeSectionIndex) ? "1" : "0.5";
        } else {
            btn.onclick = () => switchSection(index);
        }
        tabContainer.appendChild(btn);
    });
}

// --- RENDERING QUESTIONS ---
function loadQuestionUI(idx) {
    currentQIdx = idx;
    if(!sectionQuestions[idx]) return;
    const q = sectionQuestions[idx];
    
    // Header Info
    document.getElementById('q-number-display').innerText = idx + 1;
    document.getElementById('q-type-label').innerText = q.type;
    
    // Split Screen Logic
    const left = document.getElementById('left-pane');
    const right = document.getElementById('right-pane');
    
    if (q.type === 'RC') {
        left.classList.remove('hidden'); 
        right.classList.remove('full-width');
        document.getElementById('passage-container').innerHTML = q.passage;
    } else {
        left.classList.add('hidden'); 
        right.classList.add('full-width');
    }

    // Question Content
    document.getElementById('question-text').innerText = q.text;
    
    // Options / Input
    const opts = document.getElementById('options-container');
    opts.innerHTML = '';
    
    // PRE-FILL USER ANSWER
    const saved = userAnswers[q.id];

    if(q.type === 'SA') {
        const inp = document.createElement('input');
        inp.className = 'sa-input';
        inp.placeholder = "Type your answer here";
        if(saved) inp.value = saved.answer;
        
        inp.oninput = (e) => saveAns(q.id, e.target.value);
        opts.appendChild(inp);
    } else {
        q.options.forEach(opt => {
            const row = document.createElement('div');
            row.className = 'option-row';
            
            // Radio button
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'opt';
            if(saved && saved.answer === opt) radio.checked = true;
            
            // Label
            const lbl = document.createElement('label');
            lbl.innerText = opt;
            
            // Click Event
            row.onclick = () => { 
                radio.checked = true;
                saveAns(q.id, opt); 
            };
            
            row.appendChild(radio);
            row.appendChild(lbl);
            opts.appendChild(row);
        });
    }
    
    updatePaletteVisuals();
    
    // Mark as visited (Purple if empty, Green/Red if answered later)
    if (!userAnswers[q.id]) {
        // Just visited, not answered yet
        // We don't save 'not-answered' to DB yet, just local state for palette color
    }
}

// --- ANSWER SAVING ---
function saveAns(qId, val) {
    if(val && val.trim() !== "") {
        userAnswers[qId] = { answer: val, status: 'answered' };
    } else {
        delete userAnswers[qId]; // Remove if cleared
    }
    updatePaletteVisuals(); // Instant Green update
}

// --- NAVIGATION ---
function saveAndNext() {
    // Logic handles in saveAns, just move
    if (currentQIdx < sectionQuestions.length - 1) {
        loadQuestionUI(currentQIdx + 1);
    }
}

function markForReview() {
    const q = sectionQuestions[currentQIdx];
    const existing = userAnswers[q.id];
    
    if(existing && existing.answer) {
        userAnswers[q.id].status = 'ans-marked';
    } else {
        userAnswers[q.id] = { answer: null, status: 'marked' };
    }
    updatePaletteVisuals();
    saveAndNext();
}

function clearResponse() {
    const q = sectionQuestions[currentQIdx];
    delete userAnswers[q.id];
    loadQuestionUI(currentQIdx); // Refresh UI
}

// --- PALETTE ---
function renderPalette() {
    const p = document.getElementById('question-palette');
    p.innerHTML = '';
    sectionQuestions.forEach((q, i) => {
        const btn = document.createElement('button');
        btn.innerText = i + 1;
        btn.id = `p-btn-${q.id}`;
        btn.className = 'p-btn not-visited'; // Default
        btn.onclick = () => loadQuestionUI(i);
        p.appendChild(btn);
    });
    updatePaletteVisuals();
}

function updatePaletteVisuals() {
    // Update Counts
    let counts = { answered:0, notAnswered:0, marked:0, ansMarked:0, notVisited:0 };

    sectionQuestions.forEach((q, i) => {
        const btn = document.getElementById(`p-btn-${q.id}`);
        const data = userAnswers[q.id];
        
        if (!btn) return;

        // Reset
        btn.className = 'p-btn';
        
        // Active Question Border
        if (i === currentQIdx) btn.style.border = "2px solid #000";
        else btn.style.border = "1px solid #ccc";

        // Status Colors
        if (!data) {
            btn.classList.add('not-answered'); // Default Red for unseen/unanswered in TCS
            counts.notAnswered++;
        } else if (data.status === 'answered') {
            btn.classList.add('answered'); // Green
            counts.answered++;
        } else if (data.status === 'marked') {
            btn.classList.add('marked'); // Purple
            counts.marked++;
        } else if (data.status === 'ans-marked') {
            btn.classList.add('ans-marked'); // Purple + Green Dot
            counts.ansMarked++;
        }
    });

    // Update Legend Counts (Optional if elements exist)
    try {
        document.querySelector('.circle.answered').innerText = counts.answered;
        // ... update others ...
    } catch(e) {}
}

// --- TIMER ---
function startTimer() {
    if(timerInterval) clearInterval(timerInterval); // Prevent duplicates
    
    const display = document.getElementById('timer');
    
    timerInterval = setInterval(() => {
        sectionTimer--;
        
        if (sectionTimer < 0) {
            // Time Up Logic
            if (currentConfig.switching) {
                // Global End
                clearInterval(timerInterval);
                submitExam(true);
            } else {
                // Section End
                alert(`Time Up for ${currentConfig.sections[activeSectionIndex]}!`);
                if (activeSectionIndex < currentConfig.sections.length - 1) {
                    activeSectionIndex++;
                    sectionTimer = currentConfig.limits[activeSectionIndex] * 60;
                    loadSection(activeSectionIndex);
                } else {
                    clearInterval(timerInterval);
                    submitExam(true);
                }
            }
            return;
        }

        const h = Math.floor(sectionTimer / 3600);
        const m = Math.floor((sectionTimer % 3600) / 60);
        const s = sectionTimer % 60;
        display.textContent = `${h}:${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;

    }, 1000);
}

// --- SUBMIT ---
function submitExam(auto = false) {
    if (!auto && !confirm("Are you sure you want to Submit?")) return;
    
    // Calculate Score locally for immediate feedback (optional)
    let score = 0, correct = 0, wrong = 0;
    
    allQuestions.forEach(q => {
        const u = userAnswers[q.id];
        if(u && (u.status === 'answered' || u.status === 'ans-marked')) {
            if(u.answer === q.correct) { score += 4; correct++; }
            else if(q.type !== 'SA') { score -= 1; wrong++; } // No neg for SA
        }
    });

    db.collection("testResults").add({
        mockId: activeMockId,
        studentName: auth.currentUser.email,
        score: score, correct: correct, wrong: wrong,
        totalMarks: allQuestions.length * 4,
        timestamp: new Date(),
        answers: userAnswers
    }).then(() => {
        window.location.href = "solutions.html";
    });
}