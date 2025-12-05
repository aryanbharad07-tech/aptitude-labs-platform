/**
 * Aptitude Labs Admin v5.0 (Redesign)
 */

// --- CONFIG ---
const ADMIN_EMAIL = "aptitudelabshost@gmail.com"; 

// --- FIREBASE ---
if (typeof firebase === 'undefined') alert("Firebase SDK Missing!");
const db = firebase.firestore();
const auth = firebase.auth();

// --- RULES (Must match script.js) ---
const EXAM_RULES = {
    "TEST": [{name:"QA (Short Answer)", type:"SA", start:1, end:4}, {name:"QA (MCQ)", type:"MCQ", start:5, end:8}, {name:"Verbal Ability", type:"MCQ", start:9, end:12}],
    "SAMPLE": [{name:"QA (Short Answer)", type:"SA", start:1, end:2}, {name:"QA (MCQ)", type:"MCQ", start:3, end:4}, {name:"Verbal Ability", type:"MCQ", start:5, end:6}],
    "INDORE": [{name:"QA (Short Answer)", type:"SA", start:1, end:15}, {name:"QA (MCQ)", type:"MCQ", start:16, end:45}, {name:"Verbal Ability", type:"MCQ", start:46, end:90}],
    "ROHTAK": [{name:"Quantitative Ability", type:"MCQ", start:1, end:40}, {name:"Logical Reasoning", type:"MCQ", start:41, end:80}, {name:"Verbal Ability", type:"MCQ", start:81, end:120}],
    "JIPMAT": [{name:"Quantitative Aptitude", type:"MCQ", start:1, end:33}, {name:"DILR", type:"MCQ", start:34, end:66}, {name:"Verbal Ability", type:"MCQ", start:67, end:100}]
};

// --- DOM CACHE ---
const els = {
    loginOverlay: document.getElementById('admin-login-overlay'),
    admEmail: document.getElementById('adm-email'),
    admPass: document.getElementById('adm-pass'),
    admLoginBtn: document.getElementById('adm-login-btn'),
    loginError: document.getElementById('login-error'),
    userDisplay: document.getElementById('admin-email'),
    logoutBtn: document.getElementById('logout-btn'),
    
    // Config
    examCat: document.getElementById('exam-cat'),
    mockNum: document.getElementById('mock-num'),
    refreshBtn: document.getElementById('refresh-grid-btn'),
    activeId: document.getElementById('active-mock-id'),
    statusBtn: document.getElementById('toggle-status-btn'),
    
    // Grid
    qGrid: document.getElementById('q-grid'),
    qCount: document.getElementById('q-count'),
    
    // Form
    form: document.getElementById('editor-form'),
    docId: document.getElementById('doc-id'),
    clearBtn: document.getElementById('clear-btn'),
    saveBtn: document.getElementById('save-btn'),
    
    // Inputs
    qNum: document.getElementById('q-number'),
    section: document.getElementById('section'),
    type: document.getElementById('q-type'),
    qText: document.getElementById('q-text'),
    solution: document.getElementById('solution-text'),
    
    // Conditional Areas
    passageBox: document.getElementById('passage-box'),
    passageText: document.getElementById('passage-text'),
    optionsBox: document.getElementById('options-box'),
    saBox: document.getElementById('sa-box'),
    saVal: document.getElementById('sa-val'),
    
    // Labels
    labelName: document.getElementById('current-sec-name'),
    labelRange: document.getElementById('current-sec-range'),

    // Banners
    banTitle: document.getElementById('ban-title'),
    banImg: document.getElementById('ban-img'),
    addBanBtn: document.getElementById('add-banner-btn'),
    banList: document.getElementById('banner-list')
};

let currentQuestions = {}; 
let isLive = false;

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if(user && user.email === ADMIN_EMAIL) {
            els.loginOverlay.style.display = 'none';
            els.userDisplay.innerText = user.email;
            initApp();
        } else {
            els.loginOverlay.style.display = 'flex';
            if(user) auth.signOut(); 
        }
    });
    
    attachEvents();
});

function attachEvents() {
    els.admLoginBtn.addEventListener('click', login);
    els.logoutBtn.addEventListener('click', () => auth.signOut());
    
    els.examCat.addEventListener('change', updateConfig);
    els.mockNum.addEventListener('input', updateConfig);
    els.refreshBtn.addEventListener('click', loadGrid);
    els.statusBtn.addEventListener('click', toggleStatus);
    
    els.qNum.addEventListener('input', () => updateRules());
    els.type.addEventListener('change', updateUIState);
    
    els.clearBtn.addEventListener('click', resetForm);
    els.form.addEventListener('submit', saveQuestion);

    els.addBanBtn.addEventListener('click', addBanner);
}

// --- AUTH ---
async function login() {
    const e = els.admEmail.value, p = els.admPass.value;
    if(!e || !p) return els.loginError.innerText = "Fill all fields";
    
    els.admLoginBtn.innerText = "Checking...";
    try {
        await auth.signInWithEmailAndPassword(e, p);
    } catch(err) {
        if(err.code === 'auth/user-not-found') {
             els.loginError.innerHTML = "User not found. <u style='cursor:pointer' onclick='createAdmin()'>Create Account</u>";
        } else {
             els.loginError.innerText = "Invalid credentials";
        }
        els.admLoginBtn.innerText = "Login";
    }
}

window.createAdmin = async () => {
    try { 
        await auth.createUserWithEmailAndPassword(els.admEmail.value, els.admPass.value);
        alert("Account created!");
    } catch(e) { alert(e.message); }
};

// --- APP LOGIC ---
function initApp() {
    updateConfig();
    loadBanners();
}

function updateConfig() {
    const cat = els.examCat.value;
    const num = els.mockNum.value.padStart(2, '0');
    els.activeId.innerText = `${cat}-MOCK-${num}`;
    loadGrid();
    checkStatus();
}

async function checkStatus() {
    const id = els.activeId.innerText;
    const doc = await db.collection('exam_status').doc(id).get();
    isLive = doc.exists && doc.data().active;
    updateStatusBtn();
}

async function toggleStatus() {
    els.statusBtn.disabled = true;
    const id = els.activeId.innerText;
    isLive = !isLive;
    await db.collection('exam_status').doc(id).set({ active: isLive }, { merge: true });
    updateStatusBtn();
    els.statusBtn.disabled = false;
}

function updateStatusBtn() {
    els.statusBtn.className = isLive ? 'btn-status live' : 'btn-status locked';
    els.statusBtn.innerText = isLive ? 'LIVE' : 'LOCKED';
}

// --- GRID ---
async function loadGrid() {
    const id = els.activeId.innerText;
    const cat = els.examCat.value;
    const total = EXAM_RULES[cat][EXAM_RULES[cat].length-1].end;
    
    els.qGrid.innerHTML = 'Loading...';
    currentQuestions = {};
    
    const snap = await db.collection('questions').where('mockId', '==', id).get();
    snap.forEach(doc => {
        const d = doc.data();
        if(d.qNumber) currentQuestions[d.qNumber] = { id: doc.id, ...d };
    });
    
    els.qCount.innerText = `${snap.size}/${total}`;
    els.qGrid.innerHTML = '';
    
    for(let i=1; i<=total; i++) {
        const div = document.createElement('div');
        div.className = currentQuestions[i] ? 'grid-item filled' : 'grid-item';
        div.innerText = i;
        div.onclick = () => loadQuestion(i);
        els.qGrid.appendChild(div);
    }
}

// --- EDITOR ---
function updateRules(forceNum) {
    const cat = els.examCat.value;
    const q = forceNum || parseInt(els.qNum.value) || 1;
    const rule = EXAM_RULES[cat].find(r => q >= r.start && q <= r.end);
    
    if(rule) {
        els.section.value = rule.name;
        els.type.value = rule.type; // Auto-select type
        els.labelName.innerText = `Edit Q${q}: ${rule.name}`;
        els.labelRange.innerText = `Section Range: ${rule.start}-${rule.end}`;
    } else {
        els.section.value = "Invalid";
        els.labelName.innerText = "Invalid Number";
    }
    updateUIState();
}

function updateUIState() {
    const type = els.type.value;
    // Toggle Visibility
    if(type === 'RC') els.passageBox.classList.remove('hidden');
    else els.passageBox.classList.add('hidden');
    
    if(type === 'SA') {
        els.optionsBox.classList.add('hidden');
        els.saBox.classList.remove('hidden');
    } else {
        els.optionsBox.classList.remove('hidden');
        els.saBox.classList.add('hidden');
    }
}

function resetForm() {
    els.form.reset();
    els.docId.value = '';
    els.saveBtn.innerText = 'Save Question';
    updateRules();
}

function loadQuestion(num) {
    resetForm();
    els.qNum.value = num;
    updateRules(num);
    
    const d = currentQuestions[num];
    if(!d) return;
    
    els.docId.value = d.id;
    els.qText.value = d.text || '';
    els.solution.value = d.solution || '';
    
    if(d.type === 'RC') els.passageText.value = d.passage || '';
    
    if(d.type === 'SA') {
        els.saVal.value = d.correct || '';
    } else {
        ['a','b','c','d'].forEach((o, i) => document.getElementById(`opt-${o}`).value = d.options[i] || '');
        const idx = d.options.indexOf(d.correct);
        if(idx > -1) document.getElementsByName('correct')[idx].checked = true;
    }
    els.saveBtn.innerText = 'Update Question';
}

async function saveQuestion(e) {
    e.preventDefault();
    els.saveBtn.disabled = true;
    els.saveBtn.innerText = "Saving...";
    
    try {
        const type = els.type.value;
        const payload = {
            mockId: els.activeId.innerText,
            qNumber: parseInt(els.qNum.value),
            type: type,
            section: els.section.value,
            text: els.qText.value,
            solution: els.solution.value,
            timestamp: new Date()
        };
        
        if(type === 'SA') {
            const val = els.saVal.value;
            if(!val) throw new Error("Numeric answer required");
            payload.correct = val;
            payload.options = [];
        } else {
            payload.options = ['a','b','c','d'].map(o => document.getElementById(`opt-${o}`).value);
            if(payload.options.some(x => !x)) throw new Error("All options required");
            
            const sel = document.querySelector('input[name="correct"]:checked');
            if(!sel) throw new Error("Select correct option");
            payload.correct = payload.options[{'A':0,'B':1,'C':2,'D':3}[sel.value]];
            if(type === 'RC') payload.passage = els.passageText.value;
        }
        
        const id = els.docId.value;
        if(id) await db.collection('questions').doc(id).update(payload);
        else await db.collection('questions').add(payload);
        
        showToast("Saved!", "success");
        loadGrid();
        
    } catch(err) {
        showToast(err.message, "error");
    }
    els.saveBtn.disabled = false;
    els.saveBtn.innerText = els.docId.value ? "Update Question" : "Save Question";
}

// --- UTILS ---
async function addBanner() {
    const t = els.banTitle.value, i = els.banImg.value;
    if(!t || !i) return;
    await db.collection('banners').add({title:t, image:i, timestamp:new Date()});
    loadBanners();
}
async function loadBanners() {
    const s = await db.collection('banners').orderBy('timestamp','desc').get();
    els.banList.innerHTML = '';
    s.forEach(d => {
        const div = document.createElement('div');
        div.innerHTML = `<small>${d.data().title} <span onclick="delBan('${d.id}')" style="cursor:pointer;color:red;">(x)</span></small>`;
        els.banList.appendChild(div);
    });
}
window.delBan = async (id) => { await db.collection('banners').doc(id).delete(); loadBanners(); };

function showToast(msg, type) {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerText = msg;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => t.remove(), 3000);
}