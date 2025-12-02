// ... (Firebase Config stays the same) ...
const firebaseConfig = { apiKey: "AIzaSyBTbfSlz0xvfBzAWmJzXDGbIC6Up0-6eU4", authDomain: "aptitudelabs-in.firebaseapp.com", projectId: "aptitudelabs-in", storageBucket: "aptitudelabs-in.firebasestorage.app", messagingSenderId: "175469863880", appId: "1:175469863880:web:b7b25ed27120665af716fd" };
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// --- EXAM PATTERNS (Must match Instructions.html) ---
const PATTERNS = {
    "INDORE": { 
        sections: ["QA-SA", "QA-MCQ", "VA"], 
        limits: [40, 40, 40], // Minutes per section
        switching: false 
    },
    "ROHTAK": { 
        sections: ["QA", "LR", "VA"], 
        limits: [120], // One global limit
        switching: true 
    },
    "JIPMAT": { 
        sections: ["QA", "DILR", "VA"], 
        limits: [150], 
        switching: true 
    }
};

// --- STATE ---
let currentConfig = PATTERNS["INDORE"]; // Default
let activeSectionIndex = 0;
let sectionTimer = 0;
let globalTimer = 0;
let timerInterval;
let allQuestions = []; // Raw data from DB
let sectionQuestions = []; // Filtered for current section
let userAnswers = {};

// --- INIT ---
window.onload = function() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            document.getElementById('student-name').innerText = user.email.split('@')[0];
            setupExamPattern();
        } else {
            window.location.href = "login.html";
        }
    });
};

function setupExamPattern() {
    const mockId = localStorage.getItem("activeMockId") || "INDORE-MOCK-01";
    
    // 1. Detect Pattern
    if (mockId.includes("ROHTAK")) currentConfig = PATTERNS["ROHTAK"];
    else if (mockId.includes("JIPMAT")) currentConfig = PATTERNS["JIPMAT"];
    else currentConfig = PATTERNS["INDORE"];

    // 2. Setup Timers
    if (currentConfig.switching) {
        // Global Timer logic
        sectionTimer = currentConfig.limits[0] * 60; 
    } else {
        // Sectional Timer logic (Start with Section 1)
        sectionTimer = currentConfig.limits[0] * 60;
    }

    // 3. Render Tabs
    renderTabs();
    fetchQuestions(mockId);
}

function renderTabs() {
    const tabContainer = document.querySelector('.sections-tab');
    tabContainer.innerHTML = '';
    
    currentConfig.sections.forEach((secName, index) => {
        const btn = document.createElement('button');
        btn.innerText = secName;
        btn.className = (index === 0) ? 'active-sec' : '';
        
        // Disable clicking if switching is NOT allowed
        if (!currentConfig.switching) {
            btn.disabled = true; 
            btn.style.cursor = "not-allowed";
            if (index === activeSectionIndex) {
                btn.disabled = false;
                btn.style.color = "#3D85C6"; // Active Blue
            } else {
                btn.style.color = "#aaa"; // Greyed out
            }
        } else {
            // Flexible switching allowed
            btn.onclick = () => switchSection(index);
        }
        tabContainer.appendChild(btn);
    });
}

async function fetchQuestions(mockId) {
    console.log("Fetching for:", mockId);
    try {
        // Fetch ALL questions for this mock
        const snapshot = await db.collection('questions').where('mockId', '==', mockId).get();
        if (snapshot.empty) { alert("No questions found."); return; }

        allQuestions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Load first section
        loadSection(0);
        startTimer();

    } catch (error) { console.error(error); alert("Load Error"); }
}

function loadSection(index) {
    activeSectionIndex = index;
    
    // Filter questions based on Section Name (Admin must upload with correct section tags!)
    // Mapping Logic:
    const secTag = currentConfig.sections[index]; // e.g., "QA-SA"
    
    // Flexible matching: If admin saved as "QA" but config says "QA (MCQ)", we rely on Admin input matching Config loosely or exactly.
    // For MVP: We assume Admin uploaded Section field matches PATTERN name exactly.
    // Or we just grab everything for ROHTAK since it's mixed? No, usually sectional.
    
    // SIMPLE FILTER:
    sectionQuestions = allQuestions.filter(q => q.section === secTag || q.section.includes(secTag.split(' ')[0]));
    
    if (sectionQuestions.length === 0) {
        // Fallback for demo if no specific section tags found
        console.warn("No questions match section tag: " + secTag);
        // Show all if it's a flexible test, or show placeholder
    }

    renderTabs(); // Re-render to highlight active
    renderPalette();
    loadQuestionUI(0);
}

function switchSection(index) {
    if (currentConfig.switching) {
        loadSection(index);
    }
}

// --- TIMER LOGIC (THE HEARTBEAT) ---
function startTimer() {
    const display = document.getElementById('timer');
    timerInterval = setInterval(() => {
        sectionTimer--;

        // Format Time
        const h = Math.floor(sectionTimer / 3600);
        const m = Math.floor((sectionTimer % 3600) / 60);
        const s = sectionTimer % 60;
        display.textContent = `${h}:${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;

        // Time's Up
        if (sectionTimer <= 0) {
            if (currentConfig.switching) {
                // Global time up -> Submit Test
                clearInterval(timerInterval);
                submitExam(true);
            } else {
                // Sectional time up -> Move to next section
                handleSectionTimeout();
            }
        }
    }, 1000);
}

function handleSectionTimeout() {
    alert(`Time Up for ${currentConfig.sections[activeSectionIndex]}! Moving to next section.`);
    
    if (activeSectionIndex < currentConfig.sections.length - 1) {
        // Move to next section
        activeSectionIndex++;
        sectionTimer = currentConfig.limits[activeSectionIndex] * 60; // Reset timer for new section
        loadSection(activeSectionIndex);
    } else {
        // All sections done
        clearInterval(timerInterval);
        submitExam(true);
    }
}

// --- STANDARD RENDER & SAVE (Simplified from before) ---
let currentQIdx = 0;

function loadQuestionUI(idx) {
    currentQIdx = idx;
    if(!sectionQuestions[idx]) return;
    const q = sectionQuestions[idx];
    
    // ... (Use your existing rendering logic here for split screen, TITA, etc.) ...
    // Keeping it brief for the logic focus:
    document.getElementById('question-text').innerText = q.text;
    document.getElementById('q-number-display').innerText = idx + 1;
    document.getElementById('q-type-label').innerText = q.type;
    
    // Render Options...
    const opts = document.getElementById('options-container');
    opts.innerHTML = '';
    if(q.type === 'SA') {
        const inp = document.createElement('input');
        inp.className = 'sa-input';
        inp.onchange = (e) => saveAns(q.id, e.target.value);
        opts.appendChild(inp);
    } else {
        q.options.forEach(opt => {
            const d = document.createElement('div');
            d.className = 'option-row';
            d.innerText = opt;
            d.onclick = () => saveAns(q.id, opt);
            opts.appendChild(d);
        });
    }
}

function saveAns(qId, val) {
    userAnswers[qId] = { answer: val, status: 'answered' };
    updatePaletteVisuals();
}

function renderPalette() {
    const p = document.getElementById('question-palette');
    p.innerHTML = '';
    sectionQuestions.forEach((q, i) => {
        const b = document.createElement('button');
        b.className = 'p-btn not-visited';
        b.innerText = i + 1;
        b.onclick = () => loadQuestionUI(i);
        p.appendChild(b);
    });
}

function updatePaletteVisuals() { /* ... Same as previous ... */ }

function saveAndNext() {
    if (currentQIdx < sectionQuestions.length - 1) loadQuestionUI(currentQIdx + 1);
}

function submitExam(auto) {
    // ... Same submission logic ...
    // Redirect to solutions
    window.location.href = "solutions.html";
}