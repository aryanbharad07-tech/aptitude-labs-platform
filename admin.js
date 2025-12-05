/**
 * Aptitude Labs Admin Console v4.2 (With In-Page Login)
 * Logic Controller
 */

// --- CONFIGURATION ---
const ADMIN_EMAIL = "aptitudelabshost@gmail.com"; 

// --- FIREBASE REFERENCES ---
const db = firebase.firestore();
const auth = firebase.auth();

// --- EXAM PATTERNS ---
const EXAM_RULES = {
    "TEST": [
        {name:"QA (Short Answer)", type:"SA", start:1, end:4}, 
        {name:"QA (MCQ)", type:"MCQ", start:5, end:8}, 
        {name:"Verbal Ability", type:"MCQ", start:9, end:12}
    ],
    "SAMPLE": [
        {name:"QA (Short Answer)", type:"SA", start:1, end:2}, 
        {name:"QA (MCQ)", type:"MCQ", start:3, end:4}, 
        {name:"Verbal Ability", type:"MCQ", start:5, end:6}
    ],
    "INDORE": [
        {name:"QA (Short Answer)", type:"SA", start:1, end:15}, 
        {name:"QA (MCQ)", type:"MCQ", start:16, end:45}, 
        {name:"Verbal Ability", type:"MCQ", start:46, end:90}
    ],
    "ROHTAK": [
        {name:"Quantitative Ability", type:"MCQ", start:1, end:40}, 
        {name:"Logical Reasoning", type:"MCQ", start:41, end:80}, 
        {name:"Verbal Ability", type:"MCQ", start:81, end:120}
    ],
    "JIPMAT": [
        {name:"Quantitative Aptitude", type:"MCQ", start:1, end:33}, 
        {name:"DILR", type:"MCQ", start:34, end:66}, 
        {name:"Verbal Ability", type:"MCQ", start:67, end:100}
    ]
};

// State
let currentQuestions = {}; 
let isCurrentMockLive = false;

// --- DOM ELEMENTS (Cache) ---
const els = {
    email: document.getElementById('admin-email'),
    logout: document.getElementById('logout-btn'),
    examCat: document.getElementById('exam-cat'),
    mockNum: document.getElementById('mock-num'),
    activeId: document.getElementById('active-mock-id'),
    refreshBtn: document.getElementById('refresh-grid-btn'),
    statusBtn: document.getElementById('toggle-status-btn'),
    qGrid: document.getElementById('q-grid'),
    qCount: document.getElementById('q-count'),
    // Editor
    form: document.getElementById('editor-form'),
    docId: document.getElementById('doc-id'),
    qNum: document.getElementById('q-number'),
    section: document.getElementById('section'),
    type: document.getElementById('q-type'),
    currentSecName: document.getElementById('current-sec-name'),
    currentSecRange: document.getElementById('current-sec-range'),
    qText: document.getElementById('q-text'),
    passageBox: document.getElementById('passage-box'),
    passageText: document.getElementById('passage-text'),
    optionsBox: document.getElementById('options-box'),
    saBox: document.getElementById('sa-box'),
    saVal: document.getElementById('sa-val'),
    solution: document.getElementById('solution-text'),
    saveBtn: document.getElementById('save-btn'),
    clearBtn: document.getElementById('clear-btn'),
    // Banner
    banTitle: document.getElementById('ban-title'),
    banImg: document.getElementById('ban-img'),
    addBanBtn: document.getElementById('add-banner-btn'),
    banList: document.getElementById('banner-list'),
    // Login Overlay Elements
    loginOverlay: document.getElementById('admin-login-overlay'),
    admEmail: document.getElementById('adm-email'),
    admPass: document.getElementById('adm-pass'),
    admLoginBtn: document.getElementById('adm-login-btn'),
    loginError: document.getElementById('login-error')
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    attachListeners();
});

function initAuth() {
    auth.onAuthStateChanged(user => {
        if(user && user.email === ADMIN_EMAIL) {
            // Success: Admin Logged In
            els.email.innerText = user.email;
            els.loginOverlay.classList.add('hidden'); // Hide overlay
            initDashboard();
        } else { 
            // Failure: Show Overlay (Do not redirect)
            els.loginOverlay.classList.remove('hidden');
            if(user) {
                // Logged in but wrong email
                els.loginError.innerText = "Access Denied: Not an Admin Account";
                auth.signOut();
            }
        }
    });
}

function initDashboard() {
    updateMockConfig(); 
    loadBanners(); 
}

function attachListeners() {
    // Auth
    els.logout.addEventListener('click', () => {
        auth.signOut();
        window.location.reload();
    });
    
    // Login Overlay Action
    els.admLoginBtn.addEventListener('click', handleAdminLogin);

    // Config Changes
    els.examCat.addEventListener('change', updateMockConfig);
    els.mockNum.addEventListener('input', updateMockConfig);
    els.refreshBtn.addEventListener('click', loadQuestionsList);
    els.statusBtn.addEventListener('click', toggleLiveStatus);

    // Editor Logic
    els.qNum.addEventListener('input', () => checkPatternRules()); 
    els.type.addEventListener('change', toggleFields);
    els.clearBtn.addEventListener('click', prepareNewEntry);
    els.form.addEventListener('submit', handleSaveQuestion);

    // Banner Logic
    els.addBanBtn.addEventListener('click', addBanner);
}

// --- LOGIN LOGIC ---
async function handleAdminLogin() {
    const email = els.admEmail.value;
    const pass = els.admPass.value;
    
    if(!email || !pass) {
        els.loginError.innerText = "Please fill all fields";
        return;
    }

    els.admLoginBtn.innerText = "Verifying...";
    els.loginError.innerText = "";
    
    try {
        await auth.signInWithEmailAndPassword(email, pass);
        // Note: initAuth will trigger automatically on state change to hide the modal
    } catch(e) {
        console.error(e);
        els.loginError.innerText = "Invalid Email or Password";
        els.admLoginBtn.innerText = "Login to Console";
    }
}

// --- CORE LOGIC ---

function updateMockConfig() {
    const cat = els.examCat.value;
    const num = els.mockNum.value.padStart(2, '0');
    els.activeId.innerText = `${cat}-MOCK-${num}`;
    
    checkLiveStatus();
    loadQuestionsList();
}

async function checkLiveStatus() {
    const mockId = els.activeId.innerText;
    try {
        const doc = await db.collection('exam_status').doc(mockId).get();
        if(doc.exists && doc.data().active) {
            isCurrentMockLive = true;
            els.statusBtn.innerText = "🟢 LIVE (Click to Lock)";
            els.statusBtn.className = "btn-status live";
        } else {
            isCurrentMockLive = false;
            els.statusBtn.innerText = "🔴 LOCKED (Click to Go Live)";
            els.statusBtn.className = "btn-status locked";
        }
    } catch(e) { console.error(e); }
}

async function toggleLiveStatus() {
    const mockId = els.activeId.innerText;
    els.statusBtn.disabled = true;
    try {
        await db.collection('exam_status').doc(mockId).set({ active: !isCurrentMockLive }, { merge: true });
        showToast(`Exam is now ${!isCurrentMockLive ? 'LIVE' : 'LOCKED'}`, !isCurrentMockLive ? 'success' : 'error');
        checkLiveStatus();
    } catch(err) {
        showToast("Error updating status", "error");
    } finally {
        els.statusBtn.disabled = false;
    }
}

// --- QUESTION GRID & EDITOR ---

async function loadQuestionsList() {
    const mockId = els.activeId.innerText;
    const cat = els.examCat.value;
    
    if (!EXAM_RULES[cat]) return showToast("Exam Pattern Config Missing", "error");

    const totalQ = EXAM_RULES[cat][EXAM_RULES[cat].length-1].end;
    
    els.qGrid.innerHTML = '<div style="grid-column:span 5; text-align:center;">Loading...</div>';
    currentQuestions = {};

    try {
        const snapshot = await db.collection('questions').where('mockId', '==', mockId).get();
        
        els.qGrid.innerHTML = '';
        els.qCount.innerText = `${snapshot.size}/${totalQ}`;

        snapshot.forEach(doc => {
            const data = doc.data();
            if(data.qNumber) currentQuestions[data.qNumber] = { id: doc.id, ...data };
        });

        for(let i=1; i<=totalQ; i++) {
            const btn = document.createElement('div');
            btn.className = 'q-btn';
            btn.innerText = i;
            
            if(currentQuestions[i]) btn.classList.add('exists');
            
            btn.addEventListener('click', () => loadQuestionForEdit(i));
            els.qGrid.appendChild(btn);
        }

    } catch(err) {
        console.error(err);
        showToast("Failed to load questions", "error");
    }
}

function checkPatternRules(forceNum) {
    const cat = els.examCat.value;
    const rules = EXAM_RULES[cat];
    let qNum = forceNum || parseInt(els.qNum.value) || 1;
    
    const activeRule = rules.find(r => qNum >= r.start && qNum <= r.end);

    if (activeRule) {
        els.section.value = activeRule.name;
        els.type.value = activeRule.type;
        els.currentSecName.innerText = `Edit Q${qNum}: ${activeRule.name}`;
        els.currentSecRange.innerText = `Section Range: Q${activeRule.start} - Q${activeRule.end}`;
    } else {
        els.section.value = "Out of Range";
        els.currentSecName.innerText = "Question Out of Range";
    }
    toggleFields();
}

function toggleFields() {
    const type = els.type.value;
    els.passageBox.style.display = type === 'RC' ? 'block' : 'none';
    els.optionsBox.style.display = type === 'SA' ? 'none' : 'block';
    els.saBox.style.display = type === 'SA' ? 'block' : 'none';
}

function loadQuestionForEdit(qNum) {
    prepareNewEntry();
    els.qNum.value = qNum;
    checkPatternRules(qNum); 
    
    const data = currentQuestions[qNum];
    if (data) {
        els.docId.value = data.id;
        els.qText.value = data.text || "";
        els.solution.value = data.solution || "";
        
        if(data.type === 'RC') els.passageText.value = data.passage || "";
        
        if(data.type === 'SA') {
            els.saVal.value = data.correct || "";
        } else {
            ['a','b','c','d'].forEach((opt, i) => {
                document.getElementById(`opt-${opt}`).value = data.options[i] || "";
            });
            const idx = data.options.indexOf(data.correct);
            if(idx > -1) {
                const radios = document.getElementsByName("correct");
                if(radios[idx]) radios[idx].checked = true;
            }
        }
        els.saveBtn.innerText = "Update Question";
        els.currentSecName.innerText += " (Editing)";
    }
}

function prepareNewEntry() {
    els.form.reset();
    els.docId.value = "";
    els.saveBtn.innerText = "Save Question";
    const currentQ = parseInt(els.qNum.value);
    if(currentQ) checkPatternRules(currentQ);
}

async function handleSaveQuestion(e) {
    e.preventDefault();
    els.saveBtn.disabled = true;
    els.saveBtn.innerText = "Saving...";
    
    try {
        const mockId = els.activeId.innerText;
        const qNum = parseInt(els.qNum.value);
        const type = els.type.value;
        
        let data = {
            mockId, qNumber: qNum, type,
            section: els.section.value,
            text: els.qText.value,
            solution: els.solution.value,
            timestamp: new Date()
        };

        if(type === 'SA') {
            const val = els.saVal.value;
            if(!val) throw new Error("Please enter a numeric answer");
            data.correct = val;
            data.options = [];
        } else {
            data.options = ['a','b','c','d'].map(o => document.getElementById(`opt-${o}`).value);
            if(data.options.some(o => o.trim() === "")) throw new Error("All options A-D must be filled");
            
            const selected = document.querySelector('input[name="correct"]:checked');
            if(!selected) throw new Error("Please select the correct option radio button");
            
            data.correct = data.options[{'A':0,'B':1,'C':2,'D':3}[selected.value]];
            if(type === 'RC') data.passage = els.passageText.value;
        }

        const docId = els.docId.value;
        if(docId) await db.collection('questions').doc(docId).update(data);
        else await db.collection('questions').add(data); 

        showToast(`Question ${qNum} Saved Successfully!`, "success");
        loadQuestionsList(); 
        
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        els.saveBtn.disabled = false;
        els.saveBtn.innerText = els.docId.value ? "Update Question" : "Save Question";
    }
}

// --- BANNER LOGIC ---

async function addBanner() {
    const title = els.banTitle.value;
    const img = els.banImg.value;
    
    if(!title || !img) return showToast("Title and Image URL required", "error");
    
    try {
        await db.collection('banners').add({
            title, subtitle: "", image: img, timestamp: new Date()
        });
        els.banTitle.value = "";
        els.banImg.value = "";
        loadBanners();
        showToast("Banner Added", "success");
    } catch(e) { showToast(e.message, "error"); }
}

async function loadBanners() {
    els.banList.innerHTML = "Loading...";
    const snap = await db.collection('banners').orderBy('timestamp', 'desc').get();
    els.banList.innerHTML = "";
    
    snap.forEach(doc => {
        const b = doc.data();
        const div = document.createElement('div');
        div.className = 'banner-item';
        div.innerHTML = `
            <img src="${b.image}" onerror="this.src='https://via.placeholder.com/40'">
            <div style="flex:1; font-size:0.8rem; font-weight:600;">${b.title}</div>
            <button class="banner-del" onclick="deleteBanner('${doc.id}')">×</button>
        `;
        els.banList.appendChild(div);
    });
}

window.deleteBanner = async (id) => {
    if(confirm("Delete this banner?")) {
        await db.collection('banners').doc(id).delete();
        loadBanners();
        showToast("Banner Deleted", "success");
    }
};

function showToast(msg, type) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}